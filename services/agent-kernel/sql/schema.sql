-- Agent Kernel persistent store schema (Postgres)
-- Apply with: psql "$AGENT_KERNEL_POSTGRES_URL" -f services/agent-kernel/sql/schema.sql

CREATE TABLE IF NOT EXISTS agent_kernel_tasks (
    task_id TEXT PRIMARY KEY,
    graph_json JSONB NOT NULL,
    task_state_json JSONB NOT NULL,
    policy_decision_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_kernel_nodes (
    task_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    node_state_json JSONB NOT NULL,
    status TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (task_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_nodes_task_status
ON agent_kernel_nodes(task_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_nodes_updated_at
ON agent_kernel_nodes(updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_idempotency (
    idem_key TEXT PRIMARY KEY,
    entry_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_tasks_updated_at
ON agent_kernel_tasks(updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_retry_jobs (
    job_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    retry_job_json JSONB NOT NULL,
    status TEXT NOT NULL,
    available_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_retry_jobs_task_status_available
ON agent_kernel_retry_jobs(task_id, status, available_at);

CREATE TABLE IF NOT EXISTS agent_kernel_dead_letters (
    dead_letter_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    dead_letter_json JSONB NOT NULL,
    status TEXT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_dead_letters_task_status_updated
ON agent_kernel_dead_letters(task_id, status, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_execution_units (
    execution_unit_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    target_attempt INT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    unit_json JSONB NOT NULL,
    status TEXT NOT NULL,
    available_at BIGINT NOT NULL,
    lease_expires_at BIGINT,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_units_task_status_available
ON agent_kernel_execution_units(task_id, status, available_at);

CREATE TABLE IF NOT EXISTS agent_kernel_execution_claims (
    claim_id TEXT PRIMARY KEY,
    execution_unit_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    claim_json JSONB NOT NULL,
    status TEXT NOT NULL,
    lease_expires_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_claims_task_status_lease
ON agent_kernel_execution_claims(task_id, status, lease_expires_at);

CREATE TABLE IF NOT EXISTS agent_kernel_worker_sessions (
    session_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    session_json JSONB NOT NULL,
    status TEXT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_worker_sessions_task_status_updated
ON agent_kernel_worker_sessions(task_id, status, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_principals (
    principal_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    external_subject TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL,
    principal_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_principals_tenant_status
ON agent_kernel_enterprise_principals(tenant_id, status, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_access_bindings (
    binding_id TEXT PRIMARY KEY,
    principal_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT,
    status TEXT NOT NULL,
    binding_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_access_bindings_principal_status
ON agent_kernel_enterprise_access_bindings(principal_id, status, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_enterprise_identity_sessions (
    session_id TEXT PRIMARY KEY,
    principal_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    session_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_enterprise_identity_sessions_principal_status
ON agent_kernel_enterprise_identity_sessions(principal_id, status, expires_at);

CREATE TABLE IF NOT EXISTS agent_kernel_oidc_login_states (
    state_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    oidc_state_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_oidc_login_states_status_expiry
ON agent_kernel_oidc_login_states(status, expires_at);

CREATE TABLE IF NOT EXISTS agent_kernel_vault_credentials (
    credential_id TEXT PRIMARY KEY,
    connector_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT,
    status TEXT NOT NULL,
    compromise_status TEXT NOT NULL,
    lease_expires_at BIGINT,
    credential_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_vault_credentials_connector_status
ON agent_kernel_vault_credentials(connector_id, status, compromise_status, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_webhook_deliveries (
    delivery_id TEXT PRIMARY KEY,
    connector_id TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    delivery_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_webhook_deliveries_connector_status_created
ON agent_kernel_webhook_deliveries(connector_id, status, created_at);

CREATE TABLE IF NOT EXISTS agent_kernel_compliance_deletion_requests (
    request_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    deletion_request_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_compliance_deletion_requests_task_status_created
ON agent_kernel_compliance_deletion_requests(task_id, status, created_at);

CREATE TABLE IF NOT EXISTS agent_kernel_compliance_audit_exports (
    export_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    audit_export_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_compliance_audit_exports_task_status_created
ON agent_kernel_compliance_audit_exports(task_id, status, created_at);

CREATE TABLE IF NOT EXISTS agent_kernel_pilot_activation_packages (
    package_id TEXT PRIMARY KEY,
    workspace_key TEXT NOT NULL,
    owner_type TEXT NOT NULL,
    package_status TEXT NOT NULL,
    activation_package_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_activation_packages_workspace_updated
ON agent_kernel_pilot_activation_packages(workspace_key, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_pilot_actor_readiness (
    readiness_id TEXT PRIMARY KEY,
    workspace_key TEXT NOT NULL,
    role TEXT NOT NULL,
    actor_readiness_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_actor_readiness_workspace_role_updated
ON agent_kernel_pilot_actor_readiness(workspace_key, role, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_pilot_environment_bindings (
    binding_id TEXT PRIMARY KEY,
    workspace_key TEXT NOT NULL,
    environment_kind TEXT NOT NULL,
    binding_state TEXT NOT NULL,
    environment_binding_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_environment_bindings_workspace_updated
ON agent_kernel_pilot_environment_bindings(workspace_key, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_pilot_connector_activation (
    activation_id TEXT PRIMARY KEY,
    workspace_key TEXT NOT NULL,
    connector_id TEXT NOT NULL,
    connector_state TEXT NOT NULL,
    connector_activation_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_connector_activation_workspace_connector_updated
ON agent_kernel_pilot_connector_activation(workspace_key, connector_id, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_pilot_external_artifact_intakes (
    intake_id TEXT PRIMARY KEY,
    workspace_key TEXT NOT NULL,
    artifact_kind TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    artifact_intake_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_external_artifact_intakes_workspace_updated
ON agent_kernel_pilot_external_artifact_intakes(workspace_key, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_pilot_evidence_artifacts (
    artifact_id TEXT PRIMARY KEY,
    workspace_key TEXT NOT NULL,
    category TEXT NOT NULL,
    pilot_evidence_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_pilot_evidence_workspace_category_updated
ON agent_kernel_pilot_evidence_artifacts(workspace_key, category, updated_at);

CREATE TABLE IF NOT EXISTS agent_kernel_execution_ledger (
    ledger_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    sequence BIGINT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload_json JSONB,
    record_json JSONB NOT NULL,
    occurred_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_ledger_task_sequence
ON agent_kernel_execution_ledger(task_id, sequence);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_execution_ledger_task_event
ON agent_kernel_execution_ledger(task_id, event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS agent_kernel_task_projections (
    task_id TEXT NOT NULL,
    projection_name TEXT NOT NULL,
    projection_json JSONB NOT NULL,
    last_sequence BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (task_id, projection_name)
);

CREATE TABLE IF NOT EXISTS agent_kernel_projection_checkpoints (
    task_id TEXT NOT NULL,
    projection_name TEXT NOT NULL,
    checkpoint_json JSONB NOT NULL,
    last_sequence BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (task_id, projection_name)
);

CREATE TABLE IF NOT EXISTS agent_kernel_execution_ledger_compaction_hints (
    hint_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    projection_name TEXT NOT NULL,
    up_to_sequence BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    hint_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_ledger_compaction_hints_task_updated
ON agent_kernel_execution_ledger_compaction_hints(task_id, updated_at DESC);

-- Runtime event stream sink (for Kafka/PubSub mirror consumers or replay tooling)
CREATE TABLE IF NOT EXISTS agent_kernel_events (
    event_id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    event_type TEXT NOT NULL,
    task_id TEXT NOT NULL,
    node_id TEXT,
    payload_json JSONB,
    node_log_json JSONB,
    occurred_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_events_task_occurred
ON agent_kernel_events(task_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_events_type_occurred
ON agent_kernel_events(event_type, occurred_at DESC);

-- Per-node execution attempt log for audit/replay/debug
CREATE TABLE IF NOT EXISTS agent_kernel_node_execution_logs (
    log_id BIGSERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    attempt INT,
    status TEXT,
    error_code TEXT,
    error_message TEXT,
    retryable BOOLEAN,
    tool_call_id TEXT,
    verifier TEXT,
    policy_decision_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_decision TEXT,
    started_at BIGINT,
    ended_at BIGINT,
    latency_ms BIGINT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_node_logs_task_node
ON agent_kernel_node_execution_logs(task_id, node_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_kernel_node_logs_status_created
ON agent_kernel_node_execution_logs(status, created_at DESC);
