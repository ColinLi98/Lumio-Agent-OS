/**
 * Bellman Life Service - 人生优化引擎
 * 
 * 实现 Bellman 方程求解最优人生策略：
 * V(s) = max_a [ R(s,a) + γ * Σ P(s'|s,a) * V(s') ]
 * 
 * 核心理念：既然当前状态已是既定事实，我们只能优化从当前状态出发的路径
 */

import {
    LifeState,
    LifeStage,
    EmotionalState,
    EnergyLevel,
    FinancialPressure,
    SocialConnectedness,
    SkillMomentum,
    CurrentContext,
    stateToKey,
    extractCurrentState
} from './stateExtractor.js';
import {
    EnhancedDigitalAvatar,
    PersonalityTraits,
    ValuesProfile
} from '../types.js';
import { getEnhancedDigitalAvatar } from './localStorageService.js';

// ============================================================================
// Action Definitions
// ============================================================================

/**
 * 行动领域
 */
export enum ActionDomain {
    CAREER = 'career',       // 职业发展
    FINANCE = 'finance',     // 财务管理
    HEALTH = 'health',       // 健康管理
    SOCIAL = 'social',       // 社交关系
    LEARNING = 'learning',   // 学习成长
    IMMEDIATE = 'immediate'  // 当前任务
}

/**
 * 具体行动定义
 */
export interface LifeAction {
    id: string;
    domain: ActionDomain;
    name: string;
    description: string;

    // 效果
    energyCost: number;      // -10 到 10 (负数=消耗, 正数=恢复)
    financialImpact: number; // -10 到 10
    skillGrowth: number;     // 0 到 10
    socialImpact: number;    // -5 到 5
    emotionalImpact: number; // -5 到 5

    // 适用条件
    minEnergy?: EnergyLevel;
    requiredContext?: CurrentContext[];

    // 时间范围
    timeHorizon: 'immediate' | 'short' | 'medium' | 'long';
}

/**
 * 预定义的行动库
 */
export const LIFE_ACTIONS: LifeAction[] = [
    // === 立即行动 ===
    {
        id: 'rest_now',
        domain: ActionDomain.HEALTH,
        name: '立即休息',
        description: '放下手机，休息一下眼睛和大脑',
        energyCost: 3,
        financialImpact: 0,
        skillGrowth: 0,
        socialImpact: 0,
        emotionalImpact: 2,
        timeHorizon: 'immediate'
    },
    {
        id: 'take_walk',
        domain: ActionDomain.HEALTH,
        name: '出去走走',
        description: '短暂的散步可以帮助理清思路',
        energyCost: 2,
        financialImpact: 0,
        skillGrowth: 0,
        socialImpact: 0,
        emotionalImpact: 3,
        minEnergy: 'low',
        timeHorizon: 'immediate'
    },
    {
        id: 'deep_breath',
        domain: ActionDomain.HEALTH,
        name: '深呼吸放松',
        description: '做5次深呼吸，缓解当下的焦虑',
        energyCost: 1,
        financialImpact: 0,
        skillGrowth: 0,
        socialImpact: 0,
        emotionalImpact: 2,
        timeHorizon: 'immediate'
    },

    // === 短期行动 (今天内) ===
    {
        id: 'complete_task',
        domain: ActionDomain.IMMEDIATE,
        name: '完成当前任务',
        description: '专注完成手头的工作，获得成就感',
        energyCost: -2,
        financialImpact: 1,
        skillGrowth: 1,
        socialImpact: 0,
        emotionalImpact: 2,
        minEnergy: 'moderate',
        timeHorizon: 'short'
    },
    {
        id: 'reach_out',
        domain: ActionDomain.SOCIAL,
        name: '联系一位朋友',
        description: '给一个久未联系的朋友发条消息',
        energyCost: -1,
        financialImpact: 0,
        skillGrowth: 0,
        socialImpact: 3,
        emotionalImpact: 2,
        timeHorizon: 'short'
    },
    {
        id: 'learn_something',
        domain: ActionDomain.LEARNING,
        name: '学习新技能',
        description: '花30分钟学习一项新技能',
        energyCost: -2,
        financialImpact: 0,
        skillGrowth: 3,
        socialImpact: 0,
        emotionalImpact: 1,
        minEnergy: 'moderate',
        timeHorizon: 'short'
    },

    // === 中期行动 (本周内) ===
    {
        id: 'exercise_routine',
        domain: ActionDomain.HEALTH,
        name: '建立运动习惯',
        description: '开始每天15分钟的简单运动',
        energyCost: -1,
        financialImpact: 0,
        skillGrowth: 0,
        socialImpact: 0,
        emotionalImpact: 3,
        timeHorizon: 'medium'
    },
    {
        id: 'budget_review',
        domain: ActionDomain.FINANCE,
        name: '梳理财务状况',
        description: '花1小时整理收支，制定预算',
        energyCost: -2,
        financialImpact: 2,
        skillGrowth: 1,
        socialImpact: 0,
        emotionalImpact: 1,
        minEnergy: 'moderate',
        timeHorizon: 'medium'
    },
    {
        id: 'skill_project',
        domain: ActionDomain.LEARNING,
        name: '启动学习项目',
        description: '开始一个小型学习项目来实践新技能',
        energyCost: -3,
        financialImpact: -1,
        skillGrowth: 5,
        socialImpact: 0,
        emotionalImpact: 2,
        minEnergy: 'moderate',
        timeHorizon: 'medium'
    },

    // === 长期行动 (本月及以后) ===
    {
        id: 'career_move',
        domain: ActionDomain.CAREER,
        name: '规划职业发展',
        description: '评估当前职业方向，制定发展计划',
        energyCost: -3,
        financialImpact: 0,
        skillGrowth: 2,
        socialImpact: 1,
        emotionalImpact: 1,
        minEnergy: 'high',
        timeHorizon: 'long'
    },
    {
        id: 'investment_plan',
        domain: ActionDomain.FINANCE,
        name: '制定投资计划',
        description: '学习投资知识，开始定投',
        energyCost: -2,
        financialImpact: 4,
        skillGrowth: 2,
        socialImpact: 0,
        emotionalImpact: 1,
        minEnergy: 'moderate',
        timeHorizon: 'long'
    },
    {
        id: 'relationship_invest',
        domain: ActionDomain.SOCIAL,
        name: '投资重要关系',
        description: '主动维护与家人、好友的关系',
        energyCost: -2,
        financialImpact: -1,
        skillGrowth: 0,
        socialImpact: 5,
        emotionalImpact: 3,
        timeHorizon: 'long'
    }
];

// ============================================================================
// Reward Function
// ============================================================================

/**
 * 计算行动在给定状态下的即时奖励
 */
export function getActionReward(
    state: LifeState,
    action: LifeAction,
    userValues?: ValuesProfile
): number {
    let reward = 0;

    // 基础效果转换为奖励
    reward += action.energyCost * 0.5;        // 能量恢复是好的
    reward += action.financialImpact * 1.0;   // 财务改善
    reward += action.skillGrowth * 0.8;       // 技能成长
    reward += action.socialImpact * 0.6;      // 社交改善
    reward += action.emotionalImpact * 0.7;   // 情绪改善

    // 根据用户价值观调整
    if (userValues) {
        reward += action.skillGrowth * (userValues.growth / 100) * 0.5;
        reward += action.financialImpact * (userValues.efficiency / 100) * 0.3;
        reward += action.socialImpact * (userValues.connection / 100) * 0.3;
        reward += action.emotionalImpact * (userValues.stability / 100) * 0.2;
    }

    // 状态惩罚：低能量时不应该消耗能量
    if (state.energyLevel === 'exhausted' && action.energyCost < 0) {
        reward -= 5;
    }
    if (state.energyLevel === 'low' && action.energyCost < -2) {
        reward -= 3;
    }

    // 状态奖励：高压力时休息更有价值
    if (state.emotionalState === 'stressed' && action.emotionalImpact > 0) {
        reward += action.emotionalImpact * 0.5;
    }
    if (state.emotionalState === 'anxious' && action.emotionalImpact > 0) {
        reward += action.emotionalImpact * 0.7;
    }

    // 财务压力时的财务行动更有价值
    if (state.financialPressure === 'critical' && action.financialImpact > 0) {
        reward += action.financialImpact;
    }
    if (state.financialPressure === 'high' && action.financialImpact > 0) {
        reward += action.financialImpact * 0.5;
    }

    // 孤独时社交更有价值
    if (state.socialConnectedness === 'isolated' && action.socialImpact > 0) {
        reward += action.socialImpact * 0.8;
    }

    return reward;
}

// ============================================================================
// Transition Model
// ============================================================================

/**
 * 获取行动后的可能状态转移
 */
export function getTransitions(
    state: LifeState,
    action: LifeAction
): Array<{ probability: number; nextState: Partial<LifeState> }> {
    // 简化的转移模型
    const transitions: Array<{ probability: number; nextState: Partial<LifeState> }> = [];

    // 主要结果 (80% 概率)
    const mainOutcome: Partial<LifeState> = {};

    // 能量变化
    if (action.energyCost > 0) {
        mainOutcome.energyLevel = improveEnergy(state.energyLevel);
    } else if (action.energyCost < -2) {
        mainOutcome.energyLevel = decreaseEnergy(state.energyLevel);
    }

    // 情绪变化
    if (action.emotionalImpact > 2) {
        mainOutcome.emotionalState = improveEmotion(state.emotionalState);
    } else if (action.emotionalImpact < -1) {
        mainOutcome.emotionalState = decreaseEmotion(state.emotionalState);
    }

    // 技能动量
    if (action.skillGrowth >= 3) {
        mainOutcome.skillMomentum = improveSkillMomentum(state.skillMomentum);
    }

    // 社交连接
    if (action.socialImpact >= 2) {
        mainOutcome.socialConnectedness = improveSocial(state.socialConnectedness);
    }

    transitions.push({ probability: 0.8, nextState: mainOutcome });

    // 意外惊喜结果 (10%)
    transitions.push({
        probability: 0.1,
        nextState: {
            emotionalState: improveEmotion(mainOutcome.emotionalState || state.emotionalState),
            energyLevel: improveEnergy(mainOutcome.energyLevel || state.energyLevel)
        }
    });

    // 没有变化 (10%)
    transitions.push({ probability: 0.1, nextState: {} });

    return transitions;
}

// Helper functions for state transitions
function improveEnergy(current: EnergyLevel): EnergyLevel {
    const levels: EnergyLevel[] = ['exhausted', 'low', 'moderate', 'high', 'peak'];
    const idx = levels.indexOf(current);
    return levels[Math.min(idx + 1, levels.length - 1)];
}

function decreaseEnergy(current: EnergyLevel): EnergyLevel {
    const levels: EnergyLevel[] = ['exhausted', 'low', 'moderate', 'high', 'peak'];
    const idx = levels.indexOf(current);
    return levels[Math.max(idx - 1, 0)];
}

function improveEmotion(current: EmotionalState): EmotionalState {
    const levels: EmotionalState[] = ['stressed', 'anxious', 'neutral', 'calm', 'excited'];
    const idx = levels.indexOf(current);
    return levels[Math.min(idx + 1, levels.length - 1)];
}

function decreaseEmotion(current: EmotionalState): EmotionalState {
    const levels: EmotionalState[] = ['stressed', 'anxious', 'neutral', 'calm', 'excited'];
    const idx = levels.indexOf(current);
    return levels[Math.max(idx - 1, 0)];
}

function improveSkillMomentum(current: SkillMomentum): SkillMomentum {
    const levels: SkillMomentum[] = ['declining', 'stagnant', 'steady', 'growing', 'accelerating'];
    const idx = levels.indexOf(current);
    return levels[Math.min(idx + 1, levels.length - 1)];
}

function improveSocial(current: SocialConnectedness): SocialConnectedness {
    const levels: SocialConnectedness[] = ['isolated', 'weak', 'moderate', 'strong', 'thriving'];
    const idx = levels.indexOf(current);
    return levels[Math.min(idx + 1, levels.length - 1)];
}

// ============================================================================
// Bellman Optimizer
// ============================================================================

/**
 * 从人格特征推断 Gamma 值 (δ — 长期指数折扣因子)
 *
 * 基于: Sutton & Barto (2018), Reinforcement Learning, Ch.3
 */
export function inferGamma(personality?: PersonalityTraits): number {
    if (!personality) return 0.7;  // 默认值

    // 尽责性高 → 更看重未来
    const conscientiousness = personality.conscientiousness / 100;

    // 理性程度 → 更能延迟满足
    const rationality = (personality.rationalVsEmotional + 100) / 200;

    // 开放性 → 更愿意尝试长期投资
    const openness = personality.openness / 100;

    // 综合计算 gamma (δ)
    const gamma = 0.5 + 0.45 * (conscientiousness * 0.4 + rationality * 0.4 + openness * 0.2);

    return Math.min(0.95, Math.max(0.3, gamma));
}

/**
 * 从人格特征推断现时偏见系数 β (Present Bias)
 *
 * β ∈ (0, 1] 表示对「现在」的额外偏好：
 *   β = 1  → 标准指数折扣（无现时偏见）
 *   β < 1  → 当前奖励被赋予比未来奖励更高的额外权重
 *
 * 准双曲折扣模型: U = R₀ + β·(δ·R₁ + δ²·R₂ + ...)
 *
 * 参考文献:
 *   Laibson, D. (1997). Golden Eggs and Hyperbolic Discounting.
 *     Quarterly Journal of Economics, 112(2), 443–478.
 *   O'Donoghue, T. & Rabin, M. (1999). Doing It Now or Later.
 *     American Economic Review, 89(1), 103–124.
 */
export function inferPresentBias(personality?: PersonalityTraits): number {
    if (!personality) return 0.8;  // 默认现时偏见

    // 冲动性高 → 更偏好当下 → β 更小
    const impulsiveness = (100 - (personality.conscientiousness ?? 50)) / 100;

    // 情绪化 → 对当下感受权重更高
    const emotionalWeight = (100 - ((personality.rationalVsEmotional ?? 0) + 100) / 2) / 100;

    // β 接近 1 表示更理性；接近 0.5 表示强烈现时偏见
    const beta = 1.0 - 0.5 * (impulsiveness * 0.6 + emotionalWeight * 0.4);

    return Math.min(1.0, Math.max(0.5, beta));
}

// ============================================================================
// Habit Memory Stock (Backward-Looking Influence)
// ============================================================================

/**
 * 记忆轨迹条目 — 记录过去状态的奖励及其时间戳
 *
 * 参考文献:
 *   Ryder, H. E. & Heal, G. M. (1973). Optimal Growth with
 *     Intertemporally Dependent Preferences.
 *     Review of Economic Studies, 40(1), 1–31.
 */
export interface MemoryTrace {
    reward: number;      // 过去行动获得的即时奖励
    timestamp: number;   // 发生时间 (ms)
}

/**
 * 计算习惯存量 (Habit Stock)
 *
 * h_t = Σᵢ αⁱ · R_{t-i}   (指数衰减的历史奖励加权和)
 *
 * 这将过去所有状态的影响压缩为单个标量，维持马尔可夫性质。
 *
 * @param traces  历史记忆轨迹 (从最新到最旧)
 * @param alpha   历史衰减因子 ∈ (0,1)，默认 0.6
 * @returns       习惯存量 h (正值=良好习惯，负值=不良积累)
 */
export function computeHabitStock(
    traces: MemoryTrace[],
    alpha: number = 0.6
): number {
    let habitStock = 0;
    let weight = 1.0;
    const now = Date.now();

    for (const trace of traces) {
        // 时间衰减：越久远的记忆权重越低（毫秒转换为「步"）
        const ageSteps = (now - trace.timestamp) / (1000 * 60 * 60);  // 小时为单位
        const timeDecay = Math.pow(alpha, ageSteps);
        habitStock += timeDecay * trace.reward;
        weight *= alpha;
    }

    return habitStock;
}

/**
 * Bellman 人生优化器 — 准双曲折扣版
 *
 * 折扣模型 (Quasi-Hyperbolic β-δ):
 *   Q(s,a) = h(past) + R(s,a) + β·δ·Σ P(s'|s,a)·V(s')
 *
 * 其中:
 *   δ (gamma)  = 长期指数折扣因子  [Sutton & Barto 2018]
 *   β (beta)   = 现时偏见系数      [Laibson 1997; O'Donoghue & Rabin 1999]
 *   h (habit)  = 历史习惯存量      [Ryder & Heal 1973]
 *
 * β=1 退化为标准 Bellman；β<1 使当前奖励相对于未来更有价值。
 */
export class BellmanLifeOptimizer {
    private gamma: number;          // δ — 长期折扣因子
    private beta: number;           // β — 现时偏见系数 ∈ (0.5, 1]
    private habitAlpha: number;     // α — 习惯存量衰减率
    private userValues?: ValuesProfile;
    private V: Map<string, number> = new Map();
    private policy: Map<string, LifeAction> = new Map();
    private memoryTraces: MemoryTrace[] = [];  // 历史奖励记忆

    constructor(
        gamma: number = 0.7,
        userValues?: ValuesProfile,
        beta: number = 0.8,
        habitAlpha: number = 0.6
    ) {
        this.gamma = gamma;
        this.beta = beta;
        this.habitAlpha = habitAlpha;
        this.userValues = userValues;
    }

    /** 记录一次行动的结果到记忆轨迹 */
    recordOutcome(reward: number): void {
        this.memoryTraces.unshift({ reward, timestamp: Date.now() });
        // 最多保留 10 条记忆
        if (this.memoryTraces.length > 10) {
            this.memoryTraces = this.memoryTraces.slice(0, 10);
        }
    }

    /**
     * 获取习惯存量（过去的加权影响）
     * 正值 = 良好习惯积累，负值 = 不良积累
     */
    getHabitStock(): number {
        return computeHabitStock(this.memoryTraces, this.habitAlpha);
    }

    /**
     * 获取给定状态下的可用行动
     */
    getAvailableActions(state: LifeState): LifeAction[] {
        return LIFE_ACTIONS.filter(action => {
            // 检查能量要求
            if (action.minEnergy) {
                const energyLevels: EnergyLevel[] = ['exhausted', 'low', 'moderate', 'high', 'peak'];
                const currentIdx = energyLevels.indexOf(state.energyLevel);
                const requiredIdx = energyLevels.indexOf(action.minEnergy);
                if (currentIdx < requiredIdx) return false;
            }

            // 检查上下文要求
            if (action.requiredContext && action.requiredContext.length > 0) {
                if (!action.requiredContext.includes(state.currentContext)) return false;
            }

            return true;
        });
    }

    /**
     * 计算行动的 Q 值 — 准双曲折扣公式
     *
     * Q(s,a) = habitBonus + R(s,a) + β·δ·Σ P(s'|s,a)·V(s')
     *
     * 对比标准 Bellman (β=1):
     *   - 未来价值乘以额外系数 β，体现「现在感觉更重要」
     *   - 习惯存量 h 作为来自过去状态的奖励基础
     *
     * 参考: Laibson (1997), Phelps & Pollak (1968)
     */
    getQValue(state: LifeState, action: LifeAction): number {
        // 1. 过去的影响：习惯存量（后向加权求和）
        //    正习惯 → 有利行动有加成；负习惯 → 自我放纵行为受惩罚
        const habitStock = this.getHabitStock();
        const habitBonus = habitStock * 0.1;  // 缩放至奖励量纲

        // 2. 即时奖励 R(s,a)
        const immediateReward = getActionReward(state, action, this.userValues);

        // 3. 准双曲折扣的未来价值: β·δ·Σ P(s'|s,a)·V(s')
        let expectedFutureValue = 0;
        const transitions = getTransitions(state, action);

        for (const { probability, nextState } of transitions) {
            const fullNextState: LifeState = {
                ...state,
                ...nextState,
                timestamp: Date.now()
            };
            const nextKey = stateToKey(fullNextState);
            const nextValue = this.V.get(nextKey) || 0;
            expectedFutureValue += probability * nextValue;
        }

        // 准双曲: β·δ 替代标准 δ (当 β<1 时未来被额外打折)
        return habitBonus + immediateReward + this.beta * this.gamma * expectedFutureValue;
    }

    /**
     * 获取当前状态的最优行动
     */
    getNextBestAction(state: LifeState): ActionRecommendation {
        const availableActions = this.getAvailableActions(state);

        if (availableActions.length === 0) {
            return {
                action: LIFE_ACTIONS[0],  // 休息作为 fallback
                qValue: 0,
                confidence: 50,
                reasoning: '当前能量较低，建议先休息恢复',
                expectedOutcome: '恢复精力后再做决策',
                alternatives: [],
                anxietyRelief: '休息也是一种行动，照顾好自己是最重要的。'
            };
        }

        // 计算每个行动的 Q 值
        const actionValues: Array<{ action: LifeAction; qValue: number }> = [];
        for (const action of availableActions) {
            const qValue = this.getQValue(state, action);
            actionValues.push({ action, qValue });
        }

        // 排序找到最优
        actionValues.sort((a, b) => b.qValue - a.qValue);

        const best = actionValues[0];
        const alternatives = actionValues.slice(1, 4);

        // 生成推理说明
        const reasoning = this.generateReasoning(state, best.action, best.qValue);
        const expectedOutcome = this.generateExpectedOutcome(state, best.action);
        const anxietyRelief = this.generateAnxietyRelief(state, best.action);

        // 置信度基于 Q 值差距
        let confidence = 70;
        if (alternatives.length > 0) {
            const gap = best.qValue - alternatives[0].qValue;
            confidence = Math.min(95, 60 + gap * 5);
        }

        // 现时偏见说明
        const presentBiasExplain = this.generatePresentBiasExplain();

        return {
            action: best.action,
            qValue: best.qValue,
            confidence,
            reasoning,
            expectedOutcome,
            alternatives: alternatives.map(a => ({
                action: a.action,
                qValue: a.qValue,
                tradeoff: this.generateTradeoff(best.action, a.action)
            })),
            anxietyRelief,
            // Present-bias metadata
            discountParams: {
                beta: this.beta,
                gamma: this.gamma,
                effectiveDiscount: this.beta * this.gamma,
                habitStock: this.getHabitStock()
            },
            presentBiasExplain
        };
    }

    /**
     * 生成推理说明
     */
    private generateReasoning(state: LifeState, action: LifeAction, qValue: number): string {
        const reasons: string[] = [];

        // 基于状态的推理
        if (state.energyLevel === 'exhausted' || state.energyLevel === 'low') {
            if (action.energyCost > 0) {
                reasons.push('当前能量较低，恢复精力是首要任务');
            }
        }

        if (state.emotionalState === 'stressed' || state.emotionalState === 'anxious') {
            if (action.emotionalImpact > 0) {
                reasons.push('检测到压力/焦虑情绪，这个行动有助于缓解');
            }
        }

        if (state.skillMomentum === 'stagnant' || state.skillMomentum === 'declining') {
            if (action.skillGrowth > 0) {
                reasons.push('技能发展处于停滞，适时投资自己');
            }
        }

        if (state.socialConnectedness === 'isolated' || state.socialConnectedness === 'weak') {
            if (action.socialImpact > 0) {
                reasons.push('社交连接较弱，维护关系很重要');
            }
        }

        // Gamma 相关推理
        if (this.gamma > 0.8 && action.timeHorizon === 'long') {
            reasons.push(`你的远见指数(γ=${this.gamma.toFixed(2)})较高，长期投资符合你的风格`);
        }

        if (reasons.length === 0) {
            reasons.push(`综合当前状态，这是最优的下一步行动`);
        }

        return reasons.join('；');
    }

    /**
     * 生成预期结果
     */
    private generateExpectedOutcome(state: LifeState, action: LifeAction): string {
        const outcomes: string[] = [];

        if (action.energyCost > 0) outcomes.push('能量恢复');
        if (action.emotionalImpact > 0) outcomes.push('情绪改善');
        if (action.skillGrowth > 0) outcomes.push('技能提升');
        if (action.socialImpact > 0) outcomes.push('关系增进');
        if (action.financialImpact > 0) outcomes.push('财务改善');

        return outcomes.length > 0 ? `预期效果：${outcomes.join('、')}` : action.description;
    }

    /**
     * 生成焦虑缓解语句
     */
    private generateAnxietyRelief(state: LifeState, action: LifeAction): string {
        const reliefs = [
            '记住，选择本身就是进步。无论你选择什么，你都在向前走。',
            '你已经在寻找最优路径了，这本身就说明你在掌控自己的人生。',
            '没有"完美"的选择，只有"当下最优"的选择。做就对了。',
            '焦虑来自对未知的恐惧，但每一步行动都在消除未知。',
            '你不需要一次做对所有事，只需要做好下一件事。'
        ];

        // 根据状态选择合适的话语
        if (state.emotionalState === 'anxious') {
            return '深呼吸，你已经在做正确的事了。一步一步来，你比想象中更有能力应对。';
        }

        if (state.emotionalState === 'stressed') {
            return '压力说明你在意这件事。但记住，你已经在寻找解决方案了，这就是进步。';
        }

        // 随机选择
        return reliefs[Math.floor(Math.random() * reliefs.length)];
    }

    /**
     * 生成替代方案的权衡说明
     */
    private generateTradeoff(best: LifeAction, alternative: LifeAction): string {
        if (alternative.timeHorizon === 'long' && best.timeHorizon === 'immediate') {
            return '更长远但需要更多精力';
        }
        if (alternative.timeHorizon === 'immediate' && best.timeHorizon === 'long') {
            return '见效更快但效果较短暂';
        }
        if (alternative.energyCost < best.energyCost) {
            return '消耗更多精力';
        }
        if (alternative.skillGrowth > best.skillGrowth) {
            return '技能提升更多但需要投入';
        }

        return '不同的侧重点';
    }

    /**
     * 生成现时偏见说明
     */
    private generatePresentBiasExplain(): string {
        const betaPct = Math.round((1 - this.beta) * 100);
        const habitStock = this.getHabitStock();
        const habitDesc = habitStock > 1
            ? `你最近的行为累积了正向习惯存量 (+${habitStock.toFixed(1)})，这在为你「加分」。`
            : habitStock < -1
                ? `你最近的行为留下了负向习惯存量 (${habitStock.toFixed(1)})，你需要打破这个惯性。`
                : '你的习惯存量目前接近中性。';

        if (betaPct <= 5) {
            return `你的现时偏见极低 (β=${this.beta.toFixed(2)})，你能够充分权衡未来。${habitDesc}`;
        } else if (betaPct <= 20) {
            return `检测到轻度现时偏见 (β=${this.beta.toFixed(2)}, 未来额外打折 ${betaPct}%)。长期行动的真实价值比你直觉中的更高。${habitDesc}`;
        } else {
            return `检测到显著现时偏见 (β=${this.beta.toFixed(2)}, 未来额外打折 ${betaPct}%)。注意：你可能在低估长期投资的价值！${habitDesc}`;
        }
    }
}

/**
 * 行动推荐结果
 */
export interface ActionRecommendation {
    action: LifeAction;
    qValue: number;
    confidence: number;
    reasoning: string;
    expectedOutcome: string;
    alternatives: Array<{
        action: LifeAction;
        qValue: number;
        tradeoff: string;
    }>;
    anxietyRelief: string;
    /** 准双曲折扣参数 */
    discountParams?: {
        beta: number;             // 现时偏见系数
        gamma: number;            // 长期折扣因子 δ
        effectiveDiscount: number; // 综合有效折扣 β·δ
        habitStock: number;       // 过去习惯存量
    };
    /** 现时偏见解释文本 */
    presentBiasExplain?: string;
}

// ============================================================================
// Quick Access Functions
// ============================================================================

/**
 * 快速获取下一个最优行动
 */
export function getNextBestAction(state?: LifeState): ActionRecommendation {
    const avatar = getEnhancedDigitalAvatar();
    const currentState = state || extractCurrentState(avatar, undefined);

    const gamma = inferGamma(avatar?.personality);
    const beta = inferPresentBias(avatar?.personality);
    const optimizer = new BellmanLifeOptimizer(gamma, avatar?.valuesProfile, beta);

    return optimizer.getNextBestAction(currentState);
}

/**
 * 根据用户查询和上下文推荐行动
 */
export function getRecommendationForQuery(query: string, appContext?: any): ActionRecommendation {
    const avatar = getEnhancedDigitalAvatar();
    const state = extractCurrentState(avatar, appContext);

    // 从查询中检测情绪线索
    const anxietyKeywords = ['纠结', '焦虑', '不知道', '犹豫', '要不要', '该不该', '怎么办', '担心'];
    const isAnxious = anxietyKeywords.some(kw => query.includes(kw));
    if (isAnxious) {
        state.emotionalState = 'anxious';
    }

    // 检测具体场景
    const context = detectQueryContext(query, appContext);

    const gamma = inferGamma(avatar?.personality);
    const beta = inferPresentBias(avatar?.personality);
    const optimizer = new BellmanLifeOptimizer(gamma, avatar?.valuesProfile, beta);

    // 获取基础推荐
    let recommendation = optimizer.getNextBestAction(state);

    // 根据场景定制推荐
    if (context.isSpecific) {
        recommendation = customizeRecommendation(recommendation, context, state, query);
    }

    return recommendation;
}

/**
 * 场景检测结果
 */
interface QueryContext {
    isSpecific: boolean;
    domain: 'work' | 'relationship' | 'finance' | 'health' | 'learning' | 'general';
    scenario?: string;
    urgency: 'immediate' | 'today' | 'this_week' | 'future';
    appName?: string;
    keywords: string[];
}

/**
 * 检测用户查询的具体场景
 */
function detectQueryContext(query: string, appContext?: any): QueryContext {
    const context: QueryContext = {
        isSpecific: false,
        domain: 'general',
        urgency: 'today',
        keywords: []
    };

    // 从 appContext 获取当前 App
    if (appContext?.appName) {
        context.appName = appContext.appName;

        // 根据 App 推断场景
        const appLower = appContext.appName.toLowerCase();
        if (appLower.includes('mail') || appLower.includes('outlook') || appLower.includes('gmail')) {
            context.domain = 'work';
            context.scenario = 'email';
            context.isSpecific = true;
        } else if (appLower.includes('wechat') || appLower.includes('微信') || appLower.includes('whatsapp')) {
            context.domain = 'relationship';
            context.scenario = 'messaging';
            context.isSpecific = true;
        } else if (appLower.includes('slack') || appLower.includes('teams') || appLower.includes('钉钉')) {
            context.domain = 'work';
            context.scenario = 'work_chat';
            context.isSpecific = true;
        } else if (appLower.includes('twitter') || appLower.includes('weibo') || appLower.includes('微博')) {
            context.domain = 'relationship';
            context.scenario = 'social_media';
            context.isSpecific = true;
        }
    }

    // 从查询内容检测关键词
    const workKeywords = ['工作', '老板', '同事', '项目', '会议', '汇报', '任务', 'deadline', '加班', '辞职', '跳槽'];
    const relationshipKeywords = ['朋友', '家人', '恋人', '约会', '吵架', '道歉', '表白', '分手', '冷战', '联系'];
    const financeKeywords = ['钱', '工资', '投资', '理财', '贷款', '消费', '存款', '股票', '基金', '买房'];
    const healthKeywords = ['睡眠', '运动', '健身', '减肥', '压力', '头疼', '疲惫', '熬夜', '健康'];
    const learningKeywords = ['学习', '考试', '技能', '课程', '证书', '英语', '编程', '读书'];

    // 检测各领域关键词
    for (const kw of workKeywords) {
        if (query.includes(kw)) {
            context.keywords.push(kw);
            if (context.domain === 'general') {
                context.domain = 'work';
                context.isSpecific = true;
            }
        }
    }

    for (const kw of relationshipKeywords) {
        if (query.includes(kw)) {
            context.keywords.push(kw);
            if (context.domain === 'general') {
                context.domain = 'relationship';
                context.isSpecific = true;
            }
        }
    }

    for (const kw of financeKeywords) {
        if (query.includes(kw)) {
            context.keywords.push(kw);
            if (context.domain === 'general') {
                context.domain = 'finance';
                context.isSpecific = true;
            }
        }
    }

    for (const kw of healthKeywords) {
        if (query.includes(kw)) {
            context.keywords.push(kw);
            if (context.domain === 'general') {
                context.domain = 'health';
                context.isSpecific = true;
            }
        }
    }

    for (const kw of learningKeywords) {
        if (query.includes(kw)) {
            context.keywords.push(kw);
            if (context.domain === 'general') {
                context.domain = 'learning';
                context.isSpecific = true;
            }
        }
    }

    // 检测紧迫程度
    if (query.includes('现在') || query.includes('立刻') || query.includes('马上') || query.includes('急')) {
        context.urgency = 'immediate';
    } else if (query.includes('今天') || query.includes('晚上') || query.includes('下午')) {
        context.urgency = 'today';
    } else if (query.includes('最近') || query.includes('这周') || query.includes('本周')) {
        context.urgency = 'this_week';
    } else if (query.includes('未来') || query.includes('长期') || query.includes('以后')) {
        context.urgency = 'future';
    }

    return context;
}

/**
 * 根据场景定制推荐
 */
function customizeRecommendation(
    base: ActionRecommendation,
    context: QueryContext,
    state: LifeState,
    query: string
): ActionRecommendation {
    const custom = { ...base };

    // 根据领域生成具体建议
    switch (context.domain) {
        case 'work':
            custom.action = {
                ...base.action,
                name: getWorkActionName(query, context.keywords),
                description: getWorkActionDescription(query, context.keywords),
                domain: ActionDomain.CAREER
            };
            custom.reasoning = generateWorkReasoning(query, context.keywords, state);
            custom.expectedOutcome = generateWorkOutcome(query, context.keywords);
            break;

        case 'relationship':
            custom.action = {
                ...base.action,
                name: getRelationshipActionName(query, context.keywords),
                description: getRelationshipActionDescription(query, context.keywords),
                domain: ActionDomain.SOCIAL
            };
            custom.reasoning = generateRelationshipReasoning(query, context.keywords, state);
            custom.expectedOutcome = generateRelationshipOutcome(query, context.keywords);
            break;

        case 'finance':
            custom.action = {
                ...base.action,
                name: getFinanceActionName(query, context.keywords),
                description: getFinanceActionDescription(query, context.keywords),
                domain: ActionDomain.FINANCE
            };
            custom.reasoning = generateFinanceReasoning(query, context.keywords, state);
            custom.expectedOutcome = generateFinanceOutcome(query, context.keywords);
            break;

        case 'health':
            custom.action = {
                ...base.action,
                name: getHealthActionName(query, context.keywords),
                description: getHealthActionDescription(query, context.keywords),
                domain: ActionDomain.HEALTH
            };
            custom.reasoning = generateHealthReasoning(query, context.keywords, state);
            custom.expectedOutcome = generateHealthOutcome(query, context.keywords);
            break;

        case 'learning':
            custom.action = {
                ...base.action,
                name: getLearningActionName(query, context.keywords),
                description: getLearningActionDescription(query, context.keywords),
                domain: ActionDomain.LEARNING
            };
            custom.reasoning = generateLearningReasoning(query, context.keywords, state);
            custom.expectedOutcome = generateLearningOutcome(query, context.keywords);
            break;
    }

    // 设置时间范围
    switch (context.urgency) {
        case 'immediate':
            custom.action.timeHorizon = 'immediate';
            break;
        case 'today':
            custom.action.timeHorizon = 'short';
            break;
        case 'this_week':
            custom.action.timeHorizon = 'medium';
            break;
        case 'future':
            custom.action.timeHorizon = 'long';
            break;
    }

    // 生成场景化的焦虑缓解话语
    custom.anxietyRelief = generateScenarioAnxietyRelief(context.domain, query, context.keywords);

    return custom;
}

// ============================================================================
// 场景化内容生成函数
// ============================================================================

function getWorkActionName(query: string, keywords: string[]): string {
    if (keywords.includes('老板')) return '与上级有效沟通';
    if (keywords.includes('同事')) return '处理同事关系';
    if (keywords.includes('汇报')) return '准备清晰的汇报';
    if (keywords.includes('加班')) return '设定合理边界';
    if (keywords.includes('辞职') || keywords.includes('跳槽')) return '理性评估职业变动';
    if (keywords.includes('会议')) return '高效参与会议';
    if (keywords.includes('项目')) return '推进项目进度';
    return '聚焦当前工作任务';
}

function getWorkActionDescription(query: string, keywords: string[]): string {
    if (keywords.includes('老板')) return '先整理要点，选择合适时机，用数据说话';
    if (keywords.includes('同事')) return '保持专业态度，就事论事，寻找共赢方案';
    if (keywords.includes('汇报')) return '简明扼要，突出成果和下一步计划';
    if (keywords.includes('加班')) return '评估任务优先级，学会说"不"或协商时间';
    if (keywords.includes('辞职') || keywords.includes('跳槽')) return '列出利弊，不要冲动决定，至少准备3个月缓冲';
    return '把大任务拆成小步骤，先完成最紧急的';
}

function generateWorkReasoning(query: string, keywords: string[], state: LifeState): string {
    const reasons: string[] = [];
    if (keywords.includes('老板') || keywords.includes('汇报')) {
        reasons.push('职场沟通的关键是清晰表达和换位思考');
    }
    if (keywords.includes('加班')) {
        reasons.push('长期加班影响健康和效率，需要建立可持续的工作节奏');
    }
    if (keywords.includes('辞职') || keywords.includes('跳槽')) {
        reasons.push('职业变动是重大决策，需要充分准备和理性评估');
    }
    if (state.energyLevel === 'low' || state.energyLevel === 'exhausted') {
        reasons.push('当前能量较低，建议先处理最紧急的事项');
    }
    return reasons.length > 0 ? reasons.join('；') : '基于当前工作情境，这是最优的下一步';
}

function generateWorkOutcome(query: string, keywords: string[]): string {
    if (keywords.includes('老板')) return '提升上级对你的信任和认可';
    if (keywords.includes('加班')) return '重获工作生活平衡';
    if (keywords.includes('辞职')) return '做出理性的职业决策';
    return '推进工作进度，减少焦虑';
}

function getRelationshipActionName(query: string, keywords: string[]): string {
    if (keywords.includes('吵架') || keywords.includes('冷战')) return '主动修复关系';
    if (keywords.includes('道歉')) return '真诚表达歉意';
    if (keywords.includes('表白')) return '勇敢表达心意';
    if (keywords.includes('分手')) return '给自己时间愈合';
    if (keywords.includes('家人')) return '表达关心与感谢';
    if (keywords.includes('朋友')) return '维护友情连接';
    return '真诚沟通';
}

function getRelationshipActionDescription(query: string, keywords: string[]): string {
    if (keywords.includes('吵架') || keywords.includes('冷战')) return '先冷静，再找时机真诚沟通，关注对方感受';
    if (keywords.includes('道歉')) return '承认错误，表达理解，提出改进方案';
    if (keywords.includes('表白')) return '选择合适的时机和方式，真诚表达，接受任何结果';
    if (keywords.includes('分手')) return '允许自己悲伤，但也要照顾好自己的身心';
    if (keywords.includes('家人')) return '一条消息、一通电话，简单但有温度';
    return '用心倾听，真诚回应';
}

function generateRelationshipReasoning(query: string, keywords: string[], state: LifeState): string {
    const reasons: string[] = [];
    if (keywords.includes('吵架') || keywords.includes('冷战')) {
        reasons.push('关系中的冲突是正常的，关键是如何修复');
    }
    if (keywords.includes('表白')) {
        reasons.push('表达心意本身就是勇敢，结果不是你能控制的');
    }
    if (state.socialConnectedness === 'isolated' || state.socialConnectedness === 'weak') {
        reasons.push('你当前的社交连接较弱，维护关系很重要');
    }
    return reasons.length > 0 ? reasons.join('；') : '人际关系需要主动维护';
}

function generateRelationshipOutcome(query: string, keywords: string[]): string {
    if (keywords.includes('吵架') || keywords.includes('冷战')) return '有望化解矛盾，关系更进一步';
    if (keywords.includes('表白')) return '无论结果如何，你都会感到释然';
    if (keywords.includes('分手')) return '逐渐走出阴霾，重新开始';
    return '关系更加深厚，内心更加踏实';
}

function getFinanceActionName(query: string, keywords: string[]): string {
    if (keywords.includes('投资') || keywords.includes('理财')) return '制定理财计划';
    if (keywords.includes('消费')) return '评估消费必要性';
    if (keywords.includes('贷款') || keywords.includes('买房')) return '谨慎评估财务承受力';
    if (keywords.includes('存款')) return '设立储蓄目标';
    return '梳理财务状况';
}

function getFinanceActionDescription(query: string, keywords: string[]): string {
    if (keywords.includes('投资')) return '先学习基础知识，从小额开始，不懂的不要碰';
    if (keywords.includes('消费')) return '等待24小时再决定，区分"想要"和"需要"';
    if (keywords.includes('贷款') || keywords.includes('买房')) return '计算月供占收入比例，留足应急资金';
    return '记录收支，找出可优化的地方';
}

function generateFinanceReasoning(query: string, keywords: string[], state: LifeState): string {
    const reasons: string[] = [];
    if (keywords.includes('投资')) {
        reasons.push('投资需要知识储备和风险承受能力');
    }
    if (keywords.includes('消费')) {
        reasons.push('冲动消费是财务健康的大敌');
    }
    if (state.financialPressure === 'high' || state.financialPressure === 'critical') {
        reasons.push('当前财务压力较大，需要谨慎决策');
    }
    return reasons.length > 0 ? reasons.join('；') : '财务决策需要理性和规划';
}

function generateFinanceOutcome(query: string, keywords: string[]): string {
    if (keywords.includes('投资')) return '建立财务增长的基础';
    if (keywords.includes('消费')) return '避免不必要的支出，积累财富';
    return '财务状况更加清晰可控';
}

function getHealthActionName(query: string, keywords: string[]): string {
    if (keywords.includes('睡眠') || keywords.includes('熬夜')) return '改善睡眠习惯';
    if (keywords.includes('运动') || keywords.includes('健身')) return '开始简单锻炼';
    if (keywords.includes('压力') || keywords.includes('疲惫')) return '安排休息恢复';
    if (keywords.includes('减肥')) return '建立健康饮食习惯';
    return '关注身体信号';
}

function getHealthActionDescription(query: string, keywords: string[]): string {
    if (keywords.includes('睡眠') || keywords.includes('熬夜')) return '设定固定作息，睡前1小时远离屏幕';
    if (keywords.includes('运动')) return '从每天10分钟开始，选择喜欢的方式';
    if (keywords.includes('压力') || keywords.includes('疲惫')) return '今天早点休息，明天重新开始';
    if (keywords.includes('减肥')) return '减少加工食品，适当增加蛋白质';
    return '倾听身体的需求，及时休息';
}

function generateHealthReasoning(query: string, keywords: string[], state: LifeState): string {
    const reasons: string[] = [];
    if (keywords.includes('睡眠') || keywords.includes('熬夜')) {
        reasons.push('睡眠是所有能力的基础，值得优先解决');
    }
    if (keywords.includes('压力')) {
        reasons.push('长期压力会影响身心健康，需要主动管理');
    }
    if (state.energyLevel === 'exhausted' || state.energyLevel === 'low') {
        reasons.push('你当前能量较低，需要优先恢复');
    }
    return reasons.length > 0 ? reasons.join('；') : '身体是一切的本钱';
}

function generateHealthOutcome(query: string, keywords: string[]): string {
    if (keywords.includes('睡眠')) return '睡眠质量改善，白天精力更充沛';
    if (keywords.includes('运动')) return '体能提升，心情变好';
    if (keywords.includes('压力')) return '压力减轻，思路更清晰';
    return '身体状态改善，生活质量提升';
}

function getLearningActionName(query: string, keywords: string[]): string {
    if (keywords.includes('考试')) return '制定备考计划';
    if (keywords.includes('英语')) return '开始英语学习';
    if (keywords.includes('编程')) return '动手写代码';
    if (keywords.includes('读书')) return '建立阅读习惯';
    return '开始学习第一步';
}

function getLearningActionDescription(query: string, keywords: string[]): string {
    if (keywords.includes('考试')) return '拆分知识点，制定每日计划，坚持执行';
    if (keywords.includes('英语')) return '每天15分钟，用App或看美剧，贵在坚持';
    if (keywords.includes('编程')) return '选一个小项目，边做边学，比光看效率高';
    if (keywords.includes('读书')) return '每天睡前读10页，一年就是20本书';
    return '从最感兴趣的开始，降低启动门槛';
}

function generateLearningReasoning(query: string, keywords: string[], state: LifeState): string {
    const reasons: string[] = [];
    if (keywords.includes('考试')) {
        reasons.push('考试需要系统准备，早开始早受益');
    }
    if (state.skillMomentum === 'stagnant' || state.skillMomentum === 'declining') {
        reasons.push('你的技能发展处于停滞期，适时投资自己很重要');
    }
    reasons.push('学习是复利，今天种下的种子未来会开花');
    return reasons.join('；');
}

function generateLearningOutcome(query: string, keywords: string[]): string {
    if (keywords.includes('考试')) return '考试通过，获得证书';
    if (keywords.includes('英语')) return '英语能力提升，打开新的可能';
    if (keywords.includes('编程')) return '掌握新技能，提升竞争力';
    return '知识和能力的积累';
}

function generateScenarioAnxietyRelief(domain: string, query: string, keywords: string[]): string {
    switch (domain) {
        case 'work':
            if (keywords.includes('老板') || keywords.includes('汇报')) {
                return '记住，你的老板也是普通人，他也有压力。专注于你能控制的事情：准备充分、表达清晰。';
            }
            if (keywords.includes('辞职')) {
                return '无论你最终做什么决定，这都是你的人生，没有人比你更有资格决定。给自己时间思考。';
            }
            return '工作上的事情，很少有真正"天塌下来"的。先做好眼前的一小步。';

        case 'relationship':
            if (keywords.includes('吵架') || keywords.includes('冷战')) {
                return '关系中的冲突是正常的，关键是你愿意修复。迈出第一步已经是勇敢了。';
            }
            if (keywords.includes('表白')) {
                return '表达心意本身就是胜利。无论结果如何，你都会因为勇敢而更喜欢自己。';
            }
            return '人与人之间的连接是生命中最珍贵的东西。你愿意为此努力，这很棒。';

        case 'finance':
            return '财务决策可以慢慢来，没有必须"现在立刻"做的决定。理性和耐心是最好的投资策略。';

        case 'health':
            return '你愿意关注自己的健康，这本身就是爱自己的表现。一小步也是进步。';

        case 'learning':
            return '学习是投资自己，没有回报的学习很少。开始即胜利，坚持就是超越大多数人。';

        default:
            return '记住，选择本身就是进步。无论你选择什么，你都在向前走。';
    }
}

/**
 * 获取每日智慧话语
 */
export function getDailyWisdom(): { quote: string; source: string } {
    const avatar = getEnhancedDigitalAvatar();
    const state = extractCurrentState(avatar, undefined);

    // 根据状态选择合适的话语
    const wisdomPool = {
        lowEnergy: [
            { quote: '休息不是浪费时间，而是为了走更远的路。', source: '自我关怀' },
            { quote: '你不需要每天都精力充沛，允许自己有低谷。', source: '心理健康' }
        ],
        anxious: [
            { quote: '焦虑来自对未知的恐惧，但每一步行动都在消除未知。', source: '行动哲学' },
            { quote: '你担心的事情，80%不会发生。专注于当下能做的事。', source: '认知疗法' }
        ],
        lowSocial: [
            { quote: '一条简单的消息，可能点亮对方的一整天。', source: '人际关系' },
            { quote: '孤独不可怕，重要的是知道什么时候需要连接。', source: '情感智慧' }
        ],
        general: [
            { quote: '选择本身就是进步。无论你选择什么，你都在向前走。', source: '决策智慧' },
            { quote: '你不需要一次做对所有事，只需要做好下一件事。', source: '行动主义' },
            { quote: '最好的时机是十年前，其次是现在。', source: '时间管理' },
            { quote: '成长不是变得完美，而是学会接受不完美的自己。', source: '自我成长' },
            { quote: '人生是场马拉松，不是短跑。保持节奏比冲刺更重要。', source: '长期主义' }
        ]
    };

    let pool = wisdomPool.general;

    if (state.energyLevel === 'exhausted' || state.energyLevel === 'low') {
        pool = wisdomPool.lowEnergy;
    } else if (state.emotionalState === 'anxious' || state.emotionalState === 'stressed') {
        pool = wisdomPool.anxious;
    } else if (state.socialConnectedness === 'isolated' || state.socialConnectedness === 'weak') {
        pool = wisdomPool.lowSocial;
    }

    // 基于日期随机选择（同一天看到同一句话）
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const index = dayOfYear % pool.length;

    return pool[index];
}

/**
 * 获取前 N 个推荐行动
 */
export function getTopRecommendations(n: number = 3): ActionRecommendation[] {
    const avatar = getEnhancedDigitalAvatar();
    const state = extractCurrentState(avatar, undefined);
    const gamma = inferGamma(avatar?.personality);
    const optimizer = new BellmanLifeOptimizer(gamma, avatar?.valuesProfile);

    const availableActions = optimizer.getAvailableActions(state);

    // 计算所有行动的 Q 值
    const actionValues: Array<{ action: LifeAction; qValue: number }> = [];
    for (const action of availableActions) {
        const qValue = optimizer.getQValue(state, action);
        actionValues.push({ action, qValue });
    }

    // 排序并取前 N 个
    actionValues.sort((a, b) => b.qValue - a.qValue);
    const topActions = actionValues.slice(0, n);

    // 为每个行动生成完整的推荐
    return topActions.map((item, index) => {
        const confidence = Math.max(50, 90 - index * 15);

        return {
            action: item.action,
            qValue: item.qValue,
            confidence,
            reasoning: generateActionReasoning(state, item.action),
            expectedOutcome: generateActionOutcome(item.action),
            alternatives: [],
            anxietyRelief: ''
        };
    });
}

function generateActionReasoning(state: LifeState, action: LifeAction): string {
    const reasons: string[] = [];

    if (state.energyLevel === 'low' && action.energyCost > 0) {
        reasons.push('适合当前能量水平');
    }
    if (state.emotionalState === 'anxious' && action.emotionalImpact > 0) {
        reasons.push('有助于缓解焦虑');
    }
    if (action.skillGrowth > 0) {
        reasons.push('促进个人成长');
    }
    if (action.socialImpact > 0) {
        reasons.push('增进人际关系');
    }

    return reasons.length > 0 ? reasons.join('，') : '综合当前状态推荐';
}

function generateActionOutcome(action: LifeAction): string {
    const outcomes: string[] = [];

    if (action.energyCost > 0) outcomes.push('恢复精力');
    if (action.emotionalImpact > 0) outcomes.push('改善心情');
    if (action.skillGrowth > 0) outcomes.push('提升技能');
    if (action.socialImpact > 0) outcomes.push('增进关系');
    if (action.financialImpact > 0) outcomes.push('改善财务');

    return outcomes.join('、');
}

// ============================================================================
// Life Coach Panel 专用函数
// ============================================================================

/**
 * 获取当前人生状态（用于 UI 展示）
 */
export interface LifeStateDisplay {
    energy: number;
    emotion: number;
    skill: number;
    social: number;
    financial: number;
    context: string;
}

export function getCurrentLifeState(): LifeStateDisplay {
    const avatar = getEnhancedDigitalAvatar();
    const state = extractCurrentState(avatar, undefined);

    // 将枚举值转换为 0-100 的数值
    const energyMap: Record<EnergyLevel, number> = {
        'exhausted': 10,
        'low': 30,
        'moderate': 50,
        'high': 75,
        'peak': 95
    };

    const emotionMap: Record<EmotionalState, number> = {
        'stressed': 20,
        'anxious': 35,
        'neutral': 50,
        'calm': 70,
        'excited': 90
    };

    const skillMap: Record<SkillMomentum, number> = {
        'declining': 20,
        'stagnant': 35,
        'steady': 50,
        'growing': 75,
        'accelerating': 95
    };

    const socialMap: Record<SocialConnectedness, number> = {
        'isolated': 15,
        'weak': 35,
        'moderate': 50,
        'strong': 75,
        'thriving': 95
    };

    const financialMap: Record<FinancialPressure, number> = {
        'critical': 15,
        'high': 35,
        'moderate': 50,
        'low': 75,
        'comfortable': 95
    };

    return {
        energy: energyMap[state.energyLevel],
        emotion: emotionMap[state.emotionalState],
        skill: skillMap[state.skillMomentum],
        social: socialMap[state.socialConnectedness],
        financial: financialMap[state.financialPressure],
        context: state.currentContext
    };
}

/**
 * 获取主动洞察（基于当前状态生成建议）
 */
export interface ProactiveInsight {
    message: string;
    suggestion: string;
    priority: number;  // 1-10，越高越紧急
}

export function getProactiveInsights(): ProactiveInsight[] {
    const avatar = getEnhancedDigitalAvatar();
    const state = extractCurrentState(avatar, undefined);
    const insights: ProactiveInsight[] = [];

    // 能量洞察
    if (state.energyLevel === 'exhausted' || state.energyLevel === 'low') {
        insights.push({
            message: '能量水平较低，可能影响决策质量',
            suggestion: '建议今天早点休息，或抽10分钟做深呼吸放松',
            priority: 8
        });
    }

    // 情绪洞察
    if (state.emotionalState === 'stressed' || state.emotionalState === 'anxious') {
        insights.push({
            message: '检测到压力或焦虑信号',
            suggestion: '出去走走，或和朋友聊聊，这很正常',
            priority: 8
        });
    }

    // 社交洞察
    if (state.socialConnectedness === 'isolated' || state.socialConnectedness === 'weak') {
        insights.push({
            message: '社交连接度较低',
            suggestion: '发一条简单的问候消息，维护重要关系',
            priority: 5
        });
    }

    // 技能洞察
    if (state.skillMomentum === 'stagnant' || state.skillMomentum === 'declining') {
        insights.push({
            message: '技能成长动量不足',
            suggestion: '每天花15分钟学习一项新技能',
            priority: 4
        });
    }

    // 积极洞察
    if (state.energyLevel === 'high' || state.energyLevel === 'peak') {
        insights.push({
            message: '今天状态不错',
            suggestion: '适合处理那件你一直想做但没做的事情',
            priority: 2
        });
    }

    // 如果没有特别的洞察，给一个默认的
    if (insights.length === 0) {
        insights.push({
            message: '今日状态正常',
            suggestion: '继续保持，记得照顾好自己',
            priority: 1
        });
    }

    return insights;
}
