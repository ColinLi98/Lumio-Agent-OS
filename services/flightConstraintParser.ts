import { classifyFreshness } from './freshnessClassifier';

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

const LOCATION_ROUTE_CODE_MAP: Record<string, string> = {
    '上海虹桥': 'sha',
    '上海浦东': 'pvg',
    '上海': 'sha',
    '北京首都': 'pek',
    '北京大兴': 'pkx',
    '北京': 'bjs',
    '广州': 'can',
    '深圳': 'szx',
    '成都': 'ctu',
    '杭州': 'hgh',
    '西安': 'sia',
    '南京': 'nkg',
    '武汉': 'wuh',
    '重庆': 'ckg',
};

const LOCATION_AIRPORT_CODE_MAP: Record<string, string> = {
    '上海虹桥': 'SHA',
    '上海浦东': 'PVG',
    '上海': 'SHA',
    '北京首都': 'PEK',
    '北京大兴': 'PKX',
    '北京': 'BJS',
    '广州': 'CAN',
    '深圳': 'SZX',
    '成都': 'CTU',
    '杭州': 'HGH',
    '西安': 'SIA',
    '南京': 'NKG',
    '武汉': 'WUH',
    '重庆': 'CKG',
};

const CABIN_PARAM_MAP: Record<FlightTravelClass, string> = {
    economy: 'y_s',
    business: 'c_s',
    first: 'f_s',
};

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildDate(year: number, month: number, day: number): Date | null {
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    if (date.getMonth() + 1 !== month || date.getDate() !== day) return null;
    return date;
}

function normalizeLocationToken(value: string): string {
    return value
        .trim()
        .replace(/[，,。.!！？?]+$/g, '')
        .replace(/(?:机场|国际机场|国内机场)$/g, '')
        .trim();
}

function parseDepartureDate(query: string, baseDate: Date): string | undefined {
    const text = query.toLowerCase();

    const fullMatch = text.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
    if (fullMatch) {
        const date = buildDate(
            parseInt(fullMatch[1], 10),
            parseInt(fullMatch[2], 10),
            parseInt(fullMatch[3], 10)
        );
        if (date) return formatDate(date);
    }

    const monthDayMatch = text.match(/(\d{1,2})[\/\-.月](\d{1,2})(?:日|号)?/);
    if (monthDayMatch) {
        const month = parseInt(monthDayMatch[1], 10);
        const day = parseInt(monthDayMatch[2], 10);
        let year = baseDate.getFullYear();
        let date = buildDate(year, month, day);
        if (date && date < baseDate) {
            year += 1;
            date = buildDate(year, month, day);
        }
        if (date) return formatDate(date);
    }

    if (text.includes('明天') || text.includes('tomorrow')) {
        const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
        return formatDate(date);
    }
    if (text.includes('后天')) {
        const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 2);
        return formatDate(date);
    }
    if (text.includes('大后天')) {
        const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 3);
        return formatDate(date);
    }

    return undefined;
}

function parseRoute(query: string): { origin?: string; destination?: string } {
    const routeMatch = query.match(/(?:从)?\s*([^，。,.\s]+)\s*(?:到|->|→)\s*([^，。,.\s]+)/);
    if (!routeMatch) return {};
    const origin = normalizeLocationToken(routeMatch[1]);
    const destination = normalizeLocationToken(routeMatch[2]);
    if (!origin || !destination || origin === destination) return {};
    return { origin, destination };
}

function parseTravelClass(query: string): FlightTravelClass | undefined {
    if (/(商务舱|business)/i.test(query)) return 'business';
    if (/(头等舱|first)/i.test(query)) return 'first';
    if (/(经济舱|economy)/i.test(query)) return 'economy';
    return undefined;
}

function parsePassengers(query: string): number | undefined {
    const match = query.match(/(\d+)\s*(?:人|位)/);
    if (match) {
        const count = parseInt(match[1], 10);
        if (count > 0) return count;
    }
    if (/(单人|一人|1人|1位)/.test(query)) return 1;
    return undefined;
}

function parseDepartureTimePreference(query: string): DepartureTimePreference | undefined {
    if (/(早上|上午|早班|清晨|晨间|morning)/i.test(query)) return 'morning';
    if (/(下午|afternoon)/i.test(query)) return 'afternoon';
    if (/(晚上|傍晚|晚间|evening)/i.test(query)) return 'evening';
    if (/(深夜|夜间|夜里|night)/i.test(query)) return 'night';
    return undefined;
}

function toRouteCode(location?: string): string | undefined {
    if (!location) return undefined;
    const normalized = normalizeLocationToken(location);
    if (!normalized) return undefined;

    const exact = LOCATION_ROUTE_CODE_MAP[normalized];
    if (exact) return exact;

    const key = Object.keys(LOCATION_ROUTE_CODE_MAP).find((item) => normalized.includes(item));
    if (key) return LOCATION_ROUTE_CODE_MAP[key];

    const latin = normalized.toLowerCase().replace(/[^a-z]/g, '');
    if (latin.length >= 3) return latin.slice(0, 3);
    return undefined;
}

function toAirportCode(location?: string): string | undefined {
    if (!location) return undefined;
    const normalized = normalizeLocationToken(location);
    if (!normalized) return undefined;

    const exact = LOCATION_AIRPORT_CODE_MAP[normalized];
    if (exact) return exact;

    const key = Object.keys(LOCATION_AIRPORT_CODE_MAP).find((item) => normalized.includes(item));
    if (key) return LOCATION_AIRPORT_CODE_MAP[key];

    const latin = normalized.toUpperCase().replace(/[^A-Z]/g, '');
    if (latin.length >= 3) return latin.slice(0, 3);
    return undefined;
}

export function parseFlightConstraints(query: string, now: Date = new Date()): FlightConstraints {
    const route = classifyFreshness(query);
    const parsedRoute = parseRoute(query);
    const hasRoute = Boolean(parsedRoute.origin && parsedRoute.destination);
    const hasFlightKeyword = /(机票|航班|飞机|飞|舱|airline|flight)/i.test(query);
    const hasTrainKeyword = /(火车|高铁|动车|车票|车次|12306|train)/i.test(query);

    const looksLikeFlightQuery = route.intent_domain === 'travel.flight'
        || hasFlightKeyword
        || (hasRoute && !hasTrainKeyword);

    if (!looksLikeFlightQuery) {
        return {};
    }

    const { origin, destination } = parsedRoute;
    const departureDate = parseDepartureDate(query, now);
    const travelClass = parseTravelClass(query);
    const passengers = parsePassengers(query);
    const departureTimePreference = parseDepartureTimePreference(query);
    const timePriorityMode: TimePriorityMode | undefined = departureTimePreference ? 'prefer' : undefined;
    const departureWindow = departureTimePreference ? TIME_WINDOWS[departureTimePreference] : undefined;

    return {
        origin,
        destination,
        departureDate,
        travelClass,
        passengers,
        departureTimePreference,
        timePriorityMode,
        departureWindow,
    };
}

export function buildFlightActionLinks(
    constraints: FlightConstraints
): FlightActionLink[] {
    const originRouteCode = toRouteCode(constraints.origin);
    const destinationRouteCode = toRouteCode(constraints.destination);
    const originAirportCode = toAirportCode(constraints.origin);
    const destinationAirportCode = toAirportCode(constraints.destination);
    const departureDate = constraints.departureDate;

    if (!originRouteCode || !destinationRouteCode || !departureDate) {
        return [];
    }

    const cabin = constraints.travelClass
        ? CABIN_PARAM_MAP[constraints.travelClass]
        : CABIN_PARAM_MAP.economy;

    const ctripOriginCode = (originAirportCode || originRouteCode).toLowerCase();
    const ctripDestinationCode = (destinationAirportCode || destinationRouteCode).toLowerCase();
    const ctripUrl = `https://flights.ctrip.com/online/list/oneway-${ctripOriginCode}-${ctripDestinationCode}?depdate=${departureDate}&cabin=${cabin}`;
    const qunarUrl = originAirportCode && destinationAirportCode
        ? `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${originAirportCode}&searchArrivalAirport=${destinationAirportCode}&searchDepartureTime=${departureDate}`
        : `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${originRouteCode.toUpperCase()}&searchArrivalAirport=${destinationRouteCode.toUpperCase()}&searchDepartureTime=${departureDate}`;
    const tripUrl = originAirportCode && destinationAirportCode
        ? `https://www.trip.com/flights/?dcity=${originAirportCode}&acity=${destinationAirportCode}&ddate=${departureDate}`
        : `https://www.trip.com/flights/?dcity=${originRouteCode.toUpperCase()}&acity=${destinationRouteCode.toUpperCase()}&ddate=${departureDate}`;
    const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20from%20${originAirportCode || originRouteCode.toUpperCase()}%20to%20${destinationAirportCode || destinationRouteCode.toUpperCase()}%20on%20${departureDate}`;
    const skyscannerUrl = `https://www.skyscanner.com/transport/flights/${(originAirportCode || originRouteCode).toLowerCase()}/${(destinationAirportCode || destinationRouteCode).toLowerCase()}/${departureDate.replace(/-/g, '')}/`;

    return [
        {
            title: 'Trip.com - 实时航班',
            url: tripUrl,
            provider: 'trip',
            supports_time_filter: false,
        },
        {
            title: '去哪儿 - 实时航班',
            url: qunarUrl,
            provider: 'qunar',
            supports_time_filter: false,
        },
        {
            title: '携程旅行 - 实时航班',
            url: ctripUrl,
            provider: 'ctrip',
            supports_time_filter: false,
        },
        {
            title: 'Google Flights',
            url: googleFlightsUrl,
            provider: 'google_flights',
            supports_time_filter: false,
        },
        {
            title: 'Skyscanner',
            url: skyscannerUrl,
            provider: 'skyscanner',
            supports_time_filter: false,
        },
    ];
}
