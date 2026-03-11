/**
 * LIX Event Bus
 * L.I.X. v0.2 P1-2: Structured Event Emission
 * 
 * In-memory event queue with listener support.
 * Canonical event names as specified in v0.2.
 * 
 * All events include: trace_id, intent_id, timestamp
 * Validator events include: final_action, reason
 */

// ============================================================================
// Event Types
// ============================================================================

export type LixEventType =
    // Intent lifecycle
    | 'intent.created'
    | 'intent.broadcast'
    | 'intent.vertical_detected'     // NEW: Vertical classification
    // Offer lifecycle
    | 'offer.received'
    | 'offer.validated'
    | 'offer.ranked'
    | 'offer.accepted'
    | 'offer.rejected.semantic_mismatch'  // NEW: Semantic consistency failure
    // Provider lifecycle
    | 'provider.fanout.filtered'      // NEW: Provider filtering by vertical
    | 'provider.router.filtered'
    | 'provider.search.start'
    | 'provider.search.end'
    | 'provider.detail.start'
    | 'provider.detail.end'
    | 'provider.fetch.start'
    | 'provider.parse_failed'
    | 'provider.ban_detected'
    | 'provider.circuit_open'
    | 'provider.request.success'
    | 'provider.request.failed'
    // Conversion lifecycle
    | 'conversion.callback'
    | 'conversion.timeout'
    | 'conversion.dispute'
    // Security events
    | 'security.malicious_url'
    | 'security.price_fraud'
    | 'security.rate_limit'
    | 'security.nonce_replay'
    | 'security.invalid_signature'
    | 'security.proof_expired';

export interface LixEventBase {
    event_type: LixEventType;
    trace_id: string;
    timestamp: number;
    intent_id?: string;
    offer_id?: string;
    provider_id?: string;
    token_id?: string;
}

export interface IntentCreatedEvent extends LixEventBase {
    event_type: 'intent.created';
    category: string;
    user_pseudonym: string;
}

export interface IntentBroadcastEvent extends LixEventBase {
    event_type: 'intent.broadcast';
    category: string;
    offers_count: number;
    latency_ms: number;
}

export interface OfferReceivedEvent extends LixEventBase {
    event_type: 'offer.received';
    provider_type: string;
    price_amount: number;
    currency: string;
}

export interface OfferValidatedEvent extends LixEventBase {
    event_type: 'offer.validated';
    stage: string;
    final_action: 'PASS' | 'WARN' | 'BLOCK';
    reason?: string;
    latency_ms: number;
}

export interface OfferRankedEvent extends LixEventBase {
    event_type: 'offer.ranked';
    rank: number;
    total_score: number;
    eligible: boolean;
}

export interface OfferAcceptedEvent extends LixEventBase {
    event_type: 'offer.accepted';
    token_id: string;
    offer_amount: number;
    currency: string;
}

export interface ProviderLifecycleEvent extends LixEventBase {
    event_type:
        | 'provider.fanout.filtered'
        | 'provider.router.filtered'
        | 'provider.search.start'
        | 'provider.search.end'
        | 'provider.detail.start'
        | 'provider.detail.end'
        | 'provider.fetch.start'
        | 'provider.parse_failed'
        | 'provider.ban_detected'
        | 'provider.circuit_open'
        | 'provider.request.success'
        | 'provider.request.failed';
    [key: string]: unknown;
}

export interface ConversionCallbackEvent extends LixEventBase {
    event_type: 'conversion.callback';
    invoice_id: string;
    fee_amount: number;
    conversion_value?: number;
    idempotent: boolean;
}

export interface ConversionTimeoutEvent extends LixEventBase {
    event_type: 'conversion.timeout';
    invoice_id: string;
    fee_amount: number;
    age_days: number;
}

export interface ConversionDisputeEvent extends LixEventBase {
    event_type: 'conversion.dispute';
    dispute_id: string;
    reason: string;
}

export interface SecurityMaliciousUrlEvent extends LixEventBase {
    event_type: 'security.malicious_url';
    url: string;
    blocklist_hit?: string;
}

export interface SecurityPriceFraudEvent extends LixEventBase {
    event_type: 'security.price_fraud';
    claimed_price: number;
    actual_price: number;
    drift_percent: number;
    final_action: 'WARN' | 'BLOCK';
}

export interface SecurityRateLimitEvent extends LixEventBase {
    event_type: 'security.rate_limit';
    limit_type: string;
    limit_value: number;
}

export interface SecurityNonceReplayEvent extends LixEventBase {
    event_type: 'security.nonce_replay';
    nonce_prefix: string;
    user_pseudonym: string;
}

export interface SecurityInvalidSignatureEvent extends LixEventBase {
    event_type: 'security.invalid_signature';
    user_pseudonym: string;
}

export interface SecurityProofExpiredEvent extends LixEventBase {
    event_type: 'security.proof_expired';
    age_seconds: number;
    validity_window_sec: number;
}

export type LixEvent =
    | IntentCreatedEvent
    | IntentBroadcastEvent
    | OfferReceivedEvent
    | OfferValidatedEvent
    | OfferRankedEvent
    | OfferAcceptedEvent
    | ProviderLifecycleEvent
    | ConversionCallbackEvent
    | ConversionTimeoutEvent
    | ConversionDisputeEvent
    | SecurityMaliciousUrlEvent
    | SecurityPriceFraudEvent
    | SecurityRateLimitEvent
    | SecurityNonceReplayEvent
    | SecurityInvalidSignatureEvent
    | SecurityProofExpiredEvent;

export interface LumiEvent {
    type: string;
    payload?: Record<string, unknown>;
    timestamp?: number;
    trace_id?: string;
    intent_id?: string;
    offer_id?: string;
    provider_id?: string;
    token_id?: string;
}

// ============================================================================
// Event Listener Type
// ============================================================================

export type LixEventListener = (event: LixEvent) => void | Promise<void>;
export type EventFilter = LixEventType | LixEventType[] | '*';

// ============================================================================
// Event Bus Implementation
// ============================================================================

class LixEventBus {
    private listeners: Map<string, Set<LixEventListener>> = new Map();
    private eventQueue: LixEvent[] = [];
    private maxQueueSize = 10000;
    private eventCounts: Map<LixEventType, number> = new Map();

    /**
     * Subscribe to events
     * @param filter Event type, array of types, or '*' for all
     * @param listener Callback function
     * @returns Unsubscribe function
     */
    subscribe(filter: EventFilter, listener: LixEventListener): () => void {
        const filters = filter === '*' ? ['*'] : Array.isArray(filter) ? filter : [filter];

        for (const f of filters) {
            if (!this.listeners.has(f)) {
                this.listeners.set(f, new Set());
            }
            this.listeners.get(f)!.add(listener);
        }

        // Return unsubscribe function
        return () => {
            for (const f of filters) {
                this.listeners.get(f)?.delete(listener);
            }
        };
    }

    /**
     * Emit an event
     */
    emit(event: LixEvent): void {
        // Add timestamp if not present
        if (!event.timestamp) {
            event.timestamp = Date.now();
        }

        // Store in queue
        this.eventQueue.push(event);
        if (this.eventQueue.length > this.maxQueueSize) {
            this.eventQueue.shift(); // Remove oldest
        }

        // Update counts
        const count = this.eventCounts.get(event.event_type) || 0;
        this.eventCounts.set(event.event_type, count + 1);

        // Log structured event
        console.log(`[event.${event.event_type}]`, JSON.stringify({
            trace_id: event.trace_id,
            intent_id: event.intent_id,
            offer_id: event.offer_id,
            provider_id: event.provider_id,
            token_id: event.token_id,
            ...this.getEventSpecificFields(event)
        }));

        // Notify listeners
        this.notifyListeners(event);
    }

    private getEventSpecificFields(event: LixEvent): Record<string, unknown> {
        const base = { ...event };
        delete (base as Record<string, unknown>).event_type;
        delete (base as Record<string, unknown>).trace_id;
        delete (base as Record<string, unknown>).timestamp;
        delete (base as Record<string, unknown>).intent_id;
        delete (base as Record<string, unknown>).offer_id;
        delete (base as Record<string, unknown>).provider_id;
        delete (base as Record<string, unknown>).token_id;
        return base;
    }

    private notifyListeners(event: LixEvent): void {
        // Notify specific listeners
        const typeListeners = this.listeners.get(event.event_type);
        if (typeListeners) {
            for (const listener of typeListeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`[eventbus.listener_error] type=${event.event_type}`, error);
                }
            }
        }

        // Notify wildcard listeners
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            for (const listener of wildcardListeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`[eventbus.listener_error] type=* event=${event.event_type}`, error);
                }
            }
        }
    }

    /**
     * Get recent events (for debugging/metrics)
     */
    getRecentEvents(limit: number = 100, filter?: EventFilter): LixEvent[] {
        let events = this.eventQueue;

        if (filter && filter !== '*') {
            const types = Array.isArray(filter) ? filter : [filter];
            events = events.filter(e => types.includes(e.event_type));
        }

        return events.slice(-limit);
    }

    /**
     * Get event counts by type
     */
    getEventCounts(): Record<LixEventType, number> {
        return Object.fromEntries(this.eventCounts.entries()) as Record<LixEventType, number>;
    }

    /**
     * Get queue statistics
     */
    getStats(): {
        queue_size: number;
        listener_count: number;
        event_types_seen: number;
        total_events: number;
    } {
        let listenerCount = 0;
        this.listeners.forEach(set => listenerCount += set.size);

        return {
            queue_size: this.eventQueue.length,
            listener_count: listenerCount,
            event_types_seen: this.eventCounts.size,
            total_events: Array.from(this.eventCounts.values()).reduce((a, b) => a + b, 0)
        };
    }

    /**
     * Clear all events (for testing)
     */
    clear(): void {
        this.eventQueue = [];
        this.eventCounts.clear();
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const eventBus = new LixEventBus();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Emit an intent created event
 */
export function emitIntentCreated(
    trace_id: string,
    intent_id: string,
    category: string,
    user_pseudonym: string
): void {
    eventBus.emit({
        event_type: 'intent.created',
        trace_id,
        intent_id,
        timestamp: Date.now(),
        category,
        user_pseudonym
    });
}

/**
 * Emit an intent broadcast event
 */
export function emitIntentBroadcast(
    trace_id: string,
    intent_id: string,
    category: string,
    offers_count: number,
    latency_ms: number
): void {
    eventBus.emit({
        event_type: 'intent.broadcast',
        trace_id,
        intent_id,
        timestamp: Date.now(),
        category,
        offers_count,
        latency_ms
    });
}

/**
 * Emit an offer validated event
 */
export function emitOfferValidated(
    trace_id: string,
    intent_id: string,
    offer_id: string,
    provider_id: string,
    stage: string,
    final_action: 'PASS' | 'WARN' | 'BLOCK',
    latency_ms: number,
    reason?: string
): void {
    eventBus.emit({
        event_type: 'offer.validated',
        trace_id,
        intent_id,
        offer_id,
        provider_id,
        timestamp: Date.now(),
        stage,
        final_action,
        reason,
        latency_ms
    });
}

/**
 * Emit a security event
 */
export function emitSecurityEvent(
    event_type: 'security.malicious_url' | 'security.price_fraud' | 'security.nonce_replay' | 'security.invalid_signature' | 'security.proof_expired',
    trace_id: string,
    details: Record<string, unknown>
): void {
    eventBus.emit({
        event_type,
        trace_id,
        timestamp: Date.now(),
        ...details
    } as LixEvent);
}

/**
 * Emit a conversion callback event
 */
export function emitConversionCallback(
    trace_id: string,
    token_id: string,
    provider_id: string,
    invoice_id: string,
    fee_amount: number,
    idempotent: boolean,
    conversion_value?: number
): void {
    eventBus.emit({
        event_type: 'conversion.callback',
        trace_id,
        token_id,
        provider_id,
        timestamp: Date.now(),
        invoice_id,
        fee_amount,
        conversion_value,
        idempotent
    });
}

/**
 * Emit a conversion timeout event
 */
export function emitConversionTimeout(
    trace_id: string,
    token_id: string,
    provider_id: string,
    invoice_id: string,
    fee_amount: number,
    age_days: number
): void {
    eventBus.emit({
        event_type: 'conversion.timeout',
        trace_id,
        token_id,
        provider_id,
        timestamp: Date.now(),
        invoice_id,
        fee_amount,
        age_days
    });
}
