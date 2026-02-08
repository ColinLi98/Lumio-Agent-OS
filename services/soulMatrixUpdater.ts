/**
 * Soul Matrix Updater
 * Phase 2 Week 1-2: Evidence → Trait Inference
 * 
 * Processes evidence and infers/updates soul traits.
 */

import {
    SoulTrait,
    TRAIT_KEYS,
    TRAIT_METADATA,
    TraitCategory,
} from './soulTraitTypes.js';
import { getSoulMatrixStore } from './soulMatrixStore.js';
import { Evidence, EvidenceType } from './evidenceTypes.js';
import { getMemoryLedger } from './memoryLedger.js';

// ============================================================================
// Types
// ============================================================================

interface InferenceRule {
    patterns: RegExp[];
    trait_key: string;
    value_extractor: (match: RegExpMatchArray, content: string) => number | string;
    confidence_base: number;
}

interface InferenceResult {
    trait_key: string;
    value: number | string;
    confidence: number;
    reason: string;
}

// ============================================================================
// Inference Rules
// ============================================================================

const INFERENCE_RULES: InferenceRule[] = [
    // Price sensitivity
    {
        patterns: [
            /太贵|价格高|不划算|贵了/i,
            /便宜|省钱|性价比|实惠|划算/i,
        ],
        trait_key: TRAIT_KEYS.PRICE_SENSITIVITY,
        value_extractor: (match, content) => {
            if (/太贵|价格高|不划算|贵了/.test(content)) return 0.8;
            if (/便宜|省钱|性价比|实惠|划算/.test(content)) return 0.7;
            return 0.5;
        },
        confidence_base: 0.4,
    },

    // Quality preference
    {
        patterns: [
            /质量|品质|做工|材质/i,
            /耐用|结实|好用/i,
        ],
        trait_key: TRAIT_KEYS.QUALITY_PREFERENCE,
        value_extractor: (match, content) => {
            if (/质量好|高品质|做工精/.test(content)) return 0.8;
            return 0.6;
        },
        confidence_base: 0.4,
    },

    // Brand loyalty
    {
        patterns: [
            /品牌|牌子|正品|官方/i,
            /苹果|华为|小米|三星|耐克|阿迪/i,
        ],
        trait_key: TRAIT_KEYS.BRAND_LOYALTY,
        value_extractor: (match, content) => {
            if (/只要.*(品牌|正品)|必须.*官方/.test(content)) return 0.9;
            if (/苹果|华为|小米|三星|耐克|阿迪/.test(content)) return 0.7;
            return 0.5;
        },
        confidence_base: 0.4,
    },

    // Risk tolerance
    {
        patterns: [
            /风险|冒险|稳妥|保守/i,
            /试试|尝试|新的/i,
        ],
        trait_key: TRAIT_KEYS.RISK_TOLERANCE,
        value_extractor: (match, content) => {
            if (/不敢|害怕|担心|风险/.test(content)) return 0.3;
            if (/试试|尝试|冒险/.test(content)) return 0.7;
            return 0.5;
        },
        confidence_base: 0.3,
    },

    // Decision speed
    {
        patterns: [
            /着急|赶时间|快点|马上/i,
            /慢慢|不急|考虑|想想/i,
        ],
        trait_key: TRAIT_KEYS.DECISION_SPEED,
        value_extractor: (match, content) => {
            if (/着急|赶时间|快点|马上|立刻/.test(content)) return 0.9;
            if (/慢慢|不急|考虑|想想/.test(content)) return 0.3;
            return 0.5;
        },
        confidence_base: 0.4,
    },

    // Sustainability focus
    {
        patterns: [
            /环保|绿色|可持续|低碳/i,
            /有机|天然|无污染/i,
        ],
        trait_key: TRAIT_KEYS.SUSTAINABILITY_FOCUS,
        value_extractor: () => 0.7,
        confidence_base: 0.5,
    },

    // Convenience priority
    {
        patterns: [
            /方便|省事|快捷|一站式/i,
            /送货|配送|到家/i,
        ],
        trait_key: TRAIT_KEYS.CONVENIENCE_PRIORITY,
        value_extractor: (match, content) => {
            if (/麻烦|费事/.test(content)) return 0.8;
            return 0.6;
        },
        confidence_base: 0.4,
    },
];

// ============================================================================
// Soul Matrix Updater Class
// ============================================================================

class SoulMatrixUpdater {
    private store = getSoulMatrixStore();
    private ledger = getMemoryLedger();

    /**
     * Process new evidence and infer traits
     */
    processEvidence(evidence: Evidence): InferenceResult[] {
        const content = evidence.snippet_summary;
        const results: InferenceResult[] = [];

        for (const rule of INFERENCE_RULES) {
            for (const pattern of rule.patterns) {
                const match = content.match(pattern);
                if (match) {
                    const value = rule.value_extractor(match, content);
                    const confidence = this.calculateConfidence(rule, evidence.type);

                    results.push({
                        trait_key: rule.trait_key,
                        value,
                        confidence,
                        reason: `从${this.getEvidenceTypeLabel(evidence.type)}中检测到: "${match[0]}"`,
                    });

                    break; // Only match once per rule
                }
            }
        }

        // Apply inferences
        for (const result of results) {
            this.applyInference(result, evidence.evidence_id);
        }

        return results;
    }

    /**
     * Apply a single inference to the store
     */
    private applyInference(result: InferenceResult, evidence_id: string): void {
        const existing = this.store.getTraitByKey(result.trait_key);

        if (existing) {
            // Update existing trait
            this.updateExistingTrait(existing, result, evidence_id);
        } else {
            // Create new trait
            this.createNewTrait(result, evidence_id);
        }
    }

    /**
     * Update an existing trait with new evidence
     */
    private updateExistingTrait(
        trait: SoulTrait,
        result: InferenceResult,
        evidence_id: string
    ): void {
        // Don't override user-confirmed values
        if (trait.user_confirmed) {
            // Just add the evidence reference
            this.store.updateTraitFromEvidence(trait.trait_id, evidence_id);
            return;
        }

        // Blend old and new values
        if (typeof trait.value === 'number' && typeof result.value === 'number') {
            const blendedValue = trait.value * 0.7 + result.value * 0.3;
            const newConfidence = Math.min(trait.confidence + result.confidence * 0.2, 0.9);

            // Update via store
            this.store.updateTraitFromEvidence(trait.trait_id, evidence_id, blendedValue - (trait.value as number));
        } else {
            // Just add evidence
            this.store.updateTraitFromEvidence(trait.trait_id, evidence_id);
        }
    }

    /**
     * Create a new trait from inference
     */
    private createNewTrait(result: InferenceResult, evidence_id: string): void {
        const metadata = TRAIT_METADATA[result.trait_key];

        this.store.createTrait(result.trait_key, result.value, {
            confidence: result.confidence,
            source_evidence: [evidence_id],
            category: metadata?.category,
            display_name: metadata?.display_name,
            description: metadata?.description,
        });
        // Note: The store emits 'trait.created' event internally
    }

    /**
     * Handle evidence deletion - adjust affected traits
     */
    handleEvidenceDeletion(evidence_id: string): void {
        const traits = this.store.getTraits();

        for (const trait of traits) {
            if (trait.source_evidence.includes(evidence_id)) {
                // Evidence removed - check if trait should be affected
                const remainingEvidence = trait.source_evidence.filter(e => e !== evidence_id);

                if (remainingEvidence.length === 0 && !trait.user_confirmed) {
                    // No evidence left and not confirmed - reduce confidence significantly
                    // The store handles this internally via updateTraitFromEvidence
                } else {
                    // Just remove the evidence reference
                    // (handled by memoryLedger.handleEvidenceDeletion)
                }
            }
        }
    }

    /**
     * Consolidate multiple evidences into a single trait assessment
     */
    consolidateTraitEvidence(trait_id: string): void {
        const trait = this.store.getTrait(trait_id);
        if (!trait) return;

        const evidences = trait.source_evidence
            .map(eid => this.ledger.getEvidence(eid))
            .filter((e): e is Evidence => e !== undefined);

        if (evidences.length < 2) return;

        // Recalculate confidence based on evidence count and recency
        let newConfidence = 0.3 + Math.min(evidences.length * 0.1, 0.4);

        // Boost for recent evidence
        const recentCount = evidences.filter(e =>
            Date.now() - e.timestamp < 7 * 24 * 60 * 60 * 1000
        ).length;
        newConfidence += recentCount * 0.05;

        newConfidence = Math.min(newConfidence, 0.85);

        // Trait confidence can only increase from consolidation
        if (newConfidence > trait.confidence && !trait.user_confirmed) {
            // Update via internal mechanism (could add a specific method)
        }
    }

    /**
     * Process explicit user statement
     */
    processExplicitStatement(
        statement: string,
        trait_key: string,
        value: number | string
    ): void {
        // Record as evidence
        const evidence = this.ledger.recordEvidence({
            type: 'explicit',
            content: statement,
            summary: statement,
            inference_note: `用户明确声明: ${trait_key} = ${value}`,
        });

        // Create or update trait with high confidence
        const existing = this.store.getTraitByKey(trait_key);

        if (existing) {
            this.store.editTrait(existing.trait_id, value);
        } else {
            this.store.createTrait(trait_key, value, {
                confidence: 0.9,
                source_evidence: [evidence.evidence_id],
            });
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private calculateConfidence(rule: InferenceRule, evidenceType: EvidenceType): number {
        let confidence = rule.confidence_base;

        // Boost for explicit or action evidence
        if (evidenceType === 'explicit') {
            confidence += 0.3;
        } else if (evidenceType === 'action' || evidenceType === 'outcome') {
            confidence += 0.2;
        } else if (evidenceType === 'chat') {
            confidence += 0.1;
        }

        return Math.min(confidence, 0.8);
    }

    private getEvidenceTypeLabel(type: EvidenceType): string {
        const labels: Record<EvidenceType, string> = {
            chat: '对话',
            tool: '工具使用',
            action: '操作',
            input: '输入',
            outcome: '任务结果',
            explicit: '明确声明',
        };
        return labels[type];
    }
}

// ============================================================================
// Singleton
// ============================================================================

let updaterInstance: SoulMatrixUpdater | null = null;

export function getSoulMatrixUpdater(): SoulMatrixUpdater {
    if (!updaterInstance) {
        updaterInstance = new SoulMatrixUpdater();
    }
    return updaterInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { SoulMatrixUpdater };
export type { InferenceResult };
