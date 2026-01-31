/**
 * Sentinel Indicator Component
 * 显示键盘哨兵的实时分析结果
 */

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Sparkles, Eye, Lock, TrendingUp, MapPin, Calendar, Briefcase, Heart, DollarSign, Search, Languages, Calculator, Compass } from 'lucide-react';
import { SentinelOutput } from '../services/keyboardSentinelService';
import { IntentType, PrivacyRiskType } from '../prompts/keyboardSentinel';

interface SentinelIndicatorProps {
  output: SentinelOutput | null;
  onMaskApply?: (maskedText: string) => void;
  onIntentAction?: (intentType: string) => void;
  onDestinySimulate?: (intentType: string, params: Record<string, any>) => void;
}

// 判断是否为重大决策意图（仅职业和财务决策，不包括普通购物）
function isMajorDecision(intentType: IntentType): boolean {
  return [IntentType.CAREER, IntentType.FINANCE].includes(intentType);
}

export const SentinelIndicator: React.FC<SentinelIndicatorProps> = ({
  output,
  onMaskApply,
  onIntentAction,
  onDestinySimulate
}) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (output && (output.privacy || (output.intent && output.meta.shouldEscalate))) {
      setAnimating(true);
      setVisible(true);
      setTimeout(() => setAnimating(false), 300);
    } else {
      setVisible(false);
    }
  }, [output]);

  if (!visible || !output) return null;

  // 隐私风险显示
  if (output.privacy) {
    return (
      <div className={`sentinel-indicator privacy ${animating ? 'animate-in' : ''}`}>
        <div className="sentinel-icon privacy-icon">
          <Shield size={16} />
        </div>
        <div className="sentinel-content">
          <div className="sentinel-title">
            <AlertTriangle size={12} />
            <span>检测到敏感信息</span>
            <span className="risk-badge">{getRiskLabel(output.privacy.risk)}</span>
          </div>
          {output.privacy.maskedPreview && (
            <div className="sentinel-preview">
              <Lock size={10} />
              <code>{output.privacy.maskedPreview}</code>
            </div>
          )}
          <div className="sentinel-actions">
            {output.privacy.action === 'mask' && onMaskApply && output.privacy.maskedPreview && (
              <button
                className="action-btn mask"
                onClick={() => onMaskApply(output.privacy!.maskedPreview!)}
              >
                使用脱敏版本
              </button>
            )}
            {output.privacy.action === 'block' && (
              <span className="action-warning">⚠️ 建议不要发送密码</span>
            )}
            {output.privacy.action === 'warn' && (
              <span className="action-hint">提示：包含个人信息</span>
            )}
          </div>
        </div>

        <style>{sentinelStyles}</style>
      </div>
    );
  }

  // 意图显示
  if (output.intent && output.meta.shouldEscalate) {
    const intentInfo = getIntentInfo(output.intent.type);

    return (
      <div className={`sentinel-indicator intent ${animating ? 'animate-in' : ''}`}>
        <div className={`sentinel-icon intent-icon ${output.intent.urgency}`}>
          {intentInfo.icon}
        </div>
        <div className="sentinel-content">
          <div className="sentinel-title">
            <Sparkles size={12} />
            <span>识别到意图</span>
            <span className={`intent-badge ${output.intent.urgency}`}>
              {intentInfo.label}
            </span>
            <span className="confidence">
              {(output.intent.confidence * 100).toFixed(0)}%
            </span>
          </div>
          {Object.keys(output.intent.params).length > 0 && (
            <div className="sentinel-params">
              {Object.entries(output.intent.params)
                .filter(([_, v]) => v !== undefined)
                .slice(0, 3)
                .map(([key, value]) => (
                  <span key={key} className="param-tag">
                    {getParamLabel(key)}: {String(value)}
                  </span>
                ))}
            </div>
          )}
          <div className="sentinel-actions">
            {onIntentAction && (
              <button
                className="action-btn activate"
                onClick={() => onIntentAction(output.intent!.type)}
              >
                <Sparkles size={12} />
                激活 Lumi 助手
              </button>
            )}
            {onDestinySimulate && isMajorDecision(output.intent!.type) && (
              <button
                className="action-btn destiny"
                onClick={() => onDestinySimulate(output.intent!.type, output.intent!.params)}
              >
                <Compass size={12} />
                命运模拟
              </button>
            )}
          </div>
        </div>

        <style>{sentinelStyles}</style>
      </div>
    );
  }

  return null;
};

// 获取风险类型标签
function getRiskLabel(risk: PrivacyRiskType): string {
  const labels: Record<PrivacyRiskType, string> = {
    [PrivacyRiskType.ID_CARD]: '身份证',
    [PrivacyRiskType.PHONE]: '手机号',
    [PrivacyRiskType.BANK_CARD]: '银行卡',
    [PrivacyRiskType.PASSWORD]: '密码',
    [PrivacyRiskType.ADDRESS]: '地址',
    [PrivacyRiskType.EMAIL]: '邮箱',
    [PrivacyRiskType.NAME_CONTEXT]: '姓名',
  };
  return labels[risk] || risk;
}

// 获取意图信息
function getIntentInfo(type: IntentType): { icon: React.ReactNode; label: string } {
  const info: Record<IntentType, { icon: React.ReactNode; label: string }> = {
    [IntentType.PURCHASE]: { icon: <TrendingUp size={16} />, label: '购物' },
    [IntentType.TRAVEL]: { icon: <MapPin size={16} />, label: '出行' },
    [IntentType.SCHEDULE]: { icon: <Calendar size={16} />, label: '日程' },
    [IntentType.CAREER]: { icon: <Briefcase size={16} />, label: '职业' },
    [IntentType.HEALTH]: { icon: <Heart size={16} />, label: '健康' },
    [IntentType.FINANCE]: { icon: <DollarSign size={16} />, label: '财务' },
    [IntentType.QUERY]: { icon: <Search size={16} />, label: '查询' },
    [IntentType.TRANSLATE]: { icon: <Languages size={16} />, label: '翻译' },
    [IntentType.CALCULATE]: { icon: <Calculator size={16} />, label: '计算' },
    [IntentType.NONE]: { icon: <Eye size={16} />, label: '无' },
  };
  return info[type] || { icon: <Sparkles size={16} />, label: type };
}

// 获取参数标签
function getParamLabel(key: string): string {
  const labels: Record<string, string> = {
    destination: '目的地',
    date: '日期',
    time: '时间',
    product: '类型',
    amount: '金额',
    action: '动作',
    sentiment: '情绪',
    hasSymptom: '有症状',
    symptom: '症状',
  };
  return labels[key] || key;
}

// 样式
const sentinelStyles = `
  .sentinel-indicator {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    margin: 4px 8px;
    border-radius: 12px;
    font-size: 13px;
    transition: all 0.3s ease;
  }
  
  .sentinel-indicator.animate-in {
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .sentinel-indicator.privacy {
    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
    border: 1px solid #F59E0B;
  }
  
  .sentinel-indicator.intent {
    background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%);
    border: 1px solid #6366F1;
  }
  
  .sentinel-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .sentinel-icon.privacy-icon {
    background: #F59E0B;
    color: white;
  }
  
  .sentinel-icon.intent-icon {
    background: #6366F1;
    color: white;
  }
  
  .sentinel-icon.intent-icon.high {
    background: #EF4444;
    animation: pulse 1.5s infinite;
  }
  
  .sentinel-icon.intent-icon.medium {
    background: #6366F1;
  }
  
  .sentinel-icon.intent-icon.low {
    background: #10B981;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .sentinel-content {
    flex: 1;
    min-width: 0;
  }
  
  .sentinel-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 4px;
  }
  
  .risk-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: #EF4444;
    color: white;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .intent-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .intent-badge.high {
    background: #EF4444;
    color: white;
  }
  
  .intent-badge.medium {
    background: #6366F1;
    color: white;
  }
  
  .intent-badge.low {
    background: #10B981;
    color: white;
  }
  
  .confidence {
    font-size: 10px;
    color: #6B7280;
    margin-left: auto;
  }
  
  .sentinel-preview {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(0,0,0,0.05);
    border-radius: 4px;
    margin-bottom: 6px;
  }
  
  .sentinel-preview code {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 12px;
    color: #374151;
  }
  
  .sentinel-params {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }
  
  .param-tag {
    font-size: 11px;
    padding: 2px 6px;
    background: rgba(99, 102, 241, 0.1);
    color: #4338CA;
    border-radius: 4px;
  }
  
  .sentinel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .action-btn.mask {
    background: #F59E0B;
    color: white;
  }
  
  .action-btn.mask:hover {
    background: #D97706;
  }
  
  .action-btn.activate {
    background: #6366F1;
    color: white;
  }
  
  .action-btn.activate:hover {
    background: #4F46E5;
  }
  
  .action-btn.destiny {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: white;
  }
  
  .action-btn.destiny:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
  }
  
  .action-warning {
    font-size: 11px;
    color: #DC2626;
    font-weight: 500;
  }
  
  .action-hint {
    font-size: 11px;
    color: #6B7280;
  }
`;
