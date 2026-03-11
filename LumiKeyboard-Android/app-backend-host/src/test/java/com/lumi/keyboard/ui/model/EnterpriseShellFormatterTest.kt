package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.ActorAvailabilityPayload
import com.lumi.coredomain.contract.ActorRole
import com.lumi.coredomain.contract.DependencyReadinessState
import com.lumi.coredomain.contract.EnvironmentActivationPayload
import com.lumi.coredomain.contract.EnvironmentKind
import com.lumi.coredomain.contract.IdentityReadinessPayload
import com.lumi.coredomain.contract.LocalRoleLabActorPayload
import com.lumi.coredomain.contract.LocalRoleLabHandoffStatus
import com.lumi.coredomain.contract.LocalRoleLabHandoffStepPayload
import com.lumi.coredomain.contract.LocalRoleLabScenarioPayload
import com.lumi.coredomain.contract.LocalRoleLabSummaryPayload
import com.lumi.coredomain.contract.PilotActivationStatus
import com.lumi.coredomain.contract.PilotActivationPackageStatus
import com.lumi.coredomain.contract.PilotActivationPackageSummaryPayload
import com.lumi.coredomain.contract.PilotExternalArtifactIntakePayload
import com.lumi.coredomain.contract.PilotExternalArtifactKind
import com.lumi.coredomain.contract.PilotExternalArtifactVerificationStatus
import com.lumi.coredomain.contract.PolicyStudioSummaryPayload
import com.lumi.coredomain.contract.ProductShellSummaryPayload
import com.lumi.coredomain.contract.RequesterInboxGroup
import com.lumi.coredomain.contract.RequesterInboxItemPayload
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.TenantAdminActivationSummaryPayload
import com.lumi.coredomain.contract.WorkspaceBindingKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EnterpriseShellFormatterTest {

    @Test
    fun environmentHeadline_andActivationLines_surfaceSimulatorAndMissingReadiness() {
        val activation = EnvironmentActivationPayload(
            environmentKind = EnvironmentKind.SIMULATOR,
            environmentLabel = "Simulator workspace",
            workspaceBindingKind = WorkspaceBindingKind.UNBOUND,
            workspaceMode = "current",
            pilotActivationStatus = PilotActivationStatus.PILOT_BLOCKED,
            simulatorBacking = true,
            missingDependencySummaries = listOf("Missing operator access", "Missing tenant-admin touchpoint"),
            actorAvailability = listOf(
                ActorAvailabilityPayload(
                    role = ActorRole.OPERATOR,
                    state = DependencyReadinessState.MISSING,
                    summary = "Missing operator access",
                    missingDependencyCode = "operator_access_missing"
                )
            ),
            identityReadiness = IdentityReadinessPayload(
                state = DependencyReadinessState.MISSING,
                summary = "Identity not ready",
                issues = listOf("identity_not_ready")
            )
        )

        val headline = EnterpriseShellFormatter.environmentHeadline(activation)
        val lines = EnterpriseShellFormatter.activationLines(activation)

        assertTrue(headline.contains("Simulator workspace", ignoreCase = true))
        assertTrue(headline.contains("Pilot blocked", ignoreCase = true))
        assertTrue(lines.any { it.contains("simulator-backed", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Missing operator access", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Identity not ready", ignoreCase = true) })
    }

    @Test
    fun requesterInboxSections_groupAndKeepDemoLabeling() {
        val shellSummary = ProductShellSummaryPayload(
            requesterInboxItems = listOf(
                RequesterInboxItemPayload(
                    taskId = "live-1",
                    traceId = "trace-live-1",
                    title = "Live task",
                    status = ResponseStatus.PROCESSING,
                    group = RequesterInboxGroup.IN_PROGRESS,
                    summary = "Live execution",
                    updatedAtMs = 10L,
                    workspaceBindingKind = WorkspaceBindingKind.UNBOUND,
                    environmentKind = EnvironmentKind.SIMULATOR,
                    isDemoData = false,
                    isPilotEvidence = false
                )
            ),
            demoRequesterInboxItems = listOf(
                RequesterInboxItemPayload(
                    taskId = "demo-1",
                    traceId = "trace-demo-1",
                    title = "Demo task",
                    status = ResponseStatus.COMMITTED,
                    group = RequesterInboxGroup.COMPLETED,
                    summary = "Demo completed",
                    updatedAtMs = 20L,
                    workspaceBindingKind = WorkspaceBindingKind.DEMO_WORKSPACE,
                    environmentKind = EnvironmentKind.DEMO,
                    isDemoData = true,
                    isPilotEvidence = false
                )
            )
        )

        val liveSections = EnterpriseShellFormatter.requesterInboxSections(shellSummary, "current")
        val demoSections = EnterpriseShellFormatter.requesterInboxSections(shellSummary, "demo")

        assertEquals(RequesterInboxGroup.IN_PROGRESS, liveSections.first().group)
        assertEquals(RequesterInboxGroup.COMPLETED, demoSections.first().group)
        assertTrue(demoSections.first().items.first().isDemoData)
        assertTrue(!demoSections.first().items.first().isPilotEvidence)
    }

    @Test
    fun tenantAdmin_andPolicyStudio_linesStayReadable() {
        val tenantAdmin = TenantAdminActivationSummaryPayload(
            status = DependencyReadinessState.BLOCKED,
            title = "Tenant Admin Setup / Activation",
            summary = "Environment is not ready for pilot activation.",
            detailLines = listOf("Missing requester actor", "Missing connector readiness")
        )
        val policyStudio = PolicyStudioSummaryPayload(
            packName = "Agent OS Policy Pack",
            packVersion = "runtime-v1",
            summary = "Policy Studio v1 exposes the current role policy editor.",
            detailLines = listOf("Policy pack: Agent OS runtime policy")
        )

        val tenantLines = EnterpriseShellFormatter.tenantAdminLines(tenantAdmin)
        val policyLines = EnterpriseShellFormatter.buildPolicyStudioLines(policyStudio)

        assertTrue(tenantLines.first().contains("not ready for pilot", ignoreCase = true))
        assertTrue(tenantLines.any { it.contains("Missing requester actor", ignoreCase = true) })
        assertTrue(policyLines.any { it.contains("Policy pack", ignoreCase = true) })
    }

    @Test
    fun activationPackage_linesSurfacePendingAndRejectedIntakeState() {
        val shellSummary = ProductShellSummaryPayload(
            activationPackage = PilotActivationPackageSummaryPayload(
                packageId = "pkg_1",
                status = PilotActivationPackageStatus.VERIFICATION_PENDING,
                ownerLabel = "Pilot commander",
                summary = "External activation package is waiting on verification.",
                pendingRequirementCount = 2,
                rejectedIntakeCount = 1,
                recentIntakes = listOf(
                    PilotExternalArtifactIntakePayload(
                        intakeId = "intake_1",
                        artifactKind = PilotExternalArtifactKind.REAL_EVIDENCE,
                        source = "REAL_PILOT",
                        summary = "Workflow artifact submitted",
                        verificationStatus = PilotExternalArtifactVerificationStatus.VERIFIED
                    )
                )
            )
        )

        val lines = EnterpriseShellFormatter.activationPackageLines(shellSummary)

        assertTrue(lines.any { it.contains("waiting on verification", ignoreCase = true) })
        assertTrue(lines.any { it.contains("verification pending", ignoreCase = true) })
        assertTrue(lines.any { it.contains("Workflow artifact submitted", ignoreCase = true) })
    }

    @Test
    fun environmentHeadline_usesLocalRoleLabSuffixWhenWorkspaceModeIsLocalLab() {
        val activation = EnvironmentActivationPayload(
            environmentKind = EnvironmentKind.SIMULATOR,
            environmentLabel = "Local role lab (simulator-backed)",
            workspaceBindingKind = WorkspaceBindingKind.LOCAL_ROLE_LAB_WORKSPACE,
            workspaceMode = "local_lab"
        )

        val headline = EnterpriseShellFormatter.environmentHeadline(activation)

        assertTrue(headline.contains("Local role lab", ignoreCase = true))
    }

    @Test
    fun sandboxFormatter_linesExposeTemplatesWalkthroughOutcomeAndGap() {
        val summary = LocalRoleLabSummaryPayload(
            enabled = true,
            label = "Local role lab",
            summary = "Enterprise sandbox for requester, operator, and tenant-admin collaboration on one device.",
            activeActorId = "local_operator_01",
            activeRole = ActorRole.OPERATOR,
            dayZeroBlockedSummary = "True pilot Day 0 is blocked until a real task/session/run artifact exists outside the local role lab.",
            scenario = LocalRoleLabScenarioPayload(
                scenarioId = "advisor_client_intake",
                title = "Advisor Client Intake → Compliance Review → CRM Handoff",
                summary = "Guide one advisory intake through requester submission, operator review, compliance gating, and blocked CRM handoff.",
                currentStage = "Operator review required for Eleanor Hart",
                focusPoints = listOf("Keep active role visible")
            ),
            handoffTimeline = listOf(
                LocalRoleLabHandoffStepPayload(
                    stepId = "s1",
                    fromRole = ActorRole.REQUESTER,
                    toRole = ActorRole.OPERATOR,
                    title = "Requester submits Eleanor Hart intake",
                    summary = "Requester creates the intake and routes it to operator review.",
                    status = LocalRoleLabHandoffStatus.COMPLETED
                ),
                LocalRoleLabHandoffStepPayload(
                    stepId = "s2",
                    fromRole = ActorRole.OPERATOR,
                    toRole = ActorRole.TENANT_ADMIN,
                    title = "Operator review required for Eleanor Hart",
                    summary = "Operator must complete missing compliance fields before handoff.",
                    status = LocalRoleLabHandoffStatus.ACTIVE
                )
            ),
            evidenceClassificationSummary = "All local role lab artifacts are rehearsal-only and remain blocked from REAL_PILOT promotion.",
            pilotActivationGapSummary = "A real pilot still needs a real environment binding.",
            actors = listOf(
                LocalRoleLabActorPayload(
                    actorId = "local_operator_01",
                    role = ActorRole.OPERATOR,
                    actorLabel = "Local Operator",
                    sessionId = "lab_sess_operator_01",
                    summary = "Operator rehearsal view",
                    isActive = true
                )
            )
        )

        val templateLines = EnterpriseShellFormatter.sandboxScenarioLines(summary)
        val walkthroughLines = EnterpriseShellFormatter.sandboxWalkthroughLines(summary)
        val outcomeLines = EnterpriseShellFormatter.sandboxOutcomeLines(summary)
        val gapLines = EnterpriseShellFormatter.sandboxGapLines(summary)

        assertEquals(3, templateLines.size)
        assertTrue(templateLines.first().contains("Advisor Client Intake", ignoreCase = true))
        assertTrue(templateLines.any { it.contains("Cross-Boundary Export Review", ignoreCase = true) })
        assertTrue(walkthroughLines.any { it.contains("Requester submits Eleanor Hart intake", ignoreCase = true) })
        assertTrue(outcomeLines.any { it.contains("Operator review required for Eleanor Hart", ignoreCase = true) })
        assertTrue(gapLines.any { it.contains("REAL_PILOT", ignoreCase = true) })
    }
}
