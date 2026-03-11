package com.lumi.keyboard.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.InteractionEventType
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyUpdateResult
import com.lumi.coredomain.contract.AgentAction
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.ui.model.ModuleExecutionStep
import com.lumi.keyboard.ui.screens.AgentMarketScreenContent
import com.lumi.keyboard.ui.screens.AvatarScreenContent
import com.lumi.keyboard.ui.screens.WorkScreenContent
import com.lumi.keyboard.ui.screens.DestinyScreenContent
import com.lumi.keyboard.ui.screens.HomeScreenContent
import com.lumi.keyboard.ui.screens.LixMarketScreenContent
import com.lumi.keyboard.ui.screens.SettingsScreenContent
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiGradients
import com.lumi.keyboard.ui.theme.LumiShapes

@Composable
fun ModuleFeaturePanel(
    module: AppModule,
    response: AgentResponse?,
    snapshot: AgentResponse?,
    summary: DigitalSoulSummary?,
    dynamicState: DynamicHumanStatePayload?,
    trajectory: List<TrajectoryPointPayload>,
    latestUserRequest: String?,
    defaultBaseUrl: String,
    loading: Boolean,
    timeline: List<ModuleExecutionStep>,
    developerMode: Boolean,
    showGlobalSupplement: Boolean = true,
    onRun: (String, NetworkPolicy) -> Unit,
    onOpenAction: (AgentAction) -> Unit,
    onOpenDeeplink: (String) -> Unit,
    onSubmitOutcomeFeedback: (String) -> Unit = {},
    onTrackInteraction: (InteractionEventType, Map<String, String>) -> Unit = { _, _ -> },
    onSaveRolePolicyDraft: (UserRole, RolePolicyDraft, (RolePolicyUpdateResult) -> Unit) -> Unit = { _, _, _ -> },
    onResetRolePolicy: (UserRole, (RolePolicyUpdateResult) -> Unit) -> Unit = { _, _ -> }
) {
    val payload = response?.payload ?: snapshot?.payload ?: ModulePayload.NonePayload
    val accent = LumiGradients.moduleAccentColor(module)
    val shouldRenderGlobalSupplement = showGlobalSupplement && module != AppModule.CHAT && module != AppModule.SETTINGS
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardMedium
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumiGradients.moduleGradient(module), LumiShapes.cardMedium)
                .drawBehind {
                    drawRoundRect(
                        color = accent.copy(alpha = 0.2f),
                        cornerRadius = CornerRadius(16.dp.toPx()),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AnimatedContent(
                    targetState = module,
                    transitionSpec = {
                        fadeIn(tween(250)) togetherWith fadeOut(tween(180))
                    },
                    label = "module_content"
                ) { targetModule ->
                    when (targetModule) {
                        AppModule.HOME -> HomeScreenContent(
                            payload = payload as? ModulePayload.HomePayload,
                            summary = summary
                        )
                        AppModule.CHAT -> WorkScreenContent(
                            response = response,
                            payload = payload as? ModulePayload.ChatPayload,
                            summary = summary,
                            latestUserRequest = latestUserRequest,
                            loading = loading,
                            developerMode = developerMode,
                            onRefine = { onRun("Refine current task and provide evidence", NetworkPolicy.CLOUD_PREFERRED) },
                            onSubmitRequirements = { prompt ->
                                onRun(prompt, NetworkPolicy.CLOUD_PREFERRED)
                            },
                            onSubmitOutcomeFeedback = onSubmitOutcomeFeedback,
                            onRunNextAction = { action ->
                                onRun(action, NetworkPolicy.CLOUD_PREFERRED)
                            },
                            onOpenAction = onOpenAction,
                            onTrackInteraction = onTrackInteraction
                        )
                        AppModule.LIX -> LixMarketScreenContent(
                            response = response,
                            payload = payload as? ModulePayload.LixPayload,
                            summary = summary,
                            dynamicState = dynamicState,
                            trajectory = trajectory,
                            loading = loading,
                            timeline = timeline,
                            developerMode = developerMode,
                            onPublishIntent = { prompt ->
                                onRun(prompt, NetworkPolicy.CLOUD_PREFERRED)
                            },
                            onShowMyAgents = { onRun("Query my agents", NetworkPolicy.CLOUD_PREFERRED) },
                            onAcceptOffer = { intentId, offerId ->
                                onRun("Accept offer $intentId $offerId", NetworkPolicy.CLOUD_PREFERRED)
                            },
                            onOpenOfferLink = onOpenDeeplink
                        )
                        AppModule.AGENT -> AgentMarketScreenContent(
                            response = response,
                            payload = payload as? ModulePayload.MarketPayload,
                            loading = loading,
                            timeline = timeline,
                            developerMode = developerMode,
                            onDiscover = { onRun("Discover executable agents and rank them", NetworkPolicy.CLOUD_PREFERRED) },
                            onExecute = { onRun("Execute an agent task and return status", NetworkPolicy.CLOUD_PREFERRED) },
                            onGithubConnect = { onRun("GitHub connect", NetworkPolicy.CLOUD_PREFERRED) },
                            onGithubImport = { repo, manifestPath ->
                                onRun("GitHub import $repo $manifestPath", NetworkPolicy.CLOUD_PREFERRED)
                            }
                        )
                        AppModule.AVATAR -> AvatarScreenContent(
                            response = response,
                            payload = payload as? ModulePayload.AvatarPayload,
                            summary = summary,
                            dynamicState = dynamicState,
                            trajectory = trajectory,
                            onSaveRolePolicyDraft = onSaveRolePolicyDraft,
                            onResetRolePolicy = onResetRolePolicy
                        )
                        AppModule.DESTINY -> DestinyScreenContent(
                            response = response,
                            payload = payload as? ModulePayload.DestinyPayload,
                            developerMode = developerMode
                        )
                        AppModule.SETTINGS -> SettingsScreenContent(
                            payload = payload as? ModulePayload.SettingsPayload,
                            defaultBaseUrl = defaultBaseUrl
                        )
                    }
                }
                if (shouldRenderGlobalSupplement) {
                    GlobalSupplementCard(
                        module = module,
                        latestUserRequest = latestUserRequest.orEmpty(),
                        onSubmit = { prompt ->
                            onTrackInteraction(
                                InteractionEventType.QUERY_REFINE,
                                mapOf(
                                    "module" to module.label,
                                    "feedback_source" to "global_supplement_panel"
                                )
                            )
                            onRun(prompt, NetworkPolicy.CLOUD_PREFERRED)
                        }
                    )
                }
            }
        }
    }
}

@Composable
internal fun GlobalSupplementCard(
    module: AppModule,
    latestUserRequest: String,
    onSubmit: (String) -> Unit
) {
    var supplement by rememberSaveable(module.name) { mutableStateOf("") }
    val canSubmit = supplement.trim().isNotBlank()
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A3347)),
        shape = LumiShapes.cardSmall
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Supplement current task",
                color = LumiColors.textPrimary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "Add missing context for ${module.label} at any time. Agent will re-plan from your update.",
                color = LumiColors.textMuted,
                fontSize = 10.sp
            )
            OutlinedTextField(
                value = supplement,
                onValueChange = { supplement = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Global Supplement Input" },
                label = { Text("Extra requirement", fontSize = 11.sp) },
                placeholder = { Text("Budget, constraints, preference, correction...", fontSize = 10.sp) },
                minLines = 2
            )
            Button(
                onClick = {
                    val prompt = buildGlobalSupplementPrompt(
                        module = module,
                        latestUserRequest = latestUserRequest,
                        supplement = supplement.trim()
                    )
                    onSubmit(prompt)
                    supplement = ""
                },
                enabled = canSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Global Submit Supplement" }
            ) {
                Text("Continue with supplement", fontSize = 11.sp)
            }
        }
    }
}

private fun buildGlobalSupplementPrompt(
    module: AppModule,
    latestUserRequest: String,
    supplement: String
): String {
    return buildString {
        append("Supplemental user update for module ").append(module.label).append('.').append('\n')
        if (latestUserRequest.trim().isNotBlank()) {
            append("Original request: ").append(latestUserRequest.trim()).append('\n')
        }
        append("New details: ").append(supplement).append('\n')
        append("Re-plan and continue execution with this new context, then return an executable solution.")
    }
}
