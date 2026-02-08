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
} from '../types';
import { searchFlights, FlightSearchParams } from './flightSearchService';
import { getEnhancedDigitalAvatar } from './localStorageService';
import { getUserPreferences } from './personalizationService';

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
    if (!destination) return '目的地';
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
        if (priceScore >= 80) matchReasons.push('价格优势明显');
        if (stopScore >= 100) matchReasons.push('直飞更省心');
        if (durationScore >= 80) matchReasons.push('航程更短');
        if (efficiencyWeight >= 0.7 && durationScore >= 70) matchReasons.push('效率优先匹配');

        if (departureHour !== null) {
            if (preferences.chronotype === 'night_owl' && departureHour >= 12) {
                matchReasons.push('出发时间更符合晚睡习惯');
            } else if (preferences.chronotype === 'morning_person' && departureHour <= 10) {
                matchReasons.push('出发时间更符合早起习惯');
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

        if (priceScore >= 80 && preferences.priceVsQuality < 0) matchReasons.push('更符合预算');
        if (qualityScore >= 80 && preferences.priceVsQuality >= 0) matchReasons.push('口碑与星级优秀');
        if (hotel.locationType && preferredLocation !== 'balanced' && hotel.locationType === preferredLocation) {
            matchScore += 6;
            matchReasons.push('位置偏好匹配');
        }
        if (hotel.amenities?.some((a: string) => /温泉|SPA|健身房|管家/.test(a))) {
            matchScore += 4;
            matchReasons.push('设施品质突出');
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
            matchReasons.push(`符合口味偏好：${preferences.cuisinePreferences[0]}`);
        }

        if (priceLevel === preferences.diningPriceRange) {
            matchScore += 15;
            matchReasons.push('价格区间匹配');
        } else if (preferences.diningPriceRange === 'budget' && priceLevel !== 'budget') {
            matchScore -= 8;
        }

        if (restaurant.atmosphere && preferences.atmospherePreference.some(pref => restaurant.atmosphere.includes(pref))) {
            matchScore += 8;
            matchReasons.push('氛围贴合偏好');
        }

        if (restaurant.rating >= 4.7) {
            matchScore += 10;
            matchReasons.push('高评分口碑');
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
    if (recommendTime.includes('半天')) return 4;
    const match = recommendTime.match(/(\d+)(?:-(\d+))?小时/);
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
            matchReasons.push(stylePreference === 'offbeat' ? '偏好小众体验' : '热门选择');
        }

        if (prefersLowCrowd) {
            if (attraction.crowdLevel === '低') {
                matchScore += 8;
                matchReasons.push('人流舒适');
            } else {
                matchScore -= 6;
            }
        }

        const hours = parseRecommendHours(attraction.recommendTime);
        if (hours !== null) {
            if (prefersPacked && hours <= 3) {
                matchScore += 6;
                matchReasons.push('节奏紧凑');
            } else if (!prefersPacked && hours >= 3) {
                matchScore += 6;
                matchReasons.push('节奏从容');
            }
        }

        if (weatherHint && /雨|雪|雷暴/.test(weatherHint)) {
            if (attraction.indoor) {
                matchScore += 6;
                matchReasons.push('天气不佳时更合适');
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
                reasons.push('舒适省心');
            }
        }
        if (/地铁|轻轨|地铁|Subway/i.test(mode)) {
            if (prefersEfficiency) {
                score += 15;
                reasons.push('时间稳定');
            }
            if (prefersBudget) {
                score += 8;
                reasons.push('预算友好');
            }
        }
        if (/巴士|大巴|Bus/i.test(mode)) {
            if (prefersBudget) {
                score += 18;
                reasons.push('最省钱');
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
                data: { error: '缺少目的地' },
                suggestions: [],
                appliedFilters: task.appliedPreferences,
                source: 'Input'
            };
        }
        if (!task.params.origin) {
            return {
                success: false,
                data: { error: '缺少出发地' },
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
            currency: /[\u4e00-\u9fa5]/.test(`${origin}${destination}`) ? 'CNY' : 'USD',
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
                        error: searchResult.error || '未获取到可验证的实时航班证据',
                        realtimeRequired: true,
                        realtimeStatus: searchResult.realtime || {
                            verified: false,
                            provider: 'none',
                            coverage_scope: 'none',
                        },
                        priceComparisonLinks,
                        nextAction: '请稍后重试实时搜索，或通过多平台入口手动筛选并比价。'
                    },
                    suggestions: [],
                    personalizedNote: `⚠️ 当前未获取到 ${origin} → ${destination} 的可验证实时票价，已返回多平台入口用于人工复核`,
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
                    ? 'Live Search Grounding (实时)'
                    : 'SerpApi (Google Flights, 实时)';

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
                            ? `基于多平台实时数据综合评分最高（匹配度 ${bestOption.matchScore || 0}%）`
                            : `当前为单一实时源的最优候选（匹配度 ${bestOption.matchScore || 0}%），建议结合多平台入口复核全局最优`)
                        : '暂无可排序航班，建议使用外部平台继续比价',
                    searchError: searchResult.error,
                    dataSource: dataSourceLabel,
                    realtimeStatus: searchResult.realtime
                },
                suggestions: scoredFlights,
                personalizedNote: `✅ 实时搜索 ${origin} → ${destination} (${departureDateStr})，已按偏好排序`,
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
        const { searchHotels } = await import('./hotelSearchService');
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

        const searchResult = await searchHotels(
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
                personalizedNote: searchResult.error || '未找到实时酒店数据，请通过以下链接手动搜索',
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
            personalizedNote: `已从 Google Hotels 获取 ${sorted.length} 家实时酒店数据，筛选${starLevel.join('/')}星级，优先${location === 'city_center' ? '市中心' : '安静'}位置`,
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
        const cuisines = task.params.cuisines || preferences.cuisinePreferences || ['当地菜'];
        const priceLevel = task.params.priceLevel || preferences.diningPriceRange || 'mid';

        const restaurants = isTokyoDestination(destination)
            ? [
                {
                    id: 'rest_1',
                    name: '鮨 さいとう',
                    type: '寿司 · 米其林三星',
                    cuisine: '寿司',
                    atmosphere: ['安静', '精致', '吧台体验'],
                    rating: 4.9,
                    reviewCount: 1280,
                    priceRange: '¥50,000+/人',
                    address: '东京都港区六本木',
                    highlights: ['米其林三星', '座位稀少', '食材讲究'],
                    signature: ['大腹握', '海胆手卷', '赤身炙烧'],
                    photos: [
                        'https://images.unsplash.com/photo-1541542684-4a9c1f8f1a62?auto=format&fit=crop&w=900&q=60',
                        'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=60'
                    ],
                    menu: [
                        { name: 'Omakase 套餐', price: '¥50,000+', note: '主厨定制' },
                        { name: '季节刺身拼盘', price: '¥18,000', note: '视当日食材' }
                    ],
                    reviewHighlights: [
                        { author: 'Takumi', rating: 4.9, text: '每一贯的细节都很讲究，体验感拉满。' },
                        { author: 'Lynn', rating: 4.8, text: '食材新鲜度极高，服务节奏舒适。' }
                    ],
                    hours: '17:00-22:00',
                    reservation: '需提前3个月预约',
                },
                {
                    id: 'rest_2',
                    name: '一兰拉面 涩谷店',
                    type: '拉面',
                    cuisine: '拉面',
                    atmosphere: ['热闹', '深夜食堂', '一人友好'],
                    rating: 4.6,
                    reviewCount: 8421,
                    priceRange: '¥1,000-2,000/人',
                    address: '东京都涩谷区宇田川町',
                    highlights: ['24小时营业', '博多豚骨', '翻台快'],
                    signature: ['经典豚骨拉面', '溏心蛋', '辣味秘制酱'],
                    photos: [
                        'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=60',
                        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=60'
                    ],
                    menu: [
                        { name: '经典豚骨拉面', price: '¥980', note: '口味可定制' },
                        { name: '叉烧加量', price: '¥350', note: '推荐搭配' }
                    ],
                    reviewHighlights: [
                        { author: 'Mika', rating: 4.6, text: '口味稳定，深夜来一碗很满足。' },
                        { author: 'Chen', rating: 4.5, text: '排队不算久，出餐速度快。' }
                    ],
                    hours: '24小时',
                    reservation: '无需预约',
                },
                {
                    id: 'rest_3',
                    name: '筑地场外市场',
                    type: '海鲜市场',
                    cuisine: '海鲜',
                    atmosphere: ['热闹', '市集体验', '早市'],
                    rating: 4.7,
                    reviewCount: 5630,
                    priceRange: '¥2,000-5,000/人',
                    address: '东京都中央区筑地',
                    highlights: ['现捞海鲜', '摊位选择多', '适合早逛'],
                    signature: ['海鲜丼', '牡蛎烧', '玉子烧'],
                    photos: [
                        'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=900&q=60',
                        'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=60'
                    ],
                    menu: [
                        { name: '海鲜丼', price: '¥2,800', note: '现切刺身' },
                        { name: '炭烤牡蛎', price: '¥800', note: '现烤现吃' }
                    ],
                    reviewHighlights: [
                        { author: 'Leo', rating: 4.7, text: '适合早上来逛，选择丰富。' },
                        { author: 'Nana', rating: 4.6, text: '海鲜很新鲜，但人多要早点去。' }
                    ],
                    hours: '05:00-14:00',
                    reservation: '无需预约',
                }
            ]
            : isDalianDestination(destination)
                ? [
                    {
                        id: 'rest_dl_1',
                        name: '星海广场海鲜酒楼',
                        type: '海鲜 · 本地人气',
                        cuisine: '海鲜',
                        atmosphere: ['热闹', '家庭聚餐', '海边风味'],
                        rating: 4.7,
                        reviewCount: 2160,
                        priceRange: '¥150-300/人',
                        address: '大连市沙河口区星海广场',
                        highlights: ['现捞海鲜', '靠近星海广场', '适合多人聚餐'],
                        signature: ['清蒸扇贝', '蒜蓉大虾', '葱油海参'],
                        photos: [
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1541542684-4a9c1f8f1a62?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: '清蒸扇贝', price: '¥68', note: '鲜甜弹牙' },
                            { name: '蒜蓉大虾', price: '¥128', note: '蒜香浓郁' },
                            { name: '葱油海参', price: '¥198', note: '口感软糯' }
                        ],
                        reviewHighlights: [
                            { author: '海风', rating: 4.8, text: '海鲜非常新鲜，适合第一次来大连。' },
                            { author: '欣欣', rating: 4.7, text: '服务热情，推荐点清蒸和蒜蓉系列。' }
                        ],
                        hours: '11:00-22:00',
                        waitTime: '晚高峰排队30-40分钟',
                        reservation: '建议晚餐提前排队',
                    },
                    {
                        id: 'rest_dl_2',
                        name: '中山广场烤肉馆',
                        type: '烧烤',
                        cuisine: '烧烤',
                        atmosphere: ['热闹', '朋友聚会', '烟火气'],
                        rating: 4.5,
                        reviewCount: 980,
                        priceRange: '¥80-150/人',
                        address: '大连市中山区中山广场附近',
                        highlights: ['本地风味烤肉拼盘', '蘸料独特', '翻台快'],
                        signature: ['原切牛肋条', '秘制羊肉串', '大连特色蘸料'],
                        photos: [
                            'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: '原切牛肋条', price: '¥88', note: '推荐三分熟' },
                            { name: '秘制羊肉串', price: '¥6/串', note: '外焦里嫩' },
                            { name: '烤鱿鱼', price: '¥28', note: '海味十足' }
                        ],
                        reviewHighlights: [
                            { author: '阿泽', rating: 4.6, text: '肉质不错，蘸料很有大连味道。' },
                            { author: 'Jane', rating: 4.4, text: '适合朋友聚会，性价比高。' }
                        ],
                        hours: '10:30-23:00',
                        waitTime: '晚餐时段排队20分钟左右',
                        reservation: '无需预约',
                    },
                    {
                        id: 'rest_dl_3',
                        name: '旅顺口老味道馆',
                        type: '东北菜',
                        cuisine: '东北菜',
                        atmosphere: ['舒适', '家常', '家庭聚餐'],
                        rating: 4.6,
                        reviewCount: 1260,
                        priceRange: '¥60-120/人',
                        address: '大连市旅顺口区',
                        highlights: ['锅包肉口碑好', '份量足', '性价比高'],
                        signature: ['锅包肉', '地三鲜', '小鸡炖蘑菇'],
                        photos: [
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: '锅包肉', price: '¥58', note: '酸甜酥脆' },
                            { name: '地三鲜', price: '¥38', note: '家常口味' },
                            { name: '小鸡炖蘑菇', price: '¥68', note: '汤汁浓郁' }
                        ],
                        reviewHighlights: [
                            { author: '北北', rating: 4.7, text: '菜量很足，锅包肉很地道。' },
                            { author: 'Cathy', rating: 4.5, text: '适合带长辈来吃，味道不重。' }
                        ],
                        hours: '11:00-21:30',
                        waitTime: '周末中午排队10-15分钟',
                        reservation: '无需预约',
                    }
                ]
                : [
                    {
                        id: 'rest_generic_1',
                        name: `${destination}本地招牌餐厅`,
                        type: '当地菜',
                        cuisine: '当地菜',
                        atmosphere: ['舒适', '初次到访', '口碑稳定'],
                        rating: 4.6,
                        reviewCount: 880,
                        priceRange: '¥80-160/人',
                        address: `${destination}市中心`,
                        highlights: ['口碑稳定', '交通方便', '服务到位'],
                        signature: ['招牌菜A', '当地特色小炒', '时令汤'],
                        photos: [
                            'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: '招牌菜A', price: '¥68', note: '到店必点' },
                            { name: '时令汤品', price: '¥36', note: '每日更新' }
                        ],
                        reviewHighlights: [
                            { author: 'Kevin', rating: 4.6, text: '服务细致，菜品稳定。' },
                            { author: 'Mia', rating: 4.5, text: '位置方便，适合第一次来。' }
                        ],
                        hours: '11:00-22:00',
                        waitTime: '高峰期排队10-20分钟',
                        reservation: '无需预约',
                    },
                    {
                        id: 'rest_generic_2',
                        name: `${destination}风味小馆`,
                        type: '特色小吃',
                        cuisine: '小吃',
                        atmosphere: ['热闹', '街头氛围', '快速出餐'],
                        rating: 4.4,
                        reviewCount: 650,
                        priceRange: '¥40-80/人',
                        address: `${destination}老街区`,
                        highlights: ['适合尝试当地小吃', '价格亲民', '出餐快'],
                        signature: ['特色小吃拼盘', '招牌汤粉', '手工甜品'],
                        photos: [
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: '特色小吃拼盘', price: '¥48', note: '多人分享' },
                            { name: '招牌汤粉', price: '¥28', note: '暖胃推荐' }
                        ],
                        reviewHighlights: [
                            { author: '小唐', rating: 4.4, text: '很有当地烟火气，价格实惠。' },
                            { author: 'Allen', rating: 4.3, text: '排队不久，味道不错。' }
                        ],
                        hours: '10:00-21:00',
                        waitTime: '晚餐高峰排队15分钟',
                        reservation: '无需预约',
                    },
                    {
                        id: 'rest_generic_3',
                        name: `${destination}海景餐厅`,
                        type: '海鲜',
                        cuisine: '海鲜',
                        atmosphere: ['安静', '景观位', '适合聚餐'],
                        rating: 4.5,
                        reviewCount: 720,
                        priceRange: '¥120-220/人',
                        address: `${destination}滨海区域`,
                        highlights: ['景观位置佳', '适合聚餐', '环境舒适'],
                        signature: ['海鲜拼盘', '清蒸鱼', '时令汤'],
                        photos: [
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
                            'https://images.unsplash.com/photo-1541542684-4a9c1f8f1a62?auto=format&fit=crop&w=900&q=60'
                        ],
                        menu: [
                            { name: '海鲜拼盘', price: '¥168', note: '适合多人' },
                            { name: '清蒸鱼', price: '¥88', note: '口感鲜嫩' }
                        ],
                        reviewHighlights: [
                            { author: 'Rita', rating: 4.6, text: '景色不错，适合聚会。' },
                            { author: 'Han', rating: 4.5, text: '味道偏清淡，海鲜新鲜。' }
                        ],
                        hours: '11:30-22:00',
                        waitTime: '靠窗位需提前预约',
                        reservation: '建议晚餐提前预约',
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
            personalizedNote: `推荐${destination}的特色美食，已根据您的口味偏好筛选`,
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
                    name: '下北泽',
                    type: '文艺街区',
                    style: 'offbeat',
                    indoor: false,
                    description: '东京最具个性的文艺街区，独立咖啡店、古着店云集',
                    highlights: ['古着购物', '独立音乐', '小众咖啡'],
                    recommendTime: '半天',
                    crowdLevel: '低',
                },
                {
                    id: 'attr_2',
                    name: '谷中银座',
                    type: '怀旧老街',
                    style: 'offbeat',
                    indoor: false,
                    description: '保留昭和风情的老街，特色小店和地道美食',
                    highlights: ['猫咪', '手工艺', '怀旧氛围'],
                    recommendTime: '3小时',
                    crowdLevel: '低',
                },
                {
                    id: 'attr_3',
                    name: 'teamLab Borderless',
                    type: '数字艺术馆',
                    style: 'popular',
                    indoor: true,
                    description: '全球知名的沉浸式数字艺术体验空间',
                    highlights: ['拍照', '沉浸体验', '艺术'],
                    recommendTime: '3-4小时',
                    crowdLevel: '高',
                },
                {
                    id: 'attr_4',
                    name: '浅草寺',
                    type: '历史文化',
                    style: 'popular',
                    indoor: false,
                    description: '东京最古老的寺庙，体验传统日本文化',
                    highlights: ['雷门', '仲见世通', '和服体验'],
                    recommendTime: '2-3小时',
                    crowdLevel: '高',
                }
            ]
            : isDalianDestination(destination)
                ? [
                    {
                        id: 'attr_dl_1',
                        name: '星海广场',
                        type: '城市地标',
                        style: 'popular',
                        indoor: false,
                        description: '大连标志性广场，海景视野开阔',
                        highlights: ['海景', '夜景', '步行体验'],
                        recommendTime: '2-3小时',
                        crowdLevel: '中',
                    },
                    {
                        id: 'attr_dl_2',
                        name: '老虎滩海洋公园',
                        type: '海洋公园',
                        style: 'popular',
                        indoor: true,
                        description: '适合家庭出游的海洋主题乐园',
                        highlights: ['海洋馆', '表演', '亲子'],
                        recommendTime: '半天',
                        crowdLevel: '高',
                    },
                    {
                        id: 'attr_dl_3',
                        name: '棒棰岛',
                        type: '海滨风光',
                        style: 'offbeat',
                        indoor: false,
                        description: '山海相伴的度假胜地，适合轻徒步',
                        highlights: ['海岸线', '轻徒步', '摄影'],
                        recommendTime: '半天',
                        crowdLevel: '中',
                    }
                ]
                : [
                    {
                        id: 'attr_generic_1',
                        name: `${destination}城市地标`,
                        type: '地标',
                        style: 'popular',
                        indoor: false,
                        description: '适合首次到访打卡',
                        highlights: ['拍照', '城市风景'],
                        recommendTime: '2小时',
                        crowdLevel: '中',
                    },
                    {
                        id: 'attr_generic_2',
                        name: `${destination}文化街区`,
                        type: '街区',
                        style: 'offbeat',
                        indoor: false,
                        description: '本地特色店铺与街景体验',
                        highlights: ['小店', '街拍'],
                        recommendTime: '2-3小时',
                        crowdLevel: '中',
                    },
                    {
                        id: 'attr_generic_3',
                        name: `${destination}博物馆`,
                        type: '室内展馆',
                        style: 'popular',
                        indoor: true,
                        description: '雨天首选室内活动',
                        highlights: ['室内', '文化体验'],
                        recommendTime: '2-3小时',
                        crowdLevel: '低',
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
                ? '根据您喜欢探索小众景点的习惯，推荐以下隐藏宝藏'
                : weatherHint && /雨|雪|雷暴/.test(weatherHint)
                    ? '根据天气情况，优先推荐室内或可避雨的体验'
                    : '精选热门与小众景点混合推荐',
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
    if (code === 0) return { condition: '晴朗', icon: '☀️' };
    if (code <= 3) return { condition: '多云', icon: '⛅' };
    if (code <= 48) return { condition: '雾霾', icon: '🌫️' };
    if (code <= 57) return { condition: '毛毛雨', icon: '🌦️' };
    if (code <= 67) return { condition: '雨', icon: '🌧️' };
    if (code <= 77) return { condition: '雪', icon: '❄️' };
    if (code <= 82) return { condition: '阵雨', icon: '🌧️' };
    if (code <= 86) return { condition: '阵雪', icon: '🌨️' };
    if (code <= 99) return { condition: '雷暴', icon: '⛈️' };
    return { condition: '未知', icon: '❓' };
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function buildWeatherActionLinks(location: string, lat?: number, lon?: number): Array<{ title: string; url: string; provider: string }> {
    const links: Array<{ title: string; url: string; provider: string }> = [];
    const loc = String(location || '').trim();
    if (loc) {
        links.push({
            title: `${loc} 天气`,
            url: `https://www.google.com/search?q=${encodeURIComponent(`${loc} 天气`)}`,
            provider: 'google_weather',
        });
    }
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const latFixed = Number(lat).toFixed(4);
        const lonFixed = Number(lon).toFixed(4);
        links.push({
            title: '天气雷达',
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
                        { day: '今天', temp: '15-22°C', condition: '多云', icon: '⛅' },
                        { day: '明天', temp: '14-21°C', condition: '晴', icon: '☀️' },
                        { day: '后天', temp: '13-20°C', condition: '晴', icon: '☀️' }
                    ],
                    tips: ['请添加该城市坐标以获取实时天气'],
                    dataSource: 'Mock (city not in database)',
                    action_links: buildWeatherActionLinks(destination),
                },
                suggestions: [],
                personalizedNote: `${destination}天气预报 (模拟数据)`,
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
                const dayName = idx === 0 ? '今天' : idx === 1 ? '明天' : WEEKDAYS[dateObj.getDay()];
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

            if (hasRain) tips.push('☔ 部分时间有雨，建议携带雨伞');
            if (hasSnow) tips.push('❄️ 可能有雪，注意保暖和防滑');
            if (coldDays >= 3) tips.push('🧥 天气偏凉，建议携带外套');
            if (hotDays >= 3) tips.push('🌡️ 天气炎热，注意防晒和补水');
            if (tips.length === 0) tips.push('✨ 天气良好，适合出行');

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
                    dataSource: 'Open-Meteo API (实时数据)',
                    lastUpdated: new Date().toISOString(),
                    action_links: buildWeatherActionLinks(destination, cityInfo.lat, cityInfo.lon),
                },
                suggestions: forecast,
                personalizedNote: `✅ ${cityInfo.name} 实时天气预报`,
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
                        { day: '今天', temp: '15-22°C', condition: '多云', icon: '⛅' },
                        { day: '明天', temp: '14-21°C', condition: '晴', icon: '☀️' },
                        { day: '后天', temp: '16-23°C', condition: '晴', icon: '☀️' }
                    ],
                    tips: ['天气数据获取失败，显示预估数据'],
                    dataSource: 'Mock (API error)',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action_links: buildWeatherActionLinks(destination),
                },
                suggestions: [],
                personalizedNote: `${destination}天气预报 (预估)`,
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
        const afternoonAttraction = weatherHint && /雨|雪|雷暴/.test(weatherHint) && indoorAttraction
            ? indoorAttraction
            : topAttraction;

        // 基于之前的结果生成行程
        const itinerary = {
            summary: `${destination}5日游行程`,
            days: [
                {
                    day: 1,
                    title: '抵达与探索',
                    activities: [
                        { time: '下午', activity: `抵达机场，前往${hotel?.name || '酒店'}办理入住`, location: hotel?.location || '酒店' },
                        { time: '傍晚', activity: topAttraction?.name ? `${topAttraction.name} 轻松走走` : '市区适应性散步', location: topAttraction?.name || destination },
                        ...(activitySlots >= 3 ? [{ time: '晚上', activity: topRestaurant?.name ? `${topRestaurant.name} 晚餐` : '当地特色晚餐', location: topRestaurant?.address || destination }] : [])
                    ].slice(0, activitySlots)
                },
                {
                    day: 2,
                    title: '文化体验日',
                    activities: [
                        { time: '上午', activity: '城市文化体验', location: destination },
                        { time: '中午', activity: topRestaurant?.name ? `${topRestaurant.name} 午餐` : '当地人气餐厅午餐', location: topRestaurant?.address || destination },
                        { time: '下午', activity: afternoonAttraction?.name ? `${afternoonAttraction.name} 深度参观` : '特色景点体验', location: afternoonAttraction?.name || destination }
                    ].slice(0, activitySlots)
                },
                {
                    day: 3,
                    title: '小众探索日',
                    activities: [
                        { time: '上午', activity: attractions[1]?.name ? `${attractions[1].name} 探索` : '小众区域探索', location: attractions[1]?.name || destination },
                        { time: '下午', activity: attractions[2]?.name ? `${attractions[2].name} 体验` : '自由活动', location: attractions[2]?.name || destination },
                        ...(activitySlots >= 3 ? [{ time: '晚上', activity: restaurants[1]?.name ? `${restaurants[1].name} 晚餐` : '夜间美食体验', location: restaurants[1]?.address || destination }] : [])
                    ].slice(0, activitySlots)
                }
            ]
        };

        return {
            success: true,
            data: itinerary,
            suggestions: itinerary.days,
            personalizedNote: `根据您的节奏偏好 (${pace === 'packed' ? '紧凑' : pace === 'relaxed' ? '慢节奏' : '平衡'}) 定制行程`,
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
        const origin = task.params.origin || '出发地';
        const destination = task.params.destination || '目的地';
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
                { mode: 'Heathrow Express', duration: '15-20 分钟', cost: '£25', note: '最快' },
                { mode: '伦敦地铁', duration: '45-60 分钟', cost: '£6', note: '性价比高' },
                { mode: '打车/网约车', duration: '40-60 分钟', cost: '£45-70', note: '最省心' }
            ]
            : [
                { mode: '机场大巴', duration: '40-70 分钟', cost: '¥20-40', note: '预算友好' },
                { mode: '地铁/轻轨', duration: '35-60 分钟', cost: '¥5-15', note: '稳定可靠' },
                { mode: '打车/网约车', duration: '30-50 分钟', cost: '¥60-120', note: '省心直达' }
            ];

        const fromAirport = isDalian
            ? [
                { mode: '机场巴士', duration: '30-50 分钟', cost: '¥20', note: '覆盖市区' },
                { mode: '出租车/网约车', duration: '25-40 分钟', cost: '¥60-90', note: '方便快捷' },
                { mode: '地铁', duration: '40-55 分钟', cost: '¥5-10', note: '高峰期稳定' }
            ]
            : [
                { mode: '机场巴士', duration: '30-60 分钟', cost: '¥20-40', note: '覆盖主要区域' },
                { mode: '出租车/网约车', duration: '25-45 分钟', cost: '¥70-120', note: '直接到达' },
                { mode: '地铁/轻轨', duration: '35-55 分钟', cost: '¥6-15', note: '时间可控' }
            ];

        const scoredToAirport = scoreTransportOptions(toAirport, preferences);
        const scoredFromAirport = scoreTransportOptions(fromAirport, preferences);

        const tips = [
            '国际航班建议起飞前 2.5-3 小时到达机场',
            '高峰期建议预留 20-30 分钟路面缓冲'
        ];

        return {
            success: true,
            data: {
                origin,
                destination,
                departureTime,
                arrivalTime,
                recommendedLeaveTime: leaveTime ? `建议 ${leaveTime} 前出发` : '建议预留 2.5 小时以上到达机场',
                toAirport: scoredToAirport,
                fromAirport: scoredFromAirport,
                tips
            },
            suggestions: [...scoredToAirport, ...scoredFromAirport],
            personalizedNote: leaveTime
                ? `根据航班时间，建议 ${leaveTime} 前出发前往机场`
                : '已为你整理接送机与市内交通方案',
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
