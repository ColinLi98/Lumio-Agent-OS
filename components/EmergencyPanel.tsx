/**
 * EmergencyPanel - 紧急情况可视化面板
 *
 * 显示系统健康状态、未解决事件和历史记录
 */

import React, { useState, useEffect } from 'react';
import {
    AlertTriangle, CheckCircle, AlertCircle, XCircle,
    RefreshCw, Trash2, Clock, Activity
} from 'lucide-react';
import {
    emergencyHandler,
    EmergencyEvent,
    EmergencyLevel,
    EmergencyType,
    getSystemHealth
} from '../services/emergencyHandler';

// ============================================================================
// Health Status Badge
// ============================================================================

interface HealthBadgeProps {
    status: 'healthy' | 'degraded' | 'critical';
}

const HealthBadge: React.FC<HealthBadgeProps> = ({ status }) => {
    const config = {
        healthy: {
            icon: <CheckCircle size={14} />,
            bg: 'bg-green-500/20 border-green-500/30',
            text: 'text-green-400',
            label: '系统正常',
        },
        degraded: {
            icon: <AlertCircle size={14} />,
            bg: 'bg-yellow-500/20 border-yellow-500/30',
            text: 'text-yellow-400',
            label: '部分降级',
        },
        critical: {
            icon: <XCircle size={14} />,
            bg: 'bg-red-500/20 border-red-500/30',
            text: 'text-red-400',
            label: '严重问题',
        },
    };

    const c = config[status];

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${c.bg} ${c.text}`}>
            {c.icon}
            <span className="text-xs font-medium">{c.label}</span>
        </div>
    );
};

// ============================================================================
// Event Card
// ============================================================================

interface EventCardProps {
    event: EmergencyEvent;
    onResolve: (id: string) => void;
}

const getLevelConfig = (level: EmergencyLevel) => {
    const configs = {
        [EmergencyLevel.LOW]: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: '低' },
        [EmergencyLevel.MEDIUM]: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '中' },
        [EmergencyLevel.HIGH]: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: '高' },
        [EmergencyLevel.CRITICAL]: { color: 'text-red-400', bg: 'bg-red-500/20', label: '严重' },
    };
    return configs[level];
};

const getTypeLabel = (type: EmergencyType): string => {
    const labels: Record<EmergencyType, string> = {
        [EmergencyType.NETWORK_FAILURE]: '网络故障',
        [EmergencyType.API_ERROR]: 'API 错误',
        [EmergencyType.PRIVACY_BREACH]: '隐私泄露',
        [EmergencyType.SECURITY_THREAT]: '安全威胁',
        [EmergencyType.SERVICE_UNAVAILABLE]: '服务不可用',
        [EmergencyType.RATE_LIMIT]: '频率限制',
        [EmergencyType.AUTH_FAILURE]: '认证失败',
        [EmergencyType.DATA_CORRUPTION]: '数据损坏',
    };
    return labels[type] || type;
};

const EventCard: React.FC<EventCardProps> = ({ event, onResolve }) => {
    const levelConfig = getLevelConfig(event.level);
    const timeStr = new Date(event.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={`p-3 rounded-lg border ${event.resolved ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded ${levelConfig.bg}`}>
                    <AlertTriangle size={14} className={levelConfig.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${levelConfig.bg} ${levelConfig.color}`}>
                            {levelConfig.label}
                        </span>
                        <span className="text-xs text-slate-400">{getTypeLabel(event.type)}</span>
                    </div>
                    <div className={`text-sm ${event.resolved ? 'text-slate-500' : 'text-white'}`}>
                        {event.message}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <Clock size={10} />
                        <span>{timeStr}</span>
                        {event.resolved && (
                            <span className="text-green-400">✓ 已解决</span>
                        )}
                    </div>
                </div>
                {!event.resolved && (
                    <button
                        onClick={() => onResolve(event.id)}
                        className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                        title="标记为已解决"
                    >
                        <CheckCircle size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Main Panel
// ============================================================================

interface EmergencyPanelProps {
    onLog?: (message: string) => void;
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({ onLog }) => {
    const [health, setHealth] = useState(getSystemHealth());
    const [unresolvedEvents, setUnresolvedEvents] = useState<EmergencyEvent[]>([]);
    const [historyEvents, setHistoryEvents] = useState<EmergencyEvent[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const loadData = () => {
        setHealth(getSystemHealth());
        setUnresolvedEvents(emergencyHandler.getUnresolvedEvents());
        setHistoryEvents(emergencyHandler.getEventHistory(10));
    };

    useEffect(() => {
        loadData();
        // 订阅事件
        const unsubscribe = emergencyHandler.addListener(() => {
            loadData();
        });
        return unsubscribe;
    }, []);

    const handleResolve = (eventId: string) => {
        emergencyHandler.resolve(eventId, '用户手动解决');
        loadData();
        onLog?.('事件已标记为解决');
    };

    const handleClearAll = () => {
        if (confirm('确定要清除所有事件记录吗？')) {
            emergencyHandler.clearAll();
            loadData();
            onLog?.('已清除所有事件');
        }
    };

    const handleSimulateEvent = () => {
        emergencyHandler.report(
            EmergencyType.NETWORK_FAILURE,
            '模拟网络故障测试',
            { simulated: true }
        );
        loadData();
        onLog?.('已模拟紧急事件');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-orange-400" />
                    <span className="font-semibold text-white">系统状态</span>
                </div>
                <HealthBadge status={health.status} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
                    <div className={`text-xl font-bold ${health.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {health.unresolvedCount}
                    </div>
                    <div className="text-xs text-slate-400">未解决</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
                    <div className={`text-xl font-bold ${health.criticalCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {health.criticalCount}
                    </div>
                    <div className="text-xs text-slate-400">严重</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-center">
                    <div className="text-xl font-bold text-slate-300">
                        {historyEvents.length}
                    </div>
                    <div className="text-xs text-slate-400">历史</div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={loadData}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                >
                    <RefreshCw size={12} />
                    刷新
                </button>
                <button
                    onClick={handleSimulateEvent}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs transition-colors"
                >
                    <AlertTriangle size={12} />
                    模拟事件
                </button>
                <button
                    onClick={handleClearAll}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Unresolved Events */}
            {unresolvedEvents.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-300">待处理事件</div>
                    {unresolvedEvents.map((event) => (
                        <EventCard key={event.id} event={event} onResolve={handleResolve} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {unresolvedEvents.length === 0 && (
                <div className="text-center py-6 text-slate-500">
                    <CheckCircle size={32} className="mx-auto mb-2 text-green-400/50" />
                    <p className="text-sm">暂无待处理事件</p>
                </div>
            )}

            {/* History Toggle */}
            <div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full text-xs text-slate-400 hover:text-white py-2 transition-colors"
                >
                    {showHistory ? '隐藏历史' : `查看历史记录 (${historyEvents.length})`}
                </button>

                {showHistory && historyEvents.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {historyEvents.slice().reverse().map((event) => (
                            <EventCard key={event.id} event={event} onResolve={handleResolve} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmergencyPanel;
