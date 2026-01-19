import React, { useState, useEffect } from 'react';
import { Settings, Check, RotateCcw, Sparkles, Globe, MessageSquare } from 'lucide-react';

interface UserPreferences {
    defaultTone: 'professional' | 'casual' | 'humorous' | 'formal';
    defaultLanguage: 'zh' | 'en' | 'auto';
    quickPhrases: string[];
    learnedPatterns: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    defaultTone: 'casual',
    defaultLanguage: 'auto',
    quickPhrases: ['好的，收到', '谢谢', '稍等'],
    learnedPatterns: 0
};

const STORAGE_KEY = 'lumi_user_preferences';

/**
 * 用户偏好设置面板
 * 管理语气风格、语言设置、快捷短语
 */
export const PreferencePanel: React.FC = () => {
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [isExpanded, setIsExpanded] = useState(false);
    const [newPhrase, setNewPhrase] = useState('');

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) });
            } catch { }
        }
    }, []);

    // Save to localStorage
    const savePreferences = (updated: UserPreferences) => {
        setPreferences(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const handleToneChange = (tone: UserPreferences['defaultTone']) => {
        savePreferences({ ...preferences, defaultTone: tone });
    };

    const handleLanguageChange = (lang: UserPreferences['defaultLanguage']) => {
        savePreferences({ ...preferences, defaultLanguage: lang });
    };

    const handleAddPhrase = () => {
        if (newPhrase.trim() && !preferences.quickPhrases.includes(newPhrase.trim())) {
            savePreferences({
                ...preferences,
                quickPhrases: [...preferences.quickPhrases, newPhrase.trim()].slice(0, 6)
            });
            setNewPhrase('');
        }
    };

    const handleRemovePhrase = (phrase: string) => {
        savePreferences({
            ...preferences,
            quickPhrases: preferences.quickPhrases.filter(p => p !== phrase)
        });
    };

    const handleReset = () => {
        savePreferences(DEFAULT_PREFERENCES);
    };

    const toneOptions = [
        { value: 'professional', label: '专业', icon: '👔' },
        { value: 'casual', label: '轻松', icon: '😊' },
        { value: 'humorous', label: '幽默', icon: '😄' },
        { value: 'formal', label: '正式', icon: '📝' }
    ] as const;

    const languageOptions = [
        { value: 'auto', label: '自动' },
        { value: 'zh', label: '中文' },
        { value: 'en', label: 'English' }
    ] as const;

    return (
        <div className="preference-panel">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="preference-header"
            >
                <div className="flex items-center gap-2">
                    <Settings size={16} className="text-purple-400" />
                    <span>个性化设置</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    {isExpanded ? '收起' : '展开'}
                </div>
            </button>

            {isExpanded && (
                <div className="preference-content">
                    {/* Tone Selection */}
                    <div className="preference-section">
                        <div className="section-label">
                            <MessageSquare size={14} />
                            默认语气
                        </div>
                        <div className="tone-grid">
                            {toneOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleToneChange(opt.value)}
                                    className={`tone-chip ${preferences.defaultTone === opt.value ? 'active' : ''}`}
                                >
                                    <span>{opt.icon}</span>
                                    <span>{opt.label}</span>
                                    {preferences.defaultTone === opt.value && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="preference-section">
                        <div className="section-label">
                            <Globe size={14} />
                            回复语言
                        </div>
                        <div className="lang-grid">
                            {languageOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleLanguageChange(opt.value)}
                                    className={`lang-chip ${preferences.defaultLanguage === opt.value ? 'active' : ''}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Phrases */}
                    <div className="preference-section">
                        <div className="section-label">
                            <Sparkles size={14} />
                            快捷短语
                        </div>
                        <div className="phrases-list">
                            {preferences.quickPhrases.map((phrase, idx) => (
                                <div key={idx} className="phrase-tag">
                                    <span>{phrase}</span>
                                    <button onClick={() => handleRemovePhrase(phrase)}>×</button>
                                </div>
                            ))}
                        </div>
                        <div className="phrase-input">
                            <input
                                type="text"
                                value={newPhrase}
                                onChange={(e) => setNewPhrase(e.target.value)}
                                placeholder="添加新短语..."
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPhrase()}
                            />
                            <button onClick={handleAddPhrase}>+</button>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <button onClick={handleReset} className="reset-btn">
                        <RotateCcw size={14} />
                        重置为默认
                    </button>
                </div>
            )}

            <style>{`
                .preference-panel {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(88, 28, 135, 0.1) 100%);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .preference-header {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                }

                .preference-header:hover {
                    background: rgba(139, 92, 246, 0.1);
                }

                .preference-content {
                    padding: 0 16px 16px;
                    animation: slideDown 0.2s ease;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .preference-section {
                    margin-bottom: 16px;
                }

                .section-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: rgba(139, 92, 246, 0.8);
                    margin-bottom: 8px;
                    font-weight: 500;
                }

                .tone-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }

                .tone-chip {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 8px;
                    color: #e9d5ff;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tone-chip:hover {
                    background: rgba(139, 92, 246, 0.2);
                }

                .tone-chip.active {
                    background: rgba(139, 92, 246, 0.3);
                    border-color: #8b5cf6;
                }

                .lang-grid {
                    display: flex;
                    gap: 8px;
                }

                .lang-chip {
                    flex: 1;
                    padding: 8px;
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 8px;
                    color: #e9d5ff;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .lang-chip:hover {
                    background: rgba(139, 92, 246, 0.2);
                }

                .lang-chip.active {
                    background: rgba(139, 92, 246, 0.3);
                    border-color: #8b5cf6;
                }

                .phrases-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-bottom: 8px;
                }

                .phrase-tag {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background: rgba(139, 92, 246, 0.2);
                    border-radius: 12px;
                    font-size: 11px;
                    color: #e9d5ff;
                }

                .phrase-tag button {
                    background: none;
                    border: none;
                    color: #a78bfa;
                    cursor: pointer;
                    font-size: 14px;
                    line-height: 1;
                }

                .phrase-input {
                    display: flex;
                    gap: 6px;
                }

                .phrase-input input {
                    flex: 1;
                    padding: 6px 10px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 6px;
                    color: white;
                    font-size: 12px;
                    outline: none;
                }

                .phrase-input input::placeholder {
                    color: rgba(139, 92, 246, 0.5);
                }

                .phrase-input button {
                    padding: 6px 12px;
                    background: rgba(139, 92, 246, 0.3);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                }

                .reset-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 100%;
                    padding: 8px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    color: #fca5a5;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .reset-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                }
            `}</style>
        </div>
    );
};

// Export helper to get current preferences
export const getUserPreferences = (): UserPreferences => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
        } catch { }
    }
    return DEFAULT_PREFERENCES;
};

// Export helper to increment learned patterns count
export const incrementLearnedPatterns = () => {
    const prefs = getUserPreferences();
    const updated = { ...prefs, learnedPatterns: prefs.learnedPatterns + 1 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export default PreferencePanel;
