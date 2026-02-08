import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard } from './Keyboard';
import { CandidateBar } from './CandidateBar';
import { FeatureButtons } from './FeatureButtons';
import { SceneHint } from './SceneHint';
import { PredictionBar } from './PredictionBar';
import { VoiceButton } from './VoiceButton';
import { EmojiReactions } from './EmojiReactions';
import { ImageUploadPanel, ImageUploadButton } from './ImageUploadPanel';
import { LumiAppOverlay } from './LumiAppOverlay';
import { SentinelIndicator } from './SentinelIndicator';
import { SuperAgentResult } from './SuperAgentResultPanel';
import { InputMode, AgentOutput, AgentInput, SoulMatrix, PolicyConfig, TextDraft, ServiceCard, PrivacyAction, TaskPlan, DecisionMeta } from '../types';
import { LumiAgent } from '../services/lumiAgent';
import { ConversationMessage } from '../services/geminiService';
import { QUICK_TEMPLATES, QuickTemplate } from '../services/quickTemplates';
import { APP_SCENARIOS, AppScenario, getScenarioById } from '../services/appScenarios';
import { recordInteraction } from '../services/localStorageService';
import { applyPassiveLearningEvent, calculateEditRatio } from '../services/digitalSoulService';
import { OCRResult, QuickAction as OCRQuickAction } from '../services/ocrService';
import { keyboardSentinel, SentinelOutput } from '../services/keyboardSentinelService';
import { soulArchitect } from '../services/soulArchitectService';
import { getDestinyEngine } from '../services/dtoe/destinyEngine';
import { personalNavigator } from '../services/personalNavigatorService';
import { getPassiveLearningService } from '../services/passiveLearningService';
import { PassiveLearningConsentModal } from './PassiveLearningConsentModal';
import { SmartChips, ChipAction } from './SmartChips';
import { getSuperAgent } from '../services/superAgentService';
import { registerBuiltinSkills } from '../services/builtinSkills';
import { Wifi, Battery, Signal, Sparkles, X, Trash2, ChevronDown, Shield, AlertTriangle, ExternalLink, Bot } from 'lucide-react';
import { DestinySimulationResult } from '../App';

// 初始化 Super Agent 的内置能力
registerBuiltinSkills();


interface PhoneSimulatorProps {
  soul: SoulMatrix;
  policy: PolicyConfig;
  apiKey: string;
  onAgentLog: (log: string) => void;
  onOpenApp?: () => void;
  onDecisionUpdate?: (decision: DecisionMeta) => void;
  onSoulUpdate?: (soul: SoulMatrix) => void;
  onDestinyResult?: (result: DestinySimulationResult) => void;
  onOpenInMarket?: (intentId: string) => void;  // Deep link to Market tab
  fullscreen?: boolean;
}

// 时间格式化函数
const formatMessageTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) {
    const date = new Date(timestamp);
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const mapFailureProbToRiskLevel = (failureProb: number): 'low' | 'medium' | 'high' | 'extreme' => {
  if (failureProb < 0.15) return 'low';
  if (failureProb < 0.3) return 'medium';
  if (failureProb < 0.5) return 'high';
  return 'extreme';
};

const MESSAGES_STORAGE_KEY = 'lumi_chat_messages';
type PendingIntent = { query: string; locked?: boolean; topic?: 'travel' | 'general' };

type AssistantActionId =
  | 'continue_filter'
  | 'direct_only'
  | 'budget_800'
  | 'add_date'
  | 'add_budget'
  | 'add_passengers';

interface AssistantLinkItem {
  title: string;
  url: string;
  caption?: string;
}

interface AssistantChatMeta {
  query: string;
  traceId?: string;
  highlights: string[];
  links: AssistantLinkItem[];
  missingConstraints: string[];
}

interface ChatMessage {
  id: number;
  text: string;
  from: 'user' | 'me' | 'assistant';
  timestamp: number;
  assistantMeta?: AssistantChatMeta;
}

const formatDateYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDefaultTravelDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateYMD(tomorrow);
};

const buildDefaultScenarioMessages = (scenario: AppScenario): ChatMessage[] =>
  scenario.defaultMessages.map((m, i) => ({
    id: i + 1,
    text: m.text,
    from: m.from,
    timestamp: Date.now() - (5 - i) * 60000,
  }));

const normalizeStoredMessages = (raw: any, scenario: AppScenario): ChatMessage[] => {
  if (!Array.isArray(raw)) return buildDefaultScenarioMessages(scenario);
  const normalized = raw
    .map((item: any): ChatMessage | null => {
      const from = item?.from;
      if (from !== 'user' && from !== 'me' && from !== 'assistant') return null;
      const id = Number(item?.id);
      const text = String(item?.text || '').trim();
      const timestamp = Number(item?.timestamp);
      if (!Number.isFinite(id) || !text) return null;
      return {
        id,
        text,
        from,
        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
        assistantMeta: item?.assistantMeta,
      };
    })
    .filter((item: ChatMessage | null): item is ChatMessage => Boolean(item));

  return normalized.length > 0 ? normalized : buildDefaultScenarioMessages(scenario);
};

const buildAssistantMetaFromSolution = (solution: any, query: string): AssistantChatMeta | undefined => {
  const highlights: string[] = [];
  const links: AssistantLinkItem[] = [];
  const missingConstraints: string[] = [];
  const results = Array.isArray(solution?.results) ? solution.results : [];

  results.forEach((row: any) => {
    const data = row?.data || {};
    if (typeof data?.answer === 'string' && data.answer.trim()) {
      highlights.push(data.answer.trim().slice(0, 120));
    }
    if (Array.isArray(data?.results)) {
      data.results.slice(0, 2).forEach((item: any) => {
        if (typeof item?.title === 'string' && item.title.trim()) highlights.push(item.title.trim());
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.title || '查看结果', url: item.url, caption: item?.source });
        }
      });
    }
    if (Array.isArray(data?.evidence?.items)) {
      data.evidence.items.slice(0, 2).forEach((item: any) => {
        if (typeof item?.title === 'string' && item.title.trim()) highlights.push(item.title.trim());
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.title || '查看证据', url: item.url, caption: item?.source_name });
        }
      });
    }
    if (Array.isArray(data?.action_links)) {
      data.action_links.slice(0, 3).forEach((item: any) => {
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.title || '前往操作', url: item.url, caption: item?.provider });
        }
      });
    }
    const flights = Array.isArray(data?.data?.flights) ? data.data.flights : [];
    if (flights.length > 0) {
      const best = flights[0];
      const airline = typeof best?.airline === 'string' ? best.airline : '航司';
      const price = Number.isFinite(best?.price) ? `¥${best.price}` : '';
      highlights.push(`航班推荐：${airline}${price ? ` · ${price}` : ''}`);
      if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim()) {
        links.push({ title: `${airline} 预订入口`, url: best.bookingUrl });
      }
    }
    const hotels = Array.isArray(data?.data?.hotels) ? data.data.hotels : [];
    if (hotels.length > 0) {
      const best = hotels[0];
      const name = typeof best?.name === 'string' ? best.name : '酒店';
      const price = Number.isFinite(best?.pricePerNight) ? `¥${best.pricePerNight}/晚` : '';
      highlights.push(`酒店推荐：${name}${price ? ` · ${price}` : ''}`);
      if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim()) {
        links.push({ title: `${name} 预订入口`, url: best.bookingUrl });
      }
    }
    if (data?.data?.comparisonLinks && typeof data.data.comparisonLinks === 'object') {
      Object.values(data.data.comparisonLinks).slice(0, 3).forEach((item: any) => {
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.name || '比价入口', url: item.url, caption: '比价' });
        }
      });
    }
    const fallbackMissing = Array.isArray(data?.fallback?.missing_constraints)
      ? data.fallback.missing_constraints
      : [];
    const routeMissing = Array.isArray(data?.route_decision?.missing_constraints)
      ? data.route_decision.missing_constraints
      : [];
    [...fallbackMissing, ...routeMissing].forEach((item: any) => {
      const value = String(item || '').trim();
      if (value) missingConstraints.push(value);
    });
  });

  if (typeof solution?.answer === 'string' && solution.answer.trim()) {
    highlights.unshift(solution.answer.trim().slice(0, 140));
  }

  const dedupedHighlights = Array.from(new Set(highlights.map(v => String(v || '').trim()).filter(Boolean))).slice(0, 4);
  const dedupedLinks = Array.from(
    new Map(
      links
        .filter(item => typeof item.url === 'string' && item.url.trim())
        .map(item => [item.url, item])
    ).values()
  ).slice(0, 5);
  const dedupedMissing = Array.from(new Set(missingConstraints.map(v => String(v || '').trim()).filter(Boolean))).slice(0, 5);

  if (dedupedHighlights.length === 0 && dedupedLinks.length === 0 && dedupedMissing.length === 0) {
    return undefined;
  }

  return {
    query,
    traceId: typeof solution?.marketplace_trace_id === 'string' ? solution.marketplace_trace_id : undefined,
    highlights: dedupedHighlights,
    links: dedupedLinks,
    missingConstraints: dedupedMissing,
  };
};

const buildAssistantActionQuery = (baseQuery: string, action: AssistantActionId): string => {
  const query = baseQuery.trim();
  if (!query) return baseQuery;
  switch (action) {
    case 'continue_filter':
      return /继续筛选/.test(query) ? query : `${query}，继续筛选`;
    case 'direct_only':
      return /直飞/.test(query) ? query : `${query}，只看直飞`;
    case 'budget_800':
      return /(预算|¥|￥)\s*800|800\s*元/.test(query) ? query : `${query}，预算800元以内`;
    case 'add_date':
      return /\d{4}-\d{2}-\d{2}|今天|明天|后天/.test(query) ? query : `${query}，出发日期${getDefaultTravelDate()}`;
    case 'add_budget':
      return /(预算|¥|￥)\s*\d+|\d+\s*元/.test(query) ? query : `${query}，预算1500元以内`;
    case 'add_passengers':
      return /\d+\s*(人|位)/.test(query) ? query : `${query}，1人出行`;
    default:
      return query;
  }
};

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({ soul, policy, apiKey, onAgentLog, onOpenApp, onDecisionUpdate, onSoulUpdate, onDestinyResult, onOpenInMarket, fullscreen }) => {
  const [currentScenario, setCurrentScenario] = useState<AppScenario>(APP_SCENARIOS[0]);
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (saved) {
      try {
        return normalizeStoredMessages(JSON.parse(saved), APP_SCENARIOS[0]);
      } catch { }
    }
    // Default messages with timestamps
    return buildDefaultScenarioMessages(APP_SCENARIOS[0]);
  });
  const [inputValue, setInputValue] = useState('');
  const [sentinelOutput, setSentinelOutput] = useState<SentinelOutput | null>(null);
  const sentinelTimerRef = useRef<number | null>(null);

  // Sentinel 分析 - 防抖处理
  const analyzeSentinel = useCallback((text: string) => {
    if (sentinelTimerRef.current) {
      clearTimeout(sentinelTimerRef.current);
    }
    sentinelTimerRef.current = window.setTimeout(() => {
      const result = keyboardSentinel.analyze(text);
      setSentinelOutput(result);

      // 将意图传递给 Soul Architect (Layer 2)
      if (result.intent || result.privacy) {
        soulArchitect.onSentinelIntent(result);
      }

      // 记录高价值意图
      if (result.intent && result.meta.shouldEscalate) {
        onAgentLog(`[Sentinel] 检测到意图: ${result.intent.type} (置信度: ${(result.intent.confidence * 100).toFixed(0)}%)`);
      }
      // 记录隐私风险
      if (result.privacy) {
        onAgentLog(`[Sentinel] ⚠️ 隐私风险: ${result.privacy.risk} -> ${result.privacy.action}`);
      }
    }, 200); // 200ms 防抖
  }, [onAgentLog]);

  const [mode, setMode] = useState<InputMode>(() => {
    // Restore mode from sessionStorage
    const saved = sessionStorage.getItem('lumi_mode');
    return saved === 'AGENT' ? InputMode.AGENT : InputMode.TYPE;
  });
  const [agentOutput, setAgentOutput] = useState<AgentOutput | null>(() => {
    // Restore agentOutput from sessionStorage
    const saved = sessionStorage.getItem('lumi_agentOutput');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [keyboardCollapsed, setKeyboardCollapsed] = useState(false);
  const [showAppOverlay, setShowAppOverlay] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(() => {
    // Show consent modal if user hasn't consented yet
    const service = getPassiveLearningService();
    return !service.hasConsent() && !localStorage.getItem('lumi_consent_declined');
  });

  // Super Agent 结果 - 用于在 App 中可视化
  const [superAgentResult, setSuperAgentResult] = useState<SuperAgentResult | null>(null);

  // 对话上下文 - 用于多轮对话记忆
  const [conversationContext, setConversationContext] = useState<ConversationMessage[]>([]);

  const agentRef = useRef<LumiAgent>(new LumiAgent(soul, policy, apiKey));
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingDraftRef = useRef<TextDraft | null>(null);

  const applySoulLearning = (event: Parameters<typeof applyPassiveLearningEvent>[0]) => {
    const updated = applyPassiveLearningEvent(event);
    onSoulUpdate?.(updated);
  };

  // Persist mode to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('lumi_mode', mode === InputMode.AGENT ? 'AGENT' : 'TYPE');
  }, [mode]);

  // Persist agentOutput to sessionStorage
  useEffect(() => {
    if (agentOutput) {
      sessionStorage.setItem('lumi_agentOutput', JSON.stringify(agentOutput));
    } else {
      sessionStorage.removeItem('lumi_agentOutput');
    }
  }, [agentOutput]);

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    agentRef.current.updateConfig(soul, policy, apiKey);
  }, [soul, policy, apiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (mode === InputMode.TYPE) {
      setPendingIntent(null);
      setFollowUpPrompt(null);
    }
  }, [mode]);

  // Auto-collapse keyboard when agent output is shown
  useEffect(() => {
    if (
      agentOutput &&
      agentOutput.type !== 'NONE' &&
      agentOutput.type !== 'ERROR' &&
      agentOutput.type !== 'CLARIFICATION'
    ) {
      setKeyboardCollapsed(true);
    }
  }, [agentOutput]);

  const isTravelQuery = (text: string) =>
    /机票|航班|飞机|flight|travel|旅行|旅游|酒店|hotel|接送机|机场|机场接送|to\s+\w+|from\s+\w+|trip/i.test(text);

  const isTravelFollowUp = (text: string) =>
    /日期|时间|出发|返程|回程|预算|价格|航班|机票|酒店|住宿|餐厅|美食|景点|行程|接送机|天气|签证|transfer|pickup|hotel|restaurant|attraction|itinerary|weather/i.test(text);

  const isDateFollowUp = (text: string) =>
    /\d{1,4}[-\/年]\d{1,2}[-\/月]\d{1,2}|下周|明天|后天|周[一二三四五六日末]|月底|月初|next week|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+号|\d+日/i.test(text);

  const shouldAppendIntent = (pending: PendingIntent | null, text: string) => {
    if (!pending) return false;
    if (pending.locked) return true;
    if (pending.topic !== 'travel') return false;
    return isTravelFollowUp(text) || isDateFollowUp(text);
  };

  const buildAgentQuery = (inputText: string) => {
    const trimmed = inputText.trim();
    if (!trimmed) return null;
    const useContext = shouldAppendIntent(pendingIntent, trimmed);
    const rawText = useContext && pendingIntent
      ? `${pendingIntent.query} ${trimmed}`
      : trimmed;
    return { rawText, usedContext: useContext };
  };

  const applyAgentOutput = (output: AgentOutput, rawText: string) => {
    if (output.type === 'CLARIFICATION') {
      setPendingIntent({
        query: output.contextQuery || rawText,
        locked: true,
        topic: isTravelQuery(output.contextQuery || rawText) ? 'travel' : 'general'
      });
      setFollowUpPrompt(output.prompt);
    } else if (output.type === 'SUPER_AGENT_RESULT' || isTravelQuery(rawText)) {
      setPendingIntent({ query: rawText, locked: false, topic: 'travel' });
      setFollowUpPrompt(null);
    } else {
      setPendingIntent(null);
      setFollowUpPrompt(null);
    }
    setAgentOutput(output);

    const decision =
      (output as { decision?: DecisionMeta }).decision ||
      (output as { result?: { decision?: DecisionMeta } }).result?.decision;
    if (decision) {
      onDecisionUpdate?.(decision);
    }
  };

  const handleKeyPress = (key: string) => {
    setInputValue(prev => {
      const newValue = prev + key;
      analyzeSentinel(newValue);
      return newValue;
    });
    // 被动学习：记录按键
    const passiveLearning = getPassiveLearningService();
    passiveLearning.onKeystroke(currentScenario.id);
    if (key === ' ' || /[，。！？,.!?]/.test(key)) {
      passiveLearning.onWordComplete(currentScenario.id);
    }
  };

  const handleDelete = () => {
    setInputValue(prev => {
      const newValue = prev.slice(0, -1);
      analyzeSentinel(newValue);
      return newValue;
    });
    // 被动学习：记录删除
    const passiveLearning = getPassiveLearningService();
    passiveLearning.onDeletion(currentScenario.id);
  };

  const applySuggestionToInput = (suggestion: string) => {
    const clean = suggestion.trim();
    if (!clean) return;
    setKeyboardCollapsed(false);
    setInputValue(prev => {
      if (!prev) return clean;
      const separator = /[，,、；;]\s*$/.test(prev) ? ' ' : '，';
      return `${prev}${separator}${clean}`;
    });
  };

  const handleAssistantQuickAction = (meta: AssistantChatMeta, action: AssistantActionId) => {
    const nextQuery = buildAssistantActionQuery(meta.query || '', action);
    setMode(InputMode.AGENT);
    setInputValue(nextQuery);
    setPendingIntent({ query: meta.query || nextQuery, locked: false, topic: 'travel' });
    setFollowUpPrompt(null);
    setKeyboardCollapsed(false);
    onAgentLog(`[Assistant] 已填入快捷操作: ${nextQuery}`);
  };

  const handleEnter = async () => {
    if (mode === InputMode.TYPE) {
      if (inputValue.trim()) {
        const pendingDraft = pendingDraftRef.current;
        if (pendingDraft) {
          const editRatio = calculateEditRatio(pendingDraft.text, inputValue);
          const isAccepted = editRatio <= 0.05;
          const eventType = isAccepted ? 'draft_accept' : 'draft_edit';
          recordInteraction(eventType, {
            draftId: pendingDraft.id,
            tone: pendingDraft.tone,
            editRatio,
            originalLength: pendingDraft.text.length,
            finalLength: inputValue.length
          }, currentScenario.id);
          if (isAccepted) {
            applySoulLearning({ type: 'draft_accept', tone: pendingDraft.tone });
          } else {
            applySoulLearning({ type: 'draft_edit', tone: pendingDraft.tone, editRatio });
          }
        }
        setMessages(prev => [...prev, { id: Date.now(), text: inputValue, from: 'me', timestamp: Date.now() }]);
        // Record message interaction for digital avatar
        recordInteraction('message_sent', {
          message: inputValue,
          messageLength: inputValue.length,
          scenario: currentScenario.id
        }, currentScenario.id);
        recordInteraction('confirm_send', {
          source: pendingDraft ? 'draft' : 'manual',
          messageLength: inputValue.length
        }, currentScenario.id);
        applySoulLearning({ type: 'confirm_send' });
        setInputValue('');
        pendingDraftRef.current = null;
      }
    } else {
      // AGENT MODE: 使用 Super Agent 处理
      setIsLoading(true);
      setAgentOutput(null);
      const typedInput = inputValue.trim();
      const builtQuery = buildAgentQuery(inputValue);
      if (!builtQuery) {
        setIsLoading(false);
        return;
      }
      const rawText = builtQuery.rawText;
      const requestTs = Date.now();

      // 在主聊天流中显示用户提问
      setMessages(prev => [...prev, {
        id: requestTs,
        text: typedInput || rawText,
        from: 'me',
        timestamp: requestTs,
      }]);

      // 使用累积的对话上下文（保持多轮对话记忆）
      const updatedContext: ConversationMessage[] = [
        ...conversationContext,
        { role: 'user' as const, content: rawText }
      ];

      onAgentLog(`[Super Agent] 接收问题: "${rawText}" (上下文: ${updatedContext.length} 条消息)`);

      try {
        // 🧠 使用 Super Agent 处理问题
        const superAgent = getSuperAgent();
        superAgent.setApiKey(apiKey);

        const solution = await superAgent.solve(rawText, {
          userId: 'user',
          preferences: soul,
          recentQueries: updatedContext.slice(-5).map(m => m.content),  // 增加到5条上下文
          currentApp: currentScenario.id,
          conversationHistory: updatedContext  // 传递完整对话历史
        });

        onAgentLog(`[Super Agent] 完成: ${solution.skillsUsed.length} 个 Skills, 置信度 ${(solution.confidence * 100).toFixed(0)}%, 耗时 ${solution.executionTimeMs}ms`);

        // 更新对话上下文（添加助手回复）- 用于多轮对话记忆
        const newContext: ConversationMessage[] = [
          ...updatedContext,
          { role: 'assistant' as const, content: solution.answer || '' }
        ];
        setConversationContext(newContext);

        // 将 Super Agent 结果写回主聊天流（替代过去仅在 overlay 展示）
        const assistantMeta = buildAssistantMetaFromSolution(solution, rawText);
        setMessages(prev => [...prev, {
          id: requestTs + 1,
          text: solution.answer || '已为你生成可执行建议。',
          from: 'assistant',
          timestamp: Date.now(),
          assistantMeta,
        }]);

        // 🎯 保存结构化结果用于 Lumi App 可视化
        setSuperAgentResult({
          question: rawText,
          answer: solution.answer,
          skillsUsed: solution.skillsUsed,
          results: solution.results,
          confidence: solution.confidence,
          executionTimeMs: solution.executionTimeMs,
          reasoning: solution.reasoning,
          timestamp: Date.now()
        });

        // 保持在聊天流，可按需由用户再打开 Lumi App 详情
        onAgentLog(`[Super Agent] Agent 模式完成，结果已写入聊天流`);

        // 如果有后续建议，显示为 drafts
        if (solution.followUpSuggestions && solution.followUpSuggestions.length > 0) {
          const drafts = solution.followUpSuggestions.map((suggestion, i) => ({
            id: `followup_${i}`,
            text: suggestion,
            tone: 'suggestion'
          }));
          setAgentOutput({
            type: 'DRAFTS',
            drafts
            // reasoning is stored in superAgentResult, not in DRAFTS type
          });
        } else {
          // 推理过程信息保存在 superAgentResult 中，不需要单独的 output
          // 清除之前的输出
          setAgentOutput(null);
        }

        setInputValue('');
        // ⚡️ 保持 Agent Mode，不切换回 TYPE
        // setMode(InputMode.TYPE); // 删除这行！保持在 Agent Mode

      } catch (e) {
        onAgentLog(`[Super Agent] 错误: ${e}`);

        // 降级到原有的 lumiAgent
        onAgentLog(`[降级] 使用原有 Agent 处理...`);
        const input: AgentInput = {
          rawText,
          mode: InputMode.AGENT,
          timestampMs: Date.now(),
          appContext: { packageName: 'com.chat.app', fieldHints: [], isPasswordField: false }
        };

        try {
          const output = await agentRef.current.handle(input, updatedContext, currentScenario.agentPromptHint);
          onAgentLog(`Agent Output: ${JSON.stringify(output)}`);
          applyAgentOutput(output, rawText);
        } catch (fallbackError) {
          setAgentOutput({ type: 'ERROR', message: 'Agent processing failed' });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDraftClick = (draft: TextDraft) => {
    pendingDraftRef.current = draft;
    setInputValue(draft.text);
    setMode(InputMode.TYPE); // Exit agent mode to let user edit/send
    setAgentOutput(null);
    setPendingIntent(null);
    setFollowUpPrompt(null);
    // Record draft selection for digital avatar
    recordInteraction('draft_selected', {
      draftId: draft.id,
      text: draft.text,
      tone: draft.tone
    }, currentScenario.id);

    // 记录到 Soul Architect (Layer 2)
    soulArchitect.onInteraction({
      type: 'draft_accept',
      context: draft.tone,
      timestamp: Date.now()
    });

    onAgentLog(`User selected draft: ${draft.id}`);
  };

  const handleCardClick = (card: ServiceCard) => {
    onAgentLog(`User clicked card: ${card.id} - ${card.actionType}: ${card.actionUri}`);

    // 记录到 Soul Architect (Layer 2)
    soulArchitect.onInteraction({
      type: 'card_click',
      context: `${card.title} - ${card.actionType}`,
      timestamp: Date.now()
    });

    // Open the URL in a new tab (keeps current state intact)
    if (card.actionUri && card.actionUri.startsWith('http')) {
      window.open(card.actionUri, '_blank');
    } else if (card.actionUri) {
      // For deep links or non-http URIs, try to open them
      window.open(card.actionUri, '_blank');
    }

    // NOTE: We intentionally do NOT clear agentOutput here
    // The user can continue viewing cards after opening a link
    recordInteraction('card_click', {
      cardId: card.id,
      title: card.title,
      actionType: card.actionType,
      actionUri: card.actionUri
    }, currentScenario.id);
    applySoulLearning({ type: 'card_click' });
  };

  const handlePrivacyAction = (action: PrivacyAction, confirm: boolean) => {
    if (confirm) {
      setInputValue(action.maskedValue);
      setMode(InputMode.TYPE);
      setAgentOutput(null);
      onAgentLog(`Privacy mask applied: ${action.maskedValue}`);
    } else {
      setAgentOutput(null);
      onAgentLog(`Privacy mask rejected`);
    }
  };

  const handleTemplateSelect = (template: QuickTemplate) => {
    setInputValue(template.prompt);
    setShowTemplates(false);
    onAgentLog(`Template selected: ${template.labelZh}`);
  };

  // Handle feature button selection (三大功能快捷入口)
  const handleFeatureSelect = (feature: 'write' | 'find' | 'remember', prompt: string) => {
    setInputValue(prompt + ' ');
    setShowTemplates(false);
    onAgentLog(`Feature selected: ${feature} - ${prompt}`);
  };

  // Handle task action (confirm/cancel multi-step tasks)
  const handleTaskAction = async (task: TaskPlan, action: 'confirm' | 'cancel') => {
    onAgentLog(`Task action: ${action} for task ${task.id}`);
    setIsLoading(true);
    try {
      const output = await agentRef.current.handleTaskAction(action);
      onAgentLog(`Task output: ${JSON.stringify(output)}`);
      setAgentOutput(output);
    } catch (e) {
      onAgentLog(`Task error: ${e}`);
      setAgentOutput({ type: 'ERROR', message: '任务执行失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OCR recognition result
  const handleOCRResult = (result: OCRResult, actions: OCRQuickAction[]) => {
    onAgentLog(`OCR Result: ${result.extractedItems.length} items found`);

    // Record interaction for digital avatar
    recordInteraction('tool_used', {
      tool: 'ocr_recognition',
      itemCount: result.extractedItems.length,
      types: result.extractedItems.map(i => i.type),
      scenario: currentScenario.id
    }, currentScenario.id);

    // Convert to AgentOutput format
    const output: AgentOutput = {
      type: 'TOOL_RESULT',
      result: {
        success: true,
        toolName: 'ocr_recognition',
        displayType: 'ocr_result' as const,
        data: {
          extractedItems: result.extractedItems,
          rawText: result.rawText,
          summary: result.summary,
          processingTime: result.processingTime,
          quickActions: actions
        }
      }
    };

    setAgentOutput(output);
  };

  // Handle scenario change
  const handleScenarioChange = (scenario: AppScenario) => {
    setCurrentScenario(scenario);
    setMessages(buildDefaultScenarioMessages(scenario));
    setShowScenarioPicker(false);
    setAgentOutput(null);
    onAgentLog(`Switched to ${scenario.nameZh} scenario`);

  };

  return (
    <div className="w-[360px] h-[720px] bg-white rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden flex flex-col relative">
      {/* Image Upload Panel Overlay */}
      <ImageUploadPanel
        apiKey={apiKey}
        visible={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onResult={handleOCRResult}
        onLog={onAgentLog}
      />

      {/* Lumi App Overlay - Full screen results view */}
      <LumiAppOverlay
        visible={showAppOverlay}
        data={agentOutput?.type === 'TOOL_RESULT' ? agentOutput.result?.data : null}
        onClose={() => {
          setShowAppOverlay(false);
        }}
        superAgentResult={superAgentResult}
        onFollowUp={async (question) => {
          // 🚀 直接在 Lumi App 内继续对话，不关闭 App
          onAgentLog(`[Super Agent] 继续对话: "${question}"`);
          setIsLoading(true);

          try {
            const superAgent = getSuperAgent();
            superAgent.setApiKey(apiKey);

            // 添加到对话上下文
            const updatedContext: ConversationMessage[] = [
              ...conversationContext,
              { role: 'user' as const, content: question }
            ];

            // 🔍 调试：显示对话上下文
            console.log(`[Follow-up] 对话上下文 (${updatedContext.length} 条消息):`, updatedContext);
            onAgentLog(`[Follow-up] 上下文消息数: ${updatedContext.length}`);

            const solution = await superAgent.solve(question, {
              userId: 'user',
              preferences: soul,
              recentQueries: updatedContext.slice(-5).map(m => m.content),
              currentApp: currentScenario.id,
              conversationHistory: updatedContext
            });

            onAgentLog(`[Super Agent] 继续对话完成: ${solution.skillsUsed.length} 个 Skills`);

            // 更新对话上下文
            const newContext: ConversationMessage[] = [
              ...updatedContext,
              { role: 'assistant' as const, content: solution.answer || '' }
            ];
            setConversationContext(newContext);

            // 更新结果显示（保持在 Lumi App 内）
            setSuperAgentResult({
              question: question,
              answer: solution.answer,
              skillsUsed: solution.skillsUsed,
              results: solution.results,
              confidence: solution.confidence,
              executionTimeMs: solution.executionTimeMs,
              reasoning: solution.reasoning,
              timestamp: Date.now()
            });
          } catch (e) {
            onAgentLog(`[Super Agent] 继续对话错误: ${e}`);
          } finally {
            setIsLoading(false);
          }
        }}
        onOpenInMarket={(intentId) => {
          // Close overlay and navigate to Market
          setShowAppOverlay(false);
          if (onOpenInMarket) {
            onOpenInMarket(intentId);
          }
        }}
      />

      {/* Status Bar with Scenario Picker */}
      <div
        className="h-8 flex items-center justify-between px-6 text-xs font-semibold z-10 relative"
        style={{ backgroundColor: currentScenario.headerBg }}
      >
        <button
          onClick={() => setShowScenarioPicker(!showScenarioPicker)}
          className="flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          <span>{currentScenario.icon}</span>
          <span>{currentScenario.nameZh}</span>
          <ChevronDown size={12} />
        </button>
        <div className="flex gap-1.5 text-gray-700">
          <Signal size={14} />
          <Wifi size={14} />
          <Battery size={14} />
        </div>

        {/* Scenario Picker Dropdown */}
        {showScenarioPicker && (
          <div className="absolute top-full left-2 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[140px]">
            {APP_SCENARIOS.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioChange(scenario)}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors ${currentScenario.id === scenario.id ? 'bg-gray-100' : ''
                  }`}
              >
                <span>{scenario.icon}</span>
                <span className="text-sm">{scenario.nameZh}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* App Header */}
      <div
        className="h-14 border-b flex items-center justify-between px-4 shadow-sm z-10"
        style={{ backgroundColor: currentScenario.headerBg }}
      >
        <div className="flex items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 text-sm"
            style={{ backgroundColor: currentScenario.avatarBg }}
          >
            {currentScenario.contactName.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-sm text-gray-800">{currentScenario.contactName}</div>
            {currentScenario.contactStatus && (
              <div className="text-xs text-gray-500">{currentScenario.contactStatus}</div>
            )}
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={() => {
              setMessages(buildDefaultScenarioMessages(currentScenario));
              onAgentLog('Chat history cleared');
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={14} />
            <span>清除 ({messages.length})</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        ref={scrollRef}
        style={{ backgroundColor: currentScenario.secondaryColor }}
      >
        {messages.map(msg => {
          const isMine = msg.from === 'me';
          const isAssistant = msg.from === 'assistant';
          const meta = msg.assistantMeta;
          const bubbleBg = isMine
            ? currentScenario.bubbleMyColor
            : isAssistant
              ? '#EEF2FF'
              : currentScenario.bubbleTheirColor;
          const bubbleColor = isMine && ['#007AFF', '#1677FF'].includes(currentScenario.bubbleMyColor)
            ? 'white'
            : '#1f2937';

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[90%]">
                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${isMine ? 'rounded-br-none' : 'rounded-bl-none'}`}
                  style={{
                    backgroundColor: bubbleBg,
                    color: bubbleColor,
                    border: isMine ? 'none' : '1px solid #e5e7eb'
                  }}
                >
                  {isAssistant && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-medium text-indigo-600">
                      <Bot size={11} />
                      Lumi Assistant
                    </div>
                  )}

                  <div>{msg.text}</div>

                  {isAssistant && meta?.highlights && meta.highlights.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {meta.highlights.slice(0, 3).map((line, idx) => (
                        <div key={`hl_${msg.id}_${idx}`} className="text-[11px] text-slate-600">
                          • {line}
                        </div>
                      ))}
                    </div>
                  )}

                  {isAssistant && meta?.links && meta.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {meta.links.slice(0, 3).map((link, idx) => (
                        <a
                          key={`link_${msg.id}_${idx}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-600"
                        >
                          <ExternalLink size={10} />
                          {link.title}
                        </a>
                      ))}
                    </div>
                  )}

                  {isAssistant && meta && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        onClick={() => handleAssistantQuickAction(meta, 'continue_filter')}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600"
                      >
                        继续筛选
                      </button>
                      <button
                        onClick={() => handleAssistantQuickAction(meta, 'direct_only')}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600"
                      >
                        只看直飞
                      </button>
                      <button
                        onClick={() => handleAssistantQuickAction(meta, 'budget_800')}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600"
                      >
                        预算≤800
                      </button>
                      <button
                        onClick={() => setShowAppOverlay(true)}
                        className="text-[11px] px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-600"
                      >
                        打开详情
                      </button>
                    </div>
                  )}

                  {isAssistant && meta?.missingConstraints && meta.missingConstraints.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <div className="text-[11px] text-amber-700 mb-1">
                        缺失信息：{meta.missingConstraints.join('、')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleAssistantQuickAction(meta, 'add_date')}
                          className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-white text-amber-700"
                        >
                          填日期（{getDefaultTravelDate()}）
                        </button>
                        <button
                          onClick={() => handleAssistantQuickAction(meta, 'add_budget')}
                          className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-white text-amber-700"
                        >
                          填预算
                        </button>
                        <button
                          onClick={() => handleAssistantQuickAction(meta, 'add_passengers')}
                          className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-white text-amber-700"
                        >
                          填人数
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`text-[10px] text-gray-400 mt-1 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {formatMessageTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        {/* Placeholder for visual balance */}
        <div className="h-4" />
      </div>

      {/* Input Area + Candidate Bar + Keyboard */}
      <div className="bg-white z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {/* Agent Candidate Area */}
        {isLoading && (
          <div className="h-12 flex items-center justify-center text-indigo-600 gap-2 bg-indigo-50 border-t border-indigo-100">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium animate-pulse">Lumi Thinking...</span>
          </div>
        )}

        <CandidateBar
          output={agentOutput}
          onDraftClick={handleDraftClick}
          onCardClick={handleCardClick}
          onPrivacyAction={handlePrivacyAction}
          onTaskAction={handleTaskAction}
          onSuggestionClick={(suggestion) => {
            applySuggestionToInput(suggestion);
            onAgentLog(`Suggestion appended: ${suggestion}`);
            recordInteraction('query_refine', {
              source: 'agent_suggestion',
              suggestion
            }, currentScenario.id);
            applySoulLearning({ type: 'query_refine' });
          }}
          onViewInApp={() => {
            setShowAppOverlay(true);
            onAgentLog('Opening in Lumi App view');
          }}
          onClear={() => {
            if (agentOutput && (agentOutput.type === 'CARDS' || agentOutput.type === 'TOOL_RESULT')) {
              recordInteraction('card_dismiss', {
                outputType: agentOutput.type,
                toolName: agentOutput.type === 'TOOL_RESULT' ? agentOutput.result.toolName : undefined
              }, currentScenario.id);
              applySoulLearning({ type: 'card_dismiss' });
            }
            setAgentOutput(null);
            setPendingIntent(null);
            setFollowUpPrompt(null);
          }}
        />

        {/* Keyboard Sentinel Indicator - 实时意图/隐私检测 */}
        <SentinelIndicator
          output={sentinelOutput}
          onMaskApply={(maskedText) => {
            // 用脱敏文本替换当前输入
            setInputValue(prev => {
              // 简单替换，实际应用中需要更精确的定位
              if (sentinelOutput?.privacy?.maskedPreview) {
                return prev.replace(/\d{11,}/, maskedText.replace(/\s/g, ''));
              }
              return prev;
            });
            setSentinelOutput(null);
            onAgentLog('[Sentinel] 已应用脱敏处理');
          }}
          onIntentAction={(intentType) => {
            // 自动切换到 Agent 模式
            setMode(InputMode.AGENT);
            onAgentLog(`[Sentinel] 激活 Agent 模式处理: ${intentType}`);
            // 可选：自动触发 Agent 处理
            // Note: handleSend is defined in AgentKeyboard component, so we just set mode here
            // The actual processing will happen when user presses enter
          }}
          onDestinySimulate={async (intentType, _params) => {
            onAgentLog(`[DTOE] 启动策略推演: ${intentType}`);

            try {
              const dtoeEngine = getDestinyEngine();
              const recommendation = await dtoeEngine.getRecommendation({
                entity_id: `phone_${currentScenario.id}_${intentType}`,
                needs_live_data: false,
                time_budget_ms: 1500,
              });

              if (!recommendation.strategy_card || !recommendation.explanation_card) {
                onAgentLog('[DTOE] 未生成有效策略卡，已跳过展示');
                setSentinelOutput(null);
                return;
              }

              const strategy = recommendation.strategy_card;
              const explanation = recommendation.explanation_card;
              const failureProb = strategy.outcomes_distribution?.failure_prob ?? 0.5;
              const successProb = Math.max(0, Math.min(1, 1 - failureProb));
              const utilityMetric = strategy.outcomes_distribution?.metrics?.find(m => m.name === 'utility_score');
              const primaryReason = explanation.top_reasons?.[0]?.text ?? '基于当前状态的最优策略';
              const alternativePath =
                explanation.why_not_explanations?.[0]?.alternative_action ||
                explanation.alternatives?.[0]?.action_summary ||
                '暂未发现明显优于当前策略的替代方案';

              onAgentLog(
                `[DTOE] 推荐=${strategy.next_best_action.summary}, 失败率=${(failureProb * 100).toFixed(0)}%, ` +
                `缓存=${recommendation.diagnostics.cache_hit ? '命中' : '未命中'}`
              );
              onAgentLog('[Personal Navigator] 生成有温度的建议...');

              const navigatorResponse = personalNavigator.quickCraft({
                optimalPath: strategy.next_best_action.summary,
                alternativePath,
                successProbability: successProb,
                riskLevel: mapFailureProbToRiskLevel(failureProb),
                expectedValue: utilityMetric?.p50 ?? 0,
                jCurve: {
                  dipDepth: intentType === 'career' ? -45 : -28,
                  dipDuration: intentType === 'career' ? '3-6个月' : '1-3个月',
                  recoveryPoint: intentType === 'career' ? '12-18个月' : '6个月'
                },
                caveats: [
                  ...explanation.risk_notes.slice(0, 2),
                  ...recommendation.diagnostics.errors.slice(0, 1),
                ].filter(Boolean),
              }, inputValue);

              const policySection =
                `\n\n🧭 **DTOE 策略卡摘要**\n` +
                `• Next Best Action: ${strategy.next_best_action.summary}\n` +
                `• 风险 (failure_prob): ${(failureProb * 100).toFixed(1)}%\n` +
                `• Why: ${primaryReason}`;

              const enhancedResponse = {
                ...navigatorResponse,
                formattedResponse: navigatorResponse.formattedResponse + policySection,
              };

              if (onDestinyResult) {
                onDestinyResult({
                  query: inputValue,
                  intentType,
                  navigatorOutput: enhancedResponse,
                  timestamp: Date.now()
                });
                onAgentLog('[Destiny] DTOE 结果已发送到 Lumi App');
              }
            } catch (error) {
              onAgentLog(`[DTOE] 推演失败: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setSentinelOutput(null);
              setInputValue('');
            }
          }}
        />

        {/* Smart Chips - 意图触发的快捷操作 */}
        <SmartChips
          sentinelOutput={sentinelOutput}
          visible={mode === InputMode.TYPE && inputValue.length > 5}
          onChipClick={(chip: ChipAction) => {
            // 记录点击到价值指标
            import('../services/valueMetricsService').then(({ getValueMetricsService }) => {
              getValueMetricsService().recordChipClick(chip.type);
            });
            // 切换到 Agent 模式并添加动作前缀
            setMode(InputMode.AGENT);
            if (chip.inputPrepend) {
              setInputValue(chip.inputPrepend + inputValue);
            }
            onAgentLog(`[SmartChips] 选择快捷操作: ${chip.label}`);
            setSentinelOutput(null);
          }}
        />

        {/* Scene-aware Hints - Show contextual suggestions based on current app */}
        <SceneHint
          scenario={currentScenario}
          visible={mode === InputMode.AGENT && !agentOutput && !isLoading}
          onSuggestionClick={(text) => {
            setInputValue(text + ' ');
            onAgentLog(`Scene suggestion: ${text}`);
            recordInteraction('query_refine', {
              source: 'scene_hint',
              suggestion: text
            }, currentScenario.id);
            applySoulLearning({ type: 'query_refine' });
          }}
        />

        {/* Feature Quick Access Buttons - Show in Agent Mode when no output */}
        <FeatureButtons
          onFeatureSelect={handleFeatureSelect}
          visible={mode === InputMode.AGENT && !agentOutput && !isLoading && !inputValue}
        />

        {/* Smart Prediction Bar - Show when user has started typing */}
        <PredictionBar
          scenario={currentScenario}
          visible={mode === InputMode.AGENT && !agentOutput && !isLoading && inputValue.length > 0}
          currentInput={inputValue}
          onPredictionClick={(text) => {
            setInputValue(text);
            onAgentLog(`Prediction selected: ${text}`);
            recordInteraction('query_refine', {
              source: 'prediction',
              suggestion: text
            }, currentScenario.id);
            applySoulLearning({ type: 'query_refine' });
          }}
        />

        {/* Emoji Reactions - Quick emoji sending in TYPE mode */}
        <EmojiReactions
          visible={mode === InputMode.TYPE && !isLoading}
          onEmojiSelect={(emoji) => {
            // Add emoji directly to chat
            const newMsg = { id: Date.now(), text: emoji, from: 'me' as const, timestamp: Date.now() };
            setMessages(prev => [...prev, newMsg]);
            // Record emoji reaction for digital avatar
            recordInteraction('emoji_reaction', {
              emoji,
              scenario: currentScenario.id
            }, currentScenario.id);
            onAgentLog(`Emoji sent: ${emoji}`);
          }}
        />

        {/* Text Input Field */}

        <div className={`p-3 border-t transition-colors duration-300 ${mode === InputMode.AGENT ? 'bg-indigo-900 border-indigo-800' : 'bg-gray-100 border-gray-200'}`}>
          {mode === InputMode.AGENT && followUpPrompt && (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-indigo-800/70 px-3 py-2 text-xs text-indigo-100">
              <div className="flex-1">
                <span className="mr-2 font-mono text-indigo-300">Lumi</span>
                <span>{followUpPrompt}</span>
              </div>
              <button
                onClick={() => {
                  setPendingIntent(null);
                  setFollowUpPrompt(null);
                }}
                className="text-indigo-300 hover:text-white"
                title="Clear"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {mode === InputMode.AGENT && !followUpPrompt && pendingIntent && !pendingIntent.locked && (
            <div className="mb-2 rounded-lg bg-indigo-800/50 px-3 py-2 text-[11px] text-indigo-200">
              已保留上次行程意图，可继续补充日期/酒店/接送机等信息。
            </div>
          )}
          <div className="flex items-center gap-2 px-1">
            {/* Quick Template Button - Only show in Agent Mode */}
            {mode === InputMode.AGENT && (
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 ${showTemplates ? 'bg-yellow-500 text-gray-900' : 'bg-indigo-700 text-indigo-200 hover:bg-indigo-600'}`}
                title="Quick Templates"
              >
                <Sparkles size={18} />
              </button>
            )}
            <div className={`flex-1 min-w-0 rounded-full px-4 py-2 text-sm flex items-center transition-colors duration-300 ${mode === InputMode.AGENT ? 'bg-indigo-800 text-white' : 'bg-white text-gray-900 border border-gray-300'}`}>
              {mode === InputMode.AGENT ? (
                <>
                  <span className="mr-2 font-mono text-indigo-300">Lumi {'>'}</span>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      analyzeSentinel(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEnter();
                      }
                    }}
                    placeholder="点击输入中文/English (用电脑键盘)"
                    className="flex-1 bg-transparent text-white placeholder-indigo-400 outline-none"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                </>
              ) : (
                <>
                  <span className={!inputValue ? 'opacity-50' : ''}>
                    {inputValue || "Type a message..."}
                  </span>
                  <span className="animate-pulse ml-0.5 w-0.5 h-4 bg-current inline-block"></span>
                </>
              )}
            </div>

            {/* Voice & Camera Buttons - Only in Agent Mode */}
            {mode === InputMode.AGENT && (
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                <VoiceButton
                  onVoiceResult={(text) => {
                    setInputValue(text);
                    onAgentLog(`Voice input: ${text}`);
                  }}
                />
                <ImageUploadButton
                  onClick={() => setShowImageUpload(true)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Quick Templates Popup */}
          {showTemplates && mode === InputMode.AGENT && (
            <div className="mt-2 bg-indigo-800 rounded-xl p-3 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Quick Templates</span>
                <button onClick={() => setShowTemplates(false)} className="text-indigo-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-indigo-700/50 hover:bg-indigo-600 transition-colors text-left"
                  >
                    <span className="text-lg">{template.icon}</span>
                    <span className="text-xs text-white font-medium truncate">{template.labelZh}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Keyboard - Collapsible */}
        {keyboardCollapsed ? (
          <div
            className="py-3 bg-gray-100 border-t border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => setKeyboardCollapsed(false)}
          >
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <span className="text-xs">⌨️ 点击展开键盘</span>
            </div>
          </div>
        ) : (
          <Keyboard
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
            onEnter={handleEnter}
            onModeChange={setMode}
            currentMode={mode}
          />
        )}
      </div>

      {/* Passive Learning Consent Modal */}
      <PassiveLearningConsentModal
        isOpen={showConsentModal}
        onClose={() => {
          setShowConsentModal(false);
          localStorage.setItem('lumi_consent_declined', 'true');
        }}
        onConsentGiven={() => {
          setShowConsentModal(false);
        }}
      />

      {/* Home Indicator */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full opacity-20 pointer-events-none"></div>
    </div>
  );
};
