package com.lumi.keyboard.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.appbackend.R
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiGradients
import com.lumi.keyboard.ui.theme.LumiShapes
import com.lumi.keyboard.ui.theme.LumiSpacing
import com.lumi.keyboard.ui.theme.LumiTypography
import com.lumi.keyboard.ui.theme.pulseAlpha
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions

@Composable
fun HeaderCard(
    subtitle: String,
    developerMode: Boolean = false
) {
    val pulse = pulseAlpha(1800)
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardLarge
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumiGradients.headerCard, LumiShapes.cardLarge)
                .drawBehind {
                    drawRoundRect(
                        color = LumiColors.border,
                        cornerRadius = CornerRadius(20.dp.toPx()),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
                .padding(LumiSpacing.lg),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(
                        LumiColors.accent.copy(alpha = 0.15f),
                        LumiShapes.cardSmall
                    ),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.lumi_logo),
                    contentDescription = "Lumi Logo",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(44.dp)
                )
            }
            Spacer(modifier = Modifier.width(LumiSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Lumi Agent",
                        style = LumiTypography.heading.copy(fontSize = 20.sp)
                    )
                    Spacer(modifier = Modifier.width(LumiSpacing.sm))
                    // Online status indicator with pulse
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(
                                LumiColors.positive.copy(alpha = pulse),
                                CircleShape
                            )
                    )
                    Spacer(modifier = Modifier.width(LumiSpacing.xs))
                    Text(
                        "Online",
                        color = LumiColors.positive.copy(alpha = pulse),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                ) {
                    Text(
                        if (developerMode) "Super Agent · developer diagnostics enabled" else "Super Agent · ready to execute your goals",
                        color = LumiColors.textTertiary,
                        fontSize = 12.sp
                    )
                    Box(
                        modifier = Modifier
                            .background(
                                if (developerMode) LumiColors.warning.copy(alpha = 0.22f) else LumiColors.positive.copy(alpha = 0.18f),
                                LumiShapes.pill
                            )
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            if (developerMode) "DEBUG MODE" else "PRODUCT MODE",
                            color = if (developerMode) LumiColors.warning else LumiColors.positive,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(LumiSpacing.xs))
                Text(
                    subtitle,
                    style = LumiTypography.body.copy(fontSize = 13.sp),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun ModuleHeroCard(module: AppModule, summary: DigitalSoulSummary?) {
    val accent = LumiGradients.moduleAccentColor(module)
    val title = when (module) {
        AppModule.HOME -> "Home Overview"
        AppModule.CHAT -> "Task Orchestration"
        AppModule.LIX -> "External Fulfillment"
        AppModule.AGENT -> "External Capabilities"
        AppModule.AVATAR -> "Preferences & Permissions"
        AppModule.DESTINY -> "Recommendations & Risk"
        AppModule.SETTINGS -> "Settings & Observability"
    }
    val desc = when (module) {
        AppModule.HOME -> "Aggregates system state, active tasks, and key entry points."
        AppModule.CHAT -> "Manage reply drafts and retrieve evidence in real time."
        AppModule.LIX -> "Use external fulfillment only when it beats or unblocks internal execution."
        AppModule.AGENT -> "Compare third-party capabilities and execution readiness."
        AppModule.AVATAR -> "Set stable preferences, approvals, and privacy controls."
        AppModule.DESTINY -> "Review recommendations, risk levels, and next actions."
        AppModule.SETTINGS -> "API status, feature toggles, and environment details."
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardMedium
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumiGradients.moduleGradient(module), LumiShapes.cardMedium)
                .drawBehind {
                    drawRoundRect(
                        color = accent.copy(alpha = 0.25f),
                        cornerRadius = CornerRadius(16.dp.toPx()),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
                .padding(LumiSpacing.lg)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Accent color bar
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .height(20.dp)
                        .background(accent, LumiShapes.pill)
                )
                Spacer(modifier = Modifier.width(LumiSpacing.sm))
                Text(
                    title,
                    color = LumiColors.textPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
            Spacer(modifier = Modifier.height(LumiSpacing.xs))
            Text(
                desc,
                color = LumiColors.textTertiary,
                fontSize = 12.sp
            )
            if ((module == AppModule.HOME || module == AppModule.AVATAR) && summary != null) {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
                ) {
                    Row(
                        modifier = Modifier
                            .background(
                                accent.copy(alpha = 0.1f),
                                LumiShapes.pill
                            )
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(accent, CircleShape)
                        )
                        Text(
                            "Preferences: ${summary.profileLabel}",
                            color = accent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    if (summary.topTraits.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .background(
                                    LumiColors.positive.copy(alpha = 0.1f),
                                    LumiShapes.pill
                                )
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                "🧬 ${summary.topTraits.size} traits",
                                color = LumiColors.positive,
                                fontSize = 10.sp
                            )
                        }
                    }
                    Row(
                        modifier = Modifier
                            .background(
                                (if (summary.cloudSyncEnabled) LumiColors.positive else LumiColors.textMuted).copy(alpha = 0.1f),
                                LumiShapes.pill
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            if (summary.cloudSyncEnabled) "☁️ Cloud Sync" else "📱 Local",
                            color = if (summary.cloudSyncEnabled) LumiColors.positive else LumiColors.textMuted,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ModuleCommandBar(
    moduleLabel: String,
    inputText: String,
    loading: Boolean,
    onInputChanged: (String) -> Unit,
    onSubmit: () -> Unit,
    onApplySuggestion: (String) -> Unit
) {
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val suggestions = commandSuggestionsForModule(moduleLabel)
    val submitAndCollapseInput: () -> Unit = {
        onSubmit()
        focusManager.clearFocus(force = true)
        keyboardController?.hide()
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardMedium
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumiColors.cardSurface, LumiShapes.cardMedium)
                .drawBehind {
                    drawRoundRect(
                        color = LumiColors.border,
                        cornerRadius = CornerRadius(16.dp.toPx()),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
                .padding(LumiSpacing.md)
        ) {
            Text(
                text = "Current page: $moduleLabel",
                color = LumiColors.textSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(LumiSpacing.sm))
            OutlinedTextField(
                value = inputText,
                onValueChange = onInputChanged,
                modifier = Modifier.fillMaxWidth(),
                label = {
                    Text(
                        when (moduleLabel) {
                            "Chat" -> "Enter a chat request..."
                            "Preferences & Permissions" -> "Update preferences, approvals, or data-sharing scope..."
                            "External Fulfillment" -> "Request external fulfillment options..."
                            "External Capabilities" -> "Query external capability options..."
                            "Recommendations & Risk" -> "Request recommendations and risk analysis..."
                            "Settings" -> "Check system status..."
                            else -> "Enter a prompt..."
                        },
                        color = LumiColors.textMuted
                    )
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions.Default.copy(
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = { submitAndCollapseInput() }
                ),
                shape = LumiShapes.cardSmall,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LumiColors.accent,
                    unfocusedBorderColor = LumiColors.border,
                    cursorColor = LumiColors.accent,
                    focusedTextColor = LumiColors.textPrimary,
                    unfocusedTextColor = LumiColors.textSecondary
                )
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (loading) {
                    "Request running. Suggestions remain available for the next turn."
                } else {
                    "Tip: Use a suggestion, then fine-tune before submit."
                },
                color = LumiColors.textMuted,
                fontSize = 11.sp
            )
            if (suggestions.isNotEmpty()) {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    suggestions.forEach { suggestion ->
                        Card(
                            modifier = Modifier.clickable {
                                onApplySuggestion(suggestion)
                                focusManager.clearFocus(force = true)
                            },
                            colors = CardDefaults.cardColors(
                                containerColor = LumiColors.accent.copy(alpha = 0.1f)
                            ),
                            shape = LumiShapes.pill
                        ) {
                            Text(
                                text = suggestion,
                                color = LumiColors.accentGlow,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(LumiSpacing.sm))
            Button(
                onClick = submitAndCollapseInput,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                enabled = inputText.isNotBlank() && !loading,
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                shape = LumiShapes.button
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .background(LumiGradients.submitButton, LumiShapes.button),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        }
                        Text(
                            if (loading) "Running..." else "Submit to App internal backend",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}

private fun commandSuggestionsForModule(moduleLabel: String): List<String> {
    return when (moduleLabel) {
        "Home" -> listOf(
            "Refresh Home Overview",
            "Summarize my pending tasks in 3 bullets"
        )

        "Chat" -> listOf(
            "Rewrite this message in a more professional tone",
            "Summarize key points in 3 bullets",
            "Draft a polite follow-up"
        )

        "External Fulfillment", "LIX" -> listOf(
            "Compare external options by price, ETA, risk, proof, and rollback terms",
            "Publish an external fulfillment request with explicit constraints",
            "Return verifiable options with dispute-safe fallback"
        )

        "External Capabilities", "Agent" -> listOf(
            "Discover executable external capabilities and rank by confidence",
            "Execute a selected external capability and return status",
            "GitHub import openclaw/openclaw .lix/agent.manifest.json"
        )

        "Preferences & Permissions", "Avatar" -> listOf(
            "Show stable preferences and current approval rules",
            "Explain local vs cloud execution boundaries for this task"
        )

        "Recommendations & Risk" -> listOf(
            "Generate today's action strategy summary",
            "Explain rationale and risks of the current path"
        )

        "Settings" -> listOf(
            "Refresh system settings and API health status",
            "Show DTOE uplift and calibration summary"
        )

        else -> emptyList()
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SmartBriefComposer(
    goal: String,
    budget: String,
    deadline: String,
    acceptanceCriteria: String,
    confirmationToken: String,
    loading: Boolean,
    showAdvanced: Boolean,
    onGoalChange: (String) -> Unit,
    onBudgetChange: (String) -> Unit,
    onDeadlineChange: (String) -> Unit,
    onAcceptanceChange: (String) -> Unit,
    onTokenChange: (String) -> Unit,
    onToggleAdvanced: () -> Unit,
    onApplyTemplate: (String) -> Unit,
    onRunPlan: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val canRun = goal.isNotBlank() && !loading
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardMedium
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumiColors.cardSurface, LumiShapes.cardMedium)
                .drawBehind {
                    drawRoundRect(
                        color = LumiColors.border,
                        cornerRadius = CornerRadius(16.dp.toPx()),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
                .padding(LumiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "What do you want to achieve?",
                color = LumiColors.textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp
            )
            OutlinedTextField(
                value = goal,
                onValueChange = onGoalChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Goal Input" },
                label = { Text("Describe your goal in one sentence", color = LumiColors.textMuted) },
                minLines = 3,
                maxLines = 5,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(
                    onSend = {
                        if (canRun) {
                            focusManager.clearFocus(force = true)
                            keyboardController?.hide()
                            onRunPlan()
                        }
                    }
                ),
                shape = LumiShapes.cardSmall,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = LumiColors.accent,
                    unfocusedBorderColor = LumiColors.border,
                    cursorColor = LumiColors.accent,
                    focusedTextColor = LumiColors.textPrimary,
                    unfocusedTextColor = LumiColors.textSecondary
                )
            )
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf(
                    "Travel planner" to "travel",
                    "Hiring plan" to "hiring",
                    "Shopping decision" to "shopping"
                ).forEach { (label, key) ->
                    Card(
                        modifier = Modifier.clickable { onApplyTemplate(key) },
                        colors = CardDefaults.cardColors(containerColor = LumiColors.accent.copy(alpha = 0.1f)),
                        shape = LumiShapes.pill
                    ) {
                        Text(
                            text = label,
                            color = LumiColors.accentGlow,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }
            }
            Text(
                text = if (showAdvanced) "Hide optional constraints" else "Add optional constraints (if you already know them)",
                color = LumiColors.textTertiary,
                fontSize = 11.sp,
                modifier = Modifier.clickable(onClick = onToggleAdvanced)
            )
            if (showAdvanced) {
                OutlinedTextField(
                    value = budget,
                    onValueChange = onBudgetChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Budget (optional)", fontSize = 11.sp) },
                    singleLine = true
                )
                OutlinedTextField(
                    value = deadline,
                    onValueChange = onDeadlineChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Deadline (optional)", fontSize = 11.sp) },
                    singleLine = true
                )
                OutlinedTextField(
                    value = acceptanceCriteria,
                    onValueChange = onAcceptanceChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Acceptance criteria (optional)", fontSize = 11.sp) },
                    minLines = 2
                )
                OutlinedTextField(
                    value = confirmationToken,
                    onValueChange = onTokenChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Confirmation token (optional)", fontSize = 11.sp) },
                    singleLine = true
                )
            }
            Button(
                onClick = {
                    focusManager.clearFocus(force = true)
                    keyboardController?.hide()
                    onRunPlan()
                },
                enabled = canRun,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .semantics { contentDescription = "Run Plan" },
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                shape = LumiShapes.button
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .background(LumiGradients.submitButton, LumiShapes.button),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        }
                        Text(
                            text = if (loading) "Running..." else "Run Plan",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LoadingCard() {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardSmall
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(LumiColors.cardSurface, LumiShapes.cardSmall)
                .drawBehind {
                    drawRoundRect(
                        color = LumiColors.accent.copy(alpha = 0.2f),
                        cornerRadius = CornerRadius(12.dp.toPx()),
                        style = Stroke(width = 1.dp.toPx())
                    )
                }
                .padding(LumiSpacing.lg),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = LumiColors.accent,
                trackColor = LumiColors.border
            )
            Spacer(modifier = Modifier.width(LumiSpacing.md))
            Text(
                "Processing request...",
                color = LumiColors.textSecondary,
                fontSize = 13.sp
            )
        }
    }
}
