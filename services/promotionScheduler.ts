/**
 * Promotion Scheduler - 推广任务调度器
 *
 * Manages scheduled promotion tasks with:
 * - Cron-like scheduling
 * - Content type rotation
 * - Subreddit rotation
 * - Cooldown management
 */

import {
    ContentGenerationRequest,
    ContentType,
    SubredditTarget,
    DEFAULT_SUBREDDIT_TARGETS,
    ContentLanguage,
    ContentTone,
    LumiFeature,
} from './promotionTypes.js';

// ============================================================================
// Schedule Configuration
// ============================================================================

export interface ScheduleConfig {
    /** Enable/disable the scheduler */
    enabled: boolean;
    /** Posts per day limit */
    postsPerDay: number;
    /** Preferred posting hours (0-23, UTC) */
    preferredHours: number[];
    /** Content type rotation strategy */
    contentRotation: ContentType[];
    /** Subreddit targets */
    targets: SubredditTarget[];
    /** Default language */
    language: ContentLanguage;
    /** Auto-publish or require human review */
    autoPublish: boolean;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
    enabled: false,  // Disabled by default for safety
    postsPerDay: 2,
    preferredHours: [9, 12, 15, 18, 21],  // UTC hours
    contentRotation: ['tech_review', 'discussion', 'tutorial', 'case_study', 'comparison'],
    targets: DEFAULT_SUBREDDIT_TARGETS,
    language: 'en',
    autoPublish: false,  // Require human review by default
};

// ============================================================================
// Schedule Entry
// ============================================================================

export interface ScheduleEntry {
    id: string;
    /** Scheduled time (epoch ms) */
    scheduledAt: number;
    /** Content generation request */
    request: ContentGenerationRequest;
    /** Whether this entry has been executed */
    executed: boolean;
    /** Linked task ID after execution */
    taskId?: string;
}

// ============================================================================
// Promotion Scheduler
// ============================================================================

export class PromotionScheduler {
    private config: ScheduleConfig;
    private schedule: ScheduleEntry[] = [];
    private contentTypeIndex = 0;
    private subredditIndex = 0;

    constructor(config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
        this.config = config;
    }

    /**
     * Generate a week's worth of scheduled posts
     */
    generateWeeklySchedule(): ScheduleEntry[] {
        if (!this.config.enabled) {
            console.log('[Scheduler] Scheduler is disabled');
            return [];
        }

        const entries: ScheduleEntry[] = [];
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        for (let day = 0; day < 7; day++) {
            const postsToday = Math.min(this.config.postsPerDay, this.config.preferredHours.length);

            for (let i = 0; i < postsToday; i++) {
                const hour = this.config.preferredHours[i % this.config.preferredHours.length];
                const scheduledAt = now + (day * oneDay) + (hour * 60 * 60 * 1000);

                // Rotate content types and subreddits
                const contentType = this.getNextContentType();
                const target = this.getNextSubreddit();
                const topic = this.getTopicForType(contentType);
                const tone = this.getToneForType(contentType);
                const features = this.getFeaturesForType(contentType);

                const entry: ScheduleEntry = {
                    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    scheduledAt,
                    request: {
                        type: contentType,
                        language: target.language || this.config.language,
                        tone,
                        targetSubreddit: target.name,
                        topic,
                        lumiFeatures: features,
                    },
                    executed: false,
                };

                entries.push(entry);
            }
        }

        this.schedule = entries;
        console.log(`[Scheduler] Generated ${entries.length} scheduled entries for the week`);
        return entries;
    }

    /**
     * Get pending entries that should be executed now
     */
    getDueEntries(): ScheduleEntry[] {
        const now = Date.now();
        return this.schedule.filter(
            entry => !entry.executed && entry.scheduledAt <= now
        );
    }

    /**
     * Mark an entry as executed
     */
    markExecuted(entryId: string, taskId: string): void {
        const entry = this.schedule.find(e => e.id === entryId);
        if (entry) {
            entry.executed = true;
            entry.taskId = taskId;
        }
    }

    /**
     * Get schedule overview
     */
    getScheduleOverview(): {
        total: number;
        pending: number;
        executed: number;
        nextUp?: ScheduleEntry;
    } {
        const pending = this.schedule.filter(e => !e.executed);
        return {
            total: this.schedule.length,
            pending: pending.length,
            executed: this.schedule.filter(e => e.executed).length,
            nextUp: pending.sort((a, b) => a.scheduledAt - b.scheduledAt)[0],
        };
    }

    /**
     * Update scheduler configuration
     */
    updateConfig(updates: Partial<ScheduleConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    getConfig(): ScheduleConfig {
        return { ...this.config };
    }

    getSchedule(): ScheduleEntry[] {
        return [...this.schedule];
    }

    // --------------------------------------------------------------------------
    // Rotation Logic
    // --------------------------------------------------------------------------

    private getNextContentType(): ContentType {
        const type = this.config.contentRotation[this.contentTypeIndex % this.config.contentRotation.length];
        this.contentTypeIndex++;
        return type;
    }

    private getNextSubreddit(): SubredditTarget {
        const target = this.config.targets[this.subredditIndex % this.config.targets.length];
        this.subredditIndex++;
        return target;
    }

    private getTopicForType(type: ContentType): string {
        const topics: Record<ContentType, string[]> = {
            tech_review: [
                'AI-powered smart keyboards and their impact on mobile productivity',
                'Intent-driven commerce: how AI agents are changing how we shop',
                'Using Bellman equations for real-life decision simulation',
            ],
            tutorial: [
                'How to use AI agents for price comparison across e-commerce platforms',
                'Setting up a personal AI decision engine for career planning',
                'Integrating AI into your daily typing workflow for smarter decisions',
            ],
            comparison: [
                'AI personal assistants in 2026: comparing approaches to decision support',
                'Smart keyboard apps: from autocomplete to intent-driven agents',
                'Intent commerce vs traditional shopping: which saves more time?',
            ],
            discussion: [
                'The future of Agent-to-Agent communication: will AI agents recommend products to each other?',
                'Privacy vs personalization: can AI keyboards be both?',
                'Should AI help us make life decisions? The ethics of decision engines',
            ],
            comment_reply: [''],
            ama: ['Building an AI-powered Personal Destiny Engine - lessons learned'],
            case_study: [
                'How a smart keyboard helped plan a cross-country career change',
                'Using intent commerce to save 30% on holiday shopping',
                'From overwhelmed to optimized: an AI decision engine case study',
            ],
        };

        const topicList = topics[type] || topics.discussion;
        return topicList[Math.floor(Math.random() * topicList.length)];
    }

    private getToneForType(type: ContentType): ContentTone {
        const toneMap: Record<ContentType, ContentTone> = {
            tech_review: 'analytical',
            tutorial: 'casual',
            comparison: 'analytical',
            discussion: 'enthusiastic',
            comment_reply: 'casual',
            ama: 'enthusiastic',
            case_study: 'professional',
        };
        return toneMap[type] || 'casual';
    }

    private getFeaturesForType(type: ContentType): LumiFeature[] {
        const featureMap: Record<ContentType, LumiFeature[]> = {
            tech_review: ['smart_keyboard', 'destiny_engine', 'multi_agent', 'privacy_first'],
            tutorial: ['smart_keyboard', 'intent_commerce', 'decision_support'],
            comparison: ['smart_keyboard', 'decision_support', 'price_compare'],
            discussion: ['destiny_engine', 'digital_soul', 'multi_agent'],
            comment_reply: ['smart_keyboard', 'decision_support'],
            ama: ['smart_keyboard', 'destiny_engine', 'intent_commerce', 'privacy_first'],
            case_study: ['smart_keyboard', 'decision_support', 'intent_commerce'],
        };
        return featureMap[type] || ['smart_keyboard'];
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const promotionScheduler = new PromotionScheduler();
