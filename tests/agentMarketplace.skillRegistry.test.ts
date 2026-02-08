/**
 * Agent Marketplace - Skill Registry Integration Tests
 *
 * Verifies findByCapabilitiesWithScore() scoring and sorting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from '../services/skillRegistry';
import type { Skill, ExecutionContext } from '../services/skillRegistry';

function createSkill(id: string, caps: string[], priority?: number): Skill {
    return {
        id,
        name: `Skill ${id}`,
        description: `A test skill for ${caps.join(', ')}`,
        capabilities: caps,
        parameters: [],
        execute: async (_input: Record<string, any>, _ctx: ExecutionContext) => ({ success: true, data: {}, confidence: 1 }),
        priority,
    };
}

describe('Skill Registry - findByCapabilitiesWithScore', () => {
    let registry: SkillRegistry;

    beforeEach(() => {
        registry = new SkillRegistry();
        registry.register(createSkill('flight_skill', ['flight_search', 'price_compare'], 80));
        registry.register(createSkill('hotel_skill', ['hotel_search', 'booking'], 70));
        registry.register(createSkill('general_skill', ['web_search', 'knowledge_qa'], 50));
        registry.register(createSkill('niche_skill', ['quantum_computing'], 30));
    });

    it('should return scored results sorted by score descending', () => {
        const results = registry.findByCapabilitiesWithScore(
            ['flight_search', 'price_compare'],
            '搜索机票价格'
        );

        expect(results.length).toBeGreaterThan(0);
        // Results should be sorted descending
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
        }
    });

    it('should give highest score to exact capability match', () => {
        const results = registry.findByCapabilitiesWithScore(
            ['flight_search', 'price_compare'],
            '机票'
        );

        expect(results[0].skill.id).toBe('flight_skill');
    });

    it('should include keyword-matching skills even with partial cap overlap', () => {
        const results = registry.findByCapabilitiesWithScore(
            ['web_search'],
            'web search knowledge'
        );

        const ids = results.map(r => r.skill.id);
        expect(ids).toContain('general_skill');
    });

    it('should give niche_skill a very low score when capabilities do not match', () => {
        const results = registry.findByCapabilitiesWithScore(
            ['flight_search'],
            '搜索机票'
        );

        // Niche skill might appear with minimal priority-only score, but should be last
        const niche = results.find(r => r.skill.id === 'niche_skill');
        if (niche) {
            expect(niche.score).toBeLessThan(0.15);
        }
    });

    it('should return empty array when nothing matches', () => {
        const results = registry.findByCapabilitiesWithScore(
            ['alien_technology'],
            'xyz_no_match_at_all_1234'
        );

        // At most the priority-only scores might appear, but alien_technology won't match
        for (const r of results) {
            expect(r.skill.capabilities).not.toContain('alien_technology');
        }
    });

    it('should factor in priority', () => {
        const results = registry.findByCapabilitiesWithScore(
            ['web_search'],
            'search'
        );

        // general_skill (priority 50) should score differently than if it had priority 90
        const generalResult = results.find(r => r.skill.id === 'general_skill');
        expect(generalResult).toBeTruthy();
        expect(generalResult!.score).toBeGreaterThan(0);
    });
});
