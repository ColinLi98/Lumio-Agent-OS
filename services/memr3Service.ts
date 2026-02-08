/**
 * MemR³ Service - Memory Retrieval via Reflective Reasoning
 * 
 * Implements closed-loop memory retrieval for Lumi's "Second Brain" capabilities.
 * Based on: https://github.com/Leagein/memr3
 * 
 * Core Components:
 * - Router: Decides between Retrieve, Reflect, or Answer actions
 * - Evidence-Gap Tracker: Tracks what is known vs. what is missing
 * - Memory Store: Persistent storage backend (localStorage)
 */

import { loadData, saveData, StorageKeys } from './localStorageService.js';

// ============================================================================
// Types
// ============================================================================

export type MemR3Action = 'retrieve' | 'reflect' | 'answer';

export interface EvidenceItem {
    id: string;
    content: string;
    source: 'user_input' | 'memory' | 'inference';
    confidence: number;
    timestamp: number;
    tags: string[];
}

export interface EvidenceGap {
    id: string;
    description: string;
    requiredFor: string;
    priority: 'high' | 'medium' | 'low';
    attempts: number;
}

export interface EvidenceState {
    established: EvidenceItem[];
    gaps: EvidenceGap[];
    queryContext: string;
}

export interface MemoryEntry {
    id: string;
    content: string;
    type: 'note' | 'event' | 'preference' | 'fact' | 'interaction';
    metadata: {
        createdAt: number;
        updatedAt: number;
        accessCount: number;
        lastAccessed: number;
        source?: string;
        tags: string[];
    };
    embedding?: number[]; // For future semantic search
}

export interface RetrievalResult {
    memories: MemoryEntry[];
    relevanceScores: Map<string, number>;
    searchQuery: string;
}

export interface ReflectionResult {
    refinedQuery: string;
    newGaps: EvidenceGap[];
    resolvedGaps: string[];
    reasoning: string;
}

export interface MemR3Result {
    action: MemR3Action;
    answer?: string;
    evidenceState: EvidenceState;
    iterations: number;
    trace: MemR3TraceEntry[];
}

export interface MemR3TraceEntry {
    step: number;
    action: MemR3Action;
    input: string;
    output: string;
    evidenceCount: number;
    gapCount: number;
    timestamp: number;
}

export interface MemR3Config {
    maxIterations: number;
    confidenceThreshold: number;
    retrievalTopK: number;
    enableReflection: boolean;
    debug: boolean;
}

// ============================================================================
// Storage Key
// ============================================================================

const MEMR3_STORAGE_KEY = 'lumi_memr3_memories';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: MemR3Config = {
    maxIterations: 5,
    confidenceThreshold: 0.7,
    retrievalTopK: 10,
    enableReflection: true,
    debug: false
};

// ============================================================================
// Evidence-Gap Tracker
// ============================================================================

export class EvidenceGapTracker {
    private state: EvidenceState;

    constructor(queryContext: string = '') {
        this.state = {
            established: [],
            gaps: [],
            queryContext
        };
    }

    /**
     * Add established evidence
     */
    addEvidence(evidence: Omit<EvidenceItem, 'id' | 'timestamp'>): void {
        const item: EvidenceItem = {
            ...evidence,
            id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        };
        this.state.established.push(item);
    }

    /**
     * Add an evidence gap (something we need but don't have)
     */
    addGap(gap: Omit<EvidenceGap, 'id' | 'attempts'>): void {
        const existing = this.state.gaps.find(g => g.description === gap.description);
        if (existing) {
            existing.attempts++;
            return;
        }

        this.state.gaps.push({
            ...gap,
            id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            attempts: 0
        });
    }

    /**
     * Mark a gap as resolved
     */
    resolveGap(gapId: string): void {
        this.state.gaps = this.state.gaps.filter(g => g.id !== gapId);
    }

    /**
     * Check if we have enough evidence to answer
     */
    hasEnoughEvidence(threshold: number = 0.7): boolean {
        if (this.state.gaps.length === 0 && this.state.established.length > 0) {
            return true;
        }

        const highPriorityGaps = this.state.gaps.filter(g => g.priority === 'high');
        if (highPriorityGaps.length > 0) {
            return false;
        }

        const avgConfidence = this.state.established.reduce((sum, e) => sum + e.confidence, 0)
            / Math.max(this.state.established.length, 1);

        return avgConfidence >= threshold && this.state.gaps.length <= 1;
    }

    /**
     * Get current state (for transparency/explainability)
     */
    getState(): EvidenceState {
        return { ...this.state };
    }

    /**
     * Get human-readable summary of evidence state
     */
    getSummary(): string {
        const established = this.state.established.length;
        const gaps = this.state.gaps.length;
        const highPriorityGaps = this.state.gaps.filter(g => g.priority === 'high').length;

        if (gaps === 0) {
            return `✅ 已收集 ${established} 条证据，无信息缺口`;
        }

        return `📊 已收集 ${established} 条证据，${gaps} 个信息缺口（${highPriorityGaps} 个高优先级）`;
    }
}

// ============================================================================
// Memory Store
// ============================================================================

export class MemoryStore {
    private memories: Map<string, MemoryEntry>;

    constructor() {
        this.memories = new Map();
        this.loadFromStorage();
    }

    /**
     * Load memories from localStorage
     */
    private loadFromStorage(): void {
        const stored = loadData<MemoryEntry[]>(MEMR3_STORAGE_KEY);
        if (stored) {
            stored.forEach(entry => this.memories.set(entry.id, entry));
        }
    }

    /**
     * Persist memories to localStorage
     */
    private persistToStorage(): void {
        const entries = Array.from(this.memories.values());
        saveData(MEMR3_STORAGE_KEY, entries);
    }

    /**
     * Store a new memory
     */
    store(entry: Omit<MemoryEntry, 'id' | 'metadata'> & { tags?: string[] }): MemoryEntry {
        const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const memory: MemoryEntry = {
            id,
            content: entry.content,
            type: entry.type,
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                accessCount: 0,
                lastAccessed: Date.now(),
                tags: entry.tags || []
            }
        };

        this.memories.set(id, memory);
        this.persistToStorage();
        return memory;
    }

    /**
     * Retrieve memories matching a query (keyword-based for now)
     */
    retrieve(query: string, topK: number = 10): RetrievalResult {
        const queryTerms = this.tokenize(query);
        const results: Array<{ memory: MemoryEntry; score: number }> = [];

        this.memories.forEach(memory => {
            const contentTerms = this.tokenize(memory.content);
            const tagTerms = memory.metadata.tags.flatMap(t => this.tokenize(t));
            const allTerms = [...contentTerms, ...tagTerms];

            // Calculate relevance score (TF-IDF inspired)
            let score = 0;
            queryTerms.forEach(qt => {
                const matches = allTerms.filter(t => t.includes(qt) || qt.includes(t)).length;
                score += matches * (1 / (1 + Math.log(allTerms.length)));
            });

            // Boost recent and frequently accessed memories
            const recencyBoost = 1 / (1 + (Date.now() - memory.metadata.lastAccessed) / (1000 * 60 * 60 * 24 * 7));
            const accessBoost = Math.log(1 + memory.metadata.accessCount) * 0.1;

            score = score * (1 + recencyBoost + accessBoost);

            if (score > 0) {
                results.push({ memory, score });
                // Update access metadata
                memory.metadata.accessCount++;
                memory.metadata.lastAccessed = Date.now();
            }
        });

        // Sort by score and take top K
        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, topK);

        this.persistToStorage();

        return {
            memories: topResults.map(r => r.memory),
            relevanceScores: new Map(topResults.map(r => [r.memory.id, r.score])),
            searchQuery: query
        };
    }

    /**
     * Tokenize text for search
     */
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 1);
    }

    /**
     * Get all memories
     */
    getAll(): MemoryEntry[] {
        return Array.from(this.memories.values());
    }

    /**
     * Get memory by ID
     */
    get(id: string): MemoryEntry | undefined {
        return this.memories.get(id);
    }

    /**
     * Delete a memory
     */
    delete(id: string): boolean {
        const deleted = this.memories.delete(id);
        if (deleted) {
            this.persistToStorage();
        }
        return deleted;
    }

    /**
     * Get memory count
     */
    get size(): number {
        return this.memories.size;
    }
}

// ============================================================================
// MemR³ Router
// ============================================================================

export class MemR3Router {
    private config: MemR3Config;
    private memoryStore: MemoryStore;
    private trace: MemR3TraceEntry[];

    constructor(config: Partial<MemR3Config> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.memoryStore = new MemoryStore();
        this.trace = [];
    }

    /**
     * Main entry point: Process a query through the MemR³ loop
     */
    async process(
        query: string,
        context: { conversationHistory?: string[]; userPreferences?: Record<string, any> } = {}
    ): Promise<MemR3Result> {
        const tracker = new EvidenceGapTracker(query);
        let iterations = 0;
        this.trace = [];

        // Add initial context as evidence
        if (context.conversationHistory && context.conversationHistory.length > 0) {
            tracker.addEvidence({
                content: `对话上下文: ${context.conversationHistory.slice(-3).join(' | ')}`,
                source: 'user_input',
                confidence: 0.8,
                tags: ['context']
            });
        }

        // Initial gap: We need information to answer the query
        tracker.addGap({
            description: `需要找到与「${query}」相关的记忆`,
            requiredFor: 'query_answer',
            priority: 'high'
        });

        while (iterations < this.config.maxIterations) {
            iterations++;

            // Decide next action
            const action = this.decideAction(tracker);

            if (this.config.debug) {
                console.log(`[MemR³] Iteration ${iterations}: ${action}`);
            }

            if (action === 'answer') {
                // We have enough evidence
                const answer = this.generateAnswer(query, tracker);
                this.addTraceEntry(iterations, 'answer', query, answer, tracker);

                return {
                    action: 'answer',
                    answer,
                    evidenceState: tracker.getState(),
                    iterations,
                    trace: this.trace
                };
            }

            if (action === 'retrieve') {
                // Retrieve from memory store
                const result = await this.performRetrieval(query, tracker);
                this.addTraceEntry(iterations, 'retrieve', query,
                    `找到 ${result.memories.length} 条相关记忆`, tracker);
            }

            if (action === 'reflect' && this.config.enableReflection) {
                // Reflect on current evidence and refine query
                const reflection = await this.performReflection(query, tracker);
                this.addTraceEntry(iterations, 'reflect', query, reflection.reasoning, tracker);
            }

            // Check if we should stop
            if (tracker.hasEnoughEvidence(this.config.confidenceThreshold)) {
                break;
            }
        }

        // Max iterations reached, generate best-effort answer
        const answer = this.generateAnswer(query, tracker);

        return {
            action: 'answer',
            answer,
            evidenceState: tracker.getState(),
            iterations,
            trace: this.trace
        };
    }

    /**
     * Decide the next action based on evidence state
     */
    private decideAction(tracker: EvidenceGapTracker): MemR3Action {
        const state = tracker.getState();

        // If no evidence yet, retrieve
        if (state.established.length === 0) {
            return 'retrieve';
        }

        // If we have enough evidence, answer
        if (tracker.hasEnoughEvidence(this.config.confidenceThreshold)) {
            return 'answer';
        }

        // If we have gaps and reflection is enabled, reflect to refine query
        if (state.gaps.length > 0 && this.config.enableReflection) {
            // Alternate between retrieve and reflect
            const lastTraceAction = this.trace.length > 0 ? this.trace[this.trace.length - 1].action : null;
            if (lastTraceAction === 'retrieve') {
                return 'reflect';
            }
        }

        return 'retrieve';
    }

    /**
     * Perform memory retrieval
     */
    private async performRetrieval(query: string, tracker: EvidenceGapTracker): Promise<RetrievalResult> {
        const result = this.memoryStore.retrieve(query, this.config.retrievalTopK);

        // Add retrieved memories as evidence
        result.memories.forEach(memory => {
            tracker.addEvidence({
                content: memory.content,
                source: 'memory',
                confidence: result.relevanceScores.get(memory.id) || 0.5,
                tags: memory.metadata.tags
            });
        });

        // If we found memories, resolve the retrieval gap
        if (result.memories.length > 0) {
            const gaps = tracker.getState().gaps;
            const retrievalGap = gaps.find(g => g.requiredFor === 'query_answer');
            if (retrievalGap) {
                tracker.resolveGap(retrievalGap.id);
            }
        }

        return result;
    }

    /**
     * Perform reflection to refine the query
     */
    private async performReflection(query: string, tracker: EvidenceGapTracker): Promise<ReflectionResult> {
        const state = tracker.getState();

        // Analyze what we have vs. what we're missing
        const established = state.established.map(e => e.content).join('; ');
        const gaps = state.gaps.map(g => g.description).join('; ');

        // Simple reflection: Identify new search directions
        const reflection: ReflectionResult = {
            refinedQuery: query,
            newGaps: [],
            resolvedGaps: [],
            reasoning: `基于已有证据分析：已收集 ${state.established.length} 条信息，仍有 ${state.gaps.length} 个信息缺口需要填补。`
        };

        // If we have evidence but still gaps, increase confidence
        if (state.established.length > 0 && state.gaps.length > 0) {
            // Mark low-priority gaps as resolved after reflection
            state.gaps
                .filter(g => g.priority === 'low' && g.attempts > 1)
                .forEach(g => {
                    tracker.resolveGap(g.id);
                    reflection.resolvedGaps.push(g.id);
                });
        }

        return reflection;
    }

    /**
     * Generate answer based on collected evidence
     */
    private generateAnswer(query: string, tracker: EvidenceGapTracker): string {
        const state = tracker.getState();

        if (state.established.length === 0) {
            return `抱歉，我在记忆中没有找到与「${query}」相关的信息。您可以告诉我更多细节，我会帮您记住。`;
        }

        // Compile evidence into an answer
        const memoryContents = state.established
            .filter(e => e.source === 'memory')
            .map(e => e.content);

        if (memoryContents.length === 0) {
            return `关于「${query}」，我目前没有存储相关记忆。`;
        }

        if (memoryContents.length === 1) {
            return `根据我的记忆：${memoryContents[0]}`;
        }

        return `关于「${query}」，我找到了以下相关记忆：\n${memoryContents.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
    }

    /**
     * Add entry to execution trace
     */
    private addTraceEntry(
        step: number,
        action: MemR3Action,
        input: string,
        output: string,
        tracker: EvidenceGapTracker
    ): void {
        const state = tracker.getState();
        this.trace.push({
            step,
            action,
            input,
            output,
            evidenceCount: state.established.length,
            gapCount: state.gaps.length,
            timestamp: Date.now()
        });
    }

    /**
     * Store a new memory (convenience method)
     */
    storeMemory(content: string, type: MemoryEntry['type'], tags: string[] = []): MemoryEntry {
        return this.memoryStore.store({ content, type, tags });
    }

    /**
     * Get memory store for direct access
     */
    getMemoryStore(): MemoryStore {
        return this.memoryStore;
    }

    /**
     * Get execution trace
     */
    getTrace(): MemR3TraceEntry[] {
        return [...this.trace];
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let memR3Instance: MemR3Router | null = null;

export function getMemR3Router(config?: Partial<MemR3Config>): MemR3Router {
    if (!memR3Instance) {
        memR3Instance = new MemR3Router(config);
    }
    return memR3Instance;
}

export function resetMemR3Router(): void {
    memR3Instance = null;
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Quick helper to query memories with MemR³
 */
export async function queryMemory(query: string): Promise<string> {
    const router = getMemR3Router();
    const result = await router.process(query);
    return result.answer || '';
}

/**
 * Quick helper to store a memory
 */
export function rememberThis(content: string, type: MemoryEntry['type'] = 'note', tags: string[] = []): MemoryEntry {
    const router = getMemR3Router();
    return router.storeMemory(content, type, tags);
}

/**
 * Get evidence state summary (for UI display)
 */
export function getEvidenceStateSummary(result: MemR3Result): string {
    const tracker = new EvidenceGapTracker();
    result.evidenceState.established.forEach(e => {
        (tracker as any).state.established.push(e);
    });
    result.evidenceState.gaps.forEach(g => {
        (tracker as any).state.gaps.push(g);
    });
    return tracker.getSummary();
}
