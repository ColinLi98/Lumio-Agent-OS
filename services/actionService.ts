/**
 * Action Service
 * Phase 2 Week 2-2: Execution Hooks
 * 
 * Handles the 4 core action types:
 * - save_task: Persist a task to the task store
 * - set_reminder: Create an in-app reminder
 * - open_market: Navigate to LIX market with intent
 * - execute_purchase: Trigger purchase flow
 */

import { getTaskService } from './taskService';
import { Task, TaskStatus, ActionType } from './taskTypes';
import { getReminderStore } from './reminderStore';
import { eventBus } from './eventBus';
import { generateTraceId } from './traceContext';
import { track } from './telemetryService';

// ============================================================================
// Types
// ============================================================================

export interface ActionResult {
    success: boolean;
    action_type: ActionType;
    message: string;
    data?: Record<string, unknown>;
    error?: string;
    timestamp: number;
    duration_ms: number;
}

export interface ActionContext {
    task_id?: string;
    trace_id?: string;
    source: 'plan_step' | 'quick_action' | 'manual';
}

export interface SaveTaskInput {
    goal: string;
    constraints?: {
        budget_max?: number;
        deadline?: number;
        location_constraints?: string[];
    };
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    tags?: string[];
}

export interface ReminderInput {
    task_id: string;
    message: string;
    remind_at: number;  // timestamp
    repeat?: 'none' | 'daily' | 'weekly';
}

export interface OpenMarketInput {
    intent_query: string;
    task_id?: string;
    category?: string;
    budget_hint?: number;
}

export interface ExecutePurchaseInput {
    offer_id: string;
    task_id: string;
    token_id?: string;
}

// ============================================================================
// Action Handlers
// ============================================================================

type ActionHandler<T> = (input: T, context: ActionContext) => Promise<ActionResult>;

// Define handlers for implemented action types
const handlers: Partial<Record<ActionType, ActionHandler<unknown>>> = {
    save_task: async (input: unknown, context: ActionContext): Promise<ActionResult> => {
        const startTime = Date.now();
        const data = input as SaveTaskInput;

        try {
            const taskService = getTaskService();
            const task = taskService.createTask({
                goal: data.goal,
                constraints: {
                    budget_max: data.constraints?.budget_max,
                    deadline: data.constraints?.deadline,
                    location_constraints: data.constraints?.location_constraints,
                },
                priority: data.priority || 'medium',
                category: data.category as any,
            });

            return {
                success: true,
                action_type: 'save_task',
                message: '任务已保存',
                data: { task_id: task.task_id },
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                action_type: 'save_task',
                message: '保存任务失败',
                error: error instanceof Error ? error.message : '未知错误',
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        }
    },

    set_reminder: async (input: unknown, context: ActionContext): Promise<ActionResult> => {
        const startTime = Date.now();
        const data = input as ReminderInput;

        try {
            const reminderStore = getReminderStore();
            const reminder = reminderStore.createReminder({
                task_id: data.task_id,
                message: data.message,
                remind_at: data.remind_at,
                repeat: data.repeat || 'none',
            });

            return {
                success: true,
                action_type: 'set_reminder',
                message: '提醒已设置',
                data: { reminder_id: reminder.reminder_id },
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                action_type: 'set_reminder',
                message: '设置提醒失败',
                error: error instanceof Error ? error.message : '未知错误',
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        }
    },

    open_market: async (input: unknown, context: ActionContext): Promise<ActionResult> => {
        const startTime = Date.now();
        const data = input as OpenMarketInput;

        try {
            // Store intent for market to pick up
            const intentData = {
                query: data.intent_query,
                task_id: data.task_id,
                category: data.category,
                budget_hint: data.budget_hint,
                timestamp: Date.now(),
            };

            // Store in sessionStorage for cross-component communication
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('pending_market_intent', JSON.stringify(intentData));
            }

            // Emit event for UI to handle navigation
            eventBus.emit({
                event_type: 'intent.created',
                trace_id: context.trace_id || generateTraceId(),
                intent_id: `int_${Date.now()}`,
                timestamp: Date.now(),
                category: data.category || 'general',
                user_pseudonym: 'local_user',
            });

            return {
                success: true,
                action_type: 'open_market',
                message: '正在打开市场...',
                data: { intent_query: data.intent_query },
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                action_type: 'open_market',
                message: '打开市场失败',
                error: error instanceof Error ? error.message : '未知错误',
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        }
    },

    execute_purchase: async (input: unknown, context: ActionContext): Promise<ActionResult> => {
        const startTime = Date.now();
        const data = input as ExecutePurchaseInput;

        try {
            // For now, this just prepares the purchase flow
            // Actual execution would integrate with LIX settlement

            return {
                success: true,
                action_type: 'execute_purchase',
                message: '购买流程已启动',
                data: {
                    offer_id: data.offer_id,
                    task_id: data.task_id,
                    redirect_pending: true,
                },
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                action_type: 'execute_purchase',
                message: '启动购买失败',
                error: error instanceof Error ? error.message : '未知错误',
                timestamp: Date.now(),
                duration_ms: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Action Service Class
// ============================================================================

class ActionService {
    private actionLog: ActionResult[] = [];
    private maxLogSize = 100;

    /**
     * Execute an action
     */
    async execute<T>(
        actionType: ActionType,
        input: T,
        context?: Partial<ActionContext>
    ): Promise<ActionResult> {
        const fullContext: ActionContext = {
            trace_id: context?.trace_id || generateTraceId(),
            source: context?.source || 'manual',
            task_id: context?.task_id,
        };

        const handler = handlers[actionType];
        if (!handler) {
            return {
                success: false,
                action_type: actionType,
                message: `未知操作类型: ${actionType}`,
                error: 'UNKNOWN_ACTION_TYPE',
                timestamp: Date.now(),
                duration_ms: 0,
            };
        }

        // Update task status if linked
        if (fullContext.task_id) {
            const taskService = getTaskService();
            const task = taskService.getTask(fullContext.task_id);
            if (task && task.status === 'planned') {
                taskService.updateTaskStatus(fullContext.task_id, 'executing');
            }
        }

        // Telemetry: Track action started
        track.actionStarted(actionType, fullContext.trace_id);

        const result = await handler(input, fullContext);

        // Telemetry: Track action completed
        track.actionCompleted(actionType, result.success, fullContext.trace_id);

        // Log the action
        this.actionLog.push(result);
        if (this.actionLog.length > this.maxLogSize) {
            this.actionLog.shift();
        }

        // Update task status on completion
        if (fullContext.task_id && result.success) {
            // Some actions complete the task
            if (actionType === 'execute_purchase') {
                const taskService = getTaskService();
                taskService.updateTaskStatus(fullContext.task_id, 'completed');
            }
        }

        return result;
    }

    /**
     * Get action log for a task
     */
    getActionLog(task_id?: string): ActionResult[] {
        if (!task_id) return [...this.actionLog];
        return this.actionLog.filter(a =>
            a.data?.task_id === task_id
        );
    }

    /**
     * Retry a failed action
     */
    async retry<T>(
        originalResult: ActionResult,
        input: T,
        context?: Partial<ActionContext>
    ): Promise<ActionResult> {
        if (originalResult.success) {
            return originalResult; // No need to retry
        }
        return this.execute(originalResult.action_type, input, context);
    }

    /**
     * Clear action log
     */
    clearLog(): void {
        this.actionLog = [];
    }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: ActionService | null = null;

export function getActionService(): ActionService {
    if (!serviceInstance) {
        serviceInstance = new ActionService();
    }
    return serviceInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { ActionService };
