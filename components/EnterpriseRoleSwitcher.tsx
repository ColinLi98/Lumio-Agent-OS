import React from 'react';
import type { EnterpriseOARole } from '../services/enterpriseOAShell';
import { enterpriseRoleLabel } from '../services/enterpriseOAShell';

interface EnterpriseRoleSwitcherProps {
  roles: EnterpriseOARole[];
  activeRole: EnterpriseOARole;
  onChange: (role: EnterpriseOARole) => void;
  title?: string;
  description?: string;
}

export const EnterpriseRoleSwitcher: React.FC<EnterpriseRoleSwitcherProps> = ({
  roles,
  activeRole,
  onChange,
  title = 'OA roles',
  description,
}) => {
  if (roles.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>
        <div className="mt-3 text-sm text-slate-300">
          Sign in with a real enterprise session to see the roles actually bound to this workspace.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>
      {description && (
        <div className="mt-2 text-xs text-slate-400">
          {description}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => onChange(role)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              role === activeRole ? 'bg-cyan-300 text-slate-950' : 'bg-slate-950/80 text-slate-200'
            }`}
          >
            {enterpriseRoleLabel(role)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EnterpriseRoleSwitcher;
