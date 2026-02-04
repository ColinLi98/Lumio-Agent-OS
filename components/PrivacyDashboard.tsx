/**
 * Privacy Dashboard Component
 * Phase 2 Week 4: Full Privacy Management UI
 * 
 * Provides GDPR-style user controls for data management,
 * transparency, and privacy settings.
 */

import React, { useState, useEffect } from 'react';
import {
    Shield, Database, Download, Trash2, Settings, Clock,
    Eye, EyeOff, Activity, AlertTriangle, CheckCircle,
    ChevronRight, X, RefreshCw, FileText, Lock, Unlock
} from 'lucide-react';
import {
    getPrivacySettings,
    updatePrivacySettings,
    downloadDataExport,
    deleteAllData,
    deleteDataCategory,
    getDataCategorySizes,
    getAccessLog,
    clearAccessLog,
    getAiCallStats,
    type PrivacySettings,
    type AccessLogEntry,
    type DataCategory,
} from '../services/privacyService';
import { DomainBadge } from './DomainBadge';

// ============================================================================
// Types
// ============================================================================

type TabId = 'overview' | 'data' | 'controls' | 'log';

interface PrivacyDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#10B981',
    primaryMuted: 'rgba(16, 185, 129, 0.15)',
    danger: '#EF4444',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#CBD5E1',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.2)',
};

// ============================================================================
// Data Category Config
// ============================================================================

const CATEGORY_CONFIG: Record<DataCategory, { label: string; icon: string; description: string }> = {
    soul_matrix: { label: 'Soul Matrix', icon: '🧠', description: '你的数字人格特征' },
    memory_graph: { label: '记忆图谱', icon: '💭', description: '你的对话和交互记录' },
    tasks: { label: '任务记录', icon: '📋', description: '任务和计划数据' },
    reminders: { label: '提醒事项', icon: '⏰', description: '设置的提醒' },
    calendar: { label: '日历事件', icon: '📅', description: '日程安排' },
    preferences: { label: '偏好设置', icon: '⚙️', description: '应用偏好' },
    access_log: { label: '访问日志', icon: '📜', description: 'API调用记录' },
    ai_stats: { label: 'AI统计', icon: '📊', description: 'AI使用统计' },
};

// ============================================================================
// Main Component
// ============================================================================

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [settings, setSettings] = useState<PrivacySettings>(getPrivacySettings());
    const [categorySizes, setCategorySizes] = useState<Record<DataCategory, number>>({} as any);
    const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
    const [aiStats, setAiStats] = useState({ totalCalls: 0, lastCall: null as number | null });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Load data on mount
    useEffect(() => {
        if (isOpen) {
            refreshData();
        }
    }, [isOpen]);

    const refreshData = () => {
        setSettings(getPrivacySettings());
        setCategorySizes(getDataCategorySizes());
        setAccessLog(getAccessLog(100));
        setAiStats(getAiCallStats());
    };

    const handleSettingChange = (key: keyof PrivacySettings, value: any) => {
        const updated = updatePrivacySettings({ [key]: value });
        setSettings(updated);
    };

    const handleDeleteCategory = (category: DataCategory) => {
        if (window.confirm(`确定要删除 ${CATEGORY_CONFIG[category].label} 的所有数据吗？`)) {
            deleteDataCategory(category);
            refreshData();
        }
    };

    const handleDeleteAll = () => {
        if (deleteConfirmText === 'DELETE') {
            setIsDeleting(true);
            setTimeout(() => {
                deleteAllData();
                setIsDeleting(false);
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
                refreshData();
            }, 1500);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatTime = (timestamp: number | null): string => {
        if (!timestamp) return '无';
        const now = Date.now();
        const diff = now - timestamp;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return new Date(timestamp).toLocaleDateString('zh-CN');
    };

    const totalDataSize = Object.values(categorySizes).reduce((a, b) => a + b, 0);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        }}>
            <div style={{
                background: colors.bg1,
                borderRadius: 16,
                width: '100%',
                maxWidth: 600,
                maxHeight: '90vh',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: 20,
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: colors.primaryMuted,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Shield size={20} color={colors.primary} />
                        </div>
                        <div>
                            <div style={{ color: colors.text1, fontWeight: 600, fontSize: 16 }}>
                                隐私控制中心
                            </div>
                            <div style={{ color: colors.text3, fontSize: 12 }}>
                                管理你的数据和隐私设置
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 8,
                            display: 'flex',
                        }}
                    >
                        <X size={20} color={colors.text3} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: `1px solid ${colors.border}`,
                    padding: '0 20px',
                }}>
                    {[
                        { id: 'overview' as TabId, label: '概览', icon: Eye },
                        { id: 'data' as TabId, label: '数据管理', icon: Database },
                        { id: 'controls' as TabId, label: '隐私控制', icon: Settings },
                        { id: 'log' as TabId, label: '访问日志', icon: Activity },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                color: activeTab === tab.id ? colors.primary : colors.text3,
                                borderBottom: activeTab === tab.id ? `2px solid ${colors.primary}` : '2px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 13,
                                fontWeight: 500,
                                marginBottom: -1,
                            }}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: 20,
                }}>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div>
                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <div style={{ background: colors.bg2, borderRadius: 12, padding: 16 }}>
                                    <div style={{ color: colors.text3, fontSize: 12, marginBottom: 4 }}>
                                        本地数据
                                    </div>
                                    <div style={{ color: colors.text1, fontSize: 24, fontWeight: 600 }}>
                                        {formatBytes(totalDataSize)}
                                    </div>
                                    <div style={{ color: colors.primary, fontSize: 11, marginTop: 4 }}>
                                        🔒 仅存设备
                                    </div>
                                </div>
                                <div style={{ background: colors.bg2, borderRadius: 12, padding: 16 }}>
                                    <div style={{ color: colors.text3, fontSize: 12, marginBottom: 4 }}>
                                        AI 调用
                                    </div>
                                    <div style={{ color: colors.text1, fontSize: 24, fontWeight: 600 }}>
                                        {aiStats.totalCalls} 次
                                    </div>
                                    <div style={{ color: colors.text3, fontSize: 11, marginTop: 4 }}>
                                        最近: {formatTime(aiStats.lastCall)}
                                    </div>
                                </div>
                            </div>

                            {/* Privacy Guarantees */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ color: colors.text2, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                                    隐私保障
                                </div>
                                {[
                                    { text: '聊天记录不上传', active: true },
                                    { text: '仅发送意图，不发送原文', active: true },
                                    { text: '记忆学习已' + (settings.enableMemoryLearning ? '开启' : '关闭'), active: settings.enableMemoryLearning },
                                    { text: '特征推断已' + (settings.enableTraitInference ? '开启' : '关闭'), active: settings.enableTraitInference },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 0',
                                    }}>
                                        <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: item.active ? colors.primaryMuted : colors.bg3,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {item.active ?
                                                <Lock size={10} color={colors.primary} /> :
                                                <Unlock size={10} color={colors.text3} />
                                            }
                                        </div>
                                        <span style={{ color: item.active ? colors.text2 : colors.text3, fontSize: 13 }}>
                                            {item.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => downloadDataExport()}
                                    style={{
                                        flex: 1,
                                        background: colors.bg2,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        padding: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        color: colors.text2,
                                        fontSize: 13,
                                    }}
                                >
                                    <Download size={16} />
                                    导出数据
                                </button>
                                <button
                                    onClick={refreshData}
                                    style={{
                                        background: colors.bg2,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        padding: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: colors.text3,
                                    }}
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Management Tab */}
                    {activeTab === 'data' && (
                        <div>
                            {/* Category List */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ color: colors.text2, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                                    数据分类
                                </div>
                                {(Object.entries(CATEGORY_CONFIG) as [DataCategory, typeof CATEGORY_CONFIG[DataCategory]][]).map(([category, config]) => (
                                    <div key={category} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 0',
                                        borderBottom: `1px solid ${colors.border}`,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontSize: 20 }}>{config.icon}</span>
                                            <div>
                                                <div style={{ color: colors.text1, fontSize: 13, fontWeight: 500 }}>
                                                    {config.label}
                                                </div>
                                                <div style={{ color: colors.text3, fontSize: 11 }}>
                                                    {config.description}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ color: colors.text3, fontSize: 12 }}>
                                                {formatBytes(categorySizes[category] || 0)}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteCategory(category)}
                                                disabled={!categorySizes[category]}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: categorySizes[category] ? 'pointer' : 'not-allowed',
                                                    padding: 6,
                                                    borderRadius: 6,
                                                    opacity: categorySizes[category] ? 1 : 0.3,
                                                }}
                                            >
                                                <Trash2 size={14} color={colors.danger} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Export Button */}
                            <button
                                onClick={() => downloadDataExport()}
                                style={{
                                    width: '100%',
                                    background: colors.primaryMuted,
                                    border: `1px solid ${colors.primary}40`,
                                    borderRadius: 8,
                                    padding: 14,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    color: colors.primary,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    marginBottom: 12,
                                }}
                            >
                                <Download size={18} />
                                导出所有数据 (JSON)
                            </button>

                            {/* Delete All Button */}
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                style={{
                                    width: '100%',
                                    background: colors.dangerMuted,
                                    border: `1px solid ${colors.danger}40`,
                                    borderRadius: 8,
                                    padding: 14,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    color: colors.danger,
                                    fontSize: 14,
                                    fontWeight: 500,
                                }}
                            >
                                <AlertTriangle size={18} />
                                删除所有数据 (Right to Be Forgotten)
                            </button>
                        </div>
                    )}

                    {/* Privacy Controls Tab */}
                    {activeTab === 'controls' && (
                        <div>
                            {/* Learning Toggles */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ color: colors.text2, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                                    学习功能
                                </div>

                                <ToggleSetting
                                    label="记忆学习"
                                    description="从对话中学习你的偏好"
                                    value={settings.enableMemoryLearning}
                                    onChange={(v) => handleSettingChange('enableMemoryLearning', v)}
                                />

                                <ToggleSetting
                                    label="特征推断"
                                    description="自动推断你的性格特征"
                                    value={settings.enableTraitInference}
                                    onChange={(v) => handleSettingChange('enableTraitInference', v)}
                                />

                                <ToggleSetting
                                    label="使用分析"
                                    description="记录使用模式以改进服务"
                                    value={settings.enableUsageAnalytics}
                                    onChange={(v) => handleSettingChange('enableUsageAnalytics', v)}
                                />
                            </div>

                            {/* Anonymization Level */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ color: colors.text2, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                                    匿名化级别
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {(['full', 'partial', 'minimal'] as const).map(level => (
                                        <button
                                            key={level}
                                            onClick={() => handleSettingChange('anonymizationLevel', level)}
                                            style={{
                                                flex: 1,
                                                background: settings.anonymizationLevel === level ? colors.primaryMuted : colors.bg2,
                                                border: `1px solid ${settings.anonymizationLevel === level ? colors.primary : colors.border}`,
                                                borderRadius: 8,
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                color: settings.anonymizationLevel === level ? colors.primary : colors.text3,
                                                fontSize: 12,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {level === 'full' ? '完全' : level === 'partial' ? '部分' : '最小'}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ color: colors.text3, fontSize: 11, marginTop: 8 }}>
                                    {settings.anonymizationLevel === 'full'
                                        ? '所有发送的数据都会被完全匿名化处理'
                                        : settings.anonymizationLevel === 'partial'
                                            ? '敏感信息会被脱敏处理'
                                            : '仅基础匿名化处理'}
                                </div>
                            </div>

                            {/* Retention Period */}
                            <div>
                                <div style={{ color: colors.text2, fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                                    数据保留期限
                                </div>
                                <select
                                    value={settings.retentionDays || 'forever'}
                                    onChange={(e) => handleSettingChange(
                                        'retentionDays',
                                        e.target.value === 'forever' ? null : parseInt(e.target.value)
                                    )}
                                    style={{
                                        width: '100%',
                                        background: colors.bg2,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        padding: '10px 12px',
                                        color: colors.text1,
                                        fontSize: 13,
                                    }}
                                >
                                    <option value="forever">永久保留</option>
                                    <option value="7">7 天</option>
                                    <option value="30">30 天</option>
                                    <option value="90">90 天</option>
                                    <option value="180">180 天</option>
                                </select>
                                <div style={{ color: colors.text3, fontSize: 11, marginTop: 8 }}>
                                    超过保留期限的数据会被自动删除
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Access Log Tab */}
                    {activeTab === 'log' && (
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16
                            }}>
                                <div style={{ color: colors.text2, fontSize: 13, fontWeight: 500 }}>
                                    最近访问记录
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm('确定要清除所有访问日志吗？')) {
                                            clearAccessLog();
                                            refreshData();
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: colors.text3,
                                        fontSize: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <Trash2 size={12} />
                                    清除
                                </button>
                            </div>

                            {accessLog.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: 40,
                                    color: colors.text3,
                                }}>
                                    <FileText size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                    <div>暂无访问记录</div>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                                    {accessLog.map((entry) => (
                                        <div
                                            key={entry.id}
                                            style={{
                                                padding: '10px 0',
                                                borderBottom: `1px solid ${colors.border}`,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: entry.externalAccess ? colors.warningMuted : colors.primaryMuted,
                                                    color: entry.externalAccess ? colors.warning : colors.primary,
                                                }}>
                                                    {entry.type === 'ai_call' ? 'AI' :
                                                        entry.type === 'provider_fetch' ? 'LIX' :
                                                            entry.type === 'data_write' ? '写入' :
                                                                entry.type === 'data_read' ? '读取' : '删除'}
                                                </span>
                                                <span style={{ color: colors.text3, fontSize: 11 }}>
                                                    {formatTime(entry.timestamp)}
                                                </span>
                                            </div>
                                            <div style={{ color: colors.text2, fontSize: 12 }}>
                                                {entry.details}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: colors.bg1,
                    borderRadius: 16,
                    padding: 24,
                    width: 360,
                    border: `1px solid ${colors.danger}40`,
                    zIndex: 1001,
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <AlertTriangle size={48} color={colors.danger} />
                        <div style={{ color: colors.text1, fontSize: 18, fontWeight: 600, marginTop: 12 }}>
                            删除所有数据
                        </div>
                        <div style={{ color: colors.text3, fontSize: 13, marginTop: 8 }}>
                            此操作不可撤销，所有数据将被永久删除
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <div style={{ color: colors.text2, fontSize: 12, marginBottom: 8 }}>
                            请输入 <span style={{ color: colors.danger, fontWeight: 600 }}>DELETE</span> 确认
                        </div>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            style={{
                                width: '100%',
                                background: colors.bg2,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: '10px 12px',
                                color: colors.text1,
                                fontSize: 14,
                                textAlign: 'center',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmText('');
                            }}
                            disabled={isDeleting}
                            style={{
                                flex: 1,
                                background: colors.bg3,
                                border: 'none',
                                borderRadius: 8,
                                padding: 12,
                                cursor: 'pointer',
                                color: colors.text2,
                                fontSize: 14,
                            }}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleDeleteAll}
                            disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                            style={{
                                flex: 1,
                                background: deleteConfirmText === 'DELETE' ? colors.danger : colors.bg3,
                                border: 'none',
                                borderRadius: 8,
                                padding: 12,
                                cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                                color: colors.text1,
                                fontSize: 14,
                                fontWeight: 500,
                                opacity: deleteConfirmText === 'DELETE' ? 1 : 0.5,
                            }}
                        >
                            {isDeleting ? '删除中...' : '确认删除'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Toggle Setting Component
// ============================================================================

interface ToggleSettingProps {
    label: string;
    description: string;
    value: boolean;
    onChange: (value: boolean) => void;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ label, description, value, onChange }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: `1px solid ${colors.border}`,
    }}>
        <div>
            <div style={{ color: colors.text1, fontSize: 13, fontWeight: 500 }}>
                {label}
            </div>
            <div style={{ color: colors.text3, fontSize: 11 }}>
                {description}
            </div>
        </div>
        <button
            onClick={() => onChange(!value)}
            style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: value ? colors.primary : colors.bg3,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
            }}
        >
            <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: colors.text1,
                position: 'absolute',
                top: 3,
                left: value ? 23 : 3,
                transition: 'left 0.2s',
            }} />
        </button>
    </div>
);

export default PrivacyDashboard;
