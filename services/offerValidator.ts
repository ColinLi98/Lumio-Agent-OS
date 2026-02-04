/**
 * Offer Validator - 10-Stage Validation Pipeline
 * L.I.X. v0.2.1
 * 
 * Stage 10 (NEW): Semantic Consistency - blocks e-commerce for ticketing
 */

import {
    Offer,
    IntentRequest,
    ValidationResult,
    ValidationPipelineResult,
    ValidationAction,
    Severity,
    PENALTY_WEIGHTS,
    createChildSpan
} from './lixTypes';
import { reputationService } from './reputationService';
import { checkUrlSafety, countRedirectHops } from './urlSafetyService';
import { matchSKU } from './auctionEngine';
import { classifyVertical, isEcommerceCompatible, getExpectedKind } from './verticalClassifier';
import { eventBus } from './eventBus';

// ============================================================================
// Provider Domain Configuration
// ============================================================================

interface ProviderDomainConfig {
    primary_domains: string[];
    affiliate_domains: string[];
    allowed_redirects: string[];
    require_tls: boolean;
}

const PROVIDER_DOMAINS: Record<string, ProviderDomainConfig> = {
    'jd_001': {
        primary_domains: ['jd.com', 'm.jd.com'],
        affiliate_domains: ['union.jd.com', 'click.jd.com'],
        allowed_redirects: ['passport.jd.com'],
        require_tls: true
    },
    'pdd_001': {
        primary_domains: ['pinduoduo.com', 'yangkeduo.com'],
        affiliate_domains: ['mobile.pinduoduo.com'],
        allowed_redirects: [],
        require_tls: true
    },
    'taobao_001': {
        primary_domains: ['taobao.com', 'tmall.com'],
        affiliate_domains: ['s.click.taobao.com', 'uland.taobao.com'],
        allowed_redirects: ['login.taobao.com'],
        require_tls: true
    }
};

// ============================================================================
// Validation Stages
// ============================================================================

async function validateSchema(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    const requiredFields = ['offer_id', 'intent_id', 'provider', 'price'];
    const missing = requiredFields.filter(f => !(f in offer));

    if (missing.length > 0) {
        return {
            stage: 'schema',
            passed: false,
            action: 'BLOCK',
            severity: 'critical',
            penalty_weight: PENALTY_WEIGHTS.critical,
            reason: `Missing fields: ${missing.join(', ')}`,
            latency_ms: Date.now() - start
        };
    }

    if (offer.price.amount <= 0) {
        return {
            stage: 'schema',
            passed: false,
            action: 'BLOCK',
            severity: 'critical',
            reason: 'Invalid price amount',
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'schema', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

async function validateProvider(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    if (!offer.provider?.id) {
        return {
            stage: 'provider',
            passed: false,
            action: 'BLOCK',
            severity: 'critical',
            reason: 'Missing provider ID',
            latency_ms: Date.now() - start
        };
    }

    // Check if provider is registered (mock check)
    const isRegistered = offer.provider.id.includes('_');
    if (!isRegistered) {
        return {
            stage: 'provider',
            passed: false,
            action: 'BLOCK',
            severity: 'high',
            reason: 'Provider not registered',
            latency_ms: Date.now() - start
        };
    }

    // Check if provider is suspended (mock)
    const isSuspended = offer.provider.reputation_score < 2.0;
    if (isSuspended) {
        return {
            stage: 'provider',
            passed: false,
            action: 'BLOCK',
            severity: 'high',
            reason: 'Provider suspended due to low reputation',
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'provider', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Stage 3: URL Safety
 * v0.2: Integrates with external safety check service (VirusTotal/GSB stub)
 */
async function validateUrlSafety(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    const url = offer.price_proof?.proof_url;
    if (!url) {
        return {
            stage: 'url_safety',
            passed: true,
            action: 'WARN',
            severity: 'low',
            penalty_weight: PENALTY_WEIGHTS.low,
            reason: 'No proof URL provided',
            latency_ms: Date.now() - start
        };
    }

    // v0.2: Call URL safety service (VirusTotal/GSB stub)
    const safetyResult = await checkUrlSafety(url);

    if (!safetyResult.safe) {
        // Log security event
        console.log(`[security.url_blocked] offer=${offer.offer_id} url=${url} threat=${safetyResult.threatType}`);
        return {
            stage: 'url_safety',
            passed: false,
            action: 'BLOCK',
            severity: 'critical',
            reason: `Unsafe URL: ${safetyResult.threatType}${safetyResult.details ? ' - ' + safetyResult.details : ''}`,
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'url_safety', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Stage 4: Redirect Analysis
 * v0.2: BLOCK if >3 redirects or domain mismatch
 */
async function validateRedirects(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    const url = offer.price_proof?.proof_url;
    if (!url) {
        return { stage: 'redirects', passed: true, action: 'PASS', latency_ms: Date.now() - start };
    }

    // v0.2: Check redirect hop count
    const redirectResult = await countRedirectHops(url);

    // BLOCK if >3 redirects (v0.2 requirement)
    if (redirectResult.hops > 3) {
        console.log(`[security.redirect_blocked] offer=${offer.offer_id} hops=${redirectResult.hops}`);
        return {
            stage: 'redirects',
            passed: false,
            action: 'BLOCK',
            severity: 'high',
            reason: `Too many redirects: ${redirectResult.hops} hops (max 3)`,
            latency_ms: Date.now() - start
        };
    }

    // Check domain mismatch
    if (redirectResult.domainChanged) {
        const domainConfig = PROVIDER_DOMAINS[offer.provider.id];
        if (domainConfig) {
            try {
                const finalDomain = new URL(redirectResult.finalUrl).hostname;
                const allowedDomains = [
                    ...domainConfig.primary_domains,
                    ...domainConfig.affiliate_domains,
                    ...domainConfig.allowed_redirects
                ];
                const isDomainAllowed = allowedDomains.some(d => finalDomain.endsWith(d));

                if (!isDomainAllowed) {
                    console.log(`[security.domain_mismatch] offer=${offer.offer_id} domain=${finalDomain}`);
                    return {
                        stage: 'redirects',
                        passed: false,
                        action: 'BLOCK',
                        severity: 'high',
                        reason: `Redirect to unauthorized domain: ${finalDomain}`,
                        latency_ms: Date.now() - start
                    };
                }
            } catch {
                return {
                    stage: 'redirects',
                    passed: false,
                    action: 'BLOCK',
                    severity: 'high',
                    reason: 'Invalid redirect URL format',
                    latency_ms: Date.now() - start
                };
            }
        }
    }

    // Warn if any redirects (1-3 hops)
    if (redirectResult.hops > 0) {
        return {
            stage: 'redirects',
            passed: true,
            action: 'WARN',
            severity: 'low',
            penalty_weight: PENALTY_WEIGHTS.low,
            reason: `URL has ${redirectResult.hops} redirect(s)`,
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'redirects', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

async function validatePrice(offer: Offer, intent: IntentRequest): Promise<ValidationResult> {
    const start = Date.now();

    // Check against budget
    if (intent.constraints.budget_max && offer.price.amount > intent.constraints.budget_max) {
        return {
            stage: 'price',
            passed: false,
            action: 'BLOCK',
            severity: 'medium',
            reason: `Price ${offer.price.amount} exceeds budget ${intent.constraints.budget_max}`,
            latency_ms: Date.now() - start
        };
    }

    // Price proof validation (if available)
    if (offer.price_proof) {
        const drift = Math.abs(offer.price_proof.claimed_price - offer.price.amount) / offer.price.amount;

        if (drift > 0.30) {
            return {
                stage: 'price',
                passed: false,
                action: 'BLOCK',
                severity: 'high',
                penalty_weight: PENALTY_WEIGHTS.high,
                reason: `Price drift ${(drift * 100).toFixed(1)}% exceeds 30% limit`,
                latency_ms: Date.now() - start
            };
        }

        if (drift > 0.15) {
            return {
                stage: 'price',
                passed: true,
                action: 'WARN',
                severity: 'medium',
                penalty_weight: PENALTY_WEIGHTS.medium,
                reason: `Price drift ${(drift * 100).toFixed(1)}%`,
                latency_ms: Date.now() - start
            };
        }
    }

    return { stage: 'price', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Stage 6: Inventory Validation
 * v0.2: BLOCK for suspected false inventory claims
 */
async function validateInventory(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    // v0.2: Detect false inventory claims
    if (offer.inventory_signal === 'in_stock') {
        // Heuristic: suspiciously cheap + C2C + high value claim = likely false
        const isSuspiciouslyCheap = offer.price.amount < 100 && offer.provider.type === 'C2C';
        const hasNoProof = !offer.price_proof?.proof_url;

        if (isSuspiciouslyCheap && hasNoProof) {
            console.log(`[security.false_claim] offer=${offer.offer_id} suspected false inventory`);
            return {
                stage: 'inventory',
                passed: false,
                action: 'BLOCK',
                severity: 'high',
                reason: 'Suspected false inventory claim (price anomaly)',
                latency_ms: Date.now() - start
            };
        }
    }

    if (offer.inventory_signal === 'out_of_stock') {
        return {
            stage: 'inventory',
            passed: true,
            action: 'DOWNRANK',
            severity: 'high',
            penalty_weight: PENALTY_WEIGHTS.high,
            reason: 'Out of stock',
            latency_ms: Date.now() - start
        };
    }

    if (offer.inventory_signal === 'low_stock') {
        return {
            stage: 'inventory',
            passed: true,
            action: 'WARN',
            severity: 'low',
            penalty_weight: PENALTY_WEIGHTS.low,
            reason: 'Low stock',
            latency_ms: Date.now() - start
        };
    }

    if (offer.inventory_signal === 'unknown') {
        return {
            stage: 'inventory',
            passed: true,
            action: 'WARN',
            severity: 'low',
            penalty_weight: PENALTY_WEIGHTS.low,
            reason: 'Inventory status unknown',
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'inventory', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Stage 7: SKU Match Validation
 * v0.2: BLOCK if match score < 0.8
 */
async function validateSKUMatch(offer: Offer, intent: IntentRequest): Promise<ValidationResult> {
    const start = Date.now();

    if (!intent.item.canonical_sku || !offer.item_sku) {
        return {
            stage: 'sku_match',
            passed: true,
            action: 'WARN',
            severity: 'low',
            penalty_weight: PENALTY_WEIGHTS.low,
            reason: 'SKU not specified for matching',
            latency_ms: Date.now() - start
        };
    }

    // v0.2: Use matchSKU from auctionEngine for scoring
    const match = matchSKU(offer.item_sku, intent.item.canonical_sku);

    // v0.2 REQUIREMENT: BLOCK if score < 0.8
    if (match.score < 0.8) {
        console.log(`[offer.sku_mismatch] offer=${offer.offer_id} score=${match.score.toFixed(2)} reason=${match.reason}`);
        return {
            stage: 'sku_match',
            passed: false,
            action: 'BLOCK',
            severity: 'medium',
            reason: `SKU match ${(match.score * 100).toFixed(0)}% < 80% threshold${match.reason ? ': ' + match.reason : ''}`,
            latency_ms: Date.now() - start
        };
    }

    // Warn if not perfect match
    if (match.score < 1.0) {
        return {
            stage: 'sku_match',
            passed: true,
            action: 'WARN',
            severity: 'low',
            penalty_weight: PENALTY_WEIGHTS.low * (1 - match.score),
            reason: `SKU match ${(match.score * 100).toFixed(0)}%${match.reason ? ': ' + match.reason : ''}`,
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'sku_match', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

async function validateRateLimit(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    // Mock rate limit check - in production, check Redis/cache
    const currentHour = new Date().getHours();
    const mockOverLimit = offer.provider.id === 'spam_provider';

    if (mockOverLimit) {
        return {
            stage: 'rate_limit',
            passed: false,
            action: 'BLOCK',
            severity: 'medium',
            reason: 'Provider rate limit exceeded',
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'rate_limit', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Stage 9: Reputation Check
 * Uses reputationService to check for suspended providers
 */
async function validateReputation(offer: Offer): Promise<ValidationResult> {
    const start = Date.now();

    // Check if provider is suspended
    const isSuspended = reputationService.isProviderSuspended(offer.provider.id);
    if (isSuspended) {
        const rep = reputationService.getProviderReputation(offer.provider.id);
        return {
            stage: 'reputation',
            passed: false,
            action: 'BLOCK',
            severity: 'critical',
            reason: `Provider suspended until ${rep?.suspension_until?.toLocaleDateString() || 'unknown'}: ${rep?.suspension_reason || 'policy violation'}`,
            latency_ms: Date.now() - start
        };
    }

    // Check effective score for low reputation warning
    const score = reputationService.getProviderScore(offer.provider.id);
    if (score < 40) {
        return {
            stage: 'reputation',
            passed: true,
            action: 'DOWNRANK',
            severity: 'high',
            penalty_weight: PENALTY_WEIGHTS.high,
            reason: `Low reputation score: ${score}`,
            latency_ms: Date.now() - start
        };
    }

    if (score < 60) {
        return {
            stage: 'reputation',
            passed: true,
            action: 'WARN',
            severity: 'medium',
            penalty_weight: PENALTY_WEIGHTS.medium,
            reason: `Below average reputation: ${score}`,
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'reputation', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Stage 10: Semantic Consistency Gate
 * P0 DEFENSE: BLOCK offers from incompatible verticals
 * 
 * v0.3: Enhanced with RouteResult and offer.domain validation
 * 
 * E.g., ticketing intents should NOT receive e-commerce offers
 */
async function validateSemanticConsistency(
    offer: Offer,
    intent: IntentRequest
): Promise<ValidationResult> {
    const start = Date.now();

    // Get intent domain - prefer vertical if set, otherwise classify
    const intentDomain = intent.vertical || classifyVertical(intent.item?.name || '');

    // =========================================================================
    // v0.3 Check 1: Offer domain vs Intent domain mismatch
    // =========================================================================
    if (offer.domain && intentDomain) {
        const offerDomain = offer.domain;

        // Critical mismatch: ticketing intent receiving commerce/ecommerce offer
        if (intentDomain === 'ticketing' && (offerDomain === 'commerce' || (offerDomain as string) === 'ecommerce')) {
            eventBus.emit({
                event_type: 'offer.rejected.domain_mismatch',
                timestamp: Date.now(),
                trace_id: offer.trace?.trace_id || `offer_${offer.offer_id}`,
                offer_id: offer.offer_id,
                intent_domain: intentDomain,
                offer_domain: offerDomain,
                reason: 'ticketing_ecommerce_mismatch'
            } as any);

            console.log(`[P0] DOMAIN MISMATCH BLOCKED: offer=${offer.offer_id} intent=${intentDomain} offer_domain=${offerDomain}`);

            return {
                stage: 'semantic_consistency',
                passed: false,
                action: 'BLOCK',
                severity: 'critical',
                penalty_weight: PENALTY_WEIGHTS.critical,
                reason: `Domain mismatch: intent is '${intentDomain}' but offer domain is '${offerDomain}'`,
                latency_ms: Date.now() - start
            };
        }

        // Other domain mismatches (less critical but still blocked)
        // Cast to string for comparison since IntentVertical uses 'ecommerce'/'generic' 
        // while OfferDomain uses 'commerce'/'other'
        const intentDomainStr = String(intentDomain);
        const offerDomainStr = String(offerDomain);
        const isGenericIntent = ['ecommerce', 'generic', 'commerce', 'other'].includes(intentDomainStr);
        const isGenericOffer = ['ecommerce', 'generic', 'commerce', 'other'].includes(offerDomainStr);

        if (offerDomainStr !== intentDomainStr && !isGenericOffer && !isGenericIntent) {
            eventBus.emit({
                event_type: 'offer.rejected.domain_mismatch',
                timestamp: Date.now(),
                trace_id: offer.trace?.trace_id || `offer_${offer.offer_id}`,
                offer_id: offer.offer_id,
                intent_domain: intentDomain,
                offer_domain: offerDomain,
                reason: 'general_domain_mismatch'
            } as any);

            console.log(`[SEMANTIC] Domain mismatch: offer=${offer.offer_id} intent=${intentDomain} offer_domain=${offerDomain}`);

            return {
                stage: 'semantic_consistency',
                passed: false,
                action: 'BLOCK',
                severity: 'high',
                penalty_weight: PENALTY_WEIGHTS.high,
                reason: `Domain mismatch: intent is '${intentDomain}' but offer domain is '${offerDomain}'`,
                latency_ms: Date.now() - start
            };
        }
    }

    // =========================================================================
    // v0.3 Check 2: Offer type vs Intent kind mismatch
    // =========================================================================
    if (offer.offer_type && intent.intent_kind) {
        if (offer.offer_type !== intent.intent_kind) {
            console.log(`[SEMANTIC] Type mismatch: offer_type=${offer.offer_type} intent_kind=${intent.intent_kind}`);

            // Penalize but don't block for type mismatch (less severe)
            return {
                stage: 'semantic_consistency',
                passed: true, // Allow but penalize
                action: 'DOWNRANK',
                severity: 'medium',
                penalty_weight: PENALTY_WEIGHTS.medium,
                reason: `Type mismatch: offer type '${offer.offer_type}' vs intent kind '${intent.intent_kind}'`,
                latency_ms: Date.now() - start
            };
        }
    }

    // =========================================================================
    // Legacy Check: Provider kind compatibility (fallback)
    // =========================================================================
    // Skip check for e-commerce and generic verticals (compatible with all providers)
    if (isEcommerceCompatible(intentDomain)) {
        return { stage: 'semantic_consistency', passed: true, action: 'PASS', latency_ms: Date.now() - start };
    }

    // For ticketing/outsourcing: check if offer comes from compatible provider
    const providerKind = getProviderKindFromOffer(offer);
    const expectedKind = getExpectedKind(intentDomain);

    // BLOCK if offer kind doesn't match expected kind for this vertical
    if (expectedKind && providerKind !== expectedKind && providerKind !== 'unknown') {
        // Emit rejection event for observability
        eventBus.emit({
            event_type: 'offer.rejected.semantic_mismatch',
            timestamp: Date.now(),
            trace_id: offer.trace?.trace_id || `offer_${offer.offer_id}`,
            offer_id: offer.offer_id,
            intent_vertical: intentDomain,
            provider_kind: providerKind,
            expected_kind: expectedKind
        } as any);

        console.log(`[offer.semantic_mismatch] offer=${offer.offer_id} vertical=${intentDomain} provider_kind=${providerKind}`);

        return {
            stage: 'semantic_consistency',
            passed: false,
            action: 'BLOCK',
            severity: 'high',
            reason: `Provider type '${providerKind}' incompatible with intent vertical '${intentDomain}'`,
            latency_ms: Date.now() - start
        };
    }

    return { stage: 'semantic_consistency', passed: true, action: 'PASS', latency_ms: Date.now() - start };
}

/**
 * Helper: Determine provider kind from offer
 * v0.3: Also checks offer.source_provider_group
 */
function getProviderKindFromOffer(offer: Offer): string {
    // v0.3: Use source_provider_group if available
    if (offer.source_provider_group) {
        if (offer.source_provider_group.includes('ecom')) return 'ecommerce';
        if (offer.source_provider_group.includes('ticket')) return 'ticketing';
        if (offer.source_provider_group.includes('travel')) return 'travel';
    }

    // Use provider ID prefix to determine kind
    const providerId = offer.provider?.id || '';

    // Known e-commerce providers
    if (providerId.startsWith('jd') || providerId.startsWith('pdd') || providerId.startsWith('taobao')) {
        return 'ecommerce';
    }

    // Known ticketing providers (future)
    if (providerId.startsWith('12306') || providerId.startsWith('ctrip') || providerId.startsWith('qunar')) {
        return 'ticketing';
    }

    return 'unknown';
}

// ============================================================================
// Main Validation Pipeline
// ============================================================================

export async function validateOffer(
    offer: Offer,
    intent: IntentRequest
): Promise<ValidationPipelineResult> {
    const startTime = Date.now();
    const stages: ValidationResult[] = [];

    // Stage 1: Schema
    const schemaResult = await validateSchema(offer);
    stages.push(schemaResult);
    if (schemaResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 2: Provider
    const providerResult = await validateProvider(offer);
    stages.push(providerResult);
    if (providerResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 3: URL Safety
    const urlResult = await validateUrlSafety(offer);
    stages.push(urlResult);
    if (urlResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 4: Redirects
    const redirectResult = await validateRedirects(offer);
    stages.push(redirectResult);
    if (redirectResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 5: Price
    const priceResult = await validatePrice(offer, intent);
    stages.push(priceResult);
    if (priceResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 6: Inventory
    const inventoryResult = await validateInventory(offer);
    stages.push(inventoryResult);

    // Stage 7: SKU Match
    const skuResult = await validateSKUMatch(offer, intent);
    stages.push(skuResult);
    if (skuResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 8: Rate Limit
    const rateResult = await validateRateLimit(offer);
    stages.push(rateResult);

    // Stage 9: Reputation
    const reputationResult = await validateReputation(offer);
    stages.push(reputationResult);
    if (reputationResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    // Stage 10: Semantic Consistency (P0: Vertical classification defense)
    const semanticResult = await validateSemanticConsistency(offer, intent);
    stages.push(semanticResult);
    if (semanticResult.action === 'BLOCK') {
        return createPipelineResult(offer.offer_id, stages, startTime);
    }

    return createPipelineResult(offer.offer_id, stages, startTime);
}

function createPipelineResult(
    offerId: string,
    stages: ValidationResult[],
    startTime: number
): ValidationPipelineResult {
    const blocked = stages.find(s => s.action === 'BLOCK');
    const hasDownrank = stages.some(s => s.action === 'DOWNRANK');
    const hasWarn = stages.some(s => s.action === 'WARN');

    let finalAction: ValidationAction = 'PASS';
    if (blocked) finalAction = 'BLOCK';
    else if (hasDownrank) finalAction = 'DOWNRANK';
    else if (hasWarn) finalAction = 'WARN';

    return {
        offer_id: offerId,
        all_passed: !blocked,
        final_action: finalAction,
        stages,
        total_latency_ms: Date.now() - startTime
    };
}

export function calculateValidationPenalty(result: ValidationPipelineResult): number {
    return result.stages
        .filter(s => s.penalty_weight)
        .reduce((sum, s) => sum + (s.penalty_weight || 0), 0);
}
