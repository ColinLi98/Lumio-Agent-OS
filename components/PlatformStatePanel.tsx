import React from 'react';

export type PlatformStateKind =
  | 'loading'
  | 'empty'
  | 'no_access'
  | 'stale_link'
  | 'malformed_url'
  | 'runtime_failure';

interface PlatformStatePanelProps {
  kind: PlatformStateKind;
  title: string;
  detail: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

const KIND_STYLES: Record<PlatformStateKind, string> = {
  loading: 'border-cyan-700/40 bg-cyan-950/20 text-cyan-50',
  empty: 'border-slate-700 bg-slate-900/80 text-slate-100',
  no_access: 'border-amber-700/40 bg-amber-950/20 text-amber-50',
  stale_link: 'border-amber-700/40 bg-amber-950/20 text-amber-50',
  malformed_url: 'border-rose-700/40 bg-rose-950/20 text-rose-50',
  runtime_failure: 'border-rose-700/40 bg-rose-950/20 text-rose-50',
};

export const PlatformStatePanel: React.FC<PlatformStatePanelProps> = ({
  kind,
  title,
  detail,
  primaryActionLabel,
  onPrimaryAction,
}) => (
  <div className={`rounded-3xl border p-4 ${KIND_STYLES[kind]}`}>
    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">{title}</div>
    <div className="mt-2 text-sm leading-6">{detail}</div>
    {primaryActionLabel && onPrimaryAction && (
      <button
        onClick={onPrimaryAction}
        className="mt-3 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-white"
      >
        {primaryActionLabel}
      </button>
    )}
  </div>
);

export default PlatformStatePanel;
