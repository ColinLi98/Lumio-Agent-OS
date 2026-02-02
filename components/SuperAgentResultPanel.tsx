/**
 * Super Agent Result Panel - 结果可视化面板
 * 
 * 在 App 视图中显示 Super Agent 的结构化结果
 */

import React from 'react';
import {
    ShoppingCart, Search, Brain, Languages, Calculator,
    Clock, MessageCircle, ExternalLink, TrendingDown, Star,
    CheckCircle, AlertCircle, Sparkles, Zap
} from 'lucide-react';
import OfferComparisonCard from './OfferComparisonCard';

// ============================================================================
// Types
// ============================================================================

export interface SkillResultData {
    skillId?: string;           // 可选，因为 SkillResult 不包含此字段
    skillName?: string;         // 可选，因为 SkillResult 不包含此字段
    success: boolean;
    confidence: number;
    data: any;
    error?: string;
    sources?: string[];
    executionTimeMs?: number;
}

export interface SuperAgentResult {
    question: string;
    answer: string;
    skillsUsed: string[];
    results: SkillResultData[];
    confidence: number;
    executionTimeMs: number;
    reasoning?: string;
    timestamp: number;
}

interface SuperAgentResultPanelProps {
    result: SuperAgentResult | null;
    onClose?: () => void;
    onFollowUp?: (question: string) => void;
    onOpenInMarket?: (intentId: string) => void;  // Deep link to LIX Market
}

// ============================================================================
// Design Tokens
// ============================================================================

const colors = {
    primary: '#0EA5E9',
    primaryMuted: 'rgba(14, 165, 233, 0.15)',
    positive: '#10B981',
    positiveMuted: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    bg1: '#0F172A',
    bg2: '#1E293B',
    bg3: '#334155',
    text1: '#F8FAFC',
    text2: '#CBD5E1',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Skill Icon Mapping
// ============================================================================

const skillIcons: Record<string, any> = {
    'price_compare': ShoppingCart,
    'web_search': Search,
    'memory': Brain,
    'translate': Languages,
    'calculate': Calculator,
    'schedule': Clock,
    'general_qa': MessageCircle,
    'broadcast_intent': Zap,
};

// ============================================================================
// Markdown Renderer - 简单 Markdown 渲染组件
// ============================================================================

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    // 将 markdown 文本解析为 React 元素
    const renderMarkdown = (content: string) => {
        // 按行分割
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let currentParagraph: string[] = [];

        const flushParagraph = () => {
            if (currentParagraph.length > 0) {
                const text = currentParagraph.join(' ');
                elements.push(
                    <p key={elements.length} style={{ marginBottom: 12 }}>
                        {renderInlineMarkdown(text)}
                    </p>
                );
                currentParagraph = [];
            }
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // 空行 - 分段
            if (!trimmedLine) {
                flushParagraph();
                return;
            }

            // ### 标题
            if (trimmedLine.startsWith('### ')) {
                flushParagraph();
                elements.push(
                    <h4 key={elements.length} style={{
                        color: colors.primary,
                        fontSize: 15,
                        fontWeight: 600,
                        marginTop: 16,
                        marginBottom: 8,
                        borderBottom: `1px solid ${colors.border}`,
                        paddingBottom: 4,
                    }}>
                        {renderInlineMarkdown(trimmedLine.slice(4))}
                    </h4>
                );
                return;
            }

            // ## 标题
            if (trimmedLine.startsWith('## ')) {
                flushParagraph();
                elements.push(
                    <h3 key={elements.length} style={{
                        color: colors.text1,
                        fontSize: 16,
                        fontWeight: 700,
                        marginTop: 20,
                        marginBottom: 10,
                    }}>
                        {renderInlineMarkdown(trimmedLine.slice(3))}
                    </h3>
                );
                return;
            }

            // 有序列表 (1. 2. 3.)
            const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
            if (orderedMatch) {
                flushParagraph();
                elements.push(
                    <div key={elements.length} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 8,
                        paddingLeft: 4,
                    }}>
                        <span style={{
                            color: colors.primary,
                            fontWeight: 600,
                            minWidth: 20,
                        }}>
                            {orderedMatch[1]}.
                        </span>
                        <span style={{ flex: 1 }}>
                            {renderInlineMarkdown(orderedMatch[2])}
                        </span>
                    </div>
                );
                return;
            }

            // 无序列表 (- * •) - 但不要把 `* **bold**` 当作列表
            const isBulletList = (
                trimmedLine.startsWith('- ') ||
                trimmedLine.startsWith('• ') ||
                (trimmedLine.startsWith('* ') && !trimmedLine.startsWith('* **'))
            );
            if (isBulletList) {
                flushParagraph();
                elements.push(
                    <div key={elements.length} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 8,
                        paddingLeft: 4,
                    }}>
                        <span style={{ color: colors.primary }}>•</span>
                        <span style={{ flex: 1 }}>
                            {renderInlineMarkdown(trimmedLine.slice(2))}
                        </span>
                    </div>
                );
                return;
            }

            // 普通文本 - 收集到段落
            currentParagraph.push(trimmedLine);
        });

        // 处理最后的段落
        flushParagraph();

        return elements;
    };

    // 渲染行内 markdown（**粗体**、*斜体*）
    const renderInlineMarkdown = (text: string): React.ReactNode => {
        // 处理 **粗体**
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={i} style={{ color: colors.text1, fontWeight: 600 }}>
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            return part;
        });
    };

    return (
        <div style={{
            color: colors.text2,
            fontSize: 14,
            lineHeight: 1.7,
        }}>
            {renderMarkdown(text)}
        </div>
    );
};

// 🆕 继续对话输入框组件
const FollowUpInput: React.FC<{ onSubmit: (question: string) => void }> = ({ onSubmit }) => {
    const [input, setInput] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = () => {
        if (input.trim() && !isSubmitting) {
            setIsSubmitting(true);
            onSubmit(input.trim());
            setInput('');
            // 短暂延迟后重置状态
            setTimeout(() => setIsSubmitting(false), 500);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
        }}>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的问题..."
                disabled={isSubmitting}
                style={{
                    flex: 1,
                    background: colors.bg2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 20,
                    padding: '10px 16px',
                    color: colors.text1,
                    fontSize: 14,
                    outline: 'none',
                }}
            />
            <button
                onClick={handleSubmit}
                disabled={!input.trim() || isSubmitting}
                style={{
                    background: input.trim() ? colors.primary : colors.bg3,
                    color: colors.text1,
                    border: 'none',
                    borderRadius: 20,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    opacity: input.trim() ? 1 : 0.5,
                    transition: 'all 0.2s',
                }}
            >
                {isSubmitting ? '发送中...' : '发送'}
            </button>
        </div>
    );
};

// 价格对比卡片 - 支持产品变体和可点击链接
const PriceCompareCard: React.FC<{ data: any }> = ({ data }) => {
    // 支持新格式 (products 数组) 和旧格式 (results/prices 数组)
    const products = data?.products;
    const legacyPrices = data?.results || data?.prices;

    // 如果是新格式（有 products 数组）
    if (products && Array.isArray(products) && products.length > 0) {
        return (
            <div style={{
                background: colors.bg2,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
            }}>
                {/* 头部信息 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12
                }}>
                    <ShoppingCart size={18} color={colors.primary} />
                    <span style={{ color: colors.text1, fontWeight: 600 }}>价格对比</span>
                    {data.brand && (
                        <span style={{ color: colors.text3, fontSize: 12 }}>
                            {data.brand}
                        </span>
                    )}
                    {data.lowestPrice && typeof data.lowestPrice === 'number' && !isNaN(data.lowestPrice) && (
                        <span style={{
                            background: colors.positiveMuted,
                            color: colors.positive,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            marginLeft: 'auto',
                        }}>
                            最低 ¥{data.lowestPrice}
                        </span>
                    )}
                </div>

                {/* 产品变体列表 */}
                {products.map((product: any, pIndex: number) => (
                    <div key={pIndex} style={{
                        marginBottom: pIndex < products.length - 1 ? 16 : 0,
                        border: `1px solid ${colors.bg3}`,
                        borderRadius: 10,
                        overflow: 'hidden'
                    }}>
                        {/* 产品型号和规格 */}
                        <div style={{
                            background: colors.bg3,
                            padding: '10px 12px',
                            borderBottom: `1px solid ${colors.bg1}`
                        }}>
                            <div style={{
                                color: colors.text1,
                                fontWeight: 600,
                                fontSize: 14,
                                marginBottom: product.specs ? 4 : 0
                            }}>
                                🎧 {product.model}
                            </div>
                            {product.specs && (
                                <div style={{
                                    color: colors.text3,
                                    fontSize: 12
                                }}>
                                    {product.specs}
                                </div>
                            )}
                        </div>

                        {/* 平台价格列表 */}
                        <div style={{ padding: 8 }}>
                            {(product.platforms || [])
                                // 过滤掉无效的平台数据
                                .filter((plat: any) =>
                                    plat.name &&
                                    typeof plat.price === 'number' &&
                                    !isNaN(plat.price) &&
                                    plat.price > 0
                                )
                                .map((plat: any, platIndex: number, filteredPlatforms: any[]) => {
                                    const isLowest = plat.price === Math.min(...filteredPlatforms.map((p: any) => p.price));
                                    return (
                                        <div
                                            key={platIndex}
                                            onClick={() => plat.url && window.open(plat.url, '_blank')}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 10px',
                                                marginBottom: platIndex < filteredPlatforms.length - 1 ? 4 : 0,
                                                background: isLowest ? colors.positiveMuted : 'transparent',
                                                borderRadius: 6,
                                                cursor: plat.url ? 'pointer' : 'default',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {isLowest && <Star size={14} color={colors.positive} />}
                                                <span style={{ color: colors.text1, fontWeight: 500 }}>
                                                    {plat.name}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{
                                                    color: isLowest ? colors.positive : colors.text1,
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                }}>
                                                    ¥{plat.price}
                                                </span>
                                                {plat.url && (
                                                    <ExternalLink size={14} color={colors.text3} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}

                {/* 推荐信息 */}
                {data?.recommendation && (
                    <div style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        background: colors.primaryMuted,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <TrendingDown size={16} color={colors.primary} />
                        <span style={{ color: colors.primary, fontSize: 13 }}>
                            {data.recommendation}
                        </span>
                    </div>
                )}

                {/* 估算提示 */}
                {data?.isEstimate && (
                    <div style={{
                        marginTop: 8,
                        color: colors.text3,
                        fontSize: 11,
                        textAlign: 'center'
                    }}>
                        * 以上为估算价格，点击链接查看实时价格
                    </div>
                )}
            </div>
        );
    }

    // 旧格式兼容处理
    if (!legacyPrices || !Array.isArray(legacyPrices) || legacyPrices.length === 0) return null;

    const lowestPrice = Math.min(...legacyPrices.map((p: any) => p.price));
    const productName = data?.product || data?.query || '商品';
    const category = data?.category || '';

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
            }}>
                <ShoppingCart size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>价格对比</span>
                {category && (
                    <span style={{ color: colors.text3, fontSize: 12 }}>
                        {category}
                    </span>
                )}
                <span style={{
                    background: colors.positiveMuted,
                    color: colors.positive,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    marginLeft: 'auto',
                }}>
                    最低 ¥{lowestPrice}
                </span>
            </div>

            {productName && productName !== '商品' && (
                <div style={{
                    color: colors.text2,
                    fontSize: 13,
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: colors.bg3,
                    borderRadius: 8,
                }}>
                    🏷️ {productName}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {legacyPrices.map((item: any, i: number) => (
                    <div
                        key={i}
                        onClick={() => item.url && window.open(item.url, '_blank')}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: item.price === lowestPrice ? colors.positiveMuted : colors.bg3,
                            borderRadius: 8,
                            border: item.price === lowestPrice ? `1px solid ${colors.positive}` : 'none',
                            cursor: item.url ? 'pointer' : 'default',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {item.price === lowestPrice && <Star size={14} color={colors.positive} />}
                            <span style={{ fontSize: 16 }}>{item.icon || '🛒'}</span>
                            <span style={{ color: colors.text1, fontWeight: 500 }}>{item.platform || item.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {item.originalPrice && item.originalPrice > item.price && (
                                <span style={{
                                    color: colors.text3,
                                    fontSize: 12,
                                    textDecoration: 'line-through',
                                }}>
                                    ¥{item.originalPrice}
                                </span>
                            )}
                            <span style={{
                                color: item.price === lowestPrice ? colors.positive : colors.text1,
                                fontWeight: 700,
                                fontSize: 16,
                            }}>
                                {item.currency || '¥'}{item.price}
                            </span>
                            {item.savings && item.savings > 0 && (
                                <span style={{
                                    background: colors.warningMuted,
                                    color: colors.warning,
                                    padding: '2px 6px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                }}>
                                    省¥{item.savings}
                                </span>
                            )}
                            {item.url && (
                                <ExternalLink size={14} color={colors.text3} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {data?.recommendation && (
                <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: colors.primaryMuted,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <TrendingDown size={16} color={colors.primary} />
                    <span style={{ color: colors.primary, fontSize: 13 }}>
                        {data.recommendation}
                    </span>
                </div>
            )}
        </div>
    );
};

// 搜索结果卡片
const SearchResultCard: React.FC<{ data: any }> = ({ data }) => {
    if (!data || !data.results) return null;

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
            }}>
                <Search size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>搜索结果</span>
                <span style={{ color: colors.text3, fontSize: 12 }}>
                    {data.results.length} 条
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.results.slice(0, 3).map((item: any, i: number) => (
                    <div
                        key={i}
                        style={{
                            padding: '10px 12px',
                            background: colors.bg3,
                            borderRadius: 8,
                            cursor: 'pointer',
                        }}
                        onClick={() => item.url && window.open(item.url, '_blank')}
                    >
                        <div style={{
                            color: colors.primary,
                            fontSize: 14,
                            marginBottom: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}>
                            {item.title}
                            <ExternalLink size={12} />
                        </div>
                        <div style={{ color: colors.text3, fontSize: 12 }}>
                            {item.snippet || item.description}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 通用技能结果卡片 - 智能格式化
const GenericSkillCard: React.FC<{ skillName: string; data: any; icon: any }> = ({
    skillName, data, icon: Icon
}) => {
    // 尝试智能渲染数据结构
    const renderDataContent = () => {
        if (typeof data === 'string') {
            return <div style={{ color: colors.text2, fontSize: 14 }}>{data}</div>;
        }

        // 如果有 results 数组，优先渲染为列表
        if (data?.results && Array.isArray(data.results)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* 产品header */}
                    {data.product && (
                        <div style={{
                            color: colors.text2,
                            fontSize: 13,
                            padding: '6px 10px',
                            background: colors.bg3,
                            borderRadius: 8,
                        }}>
                            🏷️ {data.product} {data.category && `· ${data.category}`}
                        </div>
                    )}
                    {/* 结果列表 */}
                    {data.results.slice(0, 6).map((item: any, i: number) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: colors.bg3,
                                borderRadius: 8,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 16 }}>{item.icon || '📍'}</span>
                                <span style={{ color: colors.text1, fontWeight: 500 }}>
                                    {item.platform || item.name || item.title || `结果 ${i + 1}`}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {item.price !== undefined && (
                                    <span style={{ color: colors.positive, fontWeight: 700 }}>
                                        {item.currency || '¥'}{item.price}
                                    </span>
                                )}
                                {item.savings && item.savings > 0 && (
                                    <span style={{
                                        background: colors.warningMuted,
                                        color: colors.warning,
                                        padding: '2px 6px',
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}>
                                        省¥{item.savings}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* 推荐信息 */}
                    {data.recommendation && (
                        <div style={{
                            marginTop: 4,
                            padding: '8px 12px',
                            background: colors.primaryMuted,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <TrendingDown size={14} color={colors.primary} />
                            <span style={{ color: colors.primary, fontSize: 13 }}>
                                {data.recommendation}
                            </span>
                        </div>
                    )}
                </div>
            );
        }

        // 其他对象类型，尝试格式化显示关键字段
        if (typeof data === 'object' && data !== null) {
            const entries = Object.entries(data).filter(([k, v]) =>
                v !== null && v !== undefined && typeof v !== 'object'
            );
            if (entries.length > 0) {
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {entries.map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', gap: 8 }}>
                                <span style={{ color: colors.text3, fontSize: 13 }}>{key}:</span>
                                <span style={{ color: colors.text2, fontSize: 13, flex: 1 }}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                );
            }
        }

        // 兜底：原始 JSON
        return (
            <pre style={{
                color: colors.text3,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        );
    };

    return (
        <div style={{
            background: colors.bg2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10
            }}>
                <Icon size={18} color={colors.primary} />
                <span style={{ color: colors.text1, fontWeight: 600 }}>{skillName}</span>
            </div>
            {renderDataContent()}
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const SuperAgentResultPanel: React.FC<SuperAgentResultPanelProps> = ({
    result,
    onClose,
    onFollowUp,
    onOpenInMarket,
}) => {
    if (!result) return null;

    const renderSkillResult = (skillResult: SkillResultData, index: number) => {
        const skillId = skillResult.skillId || `skill_${index}`;
        const skillName = skillResult.skillName || '技能结果';
        const Icon = skillIcons[skillId] || MessageCircle;
        const data = skillResult.data;

        // 调试日志
        console.log('[SuperAgentResultPanel] Rendering skill:', skillId, 'Data:', data);

        // 搜索结果 - 通过 skillId 检测 (优先检测，因为 web_search 也有 results 和 query)
        const isWebSearch =
            skillId === 'web_search' ||
            skillName?.includes('搜索') ||
            (data && data.results && data.query && !data.product && !data.products && !data.lowestPrice);

        if (isWebSearch && data) {
            console.log('[SuperAgentResultPanel] Using SearchResultCard for:', skillId);
            return <SearchResultCard key={skillId} data={data} />;
        }

        // LIX 意图交易 - 通过 skillId 或数据结构检测
        const isBroadcastIntent =
            skillId === 'broadcast_intent' ||
            skillName?.includes('LIX') ||
            skillName?.includes('意图交易') ||
            (data && data.intentId && data.offers && Array.isArray(data.offers));

        if (isBroadcastIntent && data) {
            console.log('[SuperAgentResultPanel] Using OfferComparisonCard for:', skillId);
            return <OfferComparisonCard key={skillId} data={data} onOpenInMarket={onOpenInMarket} />;
        }

        // 价格对比 - 通过 skillId 或数据结构检测
        const isPriceCompare =
            skillId === 'price_compare' ||
            skillName?.includes('比价') ||
            (data && (data.products || data.prices) && (data.product || data.lowestPrice));

        if (isPriceCompare && data) {
            console.log('[SuperAgentResultPanel] Using PriceCompareCard for:', skillId);
            return <PriceCompareCard key={skillId} data={data} />;
        }

        // 跳过空数据或只有基础信息的结果
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
            return null;
        }

        // 如果是记忆相关且没有找到结果，跳过
        if (skillId === 'memory' && data.found === 0) {
            return null;
        }

        // 其他技能通用展示
        if (skillResult.success && data) {
            return (
                <GenericSkillCard
                    key={skillId}
                    skillName={skillName}
                    data={data}
                    icon={Icon}
                />
            );
        }

        return null;
    };

    return (
        <div style={{
            background: colors.bg1,
            borderRadius: 16,
            padding: 20,
            height: '100%',
            overflowY: 'auto',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={20} color={colors.primary} />
                    <span style={{ color: colors.text1, fontWeight: 600, fontSize: 16 }}>
                        Super Agent 结果
                    </span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <span style={{
                        background: result.confidence > 0.7 ? colors.positiveMuted : colors.warningMuted,
                        color: result.confidence > 0.7 ? colors.positive : colors.warning,
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                    }}>
                        置信度 {(result.confidence * 100).toFixed(0)}%
                    </span>
                    <span style={{ color: colors.text3, fontSize: 12 }}>
                        {result.executionTimeMs}ms
                    </span>
                </div>
            </div>

            {/* Question */}
            <div style={{
                background: colors.bg2,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
            }}>
                <div style={{ color: colors.text3, fontSize: 12, marginBottom: 4 }}>
                    您的问题
                </div>
                <div style={{ color: colors.text1, fontSize: 14 }}>
                    {result.question}
                </div>
            </div>

            {/* Answer */}
            {result.answer && (
                <div style={{
                    background: colors.primaryMuted,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    borderLeft: `3px solid ${colors.primary}`,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 8
                    }}>
                        <CheckCircle size={16} color={colors.primary} />
                        <span style={{ color: colors.primary, fontWeight: 600, fontSize: 13 }}>
                            最优解答
                        </span>
                    </div>
                    <div style={{ color: colors.text1, fontSize: 14, lineHeight: 1.6 }}>
                        <SimpleMarkdown text={result.answer} />
                    </div>
                </div>
            )}

            {/* Skills Used */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 16,
            }}>
                {result.skillsUsed.map((skill, i) => (
                    <span
                        key={i}
                        style={{
                            background: colors.bg3,
                            color: colors.text2,
                            padding: '4px 10px',
                            borderRadius: 16,
                            fontSize: 12,
                        }}
                    >
                        {skill}
                    </span>
                ))}
            </div>

            {/* Detailed Results */}
            <div>
                <div style={{
                    color: colors.text3,
                    fontSize: 12,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }}>
                    详细数据
                </div>
                {result.results
                    .filter(r => r.success && r.data)
                    .map(renderSkillResult)}
            </div>

            {/* Follow-up Suggestions */}
            {onFollowUp && (() => {
                // 从结果中提取原始查询/产品名称
                const originalQuery = result.question ||
                    result.results?.find(r => r.data?.query || r.data?.product)?.data?.query ||
                    result.results?.find(r => r.data?.query || r.data?.product)?.data?.product ||
                    '';

                // 根据原始查询生成智能的 follow-up 建议
                const followUpSuggestions = originalQuery ? [
                    `${originalQuery} 有哪些型号`,
                    `${originalQuery} 用户评价`,
                    `帮我找 ${originalQuery} 的优惠券`
                ] : [
                    '查看更多详情',
                    '相关产品推荐',
                    '帮我继续查询'
                ];

                return (
                    <div style={{ marginTop: 16 }}>
                        <div style={{
                            color: colors.text3,
                            fontSize: 12,
                            marginBottom: 8
                        }}>
                            继续提问
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {followUpSuggestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => onFollowUp(q)}
                                    style={{
                                        background: colors.bg2,
                                        color: colors.text2,
                                        border: `1px solid ${colors.border}`,
                                        padding: '8px 14px',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        {/* 🆕 自由输入框 - 继续与 Agent 对话 */}
                        <FollowUpInput onSubmit={onFollowUp} />
                    </div>
                );
            })()}
        </div>
    );
};

export default SuperAgentResultPanel;
