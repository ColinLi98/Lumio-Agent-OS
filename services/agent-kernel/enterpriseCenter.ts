import type {
    AgentKernelAuditExportRecord,
    EnterpriseCenterItem,
    EnterpriseCenterItemStatus,
    EnterpriseCenterSummary,
    EnterpriseCenterType,
    EnterpriseMembershipInviteRecord,
    EnterprisePrincipalRecord,
    PilotExternalArtifactIntakeRecord,
    TaskSnapshot,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { AgentKernelDeploymentBaselineService } from './deployment.js';
import { resolveEnterpriseSessionContext } from './enterpriseAuthorization.js';
import { AgentKernelProductShellService } from './productShell.js';

function now(): number {
    return Date.now();
}

function workspaceMatches<T extends { workspace_id?: string; tenant_id?: string }>(
    record: T,
    tenantId: string,
    workspaceId?: string,
): boolean {
    if (record.tenant_id && record.tenant_id !== tenantId) return false;
    if (!workspaceId) return true;
    return !record.workspace_id || record.workspace_id === workspaceId;
}

function approvalItemId(taskId: string, nodeId: string): string {
    return `approval_task:${taskId}:${nodeId}`;
}

function pilotReviewItemId(intakeId: string): string {
    return `pilot_review:${intakeId}`;
}

function pilotPromotionItemId(intakeId: string): string {
    return `pilot_promotion:${intakeId}`;
}

function auditExportItemId(exportId: string): string {
    return `audit_export:${exportId}`;
}

function membershipInviteItemId(inviteId: string): string {
    return `membership_invite:${inviteId}`;
}

function membershipPrincipalItemId(principalId: string): string {
    return `membership_principal:${principalId}`;
}

function activationBlockerItemId(code: string): string {
    return `activation_blocker:${code}`;
}

function titleForArtifact(intake: PilotExternalArtifactIntakeRecord): string {
    return intake.artifact_kind.toLowerCase().replace(/_/g, ' ');
}

function reviewStatusFor(intake: PilotExternalArtifactIntakeRecord): EnterpriseCenterItemStatus {
    if (intake.verification_status === 'RECEIVED') return 'PENDING';
    if (intake.verification_status === 'EVIDENCE_REQUESTED') return 'BLOCKED';
    return 'OPEN';
}

function auditSummaryForExport(record: AgentKernelAuditExportRecord): string {
    return `Audit export generated with ${record.record_counts.ledger_record_count} ledger records and ${record.record_counts.alert_count} alerts.`;
}

export class EnterpriseCenterService {
    private readonly productShellService: AgentKernelProductShellService;

    constructor(private readonly store: TaskStore) {
        this.productShellService = new AgentKernelProductShellService(
            store,
            new AgentKernelDeploymentBaselineService(store),
        );
    }

    private async listTaskSnapshots(): Promise<TaskSnapshot[]> {
        const taskIds = await this.store.listTaskIds();
        const snapshots = await Promise.all(taskIds.map((taskId) => this.store.getTaskSnapshot(taskId)));
        return snapshots.filter((snapshot): snapshot is TaskSnapshot => Boolean(snapshot));
    }

    private buildTaskApprovalItems(snapshots: TaskSnapshot[]): EnterpriseCenterItem[] {
        return snapshots
            .filter((snapshot) => snapshot.task_state.current_wait?.type === 'approval')
            .map((snapshot) => ({
                item_id: approvalItemId(snapshot.task_state.task_id, snapshot.task_state.current_wait!.node_id),
                center: 'APPROVAL' as const,
                source: 'TASK_APPROVAL_WAIT' as const,
                status: 'PENDING' as const,
                title: snapshot.task_state.current_wait?.prompt?.title || snapshot.graph.goal,
                summary: snapshot.task_state.current_wait?.prompt?.summary || snapshot.graph.goal,
                detail_lines: [
                    `Task ${snapshot.task_state.task_id}`,
                    `Node ${snapshot.task_state.current_wait?.node_id}`,
                    `Risk ${snapshot.task_state.current_wait?.prompt?.risk || 'unknown'}`,
                ],
                available_actions: ['approve', 'reject'],
                task_id: snapshot.task_state.task_id,
                node_id: snapshot.task_state.current_wait?.node_id,
                created_at: snapshot.task_state.created_at,
                updated_at: snapshot.task_state.updated_at,
            }))
            .sort((a, b) => b.updated_at - a.updated_at);
    }

    private buildPilotReviewItems(
        intakes: PilotExternalArtifactIntakeRecord[],
    ): EnterpriseCenterItem[] {
        return intakes
            .filter((intake) =>
                intake.verification_status === 'RECEIVED'
                || intake.verification_status === 'EVIDENCE_REQUESTED'
                || intake.verification_status === 'HANDED_BACK'
            )
            .map((intake) => ({
                item_id: pilotReviewItemId(intake.intake_id),
                center: 'REVIEW' as const,
                source: 'PILOT_ARTIFACT_REVIEW' as const,
                status: reviewStatusFor(intake),
                title: `Review ${titleForArtifact(intake)}`,
                summary: intake.summary,
                detail_lines: [
                    `Source ${intake.source}`,
                    `Current review state ${intake.verification_status.toLowerCase().replace(/_/g, ' ')}`,
                    ...(intake.verification_summary ? [intake.verification_summary] : []),
                ],
                available_actions: ['verify', 'reject', 'request_evidence', 'hand_back'],
                intake_id: intake.intake_id,
                created_at: intake.created_at,
                updated_at: intake.updated_at,
            }))
            .sort((a, b) => b.updated_at - a.updated_at);
    }

    private buildPilotPromotionItems(
        intakes: PilotExternalArtifactIntakeRecord[],
    ): EnterpriseCenterItem[] {
        return intakes
            .filter((intake) => intake.verification_status === 'VERIFIED')
            .map((intake) => ({
                item_id: pilotPromotionItemId(intake.intake_id),
                center: 'APPROVAL' as const,
                source: 'PILOT_ARTIFACT_PROMOTION' as const,
                status: 'READY_FOR_APPROVAL' as const,
                title: `Promote ${titleForArtifact(intake)}`,
                summary: intake.summary,
                detail_lines: [
                    `Source ${intake.source}`,
                    intake.verification_summary || 'Verified and ready for promotion into real pilot truth.',
                ],
                available_actions: ['approve', 'reject', 'request_clarification'],
                intake_id: intake.intake_id,
                created_at: intake.created_at,
                updated_at: intake.updated_at,
            }))
            .sort((a, b) => b.updated_at - a.updated_at);
    }

    private buildInviteAuditItems(invites: EnterpriseMembershipInviteRecord[]): EnterpriseCenterItem[] {
        return invites.map((invite) => ({
            item_id: membershipInviteItemId(invite.invite_id),
            center: 'AUDIT' as const,
            source: 'MEMBERSHIP_INVITE' as const,
            status: invite.status === 'ACCEPTED'
                ? 'COMPLETED'
                : invite.status === 'OPEN'
                    ? 'OPEN'
                    : invite.status === 'EXPIRED'
                        ? 'EXPIRED'
                        : 'REJECTED',
            title: `Membership invite ${invite.email}`,
            summary: `${invite.role.toLowerCase().replace(/_/g, ' ')} invite is ${invite.status.toLowerCase()}.`,
            detail_lines: [
                `Workspace ${invite.workspace_id || 'tenant default'}`,
                `Invited by ${invite.invited_by_label}`,
                ...(invite.accepted_principal_id ? [`Accepted by ${invite.accepted_principal_id}`] : []),
            ],
            available_actions: [],
            invite_id: invite.invite_id,
            created_at: invite.created_at,
            updated_at: invite.updated_at,
        }));
    }

    private buildPrincipalAuditItems(principals: EnterprisePrincipalRecord[]): EnterpriseCenterItem[] {
        return principals
            .filter((principal) => principal.status !== 'ACTIVE')
            .map((principal) => ({
                item_id: membershipPrincipalItemId(principal.principal_id),
                center: 'AUDIT' as const,
                source: 'MEMBERSHIP_PRINCIPAL' as const,
                status: principal.status === 'SUSPENDED' ? 'INACTIVE' : 'REJECTED',
                title: `Member ${principal.email}`,
                summary: `Principal is ${principal.status.toLowerCase()}.`,
                detail_lines: [
                    `Tenant ${principal.tenant_id}`,
                    `Last login ${principal.last_login_at || 'never'}`,
                ],
                available_actions: [],
                principal_id: principal.principal_id,
                created_at: principal.created_at,
                updated_at: principal.updated_at,
            }));
    }

    async summarizeCenter(input: {
        sessionId: string;
        center: EnterpriseCenterType;
    }): Promise<EnterpriseCenterSummary> {
        const context = await resolveEnterpriseSessionContext(this.store, input.sessionId);
        const workspaceId = context.session.workspace_id;
        const taskSnapshots = await this.listTaskSnapshots();
        const intakes = (await this.store.listPilotExternalArtifactIntakes())
            .filter((record) => workspaceMatches(record, context.session.tenant_id, workspaceId));

        let items: EnterpriseCenterItem[] = [];
        if (input.center === 'APPROVAL') {
            items = [
                ...this.buildTaskApprovalItems(taskSnapshots),
                ...this.buildPilotPromotionItems(intakes),
            ];
        } else if (input.center === 'REVIEW') {
            items = this.buildPilotReviewItems(intakes);
        } else {
            const auditExports = await Promise.all(taskSnapshots.map((snapshot) =>
                this.store.listComplianceAuditExports(snapshot.task_state.task_id),
            ));
            const exportItems = auditExports
                .flat()
                .map((record) => ({
                    item_id: auditExportItemId(record.export_id),
                    center: 'AUDIT' as const,
                    source: 'COMPLIANCE_AUDIT_EXPORT' as const,
                    status: 'COMPLETED' as const,
                    title: `Audit export ${record.task_id}`,
                    summary: auditSummaryForExport(record),
                    detail_lines: [
                        `Correlation ${record.correlation_id || 'n/a'}`,
                        `Created by ${record.requested_by.email}`,
                    ],
                    available_actions: [],
                    task_id: record.task_id,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                }));
            const artifactAudit = intakes
                .filter((record) =>
                    record.verification_status === 'PROMOTED'
                    || record.verification_status === 'REJECTED'
                    || record.verification_status === 'EVIDENCE_REQUESTED'
                    || record.verification_status === 'HANDED_BACK'
                )
                .map((record) => ({
                    item_id: `${record.verification_status.toLowerCase()}:${record.intake_id}`,
                    center: 'AUDIT' as const,
                    source: record.verification_status === 'PROMOTED'
                        ? 'PILOT_ARTIFACT_PROMOTION' as const
                        : 'PILOT_ARTIFACT_REVIEW' as const,
                    status: record.verification_status === 'PROMOTED'
                        ? 'COMPLETED' as const
                        : record.verification_status === 'REJECTED'
                            ? 'REJECTED' as const
                            : 'BLOCKED' as const,
                    title: `${record.verification_status.toLowerCase().replace(/_/g, ' ')} ${titleForArtifact(record)}`,
                    summary: record.summary,
                    detail_lines: [
                        record.verification_summary || 'No verification summary recorded.',
                        ...(record.reviewed_by ? [`Reviewed by ${record.reviewed_by}`] : []),
                    ],
                    available_actions: [],
                    intake_id: record.intake_id,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                }));
            const invites = await this.store.listEnterpriseMembershipInvites(context.session.tenant_id, workspaceId);
            const principals = (await this.store.listEnterprisePrincipals())
                .filter((principal) => principal.tenant_id === context.session.tenant_id);
            const shellSummary = await this.productShellService.summarizeProductShell({ workspaceMode: 'current' });
            const blockerItems = shellSummary.remaining_blockers.map((blocker) => ({
                item_id: activationBlockerItemId(blocker.code),
                center: 'AUDIT' as const,
                source: 'PILOT_ACTIVATION_BLOCKER' as const,
                status: 'BLOCKED' as const,
                title: blocker.summary,
                summary: blocker.missing_artifact,
                detail_lines: [blocker.next_action],
                available_actions: [],
                created_at: now(),
                updated_at: now(),
            }));
            items = [
                ...exportItems,
                ...artifactAudit,
                ...this.buildInviteAuditItems(invites),
                ...this.buildPrincipalAuditItems(principals),
                ...blockerItems,
            ].sort((a, b) => b.updated_at - a.updated_at);
        }

        return {
            generated_at: now(),
            center: input.center,
            item_count: items.length,
            actionable_count: items.filter((item) => item.available_actions.length > 0).length,
            items,
        };
    }
}
