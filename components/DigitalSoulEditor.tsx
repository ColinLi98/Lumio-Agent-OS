/**
 * Digital Soul Editor - 数字分身配置
 * 
 * 设计理念：专业、简洁、高效
 * 视觉风格：现代企业级 SaaS 产品
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    User, Briefcase, GraduationCap, Heart, DollarSign,
    Activity, Target, ChevronRight, ChevronDown, Check,
    AlertCircle, Settings, Save, Upload, FileText, Loader2, Shield
} from 'lucide-react';

import { LifeStateSnapshot, LifeStage, EnhancedDigitalAvatar } from '../types';
import { getDigitalSoulManager, DEFAULT_LIFE_STATE } from '../services/digitalSoulManager';

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
    text2: '#94A3B8',
    text3: '#64748B',
    border: 'rgba(148, 163, 184, 0.1)',
};

// ============================================================================
// Types
// ============================================================================

interface DigitalSoulEditorProps {
    isDark?: boolean;
    onComplete?: () => void;
}

type SectionKey = 'basic' | 'education' | 'career' | 'finance' | 'health' | 'relationships' | 'skills' | 'goals' | 'preferences';

interface SectionConfig {
    key: SectionKey;
    icon: React.ReactNode;
    title: string;
    weight: number;
}

const SECTIONS: SectionConfig[] = [
    { key: 'basic', icon: <User size={16} />, title: '基本信息', weight: 15 },
    { key: 'education', icon: <GraduationCap size={16} />, title: '教育背景', weight: 10 },
    { key: 'career', icon: <Briefcase size={16} />, title: '职业状态', weight: 15 },
    { key: 'finance', icon: <DollarSign size={16} />, title: '财务状况', weight: 10 },
    { key: 'health', icon: <Activity size={16} />, title: '健康状态', weight: 10 },
    { key: 'relationships', icon: <Heart size={16} />, title: '关系状态', weight: 10 },
    { key: 'skills', icon: <Target size={16} />, title: '能力资产', weight: 10 },
    { key: 'goals', icon: <Target size={16} />, title: '人生目标', weight: 10 },
    { key: 'preferences', icon: <Settings size={16} />, title: '算法偏好', weight: 10 }
];

// ============================================================================
// Form Components
// ============================================================================

const FormField: React.FC<{
    label: string;
    children: React.ReactNode;
    hint?: string;
}> = ({ label, children, hint }) => (
    <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.text3 }}>
            {label}
        </label>
        {children}
        {hint && (
            <p className="text-xs" style={{ color: colors.text3 }}>{hint}</p>
        )}
    </div>
);

const TextInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        style={{ 
            backgroundColor: colors.bg3, 
            color: colors.text1,
            border: `1px solid ${colors.border}`
        }}
    />
);

const NumberInput: React.FC<{
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    suffix?: string;
}> = ({ value, onChange, min = 0, max = 100, suffix }) => (
    <div className="flex items-center gap-2">
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
            min={min}
            max={max}
            className="w-20 px-3 py-2.5 rounded-lg text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            style={{ 
                backgroundColor: colors.bg3, 
                color: colors.text1,
                border: `1px solid ${colors.border}`
            }}
        />
        {suffix && <span className="text-sm" style={{ color: colors.text3 }}>{suffix}</span>}
    </div>
);

const SliderInput: React.FC<{
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    labels?: [string, string];
}> = ({ value, onChange, min = 0, max = 100, labels }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, ${colors.primary} ${percentage}%, ${colors.bg3} ${percentage}%)`
                    }}
                />
                <span className="text-sm font-mono w-8 text-right" style={{ color: colors.text1 }}>
                    {value}
                </span>
            </div>
            {labels && (
                <div className="flex justify-between text-xs" style={{ color: colors.text3 }}>
                    <span>{labels[0]}</span>
                    <span>{labels[1]}</span>
                </div>
            )}
        </div>
    );
};

const SelectInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className="px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                    backgroundColor: value === opt.value ? colors.primaryMuted : colors.bg3,
                    color: value === opt.value ? colors.primary : colors.text2,
                    border: `1px solid ${value === opt.value ? colors.primary + '50' : colors.border}`
                }}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

const TagInput: React.FC<{
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
}> = ({ tags, onChange, placeholder = '添加...', maxTags = 5 }) => {
    const [input, setInput] = useState('');

    const addTag = () => {
        if (input.trim() && tags.length < maxTags && !tags.includes(input.trim())) {
            onChange([...tags, input.trim()]);
            setInput('');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <span
                        key={tag}
                        className="px-2.5 py-1 rounded text-xs flex items-center gap-1.5"
                        style={{ backgroundColor: colors.bg3, color: colors.text2 }}
                    >
                        {tag}
                        <button 
                            onClick={() => onChange(tags.filter(t => t !== tag))}
                            className="hover:text-red-400"
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            {tags.length < maxTags && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        style={{ 
                            backgroundColor: colors.bg3, 
                            color: colors.text1,
                            border: `1px solid ${colors.border}`
                        }}
                    />
                    <button
                        onClick={addTag}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: colors.primaryMuted, color: colors.primary }}
                    >
                        添加
                    </button>
                </div>
            )}
        </div>
    );
};

const Checkbox: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}> = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <div 
            className="w-4 h-4 rounded flex items-center justify-center transition-colors"
            style={{ 
                backgroundColor: checked ? colors.primary : colors.bg3,
                border: `1px solid ${checked ? colors.primary : colors.border}`
            }}
        >
            {checked && <Check size={12} color="#fff" />}
        </div>
        <span className="text-sm" style={{ color: colors.text2 }}>{label}</span>
    </label>
);

// ============================================================================
// Data Import - 文本数据分析
// ============================================================================

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * 从 PDF 文件提取文本
 */
async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        textParts.push(pageText);
    }
    
    return textParts.join('\n');
}

/**
 * 从 Word 文件提取文本
 */
async function extractTextFromWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * 根据文件类型提取文本
 */
async function extractTextFromFile(file: File): Promise<string> {
    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    
    // PDF
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return extractTextFromPDF(file);
    }
    
    // Word (.docx)
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
        return extractTextFromWord(file);
    }
    
    // Word (.doc) - 老格式不太好处理，尝试当作文本读
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
        // mammoth 也可以尝试处理 .doc，但不保证成功
        try {
            return await extractTextFromWord(file);
        } catch {
            // 如果失败，尝试直接读取文本
            return file.text();
        }
    }
    
    // 纯文本文件 (.txt, .md, .json, .csv)
    return file.text();
}

interface AnalyzedProfile {
    age?: number;
    occupation?: string;
    industry?: string;
    interests: string[];
    concerns: string[];
    goals: string[];
    communicationStyle: 'Professional' | 'Friendly' | 'Casual' | 'Concise';
    stressLevel: number;
    confidence: number;
}

/**
 * 本地文本分析 - 从用户文字中提取特征
 */
function analyzeTextForProfile(text: string): AnalyzedProfile {
    const profile: AnalyzedProfile = {
        interests: [],
        concerns: [],
        goals: [],
        communicationStyle: 'Friendly',
        stressLevel: 40,
        confidence: 0
    };

    if (!text || text.length < 50) {
        return profile;
    }

    // 分析句子风格
    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / Math.max(sentences.length, 1);
    
    // emoji 密度
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojiMatches = text.match(emojiRegex) || [];
    const emojiDensity = emojiMatches.length / (text.length / 100);

    // 正式 vs 随意词汇
    const formalWords = ['您', '贵', '敬请', 'Dear', 'Regards', '感谢', '请问'];
    const casualWords = ['哈哈', '嘻嘻', '呀', '啦', '嘛', 'lol', 'haha', '666'];
    const formalCount = formalWords.reduce((c, w) => c + (text.match(new RegExp(w, 'gi')) || []).length, 0);
    const casualCount = casualWords.reduce((c, w) => c + (text.match(new RegExp(w, 'gi')) || []).length, 0);

    // 确定沟通风格
    if (avgSentenceLength < 15 && emojiDensity < 0.5) {
        profile.communicationStyle = 'Concise';
    } else if (formalCount > casualCount * 1.5) {
        profile.communicationStyle = 'Professional';
    } else if (casualCount > formalCount * 1.5 || emojiDensity > 2) {
        profile.communicationStyle = 'Casual';
    }

    // 提取兴趣话题
    const interestPatterns: Record<string, RegExp> = {
        '科技': /AI|人工智能|编程|代码|技术|软件|互联网|tech/i,
        '投资': /股票|基金|投资|理财|收益|money|invest/i,
        '健康': /健身|运动|跑步|瑜伽|健康|睡眠|exercise|health/i,
        '旅行': /旅行|旅游|出差|机票|酒店|度假|travel/i,
        '阅读': /读书|书籍|小说|阅读|看书|book/i,
        '美食': /美食|餐厅|做饭|烹饪|吃|food|cook/i,
        '音乐': /音乐|歌曲|演唱会|乐器|music/i,
        '影视': /电影|电视|剧|Netflix|追剧|movie/i
    };

    Object.entries(interestPatterns).forEach(([topic, pattern]) => {
        if (pattern.test(text)) {
            profile.interests.push(topic);
        }
    });

    // 提取担忧/压力
    const concernPatterns: Record<string, RegExp> = {
        '工作压力': /加班|忙|累|deadline|压力大|工作.*累/i,
        '职业发展': /晋升|跳槽|面试|找工作|职业.*迷茫/i,
        '财务压力': /没钱|欠款|房贷|开销|花费.*大/i,
        '健康问题': /失眠|焦虑|生病|不舒服|医院/i,
        '人际关系': /吵架|矛盾|关系.*差|孤独/i
    };

    Object.entries(concernPatterns).forEach(([concern, pattern]) => {
        if (pattern.test(text)) {
            profile.concerns.push(concern);
        }
    });

    // 提取目标
    const goalPatterns: Record<string, RegExp> = {
        '提升技能': /学习|提升|成长|进步|learn/i,
        '增加收入': /赚钱|加薪|副业|创业|收入/i,
        '保持健康': /减肥|锻炼|健康.*生活|早睡/i,
        '改善关系': /社交|交朋友|约会|恋爱|family/i
    };

    Object.entries(goalPatterns).forEach(([goal, pattern]) => {
        if (pattern.test(text)) {
            profile.goals.push(goal);
        }
    });

    // 压力指数评估
    const stressKeywords = ['压力', '焦虑', '担心', '烦', '累', '难', 'stress', 'anxious', 'tired', '失眠'];
    const stressCount = stressKeywords.reduce((c, w) => c + (text.match(new RegExp(w, 'gi')) || []).length, 0);
    profile.stressLevel = Math.min(80, 30 + stressCount * 5);

    // 尝试提取年龄信息
    const ageMatch = text.match(/我?(\d{2})岁|(\d{2})年的|born.*(\d{4})|(\d{4})年出生/);
    if (ageMatch) {
        if (ageMatch[1]) profile.age = parseInt(ageMatch[1]);
        else if (ageMatch[2]) profile.age = parseInt(ageMatch[2]);
        else if (ageMatch[3]) profile.age = new Date().getFullYear() - parseInt(ageMatch[3]);
        else if (ageMatch[4]) profile.age = new Date().getFullYear() - parseInt(ageMatch[4]);
    }

    // 尝试提取职业/行业
    const occupationPatterns = [
        { pattern: /程序员|开发|工程师|coder|developer/i, value: '软件开发' },
        { pattern: /产品经理|PM|产品/i, value: '产品经理' },
        { pattern: /设计师|UI|UX|designer/i, value: '设计' },
        { pattern: /运营|marketing|市场/i, value: '市场运营' },
        { pattern: /金融|银行|投行|finance/i, value: '金融' },
        { pattern: /老师|教师|教育|teacher/i, value: '教育' },
        { pattern: /医生|护士|医院|医疗/i, value: '医疗' },
        { pattern: /律师|法务|法律/i, value: '法律' },
        { pattern: /学生|大学|研究生|读书/i, value: '学生' }
    ];

    for (const { pattern, value } of occupationPatterns) {
        if (pattern.test(text)) {
            profile.occupation = value;
            break;
        }
    }

    // 计算置信度
    const lengthScore = Math.min(text.length / 3000, 1) * 40;
    const featureScore = Math.min((profile.interests.length + profile.concerns.length + profile.goals.length) / 6, 1) * 40;
    const detailScore = (profile.age ? 10 : 0) + (profile.occupation ? 10 : 0);
    profile.confidence = Math.round(lengthScore + featureScore + detailScore);

    return profile;
}

const DataImportPanel: React.FC<{
    onImport: (profile: AnalyzedProfile) => void;
}> = ({ onImport }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState<AnalyzedProfile | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAnalyze = async (text: string) => {
        setIsAnalyzing(true);
        await new Promise(r => setTimeout(r, 800)); // 模拟分析时间
        const result = analyzeTextForProfile(text);
        setAnalyzed(result);
        setIsAnalyzing(false);
    };

    const [parseError, setParseError] = useState<string | null>(null);

    const handleFileSelect = async (file: File) => {
        setParseError(null);
        setIsAnalyzing(true);
        
        try {
            const text = await extractTextFromFile(file);
            if (!text || text.trim().length < 50) {
                setParseError('文件内容太少，请提供更多数据');
                setIsAnalyzing(false);
                return;
            }
            const result = analyzeTextForProfile(text);
            setAnalyzed(result);
        } catch (e) {
            console.error('File parse error', e);
            setParseError('文件解析失败，请尝试其他格式');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleApply = () => {
        if (analyzed) {
            onImport(analyzed);
            setAnalyzed(null);
            setIsExpanded(false);
            setPasteText('');
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="w-full rounded-xl p-4 flex items-center gap-3 transition-colors"
                style={{ 
                    backgroundColor: colors.bg2, 
                    border: `1px solid ${colors.border}`,
                }}
            >
                <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                >
                    <Upload size={18} className="text-emerald-400" />
                </div>
                <div className="text-left flex-1">
                    <div className="text-sm font-medium" style={{ color: colors.text1 }}>
                        从文字中学习
                    </div>
                    <div className="text-xs" style={{ color: colors.text3 }}>
                        导入聊天记录、笔记或日记，本地分析
                    </div>
                </div>
                <ChevronRight size={16} style={{ color: colors.text3 }} />
            </button>
        );
    }

    return (
        <div 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
        >
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-3">
                    <Upload size={18} className="text-emerald-400" />
                    <span className="text-sm font-medium" style={{ color: colors.text1 }}>导入数据</span>
                </div>
                <button onClick={() => { setIsExpanded(false); setAnalyzed(null); setPasteText(''); setParseError(null); }}>
                    <ChevronDown size={16} style={{ color: colors.text3 }} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Error Message */}
                {parseError && (
                    <div 
                        className="p-3 rounded-lg flex items-center gap-2"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                        <AlertCircle size={16} className="text-red-400" />
                        <span className="text-sm text-red-400">{parseError}</span>
                    </div>
                )}
                
                {isAnalyzing ? (
                    <div className="flex flex-col items-center py-8">
                        <Loader2 size={32} className="text-emerald-400 animate-spin mb-3" />
                        <p className="text-sm" style={{ color: colors.text2 }}>正在本地分析...</p>
                    </div>
                ) : analyzed ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Check size={16} className="text-emerald-400" />
                            <span className="text-sm font-medium" style={{ color: colors.text1 }}>
                                分析完成 (置信度 {analyzed.confidence}%)
                            </span>
                        </div>

                        <div className="space-y-3 text-sm">
                            {analyzed.age && (
                                <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <span style={{ color: colors.text3 }}>推测年龄</span>
                                    <span style={{ color: colors.text1 }}>{analyzed.age} 岁</span>
                                </div>
                            )}
                            {analyzed.occupation && (
                                <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <span style={{ color: colors.text3 }}>职业方向</span>
                                    <span style={{ color: colors.text1 }}>{analyzed.occupation}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <span style={{ color: colors.text3 }}>沟通风格</span>
                                <span style={{ color: colors.text1 }}>
                                    {{ Professional: '专业正式', Friendly: '友好亲切', Casual: '随性轻松', Concise: '简洁直接' }[analyzed.communicationStyle]}
                                </span>
                            </div>
                            {analyzed.interests.length > 0 && (
                                <div className="py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text3 }} className="mb-2">兴趣领域</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analyzed.interests.map(i => (
                                            <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg3, color: colors.text2 }}>{i}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {analyzed.concerns.length > 0 && (
                                <div className="py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text3 }} className="mb-2">关注问题</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analyzed.concerns.map(c => (
                                            <span key={c} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.warningMuted, color: colors.warning }}>{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {analyzed.goals.length > 0 && (
                                <div className="py-2">
                                    <div style={{ color: colors.text3 }} className="mb-2">潜在目标</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analyzed.goals.map(g => (
                                            <span key={g} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.positiveMuted, color: colors.positive }}>{g}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => { setAnalyzed(null); setPasteText(''); setParseError(null); }}
                                className="flex-1 py-2.5 rounded-lg text-sm"
                                style={{ backgroundColor: colors.bg3, color: colors.text2 }}
                            >
                                重新分析
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: colors.primary, color: '#fff' }}
                            >
                                应用到分身
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* File Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg p-6 text-center cursor-pointer transition-colors"
                            style={{ 
                                backgroundColor: dragOver ? 'rgba(16, 185, 129, 0.1)' : colors.bg3,
                                border: `2px dashed ${dragOver ? 'rgba(16, 185, 129, 0.5)' : colors.border}`
                            }}
                        >
                            <FileText size={32} className="mx-auto mb-3" style={{ color: colors.text3 }} />
                            <p className="text-sm" style={{ color: colors.text2 }}>拖拽文件到这里</p>
                            <p className="text-xs mt-1" style={{ color: colors.text3 }}>支持 PDF, Word, TXT, Markdown</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                            <span className="text-xs" style={{ color: colors.text3 }}>或者</span>
                            <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                        </div>

                        {/* Paste Area */}
                        <div className="space-y-2">
                            <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder="直接粘贴聊天记录、笔记或任何文字内容..."
                                rows={4}
                                className="w-full px-3 py-2.5 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                style={{ 
                                    backgroundColor: colors.bg3, 
                                    color: colors.text1,
                                    border: `1px solid ${colors.border}`
                                }}
                            />
                            {pasteText.length > 50 && (
                                <button
                                    onClick={() => handleAnalyze(pasteText)}
                                    className="w-full py-2.5 rounded-lg text-sm font-medium"
                                    style={{ backgroundColor: colors.primary, color: '#fff' }}
                                >
                                    开始分析
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs" style={{ color: colors.text3 }}>
                            <Shield size={12} />
                            <span>所有数据仅在本地处理，不会上传服务器</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Section Components
// ============================================================================

const BasicSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="年龄">
            <NumberInput 
                value={state.age} 
                onChange={(age) => onChange({ age })}
                min={16}
                max={80}
                suffix="岁"
            />
        </FormField>
        
        <FormField label="人生阶段">
            <SelectInput
                value={state.lifeStage}
                onChange={(v) => onChange({ lifeStage: v as LifeStage })}
                options={[
                    { value: 'student', label: '学生' },
                    { value: 'early_career', label: '职业早期' },
                    { value: 'career_growth', label: '成长期' },
                    { value: 'career_peak', label: '巅峰期' },
                    { value: 'late_career', label: '后期' },
                    { value: 'retired', label: '退休' }
                ]}
            />
        </FormField>
    </div>
);

const EducationSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="最高学历">
            <SelectInput
                value={state.education.highestDegree}
                onChange={(v) => onChange({ education: { ...state.education, highestDegree: v as any } })}
                options={[
                    { value: 'high_school', label: '高中' },
                    { value: 'bachelor', label: '本科' },
                    { value: 'master', label: '硕士' },
                    { value: 'phd', label: '博士' },
                    { value: 'other', label: '其他' }
                ]}
            />
        </FormField>

        <FormField label="专业领域">
            <TextInput 
                value={state.education.field || ''}
                onChange={(v) => onChange({ education: { ...state.education, field: v } })}
                placeholder="计算机科学、金融、设计..."
            />
        </FormField>
    </div>
);

const CareerSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="职业状态">
            <SelectInput
                value={state.career.currentStatus}
                onChange={(v) => onChange({ career: { ...state.career, currentStatus: v as any } })}
                options={[
                    { value: 'student', label: '学生' },
                    { value: 'employed', label: '在职' },
                    { value: 'self_employed', label: '创业' },
                    { value: 'freelance', label: '自由职业' },
                    { value: 'unemployed', label: '待业' },
                    { value: 'retired', label: '退休' }
                ]}
            />
        </FormField>

        <FormField label="行业">
            <TextInput 
                value={state.career.industry || ''}
                onChange={(v) => onChange({ career: { ...state.career, industry: v } })}
                placeholder="互联网、金融、医疗..."
            />
        </FormField>

        <FormField label="工作年限">
            <NumberInput 
                value={state.career.yearsOfExperience} 
                onChange={(v) => onChange({ career: { ...state.career, yearsOfExperience: v } })}
                min={0}
                max={50}
                suffix="年"
            />
        </FormField>

        <FormField label="职业满意度">
            <SliderInput
                value={state.career.careerSatisfaction}
                onChange={(v) => onChange({ career: { ...state.career, careerSatisfaction: v } })}
                labels={['不满意', '非常满意']}
            />
        </FormField>
    </div>
);

const FinanceSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="收入水平">
            <SelectInput
                value={state.finance.incomeLevel}
                onChange={(v) => onChange({ finance: { ...state.finance, incomeLevel: v as any } })}
                options={[
                    { value: 'low', label: '较低' },
                    { value: 'medium', label: '中等' },
                    { value: 'high', label: '较高' },
                    { value: 'very_high', label: '很高' }
                ]}
            />
        </FormField>

        <FormField label="储蓄水平">
            <SelectInput
                value={state.finance.savingsLevel}
                onChange={(v) => onChange({ finance: { ...state.finance, savingsLevel: v as any } })}
                options={[
                    { value: 'none', label: '无' },
                    { value: 'low', label: '少量' },
                    { value: 'medium', label: '中等' },
                    { value: 'high', label: '充足' }
                ]}
            />
        </FormField>

        <FormField label="财务压力">
            <SliderInput
                value={state.finance.financialStress}
                onChange={(v) => onChange({ finance: { ...state.finance, financialStress: v } })}
                labels={['无压力', '压力很大']}
            />
        </FormField>

        <div className="flex gap-4">
            <Checkbox
                checked={state.finance.hasProperty}
                onChange={(v) => onChange({ finance: { ...state.finance, hasProperty: v } })}
                label="有房产"
            />
            <Checkbox
                checked={state.finance.hasInvestments}
                onChange={(v) => onChange({ finance: { ...state.finance, hasInvestments: v } })}
                label="有投资"
            />
        </div>
    </div>
);

const HealthSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="身体健康">
            <SliderInput
                value={state.health.physicalHealth}
                onChange={(v) => onChange({ health: { ...state.health, physicalHealth: v } })}
                labels={['较差', '非常好']}
            />
        </FormField>

        <FormField label="心理健康">
            <SliderInput
                value={state.health.mentalHealth}
                onChange={(v) => onChange({ health: { ...state.health, mentalHealth: v } })}
                labels={['较差', '非常好']}
            />
        </FormField>

        <FormField label="精力水平">
            <SliderInput
                value={state.health.energyLevel}
                onChange={(v) => onChange({ health: { ...state.health, energyLevel: v } })}
                labels={['疲惫', '精力充沛']}
            />
        </FormField>

        <FormField label="运动频率">
            <SelectInput
                value={state.health.exerciseFrequency}
                onChange={(v) => onChange({ health: { ...state.health, exerciseFrequency: v as any } })}
                options={[
                    { value: 'none', label: '几乎不' },
                    { value: 'rarely', label: '偶尔' },
                    { value: 'weekly', label: '每周' },
                    { value: 'daily', label: '每天' }
                ]}
            />
        </FormField>
    </div>
);

const RelationshipsSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="感情状态">
            <SelectInput
                value={state.relationships.status}
                onChange={(v) => onChange({ relationships: { ...state.relationships, status: v as any } })}
                options={[
                    { value: 'single', label: '单身' },
                    { value: 'dating', label: '恋爱中' },
                    { value: 'married', label: '已婚' },
                    { value: 'divorced', label: '离异' }
                ]}
            />
        </FormField>

        <Checkbox
            checked={state.relationships.hasChildren}
            onChange={(v) => onChange({ relationships: { ...state.relationships, hasChildren: v } })}
            label="有子女"
        />

        <FormField label="家庭关系质量">
            <SliderInput
                value={state.relationships.familyRelationshipQuality}
                onChange={(v) => onChange({ relationships: { ...state.relationships, familyRelationshipQuality: v } })}
                labels={['紧张', '融洽']}
            />
        </FormField>

        <FormField label="社交满意度">
            <SliderInput
                value={state.relationships.socialSatisfaction}
                onChange={(v) => onChange({ relationships: { ...state.relationships, socialSatisfaction: v } })}
                labels={['不满意', '非常满意']}
            />
        </FormField>
    </div>
);

const SkillsSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="核心技能" hint="最多 5 个">
            <TagInput
                tags={state.skills.topSkills}
                onChange={(tags) => onChange({ skills: { ...state.skills, topSkills: tags } })}
                placeholder="编程、演讲、管理..."
                maxTags={5}
            />
        </FormField>

        <FormField label="学习目标">
            <TagInput
                tags={state.skills.learningGoals}
                onChange={(tags) => onChange({ skills: { ...state.skills, learningGoals: tags } })}
                placeholder="想学习的技能..."
                maxTags={5}
            />
        </FormField>

        <FormField label="技术能力">
            <SliderInput
                value={state.skills.technicalProficiency}
                onChange={(v) => onChange({ skills: { ...state.skills, technicalProficiency: v } })}
                labels={['入门', '专家']}
            />
        </FormField>

        <FormField label="领导经验">
            <SliderInput
                value={state.skills.leadershipExperience}
                onChange={(v) => onChange({ skills: { ...state.skills, leadershipExperience: v } })}
                labels={['无', '丰富']}
            />
        </FormField>
    </div>
);

const GoalsSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="短期目标 (1年内)">
            <TagInput
                tags={state.lifeGoals.shortTerm}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, shortTerm: tags } })}
                placeholder="添加目标..."
            />
        </FormField>

        <FormField label="中期目标 (1-5年)">
            <TagInput
                tags={state.lifeGoals.mediumTerm}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, mediumTerm: tags } })}
                placeholder="添加目标..."
            />
        </FormField>

        <FormField label="长期目标 (5年+)">
            <TagInput
                tags={state.lifeGoals.longTerm}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, longTerm: tags } })}
                placeholder="添加目标..."
            />
        </FormField>

        <FormField label="核心价值观">
            <TagInput
                tags={state.lifeGoals.coreValues}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, coreValues: tags } })}
                placeholder="家庭、成长、自由..."
            />
        </FormField>
    </div>
);

const PreferencesSection: React.FC<{
    avatar: EnhancedDigitalAvatar;
    onChange: (prefs: Partial<EnhancedDigitalAvatar['destinyPreferences']>) => void;
}> = ({ avatar, onChange }) => {
    const prefs = avatar.destinyPreferences || {
        optimizationGoal: 'balance',
        riskAppetite: 50,
        timeHorizon: 'medium',
        gamma: 0.92
    };

    return (
        <div className="space-y-5">
            <div 
                className="p-3 rounded-lg text-xs"
                style={{ backgroundColor: colors.primaryMuted, color: colors.primary }}
            >
                这些设置将影响算法如何为你计算最优人生路径
            </div>

            <FormField label="优化目标">
                <SelectInput
                    value={prefs.optimizationGoal}
                    onChange={(v) => onChange({ optimizationGoal: v as any })}
                    options={[
                        { value: 'wealth', label: '财富最大化' },
                        { value: 'happiness', label: '幸福最大化' },
                        { value: 'health', label: '健康优先' },
                        { value: 'balance', label: '平衡发展' },
                        { value: 'achievement', label: '成就导向' }
                    ]}
                />
            </FormField>

            <FormField label="风险偏好">
                <SliderInput
                    value={prefs.riskAppetite}
                    onChange={(v) => onChange({ riskAppetite: v })}
                    labels={['保守', '激进']}
                />
            </FormField>

            <FormField label="规划周期">
                <SelectInput
                    value={prefs.timeHorizon}
                    onChange={(v) => onChange({ timeHorizon: v as any })}
                    options={[
                        { value: 'short', label: '短期 (1-3年)' },
                        { value: 'medium', label: '中期 (5-10年)' },
                        { value: 'long', label: '长期 (20年+)' },
                        { value: 'very_long', label: '终身 (60岁视角)' }
                    ]}
                />
            </FormField>

            <FormField label={`远见系数 (γ = ${prefs.gamma.toFixed(2)})`} hint="越高越重视长期收益">
                <SliderInput
                    value={Math.round(prefs.gamma * 100)}
                    onChange={(v) => onChange({ gamma: v / 100 })}
                    min={80}
                    max={99}
                    labels={['关注当下', '极度远见']}
                />
            </FormField>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const DigitalSoulEditor: React.FC<DigitalSoulEditorProps> = ({ isDark = true, onComplete }) => {
    const [manager] = useState(() => getDigitalSoulManager());
    const [avatar, setAvatar] = useState<EnhancedDigitalAvatar>(() => manager.getAvatar());
    const [lifeState, setLifeState] = useState<LifeStateSnapshot>(() => manager.getLifeState());
    const [expandedSection, setExpandedSection] = useState<SectionKey | null>('basic');

    useEffect(() => {
        const unsubscribe = manager.subscribe((updated) => {
            setAvatar(updated);
            setLifeState(updated.lifeState || DEFAULT_LIFE_STATE);
        });
        return unsubscribe;
    }, [manager]);

    const handleLifeStateChange = useCallback((updates: Partial<LifeStateSnapshot>) => {
        manager.updateLifeState(updates);
    }, [manager]);

    const handlePreferencesChange = useCallback((prefs: Partial<EnhancedDigitalAvatar['destinyPreferences']>) => {
        manager.updateDestinyPreferences(prefs);
    }, [manager]);

    // 处理数据导入
    const handleDataImport = useCallback((profile: AnalyzedProfile) => {
        const updates: Partial<LifeStateSnapshot> = {};
        
        // 年龄
        if (profile.age && profile.age > 0 && profile.age < 100) {
            updates.age = profile.age;
        }
        
        // 职业信息
        if (profile.occupation) {
            updates.career = {
                ...lifeState.career,
                role: profile.occupation
            };
        }

        // 兴趣转为技能/目标
        if (profile.interests.length > 0) {
            updates.skills = {
                ...lifeState.skills,
                topSkills: [...new Set([...lifeState.skills.topSkills, ...profile.interests])].slice(0, 5)
            };
        }

        // 担忧转为挑战
        if (profile.concerns.length > 0) {
            updates.currentChallenges = {
                ...lifeState.currentChallenges,
                primaryConcerns: [...new Set([...lifeState.currentChallenges.primaryConcerns, ...profile.concerns])].slice(0, 5),
                stressLevel: profile.stressLevel
            };
        }

        // 目标
        if (profile.goals.length > 0) {
            updates.lifeGoals = {
                ...lifeState.lifeGoals,
                shortTerm: [...new Set([...lifeState.lifeGoals.shortTerm, ...profile.goals])].slice(0, 5)
            };
        }

        // 健康信息 - 基于压力等级
        if (profile.stressLevel) {
            updates.health = {
                ...lifeState.health,
                mentalHealth: Math.max(20, 100 - profile.stressLevel)
            };
        }

        manager.updateLifeState(updates);
    }, [manager, lifeState]);

    const getSectionCompleteness = (key: SectionKey): number => {
        switch (key) {
            case 'basic': return (lifeState.age > 0 ? 50 : 0) + (lifeState.lifeStage ? 50 : 0);
            case 'education': return (lifeState.education.highestDegree ? 50 : 0) + (lifeState.education.field ? 50 : 0);
            case 'career': return Math.min(100, (lifeState.career.currentStatus ? 25 : 0) + (lifeState.career.industry ? 25 : 0) + 50);
            case 'finance': return 100;
            case 'health': return 100;
            case 'relationships': return 100;
            case 'skills': return (lifeState.skills.topSkills.length > 0 ? 50 : 0) + (lifeState.skills.learningGoals.length > 0 ? 50 : 0);
            case 'goals': return Math.min(100, (lifeState.lifeGoals.shortTerm.length > 0 ? 25 : 0) + (lifeState.lifeGoals.mediumTerm.length > 0 ? 25 : 0) + (lifeState.lifeGoals.coreValues.length > 0 ? 50 : 0));
            case 'preferences': return avatar.destinyPreferences ? 100 : 0;
            default: return 0;
        }
    };

    const renderSection = (key: SectionKey) => {
        switch (key) {
            case 'basic': return <BasicSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'education': return <EducationSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'career': return <CareerSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'finance': return <FinanceSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'health': return <HealthSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'relationships': return <RelationshipsSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'skills': return <SkillsSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'goals': return <GoalsSection state={lifeState} onChange={handleLifeStateChange} />;
            case 'preferences': return <PreferencesSection avatar={avatar} onChange={handlePreferencesChange} />;
            default: return null;
        }
    };

    const totalCompleteness = Math.round(
        SECTIONS.reduce((acc, s) => acc + (getSectionCompleteness(s.key) * s.weight / 100), 0)
    );

    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div 
                className="rounded-xl p-5"
                style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: colors.text1 }}>
                            数字分身配置
                        </h2>
                        <p className="text-xs mt-1" style={{ color: colors.text3 }}>
                            完善信息以获得更精准的导航建议
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs" style={{ color: colors.text3 }}>完成度</div>
                        <div 
                            className="text-2xl font-mono font-semibold"
                            style={{ 
                                color: totalCompleteness > 70 ? colors.positive : 
                                       totalCompleteness > 40 ? colors.warning : colors.text3
                            }}
                        >
                            {totalCompleteness}%
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg3 }}>
                    <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                            width: `${totalCompleteness}%`,
                            backgroundColor: totalCompleteness > 70 ? colors.positive : 
                                           totalCompleteness > 40 ? colors.warning : colors.text3
                        }}
                    />
                </div>
            </div>

            {/* Data Import */}
            <DataImportPanel onImport={handleDataImport} />

            {/* Sections */}
            <div className="space-y-2">
                {SECTIONS.map(section => {
                    const isExpanded = expandedSection === section.key;
                    const completeness = getSectionCompleteness(section.key);
                    
                    return (
                        <div
                            key={section.key}
                            className="rounded-xl overflow-hidden"
                            style={{ backgroundColor: colors.bg2, border: `1px solid ${colors.border}` }}
                        >
                            <button
                                onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                                className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-slate-800/30"
                            >
                                <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ 
                                        backgroundColor: completeness >= 100 ? colors.positiveMuted : colors.bg3,
                                        color: completeness >= 100 ? colors.positive : colors.text3
                                    }}
                                >
                                    {completeness >= 100 ? <Check size={14} /> : section.icon}
                                </div>
                                <div className="flex-1 text-left">
                                    <span className="text-sm font-medium" style={{ color: colors.text1 }}>
                                        {section.title}
                                    </span>
                                </div>
                                <span 
                                    className="text-xs font-mono px-2 py-0.5 rounded"
                                    style={{ 
                                        backgroundColor: completeness >= 100 ? colors.positiveMuted : colors.bg3,
                                        color: completeness >= 100 ? colors.positive : colors.text3
                                    }}
                                >
                                    {completeness}%
                                </span>
                                {isExpanded ? (
                                    <ChevronDown size={16} style={{ color: colors.text3 }} />
                                ) : (
                                    <ChevronRight size={16} style={{ color: colors.text3 }} />
                                )}
                            </button>
                            
                            {isExpanded && (
                                <div 
                                    className="px-4 pb-4"
                                    style={{ borderTop: `1px solid ${colors.border}` }}
                                >
                                    <div className="pt-4">
                                        {renderSection(section.key)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Complete Notice */}
            {totalCompleteness >= 60 && (
                <div 
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ backgroundColor: colors.positiveMuted, border: `1px solid ${colors.positive}20` }}
                >
                    <Check size={16} style={{ color: colors.positive }} />
                    <span className="text-sm" style={{ color: colors.text2 }}>
                        数字分身已就绪，可前往 <span style={{ color: colors.text1 }}>Destiny</span> 查看导航建议
                    </span>
                </div>
            )}
        </div>
    );
};

export default DigitalSoulEditor;
