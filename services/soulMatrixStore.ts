/**
 * Soul Matrix Store
 * Phase 2 Week 1-1: Editable Preference Cards
 * 
 * Manages soul traits with CRUD operations, undo support, and persistence.
 */

import {
    SoulTrait,
    SoulTraitAction,
    SoulTraitActionType,
    TraitCategory,
    TRAIT_METADATA,
    generateTraitId,
    generateActionId,
} from './soulTraitTypes';
import { eventBus, LumiEvent } from './eventBus';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    TRAITS: 'lumi_soul_traits',
    ACTIONS: 'lumi_soul_actions',
};

// ============================================================================
// Configuration
// ============================================================================

const UNDO_TIMEOUT_MS = 10000; // 10 seconds to undo

// ============================================================================
// Soul Matrix Store Class
// ============================================================================

class SoulMatrixStore {
    private traits: Map<string, SoulTrait> = new Map();
    private actionHistory: SoulTraitAction[] = [];
    private listeners: Set<(traits: SoulTrait[]) => void> = new Set();
    private undoTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor() {
        this.load();
    }

    // -------------------------------------------------------------------------
    // Read Operations
    // -------------------------------------------------------------------------

    /**
     * Get all traits
     */
    getTraits(): SoulTrait[] {
        return Array.from(this.traits.values()).sort((a, b) => b.last_updated - a.last_updated);
    }

    /**
     * Get traits by category
     */
    getTraitsByCategory(category: TraitCategory): SoulTrait[] {
        return this.getTraits().filter(t => t.category === category);
    }

    /**
     * Get a single trait
     */
    getTrait(trait_id: string): SoulTrait | undefined {
        return this.traits.get(trait_id);
    }

    /**
     * Get trait by key
     */
    getTraitByKey(key: string): SoulTrait | undefined {
        return this.getTraits().find(t => t.key === key);
    }

    /**
     * Get confirmed traits only
     */
    getConfirmedTraits(): SoulTrait[] {
        return this.getTraits().filter(t => t.user_confirmed);
    }

    /**
     * Get action history for a trait
     */
    getTraitHistory(trait_id: string): SoulTraitAction[] {
        return this.actionHistory.filter(a => a.trait_id === trait_id && !a.undone);
    }

    // -------------------------------------------------------------------------
    // Write Operations
    // -------------------------------------------------------------------------

    /**
     * Create a new trait
     */
    createTrait(
        key: string,
        value: string | number | boolean,
        options: {
            confidence?: number;
            source_evidence?: string[];
            category?: TraitCategory;
            display_name?: string;
            description?: string;
        } = {}
    ): SoulTrait {
        const metadata = TRAIT_METADATA[key];

        const trait: SoulTrait = {
            trait_id: generateTraitId(),
            key,
            value,
            display_name: options.display_name || metadata?.display_name || key,
            description: options.description || metadata?.description,
            confidence: options.confidence ?? 0.5,
            source_evidence: options.source_evidence ?? [],
            last_updated: Date.now(),
            user_confirmed: false,
            version: 1,
            category: options.category || metadata?.category || 'preference',
        };

        this.traits.set(trait.trait_id, trait);
        this.recordAction('CREATE', trait.trait_id, undefined, value);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'trait.created',
            payload: { trait_id: trait.trait_id, key: trait.key },
        } as LumiEvent);

        return trait;
    }

    /**
     * Confirm a trait (user says it's accurate)
     */
    confirmTrait(trait_id: string): boolean {
        const trait = this.traits.get(trait_id);
        if (!trait) return false;

        const previous = trait.user_confirmed;
        trait.user_confirmed = true;
        trait.confidence = Math.min(trait.confidence + 0.2, 1.0);
        trait.last_updated = Date.now();
        trait.version++;

        this.recordAction('CONFIRM', trait_id, previous, true);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'trait.confirmed',
            payload: { trait_id, key: trait.key },
        } as LumiEvent);

        return true;
    }

    /**
     * Edit a trait value
     */
    editTrait(trait_id: string, new_value: string | number | boolean): boolean {
        const trait = this.traits.get(trait_id);
        if (!trait) return false;

        const previous = trait.value;
        trait.value = new_value;
        trait.user_edited = true;
        trait.user_confirmed = true;
        trait.confidence = 1.0; // User-edited = full confidence
        trait.last_updated = Date.now();
        trait.version++;

        const action = this.recordAction('EDIT', trait_id, previous, new_value);
        this.setupUndo(action);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'trait.edited',
            payload: { trait_id, key: trait.key, previous, new_value },
        } as LumiEvent);

        return true;
    }

    /**
     * Reject a trait (user says it's wrong)
     */
    rejectTrait(trait_id: string): boolean {
        const trait = this.traits.get(trait_id);
        if (!trait) return false;

        const previous = trait.confidence;
        trait.confidence = Math.max(trait.confidence - 0.3, 0);
        trait.user_confirmed = false;
        trait.last_updated = Date.now();
        trait.version++;

        const action = this.recordAction('REJECT', trait_id, previous, trait.confidence);
        this.setupUndo(action);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'trait.rejected',
            payload: { trait_id, key: trait.key },
        } as LumiEvent);

        return true;
    }

    /**
     * Delete a trait
     */
    deleteTrait(trait_id: string): boolean {
        const trait = this.traits.get(trait_id);
        if (!trait) return false;

        const action = this.recordAction('DELETE', trait_id, trait.value, undefined);

        // Store for undo
        (action as any)._deletedTrait = { ...trait };

        this.traits.delete(trait_id);
        this.setupUndo(action);
        this.save();
        this.notify();

        eventBus.emit({
            type: 'trait.deleted',
            payload: { trait_id, key: trait.key },
        } as LumiEvent);

        return true;
    }

    /**
     * Update trait from evidence (system-driven)
     */
    updateTraitFromEvidence(
        trait_id: string,
        evidence_id: string,
        value_delta?: number
    ): boolean {
        const trait = this.traits.get(trait_id);
        if (!trait) return false;

        // Add evidence reference
        if (!trait.source_evidence.includes(evidence_id)) {
            trait.source_evidence.push(evidence_id);
        }

        // Optionally adjust value if numeric
        if (typeof trait.value === 'number' && value_delta !== undefined) {
            trait.value = Math.max(0, Math.min(1, trait.value + value_delta));
        }

        // Boost confidence slightly with more evidence
        trait.confidence = Math.min(trait.confidence + 0.05, 0.9);
        trait.last_updated = Date.now();
        trait.version++;

        this.recordAction('UPDATE', trait_id);
        this.save();
        this.notify();

        return true;
    }

    // -------------------------------------------------------------------------
    // Undo Support
    // -------------------------------------------------------------------------

    /**
     * Undo the last action (within timeout)
     */
    undo(action_id: string): boolean {
        const action = this.actionHistory.find(a => a.action_id === action_id && !a.undone);
        if (!action) return false;

        // Clear undo timer
        const timer = this.undoTimers.get(action_id);
        if (timer) {
            clearTimeout(timer);
            this.undoTimers.delete(action_id);
        }

        // Revert based on action type
        switch (action.type) {
            case 'EDIT':
            case 'REJECT': {
                const trait = this.traits.get(action.trait_id);
                if (trait && action.previous_value !== undefined) {
                    if (action.type === 'EDIT') {
                        trait.value = action.previous_value;
                        trait.user_edited = false;
                    } else {
                        trait.confidence = action.previous_value as number;
                    }
                    trait.last_updated = Date.now();
                    trait.version++;
                }
                break;
            }
            case 'DELETE': {
                const deletedTrait = (action as any)._deletedTrait as SoulTrait | undefined;
                if (deletedTrait) {
                    this.traits.set(deletedTrait.trait_id, deletedTrait);
                }
                break;
            }
        }

        action.undone = true;
        this.recordAction('UNDO', action.trait_id);
        this.save();
        this.notify();

        return true;
    }

    /**
     * Check if an action can be undone
     */
    canUndo(action_id: string): boolean {
        return this.undoTimers.has(action_id);
    }

    /**
     * Get pending undo actions
     */
    getPendingUndos(): SoulTraitAction[] {
        return this.actionHistory.filter(a => this.undoTimers.has(a.action_id));
    }

    private setupUndo(action: SoulTraitAction): void {
        const timer = setTimeout(() => {
            this.undoTimers.delete(action.action_id);
            this.notify(); // Update UI to remove undo option
        }, UNDO_TIMEOUT_MS);

        this.undoTimers.set(action.action_id, timer);
    }

    // -------------------------------------------------------------------------
    // Persistence
    // -------------------------------------------------------------------------

    private save(): void {
        try {
            const traitsArray = Array.from(this.traits.values());
            localStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(traitsArray));

            // Keep last 100 actions
            const recentActions = this.actionHistory.slice(-100);
            localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(recentActions));
        } catch (e) {
            console.error('[SoulMatrixStore] Save failed:', e);
        }
    }

    private load(): void {
        try {
            const traitsJson = localStorage.getItem(STORAGE_KEYS.TRAITS);
            if (traitsJson) {
                const traitsArray: SoulTrait[] = JSON.parse(traitsJson);
                this.traits = new Map(traitsArray.map(t => [t.trait_id, t]));
            }

            const actionsJson = localStorage.getItem(STORAGE_KEYS.ACTIONS);
            if (actionsJson) {
                this.actionHistory = JSON.parse(actionsJson);
            }
        } catch (e) {
            console.error('[SoulMatrixStore] Load failed:', e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private recordAction(
        type: SoulTraitActionType,
        trait_id: string,
        previous_value?: any,
        new_value?: any
    ): SoulTraitAction {
        const action: SoulTraitAction = {
            action_id: generateActionId(),
            type,
            trait_id,
            previous_value,
            new_value,
            timestamp: Date.now(),
        };

        this.actionHistory.push(action);
        return action;
    }

    private notify(): void {
        const traits = this.getTraits();
        this.listeners.forEach(fn => fn(traits));
    }

    /**
     * Subscribe to trait changes
     */
    subscribe(listener: (traits: SoulTrait[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Reset all traits (for testing/privacy)
     */
    reset(): void {
        this.traits.clear();
        this.actionHistory = [];
        this.undoTimers.forEach(timer => clearTimeout(timer));
        this.undoTimers.clear();
        this.save();
        this.notify();
    }

    /**
     * Export all data
     */
    export(): { traits: SoulTrait[]; actions: SoulTraitAction[] } {
        return {
            traits: this.getTraits(),
            actions: this.actionHistory,
        };
    }

    /**
     * Import data
     */
    import(data: { traits: SoulTrait[]; actions?: SoulTraitAction[] }): void {
        this.traits = new Map(data.traits.map(t => [t.trait_id, t]));
        if (data.actions) {
            this.actionHistory = data.actions;
        }
        this.save();
        this.notify();
    }
}

// ============================================================================
// Singleton
// ============================================================================

let storeInstance: SoulMatrixStore | null = null;

export function getSoulMatrixStore(): SoulMatrixStore {
    if (!storeInstance) {
        storeInstance = new SoulMatrixStore();
    }
    return storeInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { SoulMatrixStore };
export type { SoulTrait, SoulTraitAction } from './soulTraitTypes';
