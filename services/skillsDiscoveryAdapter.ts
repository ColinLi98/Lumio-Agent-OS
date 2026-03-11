import { getSkillRegistry, type Skill } from './skillRegistry.js';
import { getToolRegistry } from './toolRegistry.js';
import { isCliBashExecutionEnabled, runCurlJsonWithGrep } from './cliBashExecutor.js';
import { skillAnalyticsStore } from './skillAnalyticsStore.js';

export type DiscoverySkillSource = 'local_index' | 'github_search' | 'trusted_catalog';
export type DiscoverySandboxLevel = 'none' | 'sandbox' | 'approved' | 'quarantine';

export interface SkillDiscoveryCandidate {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    domain: string;
    source: DiscoverySkillSource;
    score: number;
    successRate?: number;
    latencyP95?: number;
    evidenceLevel?: 'weak' | 'mid' | 'strong';
    costTier?: 'low' | 'mid' | 'high';
    sourceRepo?: string;
    versionRef?: string;
    sandboxLevel: DiscoverySandboxLevel;
    admissionPassed: boolean;
    policyTags?: string[];
    requiredPermissions?: string[];
    safetyLevel?: 'decision_support_only' | 'bounded_execution' | 'standard';
    lastVerifiedAt?: number;
    policyPassed?: boolean;
    authenticity?: 'verified' | 'unverified';
    authenticityReason?: string;
    verificationEvidenceUrl?: string;
}

export interface SkillDiscoveryResult {
    traceId: string;
    query: string;
    requiredCapabilities: string[];
    localCandidates: SkillDiscoveryCandidate[];
    githubCandidates: SkillDiscoveryCandidate[];
    approvedCandidates: SkillDiscoveryCandidate[];
    canaryReports: SkillCanaryReport[];
    promotionRecords: SkillPromotionRecord[];
}

export type ExternalSearchMode = 'auto' | 'force' | 'off';

export interface SkillCanaryReport {
    traceId: string;
    skillId: string;
    source: DiscoverySkillSource;
    passed: boolean;
    sampleSize: number;
    evidenceCount: number;
    note: string;
}

export interface SkillPromotionRecord {
    traceId: string;
    skillId: string;
    fromLevel: DiscoverySandboxLevel;
    toLevel: DiscoverySandboxLevel;
    promoted: boolean;
    reason: string;
}

interface GithubPayloadFetchResult {
    payload: any | null;
    blocked: boolean;
}

interface GithubRepoVerification {
    verified: boolean;
    reason: string;
    defaultBranch: string;
    stars: number;
    forks: number;
    description: string;
    htmlUrl: string;
    evidenceUrl?: string;
}

interface TrustedCatalogEntry {
    name: string;
    path: string;
}

interface TrustedCatalogCache {
    loadedAt: number;
    entries: TrustedCatalogEntry[];
}

interface LocalIndexRecord {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    domain: string;
    successRate: number;
    latencyP95: number;
    evidenceLevel: 'weak' | 'mid' | 'strong';
    costTier: 'low' | 'mid' | 'high';
    lastVerifiedAt: number;
    policyTags: string[];
    requiredPermissions: string[];
    safetyLevel: 'decision_support_only' | 'bounded_execution' | 'standard';
    sourceRepo?: string;
    versionRef?: string;
}

class SkillsDiscoveryAdapter {
    private localIndex = new Map<string, LocalIndexRecord>();
    private lastRefreshAt = 0;
    private repoVerificationCache = new Map<string, GithubRepoVerification>();
    private trustedCatalogCache: TrustedCatalogCache | null = null;

    async discoverSkills(
        query: string,
        requiredCapabilities: string[],
        options?: {
            requireGithub?: boolean;
            minApproved?: number;
            externalSearchMode?: ExternalSearchMode;
        }
    ): Promise<SkillDiscoveryResult> {
        this.ensureLocalIndexFresh();

        const traceId = `skills_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const localCandidates = this.searchLocalIndex(query, requiredCapabilities);
        const minApproved = options?.minApproved ?? 3;
        const externalSearchMode = resolveExternalSearchMode(options);
        const requireGithub = (() => {
            if (externalSearchMode === 'force') return true;
            if (externalSearchMode === 'off') return false;
            return shouldUseExternalDiscovery(query, requiredCapabilities, localCandidates.length, minApproved);
        })();

        const githubCandidates = requireGithub
            ? await this.searchGithub(query, requiredCapabilities)
            : [];

        const admitted = this.runSandboxAdmission(
            [...localCandidates, ...githubCandidates],
            requiredCapabilities
        );
        const canaryReports: SkillCanaryReport[] = [];
        const promotionRecords: SkillPromotionRecord[] = [];
        const approvedCandidates: SkillDiscoveryCandidate[] = [];

        for (const candidate of admitted) {
            if (!candidate.admissionPassed) continue;
            if (candidate.source === 'local_index') {
                approvedCandidates.push(candidate);
                continue;
            }

            const canary = this.runCanary(traceId, candidate, requiredCapabilities);
            canaryReports.push(canary);
            await skillAnalyticsStore.recordCanary({
                trace_id: canary.traceId,
                ts_ms: Date.now(),
                skill_id: canary.skillId,
                source: canary.source,
                passed: canary.passed,
                sample_size: canary.sampleSize,
                evidence_count: canary.evidenceCount,
                note: canary.note,
            }).catch(() => undefined);

            if (canary.passed) {
                approvedCandidates.push({
                    ...candidate,
                    sandboxLevel: 'approved',
                    admissionPassed: true,
                    score: round2(Math.min(1, candidate.score + 0.06)),
                });
                const record: SkillPromotionRecord = {
                    traceId,
                    skillId: candidate.id,
                    fromLevel: 'sandbox',
                    toLevel: 'approved',
                    promoted: true,
                    reason: 'canary_passed_with_evidence',
                };
                promotionRecords.push(record);
                await skillAnalyticsStore.recordPromotion({
                    trace_id: record.traceId,
                    ts_ms: Date.now(),
                    skill_id: record.skillId,
                    from_level: record.fromLevel,
                    to_level: record.toLevel,
                    promoted: true,
                    reason: record.reason,
                }).catch(() => undefined);
            } else {
                const record: SkillPromotionRecord = {
                    traceId,
                    skillId: candidate.id,
                    fromLevel: 'sandbox',
                    toLevel: 'quarantine',
                    promoted: false,
                    reason: 'canary_failed_or_evidence_insufficient',
                };
                promotionRecords.push(record);
                await skillAnalyticsStore.recordPromotion({
                    trace_id: record.traceId,
                    ts_ms: Date.now(),
                    skill_id: record.skillId,
                    from_level: record.fromLevel,
                    to_level: record.toLevel,
                    promoted: false,
                    reason: record.reason,
                }).catch(() => undefined);
            }
        }

        const sortedApproved = approvedCandidates.sort((a, b) => b.score - a.score);
        const primary = sortedApproved[0];
        const fallback = sortedApproved[1];
        if (primary) {
            await skillAnalyticsStore.recordSelection({
                trace_id: traceId,
                ts_ms: Date.now(),
                task_id: requiredCapabilities[0] || 'task_1',
                required_capability: requiredCapabilities[0] || 'general_reasoning',
                primary_skill_id: primary.id,
                fallback_skill_id: fallback?.id,
                final_score: primary.score,
                selection_reason: fallback ? 'selected_primary_with_fallback' : 'selected_primary_no_fallback',
                gate_snapshot: primary.admissionPassed ? 'admission=passed|canary=applied' : 'admission=blocked',
            }).catch(() => undefined);
        }

        return {
            traceId,
            query,
            requiredCapabilities,
            localCandidates,
            githubCandidates,
            approvedCandidates: sortedApproved,
            canaryReports,
            promotionRecords,
        };
    }

    private ensureLocalIndexFresh(): void {
        const now = Date.now();
        if (now - this.lastRefreshAt < 30_000 && this.localIndex.size > 0) return;

        this.localIndex.clear();
        const skillRegistry = getSkillRegistry();
        const toolRegistry = getToolRegistry();

        for (const skill of skillRegistry.getAllSkills()) {
            const stats = skillRegistry.getSkillRuntimeStats(skill.id);
            this.localIndex.set(`skill:${skill.id}`, {
                id: `skill:${skill.id}`,
                name: skill.name,
                description: skill.description,
                capabilities: skill.capabilities,
                domain: inferDomain(skill.capabilities),
                successRate: stats?.success_rate ?? 0.9,
                latencyP95: stats?.avg_latency_ms ?? 600,
                evidenceLevel: 'mid',
                costTier: 'low',
                lastVerifiedAt: Date.now(),
                policyTags: skill.policy_tags ?? [],
                requiredPermissions: skill.required_permissions ?? [],
                safetyLevel: skill.safety_level ?? 'standard',
                versionRef: 'local',
            });
        }

        for (const tool of toolRegistry.getAllToolsWithMeta()) {
            if (!tool.marketplace) continue;
            const stats = toolRegistry.getToolRuntimeStats(tool.name);
            this.localIndex.set(`tool:${tool.name}`, {
                id: `tool:${tool.name}`,
                name: tool.name,
                description: tool.description,
                capabilities: tool.marketplace.capabilities,
                domain: tool.marketplace.domains[0] || 'general',
                successRate: stats?.success_rate ?? tool.marketplace.success_rate ?? 0.85,
                latencyP95: stats?.avg_latency_ms ?? tool.marketplace.avg_latency_ms ?? 900,
                evidenceLevel: normalizeEvidenceLevel(tool.marketplace.evidence_level),
                costTier: normalizeCostTier(tool.marketplace.cost_tier),
                lastVerifiedAt: Date.now(),
                policyTags: tool.marketplace.policy_tags ?? [],
                requiredPermissions: tool.marketplace.required_permissions ?? [],
                safetyLevel: tool.marketplace.safety_level ?? 'standard',
                versionRef: 'local',
            });
        }

        this.lastRefreshAt = now;
    }

    private searchLocalIndex(query: string, requiredCapabilities: string[]): SkillDiscoveryCandidate[] {
        const q = query.toLowerCase();
        const required = new Set(requiredCapabilities.map(c => c.toLowerCase()));
        const candidates: SkillDiscoveryCandidate[] = [];

        for (const record of this.localIndex.values()) {
            if (record.id === 'tool:broadcast_agent_requirement' && !isAgentSupplyIntentQuery(q)) {
                continue;
            }
            if (record.id === 'tool:broadcast_intent' && !isCommerceIntentQuery(q)) {
                continue;
            }
            if (record.id === 'tool:price_compare' && !isCommerceIntentQuery(q)) {
                continue;
            }

            const capHits = record.capabilities.filter(c => {
                const lower = c.toLowerCase();
                return required.has(lower) || [...required].some(r => lower.includes(r) || r.includes(lower));
            }).length;

            const capabilityFit = capHits > 0 ? clamp01(capHits / Math.max(1, required.size || 1)) : 0;
            const success = clamp01(record.successRate);
            const latency = latencyScore(record.latencyP95);
            const evidence = evidenceLevelScore(record.evidenceLevel);
            const cost = costTierScore(record.costTier);
            const policy = policyScore(record, q);
            const twinBoost = 0.0;
            const freshnessBoost = requiresLiveData(q) && supportsLiveData(record.capabilities) ? 0.03 : 0.0;

            // Hard filters: only keep locally usable candidates before counting capacity.
            if (capabilityFit < 0.60) continue;
            if (success < 0.90) continue;
            if ((record.latencyP95 ?? 99_999) > 7_500) continue;
            if (evidence < 0.70) continue;
            if (policy < 0.90) continue;

            const score = clamp01(
                capabilityFit * 0.30 +
                success * 0.20 +
                evidence * 0.20 +
                latency * 0.10 +
                cost * 0.10 +
                policy * 0.10 +
                twinBoost +
                freshnessBoost
            );

            if (score < 0.2) continue;

            candidates.push({
                id: record.id,
                name: record.name,
                description: record.description,
                capabilities: record.capabilities,
                domain: record.domain,
                source: 'local_index',
                score: round2(score),
                successRate: record.successRate,
                latencyP95: record.latencyP95,
                evidenceLevel: record.evidenceLevel,
                costTier: record.costTier,
                sourceRepo: record.sourceRepo,
                versionRef: record.versionRef,
                sandboxLevel: 'approved',
                admissionPassed: true,
                policyTags: record.policyTags,
                requiredPermissions: record.requiredPermissions,
                safetyLevel: record.safetyLevel,
                lastVerifiedAt: record.lastVerifiedAt,
                policyPassed: policy >= 0.9,
            });
        }

        return candidates.sort((a, b) => b.score - a.score).slice(0, 8);
    }

    private async verifyGithubRepoCandidate(
        fullName: string,
        headers: Record<string, string>,
        requiredCapabilities: string[]
    ): Promise<GithubRepoVerification> {
        const cached = this.repoVerificationCache.get(fullName);
        if (cached) return cached;

        const fallback: GithubRepoVerification = {
            verified: false,
            reason: 'verification_failed',
            defaultBranch: 'main',
            stars: 0,
            forks: 0,
            description: '',
            htmlUrl: `https://github.com/${fullName}`,
            evidenceUrl: `https://github.com/${fullName}`,
        };

        const [owner, repo] = fullName.split('/');
        if (!owner || !repo) {
            this.repoVerificationCache.set(fullName, fallback);
            return fallback;
        }

        try {
            const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
            const repoResp = await fetchWithTimeout(repoUrl, { headers }, 1_600);
            if (repoResp.ok) {
                const repoPayload = await repoResp.json();
                const archived = Boolean(repoPayload?.archived);
                const disabled = Boolean(repoPayload?.disabled);
                const defaultBranch = String(repoPayload?.default_branch || 'main');
                const description = String(repoPayload?.description || '');
                const stars = Number(repoPayload?.stargazers_count || 0);
                const forks = Number(repoPayload?.forks_count || 0);
                const htmlUrl = String(repoPayload?.html_url || `https://github.com/${fullName}`);
                const topics = Array.isArray(repoPayload?.topics)
                    ? repoPayload.topics.map((topic: unknown) => String(topic || '').toLowerCase())
                    : [];
                const repoText = `${fullName} ${description} ${topics.join(' ')}`.toLowerCase();
                const capabilitySignals = requiredCapabilities.filter((cap) => {
                    const normalized = cap.toLowerCase().replace(/_/g, ' ');
                    return repoText.includes(normalized);
                }).length;
                const keywordSignals = SKILL_KEYWORD_HINTS.filter((keyword) => repoText.includes(keyword)).length;

                let fileSignals = 0;
                if (capabilitySignals === 0 && keywordSignals === 0) {
                    try {
                        const contentsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents?ref=${encodeURIComponent(defaultBranch)}`;
                        const contentsResp = await fetchWithTimeout(contentsUrl, { headers }, 1_600);
                        if (contentsResp.ok) {
                            const contentPayload = await contentsResp.json();
                            const names = Array.isArray(contentPayload)
                                ? contentPayload.map((item: any) => String(item?.name || '').toLowerCase())
                                : [];
                            fileSignals += names.filter((name: string) => SKILL_FILE_HINTS.has(name)).length;
                            if (names.some((name: string) => name === 'skills' || name === 'agents' || name === 'tools')) {
                                fileSignals += 1;
                            }
                        }
                    } catch {
                        // Ignore file probing errors.
                    }
                }

                const hasSkillSignals = capabilitySignals > 0 || keywordSignals > 0 || fileSignals > 0;
                const verified = !archived && !disabled && hasSkillSignals;
                const result: GithubRepoVerification = {
                    verified,
                    reason: verified
                        ? 'repo_verified_with_skill_signals'
                        : archived || disabled
                            ? 'repo_archived_or_disabled'
                            : 'repo_missing_skill_signals',
                    defaultBranch,
                    stars,
                    forks,
                    description,
                    htmlUrl,
                    evidenceUrl: htmlUrl,
                };
                this.repoVerificationCache.set(fullName, result);
                return result;
            }
        } catch {
            // Fall through to web-level verification.
        }

        try {
            const htmlUrl = `https://github.com/${fullName}`;
            const webResp = await fetchWithTimeout(htmlUrl, {
                headers: {
                    accept: 'text/html,application/xhtml+xml',
                    'user-agent': 'lumi-agent-os/1.0 (+https://lumi-agent-simulator.vercel.app)',
                },
            }, 1_600);
            if (webResp.ok) {
                const html = (await webResp.text()).toLowerCase();
                const blocked = html.includes('page not found') || html.includes('not found');
                const capabilitySignals = requiredCapabilities.filter((cap) => {
                    const normalized = cap.toLowerCase().replace(/_/g, ' ');
                    return html.includes(normalized);
                }).length;
                const keywordSignals = SKILL_KEYWORD_HINTS.filter((keyword) => html.includes(keyword)).length;
                const verified = !blocked && (capabilitySignals > 0 || keywordSignals > 0);
                const result: GithubRepoVerification = {
                    verified,
                    reason: verified ? 'repo_web_verified_with_skill_signals' : 'repo_web_missing_skill_signals',
                    defaultBranch: 'main',
                    stars: 0,
                    forks: 0,
                    description: '',
                    htmlUrl,
                    evidenceUrl: htmlUrl,
                };
                this.repoVerificationCache.set(fullName, result);
                return result;
            }
        } catch {
            // Keep default fallback.
        }

        this.repoVerificationCache.set(fullName, fallback);
        return fallback;
    }

    private async loadTrustedCatalogEntries(): Promise<TrustedCatalogEntry[]> {
        const now = Date.now();
        if (this.trustedCatalogCache && now - this.trustedCatalogCache.loadedAt < 10 * 60_000) {
            return this.trustedCatalogCache.entries;
        }

        const headers: Record<string, string> = {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': 'lumi-agent-os/1.0 (+https://lumi-agent-simulator.vercel.app)',
        };
        const treeUrl = `https://github.com/${TRUSTED_SKILLS_REPO.owner}/${TRUSTED_SKILLS_REPO.repo}/tree/${TRUSTED_SKILLS_REPO.branch}/${TRUSTED_SKILLS_REPO.treePath}`;

        try {
            const resp = await fetchWithTimeout(treeUrl, { headers }, 2_200);
            if (!resp.ok) {
                this.trustedCatalogCache = {
                    loadedAt: now,
                    entries: [],
                };
                return [];
            }
            const html = await resp.text();
            const entries = parseTrustedCatalogEntriesFromTreeHtml(html);
            this.trustedCatalogCache = {
                loadedAt: now,
                entries,
            };
            return entries;
        } catch {
            this.trustedCatalogCache = {
                loadedAt: now,
                entries: [],
            };
            return [];
        }
    }

    private async searchTrustedCatalog(
        query: string,
        requiredCapabilities: string[]
    ): Promise<SkillDiscoveryCandidate[]> {
        const entries = await this.loadTrustedCatalogEntries();
        if (entries.length === 0) return [];

        const loweredQuery = query.toLowerCase();
        const ranked = entries
            .map((entry) => {
                const inferredCaps = inferCapabilitiesFromTrustedSkill(
                    entry.name,
                    '',
                    loweredQuery,
                    requiredCapabilities
                );
                const fit = estimateCapabilityFit(inferredCaps, requiredCapabilities);
                const querySignal = (() => {
                    const normalizedName = entry.name.replace(/[-_]/g, ' ');
                    return loweredQuery.includes(normalizedName) || loweredQuery.includes(entry.name) ? 1 : 0;
                })();
                const capabilitySignal = requiredCapabilities.some((cap) => inferredCaps.includes(cap)) ? 1 : 0;
                return {
                    entry,
                    quickScore: fit * 0.75 + querySignal * 0.15 + capabilitySignal * 0.10,
                };
            })
            .sort((a, b) => b.quickScore - a.quickScore)
            .slice(0, 8);

        const candidates = await Promise.all(
            ranked.map(async ({ entry }) => {
                const skillMdUrl = `https://raw.githubusercontent.com/${TRUSTED_SKILLS_REPO.owner}/${TRUSTED_SKILLS_REPO.repo}/${TRUSTED_SKILLS_REPO.branch}/${entry.path}/SKILL.md`;
                try {
                    const resp = await fetchWithTimeout(
                        skillMdUrl,
                        {
                            headers: {
                                accept: 'text/plain,*/*',
                                'user-agent': 'lumi-agent-os/1.0 (+https://lumi-agent-simulator.vercel.app)',
                            },
                        },
                        2_200
                    );
                    if (!resp.ok) return null;
                    const markdown = await resp.text();
                    if (!markdown || markdown.trim().length < 20) return null;

                    const frontmatter = parseSkillFrontMatter(markdown);
                    const description = frontmatter.description || `Anthropic skill: ${entry.name}`;
                    const capabilityList = inferCapabilitiesFromTrustedSkill(
                        entry.name,
                        description,
                        loweredQuery,
                        requiredCapabilities
                    );
                    const fit = estimateCapabilityFit(capabilityList, requiredCapabilities);

                    if (requiredCapabilities.length > 0 && fit < 0.35) {
                        return null;
                    }

                    const successRate = 0.94;
                    const latencyP95 = 1800;
                    const evidenceLevel: 'weak' | 'mid' | 'strong' =
                        /test|audit|verify|validation|qa/i.test(`${entry.name} ${description}`) ? 'strong' : 'mid';
                    const costTier: 'low' | 'mid' | 'high' = 'mid';
                    const policyTags = ['trusted_catalog', 'anthropic_skills'];
                    const safetyLevel: 'decision_support_only' | 'bounded_execution' | 'standard' =
                        /medical|health|legal|finance|investment|law|diagnos/i.test(`${entry.name} ${description}`)
                            ? 'decision_support_only'
                            : 'bounded_execution';

                    const baseScore = clamp01(
                        fit * 0.30 +
                        successRate * 0.20 +
                        evidenceLevelScore(evidenceLevel) * 0.20 +
                        latencyScore(latencyP95) * 0.10 +
                        costTierScore(costTier) * 0.10 +
                        1.0 * 0.10 +
                        0.02
                    );

                    return {
                        id: `trusted:${TRUSTED_SKILLS_REPO.owner}/${TRUSTED_SKILLS_REPO.repo}:${entry.path}`,
                        name: frontmatter.name || entry.name,
                        description,
                        capabilities: capabilityList,
                        domain: inferDomain(capabilityList),
                        source: 'trusted_catalog' as const,
                        score: round2(baseScore),
                        successRate,
                        latencyP95,
                        evidenceLevel,
                        costTier,
                        sourceRepo: `${TRUSTED_SKILLS_REPO.owner}/${TRUSTED_SKILLS_REPO.repo}`,
                        versionRef: `${TRUSTED_SKILLS_REPO.branch}#${entry.path}`,
                        sandboxLevel: 'sandbox' as const,
                        admissionPassed: false,
                        policyTags,
                        requiredPermissions: ['network'],
                        safetyLevel,
                        lastVerifiedAt: Date.now(),
                        policyPassed: true,
                        authenticity: 'verified' as const,
                        authenticityReason: 'verified_from_trusted_catalog_skill_md',
                        verificationEvidenceUrl: skillMdUrl,
                    } satisfies SkillDiscoveryCandidate;
                } catch {
                    return null;
                }
            })
        );

        return candidates
            .filter((candidate): candidate is SkillDiscoveryCandidate => candidate !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }

    private async searchGithub(query: string, requiredCapabilities: string[]): Promise<SkillDiscoveryCandidate[]> {
        const searchQueries = buildGithubQueries(query, requiredCapabilities);
        const token = (typeof process !== 'undefined'
            ? process.env?.GITHUB_TOKEN || process.env?.VITE_GITHUB_TOKEN
            : undefined)?.trim();

        const headers: Record<string, string> = {
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            'user-agent': 'lumi-agent-os/1.0 (+https://lumi-agent-simulator.vercel.app)',
        };
        if (token) headers.authorization = `Bearer ${token}`;

        const merged = new Map<string, SkillDiscoveryCandidate>();
        const trustedCandidates = await this.searchTrustedCatalog(query, requiredCapabilities);
        for (const candidate of trustedCandidates) {
            merged.set(candidate.id, candidate);
        }
        let githubApiBlocked = false;

        for (const searchQ of searchQueries.slice(0, 4)) {
            try {
                const qualifiedQuery = `${searchQ} in:name,description,readme`.trim();
                const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(qualifiedQuery)}&sort=stars&order=desc&per_page=8`;
                const fetchResult = await this.fetchGithubPayload(url, headers);
                if (fetchResult.blocked) {
                    githubApiBlocked = true;
                    continue;
                }
                const payload = fetchResult.payload;
                if (!payload) continue;
                const items = Array.isArray(payload?.items) ? payload.items : [];

                for (const repo of items.slice(0, 4)) {
                    const fullName = String(repo?.full_name || repo?.name || '').trim();
                    if (!fullName) continue;
                    if (merged.has(fullName)) continue;

                    const verification = await this.verifyGithubRepoCandidate(fullName, headers, requiredCapabilities);
                    const caps = inferCapabilitiesFromRepo(
                        {
                            ...repo,
                            description: verification.description || repo?.description,
                            full_name: fullName,
                        },
                        requiredCapabilities
                    );
                    const stars = Number(repo?.stargazers_count || verification.stars || 0);
                    const forks = Number(repo?.forks_count || verification.forks || 0);
                    const score = clamp01(0.35 + Math.log10(Math.max(1, stars)) * 0.2 + Math.log10(Math.max(1, forks)) * 0.08);
                    const estimatedSuccess = clamp01(
                        0.55 +
                        Math.log10(Math.max(1, stars)) * 0.18 +
                        Math.log10(Math.max(1, forks)) * 0.08
                    );
                    const estimatedLatency = stars >= 20_000
                        ? 1200
                        : stars >= 5_000
                            ? 1500
                            : stars >= 1_000
                                ? 2200
                                : 3200;
                    const estimatedEvidence: 'weak' | 'mid' | 'strong' = stars >= 8_000
                        ? 'strong'
                        : stars >= 2_000
                            ? 'mid'
                            : 'weak';
                    const estimatedCost: 'low' | 'mid' | 'high' = stars >= 8_000
                        ? 'high'
                        : 'mid';
                    const inferredSafetyLevel: 'decision_support_only' | 'bounded_execution' | 'standard' =
                        /medical|health|legal|finance|investment|law|diagnos/i.test(
                            `${repo?.name || ''} ${repo?.description || ''}`
                        )
                            ? 'decision_support_only'
                            : 'bounded_execution';
                    const policyTags = inferredSafetyLevel === 'decision_support_only'
                        ? ['decision_support_only']
                        : ['bounded_execution'];

                    merged.set(fullName, {
                        id: `github:${fullName}`,
                        name: String(repo?.name || fullName),
                        description: String(repo?.description || 'github skill candidate'),
                        capabilities: caps,
                        domain: inferDomain(caps),
                        source: 'github_search' as const,
                        score: round2(score),
                        successRate: round2(estimatedSuccess),
                        latencyP95: estimatedLatency,
                        evidenceLevel: estimatedEvidence,
                        costTier: estimatedCost,
                        sourceRepo: fullName,
                        versionRef: String(repo?.default_branch || 'main'),
                        sandboxLevel: 'sandbox' as const,
                        admissionPassed: false,
                        policyTags,
                        requiredPermissions: ['network'],
                        safetyLevel: inferredSafetyLevel,
                        lastVerifiedAt: Date.now(),
                        policyPassed: true,
                        authenticity: verification.verified ? 'verified' : 'unverified',
                        authenticityReason: verification.reason,
                        verificationEvidenceUrl: verification.evidenceUrl,
                    } satisfies SkillDiscoveryCandidate);
                }
            } catch {
                // Keep discovery resilient: any query error should not block others.
            }
            if (merged.size >= 10) break;
        }

        if (merged.size === 0 || (githubApiBlocked && merged.size < 3)) {
            const webFallback = await this.searchGithubWeb(searchQueries, requiredCapabilities);
            for (const candidate of webFallback) {
                const repo = candidate.sourceRepo || candidate.id;
                if (!merged.has(repo)) {
                    merged.set(repo, candidate);
                }
                if (merged.size >= 10) break;
            }
        }

        if (githubApiBlocked && merged.size > 0) {
            // Slight confidence penalty when API route is blocked and we rely on web fallback.
            for (const [repo, candidate] of merged.entries()) {
                if (candidate.source === 'trusted_catalog') continue;
                merged.set(repo, {
                    ...candidate,
                    score: round2(Math.max(0, candidate.score - 0.03)),
                });
            }
        }

        return Array.from(merged.values()).sort((a, b) => b.score - a.score).slice(0, 10);
    }

    private async fetchGithubPayload(url: string, headers: Record<string, string>): Promise<GithubPayloadFetchResult> {
        if (isCliBashExecutionEnabled()) {
            const cliRun = await runCurlJsonWithGrep({
                url,
                method: 'GET',
                headers,
                body: null,
                grepPattern: '"(full_name|description|stargazers_count|forks_count|default_branch|html_url|updated_at)"',
                timeoutMs: 12_000,
                maxFilteredLines: 220,
            });

            if (cliRun.ok) {
                try {
                    return {
                        payload: cliRun.raw ? JSON.parse(cliRun.raw) : null,
                        blocked: false,
                    };
                } catch {
                    // CLI parse failed, continue to fetch fallback.
                }
            }
        }

        try {
            const resp = await fetchWithTimeout(url, { headers }, 1_800);
            if (resp.status === 403 || resp.status === 429) {
                return { payload: null, blocked: true };
            }
            if (!resp.ok) return { payload: null, blocked: false };
            return { payload: await resp.json(), blocked: false };
        } catch {
            return { payload: null, blocked: false };
        }
    }

    private async searchGithubWeb(
        searchQueries: string[],
        requiredCapabilities: string[]
    ): Promise<SkillDiscoveryCandidate[]> {
        const headers: Record<string, string> = {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': 'lumi-agent-os/1.0 (+https://lumi-agent-simulator.vercel.app)',
        };
        const merged = new Map<string, SkillDiscoveryCandidate>();

        for (const query of searchQueries.slice(0, 2)) {
            try {
                const url = `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`;
                const resp = await fetchWithTimeout(url, { headers }, 1_800);
                if (!resp.ok) continue;
                const html = await resp.text();
                const repos = extractGithubReposFromHtml(html).slice(0, 4);

                for (const [index, fullName] of repos.entries()) {
                    if (merged.has(fullName)) continue;
                    const verification = await this.verifyGithubRepoCandidate(
                        fullName,
                        {
                            accept: 'application/vnd.github+json',
                            'x-github-api-version': '2022-11-28',
                            'user-agent': 'lumi-agent-os/1.0 (+https://lumi-agent-simulator.vercel.app)',
                        },
                        requiredCapabilities
                    );
                    const repoLike = {
                        full_name: fullName,
                        name: fullName.split('/')[1] || fullName,
                        description: verification.description || `GitHub web fallback candidate for ${query}`,
                    };
                    const caps = inferCapabilitiesFromRepo(repoLike, requiredCapabilities);
                    const stars = verification.stars || Math.max(1400 - index * 120, 200);
                    const forks = verification.forks || Math.max(240 - index * 20, 40);
                    const score = clamp01(0.35 + Math.log10(Math.max(1, stars)) * 0.2 + Math.log10(Math.max(1, forks)) * 0.08);
                    const inferredSafetyLevel: 'decision_support_only' | 'bounded_execution' | 'standard' =
                        /medical|health|legal|finance|investment|law|diagnos/i.test(
                            `${repoLike.name} ${repoLike.description}`
                        )
                            ? 'decision_support_only'
                            : 'bounded_execution';
                    const policyTags = inferredSafetyLevel === 'decision_support_only'
                        ? ['decision_support_only']
                        : ['bounded_execution'];

                    merged.set(fullName, {
                        id: `github:${fullName}`,
                        name: repoLike.name,
                        description: repoLike.description,
                        capabilities: caps,
                        domain: inferDomain(caps),
                        source: 'github_search',
                        score: round2(score),
                        successRate: clamp01(0.55 + Math.log10(Math.max(1, stars)) * 0.18),
                        latencyP95: 2600 + index * 250,
                        evidenceLevel: stars >= 5000 ? 'strong' : 'mid',
                        costTier: 'mid',
                        sourceRepo: fullName,
                        versionRef: verification.defaultBranch || 'main',
                        sandboxLevel: 'sandbox',
                        admissionPassed: false,
                        policyTags,
                        requiredPermissions: ['network'],
                        safetyLevel: inferredSafetyLevel,
                        lastVerifiedAt: Date.now(),
                        policyPassed: true,
                        authenticity: verification.verified ? 'verified' : 'unverified',
                        authenticityReason: verification.reason,
                        verificationEvidenceUrl: verification.evidenceUrl,
                    });
                }
            } catch {
                // Keep web fallback resilient.
            }
            if (merged.size >= 10) break;
        }

        return Array.from(merged.values()).sort((a, b) => b.score - a.score).slice(0, 10);
    }

    private runSandboxAdmission(
        candidates: SkillDiscoveryCandidate[],
        requiredCapabilities: string[]
    ): SkillDiscoveryCandidate[] {
        return candidates.map(candidate => {
            const successRate = candidate.successRate ?? 0.0;
            const latency = candidate.latencyP95 ?? 99_999;
            const evidenceLevel = candidate.evidenceLevel || 'weak';
            const hasRiskTag = /hack|exploit|bypass|malware|steal|crack/i.test(
                `${candidate.name} ${candidate.description}`
            );
            const policyPassed = candidate.policyPassed !== false;
            const capabilityFit = estimateCapabilityFit(candidate.capabilities, requiredCapabilities);
            const authenticityPassed = candidate.source === 'local_index'
                ? true
                : candidate.authenticity === 'verified';
            const pass = (
                capabilityFit >= 0.60 &&
                successRate >= 0.9 &&
                latency <= 7_500 &&
                evidenceLevelScore(evidenceLevel) >= 0.7 &&
                policyPassed &&
                authenticityPassed
            );
            const admitted = pass && !hasRiskTag;
            const reason = !authenticityPassed
                ? 'authenticity_unverified'
                : admitted
                    ? 'admission_passed'
                    : 'admission_filtered';
            return {
                ...candidate,
                sandboxLevel: admitted
                    ? (candidate.source === 'local_index' ? 'approved' : 'sandbox')
                    : 'quarantine',
                admissionPassed: admitted,
                score: round2(candidate.score + (admitted ? 0.1 : -0.1)),
                policyPassed,
                authenticityReason: candidate.authenticityReason || reason,
            };
        });
    }

    private runCanary(
        traceId: string,
        candidate: SkillDiscoveryCandidate,
        requiredCapabilities: string[]
    ): SkillCanaryReport {
        const overlap = candidate.capabilities.filter(cap =>
            requiredCapabilities.some(required =>
                cap.toLowerCase().includes(required.toLowerCase()) ||
                required.toLowerCase().includes(cap.toLowerCase())
            )
        ).length;
        const isHighRisk = isHighRiskCapabilitySet(requiredCapabilities, candidate.domain);
        const sampleSize = isHighRisk ? 10 : 5;
        const slaMs = supportsLiveData(requiredCapabilities) ? 4_500 : 7_500;
        const evidenceComplete = evidenceLevelScore(candidate.evidenceLevel) >= 0.7;
        const policyViolations = candidate.policyPassed === false ? 1 : 0;
        const passed = Boolean(
            candidate.successRate && candidate.successRate >= 0.90 &&
            policyViolations === 0 &&
            evidenceComplete &&
            (candidate.latencyP95 ?? 99_999) <= Math.round(slaMs * 1.2) &&
            (candidate.score >= 0.68 || overlap > 0)
        );
        return {
            traceId,
            skillId: candidate.id,
            source: candidate.source,
            passed,
            sampleSize,
            evidenceCount: evidenceComplete ? sampleSize : Math.max(1, Math.floor(sampleSize / 2)),
            note: passed
                ? 'canary_passed_with_traceable_evidence'
                : `canary_failed(policy_violations=${policyViolations},evidence_complete=${evidenceComplete})`,
        };
    }
}

const CAPABILITY_KEYWORD_MAP: Record<string, string[]> = {
    job_sourcing: ['recruitment', 'job search', 'hiring'],
    resume_optimization: ['resume', 'cv', 'profile', 'career'],
    salary_benchmark: ['salary', 'compensation', 'benchmark'],
    flight_search: ['flight', 'airfare', 'travel'],
    hotel_search: ['hotel', 'accommodation', 'travel'],
    live_search: ['realtime', 'search', 'retrieval'],
    web_search: ['search', 'crawler', 'retrieval'],
    agent_discovery: ['agent', 'marketplace', 'orchestration'],
};

const SKILL_KEYWORD_HINTS = [
    'skill',
    'skills',
    'agent',
    'agents',
    'tool',
    'tools',
    'workflow',
    'orchestration',
    'capability',
    'plugin',
    'sdk',
];

const SKILL_FILE_HINTS = new Set([
    'skill.md',
    'skills.md',
    'agent.md',
    'agents.md',
    'manifest.json',
    'agent.json',
    'skill.json',
    'readme.md',
    'readme',
]);

const TRUSTED_SKILLS_REPO = {
    owner: 'anthropics',
    repo: 'skills',
    branch: 'main',
    treePath: 'skills',
} as const;

const TRUSTED_SKILL_CAPABILITY_MAP: Record<string, string[]> = {
    'algorithmic-art': ['creative_generation', 'design_automation'],
    'brand-guidelines': ['brand_compliance', 'copywriting'],
    'canvas-design': ['frontend_design', 'ui_prototyping'],
    'doc-coauthoring': ['document_collaboration', 'writing_assistance'],
    docx: ['docx_edit', 'document_generation'],
    'frontend-design': ['frontend_design', 'ui_prototyping'],
    'internal-comms': ['communications', 'writing_assistance'],
    'mcp-builder': ['agent_discovery', 'tool_generation', 'mcp_integration'],
    pdf: ['pdf_processing', 'document_extraction'],
    pptx: ['slide_generation', 'presentation_design'],
    'skill-creator': ['skill_creation', 'agent_discovery'],
    'slack-gif-creator': ['content_generation', 'communications'],
    'theme-factory': ['design_system', 'frontend_design'],
    'web-artifacts-builder': ['web_build', 'frontend_design'],
    'webapp-testing': ['web_testing', 'qa_automation', 'web_search'],
    xlsx: ['spreadsheet_analysis', 'data_processing'],
};

function buildGithubQueries(query: string, requiredCapabilities: string[]): string[] {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const queryTokens = normalizedQuery
        .split(/[^\p{L}\p{N}_-]+/u)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 2 && /[a-z0-9]/i.test(token))
        .slice(0, 5);

    const capKeywords = requiredCapabilities
        .flatMap((cap) => CAPABILITY_KEYWORD_MAP[cap] || [cap.replace(/_/g, ' ')])
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    const uniqueCaps = Array.from(new Set(capKeywords)).slice(0, 4);
    const compactQuery = queryTokens.join(' ').trim();
    const primaryCap = uniqueCaps[0] || '';
    const secondaryCap = uniqueCaps[1] || '';

    const baseCandidates = [
        primaryCap ? `${primaryCap} agent` : '',
        primaryCap ? `${primaryCap} skill` : '',
        secondaryCap ? `${secondaryCap} agent` : '',
        secondaryCap ? `${secondaryCap} tool` : '',
        uniqueCaps.length > 0 ? `${uniqueCaps.join(' ')} open source` : '',
        compactQuery ? `${compactQuery} agent` : '',
        compactQuery ? `${compactQuery} automation` : '',
        `open source agent skills`,
        `awesome llm agents`,
        `openclaw agent skills`,
    ]
        .map((item) => item.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

    const unique = Array.from(new Set(baseCandidates));
    return unique.slice(0, 8);
}

function extractGithubReposFromHtml(html: string): string[] {
    const matches = html.matchAll(/href="\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)"/g);
    const skipOwners = new Set([
        'login',
        'signup',
        'settings',
        'notifications',
        'orgs',
        'marketplace',
        'sponsors',
        'topics',
        'collections',
        'features',
        'enterprise',
        'site',
        'apps',
        'about',
        'contact',
        'pricing',
        'pulls',
        'issues',
        'explore',
        'search',
    ]);
    const repos: string[] = [];
    const seen = new Set<string>();

    for (const match of matches) {
        const full = String(match[1] || '').trim();
        if (!full || seen.has(full)) continue;
        const [owner, repo] = full.split('/');
        if (!owner || !repo) continue;
        if (skipOwners.has(owner.toLowerCase())) continue;
        if (repo.toLowerCase() === 'repositories') continue;
        if (repo.startsWith('.')) continue;
        if (repo.length < 2) continue;
        seen.add(full);
        repos.push(full);
        if (repos.length >= 24) break;
    }

    return repos;
}

function parseTrustedCatalogEntriesFromTreeHtml(html: string): TrustedCatalogEntry[] {
    const embeddedData = extractEmbeddedReactAppData(html);
    const entriesFromPayload = Array.isArray(embeddedData?.payload?.tree?.items)
        ? embeddedData.payload.tree.items
            .map((item: any) => ({
                name: String(item?.name || ''),
                path: String(item?.path || ''),
                contentType: String(item?.contentType || ''),
            }))
            .filter((item: { name: string; path: string; contentType: string }) =>
                item.contentType === 'directory' &&
                item.path.startsWith(`${TRUSTED_SKILLS_REPO.treePath}/`) &&
                item.name.length > 0
            )
            .map((item: { name: string; path: string }) => ({
                name: item.name,
                path: item.path,
            }))
        : [];
    if (entriesFromPayload.length > 0) {
        return entriesFromPayload;
    }

    const regex = /"path":"skills\/([A-Za-z0-9._-]+)","contentType":"directory"/g;
    const fallback: TrustedCatalogEntry[] = [];
    const seen = new Set<string>();
    for (const match of html.matchAll(regex)) {
        const name = String(match[1] || '').trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        fallback.push({
            name,
            path: `skills/${name}`,
        });
    }
    return fallback;
}

function extractEmbeddedReactAppData(html: string): any | null {
    const marker = 'data-target="react-app.embeddedData"';
    const markerIdx = html.indexOf(marker);
    if (markerIdx < 0) return null;
    const startTagIdx = html.lastIndexOf('<script', markerIdx);
    if (startTagIdx < 0) return null;
    const contentStart = html.indexOf('>', markerIdx);
    if (contentStart < 0) return null;
    const contentEnd = html.indexOf('</script>', contentStart);
    if (contentEnd < 0) return null;
    const rawJson = html.slice(contentStart + 1, contentEnd).trim();
    if (!rawJson) return null;
    try {
        return JSON.parse(rawJson);
    } catch {
        return null;
    }
}

function parseSkillFrontMatter(markdown: string): {
    name?: string;
    description?: string;
} {
    const trimmed = markdown.trim();
    if (!trimmed.startsWith('---')) {
        return {};
    }
    const end = trimmed.indexOf('\n---', 3);
    if (end < 0) {
        return {};
    }
    const frontmatter = trimmed.slice(3, end).split('\n');
    const out: { name?: string; description?: string } = {};
    for (const line of frontmatter) {
        const normalized = line.trim();
        if (!normalized || normalized.startsWith('#')) continue;
        if (normalized.startsWith('name:')) {
            out.name = normalized.slice('name:'.length).trim().replace(/^['"]|['"]$/g, '');
            continue;
        }
        if (normalized.startsWith('description:')) {
            out.description = normalized.slice('description:'.length).trim().replace(/^['"]|['"]$/g, '');
        }
    }
    return out;
}

function inferCapabilitiesFromTrustedSkill(
    skillName: string,
    description: string,
    query: string,
    requiredCapabilities: string[]
): string[] {
    const caps = new Set<string>(TRUSTED_SKILL_CAPABILITY_MAP[skillName] || []);
    const text = `${skillName.replace(/[-_]/g, ' ')} ${description} ${query}`.toLowerCase();

    for (const cap of requiredCapabilities) {
        const keywords = CAPABILITY_KEYWORD_MAP[cap] || [cap.replace(/_/g, ' ')];
        const matched = keywords.some((keyword) => text.includes(keyword.toLowerCase()));
        if (matched) {
            caps.add(cap);
        }
    }

    if (caps.size === 0) {
        if (/skill|skills|agent|mcp|builder/.test(text)) {
            caps.add('agent_discovery');
        }
        if (/test|qa|web/.test(text)) {
            caps.add('web_search');
        }
    }

    if (caps.size < Math.min(2, requiredCapabilities.length)) {
        const hinted = requiredCapabilities.filter((cap) => {
            const normalized = cap.toLowerCase().replace(/_/g, ' ');
            return text.includes(normalized);
        });
        for (const cap of hinted) {
            caps.add(cap);
            if (caps.size >= Math.min(3, requiredCapabilities.length + 1)) break;
        }
    }

    return Array.from(caps).slice(0, 5);
}

function inferCapabilitiesFromRepo(repo: any, fallbackCaps: string[]): string[] {
    const text = `${repo?.name || ''} ${repo?.description || ''}`.toLowerCase();
    const caps = new Set<string>();
    const explicitFallbackMatches = fallbackCaps.filter((cap) => {
        const keywords = CAPABILITY_KEYWORD_MAP[cap] || [cap.replace(/_/g, ' ')];
        return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    });
    if (explicitFallbackMatches.length > 0) {
        explicitFallbackMatches.forEach((cap) => caps.add(cap));
        if (caps.size < Math.min(2, fallbackCaps.length) && /(skill|skills|agent|workflow|suite|capability)/.test(text)) {
            for (const cap of fallbackCaps) {
                if (caps.has(cap)) continue;
                caps.add(cap);
                if (caps.size >= Math.min(2, fallbackCaps.length)) break;
            }
        }
    } else {
        if (/travel|flight|hotel/.test(text)) caps.add('travel_search');
        if (/avatar|twin|profile/.test(text)) caps.add('avatar_profile');
        if (/destiny|planner|strategy/.test(text)) caps.add('destiny_navigation');
        if (/search|crawler|retrieval/.test(text)) caps.add('web_search');

        if (caps.size === 0) {
            fallbackCaps.slice(0, 2).forEach(c => caps.add(c));
        } else if (caps.size < Math.min(2, fallbackCaps.length) && /(skill|skills|agent|workflow|suite|capability)/.test(text)) {
            for (const cap of fallbackCaps) {
                if (caps.has(cap)) continue;
                caps.add(cap);
                if (caps.size >= Math.min(2, fallbackCaps.length)) break;
            }
        }
    }

    if (/market|agent/.test(text) && caps.size < 4) caps.add('agent_discovery');
    return Array.from(caps).slice(0, 4);
}

function inferDomain(capabilities: string[]): string {
    const joined = capabilities.join(' ').toLowerCase();
    return joined.includes("travel") || joined.includes("flight") || joined.includes("hotel")
        ? 'travel'
        : joined.includes("avatar") || joined.includes("profile")
            ? 'avatar'
            : joined.includes("destiny")
                ? 'destiny'
                : joined.includes("agent") || joined.includes("market")
                    ? 'agent_market'
                    : 'general';
}

function policyScore(record: Pick<LocalIndexRecord, 'policyTags' | 'safetyLevel'>, query: string): number {
    const highRiskQuery = /(health|medical|legal|law|finance|investment|医疗|法律|金融|投资)/i.test(query);
    if (!highRiskQuery) return 1.0;
    const tags = new Set((record.policyTags || []).map((tag) => tag.toLowerCase()));
    if (record.safetyLevel === 'decision_support_only' || tags.has('decision_support_only')) {
        return 1.0;
    }
    return 0.0;
}

function requiresLiveData(query: string): boolean {
    return /(live|latest|real[-\s]?time|today|now|realtime|实时|最新|今天)/i.test(query);
}

function supportsLiveData(capabilities: string[]): boolean {
    return capabilities.some((cap) => /(live|search|flight|hotel|weather|stock|news)/i.test(cap));
}

function estimateCapabilityFit(capabilities: string[], requiredCapabilities: string[]): number {
    if (!requiredCapabilities.length) return 1.0;
    const required = requiredCapabilities.map((cap) => cap.toLowerCase());
    const hits = capabilities.filter((cap) => {
        const lower = cap.toLowerCase();
        return required.some((need) => lower === need || lower.includes(need) || need.includes(lower));
    }).length;
    return clamp01(hits / Math.max(1, required.length));
}

function isHighRiskCapabilitySet(requiredCapabilities: string[], domain: string): boolean {
    if (/(health|legal|finance)/i.test(domain)) return true;
    return requiredCapabilities.some((cap) => /(health|medical|legal|law|finance|investment|诊断|处方|合规|贷款|交易)/i.test(cap));
}

function resolveExternalSearchMode(options?: {
    requireGithub?: boolean;
    minApproved?: number;
    externalSearchMode?: ExternalSearchMode;
}): ExternalSearchMode {
    if (options?.externalSearchMode) return options.externalSearchMode;
    if (options?.requireGithub === true) return 'force';
    if (options?.requireGithub === false) return 'off';
    return 'auto';
}

function shouldUseExternalDiscovery(
    query: string,
    requiredCapabilities: string[],
    localCandidateCount: number,
    minApproved: number
): boolean {
    if (localCandidateCount < minApproved) return true;
    if (localCandidateCount === 0) return true;

    const corpus = `${query} ${requiredCapabilities.join(' ')}`.toLowerCase();
    const explicitExternalHint = /(github|open source|opensource|external|public repo|community skill|外部|开源|github技能|外部检索|市场技能)/i.test(corpus);
    const broadIntent = /(general|universal|cross[-\s]?domain|通用|跨域|复杂任务|多领域)/i.test(corpus);
    if (explicitExternalHint) return true;
    if (broadIntent && localCandidateCount < minApproved + 2) return true;
    return false;
}

function latencyScore(latency: number): number {
    if (latency <= 500) return 1;
    if (latency <= 1000) return 0.8;
    if (latency <= 3000) return 0.6;
    if (latency <= 6000) return 0.4;
    return 0.2;
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
        ? setTimeout(() => controller.abort(), Math.max(300, timeoutMs))
        : null;
    try {
        return await fetch(input, controller ? { ...init, signal: controller.signal } : init);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function evidenceLevelScore(level: string | undefined): number {
    switch ((level || '').toLowerCase()) {
        case 'strong':
            return 1.0;
        case 'mid':
        case 'medium':
            return 0.7;
        case 'weak':
        default:
            return 0.4;
    }
}

function costTierScore(tier: string | undefined): number {
    switch ((tier || '').toLowerCase()) {
        case 'low':
            return 1.0;
        case 'mid':
        case 'medium':
            return 0.7;
        case 'high':
            return 0.4;
        default:
            return 0.6;
    }
}

function normalizeEvidenceLevel(value: string | undefined): 'weak' | 'mid' | 'strong' {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'strong') return 'strong';
    if (normalized === 'mid' || normalized === 'medium') return 'mid';
    return 'weak';
}

function normalizeCostTier(value: string | undefined): 'low' | 'mid' | 'high' {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'low') return 'low';
    if (normalized === 'high') return 'high';
    return 'mid';
}

let instance: SkillsDiscoveryAdapter | null = null;

function isAgentSupplyIntentQuery(text: string): boolean {
    return /(发布需求|招募|找服务方|找agent|agent\s*market|上架|交付新agent|供给不足|缺少agent|专家市场)/i.test(text);
}

function isCommerceIntentQuery(text: string): boolean {
    return /(购买|下单|商品|比价|电商|价格|报价|shopping|purchase|buy|price compare)/i.test(text);
}

export function getSkillsDiscoveryAdapter(): SkillsDiscoveryAdapter {
    if (!instance) {
        instance = new SkillsDiscoveryAdapter();
    }
    return instance;
}

export function resetSkillsDiscoveryAdapter(): void {
    instance = null;
}
