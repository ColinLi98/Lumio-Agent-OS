import React, { useState, useEffect } from 'react';
import { Shield, Database, Wifi, WifiOff, Lock, Eye, Activity, Server, ChevronRight, Settings } from 'lucide-react';
import { getPrivacySettings, getAiCallStats } from '../services/privacyService';

interface PrivacyPanelProps {
    apiKeyConfigured: boolean;
    onLog?: (message: string) => void;
    /** v0.3: Callback to open full Privacy Dashboard */
    onOpenDashboard?: () => void;
}

interface PrivacyStats {
    localDataSize: number;
    aiCallsCount: number;
    lastAiCall: number | null;
    networkEnabled: boolean;
}

/**
 * Privacy Panel - 隐私状态面板
 * 展示本地存储状态、网络状态、API 调用统计
 * 让用户清楚了解数据处理情况
 */
export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ apiKeyConfigured, onLog, onOpenDashboard }) => {
    const [stats, setStats] = useState<PrivacyStats>({
        localDataSize: 0,
        aiCallsCount: 0,
        lastAiCall: null,
        networkEnabled: true
    });
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Calculate local storage size
    const calculateLocalStorageSize = () => {
        let totalSize = 0;
        const lumiKeys = ['lumi_memory_graph', 'lumi_calendar_events', 'lumi_reminders', 'lumi_api_key'];

        for (const key of lumiKeys) {
            const item = localStorage.getItem(key);
            if (item) {
                totalSize += item.length * 2; // UTF-16 uses 2 bytes per character
            }
        }
        return totalSize;
    };

    // Load AI call stats
    const loadStats = () => {
        const aiCalls = parseInt(localStorage.getItem('lumi_ai_calls') || '0', 10);
        const lastCall = localStorage.getItem('lumi_last_ai_call');

        setStats({
            localDataSize: calculateLocalStorageSize(),
            aiCallsCount: aiCalls,
            lastAiCall: lastCall ? parseInt(lastCall, 10) : null,
            networkEnabled: navigator.onLine
        });
    };

    useEffect(() => {
        loadStats();

        // Listen for online/offline events
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Refresh stats every 5 seconds
        const interval = setInterval(loadStats, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    // Format bytes to human readable
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Format timestamp
    const formatTime = (timestamp: number | null): string => {
        if (!timestamp) return '无';
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 rounded-xl p-4 border border-emerald-500/30">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-emerald-400" />
                <span className="font-semibold text-white">隐私状态</span>
                <div className={`ml-auto px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600 text-slate-300'
                    }`}>
                    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {isOnline ? '在线' : '离线'}
                </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Local Storage */}
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Database size={14} />
                        <span className="text-xs">本地存储</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                        {formatBytes(stats.localDataSize)}
                    </div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                        <Lock size={10} />
                        仅存设备
                    </div>
                </div>

                {/* AI Calls */}
                <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Activity size={14} />
                        <span className="text-xs">AI 调用</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                        {stats.aiCallsCount} 次
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        最近: {formatTime(stats.lastAiCall)}
                    </div>
                </div>
            </div>

            {/* Privacy Guarantees */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Lock size={12} className="text-emerald-400" />
                    </div>
                    <span className="text-slate-300">聊天记录不上传</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Eye size={12} className="text-emerald-400" />
                    </div>
                    <span className="text-slate-300">仅发送意图，不发送原文</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${apiKeyConfigured ? 'bg-emerald-500/20' : 'bg-slate-600'
                        }`}>
                        <Server size={12} className={apiKeyConfigured ? 'text-emerald-400' : 'text-slate-400'} />
                    </div>
                    <span className={apiKeyConfigured ? 'text-slate-300' : 'text-slate-500'}>
                        {apiKeyConfigured ? 'API 已配置（您的密钥）' : 'API 未配置'}
                    </span>
                </div>
            </div>

            {/* Footer with Manage Button */}
            <div className="mt-4 pt-3 border-t border-slate-700/50">
                {onOpenDashboard && (
                    <button
                        onClick={onOpenDashboard}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors mb-2"
                    >
                        <span className="flex items-center gap-2 text-sm text-slate-300">
                            <Settings size={14} />
                            管理隐私设置
                        </span>
                        <ChevronRight size={14} className="text-slate-500" />
                    </button>
                )}
                <div className="text-xs text-slate-500 text-center">
                    🔐 Local-first · 数据主权归您所有
                </div>
            </div>
        </div>
    );
};

// Helper: Increment AI call counter (call this from lumiAgent when making API calls)
export const trackAiCall = () => {
    const count = parseInt(localStorage.getItem('lumi_ai_calls') || '0', 10);
    localStorage.setItem('lumi_ai_calls', String(count + 1));
    localStorage.setItem('lumi_last_ai_call', String(Date.now()));
};

export default PrivacyPanel;
