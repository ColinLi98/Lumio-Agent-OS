import crypto from 'node:crypto';
import type {
    AgentKernelAuditExportBundle,
    AgentKernelAuditExportBundleSection,
    AgentKernelAuditExportRecord,
    AgentKernelAuditExportRecordCounts,
    AgentKernelAuditExportSectionHash,
    AgentKernelComplianceActorSummary,
    AgentKernelComplianceDeletionRequestRecord,
    AgentKernelComplianceQuestionnaireReference,
    AgentKernelLegalHoldPostureSummary,
    AgentKernelPilotComplianceSummary,
    AgentKernelPilotComplianceTaskSummary,
    AgentKernelTaskComplianceSummary,
    ExecutionLedgerRetentionSummary,
    TaskSnapshot,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { hashText, stableJson } from './utils.js';

export interface AgentKernelComplianceServiceOptions {
    now?: () => number;
}

export interface ComplianceDeletionRequestInput {
    task_id: string;
    session_id: string;
    workspace_id?: string;
    reason: string;
    legal_hold_asserted?: boolean;
}

export interface ComplianceAuditExportInput {
    task_id: string;
    session_id: string;
    workspace_id?: string;
}

function currentTime(): number {
    return Date.now();
}

const QUESTIONNAIRE_REFERENCE: AgentKernelComplianceQuestionnaireReference = {
    version: 'PILOT_2026_03_07',
    title: 'Agent Kernel Security and Privacy Questionnaire Starter Pack',
    path: 'docs/agent-kernel-security-privacy-questionnaire-starter-pack.md',
};

const LEGAL_HOLD_POSTURE: AgentKernelLegalHoldPostureSummary = {
    mode: 'MANUAL_ESCALATION_REQUIRED',
    supported_for_pilot: false,
    automated_enforcement: false,
    deletion_blocking_requires_manual_review: true,
    export_blocking_requires_manual_review: true,
    deferred_reason: 'Automated legal-hold lifecycle is deferred beyond the frozen pilot launch. Operators must escalate hold requests manually before deletion or export handling.',
    runbook_path: 'docs/agent-kernel-compliance-operations-runbook.md',
};

function createOpaqueId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
}

function anyAdminBinding(bindings: Array<{ roles: string[]; workspace_id?: string }>, workspaceId?: string): boolean {
    return bindings.some((binding) => {
        if (binding.roles.includes('TENANT_ADMIN')) return true;
        if (!workspaceId) return binding.roles.includes('WORKSPACE_ADMIN');
        return binding.workspace_id === workspaceId && binding.roles.includes('WORKSPACE_ADMIN');
    });
}

function countItems(value: unknown): number {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length || 1;
    return value === undefined ? 0 : 1;
}

function defaultRetentionSummary(snapshot: TaskSnapshot): ExecutionLedgerRetentionSummary {
    return {
        policy_name: 'PILOT_APPEND_ONLY_NO_DELETE',
        retained_from_sequence: 0,
        retained_through_sequence: 0,
        record_count: 0,
        oldest_record_at: snapshot.task_state.created_at,
        newest_record_at: snapshot.task_state.updated_at,
        archive_after_record_count: 1000,
        archive_after_age_ms: 30 * 24 * 60 * 60 * 1000,
        archive_recommended: false,
        snapshot_required_before_archive: true,
        delete_allowed: false,
        projection_rebuild_required_after_archive: true,
        latest_compaction_hint: undefined,
    };
}

export class AgentKernelComplianceService {
    private readonly now: () => number;

    constructor(
        private readonly store: TaskStore,
        options?: AgentKernelComplianceServiceOptions,
    ) {
        this.now = options?.now || currentTime;
    }

    private async resolveAdminActor(sessionId: string, workspaceId?: string): Promise<AgentKernelComplianceActorSummary> {
        const normalizedSessionId = String(sessionId || '').trim();
        if (!normalizedSessionId) {
            throw new Error('missing_enterprise_session');
        }

        const session = await this.store.getEnterpriseIdentitySession(normalizedSessionId);
        if (!session) {
            throw new Error('enterprise_session_not_found');
        }
        if (session.status !== 'ACTIVE') {
            throw new Error('enterprise_session_not_active');
        }
        if (session.expires_at <= this.now()) {
            await this.store.updateEnterpriseIdentitySession(session.session_id, {
                status: 'EXPIRED',
                updated_at: this.now(),
            });
            throw new Error('enterprise_session_expired');
        }

        const principal = await this.store.getEnterprisePrincipal(session.principal_id);
        if (!principal || principal.status !== 'ACTIVE') {
            throw new Error('enterprise_principal_not_active');
        }

        const activeBindings = (await this.store.listEnterpriseAccessBindings(principal.principal_id))
            .filter((binding) => binding.status === 'ACTIVE');

        if (!anyAdminBinding(activeBindings, workspaceId || session.workspace_id)) {
            throw new Error('enterprise_admin_access_denied');
        }

        await this.store.updateEnterpriseIdentitySession(session.session_id, {
            last_seen_at: this.now(),
            updated_at: this.now(),
        });

        return {
            actor_type: 'ENTERPRISE_SESSION',
            principal_id: principal.principal_id,
            session_id: session.session_id,
            email: principal.email,
            display_name: principal.display_name,
        };
    }

    async summarizeTask(snapshot: TaskSnapshot): Promise<AgentKernelTaskComplianceSummary> {
        const deletionRequests = await this.store.listComplianceDeletionRequests(snapshot.task_state.task_id);
        const auditExports = await this.store.listComplianceAuditExports(snapshot.task_state.task_id);
        const latestExport = auditExports
            .slice()
            .sort((a, b) => b.created_at - a.created_at)[0];
        const retention = snapshot.execution_ledger?.retention || defaultRetentionSummary(snapshot);

        return {
            task_id: snapshot.task_state.task_id,
            retention,
            deletion: {
                delete_allowed: false,
                baseline: 'APPEND_ONLY_REQUEST_AND_DENY',
                latest_requests: deletionRequests
                    .slice()
                    .sort((a, b) => b.created_at - a.created_at)
                    .slice(0, 10),
            },
            audit_export: {
                baseline: 'MANIFEST_HASH_AND_SECTION_HASHES',
                total_exports: auditExports.length,
                latest_export: latestExport,
            },
            legal_hold: LEGAL_HOLD_POSTURE,
            questionnaire: QUESTIONNAIRE_REFERENCE,
        };
    }

    async summarizePilot(snapshots: TaskSnapshot[]): Promise<AgentKernelPilotComplianceSummary> {
        const taskSummaries: AgentKernelPilotComplianceTaskSummary[] = [];
        let archiveRecommendedTaskCount = 0;
        let deletionRequestCount = 0;
        let auditExportCount = 0;

        for (const snapshot of snapshots) {
            const compliance = await this.summarizeTask(snapshot);
            if (compliance.retention.archive_recommended) archiveRecommendedTaskCount += 1;
            deletionRequestCount += compliance.deletion.latest_requests.length;
            auditExportCount += compliance.audit_export.total_exports;
            taskSummaries.push({
                task_id: snapshot.task_state.task_id,
                task_status: snapshot.task_state.status,
                correlation_id: snapshot.task_state.correlation?.correlation_id || `corr_missing_${snapshot.task_state.task_id}`,
                archive_recommended: compliance.retention.archive_recommended,
                deletion_request_count: compliance.deletion.latest_requests.length,
                latest_deletion_status: compliance.deletion.latest_requests[0]?.status,
                latest_export_at: compliance.audit_export.latest_export?.created_at,
                updated_at: snapshot.task_state.updated_at,
            });
        }

        return {
            generated_at: this.now(),
            retention_policy_name: 'PILOT_APPEND_ONLY_NO_DELETE',
            archive_recommended_task_count: archiveRecommendedTaskCount,
            deletion_request_count: deletionRequestCount,
            audit_export_count: auditExportCount,
            legal_hold: LEGAL_HOLD_POSTURE,
            questionnaire: QUESTIONNAIRE_REFERENCE,
            task_summaries: taskSummaries.sort((a, b) => b.updated_at - a.updated_at),
        };
    }

    async createDeletionRequest(
        snapshot: TaskSnapshot,
        input: ComplianceDeletionRequestInput,
    ): Promise<AgentKernelComplianceDeletionRequestRecord> {
        const actor = await this.resolveAdminActor(input.session_id, input.workspace_id);
        const createdAt = this.now();
        const legalHoldAsserted = input.legal_hold_asserted === true;
        const status = legalHoldAsserted
            ? 'DENIED_MANUAL_LEGAL_HOLD_REVIEW'
            : 'DENIED_APPEND_ONLY_POLICY';
        const record: AgentKernelComplianceDeletionRequestRecord = {
            request_id: createOpaqueId('akdel'),
            task_id: snapshot.task_state.task_id,
            correlation_id: snapshot.task_state.correlation?.correlation_id,
            run_id: snapshot.task_state.correlation?.current_run_id,
            requested_by: actor,
            reason: String(input.reason || '').trim() || 'no_reason_provided',
            status,
            delete_scope: 'TASK_AUDIT_STATE',
            legal_hold_mode: LEGAL_HOLD_POSTURE.mode,
            decision_summary: legalHoldAsserted
                ? 'Deletion denied. Manual legal-hold review is required before any further action.'
                : 'Deletion denied. The frozen pilot retention policy is append-only and does not allow destructive delete.',
            next_action: legalHoldAsserted
                ? 'Escalate to the compliance operations runbook for manual legal-hold handling.'
                : 'Use audit export plus archive recommendation workflows; destructive delete remains unsupported in the pilot.',
            created_at: createdAt,
            updated_at: createdAt,
        };
        await this.store.upsertComplianceDeletionRequest(record);
        return record;
    }

    private summarizeNodeStates(snapshot: TaskSnapshot): Array<Record<string, unknown>> {
        return snapshot.node_states.map((nodeState) => ({
            node_id: nodeState.node_id,
            status: nodeState.status,
            attempt: nodeState.attempt,
            started_at: nodeState.started_at,
            ended_at: nodeState.ended_at,
            error_code: nodeState.error?.code,
            error_message_sha256: nodeState.error?.message
                ? hashText(nodeState.error.message)
                : undefined,
            input_sha256: nodeState.input !== undefined
                ? hashText(stableJson(nodeState.input))
                : undefined,
            output_sha256: nodeState.output !== undefined
                ? hashText(stableJson(nodeState.output))
                : undefined,
            approval_decision: nodeState.trace?.approval_decision,
            correlation_id: nodeState.trace?.correlation_id,
            run_id: nodeState.trace?.run_id,
            span_id: nodeState.trace?.span_id,
            policy_decision_ids: nodeState.trace?.policy_decision_ids || [],
        }));
    }

    private async buildAuditExportSections(
        snapshot: TaskSnapshot,
    ): Promise<{
        sections: AgentKernelAuditExportBundleSection[];
        counts: AgentKernelAuditExportRecordCounts;
    }> {
        const ledgerRecords = await this.store.listLedgerRecords({ task_id: snapshot.task_state.task_id });
        const deliveries = await this.store.listWebhookDeliveries();
        const taskDeliveries = deliveries.filter((delivery) =>
            delivery.task_id === snapshot.task_state.task_id
            || delivery.correlation_id === snapshot.task_state.correlation?.correlation_id
        );
        const deletionRequests = await this.store.listComplianceDeletionRequests(snapshot.task_state.task_id);
        const priorExports = await this.store.listComplianceAuditExports(snapshot.task_state.task_id);
        const compliance = snapshot.compliance || await this.summarizeTask(snapshot);

        const sections: AgentKernelAuditExportBundleSection[] = [
            {
                section_id: 'task_snapshot',
                item_count: 1,
                data: {
                    task_id: snapshot.task_state.task_id,
                    goal: snapshot.graph.goal,
                    task_status: snapshot.task_state.status,
                    current_wait: snapshot.task_state.current_wait
                        ? {
                            node_id: snapshot.task_state.current_wait.node_id,
                            type: snapshot.task_state.current_wait.type,
                            expires_at: snapshot.task_state.current_wait.expires_at,
                        }
                        : undefined,
                    budget_spent: snapshot.task_state.budget_spent,
                    created_at: snapshot.task_state.created_at,
                    updated_at: snapshot.task_state.updated_at,
                    correlation_id: snapshot.task_state.correlation?.correlation_id,
                    run_id: snapshot.task_state.correlation?.current_run_id,
                    policy_decision_ids: snapshot.policy_decision_ids,
                },
            },
            {
                section_id: 'node_execution_summary',
                item_count: snapshot.node_states.length,
                data: this.summarizeNodeStates(snapshot),
            },
            {
                section_id: 'execution_ledger_summary',
                item_count: ledgerRecords.length,
                data: ledgerRecords.map((record) => ({
                    sequence: record.sequence,
                    event_type: record.event_type,
                    source: record.source,
                    occurred_at: record.occurred_at,
                    payload_sha256: record.payload !== undefined
                        ? hashText(stableJson(record.payload))
                        : undefined,
                })),
            },
            {
                section_id: 'connector_delivery_summary',
                item_count: taskDeliveries.length,
                data: taskDeliveries.map((delivery) => ({
                    delivery_id: delivery.delivery_id,
                    connector_id: delivery.connector_id,
                    status: delivery.status,
                    adapter_id: delivery.adapter_id,
                    attempt: delivery.attempt,
                    http_status: delivery.http_status,
                    blocked_reason: delivery.blocked_reason,
                    created_at: delivery.created_at,
                    correlation_id: delivery.correlation_id,
                    run_id: delivery.run_id,
                    payload_summary_sha256: delivery.payload_summary
                        ? hashText(delivery.payload_summary)
                        : undefined,
                })),
            },
            {
                section_id: 'observability_summary',
                item_count: 1,
                data: snapshot.observability
                    ? {
                        correlation_id: snapshot.observability.correlation.correlation_id,
                        run_id: snapshot.observability.correlation.current_run_id,
                        alert_codes: snapshot.observability.alerts.map((alert) => alert.code),
                        metrics: snapshot.observability.metrics,
                        degraded_mode: snapshot.observability.degraded_mode,
                        slo: snapshot.observability.slo.map((slo) => ({
                            scope: slo.scope,
                            name: slo.name,
                            status: slo.status,
                            measured: slo.measured,
                            target: slo.target,
                        })),
                    }
                    : undefined,
            },
            {
                section_id: 'compliance_history',
                item_count: deletionRequests.length + priorExports.length,
                data: {
                    retention: compliance.retention,
                    deletion_requests: deletionRequests.map((record) => ({
                        request_id: record.request_id,
                        status: record.status,
                        reason_sha256: hashText(record.reason),
                        created_at: record.created_at,
                        requested_by: record.requested_by,
                    })),
                    prior_exports: priorExports.map((record) => ({
                        export_id: record.export_id,
                        status: record.status,
                        manifest_sha256: record.manifest_sha256,
                        bundle_sha256: record.bundle_sha256,
                        created_at: record.created_at,
                    })),
                },
            },
        ];

        return {
            sections,
            counts: {
                node_count: snapshot.node_states.length,
                ledger_record_count: ledgerRecords.length,
                delivery_count: taskDeliveries.length,
                alert_count: snapshot.observability?.alerts.length || 0,
                deletion_request_count: deletionRequests.length,
            },
        };
    }

    async createAuditExport(
        snapshot: TaskSnapshot,
        input: ComplianceAuditExportInput,
    ): Promise<{
        audit_export: AgentKernelAuditExportRecord;
        export_bundle: AgentKernelAuditExportBundle;
    }> {
        const actor = await this.resolveAdminActor(input.session_id, input.workspace_id);
        const exportId = createOpaqueId('akexp');
        const generatedAt = this.now();
        const { sections, counts } = await this.buildAuditExportSections(snapshot);
        const sectionHashes: AgentKernelAuditExportSectionHash[] = sections.map((section) => ({
            section_id: section.section_id,
            sha256: hashText(stableJson(section.data)),
            item_count: section.item_count || countItems(section.data),
        }));
        const manifest: AgentKernelAuditExportBundle['manifest'] = {
            export_id: exportId,
            task_id: snapshot.task_state.task_id,
            correlation_id: snapshot.task_state.correlation?.correlation_id,
            run_id: snapshot.task_state.correlation?.current_run_id,
            generated_at: generatedAt,
            bundle_version: 'PILOT_AUDIT_EXPORT_V1',
            redaction_mode: 'SUMMARY_ONLY_NO_SECRET_MATERIAL',
            section_hashes: sectionHashes,
            record_counts: counts,
            questionnaire: QUESTIONNAIRE_REFERENCE,
            legal_hold: LEGAL_HOLD_POSTURE,
        };
        const manifestSha256 = hashText(stableJson(manifest));
        const bundlePayload = {
            manifest,
            manifest_sha256: manifestSha256,
            sections,
        };
        const bundleSha256 = hashText(stableJson(bundlePayload));
        const exportBundle: AgentKernelAuditExportBundle = {
            ...bundlePayload,
            bundle_sha256: bundleSha256,
        };
        const record: AgentKernelAuditExportRecord = {
            export_id: exportId,
            task_id: snapshot.task_state.task_id,
            correlation_id: snapshot.task_state.correlation?.correlation_id,
            run_id: snapshot.task_state.correlation?.current_run_id,
            requested_by: actor,
            status: 'GENERATED',
            bundle_version: 'PILOT_AUDIT_EXPORT_V1',
            redaction_mode: 'SUMMARY_ONLY_NO_SECRET_MATERIAL',
            manifest_sha256: manifestSha256,
            bundle_sha256: bundleSha256,
            section_hashes: sectionHashes,
            record_counts: counts,
            created_at: generatedAt,
            updated_at: generatedAt,
        };
        await this.store.upsertComplianceAuditExport(record);
        return {
            audit_export: record,
            export_bundle: exportBundle,
        };
    }
}
