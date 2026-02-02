/**
 * LIX Store - Intent state management
 * Manages intents, offers, and observability events
 */

import {
    IntentRequest,
    MarketResponse,
    RankedOffer,
    AcceptToken,
    LIXEvent,
    generateId,
    createTraceContext
} from './lixTypes';
import { lixMarketService } from './marketService';
import { settlementService, AcceptTokenRecord } from './settlementService';
import { proofOfIntentService, ProofOfIntent } from './proofOfIntentService';

// ============================================================================
// Store Types
// ============================================================================

export type IntentStatus = 'draft' | 'broadcasting' | 'offers_received' | 'accepted' | 'expired' | 'cancelled';

export interface StoredIntent {
    intent_id: string;
    category: string;
    item_name: string;
    item_sku?: string;
    budget_max?: number;
    currency: string;
    status: IntentStatus;
    created_at: string;
    expires_at: string;
    offers: RankedOffer[];
    total_offers_received: number;
    best_price?: number;
    accepted_offer_id?: string;
    accept_token?: AcceptToken;
    proof?: ProofOfIntent;
    settlement_token?: AcceptTokenRecord;
    trace_id?: string;  // For observability
}

interface LIXStoreState {
    intents: Map<string, StoredIntent>;
    events: LIXEvent[];
    metrics: {
        total_intents_broadcast: number;
        total_offers_received: number;
        total_accepted: number;
        avg_first_offer_seconds: number;
    };
}

// ============================================================================
// Observability
// ============================================================================

function logEvent(eventType: string, payload: Record<string, unknown>): void {
    const event: LIXEvent = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        trace: createTraceContext(),
        payload
    };

    lixStore.state.events.push(event);
    console.log(`📊 [LIX Event] ${eventType}:`, payload);

    // Keep only last 100 events in memory
    if (lixStore.state.events.length > 100) {
        lixStore.state.events = lixStore.state.events.slice(-100);
    }
}

// ============================================================================
// Store Implementation
// ============================================================================

class LIXStore {
    state: LIXStoreState = {
        intents: new Map(),
        events: [],
        metrics: {
            total_intents_broadcast: 0,
            total_offers_received: 0,
            total_accepted: 0,
            avg_first_offer_seconds: 1.5
        }
    };

    private listeners: Set<() => void> = new Set();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    // ========================================================================
    // Intent Operations
    // ========================================================================

    async broadcastIntent(params: {
        category: 'purchase' | 'job' | 'collaboration';
        item: string;
        budget?: number;
        specs?: Record<string, string>;
    }): Promise<StoredIntent> {
        const startTime = Date.now();
        const intentId = `intent_${generateId()}`;

        // Create stored intent
        const storedIntent: StoredIntent = {
            intent_id: intentId,
            category: params.category,
            item_name: params.item,
            budget_max: params.budget,
            currency: 'CNY',
            status: 'broadcasting',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            offers: [],
            total_offers_received: 0
        };

        this.state.intents.set(intentId, storedIntent);
        this.notify();

        logEvent('intent.created', { intent_id: intentId, category: params.category, item: params.item });
        logEvent('intent.broadcast', { intent_id: intentId });

        // Call market service
        try {
            const response = await lixMarketService.broadcast({
                category: params.category,
                payload: params.item,
                budget: params.budget,
                specs: params.specs
            });

            const firstOfferSeconds = (Date.now() - startTime) / 1000;

            // Update stored intent with offers
            storedIntent.status = response.ranked_offers.length > 0 ? 'offers_received' : 'broadcasting';
            storedIntent.offers = response.ranked_offers;
            storedIntent.total_offers_received = response.total_offers_received;
            storedIntent.best_price = response.ranked_offers[0]?.offer.price.amount;
            storedIntent.item_sku = response.ranked_offers[0]?.offer.item_sku;

            this.state.metrics.total_intents_broadcast++;
            this.state.metrics.total_offers_received += response.total_offers_received;
            this.state.metrics.avg_first_offer_seconds =
                (this.state.metrics.avg_first_offer_seconds * 0.9) + (firstOfferSeconds * 0.1);

            // Log offer events
            response.ranked_offers.forEach((ro, i) => {
                logEvent('offer.received', {
                    intent_id: intentId,
                    offer_id: ro.offer.offer_id,
                    provider: ro.offer.provider.name,
                    rank: i + 1
                });
                logEvent('offer.validated', {
                    intent_id: intentId,
                    offer_id: ro.offer.offer_id,
                    eligible: ro.eligible
                });
                logEvent('offer.ranked', {
                    intent_id: intentId,
                    offer_id: ro.offer.offer_id,
                    rank: ro.rank,
                    score: ro.total_score
                });
            });

            this.notify();
            return storedIntent;

        } catch (error) {
            storedIntent.status = 'expired';
            this.notify();
            throw error;
        }
    }

    async acceptOffer(intentId: string, offerId: string): Promise<AcceptToken> {
        const intent = this.state.intents.get(intentId);
        if (!intent) throw new Error(`Intent ${intentId} not found`);

        const offer = intent.offers.find(o => o.offer.offer_id === offerId);
        if (!offer) throw new Error(`Offer ${offerId} not found`);

        // Create settlement token using settlementService
        const settlementToken = settlementService.createAcceptToken({
            intent_id: intentId,
            offer_id: offerId,
            provider_id: offer.offer.provider.id,
            user_pseudonym: intent.proof?.user_pseudonym || `pub_${generateId().substring(0, 16)}`,
            offer_amount: offer.offer.price.amount,
            currency: offer.offer.price.currency,
            item_name: intent.item_name,
            category: intent.category,
            conversion_callback_url: `/api/lix/conversion/callback/${offer.offer.provider.id}`
        });

        // Generate legacy accept token for backwards compatibility
        const token: AcceptToken = {
            token_id: settlementToken.token_id,
            intent_id: intentId,
            offer_id: offerId,
            provider_id: offer.offer.provider.id,
            publisher_pseudonym: settlementToken.user_pseudonym,
            created_at: settlementToken.created_at.toISOString(),
            expires_at: settlementToken.expires_at.toISOString(),
            callback_url: settlementToken.conversion_callback_url || '',
            signature: `sig_accept_${generateId()}`
        };

        intent.status = 'accepted';
        intent.accepted_offer_id = offerId;
        intent.accept_token = token;
        intent.settlement_token = settlementToken;
        this.state.metrics.total_accepted++;

        logEvent('offer.accepted', {
            intent_id: intentId,
            offer_id: offerId,
            token_id: token.token_id,
            provider: offer.offer.provider.name,
            price: offer.offer.price.amount,
            settlement_status: settlementToken.status
        });

        this.notify();
        return token;
    }

    // ========================================================================
    // Getters
    // ========================================================================

    getIntent(intentId: string): StoredIntent | undefined {
        return this.state.intents.get(intentId);
    }

    getAllIntents(): StoredIntent[] {
        return Array.from(this.state.intents.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    getRecentIntents(limit: number = 5): StoredIntent[] {
        return this.getAllIntents().slice(0, limit);
    }

    getMetrics() {
        return this.state.metrics;
    }

    getEvents(limit: number = 20): LIXEvent[] {
        return this.state.events.slice(-limit);
    }
}

// Singleton instance
export const lixStore = new LIXStore();

// React hook for subscribing to store changes
export function useLIXStore() {
    const [, forceUpdate] = React.useState({});

    React.useEffect(() => {
        return lixStore.subscribe(() => forceUpdate({}));
    }, []);

    return {
        intents: lixStore.getAllIntents(),
        recentIntents: lixStore.getRecentIntents(),
        metrics: lixStore.getMetrics(),
        broadcastIntent: lixStore.broadcastIntent.bind(lixStore),
        acceptOffer: lixStore.acceptOffer.bind(lixStore),
        getIntent: lixStore.getIntent.bind(lixStore)
    };
}

// For non-React imports
import * as React from 'react';
