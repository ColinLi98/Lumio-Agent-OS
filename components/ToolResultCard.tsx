import React from 'react';
import { ToolResultData } from '../types';
import { Cloud, Calculator, Languages, Calendar, Bell, Search, AlertCircle, Check, X, PenLine, Brain, ShoppingCart, ExternalLink, Camera, Copy, MapPin, Phone } from 'lucide-react';

interface ToolResultCardProps {
    result: ToolResultData;
    summary?: string;
    onDismiss?: () => void;
    onDraftClick?: (draft: { id: string; text: string; tone: string }) => void;
}

export const ToolResultCard: React.FC<ToolResultCardProps> = ({ result, summary, onDismiss, onDraftClick }) => {
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

    // Render based on display type
    switch (result.displayType) {
        case 'weather':
            return <WeatherCard data={result.data} onDismiss={onDismiss} />;
        case 'calculator':
            return <CalculatorCard data={result.data} onDismiss={onDismiss} />;
        case 'translation':
            return <TranslationCard data={result.data} onDismiss={onDismiss} />;
        case 'calendar':
            return <CalendarCard data={result.data} onDismiss={onDismiss} />;
        case 'reminder':
            return <ReminderCard data={result.data} onDismiss={onDismiss} />;
        // 三大核心功能卡片
        case 'write_assist':
            return <WriteAssistCard data={result.data} onDismiss={onDismiss} onDraftClick={onDraftClick} />;
        case 'memory':
            return <MemoryCard data={result.data} onDismiss={onDismiss} />;
        case 'quick_actions':
            return <QuickActionsCard data={result.data} onDismiss={onDismiss} />;
        case 'ocr_result':
            return <OCRResultCard data={result.data} onDismiss={onDismiss} />;
        default:
            return <TextCard data={result.data} summary={summary} onDismiss={onDismiss} />;
    }
};

// Weather Card
const WeatherCard: React.FC<{ data: any; onDismiss?: () => void }> = ({ data, onDismiss }) => (
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
const TextCard: React.FC<{ data: any; summary?: string; onDismiss?: () => void }> = ({ data, summary, onDismiss }) => (
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

export default ToolResultCard;

