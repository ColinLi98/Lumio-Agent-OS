/**
 * Destiny Engine Service - Layer 3 Agent
 * 命运推演师：基于贝尔曼方程的决策模拟器
 */

import {
  DecisionNode,
  DecisionOption,
  RewardFunction,
  SimulationBranch,
  ScenarioOutcome,
  TimelinePhase,
  JCurveAnalysis,
  PathComparison,
  DecisionImpactReport,
  DestinySimulation,
  buildRewardFunction,
  calculateGamma
} from '../prompts/destinyEngine';
import { soulArchitect } from './soulArchitectService';

// ============================================================================
// 决策模板库
// ============================================================================

interface DecisionTemplate {
  category: string;
  keywords: string[];
  baseSuccessRates: Record<string, number>;
  typicalTimeline: TimelinePhase[];
  riskFactors: string[];
}

const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    category: 'career_startup',
    keywords: ['创业', '辞职', '自己做', '单干', 'startup'],
    baseSuccessRates: {
      'startup_success': 0.10,
      'break_even': 0.25,
      'sustainable_business': 0.20
    },
    typicalTimeline: [
      { phase: 'Month 1-3', stateName: '启动期', expectedReward: -30, riskLevel: 60, keyEvents: ['离职', '产品开发', '资金消耗'], emotionalImpact: '兴奋但焦虑' },
      { phase: 'Month 4-6', stateName: '死亡谷', expectedReward: -50, riskLevel: 85, keyEvents: ['现金流紧张', '市场验证', '可能的pivots'], emotionalImpact: '高度压力' },
      { phase: 'Month 7-12', stateName: '生存期', expectedReward: -20, riskLevel: 70, keyEvents: ['首批客户', '收入增长', '团队扩张决策'], emotionalImpact: '希望与挫折交替' },
      { phase: 'Year 2', stateName: '成长/放弃', expectedReward: 30, riskLevel: 50, keyEvents: ['规模化或关闭', '融资或盈利'], emotionalImpact: '关键转折点' }
    ],
    riskFactors: ['资金耗尽', '市场验证失败', '团队问题', '竞争加剧']
  },
  {
    category: 'career_change',
    keywords: ['跳槽', '换工作', '转行', '新机会'],
    baseSuccessRates: {
      'better_position': 0.60,
      'similar_level': 0.30,
      'regret': 0.10
    },
    typicalTimeline: [
      { phase: 'Month 1-3', stateName: '适应期', expectedReward: -10, riskLevel: 40, keyEvents: ['熟悉环境', '建立关系', '学习新流程'], emotionalImpact: '不确定但有期待' },
      { phase: 'Month 4-6', stateName: '融入期', expectedReward: 10, riskLevel: 25, keyEvents: ['开始产出', '获得认可', '理解文化'], emotionalImpact: '逐渐自信' },
      { phase: 'Month 7-12', stateName: '稳定期', expectedReward: 25, riskLevel: 15, keyEvents: ['绩效评估', '发展规划'], emotionalImpact: '稳定满足或失望' }
    ],
    riskFactors: ['文化不适应', '期望不匹配', '经济下行裁员']
  },
  {
    category: 'investment_major',
    keywords: ['买房', '投资', '大额购买', '贷款'],
    baseSuccessRates: {
      'appreciation': 0.55,
      'stable': 0.30,
      'depreciation': 0.15
    },
    typicalTimeline: [
      { phase: 'Month 1-6', stateName: '购买期', expectedReward: -40, riskLevel: 50, keyEvents: ['首付支出', '贷款办理', '搬迁成本'], emotionalImpact: '紧张但兴奋' },
      { phase: 'Year 1-2', stateName: '还贷期', expectedReward: -10, riskLevel: 30, keyEvents: ['月供压力', '生活调整'], emotionalImpact: '压力适应' },
      { phase: 'Year 3-5', stateName: '稳定期', expectedReward: 15, riskLevel: 20, keyEvents: ['收入增长', '资产增值'], emotionalImpact: '安全感增强' }
    ],
    riskFactors: ['收入下降', '房价下跌', '意外支出', '利率上升']
  },
  {
    category: 'relationship_major',
    keywords: ['结婚', '离婚', '分手', '求婚'],
    baseSuccessRates: {
      'happy_outcome': 0.50,
      'mixed': 0.30,
      'regret': 0.20
    },
    typicalTimeline: [
      { phase: 'Month 1-6', stateName: '调整期', expectedReward: 10, riskLevel: 40, keyEvents: ['角色转变', '家庭融合', '习惯磨合'], emotionalImpact: '蜜月期或冲突期' },
      { phase: 'Year 1', stateName: '稳定期', expectedReward: 20, riskLevel: 25, keyEvents: ['日常建立', '深入了解'], emotionalImpact: '现实磨合' },
      { phase: 'Year 2+', stateName: '长期', expectedReward: 25, riskLevel: 20, keyEvents: ['共同目标', '家庭规划'], emotionalImpact: '深度连接或疲劳' }
    ],
    riskFactors: ['沟通问题', '价值观冲突', '外部压力', '期望落差']
  }
];

// ============================================================================
// Destiny Engine 核心类
// ============================================================================

export class DestinyEngine {
  /**
   * 运行完整决策模拟
   */
  async simulate(decisionNode: DecisionNode): Promise<DestinySimulation> {
    const startTime = Date.now();
    
    // 1. 获取用户画像
    const soulSummary = soulArchitect.getSoulSummary();
    
    // 2. 确定模拟参数
    const gamma = calculateGamma({
      riskTolerance: soulSummary.keyTraits.riskTolerance,
      financialHealth: this.mapFinancialHealth(soulSummary.stressLevel),
      stressLevel: soulSummary.stressLevel
    });
    
    const rewardFunction = buildRewardFunction(soulSummary.topValues);
    
    // 3. 识别决策类型
    const template = this.matchTemplate(decisionNode.question);
    
    // 4. 为每个选项生成模拟分支
    const branches = decisionNode.options.map(option => 
      this.simulateBranch(option, template, soulSummary, gamma, rewardFunction)
    );
    
    // 5. 计算期望价值
    const expectedValues: Record<string, number> = {};
    const riskAdjustedValues: Record<string, number> = {};
    
    branches.forEach(branch => {
      expectedValues[branch.optionId] = branch.metrics.expectedValue;
      // 风险调整: EV * (1 - 风险厌恶系数 * 失败概率)
      const riskAversion = soulSummary.keyTraits.riskTolerance === 'low' ? 0.5 : 
                           soulSummary.keyTraits.riskTolerance === 'high' ? 0.2 : 0.35;
      riskAdjustedValues[branch.optionId] = branch.metrics.expectedValue * 
        (1 - riskAversion * (1 - branch.metrics.successProbability));
    });
    
    // 6. 确定最优路径
    const optimalOptionId = Object.entries(riskAdjustedValues)
      .sort((a, b) => b[1] - a[1])[0][0];
    const optimalBranch = branches.find(b => b.optionId === optimalOptionId)!;
    
    // 7. 生成用户报告
    const report = this.generateReport(decisionNode, branches, soulSummary, gamma);
    
    return {
      id: `sim_${Date.now()}`,
      decisionNode,
      simulationParams: {
        gamma,
        rewardFunction,
        timeHorizon: this.parseTimeHorizon(decisionNode.timeHorizon),
        simulationDepth: 3
      },
      branches,
      analysis: {
        expectedValues,
        riskAdjustedValues,
        recommendation: {
          optimalPath: optimalBranch.optionName,
          confidence: Math.min(0.85, 0.5 + soulArchitect.getStats().confidenceScore * 0.3),
          reasoning: `基于您的画像和${Object.keys(expectedValues).length}条路径分析`
        }
      },
      report
    };
  }

  /**
   * 快速决策评估（不调用 LLM）
   */
  quickEvaluate(question: string, options: string[]): {
    scores: Record<string, number>;
    recommendation: string;
    reasoning: string;
  } {
    const soulSummary = soulArchitect.getSoulSummary();
    const template = this.matchTemplate(question);
    
    const scores: Record<string, number> = {};
    
    options.forEach((option, index) => {
      let score = 50; // 基础分
      
      // 根据风险偏好调整
      const isHighRisk = option.includes('创业') || option.includes('辞职') || option.includes('冒险');
      const isLowRisk = option.includes('稳定') || option.includes('保守') || option.includes('继续');
      
      if (soulSummary.keyTraits.riskTolerance === 'high' && isHighRisk) score += 20;
      if (soulSummary.keyTraits.riskTolerance === 'low' && isLowRisk) score += 20;
      if (soulSummary.keyTraits.riskTolerance === 'low' && isHighRisk) score -= 15;
      
      // 根据压力水平调整
      if (soulSummary.stressLevel > 70 && isHighRisk) score -= 10;
      
      // 根据价值观调整
      if (soulSummary.topValues.includes('freedom') && 
          (option.includes('自由') || option.includes('独立') || option.includes('创业'))) {
        score += 15;
      }
      if (soulSummary.topValues.includes('security') && isLowRisk) {
        score += 15;
      }
      
      scores[option] = Math.max(0, Math.min(100, score));
    });
    
    const bestOption = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    
    return {
      scores,
      recommendation: bestOption[0],
      reasoning: `基于您的风险偏好(${soulSummary.keyTraits.riskTolerance})和核心价值观(${soulSummary.topValues.slice(0, 2).join('、')})，推荐此选项。`
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private matchTemplate(question: string): DecisionTemplate {
    const lowerQuestion = question.toLowerCase();
    
    for (const template of DECISION_TEMPLATES) {
      if (template.keywords.some(kw => lowerQuestion.includes(kw))) {
        return template;
      }
    }
    
    // 默认模板
    return DECISION_TEMPLATES[1]; // career_change as default
  }

  private simulateBranch(
    option: DecisionOption,
    template: DecisionTemplate,
    soulSummary: any,
    gamma: number,
    rewardFunction: RewardFunction
  ): SimulationBranch {
    // 调整基础成功率
    let successProb = template.baseSuccessRates[Object.keys(template.baseSuccessRates)[0]] || 0.5;
    
    // 根据用户特征调整
    if (soulSummary.keyTraits.riskTolerance === 'high') successProb += 0.05;
    if (soulSummary.keyTraits.decisionStyle === 'analytical') successProb += 0.05;
    if (soulSummary.stressLevel > 70) successProb -= 0.1;
    
    // 根据选项风险调整
    if (option.riskLevel === 'very_high') successProb -= 0.15;
    if (option.riskLevel === 'high') successProb -= 0.08;
    if (option.riskLevel === 'low') successProb += 0.1;
    
    successProb = Math.max(0.05, Math.min(0.95, successProb));
    
    // 生成三种情景
    const scenarios = {
      best: this.generateScenario('best', option, successProb, gamma),
      expected: this.generateScenario('expected', option, successProb, gamma),
      worst: this.generateScenario('worst', option, successProb, gamma)
    };
    
    // 计算期望价值
    const expectedValue = 
      scenarios.best.cumulativeReward * scenarios.best.probability +
      scenarios.expected.cumulativeReward * scenarios.expected.probability +
      scenarios.worst.cumulativeReward * scenarios.worst.probability;
    
    // 调整时间线
    const timeline = template.typicalTimeline.map(phase => ({
      ...phase,
      expectedReward: phase.expectedReward * (option.riskLevel === 'high' ? 1.3 : 1)
    }));
    
    // 找到最低点（死亡谷）
    const minRewardPhase = timeline.reduce((min, phase) => 
      phase.expectedReward < min.expectedReward ? phase : min
    );
    
    return {
      optionId: option.id,
      optionName: option.name,
      scenarios,
      timeline,
      metrics: {
        successProbability: successProb,
        expectedValue,
        maxDownside: scenarios.worst.cumulativeReward,
        breakEvenPoint: this.estimateBreakeven(timeline, expectedValue),
        valleyOfDeath: minRewardPhase.phase
      }
    };
  }

  private generateScenario(
    type: 'best' | 'expected' | 'worst',
    option: DecisionOption,
    baseSuccess: number,
    gamma: number
  ): ScenarioOutcome {
    const probabilities = {
      best: baseSuccess * 0.5,
      expected: 1 - baseSuccess * 0.5 - (1 - baseSuccess) * 0.6,
      worst: (1 - baseSuccess) * 0.6
    };
    
    const rewards = {
      best: 80 - option.initialCost * 0.3,
      expected: 30 - option.initialCost * 0.5,
      worst: -50 - option.initialCost * 0.8
    };
    
    // 应用折扣因子
    const discountedReward = rewards[type] * Math.pow(gamma, 2); // 假设2年周期
    
    return {
      probability: probabilities[type],
      description: this.getScenarioDescription(type, option.name),
      stateAt: {
        wealth: type === 'best' ? 'improved' : type === 'worst' ? 'damaged' : 'stable',
        stress: type === 'best' ? 'low' : type === 'worst' ? 'very_high' : 'medium',
        freedom: type === 'best' ? 'high' : 'medium'
      },
      cumulativeReward: discountedReward,
      journeyHighlights: this.getJourneyHighlights(type)
    };
  }

  private getScenarioDescription(type: string, optionName: string): string {
    switch (type) {
      case 'best': return `${optionName}取得超预期成功，实现主要目标`;
      case 'expected': return `${optionName}达到预期结果，有得有失`;
      case 'worst': return `${optionName}遭遇重大挫折，需要调整方向`;
      default: return '';
    }
  }

  private getJourneyHighlights(type: string): string[] {
    switch (type) {
      case 'best': return ['早期胜利', '资源增长', '正向循环', '目标达成'];
      case 'expected': return ['起步困难', '逐步适应', '小有成就', '持续挑战'];
      case 'worst': return ['初期受挫', '资源消耗', '压力累积', '被迫调整'];
      default: return [];
    }
  }

  private estimateBreakeven(timeline: TimelinePhase[], expectedValue: number): string {
    let cumulative = 0;
    for (const phase of timeline) {
      cumulative += phase.expectedReward;
      if (cumulative > 0) {
        return phase.phase;
      }
    }
    return expectedValue > 0 ? 'Year 2+' : 'Uncertain';
  }

  private generateReport(
    decisionNode: DecisionNode,
    branches: SimulationBranch[],
    soulSummary: any,
    gamma: number
  ): DecisionImpactReport {
    // 路径对比
    const pathComparison: PathComparison[] = branches.map(branch => ({
      path: branch.optionName,
      successRate: `${(branch.metrics.successProbability * 100).toFixed(0)}%`,
      expectedOutcome: branch.scenarios.expected.description,
      timeToBreakeven: branch.metrics.breakEvenPoint,
      regretScore: this.calculateRegretScore(branch, soulSummary),
      fitWithValues: this.calculateValueFit(branch, soulSummary)
    }));
    
    // J曲线分析
    const jCurveAnalysis: JCurveAnalysis[] = branches.map(branch => {
      const minPhase = branch.timeline.reduce((min, p) => 
        p.expectedReward < min.expectedReward ? p : min
      );
      const maxPhase = branch.timeline.reduce((max, p) => 
        p.expectedReward > max.expectedReward ? p : max
      );
      
      return {
        path: branch.optionName,
        dipDepth: Math.round(minPhase.expectedReward),
        dipDuration: minPhase.phase,
        recoveryPoint: branch.metrics.breakEvenPoint,
        peakHeight: Math.round(maxPhase.expectedReward),
        visualDescription: this.describeJCurve(branch)
      };
    });
    
    // 找出最优和次优路径
    const sortedBranches = [...branches].sort((a, b) => 
      b.metrics.expectedValue - a.metrics.expectedValue
    );
    const optimal = sortedBranches[0];
    const alternative = sortedBranches[1];
    
    return {
      title: `决策分析：${decisionNode.question}`,
      executiveSummary: this.generateSummary(optimal, soulSummary, gamma),
      pathComparison,
      jCurveAnalysis,
      recommendation: {
        optimalPath: optimal.optionName,
        alternativePath: alternative?.optionName || '无',
        reasoning: this.generateReasoningText(optimal, alternative, soulSummary),
        caveats: [
          '此分析基于统计概率和您的画像，实际结果可能因执行力和外部因素而异',
          `折扣因子 γ=${gamma.toFixed(2)} 假设您${gamma > 0.8 ? '偏好长期收益' : '更看重短期结果'}`,
          '建议定期重新评估，尤其在关键节点'
        ],
        nextSteps: this.generateNextSteps(optimal, soulSummary)
      },
      regretMinimization: {
        question: '想象10年后的你回望今天，你更可能后悔什么？',
        regretIfChooseA: `选择${optimal.optionName}但失败：${this.getRegretDescription(optimal, 'fail')}`,
        regretIfChooseB: `没有尝试${optimal.optionName}：${this.getRegretDescription(optimal, 'not_try')}`,
        insight: soulSummary.topValues.includes('achievement') 
          ? '您重视成就，"没有尝试"的后悔可能更持久'
          : '您重视安全，失败的后悔需要更多考量'
      },
      decisionTriggers: {
        proceedWithA_if: [
          '获得明确的早期验证信号',
          '资源储备达到安全阈值',
          '找到合适的合作伙伴/支持'
        ],
        proceedWithB_if: [
          '当前机会有明显改善',
          '个人状况发生重大变化',
          '市场环境转向不利'
        ],
        reconsider_if: [
          '出现意料之外的机会',
          '关键假设被证伪',
          '3个月内无明显进展'
        ]
      }
    };
  }

  private calculateRegretScore(branch: SimulationBranch, soulSummary: any): number {
    let score = 5; // 基础分
    
    // 失败概率高 + 高风险厌恶 = 高后悔
    if (branch.metrics.successProbability < 0.3 && 
        soulSummary.keyTraits.riskTolerance === 'low') {
      score += 3;
    }
    
    // 低谷深 = 高后悔风险
    const minReward = Math.min(...branch.timeline.map(p => p.expectedReward));
    if (minReward < -40) score += 2;
    
    return Math.min(10, Math.max(1, score));
  }

  private calculateValueFit(branch: SimulationBranch, soulSummary: any): number {
    let fit = 5;
    
    // 高期望价值 = 高契合
    if (branch.metrics.expectedValue > 30) fit += 2;
    if (branch.metrics.expectedValue < 0) fit -= 2;
    
    // 成功率与风险偏好匹配
    if (soulSummary.keyTraits.riskTolerance === 'high' && 
        branch.metrics.successProbability < 0.4) {
      fit += 1; // 高风险者不介意低成功率
    }
    
    return Math.min(10, Math.max(1, fit));
  }

  private describeJCurve(branch: SimulationBranch): string {
    const minReward = Math.min(...branch.timeline.map(p => p.expectedReward));
    const maxReward = Math.max(...branch.timeline.map(p => p.expectedReward));
    
    if (minReward > 0) {
      return '平稳上升型：无明显低谷，稳步增长';
    } else if (minReward < -40) {
      return `深V型：前期急剧下降至${minReward}，后期可能强势反弹至${maxReward}`;
    } else {
      return `浅U型：温和下降至${minReward}，逐步恢复`;
    }
  }

  private generateSummary(optimal: SimulationBranch, soulSummary: any, gamma: number): string {
    return `基于您的画像（风险偏好: ${soulSummary.keyTraits.riskTolerance}, 核心价值观: ${soulSummary.topValues.slice(0, 2).join('/')}），` +
           `${optimal.optionName}的期望价值最高(${optimal.metrics.expectedValue.toFixed(1)})。` +
           `成功概率约${(optimal.metrics.successProbability * 100).toFixed(0)}%，` +
           `预计回本点在${optimal.metrics.breakEvenPoint}。`;
  }

  private generateReasoningText(optimal: SimulationBranch, alternative: SimulationBranch | undefined, soulSummary: any): string {
    let text = `${optimal.optionName}在风险调整后表现最优。`;
    
    if (alternative) {
      const diff = optimal.metrics.expectedValue - alternative.metrics.expectedValue;
      if (diff < 10) {
        text += `与${alternative.optionName}差距不大(${diff.toFixed(1)}分)，可根据个人偏好选择。`;
      } else {
        text += `显著优于${alternative.optionName}(差${diff.toFixed(1)}分)。`;
      }
    }
    
    return text;
  }

  private generateNextSteps(optimal: SimulationBranch, soulSummary: any): string[] {
    const steps = [
      `设定明确的${optimal.optionName}启动条件`,
      '建立3个月的检验点',
      '准备应急预案'
    ];
    
    if (soulSummary.keyTraits.decisionStyle === 'hesitant') {
      steps.unshift('给自己设定决策截止日期，避免无限拖延');
    }
    
    if (soulSummary.stressLevel > 60) {
      steps.push('在做重大决策前，先管理当前压力');
    }
    
    return steps;
  }

  private getRegretDescription(branch: SimulationBranch, type: 'fail' | 'not_try'): string {
    if (type === 'fail') {
      return `消耗了时间和资源，可能需要从${branch.scenarios.worst.stateAt.wealth}状态恢复`;
    } else {
      return '可能会想"如果当时尝试了会怎样"，尤其是看到他人成功时';
    }
  }

  private mapFinancialHealth(stressLevel: number): string {
    if (stressLevel > 80) return 'crisis';
    if (stressLevel > 60) return 'stressed';
    if (stressLevel > 40) return 'stable';
    if (stressLevel > 20) return 'comfortable';
    return 'abundant';
  }

  private parseTimeHorizon(horizon: string): number {
    const match = horizon.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (horizon.includes('year')) return num * 12;
      if (horizon.includes('month')) return num;
    }
    return 24; // 默认2年
  }
}

// 导出单例
export const destinyEngine = new DestinyEngine();
