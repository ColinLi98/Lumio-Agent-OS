/**
 * LIX Store - Intent state management
 * Manages intents, offers, and observability events
 */

import * as React from 'react';
import {
    type AgentSolutionIntent,
    type AgentSolutionOffer,
    type DeliveredAgentManifest,
    type LixDigitalTwinSnapshot,
    type ProfileShareConsentState,
    type ReviewDecision,
    type SolutionFailureContext,
    type SolutionCustomRequirements,
    type SolutionIntentDomain,
    type SolutionIntentStatus,
    IntentRequest,
    RankedOffer,
    AcceptToken,
    LIXEvent,
    generateId,
    createTraceContext
} from './lixTypes.js';
import { lixMarketService } from './marketService.js';
import { settlementService, AcceptTokenRecord } from './settlementService.js';
import { proofOfIntentService, ProofOfIntent } from './proofOfIntentService.js';

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

export interface StoredSolutionIntent extends AgentSolutionIntent {
    trace_id?: string;
}

interface LIXStoreState {
    intents: Map<string, StoredIntent>;
    solution_intents: Map<string, StoredSolutionIntent>;
    events: LIXEvent[];
    metrics: {
        total_intents_broadcast: number;
        total_offers_received: number;
        total_accepted: number;
        avg_first_offer_seconds: number;
        total_solution_intents: number;
        total_solution_deliveries: number;
        total_solution_approved: number;
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

function inferSolutionDomain(raw?: string): SolutionIntentDomain {
    const normalized = String(raw || '').trim().toLowerCase();
    const domains: SolutionIntentDomain[] = [
        'recruitment', 'travel', 'finance', 'health', 'legal', 'education',
        'shopping', 'productivity', 'local_service', 'general'
    ];
    if (domains.includes(normalized as SolutionIntentDomain)) {
        return normalized as SolutionIntentDomain;
    }
    return 'general';
}

function uniqueStrings(values: unknown[]): string[] {
    const out: string[] = [];
    values.forEach((value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return;
        if (!out.includes(normalized)) out.push(normalized);
    });
    return out;
}

function toPositiveNumber(value: unknown): number | undefined {
    if (!Number.isFinite(value as number)) return undefined;
    const normalized = Number(value);
    if (normalized <= 0) return undefined;
    return normalized;
}

function normalizeDeliveryModePreference(
    value: unknown
): 'agent_collab' | 'human_expert' | 'hybrid' | undefined {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'agent_collab' || normalized === 'human_expert' || normalized === 'hybrid') {
        return normalized;
    }
    return undefined;
}

function sanitizeCustomRequirements(input: unknown): SolutionCustomRequirements | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const source = input as Record<string, unknown>;
    const objective = String(source.objective || '').trim();
    const mustHave = uniqueStrings(Array.isArray(source.must_have_capabilities) ? source.must_have_capabilities : []);
    const exclusions = uniqueStrings(Array.isArray(source.exclusions) ? source.exclusions : []);
    const successCriteria = uniqueStrings(Array.isArray(source.success_criteria) ? source.success_criteria : []);
    const notes = String(source.notes || '').trim();
    const budgetMax = toPositiveNumber(source.budget_max_cny);
    const expectedDeliveryHours = toPositiveNumber(source.expected_delivery_hours);

    const out: SolutionCustomRequirements = {};
    if (objective) out.objective = objective;
    if (mustHave.length > 0) out.must_have_capabilities = mustHave;
    if (exclusions.length > 0) out.exclusions = exclusions;
    if (typeof budgetMax === 'number') out.budget_max_cny = budgetMax;
    if (typeof expectedDeliveryHours === 'number') out.expected_delivery_hours = expectedDeliveryHours;
    if (successCriteria.length > 0) out.success_criteria = successCriteria;
    if (notes) out.notes = notes;

    return Object.keys(out).length > 0 ? out : undefined;
}

function trimTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveLixExecutorRef(): string {
    const envBase = String(
        process.env.LIX_AGENT_EXECUTOR_BASE
        || process.env.APP_URL
        || process.env.URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    ).trim();
    if (envBase) {
        return `${trimTrailingSlash(envBase)}/api/lix/solution/executor`;
    }
    if (process.env.NODE_ENV !== 'production') {
        return 'http://127.0.0.1:3000/api/lix/solution/executor';
    }
    return 'https://lumi-agent-simulator.vercel.app/api/lix/solution/executor';
}

function inferCollaboratorAgents(caps: string[]): string[] {
    const out: string[] = [];
    const capSet = new Set(caps);

    if (capSet.has('web_search')) out.push('tool:web_search');
    if (capSet.has('live_search') || capSet.has('local_search')) out.push('tool:live_search');
    if (capSet.has('flight_search')) out.push('specialized:flight_booking');
    if (capSet.has('hotel_search')) out.push('specialized:hotel_booking');
    if (capSet.has('restaurant_search')) out.push('specialized:restaurant');
    if (capSet.has('attraction_search')) out.push('specialized:attraction');
    if (capSet.has('weather_query')) out.push('specialized:weather');
    if (capSet.has('local_transport')) out.push('specialized:transportation');
    if (capSet.has('itinerary_plan')) out.push('specialized:itinerary');

    if (out.length === 0) {
        out.push('tool:live_search', 'tool:web_search');
    }
    return uniqueStrings(out);
}

function createMockSolutionOffers(
    intentId: string,
    caps: string[],
    deliveryModePreference?: 'agent_collab' | 'human_expert' | 'hybrid'
): AgentSolutionOffer[] {
    const now = new Date();
    const offerCaps = caps.length > 0 ? caps : ['web_search'];
    const experts = [
        { id: 'expert_lee', name: '李工（多 Agent 编排）', eta: 8, quote: 899 },
        { id: 'expert_chen', name: '陈工（实时数据接入）', eta: 12, quote: 1299 },
        { id: 'agent_swarm_lix', name: 'LIX Agent 协同网络（自动交付）', eta: 1, quote: 399, type: 'agent_collab' as const },
    ];

    const offers = experts.map((expert, index) => ({
        offer_id: `sol_offer_${generateId()}`,
        intent_id: intentId,
        expert_id: expert.id,
        expert_name: expert.name,
        offer_type: (expert.type || 'human_expert') as AgentSolutionOffer['offer_type'],
        summary: expert.type === 'agent_collab'
            ? `由 Agent 网络自动协同交付，覆盖能力：${offerCaps.slice(0, 4).join('、')}`
            : `交付可上架 agent，覆盖能力：${offerCaps.slice(0, 3).join('、')}`,
        proposed_capabilities: offerCaps,
        collaborator_agents: expert.type === 'agent_collab'
            ? inferCollaboratorAgents(offerCaps)
            : undefined,
        orchestration_strategy: expert.type === 'agent_collab'
            ? 'planner -> multi-agent execution -> evidence merge'
            : undefined,
        estimated_delivery_hours: expert.eta,
        quote_amount: expert.quote + (index * 100),
        currency: 'CNY',
        status: 'open' as AgentSolutionOffer['status'],
        created_at: now.toISOString(),
    }));

    const preference = normalizeDeliveryModePreference(deliveryModePreference) || 'hybrid';
    return offers.sort((a, b) => {
        const aPref = preference === 'agent_collab'
            ? (a.offer_type === 'agent_collab' ? 1 : 0)
            : preference === 'human_expert'
                ? (a.offer_type === 'human_expert' || !a.offer_type ? 1 : 0)
                : 0;
        const bPref = preference === 'agent_collab'
            ? (b.offer_type === 'agent_collab' ? 1 : 0)
            : preference === 'human_expert'
                ? (b.offer_type === 'human_expert' || !b.offer_type ? 1 : 0)
                : 0;
        if (aPref !== bPref) return bPref - aPref;
        if (a.quote_amount !== b.quote_amount) return a.quote_amount - b.quote_amount;
        return a.estimated_delivery_hours - b.estimated_delivery_hours;
    });
}

// ============================================================================
// Store Implementation
// ============================================================================

class LIXStore {
    state: LIXStoreState = {
        intents: new Map(),
        solution_intents: new Map(),
        events: [],
        metrics: {
            total_intents_broadcast: 0,
            total_offers_received: 0,
            total_accepted: 0,
            avg_first_offer_seconds: 1.5,
            total_solution_intents: 0,
            total_solution_deliveries: 0,
            total_solution_approved: 0,
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
    // Intent Operations (existing)
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
            offer_amount: settlementToken.offer_amount,
            currency: settlementToken.currency,
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
    // Solution Intent Operations (new)
    // ========================================================================

    async broadcastSolutionIntent(params: {
        requester_id?: string;
        requester_type?: 'user' | 'agent';
        requester_agent_id?: string;
        requester_agent_name?: string;
        title?: string;
        query: string;
        domain?: string;
        required_capabilities?: string[];
        delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
        custom_requirements?: SolutionCustomRequirements;
        failure_context?: SolutionFailureContext;
        profile_share_consent?: ProfileShareConsentState;
        digital_twin_snapshot?: LixDigitalTwinSnapshot;
    }): Promise<StoredSolutionIntent> {
        const query = String(params.query || '').trim();
        if (!query) throw new Error('Missing required field: query');

        const intentId = `sol_intent_${generateId()}`;
        const now = new Date().toISOString();
        const customRequirements = sanitizeCustomRequirements(params.custom_requirements);
        const requiredCaps = uniqueStrings([
            ...(Array.isArray(params.required_capabilities) ? params.required_capabilities : []),
            ...((customRequirements?.must_have_capabilities || []) as string[]),
        ]);
        const requesterType = params.requester_type === 'agent' ? 'agent' : 'user';
        const requesterAgentId = requesterType === 'agent' ? String(params.requester_agent_id || '').trim() : '';
        const requesterAgentName = requesterType === 'agent' ? String(params.requester_agent_name || '').trim() : '';
        const deliveryModePreference = normalizeDeliveryModePreference(params.delivery_mode_preference) || 'hybrid';
        const offers = createMockSolutionOffers(intentId, requiredCaps, deliveryModePreference);

        const intent: StoredSolutionIntent = {
            intent_id: intentId,
            kind: 'solution',
            requester_id: String(params.requester_id || 'demo_user'),
            requester_type: requesterType,
            requester_agent_id: requesterAgentId || undefined,
            requester_agent_name: requesterAgentName || undefined,
            title: String(params.title || `为需求创建可执行 Agent：${query.slice(0, 32)}`),
            query,
            domain: inferSolutionDomain(params.domain),
            required_capabilities: requiredCaps,
            delivery_mode_preference: deliveryModePreference,
            custom_requirements: customRequirements,
            failure_context: params.failure_context,
            profile_share_consent: params.profile_share_consent,
            digital_twin_snapshot: params.digital_twin_snapshot,
            status: offers.length > 0 ? 'offers_received' : 'broadcasting',
            created_at: now,
            updated_at: now,
            offers,
            trace_id: createTraceContext(intentId).trace_id,
        };

        this.state.solution_intents.set(intentId, intent);
        this.state.metrics.total_solution_intents += 1;

        logEvent('solution.intent.created', {
            intent_id: intentId,
            requester_id: intent.requester_id,
            requester_type: intent.requester_type,
            requester_agent_id: intent.requester_agent_id,
            domain: intent.domain,
            caps: intent.required_capabilities,
            delivery_mode_preference: intent.delivery_mode_preference,
            has_custom_requirements: Boolean(intent.custom_requirements),
        });
        if (offers.length > 0) {
            logEvent('solution.intent.offers_received', {
                intent_id: intentId,
                offers_count: offers.length,
            });
        }
        if (intent.digital_twin_snapshot) {
            logEvent('solution.intent.profile_attached', {
                intent_id: intentId,
                user_id: intent.digital_twin_snapshot.user_id,
                profile_share_consent: intent.profile_share_consent || 'unknown',
            });
        }

        this.notify();
        return intent;
    }

    getSolutionIntent(intentId: string): StoredSolutionIntent | undefined {
        return this.state.solution_intents.get(intentId);
    }

    getAllSolutionIntents(): StoredSolutionIntent[] {
        return Array.from(this.state.solution_intents.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    getSolutionOffers(intentId: string): AgentSolutionOffer[] {
        return this.state.solution_intents.get(intentId)?.offers || [];
    }

    async acceptSolutionOffer(intentId: string, offerId: string): Promise<StoredSolutionIntent> {
        const intent = this.state.solution_intents.get(intentId);
        if (!intent) throw new Error(`Solution intent ${intentId} not found`);

        const matched = intent.offers.find((offer) => offer.offer_id === offerId);
        if (!matched) throw new Error(`Solution offer ${offerId} not found`);

        intent.offers = intent.offers.map((offer) => ({
            ...offer,
            status: offer.offer_id === offerId ? 'accepted' : (offer.status === 'accepted' ? 'open' : 'rejected'),
        }));
        intent.accepted_offer_id = offerId;
        intent.updated_at = new Date().toISOString();

        logEvent('solution.offer.accepted', {
            intent_id: intentId,
            offer_id: offerId,
            expert_id: matched.expert_id,
            offer_type: matched.offer_type || 'human_expert',
        });

        if (matched.offer_type === 'agent_collab') {
            const now = new Date().toISOString();
            const caps = uniqueStrings(
                matched.proposed_capabilities.length > 0
                    ? matched.proposed_capabilities
                    : intent.required_capabilities
            );
            const manifest: DeliveredAgentManifest = {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: `ext:lix:${generateId()}`,
                name: `LIX 协同 Agent · ${intent.title.slice(0, 20)}`,
                description: `由 ${matched.expert_name} 自动编排多个 Agent 协同执行`,
                execute_ref: resolveLixExecutorRef(),
                domains: [intent.domain],
                capabilities: caps.length > 0 ? caps : ['general'],
                supports_realtime: true,
                evidence_level: 'strong',
                supports_parallel: true,
                cost_tier: 'low',
                avg_latency_ms: 1400,
                success_rate: 0.93,
                owner_id: intent.requester_id,
                submitted_by: matched.expert_id,
                submitted_at: now,
                market_visibility: 'public',
                pricing_model: 'pay_per_use',
                price_per_use_cny: 9,
                delivery_mode_preference: intent.delivery_mode_preference || 'agent_collab',
            };

            intent.delivery_manifest = manifest;
            intent.review = {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: manifest.agent_id,
                reviewer_id: 'system_auto',
                decision: 'approved',
                reason: 'Agent 协同方案自动交付并通过系统审核',
                reviewed_at: now,
            };
            intent.status = 'approved';
            intent.updated_at = now;
            this.state.metrics.total_solution_deliveries += 1;
            this.state.metrics.total_solution_approved += 1;

            logEvent('solution.agent_collab.auto_delivery', {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: manifest.agent_id,
                collaborators: matched.collaborator_agents || [],
            });
            logEvent('solution.delivery.submitted', {
                intent_id: intent.intent_id,
                offer_id: offerId,
                agent_id: manifest.agent_id,
                owner_id: manifest.owner_id,
                auto: true,
            });
            logEvent('solution.delivery.reviewed', {
                intent_id: intent.intent_id,
                agent_id: manifest.agent_id,
                decision: 'approved',
                reviewer_id: 'system_auto',
                auto: true,
            });
        } else {
            intent.status = 'offer_accepted';
        }

        this.notify();
        return intent;
    }

    async submitSolutionDelivery(input: {
        intent_id: string;
        offer_id: string;
        submitted_by?: string;
        owner_id?: string;
        agent_id?: string;
        name: string;
        description?: string;
        execute_ref: string;
        domains: string[];
        capabilities: string[];
        supports_realtime?: boolean;
        evidence_level?: 'none' | 'weak' | 'strong';
        supports_parallel?: boolean;
        cost_tier?: 'low' | 'mid' | 'high';
        avg_latency_ms?: number;
        success_rate?: number;
        market_visibility?: 'public' | 'private';
        pricing_model?: 'free' | 'pay_per_use';
        price_per_use_cny?: number;
        github_repo?: string;
        manifest_path?: string;
        delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
    }): Promise<StoredSolutionIntent> {
        const intent = this.state.solution_intents.get(input.intent_id);
        if (!intent) throw new Error(`Solution intent ${input.intent_id} not found`);
        if (intent.accepted_offer_id !== input.offer_id) {
            throw new Error('offer_id is not the accepted offer for this intent');
        }

        const domains = uniqueStrings(Array.isArray(input.domains) ? input.domains : [intent.domain])
            .map((domain) => inferSolutionDomain(domain));
        const capabilities = uniqueStrings(Array.isArray(input.capabilities) ? input.capabilities : intent.required_capabilities);

        const manifest: DeliveredAgentManifest = {
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            agent_id: String(input.agent_id || `ext:lix:${generateId()}`),
            name: String(input.name || 'LIX Delivered Agent'),
            description: input.description,
            execute_ref: String(input.execute_ref || '').trim(),
            domains: domains.length > 0 ? domains : [intent.domain],
            capabilities: capabilities.length > 0 ? capabilities : ['general'],
            supports_realtime: Boolean(input.supports_realtime),
            evidence_level: input.evidence_level || 'weak',
            supports_parallel: input.supports_parallel !== false,
            cost_tier: input.cost_tier || 'mid',
            avg_latency_ms: Number.isFinite(input.avg_latency_ms) ? Number(input.avg_latency_ms) : undefined,
            success_rate: Number.isFinite(input.success_rate) ? Number(input.success_rate) : undefined,
            owner_id: String(input.owner_id || intent.requester_id || 'demo_user'),
            submitted_by: String(input.submitted_by || 'expert_unknown'),
            submitted_at: new Date().toISOString(),
            market_visibility: input.market_visibility === 'private' ? 'private' : 'public',
            pricing_model: input.pricing_model === 'free' ? 'free' : 'pay_per_use',
            price_per_use_cny: input.pricing_model === 'free'
                ? 0
                : (Number.isFinite(input.price_per_use_cny) ? Math.max(0, Number(input.price_per_use_cny)) : 9),
            github_repo: input.github_repo ? String(input.github_repo).trim() : undefined,
            manifest_path: input.manifest_path ? String(input.manifest_path).trim() : undefined,
            delivery_mode_preference: normalizeDeliveryModePreference(input.delivery_mode_preference)
                || intent.delivery_mode_preference
                || 'hybrid',
        };

        if (!manifest.execute_ref) {
            throw new Error('execute_ref is required in delivery manifest');
        }

        intent.delivery_manifest = manifest;
        intent.status = 'delivery_submitted';
        intent.updated_at = new Date().toISOString();
        this.state.metrics.total_solution_deliveries += 1;

        logEvent('solution.delivery.submitted', {
            intent_id: input.intent_id,
            offer_id: input.offer_id,
            agent_id: manifest.agent_id,
            owner_id: manifest.owner_id,
        });

        this.notify();
        return intent;
    }

    async reviewSolutionDelivery(input: {
        intent_id: string;
        reviewer_id?: string;
        decision: 'approved' | 'rejected';
        reason?: string;
    }): Promise<StoredSolutionIntent> {
        const intent = this.state.solution_intents.get(input.intent_id);
        if (!intent) throw new Error(`Solution intent ${input.intent_id} not found`);
        if (!intent.delivery_manifest) {
            throw new Error('delivery_manifest not found for this intent');
        }

        const review: ReviewDecision = {
            intent_id: intent.intent_id,
            offer_id: intent.delivery_manifest.offer_id,
            agent_id: intent.delivery_manifest.agent_id,
            reviewer_id: String(input.reviewer_id || 'reviewer_admin'),
            decision: input.decision,
            reason: input.reason,
            reviewed_at: new Date().toISOString(),
        };

        intent.review = review;
        intent.status = input.decision === 'approved' ? 'approved' : 'rejected';
        intent.updated_at = review.reviewed_at;
        if (input.decision === 'approved') {
            this.state.metrics.total_solution_approved += 1;
        }

        logEvent('solution.delivery.reviewed', {
            intent_id: intent.intent_id,
            agent_id: review.agent_id,
            decision: review.decision,
            reviewer_id: review.reviewer_id,
        });

        this.notify();
        return intent;
    }

    ingestSolutionIntent(intent: StoredSolutionIntent): void {
        if (!intent || !intent.intent_id) return;
        this.state.solution_intents.set(intent.intent_id, intent);
        this.notify();
    }

    listMyDeliveredManifests(ownerId: string = 'demo_user'): DeliveredAgentManifest[] {
        return this.getAllSolutionIntents()
            .filter((intent) => intent.status === 'approved' && intent.delivery_manifest?.owner_id === ownerId)
            .map((intent) => intent.delivery_manifest as DeliveredAgentManifest);
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

    resetForTests(): void {
        this.state.intents.clear();
        this.state.solution_intents.clear();
        this.state.events = [];
        this.state.metrics = {
            total_intents_broadcast: 0,
            total_offers_received: 0,
            total_accepted: 0,
            avg_first_offer_seconds: 1.5,
            total_solution_intents: 0,
            total_solution_deliveries: 0,
            total_solution_approved: 0,
        };
        this.notify();
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
        solutionIntents: lixStore.getAllSolutionIntents(),
        recentIntents: lixStore.getRecentIntents(),
        metrics: lixStore.getMetrics(),
        broadcastIntent: lixStore.broadcastIntent.bind(lixStore),
        acceptOffer: lixStore.acceptOffer.bind(lixStore),
        broadcastSolutionIntent: lixStore.broadcastSolutionIntent.bind(lixStore),
        acceptSolutionOffer: lixStore.acceptSolutionOffer.bind(lixStore),
        submitSolutionDelivery: lixStore.submitSolutionDelivery.bind(lixStore),
        reviewSolutionDelivery: lixStore.reviewSolutionDelivery.bind(lixStore),
        getSolutionIntent: lixStore.getSolutionIntent.bind(lixStore),
        getIntent: lixStore.getIntent.bind(lixStore)
    };
}
