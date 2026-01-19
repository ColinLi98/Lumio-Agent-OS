import React, { useState, useEffect } from 'react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { CommandCenter } from './components/CommandCenter';
import { OnboardingOverlay, shouldShowOnboarding } from './components/OnboardingOverlay';
import { SoulMatrix, PolicyConfig } from './types';
import { useApiKey } from './services/apiKeyManager';
import { useTheme } from './services/themeManager';
import { Bot, Key, AlertTriangle, X, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { apiKeyState, setApiKey, setPersist, saveAndValidate, clearApiKey } = useApiKey();
  const { theme, toggleTheme } = useTheme();

  // Check for onboarding on mount
  useEffect(() => {
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  // Default Configs
  const [soul, setSoul] = useState<SoulMatrix>({
    communicationStyle: 'Professional',
    riskTolerance: 'Low',
    privacyLevel: 'Balanced'
  });

  const [policy, setPolicy] = useState<PolicyConfig>({
    allowNetworkInAgentMode: true,
    requireConfirmBeforeSend: true,
    allowedServices: ['Search', 'Maps']
  });

  const handleLog = (log: string) => {
    setLogs(prev => [log, ...prev].slice(0, 50));
  };

  const hasValidApiKey = apiKeyState.status === 'valid';
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <OnboardingOverlay
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Banner - Dismissible */}
      {!hasValidApiKey && !bannerDismissed && (
        <div className="bg-red-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2 relative">
          <AlertTriangle size={16} />
          <span>
            {apiKeyState.status === 'empty'
              ? 'API Key not configured. Enter your Gemini API Key in Command Center to enable Agent features.'
              : apiKeyState.status === 'invalid'
                ? `Invalid API Key: ${apiKeyState.error || 'Please check your key.'}`
                : apiKeyState.status === 'validating'
                  ? 'Validating API Key...'
                  : 'API Key missing.'}
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-4 hover:bg-red-700 p-1 rounded transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Layout */}
      <main className="flex-1 p-4 md:p-8 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8 md:gap-12 max-w-7xl mx-auto w-full">

        {/* Left: Phone Simulator */}
        <div className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <Bot className="text-indigo-500" />
                Lumi Simulator
              </h1>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all duration-200 ${isDark ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            <p className={`text-sm mt-1 max-w-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Interact with the virtual phone.
              Long press <span className={`font-bold px-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>Space</span> to toggle Agent Mode.
            </p>
          </div>
          <PhoneSimulator
            soul={soul}
            policy={policy}
            apiKey={apiKeyState.key}
            onAgentLog={handleLog}
          />
          <div className={`mt-8 text-xs max-w-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <p><strong>UX Note:</strong> In Agent Mode (Blue Keyboard), text is intercepted by Lumi and sent to Gemini.
              It is NOT sent to the chat until you tap a draft.</p>
          </div>
        </div>

        {/* Right: Command Center */}
        <div className="w-full max-w-2xl flex flex-col h-full min-h-[500px]">
          <CommandCenter
            soul={soul}
            policy={policy}
            onUpdateSoul={setSoul}
            onUpdatePolicy={setPolicy}
            logs={logs}
            apiKeyState={apiKeyState}
            onApiKeyChange={setApiKey}
            onPersistChange={setPersist}
            onSaveApiKey={saveAndValidate}
            onClearApiKey={clearApiKey}
          />

          <div className={`mt-6 p-6 rounded-xl border shadow-sm transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Key size={16} className="text-yellow-500" />
              Quick Start Guide
            </h3>
            <ul className={`list-disc list-inside text-sm space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li><strong>Rewrite:</strong> Toggle Agent Mode, type "Politely decline dinner", press Go.</li>
              <li><strong>Shopping:</strong> Type "Buy Sony headphones budget 300", press Go.</li>
              <li><strong>Privacy:</strong> Type "My number is 13800138000", press Go. (Local regex check)</li>
              <li><strong>Thinking:</strong> Complex queries like "Plan a 3-day trip to Tokyo" will trigger Gemini Pro.</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;