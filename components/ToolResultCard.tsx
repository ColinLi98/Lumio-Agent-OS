import React from 'react';
import { ToolResultData } from '../types';
import { DecisionBlock } from './DecisionBlock';
import { Cloud, Calculator, Languages, Calendar, Bell, Search, AlertCircle, Check, X, PenLine, Brain, ShoppingCart, ExternalLink, Camera, Copy, MapPin, Phone, ChevronDown, Clock } from 'lucide-react';

interface ToolResultCardProps {
    result: ToolResultData;
    summary?: string;
    onDismiss?: () => void;
    onDraftClick?: (draft: { id: string; text: string; tone: string }) => void;
    onSuggestionClick?: (suggestion: string) => void;
    onViewInApp?: () => void;
}

export const ToolResultCard: React.FC<ToolResultCardProps> = ({ result, summary, onDismiss, onDraftClick, onSuggestionClick, onViewInApp }) => {
    // Extract smart suggestions from result
    const smartSuggestions = result.smartSuggestions || (result.data && {
        relatedQueries: result.data.relatedQueries || [],
        quickActions: result.data.quickActions || [],
    });
    const decision = result.decision;

    if (!result.success && result.error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mx-2 my-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle size={18} />
                        <span className="font-medium">操作失败</span>
                    </div>
                    {onDismiss && (
                        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <p className="text-red-500 text-sm mt-2">{result.error}</p>
            </div>
        );
    }

    let renderedCard: React.ReactNode = null;
    switch (result.displayType) {
        case 'weather':
            renderedCard = <WeatherCard data={result.data} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        case 'calculator':
            renderedCard = <CalculatorCard data={result.data} onDismiss={onDismiss} />;
            break;
        case 'translation':
            renderedCard = <TranslationCard data={result.data} onDismiss={onDismiss} />;
            break;
        case 'calendar':
            renderedCard = <CalendarCard data={result.data} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        case 'reminder':
            renderedCard = <ReminderCard data={result.data} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        // 三大核心功能卡片
        case 'write_assist':
            renderedCard = <WriteAssistCard data={result.data} onDismiss={onDismiss} onDraftClick={onDraftClick} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        case 'memory':
            renderedCard = <MemoryCard data={result.data} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        case 'quick_actions':
            renderedCard = <QuickActionsCard data={result.data} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        case 'ocr_result':
            renderedCard = <OCRResultCard data={result.data} onDismiss={onDismiss} />;
            break;
        case 'search':
            renderedCard = <SearchResultCard data={result.data} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
        case 'restaurant':
            renderedCard = <RestaurantCard data={result.data} onDismiss={onDismiss} onSuggestionClick={onSuggestionClick} onViewInApp={onViewInApp} />;
            break;
        default:
            renderedCard = <TextCard data={result.data} summary={summary} onDismiss={onDismiss} smartSuggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />;
            break;
    }

    if (!decision) return renderedCard;

    return (
        <div className="space-y-2">
            <DecisionBlock decision={decision} onSuggestionClick={onSuggestionClick} />
            {renderedCard}
        </div>
    );
};


// =============================================================================
// SMART SUGGESTIONS PANEL - Universal suggestion display for all tool types
// =============================================================================

interface SmartSuggestionsProps {
    suggestions?: {
        relatedQueries?: string[];
        quickActions?: string[];
    };
    onSuggestionClick?: (suggestion: string) => void;
    theme?: 'light' | 'dark';
}

const SmartSuggestionsPanel: React.FC<SmartSuggestionsProps> = ({ suggestions, onSuggestionClick, theme = 'dark' }) => {
    if (!suggestions) return null;

    const hasQueries = suggestions.relatedQueries && suggestions.relatedQueries.length > 0;
    const hasActions = suggestions.quickActions && suggestions.quickActions.length > 0;

    if (!hasQueries && !hasActions) return null;

    const handleClick = (text: string) => {
        // Remove emoji prefix if present for cleaner search
        const cleanText = text.replace(/^[^\w\u4e00-\u9fff]+/, '').trim();
        onSuggestionClick?.(cleanText || text);
    };

    return (
        <div className={`smart-suggestions-panel ${theme}`}>
            {hasQueries && (
                <div className="suggestion-row">
                    <span className="row-label">🔍 相关</span>
                    <div className="chips-container">
                        {suggestions.relatedQueries!.map((query, i) => (
                            <button
                                key={i}
                                className="suggestion-chip query-chip"
                                onClick={() => handleClick(query)}
                            >
                                {query}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {hasActions && (
                <div className="suggestion-row">
                    <span className="row-label">⚡ 操作</span>
                    <div className="chips-container">
                        {suggestions.quickActions!.map((action, i) => (
                            <button
                                key={i}
                                className="suggestion-chip action-chip"
                                onClick={() => handleClick(action)}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .smart-suggestions-panel {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.15);
                }
                
                .smart-suggestions-panel.light {
                    border-top-color: rgba(0,0,0,0.1);
                }
                
                .suggestion-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                
                .suggestion-row:last-child {
                    margin-bottom: 0;
                }
                
                .row-label {
                    font-size: 11px;
                    opacity: 0.7;
                    white-space: nowrap;
                    padding-top: 4px;
                    min-width: 40px;
                }
                
                .chips-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    flex: 1;
                }
                
                .suggestion-chip {
                    padding: 5px 12px;
                    border-radius: 14px;
                    font-size: 11px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                
                .query-chip {
                    background: rgba(59, 130, 246, 0.2);
                    color: #93c5fd;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }
                
                .query-chip:hover {
                    background: rgba(59, 130, 246, 0.4);
                    color: white;
                    transform: translateY(-1px);
                }
                
                .action-chip {
                    background: rgba(16, 185, 129, 0.2);
                    color: #86efac;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                
                .action-chip:hover {
                    background: rgba(16, 185, 129, 0.4);
                    color: white;
                    transform: translateY(-1px);
                }
                
                .smart-suggestions-panel.light .query-chip {
                    background: rgba(59, 130, 246, 0.1);
                    color: #2563eb;
                    border-color: rgba(59, 130, 246, 0.2);
                }
                
                .smart-suggestions-panel.light .query-chip:hover {
                    background: rgba(59, 130, 246, 0.2);
                    color: #1d4ed8;
                }
                
                .smart-suggestions-panel.light .action-chip {
                    background: rgba(16, 185, 129, 0.1);
                    color: #059669;
                    border-color: rgba(16, 185, 129, 0.2);
                }
                
                .smart-suggestions-panel.light .action-chip:hover {
                    background: rgba(16, 185, 129, 0.2);
                    color: #047857;
                }
            `}</style>
        </div>
    );
};

// Weather Card

const WeatherCard: React.FC<{ data: any; onDismiss?: () => void; smartSuggestions?: any; onSuggestionClick?: (s: string) => void }> = ({ data, onDismiss, smartSuggestions, onSuggestionClick }) => (
    <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Cloud size={18} />
                <span className="font-medium text-sm opacity-90">天气</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="flex items-center justify-between">
            <div>
                <div className="text-3xl font-bold">{data.temperature}{data.unit}</div>
                <div className="text-lg opacity-90">{data.location}</div>
                <div className="text-sm opacity-75">{data.condition} · {data.wind}</div>
            </div>
            <div className="text-5xl">{data.icon}</div>
        </div>
        <div className="mt-3 text-sm opacity-75">
            湿度: {data.humidity}%
        </div>
        <SmartSuggestionsPanel suggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />
    </div>
);


// Calculator Card
const CalculatorCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Calculator size={18} />
                <span className="font-medium text-sm opacity-90">
                    {data.type === 'currency' ? '汇率转换' : '计算结果'}
                </span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="text-center py-4">
            <div className="text-sm opacity-75 mb-1">{data.expression}</div>
            <div className="text-3xl font-bold">
                = {data.result}{data.resultUnit ? ` ${data.resultUnit}` : ''}
            </div>
            {data.rate && (
                <div className="text-xs opacity-60 mt-2">{data.rate}</div>
            )}
        </div>
    </div>
);

// Translation Card
const TranslationCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => (
    <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Languages size={18} />
                <span className="font-medium text-sm opacity-90">翻译</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="space-y-3">
            <div className="bg-white/20 rounded-lg p-2">
                <div className="text-xs opacity-75 mb-1">原文 ({data.fromLang})</div>
                <div className="text-sm">{data.originalText}</div>
            </div>
            <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    ↓
                </div>
            </div>
            <div className="bg-white/30 rounded-lg p-2">
                <div className="text-xs opacity-75 mb-1">译文 ({data.toLang})</div>
                <div className="text-sm font-medium">
                    {data.translatedText || '翻译中...'}
                </div>
            </div>
        </div>
    </div>
);

// Calendar Card
const CalendarCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => (
    <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span className="font-medium text-sm opacity-90">日历</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>

        {data.action === 'created' && data.event && (
            <div className="bg-white/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-200 mb-2">
                    <Check size={16} />
                    <span className="text-sm">日程已创建</span>
                </div>
                <div className="font-bold">{data.event.title}</div>
                <div className="text-sm opacity-80 mt-1">
                    📅 {data.event.date} · ⏰ {data.event.time}
                </div>
            </div>
        )}

        {data.action === 'list' && (
            <div className="space-y-2">
                <div className="text-sm opacity-80">{data.message}</div>
                {data.events?.map((event: any) => (
                    <div key={event.id} className="bg-white/20 rounded-lg p-2 text-sm">
                        <div className="font-medium">{event.title}</div>
                        <div className="opacity-75 text-xs">{event.date} {event.time}</div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// Reminder Card
const ReminderCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => (
    <div className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Bell size={18} />
                <span className="font-medium text-sm opacity-90">提醒</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-200 mb-2">
                <Check size={16} />
                <span className="text-sm">提醒已创建</span>
            </div>
            <div className="text-sm">{data.message}</div>
            {data.reminder && (
                <div className="text-xs opacity-75 mt-2">
                    ⏰ {data.reminder.time}
                </div>
            )}
        </div>
    </div>
);

// Generic Text Card
const TextCard: React.FC<{ data: any; summary?: string; onDismiss?: () => void; smartSuggestions?: any; onSuggestionClick?: (s: string) => void }> = ({ data, summary, onDismiss, smartSuggestions, onSuggestionClick }) => (
    <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Search size={18} />
                <span className="font-medium text-sm opacity-90">结果</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="text-sm">
            {summary || JSON.stringify(data, null, 2)}
        </div>
        <SmartSuggestionsPanel suggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />
    </div>
);

// Search Result Card - 显示搜索结果详情
const SearchResultCard: React.FC<{ data: any; onDismiss?: () => void; smartSuggestions?: any; onSuggestionClick?: (s: string) => void }> = ({ data, onDismiss, smartSuggestions, onSuggestionClick }) => (
    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <Search size={18} />
                <span className="font-medium text-sm opacity-90">搜索结果</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                    {data.results?.length || data.places?.length || 0} 条
                </span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>

        {/* Query Display */}
        <div className="text-xs opacity-75 mb-3">
            🔍 搜索: {data.query}
        </div>

        {/* Results List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Web Search Results */}
            {data.results?.map((result: any, index: number) => (
                <a
                    key={index}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/15 hover:bg-white/25 rounded-lg p-3 transition-all group"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1 line-clamp-1">
                                {result.title}
                            </div>
                            <div className="text-xs opacity-80 line-clamp-2">
                                {result.snippet}
                            </div>
                        </div>
                        <ExternalLink size={14} className="opacity-50 group-hover:opacity-100 flex-shrink-0 mt-1" />
                    </div>
                </a>
            ))}

            {/* Location/Places Results */}
            {data.places?.map((place: any, index: number) => (
                <div
                    key={index}
                    className="bg-white/15 rounded-lg p-3"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{place.name}</span>
                                {place.rating && (
                                    <span className="text-xs bg-yellow-400/30 px-1 rounded">
                                        ⭐ {place.rating}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs opacity-75 flex items-center gap-1">
                                <MapPin size={10} />
                                {place.address}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs opacity-60">{place.type}</span>
                                {place.priceLevel && (
                                    <span className="text-xs opacity-60">{place.priceLevel}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-white/20 text-xs opacity-60 text-center">
            {data.message || `共找到 ${data.results?.length || data.places?.length || 0} 条结果`}
        </div>
        <SmartSuggestionsPanel suggestions={smartSuggestions} onSuggestionClick={onSuggestionClick} />
    </div>
);

// =====================================
// 三大核心功能卡片
// =====================================

// 帮我写 - Write Assist Card with Style Badges
const WriteAssistCard: React.FC<{
    data: any;
    onDismiss?: () => void;
    onDraftClick?: (draft: { id: string; text: string; tone: string }) => void;
}> = ({ data, onDismiss, onDraftClick }) => (
    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <PenLine size={18} />
                <span className="font-medium text-sm opacity-90">帮我写</span>
                {/* AI Badge */}
                {data.isAI && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">🤖 AI</span>
                )}
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="text-xs opacity-75 mb-3">主题: {data.context}</div>
        <div className="space-y-2">
            {data.drafts?.map((draft: any) => (
                <button
                    key={draft.id}
                    onClick={() => onDraftClick?.(draft)}
                    className="w-full text-left bg-white/20 hover:bg-white/30 rounded-lg p-3 transition-all group"
                >
                    {/* Style Badge */}
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{draft.toneEmoji || '✍️'}</span>
                        <span className="text-xs opacity-75 uppercase tracking-wider">
                            {draft.toneName || draft.tone}
                        </span>
                    </div>
                    <div className="text-sm">{draft.text}</div>
                    {/* Hover Actions */}
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">
                            点击填入
                        </span>
                    </div>
                </button>
            ))}
        </div>
        <div className="text-xs opacity-60 mt-3 text-center">
            {data.message || '点击选择要使用的内容'}
        </div>
    </div>
);


// 帮我记 - Memory Card with Quick Actions
const MemoryCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => {
    const typeIcons: Record<string, string> = {
        event: '📅',
        task: '✅',
        note: '📝',
        link: '🔗',
        contact: '👤',
        interest: '💡'
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(data.memory?.content || data.memory?.title || '');
    };

    const handleAddToCalendar = () => {
        // Already saved to calendar by smart_save tool
        alert('已添加到日历！');
    };

    const handleCreateTodo = () => {
        // Already saved to reminders by smart_save tool
        alert('已创建待办！');
    };

    return (
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Brain size={18} />
                    <span className="font-medium text-sm opacity-90">帮我记</span>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="text-white/70 hover:text-white">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Saved Item Display */}
            <div className="bg-white/20 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-green-200 mb-2">
                    <Check size={16} />
                    <span className="text-sm">{data.typeLabel} 已保存</span>
                    <span className="text-lg ml-auto">{typeIcons[data.memory?.type] || '📝'}</span>
                </div>
                <div className="font-medium">{data.memory?.title}</div>
                {data.memory?.content && data.memory.content !== data.memory.title && (
                    <div className="text-sm opacity-80 mt-1 line-clamp-2">{data.memory.content}</div>
                )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 mb-3">
                {data.memory?.type === 'event' && (
                    <button
                        onClick={handleAddToCalendar}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm transition-all"
                    >
                        <Calendar size={14} />
                        <span>日历</span>
                    </button>
                )}
                {data.memory?.type === 'task' && (
                    <button
                        onClick={handleCreateTodo}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm transition-all"
                    >
                        <Bell size={14} />
                        <span>待办</span>
                    </button>
                )}
                <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm transition-all"
                >
                    <span>📋</span>
                    <span>复制</span>
                </button>
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between text-xs opacity-75">
                <span>来源: {data.memory?.source}</span>
                <span>共 {data.totalMemories} 条记忆</span>
            </div>
        </div>
    );
};


// 帮我找 - Quick Actions Card (比价等)
const QuickActionsCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => (
    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <ShoppingCart size={18} />
                <span className="font-medium text-sm opacity-90">帮我找 · 比价</span>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-white/70 hover:text-white">
                    <X size={16} />
                </button>
            )}
        </div>
        <div className="text-xs opacity-75 mb-2">搜索: {data.product}</div>
        {data.lowestPrice && (
            <div className="bg-white/20 rounded-lg p-2 mb-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm">最低价</span>
                    <span className="font-bold text-lg">¥{data.lowestPrice}</span>
                </div>
                <div className="text-xs opacity-75">{data.lowestPlatform} · 省 ¥{data.savings}</div>
            </div>
        )}
        <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.results?.map((item: any, index: number) => (
                <a
                    key={index}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                    <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span className="text-sm">{item.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">¥{item.price}</span>
                        {item.originalPrice > item.price && (
                            <span className="text-xs line-through opacity-50">¥{item.originalPrice}</span>
                        )}
                        <ExternalLink size={12} className="opacity-50" />
                    </div>
                </a>
            ))}
        </div>
    </div>
);

// =====================================
// OCR 图像识别结果卡片
// =====================================

const OCRResultCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => {
    const typeIcons: Record<string, string> = {
        product: '🛒',
        address: '📍',
        link: '🔗',
        phone: '📞',
        price: '💰',
        text: '📝',
        qrcode: '📱'
    };

    const typeLabels: Record<string, string> = {
        product: '商品',
        address: '地址',
        link: '链接',
        phone: '电话',
        price: '价格',
        text: '文字',
        qrcode: '二维码'
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const handleAction = (action: any) => {
        if (action.type === 'copy') {
            handleCopy(action.data.content);
            return;
        }
        if (action.actionUri) {
            window.open(action.actionUri, '_blank');
        }
    };

    return (
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-4 mx-2 my-2 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Camera size={18} />
                    <span className="font-medium text-sm opacity-90">📷 图像识别</span>
                    {data.processingTime && (
                        <span className="text-xs opacity-60">{data.processingTime}ms</span>
                    )}
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="text-white/70 hover:text-white">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Summary */}
            {data.summary && (
                <div className="bg-white/20 rounded-lg px-3 py-2 mb-3 text-sm">
                    {data.summary}
                </div>
            )}

            {/* Extracted Items */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.extractedItems?.map((item: any, index: number) => (
                    <div key={index} className="bg-white/15 rounded-lg p-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span>{typeIcons[item.type] || '📝'}</span>
                            <span className="text-xs opacity-75 uppercase tracking-wider">
                                {typeLabels[item.type] || item.type}
                            </span>
                            {item.confidence && (
                                <span className="text-xs opacity-50 ml-auto">
                                    {Math.round(item.confidence * 100)}%
                                </span>
                            )}
                        </div>
                        <div className="text-sm font-medium truncate">{item.content}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            {data.quickActions && data.quickActions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="text-xs opacity-60 mb-2">快捷操作</div>
                    <div className="flex flex-wrap gap-2">
                        {data.quickActions.slice(0, 6).map((action: any) => (
                            <button
                                key={action.id}
                                onClick={() => handleAction(action)}
                                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm transition-all"
                            >
                                <span>{action.icon}</span>
                                <span>{action.label.replace(/^[^\s]+\s/, '')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Raw Text Toggle */}
            {data.rawText && (
                <details className="mt-3">
                    <summary className="text-xs opacity-60 cursor-pointer hover:opacity-80">
                        查看原始文字
                    </summary>
                    <div className="mt-2 bg-white/10 rounded-lg p-2 text-xs opacity-80 max-h-24 overflow-y-auto">
                        {data.rawText}
                    </div>
                </details>
            )}
        </div>
    );
};

// =====================================
// 餐厅搜索结果卡片 (约会/精选餐厅)
// =====================================

const RestaurantCard: React.FC<{ data: any; onDismiss?: () => void; onSuggestionClick?: (suggestion: string) => void; onViewInApp?: () => void }> = ({ data, onDismiss, onSuggestionClick, onViewInApp }) => {
    const isDateMode = data.purpose === 'date';
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [expandedId, setExpandedId] = React.useState<number | null>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const places = data.places || [];
    const selectedPlace = places[selectedIndex];

    // Scroll to selected card
    const scrollToCard = (index: number) => {
        setSelectedIndex(index);
        if (scrollContainerRef.current) {
            const cardWidth = 280;
            scrollContainerRef.current.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="restaurant-premium-wrapper">
            {/* Premium Header with Glassmorphism */}
            <div className="restaurant-header">
                <div className="header-bg"></div>
                <div className="header-content">
                    <div className="header-left">
                        <span className="header-icon">{isDateMode ? '💕' : '🍽️'}</span>
                        <div className="header-text">
                            <span className="header-title">
                                {isDateMode ? '约会餐厅精选' : '为您推荐'}
                            </span>
                            <span className="header-subtitle">
                                {data.message || `精选 ${places.length} 家餐厅`}
                            </span>
                        </div>
                    </div>
                    <div className="header-right">
                        {onViewInApp && (
                            <button onClick={onViewInApp} className="view-in-app-btn">
                                📱 在App中查看
                            </button>
                        )}
                        <span className="place-count">{places.length}</span>
                        {onDismiss && (
                            <button onClick={onDismiss} className="dismiss-btn">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Horizontal Swipeable Cards */}
            <div className="cards-container" ref={scrollContainerRef}>
                {places.map((place: any, index: number) => {
                    const coverPhoto = place.photos?.[0];
                    const atmosphereTags = Array.isArray(place.atmosphere) ? place.atmosphere : place.atmosphere ? [place.atmosphere] : [];
                    const highlightTags = Array.isArray(place.highlights) ? place.highlights : place.highlights ? [place.highlights] : [];
                    const signatureList = Array.isArray(place.signature) ? place.signature : place.signature ? [place.signature] : [];

                    return (
                        <div
                            key={index}
                            className={`restaurant-card ${selectedIndex === index ? 'active' : ''} ${expandedId === index ? 'expanded' : ''}`}
                            onClick={() => setSelectedIndex(index)}
                        >
                            {/* Card Header with Image Placeholder */}
                            <div
                                className="card-image"
                                style={coverPhoto ? { backgroundImage: `url(${coverPhoto})` } : undefined}
                            >
                            <div className="card-image-overlay"></div>
                            <div className="card-badges">
                                {index === 0 && place.matchScore >= 70 && (
                                    <span className="badge best-match">❤️ 最佳</span>
                                )}
                                {highlightTags.some((h: string) => h.includes('米其林')) && (
                                    <span className="badge michelin">🌟 米其林</span>
                                )}
                            </div>
                            {/* Match Score Ring */}
                            {place.matchScore && (
                                <div className="match-ring">
                                    <svg viewBox="0 0 36 36">
                                        <path
                                            className="ring-bg"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="ring-progress"
                                            strokeDasharray={`${place.matchScore}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <span className="match-score">{place.matchScore}</span>
                                </div>
                            )}
                            <div className="card-type-tag">{place.type}</div>
                        </div>

                        {/* Card Content */}
                        <div className="card-content">
                            <h3 className="card-title">{place.name}</h3>

                            <div className="card-meta">
                                <span className="rating">⭐ {place.rating}</span>
                                <span className="divider">·</span>
                                <span className="reviews">{place.reviewCount || '1k+'}评</span>
                                <span className="divider">·</span>
                                <span className="price">{place.priceRange || place.priceLevel}</span>
                            </div>

                            {/* Atmosphere Pills */}
                            {atmosphereTags.length > 0 && (
                                <div className="atmosphere-container">
                                    {atmosphereTags.slice(0, 3).map((tag: string, i: number) => (
                                        <span key={i} className="atmosphere-pill">{tag}</span>
                                    ))}
                                </div>
                            )}

                            {/* Personal Note */}
                            {place.personalNote && (
                                <div className="personal-note">
                                    <span className="note-icon">💡</span>
                                    <p>{place.personalNote}</p>
                                </div>
                            )}

                            {/* Signature Dishes */}
                            {signatureList.length > 0 && (
                                <div className="signature-dishes">
                                    <span className="dishes-label">🍴 招牌</span>
                                    <span className="dishes-list">{signatureList.slice(0, 3).join(' · ')}</span>
                                </div>
                            )}

                            {/* Expandable Details */}
                            <button
                                className="expand-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedId(expandedId === index ? null : index);
                                }}
                            >
                                {expandedId === index ? '收起' : '查看详情'}
                                <ChevronDown size={14} style={{
                                    transform: expandedId === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </button>

                            {/* Expanded Content */}
                            {expandedId === index && (
                                <div className="expanded-content">
                                    <div className="address-line">
                                        <MapPin size={12} />
                                        <span>{place.address}</span>
                                    </div>
                                    {place.hours && (
                                        <div className="hours-line">
                                            <Clock size={12} />
                                            <span>{place.hours}</span>
                                        </div>
                                    )}
                                    {place.waitTime && (
                                        <div className="wait-line">
                                            <Bell size={12} />
                                            <span>{place.waitTime}</span>
                                        </div>
                                    )}
                                    {place.photos && place.photos.length > 1 && (
                                        <div className="photo-strip">
                                            {place.photos.slice(0, 3).map((photo: string, photoIdx: number) => (
                                                <img
                                                    key={photoIdx}
                                                    src={photo}
                                                    alt={`${place.name} 照片 ${photoIdx + 1}`}
                                                    className="photo-thumb"
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {place.menu && place.menu.length > 0 && (
                                        <div className="menu-section">
                                            <div className="section-title">🍽️ 菜单精选</div>
                                            <div className="menu-list">
                                                {place.menu.slice(0, 3).map((item: any, itemIdx: number) => (
                                                    <div key={itemIdx} className="menu-item">
                                                        <span className="menu-name">{item.name || item}</span>
                                                        {item.price && <span className="menu-price">{item.price}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {place.reviewHighlights && place.reviewHighlights.length > 0 && (
                                        <div className="review-section">
                                            <div className="section-title">💬 热门评价</div>
                                            <div className="review-list">
                                                {place.reviewHighlights.slice(0, 2).map((review: any, reviewIdx: number) => (
                                                    <div key={reviewIdx} className="review-item">
                                                        <div className="review-header">
                                                            <span className="review-author">{review.author || '用户'}</span>
                                                            {Number.isFinite(review.rating) && (
                                                                <span className="review-rating">⭐ {review.rating}</span>
                                                            )}
                                                        </div>
                                                        <div className="review-text">{review.text || review}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {highlightTags.length > 0 && (
                                        <div className="highlights-container">
                                            {highlightTags.map((h: string, i: number) => (
                                                <span key={i} className="highlight-tag">✨ {h}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="card-actions">
                            {place.dianpingUrl && (
                                <a
                                    href={place.dianpingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="action-btn dianping"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={14} />
                                    <span>点评</span>
                                </a>
                            )}
                            {place.phone && (
                                <a
                                    href={`tel:${place.phone}`}
                                    className="action-btn phone"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Phone size={14} />
                                    <span>电话</span>
                                </a>
                            )}
                            {place.bookingAvailable && (
                                <button
                                    className="action-btn book"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (place.dianpingUrl) window.open(place.dianpingUrl, '_blank');
                                    }}
                                >
                                    <Calendar size={14} />
                                    <span>预订</span>
                                </button>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Pagination Dots */}
            {places.length > 1 && (
                <div className="pagination-dots">
                    {places.map((_: any, index: number) => (
                        <button
                            key={index}
                            className={`dot ${selectedIndex === index ? 'active' : ''}`}
                            onClick={() => scrollToCard(index)}
                        />
                    ))}
                </div>
            )}

            {/* Smart Suggestions Bar */}
            {selectedPlace && (
                <div className="smart-suggestions">
                    {/* Related Queries */}
                    {selectedPlace.relatedQueries && selectedPlace.relatedQueries.length > 0 && (
                        <div className="suggestion-section">
                            <span className="section-label">🔍 相关搜索</span>
                            <div className="suggestion-chips">
                                {selectedPlace.relatedQueries.map((query: string, i: number) => (
                                    <button
                                        key={i}
                                        className="suggestion-chip query"
                                        onClick={() => onSuggestionClick?.(query)}
                                    >
                                        {query}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Follow-up Actions */}
                    {selectedPlace.followUpActions && selectedPlace.followUpActions.length > 0 && (
                        <div className="suggestion-section">
                            <span className="section-label">⚡ 快捷操作</span>
                            <div className="suggestion-chips">
                                {selectedPlace.followUpActions.map((action: string, i: number) => (
                                    <button
                                        key={i}
                                        className="suggestion-chip action"
                                        onClick={() => {
                                            // Handle specific actions
                                            if (action.includes('预订') && selectedPlace.dianpingUrl) {
                                                window.open(selectedPlace.dianpingUrl, '_blank');
                                            } else if (action.includes('电话') && selectedPlace.phone) {
                                                window.location.href = `tel:${selectedPlace.phone}`;
                                            } else if (action.includes('评价') && selectedPlace.dianpingUrl) {
                                                window.open(selectedPlace.dianpingUrl, '_blank');
                                            } else {
                                                // Trigger as a new search query
                                                onSuggestionClick?.(action.replace(/[📅📖📞💐🎬]/g, '').trim());
                                            }
                                        }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .restaurant-premium-wrapper {
                    margin: 8px;
                    border-radius: 16px;
                    overflow: hidden;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }

                .restaurant-header {
                    position: relative;
                    padding: 16px;
                }

                .header-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%);
                    backdrop-filter: blur(10px);
                }

                .header-content {
                    position: relative;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .header-icon {
                    font-size: 24px;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                }

                .header-text {
                    display: flex;
                    flex-direction: column;
                }

                .header-title {
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                }

                .header-subtitle {
                    color: rgba(255,255,255,0.7);
                    font-size: 11px;
                    margin-top: 2px;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .place-count {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .view-in-app-btn {
                    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                    border: none;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .view-in-app-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                }

                .dismiss-btn {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: rgba(255,255,255,0.7);
                    padding: 6px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .dismiss-btn:hover {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }

                .cards-container {
                    display: flex;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    padding: 0 12px 12px;
                    gap: 12px;
                    scrollbar-width: none;
                }

                .cards-container::-webkit-scrollbar {
                    display: none;
                }

                .restaurant-card {
                    flex: 0 0 260px;
                    scroll-snap-align: start;
                    background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%);
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .restaurant-card:hover, .restaurant-card.active {
                    transform: translateY(-4px);
                    border-color: rgba(236, 72, 153, 0.3);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(236, 72, 153, 0.2);
                }

                .card-image {
                    position: relative;
                    height: 100px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                    display: flex;
                    align-items: flex-end;
                    padding: 10px;
                    background-size: cover;
                    background-position: center;
                }

                .card-image-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%);
                }

                .card-badges {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    display: flex;
                    gap: 4px;
                }

                .badge {
                    font-size: 10px;
                    padding: 3px 8px;
                    border-radius: 10px;
                    font-weight: 600;
                }

                .badge.best-match {
                    background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
                    color: white;
                }

                .badge.michelin {
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    color: #1a1a2e;
                }

                .match-ring {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .match-ring svg {
                    width: 100%;
                    height: 100%;
                    transform: rotate(-90deg);
                }

                .ring-bg {
                    fill: none;
                    stroke: rgba(255,255,255,0.1);
                    stroke-width: 3;
                }

                .ring-progress {
                    fill: none;
                    stroke: #10b981;
                    stroke-width: 3;
                    stroke-linecap: round;
                    animation: ring-fill 1s ease-out forwards;
                }

                @keyframes ring-fill {
                    from { stroke-dasharray: 0, 100; }
                }

                .match-score {
                    position: absolute;
                    color: white;
                    font-size: 12px;
                    font-weight: 700;
                }

                .card-type-tag {
                    position: relative;
                    z-index: 1;
                    background: rgba(255,255,255,0.15);
                    backdrop-filter: blur(8px);
                    color: white;
                    font-size: 10px;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-weight: 500;
                }

                .card-content {
                    padding: 14px;
                }

                .card-title {
                    color: white;
                    font-size: 15px;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    line-height: 1.3;
                }

                .card-meta {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    margin-bottom: 10px;
                }

                .rating { color: #fbbf24; font-weight: 600; }
                .divider { color: rgba(255,255,255,0.3); }
                .reviews { color: rgba(255,255,255,0.5); }
                .price { color: #f472b6; font-weight: 500; }

                .atmosphere-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-bottom: 10px;
                }

                .atmosphere-pill {
                    background: rgba(236, 72, 153, 0.15);
                    color: #f9a8d4;
                    font-size: 10px;
                    padding: 3px 8px;
                    border-radius: 10px;
                    border: 1px solid rgba(236, 72, 153, 0.2);
                }

                .personal-note {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 10px;
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }

                .note-icon { font-size: 12px; }

                .personal-note p {
                    color: rgba(255,255,255,0.8);
                    font-size: 11px;
                    line-height: 1.4;
                    margin: 0;
                }

                .signature-dishes {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 10px;
                }

                .dishes-label {
                    color: rgba(255,255,255,0.5);
                    font-size: 11px;
                }

                .dishes-list {
                    color: rgba(255,255,255,0.7);
                    font-size: 11px;
                }

                .expand-btn {
                    width: 100%;
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: rgba(255,255,255,0.6);
                    padding: 8px;
                    border-radius: 8px;
                    font-size: 11px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    transition: all 0.2s;
                }

                .expand-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }

                .expanded-content {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    animation: fadeIn 0.3s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .address-line, .hours-line, .wait-line {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: rgba(255,255,255,0.5);
                    font-size: 11px;
                    margin-bottom: 6px;
                }

                .wait-line { color: #fbbf24; }

                .highlights-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 8px;
                }

                .highlight-tag {
                    background: rgba(99, 102, 241, 0.15);
                    color: #a5b4fc;
                    font-size: 10px;
                    padding: 3px 8px;
                    border-radius: 8px;
                }

                .photo-strip {
                    display: flex;
                    gap: 6px;
                    margin-top: 10px;
                }

                .photo-thumb {
                    width: 52px;
                    height: 52px;
                    border-radius: 8px;
                    object-fit: cover;
                    border: 1px solid rgba(255,255,255,0.2);
                }

                .menu-section {
                    margin-top: 10px;
                }

                .menu-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .menu-item {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    font-size: 10px;
                    color: rgba(255,255,255,0.8);
                }

                .menu-price {
                    color: rgba(255,255,255,0.6);
                }

                .review-section {
                    margin-top: 10px;
                }

                .review-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .review-item {
                    background: rgba(255,255,255,0.08);
                    padding: 8px;
                    border-radius: 8px;
                }

                .review-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    margin-bottom: 4px;
                    color: rgba(255,255,255,0.7);
                }

                .review-text {
                    font-size: 10px;
                    color: rgba(255,255,255,0.8);
                }

                .section-title {
                    font-size: 10px;
                    color: rgba(255,255,255,0.7);
                    margin-bottom: 6px;
                }

                .card-actions {
                    display: flex;
                    gap: 6px;
                    padding: 0 14px 14px;
                }

                .action-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    padding: 10px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 500;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .action-btn.dianping {
                    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                    color: white;
                }

                .action-btn.phone {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }

                .action-btn.book {
                    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                    color: white;
                }

                .action-btn:hover {
                    transform: scale(1.02);
                    filter: brightness(1.1);
                }

                .pagination-dots {
                    display: flex;
                    justify-content: center;
                    gap: 6px;
                    padding: 8px 0 14px;
                }

                .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .dot.active {
                    width: 20px;
                    border-radius: 3px;
                    background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
                }

                .dot:hover:not(.active) {
                    background: rgba(255,255,255,0.4);
                }

                /* Smart Suggestions Bar */
                .smart-suggestions {
                    padding: 12px 14px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    background: rgba(0,0,0,0.2);
                }

                .suggestion-section {
                    margin-bottom: 10px;
                }

                .suggestion-section:last-child {
                    margin-bottom: 0;
                }

                .section-label {
                    display: block;
                    color: rgba(255,255,255,0.5);
                    font-size: 10px;
                    margin-bottom: 6px;
                    font-weight: 500;
                }

                .suggestion-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .suggestion-chip {
                    padding: 6px 12px;
                    border-radius: 16px;
                    font-size: 11px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .suggestion-chip.query {
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
                    color: #93c5fd;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }

                .suggestion-chip.query:hover {
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(147, 51, 234, 0.4) 100%);
                    color: white;
                    transform: translateY(-1px);
                }

                .suggestion-chip.action {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(34, 197, 94, 0.2) 100%);
                    color: #86efac;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .suggestion-chip.action:hover {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(34, 197, 94, 0.4) 100%);
                    color: white;
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
};

export default ToolResultCard;
