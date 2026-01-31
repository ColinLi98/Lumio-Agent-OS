/**
 * Lumi LIX (Intent Exchange) Market Service
 * 
 * The "Dark Pool" for intent broadcasting. This service simulates a market
 * where user intents are broadcast and matched with B2C/C2C offers.
 * 
 * Future versions will connect to real market participants.
 */

// ============================================================================
// Types
// ============================================================================

export type IntentCategory = 'purchase' | 'job' | 'collaboration';

export interface MarketIntent {
    category: IntentCategory;
    payload: string;        // e.g. "iPhone 16 pro max" or "Looking for React Dev"
    budget?: string;        // Optional budget or swap offer
    userId?: string;        // Anonymous user identifier
    timestamp?: number;     // When the intent was created
}

export interface MarketOffer {
    id: string;             // Unique offer ID
    provider: string;       // e.g. "JD.com Bot", "Headhunter AI", "User_Designer"
    providerType: 'B2C' | 'C2C';
    content: string;        // The offer details
    price?: string;         // Optional price
    score: number;          // Match score (0-1)
    expiresAt?: number;     // When this offer expires
    actionUrl?: string;     // Optional deep link
}

export interface MarketResponse {
    intentId: string;
    status: 'success' | 'pending' | 'no_matches';
    offers: MarketOffer[];
    matchCount: number;
    broadcastReach: number; // How many potential providers were reached
}

// ============================================================================
// Mock Market Database (Simulated World)
// ============================================================================

const MOCK_PROVIDERS = {
    purchase: {
        electronics: [
            { provider: '拼多多Bot', content: '百亿补贴专区，价格最低', providerType: 'B2C' as const, discountRate: 0.15 },
            { provider: '京东Bot', content: '京东自营，次日达，正品保障', providerType: 'B2C' as const, discountRate: 0.05 },
            { provider: '淘宝Bot', content: '天猫旗舰店，7天无理由退换', providerType: 'B2C' as const, discountRate: 0.10 },
            { provider: '闲鱼用户_数码达人', content: '95新，配件齐全，可验机', providerType: 'C2C' as const, discountRate: 0.30 },
        ],
        general: [
            { provider: '1688批发Bot', content: '厂家直发，量大优惠', providerType: 'B2C' as const, discountRate: 0.20 },
            { provider: '得物Bot', content: '正品鉴定，潮流好物', providerType: 'B2C' as const, discountRate: 0.0 },
        ]
    },
    job: [
        { provider: 'Boss直聘AI', content: '匹配到 15 个相关职位', providerType: 'B2C' as const },
        { provider: '猎头_Linda', content: '有几个高薪机会想和您聊聊', providerType: 'C2C' as const },
        { provider: '脉脉职场Bot', content: '内推机会，直达HR', providerType: 'B2C' as const },
    ],
    collaboration: [
        { provider: 'User_设计师小明', content: '可以帮您设计Logo，愿意技能交换', providerType: 'C2C' as const },
        { provider: 'Studio_创意工作室', content: '专业设计服务，固定价格', providerType: 'B2C' as const },
        { provider: 'User_前端开发_007', content: '我会React，可以交换Python教学', providerType: 'C2C' as const },
        { provider: 'Freelancer_文案达人', content: '专业文案撰写，按字数计费', providerType: 'B2C' as const },
    ]
};

// Keywords for smart matching
const ELECTRONICS_KEYWORDS = ['iphone', 'ipad', 'macbook', 'airpods', '手机', '电脑', '耳机', '平板', '笔记本', '显卡', '相机'];
const DESIGN_KEYWORDS = ['设计', 'logo', '海报', 'ui', 'ux', '插画', '品牌', '视觉'];
const DEV_KEYWORDS = ['开发', '编程', 'react', 'python', 'java', '前端', '后端', '小程序', 'app'];

// ============================================================================
// Market Service
// ============================================================================

export const marketService = {
    /**
     * Broadcast an intent to the market and receive offers
     */
    broadcast: async (intent: MarketIntent): Promise<MarketResponse> => {
        console.log(`📡 [LIX] Broadcasting Intent: ${JSON.stringify(intent)}`);

        const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Simulate network latency (The market is computing...)
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

        const offers: MarketOffer[] = [];
        const payloadLower = intent.payload.toLowerCase();

        // ========================================
        // Purchase Intent Matching
        // ========================================
        if (intent.category === 'purchase') {
            const isElectronics = ELECTRONICS_KEYWORDS.some(kw => payloadLower.includes(kw));
            const providers = isElectronics
                ? MOCK_PROVIDERS.purchase.electronics
                : MOCK_PROVIDERS.purchase.general;

            for (const p of providers) {
                // Calculate a realistic score based on the product
                const baseScore = 0.75 + Math.random() * 0.23;

                // Generate a mock price
                let priceInfo = '';
                if (payloadLower.includes('iphone')) {
                    const basePrice = payloadLower.includes('pro max') ? 9999 :
                        payloadLower.includes('pro') ? 7999 : 5999;
                    const finalPrice = Math.floor(basePrice * (1 - p.discountRate));
                    priceInfo = `￥${finalPrice}`;
                }

                offers.push({
                    id: `offer_${Date.now()}_${offers.length}`,
                    provider: p.provider,
                    providerType: p.providerType,
                    content: priceInfo ? `${priceInfo} - ${p.content}` : p.content,
                    price: priceInfo || undefined,
                    score: Math.min(0.99, baseScore),
                    expiresAt: Date.now() + 1800000 // 30 min expiry
                });
            }
        }

        // ========================================
        // Job Intent Matching
        // ========================================
        else if (intent.category === 'job') {
            for (const p of MOCK_PROVIDERS.job) {
                offers.push({
                    id: `offer_${Date.now()}_${offers.length}`,
                    provider: p.provider,
                    providerType: p.providerType,
                    content: p.content,
                    score: 0.8 + Math.random() * 0.18
                });
            }
        }

        // ========================================
        // Collaboration Intent Matching
        // ========================================
        else if (intent.category === 'collaboration') {
            // Smart matching based on keywords
            const isDesign = DESIGN_KEYWORDS.some(kw => payloadLower.includes(kw));
            const isDev = DEV_KEYWORDS.some(kw => payloadLower.includes(kw));

            for (const p of MOCK_PROVIDERS.collaboration) {
                const providerLower = p.provider.toLowerCase();
                const contentLower = p.content.toLowerCase();

                // Calculate relevance score
                let relevance = 0.5;
                if (isDesign && (providerLower.includes('设计') || contentLower.includes('设计') || contentLower.includes('logo'))) {
                    relevance = 0.9;
                } else if (isDev && (providerLower.includes('开发') || contentLower.includes('react') || contentLower.includes('python'))) {
                    relevance = 0.9;
                }

                // Add budget matching context
                let offerContent = p.content;
                if (intent.budget && p.providerType === 'C2C') {
                    offerContent += `（您提到预算有限，可以谈技能交换）`;
                }

                offers.push({
                    id: `offer_${Date.now()}_${offers.length}`,
                    provider: p.provider,
                    providerType: p.providerType,
                    content: offerContent,
                    score: relevance + Math.random() * 0.08
                });
            }
        }

        // Sort by score (best matches first)
        offers.sort((a, b) => b.score - a.score);

        console.log(`📡 [LIX] Received ${offers.length} offers`);

        return {
            intentId,
            status: offers.length > 0 ? 'success' : 'no_matches',
            offers: offers.slice(0, 5), // Return top 5
            matchCount: offers.length,
            broadcastReach: 500 + Math.floor(Math.random() * 300) // Simulated reach
        };
    },

    /**
     * Accept an offer (for future implementation)
     */
    acceptOffer: async (offerId: string): Promise<{ success: boolean; message: string }> => {
        console.log(`✅ [LIX] Accepting offer: ${offerId}`);
        await new Promise(r => setTimeout(r, 500));
        return {
            success: true,
            message: '已将您的意向发送给对方，请等待回复'
        };
    },

    /**
     * Get market stats (for dashboard)
     */
    getStats: async (): Promise<{ activeIntents: number; dailyMatches: number; providers: number }> => {
        return {
            activeIntents: 1247 + Math.floor(Math.random() * 100),
            dailyMatches: 8934 + Math.floor(Math.random() * 500),
            providers: 2156
        };
    }
};

export default marketService;
