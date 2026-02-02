/**
 * Reputation Service - Provider reputation management
 * 
 * Features:
 * - Base score tracking
 * - Penalty ledger with event history
 * - Suspension management
 * - Score decay over time
 */

// ============================================================================
// Types
// ============================================================================

export type ReputationEventType =
    | 'offer_accepted'
    | 'offer_rejected'
    | 'conversion_success'
    | 'conversion_fail'
    | 'dispute_won'
    | 'dispute_lost'
    | 'fraud_detected'
    | 'late_delivery'
    | 'early_delivery'
    | 'quality_complaint'
    | 'positive_review';

export interface ReputationEvent {
    id: string;
    type: ReputationEventType;
    delta: number;          // Score change (+/-)
    timestamp: Date;
    intent_id?: string;
    offer_id?: string;
    description?: string;
}

export interface ProviderReputation {
    provider_id: string;
    provider_name: string;
    base_score: number;         // 0-100
    penalty_points: number;     // Accumulated penalties
    bonus_points: number;       // Accumulated bonuses
    effective_score: number;    // Computed: base + bonus - penalty
    suspension_until?: Date;
    suspension_reason?: string;
    total_offers: number;
    accepted_offers: number;
    conversion_rate: number;    // accepted/total
    history: ReputationEvent[];
    created_at: Date;
    updated_at: Date;
}

export interface ReputationConfig {
    /** Score below which provider is suspended */
    suspension_threshold: number;
    /** Days of suspension per fraud event */
    fraud_suspension_days: number;
    /** Maximum penalty points before permanent ban */
    max_penalty_points: number;
    /** Decay rate per day for penalty points */
    daily_penalty_decay: number;
}

// ============================================================================
// Event Deltas Configuration
// ============================================================================

const EVENT_DELTAS: Record<ReputationEventType, number> = {
    offer_accepted: 2,
    offer_rejected: -1,
    conversion_success: 5,
    conversion_fail: -10,
    dispute_won: 3,
    dispute_lost: -15,
    fraud_detected: -50,
    late_delivery: -5,
    early_delivery: 2,
    quality_complaint: -8,
    positive_review: 4,
};

const DEFAULT_CONFIG: ReputationConfig = {
    suspension_threshold: 30,
    fraud_suspension_days: 30,
    max_penalty_points: 100,
    daily_penalty_decay: 0.5,
};

// ============================================================================
// In-Memory Store (would be database in production)
// ============================================================================

const reputationStore = new Map<string, ProviderReputation>();

// Initialize with some mock providers
const initializeMockProviders = () => {
    const mockProviders: Partial<ProviderReputation>[] = [
        { provider_id: 'jd_official', provider_name: '京东自营', base_score: 95, penalty_points: 0, bonus_points: 20 },
        { provider_id: 'taobao_tmall', provider_name: '天猫官方', base_score: 92, penalty_points: 0, bonus_points: 15 },
        { provider_id: 'pdd_official', provider_name: '拼多多直营', base_score: 88, penalty_points: 5, bonus_points: 10 },
        { provider_id: 'suning', provider_name: '苏宁易购', base_score: 90, penalty_points: 3, bonus_points: 12 },
        { provider_id: 'xiaomi_store', provider_name: '小米商城', base_score: 94, penalty_points: 0, bonus_points: 18 },
        { provider_id: 'apple_store', provider_name: 'Apple Store', base_score: 98, penalty_points: 0, bonus_points: 25 },
        { provider_id: 'user_c2c_001', provider_name: '个人卖家A', base_score: 75, penalty_points: 8, bonus_points: 5 },
        { provider_id: 'user_c2c_002', provider_name: '个人卖家B', base_score: 70, penalty_points: 15, bonus_points: 3 },
        {
            provider_id: 'suspended_seller', provider_name: '问题商家', base_score: 40, penalty_points: 60, bonus_points: 0,
            suspension_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), suspension_reason: 'fraud_detected'
        },
    ];

    mockProviders.forEach(mp => {
        const reputation: ProviderReputation = {
            provider_id: mp.provider_id!,
            provider_name: mp.provider_name!,
            base_score: mp.base_score!,
            penalty_points: mp.penalty_points!,
            bonus_points: mp.bonus_points!,
            effective_score: Math.max(0, Math.min(100, mp.base_score! + mp.bonus_points! - mp.penalty_points!)),
            suspension_until: mp.suspension_until,
            suspension_reason: mp.suspension_reason,
            total_offers: Math.floor(Math.random() * 500) + 50,
            accepted_offers: 0,
            conversion_rate: 0,
            history: [],
            created_at: new Date(),
            updated_at: new Date()
        };
        reputation.accepted_offers = Math.floor(reputation.total_offers * (0.3 + Math.random() * 0.5));
        reputation.conversion_rate = reputation.accepted_offers / reputation.total_offers;
        reputationStore.set(reputation.provider_id, reputation);
    });
};

// Initialize on module load
initializeMockProviders();

// ============================================================================
// Helper Functions
// ============================================================================

function generateEventId(): string {
    return `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function calculateEffectiveScore(reputation: ProviderReputation): number {
    const raw = reputation.base_score + reputation.bonus_points - reputation.penalty_points;
    return Math.max(0, Math.min(100, raw));
}

function shouldSuspend(reputation: ProviderReputation, config: ReputationConfig): boolean {
    return reputation.effective_score < config.suspension_threshold ||
        reputation.penalty_points >= config.max_penalty_points;
}

// ============================================================================
// Main Service
// ============================================================================

export const reputationService = {
    config: { ...DEFAULT_CONFIG },

    /**
     * Get provider reputation
     */
    getProviderReputation(provider_id: string): ProviderReputation | undefined {
        return reputationStore.get(provider_id);
    },

    /**
     * Get effective score for a provider
     */
    getProviderScore(provider_id: string): number {
        const rep = reputationStore.get(provider_id);
        if (!rep) return 50; // Default score for unknown providers
        return rep.effective_score;
    },

    /**
     * Check if provider is currently suspended
     */
    isProviderSuspended(provider_id: string): boolean {
        const rep = reputationStore.get(provider_id);
        if (!rep) return false;
        if (!rep.suspension_until) return false;
        return new Date() < rep.suspension_until;
    },

    /**
     * Get all suspended providers
     */
    getSuspendedProviders(): ProviderReputation[] {
        const now = new Date();
        return Array.from(reputationStore.values())
            .filter(rep => rep.suspension_until && rep.suspension_until > now);
    },

    /**
     * Apply reputation event to a provider
     */
    applyEvent(
        provider_id: string,
        eventType: ReputationEventType,
        metadata?: { intent_id?: string; offer_id?: string; description?: string }
    ): ReputationEvent | null {
        let rep = reputationStore.get(provider_id);

        // Create new reputation record if doesn't exist
        if (!rep) {
            rep = {
                provider_id,
                provider_name: `Provider ${provider_id}`,
                base_score: 70,
                penalty_points: 0,
                bonus_points: 0,
                effective_score: 70,
                total_offers: 0,
                accepted_offers: 0,
                conversion_rate: 0,
                history: [],
                created_at: new Date(),
                updated_at: new Date()
            };
            reputationStore.set(provider_id, rep);
        }

        const delta = EVENT_DELTAS[eventType];
        const event: ReputationEvent = {
            id: generateEventId(),
            type: eventType,
            delta,
            timestamp: new Date(),
            intent_id: metadata?.intent_id,
            offer_id: metadata?.offer_id,
            description: metadata?.description
        };

        // Apply delta
        if (delta > 0) {
            rep.bonus_points += delta;
        } else {
            rep.penalty_points += Math.abs(delta);
        }

        // Update stats
        if (eventType === 'offer_accepted' || eventType === 'conversion_success') {
            rep.accepted_offers++;
        }
        rep.total_offers++;
        rep.conversion_rate = rep.total_offers > 0 ? rep.accepted_offers / rep.total_offers : 0;

        // Recalculate effective score
        rep.effective_score = calculateEffectiveScore(rep);

        // Check for suspension
        if (eventType === 'fraud_detected') {
            rep.suspension_until = new Date(Date.now() + this.config.fraud_suspension_days * 24 * 60 * 60 * 1000);
            rep.suspension_reason = 'fraud_detected';
        } else if (shouldSuspend(rep, this.config)) {
            rep.suspension_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 day default
            rep.suspension_reason = 'low_score';
        }

        // Add to history (keep last 100 events)
        rep.history.unshift(event);
        if (rep.history.length > 100) {
            rep.history.pop();
        }

        rep.updated_at = new Date();
        reputationStore.set(provider_id, rep);

        console.log(`[ReputationService] Applied ${eventType} (${delta > 0 ? '+' : ''}${delta}) to ${provider_id}. New score: ${rep.effective_score}`);

        return event;
    },

    /**
     * Lift suspension manually (admin action)
     */
    liftSuspension(provider_id: string): boolean {
        const rep = reputationStore.get(provider_id);
        if (!rep) return false;

        rep.suspension_until = undefined;
        rep.suspension_reason = undefined;
        rep.updated_at = new Date();
        reputationStore.set(provider_id, rep);

        console.log(`[ReputationService] Suspension lifted for ${provider_id}`);
        return true;
    },

    /**
     * Apply daily decay to penalty points (would be run by cron job)
     */
    applyDailyDecay(): number {
        let updated = 0;
        const decay = this.config.daily_penalty_decay;

        reputationStore.forEach((rep, id) => {
            if (rep.penalty_points > 0) {
                rep.penalty_points = Math.max(0, rep.penalty_points - decay);
                rep.effective_score = calculateEffectiveScore(rep);
                rep.updated_at = new Date();
                reputationStore.set(id, rep);
                updated++;
            }
        });

        console.log(`[ReputationService] Daily decay applied to ${updated} providers`);
        return updated;
    },

    /**
     * Get top providers by effective score
     */
    getTopProviders(limit: number = 10): ProviderReputation[] {
        return Array.from(reputationStore.values())
            .filter(rep => !this.isProviderSuspended(rep.provider_id))
            .sort((a, b) => b.effective_score - a.effective_score)
            .slice(0, limit);
    },

    /**
     * Get provider reputation summary for UI display
     */
    getProviderSummary(provider_id: string): {
        score: number;
        tier: 'gold' | 'silver' | 'bronze' | 'basic' | 'warning';
        suspended: boolean;
        conversion_rate: number;
    } {
        const rep = reputationStore.get(provider_id);

        if (!rep) {
            return { score: 50, tier: 'basic', suspended: false, conversion_rate: 0 };
        }

        let tier: 'gold' | 'silver' | 'bronze' | 'basic' | 'warning';
        if (rep.effective_score >= 90) tier = 'gold';
        else if (rep.effective_score >= 75) tier = 'silver';
        else if (rep.effective_score >= 60) tier = 'bronze';
        else if (rep.effective_score >= 40) tier = 'basic';
        else tier = 'warning';

        return {
            score: rep.effective_score,
            tier,
            suspended: this.isProviderSuspended(provider_id),
            conversion_rate: rep.conversion_rate
        };
    }
};

export default reputationService;
