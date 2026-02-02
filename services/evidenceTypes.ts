/**
 * Evidence Types
 * Phase 2 Week 1-2: Memory Provenance
 * 
 * Types for evidence chain that backs Soul Traits.
 * Privacy-first: stores summaries and hashes, not raw content.
 */

// ============================================================================
// Evidence Types
// ============================================================================

/**
 * Type of evidence source
 */
export type EvidenceType =
    | 'chat'        // From conversation with agent
    | 'tool'        // From tool usage (search, compare, etc.)
    | 'action'      // From user action (click, accept, etc.)
    | 'input'       // From keyboard input patterns
    | 'outcome'     // From task outcomes
    | 'explicit';   // User explicitly stated

/**
 * A piece of evidence that backs a trait
 */
export interface Evidence {
    evidence_id: string;
    type: EvidenceType;
    snippet_summary: string;        // Short summary, not raw content
    snippet_hash: string;           // SHA256 of original content
    timestamp: number;
    trace_id?: string;              // Link to trace context
    consent_flag: boolean;          // User consented to this collection
    task_id?: string;               // Associated task if any
    inference_note?: string;        // How this evidence was interpreted
    deleted?: boolean;              // Soft delete flag
    deleted_at?: number;
}

/**
 * Evidence creation input
 */
export interface EvidenceInput {
    type: EvidenceType;
    content: string;                // Original content (will be hashed)
    summary?: string;               // Optional custom summary
    trace_id?: string;
    task_id?: string;
    inference_note?: string;
}

/**
 * Evidence with linked trait info (for UI)
 */
export interface EvidenceWithTraits extends Evidence {
    linked_traits: {
        trait_id: string;
        trait_key: string;
        display_name: string;
    }[];
}

// ============================================================================
// Privacy Configuration
// ============================================================================

export interface PrivacyConfig {
    store_raw_content: boolean;     // If true, also store encrypted raw content
    max_summary_length: number;     // Max characters for summary
    retention_days: number;         // Days to keep evidence
    auto_delete_on_trait_delete: boolean;
}

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
    store_raw_content: false,       // Default: don't store raw
    max_summary_length: 200,
    retention_days: 365,
    auto_delete_on_trait_delete: true,
};

// ============================================================================
// Utility Functions
// ============================================================================

export function generateEvidenceId(): string {
    return `evd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a simple hash (for demo; use crypto.subtle in production)
 */
export function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate summary from content
 */
export function generateSummary(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
        return content;
    }
    return content.substring(0, maxLength - 3) + '...';
}

/**
 * Get evidence type display name
 */
export function getEvidenceTypeLabel(type: EvidenceType): string {
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

/**
 * Get evidence type icon
 */
export function getEvidenceTypeIcon(type: EvidenceType): string {
    const icons: Record<EvidenceType, string> = {
        chat: '💬',
        tool: '🔧',
        action: '👆',
        input: '⌨️',
        outcome: '✅',
        explicit: '📝',
    };
    return icons[type];
}
