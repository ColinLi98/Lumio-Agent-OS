/**
 * Personalization Service - 个性化推荐服务
 * 
 * 功能：
 * - 基于用户画像提供个性化推荐
 * - 分析用户偏好并匹配最佳选项
 * - 生成个性化推荐理由
 */

import { getEnhancedDigitalAvatar, getDigitalAvatar, getInteractions } from './localStorageService.js';

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

// =====================================
// Universal Smart Suggestions - 通用智能联想
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

            relatedQueries.push('明日天气预报');
            relatedQueries.push('一周天气趋势');

            if (condition.includes('雨') || condition.includes('rain')) {
                quickActions.push('☔ 查看雨具推荐');
                relatedQueries.push('室内活动推荐');
            } else if (condition.includes('晴') || condition.includes('sunny') || condition.includes('clear')) {
                quickActions.push('🌳 附近公园');
                relatedQueries.push('户外活动推荐');
            }

            if (temp && temp < 10) {
                quickActions.push('🧥 穿衣建议');
            } else if (temp && temp > 30) {
                quickActions.push('🧊 避暑攻略');
            }

            quickActions.push('📅 添加天气提醒');
            break;

        case 'web_search':
            // Web search follow-up suggestions
            relatedQueries.push(`${query} 详细介绍`);
            relatedQueries.push(`${query} 最新消息`);
            relatedQueries.push(`${query} 教程`);

            quickActions.push('📖 深入研究');
            quickActions.push('💾 保存到笔记');
            quickActions.push('🔗 查看更多来源');
            break;

        case 'price_compare':
            // Shopping suggestions
            const product = result?.product || query;

            relatedQueries.push(`${product} 评测`);
            relatedQueries.push(`${product} 替代品`);
            relatedQueries.push(`${product} 历史价格`);

            quickActions.push('⭐ 加入心愿单');
            quickActions.push('📊 价格走势');
            quickActions.push('💬 查看用户评价');
            if (result?.lowestPlatform) {
                quickActions.push(`🛒 去${result.lowestPlatform}购买`);
            }
            break;

        case 'notes':
        case 'smart_save':
            // Notes/memory suggestions
            relatedQueries.push('查看所有笔记');
            relatedQueries.push('搜索相关笔记');

            quickActions.push('📝 编辑笔记');
            quickActions.push('🏷️ 添加标签');
            quickActions.push('📤 分享笔记');
            quickActions.push('🗂️ 整理分类');
            break;

        case 'calendar':
            // Calendar suggestions
            relatedQueries.push('查看本周日程');
            relatedQueries.push('添加提醒');

            quickActions.push('⏰ 设置提醒');
            quickActions.push('📋 准备事项清单');
            quickActions.push('👥 邀请参与者');
            quickActions.push('🔄 设为重复');
            break;

        case 'reminder':
            // Reminder follow-ups
            relatedQueries.push('查看所有提醒');
            relatedQueries.push('设置周期提醒');

            quickActions.push('✏️ 修改提醒');
            quickActions.push('🔔 调整时间');
            quickActions.push('📅 关联日程');
            break;

        case 'location':
            // Location/place suggestions (enhanced restaurant handling)
            const isRestaurant = result?.type === 'restaurant' || queryLower.includes('餐厅') || queryLower.includes('吃');
            const isDateContext = context?.purpose === 'date' || queryLower.includes('约会');

            if (isRestaurant) {
                if (isDateContext) {
                    relatedQueries.push('附近咖啡厅');
                    relatedQueries.push('约会电影院');
                    quickActions.push('💐 附近花店');
                    quickActions.push('🎬 附近电影院');
                } else {
                    relatedQueries.push('附近停车场');
                    relatedQueries.push('其他餐厅推荐');
                }
                quickActions.push('📅 立即预订');
                quickActions.push('📞 电话咨询');
            } else {
                relatedQueries.push('附近景点');
                relatedQueries.push('附近餐厅');
                quickActions.push('🗺️ 导航');
                quickActions.push('⭐ 收藏地点');
            }
            break;

        case 'quick_write':
            // Writing assistance suggestions
            relatedQueries.push('更多风格选项');
            relatedQueries.push('相关表达方式');

            quickActions.push('📋 复制文本');
            quickActions.push('✏️ 微调内容');
            quickActions.push('🌐 翻译');
            quickActions.push('📤 直接发送');
            break;

        case 'search_assist':
            // OCR/Search assist suggestions
            if (result?.type === 'product') {
                relatedQueries.push('比价');
                quickActions.push('🔍 多平台比价');
            } else if (result?.type === 'address') {
                quickActions.push('🗺️ 开始导航');
            }
            quickActions.push('📋 复制内容');
            quickActions.push('💾 保存');
            break;

        default:
            // Generic suggestions based on query analysis
            if (queryLower.includes('怎么') || queryLower.includes('如何')) {
                relatedQueries.push(`${query.replace(/怎么|如何/g, '')} 教程`);
                relatedQueries.push(`${query.replace(/怎么|如何/g, '')} 视频`);
                quickActions.push('📖 详细步骤');
            }

            if (queryLower.includes('推荐')) {
                relatedQueries.push(`${query.replace('推荐', '')} 排行榜`);
                relatedQueries.push(`${query.replace('推荐', '')} 评测`);
            }

            // Time-based suggestions
            const hour = new Date().getHours();
            if (hour >= 11 && hour <= 13) {
                relatedQueries.push('附近午餐');
            } else if (hour >= 17 && hour <= 20) {
                relatedQueries.push('附近晚餐');
            }

            quickActions.push('💾 保存');
            quickActions.push('🔍 深入搜索');
            break;
    }

    // Add user preference-based suggestions
    if (prefs.behavior.adventurousness > 70) {
        relatedQueries.push('新奇体验推荐');
    }

    if (prefs.dining.priceRange === 'budget') {
        relatedQueries.push('性价比选择');
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
        suggestions.push('今日天气');
        suggestions.push('今日日程安排');
    }

    // Lunch suggestions (11am-1pm)
    if (hour >= 11 && hour <= 13) {
        suggestions.push('附近午餐推荐');
        if (prefs.dining.priceRange === 'budget') {
            suggestions.push('实惠午餐');
        }
    }

    // Dinner suggestions (5-8pm)
    if (hour >= 17 && hour <= 20) {
        suggestions.push('附近晚餐推荐');
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            suggestions.push('周末聚餐推荐');
        }
    }

    // Query-specific suggestions
    if (queryLower.includes('餐') || queryLower.includes('吃')) {
        if (prefs.dining.priceRange === 'luxury') {
            suggestions.push('推荐高档餐厅');
            suggestions.push('米其林餐厅');
        }
        if (prefs.dining.cuisinePreferences.length > 0) {
            suggestions.push(...prefs.dining.cuisinePreferences.map(c => `${c}餐厅推荐`));
        }
    }

    if (queryLower.includes('约会')) {
        suggestions.push('浪漫约会餐厅');
        suggestions.push('私密约会地点');
        suggestions.push('求婚餐厅推荐');
    }

    if (queryLower.includes('天气')) {
        suggestions.push('明天天气');
        suggestions.push('本周天气预报');
        suggestions.push('穿衣建议');
    }

    if (queryLower.includes('买') || queryLower.includes('购')) {
        suggestions.push('比价');
        suggestions.push('优惠券');
        suggestions.push('商品评测');
    }

    if (queryLower.includes('记') || queryLower.includes('笔记')) {
        suggestions.push('查看我的笔记');
        suggestions.push('创建待办事项');
    }

    if (queryLower.includes('提醒') || queryLower.includes('闹钟')) {
        suggestions.push('设置提醒');
        suggestions.push('查看待办');
    }

    if (queryLower.includes('日程') || queryLower.includes('安排')) {
        suggestions.push('今日日程');
        suggestions.push('添加日程');
    }

    if (queryLower.includes('写') || queryLower.includes('回复')) {
        suggestions.push('帮我回复消息');
        suggestions.push('正式回复');
        suggestions.push('轻松回复');
    }

    // If no specific match, provide general popular suggestions
    if (suggestions.length === 0) {
        suggestions.push('附近美食');
        suggestions.push('今日天气');
        suggestions.push('帮我记');
        suggestions.push('帮我写');
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

