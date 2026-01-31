/**
 * Lumi Progress Card
 * 展示 Lumi 学习进度的轻量级卡片
 */

import React, { useState, useEffect } from 'react';
import { Brain, Clock, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { getValueMetricsService, ValueMetrics } from '../services/valueMetricsService';

interface LumiProgressCardProps {
    compact?: boolean;
    onViewDetails?: () => void;
}

export const LumiProgressCard: React.FC<LumiProgressCardProps> = ({
    compact = false,
    onViewDetails
}) => {
    const [metrics, setMetrics] = useState<ValueMetrics | null>(null);
    const [summaries, setSummaries] = useState<string[]>([]);

    useEffect(() => {
        const service = getValueMetricsService();
        setMetrics(service.getMetrics());
        setSummaries(service.getProgressSummary());
    }, []);

    if (!metrics) {
        return null;
    }

    // 计算整体进度百分比 (满分=100条记忆+有高效时段+10次快捷操作)
    const progressScore = Math.min(100,
        (metrics.memoryCount / 100) * 40 +
        (metrics.peakHours.length > 0 ? 30 : 0) +
        Math.min(30, metrics.chipClicksTotal * 3)
    );

    if (compact) {
        return (
            <div className="lumi-progress-compact" onClick={onViewDetails}>
                <div className="progress-icon">
                    <Brain size={16} />
                </div>
                <div className="progress-text">
                    学习进度 {Math.round(progressScore)}%
                </div>
                <ChevronRight size={14} />
                <style>{compactStyles}</style>
            </div>
        );
    }

    return (
        <div className="lumi-progress-card">
            <div className="progress-header">
                <Brain size={20} />
                <span>Lumi 学习进度</span>
                <div className="progress-badge">{Math.round(progressScore)}%</div>
            </div>

            <div className="progress-items">
                {/* 记忆容量 */}
                <div className="progress-item">
                    <div className="item-icon memory">
                        <Brain size={14} />
                    </div>
                    <div className="item-content">
                        <div className="item-label">记忆容量</div>
                        <div className="item-bar-container">
                            <div
                                className="item-bar memory-bar"
                                style={{ width: `${Math.min(100, metrics.memoryCount)}%` }}
                            />
                        </div>
                    </div>
                    <div className="item-value">{metrics.memoryCount} 条</div>
                </div>

                {/* 高效时段 */}
                <div className="progress-item">
                    <div className="item-icon time">
                        <Clock size={14} />
                    </div>
                    <div className="item-content">
                        <div className="item-label">高效时段</div>
                        <div className="item-detail">
                            {metrics.peakHours.length > 0
                                ? metrics.peakHours.map(h => `${h}:00`).join(', ')
                                : '学习中...'}
                        </div>
                    </div>
                    <div className="item-status">
                        {metrics.peakHours.length > 0 ? '✓' : '...'}
                    </div>
                </div>

                {/* 快捷操作 */}
                <div className="progress-item">
                    <div className="item-icon action">
                        <Zap size={14} />
                    </div>
                    <div className="item-content">
                        <div className="item-label">快捷操作</div>
                        <div className="item-detail">
                            本周节省 {metrics.chipClicksThisWeek} 次
                        </div>
                    </div>
                    <div className="item-value">{metrics.chipClicksTotal} 次</div>
                </div>
            </div>

            {/* Weekly Growth */}
            {metrics.memoryGrowth > 0 && (
                <div className="progress-growth">
                    <TrendingUp size={12} />
                    <span>本周新增 {metrics.memoryGrowth} 条记忆</span>
                </div>
            )}

            {onViewDetails && (
                <button className="view-details-btn" onClick={onViewDetails}>
                    查看详情 <ChevronRight size={14} />
                </button>
            )}

            <style>{cardStyles}</style>
        </div>
    );
};

const compactStyles = `
  .lumi-progress-compact {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .lumi-progress-compact:hover {
    background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%);
  }
  
  .progress-icon {
    color: #6366F1;
  }
  
  .progress-text {
    font-size: 12px;
    font-weight: 500;
    color: #4338CA;
  }
`;

const cardStyles = `
  .lumi-progress-card {
    background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
    border-radius: 16px;
    padding: 16px;
    color: white;
  }
  
  .progress-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-weight: 600;
    font-size: 14px;
  }
  
  .progress-badge {
    margin-left: auto;
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
  }
  
  .progress-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .progress-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .item-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .item-icon.memory { background: rgba(168, 85, 247, 0.3); color: #C4B5FD; }
  .item-icon.time { background: rgba(59, 130, 246, 0.3); color: #93C5FD; }
  .item-icon.action { background: rgba(234, 179, 8, 0.3); color: #FDE047; }
  
  .item-content {
    flex: 1;
    min-width: 0;
  }
  
  .item-label {
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 2px;
  }
  
  .item-bar-container {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .item-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }
  
  .memory-bar { background: linear-gradient(90deg, #A855F7, #C4B5FD); }
  
  .item-detail {
    font-size: 11px;
    opacity: 0.7;
  }
  
  .item-value {
    font-size: 13px;
    font-weight: 500;
    min-width: 50px;
    text-align: right;
  }
  
  .item-status {
    font-size: 12px;
    opacity: 0.6;
  }
  
  .progress-growth {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
    color: #86EFAC;
  }
  
  .view-details-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    margin-top: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .view-details-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export default LumiProgressCard;
