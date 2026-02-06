import React, { useState } from 'react';
import { SoulMatrix, PolicyConfig } from '../types';
import { ApiKeyState } from '../services/apiKeyManager';
import { Button } from './Button';
import { MemoryPanel } from './MemoryPanel';
import { DigitalAvatarPanel } from './DigitalAvatarPanel';
import { PrivacyPanel } from './PrivacyPanel';
import { PrivacyDashboard } from './PrivacyDashboard';
import { PreferencePanel } from './PreferencePanel';
import { DestinyPanel } from './DestinyPanel';
import { DestinyRecommendationCard } from './DestinyRecommendationCard';
import { Settings, Terminal, Shield, Zap, Key, Eye, EyeOff, Check, X, Loader2, Trash2, Sparkles } from 'lucide-react';

interface CommandCenterProps {
  soul: SoulMatrix;
  policy: PolicyConfig;
  onUpdateSoul: (soul: SoulMatrix) => void;
  onUpdatePolicy: (policy: PolicyConfig) => void;
  logs: string[];
  apiKeyState: ApiKeyState;
  onApiKeyChange: (key: string) => void;
  onPersistChange: (persist: boolean) => void;
  onSaveApiKey: () => Promise<boolean>;
  onClearApiKey: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  soul,
  policy,
  onUpdateSoul,
  onUpdatePolicy,
  logs,
  apiKeyState,
  onApiKeyChange,
  onPersistChange,
  onSaveApiKey,
  onClearApiKey
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);
  const [showDestinyCard, setShowDestinyCard] = useState(false);
  const [modelPreference, setModelPreference] = useState(() =>
    localStorage.getItem('model_preference') || 'auto'
  );

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    await onSaveApiKey();
    setIsSaving(false);
  };

  const getStatusIcon = () => {
    switch (apiKeyState.status) {
      case 'valid':
        return <Check size={16} className="text-emerald-400" />;
      case 'invalid':
        return <X size={16} className="text-red-400" />;
      case 'validating':
        return <Loader2 size={16} className="text-yellow-400 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (apiKeyState.status) {
      case 'valid':
        return <span className="text-emerald-400 text-xs">Valid</span>;
      case 'invalid':
        return <span className="text-red-400 text-xs">{apiKeyState.error || 'Invalid'}</span>;
      case 'validating':
        return <span className="text-yellow-400 text-xs">Validating...</span>;
      default:
        return <span className="text-gray-500 text-xs">Not configured</span>;
    }
  };

  return (
    <div className="flex-1 bg-gray-900 text-gray-200 p-6 rounded-2xl overflow-y-auto flex flex-col shadow-xl max-h-[85vh]">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <img src="/lumi-logo.jpg" alt="Lumi.AI" className="w-10 h-10 rounded-lg object-cover" />
        <div>
          <h2 className="text-xl font-bold text-white">Lumi Command Center</h2>
          <p className="text-xs text-gray-400">Agent Configuration & Debug Console</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* API Key Settings - NEW */}
        <div className="md:col-span-2 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 mb-4 text-yellow-400">
            <Key size={18} />
            <h3 className="font-semibold">API Settings</h3>
            <div className="ml-auto flex items-center gap-2">
              {getStatusIcon()}
              {getStatusText()}
            </div>
          </div>

          <div className="space-y-3">
            {/* API Key Input */}
            <div>
              <label className="block text-xs uppercase text-gray-500 mb-1">Gemini API Key</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyState.key}
                    onChange={(e) => onApiKeyChange(e.target.value)}
                    placeholder="Enter your Gemini API Key..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 pr-10 text-sm text-white focus:border-yellow-500 outline-none font-mono"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  onClick={handleSaveApiKey}
                  disabled={isSaving || !apiKeyState.key}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                {apiKeyState.key && (
                  <button
                    onClick={onClearApiKey}
                    className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-md transition-colors"
                    title="Clear API Key"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Persist Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Remember Key</span>
                <p className="text-xs text-gray-500">Store in browser (persists after refresh)</p>
              </div>
              <button
                onClick={() => onPersistChange(!apiKeyState.persist)}
                className={`w-10 h-5 rounded-full relative transition-colors ${apiKeyState.persist ? 'bg-yellow-500' : 'bg-gray-600'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${apiKeyState.persist ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* Model Preference */}
            <div className="pt-3 border-t border-gray-700">
              <label className="block text-xs uppercase text-gray-500 mb-2">Model Preference</label>
              <div className="flex gap-2">
                {[
                  { id: 'auto', label: '🤖 Auto', desc: '智能切换' },
                  { id: 'flash', label: '⚡ Flash', desc: '快速响应' },
                  { id: 'pro', label: '🧠 Pro', desc: '深度推理' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      localStorage.setItem('model_preference', option.id);
                      setModelPreference(option.id);
                    }}
                    className={`flex-1 py-2 px-2 text-xs rounded-lg border transition-all ${modelPreference === option.id
                      ? 'bg-yellow-600/30 border-yellow-500 text-yellow-400'
                      : 'border-gray-600 text-gray-400 hover:bg-gray-700'
                      }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-[10px] opacity-70">{option.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Auto: 根据任务复杂度自动选择 Flash 或 Pro 模型
              </p>
            </div>
          </div>
        </div>

        {/* Soul Matrix Config */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 mb-4 text-indigo-400">
            <Zap size={18} />
            <h3 className="font-semibold">Soul Matrix</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-gray-500 mb-1">Communication Style</label>
              <select
                value={soul.communicationStyle}
                onChange={(e) => onUpdateSoul({ ...soul, communicationStyle: e.target.value as any })}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="Professional">Professional</option>
                <option value="Casual">Casual</option>
                <option value="Friendly">Friendly</option>
                <option value="Concise">Concise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-500 mb-1">Risk Tolerance</label>
              <div className="flex gap-2">
                {['Low', 'Medium', 'High'].map(level => (
                  <button
                    key={level}
                    onClick={() => onUpdateSoul({ ...soul, riskTolerance: level as any })}
                    className={`flex-1 py-1.5 text-xs rounded-md border ${soul.riskTolerance === level ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-500 mb-1">Spending Preference</label>
              <div className="flex gap-2">
                {[
                  { value: 'PriceFirst', label: '💰 Price', labelFull: 'Price First' },
                  { value: 'Balanced', label: '⚖️ Balanced', labelFull: 'Balanced' },
                  { value: 'QualityFirst', label: '✨ Quality', labelFull: 'Quality First' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => onUpdateSoul({ ...soul, spendingPreference: value as any })}
                    className={`flex-1 py-1.5 text-xs rounded-md border ${soul.spendingPreference === value ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-gray-500 mb-1">Privacy Level</label>
              <div className="flex gap-2">
                {[
                  { value: 'Strict', label: '🔒 Strict' },
                  { value: 'Balanced', label: '⚖️ Balanced' },
                  { value: 'Open', label: '🔓 Open' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => onUpdateSoul({ ...soul, privacyLevel: value as any })}
                    className={`flex-1 py-1.5 text-xs rounded-md border ${soul.privacyLevel === value ? 'bg-amber-600 border-amber-600 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Policy Config */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <Shield size={18} />
            <h3 className="font-semibold">Policy Engine</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Allow Network</span>
              <button
                onClick={() => onUpdatePolicy({ ...policy, allowNetworkInAgentMode: !policy.allowNetworkInAgentMode })}
                className={`w-10 h-5 rounded-full relative transition-colors ${policy.allowNetworkInAgentMode ? 'bg-emerald-500' : 'bg-gray-600'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${policy.allowNetworkInAgentMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Confirm Before Send</span>
              <button
                onClick={() => onUpdatePolicy({ ...policy, requireConfirmBeforeSend: !policy.requireConfirmBeforeSend })}
                className={`w-10 h-5 rounded-full relative transition-colors ${policy.requireConfirmBeforeSend ? 'bg-emerald-500' : 'bg-gray-600'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${policy.requireConfirmBeforeSend ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Panel - Knowledge Graph */}
      <div className="mb-4">
        <MemoryPanel />
      </div>

      {/* Digital Avatar Panel - 数字分身 */}
      <div className="mb-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
        <DigitalAvatarPanel />
      </div>

      {/* Privacy Panel - Status & Stats */}
      <div className="mb-4">
        <PrivacyPanel
          apiKeyConfigured={apiKeyState.status === 'valid'}
          onOpenDashboard={() => setShowPrivacyDashboard(true)}
        />
      </div>

      {/* Privacy Dashboard Modal */}
      <PrivacyDashboard
        isOpen={showPrivacyDashboard}
        onClose={() => setShowPrivacyDashboard(false)}
      />

      {/* Destiny Panel - DTOE Insights */}
      <div className="mb-4">
        <DestinyPanel onOpenFullCard={() => setShowDestinyCard(true)} />
      </div>

      {/* Destiny Card Modal */}
      {showDestinyCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDestinyCard(false)}>
          <div className="max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <DestinyRecommendationCard
              onActionSelect={(action) => {
                console.log('[CommandCenter] Action selected:', action);
                setShowDestinyCard(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Preference Panel - User Settings */}
      <div className="mb-4">
        <PreferencePanel />
      </div>

      {/* Logs Console */}
      <div className="bg-black rounded-xl border border-gray-800 p-4 font-mono text-xs flex flex-col min-h-[200px] max-h-[250px]">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-800">
          <span className="text-gray-500">SYSTEM LOGS</span>
          <span className="text-indigo-500 animate-pulse">● LIVE</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {logs.length === 0 && <span className="text-gray-600 italic">Waiting for agent events...</span>}
          {logs.map((log, idx) => (
            <div key={idx} className="break-all border-l-2 border-gray-800 pl-2 py-0.5">
              <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
              <span className={log.includes('Error') ? 'text-red-400' : log.includes('Input') ? 'text-yellow-300' : 'text-emerald-300'}>
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};