import React, { useState, useRef, useCallback, useEffect } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { InputMode } from '../types';
import { getPinyinCandidates } from '../services/pinyinService';

interface LumiKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  onModeChange: (mode: InputMode) => void;
  currentMode: InputMode;
}

// 输入法类型
type InputLanguage = 'EN' | 'ZH';

// 拼音候选词栏组件
const PinyinCandidateBar: React.FC<{
  pinyin: string;
  candidates: string[];
  onSelect: (char: string) => void;
  isAgentMode: boolean;
}> = ({ pinyin, candidates, onSelect, isAgentMode }) => {
  if (!pinyin && candidates.length === 0) return null;
  
  return (
    <div className={`pinyin-bar ${isAgentMode ? 'agent' : ''}`}>
      <div className="pinyin-text">{pinyin}</div>
      <div className="pinyin-candidates">
        {candidates.map((char, idx) => (
          <button
            key={idx}
            className="pinyin-candidate"
            onClick={() => onSelect(char)}
          >
            <span className="candidate-num">{idx + 1}</span>
            <span className="candidate-char">{char}</span>
          </button>
        ))}
      </div>
      <style>{`
        .pinyin-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #F5F5F5;
          border-bottom: 1px solid #E0E0E0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .pinyin-bar.agent {
          background: rgba(255,255,255,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.15);
        }
        
        .pinyin-text {
          font-size: 16px;
          font-weight: 500;
          color: #007AFF;
          padding: 4px 10px;
          background: rgba(0, 122, 255, 0.1);
          border-radius: 4px;
          flex-shrink: 0;
        }
        
        .pinyin-bar.agent .pinyin-text {
          color: #A5B4FC;
          background: rgba(165, 180, 252, 0.15);
        }
        
        .pinyin-candidates {
          display: flex;
          gap: 4px;
          flex: 1;
          overflow-x: auto;
        }
        
        .pinyin-candidate {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 10px;
          background: #FFFFFF;
          border: 1px solid #E0E0E0;
          border-radius: 6px;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        
        .pinyin-candidate:hover {
          background: #F0F0F0;
          border-color: #007AFF;
        }
        
        .pinyin-candidate:active {
          background: #E0E0E0;
          transform: scale(0.95);
        }
        
        .pinyin-bar.agent .pinyin-candidate {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: white;
        }
        
        .pinyin-bar.agent .pinyin-candidate:hover {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.4);
        }
        
        .candidate-num {
          font-size: 10px;
          color: #999;
          margin-right: 2px;
        }
        
        .pinyin-bar.agent .candidate-num {
          color: rgba(255,255,255,0.5);
        }
        
        .candidate-char {
          font-size: 18px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export const LumiKeyboard: React.FC<LumiKeyboardProps> = ({
  onKeyPress,
  onDelete,
  onEnter,
  onModeChange,
  currentMode
}) => {
  const [layoutName, setLayoutName] = useState<'default' | 'shift' | 'numbers' | 'symbols'>('default');
  const [language, setLanguage] = useState<InputLanguage>('EN');
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timerRef = useRef<number | null>(null);
  const keyboardRef = useRef<any>(null);
  
  // 拼音输入状态
  const [pinyinBuffer, setPinyinBuffer] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);

  // iOS 风格布局
  const layouts = {
    default: [
      'q w e r t y u i o p',
      'a s d f g h j k l',
      '{shift} z x c v b n m {bksp}',
      '{numbers} {lang} {space} {enter}'
    ],
    shift: [
      'Q W E R T Y U I O P',
      'A S D F G H J K L',
      '{shiftactive} Z X C V B N M {bksp}',
      '{numbers} {lang} {space} {enter}'
    ],
    numbers: [
      '1 2 3 4 5 6 7 8 9 0',
      '- / : ; ( ) ¥ & @ "',
      '{symbols} . , ? ! \' {bksp}',
      '{abc} {lang} {space} {enter}'
    ],
    symbols: [
      '[ ] { } # % ^ * + =',
      '_ \\ | ~ < > € £ $ ·',
      '{numbers} . , ? ! \' {bksp}',
      '{abc} {lang} {space} {enter}'
    ]
  };

  const display = {
    '{bksp}': '⌫',
    '{enter}': currentMode === InputMode.AGENT ? '发送' : '换行',
    '{shift}': '⇧',
    '{shiftactive}': '⇧',
    '{space}': currentMode === InputMode.AGENT ? '长按退出 Agent' : '长按启动 Lumi',
    '{numbers}': '123',
    '{symbols}': '#+=',
    '{abc}': 'ABC',
    '{lang}': language === 'EN' ? '🌐' : '中'
  };

  // 更新候选词
  useEffect(() => {
    if (language === 'ZH' && pinyinBuffer) {
      const newCandidates = getPinyinCandidates(pinyinBuffer, 9);
      setCandidates(newCandidates);
    } else {
      setCandidates([]);
    }
  }, [pinyinBuffer, language]);

  // 选择候选词
  const selectCandidate = useCallback((char: string) => {
    onKeyPress(char);
    setPinyinBuffer('');
    setCandidates([]);
  }, [onKeyPress]);

  const handleKeyDown = useCallback((button: string) => {
    // 删除键
    if (button === '{bksp}') {
      if (language === 'ZH' && pinyinBuffer) {
        // 如果有拼音缓冲，先删除拼音
        setPinyinBuffer(prev => prev.slice(0, -1));
      } else {
        onDelete();
      }
      return;
    }
    
    // 回车键
    if (button === '{enter}') {
      if (language === 'ZH' && pinyinBuffer) {
        // 如果有拼音缓冲，先清空并输出原始拼音
        onKeyPress(pinyinBuffer);
        setPinyinBuffer('');
        setCandidates([]);
      } else {
        onEnter();
      }
      return;
    }
    
    if (button === '{shift}' || button === '{shiftactive}') {
      setLayoutName(prev => prev === 'shift' ? 'default' : 'shift');
      return;
    }
    if (button === '{numbers}') {
      setLayoutName('numbers');
      return;
    }
    if (button === '{symbols}') {
      setLayoutName('symbols');
      return;
    }
    if (button === '{abc}') {
      setLayoutName('default');
      return;
    }
    if (button === '{lang}') {
      // 切换语言时清空拼音缓冲
      setPinyinBuffer('');
      setCandidates([]);
      setLanguage(prev => prev === 'EN' ? 'ZH' : 'EN');
      // 震动反馈
      if (navigator.vibrate) navigator.vibrate(30);
      return;
    }
    if (button === '{space}') {
      return; // Handled by mouse events
    }

    // 中文输入模式
    if (language === 'ZH' && /^[a-zA-Z]$/.test(button)) {
      // 字母键 - 添加到拼音缓冲
      setPinyinBuffer(prev => prev + button.toLowerCase());
      return;
    }

    // 英文模式或非字母键 - 直接输出
    onKeyPress(button);

    // Auto-return to lowercase
    if (layoutName === 'shift') {
      setLayoutName('default');
    }
  }, [onDelete, onEnter, onKeyPress, layoutName, language, pinyinBuffer]);

  // Space bar long press
  const handleSpaceDown = useCallback(() => {
    setLongPressTriggered(false);
    timerRef.current = window.setTimeout(() => {
      setLongPressTriggered(true);
      onModeChange(currentMode === InputMode.TYPE ? InputMode.AGENT : InputMode.TYPE);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  }, [currentMode, onModeChange]);

  const handleSpaceUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!longPressTriggered) {
      // 如果是中文模式且有候选词，选择第一个
      if (language === 'ZH' && candidates.length > 0) {
        selectCandidate(candidates[0]);
      } else {
        onKeyPress(' ');
      }
    }
    setLongPressTriggered(false);
  }, [longPressTriggered, onKeyPress, language, candidates, selectCandidate]);

  useEffect(() => {
    const attachSpaceHandlers = () => {
      const spaceButton = document.querySelector('.hg-button-space');
      if (spaceButton) {
        spaceButton.addEventListener('mousedown', handleSpaceDown);
        spaceButton.addEventListener('mouseup', handleSpaceUp);
        spaceButton.addEventListener('mouseleave', handleSpaceUp);
        spaceButton.addEventListener('touchstart', handleSpaceDown, { passive: true });
        spaceButton.addEventListener('touchend', handleSpaceUp);
      }
    };

    const timer = setTimeout(attachSpaceHandlers, 50);
    return () => {
      clearTimeout(timer);
      const spaceButton = document.querySelector('.hg-button-space');
      if (spaceButton) {
        spaceButton.removeEventListener('mousedown', handleSpaceDown);
        spaceButton.removeEventListener('mouseup', handleSpaceUp);
        spaceButton.removeEventListener('mouseleave', handleSpaceUp);
        spaceButton.removeEventListener('touchstart', handleSpaceDown);
        spaceButton.removeEventListener('touchend', handleSpaceUp);
      }
    };
  }, [handleSpaceDown, handleSpaceUp, layoutName]);

  const isAgentMode = currentMode === InputMode.AGENT;

  return (
    <div className={`lumi-kb ${isAgentMode ? 'agent' : ''}`}>
      {/* Agent Mode Banner */}
      {isAgentMode && (
        <div className="lumi-kb-banner">
          <div className="lumi-kb-banner-dot" />
          <span>Lumi Agent</span>
        </div>
      )}
      
      {/* 拼音候选词栏 */}
      {language === 'ZH' && (
        <PinyinCandidateBar
          pinyin={pinyinBuffer}
          candidates={candidates}
          onSelect={selectCandidate}
          isAgentMode={isAgentMode}
        />
      )}

      <Keyboard
        keyboardRef={r => (keyboardRef.current = r)}
        layoutName={layoutName}
        layout={layouts}
        display={display}
        onKeyPress={handleKeyDown}
        mergeDisplay={true}
        physicalKeyboardHighlight={false}
        physicalKeyboardHighlightPress={false}
        theme="hg-theme-ios"
        buttonTheme={[
          { class: 'hg-space', buttons: '{space}' },
          { class: 'hg-enter', buttons: '{enter}' },
          { class: 'hg-special', buttons: '{shift} {shiftactive} {bksp} {numbers} {symbols} {abc}' },
          { class: 'hg-shift-active', buttons: '{shiftactive}' },
          { class: 'hg-lang', buttons: '{lang}' }
        ]}
      />

      <style>{`
        .lumi-kb {
          background: #D1D4D9;
          padding: 6px 2px 20px;
          transition: all 0.3s ease;
        }
        
        .lumi-kb.agent {
          background: linear-gradient(180deg, #4338CA 0%, #3730A3 100%);
        }
        
        /* Agent Banner */
        .lumi-kb-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px;
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        .lumi-kb-banner-dot {
          width: 6px;
          height: 6px;
          background: #34D399;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        /* iOS Theme Base */
        .hg-theme-ios {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          background: transparent;
          width: 100%;
          box-sizing: border-box;
        }
        
        .hg-theme-ios .hg-row {
          display: flex;
          justify-content: center;
          margin-bottom: 6px;
          width: 100%;
          box-sizing: border-box;
        }
        
        .hg-theme-ios .hg-row:last-child {
          margin-bottom: 0;
        }
        
        /* Letter Keys */
        .hg-theme-ios .hg-button {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          flex: 1;
          max-width: 36px;
          margin: 0 2.5px;
          padding: 0;
          border: none;
          border-radius: 5px;
          font-size: 20px;
          font-weight: 400;
          background: #FFFFFF;
          color: #000000;
          box-shadow: 0 1px 0 0 rgba(0,0,0,0.3);
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.1s ease;
        }
        
        .hg-theme-ios .hg-button:active {
          background: #D4D4D4;
        }
        
        /* Special Keys (Shift, Delete, 123, etc.) */
        .hg-theme-ios .hg-special {
          background: #AEB3BC;
          color: #000000;
          font-size: 14px;
          font-weight: 500;
          min-width: 40px;
          max-width: 44px;
          flex-shrink: 0;
        }
        
        .hg-theme-ios .hg-special:active {
          background: #9CA1AA;
        }
        
        /* Shift Active */
        .hg-theme-ios .hg-shift-active {
          background: #FFFFFF;
          color: #000000;
        }
        
        /* Space Bar */
        .hg-theme-ios .hg-space {
          flex: 1 1 auto !important;
          max-width: none !important;
          min-width: 120px;
          font-size: 13px;
          font-weight: 500;
          background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%);
          color: #4338CA;
          border: 1px solid #A5B4FC;
        }
        
        .hg-theme-ios .hg-space:active {
          background: linear-gradient(135deg, #C7D2FE 0%, #A5B4FC 100%);
        }
        
        /* Enter/Return Key */
        .hg-theme-ios .hg-enter {
          background: #007AFF;
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 500;
          min-width: 72px;
          max-width: 80px;
          flex-shrink: 0;
        }
        
        .hg-theme-ios .hg-enter:active {
          background: #0056B3;
        }
        
        /* Language Switch Button */
        .hg-theme-ios .hg-lang {
          background: #AEB3BC;
          color: #000000;
          font-size: 16px;
          min-width: 40px;
          max-width: 44px;
          flex-shrink: 0;
        }
        
        .hg-theme-ios .hg-lang:active {
          background: #9CA1AA;
        }
        
        /* Agent Mode Overrides */
        .lumi-kb.agent .hg-theme-ios .hg-button {
          background: rgba(255,255,255,0.15);
          color: #FFFFFF;
          box-shadow: 0 1px 0 0 rgba(0,0,0,0.2);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-button:active {
          background: rgba(255,255,255,0.25);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-special {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.9);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-special:active {
          background: rgba(255,255,255,0.2);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-shift-active {
          background: rgba(255,255,255,0.25);
          color: #FFFFFF;
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-space {
          background: linear-gradient(135deg, #818CF8 0%, #6366F1 100%);
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-space:active {
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
          transform: scale(0.98);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-enter {
          background: #34D399;
          color: #000000;
          font-weight: 600;
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-enter:active {
          background: #10B981;
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-lang {
          background: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.9);
        }
        
        .lumi-kb.agent .hg-theme-ios .hg-lang:active {
          background: rgba(255,255,255,0.25);
        }
        
        /* Row Adjustments - 关键修复 */
        .hg-theme-ios .hg-row:nth-child(1) {
          padding: 0 2px;
        }
        
        .hg-theme-ios .hg-row:nth-child(2) {
          padding: 0 16px;
        }
        
        .hg-theme-ios .hg-row:nth-child(3) {
          padding: 0 2px;
        }
        
        .hg-theme-ios .hg-row:nth-child(4) {
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
};

export { LumiKeyboard as Keyboard };
