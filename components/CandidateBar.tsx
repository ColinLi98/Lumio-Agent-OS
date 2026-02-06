import React from 'react';
import { AgentOutput, ServiceCard, TextDraft, PrivacyAction, TaskPlan, OrchestrationPlan, OrchestrationSection, SuperAgentSolution, AssociatedSuggestion, LifeActionRecommendation } from '../types';
import { ExternalLink, Copy, ShieldAlert, X, CheckCircle2, Circle, Loader2, AlertCircle, Sparkles, Plane, DollarSign, Maximize2, Minimize2, Compass, Heart, Zap, Brain, ArrowRight } from 'lucide-react';
import { ToolResultCard } from './ToolResultCard';
import { DecisionBlock } from './DecisionBlock';

interface CandidateBarProps {
  output: AgentOutput | null;
  onDraftClick: (draft: TextDraft) => void;
  onCardClick: (card: ServiceCard) => void;
  onPrivacyAction: (action: PrivacyAction, confirm: boolean) => void;
  onTaskAction?: (task: TaskPlan, action: 'confirm' | 'cancel') => void;
  onSuggestionClick?: (suggestion: string) => void;
  onViewInApp?: () => void;
  onClear: () => void;
}

export const CandidateBar: React.FC<CandidateBarProps> = ({
  output,
  onDraftClick,
  onCardClick,
  onPrivacyAction,
  onTaskAction,
  onSuggestionClick,
  onViewInApp,
  onClear
}) => {
  if (!output || output.type === 'NONE') return null;
  const decision = (output as { decision?: any }).decision;
  const showDecision = Boolean(decision) && ['DRAFTS', 'CARDS', 'SUPER_AGENT_RESULT', 'ORCHESTRATION_RESULT'].includes(output.type);

  return (
    <div className="w-full bg-gray-50 border-t border-gray-200 p-2 overflow-y-auto max-h-[400px] flex flex-col relative animate-in slide-in-from-bottom duration-300">
      <button onClick={onClear} className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 z-10">
        <X size={16} />
      </button>
      {showDecision && (
        <DecisionBlock decision={decision} onSuggestionClick={onSuggestionClick} />
      )}

      {output.type === 'DRAFTS' && (
        <div className="space-y-2">
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {output.drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => onDraftClick(draft)}
                className="flex-shrink-0 bg-white border border-gray-200 rounded-lg p-3 w-48 text-left hover:border-blue-400 hover:shadow-sm transition-all group"
              >
                <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{draft.tone}</div>
                <div className="text-sm text-gray-800 line-clamp-3 leading-relaxed">{draft.text}</div>
              </button>
            ))}
          </div>
          {/* 联想建议 */}
          {output.associatedSuggestions && output.associatedSuggestions.length > 0 && (
            <AssociatedSuggestionsView
              suggestions={output.associatedSuggestions}
              onSuggestionClick={onSuggestionClick}
            />
          )}
        </div>
      )}

      {output.type === 'CLARIFICATION' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <AlertCircle size={14} />
            需要补充信息
          </div>
          <div className="text-sm text-indigo-900 leading-relaxed">{output.prompt}</div>
          {output.missingFields && output.missingFields.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {output.missingFields.map((field) => (
                <span
                  key={field}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 uppercase tracking-wide"
                >
                  {field}
                </span>
              ))}
            </div>
          )}
          {output.contextQuery && (
            <div className="mt-2 text-[11px] text-indigo-500">
              已保留意图：{output.contextQuery.slice(0, 40)}{output.contextQuery.length > 40 ? '…' : ''}
            </div>
          )}
          <div className="mt-2 text-[11px] text-indigo-600">请在下方输入补充信息。</div>
        </div>
      )}

      {output.type === 'CARDS' && (
        <div className="space-y-2">
          <div className="flex gap-3 pb-2 px-1 overflow-x-auto">
            {output.cards.map((card) => (
              <div
                key={card.id}
                onClick={() => onCardClick(card)}
                className="flex-shrink-0 bg-white border border-gray-200 rounded-xl w-64 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {card.imageUrl && (
                  <div className="h-24 w-full bg-gray-200">
                    <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="font-bold text-gray-900 truncate">{card.title}</h4>
                  <p className="text-xs text-gray-500 mb-2 truncate">{card.subtitle}</p>
                  <div className="flex items-center text-blue-600 text-xs font-medium">
                    {card.actionType === 'WEBVIEW' && <ExternalLink size={12} className="mr-1" />}
                    {card.actionType === 'WEBVIEW' ? 'View Details' : 'Open App'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 联想建议 */}
          {output.associatedSuggestions && output.associatedSuggestions.length > 0 && (
            <AssociatedSuggestionsView
              suggestions={output.associatedSuggestions}
              onSuggestionClick={onSuggestionClick}
              compact={true}
            />
          )}
        </div>
      )}

      {output.type === 'PRIVACY' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-yellow-600" size={24} />
            <div>
              <p className="font-medium text-yellow-900">Privacy Warning</p>
              <p className="text-sm text-yellow-700">
                Sensitive info detected ({output.action.flag}). Use masked value?
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">{output.action.maskedValue}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPrivacyAction(output.action, false)}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-sm"
            >
              Deny
            </button>
            <button
              onClick={() => onPrivacyAction(output.action, true)}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {output.type === 'TOOL_RESULT' && (
        <ToolResultCard
          result={output.result}
          summary={output.summary}
          onDismiss={onClear}
          onDraftClick={onDraftClick}
          onSuggestionClick={onSuggestionClick}
          onViewInApp={onViewInApp}
        />
      )}

      {output.type === 'TASK_PROGRESS' && (
        <TaskProgressView
          task={output.task}
          onAction={onTaskAction}
          onClear={onClear}
        />
      )}

      {output.type === 'ORCHESTRATION_RESULT' && (
        <OrchestrationResultView
          plan={output.plan}
          onClear={onClear}
          onSuggestionClick={onSuggestionClick}
        />
      )}

      {output.type === 'SUPER_AGENT_RESULT' && (
        <SuperAgentResultView
          solution={output.globalSolution}
          summary={output.summary}
          recommendation={output.recommendation}
          results={output.results}
          onClear={onClear}
        />
      )}

      {output.type === 'NEXT_BEST_ACTION' && (
        <NextBestActionView
          recommendation={output.recommendation}
          gamma={output.gamma}
          onClear={onClear}
          onActionClick={(action) => {
            console.log('[NextBestAction] Selected:', action);
          }}
        />
      )}

      {output.type === 'ERROR' && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <ShieldAlert size={16} />
          {output.message}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 联想建议组件 - AssociatedSuggestionsView
// =============================================================================
interface AssociatedSuggestionsViewProps {
  suggestions: AssociatedSuggestion[];
  onSuggestionClick?: (suggestion: string) => void;
  compact?: boolean;
}

const AssociatedSuggestionsView: React.FC<AssociatedSuggestionsViewProps> = ({
  suggestions,
  onSuggestionClick,
  compact = false
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'warning':
        return 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800';
      case 'opportunity':
        return 'bg-green-50 hover:bg-green-100 border-green-200 text-green-800';
      case 'reminder':
        return 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800';
      case 'tip':
        return 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'warning':
        return <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">注意</span>;
      case 'opportunity':
        return <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded">机会</span>;
      case 'reminder':
        return <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded">提醒</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-100">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={14} className="text-indigo-500" />
        <span className="text-xs font-medium text-indigo-700">智能联想</span>
        <span className="text-[10px] text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded">AI 发散思维</span>
      </div>
      <div className={compact ? "flex gap-1.5 overflow-x-auto" : "space-y-1.5"}>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`${getCategoryStyle(suggestion.category)} ${compact ? 'flex-shrink-0 min-w-[140px]' : ''
              } flex items-start gap-1.5 p-2 rounded-lg border cursor-pointer transition-all`}
            onClick={() => {
              if (suggestion.actionQuery && onSuggestionClick) {
                onSuggestionClick(suggestion.actionQuery);
              }
            }}
          >
            <span className="text-base flex-shrink-0">{suggestion.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-medium text-xs">{suggestion.title}</span>
                {getCategoryBadge(suggestion.category)}
              </div>
              {!compact && (
                <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1">{suggestion.description}</p>
              )}
              {suggestion.actionText && onSuggestionClick && (
                <button
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 mt-0.5 flex items-center gap-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suggestion.actionQuery) {
                      onSuggestionClick(suggestion.actionQuery);
                    }
                  }}
                >
                  {suggestion.actionText} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Task Progress View Component
interface TaskProgressViewProps {
  task: TaskPlan;
  onAction?: (task: TaskPlan, action: 'confirm' | 'cancel') => void;
  onClear: () => void;
}

const TaskProgressView: React.FC<TaskProgressViewProps> = ({ task, onAction, onClear }) => {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'running':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'waiting_confirmation':
        return <Circle size={16} className="text-yellow-500 fill-yellow-200" />;
      case 'retrying':
        return <Loader2 size={16} className="text-orange-500 animate-spin" />;
      default:
        return <Circle size={16} className="text-gray-300" />;
    }
  };

  const getStepResultSummary = (step: any): string | null => {
    if (step.status !== 'completed' || !step.result?.data) return null;
    const data = step.result.data;
    switch (step.tool) {
      case 'get_weather':
        return `${data.temperature}${data.unit} ${data.condition}`;
      case 'calculator':
        return `= ${data.result}`;
      case 'web_search':
        return `${data.results?.length || 0} 条结果`;
      case 'location':
        return `${data.places?.length || 0} 个地点`;
      case 'notes':
        return data.message;
      default:
        return null;
    }
  };

  // Completed task view with celebration
  if (task.status === 'completed') {
    return (
      <div className="task-completed-wrapper">
        {/* Confetti animation */}
        <div className="confetti-container">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`confetti confetti-${i % 4}`} style={{ left: `${8 + i * 8}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg relative overflow-hidden">
          {/* Success glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

          <div className="flex items-center justify-between mb-3 relative">
            <div className="flex items-center gap-2">
              <div className="success-icon-wrapper">
                <CheckCircle2 size={24} className="text-white animate-bounce" />
              </div>
              <div>
                <span className="font-bold text-lg">🎉 任务完成！</span>
                <div className="text-xs opacity-80">共 {task.steps.length} 个步骤</div>
              </div>
            </div>
            <button onClick={onClear} className="text-white/70 hover:text-white z-10">
              <X size={16} />
            </button>
          </div>

          <div className="text-sm opacity-90 mb-3 font-medium">{task.goal}</div>

          {/* Steps summary pills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {task.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                <CheckCircle2 size={10} />
                <span className="truncate max-w-20">{step.description}</span>
              </div>
            ))}
          </div>

          {task.completedSummary && (
            <div className="bg-white/20 rounded-lg p-3 text-sm backdrop-blur-sm">
              {task.completedSummary}
            </div>
          )}
        </div>

        <style>{`
          .task-completed-wrapper {
            position: relative;
          }
          
          .confetti-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
            z-index: 10;
          }
          
          .confetti {
            position: absolute;
            top: -10px;
            width: 8px;
            height: 8px;
            border-radius: 2px;
            animation: confettiFall 1.5s ease-out forwards;
          }
          
          .confetti-0 { background: #fbbf24; }
          .confetti-1 { background: #f472b6; }
          .confetti-2 { background: #60a5fa; }
          .confetti-3 { background: #34d399; }
          
          @keyframes confettiFall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
          }
          
          .success-icon-wrapper {
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            padding: 6px;
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 mx-2 my-2 text-white shadow-lg ${task.status === 'failed'
      ? 'bg-gradient-to-br from-red-500 to-rose-600'
      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
      }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs opacity-75 uppercase tracking-wider">
            {task.status === 'failed' ? '任务失败' : task.status === 'executing' ? '执行中...' : '任务规划'}
          </div>
          <div className="font-bold">{task.goal}</div>
        </div>
        <button onClick={onClear} className="text-white/70 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Steps Progress with Flow Lines */}
      <div className="task-flow-container mb-3">
        {task.steps.map((step, index) => {
          const resultSummary = getStepResultSummary(step);
          const isActive = step.status === 'running' || step.status === 'retrying';
          const isCompleted = step.status === 'completed';
          const isLast = index === task.steps.length - 1;

          return (
            <div key={step.id} className="task-step-wrapper">
              {/* Step with connecting line */}
              <div className="flex">
                {/* Left side: number + line */}
                <div className="step-connector-area">
                  <div className={`step-number ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {!isLast && (
                    <div className={`step-line ${isCompleted ? 'completed' : 'pending'}`} />
                  )}
                </div>

                {/* Right side: content */}
                <div
                  className={`flex-1 ml-3 p-2 rounded-lg transition-all ${isActive
                    ? 'bg-white/25 ring-1 ring-white/50 scale-[1.02]'
                    : isCompleted
                      ? 'bg-white/10'
                      : 'opacity-60'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {getStepIcon(step.status)}
                    <span className="text-sm truncate flex-1">{step.description}</span>
                    {step.tool && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0">{step.tool}</span>
                    )}
                  </div>
                  {resultSummary && (
                    <div className="text-xs text-white/70 mt-1 ml-5">→ {resultSummary}</div>
                  )}
                  {step.status === 'retrying' && step.retryCount && (
                    <div className="text-xs text-orange-200 mt-1 ml-5">
                      重试中 ({step.retryCount}/{step.maxRetries || 2})
                    </div>
                  )}
                  {step.dependsOn && step.dependsOn.length > 0 && step.status === 'pending' && (
                    <div className="text-xs text-white/50 mt-1 ml-5">
                      等待: {step.dependsOn.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <style>{`
          .task-flow-container {
            position: relative;
          }
          
          .task-step-wrapper {
            margin-bottom: 4px;
          }
          
          .step-connector-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 28px;
            flex-shrink: 0;
          }
          
          .step-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          
          .step-number.completed {
            background: rgba(34, 197, 94, 0.8);
            color: white;
          }
          
          .step-number.active {
            background: rgba(255, 255, 255, 0.9);
            color: #4f46e5;
            animation: stepPulse 1.5s infinite;
          }
          
          .step-number.pending {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.6);
          }
          
          @keyframes stepPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            50% { box-shadow: 0 0 0 6px rgba(255, 255, 255, 0); }
          }
          
          .step-line {
            width: 2px;
            flex: 1;
            min-height: 12px;
            margin: 4px 0;
            transition: background 0.3s ease;
          }
          
          .step-line.completed {
            background: linear-gradient(to bottom, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.4));
          }
          
          .step-line.pending {
            background: rgba(255, 255, 255, 0.2);
          }
        `}</style>
      </div>

      {/* Action Buttons - show for planning or waiting_confirmation */}
      {(task.status === 'planning' || task.status === 'waiting_confirmation') && onAction && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onAction(task, 'cancel')}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
          >
            取消
          </button>
          <button
            onClick={() => onAction(task, 'confirm')}
            className="px-3 py-1 bg-white hover:bg-white/90 text-indigo-600 rounded text-sm font-medium"
          >
            {task.status === 'planning' ? '开始执行' : '继续执行'}
          </button>
        </div>
      )}

      {/* Progress Bar with Animation */}
      <div className="mt-3">
        <div className="h-2 bg-white/20 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${task.status === 'executing'
              ? 'bg-gradient-to-r from-white via-white/80 to-white animate-pulse'
              : 'bg-white'
              }`}
            style={{
              width: `${(task.steps.filter(s => s.status === 'completed').length / task.steps.length) * 100}%`
            }}
          />
          {/* Running indicator dot */}
          {task.status === 'executing' && (
            <div
              className="absolute top-0 h-full w-4 bg-white/50 animate-[shimmer_1.5s_infinite]"
              style={{
                left: `${(task.steps.filter(s => s.status === 'completed').length / task.steps.length) * 100}%`,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs opacity-75 mt-1">
          <span>步骤 {task.steps.filter(s => s.status === 'completed').length} / {task.steps.length}</span>
          {task.status === 'executing' && (
            <span className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              执行中
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Multi-Agent Orchestration Result View
// =============================================================================

interface OrchestrationResultViewProps {
  plan: OrchestrationPlan;
  onClear: () => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const OrchestrationResultView: React.FC<OrchestrationResultViewProps> = ({ plan, onClear, onSuggestionClick }) => {
  const result = plan.consolidatedResult;

  if (!result) {
    return (
      <div className="bg-gray-100 p-4 rounded-xl">
        <Loader2 className="animate-spin mx-auto" />
        <p className="text-center text-sm text-gray-500 mt-2">正在协调多个Agent...</p>
      </div>
    );
  }

  return (
    <div className="orchestration-result-container">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-t-xl p-4 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        <div className="flex items-center justify-between relative">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              ✨ {result.summary}
            </h3>
            {result.totalEstimatedCost && (
              <p className="text-sm opacity-80 mt-1">
                💰 预估总费用: ¥{result.totalEstimatedCost.toLocaleString()}
              </p>
            )}
          </div>
          <button onClick={onClear} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="mt-3 space-y-1">
            {result.recommendations.map((rec, i) => (
              <p key={i} className="text-xs opacity-90">{rec}</p>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="bg-gray-50 rounded-b-xl divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
        {result.sections.map((section, idx) => (
          <OrchestrationSectionView
            key={idx}
            section={section}
            onOptionClick={(option) => {
              console.log('Option selected:', section.agentType, option);
              // Could trigger a more detailed view or action
            }}
          />
        ))}
      </div>

      <style>{`
        .orchestration-result-container {
          margin: 8px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

// Single section component (flights, hotels, etc.)
const OrchestrationSectionView: React.FC<{
  section: OrchestrationSection;
  onOptionClick: (option: any) => void;
}> = ({ section, onOptionClick }) => {
  const [expanded, setExpanded] = React.useState(section.agentType === 'flight_booking'); // First section expanded by default

  return (
    <div className="section-wrapper">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{section.icon}</span>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">{section.title}</h4>
            <p className="text-xs text-gray-500">{section.options.length} 个推荐</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            个性化
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Section Content */}
      {expanded && (
        <div className="px-3 pb-3">
          {/* Personalized note */}
          <p className="text-xs text-purple-600 bg-purple-50 p-2 rounded-lg mb-2">
            💡 {section.personalizedNote}
          </p>

          {/* Options */}
          <div className="space-y-2">
            {section.options.slice(0, 3).map((option, i) => (
              <OptionCard
                key={i}
                option={option}
                agentType={section.agentType}
                onClick={() => onOptionClick(option)}
              />
            ))}
          </div>

          {section.options.length > 3 && (
            <button className="w-full text-center text-sm text-purple-600 mt-2 py-1 hover:bg-purple-50 rounded">
              查看更多 ({section.options.length - 3} 个)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Option card component with different layouts based on agent type
const OptionCard: React.FC<{
  option: any;
  agentType: string;
  onClick: () => void;
}> = ({ option, agentType, onClick }) => {
  // Flight card
  if (agentType === 'flight_booking') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✈️</div>
            <div>
              <div className="font-medium">{option.airline}</div>
              <div className="text-xs text-gray-500">{option.flightNo} · {option.aircraft}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-purple-600">¥{option.price?.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{option.class === 'economy' ? '经济舱' : '商务舱'}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-sm">
          <span>{option.departure} 出发</span>
          <span className="text-gray-400">⟶</span>
          <span>{option.arrival} 到达</span>
          <span className="text-xs text-gray-500">{option.duration}</span>
        </div>
        {option.matchScore > 90 && (
          <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
            ⭐ 高度匹配您的偏好
          </div>
        )}
      </div>
    );
  }

  // Hotel card
  if (agentType === 'hotel_booking') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{option.name}</div>
            <div className="text-xs text-gray-500">
              {'⭐'.repeat(option.star)} · {option.location}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-purple-600">¥{option.pricePerNight?.toLocaleString()}</div>
            <div className="text-xs text-gray-500">每晚</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {option.amenities?.slice(0, 3).map((a: string, i: number) => (
            <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a}</span>
          ))}
        </div>
      </div>
    );
  }

  // Restaurant card
  if (agentType === 'restaurant') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{option.name}</div>
            <div className="text-xs text-gray-500">{option.type}</div>
          </div>
          <div className="text-xs text-gray-600">{option.priceRange}</div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{option.highlight}</p>
      </div>
    );
  }

  // Attraction card
  if (agentType === 'attraction') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{option.name}</div>
            <div className="text-xs text-gray-500">{option.type} · {option.recommendTime}</div>
          </div>
          {option.style === 'offbeat' && (
            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">小众</span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">{option.description}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {option.highlights?.map((h: string, i: number) => (
            <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{h}</span>
          ))}
        </div>
      </div>
    );
  }

  // Generic card for other types
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="font-medium">{option.name || option.title || JSON.stringify(option).slice(0, 50)}</div>
    </div>
  );
};

// =============================================================================
// Super Agent Result View - Global Solution Display
// =============================================================================

interface SuperAgentResultViewProps {
  solution: SuperAgentSolution;
  summary: string;
  recommendation: string;
  results: any[];
  onClear: () => void;
}

const SuperAgentResultView: React.FC<SuperAgentResultViewProps> = ({
  solution,
  summary,
  recommendation,
  results,
  onClear
}) => {
  const initialSection = React.useMemo(() => {
    const flightSection = results.find(r => r.agentType === 'flight_booking');
    return flightSection ? 'flight_booking' : results[0]?.agentType ?? null;
  }, [results]);
  const [expandedSection, setExpandedSection] = React.useState<string | null>(initialSection);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    setExpandedSection(initialSection);
  }, [initialSection]);

  // Group results by agent type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, any> = {};
    results.forEach(r => {
      groups[r.agentType] = r.result;
    });
    return groups;
  }, [results]);

  const timeline = React.useMemo(() => buildTravelTimeline(groupedResults), [groupedResults]);

  const containerClassName = isExpanded
    ? 'super-agent-result-container super-agent-result-expanded'
    : 'super-agent-result-container';

  // Get agent type icon
  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'flight_booking': return '✈️';
      case 'hotel_booking': return '🏨';
      case 'weather': return '🌤️';
      case 'attraction': return '🎯';
      case 'restaurant': return '🍽️';
      case 'itinerary': return '📅';
      case 'translation': return '🌐';
      case 'transportation': return '🚖';
      default: return '📋';
    }
  };

  // Get agent type label
  const getAgentLabel = (type: string) => {
    switch (type) {
      case 'flight_booking': return '航班搜索';
      case 'hotel_booking': return '酒店推荐';
      case 'weather': return '天气预报';
      case 'attraction': return '景点推荐';
      case 'restaurant': return '餐厅推荐';
      case 'itinerary': return '行程安排';
      case 'translation': return '翻译服务';
      case 'transportation': return '接送机与交通';
      default: return type;
    }
  };

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div className={containerClassName}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-t-xl p-4 text-white relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">🧠 Super Agent 智能规划</h3>
                <p className="text-sm opacity-80">
                  已完成 {results.length} 项搜索 · 优化评分: {solution.optimizationScore}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 z-10">
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-white/70 hover:text-white"
                title={isExpanded ? '收起' : '展开'}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button onClick={onClear} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="mt-3 text-sm opacity-90 whitespace-pre-line">
              {summary}
            </div>
          )}

          {/* Execution time */}
          <div className="mt-2 text-xs opacity-60">
            ⏱️ 耗时 {(solution.executionTime / 1000).toFixed(1)} 秒
          </div>
        </div>

        {timeline.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-lg">🕒</span>
              行程时间轴
            </div>
            <div className="space-y-2">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2" />
                    {idx < timeline.length - 1 && <span className="w-px h-full bg-indigo-200" />}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{item.time}</div>
                    <div className="font-medium">{item.title}</div>
                    {item.detail && <div className="text-xs text-gray-500">{item.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="bg-white border-b border-gray-200 px-3 py-2 flex gap-2 overflow-x-auto">
            {results.map((result) => (
              <button
                key={result.agentType}
                onClick={() => setExpandedSection(result.agentType)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${expandedSection === result.agentType
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <span className="mr-1">{getAgentIcon(result.agentType)}</span>
                {getAgentLabel(result.agentType)}
              </button>
            ))}
          </div>
        )}

        {/* Results sections */}
        <div className={`bg-gray-50 rounded-b-xl divide-y divide-gray-200 ${isExpanded ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
          {(isExpanded
            ? results.filter(result => result.agentType === expandedSection)
            : results
          ).map((result, idx) => (
            <SuperAgentSection
              key={idx}
              agentType={result.agentType}
              data={result.result}
              icon={getAgentIcon(result.agentType)}
              label={getAgentLabel(result.agentType)}
              isExpanded={expandedSection === result.agentType}
              onToggle={() => setExpandedSection(
                expandedSection === result.agentType ? null : result.agentType
              )}
            />
          ))}
        </div>

        {/* 💡 联想建议 - 发散性思维 */}
        {solution.associatedSuggestions && solution.associatedSuggestions.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 border-t border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <span className="text-sm font-medium text-amber-800">智能联想</span>
              <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">AI 发散思维</span>
            </div>
            <div className="space-y-2">
              {solution.associatedSuggestions.map((suggestion: any) => (
                <div
                  key={suggestion.id}
                  className={`flex items-start gap-2 p-2 rounded-lg transition-all cursor-pointer hover:shadow-sm ${suggestion.category === 'warning'
                    ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                    : suggestion.category === 'opportunity'
                      ? 'bg-green-50 hover:bg-green-100 border border-green-200'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  <span className="text-xl flex-shrink-0">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{suggestion.title}</span>
                      {suggestion.category === 'warning' && (
                        <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">注意</span>
                      )}
                      {suggestion.category === 'opportunity' && (
                        <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">机会</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{suggestion.description}</p>
                    {suggestion.actionText && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (suggestion.actionQuery) {
                            // Could trigger a new search with the actionQuery
                            console.log('Action query:', suggestion.actionQuery);
                          }
                        }}
                      >
                        {suggestion.actionText} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation footer */}
        {recommendation && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-b-xl border-t border-green-200">
            <div className="text-sm text-green-800 whitespace-pre-line">
              {recommendation}
            </div>
          </div>
        )}

        <style>{`
        .super-agent-result-container {
          margin: 8px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .super-agent-result-expanded {
          position: fixed;
          inset: 24px;
          margin: 0;
          z-index: 50;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          overflow: auto;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
      </div>
    </>
  );
};

type TimelineItem = { time: string; title: string; detail?: string };

const buildTravelTimeline = (groupedResults: Record<string, any>): TimelineItem[] => {
  const timeline: TimelineItem[] = [];
  const flight = groupedResults.flight_booking;
  const transport = groupedResults.transportation;
  const hotel = groupedResults.hotel_booking;
  const weather = groupedResults.weather;
  const restaurants = groupedResults.restaurant?.restaurants || [];
  const attractions = groupedResults.attraction?.attractions || [];

  if (transport?.recommendedLeaveTime) {
    timeline.push({
      time: transport.recommendedLeaveTime,
      title: '出发前往机场',
      detail: transport.toAirport?.[0]?.mode ? `推荐：${transport.toAirport[0].mode}` : undefined
    });
  }

  if (flight?.bestOption?.departure) {
    timeline.push({
      time: flight.bestOption.departure,
      title: `航班起飞 · ${flight.origin || ''} → ${flight.destination || ''}`.trim(),
      detail: flight.bestOption.airline ? `${flight.bestOption.airline} ${flight.bestOption.flightNo || ''}`.trim() : undefined
    });
  }

  if (flight?.bestOption?.arrival) {
    timeline.push({
      time: flight.bestOption.arrival,
      title: `抵达 ${flight.destination || ''}`.trim(),
      detail: transport?.fromAirport?.[0]?.mode ? `接驳：${transport.fromAirport[0].mode}` : undefined
    });
  }

  if (hotel?.hotels?.[0]) {
    timeline.push({
      time: '当日',
      title: `入住 ${hotel.hotels[0].name}`,
      detail: hotel.hotels[0].location || hotel.hotels[0].area
    });
  }

  if (weather?.forecast?.[0]) {
    const weatherDay = weather.forecast[0];
    timeline.push({
      time: weatherDay.day || '天气',
      title: `天气 ${weatherDay.condition || ''} ${weatherDay.temp || weatherDay.temperature || ''}`.trim()
    });
  }

  if (attractions[0]) {
    timeline.push({
      time: '白天',
      title: `推荐景点：${attractions[0].name}`,
      detail: attractions[0].recommendTime || attractions[0].type
    });
  }

  if (restaurants[0]) {
    timeline.push({
      time: '晚餐',
      title: `推荐餐厅：${restaurants[0].name}`,
      detail: restaurants[0].type || restaurants[0].cuisine
    });
  }

  return timeline;
};

// Super Agent section component
interface SuperAgentSectionProps {
  agentType: string;
  data: any;
  icon: string;
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const SuperAgentSection: React.FC<SuperAgentSectionProps> = ({
  agentType,
  data,
  icon,
  label,
  isExpanded,
  onToggle
}) => {
  if (!data) return null;

  const getItemCount = () => {
    switch (agentType) {
      case 'flight_booking':
        return data.flights?.length || data.options?.length || 0;
      case 'hotel_booking':
        return data.hotels?.length || 0;
      case 'weather':
        return data.forecast?.length || 1;
      case 'attraction':
        return data.attractions?.length || 0;
      case 'restaurant':
        return data.restaurants?.length || 0;
      case 'transportation':
        return data.toAirport?.length || data.fromAirport?.length || data.options?.length || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="section-wrapper">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">{label}</h4>
            <p className="text-xs text-gray-500">{getItemCount()} 个结果</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.lowestPrice && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <DollarSign size={10} />
              最低 ${data.lowestPrice.price}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {agentType === 'flight_booking' && <FlightResults data={data} />}
          {agentType === 'hotel_booking' && <HotelResults data={data} />}
          {agentType === 'weather' && <WeatherResults data={data} />}
          {agentType === 'attraction' && <AttractionResults data={data} />}
          {agentType === 'restaurant' && <RestaurantResults data={data} />}
          {agentType === 'itinerary' && <ItineraryResults data={data} />}
          {agentType === 'transportation' && <TransportationResults data={data} />}
        </div>
      )}
    </div>
  );
};

// Flight results component
const FlightResults: React.FC<{ data: any }> = ({ data }) => {
  const flights = data.flights || data.options || [];
  const lowestPrice = data.lowestPrice;
  const priceComparisonLinks = data.priceComparisonLinks;
  const comparisonSummary = data.comparisonSummary;
  const bestOption = data.bestOption || flights[0];
  const realtimeStatus = data.realtimeStatus;
  const [showExternal, setShowExternal] = React.useState(false);
  const preferenceWeights = comparisonSummary?.preferenceWeights;
  const chronotype = comparisonSummary?.chronotype;
  const fetchedAtLabel = realtimeStatus?.fetched_at
    ? new Date(realtimeStatus.fetched_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : null;

  // Handle opening booking URL
  const handleBookingClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2">
      {/* Agent comparison summary */}
      {bestOption && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-blue-700 font-medium">🤖 Agent 比价结果</div>
            {data.dataSource && (
              <span className="text-[10px] text-blue-500 bg-white/80 px-2 py-0.5 rounded">
                {data.dataSource}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-blue-900">
            推荐: {bestOption.airline} · {bestOption.price ? `$${bestOption.price}` : '价格待确认'}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
            <span className={`px-2 py-0.5 rounded-full ${realtimeStatus?.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {realtimeStatus?.verified ? '实时已验证' : '实时未验证'}
            </span>
            {fetchedAtLabel && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                抓取时间 {fetchedAtLabel}
              </span>
            )}
            {typeof realtimeStatus?.ttl_seconds === 'number' && realtimeStatus.ttl_seconds > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                TTL {realtimeStatus.ttl_seconds}s
              </span>
            )}
          </div>
          {data.searchError && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              SerpApi 请求失败：{data.searchError}
              <div className="mt-1 text-[10px] text-amber-600">
                可能原因：日期超出可查范围 / 目的地不识别 / API Key 无权限或额度不足
              </div>
            </div>
          )}
          {data.error && !data.searchError && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              航班搜索提示：{data.error}
            </div>
          )}
          {bestOption.matchReasons && bestOption.matchReasons.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {bestOption.matchReasons.slice(0, 3).map((reason: string, idx: number) => (
                <span key={idx} className="text-[10px] bg-white text-blue-600 px-2 py-0.5 rounded-full">
                  {reason}
                </span>
              ))}
            </div>
          )}
          {comparisonSummary && (
            <div className="mt-2 text-xs text-blue-700">
              均价 ${comparisonSummary.averagePrice || '--'} · 直飞 {comparisonSummary.directCount || 0} 条 · 共 {comparisonSummary.totalOptions || flights.length} 个方案
            </div>
          )}
          {(data.origin || data.destination) && (
            <div className="mt-1 text-[11px] text-blue-600">
              航线：{data.origin || '出发地待补充'} → {data.destination || '目的地待补充'} {data.departureDate ? `· ${data.departureDate}` : ''}
            </div>
          )}
          {chronotype && chronotype !== 'flexible' && (
            <div className="mt-1 text-[11px] text-blue-600">
              时间偏好：{chronotype === 'morning_person' ? '早出发' : '晚出发'}
            </div>
          )}
        </div>
      )}

      {preferenceWeights && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-2">偏好权重</div>
          <WeightRow label="价格" value={preferenceWeights.price} color="bg-emerald-400" />
          <WeightRow label="时长" value={preferenceWeights.duration} color="bg-blue-400" />
          <WeightRow label="中转" value={preferenceWeights.stops} color="bg-purple-400" />
          <WeightRow label="时间" value={preferenceWeights.time} color="bg-amber-400" />
        </div>
      )}

      {/* Lowest price highlight */}
      {lowestPrice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">最低价</div>
              <span className="font-medium">{lowestPrice.airline || lowestPrice.source}</span>
            </div>
            <div className="text-xl font-bold text-green-600">${lowestPrice.price}</div>
          </div>
          {lowestPrice.departure && (
            <div className="text-sm text-gray-600 mt-1">
              {lowestPrice.departure} → {lowestPrice.arrival}
            </div>
          )}
        </div>
      )}

      {/* Flight list */}
      {flights.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-3 text-xs text-gray-500">
          暂未获取到航班详情，请补充出发地/日期或检查 SerpApi 配置。
        </div>
      )}
      {flights.slice(0, 5).map((flight: any, idx: number) => (
        <div
          key={idx}
          onClick={(e) => showExternal && flight.bookingUrl && handleBookingClick(flight.bookingUrl, e)}
          className={`bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all ${showExternal && flight.bookingUrl ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plane size={20} className="text-blue-500" />
              <div>
                <div className="font-medium">{flight.airline || flight.name}</div>
                <div className="text-xs text-gray-500">
                  {flight.flightNo && `${flight.flightNo} · `}
                  {flight.aircraft || flight.type || ''}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-blue-600">
                {flight.price ? `$${flight.price}` : flight.priceRange}
              </div>
              <div className="text-xs text-gray-500">{flight.class || '经济舱'}</div>
            </div>
          </div>
          {flight.departure && (
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
              <span>{flight.departure}</span>
              <span className="text-gray-400">✈️</span>
              <span>{flight.arrival}</span>
              {flight.duration && <span className="text-xs text-gray-400">{flight.duration}</span>}
            </div>
          )}
          {Number.isFinite(flight.matchScore) && (
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
              匹配度 {flight.matchScore}%
            </div>
          )}
          {flight.matchBreakdown && (
            <div className="mt-1 text-[10px] text-gray-500">
              价格 {Math.round(flight.matchBreakdown.priceScore)} · 时长 {Math.round(flight.matchBreakdown.durationScore)} · 中转 {Math.round(flight.matchBreakdown.stopScore)} · 时间 {Math.round(flight.matchBreakdown.timeScore)}
            </div>
          )}
          {/* Booking link */}
          <div className="flex items-center justify-between mt-2">
            {flight.source && (
              <span className="text-xs text-gray-400">来源: {flight.source}</span>
            )}
            {showExternal && flight.bookingUrl && (
              <a
                href={flight.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ExternalLink size={12} />
                查看详情
              </a>
            )}
          </div>
        </div>
      ))}

      {priceComparisonLinks && (
        <button
          onClick={() => setShowExternal(!showExternal)}
          className="w-full text-xs text-blue-600 hover:text-blue-800 py-1"
        >
          {showExternal ? '隐藏外部平台' : '查看外部比价平台'}
        </button>
      )}

      {priceComparisonLinks && showExternal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="text-xs text-blue-700 mb-2 font-medium">🔍 外部比价平台</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(priceComparisonLinks).map(([key, link]: [string, any]) => (
              <a
                key={key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                {link.icon} {link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WeightRow: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const percent = Math.max(0, Math.min(100, Math.round((value || 0) * 100)));
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-600">
      <span className="w-10">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="w-8 text-right">{percent}%</span>
    </div>
  );
};

// Hotel results component
const HotelResults: React.FC<{ data: any }> = ({ data }) => {
  const hotels = data.hotels || [];

  return (
    <div className="space-y-2">
      {hotels.slice(0, 5).map((hotel: any, idx: number) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{hotel.name}</div>
              <div className="text-xs text-gray-500">
                {'⭐'.repeat(hotel.rating || hotel.star || 3)} · {hotel.location || hotel.area}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-purple-600">
                {hotel.pricePerNight ? `¥${hotel.pricePerNight}` : hotel.priceRange}
              </div>
              <div className="text-xs text-gray-500">每晚</div>
            </div>
          </div>
          {Number.isFinite(hotel.matchScore) && (
            <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded inline-block">
              匹配度 {hotel.matchScore}%
            </div>
          )}
          {hotel.amenities && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {hotel.amenities.slice(0, 4).map((a: string, i: number) => (
                <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a}</span>
              ))}
            </div>
          )}
          {hotel.matchReasons && hotel.matchReasons.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {hotel.matchReasons.slice(0, 2).map((reason: string, i: number) => (
                <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Weather results component
const WeatherResults: React.FC<{ data: any }> = ({ data }) => {
  const forecast = data.forecast || [data];

  return (
    <div className="space-y-2">
      {forecast.slice(0, 5).map((day: any, idx: number) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">{day.icon || '☀️'}</div>
            <div>
              <div className="font-medium">{day.date || '今天'}</div>
              <div className="text-sm text-gray-600">{day.condition}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{day.temp || day.temperature}</div>
            {day.humidity && <div className="text-xs text-gray-500">湿度 {day.humidity}</div>}
          </div>
        </div>
      ))}
      {data.travelAdvice && (
        <div className="bg-blue-50 rounded-lg p-2 text-sm text-blue-700">
          💡 {data.travelAdvice}
        </div>
      )}
    </div>
  );
};

// Attraction results component
const AttractionResults: React.FC<{ data: any }> = ({ data }) => {
  const attractions = data.attractions || [];

  return (
    <div className="space-y-2">
      {attractions.slice(0, 5).map((attraction: any, idx: number) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-3 border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{attraction.name}</div>
              <div className="text-xs text-gray-500">
                {attraction.type} {attraction.recommendTime && `· ${attraction.recommendTime}`}
              </div>
            </div>
            {attraction.rating && (
              <div className="text-sm text-orange-600">
                ⭐ {attraction.rating}
              </div>
            )}
          </div>
          {Number.isFinite(attraction.matchScore) && (
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
              匹配度 {attraction.matchScore}%
            </div>
          )}
          {attraction.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{attraction.description}</p>
          )}
          {attraction.highlights && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {attraction.highlights.slice(0, 3).map((h: string, i: number) => (
                <span key={i} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">{h}</span>
              ))}
            </div>
          )}
          {attraction.matchReasons && attraction.matchReasons.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {attraction.matchReasons.slice(0, 2).map((reason: string, i: number) => (
                <span key={i} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Restaurant results component
const RestaurantResults: React.FC<{ data: any }> = ({ data }) => {
  const restaurants = data.restaurants || [];

  return (
    <div className="space-y-2">
      {restaurants.slice(0, 5).map((restaurant: any, idx: number) => {
        const signatureList = Array.isArray(restaurant.signature) ? restaurant.signature : restaurant.signature ? [restaurant.signature] : [];
        const menuList = Array.isArray(restaurant.menu) ? restaurant.menu : restaurant.menu ? [restaurant.menu] : [];
        const reviewList = Array.isArray(restaurant.reviewHighlights) ? restaurant.reviewHighlights : restaurant.reviewHighlights ? [restaurant.reviewHighlights] : [];

        return (
          <div
            key={idx}
            className="bg-white rounded-lg p-3 border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center text-xl">
                {restaurant.photos?.[0]
                  ? <img src={restaurant.photos[0]} alt={restaurant.name} className="w-full h-full object-cover" />
                  : '🍽️'}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{restaurant.name}</div>
                    <div className="text-xs text-gray-500">{restaurant.type || restaurant.cuisine}</div>
                  </div>
                  <div className="text-xs text-gray-600">{restaurant.priceRange}</div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  {Number.isFinite(restaurant.rating) && <span>⭐ {restaurant.rating}</span>}
                  {restaurant.reviewCount && <span>{restaurant.reviewCount}评</span>}
                </div>
                {signatureList.length > 0 && (
                  <div className="mt-1 text-xs text-gray-600">
                    招牌：{signatureList.slice(0, 2).join(' · ')}
                  </div>
                )}
              </div>
            </div>
            {Number.isFinite(restaurant.matchScore) && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                匹配度 {restaurant.matchScore}%
              </div>
            )}
            {menuList.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                菜单：{menuList.slice(0, 2).map((item: any) => item.name || item).join(' · ')}
              </div>
            )}
            {reviewList.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                {reviewList[0].text || reviewList[0]}
              </div>
            )}
            {restaurant.matchReasons && restaurant.matchReasons.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {restaurant.matchReasons.slice(0, 2).map((reason: string, i: number) => (
                  <span key={i} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Transportation results component
const TransportationResults: React.FC<{ data: any }> = ({ data }) => {
  const toAirport = data.toAirport || [];
  const fromAirport = data.fromAirport || [];

  return (
    <div className="space-y-2">
      {data.recommendedLeaveTime && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-sm text-indigo-700">
          🚖 {data.recommendedLeaveTime}
        </div>
      )}

      {toAirport.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-2">前往机场</div>
          <div className="space-y-1.5">
            {toAirport.map((option: any, idx: number) => (
              <div key={idx} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>{option.mode}</span>
                  <span className="text-gray-500">{option.duration} · {option.cost}</span>
                </div>
                {Number.isFinite(option.matchScore) && (
                  <div className="mt-1 text-[10px] text-indigo-600">匹配度 {option.matchScore}%</div>
                )}
                {option.matchReasons && option.matchReasons.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {option.matchReasons.slice(0, 2).map((reason: string, i: number) => (
                      <span key={i} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {fromAirport.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-2">到达后交通</div>
          <div className="space-y-1.5">
            {fromAirport.map((option: any, idx: number) => (
              <div key={idx} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>{option.mode}</span>
                  <span className="text-gray-500">{option.duration} · {option.cost}</span>
                </div>
                {Number.isFinite(option.matchScore) && (
                  <div className="mt-1 text-[10px] text-indigo-600">匹配度 {option.matchScore}%</div>
                )}
                {option.matchReasons && option.matchReasons.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {option.matchReasons.slice(0, 2).map((reason: string, i: number) => (
                      <span key={i} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.tips && data.tips.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600">
          {data.tips.map((tip: string, idx: number) => (
            <div key={idx}>• {tip}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// Itinerary results component
const ItineraryResults: React.FC<{ data: any }> = ({ data }) => {
  const days = data.days || data.schedule || [];

  return (
    <div className="space-y-2">
      {Array.isArray(days) ? days.slice(0, 5).map((day: any, idx: number) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-3 border border-gray-200"
        >
          <div className="font-medium text-indigo-600">{day.date || `第 ${idx + 1} 天`}</div>
          {day.activities && (
            <div className="mt-2 space-y-1">
              {day.activities.map((activity: any, i: number) => (
                <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-gray-400">{activity.time || '•'}</span>
                  <span>{activity.name || activity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )) : (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Next Best Action View - Bellman Optimizer Result (Optimized for Readability)
// =============================================================================

interface NextBestActionViewProps {
  recommendation: LifeActionRecommendation;
  gamma: number;
  onClear: () => void;
  onActionClick?: (action: any) => void;
}

const NextBestActionView: React.FC<NextBestActionViewProps> = ({
  recommendation,
  gamma,
  onClear,
  onActionClick
}) => {
  const [showAlternatives, setShowAlternatives] = React.useState(false);

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'health': return '💪';
      case 'career': return '💼';
      case 'finance': return '💰';
      case 'social': return '👥';
      case 'learning': return '📚';
      case 'immediate': return '⚡';
      default: return '🎯';
    }
  };

  const getTimeHorizonLabel = (timeHorizon: string) => {
    switch (timeHorizon) {
      case 'immediate': return '立即可做';
      case 'short': return '今天';
      case 'medium': return '本周';
      case 'long': return '长期规划';
      default: return '';
    }
  };

  const getGammaLabel = (g: number) => {
    if (g < 0.4) return '关注当下';
    if (g < 0.6) return '均衡型';
    if (g < 0.8) return '未来导向';
    return '远见型';
  };

  return (
    <div className="next-best-action-v2">
      {/* Header - Large and Clear */}
      <div className="nba-header">
        <div className="nba-header-content">
          <div className="nba-icon-large">
            <Compass size={28} />
          </div>
          <div className="nba-title-area">
            <div className="nba-subtitle">
              <Brain size={14} />
              <span>下一步最优行动</span>
            </div>
            <h2 className="nba-main-title">
              {getDomainIcon(recommendation.action.domain)} {recommendation.action.name}
            </h2>
          </div>
          <button onClick={onClear} className="nba-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Confidence Bar */}
        <div className="nba-confidence">
          <div className="nba-confidence-label">
            <span>置信度</span>
            <span className="nba-confidence-value">{recommendation.confidence}%</span>
          </div>
          <div className="nba-confidence-bar">
            <div
              className="nba-confidence-fill"
              style={{ width: `${recommendation.confidence}%` }}
            />
          </div>
        </div>

        {/* Gamma Badge */}
        <div className="nba-gamma-badge">
          γ = {gamma.toFixed(2)} · {getGammaLabel(gamma)}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="nba-content">
        {/* Action Description - Large and Clear */}
        <div className="nba-description-section">
          <p className="nba-description">{recommendation.action.description}</p>
          <div className="nba-tags">
            <span className="nba-tag nba-tag-time">
              ⏱️ {getTimeHorizonLabel(recommendation.action.timeHorizon)}
            </span>
          </div>
        </div>

        {/* Expected Outcome */}
        <div className="nba-outcome-section">
          <div className="nba-section-title">
            <Zap size={18} className="text-amber-500" />
            <span>预期效果</span>
          </div>
          <p className="nba-outcome-text">{recommendation.expectedOutcome}</p>
        </div>

        {/* Why Recommend - Clear Reasoning */}
        <div className="nba-reasoning-section">
          <div className="nba-section-title">
            <Brain size={18} className="text-indigo-500" />
            <span>为什么推荐</span>
          </div>
          <p className="nba-reasoning-text">{recommendation.reasoning}</p>
        </div>

        {/* Alternatives - Collapsible */}
        {recommendation.alternatives.length > 0 && (
          <div className="nba-alternatives-section">
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="nba-alternatives-toggle"
            >
              <ArrowRight
                size={16}
                className={`transition-transform ${showAlternatives ? 'rotate-90' : ''}`}
              />
              <span>备选方案 ({recommendation.alternatives.length})</span>
            </button>

            {showAlternatives && (
              <div className="nba-alternatives-list">
                {recommendation.alternatives.map((alt, i) => (
                  <div
                    key={i}
                    className="nba-alternative-item"
                    onClick={() => onActionClick?.(alt.action)}
                  >
                    <div className="nba-alt-info">
                      <span className="nba-alt-name">{alt.action.name}</span>
                      <span className="nba-alt-tradeoff">{alt.tradeoff}</span>
                    </div>
                    <span className="nba-alt-score">Q={alt.qValue.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Anxiety Relief - Warm and Supportive */}
        <div className="nba-relief-section">
          <div className="nba-relief-icon">
            <Heart size={20} />
          </div>
          <p className="nba-relief-text">{recommendation.anxietyRelief}</p>
        </div>
      </div>

      <style>{`
        .next-best-action-v2 {
          margin: 8px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          background: white;
          max-height: 350px;
          display: flex;
          flex-direction: column;
        }
        
        /* Header Styles */
        .nba-header {
          background: linear-gradient(135deg, #10b981 0%, #0ea5e9 50%, #8b5cf6 100%);
          padding: 16px;
          color: white;
          flex-shrink: 0;
        }
        
        .nba-header-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .nba-icon-large {
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 10px;
          flex-shrink: 0;
        }
        
        .nba-title-area {
          flex: 1;
          min-width: 0;
        }
        
        .nba-subtitle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .nba-main-title {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
          margin: 0;
        }
        
        .nba-close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 8px;
          padding: 6px;
          color: white;
          cursor: pointer;
          flex-shrink: 0;
        }
        
        .nba-close-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        
        /* Confidence Bar */
        .nba-confidence {
          margin-top: 14px;
        }
        
        .nba-confidence-label {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 6px;
        }
        
        .nba-confidence-value {
          font-weight: 600;
        }
        
        .nba-confidence-bar {
          height: 8px;
          background: rgba(255,255,255,0.25);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .nba-confidence-fill {
          height: 100%;
          background: white;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        /* Gamma Badge */
        .nba-gamma-badge {
          margin-top: 10px;
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }
        
        /* Content Styles */
        .nba-content {
          padding: 0;
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        
        .nba-description-section {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .nba-description {
          font-size: 16px;
          line-height: 1.6;
          color: #1f2937;
          margin: 0 0 12px 0;
        }
        
        .nba-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .nba-tag {
          font-size: 13px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        
        .nba-tag-time {
          background: #ecfdf5;
          color: #059669;
        }
        
        /* Section Styles */
        .nba-outcome-section,
        .nba-reasoning-section {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .nba-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .nba-outcome-text,
        .nba-reasoning-text {
          font-size: 15px;
          line-height: 1.5;
          color: #374151;
          margin: 0;
        }
        
        /* Alternatives */
        .nba-alternatives-section {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .nba-alternatives-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
        }
        
        .nba-alternatives-toggle:hover {
          color: #374151;
        }
        
        .nba-alternatives-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .nba-alternative-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #f9fafb;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .nba-alternative-item:hover {
          background: #f3f4f6;
        }
        
        .nba-alt-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .nba-alt-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .nba-alt-tradeoff {
          font-size: 12px;
          color: #9ca3af;
        }
        
        .nba-alt-score {
          font-size: 12px;
          color: #9ca3af;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 10px;
        }
        
        /* Anxiety Relief */
        .nba-relief-section {
          padding: 16px;
          background: linear-gradient(135deg, #fef2f2 0%, #fce7f3 100%);
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        
        .nba-relief-icon {
          background: white;
          border-radius: 50%;
          padding: 8px;
          color: #f43f5e;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(244, 63, 94, 0.2);
        }
        
        .nba-relief-text {
          font-size: 15px;
          line-height: 1.6;
          color: #9f1239;
          margin: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
