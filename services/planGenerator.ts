/**
 * Plan Generator - Phase 2 Week 2-1
 * 
 * Three-Stage Plan Generation:
 * 1. Plan: 3-7 modular steps
 * 2. Execute: Primary high-priority action
 * 3. Follow-up: Monitoring conditions
 * 
 * Integrates with Soul Matrix for personalized planning.
 */

import {
    ThreeStagePlan,
    PlanStage,
    ExecuteStage,
    FollowupStage,
    PlanStep,
    PlanGenerationRequest,
    PlanGenerationResult,
    PlanMetadata,
} from './planTypes.js';
import { getSoulMatrixStore } from './soulMatrixStore.js';

// ============================================================================
// Constants
// ============================================================================

const PLAN_GENERATION_TIMEOUT = 30000; // 30s
const MIN_STEPS = 3;
const MAX_STEPS = 7;

// ============================================================================
// Prompt Templates
// ============================================================================

const SYSTEM_PROMPT = `你是 Lumi，一个智能生活规划助手。你的任务是将用户请求转化为可执行的三段式计划。

输出必须是有效的 JSON，格式如下：
{
  "plan": {
    "steps": [
      {
        "step_number": 1,
        "title": "简短标题",
        "description": "详细描述",
        "action_type": "save_task" | "set_reminder" | "open_market" | "external_link" | null,
        "action_data": {},
        "is_primary": true/false,
        "estimated_minutes": 10
      }
    ],
    "estimated_time_minutes": 60,
    "confidence": 0.85,
    "summary": "计划总结"
  },
  "execute": {
    "action_type": "open_market",
    "action_data": { "intent_query": "..." },
    "cta_label": "立即执行",
    "priority": "high",
    "rationale": "为什么这是首要行动"
  },
  "followup": {
    "conditions": ["条件1", "条件2"],
    "suggestions": ["建议1", "建议2"],
    "reminder_message": "提醒消息"
  }
}

规则：
1. steps 数量必须在 3-7 个之间
2. 有且仅有一个 step 的 is_primary 为 true
3. action_type 只能是: save_task, set_reminder, open_market, external_link, 或 null
4. 如果涉及购买，使用 open_market；如果需要提醒，使用 set_reminder
5. 时间估算要合理，单位是分钟
6. 回答必须完全是 JSON，不要有其他文字`;

function buildUserPrompt(query: string, soulContext: string): string {
    return `用户请求: "${query}"

用户画像:
${soulContext || '暂无画像数据'}

请为用户生成一个三段式可执行计划。`;
}

// ============================================================================
// Soul Matrix Integration
// ============================================================================

function getSoulContext(): string {
    try {
        const store = getSoulMatrixStore();
        const traits = store.getConfirmedTraits();

        const sections: string[] = [];

        // Objective Weights (W3-3)
        const weightsPrompt = store.getWeightsPrompt();
        if (weightsPrompt) {
            sections.push(`目标优先级:\n${weightsPrompt}`);
        }

        // Confirmed traits
        if (traits.length > 0) {
            const confirmedTraits = traits
                .filter(t => t.confidence >= 0.6)
                .slice(0, 5)
                .map(t => `- ${t.key}: ${t.value} (置信度: ${Math.round(t.confidence * 100)}%)`)
                .join('\n');

            if (confirmedTraits) {
                sections.push(`已确认特征:\n${confirmedTraits}`);
            }
        }

        return sections.length > 0 ? sections.join('\n\n') : '暂无用户画像数据';
    } catch {
        return '无法获取用户画像';
    }
}

// ============================================================================
// JSON Parsing
// ============================================================================

function extractJSON(text: string): object | null {
    // Try direct parse first
    try {
        return JSON.parse(text);
    } catch {
        // Try to extract JSON from markdown code block
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch {
                // Continue to next attempt
            }
        }

        // Try to find JSON object in text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch {
                return null;
            }
        }

        return null;
    }
}

function validatePlanSchema(data: unknown): ThreeStagePlan | null {
    if (!data || typeof data !== 'object') return null;

    const obj = data as Record<string, unknown>;

    // Check required fields
    if (!obj.plan || typeof obj.plan !== 'object') return null;
    if (!obj.followup || typeof obj.followup !== 'object') return null;

    const plan = obj.plan as Record<string, unknown>;
    if (!Array.isArray(plan.steps) || plan.steps.length < MIN_STEPS) {
        return null;
    }

    // Validate steps
    const steps: PlanStep[] = [];
    for (let i = 0; i < Math.min(plan.steps.length, MAX_STEPS); i++) {
        const step = plan.steps[i] as Record<string, unknown>;
        steps.push({
            step_number: i + 1,
            title: String(step.title || `步骤 ${i + 1}`),
            description: String(step.description || ''),
            action_type: step.action_type as PlanStep['action_type'],
            action_data: step.action_data as Record<string, unknown>,
            is_primary: Boolean(step.is_primary),
            estimated_minutes: Number(step.estimated_minutes) || 10,
        });
    }

    // Ensure at least one primary step
    if (!steps.some(s => s.is_primary)) {
        steps[0].is_primary = true;
    }

    const planStage: PlanStage = {
        steps,
        estimated_time_minutes: Number(plan.estimated_time_minutes) || steps.reduce((sum, s) => sum + (s.estimated_minutes || 10), 0),
        confidence: Math.min(1, Math.max(0, Number(plan.confidence) || 0.75)),
        summary: String(plan.summary || ''),
    };

    // Parse execute stage (optional)
    let executeStage: ExecuteStage | null = null;
    if (obj.execute && typeof obj.execute === 'object') {
        const exec = obj.execute as Record<string, unknown>;
        executeStage = {
            action_type: exec.action_type as ExecuteStage['action_type'],
            action_data: (exec.action_data as Record<string, unknown>) || {},
            cta_label: String(exec.cta_label || '执行'),
            priority: exec.priority === 'medium' ? 'medium' : 'high',
            rationale: String(exec.rationale || ''),
        };
    }

    // Parse followup stage
    const followup = obj.followup as Record<string, unknown>;
    const followupStage: FollowupStage = {
        conditions: Array.isArray(followup.conditions)
            ? followup.conditions.map(String)
            : [],
        suggestions: Array.isArray(followup.suggestions)
            ? followup.suggestions.map(String)
            : [],
        reminder_message: followup.reminder_message ? String(followup.reminder_message) : undefined,
    };

    return {
        plan: planStage,
        execute: executeStage,
        followup: followupStage,
        raw_answer: '',
        metadata: {
            generated_at: Date.now(),
            model: 'gemini-2.0-flash',
            query: '',
            context_factors: [],
            generation_time_ms: 0,
        },
    };
}

// ============================================================================
// Plan Generator Service
// ============================================================================

class PlanGenerator {
    private apiKey: string = '';

    setApiKey(key: string): void {
        this.apiKey = key;
    }

    async generate(request: PlanGenerationRequest): Promise<PlanGenerationResult> {
        const startTime = Date.now();

        if (!this.apiKey) {
            return {
                success: false,
                plan: null,
                error: 'API key not configured',
            };
        }

        try {
            // Build prompt with Soul Matrix context
            const soulContext = getSoulContext();
            const userPrompt = buildUserPrompt(request.query, soulContext);

            // Call Gemini API
            const response = await this.callGemini(userPrompt);

            if (!response) {
                return {
                    success: false,
                    plan: null,
                    error: 'No response from LLM',
                    fallback_answer: '抱歉，无法生成计划。请稍后再试。',
                };
            }

            // Parse structured output
            const parsed = extractJSON(response);
            if (!parsed) {
                // Return raw response as fallback
                return {
                    success: true,
                    plan: this.createFallbackPlan(request.query, response, startTime),
                    fallback_answer: response,
                };
            }

            // Validate schema
            const plan = validatePlanSchema(parsed);
            if (!plan) {
                return {
                    success: true,
                    plan: this.createFallbackPlan(request.query, response, startTime),
                    fallback_answer: response,
                };
            }

            // Enrich metadata
            plan.raw_answer = response;
            plan.metadata = {
                generated_at: Date.now(),
                model: 'gemini-2.0-flash',
                query: request.query,
                context_factors: soulContext.split('\n').filter(l => l.startsWith('-')).map(l => l.slice(2)),
                generation_time_ms: Date.now() - startTime,
            };

            return {
                success: true,
                plan,
            };

        } catch (error) {
            console.error('[PlanGenerator] Error:', error);
            return {
                success: false,
                plan: null,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private async callGemini(userPrompt: string): Promise<string | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PLAN_GENERATION_TIMEOUT);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                            { role: 'model', parts: [{ text: '我理解了。我会输出纯 JSON 格式的三段式计划。' }] },
                            { role: 'user', parts: [{ text: userPrompt }] },
                        ],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2048,
                        },
                    }),
                    signal: controller.signal,
                }
            );

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

        } catch (error) {
            clearTimeout(timeout);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    private createFallbackPlan(query: string, rawAnswer: string, startTime: number): ThreeStagePlan {
        // Create a minimal valid plan from raw answer
        return {
            plan: {
                steps: [
                    {
                        step_number: 1,
                        title: '分析需求',
                        description: '理解用户需求并制定方案',
                        is_primary: false,
                        estimated_minutes: 5,
                    },
                    {
                        step_number: 2,
                        title: '执行任务',
                        description: rawAnswer.slice(0, 200),
                        is_primary: true,
                        estimated_minutes: 30,
                    },
                    {
                        step_number: 3,
                        title: '确认结果',
                        description: '验证任务完成情况',
                        is_primary: false,
                        estimated_minutes: 5,
                    },
                ],
                estimated_time_minutes: 40,
                confidence: 0.5,
                summary: `关于 "${query}" 的执行计划`,
            },
            execute: null,
            followup: {
                conditions: ['任务完成后检查结果'],
                suggestions: ['根据需要调整计划'],
            },
            raw_answer: rawAnswer,
            metadata: {
                generated_at: Date.now(),
                model: 'fallback',
                query,
                context_factors: [],
                generation_time_ms: Date.now() - startTime,
            },
        };
    }
}

// ============================================================================
// Singleton
// ============================================================================

let generatorInstance: PlanGenerator | null = null;

export function getPlanGenerator(): PlanGenerator {
    if (!generatorInstance) {
        generatorInstance = new PlanGenerator();
    }
    return generatorInstance;
}

export { PlanGenerator };
