/**
 * Flight Search Service - Real API Integration
 * 
 * Supports multiple providers:
 * - SerpApi (Google Flights) - Recommended for free tier
 * - Amadeus Self-Service API
 * - Direct airline links as fallback
 */

export interface FlightSearchParams {
    origin: string;       // City name or IATA code
    destination: string;  // City name or IATA code
    departureDate: string; // YYYY-MM-DD
    returnDate?: string;
    passengers?: number;
    travelClass?: 'economy' | 'business' | 'first';
    currency?: string;
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
    error?: string;
}

// IATA city code mapping (common cities)
const CITY_TO_IATA: Record<string, string> = {
    // UK
    'london': 'LON', '伦敦': 'LON', 'heathrow': 'LHR', 'gatwick': 'LGW',
    // China
    '北京': 'PEK', 'beijing': 'PEK', '上海': 'PVG', 'shanghai': 'PVG',
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
    if (CITY_TO_IATA[normalized]) return CITY_TO_IATA[normalized];

    const matchedKey = Object.keys(CITY_TO_IATA).find(key =>
        normalized.includes(key.toLowerCase())
    );
    if (matchedKey) return CITY_TO_IATA[matchedKey];

    const alpha = normalized.replace(/[^a-z]/g, '').toUpperCase();
    if (alpha.length >= 3) return alpha.slice(0, 3);

    return city.toUpperCase().slice(0, 3);
}

function getSerpApiEndpoint(): string {
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        return '/api/serpapi/search.json';
    }
    return 'https://serpapi.com/search.json';
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

/**
 * Search flights using SerpApi (Google Flights)
 * Requires SERPAPI_KEY
 */
export async function searchFlightsWithSerpApi(
    params: FlightSearchParams,
    apiKey: string
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
            error: dateError
        };
    }

    const endpoint = getSerpApiEndpoint();
    const searchParams = new URLSearchParams();
    searchParams.set('engine', 'google_flights');
    searchParams.set('departure_id', originCode);
    searchParams.set('arrival_id', destCode);
    searchParams.set('outbound_date', params.departureDate);
    searchParams.set('currency', params.currency || 'USD');
    searchParams.set('hl', 'en');
    searchParams.set('api_key', apiKey);

    if (params.returnDate) {
        searchParams.set('return_date', params.returnDate);
    }
    if (params.travelClass) {
        const classMap = { economy: '1', business: '2', first: '3' };
        searchParams.set('travel_class', classMap[params.travelClass] || '1');
    }

    try {
        const url = `${endpoint}?${searchParams.toString()}`;
        const response = await fetch(url);
        const rawText = await response.text();
        let data: any = null;

        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            data = null;
        }

        if (!response.ok) {
            const errorMessage = data?.error || data?.message || rawText || `API error: ${response.status}`;
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                error: errorMessage
            };
        }

        if (data?.error) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                error: data.error
            };
        }

        if (!data) {
            return {
                success: false,
                flights: [],
                comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
                searchParams: params,
                error: 'SerpApi 返回空响应'
            };
        }

        // Parse SerpApi response
        const flights: FlightResult[] = [];

        // Parse best flights
        if (data.best_flights) {
            for (const flight of data.best_flights) {
                flights.push(parseSerpApiFlight(flight, 'Google Flights (Best)'));
            }
        }

        // Parse other flights
        if (data.other_flights) {
            for (const flight of data.other_flights.slice(0, 10)) {
                flights.push(parseSerpApiFlight(flight, 'Google Flights'));
            }
        }

        // Find lowest price
        const prices = flights.map(f => f.price);
        const lowestPrice = Math.min(...prices);
        const cheapest = flights.find(f => f.price === lowestPrice);

        return {
            success: true,
            flights,
            lowestPrice: cheapest ? {
                price: lowestPrice,
                airline: cheapest.airline,
                source: cheapest.source
            } : undefined,
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params
        };

    } catch (error) {
        console.error('SerpApi flight search error:', error);
        return {
            success: false,
            flights: [],
            comparisonLinks: generateComparisonLinks(originCode, destCode, params.departureDate),
            searchParams: params,
            error: error instanceof Error ? error.message : 'Search failed'
        };
    }
}

function parseSerpApiFlight(flight: any, source: string): FlightResult {
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
        price: flight.price || 0,
        currency: 'USD',
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

    return [
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

    const lowestPrice = Math.min(...flights.map(f => f.price));
    const cheapest = flights.find(f => f.price === lowestPrice);

    return {
        success: true,
        flights,
        lowestPrice: cheapest ? {
            price: lowestPrice,
            airline: cheapest.airline,
            source: 'Estimated'
        } : undefined,
        comparisonLinks: links,
        searchParams: params
    };
}

/**
 * Main search function - uses API if available, otherwise falls back to mock
 */
export async function searchFlights(
    params: FlightSearchParams,
    serpApiKey?: string
): Promise<FlightSearchResult> {
    // Try SerpApi if key is provided
    if (serpApiKey) {
        const result = await searchFlightsWithSerpApi(params, serpApiKey);
        if (result.success && result.flights.length > 0) {
            return result;
        }
        const fallback = generateMockFlightsWithRealLinks(params);
        return {
            ...fallback,
            error: result.error || 'SerpApi request failed, using estimated data'
        };
    }

    // Fallback to mock data with real links
    return generateMockFlightsWithRealLinks(params);
}

export default searchFlights;
