/**
 * Destiny Navigator Service - 命运导航系统
 * 
 * "Waze for Destiny" - 人生的全局最优路径导航
 * 
 * 核心理念：
 * 1. 不预测未来，计算让未来后悔最小化的决定
 * 2. 在虚拟世界试错 100 万次，让你在现实世界一次做对
 * 3. 把"人"当作上市公司运营，追求人生价值最大化
 * 
 * 技术实现：
 * - 状态空间：人生的多维度状态 (年龄、财富、健康、技能、关系等)
 * - 动作空间：人生的重大选择 (教育、工作、婚姻、投资等)
 * - 转移概率：基于统计和个人特征的状态转移概率
 * - 奖励函数：个人化的价值观加权
 * - 折扣因子 γ：远见程度 (0.95 = 极度远见)
 */

import { SoulMatrix, EnhancedDigitalAvatar, ValuesProfile, PersonalityTraits, LifeStateSnapshot } from '../types';
import { getEnhancedDigitalAvatar } from './localStorageService';
import { inferGamma } from './bellmanLifeService';
import { getDigitalSoulManager, DEFAULT_LIFE_STATE } from './digitalSoulManager';

// ============================================================================
// 人生状态空间定义 (Life State Space)
// ============================================================================

/**
 * 人生阶段里程碑
 */
export type LifeMilestone = 
    | 'education_high_school'      // 高中
    | 'education_undergraduate'    // 本科
    | 'education_masters'          // 硕士
    | 'education_phd'              // 博士
    | 'career_first_job'           // 第一份工作
    | 'career_senior'              // 资深职位
    | 'career_management'          // 管理层
    | 'career_executive'           // 高管
    | 'career_entrepreneur'        // 创业
    | 'relationship_dating'        // 恋爱
    | 'relationship_married'       // 已婚
    | 'relationship_parent'        // 为人父母
    | 'wealth_debt'                // 负债
    | 'wealth_stable'              // 稳定
    | 'wealth_comfortable'         // 小康
    | 'wealth_affluent'            // 富裕
    | 'wealth_financial_freedom';  // 财务自由

/**
 * 完整的人生状态
 */
export interface LifeSnapshot {
    // 基本属性
    age: number;                    // 年龄
    
    // 财富维度 (0-100 归一化)
    wealth: number;                 // 净资产水平
    income: number;                 // 收入水平
    debtLevel: number;              // 负债水平
    
    // 人力资本维度
    skills: Map<string, number>;    // 技能树 {技能名: 熟练度}
    education: LifeMilestone[];     // 已达成的教育里程碑
    careerTrack: LifeMilestone[];   // 职业轨迹
    
    // 社会资本维度
    networkQuality: number;         // 人脉质量 (0-100)
    networkSize: number;            // 人脉数量
    socialStatus: number;           // 社会地位 (0-100)
    
    // 生命资本维度
    health: number;                 // 健康水平 (0-100)
    energy: number;                 // 精力水平 (0-100)
    mentalHealth: number;           // 心理健康 (0-100)
    
    // 关系资本维度
    relationshipStatus: LifeMilestone | null;
    familyHappiness: number;        // 家庭幸福度 (0-100)
    
    // 自我实现维度
    purposeClarity: number;         // 人生目标清晰度 (0-100)
    fulfillment: number;            // 自我实现度 (0-100)
    
    // 时间戳
    timestamp: number;
}

/**
 * 人生决策类型
 */
export type LifeDecisionType = 
    | 'education'      // 教育选择
    | 'career'         // 职业选择
    | 'relationship'   // 感情选择
    | 'investment'     // 投资选择
    | 'health'         // 健康选择
    | 'relocation'     // 居住地选择
    | 'lifestyle';     // 生活方式选择

/**
 * 人生重大决策
 */
export interface LifeDecision {
    id: string;
    type: LifeDecisionType;
    name: string;
    description: string;
    
    // 决策的影响
    impacts: {
        wealth?: number;           // 对财富的影响 (-100 到 +100)
        income?: number;           // 对收入的影响
        skills?: { name: string; delta: number }[];  // 对技能的影响
        health?: number;           // 对健康的影响
        network?: number;          // 对人脉的影响
        fulfillment?: number;      // 对自我实现的影响
        risk?: number;             // 风险等级 (0-100)
    };
    
    // 前置条件
    prerequisites?: {
        minAge?: number;
        maxAge?: number;
        minWealth?: number;
        requiredSkills?: string[];
        requiredMilestones?: LifeMilestone[];
    };
    
    // 成功概率基准
    baseSuccessProbability: number;  // 0-1
    
    // 时间成本 (年)
    timeCost: number;
    
    // 机会成本
    opportunityCost: string[];  // 选择这个会放弃什么
}

/**
 * 模拟路径结果
 */
export interface SimulatedPath {
    id: string;
    decisions: LifeDecision[];
    snapshots: LifeSnapshot[];        // 各时间点的状态快照
    finalValue: number;               // 最终价值
    cumulativeValue: number;          // 累计价值 (考虑折扣)
    successProbability: number;       // 成功概率
    regretScore: number;              // 后悔分数 (越低越好)
    keyMilestones: LifeMilestone[];   // 达成的里程碑
    riskEvents: string[];             // 经历的风险事件
}

/**
 * 导航建议
 */
export interface NavigationAdvice {
    recommendedPath: SimulatedPath;
    alternativePaths: SimulatedPath[];
    currentPosition: LifeSnapshot;
    nextBestAction: LifeDecision;
    
    // Waze 风格的显示
    etaToGoal: number;               // 预计达成目标的年数
    riskAhead: string[];             // 前方风险提示
    opportunities: string[];          // 机会提示
    rerouting: boolean;               // 是否需要重新规划
    reroutingReason?: string;         // 重新规划的原因
    
    // 关键指标
    currentLifeValue: number;         // 当前人生价值
    projectedLifeValue: number;       // 预期人生价值
    regretMinimization: number;       // 后悔最小化指数 (0-100)
    
    // 智慧金句
    wisdomQuote: string;
}

// ============================================================================
// 预定义的人生决策库
// ============================================================================

export const LIFE_DECISIONS: LifeDecision[] = [
    // === 教育决策 ===
    {
        id: 'pursue_masters',
        type: 'education',
        name: '攻读硕士学位',
        description: '花 2 年时间深造，提升专业能力和学历',
        impacts: {
            wealth: -20,      // 学费 + 机会成本
            income: 30,       // 长期收入提升
            skills: [{ name: 'expertise', delta: 30 }],
            network: 20,
            fulfillment: 15
        },
        prerequisites: {
            minAge: 22,
            maxAge: 35,
            requiredMilestones: ['education_undergraduate']
        },
        baseSuccessProbability: 0.85,
        timeCost: 2,
        opportunityCost: ['2年工作经验', '2年收入']
    },
    {
        id: 'pursue_phd',
        type: 'education',
        name: '攻读博士学位',
        description: '4-6 年深入研究，成为领域专家',
        impacts: {
            wealth: -40,
            income: 40,
            skills: [{ name: 'research', delta: 50 }, { name: 'expertise', delta: 40 }],
            network: 30,
            fulfillment: 25,
            risk: 30
        },
        prerequisites: {
            minAge: 24,
            maxAge: 35,
            requiredMilestones: ['education_masters']
        },
        baseSuccessProbability: 0.65,
        timeCost: 5,
        opportunityCost: ['5年工作经验', '5年收入', '可能的家庭计划']
    },
    
    // === 职业决策 ===
    {
        id: 'join_big_tech',
        type: 'career',
        name: '加入大厂',
        description: '进入知名科技公司，稳定高薪',
        impacts: {
            wealth: 20,
            income: 40,
            skills: [{ name: 'technical', delta: 20 }],
            network: 25,
            health: -10,      // 996 风险
            fulfillment: 10
        },
        prerequisites: {
            minAge: 22
        },
        baseSuccessProbability: 0.6,
        timeCost: 0.5,
        opportunityCost: ['创业机会', '工作生活平衡']
    },
    {
        id: 'start_business',
        type: 'career',
        name: '创业',
        description: '创办自己的公司，高风险高回报',
        impacts: {
            wealth: -30,      // 初期投入
            income: -20,      // 初期可能没收入
            skills: [{ name: 'leadership', delta: 40 }, { name: 'business', delta: 50 }],
            network: 40,
            health: -20,
            fulfillment: 40,
            risk: 70
        },
        prerequisites: {
            minAge: 25,
            minWealth: 20
        },
        baseSuccessProbability: 0.2,
        timeCost: 3,
        opportunityCost: ['稳定收入', '职业安全感', '工作生活平衡']
    },
    {
        id: 'career_pivot',
        type: 'career',
        name: '职业转型',
        description: '转换到新的行业或领域',
        impacts: {
            wealth: -15,
            income: -10,
            skills: [{ name: 'adaptability', delta: 30 }],
            network: 10,
            fulfillment: 20,
            risk: 40
        },
        prerequisites: {
            minAge: 25,
            maxAge: 45
        },
        baseSuccessProbability: 0.5,
        timeCost: 1,
        opportunityCost: ['行业积累', '资深地位']
    },
    {
        id: 'seek_promotion',
        type: 'career',
        name: '争取晋升',
        description: '在当前公司争取更高职位',
        impacts: {
            income: 25,
            skills: [{ name: 'management', delta: 20 }],
            network: 15,
            health: -5,
            fulfillment: 15
        },
        baseSuccessProbability: 0.4,
        timeCost: 1,
        opportunityCost: ['跳槽涨薪机会']
    },
    
    // === 投资决策 ===
    {
        id: 'invest_stocks',
        type: 'investment',
        name: '股票投资',
        description: '学习并进行股票投资',
        impacts: {
            wealth: 15,
            skills: [{ name: 'finance', delta: 20 }],
            risk: 40
        },
        prerequisites: {
            minWealth: 20
        },
        baseSuccessProbability: 0.5,
        timeCost: 0,
        opportunityCost: ['本金风险']
    },
    {
        id: 'buy_property',
        type: 'investment',
        name: '购房',
        description: '购买房产，建立资产基础',
        impacts: {
            wealth: 30,       // 长期增值
            income: -20,      // 月供压力
            fulfillment: 20,
            risk: 30
        },
        prerequisites: {
            minAge: 25,
            minWealth: 30
        },
        baseSuccessProbability: 0.8,
        timeCost: 0,
        opportunityCost: ['流动性', '创业资金', '迁移自由']
    },
    
    // === 关系决策 ===
    {
        id: 'get_married',
        type: 'relationship',
        name: '结婚',
        description: '与伴侣步入婚姻',
        impacts: {
            fulfillment: 30,
            network: 20,
            wealth: -10,      // 婚礼等开支
            health: 5         // 研究显示婚姻有益健康
        },
        prerequisites: {
            minAge: 22,
            requiredMilestones: ['relationship_dating']
        },
        baseSuccessProbability: 0.7,
        timeCost: 0,
        opportunityCost: ['单身自由', '选择空间']
    },
    {
        id: 'have_children',
        type: 'relationship',
        name: '生育子女',
        description: '组建家庭，成为父母',
        impacts: {
            fulfillment: 40,
            wealth: -30,      // 养育成本
            income: -10,      // 可能影响职业
            health: -5,
            network: 10
        },
        prerequisites: {
            minAge: 25,
            maxAge: 45,
            requiredMilestones: ['relationship_married']
        },
        baseSuccessProbability: 0.9,
        timeCost: 0,
        opportunityCost: ['职业发展速度', '个人自由时间', '财务灵活性']
    },
    
    // === 健康决策 ===
    {
        id: 'health_priority',
        type: 'health',
        name: '健康优先',
        description: '投入时间和精力维护健康',
        impacts: {
            health: 30,
            energy: 25,
            mentalHealth: 20,
            income: -5,       // 时间成本
            fulfillment: 15
        },
        baseSuccessProbability: 0.9,
        timeCost: 0,
        opportunityCost: ['工作时间', '社交时间']
    },
    
    // === 生活方式决策 ===
    {
        id: 'relocate_opportunity',
        type: 'relocation',
        name: '迁移到机会城市',
        description: '搬到发展机会更多的城市',
        impacts: {
            income: 20,
            network: -15,     // 离开原有人脉
            fulfillment: 10,
            risk: 25
        },
        prerequisites: {
            maxAge: 40
        },
        baseSuccessProbability: 0.7,
        timeCost: 0.5,
        opportunityCost: ['原有人脉', '熟悉的环境', '家庭关系']
    }
];

// ============================================================================
// 状态转移与模拟引擎
// ============================================================================

/**
 * 计算决策的成功概率（考虑个人特征）
 */
function calculateSuccessProbability(
    decision: LifeDecision,
    state: LifeSnapshot,
    personality?: PersonalityTraits
): number {
    let prob = decision.baseSuccessProbability;
    
    // 根据技能调整
    if (decision.impacts.skills) {
        for (const skill of decision.impacts.skills) {
            const currentLevel = state.skills.get(skill.name) || 0;
            prob += currentLevel / 500;  // 每 50 点技能增加 10% 成功率
        }
    }
    
    // 根据人脉调整
    if (decision.type === 'career' || decision.type === 'investment') {
        prob += state.networkQuality / 500;
    }
    
    // 根据性格调整
    if (personality) {
        // 尽责性高 -> 更容易成功
        prob += personality.conscientiousness / 500;
        
        // 风险承受高 + 高风险决策 -> 适度加成
        if (decision.impacts.risk && decision.impacts.risk > 50) {
            prob += (personality.riskTolerance - 50) / 500;
        }
    }
    
    // 健康状态影响
    prob *= (state.health / 100);
    
    return Math.min(0.95, Math.max(0.05, prob));
}

/**
 * 应用决策到状态
 */
function applyDecision(
    state: LifeSnapshot,
    decision: LifeDecision,
    success: boolean
): LifeSnapshot {
    const newState = { ...state };
    newState.age += decision.timeCost;
    newState.timestamp = Date.now();
    
    const multiplier = success ? 1 : -0.3;  // 失败会有负面影响
    
    if (decision.impacts.wealth) {
        newState.wealth = Math.max(0, Math.min(100, 
            newState.wealth + decision.impacts.wealth * multiplier));
    }
    
    if (decision.impacts.income) {
        newState.income = Math.max(0, Math.min(100,
            newState.income + decision.impacts.income * multiplier));
    }
    
    if (decision.impacts.health) {
        newState.health = Math.max(0, Math.min(100,
            newState.health + decision.impacts.health));
    }
    
    if (decision.impacts.network) {
        newState.networkQuality = Math.max(0, Math.min(100,
            newState.networkQuality + decision.impacts.network * multiplier));
    }
    
    if (decision.impacts.fulfillment) {
        newState.fulfillment = Math.max(0, Math.min(100,
            newState.fulfillment + decision.impacts.fulfillment * multiplier));
    }
    
    // 更新技能
    if (decision.impacts.skills && success) {
        const newSkills = new Map(state.skills);
        for (const skill of decision.impacts.skills) {
            const current = newSkills.get(skill.name) || 0;
            newSkills.set(skill.name, Math.min(100, current + skill.delta));
        }
        newState.skills = newSkills;
    }
    
    // 自然衰减
    newState.health = Math.max(0, newState.health - decision.timeCost * 0.5);
    newState.energy = Math.max(0, newState.energy - decision.timeCost * 1);
    
    return newState;
}

/**
 * 计算状态的综合价值
 */
function calculateStateValue(state: LifeSnapshot, values?: ValuesProfile): number {
    // 默认权重
    let weights = {
        wealth: 0.20,
        income: 0.15,
        health: 0.20,
        network: 0.10,
        fulfillment: 0.25,
        family: 0.10
    };
    
    // 根据个人价值观调整权重
    if (values) {
        const total = values.efficiency + values.quality + values.growth + 
                      values.stability + values.connection + (values.workLifeBalance || 50);
        
        weights = {
            wealth: (values.efficiency / total) * 0.8,
            income: (values.efficiency / total) * 0.5,
            health: (values.stability / total) * 0.8,
            network: (values.connection / total) * 0.6,
            fulfillment: (values.growth / total) * 0.8,
            family: (values.connection / total) * 0.4
        };
    }
    
    return (
        state.wealth * weights.wealth +
        state.income * weights.income +
        state.health * weights.health +
        state.networkQuality * weights.network +
        state.fulfillment * weights.fulfillment +
        state.familyHappiness * weights.family
    );
}

/**
 * 蒙特卡洛人生模拟器
 */
export class LifeSimulator {
    private gamma: number;
    private personality?: PersonalityTraits;
    private values?: ValuesProfile;
    
    constructor(gamma: number = 0.95, personality?: PersonalityTraits, values?: ValuesProfile) {
        this.gamma = gamma;
        this.personality = personality;
        this.values = values;
    }
    
    /**
     * 模拟单条人生路径
     */
    simulatePath(
        initialState: LifeSnapshot,
        decisions: LifeDecision[],
        targetAge: number = 60
    ): SimulatedPath {
        const snapshots: LifeSnapshot[] = [initialState];
        const successfulDecisions: LifeDecision[] = [];
        const riskEvents: string[] = [];
        let currentState = { ...initialState };
        let cumulativeValue = 0;
        let yearIndex = 0;
        
        for (const decision of decisions) {
            // 检查前置条件
            if (decision.prerequisites) {
                if (decision.prerequisites.minAge && currentState.age < decision.prerequisites.minAge) continue;
                if (decision.prerequisites.maxAge && currentState.age > decision.prerequisites.maxAge) continue;
                if (decision.prerequisites.minWealth && currentState.wealth < decision.prerequisites.minWealth) continue;
            }
            
            // 计算成功概率
            const successProb = calculateSuccessProbability(decision, currentState, this.personality);
            const success = Math.random() < successProb;
            
            // 应用决策
            currentState = applyDecision(currentState, decision, success);
            
            if (success) {
                successfulDecisions.push(decision);
            } else {
                riskEvents.push(`${decision.name} 未能成功 (概率: ${(successProb * 100).toFixed(0)}%)`);
            }
            
            snapshots.push({ ...currentState });
            
            // 计算折扣后的价值
            const stateValue = calculateStateValue(currentState, this.values);
            cumulativeValue += stateValue * Math.pow(this.gamma, yearIndex);
            yearIndex += decision.timeCost;
            
            if (currentState.age >= targetAge) break;
        }
        
        // 模拟到目标年龄
        while (currentState.age < targetAge) {
            currentState.age += 1;
            currentState.health = Math.max(0, currentState.health - 0.8);
            currentState.energy = Math.max(0, currentState.energy - 0.5);
            
            const stateValue = calculateStateValue(currentState, this.values);
            cumulativeValue += stateValue * Math.pow(this.gamma, yearIndex);
            yearIndex++;
            snapshots.push({ ...currentState });
        }
        
        const finalValue = calculateStateValue(currentState, this.values);
        
        // 计算后悔分数：最优可能 vs 实际结果
        const maxPossibleValue = 100;  // 理论最大值
        const regretScore = Math.max(0, maxPossibleValue - finalValue);
        
        return {
            id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            decisions: successfulDecisions,
            snapshots,
            finalValue,
            cumulativeValue,
            successProbability: successfulDecisions.length / Math.max(decisions.length, 1),
            regretScore,
            keyMilestones: [],
            riskEvents
        };
    }
    
    /**
     * 蒙特卡洛模拟：运行多条路径，找到最优
     */
    monteCarloSimulation(
        initialState: LifeSnapshot,
        availableDecisions: LifeDecision[],
        numSimulations: number = 1000,
        targetAge: number = 60
    ): SimulatedPath[] {
        const results: SimulatedPath[] = [];
        
        for (let i = 0; i < numSimulations; i++) {
            // 随机选择决策序列
            const shuffled = [...availableDecisions].sort(() => Math.random() - 0.5);
            const selectedDecisions = shuffled.slice(0, Math.floor(Math.random() * shuffled.length) + 1);
            
            const path = this.simulatePath(initialState, selectedDecisions, targetAge);
            results.push(path);
        }
        
        // 按累计价值排序
        results.sort((a, b) => b.cumulativeValue - a.cumulativeValue);
        
        return results;
    }
}

// ============================================================================
// 命运导航器
// ============================================================================

/**
 * 命运导航器类
 */
export class DestinyNavigator {
    private simulator: LifeSimulator;
    private currentState: LifeSnapshot;
    private cachedPaths: SimulatedPath[] = [];
    private lastCalculationTime: number = 0;
    
    constructor() {
        const avatar = getEnhancedDigitalAvatar();
        
        // 从数字分身获取 gamma 和偏好
        let gamma = 0.92;
        try {
            const soulManager = getDigitalSoulManager();
            const destinyPrefs = soulManager.getAvatar().destinyPreferences;
            if (destinyPrefs?.gamma) {
                gamma = destinyPrefs.gamma;
            }
        } catch (e) {
            gamma = inferGamma(avatar?.personality);
        }
        
        this.simulator = new LifeSimulator(gamma, avatar?.personality, avatar?.valuesProfile);
        this.currentState = this.initializeStateFromDigitalSoul();
    }
    
    /**
     * 从数字分身初始化当前状态
     */
    private initializeStateFromDigitalSoul(): LifeSnapshot {
        try {
            const soulManager = getDigitalSoulManager();
            const lifeState = soulManager.getLifeState();
            
            return this.convertLifeStateToSnapshot(lifeState);
        } catch (e) {
            // 如果 DigitalSoulManager 还没准备好，使用默认值
            return this.convertLifeStateToSnapshot(DEFAULT_LIFE_STATE);
        }
    }
    
    /**
     * 将 LifeStateSnapshot 转换为导航器的 LifeSnapshot
     */
    private convertLifeStateToSnapshot(lifeState: LifeStateSnapshot): LifeSnapshot {
        // 转换教育里程碑
        const educationMilestones: LifeMilestone[] = [];
        const eduMap: Record<string, LifeMilestone> = {
            'high_school': 'education_high_school',
            'bachelor': 'education_undergraduate',
            'master': 'education_masters',
            'phd': 'education_phd'
        };
        if (eduMap[lifeState.education.highestDegree]) {
            educationMilestones.push(eduMap[lifeState.education.highestDegree]);
        }
        
        // 转换职业轨迹
        const careerTrack: LifeMilestone[] = [];
        if (lifeState.career.yearsOfExperience > 0) {
            careerTrack.push('career_first_job');
        }
        if (lifeState.career.yearsOfExperience > 5) {
            careerTrack.push('career_senior');
        }
        if (lifeState.skills.leadershipExperience > 50) {
            careerTrack.push('career_management');
        }
        if (lifeState.career.currentStatus === 'self_employed') {
            careerTrack.push('career_entrepreneur');
        }
        
        // 转换关系状态
        let relationshipStatus: LifeMilestone | null = null;
        const relMap: Record<string, LifeMilestone> = {
            'dating': 'relationship_dating',
            'married': 'relationship_married'
        };
        if (relMap[lifeState.relationships.status]) {
            relationshipStatus = relMap[lifeState.relationships.status];
        }
        if (lifeState.relationships.hasChildren) {
            relationshipStatus = 'relationship_parent';
        }
        
        // 转换财务状况
        const financeMap = { none: 0, low: 20, medium: 50, high: 80 };
        const incomeMap = { low: 25, medium: 50, high: 75, very_high: 95 };
        
        // 转换技能
        const skills = new Map<string, number>();
        lifeState.skills.topSkills.forEach((skill, idx) => {
            skills.set(skill, 80 - idx * 10);
        });
        skills.set('technical', lifeState.skills.technicalProficiency);
        skills.set('leadership', lifeState.skills.leadershipExperience);
        
        return {
            age: lifeState.age,
            wealth: this.calculateWealthScore(lifeState),
            income: incomeMap[lifeState.finance.incomeLevel],
            debtLevel: financeMap[lifeState.finance.debtLevel],
            skills,
            education: educationMilestones,
            careerTrack,
            networkQuality: lifeState.resources.networkQuality,
            networkSize: lifeState.relationships.socialCircleSize === 'small' ? 30 :
                        lifeState.relationships.socialCircleSize === 'medium' ? 100 : 300,
            socialStatus: this.calculateSocialStatus(lifeState),
            health: lifeState.health.physicalHealth,
            energy: lifeState.health.energyLevel,
            mentalHealth: lifeState.health.mentalHealth,
            relationshipStatus,
            familyHappiness: lifeState.relationships.familyRelationshipQuality,
            purposeClarity: this.calculatePurposeClarity(lifeState),
            fulfillment: this.calculateFulfillment(lifeState),
            timestamp: Date.now()
        };
    }
    
    private calculateWealthScore(state: LifeStateSnapshot): number {
        const incomeMap = { low: 15, medium: 35, high: 55, very_high: 75 };
        const savingsMap = { none: 0, low: 10, medium: 25, high: 40 };
        const debtMap = { none: 0, low: -5, medium: -15, high: -25 };
        const propertyBonus = state.finance.hasProperty ? 15 : 0;
        const investmentBonus = state.finance.hasInvestments ? 10 : 0;
        
        return Math.max(0, Math.min(100,
            incomeMap[state.finance.incomeLevel] +
            savingsMap[state.finance.savingsLevel] +
            debtMap[state.finance.debtLevel] +
            propertyBonus +
            investmentBonus
        ));
    }
    
    private calculateSocialStatus(state: LifeStateSnapshot): number {
        let status = 30;
        const eduBonus = { high_school: 0, bachelor: 10, master: 20, phd: 30, other: 5 };
        status += eduBonus[state.education.highestDegree];
        if (state.career.currentStatus === 'self_employed') status += 15;
        if (state.career.yearsOfExperience > 10) status += 10;
        if (state.skills.leadershipExperience > 70) status += 10;
        return Math.min(100, status);
    }
    
    private calculatePurposeClarity(state: LifeStateSnapshot): number {
        let clarity = 20;
        if (state.lifeGoals.shortTerm.length > 0) clarity += 15;
        if (state.lifeGoals.mediumTerm.length > 0) clarity += 20;
        if (state.lifeGoals.longTerm.length > 0) clarity += 20;
        if (state.lifeGoals.coreValues.length > 0) clarity += 15;
        if (state.lifeGoals.lifeVision) clarity += 10;
        return Math.min(100, clarity);
    }
    
    private calculateFulfillment(state: LifeStateSnapshot): number {
        return Math.round(
            (state.career.careerSatisfaction * 0.3) +
            (state.relationships.socialSatisfaction * 0.2) +
            (state.health.mentalHealth * 0.2) +
            ((100 - state.currentChallenges.stressLevel) * 0.15) +
            (this.calculatePurposeClarity(state) * 0.15)
        );
    }
    
    /**
     * 刷新状态（从数字分身重新加载）
     */
    refreshFromDigitalSoul(): void {
        this.currentState = this.initializeStateFromDigitalSoul();
        this.cachedPaths = [];  // 清除缓存
    }
    
    /**
     * 更新当前状态
     */
    updateState(updates: Partial<LifeSnapshot>): void {
        this.currentState = { ...this.currentState, ...updates, timestamp: Date.now() };
        this.cachedPaths = [];  // 清除缓存，触发重算
    }
    
    /**
     * 获取导航建议 (Waze 风格)
     */
    getNavigationAdvice(): NavigationAdvice {
        const needsRecalculation = 
            this.cachedPaths.length === 0 || 
            Date.now() - this.lastCalculationTime > 60000;  // 1分钟缓存
        
        if (needsRecalculation) {
            console.log('🔄 Recalculating optimal paths...');
            this.cachedPaths = this.simulator.monteCarloSimulation(
                this.currentState,
                LIFE_DECISIONS,
                1000,
                60
            );
            this.lastCalculationTime = Date.now();
        }
        
        const bestPath = this.cachedPaths[0];
        const alternatives = this.cachedPaths.slice(1, 4);
        
        // 找到下一个最佳行动
        const nextBestAction = this.findNextBestAction(bestPath);
        
        // 检查是否需要重新规划
        const rerouting = this.checkRerouting();
        
        // 生成智慧金句
        const wisdomQuote = this.generateWisdomQuote(bestPath);
        
        return {
            recommendedPath: bestPath,
            alternativePaths: alternatives,
            currentPosition: this.currentState,
            nextBestAction,
            etaToGoal: 60 - this.currentState.age,
            riskAhead: bestPath.riskEvents.slice(0, 3),
            opportunities: this.identifyOpportunities(),
            rerouting: rerouting.needed,
            reroutingReason: rerouting.reason,
            currentLifeValue: calculateStateValue(this.currentState),
            projectedLifeValue: bestPath.finalValue,
            regretMinimization: 100 - bestPath.regretScore,
            wisdomQuote
        };
    }
    
    /**
     * 找到下一个最佳行动
     */
    private findNextBestAction(path: SimulatedPath): LifeDecision {
        // 找到最高价值的下一个可执行决策
        const availableDecisions = LIFE_DECISIONS.filter(d => {
            if (!d.prerequisites) return true;
            if (d.prerequisites.minAge && this.currentState.age < d.prerequisites.minAge) return false;
            if (d.prerequisites.maxAge && this.currentState.age > d.prerequisites.maxAge) return false;
            if (d.prerequisites.minWealth && this.currentState.wealth < d.prerequisites.minWealth) return false;
            return true;
        });
        
        // 选择在最优路径中出现且当前可执行的
        for (const decision of path.decisions) {
            if (availableDecisions.find(d => d.id === decision.id)) {
                return decision;
            }
        }
        
        // 如果没有，返回默认
        return availableDecisions[0] || LIFE_DECISIONS[0];
    }
    
    /**
     * 检查是否需要重新规划
     */
    private checkRerouting(): { needed: boolean; reason?: string } {
        // 健康突变
        if (this.currentState.health < 30) {
            return { needed: true, reason: '健康状况急剧下降，建议调整人生规划优先照顾健康' };
        }
        
        // 财务危机
        if (this.currentState.wealth < 10 && this.currentState.debtLevel > 70) {
            return { needed: true, reason: '财务状况紧急，需要重新评估风险决策' };
        }
        
        // 年龄节点
        const ageThresholds = [30, 35, 40, 45, 50];
        if (ageThresholds.includes(this.currentState.age)) {
            return { needed: true, reason: `到达 ${this.currentState.age} 岁人生节点，建议重新评估目标` };
        }
        
        return { needed: false };
    }
    
    /**
     * 识别机会
     */
    private identifyOpportunities(): string[] {
        const opportunities: string[] = [];
        
        if (this.currentState.age < 35 && this.currentState.health > 70) {
            opportunities.push('黄金创业年龄窗口开放');
        }
        
        if (this.currentState.networkQuality > 60) {
            opportunities.push('人脉资源充足，可考虑需要社会资本的决策');
        }
        
        if (this.currentState.skills.get('technical') || 0 > 60) {
            opportunities.push('技术能力出众，科技领域机会多');
        }
        
        if (this.currentState.wealth > 50) {
            opportunities.push('财务基础稳健，可承担更多风险');
        }
        
        return opportunities;
    }
    
    /**
     * 生成智慧金句
     */
    private generateWisdomQuote(path: SimulatedPath): string {
        const quotes = [
            `基于 ${path.snapshots.length} 个时间点的模拟，这条路径的期望价值最高。`,
            `我们在虚拟世界模拟了 1000 种可能，为你找到了后悔最小化的那条路。`,
            `人生不是 100 米冲刺，是马拉松。这个决策让你 60 岁时的人生价值最大化。`,
            `短期的不舒适，换来的是长期的从容。这就是 Bellman 方程告诉我们的。`,
            `你现在迈出的这一步，决定了 20 年后你站在哪里。`
        ];
        
        return quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    /**
     * 获取特定决策的详细分析
     */
    analyzeDecision(decisionId: string): {
        decision: LifeDecision;
        expectedValue: number;
        riskAssessment: string;
        alternativeComparison: { decision: LifeDecision; valueDiff: number }[];
        longTermImpact: string;
    } | null {
        const decision = LIFE_DECISIONS.find(d => d.id === decisionId);
        if (!decision) return null;
        
        // 模拟选择这个决策
        const withDecision = this.simulator.simulatePath(
            this.currentState,
            [decision],
            60
        );
        
        // 模拟不选择
        const withoutDecision = this.simulator.simulatePath(
            this.currentState,
            [],
            60
        );
        
        const valueDiff = withDecision.cumulativeValue - withoutDecision.cumulativeValue;
        
        // 风险评估
        let riskAssessment = '低风险';
        if (decision.impacts.risk && decision.impacts.risk > 50) {
            riskAssessment = '高风险';
        } else if (decision.impacts.risk && decision.impacts.risk > 30) {
            riskAssessment = '中等风险';
        }
        
        // 替代方案比较
        const alternatives = LIFE_DECISIONS
            .filter(d => d.type === decision.type && d.id !== decision.id)
            .map(alt => {
                const altPath = this.simulator.simulatePath(this.currentState, [alt], 60);
                return {
                    decision: alt,
                    valueDiff: withDecision.cumulativeValue - altPath.cumulativeValue
                };
            })
            .sort((a, b) => a.valueDiff - b.valueDiff);
        
        return {
            decision,
            expectedValue: withDecision.cumulativeValue,
            riskAssessment,
            alternativeComparison: alternatives.slice(0, 3),
            longTermImpact: valueDiff > 0 
                ? `选择这个决策预计将使你的人生价值提升 ${valueDiff.toFixed(1)} 点`
                : `这个决策可能不是当前最优选择，但可能符合你的个人价值观`
        };
    }
}

// ============================================================================
// 快捷函数
// ============================================================================

let _navigator: DestinyNavigator | null = null;

export function getDestinyNavigator(): DestinyNavigator {
    if (!_navigator) {
        _navigator = new DestinyNavigator();
    }
    return _navigator;
}

export function getNavigationAdvice(): NavigationAdvice {
    return getDestinyNavigator().getNavigationAdvice();
}

export function analyzeLifeDecision(decisionId: string) {
    return getDestinyNavigator().analyzeDecision(decisionId);
}

export function updateLifeState(updates: Partial<LifeSnapshot>): void {
    getDestinyNavigator().updateState(updates);
}
