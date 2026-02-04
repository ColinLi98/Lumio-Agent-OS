/**
 * Intent Router Service
 * L.I.X. v0.3: Domain Mismatch Protection
 * 
 * Routes intents to appropriate provider groups based on domain classification.
 * Outputs allowlist/blocklist for fanout filtering.
 */

import type { IntentRequest } from './lixTypes';
import {
    IntentDomain,
    IntentSubtype,
    ProviderGroup,
    RouteResult,
    ExtractedEntities,
    FallbackResponse,
    FallbackOption,
    OfferType,
    TICKETING_FALLBACK_OPTIONS,
    FALLBACK_MESSAGES,
} from './intentRouterTypes';
import { eventBus } from './eventBus';

// ============================================================================
// Classification Patterns
// ============================================================================

// Priority: ticketing > travel > food > local_service > talent > ecommerce

const PATTERNS: Record<IntentDomain, {
    keywords: RegExp;
    subtypes: Record<string, RegExp>;
    priority: number;
}> = {
    ticketing: {
        keywords: /车票|火车票|高铁票|动车票|机票|飞机票|航班|票务|演唱会票|门票|电影票|球票|赛事票|买票|订票|抢票|12306|去哪儿|携程机票|飞猪/,
        subtypes: {
            train_ticket: /车票|火车票|高铁|动车|火车|12306|站/,
            flight_ticket: /机票|飞机票|航班|飞|航线|机场/,
            bus_ticket: /汽车票|大巴|客运/,
            concert_ticket: /演唱会|音乐会|live|演出/,
            movie_ticket: /电影票|影院|电影院/,
            sports_ticket: /球票|比赛|赛事|体育/,
        },
        priority: 100
    },
    travel: {
        keywords: /订酒店|住宿|酒店预订|民宿|签证|办签证|旅游|自由行|跟团|景点|门票(?!.*演唱会)/,
        subtypes: {
            hotel: /酒店|住宿|民宿|宾馆|旅馆|入住|退房/,
            visa: /签证|办签|签注/,
            travel_package: /旅游|跟团|自由行|度假/,
        },
        priority: 90
    },
    food: {
        keywords: /外卖|点餐|订餐|美团外卖|饿了么|送餐|餐厅预订|订位|预约餐厅/,
        subtypes: {
            food_delivery: /外卖|点餐|送餐|美团|饿了么/,
            restaurant_reservation: /餐厅|订位|预约|订座/,
        },
        priority: 80
    },
    local_service: {
        keywords: /保洁|阿姨|家政|搬家|维修|安装|上门|师傅|疏通|开锁|月嫂|护工|钟点工/,
        subtypes: {
            cleaning: /保洁|阿姨|家政|清洁|打扫/,
            moving: /搬家|搬运/,
            repair: /维修|修理|修|坏了/,
            installation: /安装|装/,
        },
        priority: 70
    },
    talent: {
        keywords: /找人|设计师|程序员|开发者|翻译|写手|美工|摄影|外包|兼职|做logo|代写|代做|教我|画师|剪辑/,
        subtypes: {
            design: /设计师|logo|美工|UI|画师|插画/,
            development: /程序员|开发者|开发|前端|后端|全栈|写代码/,
            writing: /写手|代写|文案|文章/,
            translation: /翻译|英语|日语/,
        },
        priority: 60
    },
    education: {
        keywords: /学|课程|培训|辅导|家教|教练|考试|备考|学习|网课|在线课/,
        subtypes: {
            tutoring: /家教|辅导|补习|补课/,
            course: /课程|培训|网课|学习/,
            certification: /考试|备考|认证|证书/,
        },
        priority: 50
    },
    commerce: {
        keywords: /买|购买|多少钱|价格|便宜|优惠|下单|购物|手机|电脑|耳机|电器|商品|产品|淘宝|京东|拼多多|百亿补贴|秒杀/,
        subtypes: {
            product_purchase: /买|购买|下单|商品|产品/,
            price_compare: /价格|多少钱|便宜|比价|优惠/,
        },
        priority: 10
    },
    other: {
        keywords: /.*/,
        subtypes: { general: /.*/ },
        priority: 0
    }
};

// Domain to provider group mapping
const DOMAIN_TO_PROVIDERS: Record<IntentDomain, ProviderGroup[]> = {
    ticketing: ['ticketing', 'travel'],
    travel: ['travel', 'ticketing'],
    food: ['food'],
    local_service: ['local_service'],
    talent: ['talent', 'local_service'],
    education: ['local_service', 'talent'],
    commerce: ['ecommerce'],
    other: ['ecommerce', 'local_service'],
};

// Domain blocklists (explicit blocks)
const DOMAIN_BLOCKLIST: Record<IntentDomain, ProviderGroup[]> = {
    ticketing: ['ecommerce', 'food'],
    travel: ['ecommerce', 'food'],
    food: ['ecommerce', 'ticketing'],
    local_service: ['ecommerce', 'ticketing', 'food'],
    talent: ['ecommerce', 'ticketing', 'food'],
    education: ['ecommerce', 'ticketing', 'food'],
    commerce: [],  // ecommerce accepts all
    other: [],
};

// City patterns for entity extraction
const CITY_PATTERN = /(北京|上海|广州|深圳|杭州|成都|重庆|武汉|西安|南京|天津|苏州|长沙|郑州|东莞|青岛|沈阳|宁波|昆明|大连|厦门|合肥|无锡|福州|济南|哈尔滨|佛山|长春|温州|石家庄|南宁|常州|泉州|南昌|贵阳|太原|烟台|嘉兴|南通|金华|徐州|惠州|珠海|中山)/g;

// Date patterns
const DATE_PATTERN = /(\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|今天|明天|后天|周[一二三四五六日]|下周|这周末|春节|国庆|五一)/g;

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Route an intent to the appropriate domain and provider groups
 */
export function routeIntent(request: IntentRequest): RouteResult {
    const text = normalizeText(request);

    // Extract entities
    const entities = extractEntities(text);

    // Classify domain (priority-based)
    let bestMatch: { domain: IntentDomain; subtype: IntentSubtype; confidence: number; patterns: string[] } = {
        domain: 'other',
        subtype: 'general',
        confidence: 0.1,
        patterns: []
    };

    for (const [domain, config] of Object.entries(PATTERNS) as [IntentDomain, typeof PATTERNS[IntentDomain]][]) {
        if (domain === 'other') continue;

        const match = text.match(config.keywords);
        if (match) {
            const confidence = calculateConfidence(text, config.keywords, entities);

            // Higher priority domains win on tie
            if (confidence > bestMatch.confidence ||
                (confidence === bestMatch.confidence && config.priority > PATTERNS[bestMatch.domain].priority)) {

                // Find subtype
                let subtype: IntentSubtype = 'general';
                for (const [st, pattern] of Object.entries(config.subtypes)) {
                    if (pattern.test(text)) {
                        subtype = st as IntentSubtype;
                        break;
                    }
                }

                bestMatch = {
                    domain: domain,
                    subtype,
                    confidence,
                    patterns: match.map(m => m)
                };
            }
        }
    }

    // Build route result
    const result: RouteResult = {
        intent_domain: bestMatch.domain,
        intent_subtype: bestMatch.subtype,
        provider_group_allowlist: DOMAIN_TO_PROVIDERS[bestMatch.domain] || ['ecommerce'],
        provider_group_blocklist: DOMAIN_BLOCKLIST[bestMatch.domain] || [],
        route_confidence: bestMatch.confidence,
        route_reason: buildRouteReason(bestMatch.domain, bestMatch.patterns, entities),
        matched_patterns: bestMatch.patterns,
        extracted_entities: entities,

        // ================================================================
        // Domain Guard: HARD ENFORCEMENT
        // Only 'commerce' domain allows market fanout to e-commerce providers
        // All other domains (travel, transport, ticket, etc.) are BLOCKED
        // ================================================================
        allow_market_fanout: bestMatch.domain === 'commerce',
        expected_offer_type: getExpectedOfferType(bestMatch.domain),

        // Contract layer: Explicit blocking info for debugging
        domain: bestMatch.domain,
        domain_guard_blocked: bestMatch.domain !== 'commerce',
        blocked_tools: bestMatch.domain !== 'commerce' ? ['broadcast_intent', 'open_market'] : [],
        domain_guard_reason: bestMatch.domain !== 'commerce'
            ? `DOMAIN_GUARD: domain=${bestMatch.domain} is not commerce, market fanout blocked`
            : undefined,
    };

    // Emit routing event
    emitRouteEvent(request, result);

    return result;
}

/**
 * Check if a provider group is allowed for an intent
 */
export function isProviderAllowed(
    providerGroup: ProviderGroup,
    routeResult: RouteResult
): boolean {
    // Explicitly blocked
    if (routeResult.provider_group_blocklist.includes(providerGroup)) {
        return false;
    }

    // Explicitly allowed
    if (routeResult.provider_group_allowlist.includes(providerGroup)) {
        return true;
    }

    // Default: not allowed
    return false;
}

/**
 * Generate fallback response when no valid offers available
 */
export function generateFallback(
    domain: IntentDomain,
    fallbackType: 'no_provider' | 'all_rejected' | 'timeout'
): FallbackResponse {
    // Get appropriate fallback options based on domain
    let options: FallbackOption[];

    switch (domain) {
        case 'ticketing':
        case 'travel':
            options = TICKETING_FALLBACK_OPTIONS;
            break;
        default:
            options = [
                {
                    id: 'manual_input',
                    label: '描述你的需求',
                    description: '详细描述你的需求，我帮你生成计划',
                    action_type: 'manual_input',
                    icon: '✏️'
                },
                {
                    id: 'save_task',
                    label: '保存为任务',
                    description: '保存到任务列表，稍后处理',
                    action_type: 'save_task',
                    icon: '📋'
                }
            ];
    }

    return {
        fallback_triggered: true,
        fallback_type: fallbackType,
        intent_domain: domain,
        user_options: options,
        cta_message: FALLBACK_MESSAGES[domain]
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get expected offer type based on domain (for result contract validation)
 */
function getExpectedOfferType(domain: IntentDomain): OfferType {
    switch (domain) {
        case 'commerce':
            return 'product';
        case 'ticketing':
        case 'travel':
            return 'ticket';
        case 'food':
        case 'local_service':
            return 'booking';
        case 'talent':
        case 'education':
            return 'quote';
        default:
            return 'lead';
    }
}

function normalizeText(request: IntentRequest): string {
    const parts: string[] = [];

    if (request.item?.name) parts.push(request.item.name);
    if (request.item?.specs) {
        parts.push(...Object.values(request.item.specs));
    }

    return parts.join(' ').toLowerCase();
}

function extractEntities(text: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Extract cities
    const cityMatches = text.match(CITY_PATTERN);
    if (cityMatches) {
        entities.cities = [...new Set(cityMatches)];
    }

    // Extract dates
    const dateMatches = text.match(DATE_PATTERN);
    if (dateMatches) {
        entities.dates = [...new Set(dateMatches)];
    }

    // Extract brands (simplified)
    const brandPattern = /(苹果|Apple|华为|小米|OPPO|vivo|三星|索尼|Nike|Adidas|优衣库)/gi;
    const brandMatches = text.match(brandPattern);
    if (brandMatches) {
        entities.brands = [...new Set(brandMatches.map(b => b.toLowerCase()))];
    }

    return entities;
}

function calculateConfidence(
    text: string,
    pattern: RegExp,
    entities: ExtractedEntities
): number {
    let confidence = 0.5;

    // More matches = higher confidence
    const matches = text.match(pattern);
    if (matches) {
        confidence += Math.min(matches.length * 0.1, 0.3);
    }

    // Entity presence boosts confidence
    if (entities.cities && entities.cities.length > 0) confidence += 0.1;
    if (entities.dates && entities.dates.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
}

function buildRouteReason(
    domain: IntentDomain,
    patterns: string[],
    entities: ExtractedEntities
): string {
    const parts: string[] = [];

    if (patterns.length > 0) {
        parts.push(`匹配关键词: ${patterns.slice(0, 3).join(', ')}`);
    }

    if (entities.cities && entities.cities.length > 0) {
        parts.push(`识别城市: ${entities.cities.join(', ')}`);
    }

    if (entities.dates && entities.dates.length > 0) {
        parts.push(`识别日期: ${entities.dates.join(', ')}`);
    }

    parts.push(`路由到: ${domain}`);

    return parts.join(' | ');
}

function emitRouteEvent(request: IntentRequest, result: RouteResult): void {
    eventBus.emit({
        event_type: 'intent.vertical_detected',
        trace_id: request.trace?.trace_id || `route_${Date.now()}`,
        timestamp: Date.now(),
        intent_id: request.intent_id,
        payload: {
            domain: result.intent_domain,
            subtype: result.intent_subtype,
            confidence: result.route_confidence,
            allowlist: result.provider_group_allowlist,
            blocklist: result.provider_group_blocklist
        }
    } as any);
}

// ============================================================================
// Testing / Debug Utilities
// ============================================================================

/**
 * Test classification for a list of queries (for unit testing)
 */
export function testRouting(queries: string[]): Array<{
    query: string;
    domain: IntentDomain;
    subtype: IntentSubtype;
    confidence: number;
    allowlist: ProviderGroup[];
    blocklist: ProviderGroup[];
}> {
    return queries.map(query => {
        const mockRequest: IntentRequest = {
            intent_id: `test_${Date.now()}`,
            publisher_pseudonym: 'test',
            category: 'purchase',
            item: { name: query, specs: {}, quantity: 1 },
            constraints: { currency: 'CNY', location_granularity: 'national' },
            user_confirmed: true,
            intent_strength_score: 1,
            confirmation_required: false,
            anonymity_level: 'pseudonymous',
            validity_window_sec: 3600,
            nonce: 'test',
            created_at: new Date().toISOString(),
            trace: { trace_id: 'test', span_id: 'test' }
        };

        const result = routeIntent(mockRequest);

        return {
            query,
            domain: result.intent_domain,
            subtype: result.intent_subtype,
            confidence: result.route_confidence,
            allowlist: result.provider_group_allowlist,
            blocklist: result.provider_group_blocklist
        };
    });
}

// Types are exported from intentRouterTypes.ts
// Re-export for convenience:
export type { IntentDomain, IntentSubtype, ProviderGroup, RouteResult, FallbackResponse } from './intentRouterTypes';
