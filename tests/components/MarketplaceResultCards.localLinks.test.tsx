import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocalResultCard } from '../../components/MarketplaceResultCards';

describe('LocalResultCard link safety', () => {
  it('does not render serpapi debug url and keeps safe map links', () => {
    const html = renderToStaticMarkup(
      <LocalResultCard
        data={{
          local_results: [
            {
              id: 'l1',
              name: '测试咖啡店A',
              address: '上海市黄浦区',
              rating: 4.6,
              map_url: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret',
              website: 'https://maps.google.com/?q=31.24,121.49',
            },
            {
              id: 'l2',
              name: '测试咖啡店B',
              address: '上海市静安区',
              rating: 4.8,
              map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%92%96%E5%95%A1%E5%BA%97',
            },
          ],
          action_links: [
            {
              title: '坏链接',
              url: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret',
              provider: 'google_maps',
            },
            {
              title: '好链接',
              url: 'https://www.google.com/maps/search/?api=1&query=coffee',
              provider: 'google_maps',
            },
          ],
        }}
      />
    );

    expect(html).toContain('https://maps.google.com/?q=31.24,121.49');
    expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=%E5%92%96%E5%95%A1%E5%BA%97');
    expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=coffee');
    expect(html).not.toContain('serpapi.com/search.json');
    expect(html).not.toContain('api_key=secret');
  });
});
