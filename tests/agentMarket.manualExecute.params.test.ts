import { describe, expect, it } from 'vitest';
import { __agentMarketTestables } from '../api/agent-market/[action]';

describe('agent-market manual execute specialized params', () => {
    it('extracts destination for restaurant/attraction/weather/itinerary queries', () => {
        const restaurant = __agentMarketTestables.buildSpecializedTaskParams(
            'restaurant',
            '帮我找上海外滩附近评价高的餐厅'
        );
        expect(String(restaurant.destination || '')).toContain('上海');
        expect(String(restaurant.destination || '')).toContain('外滩');

        const attraction = __agentMarketTestables.buildSpecializedTaskParams(
            'attraction',
            '帮我找上海周末适合打卡的景点'
        );
        expect(String(attraction.destination || '')).toContain('上海');

        const weather = __agentMarketTestables.buildSpecializedTaskParams(
            'weather',
            '帮我查上海明天的天气'
        );
        expect(weather.destination).toBe('上海');

        const itinerary = __agentMarketTestables.buildSpecializedTaskParams(
            'itinerary',
            '帮我做上海两天行程安排'
        );
        expect(String(itinerary.destination || '')).toContain('上海');
    });

    it('extracts route for transportation and falls back to destination when route is missing', () => {
        const withRoute = __agentMarketTestables.buildSpecializedTaskParams(
            'transportation',
            '从北京到上海的接送机交通方案'
        );
        expect(withRoute.origin).toBe('北京');
        expect(withRoute.destination).toBe('上海');

        const withoutRoute = __agentMarketTestables.buildSpecializedTaskParams(
            'transportation',
            '帮我找上海外滩附近交通方案'
        );
        expect(withoutRoute.origin).toBeUndefined();
        expect(String(withoutRoute.destination || '')).toContain('上海');
    });
});
