import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { incCounter, resetMetrics } from '../services/metricsCollector.js';
import { getDashboardMetrics } from '../services/providers/dashboardApi.js';

describe('agent-kernel rollout metrics summary', () => {
  const previousRollout = process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT;

  beforeEach(() => {
    resetMetrics();
    process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT = '20';
  });

  afterEach(() => {
    if (typeof previousRollout === 'string') {
      process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT = previousRollout;
    } else {
      delete process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT;
    }
  });

  it('aggregates rollout coverage, runtime failures, and policy sync mismatches', async () => {
    incCounter('super_agent_agent_kernel_routing_total', { enabled: 'true', reason: 'percentage_rollout', rollout_percent: '20' }, 2);
    incCounter('super_agent_agent_kernel_routing_total', { enabled: 'false', reason: 'percentage_rollout', rollout_percent: '20' }, 8);

    incCounter('super_agent_agent_kernel_runtime_total', { status: 'done' }, 9);
    incCounter('super_agent_agent_kernel_runtime_total', { status: 'failed' }, 1);

    incCounter('super_agent_policy_sync_total', { status: 'matched' }, 7);
    incCounter('super_agent_policy_sync_total', { status: 'missing_client' }, 2);
    incCounter('super_agent_policy_sync_total', { status: 'version_mismatch' }, 1);

    const metrics = await getDashboardMetrics();

    expect(metrics.agent_kernel_summary.rollout_target_percent).toBe(20);
    expect(metrics.agent_kernel_summary.rollout_routed_total).toBe(10);
    expect(metrics.agent_kernel_summary.rollout_enabled_total).toBe(2);
    expect(metrics.agent_kernel_summary.rollout_enabled_rate).toBeCloseTo(0.2, 3);
    expect(metrics.agent_kernel_summary.runtime_attempts).toBe(10);
    expect(metrics.agent_kernel_summary.runtime_failures).toBe(1);
    expect(metrics.agent_kernel_summary.runtime_failure_rate).toBeCloseTo(0.1, 3);
    expect(metrics.agent_kernel_summary.policy_sync_matched).toBe(7);
    expect(metrics.agent_kernel_summary.policy_sync_missing_client).toBe(2);
    expect(metrics.agent_kernel_summary.policy_sync_mismatch).toBe(1);
  });
});
