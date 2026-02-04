/**
 * Freshness Classifier - Phase 3 Production
 * 
 * Determines if a query requires real-time data retrieval
 * and provides RouteDecision for the orchestration layer.
 */

// ============================================================================
// Types (per spec)
// ============================================================================

export type IntentDomain =
    | 'travel.flight'
    | 'travel.train'
    | 'travel.hotel'
    | 'ecommerce.product'
    | 'local.service'
    | 'knowledge'
    | 'finance'
    | 'news';

export interface RouteDecision {
    intent_domain: IntentDomain;
    needs_live_data: boolean;
    reason: string;
    missing_constraints?: string[];
    live_keywords_matched: string[];
    confidence: number;
}

export interface StructuredFallback {
    failure_reason: string;
    missing_constraints: string[];
    cta_buttons: Array<{
        label: string;
        action: 'add_constraint' | 'refresh_search' | 'show_guide' | 'set_alert';
        constraint_key?: string;
    }>;
}

// ============================================================================
// Keyword Patterns - Per Spec
// ============================================================================

/**
 * Keywords that ALWAYS trigger live data requirement
 */
const LIVE_DATA_KEYWORDS = [
    // Travel - must be real-time
    '机票', '航班', '飞机票', '票价', '余票',
    '火车票', '高铁票', '车票', '车次', '时刻表',
    '酒店', '住宿', '房价', '空房',
    // Freshness indicators
    '今天', '明天', '最新', '实时', '现在',
    '当前', '即时', '最近', '刚刚',
    // Price-sensitive
    '价格', '多少钱', '报价', '费用',
    // Location-based
    'near me', '附近', '周边',
];

/**
 * Domain detection patterns with priority order
 */
const DOMAIN_PATTERNS: Array<{
    domain: IntentDomain;
    patterns: RegExp[];
    keywords: string[];
    missing_constraints_template: string[];
}> = [
        {
            domain: 'travel.flight',
            patterns: [
                /从(.+)到(.+)的?(机票|航班|飞机)/,
                /(机票|航班|飞机票|飞往|直飞)/,
                /(\S+)飞(\S+)/,
                /flight/i,
            ],
            keywords: ['机票', '航班', '飞机', '直飞', '飞往', '航空', '起飞', '降落', 'flight', 'airline'],
            missing_constraints_template: ['出发日期', '舱位偏好（经济/商务）', '乘客人数'],
        },
        {
            domain: 'travel.train',
            patterns: [
                /从(.+)到(.+)的?(火车|高铁|动车|车票)/,
                /(火车票|高铁票|动车票|车次)/,
            ],
            keywords: ['火车', '高铁', '动车', '火车票', '车次', '列车', '12306', 'train'],
            missing_constraints_template: ['出发日期', '座位类型（二等座/一等座）', '时间段'],
        },
        {
            domain: 'travel.hotel',
            patterns: [
                /(\S+)(酒店|住宿|民宿|宾馆)/,
                /(预订|预定)(酒店|房间)/,
                /hotel/i,
            ],
            keywords: ['酒店', '住宿', '民宿', '宾馆', '旅馆', '入住', '退房', 'hotel'],
            missing_constraints_template: ['入住日期', '离店日期', '房型偏好'],
        },
        {
            domain: 'finance',
            patterns: [
                /(股票|股价|基金|黄金|比特币|汇率)/,
                /stock|bitcoin|gold price/i,
            ],
            keywords: ['股票', '股价', '基金', '黄金', '比特币', '汇率', '期货', 'stock', 'bitcoin'],
            missing_constraints_template: [],
        },
        {
            domain: 'news',
            patterns: [
                /(新闻|头条|资讯|最新消息)/,
                /news|headlines/i,
            ],
            keywords: ['新闻', '头条', '资讯', '热点', '快讯', 'news'],
            missing_constraints_template: [],
        },
        {
            domain: 'ecommerce.product',
            patterns: [
                /(买|购买|下单|选购)(.+)/,
                /(.+)(价格|多少钱|报价)/,
            ],
            keywords: ['购买', '下单', '加购', '京东', '淘宝', '拼多多', '天猫', 'buy', 'purchase'],
            missing_constraints_template: ['价格区间', '品牌偏好', '配送时效'],
        },
        {
            domain: 'local.service',
            patterns: [
                /(附近|周边)的?(.+)/,
                /(.+)(外卖|送餐|配送)/,
                /near me/i,
            ],
            keywords: ['外卖', '送餐', '附近', '周边', '美团', '饿了么', 'nearby'],
            missing_constraints_template: ['具体位置', '服务类型'],
        },
    ];

// ============================================================================
// Observability Logging
// ============================================================================

function logRouteDecision(decision: RouteDecision, query: string): void {
    console.log(`[FreshnessClassifier] route.decision:`, {
        domain: decision.intent_domain,
        needs_live_data: decision.needs_live_data,
        reason: decision.reason,
        query_preview: query.slice(0, 30),
    });
}

// ============================================================================
// Main Classifier
// ============================================================================

/**
 * Classify query and produce RouteDecision
 */
export function classifyFreshness(query: string): RouteDecision {
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Check for live data keywords
    const matchedKeywords = LIVE_DATA_KEYWORDS.filter(kw =>
        normalizedQuery.includes(kw.toLowerCase())
    );

    // 2. Detect domain with priority
    let detectedDomain: IntentDomain = 'knowledge';
    let domainConfidence = 0.3;
    let domainReason = '未检测到特定领域';
    let missingConstraints: string[] = [];

    for (const domainPattern of DOMAIN_PATTERNS) {
        // Check keywords first (faster)
        const keywordMatch = domainPattern.keywords.some(kw =>
            normalizedQuery.includes(kw.toLowerCase())
        );

        if (keywordMatch) {
            detectedDomain = domainPattern.domain;
            domainConfidence = 0.8;
            domainReason = `检测到${domainPattern.domain}相关关键词`;
            missingConstraints = [...domainPattern.missing_constraints_template];
            break;
        }

        // Check regex patterns (more precise)
        const patternMatch = domainPattern.patterns.some(p => p.test(normalizedQuery));

        if (patternMatch) {
            detectedDomain = domainPattern.domain;
            domainConfidence = 0.9;
            domainReason = `匹配${domainPattern.domain}语义模式`;
            missingConstraints = [...domainPattern.missing_constraints_template];
            break;
        }
    }

    // 3. Determine if live data is needed
    const needsLiveData = matchedKeywords.length > 0 ||
        detectedDomain.startsWith('travel.') ||
        detectedDomain === 'local.service' ||
        detectedDomain === 'finance' ||
        detectedDomain === 'news';

    // 4. Build reason string
    let reason: string;
    if (needsLiveData) {
        if (matchedKeywords.length > 0) {
            reason = `检测到实时关键词: ${matchedKeywords.slice(0, 3).join(', ')}`;
        } else {
            reason = `${detectedDomain} 领域默认需要实时数据`;
        }
    } else {
        reason = '该查询可使用缓存或知识库回答';
    }

    // 5. Adjust confidence
    let confidence = domainConfidence;
    if (matchedKeywords.length >= 2) confidence = Math.min(confidence + 0.1, 1.0);

    // 6. Check for already-provided constraints in query
    // Remove constraints that appear to be already in the query
    const filteredConstraints = missingConstraints.filter(constraint => {
        const constraintKeywords: Record<string, string[]> = {
            '出发日期': ['日', '月', '号', '周', '今天', '明天', '后天'],
            '入住日期': ['日', '月', '号', '入住'],
            '离店日期': ['日', '月', '号', '离店', '退房'],
            '乘客人数': ['人', '位', '个人'],
            '舱位偏好（经济/商务）': ['经济舱', '商务舱', '头等舱'],
            '座位类型（二等座/一等座）': ['二等座', '一等座', '商务座'],
        };

        const keywords = constraintKeywords[constraint] || [];
        return !keywords.some(kw => normalizedQuery.includes(kw));
    });

    const decision: RouteDecision = {
        intent_domain: detectedDomain,
        needs_live_data: needsLiveData,
        reason,
        missing_constraints: filteredConstraints.length > 0 ? filteredConstraints.slice(0, 3) : undefined,
        live_keywords_matched: matchedKeywords,
        confidence,
    };

    // Log for observability
    logRouteDecision(decision, query);

    return decision;
}

/**
 * Create structured fallback when live retrieval fails
 */
export function createStructuredFallback(
    domain: IntentDomain,
    failureReason: string,
    missingConstraints?: string[]
): StructuredFallback {
    // Use provided constraints or get defaults from domain
    let constraints = missingConstraints || [];

    if (constraints.length === 0) {
        const domainPattern = DOMAIN_PATTERNS.find(d => d.domain === domain);
        constraints = domainPattern?.missing_constraints_template.slice(0, 3) || [];
    }

    // Build CTAs
    const ctas: StructuredFallback['cta_buttons'] = [];

    // Add constraint-specific CTAs
    constraints.slice(0, 2).forEach(constraint => {
        ctas.push({
            label: `选择${constraint}`,
            action: 'add_constraint',
            constraint_key: constraint,
        });
    });

    // Always add refresh CTA
    ctas.push({
        label: '刷新搜索',
        action: 'refresh_search',
    });

    return {
        failure_reason: failureReason,
        missing_constraints: constraints.slice(0, 3),
        cta_buttons: ctas,
    };
}

/**
 * Check if domain prefix matches (for domain gate)
 */
export function isDomainMatch(sourceDomain: string, targetDomain: string): boolean {
    if (sourceDomain === targetDomain) return true;

    const sourcePrefix = sourceDomain.split('.')[0];
    const targetPrefix = targetDomain.split('.')[0];

    return sourcePrefix === targetPrefix;
}

/**
 * Domain gate: filter offers by intent domain
 * Per spec: travel.* queries must NOT show ecommerce.* offers
 */
export function shouldShowOffer(intentDomain: IntentDomain, offerDomain: string): boolean {
    const intentPrefix = intentDomain.split('.')[0];
    const offerPrefix = offerDomain.split('.')[0];

    // Strict gating: only show same-prefix offers
    if (intentPrefix === 'travel' && offerPrefix === 'ecommerce') {
        console.log(`[DomainGate] BLOCKED: travel intent cannot show ecommerce offer`);
        return false;
    }

    if (intentPrefix === 'ecommerce' && offerPrefix === 'travel') {
        console.log(`[DomainGate] BLOCKED: ecommerce intent cannot show travel offer`);
        return false;
    }

    return true;
}

/**
 * Get domain prefix for filtering
 */
export function getDomainPrefix(domain: string): string {
    return domain.split('.')[0];
}

// ============================================================================
// Exports
// ============================================================================

export default {
    classifyFreshness,
    createStructuredFallback,
    isDomainMatch,
    shouldShowOffer,
    getDomainPrefix,
};
