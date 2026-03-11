import { setGauge } from '../metricsCollector.js';
import type {
    AgentKernelAlertRecord,
    AgentKernelAlertSeverity,
    AgentKernelCorrelationContext,
    AgentKernelDegradedModeSummary,
    AgentKernelPilotConnectorSummary,
    AgentKernelPilotObservabilitySummary,
    AgentKernelPilotTaskSummary,
    AgentKernelRunbookReference,
    AgentKernelSloStatus,
    AgentKernelSloSummary,
    AgentKernelStructuredLogRecord,
    AgentKernelTaskObservabilitySummary,
    AgentKernelTraceSpan,
    TaskSnapshot,
    TaskState,
    WebhookDeliveryRecord,
} from './contracts.js';
import type { TaskStore } from './store.js';
import { hashText } from './utils.js';

const ONCALL_RUNBOOK: AgentKernelRunbookReference = {
    runbook_id: 'AK-RUNBOOK-ONCALL',
    title: 'Agent Kernel Pilot On-Call Runbook',
    path: 'docs/agent-kernel-oncall-runbook.md',
    trigger_codes: [
        'TASK_FAILED',
        'SERVICE_AUTH_DENIED',
        'PROJECTION_REBUILD_REQUIRED',
    ],
};

const DEGRADED_MODE_RUNBOOK: AgentKernelRunbookReference = {
    runbook_id: 'AK-RUNBOOK-DEGRADED',
    title: 'Agent Kernel Degraded Mode Recovery Playbook',
    path: 'docs/agent-kernel-degraded-mode-recovery-playbook.md',
    trigger_codes: [
        'DEAD_LETTER_OPEN',
        'STALE_CLAIM_ACTIVE',
        'CONNECTOR_HEALTH_DEGRADED',
    ],
};

const CONNECTOR_INCIDENT_RUNBOOK: AgentKernelRunbookReference = {
    runbook_id: 'AK-RUNBOOK-CONNECTOR',
    title: 'Agent Kernel Connector Incident Playbook',
    path: 'docs/agent-kernel-degraded-mode-recovery-playbook.md',
    trigger_codes: [
        'CONNECTOR_HEALTH_DEGRADED',
        'CONNECTOR_DELIVERY_DEGRADED',
    ],
};

const RUNBOOKS = [
    ONCALL_RUNBOOK,
    DEGRADED_MODE_RUNBOOK,
    CONNECTOR_INCIDENT_RUNBOOK,
];

export interface AgentKernelObservabilityServiceOptions {
    now?: () => number;
}

function currentTime(): number {
    return Date.now();
}

function fallbackCorrelation(taskState: TaskState): AgentKernelCorrelationContext {
    const createdAt = taskState.created_at;
    return {
        trace_id: `trace_${hashText(`${taskState.task_id}:trace:${createdAt}`).slice(0, 16)}`,
        correlation_id: `corr_${hashText(`${taskState.task_id}:corr:${createdAt}`).slice(0, 16)}`,
        current_run_id: `run_${hashText(`${taskState.task_id}:run:0:${createdAt}`).slice(0, 16)}`,
        run_sequence: 0,
        created_at: createdAt,
        last_run_started_at: createdAt,
    };
}

function createSpanId(taskId: string, correlationId: string, suffix: string): string {
    return `span_${hashText(`${taskId}:${correlationId}:${suffix}`).slice(0, 16)}`;
}

function createLogId(taskId: string, occurredAt: number, suffix: string): string {
    return `log_${hashText(`${taskId}:${occurredAt}:${suffix}`).slice(0, 16)}`;
}

function createAlertId(taskId: string, code: string, occurredAt: number): string {
    return `alert_${hashText(`${taskId}:${code}:${occurredAt}`).slice(0, 16)}`;
}

function taskStatusSeverity(summary: TaskSnapshot): AgentKernelAlertSeverity {
    return summary.task_state.status === 'FAILED' ? 'SEV2' : 'SEV3';
}

function uniqueRunbooks(input: AgentKernelRunbookReference[]): AgentKernelRunbookReference[] {
    const seen = new Set<string>();
    return input.filter((item) => {
        if (seen.has(item.runbook_id)) return false;
        seen.add(item.runbook_id);
        return true;
    });
}

function alertStatusFromThreshold(params: {
    measured: number;
    target: number;
    comparator: 'LTE' | 'GTE';
    riskyThreshold?: number;
}): AgentKernelSloStatus {
    if (params.comparator === 'LTE') {
        if (params.measured <= params.target) return 'HEALTHY';
        if (params.riskyThreshold !== undefined && params.measured <= params.riskyThreshold) return 'AT_RISK';
        return 'BREACHED';
    }
    if (params.measured >= params.target) return 'HEALTHY';
    if (params.riskyThreshold !== undefined && params.measured >= params.riskyThreshold) return 'AT_RISK';
    return 'BREACHED';
}

export class AgentKernelObservabilityService {
    private readonly now: () => number;

    constructor(
        private readonly store: TaskStore,
        options?: AgentKernelObservabilityServiceOptions,
    ) {
        this.now = options?.now || currentTime;
    }

    private async deliveriesForTask(snapshot: TaskSnapshot): Promise<WebhookDeliveryRecord[]> {
        const correlation = snapshot.task_state.correlation?.correlation_id;
        const deliveries = await this.store.listWebhookDeliveries();
        return deliveries
            .filter((delivery) =>
                delivery.task_id === snapshot.task_state.task_id
                || (correlation ? delivery.correlation_id === correlation : false)
            )
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, 10);
    }

    private taskAlerts(input: {
        snapshot: TaskSnapshot;
        deliveries: WebhookDeliveryRecord[];
    }): AgentKernelAlertRecord[] {
        const correlation = input.snapshot.task_state.correlation || fallbackCorrelation(input.snapshot.task_state);
        const alerts: AgentKernelAlertRecord[] = [];
        const substrate = input.snapshot.execution_substrate;
        const ledger = input.snapshot.execution_ledger;
        const deniedServiceAuthCount = input.snapshot.execution_ledger?.projection?.denied_service_auth_count || 0;

        if (ledger?.compatibility?.state === 'REQUIRES_REBUILD') {
            alerts.push({
                alert_id: createAlertId(input.snapshot.task_state.task_id, 'PROJECTION_REBUILD_REQUIRED', this.now()),
                code: 'PROJECTION_REBUILD_REQUIRED',
                severity: 'SEV1',
                status: 'OPEN',
                scope: 'TASK',
                task_id: input.snapshot.task_state.task_id,
                correlation_id: correlation.correlation_id,
                run_id: correlation.current_run_id,
                summary: 'Projection rebuild required before task query state can be trusted.',
                detail: ledger.compatibility.reason,
                triggered_at: this.now(),
                runbook: ONCALL_RUNBOOK,
            });
        }

        if ((substrate?.dead_letter_count || 0) > 0) {
            alerts.push({
                alert_id: createAlertId(input.snapshot.task_state.task_id, 'DEAD_LETTER_OPEN', substrate?.last_dead_letter_at || this.now()),
                code: 'DEAD_LETTER_OPEN',
                severity: 'SEV2',
                status: 'OPEN',
                scope: 'TASK',
                task_id: input.snapshot.task_state.task_id,
                correlation_id: correlation.correlation_id,
                run_id: correlation.current_run_id,
                summary: 'Task has an open dead-lettered execution unit.',
                detail: `dead_letter_count=${substrate?.dead_letter_count || 0}`,
                triggered_at: substrate?.last_dead_letter_at || this.now(),
                runbook: DEGRADED_MODE_RUNBOOK,
            });
        }

        if ((substrate?.worker_summary?.stale_claim_count || 0) > 0) {
            alerts.push({
                alert_id: createAlertId(input.snapshot.task_state.task_id, 'STALE_CLAIM_ACTIVE', substrate?.worker_summary?.last_timed_out_at || this.now()),
                code: 'STALE_CLAIM_ACTIVE',
                severity: 'SEV2',
                status: 'OPEN',
                scope: 'TASK',
                task_id: input.snapshot.task_state.task_id,
                correlation_id: correlation.correlation_id,
                run_id: correlation.current_run_id,
                summary: 'A task execution claim is stale and requires recovery.',
                detail: `stale_claim_count=${substrate?.worker_summary?.stale_claim_count || 0}`,
                triggered_at: substrate?.worker_summary?.last_timed_out_at || this.now(),
                runbook: DEGRADED_MODE_RUNBOOK,
            });
        }

        if (deniedServiceAuthCount > 0) {
            alerts.push({
                alert_id: createAlertId(input.snapshot.task_state.task_id, 'SERVICE_AUTH_DENIED', this.now()),
                code: 'SERVICE_AUTH_DENIED',
                severity: 'SEV2',
                status: 'OPEN',
                scope: 'TASK',
                task_id: input.snapshot.task_state.task_id,
                correlation_id: correlation.correlation_id,
                run_id: correlation.current_run_id,
                summary: 'A service-side control-plane action was denied.',
                detail: `denied_service_auth_count=${deniedServiceAuthCount}`,
                triggered_at: this.now(),
                runbook: ONCALL_RUNBOOK,
            });
        }

        if (input.deliveries.some((delivery) =>
            delivery.status === 'FAILED'
            || delivery.status === 'TIMED_OUT'
            || delivery.status === 'DEAD_LETTERED'
            || delivery.status === 'BLOCKED_CREDENTIAL'
        )) {
            const lastFailedDelivery = input.deliveries.find((delivery) =>
                delivery.status === 'FAILED'
                || delivery.status === 'TIMED_OUT'
                || delivery.status === 'DEAD_LETTERED'
                || delivery.status === 'BLOCKED_CREDENTIAL'
            );
            alerts.push({
                alert_id: createAlertId(input.snapshot.task_state.task_id, 'CONNECTOR_HEALTH_DEGRADED', lastFailedDelivery?.created_at || this.now()),
                code: 'CONNECTOR_HEALTH_DEGRADED',
                severity: 'SEV2',
                status: 'OPEN',
                scope: 'CONNECTOR',
                task_id: input.snapshot.task_state.task_id,
                connector_id: lastFailedDelivery?.connector_id,
                correlation_id: correlation.correlation_id,
                run_id: correlation.current_run_id,
                summary: 'A connector delivery degraded during the current task correlation window.',
                detail: `last_delivery_status=${lastFailedDelivery?.status || 'UNKNOWN'}`,
                triggered_at: lastFailedDelivery?.created_at || this.now(),
                runbook: CONNECTOR_INCIDENT_RUNBOOK,
            });
        }

        if (input.snapshot.task_state.status === 'FAILED') {
            alerts.push({
                alert_id: createAlertId(input.snapshot.task_state.task_id, 'TASK_FAILED', input.snapshot.task_state.updated_at),
                code: 'TASK_FAILED',
                severity: taskStatusSeverity(input.snapshot),
                status: 'OPEN',
                scope: 'TASK',
                task_id: input.snapshot.task_state.task_id,
                correlation_id: correlation.correlation_id,
                run_id: correlation.current_run_id,
                summary: 'Task ended in a failed state.',
                detail: `task_status=${input.snapshot.task_state.status}`,
                triggered_at: input.snapshot.task_state.updated_at,
                runbook: ONCALL_RUNBOOK,
            });
        }

        return alerts.sort((a, b) => b.triggered_at - a.triggered_at);
    }

    private taskSpans(input: {
        snapshot: TaskSnapshot;
        deliveries: WebhookDeliveryRecord[];
    }): AgentKernelTraceSpan[] {
        const correlation = input.snapshot.task_state.correlation || fallbackCorrelation(input.snapshot.task_state);
        const rootSpanId = createSpanId(
            input.snapshot.task_state.task_id,
            correlation.correlation_id,
            `${correlation.current_run_id}:root`,
        );
        const spans: AgentKernelTraceSpan[] = [{
            span_id: rootSpanId,
            correlation_id: correlation.correlation_id,
            run_id: correlation.current_run_id,
            task_id: input.snapshot.task_state.task_id,
            component: 'RUNTIME',
            span_type: 'TASK_RUN',
            status: input.snapshot.task_state.status === 'FAILED'
                ? 'FAILED'
                : input.snapshot.task_state.status === 'WAITING_USER'
                    ? 'DEGRADED'
                    : 'SUCCEEDED',
            started_at: correlation.last_run_started_at || input.snapshot.task_state.created_at,
            ended_at: correlation.last_run_completed_at,
            attributes: {
                task_status: input.snapshot.task_state.status,
                run_sequence: correlation.run_sequence,
            },
        }];

        for (const nodeState of input.snapshot.node_states) {
            if (!nodeState.started_at && !nodeState.ended_at) continue;
            const spanId = nodeState.trace?.span_id || createSpanId(
                input.snapshot.task_state.task_id,
                correlation.correlation_id,
                `${correlation.current_run_id}:node:${nodeState.node_id}:${nodeState.attempt}`,
            );
            spans.push({
                span_id: spanId,
                parent_span_id: rootSpanId,
                correlation_id: nodeState.trace?.correlation_id || correlation.correlation_id,
                run_id: nodeState.trace?.run_id || correlation.current_run_id,
                task_id: input.snapshot.task_state.task_id,
                node_id: nodeState.node_id,
                component: 'RUNTIME',
                span_type: 'NODE_EXECUTION',
                status: nodeState.status === 'FAILED'
                    ? 'FAILED'
                    : nodeState.status === 'WAITING_USER'
                        ? 'DEGRADED'
                        : nodeState.status === 'RUNNING'
                            ? 'ACTIVE'
                            : 'SUCCEEDED',
                started_at: nodeState.started_at || nodeState.ended_at || input.snapshot.task_state.created_at,
                ended_at: nodeState.ended_at,
                attributes: {
                    attempt: nodeState.attempt,
                    node_status: nodeState.status,
                },
            });
        }

        for (const claim of input.snapshot.execution_substrate?.worker_summary?.claim_history || []) {
            spans.push({
                span_id: createSpanId(
                    input.snapshot.task_state.task_id,
                    claim.correlation_id || correlation.correlation_id,
                    `claim:${claim.claim_id}`,
                ),
                parent_span_id: rootSpanId,
                correlation_id: claim.correlation_id || correlation.correlation_id,
                run_id: claim.run_id || correlation.current_run_id,
                task_id: input.snapshot.task_state.task_id,
                node_id: claim.node_id,
                component: 'WORKER',
                span_type: 'CLAIM_LEASE',
                status: claim.status === 'ACTIVE'
                    ? 'ACTIVE'
                    : claim.status === 'EXPIRED'
                        ? 'DEGRADED'
                        : 'SUCCEEDED',
                started_at: claim.claimed_at,
                ended_at: claim.released_at,
                attributes: {
                    claim_id: claim.claim_id,
                    execution_mode: claim.execution_mode,
                    runner_type: claim.runner_type,
                    claim_status: claim.status,
                    release_reason: claim.release_reason,
                },
            });
            if (claim.remote_request_id || claim.remote_result_status) {
                spans.push({
                    span_id: createSpanId(
                        input.snapshot.task_state.task_id,
                        claim.correlation_id || correlation.correlation_id,
                        `remote:${claim.remote_request_id || claim.claim_id}`,
                    ),
                    parent_span_id: rootSpanId,
                    correlation_id: claim.correlation_id || correlation.correlation_id,
                    run_id: claim.run_id || correlation.current_run_id,
                    task_id: input.snapshot.task_state.task_id,
                    node_id: claim.node_id,
                    component: 'CONTROL_PLANE',
                    span_type: 'CONTROL_PLANE_ACTION',
                    status: claim.remote_result_status === 'LOCAL_FALLBACK'
                        ? 'DEGRADED'
                        : claim.remote_result_status === 'REJECTED'
                            ? 'FAILED'
                            : 'SUCCEEDED',
                    started_at: claim.claimed_at,
                    ended_at: claim.updated_at,
                    attributes: {
                        request_id: claim.remote_request_id,
                        remote_result_status: claim.remote_result_status,
                        detail: claim.remote_result_detail,
                    },
                });
            }
        }

        for (const delivery of input.deliveries) {
            spans.push({
                span_id: createSpanId(
                    input.snapshot.task_state.task_id,
                    delivery.correlation_id || correlation.correlation_id,
                    `delivery:${delivery.delivery_id}`,
                ),
                parent_span_id: rootSpanId,
                correlation_id: delivery.correlation_id || correlation.correlation_id,
                run_id: delivery.run_id || correlation.current_run_id,
                task_id: input.snapshot.task_state.task_id,
                component: 'CONNECTOR',
                span_type: 'CONNECTOR_DELIVERY',
                status: delivery.status === 'DELIVERED'
                    ? 'SUCCEEDED'
                    : delivery.status === 'DEAD_LETTERED'
                        ? 'FAILED'
                        : 'DEGRADED',
                started_at: delivery.created_at,
                ended_at: delivery.updated_at,
                attributes: {
                    connector_id: delivery.connector_id,
                    adapter_id: delivery.adapter_id,
                    delivery_status: delivery.status,
                    http_status: delivery.http_status,
                },
            });
        }

        return spans.sort((a, b) => b.started_at - a.started_at).slice(0, 20);
    }

    private taskStructuredLogs(input: {
        snapshot: TaskSnapshot;
        deliveries: WebhookDeliveryRecord[];
        alerts: AgentKernelAlertRecord[];
    }): AgentKernelStructuredLogRecord[] {
        const correlation = input.snapshot.task_state.correlation || fallbackCorrelation(input.snapshot.task_state);
        const logs: AgentKernelStructuredLogRecord[] = [];

        for (const nodeState of input.snapshot.node_states) {
            const occurredAt = nodeState.ended_at || nodeState.started_at;
            if (!occurredAt) continue;
            logs.push({
                log_id: createLogId(input.snapshot.task_state.task_id, occurredAt, `node:${nodeState.node_id}`),
                correlation_id: nodeState.trace?.correlation_id || correlation.correlation_id,
                run_id: nodeState.trace?.run_id || correlation.current_run_id,
                span_id: nodeState.trace?.span_id,
                task_id: input.snapshot.task_state.task_id,
                node_id: nodeState.node_id,
                component: 'RUNTIME',
                level: nodeState.status === 'FAILED' ? 'ERROR' : nodeState.status === 'WAITING_USER' ? 'WARN' : 'INFO',
                message: `Node ${nodeState.node_id} ${nodeState.status.toLowerCase()}.`,
                event_type: `node.${nodeState.status.toLowerCase()}`,
                occurred_at: occurredAt,
                attributes: {
                    attempt: nodeState.attempt,
                    error_code: nodeState.error?.code,
                    error_message: nodeState.error?.message,
                },
            });
        }

        for (const claim of input.snapshot.execution_substrate?.worker_summary?.claim_history || []) {
            const occurredAt = claim.released_at || claim.updated_at;
            logs.push({
                log_id: createLogId(input.snapshot.task_state.task_id, occurredAt, `claim:${claim.claim_id}`),
                correlation_id: claim.correlation_id || correlation.correlation_id,
                run_id: claim.run_id || correlation.current_run_id,
                task_id: input.snapshot.task_state.task_id,
                node_id: claim.node_id,
                component: claim.remote_request_id ? 'CONTROL_PLANE' : 'WORKER',
                level: claim.status === 'EXPIRED' ? 'WARN' : 'INFO',
                message: `Claim ${claim.claim_id} ${claim.status.toLowerCase()}.`,
                event_type: `claim.${claim.status.toLowerCase()}`,
                occurred_at: occurredAt,
                attributes: {
                    release_reason: claim.release_reason,
                    execution_mode: claim.execution_mode,
                    runner_type: claim.runner_type,
                    remote_result_status: claim.remote_result_status,
                },
            });
        }

        for (const delivery of input.deliveries) {
            logs.push({
                log_id: createLogId(input.snapshot.task_state.task_id, delivery.created_at, `delivery:${delivery.delivery_id}`),
                correlation_id: delivery.correlation_id || correlation.correlation_id,
                run_id: delivery.run_id || correlation.current_run_id,
                task_id: input.snapshot.task_state.task_id,
                component: 'CONNECTOR',
                level: delivery.status === 'DELIVERED' ? 'INFO' : delivery.status === 'RATE_LIMITED' ? 'WARN' : 'ERROR',
                message: `Connector delivery ${delivery.status.toLowerCase()}.`,
                event_type: `connector.${delivery.status.toLowerCase()}`,
                occurred_at: delivery.created_at,
                attributes: {
                    connector_id: delivery.connector_id,
                    adapter_id: delivery.adapter_id,
                    http_status: delivery.http_status,
                    request_id: delivery.request_id,
                },
            });
        }

        for (const alert of input.alerts) {
            logs.push({
                log_id: createLogId(input.snapshot.task_state.task_id, alert.triggered_at, `alert:${alert.code}`),
                correlation_id: alert.correlation_id || correlation.correlation_id,
                run_id: alert.run_id || correlation.current_run_id,
                task_id: input.snapshot.task_state.task_id,
                component: alert.scope === 'CONNECTOR' ? 'CONNECTOR' : 'LEDGER',
                level: alert.severity === 'SEV1' ? 'ERROR' : 'WARN',
                message: alert.summary,
                event_type: `alert.${alert.code.toLowerCase()}`,
                occurred_at: alert.triggered_at,
                attributes: {
                    severity: alert.severity,
                    detail: alert.detail,
                },
            });
        }

        return logs.sort((a, b) => b.occurred_at - a.occurred_at).slice(0, 24);
    }

    private taskSlo(input: {
        snapshot: TaskSnapshot;
        deliveries: WebhookDeliveryRecord[];
        alerts: AgentKernelAlertRecord[];
    }): AgentKernelSloSummary[] {
        const deadLetterCount = input.snapshot.execution_substrate?.dead_letter_count || 0;
        const deniedServiceAuthCount = input.snapshot.execution_ledger?.projection?.denied_service_auth_count || 0;
        const projectionLag = input.snapshot.execution_ledger?.projection?.lag?.lag_records || 0;
        const connectorDeliveries = input.deliveries.filter((delivery) => delivery.status !== 'DEAD_LETTERED');
        const connectorSuccessRate = connectorDeliveries.length === 0
            ? 1
            : connectorDeliveries.filter((delivery) => delivery.status === 'DELIVERED').length / connectorDeliveries.length;

        return [
            {
                scope: 'TASK',
                name: 'dead_letter_budget',
                objective: 'Task should have zero open dead letters.',
                target: 0,
                measured: deadLetterCount,
                comparator: 'LTE',
                window: 'task_lifetime',
                status: alertStatusFromThreshold({
                    measured: deadLetterCount,
                    target: 0,
                    comparator: 'LTE',
                }),
            },
            {
                scope: 'TASK',
                name: 'service_auth_denials',
                objective: 'Task should not experience denied service auth actions.',
                target: 0,
                measured: deniedServiceAuthCount,
                comparator: 'LTE',
                window: 'task_lifetime',
                status: alertStatusFromThreshold({
                    measured: deniedServiceAuthCount,
                    target: 0,
                    comparator: 'LTE',
                }),
            },
            {
                scope: 'TASK',
                name: 'projection_lag_records',
                objective: 'Task projection should remain fully caught up with the ledger.',
                target: 0,
                measured: projectionLag,
                comparator: 'LTE',
                window: 'current_snapshot',
                status: alertStatusFromThreshold({
                    measured: projectionLag,
                    target: 0,
                    comparator: 'LTE',
                    riskyThreshold: 1,
                }),
            },
            {
                scope: 'CONNECTOR',
                name: 'connector_success_rate',
                objective: 'Connector deliveries should succeed at or above 95%.',
                target: 0.95,
                measured: connectorSuccessRate,
                comparator: 'GTE',
                window: 'task_correlation_window',
                status: alertStatusFromThreshold({
                    measured: connectorSuccessRate,
                    target: 0.95,
                    comparator: 'GTE',
                    riskyThreshold: 0.8,
                }),
            },
            {
                scope: 'TASK',
                name: 'open_alerts',
                objective: 'Tasks should resolve with no open alerts.',
                target: 0,
                measured: input.alerts.length,
                comparator: 'LTE',
                window: 'current_snapshot',
                status: alertStatusFromThreshold({
                    measured: input.alerts.length,
                    target: 0,
                    comparator: 'LTE',
                }),
            },
        ];
    }

    private taskDegradedMode(alerts: AgentKernelAlertRecord[]): AgentKernelDegradedModeSummary {
        const reasonCodes = alerts.map((alert) => alert.code);
        return {
            active: reasonCodes.length > 0,
            reason_codes: reasonCodes,
            last_degraded_at: alerts[0]?.triggered_at,
            recovery_runbooks: uniqueRunbooks(alerts.map((alert) => alert.runbook)),
        };
    }

    private syncTaskMetrics(summary: AgentKernelTaskObservabilitySummary): void {
        setGauge(
            'agent_kernel_task_open_alerts',
            summary.metrics.open_alert_count,
            { task_id: summary.task_id },
            'Open agent-kernel observability alerts per task',
        );
        setGauge(
            'agent_kernel_task_degraded_mode',
            summary.degraded_mode.active ? 1 : 0,
            { task_id: summary.task_id },
            'Whether a task is currently in degraded mode',
        );
        setGauge(
            'agent_kernel_task_dead_letters_open',
            summary.metrics.dead_letter_count,
            { task_id: summary.task_id },
            'Open dead letters per task',
        );
        setGauge(
            'agent_kernel_task_stale_claims',
            summary.metrics.stale_claim_count,
            { task_id: summary.task_id },
            'Stale worker claims per task',
        );
        setGauge(
            'agent_kernel_task_service_auth_denied',
            summary.metrics.denied_service_auth_count,
            { task_id: summary.task_id },
            'Denied service-auth actions per task',
        );
        setGauge(
            'agent_kernel_task_local_fallbacks',
            summary.metrics.local_fallback_count,
            { task_id: summary.task_id },
            'Local fallback count per task',
        );
        setGauge(
            'agent_kernel_task_projection_rebuild_required',
            summary.alerts.some((alert) => alert.code === 'PROJECTION_REBUILD_REQUIRED') ? 1 : 0,
            { task_id: summary.task_id },
            'Whether a task projection rebuild is currently required',
        );
    }

    async summarizeTask(snapshot: TaskSnapshot): Promise<AgentKernelTaskObservabilitySummary> {
        const correlation = snapshot.task_state.correlation || fallbackCorrelation(snapshot.task_state);
        const deliveries = await this.deliveriesForTask(snapshot);
        const alerts = this.taskAlerts({ snapshot, deliveries });
        const degradedMode = this.taskDegradedMode(alerts);
        const connectorFailureCount = deliveries.filter((delivery) => delivery.status !== 'DELIVERED').length;
        const summary: AgentKernelTaskObservabilitySummary = {
            task_id: snapshot.task_state.task_id,
            task_status: snapshot.task_state.status,
            correlation,
            tracing: {
                root_span_id: createSpanId(snapshot.task_state.task_id, correlation.correlation_id, `${correlation.current_run_id}:root`),
                spans: this.taskSpans({ snapshot, deliveries }),
            },
            structured_logs: this.taskStructuredLogs({ snapshot, deliveries, alerts }),
            alerts,
            slo: this.taskSlo({ snapshot, deliveries, alerts }),
            degraded_mode: degradedMode,
            metrics: {
                open_alert_count: alerts.length,
                dead_letter_count: snapshot.execution_substrate?.dead_letter_count || 0,
                stale_claim_count: snapshot.execution_substrate?.worker_summary?.stale_claim_count || 0,
                denied_service_auth_count: snapshot.execution_ledger?.projection?.denied_service_auth_count || 0,
                local_fallback_count: snapshot.execution_substrate?.worker_summary?.local_fallback_count || 0,
                connector_failure_count: connectorFailureCount,
            },
            runbooks: uniqueRunbooks([...RUNBOOKS, ...degradedMode.recovery_runbooks]),
        };

        this.syncTaskMetrics(summary);
        return summary;
    }

    private async connectorSummaries(): Promise<{
        summaries: AgentKernelPilotConnectorSummary[];
        alerts: AgentKernelAlertRecord[];
    }> {
        const deliveries = await this.store.listWebhookDeliveries();
        const credentials = await this.store.listVaultCredentials();
        const byConnector = new Map<string, WebhookDeliveryRecord[]>();
        const alerts: AgentKernelAlertRecord[] = [];

        for (const delivery of deliveries) {
            const key = `${delivery.connector_id}:${delivery.adapter_id || ''}`;
            const list = byConnector.get(key) || [];
            list.push(delivery);
            byConnector.set(key, list);
        }

        const summaries: AgentKernelPilotConnectorSummary[] = [];
        for (const [key, list] of byConnector.entries()) {
            const [connectorId, adapterId] = key.split(':');
            const sorted = [...list].sort((a, b) => b.created_at - a.created_at);
            const latest = sorted[0];
            const deadLetterCount = sorted.filter((delivery) => delivery.status === 'DEAD_LETTERED').length;
            const recentFailureCount = sorted.filter((delivery) =>
                delivery.status === 'FAILED'
                || delivery.status === 'TIMED_OUT'
                || delivery.status === 'BLOCKED_CREDENTIAL'
            ).length;
            const credential = credentials.find((record) => record.connector_id === connectorId);
            const status = credential?.status === 'REVOKED'
                || credential?.status === 'COMPROMISED'
                || credential?.compromise_status === 'CONFIRMED'
                ? 'UNHEALTHY'
                : deadLetterCount > 0 || recentFailureCount > 0
                    ? 'DEGRADED'
                    : 'HEALTHY';
            const openAlertCount = status === 'HEALTHY' ? 0 : 1;

            summaries.push({
                connector_id: connectorId,
                adapter_id: adapterId || undefined,
                status,
                open_alert_count: openAlertCount,
                recent_failure_count: recentFailureCount,
                dead_letter_count: deadLetterCount,
                last_delivery_status: latest?.status,
                last_delivery_at: latest?.created_at,
                last_correlation_id: latest?.correlation_id,
            });

            setGauge(
                'agent_kernel_connector_open_alerts',
                openAlertCount,
                { connector_id: connectorId, adapter_id: adapterId || 'unknown' },
                'Open connector observability alerts by connector adapter',
            );
            setGauge(
                'agent_kernel_connector_degraded',
                status === 'HEALTHY' ? 0 : 1,
                { connector_id: connectorId, adapter_id: adapterId || 'unknown' },
                'Whether a connector adapter is degraded',
            );

            if (status !== 'HEALTHY') {
                alerts.push({
                    alert_id: createAlertId(connectorId, 'CONNECTOR_DELIVERY_DEGRADED', latest?.created_at || this.now()),
                    code: 'CONNECTOR_DELIVERY_DEGRADED',
                    severity: status === 'UNHEALTHY' ? 'SEV1' : 'SEV2',
                    status: 'OPEN',
                    scope: 'CONNECTOR',
                    connector_id: connectorId,
                    correlation_id: latest?.correlation_id,
                    run_id: latest?.run_id,
                    summary: 'Connector delivery health is degraded.',
                    detail: `status=${status}, recent_failure_count=${recentFailureCount}, dead_letter_count=${deadLetterCount}`,
                    triggered_at: latest?.created_at || this.now(),
                    runbook: CONNECTOR_INCIDENT_RUNBOOK,
                });
            }
        }

        return {
            summaries: summaries.sort((a, b) => (b.last_delivery_at || 0) - (a.last_delivery_at || 0)),
            alerts: alerts.sort((a, b) => b.triggered_at - a.triggered_at),
        };
    }

    async summarizePilot(taskSnapshots: TaskSnapshot[]): Promise<AgentKernelPilotObservabilitySummary> {
        const taskSummaries = await Promise.all(taskSnapshots.map((snapshot) => this.summarizeTask(snapshot)));
        const connector = await this.connectorSummaries();
        const alerts = [...taskSummaries.flatMap((summary) => summary.alerts), ...connector.alerts]
            .sort((a, b) => b.triggered_at - a.triggered_at)
            .slice(0, 50);
        const deliveries = await this.store.listWebhookDeliveries();
        const deliveryWindow = deliveries.filter((delivery) => delivery.created_at >= (this.now() - 86_400_000));
        const authAllowed = taskSummaries.reduce(
            (sum, summary) => sum + (summary.metrics.denied_service_auth_count === 0 ? 1 : 0),
            0,
        );
        const authDenied = taskSummaries.reduce(
            (sum, summary) => sum + summary.metrics.denied_service_auth_count,
            0,
        );
        const taskFailureRate = taskSummaries.length === 0
            ? 0
            : taskSummaries.filter((summary) => summary.task_status === 'FAILED').length / taskSummaries.length;
        const connectorSuccessRate = deliveryWindow.length === 0
            ? 1
            : deliveryWindow.filter((delivery) => delivery.status === 'DELIVERED').length / deliveryWindow.length;
        const authDenialRate = (authAllowed + authDenied) === 0
            ? 0
            : authDenied / (authAllowed + authDenied);

        return {
            generated_at: this.now(),
            alerts,
            slo: [
                {
                    scope: 'PLATFORM',
                    name: 'task_failure_rate',
                    objective: 'Task failure rate should stay at or below 5%.',
                    target: 0.05,
                    measured: taskFailureRate,
                    comparator: 'LTE',
                    window: 'pilot_lifetime',
                    status: alertStatusFromThreshold({
                        measured: taskFailureRate,
                        target: 0.05,
                        comparator: 'LTE',
                        riskyThreshold: 0.1,
                    }),
                },
                {
                    scope: 'CONNECTOR',
                    name: 'connector_delivery_success_rate',
                    objective: 'Connector delivery success rate should stay at or above 99% over 24h.',
                    target: 0.99,
                    measured: connectorSuccessRate,
                    comparator: 'GTE',
                    window: 'last_24h',
                    status: alertStatusFromThreshold({
                        measured: connectorSuccessRate,
                        target: 0.99,
                        comparator: 'GTE',
                        riskyThreshold: 0.95,
                    }),
                },
                {
                    scope: 'PLATFORM',
                    name: 'service_auth_denial_rate',
                    objective: 'Service auth denial rate should stay at or below 1%.',
                    target: 0.01,
                    measured: authDenialRate,
                    comparator: 'LTE',
                    window: 'pilot_lifetime',
                    status: alertStatusFromThreshold({
                        measured: authDenialRate,
                        target: 0.01,
                        comparator: 'LTE',
                        riskyThreshold: 0.05,
                    }),
                },
            ],
            task_summaries: taskSummaries.map<AgentKernelPilotTaskSummary>((summary) => ({
                task_id: summary.task_id,
                task_status: summary.task_status,
                correlation_id: summary.correlation.correlation_id,
                run_id: summary.correlation.current_run_id,
                degraded_mode_active: summary.degraded_mode.active,
                open_alert_count: summary.metrics.open_alert_count,
                dead_letter_count: summary.metrics.dead_letter_count,
                stale_claim_count: summary.metrics.stale_claim_count,
                denied_service_auth_count: summary.metrics.denied_service_auth_count,
                local_fallback_count: summary.metrics.local_fallback_count,
                updated_at: taskSnapshots.find((snapshot) => snapshot.task_state.task_id === summary.task_id)?.task_state.updated_at || 0,
            })),
            connector_summaries: connector.summaries,
            runbooks: RUNBOOKS,
            on_call: {
                tier: 'PILOT_PRIMARY',
                primary_responsibility: 'Platform on-call monitors agent-kernel task, connector, and control-plane degradations.',
                escalation_policy: 'Escalate to tenant admin for business impact and to platform engineering for substrate, auth, or connector incidents.',
                runbook_ids: RUNBOOKS.map((item) => item.runbook_id),
            },
        };
    }
}
