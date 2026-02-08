export type AgentDomain =
  | 'recruitment'
  | 'travel'
  | 'finance'
  | 'health'
  | 'legal'
  | 'education'
  | 'shopping'
  | 'productivity'
  | 'local_service'
  | 'general';

export type EvidenceLevel = 'none' | 'weak' | 'strong';
export type CostTier = 'low' | 'mid' | 'high';
export type MarketVisibility = 'public' | 'private';
export type PricingModel = 'free' | 'pay_per_use';

export interface AgentMarketStats {
  usage_7d?: number;
  usage_30d?: number;
  success_rate_7d?: number;
  revenue_7d_cny?: number;
  revenue_30d_cny?: number;
  hotness_score?: number;
}

export interface AgentSourceMeta {
  github_repo?: string;
  github_manifest_path?: string;
  github_default_branch?: string;
  imported_via?: 'lix_delivery' | 'github_import' | 'external_feed' | 'manual';
  imported_at?: string;
}

export interface DigitalTwinContext {
  user_id: string;
  profile_completeness: number;
  privacy_mode: boolean;
  preferences: {
    price_vs_quality: number;
    risk_tolerance: number;
    preferred_evidence_level: EvidenceLevel | 'adaptive';
    preferred_latency: 'fast' | 'balanced' | 'quality';
    preferred_domains: AgentDomain[];
    preferred_tools: string[];
  };
}

export interface AgentDescriptor {
  id: string;
  name: string;
  source: 'tool_registry' | 'skill_registry' | 'specialized' | 'external_market';
  domains: AgentDomain[];
  capabilities: string[];
  supports_realtime: boolean;
  evidence_level: EvidenceLevel;
  supports_parallel: boolean;
  avg_latency_ms?: number;
  success_rate?: number;
  cost_tier?: CostTier;
  compliance_tags?: string[];
  metrics_source?: 'runtime' | 'external' | 'prior' | 'unknown';
  metrics_sample_size?: number;
  execute_ref: string;
  owner_id?: string;
  market_visibility?: MarketVisibility;
  pricing_model?: PricingModel;
  price_per_use_cny?: number;
  market_stats?: AgentMarketStats;
  source_meta?: AgentSourceMeta;
}

export interface DiscoveryQuery {
  query: string;
  locale?: string;
  domain_hint?: AgentDomain;
  required_capabilities: string[];
  digital_twin_context?: DigitalTwinContext;
  require_realtime?: boolean;
  require_evidence?: boolean;
  max_candidates?: number;
}

export interface CandidateAgent {
  agent: AgentDescriptor;
  fit_score: number;
  reliability_score: number;
  reliability_known?: boolean;
  freshness_score: number;
  latency_score: number;
  latency_known?: boolean;
  cost_score: number;
  twin_boost?: number;
  total_score: number;
  rejected?: boolean;
  reject_reason?: string;
}

export interface MarketplaceTask {
  id: string;
  objective: string;
  required_capabilities: string[];
  dependencies: string[];
  parallelizable: boolean;
}

export interface AgentExecutionPlan {
  trace_id: string;
  domain: AgentDomain;
  tasks: MarketplaceTask[];
  selections: Array<{ task_id: string; primary_agent_id: string; fallback_agent_ids: string[] }>;
}

export interface AgentExecutionResult {
  task_id: string;
  agent_id: string;
  success: boolean;
  data: any;
  evidence?: Array<{ source: string; url: string; fetched_at?: string }>;
  error?: string;
  latency_ms: number;
}

export interface DiscoveryResponse {
  trace_id: string;
  candidates: CandidateAgent[];
  rejected: CandidateAgent[];
  score_breakdown: Array<{
    agent_id: string;
    fit_score: number;
    reliability_score: number;
    reliability_known?: boolean;
    freshness_score: number;
    latency_score: number;
    latency_known?: boolean;
    cost_score: number;
    twin_boost?: number;
    total_score: number;
  }>;
}

export interface ExecutionSummary {
  trace_id: string;
  selected_agents: Array<{ task_id: string; agent_id: string }>;
  fallback_used: Array<{ task_id: string; from_agent_id: string; to_agent_id: string }>;
  results: AgentExecutionResult[];
}

export interface PlanBuildResult {
  plan: AgentExecutionPlan;
  candidate_map: Record<string, CandidateAgent[]>;
}
