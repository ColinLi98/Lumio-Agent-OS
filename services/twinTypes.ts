/**
 * Twin Types
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Core type definitions for the belief state representation.
 * NOTE: v0.1 types are in dtoe/coreSchemas.ts - this file provides legacy compatibility
 */

// Re-export v0.1 core schemas for unified access
export type {
    EntityType,
    Entity,
    EvidencePack as EvidencePackV01,
    EvidenceItem as EvidenceItemV01,
    EvidenceProvider,
    StrategyCard,
    GoalStack,
    Observation,
    ObservationType,
} from './dtoe/coreSchemas';

// ============================================================================
// Subject Types
// ============================================================================

/**
 * Type of subject being modeled
 * NOTE: 'project' added in v0.1 to match EntityType
 */
export type SubjectType = 'person' | 'company' | 'org' | 'nation' | 'project';

/**
 * Reference to a modeled subject
 */
export interface SubjectRef {
    subject_id: string;
    subject_type: SubjectType;
    display_name: string;
}

// ============================================================================
// State Vector (Multi-Capital Model)
// ============================================================================

/**
 * State dimensions (normalized 0..1 where possible)
 * NOTE: Wellbeing metrics added in v0.1 per OECD framework
 */
export type StateKey =
    | 'wealth'             // money / runway
    | 'health'             // physical + mental health
    | 'skill'              // accumulated capabilities
    | 'energy'             // current energy level
    | 'social'             // relationship capital
    | 'career'             // career progression
    | 'reputation'         // public standing
    | 'time_buffer'        // spare time availability
    | 'stress'             // current stress level (inverse of wellbeing)
    | 'optionality'        // flexibility / degrees of freedom
    // v0.1 wellbeing metrics (OECD life evaluation framework)
    | 'life_satisfaction'  // overall life satisfaction (0-1 normalized)
    | 'affect_balance'     // positive - negative affect ratio
    | 'meaning_score';     // eudaimonic meaning/purpose

/**
 * State vector at a point in time
 */
export interface TwinState {
    /** Timestamp (ms) or step index */
    t: number;
    /** Normalized state values [0..1] */
    x: Record<StateKey, number>;
}

/**
 * Default state values (neutral starting point)
 * NOTE: Includes v0.1 wellbeing metrics
 */
export const DEFAULT_STATE: Record<StateKey, number> = {
    wealth: 0.5,
    health: 0.7,
    skill: 0.4,
    energy: 0.6,
    social: 0.5,
    career: 0.4,
    reputation: 0.5,
    time_buffer: 0.4,
    stress: 0.4,
    optionality: 0.5,
    // v0.1 wellbeing metrics
    life_satisfaction: 0.6,
    affect_balance: 0.55,
    meaning_score: 0.5,
};

// ============================================================================
// Parameters (Uncertain / Learned)
// ============================================================================

/**
 * Parameter keys for transition model
 */
export type ParamKey =
    | 'income_growth'        // expected income growth rate
    | 'market_return_mu'     // expected market return
    | 'market_return_sigma'  // market volatility
    | 'health_recovery'      // health recovery rate
    | 'stress_sensitivity'   // sensitivity to stressors
    | 'execution_adherence'  // probability of following through
    | 'shock_frequency'      // how often shocks occur
    | 'shock_severity';      // magnitude of shocks

/**
 * Parameter vector (part of the belief state)
 */
export interface TwinParams {
    theta: Record<ParamKey, number>;
}

/**
 * Default parameter values (prior beliefs)
 */
export const DEFAULT_PARAMS: Record<ParamKey, number> = {
    income_growth: 0.03,
    market_return_mu: 0.07,
    market_return_sigma: 0.15,
    health_recovery: 0.1,
    stress_sensitivity: 0.5,
    execution_adherence: 0.7,
    shock_frequency: 0.1,
    shock_severity: 0.3,
};

// ============================================================================
// Particle / Belief State
// ============================================================================

/**
 * Single particle in the belief distribution
 */
export interface Particle {
    state: TwinState;
    params: TwinParams;
    /** Weight (sums to 1 across all particles) */
    weight: number;
}

/**
 * Full belief state (particle-based representation)
 */
export interface BeliefState {
    subject: SubjectRef;
    /** Particle set (typically 200-2000 particles) */
    particles: Particle[];
    updated_at: number;
    version: number;
}

// ============================================================================
// Action Space
// ============================================================================

/**
 * Discrete action types (finite template-based)
 */
export type ActionType =
    | 'focus_work'          // deep work session
    | 'focus_study'         // learning / skill building
    | 'exercise'            // physical activity
    | 'sleep_earlier'       // improve rest
    | 'networking'          // social investment
    | 'ship_milestone'      // complete a deliverable
    | 'delegate'            // offload work
    | 'drop_task'           // abandon low-value task
    | 'reduce_spend'        // cut expenses
    | 'increase_savings'    // save more
    | 'rebalance_portfolio' // adjust investments
    | 'seek_mentorship';    // find guidance

/**
 * Action specification
 */
export interface Action {
    action_id: string;
    type: ActionType;
    /** Intensity 0..1 */
    intensity: number;
    duration_min?: number;
    cost_money?: number;
    notes?: string;
}

// ============================================================================
// Constraints
// ============================================================================

export interface Constraint {
    key: 'time' | 'money' | 'energy' | 'risk' | 'deadline';
    max?: number;
    min?: number;
}

export interface FeasibilityResult {
    feasible: boolean;
    violations: Array<{ key: string; amount: number; message: string }>;
}

// ============================================================================
// Objective Model
// ============================================================================

/**
 * User-facing objective weights (from Soul Matrix)
 */
export interface ObjectiveWeights {
    time: number;    // 0..100
    money: number;
    risk: number;
    energy: number;
    growth: number;
}

/**
 * Compiled objective for solver
 */
export interface CompiledObjective {
    /** Discount factor per step (e.g., 0.98 weekly) */
    beta: number;
    /** Risk aversion coefficient */
    rho: number;
    /** Utility weights on state keys */
    w: Record<StateKey, number>;
    /** Terminal value weights */
    terminal_w: Record<StateKey, number>;
}

// ============================================================================
// Transition Model
// ============================================================================

export interface ExogenousShock {
    market_return?: number;
    health_shock?: number;
    time_shock?: number;
    expense_shock?: number;
}

export interface TransitionInput {
    state: TwinState;
    params: TwinParams;
    action: Action;
    /** Step size (e.g., 1 week) */
    dt: number;
    exogenous: ExogenousShock;
    /** Whether action was actually executed */
    executed: boolean;
}

// ============================================================================
// Solver Contracts
// ============================================================================

export interface ActionScore {
    action: Action;
    mean: number;
    std: number;
    cvar: number;
    p_violate: number;
    score: number;
    diagnostics?: Record<string, any>;
}

export interface DecisionExplanation {
    headline: string;
    why: string[];
    tradeoffs: string[];
    risk_notes: string[];
    sensitivity: Array<{
        weight: keyof ObjectiveWeights;
        direction: 'increase' | 'decrease';
        effect: string;
    }>;
    alternatives: Array<{
        action: Action;
        reason: string;
    }>;
    metrics: {
        mean: number;
        cvar: number;
        p_violate: number;
    };
}

export interface SolveResult {
    trace_id: string;
    best_action: Action;
    ranked: ActionScore[];
    confidence: number;
    explain: DecisionExplanation;
}
