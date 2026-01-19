import React, { useState, useRef, useCallback, useEffect } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { InputMode } from '../types';
import { Globe } from 'lucide-react';

interface LumiKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  onModeChange: (mode: InputMode) => void;
  currentMode: InputMode;
}

export const LumiKeyboard: React.FC<LumiKeyboardProps> = ({
  onKeyPress,
  onDelete,
  onEnter,
  onModeChange,
  currentMode
}) => {
  const [layoutName, setLayoutName] = useState<'default' | 'shift' | 'numbers'>('default');
  const [language, setLanguage] = useState<'EN' | 'ZH'>('EN');
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timerRef = useRef<number | null>(null);
  const keyboardRef = useRef<any>(null);

  // Custom layout with space bar placeholder
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
      '{shift} Z X C V B N M {bksp}',
      '{numbers} {lang} {space} {enter}'
    ],
    numbers: [
      '1 2 3 4 5 6 7 8 9 0',
      '- / : ; ( ) $ & @ "',
      "{abc} . , ? ! ' # + = {bksp}",
      '{numbers} {lang} {space} {enter}'
    ]
  };

  const display = {
    '{bksp}': '⌫',
    '{enter}': currentMode === InputMode.AGENT ? '↑' : 'Go',
    '{shift}': '⇧',
    '{space}': currentMode === InputMode.AGENT ? 'Hold to Exit' : 'Space',
    '{numbers}': '123',
    '{abc}': 'ABC',
    '{lang}': language
  };

  const handleKeyDown = useCallback((button: string) => {
    // Handle special keys
    if (button === '{bksp}') {
      onDelete();
      return;
    }
    if (button === '{enter}') {
      onEnter();
      return;
    }
    if (button === '{shift}') {
      setLayoutName(prev => prev === 'shift' ? 'default' : 'shift');
      return;
    }
    if (button === '{numbers}') {
      setLayoutName('numbers');
      return;
    }
    if (button === '{abc}') {
      setLayoutName('default');
      return;
    }
    if (button === '{lang}') {
      setLanguage(prev => prev === 'EN' ? 'ZH' : 'EN');
      return;
    }
    if (button === '{space}') {
      // Space is handled by mouse events for long press
      return;
    }

    // Regular key
    onKeyPress(button);

    // Auto-return to lowercase after typing in shift mode
    if (layoutName === 'shift') {
      setLayoutName('default');
    }
  }, [onDelete, onEnter, onKeyPress, layoutName]);

  // Space bar long press handling
  const handleSpaceDown = useCallback(() => {
    setLongPressTriggered(false);
    timerRef.current = window.setTimeout(() => {
      setLongPressTriggered(true);
      onModeChange(currentMode === InputMode.TYPE ? InputMode.AGENT : InputMode.TYPE);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [currentMode, onModeChange]);

  const handleSpaceUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!longPressTriggered) {
      onKeyPress(' ');
    }
    setLongPressTriggered(false);
  }, [longPressTriggered, onKeyPress]);

  // Attach custom event handlers to space bar
  useEffect(() => {
    const attachSpaceHandlers = () => {
      const spaceButton = document.querySelector('.hg-button-space');
      if (spaceButton) {
        spaceButton.addEventListener('mousedown', handleSpaceDown);
        spaceButton.addEventListener('mouseup', handleSpaceUp);
        spaceButton.addEventListener('mouseleave', handleSpaceUp);
        spaceButton.addEventListener('touchstart', handleSpaceDown);
        spaceButton.addEventListener('touchend', handleSpaceUp);
      }
    };

    // Wait for keyboard to render
    const timer = setTimeout(attachSpaceHandlers, 100);

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
    <div className={`lumi-keyboard-wrapper ${isAgentMode ? 'agent-mode' : ''}`}>
      {/* Agent Mode Indicator */}
      {isAgentMode && (
        <div className="flex justify-center py-2 animate-pulse bg-indigo-900">
          <span className="text-xs font-bold text-indigo-300 tracking-widest">LUMI AGENT ACTIVE</span>
        </div>
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
        theme={`hg-theme-default ${isAgentMode ? 'hg-theme-agent' : 'hg-theme-light'}`}
        buttonTheme={[
          {
            class: 'hg-button-space',
            buttons: '{space}'
          },
          {
            class: 'hg-button-enter',
            buttons: '{enter}'
          }
        ]}
      />

      <style>{`
        .lumi-keyboard-wrapper {
          padding-bottom: 1.5rem;
          transition: background-color 0.3s ease;
        }
        
        .lumi-keyboard-wrapper.agent-mode {
          background-color: #312e81;
        }
        
        /* Light Theme (TYPE Mode) */
        .hg-theme-light {
          background-color: #e5e7eb;
          padding: 8px;
        }
        
        .hg-theme-light .hg-button {
          background: white;
          color: #1f2937;
          border-bottom: 2px solid #d1d5db;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border-radius: 8px;
          height: 42px;
          font-size: 18px;
          font-weight: 500;
        }
        
        .hg-theme-light .hg-button:active {
          background: #f3f4f6;
          transform: scale(0.95);
        }
        
        .hg-theme-light .hg-button-space {
          background: white;
          flex-grow: 4;
        }
        
        .hg-theme-light .hg-button-enter {
          background: #2563eb;
          color: white;
          min-width: 60px;
        }
        
        .hg-theme-light .hg-button-enter:active {
          background: #1d4ed8;
        }
        
        /* Agent Theme */
        .hg-theme-agent {
          background-color: #312e81;
          padding: 8px;
        }
        
        .hg-theme-agent .hg-button {
          background: #4338ca;
          color: white;
          border-bottom: 2px solid #3730a3;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border-radius: 8px;
          height: 42px;
          font-size: 18px;
          font-weight: 500;
        }
        
        .hg-theme-agent .hg-button:active {
          background: #4f46e5;
          transform: scale(0.95);
        }
        
        .hg-theme-agent .hg-button-space {
          background: #6366f1;
          border-color: #4338ca;
          flex-grow: 4;
        }
        
        .hg-theme-agent .hg-button-enter {
          background: #4f46e5;
          color: white;
          min-width: 60px;
        }
        
        .hg-theme-agent .hg-button-enter:active {
          background: #4338ca;
        }
        
        /* Common styles */
        .hg-row {
          margin-bottom: 6px;
        }
        
        .hg-button {
          margin: 0 3px;
        }
      `}</style>
    </div>
  );
};

// Export with the same name for backward compatibility
export { LumiKeyboard as Keyboard };