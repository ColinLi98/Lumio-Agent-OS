/**
 * Trust Score Service - 信任评分服务
 *
 * 实现数字分身 V2.1 的信任评分体系:
 * - 多维度评分
 * - 动态调整
 * - 历史行为追踪
 *
 * 参考 PRD 8.7 节设计规范
 */

// ============================================================================
// 信任评分类型
// ============================================================================

/**
 * 信任评分维度
 */
export interface TrustDimensions {
    authentication: number;       // 0-100 认证程度 (是否通过 KYC)
    behaviorHistory: number;      // 0-100 历史行为 (遵守规则、任务完成率)
    communityReputation: number;  // 0-100 社区声誉 (用户评价)
    technicalSecurity: number;    // 0-100 技术安全 (加密、合规认证)
}

/**
 * 信任评分
 */
export interface TrustScore {
    overall: number;              // 0-100 综合评分
    dimensions: TrustDimensions;
    level: TrustLevel;            // 信任等级
    lastUpdated: number;          // 最后更新时间戳
    history: TrustHistoryEntry[]; // 历史记录 (最近30条)
}

/**
 * 信任等级
 */
export enum TrustLevel {
    UNTRUSTED = 'UNTRUSTED',     // 0-20: 未信任
    LOW = 'LOW',                 // 21-40: 低信任
    MEDIUM = 'MEDIUM',           // 41-60: 中等信任
    HIGH = 'HIGH',               // 61-80: 高信任
    VERIFIED = 'VERIFIED',       // 81-100: 已验证
}

/**
 * 信任历史条目
 */
export interface TrustHistoryEntry {
    timestamp: number;
    action: string;              // 触发动作
    delta: number;               // 分数变化
    dimension: keyof TrustDimensions;
    reason: string;              // 变化原因
}

// ============================================================================
// 权重配置
// ============================================================================

const DIMENSION_WEIGHTS: Record<keyof TrustDimensions, number> = {
    authentication: 0.25,
    behaviorHistory: 0.35,
    communityReputation: 0.20,
    technicalSecurity: 0.20,
};

// 分数调整规则
const SCORE_ADJUSTMENTS = {
    task_completed: { dimension: 'behaviorHistory' as const, delta: 2, reason: '完成任务' },
    task_failed: { dimension: 'behaviorHistory' as const, delta: -5, reason: '任务失败' },
    rule_followed: { dimension: 'behaviorHistory' as const, delta: 1, reason: '遵守规则' },
    rule_violated: { dimension: 'behaviorHistory' as const, delta: -10, reason: '违反规则' },
    confirmation_accepted: { dimension: 'behaviorHistory' as const, delta: 1, reason: '确认操作' },
    confirmation_rejected: { dimension: 'behaviorHistory' as const, delta: 0, reason: '拒绝操作' },
    privacy_respected: { dimension: 'technicalSecurity' as const, delta: 2, reason: '隐私保护' },
    data_exported: { dimension: 'technicalSecurity' as const, delta: 1, reason: '数据导出' },
    positive_feedback: { dimension: 'communityReputation' as const, delta: 3, reason: '正面反馈' },
    negative_feedback: { dimension: 'communityReputation' as const, delta: -5, reason: '负面反馈' },
};

// ============================================================================
// Trust Score Service
// ============================================================================

class TrustScoreService {
    private score: TrustScore;
    private readonly STORAGE_KEY = 'lumi_trust_score';

    constructor() {
        this.score = this.loadScore();
    }

    /**
     * 获取当前信任评分
     */
    getScore(): TrustScore {
        return { ...this.score };
    }

    /**
     * 获取综合评分
     */
    getOverallScore(): number {
        return this.score.overall;
    }

    /**
     * 获取信任等级
     */
    getTrustLevel(): TrustLevel {
        return this.score.level;
    }

    /**
     * 记录行为并调整分数
     */
    recordAction(actionType: keyof typeof SCORE_ADJUSTMENTS): void {
        const adjustment = SCORE_ADJUSTMENTS[actionType];
        if (!adjustment) {
            console.warn('[TrustScore] Unknown action type:', actionType);
            return;
        }

        this.adjustScore(adjustment.dimension, adjustment.delta, adjustment.reason);
    }

    /**
     * 调整特定维度分数
     */
    adjustScore(dimension: keyof TrustDimensions, delta: number, reason: string): void {
        const oldValue = this.score.dimensions[dimension];
        const newValue = Math.max(0, Math.min(100, oldValue + delta));

        this.score.dimensions[dimension] = newValue;

        // 记录历史
        this.score.history.push({
            timestamp: Date.now(),
            action: dimension,
            delta: newValue - oldValue,
            dimension,
            reason,
        });

        // 保留最近30条
        if (this.score.history.length > 30) {
            this.score.history = this.score.history.slice(-30);
        }

        // 重新计算综合评分
        this.recalculateOverall();
        this.score.lastUpdated = Date.now();
        this.saveScore();

        console.log(`[TrustScore] ${dimension}: ${oldValue} → ${newValue} (${delta > 0 ? '+' : ''}${delta})`);
    }

    /**
     * 设置认证状态
     */
    setAuthenticationLevel(level: number): void {
        this.score.dimensions.authentication = Math.max(0, Math.min(100, level));
        this.recalculateOverall();
        this.saveScore();
    }

    /**
     * 重新计算综合评分
     */
    private recalculateOverall(): void {
        let weighted = 0;
        for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
            weighted += this.score.dimensions[dim as keyof TrustDimensions] * weight;
        }
        this.score.overall = Math.round(weighted);
        this.score.level = this.calculateLevel(this.score.overall);
    }

    /**
     * 计算信任等级
     */
    private calculateLevel(score: number): TrustLevel {
        if (score >= 81) return TrustLevel.VERIFIED;
        if (score >= 61) return TrustLevel.HIGH;
        if (score >= 41) return TrustLevel.MEDIUM;
        if (score >= 21) return TrustLevel.LOW;
        return TrustLevel.UNTRUSTED;
    }

    /**
     * 获取信任等级描述
     */
    getLevelDescription(): string {
        const descriptions: Record<TrustLevel, string> = {
            [TrustLevel.UNTRUSTED]: '未信任 - 需要更多交互建立信任',
            [TrustLevel.LOW]: '低信任 - 大部分操作需要确认',
            [TrustLevel.MEDIUM]: '中等信任 - 部分操作可自动执行',
            [TrustLevel.HIGH]: '高信任 - 大部分操作可自动执行',
            [TrustLevel.VERIFIED]: '已验证 - 完全信任',
        };
        return descriptions[this.score.level];
    }

    /**
     * 获取信任等级颜色
     */
    getLevelColor(): string {
        const colors: Record<TrustLevel, string> = {
            [TrustLevel.UNTRUSTED]: '#ef4444', // red
            [TrustLevel.LOW]: '#f97316',       // orange
            [TrustLevel.MEDIUM]: '#eab308',    // yellow
            [TrustLevel.HIGH]: '#22c55e',      // green
            [TrustLevel.VERIFIED]: '#3b82f6',  // blue
        };
        return colors[this.score.level];
    }

    /**
     * 重置信任评分
     */
    reset(): void {
        this.score = this.getDefaultScore();
        this.saveScore();
    }

    /**
     * 获取默认分数
     */
    private getDefaultScore(): TrustScore {
        return {
            overall: 50,
            dimensions: {
                authentication: 30,
                behaviorHistory: 60,
                communityReputation: 50,
                technicalSecurity: 60,
            },
            level: TrustLevel.MEDIUM,
            lastUpdated: Date.now(),
            history: [],
        };
    }

    /**
     * 加载分数
     */
    private loadScore(): TrustScore {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[TrustScore] Failed to load score');
        }
        return this.getDefaultScore();
    }

    /**
     * 保存分数
     */
    private saveScore(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.score));
        } catch (e) {
            console.warn('[TrustScore] Failed to save score');
        }
    }
}

// ============================================================================
// 导出单例
// ============================================================================

export const trustScore = new TrustScoreService();

// 便捷函数
export const getTrustScore = () => trustScore.getScore();
export const recordTrustAction = (action: keyof typeof SCORE_ADJUSTMENTS) => trustScore.recordAction(action);
export const getTrustLevel = () => trustScore.getTrustLevel();
