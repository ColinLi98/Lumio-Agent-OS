/**
 * Personalization Service - 个性化推荐服务
 * 
 * 功能：
 * - 基于用户画像提供个性化推荐
 * - 分析用户偏好并匹配最佳选项
 * - 生成个性化推荐理由
 */

import { getEnhancedDigitalAvatar, getDigitalAvatar, getInteractions } from './localStorageService';

// 用户偏好配置文件
export interface UserPreferences {
    // 餐饮偏好
    dining: {
        cuisinePreferences: string[];   // 菜系偏好
        priceRange: 'budget' | 'mid' | 'high' | 'luxury';
        dietaryRestrictions: string[];  // 饮食限制
        atmospherePreference: string[]; // 氛围偏好
        spiceLevel: 'mild' | 'medium' | 'spicy';
    };
    // 社交偏好
    social: {
        preferredOccasions: string[];   // 约会、商务、家庭等
        groupSize: 'solo' | 'couple' | 'small' | 'large';
        noiseTolerance: 'quiet' | 'moderate' | 'lively';
    };
    // 行为偏好
    behavior: {
        decisionStyle: 'quick' | 'research' | 'recommendation';
        priceVsQuality: number;         // -100 价格优先 到 100 质量优先
        adventurousness: number;        // 0-100 尝新意愿
    };
}

// 个性化推荐结果
export interface PersonalizedRecommendation {
    // 原始数据
    originalData: any;
    // 个性化分析
    analysis: {
        matchScore: number;             // 0-100 匹配度
        matchReasons: string[];         // 匹配原因列表
        personalNote: string;           // 个性化说明
        warnings?: string[];            // 可能的顾虑
    };
    // 智能联想
    suggestions: {
        relatedQueries: string[];       // 相关搜索建议
        followUpActions: string[];      // 后续操作建议
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

    // 从交互历史中推断餐饮偏好
    const foodInteractions = interactions.filter(i =>
        i.type === 'tool_used' &&
        (i.data.toolName === 'location' || i.data.query?.includes('餐') || i.data.query?.includes('吃'))
    );

    // 推断价格范围偏好
    const priceVsQuality = avatar.valuesProfile?.priceVsQuality || 0;
    let priceRange: 'budget' | 'mid' | 'high' | 'luxury' = 'mid';
    if (priceVsQuality < -30) priceRange = 'budget';
    else if (priceVsQuality > 50) priceRange = 'luxury';
    else if (priceVsQuality > 20) priceRange = 'high';

    // 从兴趣标签推断菜系偏好
    const cuisineKeywords = ['火锅', '日料', '西餐', '粤菜', '川菜', '意大利', '法餐', '日本料理'];
    const cuisinePreferences = basicAvatar.interestTags
        .filter(tag => cuisineKeywords.some(c => tag.name.includes(c)))
        .map(tag => tag.name);

    // 从性格画像推断氛围偏好
    const extraversion = avatar.personality?.extraversion || 50;
    const atmospherePreference = extraversion > 60
        ? ['热闹', '网红打卡', '朋友聚会']
        : extraversion < 40
            ? ['安静', '私密', '浪漫氛围']
            : ['轻松', '适中'];

    // 社交偏好
    const socialActivity = avatar.socialGraph?.socialActivityLevel || 50;

    return {
        dining: {
            cuisinePreferences: cuisinePreferences.length > 0 ? cuisinePreferences : ['中餐', '西餐'],
            priceRange,
            dietaryRestrictions: [],
            atmospherePreference,
            spiceLevel: 'medium',
        },
        social: {
            preferredOccasions: ['约会', '朋友聚会'],
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
 * 为搜索结果添加个性化分析
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
 * 分析单个结果与用户偏好的匹配度
 */
function analyzeMatch(
    item: any,
    prefs: UserPreferences,
    query: string,
    context?: { purpose?: string; conversation?: any[] }
): PersonalizedRecommendation['analysis'] {
    let matchScore = 50; // 基础分
    const matchReasons: string[] = [];
    const warnings: string[] = [];

    // 价格匹配
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
        matchReasons.push(`💰 价格符合您的预算偏好`);
    } else if (priceCount > Object.keys(priceMatch).indexOf(prefs.dining.priceRange) + 1) {
        matchScore -= 10;
        warnings.push(`价格可能超出常规预算`);
    }

    // 氛围匹配
    const atmosphere = item.atmosphere || [];
    const atmosphereMatches = atmosphere.filter((a: string) =>
        prefs.dining.atmospherePreference.some(p => a.includes(p) || p.includes(a))
    );
    if (atmosphereMatches.length > 0) {
        matchScore += 10 * atmosphereMatches.length;
        matchReasons.push(`🎯 氛围符合偏好: ${atmosphereMatches.join(', ')}`);
    }

    // 约会场景特殊加分
    const isDateContext = context?.purpose === 'date' ||
        query.includes('约会') ||
        query.includes('浪漫') ||
        query.includes('情侣');
    if (isDateContext) {
        if (atmosphere.some((a: string) => ['约会', '浪漫', '私密', '求婚'].some(k => a.includes(k)))) {
            matchScore += 20;
            matchReasons.push(`💕 非常适合约会场景`);
        }
    }

    // 评分考量
    const rating = item.rating || 0;
    if (rating >= 4.7) {
        matchScore += 10;
        matchReasons.push(`⭐ 高评分 ${rating} 分，口碑优秀`);
    } else if (rating >= 4.5) {
        matchScore += 5;
    }

    // 评价数量（人气）
    const reviewCount = item.reviewCount || 0;
    if (reviewCount > 2000) {
        matchScore += 5;
        matchReasons.push(`🔥 ${reviewCount}+ 条评价，人气餐厅`);
    }

    // 亮点匹配
    const highlights = item.highlights || [];
    if (highlights.includes('米其林') || highlights.some((h: string) => h.includes('米其林'))) {
        matchScore += 15;
        matchReasons.push(`🌟 米其林推荐，品质保证`);
    }

    // 冒险度考量
    if (prefs.behavior.adventurousness > 70 && item.type?.includes('创意')) {
        matchScore += 10;
        matchReasons.push(`✨ 创意料理符合您的尝新风格`);
    }

    // 生成个性化说明
    const personalNote = generatePersonalNote(item, prefs, matchReasons, isDateContext);

    return {
        matchScore: Math.min(100, Math.max(0, matchScore)),
        matchReasons,
        personalNote,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

/**
 * 生成个性化说明
 */
function generatePersonalNote(
    item: any,
    prefs: UserPreferences,
    matchReasons: string[],
    isDateContext: boolean
): string {
    if (matchReasons.length === 0) {
        return '这是一个不错的选择。';
    }

    if (isDateContext) {
        const atmosphere = item.atmosphere || [];
        if (atmosphere.includes('求婚胜地')) {
            return `🎊 如果有特别计划，这里是绝佳的求婚地点！${item.highlights?.[0] ? `亮点: ${item.highlights[0]}` : ''}`;
        }
        if (atmosphere.includes('私密包间')) {
            return `💑 提供私密包间，适合两人世界。建议: ${item.waitTime || '提前预订'}`;
        }
        return `💕 根据您的偏好精选的约会餐厅，${item.priceRange || item.priceLevel}的消费水平，${item.type}风格。`;
    }

    // 基于价格偏好的说明
    if (prefs.dining.priceRange === 'budget') {
        return `性价比之选！${item.signature ? `招牌菜: ${item.signature.slice(0, 2).join('、')}` : ''}`;
    }

    if (prefs.dining.priceRange === 'luxury') {
        return `品质之选，${item.highlights?.[0] || '环境优雅'}。${item.waitTime || ''}`;
    }

    return `根据您的口味偏好推荐。${item.signature ? `必点: ${item.signature[0]}` : ''}`;
}

/**
 * 生成智能联想建议
 */
function generateSuggestions(
    item: any,
    query: string,
    prefs: UserPreferences
): PersonalizedRecommendation['suggestions'] {
    const relatedQueries: string[] = [];
    const followUpActions: string[] = [];

    // 基于当前结果生成相关搜索
    if (item.type) {
        relatedQueries.push(`${query.replace(/餐厅|推荐/g, '')}${item.type}推荐`);
    }

    // 添加同区域其他类型
    if (query.includes('约会')) {
        relatedQueries.push(`${query.replace('餐厅', '')}咖啡厅`);
        relatedQueries.push(`${query.replace('餐厅', '')}酒吧`);
    }

    // 后续操作建议
    if (item.bookingAvailable) {
        followUpActions.push('📅 立即预订');
    }
    if (item.dianpingUrl) {
        followUpActions.push('📖 查看更多评价');
    }
    if (item.phone) {
        followUpActions.push('📞 电话咨询');
    }

    // 如果是约会场景，添加相关建议
    if (query.includes('约会')) {
        followUpActions.push('💐 附近花店');
        followUpActions.push('🎬 附近电影院');
    }

    return {
        relatedQueries: relatedQueries.slice(0, 3),
        followUpActions: followUpActions.slice(0, 4),
    };
}

/**
 * 生成个性化搜索提示
 * 用于在用户输入时显示智能联想
 */
export function getSmartSuggestions(partialQuery: string): string[] {
    const prefs = getUserPreferences();
    const suggestions: string[] = [];

    // 基于用户画像生成建议
    if (partialQuery.includes('餐') || partialQuery.includes('吃')) {
        if (prefs.dining.priceRange === 'luxury') {
            suggestions.push('推荐高档餐厅');
            suggestions.push('米其林餐厅');
        }
        if (prefs.dining.cuisinePreferences.length > 0) {
            suggestions.push(...prefs.dining.cuisinePreferences.map(c => `${c}餐厅推荐`));
        }
    }

    if (partialQuery.includes('约会')) {
        suggestions.push('浪漫约会餐厅');
        suggestions.push('私密约会地点');
        suggestions.push('求婚餐厅推荐');
    }

    // 基于时间的建议
    const hour = new Date().getHours();
    if (hour >= 11 && hour <= 13) {
        suggestions.push('附近午餐推荐');
    } else if (hour >= 17 && hour <= 20) {
        suggestions.push('附近晚餐推荐');
    }

    return [...new Set(suggestions)].slice(0, 5);
}

/**
 * 格式化个性化结果用于显示
 */
export function formatPersonalizedResult(rec: PersonalizedRecommendation): any {
    return {
        ...rec.originalData,
        // 添加个性化信息
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

export default {
    getUserPreferences,
    personalizeResults,
    getSmartSuggestions,
    formatPersonalizedResult,
};
