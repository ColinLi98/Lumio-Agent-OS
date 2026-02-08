import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  LocalResultCard,
  ShoppingResultCard,
  WeatherResultCard,
  type OutboundLinkClickPayload,
} from '../../components/MarketplaceResultCards';

function collectAnchorClickHandlers(node: any, handlers: Array<() => void>) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((child) => collectAnchorClickHandlers(child, handlers));
    return;
  }
  if (!React.isValidElement(node)) return;

  if (node.type === 'a' && typeof (node.props as any)?.onClick === 'function') {
    handlers.push((node.props as any).onClick);
  }
  collectAnchorClickHandlers((node.props as any)?.children, handlers);
}

describe('MarketplaceResultCards outbound link telemetry', () => {
  it('emits telemetry callback for local card link clicks', () => {
    const calls: OutboundLinkClickPayload[] = [];
    const element = LocalResultCard({
      data: {
        local_results: [
          { name: '测试咖啡', address: '上海市黄浦区', map_url: 'https://www.google.com/maps/search/?api=1&query=%E4%B8%8A%E6%B5%B7' },
        ],
      },
      onOutboundLinkClick: (payload) => calls.push(payload),
    });

    const handlers: Array<() => void> = [];
    collectAnchorClickHandlers(element, handlers);
    expect(handlers.length).toBeGreaterThan(0);
    handlers[0]();

    expect(calls.length).toBe(1);
    expect(calls[0].agentType).toBe('local_service');
    expect(calls[0].url).toContain('google.com/maps/search');
  });

  it('emits telemetry callback for shopping and weather links', () => {
    const calls: OutboundLinkClickPayload[] = [];

    const shoppingElement = ShoppingResultCard({
      data: {
        shopping_results: [
          { title: '耳机', source: '商城A', price: 299, url: 'https://example.com/product' },
        ],
      },
      onOutboundLinkClick: (payload) => calls.push(payload),
    });
    const weatherElement = WeatherResultCard({
      data: {
        data: {
          locationCN: '上海',
          forecast: [],
        },
      },
      onOutboundLinkClick: (payload) => calls.push(payload),
    });

    const handlers: Array<() => void> = [];
    collectAnchorClickHandlers(shoppingElement, handlers);
    collectAnchorClickHandlers(weatherElement, handlers);
    expect(handlers.length).toBeGreaterThan(1);
    handlers.forEach((handler) => handler());

    const agentTypes = calls.map((call) => call.agentType);
    expect(agentTypes).toContain('shopping');
    expect(agentTypes).toContain('weather');
  });
});

