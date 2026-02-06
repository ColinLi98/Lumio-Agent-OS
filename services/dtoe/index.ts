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
} from './coreSchemas';

export {
    generateId,
    createDefaultTwinState,
    createDefaultGoalStack,
} from './coreSchemas';

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
} from './schemaValidators';

export type { ValidationResult } from './schemaValidators';

// ============================================================================
// Transition Model
// ============================================================================

export {
    transition,
    deriveExecutionFlag,
    generateShockBundle,
    sampleVariable,
    sampleShockBundle,
} from './transitionModel';

export type { ExogenousShock } from './transitionModel';

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
} from './twinBeliefStore';

export type {
    Particle,
    ParticleParams,
    BeliefState,
    PosteriorSummary,
} from './twinBeliefStore';

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
} from './scenarioEngine';

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
} from './scenarioEngine';

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
} from './bellmanSolver';

export type {
    ActionTemplate,
    ActionScore,
    ScoreBreakdown,
    SolveResult,
    SolverConfig,
    SolveOptions,
} from './bellmanSolver';

// ============================================================================
// Monte Carlo Evaluator (v0.1 - legacy)
// ============================================================================

export {
    evaluateActions,
    generateCandidateActions as generateCandidateActionsV1,
} from './monteCarloEvaluator';

export type {
    ActionScore as ActionScoreV1,
    EvaluatorOptions,
    EvaluatorResult,
} from './monteCarloEvaluator';

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
} from './decisionExplainer';

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
} from './decisionExplainer';

// ============================================================================
// Strategy Card
// ============================================================================

export {
    buildStrategyCard,
    createFallback,
    serializeStrategyCard,
    formatStrategyCardForUI,
} from './strategyCard';

export type { BuildStrategyCardInput, FallbackInput } from './strategyCard';

// ============================================================================
// Destiny Engine (v0.2)
// ============================================================================

export {
    DestinyEngine,
    getDestinyEngine,
    resetDestinyEngine,
} from './destinyEngine';

export type {
    RecommendationInput,
    RecommendationOutput,
    RecommendationDiagnostics,
    OutcomeRecord,
    StateSummary,
} from './destinyEngine';

// ============================================================================
// Vertex Grounding Parser
// ============================================================================

export {
    parseVertexGrounding,
    filterEcommerceForTicketing,
    mergeEvidencePacks,
} from './vertexGroundingParser';

export type { ParseOptions } from './vertexGroundingParser';

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
} from './dtoeEvents';

export type {
    DtoeEvent,
    DtoeEventType,
    DebugPanelData,
} from './dtoeEvents';
