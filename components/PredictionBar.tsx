import React from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import { AppScenario } from '../services/appScenarios';

interface PredictionBarProps {
    scenario: AppScenario;
    visible: boolean;
    currentInput: string;
    onPredictionClick: (text: string) => void;
}

/**
 * 输入预测候选组件
 * 根据当前场景和输入预测用户可能的输入
 */
export const PredictionBar: React.FC<PredictionBarProps> = ({
    scenario,
    visible,
    currentInput,
    onPredictionClick
}) => {
    if (!visible) return null;

    // 场景特定预测
    const scenarioPredictions: Record<string, string[]> = {
        wechat: [
            '好的，没问题',
            '稍等，我一会儿回复你',
            '收到，谢谢',
            '在呢，怎么了？',
            '好的，我知道了'
        ],
        email: [
            'Dear HR, Thank you for...',
            '您好，收到邮件...',
            'I am writing to...',
            '感谢您的来信...',
            'Please find attached...'
        ],
        weibo: [
            '哈哈哈太真实了',
            '同感！我也是',
            '这也太可了吧',
            '支持！加油💪',
            '期待更新！'
        ],
        sms: [
            '收到',
            '好的',
            '谢谢',
            '不需要，谢谢',
            '已查收'
        ],
        dingtalk: [
            '收到，马上处理',
            '好的，我准备一下',
            '明白，我会准时参加',
            '收到，会议见',
            '了解，稍后汇报'
        ]
    };

    // 根据当前输入过滤预测
    const basePredictions = scenarioPredictions[scenario.id] || scenarioPredictions.wechat;

    // 如果用户已输入内容，根据输入过滤
    let predictions = basePredictions;
    if (currentInput.trim()) {
        predictions = basePredictions.filter(p =>
            p.toLowerCase().includes(currentInput.toLowerCase()) ||
            currentInput.toLowerCase().includes(p.substring(0, 2).toLowerCase())
        );
        // 如果过滤后没有匹配，显示前3个默认预测
        if (predictions.length === 0) {
            predictions = basePredictions.slice(0, 3);
        }
    }

    // 最多显示3个预测
    const displayPredictions = predictions.slice(0, 3);

    if (displayPredictions.length === 0) return null;

    return (
        <div className="prediction-bar">
            <div className="prediction-header">
                <Lightbulb size={12} className="text-purple-400" />
                <span>智能预测</span>
            </div>
            <div className="prediction-items">
                {displayPredictions.map((prediction, idx) => (
                    <button
                        key={idx}
                        onClick={() => onPredictionClick(prediction)}
                        className="prediction-chip"
                    >
                        <Zap size={10} className="text-purple-300" />
                        <span>{prediction}</span>
                    </button>
                ))}
            </div>

            <style>{`
                .prediction-bar {
                    padding: 8px 12px;
                    background: linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%);
                    border-bottom: 1px solid rgba(139, 92, 246, 0.2);
                    animation: predictionSlide 0.3s ease-out;
                }

                @keyframes predictionSlide {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .prediction-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    color: rgba(139, 92, 246, 0.8);
                    margin-bottom: 6px;
                    font-weight: 500;
                }

                .prediction-items {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .prediction-chip {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 5px 12px;
                    background: rgba(139, 92, 246, 0.15);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    border-radius: 16px;
                    font-size: 12px;
                    color: rgba(233, 213, 255, 0.9);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    max-width: 180px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .prediction-chip:hover {
                    background: rgba(139, 92, 246, 0.25);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
                }

                .prediction-chip:active {
                    transform: translateY(0);
                }

                .prediction-chip span {
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            `}</style>
        </div>
    );
};

export default PredictionBar;
