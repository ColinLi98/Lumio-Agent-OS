/**
 * Agent Orchestrator Service - 多Agent协调服务
 * 
 * 功能：
 * - 分析复杂意图并规划Agent任务
 * - 并行执行多个专业Agent
 * - 整合结果供用户选择
 */

import {
    IntentContext,
    OrchestrationPlan,
    AgentTask,
    AgentTaskResult,
    AppliedPreferences,
    ConsolidatedResult,
    OrchestrationSection,
    SpecializedAgentType
} from '../types';
import { getUserPreferences } from './personalizationService';
import { getEnhancedDigitalAvatar } from './localStorageService';
import { executeSpecializedAgent, SPECIALIZED_AGENTS } from './specializedAgents';

/**
 * Agent Orchestrator - 协调多个专业Agent完成复杂任务
 */
export class AgentOrchestrator {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * 根据意图上下文规划需要调用的Agent任务
     */
    async planAgentTasks(intent: IntentContext): Promise<OrchestrationPlan> {
        const appliedPreferences = this.extractRelevantPreferences(intent);
        const agentTasks = this.determineRequiredAgents(intent, appliedPreferences);

        const plan: OrchestrationPlan = {
            id: `orch_${Date.now()}`,
            userQuery: intent.primaryIntent,
            intentContext: intent,
            appliedPreferences,
            agentTasks,
            status: 'planning',
            createdAt: Date.now()
        };

        return plan;
    }

    /**
     * 提取与意图相关的用户偏好
     */
    private extractRelevantPreferences(intent: IntentContext): AppliedPreferences {
        const userPrefs = getUserPreferences();
        const avatar = getEnhancedDigitalAvatar();
        const preferences: AppliedPreferences = {};

        if (intent.category === 'travel') {
            // 旅行偏好
            preferences.travel = {
                // 基于用户画像推断航班偏好
                flightClass: userPrefs.dining.priceRange === 'luxury' ? 'business' : 'economy',
                seatPreference: 'window', // 可从画像中学习
                // 基于作息习惯推断
                wakeUpTime: avatar.behaviorPatterns?.chronotype === 'night_owl' ? 'late' :
                    avatar.behaviorPatterns?.chronotype === 'morning_person' ? 'early' : 'normal',
                preferredAirlines: []
            };

            preferences.accommodation = {
                starLevel: userPrefs.dining.priceRange === 'luxury' ? [5] :
                    userPrefs.dining.priceRange === 'high' ? [4, 5] : [3, 4],
                amenities: ['WiFi', '早餐'],
                location: 'city_center'
            };

            preferences.tourism = {
                // 基于开放性推断旅游风格
                style: avatar.personality?.openness > 60 ? 'offbeat' : 'popular',
                pace: avatar.personality?.conscientiousness > 60 ? 'moderate' : 'relaxed',
                interests: userPrefs.dining.cuisinePreferences.includes('日料') ? ['美食'] : []
            };
        }

        if (intent.category === 'shopping' || intent.impliedNeeds.includes('购物')) {
            preferences.dining = {
                cuisines: userPrefs.dining.cuisinePreferences,
                priceLevel: userPrefs.dining.priceRange,
                atmosphere: userPrefs.dining.atmospherePreference
            };
        }

        return preferences;
    }

    /**
     * 根据意图确定需要调用的Agent列表
     */
    private determineRequiredAgents(
        intent: IntentContext,
        preferences: AppliedPreferences
    ): AgentTask[] {
        const tasks: AgentTask[] = [];
        const needsSet = new Set(intent.impliedNeeds.map(n => n.toLowerCase()));

        // 旅行相关Agent映射
        const needToAgentMap: Record<string, { type: SpecializedAgentType; priority: number }> = {
            '机票': { type: 'flight_booking', priority: 1 },
            '航班': { type: 'flight_booking', priority: 1 },
            'flight': { type: 'flight_booking', priority: 1 },
            '酒店': { type: 'hotel_booking', priority: 2 },
            '住宿': { type: 'hotel_booking', priority: 2 },
            'hotel': { type: 'hotel_booking', priority: 2 },
            '餐厅': { type: 'restaurant', priority: 3 },
            '美食': { type: 'restaurant', priority: 3 },
            '吃': { type: 'restaurant', priority: 3 },
            'restaurant': { type: 'restaurant', priority: 3 },
            '景点': { type: 'attraction', priority: 4 },
            '旅游': { type: 'attraction', priority: 4 },
            '玩': { type: 'attraction', priority: 4 },
            'attraction': { type: 'attraction', priority: 4 },
            '天气': { type: 'weather', priority: 5 },
            'weather': { type: 'weather', priority: 5 },
            '交通': { type: 'transportation', priority: 6 },
            '出行': { type: 'transportation', priority: 6 },
            '行程': { type: 'itinerary', priority: 10 }, // 行程规划最后执行
            '安排': { type: 'itinerary', priority: 10 }
        };

        // 根据隐含需求创建Agent任务
        for (const need of intent.impliedNeeds) {
            const needLower = need.toLowerCase();
            const mapping = needToAgentMap[needLower];

            if (mapping) {
                // 避免重复Agent
                if (!tasks.some(t => t.agentType === mapping.type)) {
                    tasks.push(this.createAgentTask(
                        mapping.type,
                        intent,
                        preferences,
                        mapping.priority
                    ));
                }
            }
        }

        // 如果是旅行意图，自动添加必要的Agent
        if (intent.category === 'travel') {
            const mustHaveAgents: SpecializedAgentType[] = ['flight_booking', 'hotel_booking'];
            for (const agentType of mustHaveAgents) {
                if (!tasks.some(t => t.agentType === agentType)) {
                    tasks.push(this.createAgentTask(
                        agentType,
                        intent,
                        preferences,
                        agentType === 'flight_booking' ? 1 : 2
                    ));
                }
            }
        }

        // 按优先级排序
        return tasks.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 创建单个Agent任务
     */
    private createAgentTask(
        agentType: SpecializedAgentType,
        intent: IntentContext,
        preferences: AppliedPreferences,
        priority: number
    ): AgentTask {
        const appliedPrefs: string[] = [];
        let params: Record<string, any> = {
            destination: intent.destinations?.[0] || '',
            timeframe: intent.timeframe,
            budget: intent.budget
        };

        // 根据Agent类型设置特定参数和应用偏好
        switch (agentType) {
            case 'flight_booking':
                if (preferences.travel) {
                    params.class = preferences.travel.flightClass;
                    params.seatPreference = preferences.travel.seatPreference;
                    params.departureTime = preferences.travel.wakeUpTime === 'late' ? 'afternoon' : 'morning';
                    appliedPrefs.push(
                        `${preferences.travel.flightClass === 'economy' ? '经济舱' : '商务舱'}`,
                        `${preferences.travel.seatPreference === 'window' ? '靠窗座位' : '靠走道座位'}`,
                        `${preferences.travel.wakeUpTime === 'late' ? '适合晚起的航班时间' : '早班机'}`
                    );
                }
                break;

            case 'hotel_booking':
                if (preferences.accommodation) {
                    params.starLevel = preferences.accommodation.starLevel;
                    params.amenities = preferences.accommodation.amenities;
                    params.location = preferences.accommodation.location;
                    appliedPrefs.push(
                        `${preferences.accommodation.starLevel.join('/')}星级酒店`,
                        preferences.accommodation.location === 'city_center' ? '市中心位置' : '安静位置'
                    );
                }
                break;

            case 'restaurant':
                if (preferences.dining) {
                    params.cuisines = preferences.dining.cuisines;
                    params.priceLevel = preferences.dining.priceLevel;
                    appliedPrefs.push(
                        `偏好的菜系: ${preferences.dining.cuisines.join(', ')}`,
                        `价位: ${preferences.dining.priceLevel}`
                    );
                }
                break;

            case 'attraction':
                if (preferences.tourism) {
                    params.style = preferences.tourism.style;
                    params.interests = preferences.tourism.interests;
                    appliedPrefs.push(
                        preferences.tourism.style === 'offbeat' ? '偏好小众景点' : '热门景点',
                        `兴趣: ${preferences.tourism.interests.join(', ')}`
                    );
                }
                break;
        }

        const descriptions: Record<SpecializedAgentType, string> = {
            'flight_booking': '搜索机票',
            'hotel_booking': '搜索酒店',
            'restaurant': '推荐餐厅',
            'attraction': '推荐景点',
            'weather': '查询天气',
            'transportation': '查询交通',
            'itinerary': '生成行程',
            'shopping': '购物推荐',
            'social_search': '社交媒体搜索',
            'translation': '翻译服务'
        };

        return {
            id: `task_${agentType}_${Date.now()}`,
            agentType,
            description: descriptions[agentType] || agentType,
            params,
            appliedPreferences: appliedPrefs,
            status: 'pending',
            priority,
            canRunParallel: agentType !== 'itinerary' // 行程规划需要等其他完成
        };
    }

    /**
     * 并行执行所有Agent任务
     */
    async executeAgentTasks(plan: OrchestrationPlan): Promise<OrchestrationPlan> {
        plan.status = 'executing';

        // 分离可并行和需要串行的任务
        const parallelTasks = plan.agentTasks.filter(t => t.canRunParallel);
        const serialTasks = plan.agentTasks.filter(t => !t.canRunParallel);

        // 并行执行
        const parallelResults = await Promise.all(
            parallelTasks.map(async (task) => {
                task.status = 'running';
                try {
                    const result = await executeSpecializedAgent(task, this.apiKey);
                    task.status = 'completed';
                    task.result = result;
                    return { task, success: true };
                } catch (error) {
                    task.status = 'failed';
                    console.error(`Agent ${task.agentType} failed:`, error);
                    return { task, success: false };
                }
            })
        );

        // 串行执行（如行程规划，需要其他结果）
        for (const task of serialTasks) {
            task.status = 'running';
            try {
                // 将之前的结果传递给串行任务
                task.params.previousResults = parallelResults
                    .filter(r => r.success)
                    .map(r => ({ type: r.task.agentType, data: r.task.result }));

                const result = await executeSpecializedAgent(task, this.apiKey);
                task.status = 'completed';
                task.result = result;
            } catch (error) {
                task.status = 'failed';
                console.error(`Agent ${task.agentType} failed:`, error);
            }
        }

        // 整合结果
        plan.status = 'consolidating';
        plan.consolidatedResult = this.consolidateResults(plan);
        plan.status = 'completed';
        plan.completedAt = Date.now();

        return plan;
    }

    /**
     * 整合所有Agent结果
     */
    private consolidateResults(plan: OrchestrationPlan): ConsolidatedResult {
        const sections: OrchestrationSection[] = [];
        let totalCost = 0;

        const iconMap: Record<SpecializedAgentType, string> = {
            'flight_booking': '🛫',
            'hotel_booking': '🏨',
            'restaurant': '🍽️',
            'attraction': '📍',
            'weather': '🌤️',
            'transportation': '🚗',
            'itinerary': '📋',
            'shopping': '🛍️',
            'social_search': '📱',
            'translation': '🌐'
        };

        const titleMap: Record<SpecializedAgentType, string> = {
            'flight_booking': '航班推荐',
            'hotel_booking': '住宿推荐',
            'restaurant': '美食推荐',
            'attraction': '景点推荐',
            'weather': '目的地天气',
            'transportation': '交通出行',
            'itinerary': '行程安排',
            'shopping': '购物推荐',
            'social_search': '热门攻略',
            'translation': '常用翻译'
        };

        for (const task of plan.agentTasks) {
            if (task.status === 'completed' && task.result) {
                sections.push({
                    agentType: task.agentType,
                    title: titleMap[task.agentType] || task.description,
                    icon: iconMap[task.agentType] || '📌',
                    options: task.result.suggestions || [],
                    personalizedNote: task.result.personalizedNote ||
                        `已根据您的偏好筛选: ${task.appliedPreferences.join(', ')}`
                });

                // 累计费用
                if (task.result.data?.estimatedCost) {
                    totalCost += task.result.data.estimatedCost;
                }
            }
        }

        // 生成综合推荐
        const recommendations: string[] = [];
        if (plan.intentContext.budget && totalCost > 0) {
            const budgetDiff = plan.intentContext.budget.amount - totalCost;
            if (budgetDiff > 0) {
                recommendations.push(`💰 预估费用约 ¥${totalCost.toLocaleString()}，低于预算 ¥${budgetDiff.toLocaleString()}`);
            } else {
                recommendations.push(`⚠️ 预估费用约 ¥${totalCost.toLocaleString()}，可能略超预算`);
            }
        }

        if (plan.intentContext.timeframe?.start) {
            recommendations.push(`📅 行程时间: ${plan.intentContext.timeframe.start}${plan.intentContext.timeframe.duration ? ` (${plan.intentContext.timeframe.duration})` : ''
                }`);
        }

        return {
            summary: `为您的${plan.intentContext.primaryIntent}准备了 ${sections.length} 个方面的推荐`,
            sections,
            totalEstimatedCost: totalCost > 0 ? totalCost : undefined,
            recommendations
        };
    }
}

/**
 * 创建协调器实例的工厂函数
 */
export function createOrchestrator(apiKey: string): AgentOrchestrator {
    return new AgentOrchestrator(apiKey);
}
