package com.lumi.coreagent.task

import com.lumi.coredomain.contract.EvidenceItemPayload
import com.lumi.coredomain.contract.ExecutionStepPayload
import com.lumi.coredomain.contract.ModuleId
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.TaskTrackPayload
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.RoleChangeReason
import com.lumi.coredomain.contract.RoleSource
import com.lumi.coredomain.contract.UserRole

object TaskTrackBuilder {

    fun build(
        module: ModuleId,
        query: String,
        traceId: String,
        phase: String,
        status: ResponseStatus,
        evidenceItems: List<EvidenceItemPayload>,
        nowMs: Long,
        activeRole: UserRole? = null,
        roleSource: RoleSource? = null,
        roleChangeReason: RoleChangeReason? = null,
        roleImpactReasonCodes: List<String> = emptyList(),
        delegationMode: DelegationMode? = null
    ): TaskTrackPayload {
        val template = stepTemplateFor(module, query)
        val steps = statusize(template, status, nowMs)
        return TaskTrackPayload(
            taskId = "task_${traceId.take(8)}",
            traceId = traceId,
            phase = phase,
            progress = progressFor(status),
            steps = steps,
            evidenceItems = evidenceItems.take(6),
            activeRole = activeRole,
            roleSource = roleSource,
            roleChangeReason = roleChangeReason,
            roleImpactReasonCodes = roleImpactReasonCodes,
            delegationMode = delegationMode,
            lastUpdateMs = nowMs
        )
    }

    private fun stepTemplateFor(module: ModuleId, query: String): List<String> {
        return when (module) {
            ModuleId.HOME -> listOf("Aggregate home status", "Update key metrics", "Refresh quick actions")
            ModuleId.CHAT -> listOf("Understand request", "Retrieve evidence", "Generate reply drafts")
            ModuleId.LIX -> listOf("Build intent contract", "Collect and compare quotes", "Verify proof and commit")
            ModuleId.AGENT_MARKET -> listOf("Discover external capabilities", "Evaluate capability fit", "Summarize recommended capabilities")
            ModuleId.AVATAR -> listOf("Load preferences and permissions", "Apply approval and data-scope rules", "Explain local/cloud behavior")
            ModuleId.DESTINY -> listOf("Evaluate recommendations and risk", "Generate strategy options", "Output next-best actions")
            ModuleId.SETTINGS -> listOf("Check service status", "Inspect toggle configuration", "Generate diagnostic summary")
        }.mapIndexed { index, title ->
            if (index == 0 && query.isNotBlank()) {
                "$title · ${query.take(16)}"
            } else {
                title
            }
        }
    }

    private fun statusize(
        template: List<String>,
        status: ResponseStatus,
        nowMs: Long
    ): List<ExecutionStepPayload> {
        val terminal = status == ResponseStatus.SUCCESS ||
            status == ResponseStatus.PARTIAL ||
            status == ResponseStatus.COMMITTED ||
            status == ResponseStatus.ROLLED_BACK ||
            status == ResponseStatus.DISPUTED ||
            status == ResponseStatus.ERROR ||
            status == ResponseStatus.CANCELLED

        return template.mapIndexed { index, title ->
            val stepStatus = when {
                terminal && status == ResponseStatus.SUCCESS -> ResponseStatus.SUCCESS
                terminal && status == ResponseStatus.PARTIAL && index < template.lastIndex -> ResponseStatus.SUCCESS
                terminal && status == ResponseStatus.PARTIAL -> ResponseStatus.PARTIAL
                terminal && status == ResponseStatus.COMMITTED -> ResponseStatus.COMMITTED
                terminal && status == ResponseStatus.ROLLED_BACK -> ResponseStatus.ROLLED_BACK
                terminal && status == ResponseStatus.DISPUTED -> ResponseStatus.DISPUTED
                terminal && status == ResponseStatus.ERROR && index == 0 -> ResponseStatus.ERROR
                terminal && status == ResponseStatus.CANCELLED && index == 0 -> ResponseStatus.CANCELLED
                status == ResponseStatus.WAITING_USER && index == 1 -> ResponseStatus.WAITING_USER
                status == ResponseStatus.QUOTING && index == 1 -> ResponseStatus.QUOTING
                status == ResponseStatus.AUTH_REQUIRED && index == 1 -> ResponseStatus.AUTH_REQUIRED
                status == ResponseStatus.VERIFYING && index == 2 -> ResponseStatus.VERIFYING
                status == ResponseStatus.RUNNING && index == 1 -> ResponseStatus.RUNNING
                status == ResponseStatus.PROCESSING && index == 0 -> ResponseStatus.PROCESSING
                else -> ResponseStatus.PROCESSING
            }
            ExecutionStepPayload(
                id = "step_${index + 1}",
                title = title,
                status = stepStatus,
                detail = detailFor(stepStatus),
                startedAtMs = nowMs,
                finishedAtMs = if (terminal && index <= 1) nowMs else null
            )
        }
    }

    private fun progressFor(status: ResponseStatus): Float {
        return when (status) {
            ResponseStatus.PROCESSING -> 0.18f
            ResponseStatus.RUNNING -> 0.56f
            ResponseStatus.WAITING_USER -> 0.82f
            ResponseStatus.QUOTING -> 0.64f
            ResponseStatus.AUTH_REQUIRED -> 0.72f
            ResponseStatus.VERIFYING -> 0.88f
            ResponseStatus.COMMITTED -> 1.0f
            ResponseStatus.SUCCESS -> 1.0f
            ResponseStatus.PARTIAL -> 0.9f
            ResponseStatus.ROLLED_BACK -> 1.0f
            ResponseStatus.DISPUTED -> 1.0f
            ResponseStatus.ERROR,
            ResponseStatus.CANCELLED -> 1.0f
        }
    }

    private fun detailFor(status: ResponseStatus): String {
        return when (status) {
            ResponseStatus.PROCESSING -> "Queued"
            ResponseStatus.RUNNING -> "Running"
            ResponseStatus.WAITING_USER -> "Awaiting confirmation"
            ResponseStatus.QUOTING -> "Collecting quotes"
            ResponseStatus.AUTH_REQUIRED -> "Authorization required"
            ResponseStatus.VERIFYING -> "Verifying proof"
            ResponseStatus.COMMITTED -> "Committed"
            ResponseStatus.SUCCESS -> "Completed"
            ResponseStatus.PARTIAL -> "Partially completed"
            ResponseStatus.ROLLED_BACK -> "Rolled back"
            ResponseStatus.DISPUTED -> "Disputed"
            ResponseStatus.ERROR -> "Execution failed"
            ResponseStatus.CANCELLED -> "Canceled"
        }
    }
}
