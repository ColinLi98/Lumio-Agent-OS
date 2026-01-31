/**
 * Keyboard Sentinel Service
 * Layer 1 本地实时意图检测与隐私保护
 */

import { IntentType, PrivacyRiskType } from '../prompts/keyboardSentinel';
import type { SentinelOutput } from '../prompts/keyboardSentinel';
export type { SentinelOutput } from '../prompts/keyboardSentinel';

// ============================================================================
// 隐私检测正则表达式
// ============================================================================

const PRIVACY_PATTERNS: Record<PrivacyRiskType, RegExp> = {
  [PrivacyRiskType.ID_CARD]: /\b[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/,
  [PrivacyRiskType.PHONE]: /\b1[3-9]\d{9}\b/,
  [PrivacyRiskType.BANK_CARD]: /\b([3-6]\d{15,18})\b/,
  [PrivacyRiskType.EMAIL]: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/i,
  [PrivacyRiskType.PASSWORD]: /(密码[是为:]?\s*\S+)|(pwd[:\s]+\S+)|(password[:\s]+\S+)/i,
  [PrivacyRiskType.ADDRESS]: /([\u4e00-\u9fa5]{2,}(省|市|区|县|镇|村|路|街|号|楼|室|单元)[\u4e00-\u9fa5\d]*){2,}/,
  [PrivacyRiskType.NAME_CONTEXT]: /(我叫|我是|本人|姓名[是为:]?)\s*[\u4e00-\u9fa5]{2,4}\b/,
};

// 隐私风险对应的动作
const PRIVACY_ACTIONS: Record<PrivacyRiskType, 'mask' | 'warn' | 'block'> = {
  [PrivacyRiskType.ID_CARD]: 'mask',
  [PrivacyRiskType.PHONE]: 'mask',
  [PrivacyRiskType.BANK_CARD]: 'mask',
  [PrivacyRiskType.EMAIL]: 'mask',
  [PrivacyRiskType.PASSWORD]: 'block',
  [PrivacyRiskType.ADDRESS]: 'warn',
  [PrivacyRiskType.NAME_CONTEXT]: 'warn',
};

// ============================================================================
// 意图检测关键词
// ============================================================================

interface IntentPattern {
  type: IntentType;
  keywords: string[];
  patterns?: RegExp[];
  urgency: 'low' | 'medium' | 'high';
  extractParams?: (text: string) => Record<string, any>;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // 高价值意图
  {
    type: IntentType.PURCHASE,
    keywords: ['买', '购买', '下单', '付款', '想要', '种草', '剁手', '入手', '囤货', 'buy', 'purchase', 'order', 'want to buy'],
    urgency: 'high',
    extractParams: (text) => {
      const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(元|块|刀|美元|€|£)/);
      return {
        hasPrice: !!priceMatch,
        price: priceMatch ? parseFloat(priceMatch[1]) : undefined,
      };
    }
  },
  {
    type: IntentType.TRAVEL,
    keywords: ['机票', '酒店', '出差', '旅行', '旅游', '出发', '航班', '高铁', '火车票', 'flight', 'hotel', 'travel', 'trip'],
    patterns: [/(去|飞|到)\s*[\u4e00-\u9fa5a-zA-Z]+/, /下?(周|个月|天).*(去|飞|出发)/],
    urgency: 'medium',
    extractParams: (text) => {
      // 提取目的地
      const destMatch = text.match(/(去|飞|到)\s*([\u4e00-\u9fa5a-zA-Z]+)/);
      // 提取时间
      const timeMatch = text.match(/(今天|明天|后天|下周[一二三四五六日]?|下个?月|\d+[月号日]|\d+-\d+-\d+)/);
      return {
        destination: destMatch ? destMatch[2] : undefined,
        date: timeMatch ? timeMatch[1] : undefined,
        product: text.includes('酒店') ? 'hotel' : text.includes('机票') || text.includes('飞') ? 'flight' : 'unknown'
      };
    }
  },
  {
    type: IntentType.SCHEDULE,
    keywords: ['提醒', '日程', '会议', '预约', '约', '安排', '日历', '备忘', 'remind', 'meeting', 'schedule', 'calendar', 'appointment'],
    patterns: [/(\d+[点时]|[上下]午|早上|晚上).*(开会|见面|提醒|约)/],
    urgency: 'medium',
    extractParams: (text) => {
      const timeMatch = text.match(/(\d+[点时]|[上下]午\d*[点时]?|早上|晚上|\d+:\d+)/);
      const dateMatch = text.match(/(今天|明天|后天|下周[一二三四五六日]|周[一二三四五六日]|\d+[月号日])/);
      return {
        time: timeMatch ? timeMatch[1] : undefined,
        date: dateMatch ? dateMatch[1] : undefined,
      };
    }
  },
  {
    type: IntentType.CAREER,
    keywords: ['辞职', '跳槽', '离职', '面试', '简历', 'offer', '加薪', '升职', '转行', '创业', '裸辞', '不干了', '换工作', '找工作', '职业', '工作'],
    patterns: [/(不想|想|要)(干|做|辞|离职|跳槽|创业)/, /受够了|不干了|累死了/, /辞职.*创业|创业.*辞职/],
    urgency: 'high',
    extractParams: (text) => {
      const isNegative = /受够|不想|烦|累|讨厌|恨/.test(text);
      return {
        action: text.includes('辞') || text.includes('离职') ? 'resignation' :
          text.includes('跳槽') ? 'job_change' :
            text.includes('面试') ? 'interview' : 'general',
        sentiment: isNegative ? 'negative' : 'neutral',
        emotion: isNegative ? 'frustrated' : 'calm'
      };
    }
  },
  {
    type: IntentType.HEALTH,
    keywords: ['预约', '挂号', '医院', '看病', '体检', '症状', '不舒服', '疼', '痛'],
    urgency: 'high',
    extractParams: (text) => {
      const symptomMatch = text.match(/(头|胃|肚子|腰|背|眼|牙|心).*(疼|痛|不舒服|难受)/);
      return {
        hasSymptom: !!symptomMatch,
        symptom: symptomMatch ? symptomMatch[0] : undefined,
      };
    }
  },
  {
    type: IntentType.FINANCE,
    keywords: ['转账', '投资', '理财', '借钱', '还款', '贷款', '基金', '股票'],
    patterns: [/转\s*\d+\s*(给|到)/, /借.*\d+/],
    urgency: 'high',
    extractParams: (text) => {
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(元|块|万|千)?/);
      return {
        amount: amountMatch ? parseFloat(amountMatch[1]) : undefined,
        unit: amountMatch ? (amountMatch[2] || '元') : undefined,
      };
    }
  },
  // 信息意图
  {
    type: IntentType.QUERY,
    keywords: ['怎么', '如何', '为什么', '是什么', '什么是', '哪里', '谁是'],
    urgency: 'low',
  },
  {
    type: IntentType.TRANSLATE,
    keywords: ['翻译', '英文怎么说', '中文怎么说', '是什么意思', '怎么读'],
    urgency: 'low',
  },
  {
    type: IntentType.CALCULATE,
    keywords: ['等于', '多少钱', '合计', '总共', '计算'],
    patterns: [/\d+\s*[+\-*/×÷]\s*\d+/, /\d+.*[加减乘除].*\d+/],
    urgency: 'low',
  },
];

// ============================================================================
// Agent 命令检测
// ============================================================================

const AGENT_TRIGGERS = [
  { pattern: /^\/(\w+)\s*(.*)/, type: 'command' },
  { pattern: /(Lumi|露米|小露)[,，]?\s*(.+)/, type: 'wake_word' },
  { pattern: /^@agent\s+(.+)/, type: 'mention' },
];

// ============================================================================
// Sentinel 核心逻辑
// ============================================================================

export class KeyboardSentinel {
  private lastAnalysis: SentinelOutput | null = null;
  private analysisCount = 0;

  /**
   * 分析输入文本
   */
  analyze(text: string): SentinelOutput {
    const startTime = performance.now();

    // 空文本快速返回
    if (!text || text.trim().length === 0) {
      return this.createSilentOutput(performance.now() - startTime);
    }

    // 1. 优先检测隐私风险
    const privacyResult = this.detectPrivacy(text);
    if (privacyResult) {
      return {
        privacy: privacyResult,
        meta: {
          processingMs: Math.round(performance.now() - startTime),
          shouldEscalate: false, // 隐私问题本地处理
        }
      };
    }

    // 2. 检测 Agent 命令
    const agentResult = this.detectAgentTrigger(text);
    if (agentResult) {
      return {
        agentTrigger: agentResult,
        meta: {
          processingMs: Math.round(performance.now() - startTime),
          shouldEscalate: true,
        }
      };
    }

    // 3. 检测意图
    const intentResult = this.detectIntent(text);
    if (intentResult && intentResult.confidence > 0.4) {
      // 重大决策意图（career, finance）更容易触发升级，普通购物走工具流程
      const isMajorIntent = ['career', 'finance'].includes(intentResult.type);
      return {
        intent: intentResult,
        meta: {
          processingMs: Math.round(performance.now() - startTime),
          shouldEscalate: isMajorIntent ? intentResult.confidence >= 0.5 : intentResult.confidence > 0.7,
        }
      };
    }

    // 4. 静默模式
    return this.createSilentOutput(performance.now() - startTime);
  }

  /**
   * 检测隐私风险
   */
  private detectPrivacy(text: string): SentinelOutput['privacy'] | null {
    for (const [riskType, pattern] of Object.entries(PRIVACY_PATTERNS)) {
      const match = text.match(pattern);
      if (match) {
        return {
          risk: riskType as PrivacyRiskType,
          action: PRIVACY_ACTIONS[riskType as PrivacyRiskType],
          maskedPreview: this.maskSensitiveData(match[0], riskType as PrivacyRiskType),
        };
      }
    }
    return null;
  }

  /**
   * 脱敏处理
   */
  private maskSensitiveData(data: string, type: PrivacyRiskType): string {
    switch (type) {
      case PrivacyRiskType.ID_CARD:
        return data.slice(0, 4) + '**********' + data.slice(-4);
      case PrivacyRiskType.PHONE:
        return data.slice(0, 3) + '****' + data.slice(-4);
      case PrivacyRiskType.BANK_CARD:
        return data.slice(0, 4) + ' **** **** ' + data.slice(-4);
      case PrivacyRiskType.EMAIL:
        const [local, domain] = data.split('@');
        return local.slice(0, 2) + '***@' + domain;
      default:
        return data.slice(0, 2) + '***';
    }
  }

  /**
   * 检测 Agent 触发命令
   */
  private detectAgentTrigger(text: string): SentinelOutput['agentTrigger'] | null {
    for (const trigger of AGENT_TRIGGERS) {
      const match = text.match(trigger.pattern);
      if (match) {
        if (trigger.type === 'command') {
          return {
            command: match[1],
            args: match[2] ? match[2].trim().split(/\s+/) : [],
          };
        } else {
          return {
            command: 'chat',
            args: [match[2] || match[1]],
          };
        }
      }
    }
    return null;
  }

  /**
   * 检测意图
   */
  private detectIntent(text: string): SentinelOutput['intent'] | null {
    let bestMatch: { pattern: IntentPattern; score: number } | null = null;

    for (const pattern of INTENT_PATTERNS) {
      let score = 0;

      // 关键词匹配
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword)) {
          score += 0.3;
        }
      }

      // 正则匹配
      if (pattern.patterns) {
        for (const regex of pattern.patterns) {
          if (regex.test(text)) {
            score += 0.4;
          }
        }
      }

      // 文本长度加权 (太短的可能误判)
      if (text.length < 5) {
        score *= 0.5;
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { pattern, score };
      }
    }

    if (!bestMatch || bestMatch.score < 0.3) {
      return null;
    }

    const confidence = Math.min(bestMatch.score, 1);
    const params = bestMatch.pattern.extractParams
      ? bestMatch.pattern.extractParams(text)
      : {};

    return {
      type: bestMatch.pattern.type,
      confidence,
      params,
      urgency: bestMatch.pattern.urgency,
    };
  }

  /**
   * 创建静默输出
   */
  private createSilentOutput(processingMs: number): SentinelOutput {
    return {
      meta: {
        processingMs: Math.round(processingMs),
        shouldEscalate: false,
      }
    };
  }

  /**
   * 流式分析 - 边打字边分析
   */
  analyzeStream(text: string, debounceMs: number = 300): Promise<SentinelOutput> {
    return new Promise((resolve) => {
      // 简单防抖，实际应用中需要更复杂的实现
      setTimeout(() => {
        resolve(this.analyze(text));
      }, debounceMs);
    });
  }

  /**
   * 获取分析统计
   */
  getStats() {
    return {
      totalAnalyses: this.analysisCount,
      lastAnalysis: this.lastAnalysis,
    };
  }
}

// 导出单例
export const keyboardSentinel = new KeyboardSentinel();

// 快捷函数
export const analyzeInput = (text: string) => keyboardSentinel.analyze(text);
