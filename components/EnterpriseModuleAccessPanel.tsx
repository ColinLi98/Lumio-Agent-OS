import React from 'react';
import type { EnterpriseAccountShellSummary } from '../services/agentKernelShellApi';

interface EnterpriseModuleAccessPanelProps {
  account: EnterpriseAccountShellSummary | null | undefined;
}

export const EnterpriseModuleAccessPanel: React.FC<EnterpriseModuleAccessPanelProps> = ({ account }) => {
  if (!account?.signed_in) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Module access</div>
        <div className="mt-3 text-sm text-slate-300">
          Sign in with an enterprise session to see real module access state.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Module access</div>
      <div className="mt-3 space-y-2">
        {account.module_access.map((item) => (
          <div key={item.module} className="rounded-2xl bg-slate-950/80 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-white">{item.module.toLowerCase().replace(/_/g, ' ')}</div>
              <div className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-cyan-100">
                {item.access_state.toLowerCase().replace(/_/g, ' ')}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{item.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnterpriseModuleAccessPanel;
