# Lumi Phase 3 — Digital Twin Optimization Engine (DTOE) v0.1

**Owner**: Antigravity  
**Status**: Spec (engineering-ready)  
**Goal**: Make Lumi a true "Personal Destiny Engine" by adding:
- Digital Twin as a *belief state* (not a single profile)
- Rolling-horizon Bellman optimization (MPC-style)
- Monte Carlo rollout simulation (thousands of scenarios) with risk-aware scoring
- Tight integration with existing Phase 2 loop: Plan → Execute → Review → Update Twin

---

## 0) Context: What already exists (Phase 2 baseline)

Phase 2 already provides:
- Soul Matrix (editable traits + objective weights)
- Task/Plan Generator (ThreeStagePlan)
- Action hooks + Outcome logging + Weekly review summaries
- Intent Router + Fallback panel + Result contract
- Privacy + Telemetry + Compliance adapter

Phase 3 must NOT replace Phase 2. It should:
1. Use Soul Matrix + evidence to build a probabilistic twin (belief)
2. Use outcomes/reviews to update the twin (learning loop)
3. Output next-best action + reasoning + alternatives
4. Feed the Plan Generator so UX remains consistent

---

## 1) Non-negotiable rule: Domain Guard

### Problem
Non-purchase intents (e.g., travel tickets) are being routed into purchase/e-commerce provider results.

### Policy
- LIX offers must be shown ONLY when:
  `domain == "purchase" OR domain == "shopping"`
- If domain != purchase, then:
  - do NOT call market providers
  - do NOT display e-commerce links
  - fallback must be domain-correct (e.g., travel planner, official rail/air sources, or pure plan steps)

### Acceptance Criteria
- If user asks "buy train ticket", response must not contain JD/PDD/Taobao links.
- Market UI can still exist as a separate tab, but auto-invocation must be domain-gated.

### Implementation hook
Add `DomainGuard` check at:
1. intentRouter decision
2. toolRegistry (broadcast_intent) invocation
3. SuperAgentResultPanel rendering of OfferComparisonCard

---

## 2) Phase 3 architecture overview

DTOE = Decision engine that produces "next step optimal action" under uncertainty

Pipeline:
1. Evidence ingestion (keyboard + uploads + confirmations + outcomes)
2. Belief state update (particle / distribution)
3. Problem compilation (objective weights + constraints → scalarized utility)
4. Scenario generation (Monte Carlo)
5. MPC solver (rolling horizon H): evaluate candidate actions by rollout
6. Output: action recommendation + confidence + risk + explanation + alternatives
7. Execution + outcome logging
8. Belief update

---

## 3) New folder structure (services/)

```
services/
├── twinTypes.ts
├── twinBeliefStore.ts
├── evidenceTypes.ts
├── evidenceService.ts
├── objectiveCompiler.ts
├── scenarioEngine.ts
├── policyLibrary.ts
├── bellmanSolver.ts
├── riskModels.ts
├── decisionExplainer.ts
└── destinyEngine.ts   # orchestration entrypoint
```

Optional UI (components/):
- TwinBuilderPanel.tsx
- DestinyDecisionPanel.tsx

---

## 4) Core data contracts

### 4.1 Subjects
```ts
export type SubjectType = 'person' | 'company' | 'org' | 'nation';

export interface SubjectRef {
  subject_id: string;
  subject_type: SubjectType;
  display_name: string;
}
```

### 4.2 State vector (multi-capital)
```ts
export type StateKey =
  | 'wealth' | 'health' | 'skill' | 'energy' | 'social'
  | 'career' | 'reputation' | 'time_buffer' | 'stress' | 'optionality';

export interface TwinState {
  t: number;
  x: Record<StateKey, number>; // normalized [0..1]
}
```

### 4.3 Parameters (uncertain)
```ts
export type ParamKey =
  | 'income_growth' | 'market_return_mu' | 'market_return_sigma'
  | 'health_recovery' | 'stress_sensitivity' | 'execution_adherence'
  | 'shock_frequency' | 'shock_severity';

export interface TwinParams {
  theta: Record<ParamKey, number>;
}
```

### 4.4 Belief state (particle-based)
```ts
export interface Particle {
  state: TwinState;
  params: TwinParams;
  weight: number;
}

export interface BeliefState {
  subject: SubjectRef;
  particles: Particle[];
  updated_at: number;
  version: number;
}
```

### 4.5 Evidence
```ts
export type EvidenceType =
  | 'trait_confirmed' | 'trait_rejected' | 'outcome_logged'
  | 'weekly_review' | 'user_upload' | 'manual_edit';

export interface Evidence {
  id: string;
  type: EvidenceType;
  subject_id: string;
  timestamp: number;
  payload: Record<string, any>;
  reliability: number;
}
```

---

## 5) Action space

### 5.1 Action templates
```ts
export type ActionType =
  | 'focus_work' | 'focus_study' | 'exercise' | 'sleep_earlier'
  | 'networking' | 'ship_milestone' | 'delegate' | 'drop_task'
  | 'reduce_spend' | 'increase_savings' | 'rebalance_portfolio' | 'seek_mentorship';

export interface Action {
  action_id: string;
  type: ActionType;
  intensity: number;
  duration_min?: number;
  cost_money?: number;
  notes?: string;
}
```

### 5.2 Constraints
```ts
export interface Constraint {
  key: 'time' | 'money' | 'energy' | 'risk' | 'deadline';
  max?: number;
  min?: number;
}
```

---

## 6) Objective model

Optimize: `J(a) = E[G] - rho * Risk(G) - penalty(violations)`

### 6.1 Objective weights
```ts
export interface ObjectiveWeights {
  time: number;
  money: number;
  risk: number;
  energy: number;
  growth: number;
}

export interface CompiledObjective {
  beta: number;           // discount factor
  rho: number;            // risk aversion
  w: Record<StateKey, number>;
  terminal_w: Record<StateKey, number>;
}
```

---

## 7) Transition model

```ts
export interface TransitionInput {
  state: TwinState;
  params: TwinParams;
  action: Action;
  dt: number;
  exogenous: ExogenousShock;
  executed: boolean;
}

export interface ExogenousShock {
  market_return?: number;
  health_shock?: number;
  time_shock?: number;
  expense_shock?: number;
}
```

---

## 8) Scenario engine (Monte Carlo)

```ts
export interface ScenarioSpec {
  n_scenarios: number;    // 500 → 2000
  horizon_steps: number;  // H weeks
  dt: number;
  seed: number;
}
```

Progressive refinement: 300 → 1200 → 5000

---

## 9) Bellman MPC solver

```ts
export interface SolveRequest {
  subject: SubjectRef;
  belief: BeliefState;
  objective: CompiledObjective;
  constraints: Constraint[];
  candidates: Action[];
  scenario: ScenarioSpec;
  alpha_cvar: number;
}

export interface ActionScore {
  action: Action;
  mean: number;
  std: number;
  cvar: number;
  p_violate: number;
  score: number;
}

export interface SolveResult {
  trace_id: string;
  best_action: Action;
  ranked: ActionScore[];
  confidence: number;
  explain: DecisionExplanation;
}
```

---

## 10) Decision explanation

```ts
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
  metrics: { mean: number; cvar: number; p_violate: number };
}
```

---

## 11) 4-Week Build Plan

### Week 1: Belief State Foundation
- `twinTypes.ts`, `evidenceTypes.ts`
- `twinBeliefStore.ts` (create/load/save/reweight/resample)
- `evidenceService.ts`

### Week 2: Scenario + Transition
- `scenarioEngine.ts` (seeded RNG + shocks)
- `transition.ts`
- `riskModels.ts` (mean/std/CVaR)

### Week 3: MPC Solver + Explanation
- `bellmanSolver.ts`
- `decisionExplainer.ts`
- `policyLibrary.ts`

### Week 4: Integration + Domain Guard
- `destinyEngine.ts` orchestrator
- SuperAgentResultPanel integration
- Domain gating hardening
- Telemetry events

---

## 12) MVP Acceptance Criteria

### Functional
- Domain Guard: travel/career/health queries never show e-commerce offers
- Solver latency: p50 < 1.5s (N<=1200), p99 < 4s (N<=2000)
- Outputs include risk metrics + alternatives + sensitivity
- Outcome logging updates belief

### Quality
- Deterministic reproducibility with same seed
- Unit tests for CVaR, transition, belief reweighting, domain guard

---

## 13) Default Decisions

- **Fallback e-commerce offers**: 完全隐藏 (non-purchase domains)
- **Debug panel**: 仅开发模式
