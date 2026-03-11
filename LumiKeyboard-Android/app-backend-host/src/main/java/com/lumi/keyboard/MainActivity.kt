package com.lumi.keyboard

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.appbackend.BuildConfig
import com.lumi.coredomain.contract.AgentAction
import com.lumi.coredomain.contract.AgentActionType
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.ActorAvailabilityPayload
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.ExecutionReceiptRecord
import com.lumi.coredomain.contract.DependencyReadinessState
import com.lumi.coredomain.contract.EnvironmentActivationPayload
import com.lumi.coredomain.contract.EnvironmentKind
import com.lumi.coredomain.contract.GovernanceActionResult
import com.lumi.coredomain.contract.GovernanceActionType
import com.lumi.coredomain.contract.GovernanceBulkActionRequest
import com.lumi.coredomain.contract.GovernanceCollaborationCommand
import com.lumi.coredomain.contract.GovernanceConsoleFilter
import com.lumi.coredomain.contract.GovernanceConsoleState
import com.lumi.coredomain.contract.GovernanceQuery
import com.lumi.coredomain.contract.GovernanceSummary
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.InteractionEventType
import com.lumi.coredomain.contract.KeystrokeDynamicsPayload
import com.lumi.coredomain.contract.L1CoreStatePayload
import com.lumi.coredomain.contract.L2ContextStatePayload
import com.lumi.coredomain.contract.L3EmotionStatePayload
import com.lumi.coredomain.contract.LedgerQueryFilter
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.LocalRoleLabActorPayload
import com.lumi.coredomain.contract.LocalRoleLabSummaryPayload
import com.lumi.coredomain.contract.ProductShellSummaryPayload
import com.lumi.coredomain.contract.RequesterInboxItemPayload
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.PortfolioScenarioDefinition
import com.lumi.coredomain.contract.PortfolioScenarioModification
import com.lumi.coredomain.contract.PortfolioScenarioModificationType
import com.lumi.coredomain.contract.PortfolioOptimizationRequest
import com.lumi.coredomain.contract.PortfolioOptimizationLearningScope
import com.lumi.coredomain.contract.PortfolioSimulationRunRecord
import com.lumi.coredomain.contract.PilotAccessGrantState
import com.lumi.coredomain.contract.PilotProvisioningState
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyUpdateResult
import com.lumi.coredomain.contract.StateConsensusPayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import com.lumi.coredomain.contract.WorkspaceBindingKind
import com.lumi.keyboard.ui.components.AvatarReadableCard
import com.lumi.keyboard.ui.components.EnvironmentTruthBannerCard
import com.lumi.keyboard.ui.components.HeaderCard
import com.lumi.keyboard.ui.components.HomeOverviewCard
import com.lumi.keyboard.ui.components.LoadingCard
import com.lumi.keyboard.ui.components.LocalRoleLabOverviewCard
import com.lumi.keyboard.ui.components.ModuleFeaturePanel
import com.lumi.keyboard.ui.components.ModuleHeroCard
import com.lumi.keyboard.ui.components.PolicyStudioSummaryCard
import com.lumi.keyboard.ui.components.RequesterInboxCard
import com.lumi.keyboard.ui.components.ResponseDetailCard
import com.lumi.keyboard.ui.components.ResponseHistoryCard
import com.lumi.keyboard.ui.components.SnapshotCard
import com.lumi.keyboard.ui.components.TenantAdminActivationCard
import com.lumi.keyboard.ui.components.UserInteractionHubCard
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.ui.model.ExecutionReceiptFormatter
import com.lumi.keyboard.ui.model.ModuleExecutionStatus
import com.lumi.keyboard.ui.model.ModuleExecutionStep
import com.lumi.keyboard.ui.model.RoleTraceFormatter
import com.lumi.keyboard.ui.model.fallbackDeeplinkFor
import com.lumi.keyboard.ui.model.formatUserFacingResult
import com.lumi.keyboard.ui.model.networkPolicyFor
import com.lumi.keyboard.ui.model.subtitleForModule
import com.lumi.keyboard.ui.screens.ActivityScreenContent
import com.lumi.keyboard.ui.screens.GoalBriefInput
import com.lumi.keyboard.ui.screens.GoalHubScreenContent
import com.lumi.keyboard.ui.screens.toGoalPrompt
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiGradients
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import kotlin.math.max

class MainActivity : ComponentActivity() {
    private companion object {
        private const val TAG = "LumiMainActivity"
    }

    enum class AppSurface(val label: String) {
        GOALS("Goals"),
        WORK("Work"),
        ACTIVITY("Activity")
    }

    private data class UiState(
        val activeModule: AppModule = AppModule.CHAT,
        val activeSurface: AppSurface = AppSurface.GOALS,
        val subtitle: String = "",
        val inputText: String = "",
        val goalBrief: GoalBriefInput = GoalBriefInput(
            goal = "",
            budget = "",
            deadline = "",
            acceptanceCriteria = "",
            confirmationToken = ""
        ),
        val goalAdvancedVisible: Boolean = false,
        val responseHistory: List<AgentResponse> = emptyList(),
        val selectedResponseIndex: Int = 0,
        val snapshot: AgentResponse? = null,
        val summary: DigitalSoulSummary? = null,
        val dynamicState: DynamicHumanStatePayload? = null,
        val trajectory: List<TrajectoryPointPayload> = emptyList(),
        val governanceSummary: GovernanceSummary? = null,
        val governanceConsole: GovernanceConsoleState? = null,
        val productShellSummary: ProductShellSummaryPayload? = null,
        val selectedWorkspaceMode: String = "current",
        val selectedLocalLabActorId: String = "local_tenant_admin_01",
        val latestSubmittedPrompts: Map<AppModule, String> = emptyMap(),
        val loading: Boolean = false,
        val executionTimeline: List<ModuleExecutionStep> = emptyList(),
        val osCommandDraft: String = "",
        val developerModeEnabled: Boolean = false
    )

    private data class SynthesizedTwinSignal(
        val state: DynamicHumanStatePayload,
        val keystroke: KeystrokeDynamicsPayload
    )

    private lateinit var backendClient: BackendHostClient
    private var uiState = mutableStateOf(UiState())
    private val sessionId = UUID.randomUUID().toString()
    private var latestRequestToken: Long = 0L

    private val moduleHistoryStore = mutableMapOf<AppModule, MutableList<AgentResponse>>()
    private val moduleSelectedIndexStore = mutableMapOf<AppModule, Int>()
    private val moduleTimelineStore = mutableMapOf<AppModule, MutableList<ModuleExecutionStep>>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        backendClient = BackendHostClient(this)
        uiState.value = uiState.value.copy(
            developerModeEnabled = UiModePreferences.isDeveloperModeEnabled(this)
        )

        setContent {
            LumiBackendTheme {
                LumiBackendScreen(
                    state = uiState.value,
                    onSwitchSurface = { surface -> switchSurface(surface) },
                    onSwitchModule = { module ->
                        switchModule(module, autoQuery = false)
                        switchSurface(AppSurface.WORK)
                    },
                    onGoalBriefChanged = { brief -> uiState.value = uiState.value.copy(goalBrief = brief) },
                    onSelectWorkspaceMode = { mode ->
                        uiState.value = uiState.value.copy(selectedWorkspaceMode = mode)
                    },
                    onSelectLocalLabActor = { actorId ->
                        uiState.value = uiState.value.copy(selectedLocalLabActorId = actorId)
                    },
                    onToggleGoalAdvanced = {
                        uiState.value = uiState.value.copy(goalAdvancedVisible = !uiState.value.goalAdvancedVisible)
                    },
                    onRunGoalPlan = { runGoalPlan() },
                    onSelectHistory = { index -> selectHistory(index) },
                    onSubmit = { module, prompt, policy, fallback ->
                        submitPrompt(
                            rawInput = prompt,
                            module = module,
                            networkPolicy = policy,
                            fallbackDeeplink = fallback
                        )
                    },
                    onOpenWorkItem = { module, index -> openWorkItem(module, index) },
                    onMarkGovernanceCaseReviewed = { runId -> markGovernanceCaseReviewed(runId) },
                    onRetryGovernanceCaseSync = { runId -> retryGovernanceCaseSync(runId) },
                    onUpdateGovernanceCaseCollaboration = { runId, command ->
                        updateGovernanceCaseCollaboration(runId, command)
                    },
                    onPerformGovernanceBulkAction = { request ->
                        performGovernanceBulkAction(request)
                    },
                    onSavePortfolioScenario = { scenario ->
                        savePortfolioScenario(scenario)
                    },
                    onRunPortfolioScenario = { scenarioId ->
                        runPortfolioScenario(scenarioId)
                    },
                    onComparePortfolioSimulationRuns = { baselineRunId, candidateRunId ->
                        comparePortfolioSimulationRuns(baselineRunId, candidateRunId)
                    },
                    onExportPortfolioSimulationSummary = { runId ->
                        exportPortfolioSimulationSummary(runId)
                    },
                    onSavePortfolioOptimizationRequest = { request ->
                        savePortfolioOptimizationRequest(request)
                    },
                    onRunPortfolioOptimization = { requestId ->
                        runPortfolioOptimization(requestId)
                    },
                    onSelectPortfolioOptimizationSchedule = { resultId, candidateId ->
                        selectPortfolioOptimizationSchedule(resultId, candidateId)
                    },
                    onRecordPortfolioOptimizationOutcome = { decisionId ->
                        recordPortfolioOptimizationOutcome(decisionId)
                    },
                    onApplyPortfolioOptimizationTuning = { suggestionId ->
                        applyPortfolioOptimizationTuning(suggestionId)
                    },
                    onDenyPortfolioOptimizationTuning = { suggestionId ->
                        denyPortfolioOptimizationTuning(suggestionId)
                    },
                    onPropagatePortfolioOptimizationObjectiveProfile = { snapshotId, targetScope ->
                        propagatePortfolioOptimizationObjectiveProfile(snapshotId, targetScope)
                    },
                    onApprovePortfolioOptimizationPropagation = { attemptId ->
                        approvePortfolioOptimizationPropagation(attemptId)
                    },
                    onRejectPortfolioOptimizationPropagation = { attemptId ->
                        rejectPortfolioOptimizationPropagation(attemptId)
                    },
                    onExportPortfolioOptimizationSummary = { resultId ->
                        exportPortfolioOptimizationSummary(resultId)
                    },
                    onCopyGovernanceCaseSummary = { runId -> copyGovernanceCaseSummary(runId) },
                    onOpenGovernanceCaseTrail = { runId -> openGovernanceCaseTrail(runId) },
                    onOsCommandChange = { command -> uiState.value = uiState.value.copy(osCommandDraft = command) },
                    onRunOsCommand = { runOsCommand(it) },
                    onOpenDeeplink = { deeplink -> openDeepLink(deeplink) },
                    onOpenSettingsActivity = { startActivity(Intent(this, SettingsActivity::class.java)) }
                )
            }
        }

        switchModule(AppModule.CHAT, autoQuery = false)
        uiState.value = uiState.value.copy(activeSurface = AppSurface.GOALS)
        handleDeepLink(intent)
    }

    override fun onStart() {
        super.onStart()
        refreshDeveloperMode()
        backendClient.connect()
        hydrateHistoryFromLedger()
        hydrateGovernanceSummary()
        hydrateGovernanceConsole()
        if (uiState.value.activeModule == AppModule.HOME ||
            uiState.value.activeModule == AppModule.AVATAR ||
            uiState.value.activeModule == AppModule.LIX
        ) {
            loadHomeOverview()
        }
    }

    override fun onStop() {
        super.onStop()
        backendClient.disconnect()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun refreshDeveloperMode() {
        val enabled = UiModePreferences.isDeveloperModeEnabled(this)
        if (uiState.value.developerModeEnabled != enabled) {
            uiState.value = uiState.value.copy(developerModeEnabled = enabled)
        }
    }

    private fun switchSurface(surface: AppSurface) {
        val subtitle = when (surface) {
            AppSurface.GOALS -> "Define one outcome with constraints. Agent OS orchestrates execution end-to-end."
            AppSurface.WORK -> subtitleForModule(uiState.value.activeModule)
            AppSurface.ACTIVITY -> "Review traces, fulfillment outcomes, and replay any run."
        }
        if (surface == AppSurface.ACTIVITY) {
            hydrateGovernanceSummary()
            hydrateGovernanceConsole()
        }
        uiState.value = uiState.value.copy(activeSurface = surface, subtitle = subtitle)
    }

    private fun runGoalPlan() {
        val brief = uiState.value.goalBrief
        val prompt = brief.toGoalPrompt()
        if (prompt.isBlank()) {
            Toast.makeText(this, "Please describe your goal first.", Toast.LENGTH_SHORT).show()
            return
        }
        val targetModule = AppModule.CHAT
        recordInteraction(
            eventType = InteractionEventType.GOAL_SUBMITTED,
            payload = mapOf(
                "module" to targetModule.label,
                "routing_mode" to "cloud_dynamic",
                "has_budget" to brief.budget.isNotBlank().toString(),
                "has_deadline" to brief.deadline.isNotBlank().toString(),
                "has_acceptance" to brief.acceptanceCriteria.isNotBlank().toString(),
                "has_token" to brief.confirmationToken.isNotBlank().toString(),
                "char_count" to brief.goal.length.toString()
            )
        )
        switchModule(targetModule, autoQuery = false)
        switchSurface(AppSurface.WORK)
        submitPrompt(
            rawInput = prompt,
            module = targetModule,
            networkPolicy = NetworkPolicy.CLOUD_PREFERRED,
            fallbackDeeplink = fallbackDeeplinkFor(targetModule)
        )
    }

    private fun openWorkItem(module: AppModule, index: Int) {
        switchModule(module, autoQuery = false)
        selectHistory(index)
        switchSurface(AppSurface.WORK)
    }

    private fun markGovernanceCaseReviewed(runId: String) {
        backendClient.markGovernanceCaseReviewed(
            userId = "local-user",
            runId = runId
        ) { result ->
            handleGovernanceActionResult(result)
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun retryGovernanceCaseSync(runId: String) {
        backendClient.retryGovernanceSyncIntent(
            userId = "local-user",
            runId = runId
        ) { result ->
            handleGovernanceActionResult(result)
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
            hydrateHistoryFromLedger()
        }
    }

    private fun updateGovernanceCaseCollaboration(
        runId: String,
        command: GovernanceCollaborationCommand
    ) {
        backendClient.updateGovernanceCaseCollaboration(
            userId = "local-user",
            runId = runId,
            command = command
        ) { result ->
            handleGovernanceActionResult(result)
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
            hydrateHistoryFromLedger()
        }
    }

    private fun performGovernanceBulkAction(
        request: GovernanceBulkActionRequest
    ) {
        backendClient.performGovernanceBulkAction(
            userId = "local-user",
            request = request
        ) { result ->
            val summary = buildString {
                append(result.message.ifBlank { "Bulk action completed." })
                append(" (success ")
                append(result.successCount)
                append(", failed ")
                append(result.failureCount)
                append(", skipped ")
                append(result.skippedCount)
                append(')')
            }
            Toast.makeText(this, summary, Toast.LENGTH_SHORT).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
            hydrateHistoryFromLedger()
        }
    }

    private fun savePortfolioScenario(
        scenario: PortfolioScenarioDefinition
    ) {
        backendClient.savePortfolioScenario(
            userId = "local-user",
            scenario = scenario
        ) { saved ->
            Toast.makeText(
                this,
                "Saved portfolio scenario: ${saved.name.ifBlank { saved.scenarioId }}.",
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
        }
    }

    private fun savePortfolioOptimizationRequest(
        request: PortfolioOptimizationRequest
    ) {
        backendClient.savePortfolioOptimizationRequest(
            userId = "local-user",
            request = request
        ) { saved ->
            Toast.makeText(
                this,
                "Saved optimization request: ${saved.name.ifBlank { saved.requestId }}.",
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun runPortfolioScenario(
        scenarioId: String
    ) {
        backendClient.runPortfolioScenario(
            userId = "local-user",
            scenarioId = scenarioId
        ) { run ->
            val statusText = run.status.name.lowercase().replace('_', ' ')
            Toast.makeText(
                this,
                "Portfolio simulation ${run.runId.take(8)} $statusText.",
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
        }
    }

    private fun comparePortfolioSimulationRuns(
        baselineRunId: String,
        candidateRunId: String
    ) {
        backendClient.comparePortfolioSimulationRuns(
            userId = "local-user",
            baselineRunId = baselineRunId,
            candidateRunId = candidateRunId
        ) { comparison ->
            val message = comparison?.summary
                ?: "Simulation comparison unavailable."
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
            hydrateGovernanceConsole()
        }
    }

    private fun runPortfolioOptimization(
        requestId: String
    ) {
        backendClient.runPortfolioOptimization(
            userId = "local-user",
            requestId = requestId
        ) { result ->
            val statusText = result.status.name.lowercase().replace('_', ' ')
            Toast.makeText(
                this,
                "Portfolio optimization ${result.resultId.takeLast(8)} $statusText.",
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun selectPortfolioOptimizationSchedule(
        resultId: String,
        candidateId: String
    ) {
        backendClient.selectPortfolioOptimizationSchedule(
            userId = "local-user",
            resultId = resultId,
            candidateId = candidateId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        ) { decision ->
            Toast.makeText(
                this,
                decision.summary.ifBlank { "Portfolio optimization selection recorded." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun recordPortfolioOptimizationOutcome(
        decisionId: String
    ) {
        backendClient.recordPortfolioOptimizationOutcome(
            userId = "local-user",
            decisionId = decisionId
        ) { outcome ->
            Toast.makeText(
                this,
                outcome.summary.ifBlank { "Portfolio optimization outcome recorded." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun applyPortfolioOptimizationTuning(
        suggestionId: String
    ) {
        backendClient.applyPortfolioOptimizationTuning(
            userId = "local-user",
            suggestionId = suggestionId,
            operatorId = "local-user",
            operatorName = "Local Operator"
        ) { decision ->
            Toast.makeText(
                this,
                decision.summary.ifBlank { "Portfolio optimization tuning decision recorded." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun denyPortfolioOptimizationTuning(
        suggestionId: String
    ) {
        backendClient.denyPortfolioOptimizationTuning(
            userId = "local-user",
            suggestionId = suggestionId,
            operatorId = "local-user",
            operatorName = "Local Operator",
            reason = "Denied by local operator."
        ) { decision ->
            Toast.makeText(
                this,
                decision.summary.ifBlank { "Portfolio optimization tuning denial recorded." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun propagatePortfolioOptimizationObjectiveProfile(
        snapshotId: String,
        targetScope: PortfolioOptimizationLearningScope
    ) {
        backendClient.propagatePortfolioOptimizationObjectiveProfile(
            userId = "local-user",
            sourceObjectiveProfileSnapshotId = snapshotId,
            targetScope = targetScope,
            operatorId = "local-user",
            operatorName = "Local Operator"
        ) { attempt ->
            Toast.makeText(
                this,
                attempt.summary.ifBlank { "Portfolio objective propagation recorded." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun approvePortfolioOptimizationPropagation(
        attemptId: String
    ) {
        backendClient.approvePortfolioOptimizationPropagation(
            userId = "local-user",
            attemptId = attemptId,
            approverId = "local-user",
            approverName = "Local Operator"
        ) { adoption ->
            Toast.makeText(
                this,
                adoption.summary.ifBlank { "Portfolio objective propagation approved." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun rejectPortfolioOptimizationPropagation(
        attemptId: String
    ) {
        backendClient.rejectPortfolioOptimizationPropagation(
            userId = "local-user",
            attemptId = attemptId,
            approverId = "local-user",
            approverName = "Local Operator",
            reason = "Rejected by local operator."
        ) { approval ->
            Toast.makeText(
                this,
                approval.summary.ifBlank { "Portfolio objective propagation rejected." },
                Toast.LENGTH_SHORT
            ).show()
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun exportPortfolioSimulationSummary(
        runId: String
    ) {
        backendClient.exportPortfolioSimulationSummary(
            userId = "local-user",
            runId = runId
        ) { summary ->
            val clipboard = getSystemService(ClipboardManager::class.java)
            if (clipboard != null) {
                clipboard.setPrimaryClip(ClipData.newPlainText("Portfolio Simulation Summary", summary))
                Toast.makeText(this, "Portfolio simulation summary copied.", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, summary.take(120), Toast.LENGTH_SHORT).show()
            }
            hydrateGovernanceConsole()
        }
    }

    private fun exportPortfolioOptimizationSummary(
        resultId: String
    ) {
        backendClient.exportPortfolioOptimizationSummary(
            userId = "local-user",
            resultId = resultId
        ) { summary ->
            val clipboard = getSystemService(ClipboardManager::class.java)
            if (clipboard != null) {
                clipboard.setPrimaryClip(ClipData.newPlainText("Portfolio Optimization Summary", summary))
                Toast.makeText(this, "Portfolio optimization summary copied.", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, summary.take(120), Toast.LENGTH_SHORT).show()
            }
            hydrateGovernanceConsole()
            hydrateGovernanceSummary()
        }
    }

    private fun copyGovernanceCaseSummary(runId: String) {
        val caseSummary = uiState.value.governanceConsole
            ?.cases
            ?.firstOrNull { it.summary.runId == runId }
            ?.let { case ->
                val summary = case.summary
                buildString {
                    append("Run ")
                    append(summary.runId)
                    append('\n')
                    append(summary.title)
                    append('\n')
                    append(summary.summary)
                    append('\n')
                    append("Provider: ")
                    append(summary.providerLabel ?: "n/a")
                    append('\n')
                    append("Settlement: ")
                    append(summary.settlementStatus.name.lowercase())
                    append(" · Dispute: ")
                    append(summary.disputeStatus.name.lowercase())
                    append(" · Sync: ")
                    append(summary.syncState.name.lowercase())
                    append('\n')
                    append("Priority: ")
                    append(summary.priority.name.lowercase())
                    append(" · Queue: ")
                    append(summary.primaryQueue.name.lowercase())
                    append('\n')
                    append("Assignee: ")
                    append(summary.assigneeDisplayName ?: "unassigned")
                    append(" · Escalated: ")
                    append(if (summary.escalated) "yes" else "no")
                    append(" · Permission denials: ")
                    append(summary.permissionDeniedCount)
                    case.connectorRoutingSummary?.summary
                        ?.takeIf { it.isNotBlank() }
                        ?.let { connectorSummary ->
                            append('\n')
                            append("Connector routing: ")
                            append(connectorSummary)
                        }
                }
            } ?: "Governance case summary unavailable for run $runId."

        val clipboard = getSystemService(ClipboardManager::class.java)
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText("Governance Case", caseSummary))
            Toast.makeText(this, "Governance case summary copied.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Clipboard unavailable.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openGovernanceCaseTrail(runId: String) {
        backendClient.fetchExecutionLedger(
            userId = "local-user",
            filter = LedgerQueryFilter(runId = runId, limit = 1)
        ) { records ->
            val record = records.firstOrNull()
            if (record == null) {
                Toast.makeText(this, "No ledger trail found for run $runId.", Toast.LENGTH_SHORT).show()
                return@fetchExecutionLedger
            }
            mergeLedgerHistory(records)
            val module = toAppModule(record.module)
            val history = moduleHistoryStore[module].orEmpty()
            val index = history.indexOfFirst { it.traceId == runId }.takeIf { it >= 0 } ?: 0
            openWorkItem(module, index)
            Toast.makeText(this, "Opened receipt/ledger trail in Work.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun handleGovernanceActionResult(result: GovernanceActionResult) {
        val actionLabel = when (result.action) {
            GovernanceActionType.CLAIM_CASE -> "Claim case"
            GovernanceActionType.UNCLAIM_CASE -> "Unclaim case"
            GovernanceActionType.RELEASE_CASE -> "Release case"
            GovernanceActionType.ASSIGN_CASE -> "Assign case"
            GovernanceActionType.REASSIGN_CASE -> "Reassign case"
            GovernanceActionType.ESCALATE_CASE -> "Escalate case"
            GovernanceActionType.ADD_NOTE -> "Add note"
            GovernanceActionType.REQUEST_FOLLOW_UP -> "Request follow-up"
            GovernanceActionType.ACK_REMOTE_HANDOFF -> "Acknowledge handoff"
            GovernanceActionType.ATTACH_WORKFLOW_TEMPLATE -> "Attach workflow"
            GovernanceActionType.ADVANCE_WORKFLOW_STAGE -> "Advance workflow stage"
            GovernanceActionType.RUN_SAFE_AUTOMATION -> "Run safe automation"
            GovernanceActionType.REQUEST_POLICY_ROLLOUT_APPROVAL -> "Request rollout approval"
            GovernanceActionType.APPROVE_POLICY_ROLLOUT -> "Approve rollout"
            GovernanceActionType.DENY_POLICY_ROLLOUT_APPROVAL -> "Deny rollout approval"
            GovernanceActionType.PROMOTE_POLICY_ROLLOUT -> "Promote rollout"
            GovernanceActionType.ENFORCE_POLICY_ROLLOUT -> "Enforce rollout"
            GovernanceActionType.PAUSE_POLICY_ROLLOUT -> "Pause rollout"
            GovernanceActionType.RESUME_POLICY_ROLLOUT -> "Resume rollout"
            GovernanceActionType.FREEZE_POLICY_ROLLOUT -> "Freeze rollout"
            GovernanceActionType.ROLLBACK_POLICY_ROLLOUT -> "Rollback rollout"
            GovernanceActionType.EXPAND_POLICY_ROLLOUT_SCOPE -> "Expand rollout scope"
            GovernanceActionType.REQUEST_POLICY_PROMOTION -> "Request policy promotion"
            GovernanceActionType.APPROVE_POLICY_PROMOTION -> "Approve policy promotion"
            GovernanceActionType.REJECT_POLICY_PROMOTION -> "Reject policy promotion"
            GovernanceActionType.ADVANCE_POLICY_ROLLOUT -> "Advance policy rollout"
            GovernanceActionType.CREATE_POLICY_GOVERNANCE_PROGRAM -> "Create policy governance program"
            GovernanceActionType.ADVANCE_POLICY_GOVERNANCE_WAVE -> "Advance policy governance wave"
            GovernanceActionType.PAUSE_POLICY_GOVERNANCE_WAVE -> "Pause policy governance wave"
            GovernanceActionType.ADD_POLICY_ROLLOUT_EXEMPTION -> "Add rollout exemption"
            GovernanceActionType.REMOVE_POLICY_ROLLOUT_EXEMPTION -> "Remove rollout exemption"
            GovernanceActionType.PIN_POLICY_ROLLOUT_TARGET -> "Pin rollout target"
            GovernanceActionType.UNPIN_POLICY_ROLLOUT_TARGET -> "Unpin rollout target"
            GovernanceActionType.DEPRECATE_POLICY_PACK -> "Deprecate policy pack"
            GovernanceActionType.RETIRE_POLICY_PACK -> "Retire policy pack"
            GovernanceActionType.ATTACH_POLICY_PACK_REPLACEMENT -> "Attach policy replacement plan"
            GovernanceActionType.ATTACH_POLICY_ESTATE_REMEDIATION_PLAN -> "Attach policy-estate remediation plan"
            GovernanceActionType.ACK_POLICY_ESTATE_BLOCKER -> "Acknowledge policy-estate blocker"
            GovernanceActionType.SCHEDULE_POLICY_ESTATE_REMEDIATION -> "Schedule policy-estate remediation"
            GovernanceActionType.PAUSE_POLICY_ESTATE_REMEDIATION -> "Pause policy-estate remediation"
            GovernanceActionType.RESUME_POLICY_ESTATE_REMEDIATION -> "Resume policy-estate remediation"
            GovernanceActionType.CANCEL_POLICY_ESTATE_REMEDIATION -> "Cancel policy-estate remediation"
            GovernanceActionType.APPLY_SAFE_POLICY_ESTATE_REMEDIATION -> "Apply safe policy-estate remediation"
            GovernanceActionType.MARK_REVIEWED -> "Mark reviewed"
            GovernanceActionType.RETRY_SYNC_INTENT -> "Retry sync intent"
            GovernanceActionType.COPY_CASE_SUMMARY -> "Copy summary"
            GovernanceActionType.EXPORT_CASE_SUMMARY -> "Export summary"
            GovernanceActionType.OPEN_RECEIPT_TRAIL -> "Open receipt trail"
            GovernanceActionType.FILTER_PROVIDER_CASES -> "Filter provider cases"
            GovernanceActionType.FILTER_ROLE_CASES -> "Filter role cases"
        }
        val message = if (result.success) {
            result.message.ifBlank { "$actionLabel completed." }
        } else {
            val denied = result.denialReason?.name
                ?.lowercase()
                ?.replace('_', ' ')
                ?.replaceFirstChar { it.uppercase() }
            val base = result.message.ifBlank { "$actionLabel failed." }
            if (denied != null) "$base (Denied: $denied)" else base
        }
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun runAgentOsSystemCheck() {
        val checkPrompt = """
            Run Agent OS diagnostics for Lumi and return a concise operational report:
            1) OpenClaw cloud/relay status
            2) model routing readiness
            3) skill routing + fallback health
            4) external fulfillment loop readiness
            5) top 3 actionable fixes if any risk is detected
            Require evidence and next_action in the output.
        """.trimIndent()
        switchModule(AppModule.CHAT, autoQuery = false)
        switchSurface(AppSurface.WORK)
        submitPrompt(
            rawInput = checkPrompt,
            module = AppModule.CHAT,
            networkPolicy = NetworkPolicy.CLOUD_PREFERRED,
            fallbackDeeplink = fallbackDeeplinkFor(AppModule.CHAT)
        )
    }

    private fun runOsCommand(rawCommand: String) {
        val command = rawCommand.trim()
        if (command.isBlank()) return
        val normalized = if (command.startsWith("/")) command else "/chat $command"
        val parts = normalized.split(Regex("\\s+"), limit = 2)
        val route = parts.firstOrNull().orEmpty().lowercase(Locale.getDefault())
        val payload = parts.getOrNull(1).orEmpty().trim()

        when (route) {
            "/diag", "/health", "/doctor" -> {
                runAgentOsSystemCheck()
            }

            "/lix", "/market" -> {
                val prompt = payload.ifBlank {
                    "Open external fulfillment and prepare executable options with proof and rollback terms."
                }
                switchModule(AppModule.LIX, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt(
                    rawInput = prompt,
                    module = AppModule.LIX,
                    networkPolicy = networkPolicyFor(AppModule.LIX),
                    fallbackDeeplink = fallbackDeeplinkFor(AppModule.LIX)
                )
            }

            "/avatar", "/twin" -> {
                val prompt = payload.ifBlank {
                    "Refresh my Preferences & Permissions profile and show how this task should be constrained."
                }
                switchModule(AppModule.AVATAR, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt(
                    rawInput = prompt,
                    module = AppModule.AVATAR,
                    networkPolicy = NetworkPolicy.LOCAL_ONLY,
                    fallbackDeeplink = fallbackDeeplinkFor(AppModule.AVATAR)
                )
            }

            "/chat", "/run" -> {
                val prompt = payload.ifBlank { "Continue Agent OS orchestration for my current goal." }
                switchModule(AppModule.CHAT, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt(
                    rawInput = prompt,
                    module = AppModule.CHAT,
                    networkPolicy = NetworkPolicy.CLOUD_PREFERRED,
                    fallbackDeeplink = fallbackDeeplinkFor(AppModule.CHAT)
                )
            }

            else -> {
                switchModule(AppModule.CHAT, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt(
                    rawInput = command,
                    module = AppModule.CHAT,
                    networkPolicy = NetworkPolicy.CLOUD_PREFERRED,
                    fallbackDeeplink = fallbackDeeplinkFor(AppModule.CHAT)
                )
            }
        }

        recordInteraction(
            eventType = InteractionEventType.QUERY_REFINE,
            payload = mapOf(
                "action" to "os_command",
                "command" to normalized.take(80)
            )
        )
        uiState.value = uiState.value.copy(osCommandDraft = "")
    }

    private fun switchModule(module: AppModule, autoQuery: Boolean) {
        val history = moduleHistoryStore[module].orEmpty()
        val selected = moduleSelectedIndexStore[module]?.coerceIn(0, history.lastIndex.coerceAtLeast(0)) ?: 0
        val timeline = moduleTimelineStore[module].orEmpty()

        uiState.value = uiState.value.copy(
            activeModule = module,
            subtitle = subtitleForModule(module),
            responseHistory = history,
            selectedResponseIndex = selected,
            snapshot = null,
            loading = false,
            executionTimeline = timeline
        )

        recordInteraction(
            InteractionEventType.QUERY_REFINE,
            mapOf("action" to "module_switch", "module" to module.label)
        )

        backendClient.fetchModuleSnapshot(module.moduleId) { snapshot ->
            if (uiState.value.activeModule == module && snapshot != null) {
                uiState.value = applyProductShellSummary(
                    uiState.value.copy(snapshot = snapshot),
                    extractProductShellSummary(snapshot.payload)
                )
            }
        }

        if (module == AppModule.HOME || module == AppModule.AVATAR || module == AppModule.LIX) {
            loadHomeOverview()
        }

        if (autoQuery) {
            submitPrompt(
                rawInput = module.bootstrapPrompt,
                module = module,
                fallbackDeeplink = fallbackDeeplinkFor(module)
            )
        }
    }

    private fun selectHistory(index: Int) {
        val history = uiState.value.responseHistory
        if (history.isEmpty()) return
        val safeIndex = index.coerceIn(0, history.lastIndex)
        moduleSelectedIndexStore[uiState.value.activeModule] = safeIndex
        uiState.value = uiState.value.copy(selectedResponseIndex = safeIndex)
    }

    private fun loadHomeOverview() {
        latestRequestToken += 1L
        val token = latestRequestToken
        uiState.value = uiState.value.copy(loading = true, subtitle = "Loading digital twin and module status...")

        backendClient.fetchDigitalSoulSummary { summary ->
            if (token != latestRequestToken) return@fetchDigitalSoulSummary
            if (uiState.value.activeModule != AppModule.HOME &&
                uiState.value.activeModule != AppModule.AVATAR &&
                uiState.value.activeModule != AppModule.LIX
            ) return@fetchDigitalSoulSummary
            uiState.value = uiState.value.copy(
                summary = summary,
                loading = false,
                subtitle = if (summary == null) {
                    subtitleForModule(uiState.value.activeModule)
                } else {
                    "Preferences profile: ${summary.profileLabel} · Active signals ${summary.topTraits.size}"
                }
            )
        }
        backendClient.fetchDynamicState { state ->
            if (token != latestRequestToken) return@fetchDynamicState
            uiState.value = uiState.value.copy(dynamicState = state)
        }
        backendClient.fetchTrajectory(days = 14) { points ->
            if (token != latestRequestToken) return@fetchTrajectory
            uiState.value = uiState.value.copy(trajectory = points)
        }
    }

    private fun hydrateHistoryFromLedger() {
        backendClient.fetchExecutionLedger(
            userId = "local-user",
            filter = LedgerQueryFilter(limit = 120)
        ) { records ->
            if (records.isEmpty()) return@fetchExecutionLedger
            mergeLedgerHistory(records)
            hydrateGovernanceSummary()
            hydrateGovernanceConsole()
        }
    }

    private fun hydrateGovernanceSummary(days: Int = 7) {
        backendClient.fetchGovernanceSummary(
            userId = "local-user",
            query = GovernanceQuery(windowDays = days, limit = 240)
        ) { summary ->
            uiState.value = uiState.value.copy(governanceSummary = summary)
        }
    }

    private fun hydrateGovernanceConsole() {
        backendClient.fetchGovernanceConsoleState(
            userId = "local-user",
            filter = GovernanceConsoleFilter(limit = 120)
        ) { console ->
            uiState.value = uiState.value.copy(governanceConsole = console)
        }
    }

    private fun mergeLedgerHistory(records: List<ExecutionReceiptRecord>) {
        val grouped = records.groupBy { toAppModule(it.module) }
        grouped.forEach { (module, moduleRecords) ->
            val restored = moduleRecords.map { record ->
                record.responseSnapshot ?: record.toFallbackResponse()
            }
            val existing = moduleHistoryStore[module].orEmpty()
            val merged = buildList {
                addAll(restored)
                addAll(existing)
            }.distinctBy { it.traceId }.take(24)
            moduleHistoryStore[module] = merged.toMutableList()
            if (uiState.value.activeModule == module && merged.isNotEmpty()) {
                val selected = moduleSelectedIndexStore[module]
                    ?.coerceIn(0, merged.lastIndex)
                    ?: 0
                uiState.value = uiState.value.copy(
                    responseHistory = merged,
                    selectedResponseIndex = selected
                )
            }
        }
    }

    private fun toAppModule(moduleId: com.lumi.coredomain.contract.ModuleId): AppModule {
        return AppModule.entries.firstOrNull { it.moduleId == moduleId } ?: AppModule.CHAT
    }

    private fun ExecutionReceiptRecord.toFallbackResponse(): AgentResponse {
        val trace = runId.ifBlank { "ledger_${recordId.take(10)}" }
        val summaryText = receipt?.intentSummary
            ?.takeIf { it.isNotBlank() }
            ?: legacySummary.takeIf { it.isNotBlank() }
            ?: "Recovered historical run."
        return AgentResponse(
            type = AgentResponseType.CARDS,
            summary = summaryText,
            traceId = trace,
            latencyMs = 0,
            confidence = 0.0,
            module = module,
            payload = ModulePayload.NonePayload,
            status = status,
            activeRole = activeRole,
            roleSource = roleSource,
            delegationMode = delegationMode,
            executionReceipt = receipt
        )
    }

    private fun submitPrompt(
        rawInput: String,
        module: AppModule,
        networkPolicy: NetworkPolicy = networkPolicyFor(module),
        fallbackDeeplink: String? = null
    ) {
        if (uiState.value.loading && uiState.value.activeModule == module) {
            Toast.makeText(this, "A request is already running. Please wait.", Toast.LENGTH_SHORT).show()
            return
        }
        val input = rawInput.trim()
        if (input.isBlank()) return
        val synthesizedSignal = synthesizeTwinSignal(input, module, uiState.value.dynamicState)
        val latestPromptMap = uiState.value.latestSubmittedPrompts.toMutableMap().apply {
            this[module] = input
        }

        latestRequestToken += 1L
        val token = latestRequestToken
        val timelineStepId = startTimelineStep(module, input)

        uiState.value = uiState.value.copy(
            inputText = "",
            loading = true,
            latestSubmittedPrompts = latestPromptMap,
            subtitle = "${module.label} Request is being processed..."
        )

        recordInteraction(
            InteractionEventType.QUERY_REFINE,
            mapOf(
                "action" to "submit_prompt",
                "module" to module.label,
                "char_count" to input.length.toString()
            )
        )
        recordInteraction(
            InteractionEventType.KEYSTROKE_WINDOW,
            mapOf(
                "module" to module.label,
                "stress" to synthesizedSignal.state.l3.stressScore.toString(),
                "focus" to synthesizedSignal.state.l3.focusScore.toString(),
                "polarity" to "%.2f".format(Locale.US, synthesizedSignal.state.l3.polarity)
            )
        )
        recordInteraction(
            InteractionEventType.STATE_ADJUST,
            mapOf(
                "module" to module.label,
                "context_load" to "%.2f".format(Locale.US, synthesizedSignal.state.l2.contextLoad),
                "energy" to "%.2f".format(Locale.US, synthesizedSignal.state.l2.energyLevel)
            )
        )

        backendClient.submitPrompt(
            input = input,
            module = module.moduleId,
            sessionId = sessionId,
            networkPolicy = networkPolicy,
            stateVector = synthesizedSignal.state,
            keystroke = synthesizedSignal.keystroke
        ) callback@{ response ->
            if (token != latestRequestToken) return@callback
            val safeResponse = if (response.appDeeplink.isNullOrBlank() && !fallbackDeeplink.isNullOrBlank()) {
                response.copy(appDeeplink = fallbackDeeplink)
            } else {
                response
            }
            pushResponse(module, safeResponse)
            refreshModuleSnapshot(module)
            finishTimelineStep(module, timelineStepId, safeResponse)
            hydrateGovernanceSummary()
            hydrateGovernanceConsole()
            when (safeResponse.status) {
                ResponseStatus.SUCCESS,
                ResponseStatus.COMMITTED,
                ResponseStatus.PARTIAL -> {
                    recordInteraction(
                        eventType = InteractionEventType.TASK_CONFIRM,
                        payload = mapOf(
                            "module" to module.label,
                            "status" to safeResponse.status.name.lowercase(),
                            "latency_ms" to safeResponse.latencyMs.toString(),
                            "predicted_success_prob" to safeResponse.confidence.toString(),
                            "decision_source" to decisionSourceFor(module)
                        ),
                        traceId = safeResponse.traceId
                    )
                }

                ResponseStatus.ERROR,
                ResponseStatus.ROLLED_BACK,
                ResponseStatus.DISPUTED,
                ResponseStatus.CANCELLED -> {
                    recordInteraction(
                        eventType = InteractionEventType.TASK_CANCEL,
                        payload = mapOf(
                            "module" to module.label,
                            "status" to safeResponse.status.name.lowercase(),
                            "error_code" to (safeResponse.errorCode ?: "none"),
                            "predicted_success_prob" to safeResponse.confidence.toString(),
                            "decision_source" to decisionSourceFor(module)
                        ),
                        traceId = safeResponse.traceId
                    )
                }

                ResponseStatus.WAITING_USER,
                ResponseStatus.AUTH_REQUIRED -> {
                    recordInteraction(
                        eventType = InteractionEventType.QUERY_REFINE,
                        payload = mapOf(
                            "module" to module.label,
                            "action" to "requirements_requested",
                            "status" to safeResponse.status.name.lowercase()
                        ),
                        traceId = safeResponse.traceId
                    )
                    val blockingGate = safeResponse.gateDecisions.firstOrNull { it.decision != com.lumi.coredomain.contract.GateDecisionStatus.PASSED }
                    val clarificationPrompt = safeResponse.clarificationQuestions.firstOrNull()?.prompt
                    val nextRequiredInput = clarificationPrompt
                        ?: blockingGate?.nextAction
                        ?: safeResponse.nextAction
                        ?: "Additional user input is required before execution can continue."
                    recordInteraction(
                        eventType = InteractionEventType.GATE_BLOCK_VIEWED,
                        payload = mapOf(
                            "module" to module.label,
                            "gate" to (blockingGate?.gate?.name ?: "unknown")
                        ),
                        traceId = safeResponse.traceId
                    )
                    Toast.makeText(
                        this,
                        nextRequiredInput,
                        Toast.LENGTH_LONG
                    ).show()
                }

                else -> Unit
            }
            if (uiState.value.activeModule == module) {
                val cleanedSubtitle = formatUserFacingResult(safeResponse.summary)
                uiState.value = uiState.value.copy(
                    loading = false,
                    subtitle = cleanedSubtitle ?: safeResponse.summary ?: subtitleForModule(module)
                )
            }
            refreshDigitalSoulSummary(token)
        }
    }

    private fun pushResponse(module: AppModule, response: AgentResponse) {
        val existing = moduleHistoryStore[module].orEmpty()
        val merged = buildList {
            add(response)
            existing.forEach {
                if (it.traceId != response.traceId) add(it)
            }
        }.take(12)

        moduleHistoryStore[module] = merged.toMutableList()
        moduleSelectedIndexStore[module] = 0
        if (uiState.value.activeModule == module) {
            uiState.value = uiState.value.copy(
                responseHistory = merged,
                selectedResponseIndex = 0
            )
        }
    }

    private fun refreshModuleSnapshot(module: AppModule) {
        backendClient.fetchModuleSnapshot(module.moduleId) { snapshot ->
            if (snapshot == null) return@fetchModuleSnapshot
            if (uiState.value.activeModule == module) {
                uiState.value = applyProductShellSummary(
                    uiState.value.copy(snapshot = snapshot),
                    extractProductShellSummary(snapshot.payload)
                )
            }
        }
    }

    private fun refreshDigitalSoulSummary(token: Long? = null) {
        backendClient.fetchDigitalSoulSummary { summary ->
            if (summary == null) return@fetchDigitalSoulSummary
            if (token != null && token != latestRequestToken) return@fetchDigitalSoulSummary
            uiState.value = uiState.value.copy(summary = summary)
        }
        backendClient.fetchDynamicState { state ->
            if (token != null && token != latestRequestToken) return@fetchDynamicState
            uiState.value = uiState.value.copy(dynamicState = state)
        }
        backendClient.fetchTrajectory(days = 14) { points ->
            if (token != null && token != latestRequestToken) return@fetchTrajectory
            uiState.value = uiState.value.copy(trajectory = points)
        }
    }

    private fun saveRolePolicy(
        role: UserRole,
        draft: RolePolicyDraft,
        callback: (RolePolicyUpdateResult) -> Unit
    ) {
        backendClient.updateRolePolicy(
            userId = "local-user",
            role = role,
            draft = draft
        ) { result ->
            callback(result)
            if (result.saved) {
                Toast.makeText(
                    this,
                    "Role policy saved for ${role.name.lowercase(Locale.getDefault())}.",
                    Toast.LENGTH_SHORT
                ).show()
                refreshDigitalSoulSummary()
                refreshAvatarSnapshot()
            } else {
                val firstIssue = result.validation.issues.firstOrNull()?.message
                    ?: "Role policy validation failed."
                Toast.makeText(this, firstIssue, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun resetRolePolicy(
        role: UserRole,
        callback: (RolePolicyUpdateResult) -> Unit
    ) {
        backendClient.resetRolePolicy(
            userId = "local-user",
            role = role
        ) { result ->
            callback(result)
            if (result.saved) {
                Toast.makeText(
                    this,
                    "Role policy reset for ${role.name.lowercase(Locale.getDefault())}.",
                    Toast.LENGTH_SHORT
                ).show()
                refreshDigitalSoulSummary()
                refreshAvatarSnapshot()
            } else {
                val firstIssue = result.validation.issues.firstOrNull()?.message
                    ?: "Role policy reset failed."
                Toast.makeText(this, firstIssue, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun refreshAvatarSnapshot() {
        backendClient.fetchModuleSnapshot(AppModule.AVATAR.moduleId) { snapshot ->
            if (snapshot == null) return@fetchModuleSnapshot
            if (uiState.value.activeModule == AppModule.AVATAR) {
                uiState.value = applyProductShellSummary(
                    uiState.value.copy(snapshot = snapshot),
                    extractProductShellSummary(snapshot.payload)
                )
            }
            moduleHistoryStore[AppModule.AVATAR]
                ?.replaceAll { previous ->
                    if (previous.module == snapshot.module && previous.traceId == snapshot.traceId) snapshot else previous
                }
        }
    }

    private fun handleAction(action: AgentAction) {
        Log.i(TAG, "handleAction id=${action.id} type=${action.type} label=${action.label}")
        when (action.type) {
            AgentActionType.OPEN_DEEPLINK -> {
                val link = action.deeplink ?: return
                recordInteraction(
                    eventType = InteractionEventType.NEXT_ACTION_CLICKED,
                    payload = mapOf(
                        "module" to uiState.value.activeModule.label,
                        "action_id" to action.id,
                        "action_type" to "open_deeplink"
                    )
                )
                Toast.makeText(this, "Opening: ${action.label}", Toast.LENGTH_SHORT).show()
                openDeepLink(link)
            }
            AgentActionType.RUN_QUERY -> {
                val prompt = action.prompt ?: return
                recordInteraction(
                    eventType = InteractionEventType.NEXT_ACTION_CLICKED,
                    payload = mapOf(
                        "module" to uiState.value.activeModule.label,
                        "action_id" to action.id
                    )
                )
                Toast.makeText(this, "Running: ${action.label}", Toast.LENGTH_SHORT).show()
                submitPrompt(prompt, uiState.value.activeModule, fallbackDeeplink = fallbackDeeplinkFor(uiState.value.activeModule))
            }

            AgentActionType.CONFIRM -> {
                recordInteraction(
                    eventType = InteractionEventType.TASK_CONFIRM,
                    payload = mapOf(
                        "module" to uiState.value.activeModule.label,
                        "action_id" to action.id
                    )
                )
                Toast.makeText(this, "Action confirmed", Toast.LENGTH_SHORT).show()
            }

            AgentActionType.CANCEL -> {
                recordInteraction(
                    eventType = InteractionEventType.TASK_CANCEL,
                    payload = mapOf(
                        "module" to uiState.value.activeModule.label,
                        "action_id" to action.id
                    )
                )
                Toast.makeText(this, "CanceledActions", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun openDeepLink(deeplink: String) {
        val target = deeplink
            .trim()
            .trim('"', '\'')
            .trimEnd('.', ',', ';')
            .replace("&amp;", "&")
        if (target.isBlank()) return
        Log.i(TAG, "openDeepLink target=$target")
        if (target.startsWith("lumi://", ignoreCase = true)) {
            Toast.makeText(this, "Opening in Lumi", Toast.LENGTH_SHORT).show()
            handleDeepLink(Intent(Intent.ACTION_VIEW, Uri.parse(target)))
            return
        }

        val normalized = normalizeExternalUrl(target)
        val uri = runCatching { Uri.parse(normalized) }.getOrNull()
        if (uri == null || uri.scheme.isNullOrBlank()) {
            Toast.makeText(this, "Invalid link: $target", Toast.LENGTH_SHORT).show()
            return
        }

        fun launch(intent: Intent): Boolean = runCatching {
            startActivity(intent)
            true
        }.getOrElse { error ->
            Log.w(TAG, "openDeepLink launch failed for ${intent.data}: ${error.message}")
            false
        }

        val directIntent = Intent(Intent.ACTION_VIEW, uri).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
        }
        if (launch(directIntent)) {
            Log.i(TAG, "openDeepLink outcome=direct")
            Toast.makeText(this, "Opened link", Toast.LENGTH_SHORT).show()
            return
        }

        val chooserIntent = Intent.createChooser(
            Intent(Intent.ACTION_VIEW, uri).apply {
                addCategory(Intent.CATEGORY_BROWSABLE)
            },
            "Open link with"
        )
        if (launch(chooserIntent)) {
            Log.i(TAG, "openDeepLink outcome=chooser")
            Toast.makeText(this, "Choose an app to open the link", Toast.LENGTH_SHORT).show()
            return
        }

        if (uri.scheme?.lowercase(Locale.getDefault()) != "https") {
            val httpsUri = runCatching { Uri.parse("https://${uri.toString().removePrefix("${uri.scheme}://")}") }.getOrNull()
            if (httpsUri != null) {
                val fallbackIntent = Intent(Intent.ACTION_VIEW, httpsUri).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                }
                if (launch(fallbackIntent)) {
                    Log.i(TAG, "openDeepLink outcome=https_fallback")
                    Toast.makeText(this, "Opened via https fallback", Toast.LENGTH_SHORT).show()
                    return
                }
            }
        }

        val clipboard = getSystemService(ClipboardManager::class.java)
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText("Lumi Link", normalized))
            Log.i(TAG, "openDeepLink outcome=clipboard")
            Toast.makeText(this, "No app handled this link. Copied to clipboard.", Toast.LENGTH_LONG).show()
            return
        }

        Log.i(TAG, "openDeepLink outcome=failed")
        Toast.makeText(this, "Unable to open link: $normalized", Toast.LENGTH_SHORT).show()
    }

    private fun normalizeExternalUrl(raw: String): String {
        val candidate = raw.trim()
        if (candidate.isBlank()) return candidate
        if (candidate.startsWith("http://", ignoreCase = true) || candidate.startsWith("https://", ignoreCase = true)) {
            return candidate
        }
        return if (candidate.contains("://")) {
            candidate
        } else {
            "https://$candidate"
        }
    }

    private fun handleDeepLink(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != "lumi") return
        val fullRoute = data.toString().lowercase(Locale.getDefault())
        when {
            fullRoute.startsWith("lumi://chat") -> {
                switchModule(AppModule.CHAT, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt("Open Chat", AppModule.CHAT, fallbackDeeplink = "lumi://chat")
            }

            fullRoute.startsWith("lumi://lix/intent/") -> {
                val intentId = data.lastPathSegment ?: "latest"
                switchModule(AppModule.LIX, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt("Open External Fulfillment intent details $intentId", AppModule.LIX, fallbackDeeplink = "lumi://lix/intent/$intentId")
            }

            fullRoute.startsWith("lumi://agent-market") -> {
                switchModule(AppModule.AGENT, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt("Open External Capabilities", AppModule.AGENT, fallbackDeeplink = "lumi://agent-market")
            }

            fullRoute.startsWith("lumi://avatar") -> {
                switchModule(AppModule.AVATAR, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt("Open Preferences & Permissions", AppModule.AVATAR, networkPolicy = NetworkPolicy.LOCAL_ONLY, fallbackDeeplink = "lumi://avatar")
            }

            fullRoute.startsWith("lumi://destiny") -> {
                switchModule(AppModule.DESTINY, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt("Open Recommendations & Risk", AppModule.DESTINY, fallbackDeeplink = "lumi://destiny")
            }

            fullRoute.startsWith("lumi://settings") -> {
                switchModule(AppModule.SETTINGS, autoQuery = false)
                switchSurface(AppSurface.WORK)
                submitPrompt(
                    rawInput = "Refresh system settings and API health status",
                    module = AppModule.SETTINGS,
                    fallbackDeeplink = "lumi://settings"
                )
            }
        }
    }

    private fun decisionSourceFor(module: AppModule): String {
        return if (module == AppModule.DESTINY) "dtoe" else "baseline"
    }

    private fun currentResponse(state: UiState): AgentResponse? {
        if (state.responseHistory.isEmpty()) return state.snapshot
        val index = state.selectedResponseIndex.coerceIn(0, state.responseHistory.lastIndex)
        return state.responseHistory[index]
    }

    private fun extractProductShellSummary(payload: ModulePayload?): ProductShellSummaryPayload? {
        return when (payload) {
            is ModulePayload.HomePayload -> payload.productShellSummary
            is ModulePayload.ChatPayload -> payload.productShellSummary
            is ModulePayload.AvatarPayload -> payload.productShellSummary
            is ModulePayload.SettingsPayload -> payload.productShellSummary
            else -> null
        }
    }

    private fun demoActivationFrom(current: EnvironmentActivationPayload?): EnvironmentActivationPayload? {
        if (current == null) return null
        return current.copy(
            environmentLabel = if (current.simulatorBacking) "Demo workspace (simulator-backed)" else "Demo workspace",
            workspaceMode = "demo",
            pilotActivationStatus = com.lumi.coredomain.contract.PilotActivationStatus.DEMO_READY,
            workspaceBindingKind = com.lumi.coredomain.contract.WorkspaceBindingKind.DEMO_WORKSPACE,
            missingDependencyCodes = emptyList(),
            missingDependencySummaries = emptyList(),
            actorAvailability = current.actorAvailability.map { actor ->
                actor.copy(
                    state = DependencyReadinessState.DEMO_ONLY,
                    actorId = "demo:${actor.role.name.lowercase()}",
                    actorLabel = "Demo ${actor.role.name.lowercase().replace('_', ' ')}",
                    missingDependencyCode = null,
                    summary = "Demo ${actor.role.name.lowercase().replace('_', ' ')} is available for walkthroughs only.",
                    isDemoData = true,
                    isPilotEvidence = false
                )
            },
            identityReadiness = current.identityReadiness?.copy(
                state = DependencyReadinessState.DEMO_ONLY,
                summary = "Demo workspace uses seeded identity readiness.",
                issues = emptyList(),
                isDemoData = true,
                isPilotEvidence = false
            ),
            connectorReadiness = current.connectorReadiness?.copy(
                state = DependencyReadinessState.DEMO_ONLY,
                summary = "Demo workspace uses seeded connector readiness.",
                issues = emptyList(),
                isDemoData = true,
                isPilotEvidence = false
            ),
            vaultReadiness = current.vaultReadiness?.copy(
                state = DependencyReadinessState.DEMO_ONLY,
                summary = "Demo workspace uses seeded vault readiness.",
                issues = emptyList(),
                isDemoData = true,
                isPilotEvidence = false
            ),
            isDemoData = true,
            isPilotEvidence = false
        )
    }

    private fun buildLocalRoleLabActors(selectedActorId: String): List<LocalRoleLabActorPayload> {
        val resolved = if (selectedActorId.isBlank()) "local_tenant_admin_01" else selectedActorId
        return listOf(
            LocalRoleLabActorPayload(
                actorId = "local_requester_01",
                role = com.lumi.coredomain.contract.ActorRole.REQUESTER,
                actorLabel = "Local Requester",
                sessionId = "lab_sess_requester_01",
                summary = "Requester rehearsal view",
                isActive = resolved == "local_requester_01"
            ),
            LocalRoleLabActorPayload(
                actorId = "local_operator_01",
                role = com.lumi.coredomain.contract.ActorRole.OPERATOR,
                actorLabel = "Local Operator",
                sessionId = "lab_sess_operator_01",
                summary = "Operator rehearsal view",
                isActive = resolved == "local_operator_01"
            ),
            LocalRoleLabActorPayload(
                actorId = "local_tenant_admin_01",
                role = com.lumi.coredomain.contract.ActorRole.TENANT_ADMIN,
                actorLabel = "Local Tenant Admin",
                sessionId = "lab_sess_tenant_admin_01",
                summary = "Tenant-admin rehearsal view",
                isActive = resolved != "local_requester_01" && resolved != "local_operator_01"
            )
        )
    }

    private fun buildLocalRoleLabSummary(selectedActorId: String): LocalRoleLabSummaryPayload {
        val actors = buildLocalRoleLabActors(selectedActorId)
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

    private fun buildLocalRoleLabRequesterInboxItems(selectedActorId: String): List<RequesterInboxItemPayload> {
        val nowMs = System.currentTimeMillis()
        val activeActor = buildLocalRoleLabSummary(selectedActorId).actors.firstOrNull { it.isActive }
            ?: buildLocalRoleLabSummary(selectedActorId).actors.last()
        val common = mapOf(
            "workspaceBindingKind" to WorkspaceBindingKind.LOCAL_ROLE_LAB_WORKSPACE,
            "environmentKind" to EnvironmentKind.SIMULATOR
        )
        return when (activeActor.role) {
            com.lumi.coredomain.contract.ActorRole.REQUESTER -> listOf(
                RequesterInboxItemPayload(
                    taskId = "lab_task_requester_prep",
                    traceId = "lab_trace_requester_prep",
                    title = "Prepare advisor pre-meeting brief",
                    status = ResponseStatus.PROCESSING,
                    group = com.lumi.coredomain.contract.RequesterInboxGroup.IN_PROGRESS,
                    summary = "Requester submitted the brief and is waiting for operator consolidation.",
                    receiptSummary = "Requester progress only (local role lab)",
                    actorRole = activeActor.role,
                    actorLabel = activeActor.actorLabel,
                    updatedAtMs = nowMs - 12 * 60 * 1000,
                    workspaceBindingKind = common["workspaceBindingKind"] as WorkspaceBindingKind,
                    environmentKind = common["environmentKind"] as EnvironmentKind
                ),
                RequesterInboxItemPayload(
                    taskId = "lab_task_requester_waiting",
                    traceId = "lab_trace_requester_waiting",
                    title = "Send compliance handoff package",
                    status = ResponseStatus.WAITING_USER,
                    group = com.lumi.coredomain.contract.RequesterInboxGroup.WAITING,
                    summary = "Requester is waiting for tenant-admin acknowledgement before handoff continues.",
                    blockerSummary = "Tenant-admin acknowledgement missing in local role lab rehearsal.",
                    receiptSummary = "Approval gate waiting (local role lab)",
                    actorRole = activeActor.role,
                    actorLabel = activeActor.actorLabel,
                    updatedAtMs = nowMs - 4 * 60 * 1000,
                    workspaceBindingKind = common["workspaceBindingKind"] as WorkspaceBindingKind,
                    environmentKind = common["environmentKind"] as EnvironmentKind
                )
            )
            com.lumi.coredomain.contract.ActorRole.OPERATOR -> listOf(
                RequesterInboxItemPayload(
                    taskId = "lab_task_operator_triage",
                    traceId = "lab_trace_operator_triage",
                    title = "Review CRM-ready draft before compliance handoff",
                    status = ResponseStatus.PROCESSING,
                    group = com.lumi.coredomain.contract.RequesterInboxGroup.IN_PROGRESS,
                    summary = "Operator is validating evidence completeness and drafting the receipt.",
                    receiptSummary = "Operator review in progress",
                    actorRole = activeActor.role,
                    actorLabel = activeActor.actorLabel,
                    updatedAtMs = nowMs - 8 * 60 * 1000,
                    workspaceBindingKind = common["workspaceBindingKind"] as WorkspaceBindingKind,
                    environmentKind = common["environmentKind"] as EnvironmentKind
                ),
                RequesterInboxItemPayload(
                    taskId = "lab_task_operator_waiting",
                    traceId = "lab_trace_operator_waiting",
                    title = "Route compliance handoff after admin check",
                    status = ResponseStatus.WAITING_USER,
                    group = com.lumi.coredomain.contract.RequesterInboxGroup.WAITING,
                    summary = "Operator is blocked on tenant-admin readiness confirmation.",
                    blockerSummary = "Tenant-admin confirmation required before connector handoff.",
                    receiptSummary = "Waiting on admin confirmation (local role lab)",
                    actorRole = activeActor.role,
                    actorLabel = activeActor.actorLabel,
                    updatedAtMs = nowMs - 3 * 60 * 1000,
                    workspaceBindingKind = common["workspaceBindingKind"] as WorkspaceBindingKind,
                    environmentKind = common["environmentKind"] as EnvironmentKind
                )
            )
            else -> listOf(
                RequesterInboxItemPayload(
                    taskId = "lab_task_admin_activation",
                    traceId = "lab_trace_admin_activation",
                    title = "Review activation blockers for advisor workflow rehearsal",
                    status = ResponseStatus.ERROR,
                    group = com.lumi.coredomain.contract.RequesterInboxGroup.BLOCKED,
                    summary = "Tenant admin sees the local role lab blocked from real pilot evidence by design.",
                    blockerSummary = "Local role lab is rehearsal-only and cannot satisfy real pilot activation.",
                    receiptSummary = "Non-pilot rehearsal surface",
                    actorRole = activeActor.role,
                    actorLabel = activeActor.actorLabel,
                    updatedAtMs = nowMs - 6 * 60 * 1000,
                    workspaceBindingKind = common["workspaceBindingKind"] as WorkspaceBindingKind,
                    environmentKind = common["environmentKind"] as EnvironmentKind
                ),
                RequesterInboxItemPayload(
                    taskId = "lab_task_admin_complete",
                    traceId = "lab_trace_admin_complete",
                    title = "Acknowledge local multi-actor rehearsal checklist",
                    status = ResponseStatus.COMMITTED,
                    group = com.lumi.coredomain.contract.RequesterInboxGroup.COMPLETED,
                    summary = "Tenant admin completed the local rehearsal acknowledgment step.",
                    receiptSummary = "Checklist acknowledged (local role lab)",
                    actorRole = activeActor.role,
                    actorLabel = activeActor.actorLabel,
                    updatedAtMs = nowMs - 25 * 60 * 1000,
                    workspaceBindingKind = common["workspaceBindingKind"] as WorkspaceBindingKind,
                    environmentKind = common["environmentKind"] as EnvironmentKind
                )
            )
        }
    }

    private fun localRoleLabActivationFrom(
        current: EnvironmentActivationPayload?,
        selectedActorId: String
    ): EnvironmentActivationPayload? {
        if (current == null) return null
        val labSummary = buildLocalRoleLabSummary(selectedActorId)
        return current.copy(
            environmentLabel = if (current.simulatorBacking) "Local role lab (simulator-backed)" else "Local role lab",
            workspaceMode = "local_lab",
            pilotActivationStatus = com.lumi.coredomain.contract.PilotActivationStatus.NOT_APPLICABLE,
            workspaceBindingKind = WorkspaceBindingKind.LOCAL_ROLE_LAB_WORKSPACE,
            missingDependencyCodes = emptyList(),
            missingDependencySummaries = listOf(
                "This is a local multi-actor lab.",
                "Local role lab never counts as real pilot activation or live pilot evidence.",
                labSummary.dayZeroBlockedSummary
            ),
            actorAvailability = labSummary.actors.map { actor ->
                ActorAvailabilityPayload(
                    role = actor.role,
                    state = DependencyReadinessState.READY,
                    provisioningState = com.lumi.coredomain.contract.PilotProvisioningState.PROVISIONED,
                    accessState = com.lumi.coredomain.contract.PilotAccessGrantState.GRANTED,
                    actorId = actor.actorId,
                    actorLabel = actor.actorLabel,
                    summary = actor.summary,
                    isDemoData = false,
                    isPilotEvidence = false
                )
            },
            activationReady = false,
            activationReadySummary = "Local role lab is active for ${labSummary.actors.firstOrNull { it.isActive }?.actorLabel ?: "Local Tenant Admin"} and is rehearsal-only.",
            isDemoData = false,
            isPilotEvidence = false
        )
    }

    private fun localRoleLabProductShellFrom(
        current: ProductShellSummaryPayload?,
        selectedActorId: String
    ): ProductShellSummaryPayload? {
        if (current == null) return null
        val labSummary = buildLocalRoleLabSummary(selectedActorId)
        val labActivation = localRoleLabActivationFrom(current.environmentActivation, selectedActorId)
        return current.copy(
            environmentActivation = labActivation,
            requesterInboxItems = buildLocalRoleLabRequesterInboxItems(selectedActorId),
            localRoleLab = labSummary,
            tenantAdminActivation = current.tenantAdminActivation?.copy(
                status = DependencyReadinessState.DEMO_ONLY,
                title = "Local Role Lab Setup",
                summary = "Local role lab is ready for multi-actor rehearsal and is explicitly non-pilot.",
                detailLines = listOf(
                    "Active actor: ${labSummary.actors.firstOrNull { it.isActive }?.actorLabel}",
                    labSummary.summary,
                    labSummary.dayZeroBlockedSummary
                ),
                missingDependencyCodes = emptyList(),
                actorAvailability = labActivation?.actorAvailability ?: current.tenantAdminActivation?.actorAvailability.orEmpty(),
                identityReadiness = labActivation?.identityReadiness ?: current.tenantAdminActivation?.identityReadiness,
                connectorReadiness = labActivation?.connectorReadiness ?: current.tenantAdminActivation?.connectorReadiness,
                vaultReadiness = labActivation?.vaultReadiness ?: current.tenantAdminActivation?.vaultReadiness,
                isDemoData = false,
                isPilotEvidence = false
            ),
            activationPackage = current.activationPackage?.copy(
                summary = "Local role lab is active for requester/operator/tenant-admin rehearsal only.",
                pendingRequirementCount = 1,
                rejectedIntakeCount = 0
            ),
            nextAction = "Switch actors to rehearse requester/operator/tenant-admin collaboration locally."
        )
    }

    private fun applyProductShellSummary(
        currentState: UiState,
        summary: ProductShellSummaryPayload?
    ): UiState {
        if (summary == null) return currentState
        return currentState.copy(productShellSummary = summary)
    }

    @Composable
    private fun LumiBackendScreen(
        state: UiState,
        onSwitchSurface: (AppSurface) -> Unit,
        onSwitchModule: (AppModule) -> Unit,
        onGoalBriefChanged: (GoalBriefInput) -> Unit,
        onSelectWorkspaceMode: (String) -> Unit,
        onSelectLocalLabActor: (String) -> Unit,
        onToggleGoalAdvanced: () -> Unit,
        onRunGoalPlan: () -> Unit,
        onSelectHistory: (Int) -> Unit,
        onSubmit: (AppModule, String, NetworkPolicy, String?) -> Unit,
        onOpenWorkItem: (AppModule, Int) -> Unit,
        onMarkGovernanceCaseReviewed: (String) -> Unit,
        onRetryGovernanceCaseSync: (String) -> Unit,
        onUpdateGovernanceCaseCollaboration: (String, GovernanceCollaborationCommand) -> Unit,
        onPerformGovernanceBulkAction: (GovernanceBulkActionRequest) -> Unit,
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
        onCopyGovernanceCaseSummary: (String) -> Unit,
        onOpenGovernanceCaseTrail: (String) -> Unit,
        onOsCommandChange: (String) -> Unit,
        onRunOsCommand: (String) -> Unit,
        onOpenDeeplink: (String) -> Unit,
        onOpenSettingsActivity: () -> Unit
    ) {
        val current = currentResponse(state)
        val shellSummary = when {
            state.selectedWorkspaceMode.equals("demo", ignoreCase = true) -> {
                state.productShellSummary?.copy(
                    environmentActivation = demoActivationFrom(state.productShellSummary?.environmentActivation)
                )
            }
            state.selectedWorkspaceMode.equals("local_lab", ignoreCase = true) -> {
                localRoleLabProductShellFrom(
                    state.productShellSummary,
                    state.selectedLocalLabActorId
                )
            }
            else -> state.productShellSummary
        }
        Scaffold(
            containerColor = Color.Transparent,
            bottomBar = {
                Column {
                    HorizontalDivider(
                        color = LumiColors.navBarBorder,
                        thickness = 0.5.dp
                    )
                    NavigationBar(
                        containerColor = LumiColors.navBarBg,
                        tonalElevation = 0.dp
                    ) {
                        AppSurface.entries.forEach { surface ->
                            val accent = when (surface) {
                                AppSurface.GOALS -> LumiColors.homeAccent
                                AppSurface.WORK -> LumiColors.chatAccent
                                AppSurface.ACTIVITY -> LumiColors.agentAccent
                            }
                            NavigationBarItem(
                                selected = state.activeSurface == surface,
                                onClick = { onSwitchSurface(surface) },
                                icon = {
                                    Icon(
                                        imageVector = surfaceIcon(surface),
                                        contentDescription = surface.label,
                                        tint = if (state.activeSurface == surface) accent else LumiColors.textMuted
                                    )
                                },
                                label = {
                                    Text(
                                        surface.label,
                                        fontSize = 10.sp,
                                        color = if (state.activeSurface == surface) accent else LumiColors.textMuted
                                    )
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    indicatorColor = accent.copy(alpha = 0.15f)
                                )
                            )
                        }
                    }
                }
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(Color(0xFF071326), Color(0xFF0A1E3B), Color(0xFF091833))
                        )
                    )
                    .padding(padding)
                    .imePadding()
            ) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    contentPadding = PaddingValues(bottom = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        HeaderCard(
                            subtitle = state.subtitle,
                            developerMode = state.developerModeEnabled
                        )
                    }
                    item {
                        EnvironmentTruthBannerCard(
                            activation = shellSummary?.environmentActivation,
                            workspaceOptions = shellSummary?.environmentActivation?.workspaceOptions.orEmpty(),
                            selectedWorkspaceMode = state.selectedWorkspaceMode,
                            onSelectWorkspaceMode = onSelectWorkspaceMode,
                            localRoleLab = shellSummary?.localRoleLab,
                            selectedLocalLabActorId = state.selectedLocalLabActorId,
                            onSelectLocalLabActor = onSelectLocalLabActor
                        )
                    }
                    if (state.selectedWorkspaceMode.equals("local_lab", ignoreCase = true)) {
                        item {
                            LocalRoleLabOverviewCard(
                                summary = shellSummary?.localRoleLab
                            )
                        }
                    }
                    item {
                        AgentOsControlCenterCard(
                            activeSurface = state.activeSurface,
                            activeModule = state.activeModule,
                            loading = state.loading,
                            response = current,
                            summary = state.summary,
                            commandDraft = state.osCommandDraft,
                            onCommandChange = onOsCommandChange,
                            onRunCommand = onRunOsCommand
                        )
                    }
                    when (state.activeSurface) {
                        AppSurface.GOALS -> {
                            item {
                                SurfaceSectionBanner(
                                    step = "Step 1",
                                    title = "Define Goal",
                                    subtitle = "Describe outcome and constraints in one place so Agent OS can route correctly.",
                                    accent = Color(0xFF5FC9FF)
                                )
                            }
                            item {
                                GoalHubScreenContent(
                                    brief = state.goalBrief,
                                    loading = state.loading,
                                    showAdvanced = state.goalAdvancedVisible,
                                    onBriefChange = onGoalBriefChanged,
                                    onToggleAdvanced = onToggleGoalAdvanced,
                                    onRunPlan = onRunGoalPlan
                                )
                            }
                            item {
                                SurfaceSectionBanner(
                                    step = "Step 2",
                                    title = "Execution Handoff",
                                    subtitle = "After planning, switch to Work for real-time collaboration and execution.",
                                    accent = Color(0xFF5FC9FF)
                                )
                            }
                            item { ModuleHeroCard(module = AppModule.CHAT, summary = state.summary) }
                        }

                        AppSurface.WORK -> {
                            val moduleAccent = LumiGradients.moduleAccentColor(state.activeModule)
                            item {
                                SurfaceSectionBanner(
                                    step = "Step 1",
                                    title = "Task Workspace",
                                    subtitle = "Start execution directly. Capability lanes are surfaced contextually inside this flow.",
                                    accent = moduleAccent
                                )
                            }
                            item {
                                RequesterInboxCard(
                                    productShell = shellSummary,
                                    selectedWorkspaceMode = state.selectedWorkspaceMode,
                                    onSubmitNewTask = { onSwitchSurface(AppSurface.GOALS) },
                                    onOpenItem = {
                                        onSwitchSurface(AppSurface.WORK)
                                    }
                                )
                            }
                            item {
                                ContextualCapabilityLanesCard(
                                    activeModule = state.activeModule,
                                    response = current,
                                    onOpenLane = { lane ->
                                        onSwitchModule(lane)
                                        if (lane != state.activeModule || current == null) {
                                            val prompt = when (lane) {
                                                AppModule.LIX -> "Open External Fulfillment and compare options by price, ETA, risk, proof, and rollback terms."
                                                AppModule.AGENT -> "Open External Capabilities and rank executable third-party options."
                                                AppModule.AVATAR -> "Open Preferences & Permissions and show approval rules plus data-sharing scope."
                                                AppModule.DESTINY -> "Open Recommendations & Risk and provide next-best actions with alternatives."
                                                else -> "Continue this task with contextual execution focus."
                                            }
                                            onSubmit(
                                                lane,
                                                prompt,
                                                networkPolicyFor(lane),
                                                fallbackDeeplinkFor(lane)
                                            )
                                        }
                                    }
                                )
                            }
                            item { ModuleHeroCard(module = state.activeModule, summary = state.summary) }
                            if (state.activeModule == AppModule.AVATAR) {
                                item {
                                    PolicyStudioSummaryCard(
                                        summary = shellSummary?.policyStudioSummary
                                    )
                                }
                            }
                            if (state.activeModule == AppModule.SETTINGS) {
                                item {
                                    TenantAdminActivationCard(
                                        summary = shellSummary?.tenantAdminActivation,
                                        productShell = shellSummary
                                    )
                                }
                            }
                            if (state.activeModule != AppModule.SETTINGS) {
                                item {
                                    SurfaceSectionBanner(
                                        step = "Step 2",
                                        title = "User-Agent Interaction",
                                        subtitle = "Answer follow-up questions or provide missing details to continue execution.",
                                        accent = moduleAccent
                                    )
                                }
                                item {
                                    UserInteractionHubCard(
                                        module = state.activeModule,
                                        response = current,
                                        latestUserRequest = state.latestSubmittedPrompts[state.activeModule].orEmpty(),
                                        loading = state.loading,
                                        onSubmitReply = { prompt, source ->
                                            val eventType = if (current?.status == ResponseStatus.WAITING_USER) {
                                                InteractionEventType.CLARIFICATION_ANSWERED
                                            } else {
                                                InteractionEventType.QUERY_REFINE
                                            }
                                            recordInteraction(
                                                eventType,
                                                mapOf(
                                                    "module" to state.activeModule.label,
                                                    "feedback_source" to source
                                                ),
                                                traceId = current?.traceId
                                            )
                                            onSubmit(
                                                state.activeModule,
                                                prompt,
                                                NetworkPolicy.CLOUD_PREFERRED,
                                                fallbackDeeplinkFor(state.activeModule)
                                            )
                                        }
                                    )
                                }
                            }
                            item {
                                SurfaceSectionBanner(
                                    step = "Step 3",
                                    title = "Execution Workspace",
                                    subtitle = "Run module actions, inspect evidence, and keep the flow executable.",
                                    accent = moduleAccent
                                )
                            }
                            item {
                                ModuleFeaturePanel(
                                    module = state.activeModule,
                                    response = current,
                                    snapshot = state.snapshot,
                                    summary = state.summary,
                                    dynamicState = state.dynamicState,
                                    trajectory = state.trajectory,
                                    latestUserRequest = state.latestSubmittedPrompts[state.activeModule],
                                    defaultBaseUrl = BuildConfig.LUMI_BASE_URL,
                                    loading = state.loading,
                                    timeline = state.executionTimeline,
                                    developerMode = state.developerModeEnabled,
                                    showGlobalSupplement = false,
                                    onRun = { prompt, policy ->
                                        onSubmit(
                                            state.activeModule,
                                            prompt,
                                            policy,
                                            fallbackDeeplinkFor(state.activeModule)
                                        )
                                    },
                                    onOpenAction = { action -> handleAction(action) },
                                    onOpenDeeplink = onOpenDeeplink,
                                    onSubmitOutcomeFeedback = { feedback ->
                                        submitOutcomeFeedback(
                                            module = state.activeModule,
                                            feedback = feedback,
                                            traceId = current?.traceId
                                        )
                                    },
                                    onTrackInteraction = { eventType, payload ->
                                        recordInteraction(eventType, payload, traceId = current?.traceId)
                                    },
                                    onSaveRolePolicyDraft = { role, draft, callback ->
                                        saveRolePolicy(role, draft, callback)
                                    },
                                    onResetRolePolicy = { role, callback ->
                                        resetRolePolicy(role, callback)
                                    }
                                )
                            }

                            if (state.loading) {
                                item { LoadingCard() }
                            }

                            current?.let { response ->
                                item {
                                    SurfaceSectionBanner(
                                        step = "Step 4",
                                        title = "Result Review",
                                        subtitle = "Review outputs, open actions, and verify before committing decisions.",
                                        accent = moduleAccent
                                    )
                                }
                                item {
                                    ResponseDetailCard(
                                        module = state.activeModule,
                                        response = response,
                                        developerMode = state.developerModeEnabled,
                                        onUseDraft = { draft ->
                                            uiState.value = uiState.value.copy(goalBrief = state.goalBrief.copy(goal = draft))
                                            Toast.makeText(this@MainActivity, "Draft copied to Goals", Toast.LENGTH_SHORT).show()
                                            recordInteraction(
                                                InteractionEventType.DRAFT_ACCEPT,
                                                mapOf("module" to state.activeModule.label, "char_count" to draft.length.toString())
                                            )
                                        },
                                        onOpenCard = { card ->
                                            card.deeplink?.let(onOpenDeeplink)
                                            recordInteraction(
                                                InteractionEventType.CARD_CLICK,
                                                mapOf("module" to state.activeModule.label, "card" to card.id)
                                            )
                                        },
                                        onOpenAction = { action -> handleAction(action) },
                                        onOpenDeepLink = onOpenDeeplink
                                    )
                                }
                            }

                            item {
                                SurfaceSectionBanner(
                                    step = "Step 5",
                                    title = "Run History",
                                    subtitle = "Track prior runs, compare attempts, and export summaries for handoff.",
                                    accent = moduleAccent
                                )
                            }
                            item {
                                ResponseHistoryCard(
                                    module = state.activeModule,
                                    history = state.responseHistory,
                                    selectedIndex = state.selectedResponseIndex,
                                    developerMode = state.developerModeEnabled,
                                    onSelect = onSelectHistory,
                                    onClearHistory = { clearModuleHistory(state.activeModule) },
                                    onExportSummary = { exportModuleSummary(state.activeModule) }
                                )
                            }

                            if (state.activeModule == AppModule.HOME) {
                                item {
                                    HomeOverviewCard(
                                        summary = state.summary,
                                        payload = (current?.payload as? ModulePayload.HomePayload)
                                            ?: (state.snapshot?.payload as? ModulePayload.HomePayload)
                                    )
                                }
                            } else if (state.activeModule == AppModule.AVATAR) {
                                item {
                                    AvatarReadableCard(
                                        summary = state.summary,
                                        payload = (current?.payload as? ModulePayload.AvatarPayload)
                                            ?: (state.snapshot?.payload as? ModulePayload.AvatarPayload)
                                    )
                                }
                            } else if (state.developerModeEnabled) {
                                state.snapshot?.let { snapshot ->
                                    item { SnapshotCard(snapshot) }
                                }
                            }
                        }

                        AppSurface.ACTIVITY -> {
                            item {
                                SurfaceSectionBanner(
                                    step = "Audit",
                                    title = "Execution Activity",
                                    subtitle = "Review cross-module runs, waiting-user tasks, and final outcomes.",
                                    accent = Color(0xFF7FD2FF)
                                )
                            }
                            item {
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF10223F)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(10.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            text = "Internal operator shell",
                                            color = Color(0xFFEAF4FF),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            text = "Operator Console remains available here for internal governance and triage. It is not the whole enterprise product shell.",
                                            color = Color(0xFF9BC8E8),
                                            fontSize = 10.sp
                                        )
                                        shellSummary?.environmentActivation?.let { activation ->
                                            Text(
                                                text = "Activation ready: ${if (activation.activationReady) "yes" else "no"}",
                                                color = Color(0xFFBFE4FF),
                                                fontSize = 10.sp
                                            )
                                            Text(
                                                text = shellSummary.nextAction.ifBlank { activation.activationReadySummary },
                                                color = Color(0xFF88B3D5),
                                                fontSize = 9.sp
                                            )
                                        }
                                    }
                                }
                            }
                            item {
                                ActivityScreenContent(
                                    historyByModule = AppModule.entries.associateWith { module ->
                                        moduleHistoryStore[module].orEmpty()
                                    },
                                    governanceSummary = state.governanceSummary,
                                    governanceConsole = state.governanceConsole,
                                    developerMode = state.developerModeEnabled,
                                    onOpenWorkItem = onOpenWorkItem,
                                    onExportModule = { module -> exportModuleSummary(module) },
                                    onClearModuleHistory = { module -> clearModuleHistory(module) },
                                    onMarkGovernanceCaseReviewed = onMarkGovernanceCaseReviewed,
                                    onRetryGovernanceCaseSync = onRetryGovernanceCaseSync,
                                    onUpdateGovernanceCaseCollaboration = onUpdateGovernanceCaseCollaboration,
                                    onPerformGovernanceBulkAction = onPerformGovernanceBulkAction,
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
                                    onCopyGovernanceCaseSummary = onCopyGovernanceCaseSummary,
                                    onOpenGovernanceCaseTrail = onOpenGovernanceCaseTrail
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    @Composable
    private fun SurfaceSectionBanner(
        step: String,
        title: String,
        subtitle: String,
        accent: Color
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = accent.copy(alpha = 0.12f)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Text(
                    text = step.uppercase(Locale.getDefault()),
                    color = accent.copy(alpha = 0.95f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = title,
                    color = Color(0xFFE4F2FF),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = subtitle,
                    color = Color(0xFFB8D7EE),
                    fontSize = 10.sp
                )
            }
        }
    }

    @OptIn(ExperimentalLayoutApi::class)
    @Composable
    private fun ContextualCapabilityLanesCard(
        activeModule: AppModule,
        response: AgentResponse?,
        onOpenLane: (AppModule) -> Unit
    ) {
        val status = response?.status
        val hasSkillGap = response?.skillGapReport != null
        val externalRecommended = hasSkillGap ||
            status == ResponseStatus.PARTIAL ||
            status == ResponseStatus.ERROR
        val recommendationsRecommended = status == ResponseStatus.WAITING_USER ||
            status == ResponseStatus.PARTIAL
        val lanes = buildList {
            add(
                CapabilityLane(
                    module = AppModule.CHAT,
                    reason = "Primary execution lane for planning, evidence, and next actions."
                )
            )
            if (externalRecommended || activeModule == AppModule.LIX) {
                add(
                    CapabilityLane(
                        module = AppModule.LIX,
                        reason = "Use when internal execution is insufficient or clearly worse than external options."
                    )
                )
            }
            if (externalRecommended || activeModule == AppModule.AGENT) {
                add(
                    CapabilityLane(
                        module = AppModule.AGENT,
                        reason = "Use when third-party capabilities can execute faster, safer, or cheaper."
                    )
                )
            }
            if (activeModule == AppModule.AVATAR || activeModule == AppModule.CHAT) {
                add(
                    CapabilityLane(
                        module = AppModule.AVATAR,
                        reason = "Adjust stable preferences, approval rules, and data-sharing scope."
                    )
                )
            }
            if (recommendationsRecommended || activeModule == AppModule.DESTINY) {
                add(
                    CapabilityLane(
                        module = AppModule.DESTINY,
                        reason = "Review next-best action, alternatives, and risk boundaries."
                    )
                )
            }
        }
        Surface(
            color = Color(0x1A8ACBFF),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Contextual Capability Lanes",
                    color = Color(0xFFD6EEFF),
                    fontSize = 12.sp
                )
                Text(
                    text = "You do not need to choose a workspace first. Open a lane only if it helps this current task.",
                    color = Color(0xFFAED0EA),
                    fontSize = 10.sp
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    lanes.distinctBy { it.module }.forEach { lane ->
                        val selected = activeModule == lane.module
                        val accent = LumiGradients.moduleAccentColor(lane.module)
                        Text(
                            text = lane.module.label,
                            color = if (selected) Color(0xFF061425) else Color(0xFFC4DEEF),
                            fontSize = 11.sp,
                            modifier = Modifier
                                .background(
                                    color = if (selected) accent else Color(0x1A9EC8E8),
                                    shape = RoundedCornerShape(999.dp)
                                )
                                .clickable { onOpenLane(lane.module) }
                                .padding(horizontal = 12.dp, vertical = 7.dp)
                        )
                    }
                }
                lanes.firstOrNull { it.module == activeModule }?.let { lane ->
                    Text(
                        text = lane.reason,
                        color = Color(0xFF9FC5DF),
                        fontSize = 10.sp
                    )
                }
            }
        }
    }

    private data class CapabilityLane(
        val module: AppModule,
        val reason: String
    )

    @OptIn(ExperimentalLayoutApi::class)
    @Composable
    private fun AgentOsControlCenterCard(
        activeSurface: AppSurface,
        activeModule: AppModule,
        loading: Boolean,
        response: AgentResponse?,
        summary: DigitalSoulSummary?,
        commandDraft: String,
        onCommandChange: (String) -> Unit,
        onRunCommand: (String) -> Unit
    ) {
        val runStatus = if (loading) {
            "Running"
        } else {
            response?.status?.name?.lowercase()?.replace('_', ' ') ?: "idle"
        }
        val owner = response?.ownerAgent?.name?.lowercase()?.replace('_', '-') ?: "codex-team-leader"
        val trace = response?.traceId?.take(12) ?: "none"
        val contextState = when {
            summary == null -> "Preferences: loading"
            summary.topTraits.isEmpty() -> "Preferences: ready"
            else -> "Preferences: ${summary.profileLabel}"
        }
        val systemNodes = listOf(
            "Cloud Reasoner" to if (loading || response != null) Color(0xFF63D4FF) else Color(0xFF31526F),
            "OpenClaw Exec" to if (response?.summary.orEmpty().contains("openclaw", ignoreCase = true)) Color(0xFF63D4FF) else Color(0xFF31526F),
            "External Fulfillment" to if (activeModule == AppModule.LIX) Color(0xFF63D4FF) else Color(0xFF31526F),
            "Preferences & Permissions" to if (summary != null) Color(0xFF63D4FF) else Color(0xFF31526F)
        )

        Surface(
            color = Color(0x1A63B5FF),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = "Agent OS Control Center",
                            color = Color(0xFFE8F4FF),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Surface: ${activeSurface.label} · Module: ${activeModule.label}",
                            color = Color(0xFFADD1EA),
                            fontSize = 10.sp
                        )
                    }
                    Text(
                        text = runStatus,
                        color = if (loading) Color(0xFF8CE4FF) else Color(0xFFC7E7FF),
                        fontSize = 10.sp,
                        modifier = Modifier
                            .background(Color(0x223EA6E0), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                Text(
                    text = "Owner: $owner · Trace: $trace · $contextState",
                    color = Color(0xFF9BC5E2),
                    fontSize = 10.sp
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    systemNodes.forEach { (label, color) ->
                        Text(
                            text = label,
                            color = Color(0xFFE5F4FF),
                            fontSize = 10.sp,
                            modifier = Modifier
                                .background(color.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
                                .padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }
                OutlinedTextField(
                    value = commandDraft,
                    onValueChange = onCommandChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("OS command (e.g. /diag, /lix compare options under £800)", fontSize = 11.sp) }
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    TextButton(onClick = { onRunCommand("/diag") }) {
                        Text("System Check", fontSize = 11.sp)
                    }
                    TextButton(onClick = { onRunCommand("/lix find executable supplier path for current goal") }) {
                        Text("Fulfillment", fontSize = 11.sp)
                    }
                    TextButton(onClick = { onRunCommand("/avatar refresh twin and fit report") }) {
                        Text("Preferences", fontSize = 11.sp)
                    }
                    TextButton(onClick = { onRunCommand(commandDraft) }) {
                        Text("Run", fontSize = 11.sp)
                    }
                }
            }
        }
    }

    private fun recordInteraction(
        eventType: InteractionEventType,
        payload: Map<String, String> = emptyMap(),
        traceId: String? = null
    ) {
        backendClient.recordInteraction(
            InteractionEvent(
                sessionId = sessionId,
                userId = "local-user",
                eventType = eventType,
                traceId = traceId,
                payload = payload,
                timestampMs = System.currentTimeMillis()
            )
        )
    }

    private fun submitOutcomeFeedback(
        module: AppModule,
        feedback: String,
        traceId: String?
    ) {
        val normalized = feedback.trim().lowercase(Locale.getDefault())
        val patch = when (normalized) {
            "solved" -> StateConsensusPayload(
                energyLabel = "high",
                moodLabel = "positive",
                focusLabel = "focused",
                strategyLabel = "balanced"
            )
            "not_useful" -> StateConsensusPayload(
                energyLabel = "low",
                moodLabel = "negative",
                focusLabel = "scattered",
                strategyLabel = "conservative"
            )
            else -> StateConsensusPayload(
                energyLabel = "medium",
                moodLabel = "steady",
                focusLabel = "normal",
                strategyLabel = "balanced"
            )
        }
        recordInteraction(
            eventType = InteractionEventType.STATE_ADJUST,
            payload = mapOf(
                "module" to module.label,
                "feedback" to normalized,
                "source" to "explicit_feedback_panel"
            ),
            traceId = traceId
        )
        backendClient.updateStateConsensus(
            userId = "local-user",
            patch = patch
        ) { updated ->
            if (updated) {
                refreshDigitalSoulSummary()
                Toast.makeText(
                    this,
                    "Preferences updated from your feedback",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun synthesizeTwinSignal(
        input: String,
        module: AppModule,
        previous: DynamicHumanStatePayload?
    ): SynthesizedTwinSignal {
        val now = System.currentTimeMillis()
        val textLower = input.lowercase(Locale.getDefault())

        val urgencyHits = Regex("(urgent|asap|immediately|now|紧急|马上|立刻|尽快)", RegexOption.IGNORE_CASE)
            .findAll(input)
            .count()
        val planningHits = Regex("(plan|itinerary|schedule|step|安排|计划|步骤)", RegexOption.IGNORE_CASE)
            .findAll(input)
            .count()
        val constraintHits = Regex("(budget|deadline|acceptance|token|date|time|from|to|预算|时限|截止|验收|出发|到达|日期)", RegexOption.IGNORE_CASE)
            .findAll(input)
            .count()
        val positiveHits = Regex("(thanks|thank you|good|great|perfect|谢谢|好的|满意|太棒)", RegexOption.IGNORE_CASE)
            .findAll(input)
            .count()
        val negativeHits = Regex("(problem|issue|fail|error|broken|not work|不行|失败|报错|崩溃|麻烦)", RegexOption.IGNORE_CASE)
            .findAll(input)
            .count()
        val punctuationPressure = input.count { ch -> ch == '!' || ch == '?' || ch == '！' || ch == '？' }
        val charCount = input.length.coerceAtLeast(1)
        val numericDensity = input.count { ch -> ch.isDigit() }.toDouble() / charCount.toDouble()
        val pauseCount = input.count { ch -> ch == ' ' || ch == '\n' || ch == '，' || ch == ',' }.coerceAtLeast(1)
        val backspaceEstimate = ((charCount / 26) + (punctuationPressure / 2)).coerceAtLeast(0)

        val baseStress = previous?.l3?.stressScore ?: 34
        val stress = (
            baseStress * 0.68 +
                urgencyHits * 9.0 +
                punctuationPressure * 2.2 +
                negativeHits * 7.5 -
                positiveHits * 4.0 +
                if (charCount > 220) 8.0 else 0.0
            ).toInt().coerceIn(8, 96)

        val baseFocus = previous?.l3?.focusScore ?: 52
        val focus = (
            baseFocus * 0.62 +
                constraintHits * 8.5 +
                planningHits * 5.5 +
                numericDensity * 14.0 -
                urgencyHits * 2.5 -
                if (charCount < 18) 12.0 else 0.0 -
                if (charCount > 280) 10.0 else 0.0
            ).toInt().coerceIn(18, 96)

        val polarity = (
            (previous?.l3?.polarity ?: 0.0) * 0.70 +
                (positiveHits - negativeHits) * 0.14 -
                urgencyHits * 0.04
            ).coerceIn(-1.0, 1.0)

        val baseContextLoad = previous?.l2?.contextLoad ?: 0.45
        val complexityLoad = (charCount / 240.0).coerceIn(0.08, 1.0)
        val moduleLoadBoost = when (module) {
            AppModule.CHAT -> 0.06
            AppModule.LIX, AppModule.AGENT -> 0.10
            AppModule.AVATAR -> 0.04
            AppModule.DESTINY -> 0.08
            AppModule.HOME, AppModule.SETTINGS -> 0.03
        }
        val contextLoad = (
            baseContextLoad * 0.65 +
                complexityLoad * 0.25 +
                moduleLoadBoost
            ).coerceIn(0.08, 1.0)

        val energyLevel = (
            (previous?.l2?.energyLevel ?: 0.62) * 0.70 +
                (1.0 - stress / 100.0) * 0.30
            ).coerceIn(0.05, 1.0)

        val riskPreference = inferRiskPreference(textLower, previous?.l1?.riskPreference ?: 0.50)
        val valueAnchor = if (constraintHits >= 2) {
            "goal_driven"
        } else {
            previous?.l1?.valueAnchor ?: "balanced"
        }

        val synthesizedState = DynamicHumanStatePayload(
            l1 = L1CoreStatePayload(
                profileId = previous?.l1?.profileId ?: "edge-live",
                valueAnchor = valueAnchor,
                riskPreference = riskPreference
            ),
            l2 = L2ContextStatePayload(
                sourceApp = packageName,
                appCategory = module.label.lowercase(Locale.getDefault()),
                energyLevel = energyLevel,
                contextLoad = contextLoad
            ),
            l3 = L3EmotionStatePayload(
                stressScore = stress,
                polarity = polarity,
                focusScore = focus
            ),
            updatedAtMs = now
        )

        val windowMs = max(900L, (charCount * 48L).coerceAtMost(12_000L))
        val avgDelayMs = (220.0 - focus * 1.1 + stress * 0.5).coerceIn(35.0, 420.0)
        val burstKpm = ((charCount.toDouble() / windowMs.toDouble()) * 60_000.0).coerceIn(40.0, 420.0)
        val keystroke = KeystrokeDynamicsPayload(
            windowMs = windowMs,
            keyCount = charCount,
            backspaceCount = backspaceEstimate,
            avgInterKeyDelayMs = avgDelayMs,
            pauseCount = pauseCount,
            burstKpm = burstKpm,
            stressProxy = (stress / 100.0).coerceIn(0.0, 1.0)
        )

        return SynthesizedTwinSignal(
            state = synthesizedState,
            keystroke = keystroke
        )
    }

    private fun inferRiskPreference(
        textLower: String,
        previousValue: Double
    ): Double {
        val conservativeHits = listOf(
            "safe", "stable", "conservative", "low risk", "稳健", "保守", "低风险", "安全"
        ).count { textLower.contains(it) }
        val aggressiveHits = listOf(
            "aggressive", "high return", "high risk", "leverage", "激进", "高收益", "高风险", "杠杆"
        ).count { textLower.contains(it) }
        val target = (0.50 + (aggressiveHits - conservativeHits) * 0.08).coerceIn(0.05, 0.95)
        return (previousValue * 0.75 + target * 0.25).coerceIn(0.05, 0.95)
    }

    private fun clearModuleHistory(module: AppModule) {
        moduleHistoryStore.remove(module)
        moduleSelectedIndexStore.remove(module)
        moduleTimelineStore.remove(module)
        if (uiState.value.activeModule == module) {
            uiState.value = uiState.value.copy(
                responseHistory = emptyList(),
                selectedResponseIndex = 0,
                executionTimeline = emptyList()
            )
        }
        recordInteraction(
            InteractionEventType.QUERY_REFINE,
            mapOf("action" to "clear_history", "module" to module.label)
        )
        Toast.makeText(this, "Cleared ${module.label} history", Toast.LENGTH_SHORT).show()
    }

    private fun exportModuleSummary(module: AppModule) {
        val history = moduleHistoryStore[module].orEmpty()
        if (history.isEmpty()) {
            Toast.makeText(this, "${module.label} has no exportable content", Toast.LENGTH_SHORT).show()
            return
        }

        val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        val responsePart = history.take(12).mapIndexed { index, response ->
            val summary = sanitizeForExport(response.summary.orEmpty()).ifBlank { "No summary" }
            val status = response.status.name.lowercase()
            val confidence = "%.2f".format(Locale.US, response.confidence)
            val trace = response.traceId.take(8)
            val roleTrace = RoleTraceFormatter.exportSnippet(response)
            val receiptTrace = ExecutionReceiptFormatter.exportSnippet(response)
            "${index + 1}. [$status] trace=$trace latency=${response.latencyMs}ms conf=$confidence $roleTrace $receiptTrace summary=$summary"
        }
        val timelinePart = moduleTimelineStore[module].orEmpty().take(8).mapIndexed { index, step ->
            val cost = step.latencyMs ?: step.finishedAtMs?.let { end -> (end - step.startedAtMs).coerceAtLeast(0L) }
            "${index + 1}. ${step.label} · ${step.status.name.lowercase()}${cost?.let { " · ${it}ms" } ?: ""}"
        }
        val content = buildString {
            appendLine("Lumi ${module.label} Module Summary")
            appendLine("Export time: $timestamp")
            appendLine()
            appendLine("Result records:")
            responsePart.forEach { appendLine(it) }
            if (timelinePart.isNotEmpty()) {
                appendLine()
                appendLine("Task timeline:")
                timelinePart.forEach { appendLine(it) }
            }
        }

        runCatching {
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, "Lumi ${module.label} Summary")
                putExtra(Intent.EXTRA_TEXT, content)
            }
            startActivity(Intent.createChooser(sendIntent, "Export Lumi Summary"))
        }.onSuccess {
            recordInteraction(
                eventType = InteractionEventType.QUERY_REFINE,
                payload = mapOf("action" to "export_summary", "module" to module.label, "count" to history.size.toString())
            )
        }.onFailure {
            Toast.makeText(this, "ExportFailed", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startTimelineStep(module: AppModule, input: String): String {
        val now = System.currentTimeMillis()
        val existing = moduleTimelineStore[module].orEmpty().map { step ->
            if (step.status == ModuleExecutionStatus.RUNNING) {
                step.copy(
                    status = ModuleExecutionStatus.CANCELLED,
                    finishedAtMs = now,
                    latencyMs = (now - step.startedAtMs).coerceAtLeast(0L)
                )
            } else {
                step
            }
        }
        val stepId = UUID.randomUUID().toString()
        val compactInput = sanitizeForExport(input).take(16)
        val label = if (compactInput.isBlank()) module.label else "${module.label}: $compactInput"
        val merged = buildList {
            add(
                ModuleExecutionStep(
                    id = stepId,
                    label = label,
                    status = ModuleExecutionStatus.RUNNING,
                    startedAtMs = now
                )
            )
            addAll(existing)
        }.take(20)
        moduleTimelineStore[module] = merged.toMutableList()
        if (uiState.value.activeModule == module) {
            uiState.value = uiState.value.copy(executionTimeline = merged)
        }
        return stepId
    }

    private fun finishTimelineStep(
        module: AppModule,
        stepId: String,
        response: AgentResponse
    ) {
        val now = System.currentTimeMillis()
        val current = moduleTimelineStore[module].orEmpty()
        val updated = current.map { step ->
            if (step.id != stepId) return@map step
            step.copy(
                status = response.toExecutionStatus(),
                finishedAtMs = now,
                latencyMs = response.latencyMs,
                traceId = response.traceId
            )
        }
        moduleTimelineStore[module] = updated.toMutableList()
        if (uiState.value.activeModule == module) {
            uiState.value = uiState.value.copy(executionTimeline = updated)
        }
    }

    private fun AgentResponse.toExecutionStatus(): ModuleExecutionStatus {
        return when (status) {
            ResponseStatus.ERROR -> ModuleExecutionStatus.ERROR
            ResponseStatus.ROLLED_BACK,
            ResponseStatus.DISPUTED -> ModuleExecutionStatus.ERROR
            ResponseStatus.CANCELLED -> ModuleExecutionStatus.CANCELLED
            ResponseStatus.COMMITTED,
            ResponseStatus.SUCCESS,
            ResponseStatus.PARTIAL -> ModuleExecutionStatus.SUCCESS
            else -> ModuleExecutionStatus.RUNNING
        }
    }

    private fun sanitizeForExport(text: String): String {
        if (text.isBlank()) return ""
        val collapsed = text
            .replace(Regex("https?://\\S+"), "[link]")
            .replace(Regex("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", RegexOption.IGNORE_CASE), "[email]")
            .replace(Regex("\\b\\d{11,}\\b"), "[number]")
            .replace(Regex("\\s+"), " ")
            .trim()
        return collapsed.take(220)
    }
}

@Composable
private fun LumiBackendTheme(content: @Composable () -> Unit) {
    val colors = darkColorScheme(
        primary = LumiColors.accent,
        secondary = LumiColors.accentGlow,
        background = LumiColors.bg1,
        surface = LumiColors.bg2
    )
    MaterialTheme(
        colorScheme = colors,
        content = {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color.Transparent
            ) {
                content()
            }
        }
    )
}

private fun surfaceIcon(surface: MainActivity.AppSurface): ImageVector {
    return when (surface) {
        MainActivity.AppSurface.GOALS -> Icons.Filled.Flag
        MainActivity.AppSurface.WORK -> Icons.AutoMirrored.Filled.Chat
        MainActivity.AppSurface.ACTIVITY -> Icons.Filled.History
    }
}
