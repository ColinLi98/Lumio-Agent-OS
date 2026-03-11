/**
 * Smart Chips Component
 * Intent-triggered quick action chips for one-tap tool activation
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
        { type: 'smartReminder', label: 'Add schedule', icon: <Calendar size={14} />, inputPrepend: 'Remind me: ' },
        { type: 'smartSave', label: 'Remember', icon: <Save size={14} />, inputPrepend: 'Remember this: ' },
    ],
    [IntentType.PURCHASE]: [
        { type: 'priceCompare', label: 'Price compare', icon: <ShoppingCart size={14} />, inputPrepend: 'Find the lowest price for: ' },
        { type: 'smartSave', label: 'Add to wishlist', icon: <Heart size={14} />, inputPrepend: 'Add to wishlist: ' },
    ],
    [IntentType.TRAVEL]: [
        { type: 'flightSearch', label: 'Find flights', icon: <Plane size={14} />, inputPrepend: 'Find flights for: ' },
        { type: 'smartReminder', label: 'Trip reminder', icon: <Calendar size={14} />, inputPrepend: 'Remind me: ' },
    ],
    [IntentType.TRANSLATE]: [
        { type: 'translate', label: 'Translate', icon: <Globe size={14} />, inputPrepend: 'Translate: ' },
    ],
    [IntentType.CALCULATE]: [
        { type: 'calculate', label: 'Calculate', icon: <Calculator size={14} />, inputPrepend: 'Calculate: ' },
    ],
    [IntentType.QUERY]: [
        { type: 'query', label: 'Search', icon: <Search size={14} />, inputPrepend: 'Find: ' },
    ],
    [IntentType.CAREER]: [
        { type: 'query', label: 'Career advice', icon: <Briefcase size={14} />, inputPrepend: 'Help me analyze: ' },
        { type: 'smartSave', label: 'Capture idea', icon: <Brain size={14} />, inputPrepend: 'Remember this idea: ' },
    ],
    [IntentType.FINANCE]: [
        { type: 'calculate', label: 'Calculate', icon: <Calculator size={14} />, inputPrepend: 'Calculate: ' },
        { type: 'smartSave', label: 'Record', icon: <Save size={14} />, inputPrepend: 'Remember: ' },
    ],
    [IntentType.HEALTH]: [
        { type: 'smartReminder', label: 'Set reminder', icon: <Calendar size={14} />, inputPrepend: 'Remind me: ' },
        { type: 'query', label: 'Lookup', icon: <Search size={14} />, inputPrepend: 'Look up: ' },
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
                <span className="chips-hint">Quick actions</span>
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
