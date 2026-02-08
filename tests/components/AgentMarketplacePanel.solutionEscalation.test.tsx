import { describe, expect, it } from 'vitest';
import { shouldEscalateToLix } from '../../components/AgentMarketplacePanel';

describe('AgentMarketplacePanel solution escalation', () => {
  it('returns true when candidate discovery is empty', () => {
    const should = shouldEscalateToLix(
      '帮我找上海外滩附近评分高的咖啡店',
      { traceId: 'mkt_1', candidates: [], rejected: [] },
      null,
      null
    );

    expect(should).toBe(true);
  });

  it('returns true when manual execution has partial failures', () => {
    const should = shouldEscalateToLix(
      '帮我找上海外滩附近评分高的咖啡店',
      {
        traceId: 'mkt_2',
        candidates: [{
          id: 'tool:live_search',
          name: 'live_search',
          source: 'tool_registry',
          fit: 0.8,
          reliability: 0.9,
          reliabilityKnown: true,
          freshness: 1,
          latency: 0.6,
          latencyKnown: true,
          cost: 0.8,
          total: 0.82,
        }],
        rejected: [],
      },
      {
        traceId: 'manual_1',
        query: 'q',
        domain: 'local_service',
        selectedCount: 2,
        successCount: 1,
        failedCount: 1,
        results: [],
      },
      null
    );

    expect(should).toBe(true);
  });

  it('returns false for healthy result', () => {
    const should = shouldEscalateToLix(
      '帮我找上海外滩附近评分高的咖啡店',
      {
        traceId: 'mkt_3',
        candidates: [{
          id: 'tool:live_search',
          name: 'live_search',
          source: 'tool_registry',
          fit: 0.8,
          reliability: 0.9,
          reliabilityKnown: true,
          freshness: 1,
          latency: 0.6,
          latencyKnown: true,
          cost: 0.8,
          total: 0.82,
        }],
        rejected: [],
      },
      {
        traceId: 'manual_2',
        query: 'q',
        domain: 'local_service',
        selectedCount: 1,
        successCount: 1,
        failedCount: 0,
        results: [],
      },
      null
    );

    expect(should).toBe(false);
  });
});
