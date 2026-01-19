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
  onClear: () => void;
}

export const CandidateBar: React.FC<CandidateBarProps> = ({
  output,
  onDraftClick,
  onCardClick,
  onPrivacyAction,
  onTaskAction,
  onClear
}) => {
  if (!output || output.type === 'NONE') return null;

  return (
    <div className="w-full bg-gray-50 border-t border-gray-200 p-2 overflow-x-auto max-h-48 flex flex-col relative animate-in slide-in-from-bottom duration-300">
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

  // Completed task view
  if (task.status === 'completed') {
    return (
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} />
            <span className="font-bold">任务完成</span>
          </div>
          <button onClick={onClear} className="text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="text-sm opacity-90 mb-2">{task.goal}</div>
        {task.completedSummary && (
          <div className="bg-white/20 rounded-lg p-3 text-sm">
            {task.completedSummary}
          </div>
        )}
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

      {/* Steps Progress */}
      <div className="space-y-2 mb-3">
        {task.steps.map((step, index) => {
          const resultSummary = getStepResultSummary(step);
          const isActive = step.status === 'running' || step.status === 'retrying';

          return (
            <div
              key={step.id}
              className={`flex items-start gap-2 p-2 rounded-lg transition-all ${isActive
                ? 'bg-white/25 ring-1 ring-white/50'
                : step.status === 'completed'
                  ? 'bg-white/10'
                  : 'opacity-60'
                }`}
            >
              <div className="mt-0.5">{getStepIcon(step.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate">{step.description}</span>
                  {step.tool && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0">{step.tool}</span>
                  )}
                </div>
                {/* Show result summary for completed steps */}
                {resultSummary && (
                  <div className="text-xs text-white/70 mt-1">→ {resultSummary}</div>
                )}
                {/* Show retry info */}
                {step.status === 'retrying' && step.retryCount && (
                  <div className="text-xs text-orange-200 mt-1">
                    重试中 ({step.retryCount}/{step.maxRetries || 2})
                  </div>
                )}
                {/* Show dependency info */}
                {step.dependsOn && step.dependsOn.length > 0 && step.status === 'pending' && (
                  <div className="text-xs text-white/50 mt-1">
                    等待: {step.dependsOn.join(', ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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