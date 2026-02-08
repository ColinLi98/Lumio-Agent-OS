import type { StoredSolutionIntent } from './lixStore.js';
import type { DeliveredAgentManifest } from './lixTypes.js';
import { recordInteraction } from './localStorageService.js';
import { getDigitalSoulManager } from './digitalSoulManager.js';

const SYNC_MARKER_PREFIX = 'lix_agent_synced_';

function markerKey(agentId: string): string {
    return `${SYNC_MARKER_PREFIX}${agentId}`;
}

function hasSynced(agentId: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(markerKey(agentId)) === '1';
}

function markSynced(agentId: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(markerKey(agentId), '1');
}

export function syncApprovedAgentToDigitalTwin(
    intent: Pick<StoredSolutionIntent, 'intent_id' | 'query' | 'domain'>,
    manifest: DeliveredAgentManifest
): boolean {
    const agentId = String(manifest.agent_id || '').trim();
    if (!agentId) return false;
    if (hasSynced(agentId)) return false;

    const primaryDomain = manifest.domains?.[0] || intent.domain || 'general';

    recordInteraction('tool_used', {
        toolName: 'lix_delivered_agent',
        agentId,
        agentName: manifest.name,
        domain: primaryDomain,
        intentId: intent.intent_id,
        source: 'lix_solution_review',
    }, 'lix_market');

    const manager = getDigitalSoulManager();
    manager.addMilestone({
        type: 'achievement',
        title: '🧩 新 Agent 已接入',
        description: `专家交付的 ${manifest.name} 已同步到数字分身能力图谱`,
    });

    markSynced(agentId);
    return true;
}

export function syncMarketplaceAgentIdsToDigitalTwin(agentIds: string[]): number {
    const manager = getDigitalSoulManager();
    let synced = 0;

    for (const id of agentIds) {
        const agentId = String(id || '').trim();
        if (!agentId || !agentId.startsWith('ext:lix:')) continue;
        if (hasSynced(agentId)) continue;

        recordInteraction('tool_used', {
            toolName: 'lix_delivered_agent',
            agentId,
            source: 'agent_marketplace_discovery',
        }, 'agent_market');

        manager.addMilestone({
            type: 'achievement',
            title: '🤝 Marketplace 协作升级',
            description: `新上架专家 Agent（${agentId}）已纳入数字分身协作历史`,
        });

        markSynced(agentId);
        synced += 1;
    }

    return synced;
}

