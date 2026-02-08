import { describe, expect, it } from 'vitest';
import { validateGithubManifest } from '../services/agentGithubImportService';

describe('github manifest validator', () => {
  it('accepts valid manifest', () => {
    const result = validateGithubManifest({
      name: 'Shanghai Coffee Agent',
      description: 'Recommend coffee shops with map links',
      domains: ['local_service'],
      capabilities: ['local_search', 'live_search'],
      execute_ref: 'https://api.example.com/agent/execute',
      evidence_level: 'strong',
      cost_tier: 'mid',
      market_visibility: 'public',
      pricing_model: 'pay_per_use',
      price_per_use_cny: 12,
    });

    expect(result.valid).toBe(true);
    expect(result.normalized?.domains).toContain('local_service');
    expect(result.normalized?.price_per_use_cny).toBe(12);
  });

  it('rejects non-https or private-network endpoints', () => {
    const httpResult = validateGithubManifest({
      name: 'Bad Agent',
      domains: ['travel'],
      capabilities: ['flight_search'],
      execute_ref: 'http://example.com/run',
    });
    const localResult = validateGithubManifest({
      name: 'Local Agent',
      domains: ['travel'],
      capabilities: ['flight_search'],
      execute_ref: 'https://127.0.0.1/run',
    });

    expect(httpResult.valid).toBe(false);
    expect(httpResult.errors.join(' ')).toContain('https');
    expect(localResult.valid).toBe(false);
    expect(localResult.errors.join(' ')).toContain('private network');
  });

  it('rejects invalid domain and missing capabilities', () => {
    const result = validateGithubManifest({
      name: 'Invalid Domain Agent',
      domains: ['unknown_domain'],
      capabilities: [],
      execute_ref: 'https://api.example.com/run',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('domains');
    expect(result.errors.join(' ')).toContain('capabilities');
  });
});
