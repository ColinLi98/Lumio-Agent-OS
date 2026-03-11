import React, { useState } from 'react';
import type { DependencyReadinessState, ProductShellSummary, TenantAdminActivationSummary, WorkspaceMode } from '../services/agentKernelShellApi';
import { buildPlatformAdminWorkflowSurface, buildPlatformOktaReadinessSurface } from '../services/platformContract';

export function buildTenantAdminLines(summary: TenantAdminActivationSummary | null | undefined): string[] {
  if (!summary) return ['Tenant admin setup unavailable'];
  return Array.from(new Set([summary.summary, ...summary.detail_lines].filter(Boolean)));
}

export function buildActivationPackageLines(summary: ProductShellSummary | null | undefined): string[] {
  if (!summary) return ['Activation package unavailable'];
  const activationPackage = summary.activation_package;
  return Array.from(new Set([
    activationPackage.summary,
    `Package status: ${activationPackage.status.toLowerCase().replace(/_/g, ' ')}`,
    `Owner: ${activationPackage.owner_label}`,
    `Pending requirements: ${activationPackage.pending_requirement_count}`,
    `Rejected intakes: ${activationPackage.rejected_intake_count}`,
    ...activationPackage.recent_intakes.map((intake) =>
      `${intake.artifact_kind.toLowerCase().replace(/_/g, ' ')} · ${intake.verification_status.toLowerCase().replace(/_/g, ' ')} · ${intake.summary}`
    ),
  ].filter(Boolean)));
}

export function buildLocalRoleLabLines(summary: ProductShellSummary | null | undefined): string[] {
  if (!summary?.local_role_lab?.enabled) return [];
  const lab = summary.local_role_lab;
  return Array.from(new Set([
    lab.label,
    lab.summary,
    `Active actor: ${lab.actors.find((actor) => actor.is_active)?.actor_label || lab.active_actor_id}`,
    lab.day_zero_blocked_summary,
    ...lab.actors.map((actor) => `${actor.actor_label} · ${actor.role.toLowerCase().replace(/_/g, ' ')} · ${actor.summary}`),
  ]));
}

interface TenantAdminSetupPanelProps {
  summary: TenantAdminActivationSummary | null;
  productShellSummary?: ProductShellSummary | null;
  workspaceMode: WorkspaceMode;
  onRegisterActor?: (input: {
    workspaceMode: WorkspaceMode;
    role: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    actor_id?: string;
    actor_label?: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    provisioningState?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    accessState?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    note?: string;
  }) => Promise<void>;
  onRegisterEnvironmentBinding?: (input: {
    workspaceMode: WorkspaceMode;
    environment_kind: 'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION';
    environment_label: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary?: string;
  }) => Promise<void>;
  onRegisterConnectorEligibility?: (input: {
    workspaceMode: WorkspaceMode;
    connector_id: string;
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary?: string;
  }) => Promise<void>;
  onRegisterActivationPackageHandoff?: (input: {
    workspaceMode: WorkspaceMode;
    owner_type: 'PILOT_COMMANDER' | 'REQUESTER_OWNER' | 'OPERATOR_OWNER' | 'TENANT_ADMIN_OWNER';
    owner_label?: string;
    summary?: string;
    handoff_note?: string;
    due_at?: number;
  }) => Promise<void>;
  onSubmitArtifactIntake?: (input: {
    workspaceMode: WorkspaceMode;
    artifact_kind: 'ENVIRONMENT_BINDING' | 'ACTOR_READINESS' | 'CONNECTOR_ELIGIBILITY' | 'REAL_EVIDENCE';
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary: string;
    uri?: string;
    submitted_by_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    submitted_by_label?: string;
    actor_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
    actor_id?: string;
    actor_label?: string;
    provisioning_state?: 'UNPROVISIONED' | 'PROVISIONED' | 'DEMO_ONLY' | 'BLOCKED';
    access_state?: 'NOT_GRANTED' | 'GRANTED' | 'DEMO_ONLY' | 'BLOCKED';
    evidence_category?: 'DEVICE_SESSION_PROOF' | 'WORKFLOW_ARTIFACT_PROOF' | 'CONNECTOR_CREDENTIAL_PROOF' | 'TENANT_ADMIN_SUPPORT_PROOF' | 'STABILITY_SAFETY_PROOF';
    environment_kind?: 'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION';
    environment_label?: string;
    base_url?: string;
    tenant_id?: string;
    workspace_id?: string;
    connector_id?: string;
  }) => Promise<void>;
  onReviewArtifactIntake?: (input: {
    workspaceMode: WorkspaceMode;
    intake_id: string;
    decision: 'VERIFY' | 'REJECT' | 'PROMOTE';
    reviewed_by?: string;
    verification_note?: string;
  }) => Promise<void>;
  onRegisterEvidence?: (input: {
    workspaceMode: WorkspaceMode;
    category: 'DEVICE_SESSION_PROOF' | 'WORKFLOW_ARTIFACT_PROOF' | 'CONNECTOR_CREDENTIAL_PROOF' | 'TENANT_ADMIN_SUPPORT_PROOF' | 'STABILITY_SAFETY_PROOF';
    source: 'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC';
    summary: string;
    uri?: string;
    actor_role?: 'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN';
  }) => Promise<void>;
}

export const TenantAdminSetupPanel: React.FC<TenantAdminSetupPanelProps> = ({
  summary,
  productShellSummary,
  workspaceMode,
  onRegisterActor,
  onRegisterEnvironmentBinding,
  onRegisterConnectorEligibility,
  onRegisterActivationPackageHandoff,
  onSubmitArtifactIntake,
  onReviewArtifactIntake,
  onRegisterEvidence,
}) => {
  const lines = buildTenantAdminLines(summary);
  const packageLines = buildActivationPackageLines(productShellSummary);
  const localRoleLabLines = buildLocalRoleLabLines(productShellSummary);
  const oktaSurface = buildPlatformOktaReadinessSurface(productShellSummary || null, workspaceMode);
  const workflows = buildPlatformAdminWorkflowSurface(productShellSummary || null)
    .items
    .filter((item) => item.role === 'TENANT_ADMIN' || item.role === 'INTEGRATION_ADMIN');
  const [actorRole, setActorRole] = useState<'REQUESTER' | 'OPERATOR' | 'TENANT_ADMIN'>('REQUESTER');
  const [actorLabel, setActorLabel] = useState('');
  const [actorSource, setActorSource] = useState<'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC'>('REAL_PILOT');
  const [environmentKind, setEnvironmentKind] = useState<'SIMULATOR' | 'DEMO' | 'PILOT' | 'PRODUCTION'>('PILOT');
  const [environmentLabel, setEnvironmentLabel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [environmentSource, setEnvironmentSource] = useState<'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC'>('REAL_PILOT');
  const [connectorId, setConnectorId] = useState('pilot_https_webhook');
  const [connectorSource, setConnectorSource] = useState<'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC'>('REAL_PILOT');
  const [handoffOwnerType, setHandoffOwnerType] = useState<'PILOT_COMMANDER' | 'REQUESTER_OWNER' | 'OPERATOR_OWNER' | 'TENANT_ADMIN_OWNER'>('PILOT_COMMANDER');
  const [handoffOwnerLabel, setHandoffOwnerLabel] = useState('');
  const [handoffSummary, setHandoffSummary] = useState('');
  const [artifactKind, setArtifactKind] = useState<'ENVIRONMENT_BINDING' | 'ACTOR_READINESS' | 'CONNECTOR_ELIGIBILITY' | 'REAL_EVIDENCE'>('REAL_EVIDENCE');
  const [artifactSource, setArtifactSource] = useState<'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC'>('REAL_PILOT');
  const [artifactSummary, setArtifactSummary] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'VERIFY' | 'REJECT' | 'PROMOTE'>('VERIFY');
  const [selectedIntakeId, setSelectedIntakeId] = useState('');
  const [evidenceCategory, setEvidenceCategory] = useState<'DEVICE_SESSION_PROOF' | 'WORKFLOW_ARTIFACT_PROOF' | 'CONNECTOR_CREDENTIAL_PROOF' | 'TENANT_ADMIN_SUPPORT_PROOF' | 'STABILITY_SAFETY_PROOF'>('DEVICE_SESSION_PROOF');
  const [evidenceSource, setEvidenceSource] = useState<'REAL_PILOT' | 'DEMO' | 'SIMULATOR' | 'TEST' | 'LOCAL_SYNTHETIC'>('REAL_PILOT');
  const [evidenceSummary, setEvidenceSummary] = useState('');

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-white">{summary?.title || 'Tenant Admin Setup / Activation'}</div>
        <div className="text-xs text-slate-400">
          Surface missing activation requirements directly in-product.
        </div>
      </div>
      <div className="space-y-1">
        {lines.slice(0, 8).map((line) => (
          <div key={line} className="text-xs text-slate-300">{line}</div>
        ))}
      </div>
      {productShellSummary && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-slate-800/80 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Okta OIDC readiness</div>
            <div className="grid gap-2 md:grid-cols-2">
              {oktaSurface.checklist.map((item) => (
                <div key={item.key} className="rounded-lg bg-slate-900/80 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-1 text-xs font-semibold text-white">{String(item.state).toLowerCase().replace(/_/g, ' ')}</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-300">{item.detail}</div>
                  <div className="mt-2 text-[11px] text-slate-400">Owner: {item.owner}</div>
                  <div className="mt-1 text-[11px] text-slate-400">Next action: {item.nextAction}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Why ready</div>
                <div className="mt-2 space-y-1">
                  {(oktaSurface.whyReady.length > 0 ? oktaSurface.whyReady : ['No ready explanation is active.']).map((line) => (
                    <div key={line} className="text-[11px] text-slate-200">{line}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Why not ready</div>
                <div className="mt-2 space-y-1">
                  {(oktaSurface.whyNotReady.length > 0 ? oktaSurface.whyNotReady : ['No blocking readiness explanation is active.']).map((line) => (
                    <div key={line} className="text-[11px] text-slate-200">{line}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {oktaSurface.environmentStatus.map((line) => (
                <div key={line} className="text-[11px] text-slate-300">{line}</div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-slate-900/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gate status</div>
              <div className="mt-2 space-y-1">
                {oktaSurface.gateStatus.map((line) => (
                  <div key={line} className="text-[11px] text-slate-200">{line}</div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-900/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gate transitions</div>
              <div className="mt-2 space-y-1">
                {oktaSurface.gateTransitions.map((line) => (
                  <div key={line} className="text-[11px] text-slate-200">{line}</div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-900/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tenant / integration admin workflows</div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {workflows.map((workflow) => (
                  <div key={`${workflow.role}-${workflow.title}`} className="rounded-lg bg-slate-950/80 px-3 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                      {workflow.role.toLowerCase().replace(/_/g, ' ')} · {workflow.section}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-white">{workflow.title}</div>
                    <div className="mt-1 text-[11px] text-slate-300">{workflow.summary}</div>
                    <div className="mt-2 text-[11px] text-slate-400">Next action: {workflow.nextAction}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/80 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Activation package</div>
            <div className="space-y-1">
              {packageLines.slice(0, 5).map((line) => (
                <div key={line} className="text-xs text-slate-300">{line}</div>
              ))}
            </div>
          </div>
          {workspaceMode === 'local_lab' && localRoleLabLines.length > 0 && (
            <div className="rounded-lg bg-slate-800/80 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Local role lab</div>
              <div className="space-y-1">
                {localRoleLabLines.slice(0, 6).map((line) => (
                  <div key={line} className="text-xs text-slate-300">{line}</div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-lg bg-slate-800/80 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Activation checklist</div>
            <div className="space-y-1">
              {productShellSummary.activation_checklist.slice(0, 6).map((item) => (
                <div key={item.item_id} className="text-xs text-slate-300">
                  {item.title} · {item.state.toLowerCase().replace(/_/g, ' ')} · {item.requirement_status?.toLowerCase().replace(/_/g, ' ')} · {item.owner_label}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/80 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Remaining blockers</div>
            <div className="space-y-1">
              {productShellSummary.remaining_blockers.slice(0, 5).map((blocker) => (
                <div key={blocker.code} className="text-xs text-slate-300">
                  {blocker.summary} · {blocker.missing_artifact}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/80 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Evidence categories</div>
            <div className="space-y-1">
              {productShellSummary.evidence_categories.map((item) => (
                <div key={item.category} className="text-xs text-slate-300">
                  {item.category.toLowerCase().replace(/_/g, ' ')} · {item.state.toLowerCase().replace(/_/g, ' ')} · real {item.real_evidence_count}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-sky-300">Next action: {productShellSummary.next_action}</div>
          </div>
          {workspaceMode !== 'local_lab' && onRegisterActivationPackageHandoff && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Register activation handoff</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={handoffOwnerType} onChange={(e) => setHandoffOwnerType(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="PILOT_COMMANDER">Pilot commander</option>
                  <option value="REQUESTER_OWNER">Requester owner</option>
                  <option value="OPERATOR_OWNER">Operator owner</option>
                  <option value="TENANT_ADMIN_OWNER">Tenant admin owner</option>
                </select>
                <input value={handoffOwnerLabel} onChange={(e) => setHandoffOwnerLabel(e.target.value)} placeholder="Owner label" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <input value={handoffSummary} onChange={(e) => setHandoffSummary(e.target.value)} placeholder="Handoff summary" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
              </div>
              <button
                onClick={() => onRegisterActivationPackageHandoff({
                  workspaceMode,
                  owner_type: handoffOwnerType,
                  owner_label: handoffOwnerLabel || undefined,
                  summary: handoffSummary || undefined,
                  handoff_note: `Registered from tenant admin setup panel for ${handoffOwnerType}`,
                })}
                className="rounded bg-indigo-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Register activation handoff
              </button>
            </div>
          )}
          {workspaceMode !== 'local_lab' && onRegisterActor && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Register actor readiness</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={actorRole} onChange={(e) => setActorRole(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REQUESTER">Requester</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="TENANT_ADMIN">Tenant admin</option>
                </select>
                <input value={actorLabel} onChange={(e) => setActorLabel(e.target.value)} placeholder="Actor label" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <select value={actorSource} onChange={(e) => setActorSource(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REAL_PILOT">REAL_PILOT</option>
                  <option value="DEMO">DEMO</option>
                  <option value="SIMULATOR">SIMULATOR</option>
                  <option value="TEST">TEST</option>
                  <option value="LOCAL_SYNTHETIC">LOCAL_SYNTHETIC</option>
                </select>
              </div>
              <button
                onClick={() => onRegisterActor({
                  workspaceMode,
                  role: actorRole,
                  actor_label: actorLabel || undefined,
                  source: actorSource,
                  provisioningState: actorSource === 'REAL_PILOT' ? 'PROVISIONED' : 'BLOCKED',
                  accessState: actorSource === 'REAL_PILOT' ? 'GRANTED' : 'BLOCKED',
                  note: `Registered from tenant admin setup panel as ${actorSource}`,
                })}
                className="rounded bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Register actor readiness
              </button>
            </div>
          )}
          {workspaceMode !== 'local_lab' && onSubmitArtifactIntake && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Submit external artifact intake</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={artifactKind} onChange={(e) => setArtifactKind(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REAL_EVIDENCE">Real evidence</option>
                  <option value="ENVIRONMENT_BINDING">Environment binding</option>
                  <option value="ACTOR_READINESS">Actor readiness</option>
                  <option value="CONNECTOR_ELIGIBILITY">Connector eligibility</option>
                </select>
                <select value={artifactSource} onChange={(e) => setArtifactSource(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REAL_PILOT">REAL_PILOT</option>
                  <option value="DEMO">DEMO</option>
                  <option value="SIMULATOR">SIMULATOR</option>
                  <option value="TEST">TEST</option>
                  <option value="LOCAL_SYNTHETIC">LOCAL_SYNTHETIC</option>
                </select>
                <input value={artifactSummary} onChange={(e) => setArtifactSummary(e.target.value)} placeholder="Artifact summary" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
              </div>
              <button
                onClick={() => onSubmitArtifactIntake({
                  workspaceMode,
                  artifact_kind: artifactKind,
                  source: artifactSource,
                  summary: artifactSummary,
                  actor_role: artifactKind === 'ACTOR_READINESS' ? actorRole : undefined,
                  actor_label: artifactKind === 'ACTOR_READINESS' ? actorLabel || undefined : undefined,
                  provisioning_state: artifactKind === 'ACTOR_READINESS' && artifactSource === 'REAL_PILOT' ? 'PROVISIONED' : undefined,
                  access_state: artifactKind === 'ACTOR_READINESS' && artifactSource === 'REAL_PILOT' ? 'GRANTED' : undefined,
                  evidence_category: artifactKind === 'REAL_EVIDENCE' ? evidenceCategory : undefined,
                  environment_kind: artifactKind === 'ENVIRONMENT_BINDING' ? environmentKind : undefined,
                  environment_label: artifactKind === 'ENVIRONMENT_BINDING' ? (environmentLabel || environmentKind) : undefined,
                  base_url: artifactKind === 'ENVIRONMENT_BINDING' ? (baseUrl || undefined) : undefined,
                  tenant_id: artifactKind === 'ENVIRONMENT_BINDING' ? (tenantId || undefined) : undefined,
                  workspace_id: artifactKind === 'ENVIRONMENT_BINDING' ? (workspaceId || undefined) : undefined,
                  connector_id: artifactKind === 'CONNECTOR_ELIGIBILITY' ? connectorId : undefined,
                })}
                className="rounded bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Submit artifact intake
              </button>
            </div>
          )}
          {workspaceMode !== 'local_lab' && onReviewArtifactIntake && productShellSummary.activation_package.recent_intakes.length > 0 && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Review external artifact intake</div>
              <div className="space-y-1">
                {productShellSummary.activation_package.recent_intakes.slice(0, 4).map((intake) => (
                  <div key={intake.intake_id} className="text-xs text-slate-300">
                    {intake.artifact_kind.toLowerCase().replace(/_/g, ' ')} · {intake.verification_status.toLowerCase().replace(/_/g, ' ')} · {intake.summary}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <select value={selectedIntakeId} onChange={(e) => setSelectedIntakeId(e.target.value)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="">Select intake</option>
                  {productShellSummary.activation_package.recent_intakes.map((intake) => (
                    <option key={intake.intake_id} value={intake.intake_id}>{intake.artifact_kind} · {intake.intake_id}</option>
                  ))}
                </select>
                <select value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="VERIFY">VERIFY</option>
                  <option value="PROMOTE">PROMOTE</option>
                  <option value="REJECT">REJECT</option>
                </select>
              </div>
              <button
                onClick={() => selectedIntakeId && onReviewArtifactIntake({
                  workspaceMode,
                  intake_id: selectedIntakeId,
                  decision: reviewDecision,
                  reviewed_by: 'tenant_admin_panel',
                  verification_note: `Reviewed from tenant admin setup panel as ${reviewDecision}`,
                })}
                className="rounded bg-rose-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Review artifact intake
              </button>
            </div>
          )}
          {workspaceMode !== 'local_lab' && onRegisterEnvironmentBinding && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Register environment binding</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={environmentKind} onChange={(e) => setEnvironmentKind(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="PILOT">PILOT</option>
                  <option value="PRODUCTION">PRODUCTION</option>
                  <option value="DEMO">DEMO</option>
                  <option value="SIMULATOR">SIMULATOR</option>
                </select>
                <input value={environmentLabel} onChange={(e) => setEnvironmentLabel(e.target.value)} placeholder="Environment label" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant ID" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="Workspace ID" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <select value={environmentSource} onChange={(e) => setEnvironmentSource(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REAL_PILOT">REAL_PILOT</option>
                  <option value="DEMO">DEMO</option>
                  <option value="SIMULATOR">SIMULATOR</option>
                  <option value="TEST">TEST</option>
                  <option value="LOCAL_SYNTHETIC">LOCAL_SYNTHETIC</option>
                </select>
              </div>
              <button
                onClick={() => onRegisterEnvironmentBinding({
                  workspaceMode,
                  environment_kind: environmentKind,
                  environment_label: environmentLabel || environmentKind,
                  base_url: baseUrl || undefined,
                  tenant_id: tenantId || undefined,
                  workspace_id: workspaceId || undefined,
                  source: environmentSource,
                  summary: `Registered environment binding from tenant admin setup panel as ${environmentSource}`,
                })}
                className="rounded bg-violet-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Register environment binding
              </button>
            </div>
          )}
          {workspaceMode !== 'local_lab' && onRegisterConnectorEligibility && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Register connector eligibility</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input value={connectorId} onChange={(e) => setConnectorId(e.target.value)} placeholder="Connector ID" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
                <select value={connectorSource} onChange={(e) => setConnectorSource(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REAL_PILOT">REAL_PILOT</option>
                  <option value="DEMO">DEMO</option>
                  <option value="SIMULATOR">SIMULATOR</option>
                  <option value="TEST">TEST</option>
                  <option value="LOCAL_SYNTHETIC">LOCAL_SYNTHETIC</option>
                </select>
              </div>
              <button
                onClick={() => onRegisterConnectorEligibility({
                  workspaceMode,
                  connector_id: connectorId,
                  source: connectorSource,
                  summary: `Registered connector eligibility from tenant admin setup panel as ${connectorSource}`,
                })}
                className="rounded bg-fuchsia-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Register connector eligibility
              </button>
            </div>
          )}
          {workspaceMode !== 'local_lab' && onRegisterEvidence && (
            <div className="rounded-lg bg-slate-800/80 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Register pilot evidence</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={evidenceCategory} onChange={(e) => setEvidenceCategory(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="DEVICE_SESSION_PROOF">Device / session</option>
                  <option value="WORKFLOW_ARTIFACT_PROOF">Workflow artifact</option>
                  <option value="CONNECTOR_CREDENTIAL_PROOF">Connector / credential</option>
                  <option value="TENANT_ADMIN_SUPPORT_PROOF">Tenant-admin / support</option>
                  <option value="STABILITY_SAFETY_PROOF">Stability / safety</option>
                </select>
                <select value={evidenceSource} onChange={(e) => setEvidenceSource(e.target.value as any)} className="rounded bg-slate-900 px-2 py-2 text-xs text-white">
                  <option value="REAL_PILOT">REAL_PILOT</option>
                  <option value="DEMO">DEMO</option>
                  <option value="SIMULATOR">SIMULATOR</option>
                  <option value="TEST">TEST</option>
                  <option value="LOCAL_SYNTHETIC">LOCAL_SYNTHETIC</option>
                </select>
                <input value={evidenceSummary} onChange={(e) => setEvidenceSummary(e.target.value)} placeholder="Evidence summary" className="rounded bg-slate-900 px-2 py-2 text-xs text-white" />
              </div>
              <button
                onClick={() => onRegisterEvidence({
                  workspaceMode,
                  category: evidenceCategory,
                  source: evidenceSource,
                  summary: evidenceSummary,
                })}
                className="rounded bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Register evidence
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TenantAdminSetupPanel;
