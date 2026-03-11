import { describe, expect, it } from 'vitest';
import { SuperAgentService } from '../services/superAgentService';
import { classifyFreshness } from '../services/freshnessClassifier';

describe('SuperAgentService answer guard', () => {
    it('flags generic apology answers as non-actionable', () => {
        const service = new SuperAgentService();
        const isGeneric = (service as any).isGenericNonAnswer('抱歉，我无法回答这个问题。');
        expect(isGeneric).toBe(true);
    });

    it('builds actionable travel fallback plan with budget split', () => {
        const service = new SuperAgentService();
        const route = {
            intent_domain: 'travel.flight',
            needs_live_data: true,
            reason: 'flight query',
            query_preview: '伦敦到日本旅行',
            missing_constraints: ['出发日期', '舱位偏好'],
        };

        const answer = (service as any).buildActionableFallbackPlan(
            '下周从伦敦去日本休假一周，预算4000英镑',
            route,
            [],
            null
        ) as string;

        expect(answer).toContain('Actionable travel plan generated');
        expect(answer).toContain('4000 GBP');
        expect(answer).toContain('Suggested budget split');
        expect(answer).not.toContain('Tokyo 3 nights + Kyoto 2 nights + Osaka 1 night');
        expect(answer).not.toContain('抱歉，我无法回答这个问题');
    });

    it('asks for missing user inputs instead of fabricating travel constraints', () => {
        const service = new SuperAgentService();
        const route = {
            intent_domain: 'travel.flight',
            needs_live_data: true,
            reason: 'flight query',
            query_preview: 'help me plan travel',
            missing_constraints: ['origin', 'destination', 'departure date'],
        };

        const answer = (service as any).buildActionableFallbackPlan(
            'Plan a trip and include digital twin preference: window seat',
            route,
            [],
            null
        ) as string;

        expect(answer).toContain('no fabricated requirements');
        expect(answer).toContain('Missing user inputs (please provide directly)');
        expect(answer).toContain('budget');
        expect(answer).toContain('Twin personalization basis');
    });

    it('builds actionable multi-domain fallback plan for finance', () => {
        const service = new SuperAgentService();
        const route = {
            intent_domain: 'finance',
            needs_live_data: true,
            reason: 'finance query',
            query_preview: 'Analyze Tesla and Apple portfolio risk',
            missing_constraints: ['标的代码/名称', '时间范围', '风险偏好'],
        };

        const answer = (service as any).buildActionableFallbackPlan(
            'Analyze Tesla and Apple portfolio risk for next quarter',
            route,
            [],
            null
        ) as string;

        expect(answer).toContain('Actionable finance plan generated');
        expect(answer).toContain('three options (conservative/base/aggressive)');
        expect(answer).toContain('标的代码/名称');
        expect(answer).not.toContain('抱歉，我无法回答这个问题');
    });

    it('attaches strict gate envelope and blocks irreversible high-risk execution', async () => {
        const service = new SuperAgentService();
        const query = 'Please auto execute stock purchase now and transfer funds';
        const route = classifyFreshness(query);
        const wrapped = await (service as any).withContractEnvelope(
            {
                answer: 'I can execute now.',
                toolsUsed: [],
                toolResults: [],
                confidence: 0.8,
                executionTimeMs: 50,
                turns: 1,
                evidence: [],
            },
            query,
            route,
            {
                mode: 'multi_agent',
                reason_codes: ['required_capabilities>=3'],
                scores: {
                    complexity: 0.8,
                    risk: 0.9,
                    dependency: 0.7,
                },
            }
        );

        expect(wrapped.problem_frame).toBeDefined();
        expect(wrapped.risk_boundary?.policy).toBe('decision_support_only');
        expect(wrapped.gate_decisions?.length).toBe(8);
        expect(
            wrapped.gate_decisions?.some((gate: any) =>
                gate.gate === 'gate_r7_high_risk_execution_prohibited' && gate.decision === 'blocked'
            )
        ).toBe(true);
        expect(wrapped.status).toBe('waiting_user');
        expect(wrapped.next_action).toBeTruthy();
    });

    it('blocks success when answer or evidence contains placeholder or non-production links', async () => {
        const service = new SuperAgentService();
        const query = 'Plan London to Jersey trip with real booking links';
        const route = classifyFreshness(query);
        const wrapped = await (service as any).withContractEnvelope(
            {
                answer: 'Plan ready. Book now: https://example.com/fake-booking',
                toolsUsed: [],
                toolResults: [],
                confidence: 0.86,
                executionTimeMs: 120,
                turns: 1,
                evidence: [
                    {
                        source: 'web',
                        url: 'https://example.com/fake-booking',
                        title: 'placeholder booking'
                    }
                ],
            },
            `${query}. Budget: 1200. Deadline: 3 days. Acceptance criteria: verified links only. Confirmation token: APPROVED`,
            route,
            {
                mode: 'multi_agent',
                reason_codes: ['required_capabilities>=3'],
                scores: {
                    complexity: 0.82,
                    risk: 0.41,
                    dependency: 0.76,
                },
            }
        );

        const authenticityGate = wrapped.gate_decisions?.find(
            (gate: any) => gate.gate === 'gate_r8_data_authenticity_required'
        );

        expect(authenticityGate).toBeTruthy();
        expect(['blocked', 'waiting_user']).toContain(authenticityGate.decision);
        expect(wrapped.status).toBe('waiting_user');
        expect((authenticityGate.next_action || wrapped.next_action || '').toLowerCase()).toContain('link');
    });

    it('does not enforce budget gate for normal user tasks outside LIX publishing', async () => {
        const service = new SuperAgentService();
        const query = 'Plan a London to Jersey trip next Monday to Wednesday with real links';
        const route = classifyFreshness(query);
        const wrapped = await (service as any).withContractEnvelope(
            {
                answer: 'I will prepare a concrete itinerary after one missing detail is confirmed.',
                toolsUsed: [],
                toolResults: [],
                confidence: 0.76,
                executionTimeMs: 80,
                turns: 1,
                evidence: [],
            },
            query,
            route,
            {
                mode: 'multi_agent',
                reason_codes: ['required_capabilities>=3'],
                scores: {
                    complexity: 0.79,
                    risk: 0.38,
                    dependency: 0.72,
                },
            }
        );

        const gateR1 = wrapped.gate_decisions?.find((gate: any) => gate.gate === 'gate_r1_require_constraints');
        const gateR3 = wrapped.gate_decisions?.find((gate: any) => gate.gate === 'gate_r3_budget_scope_guard');
        expect(gateR3?.decision).toBe('passed');
        expect(gateR3?.reason).toBe('budget_gate_not_required');
        expect(gateR1).toBeTruthy();
        expect(String(gateR1?.reason || '')).not.toContain('acceptance_criteria');
    });

    it('requires budget/deadline/acceptance only when entering LIX builder publishing flow', async () => {
        const service = new SuperAgentService();
        const query = 'Publish this requirement to LIX and find builders to create a custom agent';
        const route = classifyFreshness(query);
        const wrapped = await (service as any).withContractEnvelope(
            {
                answer: 'Ready to publish your requirement to LIX after required fields are complete.',
                toolsUsed: [],
                toolResults: [],
                confidence: 0.79,
                executionTimeMs: 60,
                turns: 1,
                evidence: [],
            },
            query,
            route,
            {
                mode: 'single_agent',
                reason_codes: ['default_single_agent'],
                scores: {
                    complexity: 0.4,
                    risk: 0.35,
                    dependency: 0.25,
                },
            }
        );

        const gateR1 = wrapped.gate_decisions?.find((gate: any) => gate.gate === 'gate_r1_require_constraints');
        const gateR3 = wrapped.gate_decisions?.find((gate: any) => gate.gate === 'gate_r3_budget_scope_guard');
        expect(gateR1?.decision).toBe('waiting_user');
        expect(String(gateR1?.reason || '')).toContain('missing_fields:budget');
        expect(gateR3?.decision).toBe('waiting_user');
        expect(wrapped.status).toBe('waiting_user');
    });
});
