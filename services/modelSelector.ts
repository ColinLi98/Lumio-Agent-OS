/**
 * Model Selector Service
 * 智能模型选择器 - 根据任务复杂度自动选择 Flash 或 Pro 模型
 * 
 * 策略：
 * - Flash: 快速、低成本，适合简单任务
 * - Pro: 高质量、深度推理，适合复杂任务
 */

// ============================================================================
// Model Configuration
// ============================================================================

export const MODELS = {
    // Flash 模型 - 快速响应，适合简单任务
    FLASH: 'gemini-3-flash-preview',

    // Pro 模型 - 深度推理，适合复杂任务
    PRO: 'gemini-3-pro-preview',

    // Pro with Thinking - 最强推理能力
    PRO_THINKING: 'gemini-2.5-pro-preview-05-20'
} as const;

export type ModelType = keyof typeof MODELS;
export type ModelId = typeof MODELS[ModelType];

// ============================================================================
// Task Complexity Analysis
// ============================================================================

export interface TaskComplexityResult {
    level: 'simple' | 'medium' | 'complex';
    score: number; // 0-100
    factors: string[];
    recommendedModel: ModelId;
}

/**
 * 复杂度检测规则
 */
const COMPLEXITY_RULES = {
    // 关键词权重
    keywords: {
        // 复杂任务关键词 (+15-25分)
        complex: [
            { pattern: /规划|计划|安排|organize|plan/i, weight: 25 },
            { pattern: /分析|analysis|compare|比较/i, weight: 20 },
            { pattern: /研究|research|investigate/i, weight: 20 },
            { pattern: /创作|写作|compose|write.*article/i, weight: 20 },
            { pattern: /多个|multiple|several|批量/i, weight: 15 },
            { pattern: /详细|详尽|comprehensive|detailed/i, weight: 15 },
            { pattern: /策略|strategy|方案/i, weight: 20 },
            { pattern: /旅行|旅游|travel|trip/i, weight: 18 },
            { pattern: /投资|理财|investment|financial/i, weight: 22 },
            { pattern: /合同|法律|legal|contract/i, weight: 25 },
            { pattern: /代码|编程|programming|code.*review/i, weight: 20 },
        ],
        // 简单任务关键词 (-10-15分)
        simple: [
            { pattern: /天气|weather/i, weight: -15 },
            { pattern: /翻译|translate/i, weight: -10 },
            { pattern: /计算|calculate|算/i, weight: -12 },
            { pattern: /时间|time|几点/i, weight: -10 },
            { pattern: /提醒|remind/i, weight: -8 },
            { pattern: /打开|open|启动/i, weight: -10 },
            { pattern: /搜索|search|查一下/i, weight: -5 },
        ]
    },

    // 长度权重
    length: {
        short: { maxChars: 20, weight: -10 },
        medium: { maxChars: 100, weight: 0 },
        long: { maxChars: 300, weight: 15 },
        veryLong: { maxChars: Infinity, weight: 25 }
    },

    // 特殊模式
    patterns: {
        multiStep: { pattern: /然后|接着|之后|first.*then|step.*1/i, weight: 20 },
        conditional: { pattern: /如果|假如|if.*then|条件/i, weight: 15 },
        comparison: { pattern: /还是|或者|vs|versus|对比/i, weight: 12 },
        reasoning: { pattern: /为什么|why|how.*work|原理/i, weight: 18 }
    }
};

/**
 * 分析任务复杂度
 */
export function analyzeTaskComplexity(
    text: string,
    context?: {
        hasImages?: boolean;
        hasHistory?: boolean;
        historyLength?: number;
        taskType?: string;
    }
): TaskComplexityResult {
    let score = 50; // 基础分数
    const factors: string[] = [];

    // 1. 关键词分析
    for (const rule of COMPLEXITY_RULES.keywords.complex) {
        if (rule.pattern.test(text)) {
            score += rule.weight;
            factors.push(`复杂词汇: +${rule.weight}`);
        }
    }

    for (const rule of COMPLEXITY_RULES.keywords.simple) {
        if (rule.pattern.test(text)) {
            score += rule.weight;
            factors.push(`简单词汇: ${rule.weight}`);
        }
    }

    // 2. 长度分析
    const textLength = text.length;
    if (textLength <= COMPLEXITY_RULES.length.short.maxChars) {
        score += COMPLEXITY_RULES.length.short.weight;
        factors.push('短文本: -10');
    } else if (textLength <= COMPLEXITY_RULES.length.medium.maxChars) {
        // 中等长度不加分
    } else if (textLength <= COMPLEXITY_RULES.length.long.maxChars) {
        score += COMPLEXITY_RULES.length.long.weight;
        factors.push('较长文本: +15');
    } else {
        score += COMPLEXITY_RULES.length.veryLong.weight;
        factors.push('超长文本: +25');
    }

    // 3. 特殊模式分析
    for (const [name, rule] of Object.entries(COMPLEXITY_RULES.patterns)) {
        if (rule.pattern.test(text)) {
            score += rule.weight;
            factors.push(`${name}: +${rule.weight}`);
        }
    }

    // 4. 上下文因素
    if (context) {
        if (context.hasImages) {
            score += 10;
            factors.push('包含图片: +10');
        }

        if (context.hasHistory && context.historyLength && context.historyLength > 5) {
            score += 10;
            factors.push('长对话历史: +10');
        }

        // 特定任务类型
        if (context.taskType === 'coding' || context.taskType === 'analysis') {
            score += 20;
            factors.push('专业任务类型: +20');
        }
    }

    // 5. 标准化分数
    score = Math.max(0, Math.min(100, score));

    // 6. 确定复杂度等级
    let level: 'simple' | 'medium' | 'complex';
    let recommendedModel: ModelId;

    if (score < 35) {
        level = 'simple';
        recommendedModel = MODELS.FLASH;
    } else if (score < 65) {
        level = 'medium';
        recommendedModel = MODELS.FLASH; // 中等也用 Flash，平衡成本
    } else {
        level = 'complex';
        recommendedModel = MODELS.PRO;
    }

    return {
        level,
        score,
        factors,
        recommendedModel
    };
}

// ============================================================================
// Model Selection Interface
// ============================================================================

export interface ModelSelectionConfig {
    preferSpeed?: boolean;      // 优先速度
    preferQuality?: boolean;    // 优先质量
    forceModel?: ModelId;       // 强制使用指定模型
    costSensitive?: boolean;    // 成本敏感
    maxComplexityForFlash?: number; // Flash 最大复杂度阈值
}

/**
 * 智能选择模型
 */
export function selectModel(
    text: string,
    config: ModelSelectionConfig = {},
    context?: {
        hasImages?: boolean;
        hasHistory?: boolean;
        historyLength?: number;
        taskType?: string;
    }
): { model: ModelId; complexity: TaskComplexityResult; reason: string } {
    // 读取用户偏好设置
    let userPreference: string | null = null;
    try {
        userPreference = localStorage.getItem('model_preference');
    } catch (e) {
        // SSR or localStorage not available
    }

    // 根据用户偏好覆盖配置
    if (userPreference === 'flash') {
        config = { ...config, preferSpeed: true };
    } else if (userPreference === 'pro') {
        config = { ...config, preferQuality: true };
    }
    // 'auto' 使用默认的智能选择逻辑

    // 强制模型
    if (config.forceModel) {
        return {
            model: config.forceModel,
            complexity: analyzeTaskComplexity(text, context),
            reason: '用户强制指定模型'
        };
    }

    // 分析复杂度
    const complexity = analyzeTaskComplexity(text, context);

    // 优先速度 -> 始终使用 Flash
    if (config.preferSpeed) {
        return {
            model: MODELS.FLASH,
            complexity,
            reason: userPreference === 'flash' ? '用户偏好: Flash 模式' : '优先速度模式，使用 Flash'
        };
    }

    // 优先质量 -> 始终使用 Pro
    if (config.preferQuality) {
        return {
            model: MODELS.PRO,
            complexity,
            reason: userPreference === 'pro' ? '用户偏好: Pro 模式' : '优先质量模式，使用 Pro'
        };
    }

    // 成本敏感 -> 提高 Flash 阈值
    if (config.costSensitive) {
        const threshold = config.maxComplexityForFlash ?? 75;
        if (complexity.score < threshold) {
            return {
                model: MODELS.FLASH,
                complexity,
                reason: `成本敏感模式，复杂度 ${complexity.score} < ${threshold}，使用 Flash`
            };
        }
    }

    // 默认：根据复杂度自动选择
    return {
        model: complexity.recommendedModel,
        complexity,
        reason: `智能选择: 复杂度 ${complexity.score} (${complexity.level})，使用 ${complexity.recommendedModel === MODELS.PRO ? 'Pro' : 'Flash'}`
    };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * 快速获取推荐模型
 */
export function getRecommendedModel(text: string): ModelId {
    const { model } = selectModel(text);
    return model;
}

/**
 * 检查是否应该使用 Pro 模型
 */
export function shouldUsePro(text: string, context?: { hasImages?: boolean }): boolean {
    const complexity = analyzeTaskComplexity(text, context);
    return complexity.level === 'complex';
}

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(model: ModelId): string {
    switch (model) {
        case MODELS.FLASH:
            return '⚡ Flash (快速)';
        case MODELS.PRO:
            return '🧠 Pro (深度)';
        case MODELS.PRO_THINKING:
            return '💭 Pro (推理)';
        default:
            return model;
    }
}

/**
 * 记录模型使用（用于分析和优化）
 */
export function logModelUsage(
    model: ModelId,
    taskType: string,
    complexity: TaskComplexityResult,
    responseTime?: number
): void {
    console.log(`[ModelSelector] Model: ${model}, Task: ${taskType}, Complexity: ${complexity.score}/${complexity.level}${responseTime ? `, Time: ${responseTime}ms` : ''}`);

    // 可以在这里添加统计逻辑，记录到 localStorage 或发送到分析服务
    try {
        const stats = JSON.parse(localStorage.getItem('model_usage_stats') || '{}');
        const key = model === MODELS.PRO ? 'pro' : 'flash';
        stats[key] = (stats[key] || 0) + 1;
        stats.lastUsed = { model, taskType, complexity: complexity.score, timestamp: Date.now() };
        localStorage.setItem('model_usage_stats', JSON.stringify(stats));
    } catch (e) {
        // Ignore storage errors
    }
}

export default {
    MODELS,
    analyzeTaskComplexity,
    selectModel,
    getRecommendedModel,
    shouldUsePro,
    getModelDisplayName,
    logModelUsage
};
