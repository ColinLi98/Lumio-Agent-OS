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
 * Input prediction candidate component
 * Predict likely user input based on current scenario and typed text
 */
export const PredictionBar: React.FC<PredictionBarProps> = ({
    scenario,
    visible,
    currentInput,
    onPredictionClick
}) => {
    if (!visible) return null;

    // Scenario-specific predictions
    const scenarioPredictions: Record<string, string[]> = {
        wechat: [
            'Okay, no problem',
            'Give me a moment, I\'ll reply soon',
            'Got it, thanks',
            'I\'m here, what\'s up?',
            'Understood'
        ],
        email: [
            'Dear HR, Thank you for...',
            'Hello, I received your email...',
            'I am writing to...',
            'Thank you for your message...',
            'Please find attached...'
        ],
        weibo: [
            'Haha this is so real',
            'Same here, totally agree',
            'This is actually adorable',
            'Support! Keep it up 💪',
            'Looking forward to updates!'
        ],
        sms: [
            'Received',
            'Okay',
            'Thanks',
            'No need, thanks',
            'Checked'
        ],
        dingtalk: [
            'Received, handling now',
            'Okay, I\'ll prepare',
            'Understood, I\'ll join on time',
            'Got it, see you at the meeting',
            'Understood, I\'ll report back later'
        ]
    };

    // Filter predictions by current input
    const basePredictions = scenarioPredictions[scenario.id] || scenarioPredictions.wechat;

    // If user already typed content, filter by input
    let predictions = basePredictions;
    if (currentInput.trim()) {
        predictions = basePredictions.filter(p =>
            p.toLowerCase().includes(currentInput.toLowerCase()) ||
            currentInput.toLowerCase().includes(p.substring(0, 2).toLowerCase())
        );
        // If no match after filtering, show first three defaults
        if (predictions.length === 0) {
            predictions = basePredictions.slice(0, 3);
        }
    }

    // Show at most three predictions
    const displayPredictions = predictions.slice(0, 3);

    if (displayPredictions.length === 0) return null;

    return (
        <div className="prediction-bar">
            <div className="prediction-header">
                <Lightbulb size={12} className="text-purple-400" />
                <span>Smart Predictions</span>
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
