package com.lumi.coredomain.contract

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DomainContractsTest {

    @Test
    fun encodeDecode_agentRequest() {
        val req = AgentRequest(
            sessionId = "s1",
            userId = "u1",
            sourceApp = "com.demo",
            mode = AgentMode.AGENT_MODE,
            rawText = "你好",
            timestampMs = 1L,
            locale = "zh-CN"
        )

        val encoded = DomainJson.encode(req)
        val decoded = DomainJson.decode<AgentRequest>(encoded)

        assertEquals(req.sessionId, decoded.sessionId)
        assertEquals(req.rawText, decoded.rawText)
    }

    @Test
    fun lumiRoute_lixIntent() {
        assertEquals("lumi://lix/intent/abc", LumiRoutes.lixIntent("abc"))
    }

    @Test
    fun cloudResult_retryableDefaultsFalse() {
        val result = CloudResult<Unit>(success = false, error = "x", traceId = "t")
        assertTrue(!result.retryable)
    }

    @Test
    fun encodeDecode_settingsPayloadWithModuleMetrics() {
        val payload = ModulePayload.SettingsPayload(
            backendStatus = "online",
            taskConfirmCount = 3,
            taskCancelCount = 1,
            taskConfirmRate = 0.75,
            dtoeDecisionCount = 4,
            dtoeAdoptionRate = 0.5,
            baselineDecisionCount = 2,
            baselineAdoptionRate = 0.25,
            dtoeAdoptionUplift = 0.25,
            dtoeCalibrationError = 0.18,
            dtoeCalibrationSampleCount = 3,
            dtoeConfidenceCoverage = 0.75,
            apiOverallStatus = "degraded",
            apiHealthyCount = 2,
            apiTotalCount = 4,
            apiHealthChecks = listOf(
                ModulePayload.ApiHealthCheckPayload(
                    checkId = "chat_live_search",
                    moduleKey = "chat",
                    moduleLabel = "对话",
                    endpoint = "/api/live-search",
                    status = "up",
                    healthy = true,
                    latencyMs = 120
                )
            ),
            moduleTaskMetrics = listOf(
                ModulePayload.ModuleTaskMetricPayload(
                    moduleKey = "chat",
                    moduleLabel = "对话",
                    taskConfirmCount = 2,
                    taskCancelCount = 0,
                    taskConfirmRate = 1.0
                )
            )
        )
        val encoded = DomainJson.encode(payload)
        val decoded = DomainJson.decode<ModulePayload.SettingsPayload>(encoded)

        assertEquals("online", decoded.backendStatus)
        assertEquals(3, decoded.taskConfirmCount)
        assertEquals(1, decoded.moduleTaskMetrics.size)
        assertEquals("chat", decoded.moduleTaskMetrics.first().moduleKey)
        assertEquals("degraded", decoded.apiOverallStatus)
        assertEquals(1, decoded.apiHealthChecks.size)
        assertEquals("/api/live-search", decoded.apiHealthChecks.first().endpoint)
        assertEquals(4, decoded.dtoeDecisionCount)
        assertEquals(3, decoded.dtoeCalibrationSampleCount)
        assertEquals(75, (decoded.dtoeConfidenceCoverage * 100).toInt())
        assertEquals("heuristic", decoded.digitalTwinEdgeModelMode)
        assertTrue(decoded.digitalTwinEdgeFallbackEnabled)
    }

    @Test
    fun encodeDecode_chatPayloadWithReasoningProtocol() {
        val payload = ModulePayload.ChatPayload(
            suggestionTitle = "推理摘要",
            reasoningProtocol = ReasoningProtocolPayload(
                version = "v1.1",
                mode = "full",
                methodsApplied = listOf("first_principles", "five_whys"),
                rootProblem = "目标和约束不一致",
                recommendedStrategy = "先澄清，再执行",
                confidence = 0.81,
                keyConstraints = listOf("预算有限"),
                topRisks = listOf("执行偏离目标")
            )
        )

        val encoded = DomainJson.encode(payload)
        val decoded = DomainJson.decode<ModulePayload.ChatPayload>(encoded)

        assertEquals("v1.1", decoded.reasoningProtocol?.version)
        assertEquals("full", decoded.reasoningProtocol?.mode)
        assertEquals("目标和约束不一致", decoded.reasoningProtocol?.rootProblem)
        assertEquals(1, decoded.reasoningProtocol?.topRisks?.size)
    }

    @Test
    fun encodeDecode_agentRequestWithStateVector() {
        val req = AgentRequest(
            sessionId = "s2",
            userId = "u2",
            sourceApp = "com.tencent.mm",
            mode = AgentMode.AGENT_MODE,
            rawText = "帮我拆解任务",
            timestampMs = 10L,
            locale = "zh-CN",
            stateVector = DynamicHumanStatePayload(
                l1 = L1CoreStatePayload(profileId = "lite-default", valueAnchor = "balanced", riskPreference = 0.45),
                l2 = L2ContextStatePayload(
                    sourceApp = "com.tencent.mm",
                    appCategory = "social",
                    energyLevel = 0.58,
                    contextLoad = 0.62
                ),
                l3 = L3EmotionStatePayload(
                    stressScore = 61,
                    polarity = -0.18,
                    focusScore = 57
                ),
                updatedAtMs = 123456L
            ),
            keystroke = KeystrokeDynamicsPayload(
                windowMs = 5000,
                keyCount = 18,
                backspaceCount = 3,
                avgInterKeyDelayMs = 134.0,
                pauseCount = 2,
                burstKpm = 230.0,
                stressProxy = 0.63
            )
        )

        val encoded = DomainJson.encode(req)
        val decoded = DomainJson.decode<AgentRequest>(encoded)

        assertEquals(61, decoded.stateVector?.l3?.stressScore)
        assertEquals(0.63, decoded.keystroke?.stressProxy)
    }

    @Test
    fun encodeDecode_agentRequestWithExtendedConstraints() {
        val req = AgentRequest(
            sessionId = "s3",
            userId = "u3",
            sourceApp = "com.demo",
            mode = AgentMode.APP_CHAT,
            rawText = "plan task",
            timestampMs = 22L,
            locale = "en-GB",
            activeRole = UserRole.WORK,
            constraints = AgentRequestConstraints(
                budget = "5000 CNY",
                deadline = "10 days",
                acceptanceCriteria = "evidence-backed",
                maxCostPerStep = "mid",
                riskTolerance = "low",
                userConfirmationToken = "CONFIRM-001",
                activeRole = UserRole.WORK
            )
        )

        val encoded = DomainJson.encode(req)
        val decoded = DomainJson.decode<AgentRequest>(encoded)

        assertEquals("mid", decoded.constraints.maxCostPerStep)
        assertEquals("low", decoded.constraints.riskTolerance)
        assertEquals("CONFIRM-001", decoded.constraints.userConfirmationToken)
        assertEquals(UserRole.WORK, decoded.activeRole)
        assertEquals(UserRole.WORK, decoded.constraints.activeRole)
    }

    @Test
    fun encodeDecode_agentResponseWithSkillAcquisitionContracts() {
        val response = AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "ready",
            traceId = "trace_skill_contract",
            latencyMs = 120,
            confidence = 0.86,
            skillRequirements = listOf(
                SkillRequirement(
                    taskId = "task_1",
                    capability = "flight_search",
                    maxLatencyMs = 4500,
                    minimumEvidenceLevel = "strong",
                    maxCostTier = "mid"
                )
            ),
            skillCandidates = listOf(
                SkillCandidate(
                    id = "local:travel_bundle",
                    source = SkillSource.LOCAL,
                    capabilities = listOf("flight_search"),
                    successRate = 0.93,
                    latencyP95Ms = 900,
                    evidenceLevel = "strong",
                    costTier = "mid",
                    sandboxLevel = SkillSandboxLevel.APPROVED,
                    admissionPassed = true,
                    score = SkillScoreBreakdown(
                        capabilityFit = 1.0,
                        successRateScore = 0.93,
                        latencyScore = 0.88,
                        evidenceLevelScore = 1.0,
                        costScore = 0.7,
                        totalScore = 0.9
                    )
                )
            ),
            skillAcquisitionDecisions = listOf(
                SkillAcquisitionDecision(
                    taskId = "task_1",
                    capability = "flight_search",
                    selectedSkillId = "local:travel_bundle",
                    status = SkillAcquisitionDecisionStatus.SELECTED,
                    reason = "best_score"
                )
            ),
            skillCanaryReports = listOf(
                SkillCanaryReport(
                    taskId = "task_1",
                    skillId = "github:flight_search",
                    passed = true,
                    sampleSize = 3,
                    evidenceCount = 2,
                    acceptanceNote = "canary_ok"
                )
            ),
            skillPromotionRecords = listOf(
                SkillPromotionRecord(
                    skillId = "github:flight_search",
                    fromLevel = SkillSandboxLevel.SANDBOX,
                    toLevel = SkillSandboxLevel.APPROVED,
                    promoted = true,
                    reason = "passed"
                )
            )
        )

        val encoded = DomainJson.encode(response)
        val decoded = DomainJson.decode<AgentResponse>(encoded)

        assertEquals(1, decoded.skillRequirements.size)
        assertEquals("flight_search", decoded.skillRequirements.first().capability)
        assertEquals(1, decoded.skillCandidates.size)
        assertEquals(1, decoded.skillAcquisitionDecisions.size)
        assertEquals(1, decoded.skillCanaryReports.size)
        assertEquals(1, decoded.skillPromotionRecords.size)
    }

    @Test
    fun encodeDecode_roleContractMetadataRoundTrip() {
        val request = AgentRequest(
            sessionId = "s-role",
            userId = "u-role",
            sourceApp = "com.demo.chat",
            mode = AgentMode.APP_CHAT,
            rawText = "Prepare supplier shortlist",
            timestampMs = 77L,
            locale = "en-US",
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleChangeReason = RoleChangeReason.USER_SWITCHED_ROLE,
            roleImpactReasonCodes = listOf(RoleReasonCodes.ROLE_EXPLICIT_USER_SELECTED),
            constraints = AgentRequestConstraints(
                activeRole = UserRole.BUYER,
                roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                roleChangeReason = RoleChangeReason.USER_SWITCHED_ROLE,
                roleImpactReasonCodes = listOf(
                    RoleReasonCodes.ROLE_EXPLICIT_USER_SELECTED,
                    RoleReasonCodes.ROLE_CHANGE_TRIGGERED_REEVALUATION
                )
            )
        )
        val encodedRequest = DomainJson.encode(request)
        val decodedRequest = DomainJson.decode<AgentRequest>(encodedRequest)
        assertEquals(RoleSource.EXPLICIT_USER_SELECTION, decodedRequest.roleSource)
        assertEquals(RoleChangeReason.USER_SWITCHED_ROLE, decodedRequest.roleChangeReason)
        assertEquals(2, decodedRequest.constraints.roleImpactReasonCodes.size)

        val response = AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "Role-aware run completed",
            traceId = "trace-role",
            latencyMs = 98,
            confidence = 0.84,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleChangeReason = RoleChangeReason.USER_SWITCHED_ROLE,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_ALLOWED,
                RoleReasonCodes.ROLE_ROUTE_BIAS_APPLIED
            ),
            delegationMode = DelegationMode.SUPERVISED
        )
        val encodedResponse = DomainJson.encode(response)
        val decodedResponse = DomainJson.decode<AgentResponse>(encodedResponse)
        assertEquals(UserRole.BUYER, decodedResponse.activeRole)
        assertEquals(RoleSource.EXPLICIT_USER_SELECTION, decodedResponse.roleSource)
        assertEquals(DelegationMode.SUPERVISED, decodedResponse.delegationMode)
    }

    @Test
    fun encodeDecode_executionReceiptRoundTrip() {
        val receipt = ExecutionReceipt(
            runId = "trace-receipt-1",
            intentSummary = "Compare external providers with strict policy checks.",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_APPROVAL_REQUIRED,
                RoleReasonCodes.ROLE_PROVIDER_EXCLUDED
            ),
            roleImpactSummary = "Approval required and a provider was excluded by role policy.",
            approvalSummary = "Approval required before execution can continue.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "Provider blocked by policy. Choose another provider or adjust constraints.",
            quoteSummary = "Collected 2 quote(s); selection pending role-aware approval.",
            verificationSummary = "No additional verification step was recorded.",
            proofSummary = "No proof artifacts were recorded.",
            rollbackSummary = "Rollback is available if verification fails or the outcome is disputed.",
            startedAt = 1000L,
            updatedAt = 1200L,
            completedAt = null,
            roleChangeReason = RoleChangeReason.USER_SWITCHED_ROLE,
            selectedCapabilityIds = listOf("capability_quote_compare"),
            blockedCapabilityIds = listOf("provider:blocked-a"),
            selectedProviderId = "provider-b",
            providerSelectionSummary = ProviderSelectionSummary(
                selectedProviderId = "provider-b",
                selectedProviderName = "Provider B",
                selectionRationale = "Best role-policy fit after deny filtering.",
                consideredProviderIds = listOf("provider-a", "provider-b"),
                deniedProviderIds = listOf("provider-a"),
                decisionReasonCodes = listOf(RoleReasonCodes.ROLE_PROVIDER_SELECTED)
            ),
            providerPolicyDecisions = listOf(
                ProviderPolicyDecision(
                    providerId = "provider-a",
                    providerName = "Provider A",
                    decision = ProviderDecisionStatus.DENIED,
                    denyReason = ProviderDenyReason.POLICY_RESTRICTED,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PROVIDER_DENIED_BY_POLICY),
                    readableReason = "Denied by role policy."
                )
            ),
            externalApprovalSummary = ExternalApprovalSummary(
                required = true,
                granted = false,
                denied = false,
                status = "required",
                summary = "External execution requires approval.",
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_APPROVAL_REQUIRED)
            ),
            externalDataScopeSummary = ExternalDataScopeSummary(
                sharingMode = "local_only",
                reduced = true,
                blocked = false,
                summary = "Provider-facing data scope reduced.",
                allowedScopes = listOf("minimal_task_context"),
                redactedFields = listOf("email")
            ),
            externalVerificationSummary = ExternalVerificationSummary(
                status = "pending",
                passed = false,
                partial = false,
                summary = "Verification pending."
            ),
            externalProofSummary = ExternalProofSummary(
                required = true,
                provided = false,
                summary = "Proof required but missing."
            ),
            externalRollbackSummary = ExternalRollbackSummary(
                available = true,
                triggered = false,
                summary = "Rollback available."
            ),
            externalDisputeSummary = ExternalDisputeSummary(
                opened = false,
                summary = "No active dispute."
            ),
            proofLinks = listOf("https://example.com/proof"),
            artifactReferences = listOf("Offer comparison evidence"),
            nextActionSummary = "Confirm approval",
            issueSummary = "Awaiting user approval",
            events = listOf(
                ExecutionReceiptEvent(
                    type = ExecutionReceiptEventType.RUN_STARTED,
                    title = "Run started",
                    detail = "Execution run trace-receipt started.",
                    timestampMs = 1000L
                ),
                ExecutionReceiptEvent(
                    type = ExecutionReceiptEventType.APPROVAL_REQUIRED,
                    title = "Approval required",
                    detail = "Approval required before execution can continue.",
                    timestampMs = 1200L
                )
            )
        )
        val response = AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "Execution waiting for approval",
            traceId = "trace-receipt-1",
            latencyMs = 88,
            confidence = 0.82,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            executionReceipt = receipt,
            payload = ModulePayload.ChatPayload(
                taskTrack = TaskTrackPayload(
                    taskId = "task-1",
                    traceId = "trace-receipt-1",
                    phase = "plan",
                    progress = 0.6f,
                    lastUpdateMs = 1200L,
                    executionReceipt = receipt
                )
            )
        )

        val encoded = DomainJson.encode(response)
        val decoded = DomainJson.decode<AgentResponse>(encoded)

        assertEquals("trace-receipt-1", decoded.executionReceipt?.runId)
        assertEquals(ResponseStatus.WAITING_USER, decoded.executionReceipt?.status)
        assertEquals(UserRole.BUYER, decoded.executionReceipt?.activeRole)
        assertEquals(2, decoded.executionReceipt?.events?.size)
        assertEquals("Provider B", decoded.executionReceipt?.providerSelectionSummary?.selectedProviderName)
        assertEquals(1, decoded.executionReceipt?.providerPolicyDecisions?.size)
        assertEquals("required", decoded.executionReceipt?.externalApprovalSummary?.status)
        assertEquals(true, decoded.executionReceipt?.externalRollbackSummary?.available)
        val decodedTrack = (decoded.payload as ModulePayload.ChatPayload).taskTrack
        assertEquals("trace-receipt-1", decodedTrack?.executionReceipt?.runId)
    }

    @Test
    fun encodeDecode_enterpriseProductizationShellRoundTrip() {
        val environmentActivation = EnvironmentActivationPayload(
            environmentKind = EnvironmentKind.SIMULATOR,
            environmentLabel = "Simulator workspace",
            workspaceBindingKind = WorkspaceBindingKind.UNBOUND,
            workspaceMode = "current",
            pilotActivationStatus = PilotActivationStatus.PILOT_BLOCKED,
            simulatorBacking = true,
            demoModeEnabled = true,
            baseUrl = "https://lumi-agent-simulator.vercel.app",
            baseUrlSource = "build_config_simulator_default",
            workspaceOptions = listOf(
                WorkspaceModeOptionPayload(
                    mode = "current",
                    label = "Current workspace",
                    selected = true,
                    workspaceBindingKind = WorkspaceBindingKind.UNBOUND,
                    environmentKind = EnvironmentKind.SIMULATOR,
                    description = "Uses the simulator-backed environment binding."
                ),
                WorkspaceModeOptionPayload(
                    mode = "demo",
                    label = "Demo workspace",
                    selected = false,
                    workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                    environmentKind = EnvironmentKind.DEMO,
                    description = "Uses seeded demo data."
                )
            ),
            missingDependencyCodes = listOf("operator_access_missing", "tenant_admin_touchpoint_missing"),
            missingDependencySummaries = listOf("Missing operator access", "Missing tenant-admin touchpoint"),
            environmentBinding = PilotEnvironmentBindingPayload(
                state = PilotEnvironmentBindingState.BLOCKED,
                environmentKind = EnvironmentKind.SIMULATOR,
                environmentLabel = "Simulator workspace",
                baseUrl = "https://lumi-agent-simulator.vercel.app",
                summary = "Simulator binding cannot count as a real pilot environment.",
                source = "SIMULATOR"
            ),
            actorAvailability = listOf(
                ActorAvailabilityPayload(
                    role = ActorRole.OPERATOR,
                    state = DependencyReadinessState.MISSING,
                    provisioningState = PilotProvisioningState.UNPROVISIONED,
                    accessState = PilotAccessGrantState.NOT_GRANTED,
                    summary = "Missing operator access",
                    missingDependencyCode = "operator_access_missing"
                )
            ),
            identityReadiness = IdentityReadinessPayload(
                state = DependencyReadinessState.MISSING,
                summary = "Identity not ready",
                issues = listOf("identity_not_ready")
            ),
            connectorReadiness = ConnectorReadinessPayload(
                state = DependencyReadinessState.MISSING,
                connectorLabel = "Approved pilot connector path",
                summary = "Connector not ready",
                issues = listOf("connector_not_ready")
            ),
            vaultReadiness = VaultReadinessPayload(
                state = DependencyReadinessState.MISSING,
                summary = "Vault / credential path not ready",
                issues = listOf("vault_not_ready")
            ),
            connectorActivation = PilotConnectorActivationPayload(
                state = PilotConnectorActivationState.BLOCKED,
                connectorId = "pilot_https_webhook",
                summary = "Connector activation is blocked until real pilot binding and access exist.",
                source = "LOCAL_SYNTHETIC"
            ),
            activationReady = false,
            activationReadySummary = "Pilot activation is blocked by environment binding and actor readiness.",
            isDemoData = false,
            isPilotEvidence = false
        )
        val shellSummary = ProductShellSummaryPayload(
            environmentActivation = environmentActivation,
            requesterInboxItems = listOf(
                RequesterInboxItemPayload(
                    taskId = "live_task_1",
                    traceId = "trace_live_1",
                    title = "Live task",
                    status = ResponseStatus.WAITING_USER,
                    group = RequesterInboxGroup.WAITING,
                    summary = "Waiting for operator access",
                    blockerSummary = "Missing operator access",
                    updatedAtMs = 1700004444L,
                    workspaceBindingKind = WorkspaceBindingKind.UNBOUND,
                    environmentKind = EnvironmentKind.SIMULATOR,
                    isDemoData = false,
                    isPilotEvidence = false
                )
            ),
            demoRequesterInboxItems = listOf(
                RequesterInboxItemPayload(
                    taskId = "demo_task_1",
                    traceId = "trace_demo_1",
                    title = "Demo task",
                    status = ResponseStatus.COMMITTED,
                    group = RequesterInboxGroup.COMPLETED,
                    summary = "Demo CRM-ready draft completed",
                    receiptSummary = "Verified (demo)",
                    updatedAtMs = 1700005555L,
                    workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                    environmentKind = EnvironmentKind.DEMO,
                    isDemoData = true,
                    isPilotEvidence = false
                )
            ),
            localRoleLab = LocalRoleLabSummaryPayload(
                enabled = true,
                label = "Local role lab",
                summary = "One human can rehearse requester, operator, and tenant-admin collaboration locally.",
                activeActorId = "local_tenant_admin_01",
                activeRole = ActorRole.TENANT_ADMIN,
                dayZeroBlockedSummary = "True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.",
                actors = listOf(
                    LocalRoleLabActorPayload(
                        actorId = "local_requester_01",
                        role = ActorRole.REQUESTER,
                        actorLabel = "Local Requester",
                        sessionId = "lab_sess_requester_01",
                        summary = "Requester rehearsal view"
                    ),
                    LocalRoleLabActorPayload(
                        actorId = "local_tenant_admin_01",
                        role = ActorRole.TENANT_ADMIN,
                        actorLabel = "Local Tenant Admin",
                        sessionId = "lab_sess_tenant_admin_01",
                        summary = "Admin rehearsal view",
                        isActive = true
                    )
                )
            ),
            tenantAdminActivation = TenantAdminActivationSummaryPayload(
                status = DependencyReadinessState.BLOCKED,
                title = "Tenant Admin Setup / Activation",
                summary = "Environment is not ready for pilot activation.",
                detailLines = listOf("Missing operator access", "Missing tenant-admin touchpoint"),
                missingDependencyCodes = listOf("operator_access_missing", "tenant_admin_touchpoint_missing"),
                actorAvailability = environmentActivation.actorAvailability,
                identityReadiness = environmentActivation.identityReadiness,
                connectorReadiness = environmentActivation.connectorReadiness,
                vaultReadiness = environmentActivation.vaultReadiness,
                isDemoData = false,
                isPilotEvidence = false
            ),
            policyStudioSummary = PolicyStudioSummaryPayload(
                packName = "Agent OS Policy Pack",
                packVersion = "runtime-v1",
                packFingerprint = "android-host-local",
                overrideCount = 0,
                summary = "Policy Studio v1 exposes the current role policy editor.",
                rolloutSummary = "Read-only rollout summary.",
                simulationSummary = "Read-only simulation summary.",
                approvalGovernanceSummary = "Approval governance remains enforced by runtime receipts.",
                detailLines = listOf("Policy pack: Agent OS runtime policy"),
                isDemoData = false,
                isPilotEvidence = false
            ),
            activationPackage = PilotActivationPackageSummaryPayload(
                packageId = "android_host_activation_package",
                status = PilotActivationPackageStatus.IN_PROGRESS,
                ownerType = PilotActivationOwnerType.PILOT_COMMANDER,
                ownerLabel = "Pilot commander",
                summary = "External activation package is waiting on real artifacts.",
                pendingRequirementCount = 2,
                rejectedIntakeCount = 1,
                recentIntakes = listOf(
                    PilotExternalArtifactIntakePayload(
                        intakeId = "intake_1",
                        artifactKind = PilotExternalArtifactKind.ACTOR_READINESS,
                        source = "LOCAL_SYNTHETIC",
                        summary = "Operator access package placeholder",
                        verificationStatus = PilotExternalArtifactVerificationStatus.RECEIVED
                    )
                )
            ),
            activationChecklist = listOf(
                PilotActivationChecklistItemPayload(
                    itemId = "operator_actor",
                    code = "operator_actor",
                    title = "Operator access ready",
                    ownerType = PilotActivationOwnerType.OPERATOR_OWNER,
                    ownerLabel = "Pilot operator lead",
                    state = DependencyReadinessState.MISSING,
                    requirementStatus = PilotActivationRequirementStatus.RECEIVED,
                    packageId = "android_host_activation_package",
                    missingArtifact = "Supported operator access package",
                    nextAction = "Register operator readiness using a real pilot credential.",
                    actorRole = ActorRole.OPERATOR,
                    linkedIntakeIds = listOf("intake_1")
                )
            ),
            remainingBlockers = listOf(
                PilotActivationBlockerSummaryPayload(
                    code = "operator_actor",
                    ownerType = PilotActivationOwnerType.OPERATOR_OWNER,
                    ownerLabel = "Pilot operator lead",
                    summary = "Operator access ready",
                    missingArtifact = "Supported operator access package",
                    nextAction = "Register operator readiness using a real pilot credential."
                )
            ),
            evidenceCategories = listOf(
                PilotEvidenceCategoryStatusPayload(
                    category = PilotEvidenceCategory.DEVICE_SESSION_PROOF,
                    state = DependencyReadinessState.MISSING,
                    summary = "No accepted real pilot evidence yet."
                )
            ),
            nextAction = "Register operator readiness using a real pilot credential."
        )
        val response = AgentResponse(
            type = AgentResponseType.CARDS,
            summary = "Enterprise shell snapshot",
            traceId = "trace-shell-1",
            latencyMs = 12L,
            confidence = 1.0,
            status = ResponseStatus.WAITING_USER,
            payload = ModulePayload.SettingsPayload(
                cloudBaseUrl = "https://lumi-agent-simulator.vercel.app",
                environmentActivation = environmentActivation,
                tenantAdminActivationSummary = shellSummary.tenantAdminActivation,
                productShellSummary = shellSummary
            )
        )

        val encoded = DomainJson.encode(response)
        val decoded = DomainJson.decode<AgentResponse>(encoded)
        val payload = decoded.payload as ModulePayload.SettingsPayload

        assertEquals(EnvironmentKind.SIMULATOR, payload.environmentActivation?.environmentKind)
        assertEquals(PilotActivationStatus.PILOT_BLOCKED, payload.environmentActivation?.pilotActivationStatus)
        assertEquals(PilotEnvironmentBindingState.BLOCKED, payload.environmentActivation?.environmentBinding?.state)
        assertEquals(PilotConnectorActivationState.BLOCKED, payload.environmentActivation?.connectorActivation?.state)
        assertEquals(false, payload.environmentActivation?.activationReady)
        assertTrue(payload.productShellSummary?.demoRequesterInboxItems?.firstOrNull()?.isDemoData == true)
        assertTrue(payload.productShellSummary?.demoRequesterInboxItems?.firstOrNull()?.isPilotEvidence == false)
        assertEquals("local_tenant_admin_01", payload.productShellSummary?.localRoleLab?.activeActorId)
        assertEquals(ActorRole.TENANT_ADMIN, payload.productShellSummary?.localRoleLab?.activeRole)
        assertEquals("Tenant Admin Setup / Activation", payload.tenantAdminActivationSummary?.title)
        assertEquals(PilotActivationPackageStatus.IN_PROGRESS, payload.productShellSummary?.activationPackage?.status)
        assertEquals("operator_actor", payload.productShellSummary?.activationChecklist?.firstOrNull()?.code)
        assertEquals(PilotActivationRequirementStatus.RECEIVED, payload.productShellSummary?.activationChecklist?.firstOrNull()?.requirementStatus)
        assertEquals(PilotEvidenceCategory.DEVICE_SESSION_PROOF, payload.productShellSummary?.evidenceCategories?.firstOrNull()?.category)
    }

    @Test
    fun encodeDecode_operatorCollaborationAndRoutingRoundTrip() {
        val record = ExecutionReceiptRecord(
            recordId = "ledger_m10_1",
            runId = "run_m10_1",
            userId = "local-user",
            sessionId = "session_m10_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            collaborationState = GovernanceCaseCollaborationState(
                runId = "run_m10_1",
                status = OperatorCollaborationStatus.FOLLOW_UP_PENDING,
                claimStatus = OperatorCaseClaimStatus.CLAIMED,
                claimedBy = OperatorAssigneeRef(
                    userId = "local-user",
                    displayName = "Local Operator"
                ),
                assignedTo = OperatorAssigneeRef(
                    userId = "ops_triage",
                    displayName = "Ops Triage"
                ),
                followUp = GovernanceCaseFollowUpState(
                    requested = true,
                    summary = "Provider confirmation still pending.",
                    ackPending = true
                ),
                notes = listOf(
                    GovernanceCaseNoteRecord(
                        noteId = "note_1",
                        actor = OperatorAssigneeRef(
                            userId = "local-user",
                            displayName = "Local Operator"
                        ),
                        note = "Escalated to remote queue.",
                        createdAtMs = 2000L
                    )
                ),
                version = 3,
                updatedAtMs = 2100L
            ),
            remoteOperatorHandoff = RemoteOperatorHandoffRecord(
                recordId = "handoff_record_1",
                runId = "run_m10_1",
                status = RemoteOperatorHandoffStatus.ACK_PENDING,
                dedupeKey = "handoff:run_m10_1:3:remote_operator_stub",
                request = RemoteOperatorHandoffRequest(
                    requestId = "handoff_req_1",
                    runId = "run_m10_1",
                    caseStateVersion = 3,
                    target = "remote_operator_stub",
                    summary = "Escalate provider dispute follow-up.",
                    requestedBy = OperatorAssigneeRef(
                        userId = "local-user",
                        displayName = "Local Operator"
                    ),
                    dedupeKey = "handoff:run_m10_1:3:remote_operator_stub",
                    requestedAtMs = 2000L
                ),
                attempts = listOf(
                    RemoteOperatorHandoffAttempt(
                        attemptId = "handoff_attempt_1",
                        status = RemoteOperatorHandoffStatus.ACK_PENDING,
                        dedupeKey = "handoff:run_m10_1:3:remote_operator_stub",
                        summary = "Remote handoff accepted and waiting manual acknowledgement.",
                        timestampMs = 2000L
                    )
                ),
                lastAttemptAtMs = 2000L
            ),
            alertRoutingRecords = listOf(
                AlertRoutingRecord(
                    recordId = "alert_record_1",
                    runId = "run_m10_1",
                    alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    status = AlertRoutingStatus.QUEUED,
                    dedupeKey = "alert_route:run_m10_1:GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    targets = listOf(
                        AlertRoutingTarget(
                            targetId = "webhook_stub_ops",
                            label = "Webhook Stub",
                            targetType = AlertRoutingTargetType.WEBHOOK_STUB,
                            endpointHint = "stub://webhook"
                        )
                    ),
                    attempts = listOf(
                        AlertRoutingAttempt(
                            attemptId = "alert_attempt_1",
                            targetId = "webhook_stub_ops",
                            targetType = AlertRoutingTargetType.WEBHOOK_STUB,
                            status = AlertRoutingStatus.QUEUED,
                            dedupeKey = "alert_route:run_m10_1:GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP:webhook_stub",
                            summary = "Alert routing queued in local durable pipeline.",
                            timestampMs = 2000L
                        )
                    ),
                    lastAttemptAtMs = 2000L
                )
            ),
            receipt = ExecutionReceipt(
                runId = "run_m10_1",
                intentSummary = "Resolve provider dispute and sync mismatch.",
                status = ResponseStatus.DISPUTED,
                activeRole = UserRole.BUYER,
                roleSource = RoleSource.EXPLICIT_USER_SELECTION,
                delegationMode = DelegationMode.SUPERVISED,
                roleImpactReasonCodes = listOf(
                    RoleReasonCodes.ROLE_OPERATOR_FOLLOW_UP_REQUESTED,
                    RoleReasonCodes.ROLE_REMOTE_OPERATOR_HANDOFF_ACK_PENDING
                ),
                roleImpactSummary = "Operator follow-up requested with remote handoff pending acknowledgement.",
                approvalSummary = "Approval already completed.",
                dataScopeSummary = "Provider-facing data scope remained reduced.",
                providerSummary = "Provider response pending.",
                quoteSummary = "No new quote required.",
                verificationSummary = "Verification failed; dispute path active.",
                proofSummary = "Proof links recorded for dispute review.",
                rollbackSummary = "Rollback available after dispute review.",
                startedAt = 1000L,
                updatedAt = 2100L,
                completedAt = 2100L,
                remoteOperatorHandoffSummary = RemoteOperatorHandoffSummary(
                    status = RemoteOperatorHandoffStatus.ACK_PENDING,
                    summary = "Remote handoff is waiting manual acknowledgement.",
                    ackRequired = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_OPERATOR_HANDOFF_ACK_PENDING),
                    lastUpdatedAtMs = 2100L
                ),
                alertRoutingSummary = AlertRoutingSummary(
                    status = AlertRoutingStatus.QUEUED,
                    summary = "Alert routing queued (pending 1, delivered 0, failed 0).",
                    pendingTargets = 1,
                    deliveredTargets = 0,
                    failedTargets = 0,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_ALERT_ROUTING_QUEUED),
                    lastUpdatedAtMs = 2100L
                )
            ),
            createdAtMs = 1000L,
            updatedAtMs = 2100L
        )

        val encoded = DomainJson.encode(record)
        val decoded = DomainJson.decode<ExecutionReceiptRecord>(encoded)

        assertEquals(OperatorCollaborationStatus.FOLLOW_UP_PENDING, decoded.collaborationState?.status)
        assertEquals("Ops Triage", decoded.collaborationState?.assignedTo?.displayName)
        assertEquals(RemoteOperatorHandoffStatus.ACK_PENDING, decoded.remoteOperatorHandoff?.status)
        assertEquals(1, decoded.alertRoutingRecords.size)
        assertEquals(AlertRoutingStatus.QUEUED, decoded.alertRoutingRecords.first().status)
        assertEquals(RemoteOperatorHandoffStatus.ACK_PENDING, decoded.receipt?.remoteOperatorHandoffSummary?.status)
        assertEquals(AlertRoutingStatus.QUEUED, decoded.receipt?.alertRoutingSummary?.status)
    }

    @Test
    fun encodeDecode_rolePolicyEditorContractsRoundTrip() {
        val editorState = RolePolicyEditorState(
            role = UserRole.WORK,
            effectivePolicy = RolePolicyProfile(
                role = UserRole.WORK,
                preferences = RoleScopedPreferences(
                    riskToleranceDefault = "medium",
                    maxCostPerStepDefault = "mid",
                    trustedProviderTags = listOf("verified"),
                    blockedProviderTags = listOf("unknown"),
                    externalFulfillmentAllowed = true,
                    externalFulfillmentPreference = ExternalFulfillmentPreference.BALANCED
                ),
                approvalPolicy = RoleScopedApprovalPolicy(
                    delegationMode = DelegationMode.SUPERVISED,
                    requiresExplicitConfirmationForHighRisk = true,
                    requiresConfirmationTokenForExternalSpend = true,
                    autoApprovalBudgetLimit = 300.0,
                    maxExternalBudget = 3_000.0
                ),
                dataPolicy = RoleScopedDataPolicy(
                    sharingMode = "local_first_scoped_cloud",
                    allowedScopes = listOf("task_metadata"),
                    cloudSyncAllowed = true
                ),
                delegationPolicy = RoleScopedDelegationPolicy(mode = DelegationMode.SUPERVISED)
            ),
            editableFields = EditableRolePolicyFields(
                cloudSyncAllowance = true,
                externalFulfillment = true
            ),
            protectedFields = ProtectedRolePolicyFields(
                items = listOf(
                    ProtectedRolePolicyField(
                        key = "requiresExplicitConfirmationForHighRisk",
                        reason = "Protected safety rule"
                    )
                )
            ),
            lastUpdatedAtMs = 456L
        )
        val payload = ModulePayload.AvatarPayload(
            profileLabel = "Policy test",
            rolePolicyProfile = editorState.effectivePolicy,
            rolePolicyEditor = editorState
        )
        val encoded = DomainJson.encode(payload)
        val decoded = DomainJson.decode<ModulePayload.AvatarPayload>(encoded)

        assertEquals(UserRole.WORK, decoded.rolePolicyEditor?.role)
        assertEquals("unknown", decoded.rolePolicyEditor?.effectivePolicy?.preferences?.blockedProviderTags?.firstOrNull())
        assertEquals(1, decoded.rolePolicyEditor?.protectedFields?.items?.size)
    }

    @Test
    fun encodeDecode_rolePolicyDraftAndUpdateResultRoundTrip() {
        val draft = RolePolicyDraft(
            delegationMode = DelegationMode.AUTONOMOUS_WITHIN_POLICY,
            requiresExplicitConfirmationForHighRisk = true,
            requiresConfirmationTokenForExternalSpend = false,
            autoApprovalBudgetLimit = 450.0,
            maxExternalBudget = 2_000.0,
            sharingMode = "local_first_scoped_cloud",
            allowedScopes = listOf("task_metadata", "approved_artifacts"),
            cloudSyncAllowed = true,
            trustedProviderTags = listOf("verified", "rollback_supported"),
            blockedProviderTags = listOf("unknown"),
            riskToleranceDefault = "low",
            maxCostPerStepDefault = "mid",
            externalFulfillmentAllowed = true,
            externalFulfillmentPreference = ExternalFulfillmentPreference.EXTERNAL_PREFERRED
        )
        val result = RolePolicyUpdateResult(
            saved = true,
            role = UserRole.BUYER,
            effectivePolicy = RolePolicyProfile(role = UserRole.BUYER),
            validation = RolePolicyValidationResult(
                valid = true,
                issues = emptyList(),
                previewLines = listOf("Delegation default: autonomous within policy.")
            ),
            lastUpdatedAtMs = 900L
        )

        val encodedDraft = DomainJson.encode(draft)
        val decodedDraft = DomainJson.decode<RolePolicyDraft>(encodedDraft)
        assertEquals(DelegationMode.AUTONOMOUS_WITHIN_POLICY, decodedDraft.delegationMode)
        assertEquals(ExternalFulfillmentPreference.EXTERNAL_PREFERRED, decodedDraft.externalFulfillmentPreference)
        assertEquals(2, decodedDraft.allowedScopes?.size)

        val encodedResult = DomainJson.encode(result)
        val decodedResult = DomainJson.decode<RolePolicyUpdateResult>(encodedResult)
        assertTrue(decodedResult.saved)
        assertEquals(UserRole.BUYER, decodedResult.role)
        assertEquals(1, decodedResult.validation.previewLines.size)
    }

    @Test
    fun encodeDecode_executionReceiptRecordWithPolicySnapshotRoundTrip() {
        val snapshot = RolePolicySnapshot(
            snapshotId = "policy_trace123",
            policyVersion = "role_policy_v2",
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            overrideSource = "user_role_policy_override",
            hardConstraintOverrides = listOf("budget", "deadline"),
            boundAtMs = 1700000000L
        )
        val receipt = ExecutionReceipt(
            runId = "trace123",
            intentSummary = "Execute with policy snapshot binding",
            status = ResponseStatus.COMMITTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_USER_OVERRIDE_APPLIED,
                RoleReasonCodes.ROLE_APPROVAL_REQUIRED
            ),
            roleImpactSummary = "Policy override applied.",
            approvalSummary = "Approval requirement was satisfied for this run.",
            dataScopeSummary = "Data sharing scope was reduced by role policy.",
            providerSummary = "Provider selected: trusted-provider.",
            quoteSummary = "Quote comparison selected trusted-provider (granted).",
            verificationSummary = "Verification passed.",
            proofSummary = "Proof is available via 1 reference link.",
            rollbackSummary = "Rollback remains available if disputes are raised.",
            policySnapshotId = snapshot.snapshotId,
            policySnapshotVersion = snapshot.policyVersion,
            constraintPrecedenceSummary = "Explicit task constraints overrode role defaults for: budget, deadline.",
            startedAt = 1700000000L,
            updatedAt = 1700000500L,
            completedAt = 1700000500L,
            events = listOf(
                ExecutionReceiptEvent(
                    type = ExecutionReceiptEventType.ROLE_POLICY_SNAPSHOT_BOUND,
                    title = "Policy snapshot bound",
                    detail = "Snapshot bound.",
                    timestampMs = 1700000000L
                )
            )
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_trace123",
            runId = "trace123",
            userId = "u-ledger",
            sessionId = "s-ledger",
            module = ModuleId.CHAT,
            status = ResponseStatus.COMMITTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            snapshotBinding = ReceiptSnapshotBinding(
                snapshotId = snapshot.snapshotId,
                runId = "trace123",
                snapshotVersion = snapshot.policyVersion,
                boundAtMs = 1700000000L
            ),
            policySnapshot = snapshot,
            receipt = receipt,
            runEvents = listOf(
                RunEventRecord(
                    eventId = "trace123:policy_snapshot_bound",
                    type = ProofLedgerEventType.ROLE_POLICY_SNAPSHOT_BOUND,
                    title = "Policy snapshot bound",
                    detail = "Snapshot bound.",
                    timestampMs = 1700000000L
                )
            ),
            providerDecisions = listOf(
                ProviderDecisionRecord(
                    providerId = "trusted-provider",
                    providerName = "Trusted Provider",
                    decision = ProviderDecisionStatus.SELECTED,
                    readableReason = "Selected by role-aware fit.",
                    recordedAtMs = 1700000100L
                )
            ),
            verificationRecord = VerificationRecord(
                runId = "trace123",
                status = "passed",
                passed = true,
                summary = "Verification passed.",
                recordedAtMs = 1700000200L
            ),
            settlementRecord = SettlementRecord(
                runId = "trace123",
                status = SettlementStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Settlement is authoritative locally; remote acknowledgement is pending.",
                selectedProviderId = "trusted-provider",
                selectedProviderName = "Trusted Provider",
                attempts = listOf(
                    SettlementAttempt(
                        attemptId = "attempt_1",
                        action = "committed",
                        idempotencyKey = "trace123:committed",
                        status = SettlementStatus.COMMITTED,
                        detail = "Settlement committed locally.",
                        timestampMs = 1700000210L
                    )
                ),
                providerAcks = listOf(
                    ProviderAckRecord(
                        ackId = "ack_1",
                        providerId = "trusted-provider",
                        providerName = "Trusted Provider",
                        callbackId = "provider-callback-1",
                        status = ProviderAckStatus.PENDING,
                        detail = "Awaiting provider ack.",
                        ackAtMs = 1700000215L
                    )
                ),
                reconciliation = MarketplaceReconciliationSummary(
                    result = SettlementReconciliationResult.RETRY_SCHEDULED,
                    syncState = SettlementSyncState.SYNC_PENDING,
                    summary = "Reconciliation retry is scheduled while local state remains authoritative.",
                    mismatchDetected = false,
                    retryScheduled = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_RETRY),
                    lastCheckedAtMs = 1700000216L
                ),
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_SETTLEMENT_SYNC_PENDING),
                recordedAtMs = 1700000220L
            ),
            rollbackRecord = RollbackRecord(
                runId = "trace123",
                available = true,
                triggered = false,
                summary = "Rollback available.",
                recordedAtMs = 1700000300L
            ),
            rollbackAttempts = listOf(
                RollbackAttemptRecord(
                    attemptId = "rollback_attempt_1",
                    outcome = RollbackOutcome.REQUESTED,
                    summary = "Rollback requested and awaiting remote acknowledgement.",
                    remoteSyncPending = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_ROLLBACK_AVAILABLE),
                    timestampMs = 1700000310L
                )
            ),
            disputeRecord = DisputeRecord(
                runId = "trace123",
                opened = false,
                summary = "No dispute.",
                syncState = "not_required",
                recordedAtMs = 1700000400L
            ),
            disputeCaseRecord = DisputeCaseRecord(
                runId = "trace123",
                caseId = "",
                status = DisputeStatus.NOT_OPEN,
                summary = "No dispute.",
                issueType = null,
                reasonCodes = emptyList(),
                events = emptyList(),
                updatedAtMs = 1700000400L
            ),
            reconciliationSummary = MarketplaceReconciliationSummary(
                result = SettlementReconciliationResult.RETRY_SCHEDULED,
                syncState = SettlementSyncState.SYNC_PENDING,
                summary = "Reconciliation retry is scheduled while local state remains authoritative.",
                mismatchDetected = false,
                retryScheduled = true,
                reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_RECONCILIATION_RETRY),
                lastCheckedAtMs = 1700000410L
            ),
            syncIssues = listOf(
                MarketplaceSyncIssue(
                    issueId = "sync_issue_1",
                    providerId = "trusted-provider",
                    issueType = "sync_pending",
                    summary = "Gateway acknowledgement is pending while local state remains authoritative.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_EXTERNAL_SETTLEMENT_SYNC_PENDING),
                    detectedAtMs = 1700000415L
                )
            ),
            legacySummary = "Committed run",
            createdAtMs = 1700000000L,
            updatedAtMs = 1700000500L
        )
        val encoded = DomainJson.encode(record)
        val decoded = DomainJson.decode<ExecutionReceiptRecord>(encoded)

        assertEquals("trace123", decoded.runId)
        assertEquals("policy_trace123", decoded.policySnapshot?.snapshotId)
        assertEquals("role_policy_v2", decoded.receipt?.policySnapshotVersion)
        assertEquals(
            "Explicit task constraints overrode role defaults for: budget, deadline.",
            decoded.receipt?.constraintPrecedenceSummary
        )
        assertEquals(ProofLedgerEventType.ROLE_POLICY_SNAPSHOT_BOUND, decoded.runEvents.first().type)
        assertEquals(SettlementStatus.SYNC_PENDING, decoded.settlementRecord?.status)
        assertEquals(1, decoded.rollbackAttempts.size)
        assertEquals(SettlementReconciliationResult.RETRY_SCHEDULED, decoded.reconciliationSummary?.result)
        assertEquals(1, decoded.syncIssues.size)
    }

    @Test
    fun encodeDecode_governanceSummaryWithQueryAndBuckets_roundTrip() {
        val summary = GovernanceSummary(
            query = GovernanceQuery(
                windowDays = 7,
                role = UserRole.WORK,
                providerId = "trusted-provider",
                policySnapshotVersion = "role_policy_v2",
                outcomeStatus = ResponseStatus.DISPUTED,
                reasonFamily = GovernanceReasonFamily.PROVIDER_POLICY,
                includeLegacyWithoutReceipt = true,
                limit = 120
            ),
            generatedAtMs = 1700001111L,
            window = GovernanceAggregationWindow(
                startAtMs = 1700000000L,
                endAtMs = 1700001111L,
                windowDays = 7
            ),
            totalRecords = 24,
            matchedRecords = 12,
            receiptBackedRecords = 11,
            snapshotBoundRecords = 10,
            metricValues = listOf(
                GovernanceMetricValue(
                    key = GovernanceMetricKey.APPROVAL_REQUIRED_RATE_BY_ROLE,
                    numerator = 6,
                    denominator = 12,
                    rate = 0.5,
                    dimension = "role",
                    value = "work"
                ),
                GovernanceMetricValue(
                    key = GovernanceMetricKey.RECEIPT_TRACEABILITY_COVERAGE,
                    numerator = 11,
                    denominator = 12,
                    rate = 0.916
                )
            ),
            byRole = listOf(
                GovernanceBucketSummary(
                    bucket = "work",
                    runCount = 8,
                    approvalRequiredCount = 5,
                    approvalDeniedCount = 2,
                    externalAttemptCount = 6,
                    providerSelectedCount = 4,
                    providerDeniedCount = 2,
                    dataScopeBlockedCount = 1,
                    verificationFailedCount = 2,
                    rollbackTriggeredCount = 1,
                    disputeOpenedCount = 1
                )
            ),
            byProvider = listOf(
                GovernanceBucketSummary(
                    bucket = "trusted-provider",
                    runCount = 6,
                    providerSelectedCount = 5,
                    providerDeniedCount = 1
                )
            ),
            byPolicySnapshotVersion = listOf(
                GovernanceBucketSummary(
                    bucket = "role_policy_v2",
                    runCount = 10
                )
            ),
            byOutcomeStatus = listOf(
                GovernanceBucketSummary(
                    bucket = "disputed",
                    runCount = 3
                )
            ),
            byReasonFamily = listOf(
                GovernanceBucketSummary(
                    bucket = "provider_policy",
                    runCount = 7
                )
            ),
            notes = listOf("Legacy fallback records included.")
        )

        val encoded = DomainJson.encode(summary)
        val decoded = DomainJson.decode<GovernanceSummary>(encoded)

        assertEquals(UserRole.WORK, decoded.query.role)
        assertEquals(GovernanceReasonFamily.PROVIDER_POLICY, decoded.query.reasonFamily)
        assertEquals(24, decoded.totalRecords)
        assertEquals(2, decoded.metricValues.size)
        assertEquals(
            GovernanceMetricKey.RECEIPT_TRACEABILITY_COVERAGE,
            decoded.metricValues.last().key
        )
        assertEquals("trusted-provider", decoded.byProvider.first().bucket)
        assertEquals("Legacy fallback records included.", decoded.notes.first())
    }

    @Test
    fun encodeDecode_ledgerQueryFilterWithSettlementFields_roundTrip() {
        val filter = LedgerQueryFilter(
            role = UserRole.BUYER,
            providerId = "trusted-provider",
            settlementStatus = SettlementStatus.SYNC_PENDING,
            disputeStatus = DisputeStatus.SYNC_PENDING,
            syncState = SettlementSyncState.SYNC_PENDING,
            unresolvedOnly = true,
            syncPendingOnly = true,
            providerIssueOnly = true,
            limit = 15
        )

        val encoded = DomainJson.encode(filter)
        val decoded = DomainJson.decode<LedgerQueryFilter>(encoded)

        assertEquals(SettlementStatus.SYNC_PENDING, decoded.settlementStatus)
        assertEquals(DisputeStatus.SYNC_PENDING, decoded.disputeStatus)
        assertEquals(SettlementSyncState.SYNC_PENDING, decoded.syncState)
        assertTrue(decoded.unresolvedOnly)
        assertTrue(decoded.syncPendingOnly)
        assertTrue(decoded.providerIssueOnly)
    }

    @Test
    fun encodeDecode_governanceConsoleStateWithTypedCases_roundTrip() {
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_run123",
                runId = "run123",
                recordId = "record123",
                module = ModuleId.LIX,
                status = ResponseStatus.DISPUTED,
                priority = GovernanceCasePriority.HIGH,
                primaryQueue = GovernanceQueueType.DISPUTE_FOLLOW_UP,
                queueTags = listOf(GovernanceQueueType.DISPUTE_FOLLOW_UP, GovernanceQueueType.SYNC_PENDING),
                title = "Dispute pending provider acknowledgement",
                summary = "Local dispute is open while provider sync is still pending.",
                activeRole = UserRole.BUYER,
                providerLabel = "provider_sync",
                settlementStatus = SettlementStatus.SYNC_PENDING,
                disputeStatus = DisputeStatus.SYNC_PENDING,
                syncState = SettlementSyncState.SYNC_PENDING,
                policySnapshotVersion = "role_policy_v2",
                reasonFamilies = listOf(
                    GovernanceReasonFamily.ROLLBACK_DISPUTE,
                    GovernanceReasonFamily.SETTLEMENT_RECONCILIATION
                ),
                lastEventAtMs = 1700001234L,
                reviewed = false,
                nextActionSummary = "Retry sync intent and monitor acknowledgement."
            ),
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            policySnapshotId = "snapshot_run123",
            approvalSummary = "Approval denied pending manual override.",
            dataScopeSummary = "Data scope reduced for provider safety policy.",
            providerSummary = "Provider sync selected then blocked by dispute.",
            verificationSummary = "Verification failed due missing proof token.",
            proofSummary = "Proof artifact missing.",
            rollbackSummary = "Rollback failed because provider rejected rollback.",
            settlementSummary = "Settlement sync pending.",
            disputeSummary = "Dispute opened locally; sync pending.",
            reconciliationSummary = "Operator requested sync retry.",
            syncIssueSummaries = listOf("Provider acknowledgement timeout."),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_EXTERNAL_DISPUTE_SYNC_PENDING,
                RoleReasonCodes.ROLE_EXTERNAL_PROVIDER_ACK_TIMEOUT
            ),
            alerts = listOf(
                GovernanceAlert(
                    code = "GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                    severity = GovernanceAlertSeverity.HIGH,
                    title = "Dispute sync pending",
                    summary = "Dispute is open while acknowledgement is pending.",
                    count = 1,
                    relatedQueue = GovernanceQueueType.DISPUTE_FOLLOW_UP
                )
            ),
            actionSuggestions = listOf(
                GovernanceActionSuggestion(
                    action = GovernanceActionType.RETRY_SYNC_INTENT,
                    title = "Retry sync intent",
                    detail = "Record manual retry in local operator workflow.",
                    enabled = true
                )
            ),
            receiptTrailRef = "run:run123"
        )
        val console = GovernanceConsoleState(
            filter = GovernanceConsoleFilter(
                unresolvedOnly = true,
                includeReviewed = false,
                queueType = GovernanceQueueType.DISPUTE_FOLLOW_UP,
                limit = 20
            ),
            generatedAtMs = 1700009999L,
            totalRecords = 4,
            matchedCases = 1,
            reviewedCases = 0,
            highPriorityCases = 1,
            queueCounts = listOf(
                GovernanceQueueCount(
                    queue = GovernanceQueueType.DISPUTE_FOLLOW_UP,
                    count = 1,
                    highPriorityCount = 1
                )
            ),
            alerts = case.alerts,
            cases = listOf(case),
            notes = listOf("Derived from durable receipt/ledger records.")
        )

        val encoded = DomainJson.encode(console)
        val decoded = DomainJson.decode<GovernanceConsoleState>(encoded)

        assertEquals(1, decoded.cases.size)
        assertEquals("run123", decoded.cases.first().summary.runId)
        assertEquals(GovernanceCasePriority.HIGH, decoded.cases.first().summary.priority)
        assertEquals(
            GovernanceQueueType.DISPUTE_FOLLOW_UP,
            decoded.cases.first().summary.primaryQueue
        )
        assertEquals(
            GovernanceActionType.RETRY_SYNC_INTENT,
            decoded.cases.first().actionSuggestions.first().action
        )
        assertEquals(GovernanceAlertSeverity.HIGH, decoded.alerts.first().severity)
    }

    @Test
    fun encodeDecode_remotePipelineContracts_roundTrip() {
        val telemetryRecord = TelemetryEmissionRecord(
            recordId = "telemetry_record_1",
            runId = "run_remote_1",
            dedupeKey = "telemetry:run_remote_1",
            status = TelemetryDeliveryStatus.QUEUED,
            batch = GovernanceTelemetryBatch(
                batchId = "batch_1",
                dedupeKey = "telemetry:run_remote_1",
                generatedAtMs = 1700010000L,
                status = TelemetryDeliveryStatus.QUEUED,
                envelopes = listOf(
                    GovernanceTelemetryEnvelope(
                        envelopeId = "env_1",
                        runId = "run_remote_1",
                        role = UserRole.BUYER,
                        providerId = "provider_alpha",
                        policySnapshotVersion = "role_policy_v3",
                        outcomeStatus = ResponseStatus.DISPUTED,
                        reasonFamily = GovernanceReasonFamily.SETTLEMENT_RECONCILIATION,
                        reasonCodes = listOf(
                            RoleReasonCodes.ROLE_REMOTE_TELEMETRY_BATCH_QUEUED,
                            RoleReasonCodes.ROLE_REMOTE_HANDOFF_PENDING
                        ),
                        createdAtMs = 1700010000L
                    )
                ),
                attempts = listOf(
                    TelemetryDeliveryAttempt(
                        attemptId = "attempt_t1",
                        sinkTarget = TelemetrySinkTarget.LOCAL_DURABLE,
                        status = TelemetryDeliveryStatus.QUEUED,
                        dedupeKey = "telemetry:run_remote_1",
                        summary = "Queued for durable remote export.",
                        timestampMs = 1700010001L
                    )
                )
            ),
            attemptCount = 1,
            lastAttemptAtMs = 1700010001L
        )
        val alertRecord = AlertDeliveryRecord(
            recordId = "alert_record_1",
            runId = "run_remote_1",
            alertCode = "GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
            dedupeKey = "alert:run_remote_1:GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
            status = AlertDispatchStatus.QUEUED,
            request = AlertDispatchRequest(
                requestId = "alert_req_1",
                runId = "run_remote_1",
                alertCode = "GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                severity = GovernanceAlertSeverity.HIGH,
                title = "Dispute sync pending",
                summary = "Dispute is open while remote acknowledgement is pending.",
                relatedQueue = GovernanceQueueType.DISPUTE_FOLLOW_UP,
                dedupeKey = "alert:run_remote_1:GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                target = AlertDeliveryTarget(
                    targetId = "governance_console_local",
                    label = "Governance Console",
                    channel = AlertDeliveryChannel.LOCAL_CONSOLE
                ),
                createdAtMs = 1700010010L
            ),
            attempts = listOf(
                AlertDispatchAttempt(
                    attemptId = "attempt_a1",
                    status = AlertDispatchStatus.QUEUED,
                    channel = AlertDeliveryChannel.LOCAL_CONSOLE,
                    targetId = "governance_console_local",
                    dedupeKey = "alert:run_remote_1:GOVERNANCE_ALERT_DISPUTE_SYNC_PENDING",
                    summary = "Queued in local durable alert pipeline.",
                    timestampMs = 1700010011L
                )
            ),
            lastAttemptAtMs = 1700010011L
        )
        val reconciliationRecord = ReconciliationJobRecord(
            jobId = "recon_job_1",
            runId = "run_remote_1",
            type = ReconciliationJobType.UNRESOLVED_DISPUTE,
            status = ReconciliationJobStatus.HANDOFF_PENDING,
            handoffStatus = RemoteSyncHandoffStatus.HANDOFF_PENDING,
            dedupeKey = "reconciliation:run_remote_1:unresolved_dispute",
            summary = "Unresolved dispute requires remote handoff.",
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_RECONCILIATION_JOB_CREATED,
                RoleReasonCodes.ROLE_REMOTE_HANDOFF_PENDING
            ),
            retryPolicy = ReconciliationRetryPolicy(maxAttempts = 4, backoffMs = 120_000L),
            retryCount = 1,
            attempts = listOf(
                ReconciliationDispatchAttempt(
                    attemptId = "attempt_r1",
                    handoffStatus = RemoteSyncHandoffStatus.HANDOFF_PENDING,
                    dedupeKey = "reconciliation:run_remote_1:unresolved_dispute",
                    summary = "Queued for remote handoff.",
                    timestampMs = 1700010020L
                )
            ),
            nextActionSummary = "Monitor handoff acknowledgement.",
            createdAtMs = 1700010015L,
            updatedAtMs = 1700010020L
        )
        val console = GovernanceConsoleState(
            filter = GovernanceConsoleFilter(limit = 20),
            generatedAtMs = 1700010030L,
            totalRecords = 1,
            matchedCases = 1,
            queueCounts = listOf(
                GovernanceQueueCount(
                    queue = GovernanceQueueType.SYNC_PENDING,
                    count = 1,
                    highPriorityCount = 1
                )
            ),
            remotePipelineSummary = RemotePipelineSummary(
                telemetryStatus = TelemetryDeliveryStatus.QUEUED,
                telemetryPendingCount = 1,
                telemetryFailedCount = 0,
                alertStatus = AlertDispatchStatus.QUEUED,
                alertPendingCount = 1,
                alertFailedCount = 0,
                reconciliationStatus = ReconciliationJobStatus.HANDOFF_PENDING,
                handoffStatus = RemoteSyncHandoffStatus.HANDOFF_PENDING,
                reconciliationOpenCount = 1,
                handoffPendingCount = 1,
                handoffFailedCount = 0,
                lastUpdatedAtMs = 1700010020L,
                summary = "Telemetry and alert are queued; reconciliation handoff is pending."
            ),
            remoteDeliveryIssues = listOf(
                RemoteDeliveryIssue(
                    code = "REMOTE_RECONCILIATION_PENDING",
                    severity = GovernanceAlertSeverity.WARNING,
                    title = "Reconciliation handoff issue",
                    summary = "Remote handoff is pending.",
                    relatedRunId = "run_remote_1",
                    lastOccurredAtMs = 1700010020L
                )
            )
        )

        val encodedTelemetry = DomainJson.encode(telemetryRecord)
        val decodedTelemetry = DomainJson.decode<TelemetryEmissionRecord>(encodedTelemetry)
        assertEquals(TelemetryDeliveryStatus.QUEUED, decodedTelemetry.status)
        assertEquals("run_remote_1", decodedTelemetry.runId)
        assertEquals(1, decodedTelemetry.batch.envelopes.size)

        val encodedAlert = DomainJson.encode(alertRecord)
        val decodedAlert = DomainJson.decode<AlertDeliveryRecord>(encodedAlert)
        assertEquals(AlertDispatchStatus.QUEUED, decodedAlert.status)
        assertEquals("alert_req_1", decodedAlert.request.requestId)

        val encodedReconciliation = DomainJson.encode(reconciliationRecord)
        val decodedReconciliation = DomainJson.decode<ReconciliationJobRecord>(encodedReconciliation)
        assertEquals(ReconciliationJobStatus.HANDOFF_PENDING, decodedReconciliation.status)
        assertEquals(RemoteSyncHandoffStatus.HANDOFF_PENDING, decodedReconciliation.handoffStatus)

        val encodedConsole = DomainJson.encode(console)
        val decodedConsole = DomainJson.decode<GovernanceConsoleState>(encodedConsole)
        assertEquals(TelemetryDeliveryStatus.QUEUED, decodedConsole.remotePipelineSummary?.telemetryStatus)
        assertEquals(1, decodedConsole.remoteDeliveryIssues.size)
    }

    @Test
    fun decodeLegacyResponseWithoutRoleMetadata_defaultsRemainCompatible() {
        val legacyJson = """
            {
              "type":"cards",
              "summary":"legacy payload",
              "traceId":"legacy-trace",
              "latencyMs":10,
              "confidence":0.5,
              "module":"chat",
              "payload":{"type":"none"},
              "actions":[],
              "status":"success"
            }
        """.trimIndent()
        val decoded = DomainJson.decode<AgentResponse>(legacyJson)
        assertNull(decoded.activeRole)
        assertNull(decoded.roleSource)
        assertNull(decoded.roleChangeReason)
        assertTrue(decoded.roleImpactReasonCodes.isEmpty())
        assertNull(decoded.executionReceipt)
    }

    @Test
    fun encodeDecode_m11OperatorAuthAssignmentAndConnectorContractsRoundTrip() {
        val command = GovernanceCollaborationCommand(
            commandType = GovernanceActionType.ESCALATE_CASE,
            actorUserId = "ops_admin",
            actorDisplayName = "Ops Admin",
            operatorIdentity = OperatorIdentity(
                userId = "ops_admin",
                displayName = "Ops Admin",
                role = OperatorRole.ADMIN,
                permissions = OperatorPermission.entries,
                scope = PermissionScope.ANY_CASE
            ),
            assignee = OperatorAssigneeRef(
                userId = "ops_triage",
                displayName = "Ops Triage"
            ),
            escalationTarget = "tier2_dispute",
            followUpSummary = "Escalate for provider mismatch review.",
            connectorTargets = listOf(
                AlertRoutingTargetType.SLACK_STUB,
                AlertRoutingTargetType.JIRA_STUB,
                AlertRoutingTargetType.ZENDESK_STUB,
                AlertRoutingTargetType.CRM_STUB,
                AlertRoutingTargetType.GENERIC_WEBHOOK
            ),
            timestampMs = 1700011111L
        )
        val collaborationState = GovernanceCaseCollaborationState(
            runId = "run_m11_1",
            status = OperatorCollaborationStatus.FOLLOW_UP_PENDING,
            claimStatus = OperatorCaseClaimStatus.CLAIMED,
            claimedBy = OperatorAssigneeRef(
                userId = "ops_admin",
                displayName = "Ops Admin"
            ),
            assignedTo = OperatorAssigneeRef(
                userId = "ops_triage",
                displayName = "Ops Triage"
            ),
            operatorSession = OperatorSessionSummary(
                identity = command.operatorIdentity!!,
                authenticated = true,
                source = "local-user",
                issuedAtMs = 1700011111L
            ),
            assignment = GovernanceCaseAssignment(
                runId = "run_m11_1",
                claimedBy = OperatorAssigneeRef(
                    userId = "ops_admin",
                    displayName = "Ops Admin"
                ),
                assignedTo = OperatorAssigneeRef(
                    userId = "ops_triage",
                    displayName = "Ops Triage"
                ),
                claimStatus = OperatorCaseClaimStatus.CLAIMED,
                escalated = true,
                escalationTarget = "tier2_dispute",
                version = 4,
                updatedAtMs = 1700011111L
            ),
            assignmentEvents = listOf(
                GovernanceCaseAssignmentEvent(
                    eventId = "assignment_evt_1",
                    type = GovernanceCaseAssignmentEventType.REASSIGNED,
                    actor = OperatorAssigneeRef(
                        userId = "ops_admin",
                        displayName = "Ops Admin"
                    ),
                    summary = "Case reassigned to Ops Triage.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_OPERATOR_CASE_REASSIGNED),
                    timestampMs = 1700011111L
                ),
                GovernanceCaseAssignmentEvent(
                    eventId = "assignment_evt_2",
                    type = GovernanceCaseAssignmentEventType.ESCALATED,
                    actor = OperatorAssigneeRef(
                        userId = "ops_admin",
                        displayName = "Ops Admin"
                    ),
                    summary = "Case escalated to tier2_dispute.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_OPERATOR_ESCALATION_REQUESTED),
                    timestampMs = 1700011112L
                )
            ),
            escalation = GovernanceCaseEscalationState(
                escalated = true,
                target = "tier2_dispute",
                summary = "Escalated for provider mismatch review.",
                requestedBy = OperatorAssigneeRef(
                    userId = "ops_admin",
                    displayName = "Ops Admin"
                ),
                requestedAtMs = 1700011112L,
                level = 2
            ),
            permissionDenials = listOf(
                OperatorPermissionDenialRecord(
                    denialId = "denial_1",
                    action = GovernanceActionType.ASSIGN_CASE,
                    reason = OperatorPermissionDenialReason.PERMISSION_MISSING,
                    message = "Permission missing for assign case.",
                    actor = OperatorAssigneeRef(
                        userId = "ops_viewer",
                        displayName = "Ops Viewer"
                    ),
                    timestampMs = 1700011110L
                )
            ),
            version = 4,
            updatedAtMs = 1700011112L
        )
        val connectorSummary = ConnectorRoutingSummary(
            status = AlertRoutingStatus.QUEUED,
            summary = "Connector routing queued across 3 target(s).",
            selectedTargetTypes = listOf(
                AlertRoutingTargetType.LOCAL_CONSOLE,
                AlertRoutingTargetType.SLACK_STUB,
                AlertRoutingTargetType.JIRA_STUB
            ),
            failedTargetTypes = emptyList(),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_CONNECTOR_ROUTE_SELECTED,
                RoleReasonCodes.ROLE_CONNECTOR_DELIVERY_RETRIED
            ),
            lastUpdatedAtMs = 1700011113L
        )
        val caseRecord = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                runId = "run_m11_1",
                title = "Escalated dispute pending follow-up.",
                escalated = true,
                assigneeDisplayName = "Ops Triage"
            ),
            collaborationState = collaborationState,
            assignmentSummary = "Owner Ops Admin · Assignee Ops Triage",
            escalationSummary = "Escalated to tier2_dispute (level 2).",
            permissionDenialSummary = "Permission denied: assign case (permission missing).",
            connectorRoutingSummary = connectorSummary
        )

        val encodedCommand = DomainJson.encode(command)
        val decodedCommand = DomainJson.decode<GovernanceCollaborationCommand>(encodedCommand)
        assertEquals(GovernanceActionType.ESCALATE_CASE, decodedCommand.commandType)
        assertEquals(OperatorRole.ADMIN, decodedCommand.operatorIdentity?.role)
        assertEquals(5, decodedCommand.connectorTargets.size)

        val encodedCase = DomainJson.encode(caseRecord)
        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(encodedCase)
        assertEquals("Ops Triage", decodedCase.collaborationState?.assignedTo?.displayName)
        assertEquals(2, decodedCase.collaborationState?.assignmentEvents?.size)
        assertEquals(
            GovernanceCaseAssignmentEventType.ESCALATED,
            decodedCase.collaborationState?.assignmentEvents?.lastOrNull()?.type
        )
        assertEquals(
            OperatorPermissionDenialReason.PERMISSION_MISSING,
            decodedCase.collaborationState?.permissionDenials?.firstOrNull()?.reason
        )
        assertEquals(
            AlertRoutingTargetType.SLACK_STUB,
            decodedCase.connectorRoutingSummary?.selectedTargetTypes?.getOrNull(1)
        )
    }

    @Test
    fun encodeDecode_m12ConnectorDeliveryContractsRoundTrip_andLegacyCompatibility() {
        val connectorTarget = ConnectorDeliveryTarget(
            targetId = "slack_ops",
            label = "Slack Ops",
            providerType = ConnectorProviderType.SLACK,
            endpointHint = "stub://slack"
        )
        val connectorRequest = ConnectorDeliveryRequest(
            requestId = "connector_req_1",
            runId = "run_m12_1",
            alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
            target = connectorTarget,
            dedupeKey = "alert_route:run_m12_1:GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP:slack_stub",
            summary = "Escalation follow-up for provider mismatch.",
            requestedAtMs = 1701011110L
        )
        val connectorAttempt = ConnectorDeliveryAttempt(
            attemptId = "connector_attempt_1",
            requestId = connectorRequest.requestId,
            targetId = connectorTarget.targetId,
            providerType = ConnectorProviderType.SLACK,
            status = ConnectorDeliveryStatus.DEAD_LETTER,
            dedupeKey = connectorRequest.dedupeKey,
            summary = "Repeated connector failures moved this target to dead-letter.",
            failureReason = ConnectorFailureReason.NETWORK_UNAVAILABLE,
            deadLetter = ConnectorDeadLetterRecord(
                deadLetterId = "dead_letter_1",
                runId = "run_m12_1",
                alertCode = connectorRequest.alertCode,
                targetId = connectorTarget.targetId,
                providerType = ConnectorProviderType.SLACK,
                dedupeKey = connectorRequest.dedupeKey,
                failureReason = ConnectorFailureReason.NETWORK_UNAVAILABLE,
                summary = "Connector dead-lettered after repeated transport failures.",
                attemptCount = 3,
                createdAtMs = 1701011112L
            ),
            timestampMs = 1701011112L
        )
        val routingRecord = AlertRoutingRecord(
            recordId = "routing_m12_1",
            runId = "run_m12_1",
            alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
            status = AlertRoutingStatus.FAILED,
            dedupeKey = "alert_route:run_m12_1:GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
            targets = listOf(
                AlertRoutingTarget(
                    targetId = "slack_ops",
                    label = "Slack Ops",
                    targetType = AlertRoutingTargetType.SLACK_STUB,
                    connectorProviderType = ConnectorProviderType.SLACK
                )
            ),
            attempts = listOf(
                AlertRoutingAttempt(
                    attemptId = "route_attempt_1",
                    targetId = "slack_ops",
                    targetType = AlertRoutingTargetType.SLACK_STUB,
                    status = AlertRoutingStatus.FAILED,
                    dedupeKey = connectorRequest.dedupeKey,
                    summary = "Connector destination unavailable.",
                    connectorDeliveryRequest = connectorRequest,
                    connectorDeliveryAttempt = connectorAttempt,
                    timestampMs = 1701011112L
                )
            ),
            deliveryRecords = listOf(
                ConnectorDeliveryRecord(
                    recordId = "delivery_record_1",
                    runId = "run_m12_1",
                    alertCode = connectorRequest.alertCode,
                    target = connectorTarget,
                    dedupeKey = connectorRequest.dedupeKey,
                    status = ConnectorDeliveryStatus.DEAD_LETTER,
                    attempts = listOf(connectorAttempt),
                    deadLetter = connectorAttempt.deadLetter,
                    lastAttemptAtMs = 1701011112L
                )
            ),
            deadLetterRecords = listOfNotNull(connectorAttempt.deadLetter),
            connectorHealthSummary = ConnectorHealthSummary(
                overallStatus = "critical",
                healthyTargets = 0,
                degradedTargets = 1,
                deadLetterTargets = 1,
                unavailableTargets = 0,
                lastUpdatedAtMs = 1701011112L
            ),
            lastAttemptAtMs = 1701011112L
        )
        val receipt = ExecutionReceipt(
            runId = "run_m12_1",
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.ASSISTED,
            connectorHealthSummary = routingRecord.connectorHealthSummary,
            deadLetterSummary = "1 connector dead-letter event(s) recorded across slack.",
            connectorRoutingSummary = ConnectorRoutingSummary(
                status = AlertRoutingStatus.FAILED,
                summary = "Connector routing failed for Slack target.",
                selectedTargetTypes = listOf(AlertRoutingTargetType.SLACK_STUB),
                failedTargetTypes = listOf(AlertRoutingTargetType.SLACK_STUB),
                deadLetterTargets = 1,
                connectorHealthSummary = routingRecord.connectorHealthSummary
            )
        )
        val executionRecord = ExecutionReceiptRecord(
            recordId = "ledger_m12_1",
            runId = "run_m12_1",
            userId = "u_m12_1",
            sessionId = "s_m12_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.BUYER,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = receipt,
            alertRoutingRecords = listOf(routingRecord),
            connectorHealthSummary = routingRecord.connectorHealthSummary,
            deadLetterRecords = routingRecord.deadLetterRecords,
            connectorRoutingSummary = receipt.connectorRoutingSummary,
            createdAtMs = 1701011110L,
            updatedAtMs = 1701011112L
        )

        val encodedRecord = DomainJson.encode(executionRecord)
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(encodedRecord)
        assertEquals("critical", decodedRecord.connectorHealthSummary?.overallStatus)
        assertEquals(1, decodedRecord.deadLetterRecords.size)
        assertEquals(1, decodedRecord.connectorRoutingSummary?.deadLetterTargets)
        assertEquals(
            ConnectorFailureReason.NETWORK_UNAVAILABLE,
            decodedRecord.alertRoutingRecords.first().deadLetterRecords.firstOrNull()?.failureReason
        )

        val legacyJson = """
            {
              "record_id":"legacy_ledger",
              "run_id":"legacy_run",
              "user_id":"legacy_user",
              "session_id":"legacy_session",
              "module":"lix",
              "status":"disputed",
              "role_source":"explicit_user_selection",
              "alert_routing_records":[
                {
                  "record_id":"routing_legacy",
                  "run_id":"legacy_run",
                  "alert_code":"GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                  "status":"queued",
                  "targets":[
                    {
                      "target_id":"legacy_slack",
                      "target_type":"slack_stub"
                    }
                  ]
                }
              ]
            }
        """.trimIndent()
        val decodedLegacy = DomainJson.decode<ExecutionReceiptRecord>(legacyJson)
        assertTrue(decodedLegacy.deadLetterRecords.isEmpty())
        assertNull(decodedLegacy.connectorHealthSummary)
        assertNull(decodedLegacy.connectorRoutingSummary)
        assertNull(decodedLegacy.directorySyncSnapshot)
        assertNull(decodedLegacy.sessionAuthContext)
        assertNull(decodedLegacy.connectorCredentialLifecycle)
        assertEquals(AlertRoutingStatus.QUEUED, decodedLegacy.alertRoutingRecords.first().status)
    }

    @Test
    fun encodeDecode_m13RemoteDirectoryAuthorizationAndConnectorAudit_roundTrip() {
        val remoteTeam = RemoteOperatorTeam(
            teamId = "team_remote_ops",
            displayName = "Remote Ops",
            slug = "remote-ops",
            permissionDefaults = listOf(OperatorPermission.REQUEST_FOLLOW_UP),
            updatedAtMs = 1702010000L
        )
        val remoteIdentity = RemoteOperatorIdentity(
            operatorId = "op_remote_1",
            displayName = "Remote Operator One",
            teamId = remoteTeam.teamId,
            role = OperatorRole.TRIAGE_OPERATOR,
            permissions = listOf(
                OperatorPermission.REQUEST_FOLLOW_UP,
                OperatorPermission.ADD_NOTE
            ),
            scope = PermissionScope.ANY_CASE,
            active = true,
            directorySource = RemoteOperatorDirectorySource.REMOTE_CACHE,
            directoryVersion = "v13",
            updatedAtMs = 1702010001L
        )
        val directoryEntry = RemoteOperatorDirectoryEntry(
            entryId = "entry_remote_1",
            userId = "ops_remote",
            identity = remoteIdentity,
            team = remoteTeam,
            version = 3,
            syncedAtMs = 1702010002L
        )
        val destination = ConnectorDestination(
            destinationId = "dest_slack_prod",
            label = "Slack Prod Ops",
            providerType = ConnectorProviderType.SLACK,
            endpointHint = "https://hooks.example.com/slack",
            credentialRef = ConnectorCredentialRef(
                credentialId = "cred_slack_prod",
                isConfigured = true,
                status = ConnectorCredentialStatus.CONFIGURED,
                authProfileId = "auth_slack_prod"
            ),
            authProfileId = "auth_slack_prod",
            ownerTeamId = "team_remote_ops",
            enabled = true
        )
        val authProfile = ConnectorAuthProfile(
            authProfileId = "auth_slack_prod",
            providerType = ConnectorProviderType.SLACK,
            authScheme = "oauth_bot",
            credentialRef = destination.credentialRef,
            status = ConnectorCredentialStatus.CONFIGURED,
            scopeTags = listOf("alerts", "follow_up")
        )
        val routeBinding = ConnectorRouteBinding(
            bindingId = "binding_slack_prod",
            targetType = AlertRoutingTargetType.SLACK_DESTINATION,
            destinationId = destination.destinationId,
            authProfileId = authProfile.authProfileId,
            enabled = true,
            priority = 10,
            reason = "Primary production Slack route."
        )
        val authorization = RemoteAuthorizationResult(
            status = RemoteAuthorizationStatus.ALLOWED,
            allowed = true,
            operatorId = remoteIdentity.operatorId,
            teamId = remoteIdentity.teamId,
            requiredPermission = OperatorPermission.REQUEST_FOLLOW_UP,
            reason = "Remote authorization allowed by directory policy.",
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_REMOTE_OPERATOR_AUTH_ALLOWED,
                RoleReasonCodes.ROLE_CONNECTOR_DESTINATION_SELECTED,
                RoleReasonCodes.ROLE_CONNECTOR_AUTH_PROFILE_APPLIED
            ),
            evaluatedAtMs = 1702010100L
        )
        val audit = OperatorConnectorAuditLink(
            operatorUserId = "ops_remote",
            operatorDisplayName = "Remote Operator One",
            operatorTeamId = remoteTeam.teamId,
            remoteOperatorId = remoteIdentity.operatorId,
            directoryEntryId = directoryEntry.entryId,
            destinationId = destination.destinationId,
            authProfileId = authProfile.authProfileId,
            routeBindingId = routeBinding.bindingId,
            authorizationStatus = authorization.status,
            deliveryStatus = ConnectorDeliveryStatus.ACKNOWLEDGED,
            summary = "Remote operator routed follow-up to production Slack destination.",
            reasonCodes = authorization.reasonCodes,
            recordedAtMs = 1702010101L
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_m13_1",
            runId = "run_m13_1",
            userId = "u_m13_1",
            sessionId = "s_m13_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            remoteAuthorizationResult = authorization,
            operatorConnectorAudit = audit,
            alertRoutingRecords = listOf(
                AlertRoutingRecord(
                    recordId = "routing_m13_1",
                    runId = "run_m13_1",
                    alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    status = AlertRoutingStatus.DELIVERED,
                    targets = listOf(
                        AlertRoutingTarget(
                            targetId = "slack_prod_ops",
                            label = "Slack Prod Ops",
                            targetType = AlertRoutingTargetType.SLACK_DESTINATION,
                            connectorProviderType = ConnectorProviderType.SLACK,
                            destinationId = destination.destinationId,
                            authProfileId = authProfile.authProfileId,
                            routeBindingId = routeBinding.bindingId
                        )
                    ),
                    routeBindings = listOf(routeBinding),
                    destinations = listOf(destination),
                    authProfiles = listOf(authProfile),
                    authorization = authorization
                )
            )
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                runId = "run_m13_1",
                assigneeTeamName = "Remote Ops",
                remoteOperatorId = "op_remote_1",
                connectorDestinationLabel = "Slack Prod Ops"
            ),
            remoteOperatorIdentity = remoteIdentity,
            remoteOperatorTeam = remoteTeam,
            connectorDestinationSummary = "slack -> Slack Prod Ops",
            connectorAuthProfileSummary = "slack auth oauth_bot (configured)",
            remoteAuthorizationSummary = authorization.reason,
            lastRemoteAuthorization = authorization,
            operatorConnectorAudit = audit
        )

        val encodedRecord = DomainJson.encode(record)
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(encodedRecord)
        assertEquals(RemoteAuthorizationStatus.ALLOWED, decodedRecord.remoteAuthorizationResult?.status)
        assertEquals("dest_slack_prod", decodedRecord.operatorConnectorAudit?.destinationId)
        assertEquals("auth_slack_prod", decodedRecord.operatorConnectorAudit?.authProfileId)
        assertEquals("binding_slack_prod", decodedRecord.operatorConnectorAudit?.routeBindingId)

        val encodedCase = DomainJson.encode(case)
        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(encodedCase)
        assertEquals("Remote Ops", decodedCase.summary.assigneeTeamName)
        assertEquals("op_remote_1", decodedCase.summary.remoteOperatorId)
        assertEquals("Slack Prod Ops", decodedCase.summary.connectorDestinationLabel)
        assertEquals(RemoteAuthorizationStatus.ALLOWED, decodedCase.lastRemoteAuthorization?.status)
        assertEquals("dest_slack_prod", decodedCase.operatorConnectorAudit?.destinationId)
    }

    @Test
    fun encodeDecode_m14EnterpriseIdentitySessionAndCredentialLifecycle_roundTrip() {
        val directorySync = DirectorySyncSnapshot(
            snapshotId = "dir_sync_1",
            source = EnterpriseDirectorySource.ENTERPRISE_DIRECTORY_CACHE,
            status = DirectorySyncStatus.STALE,
            directoryVersion = "enterprise_v14",
            syncedAtMs = 1703010000L,
            summary = "Directory sync is stale; local fallback guardrails are active."
        )
        val identityLink = RemoteIdentityLink(
            operatorId = "op_enterprise_1",
            directoryEntryId = "entry_enterprise_1",
            status = RemoteIdentityLinkStatus.LINKED,
            source = EnterpriseDirectorySource.ENTERPRISE_DIRECTORY_CACHE,
            linkedAtMs = 1703010005L,
            summary = "Operator session is linked to enterprise directory identity."
        )
        val provenance = RemoteAuthorizationProvenance(
            authority = SessionAuthority.REMOTE_DIRECTORY_POLICY,
            identitySource = RemoteOperatorDirectorySource.REMOTE_CACHE,
            directorySyncStatus = DirectorySyncStatus.STALE,
            usedFallback = true,
            sessionFreshness = SessionFreshnessState.STALE,
            summary = "Remote authorization allowed with stale directory cache and local fallback safeguards."
        )
        val authContext = SessionAuthContext(
            sessionRef = "session_enterprise_1",
            authority = SessionAuthority.REMOTE_DIRECTORY_POLICY,
            freshness = SessionFreshnessState.STALE,
            issuedAtMs = 1703010000L,
            validatedAtMs = 1703010010L,
            summary = "Session validated against cached enterprise directory policy."
        )
        val credentialLifecycle = ConnectorCredentialLifecycleSummary(
            state = ConnectorCredentialLifecycleState.ROTATION_REQUIRED,
            summary = "Credential rotation is required before remote connector routing.",
            expiresAtMs = 1703020000L,
            lastRotatedAtMs = 1701010000L,
            rotationRequired = true,
            evaluatedAtMs = 1703010015L
        )

        val receipt = ExecutionReceipt(
            runId = "run_m14_1",
            intentSummary = "Escalate provider dispute with enterprise audit trail.",
            status = ResponseStatus.DISPUTED,
            remoteAuthProvenance = provenance,
            sessionAuthContext = authContext,
            directorySyncSnapshot = directorySync,
            connectorCredentialLifecycle = credentialLifecycle,
            identityProvenanceSummary = "Identity resolved from enterprise directory cache.",
            directorySyncSummary = directorySync.summary,
            sessionAuthProvenanceSummary = provenance.summary,
            connectorCredentialSummary = credentialLifecycle.summary
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_m14_1",
            runId = "run_m14_1",
            userId = "u_m14_1",
            sessionId = "session_enterprise_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            receipt = receipt,
            operatorIdentityProvenance = OperatorIdentityProvenance(
                identitySource = RemoteOperatorDirectorySource.REMOTE_CACHE,
                enterpriseSource = EnterpriseDirectorySource.ENTERPRISE_DIRECTORY_CACHE,
                directorySync = directorySync,
                remoteIdentityLink = identityLink,
                summary = "Operator identity bound to enterprise cache snapshot."
            ),
            directorySyncSnapshot = directorySync,
            sessionAuthContext = authContext,
            connectorCredentialLifecycle = credentialLifecycle,
            remoteAuthorizationResult = RemoteAuthorizationResult(
                status = RemoteAuthorizationStatus.FALLBACK_ALLOWED,
                allowed = true,
                operatorId = "op_enterprise_1",
                teamId = "team_enterprise_ops",
                reason = "Remote authorization allowed via enterprise cache fallback policy.",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_REMOTE_AUTH_PROVENANCE_RECORDED,
                    RoleReasonCodes.ROLE_REMOTE_SESSION_FALLBACK_USED,
                    RoleReasonCodes.ROLE_CONNECTOR_CREDENTIAL_ROTATION_REQUIRED
                ),
                provenance = provenance,
                sessionAuthContext = authContext,
                evaluatedAtMs = 1703010010L
            ),
            alertRoutingRecords = listOf(
                AlertRoutingRecord(
                    recordId = "routing_m14_1",
                    runId = "run_m14_1",
                    alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    status = AlertRoutingStatus.LOCAL_ONLY,
                    credentialLifecycleSummaries = listOf(credentialLifecycle),
                    directorySync = directorySync
                )
            )
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                runId = "run_m14_1",
                remoteOperatorId = "op_enterprise_1"
            ),
            operatorIdentityProvenance = record.operatorIdentityProvenance,
            directorySyncSummary = directorySync.summary,
            sessionAuthProvenanceSummary = provenance.summary,
            connectorCredentialSummary = credentialLifecycle.summary,
            lastDirectorySyncSnapshot = directorySync,
            lastSessionAuthContext = authContext,
            lastConnectorCredentialLifecycle = credentialLifecycle
        )

        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))
        assertEquals(DirectorySyncStatus.STALE, decodedRecord.directorySyncSnapshot?.status)
        assertEquals(SessionAuthority.REMOTE_DIRECTORY_POLICY, decodedRecord.sessionAuthContext?.authority)
        assertEquals(ConnectorCredentialLifecycleState.ROTATION_REQUIRED, decodedRecord.connectorCredentialLifecycle?.state)
        assertEquals(DirectorySyncStatus.STALE, decodedRecord.receipt?.directorySyncSnapshot?.status)
        assertEquals(SessionFreshnessState.STALE, decodedRecord.receipt?.sessionAuthContext?.freshness)

        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(DomainJson.encode(case))
        assertTrue(decodedCase.directorySyncSummary.contains("stale", ignoreCase = true))
        assertTrue(decodedCase.sessionAuthProvenanceSummary.contains("fallback", ignoreCase = true))
        assertTrue(decodedCase.connectorCredentialSummary.contains("rotation", ignoreCase = true))
    }

    @Test
    fun encodeDecode_m15EnterpriseSsoScimVaultIntegration_roundTrip() {
        val assertion = EnterpriseIdentityAssertion(
            assertionId = "assertion_m15_1",
            idpProvider = EnterpriseIdpProvider.OKTA,
            subjectId = "ent_user_1",
            subjectEmail = "ops@example.com",
            assertedAtMs = 1704010000L,
            expiresAtMs = 1704013600L,
            assuranceLevel = "high",
            summary = "Enterprise identity assertion captured from Okta."
        )
        val directoryUpdate = DirectorySyncUpdate(
            updateId = "scim_update_1",
            updateType = DirectorySyncUpdateType.SCIM_WEBHOOK,
            status = DirectorySyncStatus.STALE,
            errorState = DirectorySyncErrorState.RATE_LIMITED,
            receivedAtMs = 1704010010L,
            processedAtMs = 1704010020L,
            recordsUpserted = 2,
            recordsDisabled = 0,
            summary = "SCIM webhook update processed with stale cache fallback."
        )
        val directorySnapshot = DirectorySyncSnapshot(
            snapshotId = "dir_sync_m15_1",
            source = EnterpriseDirectorySource.ENTERPRISE_DIRECTORY_LIVE,
            status = DirectorySyncStatus.STALE,
            errorState = DirectorySyncErrorState.RATE_LIMITED,
            directoryVersion = "enterprise_v15",
            syncedAtMs = 1704010030L,
            lastError = "rate_limited",
            lastUpdate = directoryUpdate,
            summary = "Directory sync is stale due to SCIM rate limiting."
        )
        val vaultRef = VaultCredentialReference(
            vaultProvider = "hashicorp_vault",
            vaultPath = "secret/connectors/slack/prod",
            secretVersion = "42",
            leaseId = "lease_123",
            leaseExpiresAtMs = 1704010200L,
            status = VaultCredentialStatus.LEASE_EXPIRED,
            rotationState = VaultCredentialRotationState.SCHEDULED,
            lastRotatedAtMs = 1703010000L,
            summary = "Vault lease expired; rotation scheduled."
        )
        val binding = ConnectorCredentialBinding(
            bindingId = "binding_m15_1",
            destinationId = "dest_slack_prod",
            authProfileId = "auth_slack_prod",
            credentialRef = ConnectorCredentialRef(
                credentialId = "cred_slack_prod",
                isConfigured = true,
                status = ConnectorCredentialStatus.CONFIGURED,
                vaultCredential = vaultRef
            ),
            vaultCredential = vaultRef,
            status = ConnectorCredentialStatus.CONFIGURED,
            blockReason = CredentialRouteBlockReason.VAULT_LEASE_EXPIRED,
            summary = "Route blocked until vault lease is renewed.",
            updatedAtMs = 1704010040L
        )
        val integration = EnterpriseAuthIntegrationSummary(
            identityAssertion = assertion,
            sessionProvenance = EnterpriseSessionProvenance.SSO_STALE_FALLBACK,
            directorySync = directorySnapshot,
            directoryUpdate = directoryUpdate,
            directoryErrorState = DirectorySyncErrorState.RATE_LIMITED,
            credentialBinding = binding,
            summary = "Enterprise session stale fallback with vault lease-expired route block."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m15_1",
            intentSummary = "Route governance follow-up under enterprise controls.",
            status = ResponseStatus.DISPUTED,
            enterpriseIdentitySummary = assertion.summary,
            enterpriseSessionSummary = integration.summary,
            scimDirectorySummary = directoryUpdate.summary,
            vaultCredentialSummary = vaultRef.summary,
            enterpriseAuthIntegration = integration
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_m15_1",
            runId = "run_m15_1",
            userId = "u_m15_1",
            sessionId = "s_m15_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            receipt = receipt,
            enterpriseAuthIntegration = integration,
            alertRoutingRecords = listOf(
                AlertRoutingRecord(
                    recordId = "routing_m15_1",
                    runId = "run_m15_1",
                    alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
                    status = AlertRoutingStatus.LOCAL_ONLY,
                    directorySync = directorySnapshot,
                    enterpriseAuthIntegration = integration,
                    targets = listOf(
                        AlertRoutingTarget(
                            targetId = "slack_prod_ops",
                            label = "Slack Prod Ops",
                            targetType = AlertRoutingTargetType.SLACK_DESTINATION,
                            credentialRouteBlockReason = CredentialRouteBlockReason.VAULT_LEASE_EXPIRED,
                            credentialBinding = binding
                        )
                    )
                )
            )
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(runId = "run_m15_1"),
            enterpriseIdentitySummary = assertion.summary,
            enterpriseSessionSummary = integration.summary,
            scimDirectorySummary = directoryUpdate.summary,
            vaultCredentialSummary = vaultRef.summary,
            enterpriseAuthIntegration = integration
        )

        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))
        assertEquals(EnterpriseIdpProvider.OKTA, decodedRecord.enterpriseAuthIntegration?.identityAssertion?.idpProvider)
        assertEquals(CredentialRouteBlockReason.VAULT_LEASE_EXPIRED, decodedRecord.alertRoutingRecords.first().targets.first().credentialRouteBlockReason)
        assertEquals(VaultCredentialStatus.LEASE_EXPIRED, decodedRecord.enterpriseAuthIntegration?.credentialBinding?.vaultCredential?.status)
        assertEquals(DirectorySyncErrorState.RATE_LIMITED, decodedRecord.enterpriseAuthIntegration?.directoryErrorState)

        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(DomainJson.encode(case))
        assertTrue(decodedCase.enterpriseIdentitySummary.contains("okta", ignoreCase = true))
        assertTrue(decodedCase.vaultCredentialSummary.contains("lease", ignoreCase = true))
        assertTrue(decodedCase.scimDirectorySummary.contains("scim", ignoreCase = true))
    }

    @Test
    fun encodeDecode_m16RolloutCutoverVaultRuntime_roundTrip() {
        val tenantRollout = TenantRolloutProfile(
            tenantId = "tenant_m16",
            workspaceId = "workspace_m16",
            stage = EnterpriseRolloutStage.CANARY,
            canaryUserIds = listOf("ops_admin"),
            updatedAtMs = 1705010010L,
            summary = "Enterprise rollout stage canary with guarded allowlist."
        )
        val workspaceRollout = WorkspaceRolloutProfile(
            workspaceId = "workspace_m16",
            stage = EnterpriseRolloutStage.CANARY,
            cutoverStatus = CutoverReadinessStatus.NOT_READY,
            degradationMode = ExecutionDegradationMode.LOCAL_FALLBACK,
            updatedAtMs = 1705010015L,
            summary = "Workspace cutover is not ready; local fallback remains active."
        )
        val cutover = CutoverReadinessSummary(
            status = CutoverReadinessStatus.NOT_READY,
            blockReasons = listOf(
                DirectoryCutoverBlockReason.DIRECTORY_STALE,
                DirectoryCutoverBlockReason.ASSERTION_MISSING
            ),
            checks = listOf(
                DirectoryCutoverCheck(
                    checkId = "check_m16_directory",
                    name = "Directory freshness",
                    required = true,
                    status = CutoverReadinessStatus.NOT_READY,
                    summary = "Directory cache is stale beyond cutover threshold."
                )
            ),
            updatedAtMs = 1705010020L,
            summary = "Cutover readiness blocked by stale directory state."
        )
        val vaultHealth = VaultHealthSummary(
            status = VaultLeaseStatus.EXPIRING,
            summary = "Vault runtime degraded; lease renewal required.",
            lastCheckedAtMs = 1705010025L
        )
        val vaultResolution = VaultResolutionResult(
            resolutionId = "vault_resolution_m16",
            credentialId = "cred_m16",
            vaultProvider = "hashicorp_vault",
            status = VaultCredentialStatus.ROTATION_DUE,
            lease = VaultLeaseHandle(
                leaseId = "lease_m16",
                status = VaultLeaseStatus.EXPIRING,
                issuedAtMs = 1704010000L,
                expiresAtMs = 1705011000L,
                renewable = true,
                summary = "Lease is expiring soon."
            ),
            materialState = VaultCredentialMaterialState.MATERIAL_WITHHELD,
            health = vaultHealth,
            summary = "Vault runtime resolved metadata without exposing secret material."
        )
        val fallbackPolicy = EnterpriseFallbackPolicy(
            localFirst = true,
            degradationMode = ExecutionDegradationMode.LOCAL_FALLBACK,
            summary = "Local-first fallback is active while rollout/cutover checks are not ready."
        )
        val gateDecision = FeatureGateDecision(
            featureKey = "connector_route_slack",
            allowed = false,
            rolloutStage = EnterpriseRolloutStage.CANARY,
            cutoverStatus = CutoverReadinessStatus.NOT_READY,
            degradationMode = ExecutionDegradationMode.LOCAL_FALLBACK,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_ENTERPRISE_ROLLOUT_STAGE_APPLIED,
                RoleReasonCodes.ROLE_ENTERPRISE_CUTOVER_BLOCKED,
                RoleReasonCodes.ROLE_ENTERPRISE_FALLBACK_LOCAL_FIRST
            ),
            summary = "Connector route gated by canary policy and cutover checks."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m16_1",
            intentSummary = "Route operator escalation under enterprise rollout controls.",
            status = ResponseStatus.PARTIAL,
            rolloutSummary = tenantRollout.summary,
            cutoverReadinessSummary = cutover.summary,
            vaultRuntimeSummary = vaultHealth.summary,
            enterpriseFallbackSummary = fallbackPolicy.summary,
            tenantRolloutProfile = tenantRollout,
            workspaceRolloutProfile = workspaceRollout,
            cutoverReadiness = cutover,
            vaultHealth = vaultHealth,
            vaultResolution = vaultResolution,
            fallbackPolicy = fallbackPolicy
        )
        val routingRecord = AlertRoutingRecord(
            recordId = "routing_m16_1",
            runId = "run_m16_1",
            alertCode = "GOVERNANCE_ALERT_OPERATOR_FOLLOW_UP",
            status = AlertRoutingStatus.LOCAL_ONLY,
            tenantRolloutProfile = tenantRollout,
            workspaceRolloutProfile = workspaceRollout,
            cutoverReadiness = cutover,
            fallbackPolicy = fallbackPolicy,
            vaultHealth = vaultHealth,
            vaultResolutions = listOf(vaultResolution),
            targets = listOf(
                AlertRoutingTarget(
                    targetId = "slack_prod_ops",
                    label = "Slack Prod Ops",
                    targetType = AlertRoutingTargetType.SLACK_DESTINATION,
                    featureGateDecision = gateDecision,
                    degradationMode = ExecutionDegradationMode.LOCAL_FALLBACK,
                    credentialRouteBlockReason = CredentialRouteBlockReason.CUTOVER_NOT_READY,
                    vaultResolution = vaultResolution
                )
            )
        )
        val record = ExecutionReceiptRecord(
            recordId = "ledger_m16_1",
            runId = "run_m16_1",
            userId = "u_m16_1",
            sessionId = "s_m16_1",
            module = ModuleId.LIX,
            status = ResponseStatus.PARTIAL,
            receipt = receipt,
            tenantRolloutProfile = tenantRollout,
            workspaceRolloutProfile = workspaceRollout,
            cutoverReadiness = cutover,
            vaultHealth = vaultHealth,
            vaultResolution = vaultResolution,
            fallbackPolicy = fallbackPolicy,
            alertRoutingRecords = listOf(routingRecord)
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(runId = "run_m16_1"),
            rolloutSummary = tenantRollout.summary,
            cutoverReadinessSummary = cutover.summary,
            vaultRuntimeSummary = vaultHealth.summary,
            enterpriseFallbackSummary = fallbackPolicy.summary,
            tenantRolloutProfile = tenantRollout,
            workspaceRolloutProfile = workspaceRollout,
            cutoverReadiness = cutover,
            vaultHealth = vaultHealth,
            vaultResolution = vaultResolution,
            fallbackPolicy = fallbackPolicy
        )

        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))
        assertEquals(EnterpriseRolloutStage.CANARY, decodedRecord.tenantRolloutProfile?.stage)
        assertEquals(CutoverReadinessStatus.NOT_READY, decodedRecord.cutoverReadiness?.status)
        assertEquals(VaultCredentialStatus.ROTATION_DUE, decodedRecord.vaultResolution?.status)
        assertEquals(ExecutionDegradationMode.LOCAL_FALLBACK, decodedRecord.fallbackPolicy?.degradationMode)
        assertEquals(
            CredentialRouteBlockReason.CUTOVER_NOT_READY,
            decodedRecord.alertRoutingRecords.first().targets.first().credentialRouteBlockReason
        )
        assertEquals(
            false,
            decodedRecord.alertRoutingRecords.first().targets.first().featureGateDecision?.allowed
        )

        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(DomainJson.encode(case))
        assertTrue(decodedCase.rolloutSummary.contains("canary", ignoreCase = true))
        assertTrue(decodedCase.cutoverReadinessSummary.contains("cutover", ignoreCase = true))
        assertTrue(decodedCase.vaultRuntimeSummary.contains("vault", ignoreCase = true))
        assertTrue(decodedCase.enterpriseFallbackSummary.contains("fallback", ignoreCase = true))
        assertEquals(CutoverReadinessStatus.NOT_READY, decodedCase.cutoverReadiness?.status)
    }

    @Test
    fun encodeDecode_m18OperatorConsoleContractsRoundTrip() {
        val timeline = listOf(
            OperatorCaseTimelineItem(
                timelineId = "tl_1",
                type = OperatorCaseTimelineItemType.OPERATOR_ACTION,
                title = "Operator claimed case",
                detail = "Case claimed by Ops Triage.",
                timestampMs = 1700003000L,
                severity = GovernanceAlertSeverity.INFO,
                reasonCodes = listOf(RoleReasonCodes.ROLE_OPERATOR_CASE_CLAIMED)
            )
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                caseId = "case_m18_1",
                runId = "run_m18_1",
                title = "Connector health follow-up",
                summary = "Connector delivery failed and needs retry."
            ),
            timeline = timeline
        )
        val presets = listOf(
            OperatorQueuePresetMatch(
                preset = OperatorQueuePreset.SYNC_PENDING,
                label = "Sync pending",
                queueHint = GovernanceQueueType.SYNC_PENDING,
                count = 3,
                highPriorityCount = 1
            )
        )
        val home = OperatorHomeSummary(
            openCases = 5,
            highPriorityCases = 2,
            syncPendingCases = 3,
            escalatedCases = 1,
            connectorIssueCases = 2,
            vaultIssueCases = 1,
            updatedAtMs = 1700003000L,
            presets = presets,
            healthBuckets = listOf(
                OperatorHealthBucket(
                    type = OperatorHealthBucketType.CONNECTOR_HEALTH,
                    label = "Connector health",
                    severity = GovernanceAlertSeverity.HIGH,
                    count = 2,
                    queueHint = GovernanceQueueType.PROVIDER_ISSUE,
                    summary = "2 connector issue cases are active."
                )
            ),
            summary = "Open 5 · High priority 2 · Sync pending 3"
        )
        val console = GovernanceConsoleState(
            filter = GovernanceConsoleFilter(limit = 20),
            totalRecords = 5,
            matchedCases = 5,
            queueCounts = listOf(
                GovernanceQueueCount(
                    queue = GovernanceQueueType.SYNC_PENDING,
                    count = 3,
                    highPriorityCount = 1
                )
            ),
            cases = listOf(case),
            savedPresets = presets,
            homeSummary = home
        )
        val bulkRequest = GovernanceBulkActionRequest(
            action = GovernanceActionType.MARK_REVIEWED,
            runIds = listOf("run_m18_1", "run_m18_2"),
            requestedBy = "ops_triage",
            requestedAtMs = 1700003000L
        )
        val bulkResult = GovernanceBulkActionResult(
            action = GovernanceActionType.MARK_REVIEWED,
            requestedCount = 2,
            successCount = 2,
            message = "Bulk action completed.",
            results = listOf(
                GovernanceActionResult(
                    action = GovernanceActionType.MARK_REVIEWED,
                    runId = "run_m18_1",
                    success = true
                )
            ),
            timestampMs = 1700003001L
        )

        val decodedConsole = DomainJson.decode<GovernanceConsoleState>(DomainJson.encode(console))
        assertEquals(1, decodedConsole.savedPresets.size)
        assertEquals(OperatorQueuePreset.SYNC_PENDING, decodedConsole.savedPresets.first().preset)
        assertEquals(5, decodedConsole.homeSummary?.openCases)
        assertEquals(1, decodedConsole.cases.first().timeline.size)
        assertTrue(decodedConsole.cases.first().timeline.first().title.contains("claimed", ignoreCase = true))

        val decodedBulkRequest = DomainJson.decode<GovernanceBulkActionRequest>(DomainJson.encode(bulkRequest))
        assertEquals(2, decodedBulkRequest.runIds.size)
        assertEquals("ops_triage", decodedBulkRequest.requestedBy)

        val decodedBulkResult = DomainJson.decode<GovernanceBulkActionResult>(DomainJson.encode(bulkResult))
        assertEquals(2, decodedBulkResult.requestedCount)
        assertEquals(2, decodedBulkResult.successCount)
        assertEquals(1, decodedBulkResult.results.size)
    }

    @Test
    fun encodeDecode_m19WorkflowCollaborationAutomationContracts_roundTrip() {
        val workflowRun = OperatorWorkflowRun(
            runId = "run_m19_1",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = OperatorWorkflowRunStatus.ACTIVE,
            currentStage = OperatorWorkflowStage.WAITING_SYNC,
            stageHistory = listOf(
                OperatorWorkflowStageRecord(
                    stage = OperatorWorkflowStage.WAITING_PROVIDER,
                    status = OperatorWorkflowStepStatus.COMPLETED,
                    summary = "Provider callback triage done.",
                    enteredAtMs = 1700004000L
                ),
                OperatorWorkflowStageRecord(
                    stage = OperatorWorkflowStage.WAITING_SYNC,
                    status = OperatorWorkflowStepStatus.IN_PROGRESS,
                    summary = "Waiting sync acknowledgement.",
                    enteredAtMs = 1700004010L
                )
            ),
            nextAction = WorkflowNextActionSuggestion(
                title = "Run retry sync intent",
                detail = "Request retry and monitor acknowledgement.",
                action = GovernanceActionType.RETRY_SYNC_INTENT,
                automationEligible = true
            ),
            updatedAtMs = 1700004020L
        )
        val collaborationEvent = GovernanceCollaborationEventRecord(
            eventId = "collab_event_m19_1",
            type = GovernanceCollaborationEventType.WORKFLOW_STAGE_CHANGED,
            actor = GovernanceCollaborationActor(
                actorId = "ops_admin",
                displayName = "Ops Admin",
                source = GovernanceCollaborationActionSource.HUMAN_OPERATOR
            ),
            summary = "Workflow stage moved to waiting sync.",
            reasonCodes = listOf(RoleReasonCodes.ROLE_WORKFLOW_STAGE_CHANGED),
            workflowStage = OperatorWorkflowStage.WAITING_SYNC,
            timestampMs = 1700004021L
        )
        val automationAudit = RemoteOpsAutomationAuditRecord(
            auditId = "automation_m19_1",
            ruleId = "auto_sync_pending",
            trigger = RemoteOpsAutomationTrigger.SYNC_PENDING,
            action = GovernanceActionType.RETRY_SYNC_INTENT,
            status = RemoteOpsAutomationDecisionStatus.EXECUTED,
            summary = "Automation executed retry sync intent.",
            source = GovernanceCollaborationActionSource.LOCAL_AUTOMATION,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_AUTOMATION_RULE_TRIGGERED,
                RoleReasonCodes.ROLE_AUTOMATION_ACTION_EXECUTED
            ),
            timestampMs = 1700004022L
        )
        val record = ExecutionReceiptRecord(
            recordId = "record_m19_1",
            runId = "run_m19_1",
            userId = "u_m19_1",
            sessionId = "s_m19_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            collaborationState = GovernanceCaseCollaborationState(
                runId = "run_m19_1",
                status = OperatorCollaborationStatus.REVIEW_IN_PROGRESS,
                workflowRun = workflowRun,
                collaborationEvents = listOf(collaborationEvent),
                automationAudit = listOf(automationAudit),
                updatedAtMs = 1700004022L
            ),
            workflowRun = workflowRun,
            collaborationEvents = listOf(collaborationEvent),
            automationAudit = listOf(automationAudit)
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                runId = "run_m19_1",
                workflowTemplateName = "Provider Follow-up",
                workflowStage = OperatorWorkflowStage.WAITING_SYNC,
                workflowNextAction = "Run retry sync intent"
            ),
            workflowRun = workflowRun,
            workflowSummary = "Template Provider Follow-up · Stage waiting sync · Next Run retry sync intent",
            latestCollaborationEvent = collaborationEvent,
            latestAutomationAudit = automationAudit
        )
        val command = GovernanceCollaborationCommand(
            commandType = GovernanceActionType.ADVANCE_WORKFLOW_STAGE,
            actorUserId = "ops_admin",
            actorDisplayName = "Ops Admin",
            workflowTemplateId = "wf_provider_follow_up",
            workflowStage = OperatorWorkflowStage.WAITING_SYNC,
            collaborationSource = GovernanceCollaborationActionSource.SYSTEM_WORKFLOW,
            automationRuleId = "auto_sync_pending",
            timestampMs = 1700004023L
        )

        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))
        assertEquals(OperatorWorkflowStage.WAITING_SYNC, decodedRecord.workflowRun?.currentStage)
        assertEquals(1, decodedRecord.collaborationEvents.size)
        assertEquals(1, decodedRecord.automationAudit.size)

        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(DomainJson.encode(case))
        assertEquals("Provider Follow-up", decodedCase.summary.workflowTemplateName)
        assertEquals(OperatorWorkflowStage.WAITING_SYNC, decodedCase.summary.workflowStage)
        assertTrue(decodedCase.workflowSummary.contains("Stage waiting sync", ignoreCase = true))

        val decodedCommand = DomainJson.decode<GovernanceCollaborationCommand>(DomainJson.encode(command))
        assertEquals(GovernanceActionType.ADVANCE_WORKFLOW_STAGE, decodedCommand.commandType)
        assertEquals(OperatorWorkflowStage.WAITING_SYNC, decodedCommand.workflowStage)
        assertEquals("auto_sync_pending", decodedCommand.automationRuleId)
        assertEquals(
            GovernanceCollaborationActionSource.SYSTEM_WORKFLOW,
            decodedCommand.collaborationSource
        )
    }

    @Test
    fun encodeDecode_m20WorkflowPolicySlaAutomationGuardrails_roundTrip() {
        val policyProfile = WorkflowPolicyProfile(
            policyId = "wf_policy_provider_follow_up",
            version = "m20_v1",
            summary = "Provider follow-up policy is active.",
            stagePolicies = listOf(
                WorkflowStagePolicy(
                    stage = OperatorWorkflowStage.WAITING_PROVIDER,
                    maxStageDurationMs = 14_400_000L,
                    escalationAfterMs = 7_200_000L,
                    allowAutomation = false,
                    requiredHumanAction = "Request provider follow-up or escalate."
                )
            ),
            transitionPolicies = listOf(
                WorkflowTransitionPolicy(
                    from = OperatorWorkflowStage.WAITING_PROVIDER,
                    allowedTo = listOf(
                        OperatorWorkflowStage.WAITING_SYNC,
                        OperatorWorkflowStage.UNDER_REVIEW
                    )
                )
            ),
            slaPolicy = WorkflowSlaPolicy(
                targetMs = 21_600_000L,
                warningMs = 3_600_000L
            ),
            escalationPolicy = WorkflowEscalationPolicy(
                enabled = true,
                targetMs = 7_200_000L,
                triggerOnSlaBreach = true
            ),
            automationGuardrail = WorkflowAutomationGuardrail(
                allowAutomation = true,
                suppressedStages = listOf(OperatorWorkflowStage.UNDER_REVIEW),
                blockedActions = listOf(GovernanceActionType.ESCALATE_CASE),
                blockWhenSlaBreached = true,
                blockWhenEscalationRequired = true,
                cooldownMs = 600_000L,
                throttleWindowMs = 3_600_000L,
                maxRunsPerWindow = 1
            )
        )
        val workflowRun = OperatorWorkflowRun(
            runId = "run_m20_1",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = OperatorWorkflowRunStatus.ACTIVE,
            currentStage = OperatorWorkflowStage.WAITING_PROVIDER,
            stageHistory = listOf(
                OperatorWorkflowStageRecord(
                    stage = OperatorWorkflowStage.WAITING_PROVIDER,
                    status = OperatorWorkflowStepStatus.IN_PROGRESS,
                    summary = "Waiting provider acknowledgement.",
                    enteredAtMs = 1700005000L
                )
            ),
            policyProfile = policyProfile,
            slaClock = WorkflowSlaClock(
                startedAtMs = 1700005000L,
                dueAtMs = 1700026600L,
                warningAtMs = 1700023000L,
                status = WorkflowSlaStatus.BREACHED,
                breachedAtMs = 1700026600L,
                summary = "SLA is breached and requires escalation handling."
            ),
            stageTimer = WorkflowStageTimerState(
                status = WorkflowStageTimerStatus.OVERDUE,
                startedAtMs = 1700005000L,
                dueAtMs = 1700019400L,
                summary = "Stage timer is overdue for waiting provider."
            ),
            escalationTimer = WorkflowEscalationTimerState(
                status = WorkflowEscalationTimerStatus.REQUIRED,
                dueAtMs = 1700012200L,
                triggeredAtMs = 1700012200L,
                summary = "Escalation is required by workflow policy."
            ),
            automationGuardrailDecision = WorkflowAutomationGuardrailDecision(
                status = WorkflowAutomationEligibilityStatus.BLOCKED,
                summary = "Automation blocked by workflow guardrails.",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_AUTOMATION_BLOCKED,
                    RoleReasonCodes.ROLE_SLA_BREACHED
                ),
                evaluatedAtMs = 1700026601L,
                nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually."
            ),
            workflowPolicySummary = "Provider follow-up policy is active.",
            slaSummary = "SLA is breached and requires escalation handling.",
            stageTimerSummary = "Stage timer is overdue for waiting provider.",
            escalationTimerSummary = "Escalation is required by workflow policy.",
            automationGuardrailSummary = "Automation blocked by workflow guardrails.",
            automationSuppressionSummary = "Automation suppressed because SLA is breached.",
            nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually.",
            nextAction = WorkflowNextActionSuggestion(
                title = "Manual follow-up required",
                detail = "Review workflow policy guardrails and execute this step manually.",
                action = GovernanceActionType.ADD_NOTE,
                automationEligible = false
            ),
            updatedAtMs = 1700026601L
        )
        val receipt = ExecutionReceipt(
            runId = "run_m20_1",
            intentSummary = "Provider follow-up governance review",
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(RoleReasonCodes.ROLE_WORKFLOW_POLICY_APPLIED),
            roleImpactSummary = "Workflow policy constrained automation at this stage.",
            approvalSummary = "No approval gate triggered.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "Provider acknowledgement remains pending.",
            verificationSummary = "Verification pending provider proof.",
            proofSummary = "No new proof artifacts yet.",
            rollbackSummary = "Rollback is available if dispute escalates.",
            workflowPolicySummary = "Provider follow-up policy is active.",
            slaSummary = "SLA is breached and requires escalation handling.",
            stageTimerSummary = "Stage timer is overdue for waiting provider.",
            escalationTimerSummary = "Escalation is required by workflow policy.",
            automationGuardrailSummary = "Automation blocked by workflow guardrails.",
            automationSuppressionSummary = "Automation suppressed because SLA is breached.",
            nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually.",
            slaStatus = WorkflowSlaStatus.BREACHED,
            stageTimerStatus = WorkflowStageTimerStatus.OVERDUE,
            escalationTimerStatus = WorkflowEscalationTimerStatus.REQUIRED,
            automationEligibility = WorkflowAutomationEligibilityStatus.BLOCKED,
            startedAt = 1700005000L,
            updatedAt = 1700026601L,
            completedAt = null
        )
        val record = ExecutionReceiptRecord(
            recordId = "record_m20_1",
            runId = "run_m20_1",
            userId = "u_m20_1",
            sessionId = "s_m20_1",
            module = ModuleId.LIX,
            status = ResponseStatus.DISPUTED,
            receipt = receipt,
            workflowRun = workflowRun,
            workflowPolicyProfile = policyProfile,
            slaClock = workflowRun.slaClock,
            stageTimer = workflowRun.stageTimer,
            escalationTimer = workflowRun.escalationTimer,
            automationGuardrailDecision = workflowRun.automationGuardrailDecision
        )
        val filter = GovernanceConsoleFilter(
            workflowTemplateId = "wf_provider_follow_up",
            workflowStage = OperatorWorkflowStage.WAITING_PROVIDER,
            slaStatus = WorkflowSlaStatus.BREACHED,
            stageTimerStatus = WorkflowStageTimerStatus.OVERDUE,
            escalationTimerStatus = WorkflowEscalationTimerStatus.REQUIRED,
            automationEligibility = WorkflowAutomationEligibilityStatus.BLOCKED,
            automationBlockedOnly = true,
            slaBreachOnly = true,
            escalationPendingOnly = true,
            includeReviewed = true,
            limit = 10
        )
        val case = GovernanceCaseRecord(
            summary = GovernanceCaseSummary(
                runId = "run_m20_1",
                workflowTemplateName = "Provider Follow-up",
                workflowTemplateId = "wf_provider_follow_up",
                workflowStage = OperatorWorkflowStage.WAITING_PROVIDER,
                slaStatus = WorkflowSlaStatus.BREACHED,
                stageTimerStatus = WorkflowStageTimerStatus.OVERDUE,
                escalationTimerStatus = WorkflowEscalationTimerStatus.REQUIRED,
                automationEligibility = WorkflowAutomationEligibilityStatus.BLOCKED
            ),
            workflowPolicySummary = "Provider follow-up policy is active.",
            slaSummary = "SLA is breached and requires escalation handling.",
            stageTimerSummary = "Stage timer is overdue for waiting provider.",
            escalationTimerSummary = "Escalation is required by workflow policy.",
            automationGuardrailSummary = "Automation blocked by workflow guardrails.",
            automationSuppressionSummary = "Automation suppressed because SLA is breached.",
            nextRequiredHumanAction = "Review workflow policy guardrails and execute this step manually."
        )

        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))
        assertEquals(WorkflowSlaStatus.BREACHED, decodedRecord.workflowRun?.slaClock?.status)
        assertEquals(WorkflowAutomationEligibilityStatus.BLOCKED, decodedRecord.workflowRun?.automationGuardrailDecision?.status)
        assertEquals(WorkflowSlaStatus.BREACHED, decodedRecord.receipt?.slaStatus)

        val decodedFilter = DomainJson.decode<GovernanceConsoleFilter>(DomainJson.encode(filter))
        assertEquals("wf_provider_follow_up", decodedFilter.workflowTemplateId)
        assertEquals(WorkflowSlaStatus.BREACHED, decodedFilter.slaStatus)
        assertTrue(decodedFilter.automationBlockedOnly)
        assertTrue(decodedFilter.slaBreachOnly)
        assertTrue(decodedFilter.escalationPendingOnly)

        val decodedCase = DomainJson.decode<GovernanceCaseRecord>(DomainJson.encode(case))
        assertEquals(WorkflowSlaStatus.BREACHED, decodedCase.summary.slaStatus)
        assertEquals(WorkflowAutomationEligibilityStatus.BLOCKED, decodedCase.summary.automationEligibility)
        assertTrue(decodedCase.workflowPolicySummary.contains("policy", ignoreCase = true))
    }

    @Test
    fun encodeDecode_m21WorkflowPolicyPackOverrideSimulation_roundTrip() {
        val pack = WorkflowPolicyPack(
            packId = "pack_m21_ops",
            name = "Ops governance pack",
            scope = WorkflowPolicyPackScope.WORKSPACE,
            activationState = WorkflowPolicyPackActivationState.SIMULATION_ONLY,
            activeVersionId = "v_m21_1",
            versions = listOf(
                WorkflowPolicyPackVersion(
                    versionId = "v_m21_1",
                    policyVersion = "m21_v1",
                    workflowTemplateIds = listOf("wf_provider_follow_up"),
                    policyProfile = WorkflowPolicyProfile(
                        policyId = "wf_policy_provider_follow_up",
                        version = "m21_v1",
                        summary = "M21 workspace pack policy is active."
                    ),
                    automationControls = WorkflowAutomationAdvancedControls(
                        maxRunsPerCase = 2,
                        cooldownMs = 300_000L,
                        throttleWindowMs = 3_600_000L,
                        maxRunsPerWindow = 1,
                        simulationOnly = true,
                        summary = "Workspace pack enables simulation-only automation."
                    ),
                    summary = "M21 pack version."
                )
            ),
            summary = "Workspace pack for provider follow-up."
        )
        val binding = WorkflowPolicyPackBinding(
            bindingId = "binding_m21_1",
            packId = pack.packId,
            versionId = "v_m21_1",
            scope = WorkflowPolicyPackScope.WORKSPACE,
            tenantId = "tenant_default",
            workspaceId = "workspace_ops",
            workflowTemplateIds = listOf("wf_provider_follow_up"),
            activationState = WorkflowPolicyPackActivationState.SIMULATION_ONLY,
            precedence = 30,
            summary = "Workspace binding active."
        )
        val tenantOverride = TenantWorkflowPolicyOverride(
            overrideId = "tenant_override_m21",
            tenantId = "tenant_default",
            workflowTemplateId = "wf_provider_follow_up",
            automationControls = WorkflowAutomationAdvancedControls(
                maxRunsPerCase = 1,
                cooldownMs = 600_000L,
                summary = "Tenant override throttle."
            ),
            summary = "Tenant override applied."
        )
        val workspaceOverride = WorkspaceWorkflowPolicyOverride(
            overrideId = "workspace_override_m21",
            workspaceId = "workspace_ops",
            workflowTemplateId = "wf_provider_follow_up",
            automationControls = WorkflowAutomationAdvancedControls(
                maxRunsPerCase = 0,
                simulationOnly = true,
                summary = "Workspace override forces simulation only."
            ),
            summary = "Workspace override applied."
        )
        val run = OperatorWorkflowRun(
            runId = "run_m21_1",
            templateId = "wf_provider_follow_up",
            templateName = "Provider Follow-up",
            status = OperatorWorkflowRunStatus.ACTIVE,
            currentStage = OperatorWorkflowStage.WAITING_SYNC,
            policyProfile = WorkflowPolicyProfile(
                policyId = "wf_policy_provider_follow_up",
                version = "m21_v1",
                summary = "Resolved policy for M21."
            ),
            policyPack = pack,
            policyPackBinding = binding,
            tenantOverride = tenantOverride,
            workspaceOverride = workspaceOverride,
            advancedAutomationControls = WorkflowAutomationAdvancedControls(
                maxRunsPerCase = 0,
                simulationOnly = true,
                summary = "Resolved controls are simulation-only."
            ),
            policyResolution = WorkflowPolicyResolutionTrace(
                precedenceSource = WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
                packId = pack.packId,
                packVersionId = binding.versionId,
                bindingId = binding.bindingId,
                tenantOverrideId = tenantOverride.overrideId,
                workspaceOverrideId = workspaceOverride.overrideId,
                simulationOnly = true,
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_WORKFLOW_POLICY_PACK_APPLIED,
                    RoleReasonCodes.ROLE_WORKFLOW_TENANT_OVERRIDE_APPLIED,
                    RoleReasonCodes.ROLE_WORKFLOW_WORKSPACE_OVERRIDE_APPLIED,
                    RoleReasonCodes.ROLE_AUTOMATION_SIMULATION_ONLY,
                    RoleReasonCodes.ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT
                ),
                summary = "Explicit constraints overrode workspace/tenant/pack policy."
            ),
            policyPackSummary = "Workspace pack v_m21_1 in simulation mode.",
            policyOverrideSummary = "Workspace override superseded tenant override.",
            automationControlSummary = "Automation simulation only with maxRunsPerCase=0.",
            policyResolutionSummary = "Explicit case constraints took precedence.",
            workflowSimulationOnly = true
        )
        val receipt = ExecutionReceipt(
            runId = "run_m21_1",
            intentSummary = "Validate M21 policy provenance",
            status = ResponseStatus.DISPUTED,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactSummary = "Workflow policy pack and overrides influenced automation.",
            approvalSummary = "No approval gate required.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "Provider selection pending manual review.",
            verificationSummary = "Verification pending.",
            proofSummary = "No new proof artifacts yet.",
            rollbackSummary = "Rollback available.",
            workflowPolicySummary = "Resolved policy for M21.",
            workflowPolicyPackId = pack.packId,
            workflowPolicyPackVersion = binding.versionId,
            workflowPolicyBindingId = binding.bindingId,
            tenantWorkflowOverrideId = tenantOverride.overrideId,
            workspaceWorkflowOverrideId = workspaceOverride.overrideId,
            workflowPolicyPrecedenceSource = WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
            workflowPolicyResolutionSummary = "Explicit constraints overrode pack and overrides.",
            workflowPolicyResolutionReasonCodes = listOf(
                RoleReasonCodes.ROLE_WORKFLOW_POLICY_PRECEDENCE_EXPLICIT_CONSTRAINT
            ),
            workflowSimulationOnly = true,
            workflowPolicyPackSummary = "Workspace pack v_m21_1 in simulation mode.",
            workflowPolicyOverrideSummary = "Workspace override superseded tenant override.",
            workflowAutomationControlSummary = "Automation simulation only with maxRunsPerCase=0."
        )
        val filter = GovernanceConsoleFilter(
            workflowPolicyPackId = pack.packId,
            workflowPolicyPackVersion = binding.versionId,
            policyOverrideAppliedOnly = true,
            workflowSimulationOnly = true,
            includeReviewed = true
        )
        val case = GovernanceCaseSummary(
            runId = "run_m21_1",
            workflowPolicyPackId = pack.packId,
            workflowPolicyPackVersion = binding.versionId,
            workflowPolicyPrecedenceSource = WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
            workflowSimulationOnly = true
        )

        val decodedRun = DomainJson.decode<OperatorWorkflowRun>(DomainJson.encode(run))
        assertEquals("pack_m21_ops", decodedRun.policyPack?.packId)
        assertEquals("workspace_override_m21", decodedRun.workspaceOverride?.overrideId)
        assertTrue(decodedRun.workflowSimulationOnly)
        assertEquals(
            WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
            decodedRun.policyResolution?.precedenceSource
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        assertEquals("pack_m21_ops", decodedReceipt.workflowPolicyPackId)
        assertEquals("v_m21_1", decodedReceipt.workflowPolicyPackVersion)
        assertTrue(decodedReceipt.workflowSimulationOnly == true)
        assertEquals(
            WorkflowPolicyPrecedenceSource.EXPLICIT_CONSTRAINT,
            decodedReceipt.workflowPolicyPrecedenceSource
        )

        val decodedFilter = DomainJson.decode<GovernanceConsoleFilter>(DomainJson.encode(filter))
        assertEquals("pack_m21_ops", decodedFilter.workflowPolicyPackId)
        assertEquals("v_m21_1", decodedFilter.workflowPolicyPackVersion)
        assertTrue(decodedFilter.policyOverrideAppliedOnly)
        assertTrue(decodedFilter.workflowSimulationOnly == true)

        val decodedCase = DomainJson.decode<GovernanceCaseSummary>(DomainJson.encode(case))
        assertEquals("pack_m21_ops", decodedCase.workflowPolicyPackId)
        assertEquals("v_m21_1", decodedCase.workflowPolicyPackVersion)
        assertTrue(decodedCase.workflowSimulationOnly)
    }

    @Test
    fun encodeDecode_m22WorkflowRolloutGovernanceRoundTrip() {
        val command = GovernanceCollaborationCommand(
            commandType = GovernanceActionType.PROMOTE_POLICY_ROLLOUT,
            actorUserId = "ops_admin",
            actorDisplayName = "Ops Admin",
            policyRolloutMode = PolicyRolloutMode.STAGED,
            policyRolloutScope = PolicyRolloutScope.WORKSPACE,
            policyRolloutReason = "Promote workspace rollout after simulation stability checks.",
            policyRolloutApprovalRequirement = PolicyRolloutApprovalRequirement.REQUIRED_FOR_PROMOTION
        )
        val decodedCommand = DomainJson.decode<GovernanceCollaborationCommand>(DomainJson.encode(command))
        assertEquals(PolicyRolloutMode.STAGED, decodedCommand.policyRolloutMode)
        assertEquals(PolicyRolloutScope.WORKSPACE, decodedCommand.policyRolloutScope)
        assertEquals(
            PolicyRolloutApprovalRequirement.REQUIRED_FOR_PROMOTION,
            decodedCommand.policyRolloutApprovalRequirement
        )

        val receipt = ExecutionReceipt(
            runId = "run_m22_rollout",
            intentSummary = "Validate rollout governance serialization.",
            status = ResponseStatus.SUCCESS,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            roleImpactSummary = "Rollout promotion requires approval and staged controls.",
            approvalSummary = "Approval pending.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "No external provider decision recorded.",
            verificationSummary = "No additional verification step was recorded.",
            proofSummary = "No proof artifacts were recorded.",
            rollbackSummary = "No rollback action was recorded.",
            workflowRolloutStage = PolicyRolloutStage.STAGED,
            workflowRolloutMode = PolicyRolloutMode.STAGED,
            workflowRolloutScope = PolicyRolloutScope.WORKSPACE,
            workflowRolloutApprovalState = PolicyRolloutApprovalState.PENDING,
            workflowRolloutFreezeState = PolicyRolloutFreezeState.NOT_FROZEN,
            workflowRolloutSummary = "Workflow policy rollout is staged in staged mode for workspace scope.",
            workflowRolloutApprovalSummary = "Rollout approval is pending before risky promotion or scope expansion.",
            workflowRolloutFreezeSummary = "Rollout freeze is not active.",
            workflowRolloutRollbackSummary = "No rollout rollback was recorded."
        )
        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        assertEquals(PolicyRolloutStage.STAGED, decodedReceipt.workflowRolloutStage)
        assertEquals(PolicyRolloutMode.STAGED, decodedReceipt.workflowRolloutMode)
        assertEquals(PolicyRolloutScope.WORKSPACE, decodedReceipt.workflowRolloutScope)
        assertEquals(PolicyRolloutApprovalState.PENDING, decodedReceipt.workflowRolloutApprovalState)
        assertEquals(PolicyRolloutFreezeState.NOT_FROZEN, decodedReceipt.workflowRolloutFreezeState)
        assertTrue(decodedReceipt.workflowRolloutSummary?.contains("staged", ignoreCase = true) == true)
    }

    @Test
    fun encodeDecode_m23PolicyPromotionAnalyticsAndApprovalRoundTrip() {
        val readiness = PromotionReadinessResult(
            status = PolicyPromotionReadinessStatus.HOLD,
            blockers = listOf(
                PolicyPromotionBlocker(
                    type = PolicyPromotionBlockerType.APPROVAL_PENDING,
                    code = "approval_pending",
                    summary = "Promotion is waiting for approval operations to complete.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_POLICY_APPROVAL_PENDING)
                )
            ),
            recommendation = PolicyPromotionRecommendation(
                action = PolicyPromotionRecommendationType.HOLD,
                summary = "Hold promotion until evidence and approval blockers are cleared.",
                reasonCodes = listOf(RoleReasonCodes.ROLE_POLICY_ANALYTICS_RECOMMENDATION_HOLD)
            ),
            summary = "Promotion readiness is on hold pending blocker resolution."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m23_policy_promotion",
            intentSummary = "Validate policy promotion serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_PROMOTION_REQUESTED,
                RoleReasonCodes.ROLE_POLICY_APPROVAL_PENDING
            ),
            roleImpactSummary = "Policy promotion request is pending approval.",
            approvalSummary = "Policy approval pending.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "No external provider decision recorded.",
            verificationSummary = "No additional verification step was recorded.",
            proofSummary = "No proof artifacts were recorded.",
            rollbackSummary = "No rollback action was recorded.",
            policyPromotionStatus = PolicyPromotionStatus.APPROVAL_PENDING,
            policyPromotionSummary = "Policy promotion requested for staged rollout at workspace scope.",
            policyPromotionReadinessSummary = "Promotion readiness is on hold pending blocker resolution.",
            policyPromotionBlockerSummary = "Promotion is waiting for approval operations to complete.",
            policyPromotionRecommendationSummary = "Hold promotion until evidence and approval blockers are cleared.",
            policyPromotionReadiness = readiness,
            policyRolloutAnalytics = RolloutAnalyticsSummary(
                totalRuns = 4,
                simulationRuns = 2,
                approvalPendingCount = 1,
                summary = "Rollout analytics: total 4, simulation 2, pending approvals 1, denied approvals 0."
            ),
            policyApprovalOperations = listOf(
                ApprovalOperationQueueItem(
                    operationId = "promotion_op_1",
                    operationType = ApprovalOperationType.PROMOTION_APPROVAL,
                    status = ApprovalOperationStatus.PENDING,
                    action = GovernanceActionType.APPROVE_POLICY_PROMOTION,
                    requiredPermission = OperatorPermission.APPROVE_POLICY_ROLLOUT,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_POLICY_APPROVAL_PENDING),
                    summary = "Approval operation queued for policy promotion."
                )
            ),
            policyApprovalReviewSummary = ApprovalReviewSummary(
                pendingCount = 1,
                approvedCount = 0,
                rejectedCount = 0,
                summary = "Approval queue pending 1, approved 0, rejected 0."
            )
        )
        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        assertEquals(PolicyPromotionStatus.APPROVAL_PENDING, decodedReceipt.policyPromotionStatus)
        assertEquals(PolicyPromotionReadinessStatus.HOLD, decodedReceipt.policyPromotionReadiness?.status)
        assertEquals(1, decodedReceipt.policyApprovalOperations.size)
        assertEquals(ApprovalOperationStatus.PENDING, decodedReceipt.policyApprovalOperations.first().status)
        assertTrue(decodedReceipt.policyRolloutAnalytics?.summary?.contains("Rollout analytics", ignoreCase = true) == true)
        assertTrue(decodedReceipt.policyPromotionRecommendationSummary?.contains("Hold promotion", ignoreCase = true) == true)
    }

    @Test
    fun encodeDecode_m24GovernanceProgramLifecycleAndCrossTenantRoundTrip() {
        val command = GovernanceCollaborationCommand(
            commandType = GovernanceActionType.CREATE_POLICY_GOVERNANCE_PROGRAM,
            actorUserId = "ops_governance",
            actorDisplayName = "Ops Governance",
            policyProgramId = "program_m24_ops",
            policyProgramName = "M24 Governance Program",
            policyProgramWaveId = "wave_2",
            policyProgramWaveStatus = PolicyGovernanceWaveStatus.ADVANCING,
            policyExemptionReason = "Tenant requires legal hold.",
            policyPinPackVersionId = "v_m24_safe",
            policyReplacementPackId = "pack_m24_new",
            policyReplacementPackVersionId = "v_m24_new_3",
            policyLifecycleReason = "Retire legacy pack after wave completion."
        )
        val decodedCommand = DomainJson.decode<GovernanceCollaborationCommand>(DomainJson.encode(command))
        assertEquals("program_m24_ops", decodedCommand.policyProgramId)
        assertEquals(PolicyGovernanceWaveStatus.ADVANCING, decodedCommand.policyProgramWaveStatus)
        assertEquals("v_m24_safe", decodedCommand.policyPinPackVersionId)
        assertEquals("pack_m24_new", decodedCommand.policyReplacementPackId)

        val governanceProgram = PolicyGovernanceProgram(
            programId = "program_m24_ops",
            name = "M24 Governance Program",
            status = PolicyGovernanceProgramStatus.ACTIVE,
            currentWaveId = "wave_2",
            waves = listOf(
                PolicyGovernanceProgramWave(
                    waveId = "wave_2",
                    name = "Wave 2",
                    status = PolicyGovernanceWaveStatus.ADVANCING
                )
            ),
            summary = "Program is active and advancing wave 2."
        )
        val crossTenant = CrossTenantRolloutSummary(
            totalTargets = 12,
            adoptedTargets = 8,
            driftedTargets = 2,
            exemptedTargets = 1,
            pinnedTargets = 1,
            blockedTargets = 1,
            readinessStatus = CrossTenantRolloutReadinessStatus.HOLD,
            summary = "Cross-tenant rollout held pending drift remediation."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m24_policy_program",
            intentSummary = "Validate governance program lifecycle serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_PROGRAM_CREATED,
                RoleReasonCodes.ROLE_POLICY_TARGET_PINNED,
                RoleReasonCodes.ROLE_POLICY_CROSS_TENANT_ROLLOUT_HELD
            ),
            roleImpactSummary = "Policy governance program advanced with cross-tenant controls.",
            approvalSummary = "Policy approval pending for risky scope expansion.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "No external provider decision recorded.",
            verificationSummary = "No additional verification step was recorded.",
            proofSummary = "No proof artifacts were recorded.",
            rollbackSummary = "No rollback action was recorded.",
            workflowPolicyGovernanceProgram = governanceProgram,
            workflowCrossTenantRolloutSummary = crossTenant,
            workflowPackLifecycleStatus = WorkflowPolicyPackLifecycleStatus.DEPRECATED,
            workflowPackReplacementPlan = WorkflowPolicyPackReplacementPlan(
                replacementId = "replacement_m24_1",
                fromPackId = "pack_m24_old",
                toPackId = "pack_m24_new",
                toPackVersionId = "v_m24_new_3",
                summary = "Replace pack_m24_old with pack_m24_new v3."
            ),
            workflowProgramSummary = "Program tracks adoption and blocker gates.",
            workflowCrossTenantSummary = "Cross-tenant rollout held due to drift and pins.",
            workflowPackLifecycleSummary = "Pack is deprecated and preparing retirement.",
            workflowPackDeprecationSummary = "Deprecation announced after replacement readiness.",
            workflowPackRetirementSummary = "Retirement blocked by active target pin.",
            workflowPackReplacementSummary = "Replacement pack_m24_new v3 staged."
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        assertEquals("program_m24_ops", decodedReceipt.workflowPolicyGovernanceProgram?.programId)
        assertEquals(PolicyGovernanceProgramStatus.ACTIVE, decodedReceipt.workflowPolicyGovernanceProgram?.status)
        assertEquals(CrossTenantRolloutReadinessStatus.HOLD, decodedReceipt.workflowCrossTenantRolloutSummary?.readinessStatus)
        assertEquals(WorkflowPolicyPackLifecycleStatus.DEPRECATED, decodedReceipt.workflowPackLifecycleStatus)
        assertEquals("pack_m24_new", decodedReceipt.workflowPackReplacementPlan?.toPackId)
        assertTrue(decodedReceipt.workflowPackRetirementSummary?.contains("blocked", ignoreCase = true) == true)
    }

    @Test
    fun encodeDecode_m25PolicyEstateSnapshotAndRemediationRoundTrip() {
        val receipt = ExecutionReceipt(
            runId = "run_m25_policy_estate",
            intentSummary = "Validate policy-estate analytics/remediation serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_POLICY_ESTATE_SNAPSHOT_COMPUTED,
                RoleReasonCodes.ROLE_POLICY_ESTATE_DRIFT_SEVERITY_HIGH,
                RoleReasonCodes.ROLE_POLICY_ESTATE_REMEDIATION_RECOMMENDED
            ),
            roleImpactSummary = "Policy estate drift detected with remediation pending.",
            approvalSummary = "No additional approval gate required.",
            dataScopeSummary = "No additional data-scope restrictions were recorded.",
            providerSummary = "No external provider decision recorded.",
            verificationSummary = "No additional verification step was recorded.",
            proofSummary = "No proof artifacts were recorded.",
            rollbackSummary = "No rollback action was recorded.",
            policyEstateSnapshot = PolicyEstateSnapshot(
                snapshotId = "estate_m25_1",
                summary = "Policy estate snapshot computed across tenant/workspace targets.",
                driftRecords = listOf(
                    PolicyEstateDriftRecord(
                        driftId = "drift_1",
                        type = PolicyEstateDriftType.PACK_VERSION_BEHIND_TARGET,
                        severity = PolicyEstateDriftSeverity.HIGH,
                        summary = "Workspace pack is behind target version."
                    )
                ),
                blockers = listOf(
                    PolicyEstateBlocker(
                        blockerId = "blocker_1",
                        severity = PolicyEstateDriftSeverity.HIGH,
                        summary = "Retirement blocked by active pinned target.",
                        acknowledged = false
                    )
                )
            ),
            policyEstateSummary = "Policy estate snapshot computed across tenant/workspace targets.",
            policyEstateDriftSummary = "1 drift record(s) detected · severity high.",
            policyEstateBlockerSummary = "1 blocker(s) active.",
            policyEstateRemediationSummary = "Remediation is pending scheduling.",
            policyEstateRemediationPlan = PolicyEstateRemediationPlan(
                planId = "plan_m25_1",
                status = PolicyEstateRemediationStatus.SCHEDULED,
                summary = "Schedule replacement adoption before retirement.",
                suggestions = listOf(
                    PolicyEstateRemediationSuggestion(
                        suggestionId = "suggestion_1",
                        action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                        summary = "Schedule replacement adoption for blocked target."
                    )
                ),
                actions = listOf(
                    PolicyEstateRemediationActionRecord(
                        actionId = "action_1",
                        action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                        status = PolicyEstateRemediationStatus.SCHEDULED,
                        summary = "Adoption scheduling queued."
                    )
                )
            ),
            policyEstateRemediationActions = listOf(
                PolicyEstateRemediationActionRecord(
                    actionId = "action_1",
                    action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                    status = PolicyEstateRemediationStatus.SCHEDULED,
                    summary = "Adoption scheduling queued."
                )
            )
        )
        val record = ExecutionReceiptRecord(
            recordId = "record_m25_policy_estate",
            runId = "run_m25_policy_estate",
            userId = "u_m25",
            sessionId = "s_m25",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = receipt,
            policyEstateSnapshot = receipt.policyEstateSnapshot,
            policyEstateSummary = receipt.policyEstateSummary.orEmpty(),
            policyEstateDriftSummary = receipt.policyEstateDriftSummary.orEmpty(),
            policyEstateBlockerSummary = receipt.policyEstateBlockerSummary.orEmpty(),
            policyEstateRemediationSummary = receipt.policyEstateRemediationSummary.orEmpty(),
            policyEstateRemediationPlan = receipt.policyEstateRemediationPlan,
            policyEstateRemediationActions = receipt.policyEstateRemediationActions
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))

        assertEquals(PolicyEstateDriftSeverity.HIGH, decodedReceipt.policyEstateSnapshot?.driftRecords?.firstOrNull()?.severity)
        assertEquals(PolicyEstateRemediationStatus.SCHEDULED, decodedReceipt.policyEstateRemediationPlan?.status)
        assertEquals(1, decodedReceipt.policyEstateRemediationActions.size)
        assertTrue(decodedReceipt.policyEstateSummary?.contains("policy estate", ignoreCase = true) == true)

        assertEquals(PolicyEstateDriftSeverity.HIGH, decodedRecord.policyEstateSnapshot?.driftRecords?.firstOrNull()?.severity)
        assertEquals(PolicyEstateRemediationStatus.SCHEDULED, decodedRecord.policyEstateRemediationPlan?.status)
        assertEquals(1, decodedRecord.policyEstateRemediationActions.size)
        assertTrue(decodedRecord.policyEstateRemediationSummary?.contains("pending", ignoreCase = true) == true)
    }

    @Test
    fun encodeDecode_m26EstateAutomationAndSchedulingRoundTrip() {
        val receipt = ExecutionReceipt(
            runId = "run_m26_policy_estate_automation",
            intentSummary = "Validate M26 estate automation serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED,
                RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED
            ),
            roleImpactSummary = "Estate automation is scheduled and waiting for approval.",
            approvalSummary = "Approval is required before risky automated remediation.",
            dataScopeSummary = "No additional data-scope restriction recorded.",
            providerSummary = "No provider decision involved for this governance action.",
            verificationSummary = "No additional verification step recorded.",
            proofSummary = "No proof artifacts recorded for this schedule-only action.",
            rollbackSummary = "No rollback action was triggered.",
            estateAutomationRule = EstateAutomationRule(
                ruleId = "rule_m26_estate",
                name = "M26 Safe Estate Remediation",
                enabled = true,
                allowScheduling = true,
                allowAutoApplySafe = true,
                summary = "Allows scheduling and safe auto-apply under bounded guardrails."
            ),
            estateAutomationEligibility = EstateAutomationEligibility(
                status = EstateAutomationEligibilityStatus.APPROVAL_REQUIRED,
                summary = "Eligible only after explicit approval.",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED,
                    RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED
                ),
                suppressionState = EstateAutomationSuppressionState.NONE,
                cooldownState = EstateAutomationCooldownState(
                    active = true,
                    cooldownMs = 3_600_000L,
                    remainingMs = 900_000L,
                    nextEligibleAtMs = 1_708_000_000L,
                    summary = "Cooldown active for 15 minutes."
                ),
                window = EstateAutomationWindow(
                    type = EstateAutomationWindowType.MAINTENANCE_WINDOW,
                    startMinuteOfDay = 120,
                    endMinuteOfDay = 420,
                    daysOfWeek = listOf(1, 2, 3, 4, 5),
                    timezone = "Europe/London",
                    active = true,
                    summary = "Weekday maintenance window."
                ),
                approvalRequirement = AutomationApprovalRequirement.REQUIRED_FOR_RISKY_OPERATION,
                approvalDecision = AutomationApprovalDecision.PENDING,
                evaluatedAtMs = 1_707_999_000L
            ),
            scheduledRemediationPlan = ScheduledRemediationPlan(
                scheduleId = "schedule_m26_1",
                action = PolicyEstateRemediationActionType.MOVE_TO_TARGET_PACK_VERSION,
                status = ScheduledRemediationStatus.APPROVAL_REQUIRED,
                target = ScheduledRemediationTarget(
                    scope = PolicyRolloutScope.WORKSPACE,
                    tenantId = "tenant_m26",
                    workspaceId = "workspace_m26",
                    packId = "pack_m26",
                    packVersionId = "v_m26_2",
                    summary = "Workspace target for M26 safe remediation."
                ),
                scheduledAtMs = 1_708_000_100L,
                scheduledBy = OperatorAssigneeRef(userId = "ops_admin", displayName = "Ops Admin"),
                nextRunAtMs = 1_708_000_100L,
                approvalRequirement = AutomationApprovalRequirement.REQUIRED_FOR_RISKY_OPERATION,
                approvalDecision = AutomationApprovalDecision.PENDING,
                suppressionState = EstateAutomationSuppressionState.NONE,
                cooldownState = EstateAutomationCooldownState(
                    active = false,
                    cooldownMs = 0L,
                    remainingMs = 0L
                ),
                window = EstateAutomationWindow(
                    type = EstateAutomationWindowType.MAINTENANCE_WINDOW,
                    startMinuteOfDay = 120,
                    endMinuteOfDay = 420,
                    timezone = "Europe/London",
                    active = true,
                    summary = "Weekday maintenance window."
                ),
                lastExecution = ScheduledRemediationExecution(
                    executionId = "exec_m26_1",
                    status = ScheduledRemediationStatus.APPROVAL_REQUIRED,
                    summary = "Execution blocked pending approval.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED),
                    executedAtMs = 1_708_000_200L
                ),
                result = ScheduledRemediationResult(
                    status = ScheduledRemediationStatus.APPROVAL_REQUIRED,
                    summary = "Execution deferred pending approval.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED)
                ),
                summary = "Scheduled remediation is waiting for approval.",
                reasonCodes = listOf(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED),
                updatedAtMs = 1_708_000_100L
            ),
            governanceProgramOperations = listOf(
                GovernanceProgramOperation(
                    operationId = "op_m26_schedule",
                    action = GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION,
                    status = GovernanceProgramOperationStatus.APPROVAL_REQUIRED,
                    summary = "Scheduled remediation queued with approval requirement.",
                    reasonCodes = listOf(
                        RoleReasonCodes.ROLE_ESTATE_AUTOMATION_SCHEDULED,
                        RoleReasonCodes.ROLE_ESTATE_AUTOMATION_APPROVAL_REQUIRED
                    ),
                    actor = OperatorAssigneeRef(userId = "ops_admin", displayName = "Ops Admin"),
                    timestampMs = 1_708_000_100L
                )
            ),
            automationReplaySummary = AutomationReplaySummary(
                executedCount = 0,
                scheduledCount = 1,
                blockedCount = 0,
                suppressedCount = 0,
                approvalRequiredCount = 1,
                summary = "1 scheduled, 1 approval-required operation.",
                updatedAtMs = 1_708_000_300L
            ),
            automationCancellationRecords = listOf(
                AutomationCancellationRecord(
                    cancellationId = "cancel_m26_1",
                    scheduleId = "schedule_m26_1",
                    reason = "Paused by operator during maintenance freeze.",
                    reasonCodes = listOf(RoleReasonCodes.ROLE_ESTATE_AUTOMATION_CANCELLED),
                    cancelledBy = OperatorAssigneeRef(userId = "ops_admin", displayName = "Ops Admin"),
                    cancelledAtMs = 1_708_000_400L
                )
            )
        )

        val record = ExecutionReceiptRecord(
            recordId = "record_m26_policy_estate_automation",
            runId = "run_m26_policy_estate_automation",
            userId = "u_m26",
            sessionId = "s_m26",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = receipt,
            estateAutomationRule = receipt.estateAutomationRule,
            estateAutomationEligibility = receipt.estateAutomationEligibility,
            scheduledRemediationPlan = receipt.scheduledRemediationPlan,
            governanceProgramOperations = receipt.governanceProgramOperations,
            automationReplaySummary = receipt.automationReplaySummary,
            automationCancellationRecords = receipt.automationCancellationRecords
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))

        assertEquals(EstateAutomationEligibilityStatus.APPROVAL_REQUIRED, decodedReceipt.estateAutomationEligibility?.status)
        assertEquals(ScheduledRemediationStatus.APPROVAL_REQUIRED, decodedReceipt.scheduledRemediationPlan?.status)
        assertEquals(1, decodedReceipt.governanceProgramOperations.size)
        assertEquals(1, decodedReceipt.automationCancellationRecords.size)
        assertTrue(decodedReceipt.automationReplaySummary?.summary?.contains("approval-required", ignoreCase = true) == true)

        assertEquals(EstateAutomationEligibilityStatus.APPROVAL_REQUIRED, decodedRecord.estateAutomationEligibility?.status)
        assertEquals(ScheduledRemediationStatus.APPROVAL_REQUIRED, decodedRecord.scheduledRemediationPlan?.status)
        assertEquals(1, decodedRecord.governanceProgramOperations.size)
        assertEquals(1, decodedRecord.automationCancellationRecords.size)
    }

    @Test
    fun encodeDecode_m27SchedulingWindowsAndRolloutCalendarRoundTrip() {
        val rolloutState = WorkflowPolicyRolloutState(
            stage = PolicyRolloutStage.STAGED,
            mode = PolicyRolloutMode.STAGED,
            target = PolicyRolloutTarget(
                scope = PolicyRolloutScope.WORKSPACE,
                tenantId = "tenant_m27",
                workspaceId = "workspace_m27",
                workflowTemplateId = "wf_provider_follow_up"
            ),
            policySchedulingWindow = PolicySchedulingWindow(
                windowId = "window_m27_1",
                windowType = SchedulingWindowType.MAINTENANCE_WINDOW,
                status = SchedulingWindowStatus.DEFERRED,
                timezone = "Europe/London",
                nextEligibleAtMs = 1_709_000_000L,
                summary = "Waiting for maintenance window."
            ),
            calendarEvaluation = CalendarEvaluationResult(
                decision = ExecutionWindowDecision.DEFERRED,
                windowStatus = SchedulingWindowStatus.DEFERRED,
                blockReason = ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
                nextEligibleAtMs = 1_709_000_000L,
                summary = "Rollout deferred by schedule policy.",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_SCHEDULE_WAITING_FOR_MAINTENANCE_WINDOW,
                    RoleReasonCodes.ROLE_ROLLOUT_STAGE_DEFERRED_BY_CALENDAR
                )
            ),
            rolloutCalendar = RolloutCalendar(
                calendarId = "calendar_m27_1",
                currentWaveId = "wave_m27_a",
                currentStage = PolicyRolloutStage.STAGED,
                entries = listOf(
                    RolloutCalendarEntry(
                        entryId = "entry_m27_1",
                        waveId = "wave_m27_a",
                        stage = PolicyRolloutStage.STAGED,
                        status = RolloutCalendarEntryStatus.DEFERRED,
                        summary = "Deferred until maintenance window.",
                        reasonCodes = listOf(RoleReasonCodes.ROLE_ROLLOUT_STAGE_DEFERRED_BY_CALENDAR),
                        updatedAtMs = 1_708_999_900L
                    )
                ),
                summary = "Rollout calendar deferred for staged wave.",
                updatedAtMs = 1_708_999_900L
            ),
            scheduleSummary = "Rollout is deferred by schedule policy. Waiting for maintenance window.",
            rolloutCalendarSummary = "Rollout calendar deferred for staged wave."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m27_schedule",
            intentSummary = "Validate M27 scheduling and rollout calendar serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_SCHEDULE_WAITING_FOR_MAINTENANCE_WINDOW,
                RoleReasonCodes.ROLE_ROLLOUT_STAGE_DEFERRED_BY_CALENDAR
            ),
            roleImpactSummary = "Rollout is deferred by schedule policy.",
            approvalSummary = "No additional approval required for scheduling state inspection.",
            dataScopeSummary = "No additional data-scope restrictions.",
            providerSummary = "No provider decision for this schedule-only run.",
            verificationSummary = "No verification step required.",
            proofSummary = "No proof artifacts for schedule-only state.",
            rollbackSummary = "No rollback action triggered.",
            workflowPolicyRolloutState = rolloutState
        )
        val record = ExecutionReceiptRecord(
            recordId = "record_m27_schedule",
            runId = "run_m27_schedule",
            userId = "u_m27",
            sessionId = "s_m27",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = receipt,
            workflowRun = OperatorWorkflowRun(
                runId = "run_m27_schedule",
                templateId = "wf_provider_follow_up",
                status = OperatorWorkflowRunStatus.ACTIVE,
                currentStage = OperatorWorkflowStage.WAITING_SYNC,
                policyRolloutState = rolloutState
            )
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))

        assertEquals(
            SchedulingWindowStatus.DEFERRED,
            decodedReceipt.workflowPolicyRolloutState?.policySchedulingWindow?.status
        )
        assertEquals(
            ExecutionWindowDecision.DEFERRED,
            decodedReceipt.workflowPolicyRolloutState?.calendarEvaluation?.decision
        )
        assertEquals(
            ExecutionWindowBlockReason.WAITING_MAINTENANCE_WINDOW,
            decodedReceipt.workflowPolicyRolloutState?.calendarEvaluation?.blockReason
        )
        assertEquals(
            RolloutCalendarEntryStatus.DEFERRED,
            decodedReceipt.workflowPolicyRolloutState?.rolloutCalendar?.entries?.firstOrNull()?.status
        )
        assertTrue(
            decodedReceipt.workflowPolicyRolloutState?.scheduleSummary
                ?.contains("maintenance window", ignoreCase = true) == true
        )
        assertEquals(
            SchedulingWindowStatus.DEFERRED,
            decodedRecord.workflowRun?.policyRolloutState?.policySchedulingWindow?.status
        )
        assertEquals(
            ExecutionWindowDecision.DEFERRED,
            decodedRecord.workflowRun?.policyRolloutState?.calendarEvaluation?.decision
        )
    }

    @Test
    fun encodeDecode_m28RolloutWaveWindowAndCrossWindowRoundTrip() {
        val rolloutState = WorkflowPolicyRolloutState(
            stage = PolicyRolloutStage.STAGED,
            mode = PolicyRolloutMode.STAGED,
            target = PolicyRolloutTarget(
                scope = PolicyRolloutScope.WORKSPACE,
                tenantId = "tenant_m28",
                workspaceId = "workspace_m28",
                workflowTemplateId = "wf_provider_follow_up"
            ),
            rolloutWaves = listOf(
                RolloutWave(
                    waveId = "wave_m28_a",
                    waveIndex = 2,
                    name = "Wave 2",
                    status = RolloutWaveStatus.CARRIED_FORWARD,
                    completionState = RolloutWaveCompletionState.CARRIED_FORWARD,
                    progress = RolloutWaveProgress(
                        totalTargets = 5,
                        completedTargets = 2,
                        pendingTargets = 3,
                        carriedForwardTargets = 3,
                        summary = "Completed 2/5 targets; carry-forward pending."
                    ),
                    carryForwardState = RolloutWaveCarryForwardState(
                        carryForwardEnabled = true,
                        carryForwardPending = true,
                        pendingTargets = 3,
                        nextEligibleAtMs = 1_710_100_000L,
                        summary = "Pending targets carried forward."
                    ),
                    summary = "Wave 2 carried forward.",
                    updatedAtMs = 1_710_000_000L
                )
            ),
            currentRolloutWaveId = "wave_m28_a",
            currentRolloutWaveStatus = RolloutWaveStatus.CARRIED_FORWARD,
            currentRolloutWaveCompletionState = RolloutWaveCompletionState.CARRIED_FORWARD,
            calendarAwarePromotionDecision = CalendarAwarePromotionDecision(
                promotionId = "promotion_m28_1",
                waveId = "wave_m28_a",
                windowEligibility = PromotionWindowEligibility.DEFERRED,
                decisionType = RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW,
                blockReason = CrossWindowHoldReason.MAINTENANCE_WINDOW,
                nextEligibleWindow = NextEligibleWindowSummary(
                    nextEligibleAtMs = 1_710_100_000L,
                    windowId = "window_m28_2",
                    summary = "Next eligible window selected."
                ),
                summary = "Wave deferred to next eligible window.",
                createdAtMs = 1_710_000_000L
            ),
            crossWindowGovernanceControl = CrossWindowGovernanceControl(
                controlId = "cw_m28_1",
                scope = PolicyRolloutScope.WORKSPACE,
                pauseState = CrossWindowPauseState.PAUSED,
                holdReason = CrossWindowHoldReason.GOVERNANCE_PAUSE,
                summary = "Cross-window rollout paused.",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_CROSS_WINDOW_PAUSED,
                    RoleReasonCodes.ROLE_PROMOTION_WINDOW_DEFERRED
                ),
                updatedAtMs = 1_710_000_000L
            ),
            rolloutWaveSummary = "Wave 2 carried forward to next window.",
            crossWindowGovernanceSummary = "Cross-window rollout paused by governance control.",
            nextEligibleWindowSummary = "Next eligible window starts at 1710100000."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m28_rollout",
            intentSummary = "Validate M28 rollout wave serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ROLLOUT_WAVE_CARRIED_FORWARD,
                RoleReasonCodes.ROLE_PROMOTION_WINDOW_DEFERRED,
                RoleReasonCodes.ROLE_CROSS_WINDOW_PAUSED
            ),
            roleImpactSummary = "Wave deferred and carried forward by calendar governance.",
            approvalSummary = "Approval pending for next promotion window.",
            dataScopeSummary = "No additional data-scope restrictions.",
            providerSummary = "No provider decision for rollout governance run.",
            verificationSummary = "No verification step required.",
            proofSummary = "No proof artifacts for governance-only run.",
            rollbackSummary = "No rollback action triggered.",
            workflowPolicyRolloutState = rolloutState,
            rolloutWaveSummary = rolloutState.rolloutWaveSummary,
            calendarAwarePromotionSummary = rolloutState.calendarAwarePromotionDecision?.summary.orEmpty(),
            crossWindowGovernanceSummary = rolloutState.crossWindowGovernanceSummary,
            currentRolloutWaveId = rolloutState.currentRolloutWaveId,
            currentRolloutWaveStatus = rolloutState.currentRolloutWaveStatus,
            currentRolloutWaveCompletionState = rolloutState.currentRolloutWaveCompletionState,
            currentRolloutWaveDecision = rolloutState.calendarAwarePromotionDecision?.decisionType,
            currentRolloutWindowEligibility = rolloutState.calendarAwarePromotionDecision?.windowEligibility,
            rolloutCarryForwardPending = true,
            rolloutNextWindowPending = true,
            rolloutCrossWindowPaused = true
        )
        val record = ExecutionReceiptRecord(
            recordId = "record_m28_rollout",
            runId = "run_m28_rollout",
            userId = "u_m28",
            sessionId = "s_m28",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = receipt,
            workflowRun = OperatorWorkflowRun(
                runId = "run_m28_rollout",
                templateId = "wf_provider_follow_up",
                status = OperatorWorkflowRunStatus.ACTIVE,
                currentStage = OperatorWorkflowStage.WAITING_SYNC,
                policyRolloutState = rolloutState
            )
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))

        assertEquals("wave_m28_a", decodedReceipt.currentRolloutWaveId)
        assertEquals(RolloutWaveStatus.CARRIED_FORWARD, decodedReceipt.currentRolloutWaveStatus)
        assertEquals(RolloutWaveCompletionState.CARRIED_FORWARD, decodedReceipt.currentRolloutWaveCompletionState)
        assertEquals(RolloutWaveDecisionType.DEFER_TO_NEXT_WINDOW, decodedReceipt.currentRolloutWaveDecision)
        assertEquals(PromotionWindowEligibility.DEFERRED, decodedReceipt.currentRolloutWindowEligibility)
        assertTrue(decodedReceipt.rolloutCarryForwardPending)
        assertTrue(decodedReceipt.rolloutNextWindowPending)
        assertTrue(decodedReceipt.rolloutCrossWindowPaused)
        assertEquals(
            CrossWindowPauseState.PAUSED,
            decodedRecord.workflowRun?.policyRolloutState?.crossWindowGovernanceControl?.pauseState
        )
        assertEquals(
            PromotionWindowEligibility.DEFERRED,
            decodedRecord.workflowRun?.policyRolloutState?.calendarAwarePromotionDecision?.windowEligibility
        )
    }

    @Test
    fun encodeDecode_m29PromotionReadinessCrossWaveWindowImpactRoundTrip() {
        val candidate = RolloutPromotionCandidate(
            candidateId = "candidate_m29_1",
            waveId = "wave_m28_a",
            waveIndex = 2,
            targetScope = PolicyRolloutScope.WORKSPACE,
            windowEligibility = PromotionWindowEligibility.DEFERRED,
            nextEligibleAtMs = 1_711_000_000L,
            summary = "Wave 2 candidate deferred to next window."
        )
        val readiness = RolloutPromotionReadinessSummary(
            status = RolloutPromotionReadinessStatus.DEFERRED,
            candidate = candidate,
            blockers = listOf(
                RolloutPromotionBlocker(
                    blockerId = "blocker_m29_approval",
                    severity = PolicyEstateDriftSeverity.HIGH,
                    summary = "Approval operations remain pending."
                )
            ),
            recommendation = RolloutPromotionOperationType.DEFER,
            summary = "Promotion deferred until approval and window blockers are resolved."
        )
        val crossWave = CrossWaveAnalyticsSummary(
            healthBucket = WaveHealthBucket.CAUTION,
            totalWaves = 4,
            completedWaves = 1,
            blockedWaves = 1,
            deferredWaves = 2,
            carriedForwardWaves = 1,
            carryForwardPressure = true,
            summary = "Cross-wave caution with carry-forward pressure."
        )
        val windowImpact = WindowImpactSummary(
            decision = ExecutionWindowDecision.DEFERRED,
            windowStatus = SchedulingWindowStatus.DEFERRED,
            eligibility = PromotionWindowEligibility.DEFERRED,
            delayReason = WindowDelayReason.MAINTENANCE_WINDOW,
            nextEligibleAtMs = 1_711_000_000L,
            blockedTargets = 2,
            summary = "Window impact delayed due to maintenance window."
        )
        val operation = RolloutPromotionOperationRecord(
            operationId = "operation_m29_defer",
            type = RolloutPromotionOperationType.DEFER,
            status = GovernanceProgramOperationStatus.SCHEDULED,
            summary = "Deferred promotion to the next eligible window."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m29_rollout",
            intentSummary = "Validate M29 rollout promotion serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ROLLOUT_PROMOTION_DEFERRED_TO_WINDOW,
                RoleReasonCodes.ROLE_CROSS_WAVE_CARRY_FORWARD_PRESSURE,
                RoleReasonCodes.ROLE_WINDOW_BLOCK_MAINTENANCE,
                RoleReasonCodes.ROLE_ROLLOUT_PROMOTION_OPERATION_DEFER
            ),
            roleImpactSummary = "Promotion deferred by rollout readiness and window policy.",
            approvalSummary = "Approval still required before promotion.",
            dataScopeSummary = "No additional data-scope changes.",
            providerSummary = "No provider path for governance-only operation.",
            verificationSummary = "Verification not required for this governance action.",
            proofSummary = "Proof collected from rollout and approval records.",
            rollbackSummary = "Rollback remains available if promotion fails.",
            rolloutPromotionCandidate = candidate,
            rolloutPromotionReadiness = readiness,
            crossWaveAnalyticsSummary = crossWave,
            windowImpactSummary = windowImpact,
            rolloutPromotionOperation = operation,
            rolloutPromotionReadinessSummary = readiness.summary,
            crossWaveSummary = crossWave.summary,
            windowImpactReadableSummary = windowImpact.summary,
            rolloutPromotionOperationSummary = operation.summary
        )
        val record = ExecutionReceiptRecord(
            recordId = "record_m29_rollout",
            runId = "run_m29_rollout",
            userId = "u_m29",
            sessionId = "s_m29",
            module = ModuleId.LIX,
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            receipt = receipt
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        val decodedRecord = DomainJson.decode<ExecutionReceiptRecord>(DomainJson.encode(record))

        assertEquals(RolloutPromotionReadinessStatus.DEFERRED, decodedReceipt.rolloutPromotionReadiness?.status)
        assertEquals(WaveHealthBucket.CAUTION, decodedReceipt.crossWaveAnalyticsSummary?.healthBucket)
        assertEquals(WindowDelayReason.MAINTENANCE_WINDOW, decodedReceipt.windowImpactSummary?.delayReason)
        assertEquals(RolloutPromotionOperationType.DEFER, decodedReceipt.rolloutPromotionOperation?.type)
        assertEquals(
            GovernanceProgramOperationStatus.SCHEDULED,
            decodedReceipt.rolloutPromotionOperation?.status
        )
        assertEquals("candidate_m29_1", decodedRecord.receipt?.rolloutPromotionCandidate?.candidateId)
        assertEquals(
            RolloutPromotionReadinessStatus.DEFERRED,
            decodedRecord.receipt?.rolloutPromotionReadiness?.status
        )
    }

    @Test
    fun encodeDecode_m30ProgramCoordinationRoundTrip() {
        val coordination = RolloutProgramCoordinationRecord(
            programId = "program_beta",
            programName = "Program Beta",
            priority = RolloutProgramPriority.HIGH,
            coordinationState = RolloutProgramCoordinationState.DEFERRED,
            decisionReason = RolloutProgramDecisionReason.DEPENDENCY_BLOCK,
            priorityDecision = RolloutProgramPriorityDecision(
                decisionId = "decision_m30_1",
                selectedProgramId = "program_alpha",
                selectedPriority = RolloutProgramPriority.HIGH,
                deferredProgramIds = listOf("program_beta"),
                decisionReason = RolloutProgramDecisionReason.PRIORITY_WIN,
                summary = "Program alpha selected due to higher priority."
            ),
            dependencies = listOf(
                RolloutProgramDependency(
                    dependencyId = "dep_m30_1",
                    programId = "program_beta",
                    dependsOnProgramId = "program_alpha",
                    blocked = true,
                    summary = "Blocked by dependency on program alpha."
                )
            ),
            conflicts = listOf(
                RolloutProgramConflict(
                    conflictId = "conflict_m30_1",
                    withProgramId = "program_gamma",
                    type = RolloutProgramConflictType.WINDOW_OVERLAP,
                    severity = RolloutProgramConflictSeverity.HIGH,
                    summary = "Shared window conflict detected with program gamma."
                )
            ),
            contention = RolloutProgramContentionSummary(
                type = RolloutProgramContentionType.WINDOW,
                level = RolloutProgramContentionLevel.HIGH,
                contendedProgramIds = listOf("program_alpha", "program_gamma"),
                summary = "Window overlap contention detected."
            ),
            escalation = RolloutProgramEscalationState(
                escalationId = "esc_m30_1",
                status = RolloutProgramEscalationStatus.OPEN,
                reason = RolloutProgramEscalationReason.REPEATED_DEFER,
                summary = "Escalated after repeated defer."
            ),
            summary = "Program beta deferred due to dependency and contention."
        )
        val crossProgram = CrossProgramGovernanceSummary(
            activeProgramId = "program_alpha",
            competingProgramCount = 3,
            deferredProgramCount = 2,
            blockedProgramCount = 1,
            escalatedProgramCount = 1,
            contentionType = RolloutProgramContentionType.WINDOW,
            contentionLevel = RolloutProgramContentionLevel.HIGH,
            summary = "Cross-program contention remains high; escalation open."
        )
        val receipt = ExecutionReceipt(
            runId = "run_m30_coordination",
            intentSummary = "Validate M30 program coordination serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_PRIORITY_APPLIED,
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_BLOCKED_BY_DEPENDENCY,
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_WINDOW_CONTENTION,
                RoleReasonCodes.ROLE_ROLLOUT_PROGRAM_ESCALATION_OPENED
            ),
            roleImpactSummary = "Program deferred and escalated under multi-program governance.",
            approvalSummary = "Approval pending before next window promotion.",
            dataScopeSummary = "No additional data-scope restrictions.",
            providerSummary = "No provider decision for governance-only run.",
            verificationSummary = "No verification required.",
            proofSummary = "No proof artifacts required.",
            rollbackSummary = "No rollback action triggered.",
            programCoordination = coordination,
            crossProgramGovernanceSummary = crossProgram,
            programCoordinationSummary = coordination.summary,
            crossProgramSummary = crossProgram.summary,
            programEscalationSummary = coordination.escalation?.summary.orEmpty()
        )
        val filter = GovernanceConsoleFilter(
            includeReviewed = true,
            programCoordinationState = RolloutProgramCoordinationState.DEFERRED,
            programContentionType = RolloutProgramContentionType.WINDOW,
            programContentionLevel = RolloutProgramContentionLevel.HIGH,
            programEscalationStatus = RolloutProgramEscalationStatus.OPEN,
            priorityDeferredOnly = true,
            dependencyBlockedOnly = true,
            coordinationEscalatedOnly = true,
            contentionOnly = true
        )
        val encodedReceipt = DomainJson.encode(receipt)
        val encodedFilter = DomainJson.encode(filter)
        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(encodedReceipt)
        val decodedFilter = DomainJson.decode<GovernanceConsoleFilter>(encodedFilter)

        assertEquals(RolloutProgramCoordinationState.DEFERRED, decodedReceipt.programCoordination?.coordinationState)
        assertEquals(RolloutProgramPriority.HIGH, decodedReceipt.programCoordination?.priorityDecision?.selectedPriority)
        assertEquals(RolloutProgramDecisionReason.PRIORITY_WIN, decodedReceipt.programCoordination?.priorityDecision?.decisionReason)
        assertEquals(RolloutProgramEscalationStatus.OPEN, decodedReceipt.programCoordination?.escalation?.status)
        assertEquals(RolloutProgramContentionType.WINDOW, decodedReceipt.crossProgramGovernanceSummary?.contentionType)
        assertEquals("Cross-program contention remains high; escalation open.", decodedReceipt.crossProgramSummary)
        assertEquals(RolloutProgramCoordinationState.DEFERRED, decodedFilter.programCoordinationState)
        assertEquals(RolloutProgramContentionType.WINDOW, decodedFilter.programContentionType)
        assertEquals(RolloutProgramContentionLevel.HIGH, decodedFilter.programContentionLevel)
        assertEquals(RolloutProgramEscalationStatus.OPEN, decodedFilter.programEscalationStatus)
        assertTrue(decodedFilter.priorityDeferredOnly)
        assertTrue(decodedFilter.dependencyBlockedOnly)
        assertTrue(decodedFilter.coordinationEscalatedOnly)
        assertTrue(decodedFilter.contentionOnly)
    }

    @Test
    fun encodeDecode_m31CapacityPlanningRoundTrip() {
        val capacityPool = GovernanceCapacityPool(
            poolKey = "workspace_finance",
            scope = GovernanceCapacityScope.WORKSPACE,
            scopeId = "workspace_finance",
            loadBucket = ApprovalLoadBucket.SATURATED,
            budget = ApprovalCapacityBudget(
                availableSlots = 0,
                requestedSlots = 18,
                reservedSlots = 1,
                utilizationRate = 1.0,
                summary = "No immediate approval slots remain."
            ),
            nextAvailableAtMs = 1_700_000_450_000,
            summary = "Approval queue saturated for workspace_finance."
        )
        val queuePressure = ApprovalQueuePressureSummary(
            poolKey = "workspace_finance",
            loadBucket = ApprovalLoadBucket.SATURATED,
            pendingApprovals = 16,
            inFlightApprovals = 2,
            blockedApprovals = 6,
            summary = "Approval queue is saturated (16 pending / 2 ready)."
        )
        val balancingDecision = ApprovalBalancingDecision(
            decisionType = ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
            fromPoolKey = "workspace_finance",
            toPoolKey = "workspace_general",
            deferralReason = ApprovalDeferralReason.QUEUE_SATURATED,
            applied = true,
            deferUntilMs = 1_700_000_550_000,
            summary = "Deferred lower-priority approvals due to saturation."
        )
        val assignmentRecommendation = ApprovalAssignmentRecommendation(
            recommendedPoolKey = "workspace_general",
            recommendedAssigneeId = "ops_tier2",
            recommendedAssigneeDisplayName = "Ops Tier 2",
            summary = "Reassign approvals to Ops Tier 2 after capacity recovers."
        )
        val capacityDecision = CapacityAwarePromotionDecision(
            decisionId = "decision_m31_1",
            allowedNow = false,
            capacityBlocked = true,
            policyBlocked = true,
            decisionType = ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
            deferralReason = ApprovalDeferralReason.QUEUE_SATURATED,
            summary = "Promotion blocked by capacity saturation and explicit policy gate."
        )
        val portfolioSnapshot = PortfolioCapacitySnapshot(
            totalPools = 3,
            saturatedPools = 1,
            deferredPrograms = 2,
            criticalReservedPrograms = 1,
            summary = "Portfolio bottleneck detected across active programs."
        )
        val portfolioSummary = ProgramPortfolioSummary(
            activeProgramId = "program_alpha",
            capacityBlockedPrograms = 2,
            policyBlockedPrograms = 1,
            balancedPrograms = 1,
            criticalReservedPrograms = 1,
            bottleneckPoolKeys = listOf("workspace_finance"),
            recommendedNextAction = "Defer lower priority approvals to next eligible window.",
            summary = "Critical reserve consumed while lower-priority programs defer."
        )

        val receipt = ExecutionReceipt(
            runId = "run_m31_capacity",
            intentSummary = "Validate M31 capacity serialization",
            status = ResponseStatus.WAITING_USER,
            activeRole = UserRole.WORK,
            roleSource = RoleSource.EXPLICIT_USER_SELECTION,
            delegationMode = DelegationMode.SUPERVISED,
            roleImpactReasonCodes = listOf(
                RoleReasonCodes.ROLE_GOVERNANCE_APPROVAL_QUEUE_SATURATED,
                RoleReasonCodes.ROLE_GOVERNANCE_CAPACITY_BLOCKED,
                RoleReasonCodes.ROLE_GOVERNANCE_APPROVAL_LOAD_BALANCED,
                RoleReasonCodes.ROLE_GOVERNANCE_PORTFOLIO_PRIORITIZED
            ),
            roleImpactSummary = "Capacity-aware governance deferred this run.",
            approvalSummary = "Approval remains pending due to explicit policy gate.",
            dataScopeSummary = "No additional data-scope restrictions.",
            providerSummary = "No provider decision for governance-only run.",
            verificationSummary = "No verification required.",
            proofSummary = "No proof artifacts required.",
            rollbackSummary = "No rollback action triggered.",
            governanceCapacityPool = capacityPool,
            approvalQueuePressure = queuePressure,
            approvalBalancingDecision = balancingDecision,
            approvalAssignmentRecommendation = assignmentRecommendation,
            capacityAwarePromotionDecision = capacityDecision,
            portfolioCapacitySnapshot = portfolioSnapshot,
            programPortfolioSummary = portfolioSummary,
            approvalLoadSummary = queuePressure.summary,
            capacityBlockSummary = "Capacity blocked by approval slot limits.",
            policyBlockSummary = "Policy gate still requires explicit approval.",
            capacityBalancingSummary = balancingDecision.summary,
            portfolioCapacitySummary = portfolioSummary.summary
        )
        val filter = GovernanceConsoleFilter(
            includeReviewed = true,
            capacityPoolKey = "workspace_finance",
            approvalLoadBucket = ApprovalLoadBucket.SATURATED,
            capacityDeferralReason = ApprovalDeferralReason.QUEUE_SATURATED,
            balancingDecisionType = ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
            capacityBlockedOnly = true,
            policyBlockedOnly = true,
            bottleneckOnly = true,
            criticalCapacityReservedOnly = true
        )

        val decodedReceipt = DomainJson.decode<ExecutionReceipt>(DomainJson.encode(receipt))
        val decodedFilter = DomainJson.decode<GovernanceConsoleFilter>(DomainJson.encode(filter))

        assertEquals("workspace_finance", decodedReceipt.governanceCapacityPool?.poolKey)
        assertEquals(ApprovalLoadBucket.SATURATED, decodedReceipt.approvalQueuePressure?.loadBucket)
        assertEquals(
            ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY,
            decodedReceipt.approvalBalancingDecision?.decisionType
        )
        assertEquals(
            ApprovalDeferralReason.QUEUE_SATURATED,
            decodedReceipt.capacityAwarePromotionDecision?.deferralReason
        )
        assertTrue(decodedReceipt.capacityAwarePromotionDecision?.capacityBlocked == true)
        assertTrue(decodedReceipt.capacityAwarePromotionDecision?.policyBlocked == true)
        assertTrue((decodedReceipt.portfolioCapacitySnapshot?.saturatedPools ?: 0) > 0)
        assertTrue((decodedReceipt.programPortfolioSummary?.criticalReservedPrograms ?: 0) > 0)
        assertEquals("Capacity blocked by approval slot limits.", decodedReceipt.capacityBlockSummary)
        assertEquals("Policy gate still requires explicit approval.", decodedReceipt.policyBlockSummary)
        assertEquals("workspace_finance", decodedFilter.capacityPoolKey)
        assertEquals(ApprovalLoadBucket.SATURATED, decodedFilter.approvalLoadBucket)
        assertEquals(ApprovalDeferralReason.QUEUE_SATURATED, decodedFilter.capacityDeferralReason)
        assertEquals(ApprovalBalancingDecisionType.DEFER_FOR_CAPACITY, decodedFilter.balancingDecisionType)
        assertTrue(decodedFilter.capacityBlockedOnly)
        assertTrue(decodedFilter.policyBlockedOnly)
        assertTrue(decodedFilter.bottleneckOnly)
        assertTrue(decodedFilter.criticalCapacityReservedOnly)
    }

    @Test
    fun encodeDecode_m32PortfolioSimulationRoundTrip() {
        val scenario = PortfolioScenarioDefinition(
            scenarioId = "scenario_m32_capacity_shift",
            name = "Capacity +20 / Wave -10",
            summary = "Bounded M32 scenario.",
            assumptions = PortfolioScenarioAssumptionSet(
                horizonDays = 14,
                bucketHours = 24,
                timezone = "UTC",
                queueDecayRate = 0.1,
                backlogGrowthThreshold = 2
            ),
            modifications = listOf(
                PortfolioScenarioModification(
                    modificationId = "m1",
                    type = PortfolioScenarioModificationType.SHIFT_ROLLOUT_WINDOW,
                    intValue = 1,
                    summary = "Shift windows by 1 bucket."
                ),
                PortfolioScenarioModification(
                    modificationId = "m2",
                    type = PortfolioScenarioModificationType.ADJUST_APPROVAL_CAPACITY,
                    doubleValue = 20.0,
                    summary = "Increase capacity by 20%."
                )
            ),
            simulationOnly = true,
            active = true,
            createdAtMs = 1_700_320_000_000,
            updatedAtMs = 1_700_320_100_000
        )
        val baseline = BaselinePortfolioSnapshot(
            snapshotId = "baseline_m32",
            generatedAtMs = 1_700_320_200_000,
            totalCases = 6,
            approvalPendingCases = 4,
            capacityBlockedCases = 2,
            policyBlockedCases = 1,
            deferredCases = 2,
            carryForwardCases = 1,
            nextEligibleAtMs = 1_700_320_500_000,
            capacity = BaselineCapacitySnapshot(
                snapshotId = "baseline_capacity_m32",
                poolKey = "workspace_finance",
                loadBucket = ApprovalLoadBucket.ELEVATED,
                approvalCapacityBaseline = 6,
                approvalDemandBaseline = 8,
                backlogBaseline = 2,
                utilizationRate = 1.33,
                reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_BASELINE_DERIVED),
                summary = "Demand 8 vs capacity 6."
            ),
            programs = listOf(
                BaselineProgramStateSnapshot(
                    programId = "program_alpha",
                    programName = "Program Alpha",
                    openCaseCount = 4,
                    deferredCaseCount = 1,
                    blockedCaseCount = 1,
                    pendingApprovalCount = 3,
                    waves = listOf(
                        BaselineWaveStateSnapshot(
                            waveId = "wave_1",
                            programId = "program_alpha",
                            waveStatus = RolloutWaveStatus.ACTIVE,
                            openCaseCount = 4,
                            deferredCaseCount = 1,
                            blockedCaseCount = 1,
                            orderIndex = 1,
                            summary = "Wave 1."
                        )
                    ),
                    summary = "Program alpha baseline."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_BASELINE_DERIVED),
            summary = "Baseline from durable governance records."
        )
        val run = PortfolioSimulationRunRecord(
            runId = "run_m32_1",
            scenarioId = scenario.scenarioId,
            baselineSnapshotId = baseline.snapshotId,
            status = PortfolioSimulationRunStatus.COMPLETED,
            assumptions = scenario.assumptions,
            baselineSnapshot = baseline,
            approvalDemandForecast = listOf(
                ApprovalDemandForecast(
                    bucket = ForecastTimeBucket(bucketIndex = 0, startAtMs = 1_700_320_200_000, endAtMs = 1_700_406_600_000),
                    expectedDemand = 8,
                    expectedCapacity = 7,
                    expectedBacklog = 3,
                    utilizationRate = 1.14,
                    saturated = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_CAPACITY_BREACH_PREDICTED),
                    summary = "Demand exceeds capacity."
                )
            ),
            queuePressureForecast = listOf(
                QueuePressureForecast(
                    bucket = ForecastTimeBucket(bucketIndex = 0, startAtMs = 1_700_320_200_000, endAtMs = 1_700_406_600_000),
                    pressureScore = 1.14,
                    backlogGrowth = 1,
                    saturated = true,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_BACKLOG_GROWTH_PREDICTED),
                    summary = "Backlog growth predicted."
                )
            ),
            programCompletionForecast = listOf(
                ProgramCompletionForecast(
                    programId = "program_alpha",
                    estimatedCompletionBucket = 3,
                    delayed = true,
                    delayBuckets = 1,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_COMPLETION_DELAY_PREDICTED),
                    summary = "Completion delayed."
                )
            ),
            windowEligibilityForecast = listOf(
                WindowEligibilityForecast(
                    programId = "program_alpha",
                    waveId = "wave_1",
                    eligible = false,
                    delayReason = WindowDelayReason.GOVERNANCE_PAUSE,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_COMPLETION_DELAY_PREDICTED),
                    summary = "Window delayed."
                )
            ),
            breachSignals = listOf(
                PortfolioForecastBreachSignal(
                    signalId = "signal_m32_capacity",
                    type = PortfolioForecastBreachType.CAPACITY_BREACH,
                    severity = GovernanceAlertSeverity.HIGH,
                    bucketIndex = 0,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_CAPACITY_BREACH_PREDICTED),
                    summary = "Capacity breach predicted."
                )
            ),
            recommendationReasonCodes = listOf(
                RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RUN_CREATED,
                RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_BASELINE_DERIVED,
                RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY
            ),
            topRecommendation = "Increase approval capacity.",
            notes = listOf("Inputs remained within bounded limits."),
            summary = "One high-severity breach signal detected.",
            startedAtMs = 1_700_320_200_000,
            completedAtMs = 1_700_320_260_000
        )
        val comparison = PortfolioScenarioComparison(
            comparisonId = "cmp_m32",
            baselineRunId = "run_baseline",
            candidateRunId = run.runId,
            preferredRunId = run.runId,
            approvalDemandDelta = -1,
            backlogDelta = -2,
            breachCountDelta = -1,
            completionDelayDelta = -1,
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY),
            summary = "Candidate run is preferred.",
            createdAtMs = 1_700_320_300_000
        )
        val state = PortfolioSimulationState(
            query = PortfolioSimulationQuery(limit = 10),
            generatedAtMs = 1_700_320_400_000,
            baseline = baseline,
            scenarios = listOf(scenario),
            runs = listOf(run),
            comparisons = listOf(comparison),
            summary = PortfolioSimulationSummary(
                latestRunId = run.runId,
                scenarioCount = 1,
                runCount = 1,
                lastRunStatus = run.status,
                capacityBreachPredicted = true,
                backlogGrowthPredicted = true,
                completionDelayPredicted = true,
                topRecommendation = run.topRecommendation,
                reasonCodes = run.recommendationReasonCodes,
                summary = run.summary
            ),
            notes = listOf("Simulation is decision-support only.")
        )

        val decoded = DomainJson.decode<PortfolioSimulationState>(DomainJson.encode(state))

        assertEquals("scenario_m32_capacity_shift", decoded.scenarios.first().scenarioId)
        assertEquals(1, decoded.runs.size)
        assertEquals(PortfolioSimulationRunStatus.COMPLETED, decoded.runs.first().status)
        assertEquals(PortfolioForecastBreachType.CAPACITY_BREACH, decoded.runs.first().breachSignals.first().type)
        assertEquals("workspace_finance", decoded.baseline?.capacity?.poolKey)
        assertEquals("cmp_m32", decoded.comparisons.first().comparisonId)
        assertEquals(RoleReasonCodes.ROLE_PORTFOLIO_SIMULATION_RECOMMENDATION_INCREASE_CAPACITY, decoded.summary?.reasonCodes?.last())
    }

    @Test
    fun decode_m32LegacyPayloadDefaultsAreSafe() {
        val legacyState = DomainJson.decode<PortfolioSimulationState>("""{"query":{"limit":5}}""")
        val legacyConsole = DomainJson.decode<GovernanceConsoleState>("""{"total_records":2}""")

        assertEquals(5, legacyState.query.limit)
        assertTrue(legacyState.runs.isEmpty())
        assertTrue(legacyState.scenarios.isEmpty())
        assertNull(legacyState.baseline)
        assertNull(legacyConsole.portfolioSimulationState)
    }

    @Test
    fun encodeDecode_m33PortfolioOptimizationStateAndSelection() {
        val request = PortfolioOptimizationRequest(
            requestId = "request_m33",
            name = "Risk aware plan",
            summary = "Bounded local-first optimization request.",
            targetProgramIds = listOf("program_alpha", "program_beta"),
            objectiveProfile = PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m33",
                preset = PortfolioOptimizationObjectivePreset.RISK_AVERSE,
                weights = listOf(
                    PortfolioOptimizationObjectiveWeight(
                        family = PortfolioOptimizationObjectiveFamily.RISK,
                        weight = 5
                    ),
                    PortfolioOptimizationObjectiveWeight(
                        family = PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                        weight = 2
                    )
                ),
                summary = "Prefer lower risk."
            ),
            constraintProfile = PortfolioOptimizationConstraintProfile(
                profileId = "constraint_m33",
                preset = PortfolioOptimizationConstraintPreset.RISK_STRICT,
                riskTolerance = PortfolioOptimizationRiskTolerance.LOW,
                constraints = listOf(
                    PortfolioOptimizationConstraint(
                        family = PortfolioOptimizationConstraintFamily.MAX_CONCURRENT_RISKY_PROMOTIONS,
                        enabled = true,
                        hardConstraint = true,
                        intLimit = 0,
                        reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_RISK_LIMIT_BOUND),
                        summary = "Do not overlap risky promotions."
                    )
                ),
                summary = "Strict risk guardrails."
            ),
            scenarioSet = PortfolioOptimizationScenarioSet(
                baselineSnapshotId = "baseline_m33",
                scenarioIds = listOf("scenario_shift_window"),
                summary = "Apply one saved scenario overlay."
            ),
            solverConfig = PortfolioOptimizationSolverConfig(
                seed = 33L,
                topCandidateCount = 3,
                maxCandidateIterations = 8,
                horizonDays = 14
            ),
            active = true,
            createdAtMs = 1_700_330_000_000L,
            updatedAtMs = 1_700_330_100_000L
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m33",
            requestId = request.requestId,
            baselineSnapshotId = "baseline_m33",
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            scenarioSet = request.scenarioSet,
            solverConfig = request.solverConfig,
            candidateSchedules = listOf(
                PortfolioOptimizationCandidateSchedule(
                    candidateId = "candidate_m33_alpha",
                    rank = 1,
                    strategy = PortfolioOptimizationCandidateStrategy.RISK_AVERSE,
                    scheduledActions = listOf(
                        PortfolioOptimizationScheduledAction(
                            actionId = "action_m33_review",
                            type = PortfolioOptimizationActionType.REQUEST_APPROVAL_REVIEW,
                            sourceRunId = "run_alpha",
                            programId = "program_alpha",
                            waveId = "wave_1",
                            scheduledBucketIndex = 0,
                            capacityCost = 1,
                            riskBucket = PortfolioOptimizationRiskBucket.MODERATE,
                            requiresApproval = true,
                            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_CANDIDATE_GENERATED),
                            summary = "Review program_alpha / wave_1 in bucket 0"
                        )
                    ),
                    deferredActions = listOf(
                        PortfolioOptimizationDeferredAction(
                            sourceRunId = "run_beta",
                            programId = "program_beta",
                            waveId = "wave_2",
                            blockedBy = PortfolioOptimizationConstraintFamily.WINDOW_ELIGIBILITY,
                            nextEligibleAtMs = 1_700_330_500_000L,
                            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_WINDOW_CONSTRAINT_BOUND),
                            summary = "Window eligibility delayed program_beta."
                        )
                    ),
                    score = PortfolioOptimizationCandidateScore(
                        throughputScore = 61.0,
                        riskScore = 89.0,
                        slaScore = 70.0,
                        fairnessScore = 66.0,
                        stabilityScore = 72.0,
                        operatorFrictionScore = 68.0,
                        criticalPathScore = 75.0,
                        weightedTotalScore = 74.4,
                        summary = "Weighted 74.4."
                    ),
                    bindingConstraints = listOf(
                        PortfolioOptimizationBindingConstraintSummary(
                            family = PortfolioOptimizationConstraintFamily.WINDOW_ELIGIBILITY,
                            hardConstraint = true,
                            bucketIndex = 0,
                            programId = "program_beta",
                            waveId = "wave_2",
                            bindingCount = 1,
                            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_WINDOW_CONSTRAINT_BOUND),
                            summary = "Window eligibility constrained program_beta."
                        )
                    ),
                    tradeoffExplanations = listOf(
                        PortfolioOptimizationTradeoffExplanation(
                            primaryObjective = PortfolioOptimizationObjectiveFamily.RISK,
                            secondaryObjective = PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                            direction = PortfolioOptimizationTradeoffDirection.IMPROVES_PRIMARY_WORSENS_SECONDARY,
                            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_THROUGHPUT_FOR_RISK),
                            summary = "Lowers risk more aggressively, but defers throughput."
                        )
                    ),
                    summary = "1 promotion-ready action(s); 1 deferred."
                )
            ),
            paretoFrontierSummary = PortfolioOptimizationParetoFrontierSummary(
                frontierCandidateIds = listOf("candidate_m33_alpha"),
                summary = "Pareto frontier contains one candidate."
            ),
            notes = listOf("Optimization used seed 33."),
            summary = "Generated one candidate schedule.",
            startedAtMs = 1_700_330_000_000L,
            completedAtMs = 1_700_330_200_000L
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m33",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m33_alpha",
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_330_300_000L,
            summary = "Selected lower-risk schedule."
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(requestId = request.requestId, limit = 5),
            generatedAtMs = 1_700_330_400_000L,
            requests = listOf(request),
            results = listOf(result),
            decisions = listOf(decision),
            summary = PortfolioOptimizationSummary(
                latestResultId = result.resultId,
                requestCount = 1,
                resultCount = 1,
                decisionCount = 1,
                selectedCandidateId = decision.candidateId,
                selectedScheduleSummary = decision.summary,
                topRecommendation = result.candidateSchedules.first().summary,
                reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_SCHEDULE_SELECTED),
                summary = "Selected lower-risk schedule."
            ),
            notes = listOf("Advisory only.")
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))

        assertEquals("request_m33", decoded.requests.first().requestId)
        assertEquals(PortfolioOptimizationObjectivePreset.RISK_AVERSE, decoded.results.first().objectiveProfile.preset)
        assertEquals(
            PortfolioOptimizationConstraintFamily.WINDOW_ELIGIBILITY,
            decoded.results.first().candidateSchedules.first().bindingConstraints.first().family
        )
        assertEquals(
            RoleReasonCodes.ROLE_PORTFOLIO_OPTIMIZATION_TRADEOFF_THROUGHPUT_FOR_RISK,
            decoded.results.first().candidateSchedules.first().tradeoffExplanations.first().reasonCodes.first()
        )
        assertEquals("candidate_m33_alpha", decoded.decisions.first().candidateId)
        assertEquals("candidate_m33_alpha", decoded.summary?.selectedCandidateId)
    }

    @Test
    fun decode_m33LegacyPayloadDefaultsAreSafe() {
        val legacyState = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":4}}""")
        val legacyConsole = DomainJson.decode<GovernanceConsoleState>("""{"total_records":2}""")
        val legacySummary = DomainJson.decode<GovernanceSummary>(
            """{"window":{"window_days":7},"total_records":2,"matched_records":2}"""
        )

        assertEquals(4, legacyState.query.limit)
        assertNull(legacyState.query.decisionId)
        assertNull(legacyState.query.driftSeverity)
        assertNull(legacyState.query.tuningStatus)
        assertNull(legacyState.query.tuningTargetFamily)
        assertNull(legacyState.query.calibrationSnapshotId)
        assertNull(legacyState.query.objectiveProfileSnapshotId)
        assertNull(legacyState.query.learningScope)
        assertNull(legacyState.query.propagationStatus)
        assertNull(legacyState.query.learningSyncMode)
        assertNull(legacyState.query.learningSyncStatus)
        assertNull(legacyState.query.learningSyncConflictResolution)
        assertTrue(legacyState.objectiveProfileSnapshots.isEmpty())
        assertTrue(legacyState.calibrationSnapshots.isEmpty())
        assertTrue(legacyState.requests.isEmpty())
        assertTrue(legacyState.results.isEmpty())
        assertTrue(legacyState.decisions.isEmpty())
        assertTrue(legacyState.outcomes.isEmpty())
        assertTrue(legacyState.driftSummaries.isEmpty())
        assertTrue(legacyState.tuningSuggestions.isEmpty())
        assertTrue(legacyState.tuningDecisionRecords.isEmpty())
        assertTrue(legacyState.propagationAttemptRecords.isEmpty())
        assertTrue(legacyState.propagationApprovalRecords.isEmpty())
        assertTrue(legacyState.propagationAdoptionRecords.isEmpty())
        assertTrue(legacyState.learningSyncEnvelopes.isEmpty())
        assertTrue(legacyState.learningSyncAttemptRecords.isEmpty())
        assertTrue(legacyState.learningSyncConflictRecords.isEmpty())
        assertTrue(legacyState.federatedAggregationSummaries.isEmpty())
        assertNull(legacyState.activeLearningSyncPrivacyPolicy)
        assertNull(legacyState.activeFederationBoundary)
        assertNull(legacyConsole.portfolioOptimizationState)
        assertNull(legacySummary.portfolioOptimizationSummary)
    }

    @Test
    fun encodeDecode_m34PortfolioOptimizationLearningStateAndTuning() {
        val snapshot = PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "snapshot_m34_v1",
            version = 1,
            objectiveWeights = listOf(
                PortfolioOptimizationObjectiveWeight(
                    family = PortfolioOptimizationObjectiveFamily.RISK,
                    weight = 6
                ),
                PortfolioOptimizationObjectiveWeight(
                    family = PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                    weight = 2
                )
            ),
            parameterCalibration = PortfolioOptimizationParameterCalibration(
                approvalLatencyPenaltyMultiplier = 1.2,
                readinessDelayPenaltyMultiplier = 1.1,
                windowMissPenaltyMultiplier = 1.0,
                riskIncidentPenaltyMultiplier = 1.4,
                summary = "Tuned toward stronger risk penalties."
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_TUNING_APPLIED),
            evidenceRefs = listOf(
                PortfolioDriftEvidenceRef(
                    sourceRunId = "run_m34_alpha",
                    relatedId = "decision_m34",
                    summary = "Linked governance evidence."
                )
            ),
            summary = "Calibration snapshot v1.",
            createdAtMs = 1_700_340_000_000L
        )
        val request = PortfolioOptimizationRequest(
            requestId = "request_m34",
            name = "Closed-loop request",
            summary = "Closed-loop optimization request.",
            calibrationSnapshotId = snapshot.snapshotId,
            objectiveProfile = PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m34",
                preset = PortfolioOptimizationObjectivePreset.BALANCED
            ),
            constraintProfile = PortfolioOptimizationConstraintProfile(
                profileId = "constraint_m34",
                preset = PortfolioOptimizationConstraintPreset.DEFAULT_GUARDED
            ),
            solverConfig = PortfolioOptimizationSolverConfig(seed = 34L),
            active = true,
            createdAtMs = 1_700_340_000_000L,
            updatedAtMs = 1_700_340_100_000L
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m34",
            requestId = request.requestId,
            baselineSnapshotId = "baseline_m34",
            calibrationSnapshotId = snapshot.snapshotId,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            solverConfig = request.solverConfig,
            summary = "Optimization result calibrated under snapshot m34.",
            startedAtMs = 1_700_340_000_000L,
            completedAtMs = 1_700_340_200_000L
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m34",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m34_alpha",
            calibrationSnapshotId = snapshot.snapshotId,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_340_300_000L,
            summary = "Selected calibrated schedule."
        )
        val outcome = PortfolioScheduleOutcomeRecord(
            outcomeId = "outcome_m34",
            decisionId = decision.decisionId,
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = decision.candidateId,
            calibrationSnapshotId = snapshot.snapshotId,
            scheduledSourceRunIds = listOf("run_m34_alpha"),
            predictedScheduledCount = 1,
            predictedOnTimeCount = 1,
            predictedAverageApprovalLatencyHours = 24.0,
            predictedBindingConstraints = listOf(PortfolioOptimizationConstraintFamily.APPROVAL_CAPACITY),
            observations = PortfolioOutcomeObservationSet(
                executionObservations = listOf(
                    PortfolioExecutionObservation(
                        sourceRunId = "run_m34_alpha",
                        executedOnTime = false,
                        readinessDelayed = true,
                        summary = "Execution slipped by one bucket."
                    )
                ),
                approvalLatencyObservations = listOf(
                    PortfolioApprovalLatencyObservation(
                        sourceRunId = "run_m34_alpha",
                        latencyHours = 30.0,
                        approved = false,
                        summary = "Approval latency exceeded prediction."
                    )
                ),
                riskIncidentObservations = listOf(
                    PortfolioRiskIncidentObservation(
                        sourceRunId = "run_m34_alpha",
                        incidentCount = 2,
                        severity = PortfolioOptimizationRiskBucket.HIGH,
                        summary = "Two risk incidents observed."
                    )
                ),
                constraintBindingObservations = listOf(
                    PortfolioConstraintBindingObservation(
                        sourceRunId = "run_m34_alpha",
                        family = PortfolioOptimizationConstraintFamily.APPROVAL_CAPACITY,
                        bindingObserved = true,
                        count = 1,
                        summary = "Capacity bound in production."
                    )
                ),
                summary = "Observed drift across approval latency and risk."
            ),
            evidenceRefs = snapshot.evidenceRefs,
            driftSummaryId = "drift_m34",
            summary = "Outcome recorded with high drift.",
            recordedAtMs = 1_700_340_400_000L
        )
        val drift = PortfolioOptimizationDriftSummary(
            driftId = "drift_m34",
            decisionId = decision.decisionId,
            outcomeId = outcome.outcomeId,
            calibrationSnapshotId = snapshot.snapshotId,
            highestSeverity = PortfolioDriftSeverity.HIGH,
            deltas = listOf(
                PortfolioPredictionVsActualDelta(
                    family = PortfolioOptimizationTuningTargetFamily.APPROVAL_LATENCY_PENALTY,
                    predictedValue = 24.0,
                    actualValue = 30.0,
                    normalizedDelta = 0.20,
                    summary = "Approval latency drift."
                ),
                PortfolioPredictionVsActualDelta(
                    family = PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
                    predictedValue = 0.0,
                    actualValue = 2.0,
                    normalizedDelta = 1.0,
                    summary = "Risk incident drift."
                )
            ),
            signals = listOf(
                PortfolioDriftSignal(
                    signalId = "signal_m34_risk",
                    family = PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
                    severity = PortfolioDriftSeverity.HIGH,
                    normalizedDelta = 1.0,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_DRIFT_DETECTED),
                    summary = "Risk incident drift is high."
                )
            ),
            evidenceRefs = snapshot.evidenceRefs,
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_DRIFT_DETECTED),
            summary = "High drift detected against selected schedule.",
            createdAtMs = 1_700_340_401_000L
        )
        val suggestion = PortfolioOptimizationTuningSuggestion(
            suggestionId = "suggestion_m34",
            decisionId = decision.decisionId,
            driftId = drift.driftId,
            calibrationSnapshotId = snapshot.snapshotId,
            targetFamily = PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
            status = PortfolioOptimizationTuningStatus.PENDING,
            currentDoubleValue = 1.4,
            proposedDoubleValue = 1.6,
            doubleDelta = 0.2,
            guardrails = listOf(
                PortfolioOptimizationTuningGuardrail.PARAMETER_MULTIPLIER_DELTA_CAP,
                PortfolioOptimizationTuningGuardrail.RISK_REGRESSION_PROTECTION
            ),
            evidenceRefs = drift.evidenceRefs,
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_TUNING_SUGGESTED),
            summary = "Suggest raising risk incident penalty from 1.4 to 1.6.",
            createdAtMs = 1_700_340_402_000L
        )
        val tuningDecision = PortfolioOptimizationTuningDecisionRecord(
            tuningDecisionId = "tuning_decision_m34",
            suggestionId = suggestion.suggestionId,
            decisionId = decision.decisionId,
            calibrationSnapshotId = snapshot.snapshotId,
            appliedSnapshotId = "snapshot_m34_v2",
            status = PortfolioOptimizationTuningStatus.APPLIED,
            operatorId = "local-user",
            operatorName = "Local Operator",
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_TUNING_APPLIED),
            summary = "Applied risk incident tuning to a new snapshot.",
            decidedAtMs = 1_700_340_403_000L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                requestId = request.requestId,
                decisionId = decision.decisionId,
                driftSeverity = PortfolioDriftSeverity.HIGH,
                tuningStatus = PortfolioOptimizationTuningStatus.APPLIED,
                tuningTargetFamily = PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
                calibrationSnapshotId = snapshot.snapshotId,
                limit = 5
            ),
            generatedAtMs = 1_700_340_404_000L,
            calibrationSnapshots = listOf(snapshot),
            requests = listOf(request),
            results = listOf(result),
            decisions = listOf(decision),
            outcomes = listOf(outcome),
            driftSummaries = listOf(drift),
            tuningSuggestions = listOf(suggestion),
            tuningDecisionRecords = listOf(tuningDecision),
            summary = PortfolioOptimizationSummary(
                latestResultId = result.resultId,
                requestCount = 1,
                resultCount = 1,
                decisionCount = 1,
                selectedCandidateId = decision.candidateId,
                activeCalibrationSnapshotId = snapshot.snapshotId,
                latestOutcomeId = outcome.outcomeId,
                highestDriftSeverity = PortfolioDriftSeverity.HIGH,
                pendingTuningCount = 1,
                appliedTuningCount = 1,
                selectedScheduleSummary = decision.summary,
                topRecommendation = "Selected calibrated schedule.",
                latestOutcomeSummary = outcome.summary,
                latestDriftSummary = drift.summary,
                latestTuningSummary = tuningDecision.summary,
                latestLearningSummary = "${outcome.summary} ${drift.summary} ${tuningDecision.summary}",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_OUTCOME_RECORDED,
                    RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_DRIFT_DETECTED,
                    RoleReasonCodes.ROLE_PORTFOLIO_LEARNING_TUNING_APPLIED
                ),
                summary = "Closed-loop learning state restored."
            ),
            notes = listOf("Calibration snapshots are immutable.")
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))

        assertEquals(snapshot.snapshotId, decoded.calibrationSnapshots.first().snapshotId)
        assertEquals(snapshot.snapshotId, decoded.requests.first().calibrationSnapshotId)
        assertEquals(snapshot.snapshotId, decoded.results.first().calibrationSnapshotId)
        assertEquals(snapshot.snapshotId, decoded.decisions.first().calibrationSnapshotId)
        assertEquals(outcome.outcomeId, decoded.outcomes.first().outcomeId)
        assertEquals(PortfolioDriftSeverity.HIGH, decoded.driftSummaries.first().highestSeverity)
        assertEquals(
            PortfolioOptimizationTuningTargetFamily.RISK_INCIDENT_PENALTY,
            decoded.tuningSuggestions.first().targetFamily
        )
        assertEquals(
            PortfolioOptimizationTuningStatus.APPLIED,
            decoded.tuningDecisionRecords.first().status
        )
        assertEquals(snapshot.snapshotId, decoded.summary?.activeCalibrationSnapshotId)
        assertEquals(PortfolioDriftSeverity.HIGH, decoded.summary?.highestDriftSeverity)
    }

    @Test
    fun encodeDecode_m35ObjectiveProfileScopeIsolationAndPropagationState() {
        val objectiveSnapshot = PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_snapshot_m35_user_v1",
            parentSnapshotId = "profile_snapshot_m35_user_v0",
            profileId = "objective_m35",
            version = 1,
            binding = PortfolioOptimizationObjectiveProfileBinding(
                scope = PortfolioOptimizationLearningScope.USER,
                userId = "local-user",
                workspaceId = "workspace_local",
                tenantId = "tenant_local",
                precedenceChain = listOf(
                    PortfolioOptimizationLearningScope.USER,
                    PortfolioOptimizationLearningScope.WORKSPACE,
                    PortfolioOptimizationLearningScope.TENANT,
                    PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                ),
                summary = "User-scoped objective profile binding."
            ),
            objectiveProfile = PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m35",
                preset = PortfolioOptimizationObjectivePreset.BALANCED,
                weights = listOf(
                    PortfolioOptimizationObjectiveWeight(
                        family = PortfolioOptimizationObjectiveFamily.RISK,
                        weight = 6
                    ),
                    PortfolioOptimizationObjectiveWeight(
                        family = PortfolioOptimizationObjectiveFamily.THROUGHPUT,
                        weight = 3
                    )
                ),
                summary = "User-tuned portfolio profile."
            ),
            parameterCalibration = PortfolioOptimizationParameterCalibration(
                riskIncidentPenaltyMultiplier = 1.3,
                summary = "Risk tuning carried by the user profile snapshot."
            ),
            isolationPolicy = PortfolioOptimizationLearningIsolationPolicy(
                policyId = "policy_m35",
                mode = PortfolioOptimizationLearningIsolationMode.ISOLATED_BY_DEFAULT,
                summary = "Cross-tenant propagation blocked by default."
            ),
            provenance = PortfolioOptimizationLearningProvenanceSummary(
                type = PortfolioOptimizationObjectiveProfileProvenanceType.LOCAL_TUNED,
                sourceScope = PortfolioOptimizationLearningScope.USER,
                sourceSnapshotId = "profile_snapshot_m35_user_v0",
                operatorId = "local-user",
                operatorName = "Local Operator",
                summary = "Derived from local closed-loop tuning."
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SCOPE_RESOLVED),
            summary = "User objective profile snapshot.",
            createdAtMs = 1_700_350_000_000L
        )
        val calibrationSnapshot = PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "calibration_m35_v1",
            parentSnapshotId = "calibration_m35_v0",
            version = 1,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            objectiveWeights = objectiveSnapshot.objectiveProfile.weights,
            parameterCalibration = objectiveSnapshot.parameterCalibration,
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SCOPE_RESOLVED),
            summary = "Calibration bound to the user objective profile snapshot.",
            createdAtMs = 1_700_350_000_100L
        )
        val request = PortfolioOptimizationRequest(
            requestId = "request_m35",
            name = "Tenant-safe optimization request",
            summary = "M35 request bound to a user-scoped objective profile.",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfile = objectiveSnapshot.objectiveProfile,
            constraintProfile = PortfolioOptimizationConstraintProfile(
                profileId = "constraint_m35",
                preset = PortfolioOptimizationConstraintPreset.DEFAULT_GUARDED
            ),
            solverConfig = PortfolioOptimizationSolverConfig(seed = 35L),
            active = true,
            createdAtMs = 1_700_350_000_200L,
            updatedAtMs = 1_700_350_000_300L
        )
        val result = PortfolioOptimizationResult(
            resultId = "result_m35",
            requestId = request.requestId,
            baselineSnapshotId = "baseline_m35",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            status = PortfolioOptimizationResultStatus.COMPLETED,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            solverConfig = request.solverConfig,
            summary = "Optimization result preserved the bound user-scoped profile.",
            startedAtMs = 1_700_350_000_400L,
            completedAtMs = 1_700_350_000_500L
        )
        val decision = PortfolioOptimizationDecisionRecord(
            decisionId = "decision_m35",
            requestId = request.requestId,
            resultId = result.resultId,
            candidateId = "candidate_m35_alpha",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = objectiveSnapshot.binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            objectiveProfile = request.objectiveProfile,
            constraintProfile = request.constraintProfile,
            selectedByOperatorId = "local-user",
            selectedByOperatorName = "Local Operator",
            selectedAtMs = 1_700_350_000_600L,
            summary = "Selected user-scoped schedule under tenant-safe learning."
        )
        val patch = PortfolioOptimizationLearningPatch(
            patchId = "patch_m35_workspace",
            sourceObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            sourceCalibrationSnapshotId = calibrationSnapshot.snapshotId,
            sourceBinding = objectiveSnapshot.binding,
            targetBinding = objectiveSnapshot.binding.copy(
                scope = PortfolioOptimizationLearningScope.WORKSPACE,
                userId = "local-user",
                workspaceId = "workspace_local",
                tenantId = "tenant_local",
                summary = "Workspace target binding."
            ),
            objectiveWeightDeltas = listOf(
                PortfolioOptimizationObjectiveWeightDelta(
                    family = PortfolioOptimizationObjectiveFamily.RISK,
                    delta = 1
                )
            ),
            parameterCalibrationDelta = PortfolioOptimizationParameterCalibrationDelta(
                riskIncidentPenaltyMultiplierDelta = 0.1,
                summary = "Increase risk penalty for workspace adoption."
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_PROPAGATION_APPROVAL_REQUIRED),
            summary = "Promote the user profile to workspace scope.",
            createdAtMs = 1_700_350_000_700L
        )
        val attempt = PortfolioOptimizationPropagationAttemptRecord(
            attemptId = "attempt_m35_workspace",
            patch = patch,
            rule = PortfolioOptimizationPropagationRule(
                ruleId = "rule_user_to_workspace",
                sourceScope = PortfolioOptimizationLearningScope.USER,
                targetScope = PortfolioOptimizationLearningScope.WORKSPACE,
                enabled = true,
                approvalRequirement = PortfolioOptimizationPropagationApprovalRequirement.REQUIRED,
                summary = "Workspace propagation requires approval."
            ),
            sourceObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            targetScope = PortfolioOptimizationLearningScope.WORKSPACE,
            approvalRequirement = PortfolioOptimizationPropagationApprovalRequirement.REQUIRED,
            status = PortfolioOptimizationPropagationEligibilityStatus.PENDING_APPROVAL,
            blockReason = PortfolioOptimizationPropagationBlockReason.APPROVAL_REQUIRED,
            isolationDecision = PortfolioOptimizationLearningIsolationDecision(
                decisionId = "isolation_m35",
                sourceBinding = objectiveSnapshot.binding,
                targetBinding = patch.targetBinding,
                policy = objectiveSnapshot.isolationPolicy,
                allowed = true,
                reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_ISOLATION_ENFORCED),
                summary = "Same-tenant workspace propagation is allowed."
            ),
            requestedByOperatorId = "local-user",
            requestedByOperatorName = "Local Operator",
            reviewRequired = true,
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_PROPAGATION_APPROVAL_REQUIRED),
            summary = "Workspace propagation pending approval.",
            createdAtMs = 1_700_350_000_800L
        )
        val approval = PortfolioOptimizationPropagationApprovalRecord(
            approvalId = "approval_m35_workspace",
            attemptId = attempt.attemptId,
            approved = true,
            approverId = "workspace-admin",
            approverName = "Workspace Admin",
            reason = "Safe same-tenant propagation.",
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_PROPAGATION_APPROVED),
            summary = "Workspace propagation approved.",
            decidedAtMs = 1_700_350_000_900L
        )
        val adoption = PortfolioOptimizationPropagationAdoptionRecord(
            adoptionId = "adoption_m35_workspace",
            attemptId = attempt.attemptId,
            sourceObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            targetObjectiveProfileSnapshotId = "profile_snapshot_m35_workspace_v1",
            targetBinding = patch.targetBinding,
            approvalRecordId = approval.approvalId,
            status = PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
            provenance = PortfolioOptimizationLearningProvenanceSummary(
                type = PortfolioOptimizationObjectiveProfileProvenanceType.ADOPTED,
                sourceScope = PortfolioOptimizationLearningScope.USER,
                sourceSnapshotId = objectiveSnapshot.snapshotId,
                sourceAttemptId = attempt.attemptId,
                operatorId = approval.approverId,
                operatorName = approval.approverName,
                summary = "Approved workspace adoption."
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_PATCH_ADOPTED),
            summary = "Workspace scope adopted the propagated patch.",
            adoptedAtMs = 1_700_350_001_000L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                requestId = request.requestId,
                decisionId = decision.decisionId,
                calibrationSnapshotId = calibrationSnapshot.snapshotId,
                objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
                learningScope = PortfolioOptimizationLearningScope.USER,
                propagationStatus = PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
                limit = 5
            ),
            generatedAtMs = 1_700_350_001_100L,
            objectiveProfileSnapshots = listOf(objectiveSnapshot),
            calibrationSnapshots = listOf(calibrationSnapshot),
            requests = listOf(request),
            results = listOf(result),
            decisions = listOf(decision),
            propagationAttemptRecords = listOf(attempt),
            propagationApprovalRecords = listOf(approval),
            propagationAdoptionRecords = listOf(adoption),
            summary = PortfolioOptimizationSummary(
                latestResultId = result.resultId,
                requestCount = 1,
                resultCount = 1,
                decisionCount = 1,
                selectedCandidateId = decision.candidateId,
                activeCalibrationSnapshotId = calibrationSnapshot.snapshotId,
                activeObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
                activeObjectiveProfileScope = PortfolioOptimizationLearningScope.USER,
                activeObjectiveProfileProvenance = PortfolioOptimizationObjectiveProfileProvenanceType.LOCAL_TUNED,
                pendingPropagationCount = 1,
                reviewRequiredPropagationCount = 1,
                selectedScheduleSummary = decision.summary,
                topRecommendation = "User-scoped profile preserved for deterministic ranking.",
                activeObjectiveProfileSummary = objectiveSnapshot.summary,
                latestPropagationSummary = adoption.summary,
                latestLearningSummary = "${attempt.summary} ${adoption.summary}",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_LEARNING_SCOPE_RESOLVED,
                    RoleReasonCodes.ROLE_LEARNING_PROPAGATION_APPROVED,
                    RoleReasonCodes.ROLE_LEARNING_PATCH_ADOPTED
                ),
                summary = "Objective profile propagation state restored."
            ),
            notes = listOf("Objective profile history remains snapshot-bound.")
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))

        assertEquals(objectiveSnapshot.snapshotId, decoded.objectiveProfileSnapshots.first().snapshotId)
        assertEquals(PortfolioOptimizationLearningScope.USER, decoded.requests.first().objectiveProfileBinding.scope)
        assertEquals(objectiveSnapshot.snapshotId, decoded.results.first().objectiveProfileSnapshotId)
        assertEquals(
            PortfolioOptimizationObjectiveProfileProvenanceType.LOCAL_TUNED,
            decoded.decisions.first().objectiveProfileProvenance.type
        )
        assertEquals(
            PortfolioOptimizationPropagationEligibilityStatus.PENDING_APPROVAL,
            decoded.propagationAttemptRecords.first().status
        )
        assertEquals(true, decoded.propagationApprovalRecords.first().approved)
        assertEquals(
            PortfolioOptimizationPropagationEligibilityStatus.ADOPTED,
            decoded.propagationAdoptionRecords.first().status
        )
        assertEquals(objectiveSnapshot.snapshotId, decoded.summary?.activeObjectiveProfileSnapshotId)
        assertEquals(PortfolioOptimizationLearningScope.USER, decoded.summary?.activeObjectiveProfileScope)
    }

    @Test
    fun encodeDecode_m36LearningSyncPrivacyBoundaryAndConflicts() {
        val binding = PortfolioOptimizationObjectiveProfileBinding(
            scope = PortfolioOptimizationLearningScope.WORKSPACE,
            workspaceId = "workspace_sync",
            tenantId = "tenant_sync",
            summary = "Workspace-scoped sync binding."
        )
        val objectiveSnapshot = PortfolioOptimizationObjectiveProfileSnapshot(
            snapshotId = "profile_snapshot_m36_workspace_v1",
            profileId = "objective_m36",
            version = 2,
            binding = binding,
            objectiveProfile = PortfolioOptimizationObjectiveProfile(
                profileId = "objective_m36",
                preset = PortfolioOptimizationObjectivePreset.BALANCED,
                summary = "Workspace objective profile."
            ),
            provenance = PortfolioOptimizationLearningProvenanceSummary(
                type = PortfolioOptimizationObjectiveProfileProvenanceType.PROPAGATED,
                sourceScope = PortfolioOptimizationLearningScope.WORKSPACE,
                sourceSnapshotId = "profile_snapshot_m36_workspace_v0",
                operatorId = "workspace-admin",
                summary = "Propagated across safe workspace scope."
            ),
            summary = "Workspace objective profile snapshot.",
            createdAtMs = 1_700_360_000_000L
        )
        val calibrationSnapshot = PortfolioOptimizationCalibrationSnapshot(
            snapshotId = "calibration_m36_workspace_v1",
            version = 2,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = binding,
            objectiveProfileProvenance = objectiveSnapshot.provenance,
            objectiveWeights = objectiveSnapshot.objectiveProfile.weights,
            parameterCalibration = PortfolioOptimizationParameterCalibration(
                riskIncidentPenaltyMultiplier = 1.2,
                summary = "Shared calibrated parameters."
            ),
            summary = "Workspace calibration snapshot.",
            createdAtMs = 1_700_360_000_100L
        )
        val driftSummary = PortfolioOptimizationDriftSummary(
            driftId = "drift_m36",
            decisionId = "decision_m36",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = binding,
            highestSeverity = PortfolioDriftSeverity.MEDIUM,
            signals = listOf(
                PortfolioDriftSignal(
                    signalId = "signal_m36",
                    family = PortfolioOptimizationTuningTargetFamily.WINDOW_MISS_PENALTY,
                    severity = PortfolioDriftSeverity.MEDIUM,
                    normalizedDelta = 0.28,
                    summary = "Window miss drift rose on the shared workspace profile."
                )
            ),
            summary = "Workspace drift summary for sync.",
            createdAtMs = 1_700_360_000_200L
        )
        val outcomeAggregate = PortfolioOptimizationOutcomeAggregate(
            aggregateId = "aggregate_m36",
            outcomeId = "outcome_m36",
            decisionId = "decision_m36",
            calibrationSnapshotId = calibrationSnapshot.snapshotId,
            objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
            objectiveProfileBinding = binding,
            predictedScheduledCount = 3,
            actualScheduledCount = 2,
            actualWindowMissCount = 1,
            summary = "Redacted outcome aggregate for sync.",
            recordedAtMs = 1_700_360_000_250L
        )
        val boundary = PortfolioOptimizationFederatedAggregationBoundary(
            boundaryId = "boundary_m36",
            boundaryType = PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
            tenantId = "tenant_sync",
            workspaceId = "workspace_sync",
            role = UserRole.WORK,
            sameTenantOnly = true,
            summary = "Tenant-private aggregation boundary."
        )
        val groupKey = PortfolioOptimizationFederatedAggregationGroupKey(
            groupKey = "tenant_private_sync:tenant_sync:workspace_sync",
            mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            tenantId = "tenant_sync",
            workspaceId = "workspace_sync",
            role = UserRole.WORK,
            boundaryType = PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
            summary = "Tenant-private aggregation key."
        )
        val aggregationSummary = PortfolioOptimizationFederatedAggregationSummary(
            aggregationId = "aggregation_m36",
            groupKey = groupKey,
            boundary = boundary,
            artifactCount = 4,
            deviceCount = 2,
            highestDriftSeverity = PortfolioDriftSeverity.MEDIUM,
            reasonCodes = listOf(RoleReasonCodes.ROLE_FEDERATED_AGGREGATION_APPLIED),
            summary = "Federated aggregation spans two devices in one tenant.",
            updatedAtMs = 1_700_360_000_300L
        )
        val envelope = PortfolioOptimizationLearningSyncEnvelope(
            envelopeId = "envelope_m36",
            mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            boundary = boundary,
            groupKey = groupKey,
            aggregationRule = PortfolioOptimizationFederatedAggregationRule(
                ruleId = "rule_m36",
                mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                boundaryType = PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
                sameTenantOnly = true,
                summary = "Only same-tenant aggregation is allowed."
            ),
            privacyPolicy = PortfolioOptimizationLearningSyncPrivacyPolicy(
                policyId = "privacy_m36",
                mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                cloudSyncAllowed = true,
                rawContentSyncBlocked = true,
                rawPromptSyncBlocked = true,
                sameTenantOnly = true,
                allowObjectiveProfileSnapshots = true,
                allowCalibrationSnapshots = true,
                allowDriftSummaries = true,
                allowOutcomeAggregates = true,
                allowEnterpriseAggregation = false,
                summary = "Artifact-only same-tenant sync is allowed."
            ),
            redactionPolicy = PortfolioOptimizationLearningSyncRedactionPolicy(
                rawContentRemoved = true,
                rawPromptsRemoved = true,
                evidenceRefsRedacted = true,
                operatorNamesRedacted = true,
                summary = "All raw content and prompts were removed."
            ),
            provenance = PortfolioOptimizationLearningSyncProvenance(
                deviceId = "tablet_workspace",
                sessionId = "sync_m36_session",
                sourceUserId = "workspace-admin",
                operatorId = "workspace-admin",
                sourceTenantId = "tenant_sync",
                sourceWorkspaceId = "workspace_sync",
                exportedAtMs = 1_700_360_000_350L,
                summary = "Exported from a safe tenant-private device."
            ),
            artifacts = listOf(
                PortfolioOptimizationLearningSyncArtifactEnvelope(
                    envelopeArtifactId = "artifact_profile_m36",
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
                    artifactId = objectiveSnapshot.snapshotId,
                    artifactVersion = objectiveSnapshot.version,
                    objectiveProfileSnapshot = objectiveSnapshot,
                    summary = objectiveSnapshot.summary
                ),
                PortfolioOptimizationLearningSyncArtifactEnvelope(
                    envelopeArtifactId = "artifact_calibration_m36",
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.CALIBRATION_SNAPSHOT,
                    artifactId = calibrationSnapshot.snapshotId,
                    artifactVersion = calibrationSnapshot.version,
                    calibrationSnapshot = calibrationSnapshot,
                    summary = calibrationSnapshot.summary
                ),
                PortfolioOptimizationLearningSyncArtifactEnvelope(
                    envelopeArtifactId = "artifact_drift_m36",
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.DRIFT_SUMMARY,
                    artifactId = driftSummary.driftId,
                    artifactVersion = 1,
                    driftSummary = driftSummary,
                    summary = driftSummary.summary
                ),
                PortfolioOptimizationLearningSyncArtifactEnvelope(
                    envelopeArtifactId = "artifact_outcome_m36",
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.OUTCOME_AGGREGATE,
                    artifactId = outcomeAggregate.aggregateId,
                    artifactVersion = 1,
                    outcomeAggregate = outcomeAggregate,
                    summary = outcomeAggregate.summary
                ),
                PortfolioOptimizationLearningSyncArtifactEnvelope(
                    envelopeArtifactId = "artifact_aggregation_m36",
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.FEDERATED_AGGREGATION_SUMMARY,
                    artifactId = aggregationSummary.aggregationId,
                    artifactVersion = 1,
                    federatedAggregationSummary = aggregationSummary,
                    summary = aggregationSummary.summary
                )
            ),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_LEARNING_SYNC_ENQUEUED,
                RoleReasonCodes.ROLE_LEARNING_SYNC_DELIVERED
            ),
            summary = "Exported five redacted learning artifacts.",
            createdAtMs = 1_700_360_000_360L
        )
        val conflict = PortfolioOptimizationLearningSyncConflictRecord(
            conflictId = "conflict_m36",
            envelopeId = envelope.envelopeId,
            artifactType = PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
            artifactId = objectiveSnapshot.snapshotId,
            localVersion = 2,
            incomingVersion = 2,
            resolution = PortfolioOptimizationLearningSyncConflictResolution.REVIEW_REQUIRED,
            reviewRequired = true,
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_DETECTED),
            summary = "Objective profile snapshot differs locally and requires review.",
            detectedAtMs = 1_700_360_000_370L
        )
        val attempt = PortfolioOptimizationLearningSyncAttemptRecord(
            attemptId = "attempt_m36",
            direction = PortfolioOptimizationLearningSyncDirection.IMPORT,
            envelopeId = envelope.envelopeId,
            mode = envelope.mode,
            status = PortfolioOptimizationLearningSyncStatus.CONFLICT_REVIEW_REQUIRED,
            boundary = boundary,
            groupKey = groupKey,
            privacyPolicy = envelope.privacyPolicy,
            provenance = envelope.provenance,
            artifactCount = envelope.artifacts.size,
            appliedArtifactCount = 4,
            conflictCount = 1,
            issues = listOf(
                PortfolioOptimizationLearningSyncIssue(
                    type = PortfolioOptimizationLearningSyncIssueType.CONFLICT_REQUIRES_REVIEW,
                    blocking = false,
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
                    artifactId = objectiveSnapshot.snapshotId,
                    reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_DETECTED),
                    summary = "One artifact requires review before safe adoption."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_DETECTED),
            summary = "Learning sync import applied safe artifacts and flagged one conflict.",
            processedAtMs = 1_700_360_000_380L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                objectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
                learningScope = PortfolioOptimizationLearningScope.WORKSPACE,
                learningSyncMode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                learningSyncStatus = PortfolioOptimizationLearningSyncStatus.CONFLICT_REVIEW_REQUIRED,
                learningSyncConflictResolution = PortfolioOptimizationLearningSyncConflictResolution.REVIEW_REQUIRED,
                limit = 5
            ),
            generatedAtMs = 1_700_360_000_390L,
            objectiveProfileSnapshots = listOf(objectiveSnapshot),
            calibrationSnapshots = listOf(calibrationSnapshot),
            driftSummaries = listOf(driftSummary),
            learningSyncEnvelopes = listOf(envelope),
            learningSyncAttemptRecords = listOf(attempt),
            learningSyncConflictRecords = listOf(conflict),
            federatedAggregationSummaries = listOf(aggregationSummary),
            activeLearningSyncPrivacyPolicy = envelope.privacyPolicy,
            activeFederationBoundary = boundary,
            summary = PortfolioOptimizationSummary(
                activeObjectiveProfileSnapshotId = objectiveSnapshot.snapshotId,
                activeObjectiveProfileScope = PortfolioOptimizationLearningScope.WORKSPACE,
                activeLearningSyncMode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                latestLearningSyncStatus = PortfolioOptimizationLearningSyncStatus.CONFLICT_REVIEW_REQUIRED,
                latestLearningSyncConflictResolution = PortfolioOptimizationLearningSyncConflictResolution.REVIEW_REQUIRED,
                pendingSyncConflictCount = 1,
                activeSyncPrivacyPolicySummary = envelope.privacyPolicy.summary,
                activeFederationBoundarySummary = boundary.summary,
                latestLearningSyncSummary = attempt.summary,
                latestLearningSyncConflictSummary = conflict.summary,
                latestFederatedAggregationSummary = aggregationSummary.summary,
                latestLearningSummary = "${attempt.summary} ${aggregationSummary.summary}",
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_LEARNING_SYNC_CONFLICT_DETECTED,
                    RoleReasonCodes.ROLE_FEDERATED_AGGREGATION_APPLIED
                ),
                summary = "Learning sync state restored with tenant-private review gating."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))

        assertEquals(PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC, decoded.query.learningSyncMode)
        assertEquals(PortfolioOptimizationLearningSyncStatus.CONFLICT_REVIEW_REQUIRED, decoded.learningSyncAttemptRecords.first().status)
        assertEquals(PortfolioOptimizationLearningSyncConflictResolution.REVIEW_REQUIRED, decoded.learningSyncConflictRecords.first().resolution)
        assertEquals("tenant_sync", decoded.activeFederationBoundary?.tenantId)
        assertEquals(true, decoded.activeLearningSyncPrivacyPolicy?.rawContentSyncBlocked)
        assertEquals(PortfolioDriftSeverity.MEDIUM, decoded.federatedAggregationSummaries.first().highestDriftSeverity)
        assertEquals(1, decoded.summary?.pendingSyncConflictCount)
        assertEquals(PortfolioOptimizationLearningSyncStatus.CONFLICT_REVIEW_REQUIRED, decoded.summary?.latestLearningSyncStatus)
    }

    @Test
    fun encodeDecode_m37ConsentTransportAndComplianceAuditState() {
        val binding = PortfolioOptimizationConsentScopeBinding(
            scope = PortfolioOptimizationConsentScope.TENANT,
            tenantId = "tenant_m37",
            workspaceId = "workspace_m37",
            userId = "user_m37"
        )
        val consent = PortfolioOptimizationConsentRecord(
            consentId = "consent_m37_transport",
            scopeBinding = binding,
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            decision = PortfolioOptimizationConsentDecision.ALLOWED,
            provenance = PortfolioOptimizationConsentProvenance(
                authority = PortfolioOptimizationConsentAuthority.ENTERPRISE_POLICY,
                grantedById = "admin_m37",
                grantedByName = "Admin M37",
                summary = "Granted from governance console."
            ),
            dataCategories = listOf(
                PortfolioOptimizationLearningDataCategory.CALIBRATION_SNAPSHOT,
                PortfolioOptimizationLearningDataCategory.DRIFT_SUMMARY
            ),
            minimizationRules = listOf(
                PortfolioOptimizationDataMinimizationRule.REDACTED,
                PortfolioOptimizationDataMinimizationRule.NO_IDENTIFIERS
            ),
            retentionPolicy = PortfolioOptimizationRetentionPolicy(retentionDays = 30),
            reasonCodes = listOf(RoleReasonCodes.ROLE_CONSENT_GRANTED),
            summary = "Remote transport consent approved for redacted learning artifacts.",
            recordedAtMs = 1_700_370_000_000L
        )
        val remoteEnvelope = PortfolioOptimizationRemoteLearningEnvelope(
            remoteEnvelopeId = "remote_envelope_m37",
            sourceEnvelopeId = "sync_envelope_m37",
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
            boundary = PortfolioOptimizationFederatedAggregationBoundary(
                boundaryId = "boundary_m37",
                boundaryType = PortfolioOptimizationFederatedAggregationBoundaryType.TENANT,
                tenantId = "tenant_m37",
                workspaceId = "workspace_m37",
                sameTenantOnly = true,
                summary = "Tenant boundary remains enforced."
            ),
            groupKey = PortfolioOptimizationFederatedAggregationGroupKey(
                groupKey = "tenant_private_sync:tenant_m37:workspace_m37",
                mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                tenantId = "tenant_m37",
                workspaceId = "workspace_m37",
                boundaryType = PortfolioOptimizationFederatedAggregationBoundaryType.TENANT
            ),
            privacyPolicy = PortfolioOptimizationLearningSyncPrivacyPolicy(
                policyId = "privacy_m37",
                mode = PortfolioOptimizationLearningSyncMode.TENANT_PRIVATE_SYNC,
                cloudSyncAllowed = true,
                rawContentSyncBlocked = true,
                rawPromptSyncBlocked = true,
                sameTenantOnly = true,
                allowObjectiveProfileSnapshots = true,
                allowCalibrationSnapshots = true,
                allowDriftSummaries = true,
                allowOutcomeAggregates = true,
                summary = "Artifact-only sync remains redacted."
            ),
            enterprisePrivacyPolicy = PortfolioOptimizationEnterprisePrivacyPolicySummary(
                policyId = "enterprise_privacy_m37",
                sameTenantOnly = true,
                rawContentBlocked = true,
                rawPromptsBlocked = true,
                remoteTransportAllowedByRolePolicy = true,
                auditExportAllowedByRolePolicy = true,
                learningSyncConsentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                remoteTransportConsentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                auditExportConsentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                summary = "Enterprise privacy keeps raw prompts blocked and requires same-tenant transport."
            ),
            consentRecordId = consent.consentId,
            artifactRefs = listOf(
                PortfolioOptimizationRemoteLearningArtifactRef(
                    artifactType = PortfolioOptimizationLearningSyncArtifactType.CALIBRATION_SNAPSHOT,
                    artifactId = "calibration_m37",
                    artifactVersion = 2,
                    artifactHash = "abc123",
                    summary = "Calibration snapshot reference."
                )
            ),
            artifactCount = 1,
            payloadHash = "hash_m37_payload",
            summary = "Remote envelope carries one redacted calibration artifact.",
            createdAtMs = 1_700_370_000_100L
        )
        val batch = PortfolioOptimizationRemoteLearningBatch(
            batchId = "remote_batch_m37",
            transportMode = PortfolioOptimizationRemoteLearningTransportMode.STUB_REMOTE,
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            remoteEnvelopeIds = listOf(remoteEnvelope.remoteEnvelopeId),
            idempotencyKey = "idempotency_m37",
            envelopeCount = 1,
            artifactCount = 1,
            payloadHash = remoteEnvelope.payloadHash,
            summary = "Remote batch m37.",
            createdAtMs = 1_700_370_000_120L
        )
        val attempt = PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            attemptId = "transport_attempt_m37",
            batchId = batch.batchId,
            remoteEnvelopeId = remoteEnvelope.remoteEnvelopeId,
            transportMode = PortfolioOptimizationRemoteLearningTransportMode.STUB_REMOTE,
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED,
            idempotencyKey = batch.idempotencyKey,
            consentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
            privacySummary = remoteEnvelope.enterprisePrivacyPolicy.summary,
            ackRecord = PortfolioOptimizationRemoteLearningAckRecord(
                ackId = "ack_m37",
                batchId = batch.batchId,
                remoteRef = "remote-ref-m37",
                summary = "Remote batch acknowledged.",
                ackedAtMs = 1_700_370_000_140L
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_LEARNING_TRANSPORT_ACKED),
            summary = "Remote batch acknowledged.",
            processedAtMs = 1_700_370_000_150L
        )
        val exportRequest = PortfolioOptimizationComplianceAuditExportRequest(
            requestId = "audit_request_m37",
            objectiveProfileSnapshotId = "profile_snapshot_m37",
            scope = PortfolioOptimizationConsentScope.TENANT,
            purposes = listOf(PortfolioOptimizationConsentPurpose.AUDIT_EXPORT),
            format = PortfolioOptimizationComplianceAuditExportFormat.JSON,
            redactionPolicy = PortfolioOptimizationComplianceAuditExportRedactionPolicy(
                rawContentExcluded = true,
                rawPromptsExcluded = true,
                operatorNamesRedacted = true,
                summary = "Redaction-first audit export."
            ),
            requestedByOperatorId = "compliance-admin",
            requestedByOperatorName = "Compliance Admin",
            reasonCodes = listOf(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_REQUESTED),
            summary = "Audit export requested.",
            requestedAtMs = 1_700_370_000_160L
        )
        val exportResult = PortfolioOptimizationComplianceAuditExportResult(
            resultId = "audit_result_m37",
            requestId = exportRequest.requestId,
            status = PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            bundle = PortfolioOptimizationComplianceAuditExportBundle(
                bundleId = "bundle_m37",
                format = PortfolioOptimizationComplianceAuditExportFormat.JSON,
                redactionPolicy = exportRequest.redactionPolicy,
                artifactRefs = remoteEnvelope.artifactRefs,
                consentRecords = listOf(consent),
                receiptItems = listOf(
                    PortfolioOptimizationComplianceAuditReceiptItem(
                        runId = "run_m37",
                        decisionId = "decision_m37",
                        status = ResponseStatus.SUCCESS,
                        activeRole = UserRole.WORK,
                        reasonCodes = listOf(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_GENERATED),
                        summary = "Redacted receipt item."
                    )
                ),
                governanceItems = listOf(
                    PortfolioOptimizationComplianceAuditGovernanceItem(
                        caseId = "case_m37",
                        runId = "run_m37",
                        primaryQueue = GovernanceQueueType.NEEDS_ATTENTION,
                        priority = GovernanceCasePriority.MEDIUM,
                        reviewed = true,
                        reasonCodes = listOf(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_GENERATED),
                        summary = "Redacted governance item."
                    )
                ),
                hashSummary = PortfolioOptimizationComplianceAuditHashSummary(
                    bundleHash = "bundle_hash_m37",
                    artifactHash = "artifact_hash_m37",
                    consentHash = "consent_hash_m37",
                    receiptHash = "receipt_hash_m37",
                    governanceHash = "governance_hash_m37",
                    artifactCount = 1,
                    consentCount = 1,
                    receiptCount = 1,
                    governanceCount = 1,
                    summary = "Audit bundle hashes recorded."
                ),
                summary = "Redaction-first compliance audit bundle.",
                createdAtMs = 1_700_370_000_170L
            ),
            locationRef = "memory://portfolio-audit/bundle_m37.json",
            hashSummary = PortfolioOptimizationComplianceAuditHashSummary(
                bundleHash = "bundle_hash_m37",
                artifactHash = "artifact_hash_m37",
                consentHash = "consent_hash_m37",
                receiptHash = "receipt_hash_m37",
                governanceHash = "governance_hash_m37",
                artifactCount = 1,
                consentCount = 1,
                receiptCount = 1,
                governanceCount = 1,
                summary = "Audit bundle hashes recorded."
            ),
            redactionSummary = "Redaction-first audit export.",
            accessRecord = PortfolioOptimizationComplianceAuditExportAccessRecord(
                accessId = "access_m37",
                requestId = exportRequest.requestId,
                operatorId = exportRequest.requestedByOperatorId,
                consentRecordId = consent.consentId,
                authority = PortfolioOptimizationConsentAuthority.ENTERPRISE_POLICY,
                purposes = exportRequest.purposes,
                summary = "Access recorded with enterprise admin authority.",
                accessedAtMs = 1_700_370_000_180L
            ),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_REQUESTED,
                RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_GENERATED
            ),
            summary = "Audit export completed.",
            completedAtMs = 1_700_370_000_190L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                consentPurpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                consentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                remoteTransportStatus = PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED,
                complianceAuditExportStatus = PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
                limit = 5
            ),
            generatedAtMs = 1_700_370_000_200L,
            consentRecords = listOf(consent),
            remoteLearningEnvelopes = listOf(remoteEnvelope),
            remoteLearningBatches = listOf(batch),
            remoteLearningTransportAttemptRecords = listOf(attempt),
            complianceAuditExportRequests = listOf(exportRequest),
            complianceAuditExportResults = listOf(exportResult),
            activeEnterprisePrivacyPolicy = remoteEnvelope.enterprisePrivacyPolicy,
            summary = PortfolioOptimizationSummary(
                learningSyncConsentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                remoteTransportConsentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                auditExportConsentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
                latestRemoteTransportStatus = PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED,
                latestComplianceAuditExportStatus = PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
                latestConsentSummary = consent.summary,
                latestRemoteTransportSummary = attempt.summary,
                latestComplianceAuditExportSummary = exportResult.summary,
                activeEnterprisePrivacyPolicySummary = remoteEnvelope.enterprisePrivacyPolicy.summary,
                summary = "M37 compliance state restored."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":3}}""")

        assertEquals(PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT, decoded.query.consentPurpose)
        assertEquals(PortfolioOptimizationConsentDecision.ALLOWED, decoded.query.consentDecision)
        assertEquals(
            PortfolioOptimizationRemoteLearningDeliveryStatus.ACKED,
            decoded.remoteLearningTransportAttemptRecords.first().status
        )
        assertEquals(
            PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            decoded.complianceAuditExportResults.first().status
        )
        assertEquals(
            "Enterprise privacy keeps raw prompts blocked and requires same-tenant transport.",
            decoded.activeEnterprisePrivacyPolicy?.summary
        )
        assertNull(legacy.query.consentPurpose)
        assertNull(legacy.query.consentDecision)
        assertNull(legacy.query.remoteTransportStatus)
        assertNull(legacy.query.complianceAuditExportStatus)
        assertTrue(legacy.consentRecords.isEmpty())
        assertTrue(legacy.remoteLearningEnvelopes.isEmpty())
        assertTrue(legacy.remoteLearningBatches.isEmpty())
        assertTrue(legacy.remoteLearningTransportAttemptRecords.isEmpty())
        assertTrue(legacy.complianceAuditExportRequests.isEmpty())
        assertTrue(legacy.complianceAuditExportResults.isEmpty())
        assertNull(legacy.activeEnterprisePrivacyPolicy)
    }

    @Test
    fun encodeDecode_m38RemoteConnectorKeyAndComplianceState() {
        val connectorProfile = PortfolioOptimizationRemoteTransportConnectorProfile(
            profileId = "portfolio_remote_connector_m38",
            type = PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            displayName = "HTTPS webhook connector",
            endpointRef = "https://enterprise.example/learning",
            healthStatus = PortfolioOptimizationRemoteTransportConnectorHealthStatus.HEALTHY,
            retryPolicy = PortfolioOptimizationRemoteTransportRetryPolicy(
                maxAttempts = 2,
                localFallbackAllowed = false,
                deadLetterAfterMaxAttempts = true,
                summary = "Connector retries once and then dead-letters."
            ),
            complianceScope = "tenant_private_learning",
            summary = "HTTPS webhook connector is production-ready and health-checked.",
            updatedAtMs = 1_700_380_000_000L
        )
        val keyReference = PortfolioOptimizationEnterpriseKeyReference(
            keyRefId = "portfolio_remote_key_m38",
            connectorProfileId = connectorProfile.profileId,
            providerName = "enterprise-vault",
            status = PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            usagePolicy = PortfolioOptimizationEnterpriseKeyUsagePolicy(
                remoteTransportAllowed = true,
                auditExportAllowed = true,
                purposeLimited = true,
                summary = "Enterprise key is limited to redacted learning artifacts."
            ),
            summary = "Enterprise key is healthy.",
            updatedAtMs = 1_700_380_000_010L
        )
        val deadLetter = PortfolioOptimizationRemoteTransportDeadLetterRecord(
            deadLetterId = "dead_letter_m38",
            attemptId = "attempt_m38",
            batchId = "batch_m38",
            remoteEnvelopeId = "remote_envelope_m38",
            connectorProfileId = connectorProfile.profileId,
            failureReason = PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT,
            summary = "Remote delivery exhausted retries and was dead-lettered.",
            createdAtMs = 1_700_380_000_030L
        )
        val attempt = PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            attemptId = "attempt_m38",
            batchId = deadLetter.batchId,
            remoteEnvelopeId = deadLetter.remoteEnvelopeId,
            transportMode = PortfolioOptimizationRemoteLearningTransportMode.PRODUCTION_CONNECTOR,
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
            idempotencyKey = "portfolio_remote:sync_envelope_m38:REMOTE_TRANSPORT:PRODUCTION_CONNECTOR",
            consentDecision = PortfolioOptimizationConsentDecision.ALLOWED,
            connectorBinding = PortfolioOptimizationRemoteTransportConnectorBinding(
                profileId = connectorProfile.profileId,
                type = connectorProfile.type,
                healthStatus = connectorProfile.healthStatus,
                keyRefId = keyReference.keyRefId,
                summary = connectorProfile.summary
            ),
            enterpriseKeyReference = keyReference,
            credentialResolution = PortfolioOptimizationTransportCredentialResolutionResult(
                connectorProfileId = connectorProfile.profileId,
                keyRefId = keyReference.keyRefId,
                resolved = true,
                summary = "Enterprise credential resolved successfully.",
                checkedAtMs = 1_700_380_000_015L
            ),
            complianceGateResult = PortfolioOptimizationComplianceGateResult(
                decision = PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                redactionEnforced = true,
                localFallbackAllowed = false,
                summary = "Compliance gate allowed redacted artifact transport.",
                checkedAtMs = 1_700_380_000_020L
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = connectorProfile.summary,
                keySummary = keyReference.summary,
                complianceSummary = "Compliance gate allowed redacted artifact transport.",
                summary = "Connector, key, and compliance state are transport-ready."
            ),
            deliveryResult = PortfolioOptimizationRemoteTransportDeliveryResult(
                status = PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
                failureReason = PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT,
                retryCount = 2,
                summary = deadLetter.summary
            ),
            deadLetterRecordId = deadLetter.deadLetterId,
            privacySummary = "Enterprise privacy keeps raw prompts blocked and same-tenant only.",
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_REMOTE_TRANSPORT_CONNECTOR_SELECTED,
                RoleReasonCodes.ROLE_REMOTE_TRANSPORT_DELIVERY_DEAD_LETTERED
            ),
            summary = deadLetter.summary,
            processedAtMs = 1_700_380_000_040L
        )
        val exportResult = PortfolioOptimizationComplianceAuditExportResult(
            resultId = "audit_result_m38",
            requestId = "audit_request_m38",
            status = PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            complianceGateResult = PortfolioOptimizationComplianceGateResult(
                decision = PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                summary = "Compliance gate allowed the audit export with redaction.",
                checkedAtMs = 1_700_380_000_050L
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = "Audit export remained local-first.",
                complianceSummary = "Export is redaction-first and artifact-only.",
                summary = "Audit export remained local-first and compliant."
            ),
            summary = "Audit export completed with redaction-first controls."
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                remoteTransportStatus = PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
                remoteTransportConnectorType = PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                remoteTransportKeyStatus = PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                remoteTransportComplianceDecision = PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                limit = 5
            ),
            generatedAtMs = 1_700_380_000_060L,
            remoteLearningTransportAttemptRecords = listOf(attempt),
            complianceAuditExportResults = listOf(exportResult),
            remoteTransportConnectorProfiles = listOf(connectorProfile),
            enterpriseKeyReferences = listOf(keyReference),
            remoteTransportDeadLetterRecords = listOf(deadLetter),
            summary = PortfolioOptimizationSummary(
                latestRemoteTransportStatus = PortfolioOptimizationRemoteLearningDeliveryStatus.DEAD_LETTERED,
                latestRemoteTransportConnectorType = PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
                latestRemoteTransportKeyStatus = PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
                latestRemoteTransportComplianceDecision =
                    PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
                remoteTransportDeadLetterCount = 1,
                latestRemoteTransportSummary = deadLetter.summary,
                latestRemoteTransportConnectorSummary = connectorProfile.summary,
                latestRemoteTransportKeySummary = keyReference.summary,
                latestRemoteTransportComplianceSummary = "Compliance gate allowed redacted artifact transport.",
                latestComplianceAuditExportSummary = exportResult.summary,
                summary = "M38 connector, key, and compliance state restored."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":3}}""")

        assertEquals(
            PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            decoded.query.remoteTransportConnectorType
        )
        assertEquals(
            PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            decoded.query.remoteTransportKeyStatus
        )
        assertEquals(
            PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            decoded.query.remoteTransportComplianceDecision
        )
        assertEquals(
            PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            decoded.remoteTransportConnectorProfiles.first().type
        )
        assertEquals(
            PortfolioOptimizationEnterpriseKeyStatus.HEALTHY,
            decoded.enterpriseKeyReferences.first().status
        )
        assertEquals(
            PortfolioOptimizationRemoteTransportFailureReason.DELIVERY_TIMEOUT,
            decoded.remoteTransportDeadLetterRecords.first().failureReason
        )
        assertEquals(
            PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            decoded.remoteLearningTransportAttemptRecords.first().complianceGateResult?.decision
        )
        assertEquals(
            PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            decoded.complianceAuditExportResults.first().complianceGateResult?.decision
        )
        assertEquals(
            PortfolioOptimizationRemoteTransportConnectorType.HTTPS_WEBHOOK,
            decoded.summary?.latestRemoteTransportConnectorType
        )
        assertEquals(1, decoded.summary?.remoteTransportDeadLetterCount)
        assertNull(legacy.query.remoteTransportConnectorType)
        assertNull(legacy.query.remoteTransportKeyStatus)
        assertNull(legacy.query.remoteTransportComplianceDecision)
        assertTrue(legacy.remoteTransportConnectorProfiles.isEmpty())
        assertTrue(legacy.enterpriseKeyReferences.isEmpty())
        assertTrue(legacy.remoteTransportDeadLetterRecords.isEmpty())
    }

    @Test
    fun encodeDecode_m39DestinationResidencyAndExportRoutingState() {
        val destinationProfile = PortfolioOptimizationRemoteDestinationProfile(
            destinationId = "portfolio_destination_remote_m39",
            type = PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
            displayName = "EU compliance archive",
            connectorProfileId = "portfolio_remote_connector_m39",
            residencyRegion = PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            destinationPolicy = PortfolioOptimizationRemoteDestinationPolicy(
                policyId = "destination_policy_m39",
                allowedPurposes = listOf(PortfolioOptimizationConsentPurpose.AUDIT_EXPORT),
                sameTenantOnly = true,
                requiresHealthyConnector = true,
                requiresHealthyKey = true,
                requiresResidencyMatch = true,
                requiresJurisdictionMatch = true,
                localFallbackAllowed = false,
                holdForReviewOnPolicyMismatch = true,
                summary = "Remote compliance archive stays inside EU GDPR boundaries."
            ),
            priority = 0,
            summary = "EU compliance archive is available for routed audit bundles.",
            updatedAtMs = 1_700_390_000_000L
        )
        val destinationDecision = PortfolioOptimizationRemoteDestinationDecisionRecord(
            decisionId = "destination_decision_m39",
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            sourceId = "audit_request_m39",
            status = PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            preferredDestinationId = destinationProfile.destinationId,
            selectedDestinationId = null,
            selectedDestinationType = null,
            residencyPolicy = PortfolioOptimizationDataResidencyPolicy(
                policyId = "residency_policy_m39",
                residencyBoundary = PortfolioOptimizationResidencyBoundary(
                    boundaryId = "boundary_m39",
                    tenantId = "euTenant",
                    workspaceId = "workspace_m39",
                    region = PortfolioOptimizationResidencyRegion.EU,
                    jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
                    summary = "EU tenant remains inside EU GDPR routing boundaries."
                ),
                allowedRegions = listOf(PortfolioOptimizationResidencyRegion.EU),
                allowedJurisdictions = listOf(PortfolioOptimizationJurisdiction.EU_GDPR),
                strictResidency = true,
                strictJurisdiction = true,
                localFallbackAllowed = false,
                holdForReviewOnMismatch = true,
                summary = "Residency policy requires EU GDPR archive routing."
            ),
            residencyRegion = PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            blockReason = PortfolioOptimizationRemoteDestinationBlockReason.REVIEW_REQUIRED,
            eligibility = listOf(
                PortfolioOptimizationRemoteDestinationEligibility(
                    destinationId = destinationProfile.destinationId,
                    type = destinationProfile.type,
                    eligible = false,
                    blockReason = PortfolioOptimizationRemoteDestinationBlockReason.JURISDICTION_BLOCKED,
                    residencyCompatible = true,
                    jurisdictionCompatible = false,
                    summary = "Remote archive is blocked because jurisdiction evidence is incomplete."
                )
            ),
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_DESTINATION_HELD),
            summary = "Destination routing is held for compliance review because jurisdiction evidence is incomplete.",
            createdAtMs = 1_700_390_000_010L
        )
        val transportAttempt = PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            attemptId = "transport_attempt_m39",
            batchId = "remote_batch_m39",
            remoteEnvelopeId = "remote_envelope_m39",
            transportMode = PortfolioOptimizationRemoteLearningTransportMode.PRODUCTION_CONNECTOR,
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
            destinationDecision = destinationDecision.copy(
                purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                sourceId = "remote_envelope_m39",
                status = PortfolioOptimizationRemoteDestinationDecisionStatus.REROUTED,
                selectedDestinationId = "portfolio_destination_local_m39",
                selectedDestinationType = PortfolioOptimizationRemoteDestinationType.LOCAL_DEVICE,
                reroutedFromDestinationId = destinationProfile.destinationId,
                blockReason = PortfolioOptimizationRemoteDestinationBlockReason.RESIDENCY_BLOCKED,
                reasonCodes = listOf(RoleReasonCodes.ROLE_REMOTE_DESTINATION_REROUTED),
                summary = "Preferred remote destination rerouted to local-first handling under residency policy."
            ),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_REMOTE_DESTINATION_REROUTED,
                RoleReasonCodes.ROLE_REMOTE_TRANSPORT_LOCAL_FALLBACK_USED
            ),
            summary = "Remote transport rerouted to local-first handling under residency policy.",
            processedAtMs = 1_700_390_000_020L
        )
        val exportRoute = PortfolioOptimizationComplianceExportRouteRecord(
            routeId = "export_route_m39",
            requestId = "audit_request_m39",
            resultId = "audit_result_m39",
            destinationDecisionId = destinationDecision.decisionId,
            destinationId = destinationProfile.destinationId,
            destinationType = destinationProfile.type,
            status = PortfolioOptimizationComplianceExportRouteStatus.HELD,
            residencyRegion = PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            locationRef = "memory://portfolio-audit/held_m39.json",
            reasonCodes = listOf(RoleReasonCodes.ROLE_COMPLIANCE_EXPORT_ROUTE_HELD),
            summary = "Compliance export route is held pending jurisdiction review.",
            createdAtMs = 1_700_390_000_030L
        )
        val exportResult = PortfolioOptimizationComplianceAuditExportResult(
            resultId = "audit_result_m39",
            requestId = "audit_request_m39",
            status = PortfolioOptimizationComplianceAuditExportStatus.BLOCKED,
            destinationDecision = destinationDecision,
            exportRoute = exportRoute,
            complianceGateResult = PortfolioOptimizationComplianceGateResult(
                decision = PortfolioOptimizationComplianceGateDecision.BLOCKED,
                blockReason = PortfolioOptimizationComplianceBlockReason.REVIEW_REQUIRED,
                redactionEnforced = true,
                localFallbackAllowed = false,
                summary = "Compliance gate blocked export until jurisdiction review completes.",
                checkedAtMs = 1_700_390_000_040L
            ),
            transportSummary = PortfolioOptimizationComplianceTransportSummary(
                connectorSummary = "Compliance archive connector is healthy but jurisdiction evidence is incomplete.",
                complianceSummary = "Export route is held for review.",
                summary = "Audit export remained local-first while the route is held for compliance review."
            ),
            summary = "Audit export is held for compliance review."
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                remoteDestinationStatus = PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                remoteDestinationType = PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                residencyRegion = PortfolioOptimizationResidencyRegion.EU,
                jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
                limit = 5
            ),
            generatedAtMs = 1_700_390_000_050L,
            remoteDestinationProfiles = listOf(destinationProfile),
            remoteDestinationDecisionRecords = listOf(destinationDecision),
            remoteLearningTransportAttemptRecords = listOf(transportAttempt),
            complianceAuditExportResults = listOf(exportResult),
            complianceExportRouteRecords = listOf(exportRoute),
            summary = PortfolioOptimizationSummary(
                latestRemoteDestinationStatus = PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
                latestRemoteDestinationType = PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                latestResidencyRegion = PortfolioOptimizationResidencyRegion.EU,
                latestJurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
                latestRemoteDestinationSummary = destinationDecision.summary,
                latestResidencySummary = destinationDecision.residencyPolicy.summary,
                latestComplianceExportRouteSummary = exportRoute.summary,
                summary = "M39 destination routing and residency state restored."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":3}}""")

        assertEquals(
            PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            decoded.query.remoteDestinationStatus
        )
        assertEquals(
            PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
            decoded.query.remoteDestinationType
        )
        assertEquals(PortfolioOptimizationResidencyRegion.EU, decoded.query.residencyRegion)
        assertEquals(PortfolioOptimizationJurisdiction.EU_GDPR, decoded.query.jurisdiction)
        assertEquals(
            PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
            decoded.remoteDestinationProfiles.first().type
        )
        assertEquals(
            PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            decoded.remoteDestinationDecisionRecords.first().status
        )
        assertEquals(
            PortfolioOptimizationComplianceExportRouteStatus.HELD,
            decoded.complianceExportRouteRecords.first().status
        )
        assertEquals(
            PortfolioOptimizationRemoteDestinationDecisionStatus.REROUTED,
            decoded.remoteLearningTransportAttemptRecords.first().destinationDecision?.status
        )
        assertEquals(
            PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            decoded.complianceAuditExportResults.first().destinationDecision?.status
        )
        assertEquals(
            PortfolioOptimizationRemoteDestinationDecisionStatus.HELD_FOR_COMPLIANCE,
            decoded.summary?.latestRemoteDestinationStatus
        )
        assertEquals(PortfolioOptimizationResidencyRegion.EU, decoded.summary?.latestResidencyRegion)
        assertTrue(decoded.summary?.latestComplianceExportRouteSummary?.contains("held", ignoreCase = true) == true)
        assertNull(legacy.query.remoteDestinationStatus)
        assertNull(legacy.query.remoteDestinationType)
        assertNull(legacy.query.residencyRegion)
        assertNull(legacy.query.jurisdiction)
        assertTrue(legacy.remoteDestinationProfiles.isEmpty())
        assertTrue(legacy.remoteDestinationDecisionRecords.isEmpty())
        assertTrue(legacy.complianceExportRouteRecords.isEmpty())
    }

    @Test
    fun encodeDecode_m40DataExchangeBundleApprovalAndAuditState() {
        val artifact = PortfolioOptimizationDataExchangeArtifactRef(
            artifactClass = PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT,
            artifactId = "artifact_m40_profile",
            artifactHash = "hash_m40_profile",
            artifactType = PortfolioOptimizationLearningSyncArtifactType.OBJECTIVE_PROFILE_SNAPSHOT,
            redacted = true,
            summary = "Objective profile snapshot artifact."
        )
        val bundle = PortfolioOptimizationSafeDestinationBundle(
            bundleId = "bundle_m40",
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
            sourceId = "audit_request_m40",
            destinationIds = listOf("destination_remote_m40", "destination_local_m40"),
            destinationTypes = listOf(
                PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE
            ),
            artifacts = listOf(artifact),
            artifactClasses = listOf(artifact.artifactClass),
            summary = "Bundle contains redacted compliance-safe artifacts.",
            createdAtMs = 1_700_400_000_000L
        )
        val boundarySummary = PortfolioOptimizationDataExchangeBoundarySummary(
            boundaryId = "boundary_m40",
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            residencyRegion = PortfolioOptimizationResidencyRegion.EU,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            consentAllowed = true,
            rolePolicyAllowed = true,
            privacyPolicyAllowed = true,
            destinationPolicyAllowed = true,
            connectorHealthy = true,
            keyHealthy = true,
            complianceDecision = PortfolioOptimizationComplianceGateDecision.ALLOWED_WITH_REDACTION,
            summary = "Boundary permits redacted audit exchange inside EU GDPR."
        )
        val decision = PortfolioOptimizationDestinationBundleDecisionRecord(
            decisionId = "bundle_decision_m40",
            bundleId = bundle.bundleId,
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            sourceId = bundle.sourceId,
            destinationPolicy = PortfolioOptimizationDestinationBundlePolicy(
                policyId = "bundle_policy_m40",
                bundleType = bundle.bundleType,
                allowedRemoteArtifactClasses = listOf(
                    PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT,
                    PortfolioOptimizationDataExchangeArtifactClass.CONSENT_RECORD
                ),
                localOnlyArtifactClasses = listOf(
                    PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE,
                    PortfolioOptimizationDataExchangeArtifactClass.GOVERNANCE_CASE_SUMMARY
                ),
                splitAllowed = true,
                redactionRequired = true,
                approvalRequiredOnHold = true,
                summary = "Audit bundle keeps receipt and governance traces local."
            ),
            boundarySummary = boundarySummary,
            status = PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            primaryDestinationId = "destination_remote_m40",
            primaryDestinationType = PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
            compatibility = listOf(
                PortfolioOptimizationDestinationBundleCompatibility(
                    destinationId = "destination_remote_m40",
                    destinationType = PortfolioOptimizationRemoteDestinationType.REMOTE_COMPLIANCE_ARCHIVE,
                    status = PortfolioOptimizationDestinationBundleCompatibilityStatus.REQUIRES_SPLIT,
                    allowedArtifactClasses = listOf(
                        PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                    ),
                    blockedArtifactClasses = listOf(
                        PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE
                    ),
                    redactedArtifactClasses = listOf(
                        PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                    ),
                    summary = "Remote archive requires local split for receipt trace artifacts."
                )
            ),
            splitResult = PortfolioOptimizationDestinationBundleSplitResult(
                splitRequired = true,
                primaryDestinationId = "destination_remote_m40",
                secondaryDestinationId = "destination_local_m40",
                remoteArtifactClasses = listOf(
                    PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                ),
                localArtifactClasses = listOf(
                    PortfolioOptimizationDataExchangeArtifactClass.RECEIPT_TRACE
                ),
                summary = "Split keeps receipt traces local."
            ),
            redactionResult = PortfolioOptimizationDestinationBundleRedactionResult(
                redactionApplied = true,
                redactedArtifactClasses = listOf(
                    PortfolioOptimizationDataExchangeArtifactClass.OBJECTIVE_PROFILE_SNAPSHOT
                ),
                summary = "Redaction-first handling applied."
            ),
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT,
                RoleReasonCodes.ROLE_DESTINATION_BUNDLE_REDACTED
            ),
            summary = "Bundle split keeps local-only artifacts on-device.",
            createdAtMs = 1_700_400_000_010L
        )
        val manifest = PortfolioOptimizationDataExchangeManifest(
            manifestId = "manifest_m40",
            bundleId = bundle.bundleId,
            bundleDecisionId = decision.decisionId,
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            status = PortfolioOptimizationDataExchangeManifestStatus.SPLIT,
            destinationIds = bundle.destinationIds,
            destinationTypes = bundle.destinationTypes,
            artifactRefs = bundle.artifacts,
            boundarySummary = boundarySummary,
            summary = "Manifest split the bundle safely across destinations.",
            createdAtMs = 1_700_400_000_020L
        )
        val approval = PortfolioOptimizationCrossBoundaryApprovalRecord(
            approvalId = "approval_m40",
            bundleDecisionId = decision.decisionId,
            manifestId = manifest.manifestId,
            sourceId = bundle.sourceId,
            required = false,
            status = PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            reasonCodes = listOf(RoleReasonCodes.ROLE_DESTINATION_BUNDLE_AUTO_APPROVED),
            summary = "Split bundle auto-approved within safe bounds.",
            recordedAtMs = 1_700_400_000_030L
        )
        val audit = PortfolioOptimizationCrossBoundaryAuditRecord(
            auditId = "audit_m40",
            bundleDecisionId = decision.decisionId,
            manifestId = manifest.manifestId,
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = bundle.bundleType,
            operationType = PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            result = PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_DESTINATION_BUNDLE_SPLIT,
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_AUDIT_RECORDED
            ),
            summary = "Cross-boundary audit recorded the local split decision.",
            recordedAtMs = 1_700_400_000_040L
        )
        val transportAttempt = PortfolioOptimizationRemoteLearningTransportAttemptRecord(
            attemptId = "transport_attempt_m40",
            remoteEnvelopeId = "remote_envelope_m40",
            purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
            status = PortfolioOptimizationRemoteLearningDeliveryStatus.LOCAL_FALLBACK,
            dataExchangeBundle = bundle.copy(
                purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                bundleType = PortfolioOptimizationSafeDestinationBundleType.LEARNING_ARTIFACT_EXCHANGE
            ),
            bundleDecision = decision.copy(
                purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                bundleType = PortfolioOptimizationSafeDestinationBundleType.LEARNING_ARTIFACT_EXCHANGE,
                status = PortfolioOptimizationDestinationBundleDecisionStatus.REROUTED,
                summary = "Transport bundle rerouted to local-first handling."
            ),
            dataExchangeManifest = manifest.copy(
                purpose = PortfolioOptimizationConsentPurpose.REMOTE_TRANSPORT,
                bundleType = PortfolioOptimizationSafeDestinationBundleType.LEARNING_ARTIFACT_EXCHANGE,
                status = PortfolioOptimizationDataExchangeManifestStatus.REROUTED
            ),
            crossBoundaryApprovalRecordId = approval.approvalId,
            crossBoundaryAuditRecordIds = listOf(audit.auditId),
            summary = "Transport attempt retained the M40 exchange lineage."
        )
        val exportResult = PortfolioOptimizationComplianceAuditExportResult(
            resultId = "audit_result_m40",
            requestId = "audit_request_m40",
            status = PortfolioOptimizationComplianceAuditExportStatus.COMPLETE,
            dataExchangeBundle = bundle,
            bundleDecision = decision,
            dataExchangeManifest = manifest,
            crossBoundaryApprovalRecordId = approval.approvalId,
            crossBoundaryAuditRecordIds = listOf(audit.auditId),
            summary = "Audit export completed with M40 bundle governance."
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                dataExchangeBundleType =
                    PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                dataExchangeDecisionStatus =
                    PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                dataExchangeApprovalStatus =
                    PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
                crossBoundaryAuditOperationType =
                    PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                crossBoundaryAuditResult = PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
                limit = 5
            ),
            generatedAtMs = 1_700_400_000_050L,
            remoteLearningTransportAttemptRecords = listOf(transportAttempt),
            complianceAuditExportResults = listOf(exportResult),
            dataExchangeBundles = listOf(bundle),
            dataExchangeBundleDecisionRecords = listOf(decision),
            dataExchangeManifests = listOf(manifest),
            crossBoundaryApprovalRecords = listOf(approval),
            crossBoundaryAuditRecords = listOf(audit),
            summary = PortfolioOptimizationSummary(
                latestDataExchangeBundleType =
                    PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
                latestDataExchangeDecisionStatus =
                    PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
                latestDataExchangeApprovalStatus =
                    PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
                latestCrossBoundaryAuditOperationType =
                    PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
                latestCrossBoundaryAuditResult =
                    PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
                latestDataExchangeBundleSummary = bundle.summary,
                latestDataExchangeBoundarySummary = boundarySummary.summary,
                latestDataExchangeApprovalSummary = approval.summary,
                latestCrossBoundaryAuditSummary = audit.summary,
                summary = "M40 bundle governance state restored."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":3}}""")

        assertEquals(
            PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
            decoded.query.dataExchangeBundleType
        )
        assertEquals(
            PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            decoded.query.dataExchangeDecisionStatus
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            decoded.query.dataExchangeApprovalStatus
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            decoded.query.crossBoundaryAuditOperationType
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
            decoded.query.crossBoundaryAuditResult
        )
        assertEquals(
            PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            decoded.dataExchangeBundleDecisionRecords.first().status
        )
        assertEquals(
            PortfolioOptimizationDataExchangeManifestStatus.SPLIT,
            decoded.dataExchangeManifests.first().status
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryApprovalStatus.AUTO_APPROVED,
            decoded.crossBoundaryApprovalRecords.first().status
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryAuditOperationType.BUNDLE_SPLIT_REQUIRED,
            decoded.crossBoundaryAuditRecords.first().operationType
        )
        assertEquals(
            PortfolioOptimizationDestinationBundleDecisionStatus.REROUTED,
            decoded.remoteLearningTransportAttemptRecords.first().bundleDecision?.status
        )
        assertEquals(
            PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            decoded.complianceAuditExportResults.first().bundleDecision?.status
        )
        assertEquals(
            PortfolioOptimizationDestinationBundleDecisionStatus.SPLIT,
            decoded.summary?.latestDataExchangeDecisionStatus
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryAuditResult.RECORDED,
            decoded.summary?.latestCrossBoundaryAuditResult
        )
        assertNull(legacy.query.dataExchangeBundleType)
        assertNull(legacy.query.dataExchangeDecisionStatus)
        assertNull(legacy.query.dataExchangeApprovalStatus)
        assertNull(legacy.query.crossBoundaryAuditOperationType)
        assertNull(legacy.query.crossBoundaryAuditResult)
        assertTrue(legacy.dataExchangeBundles.isEmpty())
        assertTrue(legacy.dataExchangeBundleDecisionRecords.isEmpty())
        assertTrue(legacy.dataExchangeManifests.isEmpty())
        assertTrue(legacy.crossBoundaryApprovalRecords.isEmpty())
        assertTrue(legacy.crossBoundaryAuditRecords.isEmpty())
    }

    @Test
    fun encodeDecode_portfolioOptimizationStateWithM42CrossBoundaryGovernancePortfolio() {
        val trustTierAssignment = PortfolioOptimizationDestinationTrustTierAssignment(
            assignmentId = "assignment_m42",
            destinationId = "destination_local_m42",
            destinationType = PortfolioOptimizationRemoteDestinationType.LOCAL_COMPLIANCE_ARCHIVE,
            trustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            sourceIds = listOf("audit_request_m42"),
            reasonCodes = listOf(RoleReasonCodes.ROLE_DESTINATION_TRUST_TIER_ASSIGNED),
            summary = "Local archive is high trust for cross-boundary rollout.",
            updatedAtMs = 1_700_420_000_000L
        )
        val program = PortfolioOptimizationCrossBoundaryProgramRecord(
            programId = "cross_boundary_program_audit_export_compliance_audit_exchange_high_trust_eu_gdpr",
            portfolioId = "cross_boundary_portfolio_audit_export_compliance_audit_exchange",
            purpose = PortfolioOptimizationConsentPurpose.AUDIT_EXPORT,
            bundleType = PortfolioOptimizationSafeDestinationBundleType.COMPLIANCE_AUDIT_EXCHANGE,
            destinationTrustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            programStatus = PortfolioOptimizationCrossBoundaryProgramStatus.ACTIVE,
            priority = PortfolioOptimizationPortfolioPriority.CRITICAL,
            bundleDecisionIds = listOf("bundle_decision_m42"),
            bundleIds = listOf("bundle_m42"),
            destinationIds = listOf("destination_local_m42"),
            nextAction = PortfolioOptimizationPortfolioRecommendationAction.ADVANCE_PROGRAM,
            summary = "High-trust EU program is ready to advance.",
            updatedAtMs = 1_700_420_000_010L
        )
        val trustTierSummary = PortfolioOptimizationTrustTierProgramSummary(
            summaryId = "trust_tier_summary_m42",
            portfolioId = program.portfolioId,
            trustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            rolloutState = PortfolioOptimizationTrustTierRolloutState.ADVANCING,
            programIds = listOf(program.programId),
            readyProgramCount = 1,
            blockedProgramCount = 0,
            summary = "High-trust rollout can advance first.",
            updatedAtMs = 1_700_420_000_020L
        )
        val jurisdictionPlan = PortfolioOptimizationJurisdictionRolloutPlan(
            planId = "jurisdiction_plan_m42",
            portfolioId = program.portfolioId,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            rolloutState = PortfolioOptimizationJurisdictionRolloutState.READY,
            programIds = listOf(program.programId),
            summary = "EU GDPR rollout is sequenced first.",
            updatedAtMs = 1_700_420_000_030L
        )
        val blocker = PortfolioOptimizationPortfolioBlockerSummary(
            blockerId = "blocker_m42",
            portfolioId = program.portfolioId,
            type = PortfolioOptimizationPortfolioBlockerType.APPROVAL,
            scopeKey = "pending_review",
            programIds = listOf(program.programId, "cross_boundary_program_peer"),
            bundleDecisionIds = listOf("bundle_decision_m42", "bundle_decision_peer"),
            blocking = true,
            reasonCodes = listOf(RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_SHARED_BLOCKER_DETECTED),
            summary = "Approval review blocks two programs in the same portfolio.",
            updatedAtMs = 1_700_420_000_040L
        )
        val dependency = PortfolioOptimizationPortfolioDependencySummary(
            dependencyId = "dependency_m42",
            portfolioId = program.portfolioId,
            programId = program.programId,
            dependsOnProgramIds = listOf("cross_boundary_program_peer"),
            reasonCodes = listOf(RoleReasonCodes.ROLE_DESTINATION_TRUST_TIER_DEFERRED),
            summary = "High-trust advance depends on peer approval clearance.",
            updatedAtMs = 1_700_420_000_050L
        )
        val conflict = PortfolioOptimizationPortfolioConflictSummary(
            conflictId = "conflict_m42",
            portfolioId = program.portfolioId,
            type = PortfolioOptimizationPortfolioConflictType.APPROVAL_CONTENTION,
            programIds = listOf(program.programId, "cross_boundary_program_peer"),
            blockerIds = listOf(blocker.blockerId),
            blocking = true,
            summary = "Approval contention requires portfolio review.",
            updatedAtMs = 1_700_420_000_060L
        )
        val priorityDecision = PortfolioOptimizationPortfolioPriorityDecision(
            decisionId = "priority_m42",
            portfolioId = program.portfolioId,
            winningProgramId = program.programId,
            priority = PortfolioOptimizationPortfolioPriority.CRITICAL,
            rankedProgramIds = listOf(program.programId, "cross_boundary_program_peer"),
            reasonCodes = listOf(RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_PRIORITY_SELECTED),
            summary = "Portfolio priority favors the high-trust EU program.",
            createdAtMs = 1_700_420_000_070L
        )
        val recommendation = PortfolioOptimizationPortfolioCoordinationRecommendation(
            recommendationId = "recommendation_m42",
            portfolioId = program.portfolioId,
            action = PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
            targetProgramId = program.programId,
            targetTrustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            targetJurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            blocking = true,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_RECOMMENDATION_UPDATED,
                RoleReasonCodes.ROLE_CROSS_BOUNDARY_PORTFOLIO_SHARED_BLOCKER_DETECTED
            ),
            summary = "Review the shared approval blocker before advancing rollout.",
            createdAtMs = 1_700_420_000_080L
        )
        val portfolio = PortfolioOptimizationCrossBoundaryGovernancePortfolio(
            portfolioId = program.portfolioId,
            scopeKey = "audit_export_compliance_audit_exchange",
            status = PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
            programIds = listOf(program.programId, "cross_boundary_program_peer"),
            sharedBlockerCount = 1,
            conflictCount = 1,
            priorityDecisionId = priorityDecision.decisionId,
            recommendationId = recommendation.recommendationId,
            summary = "Review-required governance portfolio with one shared blocker.",
            updatedAtMs = 1_700_420_000_090L
        )
        val wave = PortfolioOptimizationPortfolioWaveCoordinationRecord(
            coordinationId = "wave_m42",
            portfolioId = program.portfolioId,
            waveKey = "high_trust_eu_gdpr",
            sequenceIndex = 1,
            trustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            jurisdiction = PortfolioOptimizationJurisdiction.EU_GDPR,
            programIds = listOf(program.programId),
            blocking = true,
            summary = "Wave 1 coordinates high-trust EU rollout first.",
            createdAtMs = 1_700_420_000_100L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                governancePortfolioId = portfolio.portfolioId,
                destinationTrustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
                governancePortfolioStatus =
                    PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                trustTierRolloutState = PortfolioOptimizationTrustTierRolloutState.ADVANCING,
                jurisdictionRolloutState = PortfolioOptimizationJurisdictionRolloutState.READY,
                portfolioBlockerType = PortfolioOptimizationPortfolioBlockerType.APPROVAL,
                portfolioConflictType = PortfolioOptimizationPortfolioConflictType.APPROVAL_CONTENTION,
                portfolioRecommendationAction =
                    PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                sharedBlockersOnly = true,
                limit = 6
            ),
            generatedAtMs = 1_700_420_000_110L,
            destinationTrustTierAssignments = listOf(trustTierAssignment),
            crossBoundaryProgramRecords = listOf(program),
            crossBoundaryGovernancePortfolios = listOf(portfolio),
            trustTierProgramSummaries = listOf(trustTierSummary),
            jurisdictionRolloutPlans = listOf(jurisdictionPlan),
            portfolioBlockerSummaries = listOf(blocker),
            portfolioDependencySummaries = listOf(dependency),
            portfolioConflictSummaries = listOf(conflict),
            portfolioPriorityDecisions = listOf(priorityDecision),
            portfolioCoordinationRecommendations = listOf(recommendation),
            portfolioWaveCoordinationRecords = listOf(wave),
            summary = PortfolioOptimizationSummary(
                activeCrossBoundaryGovernancePortfolioId = portfolio.portfolioId,
                activeCrossBoundaryGovernancePortfolioStatus =
                    PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
                activeDestinationTrustTier = PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
                latestCrossBoundaryProgramStatus = PortfolioOptimizationCrossBoundaryProgramStatus.ACTIVE,
                latestTrustTierRolloutState = PortfolioOptimizationTrustTierRolloutState.ADVANCING,
                latestJurisdictionRolloutState = PortfolioOptimizationJurisdictionRolloutState.READY,
                latestPortfolioPriority = PortfolioOptimizationPortfolioPriority.CRITICAL,
                latestPortfolioRecommendationAction =
                    PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
                sharedPortfolioBlockerCount = 1,
                portfolioConflictCount = 1,
                latestCrossBoundaryProgramSummary = program.summary,
                latestGovernancePortfolioSummary = portfolio.summary,
                latestTrustTierProgramSummary = trustTierSummary.summary,
                latestJurisdictionRolloutSummary = jurisdictionPlan.summary,
                latestPortfolioBlockerSummary = blocker.summary,
                latestPortfolioDependencySummary = dependency.summary,
                latestPortfolioConflictSummary = conflict.summary,
                latestPortfolioRecommendationSummary = recommendation.summary,
                summary = "M42 governance portfolio state restored."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":4}}""")

        assertEquals(portfolio.portfolioId, decoded.query.governancePortfolioId)
        assertEquals(
            PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            decoded.query.destinationTrustTier
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
            decoded.query.governancePortfolioStatus
        )
        assertEquals(
            PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
            decoded.query.portfolioRecommendationAction
        )
        assertTrue(decoded.query.sharedBlockersOnly)
        assertEquals(
            PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            decoded.destinationTrustTierAssignments.first().trustTier
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryProgramStatus.ACTIVE,
            decoded.crossBoundaryProgramRecords.first().programStatus
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
            decoded.crossBoundaryGovernancePortfolios.first().status
        )
        assertEquals(
            PortfolioOptimizationTrustTierRolloutState.ADVANCING,
            decoded.trustTierProgramSummaries.first().rolloutState
        )
        assertEquals(
            PortfolioOptimizationJurisdictionRolloutState.READY,
            decoded.jurisdictionRolloutPlans.first().rolloutState
        )
        assertEquals(
            PortfolioOptimizationPortfolioBlockerType.APPROVAL,
            decoded.portfolioBlockerSummaries.first().type
        )
        assertEquals(
            PortfolioOptimizationPortfolioConflictType.APPROVAL_CONTENTION,
            decoded.portfolioConflictSummaries.first().type
        )
        assertEquals(
            PortfolioOptimizationPortfolioPriority.CRITICAL,
            decoded.portfolioPriorityDecisions.first().priority
        )
        assertEquals(
            PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
            decoded.portfolioCoordinationRecommendations.first().action
        )
        assertEquals(
            PortfolioOptimizationDestinationTrustTier.HIGH_TRUST,
            decoded.portfolioWaveCoordinationRecords.first().trustTier
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryGovernancePortfolioStatus.REVIEW_REQUIRED,
            decoded.summary?.activeCrossBoundaryGovernancePortfolioStatus
        )
        assertEquals(
            PortfolioOptimizationPortfolioRecommendationAction.REVIEW_SHARED_BLOCKER,
            decoded.summary?.latestPortfolioRecommendationAction
        )
        assertEquals(1, decoded.summary?.sharedPortfolioBlockerCount)
        assertEquals(1, decoded.summary?.portfolioConflictCount)
        assertNull(legacy.query.governancePortfolioId)
        assertNull(legacy.query.destinationTrustTier)
        assertNull(legacy.query.governancePortfolioStatus)
        assertNull(legacy.query.portfolioRecommendationAction)
        assertTrue(!legacy.query.sharedBlockersOnly)
        assertTrue(legacy.destinationTrustTierAssignments.isEmpty())
        assertTrue(legacy.crossBoundaryProgramRecords.isEmpty())
        assertTrue(legacy.crossBoundaryGovernancePortfolios.isEmpty())
        assertTrue(legacy.trustTierProgramSummaries.isEmpty())
        assertTrue(legacy.jurisdictionRolloutPlans.isEmpty())
        assertTrue(legacy.portfolioBlockerSummaries.isEmpty())
        assertTrue(legacy.portfolioDependencySummaries.isEmpty())
        assertTrue(legacy.portfolioConflictSummaries.isEmpty())
        assertTrue(legacy.portfolioPriorityDecisions.isEmpty())
        assertTrue(legacy.portfolioCoordinationRecommendations.isEmpty())
        assertTrue(legacy.portfolioWaveCoordinationRecords.isEmpty())
    }

    @Test
    fun encodeDecode_portfolioOptimizationStateWithM43AnalyticsRiskBudgetAndCorrectiveActions() {
        val analytics = PortfolioOptimizationCrossBoundaryPortfolioAnalyticsSummary(
            analyticsId = "analytics_m43",
            portfolioId = "cross_boundary_portfolio_m43",
            healthStatus = PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
            trajectoryState = PortfolioOptimizationPortfolioTrajectoryState.DRIFTING,
            sharedBlockerCount = 2,
            conflictCount = 1,
            riskBudgetBreached = true,
            summary = "Analytics detect rising reroute pressure and worsening rollout health.",
            updatedAtMs = 1_700_430_000_010L
        )
        val riskBudget = PortfolioOptimizationRiskBudget(
            budgetId = "risk_budget_m43",
            portfolioId = analytics.portfolioId,
            allocatedUnits = 8,
            consumedUnits = 11,
            remainingUnits = 0,
            breachUnits = 3,
            status = PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
            summary = "Risk budget exceeded after repeated held and blocked exchanges.",
            updatedAtMs = 1_700_430_000_020L
        )
        val trustTierDrift = PortfolioOptimizationTrustTierDriftSummary(
            driftId = "trust_tier_drift_m43",
            portfolioId = analytics.portfolioId,
            trustTier = PortfolioOptimizationDestinationTrustTier.LIMITED,
            driftState = PortfolioOptimizationTrustTierDriftState.DRIFTING,
            driftReasons = listOf(PortfolioOptimizationTrustTierDriftReason.BLOCKER_CONCENTRATION),
            programIds = listOf("cross_boundary_program_limited_us", "cross_boundary_program_limited_eu"),
            blockedCount = 2,
            heldCount = 1,
            summary = "Limited-trust destinations are drifting beyond expected hold rates.",
            updatedAtMs = 1_700_430_000_030L
        )
        val jurisdictionDrift = PortfolioOptimizationJurisdictionDriftSummary(
            driftId = "jurisdiction_drift_m43",
            portfolioId = analytics.portfolioId,
            jurisdiction = PortfolioOptimizationJurisdiction.US_PRIVACY,
            driftState = PortfolioOptimizationJurisdictionDriftState.DRIFTING,
            driftReasons = listOf(PortfolioOptimizationJurisdictionDriftReason.REPEATED_BLOCK),
            programIds = listOf("cross_boundary_program_limited_us", "cross_boundary_program_peer"),
            blockedCount = 2,
            deferredCount = 1,
            summary = "US privacy rollout is drifting behind the approved sequence.",
            updatedAtMs = 1_700_430_000_040L
        )
        val concentration = PortfolioOptimizationDestinationRiskConcentrationSummary(
            concentrationId = "concentration_m43",
            portfolioId = analytics.portfolioId,
            dominantDestinationId = "destination_limited_m43",
            dominantDestinationCount = 2,
            totalDestinationCount = 3,
            concentrationRatio = 0.67,
            highRiskDestinationCount = 2,
            summary = "Two limited-trust destinations now carry most cross-boundary load.",
            updatedAtMs = 1_700_430_000_050L
        )
        val blockerTrend = PortfolioOptimizationPortfolioBlockerTrendSummary(
            trendId = "blocker_trend_m43",
            portfolioId = analytics.portfolioId,
            direction = PortfolioOptimizationTrendDirection.RISING,
            previousCount = 1,
            currentCount = 3,
            dominantBlockerType = PortfolioOptimizationPortfolioBlockerType.APPROVAL,
            summary = "Approval blockers increased from 1 to 3 across the active portfolio.",
            updatedAtMs = 1_700_430_000_060L
        )
        val recommendation = PortfolioOptimizationPortfolioRiskRecommendation(
            recommendationId = "risk_recommendation_m43",
            portfolioId = analytics.portfolioId,
            analyticsId = analytics.analyticsId,
            riskBudgetId = riskBudget.budgetId,
            action = PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
            blocking = true,
            targetTrustTier = PortfolioOptimizationDestinationTrustTier.LIMITED,
            targetJurisdiction = PortfolioOptimizationJurisdiction.US_PRIVACY,
            reasonCodes = listOf(
                RoleReasonCodes.ROLE_RISK_BUDGET_BREACHED,
                RoleReasonCodes.ROLE_PORTFOLIO_CORRECTIVE_RECOMMENDATION_ISSUED
            ),
            summary = "Resequence jurisdictions and limit limited-trust rollout until drift stabilizes.",
            createdAtMs = 1_700_430_000_070L
        )
        val correctiveAction = PortfolioOptimizationCrossBoundaryCorrectiveActionRecord(
            actionRecordId = "corrective_action_m43",
            portfolioId = analytics.portfolioId,
            analyticsId = analytics.analyticsId,
            riskRecommendationId = recommendation.recommendationId,
            actionType = PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
            targetProgramId = "cross_boundary_program_limited_us",
            targetTrustTier = PortfolioOptimizationDestinationTrustTier.LIMITED,
            targetJurisdiction = PortfolioOptimizationJurisdiction.US_PRIVACY,
            actorId = "local-user",
            actorName = "Local Operator",
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_CORRECTIVE_ACTION_RECORDED),
            summary = "Recorded request risk hold for the most concentrated limited-trust program.",
            recordedAtMs = 1_700_430_000_080L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                governancePortfolioId = analytics.portfolioId,
                portfolioHealthStatus = PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
                riskBudgetStatus = PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
                trustTierDriftState = PortfolioOptimizationTrustTierDriftState.DRIFTING,
                jurisdictionDriftState = PortfolioOptimizationJurisdictionDriftState.DRIFTING,
                portfolioRiskRecommendationAction =
                    PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
                correctiveActionType = PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
                riskBudgetBreachedOnly = true,
                limit = 5
            ),
            generatedAtMs = 1_700_430_000_090L,
            crossBoundaryPortfolioAnalyticsSummaries = listOf(analytics),
            portfolioRiskBudgets = listOf(riskBudget),
            trustTierDriftSummaries = listOf(trustTierDrift),
            jurisdictionDriftSummaries = listOf(jurisdictionDrift),
            destinationRiskConcentrationSummaries = listOf(concentration),
            portfolioBlockerTrendSummaries = listOf(blockerTrend),
            portfolioRiskRecommendations = listOf(recommendation),
            crossBoundaryCorrectiveActionRecords = listOf(correctiveAction),
            summary = PortfolioOptimizationSummary(
                activeCrossBoundaryGovernancePortfolioId = analytics.portfolioId,
                activePortfolioHealthStatus = PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
                activePortfolioTrajectoryState = PortfolioOptimizationPortfolioTrajectoryState.DRIFTING,
                activeRiskBudgetStatus = PortfolioOptimizationRiskBudgetStatus.EXCEEDED,
                latestTrustTierDriftState = PortfolioOptimizationTrustTierDriftState.DRIFTING,
                latestJurisdictionDriftState = PortfolioOptimizationJurisdictionDriftState.DRIFTING,
                latestPortfolioRiskRecommendationAction =
                    PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
                riskBudgetBreachCount = 1,
                latestPortfolioAnalyticsSummary = analytics.summary,
                latestTrustTierDriftSummary = trustTierDrift.summary,
                latestJurisdictionDriftSummary = jurisdictionDrift.summary,
                latestRiskBudgetSummary = riskBudget.summary,
                latestDestinationRiskConcentrationSummary = concentration.summary,
                latestPortfolioBlockerTrendSummary = blockerTrend.summary,
                latestPortfolioRiskRecommendationSummary = recommendation.summary,
                latestPortfolioCorrectiveActionSummary = correctiveAction.summary,
                summary = "M43 analytics state restored."
            )
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":4}}""")

        assertEquals(PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK, decoded.query.portfolioHealthStatus)
        assertEquals(PortfolioOptimizationRiskBudgetStatus.EXCEEDED, decoded.query.riskBudgetStatus)
        assertEquals(PortfolioOptimizationTrustTierDriftState.DRIFTING, decoded.query.trustTierDriftState)
        assertEquals(PortfolioOptimizationJurisdictionDriftState.DRIFTING, decoded.query.jurisdictionDriftState)
        assertEquals(
            PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
            decoded.query.portfolioRiskRecommendationAction
        )
        assertEquals(
            PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
            decoded.query.correctiveActionType
        )
        assertTrue(decoded.query.riskBudgetBreachedOnly)
        assertEquals(PortfolioOptimizationRiskBudgetStatus.EXCEEDED, decoded.portfolioRiskBudgets.first().status)
        assertEquals(
            PortfolioOptimizationTrustTierDriftState.DRIFTING,
            decoded.trustTierDriftSummaries.first().driftState
        )
        assertEquals(
            PortfolioOptimizationJurisdictionDriftState.DRIFTING,
            decoded.jurisdictionDriftSummaries.first().driftState
        )
        assertEquals(
            PortfolioOptimizationPortfolioRiskRecommendationAction.SPLIT_JURISDICTION_LANE,
            decoded.portfolioRiskRecommendations.first().action
        )
        assertEquals(
            PortfolioOptimizationCorrectiveActionType.REQUEST_RISK_HOLD,
            decoded.crossBoundaryCorrectiveActionRecords.first().actionType
        )
        assertEquals(
            PortfolioOptimizationCrossBoundaryPortfolioHealthStatus.AT_RISK,
            decoded.summary?.activePortfolioHealthStatus
        )
        assertEquals(PortfolioOptimizationRiskBudgetStatus.EXCEEDED, decoded.summary?.activeRiskBudgetStatus)
        assertEquals(1, decoded.summary?.riskBudgetBreachCount)
        assertNull(legacy.query.portfolioHealthStatus)
        assertNull(legacy.query.riskBudgetStatus)
        assertNull(legacy.query.trustTierDriftState)
        assertNull(legacy.query.jurisdictionDriftState)
        assertNull(legacy.query.portfolioRiskRecommendationAction)
        assertNull(legacy.query.correctiveActionType)
        assertTrue(!legacy.query.riskBudgetBreachedOnly)
        assertTrue(legacy.crossBoundaryPortfolioAnalyticsSummaries.isEmpty())
        assertTrue(legacy.portfolioRiskBudgets.isEmpty())
        assertTrue(legacy.trustTierDriftSummaries.isEmpty())
        assertTrue(legacy.jurisdictionDriftSummaries.isEmpty())
        assertTrue(legacy.destinationRiskConcentrationSummaries.isEmpty())
        assertTrue(legacy.portfolioBlockerTrendSummaries.isEmpty())
        assertTrue(legacy.portfolioRiskRecommendations.isEmpty())
        assertTrue(legacy.crossBoundaryCorrectiveActionRecords.isEmpty())
    }

    @Test
    fun encodeDecode_portfolioOptimizationStateWithM44SafetyGuardrailAndRemediationControls() {
        val safetyRail = PortfolioOptimizationPortfolioSafetyRail(
            safetyRailId = "safety_rail_m44",
            portfolioId = "cross_boundary_portfolio_m44",
            type = PortfolioOptimizationPortfolioSafetyRailType.RISK_BUDGET,
            safetyState = PortfolioOptimizationPortfolioSafetyState.GUARDED,
            enforcementMode = PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            blocking = true,
            targetProgramId = "cross_boundary_program_m44",
            targetTrustTier = PortfolioOptimizationDestinationTrustTier.LIMITED,
            targetJurisdiction = PortfolioOptimizationJurisdiction.US_PRIVACY,
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SAFETY_GUARDED),
            summary = "Risk budget guardrail requires a bounded soft-stop before broader rollout.",
            updatedAtMs = 1_700_440_000_010L
        )
        val budgetGuardrail = PortfolioOptimizationBudgetGuardrail(
            guardrailId = "budget_guardrail_m44",
            portfolioId = safetyRail.portfolioId,
            riskBudgetId = "risk_budget_m44",
            state = PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
            enforcementMode = PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            approvalRequired = false,
            breachUnits = 2,
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_BUDGET_SOFT_STOP),
            summary = "Budget soft-stop remains active until risk pressure falls.",
            updatedAtMs = 1_700_440_000_020L
        )
        val safetySummary = PortfolioOptimizationPortfolioSafetySummary(
            summaryId = "portfolio_safety_summary_m44",
            portfolioId = safetyRail.portfolioId,
            safetyState = PortfolioOptimizationPortfolioSafetyState.GUARDED,
            enforcementMode = PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            activeSafetyRailIds = listOf(safetyRail.safetyRailId),
            budgetGuardrailId = budgetGuardrail.guardrailId,
            remediationControlId = "remediation_control_m44",
            violationCount = 1,
            quarantineActive = false,
            approvalRequired = false,
            reasonCodes = listOf(RoleReasonCodes.ROLE_PORTFOLIO_SAFETY_GUARDED),
            summary = "Portfolio safety is guarded with soft-stop enforcement.",
            updatedAtMs = 1_700_440_000_030L
        )
        val remediationControl = PortfolioOptimizationRemediationAutomationControl(
            controlId = "remediation_control_m44",
            portfolioId = safetyRail.portfolioId,
            automationState = PortfolioOptimizationRemediationAutomationState.THROTTLED,
            enforcementMode = PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            suppressionReason = PortfolioOptimizationRemediationSuppressionReason.SHARED_BLOCKERS,
            throttleLimit = 1,
            approvalRequired = false,
            quarantined = false,
            linkedRecommendationId = "risk_recommendation_m44",
            linkedCorrectiveActionId = "corrective_action_m44",
            reasonCodes = listOf(RoleReasonCodes.ROLE_REMEDIATION_AUTOMATION_THROTTLED),
            summary = "Remediation automation is throttled while blockers stabilize.",
            updatedAtMs = 1_700_440_000_040L
        )
        val state = PortfolioOptimizationState(
            query = PortfolioOptimizationQuery(
                portfolioSafetyState = PortfolioOptimizationPortfolioSafetyState.GUARDED,
                budgetGuardrailState = PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
                portfolioEnforcementMode = PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                remediationAutomationState = PortfolioOptimizationRemediationAutomationState.THROTTLED,
                approvalRequiredOnly = false,
                limit = 4
            ),
            summary = PortfolioOptimizationSummary(
                activePortfolioSafetyState = PortfolioOptimizationPortfolioSafetyState.GUARDED,
                activeBudgetGuardrailState = PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
                activePortfolioEnforcementMode = PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
                activeRemediationAutomationState = PortfolioOptimizationRemediationAutomationState.THROTTLED,
                latestPortfolioSafetySummary = safetySummary.summary,
                latestPortfolioSafetyRailSummary = safetyRail.summary,
                latestBudgetGuardrailSummary = budgetGuardrail.summary,
                latestRemediationAutomationSummary = remediationControl.summary,
                reasonCodes = listOf(
                    RoleReasonCodes.ROLE_PORTFOLIO_SAFETY_GUARDED,
                    RoleReasonCodes.ROLE_PORTFOLIO_BUDGET_SOFT_STOP,
                    RoleReasonCodes.ROLE_REMEDIATION_AUTOMATION_THROTTLED
                ),
                summary = "M44 safety state restored."
            ),
            portfolioSafetyRails = listOf(safetyRail),
            portfolioBudgetGuardrails = listOf(budgetGuardrail),
            portfolioSafetySummaries = listOf(safetySummary),
            portfolioRemediationAutomationControls = listOf(remediationControl)
        )

        val decoded = DomainJson.decode<PortfolioOptimizationState>(DomainJson.encode(state))
        val legacy = DomainJson.decode<PortfolioOptimizationState>("""{"query":{"limit":4}}""")

        assertEquals(
            PortfolioOptimizationPortfolioSafetyState.GUARDED,
            decoded.query.portfolioSafetyState
        )
        assertEquals(
            PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
            decoded.query.budgetGuardrailState
        )
        assertEquals(
            PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            decoded.query.portfolioEnforcementMode
        )
        assertEquals(
            PortfolioOptimizationRemediationAutomationState.THROTTLED,
            decoded.query.remediationAutomationState
        )
        assertEquals(
            PortfolioOptimizationPortfolioSafetyState.GUARDED,
            decoded.portfolioSafetySummaries.first().safetyState
        )
        assertEquals(
            PortfolioOptimizationBudgetGuardrailState.SOFT_STOP,
            decoded.portfolioBudgetGuardrails.first().state
        )
        assertEquals(
            PortfolioOptimizationRemediationAutomationState.THROTTLED,
            decoded.portfolioRemediationAutomationControls.first().automationState
        )
        assertEquals(
            PortfolioOptimizationPortfolioSafetyState.GUARDED,
            decoded.summary?.activePortfolioSafetyState
        )
        assertEquals(
            PortfolioOptimizationPortfolioEnforcementMode.SOFT_STOP,
            decoded.summary?.activePortfolioEnforcementMode
        )
        assertNull(legacy.query.portfolioSafetyState)
        assertNull(legacy.query.budgetGuardrailState)
        assertNull(legacy.query.portfolioEnforcementMode)
        assertNull(legacy.query.remediationAutomationState)
        assertTrue(!legacy.query.quarantinedOnly)
        assertTrue(!legacy.query.approvalRequiredOnly)
        assertTrue(legacy.portfolioSafetyRails.isEmpty())
        assertTrue(legacy.portfolioBudgetGuardrails.isEmpty())
        assertTrue(legacy.portfolioSafetySummaries.isEmpty())
        assertTrue(legacy.portfolioRemediationAutomationControls.isEmpty())
    }
}
