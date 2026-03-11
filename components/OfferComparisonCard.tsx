/**
 * OfferComparisonCard - Display LIX market offers
 */

import React from 'react';
import { ShoppingCart, Star, Clock, Shield, ChevronRight, Zap, TrendingUp, ExternalLink } from 'lucide-react';

interface OfferData {
    rank: number;
    provider: string;
    providerId?: string;  // e.g., 'jd', 'pdd', 'taobao' for real providers
    providerType: 'B2C' | 'C2C';
    price: number;
    currency: string;
    reputation: number;
    verified: boolean;
    deliveryEta?: string;
    score: number;
    explanation: string;
    isLive?: boolean;  // true if from real scraping
    scrapedAt?: string;  // timestamp of scraping
    scoreBreakdown?: {
        price_score: number;
        reputation_score: number;
        delivery_score: number;
        sku_match_score: number;
        validation_penalty: number;
    };
}

interface OfferComparisonCardProps {
    data: {
        intentId?: string;
        totalOffers?: number;
        broadcastReach?: number;
        latencyMs?: number;
        offers?: OfferData[];
        message?: string;
        providerSource?: 'real' | 'mock' | 'mixed';  // Source of offers
    };
    onSelectOffer?: (offer: OfferData) => void;
    onOpenInMarket?: (intentId: string) => void;  // Deep link to Market
}

const OfferComparisonCard: React.FC<OfferComparisonCardProps> = ({ data, onSelectOffer, onOpenInMarket }) => {
    const { offers = [], totalOffers, broadcastReach, message, providerSource, intentId } = data;

    // Provider ID to display name mapping
    const PROVIDER_NAMES: Record<string, string> = {
        jd: 'JD.com',
        pdd: 'Pinduoduo',
        taobao: 'Taobao/Tmall'
    };

    if (!offers.length) {
        return (
            <div className="lix-card lix-card-empty">
                <div className="lix-header">
                    <ShoppingCart size={20} />
                    <span>LIX Intent Market</span>
                </div>
                <p className="lix-empty-message">{message || 'No matching offers yet'}</p>
            </div>
        );
    }

    return (
        <div className="lix-card">
            <style>{`
                .lix-card {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    padding: 16px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .lix-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #a78bfa;
                }
                .lix-stats {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                    font-size: 12px;
                    color: #9ca3af;
                }
                .lix-stat {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .lix-offers {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .lix-offer {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .lix-offer:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: #a78bfa;
                    transform: translateX(4px);
                }
                .lix-offer-rank-1 {
                    border-color: #fbbf24;
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.02) 100%);
                }
                .lix-offer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                }
                .lix-offer-provider {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .lix-offer-name {
                    font-weight: 600;
                    font-size: 14px;
                }
                .lix-offer-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: rgba(167, 139, 250, 0.2);
                    color: #a78bfa;
                }
                .lix-offer-badge-c2c {
                    background: rgba(52, 211, 153, 0.2);
                    color: #34d399;
                }
                .lix-offer-price {
                    font-size: 18px;
                    font-weight: 700;
                    color: #fbbf24;
                }
                .lix-offer-meta {
                    display: flex;
                    gap: 12px;
                    font-size: 11px;
                    color: #9ca3af;
                    margin-bottom: 6px;
                }
                .lix-offer-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .lix-offer-explanation {
                    font-size: 12px;
                    color: #d1d5db;
                    padding: 6px 8px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .lix-offer-cta {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    color: #a78bfa;
                    font-size: 12px;
                }
                .lix-verified {
                    color: #34d399;
                }
                .lix-rank-badge {
                    position: absolute;
                    top: -6px;
                    left: -6px;
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: #000;
                }
                .lix-empty-message {
                    color: #9ca3af;
                    text-align: center;
                    padding: 20px;
                }
                .lix-live-badge {
                    font-size: 9px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .lix-source-badge {
                    font-size: 10px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: rgba(99, 102, 241, 0.2);
                    color: #818cf8;
                    margin-left: auto;
                }
            `}</style>

            <div className="lix-header">
                <Zap size={18} />
                <span>LIX Intent Market</span>
            </div>

            <div className="lix-stats">
                <div className="lix-stat">
                    <TrendingUp size={14} />
                    <span>Received {totalOffers || offers.length} offers</span>
                </div>
                {broadcastReach && (
                    <div className="lix-stat">
                        <span>Reached {broadcastReach}+ providers</span>
                    </div>
                )}
                {providerSource && providerSource !== 'mock' && (
                    <span className="lix-source-badge">
                        {providerSource === 'real' ? '⏡ Live data' : 'Mixed data'}
                    </span>
                )}
            </div>

            <div className="lix-offers">
                {offers.map((offer, index) => (
                    <div
                        key={`${offer.provider}-${index}`}
                        className={`lix-offer ${offer.rank === 1 ? 'lix-offer-rank-1' : ''}`}
                        onClick={() => onSelectOffer?.(offer)}
                        style={{ position: 'relative' }}
                    >
                        {offer.rank === 1 && (
                            <div className="lix-rank-badge">1</div>
                        )}

                        <div className="lix-offer-header">
                            <div className="lix-offer-provider">
                                <span className="lix-offer-name">
                                    {offer.providerId ? PROVIDER_NAMES[offer.providerId] || offer.provider : offer.provider}
                                </span>
                                <span className={`lix-offer-badge ${offer.providerType === 'C2C' ? 'lix-offer-badge-c2c' : ''}`}>
                                    {offer.providerType}
                                </span>
                                {offer.isLive && (
                                    <span className="lix-live-badge">
                                        ⏡ Live
                                    </span>
                                )}
                                {offer.verified && (
                                    <Shield size={12} className="lix-verified" />
                                )}
                            </div>
                            <div className="lix-offer-price">
                                ¥{offer.price.toLocaleString()}
                            </div>
                        </div>

                        <div className="lix-offer-meta">
                            <div className="lix-offer-meta-item">
                                <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                                <span>{offer.reputation.toFixed(1)}</span>
                            </div>
                            {offer.deliveryEta && (
                                <div className="lix-offer-meta-item">
                                    <Clock size={12} />
                                    <span>{new Date(offer.deliveryEta).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} delivery</span>
                                </div>
                            )}
                            <div className="lix-offer-meta-item">
                                <span>Match score {offer.score}%</span>
                            </div>
                        </div>

                        <div className="lix-offer-explanation">
                            <span>{offer.explanation}</span>
                            <div className="lix-offer-cta">
                                <span>View details</span>
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Open in Market CTA */}
            {intentId && onOpenInMarket && (
                <div className="lix-market-cta">
                    <button
                        onClick={() => onOpenInMarket(intentId)}
                        className="lix-market-cta-button"
                    >
                        <ExternalLink size={14} />
                        <span>View all offers in Market</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default OfferComparisonCard;
