/**
 * Local Storage Service - 统一的本地存储管理服务
 * 
 * 功能：
 * - 数据持久化 (localStorage)
 * - 类型安全的存取方法
 * - 用户交互记录
 * - 数字分身画像管理
 * - 增强型人格画像分析
 */

import {
    UserInteraction,
    DigitalAvatar,
    WritingPreference,
    InterestTag,
    EnhancedDigitalAvatar,
    PersonalityTraits,
    CommunicationStyle,
    BehaviorPatterns,
    EmotionalProfile,
    SocialGraph,
    ValuesProfile,
    Milestone,
    LifeStateSnapshot,
    LifeTransition,
    DecisionHistory
} from '../types.js';

// ============================================================================
// Storage Keys - 所有本地存储键的统一管理
// ============================================================================

export const StorageKeys = {
    // 现有存储键
    MEMORY_GRAPH: 'lumi_memory_graph',
    CALENDAR_EVENTS: 'lumi_calendar_events',
    REMINDERS: 'lumi_reminders',
    NOTES: 'lumi_notes',
    API_KEY: 'lumi_gemini_api_key',
    API_KEY_PERSIST: 'lumi_api_key_persist',

    // 数字分身相关
    USER_PROFILE: 'lumi_user_profile',
    INTERACTIONS: 'lumi_interactions',
    DIGITAL_AVATAR: 'lumi_digital_avatar',
    DIGITAL_SOUL: 'lumi_digital_soul',
    DIGITAL_SOUL_STATS: 'lumi_digital_soul_stats',

    // 增强型数字分身
    ENHANCED_AVATAR: 'lumi_enhanced_avatar',
    MESSAGE_SAMPLES: 'lumi_message_samples',
    SESSION_HISTORY: 'lumi_session_history',

    // 设置
    THEME: 'lumi_theme',
    ONBOARDING_COMPLETED: 'lumi_onboarding_completed',
} as const;

// ============================================================================
// Generic Storage Methods - 泛型存取方法
// ============================================================================

/**
 * 保存数据到 localStorage
 */
export function saveData<T>(key: string, data: T): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`[LocalStorage] Failed to save ${key}:`, error);
        return false;
    }
}

/**
 * 从 localStorage 加载数据
 */
export function loadData<T>(key: string): T | null {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        return JSON.parse(stored) as T;
    } catch (error) {
        console.error(`[LocalStorage] Failed to load ${key}:`, error);
        return null;
    }
}

/**
 * 获取数据，如果不存在则初始化为默认值
 */
export function getOrInit<T>(key: string, defaultValue: T): T {
    const data = loadData<T>(key);
    if (data === null) {
        saveData(key, defaultValue);
        return defaultValue;
    }
    return data;
}

/**
 * 删除指定键的数据
 */
export function removeData(key: string): void {
    localStorage.removeItem(key);
}

/**
 * 清空所有 Lumi 相关数据
 */
export function clearAllLumiData(): void {
    Object.values(StorageKeys).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('[LocalStorage] All Lumi data cleared');
}

// ============================================================================
// User Interaction Recording - 用户交互记录
// ============================================================================

/**
 * 记录用户交互
 */
export function recordInteraction(
    type: UserInteraction['type'],
    data: Record<string, any>,
    appContext?: string
): void {
    const interaction: UserInteraction = {
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        data,
        timestamp: Date.now(),
        appContext,
    };

    // 获取现有记录
    const interactions = getOrInit<UserInteraction[]>(StorageKeys.INTERACTIONS, []);

    // 添加新记录（保留最近 500 条）
    interactions.push(interaction);
    if (interactions.length > 500) {
        interactions.splice(0, interactions.length - 500);
    }

    saveData(StorageKeys.INTERACTIONS, interactions);

    // 同时更新数字分身（旧版）
    updateDigitalAvatar(interaction);
    
    // 同时更新增强版数字分身（调用 DigitalSoulManager）
    try {
        // 动态导入避免循环依赖
        import('./digitalSoulManager').then(({ getDigitalSoulManager }) => {
            const manager = getDigitalSoulManager();
            manager.inferFromInteraction(interaction);
        }).catch(() => {
            // 如果 manager 还没准备好，忽略
        });
    } catch (e) {
        // 忽略初始化阶段的错误
    }
}

/**
 * 获取用户交互记录
 */
export function getInteractions(limit?: number): UserInteraction[] {
    const interactions = loadData<UserInteraction[]>(StorageKeys.INTERACTIONS) || [];
    if (limit) {
        return interactions.slice(-limit);
    }
    return interactions;
}

/**
 * 获取交互统计
 */
export function getInteractionStats(): {
    total: number;
    byType: Record<string, number>;
    last24h: number;
    last7d: number;
} {
    const interactions = getInteractions();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const stats = {
        total: interactions.length,
        byType: {} as Record<string, number>,
        last24h: 0,
        last7d: 0,
    };

    for (const int of interactions) {
        // 按类型统计
        stats.byType[int.type] = (stats.byType[int.type] || 0) + 1;

        // 时间段统计
        const age = now - int.timestamp;
        if (age < day) stats.last24h++;
        if (age < 7 * day) stats.last7d++;
    }

    return stats;
}

/**
 * 获取仪表盘统计数据
 */
export function getDashboardStats(): {
    todayAssists: number;
    acceptanceRate: number;
    timeSavedMinutes: number;
    profileCompleteness: number;
} {
    const interactions = getInteractions();
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    // 今日辅助次数（今天的所有交互）
    const todayAssists = interactions.filter(i => i.timestamp >= todayStart).length;
    
    // 接受率（draft_accept / (draft_accept + draft_edit)）
    const accepts = interactions.filter(i => i.type === 'draft_accept' || i.type === 'draft_selected').length;
    const edits = interactions.filter(i => i.type === 'draft_edit').length;
    const totalDrafts = accepts + edits;
    const acceptanceRate = totalDrafts > 0 ? Math.round((accepts / totalDrafts) * 100) : 0;
    
    // 节省时间估算（每次辅助平均节省 30 秒）
    const timeSavedMinutes = Math.round((interactions.length * 0.5) / 60);
    
    // 画像完整度
    const avatar = getEnhancedDigitalAvatar();
    const profileCompleteness = avatar.profileCompleteness || 0;
    
    return {
        todayAssists,
        acceptanceRate,
        timeSavedMinutes,
        profileCompleteness
    };
}

// ============================================================================
// Digital Avatar Management - 数字分身画像管理
// ============================================================================

/**
 * 获取默认数字分身
 */
function getDefaultAvatar(): DigitalAvatar {
    return {
        id: `avatar-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalInteractions: 0,
        totalMessages: 0,
        totalToolUses: 0,
        writingPreference: {
            preferredTones: [],
            avgMessageLength: 0,
            emojiUsage: 'medium',
            formality: 'mixed',
        },
        interestTags: [],
        activeHours: new Array(24).fill(0),
        activeDays: new Array(7).fill(0),
    };
}

/**
 * 获取数字分身
 */
export function getDigitalAvatar(): DigitalAvatar {
    return getOrInit<DigitalAvatar>(StorageKeys.DIGITAL_AVATAR, getDefaultAvatar());
}

/**
 * 保存数字分身
 */
export function saveDigitalAvatar(avatar: DigitalAvatar): void {
    avatar.updatedAt = Date.now();
    saveData(StorageKeys.DIGITAL_AVATAR, avatar);
}

/**
 * 根据交互更新数字分身
 */
function updateDigitalAvatar(interaction: UserInteraction): void {
    const avatar = getDigitalAvatar();

    // 更新总计数
    avatar.totalInteractions++;

    // 根据类型更新
    switch (interaction.type) {
        case 'message_sent':
            avatar.totalMessages++;
            // 更新消息长度统计
            const msgLen = interaction.data.messageLength || 0;
            const prevTotal = avatar.writingPreference.avgMessageLength * (avatar.totalMessages - 1);
            avatar.writingPreference.avgMessageLength = Math.round((prevTotal + msgLen) / avatar.totalMessages);

            // 检测 emoji 使用
            const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(interaction.data.message || '');
            if (hasEmoji) {
                avatar.writingPreference.emojiUsage = 'high';
            }
            break;

        case 'tool_used':
            avatar.totalToolUses++;
            // 提取工具相关兴趣标签
            const toolName = interaction.data.toolName;
            if (toolName) {
                updateInterestTag(avatar, toolName, 0.5);
            }
            break;

        case 'draft_selected':
        case 'draft_accept':
            // 记录偏好的语气风格
            const tone = interaction.data.tone;
            if (tone && !avatar.writingPreference.preferredTones.includes(tone)) {
                avatar.writingPreference.preferredTones.push(tone);
                // 只保留最常用的5种风格
                if (avatar.writingPreference.preferredTones.length > 5) {
                    avatar.writingPreference.preferredTones.shift();
                }
            }
            break;

        case 'card_clicked':
        case 'card_click': {
            const title = interaction.data.title || interaction.data.cardTitle;
            if (title) {
                updateInterestTag(avatar, title, 0.4);
            }
            break;
        }
    }

    // 更新活跃时间
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    avatar.activeHours[hour]++;
    avatar.activeDays[day]++;

    saveDigitalAvatar(avatar);
}

/**
 * 更新兴趣标签
 */
function updateInterestTag(avatar: DigitalAvatar, tagName: string, weight: number): void {
    const existing = avatar.interestTags.find(t => t.name === tagName);

    if (existing) {
        existing.occurrences++;
        existing.lastSeen = Date.now();
        // 权重衰减 + 新增
        existing.weight = Math.min(1, existing.weight * 0.9 + weight * 0.1);
    } else {
        avatar.interestTags.push({
            name: tagName,
            weight,
            lastSeen: Date.now(),
            occurrences: 1,
        });
    }

    // 按权重排序，只保留前20个标签
    avatar.interestTags.sort((a, b) => b.weight - a.weight);
    if (avatar.interestTags.length > 20) {
        avatar.interestTags = avatar.interestTags.slice(0, 20);
    }
}

/**
 * 添加兴趣标签（外部调用）
 */
export function addInterestTag(tagName: string, weight: number = 0.5): void {
    const avatar = getDigitalAvatar();
    updateInterestTag(avatar, tagName, weight);
    saveDigitalAvatar(avatar);
}

/**
 * 重置数字分身
 */
export function resetDigitalAvatar(): void {
    saveData(StorageKeys.DIGITAL_AVATAR, getDefaultAvatar());
    saveData(StorageKeys.INTERACTIONS, []);
}

// ============================================================================
// Data Export/Import - 数据导入导出
// ============================================================================

/**
 * 导出所有 Lumi 数据
 */
export function exportAllData(): object {
    const data: Record<string, any> = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        source: 'Lumio B-End Platform',
    };

    // 导出所有存储键的数据
    for (const [name, key] of Object.entries(StorageKeys)) {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                data[name] = JSON.parse(stored);
            } catch {
                data[name] = stored;
            }
        }
    }

    return data;
}

/**
 * 导入 Lumi 数据
 */
export function importData(data: Record<string, any>): boolean {
    try {
        for (const [name, value] of Object.entries(data)) {
            const key = (StorageKeys as any)[name];
            if (key && value !== undefined) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
        return true;
    } catch (error) {
        console.error('[LocalStorage] Import failed:', error);
        return false;
    }
}

/**
 * 下载数据为 JSON 文件
 */
export function downloadDataAsJSON(): void {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumio-platform-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// Enhanced Digital Avatar - 增强型数字分身
// ============================================================================

/**
 * 获取默认的增强型数字分身
 */
function getDefaultEnhancedAvatar(): EnhancedDigitalAvatar {
    const base = getDefaultAvatar();
    return {
        ...base,
        version: '2.0',

        personality: {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50,
            rationalVsEmotional: 0,
            riskTolerance: 50,
            decisionSpeed: 50,
            creativityIndex: 50,
            confidence: 0,
            sampleSize: 0,
        },

        communicationStyle: {
            formality: 'adaptive',
            expressiveness: 50,
            directness: 50,
            humorUsage: 30,
            vocabularyRichness: 50,
            avgSentenceLength: 0,
            avgMessageLength: 0,
            punctuationStyle: 'normal',
            questionFrequency: 30,
            responseSpeed: 'moderate',
            emojiFrequency: 30,
            topEmojis: [],
            emojiSentiment: 'neutral',
        },

        behaviorPatterns: {
            chronotype: 'flexible',
            peakProductivityHours: [],
            weekendVsWeekday: 100,
            avgSessionDuration: 0,
            sessionsPerDay: 0,
            longestSession: 0,
            decisionStyle: 'mixed',
            confirmationRate: 50,
            undoFrequency: 20,
            multitaskingTendency: 50,
            taskCompletionRate: 80,
            focusScore: 50,
            preferredTools: [],
            toolExplorationRate: 30,
        },

        emotionalProfile: {
            currentMood: 'neutral',
            currentMoodScore: 0,
            moodHistory: [],
            baselinePositivity: 60,
            emotionalStability: 70,
            stressIndicators: 30,
            resilienceScore: 60,
            positiveTriggeredBy: [],
            negativeTriggeredBy: [],
        },

        socialGraph: {
            contacts: [],
            socialCircleSize: 0,
            socialActivityLevel: 50,
            relationshipDepth: 'moderate',
            workRelatedRatio: 50,
            personalRelatedRatio: 50,
        },

        valuesProfile: {
            efficiency: 70,
            quality: 70,
            creativity: 50,
            stability: 50,
            growth: 60,
            connection: 50,
            workLifeBalance: 60,
            privacyConcern: 70,
            priceVsQuality: 0,
            impulsiveness: 30,
            preferredTopics: [],
            contentDepthPreference: 'mixed',
            learningStyle: 'textual',
        },

        // === 新增：人生状态维度 ===
        lifeState: {
            age: 28,
            lifeStage: 'early_career',
            education: {
                highestDegree: 'bachelor',
                field: undefined,
                institutions: []
            },
            career: {
                currentStatus: 'employed',
                industry: undefined,
                role: undefined,
                yearsOfExperience: 5,
                careerSatisfaction: 60
            },
            finance: {
                incomeLevel: 'medium',
                savingsLevel: 'low',
                debtLevel: 'low',
                financialStress: 40,
                hasInvestments: false,
                hasProperty: false
            },
            health: {
                physicalHealth: 70,
                mentalHealth: 65,
                energyLevel: 65,
                sleepQuality: 60,
                exerciseFrequency: 'rarely'
            },
            relationships: {
                status: 'single',
                hasChildren: false,
                familyRelationshipQuality: 70,
                socialCircleSize: 'medium',
                socialSatisfaction: 60
            },
            skills: {
                topSkills: [],
                learningGoals: [],
                languageAbilities: ['中文'],
                technicalProficiency: 50,
                leadershipExperience: 30
            },
            lifeGoals: {
                shortTerm: [],
                mediumTerm: [],
                longTerm: [],
                coreValues: []
            },
            currentChallenges: {
                primaryConcerns: [],
                stressLevel: 40,
                anxietyTriggers: [],
                bigDecisions: []
            },
            resources: {
                networkQuality: 50,
                mentorAccess: false,
                uniqueAdvantages: [],
                availableTime: 'moderate'
            },
            lastUpdated: Date.now(),
            completeness: 10,
            dataSource: 'manual'
        },
        lifeTransitions: [],
        decisionHistory: [],
        
        // === 新增：命运导航偏好 ===
        destinyPreferences: {
            optimizationGoal: 'balance',
            riskAppetite: 50,
            timeHorizon: 'medium',
            priorityWeights: {
                wealth: 20,
                health: 25,
                relationships: 20,
                career: 20,
                fulfillment: 15
            },
            gamma: 0.92
        },

        milestones: [{
            id: 'first_use',
            type: 'first_use',
            title: '🎉 初次相遇',
            description: '开始使用 Lumi 智能助手',
            timestamp: Date.now(),
        }],
        currentStreak: 1,
        longestStreak: 1,

        profileCompleteness: 5,
        lastAnalyzedAt: Date.now(),
        analysisVersion: '2.0.0',

        privacyMode: false,
        dataRetentionDays: 365,
    };
}

/**
 * 获取增强型数字分身
 */
export function getEnhancedDigitalAvatar(): EnhancedDigitalAvatar {
    return getOrInit<EnhancedDigitalAvatar>(StorageKeys.ENHANCED_AVATAR, getDefaultEnhancedAvatar());
}

/**
 * 保存增强型数字分身
 */
export function saveEnhancedDigitalAvatar(avatar: EnhancedDigitalAvatar): void {
    avatar.updatedAt = Date.now();
    saveData(StorageKeys.ENHANCED_AVATAR, avatar);
}

/**
 * 保存消息样本 (用于分析)
 */
export function saveMessageSample(message: string, sentiment?: number): void {
    const samples = getOrInit<Array<{ text: string; timestamp: number; sentiment?: number }>>(
        StorageKeys.MESSAGE_SAMPLES,
        []
    );

    samples.push({
        text: message,
        timestamp: Date.now(),
        sentiment,
    });

    // 保留最近 200 条
    if (samples.length > 200) {
        samples.splice(0, samples.length - 200);
    }

    saveData(StorageKeys.MESSAGE_SAMPLES, samples);
}

/**
 * 获取消息样本
 */
export function getMessageSamples(): Array<{ text: string; timestamp: number; sentiment?: number }> {
    return loadData(StorageKeys.MESSAGE_SAMPLES) || [];
}

// ============================================================================
// Analysis Algorithms - 分析算法
// ============================================================================

/**
 * 分析性格特征
 */
export function analyzePersonality(interactions: UserInteraction[]): Partial<PersonalityTraits> {
    if (interactions.length < 5) {
        return { confidence: 0, sampleSize: interactions.length };
    }

    const messages = interactions.filter(i => i.type === 'message_sent');
    const toolUses = interactions.filter(i => i.type === 'tool_used');

    // 开放性: 基于工具探索多样性和消息内容丰富度
    const uniqueTools = new Set(toolUses.map(t => t.data.toolName)).size;
    const openness = Math.min(100, 30 + uniqueTools * 10);

    // 外向性: 基于消息频率和长度
    const avgMsgLen = messages.reduce((sum, m) => sum + (m.data.messageLength || 0), 0) / Math.max(1, messages.length);
    const extraversion = Math.min(100, Math.max(0, 30 + avgMsgLen / 5));

    // 尽责性: 基于任务完成情况
    const conscientiousness = 60; // 需要更多数据点

    // 宜人性: 基于积极情感
    const positiveCount = interactions.filter(i => (i.sentiment || 0) > 20).length;
    const agreeableness = Math.min(100, 40 + (positiveCount / interactions.length) * 60);

    // 神经质: 基于情绪波动
    const sentiments = interactions.filter(i => i.sentiment !== undefined).map(i => i.sentiment!);
    const volatility = sentiments.length > 2 ? calculateVolatility(sentiments) : 30;
    const neuroticism = Math.min(100, volatility);

    // 理性vs感性: 基于emoji使用和工具使用
    const emojiMessages = messages.filter(m => /[\u{1F300}-\u{1F9FF}]/u.test(m.data.message || '')).length;
    const emojiRatio = emojiMessages / Math.max(1, messages.length);
    const rationalVsEmotional = Math.round((1 - emojiRatio * 2) * 50); // -100 到 100

    // 决策速度: 基于响应时间模式 (简化版)
    const decisionSpeed = 50;

    // 创造力: 基于词汇多样性
    const creativityIndex = Math.min(100, 40 + uniqueTools * 5);

    return {
        openness,
        conscientiousness,
        extraversion,
        agreeableness,
        neuroticism,
        rationalVsEmotional,
        riskTolerance: 50,
        decisionSpeed,
        creativityIndex,
        confidence: Math.min(100, interactions.length * 2),
        sampleSize: interactions.length,
    };
}

/**
 * 计算波动性
 */
function calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * 分析沟通风格
 */
export function analyzeCommunicationStyle(messages: string[]): Partial<CommunicationStyle> {
    if (messages.length === 0) {
        return {};
    }

    // 消息长度统计
    const lengths = messages.map(m => m.length);
    const avgMessageLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

    // 句子长度 (简化: 按句号分割)
    const allSentences = messages.flatMap(m => m.split(/[。.！!？?]/)).filter(s => s.trim());
    const avgSentenceLength = allSentences.length > 0
        ? Math.round(allSentences.reduce((sum, s) => sum + s.length, 0) / allSentences.length)
        : 0;

    // 正式程度: 基于标点和用词
    const formalIndicators = messages.filter(m => /您|请|谢谢|麻烦/.test(m)).length;
    const casualIndicators = messages.filter(m => /哈哈|呢|啦|嘛|噢/.test(m)).length;
    const formality: 'formal' | 'casual' | 'adaptive' =
        formalIndicators > casualIndicators * 2 ? 'formal' :
            casualIndicators > formalIndicators * 2 ? 'casual' : 'adaptive';

    // 表达丰富度: 基于词汇多样性
    const allWords = messages.join(' ').split(/[\s，,。.！!？?]+/).filter(w => w);
    const uniqueWords = new Set(allWords).size;
    const vocabularyRichness = Math.min(100, Math.round((uniqueWords / Math.max(1, allWords.length)) * 200));

    // 问号频率
    const questionCount = messages.filter(m => m.includes('?') || m.includes('？')).length;
    const questionFrequency = Math.min(100, Math.round((questionCount / messages.length) * 100));

    // Emoji 分析
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const allEmojis = messages.flatMap(m => m.match(emojiRegex) || []);
    const emojiFrequency = Math.min(100, Math.round((allEmojis.length / messages.length) * 50));

    // 统计 top emojis
    const emojiCount: Record<string, number> = {};
    allEmojis.forEach(e => { emojiCount[e] = (emojiCount[e] || 0) + 1; });
    const topEmojis = Object.entries(emojiCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([emoji]) => emoji);

    // 标点风格
    const exclamationCount = messages.filter(m => m.includes('!') || m.includes('！')).length;
    const punctuationStyle: 'minimal' | 'normal' | 'expressive' =
        exclamationCount > messages.length * 0.3 ? 'expressive' :
            exclamationCount < messages.length * 0.1 ? 'minimal' : 'normal';

    // 直接程度 (简化)
    const directness = formality === 'casual' ? 70 : formality === 'formal' ? 40 : 55;

    // 幽默使用 (检测常见幽默标记)
    const humorIndicators = messages.filter(m => /哈哈|😂|🤣|笑|逗/.test(m)).length;
    const humorUsage = Math.min(100, Math.round((humorIndicators / messages.length) * 100));

    return {
        formality,
        expressiveness: Math.min(100, vocabularyRichness + emojiFrequency / 2),
        directness,
        humorUsage,
        vocabularyRichness,
        avgSentenceLength,
        avgMessageLength,
        punctuationStyle,
        questionFrequency,
        responseSpeed: 'moderate',
        emojiFrequency,
        topEmojis,
        emojiSentiment: emojiFrequency > 30 ? 'positive' : 'neutral',
    };
}

/**
 * 分析行为模式
 */
export function analyzeBehaviorPatterns(interactions: UserInteraction[]): Partial<BehaviorPatterns> {
    if (interactions.length < 3) {
        return {};
    }

    // 分析活跃时段
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    interactions.forEach(int => {
        const date = new Date(int.timestamp);
        hourCounts[date.getHours()]++;
        dayCounts[date.getDay()]++;
    });

    // 找到高峰时段
    const maxHourCount = Math.max(...hourCounts);
    const peakProductivityHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter(h => h.count >= maxHourCount * 0.7)
        .map(h => h.hour)
        .slice(0, 3);

    // 作息类型
    const morningActivity = hourCounts.slice(5, 12).reduce((a, b) => a + b, 0);
    const eveningActivity = hourCounts.slice(18, 24).reduce((a, b) => a + b, 0);
    const chronotype: 'morning_person' | 'night_owl' | 'flexible' =
        morningActivity > eveningActivity * 1.5 ? 'morning_person' :
            eveningActivity > morningActivity * 1.5 ? 'night_owl' : 'flexible';

    // 周末vs工作日
    const weekendActivity = dayCounts[0] + dayCounts[6];
    const weekdayActivity = dayCounts.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekendVsWeekday = Math.round((weekendActivity / Math.max(1, weekdayActivity / 5)) * 100);

    // 工具使用偏好
    const toolUses = interactions.filter(i => i.type === 'tool_used');
    const toolCount: Record<string, number> = {};
    toolUses.forEach(t => {
        const name = t.data.toolName || 'unknown';
        toolCount[name] = (toolCount[name] || 0) + 1;
    });
    const preferredTools = Object.entries(toolCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

    // 工具探索率
    const uniqueTools = new Set(Object.keys(toolCount)).size;
    const toolExplorationRate = Math.min(100, uniqueTools * 15);

    return {
        chronotype,
        peakProductivityHours,
        weekendVsWeekday,
        avgSessionDuration: 10, // 需要 session 追踪
        sessionsPerDay: Math.round(interactions.length / 7),
        longestSession: 30,
        decisionStyle: 'mixed',
        confirmationRate: 50,
        undoFrequency: 20,
        multitaskingTendency: uniqueTools > 3 ? 70 : 40,
        taskCompletionRate: 80,
        focusScore: 60,
        preferredTools,
        toolExplorationRate,
    };
}

/**
 * 分析情绪画像
 */
export function analyzeEmotionalProfile(interactions: UserInteraction[]): Partial<EmotionalProfile> {
    const withSentiment = interactions.filter(i => i.sentiment !== undefined);

    if (withSentiment.length === 0) {
        return {
            currentMood: 'neutral',
            currentMoodScore: 0,
        };
    }

    // 当前情绪 (最近5条平均)
    const recent = withSentiment.slice(-5);
    const currentMoodScore = Math.round(
        recent.reduce((sum, i) => sum + i.sentiment!, 0) / recent.length
    );
    const currentMood: 'positive' | 'neutral' | 'negative' =
        currentMoodScore > 30 ? 'positive' :
            currentMoodScore < -30 ? 'negative' : 'neutral';

    // 基准积极度
    const avgSentiment = withSentiment.reduce((sum, i) => sum + i.sentiment!, 0) / withSentiment.length;
    const baselinePositivity = Math.min(100, Math.max(0, 50 + avgSentiment / 2));

    // 情绪稳定性 (基于波动)
    const sentiments = withSentiment.map(i => i.sentiment!);
    const volatility = calculateVolatility(sentiments);
    const emotionalStability = Math.max(0, 100 - volatility);

    // 压力指标 (负面情绪比例)
    const negativeCount = withSentiment.filter(i => i.sentiment! < -20).length;
    const stressIndicators = Math.min(100, (negativeCount / withSentiment.length) * 150);

    return {
        currentMood,
        currentMoodScore,
        moodHistory: [],
        baselinePositivity,
        emotionalStability,
        stressIndicators,
        resilienceScore: emotionalStability * 0.8,
        positiveTriggeredBy: [],
        negativeTriggeredBy: [],
    };
}

/**
 * 计算画像完整度
 */
function calculateProfileCompleteness(avatar: EnhancedDigitalAvatar): number {
    let score = 0;

    // 基础信息 (10%)
    if (avatar.nickname) score += 5;
    if (avatar.totalInteractions > 0) score += 5;

    // 性格分析 (20%)
    if (avatar.personality.sampleSize > 10) score += 10;
    if (avatar.personality.confidence > 50) score += 10;

    // 沟通风格 (20%)
    if (avatar.communicationStyle.avgMessageLength > 0) score += 10;
    if (avatar.communicationStyle.topEmojis.length > 0) score += 10;

    // 行为模式 (20%)
    if (avatar.behaviorPatterns.peakProductivityHours.length > 0) score += 10;
    if (avatar.behaviorPatterns.preferredTools.length > 0) score += 10;

    // 情绪画像 (15%)
    if (avatar.emotionalProfile.moodHistory.length > 0) score += 8;
    if (avatar.emotionalProfile.emotionalStability > 0) score += 7;

    // 价值观 (10%)
    if (avatar.valuesProfile.preferredTopics.length > 0) score += 10;

    // 里程碑 (5%)
    if (avatar.milestones.length > 1) score += 5;

    return Math.min(100, score);
}

/**
 * 刷新增强型数字分身分析
 */
export function refreshEnhancedAvatarAnalysis(): EnhancedDigitalAvatar {
    const avatar = getEnhancedDigitalAvatar();
    const interactions = getInteractions();
    const messages = getMessageSamples().map(s => s.text);

    // 更新基础统计
    const baseAvatar = getDigitalAvatar();
    avatar.totalInteractions = baseAvatar.totalInteractions;
    avatar.totalMessages = baseAvatar.totalMessages;
    avatar.totalToolUses = baseAvatar.totalToolUses;
    avatar.activeHours = baseAvatar.activeHours;
    avatar.activeDays = baseAvatar.activeDays;
    avatar.interestTags = baseAvatar.interestTags;
    avatar.writingPreference = baseAvatar.writingPreference;

    // 运行分析
    const personalityUpdate = analyzePersonality(interactions);
    Object.assign(avatar.personality, personalityUpdate);

    const commStyleUpdate = analyzeCommunicationStyle(messages);
    Object.assign(avatar.communicationStyle, commStyleUpdate);

    const behaviorUpdate = analyzeBehaviorPatterns(interactions);
    Object.assign(avatar.behaviorPatterns, behaviorUpdate);

    const emotionalUpdate = analyzeEmotionalProfile(interactions);
    Object.assign(avatar.emotionalProfile, emotionalUpdate);

    // 更新元数据
    avatar.profileCompleteness = calculateProfileCompleteness(avatar);
    avatar.lastAnalyzedAt = Date.now();

    // 检查里程碑
    checkAndAddMilestones(avatar);

    saveEnhancedDigitalAvatar(avatar);

    console.log('[EnhancedAvatar] Analysis refreshed, completeness:', avatar.profileCompleteness);

    return avatar;
}

/**
 * 检查并添加里程碑
 */
function checkAndAddMilestones(avatar: EnhancedDigitalAvatar): void {
    const existingTypes = new Set(avatar.milestones.map(m => m.id));

    // 消息数量里程碑
    if (avatar.totalMessages >= 10 && !existingTypes.has('messages_10')) {
        avatar.milestones.push({
            id: 'messages_10',
            type: 'achievement',
            title: '💬 健谈者',
            description: '发送了 10 条消息',
            timestamp: Date.now(),
        });
    }

    if (avatar.totalMessages >= 100 && !existingTypes.has('messages_100')) {
        avatar.milestones.push({
            id: 'messages_100',
            type: 'achievement',
            title: '🗣️ 社交达人',
            description: '发送了 100 条消息',
            timestamp: Date.now(),
        });
    }

    // 工具使用里程碑
    if (avatar.totalToolUses >= 5 && !existingTypes.has('tools_5')) {
        avatar.milestones.push({
            id: 'tools_5',
            type: 'achievement',
            title: '🛠️ 工具探索者',
            description: '使用了 5 次工具',
            timestamp: Date.now(),
        });
    }

    // 画像完整度里程碑
    if (avatar.profileCompleteness >= 50 && !existingTypes.has('profile_50')) {
        avatar.milestones.push({
            id: 'profile_50',
            type: 'level_up',
            title: '📊 画像成形',
            description: '数字分身完整度达到 50%',
            timestamp: Date.now(),
        });
    }
}

/**
 * 重置增强型数字分身
 */
export function resetEnhancedDigitalAvatar(): void {
    saveData(StorageKeys.ENHANCED_AVATAR, getDefaultEnhancedAvatar());
    saveData(StorageKeys.MESSAGE_SAMPLES, []);
    saveData(StorageKeys.SESSION_HISTORY, []);
    resetDigitalAvatar();
    console.log('[EnhancedAvatar] Reset complete');
}

/**
 * 切换隐私模式
 */
export function togglePrivacyMode(enabled: boolean): void {
    const avatar = getEnhancedDigitalAvatar();
    avatar.privacyMode = enabled;
    saveEnhancedDigitalAvatar(avatar);
    console.log('[EnhancedAvatar] Privacy mode:', enabled ? 'ON' : 'OFF');
}

/**
 * 记录交互 (增强版，同时保存消息样本)
 */
export function recordEnhancedInteraction(
    type: UserInteraction['type'],
    data: Record<string, any>,
    appContext?: string
): void {
    const avatar = getEnhancedDigitalAvatar();

    // 如果隐私模式开启，跳过记录
    if (avatar.privacyMode) {
        console.log('[EnhancedAvatar] Privacy mode enabled, skipping record');
        return;
    }

    // 计算情感值 (简化版)
    let sentiment: number | undefined;
    if (type === 'message_sent' && data.message) {
        sentiment = calculateSimpleSentiment(data.message);
    }

    // 记录基础交互
    recordInteraction(type, data, appContext);

    // 保存消息样本
    if (type === 'message_sent' && data.message) {
        saveMessageSample(data.message, sentiment);
    }

    // 定期刷新分析 (每10次交互)
    if ((avatar.totalInteractions + 1) % 10 === 0) {
        refreshEnhancedAvatarAnalysis();
    }
}

/**
 * 简单情感分析
 */
function calculateSimpleSentiment(text: string): number {
    const positiveWords = ['好', '棒', '喜欢', '谢谢', '开心', '不错', '太好了', '感谢', '爱', '赞'];
    const negativeWords = ['不', '差', '烦', '讨厌', '糟', '难', '累', '坏', '错', '无聊'];
    const positiveEmojis = ['😊', '😄', '🥰', '❤️', '👍', '🎉', '✨', '💪'];
    const negativeEmojis = ['😢', '😭', '😤', '😡', '💔', '😞', '😔'];

    let score = 0;

    positiveWords.forEach(w => { if (text.includes(w)) score += 15; });
    negativeWords.forEach(w => { if (text.includes(w)) score -= 15; });
    positiveEmojis.forEach(e => { if (text.includes(e)) score += 20; });
    negativeEmojis.forEach(e => { if (text.includes(e)) score -= 20; });

    return Math.max(-100, Math.min(100, score));
}
