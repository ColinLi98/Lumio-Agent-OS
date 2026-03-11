package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.RoleSource
import java.util.Locale

object RoleTraceFormatter {

    fun headline(response: AgentResponse): String? {
        val role = response.activeRole ?: return null
        val sourceLabel = readableSource(response.roleSource)
        return "Running as ${role.name.lowercase().replaceFirstChar { it.uppercase() }} role (Source: $sourceLabel)"
    }

    fun impactLines(response: AgentResponse, maxItems: Int = 2): List<String> {
        return response.roleImpactReasonCodes
            .asSequence()
            .map(::readableImpactReason)
            .filter { it.isNotBlank() }
            .distinct()
            .take(maxItems.coerceAtLeast(1))
            .toList()
    }

    fun exportSnippet(response: AgentResponse): String {
        val role = response.activeRole?.name?.lowercase(Locale.getDefault()) ?: "unknown"
        val source = readableSource(response.roleSource)
        val impact = impactLines(response, maxItems = 1).firstOrNull() ?: "No material role impact recorded"
        return "role=$role source=$source impact=$impact"
    }

    fun readableSource(source: RoleSource?): String {
        return when (source) {
            RoleSource.EXPLICIT_USER_SELECTION -> "Explicit user selection"
            RoleSource.USER_PROFILE_DEFAULT -> "User profile default"
            RoleSource.TASK_INHERITED -> "Task inherited"
            RoleSource.SAFE_SYSTEM_INFERENCE -> "Safe system inference"
            RoleSource.SYSTEM_FALLBACK -> "System fallback"
            null -> "Unknown"
        }
    }

    fun readableImpactReason(code: String): String {
        return when (code.trim().uppercase(Locale.getDefault())) {
            "ROLE_APPROVAL_REQUIRED" -> "Approval required by role policy"
            "ROLE_APPROVAL_THRESHOLD_EXCEEDED" -> "Approval threshold exceeded by role policy"
            "ROLE_POLICY_USER_OVERRIDE_APPLIED" -> "User-edited role policy is active for this run"
            "ROLE_POLICY_DENIED" -> "Action denied by role policy"
            "ROLE_DATA_SCOPE_REDUCED" -> "Data scope reduced by role policy"
            "ROLE_CLOUD_SYNC_BLOCKED" -> "Cloud sync blocked by role data policy"
            "ROLE_ROUTE_BIAS_APPLIED" -> "Routing adjusted by role policy"
            "ROLE_ROUTE_EXCLUDED" -> "Route excluded by role policy"
            "ROLE_PROVIDER_PREFERRED" -> "Provider preference applied by role policy"
            "ROLE_PROVIDER_EXCLUDED" -> "Provider excluded by role policy"
            "ROLE_PROVIDER_SELECTED" -> "Provider selected with role-aware policy fit"
            "ROLE_PROVIDER_DENIED_BY_POLICY" -> "Provider denied by role policy"
            "ROLE_RANKING_BIAS_APPLIED" -> "Ranking adjusted by role policy"
            "ROLE_QUOTE_COLLECTED" -> "External quotes collected for role-aware comparison"
            "ROLE_QUOTE_POLICY_FIT_APPLIED" -> "Quote ranking adjusted by role-policy fit"
            "ROLE_CHANGED_BY_USER" -> "Role changed by user; future steps reevaluated"
            "ROLE_CHANGED_BY_SYSTEM_SAFE_RULE" -> "Role updated by system safety recovery"
            "ROLE_CHANGE_TRIGGERED_REEVALUATION" -> "Role change triggered reevaluation"
            "ROLE_CHANGE_REQUIRES_REAPPROVAL" -> "Role change requires re-approval"
            "ROLE_EXTERNAL_APPROVAL_REQUIRED" -> "External execution requires approval"
            "ROLE_EXTERNAL_APPROVAL_GRANTED" -> "External execution approval granted"
            "ROLE_EXTERNAL_APPROVAL_DENIED" -> "External execution approval denied"
            "ROLE_EXTERNAL_DATA_SCOPE_REDUCED" -> "Provider-facing data scope reduced by role policy"
            "ROLE_EXTERNAL_DATA_SCOPE_BLOCKED" -> "Provider-facing data scope blocked by role policy"
            "ROLE_EXTERNAL_PROOF_REQUIRED" -> "External execution requires proof artifacts"
            "ROLE_EXTERNAL_PROOF_MISSING" -> "Required external proof artifacts missing"
            "ROLE_EXTERNAL_VERIFICATION_FAILED" -> "External verification failed"
            "ROLE_EXTERNAL_ROLLBACK_AVAILABLE" -> "External rollback remains available"
            "ROLE_EXTERNAL_ROLLBACK_TRIGGERED" -> "External rollback was triggered"
            "ROLE_EXTERNAL_DISPUTE_OPENED" -> "External dispute flow opened"
            "ROLE_WORKFLOW_POLICY_PACK_APPLIED" -> "Workflow policy pack applied"
            "ROLE_WORKFLOW_TENANT_OVERRIDE_APPLIED" -> "Tenant workflow override applied"
            "ROLE_WORKFLOW_WORKSPACE_OVERRIDE_APPLIED" -> "Workspace workflow override applied"
            "ROLE_WORKFLOW_OVERRIDE_DENIED" -> "Workflow override denied or inactive"
            "ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT" -> "Explicit case constraints overrode workflow defaults"
            "ROLE_WORKFLOW_POLICY_PRECEDENCE_OPERATOR_OVERRIDE" -> "Operator workflow override took precedence"
            "ROLE_WORKFLOW_POLICY_PRECEDENCE_WORKSPACE_OVERRIDE" -> "Workspace workflow override took precedence"
            "ROLE_WORKFLOW_POLICY_PRECEDENCE_TENANT_OVERRIDE" -> "Tenant workflow override took precedence"
            "ROLE_WORKFLOW_POLICY_PRECEDENCE_POLICY_PACK" -> "Workflow policy pack precedence applied"
            "ROLE_WORKFLOW_POLICY_PRECEDENCE_TEMPLATE_DEFAULT" -> "Workflow template defaults were used"
            "ROLE_POLICY_ROLLOUT_SIMULATION_ONLY" -> "Workflow rollout is simulation-only"
            "ROLE_POLICY_ROLLOUT_STAGED" -> "Workflow rollout is staged"
            "ROLE_POLICY_ROLLOUT_ENFORCED" -> "Workflow rollout is enforced"
            "ROLE_POLICY_ROLLOUT_PAUSED" -> "Workflow rollout is paused by operator governance"
            "ROLE_POLICY_ROLLOUT_FROZEN" -> "Workflow rollout is frozen by governance controls"
            "ROLE_POLICY_ROLLOUT_ROLLED_BACK" -> "Workflow rollout was rolled back to a safe state"
            "ROLE_POLICY_ROLLOUT_APPROVAL_REQUIRED" -> "Workflow rollout promotion requires approval"
            "ROLE_POLICY_ROLLOUT_APPROVAL_REQUESTED" -> "Workflow rollout approval requested"
            "ROLE_POLICY_ROLLOUT_APPROVED" -> "Workflow rollout approval granted"
            "ROLE_POLICY_ROLLOUT_DENIED" -> "Workflow rollout approval denied"
            "ROLE_POLICY_ROLLOUT_SCOPE_EXPANDED" -> "Workflow rollout scope expanded"
            "ROLE_POLICY_ROLLOUT_PROMOTION_BLOCKED" -> "Workflow rollout promotion blocked pending governance checks"
            "ROLE_POLICY_ROLLOUT_RESTORED_LAST_SAFE" -> "Workflow rollout restored the last safe state"
            "ROLE_POLICY_ROLLOUT_GUARDRAIL_BLOCKED" -> "Workflow rollout guardrails blocked stronger enforcement"
            "ROLE_POLICY_PROMOTION_REQUESTED" -> "Policy promotion request was recorded"
            "ROLE_POLICY_PROMOTION_APPROVED" -> "Policy promotion was approved"
            "ROLE_POLICY_PROMOTION_REJECTED" -> "Policy promotion was rejected"
            "ROLE_POLICY_PROMOTION_BLOCKED" -> "Policy promotion is blocked by readiness or governance checks"
            "ROLE_POLICY_ROLLOUT_ADVANCE_ALLOWED" -> "Policy rollout advance is allowed by current readiness"
            "ROLE_POLICY_ROLLOUT_ADVANCE_DENIED" -> "Policy rollout advance is denied by current blockers"
            "ROLE_POLICY_APPROVAL_REQUIRED" -> "Policy promotion requires approval"
            "ROLE_POLICY_APPROVAL_PENDING" -> "Policy approval is pending"
            "ROLE_POLICY_APPROVAL_GRANTED" -> "Policy approval was granted"
            "ROLE_POLICY_APPROVAL_DENIED" -> "Policy approval was denied"
            "ROLE_POLICY_SIMULATION_EVIDENCE_INSUFFICIENT" -> "Simulation evidence is insufficient for promotion"
            "ROLE_POLICY_ANALYTICS_RECOMMENDATION_HOLD" -> "Policy analytics recommend holding promotion"
            "ROLE_POLICY_ANALYTICS_RECOMMENDATION_ADVANCE" -> "Policy analytics recommend advancing rollout"
            "ROLE_POLICY_ANALYTICS_RECOMMENDATION_ROLLBACK" -> "Policy analytics recommend rollback"
            "ROLE_POLICY_PROGRAM_CREATED" -> "Policy governance program was created"
            "ROLE_POLICY_PROGRAM_WAVE_ADVANCED" -> "Policy governance wave advanced"
            "ROLE_POLICY_PROGRAM_WAVE_PAUSED" -> "Policy governance wave paused"
            "ROLE_POLICY_TARGET_EXEMPTED" -> "A rollout target was exempted"
            "ROLE_POLICY_TARGET_UNEXEMPTED" -> "A rollout target exemption was removed"
            "ROLE_POLICY_TARGET_PINNED" -> "A rollout target was pinned to a pack version"
            "ROLE_POLICY_TARGET_UNPINNED" -> "A rollout target pin was removed"
            "ROLE_POLICY_PACK_DEPRECATED" -> "Policy pack was marked as deprecated"
            "ROLE_POLICY_PACK_RETIREMENT_STARTED" -> "Policy pack retirement started"
            "ROLE_POLICY_PACK_REPLACEMENT_ATTACHED" -> "Policy pack replacement plan was attached"
            "ROLE_POLICY_DRIFT_DETECTED" -> "Cross-tenant policy drift was detected"
            "ROLE_POLICY_RETIREMENT_BLOCKED" -> "Policy pack retirement is blocked by active pins or exemptions"
            "ROLE_POLICY_CROSS_TENANT_ROLLOUT_HELD" -> "Cross-tenant rollout is held pending readiness blockers"
            "ROLE_POLICY_ESTATE_SNAPSHOT_COMPUTED" -> "Policy estate snapshot was recomputed from durable governance records"
            "ROLE_POLICY_ESTATE_DRIFT_SEVERITY_LOW" -> "Policy estate drift severity is low"
            "ROLE_POLICY_ESTATE_DRIFT_SEVERITY_MEDIUM" -> "Policy estate drift severity is medium"
            "ROLE_POLICY_ESTATE_DRIFT_SEVERITY_HIGH" -> "Policy estate drift severity is high"
            "ROLE_POLICY_ESTATE_DRIFT_SEVERITY_CRITICAL" -> "Policy estate drift severity is critical"
            "ROLE_POLICY_ESTATE_REMEDIATION_RECOMMENDED" -> "Policy estate remediation is recommended"
            "ROLE_POLICY_ESTATE_REMEDIATION_PLAN_ATTACHED" -> "Policy estate remediation plan attached"
            "ROLE_POLICY_ESTATE_BLOCKER_ACKNOWLEDGED" -> "Policy estate blocker acknowledged"
            "ROLE_POLICY_ESTATE_REMEDIATION_SCHEDULED" -> "Policy estate remediation scheduled"
            "ROLE_POLICY_ESTATE_REMEDIATION_APPLIED" -> "Policy estate remediation applied"
            "ROLE_POLICY_ESTATE_REMEDIATION_DEFERRED" -> "Policy estate remediation deferred"
            "ROLE_ESTATE_AUTOMATION_ELIGIBLE" -> "Estate automation is eligible under current guardrails"
            "ROLE_ESTATE_AUTOMATION_BLOCKED" -> "Estate automation is blocked by guardrails"
            "ROLE_ESTATE_AUTOMATION_SUPPRESSED" -> "Estate automation is suppressed by policy/runtime state"
            "ROLE_ESTATE_AUTOMATION_COOLDOWN" -> "Estate automation is in cooldown"
            "ROLE_ESTATE_AUTOMATION_WINDOW_BLOCKED" -> "Estate automation is outside the maintenance window"
            "ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED" -> "Estate automation requires explicit approval"
            "ROLE_ESTATE_AUTOMATION_SCHEDULED" -> "Estate automation has been scheduled"
            "ROLE_ESTATE_AUTOMATION_EXECUTED" -> "Estate automation executed successfully"
            "ROLE_ESTATE_AUTOMATION_PAUSED" -> "Estate automation schedule is paused"
            "ROLE_ESTATE_AUTOMATION_RESUMED" -> "Estate automation schedule resumed"
            "ROLE_ESTATE_AUTOMATION_CANCELLED" -> "Estate automation schedule was cancelled"
            "ROLE_SCHEDULE_WINDOW_ACTIVE" -> "Schedule window is active for this rollout stage"
            "ROLE_SCHEDULE_BLOCKED_BY_BLACKOUT" -> "Schedule blocked by blackout window"
            "ROLE_SCHEDULE_WAITING_FOR_MAINTENANCE_WINDOW" -> "Waiting for maintenance window before rollout can continue"
            "ROLE_SCHEDULE_COOLDOWN_ACTIVE" -> "Schedule cooldown is active"
            "ROLE_SCHEDULE_EXPIRED" -> "Scheduled rollout window expired"
            "ROLE_ROLLOUT_STAGE_DEFERRED_BY_CALENDAR" -> "Rollout stage deferred by rollout calendar"
            "ROLE_ROLLOUT_STAGE_ADVANCED_IN_WINDOW" -> "Rollout stage advanced inside allowed schedule window"
            "ROLE_AUTOMATION_SUPPRESSED_BY_SCHEDULE" -> "Automation suppressed by schedule governance"
            "ROLE_AUTOMATION_SIMULATION_ONLY" -> "Automation evaluated in simulation-only mode"
            "ROLE_ROLLOUT_WAVE_ASSIGNED" -> "Rollout wave assignment is active for this promotion step"
            "ROLE_ROLLOUT_WAVE_BLOCKED" -> "Current rollout wave is blocked by ordering or window controls"
            "ROLE_ROLLOUT_WAVE_PARTIAL_COMPLETION" -> "Current rollout wave is partially complete"
            "ROLE_ROLLOUT_WAVE_CARRIED_FORWARD" -> "Pending rollout wave scope was carried forward"
            "ROLE_PROMOTION_WINDOW_BLOCKED" -> "Promotion is blocked in the current window"
            "ROLE_PROMOTION_WINDOW_DEFERRED" -> "Promotion is deferred to a future eligible window"
            "ROLE_PROMOTION_WINDOW_EXPIRED" -> "Current promotion window expired before completion"
            "ROLE_PROMOTION_NEXT_WINDOW_SELECTED" -> "Next eligible promotion window was selected"
            "ROLE_CROSS_WINDOW_PAUSED" -> "Cross-window rollout is paused by governance controls"
            "ROLE_CROSS_WINDOW_RESUMED" -> "Cross-window rollout has resumed"
            "ROLE_CROSS_WINDOW_WAITING_APPROVAL" -> "Cross-window rollout is waiting for approval"
            "ROLE_CROSS_WINDOW_MAINTENANCE_BLOCK" -> "Cross-window rollout is blocked by maintenance window policy"
            "ROLE_CROSS_WINDOW_BLACKOUT_BLOCK" -> "Cross-window rollout is blocked by blackout window policy"
            "ROLE_ROLLOUT_PROMOTION_READY" -> "Rollout promotion readiness is ready"
            "ROLE_ROLLOUT_PROMOTION_READY_WITH_CAUTION" -> "Rollout promotion readiness is ready with caution"
            "ROLE_ROLLOUT_PROMOTION_BLOCKED" -> "Rollout promotion readiness is blocked"
            "ROLE_ROLLOUT_PROMOTION_DEFERRED_TO_WINDOW" -> "Rollout promotion is deferred to the next eligible window"
            "ROLE_ROLLOUT_PROMOTION_EXPIRED" -> "Rollout promotion candidate expired before eligibility"
            "ROLE_ROLLOUT_WAVE_HEALTH_DEGRADED" -> "Cross-wave health is degraded"
            "ROLE_ROLLOUT_WAVE_HEALTH_STABLE" -> "Cross-wave health is stable"
            "ROLE_WINDOW_BLOCK_BLACKOUT" -> "Window impact blocked by blackout window"
            "ROLE_WINDOW_BLOCK_MAINTENANCE" -> "Window impact blocked by maintenance window"
            "ROLE_WINDOW_NEXT_ELIGIBLE_COMPUTED" -> "Next eligible promotion window was computed"
            "ROLE_CROSS_WAVE_BLOCKER_REPEAT" -> "Repeated blocker families detected across waves"
            "ROLE_CROSS_WAVE_CARRY_FORWARD_PRESSURE" -> "Carry-forward pressure is accumulating across waves"
            "ROLE_ROLLOUT_PROMOTION_OPERATION_PROMOTE" -> "Promotion operation recorded: promote"
            "ROLE_ROLLOUT_PROMOTION_OPERATION_HOLD" -> "Promotion operation recorded: hold"
            "ROLE_ROLLOUT_PROMOTION_OPERATION_DEFER" -> "Promotion operation recorded: defer"
            "ROLE_ROLLOUT_PROMOTION_OPERATION_PAUSE" -> "Promotion operation recorded: pause"
            "ROLE_ROLLOUT_PROMOTION_OPERATION_RESUME" -> "Promotion operation recorded: resume"
            "ROLE_ROLLOUT_PROMOTION_OPERATION_EXPIRE" -> "Promotion operation recorded: expire"
            "ROLE_ROLLOUT_PROGRAM_PRIORITY_APPLIED" -> "Program coordination applied deterministic rollout priority"
            "ROLE_ROLLOUT_PROGRAM_DEFERRED_BY_PRIORITY" -> "Program deferred by multi-program priority arbitration"
            "ROLE_ROLLOUT_PROGRAM_BLOCKED_BY_DEPENDENCY" -> "Program blocked by unresolved rollout dependency"
            "ROLE_ROLLOUT_PROGRAM_CONFLICT_DETECTED" -> "Program conflict detected in rollout coordination"
            "ROLE_ROLLOUT_PROGRAM_WINDOW_CONTENTION" -> "Program window contention detected"
            "ROLE_ROLLOUT_PROGRAM_ESCALATION_OPENED" -> "Program escalation opened for rollout coordination blockers"
            "ROLE_ROLLOUT_PROGRAM_ESCALATION_RESOLVED" -> "Program escalation resolved after coordination recovery"
            "ROLE_ROLLOUT_PROGRAM_CAPACITY_BLOCKED" -> "Program blocked by rollout capacity contention"
            "ROLE_GOVERNANCE_CAPACITY_DEFERRED" -> "Approval flow deferred because governance capacity is constrained"
            "ROLE_GOVERNANCE_CAPACITY_REASSIGNED" -> "Approval work was reassigned to balance governance capacity"
            "ROLE_GOVERNANCE_CAPACITY_BLOCKED" -> "Approval flow is blocked by governance capacity limits"
            "ROLE_GOVERNANCE_CAPACITY_RESUMED" -> "Approval flow resumed after governance capacity recovered"
            "ROLE_GOVERNANCE_PORTFOLIO_PRIORITIZED" -> "Portfolio priority was applied for capacity-aware scheduling"
            "ROLE_GOVERNANCE_APPROVAL_QUEUE_SATURATED" -> "Approval queue is saturated"
            "ROLE_GOVERNANCE_APPROVAL_LOAD_BALANCED" -> "Approval load balancing was applied"
            "ROLE_GOVERNANCE_CRITICAL_PROGRAM_RESERVED" -> "Critical program reserve consumed governance capacity"
            "ROLE_PORTFOLIO_SIMULATION_RUN_CREATED" -> "Portfolio simulation run created"
            "ROLE_PORTFOLIO_SIMULATION_BASELINE_DERIVED" ->
                "Simulation baseline derived from durable governance records"
            "ROLE_PORTFOLIO_SIMULATION_CAPACITY_BREACH_PREDICTED" ->
                "Simulation predicts approval capacity breach"
            "ROLE_PORTFOLIO_SIMULATION_BACKLOG_GROWTH_PREDICTED" ->
                "Simulation predicts sustained backlog growth"
            "ROLE_PORTFOLIO_SIMULATION_COMPLETION_DELAY_PREDICTED" ->
                "Simulation predicts program completion delay"
            "ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_SHIFT_WINDOW" ->
                "Simulation recommends shifting rollout windows"
            "ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_REDUCE_WAVE_SIZE" ->
                "Simulation recommends reducing wave/cohort size"
            "ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY" ->
                "Simulation recommends increasing approval capacity"
            "ROLE_PORTFOLIO_OPTIMIZATION_RUN_CREATED" ->
                "Portfolio optimization run created"
            "ROLE_PORTFOLIO_OPTIMIZATION_CANDIDATE_GENERATED" ->
                "Portfolio optimization generated a candidate schedule"
            "ROLE_PORTFOLIO_OPTIMIZATION_SCHEDULE_SELECTED" ->
                "Portfolio optimization schedule was selected"
            "ROLE_PORTFOLIO_OPTIMIZATION_CAPACITY_CONSTRAINT_BOUND" ->
                "Optimization was bounded by approval or automation capacity"
            "ROLE_PORTFOLIO_OPTIMIZATION_WINDOW_CONSTRAINT_BOUND" ->
                "Optimization was bounded by blackout or maintenance windows"
            "ROLE_PORTFOLIO_OPTIMIZATION_DEPENDENCY_CONSTRAINT_BOUND" ->
                "Optimization was bounded by program or wave dependencies"
            "ROLE_PORTFOLIO_OPTIMIZATION_READINESS_CONSTRAINT_BOUND" ->
                "Optimization was bounded by rollout readiness gating"
            "ROLE_PORTFOLIO_OPTIMIZATION_GUARDRAIL_CONSTRAINT_BOUND" ->
                "Optimization was bounded by policy guardrails"
            "ROLE_PORTFOLIO_OPTIMIZATION_RISK_LIMIT_BOUND" ->
                "Optimization held back risky promotions to stay within risk limits"
            "ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_RISK_FOR_THROUGHPUT" ->
                "Optimization traded higher risk for higher throughput"
            "ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_THROUGHPUT_FOR_RISK" ->
                "Optimization traded throughput for lower risk"
            "ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_SLA_FOR_STABILITY" ->
                "Optimization traded schedule stability for stronger SLA recovery"
            "ROLE_PORTFOLIO_LEARNING_OUTCOME_RECORDED" ->
                "Portfolio optimization outcome feedback was recorded"
            "ROLE_PORTFOLIO_LEARNING_DRIFT_DETECTED" ->
                "Portfolio optimization drift was detected against the selected schedule"
            "ROLE_PORTFOLIO_LEARNING_TUNING_SUGGESTED" ->
                "Portfolio optimization tuning was suggested for review"
            "ROLE_PORTFOLIO_LEARNING_TUNING_APPLIED" ->
                "Portfolio optimization tuning was applied to a new calibration snapshot"
            "ROLE_PORTFOLIO_LEARNING_TUNING_DENIED" ->
                "Portfolio optimization tuning suggestion was denied"
            "ROLE_PORTFOLIO_LEARNING_TUNING_BLOCKED_GUARDRAIL" ->
                "Portfolio optimization tuning was blocked by guardrails"
            "ROLE_PORTFOLIO_LEARNING_INSUFFICIENT_EVIDENCE" ->
                "Portfolio optimization learning has insufficient evidence to tune safely"
            "ROLE_LEARNING_SYNC_ENQUEUED" ->
                "Portfolio learning sync was queued for artifact export/import"
            "ROLE_LEARNING_SYNC_BLOCKED_BY_PRIVACY" ->
                "Portfolio learning sync was blocked by privacy policy"
            "ROLE_LEARNING_SYNC_BLOCKED_BY_ROLE_POLICY" ->
                "Portfolio learning sync was blocked by role policy"
            "ROLE_LEARNING_SYNC_DELIVERED" ->
                "Portfolio learning sync delivered redacted learning artifacts"
            "ROLE_LEARNING_SYNC_FAILED" ->
                "Portfolio learning sync failed"
            "ROLE_LEARNING_SYNC_CONFLICT_DETECTED" ->
                "Portfolio learning sync detected an artifact conflict"
            "ROLE_LEARNING_SYNC_CONFLICT_RESOLVED" ->
                "Portfolio learning sync resolved a safe artifact conflict deterministically"
            "ROLE_CONSENT_GRANTED" ->
                "Portfolio learning consent was granted with typed provenance"
            "ROLE_CONSENT_DENIED" ->
                "Portfolio learning consent was denied or is still pending"
            "ROLE_CONSENT_REVOKED" ->
                "Portfolio learning consent was revoked"
            "ROLE_CONSENT_EXPIRED" ->
                "Portfolio learning consent expired and must be renewed"
            "ROLE_REMOTE_LEARNING_TRANSPORT_LOCAL_ONLY" ->
                "Remote learning transport remained local-first and did not leave the device"
            "ROLE_REMOTE_LEARNING_TRANSPORT_QUEUED" ->
                "Remote learning transport queued a redacted artifact batch for delivery"
            "ROLE_REMOTE_LEARNING_TRANSPORT_FAILED" ->
                "Remote learning transport failed to deliver the redacted artifact batch"
            "ROLE_REMOTE_LEARNING_TRANSPORT_ACKED" ->
                "Remote learning transport received a durable acknowledgement"
            "ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_CONSENT" ->
                "Remote learning transport was blocked by consent gating"
            "ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_ROLE_POLICY" ->
                "Remote learning transport was blocked by role or privacy policy"
            "ROLE_REMOTE_TRANSPORT_CONNECTOR_SELECTED" ->
                "Remote learning transport selected a production connector profile deterministically"
            "ROLE_REMOTE_TRANSPORT_CONNECTOR_DEGRADED" ->
                "Remote learning connector health is degraded or unhealthy"
            "ROLE_REMOTE_TRANSPORT_DELIVERY_RETRIED" ->
                "Remote learning transport scheduled a bounded retry"
            "ROLE_REMOTE_TRANSPORT_DELIVERY_DEAD_LETTERED" ->
                "Remote learning transport exhausted retries and moved the batch to dead-letter"
            "ROLE_REMOTE_TRANSPORT_DELIVERY_DEDUPED" ->
                "Remote learning transport suppressed a duplicate batch by idempotency key"
            "ROLE_ENTERPRISE_KEY_HEALTH_BLOCKED" ->
                "Enterprise key or credential state blocked remote learning transport"
            "ROLE_ENTERPRISE_KEY_ROTATION_REQUIRED" ->
                "Enterprise key rotation is required before remote learning transport can proceed safely"
            "ROLE_ENTERPRISE_KEY_REVOKED" ->
                "Enterprise key was revoked and blocked remote learning transport"
            "ROLE_COMPLIANCE_GATE_BLOCKED" ->
                "Compliance gate blocked the requested learning transport or export"
            "ROLE_COMPLIANCE_EXPORT_ALLOWED" ->
                "Compliance gate allowed a purpose-limited audit export"
            "ROLE_COMPLIANCE_EXPORT_REDACTION_ENFORCED" ->
                "Compliance export enforced redaction-first artifact-only output"
            "ROLE_REMOTE_TRANSPORT_LOCAL_FALLBACK_USED" ->
                "Remote learning transport fell back to local-first handling after connector or key issues"
            "ROLE_COMPLIANCE_EXPORT_REQUESTED" ->
                "Compliance audit export request was recorded"
            "ROLE_COMPLIANCE_EXPORT_GENERATED" ->
                "Compliance audit export was generated with redaction-first controls"
            "ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_CONSENT" ->
                "Compliance audit export was blocked by consent gating"
            "ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_POLICY" ->
                "Compliance audit export was blocked by role or privacy policy"
            "ROLE_REMOTE_DESTINATION_ROUTED" ->
                "Remote learning destination routing selected a compliant destination"
            "ROLE_REMOTE_DESTINATION_REROUTED" ->
                "Remote learning destination routing rerouted to a safer compliant destination"
            "ROLE_REMOTE_DESTINATION_HELD" ->
                "Remote learning destination routing is held for compliance review"
            "ROLE_REMOTE_DESTINATION_SUPPRESSED" ->
                "Remote learning destination routing was suppressed by destination policy"
            "ROLE_REMOTE_DESTINATION_BLOCKED_BY_RESIDENCY" ->
                "Remote learning destination routing was blocked by data residency policy"
            "ROLE_REMOTE_DESTINATION_BLOCKED_BY_JURISDICTION" ->
                "Remote learning destination routing was blocked by jurisdiction policy"
            "ROLE_REMOTE_DESTINATION_BLOCKED_BY_POLICY" ->
                "Remote learning destination routing was blocked by destination policy"
            "ROLE_COMPLIANCE_EXPORT_ROUTE_SELECTED" ->
                "Compliance export route selected a compliant archive destination"
            "ROLE_COMPLIANCE_EXPORT_ROUTE_REROUTED" ->
                "Compliance export route rerouted to remain policy-safe"
            "ROLE_COMPLIANCE_EXPORT_ROUTE_HELD" ->
                "Compliance export route is held for compliance review"
            "ROLE_COMPLIANCE_EXPORT_ROUTE_LOCAL_ONLY" ->
                "Compliance export route remained local-first because no compliant remote route was available"
            "ROLE_DESTINATION_BUNDLE_ALLOWED" ->
                "Cross-boundary data-exchange bundle was allowed under current boundary policy"
            "ROLE_DESTINATION_BUNDLE_SPLIT" ->
                "Cross-boundary data-exchange bundle was split so local-only artifacts stayed on-device"
            "ROLE_DESTINATION_BUNDLE_REDACTED" ->
                "Cross-boundary data-exchange bundle enforced redaction-first handling"
            "ROLE_DESTINATION_BUNDLE_REROUTED" ->
                "Cross-boundary data-exchange bundle rerouted to a safer destination"
            "ROLE_DESTINATION_BUNDLE_HELD" ->
                "Cross-boundary data-exchange bundle is held for explicit review"
            "ROLE_DESTINATION_BUNDLE_SUPPRESSED" ->
                "Cross-boundary data-exchange bundle was suppressed by higher-precedence policy"
            "ROLE_DESTINATION_BUNDLE_BLOCKED" ->
                "Cross-boundary data-exchange bundle was blocked by boundary policy"
            "ROLE_DESTINATION_BUNDLE_APPROVAL_PENDING" ->
                "Cross-boundary data-exchange bundle approval is pending review"
            "ROLE_DESTINATION_BUNDLE_AUTO_APPROVED" ->
                "Cross-boundary data-exchange bundle was auto-approved within safe bounds"
            "ROLE_CROSS_BOUNDARY_AUDIT_RECORDED" ->
                "Cross-boundary audit evidence was recorded durably"
            "ROLE_RESIDENCY_BOUNDARY_BLOCKED" ->
                "Cross-boundary exchange was blocked by data residency boundary policy"
            "ROLE_JURISDICTION_BOUNDARY_BLOCKED" ->
                "Cross-boundary exchange was blocked by jurisdiction boundary policy"
            "ROLE_DESTINATION_POLICY_BLOCKED" ->
                "Cross-boundary exchange was blocked by destination bundle policy"
            "ROLE_FEDERATED_AGGREGATION_APPLIED" ->
                "Federated aggregation applied within the allowed enterprise boundary"
            "ROLE_FEDERATED_AGGREGATION_DENIED" ->
                "Federated aggregation was denied by boundary policy"
            "ROLE_DESTINATION_TRUST_TIER_ASSIGNED" ->
                "Destination trust tier was assigned for cross-boundary rollout sequencing"
            "ROLE_DESTINATION_TRUST_TIER_DEFERRED" ->
                "Destination trust tier rollout was deferred by governance portfolio sequencing"
            "ROLE_DESTINATION_TRUST_TIER_RESTRICTED" ->
                "Destination trust tier rollout was restricted by governance protections"
            "ROLE_JURISDICTION_ROLLOUT_RESEQUENCED" ->
                "Jurisdiction rollout order was resequenced to preserve policy-safe progression"
            "ROLE_JURISDICTION_ROLLOUT_SPLIT_RECOMMENDED" ->
                "Jurisdiction rollout split was recommended to isolate conflicting boundary conditions"
            "ROLE_CROSS_BOUNDARY_PORTFOLIO_PRIORITY_SELECTED" ->
                "Cross-boundary governance portfolio selected a deterministic rollout priority"
            "ROLE_CROSS_BOUNDARY_PORTFOLIO_RECOMMENDATION_UPDATED" ->
                "Cross-boundary governance portfolio updated its next-action recommendation"
            "ROLE_CROSS_BOUNDARY_PORTFOLIO_SHARED_BLOCKER_DETECTED" ->
                "Cross-boundary governance portfolio detected a shared blocker across programs"
            "ROLE_CROSS_BOUNDARY_PORTFOLIO_CONFLICT_OPENED" ->
                "Cross-boundary governance portfolio opened a coordination conflict for review"
            "ROLE_CROSS_BOUNDARY_PORTFOLIO_ANALYTICS_UPDATED" ->
                "Cross-boundary governance portfolio analytics were refreshed from durable records"
            "ROLE_TRUST_TIER_DRIFT_DETECTED" ->
                "Trust-tier drift was detected for the cross-boundary governance portfolio"
            "ROLE_JURISDICTION_DRIFT_DETECTED" ->
                "Jurisdiction drift was detected for the cross-boundary governance portfolio"
            "ROLE_RISK_BUDGET_UPDATED" ->
                "Cross-boundary governance portfolio risk budget was updated"
            "ROLE_RISK_BUDGET_BREACHED" ->
                "Cross-boundary governance portfolio risk budget is breached"
            "ROLE_PORTFOLIO_SAFETY_AT_RISK" ->
                "Cross-boundary governance portfolio safety rails are signaling at-risk conditions"
            "ROLE_PORTFOLIO_SAFETY_GUARDED" ->
                "Cross-boundary governance portfolio safety rails are enforcing guarded rollout"
            "ROLE_PORTFOLIO_SAFETY_QUARANTINED" ->
                "Cross-boundary governance portfolio safety rails quarantined broader rollout"
            "ROLE_PORTFOLIO_BUDGET_WARNING" ->
                "Cross-boundary governance portfolio budget guardrail issued a warning"
            "ROLE_PORTFOLIO_BUDGET_SOFT_STOP" ->
                "Cross-boundary governance portfolio budget guardrail triggered a soft stop"
            "ROLE_PORTFOLIO_BUDGET_HARD_STOP" ->
                "Cross-boundary governance portfolio budget guardrail triggered a hard stop"
            "ROLE_REMEDIATION_AUTOMATION_ALLOWED" ->
                "Portfolio remediation automation remains allowed within current safety bounds"
            "ROLE_REMEDIATION_AUTOMATION_THROTTLED" ->
                "Portfolio remediation automation is throttled by current safety controls"
            "ROLE_REMEDIATION_AUTOMATION_SUPPRESSED" ->
                "Portfolio remediation automation is suppressed by current safety controls"
            "ROLE_REMEDIATION_AUTOMATION_COOLDOWN_ACTIVE" ->
                "Portfolio remediation automation is cooling down after a recent corrective action"
            "ROLE_REMEDIATION_AUTOMATION_APPROVAL_REQUIRED" ->
                "Portfolio remediation automation requires explicit approval"
            "ROLE_PORTFOLIO_QUARANTINE_APPLIED" ->
                "Cross-boundary governance portfolio quarantine is active for remediation and rollout"
            "ROLE_PORTFOLIO_CORRECTIVE_RECOMMENDATION_ISSUED" ->
                "Cross-boundary governance portfolio issued a corrective recommendation"
            "ROLE_PORTFOLIO_CORRECTIVE_ACTION_RECORDED" ->
                "Cross-boundary governance portfolio recorded a corrective action"
            "ROLE_LEARNING_SCOPE_RESOLVED" ->
                "Portfolio objective profile scope was resolved deterministically"
            "ROLE_LEARNING_ISOLATION_ENFORCED" ->
                "Portfolio learning isolation blocked cross-tenant contamination"
            "ROLE_LEARNING_PROPAGATION_ELIGIBLE" ->
                "Portfolio objective profile propagation is eligible for promotion"
            "ROLE_LEARNING_PROPAGATION_BLOCKED" ->
                "Portfolio objective profile propagation was blocked"
            "ROLE_LEARNING_PROPAGATION_APPROVAL_REQUIRED" ->
                "Portfolio objective profile propagation requires approval before adoption"
            "ROLE_LEARNING_PROPAGATION_APPROVED" ->
                "Portfolio objective profile propagation was approved"
            "ROLE_LEARNING_PROPAGATION_REJECTED" ->
                "Portfolio objective profile propagation was rejected"
            "ROLE_LEARNING_PATCH_ADOPTED" ->
                "Portfolio objective profile patch was adopted into a higher scope"
            "ROLE_LEARNING_PATCH_ROLLED_BACK" ->
                "Portfolio objective profile patch was rolled back"
            "ROLE_LEARNING_PROPAGATION_SUPPRESSED_BY_DRIFT" ->
                "Portfolio objective profile propagation was suppressed by drift"
            else -> code
                .trim()
                .lowercase(Locale.getDefault())
                .replace('_', ' ')
                .replaceFirstChar { it.uppercase() }
        }
    }
}
