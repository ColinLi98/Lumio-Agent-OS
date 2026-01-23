import React from 'react';
import { AgentOutput, ServiceCard, TextDraft, PrivacyAction, TaskPlan, OrchestrationPlan, OrchestrationSection, SuperAgentSolution } from '../types';
import { ExternalLink, Copy, ShieldAlert, X, CheckCircle2, Circle, Loader2, AlertCircle, Sparkles, Plane, DollarSign } from 'lucide-react';
import { ToolResultCard } from './ToolResultCard';

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

  return (
    <div className="w-full bg-gray-50 border-t border-gray-200 p-2 overflow-y-auto max-h-[400px] flex flex-col relative animate-in slide-in-from-bottom duration-300">
      <button onClick={onClear} className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 z-10">
        <X size={16} />
      </button>

      {output.type === 'DRAFTS' && (
        <div className="flex gap-2 pb-2">
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
      )}

      {output.type === 'CARDS' && (
        <div className="flex gap-3 pb-2 px-1">
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

      {output.type === 'ERROR' && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <ShieldAlert size={16} />
          {output.message}
        </div>
      )}
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
  const [expandedSection, setExpandedSection] = React.useState<string | null>('flight_booking');

  // Group results by agent type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, any> = {};
    results.forEach(r => {
      groups[r.agentType] = r.result;
    });
    return groups;
  }, [results]);

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
      default: return type;
    }
  };

  return (
    <div className="super-agent-result-container">
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
          <button onClick={onClear} className="text-white/70 hover:text-white z-10">
            <X size={20} />
          </button>
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

      {/* Results sections */}
      <div className="bg-gray-50 rounded-b-xl divide-y divide-gray-200 max-h-[350px] overflow-y-auto">
        {results.map((result, idx) => (
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
        </div>
      )}
    </div>
  );
};

// Flight results component
const FlightResults: React.FC<{ data: any }> = ({ data }) => {
  const flights = data.flights || data.options || [];
  const lowestPrice = data.lowestPrice;

  return (
    <div className="space-y-2">
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
      {flights.slice(0, 5).map((flight: any, idx: number) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
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
          {flight.source && (
            <div className="text-xs text-gray-400 mt-1">来源: {flight.source}</div>
          )}
        </div>
      ))}
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
          {hotel.amenities && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {hotel.amenities.slice(0, 4).map((a: string, i: number) => (
                <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{a}</span>
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
      {restaurants.slice(0, 5).map((restaurant: any, idx: number) => (
        <div
          key={idx}
          className="bg-white rounded-lg p-3 border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{restaurant.name}</div>
              <div className="text-xs text-gray-500">{restaurant.type || restaurant.cuisine}</div>
            </div>
            <div className="text-xs text-gray-600">{restaurant.priceRange}</div>
          </div>
          {restaurant.highlight && (
            <p className="text-xs text-gray-600 mt-1">{restaurant.highlight}</p>
          )}
        </div>
      ))}
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