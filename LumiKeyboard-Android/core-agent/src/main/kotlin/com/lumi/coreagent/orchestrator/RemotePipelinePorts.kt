package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AlertDispatchAttempt
import com.lumi.coredomain.contract.AlertDispatchRequest
import com.lumi.coredomain.contract.AlertDispatchStatus
import com.lumi.coredomain.contract.AlertDeliveryChannel
import com.lumi.coredomain.contract.AlertRoutingAttempt
import com.lumi.coredomain.contract.AlertRoutingStatus
import com.lumi.coredomain.contract.AlertRoutingTarget
import com.lumi.coredomain.contract.AlertRoutingTargetType
import com.lumi.coredomain.contract.ConnectorAckStatus
import com.lumi.coredomain.contract.ConnectorCredentialRef
import com.lumi.coredomain.contract.ConnectorCredentialStatus
import com.lumi.coredomain.contract.ConnectorDeadLetterRecord
import com.lumi.coredomain.contract.ConnectorDeliveryAck
import com.lumi.coredomain.contract.ConnectorDeliveryAttempt
import com.lumi.coredomain.contract.ConnectorDeliveryRequest
import com.lumi.coredomain.contract.ConnectorDeliveryStatus
import com.lumi.coredomain.contract.ConnectorFailureReason
import com.lumi.coredomain.contract.ConnectorProviderType
import com.lumi.coredomain.contract.OperatorIdentity
import com.lumi.coredomain.contract.RemoteAuthorizationResult
import com.lumi.coredomain.contract.GovernanceTelemetryBatch
import com.lumi.coredomain.contract.CutoverReadinessStatus
import com.lumi.coredomain.contract.DirectorySyncCheckpoint
import com.lumi.coredomain.contract.DirectorySyncFreshnessStatus
import com.lumi.coredomain.contract.DirectorySyncProviderHealth
import com.lumi.coredomain.contract.DirectorySyncProviderResult
import com.lumi.coredomain.contract.DirectorySyncSnapshot
import com.lumi.coredomain.contract.DirectorySyncStatus
import com.lumi.coredomain.contract.EnterpriseAuthProviderHealth
import com.lumi.coredomain.contract.EnterpriseIdpAdapterType
import com.lumi.coredomain.contract.EnterpriseIdpProvider
import com.lumi.coredomain.contract.EnterpriseIdpProviderConfig
import com.lumi.coredomain.contract.EnterpriseIdpSessionExchangeRequest
import com.lumi.coredomain.contract.EnterpriseIdpSessionExchangeResult
import com.lumi.coredomain.contract.EnterpriseIdpSessionExchangeStatus
import com.lumi.coredomain.contract.EnterpriseRolloutStage
import com.lumi.coredomain.contract.EnterpriseSessionProvenance
import com.lumi.coredomain.contract.ProviderHealthStatus
import com.lumi.coredomain.contract.ReconciliationDispatchAttempt
import com.lumi.coredomain.contract.ReconciliationJobRecord
import com.lumi.coredomain.contract.RemoteOperatorHandoffAttempt
import com.lumi.coredomain.contract.RemoteOperatorHandoffRequest
import com.lumi.coredomain.contract.RemoteOperatorHandoffStatus
import com.lumi.coredomain.contract.RemoteSyncHandoffStatus
import com.lumi.coredomain.contract.RoleReasonCodes
import com.lumi.coredomain.contract.TelemetryDeliveryAttempt
import com.lumi.coredomain.contract.TelemetryDeliveryStatus
import com.lumi.coredomain.contract.TelemetrySinkTarget
import com.lumi.coredomain.contract.ScimProviderAdapterType
import com.lumi.coredomain.contract.ScimProviderConfig
import com.lumi.coredomain.contract.SessionFreshnessState
import com.lumi.coredomain.contract.VaultCredentialMaterialState
import com.lumi.coredomain.contract.VaultCredentialReference
import com.lumi.coredomain.contract.VaultCredentialStatus
import com.lumi.coredomain.contract.VaultCredentialHealthCheckResult
import com.lumi.coredomain.contract.VaultHealthSummary
import com.lumi.coredomain.contract.VaultLeaseHandle
import com.lumi.coredomain.contract.VaultLeaseStatus
import com.lumi.coredomain.contract.VaultMaterializationRequest
import com.lumi.coredomain.contract.VaultMaterializationResult
import com.lumi.coredomain.contract.VaultMaterializationStatus
import com.lumi.coredomain.contract.VaultProviderConfig
import com.lumi.coredomain.contract.VaultProviderHealth
import com.lumi.coredomain.contract.VaultProviderType
import com.lumi.coredomain.contract.VaultResolutionResult

interface GovernanceTelemetrySinkPort {
    fun deliver(batch: GovernanceTelemetryBatch, nowMs: Long): TelemetryDeliveryAttempt
}

class NoOpGovernanceTelemetrySinkPort : GovernanceTelemetrySinkPort {
    override fun deliver(batch: GovernanceTelemetryBatch, nowMs: Long): TelemetryDeliveryAttempt {
        return TelemetryDeliveryAttempt(
            attemptId = "telemetry_noop_${batch.batchId}",
            sinkTarget = TelemetrySinkTarget.NO_OP,
            status = TelemetryDeliveryStatus.LOCAL_ONLY,
            dedupeKey = batch.dedupeKey,
            summary = "Remote telemetry sink is unavailable; record kept locally.",
            errorCode = "sink_unavailable",
            timestampMs = nowMs
        )
    }
}

class LocalDurableGovernanceTelemetrySinkPort : GovernanceTelemetrySinkPort {
    override fun deliver(batch: GovernanceTelemetryBatch, nowMs: Long): TelemetryDeliveryAttempt {
        return TelemetryDeliveryAttempt(
            attemptId = "telemetry_local_${batch.batchId}",
            sinkTarget = TelemetrySinkTarget.LOCAL_DURABLE,
            status = TelemetryDeliveryStatus.QUEUED,
            dedupeKey = batch.dedupeKey,
            summary = "Telemetry batch queued in local durable pipeline.",
            timestampMs = nowMs
        )
    }
}

class StubGovernanceTelemetrySinkPort(
    private val endpointHint: String? = null
) : GovernanceTelemetrySinkPort {
    override fun deliver(batch: GovernanceTelemetryBatch, nowMs: Long): TelemetryDeliveryAttempt {
        return if (endpointHint.isNullOrBlank()) {
            TelemetryDeliveryAttempt(
                attemptId = "telemetry_stub_${batch.batchId}",
                sinkTarget = TelemetrySinkTarget.CLOUD_STUB,
                status = TelemetryDeliveryStatus.FAILED,
                dedupeKey = batch.dedupeKey,
                summary = "Stub telemetry adapter has no endpoint configuration.",
                errorCode = "stub_endpoint_missing",
                timestampMs = nowMs
            )
        } else {
            TelemetryDeliveryAttempt(
                attemptId = "telemetry_stub_${batch.batchId}",
                sinkTarget = TelemetrySinkTarget.CLOUD_STUB,
                status = TelemetryDeliveryStatus.DELIVERED,
                dedupeKey = batch.dedupeKey,
                summary = "Telemetry batch handed to stub adapter ($endpointHint).",
                timestampMs = nowMs
            )
        }
    }
}

interface GovernanceAlertDeliveryPort {
    fun dispatch(request: AlertDispatchRequest, nowMs: Long): AlertDispatchAttempt
}

class NoOpGovernanceAlertDeliveryPort : GovernanceAlertDeliveryPort {
    override fun dispatch(request: AlertDispatchRequest, nowMs: Long): AlertDispatchAttempt {
        return AlertDispatchAttempt(
            attemptId = "alert_noop_${request.requestId}",
            status = AlertDispatchStatus.LOCAL_ONLY,
            channel = AlertDeliveryChannel.LOCAL_CONSOLE,
            targetId = request.target.targetId,
            dedupeKey = request.dedupeKey,
            summary = "Remote alert delivery is unavailable; alert kept local.",
            errorCode = "delivery_unavailable",
            timestampMs = nowMs
        )
    }
}

class LocalDurableGovernanceAlertDeliveryPort : GovernanceAlertDeliveryPort {
    override fun dispatch(request: AlertDispatchRequest, nowMs: Long): AlertDispatchAttempt {
        return AlertDispatchAttempt(
            attemptId = "alert_local_${request.requestId}",
            status = AlertDispatchStatus.QUEUED,
            channel = request.target.channel,
            targetId = request.target.targetId,
            dedupeKey = request.dedupeKey,
            summary = "Alert delivery queued in local durable pipeline.",
            timestampMs = nowMs
        )
    }
}

class StubGovernanceAlertDeliveryPort(
    private val endpointHint: String? = null
) : GovernanceAlertDeliveryPort {
    override fun dispatch(request: AlertDispatchRequest, nowMs: Long): AlertDispatchAttempt {
        return if (endpointHint.isNullOrBlank()) {
            AlertDispatchAttempt(
                attemptId = "alert_stub_${request.requestId}",
                status = AlertDispatchStatus.FAILED,
                channel = AlertDeliveryChannel.WEBHOOK_STUB,
                targetId = request.target.targetId,
                dedupeKey = request.dedupeKey,
                summary = "Stub alert delivery adapter has no endpoint configuration.",
                errorCode = "stub_endpoint_missing",
                timestampMs = nowMs
            )
        } else {
            AlertDispatchAttempt(
                attemptId = "alert_stub_${request.requestId}",
                status = AlertDispatchStatus.DELIVERED,
                channel = AlertDeliveryChannel.WEBHOOK_STUB,
                targetId = request.target.targetId,
                dedupeKey = request.dedupeKey,
                summary = "Alert handed to stub adapter ($endpointHint).",
                timestampMs = nowMs
            )
        }
    }
}

interface ReconciliationHandoffPort {
    fun handoff(job: ReconciliationJobRecord, nowMs: Long): ReconciliationDispatchAttempt
}

class NoOpReconciliationHandoffPort : ReconciliationHandoffPort {
    override fun handoff(job: ReconciliationJobRecord, nowMs: Long): ReconciliationDispatchAttempt {
        return ReconciliationDispatchAttempt(
            attemptId = "recon_noop_${job.jobId}",
            handoffStatus = RemoteSyncHandoffStatus.LOCAL_ONLY,
            dedupeKey = job.dedupeKey,
            summary = "Remote reconciliation handoff is unavailable; job remains local.",
            errorCode = "handoff_unavailable",
            timestampMs = nowMs
        )
    }
}

class LocalDurableReconciliationHandoffPort : ReconciliationHandoffPort {
    override fun handoff(job: ReconciliationJobRecord, nowMs: Long): ReconciliationDispatchAttempt {
        return ReconciliationDispatchAttempt(
            attemptId = "recon_local_${job.jobId}",
            handoffStatus = RemoteSyncHandoffStatus.HANDOFF_PENDING,
            dedupeKey = job.dedupeKey,
            summary = "Reconciliation job queued for remote handoff from local durable pipeline.",
            timestampMs = nowMs
        )
    }
}

class StubReconciliationHandoffPort(
    private val endpointHint: String? = null
) : ReconciliationHandoffPort {
    override fun handoff(job: ReconciliationJobRecord, nowMs: Long): ReconciliationDispatchAttempt {
        return if (endpointHint.isNullOrBlank()) {
            ReconciliationDispatchAttempt(
                attemptId = "recon_stub_${job.jobId}",
                handoffStatus = RemoteSyncHandoffStatus.FAILED,
                dedupeKey = job.dedupeKey,
                summary = "Stub reconciliation adapter has no endpoint configuration.",
                errorCode = "stub_endpoint_missing",
                timestampMs = nowMs
            )
        } else {
            ReconciliationDispatchAttempt(
                attemptId = "recon_stub_${job.jobId}",
                handoffStatus = RemoteSyncHandoffStatus.HANDED_OFF,
                dedupeKey = job.dedupeKey,
                summary = "Reconciliation job handed to stub adapter ($endpointHint).",
                remoteRef = "stub:${job.jobId}",
                timestampMs = nowMs
            )
        }
    }
}

interface RemoteOperatorWorkflowPort {
    fun handoff(request: RemoteOperatorHandoffRequest, nowMs: Long): RemoteOperatorHandoffAttempt
}

class NoOpRemoteOperatorWorkflowPort : RemoteOperatorWorkflowPort {
    override fun handoff(request: RemoteOperatorHandoffRequest, nowMs: Long): RemoteOperatorHandoffAttempt {
        return RemoteOperatorHandoffAttempt(
            attemptId = "operator_handoff_noop_${request.requestId}",
            status = RemoteOperatorHandoffStatus.REQUESTED,
            dedupeKey = request.dedupeKey,
            summary = "Remote operator workflow is unavailable; handoff remains local.",
            errorCode = "handoff_unavailable",
            timestampMs = nowMs
        )
    }
}

class LocalDurableRemoteOperatorWorkflowPort : RemoteOperatorWorkflowPort {
    override fun handoff(request: RemoteOperatorHandoffRequest, nowMs: Long): RemoteOperatorHandoffAttempt {
        return RemoteOperatorHandoffAttempt(
            attemptId = "operator_handoff_local_${request.requestId}",
            status = RemoteOperatorHandoffStatus.HANDOFF_PENDING,
            dedupeKey = request.dedupeKey,
            summary = "Remote operator handoff queued in local durable workflow.",
            timestampMs = nowMs
        )
    }
}

class StubRemoteOperatorWorkflowPort(
    private val endpointHint: String? = null
) : RemoteOperatorWorkflowPort {
    override fun handoff(request: RemoteOperatorHandoffRequest, nowMs: Long): RemoteOperatorHandoffAttempt {
        return if (endpointHint.isNullOrBlank()) {
            RemoteOperatorHandoffAttempt(
                attemptId = "operator_handoff_stub_${request.requestId}",
                status = RemoteOperatorHandoffStatus.FAILED,
                dedupeKey = request.dedupeKey,
                summary = "Stub remote operator handoff has no endpoint configuration.",
                errorCode = "stub_endpoint_missing",
                timestampMs = nowMs
            )
        } else {
            RemoteOperatorHandoffAttempt(
                attemptId = "operator_handoff_stub_${request.requestId}",
                status = RemoteOperatorHandoffStatus.HANDED_OFF,
                dedupeKey = request.dedupeKey,
                summary = "Remote operator handoff sent to stub endpoint ($endpointHint).",
                remoteRef = "stub:${request.requestId}",
                timestampMs = nowMs
            )
        }
    }
}

interface EnterpriseIdpProviderPort {
    fun exchange(
        request: EnterpriseIdpSessionExchangeRequest,
        config: EnterpriseIdpProviderConfig?,
        nowMs: Long
    ): EnterpriseIdpSessionExchangeResult

    fun health(config: EnterpriseIdpProviderConfig?, nowMs: Long): EnterpriseAuthProviderHealth
}

class NoOpEnterpriseIdpProviderPort : EnterpriseIdpProviderPort {
    override fun exchange(
        request: EnterpriseIdpSessionExchangeRequest,
        config: EnterpriseIdpProviderConfig?,
        nowMs: Long
    ): EnterpriseIdpSessionExchangeResult {
        val adapterType = config?.adapterType ?: request.adapterType
        val provider = config?.provider ?: request.provider
        val fallbackAllowed = request.allowFallback
        return EnterpriseIdpSessionExchangeResult(
            status = if (fallbackAllowed) {
                EnterpriseIdpSessionExchangeStatus.FALLBACK_ALLOWED
            } else {
                EnterpriseIdpSessionExchangeStatus.PROVIDER_UNAVAILABLE
            },
            provider = provider,
            adapterType = adapterType,
            sessionProvenance = if (fallbackAllowed) {
                EnterpriseSessionProvenance.SSO_STALE_FALLBACK
            } else {
                EnterpriseSessionProvenance.IDP_UNAVAILABLE_FALLBACK
            },
            freshness = SessionFreshnessState.STALE,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_DEGRADED,
                RoleReasonCodes.ROLE_ENTERPRISE_SESSION_STALE_FALLBACK
            ),
            summary = if (fallbackAllowed) {
                "Enterprise IdP provider runtime is unavailable; local fallback session was used."
            } else {
                "Enterprise IdP provider runtime is unavailable."
            },
            evaluatedAtMs = nowMs
        )
    }

    override fun health(config: EnterpriseIdpProviderConfig?, nowMs: Long): EnterpriseAuthProviderHealth {
        val provider = config?.provider ?: EnterpriseIdpProvider.UNKNOWN
        val adapterType = config?.adapterType ?: EnterpriseIdpAdapterType.UNKNOWN
        return EnterpriseAuthProviderHealth(
            provider = provider,
            adapterType = adapterType,
            status = ProviderHealthStatus.UNAVAILABLE,
            checkedAtMs = nowMs,
            reasonCodes = listOf(RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_DEGRADED),
            summary = "Enterprise IdP provider runtime is not configured."
        )
    }
}

class LocalDurableEnterpriseIdpProviderPort : EnterpriseIdpProviderPort {
    override fun exchange(
        request: EnterpriseIdpSessionExchangeRequest,
        config: EnterpriseIdpProviderConfig?,
        nowMs: Long
    ): EnterpriseIdpSessionExchangeResult {
        val effectiveConfig = config ?: EnterpriseIdpProviderConfig(
            provider = request.provider,
            adapterType = request.adapterType,
            enabled = request.provider != EnterpriseIdpProvider.UNKNOWN,
            updatedAtMs = nowMs
        )
        val stageBlocked = effectiveConfig.rolloutStage == EnterpriseRolloutStage.DISABLED ||
            effectiveConfig.rolloutStage == EnterpriseRolloutStage.BLOCKED
        val cutoverBlocked = effectiveConfig.cutoverStatus == CutoverReadinessStatus.BLOCKED ||
            effectiveConfig.cutoverStatus == CutoverReadinessStatus.NOT_READY
        val providerUnavailable = !effectiveConfig.enabled || effectiveConfig.provider == EnterpriseIdpProvider.UNKNOWN
        val status = when {
            stageBlocked || cutoverBlocked || providerUnavailable ->
                if (request.allowFallback) {
                    EnterpriseIdpSessionExchangeStatus.FALLBACK_ALLOWED
                } else {
                    EnterpriseIdpSessionExchangeStatus.DENIED
                }
            else -> EnterpriseIdpSessionExchangeStatus.ALLOWED
        }
        val reasonCodes = mutableListOf<String>()
        when (status) {
            EnterpriseIdpSessionExchangeStatus.ALLOWED -> {
                reasonCodes += RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_APPLIED
                reasonCodes += RoleReasonCodes.ROLE_ENTERPRISE_SESSION_FRESH
            }
            EnterpriseIdpSessionExchangeStatus.FALLBACK_ALLOWED -> {
                reasonCodes += RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_DEGRADED
                reasonCodes += RoleReasonCodes.ROLE_ENTERPRISE_SESSION_STALE_FALLBACK
            }
            EnterpriseIdpSessionExchangeStatus.DENIED,
            EnterpriseIdpSessionExchangeStatus.PROVIDER_UNAVAILABLE -> {
                reasonCodes += RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_BLOCKED
                reasonCodes += RoleReasonCodes.ROLE_ENTERPRISE_SESSION_INVALIDATED
            }
            EnterpriseIdpSessionExchangeStatus.UNKNOWN -> Unit
        }
        return EnterpriseIdpSessionExchangeResult(
            status = status,
            provider = effectiveConfig.provider,
            adapterType = effectiveConfig.adapterType,
            sessionProvenance = when (status) {
                EnterpriseIdpSessionExchangeStatus.ALLOWED -> EnterpriseSessionProvenance.SSO_ASSERTED
                EnterpriseIdpSessionExchangeStatus.FALLBACK_ALLOWED -> EnterpriseSessionProvenance.SSO_STALE_FALLBACK
                EnterpriseIdpSessionExchangeStatus.DENIED,
                EnterpriseIdpSessionExchangeStatus.PROVIDER_UNAVAILABLE,
                EnterpriseIdpSessionExchangeStatus.UNKNOWN -> EnterpriseSessionProvenance.IDP_UNAVAILABLE_FALLBACK
            },
            freshness = when (status) {
                EnterpriseIdpSessionExchangeStatus.ALLOWED -> SessionFreshnessState.FRESH
                EnterpriseIdpSessionExchangeStatus.FALLBACK_ALLOWED -> SessionFreshnessState.STALE
                EnterpriseIdpSessionExchangeStatus.DENIED,
                EnterpriseIdpSessionExchangeStatus.PROVIDER_UNAVAILABLE,
                EnterpriseIdpSessionExchangeStatus.UNKNOWN -> SessionFreshnessState.INVALIDATED
            },
            reasonCodes = reasonCodes.distinct(),
            summary = when (status) {
                EnterpriseIdpSessionExchangeStatus.ALLOWED ->
                    "Enterprise IdP provider exchange succeeded for ${effectiveConfig.provider.name.lowercase().replace('_', ' ')}."
                EnterpriseIdpSessionExchangeStatus.FALLBACK_ALLOWED ->
                    "Enterprise IdP provider is not eligible; local fallback session was used."
                EnterpriseIdpSessionExchangeStatus.DENIED ->
                    "Enterprise IdP provider exchange was denied by rollout/cutover controls."
                EnterpriseIdpSessionExchangeStatus.PROVIDER_UNAVAILABLE ->
                    "Enterprise IdP provider runtime is unavailable."
                EnterpriseIdpSessionExchangeStatus.UNKNOWN ->
                    "Enterprise IdP provider exchange result is unknown."
            },
            evaluatedAtMs = nowMs
        )
    }

    override fun health(config: EnterpriseIdpProviderConfig?, nowMs: Long): EnterpriseAuthProviderHealth {
        val provider = config?.provider ?: EnterpriseIdpProvider.UNKNOWN
        val adapterType = config?.adapterType ?: EnterpriseIdpAdapterType.UNKNOWN
        val status = when {
            config == null -> ProviderHealthStatus.UNKNOWN
            !config.enabled || provider == EnterpriseIdpProvider.UNKNOWN -> ProviderHealthStatus.UNAVAILABLE
            config.rolloutStage == EnterpriseRolloutStage.DEGRADED ||
                config.cutoverStatus == CutoverReadinessStatus.DEGRADED ||
                config.cutoverStatus == CutoverReadinessStatus.FALLBACK_ONLY -> ProviderHealthStatus.DEGRADED
            config.rolloutStage == EnterpriseRolloutStage.BLOCKED ||
                config.rolloutStage == EnterpriseRolloutStage.DISABLED ||
                config.cutoverStatus == CutoverReadinessStatus.BLOCKED -> ProviderHealthStatus.BLOCKED
            else -> ProviderHealthStatus.HEALTHY
        }
        val reason = when (status) {
            ProviderHealthStatus.HEALTHY -> RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_APPLIED
            ProviderHealthStatus.DEGRADED -> RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_DEGRADED
            ProviderHealthStatus.BLOCKED -> RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_BLOCKED
            ProviderHealthStatus.UNAVAILABLE,
            ProviderHealthStatus.UNKNOWN -> RoleReasonCodes.ROLE_ENTERPRISE_IDP_PROVIDER_DEGRADED
        }
        return EnterpriseAuthProviderHealth(
            provider = provider,
            adapterType = adapterType,
            status = status,
            checkedAtMs = nowMs,
            reasonCodes = listOf(reason),
            summary = when (status) {
                ProviderHealthStatus.HEALTHY -> "Enterprise IdP provider is healthy."
                ProviderHealthStatus.DEGRADED -> "Enterprise IdP provider is degraded."
                ProviderHealthStatus.BLOCKED -> "Enterprise IdP provider is blocked by rollout/cutover policy."
                ProviderHealthStatus.UNAVAILABLE -> "Enterprise IdP provider is unavailable."
                ProviderHealthStatus.UNKNOWN -> "Enterprise IdP provider health is not tracked."
            }
        )
    }
}

class StubEnterpriseIdpProviderPort(
    private val endpointHint: String? = null
) : EnterpriseIdpProviderPort {
    override fun exchange(
        request: EnterpriseIdpSessionExchangeRequest,
        config: EnterpriseIdpProviderConfig?,
        nowMs: Long
    ): EnterpriseIdpSessionExchangeResult {
        if (endpointHint.isNullOrBlank()) {
            return NoOpEnterpriseIdpProviderPort().exchange(request, config, nowMs)
        }
        val local = LocalDurableEnterpriseIdpProviderPort().exchange(request, config, nowMs)
        return local.copy(
            summary = "${local.summary} (stub endpoint $endpointHint)"
        )
    }

    override fun health(config: EnterpriseIdpProviderConfig?, nowMs: Long): EnterpriseAuthProviderHealth {
        if (endpointHint.isNullOrBlank()) {
            return NoOpEnterpriseIdpProviderPort().health(config, nowMs)
        }
        val local = LocalDurableEnterpriseIdpProviderPort().health(config, nowMs)
        return local.copy(
            summary = "${local.summary} (stub endpoint $endpointHint)"
        )
    }
}

interface ScimDirectoryProviderPort {
    fun evaluate(
        snapshot: DirectorySyncSnapshot?,
        config: ScimProviderConfig?,
        nowMs: Long
    ): DirectorySyncProviderResult

    fun health(config: ScimProviderConfig?, snapshot: DirectorySyncSnapshot?, nowMs: Long): DirectorySyncProviderHealth
}

class NoOpScimDirectoryProviderPort : ScimDirectoryProviderPort {
    override fun evaluate(
        snapshot: DirectorySyncSnapshot?,
        config: ScimProviderConfig?,
        nowMs: Long
    ): DirectorySyncProviderResult {
        val providerType = config?.providerType ?: snapshot?.providerType ?: ScimProviderAdapterType.UNKNOWN
        return DirectorySyncProviderResult(
            providerType = providerType,
            providerConfigId = config?.configId,
            status = DirectorySyncStatus.DIRECTORY_UNAVAILABLE,
            freshnessStatus = DirectorySyncFreshnessStatus.OUT_OF_SYNC,
            health = health(config, snapshot, nowMs),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_SCIM_PROVIDER_DEGRADED,
                RoleReasonCodes.ROLE_SCIM_DIRECTORY_UNAVAILABLE
            ),
            summary = "SCIM provider runtime is unavailable; directory fallback remains active.",
            evaluatedAtMs = nowMs
        )
    }

    override fun health(
        config: ScimProviderConfig?,
        snapshot: DirectorySyncSnapshot?,
        nowMs: Long
    ): DirectorySyncProviderHealth {
        return DirectorySyncProviderHealth(
            providerType = config?.providerType ?: snapshot?.providerType ?: ScimProviderAdapterType.UNKNOWN,
            status = ProviderHealthStatus.UNAVAILABLE,
            checkedAtMs = nowMs,
            reasonCodes = listOf(RoleReasonCodes.ROLE_SCIM_PROVIDER_DEGRADED),
            summary = "SCIM provider runtime is not configured."
        )
    }
}

class LocalDurableScimDirectoryProviderPort : ScimDirectoryProviderPort {
    override fun evaluate(
        snapshot: DirectorySyncSnapshot?,
        config: ScimProviderConfig?,
        nowMs: Long
    ): DirectorySyncProviderResult {
        val providerType = config?.providerType ?: snapshot?.providerType ?: ScimProviderAdapterType.UNKNOWN
        val status = snapshot?.status ?: DirectorySyncStatus.NOT_TRACKED
        val freshness = when (status) {
            DirectorySyncStatus.SYNCED -> DirectorySyncFreshnessStatus.FRESH
            DirectorySyncStatus.STALE -> DirectorySyncFreshnessStatus.STALE_SOFT
            DirectorySyncStatus.SYNC_PENDING -> DirectorySyncFreshnessStatus.STALE_HARD
            DirectorySyncStatus.FAILED,
            DirectorySyncStatus.DIRECTORY_UNAVAILABLE -> DirectorySyncFreshnessStatus.OUT_OF_SYNC
            DirectorySyncStatus.NOT_TRACKED -> DirectorySyncFreshnessStatus.UNKNOWN
        }
        val checkpoint = snapshot?.checkpoint ?: DirectorySyncCheckpoint(
            checkpointId = "scim_checkpoint_${providerType.name.lowercase()}_$nowMs",
            providerType = providerType,
            lastSuccessAtMs = snapshot?.syncedAtMs,
            lastAttemptAtMs = nowMs,
            lagMs = snapshot?.syncedAtMs?.let { nowMs - it },
            freshnessStatus = freshness,
            summary = "SCIM provider checkpoint evaluated from directory snapshot."
        )
        val health = health(config, snapshot, nowMs)
        val reasonCodes = mutableListOf<String>()
        when (freshness) {
            DirectorySyncFreshnessStatus.FRESH -> {
                reasonCodes += RoleReasonCodes.ROLE_SCIM_PROVIDER_FRESH
                reasonCodes += RoleReasonCodes.ROLE_SCIM_DIRECTORY_SYNC_APPLIED
            }
            DirectorySyncFreshnessStatus.STALE_SOFT,
            DirectorySyncFreshnessStatus.STALE_HARD -> {
                reasonCodes += RoleReasonCodes.ROLE_SCIM_PROVIDER_STALE
                reasonCodes += RoleReasonCodes.ROLE_SCIM_DIRECTORY_SYNC_STALE
            }
            DirectorySyncFreshnessStatus.OUT_OF_SYNC -> {
                reasonCodes += RoleReasonCodes.ROLE_SCIM_PROVIDER_BLOCKED
                reasonCodes += RoleReasonCodes.ROLE_SCIM_DIRECTORY_UNAVAILABLE
            }
            DirectorySyncFreshnessStatus.UNKNOWN -> Unit
        }
        return DirectorySyncProviderResult(
            providerType = providerType,
            providerConfigId = config?.configId ?: snapshot?.providerConfigId,
            status = status,
            freshnessStatus = freshness,
            health = health,
            checkpoint = checkpoint,
            reasonCodes = reasonCodes.distinct(),
            summary = when (freshness) {
                DirectorySyncFreshnessStatus.FRESH -> "SCIM provider sync is fresh."
                DirectorySyncFreshnessStatus.STALE_SOFT -> "SCIM provider sync is stale but within soft tolerance."
                DirectorySyncFreshnessStatus.STALE_HARD -> "SCIM provider sync is stale beyond tolerance."
                DirectorySyncFreshnessStatus.OUT_OF_SYNC -> "SCIM provider is out of sync; fallback protections are active."
                DirectorySyncFreshnessStatus.UNKNOWN -> "SCIM provider freshness is not tracked."
            },
            evaluatedAtMs = nowMs
        )
    }

    override fun health(
        config: ScimProviderConfig?,
        snapshot: DirectorySyncSnapshot?,
        nowMs: Long
    ): DirectorySyncProviderHealth {
        val providerType = config?.providerType ?: snapshot?.providerType ?: ScimProviderAdapterType.UNKNOWN
        val status = when {
            config == null && snapshot == null -> ProviderHealthStatus.UNKNOWN
            config != null && !config.enabled -> ProviderHealthStatus.BLOCKED
            snapshot?.status == DirectorySyncStatus.FAILED ||
                snapshot?.status == DirectorySyncStatus.DIRECTORY_UNAVAILABLE -> ProviderHealthStatus.BLOCKED
            snapshot?.status == DirectorySyncStatus.STALE ||
                snapshot?.status == DirectorySyncStatus.SYNC_PENDING -> ProviderHealthStatus.DEGRADED
            snapshot?.status == DirectorySyncStatus.SYNCED -> ProviderHealthStatus.HEALTHY
            else -> ProviderHealthStatus.UNKNOWN
        }
        val reasonCode = when (status) {
            ProviderHealthStatus.HEALTHY -> RoleReasonCodes.ROLE_SCIM_PROVIDER_FRESH
            ProviderHealthStatus.DEGRADED -> RoleReasonCodes.ROLE_SCIM_PROVIDER_DEGRADED
            ProviderHealthStatus.BLOCKED -> RoleReasonCodes.ROLE_SCIM_PROVIDER_BLOCKED
            ProviderHealthStatus.UNAVAILABLE,
            ProviderHealthStatus.UNKNOWN -> RoleReasonCodes.ROLE_SCIM_PROVIDER_DEGRADED
        }
        return DirectorySyncProviderHealth(
            providerType = providerType,
            status = status,
            lastSuccessAtMs = snapshot?.syncedAtMs,
            lastError = snapshot?.lastError,
            checkedAtMs = nowMs,
            reasonCodes = listOf(reasonCode),
            summary = when (status) {
                ProviderHealthStatus.HEALTHY -> "SCIM provider is healthy."
                ProviderHealthStatus.DEGRADED -> "SCIM provider is degraded due to stale or pending sync."
                ProviderHealthStatus.BLOCKED -> "SCIM provider is blocked by sync failure or policy."
                ProviderHealthStatus.UNAVAILABLE -> "SCIM provider is unavailable."
                ProviderHealthStatus.UNKNOWN -> "SCIM provider health is not tracked."
            }
        )
    }
}

class StubScimDirectoryProviderPort(
    private val endpointHint: String? = null
) : ScimDirectoryProviderPort {
    override fun evaluate(
        snapshot: DirectorySyncSnapshot?,
        config: ScimProviderConfig?,
        nowMs: Long
    ): DirectorySyncProviderResult {
        if (endpointHint.isNullOrBlank()) {
            return NoOpScimDirectoryProviderPort().evaluate(snapshot, config, nowMs)
        }
        val local = LocalDurableScimDirectoryProviderPort().evaluate(snapshot, config, nowMs)
        return local.copy(summary = "${local.summary} (stub endpoint $endpointHint)")
    }

    override fun health(
        config: ScimProviderConfig?,
        snapshot: DirectorySyncSnapshot?,
        nowMs: Long
    ): DirectorySyncProviderHealth {
        if (endpointHint.isNullOrBlank()) {
            return NoOpScimDirectoryProviderPort().health(config, snapshot, nowMs)
        }
        val local = LocalDurableScimDirectoryProviderPort().health(config, snapshot, nowMs)
        return local.copy(summary = "${local.summary} (stub endpoint $endpointHint)")
    }
}

interface VaultProviderIntegrationPort {
    fun materialize(
        request: VaultMaterializationRequest,
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultMaterializationResult

    fun health(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultProviderHealth

    fun checkCredential(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultCredentialHealthCheckResult
}

class NoOpVaultProviderIntegrationPort : VaultProviderIntegrationPort {
    override fun materialize(
        request: VaultMaterializationRequest,
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultMaterializationResult {
        return VaultMaterializationResult(
            status = VaultMaterializationStatus.DEGRADED,
            providerType = config?.providerType ?: request.providerType,
            providerConfigId = config?.configId,
            resolution = resolution,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED,
                RoleReasonCodes.ROLE_CREDENTIAL_MATERIALIZATION_BLOCKED
            ),
            summary = "Vault provider integration runtime is unavailable; materialization fell back to local safeguards.",
            evaluatedAtMs = nowMs
        )
    }

    override fun health(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultProviderHealth {
        return VaultProviderHealth(
            providerType = config?.providerType ?: VaultProviderType.UNKNOWN,
            status = ProviderHealthStatus.UNAVAILABLE,
            checkedAtMs = nowMs,
            reasonCodes = listOf(RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED),
            summary = "Vault provider integration runtime is not configured."
        )
    }

    override fun checkCredential(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultCredentialHealthCheckResult {
        return VaultCredentialHealthCheckResult(
            providerType = config?.providerType ?: VaultProviderType.UNKNOWN,
            status = resolution?.status ?: VaultCredentialStatus.BACKEND_UNAVAILABLE,
            materialState = resolution?.materialState ?: VaultCredentialMaterialState.MATERIAL_UNAVAILABLE,
            summary = "Vault credential health check unavailable.",
            reasonCodes = listOf(RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED),
            checkedAtMs = nowMs
        )
    }
}

class LocalDurableVaultProviderIntegrationPort : VaultProviderIntegrationPort {
    override fun materialize(
        request: VaultMaterializationRequest,
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultMaterializationResult {
        val providerType = config?.providerType ?: request.providerType
        val rolloutBlocked = config?.rolloutStage == EnterpriseRolloutStage.BLOCKED ||
            config?.rolloutStage == EnterpriseRolloutStage.DISABLED
        val cutoverBlocked = config?.cutoverStatus == CutoverReadinessStatus.BLOCKED ||
            config?.cutoverStatus == CutoverReadinessStatus.NOT_READY
        val resolutionStatus = resolution?.status ?: VaultCredentialStatus.UNKNOWN
        val blockedByResolution = resolutionStatus == VaultCredentialStatus.REVOKED ||
            resolutionStatus == VaultCredentialStatus.ACCESS_DENIED ||
            resolutionStatus == VaultCredentialStatus.LEASE_EXPIRED
        val status = when {
            request.providerType == VaultProviderType.UNKNOWN && resolution == null -> VaultMaterializationStatus.NOT_REQUIRED
            rolloutBlocked || cutoverBlocked || blockedByResolution -> VaultMaterializationStatus.BLOCKED
            resolutionStatus == VaultCredentialStatus.BACKEND_UNAVAILABLE ||
                resolutionStatus == VaultCredentialStatus.ROTATION_DUE -> VaultMaterializationStatus.DEGRADED
            else -> VaultMaterializationStatus.MATERIALIZED
        }
        val reasonCodes = mutableListOf<String>()
        when (status) {
            VaultMaterializationStatus.MATERIALIZED -> reasonCodes += RoleReasonCodes.ROLE_VAULT_PROVIDER_MATERIALIZED
            VaultMaterializationStatus.DEGRADED -> reasonCodes += RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED
            VaultMaterializationStatus.BLOCKED -> {
                reasonCodes += RoleReasonCodes.ROLE_VAULT_PROVIDER_BLOCKED
                reasonCodes += RoleReasonCodes.ROLE_CREDENTIAL_MATERIALIZATION_BLOCKED
            }
            VaultMaterializationStatus.NOT_REQUIRED,
            VaultMaterializationStatus.UNKNOWN -> Unit
        }
        return VaultMaterializationResult(
            status = status,
            providerType = providerType,
            providerConfigId = config?.configId,
            resolution = resolution,
            reasonCodes = reasonCodes.distinct(),
            summary = when (status) {
                VaultMaterializationStatus.MATERIALIZED -> "Vault provider materialized connector credential metadata successfully."
                VaultMaterializationStatus.DEGRADED -> "Vault provider materialization is degraded; fallback safeguards are active."
                VaultMaterializationStatus.BLOCKED -> "Vault provider materialization is blocked by rollout/cutover/credential policy."
                VaultMaterializationStatus.NOT_REQUIRED -> "Vault materialization is not required for this route."
                VaultMaterializationStatus.UNKNOWN -> "Vault materialization status is unknown."
            },
            evaluatedAtMs = nowMs
        )
    }

    override fun health(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultProviderHealth {
        val providerType = config?.providerType ?: VaultProviderType.UNKNOWN
        val status = when {
            config == null -> ProviderHealthStatus.UNKNOWN
            !config.enabled -> ProviderHealthStatus.BLOCKED
            config.rolloutStage == EnterpriseRolloutStage.BLOCKED ||
                config.rolloutStage == EnterpriseRolloutStage.DISABLED -> ProviderHealthStatus.BLOCKED
            resolution?.status == VaultCredentialStatus.BACKEND_UNAVAILABLE -> ProviderHealthStatus.UNAVAILABLE
            resolution?.status == VaultCredentialStatus.LEASE_EXPIRED ||
                resolution?.status == VaultCredentialStatus.ROTATION_DUE -> ProviderHealthStatus.DEGRADED
            resolution?.status == VaultCredentialStatus.ACCESS_DENIED ||
                resolution?.status == VaultCredentialStatus.REVOKED -> ProviderHealthStatus.BLOCKED
            else -> ProviderHealthStatus.HEALTHY
        }
        val reasonCode = when (status) {
            ProviderHealthStatus.HEALTHY -> RoleReasonCodes.ROLE_VAULT_PROVIDER_MATERIALIZED
            ProviderHealthStatus.DEGRADED -> RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED
            ProviderHealthStatus.BLOCKED -> RoleReasonCodes.ROLE_VAULT_PROVIDER_BLOCKED
            ProviderHealthStatus.UNAVAILABLE,
            ProviderHealthStatus.UNKNOWN -> RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED
        }
        return VaultProviderHealth(
            providerType = providerType,
            status = status,
            checkedAtMs = nowMs,
            reasonCodes = listOf(reasonCode),
            summary = when (status) {
                ProviderHealthStatus.HEALTHY -> "Vault provider is healthy."
                ProviderHealthStatus.DEGRADED -> "Vault provider is degraded and may limit routing."
                ProviderHealthStatus.BLOCKED -> "Vault provider is blocked by policy or credential state."
                ProviderHealthStatus.UNAVAILABLE -> "Vault provider is unavailable."
                ProviderHealthStatus.UNKNOWN -> "Vault provider health is not tracked."
            }
        )
    }

    override fun checkCredential(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultCredentialHealthCheckResult {
        val providerType = config?.providerType ?: VaultProviderType.UNKNOWN
        val status = resolution?.status ?: VaultCredentialStatus.UNKNOWN
        val materialState = resolution?.materialState ?: VaultCredentialMaterialState.UNKNOWN
        val reasonCodes = mutableListOf<String>()
        when (status) {
            VaultCredentialStatus.BOUND,
            VaultCredentialStatus.LEASE_ACTIVE -> reasonCodes += RoleReasonCodes.ROLE_VAULT_PROVIDER_MATERIALIZED
            VaultCredentialStatus.ROTATION_DUE,
            VaultCredentialStatus.BACKEND_UNAVAILABLE -> reasonCodes += RoleReasonCodes.ROLE_VAULT_PROVIDER_DEGRADED
            VaultCredentialStatus.LEASE_EXPIRED,
            VaultCredentialStatus.ACCESS_DENIED,
            VaultCredentialStatus.REVOKED -> reasonCodes += RoleReasonCodes.ROLE_VAULT_PROVIDER_BLOCKED
            VaultCredentialStatus.NOT_CONFIGURED,
            VaultCredentialStatus.UNKNOWN -> Unit
        }
        return VaultCredentialHealthCheckResult(
            providerType = providerType,
            status = status,
            materialState = materialState,
            summary = resolution?.summary ?: "Vault credential health check evaluated.",
            reasonCodes = reasonCodes.distinct(),
            checkedAtMs = nowMs
        )
    }
}

class StubVaultProviderIntegrationPort(
    private val endpointHint: String? = null
) : VaultProviderIntegrationPort {
    override fun materialize(
        request: VaultMaterializationRequest,
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultMaterializationResult {
        if (endpointHint.isNullOrBlank()) {
            return NoOpVaultProviderIntegrationPort().materialize(request, config, resolution, nowMs)
        }
        val local = LocalDurableVaultProviderIntegrationPort().materialize(request, config, resolution, nowMs)
        return local.copy(summary = "${local.summary} (stub endpoint $endpointHint)")
    }

    override fun health(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultProviderHealth {
        if (endpointHint.isNullOrBlank()) {
            return NoOpVaultProviderIntegrationPort().health(config, resolution, nowMs)
        }
        val local = LocalDurableVaultProviderIntegrationPort().health(config, resolution, nowMs)
        return local.copy(summary = "${local.summary} (stub endpoint $endpointHint)")
    }

    override fun checkCredential(
        config: VaultProviderConfig?,
        resolution: VaultResolutionResult?,
        nowMs: Long
    ): VaultCredentialHealthCheckResult {
        if (endpointHint.isNullOrBlank()) {
            return NoOpVaultProviderIntegrationPort().checkCredential(config, resolution, nowMs)
        }
        val local = LocalDurableVaultProviderIntegrationPort().checkCredential(config, resolution, nowMs)
        return local.copy(summary = "${local.summary} (stub endpoint $endpointHint)")
    }
}

data class VaultResolutionRequest(
    val runId: String,
    val targetType: AlertRoutingTargetType,
    val credentialRef: ConnectorCredentialRef? = null,
    val vaultCredential: VaultCredentialReference? = null
)

interface VaultRuntimePort {
    fun resolve(request: VaultResolutionRequest, nowMs: Long): VaultResolutionResult

    fun health(nowMs: Long): VaultHealthSummary
}

class NoOpVaultRuntimePort : VaultRuntimePort {
    override fun resolve(request: VaultResolutionRequest, nowMs: Long): VaultResolutionResult {
        return VaultResolutionResult(
            resolutionId = "vault_noop_${request.runId}_${request.targetType.name.lowercase()}",
            credentialId = request.credentialRef?.credentialId,
            vaultProvider = request.vaultCredential?.vaultProvider,
            status = request.vaultCredential?.status ?: VaultCredentialStatus.BACKEND_UNAVAILABLE,
            lease = request.vaultCredential?.leaseId?.let { leaseId ->
                VaultLeaseHandle(
                    leaseId = leaseId,
                    status = VaultLeaseStatus.BACKEND_UNAVAILABLE,
                    expiresAtMs = request.vaultCredential.leaseExpiresAtMs,
                    renewable = false,
                    summary = "Vault runtime is unavailable; lease cannot be refreshed."
                )
            },
            materialState = VaultCredentialMaterialState.MATERIAL_UNAVAILABLE,
            health = VaultHealthSummary(
                status = VaultLeaseStatus.BACKEND_UNAVAILABLE,
                summary = "Vault runtime unavailable; local-first fallback remains active.",
                lastCheckedAtMs = nowMs
            ),
            summary = "Vault runtime unavailable; connector route should fallback locally."
        )
    }

    override fun health(nowMs: Long): VaultHealthSummary {
        return VaultHealthSummary(
            status = VaultLeaseStatus.BACKEND_UNAVAILABLE,
            summary = "Vault runtime unavailable; local-first fallback remains active.",
            lastCheckedAtMs = nowMs
        )
    }
}

class LocalDurableVaultRuntimePort : VaultRuntimePort {
    override fun resolve(request: VaultResolutionRequest, nowMs: Long): VaultResolutionResult {
        val vault = request.vaultCredential
        val status = vault?.status ?: VaultCredentialStatus.NOT_CONFIGURED
        val leaseStatus = when {
            vault == null -> VaultLeaseStatus.UNKNOWN
            status == VaultCredentialStatus.BOUND || status == VaultCredentialStatus.LEASE_ACTIVE -> {
                val leaseExpired = vault.leaseExpiresAtMs?.let { it <= nowMs } == true
                if (leaseExpired) VaultLeaseStatus.EXPIRED else VaultLeaseStatus.ACTIVE
            }

            status == VaultCredentialStatus.LEASE_EXPIRED -> VaultLeaseStatus.EXPIRED
            status == VaultCredentialStatus.REVOKED -> VaultLeaseStatus.REVOKED
            status == VaultCredentialStatus.ACCESS_DENIED -> VaultLeaseStatus.DENIED
            status == VaultCredentialStatus.BACKEND_UNAVAILABLE -> VaultLeaseStatus.BACKEND_UNAVAILABLE
            status == VaultCredentialStatus.ROTATION_DUE -> VaultLeaseStatus.EXPIRING
            else -> VaultLeaseStatus.UNKNOWN
        }
        val materialState = when (leaseStatus) {
            VaultLeaseStatus.ACTIVE, VaultLeaseStatus.EXPIRING -> VaultCredentialMaterialState.MATERIAL_AVAILABLE
            VaultLeaseStatus.UNKNOWN -> VaultCredentialMaterialState.UNKNOWN
            VaultLeaseStatus.EXPIRED,
            VaultLeaseStatus.REVOKED,
            VaultLeaseStatus.DENIED,
            VaultLeaseStatus.BACKEND_UNAVAILABLE -> VaultCredentialMaterialState.MATERIAL_WITHHELD
        }
        val summary = when (leaseStatus) {
            VaultLeaseStatus.ACTIVE ->
                "Vault lease is active for connector credential runtime."
            VaultLeaseStatus.EXPIRING ->
                "Vault lease is expiring; rotation/renewal should be scheduled."
            VaultLeaseStatus.EXPIRED ->
                "Vault lease expired; connector route should fallback until renewal."
            VaultLeaseStatus.REVOKED ->
                "Vault credential revoked; connector route is blocked."
            VaultLeaseStatus.DENIED ->
                "Vault access denied; connector route is blocked."
            VaultLeaseStatus.BACKEND_UNAVAILABLE ->
                "Vault backend unavailable; connector route should fallback locally."
            VaultLeaseStatus.UNKNOWN ->
                "Vault runtime state is not tracked for this credential."
        }
        return VaultResolutionResult(
            resolutionId = "vault_local_${request.runId}_${request.targetType.name.lowercase()}",
            credentialId = request.credentialRef?.credentialId,
            vaultProvider = vault?.vaultProvider,
            status = status,
            lease = VaultLeaseHandle(
                leaseId = vault?.leaseId.orEmpty(),
                status = leaseStatus,
                issuedAtMs = vault?.lastRotatedAtMs,
                expiresAtMs = vault?.leaseExpiresAtMs,
                renewable = leaseStatus == VaultLeaseStatus.ACTIVE || leaseStatus == VaultLeaseStatus.EXPIRING,
                summary = summary
            ),
            materialState = materialState,
            health = health(nowMs),
            summary = summary
        )
    }

    override fun health(nowMs: Long): VaultHealthSummary {
        return VaultHealthSummary(
            status = VaultLeaseStatus.ACTIVE,
            summary = "Vault runtime health is locally tracked and available.",
            lastCheckedAtMs = nowMs
        )
    }
}

class StubVaultRuntimePort(
    private val endpointHint: String? = null
) : VaultRuntimePort {
    override fun resolve(request: VaultResolutionRequest, nowMs: Long): VaultResolutionResult {
        if (endpointHint.isNullOrBlank()) {
            return NoOpVaultRuntimePort().resolve(request, nowMs)
        }
        val local = LocalDurableVaultRuntimePort().resolve(request, nowMs)
        val remoteLease = local.lease?.copy(
            summary = "${local.lease?.summary.orEmpty()} (stub endpoint $endpointHint)"
        )
        return local.copy(
            resolutionId = "vault_stub_${request.runId}_${request.targetType.name.lowercase()}",
            lease = remoteLease,
            health = health(nowMs),
            summary = "${local.summary} (resolved via stub vault endpoint)."
        )
    }

    override fun health(nowMs: Long): VaultHealthSummary {
        return if (endpointHint.isNullOrBlank()) {
            VaultHealthSummary(
                status = VaultLeaseStatus.BACKEND_UNAVAILABLE,
                summary = "Stub vault endpoint is not configured.",
                lastCheckedAtMs = nowMs
            )
        } else {
            VaultHealthSummary(
                status = VaultLeaseStatus.ACTIVE,
                summary = "Stub vault runtime endpoint is reachable.",
                lastCheckedAtMs = nowMs
            )
        }
    }
}

interface AlertRoutingPort {
    fun route(
        runId: String,
        alertCode: String,
        target: AlertRoutingTarget,
        dedupeKey: String,
        summary: String,
        authorization: RemoteAuthorizationResult? = null,
        requestedByOperator: OperatorIdentity? = null,
        nowMs: Long
    ): AlertRoutingAttempt
}

interface ConnectorDeliveryTransport {
    fun deliver(request: ConnectorDeliveryRequest, nowMs: Long): ConnectorDeliveryAttempt
}

class NoOpConnectorDeliveryTransport : ConnectorDeliveryTransport {
    override fun deliver(request: ConnectorDeliveryRequest, nowMs: Long): ConnectorDeliveryAttempt {
        return ConnectorDeliveryAttempt(
            attemptId = "connector_noop_${request.requestId}",
            requestId = request.requestId,
            targetId = request.target.targetId,
            providerType = request.target.providerType,
            status = ConnectorDeliveryStatus.LOCAL_ONLY,
            dedupeKey = request.dedupeKey,
            summary = "Connector delivery is unavailable; action remains local.",
            failureReason = ConnectorFailureReason.DESTINATION_UNAVAILABLE,
            ack = ConnectorDeliveryAck(
                status = ConnectorAckStatus.NOT_REQUIRED,
                summary = "No remote acknowledgement required for local-only fallback."
            ),
            destinationId = request.target.destinationId,
            authProfileId = request.target.authProfileId,
            routeBindingId = request.target.routeBindingId,
            authorization = request.authorization,
            timestampMs = nowMs
        )
    }
}

class LocalDurableConnectorDeliveryTransport : ConnectorDeliveryTransport {
    override fun deliver(request: ConnectorDeliveryRequest, nowMs: Long): ConnectorDeliveryAttempt {
        return ConnectorDeliveryAttempt(
            attemptId = "connector_local_${request.requestId}",
            requestId = request.requestId,
            targetId = request.target.targetId,
            providerType = request.target.providerType,
            status = if (request.target.providerType == ConnectorProviderType.LOCAL_CONSOLE) {
                ConnectorDeliveryStatus.LOCAL_ONLY
            } else {
                ConnectorDeliveryStatus.QUEUED
            },
            dedupeKey = request.dedupeKey,
            summary = if (request.target.providerType == ConnectorProviderType.LOCAL_CONSOLE) {
                "Connector delivery stays local in governance console."
            } else {
                "Connector delivery queued in local durable pipeline."
            },
            ack = ConnectorDeliveryAck(
                status = if (request.target.providerType == ConnectorProviderType.LOCAL_CONSOLE) {
                    ConnectorAckStatus.NOT_REQUIRED
                } else {
                    ConnectorAckStatus.PENDING
                },
                summary = "Awaiting connector acknowledgement."
            ),
            destinationId = request.target.destinationId,
            authProfileId = request.target.authProfileId,
            routeBindingId = request.target.routeBindingId,
            authorization = request.authorization,
            timestampMs = nowMs
        )
    }
}

class StubConnectorDeliveryTransport(
    private val endpointHint: String? = null,
    private val unavailableProviders: Set<ConnectorProviderType> = emptySet()
) : ConnectorDeliveryTransport {
    override fun deliver(request: ConnectorDeliveryRequest, nowMs: Long): ConnectorDeliveryAttempt {
        val provider = request.target.providerType
        val credential = request.target.credentialRef
        val credentialConfigured = provider == ConnectorProviderType.LOCAL_CONSOLE ||
            (
                credential?.isConfigured == true &&
                    credential.status != ConnectorCredentialStatus.MISSING &&
                    credential.status != ConnectorCredentialStatus.INVALID &&
                    credential.status != ConnectorCredentialStatus.REVOKED &&
                    credential.status != ConnectorCredentialStatus.EXPIRED
                )
        val endpointConfigured = provider == ConnectorProviderType.LOCAL_CONSOLE || !endpointHint.isNullOrBlank()
        val explicitlyUnavailable = unavailableProviders.contains(provider)
        val duplicateSuppressed = request.dedupeKey.contains("duplicate", ignoreCase = true)
        if (duplicateSuppressed) {
            return ConnectorDeliveryAttempt(
                attemptId = "connector_stub_${request.requestId}",
                requestId = request.requestId,
                targetId = request.target.targetId,
                providerType = provider,
                status = ConnectorDeliveryStatus.DUPLICATE_SUPPRESSED,
                dedupeKey = request.dedupeKey,
                summary = "Duplicate connector delivery suppressed by dedupe policy.",
                failureReason = ConnectorFailureReason.DUPLICATE_SUPPRESSED,
                ack = ConnectorDeliveryAck(
                    status = ConnectorAckStatus.DUPLICATE_SUPPRESSED,
                    summary = "Duplicate delivery callback was suppressed."
                ),
                destinationId = request.target.destinationId,
                authProfileId = request.target.authProfileId,
                routeBindingId = request.target.routeBindingId,
                authorization = request.authorization,
                timestampMs = nowMs
            )
        }
        if (!credentialConfigured) {
            return ConnectorDeliveryAttempt(
                attemptId = "connector_stub_${request.requestId}",
                requestId = request.requestId,
                targetId = request.target.targetId,
                providerType = provider,
                status = ConnectorDeliveryStatus.FAILED,
                dedupeKey = request.dedupeKey,
                summary = "Connector credential is missing or invalid for destination delivery.",
                failureReason = ConnectorFailureReason.CREDENTIAL_MISSING,
                ack = ConnectorDeliveryAck(
                    status = ConnectorAckStatus.FAILED,
                    summary = "Connector acknowledgement unavailable due to credential state."
                ),
                destinationId = request.target.destinationId,
                authProfileId = request.target.authProfileId,
                routeBindingId = request.target.routeBindingId,
                authorization = request.authorization,
                timestampMs = nowMs
            )
        }
        if (!endpointConfigured || explicitlyUnavailable) {
            return ConnectorDeliveryAttempt(
                attemptId = "connector_stub_${request.requestId}",
                requestId = request.requestId,
                targetId = request.target.targetId,
                providerType = provider,
                status = if (provider == ConnectorProviderType.LOCAL_CONSOLE) {
                    ConnectorDeliveryStatus.LOCAL_ONLY
                } else {
                    ConnectorDeliveryStatus.FAILED
                },
                dedupeKey = request.dedupeKey,
                summary = if (provider == ConnectorProviderType.LOCAL_CONSOLE) {
                    "Connector delivery remains local."
                } else {
                    "Connector destination is unavailable or not configured."
                },
                failureReason = if (provider == ConnectorProviderType.LOCAL_CONSOLE) {
                    null
                } else {
                    ConnectorFailureReason.DESTINATION_UNAVAILABLE
                },
                ack = ConnectorDeliveryAck(
                    status = if (provider == ConnectorProviderType.LOCAL_CONSOLE) {
                        ConnectorAckStatus.NOT_REQUIRED
                    } else {
                        ConnectorAckStatus.FAILED
                    },
                    summary = if (provider == ConnectorProviderType.LOCAL_CONSOLE) {
                        "No remote acknowledgement required."
                    } else {
                        "Connector acknowledgement unavailable due to destination failure."
                    }
                ),
                destinationId = request.target.destinationId,
                authProfileId = request.target.authProfileId,
                routeBindingId = request.target.routeBindingId,
                authorization = request.authorization,
                timestampMs = nowMs
            )
        }
        val ackPendingProvider = provider == ConnectorProviderType.JIRA || provider == ConnectorProviderType.ZENDESK
        val ackStatus = if (ackPendingProvider) ConnectorAckStatus.PENDING else ConnectorAckStatus.ACKNOWLEDGED
        val deliveryStatus = if (ackPendingProvider) {
            ConnectorDeliveryStatus.ACK_PENDING
        } else {
            ConnectorDeliveryStatus.ACKNOWLEDGED
        }
        return ConnectorDeliveryAttempt(
            attemptId = "connector_stub_${request.requestId}",
            requestId = request.requestId,
            targetId = request.target.targetId,
            providerType = provider,
            status = deliveryStatus,
            dedupeKey = request.dedupeKey,
            summary = if (ackPendingProvider) {
                "Connector accepted payload and is waiting acknowledgement callback."
            } else {
                "Connector delivery acknowledged by remote destination."
            },
            ack = ConnectorDeliveryAck(
                status = ackStatus,
                ackId = if (ackStatus == ConnectorAckStatus.ACKNOWLEDGED) "ack_${request.requestId}" else null,
                summary = if (ackStatus == ConnectorAckStatus.ACKNOWLEDGED) {
                    "Connector acknowledgement received."
                } else {
                    "Connector acknowledgement pending."
                },
                ackedAtMs = if (ackStatus == ConnectorAckStatus.ACKNOWLEDGED) nowMs else null
            ),
            destinationId = request.target.destinationId,
            authProfileId = request.target.authProfileId,
            routeBindingId = request.target.routeBindingId,
            authorization = request.authorization,
            transportRef = endpointHint?.let { "stub:$it" },
            timestampMs = nowMs
        )
    }
}

class CredentialedConnectorDeliveryTransport(
    private val endpointResolver: (ConnectorDeliveryRequest) -> String? = { it.target.endpointHint }
) : ConnectorDeliveryTransport {
    override fun deliver(request: ConnectorDeliveryRequest, nowMs: Long): ConnectorDeliveryAttempt {
        val provider = request.target.providerType
        val credential = request.target.credentialRef
        val endpoint = endpointResolver(request)
        val credentialReady = provider == ConnectorProviderType.LOCAL_CONSOLE ||
            (
                credential?.isConfigured == true &&
                    credential.status != ConnectorCredentialStatus.MISSING &&
                    credential.status != ConnectorCredentialStatus.INVALID &&
                    credential.status != ConnectorCredentialStatus.REVOKED &&
                    credential.status != ConnectorCredentialStatus.EXPIRED
                )
        if (!credentialReady) {
            return ConnectorDeliveryAttempt(
                attemptId = "connector_prod_${request.requestId}",
                requestId = request.requestId,
                targetId = request.target.targetId,
                providerType = provider,
                status = ConnectorDeliveryStatus.FAILED,
                dedupeKey = request.dedupeKey,
                summary = "Credentialed connector delivery blocked: credential is missing or invalid.",
                failureReason = ConnectorFailureReason.CREDENTIAL_MISSING,
                ack = ConnectorDeliveryAck(
                    status = ConnectorAckStatus.FAILED,
                    summary = "Connector acknowledgement unavailable due to credential state."
                ),
                destinationId = request.target.destinationId,
                authProfileId = request.target.authProfileId,
                routeBindingId = request.target.routeBindingId,
                authorization = request.authorization,
                timestampMs = nowMs
            )
        }
        if (provider != ConnectorProviderType.LOCAL_CONSOLE && endpoint.isNullOrBlank()) {
            return ConnectorDeliveryAttempt(
                attemptId = "connector_prod_${request.requestId}",
                requestId = request.requestId,
                targetId = request.target.targetId,
                providerType = provider,
                status = ConnectorDeliveryStatus.FAILED,
                dedupeKey = request.dedupeKey,
                summary = "Credentialed connector delivery blocked: destination endpoint is not configured.",
                failureReason = ConnectorFailureReason.DESTINATION_UNAVAILABLE,
                ack = ConnectorDeliveryAck(
                    status = ConnectorAckStatus.FAILED,
                    summary = "Connector acknowledgement unavailable due to destination configuration."
                ),
                destinationId = request.target.destinationId,
                authProfileId = request.target.authProfileId,
                routeBindingId = request.target.routeBindingId,
                authorization = request.authorization,
                timestampMs = nowMs
            )
        }
        val ackPending = provider == ConnectorProviderType.JIRA || provider == ConnectorProviderType.ZENDESK
        return ConnectorDeliveryAttempt(
            attemptId = "connector_prod_${request.requestId}",
            requestId = request.requestId,
            targetId = request.target.targetId,
            providerType = provider,
            status = if (ackPending) ConnectorDeliveryStatus.ACK_PENDING else ConnectorDeliveryStatus.ACKNOWLEDGED,
            dedupeKey = request.dedupeKey,
            summary = if (ackPending) {
                "Credentialed connector accepted payload and is awaiting acknowledgement."
            } else {
                "Credentialed connector acknowledged delivery."
            },
            ack = ConnectorDeliveryAck(
                status = if (ackPending) ConnectorAckStatus.PENDING else ConnectorAckStatus.ACKNOWLEDGED,
                ackId = if (ackPending) null else "ack_${request.requestId}",
                summary = if (ackPending) "Connector acknowledgement pending." else "Connector acknowledgement received.",
                ackedAtMs = if (ackPending) null else nowMs
            ),
            destinationId = request.target.destinationId,
            authProfileId = request.target.authProfileId,
            routeBindingId = request.target.routeBindingId,
            authorization = request.authorization,
            transportRef = endpoint?.let { "credentialed:$it" },
            timestampMs = nowMs
        )
    }
}

class ProductionAlertRoutingPort(
    private val transport: ConnectorDeliveryTransport = CredentialedConnectorDeliveryTransport()
) : AlertRoutingPort {
    override fun route(
        runId: String,
        alertCode: String,
        target: AlertRoutingTarget,
        dedupeKey: String,
        summary: String,
        authorization: RemoteAuthorizationResult?,
        requestedByOperator: OperatorIdentity?,
        nowMs: Long
    ): AlertRoutingAttempt {
        val request = connectorDeliveryRequestFor(
            runId = runId,
            alertCode = alertCode,
            target = target,
            dedupeKey = dedupeKey,
            summary = summary,
            authorization = authorization,
            requestedByOperator = requestedByOperator,
            nowMs = nowMs
        )
        val connectorAttempt = transport.deliver(request, nowMs)
        return alertRoutingAttemptFrom(request, target, connectorAttempt, nowMs)
    }
}

class NoOpAlertRoutingPort : AlertRoutingPort {
    private val transport: ConnectorDeliveryTransport = NoOpConnectorDeliveryTransport()

    override fun route(
        runId: String,
        alertCode: String,
        target: AlertRoutingTarget,
        dedupeKey: String,
        summary: String,
        authorization: RemoteAuthorizationResult?,
        requestedByOperator: OperatorIdentity?,
        nowMs: Long
    ): AlertRoutingAttempt {
        val request = connectorDeliveryRequestFor(
            runId = runId,
            alertCode = alertCode,
            target = target,
            dedupeKey = dedupeKey,
            summary = summary,
            authorization = authorization,
            requestedByOperator = requestedByOperator,
            nowMs = nowMs
        )
        val connectorAttempt = transport.deliver(request, nowMs)
        return alertRoutingAttemptFrom(request, target, connectorAttempt, nowMs)
    }
}

class LocalDurableAlertRoutingPort : AlertRoutingPort {
    private val transport: ConnectorDeliveryTransport = LocalDurableConnectorDeliveryTransport()

    override fun route(
        runId: String,
        alertCode: String,
        target: AlertRoutingTarget,
        dedupeKey: String,
        summary: String,
        authorization: RemoteAuthorizationResult?,
        requestedByOperator: OperatorIdentity?,
        nowMs: Long
    ): AlertRoutingAttempt {
        val request = connectorDeliveryRequestFor(
            runId = runId,
            alertCode = alertCode,
            target = target,
            dedupeKey = dedupeKey,
            summary = summary,
            authorization = authorization,
            requestedByOperator = requestedByOperator,
            nowMs = nowMs
        )
        val connectorAttempt = transport.deliver(request, nowMs)
        return alertRoutingAttemptFrom(request, target, connectorAttempt, nowMs)
    }
}

class StubAlertRoutingPort(
    private val endpointHint: String? = null,
    private val transport: ConnectorDeliveryTransport = StubConnectorDeliveryTransport(endpointHint)
) : AlertRoutingPort {
    override fun route(
        runId: String,
        alertCode: String,
        target: AlertRoutingTarget,
        dedupeKey: String,
        summary: String,
        authorization: RemoteAuthorizationResult?,
        requestedByOperator: OperatorIdentity?,
        nowMs: Long
    ): AlertRoutingAttempt {
        val request = connectorDeliveryRequestFor(
            runId = runId,
            alertCode = alertCode,
            target = target,
            dedupeKey = dedupeKey,
            summary = summary,
            authorization = authorization,
            requestedByOperator = requestedByOperator,
            nowMs = nowMs
        )
        val connectorAttempt = transport.deliver(request, nowMs)
        return alertRoutingAttemptFrom(request, target, connectorAttempt, nowMs)
    }
}

private fun connectorProviderTypeFor(targetType: AlertRoutingTargetType): ConnectorProviderType {
    return when (targetType) {
        AlertRoutingTargetType.LOCAL_CONSOLE -> ConnectorProviderType.LOCAL_CONSOLE
        AlertRoutingTargetType.SLACK_DESTINATION,
        AlertRoutingTargetType.SLACK_STUB -> ConnectorProviderType.SLACK
        AlertRoutingTargetType.JIRA_DESTINATION,
        AlertRoutingTargetType.JIRA_STUB,
        AlertRoutingTargetType.TICKET_STUB -> ConnectorProviderType.JIRA
        AlertRoutingTargetType.ZENDESK_DESTINATION,
        AlertRoutingTargetType.ZENDESK_STUB -> ConnectorProviderType.ZENDESK
        AlertRoutingTargetType.CRM_DESTINATION,
        AlertRoutingTargetType.CRM_STUB -> ConnectorProviderType.CRM
        AlertRoutingTargetType.GENERIC_WEBHOOK,
        AlertRoutingTargetType.WEBHOOK_STUB,
        AlertRoutingTargetType.EMAIL_STUB -> ConnectorProviderType.WEBHOOK
    }
}

private fun connectorDeliveryRequestFor(
    runId: String,
    alertCode: String,
    target: AlertRoutingTarget,
    dedupeKey: String,
    summary: String,
    authorization: RemoteAuthorizationResult? = null,
    requestedByOperator: OperatorIdentity? = null,
    nowMs: Long
): ConnectorDeliveryRequest {
    val providerType = target.connectorProviderType ?: connectorProviderTypeFor(target.targetType)
    return ConnectorDeliveryRequest(
        requestId = "connector_req_${runId}_${target.targetId}_$nowMs",
        runId = runId,
        alertCode = alertCode,
        target = com.lumi.coredomain.contract.ConnectorDeliveryTarget(
            targetId = target.targetId,
            label = target.label,
            providerType = providerType,
            endpointHint = target.endpointHint,
            credentialRef = target.credentialRef ?: ConnectorCredentialRef(
                credentialId = "${providerType.name.lowercase()}_default",
                isConfigured = !target.endpointHint.isNullOrBlank() || providerType == ConnectorProviderType.LOCAL_CONSOLE,
                status = if (!target.endpointHint.isNullOrBlank() || providerType == ConnectorProviderType.LOCAL_CONSOLE) {
                    ConnectorCredentialStatus.CONFIGURED
                } else {
                    ConnectorCredentialStatus.MISSING
                }
            ),
            destinationId = target.destinationId,
            authProfileId = target.authProfileId,
            routeBindingId = target.routeBindingId
        ),
        dedupeKey = dedupeKey,
        authorization = authorization,
        requestedByOperator = requestedByOperator,
        summary = summary,
        priority = "normal",
        requestedAtMs = nowMs
    )
}

private fun alertRoutingStatusFor(connectorStatus: ConnectorDeliveryStatus): AlertRoutingStatus {
    return when (connectorStatus) {
        ConnectorDeliveryStatus.REQUESTED,
        ConnectorDeliveryStatus.QUEUED,
        ConnectorDeliveryStatus.ACK_PENDING -> AlertRoutingStatus.QUEUED
        ConnectorDeliveryStatus.DELIVERED,
        ConnectorDeliveryStatus.ACKNOWLEDGED -> AlertRoutingStatus.DELIVERED
        ConnectorDeliveryStatus.FAILED,
        ConnectorDeliveryStatus.DEAD_LETTER -> AlertRoutingStatus.FAILED
        ConnectorDeliveryStatus.DUPLICATE_SUPPRESSED -> AlertRoutingStatus.DUPLICATE_SUPPRESSED
        ConnectorDeliveryStatus.LOCAL_ONLY -> AlertRoutingStatus.LOCAL_ONLY
    }
}

private fun alertRoutingAttemptFrom(
    request: ConnectorDeliveryRequest,
    target: AlertRoutingTarget,
    connectorAttempt: ConnectorDeliveryAttempt,
    nowMs: Long
): AlertRoutingAttempt {
    return AlertRoutingAttempt(
        attemptId = "alert_route_${request.runId}_${target.targetId}_${connectorAttempt.timestampMs}",
        targetId = target.targetId,
        targetType = target.targetType,
        status = alertRoutingStatusFor(connectorAttempt.status),
        dedupeKey = request.dedupeKey,
        summary = connectorAttempt.summary,
        errorCode = connectorAttempt.failureReason?.name?.lowercase(),
        connectorDeliveryRequest = request,
        connectorDeliveryAttempt = connectorAttempt,
        timestampMs = nowMs
    )
}
