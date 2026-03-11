import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSkillsDiscoveryAdapter, resetSkillsDiscoveryAdapter } from '../services/skillsDiscoveryAdapter';

const TRUSTED_CATALOG_HTML = `<script type="application/json" data-target="react-app.embeddedData">{"payload":{"tree":{"items":[{"name":"webapp-testing","path":"skills/webapp-testing","contentType":"directory"},{"name":"mcp-builder","path":"skills/mcp-builder","contentType":"directory"}]}}}</script>`;
const TRUSTED_SKILL_WEBAPP_TESTING = `---
name: webapp-testing
description: Validate web app flows and test automation results.
---
# webapp-testing
`;
const TRUSTED_SKILL_MCP_BUILDER = `---
name: mcp-builder
description: Build MCP servers and capability orchestration tools.
---
# mcp-builder
`;

describe('skills discovery github admission', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        resetSkillsDiscoveryAdapter();
    });

    it('admits high-quality github skills after sandbox gate', async () => {
        const originalFetch = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;
            if (url.startsWith('https://github.com/anthropics/skills/tree/main/skills')) {
                return new Response(TRUSTED_CATALOG_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md') {
                return new Response(TRUSTED_SKILL_WEBAPP_TESTING, { status: 200, headers: { 'content-type': 'text/plain' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/mcp-builder/SKILL.md') {
                return new Response(TRUSTED_SKILL_MCP_BUILDER, { status: 200, headers: { 'content-type': 'text/plain' } });
            }

            if (url.startsWith('https://api.github.com/search/repositories')) {
                return new Response(JSON.stringify({
                    items: [
                        {
                            full_name: 'openclaw/find-skills-recruitment',
                            name: 'find-skills-recruitment',
                            description: 'Skill pack for recruiting workflow',
                            stargazers_count: 52000,
                            forks_count: 4100,
                            default_branch: 'main',
                        },
                    ],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            if (url.startsWith('https://api.github.com/repos/openclaw/find-skills-recruitment')) {
                return new Response(JSON.stringify({
                    full_name: 'openclaw/find-skills-recruitment',
                    default_branch: 'main',
                    description: 'Recruitment agent skill pack',
                    stargazers_count: 52000,
                    forks_count: 4100,
                    html_url: 'https://github.com/openclaw/find-skills-recruitment',
                    archived: false,
                    disabled: false,
                    topics: ['skills', 'agent', 'recruitment'],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }

            return originalFetch(input as any, init);
        });

        const result = await getSkillsDiscoveryAdapter().discoverSkills(
            '招聘后端工程师并优化简历',
            ['job_sourcing', 'resume_optimization'],
            { requireGithub: true, minApproved: 1 }
        );

        expect(result.githubCandidates.length).toBeGreaterThan(0);
        expect(
            result.approvedCandidates.some((candidate) => candidate.source === 'github_search' && candidate.admissionPassed)
        ).toBe(true);
        expect(result.canaryReports.length).toBeGreaterThan(0);
        expect(result.promotionRecords.some((record) => record.promoted)).toBe(true);
    });

    it('auto mode still triggers external discovery when local fit is insufficient', async () => {
        const originalFetch = globalThis.fetch.bind(globalThis);
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;
            if (url.startsWith('https://github.com/anthropics/skills/tree/main/skills')) {
                return new Response(TRUSTED_CATALOG_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md') {
                return new Response(TRUSTED_SKILL_WEBAPP_TESTING, { status: 200, headers: { 'content-type': 'text/plain' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/mcp-builder/SKILL.md') {
                return new Response(TRUSTED_SKILL_MCP_BUILDER, { status: 200, headers: { 'content-type': 'text/plain' } });
            }

            if (url.startsWith('https://api.github.com/search/repositories')) {
                return new Response(JSON.stringify({
                    items: [
                        {
                            full_name: 'openclaw/quantum-planner-skill',
                            name: 'quantum-planner-skill',
                            description: 'Open source skill for quantum planning workflows',
                            stargazers_count: 18000,
                            forks_count: 900,
                            default_branch: 'main',
                        },
                    ],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            if (url.startsWith('https://api.github.com/repos/openclaw/quantum-planner-skill')) {
                return new Response(JSON.stringify({
                    full_name: 'openclaw/quantum-planner-skill',
                    default_branch: 'main',
                    description: 'Cross-domain orchestration skill',
                    stargazers_count: 18000,
                    forks_count: 900,
                    html_url: 'https://github.com/openclaw/quantum-planner-skill',
                    archived: false,
                    disabled: false,
                    topics: ['agent', 'skills', 'orchestration'],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }

            return originalFetch(input as any, init);
        });

        const result = await getSkillsDiscoveryAdapter().discoverSkills(
            'Need external open source skill for xqzv capability workflows',
            ['xqzvcapability77'],
            { minApproved: 1 }
        );

        expect(fetchSpy).toHaveBeenCalled();
        expect(result.githubCandidates.length).toBeGreaterThan(0);
        expect(
            result.githubCandidates.some((candidate) =>
                candidate.id.includes('quantum-planner-skill')
            )
        ).toBe(true);
    });

    it('falls back to github web search when github api is blocked (403)', async () => {
        const originalFetch = globalThis.fetch.bind(globalThis);
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;
            if (url.startsWith('https://github.com/anthropics/skills/tree/main/skills')) {
                return new Response(TRUSTED_CATALOG_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md') {
                return new Response(TRUSTED_SKILL_WEBAPP_TESTING, { status: 200, headers: { 'content-type': 'text/plain' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/mcp-builder/SKILL.md') {
                return new Response(TRUSTED_SKILL_MCP_BUILDER, { status: 200, headers: { 'content-type': 'text/plain' } });
            }

            if (url.startsWith('https://api.github.com/search/repositories')) {
                return new Response(JSON.stringify({
                    message: 'API rate limit exceeded',
                }), { status: 403, headers: { 'content-type': 'application/json' } });
            }
            if (url.startsWith('https://api.github.com/repos/openclaw/openclaw')) {
                return new Response(JSON.stringify({
                    full_name: 'openclaw/openclaw',
                    default_branch: 'main',
                    description: 'OpenClaw agent orchestration skills',
                    stargazers_count: 12000,
                    forks_count: 1100,
                    html_url: 'https://github.com/openclaw/openclaw',
                    archived: false,
                    disabled: false,
                    topics: ['agent', 'skills'],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            if (url.startsWith('https://api.github.com/repos/langchain-ai/langchain')) {
                return new Response(JSON.stringify({
                    full_name: 'langchain-ai/langchain',
                    default_branch: 'master',
                    description: 'Building applications with LLMs through composability',
                    stargazers_count: 98000,
                    forks_count: 15000,
                    html_url: 'https://github.com/langchain-ai/langchain',
                    archived: false,
                    disabled: false,
                    topics: ['agent', 'tooling'],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            if (url.startsWith('https://api.github.com/repos/microsoft/autogen')) {
                return new Response(JSON.stringify({
                    full_name: 'microsoft/autogen',
                    default_branch: 'main',
                    description: 'A framework for building AI agents',
                    stargazers_count: 45000,
                    forks_count: 6000,
                    html_url: 'https://github.com/microsoft/autogen',
                    archived: false,
                    disabled: false,
                    topics: ['agents', 'orchestration'],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }

            if (url.startsWith('https://github.com/search')) {
                return new Response(
                    [
                        '<html><body>',
                        '<a href="/openclaw/openclaw">openclaw/openclaw</a>',
                        '<a href="/langchain-ai/langchain">langchain-ai/langchain</a>',
                        '<a href="/microsoft/autogen">microsoft/autogen</a>',
                        '</body></html>',
                    ].join(''),
                    { status: 200, headers: { 'content-type': 'text/html' } }
                );
            }

            return originalFetch(input as any, init);
        });

        const result = await getSkillsDiscoveryAdapter().discoverSkills(
            'Need external cross-domain skill orchestration',
            ['agent_discovery', 'web_search'],
            { requireGithub: true, minApproved: 1 }
        );

        expect(fetchSpy).toHaveBeenCalled();
        expect(result.githubCandidates.length).toBeGreaterThan(0);
        expect(
            result.githubCandidates.some((candidate) => candidate.id.includes('openclaw/openclaw'))
        ).toBe(true);
        expect(
            result.githubCandidates.some((candidate) => candidate.source === 'github_search' && candidate.sandboxLevel !== 'quarantine')
        ).toBe(true);
    });

    it('prioritizes anthropics trusted catalog skills when capability fits', async () => {
        const originalFetch = globalThis.fetch.bind(globalThis);
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : (input as Request).url;
            if (url.startsWith('https://github.com/anthropics/skills/tree/main/skills')) {
                return new Response(TRUSTED_CATALOG_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md') {
                return new Response(TRUSTED_SKILL_WEBAPP_TESTING, { status: 200, headers: { 'content-type': 'text/plain' } });
            }
            if (url === 'https://raw.githubusercontent.com/anthropics/skills/main/skills/mcp-builder/SKILL.md') {
                return new Response(TRUSTED_SKILL_MCP_BUILDER, { status: 200, headers: { 'content-type': 'text/plain' } });
            }
            if (url.startsWith('https://api.github.com/search/repositories')) {
                return new Response(JSON.stringify({ items: [] }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }
            return originalFetch(input as any, init);
        });

        const result = await getSkillsDiscoveryAdapter().discoverSkills(
            'Need a trusted skill to test web app checkout flow with automation',
            ['qa_automation', 'web_search'],
            { requireGithub: true, minApproved: 1 }
        );

        expect(fetchSpy).toHaveBeenCalled();
        expect(
            result.githubCandidates.some((candidate) => candidate.source === 'trusted_catalog')
        ).toBe(true);
        expect(
            result.githubCandidates.some((candidate) =>
                candidate.id.includes('anthropics/skills:skills/webapp-testing')
            )
        ).toBe(true);
        expect(
            result.approvedCandidates.some((candidate) => candidate.source === 'trusted_catalog' && candidate.admissionPassed)
        ).toBe(true);
    });
});
