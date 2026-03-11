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
import { buildApiUrl } from '../services/apiBaseUrl';
import { Wifi, Battery, Signal, Sparkles, X, Trash2, ChevronDown, Shield, AlertTriangle, ExternalLink, Bot } from 'lucide-react';
import { DestinySimulationResult } from '../App';

// Initialize built-in Super Agent capabilities
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
  /** Redirect Agent Mode query to Lumi App Chat instead of third-party chat */
  onAgentChatRedirect?: (query: string) => void;
  fullscreen?: boolean;
}

// Message timestamp formatter
const formatMessageTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) {
    const date = new Date(timestamp);
    return `Today ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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

interface SuperAgentExecuteResponse {
  success?: boolean;
  error?: string;
  answer?: string;
  toolsUsed?: string[];
  toolResults?: Array<{
    success?: boolean;
    toolName?: string;
    output?: any;
    error?: string;
    executionTimeMs?: number;
  }>;
  confidence?: number;
  executionTimeMs?: number;
  runtime_status?: 'RUNNING' | 'WAITING_USER' | 'DONE' | 'FAILED' | 'CANCELLED';
  current_wait?: {
    node_id: string;
    type: 'approval' | 'ask_user';
    expires_at?: number;
  };
  policy_decision_ids?: string[];
  approval_reason?: string;
  capsule_approval_token?: string;
  reasoning?: string;
  followUpSuggestions?: string[];
  marketplace_trace_id?: string;
  policy_sync?: {
    status: 'matched' | 'missing_client' | 'version_mismatch' | 'fingerprint_mismatch';
    strict_enforced: boolean;
    server_policy_version: string;
    server_policy_fingerprint: string;
    client_policy_version?: string;
    client_policy_fingerprint?: string;
  };
}

interface PendingCapsuleApproval {
  token: string;
  requestBody: Record<string, any>;
  rawText: string;
  startedAt: number;
  reason?: string;
  policyDecisionIds?: string[];
  expiresAt?: number;
}

interface PolicySyncState {
  policyVersion?: string;
  policyFingerprint?: string;
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
          links.push({ title: item?.title || 'View result', url: item.url, caption: item?.source });
        }
      });
    }
    if (Array.isArray(data?.evidence?.items)) {
      data.evidence.items.slice(0, 2).forEach((item: any) => {
        if (typeof item?.title === 'string' && item.title.trim()) highlights.push(item.title.trim());
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.title || 'View evidence', url: item.url, caption: item?.source_name });
        }
      });
    }
    if (Array.isArray(data?.action_links)) {
      data.action_links.slice(0, 3).forEach((item: any) => {
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.title || 'Open action', url: item.url, caption: item?.provider });
        }
      });
    }
    const flights = Array.isArray(data?.data?.flights) ? data.data.flights : [];
    if (flights.length > 0) {
      const best = flights[0];
      const airline = typeof best?.airline === 'string' ? best.airline : 'Airline';
      const price = Number.isFinite(best?.price) ? `¥${best.price}` : '';
      highlights.push(`Flight recommendation: ${airline}${price ? ` · ${price}` : ''}`);
      if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim()) {
        links.push({ title: `${airline} booking`, url: best.bookingUrl });
      }
    }
    const hotels = Array.isArray(data?.data?.hotels) ? data.data.hotels : [];
    if (hotels.length > 0) {
      const best = hotels[0];
      const name = typeof best?.name === 'string' ? best.name : 'Hotel';
      const price = Number.isFinite(best?.pricePerNight) ? `¥${best.pricePerNight}/night` : '';
      highlights.push(`Hotel recommendation: ${name}${price ? ` · ${price}` : ''}`);
      if (typeof best?.bookingUrl === 'string' && best.bookingUrl.trim()) {
        links.push({ title: `${name} booking`, url: best.bookingUrl });
      }
    }
    if (data?.data?.comparisonLinks && typeof data.data.comparisonLinks === 'object') {
      Object.values(data.data.comparisonLinks).slice(0, 3).forEach((item: any) => {
        if (typeof item?.url === 'string' && item.url.trim()) {
          links.push({ title: item?.name || 'Comparison link', url: item.url, caption: 'Price compare' });
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
      return /\u7ee7\u7eed\u7b5b\u9009|continue filter/i.test(query) ? query : `${query}, continue filtering`;
    case 'direct_only':
      return /\u76f4\u98de|direct flight|non-stop/i.test(query) ? query : `${query}, direct flights only`;
    case 'budget_800':
      return /(\u9884\u7b97|budget|¥|￥)\s*800|800\s*(\u5143|rmb|cny)?/i.test(query) ? query : `${query}, budget within 800`;
    case 'add_date':
      return /\d{4}-\d{2}-\d{2}|\u4eca\u5929|\u660e\u5929|\u540e\u5929|today|tomorrow|day after tomorrow/i.test(query)
        ? query
        : `${query}, departure date ${getDefaultTravelDate()}`;
    case 'add_budget':
      return /(\u9884\u7b97|budget|¥|￥)\s*\d+|\d+\s*(\u5143|rmb|cny)?/i.test(query) ? query : `${query}, budget within 1500`;
    case 'add_passengers':
      return /\d+\s*(\u4eba|\u4f4d|person|people|pax)/i.test(query) ? query : `${query}, 1 traveler`;
    default:
      return query;
  }
};

const isCapsuleApprovalWaiting = (payload: SuperAgentExecuteResponse): boolean =>
  payload.success === true
  && payload.runtime_status === 'WAITING_USER'
  && payload.current_wait?.node_id === 'capsule_approval'
  && typeof payload.capsule_approval_token === 'string'
  && payload.capsule_approval_token.trim().length > 0;

const containsLikelyPII = (text: string): boolean => {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phonePattern = /(?:\+?\d[\d\s\-()]{7,}\d)/;
  return emailPattern.test(normalized) || phonePattern.test(normalized);
};

const isMarketEgressIntent = (text: string): boolean =>
  /(market|marketplace|publish|公开|市场|发布|上架|披露|post externally)/i.test(String(text || ''));

const buildCapsuleApprovalTask = (
  rawText: string,
  token: string,
  options?: {
    reason?: string;
    startedAt?: number;
    policyDecisionIds?: string[];
    expiresAt?: number;
  }
): TaskPlan => ({
  id: `capsule_approval_${token.slice(0, 12)}`,
  goal: `Approve external disclosure: ${rawText.slice(0, 80)}`,
  steps: [
    {
      id: 'capsule_approval_step',
      description: options?.reason || 'This request requires explicit approval before external disclosure.',
      status: 'waiting_confirmation',
      requiresConfirmation: true,
      maxRetries: 0,
    },
  ],
  currentStepIndex: 0,
  status: 'waiting_confirmation',
  summary: options?.reason || 'Awaiting approval for capsule disclosure',
  startedAt: options?.startedAt || Date.now(),
  audit: {
    approval_reason: options?.reason,
    policy_decision_ids: options?.policyDecisionIds,
    approval_token: token,
    approval_expires_at: options?.expiresAt,
  },
});

const toLegacySuperAgentSolution = (payload: SuperAgentExecuteResponse) => {
  const toolsUsed = Array.isArray(payload.toolsUsed) ? payload.toolsUsed : [];
  const toolResults = Array.isArray(payload.toolResults) ? payload.toolResults : [];
  return {
    answer: String(payload.answer || ''),
    reasoning: typeof payload.reasoning === 'string'
      ? payload.reasoning
      : toolsUsed.length > 0
        ? `Used ${toolsUsed.join(', ')} to answer your request`
        : 'single_entry_super_agent',
    skillsUsed: toolsUsed,
    results: toolResults.map((row) => ({
      success: row?.success !== false,
      data: row?.output,
      confidence: row?.success === false ? 0 : 0.9,
      error: row?.error,
      executionTimeMs: Number(row?.executionTimeMs || 0),
      skillId: row?.toolName || 'tool',
      skillName: row?.toolName || 'tool',
    })),
    confidence: Number.isFinite(payload.confidence) ? Number(payload.confidence) : 0.5,
    executionTimeMs: Number.isFinite(payload.executionTimeMs) ? Number(payload.executionTimeMs) : 0,
    followUpSuggestions: Array.isArray(payload.followUpSuggestions) ? payload.followUpSuggestions : [],
    marketplace_trace_id: payload.marketplace_trace_id,
  };
};

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({ soul, policy, apiKey, onAgentLog, onOpenApp, onDecisionUpdate, onSoulUpdate, onDestinyResult, onOpenInMarket, onAgentChatRedirect, fullscreen }) => {
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

  // Sentinel analysis with debounce
  const analyzeSentinel = useCallback((text: string) => {
    if (sentinelTimerRef.current) {
      clearTimeout(sentinelTimerRef.current);
    }
    sentinelTimerRef.current = window.setTimeout(() => {
      const result = keyboardSentinel.analyze(text);
      setSentinelOutput(result);

      // Pass intent to Soul Architect (Layer 2)
      if (result.intent || result.privacy) {
        soulArchitect.onSentinelIntent(result);
      }

      // Log high-value intents
      if (result.intent && result.meta.shouldEscalate) {
        onAgentLog(`[Sentinel] Intent detected: ${result.intent.type} (confidence: ${(result.intent.confidence * 100).toFixed(0)}%)`);
      }
      // Log privacy risk
      if (result.privacy) {
        onAgentLog(`[Sentinel] ⚠️ Privacy risk: ${result.privacy.risk} -> ${result.privacy.action}`);
      }
    }, 200); // 200ms debounce
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
  const [pendingCapsuleApproval, setPendingCapsuleApproval] = useState<PendingCapsuleApproval | null>(null);
  const [policySyncState, setPolicySyncState] = useState<PolicySyncState | null>(null);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(() => {
    // Show consent modal if user hasn't consented yet
    const service = getPassiveLearningService();
    return !service.hasConsent() && !localStorage.getItem('lumi_consent_declined');
  });

  // Super Agent result for visualization in the app
  const [superAgentResult, setSuperAgentResult] = useState<SuperAgentResult | null>(null);

  // Conversation context for multi-turn memory
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

  const buildSuperAgentExecuteRequest = useCallback((
    rawText: string,
    typedInput: string,
    contextOverride?: ConversationMessage[]
  ): Record<string, any> => {
    const marketIntent = isMarketEgressIntent(rawText);
    const piiDetected = containsLikelyPII(typedInput || rawText);
    const contextWindow = contextOverride || conversationContext;
    return {
      query: rawText,
      api_key: apiKey,
      user_id: 'user',
      current_app: currentScenario.id,
      recent_queries: contextWindow.slice(-5).map(m => m.content),
      locale: 'en-GB',
      preferences: soul,
      selected_text: typedInput || rawText,
      data: {
        egress_target: marketIntent ? 'market' : 'cloud',
        contains_pii: piiDetected,
      },
      client_policy_version: policySyncState?.policyVersion,
      client_policy_fingerprint: policySyncState?.policyFingerprint,
    };
  }, [apiKey, conversationContext, currentScenario.id, soul, policySyncState]);

  const applyPolicySyncFromPayload = useCallback((
    policySync?: SuperAgentExecuteResponse['policy_sync']
  ) => {
    if (!policySync) return;
    setPolicySyncState({
      policyVersion: policySync.server_policy_version,
      policyFingerprint: policySync.server_policy_fingerprint,
    });
    if (policySync.status !== 'matched') {
      onAgentLog(`[Policy Sync] status=${policySync.status} strict=${policySync.strict_enforced}`);
    }
  }, [onAgentLog]);

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
    /\u673a\u7968|\u822a\u73ed|\u98de\u673a|flight|travel|\u65c5\u884c|\u65c5\u6e38|\u9152\u5e97|hotel|\u63a5\u9001\u673a|\u673a\u573a|\u673a\u573a\u63a5\u9001|to\s+\w+|from\s+\w+|trip/i.test(text);

  const isTravelFollowUp = (text: string) =>
    /\u65e5\u671f|\u65f6\u95f4|\u51fa\u53d1|\u8fd4\u7a0b|\u56de\u7a0b|\u9884\u7b97|\u4ef7\u683c|\u822a\u73ed|\u673a\u7968|\u9152\u5e97|\u4f4f\u5bbf|\u9910\u5385|\u7f8e\u98df|\u666f\u70b9|\u884c\u7a0b|\u63a5\u9001\u673a|\u5929\u6c14|\u7b7e\u8bc1|transfer|pickup|hotel|restaurant|attraction|itinerary|weather/i.test(text);

  const isDateFollowUp = (text: string) =>
    /\d{1,4}[-\/\u5e74]\d{1,2}[-\/\u6708]\d{1,2}|\u4e0b\u5468|\u660e\u5929|\u540e\u5929|\u5468[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u65e5\u672b]|\u6708\u5e95|\u6708\u521d|next week|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\u53f7|\d+\u65e5/i.test(text);

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
    // Passive learning: record keystrokes
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
    // Passive learning: record deletion
    const passiveLearning = getPassiveLearningService();
    passiveLearning.onDeletion(currentScenario.id);
  };

  const applySuggestionToInput = (suggestion: string) => {
    const clean = suggestion.trim();
    if (!clean) return;
    setKeyboardCollapsed(false);
    setInputValue(prev => {
      if (!prev) return clean;
      const separator = /[，,、；;]\s*$/.test(prev) ? ' ' : ', ';
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
    onAgentLog(`[Assistant] Quick action filled: ${nextQuery}`);
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
      // AGENT MODE: redirect to Lumi App chat
      const typedInput = inputValue.trim();
      const builtQuery = buildAgentQuery(inputValue);
      if (!builtQuery) return;
      const rawText = builtQuery.rawText;

      // Redirect to Lumi App Chat — do NOT send into third-party chat
      if (onAgentChatRedirect) {
        setInputValue('');
        onAgentLog(`[Agent Mode] Redirecting to Lumi Chat: "${rawText}"`);
        onAgentChatRedirect(rawText);
        return;
      }

      // Fallback: original in-chat agent behavior (when no redirect handler)
      setIsLoading(true);
      setAgentOutput(null);
      const requestTs = Date.now();

      // Show user query in main chat stream
      setMessages(prev => [...prev, {
        id: requestTs,
        text: typedInput || rawText,
        from: 'me',
        timestamp: requestTs,
      }]);

      // Use accumulated conversation context (multi-turn memory)
      const updatedContext: ConversationMessage[] = [
        ...conversationContext,
        { role: 'user' as const, content: rawText }
      ];

      onAgentLog(`[Super Agent] Received query: "${rawText}" (context: ${updatedContext.length} messages)`);

      try {
        let solution: any | null = null;
        let executeRequestBody = buildSuperAgentExecuteRequest(rawText, typedInput, updatedContext);

        // Prefer unified API runtime for policy/capsule gating; fallback to local superAgent.solve.
        try {
          const executeResponse = await fetch(buildApiUrl('/api/super-agent/execute'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(executeRequestBody),
          });

          if (executeResponse.ok) {
            const executePayload = await executeResponse.json() as SuperAgentExecuteResponse;
            applyPolicySyncFromPayload(executePayload.policy_sync);

            if (isCapsuleApprovalWaiting(executePayload)) {
              const token = String(executePayload.capsule_approval_token || '').trim();
              const reason = String(executePayload.approval_reason || 'Approval required before continuing').trim();
              const policyDecisionIds = Array.isArray(executePayload.policy_decision_ids)
                ? executePayload.policy_decision_ids
                : [];
              const expiresAt = executePayload.current_wait?.expires_at;
              setPendingCapsuleApproval({
                token,
                requestBody: executeRequestBody,
                rawText,
                startedAt: Date.now(),
                reason,
                policyDecisionIds,
                expiresAt,
              });
              setConversationContext(updatedContext);
              setSuperAgentResult(null);
              setAgentOutput({
                type: 'TASK_PROGRESS',
                task: buildCapsuleApprovalTask(rawText, token, {
                  reason,
                  startedAt: Date.now(),
                  policyDecisionIds,
                  expiresAt,
                }),
              });
              setInputValue('');
              onAgentLog(`[Policy] decision_ids=${policyDecisionIds.join(',') || 'none'}`);
              onAgentLog(`[Super Agent] Waiting for capsule approval (${token.slice(0, 8)}...)`);
              return;
            }

            if (executePayload.success === true && typeof executePayload.answer === 'string') {
              solution = toLegacySuperAgentSolution(executePayload);
              onAgentLog('[Super Agent] Completed via /api/super-agent/execute');
            } else if (executePayload.success === false && executePayload.error) {
              throw new Error(executePayload.error);
            }
          } else {
            onAgentLog(`[Super Agent API] HTTP ${executeResponse.status}, fallback to local solver`);
          }
        } catch (executeError) {
          onAgentLog(`[Super Agent API] unavailable: ${executeError instanceof Error ? executeError.message : String(executeError)}`);
        }

        if (!solution) {
          // 🧠 Fallback local path (direct service invocation)
          const superAgent = getSuperAgent();
          superAgent.setApiKey(apiKey);
          solution = await superAgent.solve(rawText, {
            userId: 'user',
            preferences: soul,
            recentQueries: updatedContext.slice(-5).map(m => m.content),
            currentApp: currentScenario.id,
            conversationHistory: updatedContext
          });
        }
        setPendingCapsuleApproval(null);

        onAgentLog(`[Super Agent] Completed: ${solution.skillsUsed.length} skills, confidence ${(solution.confidence * 100).toFixed(0)}%, time ${solution.executionTimeMs}ms`);

        // Update conversation context with assistant response
        const newContext: ConversationMessage[] = [
          ...updatedContext,
          { role: 'assistant' as const, content: solution.answer || '' }
        ];
        setConversationContext(newContext);

        // Write Super Agent result back to main chat stream
        const assistantMeta = buildAssistantMetaFromSolution(solution, rawText);
        setMessages(prev => [...prev, {
          id: requestTs + 1,
          text: solution.answer || 'Generated an executable suggestion for you.',
          from: 'assistant',
          timestamp: Date.now(),
          assistantMeta,
        }]);

        // 🎯 Save structured result for Lumi App visualization
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

        // Keep result in chat stream; user can open full app details on demand
        onAgentLog(`[Super Agent] Agent mode completed, result written to chat stream`);

        // Show follow-up suggestions as drafts if available
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
          // Reasoning is stored in superAgentResult; no separate output needed
          // Clear previous output
          setAgentOutput(null);
        }

        setInputValue('');
        // ⚡️ Keep Agent Mode; do not switch back to TYPE
        // setMode(InputMode.TYPE); // intentionally disabled to keep Agent Mode

      } catch (e) {
        onAgentLog(`[Super Agent] Error: ${e}`);

        // Fallback to legacy Lumi agent
        onAgentLog(`[Fallback] Using legacy agent...`);
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

    // Record to Soul Architect (Layer 2)
    soulArchitect.onInteraction({
      type: 'draft_accept',
      context: draft.tone,
      timestamp: Date.now()
    });

    onAgentLog(`User selected draft: ${draft.id}`);
  };

  const handleCardClick = (card: ServiceCard) => {
    onAgentLog(`User clicked card: ${card.id} - ${card.actionType}: ${card.actionUri}`);

    // Record to Soul Architect (Layer 2)
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
    onAgentLog(`Template selected: ${template.label}`);
  };

  // Handle feature button selection (three quick feature entry points)
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
      if (pendingCapsuleApproval) {
        const decision = action === 'confirm' ? 'approve' : 'reject';
        const approvalResponse = await fetch(buildApiUrl('/api/super-agent/capsule-approval'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: pendingCapsuleApproval.token,
            decision,
          }),
        });
        const approvalPayload = await approvalResponse.json().catch(() => ({} as Record<string, unknown>));
        if (!approvalResponse.ok || approvalPayload?.success !== true) {
          throw new Error(String(approvalPayload?.error || `capsule_approval_${decision}_failed`));
        }

        if (action === 'cancel') {
          setPendingCapsuleApproval(null);
          setAgentOutput({
            type: 'TASK_PROGRESS',
            task: {
              id: task.id,
              goal: task.goal,
              steps: task.steps.map((step) => ({
                ...step,
                status: step.status === 'waiting_confirmation' ? 'failed' : step.status,
              })),
              currentStepIndex: task.currentStepIndex,
              status: 'failed',
              summary: 'Capsule approval rejected by user',
              startedAt: task.startedAt,
              completedAt: Date.now(),
              audit: task.audit,
            },
          });
          onAgentLog('[Super Agent] Capsule approval rejected');
          return;
        }

        const resumeResponse = await fetch(buildApiUrl('/api/super-agent/execute'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pendingCapsuleApproval.requestBody,
            capsule_approval_token: pendingCapsuleApproval.token,
          }),
        });
        const resumePayload = await resumeResponse.json().catch(() => ({} as SuperAgentExecuteResponse));
        applyPolicySyncFromPayload(resumePayload.policy_sync);
        if (!resumeResponse.ok || resumePayload?.success !== true) {
          throw new Error(String((resumePayload as any)?.error || 'capsule_resume_failed'));
        }

        if (isCapsuleApprovalWaiting(resumePayload)) {
          const token = String(resumePayload.capsule_approval_token || pendingCapsuleApproval.token).trim();
          const reason = String(resumePayload.approval_reason || pendingCapsuleApproval.reason || '').trim();
          const policyDecisionIds = Array.isArray(resumePayload.policy_decision_ids)
            ? resumePayload.policy_decision_ids
            : pendingCapsuleApproval.policyDecisionIds || [];
          const expiresAt = resumePayload.current_wait?.expires_at || pendingCapsuleApproval.expiresAt;
          setPendingCapsuleApproval({
            ...pendingCapsuleApproval,
            token,
            reason,
            policyDecisionIds,
            expiresAt,
          });
          setAgentOutput({
            type: 'TASK_PROGRESS',
            task: buildCapsuleApprovalTask(pendingCapsuleApproval.rawText, token, {
              reason,
              startedAt: pendingCapsuleApproval.startedAt,
              policyDecisionIds,
              expiresAt,
            }),
          });
          return;
        }

        const solution = toLegacySuperAgentSolution(resumePayload);
        const rawText = pendingCapsuleApproval.rawText;
        const newContext: ConversationMessage[] = [
          ...conversationContext,
          { role: 'assistant' as const, content: solution.answer || '' },
        ];
        setConversationContext(newContext);

        const assistantMeta = buildAssistantMetaFromSolution(solution, rawText);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: solution.answer || 'Generated an executable suggestion for you.',
          from: 'assistant',
          timestamp: Date.now(),
          assistantMeta,
        }]);

        setSuperAgentResult({
          question: rawText,
          answer: solution.answer,
          skillsUsed: solution.skillsUsed,
          results: solution.results,
          confidence: solution.confidence,
          executionTimeMs: solution.executionTimeMs,
          reasoning: solution.reasoning,
          timestamp: Date.now(),
        });

        if (solution.followUpSuggestions && solution.followUpSuggestions.length > 0) {
          const drafts = solution.followUpSuggestions.map((suggestion, i) => ({
            id: `followup_${i}`,
            text: suggestion,
            tone: 'suggestion',
          }));
          setAgentOutput({
            type: 'DRAFTS',
            drafts,
          });
        } else {
          setAgentOutput(null);
        }

        setPendingCapsuleApproval(null);
        onAgentLog(`[Super Agent] Capsule approval confirmed and execution resumed (${solution.skillsUsed.length} skills)`);
        return;
      }

      const output = await agentRef.current.handleTaskAction(action);
      onAgentLog(`Task output: ${JSON.stringify(output)}`);
      setAgentOutput(output);
    } catch (e) {
      onAgentLog(`Task error: ${e}`);
      setAgentOutput({ type: 'ERROR', message: 'Task execution failed' });
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
    onAgentLog(`Switched to ${scenario.name} scenario`);

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
          // Continue the conversation inside Lumi App without closing the overlay
          onAgentLog(`[Super Agent] Continue conversation: "${question}"`);
          setIsLoading(true);

          try {
            const superAgent = getSuperAgent();
            superAgent.setApiKey(apiKey);

            // Add to conversation context
            const updatedContext: ConversationMessage[] = [
              ...conversationContext,
              { role: 'user' as const, content: question }
            ];

            // Debug: show conversation context
            console.log(`[Follow-up] Conversation context (${updatedContext.length} messages):`, updatedContext);
            onAgentLog(`[Follow-up] Context message count: ${updatedContext.length}`);

            const solution = await superAgent.solve(question, {
              userId: 'user',
              preferences: soul,
              recentQueries: updatedContext.slice(-5).map(m => m.content),
              currentApp: currentScenario.id,
              conversationHistory: updatedContext
            });

            onAgentLog(`[Super Agent] Follow-up complete: ${solution.skillsUsed.length} skills`);

            // Update conversation context
            const newContext: ConversationMessage[] = [
              ...updatedContext,
              { role: 'assistant' as const, content: solution.answer || '' }
            ];
            setConversationContext(newContext);

            // Update result display (keep inside Lumi App)
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
            onAgentLog(`[Super Agent] Follow-up error: ${e}`);
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
          <span>{currentScenario.name}</span>
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
                <span className="text-sm">{scenario.name}</span>
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
            <span>Clear ({messages.length})</span>
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
                        Continue filtering
                      </button>
                      <button
                        onClick={() => handleAssistantQuickAction(meta, 'direct_only')}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600"
                      >
                        Direct flights only
                      </button>
                      <button
                        onClick={() => handleAssistantQuickAction(meta, 'budget_800')}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600"
                      >
                        Budget under 800
                      </button>
                      <button
                        onClick={() => setShowAppOverlay(true)}
                        className="text-[11px] px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-600"
                      >
                        Open details
                      </button>
                    </div>
                  )}

                  {isAssistant && meta?.missingConstraints && meta.missingConstraints.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <div className="text-[11px] text-amber-700 mb-1">
                        Missing info: {meta.missingConstraints.join(', ')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleAssistantQuickAction(meta, 'add_date')}
                          className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-white text-amber-700"
                        >
                          Add dates ({getDefaultTravelDate()})
                        </button>
                        <button
                          onClick={() => handleAssistantQuickAction(meta, 'add_budget')}
                          className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-white text-amber-700"
                        >
                          Add budget
                        </button>
                        <button
                          onClick={() => handleAssistantQuickAction(meta, 'add_passengers')}
                          className="text-[11px] px-2 py-1 rounded border border-amber-200 bg-white text-amber-700"
                        >
                          Add travelers
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

        {/* Keyboard Sentinel Indicator - real-time intent/privacy detection */}
        <SentinelIndicator
          output={sentinelOutput}
          onMaskApply={(maskedText) => {
            // Replace current input with masked text
            setInputValue(prev => {
              // Simple replacement; production should use stricter position mapping
              if (sentinelOutput?.privacy?.maskedPreview) {
                return prev.replace(/\d{11,}/, maskedText.replace(/\s/g, ''));
              }
              return prev;
            });
            setSentinelOutput(null);
            onAgentLog('[Sentinel] Masking applied');
          }}
          onIntentAction={(intentType) => {
            // Auto-switch to Agent mode
            setMode(InputMode.AGENT);
            onAgentLog(`[Sentinel] Activated Agent mode for: ${intentType}`);
            // Optional: auto-trigger agent handling
            // Note: handleSend is defined in AgentKeyboard component, so we just set mode here
            // The actual processing will happen when user presses enter
          }}
          onDestinySimulate={async (intentType, _params) => {
            onAgentLog(`[DTOE] Running strategy simulation: ${intentType}`);

            try {
              const dtoeEngine = getDestinyEngine();
              const recommendation = await dtoeEngine.getRecommendation({
                entity_id: `phone_${currentScenario.id}_${intentType}`,
                needs_live_data: false,
                time_budget_ms: 1500,
              });

              if (!recommendation.strategy_card || !recommendation.explanation_card) {
                onAgentLog('[DTOE] No valid strategy card generated; skipped display');
                setSentinelOutput(null);
                return;
              }

              const strategy = recommendation.strategy_card;
              const explanation = recommendation.explanation_card;
              const failureProb = strategy.outcomes_distribution?.failure_prob ?? 0.5;
              const successProb = Math.max(0, Math.min(1, 1 - failureProb));
              const utilityMetric = strategy.outcomes_distribution?.metrics?.find(m => m.name === 'utility_score');
              const primaryReason = explanation.top_reasons?.[0]?.text ?? 'Best strategy based on the current state';
              const alternativePath =
                explanation.why_not_explanations?.[0]?.alternative_action ||
                explanation.alternatives?.[0]?.action_summary ||
                'No clearly better alternative found yet';

              onAgentLog(
                `[DTOE] Recommended=${strategy.next_best_action.summary}, failureRate=${(failureProb * 100).toFixed(0)}%, ` +
                `cache=${recommendation.diagnostics.cache_hit ? 'hit' : 'miss'}`
              );
              onAgentLog('[Personal Navigator] Generating personalized guidance...');

              const navigatorResponse = personalNavigator.quickCraft({
                optimalPath: strategy.next_best_action.summary,
                alternativePath,
                successProbability: successProb,
                riskLevel: mapFailureProbToRiskLevel(failureProb),
                expectedValue: utilityMetric?.p50 ?? 0,
                jCurve: {
                  dipDepth: intentType === 'career' ? -45 : -28,
                  dipDuration: intentType === 'career' ? '3-6 months' : '1-3 months',
                  recoveryPoint: intentType === 'career' ? '12-18 months' : '6 months'
                },
                caveats: [
                  ...explanation.risk_notes.slice(0, 2),
                  ...recommendation.diagnostics.errors.slice(0, 1),
                ].filter(Boolean),
              }, inputValue);

              const policySection =
                `\n\n🧭 **DTOE Strategy Card Summary**\n` +
                `• Next Best Action: ${strategy.next_best_action.summary}\n` +
                `• Risk (failure_prob): ${(failureProb * 100).toFixed(1)}%\n` +
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
                onAgentLog('[Destiny] DTOE result sent to Lumi App');
              }
            } catch (error) {
              onAgentLog(`[DTOE] Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setSentinelOutput(null);
              setInputValue('');
            }
          }}
        />

        {/* Smart Chips - intent-triggered quick actions */}
        <SmartChips
          sentinelOutput={sentinelOutput}
          visible={mode === InputMode.TYPE && inputValue.length > 5}
          onChipClick={(chip: ChipAction) => {
            // Record click into value metrics
            import('../services/valueMetricsService').then(({ getValueMetricsService }) => {
              getValueMetricsService().recordChipClick(chip.type);
            });
            // Switch to Agent mode and add action prefix
            setMode(InputMode.AGENT);
            if (chip.inputPrepend) {
              setInputValue(chip.inputPrepend + inputValue);
            }
            onAgentLog(`[SmartChips] Quick action selected: ${chip.label}`);
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
              Your last travel intent is saved. You can add dates, hotel, airport transfer, and more.
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
                    placeholder="Type Chinese/English (use your computer keyboard)"
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
                    <span className="text-xs text-white font-medium truncate">{template.label}</span>
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
              <span className="text-xs">⌨️ Click to expand keyboard</span>
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
