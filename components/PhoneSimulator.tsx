import React, { useState, useEffect, useRef } from 'react';
import { Keyboard } from './Keyboard';
import { CandidateBar } from './CandidateBar';
import { FeatureButtons } from './FeatureButtons';
import { SceneHint } from './SceneHint';
import { PredictionBar } from './PredictionBar';
import { VoiceButton } from './VoiceButton';
import { EmojiReactions } from './EmojiReactions';
import { InputMode, AgentOutput, AgentInput, SoulMatrix, PolicyConfig, TextDraft, ServiceCard, PrivacyAction, TaskPlan } from '../types';
import { LumiAgent } from '../services/lumiAgent';
import { ConversationMessage } from '../services/geminiService';
import { QUICK_TEMPLATES, QuickTemplate } from '../services/quickTemplates';
import { APP_SCENARIOS, AppScenario, getScenarioById } from '../services/appScenarios';
import { recordInteraction } from '../services/localStorageService';
import { Wifi, Battery, Signal, Sparkles, X, Trash2, ChevronDown, Camera } from 'lucide-react';


interface PhoneSimulatorProps {
  soul: SoulMatrix;
  policy: PolicyConfig;
  apiKey: string;
  onAgentLog: (log: string) => void;
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

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({ soul, policy, apiKey, onAgentLog }) => {
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

  const agentRef = useRef<LumiAgent>(new LumiAgent(soul, policy, apiKey));
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleKeyPress = (key: string) => {
    setInputValue(prev => prev + key);
  };

  const handleDelete = () => {
    setInputValue(prev => prev.slice(0, -1));
  };

  const handleEnter = async () => {
    if (mode === InputMode.TYPE) {
      if (inputValue.trim()) {
        setMessages(prev => [...prev, { id: Date.now(), text: inputValue, from: 'me', timestamp: Date.now() }]);
        // Record message interaction for digital avatar
        recordInteraction('message_sent', {
          message: inputValue,
          messageLength: inputValue.length,
          scenario: currentScenario.id
        }, currentScenario.id);
        setInputValue('');
      }
    } else {
      // AGENT MODE: Trigger Lumi
      setIsLoading(true);
      setAgentOutput(null);
      const input: AgentInput = {
        rawText: inputValue,
        mode: InputMode.AGENT,
        timestampMs: Date.now(),
        appContext: { packageName: 'com.chat.app', fieldHints: [], isPasswordField: false }
      };

      // Convert messages to ConversationMessage format for context
      const conversationHistory: ConversationMessage[] = messages.map(msg => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      onAgentLog(`Agent Input: ${JSON.stringify(input)} (${currentScenario.nameZh} mode, ${conversationHistory.length} messages)`);

      try {
        const output = await agentRef.current.handle(input, conversationHistory, currentScenario.agentPromptHint);
        onAgentLog(`Agent Output: ${JSON.stringify(output)}`);
        setAgentOutput(output);
      } catch (e) {
        onAgentLog(`Error: ${e}`);
        setAgentOutput({ type: 'ERROR', message: 'Agent processing failed' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDraftClick = (draft: TextDraft) => {
    setInputValue(draft.text);
    setMode(InputMode.TYPE); // Exit agent mode to let user edit/send
    setAgentOutput(null);
    // Record draft selection for digital avatar
    recordInteraction('draft_selected', {
      draftId: draft.id,
      text: draft.text,
      tone: draft.tone
    }, currentScenario.id);
    onAgentLog(`User selected draft: ${draft.id}`);
  };

  const handleCardClick = (card: ServiceCard) => {
    onAgentLog(`User clicked card: ${card.id} - ${card.actionType}: ${card.actionUri}`);

    // Open the URL in a new tab (keeps current state intact)
    if (card.actionUri && card.actionUri.startsWith('http')) {
      window.open(card.actionUri, '_blank');
    } else if (card.actionUri) {
      // For deep links or non-http URIs, try to open them
      window.open(card.actionUri, '_blank');
    }

    // NOTE: We intentionally do NOT clear agentOutput here
    // The user can continue viewing cards after opening a link
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

  // Handle scenario change
  const handleScenarioChange = (scenario: AppScenario) => {
    setCurrentScenario(scenario);
    setMessages(scenario.defaultMessages.map((m, i) => ({ id: i + 1, text: m.text, from: m.from })));
    setShowScenarioPicker(false);
    setAgentOutput(null);
    onAgentLog(`Switched to ${scenario.nameZh} scenario`);

  };

  return (
    <div className="w-[360px] h-[720px] bg-white rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden flex flex-col relative">
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
              setMessages(currentScenario.defaultMessages.map((m, i) => ({ id: i + 1, text: m.text, from: m.from })));
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
          onClear={() => setAgentOutput(null)}
        />

        {/* Scene-aware Hints - Show contextual suggestions based on current app */}
        <SceneHint
          scenario={currentScenario}
          visible={mode === InputMode.AGENT && !agentOutput && !isLoading}
          onSuggestionClick={(text) => {
            setInputValue(text + ' ');
            onAgentLog(`Scene suggestion: ${text}`);
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
          <div className="flex items-center gap-2">
            {/* Quick Template Button - Only show in Agent Mode */}
            {mode === InputMode.AGENT && (
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`p-2 rounded-full transition-all duration-200 ${showTemplates ? 'bg-yellow-500 text-gray-900' : 'bg-indigo-700 text-indigo-200 hover:bg-indigo-600'}`}
                title="Quick Templates"
              >
                <Sparkles size={18} />
              </button>
            )}
            <div className={`flex-1 rounded-full px-4 py-2 text-sm flex items-center transition-colors duration-300 ${mode === InputMode.AGENT ? 'bg-indigo-800 text-white' : 'bg-white text-gray-900 border border-gray-300'}`}>
              {mode === InputMode.AGENT ? (
                <>
                  <span className="mr-2 font-mono text-indigo-300">Lumi {'>'}</span>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
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
              <>
                <VoiceButton
                  onVoiceResult={(text) => {
                    setInputValue(text);
                    onAgentLog(`Voice input: ${text}`);
                  }}
                />
                <button
                  onClick={() => {
                    setInputValue('帮我找 [识别图片中的内容]');
                    onAgentLog('Camera button clicked - simulated image recognition');
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-700/50 text-indigo-200 hover:bg-indigo-600 transition-colors"
                  title="图片识别"
                >
                  <Camera size={18} />
                </button>
              </>
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

        {/* Keyboard */}
        <Keyboard
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onEnter={handleEnter}
          onModeChange={setMode}
          currentMode={mode}
        />
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black rounded-full opacity-20 pointer-events-none"></div>
    </div>
  );
};