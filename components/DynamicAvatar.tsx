import React, { useState, useEffect } from 'react';
import { AvatarLevel, DynamicAvatarState } from '../types';
import { Sparkles, Star, Zap, Crown, Trophy } from 'lucide-react';

// ============================================================================
// Level System Configuration
// ============================================================================

const LEVEL_CONFIG = {
    // XP curve: required XP increases per level.
    getXpForLevel: (level: number) => Math.floor(50 * Math.pow(1.5, level - 1)),

    // Level titles.
    titles: [
        { minLevel: 1, title: 'Rookie Explorer', badge: '🌱', color: '#94a3b8' },
        { minLevel: 5, title: 'Rising Talent', badge: '🌿', color: '#22c55e' },
        { minLevel: 10, title: 'In the Zone', badge: '⭐', color: '#3b82f6' },
        { minLevel: 20, title: 'Independent Pro', badge: '💫', color: '#8b5cf6' },
        { minLevel: 35, title: 'Expert Craft', badge: '🔥', color: '#f59e0b' },
        { minLevel: 50, title: 'Peak Performer', badge: '👑', color: '#eab308' },
        { minLevel: 75, title: 'Legendary Master', badge: '💎', color: '#06b6d4' },
        { minLevel: 100, title: 'Digital Twin Deity', badge: '🏆', color: '#ec4899' },
    ],

    // Calculate level from total XP.
    calculateLevel: (totalXp: number): AvatarLevel => {
        let level = 1;
        let remainingXp = totalXp;

        while (true) {
            const needed = LEVEL_CONFIG.getXpForLevel(level);
            if (remainingXp < needed) {
                break;
            }
            remainingXp -= needed;
            level++;
            if (level > 100) break;
        }

        const levelInfo = [...LEVEL_CONFIG.titles]
            .reverse()
            .find(t => level >= t.minLevel) || LEVEL_CONFIG.titles[0];

        return {
            level,
            title: levelInfo.title,
            xp: remainingXp,
            nextLevelXp: LEVEL_CONFIG.getXpForLevel(level),
            badge: levelInfo.badge,
            color: levelInfo.color,
        };
    },

    // Calculate XP from interaction stats.
    calculateXpFromStats: (stats: { totalInteractions: number; totalMessages: number; totalToolUses: number }) => {
        return stats.totalInteractions * 2 +
            stats.totalMessages * 3 +
            stats.totalToolUses * 5;
    }
};

// ============================================================================
// Dynamic Avatar Component
// ============================================================================

interface DynamicAvatarProps {
    nickname?: string;
    totalInteractions: number;
    totalMessages: number;
    totalToolUses: number;
    currentMood: 'positive' | 'neutral' | 'negative';
    profileCompleteness: number;
    size?: 'small' | 'medium' | 'large';
    showLevel?: boolean;
    showXpBar?: boolean;
    animated?: boolean;
}

export const DynamicAvatar: React.FC<DynamicAvatarProps> = ({
    nickname,
    totalInteractions,
    totalMessages,
    totalToolUses,
    currentMood,
    profileCompleteness,
    size = 'medium',
    showLevel = true,
    showXpBar = true,
    animated = true
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [pulseEffect, setPulseEffect] = useState(false);

    // Compute level.
    const totalXp = LEVEL_CONFIG.calculateXpFromStats({
        totalInteractions,
        totalMessages,
        totalToolUses
    });
    const level = LEVEL_CONFIG.calculateLevel(totalXp);
    const xpProgress = (level.xp / level.nextLevelXp) * 100;

    // Pick emoji by mood.
    const getMoodEmoji = () => {
        switch (currentMood) {
            case 'positive': return '😊';
            case 'negative': return '😔';
            default: return '😐';
        }
    };

    // Pick border style by level.
    const getBorderStyle = () => {
        if (level.level >= 50) {
            return 'ring-4 ring-yellow-400 ring-opacity-50';
        } else if (level.level >= 20) {
            return 'ring-2 ring-purple-400 ring-opacity-50';
        } else if (level.level >= 10) {
            return 'ring-2 ring-blue-400 ring-opacity-50';
        }
        return '';
    };

    // Size configuration.
    const sizeConfig = {
        small: { avatar: 'w-12 h-12', text: 'text-lg', badge: 'text-sm', xpHeight: 'h-1' },
        medium: { avatar: 'w-20 h-20', text: 'text-2xl', badge: 'text-lg', xpHeight: 'h-1.5' },
        large: { avatar: 'w-28 h-28', text: 'text-4xl', badge: 'text-2xl', xpHeight: 'h-2' },
    };

    const config = sizeConfig[size];

    // Animation effects.
    useEffect(() => {
        if (animated) {
            const interval = setInterval(() => {
                setPulseEffect(true);
                setTimeout(() => setPulseEffect(false), 1000);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [animated]);

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Avatar container */}
            <div className="relative">
                {/* Level badge - top left */}
                {showLevel && level.level >= 5 && (
                    <div
                        className="absolute -left-2 -top-2 z-10 flex items-center justify-center w-7 h-7 rounded-full shadow-lg"
                        style={{ backgroundColor: level.color }}
                        title={level.title}
                    >
                        <span className="text-sm">{level.badge}</span>
                    </div>
                )}

                {/* Main avatar */}
                <div
                    className={`
                        ${config.avatar} rounded-full 
                        bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400
                        flex items-center justify-center
                        shadow-lg ${getBorderStyle()}
                        ${animated && pulseEffect ? 'animate-pulse' : ''}
                        transition-all duration-300
                    `}
                    style={{
                        boxShadow: level.level >= 20 ? `0 0 20px ${level.color}40` : undefined
                    }}
                >
                    <span className={config.text}>
                        {nickname ? nickname[0].toUpperCase() : getMoodEmoji()}
                    </span>
                </div>

                {/* Mood indicator - bottom right */}
                <div
                    className={`
                        absolute -right-1 -bottom-1 
                        w-6 h-6 rounded-full 
                        flex items-center justify-center
                        bg-slate-800 border-2 
                        ${currentMood === 'positive' ? 'border-green-400' :
                            currentMood === 'negative' ? 'border-red-400' : 'border-slate-500'}
                    `}
                >
                    <span className="text-xs">{getMoodEmoji()}</span>
                </div>

                {/* High-level effect */}
                {level.level >= 35 && animated && (
                    <div className="absolute inset-0 pointer-events-none">
                        <Sparkles
                            className="absolute -top-2 -right-2 text-yellow-400 animate-pulse"
                            size={14}
                        />
                    </div>
                )}
            </div>

            {/* Level info */}
            {showLevel && (
                <div className="text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-lg">{level.badge}</span>
                        <span className="text-sm font-medium text-white">
                            Lv.{level.level}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{level.title}</div>
                </div>
            )}

            {/* XP progress bar */}
            {showXpBar && (
                <div className="w-full max-w-[120px]">
                    <div className={`w-full ${config.xpHeight} bg-slate-700 rounded-full overflow-hidden`}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${xpProgress}%`,
                                background: `linear-gradient(90deg, ${level.color}, ${level.color}80)`
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                        <span>{level.xp} XP</span>
                        <span>{level.nextLevelXp} XP</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Level Progress Card
// ============================================================================

interface LevelProgressCardProps {
    totalInteractions: number;
    totalMessages: number;
    totalToolUses: number;
}

export const LevelProgressCard: React.FC<LevelProgressCardProps> = ({
    totalInteractions,
    totalMessages,
    totalToolUses
}) => {
    const totalXp = LEVEL_CONFIG.calculateXpFromStats({
        totalInteractions,
        totalMessages,
        totalToolUses
    });
    const level = LEVEL_CONFIG.calculateLevel(totalXp);
    const xpProgress = (level.xp / level.nextLevelXp) * 100;

    // Find next milestone.
    const nextMilestone = LEVEL_CONFIG.titles.find(t => t.minLevel > level.level);

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{level.badge}</span>
                    <div>
                        <div className="font-bold text-white">Lv.{level.level}</div>
                        <div className="text-xs text-slate-400">{level.title}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium text-purple-400">{totalXp} XP</div>
                    <div className="text-[10px] text-slate-500">Total XP</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>To Lv.{level.level + 1}</span>
                    <span>{level.xp}/{level.nextLevelXp} XP</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${xpProgress}%`,
                            background: `linear-gradient(90deg, ${level.color}, #a855f7)`
                        }}
                    />
                </div>
            </div>

            {/* Next milestone */}
            {nextMilestone && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 rounded-lg p-2">
                    <span className="text-lg">{nextMilestone.badge}</span>
                    <div>
                        <span className="text-slate-300">Next milestone: </span>
                        <span className="text-purple-400">{nextMilestone.title}</span>
                        <span className="text-slate-500 ml-1">(Lv.{nextMilestone.minLevel})</span>
                    </div>
                </div>
            )}

            {/* XP source breakdown */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="text-xs">
                    <div className="text-slate-400">Interactions</div>
                    <div className="text-white font-medium">{totalInteractions} <span className="text-purple-400">×2</span></div>
                </div>
                <div className="text-xs">
                    <div className="text-slate-400">Messages</div>
                    <div className="text-white font-medium">{totalMessages} <span className="text-blue-400">×3</span></div>
                </div>
                <div className="text-xs">
                    <div className="text-slate-400">Tools</div>
                    <div className="text-white font-medium">{totalToolUses} <span className="text-yellow-400">×5</span></div>
                </div>
            </div>
        </div>
    );
};

export { LEVEL_CONFIG };

export default DynamicAvatar;
