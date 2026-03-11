/**
 * Specialized Agents - 专业Agent实现
 * 
 * 各专业Agent负责特定领域的任务执行
 * 支持真实API集成 (SerpApi, Amadeus)
 * 默认策略：实时证据优先，不输出估算票价
 */

import {
    AgentTask,
    AgentTaskResult,
    SpecializedAgentType
} from '../types.js';
import { getEnhancedDigitalAvatar } from './localStorageService.js';

type FlightSearchParams = Record<string, unknown>;

function getUserPreferences() {
    return {
        dining: {
            priceRange: 'mid' as const,
            cuisinePreferences: [] as string[],
            atmospherePreference: [] as string[],
        },
    };
}

async function searchFlights(_params: FlightSearchParams, _apiKey?: string, _options?: Record<string, unknown>): Promise<Record<string, any>> {
    return {
        success: false,
        error: 'flight_search_disabled_in_b_end_public_build',
        rankedFlights: [],
        dataSource: 'Disabled',
        realtime: false,
    };
}

async function searchHotelsFallback(
    _params?: Record<string, unknown>,
    _apiKey?: string,
    _options?: Record<string, unknown>
): Promise<Record<string, any>> {
    return {
        success: false,
        error: 'hotel_search_disabled_in_b_end_public_build',
        rankedHotels: [],
        dataSource: 'Disabled',
        realtime: false,
    };
}

type TravelPreferenceSnapshot = {
    priceVsQuality: number;
    stability: number;
    efficiency: number;
    chronotype: 'morning_person' | 'night_owl' | 'flexible';
    adventurousness: number;
    diningPriceRange: 'budget' | 'mid' | 'high' | 'luxury';
    cuisinePreferences: string[];
    atmospherePreference: string[];
    travelPace: 'relaxed' | 'balanced' | 'packed';
};

function normalizeDestinationLabel(destination?: string): string {
    if (!destination) return 'destination';
    const cleaned = destination.replace(/^(中国|中国大陆|中国地区)\s*/g, '').trim();
    return cleaned || destination;
}

function isTokyoDestination(destination: string): boolean {
    return /东京|tokyo/i.test(destination);
}

function isDalianDestination(destination: string): boolean {
    return /大连|dalian/i.test(destination);
}

function getTravelPreferences(): TravelPreferenceSnapshot {
    const avatar = getEnhancedDigitalAvatar();
    const userPrefs = getUserPreferences();
    const adventurousness = avatar.personality?.openness ?? 50;
    const multitasking = avatar.behaviorPatterns?.multitaskingTendency ?? 50;
    const travelPace: TravelPreferenceSnapshot['travelPace'] =
        multitasking > 65 ? 'packed' : multitasking < 40 ? 'relaxed' : 'balanced';

    return {
        priceVsQuality: avatar.valuesProfile?.priceVsQuality ?? 0,
        stability: avatar.valuesProfile?.stability ?? 50,
        efficiency: avatar.valuesProfile?.efficiency ?? 50,
        chronotype: avatar.behaviorPatterns?.chronotype ?? 'flexible',
        adventurousness,
        diningPriceRange: userPrefs.dining.priceRange,
        cuisinePreferences: userPrefs.dining.cuisinePreferences,
        atmospherePreference: userPrefs.dining.atmospherePreference,
        travelPace
    };
}

function parseDurationMinutes(duration?: string): number | null {
    if (!duration) return null;
    const hoursMatch = duration.match(/(\d+)\s*h/i);
    const minsMatch = duration.match(/(\d+)\s*m/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    const total = hours * 60 + mins;
    return Number.isFinite(total) && total > 0 ? total : null;
}

function parseHour(time?: string): number | null {
    if (!time) return null;
    const match = time.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hour = parseInt(match[1], 10);
    return Number.isFinite(hour) ? hour : null;
}

function normalizeDepartureTimePreference(value: any): FlightSearchParams['departureTimePreference'] | undefined {
    if (typeof value !== 'string') return undefined;
    const lower = value.toLowerCase();
    if (lower === 'morning' || /早上|上午|早班/.test(value)) return 'morning';
    if (lower === 'afternoon' || /下午/.test(value)) return 'afternoon';
    if (lower === 'evening' || /晚上|傍晚/.test(value)) return 'evening';
    if (lower === 'night' || /夜间|深夜/.test(value)) return 'night';
    return undefined;
}

function looksLikeSerpApiKey(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return /^[a-f0-9]{32,}$/i.test(trimmed);
}

function shiftTime(time?: string, offsetMinutes: number = 0): string | null {
    if (!time) return null;
    const match = time.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    const total = (hour * 60 + minute + offsetMinutes + 1440) % 1440;
    const newHour = Math.floor(total / 60);
    const newMinute = total % 60;
    return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
}

function normalizeScore(value: number, min: number, max: number, invert: boolean = false): number {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) {
        return 50;
    }
    const ratio = (value - min) / (max - min);
    const raw = invert ? (1 - ratio) : ratio;
    return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function scoreFlights(
    flights: any[],
    preferences: TravelPreferenceSnapshot
): { flights: any[]; weights: { price: number; duration: number; stops: number; time: number } } {
    const prices = flights.map(f => f.price).filter((p: number) => Number.isFinite(p));
    const durations = flights
        .map(f => parseDurationMinutes(f.duration))
        .filter((d): d is number => Number.isFinite(d));

    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const minDuration = durations.length ? Math.min(...durations) : 0;
    const maxDuration = durations.length ? Math.max(...durations) : 0;

    const priceWeight = Math.max(0.2, Math.min(0.8, 0.5 + (-preferences.priceVsQuality / 200)));
    const comfortWeight = 1 - priceWeight;
    const stabilityWeight = Math.max(0, Math.min(1, preferences.stability / 100));
    const efficiencyWeight = Math.max(0, Math.min(1, preferences.efficiency / 100));
    const stopWeight = 0.3 + 0.5 * stabilityWeight;
    const durationWeight = 1 - stopWeight;
    const timeWeightRaw = preferences.chronotype === 'flexible' ? 0.04 : 0.08;

    const rawWeights = {
        price: priceWeight,
        duration: comfortWeight * durationWeight,
        stops: comfortWeight * stopWeight,
        time: timeWeightRaw
    };
    const totalWeight = Object.values(rawWeights).reduce((sum, w) => sum + w, 0) || 1;
    const weights = {
        price: rawWeights.price / totalWeight,
        duration: rawWeights.duration / totalWeight,
        stops: rawWeights.stops / totalWeight,
        time: rawWeights.time / totalWeight
    };

    const scoredFlights = flights.map((flight) => {
        const priceScore = normalizeScore(flight.price, minPrice, maxPrice, true);
        const durationMinutes = parseDurationMinutes(flight.duration);
        const durationScore = durationMinutes !== null
            ? normalizeScore(durationMinutes, minDuration, maxDuration, true)
            : 50;
        const stopScore = flight.stops === 0 ? 100 : flight.stops === 1 ? 70 : 45;

        const baseTimeScore = 50;
        let timeScore = baseTimeScore;
        const departureHour = parseHour(flight.departure);
        if (departureHour !== null) {
            if (preferences.chronotype === 'night_owl' && departureHour >= 12) {
                timeScore = 90;
            } else if (preferences.chronotype === 'morning_person' && departureHour <= 10) {
                timeScore = 90;
            } else if (preferences.chronotype !== 'flexible') {
                timeScore = 40;
            }
        }

        let matchScore = priceScore * weights.price
            + durationScore * weights.duration
            + stopScore * weights.stops
            + timeScore * weights.time;

        const matchReasons: string[] = [];
        if (priceScore >= 80) matchReasons.push('Strong price advantage');
        if (stopScore >= 100) matchReasons.push('Nonstop is more convenient');
        if (durationScore >= 80) matchReasons.push('Shorter travel time');
        if (efficiencyWeight >= 0.7 && durationScore >= 70) matchReasons.push('Aligned with efficiency-first preference');

        if (departureHour !== null) {
            if (preferences.chronotype === 'night_owl' && departureHour >= 12) {
                matchReasons.push('Departure time fits a night-owl schedule');
            } else if (preferences.chronotype === 'morning_person' && departureHour <= 10) {
                matchReasons.push('Departure time fits an early-riser schedule');
            }
        }

        matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

        return {
            ...flight,
            matchScore,
            matchReasons,
            matchBreakdown: {
                priceScore,
                durationScore,
                stopScore,
                timeScore
            }
        };
    });

    return { flights: scoredFlights, weights };
}

function inferPriceLevel(priceRange?: string): 'budget' | 'mid' | 'high' | 'luxury' {
    if (!priceRange) return 'mid';
    const numbers = priceRange.replace(/[,¥$]/g, '').match(/\d+/g)?.map(n => parseInt(n, 10)) || [];
    const amount = numbers.length > 0 ? Math.max(...numbers) : 0;
    if (amount >= 15000) return 'luxury';
    if (amount >= 6000) return 'high';
    if (amount >= 2000) return 'mid';
    return 'budget';
}

function scoreHotels(hotels: any[], preferences: TravelPreferenceSnapshot): any[] {
    const prices = hotels.map(h => h.pricePerNight).filter((p: number) => Number.isFinite(p));
    const ratings = hotels.map(h => h.rating).filter((r: number) => Number.isFinite(r));
    const stars = hotels.map(h => h.star).filter((s: number) => Number.isFinite(s));

    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const minRating = ratings.length ? Math.min(...ratings) : 0;
    const maxRating = ratings.length ? Math.max(...ratings) : 5;
    const minStar = stars.length ? Math.min(...stars) : 3;
    const maxStar = stars.length ? Math.max(...stars) : 5;

    const priceWeight = Math.max(0.2, Math.min(0.8, 0.5 + (-preferences.priceVsQuality / 200)));
    const qualityWeight = 1 - priceWeight;
    const preferredLocation = preferences.stability > 60 ? 'city_center' : preferences.stability < 40 ? 'quiet' : 'balanced';

    return hotels.map((hotel) => {
        const priceScore = normalizeScore(hotel.pricePerNight, minPrice, maxPrice, true);
        const ratingScore = normalizeScore(hotel.rating, minRating, maxRating, false);
        const starScore = normalizeScore(hotel.star, minStar, maxStar, false);
        const qualityScore = ratingScore * 0.7 + starScore * 0.3;

        let matchScore = priceScore * priceWeight + qualityScore * qualityWeight;
        const matchReasons: string[] = [];

        if (priceScore >= 80 && preferences.priceVsQuality < 0) matchReasons.push('Better budget fit');
        if (qualityScore >= 80 && preferences.priceVsQuality >= 0) matchReasons.push('Strong rating and star quality');
        if (hotel.locationType && preferredLocation !== 'balanced' && hotel.locationType === preferredLocation) {
            matchScore += 6;
            matchReasons.push('Matches location preference');
        }
        if (hotel.amenities?.some((a: string) => /温泉|SPA|健身房|管家/.test(a))) {
            matchScore += 4;
            matchReasons.push('High-quality amenities');
        }

        matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

        return {
            ...hotel,
            matchScore,
            matchReasons
        };
    });
}

function scoreRestaurants(restaurants: any[], preferences: TravelPreferenceSnapshot): any[] {
    return restaurants.map((restaurant) => {
        let matchScore = 55;
        const matchReasons: string[] = [];
        const cuisine = restaurant.cuisine || restaurant.type || '';
        const priceLevel = inferPriceLevel(restaurant.priceRange);

        if (preferences.cuisinePreferences.some(pref => cuisine.includes(pref))) {
            matchScore += 20;
            matchReasons.push(`Cuisine preference match: ${preferences.cuisinePreferences[0]}`);
        }

        if (priceLevel === preferences.diningPriceRange) {
            matchScore += 15;
            matchReasons.push('Price range match');
        } else if (preferences.diningPriceRange === 'budget' && priceLevel !== 'budget') {
            matchScore -= 8;
        }

        if (restaurant.atmosphere && preferences.atmospherePreference.some(pref => restaurant.atmosphere.includes(pref))) {
            matchScore += 8;
            matchReasons.push('Atmosphere preference match');
        }

        if (restaurant.rating >= 4.7) {
            matchScore += 10;
            matchReasons.push('High user rating');
        }

        matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

        return {
            ...restaurant,
            matchScore,
            matchReasons
        };
    });
}

function parseRecommendHours(recommendTime?: string): number | null {
    if (!recommendTime) return null;
    if (recommendTime.includes('半天') || /half day/i.test(recommendTime)) return 4;
    const match = recommendTime.match(/(\d+)(?:-(\d+))?\s*(小时|hours?)/i);
    if (!match) return null;
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    return Math.round((start + end) / 2);
}

function scoreAttractions(attractions: any[], preferences: TravelPreferenceSnapshot, weatherHint?: string): any[] {
    const stylePreference = preferences.adventurousness > 65 ? 'offbeat'
        : preferences.adventurousness < 40 ? 'popular'
            : 'mixed';
    const prefersLowCrowd = preferences.stability > 60;
    const prefersPacked = preferences.travelPace === 'packed';

    return attractions.map((attraction) => {
        let matchScore = 55;
        const matchReasons: string[] = [];

        if (stylePreference === 'mixed' || attraction.style === stylePreference) {
            matchScore += 15;
            matchReasons.push(stylePreference === 'offbeat' ? 'Offbeat exploration match' : 'Popular destination fit');
        }

        if (prefersLowCrowd) {
            if (/^(low|低)$/i.test(String(attraction.crowdLevel || ''))) {
                matchScore += 8;
                matchReasons.push('Lower crowd level');
            } else {
                matchScore -= 6;
            }
        }

        const hours = parseRecommendHours(attraction.recommendTime);
        if (hours !== null) {
            if (prefersPacked && hours <= 3) {
                matchScore += 6;
                matchReasons.push('Fits a compact schedule');
            } else if (!prefersPacked && hours >= 3) {
                matchScore += 6;
                matchReasons.push('Fits a relaxed schedule');
            }
        }

        if (weatherHint && /(rain|snow|thunderstorm|雨|雪|雷暴)/i.test(weatherHint)) {
            if (attraction.indoor) {
                matchScore += 6;
                matchReasons.push('Better fit for poor weather');
            } else {
                matchScore -= 6;
            }
        }

        matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

        return {
            ...attraction,
            matchScore,
            matchReasons
        };
    });
}

function scoreTransportOptions(options: any[], preferences: TravelPreferenceSnapshot): any[] {
    const prefersBudget = preferences.priceVsQuality < -20;
    const prefersComfort = preferences.priceVsQuality > 20 || preferences.stability > 60;
    const prefersEfficiency = preferences.efficiency > 65;

    return options.map((option) => {
        let score = 60;
        const reasons: string[] = [];
        const mode = option.mode || '';

        if (/打车|网约车|Taxi|Express/i.test(mode)) {
            if (prefersComfort) {
                score += 20;
                reasons.push('Comfort-first option');
            }
        }
        if (/地铁|轻轨|地铁|Subway/i.test(mode)) {
            if (prefersEfficiency) {
                score += 15;
                reasons.push('More predictable travel time');
            }
            if (prefersBudget) {
                score += 8;
                reasons.push('Budget-friendly');
            }
        }
        if (/巴士|大巴|Bus/i.test(mode)) {
            if (prefersBudget) {
                score += 18;
                reasons.push('Lowest cost option');
            }
        }

        score = Math.max(0, Math.min(100, Math.round(score)));
        return {
            ...option,
            matchScore: score,
            matchReasons: reasons
        };
    }).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 专业Agent接口
 */
interface SpecializedAgentImpl {
    name: SpecializedAgentType;
    execute: (task: AgentTask, apiKey: string) => Promise<AgentTaskResult>;
}

// =============================================================================
// 机票Agent - 搜索和推荐航班 (Multi-Platform Price Comparison)
// =============================================================================

const flightBookingAgent: SpecializedAgentImpl = {
    name: 'flight_booking',
    execute: async (task, apiKey) => {
        console.log('[FlightBookingAgent] Starting real API search...');

        // Get parameters from task
        const destination = normalizeDestinationLabel(task.params.destination);
        const origin = normalizeDestinationLabel(task.params.origin);
        if (!task.params.destination) {
            return {
                success: false,
                data: { error: 'Missing destination' },
                suggestions: [],
                appliedFilters: task.appliedPreferences,
                source: 'Input'
            };
        }
        if (!task.params.origin) {
            return {
                success: false,
                data: { error: 'Missing origin' },
                suggestions: [],
                appliedFilters: task.appliedPreferences,
                source: 'Input'
            };
        }
        const preferences = getTravelPreferences();
        const preferredClass = preferences.priceVsQuality > 30 ? 'business' : 'economy';
        const flightClass = task.params.class || preferredClass;
        const departureTimePreference = normalizeDepartureTimePreference(
            task.params.departureTimePreference || task.params.departureTime
        );
        const timePriorityMode: FlightSearchParams['timePriorityMode'] = task.params.timePriorityMode === 'strict'
            ? 'strict'
            : 'prefer';

        // Calculate departure date (use provided date or default to 7 days from now)
        const now = new Date();
        let departureDateStr = task.params.departureDate;

        if (!departureDateStr) {
            const departureDate = new Date(now);
            departureDate.setDate(departureDate.getDate() + 7);
            const depYear = departureDate.getFullYear();
            const depMonth = String(departureDate.getMonth() + 1).padStart(2, '0');
            const depDay = String(departureDate.getDate()).padStart(2, '0');
            departureDateStr = `${depYear}-${depMonth}-${depDay}`;
        }

        // Prepare search params for real API
        const searchParams: FlightSearchParams = {
            origin,
            destination,
            departureDate: departureDateStr,
            travelClass: flightClass as 'economy' | 'business' | 'first',
            currency: typeof task.params.currency === 'string' && task.params.currency.trim()
                ? task.params.currency.trim().toUpperCase()
                : (/[\u4e00-\u9fa5]/.test(`${origin}${destination}`) ? 'CNY' : 'USD'),
            departureTimePreference,
            timePriorityMode,
        };

        console.log('[FlightBookingAgent] Search params:', searchParams);

        const serpApiKey = looksLikeSerpApiKey(apiKey) ? apiKey : undefined;

        try {
            // Call real flight search API (fail-closed realtime policy)
            const searchResult = await searchFlights(searchParams, serpApiKey, {
                requireLiveData: true,
                allowEstimatedFallback: false,
            });

            console.log('[FlightBookingAgent] Search result:', {
                success: searchResult.success,
                flightsCount: searchResult.flights.length,
                hasApiKey: !!serpApiKey,
                realtimeVerified: Boolean(searchResult.realtime?.verified),
            });

            const usingRealtimeVerified = Boolean(searchResult.realtime?.verified);
            if (!searchResult.success || !usingRealtimeVerified || searchResult.flights.length === 0) {
                const priceComparisonLinks: Record<string, { name: string; url: string; icon: string }> = {};
                searchResult.comparisonLinks.forEach(link => {
                    const key = link.name.toLowerCase().replace(/\s+/g, '');
                    priceComparisonLinks[key] = link;
                });

                return {
                    success: false,
                    data: {
                        origin,
                        destination,
                        departureDate: departureDateStr,
                        error: searchResult.error || 'No verifiable real-time flight evidence was found',
                        realtimeRequired: true,
                        realtimeStatus: searchResult.realtime || {
                            verified: false,
                            provider: 'none',
                            coverage_scope: 'none',
                        },
                        priceComparisonLinks,
                        nextAction: 'Retry real-time search later, or compare manually via multi-platform links.'
                    },
                    suggestions: [],
                    personalizedNote: `⚠️ No verifiable real-time fare found for ${origin} → ${destination}. Multi-platform links are provided for manual verification.`,
                    appliedFilters: task.appliedPreferences,
                    source: 'NoRealtimeEvidence'
                };
            }

            // Transform results to agent format
            const flights = searchResult.flights.map((f, idx) => ({
                id: f.id || `flight_${idx}`,
                airline: f.airline,
                flightNo: f.flightNumber,
                departure: typeof f.departure === 'object' ? f.departure.time : f.departure,
                arrival: typeof f.arrival === 'object' ? f.arrival.time : f.arrival,
                departureDate: departureDateStr,
                duration: f.duration,
                price: f.price,
                currency: f.currency,
                class: f.travelClass,
                stops: f.stops,
                stopover: f.stopover,
                aircraft: '',
                baggage: f.baggage || '1 x 23kg',
                source: f.source,
                bookingUrl: f.bookingUrl
            }));

            // Score and sort by personalized match
            const scoredResult = scoreFlights(flights, preferences);
            const scoredFlights = scoredResult.flights
                .sort((a, b) => b.matchScore - a.matchScore);
            const bestOption = scoredFlights[0];

            // Find lowest price
            const lowestPrice = searchResult.lowestPrice || (flights.length > 0 ? {
                price: Math.min(...flights.map(f => f.price)),
                airline: flights.reduce((min, f) => f.price < min.price ? f : min, flights[0]).airline,
                source: 'Compare prices'
            } : null);

            // Build comparison links from search result
            const priceComparisonLinks: Record<string, { name: string; url: string; icon: string }> = {};
            searchResult.comparisonLinks.forEach(link => {
                const key = link.name.toLowerCase().replace(/\s+/g, '');
                priceComparisonLinks[key] = link;
            });

            const priceValues = flights.map(f => f.price).filter((p) => Number.isFinite(p));
            const avgPrice = priceValues.length
                ? Math.round(priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length)
                : 0;
            const directCount = scoredFlights.filter(f => f.stops === 0).length;

            const realtimeProvider = searchResult.realtime?.provider || 'none';
            const dataSourceLabel = realtimeProvider === 'multi_aggregated'
                ? 'Realtime Multi-source (SerpApi + LiveSearch)'
                : realtimeProvider === 'live_search_grounding'
                    ? 'Live Search Grounding (Realtime)'
                    : 'SerpApi (Google Flights, Realtime)';

            return {
                success: true,
                data: {
                    origin,
                    destination,
                    departureDate: departureDateStr,
                    searchDate: now.toISOString(),
                    flights: scoredFlights,
                    bestOption,
                    globalOptimal: bestOption,
                    estimatedCost: scoredFlights[0]?.price || 0,
                    lowestPrice,
                    priceComparisonLinks,
                    comparisonSummary: {
                        averagePrice: avgPrice,
                        directCount,
                        totalOptions: scoredFlights.length,
                        platformsCovered: Object.keys(priceComparisonLinks).length,
                        realtimeVerified: true,
                        coverageScope: searchResult.realtime?.coverage_scope || 'single_provider',
                        preferenceWeights: scoredResult.weights,
                        chronotype: preferences.chronotype
                    },
                    globalOptimalReason: bestOption
                        ? (searchResult.realtime?.coverage_scope === 'multi_provider'
                            ? `Top-ranked by combined real-time multi-platform signals (match score ${bestOption.matchScore || 0}%)`
                            : `Best candidate from a single real-time source (match score ${bestOption.matchScore || 0}%). Use multi-platform links to validate global optimum.`)
                        : 'No ranked flights available. Continue comparison through external platforms.',
                    searchError: searchResult.error,
                    dataSource: dataSourceLabel,
                    realtimeStatus: searchResult.realtime
                },
                suggestions: scoredFlights,
                personalizedNote: `✅ Real-time results for ${origin} → ${destination} (${departureDateStr}) have been ranked by your preferences.`,
                appliedFilters: task.appliedPreferences,
                source: dataSourceLabel
            };
        } catch (error) {
            console.error('[FlightBookingAgent] API error:', error);

            // Return error result
            return {
                success: false,
                data: { error: error instanceof Error ? error.message : 'Search failed' },
                suggestions: [],
                appliedFilters: task.appliedPreferences,
                source: 'Error'
            };
        }
    }
};

// =============================================================================
// 酒店Agent - 搜索和推荐住宿 (Real-time via SerpApi Google Hotels)
// =============================================================================

const hotelBookingAgent: SpecializedAgentImpl = {
    name: 'hotel_booking',
    execute: async (task, apiKey) => {
        const destination = normalizeDestinationLabel(task.params.destination);
        const preferences = getTravelPreferences();
        const preferredStars = preferences.priceVsQuality > 30
            ? [5]
            : preferences.priceVsQuality < -20
                ? [3, 4]
                : [4, 5];
        const starLevel = task.params.starLevel || preferredStars;
        const location = task.params.location || 'city_center';

        // Calculate dates: default to tomorrow + 3 nights
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const checkOut = new Date(tomorrow);
        checkOut.setDate(checkOut.getDate() + (task.params.nights || 3));

        const checkInDate = task.params.checkInDate
            || tomorrow.toISOString().split('T')[0];
        const checkOutDate = task.params.checkOutDate
            || checkOut.toISOString().split('T')[0];

        console.log(`[HotelBookingAgent] Searching real hotels in ${destination} (${checkInDate} → ${checkOutDate})`);

        const resolvedSerpApiKey = looksLikeSerpApiKey(apiKey) ? apiKey : undefined;

        const searchResult = await searchHotelsFallback(
            {
                destination,
                checkInDate,
                checkOutDate,
                adults: task.params.adults || 2,
                currency: task.params.currency || 'CNY',
                starLevel,
            },
            resolvedSerpApiKey,
            { requireLiveData: true }
        );

        if (!searchResult.success || searchResult.hotels.length === 0) {
            console.warn('[HotelBookingAgent] No real hotel results, returning error with comparison links');
            return {
                success: false,
                data: {
                    destination,
                    hotels: [],
                    estimatedCost: 0,
                    comparisonLinks: searchResult.comparisonLinks,
                },
                suggestions: [],
                personalizedNote: searchResult.error || 'No real-time hotel results were found. Please use the links below for manual search.',
                appliedFilters: task.appliedPreferences,
            };
        }

        // Score with user preferences
        const scored = scoreHotels(searchResult.hotels, preferences);
        const sorted = scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

        // Calculate estimated total cost
        const nights = task.params.nights || 3;
        const estimatedCost = sorted.length > 0 ? sorted[0].pricePerNight * nights : 0;

        return {
            success: true,
            data: {
                destination,
                hotels: sorted,
                estimatedCost,
                comparisonLinks: searchResult.comparisonLinks,
                realtime: searchResult.realtime,
            },
            suggestions: sorted,
            personalizedNote: `Fetched ${sorted.length} real-time hotels from Google Hotels, filtered to ${starLevel.join('/')} stars with priority on ${location === 'city_center' ? 'city center' : 'quieter'} areas.`,
            appliedFilters: task.appliedPreferences,
        };
    }
};

// =============================================================================
// 餐厅Agent - 推荐美食
// =============================================================================

const restaurantAgent: SpecializedAgentImpl = {
    name: 'restaurant',
    execute: async (task, apiKey) => {
        const destination = normalizeDestinationLabel(task.params.destination);
        const preferences = getTravelPreferences();
        const cuisines = task.params.cuisines || preferences.cuisinePreferences || ['Local cuisine'];
        const priceLevel = task.params.priceLevel || preferences.diningPriceRange || 'mid';

        const restaurants = isTokyoDestination(destination)
            ? [
                {
                    id: 'rest_1',
                    name: 'Sushi Saito',
                    type: 'Sushi · Michelin 3-Star',
                    cuisine: 'Sushi',
                    atmosphere: ['Quiet', 'Refined', 'Counter experience'],
                    rating: 4.9,
                    reviewCount: 1280,
                    priceRange: '¥50,000+ / person',
                    address: 'Roppongi, Minato City, Tokyo',
                    highlights: ['Michelin 3-star', 'Limited seats', 'Premium ingredients'],
                    signature: ['Otoro nigiri', 'Uni hand roll', 'Seared lean tuna'],
                    photos: [
                        'https://images.unsplash.com/photo-1541542684-4a9c1f8f1a62?auto=format&fit=crop&w=900&q=60',
                        'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=60'
                    ],
                    menu: [
                        { name: 'Omakase course', price: '¥50,000+', note: 'Chef-curated' },
                        { name: 'Seasonal sashimi platter', price: '¥18,000', note: 'Varies by daily catch' }
                    ],
                    reviewHighlights: [
                        { author: 'Takumi', rating: 4.9, text: 'Every piece is meticulously crafted and the experience is exceptional.' },
                        { author: 'Lynn', rating: 4.8, text: 'Top-tier freshness and very comfortable service pacing.' }
                    ],
                    hours: '17:00-22:00',
                    reservation: 'Reserve about 3 months in advance',
                },
                {
                    id: 'rest_2',
                    name: 'Ichiran Ramen Shibuya',
                    type: 'Ramen',
                    cuisine: 'Ramen',
                    atmosphere: ['Lively', 'Late-night', 'Solo-friendly'],
                    rating: 4.6,
                    reviewCount: 8421,
                    priceRange: '¥1,000-2,000 / person',
                    address: 'Udagawacho, Shibuya, Tokyo',
                    highlights: ['Open 24 hours', 'Hakata tonkotsu', 'Fast turnover'],
                    signature: ['Classic tonkotsu ramen', 'Soft-boiled egg', 'Spicy secret sauce'],
                    photos: [
                        'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=60',
                        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=60'
                    ],
                    menu: [
                        { name: 'Classic tonkotsu ramen', price: '¥980', note: 'Customizable flavor profile' },
                        { name: 'Extra chashu', price: '¥350', note: 'Recommended add-on' }
                    ],
                    reviewHighlights: [
                        { author: 'Mika', rating: 4.6, text: 'Very consistent taste, perfect for late-night cravings.' },
                        { author: 'Chen', rating: 4.5, text: 'Queue is manageable and service is quick.' }
                    ],
                    hours: '24 hours',
                    reservation: 'No reservation required',
                },
                {
                    id: 'rest_3',
                    name: 'Tsukiji Outer Market',
                    type: 'Seafood Market',
                    cuisine: 'Seafood',
                    atmosphere: ['Lively', 'Market experience', 'Morning crowd'],
                    rating: 4.7,
                    reviewCount: 5630,
                    priceRange: '¥2,000-5,000 / person',
                    address: 'Tsukiji, Chuo City, Tokyo',
                    highlights: ['Fresh seafood', 'Many vendor options', 'Best in the morning'],
                    signature: ['Seafood rice bowl', 'Grilled oysters', 'Japanese omelet'],
                    photos: [
                        'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=900&q=60',
                        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=60'
                    ],
                    menu: [
                        { name: 'Seafood rice bowl', price: '¥2,800', note: 'Fresh-cut sashimi' },
                        { name: 'Char-grilled oysters', price: '¥800', note: 'Grilled to order' }
                    ],
                    reviewHighlights: [
                        { author: 'Leo', rating: 4.7, text: 'Great place to visit early with lots of choices.' },
                        { author: 'Nana', rating: 4.6, text: 'Seafood is very fresh, but go early to avoid heavy crowds.' }
                    ],
                    hours: '05:00-14:00',
                    reservation: 'No reservation required',
                }
            ]
            : isDalianDestination(destination)
                ? [
                    {
                        id: 'rest_dl_1',
                        name: 'Xinghai Square Seafood House',
                        type: 'Seafood · Local Favorite',
                        cuisine: 'Seafood',
                        atmosphere: ['Lively', 'Family dining', 'Coastal flavors'],
                        rating: 4.7,
                        reviewCount: 2160,
                        priceRange: '¥150-300 / person',
                        address: 'Xinghai Square, Shahekou District, Dalian',
                        highlights: ['Fresh seafood', 'Near Xinghai Square', 'Great for groups'],
                        signature: ['Steamed scallops', 'Garlic prawns', 'Sea cucumber with scallion oil'],
                        photos: [
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1541542684-4a9c1f8f1a62?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: 'Steamed scallops', price: '¥68', note: 'Sweet and tender' },
                            { name: 'Garlic prawns', price: '¥128', note: 'Rich garlic aroma' },
                            { name: 'Sea cucumber with scallion oil', price: '¥198', note: 'Soft and silky texture' }
                        ],
                        reviewHighlights: [
                            { author: 'SeaBreeze', rating: 4.8, text: 'Very fresh seafood and perfect for first-time visitors to Dalian.' },
                            { author: 'Xinxin', rating: 4.7, text: 'Warm service; the steamed and garlic dishes are highly recommended.' }
                        ],
                        hours: '11:00-22:00',
                        waitTime: '30-40 minutes at dinner peak',
                        reservation: 'Queue early for dinner',
                    },
                    {
                        id: 'rest_dl_2',
                        name: 'Zhongshan Square Grill House',
                        type: 'BBQ',
                        cuisine: 'BBQ',
                        atmosphere: ['Lively', 'Friends gathering', 'Street-food vibe'],
                        rating: 4.5,
                        reviewCount: 980,
                        priceRange: '¥80-150 / person',
                        address: 'Near Zhongshan Square, Zhongshan District, Dalian',
                        highlights: ['Local-style grilled platters', 'Unique dipping sauces', 'Fast service'],
                        signature: ['Hand-cut beef ribs', 'House lamb skewers', 'Dalian-style dipping sauce'],
                        photos: [
                            'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: 'Hand-cut beef ribs', price: '¥88', note: 'Best medium-rare' },
                            { name: 'House lamb skewer', price: '¥6 / skewer', note: 'Crisp outside, juicy inside' },
                            { name: 'Grilled squid', price: '¥28', note: 'Rich ocean flavor' }
                        ],
                        reviewHighlights: [
                            { author: 'Aze', rating: 4.6, text: 'Great meat quality, and the sauces feel very local.' },
                            { author: 'Jane', rating: 4.4, text: 'Great for group dinners with strong value for money.' }
                        ],
                        hours: '10:30-23:00',
                        waitTime: 'About 20 minutes at dinner peak',
                        reservation: 'No reservation required',
                    },
                    {
                        id: 'rest_dl_3',
                        name: 'Lushunkou Classic Northeast Kitchen',
                        type: 'Northeast Chinese',
                        cuisine: 'Northeast Chinese',
                        atmosphere: ['Comfortable', 'Home-style', 'Family dining'],
                        rating: 4.6,
                        reviewCount: 1260,
                        priceRange: '¥60-120 / person',
                        address: 'Lushunkou District, Dalian',
                        highlights: ['Great sweet-and-sour pork reputation', 'Generous portions', 'Excellent value'],
                        signature: ['Sweet-and-sour crispy pork', 'Di San Xian', 'Stewed chicken with mushrooms'],
                        photos: [
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: 'Sweet-and-sour crispy pork', price: '¥58', note: 'Crunchy with balanced sweet-sour flavor' },
                            { name: 'Di San Xian', price: '¥38', note: 'Classic home-style taste' },
                            { name: 'Stewed chicken with mushrooms', price: '¥68', note: 'Rich savory broth' }
                        ],
                        reviewHighlights: [
                            { author: 'Beibei', rating: 4.7, text: 'Large portions and very authentic sweet-and-sour pork.' },
                            { author: 'Cathy', rating: 4.5, text: 'Great for family meals, especially with older relatives.' }
                        ],
                        hours: '11:00-21:30',
                        waitTime: '10-15 minutes at weekend lunch',
                        reservation: 'No reservation required',
                    }
                ]
                : [
                    {
                        id: 'rest_generic_1',
                        name: `${destination} Signature Local Restaurant`,
                        type: 'Local Cuisine',
                        cuisine: 'Local cuisine',
                        atmosphere: ['Comfortable', 'First-time friendly', 'Consistent quality'],
                        rating: 4.6,
                        reviewCount: 880,
                        priceRange: '¥80-160 / person',
                        address: `${destination} city center`,
                        highlights: ['Consistent ratings', 'Easy access', 'Reliable service'],
                        signature: ['House signature dish', 'Local stir-fry special', 'Seasonal soup'],
                        photos: [
                            'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: 'House signature dish', price: '¥68', note: 'Must-try item' },
                            { name: 'Seasonal soup', price: '¥36', note: 'Updated daily' }
                        ],
                        reviewHighlights: [
                            { author: 'Kevin', rating: 4.6, text: 'Attentive service and consistently good dishes.' },
                            { author: 'Mia', rating: 4.5, text: 'Convenient location and great for first-time visitors.' }
                        ],
                        hours: '11:00-22:00',
                        waitTime: '10-20 minutes during peak hours',
                        reservation: 'No reservation required',
                    },
                    {
                        id: 'rest_generic_2',
                        name: `${destination} Flavor Bistro`,
                        type: 'Local Snacks',
                        cuisine: 'Snacks',
                        atmosphere: ['Lively', 'Street vibe', 'Fast service'],
                        rating: 4.4,
                        reviewCount: 650,
                        priceRange: '¥40-80 / person',
                        address: `${destination} old town`,
                        highlights: ['Great for local snacks', 'Affordable pricing', 'Quick turnaround'],
                        signature: ['Snack sampler platter', 'House noodle soup', 'Handmade dessert'],
                        photos: [
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: 'Snack sampler platter', price: '¥48', note: 'Great for sharing' },
                            { name: 'House noodle soup', price: '¥28', note: 'Comfort-food favorite' }
                        ],
                        reviewHighlights: [
                            { author: 'Xiao Tang', rating: 4.4, text: 'Authentic local vibe and very fair prices.' },
                            { author: 'Allen', rating: 4.3, text: 'Short queue and reliably good flavors.' }
                        ],
                        hours: '10:00-21:00',
                        waitTime: 'About 15 minutes at dinner peak',
                        reservation: 'No reservation required',
                    },
                    {
                        id: 'rest_generic_3',
                        name: `${destination} Seaview Restaurant`,
                        type: 'Seafood',
                        cuisine: 'Seafood',
                        atmosphere: ['Quiet', 'View seating', 'Group-friendly'],
                        rating: 4.5,
                        reviewCount: 720,
                        priceRange: '¥120-220 / person',
                        address: `${destination} waterfront district`,
                        highlights: ['Great scenic views', 'Ideal for groups', 'Comfortable environment'],
                        signature: ['Seafood platter', 'Steamed fish', 'Seasonal soup'],
                        photos: [
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1541542684-4a9c1f8f1a62?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: 'Seafood platter', price: '¥168', note: 'Good for sharing' },
                            { name: 'Steamed fish', price: '¥88', note: 'Fresh and tender texture' }
                        ],
                        reviewHighlights: [
                            { author: 'Rita', rating: 4.6, text: 'Great view and ideal for social gatherings.' },
                            { author: 'Han', rating: 4.5, text: 'Lighter seasoning with very fresh seafood.' }
                        ],
                        hours: '11:30-22:00',
                        waitTime: 'Window seats require advance booking',
                        reservation: 'Reserve ahead for dinner',
                    }
                ];

        const filtered = restaurants.filter(r => cuisines.some((c: string) => r.cuisine?.includes(c) || r.type?.includes(c)));
        const scored = scoreRestaurants(filtered.length > 0 ? filtered : restaurants, preferences);
        const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);

        return {
            success: true,
            data: {
                destination,
                restaurants: sorted,
                preferenceSummary: {
                    cuisines,
                    priceLevel
                }
            },
            suggestions: sorted,
            personalizedNote: `Recommended signature dining in ${destination}, filtered by your taste preferences.`,
            appliedFilters: task.appliedPreferences
        };
    }
};

// =============================================================================
// 景点Agent - 推荐旅游景点
// =============================================================================

const attractionAgent: SpecializedAgentImpl = {
    name: 'attraction',
    execute: async (task, apiKey) => {
        const destination = normalizeDestinationLabel(task.params.destination);
        const preferences = getTravelPreferences();
        const style = task.params.style || (preferences.adventurousness > 65 ? 'offbeat' : preferences.adventurousness < 40 ? 'popular' : 'mixed');
        const weatherHint = task.params.previousResults?.weather?.forecast?.[0]?.condition || '';

        const attractions = isTokyoDestination(destination)
            ? [
                {
                    id: 'attr_1',
                    name: 'Shimokitazawa',
                    type: 'Creative District',
                    style: 'offbeat',
                    indoor: false,
                    description: 'A highly distinctive Tokyo neighborhood known for vintage stores and indie cafes.',
                    highlights: ['Vintage shopping', 'Indie music', 'Hidden cafes'],
                    recommendTime: 'half day',
                    crowdLevel: 'low',
                },
                {
                    id: 'attr_2',
                    name: 'Yanaka Ginza',
                    type: 'Retro Shopping Street',
                    style: 'offbeat',
                    indoor: false,
                    description: 'A nostalgic old street with local shops and traditional snacks.',
                    highlights: ['Cat-themed corners', 'Crafts', 'Retro atmosphere'],
                    recommendTime: '3 hours',
                    crowdLevel: 'low',
                },
                {
                    id: 'attr_3',
                    name: 'teamLab Borderless',
                    type: 'Digital Art Museum',
                    style: 'popular',
                    indoor: true,
                    description: 'A world-famous immersive digital art space.',
                    highlights: ['Photo spots', 'Immersive experiences', 'Art installations'],
                    recommendTime: '3-4 hours',
                    crowdLevel: 'high',
                },
                {
                    id: 'attr_4',
                    name: 'Senso-ji Temple',
                    type: 'Historic Culture',
                    style: 'popular',
                    indoor: false,
                    description: 'Tokyo’s oldest temple and a strong introduction to traditional Japanese culture.',
                    highlights: ['Kaminarimon Gate', 'Nakamise Street', 'Kimono experience'],
                    recommendTime: '2-3 hours',
                    crowdLevel: 'high',
                }
            ]
            : isDalianDestination(destination)
                ? [
                    {
                        id: 'attr_dl_1',
                        name: 'Xinghai Square',
                        type: 'City Landmark',
                        style: 'popular',
                        indoor: false,
                        description: 'An iconic Dalian square with broad seaside views.',
                        highlights: ['Sea view', 'Night scenery', 'Walkable promenade'],
                        recommendTime: '2-3 hours',
                        crowdLevel: 'medium',
                    },
                    {
                        id: 'attr_dl_2',
                        name: 'Laohutan Ocean Park',
                        type: 'Ocean Park',
                        style: 'popular',
                        indoor: true,
                        description: 'A marine-themed park that works well for family trips.',
                        highlights: ['Aquarium', 'Shows', 'Family activities'],
                        recommendTime: 'half day',
                        crowdLevel: 'high',
                    },
                    {
                        id: 'attr_dl_3',
                        name: 'Bangchuidao Scenic Area',
                        type: 'Coastal Landscape',
                        style: 'offbeat',
                        indoor: false,
                        description: 'A mountain-and-sea retreat suitable for easy hiking.',
                        highlights: ['Coastline', 'Light hiking', 'Photography'],
                        recommendTime: 'half day',
                        crowdLevel: 'medium',
                    }
                ]
                : [
                    {
                        id: 'attr_generic_1',
                        name: `${destination} City Landmark`,
                        type: 'Landmark',
                        style: 'popular',
                        indoor: false,
                        description: 'A must-see checkpoint for first-time visitors.',
                        highlights: ['Photography', 'City skyline'],
                        recommendTime: '2 hours',
                        crowdLevel: 'medium',
                    },
                    {
                        id: 'attr_generic_2',
                        name: `${destination} Cultural Quarter`,
                        type: 'Neighborhood',
                        style: 'offbeat',
                        indoor: false,
                        description: 'A local district with characteristic shops and street scenes.',
                        highlights: ['Independent shops', 'Street photography'],
                        recommendTime: '2-3 hours',
                        crowdLevel: 'medium',
                    },
                    {
                        id: 'attr_generic_3',
                        name: `${destination} Museum`,
                        type: 'Indoor Venue',
                        style: 'popular',
                        indoor: true,
                        description: 'A top indoor option, especially in rainy weather.',
                        highlights: ['Indoor activity', 'Cultural experience'],
                        recommendTime: '2-3 hours',
                        crowdLevel: 'low',
                    }
                ];

        // 根据风格偏好排序
        const filtered = style === 'mixed'
            ? attractions
            : attractions.filter(a => a.style === style);
        const scored = scoreAttractions(filtered, preferences, weatherHint);
        const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);

        return {
            success: true,
            data: {
                destination,
                attractions: sorted
            },
            suggestions: sorted,
            personalizedNote: style === 'offbeat'
                ? 'Based on your offbeat exploration preference, here are hidden gems.'
                : weatherHint && /(rain|snow|thunderstorm|雨|雪|雷暴)/i.test(weatherHint)
                    ? 'Given the weather, indoor and rain-safe experiences are prioritized.'
                    : 'A balanced mix of popular spots and hidden gems is recommended.',
            appliedFilters: task.appliedPreferences
        };
    }
};

// =============================================================================
// 天气Agent - 使用 Open-Meteo 免费 API
// =============================================================================

// 城市坐标映射
const CITY_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
    '东京': { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
    'tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
    '大连': { lat: 38.9140, lon: 121.6147, name: 'Dalian' },
    'dalian': { lat: 38.9140, lon: 121.6147, name: 'Dalian' },
    '大阪': { lat: 34.6937, lon: 135.5023, name: 'Osaka' },
    'osaka': { lat: 34.6937, lon: 135.5023, name: 'Osaka' },
    '北京': { lat: 39.9042, lon: 116.4074, name: 'Beijing' },
    'beijing': { lat: 39.9042, lon: 116.4074, name: 'Beijing' },
    '上海': { lat: 31.2304, lon: 121.4737, name: 'Shanghai' },
    'shanghai': { lat: 31.2304, lon: 121.4737, name: 'Shanghai' },
    '伦敦': { lat: 51.5074, lon: -0.1278, name: 'London' },
    'london': { lat: 51.5074, lon: -0.1278, name: 'London' },
    '纽约': { lat: 40.7128, lon: -74.0060, name: 'New York' },
    'new york': { lat: 40.7128, lon: -74.0060, name: 'New York' },
    '巴黎': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
    'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
    '新加坡': { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
    'singapore': { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
    '香港': { lat: 22.3193, lon: 114.1694, name: 'Hong Kong' },
    'hong kong': { lat: 22.3193, lon: 114.1694, name: 'Hong Kong' },
    '首尔': { lat: 37.5665, lon: 126.9780, name: 'Seoul' },
    'seoul': { lat: 37.5665, lon: 126.9780, name: 'Seoul' },
    '曼谷': { lat: 13.7563, lon: 100.5018, name: 'Bangkok' },
    'bangkok': { lat: 13.7563, lon: 100.5018, name: 'Bangkok' },
    '悉尼': { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
    'sydney': { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
    '洛杉矶': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
    'los angeles': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
};

// Weather code to condition mapping
const getWeatherCondition = (code: number): { condition: string; icon: string } => {
    if (code === 0) return { condition: 'Clear', icon: '☀️' };
    if (code <= 3) return { condition: 'Partly Cloudy', icon: '⛅' };
    if (code <= 48) return { condition: 'Fog', icon: '🌫️' };
    if (code <= 57) return { condition: 'Drizzle', icon: '🌦️' };
    if (code <= 67) return { condition: 'Rain', icon: '🌧️' };
    if (code <= 77) return { condition: 'Snow', icon: '❄️' };
    if (code <= 82) return { condition: 'Showers', icon: '🌧️' };
    if (code <= 86) return { condition: 'Snow Showers', icon: '🌨️' };
    if (code <= 99) return { condition: 'Thunderstorm', icon: '⛈️' };
    return { condition: 'Unknown', icon: '❓' };
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeatherActionLinks(location: string, lat?: number, lon?: number): Array<{ title: string; url: string; provider: string }> {
    const links: Array<{ title: string; url: string; provider: string }> = [];
    const loc = String(location || '').trim();
    if (loc) {
        links.push({
            title: `${loc} weather`,
            url: `https://www.google.com/search?q=${encodeURIComponent(`${loc} weather`)}`,
            provider: 'google_weather',
        });
    }
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const latFixed = Number(lat).toFixed(4);
        const lonFixed = Number(lon).toFixed(4);
        links.push({
            title: 'Weather radar',
            url: `https://www.windy.com/${latFixed}/${lonFixed}?${latFixed},${lonFixed},7`,
            provider: 'windy',
        });
    }
    return links;
}

const weatherAgent: SpecializedAgentImpl = {
    name: 'weather',
    execute: async (task, apiKey) => {
        const destination = normalizeDestinationLabel(task.params.destination);
        console.log('[WeatherAgent] Fetching weather for:', destination);

        // Find city coordinates
        const cityKey = destination.toLowerCase();
        const cityInfo = CITY_COORDINATES[cityKey] || CITY_COORDINATES[destination];

        if (!cityInfo) {
            console.log('[WeatherAgent] City not found, using mock data');
            // Fallback to mock data for unknown cities
            return {
                success: true,
                data: {
                    location: destination,
                    locationCN: destination,
                    forecast: [
                        { day: 'Today', temp: '15-22°C', condition: 'Partly Cloudy', icon: '⛅' },
                        { day: 'Tomorrow', temp: '14-21°C', condition: 'Clear', icon: '☀️' },
                        { day: 'Day 3', temp: '13-20°C', condition: 'Clear', icon: '☀️' }
                    ],
                    tips: ['Add this city to coordinates mapping to enable real-time weather.'],
                    dataSource: 'Mock (city not in database)',
                    action_links: buildWeatherActionLinks(destination),
                },
                suggestions: [],
                personalizedNote: `${destination} weather forecast (mock data)`,
                appliedFilters: []
            };
        }

        try {
            // Call Open-Meteo API (free, no API key required)
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${cityInfo.lat}&longitude=${cityInfo.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`;

            console.log('[WeatherAgent] API URL:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('[WeatherAgent] API response:', data);

            // Transform API data to our format
            const forecast = data.daily.time.slice(0, 5).map((date: string, idx: number) => {
                const dateObj = new Date(date);
                const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : WEEKDAYS[dateObj.getDay()];
                const tempMin = Math.round(data.daily.temperature_2m_min[idx]);
                const tempMax = Math.round(data.daily.temperature_2m_max[idx]);
                const weatherCode = data.daily.weathercode[idx];
                const { condition, icon } = getWeatherCondition(weatherCode);

                return {
                    day: dayName,
                    date: date,
                    temp: `${tempMin}-${tempMax}°C`,
                    tempMin,
                    tempMax,
                    condition,
                    icon,
                    weatherCode
                };
            });

            // Generate weather tips
            const tips: string[] = [];
            const hasRain = forecast.some((f: any) => f.weatherCode >= 51 && f.weatherCode <= 67);
            const hasSnow = forecast.some((f: any) => f.weatherCode >= 70 && f.weatherCode <= 77);
            const coldDays = forecast.filter((f: any) => f.tempMin < 10).length;
            const hotDays = forecast.filter((f: any) => f.tempMax > 30).length;

            if (hasRain) tips.push('☔ Rain is expected during parts of the trip. Bring an umbrella.');
            if (hasSnow) tips.push('❄️ Snow may occur. Prepare warm and non-slip footwear.');
            if (coldDays >= 3) tips.push('🧥 Several days are cool. Bring a jacket.');
            if (hotDays >= 3) tips.push('🌡️ Several days are hot. Use sun protection and hydrate.');
            if (tips.length === 0) tips.push('✨ Weather looks favorable for travel.');

            return {
                success: true,
                data: {
                    location: cityInfo.name,
                    locationCN: destination,
                    coordinates: {
                        lat: cityInfo.lat,
                        lon: cityInfo.lon,
                    },
                    forecast,
                    tips,
                    dataSource: 'Open-Meteo API (Realtime)',
                    lastUpdated: new Date().toISOString(),
                    action_links: buildWeatherActionLinks(destination, cityInfo.lat, cityInfo.lon),
                },
                suggestions: forecast,
                personalizedNote: `✅ ${cityInfo.name} real-time weather forecast`,
                appliedFilters: []
            };
        } catch (error) {
            console.error('[WeatherAgent] API error:', error);

            // Fallback to mock data on error
            return {
                success: true,
                data: {
                    location: destination,
                    locationCN: destination,
                    forecast: [
                        { day: 'Today', temp: '15-22°C', condition: 'Partly Cloudy', icon: '⛅' },
                        { day: 'Tomorrow', temp: '14-21°C', condition: 'Clear', icon: '☀️' },
                        { day: 'Day 3', temp: '16-23°C', condition: 'Clear', icon: '☀️' }
                    ],
                    tips: ['Weather fetch failed. Showing estimated data instead.'],
                    dataSource: 'Mock (API error)',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action_links: buildWeatherActionLinks(destination),
                },
                suggestions: [],
                personalizedNote: `${destination} weather forecast (estimated)`,
                appliedFilters: []
            };
        }
    }
};

// =============================================================================
// 行程规划Agent
// =============================================================================

const itineraryAgent: SpecializedAgentImpl = {
    name: 'itinerary',
    execute: async (task, apiKey) => {
        const destination = normalizeDestinationLabel(task.params.destination);
        const previousResults = task.params.previousResults || {};
        const preferences = getTravelPreferences();
        const pace = preferences.travelPace;

        const hotel = previousResults.hotel_booking?.hotels?.[0];
        const restaurants = previousResults.restaurant?.restaurants || [];
        const attractions = previousResults.attraction?.attractions || [];
        const weatherHint = previousResults.weather?.forecast?.[0]?.condition || '';

        const topRestaurant = restaurants[0];
        const topAttraction = attractions[0];
        const indoorAttraction = attractions.find((a: any) => a.indoor);

        const activitySlots = pace === 'packed' ? 3 : pace === 'relaxed' ? 2 : 2;
        const afternoonAttraction = weatherHint && /(rain|snow|thunderstorm|雨|雪|雷暴)/i.test(weatherHint) && indoorAttraction
            ? indoorAttraction
            : topAttraction;

        // Build itinerary based on previous agent results
        const itinerary = {
            summary: `${destination} 5-day itinerary`,
            days: [
                {
                    day: 1,
                    title: 'Arrival and Exploration',
                    activities: [
                        { time: 'Afternoon', activity: `Arrive at the airport and check in at ${hotel?.name || 'your hotel'}`, location: hotel?.location || 'Hotel' },
                        { time: 'Evening', activity: topAttraction?.name ? `Light walk around ${topAttraction.name}` : 'Gentle city acclimation walk', location: topAttraction?.name || destination },
                        ...(activitySlots >= 3 ? [{ time: 'Night', activity: topRestaurant?.name ? `Dinner at ${topRestaurant.name}` : 'Local signature dinner', location: topRestaurant?.address || destination }] : [])
                    ].slice(0, activitySlots)
                },
                {
                    day: 2,
                    title: 'Culture Day',
                    activities: [
                        { time: 'Morning', activity: 'City culture experience', location: destination },
                        { time: 'Noon', activity: topRestaurant?.name ? `Lunch at ${topRestaurant.name}` : 'Lunch at a popular local restaurant', location: topRestaurant?.address || destination },
                        { time: 'Afternoon', activity: afternoonAttraction?.name ? `In-depth visit to ${afternoonAttraction.name}` : 'Featured attraction experience', location: afternoonAttraction?.name || destination }
                    ].slice(0, activitySlots)
                },
                {
                    day: 3,
                    title: 'Offbeat Discovery Day',
                    activities: [
                        { time: 'Morning', activity: attractions[1]?.name ? `Explore ${attractions[1].name}` : 'Explore an offbeat district', location: attractions[1]?.name || destination },
                        { time: 'Afternoon', activity: attractions[2]?.name ? `Experience ${attractions[2].name}` : 'Free exploration time', location: attractions[2]?.name || destination },
                        ...(activitySlots >= 3 ? [{ time: 'Night', activity: restaurants[1]?.name ? `Dinner at ${restaurants[1].name}` : 'Night food exploration', location: restaurants[1]?.address || destination }] : [])
                    ].slice(0, activitySlots)
                }
            ]
        };

        return {
            success: true,
            data: itinerary,
            suggestions: itinerary.days,
            personalizedNote: `Itinerary tailored to your pace preference (${pace === 'packed' ? 'packed' : pace === 'relaxed' ? 'relaxed' : 'balanced'}).`,
            appliedFilters: []
        };
    }
};

// =============================================================================
// 交通Agent - 接送机与市内交通建议
// =============================================================================

const transportationAgent: SpecializedAgentImpl = {
    name: 'transportation',
    execute: async (task, apiKey) => {
        const origin = task.params.origin || 'origin';
        const destination = task.params.destination || 'destination';
        const preferences = getTravelPreferences();
        const previousFlights = task.params.previousResults?.flight_booking;
        const bestFlight = previousFlights?.bestOption || previousFlights?.flights?.[0];
        const departureTime = bestFlight?.departure;
        const arrivalTime = bestFlight?.arrival;
        const bufferMinutes = 150;
        const leaveTime = shiftTime(departureTime, -bufferMinutes);

        const isLondon = /伦敦|london/i.test(origin);
        const isDalian = /大连|dalian/i.test(destination);

        const toAirport = isLondon
            ? [
                { mode: 'Heathrow Express', duration: '15-20 min', cost: '£25', note: 'Fastest option' },
                { mode: 'London Underground', duration: '45-60 min', cost: '£6', note: 'Best value' },
                { mode: 'Taxi/Ride-hailing', duration: '40-60 min', cost: '£45-70', note: 'Most convenient' }
            ]
            : [
                { mode: 'Airport bus', duration: '40-70 min', cost: '¥20-40', note: 'Budget-friendly' },
                { mode: 'Metro/Light rail', duration: '35-60 min', cost: '¥5-15', note: 'Reliable timing' },
                { mode: 'Taxi/Ride-hailing', duration: '30-50 min', cost: '¥60-120', note: 'Door-to-door convenience' }
            ];

        const fromAirport = isDalian
            ? [
                { mode: 'Airport shuttle bus', duration: '30-50 min', cost: '¥20', note: 'City-wide coverage' },
                { mode: 'Taxi/Ride-hailing', duration: '25-40 min', cost: '¥60-90', note: 'Quick and convenient' },
                { mode: 'Metro', duration: '40-55 min', cost: '¥5-10', note: 'Stable during peak traffic' }
            ]
            : [
                { mode: 'Airport bus', duration: '30-60 min', cost: '¥20-40', note: 'Covers key districts' },
                { mode: 'Taxi/Ride-hailing', duration: '25-45 min', cost: '¥70-120', note: 'Direct transfer' },
                { mode: 'Metro/Light rail', duration: '35-55 min', cost: '¥6-15', note: 'Predictable travel time' }
            ];

        const scoredToAirport = scoreTransportOptions(toAirport, preferences);
        const scoredFromAirport = scoreTransportOptions(fromAirport, preferences);

        const tips = [
            'For international flights, arrive at the airport 2.5-3 hours before departure.',
            'Add 20-30 minutes of ground traffic buffer during peak periods.'
        ];

        return {
            success: true,
            data: {
                origin,
                destination,
                departureTime,
                arrivalTime,
                recommendedLeaveTime: leaveTime ? `Recommended departure before ${leaveTime}` : 'Plan to arrive at the airport at least 2.5 hours early',
                toAirport: scoredToAirport,
                fromAirport: scoredFromAirport,
                tips
            },
            suggestions: [...scoredToAirport, ...scoredFromAirport],
            personalizedNote: leaveTime
                ? `Based on your flight time, depart for the airport before ${leaveTime}.`
                : 'Airport transfer and local transport options are prepared.',
            appliedFilters: task.appliedPreferences
        };
    }
};

// =============================================================================
// Agent 注册表
// =============================================================================

export const SPECIALIZED_AGENTS: Record<SpecializedAgentType, SpecializedAgentImpl> = {
    'flight_booking': flightBookingAgent,
    'hotel_booking': hotelBookingAgent,
    'restaurant': restaurantAgent,
    'attraction': attractionAgent,
    'weather': weatherAgent,
    'itinerary': itineraryAgent,
    'transportation': transportationAgent,
    'shopping': {
        name: 'shopping',
        execute: async () => ({ success: true, data: {}, suggestions: [], appliedFilters: [] })
    },
    'social_search': {
        name: 'social_search',
        execute: async () => ({ success: true, data: {}, suggestions: [], appliedFilters: [] })
    },
    'translation': {
        name: 'translation',
        execute: async () => ({ success: true, data: {}, suggestions: [], appliedFilters: [] })
    }
};

type SpecializedRuntimeStat = {
    invocations: number;
    success_count: number;
    failure_count: number;
    total_latency_ms: number;
    last_updated_at: number;
};

const specializedRuntimeStats = new Map<SpecializedAgentType, SpecializedRuntimeStat>();

function recordSpecializedRuntimeStats(agentType: SpecializedAgentType, success: boolean, latencyMs: number): void {
    const prev = specializedRuntimeStats.get(agentType) || {
        invocations: 0,
        success_count: 0,
        failure_count: 0,
        total_latency_ms: 0,
        last_updated_at: Date.now(),
    };

    prev.invocations += 1;
    if (success) {
        prev.success_count += 1;
    } else {
        prev.failure_count += 1;
    }
    prev.total_latency_ms += Math.max(0, latencyMs);
    prev.last_updated_at = Date.now();
    specializedRuntimeStats.set(agentType, prev);
}

export function getSpecializedAgentRuntimeStats(agentType: SpecializedAgentType): {
    invocations: number;
    success_count: number;
    failure_count: number;
    avg_latency_ms: number;
    success_rate: number;
    last_updated_at: number;
} | undefined {
    const stat = specializedRuntimeStats.get(agentType);
    if (!stat || stat.invocations === 0) return undefined;
    return {
        invocations: stat.invocations,
        success_count: stat.success_count,
        failure_count: stat.failure_count,
        avg_latency_ms: Math.round(stat.total_latency_ms / stat.invocations),
        success_rate: Number((stat.success_count / stat.invocations).toFixed(4)),
        last_updated_at: stat.last_updated_at,
    };
}

/**
 * 执行专业Agent
 */
export async function executeSpecializedAgent(
    task: AgentTask,
    apiKey: string
): Promise<AgentTaskResult> {
    const start = Date.now();
    const agent = SPECIALIZED_AGENTS[task.agentType];
    if (!agent) {
        recordSpecializedRuntimeStats(task.agentType, false, Date.now() - start);
        return {
            success: false,
            data: null,
            suggestions: [],
            appliedFilters: [],
            source: 'unknown'
        };
    }

    try {
        const result = await agent.execute(task, apiKey);
        recordSpecializedRuntimeStats(task.agentType, result?.success !== false, Date.now() - start);
        return result;
    } catch (error) {
        recordSpecializedRuntimeStats(task.agentType, false, Date.now() - start);
        throw error;
    }
}
