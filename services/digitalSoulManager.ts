/**
 * Digital Soul Manager - 数字分身统一管理器
 * 
 * 核心理念：
 * "数字分身是 Lumi 的灵魂，是所有智能优化的基础"
 * 
 * 功能：
 * 1. 统一管理所有数字分身数据
 * 2. 提供被动学习（从用户行为推断）
 * 3. 提供主动更新（用户主动输入）
 * 4. 与命运导航系统深度集成
 * 5. 计算画像完整度和质量
 */

import {
    EnhancedDigitalAvatar,
    SoulMatrix,
    LifeStateSnapshot,
    LifeStage,
    LifeTransition,
    DecisionHistory,
    PersonalityTraits,
    ValuesProfile,
    UserInteraction,
    Milestone
} from '../types.js';

import {
    getEnhancedDigitalAvatar,
    saveEnhancedDigitalAvatar,
    StorageKeys,
    loadData,
    saveData
} from './localStorageService.js';

import {
    getDigitalSoul,
    saveDigitalSoul,
    getDigitalSoulStats
} from './digitalSoulService.js';

import {
    LifeSnapshot as NavigatorLifeSnapshot,
    LifeMilestone,
    updateLifeState
} from './destinyNavigatorService.js';

// ============================================================================
// 常量与默认值
// ============================================================================

/**
 * 默认人生状态
 */
export const DEFAULT_LIFE_STATE: LifeStateSnapshot = {
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
};

/**
 * 默认命运偏好
 */
export const DEFAULT_DESTINY_PREFERENCES = {
    optimizationGoal: 'balance' as const,
    riskAppetite: 50,
    timeHorizon: 'medium' as const,
    priorityWeights: {
        wealth: 20,
        health: 25,
        relationships: 20,
        career: 20,
        fulfillment: 15
    },
    gamma: 0.92
};

// ============================================================================
// 核心管理类
// ============================================================================

/**
 * 数字分身管理器
 */
export class DigitalSoulManager {
    private static instance: DigitalSoulManager;
    private avatar: EnhancedDigitalAvatar;
    private soulMatrix: SoulMatrix;
    private listeners: Array<(avatar: EnhancedDigitalAvatar) => void> = [];
    
    private constructor() {
        this.avatar = getEnhancedDigitalAvatar();
        this.soulMatrix = getDigitalSoul();
        
        // 确保 avatar 有新增字段
        this.ensureLifeStateFields();
    }
    
    /**
     * 获取单例实例
     */
    static getInstance(): DigitalSoulManager {
        if (!DigitalSoulManager.instance) {
            DigitalSoulManager.instance = new DigitalSoulManager();
        }
        return DigitalSoulManager.instance;
    }
    
    /**
     * 确保 avatar 有人生状态字段
     */
    private ensureLifeStateFields(): void {
        if (!this.avatar.lifeState) {
            this.avatar.lifeState = { ...DEFAULT_LIFE_STATE };
        }
        if (!this.avatar.lifeTransitions) {
            this.avatar.lifeTransitions = [];
        }
        if (!this.avatar.decisionHistory) {
            this.avatar.decisionHistory = [];
        }
        if (!this.avatar.destinyPreferences) {
            this.avatar.destinyPreferences = { ...DEFAULT_DESTINY_PREFERENCES };
        }
        this.save();
    }
    
    // ========================================================================
    // 基础读写操作
    // ========================================================================
    
    /**
     * 获取完整的数字分身
     */
    getAvatar(): EnhancedDigitalAvatar {
        return this.avatar;
    }
    
    /**
     * 获取 SoulMatrix
     */
    getSoulMatrix(): SoulMatrix {
        return this.soulMatrix;
    }
    
    /**
     * 获取人生状态
     */
    getLifeState(): LifeStateSnapshot {
        return this.avatar.lifeState || DEFAULT_LIFE_STATE;
    }
    
    /**
     * 保存数据
     */
    private save(): void {
        saveEnhancedDigitalAvatar(this.avatar);
        this.notifyListeners();
    }
    
    /**
     * 注册变更监听器
     */
    subscribe(listener: (avatar: EnhancedDigitalAvatar) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    private notifyListeners(): void {
        this.listeners.forEach(l => l(this.avatar));
    }
    
    // ========================================================================
    // 人生状态更新
    // ========================================================================
    
    /**
     * 更新基本信息
     */
    updateBasicInfo(info: {
        age?: number;
        birthYear?: number;
        nickname?: string;
    }): void {
        if (info.age !== undefined) {
            this.avatar.lifeState.age = info.age;
            this.avatar.lifeState.lifeStage = this.inferLifeStage(info.age);
        }
        if (info.birthYear !== undefined) {
            this.avatar.lifeState.birthYear = info.birthYear;
        }
        if (info.nickname !== undefined) {
            this.avatar.nickname = info.nickname;
        }
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新教育信息
     */
    updateEducation(edu: Partial<LifeStateSnapshot['education']>): void {
        this.avatar.lifeState.education = {
            ...this.avatar.lifeState.education,
            ...edu
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新职业信息
     */
    updateCareer(career: Partial<LifeStateSnapshot['career']>): void {
        this.avatar.lifeState.career = {
            ...this.avatar.lifeState.career,
            ...career
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新财务状况
     */
    updateFinance(finance: Partial<LifeStateSnapshot['finance']>): void {
        this.avatar.lifeState.finance = {
            ...this.avatar.lifeState.finance,
            ...finance
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新健康状况
     */
    updateHealth(health: Partial<LifeStateSnapshot['health']>): void {
        this.avatar.lifeState.health = {
            ...this.avatar.lifeState.health,
            ...health
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新关系状态
     */
    updateRelationships(rel: Partial<LifeStateSnapshot['relationships']>): void {
        this.avatar.lifeState.relationships = {
            ...this.avatar.lifeState.relationships,
            ...rel
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新技能
     */
    updateSkills(skills: Partial<LifeStateSnapshot['skills']>): void {
        this.avatar.lifeState.skills = {
            ...this.avatar.lifeState.skills,
            ...skills
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新人生目标
     */
    updateLifeGoals(goals: Partial<LifeStateSnapshot['lifeGoals']>): void {
        this.avatar.lifeState.lifeGoals = {
            ...this.avatar.lifeState.lifeGoals,
            ...goals
        };
        this.updateCompleteness();
        this.save();
    }
    
    /**
     * 更新当前挑战
     */
    updateChallenges(challenges: Partial<LifeStateSnapshot['currentChallenges']>): void {
        this.avatar.lifeState.currentChallenges = {
            ...this.avatar.lifeState.currentChallenges,
            ...challenges
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 更新命运导航偏好
     */
    updateDestinyPreferences(prefs: Partial<EnhancedDigitalAvatar['destinyPreferences']>): void {
        this.avatar.destinyPreferences = {
            ...this.avatar.destinyPreferences,
            ...prefs
        };
        this.syncToDestinyNavigator();
        this.save();
    }
    
    /**
     * 批量更新人生状态
     */
    updateLifeState(state: Partial<LifeStateSnapshot>): void {
        this.avatar.lifeState = {
            ...this.avatar.lifeState,
            ...state,
            lastUpdated: Date.now()
        };
        this.updateCompleteness();
        this.syncToDestinyNavigator();
        this.save();
    }
    
    // ========================================================================
    // 人生转折点管理
    // ========================================================================
    
    /**
     * 添加人生转折点
     */
    addLifeTransition(transition: Omit<LifeTransition, 'id'>): LifeTransition {
        const newTransition: LifeTransition = {
            ...transition,
            id: `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        this.avatar.lifeTransitions.push(newTransition);
        
        // 添加里程碑
        this.addMilestone({
            type: 'achievement',
            title: transition.title,
            description: transition.description,
            icon: this.getTransitionIcon(transition.type)
        });
        
        this.save();
        return newTransition;
    }
    
    /**
     * 获取人生转折点
     */
    getLifeTransitions(): LifeTransition[] {
        return this.avatar.lifeTransitions || [];
    }
    
    private getTransitionIcon(type: LifeTransition['type']): string {
        const icons: Record<LifeTransition['type'], string> = {
            education: '🎓',
            career: '💼',
            relationship: '💑',
            health: '❤️',
            finance: '💰',
            relocation: '🏠',
            other: '⭐'
        };
        return icons[type] || '⭐';
    }
    
    // ========================================================================
    // 决策历史管理
    // ========================================================================
    
    /**
     * 记录决策
     */
    recordDecision(decision: Omit<DecisionHistory, 'id'>): DecisionHistory {
        const newDecision: DecisionHistory = {
            ...decision,
            id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        this.avatar.decisionHistory.push(newDecision);
        this.save();
        return newDecision;
    }
    
    /**
     * 更新决策结果
     */
    updateDecisionOutcome(
        decisionId: string, 
        outcome: NonNullable<DecisionHistory['outcome']>
    ): void {
        const decision = this.avatar.decisionHistory.find(d => d.id === decisionId);
        if (decision) {
            decision.outcome = outcome;
            this.save();
        }
    }
    
    /**
     * 获取决策历史
     */
    getDecisionHistory(): DecisionHistory[] {
        return this.avatar.decisionHistory || [];
    }
    
    /**
     * 分析决策模式
     */
    analyzeDecisionPattern(): {
        followAdviceRate: number;
        avgSatisfaction: number;
        mostCommonRegrets: string[];
    } {
        const decisions = this.avatar.decisionHistory || [];
        if (decisions.length === 0) {
            return { followAdviceRate: 0, avgSatisfaction: 0, mostCommonRegrets: [] };
        }
        
        const withAdvice = decisions.filter(d => d.lumiAdvice);
        const followAdviceRate = withAdvice.length > 0 
            ? withAdvice.filter(d => d.followedAdvice).length / withAdvice.length * 100
            : 0;
        
        const withOutcome = decisions.filter(d => d.outcome);
        const avgSatisfaction = withOutcome.length > 0
            ? withOutcome.reduce((sum, d) => sum + (d.outcome?.satisfaction || 0), 0) / withOutcome.length
            : 0;
        
        // 简单统计低满意度的决策
        const regrets = withOutcome
            .filter(d => d.outcome && d.outcome.satisfaction < 50)
            .map(d => d.context)
            .slice(0, 3);
        
        return {
            followAdviceRate,
            avgSatisfaction,
            mostCommonRegrets: regrets
        };
    }
    
    // ========================================================================
    // 里程碑管理
    // ========================================================================
    
    /**
     * 添加里程碑
     */
    addMilestone(milestone: Omit<Milestone, 'id' | 'timestamp'>): Milestone {
        const newMilestone: Milestone = {
            ...milestone,
            id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        };
        this.avatar.milestones.push(newMilestone);
        this.save();
        return newMilestone;
    }
    
    // ========================================================================
    // 与命运导航系统同步
    // ========================================================================
    
    /**
     * 同步到命运导航器
     */
    syncToDestinyNavigator(): void {
        const lifeState = this.avatar.lifeState;
        const prefs = this.avatar.destinyPreferences;
        
        // 转换为命运导航器的状态格式
        const navigatorState: Partial<NavigatorLifeSnapshot> = {
            age: lifeState.age,
            wealth: this.mapFinanceToValue(lifeState.finance),
            income: this.mapIncomeToValue(lifeState.finance.incomeLevel),
            health: lifeState.health.physicalHealth,
            energy: lifeState.health.energyLevel,
            mentalHealth: lifeState.health.mentalHealth,
            networkQuality: lifeState.resources.networkQuality,
            socialStatus: this.calculateSocialStatus(),
            familyHappiness: lifeState.relationships.familyRelationshipQuality,
            purposeClarity: this.calculatePurposeClarity(),
            fulfillment: this.calculateFulfillment()
        };
        
        // 更新命运导航器状态
        updateLifeState(navigatorState);
    }
    
    /**
     * 从命运导航获取建议并记录
     */
    recordNavigatorRecommendation(
        recommendation: string,
        context: string,
        accepted: boolean
    ): void {
        if (accepted) {
            // 如果接受建议，记录为决策
            this.recordDecision({
                date: Date.now(),
                context,
                options: ['接受 Lumi 建议', '其他选择'],
                chosen: '接受 Lumi 建议',
                reasoning: '采纳了 Lumi 的命运导航建议',
                lumiAdvice: recommendation,
                followedAdvice: true
            });
        }
    }
    
    // ========================================================================
    // 被动学习 - 从用户行为推断
    // ========================================================================
    
    /**
     * 从用户交互推断特征
     */
    inferFromInteraction(interaction: UserInteraction): void {
        // 更新交互统计
        this.avatar.totalInteractions += 1;
        
        switch (interaction.type) {
            case 'message_sent':
                this.avatar.totalMessages += 1;
                this.inferFromMessage(interaction.data);
                break;
            case 'tool_used':
                this.avatar.totalToolUses += 1;
                this.inferFromToolUse(interaction.data);
                break;
            case 'draft_accept':
            case 'draft_edit':
                this.inferFromDraftAction(interaction);
                break;
        }
        
        // 更新情绪
        if (interaction.sentiment !== undefined) {
            this.updateMoodFromSentiment(interaction.sentiment);
        }
        
        // 更新活跃时间
        const hour = new Date(interaction.timestamp).getHours();
        const day = new Date(interaction.timestamp).getDay();
        if (this.avatar.activeHours[hour] !== undefined) {
            this.avatar.activeHours[hour] += 1;
        }
        if (this.avatar.activeDays[day] !== undefined) {
            this.avatar.activeDays[day] += 1;
        }
        
        this.avatar.lastAnalyzedAt = Date.now();
        this.save();
    }
    
    private inferFromMessage(data: Record<string, any>): void {
        // 支持两种字段名：text 或 message
        const text = (data.text || data.message) as string;
        if (!text) return;
        
        // 推断情绪关键词
        const stressKeywords = ['压力', '焦虑', '担心', '烦', '累', '难', 'stress', 'anxious', 'tired'];
        const positiveKeywords = ['开心', '高兴', '棒', '好', 'happy', 'great', 'good', 'excited'];
        
        const hasStress = stressKeywords.some(k => text.includes(k));
        const hasPositive = positiveKeywords.some(k => text.includes(k));
        
        if (hasStress) {
            this.avatar.lifeState.currentChallenges.stressLevel = Math.min(100,
                this.avatar.lifeState.currentChallenges.stressLevel + 2);
            this.avatar.lifeState.health.mentalHealth = Math.max(0,
                this.avatar.lifeState.health.mentalHealth - 1);
        }
        if (hasPositive) {
            this.avatar.lifeState.currentChallenges.stressLevel = Math.max(0,
                this.avatar.lifeState.currentChallenges.stressLevel - 1);
            this.avatar.lifeState.health.mentalHealth = Math.min(100,
                this.avatar.lifeState.health.mentalHealth + 1);
        }
        
        // 推断话题兴趣
        const topics = this.extractTopics(text);
        topics.forEach(topic => {
            const existing = this.avatar.interestTags.find(t => t.name === topic);
            if (existing) {
                existing.occurrences += 1;
                existing.lastSeen = Date.now();
                existing.weight = Math.min(1, existing.weight + 0.05);
            } else {
                this.avatar.interestTags.push({
                    name: topic,
                    weight: 0.3,
                    lastSeen: Date.now(),
                    occurrences: 1
                });
            }
        });
    }
    
    private extractTopics(text: string): string[] {
        const topicPatterns: Record<string, RegExp> = {
            '工作': /工作|项目|会议|同事|老板|加班|work|job|meeting/i,
            '学习': /学习|课程|考试|培训|learn|study|course/i,
            '健康': /健康|运动|睡眠|医院|健身|health|exercise|sleep/i,
            '财务': /钱|工资|投资|理财|存款|money|salary|invest/i,
            '关系': /朋友|家人|约会|恋爱|friend|family|date/i,
            '旅行': /旅行|旅游|出差|机票|酒店|travel|trip|flight/i
        };
        
        return Object.entries(topicPatterns)
            .filter(([_, pattern]) => pattern.test(text))
            .map(([topic]) => topic);
    }
    
    private inferFromToolUse(data: Record<string, any>): void {
        const toolName = data.toolName as string;
        if (!toolName) return;
        
        // 更新常用工具
        if (!this.avatar.behaviorPatterns.preferredTools.includes(toolName)) {
            if (this.avatar.behaviorPatterns.preferredTools.length < 10) {
                this.avatar.behaviorPatterns.preferredTools.push(toolName);
            }
        }
        
        // 特定工具推断
        if (toolName === 'calculator' || toolName === 'finance') {
            // 可能对财务感兴趣
            this.avatar.valuesProfile.efficiency += 1;
        }
    }
    
    private inferFromDraftAction(interaction: UserInteraction): void {
        if (interaction.type === 'draft_accept') {
            // 接受率高 -> 可能是决策快的人
            this.avatar.personality.decisionSpeed = Math.min(100,
                this.avatar.personality.decisionSpeed + 1);
        } else if (interaction.type === 'draft_edit') {
            // 编辑多 -> 可能是谨慎的人
            this.avatar.personality.conscientiousness = Math.min(100,
                this.avatar.personality.conscientiousness + 0.5);
        }
    }
    
    private updateMoodFromSentiment(sentiment: number): void {
        const currentMood = this.avatar.emotionalProfile.currentMoodScore;
        // 使用 EMA 更新情绪
        const alpha = 0.1;
        this.avatar.emotionalProfile.currentMoodScore = 
            currentMood * (1 - alpha) + sentiment * alpha;
        
        // 更新情绪状态
        if (this.avatar.emotionalProfile.currentMoodScore > 30) {
            this.avatar.emotionalProfile.currentMood = 'positive';
        } else if (this.avatar.emotionalProfile.currentMoodScore < -30) {
            this.avatar.emotionalProfile.currentMood = 'negative';
        } else {
            this.avatar.emotionalProfile.currentMood = 'neutral';
        }
    }
    
    // ========================================================================
    // 辅助函数
    // ========================================================================
    
    /**
     * 推断人生阶段
     */
    private inferLifeStage(age: number): LifeStage {
        if (age < 22) return 'student';
        if (age < 30) return 'early_career';
        if (age < 40) return 'career_growth';
        if (age < 55) return 'career_peak';
        if (age < 65) return 'late_career';
        return 'retired';
    }
    
    /**
     * 计算画像完整度
     */
    private updateCompleteness(): void {
        const state = this.avatar.lifeState;
        let score = 0;
        let total = 0;
        
        // 基本信息 (权重 15%)
        total += 15;
        if (state.age) score += 5;
        if (state.lifeStage) score += 5;
        if (this.avatar.nickname) score += 5;
        
        // 教育 (权重 10%)
        total += 10;
        if (state.education.highestDegree) score += 5;
        if (state.education.field) score += 5;
        
        // 职业 (权重 15%)
        total += 15;
        if (state.career.currentStatus) score += 5;
        if (state.career.industry) score += 5;
        if (state.career.role) score += 5;
        
        // 财务 (权重 10%)
        total += 10;
        if (state.finance.incomeLevel) score += 5;
        if (state.finance.savingsLevel) score += 5;
        
        // 健康 (权重 10%)
        total += 10;
        if (state.health.physicalHealth > 0) score += 5;
        if (state.health.mentalHealth > 0) score += 5;
        
        // 关系 (权重 10%)
        total += 10;
        if (state.relationships.status) score += 5;
        if (state.relationships.socialCircleSize) score += 5;
        
        // 技能 (权重 10%)
        total += 10;
        if (state.skills.topSkills.length > 0) score += 5;
        if (state.skills.learningGoals.length > 0) score += 5;
        
        // 目标 (权重 10%)
        total += 10;
        if (state.lifeGoals.shortTerm.length > 0) score += 3;
        if (state.lifeGoals.mediumTerm.length > 0) score += 3;
        if (state.lifeGoals.coreValues.length > 0) score += 4;
        
        // 挑战 (权重 10%)
        total += 10;
        if (state.currentChallenges.primaryConcerns.length > 0) score += 5;
        if (state.currentChallenges.bigDecisions.length > 0) score += 5;
        
        this.avatar.lifeState.completeness = Math.round((score / total) * 100);
        this.avatar.profileCompleteness = this.avatar.lifeState.completeness;
    }
    
    private mapFinanceToValue(finance: LifeStateSnapshot['finance']): number {
        const incomeMap = { low: 20, medium: 40, high: 60, very_high: 80 };
        const savingsMap = { none: 0, low: 10, medium: 25, high: 40 };
        const debtMap = { none: 0, low: -5, medium: -15, high: -30 };
        
        return Math.max(0, Math.min(100,
            incomeMap[finance.incomeLevel] +
            savingsMap[finance.savingsLevel] +
            debtMap[finance.debtLevel]
        ));
    }
    
    private mapIncomeToValue(level: LifeStateSnapshot['finance']['incomeLevel']): number {
        const map = { low: 25, medium: 50, high: 75, very_high: 95 };
        return map[level];
    }
    
    private calculateSocialStatus(): number {
        const career = this.avatar.lifeState.career;
        const edu = this.avatar.lifeState.education;
        
        let status = 30;
        
        // 教育加成
        const eduBonus = { high_school: 0, bachelor: 10, master: 20, phd: 30, other: 5 };
        status += eduBonus[edu.highestDegree];
        
        // 职业状态加成
        if (career.currentStatus === 'self_employed') status += 15;
        if (career.yearsOfExperience > 10) status += 10;
        
        return Math.min(100, status);
    }
    
    private calculatePurposeClarity(): number {
        const goals = this.avatar.lifeState.lifeGoals;
        let clarity = 20;
        
        if (goals.shortTerm.length > 0) clarity += 15;
        if (goals.mediumTerm.length > 0) clarity += 20;
        if (goals.longTerm.length > 0) clarity += 20;
        if (goals.coreValues.length > 0) clarity += 15;
        if (goals.lifeVision) clarity += 10;
        
        return Math.min(100, clarity);
    }
    
    private calculateFulfillment(): number {
        const state = this.avatar.lifeState;
        return Math.round(
            (state.career.careerSatisfaction * 0.3) +
            (state.relationships.socialSatisfaction * 0.2) +
            (state.health.mentalHealth * 0.2) +
            ((100 - state.currentChallenges.stressLevel) * 0.15) +
            (this.calculatePurposeClarity() * 0.15)
        );
    }
    
    // ========================================================================
    // 导出报告
    // ========================================================================
    
    /**
     * 生成数字分身摘要
     */
    generateSummary(): {
        nickname: string;
        age: number;
        lifeStage: string;
        profileCompleteness: number;
        keyTraits: string[];
        currentFocus: string[];
        strengthAreas: string[];
        improvementAreas: string[];
    } {
        const state = this.avatar.lifeState;
        const personality = this.avatar.personality;
        
        // 关键特征
        const keyTraits: string[] = [];
        if (personality.openness > 70) keyTraits.push('开放创新');
        if (personality.conscientiousness > 70) keyTraits.push('严谨自律');
        if (personality.extraversion > 70) keyTraits.push('外向健谈');
        if (personality.agreeableness > 70) keyTraits.push('温和友善');
        if (personality.riskTolerance > 70) keyTraits.push('敢于冒险');
        if (personality.decisionSpeed > 70) keyTraits.push('决断果敢');
        
        // 当前关注
        const currentFocus = state.currentChallenges.primaryConcerns.slice(0, 3);
        
        // 优势领域
        const strengthAreas: string[] = [];
        if (state.health.physicalHealth > 70) strengthAreas.push('身体健康');
        if (state.relationships.socialSatisfaction > 70) strengthAreas.push('社交关系');
        if (state.career.careerSatisfaction > 70) strengthAreas.push('职业发展');
        if (state.resources.networkQuality > 70) strengthAreas.push('人脉资源');
        
        // 提升领域
        const improvementAreas: string[] = [];
        if (state.health.physicalHealth < 50) improvementAreas.push('身体健康');
        if (state.health.mentalHealth < 50) improvementAreas.push('心理健康');
        if (state.finance.financialStress > 60) improvementAreas.push('财务压力');
        if (state.currentChallenges.stressLevel > 60) improvementAreas.push('压力管理');
        
        return {
            nickname: this.avatar.nickname || '用户',
            age: state.age,
            lifeStage: this.getLifeStageLabel(state.lifeStage),
            profileCompleteness: this.avatar.profileCompleteness,
            keyTraits: keyTraits.slice(0, 4),
            currentFocus,
            strengthAreas: strengthAreas.slice(0, 3),
            improvementAreas: improvementAreas.slice(0, 3)
        };
    }
    
    private getLifeStageLabel(stage: LifeStage): string {
        const labels: Record<LifeStage, string> = {
            student: '学生阶段',
            early_career: '职业早期',
            career_growth: '职业成长期',
            career_peak: '职业巅峰期',
            late_career: '职业后期',
            retired: '退休生活'
        };
        return labels[stage];
    }
}

// ============================================================================
// 便捷函数
// ============================================================================

let _manager: DigitalSoulManager | null = null;

export function getDigitalSoulManager(): DigitalSoulManager {
    if (!_manager) {
        _manager = DigitalSoulManager.getInstance();
    }
    return _manager;
}

export function getLifeState(): LifeStateSnapshot {
    return getDigitalSoulManager().getLifeState();
}

export function updateLifeStateField<K extends keyof LifeStateSnapshot>(
    field: K,
    value: LifeStateSnapshot[K]
): void {
    getDigitalSoulManager().updateLifeState({ [field]: value });
}

export function recordLifeTransition(transition: Omit<LifeTransition, 'id'>): LifeTransition {
    return getDigitalSoulManager().addLifeTransition(transition);
}

export function getDigitalSoulSummary() {
    return getDigitalSoulManager().generateSummary();
}
