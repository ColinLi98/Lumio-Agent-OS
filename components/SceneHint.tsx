import React from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { AppScenario } from '../services/appScenarios';

interface SceneHintProps {
    scenario: AppScenario;
    visible: boolean;
    onSuggestionClick?: (text: string) => void;
}

/**
 * 场景感知提示组件
 * 根据当前 App 场景显示智能建议
 */
export const SceneHint: React.FC<SceneHintProps> = ({ scenario, visible, onSuggestionClick }) => {
    if (!visible) return null;

    // 场景特定快捷建议
    const scenarioSuggestions: Record<string, string[]> = {
        wechat: ['委婉拒绝', '改约时间', '表达感谢'],
        email: ['礼貌回复', '请假申请', '会议确认'],
        weibo: ['表示共情', '幽默评论', '鼓励打气'],
        sms: ['简短回复', '拒绝推销', '确认收到'],
        dingtalk: ['确认收到', '汇报进展', '请假说明']
    };

    const suggestions = scenarioSuggestions[scenario.id] || ['快速回复', '表达感谢'];

    return (
        <div className="scene-hint-container">
            <div className="scene-hint-header">
                <Lightbulb size={12} className="text-amber-400" />
                <span>{scenario.nameZh}场景建议</span>
            </div>
            <div className="scene-hint-suggestions">
                {suggestions.map((suggestion, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSuggestionClick?.(`帮我写 ${suggestion}`)}
                        className="scene-hint-chip"
                    >
                        <Sparkles size={10} />
                        {suggestion}
                    </button>
                ))}
            </div>

            <style>{`
                .scene-hint-container {
                    padding: 8px 12px;
                    background: linear-gradient(90deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
                    border-bottom: 1px solid rgba(251, 191, 36, 0.2);
                    animation: hintSlideIn 0.3s ease-out;
                }

                @keyframes hintSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .scene-hint-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    color: rgba(251, 191, 36, 0.8);
                    margin-bottom: 6px;
                    font-weight: 500;
                }

                .scene-hint-suggestions {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .scene-hint-chip {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background: rgba(251, 191, 36, 0.15);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 12px;
                    font-size: 11px;
                    color: rgba(253, 230, 138, 0.9);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .scene-hint-chip:hover {
                    background: rgba(251, 191, 36, 0.25);
                    transform: translateY(-1px);
                }

                .scene-hint-chip:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
};

export default SceneHint;
