/**
 * Bellman 优化测试面板
 * 用于测试和可视化 Bellman 人生优化引擎的各个组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Brain, Zap, RefreshCw, Play, ChevronDown, ChevronUp,
    Battery, Heart, TrendingUp, Users, Wallet, Target,
    AlertCircle, CheckCircle, Clock, Lightbulb, Settings
} from 'lucide-react';

import {
    LifeState,
    EmotionalState,
    EnergyLevel,
    FinancialPressure,
    SocialConnectedness,
    SkillMomentum,
    CurrentContext,
    LifeStage,
    extractCurrentState
} from '../services/stateExtractor';

import {
    BellmanLifeOptimizer,
    ActionRecommendation,
    LifeAction,
    LIFE_ACTIONS,
    getNextBestAction,
    getRecommendationForQuery,
    inferGamma,
    getCurrentLifeState,
    getProactiveInsights,
    ProactiveInsight
} from '../services/bellmanLifeService';

import { runBellmanPolicy, BellmanContext, formatBellmanPath } from '../services/bellmanPolicyService';
import { getEnhancedDigitalAvatar } from '../services/localStorageService';

// ============================================================================
// Types
// ============================================================================

interface TestScenario {
    id: string;
    name: string;
    nameEn: string;
    description: string;
    query: string;
    expectedDomain: string;
}

// ============================================================================
// Test Scenarios
// ============================================================================

const TEST_SCENARIOS: TestScenario[] = [
    {
        id: 'work_stress',
        name: '工作压力',
        nameEn: 'Work Stress',
        description: '模拟高压工作场景',
        query: '我最近工作压力很大，老板催得紧，不知道该怎么办',
        expectedDomain: 'work'
    },
    {
        id: 'relationship',
        name: '人际关系',
        nameEn: 'Relationship',
        description: '模拟社交困境',
        query: '和朋友吵架了，不知道要不要道歉',
        expectedDomain: 'relationship'
    },
    {
        id: 'finance',
        name: '财务决策',
        nameEn: 'Finance',
        description: '模拟消费/投资决策',
        query: '要不要买这个东西，有点纠结',
        expectedDomain: 'finance'
    },
    {
        id: 'health',
        name: '健康管理',
        nameEn: 'Health',
        description: '模拟健康问题',
        query: '最近老是熬夜，感觉很疲惫',
        expectedDomain: 'health'
    },
    {
        id: 'learning',
        name: '学习成长',
        nameEn: 'Learning',
        description: '模拟学习场景',
        query: '想学编程但是不知道从哪里开始',
        expectedDomain: 'learning'
    },
    {
        id: 'anxiety',
        name: '焦虑决策',
        nameEn: 'Anxiety',
        description: '模拟焦虑状态',
        query: '纠结要不要换工作，好焦虑',
        expectedDomain: 'work'
    }
];

// ============================================================================
// State Editor Component
// ============================================================================

interface StateEditorProps {
    state: LifeState;
    onChange: (state: LifeState) => void;
}

const StateEditor: React.FC<StateEditorProps> = ({ state, onChange }) => {
    const updateField = <K extends keyof LifeState>(field: K, value: LifeState[K]) => {
        onChange({ ...state, [field]: value });
    };

    const energyOptions: EnergyLevel[] = ['exhausted', 'low', 'moderate', 'high', 'peak'];
    const emotionOptions: EmotionalState[] = ['stressed', 'anxious', 'neutral', 'calm', 'excited'];
    const financialOptions: FinancialPressure[] = ['critical', 'high', 'moderate', 'low', 'comfortable'];
    const socialOptions: SocialConnectedness[] = ['isolated', 'weak', 'moderate', 'strong', 'thriving'];
    const skillOptions: SkillMomentum[] = ['declining', 'stagnant', 'steady', 'growing', 'accelerating'];
    const contextOptions: CurrentContext[] = ['work', 'social', 'shopping', 'planning', 'learning', 'health', 'leisure', 'unknown'];

    const labels = {
        energy: { exhausted: '精疲力竭', low: '能量较低', moderate: '状态一般', high: '精力充沛', peak: '巅峰状态' },
        emotion: { stressed: '压力大', anxious: '焦虑', neutral: '平静', calm: '从容', excited: '兴奋' },
        financial: { critical: '紧急', high: '高压', moderate: '一般', low: '轻松', comfortable: '舒适' },
        social: { isolated: '孤立', weak: '较弱', moderate: '一般', strong: '较强', thriving: '活跃' },
        skill: { declining: '下降', stagnant: '停滞', steady: '稳定', growing: '成长', accelerating: '加速' },
        context: { work: '工作', social: '社交', shopping: '购物', planning: '计划', learning: '学习', health: '健康', leisure: '休闲', unknown: '未知' }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Energy Level */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Battery size={14} /> 能量水平
                    </label>
                    <select
                        value={state.energyLevel}
                        onChange={(e) => updateField('energyLevel', e.target.value as EnergyLevel)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                        {energyOptions.map(opt => (
                            <option key={opt} value={opt}>{labels.energy[opt]}</option>
                        ))}
                    </select>
                </div>

                {/* Emotional State */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Heart size={14} /> 情绪状态
                    </label>
                    <select
                        value={state.emotionalState}
                        onChange={(e) => updateField('emotionalState', e.target.value as EmotionalState)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                        {emotionOptions.map(opt => (
                            <option key={opt} value={opt}>{labels.emotion[opt]}</option>
                        ))}
                    </select>
                </div>

                {/* Financial Pressure */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Wallet size={14} /> 财务压力
                    </label>
                    <select
                        value={state.financialPressure}
                        onChange={(e) => updateField('financialPressure', e.target.value as FinancialPressure)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                        {financialOptions.map(opt => (
                            <option key={opt} value={opt}>{labels.financial[opt]}</option>
                        ))}
                    </select>
                </div>

                {/* Social Connectedness */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Users size={14} /> 社交连接
                    </label>
                    <select
                        value={state.socialConnectedness}
                        onChange={(e) => updateField('socialConnectedness', e.target.value as SocialConnectedness)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                        {socialOptions.map(opt => (
                            <option key={opt} value={opt}>{labels.social[opt]}</option>
                        ))}
                    </select>
                </div>

                {/* Skill Momentum */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <TrendingUp size={14} /> 技能动量
                    </label>
                    <select
                        value={state.skillMomentum}
                        onChange={(e) => updateField('skillMomentum', e.target.value as SkillMomentum)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                        {skillOptions.map(opt => (
                            <option key={opt} value={opt}>{labels.skill[opt]}</option>
                        ))}
                    </select>
                </div>

                {/* Current Context */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Target size={14} /> 当前场景
                    </label>
                    <select
                        value={state.currentContext}
                        onChange={(e) => updateField('currentContext', e.target.value as CurrentContext)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                        {contextOptions.map(opt => (
                            <option key={opt} value={opt}>{labels.context[opt]}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Recommendation Display Component
// ============================================================================

interface RecommendationDisplayProps {
    recommendation: ActionRecommendation | null;
    gamma: number;
}

const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({ recommendation, gamma }) => {
    if (!recommendation) {
        return (
            <div className="text-center py-8 text-slate-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>运行测试以查看推荐结果</p>
            </div>
        );
    }

    const { action, qValue, confidence, reasoning, expectedOutcome, alternatives, anxietyRelief } = recommendation;

    const domainColors: Record<string, string> = {
        career: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        finance: 'bg-green-500/20 text-green-400 border-green-500/30',
        health: 'bg-red-500/20 text-red-400 border-red-500/30',
        social: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        learning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        immediate: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    };

    const timeHorizonLabels: Record<string, string> = {
        immediate: '立即',
        short: '今天',
        medium: '本周',
        long: '长期'
    };

    return (
        <div className="space-y-4">
            {/* Main Recommendation */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h4 className="text-lg font-semibold text-white">{action.name}</h4>
                        <p className="text-sm text-slate-400 mt-1">{action.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${domainColors[action.domain] || domainColors.immediate}`}>
                        {timeHorizonLabels[action.timeHorizon]}
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-slate-400">Q值</div>
                        <div className="text-lg font-bold text-indigo-400">{qValue.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-slate-400">置信度</div>
                        <div className="text-lg font-bold text-emerald-400">{confidence}%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-slate-400">Gamma(γ)</div>
                        <div className="text-lg font-bold text-purple-400">{gamma.toFixed(2)}</div>
                    </div>
                </div>

                {/* Reasoning */}
                <div className="mb-3">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <Lightbulb size={12} /> 推理过程
                    </div>
                    <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg">{reasoning}</p>
                </div>

                {/* Expected Outcome */}
                <div className="mb-3">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <Target size={12} /> 预期效果
                    </div>
                    <p className="text-sm text-emerald-300">{expectedOutcome}</p>
                </div>

                {/* Anxiety Relief */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                        <Heart size={12} /> 焦虑缓解
                    </div>
                    <p className="text-sm text-purple-200 italic">{anxietyRelief}</p>
                </div>
            </div>

            {/* Alternatives */}
            {alternatives.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium text-slate-400 mb-2">替代方案</h5>
                    <div className="space-y-2">
                        {alternatives.map((alt, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                <div>
                                    <div className="text-sm text-white">{alt.action.name}</div>
                                    <div className="text-xs text-slate-500">{alt.tradeoff}</div>
                                </div>
                                <div className="text-sm text-slate-400">Q: {alt.qValue.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Policy Test Component
// ============================================================================

interface PolicyTestProps {
    context: BellmanContext;
}

const PolicyTest: React.FC<PolicyTestProps> = ({ context }) => {
    const result = runBellmanPolicy(context);
    const pathLabels = formatBellmanPath(result.path);

    const stateColors: Record<string, string> = {
        NO_CONTEXT: 'bg-red-500/20 text-red-400',
        PARTIAL_CONTEXT: 'bg-amber-500/20 text-amber-400',
        UNCERTAIN: 'bg-purple-500/20 text-purple-400',
        READY: 'bg-emerald-500/20 text-emerald-400',
        DONE: 'bg-blue-500/20 text-blue-400'
    };

    return (
        <div className="p-4 bg-slate-800/50 rounded-xl">
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Brain size={16} /> 决策 MDP 策略测试
            </h5>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-xs text-slate-400 mb-1">起始状态</div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${stateColors[result.startState]}`}>
                        {result.startState}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-slate-400 mb-1">最优行动</div>
                    <div className="text-sm text-indigo-400 font-medium">{result.bestAction}</div>
                </div>
                <div>
                    <div className="text-xs text-slate-400 mb-1">期望价值</div>
                    <div className="text-lg font-bold text-emerald-400">{result.expectedValue}</div>
                </div>
            </div>

            <div>
                <div className="text-xs text-slate-400 mb-2">策略路径</div>
                <div className="flex flex-wrap gap-2">
                    {pathLabels.map((label, idx) => (
                        <React.Fragment key={idx}>
                            <div className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium">
                                {label}
                            </div>
                            {idx < pathLabels.length - 1 && (
                                <div className="text-slate-500 flex items-center">→</div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface BellmanTestPanelProps {
    isDark?: boolean;
}

export const BellmanTestPanel: React.FC<BellmanTestPanelProps> = ({ isDark = true }) => {
    const [state, setState] = useState<LifeState>(() => {
        const avatar = getEnhancedDigitalAvatar();
        return extractCurrentState(avatar, undefined);
    });
    
    const [recommendation, setRecommendation] = useState<ActionRecommendation | null>(null);
    const [gamma, setGamma] = useState<number>(0.7);
    const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
    const [customQuery, setCustomQuery] = useState('');
    const [showStateEditor, setShowStateEditor] = useState(false);
    const [insights, setInsights] = useState<ProactiveInsight[]>([]);
    const [policyContext, setPolicyContext] = useState<BellmanContext>({
        hasCandidates: false,
        candidateCount: 0,
        averageScore: 0,
        missingFields: ['time', 'budget'],
        riskTolerance: 'Medium',
        privacyLevel: 'Balanced'
    });

    useEffect(() => {
        const avatar = getEnhancedDigitalAvatar();
        const inferredGamma = inferGamma(avatar?.personality);
        setGamma(inferredGamma);
        setInsights(getProactiveInsights());
    }, []);

    const handleRunTest = useCallback(() => {
        const query = selectedScenario?.query || customQuery;
        if (query) {
            const result = getRecommendationForQuery(query, undefined);
            setRecommendation(result);
        } else {
            const result = getNextBestAction(state);
            setRecommendation(result);
        }
    }, [state, selectedScenario, customQuery]);

    const handleRefreshState = useCallback(() => {
        const avatar = getEnhancedDigitalAvatar();
        const newState = extractCurrentState(avatar, undefined);
        setState(newState);
        setInsights(getProactiveInsights());
    }, []);

    const handleScenarioSelect = (scenario: TestScenario) => {
        setSelectedScenario(scenario);
        setCustomQuery(scenario.query);
    };

    return (
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-900/80 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                        <Brain size={24} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Bellman 优化测试面板</h3>
                        <p className="text-xs text-slate-400">测试人生优化引擎的各个组件</p>
                    </div>
                </div>
                <button
                    onClick={handleRefreshState}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    title="刷新状态"
                >
                    <RefreshCw size={18} className="text-slate-400" />
                </button>
            </div>

            {/* Proactive Insights */}
            {insights.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-3">主动洞察</h4>
                    <div className="space-y-2">
                        {insights.slice(0, 2).map((insight, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${
                                insight.priority === 'high' 
                                    ? 'bg-red-500/10 border-red-500/30' 
                                    : insight.priority === 'medium'
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : 'bg-slate-800/50 border-slate-700'
                            }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span>{insight.icon}</span>
                                    <span className="text-sm font-medium text-white">{insight.title}</span>
                                </div>
                                <p className="text-xs text-slate-400">{insight.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* State Editor Toggle */}
            <div className="mb-6">
                <button
                    onClick={() => setShowStateEditor(!showStateEditor)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <Settings size={16} />
                    <span>状态编辑器</span>
                    {showStateEditor ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showStateEditor && (
                    <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                        <StateEditor state={state} onChange={setState} />
                        <div className="mt-3 text-xs text-slate-500">
                            置信度: {state.confidence}% | 生活阶段: {state.lifeStage}
                        </div>
                    </div>
                )}
            </div>

            {/* Test Scenarios */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">测试场景</h4>
                <div className="grid grid-cols-3 gap-2">
                    {TEST_SCENARIOS.map(scenario => (
                        <button
                            key={scenario.id}
                            onClick={() => handleScenarioSelect(scenario)}
                            className={`p-3 rounded-lg text-left transition-all ${
                                selectedScenario?.id === scenario.id
                                    ? 'bg-indigo-500/20 border border-indigo-500/50'
                                    : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                            }`}
                        >
                            <div className="text-sm font-medium text-white">{scenario.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{scenario.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Query */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">自定义查询</h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => {
                            setCustomQuery(e.target.value);
                            setSelectedScenario(null);
                        }}
                        placeholder="输入你的问题或困惑..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleRunTest}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2"
                    >
                        <Play size={16} />
                        运行测试
                    </button>
                </div>
            </div>

            {/* Results */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">推荐结果</h4>
                <RecommendationDisplay recommendation={recommendation} gamma={gamma} />
            </div>

            {/* Policy MDP Test */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">MDP 策略测试</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">候选数量</label>
                        <input
                            type="number"
                            value={policyContext.candidateCount}
                            onChange={(e) => setPolicyContext({
                                ...policyContext,
                                candidateCount: parseInt(e.target.value) || 0,
                                hasCandidates: parseInt(e.target.value) > 0
                            })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">平均得分</label>
                        <input
                            type="number"
                            value={policyContext.averageScore}
                            onChange={(e) => setPolicyContext({
                                ...policyContext,
                                averageScore: parseInt(e.target.value) || 0
                            })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </div>
                </div>
                <PolicyTest context={policyContext} />
            </div>

            {/* Available Actions Reference */}
            <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">可用行动库 ({LIFE_ACTIONS.length} 个)</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                    {LIFE_ACTIONS.slice(0, 6).map(action => (
                        <div key={action.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                            <div>
                                <div className="text-sm text-white">{action.name}</div>
                                <div className="text-xs text-slate-500">{action.domain} • {action.timeHorizon}</div>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <span className={action.energyCost > 0 ? 'text-green-400' : 'text-red-400'}>
                                    ⚡{action.energyCost > 0 ? '+' : ''}{action.energyCost}
                                </span>
                                <span className="text-purple-400">📈+{action.skillGrowth}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BellmanTestPanel;
