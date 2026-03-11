import { describe, expect, it } from 'vitest';
import {
  normalizeReasoningProtocol,
  resolveReasoningMode,
  type AgentResponse,
} from '../services/superAgentService.js';

function decision(
  mode: 'single_agent' | 'multi_agent',
  risk = 0.3
): NonNullable<AgentResponse['routing_decision']> {
  return {
    mode,
    reason_codes: [],
    scores: {
      complexity: 0.4,
      risk,
      dependency: 0.3,
    },
  };
}

describe('reasoning protocol helpers', () => {
  it('resolves auto to lite for simple low-risk query', () => {
    const mode = resolveReasoningMode(
      'auto',
      '帮我润色这段话',
      decision('single_agent', 0.2)
    );
    expect(mode).toBe('lite');
  });

  it('resolves auto to full for multi-agent routing', () => {
    const mode = resolveReasoningMode(
      'auto',
      '帮我做并行协作方案',
      decision('multi_agent', 0.4)
    );
    expect(mode).toBe('full');
  });

  it('keeps forced full mode', () => {
    const mode = resolveReasoningMode(
      'full',
      '随便一个问题',
      decision('single_agent', 0.1)
    );
    expect(mode).toBe('full');
  });

  it('returns null on invalid protocol payload', () => {
    const parsed = normalizeReasoningProtocol({ malformed: true }, 'lite');
    expect(parsed).toBeNull();
  });

  it('normalizes full payload with required fields', () => {
    const payload = normalizeReasoningProtocol(
      {
        version: 'v1.1',
        methods_applied: ['first_principles', 'stakeholders', 'five_whys', 'premortem', 'second_order', 'analogies'],
        root_problem: '用户目标和约束没有清晰对齐',
        recommended_strategy: '先澄清约束，再并行执行并验证证据',
        confidence: 0.83,
        artifacts: {
          first_principles: {
            assumptions: ['必须日更'],
            base_facts: ['核心是有效触达'],
            key_levers: ['内容密度'],
          },
          stakeholders: [
            {
              role: '用户',
              motivation: '提高转化',
              constraints: ['预算有限'],
              conflict_level: 'medium',
            },
          ],
          five_whys: ['为什么1', '为什么2', '为什么3'],
          premortem: [
            {
              reason: '执行偏离目标',
              likelihood: 0.7,
              impact: 0.8,
              early_signal: '指标连续下滑',
              mitigation: '每周复盘',
            },
          ],
          second_order: {
            immediate: ['短期波动'],
            mid_term: ['流程稳定'],
            long_term: ['品牌沉淀'],
          },
          analogies: [
            { source_domain: '健身房', mapping: '留存机制', boundary: '非完全同构' },
          ],
        },
      },
      'full'
    );

    expect(payload).not.toBeNull();
    expect(payload?.mode).toBe('full');
    expect(payload?.methods_applied).toContain('premortem');
    expect(payload?.root_problem).toContain('目标');
    expect(payload?.artifacts.first_principles?.assumptions.length).toBeGreaterThan(0);
  });
});
