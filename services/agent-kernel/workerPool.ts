import type { TaskStatus } from './contracts.js';
import type { TaskStore } from './store.js';
import type { TaskGraphRuntime } from './runtime.js';

export interface ServiceBackedWorkerCycleError {
    task_id: string;
    message: string;
}

export interface ServiceBackedWorkerCycleResult {
    scanned_task_ids: string[];
    processed_task_ids: string[];
    terminal_task_ids: string[];
    waiting_user_task_ids: string[];
    missing_task_ids: string[];
    errors: ServiceBackedWorkerCycleError[];
}

export interface ServiceBackedWorkerPoolOptions {
    runtime: TaskGraphRuntime;
    store: TaskStore;
    pollIntervalMs?: number;
    maxTasksPerCycle?: number;
    onError?: (error: ServiceBackedWorkerCycleError) => void;
}

const TERMINAL_TASK_STATUSES: ReadonlySet<TaskStatus> = new Set([
    'DONE',
    'FAILED',
    'CANCELLED',
]);

export class ServiceBackedWorkerPool {
    private readonly runtime: TaskGraphRuntime;
    private readonly store: TaskStore;
    private readonly defaultPollIntervalMs: number;
    private readonly defaultMaxTasksPerCycle: number;
    private readonly onError?: ServiceBackedWorkerPoolOptions['onError'];
    private readonly scheduledTasks = new Map<string, {
        due_at: number;
        timer: ReturnType<typeof setTimeout>;
    }>();
    private pollTimer?: ReturnType<typeof setInterval>;

    constructor(options: ServiceBackedWorkerPoolOptions) {
        this.runtime = options.runtime;
        this.store = options.store;
        this.defaultPollIntervalMs = Math.max(25, Number(options.pollIntervalMs || 250));
        this.defaultMaxTasksPerCycle = Math.max(1, Number(options.maxTasksPerCycle || 32));
        this.onError = options.onError;
    }

    async drainOnce(params?: {
        task_ids?: string[];
        max_tasks?: number;
        include_waiting_user?: boolean;
    }): Promise<ServiceBackedWorkerCycleResult> {
        const scannedTaskIds = params?.task_ids?.length
            ? params.task_ids
            : await this.store.listTaskIds();
        const orderedTaskIds = Array.from(new Set(scannedTaskIds))
            .filter((taskId) => Boolean(String(taskId || '').trim()))
            .sort((left, right) => left.localeCompare(right));
        const maxTasks = Math.max(1, Number(params?.max_tasks || this.defaultMaxTasksPerCycle));
        const result: ServiceBackedWorkerCycleResult = {
            scanned_task_ids: orderedTaskIds,
            processed_task_ids: [],
            terminal_task_ids: [],
            waiting_user_task_ids: [],
            missing_task_ids: [],
            errors: [],
        };

        for (const taskId of orderedTaskIds) {
            if (result.processed_task_ids.length >= maxTasks) break;

            const snapshot = await this.store.getTaskSnapshot(taskId);
            if (!snapshot) {
                result.missing_task_ids.push(taskId);
                continue;
            }

            if (TERMINAL_TASK_STATUSES.has(snapshot.task_state.status)) {
                result.terminal_task_ids.push(taskId);
                continue;
            }

            if (!params?.include_waiting_user && snapshot.task_state.status === 'WAITING_USER') {
                result.waiting_user_task_ids.push(taskId);
                continue;
            }

            this.clearScheduledTask(taskId);
            try {
                await this.runtime.runTask(taskId);
                result.processed_task_ids.push(taskId);
            } catch (error) {
                const cycleError = {
                    task_id: taskId,
                    message: error instanceof Error ? error.message : 'worker_cycle_failed',
                };
                result.errors.push(cycleError);
                this.onError?.(cycleError);
            }
        }

        return result;
    }

    scheduleTask(taskId: string, delayMs: number): void {
        const normalizedTaskId = String(taskId || '').trim();
        if (!normalizedTaskId) return;

        const safeDelayMs = Math.max(0, Number(delayMs || 0));
        const dueAt = Date.now() + safeDelayMs;
        const existing = this.scheduledTasks.get(normalizedTaskId);
        if (existing && existing.due_at <= dueAt) return;
        if (existing) clearTimeout(existing.timer);

        const timer = setTimeout(() => {
            this.scheduledTasks.delete(normalizedTaskId);
            void this.runtime.runTask(normalizedTaskId).catch((error) => {
                const cycleError = {
                    task_id: normalizedTaskId,
                    message: error instanceof Error ? error.message : 'scheduled_worker_run_failed',
                };
                this.onError?.(cycleError);
            });
        }, safeDelayMs);

        this.scheduledTasks.set(normalizedTaskId, {
            due_at: dueAt,
            timer,
        });
    }

    start(pollIntervalMs?: number): void {
        if (this.pollTimer) return;
        const intervalMs = Math.max(25, Number(pollIntervalMs || this.defaultPollIntervalMs));
        this.pollTimer = setInterval(() => {
            void this.drainOnce().catch((error) => {
                const cycleError = {
                    task_id: '*',
                    message: error instanceof Error ? error.message : 'worker_poll_failed',
                };
                this.onError?.(cycleError);
            });
        }, intervalMs);
    }

    stop(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }

        for (const scheduled of this.scheduledTasks.values()) {
            clearTimeout(scheduled.timer);
        }
        this.scheduledTasks.clear();
    }

    private clearScheduledTask(taskId: string): void {
        const scheduled = this.scheduledTasks.get(taskId);
        if (!scheduled) return;
        clearTimeout(scheduled.timer);
        this.scheduledTasks.delete(taskId);
    }
}
