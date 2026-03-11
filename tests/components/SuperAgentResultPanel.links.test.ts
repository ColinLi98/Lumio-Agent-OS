import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveSearchResultCard } from '../../components/SuperAgentResultPanel';

describe('SuperAgentResultPanel action links', () => {
    it('renders clickable action_links cards for live search results', () => {
        const html = renderToStaticMarkup(
            React.createElement(LiveSearchResultCard, {
                data: {
                    success: true,
                    is_live: true,
                    fetched_at: new Date().toISOString(),
                    ttl_seconds: 120,
                    items: [
                        {
                            title: '上海到北京航班搜索',
                            snippet: '示例来源',
                            url: 'https://example.com/flights',
                            source_name: 'example.com',
                        },
                    ],
                    action_links: [
                        {
                            title: '携程旅行 - 实时航班',
                            url: 'https://flights.ctrip.com/online/list/oneway-sha-bjs?depdate=2026-02-07&cabin=y_s',
                            provider: 'ctrip',
                            supports_time_filter: false,
                        },
                    ],
                },
            })
        );

        expect(html).toContain('携程旅行 - 实时航班');
        expect(html).toContain('https://flights.ctrip.com/online/list/oneway-sha-bjs');
        expect(html).toContain('manually select early-flight filter on site');
    });
});
