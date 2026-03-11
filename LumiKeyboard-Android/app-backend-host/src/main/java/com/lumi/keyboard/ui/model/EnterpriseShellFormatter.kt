package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.ActorAvailabilityPayload
import com.lumi.coredomain.contract.DependencyReadinessState
import com.lumi.coredomain.contract.EnvironmentActivationPayload
import com.lumi.coredomain.contract.EnvironmentKind
import com.lumi.coredomain.contract.LocalRoleLabSummaryPayload
import com.lumi.coredomain.contract.PilotActivationStatus
import com.lumi.coredomain.contract.PolicyStudioSummaryPayload
import com.lumi.coredomain.contract.ProductShellSummaryPayload
import com.lumi.coredomain.contract.RequesterInboxGroup
import com.lumi.coredomain.contract.RequesterInboxItemPayload
import com.lumi.coredomain.contract.TenantAdminActivationSummaryPayload

data class RequesterInboxSection(
    val group: RequesterInboxGroup,
    val title: String,
    val items: List<RequesterInboxItemPayload>
)

object EnterpriseShellFormatter {
    fun environmentBadge(activation: EnvironmentActivationPayload?): String {
        return when (activation?.environmentKind) {
            EnvironmentKind.SIMULATOR -> "SIMULATOR"
            EnvironmentKind.DEMO -> "DEMO"
            EnvironmentKind.PILOT -> "PILOT"
            EnvironmentKind.PRODUCTION -> "PRODUCTION"
            null -> "UNKNOWN"
        }
    }

    fun environmentHeadline(activation: EnvironmentActivationPayload?): String {
        if (activation == null) return "Environment status unavailable"
        val label = activation.environmentLabel.ifBlank { "Environment" }
        val modeSuffix = when {
            activation.workspaceMode.equals("demo", ignoreCase = true) -> "Demo workspace"
            activation.workspaceMode.equals("local_lab", ignoreCase = true) -> "Local role lab"
            else -> readableActivationStatus(activation.pilotActivationStatus)
        }
        return "$label · $modeSuffix"
    }

    fun readableActivationStatus(status: PilotActivationStatus): String {
        return when (status) {
            PilotActivationStatus.NOT_APPLICABLE -> "Not ready for pilot"
            PilotActivationStatus.DEMO_READY -> "Demo ready"
            PilotActivationStatus.PILOT_BLOCKED -> "Pilot blocked"
            PilotActivationStatus.PILOT_READY -> "Pilot ready"
            PilotActivationStatus.PRODUCTION_READY -> "Production ready"
        }
    }

    fun activationLines(activation: EnvironmentActivationPayload?): List<String> {
        if (activation == null) return listOf("Environment truth is not available yet.")
        val lines = mutableListOf<String>()
        lines += "Workspace binding: ${activation.workspaceBindingKind.name.lowercase().replace('_', ' ')}"
        lines += "Activation: ${readableActivationStatus(activation.pilotActivationStatus)}"
        lines += "Activation ready: ${if (activation.activationReady) "yes" else "no"}"
        activation.activationReadySummary.takeIf { it.isNotBlank() }?.let(lines::add)
        activation.environmentBinding?.summary?.takeIf { it.isNotBlank() }?.let(lines::add)
        activation.connectorActivation?.summary?.takeIf { it.isNotBlank() }?.let(lines::add)
        if (activation.simulatorBacking) {
            lines += "This is a simulator-backed environment."
        }
        activation.actorAvailability.map(::actorLine).forEach(lines::add)
        activation.identityReadiness?.summary?.takeIf { it.isNotBlank() }?.let(lines::add)
        activation.connectorReadiness?.summary?.takeIf { it.isNotBlank() }?.let(lines::add)
        activation.vaultReadiness?.summary?.takeIf { it.isNotBlank() }?.let(lines::add)
        lines += activation.missingDependencySummaries
        return lines.distinct()
    }

    fun actorLine(actor: ActorAvailabilityPayload): String {
        val label = actor.role.name.lowercase().replace('_', ' ')
        return when (actor.state) {
            DependencyReadinessState.READY -> "$label available: ${actor.actorLabel ?: actor.actorId ?: "configured"}"
            DependencyReadinessState.DEMO_ONLY -> "$label demo-only: ${actor.actorLabel ?: "demo actor"}"
            DependencyReadinessState.MISSING -> actor.summary.ifBlank { "Missing $label" }
            DependencyReadinessState.DEGRADED -> actor.summary.ifBlank { "$label degraded" }
            DependencyReadinessState.BLOCKED -> actor.summary.ifBlank { "$label blocked" }
        }
    }

    fun requesterInboxSections(
        productShell: ProductShellSummaryPayload?,
        selectedWorkspaceMode: String,
    ): List<RequesterInboxSection> {
        val rawItems = if (selectedWorkspaceMode.equals("demo", ignoreCase = true)) {
            productShell?.demoRequesterInboxItems.orEmpty()
        } else {
            productShell?.requesterInboxItems.orEmpty()
        }
        val grouped = rawItems.groupBy { it.group }
        val order = listOf(
            RequesterInboxGroup.IN_PROGRESS,
            RequesterInboxGroup.BLOCKED,
            RequesterInboxGroup.WAITING,
            RequesterInboxGroup.COMPLETED
        )
        return order.mapNotNull { group ->
            val items = grouped[group].orEmpty()
            if (items.isEmpty()) return@mapNotNull null
            RequesterInboxSection(
                group = group,
                title = when (group) {
                    RequesterInboxGroup.IN_PROGRESS -> "In progress"
                    RequesterInboxGroup.BLOCKED -> "Blocked"
                    RequesterInboxGroup.WAITING -> "Waiting"
                    RequesterInboxGroup.COMPLETED -> "Completed"
                },
                items = items.sortedByDescending { it.updatedAtMs }
            )
        }
    }

    fun inboxItemLine(item: RequesterInboxItemPayload): String {
        val label = when {
            item.workspaceBindingKind == com.lumi.coredomain.contract.WorkspaceBindingKind.LOCAL_ROLE_LAB_WORKSPACE -> "Local lab"
            item.isDemoData -> "Demo"
            item.isPilotEvidence -> "Pilot"
            else -> "Live"
        }
        val blocker = item.blockerSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""
        return "$label · ${item.summary}$blocker"
    }

    fun tenantAdminLines(summary: TenantAdminActivationSummaryPayload?): List<String> {
        if (summary == null) return listOf("Tenant admin setup is unavailable.")
        return buildList {
            add(summary.summary.ifBlank { "Tenant admin setup status unavailable." })
            addAll(summary.detailLines.filter { it.isNotBlank() })
        }.distinct()
    }

    fun activationPackageLines(productShell: ProductShellSummaryPayload?): List<String> {
        val activationPackage = productShell?.activationPackage ?: return listOf("Activation package state unavailable.")
        return buildList {
            add(activationPackage.summary.ifBlank { "Activation package state unavailable." })
            add("Package status: ${activationPackage.status.name.lowercase().replace('_', ' ')}")
            add("Owner: ${activationPackage.ownerLabel.ifBlank { "Unassigned" }}")
            add("Pending requirements: ${activationPackage.pendingRequirementCount}")
            add("Rejected intakes: ${activationPackage.rejectedIntakeCount}")
            addAll(
                activationPackage.recentIntakes.take(3).map { intake ->
                    "${intake.artifactKind.name.lowercase().replace('_', ' ')} · ${intake.verificationStatus.name.lowercase().replace('_', ' ')} · ${intake.summary}"
                }
            )
        }.distinct()
    }

    fun localRoleLabLines(summary: LocalRoleLabSummaryPayload?): List<String> {
        if (summary == null || !summary.enabled) return listOf("Local role lab unavailable.")
        return buildList {
            add(summary.summary.ifBlank { "Local role lab unavailable." })
            add("Active seat: ${summary.actors.firstOrNull { it.isActive }?.actorLabel ?: summary.activeActorId}")
            add("${summary.scenario.title} · ${summary.scenario.currentStage}")
            addAll(summary.handoffTimeline.take(3).map { "${it.title} · ${it.status.name.lowercase()}" })
            add(summary.evidenceClassificationSummary)
            add(summary.pilotActivationGapSummary)
            add(summary.dayZeroBlockedSummary)
        }.distinct()
    }

    fun buildPolicyStudioLines(summary: PolicyStudioSummaryPayload?): List<String> {
        if (summary == null) return listOf("Policy Studio summary unavailable.")
        return buildList {
            add(summary.summary.ifBlank { "Policy Studio summary unavailable." })
            addAll(summary.detailLines.filter { it.isNotBlank() })
        }.distinct()
    }
}
