import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeatherResultCard } from '../../components/MarketplaceResultCards';

describe('WeatherResultCard links and details', () => {
  it('renders forecast details and only safe weather links', () => {
    const html = renderToStaticMarkup(
      <WeatherResultCard
        data={{
          data: {
            locationCN: '上海',
            location: 'Shanghai',
            coordinates: { lat: 31.2304, lon: 121.4737 },
            forecast: [
              { day: '今天', condition: '多云', temp: '12-18°C', icon: '⛅' },
              { day: '明天', condition: '晴', temp: '10-19°C', icon: '☀️' },
            ],
            tips: ['☔ 早晚温差较大，建议带薄外套'],
            action_links: [
              { title: 'bad', url: 'https://serpapi.com/search.json?engine=google_maps&api_key=secret', provider: 'serpapi' },
              { title: 'safe', url: 'https://www.weather.com/', provider: 'weather.com' },
            ],
          },
        }}
      />
    );

    expect(html).toContain('上海 天气');
    expect(html).toContain('今天');
    expect(html).toContain('12-18°C');
    expect(html).toContain('https://www.weather.com/');
    expect(html).toContain('https://www.google.com/search?q=%E4%B8%8A%E6%B5%B7%20%E5%A4%A9%E6%B0%94');
    expect(html).toContain('https://www.windy.com/31.2304/121.4737?31.2304,121.4737,7');
    expect(html).not.toContain('serpapi.com/search.json');
    expect(html).not.toContain('api_key=secret');
  });
});
