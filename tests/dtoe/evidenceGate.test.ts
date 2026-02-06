/**
 * Evidence Gate Tests - Phase 3 v0.1
 * Tests for P0 evidence requirements and domain filtering
 */

import { describe, it, expect } from 'vitest';
import {
    parseVertexGrounding,
    filterEcommerceForTicketing,
    mergeEvidencePacks,
} from '../../services/dtoe/vertexGroundingParser';
import { validateEvidenceGate } from '../../services/dtoe/schemaValidators';
import type { EvidencePack } from '../../services/dtoe/coreSchemas';

// ============================================================================
// P0 Evidence Gate Tests
// ============================================================================

describe('P0 Evidence Gate', () => {
    it('should pass when needs_live_data=false', () => {
        const result = validateEvidenceGate(false, null);
        expect(result.valid).toBe(true);
    });

    it('should FAIL when needs_live_data=true and no evidence', () => {
        const result = validateEvidenceGate(true, null);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('P0 VIOLATION');
    });

    it('should FAIL when needs_live_data=true and evidence.items is empty', () => {
        const emptyPack: EvidencePack = {
            items: [],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0,
        };

        const result = validateEvidenceGate(true, emptyPack);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('items is empty');
    });

    it('should PASS when needs_live_data=true and evidence has items', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Flight Info', snippet: 'Details', url: 'https://ctrip.com/flight', source_name: 'ctrip.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const result = validateEvidenceGate(true, pack);
        expect(result.valid).toBe(true);
    });
});

// ============================================================================
// Ticketing Domain Ecommerce Filter Tests
// ============================================================================

describe('Ticketing Domain Ecommerce Filter', () => {
    it('should filter out JD.com from ticketing results', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Train Ticket', snippet: 'Info', url: 'https://12306.cn/ticket', source_name: '12306.cn' },
                { title: 'Product', snippet: 'Shop', url: 'https://jd.com/item', source_name: 'jd.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const filtered = filterEcommerceForTicketing(pack, 'ticketing.train');

        expect(filtered.items.length).toBe(1);
        expect(filtered.items[0].source_name).toBe('12306.cn');
    });

    it('should filter out Taobao from travel results', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Flight', snippet: 'Info', url: 'https://ctrip.com/flight', source_name: 'ctrip.com' },
                { title: 'Shop', snippet: 'Buy', url: 'https://taobao.com/item', source_name: 'taobao.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const filtered = filterEcommerceForTicketing(pack, 'travel.flight');

        expect(filtered.items.length).toBe(1);
        expect(filtered.items[0].source_name).toBe('ctrip.com');
    });

    it('should filter out Pinduoduo from ticketing results', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Concert', snippet: 'Ticket info', url: 'https://damai.cn/event', source_name: 'damai.cn' },
                { title: 'Deal', snippet: 'Cheap', url: 'https://pinduoduo.com/item', source_name: 'pinduoduo.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const filtered = filterEcommerceForTicketing(pack, 'ticketing.concert');

        expect(filtered.items.length).toBe(1);
        expect(filtered.items[0].source_name).toBe('damai.cn');
    });

    it('should NOT filter ecommerce from commerce domain', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Phone', snippet: 'iPhone', url: 'https://jd.com/iphone', source_name: 'jd.com' },
                { title: 'Tablet', snippet: 'iPad', url: 'https://taobao.com/ipad', source_name: 'taobao.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 60,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const filtered = filterEcommerceForTicketing(pack, 'ecommerce.product');

        expect(filtered.items.length).toBe(2);
    });

    it('should set confidence to 0 when all items filtered out', () => {
        const pack: EvidencePack = {
            items: [
                { title: 'Product', snippet: 'Shop', url: 'https://jd.com/item', source_name: 'jd.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.8,
        };

        const filtered = filterEcommerceForTicketing(pack, 'ticketing.train');

        expect(filtered.items.length).toBe(0);
        expect(filtered.confidence).toBe(0);
    });
});

// ============================================================================
// Vertex Grounding Parser Tests
// ============================================================================

describe('Vertex Grounding Parser', () => {
    it('should parse grounding chunks into EvidencePack', () => {
        const response = {
            candidates: [{
                groundingMetadata: {
                    groundingChunks: [
                        { web: { uri: 'https://example.com/page', title: 'Example Page' } },
                        { web: { uri: 'https://another.com/doc', title: 'Another Doc' } },
                    ],
                },
            }],
        };

        const pack = parseVertexGrounding(response);

        expect(pack.items.length).toBe(2);
        expect(pack.items[0].title).toBe('Example Page');
        expect(pack.items[0].url).toBe('https://example.com/page');
        expect(pack.provider).toBe('vertex_grounding');
    });

    it('should deduplicate items by URL', () => {
        const response = {
            candidates: [{
                groundingMetadata: {
                    groundingChunks: [
                        { web: { uri: 'https://example.com/page', title: 'Title 1' } },
                        { web: { uri: 'https://example.com/page', title: 'Title 2' } },
                    ],
                },
            }],
        };

        const pack = parseVertexGrounding(response);

        expect(pack.items.length).toBe(1);
    });

    it('should compute confidence based on item count', () => {
        const emptyResponse = { candidates: [] };
        const emptyPack = parseVertexGrounding(emptyResponse);
        expect(emptyPack.confidence).toBeLessThan(0.5);

        const fullResponse = {
            candidates: [{
                groundingMetadata: {
                    groundingChunks: [
                        { web: { uri: 'https://a.com', title: 'A' } },
                        { web: { uri: 'https://b.com', title: 'B' } },
                        { web: { uri: 'https://c.com', title: 'C' } },
                    ],
                },
            }],
        };
        const fullPack = parseVertexGrounding(fullResponse);
        expect(fullPack.confidence).toBeGreaterThan(0.5);
    });

    it('should set TTL based on domain', () => {
        const response = {
            candidates: [{
                groundingMetadata: {
                    groundingChunks: [
                        { web: { uri: 'https://example.com', title: 'Test' } },
                    ],
                },
            }],
        };

        const travelPack = parseVertexGrounding(response, { domain: 'travel.flight' });
        expect(travelPack.ttl_seconds).toBe(120);

        const ecommercePack = parseVertexGrounding(response, { domain: 'ecommerce.product' });
        expect(ecommercePack.ttl_seconds).toBe(60);
    });
});

// ============================================================================
// Evidence Pack Merging Tests
// ============================================================================

describe('Evidence Pack Merging', () => {
    it('should merge multiple packs and deduplicate', () => {
        const pack1: EvidencePack = {
            items: [
                { title: 'A', snippet: 'a', url: 'https://a.com', source_name: 'a.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 120,
            provider: 'vertex_grounding',
            confidence: 0.7,
        };

        const pack2: EvidencePack = {
            items: [
                { title: 'A', snippet: 'a', url: 'https://a.com', source_name: 'a.com' },
                { title: 'B', snippet: 'b', url: 'https://b.com', source_name: 'b.com' },
            ],
            fetched_at_ms: Date.now(),
            ttl_seconds: 60,
            provider: 'openai_web_search',
            confidence: 0.8,
        };

        const merged = mergeEvidencePacks([pack1, pack2]);

        expect(merged.items.length).toBe(2);  // Deduplicated
        expect(merged.ttl_seconds).toBe(60);  // Min TTL
        expect(merged.confidence).toBe(0.8);  // Max confidence
    });

    it('should return empty pack for empty input', () => {
        const merged = mergeEvidencePacks([]);

        expect(merged.items.length).toBe(0);
        expect(merged.confidence).toBe(0);
    });
});
