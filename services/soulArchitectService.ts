/**
 * Soul Architect Service - Layer 2 Agent
 * 基于行为数据构建和更新用户数字孪生画像
 */

import { SoulMatrix, ValueType, createDefaultSoulMatrix } from '../prompts/soulArchitect';
import { SentinelOutput } from './keyboardSentinelService';
import { IntentType } from '../prompts/keyboardSentinel';

// ============================================================================
// 类型定义
// ============================================================================

interface InteractionLog {
  type: 'draft_accept' | 'draft_edit' | 'draft_reject' | 'card_click' | 'query_refine';
  context: string;
  editRatio?: number;
  responseTime?: number;
  timestamp: number;
}

interface GameChoice {
  scenario: string;
  choice: string;
  alternatives: string[];
  responseTime: number;
  timestamp: number;
}

interface InferenceResult {
  fieldsUpdated: string[];
  changes: Record<string, { from: any; to: any; evidence: string }>;
  confidence: number;
}

// ============================================================================
// Soul Architect 核心类
// ============================================================================

export class SoulArchitect {
  private soulMatrix: SoulMatrix;
  private intentBuffer: SentinelOutput[] = [];
  private interactionBuffer: InteractionLog[] = [];
  private gameChoiceBuffer: GameChoice[] = [];
  private lastUpdateTime: number = 0;
  
  // 配置
  private readonly INTENT_BUFFER_THRESHOLD = 10;
  private readonly UPDATE_INTERVAL_MS = 3600000; // 1 hour
  private readonly LEARNING_RATE = 0.1;
  private readonly TIME_DECAY = 0.95;

  constructor(userId: string = 'default_user') {
    // 尝试从 localStorage 加载
    const saved = this.loadFromStorage(userId);
    this.soulMatrix = saved || createDefaultSoulMatrix(userId);
    this.lastUpdateTime = Date.now();
  }

  // ============================================================================
  // 数据接收接口
  // ============================================================================

  /**
   * 接收 Layer 1 Sentinel 意图
   */
  onSentinelIntent(output: SentinelOutput): void {
    if (output.intent && output.meta.shouldEscalate) {
      this.intentBuffer.push(output);
      
      // 检查是否需要触发更新
      if (this.shouldTriggerUpdate()) {
        this.performUpdate();
      }
    }
  }

  /**
   * 接收用户交互日志
   */
  onInteraction(log: InteractionLog): void {
    this.interactionBuffer.push(log);
    
    // 实时微调 - 快速反馈
    this.applyQuickAdjustment(log);
  }

  /**
   * 接收游戏选择
   */
  onGameChoice(choice: GameChoice): void {
    this.gameChoiceBuffer.push(choice);
    
    // 游戏选择是强信号，立即处理
    this.processGameChoice(choice);
  }

  // ============================================================================
  // 推断逻辑
  // ============================================================================

  /**
   * 检查是否需要触发深度更新
   */
  private shouldTriggerUpdate(): boolean {
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    return (
      this.intentBuffer.length >= this.INTENT_BUFFER_THRESHOLD ||
      timeSinceLastUpdate > this.UPDATE_INTERVAL_MS
    );
  }

  /**
   * 执行深度更新
   */
  private performUpdate(): void {
    const startTime = Date.now();
    const changes: InferenceResult = {
      fieldsUpdated: [],
      changes: {},
      confidence: 0
    };

    // 1. 分析意图模式
    this.analyzeIntentPatterns(changes);

    // 2. 分析交互模式
    this.analyzeInteractionPatterns(changes);

    // 3. 应用时间衰减
    this.applyTimeDecay();

    // 4. 更新元数据
    this.soulMatrix.version++;
    this.soulMatrix.lastUpdated = Date.now();
    
    // 5. 记录学习历史
    if (changes.fieldsUpdated.length > 0) {
      this.soulMatrix.learningHistory.push({
        timestamp: Date.now(),
        dataSource: 'periodic_update',
        fieldsUpdated: changes.fieldsUpdated,
        confidence: changes.confidence
      });
      
      // 限制历史长度
      if (this.soulMatrix.learningHistory.length > 100) {
        this.soulMatrix.learningHistory = this.soulMatrix.learningHistory.slice(-100);
      }
    }

    // 6. 保存
    this.saveToStorage();

    // 7. 清空缓冲区
    this.intentBuffer = [];
    this.interactionBuffer = [];
    this.lastUpdateTime = Date.now();

    console.log(`[SoulArchitect] Update completed in ${Date.now() - startTime}ms, ${changes.fieldsUpdated.length} fields updated`);
  }

  /**
   * 分析意图模式
   */
  private analyzeIntentPatterns(result: InferenceResult): void {
    if (this.intentBuffer.length === 0) return;

    // 统计意图类型
    const intentCounts: Record<string, number> = {};
    const intentParams: Record<string, any[]> = {};
    const timestamps: number[] = [];

    this.intentBuffer.forEach(output => {
      if (output.intent) {
        const type = output.intent.type;
        intentCounts[type] = (intentCounts[type] || 0) + 1;
        
        if (!intentParams[type]) intentParams[type] = [];
        intentParams[type].push(output.intent.params);
        
        timestamps.push(output.meta.processingMs);
      }
    });

    // === 推断风险偏好 ===
    if (intentCounts[IntentType.TRAVEL] >= 3) {
      const travelParams = intentParams[IntentType.TRAVEL];
      const sameDestination = travelParams.filter(
        p => p.destination === travelParams[0]?.destination
      ).length;
      
      // 多次搜索同一目的地但未成行 -> 犹豫型
      if (sameDestination >= 3) {
        this.updateField('personality.decisionStyle', 'hesitant', 
          `Searched same destination ${sameDestination} times`, result);
        this.adjustNumericField('behaviorPatterns.priceSensitivity', 0.15, result);
      }
    }

    // === 推断职业状态 ===
    if (intentCounts[IntentType.CAREER] >= 2) {
      const careerParams = intentParams[IntentType.CAREER];
      const negativeCount = careerParams.filter(p => p.sentiment === 'negative').length;
      
      if (negativeCount >= 2) {
        this.adjustNumericField('currentState.careerSatisfaction', -20, result);
        this.adjustNumericField('currentState.stressLevel', 15, result);
      }
    }

    // === 推断消费偏好 ===
    if (intentCounts[IntentType.PURCHASE] >= 2) {
      const purchaseParams = intentParams[IntentType.PURCHASE];
      const hasPrice = purchaseParams.filter(p => p.hasPrice).length;
      
      if (hasPrice / purchaseParams.length > 0.5) {
        this.updateField('behaviorPatterns.spendingStyle', 'investment_minded',
          'Frequently considers prices before purchase', result);
      }
    }

    // === 推断时间模式 ===
    const hours = this.intentBuffer.map(o => new Date(o.meta.processingMs).getHours());
    const hourCounts: Record<number, number> = {};
    hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
    
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => parseInt(h));
    
    if (peakHours.length > 0) {
      this.soulMatrix.behaviorPatterns.peakActivityHours = peakHours;
      
      // 判断作息类型
      const lateNightActivity = peakHours.filter(h => h >= 22 || h <= 2).length;
      if (lateNightActivity >= 2) {
        this.updateField('behaviorPatterns.chronotype', 'night_owl',
          'Peak activity after 10 PM', result);
        this.adjustNumericField('currentState.stressLevel', 10, result);
      }
    }

    // === 推断价值观 ===
    this.inferValuesFromIntents(intentCounts, intentParams, result);

    result.confidence = Math.min(0.9, 0.3 + this.intentBuffer.length * 0.05);
  }

  /**
   * 从意图推断价值观
   */
  private inferValuesFromIntents(
    counts: Record<string, number>,
    params: Record<string, any[]>,
    result: InferenceResult
  ): void {
    const valueSignals: Record<ValueType, number> = {} as any;

    // 财富追求
    if (counts[IntentType.FINANCE] >= 2 || counts[IntentType.PURCHASE] >= 3) {
      valueSignals['wealth'] = 0.7;
    }

    // 健康关注
    if (counts[IntentType.HEALTH] >= 2) {
      valueSignals['health'] = 0.8;
    }

    // 自由追求（旅行）
    if (counts[IntentType.TRAVEL] >= 2) {
      valueSignals['freedom'] = 0.6;
      valueSignals['stimulation'] = 0.5;
    }

    // 成就追求（职业相关但积极）
    if (counts[IntentType.CAREER] >= 1) {
      const positive = (params[IntentType.CAREER] || []).filter(
        p => p.sentiment !== 'negative'
      ).length;
      if (positive > 0) {
        valueSignals['achievement'] = 0.6;
      }
    }

    // 更新价值观排序
    Object.entries(valueSignals).forEach(([value, weight]) => {
      this.addOrUpdateValue(value as ValueType, weight, result);
    });
  }

  /**
   * 分析交互模式
   */
  private analyzeInteractionPatterns(result: InferenceResult): void {
    if (this.interactionBuffer.length === 0) return;

    // 计算平均编辑率
    const edits = this.interactionBuffer.filter(i => i.editRatio !== undefined);
    if (edits.length > 0) {
      const avgEditRatio = edits.reduce((sum, i) => sum + (i.editRatio || 0), 0) / edits.length;
      
      if (avgEditRatio < 0.2) {
        this.updateField('personality.decisionStyle', 'impulsive',
          `Low edit ratio: ${(avgEditRatio * 100).toFixed(0)}%`, result);
      } else if (avgEditRatio > 0.5) {
        this.updateField('behaviorPatterns.communicationStyle', 'minimal',
          `High edit ratio: ${(avgEditRatio * 100).toFixed(0)}%`, result);
      }
    }

    // 计算平均响应时间
    const withTime = this.interactionBuffer.filter(i => i.responseTime !== undefined);
    if (withTime.length > 0) {
      const avgResponseTime = withTime.reduce((sum, i) => sum + (i.responseTime || 0), 0) / withTime.length;
      
      if (avgResponseTime < 2000) {
        this.updateField('behaviorPatterns.responseLatency', 'instant',
          `Avg response: ${(avgResponseTime / 1000).toFixed(1)}s`, result);
      } else if (avgResponseTime > 10000) {
        this.updateField('behaviorPatterns.responseLatency', 'thoughtful',
          `Avg response: ${(avgResponseTime / 1000).toFixed(1)}s`, result);
      }
    }

    // 分析接受/拒绝比例
    const accepts = this.interactionBuffer.filter(i => i.type === 'draft_accept').length;
    const rejects = this.interactionBuffer.filter(i => i.type === 'draft_reject').length;
    const total = accepts + rejects;
    
    if (total > 5) {
      const acceptRate = accepts / total;
      if (acceptRate > 0.8) {
        this.adjustNumericField('personality.agreeableness', 0.05, result);
      } else if (acceptRate < 0.3) {
        this.adjustNumericField('personality.conscientiousness', 0.05, result);
      }
    }
  }

  /**
   * 处理游戏选择
   */
  private processGameChoice(choice: GameChoice): void {
    const result: InferenceResult = {
      fieldsUpdated: [],
      changes: {},
      confidence: 0.8
    };

    // 根据场景和选择推断
    switch (choice.scenario) {
      case 'investment':
        if (choice.choice.includes('high_risk') || choice.choice.includes('aggressive')) {
          this.updateField('personality.riskTolerance', 'high',
            `Game choice: ${choice.choice}`, result);
        } else if (choice.choice.includes('conservative') || choice.choice.includes('safe')) {
          this.updateField('personality.riskTolerance', 'low',
            `Game choice: ${choice.choice}`, result);
        }
        break;

      case 'conflict':
        if (choice.choice.includes('revenge') || choice.choice.includes('confront')) {
          this.updateField('personality.conflictStyle', 'compete',
            `Game choice: ${choice.choice}`, result);
          this.adjustNumericField('personality.agreeableness', -0.1, result);
        } else if (choice.choice.includes('forgive') || choice.choice.includes('compromise')) {
          this.updateField('personality.conflictStyle', 'collaborate',
            `Game choice: ${choice.choice}`, result);
          this.adjustNumericField('personality.agreeableness', 0.1, result);
        }
        break;

      case 'career_vs_family':
        if (choice.choice.includes('family') || choice.choice.includes('relationship')) {
          this.addOrUpdateValue('family', 0.9, result);
          this.soulMatrix.values.conflicts.push({
            valueA: 'achievement',
            valueB: 'family',
            resolution: 'family_first'
          });
        } else if (choice.choice.includes('career') || choice.choice.includes('promotion')) {
          this.addOrUpdateValue('achievement', 0.9, result);
        }
        break;

      case 'money_vs_ethics':
        if (choice.choice.includes('ethical') || choice.choice.includes('honest')) {
          this.addOrUpdateValue('benevolence', 0.8, result);
        } else if (choice.choice.includes('profit') || choice.choice.includes('money')) {
          this.addOrUpdateValue('wealth', 0.8, result);
        }
        break;
    }

    // 响应时间分析 - 犹豫时间长说明内心冲突
    if (choice.responseTime > 10000) {
      this.adjustNumericField('personality.neuroticism', 0.05, result);
    }

    // 保存
    if (result.fieldsUpdated.length > 0) {
      this.soulMatrix.learningHistory.push({
        timestamp: Date.now(),
        dataSource: `game_${choice.scenario}`,
        fieldsUpdated: result.fieldsUpdated,
        confidence: result.confidence
      });
      this.saveToStorage();
    }
  }

  /**
   * 快速微调 - 实时反馈
   */
  private applyQuickAdjustment(log: InteractionLog): void {
    // 快速编辑率更新
    if (log.type === 'draft_edit' && log.editRatio !== undefined) {
      const current = this.soulMatrix.behaviorPatterns.priceSensitivity;
      // 高编辑率可能暗示对细节的关注
      if (log.editRatio > 0.5) {
        this.soulMatrix.personality.conscientiousness = Math.min(1,
          this.soulMatrix.personality.conscientiousness + 0.01
        );
      }
    }

    // 快速拒绝可能暗示高标准
    if (log.type === 'draft_reject') {
      this.soulMatrix.personality.conscientiousness = Math.min(1,
        this.soulMatrix.personality.conscientiousness + 0.005
      );
    }
  }

  // ============================================================================
  // 工具函数
  // ============================================================================

  private updateField(path: string, value: any, evidence: string, result: InferenceResult): void {
    const parts = path.split('.');
    let obj: any = this.soulMatrix;
    
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    
    const lastKey = parts[parts.length - 1];
    const oldValue = obj[lastKey];
    
    if (oldValue !== value) {
      result.changes[path] = { from: oldValue, to: value, evidence };
      result.fieldsUpdated.push(path);
      obj[lastKey] = value;
    }
  }

  private adjustNumericField(path: string, delta: number, result: InferenceResult): void {
    const parts = path.split('.');
    let obj: any = this.soulMatrix;
    
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    
    const lastKey = parts[parts.length - 1];
    const oldValue = obj[lastKey] as number;
    const newValue = Math.max(0, Math.min(100, oldValue + delta));
    
    if (oldValue !== newValue) {
      result.changes[path] = { from: oldValue, to: newValue, evidence: `Delta: ${delta}` };
      result.fieldsUpdated.push(path);
      obj[lastKey] = newValue;
    }
  }

  private addOrUpdateValue(value: ValueType, weight: number, result: InferenceResult): void {
    const existing = this.soulMatrix.values.ranked.find(v => v.value === value);
    
    if (existing) {
      existing.weight = Math.min(1, existing.weight * (1 - this.LEARNING_RATE) + weight * this.LEARNING_RATE);
      existing.evidence.push(`Updated: ${new Date().toISOString()}`);
      if (existing.evidence.length > 5) existing.evidence = existing.evidence.slice(-5);
    } else {
      this.soulMatrix.values.ranked.push({
        value,
        weight,
        evidence: [`First observed: ${new Date().toISOString()}`]
      });
    }

    // 重新排序
    this.soulMatrix.values.ranked.sort((a, b) => b.weight - a.weight);
    
    result.fieldsUpdated.push(`values.${value}`);
  }

  private applyTimeDecay(): void {
    // 对动态状态应用衰减，使其向中性回归
    const decay = this.TIME_DECAY;
    
    this.soulMatrix.currentState.stressLevel = 
      this.soulMatrix.currentState.stressLevel * decay + 50 * (1 - decay);
    
    this.soulMatrix.currentState.emotionalValence = 
      this.soulMatrix.currentState.emotionalValence * decay;
    
    // 价值观权重轻微衰减
    this.soulMatrix.values.ranked.forEach(v => {
      v.weight = Math.max(0.1, v.weight * 0.99);
    });
  }

  // ============================================================================
  // 存储接口
  // ============================================================================

  private loadFromStorage(userId: string): SoulMatrix | null {
    try {
      const saved = localStorage.getItem(`soul_matrix_${userId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('[SoulArchitect] Failed to load from storage:', e);
    }
    return null;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        `soul_matrix_${this.soulMatrix.userId}`,
        JSON.stringify(this.soulMatrix)
      );
    } catch (e) {
      console.error('[SoulArchitect] Failed to save to storage:', e);
    }
  }

  // ============================================================================
  // 公开接口
  // ============================================================================

  /**
   * 获取当前 SoulMatrix
   */
  getSoulMatrix(): SoulMatrix {
    return { ...this.soulMatrix };
  }

  /**
   * 获取简化的 Soul 摘要 (给 Layer 3 Agent 使用)
   */
  getSoulSummary() {
    return {
      keyTraits: {
        riskTolerance: this.soulMatrix.personality.riskTolerance,
        decisionStyle: this.soulMatrix.personality.decisionStyle,
        communicationStyle: this.soulMatrix.behaviorPatterns.communicationStyle
      },
      currentMood: this.soulMatrix.currentState.emotionalValence,
      stressLevel: this.soulMatrix.currentState.stressLevel,
      topValues: this.soulMatrix.values.ranked.slice(0, 3).map(v => v.value),
      activeGoals: this.soulMatrix.goals.shortTerm.filter(g => g.priority > 0.5),
      chronotype: this.soulMatrix.behaviorPatterns.chronotype,
      confidenceScore: this.soulMatrix.confidenceScore
    };
  }

  /**
   * 重置 SoulMatrix
   */
  reset(): void {
    this.soulMatrix = createDefaultSoulMatrix(this.soulMatrix.userId);
    this.intentBuffer = [];
    this.interactionBuffer = [];
    this.gameChoiceBuffer = [];
    this.saveToStorage();
  }

  /**
   * 强制触发更新
   */
  forceUpdate(): void {
    this.performUpdate();
  }

  /**
   * 获取学习统计
   */
  getStats() {
    return {
      version: this.soulMatrix.version,
      lastUpdated: this.soulMatrix.lastUpdated,
      confidenceScore: this.soulMatrix.confidenceScore,
      learningEvents: this.soulMatrix.learningHistory.length,
      pendingIntents: this.intentBuffer.length,
      pendingInteractions: this.interactionBuffer.length
    };
  }
}

// 导出单例
export const soulArchitect = new SoulArchitect();
