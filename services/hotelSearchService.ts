/**
 * Hotel Search Service - Real-time Google Hotels integration via SerpApi.
 *
 * Policy:
 * - Default behavior is fail-closed for live hotel data.
 * - If live evidence is unavailable, do NOT silently return estimated prices.
 * - Estimated/mock data can only be enabled explicitly (debug/testing).
 *
 * Uses the same SerpApi proxy (/api/serpapi) as flightSearchService.ts.
 */

import { executeSerpApi } from './serpApiClient.js';

// ============================================================================
// Types
// ============================================================================

export interface HotelSearchParams {
    destination: string;       // City/area name (e.g., "东京", "Tokyo", "Bali")
    checkInDate: string;       // YYYY-MM-DD
    checkOutDate: string;      // YYYY-MM-DD
    adults?: number;           // Default 2
    currency?: string;         // Default CNY for Chinese destinations, USD otherwise
    starLevel?: number[];      // e.g., [4, 5] for 4-5 star hotels
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'relevance' | 'lowest_price' | 'highest_rating' | 'most_reviewed';
}

export interface HotelResult {
    id: string;
    name: string;
    nameEn?: string;
    type: 'hotel' | 'vacation_rental' | 'resort';
    description?: string;
    star: number;
    rating: number;
    reviewCount: number;
    pricePerNight: number;
    totalPrice?: number;
    currency: string;
    location: string;
    locationNote?: string;
    locationType: 'city_center' | 'scenic' | 'airport' | 'other';
    gpsCoordinates?: { latitude: number; longitude: number };
    amenities: string[];
    images: string[];
    checkInTime?: string;
    checkOutTime?: string;
    bookingUrl?: string;
    source: string;
    nearbyPlaces?: Array<{ name: string; distance?: string }>;
    freeCancellation?: boolean;
}

export interface HotelSearchResult {
    success: boolean;
    hotels: HotelResult[];
    totalResults?: number;
    searchParams: HotelSearchParams;
    comparisonLinks: Array<{ name: string; url: string; icon: string }>;
    realtime?: {
        verified: boolean;
        provider: 'serpapi_google_hotels' | 'live_search_grounding' | 'none';
        fetched_at?: string;
        ttl_seconds?: number;
        coverage_scope: 'single_provider' | 'multi_provider' | 'none';
        warnings?: string[];
    };
    error?: string;
}

export interface SearchHotelsOptions {
    requireLiveData?: boolean;
    allowEstimatedFallback?: boolean;
}

// ============================================================================
// Destination Mapping
// ============================================================================

const DESTINATION_SEARCH_TERMS: Record<string, string> = {
    // China
    '北京': 'Beijing hotels',
    '上海': 'Shanghai hotels',
    '广州': 'Guangzhou hotels',
    '深圳': 'Shenzhen hotels',
    '大连': 'Dalian hotels',
    '杭州': 'Hangzhou hotels',
    '成都': 'Chengdu hotels',
    '西安': "Xi'an hotels",
    '三亚': 'Sanya resorts',
    '香港': 'Hong Kong hotels',
    // Japan
    '东京': 'Tokyo hotels',
    '大阪': 'Osaka hotels',
    '京都': 'Kyoto hotels',
    // Southeast Asia
    '巴厘岛': 'Bali resorts',
    '曼谷': 'Bangkok hotels',
    '新加坡': 'Singapore hotels',
    // Europe
    '伦敦': 'London hotels',
    '巴黎': 'Paris hotels',
    // Default: pass through as-is
};

const SORT_BY_MAP: Record<NonNullable<HotelSearchParams['sortBy']>, number | undefined> = {
    relevance: undefined,
    lowest_price: 3,
    highest_rating: 8,
    most_reviewed: 13,
};

// ============================================================================
// Helpers
// ============================================================================

function inferCurrency(destination: string): string {
    if (/[\u4e00-\u9fa5]/.test(destination)) return 'CNY';
    return 'USD';
}

function resolveSearchQuery(destination: string): string {
    const normalized = destination.trim();
    const mapped = DESTINATION_SEARCH_TERMS[normalized];
    if (mapped) return mapped;

    // Try partial match
    for (const [key, value] of Object.entries(DESTINATION_SEARCH_TERMS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }

    // Pass raw, appending "hotels" if not already present
    if (/hotel|酒店|resort|住宿/i.test(normalized)) return normalized;
    return `${normalized} hotels`;
}

function inferLocationType(hotel: any): HotelResult['locationType'] {
    const nearbyNames = (hotel.nearby_places || [])
        .map((p: any) => (p.name || '').toLowerCase())
        .join(' ');
    if (/airport/i.test(nearbyNames)) return 'airport';
    if (/beach|sea|ocean|resort/i.test(hotel.name || '')) return 'scenic';
    return 'city_center';
}

function extractStar(hotel: any): number {
    if (typeof hotel.extracted_hotel_class === 'number') return hotel.extracted_hotel_class;
    if (typeof hotel.hotel_class === 'string') {
        const match = hotel.hotel_class.match(/(\d)/);
        if (match) return parseInt(match[1], 10);
    }
    // Infer from rating
    if (hotel.overall_rating >= 4.5) return 5;
    if (hotel.overall_rating >= 4.0) return 4;
    if (hotel.overall_rating >= 3.5) return 3;
    return 3;
}

function extractPrice(hotel: any): { perNight: number; total?: number } {
    const perNight =
        hotel.rate_per_night?.extracted_lowest ??
        hotel.extracted_price ??
        0;
    const total = hotel.total_rate?.extracted_lowest;
    return { perNight, total };
}

function extractImages(hotel: any): string[] {
    if (!Array.isArray(hotel.images)) return [];
    return hotel.images
        .slice(0, 5)
        .map((img: any) => img.thumbnail || img.original_image || '')
        .filter(Boolean);
}

function extractNearbyPlaces(hotel: any): Array<{ name: string; distance?: string }> {
    if (!Array.isArray(hotel.nearby_places)) return [];
    return hotel.nearby_places.map((place: any) => ({
        name: place.name || '',
        distance: place.transportations?.[0]
            ? `${place.transportations[0].type}: ${place.transportations[0].duration}`
            : undefined,
    }));
}

function normalizeHotelType(type?: string): HotelResult['type'] {
    if (!type) return 'hotel';
    const lower = type.toLowerCase();
    if (lower.includes('vacation') || lower.includes('rental')) return 'vacation_rental';
    if (lower.includes('resort')) return 'resort';
    return 'hotel';
}

function generateComparisonLinks(
    destination: string,
    checkIn: string,
    checkOut: string
): Array<{ name: string; url: string; icon: string }> {
    const q = encodeURIComponent(destination);
    return [
        {
            name: 'Booking.com',
            url: `https://www.booking.com/searchresults.html?ss=${q}&checkin=${checkIn}&checkout=${checkOut}`,
            icon: '🏨',
        },
        {
            name: 'Agoda',
            url: `https://www.agoda.com/search?city=${q}&checkIn=${checkIn}&checkOut=${checkOut}`,
            icon: '🌏',
        },
        {
            name: 'Trip.com',
            url: `https://www.trip.com/hotels/list?city=${q}&checkin=${checkIn}&checkout=${checkOut}`,
            icon: '✈️',
        },
        {
            name: 'Google Hotels',
            url: `https://www.google.com/travel/hotels?q=${q}&dates=${checkIn},${checkOut}`,
            icon: '🔍',
        },
    ];
}

function isProviderDebugUrl(url: unknown): boolean {
    if (typeof url !== 'string' || !url.trim()) return false;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        if (host.includes('serpapi.com')) return true;
        if (parsed.pathname.toLowerCase().includes('/search.json')) return true;
        if (parsed.searchParams.has('api_key')) return true;
        return false;
    } catch {
        return false;
    }
}

function buildHotelFallbackLink(name: string, destination: string, checkIn: string, checkOut: string): string {
    const q = encodeURIComponent(`${name || destination} ${destination}`.trim());
    return `https://www.google.com/travel/hotels?q=${q}&dates=${checkIn},${checkOut}`;
}

function resolveHotelBookingUrl(hotel: any, params: HotelSearchParams): string {
    const primary = typeof hotel?.link === 'string' ? hotel.link : '';
    if (primary && !isProviderDebugUrl(primary)) return primary;

    const secondary = typeof hotel?.serpapi_property_details_link === 'string'
        ? hotel.serpapi_property_details_link
        : '';
    if (secondary && !isProviderDebugUrl(secondary)) return secondary;

    return buildHotelFallbackLink(hotel?.name || params.destination, params.destination, params.checkInDate, params.checkOutDate);
}

// ============================================================================
// Core Search
// ============================================================================

async function searchHotelsWithSerpApi(
    params: HotelSearchParams,
    apiKey?: string
): Promise<HotelSearchResult> {
    const query = resolveSearchQuery(params.destination);
    const currency = params.currency || inferCurrency(params.destination);
    const comparisonLinks = generateComparisonLinks(params.destination, params.checkInDate, params.checkOutDate);

    const searchParams = new URLSearchParams({
        engine: 'google_hotels',
        q: query,
        check_in_date: params.checkInDate,
        check_out_date: params.checkOutDate,
        adults: String(params.adults || 2),
        currency,
        hl: /[\u4e00-\u9fa5]/.test(params.destination) ? 'zh-CN' : 'en',
        gl: /[\u4e00-\u9fa5]/.test(params.destination) ? 'cn' : 'us',
    });

    if (params.sortBy && SORT_BY_MAP[params.sortBy] !== undefined) {
        searchParams.set('sort_by', String(SORT_BY_MAP[params.sortBy]));
    }
    if (params.minPrice !== undefined) {
        searchParams.set('min_price', String(params.minPrice));
    }
    if (params.maxPrice !== undefined) {
        searchParams.set('max_price', String(params.maxPrice));
    }

    try {
        const serpResult = await executeSerpApi(
            {
                engine: 'google_hotels',
                params: Object.fromEntries(searchParams.entries()),
                locale: /[\u4e00-\u9fa5]/.test(params.destination) ? 'zh-CN' : 'en-US',
                domain: 'travel',
                freshness_policy: 'cache_ok',
            },
            { apiKeyOverride: apiKey }
        );

        if (!serpResult.success) {
            const status = serpResult.error?.status || 502;
            console.warn('[HotelSearchService] SerpApi error:', status, serpResult.error?.message || '');
            return {
                success: false,
                hotels: [],
                searchParams: params,
                comparisonLinks,
                realtime: {
                    verified: false,
                    provider: 'none',
                    coverage_scope: 'none',
                    warnings: [`SerpApi HTTP ${status}`],
                },
                error: serpResult.error?.message || `SerpApi request failed: HTTP ${status}`,
            };
        }

        const data = serpResult.raw || {};
        const rawProperties = data.properties || [];
        const rawAds = data.ads || [];
        const allRaw = [...rawProperties, ...rawAds];

        if (allRaw.length === 0) {
            return {
                success: false,
                hotels: [],
                totalResults: data.search_information?.total_results,
                searchParams: params,
                comparisonLinks,
                realtime: {
                    verified: true,
                    provider: 'serpapi_google_hotels',
                    fetched_at: new Date().toISOString(),
                    ttl_seconds: 300,
                    coverage_scope: 'single_provider',
                    warnings: ['No hotel properties found for the given search'],
                },
                error: '未找到符合条件的酒店',
            };
        }

        // Parse and normalize
        const hotels: HotelResult[] = allRaw.map((hotel: any, idx: number) => {
            const price = extractPrice(hotel);
            const star = extractStar(hotel);
            return {
                id: hotel.property_token || `hotel_${idx}`,
                name: hotel.name || 'Unknown Hotel',
                type: normalizeHotelType(hotel.type),
                description: hotel.description || undefined,
                star,
                rating: hotel.overall_rating || 0,
                reviewCount: hotel.reviews || 0,
                pricePerNight: price.perNight,
                totalPrice: price.total,
                currency,
                location: hotel.nearby_places?.[0]?.name || params.destination,
                locationType: inferLocationType(hotel),
                gpsCoordinates: hotel.gps_coordinates || undefined,
                amenities: Array.isArray(hotel.amenities) ? hotel.amenities.slice(0, 10) : [],
                images: extractImages(hotel),
                checkInTime: hotel.check_in_time || undefined,
                checkOutTime: hotel.check_out_time || undefined,
                bookingUrl: resolveHotelBookingUrl(hotel, params),
                source: 'Google Hotels (SerpApi)',
                nearbyPlaces: extractNearbyPlaces(hotel),
                freeCancellation: hotel.free_cancellation || false,
            };
        });

        // Apply star filter
        let filtered = hotels;
        if (params.starLevel && params.starLevel.length > 0) {
            filtered = hotels.filter(h => params.starLevel!.includes(h.star));
            // If filter removes everything, fall back to unfiltered
            if (filtered.length === 0) filtered = hotels;
        }

        console.log(`[HotelSearchService] Found ${filtered.length} hotels (${allRaw.length} raw)`);

        return {
            success: true,
            hotels: filtered,
            totalResults: data.search_information?.total_results,
            searchParams: params,
            comparisonLinks,
            realtime: {
                verified: true,
                provider: 'serpapi_google_hotels',
                fetched_at: new Date().toISOString(),
                ttl_seconds: 300,
                coverage_scope: 'single_provider',
            },
        };
    } catch (error) {
        console.error('[HotelSearchService] Error:', error);
        return {
            success: false,
            hotels: [],
            searchParams: params,
            comparisonLinks,
            realtime: {
                verified: false,
                provider: 'none',
                coverage_scope: 'none',
                warnings: [error instanceof Error ? error.message : 'Unknown error'],
            },
            error: error instanceof Error ? error.message : 'Hotel search failed',
        };
    }
}

// ============================================================================
// Public API
// ============================================================================

export async function searchHotels(
    params: HotelSearchParams,
    serpApiKey?: string,
    options?: SearchHotelsOptions
): Promise<HotelSearchResult> {
    void options;
    const apiKey = serpApiKey;
    return searchHotelsWithSerpApi(params, apiKey);
}
