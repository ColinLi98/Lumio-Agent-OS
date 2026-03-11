/**
 * Task Service
 * Phase 2 Week 1-3: Unified Task Schema
 * 
 * Manages tasks and plans with full CRUD and persistence.
 */

import {
    Task,
    Plan,
    PlanStep,
    TaskStatus,
    TaskCategory,
    TaskConstraints,
    TaskSource,
    PlanStatus,
    StepStatus,
    generateTaskId,
    generatePlanId,
    generateStepId,
    generateTraceId,
} from './taskTypes.js';
import { eventBus } from './eventBus.js';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    TASKS: 'lumi_tasks',
    PLANS: 'lumi_plans',
};

// ============================================================================
// Task Service Class
// ============================================================================

class TaskService {
    private tasks: Map<string, Task> = new Map();
    private plans: Map<string, Plan> = new Map();
    private listeners: Set<(tasks: Task[]) => void> = new Set();

    constructor() {
        this.load();
    }

    // -------------------------------------------------------------------------
    // Task CRUD
    // -------------------------------------------------------------------------

    /**
     * Create a new task
     */
    createTask(input: {
        goal: string;
        constraints?: Partial<TaskConstraints>;
        deadline?: number;
        budget?: number;
        category?: TaskCategory;
        priority?: Task['priority'];
        source?: TaskSource;
        parent_task_id?: string;
    }): Task {
        const task: Task = {
            task_id: generateTaskId(),
            goal: input.goal,
            goal_normalized: this.normalizeGoal(input.goal),
            constraints: {
                ...input.constraints,
            },
            deadline: input.deadline,
            budget: input.budget,
            risk_level: 'medium',
            status: 'draft',
            priority: input.priority || 'medium',
            category: input.category,
            created_at: Date.now(),
            updated_at: Date.now(),
            trace_id: generateTraceId(),
            source: input.source || 'manual',
            parent_task_id: input.parent_task_id,
        };

        this.tasks.set(task.task_id, task);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'task.created',
            payload: { task_id: task.task_id, goal: task.goal },
        } as any);

        return task;
    }

    /**
     * Get a task by ID
     */
    getTask(task_id: string): Task | undefined {
        return this.tasks.get(task_id);
    }

    /**
     * Get all tasks
     */
    getAllTasks(): Task[] {
        return Array.from(this.tasks.values())
            .sort((a, b) => b.updated_at - a.updated_at);
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(status: TaskStatus): Task[] {
        return this.getAllTasks().filter(t => t.status === status);
    }

    /**
     * Get active tasks (not completed/cancelled/failed)
     */
    getActiveTasks(): Task[] {
        return this.getAllTasks().filter(t =>
            !['completed', 'cancelled', 'failed'].includes(t.status)
        );
    }

    /**
     * Update task
     */
    updateTask(task_id: string, updates: Partial<Omit<Task, 'task_id' | 'created_at' | 'trace_id'>>): Task | undefined {
        const task = this.tasks.get(task_id);
        if (!task) return undefined;

        Object.assign(task, updates, { updated_at: Date.now() });
        this.save();
        this.notify();

        return task;
    }

    /**
     * Update task status
     */
    updateTaskStatus(task_id: string, status: TaskStatus): boolean {
        const task = this.tasks.get(task_id);
        if (!task) return false;

        const previousStatus = task.status;
        task.status = status;
        task.updated_at = Date.now();

        if (status === 'completed') {
            task.completed_at = Date.now();
        }

        this.save();
        this.notify();

        eventBus.emit({
            type: 'task.status_changed',
            payload: { task_id, previous: previousStatus, current: status },
        } as any);

        return true;
    }

    /**
     * Delete a task
     */
    deleteTask(task_id: string): boolean {
        const deleted = this.tasks.delete(task_id);

        // Also delete associated plan
        for (const [plan_id, plan] of this.plans) {
            if (plan.task_id === task_id) {
                this.plans.delete(plan_id);
            }
        }

        if (deleted) {
            this.save();
            this.notify();

            eventBus.emit({
                type: 'task.deleted',
                payload: { task_id },
            } as any);
        }

        return deleted;
    }

    // -------------------------------------------------------------------------
    // Plan CRUD
    // -------------------------------------------------------------------------

    /**
     * Create a plan for a task
     */
    createPlan(
        task_id: string,
        steps: Omit<PlanStep, 'step_id' | 'status'>[],
        options?: {
            estimated_time_minutes?: number;
            fallback_options?: string[];
        }
    ): Plan | undefined {
        const task = this.tasks.get(task_id);
        if (!task) return undefined;

        // Check for existing plan
        const existingPlan = this.getPlanForTask(task_id);
        const version = existingPlan ? existingPlan.version + 1 : 1;

        // Deactivate old plan if exists
        if (existingPlan) {
            existingPlan.status = 'abandoned';
        }

        const plan: Plan = {
            plan_id: generatePlanId(),
            task_id,
            version,
            steps: steps.map((s, i) => ({
                ...s,
                step_id: generateStepId(),
                order: s.order ?? i + 1,
                status: 'pending' as StepStatus,
            })),
            estimated_time_minutes: options?.estimated_time_minutes,
            fallback_options: options?.fallback_options,
            created_at: Date.now(),
            updated_at: Date.now(),
            status: 'active',
        };

        this.plans.set(plan.plan_id, plan);

        // Update task status
        task.status = 'planned';
        task.updated_at = Date.now();

        this.save();
        this.notify();

        eventBus.emit({
            type: 'plan.created',
            payload: { plan_id: plan.plan_id, task_id, steps: plan.steps.length },
        } as any);

        return plan;
    }

    /**
     * Get plan for a task
     */
    getPlanForTask(task_id: string): Plan | undefined {
        return Array.from(this.plans.values())
            .filter(p => p.task_id === task_id && p.status === 'active')
            .sort((a, b) => b.version - a.version)[0];
    }

    /**
     * Get plan by ID
     */
    getPlan(plan_id: string): Plan | undefined {
        return this.plans.get(plan_id);
    }

    /**
     * Update plan step status
     */
    updateStepStatus(plan_id: string, step_id: string, status: StepStatus): boolean {
        const plan = this.plans.get(plan_id);
        if (!plan) return false;

        const step = plan.steps.find(s => s.step_id === step_id);
        if (!step) return false;

        step.status = status;
        if (status === 'in_progress') {
            step.started_at = Date.now();
        } else if (status === 'done') {
            step.completed_at = Date.now();
        }

        plan.updated_at = Date.now();

        // Update task status if first step started
        if (status === 'in_progress') {
            const task = this.tasks.get(plan.task_id);
            if (task && task.status === 'planned') {
                task.status = 'executing';
                task.updated_at = Date.now();
            }
        }

        // Check if all steps done
        if (plan.steps.every(s => s.status === 'done' || s.status === 'skipped')) {
            plan.status = 'completed';
            const task = this.tasks.get(plan.task_id);
            if (task) {
                task.status = 'completed';
                task.completed_at = Date.now();
                task.updated_at = Date.now();
            }
        }

        this.save();
        this.notify();

        return true;
    }

    // -------------------------------------------------------------------------
    // Query Methods
    // -------------------------------------------------------------------------

    /**
     * Get tasks for a date range
     */
    getTasksInRange(startDate: number, endDate: number): Task[] {
        return this.getAllTasks().filter(t =>
            t.created_at >= startDate && t.created_at <= endDate
        );
    }

    /**
     * Get completed tasks count for this week
     */
    getWeeklyCompletedCount(): number {
        const weekStart = this.getWeekStart();
        return this.getAllTasks().filter(t =>
            t.status === 'completed' && t.completed_at && t.completed_at >= weekStart
        ).length;
    }

    /**
     * Get task statistics
     */
    getStats(): {
        total: number;
        by_status: Record<TaskStatus, number>;
        completed_this_week: number;
        completion_rate: number;
    } {
        const tasks = this.getAllTasks();
        const by_status = tasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {} as Record<TaskStatus, number>);

        const completed = by_status.completed || 0;
        const failed = by_status.failed || 0;
        const total_finished = completed + failed;

        return {
            total: tasks.length,
            by_status,
            completed_this_week: this.getWeeklyCompletedCount(),
            completion_rate: total_finished > 0 ? completed / total_finished : 0,
        };
    }

    // -------------------------------------------------------------------------
    // Persistence
    // -------------------------------------------------------------------------

    private save(): void {
        try {
            const tasksArray = Array.from(this.tasks.values());
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasksArray));

            const plansArray = Array.from(this.plans.values());
            localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plansArray));
        } catch (e) {
            console.error('[TaskService] Save failed:', e);
        }
    }

    private load(): void {
        try {
            const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
            if (tasksJson) {
                const tasksArray: Task[] = JSON.parse(tasksJson);
                this.tasks = new Map(tasksArray.map(t => [t.task_id, t]));
            }

            const plansJson = localStorage.getItem(STORAGE_KEYS.PLANS);
            if (plansJson) {
                const plansArray: Plan[] = JSON.parse(plansJson);
                this.plans = new Map(plansArray.map(p => [p.plan_id, p]));
            }
        } catch (e) {
            console.error('[TaskService] Load failed:', e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private normalizeGoal(goal: string): string {
        return goal.trim().toLowerCase().replace(/[^\w\s]/g, '');
    }

    private getWeekStart(): number {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
    }

    private notify(): void {
        const tasks = this.getAllTasks();
        this.listeners.forEach(fn => fn(tasks));
    }

    /**
     * Subscribe to task changes
     */
    subscribe(listener: (tasks: Task[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Reset all tasks (for testing/privacy)
     */
    reset(): void {
        this.tasks.clear();
        this.plans.clear();
        this.save();
        this.notify();
    }

    /**
     * Export all data
     */
    export(): { tasks: Task[]; plans: Plan[] } {
        return {
            tasks: this.getAllTasks(),
            plans: Array.from(this.plans.values()),
        };
    }

    /**
     * Import data
     */
    import(data: { tasks: Task[]; plans: Plan[] }): void {
        this.tasks = new Map(data.tasks.map(t => [t.task_id, t]));
        this.plans = new Map(data.plans.map(p => [p.plan_id, p]));
        this.save();
        this.notify();
    }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: TaskService | null = null;

export function getTaskService(): TaskService {
    if (!serviceInstance) {
        serviceInstance = new TaskService();
    }
    return serviceInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { TaskService };
export type {
    Task,
    Plan,
    PlanStep,
    TaskStatus,
    TaskCategory,
    TaskConstraints,
} from './taskTypes.js';
