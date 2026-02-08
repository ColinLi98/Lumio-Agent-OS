import { describe, it, expect } from 'vitest';
import { buildFlightActionLinks, parseFlightConstraints } from '../services/flightConstraintParser';

describe('flightConstraintParser', () => {
    it('parses morning flight constraints from natural language', () => {
        const now = new Date('2026-02-06T12:00:00Z');
        const constraints = parseFlightConstraints('明天早上，上海虹桥到北京首都，经济舱，1人', now);

        expect(constraints.origin).toContain('上海虹桥');
        expect(constraints.destination).toContain('北京首都');
        expect(constraints.departureDate).toBe('2026-02-07');
        expect(constraints.travelClass).toBe('economy');
        expect(constraints.passengers).toBe(1);
        expect(constraints.departureTimePreference).toBe('morning');
        expect(constraints.timePriorityMode).toBe('prefer');
        expect(constraints.departureWindow).toBe('06:00-11:59');
    });

    it('builds structured action links for flight query', () => {
        const constraints = parseFlightConstraints(
            '明天早上，上海虹桥到北京首都，经济舱，1人',
            new Date('2026-02-06T12:00:00Z')
        );
        const links = buildFlightActionLinks(constraints);
        const ctripLink = links.find((link) => link.provider === 'ctrip');
        const tripLink = links.find((link) => link.provider === 'trip');

        expect(links.length).toBeGreaterThan(0);
        expect(links[0].provider).toBe('trip');
        expect(tripLink?.url).toContain('dcity=SHA');
        expect(tripLink?.url).toContain('acity=PEK');
        expect(ctripLink?.url).toContain('flights.ctrip.com/online/list/oneway-sha-pek');
        expect(ctripLink?.url).toContain('depdate=2026-02-07');
        expect(ctripLink?.supports_time_filter).toBe(false);
    });

    it('parses route tokens cleanly when query contains trailing "的机票"', () => {
        const constraints = parseFlightConstraints('伦敦到大连的机票');
        expect(constraints.origin).toBe('伦敦');
        expect(constraints.destination).toBe('大连');
    });

    it('still builds action links without departure date', () => {
        const constraints = parseFlightConstraints('伦敦到大连的机票');
        const links = buildFlightActionLinks(constraints);
        expect(links.length).toBeGreaterThan(0);
        expect(links[0].url).toContain('dcity=');
        expect(links[0].url).toContain('acity=');
    });
});
