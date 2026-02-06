import { describe, it, expect } from 'vitest';
import { SuperAgentService, type ToolExecutionResult } from '../services/superAgentService';
import { parseFlightConstraints } from '../services/flightConstraintParser';

describe('SuperAgentService flight time preference', () => {
    it('reorders structured flights by morning-first then price', () => {
        const service = new SuperAgentService();
        const constraints = parseFlightConstraints(
            '明天早上，上海虹桥到北京首都，经济舱，1人',
            new Date('2026-02-06T12:00:00Z')
        );

        const toolResults: ToolExecutionResult[] = [
            {
                toolName: 'mock_flights',
                args: {},
                output: {
                    flights: [
                        { id: 'f1', departure: '21:05', price: 910 },
                        { id: 'f2', departure: '08:10', price: 990 },
                        { id: 'f3', departure: '07:55', price: 1200 },
                    ],
                },
                success: true,
                executionTimeMs: 1,
            },
        ];

        (service as any).applyFlightTimePreferenceToToolResults(toolResults, constraints);
        const flights = toolResults[0].output.flights;

        expect(flights[0].id).toBe('f2');
        expect(flights[1].id).toBe('f3');
        expect(flights[2].id).toBe('f1');
    });

    it('returns non-misleading guidance when no structured flights are available', () => {
        const service = new SuperAgentService();
        const query = '明天早上，上海虹桥到北京首都，经济舱，1人';
        const constraints = parseFlightConstraints(query, new Date('2026-02-06T12:00:00Z'));
        const toolResults: ToolExecutionResult[] = [
            {
                toolName: 'live_search',
                args: {},
                output: {
                    action_links: [
                        {
                            title: '携程旅行 - 实时航班',
                            url: 'https://flights.ctrip.com/online/list/oneway-sha-bjs?depdate=2026-02-07&cabin=y_s',
                            provider: 'ctrip',
                            supports_time_filter: false,
                        },
                    ],
                },
                success: true,
                executionTimeMs: 1,
            },
        ];

        const finalAnswer = (service as any).enforceFlightTimePreference(
            query,
            '该页面已预置了您的日期和舱位偏好',
            toolResults,
            constraints
        );

        expect(finalAnswer).toContain('外站页面通常默认按低价优先排序');
        expect(finalAnswer).toContain('起飞时间');
        expect(finalAnswer).toContain('https://flights.ctrip.com/online/list/oneway-sha-bjs');
        expect(finalAnswer).not.toContain('已预置');
    });
});
