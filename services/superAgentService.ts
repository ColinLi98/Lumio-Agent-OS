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
                model: 'gemini-3-pro-preview',  // Phase 3.4: Gemini 3 Pro Preview
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
            const finalText = result.text() || '处理完成，但未生成回复。';

            // Calculate confidence
            const successfulResults = toolResults.filter(r => r.success);
            const confidence = toolResults.length > 0
                ? successfulResults.length / toolResults.length
                : 0.7;

            const executionTimeMs = Math.round(performance.now() - startTime);
            console.log(`[SuperAgent] ✅ Completed in ${executionTimeMs}ms, ${turns} turns, ${toolsUsed.length} tools`);

            return {
                answer: finalText,
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
     * Build system prompt with context
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

        let prompt = `你是 Lumi，一个智能助手。你的目标是尽可能准确、有帮助地回答用户的问题。

**⏰ 当前时间信息（非常重要！）**
- 今天是：${currentDate}
- 当前时间：${currentTime}
- 请注意：你的训练数据可能有截止日期，但用户询问的"今天"、"现在"、"最新"都指的是上述日期
- 当用户问实时信息（如价格、新闻、天气）时，必须使用 web_search 获取最新数据

**重要：多轮对话上下文**
- 你正在进行的是多轮对话，请仔细阅读之前的对话历史
- 如果用户的当前问题看起来是对之前问题的补充信息（如日期、数量、地点），请结合上下文理解
- 例如：如果用户之前问"伦敦到大连的机票"，现在说"2月14日"，这是在提供日期信息，你应该继续查询机票
- 不要孤立地回答当前问题，要理解它在对话中的含义

你有以下工具可以使用:
${toolNames.map(name => `- ${name}`).join('\n')}

使用规则:
1. 根据用户问题，决定是否需要调用工具
2. 如果问题是关于【电商实物商品】价格，使用 price_compare
3. 如果问题需要搜索实时信息、查询人物/事件/金融行情/机票/新闻，使用 web_search  
4. 如果用户需要帮助回复消息或润色文字，使用 knowledge_qa
5. 如果问题不需要工具（如闲聊、简单问答），直接回答即可
6. 回答时使用友好、专业的语气，用中文回复
7. 用 Markdown 格式组织回答，使用标题、列表、粗体等`;

        if (context.preferences) {
            prompt += `\n\n用户偏好: ${JSON.stringify(context.preferences)}`;
        }

        if (context.recentQueries && context.recentQueries.length > 0) {
            prompt += `\n\n对话上下文（按时间顺序）:\n${context.recentQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        return prompt;
    }

    /**
     * Simple LLM call without tools (fallback)
     */
    private async simpleLLMCall(query: string): Promise<string> {
        const client = await getGeminiClient(this.apiKey);
        const model = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });  // Phase 3.4

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
