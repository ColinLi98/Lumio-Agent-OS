/**
 * LumiChat — In-app Agent Chat Interface
 *
 * When Agent Mode is activated from a third-party app (e.g. WeChat),
 * queries are redirected here instead of leaking into the third-party chat.
 * This component provides a private conversation interface between the user
 * and the Lumi Super Agent within the Lumi app itself.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SoulMatrix } from '../types';
import { getSuperAgent } from '../services/superAgentService';
import { ConversationMessage } from '../services/geminiService';
import {
    Send, User, Loader2, Trash2, MessageSquare, ExternalLink, Zap
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: number;
    text: string;
    from: 'user' | 'agent';
    timestamp: number;
    isLoading?: boolean;
    skillsUsed?: string[];
    confidence?: number;
    executionTimeMs?: number;
}

export interface LumiChatProps {
    soul: SoulMatrix;
    apiKey: string;
    onLog?: (log: string) => void;
    /** Incoming query injected from keyboard Agent Mode */
    pendingQuery?: string | null;
    onPendingQueryConsumed?: () => void;
    isDark?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHAT_STORAGE_KEY = 'lumi_agent_chat_history';

const colors = {
    bg1: '#0B1120',
    bg2: '#111827',
    bg3: '#1E293B',
    bg4: '#334155',
    primary: '#38BDF8',
    primaryDim: '#0EA5E9',
    primaryGlow: 'rgba(56, 189, 248, 0.12)',
    accent: '#818CF8',
    accentGlow: 'rgba(129, 140, 248, 0.10)',
    agentBubble: 'rgba(30, 41, 59, 0.85)',
    userBubble: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
    text1: '#F1F5F9',
    text2: '#CBD5E1',
    text3: '#64748B',
    text4: '#475569',
    border: 'rgba(148, 163, 184, 0.10)',
    borderActive: 'rgba(56, 189, 248, 0.30)',
    success: '#34D399',
    successGlow: 'rgba(52, 211, 153, 0.12)',
    glass: 'rgba(17, 24, 39, 0.75)',
    glassBorder: 'rgba(148, 163, 184, 0.08)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadChatHistory(): ChatMessage[] {
    try {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((m: ChatMessage) => !m.isLoading);
    } catch { return []; }
}

function saveChatHistory(messages: ChatMessage[]) {
    try {
        const toSave = messages.filter(m => !m.isLoading);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave.slice(-100)));
    } catch { /* ignore */ }
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Enhanced markdown → React renderer for agent chat bubbles.
 * Supports: **bold**, [text](url), bare URLs, * / - bullet lists,
 *           1. numbered lists, --- horizontal rules, ### headings
 */
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
        // Horizontal rule: --- or *** or ___
        if (/^\s*[-*_]{3,}\s*$/.test(line)) {
            elements.push(
                <div key={lineIdx} style={{
                    height: '1px', margin: '12px 0',
                    background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.25), transparent)',
                }} />
            );
            return;
        }

        // Heading: ### or ## or #
        const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const fontSize = level === 1 ? '1.05rem' : level === 2 ? '0.95rem' : '0.9rem';
            elements.push(
                <div key={lineIdx} style={{
                    fontWeight: 700, fontSize, color: colors.text1,
                    marginTop: lineIdx > 0 ? '12px' : '4px', marginBottom: '4px',
                    letterSpacing: '-0.01em',
                }}>
                    {parseInline(headingMatch[2])}
                </div>
            );
            return;
        }

        // Numbered list: 1. Item
        const numberedMatch = line.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (numberedMatch) {
            elements.push(
                <div key={lineIdx} style={{
                    display: 'flex', gap: '8px', marginLeft: '2px',
                    marginTop: lineIdx > 0 ? '4px' : 0,
                }}>
                    <span style={{
                        color: colors.primary, fontWeight: 600, fontSize: '0.82rem',
                        minWidth: '18px', textAlign: 'right', flexShrink: 0,
                        fontFeatureSettings: '"tnum"',
                    }}>
                        {numberedMatch[1]}.
                    </span>
                    <span style={{ flex: 1 }}>{parseInline(numberedMatch[2])}</span>
                </div>
            );
            return;
        }

        // Bullet point: lines starting with * or -
        const bulletMatch = line.match(/^\s*[*\-]\s+(.*)/);
        if (bulletMatch) {
            elements.push(
                <div key={lineIdx} style={{
                    display: 'flex', gap: '8px', marginLeft: '2px',
                    marginTop: lineIdx > 0 ? '3px' : 0,
                }}>
                    <span style={{
                        color: colors.primary, flexShrink: 0,
                        fontSize: '0.7rem', marginTop: '3px',
                    }}>●</span>
                    <span style={{ flex: 1 }}>{parseInline(bulletMatch[1])}</span>
                </div>
            );
            return;
        }

        // Empty line
        if (!line.trim()) {
            elements.push(<div key={lineIdx} style={{ height: '8px' }} />);
            return;
        }

        // Regular text
        if (lineIdx > 0 && elements.length > 0) elements.push(<br key={`br-${lineIdx}`} />);
        elements.push(<React.Fragment key={lineIdx}>{parseInline(line)}</React.Fragment>);
    });

    return <>{elements}</>;
}

function parseInline(text: string): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    // Combined regex: **bold**, [text](url), or bare URL
    const regex = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(https?:\/\/[^\s)]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
        // Text before match
        if (match.index > lastIndex) {
            result.push(text.slice(lastIndex, match.index));
        }

        if (match[1]) {
            // **bold**
            result.push(
                <strong key={`b-${idx}`} style={{ fontWeight: 600, color: colors.text1 }}>
                    {match[2]}
                </strong>
            );
        } else if (match[4] && match[5]) {
            // [text](url)
            result.push(
                <a key={`a-${idx}`} href={match[5]} target="_blank" rel="noopener noreferrer" style={{
                    color: colors.primary,
                    textDecoration: 'none',
                    borderBottom: `1px solid rgba(56, 189, 248, 0.3)`,
                    paddingBottom: '1px',
                    cursor: 'pointer',
                    wordBreak: 'break-all',
                    transition: 'border-color 0.2s',
                }}>
                    {match[4]}
                    <ExternalLink size={10} style={{
                        display: 'inline-block', marginLeft: '3px',
                        verticalAlign: 'middle', opacity: 0.6,
                    }} />
                </a>
            );
        } else if (match[6]) {
            // Bare URL
            const url = match[6];
            const label = url.length > 45 ? url.slice(0, 43) + '…' : url;
            result.push(
                <a key={`u-${idx}`} href={url} target="_blank" rel="noopener noreferrer" style={{
                    color: colors.primary,
                    textDecoration: 'none',
                    borderBottom: `1px solid rgba(56, 189, 248, 0.3)`,
                    paddingBottom: '1px',
                    cursor: 'pointer',
                    wordBreak: 'break-all',
                    transition: 'border-color 0.2s',
                }}>
                    {label}
                    <ExternalLink size={10} style={{
                        display: 'inline-block', marginLeft: '3px',
                        verticalAlign: 'middle', opacity: 0.6,
                    }} />
                </a>
            );
        }

        lastIndex = match.index + match[0].length;
        idx++;
    }

    // Remaining text
    if (lastIndex < text.length) {
        result.push(text.slice(lastIndex));
    }

    return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const LumiChat: React.FC<LumiChatProps> = ({
    soul,
    apiKey,
    onLog,
    pendingQuery,
    onPendingQueryConsumed,
    isDark = true,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [conversationContext, setConversationContext] = useState<ConversationMessage[]>([]);
    const [inputFocused, setInputFocused] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingQueryProcessed = useRef(false);

    // Persist messages
    useEffect(() => {
        saveChatHistory(messages);
    }, [messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ─── Handle incoming query from keyboard Agent Mode ──────────────
    useEffect(() => {
        if (pendingQuery && !pendingQueryProcessed.current && !isProcessing) {
            pendingQueryProcessed.current = true;
            handleSend(pendingQuery);
            onPendingQueryConsumed?.();
        }
        if (!pendingQuery) {
            pendingQueryProcessed.current = false;
        }
    }, [pendingQuery]);

    // ─── Send message ────────────────────────────────────────────────
    const handleSend = useCallback(async (overrideText?: string) => {
        const text = (overrideText || inputValue).trim();
        if (!text || isProcessing) return;

        const userMsg: ChatMessage = {
            id: Date.now(),
            text,
            from: 'user',
            timestamp: Date.now(),
        };

        const loadingMsg: ChatMessage = {
            id: Date.now() + 1,
            text: '',
            from: 'agent',
            timestamp: Date.now(),
            isLoading: true,
        };

        setMessages(prev => [...prev, userMsg, loadingMsg]);
        setInputValue('');
        setIsProcessing(true);

        const updatedContext: ConversationMessage[] = [
            ...conversationContext,
            { role: 'user' as const, content: text },
        ];

        onLog?.(`[Lumi Chat] 接收问题: "${text}"`);

        try {
            const superAgent = getSuperAgent();
            superAgent.setApiKey(apiKey);

            const solution = await superAgent.solve(text, {
                userId: 'user',
                preferences: soul,
                recentQueries: updatedContext.slice(-5).map(m => m.content),
                currentApp: 'lumi_chat',
                conversationHistory: updatedContext,
            });

            onLog?.(`[Lumi Chat] 完成: ${solution.skillsUsed.length} Skills, ${(solution.confidence * 100).toFixed(0)}% confidence, ${solution.executionTimeMs}ms`);

            const newContext: ConversationMessage[] = [
                ...updatedContext,
                { role: 'assistant' as const, content: solution.answer || '' },
            ];
            setConversationContext(newContext);

            const agentMsg: ChatMessage = {
                id: Date.now() + 2,
                text: solution.answer || '已为你处理完成。',
                from: 'agent',
                timestamp: Date.now(),
                skillsUsed: solution.skillsUsed,
                confidence: solution.confidence,
                executionTimeMs: solution.executionTimeMs,
            };

            setMessages(prev => prev.filter(m => !m.isLoading).concat(agentMsg));

        } catch (err) {
            onLog?.(`[Lumi Chat] 错误: ${err}`);
            const errorMsg: ChatMessage = {
                id: Date.now() + 2,
                text: `抱歉，处理时出现错误: ${err instanceof Error ? err.message : String(err)}`,
                from: 'agent',
                timestamp: Date.now(),
            };
            setMessages(prev => prev.filter(m => !m.isLoading).concat(errorMsg));
        } finally {
            setIsProcessing(false);
        }
    }, [inputValue, isProcessing, conversationContext, apiKey, soul, onLog]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        setMessages([]);
        setConversationContext([]);
        localStorage.removeItem(CHAT_STORAGE_KEY);
    };

    // ─── Render ──────────────────────────────────────────────────────

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            background: `linear-gradient(180deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`,
        }}>
            {/* ── Inject keyframes ───────────────────────────────── */}
            <style>{`
                @keyframes lumiFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes lumiPulse {
                    0%, 100% { opacity: 0.4; }
                    50%      { opacity: 1; }
                }
                @keyframes lumiFloat {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-4px); }
                }
                @keyframes lumiSpin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .lumi-chat-bubble { animation: lumiFadeIn 0.35s ease-out both; }
                .lumi-chat-link:hover { border-color: rgba(56, 189, 248, 0.6) !important; }
                .lumi-clear-btn:hover { color: #F87171 !important; background: rgba(248,113,113,0.1) !important; }
                .lumi-send-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 0 16px rgba(56, 189, 248, 0.3); }
                .lumi-input-wrapper:focus-within { border-color: ${colors.borderActive} !important; box-shadow: 0 0 0 3px ${colors.primaryGlow}; }
            `}</style>

            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${colors.glassBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: colors.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        position: 'relative',
                        width: '40px', height: '40px',
                    }}>
                        <img src="/lumi-logo.jpg" alt="Lumi" style={{
                            width: '40px', height: '40px', borderRadius: '14px',
                            objectFit: 'cover',
                            boxShadow: '0 2px 12px rgba(56, 189, 248, 0.15)',
                        }} />
                        {/* Online indicator */}
                        <div style={{
                            position: 'absolute', bottom: '-1px', right: '-1px',
                            width: '12px', height: '12px', borderRadius: '50%',
                            background: isProcessing
                                ? `conic-gradient(${colors.primary}, transparent)`
                                : colors.success,
                            border: `2px solid ${colors.bg2}`,
                            ...(isProcessing ? { animation: 'lumiSpin 1s linear infinite' } : {}),
                        }} />
                    </div>
                    <div>
                        <div style={{
                            color: colors.text1, fontWeight: 700, fontSize: '0.95rem',
                            letterSpacing: '-0.01em',
                        }}>
                            Lumi Agent
                        </div>
                        <div style={{
                            color: isProcessing ? colors.primary : colors.text3,
                            fontSize: '0.72rem', marginTop: '1px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            {isProcessing ? (
                                <>
                                    <span style={{
                                        display: 'inline-flex', gap: '2px',
                                    }}>
                                        {[0, 1, 2].map(i => (
                                            <span key={i} style={{
                                                width: '3px', height: '3px', borderRadius: '50%',
                                                background: colors.primary,
                                                animation: `lumiPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                            }} />
                                        ))}
                                    </span>
                                    正在思考
                                </>
                            ) : (
                                '在线 · Super Agent'
                            )}
                        </div>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="lumi-clear-btn"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.text4, padding: '8px', borderRadius: '10px',
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title="清除聊天记录"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* ── Messages ───────────────────────────────────────── */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {/* ── Empty State ─────────────────────────────── */}
                {messages.length === 0 && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        padding: '48px 24px',
                        animation: 'lumiFadeIn 0.5s ease-out',
                    }}>
                        {/* Animated logo */}
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '24px',
                            background: `linear-gradient(135deg, ${colors.primaryGlow}, ${colors.accentGlow})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'lumiFloat 3s ease-in-out infinite',
                            boxShadow: `0 8px 32px rgba(56, 189, 248, 0.08)`,
                        }}>
                            <img src="/lumi-logo.jpg" alt="Lumi" style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                objectFit: 'cover',
                            }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                color: colors.text1, fontWeight: 700, fontSize: '1.05rem',
                                marginBottom: '8px', letterSpacing: '-0.01em',
                            }}>
                                Lumi Agent Chat
                            </div>
                            <div style={{
                                color: colors.text3, fontSize: '0.82rem',
                                lineHeight: 1.6, maxWidth: '280px',
                            }}>
                                在任意 App 中长按<span style={{
                                    display: 'inline-block',
                                    padding: '1px 6px', margin: '0 3px',
                                    borderRadius: '4px', fontSize: '0.72rem',
                                    background: colors.bg3, color: colors.text2,
                                    border: `1px solid ${colors.border}`,
                                    fontWeight: 500,
                                }}>空格</span>激活 Agent 模式
                                <br />
                                问题将自动在此回答
                            </div>
                        </div>
                        {/* Quick suggestion chips */}
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '8px',
                            justifyContent: 'center', marginTop: '8px',
                        }}>
                            {['帮我搜索机票', '推荐一家餐厅', '分析我的习惯'].map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => handleSend(suggestion)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '20px',
                                        border: `1px solid ${colors.border}`,
                                        background: colors.bg3,
                                        color: colors.text2,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = colors.borderActive;
                                        e.currentTarget.style.color = colors.primary;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = colors.border;
                                        e.currentTarget.style.color = colors.text2;
                                    }}
                                >
                                    <Zap size={12} />
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Message Bubbles ─────────────────────────── */}
                {messages.map((msg, msgIdx) => (
                    <div
                        key={msg.id}
                        className="lumi-chat-bubble"
                        style={{
                            display: 'flex',
                            justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-start',
                            gap: '10px',
                            animationDelay: `${msgIdx * 0.03}s`,
                        }}
                    >
                        {/* Agent avatar */}
                        {msg.from === 'agent' && (
                            <div style={{
                                flexShrink: 0, marginTop: '2px',
                                width: '32px', height: '32px', borderRadius: '11px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}>
                                <img src="/lumi-logo.jpg" alt="Lumi" style={{
                                    width: '32px', height: '32px',
                                    objectFit: 'cover',
                                }} />
                            </div>
                        )}

                        {/* Bubble */}
                        <div style={{
                            maxWidth: '80%',
                            ...(msg.from === 'user'
                                ? {
                                    padding: '10px 16px',
                                    borderRadius: '18px 18px 4px 18px',
                                    background: colors.userBubble,
                                    color: '#fff',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.55,
                                    boxShadow: '0 2px 12px rgba(14, 165, 233, 0.2)',
                                }
                                : {
                                    padding: msg.isLoading ? '14px 18px' : '14px 18px',
                                    borderRadius: '18px 18px 18px 4px',
                                    background: colors.agentBubble,
                                    backdropFilter: 'blur(8px)',
                                    color: colors.text2,
                                    fontSize: '0.86rem',
                                    lineHeight: 1.65,
                                    border: `1px solid ${colors.glassBorder}`,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                                }),
                            wordBreak: 'break-word',
                        }}>
                            {msg.isLoading ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    color: colors.text3,
                                }}>
                                    <div style={{
                                        width: '16px', height: '16px',
                                        animation: 'lumiSpin 1s linear infinite',
                                    }}>
                                        <Loader2 size={16} />
                                    </div>
                                    <span style={{ fontSize: '0.82rem' }}>正在思考...</span>
                                </div>
                            ) : (
                                <>
                                    {msg.from === 'agent' ? renderMarkdown(msg.text) : msg.text}
                                    {/* ── Meta tags ─────────────── */}
                                    {msg.from === 'agent' && msg.skillsUsed && msg.skillsUsed.length > 0 && (
                                        <div style={{
                                            marginTop: '12px',
                                            paddingTop: '10px',
                                            borderTop: `1px solid ${colors.border}`,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            alignItems: 'center',
                                        }}>
                                            {msg.skillsUsed.map((skill, i) => (
                                                <span key={i} style={{
                                                    fontSize: '0.65rem',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    background: colors.primaryGlow,
                                                    color: colors.primary,
                                                    fontWeight: 600,
                                                    letterSpacing: '0.02em',
                                                }}>
                                                    {skill}
                                                </span>
                                            ))}
                                            {msg.confidence != null && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    background: colors.successGlow,
                                                    color: colors.success,
                                                    fontWeight: 600,
                                                }}>
                                                    {(msg.confidence * 100).toFixed(0)}%
                                                </span>
                                            )}
                                            {msg.executionTimeMs != null && (
                                                <span style={{
                                                    fontSize: '0.62rem',
                                                    color: colors.text4,
                                                    marginLeft: '2px',
                                                }}>
                                                    {(msg.executionTimeMs / 1000).toFixed(1)}s
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* User avatar */}
                        {msg.from === 'user' && (
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '11px',
                                background: `linear-gradient(135deg, ${colors.bg3}, ${colors.bg4})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: '2px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            }}>
                                <User size={15} color={colors.text2} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input bar ──────────────────────────────────────── */}
            <div style={{
                padding: '12px 16px 14px',
                borderTop: `1px solid ${colors.glassBorder}`,
                background: colors.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                flexShrink: 0,
            }}>
                <div
                    className="lumi-input-wrapper"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '4px 5px 4px 18px',
                        borderRadius: '26px',
                        backgroundColor: colors.bg1,
                        border: `1px solid ${colors.border}`,
                        transition: 'all 0.25s ease',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        placeholder="输入问题..."
                        disabled={isProcessing}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: colors.text1,
                            fontSize: '0.88rem',
                            padding: '10px 0',
                            caretColor: colors.primary,
                        }}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isProcessing}
                        className="lumi-send-btn"
                        style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: inputValue.trim() && !isProcessing
                                ? `linear-gradient(135deg, ${colors.primaryDim}, ${colors.accent})`
                                : colors.bg3,
                            border: 'none',
                            cursor: inputValue.trim() && !isProcessing ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease',
                            flexShrink: 0,
                        }}
                    >
                        <Send size={16} color={
                            inputValue.trim() && !isProcessing ? '#fff' : colors.text4
                        } style={{
                            transform: 'translateX(1px)',
                        }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LumiChat;
