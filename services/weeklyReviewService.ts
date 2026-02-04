/**
 * Weekly Review Service - Phase 2 Week 3-2
 * 
 * Generates automated weekly summaries of goal achievement,
 * satisfaction trends, and Soul Matrix changes.
 */

import { getOutcomeService, TaskOutcome, OutcomeSummary } from './outcomeService';
import { getSoulMatrixStore, SoulTrait } from './soulMatrixStore';
import { getTaskService, Task } from './taskService';

// ============================================================================
// Types
// ============================================================================

export interface WeeklyReview {
    id: string;
    week_start: number;
    week_end: number;
    generated_at: number;
    summary: WeeklySummary;
    insights: string[];
    soul_updates: SoulTraitChange[];
    category_breakdown: CategoryBreakdown[];
    comparison?: WeekComparison;  // Optional instead of null
}

export interface WeeklySummary {
    tasks_created: number;
    tasks_completed: number;
    tasks_failed: number;
    completion_rate: number;
    avg_satisfaction: number;
    total_time_minutes: number;
    total_cost: number;
    top_categories: string[];
}

export interface SoulTraitChange {
    trait_key: string;
    old_value?: string;
    new_value: string | number | boolean;  // Match SoulTrait.value type
    confidence_delta: number;
    source: string;
}

export interface CategoryBreakdown {
    category: string;
    count: number;
    success_rate: number;
    avg_satisfaction: number;
}

export interface WeekComparison {
    prev_week_start: number;
    completion_rate_delta: number;
    satisfaction_delta: number;
    tasks_delta: number;
    trend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'lumi_weekly_reviews';
const MAX_REVIEWS = 52; // Keep 1 year of history

// ============================================================================
// Weekly Review Service
// ============================================================================

class WeeklyReviewService {
    private reviews: WeeklyReview[] = [];

    constructor() {
        this.load();
    }

    // ========================================================================
    // Review Generation
    // ========================================================================

    /**
     * Generate weekly review for a specific week
     */
    generateWeeklyReview(weekStart?: Date): WeeklyReview {
        // Calculate week boundaries
        const start = weekStart || this.getMondayOfCurrentWeek();
        const startTime = start.getTime();

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();

        // Gather data
        const outcomes = getOutcomeService().getOutcomesForPeriod(startTime, endTime);
        const outcomeSummary = getOutcomeService().summarize(outcomes);

        // Get tasks created this week
        const allTasks = getTaskService().getAllTasks();
        const weekTasks = allTasks.filter(
            t => t.created_at >= startTime && t.created_at <= endTime
        );

        // Category breakdown
        const categoryBreakdown = this.computeCategoryBreakdown(outcomes, weekTasks);

        // Generate insights
        const insights = this.generateInsights(outcomeSummary, categoryBreakdown);

        // Get Soul Matrix changes (simplified - would need proper change tracking)
        const soulUpdates = this.getSoulTraitChanges(startTime, endTime);

        // Compare with previous week
        const comparison = this.compareWithPreviousWeek(startTime, outcomeSummary);

        const review: WeeklyReview = {
            id: `review_${startTime}`,
            week_start: startTime,
            week_end: endTime,
            generated_at: Date.now(),
            summary: {
                tasks_created: weekTasks.length,
                tasks_completed: outcomeSummary.successful + outcomeSummary.partial,
                tasks_failed: outcomeSummary.failed,
                completion_rate: getOutcomeService().getCompletionRate(outcomes),
                avg_satisfaction: outcomeSummary.avg_satisfaction,
                total_time_minutes: outcomeSummary.total_time_minutes,
                total_cost: outcomeSummary.total_cost,
                top_categories: categoryBreakdown.slice(0, 3).map(c => c.category),
            },
            insights,
            soul_updates: soulUpdates,
            category_breakdown: categoryBreakdown,
            comparison,
        };

        // Store the review
        this.saveReview(review);

        console.log('[WeeklyReviewService] Generated review for week:',
            new Date(startTime).toLocaleDateString());

        return review;
    }

    /**
     * Get review for a specific week
     */
    getReview(weekStart: number): WeeklyReview | null {
        return this.reviews.find(r => r.week_start === weekStart) || null;
    }

    /**
     * Get review history
     */
    getReviewHistory(count: number = 4): WeeklyReview[] {
        return this.reviews
            .sort((a, b) => b.week_start - a.week_start)
            .slice(0, count);
    }

    /**
     * Get current week review (generate if not exists)
     */
    getCurrentWeekReview(): WeeklyReview {
        const monday = this.getMondayOfCurrentWeek();
        const existing = this.getReview(monday.getTime());

        if (existing && Date.now() - existing.generated_at < 3600000) {
            // Return cached if less than 1 hour old
            return existing;
        }

        return this.generateWeeklyReview(monday);
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private getMondayOfCurrentWeek(): Date {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        return monday;
    }

    private computeCategoryBreakdown(
        outcomes: TaskOutcome[],
        tasks: Task[]
    ): CategoryBreakdown[] {
        const categoryMap = new Map<string, {
            total: number;
            successful: number;
            satisfactionSum: number;
        }>();

        // Group outcomes by task category
        for (const outcome of outcomes) {
            const task = tasks.find(t => t.task_id === outcome.task_id);
            const category = task?.category || '其他';

            if (!categoryMap.has(category)) {
                categoryMap.set(category, { total: 0, successful: 0, satisfactionSum: 0 });
            }

            const cat = categoryMap.get(category)!;
            cat.total++;
            cat.satisfactionSum += outcome.satisfaction;
            if (outcome.status === 'success' || outcome.status === 'partial') {
                cat.successful++;
            }
        }

        return Array.from(categoryMap.entries())
            .map(([category, data]) => ({
                category,
                count: data.total,
                success_rate: data.total > 0
                    ? Math.round((data.successful / data.total) * 100)
                    : 0,
                avg_satisfaction: data.total > 0
                    ? Math.round((data.satisfactionSum / data.total) * 10) / 10
                    : 0,
            }))
            .sort((a, b) => b.count - a.count);
    }

    private generateInsights(
        summary: OutcomeSummary,
        categories: CategoryBreakdown[]
    ): string[] {
        const insights: string[] = [];

        // Completion rate insight
        const completionRate = summary.total > 0
            ? ((summary.successful + summary.partial) / summary.total) * 100
            : 0;

        if (completionRate >= 80) {
            insights.push('🎉 本周完成率优秀 (' + Math.round(completionRate) + '%)，保持！');
        } else if (completionRate >= 50) {
            insights.push('📈 本周完成率 ' + Math.round(completionRate) + '%，有提升空间');
        } else if (summary.total > 0) {
            insights.push('⚠️ 本周完成率较低 (' + Math.round(completionRate) + '%)，建议减少任务数量');
        }

        // Satisfaction trend
        if (summary.avg_satisfaction >= 4) {
            insights.push('😊 整体满意度高 (' + summary.avg_satisfaction + '/5)');
        } else if (summary.avg_satisfaction >= 3) {
            insights.push('🤔 满意度中等 (' + summary.avg_satisfaction + '/5)，可优化执行方式');
        } else if (summary.total > 0) {
            insights.push('😔 满意度偏低 (' + summary.avg_satisfaction + '/5)，建议复盘任务类型');
        }

        // Top category insight
        if (categories.length > 0) {
            const topCat = categories[0];
            insights.push(`📊 最活跃类别: ${topCat.category} (${topCat.count}个任务)`);
        }

        // Time efficiency
        if (summary.total_time_minutes > 0) {
            const avgTime = Math.round(summary.total_time_minutes / summary.total);
            insights.push(`⏱️ 平均任务时长: ${avgTime} 分钟`);
        }

        return insights;
    }

    private getSoulTraitChanges(
        _startTime: number,
        _endTime: number
    ): SoulTraitChange[] {
        // Simplified: In production, would track actual changes
        // For now, return recent confirmed traits as "new"
        const store = getSoulMatrixStore();
        const recentTraits = store.getConfirmedTraits()
            .slice(0, 3)
            .map(trait => ({
                trait_key: trait.key,
                new_value: trait.value,
                confidence_delta: 0.1,
                source: 'weekly_inference',
            }));

        return recentTraits;
    }

    private compareWithPreviousWeek(
        currentWeekStart: number,
        currentSummary: OutcomeSummary
    ): WeekComparison | undefined {
        const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;
        const prevReview = this.getReview(prevWeekStart);

        if (!prevReview) return undefined;

        const currentRate = currentSummary.total > 0
            ? ((currentSummary.successful + currentSummary.partial) / currentSummary.total) * 100
            : 0;

        const prevRate = prevReview.summary.completion_rate;
        const rateDelta = currentRate - prevRate;
        const satisfactionDelta = currentSummary.avg_satisfaction - prevReview.summary.avg_satisfaction;
        const tasksDelta = currentSummary.total - (prevReview.summary.tasks_completed + prevReview.summary.tasks_failed);

        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (rateDelta > 5 && satisfactionDelta >= 0) {
            trend = 'improving';
        } else if (rateDelta < -5 || satisfactionDelta < -0.5) {
            trend = 'declining';
        }

        return {
            prev_week_start: prevWeekStart,
            completion_rate_delta: Math.round(rateDelta),
            satisfaction_delta: Math.round(satisfactionDelta * 10) / 10,
            tasks_delta: tasksDelta,
            trend,
        };
    }

    // ========================================================================
    // Persistence
    // ========================================================================

    private saveReview(review: WeeklyReview): void {
        const existingIndex = this.reviews.findIndex(r => r.week_start === review.week_start);

        if (existingIndex >= 0) {
            this.reviews[existingIndex] = review;
        } else {
            this.reviews.push(review);
        }

        // Trim old reviews
        if (this.reviews.length > MAX_REVIEWS) {
            this.reviews = this.reviews
                .sort((a, b) => b.week_start - a.week_start)
                .slice(0, MAX_REVIEWS);
        }

        this.save();
    }

    private load(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.reviews = JSON.parse(stored);
                console.log('[WeeklyReviewService] Loaded', this.reviews.length, 'reviews');
            }
        } catch (error) {
            console.error('[WeeklyReviewService] Load failed:', error);
            this.reviews = [];
        }
    }

    private save(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reviews));
        } catch (error) {
            console.error('[WeeklyReviewService] Save failed:', error);
        }
    }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: WeeklyReviewService | null = null;

export function getWeeklyReviewService(): WeeklyReviewService {
    if (!serviceInstance) {
        serviceInstance = new WeeklyReviewService();
    }
    return serviceInstance;
}

export { WeeklyReviewService };
