/**
 * Smart Chips Component
 * 意图触发的快捷操作芯片 - 一键激活对应工具
 */

import React from 'react';
import { Calendar, Save, Search, Globe, Plane, ShoppingCart, Calculator, Brain, Heart, Briefcase } from 'lucide-react';
import { SentinelOutput } from '../services/keyboardSentinelService';
import { IntentType } from '../prompts/keyboardSentinel';

interface SmartChipsProps {
    sentinelOutput: SentinelOutput | null;
    onChipClick: (action: ChipAction) => void;
    visible: boolean;
}

export interface ChipAction {
    type: 'smartSave' | 'smartReminder' | 'translate' | 'priceCompare' | 'flightSearch' | 'calculate' | 'query';
    label: string;
    icon: React.ReactNode;
    inputPrepend?: string;  // Text to prepend to user input
}

// Map intents to chip actions
const INTENT_CHIPS: Record<IntentType, ChipAction[]> = {
    [IntentType.SCHEDULE]: [
        { type: 'smartReminder', label: '添加日程', icon: <Calendar size={14} />, inputPrepend: '提醒我：' },
        { type: 'smartSave', label: '记住', icon: <Save size={14} />, inputPrepend: '记住这个：' },
    ],
    [IntentType.PURCHASE]: [
        { type: 'priceCompare', label: '比价搜索', icon: <ShoppingCart size={14} />, inputPrepend: '帮我找最低价：' },
        { type: 'smartSave', label: '加入心愿单', icon: <Heart size={14} />, inputPrepend: '加入心愿单：' },
    ],
    [IntentType.TRAVEL]: [
        { type: 'flightSearch', label: '查机票', icon: <Plane size={14} />, inputPrepend: '帮我找机票：' },
        { type: 'smartReminder', label: '行程提醒', icon: <Calendar size={14} />, inputPrepend: '提醒我：' },
    ],
    [IntentType.TRANSLATE]: [
        { type: 'translate', label: '翻译', icon: <Globe size={14} />, inputPrepend: '翻译：' },
    ],
    [IntentType.CALCULATE]: [
        { type: 'calculate', label: '计算', icon: <Calculator size={14} />, inputPrepend: '计算：' },
    ],
    [IntentType.QUERY]: [
        { type: 'query', label: '搜索', icon: <Search size={14} />, inputPrepend: '帮我找：' },
    ],
    [IntentType.CAREER]: [
        { type: 'query', label: '职业咨询', icon: <Briefcase size={14} />, inputPrepend: '帮我分析：' },
        { type: 'smartSave', label: '记录想法', icon: <Brain size={14} />, inputPrepend: '记住这个想法：' },
    ],
    [IntentType.FINANCE]: [
        { type: 'calculate', label: '计算', icon: <Calculator size={14} />, inputPrepend: '计算：' },
        { type: 'smartSave', label: '记录', icon: <Save size={14} />, inputPrepend: '记住：' },
    ],
    [IntentType.HEALTH]: [
        { type: 'smartReminder', label: '设置提醒', icon: <Calendar size={14} />, inputPrepend: '提醒我：' },
        { type: 'query', label: '查询', icon: <Search size={14} />, inputPrepend: '帮我查：' },
    ],
    [IntentType.NONE]: [],
};

export const SmartChips: React.FC<SmartChipsProps> = ({
    sentinelOutput,
    onChipClick,
    visible
}) => {
    // Only show if visible, has intent, and confidence is high enough
    if (!visible || !sentinelOutput?.intent) return null;

    const intentType = sentinelOutput.intent.type;
    const confidence = sentinelOutput.intent.confidence;

    // Require at least 60% confidence to show chips
    if (confidence < 0.6) return null;

    const chips = INTENT_CHIPS[intentType];
    if (!chips || chips.length === 0) return null;

    return (
        <div className="smart-chips-container">
            <div className="smart-chips-bar">
                <span className="chips-hint">快捷操作</span>
                <div className="chips-list">
                    {chips.map((chip, index) => (
                        <button
                            key={`${chip.type}-${index}`}
                            className="smart-chip"
                            onClick={() => onChipClick(chip)}
                        >
                            {chip.icon}
                            <span>{chip.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <style>{smartChipsStyles}</style>
        </div>
    );
};

const smartChipsStyles = `
  .smart-chips-container {
    padding: 6px 12px;
    background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
    border-top: 1px solid rgba(99, 102, 241, 0.2);
  }
  
  .smart-chips-bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .chips-hint {
    font-size: 11px;
    color: #6366F1;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .chips-list {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .chips-list::-webkit-scrollbar {
    display: none;
  }
  
  .smart-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: white;
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 16px;
    font-size: 12px;
    font-weight: 500;
    color: #4338CA;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .smart-chip:hover {
    background: #6366F1;
    color: white;
    border-color: #6366F1;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }
  
  .smart-chip:active {
    transform: translateY(0);
  }
  
  .smart-chip svg {
    flex-shrink: 0;
  }
`;

export default SmartChips;
