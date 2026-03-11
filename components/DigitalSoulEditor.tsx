/**
 * Digital Soul Editor - Digital Twin Configuration
 * 
 * Design intent: professional, concise, and efficient
 * Visual style: modern enterprise SaaS
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
    { key: 'basic', icon: <User size={16} />, title: 'Basic Info', weight: 15 },
    { key: 'education', icon: <GraduationCap size={16} />, title: 'Education', weight: 10 },
    { key: 'career', icon: <Briefcase size={16} />, title: 'Career', weight: 15 },
    { key: 'finance', icon: <DollarSign size={16} />, title: 'Finance', weight: 10 },
    { key: 'health', icon: <Activity size={16} />, title: 'Health', weight: 10 },
    { key: 'relationships', icon: <Heart size={16} />, title: 'Relationships', weight: 10 },
    { key: 'skills', icon: <Target size={16} />, title: 'Skills', weight: 10 },
    { key: 'goals', icon: <Target size={16} />, title: 'Life Goals', weight: 10 },
    { key: 'preferences', icon: <Settings size={16} />, title: 'Preference Model', weight: 10 }
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
}> = ({ tags, onChange, placeholder = 'Add...', maxTags = 5 }) => {
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
                        Add
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
// Data Import - text analysis
// ============================================================================

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file
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
 * Extract text from a Word file
 */
async function extractTextFromWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * Extract text based on file type
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
    
    // Word (.doc) legacy format fallback as plain text
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
        // Try mammoth for .doc, then fallback if needed
        try {
            return await extractTextFromWord(file);
        } catch {
            // If it fails, read as plain text
            return file.text();
        }
    }
    
    // Plain text formats (.txt, .md, .json, .csv)
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
 * Local text analysis - extract profile hints from user text.
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

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / Math.max(sentences.length, 1);

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojiMatches = text.match(emojiRegex) || [];
    const emojiDensity = emojiMatches.length / (text.length / 100);

    const formalWords = ['dear', 'regards', 'sincerely', 'thank you', 'please'];
    const casualWords = ['lol', 'haha', 'omg', 'btw', 'yep', 'kinda'];
    const formalCount = formalWords.reduce((c, w) => c + (text.match(new RegExp(w, 'gi')) || []).length, 0);
    const casualCount = casualWords.reduce((c, w) => c + (text.match(new RegExp(w, 'gi')) || []).length, 0);

    if (avgSentenceLength < 15 && emojiDensity < 0.5) {
        profile.communicationStyle = 'Concise';
    } else if (formalCount > casualCount * 1.5) {
        profile.communicationStyle = 'Professional';
    } else if (casualCount > formalCount * 1.5 || emojiDensity > 2) {
        profile.communicationStyle = 'Casual';
    }

    const interestPatterns: Record<string, RegExp> = {
        Technology: /ai|coding|programming|software|tech/i,
        Investment: /stock|fund|invest|finance|wealth/i,
        Health: /fitness|exercise|running|yoga|sleep|health/i,
        Travel: /travel|trip|flight|hotel|vacation/i,
        Reading: /read|book|novel|article/i,
        Food: /food|restaurant|cooking|cuisine/i,
        Music: /music|song|concert|instrument/i,
        Movies: /movie|film|tv|series|netflix/i
    };

    Object.entries(interestPatterns).forEach(([topic, pattern]) => {
        if (pattern.test(text)) {
            profile.interests.push(topic);
        }
    });

    const concernPatterns: Record<string, RegExp> = {
        'Work stress': /overtime|busy|exhausted|deadline|work stress|burnout/i,
        'Career growth': /promotion|job change|interview|career path|career stuck/i,
        'Financial pressure': /debt|mortgage|expenses|money pressure|cash flow/i,
        'Health issues': /insomnia|anxiety|sick|hospital|pain/i,
        Relationships: /argument|conflict|lonely|relationship issue/i
    };

    Object.entries(concernPatterns).forEach(([concern, pattern]) => {
        if (pattern.test(text)) {
            profile.concerns.push(concern);
        }
    });

    const goalPatterns: Record<string, RegExp> = {
        'Skill growth': /learn|improve|grow|upskill/i,
        'Increase income': /raise|salary|income|side hustle|business/i,
        'Stay healthy': /weight loss|workout|healthy lifestyle|sleep early/i,
        'Improve relationships': /social|friends|dating|family/i
    };

    Object.entries(goalPatterns).forEach(([goal, pattern]) => {
        if (pattern.test(text)) {
            profile.goals.push(goal);
        }
    });

    const stressKeywords = ['stress', 'anxious', 'worried', 'burnout', 'tired', 'overwhelmed', 'insomnia'];
    const stressCount = stressKeywords.reduce((c, w) => c + (text.match(new RegExp(w, 'gi')) || []).length, 0);
    profile.stressLevel = Math.min(80, 30 + stressCount * 5);

    const directAgeMatch = text.match(/\b(?:i am|i'm|age)\s*(\d{2})\b/i);
    const birthYearMatch = text.match(/\b(?:born in|born)\s*(\d{4})\b/i);
    if (directAgeMatch?.[1]) {
        profile.age = parseInt(directAgeMatch[1], 10);
    } else if (birthYearMatch?.[1]) {
        profile.age = new Date().getFullYear() - parseInt(birthYearMatch[1], 10);
    }

    const occupationPatterns = [
        { pattern: /developer|engineer|programmer|coder/i, value: 'Software Engineering' },
        { pattern: /product manager|pm/i, value: 'Product Management' },
        { pattern: /designer|ui|ux/i, value: 'Design' },
        { pattern: /operations|marketing|growth/i, value: 'Marketing & Operations' },
        { pattern: /finance|banking|investment/i, value: 'Finance' },
        { pattern: /teacher|education|professor/i, value: 'Education' },
        { pattern: /doctor|nurse|medical|healthcare/i, value: 'Healthcare' },
        { pattern: /lawyer|legal|attorney/i, value: 'Legal' },
        { pattern: /student|college|university|graduate/i, value: 'Student' }
    ];

    for (const { pattern, value } of occupationPatterns) {
        if (pattern.test(text)) {
            profile.occupation = value;
            break;
        }
    }

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
        await new Promise(r => setTimeout(r, 800)); // Simulate analysis time
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
                setParseError('File content is too short. Please provide more data.');
                setIsAnalyzing(false);
                return;
            }
            const result = analyzeTextForProfile(text);
            setAnalyzed(result);
        } catch (e) {
            console.error('File parse error', e);
            setParseError('Failed to parse file. Please try another format.');
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
                        Learn from text
                    </div>
                    <div className="text-xs" style={{ color: colors.text3 }}>
                        Import chat logs, notes, or journals for local analysis
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
                    <span className="text-sm font-medium" style={{ color: colors.text1 }}>Import Data</span>
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
                        <p className="text-sm" style={{ color: colors.text2 }}>Analyzing locally...</p>
                    </div>
                ) : analyzed ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Check size={16} className="text-emerald-400" />
                            <span className="text-sm font-medium" style={{ color: colors.text1 }}>
                                Analysis complete (confidence {analyzed.confidence}%)
                            </span>
                        </div>

                        <div className="space-y-3 text-sm">
                            {analyzed.age && (
                                <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <span style={{ color: colors.text3 }}>Estimated age</span>
                                    <span style={{ color: colors.text1 }}>{analyzed.age} yrs</span>
                                </div>
                            )}
                            {analyzed.occupation && (
                                <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <span style={{ color: colors.text3 }}>Career direction</span>
                                    <span style={{ color: colors.text1 }}>{analyzed.occupation}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                <span style={{ color: colors.text3 }}>Communication style</span>
                                <span style={{ color: colors.text1 }}>
                                    {{ Professional: 'Formal and professional', Friendly: 'Warm and friendly', Casual: 'Casual and relaxed', Concise: 'Concise and direct' }[analyzed.communicationStyle]}
                                </span>
                            </div>
                            {analyzed.interests.length > 0 && (
                                <div className="py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text3 }} className="mb-2">Interest areas</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analyzed.interests.map(i => (
                                            <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg3, color: colors.text2 }}>{i}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {analyzed.concerns.length > 0 && (
                                <div className="py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <div style={{ color: colors.text3 }} className="mb-2">Key concerns</div>
                                    <div className="flex flex-wrap gap-1">
                                        {analyzed.concerns.map(c => (
                                            <span key={c} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.warningMuted, color: colors.warning }}>{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {analyzed.goals.length > 0 && (
                                <div className="py-2">
                                    <div style={{ color: colors.text3 }} className="mb-2">Potential goals</div>
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
                                Analyze again
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: colors.primary, color: '#fff' }}
                            >
                                Apply to avatar
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
                            <p className="text-sm" style={{ color: colors.text2 }}>Drag files here</p>
                            <p className="text-xs mt-1" style={{ color: colors.text3 }}>Supports PDF, Word, TXT, and Markdown</p>
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
                            <span className="text-xs" style={{ color: colors.text3 }}>Or</span>
                            <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                        </div>

                        {/* Paste Area */}
                        <div className="space-y-2">
                            <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder="Paste chat logs, notes, or any text content..."
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
                                    Start analysis
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs" style={{ color: colors.text3 }}>
                            <Shield size={12} />
                            <span>All data is processed locally and never uploaded to the server</span>
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
        <FormField label="Age">
            <NumberInput 
                value={state.age} 
                onChange={(age) => onChange({ age })}
                min={16}
                max={80}
                suffix="yrs"
            />
        </FormField>
        
        <FormField label="Life Stage">
            <SelectInput
                value={state.lifeStage}
                onChange={(v) => onChange({ lifeStage: v as LifeStage })}
                options={[
                    { value: 'student', label: 'Student' },
                    { value: 'early_career', label: 'Early Career' },
                    { value: 'career_growth', label: 'Growth Stage' },
                    { value: 'career_peak', label: 'Peak Stage' },
                    { value: 'late_career', label: 'Late Career' },
                    { value: 'retired', label: 'Retired' }
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
        <FormField label="Highest Degree">
            <SelectInput
                value={state.education.highestDegree}
                onChange={(v) => onChange({ education: { ...state.education, highestDegree: v as any } })}
                options={[
                    { value: 'high_school', label: 'High School' },
                    { value: 'bachelor', label: 'Bachelor' },
                    { value: 'master', label: 'Master' },
                    { value: 'phd', label: 'PhD' },
                    { value: 'other', label: 'Other' }
                ]}
            />
        </FormField>

        <FormField label="Field of Study">
            <TextInput 
                value={state.education.field || ''}
                onChange={(v) => onChange({ education: { ...state.education, field: v } })}
                placeholder="Computer Science, Finance, Design..."
            />
        </FormField>
    </div>
);

const CareerSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="Employment Status">
            <SelectInput
                value={state.career.currentStatus}
                onChange={(v) => onChange({ career: { ...state.career, currentStatus: v as any } })}
                options={[
                    { value: 'student', label: 'Student' },
                    { value: 'employed', label: 'Employed' },
                    { value: 'self_employed', label: 'Self-employed' },
                    { value: 'freelance', label: 'Freelance' },
                    { value: 'unemployed', label: 'Unemployed' },
                    { value: 'retired', label: 'Retired' }
                ]}
            />
        </FormField>

        <FormField label="Industry">
            <TextInput 
                value={state.career.industry || ''}
                onChange={(v) => onChange({ career: { ...state.career, industry: v } })}
                placeholder="Technology, Finance, Healthcare..."
            />
        </FormField>

        <FormField label="Years of Experience">
            <NumberInput 
                value={state.career.yearsOfExperience} 
                onChange={(v) => onChange({ career: { ...state.career, yearsOfExperience: v } })}
                min={0}
                max={50}
                suffix="years"
            />
        </FormField>

        <FormField label="Career Satisfaction">
            <SliderInput
                value={state.career.careerSatisfaction}
                onChange={(v) => onChange({ career: { ...state.career, careerSatisfaction: v } })}
                labels={['Unsatisfied', 'Very satisfied']}
            />
        </FormField>
    </div>
);

const FinanceSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="Income Level">
            <SelectInput
                value={state.finance.incomeLevel}
                onChange={(v) => onChange({ finance: { ...state.finance, incomeLevel: v as any } })}
                options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'very_high', label: 'Very High' }
                ]}
            />
        </FormField>

        <FormField label="Savings Level">
            <SelectInput
                value={state.finance.savingsLevel}
                onChange={(v) => onChange({ finance: { ...state.finance, savingsLevel: v as any } })}
                options={[
                    { value: 'none', label: 'None' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' }
                ]}
            />
        </FormField>

        <FormField label="Financial Stress">
            <SliderInput
                value={state.finance.financialStress}
                onChange={(v) => onChange({ finance: { ...state.finance, financialStress: v } })}
                labels={['No stress', 'Very high stress']}
            />
        </FormField>

        <div className="flex gap-4">
            <Checkbox
                checked={state.finance.hasProperty}
                onChange={(v) => onChange({ finance: { ...state.finance, hasProperty: v } })}
                label="Owns property"
            />
            <Checkbox
                checked={state.finance.hasInvestments}
                onChange={(v) => onChange({ finance: { ...state.finance, hasInvestments: v } })}
                label="Has investments"
            />
        </div>
    </div>
);

const HealthSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="Physical Health">
            <SliderInput
                value={state.health.physicalHealth}
                onChange={(v) => onChange({ health: { ...state.health, physicalHealth: v } })}
                labels={['Poor', 'Excellent']}
            />
        </FormField>

        <FormField label="Mental Health">
            <SliderInput
                value={state.health.mentalHealth}
                onChange={(v) => onChange({ health: { ...state.health, mentalHealth: v } })}
                labels={['Poor', 'Excellent']}
            />
        </FormField>

        <FormField label="Energy Level">
            <SliderInput
                value={state.health.energyLevel}
                onChange={(v) => onChange({ health: { ...state.health, energyLevel: v } })}
                labels={['Exhausted', 'Energized']}
            />
        </FormField>

        <FormField label="Exercise Frequency">
            <SelectInput
                value={state.health.exerciseFrequency}
                onChange={(v) => onChange({ health: { ...state.health, exerciseFrequency: v as any } })}
                options={[
                    { value: 'none', label: 'Almost never' },
                    { value: 'rarely', label: 'Occasionally' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'daily', label: 'Daily' }
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
        <FormField label="Relationship Status">
            <SelectInput
                value={state.relationships.status}
                onChange={(v) => onChange({ relationships: { ...state.relationships, status: v as any } })}
                options={[
                    { value: 'single', label: 'Single' },
                    { value: 'dating', label: 'Dating' },
                    { value: 'married', label: 'Married' },
                    { value: 'divorced', label: 'Divorced' }
                ]}
            />
        </FormField>

        <Checkbox
            checked={state.relationships.hasChildren}
            onChange={(v) => onChange({ relationships: { ...state.relationships, hasChildren: v } })}
            label="Has children"
        />

        <FormField label="Family Relationship Quality">
            <SliderInput
                value={state.relationships.familyRelationshipQuality}
                onChange={(v) => onChange({ relationships: { ...state.relationships, familyRelationshipQuality: v } })}
                labels={['Tense', 'Harmonious']}
            />
        </FormField>

        <FormField label="Social Satisfaction">
            <SliderInput
                value={state.relationships.socialSatisfaction}
                onChange={(v) => onChange({ relationships: { ...state.relationships, socialSatisfaction: v } })}
                labels={['Unsatisfied', 'Very satisfied']}
            />
        </FormField>
    </div>
);

const SkillsSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="Core Skills" hint="Up to 5">
            <TagInput
                tags={state.skills.topSkills}
                onChange={(tags) => onChange({ skills: { ...state.skills, topSkills: tags } })}
                placeholder="Programming, Speaking, Management..."
                maxTags={5}
            />
        </FormField>

        <FormField label="Learning Goals">
            <TagInput
                tags={state.skills.learningGoals}
                onChange={(tags) => onChange({ skills: { ...state.skills, learningGoals: tags } })}
                placeholder="Skills you want to learn..."
                maxTags={5}
            />
        </FormField>

        <FormField label="Technical Proficiency">
            <SliderInput
                value={state.skills.technicalProficiency}
                onChange={(v) => onChange({ skills: { ...state.skills, technicalProficiency: v } })}
                labels={['Beginner', 'Expert']}
            />
        </FormField>

        <FormField label="Leadership Experience">
            <SliderInput
                value={state.skills.leadershipExperience}
                onChange={(v) => onChange({ skills: { ...state.skills, leadershipExperience: v } })}
                labels={['None', 'Extensive']}
            />
        </FormField>
    </div>
);

const GoalsSection: React.FC<{
    state: LifeStateSnapshot;
    onChange: (updates: Partial<LifeStateSnapshot>) => void;
}> = ({ state, onChange }) => (
    <div className="space-y-5">
        <FormField label="Short-term Goals (within 1 year)">
            <TagInput
                tags={state.lifeGoals.shortTerm}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, shortTerm: tags } })}
                placeholder="Add goals..."
            />
        </FormField>

        <FormField label="Mid-term Goals (1-5 years)">
            <TagInput
                tags={state.lifeGoals.mediumTerm}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, mediumTerm: tags } })}
                placeholder="Add goals..."
            />
        </FormField>

        <FormField label="Long-term Goals (5+ years)">
            <TagInput
                tags={state.lifeGoals.longTerm}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, longTerm: tags } })}
                placeholder="Add goals..."
            />
        </FormField>

        <FormField label="Core Values">
            <TagInput
                tags={state.lifeGoals.coreValues}
                onChange={(tags) => onChange({ lifeGoals: { ...state.lifeGoals, coreValues: tags } })}
                placeholder="Family, Growth, Freedom..."
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
                These settings affect how the algorithm computes your optimal life path
            </div>

            <FormField label="Optimization Goal">
                <SelectInput
                    value={prefs.optimizationGoal}
                    onChange={(v) => onChange({ optimizationGoal: v as any })}
                    options={[
                        { value: 'wealth', label: 'Maximize Wealth' },
                        { value: 'happiness', label: 'Maximize Happiness' },
                        { value: 'health', label: 'Health First' },
                        { value: 'balance', label: 'Balanced Growth' },
                        { value: 'achievement', label: 'Achievement-oriented' }
                    ]}
                />
            </FormField>

            <FormField label="Risk Appetite">
                <SliderInput
                    value={prefs.riskAppetite}
                    onChange={(v) => onChange({ riskAppetite: v })}
                    labels={['Conservative', 'Aggressive']}
                />
            </FormField>

            <FormField label="Planning Horizon">
                <SelectInput
                    value={prefs.timeHorizon}
                    onChange={(v) => onChange({ timeHorizon: v as any })}
                    options={[
                        { value: 'short', label: 'Short-term (1-3 years)' },
                        { value: 'medium', label: 'Mid-term (5-10 years)' },
                        { value: 'long', label: 'Long-term (20+ years)' },
                        { value: 'very_long', label: 'Lifelong (age-60 perspective)' }
                    ]}
                />
            </FormField>

            <FormField label={`Foresight Coefficient (γ = ${prefs.gamma.toFixed(2)})`} hint="Higher values prioritize long-term returns">
                <SliderInput
                    value={Math.round(prefs.gamma * 100)}
                    onChange={(v) => onChange({ gamma: v / 100 })}
                    min={80}
                    max={99}
                    labels={['Present-focused', 'Highly foresighted']}
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

    // Handle data import
    const handleDataImport = useCallback((profile: AnalyzedProfile) => {
        const updates: Partial<LifeStateSnapshot> = {};
        
        // Age
        if (profile.age && profile.age > 0 && profile.age < 100) {
            updates.age = profile.age;
        }
        
        // Occupation
        if (profile.occupation) {
            updates.career = {
                ...lifeState.career,
                role: profile.occupation
            };
        }

        // Map interests to skills/goals
        if (profile.interests.length > 0) {
            updates.skills = {
                ...lifeState.skills,
                topSkills: [...new Set([...lifeState.skills.topSkills, ...profile.interests])].slice(0, 5)
            };
        }

        // Map concerns to challenges
        if (profile.concerns.length > 0) {
            updates.currentChallenges = {
                ...lifeState.currentChallenges,
                primaryConcerns: [...new Set([...lifeState.currentChallenges.primaryConcerns, ...profile.concerns])].slice(0, 5),
                stressLevel: profile.stressLevel
            };
        }

        // Goals
        if (profile.goals.length > 0) {
            updates.lifeGoals = {
                ...lifeState.lifeGoals,
                shortTerm: [...new Set([...lifeState.lifeGoals.shortTerm, ...profile.goals])].slice(0, 5)
            };
        }

        // Health info based on stress level
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
                            Digital Twin Configuration
                        </h2>
                        <p className="text-xs mt-1" style={{ color: colors.text3 }}>
                            Complete your profile for more accurate navigation recommendations
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs" style={{ color: colors.text3 }}>Completion</div>
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
                        Digital twin is ready. Open <span style={{ color: colors.text1 }}>Destiny</span> to view navigation suggestions
                    </span>
                </div>
            )}
        </div>
    );
};

export default DigitalSoulEditor;
