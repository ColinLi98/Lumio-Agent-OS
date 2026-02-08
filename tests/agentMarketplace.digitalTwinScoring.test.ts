import { describe, expect, it } from 'vitest';
import { scoreCandidate } from '../services/agentMarketplaceService';
import type { AgentDescriptor, DiscoveryQuery } from '../services/agentMarketplaceTypes';

const baseAgent: AgentDescriptor = {
  id: 'specialized:weather',
  name: 'weather',
  source: 'specialized',
  domains: ['travel', 'general'],
  capabilities: ['weather_query'],
  supports_realtime: true,
  evidence_level: 'strong',
  supports_parallel: true,
  avg_latency_ms: 1200,
  success_rate: 0.95,
  cost_tier: 'mid',
  compliance_tags: ['safe'],
  execute_ref: 'weather',
};

const baseQuery: DiscoveryQuery = {
  query: '帮我查上海明天的天气',
  required_capabilities: ['weather_query'],
  domain_hint: 'travel',
  require_realtime: true,
};

describe('agent marketplace digital twin scoring', () => {
  it('keeps twin_boost=0 without digital twin context', () => {
    const scored = scoreCandidate(baseAgent, baseQuery);
    expect(scored.twin_boost).toBe(0);
  });

  it('applies positive twin boost when agent aligns with twin preferences', () => {
    const scored = scoreCandidate(baseAgent, {
      ...baseQuery,
      digital_twin_context: {
        user_id: 'u_1',
        profile_completeness: 100,
        privacy_mode: false,
        preferences: {
          price_vs_quality: 75,
          risk_tolerance: 50,
          preferred_evidence_level: 'strong',
          preferred_latency: 'fast',
          preferred_domains: ['travel'],
          preferred_tools: ['weather'],
        },
      },
    });

    expect((scored.twin_boost || 0)).toBeGreaterThan(0);
    expect(scored.total_score).toBeGreaterThan(0.7);
  });

  it('applies negative twin boost when agent conflicts with twin preferences', () => {
    const scored = scoreCandidate({
      ...baseAgent,
      evidence_level: 'none',
      avg_latency_ms: 9000,
      cost_tier: 'high',
      domains: ['shopping'],
      execute_ref: 'not_preferred',
    }, {
      ...baseQuery,
      digital_twin_context: {
        user_id: 'u_2',
        profile_completeness: 100,
        privacy_mode: false,
        preferences: {
          price_vs_quality: 15,
          risk_tolerance: 20,
          preferred_evidence_level: 'strong',
          preferred_latency: 'fast',
          preferred_domains: ['travel'],
          preferred_tools: ['weather'],
        },
      },
    });

    expect((scored.twin_boost || 0)).toBeLessThan(0);
  });
});

