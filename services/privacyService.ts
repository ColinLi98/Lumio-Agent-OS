/**
 * Privacy Service
 * Phase 2 Week 4: Privacy Dashboard Backend
 * 
 * Handles privacy settings, data export, Right to Be Forgotten,
 * and access logging for GDPR-style compliance.
 */

// ============================================================================
// Types
// ============================================================================

export interface PrivacySettings {
    /** Enable memory learning from interactions */
    enableMemoryLearning: boolean;
    /** Enable trait inference for Soul Matrix */
    enableTraitInference: boolean;
    /** Enable anonymous usage analytics */
    enableUsageAnalytics: boolean;
    /** Anonymization level for data processing */
    anonymizationLevel: 'full' | 'partial' | 'minimal';
    /** Auto-delete data older than X days (null = forever) */
    retentionDays: number | null;
    /** Last updated timestamp */
    updatedAt: number;
}

export interface DataExport {
    /** Export format version */
    version: string;
    /** Export timestamp */
    exportedAt: string;
    /** User's Soul Matrix data */
    soulMatrix: any;
    /** Memory graph data */
    memoryGraph: any;
    /** Tasks and plans */
    tasks: any[];
    /** User preferences */
    preferences: any;
    /** Privacy settings */
    privacySettings: PrivacySettings;
    /** Reminders */
    reminders: any[];
    /** Calendar events */
    calendarEvents: any[];
}

export type AccessLogType = 'ai_call' | 'provider_fetch' | 'data_write' | 'data_read' | 'data_delete';

export interface AccessLogEntry {
    /** Unique log ID */
    id: string;
    /** Timestamp of access */
    timestamp: number;
    /** Type of access */
    type: AccessLogType;
    /** Human-readable description */
    details: string;
    /** Data categories affected */
    dataCategories: string[];
    /** Was data sent externally? */
    externalAccess: boolean;
}

export type DataCategory =
    | 'soul_matrix'
    | 'memory_graph'
    | 'tasks'
    | 'reminders'
    | 'calendar'
    | 'preferences'
    | 'access_log'
    | 'ai_stats';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    PRIVACY_SETTINGS: 'lumi_privacy_settings',
    ACCESS_LOG: 'lumi_access_log',
    SOUL_MATRIX: 'lumi_soul_matrix',
    MEMORY_GRAPH: 'lumi_memory_graph',
    TASKS: 'lumi_tasks',
    REMINDERS: 'lumi_reminders',
    CALENDAR: 'lumi_calendar_events',
    PREFERENCES: 'lumi_preferences',
    AI_CALLS: 'lumi_ai_calls',
    LAST_AI_CALL: 'lumi_last_ai_call',
    API_KEY: 'lumi_api_key',
} as const;

const DATA_CATEGORY_KEYS: Record<DataCategory, string[]> = {
    soul_matrix: [STORAGE_KEYS.SOUL_MATRIX],
    memory_graph: [STORAGE_KEYS.MEMORY_GRAPH],
    tasks: [STORAGE_KEYS.TASKS],
    reminders: [STORAGE_KEYS.REMINDERS],
    calendar: [STORAGE_KEYS.CALENDAR],
    preferences: [STORAGE_KEYS.PREFERENCES],
    access_log: [STORAGE_KEYS.ACCESS_LOG],
    ai_stats: [STORAGE_KEYS.AI_CALLS, STORAGE_KEYS.LAST_AI_CALL],
};

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    enableMemoryLearning: true,
    enableTraitInference: true,
    enableUsageAnalytics: false,
    anonymizationLevel: 'partial',
    retentionDays: null,
    updatedAt: Date.now(),
};

// ============================================================================
// Privacy Settings Management
// ============================================================================

/**
 * Get current privacy settings
 */
export function getPrivacySettings(): PrivacySettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
        if (stored) {
            return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('[PrivacyService] Error loading settings:', e);
    }
    return { ...DEFAULT_PRIVACY_SETTINGS };
}

/**
 * Update privacy settings
 */
export function updatePrivacySettings(updates: Partial<PrivacySettings>): PrivacySettings {
    const current = getPrivacySettings();
    const updated: PrivacySettings = {
        ...current,
        ...updates,
        updatedAt: Date.now(),
    };

    try {
        localStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(updated));
        logAccess({
            type: 'data_write',
            details: 'Privacy settings updated',
            dataCategories: ['preferences'],
            externalAccess: false,
        });
    } catch (e) {
        console.error('[PrivacyService] Error saving settings:', e);
    }

    return updated;
}

// ============================================================================
// Data Export (Portability)
// ============================================================================

/**
 * Export all user data as a portable JSON object
 */
export function exportAllData(): DataExport {
    const exportData: DataExport = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        soulMatrix: safeGetJSON(STORAGE_KEYS.SOUL_MATRIX),
        memoryGraph: safeGetJSON(STORAGE_KEYS.MEMORY_GRAPH),
        tasks: safeGetJSON(STORAGE_KEYS.TASKS) || [],
        preferences: safeGetJSON(STORAGE_KEYS.PREFERENCES),
        privacySettings: getPrivacySettings(),
        reminders: safeGetJSON(STORAGE_KEYS.REMINDERS) || [],
        calendarEvents: safeGetJSON(STORAGE_KEYS.CALENDAR) || [],
    };

    logAccess({
        type: 'data_read',
        details: 'Full data export requested',
        dataCategories: ['soul_matrix', 'memory_graph', 'tasks', 'preferences', 'reminders', 'calendar'],
        externalAccess: false,
    });

    return exportData;
}

/**
 * Download exported data as JSON file
 */
export function downloadDataExport(): void {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lumi_data_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Data Deletion (Right to Be Forgotten)
// ============================================================================

/**
 * Delete all user data (Right to Be Forgotten)
 * @returns Summary of deleted data
 */
export function deleteAllData(): { success: boolean; deletedCategories: string[]; errors: string[] } {
    const deletedCategories: string[] = [];
    const errors: string[] = [];

    // Log the deletion request first (before we delete the log!)
    console.log('[PrivacyService] 🗑️ Right to Be Forgotten requested');

    // Delete each category
    const allKeys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.PRIVACY_SETTINGS);

    for (const key of allKeys) {
        try {
            if (localStorage.getItem(key) !== null) {
                localStorage.removeItem(key);
                deletedCategories.push(key);
            }
        } catch (e) {
            errors.push(`Failed to delete ${key}: ${e}`);
        }
    }

    // Reset privacy settings to defaults (but keep the settings key)
    updatePrivacySettings(DEFAULT_PRIVACY_SETTINGS);

    // Log this action in a new clean log
    logAccess({
        type: 'data_delete',
        details: 'Right to Be Forgotten - All data deleted',
        dataCategories: deletedCategories,
        externalAccess: false,
    });

    return {
        success: errors.length === 0,
        deletedCategories,
        errors,
    };
}

/**
 * Delete specific data category
 */
export function deleteDataCategory(category: DataCategory): boolean {
    const keys = DATA_CATEGORY_KEYS[category];
    if (!keys) {
        console.error('[PrivacyService] Unknown category:', category);
        return false;
    }

    try {
        for (const key of keys) {
            localStorage.removeItem(key);
        }

        logAccess({
            type: 'data_delete',
            details: `Deleted data category: ${category}`,
            dataCategories: [category],
            externalAccess: false,
        });

        return true;
    } catch (e) {
        console.error('[PrivacyService] Error deleting category:', e);
        return false;
    }
}

/**
 * Get list of data categories with their storage sizes
 */
export function getDataCategorySizes(): Record<DataCategory, number> {
    const sizes: Record<DataCategory, number> = {
        soul_matrix: 0,
        memory_graph: 0,
        tasks: 0,
        reminders: 0,
        calendar: 0,
        preferences: 0,
        access_log: 0,
        ai_stats: 0,
    };

    for (const [category, keys] of Object.entries(DATA_CATEGORY_KEYS)) {
        for (const key of keys) {
            const item = localStorage.getItem(key);
            if (item) {
                sizes[category as DataCategory] += item.length * 2; // UTF-16 bytes
            }
        }
    }

    return sizes;
}

// ============================================================================
// Access Log
// ============================================================================

const MAX_LOG_ENTRIES = 500;

/**
 * Log an access event
 */
export function logAccess(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>): void {
    const settings = getPrivacySettings();

    // Don't log if analytics disabled and it's not a critical action
    if (!settings.enableUsageAnalytics && entry.type !== 'data_delete') {
        return;
    }

    const newEntry: AccessLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        ...entry,
    };

    try {
        const log = getAccessLog(MAX_LOG_ENTRIES - 1);
        log.unshift(newEntry);
        localStorage.setItem(STORAGE_KEYS.ACCESS_LOG, JSON.stringify(log.slice(0, MAX_LOG_ENTRIES)));
    } catch (e) {
        console.error('[PrivacyService] Error logging access:', e);
    }
}

/**
 * Get access log entries
 */
export function getAccessLog(limit: number = 100): AccessLogEntry[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ACCESS_LOG);
        if (stored) {
            const log = JSON.parse(stored) as AccessLogEntry[];
            return log.slice(0, limit);
        }
    } catch (e) {
        console.error('[PrivacyService] Error reading access log:', e);
    }
    return [];
}

/**
 * Clear access log
 */
export function clearAccessLog(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_LOG);
}

// ============================================================================
// Data Retention (Auto-cleanup)
// ============================================================================

/**
 * Apply retention policy - delete data older than retention period
 */
export function applyRetentionPolicy(): { deletedItems: number } {
    const settings = getPrivacySettings();

    if (!settings.retentionDays) {
        return { deletedItems: 0 };
    }

    const cutoffTime = Date.now() - (settings.retentionDays * 24 * 60 * 60 * 1000);
    let deletedItems = 0;

    // Clean up access log
    try {
        const log = getAccessLog(MAX_LOG_ENTRIES);
        const filteredLog = log.filter(entry => entry.timestamp >= cutoffTime);
        deletedItems += log.length - filteredLog.length;
        localStorage.setItem(STORAGE_KEYS.ACCESS_LOG, JSON.stringify(filteredLog));
    } catch (e) {
        console.error('[PrivacyService] Error applying retention to access log:', e);
    }

    // Clean up memory graph (if it has timestamps)
    // TODO: Implement for other data types with timestamp fields

    if (deletedItems > 0) {
        logAccess({
            type: 'data_delete',
            details: `Retention policy applied: ${deletedItems} items deleted (>${settings.retentionDays} days old)`,
            dataCategories: ['access_log'],
            externalAccess: false,
        });
    }

    return { deletedItems };
}

// ============================================================================
// AI Call Tracking (Enhanced)
// ============================================================================

/**
 * Track an AI API call
 */
export function trackAiCall(details?: string): void {
    const count = parseInt(localStorage.getItem(STORAGE_KEYS.AI_CALLS) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.AI_CALLS, String(count + 1));
    localStorage.setItem(STORAGE_KEYS.LAST_AI_CALL, String(Date.now()));

    logAccess({
        type: 'ai_call',
        details: details || 'AI API call',
        dataCategories: [],
        externalAccess: true,
    });
}

/**
 * Track a provider fetch (LIX)
 */
export function trackProviderFetch(provider: string, query: string): void {
    logAccess({
        type: 'provider_fetch',
        details: `Provider: ${provider}, Query: ${query.slice(0, 50)}...`,
        dataCategories: [],
        externalAccess: true,
    });
}

/**
 * Get AI call stats
 */
export function getAiCallStats(): { totalCalls: number; lastCall: number | null } {
    return {
        totalCalls: parseInt(localStorage.getItem(STORAGE_KEYS.AI_CALLS) || '0', 10),
        lastCall: localStorage.getItem(STORAGE_KEYS.LAST_AI_CALL)
            ? parseInt(localStorage.getItem(STORAGE_KEYS.LAST_AI_CALL)!, 10)
            : null,
    };
}

// ============================================================================
// Helpers
// ============================================================================

function safeGetJSON(key: string): any {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error(`[PrivacyService] Error parsing ${key}:`, e);
        return null;
    }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize privacy service (call on app start)
 */
export function initPrivacyService(): void {
    // Ensure settings exist
    if (!localStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(DEFAULT_PRIVACY_SETTINGS));
    }

    // Apply retention policy on startup
    const result = applyRetentionPolicy();
    if (result.deletedItems > 0) {
        console.log(`[PrivacyService] Retention policy cleaned up ${result.deletedItems} old items`);
    }
}
