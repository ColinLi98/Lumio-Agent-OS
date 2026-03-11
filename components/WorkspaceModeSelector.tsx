import React from 'react';
import type { WorkspaceMode, WorkspaceModeOptionSummary } from '../services/agentKernelShellApi';

interface WorkspaceModeSelectorProps {
  options: WorkspaceModeOptionSummary[];
  value: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}

export const WorkspaceModeSelector: React.FC<WorkspaceModeSelectorProps> = ({ options, value, onChange }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => {
        const active = option.mode === value;
        return (
          <button
            key={option.mode}
            onClick={() => onChange(option.mode)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
              active ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
            title={option.description}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default WorkspaceModeSelector;
