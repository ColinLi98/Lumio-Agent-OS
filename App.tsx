import React, { useState, useEffect } from 'react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { LumiAppView } from './components/LumiAppView';
import { OnboardingOverlay, shouldShowOnboarding } from './components/OnboardingOverlay';
import { DigitalSoulOnboarding } from './components/DigitalSoulOnboarding';
import { SoulMatrix, PolicyConfig, DecisionMeta } from './types';
import { getDigitalSoul, saveDigitalSoul, initializeDigitalSoul, isDigitalSoulBootstrapped, markDigitalSoulBootstrapped } from './services/digitalSoulService';
import { useApiKey } from './services/apiKeyManager';
import { useTheme } from './services/themeManager';
import { Smartphone, AppWindow, AlertTriangle, X, Moon, Sun, Settings } from 'lucide-react';
import { NavigatorOutput } from './prompts/personalNavigator';

// 命运模拟结果类型
export interface DestinySimulationResult {
  query: string;
  intentType: string;
  navigatorOutput: NavigatorOutput;
  timestamp: number;
}

// Application mode type
type AppMode = 'keyboard' | 'app';

const App: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSoulOnboarding, setShowSoulOnboarding] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('keyboard');
  const [latestDecision, setLatestDecision] = useState<DecisionMeta | null>(null);
  const [destinyResult, setDestinyResult] = useState<DestinySimulationResult | null>(null);
  const { apiKeyState, setApiKey, setPersist, saveAndValidate, clearApiKey } = useApiKey();
  const { theme, toggleTheme } = useTheme();

  // Check for onboarding on mount
  useEffect(() => {
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (!isDigitalSoulBootstrapped()) {
      setShowSoulOnboarding(true);
    }
  }, []);

  // Default Configs
  const [soul, setSoul] = useState<SoulMatrix>(() => getDigitalSoul());

  useEffect(() => {
    saveDigitalSoul(soul);
  }, [soul]);

  const [policy, setPolicy] = useState<PolicyConfig>({
    allowNetworkInAgentMode: true,
    requireConfirmBeforeSend: true,
    allowedServices: ['Search', 'Maps']
  });

  const handleLog = (log: string) => {
    setLogs(prev => [log, ...prev].slice(0, 50));
  };

  const handleOpenApp = () => {
    setAppMode('app');
  };

  const handleOpenKeyboard = () => {
    setAppMode('keyboard');
  };

  // 处理命运模拟结果 - 切换到App模式并显示结果
  const handleDestinyResult = (result: DestinySimulationResult) => {
    setDestinyResult(result);
    setAppMode('app'); // 自动切换到 App 模式
    handleLog(`[Destiny] 命运模拟完成，已切换到 Lumi App 查看结果`);
  };

  // 关闭命运模拟结果
  const handleCloseDestinyResult = () => {
    setDestinyResult(null);
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

      {showSoulOnboarding && (
        <DigitalSoulOnboarding
          onComplete={(soulConfig) => {
            const initialized = initializeDigitalSoul(soulConfig);
            setSoul(initialized);
            markDigitalSoulBootstrapped();
            setShowSoulOnboarding(false);
          }}
          onSkip={() => {
            markDigitalSoulBootstrapped();
            setShowSoulOnboarding(false);
          }}
        />
      )}

      {/* API Key Banner - Dismissible */}
      {!hasValidApiKey && !bannerDismissed && (
        <div className="bg-red-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2 relative">
          <AlertTriangle size={16} />
          <span>
            {apiKeyState.status === 'empty'
              ? 'API Key not configured. Enter your Gemini API Key in Settings to enable Agent features.'
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

      {/* Header Bar - Premium Design */}
      <header className={`lumi-header px-6 py-4 flex items-center justify-between transition-all duration-300 ${isDark
          ? 'bg-slate-900/80 border-b border-slate-700/50'
          : 'lumi-header-light bg-white/90 border-b border-gray-200/80'
        }`} style={{ backdropFilter: 'blur(12px)' }}>
        <div className="lumi-logo flex items-center gap-3">
          <div className="relative">
            <img
              src="/lumi-logo.jpg"
              alt="Lumi.AI"
              className="w-10 h-10 rounded-xl object-cover shadow-lg ring-2 ring-blue-500/20"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gradient-blue" style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Lumi.AI
            </h1>
            <span className={`text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Personal Destiny Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Premium Mode Toggle */}
          <div className={`mode-toggle flex p-1 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-gray-100'
            }`} style={{ backdropFilter: 'blur(8px)' }}>
            <button
              onClick={() => setAppMode('keyboard')}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg transition-all duration-300 ${appMode === 'keyboard'
                  ? 'text-white shadow-lg'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              style={appMode === 'keyboard' ? {
                background: 'linear-gradient(135deg, #3B82F6 0%, #0EA5E9 100%)',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
              } : {}}
              title="Keyboard Mode"
            >
              <Smartphone size={16} />
              <span className="hidden sm:inline">Keyboard</span>
            </button>
            <button
              onClick={() => setAppMode('app')}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg transition-all duration-300 ${appMode === 'app'
                  ? 'text-white shadow-lg'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              style={appMode === 'app' ? {
                background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
              } : {}}
              title="App Mode"
            >
              <AppWindow size={16} />
              <span className="hidden sm:inline">App</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-105 ${isDark
                ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 hover:shadow-lg hover:shadow-amber-500/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {appMode === 'keyboard' ? (
          /* Keyboard Mode - Full Screen Phone Simulator */
          <div className="flex flex-col items-center w-full max-w-md">
            <div className={`mb-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-sm">
                Long press <span className={`font-bold px-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>Space</span> to toggle Agent Mode
              </p>
            </div>

            <PhoneSimulator
              soul={soul}
              policy={policy}
              apiKey={apiKeyState.key}
              onAgentLog={handleLog}
              onOpenApp={handleOpenApp}
              onDecisionUpdate={setLatestDecision}
              onSoulUpdate={setSoul}
              onDestinyResult={handleDestinyResult}
              fullscreen={true}
            />

            <div className={`mt-4 text-xs max-w-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <p><strong>Tip:</strong> In Agent Mode (Blue), your text is processed by Lumi AI.</p>
            </div>
          </div>
        ) : (
          /* App Mode - Data Center & Settings */
          <LumiAppView
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
            onOpenKeyboard={handleOpenKeyboard}
            isDark={isDark}
            latestDecision={latestDecision}
            destinyResult={destinyResult}
            onCloseDestinyResult={handleCloseDestinyResult}
          />
        )}
      </main>
    </div>
  );
};

export default App;
