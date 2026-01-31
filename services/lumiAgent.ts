import {
  AgentInput,
  AgentOutput,
  InputMode,
  IntentCategory,
  PrivacyAction,
  PrivacyFlag,
  SoulMatrix,
  PolicyConfig,
  ToolResultData,
  TaskPlan,
  TaskStep,
  OrchestrationPlan
} from "../types";
import * as GeminiService from "./geminiService";
import { ConversationMessage } from "./geminiService";
import { getToolByName, enrichWithSuggestions } from "./agentTools";
import { trackAiCall } from "../components/PrivacyPanel";
import { recordInteraction, addInterestTag } from "./localStorageService";
import { checkAgentBoundary, InteractionLevel, BoundaryCheckResult } from "./agentBoundary";
import { recordTrustAction } from "./trustScoreService";
import { createOrchestrator } from "./agentOrchestrator";
import { superAgentOrchestrate, analyzeAndDecompose, extractDepartureDate, extractRoute } from "./superAgentBrain";
import { buildDecisionForAgentOutput } from "./optimalAnswerService";
import { quickAssociate } from "./associativeThinkingService";
import { getRecommendationForQuery, inferGamma, ActionRecommendation } from "./bellmanLifeService";
import { extractCurrentState } from "./stateExtractor";
import { getEnhancedDigitalAvatar } from "./localStorageService";
import { tavilyService, TavilySearchResult } from "./tavilyService";

// 需要实时数据的关键词
const REALTIME_DATA_KEYWORDS = [
  // 新闻/时事
  '新闻', '最新', '今天', '昨天', '刚刚', '最近', '现在', '当前',
  // 市场/金融
  '股票', '股价', '基金', '汇率', '房价', '利率', '市场', '行情',
  // 天气
  '天气', '气温', '下雨', '预报',
  // 热点
  '热搜', '热门', '趋势', '流行',
  // 英文
  'news', 'latest', 'today', 'current', 'stock', 'weather', 'trending'
];

// Life optimization keywords
const LIFE_OPT_KEYWORDS = [
  '我该怎么办', '该怎么办', '下一步', '怎么选', '纠结', '焦虑',
  '不知道该', '犹豫', '要不要', '值不值得', '该不该',
  '怎么办才好', '应该怎么', '迷茫', '困惑', '选择困难',
  'what should I', 'next step', 'should I', 'what to do'
];

// Simple Privacy Regex Patterns (Client-side PrivacyGuard)
const PRIVACY_PATTERNS = {
  [PrivacyFlag.PHONE]: /(\b|(?<!\d))((13[0-9]|14[5-9]|15[0-3,5-9]|16[2,5,6,7]|17[0-8]|18[0-9]|19[0-3,5-9])\d{8})(\b|(?!\d))/,
  [PrivacyFlag.ID_CARD]: /([1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx])/,
  // Updated address regex to support Chinese address keywords
  [PrivacyFlag.ADDRESS]: /(province|city|street|road|lane|district|省|市|区|街|路|号)/i,
};

// Keywords that suggest tool usage
const TOOL_KEYWORDS = {
  weather: ['天气', '气温', '温度', '下雨', '晴天', 'weather', 'forecast'],
  calculator: ['计算', '算一下', '等于多少', '加', '减', '乘', '除', '%', '汇率', 'calculate', 'convert'],
  translate: ['翻译', '译成', '怎么说', 'translate', 'translation'],
  calendar: ['日程', '日历', '安排', '日程表', 'calendar', 'schedule', 'meeting'],
  reminder: ['提醒', '提醒我', '别忘了', 'remind', 'reminder', 'alarm']
};

const MAX_FLIGHT_SEARCH_DAYS_AHEAD = 330;

function getDateRangeStatus(dateStr: string): 'ok' | 'past' | 'too_far' | 'invalid' {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return 'invalid';
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((parsed.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'past';
  if (diffDays > MAX_FLIGHT_SEARCH_DAYS_AHEAD) return 'too_far';
  return 'ok';
}

export class LumiAgent {
  private soul: SoulMatrix;
  private policy: PolicyConfig;
  private apiKey: string;
  private currentTask: TaskPlan | null = null;
  private lastRealtimeData: { query: string; results: TavilySearchResult[]; timestamp: number } | null = null;

  constructor(soul: SoulMatrix, policy: PolicyConfig, apiKey: string = '') {
    this.soul = soul;
    this.policy = policy;
    this.apiKey = apiKey;
  }

  public updateConfig(soul: SoulMatrix, policy: PolicyConfig, apiKey?: string) {
    this.soul = soul;
    this.policy = policy;
    if (apiKey !== undefined) {
      this.apiKey = apiKey;
    }
  }

  /**
   * 检查是否需要实时数据
   */
  private needsRealtimeData(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return REALTIME_DATA_KEYWORDS.some(kw => lowerQuery.includes(kw.toLowerCase()));
  }

  /**
   * 获取实时数据增强上下文
   */
  private async getRealtimeContext(query: string): Promise<string> {
    try {
      console.log('[LumiAgent] 正在获取实时数据...', query);
      const result = await tavilyService.smartSearch(query);
      
      if (result.error || result.results.length === 0) {
        console.log('[LumiAgent] 未获取到实时数据');
        return '';
      }

      // 缓存结果
      this.lastRealtimeData = {
        query,
        results: result.results,
        timestamp: Date.now()
      };

      // 构建上下文
      const context = result.results.slice(0, 3).map((r, i) => 
        `[来源${i + 1}: ${new URL(r.url).hostname}]\n${r.title}\n${r.content?.slice(0, 200) || ''}`
      ).join('\n\n');

      console.log(`[LumiAgent] 获取到 ${result.results.length} 条实时数据`);
      
      return `\n\n--- 实时数据 (${new Date().toLocaleString()}) ---\n${context}\n---`;
    } catch (error) {
      console.error('[LumiAgent] 获取实时数据失败:', error);
      return '';
    }
  }

  /**
   * 获取最近的实时数据（用于显示来源）
   */
  public getLastRealtimeData(): { query: string; results: TavilySearchResult[]; timestamp: number } | null {
    return this.lastRealtimeData;
  }

  public async handle(
    input: AgentInput,
    conversationHistory: ConversationMessage[] = [],
    appScenarioHint: string = ''
  ): Promise<AgentOutput> {
    if (input.mode !== InputMode.AGENT) {
      return { type: 'NONE' };
    }

    const rawText = input.rawText.trim();
    if (!rawText) return { type: 'NONE' };

    // 0. Agent Boundary Check (V2.1 Security)
    const boundaryCheck = checkAgentBoundary(rawText, {
      appName: input.appContext?.packageName,
      isPrivate: input.appContext?.isPasswordField
    });

    // L4 Forbidden - reject immediately
    if (!boundaryCheck.allowed) {
      recordTrustAction('rule_followed');
      return {
        type: 'ERROR',
        message: boundaryCheck.message
      };
    }

    // Store boundary info for later use
    const requiresConfirmation = boundaryCheck.requiresConfirmation;

    // 1. Privacy Guard (Local First)
    const privacyAction = this.checkPrivacy(rawText, input.appContext?.fieldHints);
    if (privacyAction) {
      return { type: 'PRIVACY', action: privacyAction };
    }

    // 2. Check online status and policy for network usage
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const networkAllowed = this.policy.allowNetworkInAgentMode && isOnline;

    if (!networkAllowed) {
      const reason = isOnline ? 'policy' : 'offline';
      return this.handleLocalOnly(rawText, reason);
    }

    const route = extractRoute(rawText);
    const wantsFlight = /机票|航班|飞机|flight/i.test(rawText);

    // 3. Check for Life Optimization / Decision Support queries
    const isLifeOptQuery = LIFE_OPT_KEYWORDS.some(kw => rawText.toLowerCase().includes(kw.toLowerCase()));
    if (isLifeOptQuery) {
      console.log('[LumiAgent] Detected life optimization query, using Bellman optimizer');

      try {
        const avatar = getEnhancedDigitalAvatar();
        const state = extractCurrentState(avatar, input.appContext);
        const gamma = inferGamma(avatar?.personality);
        const recommendation = getRecommendationForQuery(rawText, input.appContext);

        // Convert to LifeActionRecommendation format
        const lifeRecommendation = {
          action: {
            id: recommendation.action.id,
            name: recommendation.action.name,
            description: recommendation.action.description,
            domain: recommendation.action.domain,
            timeHorizon: recommendation.action.timeHorizon
          },
          qValue: recommendation.qValue,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          expectedOutcome: recommendation.expectedOutcome,
          alternatives: recommendation.alternatives.map(alt => ({
            action: {
              id: alt.action.id,
              name: alt.action.name,
              description: alt.action.description
            },
            qValue: alt.qValue,
            tradeoff: alt.tradeoff
          })),
          anxietyRelief: recommendation.anxietyRelief
        };

        console.log(`[LumiAgent] Bellman recommendation: ${recommendation.action.name} (γ=${gamma.toFixed(2)}, Q=${recommendation.qValue.toFixed(2)})`);

        return {
          type: 'NEXT_BEST_ACTION',
          recommendation: lifeRecommendation,
          gamma
        };
      } catch (e) {
        console.error('[LumiAgent] Bellman optimization failed:', e);
        // Fall through to regular flow
      }
    }

    // 4. Check for travel/flight queries - use Super Agent Brain
    const isTravelQuery = /机票|航班|飞机|flight|travel|旅行|旅游|去.*(玩|旅)|酒店|hotel/i.test(rawText)
      || Boolean(route.origin || route.destination);

    if (isTravelQuery) {
      console.log('[LumiAgent] Detected travel query, using Super Agent Brain');

      if (!route.destination) {
        return {
          type: 'CLARIFICATION',
          prompt: '请告诉我要去的城市/目的地？',
          missingFields: ['destination'],
          contextQuery: rawText
        };
      }

      if (wantsFlight && !route.origin) {
        return {
          type: 'CLARIFICATION',
          prompt: '请告诉我从哪座城市出发？',
          missingFields: ['origin'],
          contextQuery: rawText
        };
      }

      // 4.1 Check for missing required information (dates)
      const hasDate = /\d{1,4}[-\/年]\d{1,2}[-\/月]\d{1,2}|下周|明天|后天|周[一二三四五六日末]|月底|月初|next week|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+号|\d+日/i.test(rawText);

      // If missing date, ask the user for clarification
      if (!hasDate && wantsFlight) {
        console.log('[LumiAgent] Missing travel date, asking for clarification');
        return {
          type: 'CLARIFICATION',
          prompt: '我可以帮您搜索航班，请问您计划什么时候出发？',
          missingFields: ['date'],
          contextQuery: rawText
        };
      }

      const parsedDate = extractDepartureDate(rawText);
      if (parsedDate) {
        const dateStatus = getDateRangeStatus(parsedDate);
        if (dateStatus === 'past') {
          return {
            type: 'CLARIFICATION',
            prompt: '出发日期已过期，请告诉我新的出发日期（航班通常只能查询未来 11 个月）。',
            missingFields: ['date'],
            contextQuery: rawText
          };
        }
        if (dateStatus === 'too_far') {
          return {
            type: 'CLARIFICATION',
            prompt: '出发日期超出可查询范围（通常为未来 11 个月内）。请给我一个更近的日期。',
            missingFields: ['date'],
            contextQuery: rawText
          };
        }
        if (dateStatus === 'invalid') {
          return {
            type: 'CLARIFICATION',
            prompt: '日期格式不太清楚，可以告诉我具体出发日期吗？',
            missingFields: ['date'],
            contextQuery: rawText
          };
        }
      }

      try {
        const globalSolution = await superAgentOrchestrate(rawText, this.apiKey, (task, status) => {
          console.log(`[SuperAgent] Task ${task.id}: ${status}`);
        });

        if (globalSolution.success && globalSolution.results.length > 0) {
          // Convert Super Agent results to AgentOutput format
          const decision = buildDecisionForAgentOutput({
            outputType: 'SUPER_AGENT_RESULT',
            query: rawText,
            solution: globalSolution,
            summary: globalSolution.summary,
            recommendation: globalSolution.recommendation
          });
          return {
            type: 'SUPER_AGENT_RESULT' as any,
            globalSolution,
            summary: globalSolution.summary,
            recommendation: globalSolution.recommendation,
            results: globalSolution.results,
            decision
          };
        }
      } catch (e) {
        console.error('[SuperAgent] Orchestration failed:', e);
        // Fall through to regular flow
      }
    }

    // 5. Try Tool Calling (for simpler queries)
    const toolResult = await this.tryToolCalling(rawText);
    if (toolResult) {
      return toolResult;
    }

    // 5.5. Check for complex multi-agent orchestration scenarios
    // (e.g., travel planning, event coordination)
    const complexIntent = await GeminiService.analyzeComplexIntent(
      rawText,
      this.apiKey,
      conversationHistory
    );
    if (complexIntent && complexIntent.impliedNeeds.length >= 2) {
      console.log('[LumiAgent] Detected complex intent, triggering orchestration:', complexIntent.primaryIntent);
      const orchestrator = createOrchestrator(this.apiKey);
      const plan = await orchestrator.planAgentTasks(complexIntent);
      const executedPlan = await orchestrator.executeAgentTasks(plan);
      const decision = buildDecisionForAgentOutput({
        outputType: 'ORCHESTRATION_RESULT',
        query: rawText,
        plan: executedPlan
      });
      return { type: 'ORCHESTRATION_RESULT', plan: executedPlan, decision };
    }

    // 5. Check for complex multi-step tasks
    const complexCheck = await GeminiService.detectComplexTask(rawText, this.apiKey);
    if (complexCheck.isComplex) {
      const taskPlan = await GeminiService.planMultiStepTask(rawText, this.apiKey);
      if (taskPlan && taskPlan.steps.length > 0) {
        this.currentTask = taskPlan;
        return { type: 'TASK_PROGRESS', task: taskPlan };
      }
    }

    // 5. 获取实时数据（如果需要）
    let realtimeContext = '';
    if (this.needsRealtimeData(rawText)) {
      console.log('[LumiAgent] 检测到需要实时数据的查询');
      realtimeContext = await this.getRealtimeContext(rawText);
    }

    // 6. Fall back to Intent Classification
    const intent = await GeminiService.classifyIntent(rawText, this.apiKey);

    // 7. Routing based on Intent
    switch (intent.category) {
      // =====================================
      // 三大核心功能
      // =====================================
      case IntentCategory.WRITE_ASSIST:
      case IntentCategory.REWRITE: {
        // 帮我写 - 生成多风格回复建议
        // 如果有实时数据，添加到场景提示中
        const enhancedScenarioHint = realtimeContext 
          ? `${appScenarioHint}\n\n[实时数据可用，请结合最新信息回复]${realtimeContext}`
          : appScenarioHint;
        const drafts = await GeminiService.generateDrafts(rawText, this.soul, this.apiKey, conversationHistory, enhancedScenarioHint);
        trackAiCall(); // Track successful AI call
        
        // 如果有实时数据，添加数据来源提示到 drafts
        if (realtimeContext && this.lastRealtimeData) {
          drafts.forEach(draft => {
            draft.text += `\n\n📰 数据来源: ${this.lastRealtimeData!.results.slice(0, 2).map(r => new URL(r.url).hostname).join(', ')}`;
          });
        }
        
        // 添加联想建议
        const suggestions = quickAssociate(rawText, 'DRAFTS');
        const decision = buildDecisionForAgentOutput({
          outputType: 'DRAFTS',
          query: rawText,
          drafts,
          soul: this.soul
        });
        return { type: 'DRAFTS', drafts, decision, associatedSuggestions: suggestions };
      }

      case IntentCategory.SEARCH_ASSIST: {
        // 帮我找 - 尝试使用工具（比价、搜索等）
        const searchResult = await this.tryToolCalling(rawText);
        if (searchResult) return searchResult;
        // 降级到普通搜索
        const searchTool = getToolByName('web_search');
        if (searchTool) {
          const result = await searchTool.execute({ query: rawText });
          const enrichedResult = await enrichWithSuggestions(result, rawText);
          const suggestions = quickAssociate(rawText, 'TOOL_RESULT');
          return {
            type: 'TOOL_RESULT',
            result: enrichedResult as ToolResultData,
            summary: `搜索: ${rawText}`,
            associatedSuggestions: suggestions
          };
        }
        return { type: 'ERROR', message: '搜索功能暂不可用' };
      }

      case IntentCategory.MEMORY_ASSIST: {
        // 帮我记 - 使用智能保存工具
        const saveTool = getToolByName('smart_save');
        if (saveTool) {
          const result = await saveTool.execute({ content: rawText });
          const enrichedResult = await enrichWithSuggestions(result, rawText);
          const suggestions = quickAssociate(rawText, 'TOOL_RESULT');
          return {
            type: 'TOOL_RESULT',
            result: enrichedResult as ToolResultData,
            summary: result.data?.message || '已保存',
            associatedSuggestions: suggestions
          };
        }
        return { type: 'ERROR', message: '保存功能暂不可用' };
      }

      // =====================================
      // 原有功能
      // =====================================
      case IntentCategory.SHOPPING:
      case IntentCategory.TRAVEL:
      case IntentCategory.DINING:
      case IntentCategory.CALENDAR: {
        const cards = await GeminiService.generateCards(intent, this.apiKey);
        const cardSuggestions = quickAssociate(rawText, 'CARDS');
        const decision = buildDecisionForAgentOutput({
          outputType: 'CARDS',
          query: rawText,
          cards
        });
        return { type: 'CARDS', cards, decision, associatedSuggestions: cardSuggestions };
      }

      case IntentCategory.PRIVACY_MASK:
        return {
          type: 'PRIVACY',
          action: {
            type: 'MASK',
            maskedValue: '****',
            originalValue: rawText,
            flag: PrivacyFlag.PASSWORD
          }
        };

      case IntentCategory.UNKNOWN:
      default: {
        // Fallback to chat/drafts if unknown
        // 如果有实时数据，添加到场景提示中
        const enhancedHint = realtimeContext 
          ? `${appScenarioHint}\n\n[实时数据可用，请结合最新信息回复]${realtimeContext}`
          : appScenarioHint;
        const fallbackDrafts = await GeminiService.generateDrafts(rawText, this.soul, this.apiKey, conversationHistory, enhancedHint);
        
        // 如果有实时数据，添加数据来源提示
        if (realtimeContext && this.lastRealtimeData) {
          fallbackDrafts.forEach(draft => {
            draft.text += `\n\n📰 数据来源: ${this.lastRealtimeData!.results.slice(0, 2).map(r => new URL(r.url).hostname).join(', ')}`;
          });
        }
        
        const fallbackSuggestions = quickAssociate(rawText, 'DRAFTS');
        const decision = buildDecisionForAgentOutput({
          outputType: 'DRAFTS',
          query: rawText,
          drafts: fallbackDrafts,
          soul: this.soul
        });
        return { type: 'DRAFTS', drafts: fallbackDrafts, decision, associatedSuggestions: fallbackSuggestions };
      }
    }
  }

  /**
   * Handle offline fallback - use local templates when network is unavailable
   */
  private handleOfflineFallback(rawText: string): AgentOutput {
    // Simple keyword detection for offline routing
    const text = rawText.toLowerCase();

    // Offline templates for common scenarios
    const offlineTemplates: Record<string, { text: string; tone: string }[]> = {
      decline: [
        { text: '不好意思，这次可能去不了了，下次一定！', tone: 'casual' },
        { text: '感谢邀请，但最近比较忙，改天再约？', tone: 'polite' },
        { text: '这次恐怕不行，希望下次能参加！', tone: 'friendly' }
      ],
      thanks: [
        { text: '非常感谢你的帮助！', tone: 'warm' },
        { text: '谢谢，太感谢了！', tone: 'casual' },
        { text: '感谢您的支持与配合！', tone: 'professional' }
      ],
      confirm: [
        { text: '好的，收到！', tone: 'concise' },
        { text: '没问题，我知道了。', tone: 'casual' },
        { text: '收到，我会按时处理。', tone: 'professional' }
      ],
      default: [
        { text: '好的，我明白了。', tone: 'casual' },
        { text: '收到，谢谢告知！', tone: 'polite' },
        { text: '了解，感谢分享！', tone: 'friendly' }
      ]
    };

    // Match templates based on keywords
    let templates = offlineTemplates.default;
    if (text.includes('拒绝') || text.includes('婉拒') || text.includes('decline')) {
      templates = offlineTemplates.decline;
    } else if (text.includes('感谢') || text.includes('谢谢') || text.includes('thanks')) {
      templates = offlineTemplates.thanks;
    } else if (text.includes('确认') || text.includes('收到') || text.includes('confirm')) {
      templates = offlineTemplates.confirm;
    }

    const drafts = templates.map((t, i) => ({
      id: `offline-${Date.now()}-${i}`,
      text: t.text,
      tone: t.tone
    }));
    const decision = buildDecisionForAgentOutput({
      outputType: 'DRAFTS',
      query: rawText,
      drafts,
      soul: this.soul
    });
    return {
      type: 'DRAFTS',
      drafts,
      decision
    };
  }

  /**
   * Local-only handling for offline or policy-restricted mode
   */
  private async handleLocalOnly(
    rawText: string,
    reason: 'offline' | 'policy'
  ): Promise<AgentOutput> {
    const intent = this.classifyLocalIntent(rawText);

    if (intent === 'FIND') {
      return {
        type: 'ERROR',
        message: reason === 'offline'
          ? '当前离线，无法执行搜索/比价/导航。'
          : '当前策略禁止联网，无法执行搜索/比价/导航。'
      };
    }

    if (intent === 'REMEMBER') {
      const saveTool = getToolByName('smart_save');
      if (saveTool) {
        const result = await saveTool.execute({ content: rawText });
        const enrichedResult = await enrichWithSuggestions(result, rawText);
        const suggestions = quickAssociate(rawText, 'TOOL_RESULT');
        return {
          type: 'TOOL_RESULT',
          result: enrichedResult as ToolResultData,
          summary: result.data?.message || '已保存',
          associatedSuggestions: suggestions
        };
      }
      return { type: 'ERROR', message: '保存功能暂不可用' };
    }

    // Default to local draft templates for write/unknown intents
    return this.handleOfflineFallback(rawText);
  }

  /**
   * Lightweight local intent detection to avoid network calls
   */
  private classifyLocalIntent(
    rawText: string
  ): 'WRITE' | 'FIND' | 'REMEMBER' | 'UNKNOWN' {
    const text = rawText.toLowerCase();

    const findRegex = /帮我找|搜索|查找|比价|导航|地图|路线|地址|位置|去哪|价格|链接|网址|open link|search/i;
    const rememberRegex = /帮我记|记录|保存|待办|提醒|日程|会议|开会|稍后阅读|明天|后天|下周|周[一二三四五六日天]|\d{1,2}[:：]\d{2}|\d{1,2}[月\/]\d{1,2}[日号]?/i;
    const writeRegex = /帮我写|写一条|写个|写封|回复|回一下|改写|润色|文案|邮件|祝福|道歉|感谢|拒绝|请假/i;

    if (findRegex.test(text)) return 'FIND';
    if (rememberRegex.test(text)) return 'REMEMBER';
    if (writeRegex.test(text)) return 'WRITE';

    return 'UNKNOWN';
  }

  /**
   * Try to execute the request using tool calling
   */
  private async tryToolCalling(rawText: string): Promise<AgentOutput | null> {
    try {
      // Use Gemini function calling to determine if tools are needed
      const result = await GeminiService.executeWithTools(rawText, this.apiKey);

      if (result.toolCalls && result.toolCalls.length > 0) {
        // Execute the first tool call
        const toolCall = result.toolCalls[0];
        const tool = getToolByName(toolCall.name);

        if (tool) {
          console.log(`Executing tool: ${toolCall.name}`, toolCall.args);
          let toolResult = await tool.execute(toolCall.args);

          // Special handling for translation - needs API call
          if (toolCall.name === 'translate' && toolResult.data?.needsApiCall) {
            const translatedText = await GeminiService.translateText(
              toolResult.data.originalText,
              toolResult.data.fromLang,
              toolResult.data.toLang,
              this.apiKey
            );
            toolResult = {
              ...toolResult,
              data: {
                ...toolResult.data,
                translatedText,
                needsApiCall: false
              }
            };
          }

          // Record tool usage for digital avatar
          recordInteraction('tool_used', {
            toolName: toolCall.name,
            args: toolCall.args,
            success: toolResult.success
          });

          // Add interest tag based on tool type
          if (toolResult.success) {
            addInterestTag(toolCall.name, 0.6);
          }

          // Enrich result with universal smart suggestions
          const enrichedResult = await enrichWithSuggestions(toolResult, rawText);

          return {
            type: 'TOOL_RESULT',
            result: enrichedResult as ToolResultData,
            summary: this.generateToolSummary(toolCall.name, enrichedResult)
          };
        }
      }

      return null; // No tools needed
    } catch (error) {
      console.error('Tool calling error:', error);
      return null; // Fall back to intent classification
    }
  }

  /**
   * Generate a friendly summary of tool result
   */
  private generateToolSummary(toolName: string, result: any): string {
    if (!result.success) {
      return result.error || '操作失败';
    }

    switch (toolName) {
      case 'get_weather':
        return `${result.data.location}：${result.data.temperature}${result.data.unit}，${result.data.condition}`;
      case 'calculator':
        return `${result.data.expression} = ${result.data.result}${result.data.resultUnit || ''}`;
      case 'translate':
        return result.data.translatedText || '翻译完成';
      case 'calendar':
        return result.data.message;
      case 'reminder':
        return result.data.message;
      case 'web_search':
        return result.data.message || `搜索到 ${result.data.results?.length || 0} 条结果`;
      case 'notes':
        return result.data.message;
      case 'location':
        return result.data.message || `找到 ${result.data.places?.length || 0} 个地点`;
      default:
        return '操作完成';
    }
  }

  /**
   * Handle task confirmation or cancellation
   */
  public async handleTaskAction(action: 'confirm' | 'cancel'): Promise<AgentOutput> {
    if (!this.currentTask) {
      return { type: 'ERROR', message: '没有进行中的任务' };
    }

    if (action === 'cancel') {
      this.currentTask = null;
      return { type: 'NONE' };
    }

    // Continue task execution
    const task = this.currentTask;

    // Set start time if not already set
    if (!task.startedAt) {
      task.startedAt = Date.now();
    }

    // Initialize stepResults if not present
    if (!task.stepResults) {
      task.stepResults = {};
    }

    task.status = 'executing';

    // Execute all pending steps with dependency awareness
    while (this.hasExecutableSteps(task)) {
      // Find all steps that can be executed (dependencies met, not yet completed)
      const executableSteps = this.findExecutableSteps(task);

      if (executableSteps.length === 0) {
        // No executable steps but task not complete - might be waiting for confirmation
        const waitingStep = task.steps.find(s => s.status === 'waiting_confirmation');
        if (waitingStep) {
          task.status = 'waiting_confirmation';
          return { type: 'TASK_PROGRESS', task };
        }
        break;
      }

      // Check if any step requires confirmation
      const confirmationStep = executableSteps.find(
        s => s.requiresConfirmation && s.status === 'pending'
      );
      if (confirmationStep) {
        confirmationStep.status = 'waiting_confirmation';
        task.status = 'waiting_confirmation';
        return { type: 'TASK_PROGRESS', task };
      }

      // Execute steps (parallel if possible)
      const parallelSteps = executableSteps.filter(s => s.canRunParallel !== false);
      const sequentialSteps = executableSteps.filter(s => s.canRunParallel === false);

      // Execute parallel steps together
      if (parallelSteps.length > 1) {
        const results = await Promise.all(
          parallelSteps.map(step => this.executeStep(step, task))
        );
        // Check if any failed
        const failed = results.find(r => !r);
        if (failed !== undefined && !failed) {
          task.status = 'failed';
          return { type: 'TASK_PROGRESS', task };
        }
      } else if (parallelSteps.length === 1) {
        const success = await this.executeStep(parallelSteps[0], task);
        if (!success) {
          task.status = 'failed';
          return { type: 'TASK_PROGRESS', task };
        }
      }

      // Execute sequential steps one by one
      for (const step of sequentialSteps) {
        const success = await this.executeStep(step, task);
        if (!success) {
          task.status = 'failed';
          return { type: 'TASK_PROGRESS', task };
        }
      }

      // Update currentStepIndex to reflect progress
      const completedCount = task.steps.filter(s => s.status === 'completed').length;
      task.currentStepIndex = completedCount;
    }

    // All steps completed
    task.status = 'completed';
    task.completedAt = Date.now();
    task.completedSummary = this.generateTaskSummary(task);
    this.currentTask = null;

    return { type: 'TASK_PROGRESS', task };
  }

  /**
   * Check if there are still steps that can be executed
   */
  private hasExecutableSteps(task: TaskPlan): boolean {
    return task.steps.some(s =>
      s.status === 'pending' ||
      s.status === 'waiting_confirmation' ||
      s.status === 'retrying'
    );
  }

  /**
   * Find steps that are ready to execute (all dependencies met)
   */
  private findExecutableSteps(task: TaskPlan): TaskStep[] {
    return task.steps.filter(step => {
      if (step.status !== 'pending' && step.status !== 'retrying') {
        return false;
      }
      // Check dependencies
      if (step.dependsOn && step.dependsOn.length > 0) {
        const allDepsCompleted = step.dependsOn.every(depId => {
          const depStep = task.steps.find(s => s.id === depId);
          return depStep && depStep.status === 'completed';
        });
        return allDepsCompleted;
      }
      return true;
    });
  }

  /**
   * Execute a single step with retry support
   */
  private async executeStep(step: TaskStep, task: TaskPlan): Promise<boolean> {
    if (!step.tool) {
      step.status = 'completed';
      return true;
    }

    const tool = getToolByName(step.tool);
    if (!tool) {
      step.status = 'completed';
      return true;
    }

    step.status = 'running';

    // Resolve parameter templates (e.g., {{step1.data.location}})
    const resolvedParams = this.resolveParamTemplates(step.toolParams || {}, task);

    try {
      let result = await tool.execute(resolvedParams);

      // Special handling for translation tool
      if (step.tool === 'translate' && result.data?.needsApiCall) {
        const translatedText = await GeminiService.translateText(
          result.data.originalText,
          result.data.fromLang,
          result.data.toLang,
          this.apiKey
        );
        result = {
          ...result,
          data: {
            ...result.data,
            translatedText,
            needsApiCall: false
          }
        };
      }

      if (result.success) {
        step.status = 'completed';
        step.result = result as ToolResultData;
        // Store result for dependent steps
        if (step.outputKey) {
          task.stepResults![step.outputKey] = result.data;
        }
        return true;
      } else {
        // Handle retry
        step.retryCount = (step.retryCount || 0) + 1;
        const maxRetries = step.maxRetries || 2;

        if (step.retryCount < maxRetries) {
          step.status = 'retrying';
          console.log(`Step ${step.id} failed, retrying (${step.retryCount}/${maxRetries})`);
          // Recursively retry
          return this.executeStep(step, task);
        }

        step.status = 'failed';
        step.result = result as ToolResultData;
        return false;
      }
    } catch (error) {
      console.error(`Step ${step.id} error:`, error);
      step.status = 'failed';
      return false;
    }
  }

  /**
   * Resolve parameter templates like {{stepId.field}}
   */
  private resolveParamTemplates(
    params: Record<string, any>,
    task: TaskPlan
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = value.replace(/\{\{(\w+)\.(.+?)\}\}/g, (match, outputKey, path) => {
          const stepData = task.stepResults?.[outputKey];
          if (!stepData) return match;
          // Simple path resolution
          const parts = path.split('.');
          let result = stepData;
          for (const part of parts) {
            result = result?.[part];
          }
          return result !== undefined ? String(result) : match;
        });
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Generate a summary of completed task
   */
  private generateTaskSummary(task: TaskPlan): string {
    const completedSteps = task.steps.filter(s => s.status === 'completed');
    const duration = task.completedAt && task.startedAt
      ? Math.round((task.completedAt - task.startedAt) / 1000)
      : 0;

    const summaries = completedSteps.map(step => {
      if (step.result?.data) {
        switch (step.tool) {
          case 'get_weather':
            return `查询了${step.result.data.location}的天气`;
          case 'calendar':
            return step.result.data.message;
          case 'reminder':
            return step.result.data.message;
          case 'calculator':
            return `计算结果: ${step.result.data.result}`;
          case 'translate':
            return `翻译完成`;
          default:
            return step.description;
        }
      }
      return step.description;
    });

    return `✅ 已完成 ${completedSteps.length} 个步骤 (${duration}秒): ${summaries.join('; ')}`;
  }

  private checkPrivacy(text: string, hints: string[] = []): PrivacyAction | null {
    // Check hints first
    if (hints.some(h => h.includes('phone') || h.includes('mobile'))) {
      return {
        type: 'FILL',
        maskedValue: '138****0000',
        originalValue: '13800000000',
        flag: PrivacyFlag.PHONE
      };
    }

    // Check content regex
    for (const [flag, regex] of Object.entries(PRIVACY_PATTERNS)) {
      if (regex.test(text)) {
        return {
          type: 'MASK',
          maskedValue: text.replace(regex, '****'),
          originalValue: text,
          flag: flag as PrivacyFlag
        };
      }
    }
    return null;
  }
}
