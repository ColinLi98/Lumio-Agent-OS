import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeEnterpriseAction, assertEnterpriseWriteAllowed, resolveEnterpriseSessionContext } from '../../../../../services/agent-kernel/enterpriseAuthorization.js';
import { getTaskGraphRuntime } from '../../../../../services/agent-kernel/runtime.js';
import type { EnterpriseRole } from '../../../../../services/agent-kernel/contracts.js';
import { enterpriseErrorStatus, readBearerToken, readWorkspaceMode, withCors } from '../../../common.js';

function parseItemId(raw: string): { kind: string; rest: string[] } {
    const parts = String(raw || '').trim().split(':').filter(Boolean);
    return {
        kind: parts[0] || '',
        rest: parts.slice(1),
    };
}

function firstMatchingRole(
    roles: EnterpriseRole[],
    allowed: EnterpriseRole[],
): Exclude<EnterpriseRole, 'WORKSPACE_MEMBER'> | undefined {
    const match = roles.find((role) => allowed.includes(role));
    if (!match || match === 'WORKSPACE_MEMBER') return undefined;
    return match;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        assertEnterpriseWriteAllowed(readWorkspaceMode(req));
        const itemId = String(req.query?.itemId || '').trim();
        const decision = String(req.body?.decision || '').trim().toLowerCase();
        const sessionId = String(req.body?.session_id || readBearerToken(req) || '').trim();
        const note = String(req.body?.note || req.body?.verification_note || '').trim() || undefined;
        const parsed = parseItemId(itemId);
        const runtime = getTaskGraphRuntime();
        const store = runtime.getStore();
        const context = await resolveEnterpriseSessionContext(store, sessionId);

        if (parsed.kind === 'approval_task') {
            await authorizeEnterpriseAction(store, {
                session_id: sessionId,
                action: 'ENTERPRISE_CENTER_APPROVAL_DECIDE',
                workspace_mode: 'current',
            });
            const [taskId, nodeId] = parsed.rest;
            if (!taskId || !nodeId) {
                throw new Error('enterprise_center_item_invalid');
            }
            const snapshot = await runtime.approveTask(taskId, {
                node_id: nodeId,
                decision: decision === 'reject' ? 'reject' : 'approve',
            });
            res.status(200).json({ success: true, snapshot });
            return;
        }

        if (parsed.kind === 'pilot_review' || parsed.kind === 'pilot_promotion') {
            const [intakeId] = parsed.rest;
            if (!intakeId) {
                throw new Error('enterprise_center_item_invalid');
            }
            const intake = await store.getPilotExternalArtifactIntake(intakeId);
            if (!intake) {
                throw new Error('pilot_external_artifact_intake_not_found');
            }

            if (parsed.kind === 'pilot_review') {
                await authorizeEnterpriseAction(store, {
                    session_id: sessionId,
                    action: 'PILOT_ARTIFACT_VERIFY',
                    workspace_mode: 'current',
                    tenant_id: intake.tenant_id,
                    workspace_id: intake.workspace_id,
                    artifact_kind: intake.artifact_kind,
                });
                const record = await runtime.reviewPilotExternalArtifactIntake({
                    workspaceMode: 'current',
                    intakeId,
                    decision: decision === 'verify'
                        ? 'VERIFY'
                        : decision === 'request_evidence'
                            ? 'REQUEST_EVIDENCE'
                            : decision === 'hand_back'
                                ? 'HAND_BACK'
                                : 'REJECT',
                    reviewedBy: context.principal.display_name || context.principal.email,
                    reviewedByEnterpriseRole: firstMatchingRole(context.available_roles, ['REVIEWER', 'APPROVER', 'TENANT_ADMIN']),
                    verificationNote: note,
                });
                res.status(200).json({ success: true, record });
                return;
            }

            if (decision === 'approve') {
                await authorizeEnterpriseAction(store, {
                    session_id: sessionId,
                    action: 'PILOT_ARTIFACT_PROMOTE',
                    workspace_mode: 'current',
                    tenant_id: intake.tenant_id,
                    workspace_id: intake.workspace_id,
                    artifact_kind: intake.artifact_kind,
                });
                const record = await runtime.reviewPilotExternalArtifactIntake({
                    workspaceMode: 'current',
                    intakeId,
                    decision: 'PROMOTE',
                    reviewedBy: context.principal.display_name || context.principal.email,
                    reviewedByEnterpriseRole: firstMatchingRole(context.available_roles, ['TENANT_ADMIN', 'INTEGRATION_ADMIN']),
                    verificationNote: note,
                });
                res.status(200).json({ success: true, record });
                return;
            }

            await authorizeEnterpriseAction(store, {
                session_id: sessionId,
                action: 'ENTERPRISE_CENTER_APPROVAL_DECIDE',
                workspace_mode: 'current',
                tenant_id: intake.tenant_id,
                workspace_id: intake.workspace_id,
            });
            const record = await runtime.reviewPilotExternalArtifactIntake({
                workspaceMode: 'current',
                intakeId,
                decision: decision === 'request_clarification' ? 'REQUEST_EVIDENCE' : 'REJECT',
                reviewedBy: context.principal.display_name || context.principal.email,
                reviewedByEnterpriseRole: firstMatchingRole(context.available_roles, ['APPROVER', 'TENANT_ADMIN']),
                verificationNote: note,
            });
            res.status(200).json({ success: true, record });
            return;
        }

        throw new Error('enterprise_center_item_unsupported');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'enterprise_center_decision_failed';
        res.status(enterpriseErrorStatus(message)).json({
            success: false,
            error: message,
        });
    }
}
