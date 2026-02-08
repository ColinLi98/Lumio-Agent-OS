/**
 * DTOE Module Index - Phase 3 v0.2
 * Digital Twin Optimization Engine
 *
 * Re-exports all core DTOE components for clean imports.
 */

// ============================================================================
// Core Schemas (v0.1)
// ============================================================================

export type {
    EntityType,
    Entity,
    TwinState,
    Observation,
    ObservationType,
    Action,
    ActionType,
    ActionCost,
    Reversibility,
    GoalStack,
    Objective,
    MetricType,
    RiskModel,
    TailRiskMetric,
    EvidencePack,
    EvidenceItem,
    EvidenceProvider,
    StrategyCard,
    MetricDistribution,
    OutcomesDistribution,
    StrategyWhy,
    StrategyFallback,
    UncertaintyVariable,
    DistributionType,
    ValuesWeights,
    HardConstraints,
    TrustMetadata,
    GoalStackConstraints,
} from './coreSchemas.js';

export {
    generateId,
    createDefaultTwinState,
    createDefaultGoalStack,
} from './coreSchemas.js';

// ============================================================================
// Schema Validators
// ============================================================================

export {
    validateTwinState,
    validateObservation,
    validateAction,
    validateGoalStack,
    validateEvidencePack,
    validateStrategyCard,
    validateEvidenceGate,
    isEvidenceFresh,
} from './schemaValidators.js';

export type { ValidationResult } from './schemaValidators.js';

// ============================================================================
// Transition Model
// ============================================================================

export {
    transition,
    deriveExecutionFlag,
    generateShockBundle,
    sampleVariable,
    sampleShockBundle,
} from './transitionModel.js';

export type { ExogenousShock } from './transitionModel.js';

// ============================================================================
// Belief Store (v0.2)
// ============================================================================

export {
    createBeliefState,
    updateBeliefWithEvidence,
    computeESS,
    resampleParticles,
    getPosteriorMeanState,
    getPosteriorStd,
    getPosteriorSummary,
    sampleParticle,
    verifyNormalized,
    SeededRNG,
} from './twinBeliefStore.js';

export type {
    Particle,
    ParticleParams,
    BeliefState,
    PosteriorSummary,
} from './twinBeliefStore.js';

// ============================================================================
// Scenario Engine (v0.2)
// ============================================================================

export {
    ScenarioGenerator,
    createScenarioGenerator,
    createEnhancedScenarioGenerator,
    generateScenariosParallel,
    computeScenarioStats,
    verifyScenariosMatch,
    getShockEvent,
    getShocksByCategory,
    DEFAULT_SCENARIO_CONFIG,
    SHOCK_LIBRARY,
} from './scenarioEngine.js';

export type {
    ExogenousShock as ScenarioShock,
    Scenario,
    ScenarioGeneratorConfig,
    BatchProgress,
    ProgressCallback,
    ParallelScenarioOptions,
    ShockEvent,
    MarketRegime,
    ImportanceSampling,
} from './scenarioEngine.js';

// ============================================================================
// Bellman Solver (v0.2)
// ============================================================================

export {
    solveBellman,
    solveBellmanWithOptions,
    solveBellmanWithOptionsAsync,
    quickSolve,
    generateCandidateActions,
    ACTION_TEMPLATES,
    DEFAULT_SOLVER_CONFIG,
    clearSolverCache,
    getCacheStats,
} from './bellmanSolver.js';

export type {
    ActionTemplate,
    ActionScore,
    ScoreBreakdown,
    SolveResult,
    SolverConfig,
    SolveOptions,
} from './bellmanSolver.js';

// ============================================================================
// Monte Carlo Evaluator (v0.1 - legacy)
// ============================================================================

export {
    evaluateActions,
    generateCandidateActions as generateCandidateActionsV1,
} from './monteCarloEvaluator.js';

export type {
    ActionScore as ActionScoreV1,
    EvaluatorOptions,
    EvaluatorResult,
} from './monteCarloEvaluator.js';

// ============================================================================
// Decision Explainer (v0.2)
// ============================================================================

export {
    generateExplanation,
    generateWhyNotExplanation,
    generateWhyNotExplanations,
    analyzeSensitivity,
    generateAuditTrail,
    validateExplanationCard,
} from './decisionExplainer.js';

export type {
    ExplanationCard,
    ReasonItem,
    TradeoffItem,
    MetricImprovement,
    AlternativeSummary,
    ExplainerInput,
    ExplainerOutput,
    WhyNotExplanation,
    WhyNotDifference,
    SensitivityResult,
    DecisionAuditTrail,
} from './decisionExplainer.js';

// ============================================================================
// Strategy Card
// ============================================================================

export {
    buildStrategyCard,
    createFallback,
    serializeStrategyCard,
    formatStrategyCardForUI,
} from './strategyCard.js';

export type { BuildStrategyCardInput, FallbackInput } from './strategyCard.js';

// ============================================================================
// Destiny Engine (v0.2)
// ============================================================================

export {
    DestinyEngine,
    getDestinyEngine,
    resetDestinyEngine,
} from './destinyEngine.js';

export type {
    RecommendationInput,
    RecommendationOutput,
    RecommendationDiagnostics,
    OutcomeRecord,
    StateSummary,
} from './destinyEngine.js';

// ============================================================================
// Vertex Grounding Parser
// ============================================================================

export {
    parseVertexGrounding,
    filterEcommerceForTicketing,
    mergeEvidencePacks,
} from './vertexGroundingParser.js';

export type { ParseOptions } from './vertexGroundingParser.js';

// ============================================================================
// DTOE Events (v0.2)
// ============================================================================

export {
    logDtoeEvent,
    getRecentEvents,
    getEventsByType,
    clearEvents,
    subscribeToEvents,
    getEventStats,
    getDebugPanelData,
    recordPerformance,
    getPerformanceSummary,
} from './dtoeEvents.js';

export type {
    DtoeEvent,
    DtoeEventType,
    DebugPanelData,
} from './dtoeEvents.js';
