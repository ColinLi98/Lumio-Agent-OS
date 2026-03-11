package com.lumi.keyboard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.lumi.appbackend.BuildConfig
import com.lumi.cloudadapters.CloudAdapterConfig
import com.lumi.cloudadapters.CloudBaseUrlResolver
import com.lumi.cloudadapters.OpenClawRelayGateway
import com.lumi.cloudadapters.VercelCloudGateway
import com.lumi.coreagent.orchestrator.AgentOrchestrator
import com.lumi.coreagent.orchestrator.RoutingScoreConfigProvider
import com.lumi.coreagent.orchestrator.SuperAgentKernel
import com.lumi.coreagent.soul.InMemoryDigitalSoulStore
import com.lumi.keyboard.data.local.LocalAuditRepository
import com.lumi.keyboard.state.EdgeTwinModelFactory
import com.lumi.keyboard.state.TwinCloudSyncCoordinator
import com.lumi.keyboard.state.SharedPrefsDynamicStateStore
import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.AgentAction
import com.lumi.coredomain.contract.AgentActionType
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.AgentResultObserver
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.ActorAvailabilityPayload
import com.lumi.coredomain.contract.ActorRole
import com.lumi.coredomain.contract.ConnectorReadinessPayload
import com.lumi.coredomain.contract.DependencyReadinessState
import com.lumi.coredomain.contract.EnvironmentActivationPayload
import com.lumi.coredomain.contract.EnvironmentKind
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.GovernanceActionResult
import com.lumi.coredomain.contract.GovernanceBulkActionRequest
import com.lumi.coredomain.contract.GovernanceBulkActionResult
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.GovernanceCaseRecord
import com.lumi.coredomain.contract.GovernanceConsoleFilter
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.GovernanceQuery
import com.lumi.coredomain.contract.GovernanceSummary
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.LedgerQueryFilter
import com.lumi.coredomain.contract.LocalRoleLabActorPayload
import com.lumi.coredomain.contract.LocalRoleLabSummaryPayload
import com.lumi.coredomain.contract.LumiBackendBridge
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.PilotActivationStatus
import com.lumi.coredomain.contract.PilotActivationOwnerType
import com.lumi.coredomain.contract.PilotActivationPackageStatus
import com.lumi.coredomain.contract.PilotActivationPackageSummaryPayload
import com.lumi.coredomain.contract.PilotActivationRequirementStatus
import com.lumi.coredomain.contract.PilotActivationChecklistItemPayload
import com.lumi.coredomain.contract.PilotActivationBlockerSummaryPayload
import com.lumi.coredomain.contract.PilotAccessGrantState
import com.lumi.coredomain.contract.PilotConnectorActivationPayload
import com.lumi.coredomain.contract.PilotConnectorActivationState
import com.lumi.coredomain.contract.PilotEvidenceCategory
import com.lumi.coredomain.contract.PilotEvidenceCategoryStatusPayload
import com.lumi.coredomain.contract.PilotEnvironmentBindingPayload
import com.lumi.coredomain.contract.PilotEnvironmentBindingState
import com.lumi.coredomain.contract.PilotExternalArtifactIntakePayload
import com.lumi.coredomain.contract.PilotExternalArtifactKind
import com.lumi.coredomain.contract.PilotExternalArtifactVerificationStatus
import com.lumi.coredomain.contract.PilotProvisioningState
import com.lumi.coredomain.contract.PortfolioScenarioComparison
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult
import com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose
import com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier
import com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction
import com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningScope
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationAdoptionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationApprovalRecord
import com.lumi.coredomain.contract.PortfolioOptimizationPropagationAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncEnvelope
import com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncMode
import com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportAttemptRecord
import com.lumi.coredomain.contract.PortfolioOptimizationTuningDecisionRecord
import com.lumi.coredomain.contract.PortfolioOutcomeObservationSet
import com.lumi.coredomain.contract.PortfolioOptimizationQuery
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationResult
import com.lumi.coredomain.contract.PortfolioOptimizationResultStatus
import com.lumi.coredomain.contract.PortfolioOptimizationState
import com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord
import com.lumi.coredomain.contract.PortfolioSimulationQuery
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.PortfolioSimulationState
import com.lumi.coredomain.contract.IdentityReadinessPayload
import com.lumi.coredomain.contract.PolicyStudioSummaryPayload
import com.lumi.coredomain.contract.ProductShellSummaryPayload
import com.lumi.coredomain.contract.RequesterInboxGroup
import com.lumi.coredomain.contract.RequesterInboxItemPayload
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoleReasonCodes
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyEditorState
import com.lumi.coredomain.contract.RolePolicyUpdateResult
import com.lumi.coredomain.contract.RoutingDecisionPayload
import com.lumi.coredomain.contract.StateConsensusPayload
import com.lumi.coredomain.contract.TenantAdminActivationSummaryPayload
import com.lumi.coredomain.contract.SkillGapPayload
import com.lumi.coredomain.contract.SkillInvocationPayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import com.lumi.coredomain.contract.VaultReadinessPayload
import com.lumi.coredomain.contract.WorkspaceBindingKind
import com.lumi.coredomain.contract.WorkspaceModeOptionPayload
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

class LumiAgentBackendService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val routingScoreConfig = RoutingScoreConfigProvider.parse(BuildConfig.LUMI_ROUTING_SCORE_CONFIG_JSON)
    private val edgeTwinModel by lazy {
        EdgeTwinModelFactory.create(
            context = applicationContext,
            modeRaw = BuildConfig.DIGITAL_TWIN_EDGE_MODEL_MODE,
            versionRaw = BuildConfig.DIGITAL_TWIN_EDGE_MODEL_VERSION
        )
    }
    private val twinCloudSyncCoordinator by lazy {
        TwinCloudSyncCoordinator(
            context = applicationContext,
            baseUrl = CloudBaseUrlResolver.resolve(explicit = BuildConfig.LUMI_BASE_URL),
            cloudSyncEnabled = BuildConfig.DIGITAL_TWIN_CLOUD_SYNC_ENABLED
        )
    }
    private val orchestrator by lazy {
        val soulStore = InMemoryDigitalSoulStore(
            onDeviceTwinModel = edgeTwinModel.model,
            ruleFallbackEnabled = edgeTwinModel.config.ruleFallbackEnabled
        )
        SuperAgentKernel(
            routingScoreConfigProvider = {
                routingScoreConfig ?: RoutingScoreConfigProvider.current()
            },
            orchestrator = AgentOrchestrator(
                soulStore = soulStore,
                routingScoreConfigProvider = {
                    routingScoreConfig ?: RoutingScoreConfigProvider.current()
                },
                dynamicStatePersistence = SharedPrefsDynamicStateStore(applicationContext),
                imeBackendV2Enabled = BuildConfig.IME_BACKEND_V2_ENABLED,
                appFullFeatureParityEnabled = BuildConfig.APP_FULL_FEATURE_PARITY_ENABLED,
                digitalTwinCloudSyncEnabled = BuildConfig.DIGITAL_TWIN_CLOUD_SYNC_ENABLED,
                digitalTwinEdgeModelMode = edgeTwinModel.config.mode.wireValue,
                digitalTwinEdgeModelVersion = edgeTwinModel.config.modelVersion,
                digitalTwinEdgeFallbackEnabled = edgeTwinModel.config.ruleFallbackEnabled,
                cloudAdapterFallbackEnabled = BuildConfig.CLOUD_ADAPTER_FALLBACK_ENABLED,
                twinSyncStatusProvider = {
                    twinCloudSyncCoordinator.snapshot()
                }
            )
        )
    }
    private lateinit var auditRepository: LocalAuditRepository
    private val sessionCache = SessionContextCache()
    private val requestStore = ConcurrentHashMap<String, RequestState>()
    private val requestJobs = ConcurrentHashMap<String, Job>()
    private val observerStore = ConcurrentHashMap<String, CopyOnWriteArrayList<AgentResultObserver>>()
    private val executionLimiter = Semaphore(2)

    private val cloudGateway by lazy {
        val cloudBaseUrl = CloudBaseUrlResolver.resolve(explicit = BuildConfig.LUMI_BASE_URL)
        val vercel = VercelCloudGateway(
            config = CloudAdapterConfig(
                baseUrl = cloudBaseUrl,
                geminiApiKey = BuildConfig.LUMI_GEMINI_API_KEY.takeIf { it.isNotBlank() }
            )
        )
        OpenClawRelayGateway(
            relayBaseUrl = "$cloudBaseUrl/api/openclaw",
            fallback = vercel,
            strictOpenClaw = true
        )
    }

    private val binder = BackendBinder()

    override fun onCreate() {
        super.onCreate()
        auditRepository = LocalAuditRepository(applicationContext)
        ensureForeground()
        scheduleCleanupLoop()
    }

    override fun onDestroy() {
        super.onDestroy()
        requestJobs.values.forEach { it.cancel() }
        observerStore.clear()
    }

    override fun onBind(intent: Intent?): IBinder = binder

    private inner class BackendBinder : Binder(), LumiBackendBridge {
        override fun submitAgentRequest(request: AgentRequest): String {
            return this@LumiAgentBackendService.submitAgentRequest(request)
        }

        override fun getAgentResult(requestId: String): AgentResponse {
            return this@LumiAgentBackendService.getAgentResult(requestId)
        }

        override fun observeAgentResult(requestId: String, observer: AgentResultObserver) {
            this@LumiAgentBackendService.observeAgentResult(requestId, observer)
        }

        override fun cancelRequest(requestId: String): Boolean {
            return this@LumiAgentBackendService.cancelRequest(requestId)
        }

        override fun recordInteraction(event: InteractionEvent) {
            this@LumiAgentBackendService.recordInteraction(event)
        }

        override fun getDigitalSoulSummary(userId: String): DigitalSoulSummary {
            return this@LumiAgentBackendService.getDigitalSoulSummary(userId)
        }

        override fun getModuleSnapshot(userId: String, module: ModuleId): AgentResponse {
            return this@LumiAgentBackendService.getModuleSnapshot(userId, module)
        }

        override fun getRoutingDecision(requestId: String): RoutingDecisionPayload? {
            return this@LumiAgentBackendService.getRoutingDecision(requestId)
        }

        override fun listSkillInvocations(requestId: String): List<SkillInvocationPayload> {
            return this@LumiAgentBackendService.listSkillInvocations(requestId)
        }

        override fun getSkillGapReport(module: ModuleId): SkillGapPayload? {
            return this@LumiAgentBackendService.getSkillGapReport(module)
        }

        override fun getDynamicState(userId: String): DynamicHumanStatePayload? {
            return this@LumiAgentBackendService.getDynamicState(userId)
        }

        override fun getTrajectory(userId: String, days: Int): List<TrajectoryPointPayload> {
            return this@LumiAgentBackendService.getTrajectory(userId, days)
        }

        override fun updateStateConsensus(userId: String, patch: StateConsensusPayload): Boolean {
            return this@LumiAgentBackendService.updateStateConsensus(userId, patch)
        }

        override fun getRolePolicyEditorState(userId: String, role: UserRole): RolePolicyEditorState? {
            return this@LumiAgentBackendService.getRolePolicyEditorState(userId, role)
        }

        override fun updateRolePolicy(
            userId: String,
            role: UserRole,
            draft: RolePolicyDraft
        ): RolePolicyUpdateResult {
            return this@LumiAgentBackendService.updateRolePolicy(userId, role, draft)
        }

        override fun resetRolePolicy(userId: String, role: UserRole): RolePolicyUpdateResult {
            return this@LumiAgentBackendService.resetRolePolicy(userId, role)
        }

        override fun getExecutionLedger(
            userId: String,
            filter: LedgerQueryFilter
        ): List<ExecutionReceiptRecord> {
            return this@LumiAgentBackendService.getExecutionLedger(userId, filter)
        }

        override fun getGovernanceSummary(
            userId: String,
            query: GovernanceQuery
        ): GovernanceSummary {
            return this@LumiAgentBackendService.getGovernanceSummary(userId, query)
        }

        override fun getGovernanceCases(
            userId: String,
            filter: GovernanceConsoleFilter
        ): List<GovernanceCaseRecord> {
            return this@LumiAgentBackendService.getGovernanceCases(userId, filter)
        }

        override fun getGovernanceConsoleState(
            userId: String,
            filter: GovernanceConsoleFilter
        ): GovernanceConsoleState {
            return this@LumiAgentBackendService.getGovernanceConsoleState(userId, filter)
        }

        override fun markGovernanceCaseReviewed(
            userId: String,
            runId: String
        ): GovernanceActionResult {
            return this@LumiAgentBackendService.markGovernanceCaseReviewed(userId, runId)
        }

        override fun retryGovernanceSyncIntent(
            userId: String,
            runId: String
        ): GovernanceActionResult {
            return this@LumiAgentBackendService.retryGovernanceSyncIntent(userId, runId)
        }

        override fun updateGovernanceCaseCollaboration(
            userId: String,
            runId: String,
            command: GovernanceCollaborationCommand
        ): GovernanceActionResult {
            return this@LumiAgentBackendService.updateGovernanceCaseCollaboration(userId, runId, command)
        }

        override fun getPortfolioSimulationState(
            userId: String,
            query: PortfolioSimulationQuery
        ): PortfolioSimulationState {
            return this@LumiAgentBackendService.getPortfolioSimulationState(userId, query)
        }

        override fun getPortfolioOptimizationState(
            userId: String,
            query: PortfolioOptimizationQuery
        ): PortfolioOptimizationState {
            return this@LumiAgentBackendService.getPortfolioOptimizationState(userId, query)
        }

        override fun savePortfolioScenario(
            userId: String,
            scenario: PortfolioScenarioDefinition
        ): PortfolioScenarioDefinition {
            return this@LumiAgentBackendService.savePortfolioScenario(userId, scenario)
        }

        override fun savePortfolioOptimizationRequest(
            userId: String,
            request: PortfolioOptimizationRequest
        ): PortfolioOptimizationRequest {
            return this@LumiAgentBackendService.savePortfolioOptimizationRequest(userId, request)
        }

        override fun runPortfolioScenario(
            userId: String,
            scenarioId: String
        ): PortfolioSimulationRunRecord {
            return this@LumiAgentBackendService.runPortfolioScenario(userId, scenarioId)
        }

        override fun runPortfolioOptimization(
            userId: String,
            requestId: String
        ): PortfolioOptimizationResult {
            return this@LumiAgentBackendService.runPortfolioOptimization(userId, requestId)
        }

        override fun comparePortfolioSimulationRuns(
            userId: String,
            baselineRunId: String,
            candidateRunId: String
        ): PortfolioScenarioComparison {
            return this@LumiAgentBackendService.comparePortfolioSimulationRuns(
                userId = userId,
                baselineRunId = baselineRunId,
                candidateRunId = candidateRunId
            )
        }

        override fun exportPortfolioSimulationSummary(
            userId: String,
            runId: String
        ): String {
            return this@LumiAgentBackendService.exportPortfolioSimulationSummary(userId, runId)
        }

        override fun selectPortfolioOptimizationSchedule(
            userId: String,
            resultId: String,
            candidateId: String,
            operatorId: String?,
            operatorName: String?
        ): PortfolioOptimizationDecisionRecord {
            return this@LumiAgentBackendService.selectPortfolioOptimizationSchedule(
                userId = userId,
                resultId = resultId,
                candidateId = candidateId,
                operatorId = operatorId,
                operatorName = operatorName
            )
        }

        override fun exportPortfolioOptimizationSummary(
            userId: String,
            resultId: String
        ): String {
            return this@LumiAgentBackendService.exportPortfolioOptimizationSummary(userId, resultId)
        }

        override fun recordPortfolioOptimizationOutcome(
            userId: String,
            decisionId: String,
            observations: PortfolioOutcomeObservationSet
        ): PortfolioScheduleOutcomeRecord {
            return this@LumiAgentBackendService.recordPortfolioOptimizationOutcome(
                userId = userId,
                decisionId = decisionId,
                observations = observations
            )
        }

        override fun applyPortfolioOptimizationTuning(
            userId: String,
            suggestionId: String,
            operatorId: String?,
            operatorName: String?
        ): PortfolioOptimizationTuningDecisionRecord {
            return this@LumiAgentBackendService.applyPortfolioOptimizationTuning(
                userId = userId,
                suggestionId = suggestionId,
                operatorId = operatorId,
                operatorName = operatorName
            )
        }

        override fun denyPortfolioOptimizationTuning(
            userId: String,
            suggestionId: String,
            operatorId: String?,
            operatorName: String?,
            reason: String
        ): PortfolioOptimizationTuningDecisionRecord {
            return this@LumiAgentBackendService.denyPortfolioOptimizationTuning(
                userId = userId,
                suggestionId = suggestionId,
                operatorId = operatorId,
                operatorName = operatorName,
                reason = reason
            )
        }

        override fun recordPortfolioOptimizationCorrectiveAction(
            userId: String,
            portfolioId: String,
            actionType: PortfolioOptimizationCorrectiveActionType,
            targetProgramId: String?,
            targetTrustTier: PortfolioOptimizationDestinationTrustTier?,
            targetJurisdiction: PortfolioOptimizationJurisdiction?,
            operatorId: String?,
            operatorName: String?,
            note: String
        ): PortfolioOptimizationCrossBoundaryCorrectiveActionRecord {
            return this@LumiAgentBackendService.recordPortfolioOptimizationCorrectiveAction(
                userId = userId,
                portfolioId = portfolioId,
                actionType = actionType,
                targetProgramId = targetProgramId,
                targetTrustTier = targetTrustTier,
                targetJurisdiction = targetJurisdiction,
                operatorId = operatorId,
                operatorName = operatorName,
                note = note
            )
        }

        override fun propagatePortfolioOptimizationObjectiveProfile(
            userId: String,
            sourceObjectiveProfileSnapshotId: String,
            targetScope: PortfolioOptimizationLearningScope,
            operatorId: String?,
            operatorName: String?
        ): PortfolioOptimizationPropagationAttemptRecord {
            return this@LumiAgentBackendService.propagatePortfolioOptimizationObjectiveProfile(
                userId = userId,
                sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
                targetScope = targetScope,
                operatorId = operatorId,
                operatorName = operatorName
            )
        }

        override fun approvePortfolioOptimizationPropagation(
            userId: String,
            attemptId: String,
            approverId: String?,
            approverName: String?
        ): PortfolioOptimizationPropagationAdoptionRecord {
            return this@LumiAgentBackendService.approvePortfolioOptimizationPropagation(
                userId = userId,
                attemptId = attemptId,
                approverId = approverId,
                approverName = approverName
            )
        }

        override fun rejectPortfolioOptimizationPropagation(
            userId: String,
            attemptId: String,
            approverId: String?,
            approverName: String?,
            reason: String
        ): PortfolioOptimizationPropagationApprovalRecord {
            return this@LumiAgentBackendService.rejectPortfolioOptimizationPropagation(
                userId = userId,
                attemptId = attemptId,
                approverId = approverId,
                approverName = approverName,
                reason = reason
            )
        }

        override fun recordPortfolioOptimizationConsent(
            userId: String,
            consent: PortfolioOptimizationConsentRecord
        ): PortfolioOptimizationConsentRecord {
            return this@LumiAgentBackendService.recordPortfolioOptimizationConsent(
                userId = userId,
                consent = consent
            )
        }

        override fun revokePortfolioOptimizationConsent(
            userId: String,
            consentId: String,
            operatorId: String?,
            operatorName: String?,
            reason: String
        ): PortfolioOptimizationConsentRecord {
            return this@LumiAgentBackendService.revokePortfolioOptimizationConsent(
                userId = userId,
                consentId = consentId,
                operatorId = operatorId,
                operatorName = operatorName,
                reason = reason
            )
        }

        override fun dispatchPortfolioOptimizationRemoteLearningTransport(
            userId: String,
            envelopeId: String,
            purpose: PortfolioOptimizationConsentPurpose,
            operatorId: String?,
            operatorName: String?
        ): PortfolioOptimizationRemoteLearningTransportAttemptRecord {
            return this@LumiAgentBackendService.dispatchPortfolioOptimizationRemoteLearningTransport(
                userId = userId,
                envelopeId = envelopeId,
                purpose = purpose,
                operatorId = operatorId,
                operatorName = operatorName
            )
        }

        override fun requestPortfolioOptimizationComplianceAuditExport(
            userId: String,
            request: PortfolioOptimizationComplianceAuditExportRequest
        ): PortfolioOptimizationComplianceAuditExportResult {
            return this@LumiAgentBackendService.requestPortfolioOptimizationComplianceAuditExport(
                userId = userId,
                request = request
            )
        }

        override fun exportPortfolioOptimizationLearningSyncEnvelope(
            userId: String,
            objectiveProfileSnapshotId: String,
            calibrationSnapshotId: String,
            mode: PortfolioOptimizationLearningSyncMode,
            operatorId: String?,
            operatorName: String?
        ): PortfolioOptimizationLearningSyncEnvelope {
            return this@LumiAgentBackendService.exportPortfolioOptimizationLearningSyncEnvelope(
                userId = userId,
                objectiveProfileSnapshotId = objectiveProfileSnapshotId,
                calibrationSnapshotId = calibrationSnapshotId,
                mode = mode,
                operatorId = operatorId,
                operatorName = operatorName
            )
        }

        override fun importPortfolioOptimizationLearningSyncEnvelope(
            userId: String,
            envelope: PortfolioOptimizationLearningSyncEnvelope,
            operatorId: String?,
            operatorName: String?
        ): PortfolioOptimizationLearningSyncAttemptRecord {
            return this@LumiAgentBackendService.importPortfolioOptimizationLearningSyncEnvelope(
                userId = userId,
                envelope = envelope,
                operatorId = operatorId,
                operatorName = operatorName
            )
        }

        override fun performGovernanceBulkAction(
            userId: String,
            request: GovernanceBulkActionRequest
        ): GovernanceBulkActionResult {
            return this@LumiAgentBackendService.performGovernanceBulkAction(userId, request)
        }

        override fun resumePendingRequests(userId: String): List<String> {
            return this@LumiAgentBackendService.resumePendingRequests(userId)
        }
    }

    private fun submitAgentRequest(request: AgentRequest): String {
        val requestId = UUID.randomUUID().toString()
        val traceId = UUID.randomUUID().toString()

        requestStore[requestId] = RequestState(
            response = AgentResponse(
                type = AgentResponseType.PLACEHOLDER,
                summary = "Request is being processed...",
                traceId = traceId,
                latencyMs = 0,
                confidence = 0.0,
                module = request.module ?: ModuleId.CHAT,
                status = ResponseStatus.PROCESSING
            ),
            createdAtMs = System.currentTimeMillis(),
            completed = false
        )

        val safeRequest = sessionCache.merge(request)
        val job = serviceScope.launch {
            requestStore.computeIfPresent(requestId) { _, state ->
                state.copy(
                    response = state.response.copy(
                        summary = "Task queued and running...",
                        status = ResponseStatus.RUNNING
                    )
                )
            }
            requestStore[requestId]?.response?.let { running -> notifyObservers(requestId, running) }

            executionLimiter.withPermit {
                val response = executeWithRetry(safeRequest)
                requestStore[requestId] = RequestState(
                    response = response,
                    createdAtMs = System.currentTimeMillis(),
                    completed = true
                )
                sessionCache.touch(safeRequest)
                notifyObservers(requestId, response)
                auditRepository.recordMetric(
                    name = "backend.request.latency_ms",
                    value = response.latencyMs.toDouble(),
                    dimension = "module:${response.module.name.lowercase()}",
                    traceId = response.traceId
                )
                auditRepository.recordChatSummary(
                    sessionId = request.sessionId,
                    role = "assistant",
                    summary = response.summary?.take(120) ?: "response_${response.type.name.lowercase()}",
                    traceId = response.traceId
                )
                if (BuildConfig.DIGITAL_TWIN_CLOUD_SYNC_ENABLED) {
                    val state = orchestrator.getDynamicState(safeRequest.userId)
                    val trajectory = orchestrator.getTrajectory(safeRequest.userId, days = 14)
                    val activeRole = response.activeRole
                        ?: safeRequest.constraints.activeRole
                        ?: safeRequest.activeRole
                        ?: UserRole.PERSONAL
                    val canSyncTwinToCloud = orchestrator.shouldSyncTwinToCloud(
                        userId = safeRequest.userId,
                        activeRole = activeRole
                    ) && !response.roleImpactReasonCodes.contains(RoleReasonCodes.ROLE_CLOUD_SYNC_BLOCKED)
                    if (state != null && canSyncTwinToCloud) {
                        serviceScope.launch {
                            twinCloudSyncCoordinator.syncNow(
                                userId = safeRequest.userId,
                                dynamicState = state,
                                trajectory = trajectory
                            )
                        }
                    }
                }
            }
        }
        requestJobs[requestId] = job
        return requestId
    }

    private suspend fun executeWithRetry(request: AgentRequest): AgentResponse {
        var lastFailure: Throwable? = null
        repeat(MAX_RETRY_ATTEMPTS) { index ->
            val response = try {
                orchestrator.handleRequest(
                    request = request,
                    cloudGateway = if (request.networkPolicy == NetworkPolicy.LOCAL_ONLY) {
                        null
                    } else {
                        cloudGateway
                    }
                )
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Throwable) {
                lastFailure = error
                null
            }
            if (response != null) {
                return response.ensureRenderable(request)
            }
            if (index < MAX_RETRY_ATTEMPTS - 1) {
                delay(220)
            }
        }
        return AgentResponse(
            type = AgentResponseType.ERROR,
            summary = "Execution failed before producing a verifiable result. ${lastFailure?.message ?: "Please retry."}",
            errorCode = "execution_failed_unverified",
            traceId = UUID.randomUUID().toString(),
            latencyMs = 0,
            confidence = 0.0,
            module = request.module ?: ModuleId.CHAT,
            status = ResponseStatus.ERROR
        )
    }

    private fun getRolePolicyEditorState(userId: String, role: UserRole): RolePolicyEditorState {
        return orchestrator.getRolePolicyEditorState(userId, role)
    }

    private fun updateRolePolicy(
        userId: String,
        role: UserRole,
        draft: RolePolicyDraft
    ): RolePolicyUpdateResult {
        return orchestrator.updateRolePolicy(userId, role, draft)
    }

    private fun resetRolePolicy(userId: String, role: UserRole): RolePolicyUpdateResult {
        return orchestrator.resetRolePolicy(userId, role)
    }

    private fun AgentResponse.ensureRenderable(
        request: AgentRequest
    ): AgentResponse {
        val resolvedModule = module
        val normalizedStatus = when (status) {
            ResponseStatus.PROCESSING,
            ResponseStatus.RUNNING -> ResponseStatus.WAITING_USER
            else -> status
        }
        val normalizedType = if (type == AgentResponseType.PLACEHOLDER) AgentResponseType.DRAFT else type
        val normalizedSummary = (summary?.takeIf { it.isNotBlank() } ?: when {
            normalizedStatus == ResponseStatus.WAITING_USER -> "Awaiting your confirmation to continue."
            normalizedStatus == ResponseStatus.QUOTING -> "Collecting and comparing external quotes."
            normalizedStatus == ResponseStatus.AUTH_REQUIRED -> "Authorization is required before continuing."
            normalizedStatus == ResponseStatus.VERIFYING -> "Verifying proof and delivery consistency."
            normalizedStatus == ResponseStatus.COMMITTED -> "Execution committed with verification."
            normalizedStatus == ResponseStatus.ROLLED_BACK -> "Execution rolled back according to policy."
            normalizedStatus == ResponseStatus.DISPUTED -> "Execution moved to dispute resolution."
            else -> "Execution completed with runnable next steps."
        }).normalizeUserEnglish()
        val normalized = copy(
            type = normalizedType,
            summary = normalizedSummary,
            module = resolvedModule,
            status = normalizedStatus
        )
        return normalized.enforceVerifiableOutcome(request)
    }

    private fun AgentResponse.enforceVerifiableOutcome(request: AgentRequest): AgentResponse {
        if (status != ResponseStatus.SUCCESS && status != ResponseStatus.PARTIAL && status != ResponseStatus.COMMITTED) return this

        val targetModule = module
        val summaryText = summary.orEmpty().trim()
        val hasMeaningfulSummary = summaryText.isMeaningfulResultText()
        val hasMeaningfulDraft = drafts.any { it.text.isMeaningfulResultText() }
        val hasMeaningfulCard = cards.any { it.summary.isMeaningfulResultText() || it.title.isMeaningfulResultText() }
        val hasAnySkillEvidence = skillInvocations.isNotEmpty()
        val chatPayload = payload as? ModulePayload.ChatPayload
        val hasEvidence = evidence.isNotEmpty() || chatPayload?.evidenceItems?.isNotEmpty() == true
        val hasTaskGraph = taskGraph?.tasks?.isNotEmpty() == true
        val hasGateAudit = gateDecisions.isNotEmpty()
        val hasActionableNext =
            nextAction.isNotBlank() && !nextAction.equals("review_and_continue", ignoreCase = true)

        val moduleVerifiable = when (targetModule) {
            ModuleId.CHAT ->
                hasMeaningfulSummary ||
                    hasMeaningfulDraft ||
                    hasMeaningfulCard ||
                    hasAnySkillEvidence ||
                    hasEvidence ||
                    hasTaskGraph ||
                    hasGateAudit ||
                    hasActionableNext
            ModuleId.LIX -> {
                val data = payload as? ModulePayload.LixPayload
                (data?.offerCount ?: 0) > 0 || !data?.intentId.isNullOrBlank() || hasMeaningfulSummary || actions.isNotEmpty()
            }
            ModuleId.AGENT_MARKET -> {
                val data = payload as? ModulePayload.MarketPayload
                (data?.candidateCount ?: 0) > 0 || (data?.selectedCount ?: 0) > 0 || hasAnySkillEvidence || actions.isNotEmpty()
            }
            ModuleId.DESTINY -> {
                val data = payload as? ModulePayload.DestinyPayload
                data?.nextSteps?.any { it.isMeaningfulResultText() } == true ||
                    data?.routeSteps?.any { it.isMeaningfulResultText() } == true ||
                    data?.evidenceItems?.any { it.snippet.isMeaningfulResultText() } == true ||
                    hasMeaningfulSummary
            }
            ModuleId.AVATAR -> {
                val data = payload as? ModulePayload.AvatarPayload
                data?.topTraits?.isNotEmpty() == true || hasMeaningfulSummary
            }
            ModuleId.SETTINGS,
            ModuleId.HOME -> hasMeaningfulSummary
        }

        if (moduleVerifiable) return this

        if (targetModule == ModuleId.CHAT && request.rawText.hasConstraintPackage()) {
            val fallbackSummary = if (hasMeaningfulSummary) {
                summaryText
            } else {
                "Constraints received and forwarded. Agent chain did not return a strong result signal yet."
            }
            return copy(
                type = AgentResponseType.DRAFT,
                status = ResponseStatus.PARTIAL,
                summary = fallbackSummary.normalizeUserEnglish(),
                errorCode = null
            )
        }

        val askPrompt = buildString {
            appendLine("Budget: [target budget range]")
            appendLine("Deadline: [target completion date]")
            appendLine("Acceptance criteria: [what must be true for this outcome to be accepted]")
            append("Task: ${request.rawText.take(180)}")
        }
        return copy(
            type = AgentResponseType.DRAFT,
            status = ResponseStatus.WAITING_USER,
            summary = "Need more constraints to deliver a verifiable solution. Please provide budget, timeline, and acceptance criteria.",
            errorCode = "verification_required",
            actions = listOf(
                AgentAction(
                    id = "provide_constraints",
                    label = "Add constraints",
                    type = AgentActionType.RUN_QUERY,
                    prompt = askPrompt
                )
            )
        )
    }

    private fun String?.isMeaningfulResultText(): Boolean {
        val normalized = this?.trim()?.lowercase().orEmpty()
        if (normalized.length < 8) return false
        if (nonAnswerMarkers.any { normalized.contains(it) }) return false
        return true
    }

    private fun String.hasConstraintPackage(): Boolean {
        if (isBlank()) return false
        val hasBudget = Regex("(?i)\\bbudget\\b|预算").containsMatchIn(this)
        val hasDeadline = Regex("(?i)\\bdeadline\\b|时限|期限").containsMatchIn(this)
        val hasAcceptance = Regex("(?i)acceptance\\s+criteria|acceptance|验收标准|验收").containsMatchIn(this)
        return hasBudget && hasDeadline && hasAcceptance
    }

    private fun String.normalizeUserEnglish(): String {
        if (isBlank()) return this
        var normalized = this
        userEnglishReplacements.forEach { (from, to) ->
            normalized = normalized.replace(from, to)
        }
        return normalized
    }

    private fun getAgentResult(requestId: String): AgentResponse {
        val state = requestStore[requestId]
        return if (state == null) {
            AgentResponse(
                type = AgentResponseType.ERROR,
                summary = "Request result not found",
                errorCode = "request_not_found",
                traceId = UUID.randomUUID().toString(),
                latencyMs = 0,
                confidence = 0.0,
                status = ResponseStatus.ERROR
            )
        } else {
            state.response
        }
    }

    private fun observeAgentResult(requestId: String, observer: AgentResultObserver) {
        val state = requestStore[requestId]
        if (state != null && state.completed) {
            observer.onResult(state.response)
            return
        }

        observerStore.compute(requestId) { _, existing ->
            val next = existing ?: CopyOnWriteArrayList()
            next.add(observer)
            next
        }

        state?.response?.let { placeholder ->
            observer.onResult(placeholder)
        }
    }

    private fun cancelRequest(requestId: String): Boolean {
        val job = requestJobs[requestId] ?: return false
        if (!job.isActive) return false

        job.cancel()
        val cancelled = AgentResponse(
            type = AgentResponseType.ERROR,
            summary = "Request canceled",
            errorCode = "request_cancelled",
            traceId = UUID.randomUUID().toString(),
            latencyMs = 0,
            confidence = 0.0,
            status = ResponseStatus.CANCELLED
        )
        requestStore[requestId] = RequestState(
            response = cancelled,
            createdAtMs = System.currentTimeMillis(),
            completed = true
        )
        notifyObservers(requestId, cancelled)
        return true
    }

    private fun notifyObservers(requestId: String, response: AgentResponse) {
        val observers = observerStore[requestId].orEmpty()
        observers.forEach { observer ->
            runCatching { observer.onResult(response) }
        }
        if (response.status.isTerminal()) {
            observerStore.remove(requestId)
        }
    }

    private fun recordInteraction(event: InteractionEvent) {
        orchestrator.recordInteraction(event)
        auditRepository.recordMetric(
            name = "interaction.${event.eventType.name.lowercase()}",
            value = 1.0,
            dimension = "source:ime_or_app",
            traceId = event.traceId ?: "local"
        )
    }

    private fun getDigitalSoulSummary(userId: String): DigitalSoulSummary {
        return orchestrator.getDigitalSoulSummary(userId)
    }

    private fun getDynamicState(userId: String): DynamicHumanStatePayload? {
        return orchestrator.getDynamicState(userId)
    }

    private fun getTrajectory(userId: String, days: Int): List<TrajectoryPointPayload> {
        return orchestrator.getTrajectory(userId, days)
    }

    private fun isConcreteActorValue(value: String?): Boolean {
        val normalized = value?.trim()?.lowercase().orEmpty()
        if (normalized.isBlank()) return false
        return normalized !in setOf(
            "demo_user",
            "demo-requester",
            "demo_operator",
            "demo-admin",
            "local-user",
            "pilot-operator-lead",
            "tenant-admin",
            "requester",
            "operator",
            "admin",
            "mock",
            "test",
            "simulator"
        )
    }

    private fun responseStatusGroup(status: ResponseStatus): RequesterInboxGroup {
        return when (status) {
            ResponseStatus.WAITING_USER,
            ResponseStatus.AUTH_REQUIRED -> RequesterInboxGroup.WAITING
            ResponseStatus.ERROR,
            ResponseStatus.CANCELLED,
            ResponseStatus.ROLLED_BACK,
            ResponseStatus.DISPUTED -> RequesterInboxGroup.BLOCKED
            ResponseStatus.SUCCESS,
            ResponseStatus.PARTIAL,
            ResponseStatus.COMMITTED -> RequesterInboxGroup.COMPLETED
            else -> RequesterInboxGroup.IN_PROGRESS
        }
    }

    private fun actorAvailability(
        role: ActorRole,
        workspaceMode: String,
        actorId: String?,
        actorLabel: String?,
        missingCode: String,
        missingSummary: String,
        demoLabel: String,
    ): ActorAvailabilityPayload {
        if (workspaceMode.equals("demo", ignoreCase = true)) {
            return ActorAvailabilityPayload(
                role = role,
                state = DependencyReadinessState.DEMO_ONLY,
                provisioningState = PilotProvisioningState.DEMO_ONLY,
                accessState = PilotAccessGrantState.DEMO_ONLY,
                actorId = "demo:${role.name.lowercase()}",
                actorLabel = demoLabel,
                summary = "$demoLabel is available for demo walkthroughs only.",
                isDemoData = true,
                isPilotEvidence = false
            )
        }
        return if (isConcreteActorValue(actorId) || isConcreteActorValue(actorLabel)) {
            ActorAvailabilityPayload(
                role = role,
                state = DependencyReadinessState.READY,
                provisioningState = PilotProvisioningState.PROVISIONED,
                accessState = PilotAccessGrantState.GRANTED,
                actorId = actorId?.takeIf(::isConcreteActorValue),
                actorLabel = actorLabel?.takeIf(::isConcreteActorValue),
                summary = "${role.name.lowercase().replace('_', ' ')} actor is configured.",
                isDemoData = false,
                isPilotEvidence = true
            )
        } else {
            ActorAvailabilityPayload(
                role = role,
                state = DependencyReadinessState.MISSING,
                provisioningState = PilotProvisioningState.UNPROVISIONED,
                accessState = PilotAccessGrantState.NOT_GRANTED,
                actorId = actorId,
                actorLabel = actorLabel,
                summary = missingSummary,
                missingDependencyCode = missingCode,
                isDemoData = false,
                isPilotEvidence = false
            )
        }
    }

    private fun buildEnvironmentActivation(workspaceMode: String): EnvironmentActivationPayload {
        val baseUrl = BuildConfig.LUMI_BASE_URL.takeIf { it.isNotBlank() }
        val simulatorBacking = baseUrl?.contains("lumi-agent-simulator", ignoreCase = true) == true
        val configuredKind = BuildConfig.LUMI_ENVIRONMENT_KIND.trim().uppercase()
        val environmentKind = when {
            configuredKind == "PILOT" -> EnvironmentKind.PILOT
            configuredKind == "PRODUCTION" -> EnvironmentKind.PRODUCTION
            configuredKind == "DEMO" -> EnvironmentKind.DEMO
            simulatorBacking -> EnvironmentKind.SIMULATOR
            workspaceMode.equals("demo", ignoreCase = true) -> EnvironmentKind.DEMO
            else -> EnvironmentKind.SIMULATOR
        }
        val workspaceBindingKind = when {
            workspaceMode.equals("demo", ignoreCase = true) -> WorkspaceBindingKind.DEMO_WORKSPACE
            BuildConfig.LUMI_TENANT_ID.isNotBlank() && BuildConfig.LUMI_WORKSPACE_ID.isNotBlank() -> WorkspaceBindingKind.TENANT_WORKSPACE
            else -> WorkspaceBindingKind.UNBOUND
        }
        val requesterActor = actorAvailability(
            role = ActorRole.REQUESTER,
            workspaceMode = workspaceMode,
            actorId = BuildConfig.LUMI_REQUESTER_ACTOR_ID,
            actorLabel = BuildConfig.LUMI_REQUESTER_ACTOR_LABEL,
            missingCode = "requester_actor_missing",
            missingSummary = "Missing requester actor",
            demoLabel = "Demo requester"
        )
        val operatorActor = actorAvailability(
            role = ActorRole.OPERATOR,
            workspaceMode = workspaceMode,
            actorId = BuildConfig.LUMI_OPERATOR_ACTOR_ID,
            actorLabel = BuildConfig.LUMI_OPERATOR_ACTOR_LABEL,
            missingCode = "operator_access_missing",
            missingSummary = "Missing operator access",
            demoLabel = "Demo operator"
        )
        val tenantAdminActor = actorAvailability(
            role = ActorRole.TENANT_ADMIN,
            workspaceMode = workspaceMode,
            actorId = BuildConfig.LUMI_TENANT_ADMIN_ACTOR_ID,
            actorLabel = BuildConfig.LUMI_TENANT_ADMIN_ACTOR_LABEL,
            missingCode = "tenant_admin_touchpoint_missing",
            missingSummary = "Missing tenant-admin touchpoint",
            demoLabel = "Demo tenant admin"
        )

        val identityReadiness = if (workspaceMode.equals("demo", ignoreCase = true)) {
            IdentityReadinessPayload(
                state = DependencyReadinessState.DEMO_ONLY,
                provider = "demo_identity",
                tenantId = "demo-tenant",
                workspaceId = "demo-workspace",
                summary = "Demo workspace uses seeded identity readiness.",
                isDemoData = true,
                isPilotEvidence = false
            )
        } else {
            val ready = BuildConfig.LUMI_TENANT_ID.isNotBlank() && BuildConfig.LUMI_WORKSPACE_ID.isNotBlank()
            IdentityReadinessPayload(
                state = if (ready) DependencyReadinessState.READY else DependencyReadinessState.MISSING,
                provider = if (ready) "configured_identity" else null,
                tenantId = BuildConfig.LUMI_TENANT_ID.ifBlank { null },
                workspaceId = BuildConfig.LUMI_WORKSPACE_ID.ifBlank { null },
                summary = if (ready) "Identity readiness configured." else "Identity not ready",
                issues = if (ready) emptyList() else listOf("identity_not_ready"),
                isDemoData = false,
                isPilotEvidence = ready
            )
        }

        val connectorReadiness = if (workspaceMode.equals("demo", ignoreCase = true)) {
            ConnectorReadinessPayload(
                state = DependencyReadinessState.DEMO_ONLY,
                connectorLabel = "Demo connector path",
                summary = "Demo workspace uses seeded connector readiness.",
                isDemoData = true,
                isPilotEvidence = false
            )
        } else {
            ConnectorReadinessPayload(
                state = DependencyReadinessState.MISSING,
                connectorLabel = "Approved pilot connector path",
                summary = "Connector not ready",
                issues = listOf("connector_not_ready"),
                isDemoData = false,
                isPilotEvidence = false
            )
        }

        val vaultReadiness = if (workspaceMode.equals("demo", ignoreCase = true)) {
            VaultReadinessPayload(
                state = DependencyReadinessState.DEMO_ONLY,
                backend = "demo_vault",
                summary = "Demo workspace uses seeded vault readiness.",
                isDemoData = true,
                isPilotEvidence = false
            )
        } else {
            VaultReadinessPayload(
                state = DependencyReadinessState.MISSING,
                summary = "Vault / credential path not ready",
                issues = listOf("vault_not_ready"),
                isDemoData = false,
                isPilotEvidence = false
            )
        }

        val missingCodes = mutableListOf<String>()
        val missingSummaries = mutableListOf<String>()
        if (!workspaceMode.equals("demo", ignoreCase = true)) {
            if (simulatorBacking || workspaceBindingKind != WorkspaceBindingKind.TENANT_WORKSPACE) {
                missingCodes += "pilot_environment_binding_missing"
                missingSummaries += "This is a simulator or unbound workspace, not a pilot workspace."
            }
            listOf(requesterActor, operatorActor, tenantAdminActor).forEach { actor ->
                actor.missingDependencyCode?.let { code ->
                    missingCodes += code
                    missingSummaries += actor.summary
                }
            }
            if (identityReadiness.state != DependencyReadinessState.READY) {
                missingCodes += "identity_not_ready"
                missingSummaries += "Identity not ready"
            }
            if (connectorReadiness.state != DependencyReadinessState.READY) {
                missingCodes += "connector_not_ready"
                missingSummaries += "Connector not ready"
            }
            if (vaultReadiness.state != DependencyReadinessState.READY) {
                missingCodes += "vault_not_ready"
                missingSummaries += "Vault / credential path not ready"
            }
        }

        val pilotStatus = when {
            workspaceMode.equals("demo", ignoreCase = true) -> PilotActivationStatus.DEMO_READY
            missingCodes.isNotEmpty() -> PilotActivationStatus.PILOT_BLOCKED
            environmentKind == EnvironmentKind.PRODUCTION -> PilotActivationStatus.PRODUCTION_READY
            environmentKind == EnvironmentKind.PILOT -> PilotActivationStatus.PILOT_READY
            else -> PilotActivationStatus.PILOT_BLOCKED
        }
        val environmentBinding = if (workspaceMode.equals("demo", ignoreCase = true)) {
            PilotEnvironmentBindingPayload(
                state = PilotEnvironmentBindingState.DEMO_ONLY,
                environmentKind = if (simulatorBacking) EnvironmentKind.SIMULATOR else EnvironmentKind.DEMO,
                environmentLabel = "Demo workspace",
                baseUrl = baseUrl,
                tenantId = "demo-tenant",
                workspaceId = "demo-workspace",
                summary = "Demo workspace is available for walkthroughs only.",
                source = "DEMO"
            )
        } else {
            PilotEnvironmentBindingPayload(
                state = if (!simulatorBacking && workspaceBindingKind == WorkspaceBindingKind.TENANT_WORKSPACE) {
                    PilotEnvironmentBindingState.BOUND
                } else {
                    PilotEnvironmentBindingState.BLOCKED
                },
                environmentKind = environmentKind,
                environmentLabel = BuildConfig.LUMI_ENVIRONMENT_LABEL.ifBlank {
                    when {
                        simulatorBacking -> "Simulator workspace"
                        environmentKind == EnvironmentKind.PILOT -> "Pilot workspace"
                        environmentKind == EnvironmentKind.PRODUCTION -> "Production workspace"
                        else -> "Environment"
                    }
                },
                baseUrl = baseUrl,
                tenantId = BuildConfig.LUMI_TENANT_ID.ifBlank { null },
                workspaceId = BuildConfig.LUMI_WORKSPACE_ID.ifBlank { null },
                summary = if (!simulatorBacking && workspaceBindingKind == WorkspaceBindingKind.TENANT_WORKSPACE) {
                    "Real environment binding is configured."
                } else {
                    "This environment is not bound as a real pilot environment."
                },
                source = if (simulatorBacking) "SIMULATOR" else "LOCAL_SYNTHETIC"
            )
        }
        val connectorActivation = if (workspaceMode.equals("demo", ignoreCase = true)) {
            PilotConnectorActivationPayload(
                state = PilotConnectorActivationState.DEMO_ONLY,
                connectorId = "demo_connector",
                summary = "Demo connector activation is available for walkthroughs only.",
                source = "DEMO"
            )
        } else {
            PilotConnectorActivationPayload(
                state = if (connectorReadiness.state == DependencyReadinessState.READY) {
                    PilotConnectorActivationState.INELIGIBLE
                } else {
                    PilotConnectorActivationState.BLOCKED
                },
                connectorId = "pilot_https_webhook",
                summary = if (connectorReadiness.state == DependencyReadinessState.READY) {
                    "Connector path exists but activation has not been granted."
                } else {
                    "Connector activation is blocked until connector readiness is resolved."
                },
                source = "LOCAL_SYNTHETIC"
            )
        }
        val activationReady = !workspaceMode.equals("demo", ignoreCase = true)
            && environmentBinding.state == PilotEnvironmentBindingState.BOUND
            && listOf(requesterActor, operatorActor, tenantAdminActor).all {
                it.state == DependencyReadinessState.READY &&
                    it.provisioningState == PilotProvisioningState.PROVISIONED &&
                    it.accessState == PilotAccessGrantState.GRANTED
            }
            && identityReadiness.state == DependencyReadinessState.READY
            && connectorReadiness.state == DependencyReadinessState.READY
            && vaultReadiness.state == DependencyReadinessState.READY
            && connectorActivation.state == PilotConnectorActivationState.ELIGIBLE

        val workspaceOptions = listOf(
            WorkspaceModeOptionPayload(
                mode = "current",
                label = "Current workspace",
                selected = workspaceMode.equals("current", ignoreCase = true),
                workspaceBindingKind = if (BuildConfig.LUMI_TENANT_ID.isNotBlank() && BuildConfig.LUMI_WORKSPACE_ID.isNotBlank()) {
                    WorkspaceBindingKind.TENANT_WORKSPACE
                } else {
                    WorkspaceBindingKind.UNBOUND
                },
                environmentKind = if (simulatorBacking) EnvironmentKind.SIMULATOR else environmentKind,
                description = if (simulatorBacking) {
                    "Uses the simulator-backed environment binding."
                } else {
                    "Uses the current environment binding."
                }
            ),
            WorkspaceModeOptionPayload(
                mode = "demo",
                label = "Demo workspace",
                selected = workspaceMode.equals("demo", ignoreCase = true),
                workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                environmentKind = if (simulatorBacking) EnvironmentKind.SIMULATOR else EnvironmentKind.DEMO,
                description = "Uses seeded demo data that is always labeled non-pilot."
            ),
            WorkspaceModeOptionPayload(
                mode = "local_lab",
                label = "Local role lab",
                selected = workspaceMode.equals("local_lab", ignoreCase = true),
                workspaceBindingKind = WorkspaceBindingKind.LOCAL_ROLE_LAB_WORKSPACE,
                environmentKind = if (simulatorBacking) EnvironmentKind.SIMULATOR else environmentKind,
                description = "Lets one human rehearse requester/operator/tenant-admin collaboration locally."
            )
        )

        val label = when {
            workspaceMode.equals("demo", ignoreCase = true) && simulatorBacking -> "Demo workspace (simulator-backed)"
            workspaceMode.equals("demo", ignoreCase = true) -> "Demo workspace"
            BuildConfig.LUMI_ENVIRONMENT_LABEL.isNotBlank() -> BuildConfig.LUMI_ENVIRONMENT_LABEL
            simulatorBacking -> "Simulator workspace"
            environmentKind == EnvironmentKind.PILOT -> "Pilot workspace"
            environmentKind == EnvironmentKind.PRODUCTION -> "Production workspace"
            else -> "Environment"
        }

        return EnvironmentActivationPayload(
            environmentKind = environmentKind,
            environmentLabel = label,
            workspaceBindingKind = workspaceBindingKind,
            workspaceMode = workspaceMode,
            tenantId = if (workspaceMode.equals("demo", ignoreCase = true)) "demo-tenant" else BuildConfig.LUMI_TENANT_ID.ifBlank { null },
            workspaceId = if (workspaceMode.equals("demo", ignoreCase = true)) "demo-workspace" else BuildConfig.LUMI_WORKSPACE_ID.ifBlank { null },
            pilotActivationStatus = pilotStatus,
            simulatorBacking = simulatorBacking,
            demoModeEnabled = BuildConfig.LUMI_DEMO_MODE_ENABLED,
            baseUrl = baseUrl,
            baseUrlSource = if (simulatorBacking) "build_config_simulator_default" else "build_config",
            workspaceOptions = workspaceOptions,
            missingDependencyCodes = missingCodes.distinct(),
            missingDependencySummaries = missingSummaries.distinct(),
            environmentBinding = environmentBinding,
            actorAvailability = listOf(requesterActor, operatorActor, tenantAdminActor),
            identityReadiness = identityReadiness,
            connectorReadiness = connectorReadiness,
            vaultReadiness = vaultReadiness,
            connectorActivation = connectorActivation,
            activationReady = activationReady,
            activationReadySummary = if (activationReady) {
                "Pilot activation is ready to progress."
            } else {
                "Pilot activation is blocked by environment binding, actor provisioning/access, identity, connector, or vault readiness."
            },
            isDemoData = workspaceMode.equals("demo", ignoreCase = true),
            isPilotEvidence = !workspaceMode.equals("demo", ignoreCase = true) && missingCodes.isEmpty()
        )
    }

    private fun buildRequesterInboxItems(workspaceMode: String): List<RequesterInboxItemPayload> {
        val environmentActivation = buildEnvironmentActivation(workspaceMode)
        if (workspaceMode.equals("demo", ignoreCase = true)) {
            val nowMs = System.currentTimeMillis()
            return listOf(
                RequesterInboxItemPayload(
                    taskId = "demo_task_pre_meeting_prep",
                    traceId = "demo_trace_pre_meeting_prep",
                    title = "Prepare advisor pre-meeting brief",
                    status = ResponseStatus.PROCESSING,
                    group = RequesterInboxGroup.IN_PROGRESS,
                    summary = "Collecting account context, previous notes, and agenda inputs.",
                    receiptSummary = "2/4 demo steps complete",
                    updatedAtMs = nowMs - 15 * 60 * 1000,
                    workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                    environmentKind = EnvironmentKind.DEMO,
                    isDemoData = true,
                    isPilotEvidence = false
                ),
                RequesterInboxItemPayload(
                    taskId = "demo_task_crm_ready_draft",
                    traceId = "demo_trace_crm_ready_draft",
                    title = "Convert notes into CRM-ready draft",
                    status = ResponseStatus.COMMITTED,
                    group = RequesterInboxGroup.COMPLETED,
                    summary = "CRM-ready draft completed with evidence-backed next actions.",
                    receiptSummary = "CRM-ready draft verified (demo)",
                    updatedAtMs = nowMs - 45 * 60 * 1000,
                    workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                    environmentKind = EnvironmentKind.DEMO,
                    isDemoData = true,
                    isPilotEvidence = false
                ),
                RequesterInboxItemPayload(
                    taskId = "demo_task_compliance_handoff",
                    traceId = "demo_trace_compliance_handoff",
                    title = "Prepare compliance handoff package",
                    status = ResponseStatus.WAITING_USER,
                    group = RequesterInboxGroup.WAITING,
                    summary = "Compliance handoff package assembled.",
                    blockerSummary = "Demo scenario blocks handoff until activation requirements are acknowledged.",
                    receiptSummary = "Approval gate waiting (demo)",
                    updatedAtMs = nowMs - 5 * 60 * 1000,
                    workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                    environmentKind = EnvironmentKind.DEMO,
                    isDemoData = true,
                    isPilotEvidence = false
                )
            )
        }

        return requestStore.values
            .asSequence()
            .map { state ->
                RequesterInboxItemPayload(
                    taskId = state.response.traceId,
                    traceId = state.response.traceId,
                    title = state.response.executionReceipt?.intentSummary
                        ?.takeIf { it.isNotBlank() }
                        ?: state.response.summary
                        ?.takeIf { it.isNotBlank() }
                        ?: "Agent OS task",
                    status = state.response.status,
                    group = responseStatusGroup(state.response.status),
                    summary = state.response.summary?.takeIf { it.isNotBlank() }
                        ?: state.response.executionReceipt?.events?.lastOrNull()?.title
                        ?: "Execution running",
                    blockerSummary = state.response.nextAction
                        .takeIf { it.isNotBlank() && responseStatusGroup(state.response.status) != RequesterInboxGroup.COMPLETED }
                        ?: state.response.errorCode?.takeIf { it.isNotBlank() },
                    receiptSummary = state.response.executionReceipt?.events?.lastOrNull()?.title
                        ?.takeIf { it.isNotBlank() }
                        ?: state.response.executionReceipt?.intentSummary,
                    updatedAtMs = state.createdAtMs,
                    workspaceBindingKind = environmentActivation.workspaceBindingKind,
                    environmentKind = environmentActivation.environmentKind,
                    isDemoData = false,
                    isPilotEvidence = false
                )
            }
            .filter { it.traceId?.isNotBlank() == true }
            .sortedByDescending { it.updatedAtMs }
            .take(8)
            .toList()
    }

    private fun buildPolicyStudioSummary(workspaceMode: String): PolicyStudioSummaryPayload {
        return PolicyStudioSummaryPayload(
            packName = "Agent OS Policy Pack",
            packVersion = "runtime-v1",
            packFingerprint = "android-host-local",
            overrideCount = 0,
            summary = if (workspaceMode.equals("demo", ignoreCase = true)) {
                "Policy Studio v1 is available for demo walkthroughs and remains clearly non-pilot."
            } else {
                "Policy Studio v1 exposes the current role policy editor with rollout and approval context."
            },
            rolloutSummary = "Existing rollout and simulation capabilities remain authoritative and read-only in this shell.",
            simulationSummary = "Simulation summaries stay visible without introducing a new BPM or DSL.",
            approvalGovernanceSummary = "Approval governance remains enforced by the current runtime, receipts, and operator surfaces.",
            detailLines = listOf(
                "Policy pack: Agent OS runtime policy",
                "Overrides: use the guided role policy editor",
                "Rollout/simulation: summary only in this shell",
                "Approval governance: enforced by existing runtime receipts"
            ),
            isDemoData = workspaceMode.equals("demo", ignoreCase = true),
            isPilotEvidence = !workspaceMode.equals("demo", ignoreCase = true)
        )
    }

    private fun buildLocalRoleLabSummaryPayload(selectedActorId: String = "local_tenant_admin_01"): LocalRoleLabSummaryPayload {
        val actors = listOf(
            LocalRoleLabActorPayload(
                actorId = "local_requester_01",
                role = com.lumi.coredomain.contract.ActorRole.REQUESTER,
                actorLabel = "Local Requester",
                sessionId = "lab_sess_requester_01",
                summary = "Requester rehearsal view",
                isActive = selectedActorId == "local_requester_01"
            ),
            LocalRoleLabActorPayload(
                actorId = "local_operator_01",
                role = com.lumi.coredomain.contract.ActorRole.OPERATOR,
                actorLabel = "Local Operator",
                sessionId = "lab_sess_operator_01",
                summary = "Operator rehearsal view",
                isActive = selectedActorId == "local_operator_01"
            ),
            LocalRoleLabActorPayload(
                actorId = "local_tenant_admin_01",
                role = com.lumi.coredomain.contract.ActorRole.TENANT_ADMIN,
                actorLabel = "Local Tenant Admin",
                sessionId = "lab_sess_tenant_admin_01",
                summary = "Tenant-admin rehearsal view",
                isActive = selectedActorId != "local_requester_01" && selectedActorId != "local_operator_01"
            )
        )
        val activeActor = actors.firstOrNull { it.isActive } ?: actors.last()
        val handoffTimeline = listOf(
            com.lumi.coredomain.contract.LocalRoleLabHandoffStepPayload(
                stepId = "requester_to_operator",
                fromRole = com.lumi.coredomain.contract.ActorRole.REQUESTER,
                toRole = com.lumi.coredomain.contract.ActorRole.OPERATOR,
                title = "Requester submits brief",
                summary = "Requester creates the initial advisor brief and hands context to the operator seat.",
                status = if (activeActor.role == com.lumi.coredomain.contract.ActorRole.REQUESTER)
                    com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.ACTIVE
                else
                    com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.COMPLETED
            ),
            com.lumi.coredomain.contract.LocalRoleLabHandoffStepPayload(
                stepId = "operator_to_tenant_admin",
                fromRole = com.lumi.coredomain.contract.ActorRole.OPERATOR,
                toRole = com.lumi.coredomain.contract.ActorRole.TENANT_ADMIN,
                title = "Operator validates handoff package",
                summary = "Operator checks evidence completeness and prepares the admin-facing handoff packet.",
                status = when (activeActor.role) {
                    com.lumi.coredomain.contract.ActorRole.OPERATOR -> com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.ACTIVE
                    com.lumi.coredomain.contract.ActorRole.TENANT_ADMIN -> com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.COMPLETED
                    else -> com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.PENDING
                }
            ),
            com.lumi.coredomain.contract.LocalRoleLabHandoffStepPayload(
                stepId = "tenant_admin_ack",
                fromRole = com.lumi.coredomain.contract.ActorRole.TENANT_ADMIN,
                title = "Tenant admin reviews activation gap",
                summary = "Tenant admin confirms the rehearsal boundary and sees what is still missing for a real pilot.",
                status = if (activeActor.role == com.lumi.coredomain.contract.ActorRole.TENANT_ADMIN)
                    com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.ACTIVE
                else
                    com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.PENDING
            )
        )
        return LocalRoleLabSummaryPayload(
            enabled = true,
            label = "Local role lab",
            summary = "One human can rehearse requester, operator, and tenant-admin collaboration locally.",
            activeActorId = activeActor.actorId,
            activeRole = activeActor.role,
            dayZeroBlockedSummary = "True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.",
            scenario = com.lumi.coredomain.contract.LocalRoleLabScenarioPayload(
                scenarioId = "advisor_handoff_rehearsal",
                title = "Advisor workflow rehearsal",
                summary = "Walk one advisor workflow through requester submission, operator validation, and tenant-admin acknowledgement.",
                currentStage = handoffTimeline.firstOrNull { it.status == com.lumi.coredomain.contract.LocalRoleLabHandoffStatus.ACTIVE }?.title
                    ?: "Requester submits brief",
                focusPoints = listOf(
                    "Keep active role visible at all times",
                    "Show blocked versus waiting transitions clearly",
                    "Make the non-pilot evidence boundary obvious"
                )
            ),
            handoffTimeline = handoffTimeline,
            evidenceClassificationSummary = "All local role lab artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.",
            pilotActivationGapSummary = "A real pilot still needs a real environment binding, real operator access, a named requester, a tenant-admin/support touchpoint, and the first real task/session/run artifact.",
            actors = actors,
            isDemoData = false,
            isPilotEvidence = false
        )
    }

    private fun buildTenantAdminActivationSummary(workspaceMode: String): TenantAdminActivationSummaryPayload {
        val environmentActivation = buildEnvironmentActivation(workspaceMode)
        return TenantAdminActivationSummaryPayload(
            status = if (workspaceMode.equals("demo", ignoreCase = true)) {
                DependencyReadinessState.DEMO_ONLY
            } else if (environmentActivation.missingDependencyCodes.isEmpty()) {
                DependencyReadinessState.READY
            } else {
                DependencyReadinessState.BLOCKED
            },
            title = if (workspaceMode.equals("demo", ignoreCase = true)) {
                "Tenant Admin Setup / Activation (Demo)"
            } else {
                "Tenant Admin Setup / Activation"
            },
            summary = if (workspaceMode.equals("demo", ignoreCase = true)) {
                "Demo workspace is ready for enterprise walkthroughs and clearly labeled non-pilot."
            } else if (environmentActivation.missingDependencyCodes.isEmpty()) {
                "Environment is ready for pilot activation."
            } else {
                "Environment is not ready for pilot activation."
            },
            detailLines = buildList {
                add("Environment: ${environmentActivation.environmentLabel}")
                add("Activation: ${environmentActivation.pilotActivationStatus.name.lowercase().replace('_', ' ')}")
                addAll(environmentActivation.missingDependencySummaries)
            }.distinct(),
            missingDependencyCodes = environmentActivation.missingDependencyCodes,
            actorAvailability = environmentActivation.actorAvailability,
            identityReadiness = environmentActivation.identityReadiness,
            connectorReadiness = environmentActivation.connectorReadiness,
            vaultReadiness = environmentActivation.vaultReadiness,
            isDemoData = workspaceMode.equals("demo", ignoreCase = true),
            isPilotEvidence = environmentActivation.isPilotEvidence
        )
    }

    private fun buildActivationChecklist(environmentActivation: EnvironmentActivationPayload): List<PilotActivationChecklistItemPayload> {
        return listOf(
            PilotActivationChecklistItemPayload(
                itemId = "environment_binding",
                code = "pilot_environment_binding",
                title = "Pilot environment binding",
                ownerType = PilotActivationOwnerType.PILOT_COMMANDER,
                ownerLabel = "Pilot commander",
                state = if (environmentActivation.environmentBinding?.state == PilotEnvironmentBindingState.BOUND) {
                    DependencyReadinessState.READY
                } else {
                    DependencyReadinessState.BLOCKED
                },
                requirementStatus = if (environmentActivation.environmentBinding?.state == PilotEnvironmentBindingState.BOUND) {
                    PilotActivationRequirementStatus.PROMOTED
                } else {
                    PilotActivationRequirementStatus.BLOCKED
                },
                packageId = "android_host_activation_package",
                missingArtifact = "Real pilot environment binding and base URL",
                nextAction = "Provide a real pilot environment binding and base URL."
            ),
            PilotActivationChecklistItemPayload(
                itemId = "requester_actor",
                code = "requester_actor",
                title = "Requester actor ready",
                ownerType = PilotActivationOwnerType.REQUESTER_OWNER,
                ownerLabel = "Requester owner",
                state = environmentActivation.actorAvailability.firstOrNull { it.role == ActorRole.REQUESTER }?.state
                    ?: DependencyReadinessState.MISSING,
                requirementStatus = if (environmentActivation.actorAvailability.firstOrNull { it.role == ActorRole.REQUESTER }?.state == DependencyReadinessState.READY) {
                    PilotActivationRequirementStatus.PROMOTED
                } else {
                    PilotActivationRequirementStatus.BLOCKED
                },
                packageId = "android_host_activation_package",
                missingArtifact = "Named requester actor",
                nextAction = "Provide a named requester actor and access artifact."
            ),
            PilotActivationChecklistItemPayload(
                itemId = "operator_actor",
                code = "operator_actor",
                title = "Operator access ready",
                ownerType = PilotActivationOwnerType.OPERATOR_OWNER,
                ownerLabel = "Pilot operator lead",
                state = environmentActivation.actorAvailability.firstOrNull { it.role == ActorRole.OPERATOR }?.state
                    ?: DependencyReadinessState.MISSING,
                requirementStatus = if (environmentActivation.actorAvailability.firstOrNull { it.role == ActorRole.OPERATOR }?.state == DependencyReadinessState.READY) {
                    PilotActivationRequirementStatus.PROMOTED
                } else {
                    PilotActivationRequirementStatus.BLOCKED
                },
                packageId = "android_host_activation_package",
                missingArtifact = "Supported operator access package",
                nextAction = "Provide a supported operator access package."
            ),
            PilotActivationChecklistItemPayload(
                itemId = "tenant_admin_actor",
                code = "tenant_admin_actor",
                title = "Tenant-admin touchpoint ready",
                ownerType = PilotActivationOwnerType.TENANT_ADMIN_OWNER,
                ownerLabel = "Tenant admin",
                state = environmentActivation.actorAvailability.firstOrNull { it.role == ActorRole.TENANT_ADMIN }?.state
                    ?: DependencyReadinessState.MISSING,
                requirementStatus = if (environmentActivation.actorAvailability.firstOrNull { it.role == ActorRole.TENANT_ADMIN }?.state == DependencyReadinessState.READY) {
                    PilotActivationRequirementStatus.PROMOTED
                } else {
                    PilotActivationRequirementStatus.BLOCKED
                },
                packageId = "android_host_activation_package",
                missingArtifact = "Tenant-admin/support touchpoint",
                nextAction = "Provide a tenant-admin/support touchpoint."
            ),
            PilotActivationChecklistItemPayload(
                itemId = "connector_readiness",
                code = "connector_readiness",
                title = "Connector readiness",
                ownerType = PilotActivationOwnerType.PILOT_COMMANDER,
                ownerLabel = "Pilot commander",
                state = environmentActivation.connectorReadiness?.state ?: DependencyReadinessState.MISSING,
                requirementStatus = if (environmentActivation.connectorActivation?.state == PilotConnectorActivationState.ELIGIBLE) {
                    PilotActivationRequirementStatus.PROMOTED
                } else {
                    PilotActivationRequirementStatus.BLOCKED
                },
                packageId = "android_host_activation_package",
                missingArtifact = "Configured connector path",
                nextAction = "Complete connector readiness and activation."
            )
        )
    }

    private fun buildActivationPackageSummary(
        environmentActivation: EnvironmentActivationPayload,
        checklist: List<PilotActivationChecklistItemPayload>
    ): PilotActivationPackageSummaryPayload {
        val recentIntakes = checklist
            .filter { it.requirementStatus != PilotActivationRequirementStatus.PROMOTED }
            .take(3)
            .map {
                PilotExternalArtifactIntakePayload(
                    intakeId = "android_host_${it.itemId}",
                    artifactKind = when (it.code) {
                        "pilot_environment_binding" -> PilotExternalArtifactKind.ENVIRONMENT_BINDING
                        "connector_readiness" -> PilotExternalArtifactKind.CONNECTOR_ELIGIBILITY
                        else -> PilotExternalArtifactKind.ACTOR_READINESS
                    },
                    source = "LOCAL_SYNTHETIC",
                    summary = it.missingArtifact,
                    verificationStatus = PilotExternalArtifactVerificationStatus.RECEIVED
                )
            }
        val status = when {
            environmentActivation.activationReady -> PilotActivationPackageStatus.ACTIVATION_READY
            recentIntakes.isNotEmpty() -> PilotActivationPackageStatus.IN_PROGRESS
            else -> PilotActivationPackageStatus.HANDOFF_REQUIRED
        }
        return PilotActivationPackageSummaryPayload(
            packageId = "android_host_activation_package",
            status = status,
            ownerType = PilotActivationOwnerType.PILOT_COMMANDER,
            ownerLabel = "Pilot commander",
            summary = if (environmentActivation.activationReady) {
                "Activation package is ready for real pilot evidence intake."
            } else {
                "Activation package is waiting on real external artifacts and cannot use simulator/demo/test evidence."
            },
            pendingRequirementCount = checklist.count { it.requirementStatus != PilotActivationRequirementStatus.PROMOTED },
            rejectedIntakeCount = 0,
            recentIntakes = recentIntakes
        )
    }

    private fun buildProductShellSummary(): ProductShellSummaryPayload {
        val environmentActivation = buildEnvironmentActivation("current")
        val checklist = buildActivationChecklist(environmentActivation)
        val activationPackage = buildActivationPackageSummary(environmentActivation, checklist)
        return ProductShellSummaryPayload(
            environmentActivation = environmentActivation,
            requesterInboxItems = buildRequesterInboxItems("current"),
            demoRequesterInboxItems = buildRequesterInboxItems("demo"),
            localRoleLab = buildLocalRoleLabSummaryPayload(),
            tenantAdminActivation = buildTenantAdminActivationSummary("current"),
            policyStudioSummary = buildPolicyStudioSummary("current"),
            activationPackage = activationPackage,
            activationChecklist = checklist,
            remainingBlockers = checklist
                .filter { it.state != DependencyReadinessState.READY }
                .take(4)
                .map {
                    PilotActivationBlockerSummaryPayload(
                        code = it.code,
                        ownerType = it.ownerType,
                        ownerLabel = it.ownerLabel,
                        summary = it.title,
                        missingArtifact = it.missingArtifact,
                        nextAction = it.nextAction
                    )
                },
            evidenceCategories = listOf(
                PilotEvidenceCategoryStatusPayload(
                    category = PilotEvidenceCategory.STABILITY_SAFETY_PROOF,
                    state = DependencyReadinessState.READY,
                    summary = "Host keeps stability/safety truth visible in-product.",
                    realEvidenceCount = 0
                ),
                PilotEvidenceCategoryStatusPayload(
                    category = PilotEvidenceCategory.DEVICE_SESSION_PROOF,
                    state = DependencyReadinessState.MISSING,
                    summary = "No real pilot device/session proof has been promoted in the host workspace.",
                    realEvidenceCount = 0
                )
            ),
            nextAction = if (environmentActivation.activationReady) {
                "Collect and promote verified real pilot evidence."
            } else {
                "Complete external activation package handoff and promote verified artifacts."
            }
        )
    }

    private fun updateStateConsensus(userId: String, patch: StateConsensusPayload): Boolean {
        val updated = orchestrator.updateStateConsensus(userId, patch)
        if (updated && orchestrator.shouldSyncTwinToCloud(userId)) {
            val state = orchestrator.getDynamicState(userId)
            val trajectory = orchestrator.getTrajectory(userId, days = 14)
            if (state != null) {
                serviceScope.launch {
                    twinCloudSyncCoordinator.syncNow(
                        userId = userId,
                        dynamicState = state,
                        trajectory = trajectory
                    )
                }
            }
        }
        return updated
    }

    private fun getModuleSnapshot(userId: String, module: ModuleId): AgentResponse {
        val response = orchestrator.getModuleSnapshot(userId, module)
        val shellSummary = buildProductShellSummary()
        return when (val payload = response.payload) {
            is ModulePayload.HomePayload -> response.copy(
                payload = payload.copy(
                    environmentActivation = shellSummary.environmentActivation,
                    workspaceOptions = shellSummary.environmentActivation?.workspaceOptions.orEmpty(),
                    requesterInboxPreview = shellSummary.requesterInboxItems.take(3),
                    productShellSummary = shellSummary
                )
            )
            is ModulePayload.ChatPayload -> response.copy(
                payload = payload.copy(
                    environmentActivation = shellSummary.environmentActivation,
                    requesterInboxItems = shellSummary.requesterInboxItems,
                    productShellSummary = shellSummary
                )
            )
            is ModulePayload.AvatarPayload -> response.copy(
                payload = payload.copy(
                    environmentActivation = shellSummary.environmentActivation,
                    policyStudioSummary = shellSummary.policyStudioSummary,
                    productShellSummary = shellSummary
                )
            )
            is ModulePayload.SettingsPayload -> response.copy(
                payload = payload.copy(
                    environmentActivation = shellSummary.environmentActivation,
                    tenantAdminActivationSummary = shellSummary.tenantAdminActivation,
                    productShellSummary = shellSummary
                )
            )
            else -> response
        }
    }

    private fun getRoutingDecision(requestId: String): RoutingDecisionPayload? {
        return requestStore[requestId]?.response?.routingDecision
    }

    private fun listSkillInvocations(requestId: String): List<SkillInvocationPayload> {
        return requestStore[requestId]?.response?.skillInvocations.orEmpty()
    }

    private fun getSkillGapReport(module: ModuleId): SkillGapPayload? {
        return requestStore.values
            .asSequence()
            .filter { it.completed && it.response.module == module }
            .maxByOrNull { it.createdAtMs }
            ?.response
            ?.skillGapReport
    }

    private fun getExecutionLedger(
        userId: String,
        filter: LedgerQueryFilter
    ): List<ExecutionReceiptRecord> {
        if (userId.isBlank()) return emptyList()
        return orchestrator.getExecutionLedger(userId, filter)
    }

    private fun getGovernanceSummary(
        userId: String,
        query: GovernanceQuery
    ): GovernanceSummary {
        if (userId.isBlank()) return GovernanceSummary(query = query)
        return orchestrator.getGovernanceSummary(userId, query)
    }

    private fun getGovernanceCases(
        userId: String,
        filter: GovernanceConsoleFilter
    ): List<GovernanceCaseRecord> {
        if (userId.isBlank()) return emptyList()
        return orchestrator.getGovernanceCases(userId, filter)
    }

    private fun getGovernanceConsoleState(
        userId: String,
        filter: GovernanceConsoleFilter
    ): GovernanceConsoleState {
        if (userId.isBlank()) return GovernanceConsoleState(filter = filter)
        return orchestrator.getGovernanceConsoleState(userId, filter)
    }

    private fun getPortfolioSimulationState(
        userId: String,
        query: PortfolioSimulationQuery
    ): PortfolioSimulationState {
        if (userId.isBlank()) return PortfolioSimulationState(query = query)
        return orchestrator.getPortfolioSimulationState(userId, query)
    }

    private fun getPortfolioOptimizationState(
        userId: String,
        query: PortfolioOptimizationQuery
    ): PortfolioOptimizationState {
        if (userId.isBlank()) return PortfolioOptimizationState(query = query)
        return orchestrator.getPortfolioOptimizationState(userId, query)
    }

    private fun savePortfolioScenario(
        userId: String,
        scenario: PortfolioScenarioDefinition
    ): PortfolioScenarioDefinition {
        if (userId.isBlank()) return scenario
        return orchestrator.savePortfolioScenario(userId, scenario)
    }

    private fun savePortfolioOptimizationRequest(
        userId: String,
        request: PortfolioOptimizationRequest
    ): PortfolioOptimizationRequest {
        if (userId.isBlank()) return request
        return orchestrator.savePortfolioOptimizationRequest(userId, request)
    }

    private fun runPortfolioScenario(
        userId: String,
        scenarioId: String
    ): PortfolioSimulationRunRecord {
        if (userId.isBlank()) {
            return PortfolioSimulationRunRecord(
                runId = "simulation_run_missing_user",
                scenarioId = scenarioId,
                status = com.lumi.coredomain.contract.PortfolioSimulationRunStatus.FAILED,
                summary = "Missing user identity for simulation run.",
                startedAtMs = System.currentTimeMillis(),
                completedAtMs = System.currentTimeMillis()
            )
        }
        return orchestrator.runPortfolioScenario(userId, scenarioId)
    }

    private fun runPortfolioOptimization(
        userId: String,
        requestId: String
    ): PortfolioOptimizationResult {
        if (userId.isBlank()) {
            return PortfolioOptimizationResult(
                requestId = requestId,
                status = PortfolioOptimizationResultStatus.FAILED,
                summary = "Missing user identity for portfolio optimization."
            )
        }
        return orchestrator.runPortfolioOptimization(userId, requestId)
    }

    private fun comparePortfolioSimulationRuns(
        userId: String,
        baselineRunId: String,
        candidateRunId: String
    ): PortfolioScenarioComparison {
        if (userId.isBlank()) {
            return PortfolioScenarioComparison(
                baselineRunId = baselineRunId,
                candidateRunId = candidateRunId,
                summary = "Simulation comparison unavailable: missing user identity."
            )
        }
        return orchestrator.comparePortfolioSimulationRuns(
            userId = userId,
            baselineRunId = baselineRunId,
            candidateRunId = candidateRunId
        ) ?: PortfolioScenarioComparison(
            baselineRunId = baselineRunId,
            candidateRunId = candidateRunId,
            summary = "Simulation comparison unavailable: runs were not found."
        )
    }

    private fun exportPortfolioSimulationSummary(
        userId: String,
        runId: String
    ): String {
        if (userId.isBlank()) return "Simulation export unavailable: missing user identity."
        return orchestrator.exportPortfolioSimulationSummary(userId, runId)
    }

    private fun selectPortfolioOptimizationSchedule(
        userId: String,
        resultId: String,
        candidateId: String,
        operatorId: String?,
        operatorName: String?
    ): PortfolioOptimizationDecisionRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationDecisionRecord(
                resultId = resultId,
                candidateId = candidateId,
                selectedByOperatorId = operatorId,
                selectedByOperatorName = operatorName,
                summary = "Portfolio optimization selection unavailable: missing user identity."
            )
        }
        return orchestrator.selectPortfolioOptimizationSchedule(
            userId = userId,
            resultId = resultId,
            candidateId = candidateId,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    private fun exportPortfolioOptimizationSummary(
        userId: String,
        resultId: String
    ): String {
        if (userId.isBlank()) return "Portfolio optimization export unavailable: missing user identity."
        return orchestrator.exportPortfolioOptimizationSummary(userId, resultId)
    }

    private fun recordPortfolioOptimizationOutcome(
        userId: String,
        decisionId: String,
        observations: PortfolioOutcomeObservationSet
    ): PortfolioScheduleOutcomeRecord {
        if (userId.isBlank()) {
            return PortfolioScheduleOutcomeRecord(
                decisionId = decisionId,
                observations = observations,
                summary = "Portfolio optimization outcome recording unavailable: missing user identity."
            )
        }
        return orchestrator.recordPortfolioOptimizationOutcome(
            userId = userId,
            decisionId = decisionId,
            observations = observations
        )
    }

    private fun applyPortfolioOptimizationTuning(
        userId: String,
        suggestionId: String,
        operatorId: String?,
        operatorName: String?
    ): PortfolioOptimizationTuningDecisionRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationTuningDecisionRecord(
                suggestionId = suggestionId,
                operatorId = operatorId,
                operatorName = operatorName,
                status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.BLOCKED,
                summary = "Portfolio optimization tuning unavailable: missing user identity."
            )
        }
        return orchestrator.applyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = suggestionId,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    private fun denyPortfolioOptimizationTuning(
        userId: String,
        suggestionId: String,
        operatorId: String?,
        operatorName: String?,
        reason: String
    ): PortfolioOptimizationTuningDecisionRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationTuningDecisionRecord(
                suggestionId = suggestionId,
                operatorId = operatorId,
                operatorName = operatorName,
                decisionReason = reason,
                status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.DENIED,
                summary = "Portfolio optimization tuning unavailable: missing user identity."
            )
        }
        return orchestrator.denyPortfolioOptimizationTuning(
            userId = userId,
            suggestionId = suggestionId,
            operatorId = operatorId,
            operatorName = operatorName,
            reason = reason
        )
    }

    private fun recordPortfolioOptimizationCorrectiveAction(
        userId: String,
        portfolioId: String,
        actionType: PortfolioOptimizationCorrectiveActionType,
        targetProgramId: String?,
        targetTrustTier: PortfolioOptimizationDestinationTrustTier?,
        targetJurisdiction: PortfolioOptimizationJurisdiction?,
        operatorId: String?,
        operatorName: String?,
        note: String
    ): PortfolioOptimizationCrossBoundaryCorrectiveActionRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationCrossBoundaryCorrectiveActionRecord(
                portfolioId = portfolioId,
                actionType = actionType,
                targetProgramId = targetProgramId,
                targetTrustTier = targetTrustTier,
                targetJurisdiction = targetJurisdiction,
                actorId = operatorId,
                actorName = operatorName,
                summary = "Portfolio corrective action recording unavailable: missing user identity."
            )
        }
        return orchestrator.recordPortfolioOptimizationCorrectiveAction(
            userId = userId,
            portfolioId = portfolioId,
            actionType = actionType,
            targetProgramId = targetProgramId,
            targetTrustTier = targetTrustTier,
            targetJurisdiction = targetJurisdiction,
            operatorId = operatorId,
            operatorName = operatorName,
            note = note
        )
    }

    private fun propagatePortfolioOptimizationObjectiveProfile(
        userId: String,
        sourceObjectiveProfileSnapshotId: String,
        targetScope: PortfolioOptimizationLearningScope,
        operatorId: String?,
        operatorName: String?
    ): PortfolioOptimizationPropagationAttemptRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationPropagationAttemptRecord(
                sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
                targetScope = targetScope,
                requestedByOperatorId = operatorId,
                requestedByOperatorName = operatorName,
                status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
                summary = "Portfolio objective propagation unavailable: missing user identity."
            )
        }
        return orchestrator.propagatePortfolioOptimizationObjectiveProfile(
            userId = userId,
            sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
            targetScope = targetScope,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    private fun approvePortfolioOptimizationPropagation(
        userId: String,
        attemptId: String,
        approverId: String?,
        approverName: String?
    ): PortfolioOptimizationPropagationAdoptionRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationPropagationAdoptionRecord(
                attemptId = attemptId,
                status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
                summary = "Portfolio objective propagation approval unavailable: missing user identity."
            )
        }
        return orchestrator.approvePortfolioOptimizationPropagation(
            userId = userId,
            attemptId = attemptId,
            approverId = approverId,
            approverName = approverName
        )
    }

    private fun rejectPortfolioOptimizationPropagation(
        userId: String,
        attemptId: String,
        approverId: String?,
        approverName: String?,
        reason: String
    ): PortfolioOptimizationPropagationApprovalRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationPropagationApprovalRecord(
                attemptId = attemptId,
                approved = false,
                approverId = approverId,
                approverName = approverName,
                reason = reason,
                summary = "Portfolio objective propagation rejection unavailable: missing user identity."
            )
        }
        return orchestrator.rejectPortfolioOptimizationPropagation(
            userId = userId,
            attemptId = attemptId,
            approverId = approverId,
            approverName = approverName,
            reason = reason
        )
    }

    private fun recordPortfolioOptimizationConsent(
        userId: String,
        consent: PortfolioOptimizationConsentRecord
    ): PortfolioOptimizationConsentRecord {
        if (userId.isBlank()) {
            return consent.copy(
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                reasonCodes = (consent.reasonCodes + RoleReasonCodes.ROLE_CONSENT_DENIED).distinct(),
                summary = "Portfolio learning consent unavailable: missing user identity."
            )
        }
        return orchestrator.recordPortfolioOptimizationConsent(userId, consent)
    }

    private fun revokePortfolioOptimizationConsent(
        userId: String,
        consentId: String,
        operatorId: String?,
        operatorName: String?,
        reason: String
    ): PortfolioOptimizationConsentRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationConsentRecord(
                consentId = consentId,
                decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                provenance = com.lumi.coredomain.contract.PortfolioOptimizationConsentProvenance(
                    grantedById = operatorId,
                    grantedByName = operatorName
                ),
                reasonCodes = listOf(RoleReasonCodes.ROLE_CONSENT_DENIED),
                summary = "Portfolio learning consent revoke unavailable: missing user identity."
            )
        }
        return orchestrator.revokePortfolioOptimizationConsent(
            userId = userId,
            consentId = consentId,
            operatorId = operatorId,
            operatorName = operatorName,
            reason = reason
        )
    }

    private fun dispatchPortfolioOptimizationRemoteLearningTransport(
        userId: String,
        envelopeId: String,
        purpose: PortfolioOptimizationConsentPurpose,
        operatorId: String?,
        operatorName: String?
    ): PortfolioOptimizationRemoteLearningTransportAttemptRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationRemoteLearningTransportAttemptRecord(
                remoteEnvelopeId = envelopeId,
                purpose = purpose,
                status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.BLOCKED,
                issues = listOf(
                    com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportIssue(
                        type = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningTransportIssueType.CONSENT_BLOCKED,
                        blocking = true,
                        reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_CONSENT),
                        summary = "Remote learning transport unavailable: missing user identity."
                    )
                ),
                reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_BLOCKED_BY_CONSENT),
                summary = "Remote learning transport unavailable: missing user identity."
            )
        }
        return orchestrator.dispatchPortfolioOptimizationRemoteLearningTransport(
            userId = userId,
            envelopeId = envelopeId,
            purpose = purpose,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    private fun requestPortfolioOptimizationComplianceAuditExport(
        userId: String,
        request: PortfolioOptimizationComplianceAuditExportRequest
    ): PortfolioOptimizationComplianceAuditExportResult {
        if (userId.isBlank()) {
            return PortfolioOptimizationComplianceAuditExportResult(
                requestId = request.requestId,
                status = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
                reasonCodes = listOf(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_CONSENT),
                summary = "Compliance audit export unavailable: missing user identity."
            )
        }
        return orchestrator.requestPortfolioOptimizationComplianceAuditExport(
            userId = userId,
            request = request
        )
    }

    private fun exportPortfolioOptimizationLearningSyncEnvelope(
        userId: String,
        objectiveProfileSnapshotId: String,
        calibrationSnapshotId: String,
        mode: PortfolioOptimizationLearningSyncMode,
        operatorId: String?,
        operatorName: String?
    ): PortfolioOptimizationLearningSyncEnvelope {
        if (userId.isBlank()) {
            return PortfolioOptimizationLearningSyncEnvelope(
                mode = mode,
                provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncProvenance(
                    sourceUserId = userId,
                    operatorId = operatorId,
                    operatorName = operatorName
                ),
                summary = "Portfolio learning sync export unavailable: missing user identity."
            )
        }
        return orchestrator.exportPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            objectiveProfileSnapshotId = objectiveProfileSnapshotId,
            calibrationSnapshotId = calibrationSnapshotId,
            mode = mode,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    private fun importPortfolioOptimizationLearningSyncEnvelope(
        userId: String,
        envelope: PortfolioOptimizationLearningSyncEnvelope,
        operatorId: String?,
        operatorName: String?
    ): PortfolioOptimizationLearningSyncAttemptRecord {
        if (userId.isBlank()) {
            return PortfolioOptimizationLearningSyncAttemptRecord(
                direction = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncDirection.IMPORT,
                envelopeId = envelope.envelopeId,
                mode = envelope.mode,
                status = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.BLOCKED,
                summary = "Portfolio learning sync import unavailable: missing user identity."
            )
        }
        return orchestrator.importPortfolioOptimizationLearningSyncEnvelope(
            userId = userId,
            envelope = envelope,
            operatorId = operatorId,
            operatorName = operatorName
        )
    }

    private fun markGovernanceCaseReviewed(
        userId: String,
        runId: String
    ): GovernanceActionResult {
        if (userId.isBlank() || runId.isBlank()) {
            return GovernanceActionResult(
                action = com.lumi.coredomain.contract.GovernanceActionType.MARK_REVIEWED,
                runId = runId,
                success = false,
                message = "Missing user or run identity for review action.",
                timestampMs = System.currentTimeMillis()
            )
        }
        return orchestrator.markGovernanceCaseReviewed(userId, runId)
    }

    private fun retryGovernanceSyncIntent(
        userId: String,
        runId: String
    ): GovernanceActionResult {
        if (userId.isBlank() || runId.isBlank()) {
            return GovernanceActionResult(
                action = com.lumi.coredomain.contract.GovernanceActionType.RETRY_SYNC_INTENT,
                runId = runId,
                success = false,
                message = "Missing user or run identity for retry action.",
                timestampMs = System.currentTimeMillis()
            )
        }
        return orchestrator.retryGovernanceSyncIntent(userId, runId)
    }

    private fun updateGovernanceCaseCollaboration(
        userId: String,
        runId: String,
        command: GovernanceCollaborationCommand
    ): GovernanceActionResult {
        if (userId.isBlank() || runId.isBlank()) {
            return GovernanceActionResult(
                action = command.commandType,
                runId = runId,
                success = false,
                message = "Missing user or run identity for collaboration action.",
                timestampMs = System.currentTimeMillis()
            )
        }
        return orchestrator.updateGovernanceCaseCollaboration(userId, runId, command)
    }

    private fun performGovernanceBulkAction(
        userId: String,
        request: GovernanceBulkActionRequest
    ): GovernanceBulkActionResult {
        if (userId.isBlank()) {
            return GovernanceBulkActionResult(
                action = request.action,
                requestedCount = request.runIds.size,
                failureCount = request.runIds.size,
                message = "Missing user identity for bulk action.",
                timestampMs = System.currentTimeMillis()
            )
        }
        return orchestrator.performGovernanceBulkAction(userId, request)
    }

    private fun resumePendingRequests(userId: String): List<String> {
        if (userId.isBlank()) return emptyList()
        return requestStore.entries
            .asSequence()
            .filter { (_, state) -> !state.completed }
            .map { (requestId, _) -> requestId }
            .toList()
    }

    private fun scheduleCleanupLoop() {
        serviceScope.launch {
            while (true) {
                delay(20_000)
                val cutoff = System.currentTimeMillis() - RESULT_TTL_MS
                requestStore.entries.removeIf { (_, state) ->
                    state.createdAtMs < cutoff && state.completed
                }
                requestJobs.entries.removeIf { (_, job) ->
                    !job.isActive
                }
                observerStore.entries.removeIf { (requestId, _) ->
                    requestStore[requestId]?.completed == true
                }
                sessionCache.cleanup()
            }
        }
    }

    private fun ensureForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Lumi Backend",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Lumi App internal backend core service"
            }
            manager.createNotificationChannel(channel)
        }

        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Lumi Backend Online")
            .setContentText("IME requests are processed by App internal backend")
            .setOngoing(true)
            .build()
    }

    private data class RequestState(
        val response: AgentResponse,
        val createdAtMs: Long,
        val completed: Boolean
    )

    private fun ResponseStatus.isTerminal(): Boolean {
        return this == ResponseStatus.SUCCESS ||
            this == ResponseStatus.COMMITTED ||
            this == ResponseStatus.PARTIAL ||
            this == ResponseStatus.WAITING_USER ||
            this == ResponseStatus.ROLLED_BACK ||
            this == ResponseStatus.DISPUTED ||
            this == ResponseStatus.ERROR ||
            this == ResponseStatus.CANCELLED
    }

    companion object {
        private const val CHANNEL_ID = "lumi_backend_host"
        private const val NOTIFICATION_ID = 4012
        private const val RESULT_TTL_MS = 5 * 60 * 1_000L
        private const val MAX_RETRY_ATTEMPTS = 2
        private val userEnglishReplacements = listOf(
            "已生成可执行解决方案：" to "Actionable solution generated:",
            "已生成可执行解决方案" to "Actionable solution generated",
            "已生成可执行旅行方案（先给可落地步骤，再持续补齐实时结果）：" to
                "Actionable travel plan generated (concrete steps first, then real-time refinement):",
            "- 核心问题：" to "- Core issue: ",
            "• 核心问题：" to "• Core issue: ",
            "- 推荐策略：" to "- Recommended strategy: ",
            "• 推荐策略：" to "• Recommended strategy: ",
            "- 下一步动作：" to "- Next action: ",
            "先澄清目标与约束，再按优先级执行任务并回填证据。" to
                "Clarify goals and constraints first, then execute by priority and backfill evidence.",
            "先完成 1 个最小可行步骤，再并行拉取补充证据。" to
                "Complete one minimal viable step first, then gather supplementary evidence in parallel.",
            "未找到答案" to "No relevant answer was found. Returning an executable local plan.",
            "暂无结果" to "No result is available yet. Returning an executable local plan.",
            "暂无可用结果" to "No result is available yet. Returning an executable local plan."
        )
        private val nonAnswerMarkers = listOf(
            "no relevant answer",
            "no answer found",
            "no result is available yet",
            "no result available yet",
            "no result available",
            "not found",
            "unavailable",
            "request is being processed",
            "task queued",
            "未找到相关答案",
            "没有相关答案",
            "未找到答案",
            "暂无结果",
            "暂无可用结果"
        )
    }
}
