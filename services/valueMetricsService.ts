/**
 * Value Metrics Service
 * 聚合各服务的价值指标，用于展示 Lumi 学习进度
 */

import { getMemR3Router, MemoryEntry } from './memr3Service.js';
import { getPassiveLearningService, UserInsight } from './passiveLearningService.js';
import { loadData, saveData } from './localStorageService.js';

// ============================================================================
// Types
// ============================================================================

export interface ValueMetrics {
    // 记忆相关
    memoryCount: number;
    memoryGrowth: number;  // 本周新增

    // 输入习惯
    peakHours: number[];   // 高效时段 (0-23)
    avgWPM: number;        // 平均打字速度

    // 快捷操作
    chipClicksTotal: number;
    chipClicksThisWeek: number;

    // 元数据
    lastUpdated: number;
}

export interface ChipClickEvent {
    chipType: string;
    timestamp: number;
}

const STORAGE_KEY = 'lumi_value_metrics';
const CHIP_CLICKS_KEY = 'lumi_chip_clicks';

// ============================================================================
// Value Metrics Service
// ============================================================================

class ValueMetricsService {
    private chipClicks: ChipClickEvent[] = [];

    constructor() {
        this.loadChipClicks();
    }

    private loadChipClicks(): void {
        const saved = loadData<ChipClickEvent[]>(CHIP_CLICKS_KEY);
        if (saved) {
            this.chipClicks = saved;
        }
    }

    private saveChipClicks(): void {
        saveData(CHIP_CLICKS_KEY, this.chipClicks);
    }

    /**
     * 记录 SmartChip 点击事件
     */
    recordChipClick(chipType: string): void {
        this.chipClicks.push({
            chipType,
            timestamp: Date.now()
        });
        this.saveChipClicks();
    }

    /**
     * 获取本周的点击数
     */
    getWeeklyChipClicks(): number {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return this.chipClicks.filter(c => c.timestamp > oneWeekAgo).length;
    }

    /**
     * 获取总点击数
     */
    getTotalChipClicks(): number {
        return this.chipClicks.length;
    }

    /**
     * 获取完整价值指标
     */
    getMetrics(): ValueMetrics {
        // 从 MemR³ 获取记忆数量
        const memR3Router = getMemR3Router();
        const memoryStore = memR3Router.getMemoryStore();
        const memoryCount = memoryStore.size();

        // 计算本周新增
        const memories = memoryStore.getAll();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const memoryGrowth = memories.filter((m: MemoryEntry) => m.metadata.createdAt > oneWeekAgo).length;

        // 从 Passive Learning 获取输入习惯
        let peakHours: number[] = [];
        let avgWPM = 0;

        try {
            const passiveLearning = getPassiveLearningService();
            const insights = passiveLearning.getInsights();

            // 从洞察中提取高效时段和WPM
            for (const insight of insights) {
                if (insight.category === 'active_hours') {
                    // 解析高效时段描述
                    const hourMatch = insight.description.match(/(\d+)/g);
                    if (hourMatch) {
                        peakHours = hourMatch.slice(0, 2).map(Number);
                    }
                }
                if (insight.category === 'typing_speed') {
                    const wpmMatch = insight.description.match(/(\d+)/);
                    if (wpmMatch) {
                        avgWPM = parseInt(wpmMatch[1]);
                    }
                }
            }
        } catch (e) {
            // Passive learning 可能未启用
        }

        return {
            memoryCount,
            memoryGrowth,
            peakHours,
            avgWPM,
            chipClicksTotal: this.getTotalChipClicks(),
            chipClicksThisWeek: this.getWeeklyChipClicks(),
            lastUpdated: Date.now()
        };
    }

    /**
     * 获取人类可读的进度摘要
     */
    getProgressSummary(): string[] {
        const metrics = this.getMetrics();
        const summaries: string[] = [];

        if (metrics.memoryCount > 0) {
            summaries.push(`已记住 ${metrics.memoryCount} 条信息`);
        }

        if (metrics.peakHours.length > 0) {
            const hourStr = metrics.peakHours.map(h => `${h}:00`).join('、');
            summaries.push(`发现你的高效时段：${hourStr}`);
        }

        if (metrics.chipClicksThisWeek > 0) {
            summaries.push(`本周快捷操作节省 ${metrics.chipClicksThisWeek} 次输入`);
        }

        if (metrics.avgWPM > 0) {
            summaries.push(`平均打字速度：${Math.round(metrics.avgWPM)} WPM`);
        }

        if (summaries.length === 0) {
            summaries.push('开始使用 Lumi，我会学习你的习惯');
        }

        return summaries;
    }
}

// 单例
let instance: ValueMetricsService | null = null;

export function getValueMetricsService(): ValueMetricsService {
    if (!instance) {
        instance = new ValueMetricsService();
    }
    return instance;
}

export default ValueMetricsService;
