import {
    TRAIT_METADATA,
    generateTraitId,
    type SoulTrait,
    type TraitCategory,
} from './soulTraitTypes.js';

const STORAGE_KEY = 'lumi_soul_traits';

class SoulMatrixStore {
    private traits = new Map<string, SoulTrait>();

    constructor() {
        this.load();
    }

    getTraits(): SoulTrait[] {
        return Array.from(this.traits.values()).sort((a, b) => b.last_updated - a.last_updated);
    }

    getConfirmedTraits(): SoulTrait[] {
        return this.getTraits().filter((trait) => trait.user_confirmed);
    }

    getTrait(traitId: string): SoulTrait | undefined {
        return this.traits.get(traitId);
    }

    getTraitByKey(key: string): SoulTrait | undefined {
        return this.getTraits().find((trait) => trait.key === key);
    }

    createTrait(
        key: string,
        value: string | number | boolean,
        options: {
            confidence?: number;
            source_evidence?: string[];
            category?: TraitCategory;
            display_name?: string;
            description?: string;
        } = {},
    ): SoulTrait {
        const metadata = TRAIT_METADATA[key];
        const trait: SoulTrait = {
            trait_id: generateTraitId(),
            key,
            value,
            display_name: options.display_name || metadata?.display_name || key,
            description: options.description || metadata?.description,
            confidence: options.confidence ?? 0.5,
            source_evidence: [...(options.source_evidence || [])],
            last_updated: Date.now(),
            user_confirmed: false,
            version: 1,
            category: options.category || metadata?.category || 'preference',
        };
        this.traits.set(trait.trait_id, trait);
        this.save();
        return trait;
    }

    updateTraitFromEvidence(traitId: string, evidenceId: string, valueDelta?: number): boolean {
        const trait = this.traits.get(traitId);
        if (!trait) return false;
        if (!trait.source_evidence.includes(evidenceId)) {
            trait.source_evidence.push(evidenceId);
        }
        if (typeof trait.value === 'number' && typeof valueDelta === 'number') {
            trait.value = Math.max(0, Math.min(1, trait.value + valueDelta));
        }
        trait.confidence = Math.min(1, trait.confidence + 0.05);
        trait.last_updated = Date.now();
        trait.version += 1;
        this.save();
        return true;
    }

    deleteTrait(traitId: string): boolean {
        const deleted = this.traits.delete(traitId);
        if (deleted) this.save();
        return deleted;
    }

    getWeightsPrompt(): string {
        const weights = this.getConfirmedTraits()
            .filter((trait) => trait.category === 'goal' || trait.category === 'value')
            .slice(0, 5)
            .map((trait) => `${trait.display_name}: ${String(trait.value)}`);
        return weights.join('\n');
    }

    private load(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as SoulTrait[];
            parsed.forEach((trait) => this.traits.set(trait.trait_id, trait));
        } catch {
            this.traits.clear();
        }
    }

    private save(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.getTraits()));
        } catch {
            // Ignore storage failures in tests / restricted environments.
        }
    }
}

const store = new SoulMatrixStore();

export function getSoulMatrixStore(): SoulMatrixStore {
    return store;
}

export type { SoulTrait };
