/**
 * Passive Learning Service - 被动学习服务
 * 
 * 协调各模块，在普通打字模式下静默收集用户模式数据。
 * 
 * 隐私原则：
 * - 需要用户明确同意
 * - 白名单模式（用户主动授权 App）
 * - 永久本地存储
 * - 不收集原始内容
 */

import { getTypingObserver, TypingObserver, TypingMetrics } from './typingObserver';
import { rememberThis, getMemR3Router } from './memr3Service';

// ============================================================================
// Types
// ============================================================================

export interface UserInsight {
    id: string;
    category: 'typing_speed' | 'correction_habit' | 'active_hours' | 'app_preference';
    description: string;
    confidence: number;
    generatedAt: number;
}

export interface PassiveLearningState {
    consentGiven: boolean;
    whitelistedApps: string[];
    totalSessions: number;
    insights: UserInsight[];
    lastAnalysis: number | null;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    INSIGHTS: 'lumi_passive_insights',
    LAST_ANALYSIS: 'lumi_last_analysis'
};

// ============================================================================
// Passive Learning Service
// ============================================================================

class PassiveLearningService {
    private typingObserver: TypingObserver;
    private insights: UserInsight[] = [];
    private analysisInterval: ReturnType<typeof setInterval> | null = null;

    // Analyze every 5 minutes when active
    private readonly ANALYSIS_INTERVAL_MS = 5 * 60 * 1000;

    constructor() {
        this.typingObserver = getTypingObserver();
        this.loadInsights();
    }

    /**
     * Load saved insights
     */
    private loadInsights(): void {
        const stored = localStorage.getItem(STORAGE_KEYS.INSIGHTS);
        this.insights = stored ? JSON.parse(stored) : [];
    }

    /**
     * Save insights
     */
    private saveInsights(): void {
        localStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(this.insights));
    }

    // ============================================================================
    // Consent Management
    // ============================================================================

    /**
     * Check if user has given consent
     */
    hasConsent(): boolean {
        return this.typingObserver.hasConsent();
    }

    /**
     * Set user consent
     */
    grantConsent(): void {
        this.typingObserver.setConsent(true);
        this.startBackgroundAnalysis();
        console.log('[PassiveLearning] Consent granted, starting observation');
    }

    /**
     * Revoke consent and stop collection
     */
    revokeConsent(): void {
        this.typingObserver.setConsent(false);
        this.stopBackgroundAnalysis();
        console.log('[PassiveLearning] Consent revoked, stopping observation');
    }

    // ============================================================================
    // App Whitelist Management
    // ============================================================================

    /**
     * Get whitelisted apps
     */
    getWhitelistedApps(): string[] {
        return this.typingObserver.getWhitelist();
    }

    /**
     * Add app to whitelist
     */
    whitelistApp(appName: string): void {
        this.typingObserver.addToWhitelist(appName);
    }

    /**
     * Remove app from whitelist
     */
    removeAppFromWhitelist(appName: string): void {
        this.typingObserver.removeFromWhitelist(appName);
    }

    // ============================================================================
    // Event Recording
    // ============================================================================

    /**
     * Record a keystroke (call from keyboard handler)
     */
    onKeystroke(appContext?: string): void {
        if (!this.hasConsent()) return;
        this.typingObserver.recordKeystroke(appContext);
    }

    /**
     * Record a deletion
     */
    onDeletion(appContext?: string): void {
        if (!this.hasConsent()) return;
        this.typingObserver.recordDeletion(appContext);
    }

    /**
     * Record word completion
     */
    onWordComplete(appContext?: string): void {
        if (!this.hasConsent()) return;
        this.typingObserver.recordWordComplete(appContext);
    }

    // ============================================================================
    // Analysis
    // ============================================================================

    /**
     * Start background analysis
     */
    startBackgroundAnalysis(): void {
        if (this.analysisInterval) return;

        this.analysisInterval = setInterval(() => {
            this.analyzeAndGenerateInsights();
        }, this.ANALYSIS_INTERVAL_MS);

        console.log('[PassiveLearning] Background analysis started');
    }

    /**
     * Stop background analysis
     */
    stopBackgroundAnalysis(): void {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
        console.log('[PassiveLearning] Background analysis stopped');
    }

    /**
     * Analyze collected data and generate insights
     */
    analyzeAndGenerateInsights(): void {
        const metrics = this.typingObserver.getMetrics();
        if (!metrics || metrics.totalSessions < 3) {
            console.log('[PassiveLearning] Not enough data for analysis');
            return;
        }

        const newInsights: UserInsight[] = [];
        const now = Date.now();

        // Insight: Typing Speed
        if (metrics.averageWPM > 0) {
            const speedCategory = metrics.averageWPM > 50 ? '快速打字者' :
                metrics.averageWPM > 30 ? '中速打字者' : '从容打字者';
            newInsights.push({
                id: `insight_speed_${now}`,
                category: 'typing_speed',
                description: `${speedCategory}，平均 ${Math.round(metrics.averageWPM)} WPM`,
                confidence: Math.min(0.9, metrics.totalSessions * 0.1),
                generatedAt: now
            });
        }

        // Insight: Correction Habit
        if (metrics.correctionRate > 0) {
            const correctionType = metrics.correctionRate > 0.2 ? '思考型（频繁修改）' :
                metrics.correctionRate > 0.1 ? '平衡型' : '果断型（很少回删）';
            newInsights.push({
                id: `insight_correction_${now}`,
                category: 'correction_habit',
                description: correctionType,
                confidence: Math.min(0.85, metrics.totalSessions * 0.1),
                generatedAt: now
            });
        }

        // Insight: Active Hours
        if (metrics.peakHours.length > 0) {
            const hourLabels = metrics.peakHours.map(h => {
                if (h >= 6 && h < 12) return '上午';
                if (h >= 12 && h < 18) return '下午';
                if (h >= 18 && h < 22) return '晚间';
                return '深夜';
            });
            const uniqueLabels = [...new Set(hourLabels)];
            newInsights.push({
                id: `insight_hours_${now}`,
                category: 'active_hours',
                description: `活跃时段：${uniqueLabels.join('、')}`,
                confidence: Math.min(0.8, metrics.totalSessions * 0.05),
                generatedAt: now
            });
        }

        // Store insights
        this.insights = [...this.insights, ...newInsights];
        this.saveInsights();
        localStorage.setItem(STORAGE_KEYS.LAST_ANALYSIS, String(now));

        // Sync high-confidence insights to MemR³
        newInsights
            .filter(insight => insight.confidence >= 0.6)
            .forEach(insight => {
                try {
                    rememberThis(
                        `用户特征：${insight.description}`,
                        'preference',
                        ['passive_learning', insight.category]
                    );
                    console.log(`[PassiveLearning] Synced to MemR³: ${insight.description}`);
                } catch (e) {
                    console.log('[PassiveLearning] MemR³ sync failed');
                }
            });

        console.log(`[PassiveLearning] Generated ${newInsights.length} insights`);
    }

    // ============================================================================
    // State & Insights
    // ============================================================================

    /**
     * Get current state
     */
    getState(): PassiveLearningState {
        const lastAnalysisStr = localStorage.getItem(STORAGE_KEYS.LAST_ANALYSIS);
        return {
            consentGiven: this.hasConsent(),
            whitelistedApps: this.getWhitelistedApps(),
            totalSessions: this.typingObserver.getSessions().length,
            insights: this.insights,
            lastAnalysis: lastAnalysisStr ? parseInt(lastAnalysisStr) : null
        };
    }

    /**
     * Get all insights
     */
    getInsights(): UserInsight[] {
        return [...this.insights];
    }

    /**
     * Get typing metrics
     */
    getTypingMetrics(): TypingMetrics | null {
        return this.typingObserver.getMetrics();
    }

    /**
     * Get human-readable summary
     */
    getSummary(): string {
        if (!this.hasConsent()) {
            return '被动学习未启用';
        }
        return this.typingObserver.getInsightsSummary();
    }

    /**
     * Clear all passive learning data
     */
    clearAllData(): void {
        this.typingObserver.clearAllData();
        this.insights = [];
        localStorage.removeItem(STORAGE_KEYS.INSIGHTS);
        localStorage.removeItem(STORAGE_KEYS.LAST_ANALYSIS);
        console.log('[PassiveLearning] All data cleared');
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: PassiveLearningService | null = null;

export function getPassiveLearningService(): PassiveLearningService {
    if (!serviceInstance) {
        serviceInstance = new PassiveLearningService();
    }
    return serviceInstance;
}

// ============================================================================
// Convenience Exports
// ============================================================================

export { TypingObserver, getTypingObserver } from './typingObserver';
export type { TypingMetrics, TypingSession, TypingEvent } from './typingObserver';
