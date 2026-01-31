import React, { useState, useCallback, useRef } from 'react';
import {
    Sparkles, Shield, CheckCircle, X, ChevronRight, ChevronLeft,
    Upload, FileText, MessageSquare, ShoppingBag, Brain, Loader2,
    Globe, Zap, AlertCircle, Coffee, Heart, Briefcase, Clock
} from 'lucide-react';
import { SoulMatrix } from '../types';
import { getEnhancedDigitalAvatar, saveEnhancedDigitalAvatar } from '../services/localStorageService';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface DigitalSoulOnboardingProps {
    onComplete: (soul: SoulMatrix) => void;
    onSkip: () => void;
}

type Language = 'zh' | 'en';
type InitMethod = 'questionnaire' | 'import' | null;

interface ScenarioChoice {
    id: string;
    emoji: string;
    textZh: string;
    textEn: string;
    implication: {
        style?: SoulMatrix['communicationStyle'];
        spending?: SoulMatrix['spendingPreference'];
        privacy?: SoulMatrix['privacyLevel'];
        risk?: SoulMatrix['riskTolerance'];
    };
}

interface ScenarioQuestion {
    id: string;
    scenarioZh: string;
    scenarioEn: string;
    questionZh: string;
    questionEn: string;
    icon: React.ReactNode;
    choices: ScenarioChoice[];
}

interface ImportableData {
    type: 'wechat' | 'weibo' | 'notes' | 'journal' | 'custom';
    name: string;
    nameEn: string;
    icon: string;
    acceptTypes: string;
    description: string;
    descriptionEn: string;
}

interface ParsedProfile {
    communicationStyle?: SoulMatrix['communicationStyle'];
    spendingPreference?: SoulMatrix['spendingPreference'];
    privacyLevel?: SoulMatrix['privacyLevel'];
    riskTolerance?: SoulMatrix['riskTolerance'];
    confidence: number;
}

// ============================================================================
// Constants - 场景化问题设计
// ============================================================================

const TEXTS = {
    zh: {
        welcome: '让我更懂你',
        welcomeSubtitle: '通过几个小场景，建立你的数字分身',
        methodQuestion: '选择初始化方式',
        questionnaire: '回答几个场景问题',
        questionnaireDesc: '像朋友聊天一样，2分钟了解你',
        import: '从你的文字中学习',
        importDesc: '导入聊天记录或笔记（本地分析）',
        back: '上一步',
        next: '继续',
        complete: '开始使用',
        skip: '跳过，慢慢了解我',
        analyzing: '正在本地分析你的文字风格...',
        analysisComplete: '分析完成',
        selectFile: '选择文件',
        dragDrop: '或拖拽文件到此处',
        privacyNote: '所有数据仅在本地处理',
        importError: '分析失败，请重试',
        confidence: '了解程度',
        useAnalysis: '就是这样的我',
        adjustManually: '我来调整',
        scenario: '想象一下...'
    },
    en: {
        welcome: 'Let Me Know You',
        welcomeSubtitle: 'A few scenarios to build your digital soul',
        methodQuestion: 'How would you like to start?',
        questionnaire: 'Answer Some Scenarios',
        questionnaireDesc: 'Like chatting with a friend, 2 mins',
        import: 'Learn from Your Writing',
        importDesc: 'Import chat history or notes (local analysis)',
        back: 'Back',
        next: 'Continue',
        complete: 'Get Started',
        skip: 'Skip, learn about me later',
        analyzing: 'Analyzing your writing style locally...',
        analysisComplete: 'Analysis Complete',
        selectFile: 'Select File',
        dragDrop: 'or drag and drop here',
        privacyNote: 'All data processed locally',
        importError: 'Analysis failed, please retry',
        confidence: 'Understanding',
        useAnalysis: "That's me",
        adjustManually: 'Let me adjust',
        scenario: 'Imagine this...'
    }
};

// 场景化问题 - 更符合人类思维
const SCENARIO_QUESTIONS: ScenarioQuestion[] = [
    {
        id: 'morning_message',
        scenarioZh: '早上 9 点，你收到一条工作消息，同事问你昨天的方案进展。',
        scenarioEn: "It's 9 AM. A colleague messages you asking about yesterday's project progress.",
        questionZh: '你会怎么回复？',
        questionEn: 'How would you reply?',
        icon: <Coffee size={28} className="text-amber-400" />,
        choices: [
            {
                id: 'formal',
                emoji: '📋',
                textZh: '"您好，目前进度已完成 80%，预计今天下午可以交付初稿。"',
                textEn: '"Hello, progress is at 80%. I expect to deliver the first draft this afternoon."',
                implication: { style: 'Professional' }
            },
            {
                id: 'friendly',
                emoji: '😊',
                textZh: '"早啊！昨天搞到挺晚的，大概完成了八成，今天应该能出初稿～"',
                textEn: '"Morning! Worked late yesterday, about 80% done. Should have a draft today~"',
                implication: { style: 'Friendly' }
            },
            {
                id: 'concise',
                emoji: '⚡',
                textZh: '"80%，今天出稿。"',
                textEn: '"80%. Draft today."',
                implication: { style: 'Concise' }
            },
            {
                id: 'casual',
                emoji: '😄',
                textZh: '"哈哈别催啦～今天肯定搞定！"',
                textEn: '"Haha don\'t rush~ Definitely getting it done today!"',
                implication: { style: 'Casual' }
            }
        ]
    },
    {
        id: 'weekend_plan',
        scenarioZh: '周末想买一双新跑鞋。你打开购物 App...',
        scenarioEn: "Weekend. You want to buy new running shoes. You open a shopping app...",
        questionZh: '你的第一反应是？',
        questionEn: "What's your first instinct?",
        icon: <ShoppingBag size={28} className="text-emerald-400" />,
        choices: [
            {
                id: 'price_first',
                emoji: '💰',
                textZh: '先按价格排序，看看有没有性价比高的选择',
                textEn: 'Sort by price first, look for good value options',
                implication: { spending: 'PriceFirst' }
            },
            {
                id: 'balanced',
                emoji: '⚖️',
                textZh: '看看评价和价格，找一个综合最优的',
                textEn: 'Check reviews and price, find the best overall',
                implication: { spending: 'Balanced' }
            },
            {
                id: 'quality_first',
                emoji: '✨',
                textZh: '直接看热门品牌，跑鞋还是要买好的',
                textEn: 'Go straight to top brands, running shoes should be quality',
                implication: { spending: 'QualityFirst' }
            }
        ]
    },
    {
        id: 'friend_request',
        scenarioZh: '一个陌生人通过朋友圈加你微信，说是朋友的朋友。',
        scenarioEn: "A stranger adds you on WeChat, saying they're a friend of a friend.",
        questionZh: '你会怎么做？',
        questionEn: 'What would you do?',
        icon: <Shield size={28} className="text-blue-400" />,
        choices: [
            {
                id: 'strict',
                emoji: '🔒',
                textZh: '不加。不认识的人一律不通过',
                textEn: "Don't add. I don't add people I don't know",
                implication: { privacy: 'Strict' }
            },
            {
                id: 'balanced',
                emoji: '🤔',
                textZh: '先问问那个朋友是不是真的认识，再决定',
                textEn: 'Ask my friend first if they really know them, then decide',
                implication: { privacy: 'Balanced' }
            },
            {
                id: 'open',
                emoji: '👋',
                textZh: '加呗，多个朋友多条路',
                textEn: 'Sure, more friends more possibilities',
                implication: { privacy: 'Open' }
            }
        ]
    },
    {
        id: 'career_choice',
        scenarioZh: '有两个工作机会：A 是稳定的大公司，B 是有潜力的创业公司。',
        scenarioEn: 'Two job offers: A is a stable big company, B is a promising startup.',
        questionZh: '你倾向于？',
        questionEn: 'Which would you lean towards?',
        icon: <Briefcase size={28} className="text-purple-400" />,
        choices: [
            {
                id: 'conservative',
                emoji: '🏢',
                textZh: '选 A，稳定是第一位的，风险太大承受不起',
                textEn: "Choose A. Stability comes first, can't afford big risks",
                implication: { risk: 'Low' }
            },
            {
                id: 'balanced',
                emoji: '🤝',
                textZh: '要看具体条件，两边都有可能',
                textEn: 'Depends on the details, either could work',
                implication: { risk: 'Medium' }
            },
            {
                id: 'adventurous',
                emoji: '🚀',
                textZh: '选 B，年轻就该拼一把，大不了重来',
                textEn: 'Choose B. Should take risks while young, can always start over',
                implication: { risk: 'High' }
            }
        ]
    },
    {
        id: 'late_night',
        scenarioZh: '晚上 11 点，明天有重要的事，但你今天的任务还没完成。',
        scenarioEn: "It's 11 PM. You have something important tomorrow, but today's task isn't done.",
        questionZh: '你会怎么做？',
        questionEn: 'What would you do?',
        icon: <Clock size={28} className="text-indigo-400" />,
        choices: [
            {
                id: 'finish',
                emoji: '💪',
                textZh: '熬夜也要完成，欠债的感觉太难受',
                textEn: 'Stay up and finish. Hate leaving things incomplete',
                implication: { style: 'Professional', risk: 'Low' }
            },
            {
                id: 'prioritize',
                emoji: '🧠',
                textZh: '先睡，明天的事更重要，今天的可以调整',
                textEn: "Sleep first. Tomorrow's more important, today's can be adjusted",
                implication: { style: 'Concise', risk: 'Medium' }
            },
            {
                id: 'relax',
                emoji: '😌',
                textZh: '先放松一下，状态好了再决定',
                textEn: 'Relax a bit first, decide when in better state',
                implication: { style: 'Casual', risk: 'Medium' }
            }
        ]
    }
];

const IMPORTABLE_DATA: ImportableData[] = [
    {
        type: 'wechat',
        name: '微信聊天记录',
        nameEn: 'WeChat Chat History',
        icon: '💬',
        acceptTypes: '.txt,.html,.json',
        description: '导出的聊天记录文件',
        descriptionEn: 'Exported chat history file'
    },
    {
        type: 'notes',
        name: '备忘录/笔记',
        nameEn: 'Notes/Memos',
        icon: '📝',
        acceptTypes: '.txt,.md,.json',
        description: '你的日常笔记',
        descriptionEn: 'Your daily notes'
    },
    {
        type: 'journal',
        name: '日记/随笔',
        nameEn: 'Journal/Diary',
        icon: '📔',
        acceptTypes: '.txt,.md,.json',
        description: '个人日记或随笔',
        descriptionEn: 'Personal journal entries'
    },
    {
        type: 'custom',
        name: '其他文本',
        nameEn: 'Other Text',
        icon: '📄',
        acceptTypes: '.txt,.md,.csv,.json',
        description: '任何包含你写作内容的文件',
        descriptionEn: 'Any file with your writing'
    }
];

// ============================================================================
// Local Text Analysis
// ============================================================================

function analyzeTextLocally(text: string): ParsedProfile {
    const profile: ParsedProfile = { confidence: 0 };

    if (!text || text.length < 100) {
        return { ...profile, confidence: 0 };
    }

    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / Math.max(sentences.length, 1);

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojiMatches = text.match(emojiRegex) || [];
    const emojiDensity = emojiMatches.length / (text.length / 100);

    const formalWords = ['您', '贵', '敬请', '谨此', 'Dear', 'Regards', 'Sincerely', '感谢', '请'];
    const casualWords = ['哈哈', '嘻嘻', '呀', '啦', '嘛', '哦', 'lol', 'haha', '666', '牛', '绝了'];
    
    const formalCount = formalWords.reduce((count, word) => 
        count + (text.match(new RegExp(word, 'gi')) || []).length, 0);
    const casualCount = casualWords.reduce((count, word) => 
        count + (text.match(new RegExp(word, 'gi')) || []).length, 0);

    const priceWords = ['便宜', '优惠', '打折', '省钱', '性价比', 'cheap', 'discount', 'budget', '划算'];
    const qualityWords = ['品质', '高端', '奢侈', '最好', '顶级', 'premium', 'luxury', 'best', '体验'];
    
    const priceCount = priceWords.reduce((count, word) => 
        count + (text.match(new RegExp(word, 'gi')) || []).length, 0);
    const qualityCount = qualityWords.reduce((count, word) => 
        count + (text.match(new RegExp(word, 'gi')) || []).length, 0);

    const privacyWords = ['隐私', '安全', '不想', '保密', 'privacy', 'secure', '不要分享'];
    const openWords = ['分享', '推荐', '大家', '公开', 'share', 'recommend', 'everyone'];
    
    const privacyCount = privacyWords.reduce((count, word) => 
        count + (text.match(new RegExp(word, 'gi')) || []).length, 0);
    const openCount = openWords.reduce((count, word) => 
        count + (text.match(new RegExp(word, 'gi')) || []).length, 0);

    if (avgSentenceLength < 15 && emojiDensity < 0.5) {
        profile.communicationStyle = 'Concise';
    } else if (formalCount > casualCount * 1.5) {
        profile.communicationStyle = 'Professional';
    } else if (casualCount > formalCount * 1.5 || emojiDensity > 2) {
        profile.communicationStyle = 'Casual';
    } else {
        profile.communicationStyle = 'Friendly';
    }

    if (priceCount > qualityCount * 1.5) {
        profile.spendingPreference = 'PriceFirst';
    } else if (qualityCount > priceCount * 1.5) {
        profile.spendingPreference = 'QualityFirst';
    } else {
        profile.spendingPreference = 'Balanced';
    }

    if (privacyCount > openCount * 2) {
        profile.privacyLevel = 'Strict';
    } else if (openCount > privacyCount * 2) {
        profile.privacyLevel = 'Open';
    } else {
        profile.privacyLevel = 'Balanced';
    }

    profile.riskTolerance = 'Medium';

    const textLengthScore = Math.min(text.length / 5000, 1) * 40;
    const featureScore = Math.min((formalCount + casualCount + priceCount + qualityCount) / 20, 1) * 30;
    const consistencyScore = 30;
    
    profile.confidence = Math.round(textLengthScore + featureScore + consistencyScore);

    return profile;
}

// ============================================================================
// Helper Functions
// ============================================================================

function aggregateChoices(choices: Record<string, string>): SoulMatrix {
    const styleCounts: Record<string, number> = { Professional: 0, Friendly: 0, Concise: 0, Casual: 0 };
    const spendingCounts: Record<string, number> = { PriceFirst: 0, Balanced: 0, QualityFirst: 0 };
    const privacyCounts: Record<string, number> = { Strict: 0, Balanced: 0, Open: 0 };
    const riskCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };

    Object.entries(choices).forEach(([questionId, choiceId]) => {
        const question = SCENARIO_QUESTIONS.find(q => q.id === questionId);
        const choice = question?.choices.find(c => c.id === choiceId);
        
        if (choice?.implication) {
            if (choice.implication.style) styleCounts[choice.implication.style]++;
            if (choice.implication.spending) spendingCounts[choice.implication.spending]++;
            if (choice.implication.privacy) privacyCounts[choice.implication.privacy]++;
            if (choice.implication.risk) riskCounts[choice.implication.risk]++;
        }
    });

    const getMax = (counts: Record<string, number>, defaultVal: string) => {
        const max = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a);
        return max[1] > 0 ? max[0] : defaultVal;
    };

    return {
        communicationStyle: getMax(styleCounts, 'Friendly') as SoulMatrix['communicationStyle'],
        spendingPreference: getMax(spendingCounts, 'Balanced') as SoulMatrix['spendingPreference'],
        privacyLevel: getMax(privacyCounts, 'Balanced') as SoulMatrix['privacyLevel'],
        riskTolerance: getMax(riskCounts, 'Medium') as SoulMatrix['riskTolerance']
    };
}

// ============================================================================
// Sub Components
// ============================================================================

interface MethodSelectorProps {
    lang: Language;
    onSelect: (method: InitMethod) => void;
}

const MethodSelector: React.FC<MethodSelectorProps> = ({ lang, onSelect }) => {
    const t = TEXTS[lang];
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-300 text-center mb-6">
                {t.methodQuestion}
            </h3>
            
            <button
                onClick={() => onSelect('questionnaire')}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800/90 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                        <MessageSquare size={28} className="text-purple-400" />
                    </div>
                    <div className="text-left flex-1">
                        <div className="text-white font-semibold text-lg">{t.questionnaire}</div>
                        <div className="text-slate-400 text-sm mt-1">{t.questionnaireDesc}</div>
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
            </button>
            
            <button
                onClick={() => onSelect('import')}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-800/90 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                        <Upload size={28} className="text-emerald-400" />
                    </div>
                    <div className="text-left flex-1">
                        <div className="text-white font-semibold text-lg">{t.import}</div>
                        <div className="text-slate-400 text-sm mt-1">{t.importDesc}</div>
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
            </button>
            
            <div className="flex items-center gap-2 justify-center mt-6 text-xs text-slate-500">
                <Shield size={14} />
                <span>{t.privacyNote}</span>
            </div>
        </div>
    );
};

interface DataImportPanelProps {
    lang: Language;
    onAnalysisComplete: (profile: ParsedProfile) => void;
    onBack: () => void;
}

const DataImportPanel: React.FC<DataImportPanelProps> = ({ lang, onAnalysisComplete, onBack }) => {
    const t = TEXTS[lang];
    const [selectedType, setSelectedType] = useState<ImportableData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        setError(null);
        setIsAnalyzing(true);

        try {
            const text = await file.text();
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const profile = analyzeTextLocally(text);
            
            if (profile.confidence < 20) {
                setError(lang === 'zh' ? '文本内容太少，请提供更多数据' : 'Not enough text content');
                setIsAnalyzing(false);
                return;
            }
            
            onAnalysisComplete(profile);
        } catch (err) {
            setError(t.importError);
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    if (isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-emerald-500/20 flex items-center justify-center mb-6">
                    <Loader2 size={40} className="text-purple-400 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{t.analyzing}</h3>
                <p className="text-sm text-slate-400">{t.privacyNote}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {!selectedType ? (
                <>
                    <h3 className="text-lg font-medium text-slate-300 text-center mb-4">
                        {lang === 'zh' ? '选择数据类型' : 'Select Data Type'}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {IMPORTABLE_DATA.map(data => (
                            <button
                                key={data.type}
                                onClick={() => setSelectedType(data)}
                                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all text-left"
                            >
                                <span className="text-2xl mb-2 block">{data.icon}</span>
                                <div className="text-white font-medium text-sm">
                                    {lang === 'zh' ? data.name : data.nameEn}
                                </div>
                                <div className="text-slate-500 text-xs mt-1">
                                    {lang === 'zh' ? data.description : data.descriptionEn}
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <button
                        onClick={() => setSelectedType(null)}
                        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4"
                    >
                        <ChevronLeft size={16} />
                        {lang === 'zh' ? '返回选择' : 'Back'}
                    </button>
                    
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                            dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                            <FileText size={32} className="text-slate-400" />
                        </div>
                        <p className="text-slate-300 mb-2">
                            <span className="text-2xl mr-2">{selectedType.icon}</span>
                            {lang === 'zh' ? selectedType.name : selectedType.nameEn}
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {t.selectFile}
                        </button>
                        <p className="text-slate-500 text-xs mt-3">{t.dragDrop}</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={selectedType.acceptTypes}
                            onChange={handleInputChange}
                            className="hidden"
                        />
                    </div>
                    
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </>
            )}
            
            <button
                onClick={onBack}
                className="w-full py-3 rounded-xl bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2 mt-4"
            >
                <ChevronLeft size={18} />
                {t.back}
            </button>
        </div>
    );
};

interface AnalysisResultPanelProps {
    lang: Language;
    profile: ParsedProfile;
    onConfirm: (soul: SoulMatrix) => void;
    onAdjust: () => void;
}

const AnalysisResultPanel: React.FC<AnalysisResultPanelProps> = ({ lang, profile, onConfirm, onAdjust }) => {
    const t = TEXTS[lang];
    
    const labels = {
        style: {
            Professional: { zh: '专业严谨', en: 'Professional', emoji: '👔' },
            Friendly: { zh: '亲切温暖', en: 'Friendly', emoji: '😊' },
            Concise: { zh: '简洁高效', en: 'Concise', emoji: '⚡' },
            Casual: { zh: '轻松随意', en: 'Casual', emoji: '😄' }
        },
        spending: {
            PriceFirst: { zh: '精打细算', en: 'Value-focused', emoji: '💰' },
            Balanced: { zh: '理性消费', en: 'Balanced', emoji: '⚖️' },
            QualityFirst: { zh: '品质至上', en: 'Quality-first', emoji: '✨' }
        },
        privacy: {
            Strict: { zh: '注重隐私', en: 'Privacy-focused', emoji: '🔒' },
            Balanced: { zh: '适度开放', en: 'Balanced', emoji: '🤝' },
            Open: { zh: '乐于分享', en: 'Open', emoji: '👋' }
        }
    };

    const handleConfirm = () => {
        const soul: SoulMatrix = {
            communicationStyle: profile.communicationStyle || 'Friendly',
            spendingPreference: profile.spendingPreference || 'Balanced',
            privacyLevel: profile.privacyLevel || 'Balanced',
            riskTolerance: profile.riskTolerance || 'Medium'
        };
        onConfirm(soul);
    };

    const styleLabel = labels.style[profile.communicationStyle || 'Friendly'];
    const spendingLabel = labels.spending[profile.spendingPreference || 'Balanced'];
    const privacyLabel = labels.privacy[profile.privacyLevel || 'Balanced'];

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/30 to-purple-500/30 flex items-center justify-center">
                    <CheckCircle size={40} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">{t.analysisComplete}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-slate-400 text-sm">{t.confidence}:</span>
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full"
                            style={{ width: `${profile.confidence}%` }}
                        />
                    </div>
                    <span className="text-emerald-400 text-sm font-medium">{profile.confidence}%</span>
                </div>
            </div>
            
            <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-1">{lang === 'zh' ? '沟通风格' : 'Communication'}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{styleLabel.emoji}</span>
                        <span className="text-white font-medium">{lang === 'zh' ? styleLabel.zh : styleLabel.en}</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-1">{lang === 'zh' ? '消费偏好' : 'Spending'}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{spendingLabel.emoji}</span>
                        <span className="text-white font-medium">{lang === 'zh' ? spendingLabel.zh : spendingLabel.en}</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-1">{lang === 'zh' ? '隐私态度' : 'Privacy'}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{privacyLabel.emoji}</span>
                        <span className="text-white font-medium">{lang === 'zh' ? privacyLabel.zh : privacyLabel.en}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-3 mt-6">
                <button onClick={onAdjust} className="flex-1 py-3 rounded-xl bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 transition-all">
                    {t.adjustManually}
                </button>
                <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white font-medium hover:from-emerald-600 hover:to-purple-700 transition-all">
                    {t.useAnalysis}
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const DigitalSoulOnboarding: React.FC<DigitalSoulOnboardingProps> = ({ onComplete, onSkip }) => {
    const [lang, setLang] = useState<Language>('zh');
    const [method, setMethod] = useState<InitMethod>(null);
    const [step, setStep] = useState(0);
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const t = TEXTS[lang];
    const totalSteps = SCENARIO_QUESTIONS.length;
    const current = SCENARIO_QUESTIONS[step];
    const progress = method === 'questionnaire' ? ((step + 1) / totalSteps) * 100 : 0;

    const handleChoice = useCallback((choiceId: string) => {
        setChoices(prev => ({ ...prev, [current.id]: choiceId }));
    }, [current]);

    const handleNext = useCallback(() => {
        if (step < totalSteps - 1) {
            setIsAnimating(true);
            setTimeout(() => {
                setStep(step + 1);
                setIsAnimating(false);
            }, 200);
            return;
        }

        // Complete
        const soul = aggregateChoices(choices);
        
        const avatar = getEnhancedDigitalAvatar();
        avatar.valuesProfile = {
            ...avatar.valuesProfile,
            priceVsQuality: soul.spendingPreference === 'PriceFirst' ? -50 : 
                            soul.spendingPreference === 'QualityFirst' ? 50 : 0
        };
        
        if (soul.communicationStyle === 'Professional') {
            avatar.communicationStyle.formality = 'formal';
        } else if (soul.communicationStyle === 'Casual') {
            avatar.communicationStyle.formality = 'casual';
        } else {
            avatar.communicationStyle.formality = 'adaptive';
        }
        
        saveEnhancedDigitalAvatar(avatar);
        onComplete(soul);
    }, [step, totalSteps, choices, onComplete]);

    const handleBack = useCallback(() => {
        if (step > 0) {
            setIsAnimating(true);
            setTimeout(() => {
                setStep(step - 1);
                setIsAnimating(false);
            }, 200);
        } else {
            setMethod(null);
        }
    }, [step]);

    const handleAnalysisComplete = useCallback((profile: ParsedProfile) => {
        setParsedProfile(profile);
    }, []);

    const handleImportConfirm = useCallback((soul: SoulMatrix) => {
        const avatar = getEnhancedDigitalAvatar();
        avatar.valuesProfile = {
            ...avatar.valuesProfile,
            priceVsQuality: soul.spendingPreference === 'PriceFirst' ? -50 : 
                            soul.spendingPreference === 'QualityFirst' ? 50 : 0
        };
        
        if (soul.communicationStyle === 'Professional') {
            avatar.communicationStyle.formality = 'formal';
        } else if (soul.communicationStyle === 'Casual') {
            avatar.communicationStyle.formality = 'casual';
        } else {
            avatar.communicationStyle.formality = 'adaptive';
        }
        
        saveEnhancedDigitalAvatar(avatar);
        onComplete(soul);
    }, [onComplete]);

    const handleAdjustManually = useCallback(() => {
        setParsedProfile(null);
        setMethod('questionnaire');
        setStep(0);
    }, []);

    const selectedChoice = choices[current?.id];
    const canProceed = !!selectedChoice;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-indigo-500/20 via-transparent to-transparent animate-pulse-slow" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-500/20 via-transparent to-transparent animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            <div className={`relative w-[500px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900/95 via-indigo-950/95 to-slate-900/95 rounded-3xl p-8 shadow-2xl border border-indigo-500/20 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Language toggle */}
                <button
                    onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-slate-800/60 text-xs font-medium text-slate-300 hover:bg-slate-700/60 transition-colors flex items-center gap-1.5"
                >
                    <Globe size={14} />
                    {lang === 'zh' ? 'EN' : '中文'}
                </button>

                {/* Close button */}
                <button
                    onClick={onSkip}
                    className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                {!method && (
                    <div className="text-center mt-8 mb-8">
                        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center border border-purple-500/20 shadow-lg">
                            <Brain size={40} className="text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t.welcome}</h2>
                        <p className="text-sm text-slate-400">{t.welcomeSubtitle}</p>
                    </div>
                )}

                {/* Progress bar */}
                {method === 'questionnaire' && (
                    <div className="mt-8 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">{step + 1} / {totalSteps}</span>
                            <span className="text-xs text-indigo-400 font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                {!method && <MethodSelector lang={lang} onSelect={setMethod} />}

                {method === 'import' && !parsedProfile && (
                    <DataImportPanel lang={lang} onAnalysisComplete={handleAnalysisComplete} onBack={() => setMethod(null)} />
                )}

                {method === 'import' && parsedProfile && (
                    <AnalysisResultPanel lang={lang} profile={parsedProfile} onConfirm={handleImportConfirm} onAdjust={handleAdjustManually} />
                )}

                {method === 'questionnaire' && (
                    <>
                        {/* Scenario Question */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 flex items-center justify-center border border-slate-700/50">
                                    {current.icon}
                                </div>
                                <div className="text-xs text-indigo-400 font-medium">{t.scenario}</div>
                            </div>
                            
                            <p className="text-slate-300 text-sm leading-relaxed mb-4 bg-slate-800/40 p-4 rounded-xl border-l-2 border-indigo-500/50">
                                {lang === 'zh' ? current.scenarioZh : current.scenarioEn}
                            </p>
                            
                            <h3 className="text-xl font-semibold text-white">
                                {lang === 'zh' ? current.questionZh : current.questionEn}
                            </h3>
                        </div>

                        {/* Choices */}
                        <div className="space-y-3 mb-8">
                            {current.choices.map(choice => {
                                const selected = selectedChoice === choice.id;
                                return (
                                    <button
                                        key={choice.id}
                                        onClick={() => handleChoice(choice.id)}
                                        className={`relative w-full rounded-xl px-5 py-4 text-left transition-all duration-200 border ${
                                            selected
                                                ? 'bg-indigo-500/20 border-indigo-400/60 shadow-lg shadow-indigo-500/10'
                                                : 'bg-slate-800/40 border-slate-700/50 hover:border-indigo-400/40 hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl mt-0.5">{choice.emoji}</span>
                                            <p className={`text-sm leading-relaxed ${selected ? 'text-white' : 'text-slate-300'}`}>
                                                {lang === 'zh' ? choice.textZh : choice.textEn}
                                            </p>
                                            {selected && (
                                                <CheckCircle size={18} className="text-indigo-400 ml-auto flex-shrink-0 mt-0.5" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 rounded-xl bg-slate-800/60 text-slate-300 font-medium hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronLeft size={18} />
                                {t.back}
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canProceed}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                                    canProceed
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {step === totalSteps - 1 ? t.complete : t.next}
                                {step < totalSteps - 1 && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </>
                )}

                {/* Skip hint */}
                <div className="mt-6 text-center">
                    <button onClick={onSkip} className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
                        {t.skip}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
                .bg-gradient-radial { background: radial-gradient(circle, var(--tw-gradient-stops)); }
            `}</style>
        </div>
    );
};

export default DigitalSoulOnboarding;
