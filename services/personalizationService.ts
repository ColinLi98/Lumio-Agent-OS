import { getEnhancedDigitalAvatar, getInteractions } from './localStorageService.js';

export interface UserPreferences {
    dining: {
        cuisinePreferences: string[];
        priceRange: 'budget' | 'mid' | 'high' | 'luxury';
        dietaryRestrictions: string[];
        atmospherePreference: string[];
        spiceLevel: 'mild' | 'medium' | 'spicy';
    };
    social: {
        preferredOccasions: string[];
        groupSize: 'solo' | 'couple' | 'small' | 'large';
        noiseTolerance: 'quiet' | 'moderate' | 'lively';
    };
    behavior: {
        decisionStyle: 'quick' | 'research' | 'recommendation';
        priceVsQuality: number;
        adventurousness: number;
    };
}

export interface PersonalizedRecommendation {
    originalData: any;
    analysis: {
        matchScore: number;
        matchReasons: string[];
        personalNote: string;
        warnings?: string[];
    };
    suggestions: {
        relatedQueries: string[];
        followUpActions: string[];
    };
}

export interface UniversalSuggestions {
    relatedQueries: string[];
    quickActions: string[];
}

function normalizePriceRange(score: number): UserPreferences['dining']['priceRange'] {
    if (score <= -30) return 'budget';
    if (score >= 50) return 'luxury';
    if (score >= 20) return 'high';
    return 'mid';
}

export function getUserPreferences(): UserPreferences {
    const avatar = getEnhancedDigitalAvatar();
    const interactions = getInteractions(40);
    const priceVsQuality = Number(avatar.valuesProfile?.priceVsQuality || 0);
    const adventurousness = Number(avatar.personality?.openness || 50);
    const cuisinePreferences = interactions
        .map((item) => String(item?.data?.query || ''))
        .filter(Boolean)
        .flatMap((query) => ['火锅', '日料', '西餐', '烧烤', '咖啡'].filter((keyword) => query.includes(keyword)));

    return {
        dining: {
            cuisinePreferences: cuisinePreferences.length ? Array.from(new Set(cuisinePreferences)).slice(0, 4) : ['中餐', '西餐'],
            priceRange: normalizePriceRange(priceVsQuality),
            dietaryRestrictions: [],
            atmospherePreference: Number(avatar.personality?.extraversion || 50) >= 60 ? ['热闹', '社交'] : ['安静', '私密'],
            spiceLevel: 'medium',
        },
        social: {
            preferredOccasions: ['朋友聚会', '约会'],
            groupSize: 'couple',
            noiseTolerance: Number(avatar.personality?.extraversion || 50) >= 60 ? 'lively' : 'moderate',
        },
        behavior: {
            decisionStyle: 'research',
            priceVsQuality,
            adventurousness,
        },
    };
}

function buildRelatedQueries(query: string, toolName: string): string[] {
    const suggestions = [
        `${query} 对比`,
        `${query} 推荐`,
        `${query} 注意事项`,
        `${toolName} 后续步骤`,
    ];
    return Array.from(new Set(suggestions)).slice(0, 4);
}

function buildQuickActions(toolName: string): string[] {
    if (toolName === 'location') return ['查看附近备选', '按评分排序', '按价格筛选'];
    if (toolName === 'travel') return ['补充日期', '补充预算', '比较平台'];
    return ['继续 уточ细化需求', '查看备选方案', '总结关键差异'].map((item) =>
        item === '继续 уточ细化需求' ? '继续细化需求' : item
    );
}

export function personalizeResults(
    query: string,
    results: any[],
    context?: { purpose?: string; conversation?: any[] },
): PersonalizedRecommendation[] {
    const prefs = getUserPreferences();
    return results.map((item) => {
        const ratingScore = Number.isFinite(item?.rating) ? Math.round(Number(item.rating) * 20) : 60;
        const priceBias = prefs.dining.priceRange === 'luxury' ? 8 : prefs.dining.priceRange === 'budget' ? -4 : 0;
        const matchScore = Math.max(0, Math.min(100, ratingScore + priceBias));
        const reasons = [
            Number.isFinite(item?.rating) ? `评分 ${item.rating}` : '满足基础筛选条件',
            context?.purpose === 'date' ? '符合当前约会场景' : '与当前查询意图匹配',
        ];
        return {
            originalData: item,
            analysis: {
                matchScore,
                matchReasons: reasons,
                personalNote: context?.purpose === 'date'
                    ? '已按约会场景优先考虑氛围与稳定性。'
                    : '已结合用户偏好做基础排序。',
            },
            suggestions: {
                relatedQueries: buildRelatedQueries(query, 'location'),
                followUpActions: ['查看详情', '比较备选', '补充筛选条件'],
            },
        };
    }).sort((a, b) => b.analysis.matchScore - a.analysis.matchScore);
}

export function generateUniversalSuggestions(
    query: string,
    toolName: string,
    _data: any,
    _context?: { purpose?: string },
): UniversalSuggestions {
    return {
        relatedQueries: buildRelatedQueries(query, toolName),
        quickActions: buildQuickActions(toolName),
    };
}
