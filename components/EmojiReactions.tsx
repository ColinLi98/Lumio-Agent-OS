import React, { useState } from 'react';
import { SmilePlus } from 'lucide-react';

interface EmojiReactionsProps {
    onEmojiSelect: (emoji: string) => void;
    visible: boolean;
}

// Common quick emojis
const QUICK_EMOJIS = ['👍', '👎', '❤️', '😂', '🎉', '🤔'];

// Extended emoji panel
const EMOJI_CATEGORIES = {
    'Common': ['👍', '👎', '❤️', '😂', '🎉', '🤔', '👏', '🙏'],
    'Faces': ['😊', '😄', '😢', '😭', '😡', '🥺', '😍', '🤣'],
    'Gestures': ['👋', '✋', '👌', '✌️', '🤝', '💪', '👊', '🙌']
};

/**
 * Quick emoji reaction component
 * Provides fast emoji sending
 */
export const EmojiReactions: React.FC<EmojiReactionsProps> = ({ onEmojiSelect, visible }) => {
    const [showPanel, setShowPanel] = useState(false);
    const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Common');

    if (!visible) return null;

    return (
        <div className="emoji-reactions-wrapper">
            {/* Quick Emoji Bar */}
            <div className="quick-emoji-bar">
                {QUICK_EMOJIS.map((emoji, idx) => (
                    <button
                        key={idx}
                        onClick={() => onEmojiSelect(emoji)}
                        className="quick-emoji-btn"
                    >
                        {emoji}
                    </button>
                ))}
                <button
                    onClick={() => setShowPanel(!showPanel)}
                    className={`more-emoji-btn ${showPanel ? 'active' : ''}`}
                >
                    <SmilePlus size={16} />
                </button>
            </div>

            {/* Extended Emoji Panel */}
            {showPanel && (
                <div className="emoji-panel">
                    <div className="emoji-categories">
                        {Object.keys(EMOJI_CATEGORIES).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat as keyof typeof EMOJI_CATEGORIES)}
                                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="emoji-grid">
                        {EMOJI_CATEGORIES[activeCategory].map((emoji, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    onEmojiSelect(emoji);
                                    setShowPanel(false);
                                }}
                                className="emoji-btn"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .emoji-reactions-wrapper {
                    position: relative;
                }

                .quick-emoji-bar {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 10px;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 20px;
                    animation: slideIn 0.2s ease;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }

                .quick-emoji-btn {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .quick-emoji-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.2);
                }

                .quick-emoji-btn:active {
                    transform: scale(0.95);
                }

                .more-emoji-btn {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(99, 102, 241, 0.2);
                    border: none;
                    border-radius: 50%;
                    color: #a5b4fc;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .more-emoji-btn:hover, .more-emoji-btn.active {
                    background: rgba(99, 102, 241, 0.4);
                }

                .emoji-panel {
                    position: absolute;
                    bottom: 100%;
                    left: 0;
                    margin-bottom: 8px;
                    background: rgba(30, 27, 75, 0.95);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 12px;
                    padding: 8px;
                    min-width: 240px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                    animation: panelIn 0.2s ease;
                    z-index: 100;
                }

                @keyframes panelIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .emoji-categories {
                    display: flex;
                    gap: 4px;
                    margin-bottom: 8px;
                    border-bottom: 1px solid rgba(99, 102, 241, 0.2);
                    padding-bottom: 8px;
                }

                .category-btn {
                    padding: 4px 10px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    color: #a5b4fc;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .category-btn:hover {
                    background: rgba(99, 102, 241, 0.2);
                }

                .category-btn.active {
                    background: rgba(99, 102, 241, 0.3);
                    color: white;
                }

                .emoji-grid {
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    gap: 2px;
                }

                .emoji-btn {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.1s;
                }

                .emoji-btn:hover {
                    background: rgba(99, 102, 241, 0.2);
                    transform: scale(1.15);
                }
            `}</style>
        </div>
    );
};

export default EmojiReactions;
