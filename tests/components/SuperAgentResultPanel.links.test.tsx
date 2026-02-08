import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveSearchResultCard } from '../../components/SuperAgentResultPanel';

describe('LiveSearchResultCard links', () => {
  it('renders structured action links and quote cards as clickable anchors', () => {
    const html = renderToStaticMarkup(
      <LiveSearchResultCard
        data={{
          success: true,
          is_live: true,
          fetched_at: new Date().toISOString(),
          ttl_seconds: 120,
          items: [
            {
              title: '搜索结果',
              snippet: '示例摘要',
              url: 'https://example.com/source',
              source_name: 'example.com',
            },
          ],
          action_links: [
            {
              title: '携程旅行 - 实时航班',
              url: 'https://flights.ctrip.com/online/list/oneway-sha-pek?depdate=2026-02-07&cabin=y_s',
              provider: 'ctrip',
              supports_time_filter: false,
            },
          ],
          quote_cards: [
            {
              quote_id: 'q1',
              provider: 'serpapi_google_flights',
              dep_time: '07:30',
              arr_time: '09:45',
              price_text: 'CNY 980',
              transfers_text: '直飞',
              source_url: 'https://www.google.com/travel/flights',
              fetched_at: new Date().toISOString(),
            },
          ],
        }}
      />
    );

    expect(html).toContain('href="https://flights.ctrip.com/online/list/oneway-sha-pek');
    expect(html).toContain('href="https://www.google.com/travel/flights"');
    expect(html).toContain('比价候选');
    expect(html).toContain('快速直达');
  });

  it('filters serpapi debug links from rendered anchors', () => {
    const html = renderToStaticMarkup(
      <LiveSearchResultCard
        data={{
          success: true,
          is_live: true,
          fetched_at: new Date().toISOString(),
          ttl_seconds: 120,
          items: [
            {
              title: '坏来源',
              snippet: 'should be filtered',
              url: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret',
              source_name: 'serpapi',
            },
            {
              title: '好来源',
              snippet: 'public source',
              url: 'https://example.com/public',
              source_name: 'example.com',
            },
          ],
          action_links: [
            {
              title: '坏链接',
              url: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret',
              provider: 'serpapi',
              supports_time_filter: false,
            },
            {
              title: '好链接',
              url: 'https://www.google.com/maps/search/?api=1&query=coffee',
              provider: 'google_maps',
              supports_time_filter: false,
            },
          ],
        }}
      />
    );

    expect(html).toContain('href="https://example.com/public"');
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=coffee"');
    expect(html).not.toContain('serpapi.com/search.json');
    expect(html).not.toContain('api_key=secret');
  });
});
