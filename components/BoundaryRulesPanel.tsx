/**
 * BoundaryRulesPanel - 边界规则可视化面板
 *
 * 显示所有代理交互规则和用户自定义覆盖设置
 */

import React, { useState, useEffect } from 'react';
import {
    Shield, Lock, Unlock, AlertTriangle, Check, ChevronDown, ChevronUp,
    Settings, RefreshCw, Zap, Clock, Ban
} from 'lucide-react';
import {
    agentBoundary,
    InteractionLevel,
    ScenarioRule,
    getInteractionLevelLabel,
    getInteractionLevelColor
} from '../services/agentBoundary';

// ============================================================================
// Level Badge
// ============================================================================

interface LevelBadgeProps {
    level: InteractionLevel;
    small?: boolean;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ level, small = false }) => {
    const color = getInteractionLevelColor(level);
    const label = getInteractionLevelLabel(level);

    const icons: Record<InteractionLevel, React.ReactNode> = {
        [InteractionLevel.L1_AUTO]: <Zap size={small ? 10 : 12} />,
        [InteractionLevel.L2_SEMI_AUTO]: <Clock size={small ? 10 : 12} />,
        [InteractionLevel.L3_CONFIRM]: <AlertTriangle size={small ? 10 : 12} />,
        [InteractionLevel.L4_FORBIDDEN]: <Ban size={small ? 10 : 12} />,
    };

    return (
        <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${small ? 'text-[10px]' : 'text-xs'}`}
            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
        >
            {icons[level]}
            <span className="font-medium">{label}</span>
        </div>
    );
};

// ============================================================================
// Rule Card
// ============================================================================

interface RuleCardProps {
    rule: ScenarioRule;
    onOverride: (ruleId: string, level: InteractionLevel) => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onOverride }) => {
    const [expanded, setExpanded] = useState(false);
    const [showLevelPicker, setShowLevelPicker] = useState(false);
    const isForbidden = rule.boundary.level === InteractionLevel.L4_FORBIDDEN;

    const levels = [
        InteractionLevel.L1_AUTO,
        InteractionLevel.L2_SEMI_AUTO,
        InteractionLevel.L3_CONFIRM,
    ];

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`p-1.5 rounded ${isForbidden ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                    {isForbidden ? (
                        <Lock size={14} className="text-red-400" />
                    ) : (
                        <Shield size={14} className="text-blue-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{rule.name}</span>
                        <span className="text-xs text-slate-500">{rule.category}</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">{rule.description}</div>
                </div>
                <LevelBadge level={rule.boundary.level} />
                {expanded ? (
                    <ChevronUp size={14} className="text-slate-400" />
                ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                )}
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-slate-700/50 pt-3">
                    {/* Keywords */}
                    <div>
                        <div className="text-xs text-slate-400 mb-1">触发关键词</div>
                        <div className="flex flex-wrap gap-1">
                            {rule.keywords.map((kw, i) => (
                                <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                                >
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Permissions */}
                    {rule.boundary.permissions.length > 0 && (
                        <div>
                            <div className="text-xs text-slate-400 mb-1">所需权限</div>
                            <div className="flex flex-wrap gap-1">
                                {rule.boundary.permissions.map((perm, i) => (
                                    <span
                                        key={i}
                                        className="px-1.5 py-0.5 bg-purple-500/20 rounded text-xs text-purple-300 border border-purple-500/30"
                                    >
                                        {perm}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fallback Strategy */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">回退策略:</span>
                        <span className="text-slate-300">{rule.boundary.fallbackStrategy}</span>
                    </div>

                    {/* Level Override (not for L4) */}
                    {!isForbidden && (
                        <div className="pt-2 border-t border-slate-700/50">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLevelPicker(!showLevelPicker);
                                }}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                            >
                                <Settings size={12} />
                                自定义级别
                            </button>

                            {showLevelPicker && (
                                <div className="mt-2 flex gap-2">
                                    {levels.map((lvl) => (
                                        <button
                                            key={lvl}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOverride(rule.id, lvl);
                                                setShowLevelPicker(false);
                                            }}
                                            className={`flex-1 py-1.5 rounded text-xs transition-colors ${rule.boundary.level === lvl
                                                    ? 'bg-white/10 ring-1 ring-white/30'
                                                    : 'hover:bg-white/5'
                                                }`}
                                            style={{ color: getInteractionLevelColor(lvl) }}
                                        >
                                            {getInteractionLevelLabel(lvl)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Main Panel
// ============================================================================

interface BoundaryRulesPanelProps {
    onLog?: (message: string) => void;
}

export const BoundaryRulesPanel: React.FC<BoundaryRulesPanelProps> = ({ onLog }) => {
    const [rules, setRules] = useState<ScenarioRule[]>([]);
    const [stats, setStats] = useState<Record<InteractionLevel, number>>({
        [InteractionLevel.L1_AUTO]: 0,
        [InteractionLevel.L2_SEMI_AUTO]: 0,
        [InteractionLevel.L3_CONFIRM]: 0,
        [InteractionLevel.L4_FORBIDDEN]: 0,
    });
    const [filterLevel, setFilterLevel] = useState<InteractionLevel | 'all'>('all');

    const loadData = () => {
        setRules(agentBoundary.getAllRules());
        setStats(agentBoundary.getRuleStats());
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOverride = (ruleId: string, level: InteractionLevel) => {
        agentBoundary.setUserOverride(ruleId, level);
        loadData();
        onLog?.(`规则 ${ruleId} 级别已更新为 ${getInteractionLevelLabel(level)}`);
    };

    const filteredRules = filterLevel === 'all'
        ? rules
        : rules.filter(r => r.boundary.level === filterLevel);

    const levelFilters = [
        { key: 'all' as const, label: '全部', count: rules.length },
        { key: InteractionLevel.L1_AUTO, label: 'L1', count: stats[InteractionLevel.L1_AUTO] },
        { key: InteractionLevel.L2_SEMI_AUTO, label: 'L2', count: stats[InteractionLevel.L2_SEMI_AUTO] },
        { key: InteractionLevel.L3_CONFIRM, label: 'L3', count: stats[InteractionLevel.L3_CONFIRM] },
        { key: InteractionLevel.L4_FORBIDDEN, label: 'L4', count: stats[InteractionLevel.L4_FORBIDDEN] },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield size={18} className="text-blue-400" />
                    <span className="font-semibold text-white">边界规则</span>
                    <span className="text-xs text-slate-500">({rules.length} 条)</span>
                </div>
                <button
                    onClick={loadData}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Level Legend */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { level: InteractionLevel.L1_AUTO, desc: '自动执行' },
                    { level: InteractionLevel.L2_SEMI_AUTO, desc: '半自动' },
                    { level: InteractionLevel.L3_CONFIRM, desc: '需确认' },
                    { level: InteractionLevel.L4_FORBIDDEN, desc: '禁止' },
                ].map(({ level, desc }) => (
                    <div
                        key={level}
                        className="text-center p-2 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                        <div
                            className="text-lg font-bold"
                            style={{ color: getInteractionLevelColor(level) }}
                        >
                            {stats[level]}
                        </div>
                        <div className="text-[10px] text-slate-400">{desc}</div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
                {levelFilters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilterLevel(f.key)}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${filterLevel === f.key
                                ? 'bg-blue-500/30 text-blue-300'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {f.label} ({f.count})
                    </button>
                ))}
            </div>

            {/* Rules List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredRules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} onOverride={handleOverride} />
                ))}
            </div>
        </div>
    );
};

export default BoundaryRulesPanel;
