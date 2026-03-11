import React, { useState, useEffect } from 'react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { LumiAppView } from './components/LumiAppView';
import { EnterprisePlatformView } from './components/EnterprisePlatformView';
import { StandaloneTrialJoinView } from './components/StandaloneTrialJoinView';
import { PlatformErrorBoundary } from './components/PlatformErrorBoundary';
import { OnboardingOverlay, shouldShowOnboarding } from './components/OnboardingOverlay';
import { DigitalSoulOnboarding } from './components/DigitalSoulOnboarding';
import { SoulMatrix, PolicyConfig, DecisionMeta } from './types';
import {
  getDigitalSoul,
  saveDigitalSoul,
  initializeDigitalSoul,
  isDigitalSoulBootstrapped,
  markDigitalSoulBootstrapped,
  ensureDigitalSoulColdStartBaseline,
  createDigitalTwinBootstrapSnapshot,
  getLatestDigitalTwinBootstrapSnapshot,
  type DigitalSoulBootstrapSource,
} from './services/digitalSoulService';
import { useApiKey } from './services/apiKeyManager';
import { useTheme } from './services/themeManager';
import { getDestinyEngine } from './services/dtoe/destinyEngine';
import { AlertTriangle, X, Moon, Sun, Building2 } from 'lucide-react';
import { NavigatorOutput } from './prompts/personalNavigator';

// Destiny simulation result type
export interface DestinySimulationResult {
  query: string;
  intentType: string;
  navigatorOutput: NavigatorOutput;
  timestamp: number;
}

// Application mode type
type AppMode = 'keyboard' | 'app' | 'platform' | 'trial-join';

function readImeDemoEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('imeDemo') === '1';
}

function resolveInitialAppMode(imeDemoEnabled: boolean): AppMode {
  if (typeof window === 'undefined') return 'platform';
  const params = new URLSearchParams(window.location.search);
  const explicit = (params.get('surface') || params.get('mode') || '').trim().toLowerCase();
  if (explicit === 'app') return 'app';
  if (explicit === 'platform') return 'platform';
  if (explicit === 'trial-join') return 'trial-join';
  if (explicit === 'keyboard') return 'keyboard';
  return 'platform';
}

const App: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSoulOnboarding, setShowSoulOnboarding] = useState(false);
  const [latestDecision, setLatestDecision] = useState<DecisionMeta | null>(null);
  const [destinyResult, setDestinyResult] = useState<DestinySimulationResult | null>(null);
  const [pendingAgentQuery, setPendingAgentQuery] = useState<string | null>(null);
  const [forceAppTab, setForceAppTab] = useState<string | null>(null);
  const { apiKeyState, setApiKey, setPersist, saveAndValidate, clearApiKey } = useApiKey();
  const { theme, toggleTheme } = useTheme();
  const [imeDemoEnabled, setImeDemoEnabled] = useState<boolean>(() => readImeDemoEnabled());
  const [appMode, setAppMode] = useState<AppMode>(() => resolveInitialAppMode(readImeDemoEnabled()));

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

  useEffect(() => {
    if (!isDigitalSoulBootstrapped()) return;
    const snapshot = getLatestDigitalTwinBootstrapSnapshot('default_user');
    if (!snapshot) return;
    const destinyEngine = getDestinyEngine();
    destinyEngine.bootstrapEntityFromSnapshot('default_user', snapshot);
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

  const handleOpenApp = () => setAppMode('app');

  const handleOpenKeyboard = () => {
    setAppMode('keyboard');
  };

  // Handle destiny simulation result: switch to App mode and show result
  const handleDestinyResult = (result: DestinySimulationResult) => {
    setDestinyResult(result);
    setAppMode('app'); // Auto-switch to App mode
    handleLog('[Destiny] Simulation completed. Switched to Lumi App to view results.');
  };

  // Close destiny simulation result
  const handleCloseDestinyResult = () => {
    setDestinyResult(null);
  };

  // Agent Mode redirect — switch to App Chat tab
  const handleAgentChatRedirect = (query: string) => {
    setPendingAgentQuery(query);
    setForceAppTab('chat');
    setAppMode('app');
    handleLog(`[App] Agent Mode query redirected to Lumi Chat`);
  };

  const handlePendingAgentQueryConsumed = () => {
    setPendingAgentQuery(null);
    setForceAppTab(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      const nextImeDemoEnabled = readImeDemoEnabled();
      setImeDemoEnabled(nextImeDemoEnabled);
      const nextMode = resolveInitialAppMode(nextImeDemoEnabled);
      const params = new URLSearchParams(window.location.search);
      const hasExplicitSurface = Boolean((params.get('surface') || params.get('mode') || '').trim());
      setAppMode((current) => {
        if (hasExplicitSurface) return nextMode;
        if (!nextImeDemoEnabled && current === 'keyboard') return 'platform';
        return current;
      });
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('surface', appMode);
    if (appMode !== 'keyboard') {
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url.toString());
  }, [appMode]);

  const hasValidApiKey = apiKeyState.status === 'valid';
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Onboarding Overlay */}
      {showOnboarding && appMode !== 'platform' && appMode !== 'trial-join' && (
        <OnboardingOverlay
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {showSoulOnboarding && appMode !== 'platform' && appMode !== 'trial-join' && (
        <DigitalSoulOnboarding
          onComplete={(soulConfig, source) => {
            const bootstrapSource: DigitalSoulBootstrapSource = source === 'import' ? 'import' : 'questionnaire';
            const initialized = initializeDigitalSoul({
              ...soulConfig,
              bootstrapSource,
            });
            setSoul(initialized);
            const snapshot = createDigitalTwinBootstrapSnapshot(initialized, {
              entity_id: 'default_user',
              source: bootstrapSource,
            });
            const destinyEngine = getDestinyEngine();
            destinyEngine.bootstrapEntityFromSnapshot('default_user', snapshot);
            markDigitalSoulBootstrapped();
            setShowSoulOnboarding(false);
          }}
          onSkip={() => {
            const baseline = ensureDigitalSoulColdStartBaseline('skip');
            setSoul(baseline);
            const snapshot = createDigitalTwinBootstrapSnapshot(baseline, {
              entity_id: 'default_user',
              source: 'skip',
            });
            const destinyEngine = getDestinyEngine();
            destinyEngine.bootstrapEntityFromSnapshot('default_user', snapshot);
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
              Agent OS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`rounded-xl px-4 py-2.5 ${isDark ? 'bg-cyan-950/40 border border-cyan-800/50 text-cyan-100' : 'bg-cyan-50 border border-cyan-200 text-cyan-900'}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building2 size={16} />
              Enterprise Platform
            </div>
            <div className={`mt-0.5 text-[11px] ${isDark ? 'text-cyan-200/80' : 'text-cyan-700'}`}>
              Primary workspace console for enterprise users
            </div>
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

      <div className={`w-full px-6 py-2 text-center text-xs ${isDark ? 'bg-slate-800/70 text-slate-300' : 'bg-blue-50 text-blue-900'} border-b ${isDark ? 'border-slate-700/60' : 'border-blue-100'}`}>
        {appMode === 'platform'
          ? 'Enterprise Platform is the product. Legacy app-style surfaces remain compatibility paths only.'
          : appMode === 'trial-join'
            ? 'Trial Join is a standalone B-end entry point for shared enterprise sandbox access.'
          : 'Legacy app-style and IME demo surfaces remain URL-only compatibility paths and are not the primary enterprise entry.'}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {appMode === 'keyboard' ? (
          /* Keyboard Mode - Full Screen Phone Simulator */
          <div className="flex flex-col items-center w-full max-w-md">
            <div className={`mb-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-sm">
                Long press <span className={`font-bold px-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>Space</span> to open the IME agent entry
              </p>
              <p className="text-xs mt-1">
                Web keyboard is one demo surface. The primary product is the Android Agent OS runtime across App and IME.
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
              onAgentChatRedirect={handleAgentChatRedirect}
              fullscreen={true}
            />

            <div className={`mt-4 text-xs max-w-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <p><strong>Tip:</strong> Agent Mode is one entry into Lumi&apos;s broader execution runtime.</p>
            </div>
          </div>
        ) : appMode === 'platform' ? (
          <PlatformErrorBoundary scope="workspace shell" resetKey="platform">
            <EnterprisePlatformView isDark={isDark} />
          </PlatformErrorBoundary>
        ) : appMode === 'trial-join' ? (
          <PlatformErrorBoundary scope="trial join shell" resetKey="trial-join">
            <StandaloneTrialJoinView isDark={isDark} />
          </PlatformErrorBoundary>
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
            pendingAgentQuery={pendingAgentQuery}
            onPendingAgentQueryConsumed={handlePendingAgentQueryConsumed}
            forceActiveTab={forceAppTab}
          />
        )}
      </main>
    </div>
  );
};

export default App;
