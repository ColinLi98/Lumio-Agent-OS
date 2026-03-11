import React, { useEffect, useState } from 'react';
import { EnterprisePlatformView } from './components/EnterprisePlatformView';
import { StandaloneTrialJoinView } from './components/StandaloneTrialJoinView';
import { PlatformErrorBoundary } from './components/PlatformErrorBoundary';
import { useTheme } from './services/themeManager';
import { resolveSurfaceBrand, resolveSurfaceTitle } from './services/surfaceBranding';
import { Building2, Moon, Sun } from 'lucide-react';

type AppMode = 'platform' | 'trial-join';

function resolveInitialAppMode(): AppMode {
  if (typeof window === 'undefined') return 'platform';
  const params = new URLSearchParams(window.location.search);
  const surface = (params.get('surface') || '').trim().toLowerCase();
  return surface === 'trial-join' ? 'trial-join' : 'platform';
}

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [appMode, setAppMode] = useState<AppMode>(() => resolveInitialAppMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      setAppMode(resolveInitialAppMode());
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = resolveSurfaceTitle(appMode);
  }, [appMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('surface', appMode);
    window.history.replaceState({}, '', url.toString());
  }, [appMode]);

  const isDark = theme === 'dark';
  const surfaceBrand = resolveSurfaceBrand(appMode);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <header
        className={`lumi-header px-6 py-4 flex items-center justify-between transition-all duration-300 ${isDark
          ? 'bg-slate-900/80 border-b border-slate-700/50'
          : 'lumi-header-light bg-white/90 border-b border-gray-200/80'
          }`}
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div className="lumi-logo flex items-center gap-3">
          <div className="relative">
            <img
              src="/lumi-logo.jpg"
              alt={surfaceBrand.alt}
              className="w-10 h-10 rounded-xl object-cover shadow-lg ring-2 ring-blue-500/20"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1
              className="text-xl font-bold text-gradient-blue"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {surfaceBrand.name}
            </h1>
            <span className={`text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {surfaceBrand.subtitle}
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
              Governed B-end workspace only
            </div>
          </div>
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
        {appMode === 'trial-join'
          ? 'Trial Join is a standalone B-end entry point for shared enterprise sandbox access.'
          : 'Lumio is a B-end enterprise workspace platform. This public site exposes only the governed workspace product surface.'}
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {appMode === 'trial-join' ? (
          <PlatformErrorBoundary scope="trial join shell" resetKey="trial-join">
            <StandaloneTrialJoinView isDark={isDark} />
          </PlatformErrorBoundary>
        ) : (
          <PlatformErrorBoundary scope="workspace shell" resetKey="platform">
            <EnterprisePlatformView isDark={isDark} />
          </PlatformErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default App;
