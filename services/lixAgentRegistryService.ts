import type { AgentDescriptor } from './agentMarketplaceTypes.js';
import type { DeliveredAgentManifest, ReviewDecision } from './lixTypes.js';
import { marketAnalyticsStore } from './marketAnalyticsStore.js';

interface ApprovedAgentRecord {
    manifest: DeliveredAgentManifest;
    review: ReviewDecision;
    approved_at: string;
    usage_count: number;
    success_count: number;
    total_revenue_cny: number;
    last_used_at?: string;
    off_platform_risk_flag?: boolean;
    last_take_rate_tier?: 'first_trade' | 'repeat_trade';
    last_order_sequence?: number;
}

interface AgentUsageInput {
    consumer_id?: string;
    success: boolean;
    off_platform_suspected?: boolean;
}

export interface AgentRevenueSnapshot {
    agent_id: string;
    owner_id: string;
    usage_count: number;
    success_count: number;
    success_rate: number;
    total_revenue_cny: number;
    price_per_use_cny: number;
    pricing_model: 'free' | 'pay_per_use';
    market_visibility: 'public' | 'private';
    last_used_at?: string;
    revenue_delta_cny?: number;
    effective_take_rate?: number;
    take_rate_tier?: 'first_trade' | 'repeat_trade';
    order_sequence?: number;
    off_platform_risk_flag?: boolean;
}

export interface OwnerRevenueSummary {
    owner_id: string;
    total_revenue_cny: number;
    total_usage_count: number;
    total_success_count: number;
    active_agents: number;
    agents: AgentRevenueSnapshot[];
}

class LixAgentRegistryService {
    private approved = new Map<string, ApprovedAgentRecord>();
    private consumerTradeCounter = new Map<string, number>();

    private inferImportedVia(manifest: DeliveredAgentManifest): 'lix_delivery' | 'github_import' {
        return manifest.github_repo ? 'github_import' : 'lix_delivery';
    }

    registerApprovedAgent(manifest: DeliveredAgentManifest, review: ReviewDecision): AgentDescriptor {
        const approvedAt = review.reviewed_at || new Date().toISOString();
        const previous = this.approved.get(manifest.agent_id);
        const normalizedManifest: DeliveredAgentManifest = {
            ...manifest,
            market_visibility: manifest.market_visibility === 'private' ? 'private' : 'public',
            pricing_model: manifest.pricing_model === 'free' ? 'free' : 'pay_per_use',
            price_per_use_cny: Number.isFinite(manifest.price_per_use_cny)
                ? Math.max(0, Number(manifest.price_per_use_cny))
                : 9,
        };
        const nextRecord: ApprovedAgentRecord = {
            manifest: normalizedManifest,
            review,
            approved_at: approvedAt,
            usage_count: previous?.usage_count || 0,
            success_count: previous?.success_count || 0,
            total_revenue_cny: previous?.total_revenue_cny || 0,
            last_used_at: previous?.last_used_at,
            off_platform_risk_flag: previous?.off_platform_risk_flag || false,
            last_take_rate_tier: previous?.last_take_rate_tier,
            last_order_sequence: previous?.last_order_sequence,
        };

        this.approved.set(manifest.agent_id, nextRecord);
        void marketAnalyticsStore.upsertAgentProfile({
            agent_id: manifest.agent_id,
            agent_name: manifest.name,
            owner_id: manifest.owner_id,
            domains: manifest.domains,
            market_visibility: manifest.market_visibility === 'private' ? 'private' : 'public',
            pricing_model: manifest.pricing_model === 'free' ? 'free' : 'pay_per_use',
            price_per_use_cny: Number.isFinite(manifest.price_per_use_cny)
                ? Math.max(0, Number(manifest.price_per_use_cny))
                : 9,
            source: 'external_market',
            source_meta: {
                imported_via: this.inferImportedVia(manifest),
                approved_at: approvedAt,
                submitted_by: manifest.submitted_by,
                github_repo: manifest.github_repo,
                github_manifest_path: manifest.manifest_path,
                manifest_snapshot: normalizedManifest,
                review_snapshot: {
                    decision: review.decision,
                    reviewer_id: review.reviewer_id,
                    reviewed_at: review.reviewed_at,
                    reason: review.reason,
                },
            },
        }).catch(() => {
            // Keep runtime registration resilient even if analytics persistence fails.
        });
        return this.toAgentDescriptor(nextRecord);
    }

    listApprovedAgents(options?: { owner_id?: string }): AgentDescriptor[] {
        const owner = options?.owner_id?.trim();
        const out: AgentDescriptor[] = [];
        for (const record of this.approved.values()) {
            if (owner && record.manifest.owner_id !== owner) continue;
            if (record.manifest.market_visibility === 'private' && !owner) continue;
            out.push(this.toAgentDescriptor(record));
        }
        return out;
    }

    getApprovedAgent(agentId: string): AgentDescriptor | undefined {
        const record = this.approved.get(agentId);
        if (!record) return undefined;
        return this.toAgentDescriptor(record);
    }

    getApprovedManifest(agentId: string): DeliveredAgentManifest | undefined {
        return this.approved.get(agentId)?.manifest;
    }

    recordAgentUsage(agentId: string, input: AgentUsageInput): AgentRevenueSnapshot | undefined {
        const record = this.approved.get(agentId);
        if (!record) return undefined;

        record.usage_count += 1;
        if (input.success) {
            record.success_count += 1;
        }
        record.last_used_at = new Date().toISOString();

        const manifest = record.manifest;
        const isPaid = manifest.pricing_model === 'pay_per_use';
        const pricePerUse = Number.isFinite(manifest.price_per_use_cny) ? Math.max(0, Number(manifest.price_per_use_cny)) : 0;
        const isSelfUse = input.consumer_id && input.consumer_id === manifest.owner_id;
        const consumerId = String(input.consumer_id || '').trim();
        const tradeKey = consumerId ? `${consumerId}::${agentId}` : '';
        const orderSequence = tradeKey
            ? (this.consumerTradeCounter.get(tradeKey) || 0) + 1
            : 1;
        if (tradeKey) {
            this.consumerTradeCounter.set(tradeKey, orderSequence);
        }
        const takeRateTier: 'first_trade' | 'repeat_trade' = orderSequence <= 1 ? 'first_trade' : 'repeat_trade';
        const effectiveTakeRate = takeRateTier === 'first_trade' ? 0.30 : 0.10;
        let revenueDelta = 0;
        if (isPaid && input.success && !isSelfUse && pricePerUse > 0) {
            const platformCut = Math.round(pricePerUse * effectiveTakeRate * 100) / 100;
            const providerIncome = Math.max(0, Math.round((pricePerUse - platformCut) * 100) / 100);
            record.total_revenue_cny += providerIncome;
            revenueDelta = providerIncome;
        }
        record.last_take_rate_tier = takeRateTier;
        record.last_order_sequence = orderSequence;
        if (input.off_platform_suspected) {
            record.off_platform_risk_flag = true;
        }

        return {
            ...this.toRevenueSnapshot(agentId, record),
            revenue_delta_cny: revenueDelta,
            effective_take_rate: effectiveTakeRate,
            take_rate_tier: takeRateTier,
            order_sequence: orderSequence,
            off_platform_risk_flag: record.off_platform_risk_flag || false,
        };
    }

    getOwnerRevenueSummary(ownerId: string): OwnerRevenueSummary {
        const owner = String(ownerId || '').trim();
        const snapshots = Array.from(this.approved.entries())
            .filter(([, record]) => !owner || record.manifest.owner_id === owner)
            .map(([agentId, record]) => this.toRevenueSnapshot(agentId, record));
        return {
            owner_id: owner,
            total_revenue_cny: snapshots.reduce((acc, item) => acc + item.total_revenue_cny, 0),
            total_usage_count: snapshots.reduce((acc, item) => acc + item.usage_count, 0),
            total_success_count: snapshots.reduce((acc, item) => acc + item.success_count, 0),
            active_agents: snapshots.length,
            agents: snapshots,
        };
    }

    clear(): void {
        this.approved.clear();
        this.consumerTradeCounter.clear();
    }

    private toRevenueSnapshot(agentId: string, record: ApprovedAgentRecord): AgentRevenueSnapshot {
        const manifest = record.manifest;
        const usageCount = Math.max(0, record.usage_count);
        const successCount = Math.max(0, record.success_count);
        return {
            agent_id: agentId,
            owner_id: manifest.owner_id,
            usage_count: usageCount,
            success_count: successCount,
            success_rate: usageCount > 0 ? successCount / usageCount : (manifest.success_rate || 0),
            total_revenue_cny: Math.max(0, Number(record.total_revenue_cny || 0)),
            price_per_use_cny: Number.isFinite(manifest.price_per_use_cny) ? Math.max(0, Number(manifest.price_per_use_cny)) : 0,
            pricing_model: manifest.pricing_model === 'free' ? 'free' : 'pay_per_use',
            market_visibility: manifest.market_visibility === 'private' ? 'private' : 'public',
            last_used_at: record.last_used_at,
            take_rate_tier: record.last_take_rate_tier,
            order_sequence: record.last_order_sequence,
            effective_take_rate: record.last_take_rate_tier
                ? (record.last_take_rate_tier === 'first_trade' ? 0.30 : 0.10)
                : undefined,
            off_platform_risk_flag: record.off_platform_risk_flag || false,
        };
    }

    private toAgentDescriptor(record: ApprovedAgentRecord): AgentDescriptor {
        const manifest = record.manifest;
        const approvedAt = record.approved_at;
        const usageCount = Math.max(0, record.usage_count);
        const successCount = Math.max(0, record.success_count);
        const runtimeSuccessRate = usageCount > 0 ? successCount / usageCount : undefined;
        const sourceSuccessRate = Number.isFinite(runtimeSuccessRate) ? runtimeSuccessRate : manifest.success_rate;
        return {
            id: manifest.agent_id,
            name: manifest.name,
            source: 'external_market',
            domains: manifest.domains,
            capabilities: manifest.capabilities,
            supports_realtime: manifest.supports_realtime,
            evidence_level: manifest.evidence_level,
            supports_parallel: manifest.supports_parallel,
            avg_latency_ms: manifest.avg_latency_ms,
            success_rate: sourceSuccessRate,
            cost_tier: manifest.cost_tier,
            execute_ref: manifest.execute_ref,
            owner_id: manifest.owner_id,
            market_visibility: manifest.market_visibility === 'private' ? 'private' : 'public',
            pricing_model: manifest.pricing_model === 'free' ? 'free' : 'pay_per_use',
            price_per_use_cny: Number.isFinite(manifest.price_per_use_cny) ? Math.max(0, Number(manifest.price_per_use_cny)) : 0,
            market_stats: {
                usage_7d: usageCount,
                usage_30d: usageCount,
                success_rate_7d: usageCount > 0 ? (successCount / usageCount) : sourceSuccessRate,
                revenue_7d_cny: Math.max(0, Number(record.total_revenue_cny || 0)),
                revenue_30d_cny: Math.max(0, Number(record.total_revenue_cny || 0)),
            },
            source_meta: {
                imported_via: this.inferImportedVia(manifest),
                imported_at: approvedAt,
                github_repo: manifest.github_repo,
                github_manifest_path: manifest.manifest_path,
            },
            metrics_source: usageCount > 0 ? 'runtime' : (manifest.success_rate || manifest.avg_latency_ms ? 'prior' : 'unknown'),
            metrics_sample_size: usageCount > 0 ? usageCount : undefined,
            compliance_tags: [
                'external_feed',
                'external_admitted',
                'lix_delivered',
                'reviewed',
                manifest.github_repo ? 'github_imported' : 'lix_imported',
                `owner:${manifest.owner_id}`,
                `approved_at:${approvedAt}`,
                `market_visibility:${manifest.market_visibility === 'private' ? 'private' : 'public'}`,
                `pricing_model:${manifest.pricing_model === 'free' ? 'free' : 'pay_per_use'}`,
                `price_per_use_cny:${Number.isFinite(manifest.price_per_use_cny) ? Math.max(0, Number(manifest.price_per_use_cny)) : 0}`,
                `usage_count:${usageCount}`,
                `revenue_total_cny:${Math.max(0, Number(record.total_revenue_cny || 0))}`,
                `take_rate_tier:${record.last_take_rate_tier || 'first_trade'}`,
                `off_platform_risk:${record.off_platform_risk_flag ? 'true' : 'false'}`,
                manifest.github_repo ? `github_repo:${manifest.github_repo}` : undefined,
                manifest.manifest_path ? `github_manifest_path:${manifest.manifest_path}` : undefined,
            ].filter((tag): tag is string => Boolean(tag)),
        };
    }
}

export const lixAgentRegistryService = new LixAgentRegistryService();
