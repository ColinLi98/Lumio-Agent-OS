/**
 * Vertical Classifier
 * L.I.X. Intent Vertical Detection
 * 
 * Rule-based classification for intent routing.
 * Ensures ticketing intents don't get routed to e-commerce providers.
 */

import type { IntentVertical, IntentKind } from './lixTypes';
import { eventBus } from './eventBus';

// ============================================================================
// Classification Patterns (P0 - Rule-First)
// ============================================================================

// TICKETING: Train, flight, and other transportation tickets
const TICKETING_KEYWORDS = /车票|火车票|高铁|动车|机票|航班|票务|出发|到达|站|班次|座位|舱位|飞|航线|机场|火车站|客运|汽车票/;

// OUTSOURCING: Finding people for services
const OUTSOURCING_KEYWORDS = /找人|外包|设计师|做logo|代写|代做|教我|开发者|程序员|翻译|摄影师|写手|美工|接单|兼职做/;

// E-COMMERCE indicator (explicit product purchase)
const ECOMMERCE_KEYWORDS = /买|购买|价格|多少钱|便宜|优惠|下单|商品|产品|手机|电脑|耳机|电器|家电/;

// ============================================================================
// Public API
// ============================================================================

/**
 * Classify the vertical of an intent based on text content.
 * Uses rule-first approach for deterministic behavior.
 * 
 * Priority: ticketing > outsourcing > ecommerce (default)
 */
export function classifyVertical(text: string): IntentVertical {
    if (!text) return 'generic';

    const normalizedText = text.toLowerCase();

    // Check ticketing first (highest priority for safety)
    if (TICKETING_KEYWORDS.test(normalizedText)) {
        emitVerticalDetected('ticketing', text);
        return 'ticketing';
    }

    // Check outsourcing
    if (OUTSOURCING_KEYWORDS.test(normalizedText)) {
        emitVerticalDetected('outsourcing', text);
        return 'outsourcing';
    }

    // Check explicit ecommerce or default to ecommerce for purchase category
    if (ECOMMERCE_KEYWORDS.test(normalizedText)) {
        emitVerticalDetected('ecommerce', text);
        return 'ecommerce';
    }

    // Default to generic (will be treated as ecommerce in most flows)
    emitVerticalDetected('generic', text);
    return 'generic';
}

/**
 * Map vertical to expected offer kind.
 * Used for filtering offers in auction engine.
 */
export function getExpectedKind(vertical: IntentVertical): IntentKind {
    switch (vertical) {
        case 'ticketing':
            return 'ticket';
        case 'outsourcing':
            return 'service';
        case 'ecommerce':
        case 'generic':
        default:
            return 'product';
    }
}

/**
 * Check if a vertical is compatible with e-commerce providers.
 */
export function isEcommerceCompatible(vertical: IntentVertical): boolean {
    return vertical === 'ecommerce' || vertical === 'generic';
}

// ============================================================================
// Observability
// ============================================================================

function emitVerticalDetected(vertical: IntentVertical, text: string): void {
    eventBus.emit({
        event_type: 'intent.vertical_detected',
        timestamp: Date.now(),
        trace_id: `classifier_${Date.now()}`,
        payload: {
            vertical,
            text_sample: text.substring(0, 50),
            pattern_matched: getMatchedPattern(vertical)
        }
    } as any); // Use any cast for extended event payload
}

function getMatchedPattern(vertical: IntentVertical): string {
    switch (vertical) {
        case 'ticketing': return 'TICKETING_KEYWORDS';
        case 'outsourcing': return 'OUTSOURCING_KEYWORDS';
        case 'ecommerce': return 'ECOMMERCE_KEYWORDS';
        default: return 'NONE';
    }
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Test classification for debugging purposes.
 */
export function testClassification(samples: string[]): void {
    console.log('[VerticalClassifier] Test Results:');
    samples.forEach(sample => {
        const vertical = classifyVertical(sample);
        const kind = getExpectedKind(vertical);
        console.log(`  "${sample}" → vertical=${vertical}, kind=${kind}`);
    });
}
