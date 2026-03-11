/**
 * Bellman Optimization Test Panel
 * Used to test and visualize core components of the Bellman life optimizer.
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
        name: 'Work Stress',
        nameEn: 'Work Stress',
        description: 'Simulate a high-pressure work scenario',
        query: 'I am under a lot of pressure at work and my manager is pushing hard. What should I do?',
        expectedDomain: 'work'
    },
    {
        id: 'relationship',
        name: 'Relationship',
        nameEn: 'Relationship',
        description: 'Simulate a social conflict',
        query: 'I had an argument with a friend. Should I apologize?',
        expectedDomain: 'relationship'
    },
    {
        id: 'finance',
        name: 'Finance Decision',
        nameEn: 'Finance',
        description: 'Simulate spending/investment decisions',
        query: 'I am unsure whether I should buy this. I feel conflicted.',
        expectedDomain: 'finance'
    },
    {
        id: 'health',
        name: 'Health Management',
        nameEn: 'Health',
        description: 'Simulate a health concern',
        query: 'I keep staying up late and feel exhausted lately.',
        expectedDomain: 'health'
    },
    {
        id: 'learning',
        name: 'Learning Growth',
        nameEn: 'Learning',
        description: 'Simulate a learning scenario',
        query: "I want to learn coding but don't know where to start.",
        expectedDomain: 'learning'
    },
    {
        id: 'anxiety',
        name: 'Anxiety Decision',
        nameEn: 'Anxiety',
        description: 'Simulate an anxious decision state',
        query: 'I am anxious about whether I should change jobs.',
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
        energy: { exhausted: 'Exhausted', low: 'Low', moderate: 'Moderate', high: 'High', peak: 'Peak' },
        emotion: { stressed: 'Stressed', anxious: 'Anxious', neutral: 'Neutral', calm: 'Calm', excited: 'Excited' },
        financial: { critical: 'Critical', high: 'High', moderate: 'Moderate', low: 'Low', comfortable: 'Comfortable' },
        social: { isolated: 'Isolated', weak: 'Weak', moderate: 'Moderate', strong: 'Strong', thriving: 'Thriving' },
        skill: { declining: 'Declining', stagnant: 'Stagnant', steady: 'Steady', growing: 'Growing', accelerating: 'Accelerating' },
        context: { work: 'Work', social: 'Social', shopping: 'Shopping', planning: 'Planning', learning: 'Learning', health: 'Health', leisure: 'Leisure', unknown: 'Unknown' }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Energy Level */}
                <div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Battery size={14} /> Energy Level
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
                        <Heart size={14} /> Emotional State
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
                        <Wallet size={14} /> Financial Pressure
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
                        <Users size={14} /> Social Connectedness
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
                        <TrendingUp size={14} /> Skill Momentum
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
                        <Target size={14} /> Current Context
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
                <p>Run a test to view recommendations</p>
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
        immediate: 'Now',
        short: 'Today',
        medium: 'This Week',
        long: 'Long-term'
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
                        <div className="text-xs text-slate-400">Q Value</div>
                        <div className="text-lg font-bold text-indigo-400">{qValue.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-slate-400">Confidence</div>
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
                        <Lightbulb size={12} /> Reasoning
                    </div>
                    <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg">{reasoning}</p>
                </div>

                {/* Expected Outcome */}
                <div className="mb-3">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <Target size={12} /> Expected Outcome
                    </div>
                    <p className="text-sm text-emerald-300">{expectedOutcome}</p>
                </div>

                {/* Anxiety Relief */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                        <Heart size={12} /> Anxiety Relief
                    </div>
                    <p className="text-sm text-purple-200 italic">{anxietyRelief}</p>
                </div>
            </div>

            {/* Alternatives */}
            {alternatives.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium text-slate-400 mb-2">Alternatives</h5>
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
                <Brain size={16} /> Decision MDP Policy Test
            </h5>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-xs text-slate-400 mb-1">Start State</div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${stateColors[result.startState]}`}>
                        {result.startState}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-slate-400 mb-1">Best Action</div>
                    <div className="text-sm text-indigo-400 font-medium">{result.bestAction}</div>
                </div>
                <div>
                    <div className="text-xs text-slate-400 mb-1">Expected Value</div>
                    <div className="text-lg font-bold text-emerald-400">{result.expectedValue}</div>
                </div>
            </div>

            <div>
                <div className="text-xs text-slate-400 mb-2">Policy Path</div>
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
                        <h3 className="text-lg font-semibold">Bellman Optimization Test Panel</h3>
                        <p className="text-xs text-slate-400">Test core components of the life optimization engine</p>
                    </div>
                </div>
                <button
                    onClick={handleRefreshState}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    title="Refresh State"
                >
                    <RefreshCw size={18} className="text-slate-400" />
                </button>
            </div>

            {/* Proactive Insights */}
            {insights.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Proactive Insights</h4>
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
                    <span>State Editor</span>
                    {showStateEditor ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showStateEditor && (
                    <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                        <StateEditor state={state} onChange={setState} />
                        <div className="mt-3 text-xs text-slate-500">
                            Confidence: {state.confidence}% | Life Stage: {state.lifeStage}
                        </div>
                    </div>
                )}
            </div>

            {/* Test Scenarios */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Test Scenarios</h4>
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
                <h4 className="text-sm font-medium text-slate-400 mb-3">Custom Query</h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => {
                            setCustomQuery(e.target.value);
                            setSelectedScenario(null);
                        }}
                        placeholder="Type your question or concern..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleRunTest}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2"
                    >
                        <Play size={16} />
                        Run Test
                    </button>
                </div>
            </div>

            {/* Results */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Recommendation Result</h4>
                <RecommendationDisplay recommendation={recommendation} gamma={gamma} />
            </div>

            {/* Policy MDP Test */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">MDP Policy Test</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Candidate Count</label>
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
                        <label className="text-xs text-slate-500 mb-1 block">Average Score</label>
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
                <h4 className="text-sm font-medium text-slate-400 mb-3">Action Library ({LIFE_ACTIONS.length})</h4>
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
