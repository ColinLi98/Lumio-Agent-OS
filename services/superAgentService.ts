/**
 * Super Agent Service - 超级代理 (V5.1 - Gemini)
 * 
 * General-Purpose Autonomous Agent using Gemini Function Calling.
 * Implements a ReAct (Reasoning + Acting) loop for multi-turn tool execution.
 */

// Note: @google/generative-ai is imported dynamically in getGeminiClient()
import { getToolRegistry, setToolRegistryApiKey, GeminiFunctionDeclaration } from './toolRegistry';
import { runShadowProfiling, setProfilingApiKey, ProfilingResult, onProfileUpdate } from './profilingService';
import { getMemR3Router } from './memr3Service';
import { SkillResult } from './skillRegistry';
import { getPlanGenerator } from './planGenerator';
import { ThreeStagePlan } from './planTypes';
import { track } from './telemetryService';
import { classifyFreshness, createStructuredFallback, type StructuredFallback, type IntentDomain } from './freshnessClassifier';
import { buildFlightActionLinks, parseFlightConstraints, type FlightConstraints } from './flightConstraintParser';

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

        const example = route.intent_domain === 'travel.flight'
            ? '明天早上，上海虹桥到北京首都，经济舱，1人'
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
            executionTimeMs: response.executionTimeMs
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
