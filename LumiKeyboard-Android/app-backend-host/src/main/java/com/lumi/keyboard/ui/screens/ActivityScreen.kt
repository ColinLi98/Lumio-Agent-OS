package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AlertRoutingTargetType
import com.lumi.coredomain.contract.GovernanceAlertSeverity
import com.lumi.coredomain.contract.GovernanceActionType
import com.lumi.coredomain.contract.GovernanceBulkActionRequest
import com.lumi.coredomain.contract.GovernanceCasePriority
import com.lumi.coredomain.contract.GovernanceCaseRecord
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.GovernanceQueueType
import com.lumi.coredomain.contract.OperatorQueuePreset
import com.lumi.coredomain.contract.OperatorQueuePresetMatch
import com.lumi.coredomain.contract.OperatorAssigneeRef
import com.lumi.coredomain.contract.GovernanceCollaborationActionSource
import com.lumi.coredomain.contract.PortfolioScenarioAssumptionSet
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioScenarioModification
import com.lumi.coredomain.contract.PortfolioScenarioModificationType
import com.lumi.coredomain.contract.PortfolioOptimizationConstraintPreset
import com.lumi.coredomain.contract.PortfolioOptimizationConstraintProfile
import com.lumi.coredomain.contract.PortfolioOptimizationLearningScope
import com.lumi.coredomain.contract.PortfolioOptimizationObjectivePreset
import com.lumi.coredomain.contract.PortfolioOptimizationObjectiveProfile
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationRiskTolerance
import com.lumi.coredomain.contract.PortfolioOptimizationScenarioSet
import com.lumi.coredomain.contract.PortfolioOptimizationSolverConfig
import com.lumi.coredomain.contract.OperatorWorkflowStage
import com.lumi.coredomain.contract.PolicyRolloutApprovalRequirement
import com.lumi.coredomain.contract.PolicyGovernanceWaveStatus
import com.lumi.coredomain.contract.PolicyRolloutMode
import com.lumi.coredomain.contract.PolicyRolloutScope
import com.lumi.coredomain.contract.GovernanceSummary
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.ui.model.ExecutionReceiptFormatter
import com.lumi.keyboard.ui.model.ExternalVisibilityTone
import com.lumi.keyboard.ui.model.GovernanceCaseFormatter
import com.lumi.keyboard.ui.model.GovernanceSummaryFormatter
import com.lumi.keyboard.ui.model.resolvePrimaryResultText

private data class ActivityEntry(
    val module: AppModule,
    val index: Int,
    val response: AgentResponse
)

private data class ActivityOpsSummary(
    val totalRuns: Int,
    val waitingUser: Int,
    val failedRuns: Int,
    val successLikeRuns: Int,
    val activeModules: Int
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ActivityScreenContent(
    historyByModule: Map<AppModule, List<AgentResponse>>,
    governanceSummary: GovernanceSummary? = null,
    governanceConsole: GovernanceConsoleState? = null,
    developerMode: Boolean = false,
    onOpenWorkItem: (AppModule, Int) -> Unit,
    onExportModule: (AppModule) -> Unit,
    onClearModuleHistory: (AppModule) -> Unit,
    onMarkGovernanceCaseReviewed: (String) -> Unit = {},
    onRetryGovernanceCaseSync: (String) -> Unit = {},
    onUpdateGovernanceCaseCollaboration: (String, GovernanceCollaborationCommand) -> Unit = { _, _ -> },
    onPerformGovernanceBulkAction: (GovernanceBulkActionRequest) -> Unit = {},
    onSavePortfolioScenario: (PortfolioScenarioDefinition) -> Unit = {},
    onRunPortfolioScenario: (String) -> Unit = {},
    onComparePortfolioSimulationRuns: (String, String) -> Unit = { _, _ -> },
    onExportPortfolioSimulationSummary: (String) -> Unit = {},
    onSavePortfolioOptimizationRequest: (PortfolioOptimizationRequest) -> Unit = {},
    onRunPortfolioOptimization: (String) -> Unit = {},
    onSelectPortfolioOptimizationSchedule: (String, String) -> Unit = { _, _ -> },
    onRecordPortfolioOptimizationOutcome: (String) -> Unit = {},
    onApplyPortfolioOptimizationTuning: (String) -> Unit = {},
    onDenyPortfolioOptimizationTuning: (String) -> Unit = {},
    onPropagatePortfolioOptimizationObjectiveProfile: (String, PortfolioOptimizationLearningScope) -> Unit = { _, _ -> },
    onApprovePortfolioOptimizationPropagation: (String) -> Unit = {},
    onRejectPortfolioOptimizationPropagation: (String) -> Unit = {},
    onExportPortfolioOptimizationSummary: (String) -> Unit = {},
    onCopyGovernanceCaseSummary: (String) -> Unit = {},
    onOpenGovernanceCaseTrail: (String) -> Unit = {}
) {
    var query by rememberSaveable { mutableStateOf("") }
    var selectedModule by rememberSaveable { mutableStateOf("all") }
    var selectedStatus by rememberSaveable { mutableStateOf("all") }
    var selectedPreset by rememberSaveable { mutableStateOf(OperatorQueuePreset.ALL.name) }
    var selectedQueue by rememberSaveable { mutableStateOf("all") }
    var selectedCaseId by rememberSaveable { mutableStateOf("") }
    var selectedRunIds by rememberSaveable { mutableStateOf(setOf<String>()) }
    val entries = remember(historyByModule) {
        historyByModule.entries.flatMap { (module, list) ->
            list.mapIndexed { index, response -> ActivityEntry(module = module, index = index, response = response) }
        }
    }
    val filtered = entries.filter { entry ->
        val moduleMatched = selectedModule == "all" || entry.module.label.equals(selectedModule, ignoreCase = true)
        val statusMatched = selectedStatus == "all" || entry.response.status.name.equals(selectedStatus, ignoreCase = true)
        val q = query.trim().lowercase()
        val queryMatched = if (q.isBlank()) {
            true
        } else {
            val summary = resolvePrimaryResultText(entry.response).orEmpty().lowercase()
            val receiptTitle = entry.response.executionReceipt
                ?.events
                ?.lastOrNull()
                ?.title
                .orEmpty()
                .lowercase()
            val receiptSummary = ExecutionReceiptFormatter.summaryLines(entry.response, maxItems = 6)
                .joinToString(" ")
                .lowercase()
            summary.contains(q) ||
                entry.response.traceId.lowercase().contains(q) ||
                entry.module.label.lowercase().contains(q) ||
                receiptTitle.contains(q) ||
                receiptSummary.contains(q)
        }
        moduleMatched && statusMatched && queryMatched
    }
    val ops = ActivityOpsSummary(
        totalRuns = entries.size,
        waitingUser = entries.count {
            it.response.status == ResponseStatus.WAITING_USER ||
                it.response.status == ResponseStatus.AUTH_REQUIRED
        },
        failedRuns = entries.count {
            it.response.status == ResponseStatus.ERROR ||
                it.response.status == ResponseStatus.CANCELLED ||
                it.response.status == ResponseStatus.ROLLED_BACK ||
                it.response.status == ResponseStatus.DISPUTED
        },
        successLikeRuns = entries.count {
            it.response.status == ResponseStatus.SUCCESS ||
                it.response.status == ResponseStatus.PARTIAL ||
                it.response.status == ResponseStatus.COMMITTED
        },
        activeModules = entries.map { it.module }.distinct().size
    )
    val consoleCases = governanceConsole?.cases.orEmpty()
    val savedPresets = governanceConsole?.savedPresets.orEmpty()
    val queueOptions = listOf("all") + consoleCases
        .flatMap { case -> case.summary.queueTags.map { it.name.lowercase() } }
        .distinct()
    val queueFilteredCases = consoleCases.filter { case ->
        val preset = OperatorQueuePreset.entries.firstOrNull {
            it.name.equals(selectedPreset, ignoreCase = true)
        } ?: OperatorQueuePreset.ALL
        val presetMatched = caseMatchesPreset(case, preset)
        val queueMatched = selectedQueue == "all" || case.summary.queueTags.any {
            it.name.equals(selectedQueue, ignoreCase = true)
        }
        val q = query.trim().lowercase()
        val queryMatched = if (q.isBlank()) {
            true
        } else {
            GovernanceCaseFormatter.caseSearchableText(case).contains(q)
        }
        presetMatched && queueMatched && queryMatched
    }
    val selectedCase = queueFilteredCases.firstOrNull { it.summary.caseId == selectedCaseId }
        ?: queueFilteredCases.firstOrNull()

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF143058)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "Activity",
                    color = Color(0xFFE6F5FF),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Trace recent runs and reopen any result in Work.",
                    color = Color(0xFFB8D6EE),
                    fontSize = 11.sp
                )
            }
        }
        ActivityOpsBoardCard(summary = ops)
        if (developerMode && governanceSummary != null) {
            GovernanceSummaryCard(summary = governanceSummary)
        }
        if (governanceConsole != null) {
            GovernanceConsoleCard(
                console = governanceConsole,
                presets = savedPresets,
                selectedPreset = selectedPreset,
                onPresetSelected = { preset -> selectedPreset = preset.name },
                queueOptions = queueOptions,
                selectedQueue = selectedQueue,
                onQueueSelected = { queue -> selectedQueue = queue },
                selectedRunIds = selectedRunIds,
                onToggleRunSelected = { runId ->
                    selectedRunIds = selectedRunIds.toMutableSet().apply {
                        if (contains(runId)) remove(runId) else add(runId)
                    }
                },
                onClearSelection = { selectedRunIds = emptySet() },
                onApplyPresetQueueHint = { queue ->
                    selectedQueue = queue?.name?.lowercase() ?: "all"
                },
                cases = queueFilteredCases,
                selectedCase = selectedCase,
                onSelectCase = { case -> selectedCaseId = case.summary.caseId },
                onMarkReviewed = { runId -> onMarkGovernanceCaseReviewed(runId) },
                onRetrySync = { runId -> onRetryGovernanceCaseSync(runId) },
                onUpdateCollaboration = { runId, command ->
                    onUpdateGovernanceCaseCollaboration(runId, command)
                },
                onSavePortfolioScenario = onSavePortfolioScenario,
                onRunPortfolioScenario = onRunPortfolioScenario,
                onComparePortfolioSimulationRuns = onComparePortfolioSimulationRuns,
                onExportPortfolioSimulationSummary = onExportPortfolioSimulationSummary,
                onSavePortfolioOptimizationRequest = onSavePortfolioOptimizationRequest,
                onRunPortfolioOptimization = onRunPortfolioOptimization,
                onSelectPortfolioOptimizationSchedule = onSelectPortfolioOptimizationSchedule,
                onRecordPortfolioOptimizationOutcome = onRecordPortfolioOptimizationOutcome,
                onApplyPortfolioOptimizationTuning = onApplyPortfolioOptimizationTuning,
                onDenyPortfolioOptimizationTuning = onDenyPortfolioOptimizationTuning,
                onPropagatePortfolioOptimizationObjectiveProfile = onPropagatePortfolioOptimizationObjectiveProfile,
                onApprovePortfolioOptimizationPropagation = onApprovePortfolioOptimizationPropagation,
                onRejectPortfolioOptimizationPropagation = onRejectPortfolioOptimizationPropagation,
                onExportPortfolioOptimizationSummary = onExportPortfolioOptimizationSummary,
                onCopySummary = { runId -> onCopyGovernanceCaseSummary(runId) },
                onOpenTrail = { runId -> onOpenGovernanceCaseTrail(runId) },
                onBulkMarkReviewed = {
                    onPerformGovernanceBulkAction(
                        GovernanceBulkActionRequest(
                            action = GovernanceActionType.MARK_REVIEWED,
                            runIds = selectedRunIds.toList(),
                            requestedAtMs = System.currentTimeMillis()
                        )
                    )
                    selectedRunIds = emptySet()
                },
                onBulkRetrySync = {
                    onPerformGovernanceBulkAction(
                        GovernanceBulkActionRequest(
                            action = GovernanceActionType.RETRY_SYNC_INTENT,
                            runIds = selectedRunIds.toList(),
                            requestedAtMs = System.currentTimeMillis()
                        )
                    )
                    selectedRunIds = emptySet()
                },
                onBulkCopySummary = {
                    selectedRunIds.forEach(onCopyGovernanceCaseSummary)
                    selectedRunIds = emptySet()
                }
            )
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Search trace_id / summary / module", fontSize = 11.sp) }
        )

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val moduleOptions = listOf("all") + AppModule.entries.map { it.label }
            moduleOptions.forEach { option ->
                FilterTextChip(
                    text = if (option == "all") "Module: All" else option,
                    selected = selectedModule == option,
                    onClick = { selectedModule = option }
                )
            }
        }
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val statusOptions = listOf("all") + ResponseStatus.entries.map { it.name }
            statusOptions.forEach { option ->
                FilterTextChip(
                    text = if (option == "all") "Status: All" else option.lowercase(),
                    selected = selectedStatus == option,
                    onClick = { selectedStatus = option }
                )
            }
        }

        if (filtered.isEmpty()) {
            Text(
                text = "No activity matched current filters.",
                color = Color(0xFF8FB0CD),
                fontSize = 11.sp
            )
        } else {
            filtered.take(30).forEach { entry ->
                ActivityRowCard(
                    entry = entry,
                    onOpen = { onOpenWorkItem(entry.module, entry.index) },
                    onExportModule = { onExportModule(entry.module) },
                    onClearModuleHistory = { onClearModuleHistory(entry.module) }
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ActivityOpsBoardCard(summary: ActivityOpsSummary) {
    val successRate = if (summary.totalRuns == 0) 0 else (summary.successLikeRuns * 100 / summary.totalRuns)
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF183B5E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Agent OS Operations Board",
                color = Color(0xFFE4F3FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "Track runtime health before reopening traces or rerunning tasks.",
                color = Color(0xFF9FC6E2),
                fontSize = 10.sp
            )
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf(
                    "Runs ${summary.totalRuns}",
                    "Success ${successRate}%",
                    "Waiting ${summary.waitingUser}",
                    "Failed ${summary.failedRuns}",
                    "Modules ${summary.activeModules}"
                ).forEach { label ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0x223FA9FF)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(
                            text = label,
                            color = Color(0xFFD9EEFF),
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }
            }
        }
    }
}

private fun caseMatchesPreset(
    case: GovernanceCaseRecord,
    preset: OperatorQueuePreset
): Boolean {
    return when (preset) {
        OperatorQueuePreset.ALL -> true
        OperatorQueuePreset.NEEDS_ATTENTION ->
            case.summary.queueTags.contains(GovernanceQueueType.NEEDS_ATTENTION)
        OperatorQueuePreset.SYNC_PENDING ->
            case.summary.queueTags.contains(GovernanceQueueType.SYNC_PENDING)
        OperatorQueuePreset.PROVIDER_ISSUE ->
            case.summary.queueTags.contains(GovernanceQueueType.PROVIDER_ISSUE)
        OperatorQueuePreset.DISPUTE_FOLLOW_UP ->
            case.summary.queueTags.contains(GovernanceQueueType.DISPUTE_FOLLOW_UP)
        OperatorQueuePreset.VERIFICATION_FAILURE ->
            case.summary.queueTags.contains(GovernanceQueueType.VERIFICATION_FAILURE)
        OperatorQueuePreset.ROLLBACK_FAILURE ->
            case.summary.queueTags.contains(GovernanceQueueType.ROLLBACK_FAILURE)
        OperatorQueuePreset.RECONCILIATION_MISMATCH ->
            case.summary.queueTags.contains(GovernanceQueueType.RECONCILIATION_MISMATCH)
        OperatorQueuePreset.CONNECTOR_HEALTH ->
            case.summary.connectorDeadLetterCount > 0 ||
                case.summary.connectorFailedCount > 0 ||
                (case.connectorHealthSummary?.degradedTargets ?: 0) > 0 ||
                (case.connectorHealthSummary?.deadLetterTargets ?: 0) > 0 ||
                (case.connectorHealthSummary?.unavailableTargets ?: 0) > 0
        OperatorQueuePreset.VAULT_HEALTH ->
            case.vaultCredentialSummary.contains("vault", ignoreCase = true) ||
                case.vaultCredentialSummary.contains("expired", ignoreCase = true) ||
                case.vaultCredentialSummary.contains("revoked", ignoreCase = true) ||
                case.vaultCredentialSummary.contains("rotation", ignoreCase = true)
    }
}

@Composable
private fun GovernanceSummaryCard(summary: GovernanceSummary) {
    val headline = GovernanceSummaryFormatter.headline(summary)
    val metricLines = GovernanceSummaryFormatter.metricLines(summary, maxItems = 8)
    val roleLines = GovernanceSummaryFormatter.roleLines(summary, maxItems = 2)
    val providerLines = GovernanceSummaryFormatter.providerLines(summary, maxItems = 2)
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF102B43)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Governance Analytics (Internal)",
                color = Color(0xFFE3F2FD),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = headline,
                color = Color(0xFFB8D6EE),
                fontSize = 10.sp
            )
            metricLines.forEach { line ->
                Text(
                    text = "• $line",
                    color = Color(0xFFD2E8FA),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            roleLines.forEach { line ->
                Text(
                    text = "Role: $line",
                    color = Color(0xFF9FD0F7),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            providerLines.forEach { line ->
                Text(
                    text = "Provider: $line",
                    color = Color(0xFF97C6EB),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GovernanceConsoleCard(
    console: GovernanceConsoleState,
    presets: List<OperatorQueuePresetMatch>,
    selectedPreset: String,
    onPresetSelected: (OperatorQueuePreset) -> Unit,
    queueOptions: List<String>,
    selectedQueue: String,
    onQueueSelected: (String) -> Unit,
    onApplyPresetQueueHint: (GovernanceQueueType?) -> Unit,
    cases: List<GovernanceCaseRecord>,
    selectedCase: GovernanceCaseRecord?,
    selectedRunIds: Set<String>,
    onToggleRunSelected: (String) -> Unit,
    onClearSelection: () -> Unit,
    onSelectCase: (GovernanceCaseRecord) -> Unit,
    onMarkReviewed: (String) -> Unit,
    onRetrySync: (String) -> Unit,
    onUpdateCollaboration: (String, GovernanceCollaborationCommand) -> Unit,
    onSavePortfolioScenario: (PortfolioScenarioDefinition) -> Unit,
    onRunPortfolioScenario: (String) -> Unit,
    onComparePortfolioSimulationRuns: (String, String) -> Unit,
    onExportPortfolioSimulationSummary: (String) -> Unit,
    onSavePortfolioOptimizationRequest: (PortfolioOptimizationRequest) -> Unit,
    onRunPortfolioOptimization: (String) -> Unit,
    onSelectPortfolioOptimizationSchedule: (String, String) -> Unit,
    onRecordPortfolioOptimizationOutcome: (String) -> Unit,
    onApplyPortfolioOptimizationTuning: (String) -> Unit,
    onDenyPortfolioOptimizationTuning: (String) -> Unit,
    onPropagatePortfolioOptimizationObjectiveProfile: (String, PortfolioOptimizationLearningScope) -> Unit,
    onApprovePortfolioOptimizationPropagation: (String) -> Unit,
    onRejectPortfolioOptimizationPropagation: (String) -> Unit,
    onExportPortfolioOptimizationSummary: (String) -> Unit,
    onCopySummary: (String) -> Unit,
    onOpenTrail: (String) -> Unit,
    onBulkMarkReviewed: () -> Unit,
    onBulkRetrySync: () -> Unit,
    onBulkCopySummary: () -> Unit
) {
    val simulationState = console.portfolioSimulationState
    val optimizationState = console.portfolioOptimizationState
    var scenarioName by rememberSaveable { mutableStateOf("Capacity +20 / Wave -10") }
    var windowShiftRaw by rememberSaveable { mutableStateOf("1") }
    var waveAdjustRaw by rememberSaveable { mutableStateOf("-10") }
    var capacityAdjustRaw by rememberSaveable { mutableStateOf("20") }
    var selectedScenarioId by rememberSaveable { mutableStateOf("") }
    var compareBaselineRunId by rememberSaveable { mutableStateOf("") }
    var compareCandidateRunId by rememberSaveable { mutableStateOf("") }
    var optimizationName by rememberSaveable { mutableStateOf("Balanced portfolio optimization") }
    var optimizationRequestId by rememberSaveable { mutableStateOf("") }
    var optimizationTopNRaw by rememberSaveable { mutableStateOf("3") }
    var optimizationSeedRaw by rememberSaveable { mutableStateOf("33") }
    var selectedObjectivePreset by rememberSaveable {
        mutableStateOf(PortfolioOptimizationObjectivePreset.BALANCED.name)
    }
    var selectedConstraintPreset by rememberSaveable {
        mutableStateOf(PortfolioOptimizationConstraintPreset.DEFAULT_GUARDED.name)
    }
    var selectedRiskTolerance by rememberSaveable {
        mutableStateOf(PortfolioOptimizationRiskTolerance.MODERATE.name)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF10243A)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Operator Console",
                color = Color(0xFFE3F2FD),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = GovernanceCaseFormatter.consoleHeadline(console),
                color = Color(0xFFB9D5EA),
                fontSize = 10.sp
            )
            console.homeSummary?.let { home ->
                Text(
                    text = home.summary,
                    color = Color(0xFFA7D4F2),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        "Open ${home.openCases}",
                        "High ${home.highPriorityCases}",
                        "Sync ${home.syncPendingCases}",
                        "Escalated ${home.escalatedCases}",
                        "Connector ${home.connectorIssueCases}",
                        "Vault ${home.vaultIssueCases}"
                    ).forEach { stat ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0x1D2D6B98)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Text(
                                text = stat,
                                color = Color(0xFFD6EBFA),
                                fontSize = 9.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
            if (presets.isNotEmpty()) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    presets.forEach { preset ->
                        val presetSelected = selectedPreset.equals(preset.preset.name, ignoreCase = true)
                        FilterTextChip(
                            text = "${preset.label} (${preset.count})",
                            selected = presetSelected,
                            onClick = {
                                onPresetSelected(preset.preset)
                                onApplyPresetQueueHint(preset.queueHint)
                            }
                        )
                    }
                }
            }
            console.homeSummary?.healthBuckets?.take(6)?.let { buckets ->
                if (buckets.isNotEmpty()) {
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        buckets.forEach { bucket ->
                            val tone = when (bucket.severity) {
                                GovernanceAlertSeverity.CRITICAL -> Color(0xFFFDA4AF)
                                GovernanceAlertSeverity.HIGH -> Color(0xFFFCA5A5)
                                GovernanceAlertSeverity.WARNING -> Color(0xFFFCD34D)
                                GovernanceAlertSeverity.INFO -> Color(0xFF93C5FD)
                            }
                            Text(
                                text = "${bucket.label}: ${bucket.count}",
                                color = tone,
                                fontSize = 9.sp,
                                modifier = Modifier.clickable {
                                    onApplyPresetQueueHint(bucket.queueHint)
                                }
                            )
                        }
                    }
                }
            }
            if (console.alerts.isNotEmpty()) {
                console.alerts.take(4).forEach { alert ->
                    val color = when (alert.severity) {
                        GovernanceAlertSeverity.CRITICAL -> Color(0xFFFDA4AF)
                        GovernanceAlertSeverity.HIGH -> Color(0xFFFCA5A5)
                        GovernanceAlertSeverity.WARNING -> Color(0xFFFCD34D)
                        GovernanceAlertSeverity.INFO -> Color(0xFF93C5FD)
                    }
                    Text(
                        text = "Alert: ${GovernanceCaseFormatter.alertLine(alert)}",
                        color = color,
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            console.remotePipelineSummary?.summary
                ?.takeIf { it.isNotBlank() }
                ?.let { remoteSummary ->
                    Text(
                        text = "Remote pipeline: $remoteSummary",
                        color = Color(0xFF9FD0F7),
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            if (console.remoteDeliveryIssues.isNotEmpty()) {
                console.remoteDeliveryIssues.take(2).forEach { issue ->
                    val color = when (issue.severity) {
                        GovernanceAlertSeverity.CRITICAL -> Color(0xFFFDA4AF)
                        GovernanceAlertSeverity.HIGH -> Color(0xFFFCA5A5)
                        GovernanceAlertSeverity.WARNING -> Color(0xFFFCD34D)
                        GovernanceAlertSeverity.INFO -> Color(0xFF93C5FD)
                    }
                    Text(
                        text = "Remote issue: ${issue.summary}",
                        color = color,
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            simulationState?.let { state ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF143052)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "Portfolio Simulation (Internal)",
                            color = Color(0xFFE0F2FE),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        state.summary?.summary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = summary,
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 10.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                "Scenarios ${state.scenarios.size}",
                                "Runs ${state.runs.size}",
                                "Comparisons ${state.comparisons.size}",
                                "Breach ${if (state.summary?.capacityBreachPredicted == true) "yes" else "no"}"
                            ).forEach { label ->
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0x1F60A5FA)),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Text(
                                        text = label,
                                        color = Color(0xFFDCEEFF),
                                        fontSize = 9.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                        OutlinedTextField(
                            value = scenarioName,
                            onValueChange = { scenarioName = it },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            label = { Text("Scenario name", fontSize = 10.sp) }
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(
                                value = windowShiftRaw,
                                onValueChange = { windowShiftRaw = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Shift (-3..3)", fontSize = 9.sp) }
                            )
                            OutlinedTextField(
                                value = waveAdjustRaw,
                                onValueChange = { waveAdjustRaw = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Wave % (-50..50)", fontSize = 9.sp) }
                            )
                            OutlinedTextField(
                                value = capacityAdjustRaw,
                                onValueChange = { capacityAdjustRaw = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Capacity % (-50..100)", fontSize = 9.sp) }
                            )
                        }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            ActionTextChip(
                                text = "Save scenario",
                                onClick = {
                                    val scenarioId = selectedScenarioId.ifBlank {
                                        "scenario_${System.currentTimeMillis()}"
                                    }
                                    val shift = (windowShiftRaw.toIntOrNull() ?: 0).coerceIn(-3, 3)
                                    val wave = (waveAdjustRaw.toIntOrNull() ?: 0).coerceIn(-50, 50)
                                    val capacity = (capacityAdjustRaw.toIntOrNull() ?: 0).coerceIn(-50, 100)
                                    val modifications = buildList {
                                        if (shift != 0) {
                                            add(
                                                PortfolioScenarioModification(
                                                    type = PortfolioScenarioModificationType.SHIFT_ROLLOUT_WINDOW,
                                                    intValue = shift,
                                                    summary = "Shift rollout window by $shift bucket(s)."
                                                )
                                            )
                                        }
                                        if (wave != 0) {
                                            add(
                                                PortfolioScenarioModification(
                                                    type = PortfolioScenarioModificationType.ADJUST_WAVE_SIZE,
                                                    doubleValue = wave.toDouble(),
                                                    summary = "Adjust wave size by $wave%."
                                                )
                                            )
                                        }
                                        if (capacity != 0) {
                                            add(
                                                PortfolioScenarioModification(
                                                    type = PortfolioScenarioModificationType.ADJUST_APPROVAL_CAPACITY,
                                                    doubleValue = capacity.toDouble(),
                                                    summary = "Adjust approval capacity by $capacity%."
                                                )
                                            )
                                        }
                                    }
                                    onSavePortfolioScenario(
                                        PortfolioScenarioDefinition(
                                            scenarioId = scenarioId,
                                            name = scenarioName.ifBlank { "Portfolio scenario" },
                                            summary = "Bounded portfolio simulation scenario.",
                                            assumptions = PortfolioScenarioAssumptionSet(
                                                horizonDays = 14,
                                                bucketHours = 24,
                                                timezone = "UTC"
                                            ),
                                            modifications = modifications,
                                            simulationOnly = true,
                                            active = true,
                                            updatedAtMs = System.currentTimeMillis()
                                        )
                                    )
                                    selectedScenarioId = scenarioId
                                }
                            )
                            ActionTextChip(
                                text = "Run latest scenario",
                                onClick = {
                                    val scenarioId = selectedScenarioId
                                        .ifBlank { state.scenarios.firstOrNull()?.scenarioId.orEmpty() }
                                    if (scenarioId.isNotBlank()) {
                                        onRunPortfolioScenario(scenarioId)
                                        selectedScenarioId = scenarioId
                                    }
                                }
                            )
                            ActionTextChip(
                                text = "Compare latest runs",
                                onClick = {
                                    val baseline = compareBaselineRunId
                                        .ifBlank { state.runs.getOrNull(1)?.runId.orEmpty() }
                                    val candidate = compareCandidateRunId
                                        .ifBlank { state.runs.firstOrNull()?.runId.orEmpty() }
                                    if (baseline.isNotBlank() && candidate.isNotBlank()) {
                                        onComparePortfolioSimulationRuns(baseline, candidate)
                                        compareBaselineRunId = baseline
                                        compareCandidateRunId = candidate
                                    }
                                }
                            )
                            ActionTextChip(
                                text = "Export latest run",
                                onClick = {
                                    state.runs.firstOrNull()?.runId?.let(onExportPortfolioSimulationSummary)
                                }
                            )
                        }
                        state.runs.firstOrNull()?.let { latest ->
                            Text(
                                text = "Latest run ${latest.runId.takeLast(10)} · ${latest.topRecommendation.ifBlank { "no recommendation" }}",
                                color = Color(0xFF93C5FD),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
            optimizationState?.let { state ->
                val latestResult = state.results.firstOrNull()
                val latestDecision = state.decisions.firstOrNull()
                val latestOutcome = state.outcomes.firstOrNull()
                val latestDrift = state.driftSummaries.firstOrNull()
                val latestPendingSuggestion = state.tuningSuggestions.firstOrNull {
                    it.status == com.lumi.coredomain.contract.PortfolioOptimizationTuningStatus.PENDING
                }
                val latestTuningDecision = state.tuningDecisionRecords.firstOrNull()
                val latestPropagationAttempt = state.propagationAttemptRecords.firstOrNull()
                val actionablePropagationAttempt = state.propagationAttemptRecords.firstOrNull {
                    it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.PENDING_APPROVAL ||
                        it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.REVIEW_REQUIRED
                } ?: latestPropagationAttempt
                val latestPropagationAdoption = state.propagationAdoptionRecords.firstOrNull()
                val topCandidate = latestResult?.candidateSchedules?.firstOrNull()
                val optimizationSummary = state.summary
                val activeObjectiveProfileSnapshotId = optimizationSummary?.activeObjectiveProfileSnapshotId
                    ?.takeIf { it.isNotBlank() }
                val objectiveProfileStateLine = buildList {
                    optimizationSummary?.activeObjectiveProfileScope?.let {
                        add(it.name.lowercase().replace('_', ' '))
                    }
                    optimizationSummary?.activeObjectiveProfileProvenance?.let {
                        add(it.name.lowercase().replace('_', ' '))
                    }
                    activeObjectiveProfileSnapshotId?.let { add("snapshot ${it.takeLast(10)}") }
                }.takeIf { it.isNotEmpty() }?.joinToString(" · ")
                val nextPropagationScope = when (optimizationSummary?.activeObjectiveProfileScope) {
                    PortfolioOptimizationLearningScope.USER -> PortfolioOptimizationLearningScope.WORKSPACE
                    PortfolioOptimizationLearningScope.WORKSPACE -> PortfolioOptimizationLearningScope.TENANT
                    PortfolioOptimizationLearningScope.TENANT -> PortfolioOptimizationLearningScope.GLOBAL_BASELINE
                    PortfolioOptimizationLearningScope.GLOBAL_BASELINE,
                    null -> null
                }

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF173448)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "Portfolio Optimization (Internal)",
                            color = Color(0xFFE0F2FE),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        optimizationSummary?.summary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = summary,
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 10.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                "Requests ${state.requests.size}",
                                "Results ${state.results.size}",
                                "Selections ${state.decisions.size}",
                                "Outcomes ${state.outcomes.size}",
                                "Pending tune ${optimizationSummary?.pendingTuningCount ?: 0}",
                                "Pending prop ${optimizationSummary?.pendingPropagationCount ?: 0}",
                                "Review prop ${optimizationSummary?.reviewRequiredPropagationCount ?: 0}",
                                "Sync ${optimizationSummary?.activeLearningSyncMode?.name?.lowercase()?.replace('_', ' ') ?: "local only"}",
                                "Sync conflicts ${optimizationSummary?.pendingSyncConflictCount ?: 0}",
                                "Frontier ${latestResult?.paretoFrontierSummary?.frontierCandidateIds?.size ?: 0}"
                            ).forEach { label ->
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0x1F60A5FA)),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Text(
                                        text = label,
                                        color = Color(0xFFDCEEFF),
                                        fontSize = 9.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                        OutlinedTextField(
                            value = optimizationName,
                            onValueChange = { optimizationName = it },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            label = { Text("Optimization name", fontSize = 10.sp) }
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(
                                value = optimizationTopNRaw,
                                onValueChange = { optimizationTopNRaw = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Top N (1..6)", fontSize = 9.sp) }
                            )
                            OutlinedTextField(
                                value = optimizationSeedRaw,
                                onValueChange = { optimizationSeedRaw = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Seed", fontSize = 9.sp) }
                            )
                        }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            PortfolioOptimizationObjectivePreset.entries.forEach { preset ->
                                FilterTextChip(
                                    text = preset.name.lowercase().replace('_', ' '),
                                    selected = selectedObjectivePreset == preset.name,
                                    onClick = { selectedObjectivePreset = preset.name }
                                )
                            }
                        }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            PortfolioOptimizationRiskTolerance.entries.forEach { tolerance ->
                                FilterTextChip(
                                    text = "Risk ${tolerance.name.lowercase()}",
                                    selected = selectedRiskTolerance == tolerance.name,
                                    onClick = { selectedRiskTolerance = tolerance.name }
                                )
                            }
                        }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            PortfolioOptimizationConstraintPreset.entries.forEach { preset ->
                                FilterTextChip(
                                    text = preset.name.lowercase().replace('_', ' '),
                                    selected = selectedConstraintPreset == preset.name,
                                    onClick = { selectedConstraintPreset = preset.name }
                                )
                            }
                        }
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            ActionTextChip(
                                text = "Save request",
                                onClick = {
                                    val requestId = optimizationRequestId.ifBlank {
                                        "portfolio_opt_${System.currentTimeMillis()}"
                                    }
                                    val objectivePreset = PortfolioOptimizationObjectivePreset.entries
                                        .firstOrNull { it.name == selectedObjectivePreset }
                                        ?: PortfolioOptimizationObjectivePreset.BALANCED
                                    val constraintPreset = PortfolioOptimizationConstraintPreset.entries
                                        .firstOrNull { it.name == selectedConstraintPreset }
                                        ?: PortfolioOptimizationConstraintPreset.DEFAULT_GUARDED
                                    val riskTolerance = PortfolioOptimizationRiskTolerance.entries
                                        .firstOrNull { it.name == selectedRiskTolerance }
                                        ?: PortfolioOptimizationRiskTolerance.MODERATE
                                    val topN = (optimizationTopNRaw.toIntOrNull() ?: 3).coerceIn(1, 6)
                                    val seed = optimizationSeedRaw.toLongOrNull() ?: 33L
                                    onSavePortfolioOptimizationRequest(
                                        PortfolioOptimizationRequest(
                                            requestId = requestId,
                                            name = optimizationName.ifBlank { "Portfolio optimization" },
                                            summary = "Bounded local-first portfolio optimization request.",
                                            objectiveProfile = PortfolioOptimizationObjectiveProfile(
                                                preset = objectivePreset
                                            ),
                                            constraintProfile = PortfolioOptimizationConstraintProfile(
                                                preset = constraintPreset,
                                                riskTolerance = riskTolerance
                                            ),
                                            scenarioSet = PortfolioOptimizationScenarioSet(
                                                baselineSnapshotId = state.baseline?.snapshotId
                                            ),
                                            solverConfig = PortfolioOptimizationSolverConfig(
                                                seed = seed,
                                                topCandidateCount = topN,
                                                maxCandidateIterations = (topN * 2).coerceIn(4, 16)
                                            ),
                                            active = true,
                                            updatedAtMs = System.currentTimeMillis()
                                        )
                                    )
                                    optimizationRequestId = requestId
                                }
                            )
                            ActionTextChip(
                                text = "Run latest request",
                                onClick = {
                                    val requestId = optimizationRequestId
                                        .ifBlank { state.requests.firstOrNull()?.requestId.orEmpty() }
                                    if (requestId.isNotBlank()) {
                                        onRunPortfolioOptimization(requestId)
                                        optimizationRequestId = requestId
                                    }
                                }
                            )
                            ActionTextChip(
                                text = "Select top schedule",
                                onClick = {
                                    val resultId = latestResult?.resultId.orEmpty()
                                    val candidateId = topCandidate?.candidateId.orEmpty()
                                    if (resultId.isNotBlank() && candidateId.isNotBlank()) {
                                        onSelectPortfolioOptimizationSchedule(resultId, candidateId)
                                    }
                                }
                            )
                            ActionTextChip(
                                text = "Record latest outcome",
                                onClick = {
                                    latestDecision?.decisionId?.takeIf { it.isNotBlank() }
                                        ?.let(onRecordPortfolioOptimizationOutcome)
                                }
                            )
                            ActionTextChip(
                                text = "Apply latest tuning",
                                onClick = {
                                    latestPendingSuggestion?.suggestionId
                                        ?.takeIf { it.isNotBlank() }
                                        ?.let(onApplyPortfolioOptimizationTuning)
                                }
                            )
                            ActionTextChip(
                                text = "Deny latest tuning",
                                onClick = {
                                    latestPendingSuggestion?.suggestionId
                                        ?.takeIf { it.isNotBlank() }
                                        ?.let(onDenyPortfolioOptimizationTuning)
                                }
                            )
                            nextPropagationScope?.let { targetScope ->
                                ActionTextChip(
                                    text = "Promote to ${targetScope.name.lowercase().replace('_', ' ')}",
                                    onClick = {
                                        activeObjectiveProfileSnapshotId?.let { snapshotId ->
                                            onPropagatePortfolioOptimizationObjectiveProfile(snapshotId, targetScope)
                                        }
                                    }
                                )
                            }
                            actionablePropagationAttempt
                                ?.takeIf {
                                    it.attemptId.isNotBlank() &&
                                        (
                                            it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.PENDING_APPROVAL ||
                                                it.status == com.lumi.coredomain.contract.PortfolioOptimizationPropagationEligibilityStatus.REVIEW_REQUIRED
                                            )
                                }
                                ?.let { attempt ->
                                    ActionTextChip(
                                        text = "Approve latest propagation",
                                        onClick = { onApprovePortfolioOptimizationPropagation(attempt.attemptId) }
                                    )
                                    ActionTextChip(
                                        text = "Reject latest propagation",
                                        onClick = { onRejectPortfolioOptimizationPropagation(attempt.attemptId) }
                                    )
                                }
                            ActionTextChip(
                                text = "Export latest result",
                                onClick = {
                                    latestResult?.resultId?.let(onExportPortfolioOptimizationSummary)
                                }
                            )
                        }
                        topCandidate?.let { candidate ->
                            Text(
                                text = "Top schedule ${candidate.candidateId.takeLast(10)} · ${candidate.summary}",
                                color = Color(0xFF93C5FD),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = candidate.score.summary,
                                color = Color(0xFFA5D8FF),
                                fontSize = 9.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            candidate.bindingConstraints.firstOrNull()?.let { binding ->
                                Text(
                                    text = "Binding: ${binding.summary}",
                                    color = Color(0xFFFCD34D),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            candidate.tradeoffExplanations.firstOrNull()?.let { tradeoff ->
                                Text(
                                    text = "Tradeoff: ${tradeoff.summary}",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        objectiveProfileStateLine?.let { stateLine ->
                            Text(
                                text = "Objective profile: $stateLine",
                                color = Color(0xFFC4B5FD),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.activeObjectiveProfileSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Profile summary: $summary",
                                    color = Color(0xFFA7F3D0),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.activeCalibrationSnapshotId
                            ?.takeIf { it.isNotBlank() }
                            ?.let { snapshotId ->
                                Text(
                                    text = "Calibration ${snapshotId.takeLast(10)} · drift ${optimizationSummary.highestDriftSeverity?.name?.lowercase() ?: "none"}",
                                    color = Color(0xFFC4B5FD),
                                    fontSize = 9.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestLearningSyncSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Sync: ${optimizationSummary.activeLearningSyncMode?.name?.lowercase()?.replace('_', ' ') ?: "local only"} · ${optimizationSummary.latestLearningSyncStatus?.name?.lowercase()?.replace('_', ' ') ?: "n/a"} · $summary",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            optimizationSummary?.learningSyncConsentDecision != null ||
                            optimizationSummary?.remoteTransportConsentDecision != null ||
                            optimizationSummary?.auditExportConsentDecision != null ||
                            optimizationSummary?.latestConsentSummary?.isNotBlank() == true
                        ) {
                            val consentState = buildList {
                                optimizationSummary?.learningSyncConsentDecision?.let {
                                    add("sync ${it.name.lowercase().replace('_', ' ')}")
                                }
                                optimizationSummary?.remoteTransportConsentDecision?.let {
                                    add("transport ${it.name.lowercase().replace('_', ' ')}")
                                }
                                optimizationSummary?.auditExportConsentDecision?.let {
                                    add("audit ${it.name.lowercase().replace('_', ' ')}")
                                }
                            }.joinToString(" · ")
                            Text(
                                text = "Consent: ${if (consentState.isBlank()) "n/a" else consentState}${optimizationSummary?.latestConsentSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestRemoteTransportSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                val transportState = buildList {
                                    optimizationSummary.latestRemoteTransportStatus?.let {
                                        add(it.name.lowercase().replace('_', ' '))
                                    }
                                    optimizationSummary.latestRemoteTransportConnectorType?.let {
                                        add("connector ${it.name.lowercase().replace('_', ' ')}")
                                    }
                                    optimizationSummary.latestRemoteTransportKeyStatus?.let {
                                        add("key ${it.name.lowercase().replace('_', ' ')}")
                                    }
                                    optimizationSummary.latestRemoteTransportComplianceDecision?.let {
                                        add("compliance ${it.name.lowercase().replace('_', ' ')}")
                                    }
                                    if (optimizationSummary.remoteTransportDeadLetterCount > 0) {
                                        add("dead-letter ${optimizationSummary.remoteTransportDeadLetterCount}")
                                    }
                                }.joinToString(" · ").ifBlank { "n/a" }
                                Text(
                                    text = "Remote transport: $transportState · $summary",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestRemoteTransportConnectorSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Connector: $summary",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestRemoteTransportKeySummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Enterprise key: $summary",
                                    color = Color(0xFFA7F3D0),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestRemoteTransportComplianceSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Compliance gate: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            optimizationSummary?.latestRemoteDestinationStatus != null ||
                            optimizationSummary?.latestRemoteDestinationType != null ||
                            optimizationSummary?.latestRemoteDestinationSummary?.isNotBlank() == true
                        ) {
                            val destinationState = buildList {
                                optimizationSummary?.latestRemoteDestinationStatus?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                                optimizationSummary?.latestRemoteDestinationType?.let {
                                    add("destination ${it.name.lowercase().replace('_', ' ')}")
                                }
                            }.joinToString(" · ").ifBlank { "n/a" }
                            Text(
                                text = "Destination: $destinationState${optimizationSummary?.latestRemoteDestinationSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFBFDBFE),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.latestResidencyRegion != null ||
                            optimizationSummary?.latestJurisdiction != null ||
                            optimizationSummary?.latestResidencySummary?.isNotBlank() == true
                        ) {
                            val residencyState = buildList {
                                optimizationSummary?.latestResidencyRegion?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                                optimizationSummary?.latestJurisdiction?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                            }.joinToString(" · ").ifBlank { "n/a" }
                            Text(
                                text = "Residency: $residencyState${optimizationSummary?.latestResidencySummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFDE68A),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestComplianceAuditExportSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Audit export: ${optimizationSummary.latestComplianceAuditExportStatus?.name?.lowercase()?.replace('_', ' ') ?: "n/a"} · $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestComplianceExportRouteSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Export route: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestLearningSyncConflictSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Sync conflict: ${optimizationSummary.latestLearningSyncConflictResolution?.name?.lowercase()?.replace('_', ' ') ?: "n/a"} · $summary",
                                    color = Color(0xFFFCA5A5),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.activeSyncPrivacyPolicySummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Sync privacy: $summary",
                                    color = Color(0xFFA7F3D0),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.activeEnterprisePrivacyPolicySummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Enterprise privacy: $summary",
                                    color = Color(0xFFA7F3D0),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.activeFederationBoundarySummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Federation boundary: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestFederatedAggregationSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Federated aggregation: $summary",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            optimizationSummary?.activeCrossBoundaryGovernancePortfolioStatus != null ||
                            optimizationSummary?.activeDestinationTrustTier != null ||
                            optimizationSummary?.latestGovernancePortfolioSummary?.isNotBlank() == true
                        ) {
                            val governanceState = buildList {
                                optimizationSummary?.activeCrossBoundaryGovernancePortfolioStatus?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                                optimizationSummary?.activeDestinationTrustTier?.let {
                                    add("trust ${it.name.lowercase().replace('_', ' ')}")
                                }
                                optimizationSummary?.latestPortfolioPriority?.let {
                                    add("priority ${it.name.lowercase().replace('_', ' ')}")
                                }
                            }.joinToString(" · ").ifBlank { "n/a" }
                            Text(
                                text = "Governance portfolio: $governanceState${optimizationSummary?.latestGovernancePortfolioSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFDE68A),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.latestCrossBoundaryProgramStatus != null ||
                            optimizationSummary?.latestTrustTierRolloutState != null ||
                            optimizationSummary?.latestTrustTierProgramSummary?.isNotBlank() == true
                        ) {
                            val trustTierState = buildList {
                                optimizationSummary?.latestCrossBoundaryProgramStatus?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                                optimizationSummary?.latestTrustTierRolloutState?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                            }.joinToString(" · ").ifBlank { "n/a" }
                            Text(
                                text = "Trust tier: $trustTierState${optimizationSummary?.latestTrustTierProgramSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.latestJurisdictionRolloutState != null ||
                            optimizationSummary?.latestJurisdictionRolloutSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Jurisdiction rollout: ${optimizationSummary?.latestJurisdictionRolloutState?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}${optimizationSummary?.latestJurisdictionRolloutSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFDE68A),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.activePortfolioHealthStatus != null ||
                            optimizationSummary?.activePortfolioTrajectoryState != null ||
                            optimizationSummary?.latestPortfolioAnalyticsSummary?.isNotBlank() == true
                        ) {
                            val analyticsState = buildList {
                                optimizationSummary?.activePortfolioHealthStatus?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                                optimizationSummary?.activePortfolioTrajectoryState?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                            }.joinToString(" · ").ifBlank { "n/a" }
                            Text(
                                text = "Portfolio analytics: $analyticsState${optimizationSummary?.latestPortfolioAnalyticsSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFBFDBFE),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.latestTrustTierDriftState != null ||
                            optimizationSummary?.latestTrustTierDriftSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Trust-tier drift: ${optimizationSummary?.latestTrustTierDriftState?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}${optimizationSummary?.latestTrustTierDriftSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFCD34D),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.latestJurisdictionDriftState != null ||
                            optimizationSummary?.latestJurisdictionDriftSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Jurisdiction drift: ${optimizationSummary?.latestJurisdictionDriftState?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}${optimizationSummary?.latestJurisdictionDriftSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFCD34D),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.activeRiskBudgetStatus != null ||
                            (optimizationSummary?.riskBudgetBreachCount ?: 0) > 0 ||
                            optimizationSummary?.latestRiskBudgetSummary?.isNotBlank() == true
                        ) {
                            val breachSuffix = if ((optimizationSummary?.riskBudgetBreachCount ?: 0) > 0) {
                                " · breaches ${optimizationSummary?.riskBudgetBreachCount ?: 0}"
                            } else {
                                ""
                            }
                            Text(
                                text = "Risk budget: ${optimizationSummary?.activeRiskBudgetStatus?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}$breachSuffix${optimizationSummary?.latestRiskBudgetSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFCA5A5),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.activePortfolioSafetyState != null ||
                            optimizationSummary?.activePortfolioEnforcementMode != null ||
                            optimizationSummary?.activeRemediationAutomationState != null ||
                            optimizationSummary?.latestPortfolioSafetySummary?.isNotBlank() == true
                        ) {
                            val safetyState = buildList {
                                optimizationSummary?.activePortfolioSafetyState?.let {
                                    add(it.name.lowercase().replace('_', ' '))
                                }
                                optimizationSummary?.activePortfolioEnforcementMode?.let {
                                    add("enforcement ${it.name.lowercase().replace('_', ' ')}")
                                }
                                optimizationSummary?.activeRemediationAutomationState?.let {
                                    add("remediation ${it.name.lowercase().replace('_', ' ')}")
                                }
                            }.joinToString(" · ").ifBlank { "n/a" }
                            Text(
                                text = "Portfolio safety: $safetyState${optimizationSummary?.latestPortfolioSafetySummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFCA5A5),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.activeBudgetGuardrailState != null ||
                            (optimizationSummary?.remediationApprovalRequiredCount ?: 0) > 0 ||
                            optimizationSummary?.latestBudgetGuardrailSummary?.isNotBlank() == true
                        ) {
                            val approvalSuffix =
                                if ((optimizationSummary?.remediationApprovalRequiredCount ?: 0) > 0) {
                                    " · approval ${optimizationSummary?.remediationApprovalRequiredCount ?: 0}"
                                } else {
                                    ""
                                }
                            Text(
                                text = "Budget guardrail: ${optimizationSummary?.activeBudgetGuardrailState?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}$approvalSuffix${optimizationSummary?.latestBudgetGuardrailSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFDE68A),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestPortfolioSafetyRailSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Safety rail: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            optimizationSummary?.activeRemediationAutomationState != null ||
                            (optimizationSummary?.quarantinedPortfolioCount ?: 0) > 0 ||
                            optimizationSummary?.latestRemediationAutomationSummary?.isNotBlank() == true
                        ) {
                            val quarantineSuffix =
                                if ((optimizationSummary?.quarantinedPortfolioCount ?: 0) > 0) {
                                    " · quarantined ${optimizationSummary?.quarantinedPortfolioCount ?: 0}"
                                } else {
                                    ""
                                }
                            Text(
                                text = "Remediation control: ${optimizationSummary?.activeRemediationAutomationState?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}$quarantineSuffix${optimizationSummary?.latestRemediationAutomationSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFBFDBFE),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestDestinationRiskConcentrationSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Destination concentration: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        optimizationSummary?.latestPortfolioBlockerTrendSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Blocker trend: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            optimizationSummary?.latestPortfolioRiskRecommendationAction != null ||
                            optimizationSummary?.latestPortfolioRiskRecommendationSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Risk recommendation: ${optimizationSummary?.latestPortfolioRiskRecommendationAction?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}${optimizationSummary?.latestPortfolioRiskRecommendationSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestPortfolioCorrectiveActionSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Corrective action: $summary",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            (optimizationSummary?.sharedPortfolioBlockerCount ?: 0) > 0 ||
                            optimizationSummary?.latestPortfolioBlockerSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Blockers: ${optimizationSummary?.sharedPortfolioBlockerCount ?: 0}${optimizationSummary?.latestPortfolioBlockerSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFCA5A5),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestPortfolioDependencySummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Dependencies: $summary",
                                    color = Color(0xFFBFDBFE),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        if (
                            (optimizationSummary?.portfolioConflictCount ?: 0) > 0 ||
                            optimizationSummary?.latestPortfolioConflictSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Conflicts: ${optimizationSummary?.portfolioConflictCount ?: 0}${optimizationSummary?.latestPortfolioConflictSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFFCA5A5),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (
                            optimizationSummary?.latestPortfolioRecommendationAction != null ||
                            optimizationSummary?.latestPortfolioRecommendationSummary?.isNotBlank() == true
                        ) {
                            Text(
                                text = "Next action: ${optimizationSummary?.latestPortfolioRecommendationAction?.name?.lowercase()?.replace('_', ' ') ?: "n/a"}${optimizationSummary?.latestPortfolioRecommendationSummary?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        latestOutcome?.let { outcome ->
                            Text(
                                text = "Outcome: ${outcome.summary}",
                                color = Color(0xFFBFDBFE),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        latestDrift?.let { drift ->
                            Text(
                                text = "Drift: ${drift.highestSeverity.name.lowercase()} · ${drift.summary}",
                                color = Color(0xFFFCD34D),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        latestPendingSuggestion?.let { suggestion ->
                            Text(
                                text = "Pending tuning: ${suggestion.summary}",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        latestTuningDecision?.let { decision ->
                            Text(
                                text = "Latest tuning: ${decision.status.name.lowercase()} · ${decision.summary}",
                                color = Color(0xFFBFDBFE),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        optimizationSummary?.latestPropagationSummary
                            ?.takeIf { it.isNotBlank() }
                            ?.let { summary ->
                                Text(
                                    text = "Propagation: $summary",
                                    color = Color(0xFFFDE68A),
                                    fontSize = 9.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        latestPropagationAttempt?.let { attempt ->
                            Text(
                                text = "Latest propagation: ${attempt.status.name.lowercase().replace('_', ' ')} · ${attempt.summary}",
                                color = Color(0xFFFDE68A),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        latestPropagationAdoption?.let { adoption ->
                            Text(
                                text = "Latest adoption: ${adoption.status.name.lowercase().replace('_', ' ')} · ${adoption.summary}",
                                color = Color(0xFFA7F3D0),
                                fontSize = 9.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                queueOptions.forEach { option ->
                    val label = if (option == "all") {
                        "Queue: All"
                    } else {
                        val queue = GovernanceQueueType.entries.firstOrNull {
                            it.name.equals(option, ignoreCase = true)
                        }
                        "Queue: ${queue?.let { GovernanceCaseFormatter.queueLabel(it) } ?: option}"
                    }
                    FilterTextChip(
                        text = label,
                        selected = selectedQueue == option,
                        onClick = { onQueueSelected(option) }
                    )
                }
            }
            if (selectedRunIds.isNotEmpty()) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    ActionTextChip(
                        text = "Bulk mark reviewed (${selectedRunIds.size})",
                        onClick = onBulkMarkReviewed
                    )
                    ActionTextChip(
                        text = "Bulk retry sync",
                        onClick = onBulkRetrySync
                    )
                    ActionTextChip(
                        text = "Bulk copy summary",
                        onClick = onBulkCopySummary
                    )
                    ActionTextChip(
                        text = "Clear selection",
                        onClick = onClearSelection
                    )
                }
            }

            if (cases.isEmpty()) {
                Text(
                    text = "No governance cases matched current filters.",
                    color = Color(0xFF93B5D1),
                    fontSize = 10.sp
                )
            } else {
                cases.take(12).forEach { case ->
                    GovernanceCaseRow(
                        case = case,
                        selected = selectedCase?.summary?.caseId == case.summary.caseId,
                        runSelected = selectedRunIds.contains(case.summary.runId),
                        onToggleRunSelected = { onToggleRunSelected(case.summary.runId) },
                        onClick = { onSelectCase(case) }
                    )
                }
            }

            selectedCase?.let { case ->
                GovernanceCaseDetailCard(
                    case = case,
                    onMarkReviewed = { onMarkReviewed(case.summary.runId) },
                    onRetrySync = { onRetrySync(case.summary.runId) },
                    onUpdateCollaboration = { command ->
                        onUpdateCollaboration(case.summary.runId, command)
                    },
                    onCopySummary = { onCopySummary(case.summary.runId) },
                    onOpenTrail = { onOpenTrail(case.summary.runId) }
                )
            }
        }
    }
}

@Composable
private fun GovernanceCaseRow(
    case: GovernanceCaseRecord,
    selected: Boolean,
    runSelected: Boolean,
    onToggleRunSelected: () -> Unit,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) Color(0x1D7EC8FF) else Color(0xFF16324A)
        ),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                GovernancePriorityPill(priority = case.summary.priority)
                Text(
                    text = GovernanceCaseFormatter.queueLabel(case.summary.primaryQueue),
                    color = Color(0xFF9DC8E8),
                    fontSize = 9.sp
                )
                Text(
                    text = if (runSelected) "Selected" else "Select",
                    color = if (runSelected) Color(0xFF9CE2B0) else Color(0xFFA7CAE5),
                    fontSize = 9.sp,
                    modifier = Modifier.clickable(onClick = onToggleRunSelected)
                )
            }
            Text(
                text = case.summary.title,
                color = Color(0xFFE6F2FF),
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = GovernanceCaseFormatter.caseLine(case.summary),
                color = Color(0xFF9ABDD8),
                fontSize = 10.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GovernanceCaseDetailCard(
    case: GovernanceCaseRecord,
    onMarkReviewed: () -> Unit,
    onRetrySync: () -> Unit,
    onUpdateCollaboration: (GovernanceCollaborationCommand) -> Unit,
    onCopySummary: () -> Unit,
    onOpenTrail: () -> Unit
) {
    var operatorDisplayName by rememberSaveable(case.summary.caseId) { mutableStateOf("Local Operator") }
    var assigneeDisplayName by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var noteInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var followUpInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var escalationTargetInput by rememberSaveable(case.summary.caseId) { mutableStateOf("remote_operator_stub") }
    var destinationIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var authProfileIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var routeBindingIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var workflowTemplateIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var workflowStageInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var automationRuleIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var rolloutModeInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var rolloutScopeInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var rolloutReasonInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var rolloutApprovalRequirementInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyProgramIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyProgramNameInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyProgramWaveIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyProgramWaveStatusInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyExemptionReasonInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyPinPackVersionIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyReplacementPackIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyReplacementPackVersionIdInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }
    var policyLifecycleReasonInput by rememberSaveable(case.summary.caseId) { mutableStateOf("") }

    fun toActorUserId(displayName: String): String {
        val compact = displayName.trim()
        if (compact.isBlank()) return "local-user"
        val slug = compact.lowercase()
            .replace(Regex("[^a-z0-9]+"), "_")
            .trim('_')
        return if (slug.isBlank()) "local-user" else slug
    }

    fun buildCommand(
        type: GovernanceActionType,
        note: String? = null,
        followUpSummary: String? = null,
        assignee: String? = null,
        escalationTarget: String? = null,
        workflowTemplateId: String? = null,
        workflowStage: String? = null,
        automationRuleId: String? = null,
        rolloutMode: String? = null,
        rolloutScope: String? = null,
        rolloutReason: String? = null,
        rolloutApprovalRequirement: String? = null
    ): GovernanceCollaborationCommand {
        val actorName = operatorDisplayName.trim().ifBlank { "Local Operator" }
        val assigneeName = assignee?.trim().orEmpty()
        val parsedWorkflowStage = workflowStage
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.uppercase()
            ?.let { raw ->
                runCatching { OperatorWorkflowStage.valueOf(raw) }.getOrNull()
            }
        val parsedRolloutMode = rolloutMode
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.uppercase()
            ?.let { raw ->
                runCatching { PolicyRolloutMode.valueOf(raw) }.getOrNull()
            }
        val parsedRolloutScope = rolloutScope
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.uppercase()
            ?.let { raw ->
                runCatching { PolicyRolloutScope.valueOf(raw) }.getOrNull()
            }
        val parsedRolloutApprovalRequirement = rolloutApprovalRequirement
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.uppercase()
            ?.let { raw ->
                runCatching { PolicyRolloutApprovalRequirement.valueOf(raw) }.getOrNull()
            }
        val parsedPolicyProgramWaveStatus = policyProgramWaveStatusInput
            .trim()
            .takeIf { it.isNotBlank() }
            ?.uppercase()
            ?.let { raw ->
                runCatching { PolicyGovernanceWaveStatus.valueOf(raw) }.getOrNull()
            }
        val collaborationSource = if (type == GovernanceActionType.RUN_SAFE_AUTOMATION) {
            GovernanceCollaborationActionSource.LOCAL_AUTOMATION
        } else {
            GovernanceCollaborationActionSource.HUMAN_OPERATOR
        }
        return GovernanceCollaborationCommand(
            commandType = type,
            actorUserId = toActorUserId(actorName),
            actorDisplayName = actorName,
            collaborationSource = collaborationSource,
            assignee = assigneeName.takeIf { it.isNotBlank() }?.let {
                OperatorAssigneeRef(
                    userId = toActorUserId(it),
                    displayName = it
                )
            },
            note = note?.trim()?.takeIf { it.isNotBlank() },
            followUpSummary = followUpSummary?.trim()?.takeIf { it.isNotBlank() },
            escalationTarget = escalationTarget?.trim()?.takeIf { it.isNotBlank() },
            connectorTargets = listOf(
                AlertRoutingTargetType.SLACK_STUB,
                AlertRoutingTargetType.JIRA_STUB,
                AlertRoutingTargetType.ZENDESK_STUB,
                AlertRoutingTargetType.CRM_STUB,
                AlertRoutingTargetType.GENERIC_WEBHOOK
            ),
            destinationId = destinationIdInput.trim().takeIf { it.isNotBlank() },
            authProfileId = authProfileIdInput.trim().takeIf { it.isNotBlank() },
            routeBindingId = routeBindingIdInput.trim().takeIf { it.isNotBlank() },
            workflowTemplateId = workflowTemplateId?.trim()?.takeIf { it.isNotBlank() },
            workflowStage = parsedWorkflowStage,
            automationRuleId = automationRuleId?.trim()?.takeIf { it.isNotBlank() },
            policyRolloutMode = parsedRolloutMode,
            policyRolloutScope = parsedRolloutScope,
            policyRolloutReason = rolloutReason?.trim()?.takeIf { it.isNotBlank() },
            policyRolloutApprovalRequirement = parsedRolloutApprovalRequirement,
            policyProgramId = policyProgramIdInput.trim().takeIf { it.isNotBlank() },
            policyProgramName = policyProgramNameInput.trim().takeIf { it.isNotBlank() },
            policyProgramWaveId = policyProgramWaveIdInput.trim().takeIf { it.isNotBlank() },
            policyProgramWaveStatus = parsedPolicyProgramWaveStatus,
            policyExemptionReason = policyExemptionReasonInput.trim().takeIf { it.isNotBlank() },
            policyPinPackVersionId = policyPinPackVersionIdInput.trim().takeIf { it.isNotBlank() },
            policyReplacementPackId = policyReplacementPackIdInput.trim().takeIf { it.isNotBlank() },
            policyReplacementPackVersionId = policyReplacementPackVersionIdInput.trim().takeIf { it.isNotBlank() },
            policyLifecycleReason = policyLifecycleReasonInput.trim().takeIf { it.isNotBlank() },
            target = "remote_operator_stub",
            timestampMs = System.currentTimeMillis()
        )
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF112C46)),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "Case Detail",
                color = Color(0xFFE7F3FF),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            OutlinedTextField(
                value = operatorDisplayName,
                onValueChange = { operatorDisplayName = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Operator display name", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = assigneeDisplayName,
                onValueChange = { assigneeDisplayName = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Assignee (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = noteInput,
                onValueChange = { noteInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Case note", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = followUpInput,
                onValueChange = { followUpInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Follow-up summary", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = escalationTargetInput,
                onValueChange = { escalationTargetInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Escalation target", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = destinationIdInput,
                onValueChange = { destinationIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Connector destination ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = authProfileIdInput,
                onValueChange = { authProfileIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Auth profile ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = routeBindingIdInput,
                onValueChange = { routeBindingIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Route binding ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = workflowTemplateIdInput,
                onValueChange = { workflowTemplateIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Workflow template ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = workflowStageInput,
                onValueChange = { workflowStageInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Workflow stage (e.g. WAITING_SYNC)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = automationRuleIdInput,
                onValueChange = { automationRuleIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Automation rule ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = rolloutModeInput,
                onValueChange = { rolloutModeInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Rollout mode (SIMULATION_ONLY/STAGED/ENFORCED)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = rolloutScopeInput,
                onValueChange = { rolloutScopeInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Rollout scope (WORKFLOW_TEMPLATE/WORKSPACE/TENANT/GLOBAL)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = rolloutApprovalRequirementInput,
                onValueChange = { rolloutApprovalRequirementInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Rollout approval requirement (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = rolloutReasonInput,
                onValueChange = { rolloutReasonInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Rollout reason (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyProgramIdInput,
                onValueChange = { policyProgramIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy program ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyProgramNameInput,
                onValueChange = { policyProgramNameInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy program name (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyProgramWaveIdInput,
                onValueChange = { policyProgramWaveIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy program wave ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyProgramWaveStatusInput,
                onValueChange = { policyProgramWaveStatusInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy wave status (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyExemptionReasonInput,
                onValueChange = { policyExemptionReasonInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy exemption reason (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyPinPackVersionIdInput,
                onValueChange = { policyPinPackVersionIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy pin pack version ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyReplacementPackIdInput,
                onValueChange = { policyReplacementPackIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Replacement pack ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyReplacementPackVersionIdInput,
                onValueChange = { policyReplacementPackVersionIdInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Replacement pack version ID (optional)", fontSize = 10.sp) }
            )
            OutlinedTextField(
                value = policyLifecycleReasonInput,
                onValueChange = { policyLifecycleReasonInput = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Policy lifecycle reason (optional)", fontSize = 10.sp) }
            )
            GovernanceCaseFormatter.detailLines(case, maxItems = 18).forEach { line ->
                Text(
                    text = line,
                    color = Color(0xFFA7CAE5),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (case.timeline.isNotEmpty()) {
                Text(
                    text = "Timeline",
                    color = Color(0xFFD6EBFA),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )
                case.timeline.take(8).forEach { item ->
                    val tone = when (item.severity) {
                        GovernanceAlertSeverity.CRITICAL -> Color(0xFFFDA4AF)
                        GovernanceAlertSeverity.HIGH -> Color(0xFFFCA5A5)
                        GovernanceAlertSeverity.WARNING -> Color(0xFFFCD34D)
                        GovernanceAlertSeverity.INFO -> Color(0xFF93C5FD)
                    }
                    val detail = item.detail.takeIf { it.isNotBlank() } ?: item.title
                    Text(
                        text = "• ${item.title}: $detail",
                        color = tone,
                        fontSize = 9.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ActionTextChip(
                    text = "Claim",
                    onClick = {
                        onUpdateCollaboration(buildCommand(GovernanceActionType.CLAIM_CASE))
                    }
                )
                ActionTextChip(
                    text = "Unclaim",
                    onClick = {
                        onUpdateCollaboration(buildCommand(GovernanceActionType.UNCLAIM_CASE))
                    }
                )
                ActionTextChip(
                    text = "Release",
                    onClick = {
                        onUpdateCollaboration(buildCommand(GovernanceActionType.RELEASE_CASE))
                    }
                )
                ActionTextChip(
                    text = "Assign",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ASSIGN_CASE,
                                assignee = assigneeDisplayName
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Reassign",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.REASSIGN_CASE,
                                assignee = assigneeDisplayName
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Add note",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ADD_NOTE,
                                note = noteInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Request follow-up",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.REQUEST_FOLLOW_UP,
                                followUpSummary = followUpInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Escalate",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ESCALATE_CASE,
                                followUpSummary = followUpInput,
                                escalationTarget = escalationTargetInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Ack handoff",
                    onClick = {
                        onUpdateCollaboration(buildCommand(GovernanceActionType.ACK_REMOTE_HANDOFF))
                    }
                )
                ActionTextChip(
                    text = "Attach workflow",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE,
                                workflowTemplateId = workflowTemplateIdInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Advance stage",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ADVANCE_WORKFLOW_STAGE,
                                workflowTemplateId = workflowTemplateIdInput,
                                workflowStage = workflowStageInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Run automation",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.RUN_SAFE_AUTOMATION,
                                workflowTemplateId = workflowTemplateIdInput,
                                workflowStage = workflowStageInput,
                                automationRuleId = automationRuleIdInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Request rollout approval",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.REQUEST_POLICY_ROLLOUT_APPROVAL,
                                rolloutReason = rolloutReasonInput,
                                rolloutApprovalRequirement = rolloutApprovalRequirementInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Approve rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.APPROVE_POLICY_ROLLOUT,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Deny rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.DENY_POLICY_ROLLOUT_APPROVAL,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Promote rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.PROMOTE_POLICY_ROLLOUT,
                                rolloutMode = rolloutModeInput,
                                rolloutScope = rolloutScopeInput,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Enforce rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ENFORCE_POLICY_ROLLOUT,
                                rolloutMode = if (rolloutModeInput.isBlank()) "ENFORCED" else rolloutModeInput,
                                rolloutScope = rolloutScopeInput,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Expand rollout scope",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.EXPAND_POLICY_ROLLOUT_SCOPE,
                                rolloutMode = rolloutModeInput,
                                rolloutScope = rolloutScopeInput,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Pause rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.PAUSE_POLICY_ROLLOUT,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Resume rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.RESUME_POLICY_ROLLOUT,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Freeze rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.FREEZE_POLICY_ROLLOUT,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Rollback rollout",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(
                                type = GovernanceActionType.ROLLBACK_POLICY_ROLLOUT,
                                rolloutReason = rolloutReasonInput
                            )
                        )
                    }
                )
                ActionTextChip(
                    text = "Create policy program",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.CREATE_POLICY_GOVERNANCE_PROGRAM)
                        )
                    }
                )
                ActionTextChip(
                    text = "Advance governance wave",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.ADVANCE_POLICY_GOVERNANCE_WAVE)
                        )
                    }
                )
                ActionTextChip(
                    text = "Pause governance wave",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.PAUSE_POLICY_GOVERNANCE_WAVE)
                        )
                    }
                )
                ActionTextChip(
                    text = "Add rollout exemption",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.ADD_POLICY_ROLLOUT_EXEMPTION)
                        )
                    }
                )
                ActionTextChip(
                    text = "Remove rollout exemption",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.REMOVE_POLICY_ROLLOUT_EXEMPTION)
                        )
                    }
                )
                ActionTextChip(
                    text = "Pin rollout target",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.PIN_POLICY_ROLLOUT_TARGET)
                        )
                    }
                )
                ActionTextChip(
                    text = "Unpin rollout target",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.UNPIN_POLICY_ROLLOUT_TARGET)
                        )
                    }
                )
                ActionTextChip(
                    text = "Deprecate policy pack",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.DEPRECATE_POLICY_PACK)
                        )
                    }
                )
                ActionTextChip(
                    text = "Retire policy pack",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.RETIRE_POLICY_PACK)
                        )
                    }
                )
                ActionTextChip(
                    text = "Attach replacement",
                    onClick = {
                        onUpdateCollaboration(
                            buildCommand(type = GovernanceActionType.ATTACH_POLICY_PACK_REPLACEMENT)
                        )
                    }
                )
                ActionTextChip(text = "Mark reviewed", onClick = onMarkReviewed)
                ActionTextChip(text = "Copy summary", onClick = onCopySummary)
                ActionTextChip(text = "Retry sync", onClick = onRetrySync)
                ActionTextChip(text = "Open trail", onClick = onOpenTrail)
            }
        }
    }
}

@Composable
private fun GovernancePriorityPill(priority: GovernanceCasePriority) {
    val (container, textColor) = when (priority) {
        GovernanceCasePriority.CRITICAL -> Color(0x22FB7185) to Color(0xFFFDA4AF)
        GovernanceCasePriority.HIGH -> Color(0x22F97316) to Color(0xFFFDBA74)
        GovernanceCasePriority.MEDIUM -> Color(0x22FACC15) to Color(0xFFFDE68A)
        GovernanceCasePriority.LOW -> Color(0x2238BDF8) to Color(0xFF93C5FD)
    }
    Text(
        text = GovernanceCaseFormatter.priorityLabel(priority),
        color = textColor,
        fontSize = 9.sp,
        modifier = Modifier
            .background(container, RoundedCornerShape(50))
            .padding(horizontal = 7.dp, vertical = 3.dp)
    )
}

@Composable
private fun ActionTextChip(
    text: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1B3D5C)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Text(
            text = text,
            color = Color(0xFFCFE7FB),
            fontSize = 9.sp,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp)
        )
    }
}

@Composable
private fun FilterTextChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) Color(0xFF1D4B7B) else Color(0xFF173552)
        ),
        shape = RoundedCornerShape(18.dp)
    ) {
        Text(
            text = text,
            color = if (selected) Color(0xFFDDF2FF) else Color(0xFF9FC3E1),
            fontSize = 10.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ActivityRowCard(
    entry: ActivityEntry,
    onOpen: () -> Unit,
    onExportModule: () -> Unit,
    onClearModuleHistory: () -> Unit
) {
    val fallbackSummary = resolvePrimaryResultText(entry.response).orEmpty().ifBlank { "No summary" }
    val title = ExecutionReceiptFormatter.activityTitle(entry.response, fallbackSummary)
    val receiptHeadline = ExecutionReceiptFormatter.headline(entry.response)
    val externalHeadline = ExecutionReceiptFormatter.externalSummaryHeadline(entry.response, maxItems = 5)
    val externalPills = ExecutionReceiptFormatter.externalStatusPills(entry.response, maxItems = 4)
    val receiptLines = ExecutionReceiptFormatter.summaryLines(
        response = entry.response,
        maxItems = if (externalHeadline != null) 3 else 2
    ).filterNot { line ->
        externalHeadline != null && line.equals(externalHeadline, ignoreCase = true)
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF17385B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = title,
                color = Color(0xFFEAF4FF),
                fontSize = 12.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${entry.module.label} · ${entry.response.status.name} · trace ${entry.response.traceId.take(16)}",
                color = Color(0xFFAACCE7),
                fontSize = 10.sp
            )
            receiptHeadline?.let { headline ->
                Text(
                    text = headline,
                    color = Color(0xFFC2DFF6),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            externalHeadline?.let { summary ->
                Text(
                    text = "External Fulfillment: $summary",
                    color = Color(0xFFE7D48B),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (externalPills.isNotEmpty()) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    externalPills.forEach { pill ->
                        ActivityExternalPill(
                            label = pill.label,
                            tone = pill.tone
                        )
                    }
                }
            }
            receiptLines.forEach { line ->
                Text(
                    text = line,
                    color = Color(0xFF99C0DE),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Open in Work",
                    color = Color(0xFFC9E7FF),
                    fontSize = 10.sp,
                    modifier = Modifier.clickable(onClick = onOpen)
                )
                Text(
                    text = "Export Module",
                    color = Color(0xFF99C4E8),
                    fontSize = 10.sp,
                    modifier = Modifier.clickable(onClick = onExportModule)
                )
                Text(
                    text = "Clear Module",
                    color = Color(0xFFE8B6A0),
                    fontSize = 10.sp,
                    modifier = Modifier.clickable(onClick = onClearModuleHistory)
                )
            }
        }
    }
}

@Composable
private fun ActivityExternalPill(
    label: String,
    tone: ExternalVisibilityTone
) {
    val (container, textColor) = when (tone) {
        ExternalVisibilityTone.POSITIVE -> Color(0x2234D399) to Color(0xFF9CE2B0)
        ExternalVisibilityTone.WARNING -> Color(0x22FBBF24) to Color(0xFFE7D48B)
        ExternalVisibilityTone.NEGATIVE -> Color(0x22F87171) to Color(0xFFF2A5A5)
        ExternalVisibilityTone.INFO -> Color(0x2241A6FF) to Color(0xFFB6DBFF)
    }
    Text(
        text = label,
        color = textColor,
        fontSize = 9.sp,
        modifier = Modifier
            .background(container, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}
