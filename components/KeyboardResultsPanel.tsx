import React, { useState } from 'react';
import {
    X,
    ChevronUp,
    ChevronDown,
    ExternalLink,
    Copy,
    Check,
    Search,
    FileText,
    ShoppingBag,
    MapPin,
    Calendar,
    Sparkles
} from 'lucide-react';
import { AgentOutput, TextDraft, ServiceCard } from '../types';

interface KeyboardResultsPanelProps {
    output: AgentOutput | null;
    isLoading: boolean;
    onDraftClick: (draft: TextDraft) => void;
    onCardClick: (card: ServiceCard) => void;
    onViewInApp: () => void;
    onClear: () => void;
}

/**
 * KeyboardResultsPanel - Enhanced inline results display above keyboard
 * Shows AI responses, search results, cards in a compact, scrollable format
 */
export const KeyboardResultsPanel: React.FC<KeyboardResultsPanelProps> = ({
    output,
    isLoading,
    onDraftClick,
    onCardClick,
    onViewInApp,
    onClear
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Don't render if no output and not loading
    if (!output && !isLoading) return null;

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 border-t border-indigo-500">
                <div className="px-4 py-3 flex items-center justify-center gap-3">
                    <div className="relative">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <Sparkles size={12} className="absolute inset-0 m-auto text-white animate-pulse" />
                    </div>
                    <span className="text-white font-medium text-sm">Lumi is thinking...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (output?.type === 'ERROR') {
        return (
            <div className="bg-red-500/10 border-t border-red-500/20">
                <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-red-400 text-sm">{output.message || 'An error occurred'}</span>
                    <button onClick={onClear} className="text-red-400 hover:text-red-300">
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    }

    // No content
    if (output?.type === 'NONE') return null;

    return (
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-t border-slate-700 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-xs font-medium text-slate-300">Lumi Results</span>
                    {output?.type && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                            {output.type}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button
                        onClick={onViewInApp}
                        className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                        title="View in App"
                    >
                        <ExternalLink size={14} />
                    </button>
                    <button
                        onClick={onClear}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="max-h-48 overflow-y-auto">
                    {/* Text Drafts */}
                    {output?.drafts && output.drafts.length > 0 && (
                        <div className="p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                                <FileText size={12} />
                                <span>Suggested Replies</span>
                            </div>
                            {output.drafts.map((draft) => (
                                <button
                                    key={draft.id}
                                    onClick={() => onDraftClick(draft)}
                                    className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all group"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <p className="text-sm text-white leading-relaxed">{draft.text}</p>
                                            {draft.tone && (
                                                <span className="text-xs text-slate-400 mt-1 inline-block">
                                                    {draft.tone}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopy(draft.text, draft.id);
                                                }}
                                                className="p-1 hover:bg-slate-600 rounded"
                                                title="Copy"
                                            >
                                                {copiedId === draft.id ? (
                                                    <Check size={14} className="text-green-400" />
                                                ) : (
                                                    <Copy size={14} className="text-slate-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Service Cards */}
                    {output?.cards && output.cards.length > 0 && (
                        <div className="p-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                                <Search size={12} />
                                <span>Results</span>
                            </div>
                            <div className="space-y-2">
                                {output.cards.slice(0, 3).map((card) => (
                                    <button
                                        key={card.id}
                                        onClick={() => onCardClick(card)}
                                        className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            {card.imageUri ? (
                                                <img
                                                    src={card.imageUri}
                                                    alt=""
                                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                    <CardIcon type={card.actionType} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate">
                                                    {card.title}
                                                </h4>
                                                {card.subtitle && (
                                                    <p className="text-xs text-slate-400 truncate">{card.subtitle}</p>
                                                )}
                                                {card.priceInfo && (
                                                    <p className="text-sm font-medium text-green-400 mt-1">
                                                        {card.priceInfo}
                                                    </p>
                                                )}
                                            </div>
                                            <ExternalLink size={14} className="text-slate-500 flex-shrink-0" />
                                        </div>
                                    </button>
                                ))}
                                {output.cards.length > 3 && (
                                    <button
                                        onClick={onViewInApp}
                                        className="w-full p-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                                    >
                                        View all {output.cards.length} results →
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tool Results */}
                    {output?.type === 'TOOL_RESULT' && output.result && (
                        <div className="p-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                                <Sparkles size={12} />
                                <span>{output.result.toolName || 'Tool Result'}</span>
                            </div>
                            <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                                {output.result.data?.summary && (
                                    <p className="text-sm text-white">{output.result.data.summary}</p>
                                )}
                                {output.result.displayType === 'ocr_result' && output.result.data?.extractedItems && (
                                    <div className="mt-2 space-y-1">
                                        {output.result.data.extractedItems.slice(0, 3).map((item: any, i: number) => (
                                            <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center text-purple-300">
                                                    {i + 1}
                                                </span>
                                                <span className="truncate">{item.value || item.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions Footer */}
                    {(output?.drafts?.length || output?.cards?.length) && (
                        <div className="px-3 py-2 border-t border-slate-700/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Tap to use result</span>
                            <button
                                onClick={onViewInApp}
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                Full view
                                <ExternalLink size={10} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper component for card icons
const CardIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'BUY':
        case 'SHOPPING':
            return <ShoppingBag size={20} className="text-purple-400" />;
        case 'MAP':
        case 'NAVIGATE':
            return <MapPin size={20} className="text-blue-400" />;
        case 'CALENDAR':
        case 'EVENT':
            return <Calendar size={20} className="text-orange-400" />;
        default:
            return <Search size={20} className="text-cyan-400" />;
    }
};

export default KeyboardResultsPanel;
