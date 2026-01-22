/**
 * Agent Boundary Service - 代理交互边界服务
 *
 * 实现数字分身 V2.1 的核心安全机制:
 * - 场景分级 (L1-L4)
 * - 权限矩阵
 * - 回退策略
 *
 * 参考 PRD 8.7 节设计规范
 */

// ============================================================================
// 交互级别枚举
// ============================================================================

/**
 * 交互场景分级
 * L1: 自动执行 - 无需用户确认
 * L2: 半自动 - 单次确认
 * L3: 需确认 - 实时确认
 * L4: 禁止 - 永不代理
 */
export enum InteractionLevel {
    L1_AUTO = 'L1_AUTO',
    L2_SEMI_AUTO = 'L2_SEMI_AUTO',
    L3_CONFIRM = 'L3_CONFIRM',
    L4_FORBIDDEN = 'L4_FORBIDDEN',
}

/**
 * 回退策略
 */
export type FallbackStrategy = 'draft' | 'reject' | 'notify_user' | 'queue';

// ============================================================================
// 权限和边界配置
// ============================================================================

/**
 * 边界配置接口
 */
export interface BoundaryConfig {
    level: InteractionLevel;
    permissions: string[];
    fallbackStrategy: FallbackStrategy;
    requiresConfirmation: boolean;
    maxRetries: number;
}

/**
 * 场景规则接口
 */
export interface ScenarioRule {
    id: string;
    name: string;
    description: string;
    keywords: string[];          // 触发关键词
    category: string;            // 场景类别
    boundary: BoundaryConfig;
}

// ============================================================================
// 默认场景规则配置
// ============================================================================

const DEFAULT_SCENARIO_RULES: ScenarioRule[] = [
    // L1 - 自动执行场景
    {
        id: 'calendar_query',
        name: '日程查询',
        description: '查询日程、会议安排',
        keywords: ['日程', '安排', '会议', '日历', '计划'],
        category: 'query',
        boundary: {
            level: InteractionLevel.L1_AUTO,
            permissions: ['read_calendar'],
            fallbackStrategy: 'notify_user',
            requiresConfirmation: false,
            maxRetries: 2,
        },
    },
    {
        id: 'weather_query',
        name: '天气查询',
        description: '查询天气预报',
        keywords: ['天气', '温度', '下雨', '气温'],
        category: 'query',
        boundary: {
            level: InteractionLevel.L1_AUTO,
            permissions: ['network_access'],
            fallbackStrategy: 'notify_user',
            requiresConfirmation: false,
            maxRetries: 2,
        },
    },
    {
        id: 'message_read',
        name: '消息已读确认',
        description: '标记消息为已读',
        keywords: ['已读', '看到了', '收到'],
        category: 'action',
        boundary: {
            level: InteractionLevel.L1_AUTO,
            permissions: ['message_status'],
            fallbackStrategy: 'draft',
            requiresConfirmation: false,
            maxRetries: 1,
        },
    },

    // L2 - 半自动场景
    {
        id: 'reply_message',
        name: '代发消息',
        description: '代替用户发送感谢、确认等简单消息',
        keywords: ['帮我回复', '帮我说', '代我发', '感谢'],
        category: 'action',
        boundary: {
            level: InteractionLevel.L2_SEMI_AUTO,
            permissions: ['send_message'],
            fallbackStrategy: 'draft',
            requiresConfirmation: true,
            maxRetries: 1,
        },
    },
    {
        id: 'meeting_summary',
        name: '会议摘要',
        description: '生成并发送会议摘要',
        keywords: ['会议摘要', '总结会议', '会议记录'],
        category: 'action',
        boundary: {
            level: InteractionLevel.L2_SEMI_AUTO,
            permissions: ['read_calendar', 'send_message'],
            fallbackStrategy: 'draft',
            requiresConfirmation: true,
            maxRetries: 1,
        },
    },
    {
        id: 'reminder_set',
        name: '设置提醒',
        description: '设置提醒和闹钟',
        keywords: ['提醒我', '设个提醒', '闹钟'],
        category: 'action',
        boundary: {
            level: InteractionLevel.L2_SEMI_AUTO,
            permissions: ['create_reminder'],
            fallbackStrategy: 'notify_user',
            requiresConfirmation: true,
            maxRetries: 1,
        },
    },

    // L3 - 需要确认场景
    {
        id: 'commitment',
        name: '承诺事项',
        description: '代用户做出承诺（如确认参加、答应任务）',
        keywords: ['我去', '我参加', '我来做', '我负责', '我保证'],
        category: 'commitment',
        boundary: {
            level: InteractionLevel.L3_CONFIRM,
            permissions: ['send_message', 'create_task'],
            fallbackStrategy: 'reject',
            requiresConfirmation: true,
            maxRetries: 0,
        },
    },
    {
        id: 'share_sensitive',
        name: '分享敏感数据',
        description: '分享个人信息、位置、联系方式',
        keywords: ['我的电话', '我的地址', '我在', '我的位置'],
        category: 'privacy',
        boundary: {
            level: InteractionLevel.L3_CONFIRM,
            permissions: ['share_personal_info'],
            fallbackStrategy: 'reject',
            requiresConfirmation: true,
            maxRetries: 0,
        },
    },
    {
        id: 'schedule_create',
        name: '创建日程',
        description: '添加新的日程或会议',
        keywords: ['帮我预约', '添加日程', '安排会议'],
        category: 'action',
        boundary: {
            level: InteractionLevel.L3_CONFIRM,
            permissions: ['write_calendar'],
            fallbackStrategy: 'queue',
            requiresConfirmation: true,
            maxRetries: 1,
        },
    },

    // L4 - 禁止场景
    {
        id: 'financial_transaction',
        name: '财务交易',
        description: '涉及金钱交易的操作',
        keywords: ['转账', '付款', '支付', '买', '购买', '结算'],
        category: 'forbidden',
        boundary: {
            level: InteractionLevel.L4_FORBIDDEN,
            permissions: [],
            fallbackStrategy: 'reject',
            requiresConfirmation: false,
            maxRetries: 0,
        },
    },
    {
        id: 'legal_signature',
        name: '法律签署',
        description: '涉及法律效力的签名或承诺',
        keywords: ['签署', '签字', '合同', '协议', '授权书'],
        category: 'forbidden',
        boundary: {
            level: InteractionLevel.L4_FORBIDDEN,
            permissions: [],
            fallbackStrategy: 'reject',
            requiresConfirmation: false,
            maxRetries: 0,
        },
    },
    {
        id: 'password_operation',
        name: '密码操作',
        description: '涉及密码输入或修改',
        keywords: ['密码', '口令', '验证码', 'PIN'],
        category: 'forbidden',
        boundary: {
            level: InteractionLevel.L4_FORBIDDEN,
            permissions: [],
            fallbackStrategy: 'reject',
            requiresConfirmation: false,
            maxRetries: 0,
        },
    },
];

// ============================================================================
// 边界检查结果
// ============================================================================

export interface BoundaryCheckResult {
    allowed: boolean;
    level: InteractionLevel;
    matchedRule: ScenarioRule | null;
    fallbackAction: FallbackStrategy;
    message: string;
    requiresConfirmation: boolean;
}

// ============================================================================
// Agent Boundary Service
// ============================================================================

class AgentBoundaryService {
    private rules: ScenarioRule[];
    private userOverrides: Map<string, InteractionLevel>;

    constructor() {
        this.rules = [...DEFAULT_SCENARIO_RULES];
        this.userOverrides = new Map();
        this.loadUserOverrides();
    }

    /**
     * 检查操作是否允许
     */
    checkBoundary(input: string, context?: { appName?: string; isPrivate?: boolean }): BoundaryCheckResult {
        const matchedRule = this.findMatchingRule(input);

        if (!matchedRule) {
            // 默认行为: 半自动模式
            return {
                allowed: true,
                level: InteractionLevel.L2_SEMI_AUTO,
                matchedRule: null,
                fallbackAction: 'draft',
                message: '未匹配特定规则，使用默认半自动模式',
                requiresConfirmation: true,
            };
        }

        // 检查用户覆盖设置
        const userLevel = this.userOverrides.get(matchedRule.id);
        const effectiveLevel = userLevel ?? matchedRule.boundary.level;

        // L4 禁止场景直接拒绝
        if (effectiveLevel === InteractionLevel.L4_FORBIDDEN) {
            return {
                allowed: false,
                level: effectiveLevel,
                matchedRule,
                fallbackAction: 'reject',
                message: `操作被禁止: ${matchedRule.name}。此类操作需要用户亲自处理。`,
                requiresConfirmation: false,
            };
        }

        // 私密上下文提升级别
        if (context?.isPrivate && effectiveLevel === InteractionLevel.L1_AUTO) {
            return {
                allowed: true,
                level: InteractionLevel.L2_SEMI_AUTO,
                matchedRule,
                fallbackAction: 'draft',
                message: `私密场景，${matchedRule.name} 需要确认`,
                requiresConfirmation: true,
            };
        }

        return {
            allowed: true,
            level: effectiveLevel,
            matchedRule,
            fallbackAction: matchedRule.boundary.fallbackStrategy,
            message: `匹配规则: ${matchedRule.name}`,
            requiresConfirmation: matchedRule.boundary.requiresConfirmation,
        };
    }

    /**
     * 查找匹配的规则
     */
    private findMatchingRule(input: string): ScenarioRule | null {
        const normalizedInput = input.toLowerCase();

        for (const rule of this.rules) {
            for (const keyword of rule.keywords) {
                if (normalizedInput.includes(keyword.toLowerCase())) {
                    return rule;
                }
            }
        }

        return null;
    }

    /**
     * 用户自定义规则级别
     */
    setUserOverride(ruleId: string, level: InteractionLevel): void {
        // L4 不能被降级
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule?.boundary.level === InteractionLevel.L4_FORBIDDEN) {
            console.warn('[AgentBoundary] Cannot override L4 forbidden rules');
            return;
        }

        this.userOverrides.set(ruleId, level);
        this.saveUserOverrides();
    }

    /**
     * 获取所有规则
     */
    getAllRules(): ScenarioRule[] {
        return this.rules.map(rule => ({
            ...rule,
            boundary: {
                ...rule.boundary,
                level: this.userOverrides.get(rule.id) ?? rule.boundary.level,
            },
        }));
    }

    /**
     * 获取规则分类统计
     */
    getRuleStats(): Record<InteractionLevel, number> {
        const stats: Record<InteractionLevel, number> = {
            [InteractionLevel.L1_AUTO]: 0,
            [InteractionLevel.L2_SEMI_AUTO]: 0,
            [InteractionLevel.L3_CONFIRM]: 0,
            [InteractionLevel.L4_FORBIDDEN]: 0,
        };

        this.rules.forEach(rule => {
            const level = this.userOverrides.get(rule.id) ?? rule.boundary.level;
            stats[level]++;
        });

        return stats;
    }

    /**
     * 添加自定义规则
     */
    addCustomRule(rule: ScenarioRule): void {
        // 确保 ID 唯一
        if (this.rules.find(r => r.id === rule.id)) {
            console.warn('[AgentBoundary] Rule ID already exists:', rule.id);
            return;
        }
        this.rules.push(rule);
    }

    /**
     * 加载用户覆盖设置
     */
    private loadUserOverrides(): void {
        try {
            const stored = localStorage.getItem('lumi_boundary_overrides');
            if (stored) {
                const data = JSON.parse(stored);
                this.userOverrides = new Map(Object.entries(data));
            }
        } catch (e) {
            console.warn('[AgentBoundary] Failed to load user overrides');
        }
    }

    /**
     * 保存用户覆盖设置
     */
    private saveUserOverrides(): void {
        try {
            const data = Object.fromEntries(this.userOverrides);
            localStorage.setItem('lumi_boundary_overrides', JSON.stringify(data));
        } catch (e) {
            console.warn('[AgentBoundary] Failed to save user overrides');
        }
    }
}

// ============================================================================
// 导出单例
// ============================================================================

export const agentBoundary = new AgentBoundaryService();

// 便捷函数
export const checkAgentBoundary = (input: string, context?: { appName?: string; isPrivate?: boolean }) =>
    agentBoundary.checkBoundary(input, context);

export const getInteractionLevelLabel = (level: InteractionLevel): string => {
    const labels: Record<InteractionLevel, string> = {
        [InteractionLevel.L1_AUTO]: '自动执行',
        [InteractionLevel.L2_SEMI_AUTO]: '半自动',
        [InteractionLevel.L3_CONFIRM]: '需确认',
        [InteractionLevel.L4_FORBIDDEN]: '禁止',
    };
    return labels[level];
};

export const getInteractionLevelColor = (level: InteractionLevel): string => {
    const colors: Record<InteractionLevel, string> = {
        [InteractionLevel.L1_AUTO]: '#22c55e',      // green
        [InteractionLevel.L2_SEMI_AUTO]: '#3b82f6', // blue
        [InteractionLevel.L3_CONFIRM]: '#f59e0b',   // amber
        [InteractionLevel.L4_FORBIDDEN]: '#ef4444', // red
    };
    return colors[level];
};
