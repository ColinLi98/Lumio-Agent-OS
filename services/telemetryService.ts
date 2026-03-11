/**
 * Telemetry Service v2
 * Phase 2 Week 4 (W4-5): WAU-CP Funnel Tracking
 * 
 * Tracks the complete user journey from query to outcome:
 * Query → Plan → Execute → Outcome → Review
 * 
 * Key Metric: WAU-CP (Weekly Active Users with Completed Plans)
 */

// ============================================================================
// Types
// ============================================================================

/** Funnel stage events */
export type FunnelStage =
    | 'query_received'      // User submits a query
    | 'plan_generated'      // Three-stage plan created
    | 'action_started'      // User initiates an action
    | 'action_completed'    // Action finishes (success or fail)
    | 'outcome_logged'      // User logs the outcome
    | 'review_triggered';   // Weekly review shown

/** Full funnel event with metadata */
export interface FunnelEvent {
    id: string;
    stage: FunnelStage;
    timestamp: number;
    sessionId: string;
    /** Optional trace ID for linking events */
    traceId?: string;
    /** Additional context */
    metadata?: Record<string, any>;
}

/** Session represents a user journey */
export interface Session {
    id: string;
    startedAt: number;
    lastActivityAt: number;
    events: FunnelEvent[];
    /** Whether session has a completed plan */
    hasCompletedPlan: boolean;
}

/** Aggregated funnel metrics */
export interface FunnelMetrics {
    /** Weekly Active Users with Completed Plans */
    waucp: number;
    /** Total weekly active users */
    wau: number;
    /** Funnel conversion rates */
    conversions: {
        queryToPlan: number;        // % of queries that generate plans
        planToAction: number;       // % of plans where action is started
        actionToComplete: number;   // % of actions that complete
        completeToOutcome: number;  // % of completions that log outcome
    };
    /** Average time between stages (ms) */
    averageTimes: {
        queryToPlan: number;
        planToAction: number;
        actionToComplete: number;
    };
    /** Total events by stage */
    stageCounts: Record<FunnelStage, number>;
}

/** User engagement level */
export type EngagementLevel = 'new' | 'casual' | 'regular' | 'power';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    EVENTS: 'lumi_telemetry_events',
    SESSIONS: 'lumi_telemetry_sessions',
    CURRENT_SESSION: 'lumi_telemetry_current_session',
    METRICS_CACHE: 'lumi_telemetry_metrics_cache',
} as const;

// In non-browser environments (e.g. Node tests), localStorage may be unavailable.
// Fall back to an in-memory store to keep telemetry side-effects non-fatal.
const inMemoryStore = new Map<string, string>();

function resolveStorage():
    | { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
    | null {
    try {
        const storage = (globalThis as any)?.localStorage;
        if (
            storage
            && typeof storage.getItem === 'function'
            && typeof storage.setItem === 'function'
        ) {
            return storage;
        }
    } catch {
        // ignore and use in-memory fallback
    }
    return null;
}

function readStorageItem(key: string): string | null {
    const storage = resolveStorage();
    if (storage) {
        try {
            return storage.getItem(key);
        } catch {
            // ignore and use in-memory fallback
        }
    }
    return inMemoryStore.has(key) ? String(inMemoryStore.get(key)) : null;
}

function writeStorageItem(key: string, value: string): void {
    const storage = resolveStorage();
    if (storage) {
        try {
            storage.setItem(key, value);
            return;
        } catch {
            // ignore and write to in-memory fallback
        }
    }
    inMemoryStore.set(key, value);
}

// ============================================================================
// Session Management
// ============================================================================

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get or create current session
 */
export function getCurrentSession(): Session {
    try {
        const stored = readStorageItem(STORAGE_KEYS.CURRENT_SESSION);
        if (stored) {
            const session = JSON.parse(stored) as Session;

            // Check if session is still active
            if (Date.now() - session.lastActivityAt < SESSION_TIMEOUT_MS) {
                return session;
            }
        }
    } catch (e) {
        console.error('[Telemetry] Error loading session:', e);
    }

    // Create new session
    const newSession: Session = {
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        events: [],
        hasCompletedPlan: false,
    };

    saveSession(newSession);
    return newSession;
}

/**
 * Save session to storage
 */
function saveSession(session: Session): void {
    try {
        writeStorageItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));

        // Also append to sessions history
        const sessions = getSessions();
        const existingIdx = sessions.findIndex(s => s.id === session.id);
        if (existingIdx >= 0) {
            sessions[existingIdx] = session;
        } else {
            sessions.push(session);
        }

        // Keep only last 50 sessions
        const trimmed = sessions.slice(-50);
        writeStorageItem(STORAGE_KEYS.SESSIONS, JSON.stringify(trimmed));
    } catch (e) {
        console.error('[Telemetry] Error saving session:', e);
    }
}

/**
 * Get all stored sessions
 */
export function getSessions(): Session[] {
    try {
        const stored = readStorageItem(STORAGE_KEYS.SESSIONS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('[Telemetry] Error loading sessions:', e);
        return [];
    }
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track a funnel event
 */
export function trackFunnelEvent(
    stage: FunnelStage,
    metadata?: Record<string, any>,
    traceId?: string
): FunnelEvent {
    const session = getCurrentSession();

    const event: FunnelEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        stage,
        timestamp: Date.now(),
        sessionId: session.id,
        traceId,
        metadata,
    };

    // Add event to session
    session.events.push(event);
    session.lastActivityAt = Date.now();

    // Check for completed plan
    if (stage === 'outcome_logged') {
        session.hasCompletedPlan = true;
    }

    saveSession(session);

    // Log for debugging
    console.log(`[Telemetry] 📊 ${stage}`, metadata || '');

    return event;
}

/**
 * Convenience functions for each stage
 */
export const track = {
    queryReceived: (query: string, traceId?: string) =>
        trackFunnelEvent('query_received', { query: query.slice(0, 100) }, traceId),

    planGenerated: (planId: string, stepCount: number, traceId?: string) =>
        trackFunnelEvent('plan_generated', { planId, stepCount }, traceId),

    actionStarted: (actionType: string, traceId?: string) =>
        trackFunnelEvent('action_started', { actionType }, traceId),

    actionCompleted: (actionType: string, success: boolean, traceId?: string) =>
        trackFunnelEvent('action_completed', { actionType, success }, traceId),

    outcomeLogged: (taskId: string, outcome: 'success' | 'partial' | 'fail', traceId?: string) =>
        trackFunnelEvent('outcome_logged', { taskId, outcome }, traceId),

    reviewTriggered: (weekOf: string) =>
        trackFunnelEvent('review_triggered', { weekOf }),
};

// ============================================================================
// Metrics Calculation
// ============================================================================

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculate funnel metrics for the past week
 */
export function calculateFunnelMetrics(): FunnelMetrics {
    const sessions = getSessions();
    const weekAgo = Date.now() - WEEK_MS;

    // Filter to recent sessions
    const recentSessions = sessions.filter(s => s.startedAt >= weekAgo);

    // Count events by stage
    const stageCounts: Record<FunnelStage, number> = {
        query_received: 0,
        plan_generated: 0,
        action_started: 0,
        action_completed: 0,
        outcome_logged: 0,
        review_triggered: 0,
    };

    for (const session of recentSessions) {
        for (const event of session.events) {
            if (event.timestamp >= weekAgo) {
                stageCounts[event.stage]++;
            }
        }
    }

    // Calculate WAU-CP (sessions with completed plans)
    const waucp = recentSessions.filter(s => s.hasCompletedPlan).length;
    const wau = recentSessions.length;

    // Calculate conversion rates
    const conversions = {
        queryToPlan: stageCounts.query_received > 0
            ? stageCounts.plan_generated / stageCounts.query_received
            : 0,
        planToAction: stageCounts.plan_generated > 0
            ? stageCounts.action_started / stageCounts.plan_generated
            : 0,
        actionToComplete: stageCounts.action_started > 0
            ? stageCounts.action_completed / stageCounts.action_started
            : 0,
        completeToOutcome: stageCounts.action_completed > 0
            ? stageCounts.outcome_logged / stageCounts.action_completed
            : 0,
    };

    // Calculate average times (simplified - using session-level data)
    const averageTimes = {
        queryToPlan: calculateAverageTimeBetweenStages(recentSessions, 'query_received', 'plan_generated'),
        planToAction: calculateAverageTimeBetweenStages(recentSessions, 'plan_generated', 'action_started'),
        actionToComplete: calculateAverageTimeBetweenStages(recentSessions, 'action_started', 'action_completed'),
    };

    return {
        waucp,
        wau,
        conversions,
        averageTimes,
        stageCounts,
    };
}

/**
 * Calculate average time between two stages
 */
function calculateAverageTimeBetweenStages(
    sessions: Session[],
    fromStage: FunnelStage,
    toStage: FunnelStage
): number {
    const times: number[] = [];

    for (const session of sessions) {
        const fromEvent = session.events.find(e => e.stage === fromStage);
        const toEvent = session.events.find(e => e.stage === toStage);

        if (fromEvent && toEvent && toEvent.timestamp > fromEvent.timestamp) {
            times.push(toEvent.timestamp - fromEvent.timestamp);
        }
    }

    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
}

// ============================================================================
// Engagement Analysis
// ============================================================================

/**
 * Determine user engagement level
 */
export function getEngagementLevel(): EngagementLevel {
    const sessions = getSessions();
    const weekAgo = Date.now() - WEEK_MS;

    const recentSessions = sessions.filter(s => s.startedAt >= weekAgo);
    const completedPlans = recentSessions.filter(s => s.hasCompletedPlan).length;

    if (recentSessions.length === 0) return 'new';
    if (completedPlans >= 5) return 'power';
    if (completedPlans >= 2) return 'regular';
    return 'casual';
}

/**
 * Get engagement summary
 */
export function getEngagementSummary(): {
    level: EngagementLevel;
    weeklyPlans: number;
    weeklyActions: number;
    streakDays: number;
} {
    const metrics = calculateFunnelMetrics();
    const level = getEngagementLevel();

    // Calculate streak (simplified)
    const sessions = getSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streakDays = 0;
    for (let i = 0; i < 30; i++) {
        const dayStart = today.getTime() - (i * 24 * 60 * 60 * 1000);
        const dayEnd = dayStart + (24 * 60 * 60 * 1000);

        const hasActivity = sessions.some(s =>
            s.startedAt >= dayStart && s.startedAt < dayEnd
        );

        if (hasActivity) {
            streakDays++;
        } else if (i > 0) {
            break;
        }
    }

    return {
        level,
        weeklyPlans: metrics.stageCounts.plan_generated,
        weeklyActions: metrics.stageCounts.action_completed,
        streakDays,
    };
}

// ============================================================================
// Initialization & Cleanup
// ============================================================================

/**
 * Initialize telemetry service
 */
export function initTelemetry(): void {
    // Ensure we have a current session
    getCurrentSession();

    console.log('[Telemetry] Initialized. Engagement:', getEngagementLevel());
}

/**
 * Clear old telemetry data (keep last 30 days)
 */
export function cleanupTelemetry(): { deletedSessions: number; deletedEvents: number } {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const sessions = getSessions();

    const recentSessions = sessions.filter(s => s.startedAt >= thirtyDaysAgo);
    const deletedSessions = sessions.length - recentSessions.length;
    const deletedEvents = sessions
        .filter(s => s.startedAt < thirtyDaysAgo)
        .reduce((sum, s) => sum + s.events.length, 0);

    writeStorageItem(STORAGE_KEYS.SESSIONS, JSON.stringify(recentSessions));

    return { deletedSessions, deletedEvents };
}

/**
 * Export telemetry data
 */
export function exportTelemetryData(): {
    sessions: Session[];
    metrics: FunnelMetrics;
    engagement: ReturnType<typeof getEngagementSummary>;
} {
    return {
        sessions: getSessions(),
        metrics: calculateFunnelMetrics(),
        engagement: getEngagementSummary(),
    };
}
