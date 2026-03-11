/**
 * AgentActionLog - Agent action history
 *
 * Records and displays all agent actions and boundary-check results
 */

import React, { useState, useEffect } from 'react';
import {
    Activity, Check, X, AlertTriangle, Clock, Zap, Shield,
    RefreshCw, Trash2, Filter, ChevronDown
} from 'lucide-react';
import { InteractionLevel, getInteractionLevelLabel, getInteractionLevelColor } from '../services/agentBoundary';

// ============================================================================
// Action Types
// ============================================================================

export interface AgentAction {
    id: string;
    timestamp: number;
    input: string;
    type: 'query' | 'command' | 'tool' | 'draft';
    boundaryLevel: InteractionLevel;
    allowed: boolean;
    result?: 'success' | 'failed' | 'pending';
    matchedRule?: string;
    executionTime?: number;
}

// ============================================================================
// Storage Service
// ============================================================================

const STORAGE_KEY = 'lumi_agent_action_log';
const MAX_ACTIONS = 100;

class AgentActionLogService {
    private actions: AgentAction[] = [];

    constructor() {
        this.load();
    }

    record(action: Omit<AgentAction, 'id' | 'timestamp'>): AgentAction {
        const newAction: AgentAction = {
            ...action,
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: Date.now(),
        };

        this.actions.push(newAction);

        // Trim to max
        if (this.actions.length > MAX_ACTIONS) {
            this.actions = this.actions.slice(-MAX_ACTIONS);
        }

        this.save();
        return newAction;
    }

    getAll(): AgentAction[] {
        return [...this.actions];
    }

    getRecent(count: number = 20): AgentAction[] {
        return this.actions.slice(-count).reverse();
    }

    getStats(): {
        total: number;
        allowed: number;
        blocked: number;
        byLevel: Record<InteractionLevel, number>;
    } {
        const byLevel: Record<InteractionLevel, number> = {
            [InteractionLevel.L1_AUTO]: 0,
            [InteractionLevel.L2_SEMI_AUTO]: 0,
            [InteractionLevel.L3_CONFIRM]: 0,
            [InteractionLevel.L4_FORBIDDEN]: 0,
        };

        let allowed = 0;
        let blocked = 0;

        this.actions.forEach((a) => {
            if (a.allowed) allowed++;
            else blocked++;
            byLevel[a.boundaryLevel]++;
        });

        return { total: this.actions.length, allowed, blocked, byLevel };
    }

    clear(): void {
        this.actions = [];
        this.save();
    }

    private load(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.actions = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[AgentActionLog] Failed to load');
        }
    }

    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.actions));
        } catch (e) {
            console.warn('[AgentActionLog] Failed to save');
        }
    }
}

export const actionLogService = new AgentActionLogService();

// ============================================================================
// Action Card
// ============================================================================

interface ActionCardProps {
    action: AgentAction;
}

const ActionCard: React.FC<ActionCardProps> = ({ action }) => {
    const levelColor = getInteractionLevelColor(action.boundaryLevel);
    const timeStr = new Date(action.timestamp).toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const typeIcons: Record<string, React.ReactNode> = {
        query: <Activity size={12} />,
        command: <Zap size={12} />,
        tool: <Shield size={12} />,
        draft: <Clock size={12} />,
    };

    const typeLabels: Record<string, string> = {
        query: 'Query',
        command: 'Command',
        tool: 'Tool',
        draft: 'Draft',
    };

    return (
        <div
            className={`p-2.5 rounded-lg border ${action.allowed
                    ? 'bg-slate-800/50 border-slate-700'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
        >
            <div className="flex items-start gap-2">
                {/* Status Icon */}
                <div
                    className={`p-1 rounded ${action.allowed ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}
                >
                    {action.allowed ? (
                        <Check size={12} className="text-green-400" />
                    ) : (
                        <X size={12} className="text-red-400" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                            style={{ backgroundColor: `${levelColor}20`, color: levelColor }}
                        >
                            {typeIcons[action.type]}
                            {typeLabels[action.type]}
                        </span>
                        <span className="text-[10px] text-slate-500">{timeStr}</span>
                    </div>
                    <div className="text-xs text-white truncate">{action.input}</div>
                    {action.matchedRule && (
                        <div className="text-[10px] text-slate-400 mt-1">
                            Rule: {action.matchedRule}
                        </div>
                    )}
                </div>

                {/* Level Badge */}
                <div
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${levelColor}20`, color: levelColor }}
                >
                    {getInteractionLevelLabel(action.boundaryLevel)}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Panel
// ============================================================================

interface AgentActionLogProps {
    onLog?: (message: string) => void;
}

export const AgentActionLog: React.FC<AgentActionLogProps> = ({ onLog }) => {
    const [actions, setActions] = useState<AgentAction[]>([]);
    const [stats, setStats] = useState(actionLogService.getStats());
    const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked'>('all');

    const loadData = () => {
        setActions(actionLogService.getRecent(30));
        setStats(actionLogService.getStats());
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleClear = () => {
        if (confirm('Clear all action records?')) {
            actionLogService.clear();
            loadData();
            onLog?.('Action records cleared');
        }
    };

    const handleSimulate = () => {
        // Simulate various actions for demo
        const samples = [
            { input: 'What is today\'s weather?', type: 'query' as const, boundaryLevel: InteractionLevel.L1_AUTO, allowed: true },
            { input: 'Set a reminder for tomorrow', type: 'command' as const, boundaryLevel: InteractionLevel.L2_SEMI_AUTO, allowed: true },
            { input: 'Transfer 500 CNY for me', type: 'command' as const, boundaryLevel: InteractionLevel.L4_FORBIDDEN, allowed: false, matchedRule: 'financial_transaction' },
        ];

        const sample = samples[Math.floor(Math.random() * samples.length)];
        actionLogService.record(sample);
        loadData();
        onLog?.('Added simulated action');
    };

    const filteredActions = actions.filter((a) => {
        if (filter === 'allowed') return a.allowed;
        if (filter === 'blocked') return !a.allowed;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-green-400" />
                    <span className="font-semibold text-white">Action History</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={handleSimulate}
                        className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                        title="Simulate Action"
                    >
                        <Zap size={14} />
                    </button>
                    <button
                        onClick={loadData}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        onClick={handleClear}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-center">
                    <div className="text-lg font-bold text-white">{stats.total}</div>
                    <div className="text-[10px] text-slate-400">Total</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-center">
                    <div className="text-lg font-bold text-green-400">{stats.allowed}</div>
                    <div className="text-[10px] text-slate-400">Allowed</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 text-center">
                    <div className="text-lg font-bold text-red-400">{stats.blocked}</div>
                    <div className="text-[10px] text-slate-400">Blocked</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
                {[
                    { key: 'all' as const, label: 'All' },
                    { key: 'allowed' as const, label: 'Allowed' },
                    { key: 'blocked' as const, label: 'Blocked' },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${filter === f.key
                                ? 'bg-green-500/30 text-green-300'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Actions List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredActions.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                        <Activity size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No action records yet</p>
                    </div>
                ) : (
                    filteredActions.map((action) => (
                        <ActionCard key={action.id} action={action} />
                    ))
                )}
            </div>
        </div>
    );
};

export default AgentActionLog;
