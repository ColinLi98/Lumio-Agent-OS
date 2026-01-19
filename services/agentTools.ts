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
    displayType: 'weather' | 'calculator' | 'translation' | 'calendar' | 'reminder' | 'search' | 'text' | 'write_assist' | 'memory' | 'quick_actions';
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

        // Simulated search results (in production, call a real search API)
        const mockResults = [
            {
                title: `${query} - 最新资讯`,
                snippet: `关于"${query}"的最新信息和深度报道...`,
                url: `https://example.com/search?q=${encodeURIComponent(query)}&id=1`
            },
            {
                title: `${query}详解 - 专业指南`,
                snippet: `全面了解${query}的方方面面，专业知识汇总...`,
                url: `https://example.com/search?q=${encodeURIComponent(query)}&id=2`
            },
            {
                title: `${query}最新动态`,
                snippet: `实时追踪${query}的最新发展和趋势...`,
                url: `https://example.com/search?q=${encodeURIComponent(query)}&id=3`
            },
            {
                title: `如何理解${query}`,
                snippet: `深入浅出的${query}入门指南...`,
                url: `https://example.com/search?q=${encodeURIComponent(query)}&id=4`
            },
            {
                title: `${query}相关讨论`,
                snippet: `热门社区对${query}的讨论和观点...`,
                url: `https://example.com/search?q=${encodeURIComponent(query)}&id=5`
            }
        ];

        return {
            success: true,
            toolName: 'web_search',
            displayType: 'search',
            data: {
                query,
                results: mockResults.slice(0, limit),
                totalResults: mockResults.length,
                message: `找到 ${mockResults.length} 条关于"${query}"的结果`
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

/**
 * Location Tool - Find places and POIs
 */
const locationTool: AgentTool = {
    name: 'location',
    description: 'Search for places, restaurants, hotels, attractions, or other points of interest.',
    parameters: [
        { name: 'query', type: 'string', description: 'Place or area to search in', required: true },
        { name: 'type', type: 'string', description: 'Type of place', required: false, enum: ['restaurant', 'hotel', 'attraction', 'cafe', 'shopping', 'general'] }
    ],
    execute: async (params) => {
        const { query, type = 'general' } = params;

        // Simulated POI data (in production, call a real Maps API)
        const mockPOIs: Record<string, any[]> = {
            restaurant: [
                { name: '翠园酒楼', address: `${query}市中心商业街88号`, rating: 4.5, priceLevel: '¥¥¥', type: '粤菜' },
                { name: '海底捞火锅', address: `${query}万达广场3楼`, rating: 4.7, priceLevel: '¥¥¥', type: '火锅' },
                { name: '外婆家', address: `${query}购物中心B1层`, rating: 4.3, priceLevel: '¥¥', type: '杭帮菜' }
            ],
            hotel: [
                { name: '希尔顿酒店', address: `${query}金融中心1号`, rating: 4.8, priceLevel: '¥¥¥¥', type: '五星级' },
                { name: '全季酒店', address: `${query}火车站对面`, rating: 4.4, priceLevel: '¥¥', type: '商务型' },
                { name: '如家酒店', address: `${query}步行街旁`, rating: 4.1, priceLevel: '¥', type: '经济型' }
            ],
            attraction: [
                { name: `${query}博物馆`, address: `${query}文化路100号`, rating: 4.6, priceLevel: '免费', type: '博物馆' },
                { name: `${query}公园`, address: `${query}湖滨路`, rating: 4.5, priceLevel: '免费', type: '公园' },
                { name: `${query}古城`, address: `${query}老城区`, rating: 4.7, priceLevel: '¥', type: '历史古迹' }
            ],
            cafe: [
                { name: '星巴克咖啡', address: `${query}商业中心`, rating: 4.3, priceLevel: '¥¥', type: '连锁咖啡' },
                { name: '漫咖啡', address: `${query}创意园区`, rating: 4.5, priceLevel: '¥¥', type: '精品咖啡' }
            ],
            shopping: [
                { name: `${query}万达广场`, address: `${query}新区`, rating: 4.4, priceLevel: '¥¥¥', type: '购物中心' },
                { name: `${query}步行街`, address: `${query}市中心`, rating: 4.2, priceLevel: '¥¥', type: '商业街' }
            ],
            general: [
                { name: `${query}中心广场`, address: `${query}市中心`, rating: 4.3, priceLevel: '免费', type: '地标' },
                { name: `${query}火车站`, address: `${query}站前路`, rating: 4.0, priceLevel: '-', type: '交通枢纽' }
            ]
        };

        const pois = mockPOIs[type] || mockPOIs.general;

        return {
            success: true,
            toolName: 'location',
            displayType: 'search',
            data: {
                query,
                type,
                places: pois,
                message: `在${query}找到 ${pois.length} 个${type === 'general' ? '地点' : type}`
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
    description: '智能保存信息到本地。自动识别内容类型（日期、任务、链接、笔记等）并保存到合适的位置。',
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
        const storageKey = 'lumi_memory_graph';

        // 获取现有记忆
        const memories = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // 创建新记忆项
        const newMemory = {
            id: `mem-${Date.now()}`,
            type: detectedType,
            title: title || content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            content,
            metadata: {
                originalLength: content.length,
                hasTime: /\d{1,2}[:：]\d{2}/.test(content),
                hasDate: /\d{1,2}[月]\d{1,2}[日号]|明天|后天|下周/.test(content)
            },
            createdAt: Date.now(),
            source,
            tags: []
        };

        // 保存
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
                message: `已保存为${typeLabels[detectedType]}: "${newMemory.title}"`
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
    description: '比较商品在不同电商平台的价格，找到最优惠的购买渠道。',
    parameters: [
        { name: 'product', type: 'string', description: '商品名称或关键词', required: true },
        { name: 'budget', type: 'number', description: '预算上限（可选）', required: false }
    ],
    execute: async (params) => {
        const { product, budget } = params;

        // 模拟多平台比价结果（实际产品中会调用真实API）
        const mockPrices = [
            { platform: '京东', price: 1599, originalPrice: 1999, link: `https://jd.com/search?q=${encodeURIComponent(product)}`, icon: '🛒' },
            { platform: '淘宝', price: 1499, originalPrice: 1899, link: `https://taobao.com/search?q=${encodeURIComponent(product)}`, icon: '🧧' },
            { platform: '拼多多', price: 1299, originalPrice: 1799, link: `https://pdd.com/search?q=${encodeURIComponent(product)}`, icon: '🍑' },
            { platform: '苏宁', price: 1549, originalPrice: 1949, link: `https://suning.com/search?q=${encodeURIComponent(product)}`, icon: '🏪' }
        ];

        // 按价格排序
        const sortedPrices = mockPrices.sort((a, b) => a.price - b.price);

        // 如果有预算限制，过滤
        const filteredPrices = budget
            ? sortedPrices.filter(p => p.price <= budget)
            : sortedPrices;

        const lowestPrice = filteredPrices[0];
        const savings = lowestPrice ? lowestPrice.originalPrice - lowestPrice.price : 0;

        return {
            success: true,
            toolName: 'price_compare',
            displayType: 'quick_actions' as const,
            data: {
                product,
                budget,
                results: filteredPrices,
                lowestPrice: lowestPrice?.price,
                lowestPlatform: lowestPrice?.platform,
                savings,
                message: lowestPrice
                    ? `最低价 ¥${lowestPrice.price} 在${lowestPrice.platform}，可省 ¥${savings}`
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
