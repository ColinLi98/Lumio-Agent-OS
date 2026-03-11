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
    | 'recruitment'
    | 'health'
    | 'legal'
    | 'education'
    | 'productivity'
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
    domain_scores: Array<{
        domain: IntentDomain;
        score: number;
    }>;
    constraint_completeness: number;
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
            domain: 'recruitment',
            patterns: [
                /(招聘|招人|招募|面试|简历|岗位|候选人|hire|hiring|recruit|resume|cv)/i,
            ],
            keywords: ['招聘', '招人', '简历', '面试', '岗位', '候选人', 'hire', 'hiring', 'recruit', 'resume', 'cv'],
            missing_constraints_template: ['岗位/职级', '城市或远程', '预算或薪资范围', '到岗时限'],
        },
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
            missing_constraints_template: ['标的代码/名称', '时间范围', '风险偏好'],
        },
        {
            domain: 'health',
            patterns: [
                /(症状|发烧|咳嗽|头痛|胸闷|疼痛|用药|就医|体检|health|medical|symptom)/i,
            ],
            keywords: ['症状', '发烧', '咳嗽', '头痛', '疼痛', '用药', '就医', '体检', 'health', 'medical', 'symptom'],
            missing_constraints_template: ['主要症状与持续时间', '既往病史/过敏史', '当前用药'],
        },
        {
            domain: 'legal',
            patterns: [
                /(合同|诉讼|仲裁|法务|法律|律师|侵权|legal|law|contract|clause|lawsuit)/i,
            ],
            keywords: ['合同', '诉讼', '仲裁', '法务', '法律', '律师', '侵权', 'legal', 'law', 'contract', 'clause'],
            missing_constraints_template: ['司法辖区', '关键条款或争议点', '时间线与证据材料'],
        },
        {
            domain: 'education',
            patterns: [
                /(学习|课程|备考|考试|作业|教育|辅导|education|course|study|exam)/i,
            ],
            keywords: ['学习', '课程', '备考', '考试', '作业', '教育', '辅导', 'education', 'course', 'study', 'exam'],
            missing_constraints_template: ['学习目标', '当前水平', '可投入时间'],
        },
        {
            domain: 'productivity',
            patterns: [
                /(计划|待办|排期|日程|提醒|项目管理|效率|todo|schedule|productivity|task)/i,
            ],
            keywords: ['计划', '待办', '排期', '日程', '提醒', '项目管理', '效率', 'todo', 'schedule', 'productivity', 'task'],
            missing_constraints_template: ['截止时间', '优先级', '可用资源/工具'],
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
        top_domains: decision.domain_scores.slice(0, 3),
        constraint_completeness: decision.constraint_completeness,
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

    // 1) Check live-data signals
    const matchedKeywords = LIVE_DATA_KEYWORDS.filter(kw =>
        normalizedQuery.includes(kw.toLowerCase())
    );

    // 2) Multi-domain scoring (top-k), not only first-hit
    const scoreMap = new Map<IntentDomain, number>();
    const reasonMap = new Map<IntentDomain, string>();
    for (const pattern of DOMAIN_PATTERNS) {
        if (!scoreMap.has(pattern.domain)) {
            scoreMap.set(pattern.domain, 0);
        }
    }
    scoreMap.set('knowledge', Math.max(scoreMap.get('knowledge') || 0, 0.12));

    for (const domainPattern of DOMAIN_PATTERNS) {
        const keywordHits = domainPattern.keywords.filter((kw) =>
            normalizedQuery.includes(kw.toLowerCase())
        ).length;
        const regexHits = domainPattern.patterns.filter((p) => p.test(normalizedQuery)).length;
        const lexicalBoost = keywordHits > 0 ? Math.min(0.62, keywordHits * 0.18) : 0;
        const semanticBoost = regexHits > 0 ? Math.min(0.5, regexHits * 0.25) : 0;
        const totalBoost = Math.min(1.0, lexicalBoost + semanticBoost);
        if (totalBoost <= 0) continue;

        const prev = scoreMap.get(domainPattern.domain) || 0;
        scoreMap.set(domainPattern.domain, Math.max(prev, totalBoost));
        reasonMap.set(
            domainPattern.domain,
            keywordHits > 0
                ? `检测到${domainPattern.domain}关键词(${keywordHits})`
                : `匹配${domainPattern.domain}语义模式(${regexHits})`
        );
    }

    const rankedDomains = Array.from(scoreMap.entries())
        .map(([domain, score]) => ({ domain, score: Math.max(0, Math.min(1, score)) }))
        .sort((a, b) => b.score - a.score);

    const topDomain = rankedDomains[0];
    let detectedDomain: IntentDomain = 'knowledge';
    let domainConfidence = 0.3;
    let domainReason = '未检测到特定领域';
    let missingConstraints: string[] = [];
    if (topDomain && topDomain.score > 0.2) {
        detectedDomain = topDomain.domain as IntentDomain;
        domainConfidence = topDomain.score;
        domainReason = reasonMap.get(detectedDomain) || `${detectedDomain} scored highest`;
        const domainPattern = DOMAIN_PATTERNS.find((d) => d.domain === detectedDomain);
        missingConstraints = [...(domainPattern?.missing_constraints_template || [])];
    }

    // 3) Live data requirement
    const needsLiveData = matchedKeywords.length > 0 ||
        detectedDomain.startsWith('travel.') ||
        detectedDomain === 'local.service' ||
        detectedDomain === 'recruitment' ||
        detectedDomain === 'finance' ||
        detectedDomain === 'news';

    // 4) Human-readable reason
    let reason: string;
    if (needsLiveData) {
        if (matchedKeywords.length > 0) {
            reason = `检测到实时关键词: ${matchedKeywords.slice(0, 3).join(', ')}；${domainReason}`;
        } else {
            reason = `${detectedDomain} 领域默认需要实时数据`;
        }
    } else {
        reason = `${domainReason}；该查询可使用缓存或知识库回答`;
    }

    // 5) Confidence tuning
    let confidence = domainConfidence;
    if (matchedKeywords.length >= 2) confidence = Math.min(confidence + 0.1, 1.0);

    // 6) Remove already-provided constraints from ask-list
    const filteredConstraints = missingConstraints.filter(constraint => {
        const constraintKeywords: Record<string, string[]> = {
            '出发日期': ['日', '月', '号', '周', '今天', '明天', '后天'],
            '入住日期': ['日', '月', '号', '入住'],
            '离店日期': ['日', '月', '号', '离店', '退房'],
            '乘客人数': ['人', '位', '个人'],
            '舱位偏好（经济/商务）': ['经济舱', '商务舱', '头等舱'],
            '座位类型（二等座/一等座）': ['二等座', '一等座', '商务座'],
            '岗位/职级': ['岗位', '职级', '级别', 'role', 'level'],
            '城市或远程': ['城市', 'remote', '远程', 'onsite', 'location'],
            '预算或薪资范围': ['预算', '薪资', '工资', '年包', 'k', 'salary'],
            '到岗时限': ['到岗', '期限', 'deadline', '周', '天'],
            '标的代码/名称': ['股票', '基金', '代码', 'ticker', 'symbol'],
            '时间范围': ['今天', '本周', '本月', '近', '天', '周', '月', 'year', 'range'],
            '风险偏好': ['保守', '稳健', '激进', 'risk'],
            '主要症状与持续时间': ['症状', '疼', '痛', '咳嗽', '发烧', '天', '周', 'month'],
            '既往病史/过敏史': ['病史', '过敏', '慢性', 'history', 'allergy'],
            '当前用药': ['用药', '药物', '剂量', 'medication'],
            '司法辖区': ['中国', '英国', '美国', 'jurisdiction', '法域', '地区'],
            '关键条款或争议点': ['条款', '争议', '违约', '责任', 'clause', 'dispute'],
            '时间线与证据材料': ['证据', '时间线', 'timeline', '合同', '记录'],
            '学习目标': ['目标', '考试', '证书', '提升', 'goal'],
            '当前水平': ['基础', '水平', '入门', '中级', 'advanced'],
            '可投入时间': ['每天', '每周', '小时', '时间'],
            '截止时间': ['截止', 'deadline', 'due'],
            '优先级': ['优先级', '重要', '紧急', 'priority'],
            '可用资源/工具': ['工具', '资源', '预算', '团队', '软件'],
        };

        const keywords = constraintKeywords[constraint] || [];
        return !keywords.some(kw => normalizedQuery.includes(kw));
    });

    const baseConstraintCount = missingConstraints.length > 0 ? missingConstraints.length : 1;
    const constraintCompleteness = Math.max(
        0,
        Math.min(1, 1 - (filteredConstraints.length / baseConstraintCount))
    );
    const domainScores = rankedDomains
        .slice(0, 3)
        .map((item) => ({
            domain: item.domain as IntentDomain,
            score: Number(item.score.toFixed(2)),
        }));

    const decision: RouteDecision = {
        intent_domain: detectedDomain,
        needs_live_data: needsLiveData,
        reason,
        missing_constraints: filteredConstraints.length > 0 ? filteredConstraints.slice(0, 3) : undefined,
        live_keywords_matched: matchedKeywords,
        confidence: Number(confidence.toFixed(2)),
        domain_scores: domainScores.length > 0
            ? domainScores
            : [{ domain: detectedDomain, score: Number(confidence.toFixed(2)) }],
        constraint_completeness: Number(constraintCompleteness.toFixed(2)),
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
