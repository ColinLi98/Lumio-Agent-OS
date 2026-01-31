/**
 * Profiling Service - Digital Twin Engine
 * 
 * Asynchronously analyzes user interactions to build a "Digital Twin" profile.
 * This service runs in the background (fire-and-forget) without blocking the UI.
 */

import { GoogleGenAI } from '@google/genai';
import { Tool } from './toolRegistry';

// ============================================================================
// Types
// ============================================================================

export interface ProfilingResult {
    tags: string[];
    dimension: 'consumption' | 'knowledge' | 'personality';
    confidence: number;
    timestamp: number;
}

export interface DigitalTwinProfile {
    userId: string;
    traits: {
        consumption: string[];  // e.g., ['理性消费', '科技达人', '价格敏感']
        knowledge: string[];    // e.g., ['科技爱好者', '深度阅读者']
        personality: string[]; // e.g., ['高情商沟通', '直接表达']
    };
    lastUpdated: number;
}

// ============================================================================
// Global State
// ============================================================================

let globalApiKey: string = '';
let digitalTwinProfile: DigitalTwinProfile = {
    userId: 'default',
    traits: {
        consumption: [],
        knowledge: [],
        personality: []
    },
    lastUpdated: Date.now()
};

// Subscribers for profile updates
const profileUpdateListeners: ((result: ProfilingResult) => void)[] = [];

export function setProfilingApiKey(apiKey: string) {
    globalApiKey = apiKey;
    console.log('[ProfilingService] API Key configured');
}

// ============================================================================
// Profile Update Subscription
// ============================================================================

/**
 * Subscribe to profile updates (for UI feedback)
 */
export function onProfileUpdate(callback: (result: ProfilingResult) => void): () => void {
    profileUpdateListeners.push(callback);
    return () => {
        const index = profileUpdateListeners.indexOf(callback);
        if (index > -1) profileUpdateListeners.splice(index, 1);
    };
}

/**
 * Notify all listeners of a profile update
 */
function notifyProfileUpdate(result: ProfilingResult) {
    profileUpdateListeners.forEach(listener => {
        try {
            listener(result);
        } catch (e) {
            console.error('[ProfilingService] Listener error:', e);
        }
    });
}

// ============================================================================
// Shadow Profiling Implementation
// ============================================================================

/**
 * Run Shadow Profiling - Fire and Forget
 * 
 * CRITICAL: This function must NOT be awaited in the main flow.
 * It runs silently in the background to analyze user interactions.
 * 
 * @param query - The user's original query
 * @param toolName - The tool that was executed
 * @param toolOutput - The result from the tool execution
 * @param profiling - Optional profiling config from the tool
 */
export async function runShadowProfiling(
    query: string,
    toolName: string,
    toolOutput: any,
    profiling?: {
        target_dimension: 'consumption' | 'knowledge' | 'personality';
        instruction: string;
    }
): Promise<ProfilingResult | null> {
    console.log(`[ShadowProfiler] 🔮 Starting background analysis for: ${toolName}`);

    // Determine dimension based on tool or explicit config
    const dimension = profiling?.target_dimension || inferDimension(toolName);
    const instruction = profiling?.instruction || getDefaultInstruction(toolName);

    try {
        let tags: string[] = [];

        if (globalApiKey) {
            // Use Gemini to analyze the interaction
            const ai = new GoogleGenAI({ apiKey: globalApiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `分析以下用户交互，提取用户特征标签：

用户查询: "${query}"
使用的工具: ${toolName}
工具输出摘要: ${JSON.stringify(toolOutput).substring(0, 500)}

${instruction}

请返回 JSON 格式：
{
    "tags": ["标签1", "标签2"],
    "reasoning": "分析理由"
}

标签应该是简短的中文描述，例如："理性消费"、"科技达人"、"价格敏感"、"深度阅读者"。
最多返回3个最相关的标签。`
            });

            const text = response.text;
            if (text) {
                const parsed = parseJsonResponse(text);
                if (parsed?.tags && Array.isArray(parsed.tags)) {
                    tags = parsed.tags.slice(0, 3);
                    console.log(`[ShadowProfiler] 🏷️ Extracted tags:`, tags);
                }
            }
        } else {
            // Fallback: Use heuristic tagging
            tags = getHeuristicTags(query, toolName, toolOutput);
        }

        if (tags.length === 0) {
            console.log('[ShadowProfiler] No tags extracted');
            return null;
        }

        // Update Digital Twin Profile
        const existingTags = digitalTwinProfile.traits[dimension];
        const newTags = tags.filter(t => !existingTags.includes(t));

        if (newTags.length > 0) {
            digitalTwinProfile.traits[dimension] = [...existingTags, ...newTags].slice(-10); // Keep last 10
            digitalTwinProfile.lastUpdated = Date.now();

            console.log(`[ShadowProfiler] ✨ Digital Twin updated:`, {
                dimension,
                newTags,
                allTraits: digitalTwinProfile.traits[dimension]
            });
        }

        const result: ProfilingResult = {
            tags: newTags.length > 0 ? newTags : tags,
            dimension,
            confidence: globalApiKey ? 0.85 : 0.6,
            timestamp: Date.now()
        };

        // 🔥 Notify UI of the update
        if (newTags.length > 0) {
            notifyProfileUpdate(result);
        }

        return result;

    } catch (error) {
        console.error('[ShadowProfiler] Error:', error);
        return null;
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Infer the profiling dimension from tool name
 */
function inferDimension(toolName: string): 'consumption' | 'knowledge' | 'personality' {
    switch (toolName) {
        case 'price_compare':
            return 'consumption';
        case 'web_search':
            return 'knowledge';
        case 'knowledge_qa':
            return 'personality';
        default:
            return 'knowledge';
    }
}

/**
 * Get default profiling instruction for a tool
 */
function getDefaultInstruction(toolName: string): string {
    switch (toolName) {
        case 'price_compare':
            return '分析用户的价格敏感度（预算型 vs 品质型）和平台偏好。';
        case 'web_search':
            return '分析用户的好奇心深度和兴趣主题领域。';
        case 'knowledge_qa':
            return '分析用户的沟通风格偏好和社交互动模式。';
        default:
            return '分析用户的行为特征和偏好。';
    }
}

/**
 * Heuristic tagging when no API available
 */
function getHeuristicTags(query: string, toolName: string, output: any): string[] {
    const tags: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (toolName === 'price_compare') {
        // Price sensitivity analysis
        if (/便宜|低价|优惠|省钱|平替/.test(query)) {
            tags.push('价格敏感');
        }
        if (/最好|高端|品质|正品/.test(query)) {
            tags.push('品质优先');
        }
        if (/手机|电脑|耳机|科技/.test(query)) {
            tags.push('科技达人');
        }
        if (tags.length === 0) {
            tags.push('理性消费');
        }
    } else if (toolName === 'web_search') {
        // Knowledge interest analysis
        if (/是谁|什么是|历史|起源/.test(query)) {
            tags.push('深度阅读者');
        }
        if (/最新|新闻|热点/.test(query)) {
            tags.push('信息追踪者');
        }
        if (/教程|怎么|如何|学习/.test(query)) {
            tags.push('学习型用户');
        }
        if (tags.length === 0) {
            tags.push('好奇心强');
        }
    } else if (toolName === 'knowledge_qa') {
        // Personality analysis
        if (/礼貌|得体|委婉/.test(query)) {
            tags.push('高情商沟通');
        }
        if (/拒绝|不想|婉拒/.test(query)) {
            tags.push('边界意识强');
        }
        if (/直接|直说|直白/.test(query)) {
            tags.push('直接表达');
        }
        if (tags.length === 0) {
            tags.push('注重表达');
        }
    }

    return tags;
}

/**
 * Parse JSON from LLM response
 */
function parseJsonResponse(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch { }
        }
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx > startIdx) {
            try {
                return JSON.parse(text.substring(startIdx, endIdx + 1));
            } catch { }
        }
        return null;
    }
}

// ============================================================================
// Profile Access
// ============================================================================

/**
 * Get current Digital Twin profile
 */
export function getDigitalTwinProfile(): DigitalTwinProfile {
    return { ...digitalTwinProfile };
}

/**
 * Get all traits as a flat array
 */
export function getAllTraits(): string[] {
    return [
        ...digitalTwinProfile.traits.consumption,
        ...digitalTwinProfile.traits.knowledge,
        ...digitalTwinProfile.traits.personality
    ];
}

/**
 * Clear profile (for testing)
 */
export function resetProfile(): void {
    digitalTwinProfile = {
        userId: 'default',
        traits: {
            consumption: [],
            knowledge: [],
            personality: []
        },
        lastUpdated: Date.now()
    };
}
