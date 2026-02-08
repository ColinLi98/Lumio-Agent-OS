import type { AgentDomain, MarketVisibility, PricingModel } from './agentMarketplaceTypes';
import {
  marketAnalyticsStore,
  type MarketAgentProfile,
  type MarketUsageEvent,
  type UsageWindowAggregate,
} from './marketAnalyticsStore';

export type LeaderboardWindow = '7d' | '30d';
export type TrendWindow = '7d' | '30d' | '90d';
export type LeaderboardSort = 'commercial' | 'quality' | 'growth';

export interface AgentTrendPoint {
  date: string;
  usage: number;
  success: number;
  revenue: number;
  hotness: number;
}

export interface LeaderboardEntry {
  rank: number;
  agent_id: string;
  agent_name: string;
  owner_id?: string;
  market_visibility?: MarketVisibility;
  pricing_model?: PricingModel;
  price_per_use_cny?: number;
  hotness_score: number;
  revenue_7d: number;
  success_rate_7d: number;
  usage_7d: number;
  growth_score: number;
  quality_score: number;
  sparkline: number[];
}

const DAY_MS = 24 * 3600 * 1000;
const Z_95 = 1.96;
const MIN_USAGE_FOR_FULL_SCORE = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toWindowDays(window: LeaderboardWindow | TrendWindow): number {
  if (window === '7d') return 7;
  if (window === '30d') return 30;
  return 90;
}

function wilsonLowerBound(success: number, total: number, z = Z_95): number {
  if (!Number.isFinite(success) || !Number.isFinite(total) || total <= 0) return 0;
  const p = success / total;
  const denominator = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return clamp((center - margin) / denominator, 0, 1);
}

function computeFreshness(lastEventTsMs?: number): number {
  if (!Number.isFinite(lastEventTsMs)) return 0;
  const ageDays = Math.max(0, (Date.now() - Number(lastEventTsMs)) / DAY_MS);
  return clamp(Math.exp(-ageDays / 14), 0, 1);
}

function computeUsagePenalty(usageCount: number): number {
  if (!Number.isFinite(usageCount) || usageCount <= 0) return 0;
  return clamp(usageCount / MIN_USAGE_FOR_FULL_SCORE, 0, 1);
}

function computeCommercialScore(
  aggregate: UsageWindowAggregate,
  maxRevenue: number,
  qualityScore: number
): number {
  const revenueNorm = maxRevenue > 0 ? clamp(aggregate.revenue_cny / maxRevenue, 0, 1) : 0;
  const paidConversion = clamp(aggregate.paid_conversion, 0, 1);
  const repeatUse = clamp(aggregate.repeat_use_rate, 0, 1);
  const freshness = computeFreshness(aggregate.last_event_ts_ms);
  const raw =
    0.35 * revenueNorm +
    0.30 * qualityScore +
    0.20 * paidConversion +
    0.10 * repeatUse +
    0.05 * freshness;
  return clamp(raw * computeUsagePenalty(aggregate.usage_count), 0, 1);
}

function aggregateFromEvents(events: MarketUsageEvent[]): UsageWindowAggregate {
  const usage = events.length;
  const success = events.filter((event) => event.success).length;
  const revenue = events.reduce((acc, event) => acc + Math.max(0, Number(event.revenue_delta_cny || 0)), 0);
  const paidUsageCount = events.filter((event) => Number(event.revenue_delta_cny || 0) > 0).length;
  const consumerHits = new Map<string, number>();
  events.forEach((event) => {
    const consumer = String(event.consumer_id || '').trim();
    if (!consumer) return;
    consumerHits.set(consumer, (consumerHits.get(consumer) || 0) + 1);
  });
  const uniqueConsumers = consumerHits.size;
  const repeatCount = Array.from(consumerHits.values()).reduce((acc, hits) => acc + Math.max(0, hits - 1), 0);
  const lastEventTs = usage > 0 ? events[events.length - 1].ts_ms : undefined;

  return {
    usage_count: usage,
    success_count: success,
    revenue_cny: revenue,
    unique_consumers: uniqueConsumers,
    repeat_use_count: repeatCount,
    paid_usage_count: paidUsageCount,
    success_rate: usage > 0 ? success / usage : 0,
    paid_conversion: usage > 0 ? paidUsageCount / usage : 0,
    repeat_use_rate: usage > 0 ? repeatCount / usage : 0,
    last_event_ts_ms: lastEventTs,
  };
}

function computeGrowthScore(current: UsageWindowAggregate, previous: UsageWindowAggregate): number {
  const usageGrowth = (current.usage_count - previous.usage_count) / Math.max(1, previous.usage_count);
  const revenueGrowth = (current.revenue_cny - previous.revenue_cny) / Math.max(1, previous.revenue_cny);
  const blended = 0.6 * usageGrowth + 0.4 * revenueGrowth;
  return clamp(blended, -1, 3);
}

async function computePreviousWindowAggregate(
  agentId: string,
  windowDays: number,
  domain?: AgentDomain
): Promise<UsageWindowAggregate> {
  const twoWindow = await marketAnalyticsStore.listUsageEvents(agentId, windowDays * 2, domain);
  const now = Date.now();
  const currentStart = now - windowDays * DAY_MS;
  const previousStart = now - windowDays * 2 * DAY_MS;
  const previousEvents = twoWindow.filter((event) => event.ts_ms >= previousStart && event.ts_ms < currentStart);
  return aggregateFromEvents(previousEvents);
}

function profileToName(profile: MarketAgentProfile | undefined, agentId: string): string {
  return String(profile?.agent_name || '').trim() || agentId;
}

export async function getAgentTrendPoints(
  agentId: string,
  window: TrendWindow,
  domain?: AgentDomain
): Promise<AgentTrendPoint[]> {
  const days = toWindowDays(window);
  const events = await marketAnalyticsStore.listUsageEvents(agentId, days, domain);
  if (events.length === 0) return [];

  const byDate = new Map<string, MarketUsageEvent[]>();
  events.forEach((event) => {
    const arr = byDate.get(event.date) || [];
    arr.push(event);
    byDate.set(event.date, arr);
  });

  const rows = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dateEvents]) => ({
      date,
      aggregate: aggregateFromEvents(dateEvents.sort((a, b) => a.ts_ms - b.ts_ms)),
    }));

  const maxRevenue = Math.max(0, ...rows.map((row) => row.aggregate.revenue_cny));

  return rows.map((row) => {
    const quality = wilsonLowerBound(row.aggregate.success_count, row.aggregate.usage_count);
    const hotness = computeCommercialScore(row.aggregate, maxRevenue, quality);
    return {
      date: row.date,
      usage: row.aggregate.usage_count,
      success: row.aggregate.success_count,
      revenue: round2(row.aggregate.revenue_cny),
      hotness: round2(hotness),
    };
  });
}

export async function buildLeaderboard(params: {
  window: LeaderboardWindow;
  domain?: AgentDomain;
  sort?: LeaderboardSort;
  limit?: number;
}): Promise<{
  window: LeaderboardWindow;
  sort: LeaderboardSort;
  rankings: LeaderboardEntry[];
  storage_mode: 'durable' | 'degraded';
}> {
  const window = params.window;
  const sort: LeaderboardSort = params.sort || 'commercial';
  const days = toWindowDays(window);
  const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
  const agentIds = await marketAnalyticsStore.listAgentIds();
  const rows = await Promise.all(agentIds.map(async (agentId) => {
    const [profile, aggregate, previous] = await Promise.all([
      marketAnalyticsStore.getAgentProfile(agentId),
      marketAnalyticsStore.getWindowAggregate(agentId, days, params.domain),
      computePreviousWindowAggregate(agentId, days, params.domain),
    ]);
    return { agentId, profile, aggregate, previous };
  }));

  const nonEmpty = rows.filter((row) => row.aggregate.usage_count > 0);
  const maxRevenue = Math.max(0, ...nonEmpty.map((row) => row.aggregate.revenue_cny));

  const enriched = await Promise.all(nonEmpty.map(async (row) => {
    const quality = wilsonLowerBound(row.aggregate.success_count, row.aggregate.usage_count);
    const hotness = computeCommercialScore(row.aggregate, maxRevenue, quality);
    const growth = computeGrowthScore(row.aggregate, row.previous);
    const trends = await getAgentTrendPoints(row.agentId, '7d', params.domain);
    return {
      row,
      quality,
      hotness,
      growth,
      trends,
    };
  }));

  enriched.sort((a, b) => {
    if (sort === 'quality') return b.quality - a.quality;
    if (sort === 'growth') return b.growth - a.growth;
    return b.hotness - a.hotness;
  });

  const rankings: LeaderboardEntry[] = enriched.slice(0, limit).map((item, idx) => ({
    rank: idx + 1,
    agent_id: item.row.agentId,
    agent_name: profileToName(item.row.profile, item.row.agentId),
    owner_id: item.row.profile?.owner_id,
    market_visibility: item.row.profile?.market_visibility,
    pricing_model: item.row.profile?.pricing_model,
    price_per_use_cny: item.row.profile?.price_per_use_cny,
    hotness_score: round2(item.hotness),
    revenue_7d: round2(item.row.aggregate.revenue_cny),
    success_rate_7d: round2(item.row.aggregate.success_rate),
    usage_7d: item.row.aggregate.usage_count,
    growth_score: round2(item.growth),
    quality_score: round2(item.quality),
    sparkline: item.trends.map((point) => point.hotness).slice(-7),
  }));

  return {
    window,
    sort,
    rankings,
    storage_mode: marketAnalyticsStore.getStatus().storage_mode,
  };
}
