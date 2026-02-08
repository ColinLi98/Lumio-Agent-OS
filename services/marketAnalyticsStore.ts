import fs from 'node:fs/promises';
import type { AgentDomain, MarketVisibility, PricingModel } from './agentMarketplaceTypes';

export interface MarketUsageEvent {
  event_id: string;
  ts_ms: number;
  date: string; // YYYY-MM-DD
  agent_id: string;
  agent_name?: string;
  owner_id?: string;
  consumer_id?: string;
  domain?: AgentDomain | string;
  success: boolean;
  revenue_delta_cny: number;
  source: 'manual_execute' | 'api' | 'import' | 'system';
}

export interface MarketUsageEventInput {
  agent_id: string;
  agent_name?: string;
  owner_id?: string;
  consumer_id?: string;
  domain?: AgentDomain | string;
  success: boolean;
  revenue_delta_cny?: number;
  source?: 'manual_execute' | 'api' | 'import' | 'system';
  ts_ms?: number;
}

export interface MarketDailyRollup {
  date: string;
  agent_id: string;
  usage_count: number;
  success_count: number;
  revenue_cny: number;
  unique_consumers: number;
  repeat_use_count: number;
}

interface MarketDailyRollupInternal extends MarketDailyRollup {
  consumer_hits: Record<string, number>;
}

export interface MarketAgentProfile {
  agent_id: string;
  agent_name?: string;
  owner_id?: string;
  domains?: string[];
  market_visibility?: MarketVisibility;
  pricing_model?: PricingModel;
  price_per_use_cny?: number;
  source?: string;
  source_meta?: Record<string, any>;
  updated_at: string;
}

interface MarketAnalyticsData {
  usage_events: MarketUsageEvent[];
  daily_rollups: Record<string, MarketDailyRollupInternal>;
  agent_profiles: Record<string, MarketAgentProfile>;
}

export interface MarketAnalyticsStatus {
  storage_mode: 'durable' | 'degraded';
  backend: 'file' | 'memory';
  error?: string;
  file_path?: string;
}

export interface UsageWindowAggregate {
  usage_count: number;
  success_count: number;
  revenue_cny: number;
  unique_consumers: number;
  repeat_use_count: number;
  paid_usage_count: number;
  success_rate: number;
  paid_conversion: number;
  repeat_use_rate: number;
  last_event_ts_ms?: number;
}

const DEFAULT_FILE_PATH = '/tmp/lumi-market-analytics.json';
const MAX_USAGE_EVENTS = 20_000;
const RATE_LIMIT_WINDOW_MS = 5_000;

function emptyData(): MarketAnalyticsData {
  return {
    usage_events: [],
    daily_rollups: {},
    agent_profiles: {},
  };
}

function toDateString(tsMs: number): string {
  const d = new Date(tsMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeRevenue(value: unknown): number {
  const amount = safeNumber(value, 0);
  return amount > 0 ? amount : 0;
}

function rollupKey(date: string, agentId: string): string {
  return `${date}::${agentId}`;
}

class MarketAnalyticsStore {
  private data: MarketAnalyticsData = emptyData();
  private loaded = false;
  private storageMode: 'durable' | 'degraded' = 'durable';
  private backend: 'file' | 'memory' = 'file';
  private lastError?: string;
  private writeQueue: Promise<void> = Promise.resolve();
  private recentHitMap = new Map<string, number>();

  private getFilePath(): string {
    return String(process.env.MARKET_ANALYTICS_FILE || DEFAULT_FILE_PATH).trim() || DEFAULT_FILE_PATH;
  }

  private useDurableFile(): boolean {
    return String(process.env.MARKET_ANALYTICS_DISABLE_FILE || '').trim() !== '1';
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    if (!this.useDurableFile()) {
      this.storageMode = 'degraded';
      this.backend = 'memory';
      this.lastError = 'durable_file_disabled';
      this.data = emptyData();
      return;
    }

    const filePath = this.getFilePath();
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      this.data = {
        usage_events: Array.isArray(parsed?.usage_events) ? parsed.usage_events : [],
        daily_rollups: parsed?.daily_rollups && typeof parsed.daily_rollups === 'object'
          ? parsed.daily_rollups
          : {},
        agent_profiles: parsed?.agent_profiles && typeof parsed.agent_profiles === 'object'
          ? parsed.agent_profiles
          : {},
      };
      this.storageMode = 'durable';
      this.backend = 'file';
      this.lastError = undefined;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        this.data = emptyData();
        await this.flushToDurable().catch((flushError) => {
          this.storageMode = 'degraded';
          this.backend = 'memory';
          this.lastError = flushError instanceof Error ? flushError.message : String(flushError);
        });
        return;
      }
      this.storageMode = 'degraded';
      this.backend = 'memory';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.data = emptyData();
    }
  }

  private async flushToDurable(): Promise<void> {
    if (this.storageMode === 'degraded' || this.backend !== 'file') return;
    const filePath = this.getFilePath();
    const payload = JSON.stringify(this.data);
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.writeFile(filePath, payload, 'utf8');
    });
    try {
      await this.writeQueue;
    } catch (error) {
      this.storageMode = 'degraded';
      this.backend = 'memory';
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  getStatus(): MarketAnalyticsStatus {
    return {
      storage_mode: this.storageMode,
      backend: this.backend,
      error: this.lastError,
      file_path: this.backend === 'file' ? this.getFilePath() : undefined,
    };
  }

  async upsertAgentProfile(input: Partial<MarketAgentProfile> & { agent_id: string }): Promise<MarketAgentProfile> {
    await this.ensureLoaded();
    const agentId = String(input.agent_id || '').trim();
    if (!agentId) {
      throw new Error('agent_id is required');
    }
    const now = new Date().toISOString();
    const previous = this.data.agent_profiles[agentId];
    const next: MarketAgentProfile = {
      agent_id: agentId,
      agent_name: String(input.agent_name || previous?.agent_name || '').trim() || undefined,
      owner_id: String(input.owner_id || previous?.owner_id || '').trim() || undefined,
      domains: Array.isArray(input.domains) && input.domains.length > 0
        ? input.domains.map((value) => String(value || '').trim()).filter(Boolean)
        : previous?.domains,
      market_visibility: input.market_visibility || previous?.market_visibility,
      pricing_model: input.pricing_model || previous?.pricing_model,
      price_per_use_cny: Number.isFinite(input.price_per_use_cny as number)
        ? normalizeRevenue(input.price_per_use_cny)
        : previous?.price_per_use_cny,
      source: String(input.source || previous?.source || '').trim() || undefined,
      source_meta: input.source_meta || previous?.source_meta,
      updated_at: now,
    };
    this.data.agent_profiles[agentId] = next;
    await this.flushToDurable();
    return next;
  }

  async getAgentProfile(agentId: string): Promise<MarketAgentProfile | undefined> {
    await this.ensureLoaded();
    return this.data.agent_profiles[String(agentId || '').trim()];
  }

  private applyDailyRollup(event: MarketUsageEvent): void {
    const key = rollupKey(event.date, event.agent_id);
    const prev = this.data.daily_rollups[key];
    const next: MarketDailyRollupInternal = prev || {
      date: event.date,
      agent_id: event.agent_id,
      usage_count: 0,
      success_count: 0,
      revenue_cny: 0,
      unique_consumers: 0,
      repeat_use_count: 0,
      consumer_hits: {},
    };

    next.usage_count += 1;
    if (event.success) next.success_count += 1;
    next.revenue_cny += normalizeRevenue(event.revenue_delta_cny);

    const consumer = String(event.consumer_id || '').trim();
    if (consumer) {
      const previousHits = safeNumber(next.consumer_hits[consumer], 0);
      next.consumer_hits[consumer] = previousHits + 1;
      if (previousHits === 0) next.unique_consumers += 1;
      if (previousHits >= 1) next.repeat_use_count += 1;
    }

    this.data.daily_rollups[key] = next;
  }

  async recordUsageEvent(input: MarketUsageEventInput): Promise<{ accepted: boolean; rate_limited?: boolean; event?: MarketUsageEvent }> {
    await this.ensureLoaded();
    const agentId = String(input.agent_id || '').trim();
    if (!agentId) {
      return { accepted: false };
    }

    const now = Number.isFinite(input.ts_ms) ? Number(input.ts_ms) : Date.now();
    const consumer = String(input.consumer_id || '').trim();
    if (consumer) {
      const limiterKey = `${consumer}::${agentId}`;
      const lastTs = this.recentHitMap.get(limiterKey) || 0;
      if (now - lastTs < RATE_LIMIT_WINDOW_MS) {
        return { accepted: false, rate_limited: true };
      }
      this.recentHitMap.set(limiterKey, now);
      if (this.recentHitMap.size > 5000) {
        const entries = Array.from(this.recentHitMap.entries());
        entries.sort((a, b) => a[1] - b[1]);
        entries.slice(0, 1000).forEach(([key]) => this.recentHitMap.delete(key));
      }
    }

    const event: MarketUsageEvent = {
      event_id: `mkt_evt_${now}_${Math.random().toString(36).slice(2, 8)}`,
      ts_ms: now,
      date: toDateString(now),
      agent_id: agentId,
      agent_name: String(input.agent_name || '').trim() || undefined,
      owner_id: String(input.owner_id || '').trim() || undefined,
      consumer_id: consumer || undefined,
      domain: String(input.domain || '').trim() || undefined,
      success: input.success === true,
      revenue_delta_cny: normalizeRevenue(input.revenue_delta_cny),
      source: input.source || 'manual_execute',
    };

    this.data.usage_events.push(event);
    if (this.data.usage_events.length > MAX_USAGE_EVENTS) {
      this.data.usage_events.splice(0, this.data.usage_events.length - MAX_USAGE_EVENTS);
    }
    this.applyDailyRollup(event);

    if (!this.data.agent_profiles[agentId]) {
      this.data.agent_profiles[agentId] = {
        agent_id: agentId,
        agent_name: event.agent_name,
        owner_id: event.owner_id,
        updated_at: new Date().toISOString(),
      };
    } else if (!this.data.agent_profiles[agentId].agent_name && event.agent_name) {
      this.data.agent_profiles[agentId].agent_name = event.agent_name;
      this.data.agent_profiles[agentId].updated_at = new Date().toISOString();
    }

    await this.flushToDurable();
    return { accepted: true, event };
  }

  async listAgentIds(): Promise<string[]> {
    await this.ensureLoaded();
    const ids = new Set<string>();
    Object.keys(this.data.agent_profiles).forEach((id) => ids.add(id));
    this.data.usage_events.forEach((event) => ids.add(event.agent_id));
    return Array.from(ids.values());
  }

  async listDailyRollups(agentId: string, windowDays: number, domain?: string): Promise<MarketDailyRollup[]> {
    await this.ensureLoaded();
    const normalizedAgentId = String(agentId || '').trim();
    if (!normalizedAgentId) return [];
    const now = Date.now();
    const since = now - Math.max(1, windowDays) * 24 * 3600 * 1000;

    const events = this.data.usage_events.filter((event) => {
      if (event.agent_id !== normalizedAgentId) return false;
      if (event.ts_ms < since) return false;
      if (domain && String(event.domain || '') !== domain) return false;
      return true;
    });

    const map = new Map<string, MarketDailyRollupInternal>();
    events.forEach((event) => {
      const key = event.date;
      const current = map.get(key) || {
        date: event.date,
        agent_id: normalizedAgentId,
        usage_count: 0,
        success_count: 0,
        revenue_cny: 0,
        unique_consumers: 0,
        repeat_use_count: 0,
        consumer_hits: {},
      };
      current.usage_count += 1;
      if (event.success) current.success_count += 1;
      current.revenue_cny += normalizeRevenue(event.revenue_delta_cny);
      const consumer = String(event.consumer_id || '').trim();
      if (consumer) {
        const hits = safeNumber(current.consumer_hits[consumer], 0);
        current.consumer_hits[consumer] = hits + 1;
        if (hits === 0) current.unique_consumers += 1;
        if (hits >= 1) current.repeat_use_count += 1;
      }
      map.set(key, current);
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date,
        agent_id: item.agent_id,
        usage_count: item.usage_count,
        success_count: item.success_count,
        revenue_cny: item.revenue_cny,
        unique_consumers: item.unique_consumers,
        repeat_use_count: item.repeat_use_count,
      }));
  }

  async listUsageEvents(agentId: string, windowDays: number, domain?: string): Promise<MarketUsageEvent[]> {
    await this.ensureLoaded();
    const normalizedAgentId = String(agentId || '').trim();
    if (!normalizedAgentId) return [];
    const now = Date.now();
    const since = now - Math.max(1, windowDays) * 24 * 3600 * 1000;
    return this.data.usage_events
      .filter((event) => event.agent_id === normalizedAgentId)
      .filter((event) => event.ts_ms >= since)
      .filter((event) => !domain || String(event.domain || '') === domain)
      .sort((a, b) => a.ts_ms - b.ts_ms);
  }

  async getWindowAggregate(agentId: string, windowDays: number, domain?: string): Promise<UsageWindowAggregate> {
    const rollups = await this.listDailyRollups(agentId, windowDays, domain);
    const usage = rollups.reduce((acc, item) => acc + item.usage_count, 0);
    const success = rollups.reduce((acc, item) => acc + item.success_count, 0);
    const revenue = rollups.reduce((acc, item) => acc + item.revenue_cny, 0);
    const uniqueConsumers = rollups.reduce((acc, item) => acc + item.unique_consumers, 0);
    const repeat = rollups.reduce((acc, item) => acc + item.repeat_use_count, 0);

    const recentEvents = this.data.usage_events
      .filter((event) => event.agent_id === agentId)
      .filter((event) => !domain || String(event.domain || '') === domain)
      .sort((a, b) => b.ts_ms - a.ts_ms);
    const lastEventTs = recentEvents[0]?.ts_ms;
    const paidUsageCount = recentEvents.filter((event) => normalizeRevenue(event.revenue_delta_cny) > 0).length;

    return {
      usage_count: usage,
      success_count: success,
      revenue_cny: revenue,
      unique_consumers: uniqueConsumers,
      repeat_use_count: repeat,
      paid_usage_count: paidUsageCount,
      success_rate: usage > 0 ? success / usage : 0,
      paid_conversion: usage > 0 ? paidUsageCount / usage : 0,
      repeat_use_rate: usage > 0 ? repeat / usage : 0,
      last_event_ts_ms: lastEventTs,
    };
  }

  async clearForTests(): Promise<void> {
    this.data = emptyData();
    this.recentHitMap.clear();
    this.loaded = true;
    this.storageMode = this.useDurableFile() ? 'durable' : 'degraded';
    this.backend = this.useDurableFile() ? 'file' : 'memory';
    this.lastError = this.useDurableFile() ? undefined : 'durable_file_disabled';
    await this.flushToDurable();
  }
}

export const marketAnalyticsStore = new MarketAnalyticsStore();
