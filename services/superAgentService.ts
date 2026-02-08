/**
 * Super Agent Service - 超级代理 (V5.1 - Gemini)
 * 
 * General-Purpose Autonomous Agent using Gemini Function Calling.
 * Implements a ReAct (Reasoning + Acting) loop for multi-turn tool execution.
 */

// Note: @google/generative-ai is imported dynamically in getGeminiClient()
import { getToolRegistry, setToolRegistryApiKey, GeminiFunctionDeclaration } from './toolRegistry.js';
import { runShadowProfiling, setProfilingApiKey, ProfilingResult, onProfileUpdate } from './profilingService.js';
import { getMemR3Router } from './memr3Service.js';
import { SkillResult, getSkillRegistry } from './skillRegistry.js';
import { getPlanGenerator } from './planGenerator.js';
import { ThreeStagePlan } from './planTypes.js';
import { track } from './telemetryService.js';
import { classifyFreshness, createStructuredFallback, type StructuredFallback, type IntentDomain } from './freshnessClassifier.js';
import { buildFlightActionLinks, parseFlightConstraints, type FlightConstraints } from './flightConstraintParser.js';
import { ensureMarketplaceCatalogReady, detectDomain, detectCapabilities } from './agentMarketplaceService.js';
import type { MarketplaceTask, AgentExecutionResult } from './agentMarketplaceTypes.js';
import { executeSpecializedAgent } from './specializedAgents.js';
import type { SpecializedAgentType } from '../types.js';
import { buildApiUrl } from './apiBaseUrl.js';

// ============================================================================
// Travel Context Extraction (for multi-agent param sharing)
// ============================================================================

interface TravelContext {
    destination?: string;
    origin?: string;
    checkInDate?: string;
    checkOutDate?: string;
    departureDate?: string;
    nights?: number;
    adults?: number;
    budget?: number;
    currency?: string;
}

function parseTravelContext(query: string): TravelContext {
    const ctx: TravelContext = {};
    const now = new Date();

    // Destination: "去X" / "到X" / "X旅行" / "X酒店"
    const destMatch = query.match(/(?:去|到|飞)\s*([\u4e00-\u9fa5a-zA-Z]{2,10})(?:旅[行游]|度假|出差|玩)?/)
        || query.match(/([\u4e00-\u9fa5a-zA-Z]{2,10})(?:的)?(?:酒店|住宿|旅[行游]|机票|航班)/);
    if (destMatch) {
        const raw = destMatch[1].replace(/的$/, '');
        // Filter out non-destination words
        if (!/^(我|你|他|她|想|要|需要|帮|搜索|查找|推荐|最)/.test(raw)) {
            ctx.destination = raw;
        }
    }

    // Origin: "从X出发" / "从X到Y"
    const originMatch = query.match(/从\s*([\u4e00-\u9fa5a-zA-Z]{2,10})\s*(?:到|出发|飞)/);
    if (originMatch) {
        ctx.origin = originMatch[1];
        // If origin matched, try destination from "从X到Y"
        const routeMatch = query.match(/从\s*[\u4e00-\u9fa5a-zA-Z]+\s*(?:到|飞)\s*([\u4e00-\u9fa5a-zA-Z]{2,10})/);
        if (routeMatch) ctx.destination = routeMatch[1];
    }

    // Dates: YYYY-MM-DD / M月D日 / 明天 / 后天
    const fullDateMatch = query.match(/(\d{4})[\-\/年](\d{1,2})[\-\/月](\d{1,2})/);
    if (fullDateMatch) {
        const y = parseInt(fullDateMatch[1]);
        const m = String(parseInt(fullDateMatch[2])).padStart(2, '0');
        const d = String(parseInt(fullDateMatch[3])).padStart(2, '0');
        ctx.departureDate = `${y}-${m}-${d}`;
        ctx.checkInDate = ctx.departureDate;
    } else {
        const mdMatch = query.match(/(\d{1,2})[月\/\-](\d{1,2})[日号]?/);
        if (mdMatch) {
            let year = now.getFullYear();
            const m = parseInt(mdMatch[1]);
            const d = parseInt(mdMatch[2]);
            const candidate = new Date(year, m - 1, d);
            if (candidate < now) year++;
            ctx.departureDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            ctx.checkInDate = ctx.departureDate;
        } else if (/明天/.test(query)) {
            const t = new Date(now); t.setDate(t.getDate() + 1);
            ctx.departureDate = t.toISOString().split('T')[0];
            ctx.checkInDate = ctx.departureDate;
        } else if (/后天/.test(query)) {
            const t = new Date(now); t.setDate(t.getDate() + 2);
            ctx.departureDate = t.toISOString().split('T')[0];
            ctx.checkInDate = ctx.departureDate;
        }
    }

    // Nights: "住X晚" / "X天"
    const nightsMatch = query.match(/(\d+)\s*(?:晚|夜)/) || query.match(/住\s*(\d+)\s*天/);
    if (nightsMatch) {
        ctx.nights = parseInt(nightsMatch[1]);
    } else {
        const daysMatch = query.match(/(\d+)\s*天/);
        if (daysMatch) ctx.nights = Math.max(1, parseInt(daysMatch[1]) - 1);
    }

    // Check-out from check-in + nights
    if (ctx.checkInDate && ctx.nights) {
        const co = new Date(ctx.checkInDate);
        co.setDate(co.getDate() + ctx.nights);
        ctx.checkOutDate = co.toISOString().split('T')[0];
    } else if (ctx.checkInDate && !ctx.checkOutDate) {
        // Default 3 nights
        ctx.nights = 3;
        const co = new Date(ctx.checkInDate);
        co.setDate(co.getDate() + 3);
        ctx.checkOutDate = co.toISOString().split('T')[0];
    }

    // Adults
    const adultsMatch = query.match(/(\d+)\s*(?:人|位|个人)/);
    if (adultsMatch) ctx.adults = parseInt(adultsMatch[1]);

    // Budget
    const budgetMatch = query.match(/预算\s*(?:约|大约)?\s*(\d+)/);
    if (budgetMatch) ctx.budget = parseInt(budgetMatch[1]);

    // Currency
    ctx.currency = /[\u4e00-\u9fa5]/.test(ctx.destination || '') ? 'CNY' : 'USD';

    return ctx;
}

// ============================================================================
// Types
// ============================================================================

export interface UserContext {
    userId?: string;
    preferences?: Record<string, any>;
    recentQueries?: string[];
    currentApp?: string;
    conversationHistory?: { role: string; content: string }[];  // Simple chat format
}

export interface AgentResponse {
    answer: string;
    toolsUsed: string[];
    toolResults: ToolExecutionResult[];
    confidence: number;
    executionTimeMs: number;
    turns: number;
    profilingResult?: ProfilingResult;
    /** Three-Stage Plan (Phase 2 Week 2) */
    plan?: ThreeStagePlan;
    /** Marketplace trace info (when marketplace was used) */
    marketplace_trace_id?: string;
    marketplace_selected_agents?: Array<{ task_id: string; agent_id: string }>;
    marketplace_fallback_used?: boolean;
}

export interface ToolExecutionResult {
    toolName: string;
    args: Record<string, any>;
    output: any;
    success: boolean;
    error?: string;
    executionTimeMs: number;
}

// ============================================================================
// Gemini Client
// ============================================================================

let geminiClient: any = null;
let currentApiKey: string = '';
let GoogleGenerativeAI: any = null;
const DEFAULT_EXTERNAL_AGENT_TIMEOUT_MS = 12_000;
const DEFAULT_EXTERNAL_PROXY_RETRIES = 1;

function getExternalAgentTimeoutMs(): number {
    const configured = typeof process !== 'undefined'
        ? Number(process.env?.AGENT_MARKET_EXECUTOR_TIMEOUT_MS)
        : NaN;
    if (Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_EXTERNAL_AGENT_TIMEOUT_MS;
}

function resolveExternalAgentEndpoint(executeRef: string): string | null {
    if (!executeRef || typeof executeRef !== 'string') return null;
    const trimmed = executeRef.trim();
    if (!trimmed) return null;

    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('/')) return buildApiUrl(trimmed);

    const base = typeof process !== 'undefined' ? process.env?.AGENT_MARKET_EXECUTOR_BASE?.trim() : '';
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
}

function shouldUseExternalProxy(): boolean {
    const raw = (typeof process !== 'undefined' ? process.env?.AGENT_MARKET_EXECUTOR_USE_PROXY : '') || '';
    if (!raw) return true;
    const normalized = raw.trim().toLowerCase();
    return !['0', 'false', 'off', 'no'].includes(normalized);
}

function getExternalProxyRetries(): number {
    const configured = typeof process !== 'undefined'
        ? Number(process.env?.AGENT_MARKET_EXECUTOR_RETRIES)
        : NaN;
    if (Number.isFinite(configured) && configured >= 0) {
        return Math.max(0, Math.min(3, Math.floor(configured)));
    }
    return DEFAULT_EXTERNAL_PROXY_RETRIES;
}

function getExternalProxyToken(): string | undefined {
    if (typeof process === 'undefined') return undefined;
    const raw = process.env?.VITE_AGENT_MARKET_PROXY_TOKEN || process.env?.AGENT_MARKET_PROXY_TOKEN;
    if (!raw) return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeExternalEvidence(
    payload: any,
    fallbackSource: string,
    fallbackUrl: string
): Array<{ source: string; url: string; fetched_at?: string }> | undefined {
    if (Array.isArray(payload?.evidence)) {
        return payload.evidence.map((item: any) => ({
            source: String(item?.source || fallbackSource),
            url: String(item?.url || fallbackUrl),
            fetched_at: item?.fetched_at ? String(item.fetched_at) : undefined,
        }));
    }

    if (Array.isArray(payload?.evidence?.items)) {
        return payload.evidence.items.map((item: any) => ({
            source: String(item?.source_name || item?.source || payload?.evidence?.provider || fallbackSource),
            url: String(item?.url || fallbackUrl),
            fetched_at: payload?.evidence?.fetched_at ? String(payload.evidence.fetched_at) : undefined,
        }));
    }

    if (Array.isArray(payload?.sources)) {
        return payload.sources.map((source: any) => ({
            source: String(source || fallbackSource),
            url: fallbackUrl,
        }));
    }

    return undefined;
}

async function getGeminiClient(apiKey: string) {
    if (!geminiClient || apiKey !== currentApiKey) {
        currentApiKey = apiKey;
        // Use dynamic import for @google/genai (browser-compatible)
        if (!GoogleGenerativeAI) {
            const genAIModule = await import('@google/generative-ai');
            GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
        }
        geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
}

// ============================================================================
// Super Agent Service (V5.1 - Gemini Function Calling)
// ============================================================================

export class SuperAgentService {
    private apiKey: string = '';

    private formatFlightFallbackExample(query: string): string {
        const constraints = parseFlightConstraints(query);
        const datePart = constraints.departureDate || '明天';
        const timeMap: Record<string, string> = {
            morning: '早上',
            afternoon: '下午',
            evening: '晚上',
            night: '夜间',
        };
        const timePart = constraints.departureTimePreference
            ? timeMap[constraints.departureTimePreference] || ''
            : '';
        const routePart = constraints.origin && constraints.destination
            ? `${constraints.origin}到${constraints.destination}`
            : '出发地到目的地';
        const classMap: Record<string, string> = {
            economy: '经济舱',
            business: '商务舱',
            first: '头等舱',
        };
        const classPart = constraints.travelClass
            ? classMap[constraints.travelClass] || '经济舱'
            : '经济舱';
        const passengerPart = `${constraints.passengers || 1}人`;

        return `${datePart}${timePart ? `${timePart}，` : '，'}${routePart}，${classPart}，${passengerPart}`;
    }

    /**
     * Set API Key for all components
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;

        // Configure all dependent services
        setToolRegistryApiKey(apiKey);
        setProfilingApiKey(apiKey);

        // Legacy: Also set for builtinSkills if still used elsewhere
        import('./builtinSkills').then(mod => {
            mod.setSkillsApiKey(apiKey);
        }).catch(() => { });

        // Configure Plan Generator (Phase 2 Week 2)
        getPlanGenerator().setApiKey(apiKey);

        console.log('[SuperAgent] V5.1 Brain initialized with Gemini + Plan Generator');
    }

    /**
     * Core Method: Process user query using ReAct Loop with Gemini
     */
    async processWithReAct(
        query: string,
        context: UserContext = {}
    ): Promise<AgentResponse> {
        const startTime = performance.now();
        const traceId = `trace_${Date.now()}`;
        const flightConstraints = parseFlightConstraints(query);
        console.log(`[SuperAgent] 🧠 ReAct Loop starting for: "${query}"`);

        // Telemetry: Track query received
        track.queryReceived(query, traceId);

        // ====================================================================
        // Marketplace Pre-Routing: Complex multi-task queries go through
        // the marketplace pipeline for agent discovery + DAG execution.
        // Simple queries continue to the standard ReAct loop below.
        // ====================================================================
        const detectedCaps = detectCapabilities(query);
        const detectedDomain = detectDomain(query);
        const marketplace = await ensureMarketplaceCatalogReady(true);
        const isComplexQuery = detectedCaps.length >= 2
            && !detectedCaps.every(c => c === 'general')
            && marketplace.getRegisteredAgents().length > 0;

        // Parse travel context once, share across all agents
        const travelCtx = parseTravelContext(query);
        if (travelCtx.destination) {
            console.log(`[SuperAgent] 🗺️ Travel context parsed:`, JSON.stringify(travelCtx));
        }

        if (isComplexQuery) {
            console.log(`[SuperAgent] 🏪 Marketplace pre-route: domain=${detectedDomain}, caps=[${detectedCaps}]`);
            try {
                const executor = async (agentId: string, task: MarketplaceTask): Promise<AgentExecutionResult> => {
                    const start = Date.now();
                    try {
                        // Find the agent descriptor and delegate by source.
                        const agents = marketplace.getRegisteredAgents();
                        const agent = agents.find(a => a.id === agentId);
                        if (!agent) throw new Error(`Agent ${agentId} not found`);

                        if (agent.source === 'specialized') {
                            // Build rich params from parsed travel context
                            const agentType = agent.execute_ref as SpecializedAgentType;
                            const taskParams: Record<string, any> = { query: task.objective };

                            // Share travel context across agents
                            if (travelCtx.destination) taskParams.destination = travelCtx.destination;
                            if (travelCtx.origin) taskParams.origin = travelCtx.origin;

                            if (agentType === 'hotel_booking') {
                                if (travelCtx.checkInDate) taskParams.checkInDate = travelCtx.checkInDate;
                                if (travelCtx.checkOutDate) taskParams.checkOutDate = travelCtx.checkOutDate;
                                if (travelCtx.nights) taskParams.nights = travelCtx.nights;
                                if (travelCtx.adults) taskParams.adults = travelCtx.adults;
                                if (travelCtx.currency) taskParams.currency = travelCtx.currency;
                            }
                            if (agentType === 'flight_booking') {
                                if (travelCtx.departureDate) taskParams.departureDate = travelCtx.departureDate;
                                if (travelCtx.adults) taskParams.passengers = travelCtx.adults;
                            }

                            const specializedTask = {
                                id: `mkt_${task.id}`,
                                agentType,
                                description: task.objective,
                                params: taskParams,
                                appliedPreferences: [],
                                status: 'pending' as const,
                                priority: 1,
                                canRunParallel: task.parallelizable,
                            };
                            console.log(`[SuperAgent] Executing ${agentType} with params:`, JSON.stringify(taskParams));
                            const result = await executeSpecializedAgent(specializedTask as any, this.apiKey);
                            return {
                                task_id: task.id,
                                agent_id: agentId,
                                success: Boolean(result?.success),
                                data: result,
                                evidence: result?.source
                                    ? [{ source: result.source, url: '' }]
                                    : undefined,
                                latency_ms: Date.now() - start,
                            };
                        }

                        if (agent.source === 'skill_registry') {
                            const registry = getSkillRegistry();
                            const skill = registry.getSkill(agent.execute_ref);
                            if (!skill) throw new Error(`Skill not found: ${agent.execute_ref}`);

                            const firstParam = skill.parameters.find(p => p.required)?.name
                                || skill.parameters[0]?.name
                                || 'query';
                            const input: Record<string, any> = { [firstParam]: task.objective, query: task.objective };
                            const skillResult = await skill.execute(input, {});

                            return {
                                task_id: task.id,
                                agent_id: agentId,
                                success: Boolean(skillResult?.success),
                                data: skillResult,
                                evidence: (skillResult?.sources || []).map((s: string) => ({ source: s, url: '' })),
                                latency_ms: Date.now() - start,
                            };
                        }

                        if (agent.source === 'external_market') {
                            const upstreamEndpoint = resolveExternalAgentEndpoint(agent.execute_ref);
                            if (!upstreamEndpoint) {
                                throw new Error(`External agent endpoint unresolved for execute_ref=${agent.execute_ref}`);
                            }

                            const requestPayload = {
                                trace_id: traceId,
                                agent_id: agent.id,
                                execute_ref: agent.execute_ref,
                                task: {
                                    id: task.id,
                                    objective: task.objective,
                                    required_capabilities: task.required_capabilities,
                                    dependencies: task.dependencies,
                                    parallelizable: task.parallelizable,
                                },
                                input: {
                                    query: task.objective,
                                    required_capabilities: task.required_capabilities,
                                    domain: detectedDomain,
                                },
                            };

                            const timeoutMs = getExternalAgentTimeoutMs();
                            const useProxy = shouldUseExternalProxy();
                            const controller = typeof AbortController !== 'undefined'
                                ? new AbortController()
                                : undefined;
                            const timeout = controller
                                ? setTimeout(() => controller.abort(), timeoutMs)
                                : undefined;
                            const requestUrl = useProxy
                                ? buildApiUrl('/api/agent-market/execute')
                                : upstreamEndpoint;
                            const requestBody = useProxy
                                ? {
                                    target_url: upstreamEndpoint,
                                    payload: requestPayload,
                                    timeout_ms: timeoutMs,
                                    retries: getExternalProxyRetries(),
                                }
                                : requestPayload;
                            const requestHeaders: Record<string, string> = {
                                'content-type': 'application/json',
                            };
                            if (useProxy) {
                                const proxyToken = getExternalProxyToken();
                                if (proxyToken) {
                                    requestHeaders['x-agent-market-token'] = proxyToken;
                                }
                            }

                            try {
                                const resp = await fetch(requestUrl, {
                                    method: 'POST',
                                    headers: requestHeaders,
                                    body: JSON.stringify(requestBody),
                                    signal: controller?.signal,
                                });

                                const text = await resp.text();
                                let payload: any = null;
                                if (text) {
                                    try {
                                        payload = JSON.parse(text);
                                    } catch {
                                        payload = { raw: text };
                                    }
                                }

                                if (!resp.ok) {
                                    const snippet = text ? text.slice(0, 240) : '';
                                    throw new Error(`external_agent_http_${resp.status}${snippet ? `: ${snippet}` : ''}`);
                                }

                                const normalizedData = payload?.data ?? payload ?? {};
                                const evidence = normalizeExternalEvidence(payload, agentId, upstreamEndpoint);

                                return {
                                    task_id: task.id,
                                    agent_id: agentId,
                                    success: payload?.success !== false,
                                    data: normalizedData,
                                    evidence,
                                    latency_ms: Date.now() - start,
                                };
                            } finally {
                                if (timeout) clearTimeout(timeout);
                            }
                        }

                        const toolRegistry = getToolRegistry();
                        const tool = toolRegistry.getTool(agent.execute_ref);
                        if (!tool) {
                            throw new Error(`No execute_ref found for agent ${agentId}`);
                        }

                        const toolArgs: Record<string, any> = { query: task.objective };
                        if (
                            task.required_capabilities.includes('live_search')
                            || task.required_capabilities.includes('flight_search')
                            || task.required_capabilities.includes('hotel_search')
                            || task.required_capabilities.includes('local_transport')
                        ) {
                            toolArgs.intent_domain = detectedDomain === 'travel'
                                ? 'travel.flight'
                                : detectedDomain === 'finance'
                                    ? 'finance'
                                    : 'knowledge';
                            toolArgs.locale = 'zh-CN';
                        }

                        const result = await tool.execute(toolArgs);
                        const evidence = Array.isArray(result?.evidence?.items)
                            ? result.evidence.items.map((item: any) => ({
                                source: item?.source_name || result?.evidence?.provider || agentId,
                                url: item?.url || '',
                                fetched_at: result?.evidence?.fetched_at
                                    ? String(result.evidence.fetched_at)
                                    : undefined,
                            }))
                            : undefined;

                        return {
                            task_id: task.id,
                            agent_id: agentId,
                            success: Boolean(result?.success),
                            data: result,
                            evidence,
                            latency_ms: Date.now() - start,
                        };
                    } catch (err) {
                        return {
                            task_id: task.id,
                            agent_id: agentId,
                            success: false,
                            data: null,
                            error: err instanceof Error ? err.message : String(err),
                            latency_ms: Date.now() - start,
                        };
                    }
                };

                const { plan, summary, aggregated } = await marketplace.runFullPipeline(query, executor, detectedDomain);
                const elapsed = performance.now() - startTime;
                const successfulCount = summary.results.filter(r => r.success).length;
                const confidence = summary.results.length > 0
                    ? successfulCount / summary.results.length
                    : 0.5;
                const highRisk = detectedDomain === 'health'
                    || detectedDomain === 'legal'
                    || detectedDomain === 'finance';
                const degradedConstraints = detectedDomain === 'finance'
                    ? '请补充标的（如股票代码/币种）、时间范围与风险偏好'
                    : detectedDomain === 'health'
                        ? '请补充症状持续时间、既往病史与当前用药'
                        : detectedDomain === 'legal'
                            ? '请补充法域、合同条款/争议点与时间线'
                            : '请补充关键约束信息';
                const fallbackByTask = new Map(
                    summary.fallback_used.map(item => [item.task_id, item.to_agent_id])
                );
                const effectiveSelectedAgents = summary.selected_agents.map(item => ({
                    task_id: item.task_id,
                    agent_id: fallbackByTask.get(item.task_id) ?? item.agent_id,
                }));
                const selectedAgentMeta = new Map(
                    marketplace.getRegisteredAgents().map(agent => [agent.id, agent])
                );
                const hasStrongEvidenceAgent = effectiveSelectedAgents.some(item =>
                    selectedAgentMeta.get(item.agent_id)?.evidence_level === 'strong'
                );
                const hasTraceableEvidence = aggregated.evidence.length > 0;
                const shouldDegradeForEvidence = highRisk && (!hasStrongEvidenceAgent || !hasTraceableEvidence);

                // Convert marketplace results to AgentResponse format
                const mktToolResults: ToolExecutionResult[] = summary.results.map(r => ({
                    toolName: r.agent_id || 'marketplace_agent',
                    args: { task_id: r.task_id },
                    output: r.data,
                    success: r.success,
                    error: r.error,
                    executionTimeMs: r.latency_ms,
                }));

                // Build structured answer with LLM synthesis from tool results
                let finalAnswer: string;
                if (shouldDegradeForEvidence) {
                    finalAnswer = `当前为高风险领域且缺少强证据链，已降级为约束补全模式。${degradedConstraints}。`;
                } else {
                    // Collect all tool result data for LLM synthesis
                    const toolDataSummaries: string[] = [];
                    for (const r of summary.results) {
                        const agentMeta = selectedAgentMeta.get(r.agent_id);
                        const agentName = agentMeta?.name || r.agent_id;
                        const data = r.data;

                        if (!r.success) {
                            toolDataSummaries.push(`[${agentName}] 执行失败: ${r.error || '未知错误'}`);
                            continue;
                        }

                        // Extract meaningful data for synthesis
                        if (data?.data?.hotels?.length) {
                            const hotels = data.data.hotels.slice(0, 5);
                            toolDataSummaries.push(`[${agentName}] 找到 ${data.data.hotels.length} 家酒店:\n${hotels.map((h: any) => `- ${h.name || '未知'}: ¥${h.pricePerNight || '?'}/晚, 评分: ${h.rating || '?'}`).join('\n')}`);
                        } else if (data?.data?.flights?.length || data?.flights?.length) {
                            const flights = (data?.data?.flights || data?.flights).slice(0, 5);
                            toolDataSummaries.push(`[${agentName}] 找到 ${flights.length} 个航班:\n${flights.map((f: any) => `- ${f.airline || ''} ${f.flightNumber || ''}: ${f.departureTime || '?'}-${f.arrivalTime || '?'}, ¥${f.price || '?'}`).join('\n')}`);
                        } else if (data?.evidence?.items?.length) {
                            const items = data.evidence.items.slice(0, 5);
                            toolDataSummaries.push(`[${agentName}] 搜索结果:\n${items.map((item: any) => `- ${item.title || ''}: ${item.snippet || ''}${item.url ? ` [来源](${item.url})` : ''}`).join('\n')}`);
                        } else if (data?.answer || data?.text || data?.content) {
                            toolDataSummaries.push(`[${agentName}] 结果: ${data.answer || data.text || data.content}`);
                        } else if (typeof data === 'string') {
                            toolDataSummaries.push(`[${agentName}] 结果: ${data}`);
                        } else {
                            toolDataSummaries.push(`[${agentName}] 任务完成 (data: ${JSON.stringify(data).slice(0, 300)})`);
                        }
                    }

                    if (aggregated.failed_tasks.length > 0) {
                        toolDataSummaries.push(`未完成的任务: ${aggregated.failed_tasks.join(', ')}`);
                    }

                    // Synthesize with LLM for a proper human-readable answer
                    try {
                        const client = await getGeminiClient(this.apiKey);
                        const synthesisModel = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });
                        const synthesisPrompt = `你是Lumi AI助手。用户问了"${query}"。

以下是各专业Agent返回的原始数据：
${toolDataSummaries.join('\n\n')}

请根据以上数据，用中文为用户提供一个完整、有用的回答。要求：
1. 直接回答用户问题，不要提及"Agent"或"工具"等技术细节
2. 使用Markdown格式（加粗、列表、链接等）增强可读性
3. 如果有具体数据（价格、名称、评分等），务必包含
4. 语气自然、亲切
5. 如果数据有限，基于已有信息给出最佳建议`;

                        console.log('[SuperAgent] 🧠 Marketplace: synthesizing final answer with LLM...');
                        const synthesisResult = await synthesisModel.generateContent(synthesisPrompt);
                        finalAnswer = synthesisResult.response.text() || toolDataSummaries.join('\n');
                        console.log('[SuperAgent] ✅ Marketplace: LLM synthesis complete');
                    } catch (synthesisErr) {
                        console.warn('[SuperAgent] ⚠️ Marketplace LLM synthesis failed, using raw summaries:', synthesisErr);
                        // Fallback: use the raw summaries if LLM synthesis fails
                        finalAnswer = toolDataSummaries.join('\n');
                    }
                }

                return {
                    answer: finalAnswer,
                    toolsUsed: Array.from(new Set(effectiveSelectedAgents.map(s => s.agent_id))),
                    toolResults: mktToolResults,
                    confidence,
                    executionTimeMs: Math.round(performance.now() - startTime),
                    turns: 1,
                    marketplace_trace_id: plan.trace_id,
                    marketplace_selected_agents: effectiveSelectedAgents,
                    marketplace_fallback_used: summary.fallback_used.length > 0,
                };
            } catch (mktErr) {
                console.warn('[SuperAgent] Marketplace pre-route failed, falling through to ReAct:', mktErr);
                // Fall through to standard ReAct loop
            }
        }

        const toolsUsed: string[] = [];
        const toolResults: ToolExecutionResult[] = [];
        let profilingResult: ProfilingResult | null = null;

        try {
            console.log('[SuperAgent] API Key status:', this.apiKey ? `Configured (${this.apiKey.substring(0, 8)}...)` : 'NOT CONFIGURED');

            if (!this.apiKey) {
                throw new Error('API Key not configured');
            }

            // 1. Get tools from registry
            const registry = getToolRegistry();
            const tools = registry.getGeminiTools();
            console.log(`[SuperAgent] 🔧 Available tools: ${registry.getToolNames().join(', ')}`);

            // 2. Build system prompt
            const systemPrompt = this.buildSystemPrompt(context);

            // 3. Get Gemini client and model
            const client = await getGeminiClient(this.apiKey);
            const model = client.getGenerativeModel({
                model: 'gemini-3-pro-preview',  // Gemini 3 Pro Preview (confirmed available)
                systemInstruction: systemPrompt,
                tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined
            });

            // 4. Build conversation history
            const history = this.buildGeminiHistory(context);

            // 5. Start chat session
            const chat = model.startChat({
                history: history
            });

            // 6. Send message and get response
            console.log('[SuperAgent] 📡 Sending request to Gemini...');
            let response = await chat.sendMessage(query);
            let result = response.response;

            // 7. ReAct Loop: Handle function calls
            const MAX_TURNS = 5;
            let turns = 0;

            while (turns < MAX_TURNS) {
                const functionCalls = result.functionCalls();

                if (!functionCalls || functionCalls.length === 0) {
                    console.log(`[SuperAgent] ✅ No function calls, exiting loop`);
                    break;
                }

                console.log(`[SuperAgent] 🔄 Turn ${turns + 1}: ${functionCalls.length} function call(s)`);

                // Execute all function calls
                const functionResponses = [];

                for (const call of functionCalls) {
                    const toolName = call.name;
                    const toolArgs = call.args || {};

                    console.log(`[SuperAgent] 🤖 Executing: ${toolName}`, toolArgs);
                    toolsUsed.push(toolName);

                    const execStart = performance.now();
                    let output: any;
                    let success = true;
                    let error: string | undefined;

                    try {
                        const tool = registry.getTool(toolName);
                        if (!tool) {
                            throw new Error(`Tool not found: ${toolName}`);
                        }
                        output = await tool.execute(toolArgs);

                        // Run shadow profiling for this tool
                        if (tool.profiling) {
                            runShadowProfiling(output, tool.profiling.target_dimension, tool.profiling.instruction)
                                .then(result => {
                                    if (result) {
                                        console.log('[SuperAgent] Shadow profiling result:', result);
                                    }
                                })
                                .catch(err => console.warn('[SuperAgent] Shadow profiling failed:', err));
                        }
                    } catch (e) {
                        success = false;
                        error = e instanceof Error ? e.message : String(e);
                        output = { error: error };
                        console.error(`[SuperAgent] ❌ Tool failed: ${toolName}`, e);
                    }

                    const execTime = Math.round(performance.now() - execStart);
                    console.log(`[SuperAgent] ⏱️ ${toolName} completed in ${execTime}ms`);

                    toolResults.push({
                        toolName,
                        args: toolArgs,
                        output,
                        success,
                        error,
                        executionTimeMs: execTime
                    });

                    functionResponses.push({
                        name: toolName,
                        response: output
                    });
                }

                // Send function results back to Gemini
                response = await chat.sendMessage(
                    functionResponses.map(fr => ({
                        functionResponse: {
                            name: fr.name,
                            response: fr.response
                        }
                    }))
                );

                result = response.response;
                turns++;
            }

            // 8. Extract final answer
            this.applyFlightTimePreferenceToToolResults(toolResults, flightConstraints);
            const finalText = result.text() || '处理完成，但未生成回复。';
            const guardedAnswer = this.enforceEvidenceFirstAnswer(query, finalText, toolResults);
            const timeAwareAnswer = this.enforceFlightTimePreference(
                query,
                guardedAnswer,
                toolResults,
                flightConstraints
            );

            // Calculate confidence
            const successfulResults = toolResults.filter(r => r.success);
            const confidence = toolResults.length > 0
                ? successfulResults.length / toolResults.length
                : 0.7;

            const executionTimeMs = Math.round(performance.now() - startTime);
            console.log(`[SuperAgent] ✅ Completed in ${executionTimeMs}ms, ${turns} turns, ${toolsUsed.length} tools`);

            return {
                answer: timeAwareAnswer,
                toolsUsed: Array.from(new Set(toolsUsed)),
                toolResults,
                confidence,
                executionTimeMs,
                turns,
                profilingResult: profilingResult || undefined
            };

        } catch (error) {
            console.error('[SuperAgent] ❌ Fatal error:', error);

            const realtimeFallback = await this.tryRealtimeToolFallback(query, flightConstraints, startTime);
            if (realtimeFallback) {
                return realtimeFallback;
            }

            // Try fallback to simple LLM call
            try {
                console.log('[SuperAgent] 🔄 Attempting fallback...');
                const fallbackResponse = await this.simpleLLMCall(query);
                return {
                    answer: fallbackResponse,
                    toolsUsed: [],
                    toolResults: [],
                    confidence: 0.5,
                    executionTimeMs: Math.round(performance.now() - startTime),
                    turns: 0
                };
            } catch (fallbackError) {
                console.error('[SuperAgent] ❌ Fallback also failed:', fallbackError);
            }

            return {
                answer: '抱歉，处理您的问题时遇到了困难。请稍后重试。',
                toolsUsed: [],
                toolResults: [],
                confidence: 0,
                executionTimeMs: Math.round(performance.now() - startTime),
                turns: 0
            };
        }
    }

    private buildDirectLiveSearchAnswer(query: string, liveOutput: any): string | null {
        if (!liveOutput || typeof liveOutput !== 'object' || !liveOutput.success) {
            return null;
        }

        const route = classifyFreshness(query);
        const quoteCards = Array.isArray(liveOutput.quote_cards) ? liveOutput.quote_cards : [];
        const evidenceItems = Array.isArray(liveOutput?.evidence?.items) ? liveOutput.evidence.items : [];
        const lines: string[] = [];

        if ((route.intent_domain === 'travel.flight' || route.intent_domain === 'travel.train') && quoteCards.length > 0) {
            lines.push('已获取实时票务结果（以平台实时页为准）：');
            for (const card of quoteCards.slice(0, 3)) {
                const provider = String(card?.provider || '来源');
                const dep = String(card?.dep_time || '--:--');
                const arr = String(card?.arr_time || '--:--');
                const price = String(card?.price_text || '价格待确认');
                const transfers = String(card?.transfers_text || '');
                const url = String(card?.source_url || '');
                if (url.startsWith('http')) {
                    lines.push(`- ${dep}-${arr} ${price}${transfers ? `，${transfers}` : ''} [来源: ${provider}](${url})`);
                } else {
                    lines.push(`- ${dep}-${arr} ${price}${transfers ? `，${transfers}` : ''}（来源: ${provider}）`);
                }
            }
            return lines.join('\n');
        }

        if (evidenceItems.length > 0) {
            lines.push('已获取实时信息：');
            for (const item of evidenceItems.slice(0, 3)) {
                const title = String(item?.title || '实时结果');
                const sourceName = String(item?.source_name || '来源');
                const url = String(item?.url || '');
                if (url.startsWith('http')) {
                    lines.push(`- ${title} [来源: ${sourceName}](${url})`);
                } else {
                    lines.push(`- ${title}（来源: ${sourceName}）`);
                }
            }
            return lines.join('\n');
        }

        return null;
    }

    private async tryRealtimeToolFallback(
        query: string,
        flightConstraints: FlightConstraints,
        startTime: number
    ): Promise<AgentResponse | null> {
        const route = classifyFreshness(query);
        if (!route.needs_live_data) return null;

        const registry = getToolRegistry();
        const liveSearch = registry.getTool('live_search');
        if (!liveSearch) return null;

        const args = {
            query,
            intent_domain: route.intent_domain,
            locale: 'zh-CN',
        };

        try {
            console.log('[SuperAgent] 🧯 Realtime fallback: executing live_search directly');
            const execStart = performance.now();
            const output = await liveSearch.execute(args);
            const executionTimeMs = Math.round(performance.now() - execStart);
            const success = output?.success !== false;
            const error = success ? undefined : String(output?.error?.message || output?.error?.code || 'live_search failed');

            const toolResult: ToolExecutionResult = {
                toolName: 'live_search',
                args,
                output,
                success,
                error,
                executionTimeMs,
            };

            const seedAnswer = this.buildDirectLiveSearchAnswer(query, output) || '实时查询已执行。';
            const guardedAnswer = this.enforceEvidenceFirstAnswer(query, seedAnswer, [toolResult]);
            const finalAnswer = this.enforceFlightTimePreference(
                query,
                guardedAnswer,
                [toolResult],
                flightConstraints
            );
            const hasUsable = success && this.hasUsableEvidence(route.intent_domain, output);

            return {
                answer: finalAnswer,
                toolsUsed: ['live_search'],
                toolResults: [toolResult],
                confidence: hasUsable ? 0.65 : success ? 0.45 : 0.35,
                executionTimeMs: Math.round(performance.now() - startTime),
                turns: 1,
            };
        } catch (fallbackError) {
            console.warn('[SuperAgent] ⚠️ Realtime fallback failed:', fallbackError);
            return null;
        }
    }

    private extractEvidenceItems(output: any): Array<{ title?: string; snippet?: string; url?: string; source_name?: string }> {
        if (!output || typeof output !== 'object') return [];
        if (Array.isArray(output.evidence?.items)) return output.evidence.items;
        if (Array.isArray(output.items)) return output.items;
        if (Array.isArray(output.sources)) return output.sources;
        return [];
    }

    private hasStructuredTravelEvidence(
        domain: IntentDomain,
        items: Array<{ title?: string; snippet?: string; url?: string; source_name?: string }>
    ): boolean {
        if (!Array.isArray(items) || items.length === 0) return false;

        const domainSet = new Set<string>();
        let structuredCount = 0;

        for (const item of items) {
            const text = `${item?.title || ''} ${item?.snippet || ''}`;
            if (/(航班|机票|flight|airline|起飞|抵达|直飞|转机|票价|¥|￥|\$|\d{2,5}\s*(元|rmb|cny))/i.test(text)) {
                structuredCount += 1;
            }
            if (item?.url) {
                try {
                    domainSet.add(new URL(item.url).hostname.replace(/^www\./, ''));
                } catch {
                    // ignore invalid URLs
                }
            }
        }

        if (domain === 'travel.flight' || domain === 'travel.train') {
            return structuredCount >= 1 && items.length >= 2 && domainSet.size >= 1;
        }

        if (domain === 'travel.hotel') {
            return structuredCount >= 1 && items.length >= 2;
        }

        return items.length >= 1;
    }

    private hasUsableEvidence(domain: IntentDomain, output: any): boolean {
        const items = this.extractEvidenceItems(output);
        if (domain.startsWith('travel.')) {
            return this.hasStructuredTravelEvidence(domain, items);
        }
        return items.length > 0;
    }

    private enforceEvidenceFirstAnswer(
        query: string,
        modelAnswer: string,
        toolResults: ToolExecutionResult[]
    ): string {
        const route = classifyFreshness(query);
        if (!route.needs_live_data) return modelAnswer;

        const relevant = toolResults.filter((r) => r.toolName === 'live_search' || r.toolName === 'web_exec');
        if (relevant.length === 0) {
            return modelAnswer;
        }

        const hasAnyUsable = relevant.some((r) => r.success && this.hasUsableEvidence(route.intent_domain, r.output));
        if (hasAnyUsable) {
            return modelAnswer;
        }

        const latestLiveFailure = [...relevant]
            .reverse()
            .find((r) => r.toolName === 'live_search');

        const fallback: StructuredFallback = latestLiveFailure?.output?.fallback
            || createStructuredFallback(
                route.intent_domain,
                '已触发 Evidence-first 保护：暂未拿到可验证的实时结果',
                route.missing_constraints
            );

        const missing = (fallback.missing_constraints?.length ? fallback.missing_constraints : route.missing_constraints) || [];
        const missingText = missing.length > 0
            ? missing.map((m) => `- ${m}`).join('\n')
            : '- 出发日期\n- 舱位偏好（经济/商务）\n- 乘客人数';

        const extractedLinks = this.extractActionLinks(relevant);
        const fallbackFlightLinks = route.intent_domain === 'travel.flight'
            ? buildFlightActionLinks(parseFlightConstraints(query))
            : [];
        const links = extractedLinks.length > 0 ? extractedLinks : fallbackFlightLinks;
        const linkText = links.length > 0
            ? [
                '',
                '你也可以先打开以下实时入口（若未指定日期请在站内补选）：',
                ...links.slice(0, 3).map((link) => `- [${link.title}](${link.url})`)
            ].join('\n')
            : '';

        const example = route.intent_domain === 'travel.flight'
            ? this.formatFlightFallbackExample(query)
            : route.intent_domain === 'travel.train'
                ? '明天上午，上海到北京，二等座，1人'
                : '请补充日期、人数与预算';

        return [
            '当前请求属于实时查询，我不会在无可验证证据时编造价格或班次。',
            '',
            '为了继续准确查询，请补充以下约束：',
            missingText,
            '',
            `可直接回复：\`${example}\``,
            linkText,
            '',
            '补充后我会立即重新检索并给出可验证来源。'
        ].join('\n');
    }

    private parseHour(timeValue: any): number | null {
        if (typeof timeValue !== 'string') return null;
        const trimmed = timeValue.trim();
        if (!trimmed) return null;

        const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (ampmMatch) {
            let hour = parseInt(ampmMatch[1], 10);
            const marker = ampmMatch[3].toUpperCase();
            if (marker === 'PM' && hour < 12) hour += 12;
            if (marker === 'AM' && hour === 12) hour = 0;
            return hour;
        }

        const normalMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
        if (normalMatch) {
            return parseInt(normalMatch[1], 10);
        }

        const cnMatch = trimmed.match(/(\d{1,2})点/);
        if (cnMatch) {
            return parseInt(cnMatch[1], 10);
        }
        return null;
    }

    private getFlightDepartureHour(flight: any): number | null {
        if (!flight || typeof flight !== 'object') return null;
        const departure = (flight as any).departure;
        if (typeof departure === 'string') return this.parseHour(departure);
        if (departure && typeof departure === 'object') {
            return this.parseHour((departure as any).time);
        }
        return null;
    }

    private isInPreferredWindow(hour: number | null, preference: FlightConstraints['departureTimePreference']): boolean {
        if (hour === null || !preference) return false;
        if (preference === 'morning') return hour >= 6 && hour < 12;
        if (preference === 'afternoon') return hour >= 12 && hour < 18;
        if (preference === 'evening') return hour >= 18 && hour < 24;
        if (preference === 'night') return hour >= 0 && hour < 6;
        return false;
    }

    private sortFlightsByPreference(
        flights: any[],
        preference: FlightConstraints['departureTimePreference'],
        mode: FlightConstraints['timePriorityMode']
    ): any[] {
        if (!Array.isArray(flights) || flights.length === 0 || !preference) return flights;

        const scored = flights.map((flight) => ({
            flight,
            hour: this.getFlightDepartureHour(flight),
            inPreferredWindow: this.isInPreferredWindow(this.getFlightDepartureHour(flight), preference),
            price: Number.isFinite((flight as any).price) ? (flight as any).price : Number.POSITIVE_INFINITY,
        }));

        if (mode === 'strict') {
            return scored.filter((item) => item.inPreferredWindow).map((item) => item.flight);
        }

        return scored
            .sort((a, b) => {
                if (a.inPreferredWindow !== b.inPreferredWindow) {
                    return a.inPreferredWindow ? -1 : 1;
                }
                return a.price - b.price;
            })
            .map((item) => item.flight);
    }

    private applyFlightTimePreferenceToToolResults(
        toolResults: ToolExecutionResult[],
        constraints: FlightConstraints
    ): void {
        if (!constraints.departureTimePreference) return;
        const mode = constraints.timePriorityMode || 'prefer';

        for (const result of toolResults) {
            const output = result.output;
            if (!output || typeof output !== 'object') continue;

            if (Array.isArray(output.flights)) {
                output.flights = this.sortFlightsByPreference(output.flights, constraints.departureTimePreference, mode);
                if (output.flights.length > 0 && output.bestOption) {
                    output.bestOption = output.flights[0];
                }
            }

            if (output.data && typeof output.data === 'object' && Array.isArray(output.data.flights)) {
                output.data.flights = this.sortFlightsByPreference(output.data.flights, constraints.departureTimePreference, mode);
                if (output.data.flights.length > 0 && output.data.bestOption) {
                    output.data.bestOption = output.data.flights[0];
                }
            }
        }
    }

    private hasStructuredFlights(toolResults: ToolExecutionResult[]): boolean {
        const getFlights = (output: any): any[] => {
            if (!output || typeof output !== 'object') return [];
            if (Array.isArray(output.flights)) return output.flights;
            if (output.data && Array.isArray(output.data.flights)) return output.data.flights;
            return [];
        };

        return toolResults.some((result) => {
            const flights = getFlights(result.output);
            if (flights.length === 0) return false;
            return flights.some((flight) => {
                const hour = this.getFlightDepartureHour(flight);
                const hasPrice = Number.isFinite((flight as any)?.price);
                return hour !== null || hasPrice;
            });
        });
    }

    private extractActionLinks(toolResults: ToolExecutionResult[]): Array<{ title: string; url: string }> {
        const links: Array<{ title: string; url: string }> = [];
        for (const result of toolResults) {
            const output = result.output;
            if (!output || typeof output !== 'object' || !Array.isArray(output.action_links)) continue;
            for (const link of output.action_links) {
                if (!link || typeof link.url !== 'string' || !link.url.startsWith('http')) continue;
                links.push({
                    title: typeof link.title === 'string' && link.title.length > 0 ? link.title : '查看航班',
                    url: link.url,
                });
            }
        }
        return links;
    }

    private enforceFlightTimePreference(
        query: string,
        modelAnswer: string,
        toolResults: ToolExecutionResult[],
        constraints: FlightConstraints
    ): string {
        const route = classifyFreshness(query);
        const isLikelyFlightQuery = route.intent_domain === 'travel.flight'
            || Boolean(constraints.origin && constraints.destination && constraints.departureDate);
        if (!isLikelyFlightQuery) return modelAnswer;
        if (constraints.departureTimePreference !== 'morning') return modelAnswer;
        if ((constraints.timePriorityMode || 'prefer') !== 'prefer') return modelAnswer;
        if (this.hasStructuredFlights(toolResults)) return modelAnswer;

        const actionLinks = this.extractActionLinks(toolResults);
        const generatedLinks = actionLinks.length > 0 ? actionLinks : buildFlightActionLinks(constraints);
        const linkLines = generatedLinks.length > 0
            ? generatedLinks.slice(0, 3).map((link) => `- [${link.title}](${link.url})`).join('\n')
            : '- 暂无可点击链接，请补充出发地、目的地和日期后重试。';

        return [
            '已识别到你的时间偏好：早上时段（06:00-11:59）。',
            '',
            '当前可验证证据尚未返回结构化航班列表，我无法在回答中直接给出精确班次排序。',
            '外站页面通常默认按低价优先排序，所以可能先显示晚班机。',
            '',
            '建议操作：可在下方多平台入口中任选其一，再在页面顶部将「起飞时间」切到「早-午 / 上午」筛选。',
            linkLines,
        ].join('\n');
    }

    /**
     * Build Gemini conversation history
     */
    private buildGeminiHistory(context: UserContext): { role: string; parts: { text: string }[] }[] {
        const history: { role: string; parts: { text: string }[] }[] = [];

        if (context.conversationHistory && context.conversationHistory.length > 0) {
            const recentHistory = context.conversationHistory.slice(-6);
            for (const msg of recentHistory) {
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        return history;
    }

    /**
     * Build system prompt with 4.1 Orchestrator Routing Policy + P0-A/D enhancements
     */
    private buildSystemPrompt(context: UserContext): string {
        const registry = getToolRegistry();
        const toolNames = registry.getToolNames();

        // 获取当前时间（关键：解决 LLM 训练截止日期问题）
        const now = new Date();
        const currentDate = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        const currentTime = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let prompt = `You are Lumi's SuperAgent Orchestrator.

**⏰ Current Time Information (CRITICAL)**
- Today is: ${currentDate}
- Current time: ${currentTime}
- Note: Your training data has a cutoff date, but user's "today", "now", "latest" refer to the above date

**Primary Goal:**
- Solve user problems with the best available method.
- If the user request requires real-time facts (prices, availability, schedules, locations, current events), you MUST obtain live evidence before presenting specifics.

**P0-A Answer Aggregator (MANDATORY Priority):**

When multiple tools are called, use this STRICT priority order to determine which EvidencePack to use:

1) If \`web_exec.success === true\` AND \`evidence.items.length > 0\`
   → Use web_exec EvidencePack for your answer (MUST cite sources)

2) Otherwise if \`live_search.success === true\` AND \`evidence.items.length > 0\`
   → Use live_search EvidencePack for your answer (MUST cite sources)

3) Otherwise → Enter "双失败兜底" mode (P1-1):
   - DO NOT provide any specific prices, links, or availability
   - Show \`fallback.missing_constraints\` from the failed response
   - Provide CTAs: "请补充日期" / "请打开第三方链接"

**Routing Policy (Hard Rules):**

1) **Determine intent_domain:**
   - \`ticketing\`: 机票/火车票/高铁/航班/车次/时刻表/余票
   - \`travel\`: 酒店/住宿/旅游/景点/度假
   - \`ecommerce\`: 购买/下单/商品/价格比较
   - \`knowledge\`: 其他信息查询

2) **Determine needs_live_data:**
   - true if request involves: tickets/flights/trains/hotels/price/availability/real-time status

3) **If needs_live_data = true:**
   a) First call \`live_search(query, locale, intent_domain, max_items)\`
   b) If live_search succeeds, use EvidencePack (with TTL) to answer with citations
   c) If live_search fails and task requires website interaction, call \`web_exec\` with step plan

4) **If there is NO EvidencePack:**
   - DO NOT provide specific prices, booking links, or availability claims
   - DO NOT fabricate any real-time data
   - Ask for missing constraints (出发日期, 人数, 预算, 舱位偏好)
   - Provide general guidance only

5) **UI Gating (Hard Rule):**
   - If intent_domain is \`ticketing\` or \`travel\`, DO NOT surface ecommerce offers
   - Hide ecommerce product recommendations for travel queries

**P0-D Forced Citations (MANDATORY):**

- You may ONLY cite information from \`evidence.items[]\`
- Every specific price, availability, or link MUST have a citation in format: [来源: source_name](url)
- If \`evidence.items.length === 0\`: FORBIDDEN to output specific prices/links/余票数
- Citation format example: "北京到上海机票 ¥800起 [来源: ctrip.com](https://ctrip.com)"

**Available Tools:**
${toolNames.map(name => `- ${name}`).join('\n')}

**Tool Usage Rules:**
- \`live_search\`: 用于实时信息查询 (机票/车票/酒店/新闻/金融)
- \`web_exec\`: 用于需要浏览器执行的只读任务
- \`price_compare\`: 仅用于电商实物商品价格比较
- \`knowledge_qa\`: 用于帮助回复消息或润色文字

**Output Format Rules:**
- Always include route_decision (intent_domain + needs_live_data)
- If evidence exists, MUST include citations: [来源: source_name](url)
- Provide clear fallback CTAs when live data is unavailable:
  - "请补充出发日期"
  - "请确认出发地和目的地"
  - "请说明舱位偏好（经济舱/商务舱）"

**Multi-turn Context:**
- This is a multi-turn conversation - carefully read previous history
- If user's current message adds info to previous question (date, quantity, location), combine context
- Example: Previous "伦敦到大连的机票" + Current "2月14日" = query with date constraint

**Language & Format:**
- Respond in Chinese (中文)
- Use Markdown formatting (headers, lists, bold) for readability`;

        if (context.preferences) {
            prompt += `\n\n**User Preferences:** ${JSON.stringify(context.preferences)}`;
        }

        if (context.recentQueries && context.recentQueries.length > 0) {
            prompt += `\n\n**Conversation Context (chronological):**\n${context.recentQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        return prompt;
    }

    /**
     * Simple LLM call without tools (fallback)
     */
    private async simpleLLMCall(query: string): Promise<string> {
        const client = await getGeminiClient(this.apiKey);
        const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });

        const result = await model.generateContent(query);
        return result.response.text() || '抱歉，我无法回答这个问题。';
    }

    /**
     * Legacy method: solve() - wraps processWithReAct for backward compatibility
     */
    async solve(question: string, context: UserContext = {}): Promise<LegacySolution> {
        console.log(`[SuperAgent] solve() called with question: "${question}"`);
        const response = await this.processWithReAct(question, context);
        console.log(`[SuperAgent] solve() got response:`, response.answer.substring(0, 100) + '...');

        // Convert to legacy format
        return {
            answer: response.answer,
            reasoning: response.toolsUsed.length > 0
                ? `使用了 ${response.toolsUsed.join('、')} 来回答您的问题`
                : undefined,
            skillsUsed: response.toolsUsed,
            results: response.toolResults.map(r => ({
                success: r.success,
                data: r.output,
                confidence: r.success ? 0.9 : 0,
                error: r.error,
                executionTimeMs: r.executionTimeMs,
                skillId: r.toolName,
                skillName: r.toolName
            })),
            confidence: response.confidence,
            executionTimeMs: response.executionTimeMs,
            marketplace_trace_id: response.marketplace_trace_id,
            marketplace_selected_agents: response.marketplace_selected_agents,
            marketplace_fallback_used: response.marketplace_fallback_used,
        };
    }
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

interface LegacySolution {
    answer: string;
    reasoning?: string;
    skillsUsed: string[];
    results: SkillResult[];
    confidence: number;
    executionTimeMs: number;
    followUpSuggestions?: string[];
    marketplace_trace_id?: string;
    marketplace_selected_agents?: Array<{ task_id: string; agent_id: string }>;
    marketplace_fallback_used?: boolean;
}

// ============================================================================
// Singleton
// ============================================================================

let superAgentInstance: SuperAgentService | null = null;

export function getSuperAgent(): SuperAgentService {
    if (!superAgentInstance) {
        superAgentInstance = new SuperAgentService();
    }
    return superAgentInstance;
}
