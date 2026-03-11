export type GateType =
  | 'gate_r1_require_constraints'
  | 'gate_r2_require_user_confirmation_token'
  | 'gate_r3_budget_scope_guard'
  | 'gate_r4_evidence_required_for_success'
  | 'gate_r5_supplier_validation_required'
  | 'gate_r6_no_empty_return'
  | 'gate_r7_high_risk_execution_prohibited'
  | 'gate_r8_data_authenticity_required';

export interface DomainScorePayload {
  domain: string;
  score: number;
}

export interface ProblemFramePayload {
  problem_type: string;
  primary_domain: string;
  secondary_domains: string[];
  domain_scores: DomainScorePayload[];
  risk_class: 'low' | 'medium' | 'high';
  requires_live_data: boolean;
  constraint_completeness: number;
}

export interface ClarificationOptionPayload {
  key: string;
  label: string;
  value: string;
}

export interface ClarificationQuestionPayload {
  id: string;
  prompt: string;
  reason: string;
  impacts_gate: GateType;
  options: ClarificationOptionPayload[];
}

export interface EvidenceClaimPayload {
  claim_id: string;
  claim_text: string;
  evidence_ids: string[];
  confidence: number;
  reproducible_steps: string[];
}

export interface RiskBoundaryPayload {
  domain: string;
  policy: 'decision_support_only' | 'bounded_execution';
  blocked_actions: string[];
}

export interface SkillRequirement {
  task_id: string;
  capability: string;
  max_latency_ms?: number;
  minimum_evidence_level: 'weak' | 'mid' | 'strong';
  max_cost_tier?: 'low' | 'mid' | 'high';
  domain: string;
  risk_class: 'low' | 'medium' | 'high';
  requires_live_data: boolean;
}

export interface SkillScoreBreakdown {
  capability_fit: number;
  success_rate_score: number;
  latency_score: number;
  evidence_level_score: number;
  cost_score: number;
  policy_score: number;
  twin_fit_boost: number;
  freshness_boost: number;
  final_score: number;
  total_score: number;
}

export interface SkillSelectionDecision {
  task_id: string;
  required_capability: string;
  primary_skill_id?: string;
  fallback_skill_id?: string;
  score_breakdown: SkillScoreBreakdown;
  selection_reason: string;
  gate_snapshot: string;
}

export interface AgentExecutionPayload {
  task_id: string;
  status: string;
  result_summary: string;
  next_action?: string;
  owner_agent: string;
  gate_decisions: Array<{
    gate: string;
    decision: 'passed' | 'blocked' | 'waiting_user';
    reason: string;
    next_action?: string;
    owner_agent: string;
  }>;
}
