import { DecisionMeta } from '../types';

/**
 * Agent Tools - Define callable tools for Super Agent
 * Tools can be invoked via Gemini Function Calling
 */

// Tool parameter schema (JSON Schema format)
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    enum?: string[];
}

// Tool definition
export interface AgentTool {
    name: string;
    description: string;
    parameters: ToolParameter[];
    execute: (params: Record<string, any>) => Promise<ToolResult>;
}

// Tool execution result
export interface ToolResult {
    success: boolean;
    toolName: string;
    data?: any;
    error?: string;
    displayType: 'weather' | 'calculator' | 'translation' | 'calendar' | 'reminder' | 'search' | 'text' | 'write_assist' | 'memory' | 'quick_actions' | 'restaurant';
    decision?: DecisionMeta;
    // Universal smart suggestions (added from personalization service)
    smartSuggestions?: {
        relatedQueries: string[];
        quickActions: string[];
        context?: string;
    };
}


// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

/**
 * Weather Tool - Get weather for a location
 */
const weatherTool: AgentTool = {
    name: 'get_weather',
    description: 'Get current weather information for a specific city or location. Use this when user asks about weather conditions.',
    parameters: [
        { name: 'location', type: 'string', description: 'City name or location, e.g. "北京", "Shanghai", "Tokyo"', required: true },
        { name: 'unit', type: 'string', description: 'Temperature unit: "celsius" or "fahrenheit"', required: false, enum: ['celsius', 'fahrenheit'] }
    ],
    execute: async (params) => {
        // Simulated weather data (in real app, call weather API)
        const weatherData: Record<string, { temp: number; condition: string; humidity: number; wind: string }> = {
            '北京': { temp: -2, condition: '晴', humidity: 35, wind: '北风 3级' },
            '上海': { temp: 8, condition: '多云', humidity: 65, wind: '东风 2级' },
            '广州': { temp: 18, condition: '晴', humidity: 55, wind: '南风 2级' },
            '深圳': { temp: 20, condition: '晴', humidity: 60, wind: '东南风 2级' },
            '杭州': { temp: 6, condition: '小雨', humidity: 80, wind: '东北风 1级' },
            '成都': { temp: 10, condition: '阴', humidity: 70, wind: '微风' },
            'default': { temp: 15, condition: '晴', humidity: 50, wind: '微风' }
        };

        const location = params.location || '北京';
        const weather = weatherData[location] || weatherData['default'];
        const unit = params.unit || 'celsius';
        const temp = unit === 'fahrenheit' ? Math.round(weather.temp * 9 / 5 + 32) : weather.temp;

        return {
            success: true,
            toolName: 'get_weather',
            displayType: 'weather',
            data: {
                location,
                temperature: temp,
                unit: unit === 'fahrenheit' ? '°F' : '°C',
                condition: weather.condition,
                humidity: weather.humidity,
                wind: weather.wind,
                icon: getWeatherIcon(weather.condition)
            }
        };
    }
};

function getWeatherIcon(condition: string): string {
    const icons: Record<string, string> = {
        '晴': '☀️',
        '多云': '⛅',
        '阴': '☁️',
        '小雨': '🌧️',
        '大雨': '⛈️',
        '雪': '❄️',
        '雾': '🌫️'
    };
    return icons[condition] || '🌤️';
}

/**
 * Calculator Tool - Perform calculations
 */
const calculatorTool: AgentTool = {
    name: 'calculator',
    description: 'Perform mathematical calculations, unit conversions, or currency conversions. Use for any math-related queries.',
    parameters: [
        { name: 'expression', type: 'string', description: 'Mathematical expression to evaluate, e.g. "100 * 1.5", "sqrt(16)", "15% of 200"', required: true },
        { name: 'type', type: 'string', description: 'Type of calculation', required: false, enum: ['math', 'currency', 'unit'] },
        { name: 'from_currency', type: 'string', description: 'Source currency code for conversion', required: false },
        { name: 'to_currency', type: 'string', description: 'Target currency code for conversion', required: false }
    ],
    execute: async (params) => {
        try {
            const { expression, type, from_currency, to_currency } = params;

            // Currency conversion
            if (type === 'currency' && from_currency && to_currency) {
                // Simulated exchange rates
                const rates: Record<string, number> = {
                    'USD': 1, 'CNY': 7.25, 'EUR': 0.92, 'JPY': 148.5, 'GBP': 0.79, 'HKD': 7.82
                };
                const amount = parseFloat(expression) || 0;
                const fromRate = rates[from_currency.toUpperCase()] || 1;
                const toRate = rates[to_currency.toUpperCase()] || 1;
                const result = (amount / fromRate) * toRate;

                return {
                    success: true,
                    toolName: 'calculator',
                    displayType: 'calculator',
                    data: {
                        type: 'currency',
                        expression: `${amount} ${from_currency}`,
                        result: result.toFixed(2),
                        resultUnit: to_currency.toUpperCase(),
                        rate: `1 ${from_currency} = ${(toRate / fromRate).toFixed(4)} ${to_currency}`
                    }
                };
            }

            // Math calculation (safe evaluation)
            const sanitized = expression
                .replace(/[^0-9+\-*/().%\s]/g, '')
                .replace(/%/g, '/100*');

            // Use Function constructor for safe math evaluation
            const result = new Function(`return ${sanitized}`)();

            return {
                success: true,
                toolName: 'calculator',
                displayType: 'calculator',
                data: {
                    type: 'math',
                    expression: params.expression,
                    result: typeof result === 'number' ?
                        (Number.isInteger(result) ? result : result.toFixed(4)) : result
                }
            };
        } catch (error) {
            return {
                success: false,
                toolName: 'calculator',
                displayType: 'calculator',
                error: '计算错误，请检查表达式'
            };
        }
    }
};

/**
 * Translation Tool - Translate text between languages
 */
const translationTool: AgentTool = {
    name: 'translate',
    description: 'Translate text between languages. Supports Chinese, English, Japanese, Korean, etc.',
    parameters: [
        { name: 'text', type: 'string', description: 'Text to translate', required: true },
        { name: 'from_lang', type: 'string', description: 'Source language code (auto-detect if not specified)', required: false },
        { name: 'to_lang', type: 'string', description: 'Target language code', required: true, enum: ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'] }
    ],
    execute: async (params) => {
        // Note: In production, this would call Gemini or another translation API
        // For now, return a placeholder that signals geminiService to do the translation
        return {
            success: true,
            toolName: 'translate',
            displayType: 'translation',
            data: {
                originalText: params.text,
                fromLang: params.from_lang || 'auto',
                toLang: params.to_lang,
                // Translation will be filled in by geminiService
                translatedText: null,
                needsApiCall: true
            }
        };
    }
};

/**
 * Calendar Tool - Manage calendar events
 */
const calendarTool: AgentTool = {
    name: 'calendar',
    description: 'Create, view, or manage calendar events and schedules.',
    parameters: [
        { name: 'action', type: 'string', description: 'Action to perform', required: true, enum: ['create', 'list', 'delete'] },
        { name: 'title', type: 'string', description: 'Event title', required: false },
        { name: 'date', type: 'string', description: 'Event date (YYYY-MM-DD or relative like "tomorrow", "next Monday")', required: false },
        { name: 'time', type: 'string', description: 'Event time (HH:MM)', required: false },
        { name: 'duration', type: 'string', description: 'Event duration (e.g. "1h", "30m")', required: false }
    ],
    execute: async (params) => {
        const { action, title, date, time, duration } = params;
        const storageKey = 'lumi_calendar_events';

        // Get existing events from localStorage
        const existingEvents = JSON.parse(localStorage.getItem(storageKey) || '[]');

        if (action === 'create' && title) {
            const newEvent = {
                id: Date.now().toString(),
                title,
                date: date || new Date().toISOString().split('T')[0],
                time: time || '09:00',
                duration: duration || '1h',
                createdAt: new Date().toISOString()
            };
            existingEvents.push(newEvent);
            localStorage.setItem(storageKey, JSON.stringify(existingEvents));

            return {
                success: true,
                toolName: 'calendar',
                displayType: 'calendar',
                data: {
                    action: 'created',
                    event: newEvent,
                    message: `已创建日程: ${title}`
                }
            };
        }

        if (action === 'list') {
            return {
                success: true,
                toolName: 'calendar',
                displayType: 'calendar',
                data: {
                    action: 'list',
                    events: existingEvents.slice(-5), // Return last 5 events
                    message: existingEvents.length > 0 ? `找到 ${existingEvents.length} 个日程` : '暂无日程'
                }
            };
        }

        return {
            success: false,
            toolName: 'calendar',
            displayType: 'calendar',
            error: '无法完成日历操作'
        };
    }
};

/**
 * Reminder Tool - Create reminders
 */
const reminderTool: AgentTool = {
    name: 'reminder',
    description: 'Create a reminder or alarm for the user.',
    parameters: [
        { name: 'message', type: 'string', description: 'Reminder message content', required: true },
        { name: 'time', type: 'string', description: 'When to remind (e.g. "in 10 minutes", "at 3pm", "tomorrow 9am")', required: true }
    ],
    execute: async (params) => {
        const { message, time } = params;
        const storageKey = 'lumi_reminders';

        const reminders = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const newReminder = {
            id: Date.now().toString(),
            message,
            time,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        reminders.push(newReminder);
        localStorage.setItem(storageKey, JSON.stringify(reminders));

        return {
            success: true,
            toolName: 'reminder',
            displayType: 'reminder',
            data: {
                reminder: newReminder,
                message: `好的，我会在 ${time} 提醒你: "${message}"`
            }
        };
    }
};

/**
 * Web Search Tool - Search the internet
 */
const webSearchTool: AgentTool = {
    name: 'web_search',
    description: 'Search the internet for information. Use this when user wants to find information, news, or answers to questions.',
    parameters: [
        { name: 'query', type: 'string', description: 'Search query', required: true },
        { name: 'limit', type: 'number', description: 'Maximum number of results (default 5)', required: false }
    ],
    execute: async (params) => {
        const { query, limit = 5 } = params;

        // Get current date for context
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Generate real search URLs
        const searchResults = [
            {
                title: `${query} - Google搜索结果`,
                snippet: `在Google上搜索"${query}"的最新信息和相关内容...`,
                url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
            },
            {
                title: `${query} - 百度百科`,
                snippet: `了解${query}的详细介绍、相关知识和最新动态...`,
                url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`
            },
            {
                title: `${query}最新资讯 ${year}`,
                snippet: `${year}年${month}月关于"${query}"的最新新闻和报道...`,
                url: `https://www.bing.com/search?q=${encodeURIComponent(query + ' ' + year)}`
            },
            {
                title: `${query}相关讨论 - 知乎`,
                snippet: `知乎上关于${query}的热门问答和专业讨论...`,
                url: `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(query)}`
            },
            {
                title: `${query} - 维基百科`,
                snippet: `${query}的详细百科介绍和相关信息...`,
                url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(query)}`
            }
        ];

        return {
            success: true,
            toolName: 'web_search',
            displayType: 'search',
            data: {
                query,
                results: searchResults.slice(0, limit),
                totalResults: searchResults.length,
                message: `找到 ${searchResults.length} 条关于"${query}"的结果`,
                searchDate: now.toISOString()
            }
        };
    }
};

/**
 * Notes Tool - Manage personal notes
 */
const notesTool: AgentTool = {
    name: 'notes',
    description: 'Create, list, or search personal notes. Use for saving thoughts, ideas, or information.',
    parameters: [
        { name: 'action', type: 'string', description: 'Action to perform', required: true, enum: ['create', 'list', 'search'] },
        { name: 'title', type: 'string', description: 'Note title (for create)', required: false },
        { name: 'content', type: 'string', description: 'Note content (for create)', required: false },
        { name: 'query', type: 'string', description: 'Search query (for search)', required: false }
    ],
    execute: async (params) => {
        const { action, title, content, query } = params;
        const storageKey = 'lumi_notes';

        const notes = JSON.parse(localStorage.getItem(storageKey) || '[]');

        if (action === 'create' && title) {
            const newNote = {
                id: Date.now().toString(),
                title,
                content: content || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notes.push(newNote);
            localStorage.setItem(storageKey, JSON.stringify(notes));

            return {
                success: true,
                toolName: 'notes',
                displayType: 'text',
                data: {
                    action: 'created',
                    note: newNote,
                    message: `📝 已创建笔记: "${title}"`
                }
            };
        }

        if (action === 'list') {
            return {
                success: true,
                toolName: 'notes',
                displayType: 'text',
                data: {
                    action: 'list',
                    notes: notes.slice(-10), // Last 10 notes
                    total: notes.length,
                    message: notes.length > 0 ? `共有 ${notes.length} 条笔记` : '暂无笔记'
                }
            };
        }

        if (action === 'search' && query) {
            const results = notes.filter((n: any) =>
                n.title.includes(query) || n.content.includes(query)
            );
            return {
                success: true,
                toolName: 'notes',
                displayType: 'text',
                data: {
                    action: 'search',
                    query,
                    notes: results,
                    message: results.length > 0 ? `找到 ${results.length} 条相关笔记` : '未找到相关笔记'
                }
            };
        }

        return {
            success: false,
            toolName: 'notes',
            displayType: 'text',
            error: '无法完成笔记操作'
        };
    }
};

const CUISINE_HINTS = [
    '烧烤', '烤肉', '火锅', '日料', '寿司', '拉面', '粤菜', '川菜', '湘菜',
    '东北菜', '杭帮菜', '小吃', '海鲜'
];

const CUISINE_ALIAS: Record<string, string> = {
    '烤肉': '烧烤'
};

function detectCuisineHint(query: string): string | null {
    const match = CUISINE_HINTS.find((hint) => query.includes(hint));
    if (!match) return null;
    return CUISINE_ALIAS[match] || match;
}

function extractPriceRangeFromQuery(query: string): { min: number; max: number } | null {
    const rangeMatch = query.match(/(\d{2,4})\s*(?:-|~|到)\s*(\d{2,4})/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        if (Number.isFinite(min) && Number.isFinite(max)) {
            return { min, max };
        }
    }
    const singleMatch = query.match(/人均\s*\D*(\d{2,4})/);
    if (singleMatch) {
        const value = parseInt(singleMatch[1], 10);
        if (Number.isFinite(value)) {
            return { min: value, max: value };
        }
    }
    return null;
}

function extractPriceValue(priceRange?: string): number | null {
    if (!priceRange) return null;
    const match = priceRange.match(/(\d{2,4})/);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
}

const DEFAULT_DIANPING_CITY_ID = 1;

function buildDianpingSearchUrl(keyword: string, cityId = DEFAULT_DIANPING_CITY_ID): string {
    return `https://m.dianping.com/search/keyword/${cityId}/0_${encodeURIComponent(keyword)}`;
}

function buildFallbackBbqRestaurants(query: string, priceRange: { min: number; max: number } | null) {
    const mid = priceRange ? Math.round((priceRange.min + priceRange.max) / 2) : 120;
    const priceLabel = priceRange ? `人均 ¥${priceRange.min}-${priceRange.max}` : `人均 ¥${mid}`;
    const baseAddress = '市中心热门商圈';

    return [
        {
            name: '老街炭火烧烤',
            address: baseAddress,
            rating: 4.6,
            reviewCount: 1860,
            priceLevel: '¥¥',
            priceRange: priceLabel,
            type: '烧烤',
            cuisine: '烧烤',
            atmosphere: ['夜宵人气', '朋友聚会'],
            signature: ['羊肉串', '烤鸡翅', '炭烤牛肋'],
            dianpingUrl: buildDianpingSearchUrl(`老街炭火烧烤 ${query}`),
            bookingAvailable: false
        },
        {
            name: '烟火烤肉屋',
            address: baseAddress,
            rating: 4.5,
            reviewCount: 1240,
            priceLevel: '¥¥',
            priceRange: priceLabel,
            type: '烧烤',
            cuisine: '烧烤',
            atmosphere: ['烟火气', '下班小聚'],
            signature: ['肥牛卷', '烤鱿鱼', '秘制蘸料'],
            dianpingUrl: buildDianpingSearchUrl(`烟火烤肉屋 ${query}`),
            bookingAvailable: true
        },
        {
            name: '深夜串场',
            address: baseAddress,
            rating: 4.4,
            reviewCount: 980,
            priceLevel: '¥¥',
            priceRange: priceLabel,
            type: '烧烤',
            cuisine: '烧烤',
            atmosphere: ['深夜食堂', '轻松聊天'],
            signature: ['牛肉串', '烤玉米', '烤茄子'],
            dianpingUrl: buildDianpingSearchUrl(`深夜串场 ${query}`),
            bookingAvailable: false
        }
    ];
}

function buildFallbackHotpotRestaurants(query: string, priceRange: { min: number; max: number } | null) {
    const mid = priceRange ? Math.round((priceRange.min + priceRange.max) / 2) : 140;
    const priceLabel = priceRange ? `人均 ¥${priceRange.min}-${priceRange.max}` : `人均 ¥${mid}`;
    const baseAddress = '核心商圈';
    const photos = [
        'https://images.unsplash.com/photo-1604908554081-186880ea8fa5?auto=format&fit=crop&w=900&q=60',
        'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=60'
    ];

    return [
        {
            name: '小龙坎老火锅',
            address: `${query}${baseAddress}`,
            rating: 4.6,
            reviewCount: 2860,
            priceLevel: '¥¥',
            priceRange: priceLabel,
            type: '川渝火锅',
            cuisine: '火锅',
            atmosphere: ['麻辣过瘾', '朋友聚会'],
            signature: ['牛油红锅', '毛肚', '黄喉'],
            photos,
            menu: [
                { name: '牛油红锅', price: '¥58' },
                { name: '鲜毛肚', price: '¥68' }
            ],
            reviewHighlights: [
                { author: '阿泽', rating: 4.6, text: '锅底香，辣度正好。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`小龙坎 ${query}`),
            bookingAvailable: false
        },
        {
            name: '蜀大侠火锅',
            address: `${query}${baseAddress}`,
            rating: 4.5,
            reviewCount: 2140,
            priceLevel: '¥¥',
            priceRange: priceLabel,
            type: '川渝火锅',
            cuisine: '火锅',
            atmosphere: ['热闹', '晚餐首选'],
            signature: ['九宫格锅底', '手切牛肉', '鲜鸭血'],
            photos,
            menu: [
                { name: '九宫格锅底', price: '¥68' },
                { name: '手切牛肉', price: '¥88' }
            ],
            reviewHighlights: [
                { author: 'Mia', rating: 4.5, text: '菜品丰富，性价比高。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`蜀大侠火锅 ${query}`),
            bookingAvailable: true
        },
        {
            name: '捞王锅物料理',
            address: `${query}${baseAddress}`,
            rating: 4.4,
            reviewCount: 1780,
            priceLevel: '¥¥',
            priceRange: priceLabel,
            type: '港式火锅',
            cuisine: '火锅',
            atmosphere: ['清淡养生', '家庭聚餐'],
            signature: ['胡椒猪肚鸡', '手打牛肉丸'],
            photos,
            menu: [
                { name: '胡椒猪肚鸡', price: '¥98' },
                { name: '手打牛肉丸', price: '¥46' }
            ],
            reviewHighlights: [
                { author: '小雨', rating: 4.4, text: '汤底很香，适合不吃辣。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`捞王火锅 ${query}`),
            bookingAvailable: true
        }
    ];
}

function buildHotpotRestaurants(query: string) {
    const baseAddress = query.includes('外滩') ? '黄浦区外滩源商圈' : `${query}核心商圈`;
    const photos = [
        'https://images.unsplash.com/photo-1604908554081-186880ea8fa5?auto=format&fit=crop&w=900&q=60',
        'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=60'
    ];

    return [
        {
            name: '海底捞火锅',
            address: `${baseAddress}东延安路`,
            rating: 4.7,
            reviewCount: 5678,
            priceLevel: '¥¥¥',
            priceRange: '人均 ¥150',
            type: '火锅',
            cuisine: '火锅',
            atmosphere: ['服务一流', '朋友聚会'],
            signature: ['番茄锅底', '捞派牛肉', '小酥肉'],
            photos,
            menu: [
                { name: '番茄锅底', price: '¥48' },
                { name: '捞派牛肉', price: '¥78' }
            ],
            reviewHighlights: [
                { author: '阿超', rating: 4.7, text: '服务细致，环境干净。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`海底捞 ${query}`),
            bookingAvailable: true,
            hours: '10:00-02:00',
            waitTime: '晚高峰需排队'
        },
        {
            name: '小龙坎老火锅',
            address: `${baseAddress}南京东路`,
            rating: 4.6,
            reviewCount: 3210,
            priceLevel: '¥¥',
            priceRange: '人均 ¥128',
            type: '川渝火锅',
            cuisine: '火锅',
            atmosphere: ['麻辣过瘾', '夜宵人气'],
            signature: ['牛油红锅', '毛肚', '黄喉'],
            photos,
            menu: [
                { name: '牛油红锅', price: '¥58' },
                { name: '鲜毛肚', price: '¥68' }
            ],
            reviewHighlights: [
                { author: 'Lynn', rating: 4.6, text: '辣味正宗，氛围热闹。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`小龙坎 ${query}`),
            bookingAvailable: false,
            hours: '11:00-01:00'
        },
        {
            name: '蜀大侠火锅',
            address: `${baseAddress}豫园路`,
            rating: 4.5,
            reviewCount: 2390,
            priceLevel: '¥¥',
            priceRange: '人均 ¥135',
            type: '川渝火锅',
            cuisine: '火锅',
            atmosphere: ['朋友聚会', '火辣氛围'],
            signature: ['九宫格锅底', '手切牛肉', '鲜鸭血'],
            photos,
            menu: [
                { name: '九宫格锅底', price: '¥68' },
                { name: '手切牛肉', price: '¥88' }
            ],
            reviewHighlights: [
                { author: '阿健', rating: 4.5, text: '菜品新鲜，性价比高。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`蜀大侠火锅 ${query}`),
            bookingAvailable: true,
            hours: '11:00-00:30'
        },
        {
            name: '捞王锅物料理',
            address: `${baseAddress}陆家嘴商圈`,
            rating: 4.4,
            reviewCount: 1865,
            priceLevel: '¥¥',
            priceRange: '人均 ¥118',
            type: '港式火锅',
            cuisine: '火锅',
            atmosphere: ['清淡养生', '家庭聚餐'],
            signature: ['胡椒猪肚鸡', '手打牛肉丸'],
            photos,
            menu: [
                { name: '胡椒猪肚鸡', price: '¥98' },
                { name: '手打牛肉丸', price: '¥46' }
            ],
            reviewHighlights: [
                { author: '小北', rating: 4.4, text: '汤底温润，适合不吃辣。' }
            ],
            dianpingUrl: buildDianpingSearchUrl(`捞王火锅 ${query}`),
            bookingAvailable: true,
            hours: '11:00-22:30'
        }
    ];
}

/**
 * Location Tool - Find places and POIs
 */
const locationTool: AgentTool = {
    name: 'location',
    description: 'Search for places, restaurants, hotels, attractions, or other points of interest. For restaurants, provides detailed info including menus, prices, reviews.',
    parameters: [
        { name: 'query', type: 'string', description: 'Place or area to search in', required: true },
        { name: 'type', type: 'string', description: 'Type of place', required: false, enum: ['restaurant', 'hotel', 'attraction', 'cafe', 'shopping', 'general'] },
        { name: 'purpose', type: 'string', description: 'Purpose of visit (e.g., date, business, family)', required: false }
    ],
    execute: async (params) => {
        const { query, type = 'general', purpose = '' } = params;

        // Enhanced restaurant data with detailed information
        const restaurantData = [
            {
                name: 'TRB Hutong 庭院餐厅',
                address: '北京东城区沙滩北街23号',
                rating: 4.8,
                reviewCount: 2847,
                priceLevel: '¥¥¥¥',
                priceRange: '人均 ¥680',
                type: '西餐·法式',
                atmosphere: ['约会圣地', '浪漫氛围', '私密包间'],
                highlights: ['米其林推荐', '故宫旁边', '历史建筑改造'],
                signature: ['法式鹅肝', '惠灵顿牛排', '黑松露意面'],
                photos: [
                    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=60',
                    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60'
                ],
                menu: [
                    { name: '法式鹅肝', price: '¥168', note: '主厨招牌' },
                    { name: '惠灵顿牛排', price: '¥320', note: '双人可分享' }
                ],
                reviewHighlights: [
                    { author: '小雅', rating: 4.8, text: '氛围很浪漫，适合约会。' },
                    { author: 'Ethan', rating: 4.7, text: '服务细致，菜品精致。' }
                ],
                phone: '010-84020088',
                hours: '11:30-14:30, 17:30-22:00',
                dianpingUrl: buildDianpingSearchUrl('TRB Hutong 庭院餐厅 北京'),
                meituanUrl: 'https://www.meituan.com/',
                bookingAvailable: true,
                waitTime: '建议提前3天预订'
            },
            {
                name: 'Ling Long 玲珑',
                address: '北京朝阳区三里屯太古里北区N8-52',
                rating: 4.7,
                reviewCount: 1923,
                priceLevel: '¥¥¥¥',
                priceRange: '人均 ¥520',
                type: '创意融合菜',
                atmosphere: ['约会首选', '网红打卡', '景观位'],
                highlights: ['360°玻璃穹顶', '日落美景', '创意摆盘'],
                signature: ['和牛塔塔', '松露菌菇汤', '分子料理甜点'],
                photos: [
                    'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&w=900&q=60',
                    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60'
                ],
                menu: [
                    { name: '和牛塔塔', price: '¥188', note: '冷前菜' },
                    { name: '松露菌菇汤', price: '¥98', note: '暖胃推荐' }
                ],
                reviewHighlights: [
                    { author: 'Lily', rating: 4.8, text: '景色漂亮，出片率高。' },
                    { author: '阿杰', rating: 4.6, text: '口味有创意，适合约会。' }
                ],
                phone: '010-64177818',
                hours: '11:00-14:00, 17:00-22:30',
                dianpingUrl: buildDianpingSearchUrl('Ling Long 玲珑 北京'),
                meituanUrl: 'https://www.meituan.com/',
                bookingAvailable: true,
                waitTime: '建议提前1天预订'
            },
            {
                name: 'Opera BOMBANA 意大利餐厅',
                address: '北京朝阳区金融街购物中心LG层',
                rating: 4.9,
                reviewCount: 3156,
                priceLevel: '¥¥¥¥',
                priceRange: '人均 ¥850',
                type: '意大利菜',
                atmosphere: ['奢华氛围', '求婚胜地', 'VIP包厢'],
                highlights: ['米其林一星', 'Umberto Bombana主理', '顶级食材'],
                signature: ['白松露意面', '48个月帕尔马火腿', '提拉米苏'],
                photos: [
                    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=60',
                    'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=60'
                ],
                menu: [
                    { name: '白松露意面', price: '¥380', note: '季节限定' },
                    { name: '提拉米苏', price: '¥88', note: '甜点口碑' }
                ],
                reviewHighlights: [
                    { author: 'Mark', rating: 4.9, text: '服务与食材都很顶级。' },
                    { author: 'Coco', rating: 4.8, text: '氛围高级，适合庆祝。' }
                ],
                phone: '010-65051799',
                hours: '12:00-14:30, 18:00-22:00',
                dianpingUrl: buildDianpingSearchUrl('Opera BOMBANA 北京'),
                meituanUrl: 'https://www.meituan.com/',
                bookingAvailable: true,
                waitTime: '建议提前1周预订'
            },
            {
                name: '大董烤鸭店 (工体店)',
                address: '北京朝阳区工体东路2号',
                rating: 4.6,
                reviewCount: 8234,
                priceLevel: '¥¥¥',
                priceRange: '人均 ¥320',
                type: '北京菜·烤鸭',
                atmosphere: ['商务宴请', '情侣约会', '品质保证'],
                highlights: ['酥不腻烤鸭', '艺术摆盘', '传统与创新结合'],
                signature: ['酥不腻烤鸭', '乌鱼子炒饭', '董氏烧海参'],
                photos: [
                    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=60',
                    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60'
                ],
                menu: [
                    { name: '酥不腻烤鸭', price: '¥298', note: '招牌菜' },
                    { name: '董氏烧海参', price: '¥268', note: '适合宴请' }
                ],
                reviewHighlights: [
                    { author: '阿米', rating: 4.6, text: '烤鸭口感很好，服务专业。' },
                    { author: 'Leo', rating: 4.5, text: '适合商务接待。' }
                ],
                phone: '010-65828803',
                hours: '11:00-14:00, 17:00-21:30',
                dianpingUrl: buildDianpingSearchUrl('大董烤鸭 北京'),
                meituanUrl: 'https://www.meituan.com/',
                bookingAvailable: true,
                waitTime: '建议提前预订'
            },
            {
                name: 'Atmosphere 天空餐厅',
                address: '北京朝阳区国贸大酒店80层',
                rating: 4.7,
                reviewCount: 1567,
                priceLevel: '¥¥¥¥',
                priceRange: '人均 ¥750',
                type: '西餐·景观餐厅',
                atmosphere: ['360°高空美景', '浪漫夕阳', '求婚圣地'],
                highlights: ['北京最高餐厅', 'CBD全景', '现场乐队'],
                signature: ['澳洲和牛', '波士顿龙虾', '甜点拼盘'],
                photos: [
                    'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&w=900&q=60',
                    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=60'
                ],
                menu: [
                    { name: '澳洲和牛', price: '¥388', note: '主厨推荐' },
                    { name: '波士顿龙虾', price: '¥428', note: '双人可分享' }
                ],
                reviewHighlights: [
                    { author: 'Sophia', rating: 4.7, text: '夜景很棒，氛围适合庆祝。' },
                    { author: '凯文', rating: 4.6, text: '服务到位，菜品稳定。' }
                ],
                phone: '010-65052299',
                hours: '17:30-23:00',
                dianpingUrl: buildDianpingSearchUrl('Atmosphere 天空餐厅 北京'),
                meituanUrl: 'https://www.meituan.com/',
                bookingAvailable: true,
                waitTime: '需提前预约靠窗位'
            }
        ];

        // Filter based on query keywords
        const isDatePurpose = purpose.includes('约会') || purpose.includes('date') ||
            query.includes('约会') || query.includes('浪漫') || query.includes('情侣');

        // Simulated POI data (in production, call a real Maps API)
        const mockPOIs: Record<string, any[]> = {
            restaurant: isDatePurpose ? restaurantData : [
                {
                    name: '翠园酒楼',
                    address: `${query}市中心商业街88号`,
                    rating: 4.5,
                    reviewCount: 1256,
                    priceLevel: '¥¥¥',
                    priceRange: '人均 ¥180',
                    type: '粤菜',
                    atmosphere: ['家庭聚餐', '商务宴请'],
                    signature: ['白切鸡', '烧鹅', '虾饺'],
                    dianpingUrl: buildDianpingSearchUrl(`翠园酒楼 ${query}`),
                    bookingAvailable: true
                },
                {
                    name: '外婆家',
                    address: `${query}购物中心B1层`,
                    rating: 4.3,
                    reviewCount: 3421,
                    priceLevel: '¥¥',
                    priceRange: '人均 ¥75',
                    type: '杭帮菜',
                    atmosphere: ['性价比高', '家常菜'],
                    signature: ['麻婆豆腐', '茶香鸡', '西湖醋鱼'],
                    dianpingUrl: buildDianpingSearchUrl(`外婆家 ${query}`),
                    bookingAvailable: false
                }
            ],
            hotel: [
                { name: '希尔顿酒店', address: `${query}金融中心1号`, rating: 4.8, reviewCount: 2345, priceLevel: '¥¥¥¥', priceRange: '¥1200起/晚', type: '五星级', dianpingUrl: buildDianpingSearchUrl(`希尔顿 ${query}`) },
                { name: '全季酒店', address: `${query}火车站对面`, rating: 4.4, reviewCount: 1876, priceLevel: '¥¥', priceRange: '¥380起/晚', type: '商务型', dianpingUrl: buildDianpingSearchUrl(`全季酒店 ${query}`) },
                { name: '如家酒店', address: `${query}步行街旁`, rating: 4.1, reviewCount: 2567, priceLevel: '¥', priceRange: '¥180起/晚', type: '经济型', dianpingUrl: buildDianpingSearchUrl(`如家 ${query}`) }
            ],
            attraction: [
                { name: `${query}博物馆`, address: `${query}文化路100号`, rating: 4.6, reviewCount: 8765, priceLevel: '免费', type: '博物馆', dianpingUrl: buildDianpingSearchUrl(`${query}博物馆`) },
                { name: `${query}公园`, address: `${query}湖滨路`, rating: 4.5, reviewCount: 4532, priceLevel: '免费', type: '公园', dianpingUrl: buildDianpingSearchUrl(`${query}公园`) },
                { name: `${query}古城`, address: `${query}老城区`, rating: 4.7, reviewCount: 6789, priceLevel: '¥60', type: '历史古迹', dianpingUrl: buildDianpingSearchUrl(`${query}古城`) }
            ],
            cafe: [
                { name: '星巴克咖啡', address: `${query}商业中心`, rating: 4.3, reviewCount: 567, priceLevel: '¥¥', priceRange: '人均 ¥45', type: '连锁咖啡', dianpingUrl: buildDianpingSearchUrl(`星巴克 ${query}`) },
                { name: '% Arabica', address: `${query}太古里`, rating: 4.6, reviewCount: 1234, priceLevel: '¥¥', priceRange: '人均 ¥50', type: '精品咖啡', dianpingUrl: buildDianpingSearchUrl(`%Arabica ${query}`) }
            ],
            shopping: [
                { name: `${query}万达广场`, address: `${query}新区`, rating: 4.4, reviewCount: 3456, priceLevel: '¥¥¥', type: '购物中心', dianpingUrl: buildDianpingSearchUrl(`${query}万达广场`) },
                { name: `${query}步行街`, address: `${query}市中心`, rating: 4.2, reviewCount: 2345, priceLevel: '¥¥', type: '商业街', dianpingUrl: buildDianpingSearchUrl(`${query}步行街`) }
            ],
            general: [
                { name: `${query}中心广场`, address: `${query}市中心`, rating: 4.3, reviewCount: 1234, priceLevel: '免费', type: '地标', dianpingUrl: buildDianpingSearchUrl(`${query}中心广场`) },
                { name: `${query}火车站`, address: `${query}站前路`, rating: 4.0, reviewCount: 5678, priceLevel: '-', type: '交通枢纽', dianpingUrl: buildDianpingSearchUrl(`${query}火车站`) }
            ]
        };

        let pois = mockPOIs[type] || mockPOIs.general;

        if (type === 'restaurant') {
            const cuisineHint = detectCuisineHint(query);
            const priceRange = extractPriceRangeFromQuery(query);

            if (cuisineHint === '火锅') {
                pois = buildHotpotRestaurants(query);
            }

            if (cuisineHint) {
                pois = pois.filter((place: any) => {
                    const tag = `${place.type || ''}${place.cuisine || ''}`;
                    return tag.includes(cuisineHint);
                });
            }

            if (priceRange) {
                pois = pois.filter((place: any) => {
                    const price = extractPriceValue(place.priceRange || place.priceLevel);
                    if (!price) return true;
                    return price >= priceRange.min && price <= priceRange.max;
                });
            }

            if (pois.length === 0 && (cuisineHint || priceRange)) {
                const fallbackCuisine = cuisineHint || '烧烤';
                if (fallbackCuisine === '烧烤') {
                    pois = buildFallbackBbqRestaurants(query, priceRange);
                } else if (fallbackCuisine === '火锅') {
                    pois = buildFallbackHotpotRestaurants(query, priceRange);
                }
            }
        }

        // Apply personalization to results
        let personalizedPlaces = pois;
        try {
            const { personalizeResults, getUserPreferences } = await import('./personalizationService');
            const prefs = getUserPreferences();
            const personalized = personalizeResults(query, pois, { purpose: isDatePurpose ? 'date' : purpose });

            // Add personalization data to each place
            personalizedPlaces = personalized.map(rec => ({
                ...rec.originalData,
                matchScore: rec.analysis.matchScore,
                matchReasons: rec.analysis.matchReasons,
                personalNote: rec.analysis.personalNote,
                warnings: rec.analysis.warnings,
                relatedQueries: rec.suggestions.relatedQueries,
                followUpActions: rec.suggestions.followUpActions,
            }));
        } catch (e) {
            console.warn('Personalization not available:', e);
        }

        return {
            success: true,
            toolName: 'location',
            displayType: 'restaurant', // Use specialized display for restaurants
            data: {
                query,
                type,
                purpose: isDatePurpose ? 'date' : purpose,
                places: personalizedPlaces,
                isPersonalized: personalizedPlaces !== pois,
                message: isDatePurpose
                    ? `为您精选 ${personalizedPlaces.length} 家${query}约会餐厅`
                    : `在${query}找到 ${personalizedPlaces.length} 个${type === 'general' ? '地点' : type}`
            }
        };
    }
};

/**
 * Quick Write Tool - 帮我写：快速生成写作内容
 * 支持多种场景和风格的写作辅助
 * 支持 AI 模式（需要 apiKey）和离线模板模式
 */
const quickWriteTool: AgentTool = {
    name: 'quick_write',
    description: '快速生成写作内容，适用于回复消息、发朋友圈、写邮件等场景。根据上下文生成多种风格的内容建议。',
    parameters: [
        { name: 'context', type: 'string', description: '写作主题或需要表达的内容', required: true },
        { name: 'style', type: 'string', description: '写作风格', required: false, enum: ['professional', 'casual', 'humorous', 'formal', 'concise', 'warm'] },
        { name: 'scenario', type: 'string', description: '使用场景', required: false, enum: ['reply', 'post', 'email', 'message', 'comment'] },
        { name: 'length', type: 'string', description: '内容长度', required: false, enum: ['short', 'medium', 'long'] },
        { name: 'useAI', type: 'boolean', description: '是否使用 AI 生成（需要 API Key）', required: false },
        { name: 'chatHistory', type: 'string', description: 'JSON 格式的聊天历史', required: false },
        { name: 'apiKey', type: 'string', description: 'Gemini API Key', required: false }
    ],
    execute: async (params) => {
        const { context, style = 'casual', scenario = 'message', length = 'medium', useAI = false, chatHistory, apiKey } = params;

        // 风格名称映射
        const styleNames: Record<string, string> = {
            professional: '专业',
            casual: '轻松',
            humorous: '幽默',
            formal: '正式',
            concise: '简洁',
            warm: '温暖'
        };

        // 风格图标
        const styleEmojis: Record<string, string> = {
            professional: '👔',
            casual: '😊',
            humorous: '😄',
            formal: '📋',
            concise: '⚡',
            warm: '❤️'
        };

        // AI 模式：尝试调用 Gemini
        if (useAI && apiKey) {
            try {
                // 动态导入 geminiService 避免循环依赖
                const { generateDrafts } = await import('./geminiService');

                const history = chatHistory ? JSON.parse(chatHistory) : [];

                // Map style to valid SoulMatrix communicationStyle
                const commStyleMap = {
                    professional: 'Professional',
                    casual: 'Casual',
                    humorous: 'Friendly',
                    formal: 'Professional',
                    concise: 'Concise',
                    warm: 'Friendly'
                } as const;

                const soulMatrix = {
                    communicationStyle: commStyleMap[style as keyof typeof commStyleMap] || 'Casual' as const,
                    riskTolerance: 'Medium' as const,
                    privacyLevel: 'Balanced' as const
                };

                const aiDrafts = await generateDrafts(context, soulMatrix, apiKey, history, scenario);

                if (aiDrafts && aiDrafts.length > 0) {
                    return {
                        success: true,
                        toolName: 'quick_write',
                        displayType: 'write_assist' as const,
                        data: {
                            context,
                            style,
                            styleName: styleNames[style] || style,
                            styleEmoji: styleEmojis[style] || '✍️',
                            scenario,
                            isAI: true,
                            drafts: aiDrafts.map((draft, i) => ({
                                id: draft.id || `draft-ai-${Date.now()}-${i}`,
                                text: draft.text,
                                tone: draft.tone || style,
                                toneName: styleNames[draft.tone] || styleNames[style] || draft.tone,
                                toneEmoji: styleEmojis[draft.tone] || styleEmojis[style] || '✍️'
                            })),
                            message: `🤖 AI 生成了 ${aiDrafts.length} 条回复建议`
                        }
                    };
                }
            } catch (error) {
                console.warn('AI generation failed, falling back to templates:', error);
                // 继续使用模板 fallback
            }
        }

        // 离线模板模式 (Fallback)
        const styleTemplates: Record<string, (ctx: string) => Array<{ text: string, tone: string }>> = {
            professional: (ctx) => [
                { text: `关于${ctx}，我认为我们需要认真考虑相关因素后再做决定。`, tone: 'professional' },
                { text: `感谢您的提议。关于${ctx}，我会尽快给您一个详细的回复。`, tone: 'professional' },
                { text: `收到关于${ctx}的消息，我会安排时间处理此事。`, tone: 'professional' }
            ],
            casual: (ctx) => [
                { text: `${ctx}这个嘛，让我想想～`, tone: 'casual' },
                { text: `哈哈，说到${ctx}，我觉得挺有意思的！`, tone: 'casual' },
                { text: `${ctx}啊，好的好的，没问题！`, tone: 'casual' }
            ],
            humorous: (ctx) => [
                { text: `${ctx}？这个问题问得好，让我假装思考一下... 🤔`, tone: 'humorous' },
                { text: `关于${ctx}，我的答案是：取决于今天的心情 😄`, tone: 'humorous' },
                { text: `${ctx}这事儿嘛，说来话长，但总结起来就是：可以！`, tone: 'humorous' }
            ],
            formal: (ctx) => [
                { text: `尊敬的相关方，关于${ctx}一事，特此回复如下...`, tone: 'formal' },
                { text: `经过慎重考虑，针对${ctx}，我方意见如下...`, tone: 'formal' },
                { text: `就${ctx}相关事宜，现答复如下...`, tone: 'formal' }
            ],
            concise: (ctx) => [
                { text: `好的，${ctx}没问题。`, tone: 'concise' },
                { text: `收到，${ctx}。`, tone: 'concise' },
                { text: `OK，${ctx}安排上了。`, tone: 'concise' }
            ],
            warm: (ctx) => [
                { text: `谢谢你告诉我${ctx}，我很感动～`, tone: 'warm' },
                { text: `关于${ctx}，我觉得你做得很棒！继续加油！`, tone: 'warm' },
                { text: `${ctx}这件事，不用担心，一切都会好起来的 ❤️`, tone: 'warm' }
            ]
        };

        const drafts = styleTemplates[style]?.(context) || styleTemplates.casual(context);

        return {
            success: true,
            toolName: 'quick_write',
            displayType: 'write_assist' as const,
            data: {
                context,
                style,
                styleName: styleNames[style] || style,
                styleEmoji: styleEmojis[style] || '✍️',
                scenario,
                isAI: false,
                drafts: drafts.map((draft, i) => ({
                    id: `draft-${Date.now()}-${i}`,
                    text: draft.text,
                    tone: draft.tone,
                    toneName: styleNames[draft.tone] || draft.tone,
                    toneEmoji: styleEmojis[draft.tone] || '✍️'
                })),
                message: `📝 生成了 ${drafts.length} 条 ${styleNames[style] || style} 风格的内容`
            }
        };
    }
};


/**
 * Smart Save Tool - 帮我记：智能保存信息
 * 自动识别信息类型并保存到合适位置
 */
const smartSaveTool: AgentTool = {
    name: 'smart_save',
    description: '智能保存信息到本地。自动识别内容类型（日期、任务、链接、笔记等）并通过 MemR³ 智能记忆系统保存。',
    parameters: [
        { name: 'content', type: 'string', description: '要保存的内容', required: true },
        { name: 'type', type: 'string', description: '内容类型（可选，会自动识别）', required: false, enum: ['event', 'task', 'note', 'link', 'contact'] },
        { name: 'title', type: 'string', description: '标题（可选）', required: false },
        { name: 'source', type: 'string', description: '来源（如：微信、小红书等）', required: false }
    ],
    execute: async (params) => {
        const { content, type, title, source = 'Lumi' } = params;

        // 自动类型识别
        const detectType = (text: string): 'event' | 'task' | 'note' | 'link' | 'contact' => {
            if (/\d{1,2}[月:]\d{1,2}[日号]|\d{1,2}[:：]\d{2}|明天|后天|下周|周[一二三四五六日天]/.test(text)) {
                return 'event';
            }
            if (/待办|要做|记得|别忘|需要|必须/.test(text)) {
                return 'task';
            }
            if (/https?:\/\/|www\./.test(text)) {
                return 'link';
            }
            if (/1[3-9]\d{9}|[\w.-]+@[\w.-]+/.test(text)) {
                return 'contact';
            }
            return 'note';
        };

        const detectedType = type || detectType(content);

        // 🆕 使用 MemR³ 智能记忆系统
        let memR3Memory = null;
        try {
            const { rememberThis } = await import('./memr3Service');

            // 映射类型到 MemR³ 类型
            const typeMap: Record<string, 'note' | 'event' | 'preference' | 'fact' | 'interaction'> = {
                'event': 'event',
                'task': 'note',
                'note': 'note',
                'link': 'fact',
                'contact': 'fact'
            };

            // 自动提取标签
            const autoTags: string[] = [detectedType, source];
            if (title) autoTags.push(title);

            // 存储到 MemR³
            memR3Memory = rememberThis(
                content,
                typeMap[detectedType] || 'note',
                autoTags.filter(t => t.length > 0)
            );
            console.log('[smartSaveTool] MemR³ 存储成功:', memR3Memory.id);
        } catch (memError) {
            console.log('[smartSaveTool] MemR³ 不可用，使用 localStorage 后备');
        }

        // 兼容旧版 localStorage 存储（保持数据一致性）
        const storageKey = 'lumi_memory_graph';
        const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const newMemory = {
            id: memR3Memory?.id || `mem-${Date.now()}`,
            type: detectedType,
            title: title || content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            content,
            metadata: {
                originalLength: content.length,
                hasTime: /\d{1,2}[:：]\d{2}/.test(content),
                hasDate: /\d{1,2}[月]\d{1,2}[日号]|明天|后天|下周/.test(content),
                memR3Id: memR3Memory?.id // 关联 MemR³ 记忆
            },
            createdAt: Date.now(),
            source,
            tags: memR3Memory?.metadata.tags || []
        };

        memories.push(newMemory);
        localStorage.setItem(storageKey, JSON.stringify(memories));

        // 如果是日程类型，同时保存到日历
        if (detectedType === 'event') {
            const calendarEvents = JSON.parse(localStorage.getItem('lumi_calendar_events') || '[]');
            calendarEvents.push({
                id: newMemory.id,
                title: newMemory.title,
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                duration: '1h',
                createdAt: new Date().toISOString(),
                fromMemory: true
            });
            localStorage.setItem('lumi_calendar_events', JSON.stringify(calendarEvents));
        }

        // 如果是任务类型，保存到提醒
        if (detectedType === 'task') {
            const reminders = JSON.parse(localStorage.getItem('lumi_reminders') || '[]');
            reminders.push({
                id: newMemory.id,
                message: newMemory.content,
                time: '稍后',
                createdAt: new Date().toISOString(),
                status: 'pending',
                fromMemory: true
            });
            localStorage.setItem('lumi_reminders', JSON.stringify(reminders));
        }

        const typeLabels: Record<string, string> = {
            event: '📅 日程',
            task: '✅ 待办',
            note: '📝 笔记',
            link: '🔗 链接',
            contact: '👤 联系人'
        };

        return {
            success: true,
            toolName: 'smart_save',
            displayType: 'memory' as const,
            data: {
                memory: newMemory,
                typeLabel: typeLabels[detectedType] || '📝 笔记',
                totalMemories: memories.length,
                message: `已保存为${typeLabels[detectedType]}: "${newMemory.title}"`,
                memR3Enabled: !!memR3Memory // 指示是否使用了 MemR³
            }
        };
    }
};

/**
 * Price Compare Tool - 帮我找：比价功能
 * 跨平台比较商品价格
 */
const priceCompareTool: AgentTool = {
    name: 'price_compare',
    description: '比较商品在不同电商平台的价格，找到最优惠的购买渠道。支持指定平台（如 Amazon）。',
    parameters: [
        { name: 'product', type: 'string', description: '商品名称或关键词', required: true },
        { name: 'budget', type: 'number', description: '预算上限（可选）', required: false },
        { name: 'platform', type: 'string', description: '指定平台（可选）', required: false, enum: ['all', 'amazon', 'jd', 'taobao', 'pdd'] }
    ],
    execute: async (params) => {
        const { product, budget, platform = 'all' } = params;

        // 智能识别商品类别并估算真实价格范围
        const estimateBasePrice = (productName: string): { basePrice: number, category: string } => {
            const lowerName = productName.toLowerCase();

            // 高端手机
            if (/(fold|z flip|galaxy.*z|华为.*mate.*x)/i.test(lowerName)) {
                return { basePrice: 12999, category: '折叠屏手机' };
            }
            if (/(iphone.*pro.*max|iphone.*16)/i.test(lowerName)) {
                return { basePrice: 9999, category: '旗舰手机' };
            }
            if (/(iphone|galaxy.*s2|pixel)/i.test(lowerName)) {
                return { basePrice: 6999, category: '智能手机' };
            }
            // 笔记本电脑
            if (/(macbook|thinkpad|surface)/i.test(lowerName)) {
                return { basePrice: 8999, category: '笔记本电脑' };
            }
            // 平板
            if (/(ipad|galaxy tab|华为.*pad)/i.test(lowerName)) {
                return { basePrice: 3999, category: '平板电脑' };
            }
            // 耳机
            if (/(airpods|耳机|headphone)/i.test(lowerName)) {
                return { basePrice: 1299, category: '耳机' };
            }
            // 手表
            if (/(apple watch|手表|watch)/i.test(lowerName)) {
                return { basePrice: 2999, category: '智能手表' };
            }
            // 默认消费电子
            return { basePrice: 999, category: '电子产品' };
        };

        const { basePrice, category } = estimateBasePrice(product);

        // 生成各平台价格（基于基准价格的浮动）
        const generatePlatformPrices = (base: number) => {
            const variation = () => Math.round(base * (0.95 + Math.random() * 0.15)); // ±5-15%
            return {
                amazon: Math.round(base * 1.05), // Amazon 通常略贵（国际）
                jd: variation(),
                taobao: variation(),
                pdd: Math.round(base * 0.92), // 拼多多通常最便宜
                suning: variation()
            };
        };

        const prices = generatePlatformPrices(basePrice);

        // 构建所有平台数据
        const allPlatforms = [
            {
                platform: 'Amazon',
                price: prices.amazon,
                originalPrice: Math.round(prices.amazon * 1.15),
                link: `https://www.amazon.com/s?k=${encodeURIComponent(product)}`,
                icon: '📦',
                currency: '$',
                displayPrice: `$${Math.round(prices.amazon / 7.2)}` // 粗略美元转换
            },
            {
                platform: '京东',
                price: prices.jd,
                originalPrice: Math.round(prices.jd * 1.12),
                link: `https://search.jd.com/Search?keyword=${encodeURIComponent(product)}`,
                icon: '🛒',
                currency: '¥',
                displayPrice: `¥${prices.jd}`
            },
            {
                platform: '淘宝',
                price: prices.taobao,
                originalPrice: Math.round(prices.taobao * 1.18),
                link: `https://s.taobao.com/search?q=${encodeURIComponent(product)}`,
                icon: '🧧',
                currency: '¥',
                displayPrice: `¥${prices.taobao}`
            },
            {
                platform: '拼多多',
                price: prices.pdd,
                originalPrice: Math.round(prices.pdd * 1.25),
                link: `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(product)}`,
                icon: '🍑',
                currency: '¥',
                displayPrice: `¥${prices.pdd}`
            },
            {
                platform: '苏宁',
                price: prices.suning,
                originalPrice: Math.round(prices.suning * 1.10),
                link: `https://search.suning.com/${encodeURIComponent(product)}/`,
                icon: '🏪',
                currency: '¥',
                displayPrice: `¥${prices.suning}`
            }
        ];

        // 根据用户指定平台过滤
        let filteredPlatforms = allPlatforms;
        if (platform !== 'all') {
            const platformMap: Record<string, string> = {
                'amazon': 'Amazon',
                'jd': '京东',
                'taobao': '淘宝',
                'pdd': '拼多多'
            };
            const targetPlatform = platformMap[platform.toLowerCase()];
            if (targetPlatform) {
                filteredPlatforms = allPlatforms.filter(p => p.platform === targetPlatform);
            }
        }

        // 按价格排序
        const sortedPrices = filteredPlatforms.sort((a, b) => a.price - b.price);

        // 如果有预算限制，过滤
        const budgetFiltered = budget
            ? sortedPrices.filter(p => p.price <= budget)
            : sortedPrices;

        const lowestPrice = budgetFiltered[0];
        const savings = lowestPrice ? lowestPrice.originalPrice - lowestPrice.price : 0;

        return {
            success: true,
            toolName: 'price_compare',
            displayType: 'quick_actions' as const,
            data: {
                product,
                category,
                budget,
                requestedPlatform: platform,
                results: budgetFiltered.map(p => ({
                    ...p,
                    savings: p.originalPrice - p.price
                })),
                lowestPrice: lowestPrice?.price,
                lowestPlatform: lowestPrice?.platform,
                savings,
                message: lowestPrice
                    ? `${category} "${product}" 最低价 ${lowestPrice.displayPrice} 在${lowestPrice.platform}，可省 ¥${savings}`
                    : '暂无符合条件的商品'
            }
        };
    }
};

/**
 * Search Assist Tool - 帮我找：智能搜索助手
 * 模拟 OCR 识别并提供多种快捷操作
 */
const searchAssistTool: AgentTool = {
    name: 'search_assist',
    description: '智能搜索助手。识别内容类型（商品、地址、链接等）并提供相应操作（比价、导航、收藏、搜索）。',
    parameters: [
        { name: 'content', type: 'string', description: '要处理的内容（文字、商品名、地址等）', required: true },
        { name: 'action', type: 'string', description: '操作类型', required: false, enum: ['auto', 'compare', 'navigate', 'save', 'search'] }
    ],
    execute: async (params) => {
        const { content, action = 'auto' } = params;

        // 自动识别内容类型
        const detectType = (text: string): 'product' | 'address' | 'link' | 'book' | 'general' => {
            if (/https?:\/\/|www\./.test(text)) return 'link';
            if (/市|区|路|街|号|楼|层|室/.test(text)) return 'address';
            if (/《.*》|书|作者/.test(text)) return 'book';
            if (/买|价|元|￥|¥|购|商品/.test(text)) return 'product';
            return 'general';
        };

        const contentType = detectType(content);

        // 根据内容类型生成不同的快捷操作
        const generateActions = (type: string, text: string) => {
            switch (type) {
                case 'product':
                    return {
                        type: 'product',
                        title: text,
                        actions: [
                            { id: 'compare', type: 'compare_price', label: '🔍 比价', icon: '💰', data: { product: text }, actionUri: `https://jd.com/search?q=${encodeURIComponent(text)}` },
                            { id: 'save', type: 'save', label: '💾 收藏', icon: '⭐', data: { content: text, type: 'interest' } },
                            { id: 'search', type: 'search', label: '🔎 搜索', icon: '🌐', data: { query: text }, actionUri: `https://www.baidu.com/s?wd=${encodeURIComponent(text)}` }
                        ]
                    };
                case 'address':
                    return {
                        type: 'address',
                        title: text,
                        actions: [
                            { id: 'navigate', type: 'navigate', label: '🗺️ 导航', icon: '📍', data: { address: text }, actionUri: `https://map.baidu.com/search/${encodeURIComponent(text)}` },
                            { id: 'copy', type: 'copy', label: '📋 复制', icon: '📋', data: { content: text } },
                            { id: 'save', type: 'save', label: '💾 保存', icon: '⭐', data: { content: text, type: 'note' } }
                        ]
                    };
                case 'link':
                    return {
                        type: 'link',
                        title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
                        actions: [
                            { id: 'open', type: 'open_app', label: '🌐 打开', icon: '🔗', data: { url: text }, actionUri: text },
                            { id: 'save', type: 'save', label: '📖 稍后读', icon: '📑', data: { content: text, type: 'link' } },
                            { id: 'copy', type: 'copy', label: '📋 复制', icon: '📋', data: { content: text } }
                        ]
                    };
                case 'book':
                    const bookName = text.match(/《(.+?)》/)?.[1] || text;
                    return {
                        type: 'book',
                        title: bookName,
                        actions: [
                            { id: 'buy', type: 'compare_price', label: '📚 购买', icon: '🛒', data: { product: bookName }, actionUri: `https://search.jd.com/Search?keyword=${encodeURIComponent(bookName)}` },
                            { id: 'read', type: 'search', label: '📖 试读', icon: '👀', data: { query: bookName + ' 在线阅读' }, actionUri: `https://weread.qq.com/web/search/global?keyword=${encodeURIComponent(bookName)}` },
                            { id: 'save', type: 'save', label: '💾 收藏', icon: '⭐', data: { content: bookName, type: 'interest' } }
                        ]
                    };
                default:
                    return {
                        type: 'general',
                        title: text.slice(0, 30),
                        actions: [
                            { id: 'search', type: 'search', label: '🔎 搜索', icon: '🌐', data: { query: text }, actionUri: `https://www.baidu.com/s?wd=${encodeURIComponent(text)}` },
                            { id: 'save', type: 'save', label: '💾 保存', icon: '⭐', data: { content: text, type: 'note' } },
                            { id: 'copy', type: 'copy', label: '📋 复制', icon: '📋', data: { content: text } }
                        ]
                    };
            }
        };

        const result = generateActions(contentType, content);

        return {
            success: true,
            toolName: 'search_assist',
            displayType: 'quick_actions' as const,
            data: {
                contentType: result.type,
                content,
                title: result.title,
                quickActions: result.actions,
                message: `识别为${contentType === 'product' ? '商品' : contentType === 'address' ? '地址' : contentType === 'link' ? '链接' : contentType === 'book' ? '书籍' : '文本'}，提供 ${result.actions.length} 个快捷操作`
            }
        };
    }
};

// =============================================================================
// UNIVERSAL SUGGESTIONS HELPER
// =============================================================================

/**
 * Enrich a tool result with universal smart suggestions
 * This wrapper adds context-aware suggestions to any tool result
 */
export async function enrichWithSuggestions(
    result: ToolResult,
    query: string,
    context?: { purpose?: string }
): Promise<ToolResult> {
    if (!result.success) return result;

    try {
        const { generateUniversalSuggestions } = await import('./personalizationService');
        const suggestions = generateUniversalSuggestions(query, result.toolName, result.data, context);

        const { buildOptimalDecision } = await import('./optimalAnswerService');
        const decision = buildOptimalDecision({
            query,
            toolName: result.toolName,
            displayType: result.displayType,
            data: result.data
        });

        return {
            ...result,
            smartSuggestions: suggestions,
            decision: decision || result.decision,
            data: {
                ...result.data,
                // Also add to data for backwards compatibility with existing components
                relatedQueries: suggestions.relatedQueries,
                quickActions: suggestions.quickActions,
            }
        };
    } catch (e) {
        console.warn('Failed to enrich with suggestions:', e);
        return result;
    }
}

/**
 * Execute a tool and automatically add smart suggestions
 */
export async function executeToolWithSuggestions(
    toolName: string,
    params: Record<string, any>,
    query: string,
    context?: { purpose?: string }
): Promise<ToolResult> {
    const tool = getToolByName(toolName);
    if (!tool) {
        return {
            success: false,
            toolName,
            displayType: 'text',
            error: `Unknown tool: ${toolName}`
        };
    }

    const result = await tool.execute(params);
    return enrichWithSuggestions(result, query, context);
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================


export const AGENT_TOOLS: AgentTool[] = [
    weatherTool,
    calculatorTool,
    translationTool,
    calendarTool,
    reminderTool,
    webSearchTool,
    notesTool,
    locationTool,
    // 三大核心功能工具
    quickWriteTool,
    smartSaveTool,
    priceCompareTool,
    searchAssistTool
];


export const getToolByName = (name: string): AgentTool | undefined => {
    return AGENT_TOOLS.find(t => t.name === name);
};

// Convert tools to Gemini Function Declaration format
export const getGeminiFunctionDeclarations = () => {
    // Import Type enum values as strings that Gemini SDK expects
    const typeMap: Record<string, string> = {
        'string': 'STRING',
        'number': 'NUMBER',
        'boolean': 'BOOLEAN',
        'object': 'OBJECT',
        'array': 'ARRAY'
    };

    return AGENT_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
            type: 'OBJECT',
            properties: tool.parameters.reduce((acc, param) => {
                acc[param.name] = {
                    type: typeMap[param.type] || 'STRING',
                    description: param.description,
                    ...(param.enum && { enum: param.enum })
                };
                return acc;
            }, {} as Record<string, any>),
            required: tool.parameters.filter(p => p.required).map(p => p.name)
        }
    }));
};
