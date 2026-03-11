import type { StoredSolutionIntent } from './lixStore.js';
import type { DeliveredAgentManifest } from './lixTypes.js';
import { recordInteraction } from './localStorageService.js';

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
    manifest: DeliveredAgentManifest,
): boolean {
    const agentId = String(manifest?.agent_id || '').trim();
    if (!agentId || hasSynced(agentId)) return false;

    recordInteraction('tool_used', {
        toolName: 'lix_delivered_agent',
        agentId,
        agentName: manifest.name,
        domain: manifest.domains?.[0] || intent.domain || 'general',
        intentId: intent.intent_id,
        source: 'lix_solution_review',
    }, 'lix_market');

    markSynced(agentId);
    return true;
}

export function syncMarketplaceAgentIdsToDigitalTwin(agentIds: string[]): number {
    let synced = 0;
    for (const rawId of agentIds) {
        const agentId = String(rawId || '').trim();
        if (!agentId || hasSynced(agentId)) continue;
        recordInteraction('tool_used', {
            toolName: 'lix_delivered_agent',
            agentId,
            source: 'agent_marketplace_discovery',
        }, 'agent_market');
        markSynced(agentId);
        synced += 1;
    }
    return synced;
}
