package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceTransportSummary
import com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyReference
import com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyStatus
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningAckRecord
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningBatch
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorHealthStatus
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorProfile
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportConnectorType
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportFailureReason
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportIssue
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportIssueType
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportMode
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteTransportRetryPolicy
import com.lumi.coredomain.contract.PortfolioOptimizationTransportCredentialBlockReason
import com.lumi.coredomain.contract.PortfolioOptimizationTransportCredentialResolutionResult
import com.lumi.coredomain.contract.RoleReasonCodes

data class RemoteLearningTransportConnectorRuntime(
    val connectorProfile: PortfolioOptimizationRemoteTransportConnectorProfile =
        PortfolioOptimizationRemoteTransportConnectorProfile(
            profileId = "portfolio_remote_connector_noop",
            type = PortfolioOptimizationRemoteTransportConnectorType.NO_OP,
            displayName = "Local-only connector",
            healthStatus = PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
            summary = "Local-only connector keeps remote delivery disabled by default."
        ),
    val enterpriseKeyReference: PortfolioOptimizationEnterpriseKeyReference? = null,
    val credentialResolution: PortfolioOptimizationTransportCredentialResolutionResult =
        PortfolioOptimizationTransportCredentialResolutionResult(
            resolved = true,
            summary = "No remote credential is required for this connector."
        ),
    val transportSummary: PortfolioOptimizationComplianceTransportSummary =
        PortfolioOptimizationComplianceTransportSummary(
            connectorSummary = "Local-only connector keeps remote delivery disabled by default.",
            summary = "Local-only connector keeps remote delivery disabled by default."
        )
)

data class RemoteLearningTransportDelivery(
    val status: PortfolioOptimizationRemoteLearningDeliveryStatus =
        PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
    val issues: List<PortfolioOptimizationRemoteLearningTransportIssue> = emptyList(),
    val ackRecord: PortfolioOptimizationRemoteLearningAckRecord? = null,
    val failureReason: PortfolioOptimizationRemoteTransportFailureReason =
        PortfolioOptimizationRemoteTransportFailureReason.NONE,
    val reasonCodes: List<String> = emptyList(),
    val summary: String = ""
)

interface RemoteLearningTransportPort {
    val transportMode: PortfolioOptimizationRemoteLearningTransportMode

    fun inspect(
        purpose: PortfolioOptimizationConsentPurpose,
        nowMs: Long
    ): RemoteLearningTransportConnectorRuntime

    fun deliver(
        batch: PortfolioOptimizationRemoteLearningBatch,
        nowMs: Long
    ): RemoteLearningTransportDelivery
}

class NoOpRemoteLearningTransportPort : RemoteLearningTransportPort {
    override val transportMode: PortfolioOptimizationRemoteLearningTransportMode =
        PortfolioOptimizationRemoteLearningTransportMode.NO_OP

    override fun inspect(
        purpose: PortfolioOptimizationConsentPurpose,
        nowMs: Long
    ): RemoteLearningTransportConnectorRuntime {
        return RemoteLearningTransportConnectorRuntime(
            connectorProfile = PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_noop",
                type = PortfolioOptimizationRemoteTransportConnectorType.NO_OP,
                displayName = "Local-only connector",
                healthStatus = PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 1,
                    localFallbackAllowed = true,
                    summary = "No-op connector always preserves local-first truth."
                ),
                summary = "Local-only connector keeps remote delivery disabled by default.",
                updatedAtMs = nowMs
            ),
            credentialResolution = PortfolioOptimizationTransportCredentialResolutionResult(
                connectorProfileId = "portfolio_remote_connector_noop",
                resolved = true,
                summary = "No remote credential is required for the local-only connector.",
                checkedAtMs = nowMs
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = "Local-only connector keeps remote delivery disabled by default.",
                complianceSummary = "Remote delivery remains disabled; local-first truth is unchanged.",
                summary = "Local-only connector keeps remote delivery disabled by default."
            )
        )
    }

    override fun deliver(
        batch: PortfolioOptimizationRemoteLearningBatch,
        nowMs: Long
    ): RemoteLearningTransportDelivery {
        return RemoteLearningTransportDelivery(
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_ONLY,
            issues = listOf(
                PortfolioOptimizationRemoteLearningTransportIssue(
                    type = PortfolioOptimizationRemoteLearningTransportIssueType.TRANSPORT_UNAVAILABLE,
                    blocking = false,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_LOCAL_ONLY),
                    summary = "Remote learning transport is disabled; the batch remains local."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_LOCAL_ONLY),
            summary = "Remote learning transport is disabled; artifacts remain local-first."
        )
    }
}

class LocalDurableRemoteLearningTransportPort : RemoteLearningTransportPort {
    override val transportMode: PortfolioOptimizationRemoteLearningTransportMode =
        PortfolioOptimizationRemoteLearningTransportMode.LOCAL_DURABLE

    override fun inspect(
        purpose: PortfolioOptimizationConsentPurpose,
        nowMs: Long
    ): RemoteLearningTransportConnectorRuntime {
        return RemoteLearningTransportConnectorRuntime(
            connectorProfile = PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_local_durable",
                type = PortfolioOptimizationRemoteTransportConnectorType.LOCAL_DURABLE,
                displayName = "Local durable queue",
                healthStatus = PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    deadLetterAfterMaxAttempts = false,
                    localFallbackAllowed = true,
                    summary = "Local durable queue can retry without leaving the device."
                ),
                summary = "Local durable queue keeps batches recoverable on-device.",
                updatedAtMs = nowMs
            ),
            credentialResolution = PortfolioOptimizationTransportCredentialResolutionResult(
                connectorProfileId = "portfolio_remote_connector_local_durable",
                resolved = true,
                summary = "Local durable queue does not require remote credentials.",
                checkedAtMs = nowMs
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = "Local durable queue keeps batches recoverable on-device.",
                complianceSummary = "Remote connector state remains local-only and recoverable.",
                summary = "Local durable queue keeps batches recoverable on-device."
            )
        )
    }

    override fun deliver(
        batch: PortfolioOptimizationRemoteLearningBatch,
        nowMs: Long
    ): RemoteLearningTransportDelivery {
        return RemoteLearningTransportDelivery(
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.QUEUED,
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_QUEUED),
            summary = "Remote learning batch ${batch.batchId.takeLast(8)} was queued locally for later transport."
        )
    }
}

class StubRemoteLearningTransportPort(
    private val endpointHint: String? = null,
    private val ackPendingPurpose: PortfolioOptimizationConsentPurpose? = null
) : RemoteLearningTransportPort {
    override val transportMode: PortfolioOptimizationRemoteLearningTransportMode =
        PortfolioOptimizationRemoteLearningTransportMode.STUB_REMOTE

    override fun inspect(
        purpose: PortfolioOptimizationConsentPurpose,
        nowMs: Long
    ): RemoteLearningTransportConnectorRuntime {
        return RemoteLearningTransportConnectorRuntime(
            connectorProfile = PortfolioOptimizationRemoteTransportConnectorProfile(
                profileId = "portfolio_remote_connector_stub",
                type = PortfolioOptimizationRemoteTransportConnectorType.STUB_REMOTE,
                displayName = "Stub remote connector",
                endpointRef = endpointHint.orEmpty(),
                healthStatus = PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
                retryPolicy = PortfolioOptimizationRemoteTransportRetryPolicy(
                    maxAttempts = 2,
                    localFallbackAllowed = true,
                    summary = "Stub connector mirrors production remote retry semantics."
                ),
                summary = "Stub remote connector is healthy and adapter-ready.",
                updatedAtMs = nowMs
            ),
            enterpriseKeyReference = PortfolioOptimizationEnterpriseKeyReference(
                keyRefId = "portfolio_remote_key_stub",
                connectorProfileId = "portfolio_remote_connector_stub",
                providerName = "stub-connector",
                status = PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                usagePolicy = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyUsagePolicy(
                    remoteTransportAllowed = true,
                    auditExportAllowed = true,
                    purposeLimited = true,
                    summary = "Stub remote key remains purpose-limited."
                ),
                summary = "Stub remote key is healthy.",
                updatedAtMs = nowMs
            ),
            credentialResolution = PortfolioOptimizationTransportCredentialResolutionResult(
                connectorProfileId = "portfolio_remote_connector_stub",
                keyRefId = "portfolio_remote_key_stub",
                resolved = true,
                summary = "Stub remote connector resolved a healthy enterprise key reference.",
                checkedAtMs = nowMs
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = "Stub remote connector is healthy and adapter-ready.",
                keySummary = "Stub remote key is healthy.",
                complianceSummary = "Stub remote connector preserves purpose-limited, redacted artifact delivery.",
                summary = "Stub remote connector is healthy and adapter-ready."
            )
        )
    }

    override fun deliver(
        batch: PortfolioOptimizationRemoteLearningBatch,
        nowMs: Long
    ): RemoteLearningTransportDelivery {
        val ackPending = ackPendingPurpose != null && batch.purpose == ackPendingPurpose
        return RemoteLearningTransportDelivery(
            status = if (ackPending) {
                PortfolioOptimizationRemoteLearningDeliveryStatus.ACK_PENDING
            } else {
                PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED
            },
            ackRecord = PortfolioOptimizationRemoteLearningAckRecord(
                ackId = "remote_ack_${batch.batchId.takeLast(8)}",
                batchId = batch.batchId,
                remoteRef = endpointHint?.let { "stub:$it:${batch.batchId}" },
                summary = if (ackPending) {
                    "Stub remote transport accepted the batch and is awaiting acknowledgement."
                } else {
                    "Stub remote transport acknowledged the batch."
                },
                ackedAtMs = if (ackPending) null else nowMs
            ),
            reasonCodes = if (ackPending) {
                listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_QUEUED)
            } else {
                listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_ACKED)
            },
            summary = if (ackPending) {
                "Stub remote transport accepted the learning batch and is awaiting acknowledgement."
            } else {
                "Stub remote transport acknowledged the learning batch."
            }
        )
    }
}

class ProductionRemoteLearningTransportPort(
    private val connectorProfile: PortfolioOptimizationRemoteTransportConnectorProfile =
        PortfolioOptimizationRemoteTransportConnectorProfile(
            profileId = "portfolio_remote_connector_https",
            type = PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            displayName = "HTTPS webhook connector",
            endpointRef = "https://enterprise.example/learning",
            healthStatus = PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
            retryPolicy = PortfolioOptimizationRemoteTransportRetryPolicy(
                maxAttempts = 2,
                localFallbackAllowed = true,
                summary = "Production connector retries once before dead-letter or local fallback."
            ),
            summary = "HTTPS webhook connector is production-ready and health-checked."
        ),
    private val enterpriseKeyReference: PortfolioOptimizationEnterpriseKeyReference? =
        PortfolioOptimizationEnterpriseKeyReference(
            keyRefId = "portfolio_remote_key_https",
            connectorProfileId = "portfolio_remote_connector_https",
            providerName = "enterprise-vault",
            status = PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            usagePolicy = com.lumi.coredomain.contract.PortfolioOptimizationEnterpriseKeyUsagePolicy(
                remoteTransportAllowed = true,
                auditExportAllowed = true,
                purposeLimited = true,
                summary = "Enterprise key is limited to redacted learning artifacts."
            ),
            summary = "Enterprise key is healthy.",
            updatedAtMs = 0L
        ),
    private val credentialResolution: PortfolioOptimizationTransportCredentialResolutionResult =
        PortfolioOptimizationTransportCredentialResolutionResult(
            connectorProfileId = "portfolio_remote_connector_https",
            keyRefId = "portfolio_remote_key_https",
            resolved = true,
            summary = "Enterprise credential resolved successfully."
        ),
    private val deliveryFailureReason: PortfolioOptimizationRemoteTransportFailureReason =
        PortfolioOptimizationRemoteTransportFailureReason.NONE,
    private val ackPendingPurpose: PortfolioOptimizationConsentPurpose? = null
) : RemoteLearningTransportPort {
    override val transportMode: PortfolioOptimizationRemoteLearningTransportMode =
        PortfolioOptimizationRemoteLearningTransportMode.PRODUCTION_CONNECTOR

    override fun inspect(
        purpose: PortfolioOptimizationConsentPurpose,
        nowMs: Long
    ): RemoteLearningTransportConnectorRuntime {
        return RemoteLearningTransportConnectorRuntime(
            connectorProfile = connectorProfile.copy(
                updatedAtMs = nowMs,
                summary = connectorProfile.summary.ifBlank {
                    "${connectorProfile.displayName.ifBlank { "Production connector" }} is ${connectorProfile.healthStatus.name.lowercase()}."
                }
            ),
            enterpriseKeyReference = enterpriseKeyReference?.copy(
                updatedAtMs = nowMs,
                summary = enterpriseKeyReference.summary.ifBlank {
                    "Enterprise key ${enterpriseKeyReference.keyRefId} is ${enterpriseKeyReference.status.name.lowercase().replace('_', ' ')}."
                }
            ),
            credentialResolution = credentialResolution.copy(
                checkedAtMs = nowMs
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = connectorProfile.summary.ifBlank {
                    "${connectorProfile.displayName.ifBlank { "Production connector" }} is ${connectorProfile.healthStatus.name.lowercase()}."
                },
                keySummary = enterpriseKeyReference?.summary.orEmpty(),
                complianceSummary = "Connector preserves redacted, purpose-limited learning delivery.",
                summary = "Connector and key state are ready for redacted remote delivery."
            )
        )
    }

    override fun deliver(
        batch: PortfolioOptimizationRemoteLearningBatch,
        nowMs: Long
    ): RemoteLearningTransportDelivery {
        if (deliveryFailureReason != PortfolioOptimizationRemoteTransportFailureReason.NONE) {
            return RemoteLearningTransportDelivery(
                status = PortfolioOptimizationRemoteLearningDeliveryStatus.FAILED,
                issues = listOf(
                    PortfolioOptimizationRemoteLearningTransportIssue(
                        type = PortfolioOptimizationRemoteLearningTransportIssueType.TRANSPORT_UNAVAILABLE,
                        blocking = false,
                        reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_FAILED),
                        summary = "Connector delivery failed with ${deliveryFailureReason.name.lowercase().replace('_', ' ')}."
                    )
                ),
                failureReason = deliveryFailureReason,
                reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_FAILED),
                summary = "Connector delivery failed with ${deliveryFailureReason.name.lowercase().replace('_', ' ')}."
            )
        }
        val ackPending = ackPendingPurpose != null && batch.purpose == ackPendingPurpose
        return RemoteLearningTransportDelivery(
            status = if (ackPending) {
                PortfolioOptimizationRemoteLearningDeliveryStatus.ACK_PENDING
            } else {
                PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED
            },
            ackRecord = PortfolioOptimizationRemoteLearningAckRecord(
                ackId = "remote_ack_${batch.batchId.takeLast(8)}",
                batchId = batch.batchId,
                remoteRef = "${connectorProfile.endpointRef.ifBlank { "https://connector.invalid" }}/${batch.batchId}",
                summary = if (ackPending) {
                    "Connector accepted the batch and is awaiting acknowledgement."
                } else {
                    "Connector acknowledged the batch."
                },
                ackedAtMs = if (ackPending) null else nowMs
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_ACKED),
            summary = if (ackPending) {
                "Connector accepted the learning batch and is awaiting acknowledgement."
            } else {
                "Connector acknowledged the learning batch."
            }
        )
    }
}
