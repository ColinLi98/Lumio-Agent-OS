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

    const taskService = getTaskService();

    useEffect(() => {
        const loadTask = () => {
            const t = taskService.getTask(task_id);
            setTask(t || null);
            if (t) {
                setPlan(taskService.getPlanForTask(task_id) || null);
            }
        };

        loadTask();
        return taskService.subscribe(() => loadTask());
    }, [task_id]);

    if (!task) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-900">
                <p className="text-gray-500">任务未找到</p>
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
                            ← 返回
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
                            ⏰ {new Date(task.deadline).toLocaleDateString('zh-CN')}
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
                        <span className="text-gray-400">进度</span>
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
                    📋 执行计划
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'logs'
                        ? 'text-white border-b-2 border-indigo-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    📝 操作日志
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
                        📋 开始规划
                    </button>
                )}

                {task.status === 'planned' && (
                    <button
                        onClick={() => taskService.updateTaskStatus(task_id, 'executing')}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
                    >
                        ▶️ 开始执行
                    </button>
                )}

                {task.status === 'executing' && (
                    <>
                        <button
                            onClick={() => taskService.updateTaskStatus(task_id, 'completed')}
                            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
                        >
                            ✅ 标记完成
                        </button>
                        <button
                            onClick={() => taskService.updateTaskStatus(task_id, 'failed')}
                            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
                        >
                            标记失败
                        </button>
                    </>
                )}

                {/* Open in Market button */}
                {onOpenMarket && task.category === 'shopping' && task.status !== 'completed' && (
                    <button
                        onClick={() => onOpenMarket(task)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                    >
                        🛒 在市场中搜索
                    </button>
                )}
            </div>
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
                <p className="text-gray-400">暂无执行计划</p>
                <p className="text-gray-500 text-sm mt-1">
                    与 Lumi 对话生成计划
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
                    <p className="text-gray-400 text-sm mb-2">备选方案:</p>
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
                            预计 {step.estimated_minutes} 分钟
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
        { id: '1', type: 'task_created', timestamp: Date.now() - 3600000, message: '任务创建' },
        { id: '2', type: 'plan_generated', timestamp: Date.now() - 1800000, message: '生成执行计划' },
    ];

    return (
        <div className="space-y-2">
            {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无操作日志</p>
            ) : (
                logs.map(log => (
                    <div key={log.id} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-white text-sm">{log.message}</span>
                            <span className="text-gray-500 text-xs">
                                {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default TaskDetail;
