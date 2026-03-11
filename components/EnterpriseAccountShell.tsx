import React from 'react';
import type { WorkspaceMode } from '../services/agentKernelShellApi';

interface EnterpriseAccountShellProps {
  signedInLabel: string;
  organizationLabel: string;
  workspaceLabel: string;
  environmentLabel: string;
  rolePageLabel: string;
  workspaceMode: WorkspaceMode;
}

export function buildAccountShellLines(props: EnterpriseAccountShellProps): string[] {
  return [
    `Signed in as ${props.signedInLabel}`,
    `Organization ${props.organizationLabel}`,
    `Workspace ${props.workspaceLabel}`,
    `Environment ${props.environmentLabel}`,
    `Current page ${props.rolePageLabel}`,
    props.workspaceMode === 'local_lab'
      ? 'Role seat switching is explicit and rehearsal-only.'
      : 'Workspace actor visibility is derived from product-shell truth.',
  ];
}

export const EnterpriseAccountShell: React.FC<EnterpriseAccountShellProps> = ({
  signedInLabel,
  organizationLabel,
  workspaceLabel,
  environmentLabel,
  rolePageLabel,
  workspaceMode,
}) => {
  const lines = buildAccountShellLines({
    signedInLabel,
    organizationLabel,
    workspaceLabel,
    environmentLabel,
    rolePageLabel,
    workspaceMode,
  });

  return (
    <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">Account shell</div>
      <div className="mt-2 text-base font-semibold text-white">{signedInLabel}</div>
      <div className="mt-3 space-y-1">
        {lines.slice(1).map((line) => (
          <div key={line} className="text-xs text-cyan-100/80">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnterpriseAccountShell;
