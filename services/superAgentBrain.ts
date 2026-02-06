/**
 * Super Agent Brain - Global Optimizer & Meta-Orchestrator
 * 
 * This is the "Super Brain" that:
 * 1. Deeply analyzes user intent
 * 2. Decomposes complex problems into optimal sub-tasks
 * 3. Routes tasks to the best specialized agents
 * 4. Synthesizes results into global optimal solutions
 */

import { SpecializedAgentType } from '../types';
import { SPECIALIZED_AGENTS, executeSpecializedAgent } from './specializedAgents';
import { getEnhancedDigitalAvatar } from './localStorageService';

// ============================================================================
// Types
// ============================================================================

export interface SubTask {
    id: string;
    description: string;
    agentType: SpecializedAgentType;
    priority: number;  // 1 = highest
    dependsOn: string[];  // IDs of tasks this depends on
    params: Record<string, any>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
}

export interface TaskDecomposition {
    originalRequest: string;
    userIntent: string;
    implicitNeeds: string[];
    constraints: string[];
    subTasks: SubTask[];
    optimizationGoal: string;
    reasoning: string;
}

export interface GlobalSolution {
    success: boolean;
    summary: string;
    results: Array<{
        taskId: string;
        agentType: string;
        result: any;
    }>;
    recommendation: string;
    optimizationScore: number;  // 0-100
    reasoning: string;
    executionTime: number;
    associatedSuggestions?: Array<{
        id: string;
        category: 'related_need' | 'reminder' | 'tip' | 'warning' | 'opportunity';
        icon: string;
        title: string;
        description: string;
        actionText?: string;
        actionQuery?: string;
        priority: number;
    }>;
}

// ============================================================================
// Agent Registry with Capabilities
// ============================================================================

interface AgentCapability {
    type: SpecializedAgentType;
    domains: string[];
    capabilities: string[];
    costWeight: number;  // Lower = cheaper to use
    qualityWeight: number;  // Higher = better quality
}

const AGENT_CAPABILITIES: AgentCapability[] = [
    {
        type: 'flight_booking',
        domains: ['travel', 'transportation', 'flights', 'airlines'],
        capabilities: ['search flights', 'compare prices', 'book tickets'],
        costWeight: 0.8,
        qualityWeight: 0.9
    },
    {
        type: 'hotel_booking',
        domains: ['travel', 'accommodation', 'hotels', 'lodging'],
        capabilities: ['search hotels', 'compare prices', 'check availability'],
        costWeight: 0.7,
        qualityWeight: 0.9
    },
    {
        type: 'restaurant',
        domains: ['food', 'dining', 'restaurants', 'cuisine'],
        capabilities: ['find restaurants', 'check reviews', 'make reservations'],
        costWeight: 0.5,
        qualityWeight: 0.8
    },
    {
        type: 'attraction',
        domains: ['tourism', 'sightseeing', 'activities', 'entertainment'],
        capabilities: ['find attractions', 'get reviews', 'plan activities'],
        costWeight: 0.4,
        qualityWeight: 0.8
    },
    {
        type: 'weather',
        domains: ['weather', 'climate', 'forecast'],
        capabilities: ['get forecast', 'weather alerts', 'travel advice'],
        costWeight: 0.2,
        qualityWeight: 0.95
    },
    {
        type: 'itinerary',
        domains: ['planning', 'schedule', 'trip planning'],
        capabilities: ['create itinerary', 'optimize schedule', 'time management'],
        costWeight: 0.6,
        qualityWeight: 0.85
    },
    {
        type: 'translation',
        domains: ['language', 'translation', 'communication'],
        capabilities: ['translate text', 'language help'],
        costWeight: 0.3,
        qualityWeight: 0.9
    },
    {
        type: 'transportation',
        domains: ['transportation', 'transfer', 'airport'],
        capabilities: ['airport transfer', 'ground transport', 'time planning'],
        costWeight: 0.4,
        qualityWeight: 0.8
    }
];

// ============================================================================
// Problem Analysis (using Gemini or pattern matching)
// ============================================================================

/**
 * Analyze user request and decompose into sub-tasks
 * Uses LLM when available, falls back to pattern matching
 */
export async function analyzeAndDecompose(
    userRequest: string,
    apiKey?: string
): Promise<TaskDecomposition> {
    let decomposition: TaskDecomposition | null = null;

    // Try LLM-based analysis if API key available
    if (apiKey) {
        try {
            decomposition = await llmBasedDecomposition(userRequest, apiKey);
        } catch (e) {
            console.warn('LLM decomposition failed, using pattern matching:', e);
        }
    }

    // Fallback to pattern-based decomposition
    if (!decomposition) {
        decomposition = patternBasedDecomposition(userRequest);
    }

    return normalizeTravelDecomposition(decomposition, userRequest);
}

/**
 * LLM-based problem decomposition using Gemini
 */
async function llmBasedDecomposition(
    userRequest: string,
    apiKey: string
): Promise<TaskDecomposition> {
    const prompt = `You are a Super Agent Brain that decomposes complex user requests into optimal sub-tasks.

User Request: "${userRequest}"

Analyze this request and provide a JSON response with:
{
  "userIntent": "The true underlying need",
  "implicitNeeds": ["List of needs user didn't explicitly state but would want"],
  "constraints": ["Budget limits", "Time constraints", "Preferences"],
  "subTasks": [
    {
      "id": "t1",
      "description": "Task description",
      "agentType": "One of: flight_booking, hotel_booking, restaurant, attraction, weather, itinerary, transportation, translation",
      "priority": 1,
      "dependsOn": [],
      "params": {}
    }
  ],
  "optimizationGoal": "What 'optimal' means for this request",
  "reasoning": "Explanation of the decomposition strategy"
}

Think step by step about dependencies between tasks. For travel requests, weather should inform activity planning, flight costs should inform hotel budget, etc.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    maxOutputTokens: 2000
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
        originalRequest: userRequest,
        userIntent: parsed.userIntent,
        implicitNeeds: parsed.implicitNeeds || [],
        constraints: parsed.constraints || [],
        subTasks: parsed.subTasks.map((t: any) => ({
            ...t,
            status: 'pending' as const
        })),
        optimizationGoal: parsed.optimizationGoal,
        reasoning: parsed.reasoning
    };
}

// =============================================================================
// Travel Helpers
// =============================================================================

const COMMON_CITIES = [
    '伦敦', 'london',
    '大连', 'dalian',
    '北京', 'beijing',
    '上海', 'shanghai',
    '广州', 'guangzhou',
    '深圳', 'shenzhen',
    '杭州', 'hangzhou',
    '成都', 'chengdu',
    '香港', 'hong kong',
    '东京', 'tokyo',
    '大阪', 'osaka',
    '巴黎', 'paris',
    '纽约', 'new york',
    '首尔', 'seoul',
    '曼谷', 'bangkok',
    '新加坡', 'singapore'
];

const LOCATION_NOISE = [
    '机票', '航班', '飞机', '航线', '票', '酒店', '住宿', '旅行', '旅游', '出行', '攻略', '路线',
    'flight', 'flights', 'ticket', 'tickets', 'hotel', 'travel', 'trip', 'route'
];

const LOCATION_HINT_STOPWORDS = [
    '附近', '本地', '当地', '这里', '那里', '这边', '那边', '目的地', '市中心', '市区'
];

const LOCATION_HINT_PATTERNS = [
    /在\s*([A-Za-z\u4e00-\u9fa5]{2,16})\s*(?:吃|美食|餐厅|饭店|小吃|玩|住|酒店|天气|景点|旅游|旅行|攻略)/i,
    /([A-Za-z\u4e00-\u9fa5]{2,16})(?:美食|餐厅|饭店|小吃|酒店|住宿|景点|天气|旅游|旅行|攻略)/i
];

function sanitizeLocationToken(value: string): string {
    let token = value.trim();
    token = token.replace(/[，,。.!?]+/g, '');
    token = token.replace(/^(从|到|去|飞往|前往)\s*/g, '');
    token = token.replace(/^(中国|中国大陆|中国地区)\s*/g, '');
    const noisePattern = new RegExp(`(${LOCATION_NOISE.join('|')})+$`, 'i');
    token = token.replace(noisePattern, '');
    return token.trim();
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildDate(year: number, month: number, day: number): Date | null {
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    if (date.getMonth() + 1 !== month || date.getDate() !== day) return null;
    return date;
}

function nextWeekday(targetDay: number, baseDate: Date, offsetWeeks: number): Date {
    const currentDay = baseDate.getDay();
    let delta = (targetDay - currentDay + 7) % 7;
    if (delta === 0) delta = 7;
    delta += offsetWeeks * 7;
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + delta);
}

export function extractDepartureDate(userRequest: string): string | null {
    const text = userRequest.toLowerCase();
    const today = new Date();

    const fullMatch = text.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
    if (fullMatch) {
        const date = buildDate(parseInt(fullMatch[1], 10), parseInt(fullMatch[2], 10), parseInt(fullMatch[3], 10));
        if (date) return formatDate(date);
    }

    const monthDayMatch = text.match(/(\d{1,2})[\/\-.月](\d{1,2})(?:日|号)?/);
    if (monthDayMatch) {
        const month = parseInt(monthDayMatch[1], 10);
        const day = parseInt(monthDayMatch[2], 10);
        let year = today.getFullYear();
        let date = buildDate(year, month, day);
        if (date && date < today) {
            year += 1;
            date = buildDate(year, month, day);
        }
        if (date) return formatDate(date);
    }

    if (text.includes('明天') || text.includes('tomorrow')) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        return formatDate(date);
    }
    if (text.includes('后天')) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
        return formatDate(date);
    }
    if (text.includes('大后天')) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
        return formatDate(date);
    }

    const nextWeekMatch = text.match(/下周([一二三四五六日天])/);
    if (nextWeekMatch) {
        const map: Record<string, number> = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        const targetDay = map[nextWeekMatch[1]];
        const date = nextWeekday(targetDay, today, 1);
        return formatDate(date);
    }

    const weekDayMatch = text.match(/周([一二三四五六日天])/);
    if (weekDayMatch) {
        const map: Record<string, number> = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
        const targetDay = map[weekDayMatch[1]];
        const date = nextWeekday(targetDay, today, 0);
        return formatDate(date);
    }

    if (text.includes('next week')) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
        return formatDate(date);
    }

    const englishDayMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (englishDayMatch) {
        const map: Record<string, number> = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
            thursday: 4, friday: 5, saturday: 6
        };
        const targetDay = map[englishDayMatch[1]];
        const date = nextWeekday(targetDay, today, text.includes('next') ? 1 : 0);
        return formatDate(date);
    }

    return null;
}

export function extractDepartureTimePreference(
    userRequest: string
): 'morning' | 'afternoon' | 'evening' | 'night' | null {
    if (/(早上|上午|早班|morning)/i.test(userRequest)) return 'morning';
    if (/(下午|afternoon)/i.test(userRequest)) return 'afternoon';
    if (/(晚上|傍晚|evening)/i.test(userRequest)) return 'evening';
    if (/(深夜|夜间|night)/i.test(userRequest)) return 'night';
    return null;
}

export function extractRoute(userRequest: string): { origin?: string; destination?: string } {
    const directMatch = userRequest.match(/从\s*([^\s到]+)\s*到\s*([^\s]+)|([^\s]+)\s*到\s*([^\s]+)/);
    if (directMatch) {
        const origin = directMatch[1] || directMatch[3];
        const destination = directMatch[2] || directMatch[4];
        const cleanOrigin = origin ? sanitizeLocationToken(origin) : origin;
        const cleanDestination = destination ? sanitizeLocationToken(destination) : destination;
        if (cleanOrigin && cleanDestination && cleanOrigin !== cleanDestination) {
            return { origin: cleanOrigin, destination: cleanDestination };
        }
    }

    const lowerRequest = userRequest.toLowerCase();
    const matched = COMMON_CITIES
        .map((city) => ({ city, index: lowerRequest.indexOf(city.toLowerCase()) }))
        .filter((item) => item.index >= 0)
        .sort((a, b) => a.index - b.index);

    if (matched.length >= 2) {
        return {
            origin: sanitizeLocationToken(matched[0].city),
            destination: sanitizeLocationToken(matched[1].city)
        };
    }

    if (matched.length === 1) {
        return { destination: sanitizeLocationToken(matched[0].city) };
    }

    return {};
}

function extractLocationHint(userRequest: string): string | undefined {
    const route = extractRoute(userRequest);
    const direct = route.destination || route.origin;
    if (direct) return direct;

    for (const pattern of LOCATION_HINT_PATTERNS) {
        const match = userRequest.match(pattern);
        if (match?.[1]) {
            const cleaned = sanitizeLocationToken(match[1]).replace(/的$/g, '').trim();
            if (cleaned && !LOCATION_HINT_STOPWORDS.includes(cleaned)) {
                return cleaned;
            }
        }
    }

    return undefined;
}

function buildOptimizationGoal(): string {
    const avatar = getEnhancedDigitalAvatar();
    const priceVsQuality = avatar.valuesProfile?.priceVsQuality ?? 0;
    const stability = avatar.valuesProfile?.stability ?? 50;
    const efficiency = avatar.valuesProfile?.efficiency ?? 50;
    const multitasking = avatar.behaviorPatterns?.multitaskingTendency ?? 50;

    const priceFocus = priceVsQuality < -20 ? '成本优先' : priceVsQuality > 20 ? '舒适优先' : '性价比优先';
    const stabilityFocus = stability > 65 ? '尽量减少中转' : '中转可接受';
    const efficiencyFocus = efficiency > 65 ? '缩短总耗时' : '时间要求灵活';
    const paceFocus = multitasking > 65 ? '行程紧凑' : multitasking < 40 ? '行程舒缓' : '行程平衡';

    return `综合偏好：${priceFocus}、${stabilityFocus}、${efficiencyFocus}、${paceFocus}`;
}

function normalizeTravelDecomposition(
    decomposition: TaskDecomposition,
    userRequest: string
): TaskDecomposition {
    const isTravel = /旅行|旅游|出行|行程|trip|travel|机票|航班/i.test(userRequest);
    const route = extractRoute(userRequest);
    const locationHint = extractLocationHint(userRequest);
    const tasks = decomposition.subTasks.map((task) => {
        const params = { ...(task.params || {}) };
        if (locationHint && ['hotel_booking', 'weather', 'attraction', 'restaurant', 'itinerary', 'transportation'].includes(task.agentType)) {
            if (!params.destination) {
                params.destination = locationHint;
            }
        }
        if (route.origin && ['flight_booking', 'transportation'].includes(task.agentType)) {
            if (!params.origin) params.origin = route.origin;
        }
        if (route.destination && ['flight_booking', 'transportation'].includes(task.agentType)) {
            if (!params.destination) params.destination = route.destination;
        }
        return { ...task, params };
    });

    if (!isTravel) {
        return { ...decomposition, subTasks: tasks };
    }
    const departureDate = extractDepartureDate(userRequest);
    const departureTimePreference = extractDepartureTimePreference(userRequest);
    const travelTasks = [...tasks];
    let nextId = tasks.length + 1;

    const hasAgent = (type: SpecializedAgentType) => travelTasks.some(t => t.agentType === type);
    const addTask = (task: Omit<SubTask, 'id' | 'status'>) => {
        travelTasks.push({
            ...task,
            id: `t${nextId++}`,
            status: 'pending'
        });
    };

    if (!hasAgent('weather')) {
        addTask({
            description: `Check weather forecast for ${route.destination || 'destination'}`,
            agentType: 'weather',
            priority: 1,
            dependsOn: [],
            params: { destination: route.destination }
        });
    }

    if (!hasAgent('flight_booking')) {
        addTask({
            description: `Search flights to ${route.destination || 'destination'}`,
            agentType: 'flight_booking',
            priority: 1,
            dependsOn: [],
            params: { origin: route.origin, destination: route.destination, departureDate }
        });
    }

    if (!hasAgent('hotel_booking')) {
        addTask({
            description: `Find hotels in ${route.destination || 'destination'}`,
            agentType: 'hotel_booking',
            priority: 2,
            dependsOn: [],
            params: { destination: route.destination }
        });
    }

    if (!hasAgent('restaurant')) {
        addTask({
            description: `Find restaurants in ${route.destination || 'destination'}`,
            agentType: 'restaurant',
            priority: 3,
            dependsOn: [],
            params: { destination: route.destination }
        });
    }

    if (!hasAgent('attraction')) {
        addTask({
            description: `Discover attractions in ${route.destination || 'destination'}`,
            agentType: 'attraction',
            priority: 2,
            dependsOn: [],
            params: { destination: route.destination }
        });
    }

    if (!hasAgent('transportation')) {
        const flightTask = travelTasks.find(t => t.agentType === 'flight_booking');
        addTask({
            description: `Plan airport transfer and ground transport`,
            agentType: 'transportation',
            priority: 3,
            dependsOn: flightTask ? [flightTask.id] : [],
            params: { origin: route.origin, destination: route.destination, departureDate }
        });
    }

    if (!hasAgent('itinerary')) {
        addTask({
            description: `Create optimized itinerary for ${route.destination || 'destination'}`,
            agentType: 'itinerary',
            priority: 4,
            dependsOn: travelTasks.filter(t => ['weather', 'flight_booking', 'hotel_booking', 'attraction', 'restaurant', 'transportation'].includes(t.agentType))
                .map(t => t.id),
            params: { destination: route.destination }
        });
    }

    travelTasks.forEach((task) => {
        const destination = route.destination || task.params?.destination;
        const origin = route.origin || task.params?.origin;
        if (task.agentType === 'flight_booking') {
            task.params = {
                ...task.params,
                origin,
                destination,
                departureDate: task.params?.departureDate || departureDate,
                departureTimePreference: task.params?.departureTimePreference || departureTimePreference,
                timePriorityMode: task.params?.timePriorityMode || (departureTimePreference ? 'prefer' : undefined)
            };
        } else if (['hotel_booking', 'weather', 'attraction', 'restaurant', 'itinerary', 'transportation'].includes(task.agentType)) {
            task.params = { ...task.params, destination, origin };
        }
    });

    return {
        ...decomposition,
        subTasks: travelTasks,
        optimizationGoal: decomposition.optimizationGoal || buildOptimizationGoal(),
        implicitNeeds: decomposition.implicitNeeds.length
            ? decomposition.implicitNeeds
            : ['transportation', 'accommodation', 'activities', 'dining', 'ground_transfer']
    };
}

/**
 * Pattern-based decomposition (fallback)
 */
function patternBasedDecomposition(userRequest: string): TaskDecomposition {
    const request = userRequest.toLowerCase();
    const subTasks: SubTask[] = [];
    let taskId = 0;

    // Detect travel/trip planning
    const isTravelRequest = /旅行|旅游|出行|行程|trip|travel|去.*(玩|旅)|planning|机票|航班|飞机/i.test(request);

    // Detect origin and destination
    const route = extractRoute(userRequest);
    const departureDate = extractDepartureDate(userRequest);
    const departureTimePreference = extractDepartureTimePreference(userRequest);
    const destination = route.destination || 'destination';
    const origin = route.origin || 'origin';

    // Detect budget constraint
    const budgetMatch = request.match(/(\d+)\s*(?:万|k|元|¥|\$|日元|美元)/i);
    const budget = budgetMatch ? parseInt(budgetMatch[1]) : null;

    if (isTravelRequest) {
        // Weather first (no dependencies)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Check weather forecast for ${destination}`,
            agentType: 'weather',
            priority: 1,
            dependsOn: [],
            params: { destination },
            status: 'pending'
        });

        // Flights (no dependencies, can run parallel with weather)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Search flights to ${destination}`,
            agentType: 'flight_booking',
            priority: 1,
            dependsOn: [],
            params: {
                origin,
                destination,
                budget,
                departureDate,
                departureTimePreference,
                timePriorityMode: departureTimePreference ? 'prefer' : undefined
            },
            status: 'pending'
        });

        // Hotels (depends on flight cost for budget allocation)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Find hotels in ${destination}`,
            agentType: 'hotel_booking',
            priority: 2,
            dependsOn: ['t2'],  // Depends on flight result
            params: { destination },
            status: 'pending'
        });

        // Attractions (depends on weather)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Discover attractions in ${destination}`,
            agentType: 'attraction',
            priority: 2,
            dependsOn: ['t1'],  // Weather affects activity planning
            params: { destination },
            status: 'pending'
        });

        // Restaurants
        subTasks.push({
            id: `t${++taskId}`,
            description: `Find restaurants in ${destination}`,
            agentType: 'restaurant',
            priority: 3,
            dependsOn: [],
            params: { destination },
            status: 'pending'
        });

        // Transportation (depends on flight info)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Plan airport transfer and ground transport`,
            agentType: 'transportation',
            priority: 3,
            dependsOn: ['t2'],
            params: { origin, destination, departureDate },
            status: 'pending'
        });

        // Final itinerary (depends on all)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Create optimized itinerary for ${destination}`,
            agentType: 'itinerary',
            priority: 4,
            dependsOn: ['t1', 't2', 't3', 't4', 't5', 't6'],
            params: { destination },
            status: 'pending'
        });
    } else {
        // Single-domain request - detect best agent
        const agent = detectBestAgent(request);
        subTasks.push({
            id: 't1',
            description: userRequest,
            agentType: agent,
            priority: 1,
            dependsOn: [],
            params: extractParams(userRequest),
            status: 'pending'
        });
    }

    return {
        originalRequest: userRequest,
        userIntent: isTravelRequest ? `Plan a trip to ${destination}` : 'Execute user request',
        implicitNeeds: isTravelRequest
            ? ['transportation', 'accommodation', 'activities', 'dining', 'ground_transfer']
            : [],
        constraints: budget ? [`Budget: ${budget}`] : [],
        subTasks,
        optimizationGoal: isTravelRequest
            ? buildOptimizationGoal()
            : 'Complete request efficiently',
        reasoning: isTravelRequest
            ? 'Decomposed into weather → flights/hotels → attractions/transport → itinerary pipeline'
            : 'Single-task routing to best agent'
    };
}

/**
 * Detect the best agent for a request
 */
function detectBestAgent(request: string): SpecializedAgentType {
    const keywords: Record<SpecializedAgentType, string[]> = {
        'flight_booking': ['机票', 'flight', '航班', '飞机', 'airplane'],
        'hotel_booking': ['酒店', 'hotel', '住宿', 'accommodation'],
        'restaurant': ['餐厅', 'restaurant', '吃饭', '美食', 'food', 'dining'],
        'attraction': ['景点', 'attraction', '玩', '旅游', 'sightseeing'],
        'weather': ['天气', 'weather', '气温', 'temperature'],
        'itinerary': ['行程', 'itinerary', '规划', 'schedule', 'plan'],
        'translation': ['翻译', 'translate', '语言', 'language'],
        'transportation': ['交通', 'transport', '地铁', 'subway'],
        'shopping': ['购物', 'shopping', '买'],
        'social_search': ['找人', 'search', '搜索']
    };

    for (const [agent, words] of Object.entries(keywords)) {
        if (words.some(w => request.includes(w))) {
            return agent as SpecializedAgentType;
        }
    }

    return 'itinerary';  // Default
}

/**
 * Extract parameters from request
 */
function extractParams(request: string): Record<string, any> {
    const params: Record<string, any> = {};

    const route = extractRoute(request);
    if (route.origin) params.origin = route.origin;
    if (route.destination) params.destination = route.destination;

    if (!params.destination) {
        const locationHint = extractLocationHint(request);
        if (locationHint) params.destination = locationHint;
    }

    // Extract date
    const dateMatch = request.match(/(\d{1,2})[\/\-](\d{1,2})|下周|明天|next week|tomorrow/);
    if (dateMatch) params.date = dateMatch[0];

    return params;
}

// ============================================================================
// Task Execution Engine
// ============================================================================

/**
 * Execute all sub-tasks with dependency resolution
 */
export async function executeTaskPipeline(
    decomposition: TaskDecomposition,
    apiKey: string,
    onProgress?: (task: SubTask, status: string) => void
): Promise<GlobalSolution> {
    const startTime = Date.now();
    const results: GlobalSolution['results'] = [];
    const tasks = [...decomposition.subTasks];

    // Resolve dependencies and execute
    while (tasks.some(t => t.status === 'pending')) {
        // Find tasks that are ready (dependencies completed)
        const readyTasks = tasks.filter(t =>
            t.status === 'pending' &&
            t.dependsOn.every(depId => {
                const dep = tasks.find(dt => dt.id === depId);
                return dep?.status === 'completed';
            })
        );

        if (readyTasks.length === 0) {
            // No tasks ready - check for circular dependencies or all done
            if (tasks.every(t => t.status !== 'pending')) break;
            throw new Error('Circular dependency detected');
        }

        // Execute ready tasks in parallel
        await Promise.all(readyTasks.map(async (task) => {
            task.status = 'running';
            onProgress?.(task, 'running');

            try {
                // Prepare task with results from dependencies
                const depResults: Record<string, any> = {};
                for (const depId of task.dependsOn) {
                    const dep = tasks.find(t => t.id === depId);
                    if (dep?.result) {
                        depResults[dep.agentType] = dep.result;
                    }
                }

                // Execute agent
                const agentTask = {
                    agentType: task.agentType,
                    params: { ...task.params, previousResults: depResults },
                    appliedPreferences: []
                };

                const result = await executeSpecializedAgent(agentTask, apiKey);

                task.result = result;
                task.status = 'completed';
                results.push({
                    taskId: task.id,
                    agentType: task.agentType,
                    result: result.data
                });

                onProgress?.(task, 'completed');
            } catch (error) {
                task.status = 'failed';
                task.result = { error: String(error) };
                onProgress?.(task, 'failed');
            }
        }));
    }

    // Synthesize global solution
    const solution = synthesizeGlobalSolution(decomposition, results);
    solution.executionTime = Date.now() - startTime;

    return solution;
}

/**
 * Synthesize results into a global optimal solution
 */
function synthesizeGlobalSolution(
    decomposition: TaskDecomposition,
    results: GlobalSolution['results']
): GlobalSolution {
    const successfulResults = results.filter(r => r.result && !r.result.error);
    const totalTasks = decomposition.subTasks.length;
    const completedTasks = successfulResults.length;

    // Calculate optimization score (completion + personalization fit)
    let score = (completedTasks / totalTasks) * 70;
    const flightResult = successfulResults.find(r => r.agentType === 'flight_booking')?.result;
    if (flightResult?.bestOption?.matchScore) {
        score += Math.round((flightResult.bestOption.matchScore / 100) * 30);
    } else {
        score += 15;
    }

    // Generate summary
    const summaryParts: string[] = [];

    for (const result of successfulResults) {
        switch (result.agentType) {
            case 'flight_booking':
                const bestFlight = result.result?.bestOption;
                const lowestFlight = result.result?.lowestPrice;
                if (bestFlight) {
                    summaryParts.push(`✈️ 推荐航班: ${bestFlight.airline} $${bestFlight.price} (匹配度 ${bestFlight.matchScore}%)`);
                } else if (lowestFlight) {
                    summaryParts.push(`✈️ Best flight: $${lowestFlight.price} via ${lowestFlight.source}`);
                }
                break;
            case 'hotel_booking':
                const hotels = result.result?.hotels;
                if (hotels?.[0]) {
                    summaryParts.push(`🏨 Top hotel: ${hotels[0].name} (${hotels[0].priceRange})`);
                }
                break;
            case 'restaurant':
                const restaurants = result.result?.restaurants;
                if (restaurants?.[0]) {
                    summaryParts.push(`🍽️ 推荐餐厅: ${restaurants[0].name} (${restaurants[0].type || restaurants[0].cuisine || '本地特色'})`);
                }
                break;
            case 'weather':
                const weather = result.result?.forecast;
                if (weather?.[0]) {
                    summaryParts.push(`🌤️ Weather: ${weather[0].condition} ${weather[0].temp}`);
                }
                break;
            case 'attraction':
                const attractions = result.result?.attractions;
                if (attractions?.[0]) {
                    summaryParts.push(`🎯 Top attraction: ${attractions[0].name}`);
                }
                break;
            case 'transportation':
                const transfer = result.result?.toAirport?.[0];
                if (transfer) {
                    summaryParts.push(`🚖 交通建议: ${transfer.mode} (${transfer.duration})`);
                }
                break;
        }
    }

    if (decomposition.optimizationGoal) {
        summaryParts.push(`🧭 优化目标: ${decomposition.optimizationGoal}`);
    }

    // 生成联想建议 - 发散性思维
    const associatedSuggestions = generateAssociatedSuggestions(decomposition, results);

    return {
        success: completedTasks === totalTasks,
        summary: summaryParts.join('\n'),
        results,
        recommendation: generateRecommendation(decomposition, results),
        optimizationScore: Math.round(score),
        reasoning: `Executed ${completedTasks}/${totalTasks} sub-tasks. ${decomposition.reasoning}`,
        executionTime: 0,
        associatedSuggestions
    };
}

/**
 * 生成联想建议 - 发散性思维
 * 基于用户意图和搜索结果，主动联想相关需求
 */
function generateAssociatedSuggestions(
    decomposition: TaskDecomposition,
    results: GlobalSolution['results']
): Array<{
    id: string;
    category: 'related_need' | 'reminder' | 'tip' | 'warning' | 'opportunity';
    icon: string;
    title: string;
    description: string;
    actionText?: string;
    actionQuery?: string;
    priority: number;
}> {
    const suggestions: Array<{
        id: string;
        category: 'related_need' | 'reminder' | 'tip' | 'warning' | 'opportunity';
        icon: string;
        title: string;
        description: string;
        actionText?: string;
        actionQuery?: string;
        priority: number;
    }> = [];

    const avatar = getEnhancedDigitalAvatar();
    const adventurousness = avatar.personality?.openness ?? 50;
    const priceVsQuality = avatar.valuesProfile?.priceVsQuality ?? 0;
    const destination = decomposition.subTasks[0]?.params?.destination || '';
    const hasFlights = results.some(r => r.agentType === 'flight_booking');
    const hasHotels = results.some(r => r.agentType === 'hotel_booking');
    const hasWeather = results.some(r => r.agentType === 'weather');

    // 1. 签证相关提醒
    if (hasFlights && /日本|东京|大阪|tokyo|osaka|japan/i.test(destination)) {
        suggestions.push({
            id: 'visa-reminder',
            category: 'reminder',
            icon: '📋',
            title: '签证提醒',
            description: '中国公民前往日本需要办理旅游签证，建议提前2-3周申请',
            actionText: '查询签证要求',
            actionQuery: '日本旅游签证怎么办理',
            priority: 9
        });
    }

    // 2. 货币兑换建议
    if (hasFlights) {
        const currencyMap: Record<string, { currency: string; tip: string }> = {
            '日本|东京|大阪|tokyo|osaka': { currency: '日元', tip: '建议在国内银行提前兑换，机场汇率较差' },
            '英国|伦敦|london': { currency: '英镑', tip: '可使用信用卡，但建议携带少量现金' },
            '美国|纽约|new york|洛杉矶': { currency: '美元', tip: '信用卡非常普及，建议办理Visa/Master卡' },
            '泰国|曼谷|bangkok': { currency: '泰铢', tip: '当地ATM取款汇率较好，记得带银联卡' }
        };

        for (const [pattern, info] of Object.entries(currencyMap)) {
            if (new RegExp(pattern, 'i').test(destination)) {
                suggestions.push({
                    id: 'currency-tip',
                    category: 'tip',
                    icon: '💱',
                    title: `货币兑换 - ${info.currency}`,
                    description: info.tip,
                    actionText: '查看汇率',
                    actionQuery: `${info.currency}兑人民币汇率`,
                    priority: 7
                });
                break;
            }
        }
    }

    // 3. 保险建议
    if (hasFlights) {
        suggestions.push({
            id: 'travel-insurance',
            category: 'related_need',
            icon: '🛡️',
            title: '旅行保险',
            description: '建议购买旅行意外险和医疗险，以防突发状况',
            actionText: '了解保险方案',
            actionQuery: '推荐旅行保险',
            priority: 6
        });
    }

    if (adventurousness > 70) {
        suggestions.push({
            id: 'offbeat-experience',
            category: 'opportunity',
            icon: '🧭',
            title: '小众体验',
            description: '根据你喜欢探索的风格，推荐一两个小众路线',
            actionText: '查看小众路线',
            actionQuery: `${destination} 小众景点推荐`,
            priority: 6
        });
    } else if (adventurousness < 40) {
        suggestions.push({
            id: 'popular-spots',
            category: 'tip',
            icon: '📸',
            title: '热门打卡',
            description: '优先安排经典景点，避免踩雷',
            actionText: '查看热门景点',
            actionQuery: `${destination} 必去景点`,
            priority: 6
        });
    }

    if (priceVsQuality < -30) {
        suggestions.push({
            id: 'budget-tip',
            category: 'tip',
            icon: '💸',
            title: '省钱技巧',
            description: '关注交通卡、餐饮套餐和景点通票',
            actionText: '查看省钱攻略',
            actionQuery: `${destination} 省钱攻略`,
            priority: 5
        });
    }

    // 3.5 接送机与出发时间提醒
    if (hasFlights) {
        suggestions.push({
            id: 'airport-transfer',
            category: 'related_need',
            icon: '🚖',
            title: '接送机规划',
            description: '根据航班时间规划去机场/到酒店的交通方式',
            actionText: '查看接送机',
            actionQuery: `${destination} 机场到市区交通方式`,
            priority: 7
        });
        suggestions.push({
            id: 'airport-buffer',
            category: 'reminder',
            icon: '⏰',
            title: '到机场时间',
            description: '国际航班建议提前 2.5-3 小时到达机场',
            priority: 7
        });
    }

    // 4. 天气相关建议
    if (hasWeather) {
        const weatherResult = results.find(r => r.agentType === 'weather')?.result;
        const forecast = weatherResult?.forecast || [];
        const hasRain = forecast.some((f: any) => /雨|rain/i.test(f.condition));
        const hasCold = forecast.some((f: any) => {
            const temp = parseInt(f.temp);
            return !isNaN(temp) && temp < 10;
        });

        if (hasRain) {
            suggestions.push({
                id: 'rain-warning',
                category: 'warning',
                icon: '☔',
                title: '降雨提醒',
                description: '目的地近期有降雨，记得携带雨具',
                priority: 8
            });
        }

        if (hasCold) {
            suggestions.push({
                id: 'cold-warning',
                category: 'warning',
                icon: '🧥',
                title: '低温提醒',
                description: '目的地气温较低，建议携带保暖衣物',
                priority: 7
            });
        }
    }

    // 5. 通讯建议
    if (hasFlights) {
        suggestions.push({
            id: 'sim-card',
            category: 'tip',
            icon: '📱',
            title: '网络通讯',
            description: '建议提前购买当地流量卡或开通国际漫游',
            actionText: '查看流量卡',
            actionQuery: `${destination}旅游流量卡推荐`,
            priority: 5
        });
    }

    // 6. 交通卡建议
    if (/日本|东京|大阪|tokyo|osaka/i.test(destination)) {
        suggestions.push({
            id: 'transport-card',
            category: 'tip',
            icon: '🚃',
            title: '交通卡推荐',
            description: '建议购买 Suica 或 PASMO 交通卡，乘车更方便',
            actionText: '了解更多',
            actionQuery: '日本交通卡怎么买',
            priority: 6
        });
    }

    // 7. 最佳购物时机
    if (/日本|东京|tokyo/i.test(destination)) {
        suggestions.push({
            id: 'shopping-opportunity',
            category: 'opportunity',
            icon: '🛍️',
            title: '购物机会',
            description: '日本药妆店和电器店经常有优惠，可提前做好购物清单',
            actionText: '热门购物清单',
            actionQuery: '日本必买清单',
            priority: 4
        });
    }

    // 8. 紧急联系方式
    suggestions.push({
        id: 'emergency-contact',
        category: 'reminder',
        icon: '🆘',
        title: '紧急联系',
        description: '记得保存中国驻当地大使馆联系方式和当地报警电话',
        priority: 5
    });

    // 按优先级排序并返回前5个
    return suggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
}

/**
 * Generate final recommendation
 */
function generateRecommendation(
    decomposition: TaskDecomposition,
    results: GlobalSolution['results']
): string {
    const destination = decomposition.subTasks[0]?.params?.destination || 'your destination';

    // Check if it's a travel request
    if (decomposition.userIntent.includes('trip') || decomposition.userIntent.includes('旅')) {
        const flightResult = results.find(r => r.agentType === 'flight_booking');
        const hotelResult = results.find(r => r.agentType === 'hotel_booking');
        const transportResult = results.find(r => r.agentType === 'transportation');
        const optimizationGoal = decomposition.optimizationGoal || buildOptimizationGoal();

        let rec = `🎯 **Recommended Plan for ${destination}**\n\n`;

        if (flightResult?.result?.bestOption) {
            rec += `1. 选择匹配度最高的航班：${flightResult.result.bestOption.airline} $${flightResult.result.bestOption.price}\n`;
        } else if (flightResult?.result?.lowestPrice) {
            rec += `1. Book flight via ${flightResult.result.lowestPrice.source} at $${flightResult.result.lowestPrice.price}\n`;
        }

        if (hotelResult?.result?.hotels?.[0]) {
            rec += `2. Stay at ${hotelResult.result.hotels[0].name}\n`;
        }

        if (transportResult?.result?.recommendedLeaveTime) {
            rec += `3. 出发时间建议：${transportResult.result.recommendedLeaveTime}\n`;
        }

        rec += `\n💡 ${optimizationGoal}`;

        return rec;
    }

    const restaurantResult = results.find(r => r.agentType === 'restaurant')?.result;
    if (restaurantResult?.restaurants?.length) {
        const topRestaurants = restaurantResult.restaurants.slice(0, 3).map((r: any) => r.name).filter(Boolean);
        const highlight = restaurantResult.restaurants[0]?.highlight;
        const cityLabel = restaurantResult.destination ? `（${restaurantResult.destination}）` : '';
        const base = topRestaurants.length
            ? `🍽️ 推荐${cityLabel}优先尝试：${topRestaurants.join('、')}`
            : `🍽️ 已筛选${cityLabel}口碑较好的餐厅`;
        return highlight ? `${base}\n✨ ${highlight}` : base;
    }

    const attractionResult = results.find(r => r.agentType === 'attraction')?.result;
    if (attractionResult?.attractions?.length) {
        const topAttractions = attractionResult.attractions.slice(0, 3).map((a: any) => a.name).filter(Boolean);
        if (topAttractions.length > 0) {
            return `🎯 推荐景点：${topAttractions.join('、')}`;
        }
    }

    const weatherResult = results.find(r => r.agentType === 'weather')?.result;
    if (weatherResult?.forecast?.[0]) {
        const today = weatherResult.forecast[0];
        return `🌤️ 今日天气：${today.condition} ${today.temp}，适合安排轻松行程。`;
    }

    return `✅ 已完成请求，建议查看详细结果获取更多细节。`;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Super Agent Brain - Main orchestration function
 */
export async function superAgentOrchestrate(
    userRequest: string,
    apiKey: string,
    onProgress?: (task: SubTask, status: string) => void
): Promise<GlobalSolution> {
    console.log('🧠 Super Agent Brain: Analyzing request...');

    // Step 1: Analyze and decompose
    const decomposition = await analyzeAndDecompose(userRequest, apiKey);
    console.log('📝 Task Decomposition:', decomposition);

    // Step 2: Execute pipeline
    const solution = await executeTaskPipeline(decomposition, apiKey, onProgress);
    console.log('✅ Global Solution:', solution);

    return solution;
}

export default superAgentOrchestrate;
