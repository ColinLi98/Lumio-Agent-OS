/**
 * Super Agent Service - 超级代理 (V5.0 - DeepSeek)
 * 
 * General-Purpose Autonomous Agent using DeepSeek Function Calling.
 * Implements a ReAct (Reasoning + Acting) loop for multi-turn tool execution.
 */

import { getDeepSeekClient, setDeepSeekApiKey, DeepSeekMessage, DeepSeekTool, DeepSeekToolCall } from './deepseekClient';
import { getToolRegistry, setToolRegistryApiKey, GeminiFunctionDeclaration } from './toolRegistry';
import { runShadowProfiling, setProfilingApiKey, ProfilingResult, onProfileUpdate } from './profilingService';
import { getMemR3Router } from './memr3Service';
import { SkillResult } from './skillRegistry';

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
// Super Agent Service (V5.0 - DeepSeek Function Calling)
// ============================================================================

export class SuperAgentService {
    private apiKey: string = '';

    /**
     * Set API Key for all components
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;

        // Initialize DeepSeek client
        setDeepSeekApiKey(apiKey);

        // Configure all dependent services (they may still use their own keys)
        setToolRegistryApiKey(apiKey);
        setProfilingApiKey(apiKey);

        // Legacy: Also set for builtinSkills if still used elsewhere
        import('./builtinSkills').then(mod => {
            mod.setSkillsApiKey(apiKey);
        }).catch(() => { });

        console.log('[SuperAgent] V5.0 Brain initialized with DeepSeek');
    }

    /**
     * Core Method: Process user query using ReAct Loop with DeepSeek
     */
    async processWithReAct(
        query: string,
        context: UserContext = {}
    ): Promise<AgentResponse> {
        const startTime = performance.now();
        console.log(`[SuperAgent] 🧠 ReAct Loop starting for: "${query}"`);

        const toolsUsed: string[] = [];
        const toolResults: ToolExecutionResult[] = [];
        let profilingResult: ProfilingResult | null = null;

        try {
            if (!this.apiKey) {
                throw new Error('API Key not configured');
            }

            // 1. Get tools from registry and convert to DeepSeek format
            const registry = getToolRegistry();
            const geminiTools = registry.getGeminiTools();
            const deepSeekTools = this.convertToDeepSeekTools(geminiTools);
            console.log(`[SuperAgent] 🔧 Available tools: ${registry.getToolNames().join(', ')}`);

            // 2. Build messages
            const systemPrompt = this.buildSystemPrompt(context);
            const messages: DeepSeekMessage[] = this.buildMessages(query, context, systemPrompt);

            // 3. Get DeepSeek client
            const client = getDeepSeekClient();

            // 4. First API call with tools
            console.log('[SuperAgent] 📡 Sending request to DeepSeek...');
            let response = await client.chat({
                model: 'deepseek-chat',
                messages: messages,
                tools: deepSeekTools.length > 0 ? deepSeekTools : undefined,
                tool_choice: deepSeekTools.length > 0 ? 'auto' : undefined,
                temperature: 0.7
            });

            // 5. ReAct Loop: Handle function calls
            const MAX_TURNS = 5;
            let turns = 0;
            let currentMessages = [...messages];

            while (turns < MAX_TURNS) {
                const choice = response.choices[0];
                const assistantMessage = choice.message;

                // Check for tool calls
                if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                    console.log(`[SuperAgent] ✅ No tool calls, exiting loop`);
                    break;
                }

                console.log(`[SuperAgent] 🔄 Turn ${turns + 1}: ${assistantMessage.tool_calls.length} tool call(s)`);

                // Add assistant message to history
                currentMessages.push(assistantMessage);

                // Execute all tool calls
                for (const toolCall of assistantMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    let toolArgs: Record<string, any> = {};

                    try {
                        toolArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.error(`[SuperAgent] Failed to parse tool args:`, toolCall.function.arguments);
                    }

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

                        // 🔥 Shadow Profiling (Fire-and-Forget)
                        runShadowProfiling(query, toolName, output, tool.profiling)
                            .then(result => {
                                if (result) {
                                    profilingResult = result;
                                    console.log(`[SuperAgent] 👻 Shadow profiling:`, result.tags);
                                }
                            })
                            .catch(err => console.error('[Shadow] Error:', err));

                    } catch (e) {
                        success = false;
                        error = e instanceof Error ? e.message : String(e);
                        output = { error };
                        console.error(`[SuperAgent] ❌ Tool error:`, error);
                    }

                    const execTime = Math.round(performance.now() - execStart);
                    toolResults.push({ toolName, args: toolArgs, output, success, error, executionTimeMs: execTime });

                    // Add tool result to messages
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(output)
                    });
                }

                // Continue the conversation with tool results
                response = await client.chat({
                    model: 'deepseek-chat',
                    messages: currentMessages,
                    tools: deepSeekTools.length > 0 ? deepSeekTools : undefined,
                    tool_choice: 'auto',
                    temperature: 0.7
                });

                turns++;
            }

            // 6. Extract final answer
            const finalChoice = response.choices[0];
            const finalText = finalChoice.message.content || '处理完成，但未生成回复。';

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
     * Convert Gemini tool format to DeepSeek format
     * DeepSeek uses standard JSON Schema (lowercase types) while Gemini uses uppercase
     */
    private convertToDeepSeekTools(geminiTools: GeminiFunctionDeclaration[]): DeepSeekTool[] {
        return geminiTools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: this.convertParametersToJsonSchema(tool.parameters)
            }
        }));
    }

    /**
     * Convert Gemini parameter format to standard JSON Schema format
     * Gemini uses uppercase types (STRING, NUMBER, etc.) but DeepSeek needs lowercase
     */
    private convertParametersToJsonSchema(params: any): any {
        if (!params) return params;

        const converted: any = { ...params };

        // Convert type from Gemini format (UPPERCASE) to JSON Schema (lowercase)
        if (converted.type) {
            converted.type = converted.type.toLowerCase();
        }

        // Recursively convert properties
        if (converted.properties) {
            const newProps: any = {};
            for (const [key, value] of Object.entries(converted.properties)) {
                newProps[key] = this.convertParametersToJsonSchema(value);
            }
            converted.properties = newProps;
        }

        // Handle array items
        if (converted.items) {
            converted.items = this.convertParametersToJsonSchema(converted.items);
        }

        return converted;
    }

    /**
     * Build messages array for DeepSeek
     */
    private buildMessages(query: string, context: UserContext, systemPrompt: string): DeepSeekMessage[] {
        const messages: DeepSeekMessage[] = [];

        // System message
        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history if available
        if (context.conversationHistory && context.conversationHistory.length > 0) {
            const recentHistory = context.conversationHistory.slice(-10);
            for (const msg of recentHistory) {
                messages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                });
            }
        }

        // Add current query
        messages.push({
            role: 'user',
            content: query
        });

        return messages;
    }

    /**
     * Build system prompt with context
     */
    private buildSystemPrompt(context: UserContext): string {
        const registry = getToolRegistry();
        const toolNames = registry.getToolNames();

        let prompt = `你是 Lumi，一个智能助手。你的目标是尽可能准确、有帮助地回答用户的问题。

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
3. 如果问题需要搜索信息、查询人物/事件/金融行情/机票，使用 web_search  
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
        const client = getDeepSeekClient();

        const response = await client.chat({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: '你是 Lumi，一个智能助手。请用中文回答问题。' },
                { role: 'user', content: query }
            ],
            temperature: 0.7
        });

        return response.choices[0]?.message?.content || '抱歉，我无法回答这个问题。';
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

export interface LegacySolution {
    answer: string;
    reasoning?: string;
    skillsUsed: string[];
    results: SkillResult[];
    confidence: number;
    followUpSuggestions?: string[];
    executionTimeMs: number;
}

// Re-export legacy types for compatibility
export interface Understanding {
    originalQuestion: string;
    intent: string;
    subQuestions: string[];
    extractedParams: Record<string, any>;
    requiredCapabilities: string[];
    urgency: 'low' | 'medium' | 'high';
    complexity: 'simple' | 'moderate' | 'complex';
}

export interface ExecutionStep {
    skillId: string;
    skill: any;
    input: Record<string, any>;
    dependsOn?: string[];
    parallel: boolean;
}

export interface ExecutionPlan {
    steps: ExecutionStep[];
    synthesisStrategy: string;
}

export type Solution = LegacySolution;

// ============================================================================
// Singleton Export
// ============================================================================

let superAgentInstance: SuperAgentService | null = null;

export function getSuperAgent(): SuperAgentService {
    if (!superAgentInstance) {
        superAgentInstance = new SuperAgentService();
    }
    return superAgentInstance;
}

// Export for direct import
export { onProfileUpdate } from './profilingService';
