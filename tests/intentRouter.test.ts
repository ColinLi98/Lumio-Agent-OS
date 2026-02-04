/**
 * Intent Router Unit Tests
 * L.I.X. v0.3: Domain Mismatch Protection
 * 
 * Tests for intent routing accuracy (target: ≥90%)
 */

import { describe, it, expect } from 'vitest';
import { routeIntent, testRouting, isProviderAllowed, generateFallback } from '../services/intentRouterService';
import type { IntentRequest } from '../services/lixTypes';
import type { IntentDomain, ProviderGroup, RouteResult } from '../services/intentRouterTypes';

// ============================================================================
// Test Data: 20+ Test Cases
// ============================================================================

interface TestCase {
    query: string;
    expectedDomain: IntentDomain;
    expectedSubtype: string;
    mustBlock: ProviderGroup[];
    mustAllow: ProviderGroup[];
}

const TEST_CASES: TestCase[] = [
    // =========== TICKETING (8 cases) ===========
    {
        query: '北京车票',
        expectedDomain: 'ticketing',
        expectedSubtype: 'train_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing', 'travel']
    },
    {
        query: '去北京火车票',
        expectedDomain: 'ticketing',
        expectedSubtype: 'train_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing']
    },
    {
        query: '北京到上海高铁票 2月10日',
        expectedDomain: 'ticketing',
        expectedSubtype: 'train_ticket',
        mustBlock: ['ecommerce', 'food'],
        mustAllow: ['ticketing']
    },
    {
        query: '机票 北京到伦敦',
        expectedDomain: 'ticketing',
        expectedSubtype: 'flight_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing', 'travel']
    },
    {
        query: '明天飞上海的航班',
        expectedDomain: 'ticketing',
        expectedSubtype: 'flight_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing']
    },
    {
        query: '周末上海演唱会票',
        expectedDomain: 'ticketing',
        expectedSubtype: 'concert_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing']
    },
    {
        query: '国庆去杭州的汽车票',
        expectedDomain: 'ticketing',
        expectedSubtype: 'bus_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing']
    },
    {
        query: '12306抢票',
        expectedDomain: 'ticketing',
        expectedSubtype: 'train_ticket',
        mustBlock: ['ecommerce'],
        mustAllow: ['ticketing']
    },

    // =========== COMMERCE (5 cases) ===========
    {
        query: '买 AirPods',
        expectedDomain: 'commerce',
        expectedSubtype: 'product_purchase',
        mustBlock: [],
        mustAllow: ['ecommerce']
    },
    {
        query: '拼多多百亿补贴 iPhone',
        expectedDomain: 'commerce',
        expectedSubtype: 'product_purchase',
        mustBlock: [],
        mustAllow: ['ecommerce']
    },
    {
        query: '华为Mate60 Pro价格',
        expectedDomain: 'commerce',
        expectedSubtype: 'price_compare',
        mustBlock: [],
        mustAllow: ['ecommerce']
    },
    {
        query: '淘宝买手机壳',
        expectedDomain: 'commerce',
        expectedSubtype: 'product_purchase',
        mustBlock: [],
        mustAllow: ['ecommerce']
    },
    {
        query: '京东电脑优惠',
        expectedDomain: 'commerce',
        expectedSubtype: 'price_compare',
        mustBlock: [],
        mustAllow: ['ecommerce']
    },

    // =========== TRAVEL (3 cases) ===========
    {
        query: '订酒店 北京 2/10-2/12',
        expectedDomain: 'travel',
        expectedSubtype: 'hotel',
        mustBlock: ['ecommerce'],
        mustAllow: ['travel']
    },
    {
        query: '日本签证怎么办',
        expectedDomain: 'travel',
        expectedSubtype: 'visa',
        mustBlock: ['ecommerce'],
        mustAllow: ['travel']
    },
    {
        query: '春节三亚自由行',
        expectedDomain: 'travel',
        expectedSubtype: 'travel_package',
        mustBlock: ['ecommerce'],
        mustAllow: ['travel']
    },

    // =========== LOCAL SERVICE (2 cases) ===========
    {
        query: '找保洁阿姨',
        expectedDomain: 'local_service',
        expectedSubtype: 'cleaning',
        mustBlock: ['ecommerce', 'ticketing'],
        mustAllow: ['local_service']
    },
    {
        query: '空调维修上门',
        expectedDomain: 'local_service',
        expectedSubtype: 'repair',
        mustBlock: ['ecommerce'],
        mustAllow: ['local_service']
    },

    // =========== TALENT (2 cases) ===========
    {
        query: '帮我找设计师做logo 500以内',
        expectedDomain: 'talent',
        expectedSubtype: 'design',
        mustBlock: ['ecommerce', 'ticketing'],
        mustAllow: ['talent']
    },
    {
        query: '找程序员做网站外包',
        expectedDomain: 'talent',
        expectedSubtype: 'development',
        mustBlock: ['ecommerce'],
        mustAllow: ['talent']
    },

    // =========== FOOD (2 cases) ===========
    {
        query: '美团外卖午餐',
        expectedDomain: 'food',
        expectedSubtype: 'food_delivery',
        mustBlock: ['ecommerce', 'ticketing'],
        mustAllow: ['food']
    },
    {
        query: '订餐厅位置 周六晚上',
        expectedDomain: 'food',
        expectedSubtype: 'restaurant_reservation',
        mustBlock: ['ecommerce'],
        mustAllow: ['food']
    },
];

// ============================================================================
// Helper: Create Mock IntentRequest
// ============================================================================

function createMockIntent(query: string): IntentRequest {
    return {
        intent_id: `test_${Date.now()}`,
        publisher_pseudonym: 'test_user',
        category: 'purchase',
        item: {
            name: query,
            specs: {},
            quantity: 1
        },
        constraints: {
            currency: 'CNY',
            location_granularity: 'national'
        },
        user_confirmed: true,
        intent_strength_score: 1,
        confirmation_required: false,
        anonymity_level: 'pseudonymous',
        validity_window_sec: 3600,
        nonce: `nonce_${Date.now()}`,
        created_at: new Date().toISOString(),
        trace: {
            trace_id: `trace_${Date.now()}`,
            span_id: `span_${Date.now()}`
        }
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('Intent Router', () => {
    describe('Domain Classification', () => {
        let passedCount = 0;

        TEST_CASES.forEach((tc, index) => {
            it(`[${index + 1}] "${tc.query}" → ${tc.expectedDomain}`, () => {
                const intent = createMockIntent(tc.query);
                const result = routeIntent(intent);

                // Check domain
                expect(result.intent_domain).toBe(tc.expectedDomain);
                passedCount++;
            });
        });

        it('should have ≥90% accuracy across all test cases', () => {
            const results = testRouting(TEST_CASES.map(tc => tc.query));
            const correctCount = results.filter((r, i) =>
                r.domain === TEST_CASES[i].expectedDomain
            ).length;

            const accuracy = correctCount / TEST_CASES.length;
            console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correctCount}/${TEST_CASES.length})`);

            expect(accuracy).toBeGreaterThanOrEqual(0.9);
        });
    });

    describe('Provider Group Filtering', () => {
        TEST_CASES.forEach((tc, index) => {
            it(`[${index + 1}] "${tc.query}" blocks ${tc.mustBlock.join(',')} and allows ${tc.mustAllow.join(',')}`, () => {
                const intent = createMockIntent(tc.query);
                const result = routeIntent(intent);

                // Check blocklist
                tc.mustBlock.forEach(blocked => {
                    expect(result.provider_group_blocklist).toContain(blocked);
                    expect(isProviderAllowed(blocked, result)).toBe(false);
                });

                // Check allowlist
                tc.mustAllow.forEach(allowed => {
                    expect(result.provider_group_allowlist).toContain(allowed);
                    expect(isProviderAllowed(allowed, result)).toBe(true);
                });
            });
        });
    });

    describe('Entity Extraction', () => {
        it('should extract cities from query', () => {
            const intent = createMockIntent('北京到上海高铁票');
            const result = routeIntent(intent);

            expect(result.extracted_entities.cities).toContain('北京');
            expect(result.extracted_entities.cities).toContain('上海');
        });

        it('should extract dates from query', () => {
            const intent = createMockIntent('明天飞广州的机票');
            const result = routeIntent(intent);

            expect(result.extracted_entities.dates).toContain('明天');
        });

        it('should extract brands from query', () => {
            const intent = createMockIntent('买苹果华为手机');
            const result = routeIntent(intent);

            expect(result.extracted_entities.brands).toContain('苹果');
            expect(result.extracted_entities.brands).toContain('华为');
        });
    });

    describe('Confidence Scores', () => {
        it('should have higher confidence for queries with more keywords', () => {
            const simpleIntent = createMockIntent('车票');
            const detailedIntent = createMockIntent('北京到上海高铁票 2月10日');

            const simpleResult = routeIntent(simpleIntent);
            const detailedResult = routeIntent(detailedIntent);

            expect(detailedResult.route_confidence).toBeGreaterThanOrEqual(simpleResult.route_confidence);
        });

        it('should have confidence between 0 and 1', () => {
            TEST_CASES.forEach(tc => {
                const intent = createMockIntent(tc.query);
                const result = routeIntent(intent);

                expect(result.route_confidence).toBeGreaterThanOrEqual(0);
                expect(result.route_confidence).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Subtype Classification', () => {
        it('should classify train tickets correctly', () => {
            const intent = createMockIntent('高铁票');
            const result = routeIntent(intent);
            expect(result.intent_subtype).toBe('train_ticket');
        });

        it('should classify flight tickets correctly', () => {
            const intent = createMockIntent('机票');
            const result = routeIntent(intent);
            expect(result.intent_subtype).toBe('flight_ticket');
        });

        it('should classify hotels correctly', () => {
            const intent = createMockIntent('订酒店');
            const result = routeIntent(intent);
            expect(result.intent_subtype).toBe('hotel');
        });
    });

    describe('Fallback Generation', () => {
        it('should generate fallback for ticketing domain', () => {
            const fallback = generateFallback('ticketing', 'no_provider');

            expect(fallback.fallback_triggered).toBe(true);
            expect(fallback.intent_domain).toBe('ticketing');
            expect(fallback.user_options.length).toBeGreaterThan(0);
            expect(fallback.cta_message).toContain('票务');
        });

        it('should include paste_link option for ticketing', () => {
            const fallback = generateFallback('ticketing', 'no_provider');

            const pasteOption = fallback.user_options.find(o => o.action_type === 'paste_link');
            expect(pasteOption).toBeDefined();
        });

        it('should include save_task option for all domains', () => {
            const domains: IntentDomain[] = ['ticketing', 'commerce', 'local_service'];

            domains.forEach(domain => {
                const fallback = generateFallback(domain, 'no_provider');
                const saveOption = fallback.user_options.find(o => o.action_type === 'save_task');
                expect(saveOption).toBeDefined();
            });
        });
    });

    describe('Route Reason', () => {
        it('should include matched keywords in reason', () => {
            const intent = createMockIntent('北京高铁票');
            const result = routeIntent(intent);

            expect(result.route_reason).toContain('匹配关键词');
        });

        it('should include domain in reason', () => {
            const intent = createMockIntent('买手机');
            const result = routeIntent(intent);

            expect(result.route_reason).toContain('路由到');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty query', () => {
            const intent = createMockIntent('');
            const result = routeIntent(intent);

            expect(result.intent_domain).toBeDefined();
            expect(result.route_confidence).toBeLessThan(0.5);
        });

        it('should handle mixed intent (prioritize ticketing over commerce)', () => {
            // "买火车票" contains both "买" (commerce) and "火车票" (ticketing)
            const intent = createMockIntent('买火车票');
            const result = routeIntent(intent);

            // Ticketing should win due to higher priority
            expect(result.intent_domain).toBe('ticketing');
            expect(result.provider_group_blocklist).toContain('ecommerce');
        });

        it('should handle query with only brand name', () => {
            const intent = createMockIntent('苹果');
            const result = routeIntent(intent);

            // Should detect as commerce or other
            expect(['commerce', 'other']).toContain(result.intent_domain);
        });
    });
});

describe('isProviderAllowed', () => {
    it('should return false for blocked providers', () => {
        const result: RouteResult = {
            intent_domain: 'ticketing',
            intent_subtype: 'train_ticket',
            provider_group_allowlist: ['ticketing', 'travel'],
            provider_group_blocklist: ['ecommerce'],
            route_confidence: 0.9,
            route_reason: 'test',
            matched_patterns: [],
            extracted_entities: {}
        };

        expect(isProviderAllowed('ecommerce', result)).toBe(false);
    });

    it('should return true for allowed providers', () => {
        const result: RouteResult = {
            intent_domain: 'ticketing',
            intent_subtype: 'train_ticket',
            provider_group_allowlist: ['ticketing', 'travel'],
            provider_group_blocklist: ['ecommerce'],
            route_confidence: 0.9,
            route_reason: 'test',
            matched_patterns: [],
            extracted_entities: {}
        };

        expect(isProviderAllowed('ticketing', result)).toBe(true);
        expect(isProviderAllowed('travel', result)).toBe(true);
    });

    it('should return false for unlisted providers', () => {
        const result: RouteResult = {
            intent_domain: 'ticketing',
            intent_subtype: 'train_ticket',
            provider_group_allowlist: ['ticketing'],
            provider_group_blocklist: [],
            route_confidence: 0.9,
            route_reason: 'test',
            matched_patterns: [],
            extracted_entities: {}
        };

        expect(isProviderAllowed('food', result)).toBe(false);
    });
});
