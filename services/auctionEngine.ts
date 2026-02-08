/**
 * Auction Engine - SKU Matching + Multi-Objective Ranking
 * L.I.X. v0.2.1
 */

import {
    Offer,
    IntentRequest,
    RankedOffer,
    ScoreBreakdown,
    ValidationPipelineResult
} from './lixTypes.js';
import { calculateValidationPenalty } from './offerValidator.js';

// ============================================================================
// SKU Canonicalization
// ============================================================================

const SKU_PATTERNS: Record<string, RegExp> = {
    'APPLE_IPHONE': /iphone\s*(\d+)\s*(pro\s*max|pro|plus|mini)?/i,
    'APPLE_IPAD': /ipad\s*(pro|air|mini)?\s*(\d+)?/i,
    'APPLE_MACBOOK': /macbook\s*(pro|air)?\s*(\d+)?/i,
    'APPLE_AIRPODS': /airpods\s*(pro|max)?/i,
    'HUAWEI_MATE': /华为\s*mate\s*(\d+)\s*(pro|rs)?/i,
    'HUAWEI_P': /华为\s*p\s*(\d+)\s*(pro|art)?/i,
    'XIAOMI_': /小米\s*(\d+)\s*(pro|ultra)?/i,
    'SAMSUNG_GALAXY': /galaxy\s*(s|z|a|note)\s*(\d+)\s*(ultra|plus|\+)?/i,
};

export function canonicalizeSKU(rawItem: string, specs: Record<string, string> = {}): string {
    const normalized = rawItem.toLowerCase().trim();

    for (const [prefix, pattern] of Object.entries(SKU_PATTERNS)) {
        const match = normalized.match(pattern);
        if (match) {
            const model = match[1] || '';
            const variant = (match[2] || 'STANDARD').toUpperCase().replace(/\s+/g, '');
            const storage = specs.storage || specs['存储'] || 'UNKNOWN';
            const color = (specs.color || specs['颜色'] || 'ANY').substring(0, 3).toUpperCase();
            return `${prefix}${model}_${variant}_${storage}_${color}`;
        }
    }

    // Fallback: generate hash-based SKU
    const hash = simpleHash(normalized);
    return `GENERIC_${hash}`;
}

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
}

// ============================================================================
// SKU Matching
// ============================================================================

interface SKUMatchResult {
    score: number;
    reason?: string;
}

export function matchSKU(offerSKU: string, intentSKU: string): SKUMatchResult {
    if (!offerSKU || !intentSKU) {
        return { score: 0.7, reason: 'SKU not specified' };
    }

    const offerParts = offerSKU.toUpperCase().split('_');
    const intentParts = intentSKU.toUpperCase().split('_');

    // Brand must match (first part)
    if (offerParts[0] !== intentParts[0]) {
        return { score: 0.1, reason: 'Brand mismatch' };
    }

    // Model must match (second part)
    if (offerParts.length < 2 || intentParts.length < 2) {
        return { score: 0.5, reason: 'Incomplete SKU' };
    }

    if (offerParts[1] !== intentParts[1]) {
        return { score: 0.3, reason: 'Model mismatch' };
    }

    // Variant match (third part)
    if (offerParts.length > 2 && intentParts.length > 2) {
        if (offerParts[2] !== intentParts[2] && intentParts[2] !== 'STANDARD' && intentParts[2] !== 'ANY') {
            return { score: 0.7, reason: 'Variant mismatch' };
        }
    }

    // Spec match (storage, color)
    let specScore = 1.0;
    if (offerParts.length > 3 && intentParts.length > 3) {
        if (offerParts[3] !== intentParts[3] && intentParts[3] !== 'UNKNOWN') {
            specScore -= 0.1;
        }
    }
    if (offerParts.length > 4 && intentParts.length > 4) {
        if (offerParts[4] !== intentParts[4] && intentParts[4] !== 'ANY') {
            specScore -= 0.05;
        }
    }

    return { score: specScore };
}

// ============================================================================
// Exchange Rate Service (Mock)
// ============================================================================

const EXCHANGE_RATES: Record<string, number> = {
    'USD': 7.2,
    'EUR': 7.8,
    'JPY': 0.048,
    'HKD': 0.92,
    'GBP': 9.1
};

function getExchangeRate(from: string, to: string): number {
    if (from === to) return 1.0;
    if (to !== 'CNY') {
        console.warn(`[AuctionEngine] Unsupported target currency: ${to}`);
        return 1.0;
    }
    return EXCHANGE_RATES[from] || 1.0;
}

function normalizePrice(offer: Offer, targetCurrency: string = 'CNY'): number {
    if (offer.price.currency === targetCurrency) {
        return offer.price.amount;
    }
    const rate = getExchangeRate(offer.price.currency, targetCurrency);
    return offer.price.amount * rate;
}

// ============================================================================
// Ranking Algorithm
// ============================================================================

interface RankingInput {
    offer: Offer;
    validationResult: ValidationPipelineResult;
}

export function rankOffers(
    inputs: RankingInput[],
    intent: IntentRequest,
    limit: number = 5
): RankedOffer[] {
    const ranked: RankedOffer[] = [];

    for (const { offer, validationResult } of inputs) {
        // Check eligibility (blocked offers are ineligible)
        if (validationResult.final_action === 'BLOCK') {
            ranked.push({
                offer,
                rank: -1,
                total_score: 0,
                score_breakdown: zeroScores(),
                eligible: false,
                ineligibility_reason: validationResult.stages.find(s => s.action === 'BLOCK')?.reason,
                explanation: '该报价未通过验证'
            });
            continue;
        }

        // Calculate individual scores
        const price_score = calculatePriceScore(offer, intent);
        const reputation_score = calculateReputationScore(offer);
        const delivery_score = calculateDeliveryScore(offer, intent);
        const sku_match_score = calculateSKUMatchScore(offer, intent);
        const validation_penalty = calculateValidationPenalty(validationResult);

        // Weighted total
        const total_score = Math.max(0,
            0.35 * price_score +
            0.25 * reputation_score +
            0.20 * delivery_score +
            0.20 * sku_match_score -
            validation_penalty
        );

        const score_breakdown: ScoreBreakdown = {
            price_score,
            reputation_score,
            delivery_score,
            sku_match_score,
            validation_penalty
        };

        ranked.push({
            offer,
            rank: 0, // Will be set after sorting
            total_score,
            score_breakdown,
            eligible: true,
            explanation: generateExplanation(score_breakdown)
        });
    }

    // Sort by score descending
    ranked.sort((a, b) => b.total_score - a.total_score);

    // Assign ranks
    ranked.forEach((r, i) => {
        if (r.eligible) {
            r.rank = i + 1;
        }
    });

    // Return top N eligible
    return ranked.filter(r => r.eligible).slice(0, limit);
}

function zeroScores(): ScoreBreakdown {
    return {
        price_score: 0,
        reputation_score: 0,
        delivery_score: 0,
        sku_match_score: 0,
        validation_penalty: 0
    };
}

// ============================================================================
// Score Calculators
// ============================================================================

function calculatePriceScore(offer: Offer, intent: IntentRequest): number {
    const normalizedPrice = normalizePrice(offer, intent.constraints.currency);

    // No budget specified - use neutral score
    if (!intent.constraints.budget_max) {
        return 0.5;
    }

    const priceRatio = normalizedPrice / intent.constraints.budget_max;

    // Over budget
    if (priceRatio > 1.0) {
        return 0;
    }

    // Under budget - higher score for lower price
    let score = 1 - priceRatio;

    // Cap outliers (suspiciously low prices get diminishing returns)
    if (score > 0.4) {
        score = 0.4 + (score - 0.4) * 0.5;
    }

    return Math.min(1, Math.max(0, score));
}

function calculateReputationScore(offer: Offer): number {
    const rating = offer.provider.reputation_score || 3.0;
    return Math.min(1, rating / 5.0);
}

function calculateDeliveryScore(offer: Offer, intent: IntentRequest): number {
    if (!intent.constraints.delivery_by || !offer.fulfillment?.delivery_eta) {
        return 0.5; // Neutral
    }

    const deadline = new Date(intent.constraints.delivery_by).getTime();
    const eta = new Date(offer.fulfillment.delivery_eta).getTime();

    if (eta <= deadline) {
        return 1.0; // On time
    }

    // Late - penalize based on days late
    const daysLate = (eta - deadline) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - daysLate * 0.1);
}

function calculateSKUMatchScore(offer: Offer, intent: IntentRequest): number {
    if (!intent.item.canonical_sku) {
        return 0.8; // No SKU to match against
    }

    const match = matchSKU(offer.item_sku || '', intent.item.canonical_sku);
    return match.score;
}

// ============================================================================
// Explanation Generator
// ============================================================================

function generateExplanation(scores: ScoreBreakdown): string {
    const reasons: string[] = [];

    if (scores.price_score > 0.3) {
        reasons.push('💰 价格有竞争力');
    }
    if (scores.reputation_score > 0.8) {
        reasons.push('⭐ 商家信誉优秀');
    }
    if (scores.delivery_score >= 0.9) {
        reasons.push('🚀 可按时送达');
    }
    if (scores.sku_match_score >= 0.9) {
        reasons.push('✅ 完全匹配需求');
    }
    if (scores.validation_penalty > 0.05) {
        reasons.push('⚠️ 存在轻微警告');
    }

    return reasons.length > 0 ? reasons.join(' · ') : '综合评分推荐';
}

export { generateExplanation };
