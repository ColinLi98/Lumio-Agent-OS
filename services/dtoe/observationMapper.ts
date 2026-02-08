/**
 * Observation Mapper - Phase 3+
 * 
 * Maps EvidencePack and other input sources to TwinObservation for belief update.
 * Standardizes different input formats into a unified signal structure.
 */

import type { EvidencePack, EvidenceItem } from './coreSchemas.js';

// ============================================================================
// Types
// ============================================================================

export type ObservationSource =
    | 'keyboard_passive'
    | 'user_upload'
    | 'task_outcome'
    | 'live_evidence'
    | 'manual_note';

export interface ObservationSignal {
    key: string;
    value: number | string;
    confidence: number;  // 0-1
}

export interface EvidenceRef {
    item_index: number;
    source_name?: string;
}

/**
 * TwinObservation - Standardized observation format for belief update
 */
export interface TwinObservation {
    obs_id: string;
    source: ObservationSource;
    timestamp_ms: number;
    signals: ObservationSignal[];
    evidence_refs?: EvidenceRef[];
    raw_payload?: Record<string, unknown>;
}

// ============================================================================
// Signal Extractors
// ============================================================================

/**
 * Extract signals from a single evidence item based on intent domain
 */
function extractSignalsFromItem(
    item: EvidenceItem,
    domain: string,
    itemIndex: number
): { signals: ObservationSignal[]; refs: EvidenceRef[] } {
    const signals: ObservationSignal[] = [];
    const refs: EvidenceRef[] = [{ item_index: itemIndex, source_name: item.source_name }];

    const snippet = item.snippet.toLowerCase();
    const title = item.title.toLowerCase();

    // Financial domain signals
    if (domain === 'financial' || domain === 'investment') {
        // Price mentions
        const priceMatch = snippet.match(/¥?\s*([\d,]+(?:\.\d{2})?)\s*(?:元|rmb|cny)?/i);
        if (priceMatch) {
            signals.push({
                key: 'price_mention',
                value: parseFloat(priceMatch[1].replace(/,/g, '')),
                confidence: 0.7,
            });
        }

        // Percentage changes
        const pctMatch = snippet.match(/(上涨|下跌|增长|下降|涨幅|跌幅).*?([\d.]+)%/);
        if (pctMatch) {
            const direction = pctMatch[1].includes('涨') || pctMatch[1].includes('增') ? 1 : -1;
            signals.push({
                key: 'market_change_pct',
                value: direction * parseFloat(pctMatch[2]),
                confidence: 0.8,
            });
        }
    }

    // Health domain signals
    if (domain === 'health' || domain === 'wellness') {
        // Health indicators
        if (snippet.includes('锻炼') || snippet.includes('运动') || snippet.includes('健身')) {
            signals.push({ key: 'exercise_mentioned', value: 1, confidence: 0.6 });
        }
        if (snippet.includes('睡眠') || snippet.includes('休息')) {
            signals.push({ key: 'sleep_mentioned', value: 1, confidence: 0.6 });
        }
    }

    // Career domain signals
    if (domain === 'career' || domain === 'job') {
        // Salary mentions
        const salaryMatch = snippet.match(/月薪\s*([\d.]+)(?:k|万)?/i);
        if (salaryMatch) {
            let salary = parseFloat(salaryMatch[1]);
            if (snippet.includes('万')) salary *= 10000;
            if (snippet.includes('k')) salary *= 1000;
            signals.push({
                key: 'salary_mention',
                value: salary,
                confidence: 0.75,
            });
        }
    }

    // Education domain signals
    if (domain === 'education' || domain === 'learning') {
        if (
            snippet.includes('学习') ||
            snippet.includes('课程') ||
            snippet.includes('考试') ||
            snippet.includes('证书')
        ) {
            signals.push({ key: 'learning_mentioned', value: 1, confidence: 0.7 });
        }

        const studyHourMatch = snippet.match(/(?:学习|复习|上课).*?([\d.]+)\s*(?:小时|h|hour)/i);
        if (studyHourMatch) {
            signals.push({
                key: 'study_hours',
                value: parseFloat(studyHourMatch[1]),
                confidence: 0.75,
            });
        }

        const scoreMatch = snippet.match(/(?:成绩|分数|得分).*?([\d]{2,3})/);
        if (scoreMatch) {
            signals.push({
                key: 'exam_score',
                value: parseFloat(scoreMatch[1]),
                confidence: 0.8,
            });
        }
    }

    // Family domain signals
    if (domain === 'family' || domain === 'home') {
        if (
            snippet.includes('家庭') ||
            snippet.includes('家人') ||
            snippet.includes('孩子') ||
            snippet.includes('父母') ||
            snippet.includes('育儿')
        ) {
            signals.push({ key: 'family_load', value: 1, confidence: 0.7 });
        }

        if (
            snippet.includes('紧急') ||
            snippet.includes('住院') ||
            snippet.includes('突发') ||
            snippet.includes('事故')
        ) {
            signals.push({ key: 'family_emergency_risk', value: 1, confidence: 0.85 });
        }

        if (
            snippet.includes('支持') ||
            snippet.includes('陪伴') ||
            snippet.includes('团聚')
        ) {
            signals.push({ key: 'family_support_signal', value: 1, confidence: 0.65 });
        }
    }

    // General sentiment
    const positiveWords = ['成功', '增长', '上涨', '突破', '优秀', '盈利'];
    const negativeWords = ['失败', '下跌', '亏损', '困难', '风险', '损失'];

    let sentiment = 0;
    for (const word of positiveWords) {
        if (snippet.includes(word) || title.includes(word)) sentiment += 0.2;
    }
    for (const word of negativeWords) {
        if (snippet.includes(word) || title.includes(word)) sentiment -= 0.2;
    }

    if (Math.abs(sentiment) > 0) {
        signals.push({
            key: 'sentiment',
            value: Math.max(-1, Math.min(1, sentiment)),
            confidence: 0.5,
        });
    }

    return { signals, refs };
}

/**
 * Infer domain from evidence pack content
 */
function inferDomain(evidence: EvidencePack): string {
    const allText = evidence.items.map(i => i.snippet + ' ' + i.title).join(' ').toLowerCase();

    if (allText.includes('投资') || allText.includes('股票') || allText.includes('基金')) {
        return 'financial';
    }
    if (allText.includes('健康') || allText.includes('医疗') || allText.includes('运动')) {
        return 'health';
    }
    if (allText.includes('工作') || allText.includes('职业') || allText.includes('求职')) {
        return 'career';
    }
    if (allText.includes('学习') || allText.includes('教育') || allText.includes('课程')) {
        return 'education';
    }
    if (
        allText.includes('家庭') ||
        allText.includes('家人') ||
        allText.includes('孩子') ||
        allText.includes('父母') ||
        allText.includes('育儿')
    ) {
        return 'family';
    }

    return 'general';
}

// ============================================================================
// Main Mapper Functions
// ============================================================================

/**
 * Map EvidencePack to TwinObservation
 */
export function mapEvidencePackToObservation(
    evidence: EvidencePack,
    intent_domain?: string
): TwinObservation {
    const domain = intent_domain ?? inferDomain(evidence);

    const allSignals: ObservationSignal[] = [];
    const allRefs: EvidenceRef[] = [];

    // Process each item
    for (let i = 0; i < evidence.items.length; i++) {
        const { signals, refs } = extractSignalsFromItem(evidence.items[i], domain, i);
        allSignals.push(...signals);
        allRefs.push(...refs);
    }

    // Add meta-signals
    allSignals.push({
        key: 'evidence_count',
        value: evidence.items.length,
        confidence: 1.0,
    });

    allSignals.push({
        key: 'evidence_freshness',
        value: evidence.ttl_seconds > 0 ? Math.min(1, 300 / evidence.ttl_seconds) : 0.5,
        confidence: 0.9,
    });

    allSignals.push({
        key: 'provider_confidence',
        value: evidence.confidence,
        confidence: 1.0,
    });

    return {
        obs_id: `obs_evidence_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: 'live_evidence',
        timestamp_ms: evidence.fetched_at_ms,
        signals: allSignals,
        evidence_refs: allRefs,
        raw_payload: { provider: evidence.provider },
    };
}

/**
 * Create observation from keyboard passive signals
 */
export function createKeyboardObservation(
    signals: Array<{ key: string; value: number | string }>
): TwinObservation {
    return {
        obs_id: `obs_keyboard_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: 'keyboard_passive',
        timestamp_ms: Date.now(),
        signals: signals.map(s => ({ ...s, confidence: 0.6 })),
    };
}

/**
 * Create observation from task outcome
 */
export function createTaskOutcomeObservation(
    action_id: string,
    success: boolean,
    metrics?: Record<string, number>
): TwinObservation {
    const signals: ObservationSignal[] = [
        { key: 'task_success', value: success ? 1 : 0, confidence: 1.0 },
    ];

    if (metrics) {
        for (const [key, value] of Object.entries(metrics)) {
            signals.push({ key: `outcome_${key}`, value, confidence: 0.9 });
        }
    }

    return {
        obs_id: `obs_outcome_${action_id}_${Date.now()}`,
        source: 'task_outcome',
        timestamp_ms: Date.now(),
        signals,
        raw_payload: { action_id },
    };
}

/**
 * Create observation from user upload/manual input
 */
export function createManualObservation(
    data: Record<string, number | string>,
    notes?: string
): TwinObservation {
    const signals: ObservationSignal[] = [];

    for (const [key, value] of Object.entries(data)) {
        signals.push({
            key,
            value,
            confidence: 0.95, // High confidence for explicit user input
        });
    }

    return {
        obs_id: `obs_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source: 'manual_note',
        timestamp_ms: Date.now(),
        signals,
        raw_payload: notes ? { notes } : undefined,
    };
}

/**
 * Merge multiple observations (dedupes and takes max confidence per key)
 */
export function mergeObservations(observations: TwinObservation[]): TwinObservation {
    const signalMap = new Map<string, ObservationSignal>();
    const allRefs: EvidenceRef[] = [];

    for (const obs of observations) {
        for (const signal of obs.signals) {
            const existing = signalMap.get(signal.key);
            if (!existing || signal.confidence > existing.confidence) {
                signalMap.set(signal.key, signal);
            }
        }
        if (obs.evidence_refs) {
            allRefs.push(...obs.evidence_refs);
        }
    }

    return {
        obs_id: `obs_merged_${Date.now()}`,
        source: observations[0]?.source ?? 'live_evidence',
        timestamp_ms: Date.now(),
        signals: Array.from(signalMap.values()),
        evidence_refs: allRefs.length > 0 ? allRefs : undefined,
    };
}
