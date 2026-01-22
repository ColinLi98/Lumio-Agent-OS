/**
 * DataRequestPanel - 数据请求可视化面板
 *
 * 显示待处理数据请求、活跃合约和历史记录
 */

import React, { useState, useEffect } from 'react';
import {
    FileText, Check, X, Clock, Shield, AlertCircle,
    RefreshCw, Eye, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    dataNegotiation,
    DataRequest,
    DataContract,
    DataScope,
    DataCondition,
    getPendingDataRequests,
    getActiveDataContracts,
    respondToDataRequest,
    revokeDataContract,
    evaluateDataRequest
} from '../services/dataNegotiation';

// ============================================================================
// Scope Badge
// ============================================================================

const getScopeLabel = (scope: DataScope): string => {
    const labels: Record<DataScope, string> = {
        profile_basic: '基础资料',
        profile_full: '完整资料',
        preferences: '偏好设置',
        behavior_summary: '行为摘要',
        behavior_full: '完整行为',
        interests: '兴趣标签',
        personality: '性格画像',
        social_graph: '社交关系',
        location_current: '当前位置',
        location_history: '位置历史',
        calendar: '日程安排',
        contacts: '联系人',
    };
    return labels[scope] || scope;
};

const getScopeSensitivity = (scope: DataScope): 'low' | 'medium' | 'high' => {
    const high: DataScope[] = ['contacts', 'location_current', 'location_history', 'social_graph'];
    const medium: DataScope[] = ['behavior_full', 'calendar', 'personality', 'profile_full'];
    if (high.includes(scope)) return 'high';
    if (medium.includes(scope)) return 'medium';
    return 'low';
};

interface ScopeBadgeProps {
    scope: DataScope;
    small?: boolean;
}

const ScopeBadge: React.FC<ScopeBadgeProps> = ({ scope, small = false }) => {
    const sensitivity = getScopeSensitivity(scope);
    const colors = {
        low: 'bg-green-500/20 text-green-400 border-green-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        high: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
        <span className={`px-1.5 py-0.5 rounded border ${colors[sensitivity]} ${small ? 'text-[10px]' : 'text-xs'}`}>
            {getScopeLabel(scope)}
        </span>
    );
};

// ============================================================================
// Risk Badge
// ============================================================================

interface RiskBadgeProps {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score }) => {
    const config = {
        low: { bg: 'bg-green-500/20', text: 'text-green-400', label: '低风险' },
        medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '中风险' },
        high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '高风险' },
        critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: '极高风险' },
    };
    const c = config[level];

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${c.bg} ${c.text}`}>
            <AlertCircle size={12} />
            <span className="text-xs">{c.label} ({score})</span>
        </div>
    );
};

// ============================================================================
// Request Card
// ============================================================================

interface RequestCardProps {
    request: DataRequest;
    onApprove: (id: string, scopes: DataScope[], conditions: DataCondition[]) => void;
    onReject: (id: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onApprove, onReject }) => {
    const [expanded, setExpanded] = useState(false);
    const risk = evaluateDataRequest(request);

    const timeStr = new Date(request.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div
                className="p-3 flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="p-1.5 rounded bg-purple-500/20">
                    <FileText size={14} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{request.requesterName}</span>
                        <span className="text-xs text-slate-500">{request.requesterType}</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{request.justification}</div>
                    <div className="flex items-center gap-2">
                        <RiskBadge level={risk.riskLevel} score={risk.overallRisk} />
                        <span className="text-xs text-slate-500">{timeStr}</span>
                    </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-slate-700/50 pt-3">
                    {/* Requested Scopes */}
                    <div>
                        <div className="text-xs text-slate-400 mb-1.5">请求的数据范围</div>
                        <div className="flex flex-wrap gap-1">
                            {request.scopes.map((scope) => (
                                <ScopeBadge key={scope} scope={scope} small />
                            ))}
                        </div>
                    </div>

                    {/* Purposes */}
                    <div>
                        <div className="text-xs text-slate-400 mb-1.5">数据用途</div>
                        <div className="text-xs text-slate-300">
                            {request.purposes.join(', ')}
                        </div>
                    </div>

                    {/* Suggested Conditions */}
                    {risk.suggestedConditions.length > 0 && (
                        <div>
                            <div className="text-xs text-slate-400 mb-1.5">建议条件</div>
                            <div className="space-y-1">
                                {risk.suggestedConditions.map((cond, i) => (
                                    <div key={i} className="text-xs text-yellow-400 flex items-center gap-1">
                                        <Shield size={10} />
                                        {cond.description}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiration */}
                    <div className="text-xs text-slate-400">
                        有效期: {request.expirationDays} 天
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onApprove(request.id, request.scopes, risk.suggestedConditions);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors"
                        >
                            <Check size={12} />
                            批准
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onReject(request.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors"
                        >
                            <X size={12} />
                            拒绝
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Contract Card
// ============================================================================

interface ContractCardProps {
    contract: DataContract;
    onRevoke: (id: string) => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, onRevoke }) => {
    const expiresIn = Math.max(0, Math.ceil((contract.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
    const isExpiring = expiresIn <= 7;

    return (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Shield size={14} className="text-blue-400" />
                    <span className="text-sm text-white">{contract.requesterId}</span>
                </div>
                <button
                    onClick={() => onRevoke(contract.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="撤销合约"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
                {contract.scopes.slice(0, 3).map((scope) => (
                    <ScopeBadge key={scope} scope={scope} small />
                ))}
                {contract.scopes.length > 3 && (
                    <span className="text-xs text-slate-500">+{contract.scopes.length - 3}</span>
                )}
            </div>

            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">访问 {contract.accessCount} 次</span>
                <span className={isExpiring ? 'text-yellow-400' : 'text-slate-500'}>
                    {expiresIn} 天后过期
                </span>
            </div>
        </div>
    );
};

// ============================================================================
// Main Panel
// ============================================================================

interface DataRequestPanelProps {
    onLog?: (message: string) => void;
}

export const DataRequestPanel: React.FC<DataRequestPanelProps> = ({ onLog }) => {
    const [pendingRequests, setPendingRequests] = useState<DataRequest[]>([]);
    const [activeContracts, setActiveContracts] = useState<DataContract[]>([]);
    const [activeTab, setActiveTab] = useState<'requests' | 'contracts'>('requests');

    const loadData = () => {
        setPendingRequests(getPendingDataRequests());
        setActiveContracts(getActiveDataContracts());
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApprove = (id: string, scopes: DataScope[], conditions: DataCondition[]) => {
        respondToDataRequest(id, true, scopes, conditions);
        loadData();
        onLog?.('数据请求已批准');
    };

    const handleReject = (id: string) => {
        respondToDataRequest(id, false);
        loadData();
        onLog?.('数据请求已拒绝');
    };

    const handleRevoke = (id: string) => {
        if (confirm('确定要撤销此合约吗？相关方将无法再访问您的数据。')) {
            revokeDataContract(id);
            loadData();
            onLog?.('合约已撤销');
        }
    };

    const handleSimulateRequest = () => {
        dataNegotiation.createRequest(
            'test_app_123',
            '测试应用',
            'app',
            ['profile_basic', 'interests', 'behavior_summary'],
            ['personalization', 'recommendation'],
            30,
            '用于提供个性化推荐服务'
        );
        loadData();
        onLog?.('已创建模拟数据请求');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText size={18} className="text-purple-400" />
                    <span className="font-semibold text-white">数据授权</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={loadData}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${activeTab === 'requests'
                            ? 'bg-purple-500/30 text-purple-300'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    待处理 ({pendingRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('contracts')}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${activeTab === 'contracts'
                            ? 'bg-blue-500/30 text-blue-300'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    活跃合约 ({activeContracts.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'requests' && (
                <div className="space-y-3">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无待处理请求</p>
                            <button
                                onClick={handleSimulateRequest}
                                className="mt-3 text-xs text-purple-400 hover:text-purple-300"
                            >
                                模拟数据请求
                            </button>
                        </div>
                    ) : (
                        pendingRequests.map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))
                    )}
                </div>
            )}

            {activeTab === 'contracts' && (
                <div className="space-y-3">
                    {activeContracts.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                            <Shield size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无活跃合约</p>
                        </div>
                    ) : (
                        activeContracts.map((contract) => (
                            <ContractCard
                                key={contract.id}
                                contract={contract}
                                onRevoke={handleRevoke}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default DataRequestPanel;
