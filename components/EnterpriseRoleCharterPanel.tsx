import React from 'react';
import type { EnterpriseRoleMatrixEntry } from '../services/enterpriseOAShell';

interface EnterpriseRoleCharterPanelProps {
  role: EnterpriseRoleMatrixEntry;
}

export const EnterpriseRoleCharterPanel: React.FC<EnterpriseRoleCharterPanelProps> = ({ role }) => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Role charter</div>
      <div className="mt-2 text-lg font-semibold text-white">{role.label}</div>
      <div className="mt-2 text-sm text-slate-300">{role.primaryObjective}</div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primary surfaces</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {role.primarySurfaces.map((item) => (
              <div key={item} className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Allowed actions</div>
          <div className="mt-2 space-y-1">
            {role.allowedActions.map((item) => (
              <div key={item} className="text-xs text-emerald-200">{item}</div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Forbidden actions</div>
          <div className="mt-2 space-y-1">
            {role.forbiddenActions.map((item) => (
              <div key={item} className="text-xs text-rose-200">{item}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Approval authority</div>
          <div className="mt-2 text-xs text-slate-200">{role.approvalAuthority}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence responsibility</div>
          <div className="mt-2 text-xs text-slate-200">{role.evidenceResponsibility}</div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseRoleCharterPanel;
