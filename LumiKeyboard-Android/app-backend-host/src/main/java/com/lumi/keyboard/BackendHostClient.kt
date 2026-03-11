package com.lumi.keyboard

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.IBinder
import com.lumi.coredomain.contract.AgentMode
import com.lumi.coredomain.contract.AgentRequest
import com.lumi.coredomain.contract.AgentRequestConstraints
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.AgentResultObserver
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.GovernanceActionResult
import com.lumi.coredomain.contract.GovernanceBulkActionRequest
import com.lumi.coredomain.contract.GovernanceBulkActionResult
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.GovernanceCaseRecord
import com.lumi.coredomain.contract.GovernanceConsoleFilter
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.FieldHints
import com.lumi.coredomain.contract.GovernanceQuery
import com.lumi.coredomain.contract.GovernanceSummary
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.KeystrokeDynamicsPayload
import com.lumi.coredomain.contract.LedgerQueryFilter
import com.lumi.coredomain.contract.LumiBackendBridge
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.PortfolioScenarioComparison
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportRequest
import com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportResult
import com.lumi.coredomain.contract.PortfolioOptimizationConsentPurpose
import com.lumi.coredomain.contract.PortfolioOptimizationConsentRecord
import com.lumi.coredomain.contract.PortfolioOptimizationCrossBoundaryCorrectiveActionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationDecisionRecord
import com.lumi.coredomain.contract.PortfolioOptimizationLearningScope
import com.lumi.coredomain.contract.PortfolioOptimizationCorrectiveActionType
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
import com.lumi.coredomain.contract.PortfolioOptimizationState
import com.lumi.coredomain.contract.PortfolioScheduleOutcomeRecord
import com.lumi.coredomain.contract.PortfolioSimulationQuery
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.PortfolioSimulationState
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyEditorState
import com.lumi.coredomain.contract.RolePolicyUpdateResult
import com.lumi.coredomain.contract.RoutingDecisionPayload
import com.lumi.coredomain.contract.SkillGapPayload
import com.lumi.coredomain.contract.SkillInvocationPayload
import com.lumi.coredomain.contract.StateConsensusPayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

class BackendHostClient(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var bridge: LumiBackendBridge? = null
    private var bound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            bridge = service as? LumiBackendBridge
            bound = bridge != null
            runCatching { bridge?.resumePendingRequests("local-user") }
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            bridge = null
            bound = false
        }
    }

    fun connect() {
        if (bound) return
        val intent = backendIntent()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        bound = true
    }

    fun disconnect() {
        if (!bound) return
        runCatching { context.unbindService(serviceConnection) }
        bound = false
        bridge = null
    }

    fun submitPrompt(
        input: String,
        module: ModuleId = ModuleId.CHAT,
        sessionId: String = UUID.randomUUID().toString(),
        networkPolicy: NetworkPolicy = NetworkPolicy.LOCAL_FIRST,
        stateVector: DynamicHumanStatePayload? = null,
        keystroke: KeystrokeDynamicsPayload? = null,
        activeRole: UserRole? = null,
        onResult: (AgentResponse) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        AgentResponse(
                            type = AgentResponseType.ERROR,
                            summary = "Backend service not connected",
                            errorCode = "service_disconnected",
                            traceId = UUID.randomUUID().toString(),
                            latencyMs = 0,
                            confidence = 0.0,
                            module = module
                        )
                    )
                }
                return@launch
            }

            val roleSource = if (activeRole != null) RoleSource.EXPLICIT_USER_SELECTION else null
            val request = AgentRequest(
                sessionId = sessionId,
                userId = "local-user",
                sourceApp = context.packageName,
                mode = AgentMode.APP_CHAT,
                rawText = input,
                fieldHints = FieldHints(),
                timestampMs = System.currentTimeMillis(),
                locale = DEFAULT_RESPONSE_LOCALE,
                networkPolicy = networkPolicy,
                module = module,
                stateVector = stateVector,
                keystroke = keystroke,
                activeRole = activeRole,
                roleSource = roleSource,
                constraints = AgentRequestConstraints(
                    activeRole = activeRole,
                    roleSource = roleSource
                )
            )
            val requestId = api.submitAgentRequest(request)
            val completed = AtomicBoolean(false)
            val latestIntermediate = AtomicReference<AgentResponse?>(null)

            runCatching {
                api.observeAgentResult(requestId, AgentResultObserver { response ->
                    if (response.type == AgentResponseType.PLACEHOLDER) return@AgentResultObserver
                    if (response.status.isTerminal()) {
                        if (completed.compareAndSet(false, true)) {
                            scope.launch { onResult(response) }
                        }
                    } else {
                        latestIntermediate.set(response)
                    }
                })
            }

            while (isActive && !completed.get()) {
                val response = api.getAgentResult(requestId)
                if (response.type != AgentResponseType.PLACEHOLDER) {
                    if (response.status.isTerminal()) {
                        if (completed.compareAndSet(false, true)) {
                            scope.launch { onResult(response) }
                        }
                        return@launch
                    }
                    latestIntermediate.set(response)
                }
                delay(APP_POLL_INTERVAL_MS)
            }

            if (!completed.get()) {
                latestIntermediate.get()?.let { intermediate ->
                    if (completed.compareAndSet(false, true)) {
                        scope.launch { onResult(intermediate) }
                    }
                }
            }
        }
    }

    fun fetchDigitalSoulSummary(
        userId: String = "local-user",
        onResult: (DigitalSoulSummary?) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(null) }
                return@launch
            }
            val summary = runCatching { api.getDigitalSoulSummary(userId) }.getOrNull()
            scope.launch { onResult(summary) }
        }
    }

    fun fetchDynamicState(
        userId: String = "local-user",
        onResult: (DynamicHumanStatePayload?) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(null) }
                return@launch
            }
            val state = runCatching { api.getDynamicState(userId) }.getOrNull()
            scope.launch { onResult(state) }
        }
    }

    fun fetchTrajectory(
        userId: String = "local-user",
        days: Int = 14,
        onResult: (List<TrajectoryPointPayload>) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(emptyList()) }
                return@launch
            }
            val points = runCatching { api.getTrajectory(userId, days) }.getOrDefault(emptyList())
            scope.launch { onResult(points) }
        }
    }

    fun fetchExecutionLedger(
        userId: String = "local-user",
        filter: LedgerQueryFilter = LedgerQueryFilter(),
        onResult: (List<ExecutionReceiptRecord>) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(emptyList()) }
                return@launch
            }
            val records = runCatching { api.getExecutionLedger(userId, filter) }.getOrDefault(emptyList())
            scope.launch { onResult(records) }
        }
    }

    fun fetchGovernanceSummary(
        userId: String = "local-user",
        query: GovernanceQuery = GovernanceQuery(),
        onResult: (GovernanceSummary) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(GovernanceSummary(query = query)) }
                return@launch
            }
            val summary = runCatching { api.getGovernanceSummary(userId, query) }
                .getOrDefault(GovernanceSummary(query = query))
            scope.launch { onResult(summary) }
        }
    }

    fun fetchGovernanceCases(
        userId: String = "local-user",
        filter: GovernanceConsoleFilter = GovernanceConsoleFilter(),
        onResult: (List<GovernanceCaseRecord>) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(emptyList()) }
                return@launch
            }
            val cases = runCatching { api.getGovernanceCases(userId, filter) }.getOrDefault(emptyList())
            scope.launch { onResult(cases) }
        }
    }

    fun fetchGovernanceConsoleState(
        userId: String = "local-user",
        filter: GovernanceConsoleFilter = GovernanceConsoleFilter(),
        onResult: (GovernanceConsoleState) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(GovernanceConsoleState(filter = filter)) }
                return@launch
            }
            val state = runCatching { api.getGovernanceConsoleState(userId, filter) }
                .getOrDefault(GovernanceConsoleState(filter = filter))
            scope.launch { onResult(state) }
        }
    }

    fun fetchPortfolioSimulationState(
        userId: String = "local-user",
        query: PortfolioSimulationQuery = PortfolioSimulationQuery(),
        onResult: (PortfolioSimulationState) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(PortfolioSimulationState(query = query)) }
                return@launch
            }
            val state = runCatching { api.getPortfolioSimulationState(userId, query) }
                .getOrDefault(PortfolioSimulationState(query = query))
            scope.launch { onResult(state) }
        }
    }

    fun fetchPortfolioOptimizationState(
        userId: String = "local-user",
        query: PortfolioOptimizationQuery = PortfolioOptimizationQuery(),
        onResult: (PortfolioOptimizationState) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(PortfolioOptimizationState(query = query)) }
                return@launch
            }
            val state = runCatching { api.getPortfolioOptimizationState(userId, query) }
                .getOrDefault(PortfolioOptimizationState(query = query))
            scope.launch { onResult(state) }
        }
    }

    fun savePortfolioScenario(
        userId: String = "local-user",
        scenario: PortfolioScenarioDefinition,
        onResult: (PortfolioScenarioDefinition) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(scenario) }
                return@launch
            }
            val saved = runCatching { api.savePortfolioScenario(userId, scenario) }
                .getOrDefault(scenario)
            scope.launch { onResult(saved) }
        }
    }

    fun savePortfolioOptimizationRequest(
        userId: String = "local-user",
        request: PortfolioOptimizationRequest,
        onResult: (PortfolioOptimizationRequest) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(request) }
                return@launch
            }
            val saved = runCatching { api.savePortfolioOptimizationRequest(userId, request) }
                .getOrDefault(request)
            scope.launch { onResult(saved) }
        }
    }

    fun runPortfolioScenario(
        userId: String = "local-user",
        scenarioId: String,
        onResult: (PortfolioSimulationRunRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioSimulationRunRecord(
                            runId = "simulation_run_service_unavailable",
                            scenarioId = scenarioId,
                            status = com.lumi.coredomain.contract.PortfolioSimulationRunStatus.FAILED,
                            summary = "Backend service not connected.",
                            startedAtMs = System.currentTimeMillis(),
                            completedAtMs = System.currentTimeMillis()
                        )
                    )
                }
                return@launch
            }
            val run = runCatching { api.runPortfolioScenario(userId, scenarioId) }
                .getOrElse {
                    PortfolioSimulationRunRecord(
                        runId = "simulation_run_failed",
                        scenarioId = scenarioId,
                        status = com.lumi.coredomain.contract.PortfolioSimulationRunStatus.FAILED,
                        summary = "Failed to run portfolio simulation.",
                        startedAtMs = System.currentTimeMillis(),
                        completedAtMs = System.currentTimeMillis()
                    )
                }
            scope.launch { onResult(run) }
        }
    }

    fun comparePortfolioSimulationRuns(
        userId: String = "local-user",
        baselineRunId: String,
        candidateRunId: String,
        onResult: (PortfolioScenarioComparison?) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(null) }
                return@launch
            }
            val comparison = runCatching {
                api.comparePortfolioSimulationRuns(userId, baselineRunId, candidateRunId)
            }.getOrNull()
            scope.launch { onResult(comparison) }
        }
    }

    fun runPortfolioOptimization(
        userId: String = "local-user",
        requestId: String,
        onResult: (PortfolioOptimizationResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationResult(
                            requestId = requestId,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationResultStatus.FAILED,
                            summary = "Portfolio optimization unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val result = runCatching { api.runPortfolioOptimization(userId, requestId) }
                .getOrDefault(
                    PortfolioOptimizationResult(
                        requestId = requestId,
                        status = com.lumi.coredomain.contract.PortfolioOptimizationResultStatus.FAILED,
                        summary = "Portfolio optimization failed."
                    )
                )
            scope.launch { onResult(result) }
        }
    }

    fun selectPortfolioOptimizationSchedule(
        userId: String = "local-user",
        resultId: String,
        candidateId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        onResult: (PortfolioOptimizationDecisionRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationDecisionRecord(
                            resultId = resultId,
                            candidateId = candidateId,
                            selectedByOperatorId = operatorId,
                            selectedByOperatorName = operatorName,
                            summary = "Portfolio optimization selection unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val decision = runCatching {
                api.selectPortfolioOptimizationSchedule(
                    userId = userId,
                    resultId = resultId,
                    candidateId = candidateId,
                    operatorId = operatorId,
                    operatorName = operatorName
                )
            }.getOrDefault(
                PortfolioOptimizationDecisionRecord(
                    resultId = resultId,
                    candidateId = candidateId,
                    selectedByOperatorId = operatorId,
                    selectedByOperatorName = operatorName,
                    summary = "Portfolio optimization selection failed."
                )
            )
            scope.launch { onResult(decision) }
        }
    }

    fun recordPortfolioOptimizationOutcome(
        userId: String = "local-user",
        decisionId: String,
        observations: PortfolioOutcomeObservationSet = PortfolioOutcomeObservationSet(),
        onResult: (PortfolioScheduleOutcomeRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioScheduleOutcomeRecord(
                            decisionId = decisionId,
                            observations = observations,
                            summary = "Portfolio optimization outcome recording unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val outcome = runCatching {
                api.recordPortfolioOptimizationOutcome(userId, decisionId, observations)
            }.getOrDefault(
                PortfolioScheduleOutcomeRecord(
                    decisionId = decisionId,
                    observations = observations,
                    summary = "Portfolio optimization outcome recording failed."
                )
            )
            scope.launch { onResult(outcome) }
        }
    }

    fun applyPortfolioOptimizationTuning(
        userId: String = "local-user",
        suggestionId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        onResult: (PortfolioOptimizationTuningDecisionRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationTuningDecisionRecord(
                            suggestionId = suggestionId,
                            operatorId = operatorId,
                            operatorName = operatorName,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.BLOCKED,
                            summary = "Portfolio optimization tuning unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val decision = runCatching {
                api.applyPortfolioOptimizationTuning(
                    userId = userId,
                    suggestionId = suggestionId,
                    operatorId = operatorId,
                    operatorName = operatorName
                )
            }.getOrDefault(
                PortfolioOptimizationTuningDecisionRecord(
                    suggestionId = suggestionId,
                    operatorId = operatorId,
                    operatorName = operatorName,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.BLOCKED,
                    summary = "Portfolio optimization tuning apply failed."
                )
            )
            scope.launch { onResult(decision) }
        }
    }

    fun denyPortfolioOptimizationTuning(
        userId: String = "local-user",
        suggestionId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        reason: String = "",
        onResult: (PortfolioOptimizationTuningDecisionRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationTuningDecisionRecord(
                            suggestionId = suggestionId,
                            operatorId = operatorId,
                            operatorName = operatorName,
                            decisionReason = reason,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.DENIED,
                            summary = "Portfolio optimization tuning unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val decision = runCatching {
                api.denyPortfolioOptimizationTuning(
                    userId = userId,
                    suggestionId = suggestionId,
                    operatorId = operatorId,
                    operatorName = operatorName,
                    reason = reason
                )
            }.getOrDefault(
                PortfolioOptimizationTuningDecisionRecord(
                    suggestionId = suggestionId,
                    operatorId = operatorId,
                    operatorName = operatorName,
                    decisionReason = reason,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.DENIED,
                    summary = "Portfolio optimization tuning deny failed."
                )
            )
            scope.launch { onResult(decision) }
        }
    }

    fun recordPortfolioOptimizationCorrectiveAction(
        userId: String = "local-user",
        portfolioId: String,
        actionType: PortfolioOptimizationCorrectiveActionType,
        targetProgramId: String? = null,
        targetTrustTier: com.lumi.coredomain.contract.PortfolioOptimizationDestinationTrustTier? = null,
        targetJurisdiction: com.lumi.coredomain.contract.PortfolioOptimizationJurisdiction? = null,
        operatorId: String? = null,
        operatorName: String? = null,
        note: String = "",
        onResult: (PortfolioOptimizationCrossBoundaryCorrectiveActionRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationCrossBoundaryCorrectiveActionRecord(
                            portfolioId = portfolioId,
                            actionType = actionType,
                            targetProgramId = targetProgramId,
                            targetTrustTier = targetTrustTier,
                            targetJurisdiction = targetJurisdiction,
                            actorId = operatorId,
                            actorName = operatorName,
                            summary = buildString {
                                append("Portfolio corrective action unavailable: backend service not connected.")
                                note.takeIf { it.isNotBlank() }?.let {
                                    append(" Note: ")
                                    append(it)
                                }
                            }
                        )
                    )
                }
                return@launch
            }
            val record = runCatching {
                api.recordPortfolioOptimizationCorrectiveAction(
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
            }.getOrDefault(
                PortfolioOptimizationCrossBoundaryCorrectiveActionRecord(
                    portfolioId = portfolioId,
                    actionType = actionType,
                    targetProgramId = targetProgramId,
                    targetTrustTier = targetTrustTier,
                    targetJurisdiction = targetJurisdiction,
                    actorId = operatorId,
                    actorName = operatorName,
                    summary = buildString {
                        append("Portfolio corrective action recording failed.")
                        note.takeIf { it.isNotBlank() }?.let {
                            append(" Note: ")
                            append(it)
                        }
                    }
                )
            )
            scope.launch { onResult(record) }
        }
    }

    fun propagatePortfolioOptimizationObjectiveProfile(
        userId: String = "local-user",
        sourceObjectiveProfileSnapshotId: String,
        targetScope: PortfolioOptimizationLearningScope,
        operatorId: String? = null,
        operatorName: String? = null,
        onResult: (PortfolioOptimizationPropagationAttemptRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationPropagationAttemptRecord(
                            sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
                            targetScope = targetScope,
                            requestedByOperatorId = operatorId,
                            requestedByOperatorName = operatorName,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
                            summary = "Portfolio objective propagation unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val attempt = runCatching {
                api.propagatePortfolioOptimizationObjectiveProfile(
                    userId = userId,
                    sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
                    targetScope = targetScope,
                    operatorId = operatorId,
                    operatorName = operatorName
                )
            }.getOrDefault(
                PortfolioOptimizationPropagationAttemptRecord(
                    sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
                    targetScope = targetScope,
                    requestedByOperatorId = operatorId,
                    requestedByOperatorName = operatorName,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
                    summary = "Portfolio objective propagation failed."
                )
            )
            scope.launch { onResult(attempt) }
        }
    }

    fun approvePortfolioOptimizationPropagation(
        userId: String = "local-user",
        attemptId: String,
        approverId: String? = null,
        approverName: String? = null,
        onResult: (PortfolioOptimizationPropagationAdoptionRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationPropagationAdoptionRecord(
                            attemptId = attemptId,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
                            summary = "Portfolio objective propagation approval unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val adoption = runCatching {
                api.approvePortfolioOptimizationPropagation(
                    userId = userId,
                    attemptId = attemptId,
                    approverId = approverId,
                    approverName = approverName
                )
            }.getOrDefault(
                PortfolioOptimizationPropagationAdoptionRecord(
                    attemptId = attemptId,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
                    summary = "Portfolio objective propagation approval failed."
                )
            )
            scope.launch { onResult(adoption) }
        }
    }

    fun rejectPortfolioOptimizationPropagation(
        userId: String = "local-user",
        attemptId: String,
        approverId: String? = null,
        approverName: String? = null,
        reason: String = "",
        onResult: (PortfolioOptimizationPropagationApprovalRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationPropagationApprovalRecord(
                            attemptId = attemptId,
                            approved = false,
                            approverId = approverId,
                            approverName = approverName,
                            reason = reason,
                            summary = "Portfolio objective propagation rejection unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val approval = runCatching {
                api.rejectPortfolioOptimizationPropagation(
                    userId = userId,
                    attemptId = attemptId,
                    approverId = approverId,
                    approverName = approverName,
                    reason = reason
                )
            }.getOrDefault(
                PortfolioOptimizationPropagationApprovalRecord(
                    attemptId = attemptId,
                    approved = false,
                    approverId = approverId,
                    approverName = approverName,
                    reason = reason,
                    summary = "Portfolio objective propagation rejection failed."
                )
            )
            scope.launch { onResult(approval) }
        }
    }

    fun recordPortfolioOptimizationConsent(
        userId: String = "local-user",
        consent: PortfolioOptimizationConsentRecord,
        onResult: (PortfolioOptimizationConsentRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        consent.copy(
                            decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                            summary = "Portfolio learning consent unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val result = runCatching {
                api.recordPortfolioOptimizationConsent(userId = userId, consent = consent)
            }.getOrDefault(
                consent.copy(
                    decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                    summary = "Portfolio learning consent recording failed."
                )
            )
            scope.launch { onResult(result) }
        }
    }

    fun revokePortfolioOptimizationConsent(
        userId: String = "local-user",
        consentId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        reason: String = "",
        onResult: (PortfolioOptimizationConsentRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationConsentRecord(
                            consentId = consentId,
                            decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                            provenance = com.lumi.coredomain.contract.PortfolioOptimizationConsentProvenance(
                                grantedById = operatorId,
                                grantedByName = operatorName
                            ),
                            summary = "Portfolio learning consent revoke unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val result = runCatching {
                api.revokePortfolioOptimizationConsent(
                    userId = userId,
                    consentId = consentId,
                    operatorId = operatorId,
                    operatorName = operatorName,
                    reason = reason
                )
            }.getOrDefault(
                PortfolioOptimizationConsentRecord(
                    consentId = consentId,
                    decision = com.lumi.coredomain.contract.PortfolioOptimizationConsentDecision.DENIED,
                    provenance = com.lumi.coredomain.contract.PortfolioOptimizationConsentProvenance(
                        grantedById = operatorId,
                        grantedByName = operatorName
                    ),
                    summary = "Portfolio learning consent revoke failed."
                )
            )
            scope.launch { onResult(result) }
        }
    }

    fun dispatchPortfolioOptimizationRemoteLearningTransport(
        userId: String = "local-user",
        envelopeId: String,
        purpose: PortfolioOptimizationConsentPurpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
        operatorId: String? = null,
        operatorName: String? = null,
        onResult: (PortfolioOptimizationRemoteLearningTransportAttemptRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationRemoteLearningTransportAttemptRecord(
                            remoteEnvelopeId = envelopeId,
                            purpose = purpose,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.BLOCKED,
                            summary = "Remote learning transport unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val attempt = runCatching {
                api.dispatchPortfolioOptimizationRemoteLearningTransport(
                    userId = userId,
                    envelopeId = envelopeId,
                    purpose = purpose,
                    operatorId = operatorId,
                    operatorName = operatorName
                )
            }.getOrDefault(
                PortfolioOptimizationRemoteLearningTransportAttemptRecord(
                    remoteEnvelopeId = envelopeId,
                    purpose = purpose,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationRemoteLearningDeliveryStatus.FAILED,
                    summary = "Remote learning transport failed."
                )
            )
            scope.launch { onResult(attempt) }
        }
    }

    fun requestPortfolioOptimizationComplianceAuditExport(
        userId: String = "local-user",
        request: PortfolioOptimizationComplianceAuditExportRequest,
        onResult: (PortfolioOptimizationComplianceAuditExportResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationComplianceAuditExportResult(
                            requestId = request.requestId,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
                            summary = "Compliance audit export unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val result = runCatching {
                api.requestPortfolioOptimizationComplianceAuditExport(
                    userId = userId,
                    request = request
                )
            }.getOrDefault(
                PortfolioOptimizationComplianceAuditExportResult(
                    requestId = request.requestId,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationComplianceAuditExportStatus.FAILED,
                    summary = "Compliance audit export failed."
                )
            )
            scope.launch { onResult(result) }
        }
    }

    fun exportPortfolioOptimizationLearningSyncEnvelope(
        userId: String = "local-user",
        objectiveProfileSnapshotId: String = "",
        calibrationSnapshotId: String = "",
        mode: PortfolioOptimizationLearningSyncMode = PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
        operatorId: String? = null,
        operatorName: String? = null,
        onResult: (PortfolioOptimizationLearningSyncEnvelope) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationLearningSyncEnvelope(
                            mode = mode,
                            provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncProvenance(
                                sourceUserId = userId,
                                operatorId = operatorId,
                                operatorName = operatorName
                            ),
                            summary = "Portfolio learning sync export unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val envelope = runCatching {
                api.exportPortfolioOptimizationLearningSyncEnvelope(
                    userId = userId,
                    objectiveProfileSnapshotId = objectiveProfileSnapshotId,
                    calibrationSnapshotId = calibrationSnapshotId,
                    mode = mode,
                    operatorId = operatorId,
                    operatorName = operatorName
                )
            }.getOrDefault(
                PortfolioOptimizationLearningSyncEnvelope(
                    mode = mode,
                    provenance = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncProvenance(
                        sourceUserId = userId,
                        operatorId = operatorId,
                        operatorName = operatorName
                    ),
                    summary = "Portfolio learning sync export failed."
                )
            )
            scope.launch { onResult(envelope) }
        }
    }

    fun importPortfolioOptimizationLearningSyncEnvelope(
        userId: String = "local-user",
        envelope: PortfolioOptimizationLearningSyncEnvelope,
        operatorId: String? = null,
        operatorName: String? = null,
        onResult: (PortfolioOptimizationLearningSyncAttemptRecord) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        PortfolioOptimizationLearningSyncAttemptRecord(
                            direction = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncDirection.IMPORT,
                            envelopeId = envelope.envelopeId,
                            mode = envelope.mode,
                            status = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.FAILED,
                            summary = "Portfolio learning sync import unavailable: backend service not connected."
                        )
                    )
                }
                return@launch
            }
            val attempt = runCatching {
                api.importPortfolioOptimizationLearningSyncEnvelope(
                    userId = userId,
                    envelope = envelope,
                    operatorId = operatorId,
                    operatorName = operatorName
                )
            }.getOrDefault(
                PortfolioOptimizationLearningSyncAttemptRecord(
                    direction = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncDirection.IMPORT,
                    envelopeId = envelope.envelopeId,
                    mode = envelope.mode,
                    status = com.lumi.coredomain.contract.PortfolioOptimizationLearningSyncStatus.FAILED,
                    summary = "Portfolio learning sync import failed."
                )
            )
            scope.launch { onResult(attempt) }
        }
    }

    fun exportPortfolioSimulationSummary(
        userId: String = "local-user",
        runId: String,
        onResult: (String) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val summary = if (api == null) {
                "Simulation export unavailable: backend service not connected."
            } else {
                runCatching { api.exportPortfolioSimulationSummary(userId, runId) }
                    .getOrDefault("Simulation export unavailable for run $runId.")
            }
            scope.launch { onResult(summary) }
        }
    }

    fun exportPortfolioOptimizationSummary(
        userId: String = "local-user",
        resultId: String,
        onResult: (String) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult("Portfolio optimization export unavailable: backend service not connected.")
                }
                return@launch
            }
            val summary = runCatching { api.exportPortfolioOptimizationSummary(userId, resultId) }
                .getOrDefault("Portfolio optimization export failed for result $resultId.")
            scope.launch { onResult(summary) }
        }
    }

    fun markGovernanceCaseReviewed(
        userId: String = "local-user",
        runId: String,
        onResult: (GovernanceActionResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        GovernanceActionResult(
                            action = com.lumi.coredomain.contract.GovernanceActionType.MARK_REVIEWED,
                            runId = runId,
                            success = false,
                            message = "Backend service not connected"
                        )
                    )
                }
                return@launch
            }
            val result = runCatching { api.markGovernanceCaseReviewed(userId, runId) }
                .getOrDefault(
                    GovernanceActionResult(
                        action = com.lumi.coredomain.contract.GovernanceActionType.MARK_REVIEWED,
                        runId = runId,
                        success = false,
                        message = "Failed to mark governance case as reviewed."
                    )
                )
            scope.launch { onResult(result) }
        }
    }

    fun retryGovernanceSyncIntent(
        userId: String = "local-user",
        runId: String,
        onResult: (GovernanceActionResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        GovernanceActionResult(
                            action = com.lumi.coredomain.contract.GovernanceActionType.RETRY_SYNC_INTENT,
                            runId = runId,
                            success = false,
                            message = "Backend service not connected"
                        )
                    )
                }
                return@launch
            }
            val result = runCatching { api.retryGovernanceSyncIntent(userId, runId) }
                .getOrDefault(
                    GovernanceActionResult(
                        action = com.lumi.coredomain.contract.GovernanceActionType.RETRY_SYNC_INTENT,
                        runId = runId,
                        success = false,
                        message = "Failed to schedule governance sync retry."
                    )
                )
            scope.launch { onResult(result) }
        }
    }

    fun updateGovernanceCaseCollaboration(
        userId: String = "local-user",
        runId: String,
        command: GovernanceCollaborationCommand,
        onResult: (GovernanceActionResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        GovernanceActionResult(
                            action = command.commandType,
                            runId = runId,
                            success = false,
                            message = "Backend service not connected"
                        )
                    )
                }
                return@launch
            }
            val result = runCatching {
                api.updateGovernanceCaseCollaboration(userId, runId, command)
            }.getOrDefault(
                GovernanceActionResult(
                    action = command.commandType,
                    runId = runId,
                    success = false,
                    message = "Failed to apply governance collaboration action."
                )
            )
            scope.launch { onResult(result) }
        }
    }

    fun performGovernanceBulkAction(
        userId: String = "local-user",
        request: GovernanceBulkActionRequest,
        onResult: (GovernanceBulkActionResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch {
                    onResult(
                        GovernanceBulkActionResult(
                            action = request.action,
                            requestedCount = request.runIds.size,
                            failureCount = request.runIds.size,
                            message = "Backend service not connected"
                        )
                    )
                }
                return@launch
            }
            val result = runCatching {
                api.performGovernanceBulkAction(userId, request)
            }.getOrDefault(
                GovernanceBulkActionResult(
                    action = request.action,
                    requestedCount = request.runIds.size,
                    failureCount = request.runIds.size,
                    message = "Failed to apply governance bulk action."
                )
            )
            scope.launch { onResult(result) }
        }
    }

    fun fetchModuleSnapshot(
        module: ModuleId,
        userId: String = "local-user",
        onResult: (AgentResponse?) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(null) }
                return@launch
            }
            val snapshot = runCatching { api.getModuleSnapshot(userId, module) }.getOrNull()
            scope.launch { onResult(snapshot) }
        }
    }

    fun cancel(requestId: String): Boolean {
        return bridge?.cancelRequest(requestId) == true
    }

    fun fetchRoutingDecision(requestId: String, onResult: (RoutingDecisionPayload?) -> Unit): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val decision = runCatching { api?.getRoutingDecision(requestId) }.getOrNull()
            scope.launch { onResult(decision) }
        }
    }

    fun fetchSkillInvocations(requestId: String, onResult: (List<SkillInvocationPayload>) -> Unit): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val invocations = runCatching { api?.listSkillInvocations(requestId).orEmpty() }.getOrDefault(emptyList())
            scope.launch { onResult(invocations) }
        }
    }

    fun fetchSkillGapReport(module: ModuleId, onResult: (SkillGapPayload?) -> Unit): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val gap = runCatching { api?.getSkillGapReport(module) }.getOrNull()
            scope.launch { onResult(gap) }
        }
    }

    fun recordInteraction(event: InteractionEvent) {
        bridge?.recordInteraction(event)
    }

    fun updateStateConsensus(
        userId: String = "local-user",
        patch: StateConsensusPayload,
        onResult: (Boolean) -> Unit = {}
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val updated = runCatching { api?.updateStateConsensus(userId, patch) == true }.getOrDefault(false)
            scope.launch { onResult(updated) }
        }
    }

    fun fetchRolePolicyEditorState(
        userId: String = "local-user",
        role: UserRole,
        onResult: (RolePolicyEditorState?) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            if (api == null) {
                scope.launch { onResult(null) }
                return@launch
            }
            val state = runCatching { api.getRolePolicyEditorState(userId, role) }.getOrNull()
            scope.launch { onResult(state) }
        }
    }

    fun updateRolePolicy(
        userId: String = "local-user",
        role: UserRole,
        draft: RolePolicyDraft,
        onResult: (RolePolicyUpdateResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val result = runCatching {
                api?.updateRolePolicy(userId, role, draft)
            }.getOrNull() ?: RolePolicyUpdateResult(
                saved = false,
                role = role
            )
            scope.launch { onResult(result) }
        }
    }

    fun resetRolePolicy(
        userId: String = "local-user",
        role: UserRole,
        onResult: (RolePolicyUpdateResult) -> Unit
    ): Job {
        return scope.launch(Dispatchers.IO) {
            val api = awaitBridge()
            val result = runCatching {
                api?.resetRolePolicy(userId, role)
            }.getOrNull() ?: RolePolicyUpdateResult(
                saved = false,
                role = role
            )
            scope.launch { onResult(result) }
        }
    }

    private suspend fun awaitBridge(): LumiBackendBridge? {
        if (bridge == null) {
            connect()
            for (index in 0 until CONNECTION_WAIT_RETRY) {
                if (bridge != null) break
                delay(CONNECTION_WAIT_MS)
            }
        }
        return bridge
    }

    companion object {
        private const val BACKEND_SERVICE_CLASS = "com.lumi.keyboard.LumiAgentBackendService"
        private const val DEFAULT_RESPONSE_LOCALE = "en-GB"
        private const val CONNECTION_WAIT_MS = 80L
        private const val CONNECTION_WAIT_RETRY = 10
        private const val APP_POLL_INTERVAL_MS = 80L
    }

    private fun ResponseStatus.isTerminal(): Boolean {
        return this == ResponseStatus.SUCCESS ||
            this == ResponseStatus.PARTIAL ||
            this == ResponseStatus.WAITING_USER ||
            this == ResponseStatus.COMMITTED ||
            this == ResponseStatus.ROLLED_BACK ||
            this == ResponseStatus.DISPUTED ||
            this == ResponseStatus.ERROR ||
            this == ResponseStatus.CANCELLED
    }

    private fun backendIntent(): Intent {
        return Intent().setClassName(context.packageName, BACKEND_SERVICE_CLASS)
    }
}
