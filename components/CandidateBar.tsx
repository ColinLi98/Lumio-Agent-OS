import React from 'react';
import { AgentOutput, ServiceCard, TextDraft, PrivacyAction, TaskPlan } from '../types';
import { ExternalLink, Copy, ShieldAlert, X, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
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