/**
 * Task Detail Component
 * Phase 2 Week 2-2: Task Detail Page
 * 
 * Displays task details, plan steps, action logs, and explanations.
 */

import React, { useState, useEffect } from 'react';
import {
    Task,
    Plan,
    PlanStep,
    getTaskStatusLabel,
    getTaskStatusColor,
    getCategoryLabel,
    getCategoryIcon,
} from '../services/taskTypes';
import { getTaskService } from '../services/taskService';
import { getActionService, ActionResult } from '../services/actionService';
import { PlanExplanationPanel } from './PlanExplanation';
import {
    getOutcomeService,
    OutcomeStatus,
    SatisfactionScore,
} from '../services/outcomeService';

// ============================================================================
// Types
// ============================================================================

interface TaskDetailProps {
    task_id: string;
    onClose?: () => void;
    onOpenMarket?: (task: Task) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const TaskDetail: React.FC<TaskDetailProps> = ({
    task_id,
    onClose,
    onOpenMarket,
}) => {
    const [task, setTask] = useState<Task | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [activeTab, setActiveTab] = useState<'plan' | 'logs'>('plan');
    const [showOutcomeForm, setShowOutcomeForm] = useState(false);
    const [outcomeLogged, setOutcomeLogged] = useState(false);

    const taskService = getTaskService();
    const outcomeService = getOutcomeService();

    useEffect(() => {
        const loadTask = () => {
            const t = taskService.getTask(task_id);
            setTask(t || null);
            if (t) {
                setPlan(taskService.getPlanForTask(task_id) || null);
                // Check if outcome already logged
                const existingOutcome = outcomeService.getTaskOutcome(task_id);
                setOutcomeLogged(!!existingOutcome);
            }
        };

        loadTask();
        return taskService.subscribe(() => loadTask());
    }, [task_id]);

    const handleOutcomeLogged = () => {
        setShowOutcomeForm(false);
        setOutcomeLogged(true);
    };

    if (!task) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-900">
                <p className="text-gray-500">Task not found</p>
            </div>
        );
    }

    const handleStepToggle = (step_id: string, currentStatus: string) => {
        if (!plan) return;
        const newStatus = currentStatus === 'done' ? 'pending' : 'done';
        taskService.updateStepStatus(plan.plan_id, step_id, newStatus as any);
    };

    const getProgressPercent = (): number => {
        if (!plan || plan.steps.length === 0) return 0;
        const done = plan.steps.filter(s => s.status === 'done').length;
        return Math.round((done / plan.steps.length) * 100);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white mr-2"
                        >
                            ← Back
                        </button>
                    )}
                    <span className={`px-2 py-1 rounded text-xs ${getTaskStatusColor(task.status)}`}>
                        {getTaskStatusLabel(task.status)}
                    </span>
                </div>

                <h1 className="text-xl font-bold text-white mb-2">{task.goal}</h1>

                <div className="flex items-center gap-3 text-sm text-gray-400">
                    {task.category && (
                        <span>
                            {getCategoryIcon(task.category)} {getCategoryLabel(task.category)}
                        </span>
                    )}
                    {task.deadline && (
                        <span>
                            ⏰ {new Date(task.deadline).toLocaleDateString('en-US')}
                        </span>
                    )}
                    {task.budget && (
                        <span>💰 ¥{task.budget}</span>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {plan && (
                <div className="px-4 py-2 bg-gray-800/50">
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white">{getProgressPercent()}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                            style={{ width: `${getProgressPercent()}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('plan')}
                    className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'plan'
                        ? 'text-white border-b-2 border-indigo-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    📋 Execution Plan
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'logs'
                        ? 'text-white border-b-2 border-indigo-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    📝 Action Logs
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'plan' ? (
                    <PlanView
                        plan={plan}
                        onStepToggle={handleStepToggle}
                    />
                ) : (
                    <ActionLogsView task_id={task_id} />
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-800 space-y-2">
                {task.status === 'draft' && (
                    <button
                        onClick={() => taskService.updateTaskStatus(task_id, 'planned')}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                    >
                        📋 Start Planning
                    </button>
                )}

                {task.status === 'planned' && (
                    <button
                        onClick={() => taskService.updateTaskStatus(task_id, 'executing')}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
                    >
                        ▶️ Start Execution
                    </button>
                )}

                {task.status === 'executing' && (
                    <>
                        <button
                            onClick={() => taskService.updateTaskStatus(task_id, 'completed')}
                            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
                        >
                            ✅ Mark Completed
                        </button>
                        <button
                            onClick={() => taskService.updateTaskStatus(task_id, 'failed')}
                            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
                        >
                            Mark Failed
                        </button>
                    </>
                )}

                {/* Open in Market button */}
                {onOpenMarket && task.category === 'shopping' && task.status !== 'completed' && (
                    <button
                        onClick={() => onOpenMarket(task)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                    >
                        🛒 Search in Marketplace
                    </button>
                )}

                {/* Outcome Logging (W3-1) */}
                {(task.status === 'completed' || task.status === 'failed') && !outcomeLogged && !showOutcomeForm && (
                    <button
                        onClick={() => setShowOutcomeForm(true)}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium"
                    >
                        ⭐ Log Result Feedback
                    </button>
                )}

                {outcomeLogged && (
                    <div className="text-center py-2 text-green-400 text-sm">
                        ✅ Feedback Logged
                    </div>
                )}
            </div>

            {/* Outcome Form Modal */}
            {showOutcomeForm && task && (
                <OutcomeLoggingForm
                    task_id={task_id}
                    initialStatus={task.status === 'completed' ? 'success' : 'failed'}
                    onClose={() => setShowOutcomeForm(false)}
                    onSubmit={handleOutcomeLogged}
                />
            )}
        </div>
    );
};

// ============================================================================
// Plan View
// ============================================================================

interface PlanViewProps {
    plan: Plan | null;
    onStepToggle: (step_id: string, currentStatus: string) => void;
}

const PlanView: React.FC<PlanViewProps> = ({ plan, onStepToggle }) => {
    if (!plan) {
        return (
            <div className="text-center py-8">
                <p className="text-4xl mb-2">📝</p>
                <p className="text-gray-400">No execution plan yet</p>
                <p className="text-gray-500 text-sm mt-1">
                    Chat with Lumi to generate one
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {plan.steps.map((step, index) => (
                <StepCard
                    key={step.step_id}
                    step={step}
                    index={index}
                    onToggle={() => onStepToggle(step.step_id, step.status)}
                />
            ))}

            {plan.fallback_options && plan.fallback_options.length > 0 && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Fallback options:</p>
                    <ul className="space-y-1">
                        {plan.fallback_options.map((opt, i) => (
                            <li key={i} className="text-gray-300 text-sm">
                                • {opt}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Step Card
// ============================================================================

interface StepCardProps {
    step: PlanStep;
    index: number;
    onToggle: () => void;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, onToggle }) => {
    const getStatusIcon = () => {
        switch (step.status) {
            case 'done': return '✅';
            case 'in_progress': return '🔄';
            case 'skipped': return '⏭️';
            case 'failed': return '❌';
            default: return '⬜';
        }
    };

    return (
        <div
            className={`p-4 rounded-lg border transition cursor-pointer ${step.status === 'done'
                ? 'bg-green-900/20 border-green-700/50'
                : step.status === 'in_progress'
                    ? 'bg-yellow-900/20 border-yellow-700/50'
                    : 'bg-gray-800/50 border-gray-700'
                }`}
            onClick={onToggle}
        >
            <div className="flex items-start gap-3">
                <span className="text-xl">{getStatusIcon()}</span>
                <div className="flex-1">
                    <p className={`font-medium ${step.status === 'done' ? 'text-gray-400 line-through' : 'text-white'
                        }`}>
                        {index + 1}. {step.description}
                    </p>
                    {step.estimated_minutes && (
                        <p className="text-gray-500 text-sm mt-1">
                            Estimated {step.estimated_minutes} min
                        </p>
                    )}
                    {step.action_type && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-600/50 text-indigo-300 text-xs rounded">
                            {step.action_type}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Action Logs View
// ============================================================================

interface ActionLogsViewProps {
    task_id: string;
}

const ActionLogsView: React.FC<ActionLogsViewProps> = ({ task_id }) => {
    // TODO: Implement action logs from actionService
    const logs = [
        { id: '1', type: 'task_created', timestamp: Date.now() - 3600000, message: 'Task created' },
        { id: '2', type: 'plan_generated', timestamp: Date.now() - 1800000, message: 'Execution plan generated' },
    ];

    return (
        <div className="space-y-2">
            {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No action logs yet</p>
            ) : (
                logs.map(log => (
                    <div key={log.id} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-white text-sm">{log.message}</span>
                            <span className="text-gray-500 text-xs">
                                {new Date(log.timestamp).toLocaleTimeString('en-US')}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// ============================================================================
// Outcome Logging Form (W3-1)
// ============================================================================

interface OutcomeLoggingFormProps {
    task_id: string;
    initialStatus: OutcomeStatus;
    onClose: () => void;
    onSubmit: () => void;
}

const OutcomeLoggingForm: React.FC<OutcomeLoggingFormProps> = ({
    task_id,
    initialStatus,
    onClose,
    onSubmit,
}) => {
    const [status, setStatus] = useState<OutcomeStatus>(initialStatus);
    const [satisfaction, setSatisfaction] = useState<SatisfactionScore>(3);
    const [notes, setNotes] = useState('');
    const [timeSpent, setTimeSpent] = useState<number | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            getOutcomeService().logOutcome({
                task_id,
                status,
                satisfaction,
                notes: notes || undefined,
                metrics: timeSpent ? { time_spent_minutes: timeSpent } : undefined,
            });
            onSubmit();
        } catch (error) {
            console.error('[OutcomeLoggingForm] Submit failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const statusOptions: { value: OutcomeStatus; label: string; emoji: string }[] = [
        { value: 'success', label: 'Completed', emoji: '✅' },
        { value: 'partial', label: 'Partially Completed', emoji: '🔶' },
        { value: 'failed', label: 'Failed', emoji: '❌' },
        { value: 'cancelled', label: 'Cancelled', emoji: '⏹️' },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-white">Log Task Outcome</h3>
                    <p className="text-gray-400 text-sm mt-1">Your feedback helps Lumi understand you better</p>
                </div>

                <div className="p-4 space-y-5">
                    {/* Status Selection */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Completion Status</label>
                        <div className="grid grid-cols-2 gap-2">
                            {statusOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatus(opt.value)}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${status === opt.value
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    {opt.emoji} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Satisfaction Rating */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Satisfaction</label>
                        <div className="flex gap-2 justify-center">
                            {([1, 2, 3, 4, 5] as SatisfactionScore[]).map(score => (
                                <button
                                    key={score}
                                    onClick={() => setSatisfaction(score)}
                                    className={`text-3xl transition transform hover:scale-110 ${satisfaction >= score ? 'opacity-100' : 'opacity-30'
                                        }`}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-gray-500 text-xs mt-1">
                            {satisfaction}/5 - {satisfaction >= 4 ? 'Very satisfied' : satisfaction >= 3 ? 'Average' : 'Not satisfied'}
                        </p>
                    </div>

                    {/* Time Spent */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Time Spent (minutes)</label>
                        <input
                            type="number"
                            min={0}
                            value={timeSpent ?? ''}
                            onChange={(e) => setTimeSpent(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            placeholder="Optional"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Anything you'd like to record..."
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium"
                    >
                        {submitting ? 'Saving...' : 'Save Feedback'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;
