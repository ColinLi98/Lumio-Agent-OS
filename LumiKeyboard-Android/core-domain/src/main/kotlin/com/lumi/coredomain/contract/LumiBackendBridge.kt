package com.lumi.coredomain.contract

fun interface AgentResultObserver {
    fun onResult(response: AgentResponse)
}

interface LumiBackendBridge {
    fun submitAgentRequest(request: AgentRequest): String

    fun getAgentResult(requestId: String): AgentResponse

    fun observeAgentResult(requestId: String, observer: AgentResultObserver) {
        observer.onResult(getAgentResult(requestId))
    }

    fun cancelRequest(requestId: String): Boolean {
        return false
    }

    fun recordInteraction(event: InteractionEvent)

    fun getDigitalSoulSummary(userId: String): DigitalSoulSummary

    fun getModuleSnapshot(userId: String, module: ModuleId): AgentResponse {
        return AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "Module snapshot is currently unavailable",
            traceId = "local",
            latencyMs = 0,
            confidence = 0.0,
            module = module,
            status = ResponseStatus.PARTIAL
        )
    }

    fun getRoutingDecision(requestId: String): RoutingDecisionPayload? {
        return null
    }

    fun listSkillInvocations(requestId: String): List<SkillInvocationPayload> {
        return emptyList()
    }

    fun getSkillGapReport(module: ModuleId): SkillGapPayload? {
        return null
    }

    fun getDynamicState(userId: String): DynamicHumanStatePayload? {
        return null
    }

    fun getTrajectory(userId: String, days: Int): List<TrajectoryPointPayload> {
        return emptyList()
    }

    fun updateStateConsensus(userId: String, patch: StateConsensusPayload): Boolean {
        return false
    }

    fun getRolePolicyEditorState(userId: String, role: UserRole): RolePolicyEditorState? {
        return null
    }

    fun updateRolePolicy(userId: String, role: UserRole, draft: RolePolicyDraft): RolePolicyUpdateResult {
        return RolePolicyUpdateResult(
            saved = false,
            role = role,
            validation = RolePolicyValidationResult(
                valid = false,
                issues = listOf(
                    RolePolicyValidationIssue(
                        field = "service",
                        message = "Role policy update bridge is unavailable.",
                        blocking = true
                    )
                )
            )
        )
    }

    fun resetRolePolicy(userId: String, role: UserRole): RolePolicyUpdateResult {
        return RolePolicyUpdateResult(
            saved = false,
            role = role,
            validation = RolePolicyValidationResult(
                valid = false,
                issues = listOf(
                    RolePolicyValidationIssue(
                        field = "service",
                        message = "Role policy reset bridge is unavailable.",
                        blocking = true
                    )
                )
            )
        )
    }

    fun getExecutionLedger(
        userId: String,
        filter: LedgerQueryFilter = LedgerQueryFilter()
    ): List<ExecutionReceiptRecord> {
        return emptyList()
    }

    fun getGovernanceSummary(
        userId: String,
        query: GovernanceQuery = GovernanceQuery()
    ): GovernanceSummary {
        return GovernanceSummary(query = query)
    }

    fun getGovernanceCases(
        userId: String,
        filter: GovernanceConsoleFilter = GovernanceConsoleFilter()
    ): List<GovernanceCaseRecord> {
        return emptyList()
    }

    fun getGovernanceConsoleState(
        userId: String,
        filter: GovernanceConsoleFilter = GovernanceConsoleFilter()
    ): GovernanceConsoleState {
        return GovernanceConsoleState(filter = filter)
    }

    fun markGovernanceCaseReviewed(
        userId: String,
        runId: String
    ): GovernanceActionResult {
        return GovernanceActionResult(
            action = GovernanceActionType.MARK_REVIEWED,
            runId = runId,
            success = false,
            message = "Governance case review action is unavailable."
        )
    }

    fun retryGovernanceSyncIntent(
        userId: String,
        runId: String
    ): GovernanceActionResult {
        return GovernanceActionResult(
            action = GovernanceActionType.RETRY_SYNC_INTENT,
            runId = runId,
            success = false,
            message = "Governance sync retry action is unavailable."
        )
    }

    fun updateGovernanceCaseCollaboration(
        userId: String,
        runId: String,
        command: GovernanceCollaborationCommand
    ): GovernanceActionResult {
        return GovernanceActionResult(
            action = command.commandType,
            runId = runId,
            success = false,
            message = "Governance collaboration action is unavailable."
        )
    }

    fun performGovernanceBulkAction(
        userId: String,
        request: GovernanceBulkActionRequest
    ): GovernanceBulkActionResult {
        return GovernanceBulkActionResult(
            action = request.action,
            requestedCount = request.runIds.size,
            failureCount = request.runIds.size,
            message = "Governance bulk action is unavailable."
        )
    }

    fun getPortfolioSimulationState(
        userId: String,
        query: PortfolioSimulationQuery = PortfolioSimulationQuery()
    ): PortfolioSimulationState {
        return PortfolioSimulationState(query = query)
    }

    fun getPortfolioOptimizationState(
        userId: String,
        query: PortfolioOptimizationQuery = PortfolioOptimizationQuery()
    ): PortfolioOptimizationState {
        return PortfolioOptimizationState(query = query)
    }

    fun savePortfolioScenario(
        userId: String,
        scenario: PortfolioScenarioDefinition
    ): PortfolioScenarioDefinition {
        return scenario
    }

    fun savePortfolioOptimizationRequest(
        userId: String,
        request: PortfolioOptimizationRequest
    ): PortfolioOptimizationRequest {
        return request
    }

    fun runPortfolioScenario(
        userId: String,
        scenarioId: String
    ): PortfolioSimulationRunRecord {
        return PortfolioSimulationRunRecord(
            scenarioId = scenarioId,
            status = PortfolioSimulationRunStatus.FAILED,
            summary = "Portfolio simulation run is unavailable."
        )
    }

    fun runPortfolioOptimization(
        userId: String,
        requestId: String
    ): PortfolioOptimizationResult {
        return PortfolioOptimizationResult(
            requestId = requestId,
            status = PortfolioOptimizationResultStatus.FAILED,
            summary = "Portfolio optimization is unavailable."
        )
    }

    fun comparePortfolioSimulationRuns(
        userId: String,
        baselineRunId: String,
        candidateRunId: String
    ): PortfolioScenarioComparison {
        return PortfolioScenarioComparison(
            baselineRunId = baselineRunId,
            candidateRunId = candidateRunId,
            summary = "Portfolio simulation comparison is unavailable."
        )
    }

    fun selectPortfolioOptimizationSchedule(
        userId: String,
        resultId: String,
        candidateId: String,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationDecisionRecord {
        return PortfolioOptimizationDecisionRecord(
            resultId = resultId,
            candidateId = candidateId,
            selectedByOperatorId = operatorId,
            selectedByOperatorName = operatorName,
            summary = "Portfolio optimization schedule selection is unavailable."
        )
    }

    fun recordPortfolioOptimizationOutcome(
        userId: String,
        decisionId: String,
        observations: PortfolioOutcomeObservationSet = PortfolioOutcomeObservationSet()
    ): PortfolioScheduleOutcomeRecord {
        return PortfolioScheduleOutcomeRecord(
            decisionId = decisionId,
            observations = observations,
            summary = "Portfolio optimization outcome recording is unavailable."
        )
    }

    fun applyPortfolioOptimizationTuning(
        userId: String,
        suggestionId: String,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationTuningDecisionRecord {
        return PortfolioOptimizationTuningDecisionRecord(
            suggestionId = suggestionId,
            operatorId = operatorId,
            operatorName = operatorName,
            status = PortfolioOptimizationTuningStatus.BLOCKED,
            summary = "Portfolio optimization tuning apply is unavailable."
        )
    }

    fun denyPortfolioOptimizationTuning(
        userId: String,
        suggestionId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        reason: String = ""
    ): PortfolioOptimizationTuningDecisionRecord {
        return PortfolioOptimizationTuningDecisionRecord(
            suggestionId = suggestionId,
            operatorId = operatorId,
            operatorName = operatorName,
            decisionReason = reason,
            status = PortfolioOptimizationTuningStatus.DENIED,
            summary = "Portfolio optimization tuning deny is unavailable."
        )
    }

    fun recordPortfolioOptimizationCorrectiveAction(
        userId: String,
        portfolioId: String,
        actionType: PortfolioOptimizationCorrectiveActionType,
        targetProgramId: String? = null,
        targetTrustTier: PortfolioOptimizationDestinationTrustTier? = null,
        targetJurisdiction: PortfolioOptimizationJurisdiction? = null,
        operatorId: String? = null,
        operatorName: String? = null,
        note: String = ""
    ): PortfolioOptimizationCrossBoundaryCorrectiveActionRecord {
        return PortfolioOptimizationCrossBoundaryCorrectiveActionRecord(
            portfolioId = portfolioId,
            actionType = actionType,
            targetProgramId = targetProgramId,
            targetTrustTier = targetTrustTier,
            targetJurisdiction = targetJurisdiction,
            actorId = operatorId,
            actorName = operatorName,
            summary = "Portfolio corrective action recording is unavailable.${if (note.isBlank()) "" else " $note"}"
        )
    }

    fun propagatePortfolioOptimizationObjectiveProfile(
        userId: String,
        sourceObjectiveProfileSnapshotId: String,
        targetScope: PortfolioOptimizationLearningScope,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationPropagationAttemptRecord {
        return PortfolioOptimizationPropagationAttemptRecord(
            sourceObjectiveProfileSnapshotId = sourceObjectiveProfileSnapshotId,
            targetScope = targetScope,
            requestedByOperatorId = operatorId,
            requestedByOperatorName = operatorName,
            status = PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
            summary = "Portfolio objective propagation is unavailable."
        )
    }

    fun approvePortfolioOptimizationPropagation(
        userId: String,
        attemptId: String,
        approverId: String? = null,
        approverName: String? = null
    ): PortfolioOptimizationPropagationAdoptionRecord {
        return PortfolioOptimizationPropagationAdoptionRecord(
            attemptId = attemptId,
            status = PortfolioOptimizationPropagationEligibilityStatus.BLOCKED,
            summary = "Portfolio objective propagation approval is unavailable."
        )
    }

    fun rejectPortfolioOptimizationPropagation(
        userId: String,
        attemptId: String,
        approverId: String? = null,
        approverName: String? = null,
        reason: String = ""
    ): PortfolioOptimizationPropagationApprovalRecord {
        return PortfolioOptimizationPropagationApprovalRecord(
            attemptId = attemptId,
            approved = false,
            approverId = approverId,
            approverName = approverName,
            reason = reason,
            summary = "Portfolio objective propagation rejection is unavailable."
        )
    }

    fun recordPortfolioOptimizationConsent(
        userId: String,
        consent: PortfolioOptimizationConsentRecord
    ): PortfolioOptimizationConsentRecord {
        return consent.copy(
            decision = PortfolioOptimizationConsentDecision.DENIED,
            reasonCodes = (consent.reasonCodes + RoleReasonCodes.ROLE_CONSENT_DENIED).distinct(),
            summary = "Portfolio learning consent recording is unavailable."
        )
    }

    fun revokePortfolioOptimizationConsent(
        userId: String,
        consentId: String,
        operatorId: String? = null,
        operatorName: String? = null,
        reason: String = ""
    ): PortfolioOptimizationConsentRecord {
        return PortfolioOptimizationConsentRecord(
            consentId = consentId,
            decision = PortfolioOptimizationConsentDecision.DENIED,
            provenance = PortfolioOptimizationConsentProvenance(
                grantedById = operatorId,
                grantedByName = operatorName
            ),
            summary = if (reason.isNotBlank()) {
                reason
            } else {
                "Portfolio learning consent revoke is unavailable."
            },
            reasonCodes = listOf(RoleReasonCodes.ROLE_CONSENT_DENIED)
        )
    }

    fun dispatchPortfolioOptimizationRemoteLearningTransport(
        userId: String,
        envelopeId: String,
        purpose: PortfolioOptimizationConsentPurpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationRemoteLearningTransportAttemptRecord {
        return PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            remoteEnvelopeId = envelopeId,
            purpose = purpose,
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.BLOCKED,
            issues = listOf(
                PortfolioOptimizationRemoteLearningTransportIssue(
                    type = PortfolioOptimizationRemoteLearningTransportIssueType.TRANSPORT_UNAVAILABLE,
                    blocking = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_FAILED),
                    summary = "Portfolio remote learning transport is unavailable."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_FAILED),
            summary = "Portfolio remote learning transport is unavailable."
        )
    }

    fun requestPortfolioOptimizationComplianceAuditExport(
        userId: String,
        request: PortfolioOptimizationComplianceAuditExportRequest
    ): PortfolioOptimizationComplianceAuditExportResult {
        return PortfolioOptimizationComplianceAuditExportResult(
            requestId = request.requestId,
            status = PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
            redactionSummary = request.redactionPolicy.summary,
            reasonCodes = listOf(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_BLOCKED_BY_POLICY),
            summary = "Portfolio compliance audit export is unavailable."
        )
    }

    fun exportPortfolioOptimizationLearningSyncEnvelope(
        userId: String,
        objectiveProfileSnapshotId: String = "",
        calibrationSnapshotId: String = "",
        mode: PortfolioOptimizationLearningSyncMode =
            PortfolioOptimizationLearningSyncMode.DEVICE_SYNC,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationLearningSyncEnvelope {
        return PortfolioOptimizationLearningSyncEnvelope(
            mode = mode,
            provenance = PortfolioOptimizationLearningSyncProvenance(
                sourceUserId = userId,
                operatorId = operatorId,
                operatorName = operatorName
            ),
            issues = listOf(
                PortfolioOptimizationLearningSyncIssue(
                    type = PortfolioOptimizationLearningSyncIssueType.TRANSPORT_UNAVAILABLE,
                    blocking = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_FAILED),
                    summary = "Portfolio learning sync export is unavailable."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_FAILED),
            summary = "Portfolio learning sync export is unavailable."
        )
    }

    fun importPortfolioOptimizationLearningSyncEnvelope(
        userId: String,
        envelope: PortfolioOptimizationLearningSyncEnvelope,
        operatorId: String? = null,
        operatorName: String? = null
    ): PortfolioOptimizationLearningSyncAttemptRecord {
        return PortfolioOptimizationLearningSyncAttemptRecord(
            direction = PortfolioOptimizationLearningSyncDirection.IMPORT,
            envelopeId = envelope.envelopeId,
            mode = envelope.mode,
            status = PortfolioOptimizationLearningSyncStatus.FAILED,
            provenance = envelope.provenance.copy(
                operatorId = operatorId ?: envelope.provenance.operatorId,
                operatorName = operatorName ?: envelope.provenance.operatorName
            ),
            issues = listOf(
                PortfolioOptimizationLearningSyncIssue(
                    type = PortfolioOptimizationLearningSyncIssueType.TRANSPORT_UNAVAILABLE,
                    blocking = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_FAILED),
                    summary = "Portfolio learning sync import is unavailable."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_FAILED),
            summary = "Portfolio learning sync import is unavailable."
        )
    }

    fun exportPortfolioSimulationSummary(
        userId: String,
        runId: String
    ): String {
        return "Portfolio simulation summary is unavailable for run $runId."
    }

    fun exportPortfolioOptimizationSummary(
        userId: String,
        resultId: String
    ): String {
        return "Portfolio optimization summary is unavailable for result $resultId."
    }

    fun resumePendingRequests(userId: String): List<String> {
        return emptyList()
    }
}
