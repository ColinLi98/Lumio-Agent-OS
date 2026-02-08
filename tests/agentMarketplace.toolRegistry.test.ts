/**
 * Agent Marketplace - Tool Registry Integration Tests
 *
 * Verifies marketplace metadata on tools and getAllToolsWithMeta().
 */

import { describe, it, expect } from 'vitest';
import { getToolRegistry } from '../services/toolRegistry';

describe('Tool Registry Marketplace Metadata', () => {
    const registry = getToolRegistry();

    it('should have getAllToolsWithMeta returning all registered tools', () => {
        const tools = registry.getAllToolsWithMeta();
        expect(tools.length).toBeGreaterThanOrEqual(6);
    });

    it('every tool should have marketplace metadata', () => {
        const tools = registry.getAllToolsWithMeta();
        for (const tool of tools) {
            expect(tool.marketplace).toBeTruthy();
            expect(tool.marketplace!.domains.length).toBeGreaterThan(0);
            expect(tool.marketplace!.capabilities.length).toBeGreaterThan(0);
            expect(typeof tool.marketplace!.supports_realtime).toBe('boolean');
            expect(typeof tool.marketplace!.supports_parallel).toBe('boolean');
            expect(['none', 'weak', 'strong']).toContain(tool.marketplace!.evidence_level);
            expect(['low', 'mid', 'high']).toContain(tool.marketplace!.cost_tier);
        }
    });

    it('price_compare should have shopping domain', () => {
        const tool = registry.getTool('price_compare');
        expect(tool).toBeTruthy();
        expect(tool!.marketplace?.domains).toContain('shopping');
    });

    it('web_search should cover multiple domains', () => {
        const tool = registry.getTool('web_search');
        expect(tool).toBeTruthy();
        expect(tool!.marketplace?.domains.length).toBeGreaterThan(3);
    });

    it('live_search should support realtime', () => {
        const tool = registry.getTool('live_search');
        expect(tool).toBeTruthy();
        expect(tool!.marketplace?.supports_realtime).toBe(true);
    });

    it('web_exec should have high cost_tier', () => {
        const tool = registry.getTool('web_exec');
        expect(tool).toBeTruthy();
        expect(tool!.marketplace?.cost_tier).toBe('high');
    });
});
