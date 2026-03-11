import { classifyFreshness } from './freshnessClassifier.js';

export type DepartureTimePreference = 'morning' | 'afternoon' | 'evening' | 'night';
export type TimePriorityMode = 'prefer' | 'strict';
export type FlightTravelClass = 'economy' | 'business' | 'first';

export interface FlightConstraints {
    origin?: string;
    destination?: string;
    departureDate?: string;
    travelClass?: FlightTravelClass;
    passengers?: number;
    departureTimePreference?: DepartureTimePreference;
    timePriorityMode?: TimePriorityMode;
    departureWindow?: string;
}

export interface FlightActionLink {
    title: string;
    url: string;
    provider: string;
    supports_time_filter: boolean;
}

const TIME_WINDOWS: Record<DepartureTimePreference, string> = {
    morning: '06:00-11:59',
    afternoon: '12:00-17:59',
    evening: '18:00-23:59',
    night: '00:00-05:59',
};

const ROUTE_CODE_MAP: Record<string, string> = {
    '上海虹桥': 'SHA',
    '上海浦东': 'PVG',
    '上海': 'SHA',
    '北京首都': 'PEK',
    '北京大兴': 'PKX',
    '北京': 'PEK',
    '广州': 'CAN',
    '深圳': 'SZX',
    '大连': 'DLC',
    '伦敦': 'LON',
};

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeLocationToken(value: string): string {
    return value
        .replace(/的机票.*$/g, '')
        .replace(/的航班.*$/g, '')
        .replace(/[，,。.!！？?]+$/g, '')
        .trim();
}

function parseRoute(query: string): { origin?: string; destination?: string } {
    const normalized = query.replace(/\s+/g, '');
    const match = normalized.match(/(?:从)?(.+?)(?:到|->|→)(.+?)(?:的机票|机票|航班|$)/);
    if (!match) return {};
    const origin = normalizeLocationToken(match[1]);
    const destination = normalizeLocationToken(match[2]);
    if (!origin || !destination || origin === destination) return {};
    return { origin, destination };
}

function parseDepartureDate(query: string, now: Date): string | undefined {
    const full = query.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
    if (full) {
        return `${full[1]}-${String(Number(full[2])).padStart(2, '0')}-${String(Number(full[3])).padStart(2, '0')}`;
    }
    const monthDay = query.match(/(\d{1,2})[\/\-.月](\d{1,2})(?:日|号)?/);
    if (monthDay) {
        let year = now.getFullYear();
        const month = Number(monthDay[1]);
        const day = Number(monthDay[2]);
        const candidate = new Date(year, month - 1, day);
        if (candidate < now) year += 1;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (/明天|tomorrow/i.test(query)) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return formatDate(date);
    }
    if (/后天/i.test(query)) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
        return formatDate(date);
    }
    return undefined;
}

function parseTravelClass(query: string): FlightTravelClass | undefined {
    if (/(商务舱|business)/i.test(query)) return 'business';
    if (/(头等舱|first)/i.test(query)) return 'first';
    if (/(经济舱|economy)/i.test(query)) return 'economy';
    return undefined;
}

function parsePassengers(query: string): number | undefined {
    const match = query.match(/(\d+)\s*(?:人|位)/);
    if (match) return Number(match[1]);
    if (/(单人|一人|1人|1位)/.test(query)) return 1;
    return undefined;
}

function parseDepartureTimePreference(query: string): DepartureTimePreference | undefined {
    if (/(早上|上午|早班|清晨|morning)/i.test(query)) return 'morning';
    if (/(下午|afternoon)/i.test(query)) return 'afternoon';
    if (/(晚上|傍晚|evening)/i.test(query)) return 'evening';
    if (/(深夜|夜间|night)/i.test(query)) return 'night';
    return undefined;
}

function toAirportCode(location?: string): string | undefined {
    if (!location) return undefined;
    const normalized = normalizeLocationToken(location);
    const exact = ROUTE_CODE_MAP[normalized];
    if (exact) return exact;
    const matched = Object.keys(ROUTE_CODE_MAP).find((key) => normalized.includes(key));
    if (matched) return ROUTE_CODE_MAP[matched];
    const latin = normalized.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return latin.length >= 3 ? latin.slice(0, 3) : undefined;
}

export function parseFlightConstraints(query: string, now: Date = new Date()): FlightConstraints {
    const route = classifyFreshness(query);
    const parsedRoute = parseRoute(query);
    const hasRoute = Boolean(parsedRoute.origin && parsedRoute.destination);
    const looksLikeFlight = route.intent_domain === 'travel.flight'
        || /(机票|航班|飞机|舱|flight|airline)/i.test(query)
        || hasRoute;
    if (!looksLikeFlight) return {};

    const departureTimePreference = parseDepartureTimePreference(query);
    return {
        origin: parsedRoute.origin,
        destination: parsedRoute.destination,
        departureDate: parseDepartureDate(query, now),
        travelClass: parseTravelClass(query),
        passengers: parsePassengers(query),
        departureTimePreference,
        timePriorityMode: departureTimePreference ? 'prefer' : undefined,
        departureWindow: departureTimePreference ? TIME_WINDOWS[departureTimePreference] : undefined,
    };
}

export function buildFlightActionLinks(constraints: FlightConstraints): FlightActionLink[] {
    const origin = toAirportCode(constraints.origin);
    const destination = toAirportCode(constraints.destination);
    if (!origin || !destination) return [];

    const dateParam = constraints.departureDate ? `&ddate=${constraints.departureDate}` : '';
    const ctripDateParam = constraints.departureDate ? `?depdate=${constraints.departureDate}` : '';
    const ctripCabin = constraints.travelClass === 'business'
        ? '&cabin=c_s'
        : constraints.travelClass === 'first'
            ? '&cabin=f_s'
            : constraints.travelClass === 'economy'
                ? '&cabin=y_s'
                : '';

    return [
        {
            title: 'Trip.com - 实时航班',
            url: `https://www.trip.com/flights/?dcity=${origin}&acity=${destination}${dateParam}`,
            provider: 'trip',
            supports_time_filter: false,
        },
        {
            title: '携程旅行 - 实时航班',
            url: `https://flights.ctrip.com/online/list/oneway-${origin.toLowerCase()}-${destination.toLowerCase()}${ctripDateParam}${ctripCabin}`,
            provider: 'ctrip',
            supports_time_filter: false,
        },
        {
            title: 'Google Flights',
            url: `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}${constraints.departureDate ? `%20on%20${constraints.departureDate}` : ''}`,
            provider: 'google_flights',
            supports_time_filter: false,
        },
    ];
}
