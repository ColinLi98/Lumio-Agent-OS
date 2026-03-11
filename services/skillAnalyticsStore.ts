import fs from 'node:fs/promises';

export interface SkillCanaryEvent {
  trace_id: string;
  ts_ms: number;
  skill_id: string;
  source: 'local_index' | 'github_search' | 'trusted_catalog';
  passed: boolean;
  sample_size: number;
  evidence_count: number;
  note: string;
}

export interface SkillPromotionEvent {
  trace_id: string;
  ts_ms: number;
  skill_id: string;
  from_level: 'sandbox' | 'approved' | 'quarantine' | 'none';
  to_level: 'sandbox' | 'approved' | 'quarantine' | 'none';
  promoted: boolean;
  reason: string;
}

export interface SkillSelectionEvent {
  trace_id: string;
  ts_ms: number;
  task_id: string;
  required_capability: string;
  primary_skill_id?: string;
  fallback_skill_id?: string;
  final_score: number;
  selection_reason: string;
  gate_snapshot: string;
}

interface SkillAnalyticsData {
  canary_events: SkillCanaryEvent[];
  promotion_events: SkillPromotionEvent[];
  selection_events: SkillSelectionEvent[];
}

const DEFAULT_FILE_PATH = '/tmp/lumi-skill-analytics.json';
const MAX_EVENTS = 10_000;

function emptyData(): SkillAnalyticsData {
  return {
    canary_events: [],
    promotion_events: [],
    selection_events: [],
  };
}

class SkillAnalyticsStore {
  private loaded = false;
  private data: SkillAnalyticsData = emptyData();
  private writeQueue: Promise<void> = Promise.resolve();

  private getFilePath(): string {
    return String(process.env.SKILL_ANALYTICS_FILE || DEFAULT_FILE_PATH).trim() || DEFAULT_FILE_PATH;
  }

  private useDurableFile(): boolean {
    return String(process.env.SKILL_ANALYTICS_DISABLE_FILE || '').trim() !== '1';
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.useDurableFile()) {
      this.data = emptyData();
      return;
    }
    const filePath = this.getFilePath();
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      this.data = {
        canary_events: Array.isArray(parsed?.canary_events) ? parsed.canary_events : [],
        promotion_events: Array.isArray(parsed?.promotion_events) ? parsed.promotion_events : [],
        selection_events: Array.isArray(parsed?.selection_events) ? parsed.selection_events : [],
      };
    } catch {
      this.data = emptyData();
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (!this.useDurableFile()) return;
    const filePath = this.getFilePath();
    const payload = JSON.stringify(this.data);
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.writeFile(filePath, payload, 'utf8');
    });
    await this.writeQueue;
  }

  async recordCanary(event: SkillCanaryEvent): Promise<void> {
    await this.ensureLoaded();
    this.data.canary_events.push(event);
    if (this.data.canary_events.length > MAX_EVENTS) {
      this.data.canary_events = this.data.canary_events.slice(-MAX_EVENTS);
    }
    await this.flush();
  }

  async recordPromotion(event: SkillPromotionEvent): Promise<void> {
    await this.ensureLoaded();
    this.data.promotion_events.push(event);
    if (this.data.promotion_events.length > MAX_EVENTS) {
      this.data.promotion_events = this.data.promotion_events.slice(-MAX_EVENTS);
    }
    await this.flush();
  }

  async recordSelection(event: SkillSelectionEvent): Promise<void> {
    await this.ensureLoaded();
    this.data.selection_events.push(event);
    if (this.data.selection_events.length > MAX_EVENTS) {
      this.data.selection_events = this.data.selection_events.slice(-MAX_EVENTS);
    }
    await this.flush();
  }
}

export const skillAnalyticsStore = new SkillAnalyticsStore();
