/**
 * E2E Test Suite for Intent Router Integration
 * L.I.X. v0.3: Domain Mismatch Protection
 * 
 * Tests the full flow from intent classification through offer validation
 */

import { routeIntent, testRouting, generateFallback } from '../../services/intentRouterService';
import type { IntentRequest, Offer } from '../../services/lixTypes';
import type { RouteResult } from '../../services/intentRouterTypes';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockIntent(query: string, vertical?: string): IntentRequest {
    return {
        intent_id: `test_intent_${Date.now()}`,
        publisher_pseudonym: 'test_pub',
        category: 'purchase',
        item: {
            name: query,
            specs: {},
            quantity: 1
        },
        constraints: {
            currency: 'CNY',
            location_granularity: 'city',
            location_code: 'SHA'
        },
        user_confirmed: true,
        intent_strength_score: 1.0,
        confirmation_required: false,
        anonymity_level: 'pseudonymous',
        validity_window_sec: 3600,
        nonce: 'test_nonce',
        created_at: new Date().toISOString(),
        trace: { trace_id: 'test_trace', span_id: 'test_span' },
        vertical: vertical as any
    };
}

function createMockOffer(domain: string, offerType: string, providerId: string): Partial<Offer> {
    return {
        offer_id: `test_offer_${Date.now()}`,
        intent_id: 'test_intent',
        provider: {
            id: providerId,
            name: providerId.toUpperCase(),
            type: 'B2C',
            reputation_score: 0.8,
            verified: true
        },
        price: {
            amount: 100,
            currency: 'CNY',
            breakdown: {
                base: 100,
                discount: 0,
                shipping: 0,
            }
        },
        domain: domain as any,
        offer_type: offerType as any,
        source_provider_group: (domain === 'commerce' ? 'ecommerce' : domain) as any,
        trace: { trace_id: 'test_trace', span_id: 'test_span' }
    };
}

// ============================================================================
// Test Cases
// ============================================================================

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean, details: string = '') {
    try {
        const passed = fn();
        results.push({ name, passed, details: passed ? '✅ ' + details : '❌ ' + details });
    } catch (e: any) {
        results.push({ name, passed: false, details: `❌ Error: ${e.message}` });
    }
}

// ============================================================================
// Test Suite: Intent Router Classification
// ============================================================================

console.log('\n===== E2E Test Suite: Domain Mismatch Protection =====\n');
console.log('Testing Intent Router Classification...\n');

// Test 1: Ticketing queries classified correctly
test('Ticketing: Train ticket query', () => {
    const intent = createMockIntent('帮我买北京到上海明天的火车票');
    const result = routeIntent(intent);
    return result.intent_domain === 'ticketing' &&
        result.intent_subtype === 'train_ticket' &&
        result.provider_group_blocklist.includes('ecommerce');
}, 'train ticket -> ticketing domain, blocks ecommerce');

test('Ticketing: Flight ticket query', () => {
    const intent = createMockIntent('周末去成都的机票');
    const result = routeIntent(intent);
    return result.intent_domain === 'ticketing' &&
        result.provider_group_blocklist.includes('ecommerce');
}, 'flight ticket -> ticketing domain');

test('Ticketing: Concert ticket', () => {
    const intent = createMockIntent('周杰伦演唱会门票');
    const result = routeIntent(intent);
    return result.intent_domain === 'ticketing' &&
        result.intent_subtype === 'concert_ticket';
}, 'concert ticket -> ticketing/concert');

// Test 2: Commerce queries classified correctly
test('Commerce: iPhone purchase', () => {
    const intent = createMockIntent('iPhone 16 Pro Max 多少钱');
    const result = routeIntent(intent);
    return result.intent_domain === 'commerce' &&
        result.provider_group_allowlist.includes('ecommerce');
}, 'iPhone query -> commerce domain');

test('Commerce: PDD百亿补贴', () => {
    const intent = createMockIntent('拼多多百亿补贴手机');
    const result = routeIntent(intent);
    return result.intent_domain === 'commerce';
}, 'PDD subsidy -> commerce domain');

// Test 3: Other domains
test('Food: Delivery', () => {
    const intent = createMockIntent('点个外卖');
    const result = routeIntent(intent);
    return result.intent_domain === 'food' &&
        result.intent_subtype === 'food_delivery';
}, 'food delivery -> food domain');

test('Local Service: Cleaning', () => {
    const intent = createMockIntent('找个保洁阿姨');
    const result = routeIntent(intent);
    return result.intent_domain === 'local_service' &&
        result.intent_subtype === 'cleaning';
}, 'cleaning -> local_service domain');

test('Talent: Designer', () => {
    const intent = createMockIntent('找个设计师做logo');
    const result = routeIntent(intent);
    return result.intent_domain === 'talent' &&
        result.intent_subtype === 'design';
}, 'designer -> talent domain');

// ============================================================================
// Test Suite: Provider Filtering
// ============================================================================

console.log('\nTesting Provider Filtering...\n');

test('Ticketing blocks ecommerce providers', () => {
    const intent = createMockIntent('火车票');
    const result = routeIntent(intent);
    return result.provider_group_blocklist.includes('ecommerce') &&
        result.provider_group_blocklist.includes('food');
}, 'ticketing blocklist contains ecommerce & food');

test('Commerce allows ecommerce providers', () => {
    const intent = createMockIntent('买手机');
    const result = routeIntent(intent);
    return result.provider_group_allowlist.includes('ecommerce') &&
        result.provider_group_blocklist.length === 0;
}, 'commerce allowlist contains ecommerce, no blocklist');

test('Food blocks ticketing providers', () => {
    const intent = createMockIntent('美团外卖');
    const result = routeIntent(intent);
    return result.provider_group_blocklist.includes('ticketing');
}, 'food blocklist contains ticketing');

// ============================================================================
// Test Suite: Entity Extraction
// ============================================================================

console.log('\nTesting Entity Extraction...\n');

test('Extract cities from query', () => {
    const intent = createMockIntent('北京到上海的火车票');
    const result = routeIntent(intent);
    const cities = result.extracted_entities.cities || [];
    return cities.includes('北京') && cities.includes('上海');
}, 'extracts cities: 北京, 上海');

test('Extract dates from query', () => {
    const intent = createMockIntent('明天去成都');
    const result = routeIntent(intent);
    const dates = result.extracted_entities.dates || [];
    return dates.includes('明天');
}, 'extracts date: 明天');

test('Entity presence boosts confidence', () => {
    const intentWithEntities = createMockIntent('北京到上海明天的火车票');
    const intentWithoutEntities = createMockIntent('火车票');
    const resultWith = routeIntent(intentWithEntities);
    const resultWithout = routeIntent(intentWithoutEntities);
    return resultWith.route_confidence > resultWithout.route_confidence;
}, 'more entities = higher confidence');

// ============================================================================
// Test Suite: Fallback Generation
// ============================================================================

console.log('\nTesting Fallback Generation...\n');

test('Ticketing fallback has paste_link option', () => {
    const fallback = generateFallback('ticketing', 'no_provider');
    return fallback.user_options.some(opt => opt.action_type === 'paste_link');
}, 'ticketing fallback has paste_link');

test('Ticketing fallback has upload_screenshot option', () => {
    const fallback = generateFallback('ticketing', 'no_provider');
    return fallback.user_options.some(opt => opt.action_type === 'upload_screenshot');
}, 'ticketing fallback has upload_screenshot');

test('Fallback has CTA message', () => {
    const fallback = generateFallback('ticketing', 'no_provider');
    return fallback.cta_message.length > 0;
}, 'fallback has non-empty CTA message');

// ============================================================================
// Test Suite: Priority Resolution
// ============================================================================

console.log('\nTesting Priority Resolution...\n');

test('Ticketing priority > Commerce', () => {
    const intent = createMockIntent('买火车票价格对比'); // mixed ticketing + commerce
    const result = routeIntent(intent);
    return result.intent_domain === 'ticketing';
}, 'mixed query prioritizes ticketing over commerce');

test('Ticketing priority > Travel', () => {
    const intent = createMockIntent('去成都的机票'); // mixed ticketing + travel
    const result = routeIntent(intent);
    return result.intent_domain === 'ticketing';
}, 'mixed query prioritizes ticketing over travel');

// ============================================================================
// Print Results
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('TEST RESULTS');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;

for (const r of results) {
    if (r.passed) {
        passed++;
        console.log(`✅ ${r.name}`);
        console.log(`   ${r.details}`);
    } else {
        failed++;
        console.log(`❌ ${r.name}`);
        console.log(`   ${r.details}`);
    }
}

console.log('\n' + '='.repeat(60));
console.log(`SUMMARY: ${passed}/${passed + failed} tests passed`);
if (failed > 0) {
    console.log(`⚠️  ${failed} tests failed`);
    process.exit(1);
} else {
    console.log('✅ All tests passed!');
}
console.log('='.repeat(60) + '\n');
