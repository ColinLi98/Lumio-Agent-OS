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
import { SuperAgentResultPanel, SuperAgentResult } from './SuperAgentResultPanel';
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
import { destinyEngine } from '../services/destinyEngineService';
import { personalNavigator } from '../services/personalNavigatorService';
import { getPassiveLearningService } from '../services/passiveLearningService';
import { PassiveLearningConsentModal } from './PassiveLearningConsentModal';
import { SmartChips, ChipAction } from './SmartChips';
import { getSuperAgent } from '../services/superAgentService';
import { registerBuiltinSkills } from '../services/builtinSkills';
import { Wifi, Battery, Signal, Sparkles, X, Trash2, ChevronDown, Shield, AlertTriangle } from 'lucide-react';
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

const MESSAGES_STORAGE_KEY = 'lumi_chat_messages';
type PendingIntent = { query: string; locked?: boolean; topic?: 'travel' | 'general' };

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({ soul, policy, apiKey, onAgentLog, onOpenApp, onDecisionUpdate, onSoulUpdate, onDestinyResult, fullscreen }) => {
  const [currentScenario, setCurrentScenario] = useState<AppScenario>(APP_SCENARIOS[0]);
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [messages, setMessages] = useState<{ id: number, text: string, from: 'user' | 'me', timestamp: number }[]>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { }
    }
    // Default messages with timestamps
    return APP_SCENARIOS[0].defaultMessages.map((m, i) => ({
      id: i + 1,
      text: m.text,
      from: m.from,
      timestamp: Date.now() - (5 - i) * 60000 // Stagger timestamps
    }));
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
      const builtQuery = buildAgentQuery(inputValue);
      if (!builtQuery) {
        setIsLoading(false);
        return;
      }
      const rawText = builtQuery.rawText;

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

        // 🚀 Agent 模式：不添加到聊天消息，直接跳转 Lumi App 显示
        // 用户消息也不需要添加到聊天（因为会在 Lumi App 里显示）

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

        // 🚀 Agent 模式：始终自动跳转到 Lumi App 显示详情
        onAgentLog(`[Super Agent] Agent 模式完成，跳转到 Lumi App 显示结果`);
        setShowAppOverlay(true);

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
    setMessages(scenario.defaultMessages.map((m, i) => ({ id: i + 1, text: m.text, from: m.from, timestamp: Date.now() - (5 - i) * 60000 })));
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
              setMessages(currentScenario.defaultMessages.map((m, i) => ({ id: i + 1, text: m.text, from: m.from, timestamp: Date.now() - (5 - i) * 60000 })));
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
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.from === 'me' ? 'rounded-br-none' : 'rounded-bl-none'
                }`}
              style={{
                backgroundColor: msg.from === 'me' ? currentScenario.bubbleMyColor : currentScenario.bubbleTheirColor,
                color: msg.from === 'me' && ['#007AFF', '#1677FF'].includes(currentScenario.bubbleMyColor) ? 'white' : '#1f2937',
                border: msg.from !== 'me' ? '1px solid #e5e7eb' : 'none'
              }}
            >
              {msg.text}
            </div>
            {/* Message timestamp */}
            <div className={`text-[10px] text-gray-400 mt-1 px-1 ${msg.from === 'me' ? 'text-right' : 'text-left'}`}>
              {formatMessageTime(msg.timestamp)}
            </div>
          </div>
        ))}
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
          onDestinySimulate={(intentType, params) => {
            // 运行命运模拟
            onAgentLog(`[Destiny Engine] 启动命运模拟: ${intentType}`);
            onAgentLog(`[Personal Navigator] 生成有温度的建议...`);

            // 快速评估
            const options = intentType === 'career'
              ? ['辞职创业', '保持稳定工作', '边工作边准备']
              : intentType === 'finance'
                ? ['激进投资', '保守投资', '观望等待']
                : ['立即行动', '继续观望', '寻求更多信息'];

            const evaluation = destinyEngine.quickEvaluate(inputValue, options);

            // 构建 Destiny Report 摘要
            const bestOption = Object.entries(evaluation.scores).sort((a, b) => b[1] - a[1])[0];
            const secondOption = Object.entries(evaluation.scores).sort((a, b) => b[1] - a[1])[1];
            const successProb = bestOption[1] / 100;

            // Layer 4: 使用 Personal Navigator 生成有温度的回复
            const navigatorResponse = personalNavigator.quickCraft({
              optimalPath: bestOption[0],
              alternativePath: secondOption?.[0],
              successProbability: successProb,
              riskLevel: successProb > 0.6 ? 'low' : successProb > 0.4 ? 'medium' : 'high',
              expectedValue: bestOption[1] - 50,
              jCurve: {
                dipDepth: intentType === 'career' ? -50 : -30,
                dipDuration: intentType === 'career' ? '3-6个月' : '1-3个月',
                recoveryPoint: intentType === 'career' ? '12-18个月' : '6个月'
              },
              caveats: ['结果取决于执行力和外部环境', '建议定期重新评估']
            }, inputValue);

            // 发送到 Lumi App 显示，而不是作为聊天消息
            if (onDestinyResult) {
              onDestinyResult({
                query: inputValue,
                intentType,
                navigatorOutput: navigatorResponse,
                timestamp: Date.now()
              });
              onAgentLog(`[Destiny] 结果已发送到 Lumi App`);
            }

            setSentinelOutput(null);
            setInputValue(''); // 清空输入
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
