/**
 * Intent Router Types
 * L.I.X. v0.3: Domain Mismatch Protection Layer
 * 
 * Defines types for intent routing, domain classification,
 * and provider group filtering.
 */

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Top-level intent domain classification
 */
export type IntentDomain =
    | 'commerce'       // Product purchase (电商)
    | 'ticketing'      // Train, flight, event tickets (票务)
    | 'travel'         // Hotel, visa, travel packages (旅行)
    | 'food'           // Food delivery, restaurant (餐饮)
    | 'local_service'  // Cleaning, moving, repair (本地服务)
    | 'education'      // Tutoring, courses (教育)
    | 'talent'         // Freelancers, designers (人才)
    | 'other';         // Unclassified

/**
 * Intent subtype for more specific classification
 */
export type IntentSubtype =
    // Ticketing
    | 'train_ticket'
    | 'flight_ticket'
    | 'bus_ticket'
    | 'concert_ticket'
    | 'movie_ticket'
    | 'sports_ticket'
    // Travel
    | 'hotel'
    | 'visa'
    | 'travel_package'
    // Commerce
    | 'product_purchase'
    | 'price_compare'
    // Food
    | 'food_delivery'
    | 'restaurant_reservation'
    // Local Service
    | 'cleaning'
    | 'moving'
    | 'repair'
    | 'installation'
    // Education
    | 'tutoring'
    | 'course'
    | 'certification'
    // Talent
    | 'design'
    | 'development'
    | 'writing'
    | 'translation'
    // Other
    | 'general';

/**
 * Provider group classification
 */
export type ProviderGroup =
    | 'ecommerce'      // JD, PDD, Taobao
    | 'ticketing'      // 12306, Qunar, Ctrip
    | 'travel'         // Hotels, Flights aggregators
    | 'local_service'  // 58, Meituan Services
    | 'food'           // Meituan, Eleme
    | 'talent';        // Freelancer platforms

/**
 * Offer type classification
 */
export type OfferType =
    | 'product'   // Physical/digital product
    | 'ticket'    // Transportation or event ticket
    | 'booking'   // Hotel/reservation
    | 'quote'     // Service quote
    | 'lead';     // Contact/referral

// ============================================================================
// Route Result
// ============================================================================

/**
 * Result of intent routing
 */
export interface RouteResult {
    /** The primary domain for this intent */
    intent_domain: IntentDomain;
    /** More specific classification */
    intent_subtype: IntentSubtype;
    /** Provider groups allowed to handle this intent */
    provider_group_allowlist: ProviderGroup[];
    /** Provider groups blocked from this intent */
    provider_group_blocklist: ProviderGroup[];
    /** Confidence in the routing decision (0-1) */
    route_confidence: number;
    /** Human-readable explanation for debugging */
    route_reason: string;
    /** Matched keywords/patterns */
    matched_patterns: string[];
    /** Extracted entities (cities, dates, etc.) */
    extracted_entities: ExtractedEntities;

    // === Domain Guard (Phase 3) ===
    /** Whether LIX market fanout is allowed for this intent */
    allow_market_fanout: boolean;
    /** Expected offer type for result contract validation */
    expected_offer_type: OfferType;

    // === Contract Layer (P0-1 Hard Enforcement) ===
    /** Explicit domain for debugging */
    domain: IntentDomain;
    /** Whether domain guard blocked market fanout */
    domain_guard_blocked: boolean;
    /** List of tools blocked by domain guard */
    blocked_tools: string[];
    /** Human-readable reason for blocking */
    domain_guard_reason?: string;
}

/**
 * Entities extracted from intent text
 */
export interface ExtractedEntities {
    cities?: string[];
    dates?: string[];
    product_names?: string[];
    brands?: string[];
    price_range?: { min?: number; max?: number };
}

// ============================================================================
// Canonical Item Types (for Result Contract)
// ============================================================================

/**
 * Canonical representation of a ticket
 */
export interface TicketCanonicalItem {
    item_type: 'transport' | 'event';
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    carrier?: string;
    seat_class?: string;
    event_name?: string;
    venue?: string;
}

/**
 * Canonical representation of a product
 */
export interface ProductCanonicalItem {
    item_type: 'product';
    sku?: string;
    brand?: string;
    model?: string;
    category?: string;
    specs?: Record<string, string>;
}

/**
 * Canonical representation of a booking
 */
export interface BookingCanonicalItem {
    item_type: 'booking';
    check_in?: string;
    check_out?: string;
    location?: string;
    room_type?: string;
    guests?: number;
}

/**
 * Canonical representation of a service quote
 */
export interface ServiceCanonicalItem {
    item_type: 'service';
    service_type?: string;
    location?: string;
    scheduled_date?: string;
    requirements?: string;
}

export type CanonicalItem =
    | TicketCanonicalItem
    | ProductCanonicalItem
    | BookingCanonicalItem
    | ServiceCanonicalItem;

// ============================================================================
// Fallback Types
// ============================================================================

export type FallbackType = 'no_provider' | 'all_rejected' | 'timeout';

export interface FallbackOption {
    id: string;
    label: string;
    description: string;
    action_type: 'paste_link' | 'upload_screenshot' | 'manual_input' | 'save_task';
    icon: string;
}

export interface FallbackResponse {
    fallback_triggered: true;
    fallback_type: FallbackType;
    intent_domain: IntentDomain;
    user_options: FallbackOption[];
    cta_message: string;
}

// ============================================================================
// Debug Types (with desensitization)
// ============================================================================

export interface DebugRouteInfo {
    /** Sanitized route result (no PII) */
    route_summary: {
        domain: IntentDomain;
        subtype: IntentSubtype;
        confidence: number;
        reason: string;
    };
    /** Provider filtering stats */
    provider_stats: {
        total_providers: number;
        allowed_providers: number;
        blocked_providers: number;
        blocked_groups: ProviderGroup[];
    };
    /** Offer filtering stats */
    offer_stats: {
        total_received: number;
        passed_validation: number;
        rejected_domain_mismatch: number;
        rejected_other: number;
    };
    /** Timestamp for debugging */
    timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Debug token for route panel access */
export const DEBUG_ROUTE_TOKEN = 'lumi_route_debug_2026';

/** Default fallback options for ticketing */
export const TICKETING_FALLBACK_OPTIONS: FallbackOption[] = [
    {
        id: 'paste_link',
        label: '粘贴票务链接',
        description: '粘贴你找到的购票链接，我帮你分析',
        action_type: 'paste_link',
        icon: '🔗'
    },
    {
        id: 'upload_screenshot',
        label: '上传截图',
        description: '上传票务页面截图，我帮你提取信息',
        action_type: 'upload_screenshot',
        icon: '📷'
    },
    {
        id: 'manual_input',
        label: '手动输入行程',
        description: '输入出发地/目的地/日期，生成比价清单',
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

/** Fallback message templates */
export const FALLBACK_MESSAGES: Record<IntentDomain, string> = {
    ticketing: '我暂时无法直接获取票务报价。你可以选择以下方式继续：',
    travel: '我暂时无法直接获取旅行报价。你可以选择以下方式继续：',
    food: '我暂时无法直接获取餐饮服务。你可以选择以下方式继续：',
    local_service: '我暂时无法直接获取本地服务报价。你可以选择以下方式继续：',
    education: '我暂时无法直接获取教育服务。你可以选择以下方式继续：',
    talent: '我暂时无法直接匹配服务提供者。你可以选择以下方式继续：',
    commerce: '我暂时无法获取商品报价。你可以选择以下方式继续：',
    other: '我暂时无法处理这个请求。你可以选择以下方式继续：',
};
