/**
 * Fallback Panel Component
 * Displays when no valid offers are available for an intent
 * Provides user options (paste link, upload screenshot, etc.)
 */

import React, { useState } from 'react';
import type { FallbackResponse, FallbackOption } from '../services/intentRouterTypes';
import { DomainBadge } from './DomainBadge';

interface FallbackPanelProps {
    fallbackResponse: FallbackResponse;
    intentText?: string;
    onOptionSelect?: (option: FallbackOption, data?: any) => void;
    onDismiss?: () => void;
}

export const FallbackPanel: React.FC<FallbackPanelProps> = ({
    fallbackResponse,
    intentText,
    onOptionSelect,
    onDismiss
}) => {
    const [inputValue, setInputValue] = useState('');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const handleOptionClick = (option: FallbackOption) => {
        if (option.action_type === 'paste_link' || option.action_type === 'manual_input') {
            setSelectedOption(option.id);
        } else if (option.action_type === 'save_task') {
            // Delegate task creation to parent via callback
            onOptionSelect?.(option, {
                title: intentText || '待处理意图',
                status: 'pending',
                priority: 'medium',
                notes: `原始意图: ${intentText}\n域: ${fallbackResponse.intent_domain}`
            });
            setSelectedOption(null);
        } else if (option.action_type === 'upload_screenshot') {
            // Trigger file upload
            onOptionSelect?.(option);
        }
    };


    const handleInputSubmit = () => {
        if (selectedOption && inputValue.trim()) {
            const option = fallbackResponse.user_options.find(o => o.id === selectedOption);
            if (option) {
                onOptionSelect?.(option, { value: inputValue });
            }
            setInputValue('');
            setSelectedOption(null);
        }
    };

    return (
        <div className="fallback-panel">
            <style>{`
                .fallback-panel {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 16px 0;
                }

                .fallback-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .fallback-icon {
                    width: 40px;
                    height: 40px;
                    background: rgba(139, 92, 246, 0.1);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .fallback-message {
                    color: #374151;
                    font-size: 15px;
                    line-height: 1.5;
                }

                .fallback-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                    margin-top: 16px;
                }

                .fallback-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px;
                    background: white;
                    border: 1px solid #E5E7EB;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .fallback-option:hover {
                    border-color: #8B5CF6;
                    background: rgba(139, 92, 246, 0.02);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
                }

                .fallback-option.selected {
                    border-color: #8B5CF6;
                    background: rgba(139, 92, 246, 0.05);
                }

                .option-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }

                .option-content {
                    flex: 1;
                }

                .option-label {
                    font-weight: 600;
                    color: #111827;
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .option-desc {
                    color: #6B7280;
                    font-size: 12px;
                    line-height: 1.4;
                }

                .input-section {
                    margin-top: 12px;
                    padding: 12px;
                    background: rgba(139, 92, 246, 0.05);
                    border-radius: 8px;
                    display: flex;
                    gap: 8px;
                }

                .input-section input {
                    flex: 1;
                    padding: 10px 12px;
                    border: 1px solid #E5E7EB;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                }

                .input-section input:focus {
                    border-color: #8B5CF6;
                }

                .submit-btn {
                    padding: 10px 16px;
                    background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                .submit-btn:hover {
                    opacity: 0.9;
                }

                .submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .dismiss-btn {
                    margin-top: 12px;
                    padding: 8px 12px;
                    background: transparent;
                    color: #6B7280;
                    border: none;
                    font-size: 13px;
                    cursor: pointer;
                }

                .dismiss-btn:hover {
                    color: #374151;
                }
            `}</style>

            <div className="fallback-header">
                <div className="fallback-icon">💡</div>
                <div>
                    <DomainBadge domain={fallbackResponse.intent_domain} size="sm" />
                </div>
            </div>

            <div className="fallback-message">
                {fallbackResponse.cta_message}
            </div>

            <div className="fallback-options">
                {fallbackResponse.user_options.map(option => (
                    <div
                        key={option.id}
                        className={`fallback-option ${selectedOption === option.id ? 'selected' : ''}`}
                        onClick={() => handleOptionClick(option)}
                    >
                        <span className="option-icon">{option.icon}</span>
                        <div className="option-content">
                            <div className="option-label">{option.label}</div>
                            <div className="option-desc">{option.description}</div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedOption && (
                <div className="input-section">
                    <input
                        type="text"
                        placeholder={
                            selectedOption === 'paste_link'
                                ? '粘贴链接...'
                                : '输入信息...'
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
                    />
                    <button
                        className="submit-btn"
                        disabled={!inputValue.trim()}
                        onClick={handleInputSubmit}
                    >
                        提交
                    </button>
                </div>
            )}

            {onDismiss && (
                <button className="dismiss-btn" onClick={onDismiss}>
                    暂时跳过
                </button>
            )}
        </div>
    );
};

export default FallbackPanel;
