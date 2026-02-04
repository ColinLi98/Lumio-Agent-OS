/**
 * Outcome Service - Phase 2 Week 3-1
 * 
 * Logs task outcomes (success/partial/failed) with satisfaction scores
 * to feed back into Soul Matrix refinement.
 */

// ============================================================================
// Types
// ============================================================================

export type OutcomeStatus = 'success' | 'partial' | 'failed' | 'cancelled';
export type SatisfactionScore = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 'high' | 'medium' | 'low';

export interface TaskOutcome {
    id: string;
    task_id: string;
    status: OutcomeStatus;
    satisfaction: SatisfactionScore;
    notes?: string;
    logged_at: number;
    metrics?: OutcomeMetrics;
}

export interface OutcomeMetrics {
    time_spent_minutes?: number;
    cost_incurred?: number;
    energy_level?: EnergyLevel;
}

export interface OutcomeLogRequest {
    task_id: string;
    status: OutcomeStatus;
    satisfaction: SatisfactionScore;
    notes?: string;
    metrics?: OutcomeMetrics;
}

export interface OutcomeSummary {
    total: number;
    successful: number;
    partial: number;
    failed: number;
    cancelled: number;
    avg_satisfaction: number;
    total_time_minutes: number;
    total_cost: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'lumi_task_outcomes';
const MAX_OUTCOMES = 500;

// ============================================================================
// Outcome Service
// ============================================================================

class OutcomeService {
    private outcomes: TaskOutcome[] = [];
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.load();
    }

    // ========================================================================
    // Core CRUD
    // ========================================================================

    /**
     * Log a task outcome
     */
    logOutcome(request: OutcomeLogRequest): TaskOutcome {
        const outcome: TaskOutcome = {
            id: `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            task_id: request.task_id,
            status: request.status,
            satisfaction: request.satisfaction,
            notes: request.notes,
            logged_at: Date.now(),
            metrics: request.metrics,
        };

        this.outcomes.push(outcome);

        // Trim old outcomes if exceeds max
        if (this.outcomes.length > MAX_OUTCOMES) {
            this.outcomes = this.outcomes.slice(-MAX_OUTCOMES);
        }

        this.save();
        this.notify();

        console.log('[OutcomeService] Logged outcome:', outcome.id, outcome.status);
        return outcome;
    }

    /**
     * Get outcome for a specific task
     */
    getTaskOutcome(taskId: string): TaskOutcome | null {
        return this.outcomes.find(o => o.task_id === taskId) || null;
    }

    /**
     * Get all outcomes for a date range
     */
    getOutcomesForPeriod(startDate: number, endDate: number): TaskOutcome[] {
        return this.outcomes.filter(
            o => o.logged_at >= startDate && o.logged_at <= endDate
        );
    }

    /**
     * Get outcomes for the current week (Monday to Sunday)
     */
    getCurrentWeekOutcomes(): TaskOutcome[] {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return this.getOutcomesForPeriod(weekStart.getTime(), weekEnd.getTime());
    }

    /**
     * Get all outcomes
     */
    getAll(): TaskOutcome[] {
        return [...this.outcomes];
    }

    // ========================================================================
    // Analytics
    // ========================================================================

    /**
     * Generate summary for a set of outcomes
     */
    summarize(outcomes: TaskOutcome[]): OutcomeSummary {
        const successful = outcomes.filter(o => o.status === 'success').length;
        const partial = outcomes.filter(o => o.status === 'partial').length;
        const failed = outcomes.filter(o => o.status === 'failed').length;
        const cancelled = outcomes.filter(o => o.status === 'cancelled').length;

        const avgSatisfaction = outcomes.length > 0
            ? outcomes.reduce((sum, o) => sum + o.satisfaction, 0) / outcomes.length
            : 0;

        const totalTime = outcomes.reduce(
            (sum, o) => sum + (o.metrics?.time_spent_minutes || 0),
            0
        );

        const totalCost = outcomes.reduce(
            (sum, o) => sum + (o.metrics?.cost_incurred || 0),
            0
        );

        return {
            total: outcomes.length,
            successful,
            partial,
            failed,
            cancelled,
            avg_satisfaction: Math.round(avgSatisfaction * 10) / 10,
            total_time_minutes: totalTime,
            total_cost: totalCost,
        };
    }

    /**
     * Get completion rate (success + partial / total non-cancelled)
     */
    getCompletionRate(outcomes: TaskOutcome[]): number {
        const nonCancelled = outcomes.filter(o => o.status !== 'cancelled');
        if (nonCancelled.length === 0) return 0;

        const completed = nonCancelled.filter(
            o => o.status === 'success' || o.status === 'partial'
        ).length;

        return Math.round((completed / nonCancelled.length) * 100);
    }

    // ========================================================================
    // Update & Delete
    // ========================================================================

    /**
     * Update an existing outcome
     */
    updateOutcome(
        outcomeId: string,
        updates: Partial<Omit<TaskOutcome, 'id' | 'task_id' | 'logged_at'>>
    ): TaskOutcome | null {
        const index = this.outcomes.findIndex(o => o.id === outcomeId);
        if (index === -1) return null;

        this.outcomes[index] = {
            ...this.outcomes[index],
            ...updates,
        };

        this.save();
        this.notify();
        return this.outcomes[index];
    }

    /**
     * Delete an outcome
     */
    deleteOutcome(outcomeId: string): boolean {
        const index = this.outcomes.findIndex(o => o.id === outcomeId);
        if (index === -1) return false;

        this.outcomes.splice(index, 1);
        this.save();
        this.notify();
        return true;
    }

    // ========================================================================
    // Persistence
    // ========================================================================

    private load(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.outcomes = JSON.parse(stored);
                console.log('[OutcomeService] Loaded', this.outcomes.length, 'outcomes');
            }
        } catch (error) {
            console.error('[OutcomeService] Load failed:', error);
            this.outcomes = [];
        }
    }

    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.outcomes));
        } catch (error) {
            console.error('[OutcomeService] Save failed:', error);
        }
    }

    // ========================================================================
    // Subscriptions
    // ========================================================================

    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notify(): void {
        this.listeners.forEach(cb => cb());
    }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: OutcomeService | null = null;

export function getOutcomeService(): OutcomeService {
    if (!serviceInstance) {
        serviceInstance = new OutcomeService();
    }
    return serviceInstance;
}

export { OutcomeService };
