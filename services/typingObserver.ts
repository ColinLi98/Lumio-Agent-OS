/**
 * Typing Observer - 打字行为观察器
 * 
 * 收集隐私安全的打字模式数据（不收集内容）：
 * - 打字速度 (WPM)
 * - 删除频率 (修正率)
 * - 会话时长
 * - 时间分布
 */

// ============================================================================
// Types
// ============================================================================

export interface TypingSession {
    id: string;
    startTime: number;
    endTime?: number;
    keystrokes: number;
    deletions: number;
    wordsTyped: number;
    appContext?: string;
}

export interface TypingMetrics {
    averageWPM: number;
    correctionRate: number;  // deletions / keystrokes
    averageSessionLength: number;  // in seconds
    totalSessions: number;
    peakHours: number[];  // 0-23
}

export interface TypingEvent {
    type: 'keystroke' | 'deletion' | 'word_complete' | 'session_start' | 'session_end';
    timestamp: number;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    SESSIONS: 'lumi_typing_sessions',
    METRICS: 'lumi_typing_metrics',
    CONSENT: 'lumi_passive_learning_consent',
    WHITELIST: 'lumi_app_whitelist'
};

// ============================================================================
// Typing Observer Class
// ============================================================================

export class TypingObserver {
    private currentSession: TypingSession | null = null;
    private sessionTimeout: ReturnType<typeof setTimeout> | null = null;
    private isEnabled: boolean = false;
    private lastKeystrokeTime: number = 0;

    // Session timeout: 30 seconds of inactivity ends a session
    private readonly SESSION_TIMEOUT_MS = 30000;

    // Minimum keystrokes to count as a valid session
    private readonly MIN_SESSION_KEYSTROKES = 5;

    constructor() {
        this.checkConsent();
    }

    /**
     * Check if user has consented to passive learning
     */
    private checkConsent(): void {
        const consent = localStorage.getItem(STORAGE_KEYS.CONSENT);
        this.isEnabled = consent === 'true';
    }

    /**
     * Set user consent
     */
    setConsent(agreed: boolean): void {
        localStorage.setItem(STORAGE_KEYS.CONSENT, String(agreed));
        this.isEnabled = agreed;
        console.log(`[TypingObserver] Consent ${agreed ? 'granted' : 'revoked'}`);
    }

    /**
     * Check if observer is enabled
     */
    hasConsent(): boolean {
        return this.isEnabled;
    }

    /**
     * Get whitelisted apps
     */
    getWhitelist(): string[] {
        const stored = localStorage.getItem(STORAGE_KEYS.WHITELIST);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Add app to whitelist
     */
    addToWhitelist(appName: string): void {
        const whitelist = this.getWhitelist();
        if (!whitelist.includes(appName)) {
            whitelist.push(appName);
            localStorage.setItem(STORAGE_KEYS.WHITELIST, JSON.stringify(whitelist));
            console.log(`[TypingObserver] Added ${appName} to whitelist`);
        }
    }

    /**
     * Remove app from whitelist
     */
    removeFromWhitelist(appName: string): void {
        const whitelist = this.getWhitelist().filter(app => app !== appName);
        localStorage.setItem(STORAGE_KEYS.WHITELIST, JSON.stringify(whitelist));
        console.log(`[TypingObserver] Removed ${appName} from whitelist`);
    }

    /**
     * Check if app is whitelisted
     */
    isAppWhitelisted(appName: string): boolean {
        return this.getWhitelist().includes(appName);
    }

    /**
     * Record a keystroke event
     */
    recordKeystroke(appContext?: string): void {
        if (!this.isEnabled) return;
        if (appContext && !this.isAppWhitelisted(appContext)) return;

        const now = Date.now();

        // Start new session if needed
        if (!this.currentSession) {
            this.startSession(appContext);
        }

        // Update current session
        if (this.currentSession) {
            this.currentSession.keystrokes++;
            this.lastKeystrokeTime = now;

            // Reset session timeout
            this.resetSessionTimeout();
        }
    }

    /**
     * Record a deletion event
     */
    recordDeletion(appContext?: string): void {
        if (!this.isEnabled) return;
        if (appContext && !this.isAppWhitelisted(appContext)) return;

        if (this.currentSession) {
            this.currentSession.deletions++;
            this.lastKeystrokeTime = Date.now();
            this.resetSessionTimeout();
        }
    }

    /**
     * Record word completion (space or punctuation after characters)
     */
    recordWordComplete(appContext?: string): void {
        if (!this.isEnabled) return;
        if (appContext && !this.isAppWhitelisted(appContext)) return;

        if (this.currentSession) {
            this.currentSession.wordsTyped++;
        }
    }

    /**
     * Start a new typing session
     */
    private startSession(appContext?: string): void {
        this.currentSession = {
            id: `session_${Date.now()}`,
            startTime: Date.now(),
            keystrokes: 0,
            deletions: 0,
            wordsTyped: 0,
            appContext
        };
        console.log('[TypingObserver] Session started');
        this.resetSessionTimeout();
    }

    /**
     * End the current session
     */
    private endSession(): void {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();

        // Only save if session has enough activity
        if (this.currentSession.keystrokes >= this.MIN_SESSION_KEYSTROKES) {
            this.saveSession(this.currentSession);
            console.log(`[TypingObserver] Session saved: ${this.currentSession.keystrokes} keystrokes`);
        }

        this.currentSession = null;
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
    }

    /**
     * Reset the session inactivity timeout
     */
    private resetSessionTimeout(): void {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }
        this.sessionTimeout = setTimeout(() => {
            this.endSession();
        }, this.SESSION_TIMEOUT_MS);
    }

    /**
     * Save session to storage
     */
    private saveSession(session: TypingSession): void {
        const sessions = this.getSessions();
        sessions.push(session);
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

        // Update aggregated metrics
        this.updateMetrics();
    }

    /**
     * Get all saved sessions
     */
    getSessions(): TypingSession[] {
        const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Update aggregated typing metrics
     */
    private updateMetrics(): void {
        const sessions = this.getSessions();
        if (sessions.length === 0) return;

        const hourCounts: Record<number, number> = {};
        let totalWPM = 0;
        let totalCorrectionRate = 0;
        let totalSessionLength = 0;
        let validSessions = 0;

        sessions.forEach(session => {
            if (!session.endTime) return;

            const durationMinutes = (session.endTime - session.startTime) / 60000;
            if (durationMinutes > 0) {
                const wpm = session.wordsTyped / durationMinutes;
                const correctionRate = session.deletions / Math.max(session.keystrokes, 1);

                totalWPM += wpm;
                totalCorrectionRate += correctionRate;
                totalSessionLength += (session.endTime - session.startTime) / 1000;
                validSessions++;

                // Track peak hours
                const hour = new Date(session.startTime).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });

        // Find peak hours (top 3)
        const peakHours = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));

        const metrics: TypingMetrics = {
            averageWPM: validSessions > 0 ? totalWPM / validSessions : 0,
            correctionRate: validSessions > 0 ? totalCorrectionRate / validSessions : 0,
            averageSessionLength: validSessions > 0 ? totalSessionLength / validSessions : 0,
            totalSessions: sessions.length,
            peakHours
        };

        localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics));
    }

    /**
     * Get current typing metrics
     */
    getMetrics(): TypingMetrics | null {
        const stored = localStorage.getItem(STORAGE_KEYS.METRICS);
        return stored ? JSON.parse(stored) : null;
    }

    /**
     * Force end current session (for cleanup)
     */
    forceEndSession(): void {
        this.endSession();
    }

    /**
     * Clear all collected data
     */
    clearAllData(): void {
        localStorage.removeItem(STORAGE_KEYS.SESSIONS);
        localStorage.removeItem(STORAGE_KEYS.METRICS);
        console.log('[TypingObserver] All data cleared');
    }

    /**
     * Get human-readable insights
     */
    getInsightsSummary(): string {
        const metrics = this.getMetrics();
        if (!metrics || metrics.totalSessions === 0) {
            return '暂无足够数据生成洞察';
        }

        const speedDesc = metrics.averageWPM > 40 ? '快速' : metrics.averageWPM > 20 ? '中等' : '从容';
        const correctionDesc = metrics.correctionRate > 0.15 ? '思考型' : '果断型';
        const peakDesc = metrics.peakHours.map(h => `${h}:00`).join(', ');

        return `打字风格：${speedDesc}${correctionDesc} | 活跃时段：${peakDesc} | 共${metrics.totalSessions}次会话`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let observerInstance: TypingObserver | null = null;

export function getTypingObserver(): TypingObserver {
    if (!observerInstance) {
        observerInstance = new TypingObserver();
    }
    return observerInstance;
}
