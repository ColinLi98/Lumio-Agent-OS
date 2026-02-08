import type { AgentDomain, DigitalTwinContext, EvidenceLevel } from './agentMarketplaceTypes.js';
import type { LixDigitalTwinSnapshot, ProfileShareConsentState } from './lixTypes.js';
import { getEnhancedDigitalAvatar } from './localStorageService.js';

export type { ProfileShareConsentState };

const PROFILE_SHARE_CONSENT_KEY = 'lix_solution_profile_share_consent_v1';

function normalizeDomain(topic: string): AgentDomain | null {
    if (!topic) return null;
    if (/旅行|旅游|机票|酒店|travel/i.test(topic)) return 'travel';
    if (/购物|价格|比价|shopping|ecommerce/i.test(topic)) return 'shopping';
    if (/本地|餐厅|咖啡|附近|商家|local/i.test(topic)) return 'local_service';
    if (/招聘|简历|面试|job|hire/i.test(topic)) return 'recruitment';
    if (/理财|投资|finance|股票|基金/i.test(topic)) return 'finance';
    if (/医疗|健康|health/i.test(topic)) return 'health';
    if (/法律|合同|legal/i.test(topic)) return 'legal';
    if (/学习|教育|course|study|education/i.test(topic)) return 'education';
    return null;
}

function inferPreferredEvidenceLevel(privacyMode: boolean, privacyConcern: number): EvidenceLevel | 'adaptive' {
    if (privacyMode || privacyConcern >= 75) return 'strong';
    if (privacyConcern <= 35) return 'weak';
    return 'adaptive';
}

function inferPreferredLatency(efficiency: number): 'fast' | 'balanced' | 'quality' {
    if (efficiency >= 72) return 'fast';
    if (efficiency <= 38) return 'quality';
    return 'balanced';
}

function dedupeDomains(domains: AgentDomain[]): AgentDomain[] {
    const seen = new Set<AgentDomain>();
    const out: AgentDomain[] = [];
    for (const domain of domains) {
        if (seen.has(domain)) continue;
        seen.add(domain);
        out.push(domain);
    }
    return out;
}

function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function getCurrentUserId(): string {
    try {
        const avatar = getEnhancedDigitalAvatar();
        return String(avatar.id || '').trim() || 'demo_user';
    } catch {
        return 'demo_user';
    }
}

export function getProfileShareConsent(): ProfileShareConsentState {
    if (typeof localStorage === 'undefined') return 'revoked';
    const raw = localStorage.getItem(PROFILE_SHARE_CONSENT_KEY);
    if (raw === 'granted_once' || raw === 'granted_remembered' || raw === 'revoked') {
        return raw;
    }
    return 'revoked';
}

export function setProfileShareConsent(state: ProfileShareConsentState): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PROFILE_SHARE_CONSENT_KEY, state);
}

export function revokeProfileShareConsent(): void {
    setProfileShareConsent('revoked');
}

export function buildMarketplaceTwinContext(): DigitalTwinContext {
    const avatar = getEnhancedDigitalAvatar();
    const preferredDomains = dedupeDomains([
        ...avatar.interestTags
            .map((tag) => normalizeDomain(tag.name))
            .filter((v): v is AgentDomain => Boolean(v))
            .slice(0, 5),
    ]);

    return {
        user_id: String(avatar.id || '').trim() || 'demo_user',
        profile_completeness: Math.max(0, Math.min(100, Number(avatar.profileCompleteness || 0))),
        privacy_mode: Boolean(avatar.privacyMode),
        preferences: {
            price_vs_quality: Number(avatar.valuesProfile?.priceVsQuality || 0),
            risk_tolerance: Math.max(0, Math.min(100, Number(avatar.personality?.riskTolerance || 50))),
            preferred_evidence_level: inferPreferredEvidenceLevel(
                Boolean(avatar.privacyMode),
                Number(avatar.valuesProfile?.privacyConcern || 0)
            ),
            preferred_latency: inferPreferredLatency(Number(avatar.valuesProfile?.efficiency || 50)),
            preferred_domains: preferredDomains,
            preferred_tools: Array.isArray(avatar.behaviorPatterns?.preferredTools)
                ? avatar.behaviorPatterns.preferredTools.slice(0, 8)
                : [],
        },
    };
}

export function buildLixTwinSnapshot(): LixDigitalTwinSnapshot {
    const avatar = getEnhancedDigitalAvatar();
    return {
        user_id: String(avatar.id || '').trim() || 'demo_user',
        captured_at: new Date().toISOString(),
        source: 'agent_marketplace',
        enhanced_avatar: deepClone(avatar),
        marketplace_context: buildMarketplaceTwinContext(),
    };
}

export function summarizeTwinContext(context: DigitalTwinContext): string {
    const domains = context.preferences.preferred_domains.slice(0, 2).join(' / ') || 'general';
    const evidence = context.preferences.preferred_evidence_level;
    const latency = context.preferences.preferred_latency;
    return `画像参与：${domains} · 证据 ${evidence} · 速度 ${latency}`;
}
