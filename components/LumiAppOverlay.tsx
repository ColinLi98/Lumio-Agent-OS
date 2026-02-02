import React from 'react';
import { ArrowLeft, Home, Search, User, MapPin, Star, Phone, ExternalLink, Heart } from 'lucide-react';
import { SuperAgentResultPanel, SuperAgentResult } from './SuperAgentResultPanel';

interface LumiAppOverlayProps {
    visible: boolean;
    data: any;
    onClose: () => void;
    superAgentResult?: SuperAgentResult | null;  // 新增：Super Agent 结果
    onFollowUp?: (question: string) => void;     // 新增：继续提问回调
    onOpenInMarket?: (intentId: string) => void; // 新增：跳转到Market
}

export const LumiAppOverlay: React.FC<LumiAppOverlayProps> = ({
    visible,
    data,
    onClose,
    superAgentResult,
    onFollowUp,
    onOpenInMarket
}) => {
    // 如果有 Super Agent 结果，优先显示
    if (visible && superAgentResult) {
        return (
            <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* App Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-3 shadow-lg">
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-white font-bold text-lg">Lumi.AI 分析结果</h1>
                        <p className="text-white/70 text-xs">Super Agent</p>
                    </div>
                    <img src="/lumi-logo.jpg" alt="Lumi" className="w-8 h-8 rounded-lg" />
                </div>

                {/* Super Agent Result Panel */}
                <div className="flex-1 overflow-hidden">
                    <SuperAgentResultPanel
                        result={superAgentResult}
                        onClose={onClose}
                        onFollowUp={onFollowUp}
                        onOpenInMarket={onOpenInMarket}
                    />
                </div>
            </div>
        );
    }

    if (!visible || !data) return null;

    const places = data.places || [];
    const query = data.query || '搜索结果';
    const isPersonalized = data.isPersonalized;

    return (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* App Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-3 shadow-lg">
                <button
                    onClick={onClose}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <div className="flex-1">
                    <h1 className="text-white font-bold text-lg">Lumi.AI</h1>
                    <p className="text-white/70 text-xs">{query}</p>
                </div>
                <img src="/lumi-logo.jpg" alt="Lumi" className="w-8 h-8 rounded-lg" />
            </div>

            {/* Personalization Badge */}
            {isPersonalized && (
                <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-4 py-2 border-b border-white/10">
                    <div className="flex items-center gap-2 text-pink-300 text-xs">
                        <Heart size={12} className="fill-current" />
                        <span>根据你的偏好个性化推荐</span>
                    </div>
                </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {places.map((place: any, index: number) => (
                    <div
                        key={index}
                        className="bg-gray-800 rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all"
                    >
                        {/* Card Header with Match Score */}
                        <div className="relative h-32 bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
                            {place.matchScore && (
                                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md rounded-full px-3 py-1">
                                    <span className="text-white text-sm font-bold">{place.matchScore}% 匹配</span>
                                </div>
                            )}
                            {index === 0 && (
                                <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full px-3 py-1">
                                    <span className="text-white text-xs font-bold">🏆 最佳推荐</span>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 right-4">
                                <h3 className="text-white font-bold text-xl">{place.name}</h3>
                                <p className="text-white/80 text-sm mt-1">{place.type} · {place.priceRange || place.priceLevel}</p>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-3">
                            {/* Rating & Reviews */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <Star size={16} className="text-yellow-400 fill-current" />
                                    <span className="text-white font-bold">{place.rating}</span>
                                </div>
                                <span className="text-gray-400 text-sm">{place.reviewCount || '1000+'}条评价</span>
                            </div>

                            {/* Address */}
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <MapPin size={14} />
                                <span>{place.address}</span>
                            </div>

                            {/* Personal Note */}
                            {place.personalNote && (
                                <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
                                    <p className="text-purple-300 text-sm">💡 {place.personalNote}</p>
                                </div>
                            )}

                            {/* Match Reasons */}
                            {place.matchReasons && place.matchReasons.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {place.matchReasons.map((reason: string, i: number) => (
                                        <span
                                            key={i}
                                            className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs"
                                        >
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Signature Dishes */}
                            {place.signature && place.signature.length > 0 && (
                                <div>
                                    <span className="text-gray-500 text-xs">招牌推荐</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {place.signature.map((dish: string, i: number) => (
                                            <span key={i} className="text-orange-400 text-sm">
                                                {i > 0 && ' · '}{dish}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                {place.phone && (
                                    <a
                                        href={`tel:${place.phone}`}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl font-medium transition-colors"
                                    >
                                        <Phone size={16} />
                                        <span>电话</span>
                                    </a>
                                )}
                                {place.dianpingUrl && (
                                    <a
                                        href={place.dianpingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white py-2.5 rounded-xl font-medium transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                        <span>点评</span>
                                    </a>
                                )}
                                {place.bookingAvailable && (
                                    <button className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-medium transition-colors">
                                        <span>📅</span>
                                        <span>预订</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Nav */}
            <div className="bg-gray-800 border-t border-white/10 px-6 py-3">
                <div className="flex justify-around">
                    <button className="flex flex-col items-center gap-1 text-purple-400">
                        <Home size={20} />
                        <span className="text-xs">首页</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-500">
                        <Search size={20} />
                        <span className="text-xs">发现</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-500">
                        <Heart size={20} />
                        <span className="text-xs">收藏</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-500">
                        <User size={20} />
                        <span className="text-xs">我的</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
