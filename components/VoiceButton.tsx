import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
    onVoiceResult: (text: string) => void;
    disabled?: boolean;
}

// 模拟语音识别结果
const SIMULATED_VOICE_RESULTS = [
    '帮我写一封感谢信',
    '查一下明天的天气',
    '帮我记住这个会议时间',
    '帮我找最近的咖啡店',
    '翻译这段话成英文',
    '帮我拒绝今晚的聚会',
    '设置一个明天上午9点的提醒'
];

/**
 * 语音输入按钮组件
 * 模拟语音录制和识别动画
 */
export const VoiceButton: React.FC<VoiceButtonProps> = ({ onVoiceResult, disabled }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>([0.3, 0.5, 0.3]);
    const timerRef = useRef<number | null>(null);
    const waveRef = useRef<number | null>(null);

    // 模拟波形动画
    useEffect(() => {
        if (isRecording) {
            waveRef.current = window.setInterval(() => {
                setWaveAmplitudes([
                    0.3 + Math.random() * 0.7,
                    0.3 + Math.random() * 0.7,
                    0.3 + Math.random() * 0.7
                ]);
            }, 100);
        } else {
            if (waveRef.current) {
                clearInterval(waveRef.current);
                waveRef.current = null;
            }
            setWaveAmplitudes([0.3, 0.5, 0.3]);
        }

        return () => {
            if (waveRef.current) {
                clearInterval(waveRef.current);
            }
        };
    }, [isRecording]);

    const handlePress = () => {
        if (disabled || isProcessing) return;

        setIsRecording(true);

        // 模拟录音 2 秒后结束
        timerRef.current = window.setTimeout(() => {
            setIsRecording(false);
            setIsProcessing(true);

            // 模拟处理 1 秒后返回结果
            setTimeout(() => {
                setIsProcessing(false);
                const result = SIMULATED_VOICE_RESULTS[Math.floor(Math.random() * SIMULATED_VOICE_RESULTS.length)];
                onVoiceResult(result);
            }, 1000);
        }, 2000);
    };

    const handleRelease = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (isRecording) {
            setIsRecording(false);
            setIsProcessing(true);

            // 快速处理
            setTimeout(() => {
                setIsProcessing(false);
                const result = SIMULATED_VOICE_RESULTS[Math.floor(Math.random() * SIMULATED_VOICE_RESULTS.length)];
                onVoiceResult(result);
            }, 800);
        }
    };

    return (
        <div className="voice-button-wrapper">
            <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onTouchStart={handlePress}
                onTouchEnd={handleRelease}
                disabled={disabled || isProcessing}
                className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
                title="按住说话"
            >
                {isProcessing ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : isRecording ? (
                    <div className="wave-container">
                        {waveAmplitudes.map((amp, i) => (
                            <div
                                key={i}
                                className="wave-bar"
                                style={{ height: `${amp * 16}px` }}
                            />
                        ))}
                    </div>
                ) : (
                    <Mic size={18} />
                )}
            </button>

            {isRecording && (
                <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    录音中...
                </div>
            )}

            <style>{`
                .voice-button-wrapper {
                    position: relative;
                }

                .voice-button {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(99, 102, 241, 0.2);
                    color: #a5b4fc;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .voice-button:hover {
                    background: rgba(99, 102, 241, 0.3);
                }

                .voice-button.recording {
                    background: #ef4444;
                    color: white;
                    animation: pulse 1s infinite;
                }

                .voice-button.processing {
                    background: rgba(99, 102, 241, 0.3);
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
                    }
                }

                .wave-container {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }

                .wave-bar {
                    width: 3px;
                    background: white;
                    border-radius: 2px;
                    transition: height 0.1s ease;
                }

                .recording-indicator {
                    position: absolute;
                    top: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    font-size: 10px;
                    font-weight: 500;
                    border-radius: 12px;
                    white-space: nowrap;
                    animation: fadeIn 0.2s ease;
                }

                .recording-dot {
                    width: 6px;
                    height: 6px;
                    background: white;
                    border-radius: 50%;
                    animation: blink 1s infinite;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(5px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
};

export default VoiceButton;
