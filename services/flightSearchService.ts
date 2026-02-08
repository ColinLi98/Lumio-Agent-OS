/**
 * Flight Search Service - Real-time first integration.
 *
 * Policy:
 * - Default behavior is fail-closed for live flight data.
 * - If live evidence is unavailable, do NOT silently return estimated prices.
 * - Estimated/mock data can only be enabled explicitly (debug/testing).
 */

import { getApiBaseUrl } from './apiBaseUrl';
import { executeSerpApi } from './serpApiClient';

export interface FlightSearchParams {
    origin: string;       // City name or IATA code
    destination: string;  // City name or IATA code
    departureDate: string; // YYYY-MM-DD
    returnDate?: string;
    passengers?: number;
    travelClass?: 'economy' | 'business' | 'first';
    currency?: string;
    departureTimePreference?: 'morning' | 'afternoon' | 'evening' | 'night';
    timePriorityMode?: 'prefer' | 'strict';
}

export interface FlightResult {
    id: string;
    airline: string;
    airlineLogo?: string;
    flightNumber: string;
    departure: {
        time: string;
        airport: string;
        city: string;
    };
    arrival: {
        time: string;
        airport: string;
        city: string;
    };
    duration: string;
    stops: number;
    stopover?: string;
    price: number;
    currency: string;
    travelClass: string;
    source: string;
    bookingUrl: string;
    baggage?: string;
}

export interface FlightSearchResult {
    success: boolean;
    flights: FlightResult[];
    lowestPrice?: { price: number; airline: string; source: string };
    comparisonLinks: Array<{ name: string; url: string; icon: string }>;
    searchParams: FlightSearchParams;
    appliedConstraints?: {
        departure_window?: string;
        time_priority_mode?: 'prefer' | 'strict';
    };
    realtime?: {
        verified: boolean;
        provider: 'serpapi_google_flights' | 'live_search_grounding' | 'amadeus_flight_offers' | 'multi_aggregated' | 'estimated_mock' | 'none';
        fetched_at?: string;
        ttl_seconds?: number;
        coverage_scope: 'single_provider' | 'multi_provider' | 'none';
        warnings?: string[];
    };
    error?: string;
}

export interface SearchFlightsOptions {
    /**
     * Require verified live evidence. Default: true.
     * When true, missing provider key or provider failure returns success=false.
     */
    requireLiveData?: boolean;
    /**
     * Allow estimated fallback data. Default: false.
     * Should only be enabled for tests/debug flows.
     */
    allowEstimatedFallback?: boolean;
    /**
     * Optional third structured provider (Amadeus) config.
     * When omitted, env vars will be used if available.
     */
    amadeus?: {
        enabled?: boolean;
        clientId?: string;
        clientSecret?: string;
        baseUrl?: string;
    };
}

// IATA city code mapping (common cities)
const CITY_TO_IATA: Record<string, string> = {
    // UK
    'london': 'LON', '伦敦': 'LON', 'heathrow': 'LHR', 'gatwick': 'LGW',
    // China
    '北京': 'BJS', 'beijing': 'BJS', '上海': 'SHA', 'shanghai': 'SHA',
    '上海虹桥': 'SHA', '虹桥': 'SHA', 'hongqiao': 'SHA',
    '上海虹桥机场': 'SHA', 'hongqiao airport': 'SHA',
    '上海浦东': 'PVG', '浦东': 'PVG', 'pudong': 'PVG',
    '上海浦东机场': 'PVG', 'pudong airport': 'PVG',
    '北京首都': 'PEK', '首都': 'PEK', 'capital': 'PEK',
    '北京首都机场': 'PEK', 'capital airport': 'PEK',
    '北京大兴': 'PKX', '大兴': 'PKX', 'daxing': 'PKX',
    '北京大兴机场': 'PKX', 'daxing airport': 'PKX',
    '广州': 'CAN', 'guangzhou': 'CAN', '深圳': 'SZX', 'shenzhen': 'SZX',
    '大连': 'DLC', 'dalian': 'DLC', '香港': 'HKG', 'hong kong': 'HKG',
    // Japan
    '东京': 'TYO', 'tokyo': 'TYO', 'narita': 'NRT', 'haneda': 'HND',
    '大阪': 'OSA', 'osaka': 'KIX',
    // US
    'new york': 'NYC', 'los angeles': 'LAX', 'san francisco': 'SFO',
    // Europe
    'paris': 'PAR', 'frankfurt': 'FRA', 'amsterdam': 'AMS',
    // Default
    'default': 'LON'
};

function getCityCode(city: string): string {
    const normalized = city.toLowerCase().trim();
    const normalizedCompact = normalized
        .replace(/\s+/g, '')
        .replace(/(国际|国内)?机场/g, '')
        .replace(/airport/g, '');

    if (CITY_TO_IATA[normalized]) return CITY_TO_IATA[normalized];
    if (CITY_TO_IATA[normalizedCompact]) return CITY_TO_IATA[normalizedCompact];

    const keys = Object.keys(CITY_TO_IATA).sort((a, b) => b.length - a.length);
    const matchedKey = keys.find((key) =>
        normalized.includes(key.toLowerCase()) || normalizedCompact.includes(key.toLowerCase())
    );
    if (matchedKey) return CITY_TO_IATA[matchedKey];

    const alpha = normalized.replace(/[^a-z]/g, '').toUpperCase();
    if (alpha.length >= 3) return alpha.slice(0, 3);

    return city.toUpperCase().slice(0, 3);
}

const EXPLICIT_AIRPORT_HINTS: Array<{ pattern: RegExp; code: string }> = [
    { pattern: /(上海)?虹桥|hongqiao/i, code: 'SHA' },
    { pattern: /(上海)?浦东|pudong/i, code: 'PVG' },
    { pattern: /(北京)?首都|capital/i, code: 'PEK' },
    { pattern: /(北京)?大兴|daxing/i, code: 'PKX' },
    { pattern: /heathrow|希思罗/i, code: 'LHR' },
    { pattern: /gatwick|盖特威克/i, code: 'LGW' },
];

function extractExplicitAirportCode(location: string): string | undefined {
    const normalized = String(location || '').trim();
    if (!normalized) return undefined;

    const explicitMatch = normalized.match(/\b([A-Z]{3})\b/);
    if (explicitMatch) {
        return explicitMatch[1].toUpperCase();
    }

    for (const item of EXPLICIT_AIRPORT_HINTS) {
        if (item.pattern.test(normalized)) {
            return item.code;
        }
    }

    return undefined;
}

function normalizeAirportCode(value: any): string | null {
    if (typeof value !== 'string') return null;
    const codeMatch = value.toUpperCase().match(/\b([A-Z]{3})\b/);
    return codeMatch ? codeMatch[1] : null;
}

function applyExplicitAirportConstraints(
    flights: FlightResult[],
    params: FlightSearchParams
): FlightResult[] {
    const expectedDepartureAirport = extractExplicitAirportCode(params.origin);
    const expectedArrivalAirport = extractExplicitAirportCode(params.destination);
    if (!expectedDepartureAirport && !expectedArrivalAirport) return flights;

    return flights.filter((flight) => {
        const departureAirport = normalizeAirportCode(flight.departure?.airport);
        const arrivalAirport = normalizeAirportCode(flight.arrival?.airport);
        const departureMatches = !expectedDepartureAirport || departureAirport === expectedDepartureAirport;
        const arrivalMatches = !expectedArrivalAirport || arrivalAirport === expectedArrivalAirport;
        return departureMatches && arrivalMatches;
    });
}

function readEnvValue(name: string): string | undefined {
    if (typeof process !== 'undefined' && process.env?.[name]) {
        return process.env[name];
    }
    return undefined;
}

interface AmadeusConfig {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    baseUrl: string;
}

function resolveAmadeusConfig(overrides?: SearchFlightsOptions['amadeus']): AmadeusConfig | null {
    const enabled = overrides?.enabled ?? true;
    if (!enabled) return null;

    const clientId = overrides?.clientId
        || readEnvValue('VITE_AMADEUS_CLIENT_ID')
        || readEnvValue('AMADEUS_CLIENT_ID')
        || '';
    const clientSecret = overrides?.clientSecret
        || readEnvValue('VITE_AMADEUS_CLIENT_SECRET')
        || readEnvValue('AMADEUS_CLIENT_SECRET')
        || '';
    const baseUrl = overrides?.baseUrl
        || readEnvValue('VITE_AMADEUS_BASE_URL')
        || readEnvValue('AMADEUS_BASE_URL')
        || 'https://test.api.amadeus.com';

    if (!clientId || !clientSecret) return null;
    return { enabled: true, clientId, clientSecret, baseUrl };
}

const MAX_SEARCH_DAYS_AHEAD = 330;

function daysBetween(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function validateDepartureDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
        return '出发日期格式不正确';
    }
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = daysBetween(start, parsed);
    if (diffDays < 0) {
        return '出发日期已过期';
    }
    if (diffDays > MAX_SEARCH_DAYS_AHEAD) {
        return `出发日期超出可查询范围（未来 ${MAX_SEARCH_DAYS_AHEAD} 天）`;
    }
    return null;
}

const DEPARTURE_WINDOWS: Record<NonNullable<FlightSearchParams['departureTimePreference']>, [number, number]> = {
    morning: [6, 12],
    afternoon: [12, 18],
    evening: [18, 24],
    night: [0, 6],
};

const DEPARTURE_WINDOW_LABELS: Record<NonNullable<FlightSearchParams['departureTimePreference']>, string> = {
    morning: '06:00-11:59',
    afternoon: '12:00-17:59',
    evening: '18:00-23:59',
    night: '00:00-05:59',
};

function parseDepartureHour(time: string): number | null {
    if (!time) return null;
    const trimmed = time.trim();

    const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
        let hour = parseInt(ampmMatch[1], 10);
        const marker = ampmMatch[3].toUpperCase();
        if (marker === 'PM' && hour < 12) hour += 12;
        if (marker === 'AM' && hour === 12) hour = 0;
        return hour;
    }

    const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        return Number.isFinite(hour) ? hour : null;
    }

    const hourMatch = trimmed.match(/(\d{1,2})点/);
    if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        return Number.isFinite(hour) ? hour : null;
    }

    return null;
}

function isInPreferredWindow(hour: number | null, preference?: FlightSearchParams['departureTimePreference']): boolean {
    if (hour === null || !preference) return false;
    const window = DEPARTURE_WINDOWS[preference];
    if (!window) return false;
    const [start, end] = window;
    return hour >= start && hour < end;
}

function applyTimePreference(
    flights: FlightResult[],
    params: FlightSearchParams
): FlightResult[] {
    const preference = params.departureTimePreference;
    if (!preference) return flights;
    const mode = params.timePriorityMode || 'prefer';

    const scored = flights.map((flight) => {
        const hour = parseDepartureHour(flight.departure?.time || '');
        return {
            flight,
            inPreferredWindow: isInPreferredWindow(hour, preference),
        };
    });

    if (mode === 'strict') {
        return scored
            .filter((item) => item.inPreferredWindow)
            .map((item) => item.flight);
    }

    return scored
        .sort((a, b) => {
            if (a.inPreferredWindow !== b.inPreferredWindow) {
                return a.inPreferredWindow ? -1 : 1;
            }
            return a.flight.price - b.flight.price;
        })
        .map((item) => item.flight);
}

function getAppliedConstraints(params: FlightSearchParams): FlightSearchResult['appliedConstraints'] | undefined {
    if (!params.departureTimePreference) return undefined;
    return {
        departure_window: DEPARTURE_WINDOW_LABELS[params.departureTimePreference],
        time_priority_mode: params.timePriorityMode || 'prefer',
    };
}

type RealtimeProviderName = 'serpapi_google_flights' | 'live_search_grounding' | 'amadeus_flight_offers';

interface FlightProviderSuccess {
    provider: RealtimeProviderName;
    result: FlightSearchResult;
}

interface FlightProviderFailure {
    provider: RealtimeProviderName;
    error: string;
}

function getLiveSearchEndpoint(): string | null {
    const base = getApiBaseUrl();
    if (!base) return null;
    return `${base}/api/live-search`;
}

function parsePrice(text: string): { price: number; currency: string } | null {
    const yuanMatch = text.match(/(?:¥|￥)\s?(\d{2,6})|(\d{2,6})\s?(?:元|人民币|RMB|CNY)/i);
    if (yuanMatch) {
        const raw = yuanMatch[1] || yuanMatch[2];
        const price = parseInt(raw, 10);
        if (Number.isFinite(price) && price > 0) {
            return { price, currency: 'CNY' };
        }
    }
    const usdMatch = text.match(/(?:USD|\$)\s?(\d{2,6})/i);
    if (usdMatch) {
        const price = parseInt(usdMatch[1], 10);
        if (Number.isFinite(price) && price > 0) {
            return { price, currency: 'USD' };
        }
    }
    return null;
}

function parseTimePair(text: string): { departure: string; arrival: string } | null {
    const pairMatch = text.match(/([01]?\d|2[0-3]):([0-5]\d)\s*[-~到至]\s*([01]?\d|2[0-3]):([0-5]\d)/);
    if (pairMatch) {
        return {
            departure: `${pairMatch[1].padStart(2, '0')}:${pairMatch[2]}`,
            arrival: `${pairMatch[3].padStart(2, '0')}:${pairMatch[4]}`,
        };
    }
    const allMatches = [...text.matchAll(/([01]?\d|2[0-3]):([0-5]\d)/g)];
    if (allMatches.length >= 2) {
        const first = allMatches[0];
        const second = allMatches[1];
        return {
            departure: `${first[1].padStart(2, '0')}:${first[2]}`,
            arrival: `${second[1].padStart(2, '0')}:${second[2]}`,
        };
    }
    return null;
}

function parseFlightNumber(text: string): string {
    const match = text.match(/\b([A-Z]{2}\d{3,4})\b/);
    return match ? match[1] : '';
}

function parseStops(text: string): number {
    if (/(直飞|non[-\s]?stop)/i.test(text)) return 0;
    const stopMatch = text.match(/(\d+)\s*(?:次)?\s*(?:中转|转机|stops?)/i);
    if (stopMatch) {
        const parsed = parseInt(stopMatch[1], 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    if (/(中转|转机|stopover|layover)/i.test(text)) return 1;
    return 0;
}

function parseAirline(text: string): string {
    const knownAirlines = [
        '中国国际航空', '中国东方航空', '中国南方航空', '海南航空', '厦门航空', '深圳航空',
        '四川航空', '春秋航空', '吉祥航空', '东航', '国航', '南航', 'Air China', 'China Eastern',
        'China Southern', 'Hainan Airlines', 'Xiamen Air', 'Shenzhen Airlines'
    ];
    const known = knownAirlines.find((name) => text.includes(name));
    if (known) return known;
    const token = text.split(/[|·\-—\s]/).find((part) => part.length >= 2 && !/\d/.test(part));
    return token || 'Unknown';
}

function dedupeFlights(flights: FlightResult[]): FlightResult[] {
    const deduped = new Map<string, FlightResult>();
    for (const flight of flights) {
        const key = [
            flight.airline.toLowerCase(),
            flight.flightNumber.toUpperCase(),
            flight.departure.time,
            flight.arrival.time,
            flight.departure.airport,
            flight.arrival.airport,
        ].join('|');

        const existing = deduped.get(key);
        if (!existing || flight.price < existing.price) {
            deduped.set(key, flight);
        }
    }
    return Array.from(deduped.values());
}

function getLowestPriceInfo(flights: FlightResult[]): { price: number; airline: string; source: string } | undefined {
    if (flights.length === 0) return undefined;
    const sorted = [...flights].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    return {
        price: cheapest.price,
        airline: cheapest.airline,
        source: cheapest.source,
    };
}

interface LiveSearchFlightResponse {
    success: boolean;
    evidence?: {
        provider: string;
        fetched_at: number;
        ttl_seconds: number;
        items: Array<{ title: string; snippet: string; url: string; source_name: string }>;
    };
    error?: { code?: string; message?: string };
}

function parseFlightsFromLiveEvidence(
    params: FlightSearchParams,
    items: Array<{ title: string; snippet: string; url: string; source_name: string }>
): FlightResult[] {
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const parsedFlights: FlightResult[] = [];

    for (const item of items) {
        const text = `${item.title || ''} ${item.snippet || ''}`.trim();
        const priceInfo = parsePrice(text);
        if (!priceInfo) continue;

        const timeInfo = parseTimePair(text);
        const flightNo = parseFlightNumber(text);
        const airline = parseAirline(text);
        const stops = parseStops(text);

        parsedFlights.push({
            id: `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            airline,
            flightNumber: flightNo,
            departure: {
                time: timeInfo?.departure || '',
                airport: originCode,
                city: params.origin,
            },
            arrival: {
                time: timeInfo?.arrival || '',
                airport: destCode,
                city: params.destination,
            },
            duration: '',
            stops,
            price: priceInfo.price,
            currency: params.currency || priceInfo.currency,
            travelClass: params.travelClass || 'economy',
            source: `Live Search (${item.source_name || 'grounding'})`,
            bookingUrl: item.url,
        });
    }

    return parsedFlights;
}

async function searchFlightsWithLiveSearchGrounding(
    params: FlightSearchParams
): Promise<FlightSearchResult> {
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const endpoint = getLiveSearchEndpoint();
    if (!endpoint) {
        return {
            success: false,
            flights: [],
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: false,
                provider: 'none',
                coverage_scope: 'none',
                warnings: ['Live search endpoint unavailable in current runtime'],
            },
            error: 'Live search endpoint unavailable',
        };
    }

    const query = `${params.departureDate} ${params.origin}到${params.destination} 机票 ${params.travelClass || 'economy'} 实时价格 航班时刻表`;
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                intent_domain: 'ticketing',
                locale: 'zh-CN',
                max_items: 8,
            }),
        });

        const payload = await response.json() as LiveSearchFlightResponse;
        const evidenceItems = payload?.evidence?.items || [];
        const parsedFlights = parseFlightsFromLiveEvidence(params, evidenceItems);
        const airportFilteredFlights = applyExplicitAirportConstraints(parsedFlights, params);
        const orderedFlights = applyTimePreference(airportFilteredFlights, params);

        if (!response.ok) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: [payload?.error?.message || `live_search http ${response.status}`],
                },
                error: payload?.error?.message || `live_search http ${response.status}`,
            };
        }

        if (parsedFlights.length > 0 && orderedFlights.length === 0) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: ['live_search flights do not satisfy requested airport constraints'],
                },
                error: 'live_search 航班与指定机场约束不一致（例如虹桥/首都）',
            };
        }

        if (orderedFlights.length === 0) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: ['live_search returned evidence but no parseable flight rows'],
                },
                error: payload?.error?.message || 'live_search 未返回可归一化航班数据',
            };
        }

        const fetchedAtIso = payload?.evidence?.fetched_at
            ? new Date(payload.evidence.fetched_at).toISOString()
            : new Date().toISOString();
        const ttl = payload?.evidence?.ttl_seconds || 120;

        return {
            success: true,
            flights: orderedFlights,
            lowestPrice: getLowestPriceInfo(orderedFlights),
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: true,
                provider: 'live_search_grounding',
                fetched_at: fetchedAtIso,
                ttl_seconds: ttl,
                coverage_scope: 'single_provider',
            },
        };
    } catch (error) {
        return {
            success: false,
            flights: [],
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: false,
                provider: 'none',
                coverage_scope: 'none',
                warnings: [error instanceof Error ? error.message : 'live_search provider failed'],
            },
            error: error instanceof Error ? error.message : 'live_search provider failed',
        };
    }
}

function extractTimeFromIsoDateTime(value?: string): string {
    if (!value) return '';
    const direct = value.match(/T(\d{2}:\d{2})/);
    if (direct) return direct[1];
    const fallback = value.match(/(\d{2}:\d{2})/);
    return fallback ? fallback[1] : '';
}

function formatIsoDuration(duration?: string): string {
    if (!duration) return '';
    const hoursMatch = duration.match(/(\d+)H/);
    const minsMatch = duration.match(/(\d+)M/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    if (!hours && !mins) return duration;
    if (!hours) return `${mins}m`;
    if (!mins) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

function parseAmadeusFlightOffer(offer: any, params: FlightSearchParams): FlightResult | null {
    const itinerary = offer?.itineraries?.[0];
    const segments = itinerary?.segments || [];
    if (!Array.isArray(segments) || segments.length === 0) return null;

    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const priceRaw = offer?.price?.grandTotal || offer?.price?.total || offer?.price?.base;
    const price = Number.parseFloat(String(priceRaw || '0'));
    if (!Number.isFinite(price) || price <= 0) return null;

    const validatingCarrier = Array.isArray(offer?.validatingAirlineCodes) && offer.validatingAirlineCodes.length > 0
        ? offer.validatingAirlineCodes[0]
        : firstSegment?.carrierCode || 'Unknown';
    const flightNumber = `${firstSegment?.carrierCode || ''}${firstSegment?.number || ''}`;
    const departureAirport = firstSegment?.departure?.iataCode || getCityCode(params.origin);
    const arrivalAirport = lastSegment?.arrival?.iataCode || getCityCode(params.destination);

    return {
        id: `amadeus_${offer?.id || Math.random().toString(36).slice(2, 8)}`,
        airline: validatingCarrier,
        flightNumber,
        departure: {
            time: extractTimeFromIsoDateTime(firstSegment?.departure?.at),
            airport: departureAirport,
            city: departureAirport,
        },
        arrival: {
            time: extractTimeFromIsoDateTime(lastSegment?.arrival?.at),
            airport: arrivalAirport,
            city: arrivalAirport,
        },
        duration: formatIsoDuration(itinerary?.duration),
        stops: Math.max(0, segments.length - 1),
        stopover: segments.length > 1 ? segments[1]?.departure?.iataCode : undefined,
        price,
        currency: offer?.price?.currency || params.currency || 'USD',
        travelClass: params.travelClass || 'economy',
        source: 'Amadeus Flight Offers',
        bookingUrl: 'https://www.amadeus.com/',
    };
}

async function searchFlightsWithAmadeus(
    params: FlightSearchParams,
    config: AmadeusConfig
): Promise<FlightSearchResult> {
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const comparisonLinks = generateComparisonLinks(originCode, destCode, params.departureDate);

    try {
        const tokenResponse = await fetch(`${config.baseUrl}/v1/security/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.clientId,
                client_secret: config.clientSecret,
            }).toString(),
        });

        const tokenText = await tokenResponse.text();
        let tokenData: any = null;
        try {
            tokenData = tokenText ? JSON.parse(tokenText) : null;
        } catch {
            tokenData = null;
        }

        if (!tokenResponse.ok || !tokenData?.access_token) {
            return {
                success: false,
                flights: [],
                comparisonLinks,
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: [tokenData?.error_description || tokenData?.error || `amadeus token error ${tokenResponse.status}`],
                },
                error: tokenData?.error_description || tokenData?.error || `amadeus token error ${tokenResponse.status}`,
            };
        }

        const queryParams = new URLSearchParams({
            originLocationCode: originCode,
            destinationLocationCode: destCode,
            departureDate: params.departureDate,
            adults: String(Math.max(1, params.passengers || 1)),
            max: '20',
            currencyCode: params.currency || 'CNY',
        });
        if (params.returnDate) {
            queryParams.set('returnDate', params.returnDate);
        }
        if (params.travelClass) {
            const classMap: Record<'economy' | 'business' | 'first', string> = {
                economy: 'ECONOMY',
                business: 'BUSINESS',
                first: 'FIRST',
            };
            queryParams.set('travelClass', classMap[params.travelClass]);
        }

        const offersResponse = await fetch(`${config.baseUrl}/v2/shopping/flight-offers?${queryParams.toString()}`, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const offersText = await offersResponse.text();
        let offersData: any = null;
        try {
            offersData = offersText ? JSON.parse(offersText) : null;
        } catch {
            offersData = null;
        }

        if (!offersResponse.ok) {
            const detail = offersData?.errors?.[0]?.detail || offersData?.error || `amadeus offers error ${offersResponse.status}`;
            return {
                success: false,
                flights: [],
                comparisonLinks,
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: [detail],
                },
                error: detail,
            };
        }

        const offerRows = Array.isArray(offersData?.data) ? offersData.data : [];
        const parsedFlights = offerRows
            .map((offer: any) => parseAmadeusFlightOffer(offer, params))
            .filter((flight: FlightResult | null): flight is FlightResult => Boolean(flight));
        const airportFilteredFlights = applyExplicitAirportConstraints(parsedFlights, params);
        const orderedFlights = applyTimePreference(airportFilteredFlights, params);

        if (parsedFlights.length > 0 && orderedFlights.length === 0) {
            return {
                success: false,
                flights: [],
                comparisonLinks,
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: ['amadeus offers do not satisfy requested airport constraints'],
                },
                error: 'amadeus 航班与指定机场约束不一致（例如虹桥/首都）',
            };
        }

        if (orderedFlights.length === 0) {
            return {
                success: false,
                flights: [],
                comparisonLinks,
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: ['amadeus returned no parseable offers'],
                },
                error: 'amadeus returned no parseable offers',
            };
        }

        return {
            success: true,
            flights: orderedFlights,
            lowestPrice: getLowestPriceInfo(orderedFlights),
            comparisonLinks,
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: true,
                provider: 'amadeus_flight_offers',
                fetched_at: new Date().toISOString(),
                ttl_seconds: 120,
                coverage_scope: 'single_provider',
            },
        };
    } catch (error) {
        return {
            success: false,
            flights: [],
            comparisonLinks,
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: false,
                provider: 'none',
                coverage_scope: 'none',
                warnings: [error instanceof Error ? error.message : 'amadeus provider failed'],
            },
            error: error instanceof Error ? error.message : 'amadeus provider failed',
        };
    }
}

function mergeRealtimeProviderResults(
    params: FlightSearchParams,
    successes: FlightProviderSuccess[],
    failures: FlightProviderFailure[]
): FlightSearchResult {
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const allFlights = dedupeFlights(successes.flatMap((entry) => entry.result.flights));
    const airportFilteredFlights = applyExplicitAirportConstraints(allFlights, params);
    const orderedFlights = applyTimePreference(airportFilteredFlights, params);
    if (!params.departureTimePreference) {
        orderedFlights.sort((a, b) => a.price - b.price);
    }

    if (orderedFlights.length === 0) {
        return {
            success: false,
            flights: [],
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: false,
                provider: 'none',
                coverage_scope: 'none',
                warnings: [
                    ...failures.map((f) => `${f.provider}: ${f.error}`),
                    'all aggregated rows were filtered by explicit airport constraints',
                ],
            },
            error: '聚合结果未通过机场约束校验，无法返回可验证航班',
        };
    }

    const coverageScope = successes.length > 1 ? 'multi_provider' : 'single_provider';
    const provider = successes.length > 1
        ? 'multi_aggregated'
        : successes[0].result.realtime?.provider || 'none';
    const fetchedAtCandidates = successes
        .map((entry) => entry.result.realtime?.fetched_at)
        .filter((v): v is string => Boolean(v))
        .map((v) => new Date(v).getTime())
        .filter((v) => Number.isFinite(v));
    const fetchedAt = fetchedAtCandidates.length > 0
        ? new Date(Math.max(...fetchedAtCandidates)).toISOString()
        : new Date().toISOString();
    const ttlCandidates = successes
        .map((entry) => entry.result.realtime?.ttl_seconds)
        .filter((v): v is number => Number.isFinite(v) && v > 0);
    const ttl = ttlCandidates.length > 0 ? Math.min(...ttlCandidates) : 120;
    const warnings = failures.map((f) => `${f.provider}: ${f.error}`);

    return {
        success: true,
        flights: orderedFlights,
        lowestPrice: getLowestPriceInfo(orderedFlights),
        comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
        searchParams: params,
        appliedConstraints: getAppliedConstraints(params),
        realtime: {
            verified: true,
            provider,
            fetched_at: fetchedAt,
            ttl_seconds: ttl,
            coverage_scope: coverageScope,
            warnings: warnings.length > 0 ? warnings : undefined,
        },
    };
}

/**
 * Search flights using SerpApi (Google Flights)
 * Requires SERPAPI_KEY
 */
export async function searchFlightsWithSerpApi(
    params: FlightSearchParams,
    apiKey?: string
): Promise<FlightSearchResult> {
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const dateError = validateDepartureDate(params.departureDate);
    if (dateError) {
        return {
            success: false,
            flights: [],
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            error: dateError
        };
    }

    const serpApiParams: Record<string, string> = {
        departure_id: originCode,
        arrival_id: destCode,
        outbound_date: params.departureDate,
        // Explicitly set trip type to avoid provider defaulting to round-trip.
        type: params.returnDate ? '1' : '2',
        currency: params.currency || 'USD',
        hl: 'en',
    };
    if (params.returnDate) {
        serpApiParams.return_date = params.returnDate;
    }
    if (params.travelClass) {
        const classMap = { economy: '1', business: '2', first: '3' };
        serpApiParams.travel_class = classMap[params.travelClass] || '1';
    }

    try {
        const serpResult = await executeSerpApi(
            {
                engine: 'google_flights',
                params: serpApiParams,
                locale: 'en-US',
                domain: 'travel',
                freshness_policy: 'cache_ok',
            },
            { apiKeyOverride: apiKey }
        );
        const data = serpResult.raw || null;

        if (!serpResult.success || !data) {
            const errorMessage = serpResult.error?.message || 'SerpApi returned empty response';
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                error: errorMessage
            };
        }

        // Parse SerpApi response
        const flights: FlightResult[] = [];

        // Parse best flights
        if (data.best_flights) {
            for (const flight of data.best_flights) {
                const parsed = parseSerpApiFlight(flight, 'Google Flights (Best)', params.currency || 'CNY');
                if (parsed) flights.push(parsed);
            }
        }

        // Parse other flights
        if (data.other_flights) {
            for (const flight of data.other_flights.slice(0, 10)) {
                const parsed = parseSerpApiFlight(flight, 'Google Flights', params.currency || 'CNY');
                if (parsed) flights.push(parsed);
            }
        }

        const airportFilteredFlights = applyExplicitAirportConstraints(flights, params);
        const orderedFlights = applyTimePreference(airportFilteredFlights, params);
        if (flights.length > 0 && orderedFlights.length === 0) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                error: 'serpapi 航班与指定机场约束不一致（例如虹桥/首都）'
            };
        }
        if (orderedFlights.length === 0) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                appliedConstraints: getAppliedConstraints(params),
                error: 'SerpApi 未返回可归一化航班结果'
            };
        }

        // Find lowest price
        const prices = orderedFlights.map(f => f.price);
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : undefined;
        const cheapest = lowestPrice !== undefined
            ? orderedFlights.find(f => f.price === lowestPrice)
            : undefined;

        return {
            success: true,
            flights: orderedFlights,
            lowestPrice: cheapest && lowestPrice !== undefined ? {
                price: lowestPrice,
                airline: cheapest.airline,
                source: cheapest.source
            } : undefined,
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            realtime: {
                verified: true,
                provider: 'serpapi_google_flights',
                fetched_at: new Date().toISOString(),
                ttl_seconds: 120,
                coverage_scope: 'single_provider',
            },
        };

    } catch (error) {
        console.error('SerpApi flight search error:', error);
        return {
            success: false,
            flights: [],
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            appliedConstraints: getAppliedConstraints(params),
            error: error instanceof Error ? error.message : 'Search failed'
        };
    }
}

function parseSerpApiPrice(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.replace(/[, ]/g, '');
        const match = normalized.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const parsed = Number.parseFloat(match[1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }
    return null;
}

function parseSerpApiFlight(flight: any, source: string, preferredCurrency: string): FlightResult | null {
    const parsedPrice = parseSerpApiPrice(flight?.price);
    if (parsedPrice === null) {
        // SerpApi can return rows without price; keep only quote rows with verifiable price.
        return null;
    }

    const firstLeg = flight.flights?.[0] || {};
    const lastLeg = flight.flights?.[flight.flights.length - 1] || firstLeg;

    return {
        id: `serpapi_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        airline: firstLeg.airline || 'Unknown',
        airlineLogo: firstLeg.airline_logo,
        flightNumber: firstLeg.flight_number || '',
        departure: {
            time: firstLeg.departure_airport?.time || '',
            airport: firstLeg.departure_airport?.id || '',
            city: firstLeg.departure_airport?.name || ''
        },
        arrival: {
            time: lastLeg.arrival_airport?.time || '',
            airport: lastLeg.arrival_airport?.id || '',
            city: lastLeg.arrival_airport?.name || ''
        },
        duration: flight.total_duration ? `${Math.floor(flight.total_duration / 60)}h ${flight.total_duration % 60}m` : '',
        stops: (flight.flights?.length || 1) - 1,
        stopover: flight.layovers?.[0]?.name,
        price: parsedPrice,
        currency: preferredCurrency,
        travelClass: flight.travel_class || 'Economy',
        source,
        bookingUrl: flight.booking_token
            ? `https://www.google.com/travel/flights/booking?token=${flight.booking_token}`
            : 'https://www.google.com/travel/flights',
        baggage: flight.extensions?.find((e: string) => e.includes('kg') || e.includes('bag'))
    };
}

/**
 * Generate comparison links for multiple platforms
 */
function generateComparisonLinks(origin: string, destination: string, date: string): Array<{ name: string; url: string; icon: string }> {
    const dateFormatted = date.replace(/-/g, '');
    const originLower = origin.toLowerCase();
    const destinationLower = destination.toLowerCase();
    const originUpper = origin.toUpperCase();
    const destinationUpper = destination.toUpperCase();
    const ctripCabin = 'y_s';

    return [
        {
            name: 'Ctrip',
            url: `https://flights.ctrip.com/online/list/oneway-${originLower}-${destinationLower}?depdate=${date}&cabin=${ctripCabin}`,
            icon: '🏮'
        },
        {
            name: 'Qunar',
            url: `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${originUpper}&searchArrivalAirport=${destinationUpper}&searchDepartureTime=${date}`,
            icon: '🧭'
        },
        {
            name: 'Trip.com',
            url: `https://www.trip.com/flights/?dcity=${originUpper}&acity=${destinationUpper}&ddate=${date}`,
            icon: '🌐'
        },
        {
            name: 'Google Flights',
            url: `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}%20on%20${date}`,
            icon: '🔍'
        },
        {
            name: 'Skyscanner',
            url: `https://www.skyscanner.com/transport/flights/${origin}/${destination}/${dateFormatted}/`,
            icon: '✈️'
        },
        {
            name: 'Kayak',
            url: `https://www.kayak.com/flights/${origin}-${destination}/${date}`,
            icon: '🚀'
        },
        {
            name: 'Momondo',
            url: `https://www.momondo.com/flight-search/${origin}-${destination}/${date}`,
            icon: '💰'
        },
        {
            name: 'Expedia',
            url: `https://www.expedia.com/Flights-Search?leg1=from:${origin},to:${destination},departure:${date}`,
            icon: '🌍'
        }
    ];
}

/**
 * Fallback: Generate mock results with real booking links
 * Used when no API key is provided
 */
export function generateMockFlightsWithRealLinks(params: FlightSearchParams): FlightSearchResult {
    const now = new Date();
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const currency = params.currency || 'USD';

    const links = generateComparisonLinks(originCode, destCode, params.departureDate);

    const flights: FlightResult[] = [
        {
            id: 'mock_1',
            airline: 'British Airways',
            flightNumber: 'BA287',
            departure: { time: '09:30', airport: originCode, city: params.origin },
            arrival: { time: '17:45', airport: destCode, city: params.destination },
            duration: '11h 15m',
            stops: 0,
            price: 580,
            currency,
            travelClass: params.travelClass || 'economy',
            source: 'Compare prices →',
            bookingUrl: links[0].url
        },
        {
            id: 'mock_2',
            airline: 'ANA',
            flightNumber: 'NH201',
            departure: { time: '11:00', airport: originCode, city: params.origin },
            arrival: { time: '18:30', airport: destCode, city: params.destination },
            duration: '11h 30m',
            stops: 0,
            price: 520,
            currency,
            travelClass: params.travelClass || 'economy',
            source: 'Compare prices →',
            bookingUrl: links[1].url
        },
        {
            id: 'mock_3',
            airline: 'Emirates',
            flightNumber: 'EK5',
            departure: { time: '14:30', airport: originCode, city: params.origin },
            arrival: { time: '06:15+1', airport: destCode, city: params.destination },
            duration: '14h 45m',
            stops: 1,
            stopover: 'Dubai (DXB)',
            price: 445,
            currency,
            travelClass: params.travelClass || 'economy',
            source: 'Compare prices →',
            bookingUrl: links[2].url
        }
    ];

    const orderedFlights = applyTimePreference(flights, params);
    const prices = orderedFlights.map(f => f.price);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : undefined;
    const cheapest = lowestPrice !== undefined
        ? orderedFlights.find(f => f.price === lowestPrice)
        : undefined;

    return {
        success: true,
        flights: orderedFlights,
        lowestPrice: cheapest && lowestPrice !== undefined ? {
            price: lowestPrice,
            airline: cheapest.airline,
            source: 'Estimated'
        } : undefined,
        comparisonLinks: links,
        searchParams: params,
        appliedConstraints: getAppliedConstraints(params),
        realtime: {
            verified: false,
            provider: 'estimated_mock',
            coverage_scope: 'none',
            warnings: ['Estimated data only; not verified live evidence'],
        },
    };
}

/**
 * Main search function.
 * Default: real-time evidence required; no silent mock fallback.
 */
export async function searchFlights(
    params: FlightSearchParams,
    serpApiKey?: string,
    options: SearchFlightsOptions = {}
): Promise<FlightSearchResult> {
    const requireLiveData = options.requireLiveData ?? true;
    const allowEstimatedFallback = options.allowEstimatedFallback ?? false;
    const amadeusConfig = resolveAmadeusConfig(options.amadeus);
    const hasAmadeusProvider = Boolean(amadeusConfig);
    const originCode = getCityCode(params.origin);
    const destCode = getCityCode(params.destination);
    const links = generateComparisonLinks(originCode, destCode, params.departureDate);

    const providers: Array<Promise<FlightProviderSuccess | FlightProviderFailure>> = [];

    providers.push(
        searchFlightsWithSerpApi(params, serpApiKey)
            .then((result) => {
                const ok = result.success && result.flights.length > 0 && result.realtime?.verified;
                if (ok) {
                    return { provider: 'serpapi_google_flights', result } as FlightProviderSuccess;
                }
                return {
                    provider: 'serpapi_google_flights',
                    error: result.error || 'SerpApi returned no normalized flights'
                } as FlightProviderFailure;
            })
            .catch((error) => ({
                provider: 'serpapi_google_flights',
                error: error instanceof Error ? error.message : 'SerpApi provider failed',
            } as FlightProviderFailure))
    );

    providers.push(
        searchFlightsWithLiveSearchGrounding(params)
            .then((result) => {
                const ok = result.success && result.flights.length > 0 && result.realtime?.verified;
                if (ok) {
                    return { provider: 'live_search_grounding', result } as FlightProviderSuccess;
                }
                return {
                    provider: 'live_search_grounding',
                    error: result.error || 'live_search returned no normalized flights'
                } as FlightProviderFailure;
            })
            .catch((error) => ({
                provider: 'live_search_grounding',
                error: error instanceof Error ? error.message : 'live_search provider failed',
            } as FlightProviderFailure))
    );

    if (amadeusConfig) {
        providers.push(
            searchFlightsWithAmadeus(params, amadeusConfig)
                .then((result) => {
                    const ok = result.success && result.flights.length > 0 && result.realtime?.verified;
                    if (ok) {
                        return { provider: 'amadeus_flight_offers', result } as FlightProviderSuccess;
                    }
                    return {
                        provider: 'amadeus_flight_offers',
                        error: result.error || 'amadeus returned no normalized flights'
                    } as FlightProviderFailure;
                })
                .catch((error) => ({
                    provider: 'amadeus_flight_offers',
                    error: error instanceof Error ? error.message : 'amadeus provider failed',
                } as FlightProviderFailure))
        );
    }

    const providerResults = await Promise.all(providers);
    const successes = providerResults.filter((item): item is FlightProviderSuccess => 'result' in item);
    const failures = providerResults.filter((item): item is FlightProviderFailure => 'error' in item);

    if (successes.length > 0) {
        return mergeRealtimeProviderResults(params, successes, failures);
    }

    if (allowEstimatedFallback && !requireLiveData) {
        return generateMockFlightsWithRealLinks(params);
    }

    return {
        success: false,
        flights: [],
        comparisonLinks: links,
        searchParams: params,
        appliedConstraints: getAppliedConstraints(params),
        realtime: {
            verified: false,
            provider: 'none',
            coverage_scope: 'none',
            warnings: [
                ...failures.map((f) => `${f.provider}: ${f.error}`),
                'SERPAPI provider failed or unavailable',
                !hasAmadeusProvider ? 'AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET not configured' : 'Amadeus provider failed',
                'Estimated fallback disabled by realtime policy',
            ],
        },
        error: '未获取到可验证的多源实时航班数据，无法返回真实票价与班次',
    };
}

export default searchFlights;
