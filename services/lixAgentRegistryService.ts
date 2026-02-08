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
}

interface AgentUsageInput {
    consumer_id?: string;
    success: boolean;
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
        let revenueDelta = 0;
        if (isPaid && input.success && !isSelfUse && pricePerUse > 0) {
            record.total_revenue_cny += pricePerUse;
            revenueDelta = pricePerUse;
        }

        return {
            ...this.toRevenueSnapshot(agentId, record),
            revenue_delta_cny: revenueDelta,
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
                manifest.github_repo ? `github_repo:${manifest.github_repo}` : undefined,
                manifest.manifest_path ? `github_manifest_path:${manifest.manifest_path}` : undefined,
            ].filter((tag): tag is string => Boolean(tag)),
        };
    }
}

export const lixAgentRegistryService = new LixAgentRegistryService();
