/**
 * Specialized Agents - 专业Agent实现
 * 
 * 各专业Agent负责特定领域的任务执行
 * 当前为模拟数据，生产环境应对接真实API
 */

import {
    AgentTask,
    AgentTaskResult,
    SpecializedAgentType
} from '../types';

/**
 * 专业Agent接口
 */
interface SpecializedAgentImpl {
    name: SpecializedAgentType;
    execute: (task: AgentTask, apiKey: string) => Promise<AgentTaskResult>;
}

// =============================================================================
// 机票Agent - 搜索和推荐航班
// =============================================================================

const flightBookingAgent: SpecializedAgentImpl = {
    name: 'flight_booking',
    execute: async (task, apiKey) => {
        // 模拟航班搜索结果
        const destination = task.params.destination || '东京';
        const flightClass = task.params.class || 'economy';
        const seatPref = task.params.seatPreference || 'window';
        const departureTime = task.params.departureTime || 'morning';

        // 模拟数据 - 根据偏好筛选
        const flights = [
            {
                id: 'flight_1',
                airline: 'ANA 全日空',
                flightNo: 'NH1234',
                departure: departureTime === 'afternoon' ? '13:30' : '08:45',
                arrival: departureTime === 'afternoon' ? '18:00' : '13:15',
                duration: '4h30m',
                price: flightClass === 'economy' ? 3200 : 8500,
                class: flightClass,
                seatInfo: seatPref === 'window' ? '靠窗座位可选' : '靠走道座位可选',
                stops: 0,
                aircraft: 'Boeing 787',
                baggage: '2件23kg',
                matchScore: 95
            },
            {
                id: 'flight_2',
                airline: '中国国航',
                flightNo: 'CA1234',
                departure: departureTime === 'afternoon' ? '14:00' : '09:30',
                arrival: departureTime === 'afternoon' ? '18:30' : '14:00',
                duration: '4h30m',
                price: flightClass === 'economy' ? 2800 : 7200,
                class: flightClass,
                seatInfo: seatPref === 'window' ? '靠窗座位可选' : '靠走道座位可选',
                stops: 0,
                aircraft: 'Airbus A350',
                baggage: '2件23kg',
                matchScore: 88
            },
            {
                id: 'flight_3',
                airline: '东方航空',
                flightNo: 'MU5678',
                departure: departureTime === 'afternoon' ? '15:20' : '07:00',
                arrival: departureTime === 'afternoon' ? '20:00' : '11:30',
                duration: '4h40m',
                price: flightClass === 'economy' ? 2500 : 6800,
                class: flightClass,
                seatInfo: '通用座位选择',
                stops: 0,
                aircraft: 'Boeing 777',
                baggage: '1件23kg',
                matchScore: 75
            }
        ];

        // 按偏好匹配度排序
        const sortedFlights = flights.sort((a, b) => b.matchScore - a.matchScore);

        return {
            success: true,
            data: {
                destination,
                flights: sortedFlights,
                estimatedCost: sortedFlights[0].price
            },
            suggestions: sortedFlights,
            personalizedNote: `已为您筛选${departureTime === 'afternoon' ? '下午' : '上午'}出发的${flightClass === 'economy' ? '经济舱' : '商务舱'}航班，优先${seatPref === 'window' ? '靠窗' : '靠走道'}座位`,
            appliedFilters: task.appliedPreferences
        };
    }
};

// =============================================================================
// 酒店Agent - 搜索和推荐住宿
// =============================================================================

const hotelBookingAgent: SpecializedAgentImpl = {
    name: 'hotel_booking',
    execute: async (task, apiKey) => {
        const destination = task.params.destination || '东京';
        const starLevel = task.params.starLevel || [4, 5];
        const location = task.params.location || 'city_center';

        const hotels = [
            {
                id: 'hotel_1',
                name: '东京安缦酒店',
                nameEn: 'Aman Tokyo',
                star: 5,
                rating: 4.9,
                reviewCount: 1256,
                pricePerNight: 4500,
                location: '大手町',
                locationNote: '距离皇居步行5分钟',
                amenities: ['温泉SPA', '米其林餐厅', '24小时健身房', '管家服务'],
                image: '🏨',
                matchScore: 98
            },
            {
                id: 'hotel_2',
                name: '东京帝国酒店',
                nameEn: 'Imperial Hotel Tokyo',
                star: 5,
                rating: 4.7,
                reviewCount: 3420,
                pricePerNight: 2800,
                location: '日比谷',
                locationNote: '银座商圈核心',
                amenities: ['室内泳池', '多国料理', '健身房', '商务中心'],
                image: '🏨',
                matchScore: 92
            },
            {
                id: 'hotel_3',
                name: '新宿格兰贝尔酒店',
                nameEn: 'Shinjuku Granbell Hotel',
                star: 4,
                rating: 4.5,
                reviewCount: 2180,
                pricePerNight: 1200,
                location: '新宿',
                locationNote: '新宿站步行3分钟',
                amenities: ['餐厅', '健身房', '会议室'],
                image: '🏨',
                matchScore: 85
            }
        ];

        // 根据星级筛选
        const filtered = hotels.filter(h => starLevel.includes(h.star));
        const sorted = filtered.sort((a, b) => b.matchScore - a.matchScore);

        // 计算总费用（假设5晚）
        const nights = 5;
        const estimatedCost = sorted.length > 0 ? sorted[0].pricePerNight * nights : 0;

        return {
            success: true,
            data: {
                destination,
                hotels: sorted,
                estimatedCost
            },
            suggestions: sorted,
            personalizedNote: `已筛选${starLevel.join('/')}星级酒店，优先${location === 'city_center' ? '市中心' : '安静'}位置`,
            appliedFilters: task.appliedPreferences
        };
    }
};

// =============================================================================
// 餐厅Agent - 推荐美食
// =============================================================================

const restaurantAgent: SpecializedAgentImpl = {
    name: 'restaurant',
    execute: async (task, apiKey) => {
        const destination = task.params.destination || '东京';
        const cuisines = task.params.cuisines || ['日料'];
        const priceLevel = task.params.priceLevel || 'mid';

        const restaurants = [
            {
                id: 'rest_1',
                name: '鮨 さいとう',
                type: '寿司 · 米其林三星',
                rating: 4.9,
                priceRange: '¥50,000+/人',
                address: '东京都港区六本木',
                highlight: '被誉为东京最佳寿司店之一',
                openTime: '17:00-22:00',
                reservation: '需提前3个月预约',
                matchScore: 95
            },
            {
                id: 'rest_2',
                name: '一兰拉面 涩谷店',
                type: '拉面',
                rating: 4.6,
                priceRange: '¥1,000-2,000/人',
                address: '东京都涩谷区宇田川町',
                highlight: '24小时营业，经典博多豚骨',
                openTime: '24小时',
                reservation: '无需预约',
                matchScore: 88
            },
            {
                id: 'rest_3',
                name: '筑地场外市场',
                type: '海鲜市场',
                rating: 4.7,
                priceRange: '¥2,000-5,000/人',
                address: '东京都中央区筑地',
                highlight: '新鲜海鲜，地道日本料理体验',
                openTime: '05:00-14:00',
                reservation: '无需预约',
                matchScore: 92
            }
        ];

        return {
            success: true,
            data: {
                destination,
                restaurants
            },
            suggestions: restaurants,
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
        const destination = task.params.destination || '东京';
        const style = task.params.style || 'mixed';

        const attractions = [
            {
                id: 'attr_1',
                name: '下北泽',
                type: '文艺街区',
                style: 'offbeat',
                description: '东京最具个性的文艺街区，独立咖啡店、古着店云集',
                highlights: ['古着购物', '独立音乐', '小众咖啡'],
                recommendTime: '半天',
                crowdLevel: '低',
                matchScore: 96
            },
            {
                id: 'attr_2',
                name: '谷中银座',
                type: '怀旧老街',
                style: 'offbeat',
                description: '保留昭和风情的老街，特色小店和地道美食',
                highlights: ['猫咪', '手工艺', '怀旧氛围'],
                recommendTime: '3小时',
                crowdLevel: '低',
                matchScore: 94
            },
            {
                id: 'attr_3',
                name: 'teamLab Borderless',
                type: '数字艺术馆',
                style: 'popular',
                description: '全球知名的沉浸式数字艺术体验空间',
                highlights: ['拍照', '沉浸体验', '艺术'],
                recommendTime: '3-4小时',
                crowdLevel: '高',
                matchScore: 90
            },
            {
                id: 'attr_4',
                name: '浅草寺',
                type: '历史文化',
                style: 'popular',
                description: '东京最古老的寺庙，体验传统日本文化',
                highlights: ['雷门', '仲见世通', '和服体验'],
                recommendTime: '2-3小时',
                crowdLevel: '高',
                matchScore: 85
            }
        ];

        // 根据风格偏好排序
        const filtered = style === 'mixed'
            ? attractions
            : attractions.filter(a => a.style === style);
        const sorted = filtered.sort((a, b) => b.matchScore - a.matchScore);

        return {
            success: true,
            data: {
                destination,
                attractions: sorted
            },
            suggestions: sorted,
            personalizedNote: style === 'offbeat'
                ? '根据您喜欢探索小众景点的习惯，推荐以下隐藏宝藏'
                : '精选热门与小众景点混合推荐',
            appliedFilters: task.appliedPreferences
        };
    }
};

// =============================================================================
// 天气Agent
// =============================================================================

const weatherAgent: SpecializedAgentImpl = {
    name: 'weather',
    execute: async (task, apiKey) => {
        const destination = task.params.destination || '东京';

        // 模拟天气数据
        const weather = {
            location: destination,
            forecast: [
                { day: '周一', temp: '8-15°C', condition: '晴', icon: '☀️' },
                { day: '周二', temp: '10-16°C', condition: '多云', icon: '⛅' },
                { day: '周三', temp: '7-13°C', condition: '小雨', icon: '🌧️' },
                { day: '周四', temp: '6-12°C', condition: '晴', icon: '☀️' },
                { day: '周五', temp: '9-14°C', condition: '晴', icon: '☀️' }
            ],
            tips: ['建议携带轻便外套', '雨伞备用']
        };

        return {
            success: true,
            data: weather,
            suggestions: weather.forecast,
            personalizedNote: `${destination}未来一周天气预报`,
            appliedFilters: []
        };
    }
};

// =============================================================================
// 行程规划Agent
// =============================================================================

const itineraryAgent: SpecializedAgentImpl = {
    name: 'itinerary',
    execute: async (task, apiKey) => {
        const destination = task.params.destination || '东京';
        const previousResults = task.params.previousResults || [];

        // 基于之前的结果生成行程
        const itinerary = {
            summary: `${destination}5日游行程`,
            days: [
                {
                    day: 1,
                    title: '抵达与探索',
                    activities: [
                        { time: '下午', activity: '抵达机场，办理入住', location: '酒店' },
                        { time: '傍晚', activity: '新宿周边散步', location: '新宿' },
                        { time: '晚上', activity: '一兰拉面晚餐', location: '涩谷' }
                    ]
                },
                {
                    day: 2,
                    title: '文化体验日',
                    activities: [
                        { time: '上午', activity: '浅草寺参观', location: '浅草' },
                        { time: '中午', activity: '筑地市场午餐', location: '筑地' },
                        { time: '下午', activity: 'teamLab艺术馆', location: '台场' }
                    ]
                },
                {
                    day: 3,
                    title: '小众探索日',
                    activities: [
                        { time: '上午', activity: '谷中银座漫步', location: '谷中' },
                        { time: '下午', activity: '下北泽购物', location: '下北泽' },
                        { time: '晚上', activity: '居酒屋体验', location: '新宿' }
                    ]
                }
            ]
        };

        return {
            success: true,
            data: itinerary,
            suggestions: itinerary.days,
            personalizedNote: '根据您的偏好定制的行程，可按需调整',
            appliedFilters: []
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
    // 以下Agent暂未实现，返回空结果
    'transportation': {
        name: 'transportation',
        execute: async () => ({ success: true, data: {}, suggestions: [], appliedFilters: [] })
    },
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

/**
 * 执行专业Agent
 */
export async function executeSpecializedAgent(
    task: AgentTask,
    apiKey: string
): Promise<AgentTaskResult> {
    const agent = SPECIALIZED_AGENTS[task.agentType];
    if (!agent) {
        return {
            success: false,
            data: null,
            suggestions: [],
            appliedFilters: [],
            source: 'unknown'
        };
    }

    return agent.execute(task, apiKey);
}
