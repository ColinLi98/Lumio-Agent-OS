import { describe, expect, it } from 'vitest';
import { classifyFreshness } from '../services/freshnessClassifier';

describe('freshness classifier multidomain coverage', () => {
    it('detects recruitment with missing constraints', () => {
        const route = classifyFreshness('帮我招聘一个伦敦的Senior Android工程师，两周内到岗');
        expect(route.intent_domain).toBe('recruitment');
        expect(route.needs_live_data).toBe(true);
        expect(route.missing_constraints?.length ?? 0).toBeGreaterThan(0);
        expect(route.domain_scores.length).toBeGreaterThan(0);
        expect(route.constraint_completeness).toBeGreaterThanOrEqual(0);
        expect(route.constraint_completeness).toBeLessThanOrEqual(1);
    });

    it('detects legal intent', () => {
        const route = classifyFreshness('请审查这份英国服务合同中的违约条款和责任');
        expect(route.intent_domain).toBe('legal');
    });

    it('detects health intent', () => {
        const route = classifyFreshness('我咳嗽三天并且喉咙痛，应该怎么处理');
        expect(route.intent_domain).toBe('health');
    });

    it('detects education intent', () => {
        const route = classifyFreshness('我想三个月内通过雅思，帮我做学习计划');
        expect(route.intent_domain).toBe('education');
    });

    it('detects productivity intent', () => {
        const route = classifyFreshness('帮我做下周项目排期和优先级计划');
        expect(route.intent_domain).toBe('productivity');
    });
});
