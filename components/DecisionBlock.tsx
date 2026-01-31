import React from 'react';
import { DecisionMeta } from '../types';

interface DecisionBlockProps {
  decision: DecisionMeta;
  onSuggestionClick?: (suggestion: string) => void;
}

export const DecisionBlock: React.FC<DecisionBlockProps> = ({ decision, onSuggestionClick }) => {
  const hasQuickReplies = Boolean(decision.quickReplies && decision.quickReplies.length > 0);
  const bellmanLabels: Record<string, string> = {
    ASK_CLARIFY: '先补充偏好',
    EXPAND_SEARCH: '拓展可选项',
    PROVIDE_ALTERNATIVES: '给出备选',
    RECOMMEND_BEST: '直接推荐最优',
    END: '完成决策'
  };
  const bellmanPath = decision.bellman?.path
    ? decision.bellman.path.map((action) => bellmanLabels[action] || action).join(' → ')
    : '';

  return (
    <div className="mx-2 my-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">最优解</div>
        <div className="text-[10px] text-emerald-600">信心 {decision.confidence}%</div>
      </div>
      <div className="text-sm text-emerald-900 leading-relaxed">{decision.summary}</div>
      {decision.bestOption && (
        <div className="mt-1 text-xs text-emerald-700">
          推荐：{decision.bestOption.name || decision.bestOption.title || decision.bestOption.airline || decision.bestOption.id}
        </div>
      )}
      {decision.reasons && decision.reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {decision.reasons.slice(0, 4).map((reason, idx) => (
            <span key={idx} className="text-[10px] bg-white text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
              {reason}
            </span>
          ))}
        </div>
      )}
      {decision.assumptions && decision.assumptions.length > 0 && (
        <div className="mt-2 text-[10px] text-emerald-700">
          假设：{decision.assumptions.slice(0, 3).join(' · ')}
        </div>
      )}
      {decision.followUpQuestions && decision.followUpQuestions.length > 0 && (
        <div className="mt-2 text-[10px] text-emerald-700">
          {hasQuickReplies ? (
            <span>还需要补充：{decision.followUpQuestions.slice(0, 3).join(' · ')}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {decision.followUpQuestions.slice(0, 3).map((question, idx) => (
                <button
                  key={idx}
                  className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  onClick={() => onSuggestionClick?.(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {decision.quickReplies && decision.quickReplies.length > 0 && (
        <div className="mt-2 space-y-2">
          {decision.quickReplies.slice(0, 3).map((group, idx) => (
            <div key={idx}>
              <div className="text-[10px] text-emerald-700 mb-1">{group.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {group.options.slice(0, 4).map((option, optIdx) => (
                  <button
                    key={optIdx}
                    className="text-[10px] px-2 py-1 rounded-full bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    onClick={() => onSuggestionClick?.(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {decision.bellman && (
        <div className="mt-2 text-[10px] text-emerald-700">
          策略：{bellmanPath || '已完成策略计算'}
          {Number.isFinite(decision.bellman.expectedValue) && (
            <span className="ml-1">· 价值 {decision.bellman.expectedValue}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default DecisionBlock;
