import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTaskStore } from '../services/agent-kernel/storeAdapters.js';
import type { TaskGraph } from '../services/agent-kernel/contracts.js';
import { applyExecutionLedgerRecord, createEmptyTaskProjection, TASK_QUERY_PROJECTION_NAME } from '../services/agent-kernel/ledger.js';

const pgTasks = new Map<string, { graph: any; taskState: any; policyIds: any; updatedAt: number }>();
const pgNodes = new Map<string, Map<string, { nodeState: any; status: string; updatedAt: number }>>();
const pgIdempotency = new Map<string, { entry: any; updatedAt: number }>();
const pgRetryJobs = new Map<string, { retryJob: any; taskId: string; status: string; availableAt: number; updatedAt: number }>();
const pgDeadLetters = new Map<string, { deadLetter: any; taskId: string; status: string; updatedAt: number }>();
const pgExecutionUnits = new Map<string, { executionUnit: any; taskId: string; status: string; availableAt: number; updatedAt: number }>();
const pgExecutionClaims = new Map<string, { claim: any; taskId: string; status: string; leaseExpiresAt: number; updatedAt: number }>();
const pgWorkerSessions = new Map<string, { session: any; taskId: string; status: string; updatedAt: number }>();
const pgEnterprisePrincipals = new Map<string, { principal: any; tenantId: string; status: string; updatedAt: number }>();
const pgEnterpriseAccessBindings = new Map<string, { binding: any; principalId: string; status: string; updatedAt: number }>();
const pgEnterpriseIdentitySessions = new Map<string, { session: any; principalId: string; status: string; expiresAt: number; updatedAt: number }>();
const pgOidcLoginStates = new Map<string, { state: any; tenantId: string; status: string; expiresAt: number; updatedAt: number }>();
const pgVaultCredentials = new Map<string, { record: any; connectorId: string; status: string; compromiseStatus: string; updatedAt: number }>();
const pgWebhookDeliveries = new Map<string, { record: any; connectorId: string; status: string; createdAt: number; updatedAt: number }>();
const pgComplianceDeletionRequests = new Map<string, { record: any; taskId: string; status: string; createdAt: number; updatedAt: number }>();
const pgComplianceAuditExports = new Map<string, { record: any; taskId: string; status: string; createdAt: number; updatedAt: number }>();
const pgPilotActivationPackages = new Map<string, { record: any; workspaceKey: string; status: string; updatedAt: number }>();
const pgPilotEnvironmentBindings = new Map<string, { record: any; workspaceKey: string; state: string; updatedAt: number }>();
const pgPilotActorReadiness = new Map<string, { record: any; workspaceKey: string; role: string; updatedAt: number }>();
const pgPilotConnectorActivation = new Map<string, { record: any; workspaceKey: string; connectorId: string; state: string; updatedAt: number }>();
const pgPilotExternalArtifactIntakes = new Map<string, { record: any; workspaceKey: string; status: string; updatedAt: number }>();
const pgPilotEvidenceArtifacts = new Map<string, { record: any; workspaceKey: string; category: string; updatedAt: number }>();
const pgLedgerRecords = new Map<string, { record: any; taskId: string; sequence: number; updatedAt: number }>();
const pgTaskProjections = new Map<string, { projection: any; taskId: string; projectionName: string; lastSequence: number; updatedAt: number }>();
const pgProjectionCheckpoints = new Map<string, { checkpoint: any; taskId: string; projectionName: string; lastSequence: number; updatedAt: number }>();
const pgLedgerCompactionHints = new Map<string, { hint: any; taskId: string; projectionName: string; upToSequence: number; updatedAt: number }>();

const redisStrings = new Map<string, string>();
const redisSets = new Map<string, Set<string>>();

function normalizeSql(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim().toUpperCase();
}

vi.mock('pg', () => {
    class MockPool {
        async query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
            const normalized = normalizeSql(sql);

            if (normalized.startsWith('BEGIN') || normalized.startsWith('COMMIT') || normalized.startsWith('ROLLBACK')) {
                return { rows: [] };
            }

            if (normalized.includes('SELECT TASK_ID, GRAPH_JSON, TASK_STATE_JSON, POLICY_DECISION_IDS FROM AGENT_KERNEL_TASKS')) {
                return {
                    rows: Array.from(pgTasks.entries()).map(([taskId, value]) => ({
                        task_id: taskId,
                        graph_json: value.graph,
                        task_state_json: value.taskState,
                        policy_decision_ids: value.policyIds,
                    })),
                };
            }

            if (normalized.includes('SELECT TASK_ID, NODE_STATE_JSON FROM AGENT_KERNEL_NODES')) {
                const rows: any[] = [];
                for (const [taskId, nodeMap] of pgNodes.entries()) {
                    for (const value of nodeMap.values()) {
                        rows.push({
                            task_id: taskId,
                            node_state_json: value.nodeState,
                        });
                    }
                }
                return { rows };
            }

            if (normalized.includes('SELECT IDEM_KEY, ENTRY_JSON FROM AGENT_KERNEL_IDEMPOTENCY')) {
                return {
                    rows: Array.from(pgIdempotency.entries()).map(([key, value]) => ({
                        idem_key: key,
                        entry_json: value.entry,
                    })),
                };
            }

            if (normalized.includes('SELECT JOB_ID, RETRY_JOB_JSON FROM AGENT_KERNEL_RETRY_JOBS')) {
                return {
                    rows: Array.from(pgRetryJobs.entries()).map(([jobId, value]) => ({
                        job_id: jobId,
                        retry_job_json: value.retryJob,
                    })),
                };
            }

            if (normalized.includes('SELECT DEAD_LETTER_ID, DEAD_LETTER_JSON FROM AGENT_KERNEL_DEAD_LETTERS')) {
                return {
                    rows: Array.from(pgDeadLetters.entries()).map(([deadLetterId, value]) => ({
                        dead_letter_id: deadLetterId,
                        dead_letter_json: value.deadLetter,
                    })),
                };
            }

            if (normalized.includes('SELECT EXECUTION_UNIT_ID, UNIT_JSON FROM AGENT_KERNEL_EXECUTION_UNITS')) {
                return {
                    rows: Array.from(pgExecutionUnits.entries()).map(([executionUnitId, value]) => ({
                        execution_unit_id: executionUnitId,
                        unit_json: value.executionUnit,
                    })),
                };
            }

            if (normalized.includes('SELECT CLAIM_ID, CLAIM_JSON FROM AGENT_KERNEL_EXECUTION_CLAIMS')) {
                return {
                    rows: Array.from(pgExecutionClaims.entries()).map(([claimId, value]) => ({
                        claim_id: claimId,
                        claim_json: value.claim,
                    })),
                };
            }

            if (normalized.includes('SELECT SESSION_ID, SESSION_JSON FROM AGENT_KERNEL_WORKER_SESSIONS')) {
                return {
                    rows: Array.from(pgWorkerSessions.entries()).map(([sessionId, value]) => ({
                        session_id: sessionId,
                        session_json: value.session,
                    })),
                };
            }

            if (normalized.includes('SELECT PRINCIPAL_ID, PRINCIPAL_JSON FROM AGENT_KERNEL_ENTERPRISE_PRINCIPALS')) {
                return {
                    rows: Array.from(pgEnterprisePrincipals.entries()).map(([principalId, value]) => ({
                        principal_id: principalId,
                        principal_json: value.principal,
                    })),
                };
            }

            if (normalized.includes('SELECT BINDING_ID, BINDING_JSON FROM AGENT_KERNEL_ENTERPRISE_ACCESS_BINDINGS')) {
                return {
                    rows: Array.from(pgEnterpriseAccessBindings.entries()).map(([bindingId, value]) => ({
                        binding_id: bindingId,
                        binding_json: value.binding,
                    })),
                };
            }

            if (normalized.includes('SELECT SESSION_ID, SESSION_JSON FROM AGENT_KERNEL_ENTERPRISE_IDENTITY_SESSIONS')) {
                return {
                    rows: Array.from(pgEnterpriseIdentitySessions.entries()).map(([sessionId, value]) => ({
                        session_id: sessionId,
                        session_json: value.session,
                    })),
                };
            }

            if (normalized.includes('SELECT STATE_ID, OIDC_STATE_JSON FROM AGENT_KERNEL_OIDC_LOGIN_STATES')) {
                return {
                    rows: Array.from(pgOidcLoginStates.entries()).map(([stateId, value]) => ({
                        state_id: stateId,
                        oidc_state_json: value.state,
                    })),
                };
            }

            if (normalized.includes('SELECT CREDENTIAL_ID, CREDENTIAL_JSON FROM AGENT_KERNEL_VAULT_CREDENTIALS')) {
                return {
                    rows: Array.from(pgVaultCredentials.entries()).map(([credentialId, value]) => ({
                        credential_id: credentialId,
                        credential_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT DELIVERY_ID, DELIVERY_JSON FROM AGENT_KERNEL_WEBHOOK_DELIVERIES')) {
                return {
                    rows: Array.from(pgWebhookDeliveries.entries()).map(([deliveryId, value]) => ({
                        delivery_id: deliveryId,
                        delivery_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT REQUEST_ID, DELETION_REQUEST_JSON FROM AGENT_KERNEL_COMPLIANCE_DELETION_REQUESTS')) {
                return {
                    rows: Array.from(pgComplianceDeletionRequests.entries()).map(([requestId, value]) => ({
                        request_id: requestId,
                        deletion_request_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT EXPORT_ID, AUDIT_EXPORT_JSON FROM AGENT_KERNEL_COMPLIANCE_AUDIT_EXPORTS')) {
                return {
                    rows: Array.from(pgComplianceAuditExports.entries()).map(([exportId, value]) => ({
                        export_id: exportId,
                        audit_export_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT PACKAGE_ID, ACTIVATION_PACKAGE_JSON FROM AGENT_KERNEL_PILOT_ACTIVATION_PACKAGES')) {
                return {
                    rows: Array.from(pgPilotActivationPackages.entries()).map(([packageId, value]) => ({
                        package_id: packageId,
                        activation_package_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT BINDING_ID, ENVIRONMENT_BINDING_JSON FROM AGENT_KERNEL_PILOT_ENVIRONMENT_BINDINGS')) {
                return {
                    rows: Array.from(pgPilotEnvironmentBindings.entries()).map(([bindingId, value]) => ({
                        binding_id: bindingId,
                        environment_binding_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT READINESS_ID, ACTOR_READINESS_JSON FROM AGENT_KERNEL_PILOT_ACTOR_READINESS')) {
                return {
                    rows: Array.from(pgPilotActorReadiness.entries()).map(([readinessId, value]) => ({
                        readiness_id: readinessId,
                        actor_readiness_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT ACTIVATION_ID, CONNECTOR_ACTIVATION_JSON FROM AGENT_KERNEL_PILOT_CONNECTOR_ACTIVATION')) {
                return {
                    rows: Array.from(pgPilotConnectorActivation.entries()).map(([activationId, value]) => ({
                        activation_id: activationId,
                        connector_activation_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT INTAKE_ID, ARTIFACT_INTAKE_JSON FROM AGENT_KERNEL_PILOT_EXTERNAL_ARTIFACT_INTAKES')) {
                return {
                    rows: Array.from(pgPilotExternalArtifactIntakes.entries()).map(([intakeId, value]) => ({
                        intake_id: intakeId,
                        artifact_intake_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT ARTIFACT_ID, PILOT_EVIDENCE_JSON FROM AGENT_KERNEL_PILOT_EVIDENCE_ARTIFACTS')) {
                return {
                    rows: Array.from(pgPilotEvidenceArtifacts.entries()).map(([artifactId, value]) => ({
                        artifact_id: artifactId,
                        pilot_evidence_json: value.record,
                    })),
                };
            }

            if (normalized.includes('SELECT LEDGER_ID, RECORD_JSON FROM AGENT_KERNEL_EXECUTION_LEDGER')) {
                return {
                    rows: Array.from(pgLedgerRecords.entries())
                        .sort((a, b) => a[1].sequence - b[1].sequence)
                        .map(([ledgerId, value]) => ({
                            ledger_id: ledgerId,
                            record_json: value.record,
                        })),
                };
            }

            if (normalized.includes('SELECT TASK_ID, PROJECTION_NAME, PROJECTION_JSON FROM AGENT_KERNEL_TASK_PROJECTIONS')) {
                return {
                    rows: Array.from(pgTaskProjections.values()).map((value) => ({
                        task_id: value.taskId,
                        projection_name: value.projectionName,
                        projection_json: value.projection,
                    })),
                };
            }

            if (normalized.includes('SELECT TASK_ID, PROJECTION_NAME, CHECKPOINT_JSON FROM AGENT_KERNEL_PROJECTION_CHECKPOINTS')) {
                return {
                    rows: Array.from(pgProjectionCheckpoints.values()).map((value) => ({
                        task_id: value.taskId,
                        projection_name: value.projectionName,
                        checkpoint_json: value.checkpoint,
                    })),
                };
            }

            if (normalized.includes('SELECT HINT_ID, HINT_JSON FROM AGENT_KERNEL_EXECUTION_LEDGER_COMPACTION_HINTS')) {
                return {
                    rows: Array.from(pgLedgerCompactionHints.entries()).map(([hintId, value]) => ({
                        hint_id: hintId,
                        hint_json: value.hint,
                    })),
                };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_TASKS')) {
                const [taskId, graphJson, taskStateJson, policyIds, updatedAt] = params || [];
                pgTasks.set(String(taskId), {
                    graph: typeof graphJson === 'string' ? JSON.parse(graphJson) : graphJson,
                    taskState: typeof taskStateJson === 'string' ? JSON.parse(taskStateJson) : taskStateJson,
                    policyIds: typeof policyIds === 'string' ? JSON.parse(policyIds) : policyIds,
                    updatedAt: Number(updatedAt || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('DELETE FROM AGENT_KERNEL_NODES WHERE TASK_ID = $1')) {
                const taskId = String((params || [])[0] || '');
                pgNodes.set(taskId, new Map());
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_NODES')) {
                const [taskIdRaw, nodeIdRaw, nodeStateJson, status, updatedAt] = params || [];
                const taskId = String(taskIdRaw || '');
                const nodeId = String(nodeIdRaw || '');
                const byTask = pgNodes.get(taskId) || new Map();
                byTask.set(nodeId, {
                    nodeState: typeof nodeStateJson === 'string' ? JSON.parse(nodeStateJson) : nodeStateJson,
                    status: String(status || ''),
                    updatedAt: Number(updatedAt || 0),
                });
                pgNodes.set(taskId, byTask);
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_IDEMPOTENCY')) {
                const [keyRaw, entryJson, updatedAt] = params || [];
                const key = String(keyRaw || '');
                pgIdempotency.set(key, {
                    entry: typeof entryJson === 'string' ? JSON.parse(entryJson) : entryJson,
                    updatedAt: Number(updatedAt || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_RETRY_JOBS')) {
                const [jobIdRaw, taskIdRaw, , , retryJobJson, statusRaw, availableAtRaw, updatedAtRaw] = params || [];
                const jobId = String(jobIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgRetryJobs.set(jobId, {
                    retryJob: typeof retryJobJson === 'string' ? JSON.parse(retryJobJson) : retryJobJson,
                    taskId,
                    status: String(statusRaw || ''),
                    availableAt: Number(availableAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_DEAD_LETTERS')) {
                const [deadLetterIdRaw, taskIdRaw, , , deadLetterJson, statusRaw, updatedAtRaw] = params || [];
                const deadLetterId = String(deadLetterIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgDeadLetters.set(deadLetterId, {
                    deadLetter: typeof deadLetterJson === 'string' ? JSON.parse(deadLetterJson) : deadLetterJson,
                    taskId,
                    status: String(statusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_EXECUTION_UNITS')) {
                const [executionUnitIdRaw, taskIdRaw, , , , executionUnitJson, statusRaw, availableAtRaw, , updatedAtRaw] = params || [];
                const executionUnitId = String(executionUnitIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgExecutionUnits.set(executionUnitId, {
                    executionUnit: typeof executionUnitJson === 'string' ? JSON.parse(executionUnitJson) : executionUnitJson,
                    taskId,
                    status: String(statusRaw || ''),
                    availableAt: Number(availableAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_EXECUTION_CLAIMS')) {
                const [claimIdRaw, , taskIdRaw, , claimJson, statusRaw, leaseExpiresAtRaw, updatedAtRaw] = params || [];
                const claimId = String(claimIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgExecutionClaims.set(claimId, {
                    claim: typeof claimJson === 'string' ? JSON.parse(claimJson) : claimJson,
                    taskId,
                    status: String(statusRaw || ''),
                    leaseExpiresAt: Number(leaseExpiresAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_WORKER_SESSIONS')) {
                const [sessionIdRaw, taskIdRaw, , sessionJson, statusRaw, updatedAtRaw] = params || [];
                const sessionId = String(sessionIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgWorkerSessions.set(sessionId, {
                    session: typeof sessionJson === 'string' ? JSON.parse(sessionJson) : sessionJson,
                    taskId,
                    status: String(statusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_ENTERPRISE_PRINCIPALS')) {
                const [principalIdRaw, tenantIdRaw, , , principalJson, statusRaw, updatedAtRaw] = params || [];
                const principalId = String(principalIdRaw || '');
                pgEnterprisePrincipals.set(principalId, {
                    principal: typeof principalJson === 'string' ? JSON.parse(principalJson) : principalJson,
                    tenantId: String(tenantIdRaw || ''),
                    status: String(statusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_ENTERPRISE_ACCESS_BINDINGS')) {
                const [bindingIdRaw, principalIdRaw, , , bindingJson, statusRaw, updatedAtRaw] = params || [];
                const bindingId = String(bindingIdRaw || '');
                pgEnterpriseAccessBindings.set(bindingId, {
                    binding: typeof bindingJson === 'string' ? JSON.parse(bindingJson) : bindingJson,
                    principalId: String(principalIdRaw || ''),
                    status: String(statusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_ENTERPRISE_IDENTITY_SESSIONS')) {
                const [sessionIdRaw, principalIdRaw, , , sessionJson, statusRaw, expiresAtRaw, updatedAtRaw] = params || [];
                const sessionId = String(sessionIdRaw || '');
                pgEnterpriseIdentitySessions.set(sessionId, {
                    session: typeof sessionJson === 'string' ? JSON.parse(sessionJson) : sessionJson,
                    principalId: String(principalIdRaw || ''),
                    status: String(statusRaw || ''),
                    expiresAt: Number(expiresAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_OIDC_LOGIN_STATES')) {
                const [stateIdRaw, tenantIdRaw, , stateJson, statusRaw, expiresAtRaw, updatedAtRaw] = params || [];
                const stateId = String(stateIdRaw || '');
                pgOidcLoginStates.set(stateId, {
                    state: typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson,
                    tenantId: String(tenantIdRaw || ''),
                    status: String(statusRaw || ''),
                    expiresAt: Number(expiresAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_VAULT_CREDENTIALS')) {
                const [credentialIdRaw, connectorIdRaw, , , statusRaw, compromiseStatusRaw, , credentialJson, updatedAtRaw] = params || [];
                const credentialId = String(credentialIdRaw || '');
                pgVaultCredentials.set(credentialId, {
                    record: typeof credentialJson === 'string' ? JSON.parse(credentialJson) : credentialJson,
                    connectorId: String(connectorIdRaw || ''),
                    status: String(statusRaw || ''),
                    compromiseStatus: String(compromiseStatusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_WEBHOOK_DELIVERIES')) {
                const [deliveryIdRaw, connectorIdRaw, , , , statusRaw, createdAtRaw, deliveryJson, updatedAtRaw] = params || [];
                const deliveryId = String(deliveryIdRaw || '');
                pgWebhookDeliveries.set(deliveryId, {
                    record: typeof deliveryJson === 'string' ? JSON.parse(deliveryJson) : deliveryJson,
                    connectorId: String(connectorIdRaw || ''),
                    status: String(statusRaw || ''),
                    createdAt: Number(createdAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_COMPLIANCE_DELETION_REQUESTS')) {
                const [requestIdRaw, taskIdRaw, statusRaw, createdAtRaw, requestJson, updatedAtRaw] = params || [];
                const requestId = String(requestIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgComplianceDeletionRequests.set(requestId, {
                    record: typeof requestJson === 'string' ? JSON.parse(requestJson) : requestJson,
                    taskId,
                    status: String(statusRaw || ''),
                    createdAt: Number(createdAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_COMPLIANCE_AUDIT_EXPORTS')) {
                const [exportIdRaw, taskIdRaw, statusRaw, createdAtRaw, exportJson, updatedAtRaw] = params || [];
                const exportId = String(exportIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgComplianceAuditExports.set(exportId, {
                    record: typeof exportJson === 'string' ? JSON.parse(exportJson) : exportJson,
                    taskId,
                    status: String(statusRaw || ''),
                    createdAt: Number(createdAtRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PILOT_ACTIVATION_PACKAGES')) {
                const [packageIdRaw, workspaceKeyRaw, , statusRaw, recordJson, updatedAtRaw] = params || [];
                const packageId = String(packageIdRaw || '');
                pgPilotActivationPackages.set(packageId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    workspaceKey: String(workspaceKeyRaw || ''),
                    status: String(statusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PILOT_ENVIRONMENT_BINDINGS')) {
                const [bindingIdRaw, workspaceKeyRaw, environmentKindRaw, stateRaw, recordJson, updatedAtRaw] = params || [];
                const bindingId = String(bindingIdRaw || '');
                pgPilotEnvironmentBindings.set(bindingId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    workspaceKey: String(workspaceKeyRaw || ''),
                    state: String(stateRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PILOT_ACTOR_READINESS')) {
                const [readinessIdRaw, workspaceKeyRaw, roleRaw, recordJson, updatedAtRaw] = params || [];
                const readinessId = String(readinessIdRaw || '');
                pgPilotActorReadiness.set(readinessId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    workspaceKey: String(workspaceKeyRaw || ''),
                    role: String(roleRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PILOT_CONNECTOR_ACTIVATION')) {
                const [activationIdRaw, workspaceKeyRaw, connectorIdRaw, stateRaw, recordJson, updatedAtRaw] = params || [];
                const activationId = String(activationIdRaw || '');
                pgPilotConnectorActivation.set(activationId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    workspaceKey: String(workspaceKeyRaw || ''),
                    connectorId: String(connectorIdRaw || ''),
                    state: String(stateRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PILOT_EXTERNAL_ARTIFACT_INTAKES')) {
                const [intakeIdRaw, workspaceKeyRaw, , statusRaw, recordJson, updatedAtRaw] = params || [];
                const intakeId = String(intakeIdRaw || '');
                pgPilotExternalArtifactIntakes.set(intakeId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    workspaceKey: String(workspaceKeyRaw || ''),
                    status: String(statusRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PILOT_EVIDENCE_ARTIFACTS')) {
                const [artifactIdRaw, workspaceKeyRaw, categoryRaw, recordJson, updatedAtRaw] = params || [];
                const artifactId = String(artifactIdRaw || '');
                pgPilotEvidenceArtifacts.set(artifactId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    workspaceKey: String(workspaceKeyRaw || ''),
                    category: String(categoryRaw || ''),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_EXECUTION_LEDGER (LEDGER_ID')) {
                const [ledgerIdRaw, taskIdRaw, sequenceRaw, , , , , recordJson, , createdAtRaw] = params || [];
                const ledgerId = String(ledgerIdRaw || '');
                const taskId = String(taskIdRaw || '');
                pgLedgerRecords.set(ledgerId, {
                    record: typeof recordJson === 'string' ? JSON.parse(recordJson) : recordJson,
                    taskId,
                    sequence: Number(sequenceRaw || 0),
                    updatedAt: Number(createdAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_TASK_PROJECTIONS')) {
                const [taskIdRaw, projectionNameRaw, projectionJson, lastSequenceRaw, updatedAtRaw] = params || [];
                const taskId = String(taskIdRaw || '');
                const projectionName = String(projectionNameRaw || '');
                pgTaskProjections.set(`${taskId}:${projectionName}`, {
                    projection: typeof projectionJson === 'string' ? JSON.parse(projectionJson) : projectionJson,
                    taskId,
                    projectionName,
                    lastSequence: Number(lastSequenceRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_PROJECTION_CHECKPOINTS')) {
                const [taskIdRaw, projectionNameRaw, checkpointJson, lastSequenceRaw, updatedAtRaw] = params || [];
                const taskId = String(taskIdRaw || '');
                const projectionName = String(projectionNameRaw || '');
                pgProjectionCheckpoints.set(`${taskId}:${projectionName}`, {
                    checkpoint: typeof checkpointJson === 'string' ? JSON.parse(checkpointJson) : checkpointJson,
                    taskId,
                    projectionName,
                    lastSequence: Number(lastSequenceRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            if (normalized.includes('INSERT INTO AGENT_KERNEL_EXECUTION_LEDGER_COMPACTION_HINTS')) {
                const [hintIdRaw, taskIdRaw, projectionNameRaw, upToSequenceRaw, , hintJson, updatedAtRaw] = params || [];
                const hintId = String(hintIdRaw || '');
                pgLedgerCompactionHints.set(hintId, {
                    hint: typeof hintJson === 'string' ? JSON.parse(hintJson) : hintJson,
                    taskId: String(taskIdRaw || ''),
                    projectionName: String(projectionNameRaw || ''),
                    upToSequence: Number(upToSequenceRaw || 0),
                    updatedAt: Number(updatedAtRaw || 0),
                });
                return { rows: [] };
            }

            return { rows: [] };
        }

        async connect(): Promise<{ query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>; release: () => void }> {
            return {
                query: this.query.bind(this),
                release: () => undefined,
            };
        }
    }

    return {
        Pool: MockPool,
    };
});

vi.mock('redis', () => {
    function setFor(key: string): Set<string> {
        const existing = redisSets.get(key);
        if (existing) return existing;
        const created = new Set<string>();
        redisSets.set(key, created);
        return created;
    }

    return {
        createClient: () => ({
            async connect(): Promise<void> {
                return;
            },
            async sMembers(key: string): Promise<string[]> {
                return Array.from(setFor(key));
            },
            async get(key: string): Promise<string | null> {
                return redisStrings.get(key) ?? null;
            },
            async set(key: string, value: string): Promise<void> {
                redisStrings.set(key, value);
            },
            async sAdd(key: string, value: string): Promise<void> {
                setFor(key).add(value);
            },
        }),
    };
});

describe('agent-kernel store adapters', () => {
    beforeEach(() => {
        pgTasks.clear();
        pgNodes.clear();
        pgIdempotency.clear();
        pgRetryJobs.clear();
        pgDeadLetters.clear();
        pgExecutionUnits.clear();
        pgExecutionClaims.clear();
        pgWorkerSessions.clear();
        pgEnterprisePrincipals.clear();
        pgEnterpriseAccessBindings.clear();
        pgEnterpriseIdentitySessions.clear();
        pgOidcLoginStates.clear();
        pgVaultCredentials.clear();
        pgWebhookDeliveries.clear();
        pgComplianceDeletionRequests.clear();
        pgComplianceAuditExports.clear();
        pgPilotActivationPackages.clear();
        pgPilotEnvironmentBindings.clear();
        pgPilotActorReadiness.clear();
        pgPilotConnectorActivation.clear();
        pgPilotExternalArtifactIntakes.clear();
        pgPilotEvidenceArtifacts.clear();
        pgLedgerRecords.clear();
        pgTaskProjections.clear();
        pgProjectionCheckpoints.clear();
        pgLedgerCompactionHints.clear();
        redisStrings.clear();
        redisSets.clear();
    });

    it('recovers task/node state after restart with postgres store', async () => {
        const graph: TaskGraph = {
            task_id: 'pg_recovery_task',
            goal: 'recovery test',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.test' }],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.createTask(graph);
        await store1.updateNodeState(graph.task_id, 'n1', {
            status: 'SUCCEEDED',
            attempt: 1,
            output: { ok: true },
        });
        await store1.updateTaskState(graph.task_id, {
            status: 'DONE',
        });
        await store1.setIdempotency('idem:pg:1', {
            output: { cached: true },
            at: 123,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const recovered = await store2.getTaskSnapshot(graph.task_id);
        expect(recovered?.task_state.status).toBe('DONE');
        expect(recovered?.node_states.find((item) => item.node_id === 'n1')?.status).toBe('SUCCEEDED');

        const idem = await store2.getIdempotency('idem:pg:1');
        expect(idem?.output).toEqual({ cached: true });
    });

    it('lists durable task ids after postgres store restart', async () => {
        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.createTask({
            task_id: 'pg_task_b',
            goal: 'postgres task b',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.pg.b' }],
            edges: [],
        });
        await store1.createTask({
            task_id: 'pg_task_a',
            goal: 'postgres task a',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.pg.a' }],
            edges: [],
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        expect(await store2.listTaskIds()).toEqual(['pg_task_a', 'pg_task_b']);
    });

    it('recovers task/node state after restart with redis store', async () => {
        const graph: TaskGraph = {
            task_id: 'redis_recovery_task',
            goal: 'redis recovery test',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.redis' }],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-test',
        });

        await store1.createTask(graph);
        await store1.updateNodeState(graph.task_id, 'n1', {
            status: 'SUCCEEDED',
            attempt: 1,
            output: { ok: true },
        });
        await store1.updateTaskState(graph.task_id, {
            status: 'DONE',
        });
        await store1.setIdempotency('idem:redis:1', {
            output: { cached: true },
            at: 456,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-test',
        });

        const recovered = await store2.getTaskSnapshot(graph.task_id);
        expect(recovered?.task_state.status).toBe('DONE');
        expect(recovered?.node_states.find((item) => item.node_id === 'n1')?.status).toBe('SUCCEEDED');

        const idem = await store2.getIdempotency('idem:redis:1');
        expect(idem?.output).toEqual({ cached: true });
    });

    it('lists durable task ids after redis store restart', async () => {
        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-task-ids',
        });

        await store1.createTask({
            task_id: 'redis_task_b',
            goal: 'redis task b',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.redis.b' }],
            edges: [],
        });
        await store1.createTask({
            task_id: 'redis_task_a',
            goal: 'redis task a',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.redis.a' }],
            edges: [],
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-task-ids',
        });

        expect(await store2.listTaskIds()).toEqual(['redis_task_a', 'redis_task_b']);
    });

    it('recovers retry jobs and dead letters after restart with postgres store', async () => {
        const graph: TaskGraph = {
            task_id: 'pg_retry_recovery_task',
            goal: 'retry recovery',
            nodes: [{ id: 'n1', type: 'tool', name: 'tool.retry' }],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.createTask(graph);
        await store1.upsertRetryJob({
            job_id: 'retry_pg_1',
            dedupe_key: 'retry:pg:1',
            task_id: graph.task_id,
            node_id: 'n1',
            status: 'SCHEDULED',
            attempt: 2,
            max_retries: 1,
            scheduled_at: 100,
            available_at: 110,
            created_at: 100,
            updated_at: 100,
            idempotency_key: 'idem:pg:retry',
        });
        await store1.upsertDeadLetter({
            dead_letter_id: 'dlq_pg_1',
            dedupe_key: 'dead:pg:1',
            task_id: graph.task_id,
            node_id: 'n1',
            status: 'OPEN',
            attempt: 2,
            max_retries: 1,
            error_code: 'TOOL_TIMEOUT',
            error_message: 'timed out',
            created_at: 120,
            updated_at: 120,
            retry_job_id: 'retry_pg_1',
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const retryJobs = await store2.listRetryJobs(graph.task_id);
        const deadLetters = await store2.listDeadLetters(graph.task_id);
        expect(retryJobs).toHaveLength(1);
        expect(retryJobs[0]?.job_id).toBe('retry_pg_1');
        expect(deadLetters).toHaveLength(1);
        expect(deadLetters[0]?.dead_letter_id).toBe('dlq_pg_1');
    });

    it('recovers execution units, claims, and worker sessions after restart with postgres store', async () => {
        const graph: TaskGraph = {
            task_id: 'pg_worker_recovery_task',
            goal: 'worker recovery',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.worker' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.createTask(graph);
        await store1.upsertExecutionUnit({
            execution_unit_id: 'exec_pg_1',
            dedupe_key: 'execution-unit:pg:1',
            task_id: graph.task_id,
            node_id: 'n1',
            correlation_id: 'corr_pg_worker',
            run_id: 'run_pg_worker',
            target_attempt: 1,
            status: 'CLAIMED',
            desired_execution_mode: 'REMOTE_PREFERRED',
            runner_type: 'REMOTE_CONTROL_PLANE',
            available_at: 100,
            claim_id: 'claim_pg_1',
            claimed_by_worker_id: 'worker_pg',
            claimed_by_session_id: 'session_pg_1',
            claimed_at: 110,
            lease_expires_at: 130,
            last_heartbeat_at: 120,
            remote_result_status: 'LOCAL_FALLBACK',
            created_at: 100,
            updated_at: 120,
        });
        await store1.upsertExecutionClaim({
            claim_id: 'claim_pg_1',
            execution_unit_id: 'exec_pg_1',
            task_id: graph.task_id,
            node_id: 'n1',
            worker_id: 'worker_pg',
            correlation_id: 'corr_pg_worker',
            run_id: 'run_pg_worker',
            worker_type: 'LOCAL_RUNTIME',
            session_id: 'session_pg_1',
            status: 'ACTIVE',
            execution_mode: 'LOCAL_FALLBACK',
            runner_type: 'LOCAL_FALLBACK',
            claimed_at: 110,
            lease_expires_at: 130,
            last_heartbeat_at: 120,
            remote_request_id: 'rr_pg_1',
            remote_result_status: 'LOCAL_FALLBACK',
            service_auth_context: {
                auth_context_id: 'svc_ctx_pg_1',
                auth_mode: 'STANDARD',
                issued_at: 100,
                expires_at: 300,
                principal: {
                    principal_id: 'svc_worker_pg',
                    principal_type: 'WORKER_SERVICE',
                    allowed_actions: ['CLAIM_EXECUTION', 'HEARTBEAT_EXECUTION', 'RELEASE_EXECUTION'],
                },
            },
            last_service_auth_action: 'HEARTBEAT_EXECUTION',
            last_service_auth_decision_id: 'svc_auth_pg_1',
            last_service_auth_outcome: 'ALLOWED',
            created_at: 110,
            updated_at: 120,
        });
        await store1.upsertWorkerSession({
            session_id: 'session_pg_1',
            task_id: graph.task_id,
            worker_id: 'worker_pg',
            correlation_id: 'corr_pg_worker',
            run_id: 'run_pg_worker',
            worker_type: 'LOCAL_RUNTIME',
            runner_type: 'LOCAL_FALLBACK',
            execution_mode: 'LOCAL_FALLBACK',
            status: 'ACTIVE',
            claimed_at: 110,
            lease_expires_at: 130,
            last_heartbeat_at: 120,
            service_auth_context: {
                auth_context_id: 'svc_ctx_pg_1',
                auth_mode: 'STANDARD',
                issued_at: 100,
                expires_at: 300,
                principal: {
                    principal_id: 'svc_worker_pg',
                    principal_type: 'WORKER_SERVICE',
                    allowed_actions: ['CLAIM_EXECUTION', 'HEARTBEAT_EXECUTION', 'RELEASE_EXECUTION'],
                },
            },
            last_service_auth_action: 'HEARTBEAT_EXECUTION',
            last_service_auth_decision_id: 'svc_auth_pg_1',
            last_service_auth_outcome: 'ALLOWED',
            created_at: 110,
            updated_at: 120,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const executionUnits = await store2.listExecutionUnits(graph.task_id);
        const executionClaims = await store2.listExecutionClaims(graph.task_id);
        const workerSessions = await store2.listWorkerSessions(graph.task_id);
        expect(executionUnits).toHaveLength(1);
        expect(executionUnits[0]?.execution_unit_id).toBe('exec_pg_1');
        expect(executionUnits[0]?.correlation_id).toBe('corr_pg_worker');
        expect(executionClaims).toHaveLength(1);
        expect(executionClaims[0]?.claim_id).toBe('claim_pg_1');
        expect(executionClaims[0]?.run_id).toBe('run_pg_worker');
        expect(executionClaims[0]?.service_auth_context?.principal?.principal_id).toBe('svc_worker_pg');
        expect(executionClaims[0]?.last_service_auth_decision_id).toBe('svc_auth_pg_1');
        expect(workerSessions).toHaveLength(1);
        expect(workerSessions[0]?.session_id).toBe('session_pg_1');
        expect(workerSessions[0]?.correlation_id).toBe('corr_pg_worker');
        expect(workerSessions[0]?.service_auth_context?.auth_context_id).toBe('svc_ctx_pg_1');
    });

    it('recovers enterprise principals, bindings, sessions, and oidc state after restart with postgres store', async () => {
        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.upsertEnterprisePrincipal({
            principal_id: 'principal_pg_1',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_pg_1',
            email: 'pilot-admin@example.com',
            display_name: 'Pilot Admin',
            groups: ['agent-os-admins'],
            status: 'ACTIVE',
            last_login_at: 100,
            last_directory_sync_at: 120,
            created_at: 90,
            updated_at: 120,
        });
        await store1.upsertEnterpriseAccessBinding({
            binding_id: 'binding_pg_1',
            principal_id: 'principal_pg_1',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            source: 'SCIM_SYNC',
            source_group: 'agent-os-admins',
            status: 'ACTIVE',
            provisioned_at: 120,
            created_at: 120,
            updated_at: 120,
        });
        await store1.upsertEnterpriseIdentitySession({
            session_id: 'entsess_pg_1',
            principal_id: 'principal_pg_1',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_pg_1',
                audience: 'client_pg',
                email: 'pilot-admin@example.com',
                display_name: 'Pilot Admin',
                groups: ['agent-os-admins'],
                nonce: 'nonce_pg_1',
            },
            idp_session_id: 'sid_pg_1',
            issued_at: 130,
            expires_at: 530,
            last_seen_at: 140,
            created_at: 130,
            updated_at: 140,
        });
        await store1.upsertOidcLoginState({
            state_id: 'oidc_state_pg_1',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            redirect_uri: 'https://app.example.com/callback',
            nonce: 'nonce_pg_1',
            status: 'PENDING',
            expires_at: 300,
            created_at: 100,
            updated_at: 100,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const principals = await store2.listEnterprisePrincipals();
        const bindings = await store2.listEnterpriseAccessBindings('principal_pg_1');
        const sessions = await store2.listEnterpriseIdentitySessions('principal_pg_1');
        const oidcState = await store2.getOidcLoginState('oidc_state_pg_1');

        expect(principals).toHaveLength(1);
        expect(principals[0]?.email).toBe('pilot-admin@example.com');
        expect(bindings).toHaveLength(1);
        expect(bindings[0]?.roles).toEqual(['WORKSPACE_ADMIN']);
        expect(bindings[0]?.source_group).toBe('agent-os-admins');
        expect(sessions).toHaveLength(1);
        expect(sessions[0]?.session_id).toBe('entsess_pg_1');
        expect(sessions[0]?.claims?.nonce).toBe('nonce_pg_1');
        expect(oidcState?.redirect_uri).toBe('https://app.example.com/callback');
        expect(oidcState?.status).toBe('PENDING');
    });

    it('recovers vault credentials and webhook deliveries after restart with postgres store', async () => {
        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.upsertVaultCredential({
            credential_id: 'vault_cred_pg_1',
            backend: 'HASHICORP_VAULT',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            connector_type: 'HTTPS_WEBHOOK',
            connector_id: 'pilot_https_webhook',
            vault_path: 'webhook/creds/pilot',
            status: 'ACTIVE',
            compromise_status: 'CLEAR',
            lease_id: 'lease_pg_1',
            renewable: true,
            lease_duration_seconds: 300,
            lease_expires_at: 600,
            last_materialized_at: 300,
            last_renewed_at: 360,
            rotated_at: 240,
            last_delivery_status: 'DELIVERED',
            last_delivery_at: 420,
            version: '7',
            created_at: 200,
            updated_at: 420,
        });
        await store1.upsertWebhookDelivery({
            delivery_id: 'webhook_pg_1',
            connector_id: 'pilot_https_webhook',
            credential_id: 'vault_cred_pg_1',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            status: 'DELIVERED',
            adapter_id: 'generic_https_webhook',
            adapter_type: 'GENERIC_HTTPS_WEBHOOK',
            delivery_group_id: 'connector_delivery_pg_1',
            attempt: 1,
            credential_status: 'ACTIVE',
            compromise_status: 'CLEAR',
            request_id: 'req_pg_1',
            http_status: 202,
            response_excerpt: 'accepted',
            payload_summary: '{"goal":"handoff"}',
            created_at: 420,
            updated_at: 420,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const credentials = await store2.listVaultCredentials('pilot_https_webhook');
        const deliveries = await store2.listWebhookDeliveries('pilot_https_webhook');
        expect(credentials).toHaveLength(1);
        expect(credentials[0]?.lease_id).toBe('lease_pg_1');
        expect(credentials[0]?.status).toBe('ACTIVE');
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0]?.delivery_id).toBe('webhook_pg_1');
        expect(deliveries[0]?.adapter_id).toBe('generic_https_webhook');
        expect(deliveries[0]?.adapter_type).toBe('GENERIC_HTTPS_WEBHOOK');
        expect(deliveries[0]?.delivery_group_id).toBe('connector_delivery_pg_1');
        expect(deliveries[0]?.attempt).toBe(1);
        expect(deliveries[0]?.http_status).toBe(202);
    });

    it('recovers compliance deletion requests and audit exports after restart with postgres store', async () => {
        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.upsertComplianceDeletionRequest({
            request_id: 'delete_pg_1',
            task_id: 'task_compliance_pg',
            correlation_id: 'corr_pg',
            run_id: 'run_pg',
            requested_by: {
                actor_type: 'ENTERPRISE_SESSION',
                principal_id: 'principal_pg',
                session_id: 'session_pg',
                email: 'admin@example.com',
                display_name: 'Admin',
            },
            reason: 'customer_erasure_request',
            status: 'DENIED_APPEND_ONLY_POLICY',
            delete_scope: 'TASK_AUDIT_STATE',
            legal_hold_mode: 'MANUAL_ESCALATION_REQUIRED',
            decision_summary: 'delete denied',
            next_action: 'use export',
            created_at: 500,
            updated_at: 500,
        });
        await store1.upsertComplianceAuditExport({
            export_id: 'export_pg_1',
            task_id: 'task_compliance_pg',
            correlation_id: 'corr_pg',
            run_id: 'run_pg',
            requested_by: {
                actor_type: 'ENTERPRISE_SESSION',
                principal_id: 'principal_pg',
                session_id: 'session_pg',
            },
            status: 'GENERATED',
            bundle_version: 'PILOT_AUDIT_EXPORT_V1',
            redaction_mode: 'SUMMARY_ONLY_NO_SECRET_MATERIAL',
            manifest_sha256: 'manifest_pg',
            bundle_sha256: 'bundle_pg',
            section_hashes: [{ section_id: 'task_snapshot', sha256: 'section_pg', item_count: 1 }],
            record_counts: {
                node_count: 1,
                ledger_record_count: 2,
                delivery_count: 0,
                alert_count: 0,
                deletion_request_count: 1,
            },
            created_at: 520,
            updated_at: 520,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const deletionRequests = await store2.listComplianceDeletionRequests('task_compliance_pg');
        const auditExports = await store2.listComplianceAuditExports('task_compliance_pg');
        expect(deletionRequests).toHaveLength(1);
        expect(deletionRequests[0]?.status).toBe('DENIED_APPEND_ONLY_POLICY');
        expect(deletionRequests[0]?.requested_by.session_id).toBe('session_pg');
        expect(auditExports).toHaveLength(1);
        expect(auditExports[0]?.bundle_version).toBe('PILOT_AUDIT_EXPORT_V1');
        expect(auditExports[0]?.section_hashes[0]?.section_id).toBe('task_snapshot');
    });

    it('recovers pilot actor readiness and evidence artifacts after restart with postgres store', async () => {
        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.upsertPilotActivationPackage({
            package_id: 'pilot_package_pg_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            owner_type: 'OPERATOR_OWNER',
            owner_label: 'Pilot operator lead',
            status: 'VERIFICATION_PENDING',
            summary: 'External pilot activation package is waiting on verification.',
            handoff_note: 'Need verified environment and actor artifacts.',
            created_at: 870,
            updated_at: 870,
        });
        await store1.upsertPilotEnvironmentBinding({
            binding_id: 'pilot_binding_pg_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            environment_kind: 'PILOT',
            state: 'BOUND',
            environment_label: 'Pilot workspace',
            base_url: 'https://pilot.example.com',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            source: 'REAL_PILOT',
            summary: 'Real pilot environment binding recorded.',
            created_at: 880,
            updated_at: 880,
        });
        await store1.upsertPilotActorReadiness({
            readiness_id: 'pilot_actor_pg_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            role: 'OPERATOR',
            state: 'READY',
            provisioning_state: 'PROVISIONED',
            access_state: 'GRANTED',
            actor_id: 'operator_pg_1',
            actor_label: 'Pilot Operator',
            source: 'REAL_PILOT',
            note: 'Real operator access recorded.',
            evidence_reference_ids: ['pilot_artifact_pg_1'],
            created_at: 900,
            updated_at: 900,
        });
        await store1.upsertPilotConnectorActivationRecord({
            activation_id: 'pilot_connector_pg_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            connector_id: 'pilot_https_webhook',
            state: 'ELIGIBLE',
            source: 'REAL_PILOT',
            summary: 'Pilot connector activation approved.',
            evidence_reference_ids: [],
            created_at: 905,
            updated_at: 905,
        });
        await store1.upsertPilotExternalArtifactIntake({
            intake_id: 'pilot_intake_pg_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            package_id: 'pilot_package_pg_1',
            artifact_kind: 'REAL_EVIDENCE',
            source: 'REAL_PILOT',
            summary: 'Workflow artifact submitted',
            evidence_category: 'WORKFLOW_ARTIFACT_PROOF',
            verification_status: 'PROMOTED',
            verification_summary: 'Verified and promoted',
            promoted_record_ids: ['pilot_artifact_pg_1'],
            created_at: 907,
            updated_at: 907,
            verified_at: 907,
            promoted_at: 908,
        });
        await store1.upsertPilotEvidenceArtifact({
            artifact_id: 'pilot_artifact_pg_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            category: 'DEVICE_SESSION_PROOF',
            source: 'REAL_PILOT',
            summary: 'Real device/session artifact',
            uri: 'https://pilot.example.com/artifacts/device-session',
            actor_role: 'OPERATOR',
            accepted_as_real_pilot_evidence: true,
            created_at: 910,
            updated_at: 910,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const packages = await store2.listPilotActivationPackages('current:tenant_pilot:workspace_alpha');
        const bindings = await store2.listPilotEnvironmentBindings('current:tenant_pilot:workspace_alpha');
        const readiness = await store2.listPilotActorReadiness('current:tenant_pilot:workspace_alpha');
        const connectorActivation = await store2.listPilotConnectorActivationRecords('current:tenant_pilot:workspace_alpha');
        const intakes = await store2.listPilotExternalArtifactIntakes('current:tenant_pilot:workspace_alpha');
        const evidence = await store2.listPilotEvidenceArtifacts('current:tenant_pilot:workspace_alpha');
        expect(packages).toHaveLength(1);
        expect(packages[0]?.status).toBe('VERIFICATION_PENDING');
        expect(bindings).toHaveLength(1);
        expect(bindings[0]?.state).toBe('BOUND');
        expect(readiness).toHaveLength(1);
        expect(readiness[0]?.role).toBe('OPERATOR');
        expect(readiness[0]?.provisioning_state).toBe('PROVISIONED');
        expect(readiness[0]?.access_state).toBe('GRANTED');
        expect(connectorActivation).toHaveLength(1);
        expect(connectorActivation[0]?.state).toBe('ELIGIBLE');
        expect(intakes).toHaveLength(1);
        expect(intakes[0]?.verification_status).toBe('PROMOTED');
        expect(intakes[0]?.promoted_record_ids).toContain('pilot_artifact_pg_1');
        expect(readiness[0]?.evidence_reference_ids).toEqual(['pilot_artifact_pg_1']);
        expect(evidence).toHaveLength(1);
        expect(evidence[0]?.category).toBe('DEVICE_SESSION_PROOF');
        expect(evidence[0]?.accepted_as_real_pilot_evidence).toBe(true);
    });

    it('recovers ledger records and projection checkpoints after restart with postgres store', async () => {
        const graph: TaskGraph = {
            task_id: 'pg_ledger_recovery_task',
            goal: 'ledger recovery',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.ledger' }],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        await store1.createTask(graph);
        const append = await store1.appendLedgerRecord({
            ledger_id: 'ledger_pg_1',
            dedupe_key: 'task-created:pg-ledger',
            task_id: graph.task_id,
            event_type: 'TASK_CREATED',
            source: 'TASK_RUNTIME',
            occurred_at: 100,
            created_at: 100,
            payload: {
                task_status: 'RUNNING',
                node_statuses: { n1: 'PENDING' },
            },
        });
        const projection = applyExecutionLedgerRecord(
            createEmptyTaskProjection(graph.task_id, TASK_QUERY_PROJECTION_NAME),
            append.record,
        );
        await store1.upsertTaskProjection(projection);
        await store1.upsertProjectionCheckpoint(projection.checkpoint);
        await store1.upsertExecutionLedgerCompactionHint({
            hint_id: 'ledger_hint_pg_1',
            task_id: graph.task_id,
            projection_name: TASK_QUERY_PROJECTION_NAME,
            up_to_sequence: 1,
            reason: 'LEDGER_RECORD_THRESHOLD_EXCEEDED',
            record_count: 1,
            oldest_record_at: 100,
            newest_record_at: 100,
            archive_recommended: true,
            snapshot_required_before_archive: true,
            delete_allowed: false,
            created_at: 150,
            updated_at: 150,
        });
        await store1.upsertExecutionLedgerCompactionHint({
            hint_id: 'ledger_hint_pg_1',
            task_id: graph.task_id,
            projection_name: TASK_QUERY_PROJECTION_NAME,
            up_to_sequence: 1,
            reason: 'LEDGER_AGE_THRESHOLD_EXCEEDED',
            record_count: 1,
            oldest_record_at: 100,
            newest_record_at: 100,
            archive_recommended: true,
            snapshot_required_before_archive: true,
            delete_allowed: false,
            created_at: 999,
            updated_at: 175,
        });

        const store2 = createTaskStore({
            driver: 'postgres',
            postgresUrl: 'postgres://mock',
        });

        const records = await store2.listLedgerRecords({ task_id: graph.task_id });
        const recoveredProjection = await store2.getTaskProjection(graph.task_id, TASK_QUERY_PROJECTION_NAME);
        const checkpoint = await store2.getProjectionCheckpoint(graph.task_id, TASK_QUERY_PROJECTION_NAME);
        const compactionHints = await store2.listExecutionLedgerCompactionHints(graph.task_id);

        expect(records).toHaveLength(1);
        expect(records[0]?.event_type).toBe('TASK_CREATED');
        expect(recoveredProjection?.projection_version).toBeGreaterThanOrEqual(1);
        expect(recoveredProjection?.checkpoint.last_sequence).toBe(1);
        expect(checkpoint?.projection_version).toBeGreaterThanOrEqual(1);
        expect(checkpoint?.last_sequence).toBe(1);
        expect(compactionHints).toHaveLength(1);
        expect(compactionHints[0]?.created_at).toBe(150);
        expect(compactionHints[0]?.updated_at).toBe(175);
        expect(compactionHints[0]?.reason).toBe('LEDGER_AGE_THRESHOLD_EXCEEDED');
    });

    it('recovers retry jobs and dead letters after restart with redis store', async () => {
        const graph: TaskGraph = {
            task_id: 'redis_retry_recovery_task',
            goal: 'retry recovery redis',
            nodes: [{ id: 'n1', type: 'tool', name: 'tool.retry' }],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-retry-test',
        });

        await store1.createTask(graph);
        await store1.upsertRetryJob({
            job_id: 'retry_redis_1',
            dedupe_key: 'retry:redis:1',
            task_id: graph.task_id,
            node_id: 'n1',
            status: 'SCHEDULED',
            attempt: 2,
            max_retries: 1,
            scheduled_at: 100,
            available_at: 110,
            created_at: 100,
            updated_at: 100,
            idempotency_key: 'idem:redis:retry',
        });
        await store1.upsertDeadLetter({
            dead_letter_id: 'dlq_redis_1',
            dedupe_key: 'dead:redis:1',
            task_id: graph.task_id,
            node_id: 'n1',
            status: 'OPEN',
            attempt: 2,
            max_retries: 1,
            error_code: 'TOOL_TIMEOUT',
            error_message: 'timed out',
            created_at: 120,
            updated_at: 120,
            retry_job_id: 'retry_redis_1',
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-retry-test',
        });

        const retryJobs = await store2.listRetryJobs(graph.task_id);
        const deadLetters = await store2.listDeadLetters(graph.task_id);
        expect(retryJobs).toHaveLength(1);
        expect(retryJobs[0]?.job_id).toBe('retry_redis_1');
        expect(deadLetters).toHaveLength(1);
        expect(deadLetters[0]?.dead_letter_id).toBe('dlq_redis_1');
    });

    it('recovers execution units, claims, and worker sessions after restart with redis store', async () => {
        const graph: TaskGraph = {
            task_id: 'redis_worker_recovery_task',
            goal: 'worker recovery redis',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.worker.redis' }],
            edges: [],
            retry_policy: { max_retries: 0, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-worker-test',
        });

        await store1.createTask(graph);
        await store1.upsertExecutionUnit({
            execution_unit_id: 'exec_redis_1',
            dedupe_key: 'execution-unit:redis:1',
            task_id: graph.task_id,
            node_id: 'n1',
            correlation_id: 'corr_redis_worker',
            run_id: 'run_redis_worker',
            target_attempt: 1,
            status: 'CLAIMED',
            desired_execution_mode: 'REMOTE_PREFERRED',
            runner_type: 'REMOTE_CONTROL_PLANE',
            available_at: 200,
            claim_id: 'claim_redis_1',
            claimed_by_worker_id: 'worker_redis',
            claimed_by_session_id: 'session_redis_1',
            claimed_at: 210,
            lease_expires_at: 230,
            last_heartbeat_at: 220,
            remote_result_status: 'LOCAL_FALLBACK',
            created_at: 200,
            updated_at: 220,
        });
        await store1.upsertExecutionClaim({
            claim_id: 'claim_redis_1',
            execution_unit_id: 'exec_redis_1',
            task_id: graph.task_id,
            node_id: 'n1',
            worker_id: 'worker_redis',
            correlation_id: 'corr_redis_worker',
            run_id: 'run_redis_worker',
            worker_type: 'LOCAL_RUNTIME',
            session_id: 'session_redis_1',
            status: 'ACTIVE',
            execution_mode: 'LOCAL_FALLBACK',
            runner_type: 'LOCAL_FALLBACK',
            claimed_at: 210,
            lease_expires_at: 230,
            last_heartbeat_at: 220,
            remote_request_id: 'rr_redis_1',
            remote_result_status: 'LOCAL_FALLBACK',
            service_auth_context: {
                auth_context_id: 'svc_ctx_redis_1',
                auth_mode: 'STANDARD',
                issued_at: 200,
                expires_at: 400,
                principal: {
                    principal_id: 'svc_worker_redis',
                    principal_type: 'WORKER_SERVICE',
                    allowed_actions: ['CLAIM_EXECUTION', 'HEARTBEAT_EXECUTION', 'RELEASE_EXECUTION'],
                },
            },
            last_service_auth_action: 'HEARTBEAT_EXECUTION',
            last_service_auth_decision_id: 'svc_auth_redis_1',
            last_service_auth_outcome: 'ALLOWED',
            created_at: 210,
            updated_at: 220,
        });
        await store1.upsertWorkerSession({
            session_id: 'session_redis_1',
            task_id: graph.task_id,
            worker_id: 'worker_redis',
            correlation_id: 'corr_redis_worker',
            run_id: 'run_redis_worker',
            worker_type: 'LOCAL_RUNTIME',
            runner_type: 'LOCAL_FALLBACK',
            execution_mode: 'LOCAL_FALLBACK',
            status: 'ACTIVE',
            claimed_at: 210,
            lease_expires_at: 230,
            last_heartbeat_at: 220,
            service_auth_context: {
                auth_context_id: 'svc_ctx_redis_1',
                auth_mode: 'STANDARD',
                issued_at: 200,
                expires_at: 400,
                principal: {
                    principal_id: 'svc_worker_redis',
                    principal_type: 'WORKER_SERVICE',
                    allowed_actions: ['CLAIM_EXECUTION', 'HEARTBEAT_EXECUTION', 'RELEASE_EXECUTION'],
                },
            },
            last_service_auth_action: 'HEARTBEAT_EXECUTION',
            last_service_auth_decision_id: 'svc_auth_redis_1',
            last_service_auth_outcome: 'ALLOWED',
            created_at: 210,
            updated_at: 220,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-worker-test',
        });

        const executionUnits = await store2.listExecutionUnits(graph.task_id);
        const executionClaims = await store2.listExecutionClaims(graph.task_id);
        const workerSessions = await store2.listWorkerSessions(graph.task_id);
        expect(executionUnits).toHaveLength(1);
        expect(executionUnits[0]?.execution_unit_id).toBe('exec_redis_1');
        expect(executionUnits[0]?.correlation_id).toBe('corr_redis_worker');
        expect(executionClaims).toHaveLength(1);
        expect(executionClaims[0]?.claim_id).toBe('claim_redis_1');
        expect(executionClaims[0]?.run_id).toBe('run_redis_worker');
        expect(executionClaims[0]?.service_auth_context?.principal?.principal_id).toBe('svc_worker_redis');
        expect(executionClaims[0]?.last_service_auth_decision_id).toBe('svc_auth_redis_1');
        expect(workerSessions).toHaveLength(1);
        expect(workerSessions[0]?.session_id).toBe('session_redis_1');
        expect(workerSessions[0]?.correlation_id).toBe('corr_redis_worker');
        expect(workerSessions[0]?.service_auth_context?.auth_context_id).toBe('svc_ctx_redis_1');
    });

    it('recovers enterprise principals, bindings, sessions, and oidc state after restart with redis store', async () => {
        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-enterprise-identity',
        });

        await store1.upsertEnterprisePrincipal({
            principal_id: 'principal_redis_1',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            external_subject: '00u_redis_1',
            email: 'workspace-admin@example.com',
            display_name: 'Workspace Admin',
            groups: ['agent-os-workspace-admins'],
            status: 'ACTIVE',
            last_login_at: 200,
            last_directory_sync_at: 220,
            created_at: 180,
            updated_at: 220,
        });
        await store1.upsertEnterpriseAccessBinding({
            binding_id: 'binding_redis_1',
            principal_id: 'principal_redis_1',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            source: 'OIDC_LOGIN',
            source_group: 'agent-os-workspace-admins',
            status: 'ACTIVE',
            provisioned_at: 220,
            created_at: 220,
            updated_at: 220,
        });
        await store1.upsertEnterpriseIdentitySession({
            session_id: 'entsess_redis_1',
            principal_id: 'principal_redis_1',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            roles: ['WORKSPACE_ADMIN'],
            status: 'ACTIVE',
            claims: {
                issuer: 'https://example.okta.com/oauth2/default',
                subject: '00u_redis_1',
                audience: 'client_redis',
                email: 'workspace-admin@example.com',
                display_name: 'Workspace Admin',
                groups: ['agent-os-workspace-admins'],
                nonce: 'nonce_redis_1',
            },
            idp_session_id: 'sid_redis_1',
            issued_at: 230,
            expires_at: 730,
            last_seen_at: 240,
            created_at: 230,
            updated_at: 240,
        });
        await store1.upsertOidcLoginState({
            state_id: 'oidc_state_redis_1',
            provider: 'OKTA_OIDC',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            redirect_uri: 'https://app.example.com/callback',
            nonce: 'nonce_redis_1',
            status: 'PENDING',
            expires_at: 500,
            created_at: 210,
            updated_at: 210,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-enterprise-identity',
        });

        const principals = await store2.listEnterprisePrincipals();
        const bindings = await store2.listEnterpriseAccessBindings('principal_redis_1');
        const sessions = await store2.listEnterpriseIdentitySessions('principal_redis_1');
        const oidcState = await store2.getOidcLoginState('oidc_state_redis_1');

        expect(principals).toHaveLength(1);
        expect(principals[0]?.groups).toEqual(['agent-os-workspace-admins']);
        expect(bindings).toHaveLength(1);
        expect(bindings[0]?.source).toBe('OIDC_LOGIN');
        expect(sessions).toHaveLength(1);
        expect(sessions[0]?.session_id).toBe('entsess_redis_1');
        expect(sessions[0]?.claims?.email).toBe('workspace-admin@example.com');
        expect(oidcState?.nonce).toBe('nonce_redis_1');
    });

    it('recovers vault credentials and webhook deliveries after restart with redis store', async () => {
        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-vault-webhook',
        });

        await store1.upsertVaultCredential({
            credential_id: 'vault_cred_redis_1',
            backend: 'HASHICORP_VAULT',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            connector_type: 'HTTPS_WEBHOOK',
            connector_id: 'pilot_https_webhook',
            vault_path: 'webhook/creds/pilot',
            status: 'COMPROMISED',
            compromise_status: 'CONFIRMED',
            lease_id: 'lease_redis_1',
            renewable: false,
            lease_duration_seconds: 120,
            lease_expires_at: 340,
            last_materialized_at: 220,
            revoked_at: 260,
            last_failure_at: 260,
            last_failure_reason: 'credential_compromised',
            last_delivery_status: 'BLOCKED_CREDENTIAL',
            last_delivery_at: 270,
            version: '9',
            created_at: 200,
            updated_at: 270,
        });
        await store1.upsertWebhookDelivery({
            delivery_id: 'webhook_redis_1',
            connector_id: 'pilot_https_webhook',
            credential_id: 'vault_cred_redis_1',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            status: 'BLOCKED_CREDENTIAL',
            adapter_id: 'advisor_crm_compliance_handoff',
            adapter_type: 'ADVISOR_CRM_COMPLIANCE_HANDOFF',
            delivery_group_id: 'connector_delivery_redis_1',
            attempt: 1,
            credential_status: 'COMPROMISED',
            compromise_status: 'CONFIRMED',
            blocked_reason: 'credential_compromised',
            payload_summary: '{"goal":"handoff"}',
            created_at: 270,
            updated_at: 270,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-vault-webhook',
        });

        const credentials = await store2.listVaultCredentials('pilot_https_webhook');
        const deliveries = await store2.listWebhookDeliveries('pilot_https_webhook');
        expect(credentials).toHaveLength(1);
        expect(credentials[0]?.compromise_status).toBe('CONFIRMED');
        expect(credentials[0]?.status).toBe('COMPROMISED');
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0]?.status).toBe('BLOCKED_CREDENTIAL');
        expect(deliveries[0]?.adapter_id).toBe('advisor_crm_compliance_handoff');
        expect(deliveries[0]?.adapter_type).toBe('ADVISOR_CRM_COMPLIANCE_HANDOFF');
        expect(deliveries[0]?.delivery_group_id).toBe('connector_delivery_redis_1');
        expect(deliveries[0]?.attempt).toBe(1);
        expect(deliveries[0]?.blocked_reason).toBe('credential_compromised');
    });

    it('recovers compliance deletion requests and audit exports after restart with redis store', async () => {
        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-compliance',
        });

        await store1.upsertComplianceDeletionRequest({
            request_id: 'delete_redis_1',
            task_id: 'task_compliance_redis',
            correlation_id: 'corr_redis',
            run_id: 'run_redis',
            requested_by: {
                actor_type: 'ENTERPRISE_SESSION',
                principal_id: 'principal_redis',
                session_id: 'session_redis',
                email: 'admin@example.com',
            },
            reason: 'customer_erasure_request',
            status: 'DENIED_MANUAL_LEGAL_HOLD_REVIEW',
            delete_scope: 'TASK_AUDIT_STATE',
            legal_hold_mode: 'MANUAL_ESCALATION_REQUIRED',
            decision_summary: 'manual legal hold review required',
            next_action: 'escalate',
            created_at: 800,
            updated_at: 800,
        });
        await store1.upsertComplianceAuditExport({
            export_id: 'export_redis_1',
            task_id: 'task_compliance_redis',
            correlation_id: 'corr_redis',
            run_id: 'run_redis',
            requested_by: {
                actor_type: 'ENTERPRISE_SESSION',
                principal_id: 'principal_redis',
                session_id: 'session_redis',
            },
            status: 'GENERATED',
            bundle_version: 'PILOT_AUDIT_EXPORT_V1',
            redaction_mode: 'SUMMARY_ONLY_NO_SECRET_MATERIAL',
            manifest_sha256: 'manifest_redis',
            bundle_sha256: 'bundle_redis',
            section_hashes: [{ section_id: 'execution_ledger_summary', sha256: 'section_redis', item_count: 2 }],
            record_counts: {
                node_count: 1,
                ledger_record_count: 2,
                delivery_count: 1,
                alert_count: 0,
                deletion_request_count: 1,
            },
            created_at: 820,
            updated_at: 820,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-compliance',
        });

        const deletionRequests = await store2.listComplianceDeletionRequests('task_compliance_redis');
        const auditExports = await store2.listComplianceAuditExports('task_compliance_redis');
        expect(deletionRequests).toHaveLength(1);
        expect(deletionRequests[0]?.status).toBe('DENIED_MANUAL_LEGAL_HOLD_REVIEW');
        expect(deletionRequests[0]?.requested_by.principal_id).toBe('principal_redis');
        expect(auditExports).toHaveLength(1);
        expect(auditExports[0]?.bundle_sha256).toBe('bundle_redis');
        expect(auditExports[0]?.record_counts.delivery_count).toBe(1);
    });

    it('recovers pilot actor readiness and evidence artifacts after restart with redis store', async () => {
        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-pilot-activation',
        });

        await store1.upsertPilotActivationPackage({
            package_id: 'pilot_package_redis_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            owner_type: 'TENANT_ADMIN_OWNER',
            owner_label: 'Tenant admin',
            status: 'BLOCKED',
            summary: 'Activation package is blocked until real pilot artifacts are received.',
            created_at: 910,
            updated_at: 910,
        });
        await store1.upsertPilotEnvironmentBinding({
            binding_id: 'pilot_binding_redis_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            environment_kind: 'SIMULATOR',
            state: 'BLOCKED',
            environment_label: 'Simulator workspace',
            base_url: 'https://lumio-b-end-platform.vercel.app',
            tenant_id: 'tenant_pilot',
            workspace_id: 'workspace_alpha',
            source: 'SIMULATOR',
            summary: 'Simulator binding cannot count as a real pilot environment.',
            created_at: 915,
            updated_at: 915,
        });
        await store1.upsertPilotActorReadiness({
            readiness_id: 'pilot_actor_redis_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            role: 'TENANT_ADMIN',
            state: 'BLOCKED',
            provisioning_state: 'BLOCKED',
            access_state: 'BLOCKED',
            actor_label: 'Tenant Admin',
            source: 'LOCAL_SYNTHETIC',
            note: 'Blocked until real touchpoint is provided.',
            evidence_reference_ids: ['pilot_artifact_redis_1'],
            created_at: 920,
            updated_at: 920,
        });
        await store1.upsertPilotConnectorActivationRecord({
            activation_id: 'pilot_connector_redis_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            connector_id: 'pilot_https_webhook',
            state: 'BLOCKED',
            source: 'LOCAL_SYNTHETIC',
            summary: 'Connector activation blocked until real pilot binding exists.',
            evidence_reference_ids: [],
            created_at: 925,
            updated_at: 925,
        });
        await store1.upsertPilotExternalArtifactIntake({
            intake_id: 'pilot_intake_redis_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            package_id: 'pilot_package_redis_1',
            artifact_kind: 'ACTOR_READINESS',
            source: 'TEST',
            summary: 'Synthetic operator package',
            actor_role: 'OPERATOR',
            verification_status: 'REJECTED',
            rejection_reason: 'non_pilot_artifact_source',
            promoted_record_ids: [],
            created_at: 928,
            updated_at: 928,
            verified_at: 928,
        });
        await store1.upsertPilotEvidenceArtifact({
            artifact_id: 'pilot_artifact_redis_1',
            workspace_key: 'current:tenant_pilot:workspace_alpha',
            category: 'TENANT_ADMIN_SUPPORT_PROOF',
            source: 'TEST',
            summary: 'Test artifact should not count as real pilot evidence.',
            accepted_as_real_pilot_evidence: false,
            rejection_reason: 'non_pilot_artifact_source',
            created_at: 930,
            updated_at: 930,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-pilot-activation',
        });

        const packages = await store2.listPilotActivationPackages('current:tenant_pilot:workspace_alpha');
        const bindings = await store2.listPilotEnvironmentBindings('current:tenant_pilot:workspace_alpha');
        const readiness = await store2.listPilotActorReadiness('current:tenant_pilot:workspace_alpha');
        const connectorActivation = await store2.listPilotConnectorActivationRecords('current:tenant_pilot:workspace_alpha');
        const intakes = await store2.listPilotExternalArtifactIntakes('current:tenant_pilot:workspace_alpha');
        const evidence = await store2.listPilotEvidenceArtifacts('current:tenant_pilot:workspace_alpha');
        expect(packages).toHaveLength(1);
        expect(packages[0]?.status).toBe('BLOCKED');
        expect(bindings).toHaveLength(1);
        expect(bindings[0]?.state).toBe('BLOCKED');
        expect(readiness).toHaveLength(1);
        expect(readiness[0]?.role).toBe('TENANT_ADMIN');
        expect(readiness[0]?.state).toBe('BLOCKED');
        expect(readiness[0]?.provisioning_state).toBe('BLOCKED');
        expect(readiness[0]?.access_state).toBe('BLOCKED');
        expect(connectorActivation).toHaveLength(1);
        expect(connectorActivation[0]?.state).toBe('BLOCKED');
        expect(intakes).toHaveLength(1);
        expect(intakes[0]?.verification_status).toBe('REJECTED');
        expect(intakes[0]?.rejection_reason).toBe('non_pilot_artifact_source');
        expect(evidence).toHaveLength(1);
        expect(evidence[0]?.category).toBe('TENANT_ADMIN_SUPPORT_PROOF');
        expect(evidence[0]?.accepted_as_real_pilot_evidence).toBe(false);
        expect(evidence[0]?.rejection_reason).toBe('non_pilot_artifact_source');
    });

    it('recovers ledger records and projection checkpoints after restart with redis store', async () => {
        const graph: TaskGraph = {
            task_id: 'redis_ledger_recovery_task',
            goal: 'redis ledger recovery',
            nodes: [{ id: 'n1', type: 'llm', name: 'llm.redis.ledger' }],
            edges: [],
            retry_policy: { max_retries: 1, backoff_ms: 10, jitter: false },
        };

        const store1 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-ledger-test',
        });

        await store1.createTask(graph);
        const append = await store1.appendLedgerRecord({
            ledger_id: 'ledger_redis_1',
            dedupe_key: 'task-created:redis-ledger',
            task_id: graph.task_id,
            event_type: 'TASK_CREATED',
            source: 'TASK_RUNTIME',
            occurred_at: 200,
            created_at: 200,
            payload: {
                task_status: 'RUNNING',
                node_statuses: { n1: 'PENDING' },
            },
        });
        const projection = applyExecutionLedgerRecord(
            createEmptyTaskProjection(graph.task_id, TASK_QUERY_PROJECTION_NAME),
            append.record,
        );
        await store1.upsertTaskProjection(projection);
        await store1.upsertProjectionCheckpoint(projection.checkpoint);
        await store1.upsertExecutionLedgerCompactionHint({
            hint_id: 'ledger_hint_redis_1',
            task_id: graph.task_id,
            projection_name: TASK_QUERY_PROJECTION_NAME,
            up_to_sequence: 1,
            reason: 'LEDGER_RECORD_THRESHOLD_EXCEEDED',
            record_count: 1,
            oldest_record_at: 200,
            newest_record_at: 200,
            archive_recommended: true,
            snapshot_required_before_archive: true,
            delete_allowed: false,
            created_at: 260,
            updated_at: 260,
        });
        await store1.upsertExecutionLedgerCompactionHint({
            hint_id: 'ledger_hint_redis_1',
            task_id: graph.task_id,
            projection_name: TASK_QUERY_PROJECTION_NAME,
            up_to_sequence: 1,
            reason: 'LEDGER_AGE_THRESHOLD_EXCEEDED',
            record_count: 1,
            oldest_record_at: 200,
            newest_record_at: 200,
            archive_recommended: true,
            snapshot_required_before_archive: true,
            delete_allowed: false,
            created_at: 999,
            updated_at: 290,
        });

        const store2 = createTaskStore({
            driver: 'redis',
            redisUrl: 'redis://mock',
            redisKeyPrefix: 'ak-ledger-test',
        });

        const records = await store2.listLedgerRecords({ task_id: graph.task_id });
        const recoveredProjection = await store2.getTaskProjection(graph.task_id, TASK_QUERY_PROJECTION_NAME);
        const checkpoint = await store2.getProjectionCheckpoint(graph.task_id, TASK_QUERY_PROJECTION_NAME);
        const compactionHints = await store2.listExecutionLedgerCompactionHints(graph.task_id);

        expect(records).toHaveLength(1);
        expect(records[0]?.event_type).toBe('TASK_CREATED');
        expect(recoveredProjection?.projection_version).toBeGreaterThanOrEqual(1);
        expect(recoveredProjection?.checkpoint.last_sequence).toBe(1);
        expect(checkpoint?.projection_version).toBeGreaterThanOrEqual(1);
        expect(checkpoint?.last_sequence).toBe(1);
        expect(compactionHints).toHaveLength(1);
        expect(compactionHints[0]?.created_at).toBe(260);
        expect(compactionHints[0]?.updated_at).toBe(290);
        expect(compactionHints[0]?.reason).toBe('LEDGER_AGE_THRESHOLD_EXCEEDED');
    });
});
