/**
 * State Extractor - 从数字分身和上下文提取当前生活状态
 * 
 * 这是 Bellman 优化器的输入提取层，将用户的数字身份数据
 * 转换为可计算的 MDP 状态空间
 */

import {
    EnhancedDigitalAvatar,
    PersonalityTraits,
    EmotionalProfile,
    BehaviorPatterns,
    ValuesProfile,
    AppContext
} from '../types';
import { getEnhancedDigitalAvatar } from './localStorageService';

// ============================================================================
// Life State Definition
// ============================================================================

/**
 * 生活阶段
 */
export type LifeStage = 'student' | 'early_career' | 'mid_career' | 'senior' | 'unknown';

/**
 * 情绪状态
 */
export type EmotionalState = 'stressed' | 'anxious' | 'neutral' | 'calm' | 'excited';

/**
 * 能量等级
 */
export type EnergyLevel = 'exhausted' | 'low' | 'moderate' | 'high' | 'peak';

/**
 * 财务压力
 */
export type FinancialPressure = 'critical' | 'high' | 'moderate' | 'low' | 'comfortable';

/**
 * 社交连接度
 */
export type SocialConnectedness = 'isolated' | 'weak' | 'moderate' | 'strong' | 'thriving';

/**
 * 技能动量
 */
export type SkillMomentum = 'declining' | 'stagnant' | 'steady' | 'growing' | 'accelerating';

/**
 * 当前上下文
 */
export type CurrentContext = 'work' | 'social' | 'shopping' | 'planning' | 'learning' | 'health' | 'leisure' | 'unknown';

/**
 * 完整的生活状态
 * 这是 MDP 的状态空间
 */
export interface LifeState {
    // 基础维度
    lifeStage: LifeStage;
    emotionalState: EmotionalState;
    energyLevel: EnergyLevel;
    financialPressure: FinancialPressure;
    socialConnectedness: SocialConnectedness;
    skillMomentum: SkillMomentum;

    // 上下文
    currentContext: CurrentContext;

    // 元数据
    timestamp: number;
    confidence: number;  // 状态提取的置信度 0-100
}

// ============================================================================
// State Extraction Functions
// ============================================================================

/**
 * 从用户活跃时间推断生活阶段
 */
function inferLifeStage(avatar: EnhancedDigitalAvatar | null): LifeStage {
    if (!avatar) return 'unknown';

    const patterns = avatar.behaviorPatterns;
    const values = avatar.valuesProfile;

    // 基于工作/生活比例和学习倾向推断
    if (values && values.growth > 70 && values.workLifeBalance && values.workLifeBalance < 40) {
        return 'student';
    }

    if (values && values.growth > 60 && values.efficiency > 50) {
        return 'early_career';
    }

    if (values && values.stability > 60 && values.connection > 50) {
        return 'mid_career';
    }

    if (values && values.stability > 70) {
        return 'senior';
    }

    return 'early_career';  // 默认
}

/**
 * 从情绪画像提取情绪状态
 */
function inferEmotionalState(emotional: EmotionalProfile | undefined): EmotionalState {
    if (!emotional) return 'neutral';

    const moodScore = emotional.currentMoodScore;
    const stability = emotional.emotionalStability;
    const stress = emotional.stressIndicators;

    if (stress > 70) return 'stressed';
    if (moodScore < -30 || stability < 30) return 'anxious';
    if (moodScore > 50 && stability > 60) return 'excited';
    if (moodScore > 20 && stress < 30) return 'calm';

    return 'neutral';
}

/**
 * 从行为模式推断能量等级
 */
function inferEnergyLevel(patterns: BehaviorPatterns | undefined): EnergyLevel {
    if (!patterns) return 'moderate';

    const now = new Date();
    const currentHour = now.getHours();
    const peakHours = patterns.peakProductivityHours || [];

    // 检查是否在高效时段
    const isInPeakHours = peakHours.includes(currentHour);
    const sessionDuration = patterns.avgSessionDuration || 30;
    const focus = patterns.focusScore || 50;

    if (focus < 30 || sessionDuration < 10) return 'exhausted';
    if (focus < 50) return 'low';
    if (isInPeakHours && focus > 70) return 'peak';
    if (focus > 60) return 'high';

    return 'moderate';
}

/**
 * 从价值观推断财务压力
 */
function inferFinancialPressure(values: ValuesProfile | undefined): FinancialPressure {
    if (!values) return 'moderate';

    const priceVsQuality = values.priceVsQuality;  // -100 到 100
    const impulsiveness = values.impulsiveness;

    // 高价格敏感 + 低冲动 = 财务压力大
    if (priceVsQuality < -60) return 'critical';
    if (priceVsQuality < -30 && impulsiveness < 30) return 'high';
    if (priceVsQuality > 30) return 'low';
    if (priceVsQuality > 60) return 'comfortable';

    return 'moderate';
}

/**
 * 从社交图谱推断社交连接度
 */
function inferSocialConnectedness(avatar: EnhancedDigitalAvatar | null): SocialConnectedness {
    if (!avatar?.socialGraph) return 'moderate';

    const social = avatar.socialGraph;
    const activityLevel = social.socialActivityLevel;
    const circleSize = social.socialCircleSize;

    if (activityLevel < 20 && circleSize < 5) return 'isolated';
    if (activityLevel < 40) return 'weak';
    if (activityLevel > 80 && circleSize > 20) return 'thriving';
    if (activityLevel > 60) return 'strong';

    return 'moderate';
}

/**
 * 从工具使用和学习行为推断技能动量
 */
function inferSkillMomentum(patterns: BehaviorPatterns | undefined): SkillMomentum {
    if (!patterns) return 'steady';

    const explorationRate = patterns.toolExplorationRate || 50;
    const completionRate = patterns.taskCompletionRate || 50;

    if (explorationRate > 70 && completionRate > 70) return 'accelerating';
    if (explorationRate > 50 && completionRate > 50) return 'growing';
    if (explorationRate < 20 && completionRate < 40) return 'declining';
    if (explorationRate < 30) return 'stagnant';

    return 'steady';
}

/**
 * 从 App 包名映射到上下文
 */
function mapAppToContext(packageName: string | undefined): CurrentContext {
    if (!packageName) return 'unknown';

    const pkg = packageName.toLowerCase();

    // 工作相关
    if (pkg.includes('slack') || pkg.includes('teams') || pkg.includes('outlook') ||
        pkg.includes('gmail') || pkg.includes('docs') || pkg.includes('sheets') ||
        pkg.includes('notion') || pkg.includes('钉钉') || pkg.includes('企业微信')) {
        return 'work';
    }

    // 社交相关
    if (pkg.includes('wechat') || pkg.includes('whatsapp') || pkg.includes('messenger') ||
        pkg.includes('instagram') || pkg.includes('twitter') || pkg.includes('微信') ||
        pkg.includes('qq') || pkg.includes('weibo')) {
        return 'social';
    }

    // 购物相关
    if (pkg.includes('taobao') || pkg.includes('jd') || pkg.includes('pinduoduo') ||
        pkg.includes('amazon') || pkg.includes('淘宝') || pkg.includes('京东') ||
        pkg.includes('拼多多') || pkg.includes('shopping')) {
        return 'shopping';
    }

    // 学习相关
    if (pkg.includes('coursera') || pkg.includes('duolingo') || pkg.includes('kindle') ||
        pkg.includes('udemy') || pkg.includes('得到') || pkg.includes('喜马拉雅') ||
        pkg.includes('知乎')) {
        return 'learning';
    }

    // 健康相关
    if (pkg.includes('health') || pkg.includes('fitness') || pkg.includes('keep') ||
        pkg.includes('sleep') || pkg.includes('薄荷')) {
        return 'health';
    }

    // 娱乐休闲
    if (pkg.includes('youtube') || pkg.includes('netflix') || pkg.includes('spotify') ||
        pkg.includes('bilibili') || pkg.includes('抖音') || pkg.includes('game')) {
        return 'leisure';
    }

    // 规划相关
    if (pkg.includes('calendar') || pkg.includes('todo') || pkg.includes('reminder') ||
        pkg.includes('notes') || pkg.includes('日历')) {
        return 'planning';
    }

    return 'unknown';
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * 从数字分身和上下文提取当前生活状态
 */
export function extractCurrentState(
    avatar: EnhancedDigitalAvatar | null,
    context?: AppContext,
    recentMessages?: string[]
): LifeState {
    let confidence = 30;  // 基础置信度

    // 如果有数字分身，增加置信度
    if (avatar) {
        confidence += 30;
        if (avatar.personality) confidence += 10;
        if (avatar.emotionalProfile) confidence += 10;
        if (avatar.behaviorPatterns) confidence += 10;
        if (avatar.valuesProfile) confidence += 10;
    }

    return {
        lifeStage: inferLifeStage(avatar),
        emotionalState: inferEmotionalState(avatar?.emotionalProfile),
        energyLevel: inferEnergyLevel(avatar?.behaviorPatterns),
        financialPressure: inferFinancialPressure(avatar?.valuesProfile),
        socialConnectedness: inferSocialConnectedness(avatar),
        skillMomentum: inferSkillMomentum(avatar?.behaviorPatterns),
        currentContext: mapAppToContext(context?.packageName),
        timestamp: Date.now(),
        confidence: Math.min(100, confidence)
    };
}

/**
 * 获取当前完整状态（包含从 localStorage 加载数字分身）
 */
export function getCurrentLifeState(context?: AppContext): LifeState {
    const avatar = getEnhancedDigitalAvatar();
    return extractCurrentState(avatar, context);
}

/**
 * 将状态转换为字符串键（用于 Value Iteration 的状态索引）
 */
export function stateToKey(state: LifeState): string {
    return `${state.lifeStage}|${state.emotionalState}|${state.energyLevel}|${state.financialPressure}|${state.socialConnectedness}|${state.skillMomentum}|${state.currentContext}`;
}

/**
 * 从字符串键解析状态
 */
export function keyToState(key: string): Partial<LifeState> {
    const parts = key.split('|');
    return {
        lifeStage: parts[0] as LifeStage,
        emotionalState: parts[1] as EmotionalState,
        energyLevel: parts[2] as EnergyLevel,
        financialPressure: parts[3] as FinancialPressure,
        socialConnectedness: parts[4] as SocialConnectedness,
        skillMomentum: parts[5] as SkillMomentum,
        currentContext: parts[6] as CurrentContext
    };
}
