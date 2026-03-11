/**
 * PromotionDashboard - Lumi promotion agent management panel
 *
 * Features:
 * - Task management (create, review, publish)
 * - Content preview and editing
 * - Reddit health check
 * - Analytics overview
 * - Engagement opportunity scanner
 */

import React, { useState, useCallback } from 'react';
import {
    Send, Eye, RefreshCw, Plus, CheckCircle, XCircle,
    AlertTriangle, Clock, TrendingUp, MessageSquare,
    Globe, Zap, Edit3, Trash2, Search, BarChart3,
    Bot, Radio, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { PromotionAgent, promotionAgent } from '../services/promotionAgent.js';
import {
    PromotionTask,
    ContentType,
    ContentLanguage,
    ContentTone,
    LumiFeature,
    DEFAULT_SUBREDDIT_TARGETS,
} from '../services/promotionTypes.js';

// ============================================================================
// Design Tokens (matching project style)
// ============================================================================

const colors = {
    primary: '#818cf8',
    primaryDim: '#6366f140',
    accent: '#34d399',
    accentDim: '#34d39920',
    warning: '#fbbf24',
    warningDim: '#fbbf2420',
    error: '#ef4444',
    errorDim: '#ef444420',
    bg0: '#0B1120',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.12)',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
};

// ============================================================================
// Sub Components
// ============================================================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        pending: { color: colors.text3, bg: colors.bg3, label: 'Pending' },
        generating: { color: colors.primary, bg: colors.primaryDim, label: 'Generating...' },
        ready: { color: colors.warning, bg: colors.warningDim, label: 'Ready for Review' },
        publishing: { color: colors.primary, bg: colors.primaryDim, label: 'Publishing...' },
        published: { color: colors.accent, bg: colors.accentDim, label: 'Published ✓' },
        failed: { color: colors.error, bg: colors.errorDim, label: 'Failed' },
        cancelled: { color: colors.text3, bg: colors.bg3, label: 'Cancelled' },
    };

    const cfg = statusConfig[status] || statusConfig.pending;

    return (
        <span style={{
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 10,
            fontWeight: 600,
            color: cfg.color,
            backgroundColor: cfg.bg,
            letterSpacing: 0.5,
        }}>
            {cfg.label}
        </span>
    );
};

const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: string;
}> = ({ icon, label, value, subtitle, color = colors.primary }) => (
    <div style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.bg2,
        border: `1px solid ${colors.border}`,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ color }}>{icon}</div>
            <span style={{ fontSize: 10, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.text1 }}>{value}</div>
        {subtitle && <div style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>{subtitle}</div>}
    </div>
);

// ============================================================================
// Task Row Component
// ============================================================================

const TaskRow: React.FC<{
    task: PromotionTask;
    onPreview: (task: PromotionTask) => void;
    onPublish: (taskId: string) => void;
    onCancel: (taskId: string) => void;
}> = ({ task, onPreview, onPublish, onCancel }) => (
    <div style={{
        padding: '12px 14px',
        borderRadius: 10,
        backgroundColor: colors.bg2,
        border: `1px solid ${colors.border}`,
        marginBottom: 8,
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.text1, marginBottom: 3 }}>
                    {task.content?.title || task.request.topic || `${task.request.type} content`}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge status={task.status} />
                    <span style={{ fontSize: 10, color: colors.text3 }}>
                        r/{task.request.targetSubreddit}
                    </span>
                    <span style={{ fontSize: 10, color: colors.text3 }}>
                        · {task.request.type}
                    </span>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {task.content && (
                <button
                    onClick={() => onPreview(task)}
                    style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                        backgroundColor: colors.bg3, border: 'none', color: colors.text2, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <Eye size={10} /> Preview
                </button>
            )}
            {task.status === 'ready' && (
                <button
                    onClick={() => onPublish(task.id)}
                    style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                        backgroundColor: colors.primaryDim, border: 'none', color: colors.primary, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <Send size={10} /> Publish
                </button>
            )}
            {task.status === 'published' && task.result?.permalink && (
                <a
                    href={task.result.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                        backgroundColor: colors.accentDim, border: 'none', color: colors.accent,
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <ExternalLink size={10} /> View on Reddit
                </a>
            )}
            {['pending', 'ready', 'failed'].includes(task.status) && (
                <button
                    onClick={() => onCancel(task.id)}
                    style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                        backgroundColor: colors.errorDim, border: 'none', color: colors.error, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <Trash2 size={10} /> Cancel
                </button>
            )}
        </div>

        {/* Error message */}
        {task.error && (
            <div style={{
                marginTop: 6, padding: '6px 10px', borderRadius: 6,
                backgroundColor: colors.errorDim, fontSize: 10, color: colors.error,
            }}>
                ⚠️ {task.error}
            </div>
        )}
    </div>
);

// ============================================================================
// Content Preview Modal
// ============================================================================

const ContentPreview: React.FC<{
    task: PromotionTask;
    onClose: () => void;
    onEditBody: (taskId: string, body: string) => void;
    onApprove: (taskId: string) => void;
}> = ({ task, onClose, onEditBody, onApprove }) => {
    const [editing, setEditing] = useState(false);
    const [editedBody, setEditedBody] = useState(task.content?.body || '');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
        }}>
            <div style={{
                maxWidth: 600, width: '100%', maxHeight: '80vh',
                backgroundColor: colors.bg1, borderRadius: 16,
                border: `1px solid ${colors.border}`, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '14px 16px', borderBottom: `1px solid ${colors.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text1 }}>Content Preview</div>
                        <div style={{ fontSize: 10, color: colors.text3 }}>
                            r/{task.request.targetSubreddit} · {task.request.type} · {task.request.language}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: colors.text3, cursor: 'pointer', fontSize: 18,
                    }}>×</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                    <h3 style={{ color: colors.text1, fontSize: 16, marginBottom: 12 }}>
                        {task.content?.title}
                    </h3>
                    {editing ? (
                        <textarea
                            value={editedBody}
                            onChange={e => setEditedBody(e.target.value)}
                            style={{
                                width: '100%', minHeight: 200, padding: 12, borderRadius: 8,
                                backgroundColor: colors.bg2, border: `1px solid ${colors.border}`,
                                color: colors.text1, fontSize: 12, fontFamily: 'monospace', resize: 'vertical',
                            }}
                        />
                    ) : (
                        <pre style={{
                            color: colors.text2, fontSize: 12, lineHeight: 1.6,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {task.content?.body}
                        </pre>
                    )}

                    {/* Keywords */}
                    {task.content?.keywords && (
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {task.content.keywords.map((kw, i) => (
                                <span key={i} style={{
                                    padding: '2px 8px', borderRadius: 10, fontSize: 9,
                                    backgroundColor: colors.primaryDim, color: colors.primary,
                                }}>{kw}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{
                    padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
                    display: 'flex', gap: 8, justifyContent: 'flex-end',
                }}>
                    {editing ? (
                        <>
                            <button onClick={() => setEditing(false)} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                backgroundColor: colors.bg3, border: 'none', color: colors.text2, cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={() => {
                                onEditBody(task.id, editedBody);
                                setEditing(false);
                            }} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                backgroundColor: colors.primaryDim, border: 'none', color: colors.primary, cursor: 'pointer',
                            }}>Save Changes</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setEditing(true)} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                backgroundColor: colors.bg3, border: 'none', color: colors.text2, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <Edit3 size={12} /> Edit
                            </button>
                            <button onClick={() => onApprove(task.id)} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                background: colors.gradient, border: 'none', color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <CheckCircle size={12} /> Approve & Mark Ready
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Create Task Form
// ============================================================================

const CreateTaskForm: React.FC<{
    onSubmit: (request: {
        type: ContentType;
        language: ContentLanguage;
        tone: ContentTone;
        targetSubreddit: string;
        topic: string;
        lumiFeatures: LumiFeature[];
    }) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const [type, setType] = useState<ContentType>('tech_review');
    const [language, setLanguage] = useState<ContentLanguage>('en');
    const [tone, setTone] = useState<ContentTone>('analytical');
    const [subreddit, setSubreddit] = useState('AI_Agents');
    const [topic, setTopic] = useState('');

    const selectStyle: React.CSSProperties = {
        width: '100%', padding: '8px 10px', borderRadius: 8,
        backgroundColor: colors.bg3, border: `1px solid ${colors.border}`,
        color: colors.text1, fontSize: 12, outline: 'none',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 10, color: colors.text3, marginBottom: 4, display: 'block',
        textTransform: 'uppercase', letterSpacing: 0.5,
    };

    return (
        <div style={{
            padding: 14, borderRadius: 12, backgroundColor: colors.bg2,
            border: `1px solid ${colors.border}`, marginBottom: 12,
        }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text1, marginBottom: 12 }}>
                ✨ New Promotion Task
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                    <label style={labelStyle}>Content Type</label>
                    <select value={type} onChange={e => setType(e.target.value as ContentType)} style={selectStyle}>
                        <option value="tech_review">🔍 Tech Review</option>
                        <option value="tutorial">📖 Tutorial</option>
                        <option value="comparison">⚖️ Comparison</option>
                        <option value="discussion">💬 Discussion</option>
                        <option value="case_study">📋 Case Study</option>
                        <option value="ama">🎤 AMA</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Target Subreddit</label>
                    <select value={subreddit} onChange={e => setSubreddit(e.target.value)} style={selectStyle}>
                        {DEFAULT_SUBREDDIT_TARGETS.map(t => (
                            <option key={t.name} value={t.name}>r/{t.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Language</label>
                    <select value={language} onChange={e => setLanguage(e.target.value as ContentLanguage)} style={selectStyle}>
                        <option value="en">🇺🇸 English</option>
                        <option value="zh">🇨🇳 Chinese</option>
                        <option value="bilingual">🌐 Bilingual</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value as ContentTone)} style={selectStyle}>
                        <option value="analytical">📊 Analytical</option>
                        <option value="casual">😊 Casual</option>
                        <option value="professional">👔 Professional</option>
                        <option value="enthusiastic">🔥 Enthusiastic</option>
                        <option value="technical">🔧 Technical</option>
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Topic / Focus</label>
                <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g., AI-powered decision engines for everyday choices"
                    style={{
                        ...selectStyle,
                        width: 'calc(100% - 20px)',
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={onCancel} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 11,
                    backgroundColor: colors.bg3, border: 'none', color: colors.text2, cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={() => onSubmit({
                    type, language, tone, targetSubreddit: subreddit, topic,
                    lumiFeatures: ['smart_keyboard', 'decision_support', 'intent_commerce'],
                })} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: colors.gradient, border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <Zap size={12} /> Generate Content
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface PromotionDashboardProps {
    apiKey: string;
    agent?: PromotionAgent;
}

export const PromotionDashboard: React.FC<PromotionDashboardProps> = ({
    apiKey,
    agent = promotionAgent,
}) => {
    const [tasks, setTasks] = useState<PromotionTask[]>(agent.getAllTasks());
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [previewTask, setPreviewTask] = useState<PromotionTask | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'scan' | 'analytics'>('tasks');
    const [redditStatus, setRedditStatus] = useState<{ ok: boolean; username?: string; error?: string } | null>(null);
    const [scanResults, setScanResults] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const refreshTasks = useCallback(() => {
        setTasks(agent.getAllTasks());
    }, [agent]);

    const handleCreateTask = async (request: any) => {
        setIsGenerating(true);
        try {
            await agent.generateAndPublish(request, apiKey, { autoPublish: false });
            refreshTasks();
            setShowCreateForm(false);
        } catch (err) {
            console.error('[Dashboard] Content generation failed:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async (taskId: string) => {
        try {
            await agent.publishTask(taskId);
            refreshTasks();
        } catch (err) {
            console.error('[Dashboard] Publish failed:', err);
            refreshTasks();
        }
    };

    const handleApprove = (taskId: string) => {
        agent.markAsReviewed(taskId);
        refreshTasks();
        setPreviewTask(null);
    };

    const handleEditBody = (taskId: string, body: string) => {
        agent.updateContentBody(taskId, body);
        refreshTasks();
    };

    const handleCancel = (taskId: string) => {
        agent.cancelTask(taskId);
        refreshTasks();
    };

    const checkRedditHealth = async () => {
        const status = await agent.checkRedditHealth();
        setRedditStatus(status);
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const results = await agent.scanForOpportunities(apiKey, 5);
            setScanResults(results);
        } catch (err) {
            console.error('[Dashboard] Scan failed:', err);
        } finally {
            setIsScanning(false);
        }
    };

    const analytics = agent.getAnalytics();

    // Tab styles
    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: active ? 600 : 400,
        backgroundColor: active ? colors.primaryDim : 'transparent',
        color: active ? colors.primary : colors.text3,
        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
    });

    return (
        <div style={{ padding: 4 }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 14,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={20} color={colors.primary} />
                    <h2 style={{ color: colors.text1, fontSize: 16, fontWeight: 700, margin: 0 }}>
                        Promotion Agent
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 12,
                        backgroundColor: agent.isRedditConfigured() ? colors.accentDim : colors.warningDim,
                        fontSize: 9, fontWeight: 500,
                        color: agent.isRedditConfigured() ? colors.accent : colors.warning,
                    }}>
                        <Radio size={8} />
                        {agent.isRedditConfigured() ? 'Reddit connected' : 'Reddit not configured'}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                <button style={tabStyle(activeTab === 'tasks')} onClick={() => setActiveTab('tasks')}>
                    <MessageSquare size={10} style={{ marginRight: 4 }} /> Tasks
                </button>
                <button style={tabStyle(activeTab === 'scan')} onClick={() => setActiveTab('scan')}>
                    <Search size={10} style={{ marginRight: 4 }} /> Scan
                </button>
                <button style={tabStyle(activeTab === 'analytics')} onClick={() => setActiveTab('analytics')}>
                    <BarChart3 size={10} style={{ marginRight: 4 }} /> Analytics
                </button>
            </div>

            {/* ===== Tasks Tab ===== */}
            {activeTab === 'tasks' && (
                <>
                    {/* Metrics Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <MetricCard
                            icon={<Send size={14} />}
                            label="Posts"
                            value={analytics.totalPosts}
                            color={colors.primary}
                        />
                        <MetricCard
                            icon={<TrendingUp size={14} />}
                            label="Upvotes"
                            value={analytics.totalUpvotes}
                            color={colors.accent}
                        />
                        <MetricCard
                            icon={<MessageSquare size={14} />}
                            label="Comments"
                            value={analytics.totalComments}
                            color={colors.warning}
                        />
                    </div>

                    {/* Create Task */}
                    {showCreateForm ? (
                        <CreateTaskForm
                            onSubmit={handleCreateTask}
                            onCancel={() => setShowCreateForm(false)}
                        />
                    ) : (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            disabled={isGenerating}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 10, marginBottom: 12,
                                background: isGenerating ? colors.bg3 : colors.gradient,
                                border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                                cursor: isGenerating ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                opacity: isGenerating ? 0.7 : 1,
                            }}
                        >
                            {isGenerating ? (
                                <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                            ) : (
                                <><Plus size={14} /> New Promotion Task</>
                            )}
                        </button>
                    )}

                    {/* Task List */}
                    <div>
                        {tasks.length === 0 ? (
                            <div style={{
                                padding: 30, textAlign: 'center', color: colors.text3,
                                borderRadius: 12, backgroundColor: colors.bg2, border: `1px solid ${colors.border}`,
                            }}>
                                <Bot size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                                <div style={{ fontSize: 12 }}>No promotion tasks yet</div>
                                <div style={{ fontSize: 10, marginTop: 4 }}>Create your first task to get started</div>
                            </div>
                        ) : (
                            tasks.map(task => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    onPreview={setPreviewTask}
                                    onPublish={handlePublish}
                                    onCancel={handleCancel}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {/* ===== Scan Tab ===== */}
            {activeTab === 'scan' && (
                <div>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        style={{
                            width: '100%', padding: '10px', borderRadius: 10, marginBottom: 12,
                            background: isScanning ? colors.bg3 : colors.gradient,
                            border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
                            cursor: isScanning ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        {isScanning ? (
                            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scanning subreddits...</>
                        ) : (
                            <><Search size={14} /> Scan for Engagement Opportunities</>
                        )}
                    </button>

                    {scanResults.length > 0 ? (
                        scanResults.map((result, i) => (
                            <div key={i} style={{
                                padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                                backgroundColor: colors.bg2, border: `1px solid ${colors.border}`,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: colors.text1, marginBottom: 4 }}>
                                    {result.postTitle}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: colors.text3 }}>r/{result.subreddit}</span>
                                    <span style={{
                                        padding: '1px 6px', borderRadius: 8, fontSize: 9,
                                        backgroundColor: result.relevanceScore > 80 ? colors.accentDim : colors.warningDim,
                                        color: result.relevanceScore > 80 ? colors.accent : colors.warning,
                                    }}>
                                        {result.relevanceScore}% match
                                    </span>
                                </div>
                                <div style={{ fontSize: 10, color: colors.text3 }}>{result.reason}</div>
                            </div>
                        ))
                    ) : (
                        <div style={{
                            padding: 30, textAlign: 'center', color: colors.text3,
                            borderRadius: 12, backgroundColor: colors.bg2,
                        }}>
                            <Globe size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                            <div style={{ fontSize: 12 }}>Click scan to find engagement opportunities</div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== Analytics Tab ===== */}
            {activeTab === 'analytics' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <MetricCard icon={<Send size={14} />} label="Total Posts" value={analytics.totalPosts} />
                        <MetricCard icon={<TrendingUp size={14} />} label="Total Upvotes" value={analytics.totalUpvotes} color={colors.accent} />
                        <MetricCard icon={<MessageSquare size={14} />} label="Comments" value={analytics.totalComments} color={colors.warning} />
                        <MetricCard icon={<Eye size={14} />} label="Views" value={analytics.totalViews} color={colors.text2} />
                    </div>

                    {analytics.topPerformingSubreddits.length > 0 && (
                        <div style={{
                            padding: 14, borderRadius: 12, backgroundColor: colors.bg2,
                            border: `1px solid ${colors.border}`, marginBottom: 12,
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text1, marginBottom: 8 }}>
                                Top Subreddits
                            </div>
                            {analytics.topPerformingSubreddits.map((sub, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                                    borderBottom: i < analytics.topPerformingSubreddits.length - 1 ? `1px solid ${colors.border}` : 'none',
                                }}>
                                    <span style={{ fontSize: 11, color: colors.text2 }}>r/{sub.subreddit}</span>
                                    <span style={{ fontSize: 11, color: colors.accent }}>{sub.totalEngagement} engagement · {sub.postCount} posts</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {analytics.topPerformingSubreddits.length === 0 && (
                        <div style={{
                            padding: 30, textAlign: 'center', color: colors.text3,
                            borderRadius: 12, backgroundColor: colors.bg2,
                        }}>
                            <BarChart3 size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                            <div style={{ fontSize: 12 }}>No analytics data yet</div>
                            <div style={{ fontSize: 10, marginTop: 4 }}>Publish some content to start tracking</div>
                        </div>
                    )}
                </div>
            )}

            {/* Content Preview Modal */}
            {previewTask && (
                <ContentPreview
                    task={previewTask}
                    onClose={() => setPreviewTask(null)}
                    onEditBody={handleEditBody}
                    onApprove={handleApprove}
                />
            )}

            {/* CSS Animation */}
            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default PromotionDashboard;
