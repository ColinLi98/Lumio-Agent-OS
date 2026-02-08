/**
 * Memory Ledger
 * Phase 2 Week 1-2: Evidence Chain
 * 
 * Manages evidence records with privacy-first design.
 * Stores summaries and hashes, not raw content.
 */

import {
    Evidence,
    EvidenceInput,
    EvidenceType,
    EvidenceWithTraits,
    PrivacyConfig,
    DEFAULT_PRIVACY_CONFIG,
    generateEvidenceId,
    hashContent,
    generateSummary,
} from './evidenceTypes.js';
import { getSoulMatrixStore } from './soulMatrixStore.js';
import { eventBus, LumiEvent } from './eventBus.js';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    EVIDENCE: 'lumi_evidence_ledger',
    PRIVACY_CONFIG: 'lumi_evidence_privacy',
};

// ============================================================================
// Memory Ledger Class
// ============================================================================

class MemoryLedger {
    private ledger: Map<string, Evidence> = new Map();
    private config: PrivacyConfig = DEFAULT_PRIVACY_CONFIG;
    private listeners: Set<(evidence: Evidence[]) => void> = new Set();

    constructor() {
        this.load();
    }

    // -------------------------------------------------------------------------
    // Read Operations
    // -------------------------------------------------------------------------

    /**
     * Get all evidence (excluding deleted)
     */
    getAllEvidence(): Evidence[] {
        return Array.from(this.ledger.values())
            .filter(e => !e.deleted)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get evidence by ID
     */
    getEvidence(evidence_id: string): Evidence | undefined {
        const evidence = this.ledger.get(evidence_id);
        return evidence && !evidence.deleted ? evidence : undefined;
    }

    /**
     * Get evidence by type
     */
    getEvidenceByType(type: EvidenceType): Evidence[] {
        return this.getAllEvidence().filter(e => e.type === type);
    }

    /**
     * Get evidence for a specific trait
     */
    getEvidenceForTrait(trait_id: string): Evidence[] {
        const soulStore = getSoulMatrixStore();
        const trait = soulStore.getTrait(trait_id);
        if (!trait) return [];

        return trait.source_evidence
            .map(eid => this.getEvidence(eid))
            .filter((e): e is Evidence => e !== undefined);
    }

    /**
     * Get evidence with linked trait information
     */
    getEvidenceWithTraits(evidence_id: string): EvidenceWithTraits | undefined {
        const evidence = this.getEvidence(evidence_id);
        if (!evidence) return undefined;

        const soulStore = getSoulMatrixStore();
        const linked_traits = soulStore.getTraits()
            .filter(t => t.source_evidence.includes(evidence_id))
            .map(t => ({
                trait_id: t.trait_id,
                trait_key: t.key,
                display_name: t.display_name,
            }));

        return { ...evidence, linked_traits };
    }

    /**
     * Get evidence count
     */
    getCount(): number {
        return this.getAllEvidence().length;
    }

    // -------------------------------------------------------------------------
    // Write Operations
    // -------------------------------------------------------------------------

    /**
     * Record new evidence
     */
    recordEvidence(input: EvidenceInput): Evidence {
        const evidence: Evidence = {
            evidence_id: generateEvidenceId(),
            type: input.type,
            snippet_summary: input.summary || generateSummary(input.content, this.config.max_summary_length),
            snippet_hash: hashContent(input.content),
            timestamp: Date.now(),
            trace_id: input.trace_id,
            consent_flag: true, // Assume consent if called
            task_id: input.task_id,
            inference_note: input.inference_note,
        };

        this.ledger.set(evidence.evidence_id, evidence);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'evidence.recorded',
            payload: { evidence_id: evidence.evidence_id, type: evidence.type },
        } as LumiEvent);

        return evidence;
    }

    /**
     * Delete evidence (soft delete)
     */
    deleteEvidence(evidence_id: string): boolean {
        const evidence = this.ledger.get(evidence_id);
        if (!evidence) return false;

        evidence.deleted = true;
        evidence.deleted_at = Date.now();

        // Handle linked traits
        this.handleEvidenceDeletion(evidence_id);

        this.save();
        this.notify();

        eventBus.emit({
            type: 'evidence.deleted',
            payload: { evidence_id },
        } as LumiEvent);

        return true;
    }

    /**
     * Hard delete evidence (permanent)
     */
    purgeEvidence(evidence_id: string): boolean {
        const deleted = this.ledger.delete(evidence_id);
        if (deleted) {
            this.handleEvidenceDeletion(evidence_id);
            this.save();
            this.notify();
        }
        return deleted;
    }

    /**
     * Handle consequences of evidence deletion on traits
     */
    private handleEvidenceDeletion(evidence_id: string): void {
        const soulStore = getSoulMatrixStore();
        const traits = soulStore.getTraits();

        for (const trait of traits) {
            if (trait.source_evidence.includes(evidence_id)) {
                // Remove evidence from trait
                trait.source_evidence = trait.source_evidence.filter(eid => eid !== evidence_id);

                // Reduce confidence if less evidence
                if (trait.source_evidence.length === 0 && !trait.user_confirmed) {
                    // No evidence left and not confirmed - delete trait
                    if (this.config.auto_delete_on_trait_delete) {
                        soulStore.deleteTrait(trait.trait_id);
                    }
                } else if (!trait.user_confirmed) {
                    // Reduce confidence
                    trait.confidence = Math.max(trait.confidence - 0.15, 0.1);
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Inference Support
    // -------------------------------------------------------------------------

    /**
     * Record evidence and infer traits from it
     * Returns newly created/updated trait IDs
     */
    async recordAndInfer(
        input: EvidenceInput,
        inferredTraits: { key: string; value: any; confidence: number }[]
    ): Promise<{ evidence: Evidence; trait_ids: string[] }> {
        const evidence = this.recordEvidence(input);
        const trait_ids: string[] = [];

        const soulStore = getSoulMatrixStore();

        for (const inferred of inferredTraits) {
            // Check if trait already exists
            const existing = soulStore.getTraitByKey(inferred.key);

            if (existing) {
                // Update existing trait with new evidence
                soulStore.updateTraitFromEvidence(existing.trait_id, evidence.evidence_id);
                trait_ids.push(existing.trait_id);
            } else {
                // Create new trait
                const newTrait = soulStore.createTrait(inferred.key, inferred.value, {
                    confidence: inferred.confidence,
                    source_evidence: [evidence.evidence_id],
                });
                trait_ids.push(newTrait.trait_id);
            }
        }

        return { evidence, trait_ids };
    }

    // -------------------------------------------------------------------------
    // Privacy Configuration
    // -------------------------------------------------------------------------

    /**
     * Update privacy configuration
     */
    setPrivacyConfig(config: Partial<PrivacyConfig>): void {
        this.config = { ...this.config, ...config };
        localStorage.setItem(STORAGE_KEYS.PRIVACY_CONFIG, JSON.stringify(this.config));
    }

    /**
     * Get current privacy config
     */
    getPrivacyConfig(): PrivacyConfig {
        return { ...this.config };
    }

    // -------------------------------------------------------------------------
    // Audit Support
    // -------------------------------------------------------------------------

    /**
     * Export all evidence hashes (for audit)
     */
    exportEvidenceHashes(): { evidence_id: string; hash: string; timestamp: number }[] {
        return this.getAllEvidence().map(e => ({
            evidence_id: e.evidence_id,
            hash: e.snippet_hash,
            timestamp: e.timestamp,
        }));
    }

    /**
     * Verify evidence integrity
     */
    verifyEvidence(evidence_id: string, original_content: string): boolean {
        const evidence = this.getEvidence(evidence_id);
        if (!evidence) return false;

        return evidence.snippet_hash === hashContent(original_content);
    }

    // -------------------------------------------------------------------------
    // Persistence
    // -------------------------------------------------------------------------

    private save(): void {
        try {
            const evidenceArray = Array.from(this.ledger.values());
            localStorage.setItem(STORAGE_KEYS.EVIDENCE, JSON.stringify(evidenceArray));
        } catch (e) {
            console.error('[MemoryLedger] Save failed:', e);
        }
    }

    private load(): void {
        try {
            const evidenceJson = localStorage.getItem(STORAGE_KEYS.EVIDENCE);
            if (evidenceJson) {
                const evidenceArray: Evidence[] = JSON.parse(evidenceJson);
                this.ledger = new Map(evidenceArray.map(e => [e.evidence_id, e]));
            }

            const configJson = localStorage.getItem(STORAGE_KEYS.PRIVACY_CONFIG);
            if (configJson) {
                this.config = { ...DEFAULT_PRIVACY_CONFIG, ...JSON.parse(configJson) };
            }
        } catch (e) {
            console.error('[MemoryLedger] Load failed:', e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private notify(): void {
        const evidence = this.getAllEvidence();
        this.listeners.forEach(fn => fn(evidence));
    }

    /**
     * Subscribe to evidence changes
     */
    subscribe(listener: (evidence: Evidence[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Reset all evidence (for testing/privacy)
     */
    reset(): void {
        this.ledger.clear();
        this.save();
        this.notify();
    }

    /**
     * Export all evidence data
     */
    export(): Evidence[] {
        return this.getAllEvidence();
    }

    /**
     * Import evidence data
     */
    import(data: Evidence[]): void {
        this.ledger = new Map(data.map(e => [e.evidence_id, e]));
        this.save();
        this.notify();
    }

    /**
     * Clean up old evidence based on retention policy
     */
    cleanupOldEvidence(): number {
        const cutoffTime = Date.now() - (this.config.retention_days * 24 * 60 * 60 * 1000);
        let deleted = 0;

        for (const [id, evidence] of this.ledger) {
            if (evidence.timestamp < cutoffTime) {
                this.ledger.delete(id);
                deleted++;
            }
        }

        if (deleted > 0) {
            this.save();
            this.notify();
        }

        return deleted;
    }
}

// ============================================================================
// Singleton
// ============================================================================

let ledgerInstance: MemoryLedger | null = null;

export function getMemoryLedger(): MemoryLedger {
    if (!ledgerInstance) {
        ledgerInstance = new MemoryLedger();
    }
    return ledgerInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { MemoryLedger };
export type { Evidence, EvidenceInput, EvidenceWithTraits } from './evidenceTypes.js';
