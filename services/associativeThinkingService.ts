/**
 * 联想建议服务 - Associative Thinking Service
 * 
 * 为所有类型的用户查询生成智能联想建议
 * Generates intelligent associative suggestions for all types of user queries
 */

import { AssociatedSuggestion } from '../types.js';

// 场景关键词映射
const SCENARIO_KEYWORDS = {
    // 工作相关
    work: ['工作', '会议', '项目', '报告', '邮件', 'email', 'meeting', 'project', 'report', '同事', '领导', '老板', '客户'],
    // 学习相关
    study: ['学习', '考试', '作业', '论文', '课程', 'study', 'exam', 'homework', 'essay', '复习', '笔记'],
    // 社交相关
    social: ['朋友', '聚会', '生日', '约会', 'friend', 'party', 'birthday', 'date', '周末', '活动'],
    // 健康相关
    health: ['健康', '锻炼', '运动', '医院', 'health', 'exercise', 'workout', 'doctor', '药', '看病', '疲惫', '累'],
    // 财务相关
    finance: ['钱', '工资', '理财', '投资', 'money', 'salary', 'finance', 'invest', '预算', '账单', '支出'],
    // 旅行相关  
    travel: ['旅行', '旅游', '机票', '酒店', 'travel', 'trip', 'flight', 'hotel', '度假', '签证', '行程'],
    // 购物相关
    shopping: ['购物', '买', '商品', '优惠', 'shop', 'buy', 'product', 'discount', '价格', '比较', '推荐'],
    // 美食相关
    food: ['吃', '餐厅', '美食', '菜', 'eat', 'restaurant', 'food', 'cook', '外卖', '午餐', '晚餐'],
    // 情感相关
    emotion: ['开心', '难过', '压力', '焦虑', 'happy', 'sad', 'stress', 'anxiety', '烦恼', '心情', '情绪'],
};

const DIMENSION_KEYWORDS = {
    goal: ['目标', '想要', '希望', '需要', '解决', '怎么做', '怎么办', '方案', '策略', '计划', 'goal', 'want', 'need'],
    time: ['今天', '明天', '下周', '时间', '截止', 'due', 'deadline', 'before', 'after', 'later', 'urgent', '马上'],
    budget: ['预算', '价格', '成本', '花费', '钱', '￥', '¥', '元', '$', 'budget', 'cost', 'price'],
    location: ['地点', '地址', '附近', '周边', '哪里', '哪儿', '到哪', 'location', 'near', 'where'],
    people: ['我和', '我们', '朋友', '家人', '同事', '客户', '对方', 'people', 'team', 'client'],
    risk: ['风险', '担心', '怕', '避开', '坑', '风险点', 'risk', 'avoid']
};

// 时间相关关键词
const TIME_KEYWORDS = {
    urgent: ['紧急', '马上', '立刻', 'urgent', 'asap', 'immediately', '赶紧', '现在'],
    tomorrow: ['明天', 'tomorrow', '明日'],
    thisWeek: ['这周', '本周', 'this week', '这个星期'],
    nextWeek: ['下周', '下个星期', 'next week'],
    later: ['以后', '之后', '稍后', 'later', 'afterwards', '改天'],
};

/**
 * 生成通用联想建议
 */
export function generateAssociatedSuggestions(
    query: string,
    outputType: string,
    context?: {
        toolName?: string;
        intentCategory?: string;
        resultData?: any;
    }
): AssociatedSuggestion[] {
    const suggestions: AssociatedSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // 1. 检测场景并生成相关建议
    const detectedScenarios = detectScenarios(queryLower);

    // 2. 基于场景生成建议
    for (const scenario of detectedScenarios) {
        const scenarioSuggestions = generateScenarioSuggestions(scenario, query, context);
        suggestions.push(...scenarioSuggestions);
    }

    // 3. 基于输出类型生成特定建议
    const typeSuggestions = generateTypeSuggestions(outputType, query, context);
    suggestions.push(...typeSuggestions);

    // 4. 检测时间紧迫性并添加提醒
    const timeSuggestions = generateTimeSuggestions(queryLower);
    suggestions.push(...timeSuggestions);

    // 5. 通用发散建议
    const expansionSuggestions = generateExpansionSuggestions(query, outputType, context);
    suggestions.push(...expansionSuggestions);

    // 6. 通用智能建议
    const genericSuggestions = generateGenericSuggestions(query, outputType);
    suggestions.push(...genericSuggestions);

    // 去重并按优先级排序，返回前5个
    const uniqueSuggestions = deduplicateSuggestions(suggestions);
    return uniqueSuggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
}

function detectDimensionSignals(query: string) {
    const hasGoal = DIMENSION_KEYWORDS.goal.some(kw => query.includes(kw.toLowerCase()));
    const hasTime = DIMENSION_KEYWORDS.time.some(kw => query.includes(kw.toLowerCase()));
    const hasBudget = DIMENSION_KEYWORDS.budget.some(kw => query.includes(kw.toLowerCase()));
    const hasLocation = DIMENSION_KEYWORDS.location.some(kw => query.includes(kw.toLowerCase()));
    const hasPeople = DIMENSION_KEYWORDS.people.some(kw => query.includes(kw.toLowerCase()));
    const hasRisk = DIMENSION_KEYWORDS.risk.some(kw => query.includes(kw.toLowerCase()));

    return { hasGoal, hasTime, hasBudget, hasLocation, hasPeople, hasRisk };
}

function generateExpansionSuggestions(
    query: string,
    outputType: string,
    context?: any
): AssociatedSuggestion[] {
    const suggestions: AssociatedSuggestion[] = [];
    const queryLower = query.toLowerCase();
    const signals = detectDimensionSignals(queryLower);

    if (!signals.hasGoal) {
        suggestions.push({
            id: 'clarify-goal',
            category: 'tip',
            icon: '🎯',
            title: '明确目标',
            description: '你想达成的结果是什么？',
            actionText: '补充目标',
            actionQuery: `帮我明确目标和成功标准：${query.slice(0, 24)}`,
            priority: 8
        });
    }

    if (!signals.hasTime) {
        suggestions.push({
            id: 'clarify-time',
            category: 'reminder',
            icon: '⏱️',
            title: '时间与截止',
            description: '是否有时间范围或截止日期？',
            actionText: '补充时间',
            actionQuery: `这个事项的时间/截止是什么？${query.slice(0, 18)}`,
            priority: 7
        });
    }

    if (!signals.hasBudget) {
        suggestions.push({
            id: 'clarify-budget',
            category: 'tip',
            icon: '💵',
            title: '预算约束',
            description: '需要控制成本或预算上限吗？',
            actionText: '补充预算',
            actionQuery: `这个事项的预算范围是多少？${query.slice(0, 18)}`,
            priority: 7
        });
    }

    if (!signals.hasLocation) {
        suggestions.push({
            id: 'clarify-location',
            category: 'related_need',
            icon: '📍',
            title: '地点范围',
            description: '是否限定地区或范围？',
            actionText: '补充地点',
            actionQuery: `请告诉我地点/范围：${query.slice(0, 18)}`,
            priority: 6
        });
    }

    if (!signals.hasPeople) {
        suggestions.push({
            id: 'clarify-people',
            category: 'related_need',
            icon: '👥',
            title: '参与对象',
            description: '涉及哪些人或角色？',
            actionText: '补充对象',
            actionQuery: `涉及哪些人/角色：${query.slice(0, 18)}`,
            priority: 6
        });
    }

    suggestions.push({
        id: 'expand-options',
        category: 'related_need',
        icon: '🧭',
        title: '备选方案',
        description: '给出 3 个不同路径供选择',
        actionText: '生成备选',
        actionQuery: `给我三个不同方案：${query.slice(0, 24)}`,
        priority: 7
    });

    suggestions.push({
        id: 'action-steps',
        category: 'tip',
        icon: '🧩',
        title: '行动步骤',
        description: '拆成可执行的步骤',
        actionText: '拆解步骤',
        actionQuery: `把这件事拆成步骤：${query.slice(0, 24)}`,
        priority: 6
    });

    if (signals.hasRisk || outputType === 'CARDS') {
        suggestions.push({
            id: 'risk-check',
            category: 'warning',
            icon: '⚠️',
            title: '风险与避坑',
            description: '提前识别关键风险点',
            actionText: '查看风险',
            actionQuery: `这件事有哪些风险与注意事项？${query.slice(0, 18)}`,
            priority: 6
        });
    }

    return suggestions;
}

/**
 * 检测查询涉及的场景
 */
function detectScenarios(query: string): string[] {
    const detected: string[] = [];
    for (const [scenario, keywords] of Object.entries(SCENARIO_KEYWORDS)) {
        if (keywords.some(kw => query.includes(kw.toLowerCase()))) {
            detected.push(scenario);
        }
    }
    return detected;
}

/**
 * 基于场景生成建议
 */
function generateScenarioSuggestions(
    scenario: string,
    query: string,
    context?: any
): AssociatedSuggestion[] {
    const suggestions: AssociatedSuggestion[] = [];

    switch (scenario) {
        case 'work':
            suggestions.push({
                id: 'work-reminder',
                category: 'tip',
                icon: '📅',
                title: '添加日程提醒',
                description: '需要设置提醒确保不错过重要事项吗？',
                actionText: '设置提醒',
                actionQuery: `帮我设置提醒：${query.slice(0, 20)}`,
                priority: 7
            });
            if (/邮件|email/i.test(query)) {
                suggestions.push({
                    id: 'email-template',
                    category: 'related_need',
                    icon: '✉️',
                    title: '邮件模板',
                    description: '需要帮您起草专业的邮件吗？',
                    actionText: '生成邮件',
                    actionQuery: `帮我写一封关于${query.slice(0, 15)}的邮件`,
                    priority: 8
                });
            }
            break;

        case 'study':
            suggestions.push({
                id: 'study-plan',
                category: 'tip',
                icon: '📚',
                title: '学习计划',
                description: '需要帮您制定学习计划吗？',
                actionText: '制定计划',
                actionQuery: `帮我制定${query.slice(0, 10)}的学习计划`,
                priority: 7
            });
            suggestions.push({
                id: 'study-notes',
                category: 'related_need',
                icon: '📝',
                title: '保存笔记',
                description: '把重要信息保存到笔记？',
                actionText: '保存笔记',
                actionQuery: `帮我记住这个：${query.slice(0, 20)}`,
                priority: 6
            });
            break;

        case 'social':
            suggestions.push({
                id: 'social-reply',
                category: 'related_need',
                icon: '💬',
                title: '回复建议',
                description: '需要帮您想一个合适的回复吗？',
                actionText: '生成回复',
                actionQuery: `帮我想一个回复：${query.slice(0, 20)}`,
                priority: 8
            });
            break;

        case 'health':
            suggestions.push({
                id: 'health-tips',
                category: 'tip',
                icon: '💪',
                title: '健康提示',
                description: '注意劳逸结合，保持健康作息',
                priority: 5
            });
            if (/累|疲惫|压力/i.test(query)) {
                suggestions.push({
                    id: 'rest-reminder',
                    category: 'warning',
                    icon: '😴',
                    title: '休息提醒',
                    description: '检测到您可能需要休息，建议适当放松',
                    actionText: '放松建议',
                    actionQuery: '有什么快速放松的方法',
                    priority: 8
                });
            }
            break;

        case 'finance':
            suggestions.push({
                id: 'budget-track',
                category: 'tip',
                icon: '💰',
                title: '记账提醒',
                description: '需要帮您记录这笔支出吗？',
                actionText: '记录支出',
                actionQuery: `帮我记住这笔支出：${query.slice(0, 20)}`,
                priority: 6
            });
            break;

        case 'travel':
            suggestions.push({
                id: 'travel-checklist',
                category: 'related_need',
                icon: '✅',
                title: '旅行清单',
                description: '需要帮您生成打包清单吗？',
                actionText: '生成清单',
                actionQuery: '帮我生成旅行打包清单',
                priority: 7
            });
            suggestions.push({
                id: 'travel-tips',
                category: 'tip',
                icon: '🌏',
                title: '当地攻略',
                description: '查看目的地的实用信息？',
                actionText: '查看攻略',
                actionQuery: '告诉我目的地的注意事项',
                priority: 6
            });
            break;

        case 'shopping':
            suggestions.push({
                id: 'price-compare',
                category: 'opportunity',
                icon: '💵',
                title: '比价搜索',
                description: '多平台比较价格，找到最优惠',
                actionText: '比较价格',
                actionQuery: `帮我比较${query.slice(0, 15)}的价格`,
                priority: 8
            });
            suggestions.push({
                id: 'wishlist-save',
                category: 'tip',
                icon: '❤️',
                title: '加入心愿单',
                description: '先保存下来，等降价再买？',
                actionText: '保存',
                actionQuery: `帮我记住想买的：${query.slice(0, 15)}`,
                priority: 5
            });
            break;

        case 'food':
            suggestions.push({
                id: 'nearby-restaurants',
                category: 'related_need',
                icon: '📍',
                title: '附近餐厅',
                description: '查看附近有什么好吃的？',
                actionText: '查找餐厅',
                actionQuery: '附近有什么好吃的餐厅',
                priority: 7
            });
            break;

        case 'emotion':
            suggestions.push({
                id: 'emotion-support',
                category: 'tip',
                icon: '🤗',
                title: '情感支持',
                description: '我在这里倾听，有什么想说的吗？',
                priority: 8
            });
            break;
    }

    return suggestions;
}

/**
 * 基于输出类型生成建议
 */
function generateTypeSuggestions(
    outputType: string,
    query: string,
    context?: any
): AssociatedSuggestion[] {
    const suggestions: AssociatedSuggestion[] = [];

    switch (outputType) {
        case 'DRAFTS':
            suggestions.push({
                id: 'draft-variations',
                category: 'related_need',
                icon: '🔄',
                title: '更多风格',
                description: '试试其他表达方式？',
                actionText: '换个风格',
                actionQuery: `用不同风格说：${query.slice(0, 20)}`,
                priority: 6
            });
            break;

        case 'TOOL_RESULT':
            if (context?.toolName === 'weather') {
                suggestions.push({
                    id: 'weather-outfit',
                    category: 'related_need',
                    icon: '👔',
                    title: '穿搭建议',
                    description: '根据天气推荐今日穿搭',
                    actionText: '查看穿搭',
                    actionQuery: '今天穿什么合适',
                    priority: 7
                });
            }
            break;

        case 'CARDS':
            suggestions.push({
                id: 'cards-more',
                category: 'related_need',
                icon: '🔍',
                title: '查看更多',
                description: '需要更详细的信息吗？',
                actionText: '了解更多',
                actionQuery: `${query} 更多细节`,
                priority: 5
            });
            break;
    }

    return suggestions;
}

/**
 * 基于时间紧迫性生成建议
 */
function generateTimeSuggestions(query: string): AssociatedSuggestion[] {
    const suggestions: AssociatedSuggestion[] = [];

    if (TIME_KEYWORDS.urgent.some(kw => query.includes(kw.toLowerCase()))) {
        suggestions.push({
            id: 'urgent-focus',
            category: 'warning',
            icon: '⚡',
            title: '紧急事项',
            description: '检测到紧急需求，优先处理中',
            priority: 10
        });
    }

    if (TIME_KEYWORDS.tomorrow.some(kw => query.includes(kw.toLowerCase()))) {
        suggestions.push({
            id: 'tomorrow-prep',
            category: 'reminder',
            icon: '📆',
            title: '明日准备',
            description: '需要提醒您准备吗？',
            actionText: '设置提醒',
            actionQuery: '提醒我明天的事',
            priority: 6
        });
    }

    return suggestions;
}

/**
 * 通用智能建议
 */
function generateGenericSuggestions(query: string, outputType: string): AssociatedSuggestion[] {
    const suggestions: AssociatedSuggestion[] = [];

    // 如果查询较长，建议保存
    if (query.length > 50) {
        suggestions.push({
            id: 'save-note',
            category: 'tip',
            icon: '💾',
            title: '保存到记忆',
            description: '把这个信息保存起来方便以后查看？',
            actionText: '保存',
            actionQuery: `帮我记住：${query.slice(0, 30)}`,
            priority: 4
        });
    }

    // 建议继续对话
    suggestions.push({
        id: 'continue-chat',
        category: 'related_need',
        icon: '💡',
        title: '继续探索',
        description: '还有其他想了解的吗？',
        priority: 2
    });

    return suggestions;
}

/**
 * 去除重复建议
 */
function deduplicateSuggestions(suggestions: AssociatedSuggestion[]): AssociatedSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
    });
}

/**
 * 快速生成联想建议（用于 LumiAgent）
 */
export function quickAssociate(query: string, outputType: string): AssociatedSuggestion[] {
    return generateAssociatedSuggestions(query, outputType);
}
