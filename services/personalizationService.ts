/**
 * Personalization Service
 *
 * Functions:
 * - Generate personalized recommendations from user profile
 * - Match options against user preferences
 * - Produce personalized recommendation rationale
 */

import { getEnhancedDigitalAvatar, getDigitalAvatar, getInteractions } from './localStorageService.js';

// User preference profile
export interface UserPreferences {
    // Dining preferences
    dining: {
        cuisinePreferences: string[];   // Cuisine preferences
        priceRange: 'budget' | 'mid' | 'high' | 'luxury';
        dietaryRestrictions: string[];  // Dietary restrictions
        atmospherePreference: string[]; // Atmosphere preferences
        spiceLevel: 'mild' | 'medium' | 'spicy';
    };
    // Social preferences
    social: {
        preferredOccasions: string[];   // Date/business/family etc.
        groupSize: 'solo' | 'couple' | 'small' | 'large';
        noiseTolerance: 'quiet' | 'moderate' | 'lively';
    };
    // Behavioral preferences
    behavior: {
        decisionStyle: 'quick' | 'research' | 'recommendation';
        priceVsQuality: number;         // -100 price-first to 100 quality-first
        adventurousness: number;        // 0-100 willingness to try new things
    };
}

// Personalized recommendation result
export interface PersonalizedRecommendation {
    // Raw data
    originalData: any;
    // Personalized analysis
    analysis: {
        matchScore: number;             // 0-100 match score
        matchReasons: string[];         // Match reason list
        personalNote: string;           // Personalized note
        warnings?: string[];            // Potential concerns
    };
    // Smart follow-ups
    suggestions: {
        relatedQueries: string[];       // Related search suggestions
        followUpActions: string[];      // Follow-up action suggestions
    };
}

/**
 * 获取用户偏好配置
 * 基于历史交互和画像数据推断
 */
export function getUserPreferences(): UserPreferences {
    const avatar = getEnhancedDigitalAvatar();
    const basicAvatar = getDigitalAvatar();
    const interactions = getInteractions(100);

    // Infer dining preferences from interaction history
    const foodInteractions = interactions.filter(i =>
        i.type === 'tool_used' &&
        (i.data.toolName === 'location' || i.data.query?.includes('餐') || i.data.query?.includes('吃'))
    );

    // Infer price-range preference
    const priceVsQuality = avatar.valuesProfile?.priceVsQuality || 0;
    let priceRange: 'budget' | 'mid' | 'high' | 'luxury' = 'mid';
    if (priceVsQuality < -30) priceRange = 'budget';
    else if (priceVsQuality > 50) priceRange = 'luxury';
    else if (priceVsQuality > 20) priceRange = 'high';

    // Infer cuisine preferences from interest tags
    const cuisineKeywords = ['火锅', '日料', '西餐', '粤菜', '川菜', '意大利', '法餐', '日本料理'];
    const cuisinePreferences = basicAvatar.interestTags
        .filter(tag => cuisineKeywords.some(c => tag.name.includes(c)))
        .map(tag => tag.name);

    // Infer atmosphere preference from personality profile
    const extraversion = avatar.personality?.extraversion || 50;
    const atmospherePreference = extraversion > 60
        ? ['Lively', 'Trendy', 'Social']
        : extraversion < 40
            ? ['Quiet', 'Private', 'Romantic']
            : ['Relaxed', 'Balanced'];

    // Social preferences
    const socialActivity = avatar.socialGraph?.socialActivityLevel || 50;

    return {
        dining: {
            cuisinePreferences: cuisinePreferences.length > 0 ? cuisinePreferences : ['Chinese', 'Western'],
            priceRange,
            dietaryRestrictions: [],
            atmospherePreference,
            spiceLevel: 'medium',
        },
        social: {
            preferredOccasions: ['Date', 'Friends'],
            groupSize: socialActivity > 60 ? 'small' : 'couple',
            noiseTolerance: extraversion > 60 ? 'lively' : 'moderate',
        },
        behavior: {
            decisionStyle: avatar.behaviorPatterns?.decisionStyle === 'quick' ? 'quick' : 'research',
            priceVsQuality,
            adventurousness: avatar.personality?.openness || 50,
        },
    };
}

/**
 * Add personalization analysis to search results
 */
export function personalizeResults(
    query: string,
    results: any[],
    context?: { purpose?: string; conversation?: any[] }
): PersonalizedRecommendation[] {
    const prefs = getUserPreferences();
    const avatar = getEnhancedDigitalAvatar();

    return results.map(item => {
        const analysis = analyzeMatch(item, prefs, query, context);
        const suggestions = generateSuggestions(item, query, prefs);

        return {
            originalData: item,
            analysis,
            suggestions,
        };
    }).sort((a, b) => b.analysis.matchScore - a.analysis.matchScore);
}

/**
 * Analyze how a single result matches user preferences
 */
function analyzeMatch(
    item: any,
    prefs: UserPreferences,
    query: string,
    context?: { purpose?: string; conversation?: any[] }
): PersonalizedRecommendation['analysis'] {
    let matchScore = 50; // Base score
    const matchReasons: string[] = [];
    const warnings: string[] = [];

    // Price matching
    const priceLevel = item.priceLevel || item.priceRange || '';
    const priceCount = (priceLevel.match(/¥/g) || []).length;

    const priceMatch = {
        'budget': priceCount <= 1,
        'mid': priceCount === 2,
        'high': priceCount === 3,
        'luxury': priceCount >= 4,
    };

    if (priceMatch[prefs.dining.priceRange]) {
        matchScore += 15;
        matchReasons.push(`💰 Price aligns with your budget preference`);
    } else if (priceCount > Object.keys(priceMatch).indexOf(prefs.dining.priceRange) + 1) {
        matchScore -= 10;
        warnings.push(`Price may exceed your typical budget`);
    }

    // Atmosphere matching
    const atmosphere = item.atmosphere || [];
    const atmosphereMatches = atmosphere.filter((a: string) =>
        prefs.dining.atmospherePreference.some(p => a.includes(p) || p.includes(a))
    );
    if (atmosphereMatches.length > 0) {
        matchScore += 10 * atmosphereMatches.length;
        matchReasons.push(`🎯 Atmosphere matches preference: ${atmosphereMatches.join(', ')}`);
    }

    // Extra points for date context
    const isDateContext = context?.purpose === 'date' ||
        query.includes('约会') ||
        query.includes('浪漫') ||
        query.includes('情侣') ||
        /date|romantic|couple/i.test(query);
    if (isDateContext) {
        if (atmosphere.some((a: string) => ['约会', '浪漫', '私密', '求婚', 'date', 'romantic', 'private', 'proposal'].some(k => a.toLowerCase().includes(k.toLowerCase())))) {
            matchScore += 20;
            matchReasons.push(`💕 Excellent fit for a date context`);
        }
    }

    // Rating
    const rating = item.rating || 0;
    if (rating >= 4.7) {
        matchScore += 10;
        matchReasons.push(`⭐ High rating ${rating}, strong reputation`);
    } else if (rating >= 4.5) {
        matchScore += 5;
    }

    // Review count (popularity)
    const reviewCount = item.reviewCount || 0;
    if (reviewCount > 2000) {
        matchScore += 5;
        matchReasons.push(`🔥 ${reviewCount}+ reviews, high popularity`);
    }

    // Highlights matching
    const highlights = item.highlights || [];
    if (highlights.includes('米其林') || highlights.some((h: string) => h.includes('米其林') || /michelin/i.test(h))) {
        matchScore += 15;
        matchReasons.push(`🌟 Michelin signal detected, quality confidence`);
    }

    // Adventurousness
    if (prefs.behavior.adventurousness > 70 && (item.type?.includes('创意') || /creative/i.test(item.type || ''))) {
        matchScore += 10;
        matchReasons.push(`✨ Creative style fits your exploratory preference`);
    }

    // Generate personalized note
    const personalNote = generatePersonalNote(item, prefs, matchReasons, isDateContext);

    return {
        matchScore: Math.min(100, Math.max(0, matchScore)),
        matchReasons,
        personalNote,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

/**
 * Generate personalized note
 */
function generatePersonalNote(
    item: any,
    prefs: UserPreferences,
    matchReasons: string[],
    isDateContext: boolean
): string {
    if (matchReasons.length === 0) {
        return 'This is a solid option.';
    }

    if (isDateContext) {
        const atmosphere = item.atmosphere || [];
        if (atmosphere.includes('求婚胜地') || atmosphere.some((a: string) => /proposal/i.test(a))) {
            return `🎊 If you have a special plan, this is a strong proposal spot.${item.highlights?.[0] ? ` Highlight: ${item.highlights[0]}` : ''}`;
        }
        if (atmosphere.includes('私密包间') || atmosphere.some((a: string) => /private/i.test(a))) {
            return `💑 Private rooms are available, ideal for a two-person setting. Suggestion: ${item.waitTime || 'book in advance'}`;
        }
        return `💕 Curated date recommendation based on your preferences, with ${item.priceRange || item.priceLevel} budget level and ${item.type} style.`;
    }

    // Note by budget preference
    if (prefs.dining.priceRange === 'budget') {
        return `Best value pick!${item.signature ? ` Signature dishes: ${item.signature.slice(0, 2).join(', ')}` : ''}`;
    }

    if (prefs.dining.priceRange === 'luxury') {
        return `Premium quality option, ${item.highlights?.[0] || 'elegant atmosphere'}.${item.waitTime || ''}`;
    }

    return `Recommended based on your taste preferences.${item.signature ? ` Must-try: ${item.signature[0]}` : ''}`;
}

/**
 * Generate smart follow-up suggestions
 */
function generateSuggestions(
    item: any,
    query: string,
    prefs: UserPreferences
): PersonalizedRecommendation['suggestions'] {
    const relatedQueries: string[] = [];
    const followUpActions: string[] = [];

    // Related searches from current result
    if (item.type) {
        relatedQueries.push(`${query.replace(/餐厅|推荐/g, '').trim()} ${item.type} recommendations`);
    }

    // Nearby alternatives
    if (query.includes('约会')) {
        relatedQueries.push(`${query.replace('餐厅', '').trim()} cafe`);
        relatedQueries.push(`${query.replace('餐厅', '').trim()} bar`);
    }

    // Follow-up actions
    if (item.bookingAvailable) {
        followUpActions.push('📅 Book now');
    }
    if (item.dianpingUrl) {
        followUpActions.push('📖 View more reviews');
    }
    if (item.phone) {
        followUpActions.push('📞 Call for details');
    }

    // Date-context extras
    if (query.includes('约会')) {
        followUpActions.push('💐 Nearby flower shop');
        followUpActions.push('🎬 Nearby cinema');
    }

    return {
        relatedQueries: relatedQueries.slice(0, 3),
        followUpActions: followUpActions.slice(0, 4),
    };
}

/**
 * Format personalized result for display
 */
export function formatPersonalizedResult(rec: PersonalizedRecommendation): any {
    return {
        ...rec.originalData,
        // Add personalization payload
        personalizedInfo: {
            matchScore: rec.analysis.matchScore,
            matchReasons: rec.analysis.matchReasons,
            personalNote: rec.analysis.personalNote,
            warnings: rec.analysis.warnings,
            relatedQueries: rec.suggestions.relatedQueries,
            followUpActions: rec.suggestions.followUpActions,
        },
    };
}

// =====================================
// Universal Smart Suggestions
// =====================================

/**
 * Smart suggestion result interface
 */
export interface SmartSuggestion {
    relatedQueries: string[];      // Related search queries
    quickActions: string[];        // Quick action buttons
    context?: string;              // Context description
}

/**
 * Generate universal smart suggestions based on query context and result type
 * Works for ANY tool result type, not just restaurants
 */
export function generateUniversalSuggestions(
    query: string,
    toolName: string,
    result: any,
    context?: { purpose?: string }
): SmartSuggestion {
    const prefs = getUserPreferences();
    const relatedQueries: string[] = [];
    const quickActions: string[] = [];

    // Analyze query keywords
    const queryLower = query.toLowerCase();

    switch (toolName) {
        case 'get_weather':
            // Weather-based suggestions
            const temp = result?.temperature;
            const condition = result?.condition?.toLowerCase() || '';

            relatedQueries.push('Tomorrow weather forecast');
            relatedQueries.push('Weekly weather trend');

            if (condition.includes('雨') || condition.includes('rain')) {
                quickActions.push('☔ View rain gear picks');
                relatedQueries.push('Indoor activity recommendations');
            } else if (condition.includes('晴') || condition.includes('sunny') || condition.includes('clear')) {
                quickActions.push('🌳 Nearby parks');
                relatedQueries.push('Outdoor activity recommendations');
            }

            if (temp && temp < 10) {
                quickActions.push('🧥 Outfit suggestion');
            } else if (temp && temp > 30) {
                quickActions.push('🧊 Heat avoidance tips');
            }

            quickActions.push('📅 Add weather reminder');
            break;

        case 'web_search':
            // Web search follow-up suggestions
            relatedQueries.push(`${query} detailed overview`);
            relatedQueries.push(`${query} latest updates`);
            relatedQueries.push(`${query} tutorial`);

            quickActions.push('📖 Deep dive');
            quickActions.push('💾 Save to notes');
            quickActions.push('🔗 View more sources');
            break;

        case 'price_compare':
            // Shopping suggestions
            const product = result?.product || query;

            relatedQueries.push(`${product} reviews`);
            relatedQueries.push(`${product} alternatives`);
            relatedQueries.push(`${product} price history`);

            quickActions.push('⭐ Add to wishlist');
            quickActions.push('📊 Price trend');
            quickActions.push('💬 View user reviews');
            if (result?.lowestPlatform) {
                quickActions.push(`🛒 Buy on ${result.lowestPlatform}`);
            }
            break;

        case 'notes':
        case 'smart_save':
            // Notes/memory suggestions
            relatedQueries.push('View all notes');
            relatedQueries.push('Search related notes');

            quickActions.push('📝 Edit note');
            quickActions.push('🏷️ Add tags');
            quickActions.push('📤 Share note');
            quickActions.push('🗂️ Organize categories');
            break;

        case 'calendar':
            // Calendar suggestions
            relatedQueries.push('View this week schedule');
            relatedQueries.push('Add reminder');

            quickActions.push('⏰ Set reminder');
            quickActions.push('📋 Prepare checklist');
            quickActions.push('👥 Invite participants');
            quickActions.push('🔄 Set recurring');
            break;

        case 'reminder':
            // Reminder follow-ups
            relatedQueries.push('View all reminders');
            relatedQueries.push('Set recurring reminder');

            quickActions.push('✏️ Edit reminder');
            quickActions.push('🔔 Adjust time');
            quickActions.push('📅 Link to calendar');
            break;

        case 'location':
            // Location/place suggestions (enhanced restaurant handling)
            const isRestaurant = result?.type === 'restaurant' || queryLower.includes('餐厅') || queryLower.includes('吃');
            const isDateContext = context?.purpose === 'date' || queryLower.includes('约会');

            if (isRestaurant) {
                if (isDateContext) {
                    relatedQueries.push('Nearby cafes');
                    relatedQueries.push('Cinema for dates');
                    quickActions.push('💐 Nearby flower shop');
                    quickActions.push('🎬 Nearby cinema');
                } else {
                    relatedQueries.push('Nearby parking');
                    relatedQueries.push('Other restaurant recommendations');
                }
                quickActions.push('📅 Book now');
                quickActions.push('📞 Call for details');
            } else {
                relatedQueries.push('Nearby attractions');
                relatedQueries.push('Nearby restaurants');
                quickActions.push('🗺️ Start navigation');
                quickActions.push('⭐ Save location');
            }
            break;

        case 'quick_write':
            // Writing assistance suggestions
            relatedQueries.push('More style options');
            relatedQueries.push('Alternative phrasing');

            quickActions.push('📋 Copy text');
            quickActions.push('✏️ Refine wording');
            quickActions.push('🌐 Translate');
            quickActions.push('📤 Send directly');
            break;

        case 'search_assist':
            // OCR/Search assist suggestions
            if (result?.type === 'product') {
                relatedQueries.push('Price comparison');
                quickActions.push('🔍 Multi-platform compare');
            } else if (result?.type === 'address') {
                quickActions.push('🗺️ Start navigation');
            }
            quickActions.push('📋 Copy content');
            quickActions.push('💾 Save');
            break;

        default:
            // Generic suggestions based on query analysis
            if (queryLower.includes('怎么') || queryLower.includes('如何')) {
                relatedQueries.push(`${query.replace(/怎么|如何/g, '')} tutorial`);
                relatedQueries.push(`${query.replace(/怎么|如何/g, '')} video`);
                quickActions.push('📖 Step-by-step guide');
            }

            if (queryLower.includes('推荐')) {
                relatedQueries.push(`${query.replace('推荐', '')} ranking`);
                relatedQueries.push(`${query.replace('推荐', '')} review`);
            }

            // Time-based suggestions
            const hour = new Date().getHours();
            if (hour >= 11 && hour <= 13) {
                relatedQueries.push('Nearby lunch');
            } else if (hour >= 17 && hour <= 20) {
                relatedQueries.push('Nearby dinner');
            }

            quickActions.push('💾 Save');
            quickActions.push('🔍 Deep search');
            break;
    }

    // Add user preference-based suggestions
    if (prefs.behavior.adventurousness > 70) {
        relatedQueries.push('Novel experiences');
    }

    if (prefs.dining.priceRange === 'budget') {
        relatedQueries.push('Best value picks');
    }

    return {
        relatedQueries: [...new Set(relatedQueries)].slice(0, 4),
        quickActions: [...new Set(quickActions)].slice(0, 5),
        context: toolName,
    };
}

/**
 * Get smart input suggestions based on partial query and user context
 * Enhanced version that works for all query types
 */
export function getSmartSuggestions(partialQuery: string): string[] {
    const prefs = getUserPreferences();
    const suggestions: string[] = [];
    const queryLower = partialQuery.toLowerCase();

    // Time-based suggestions (universal)
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    // Morning suggestions (6-10am)
    if (hour >= 6 && hour <= 10) {
        suggestions.push('Today weather');
        suggestions.push('Today schedule');
    }

    // Lunch suggestions (11am-1pm)
    if (hour >= 11 && hour <= 13) {
        suggestions.push('Nearby lunch recommendations');
        if (prefs.dining.priceRange === 'budget') {
            suggestions.push('Affordable lunch');
        }
    }

    // Dinner suggestions (5-8pm)
    if (hour >= 17 && hour <= 20) {
        suggestions.push('Nearby dinner recommendations');
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            suggestions.push('Weekend group dining');
        }
    }

    // Query-specific suggestions
    if (queryLower.includes('餐') || queryLower.includes('吃')) {
        if (prefs.dining.priceRange === 'luxury') {
            suggestions.push('Premium restaurants');
            suggestions.push('Michelin restaurants');
        }
        if (prefs.dining.cuisinePreferences.length > 0) {
            suggestions.push(...prefs.dining.cuisinePreferences.map(c => `${c} restaurants`));
        }
    }

    if (queryLower.includes('约会')) {
        suggestions.push('Romantic date restaurants');
        suggestions.push('Private date places');
        suggestions.push('Proposal-friendly restaurants');
    }

    if (queryLower.includes('天气')) {
        suggestions.push('Tomorrow weather');
        suggestions.push('This week forecast');
        suggestions.push('Outfit suggestion');
    }

    if (queryLower.includes('买') || queryLower.includes('购')) {
        suggestions.push('Price comparison');
        suggestions.push('Coupons');
        suggestions.push('Product reviews');
    }

    if (queryLower.includes('记') || queryLower.includes('笔记')) {
        suggestions.push('View my notes');
        suggestions.push('Create to-do item');
    }

    if (queryLower.includes('提醒') || queryLower.includes('闹钟')) {
        suggestions.push('Set reminder');
        suggestions.push('View to-dos');
    }

    if (queryLower.includes('日程') || queryLower.includes('安排')) {
        suggestions.push('Today schedule');
        suggestions.push('Add schedule item');
    }

    if (queryLower.includes('写') || queryLower.includes('回复')) {
        suggestions.push('Help me reply');
        suggestions.push('Formal reply');
        suggestions.push('Casual reply');
    }

    // If no specific match, provide general popular suggestions
    if (suggestions.length === 0) {
        suggestions.push('Nearby food');
        suggestions.push('Today weather');
        suggestions.push('Help me remember');
        suggestions.push('Help me write');
    }

    return [...new Set(suggestions)].slice(0, 6);
}

export default {
    getUserPreferences,
    personalizeResults,
    getSmartSuggestions,
    formatPersonalizedResult,
    generateUniversalSuggestions,
};
