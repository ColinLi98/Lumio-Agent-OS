/**
 * Emergency Handler Service - 紧急情况处理服务
 *
 * 实现数字分身 V2.2 的紧急情况处理机制:
 * - 场景分类
 * - 降级策略
 * - 恢复流程
 *
 * 参考 PRD 8.7 节设计规范
 */

// ============================================================================
// 紧急场景类型
// ============================================================================

/**
 * 紧急场景级别
 */
export enum EmergencyLevel {
    LOW = 'LOW',           // 低级: 可延迟处理
    MEDIUM = 'MEDIUM',     // 中级: 需要用户注意
    HIGH = 'HIGH',         // 高级: 需要立即处理
    CRITICAL = 'CRITICAL', // 严重: 系统级紧急
}

/**
 * 紧急场景类型
 */
export enum EmergencyType {
    NETWORK_FAILURE = 'NETWORK_FAILURE',       // 网络故障
    API_ERROR = 'API_ERROR',                   // API 错误
    PRIVACY_BREACH = 'PRIVACY_BREACH',         // 隐私泄露风险
    SECURITY_THREAT = 'SECURITY_THREAT',       // 安全威胁
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 服务不可用
    RATE_LIMIT = 'RATE_LIMIT',                 // 频率限制
    AUTH_FAILURE = 'AUTH_FAILURE',             // 认证失败
    DATA_CORRUPTION = 'DATA_CORRUPTION',       // 数据损坏
}

/**
 * 降级策略
 */
export type DegradationStrategy =
    | 'fallback_local'     // 降级到本地功能
    | 'retry_later'        // 稍后重试
    | 'notify_user'        // 通知用户
    | 'disable_feature'    // 禁用功能
    | 'emergency_stop'     // 紧急停止
    | 'cache_response';    // 使用缓存响应

/**
 * 紧急事件
 */
export interface EmergencyEvent {
    id: string;
    type: EmergencyType;
    level: EmergencyLevel;
    message: string;
    details?: Record<string, any>;
    timestamp: number;
    resolved: boolean;
    resolution?: string;
}

/**
 * 降级配置
 */
export interface DegradationConfig {
    type: EmergencyType;
    level: EmergencyLevel;
    strategies: DegradationStrategy[];
    maxRetries: number;
    retryDelayMs: number;
    autoRecover: boolean;
    fallbackResponse?: any;
}

// ============================================================================
// 默认降级配置
// ============================================================================

const DEFAULT_DEGRADATION_CONFIGS: DegradationConfig[] = [
    {
        type: EmergencyType.NETWORK_FAILURE,
        level: EmergencyLevel.MEDIUM,
        strategies: ['fallback_local', 'retry_later', 'notify_user'],
        maxRetries: 3,
        retryDelayMs: 5000,
        autoRecover: true,
        fallbackResponse: { type: 'OFFLINE_MODE', message: '网络不可用，使用离线模式' },
    },
    {
        type: EmergencyType.API_ERROR,
        level: EmergencyLevel.MEDIUM,
        strategies: ['retry_later', 'cache_response', 'notify_user'],
        maxRetries: 2,
        retryDelayMs: 3000,
        autoRecover: true,
    },
    {
        type: EmergencyType.PRIVACY_BREACH,
        level: EmergencyLevel.CRITICAL,
        strategies: ['emergency_stop', 'notify_user'],
        maxRetries: 0,
        retryDelayMs: 0,
        autoRecover: false,
    },
    {
        type: EmergencyType.SECURITY_THREAT,
        level: EmergencyLevel.CRITICAL,
        strategies: ['emergency_stop', 'notify_user', 'disable_feature'],
        maxRetries: 0,
        retryDelayMs: 0,
        autoRecover: false,
    },
    {
        type: EmergencyType.SERVICE_UNAVAILABLE,
        level: EmergencyLevel.MEDIUM,
        strategies: ['fallback_local', 'retry_later'],
        maxRetries: 3,
        retryDelayMs: 10000,
        autoRecover: true,
    },
    {
        type: EmergencyType.RATE_LIMIT,
        level: EmergencyLevel.LOW,
        strategies: ['retry_later', 'cache_response'],
        maxRetries: 5,
        retryDelayMs: 60000,
        autoRecover: true,
    },
    {
        type: EmergencyType.AUTH_FAILURE,
        level: EmergencyLevel.HIGH,
        strategies: ['notify_user', 'disable_feature'],
        maxRetries: 1,
        retryDelayMs: 0,
        autoRecover: false,
    },
    {
        type: EmergencyType.DATA_CORRUPTION,
        level: EmergencyLevel.HIGH,
        strategies: ['fallback_local', 'notify_user'],
        maxRetries: 0,
        retryDelayMs: 0,
        autoRecover: false,
    },
];

// ============================================================================
// Emergency Handler Service
// ============================================================================

class EmergencyHandlerService {
    private events: EmergencyEvent[] = [];
    private configs: Map<EmergencyType, DegradationConfig> = new Map();
    private retryTimers: Map<string, NodeJS.Timeout> = new Map();
    private listeners: Array<(event: EmergencyEvent) => void> = [];
    private readonly STORAGE_KEY = 'lumi_emergency_events';
    private readonly MAX_EVENTS = 50;

    constructor() {
        // 初始化配置
        DEFAULT_DEGRADATION_CONFIGS.forEach(config => {
            this.configs.set(config.type, config);
        });
        this.loadEvents();
    }

    /**
     * 报告紧急事件
     */
    report(
        type: EmergencyType,
        message: string,
        details?: Record<string, any>
    ): EmergencyEvent {
        const config = this.configs.get(type) || DEFAULT_DEGRADATION_CONFIGS[0];

        const event: EmergencyEvent = {
            id: `em_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            level: config.level,
            message,
            details,
            timestamp: Date.now(),
            resolved: false,
        };

        this.events.push(event);
        this.trimEvents();
        this.saveEvents();

        // 通知监听器
        this.listeners.forEach(listener => listener(event));

        console.log(`[Emergency] ${type} - ${message}`);

        // 执行降级策略
        this.executeStrategies(event, config);

        return event;
    }

    /**
     * 执行降级策略
     */
    private executeStrategies(event: EmergencyEvent, config: DegradationConfig): void {
        for (const strategy of config.strategies) {
            switch (strategy) {
                case 'fallback_local':
                    console.log('[Emergency] Executing: fallback_local');
                    // 降级到本地功能在调用处处理
                    break;

                case 'retry_later':
                    if (config.maxRetries > 0) {
                        console.log(`[Emergency] Scheduling retry in ${config.retryDelayMs}ms`);
                        // 重试逻辑由调用者实现
                    }
                    break;

                case 'notify_user':
                    console.log('[Emergency] User notification required');
                    // 触发 UI 通知
                    break;

                case 'disable_feature':
                    console.log('[Emergency] Feature disabled');
                    // 禁用相关功能
                    break;

                case 'emergency_stop':
                    console.log('[Emergency] Emergency stop triggered!');
                    // 紧急停止所有操作
                    break;

                case 'cache_response':
                    console.log('[Emergency] Using cached response');
                    // 使用缓存响应
                    break;
            }
        }
    }

    /**
     * 解决事件
     */
    resolve(eventId: string, resolution: string): boolean {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.resolved = true;
            event.resolution = resolution;
            this.saveEvents();
            console.log(`[Emergency] Resolved: ${eventId}`);
            return true;
        }
        return false;
    }

    /**
     * 获取未解决的事件
     */
    getUnresolvedEvents(): EmergencyEvent[] {
        return this.events.filter(e => !e.resolved);
    }

    /**
     * 获取事件历史
     */
    getEventHistory(limit: number = 20): EmergencyEvent[] {
        return this.events.slice(-limit);
    }

    /**
     * 获取特定类型的配置
     */
    getConfig(type: EmergencyType): DegradationConfig | undefined {
        return this.configs.get(type);
    }

    /**
     * 更新配置
     */
    updateConfig(type: EmergencyType, config: Partial<DegradationConfig>): void {
        const existing = this.configs.get(type);
        if (existing) {
            this.configs.set(type, { ...existing, ...config });
        }
    }

    /**
     * 添加事件监听器
     */
    addListener(listener: (event: EmergencyEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * 检查系统健康状态
     */
    checkHealth(): {
        status: 'healthy' | 'degraded' | 'critical';
        unresolvedCount: number;
        criticalCount: number;
    } {
        const unresolved = this.getUnresolvedEvents();
        const criticalCount = unresolved.filter(
            e => e.level === EmergencyLevel.CRITICAL
        ).length;

        let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
        if (criticalCount > 0) {
            status = 'critical';
        } else if (unresolved.length > 0) {
            status = 'degraded';
        }

        return {
            status,
            unresolvedCount: unresolved.length,
            criticalCount,
        };
    }

    /**
     * 重置所有事件
     */
    clearAll(): void {
        this.events = [];
        this.saveEvents();
        this.retryTimers.forEach(timer => clearTimeout(timer));
        this.retryTimers.clear();
    }

    private trimEvents(): void {
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS);
        }
    }

    private loadEvents(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.events = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Emergency] Failed to load events');
        }
    }

    private saveEvents(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
        } catch (e) {
            console.warn('[Emergency] Failed to save events');
        }
    }
}

// ============================================================================
// 导出单例
// ============================================================================

export const emergencyHandler = new EmergencyHandlerService();

// 便捷函数
export const reportEmergency = (
    type: EmergencyType,
    message: string,
    details?: Record<string, any>
) => emergencyHandler.report(type, message, details);

export const getSystemHealth = () => emergencyHandler.checkHealth();

export const onEmergencyEvent = (listener: (event: EmergencyEvent) => void) =>
    emergencyHandler.addListener(listener);
