package com.lumi.keyboard.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.DelegationMode
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.ExternalFulfillmentPreference
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.RolePolicyDraft
import com.lumi.coredomain.contract.RolePolicyEditorState
import com.lumi.coredomain.contract.RolePolicyProfile
import com.lumi.coredomain.contract.RolePolicyUpdateResult
import com.lumi.coredomain.contract.TraitScore
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.UserRole
import com.lumi.keyboard.ui.components.CircularProgressRing
import com.lumi.keyboard.ui.components.MiniLineChart
import com.lumi.keyboard.ui.components.RadarChartView
import com.lumi.keyboard.ui.components.TwinBayesianPracticalCard
import com.lumi.keyboard.ui.model.buildTwinPracticalSnapshot
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiTypography
import com.lumi.keyboard.ui.theme.glassSurface
import com.lumi.keyboard.ui.theme.glowBorder
import com.lumi.keyboard.ui.theme.glowScale
import com.lumi.keyboard.ui.theme.smoothProgress
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AvatarScreenContent(
    response: AgentResponse?,
    payload: ModulePayload.AvatarPayload?,
    summary: DigitalSoulSummary?,
    dynamicState: DynamicHumanStatePayload?,
    trajectory: List<TrajectoryPointPayload>,
    onSaveRolePolicyDraft: (UserRole, RolePolicyDraft, (RolePolicyUpdateResult) -> Unit) -> Unit = { _, _, _ -> },
    onResetRolePolicy: (UserRole, (RolePolicyUpdateResult) -> Unit) -> Unit = { _, _ -> }
) {
    val label = payload?.profileLabel?.ifBlank { summary?.profileLabel }.orEmpty().ifBlank { "Profile not set" }
    val traits = payload?.topTraits?.ifEmpty { summary?.topTraits.orEmpty() } ?: summary?.topTraits.orEmpty()
    val cloudEnabled = payload?.cloudSyncEnabled ?: summary?.cloudSyncEnabled ?: false
    val stablePreferences = payload?.stablePreferences.orEmpty()
    val approvalRules = payload?.approvalRules.orEmpty()
    val dataSharingScope = payload?.dataSharingScope.orEmpty()
    val syncStatus = payload?.syncStatus?.ifBlank { if (cloudEnabled) "pending" else "local_only" }
        ?: if (cloudEnabled) "pending" else "local_only"
    val syncLastUpdatedAtMs = payload?.syncLastUpdatedAtMs
    val localCloudExplanation = payload?.localCloudExplanation
        ?.ifBlank {
            if (cloudEnabled) "Cloud sync enabled with local-first safeguards." else "Local-only mode is active."
        }
        ?: if (cloudEnabled) "Cloud sync enabled with local-first safeguards." else "Local-only mode is active."
    val activeRoleLabel = payload?.activeRole
        ?.name
        ?.lowercase()
        ?.replace('_', ' ')
        ?.split(' ')
        ?.joinToString(" ") { token -> token.replaceFirstChar { it.uppercaseChar() } }
        ?: "Personal"
    val rolePolicyProfile = payload?.rolePolicyProfile
    val rolePolicyEditor = payload?.rolePolicyEditor
    val constraintPriorityNote = payload?.constraintPriorityNote
        ?.ifBlank { "Current task constraints override long-term preferences in every run." }
        ?: "Current task constraints override long-term preferences in every run."
    val consensus = payload?.consensus
    val aura = payload?.auraState
    val stateVector = payload?.stateVector ?: dynamicState
    val trajectorySeries = payload?.trajectory?.takeIf { it.isNotEmpty() } ?: trajectory
    val practicalSnapshot = buildTwinPracticalSnapshot(
        summary = summary,
        state = stateVector,
        trajectory = trajectorySeries,
        cloudPosterior = payload?.posterior
    )
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    val tabs = listOf("Preferences", "Approvals", "Data Scope", "Diagnostics")

    Column(
        modifier = Modifier.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // ── Section Title ──
        Text(
            "Preferences & Permissions · Twin Control Layer",
            style = LumiTypography.subheading
        )

        ConstraintPriorityBanner(note = constraintPriorityNote)
        RolePolicyEditorCard(
            editorState = rolePolicyEditor,
            onSaveRolePolicyDraft = onSaveRolePolicyDraft,
            onResetRolePolicy = onResetRolePolicy
        )
        TwinControlListCard(
            title = "Role policy context",
            items = buildList {
                add("Active role: $activeRoleLabel")
                rolePolicyProfile?.approvalPolicy?.delegationMode?.name
                    ?.lowercase()
                    ?.replace('_', ' ')
                    ?.let { add("Delegation mode: $it") }
                rolePolicyProfile?.dataPolicy?.sharingMode
                    ?.takeIf { it.isNotBlank() }
                    ?.let { add("Role data policy: $it") }
            }
        )
        TwinControlListCard(
            title = "Stable preferences",
            items = stablePreferences.ifEmpty {
                listOf("No stable preferences learned yet. Continue usage to improve continuity.")
            }
        )
        TwinControlListCard(
            title = "Approval rules",
            items = approvalRules.ifEmpty {
                listOf(
                    "High-risk actions require explicit confirmation.",
                    "External spend/contract actions require confirmation token."
                )
            }
        )
        TwinControlListCard(
            title = "Data-sharing scope",
            items = dataSharingScope.ifEmpty {
                listOf(
                    if (cloudEnabled) "Cloud sync enabled (scoped + redacted)." else "Cloud sync disabled (local-only).",
                    "Missing constraints trigger follow-up prompts; requirements are never fabricated."
                )
            }
        )
        SyncDiagnosticsCard(
            syncStatus = syncStatus,
            syncLastUpdatedAtMs = syncLastUpdatedAtMs,
            explanation = localCloudExplanation
        )

        TwinBayesianPracticalCard(
            snapshot = practicalSnapshot,
            compact = false,
            accent = LumiColors.avatarAccent,
            glow = Color(0xFF67F7B0),
            surfaceColor = Color(0xCC0D2240)
        )

        // ── Profile Header Card (Enhanced) ──
        val avatarScale = glowScale(2400)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .glassSurface(color = Color(0xCC0D2240), cornerRadius = 18.dp)
                .glowBorder(glowColor = LumiColors.avatarAccent, cornerRadius = 18.dp, alpha = 0.25f)
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Animated avatar glow circle
                    Box(contentAlignment = Alignment.Center) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .scale(avatarScale)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        colors = listOf(
                                            LumiColors.avatarAccent.copy(alpha = 0.25f),
                                            LumiColors.avatarAccent.copy(alpha = 0.05f)
                                        )
                                    )
                                )
                        )
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        colors = listOf(
                                            LumiColors.avatarAccent.copy(alpha = 0.4f),
                                            LumiColors.avatarAccent.copy(alpha = 0.15f)
                                        )
                                    )
                                )
                        )
                        Text("🧬", fontSize = 20.sp)
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            label,
                            style = LumiTypography.subheading.copy(fontSize = 15.sp)
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(if (cloudEnabled) LumiColors.positive else LumiColors.textMuted)
                            )
                            Text(
                                if (cloudEnabled) "Cloud sync enabled" else "Local-only storage",
                                style = LumiTypography.label.copy(
                                    color = if (cloudEnabled) LumiColors.positive else LumiColors.textTertiary
                                )
                            )
                        }
                    }
                }
                // Aura indicator
                if (aura != null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        colors = listOf(
                                            parseAuraColor(aura.colorHex).copy(
                                                alpha = (aura.intensity * 0.9).coerceIn(0.3, 0.9).toFloat()
                                            ),
                                            parseAuraColor(aura.colorHex).copy(alpha = 0.1f)
                                        )
                                    )
                                )
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            "Aura ${(aura.intensity * 100).toInt()}%",
                            style = LumiTypography.label
                        )
                    }
                }
            }
        }

        // ── State Consensus Badges ──
        AnimatedVisibility(
            visible = consensus != null,
            enter = fadeIn(tween(400)) + slideInVertically(tween(400)) { -it / 3 }
        ) {
            if (consensus != null) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    ConsensusChip("⚡ Energy", consensus.energyLabel, energyColor(consensus.energyLabel))
                    ConsensusChip("😊 Mood", consensus.moodLabel, moodColor(consensus.moodLabel))
                    ConsensusChip("🎯 Focus", consensus.focusLabel, focusColor(consensus.focusLabel))
                    ConsensusChip("🧠 Strategy", consensus.strategyLabel, Color(0xFFF97316))
                }
            }
        }

        // ── Styled Tab Bar ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .glassSurface(color = Color(0xCC091A33), cornerRadius = 12.dp)
                .padding(4.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                tabs.forEachIndexed { index, tab ->
                    val isSelected = selectedTab == index
                    val bgColor = if (isSelected) LumiColors.avatarAccent.copy(alpha = 0.2f) else Color.Transparent
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(bgColor)
                            .clickable { selectedTab = index }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            tab,
                            style = LumiTypography.label.copy(
                                color = if (isSelected) LumiColors.avatarAccent else LumiColors.textMuted,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }

        // ── Tab Content with CrossFade ──
        AnimatedContent(
            targetState = selectedTab,
            transitionSpec = {
                fadeIn(tween(300)) togetherWith fadeOut(tween(200))
            },
            label = "avatar_tab"
        ) { tab ->
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                when (tab) {
                    // ═══════════════════════════════════════════════
                    // Tab 0: Avatar Overview
                    // ═══════════════════════════════════════════════
                    0 -> {
                        val metrics = buildPortraitDimensions(stateVector, traits)

                        // Natural language summary
                        val summaryText = buildProfileSummary(metrics, label)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .glassSurface(color = Color(0xCC0F1D38), cornerRadius = 14.dp)
                                .padding(14.dp)
                        ) {
                            Text(
                                summaryText,
                                style = LumiTypography.body.copy(
                                    lineHeight = 20.sp
                                )
                            )
                        }

                        // Radar chart
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .glassSurface(color = Color(0xCC0A1630), cornerRadius = 16.dp)
                                .glowBorder(glowColor = LumiColors.avatarAccent, cornerRadius = 16.dp, alpha = 0.15f)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(
                                    "Multi-dimensional Avatar Radar",
                                    style = LumiTypography.subheading.copy(fontSize = 12.sp),
                                    modifier = Modifier.padding(start = 8.dp, top = 4.dp)
                                )
                                RadarChartView(
                                    dimensions = metrics.map { it.label to it.value },
                                    accentColor = LumiColors.avatarAccent,
                                    glowColor = Color(0xFF67F7B0)
                                )
                            }
                        }

                        // Circular progress rings with animated values
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .glassSurface(color = Color(0xCC10233B), cornerRadius = 16.dp)
                                .padding(14.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                Text(
                                    "Core Dimensions",
                                    style = LumiTypography.subheading.copy(fontSize = 12.sp)
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    metrics.take(3).forEachIndexed { i, m ->
                                        val animatedValue = smoothProgress(m.value)
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            CircularProgressRing(
                                                value = animatedValue,
                                                label = m.label,
                                                accentColor = dimensionColor(i),
                                                ringSize = 68.dp,
                                                strokeWidth = 5.dp
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                "${(animatedValue * 100).toInt()}%",
                                                style = LumiTypography.label.copy(
                                                    color = dimensionColor(i),
                                                    fontWeight = FontWeight.Bold
                                                )
                                            )
                                        }
                                    }
                                }
                                if (metrics.size > 3) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceEvenly
                                    ) {
                                        metrics.drop(3).take(3).forEachIndexed { i, m ->
                                            val animatedValue = smoothProgress(m.value)
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                CircularProgressRing(
                                                    value = animatedValue,
                                                    label = m.label,
                                                    accentColor = dimensionColor(i + 3),
                                                    ringSize = 68.dp,
                                                    strokeWidth = 5.dp
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    "${(animatedValue * 100).toInt()}%",
                                                    style = LumiTypography.label.copy(
                                                        color = dimensionColor(i + 3),
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ═══════════════════════════════════════════════
                    // Tab 1: Capability Matrix
                    // ═══════════════════════════════════════════════
                    1 -> {
                        val groups = traitGroups(traits)
                        val groupIcons = listOf("🧠", "⚙️", "💬")
                        groups.entries.forEachIndexed { groupIndex, (groupName, groupTraits) ->
                            val icon = groupIcons.getOrElse(groupIndex) { "📊" }
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .glassSurface(color = Color(0xCC132C48), cornerRadius = 16.dp)
                                    .padding(14.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(icon, fontSize = 14.sp)
                                        Text(
                                            groupName,
                                            style = LumiTypography.subheading.copy(fontSize = 12.sp)
                                        )
                                    }
                                    if (groupTraits.isEmpty()) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 8.dp),
                                            horizontalArrangement = Arrangement.Center,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text("🔮", fontSize = 18.sp)
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                "No data yet · generated after more interaction",
                                                style = LumiTypography.caption
                                            )
                                        }
                                    } else {
                                        FlowRow(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceEvenly,
                                            verticalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            groupTraits.forEachIndexed { i, trait ->
                                                val animatedValue = smoothProgress(trait.value.coerceIn(0.0, 1.0).toFloat())
                                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                    CircularProgressRing(
                                                        value = animatedValue,
                                                        label = readableTraitLabel(trait.key),
                                                        accentColor = traitColor(groupName, i),
                                                        ringSize = 60.dp,
                                                        strokeWidth = 4.dp
                                                    )
                                                    Text(
                                                        "${(animatedValue * 100).toInt()}%",
                                                        style = LumiTypography.label.copy(
                                                            color = traitColor(groupName, i),
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ═══════════════════════════════════════════════
                    // Tab 2: Trend Trajectory
                    // ═══════════════════════════════════════════════
                    2 -> {
                        if (trajectorySeries.isNotEmpty()) {
                            val latest = trajectorySeries.last()
                            val first = trajectorySeries.first()
                            val trend = when {
                                latest.value > first.value + 0.03 -> "up"
                                latest.value < first.value - 0.03 -> "down"
                                else -> "stable"
                            }
                            val trendEmoji = when (trend) {
                                "up" -> "📈"
                                "down" -> "📉"
                                else -> "➡️"
                            }

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .glassSurface(color = Color(0xCC10233B), cornerRadius = 16.dp)
                                    .glowBorder(
                                        glowColor = LumiColors.avatarAccent,
                                        cornerRadius = 16.dp,
                                        alpha = 0.12f
                                    )
                                    .padding(14.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(trendEmoji, fontSize = 14.sp)
                                        Text(
                                            "Avatar Trend · $trend",
                                            style = LumiTypography.subheading.copy(fontSize = 12.sp)
                                        )
                                    }
                                    MiniLineChart(
                                        points = trajectorySeries.map { it.value.coerceIn(0.0, 1.0).toFloat() },
                                        trendLabel = trend,
                                        currentValue = latest.value.coerceIn(0.0, 1.0).toFloat(),
                                        lineColor = LumiColors.avatarAccent
                                    )
                                }
                            }

                            // Trajectory stats row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                TrajectoryStatCard(
                                    modifier = Modifier.weight(1f),
                                    label = "Initial",
                                    value = "${(first.value * 100).toInt()}%",
                                    color = LumiColors.textSecondary
                                )
                                TrajectoryStatCard(
                                    modifier = Modifier.weight(1f),
                                    label = "Current",
                                    value = "${(latest.value * 100).toInt()}%",
                                    color = LumiColors.avatarAccent
                                )
                                TrajectoryStatCard(
                                    modifier = Modifier.weight(1f),
                                    label = "Delta",
                                    value = "${if (latest.value >= first.value) "+" else ""}${((latest.value - first.value) * 100).toInt()}%",
                                    color = if (latest.value >= first.value) LumiColors.positive else LumiColors.error
                                )
                            }
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .glassSurface(color = Color(0xCC10233B), cornerRadius = 16.dp)
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Text("📊", fontSize = 36.sp)
                                    Text(
                                        "No trajectory data yet",
                                        style = LumiTypography.body
                                    )
                                    Text(
                                        "Trajectory auto-generates after interactions in Chat / Agent / LIX",
                                        style = LumiTypography.caption
                                    )
                                }
                            }
                        }
                    }

                    // ═══════════════════════════════════════════════
                    // Tab 3: Improvement Tips
                    // ═══════════════════════════════════════════════
                    else -> {
                        val tips = buildCompletionTips(stateVector, cloudEnabled, traits)
                        val completionPct = calculateCompletion(stateVector, traits, cloudEnabled)
                        val animatedCompletion = smoothProgress(completionPct, durationMs = 1000)

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .glassSurface(color = Color(0xCC10233B), cornerRadius = 16.dp)
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    CircularProgressRing(
                                        value = animatedCompletion,
                                        label = "Avatar Completion",
                                        accentColor = if (animatedCompletion > 0.7f) LumiColors.positive else LumiColors.warning,
                                        ringSize = 84.dp,
                                        strokeWidth = 6.dp
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "${(animatedCompletion * 100).toInt()}%",
                                        style = LumiTypography.metric.copy(
                                            fontSize = 16.sp,
                                            color = if (animatedCompletion > 0.7f) LumiColors.positive else LumiColors.warning
                                        )
                                    )
                                }
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        "Improvement Suggestions",
                                        style = LumiTypography.subheading.copy(fontSize = 13.sp)
                                    )
                                    tips.forEachIndexed { index, tip ->
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.Top
                                        ) {
                                            // Numbered step indicator with accent border
                                            Box(
                                                modifier = Modifier
                                                    .size(20.dp)
                                                    .background(
                                                        LumiColors.accent.copy(alpha = 0.15f),
                                                        CircleShape
                                                    ),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    "${index + 1}",
                                                    style = LumiTypography.label.copy(
                                                        color = LumiColors.accent,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 10.sp
                                                    )
                                                )
                                            }
                                            Text(
                                                tip,
                                                style = LumiTypography.caption.copy(
                                                    color = LumiColors.textSecondary,
                                                    lineHeight = 16.sp
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
    }
}

@Composable
private fun ConstraintPriorityBanner(note: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .glassSurface(color = Color(0xCC1C2B43), cornerRadius = 12.dp)
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text(
            "Priority rule: $note",
            style = LumiTypography.body.copy(color = Color(0xFFCAE7FF), fontSize = 12.sp)
        )
    }
}

@Composable
private fun TwinControlListCard(
    title: String,
    items: List<String>
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .glassSurface(color = Color(0xCC11253F), cornerRadius = 12.dp)
            .padding(12.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                title,
                style = LumiTypography.label.copy(color = Color(0xFFB6D8F5), fontWeight = FontWeight.SemiBold)
            )
            items.take(4).forEach { line ->
                Text(
                    "• $line",
                    style = LumiTypography.body.copy(color = LumiColors.textSecondary, fontSize = 12.sp)
                )
            }
        }
    }
}

@Composable
private fun SyncDiagnosticsCard(
    syncStatus: String,
    syncLastUpdatedAtMs: Long?,
    explanation: String
) {
    val statusColor = when (syncStatus.lowercase(Locale.getDefault())) {
        "synced" -> Color(0xFF6EE7B7)
        "conflict_fallback", "failed_fallback" -> Color(0xFFFBBF24)
        "disabled", "local_only" -> Color(0xFF94A3B8)
        else -> Color(0xFF67D0FF)
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .glassSurface(color = Color(0xCC10253A), cornerRadius = 12.dp)
            .padding(12.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(7.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Text(
                    "Sync status: ${syncStatus.replace('_', ' ')}",
                    style = LumiTypography.body.copy(color = LumiColors.textPrimary, fontSize = 12.sp)
                )
            }
            Text(
                "Last update: ${formatSyncTime(syncLastUpdatedAtMs)}",
                style = LumiTypography.label.copy(color = LumiColors.textMuted)
            )
            Text(
                explanation,
                style = LumiTypography.body.copy(color = LumiColors.textSecondary, fontSize = 12.sp)
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RolePolicyEditorCard(
    editorState: RolePolicyEditorState?,
    onSaveRolePolicyDraft: (UserRole, RolePolicyDraft, (RolePolicyUpdateResult) -> Unit) -> Unit,
    onResetRolePolicy: (UserRole, (RolePolicyUpdateResult) -> Unit) -> Unit
) {
    val effectivePolicy = editorState?.effectivePolicy ?: return
    val role = editorState.role
    val key = "${role.name}:${editorState.lastUpdatedAtMs ?: 0L}"

    var delegationMode by rememberSaveable(key) { mutableStateOf(effectivePolicy.delegationPolicy.mode.name) }
    var requiresToken by rememberSaveable(key) { mutableStateOf(effectivePolicy.approvalPolicy.requiresConfirmationTokenForExternalSpend) }
    var autoBudgetText by rememberSaveable(key) { mutableStateOf(effectivePolicy.approvalPolicy.autoApprovalBudgetLimit?.toString().orEmpty()) }
    var maxBudgetText by rememberSaveable(key) { mutableStateOf(effectivePolicy.approvalPolicy.maxExternalBudget?.toString().orEmpty()) }
    var sharingMode by rememberSaveable(key) { mutableStateOf(effectivePolicy.dataPolicy.sharingMode) }
    var allowedScopesText by rememberSaveable(key) { mutableStateOf(effectivePolicy.dataPolicy.allowedScopes.joinToString(", ")) }
    var cloudSyncAllowed by rememberSaveable(key) { mutableStateOf(effectivePolicy.dataPolicy.cloudSyncAllowed) }
    var trustedTagsText by rememberSaveable(key) { mutableStateOf(effectivePolicy.preferences.trustedProviderTags.joinToString(", ")) }
    var blockedTagsText by rememberSaveable(key) { mutableStateOf(effectivePolicy.preferences.blockedProviderTags.joinToString(", ")) }
    var riskTolerance by rememberSaveable(key) { mutableStateOf(effectivePolicy.preferences.riskToleranceDefault.orEmpty()) }
    var maxCostPerStep by rememberSaveable(key) { mutableStateOf(effectivePolicy.preferences.maxCostPerStepDefault.orEmpty()) }
    var externalAllowed by rememberSaveable(key) { mutableStateOf(effectivePolicy.preferences.externalFulfillmentAllowed) }
    var externalPreference by rememberSaveable(key) { mutableStateOf(effectivePolicy.preferences.externalFulfillmentPreference.name) }
    var previewLines by remember(key) { mutableStateOf(buildPreviewLines(effectivePolicy)) }
    var validationLines by remember(key) { mutableStateOf<List<String>>(emptyList()) }
    var saveMessage by remember(key) { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }

    val editable = editorState.editableFields
    val protected = editorState.protectedFields.items
    val syncFromPolicy: (RolePolicyProfile) -> Unit = { policy ->
        delegationMode = policy.delegationPolicy.mode.name
        requiresToken = policy.approvalPolicy.requiresConfirmationTokenForExternalSpend
        autoBudgetText = policy.approvalPolicy.autoApprovalBudgetLimit?.toString().orEmpty()
        maxBudgetText = policy.approvalPolicy.maxExternalBudget?.toString().orEmpty()
        sharingMode = policy.dataPolicy.sharingMode
        allowedScopesText = policy.dataPolicy.allowedScopes.joinToString(", ")
        cloudSyncAllowed = policy.dataPolicy.cloudSyncAllowed
        trustedTagsText = policy.preferences.trustedProviderTags.joinToString(", ")
        blockedTagsText = policy.preferences.blockedProviderTags.joinToString(", ")
        riskTolerance = policy.preferences.riskToleranceDefault.orEmpty()
        maxCostPerStep = policy.preferences.maxCostPerStepDefault.orEmpty()
        externalAllowed = policy.preferences.externalFulfillmentAllowed
        externalPreference = policy.preferences.externalFulfillmentPreference.name
        previewLines = buildPreviewLines(policy)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .glassSurface(color = Color(0xCC11253A), cornerRadius = 12.dp)
            .padding(12.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "Guided Role Policy Editor (${role.name.lowercase().replaceFirstChar { it.uppercaseChar() }})",
                style = LumiTypography.subheading.copy(fontSize = 13.sp)
            )
            Text(
                text = "Edit bounded policy fields. Preview impact before save. Current task constraints still override role defaults.",
                style = LumiTypography.body.copy(color = LumiColors.textSecondary, fontSize = 11.sp)
            )
            if (protected.isNotEmpty()) {
                TwinControlListCard(
                    title = "Protected fields",
                    items = protected.map { "${it.key}: ${it.reason}" }
                )
            }
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                DelegationMode.entries.forEach { mode ->
                    val selected = delegationMode == mode.name
                    Text(
                        text = mode.name.lowercase().replace('_', ' '),
                        color = if (selected) Color(0xFF0C2033) else Color(0xFFB7D9F3),
                        fontSize = 11.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(if (selected) Color(0xFF67D0FF) else Color(0x1A88BCE0))
                            .clickable(enabled = editable.delegationMode) {
                                delegationMode = mode.name
                            }
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Require confirmation token for external spend", style = LumiTypography.label)
                Switch(
                    checked = requiresToken,
                    onCheckedChange = { requiresToken = it },
                    enabled = editable.approvalRequirements
                )
            }
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Cloud sync allowed", style = LumiTypography.label)
                Switch(
                    checked = cloudSyncAllowed,
                    onCheckedChange = { cloudSyncAllowed = it },
                    enabled = editable.cloudSyncAllowance
                )
            }
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("External fulfillment enabled", style = LumiTypography.label)
                Switch(
                    checked = externalAllowed,
                    onCheckedChange = { externalAllowed = it },
                    enabled = editable.externalFulfillment
                )
            }
            OutlinedTextField(
                value = autoBudgetText,
                onValueChange = { autoBudgetText = it },
                label = { Text("Auto-approval budget", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.approvalThresholds
            )
            OutlinedTextField(
                value = maxBudgetText,
                onValueChange = { maxBudgetText = it },
                label = { Text("Max external budget", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.budgetAndAffordability
            )
            OutlinedTextField(
                value = sharingMode,
                onValueChange = { sharingMode = it },
                label = { Text("Data sharing mode", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.dataSharingScope
            )
            OutlinedTextField(
                value = allowedScopesText,
                onValueChange = { allowedScopesText = it },
                label = { Text("Allowed data scopes (comma separated)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.dataSharingScope
            )
            OutlinedTextField(
                value = trustedTagsText,
                onValueChange = { trustedTagsText = it },
                label = { Text("Trusted provider tags (comma separated)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.trustedProviderPreferences
            )
            OutlinedTextField(
                value = blockedTagsText,
                onValueChange = { blockedTagsText = it },
                label = { Text("Blocked provider tags (comma separated)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.trustedProviderPreferences
            )
            OutlinedTextField(
                value = riskTolerance,
                onValueChange = { riskTolerance = it },
                label = { Text("Risk tolerance (low|medium|high)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.riskPreference
            )
            OutlinedTextField(
                value = maxCostPerStep,
                onValueChange = { maxCostPerStep = it },
                label = { Text("Max cost per step (low|mid|high)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.budgetAndAffordability
            )
            OutlinedTextField(
                value = externalPreference.lowercase().replace('_', ' '),
                onValueChange = { externalPreference = it.uppercase().replace(' ', '_') },
                label = { Text("External preference (internal_first|balanced|external_preferred)", fontSize = 11.sp) },
                modifier = Modifier.fillMaxWidth(),
                enabled = editable.externalFulfillment
            )

            val draft = RolePolicyDraft(
                delegationMode = runCatching { DelegationMode.valueOf(delegationMode) }.getOrNull(),
                requiresExplicitConfirmationForHighRisk = true,
                requiresConfirmationTokenForExternalSpend = requiresToken,
                autoApprovalBudgetLimit = autoBudgetText.trim().takeIf { it.isNotBlank() }?.toDoubleOrNull(),
                maxExternalBudget = maxBudgetText.trim().takeIf { it.isNotBlank() }?.toDoubleOrNull(),
                sharingMode = sharingMode.trim(),
                allowedScopes = allowedScopesText.split(",").map { it.trim() }.filter { it.isNotBlank() },
                cloudSyncAllowed = cloudSyncAllowed,
                trustedProviderTags = trustedTagsText.split(",").map { it.trim() }.filter { it.isNotBlank() },
                blockedProviderTags = blockedTagsText.split(",").map { it.trim() }.filter { it.isNotBlank() },
                riskToleranceDefault = riskTolerance.trim().ifBlank { null },
                maxCostPerStepDefault = maxCostPerStep.trim().ifBlank { null },
                externalFulfillmentAllowed = externalAllowed,
                externalFulfillmentPreference = runCatching {
                    ExternalFulfillmentPreference.valueOf(externalPreference.trim().uppercase().replace(' ', '_'))
                }.getOrNull()
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TextButton(
                    onClick = {
                        previewLines = buildPreviewLines(
                            effectivePolicy.copy(
                                preferences = effectivePolicy.preferences.copy(
                                    riskToleranceDefault = draft.riskToleranceDefault,
                                    maxCostPerStepDefault = draft.maxCostPerStepDefault,
                                    trustedProviderTags = draft.trustedProviderTags ?: effectivePolicy.preferences.trustedProviderTags,
                                    blockedProviderTags = draft.blockedProviderTags ?: effectivePolicy.preferences.blockedProviderTags,
                                    externalFulfillmentAllowed = draft.externalFulfillmentAllowed ?: effectivePolicy.preferences.externalFulfillmentAllowed,
                                    externalFulfillmentPreference = draft.externalFulfillmentPreference ?: effectivePolicy.preferences.externalFulfillmentPreference
                                ),
                                approvalPolicy = effectivePolicy.approvalPolicy.copy(
                                    delegationMode = draft.delegationMode ?: effectivePolicy.approvalPolicy.delegationMode,
                                    requiresConfirmationTokenForExternalSpend = draft.requiresConfirmationTokenForExternalSpend
                                        ?: effectivePolicy.approvalPolicy.requiresConfirmationTokenForExternalSpend,
                                    autoApprovalBudgetLimit = draft.autoApprovalBudgetLimit
                                        ?: effectivePolicy.approvalPolicy.autoApprovalBudgetLimit,
                                    maxExternalBudget = draft.maxExternalBudget ?: effectivePolicy.approvalPolicy.maxExternalBudget
                                ),
                                dataPolicy = effectivePolicy.dataPolicy.copy(
                                    sharingMode = draft.sharingMode ?: effectivePolicy.dataPolicy.sharingMode,
                                    allowedScopes = draft.allowedScopes ?: effectivePolicy.dataPolicy.allowedScopes,
                                    cloudSyncAllowed = draft.cloudSyncAllowed ?: effectivePolicy.dataPolicy.cloudSyncAllowed
                                ),
                                delegationPolicy = effectivePolicy.delegationPolicy.copy(
                                    mode = draft.delegationMode ?: effectivePolicy.delegationPolicy.mode
                                )
                            )
                        )
                    }
                ) {
                    Text("Preview impact", fontSize = 11.sp)
                }
                Button(
                    onClick = {
                        saving = true
                        onSaveRolePolicyDraft(role, draft) { result ->
                            saving = false
                            validationLines = result.validation.issues.map { it.message }
                            previewLines = result.validation.previewLines.ifEmpty { previewLines }
                            result.effectivePolicy?.let(syncFromPolicy)
                            saveMessage = if (result.saved) {
                                "Policy saved. Future runs will use this role policy."
                            } else {
                                "Policy save blocked. Fix validation issues and retry."
                            }
                        }
                    },
                    enabled = !saving
                ) {
                    Text(if (saving) "Saving..." else "Save policy", fontSize = 11.sp)
                }
                TextButton(
                    onClick = {
                        saving = true
                        onResetRolePolicy(role) { result ->
                            saving = false
                            validationLines = result.validation.issues.map { it.message }
                            previewLines = result.validation.previewLines.ifEmpty { previewLines }
                            result.effectivePolicy?.let(syncFromPolicy)
                            saveMessage = if (result.saved) {
                                "Policy reset to role defaults."
                            } else {
                                "Reset failed. Try again."
                            }
                        }
                    },
                    enabled = !saving
                ) {
                    Text("Reset", fontSize = 11.sp)
                }
            }

            if (saveMessage != null) {
                Text(
                    text = saveMessage.orEmpty(),
                    style = LumiTypography.label.copy(color = Color(0xFF9DD7FF))
                )
            }
            if (validationLines.isNotEmpty()) {
                TwinControlListCard(
                    title = "Validation",
                    items = validationLines
                )
            }
            TwinControlListCard(
                title = "Preview (what this changes)",
                items = previewLines
            )
        }
    }
}

private fun buildPreviewLines(policy: RolePolicyProfile): List<String> {
    val externalPreference = policy.preferences.externalFulfillmentPreference.name.lowercase().replace('_', ' ')
    return listOf(
        "Delegation default -> ${policy.delegationPolicy.mode.name.lowercase().replace('_', ' ')}",
        "Approval token required -> ${if (policy.approvalPolicy.requiresConfirmationTokenForExternalSpend) "yes" else "no"}",
        "Auto approval budget -> ${policy.approvalPolicy.autoApprovalBudgetLimit ?: 0.0}",
        "Max external budget -> ${policy.approvalPolicy.maxExternalBudget ?: 0.0}",
        "Data scope -> ${policy.dataPolicy.sharingMode} (${policy.dataPolicy.allowedScopes.joinToString(", ").ifBlank { "none" }})",
        "Cloud sync allowed -> ${if (policy.dataPolicy.cloudSyncAllowed) "yes" else "no"}",
        "Provider tags -> trusted [${policy.preferences.trustedProviderTags.joinToString(", ").ifBlank { "none" }}], blocked [${policy.preferences.blockedProviderTags.joinToString(", ").ifBlank { "none" }}]",
        "External fulfillment -> ${if (policy.preferences.externalFulfillmentAllowed) "enabled" else "disabled"} ($externalPreference)"
    )
}

// ═══════════════════════════════════════════════════════════════════
// Private Components
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun ConsensusChip(label: String, value: String, dotColor: Color) {
    Row(
        modifier = Modifier
            .background(
                Brush.horizontalGradient(
                    colors = listOf(Color(0xFF122340), Color(0xFF0D1D38))
                ),
                RoundedCornerShape(20.dp)
            )
            .padding(horizontal = 10.dp, vertical = 5.dp),
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Text(
            "$label: $value",
            style = LumiTypography.label.copy(color = LumiColors.textSecondary)
        )
    }
}

@Composable
private fun TrajectoryStatCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    color: Color
) {
    Box(
        modifier = modifier
            .glassSurface(color = Color(0xCC0D2240), cornerRadius = 12.dp)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                value,
                style = LumiTypography.metric.copy(color = color, fontSize = 16.sp)
            )
            Text(
                label,
                style = LumiTypography.label
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// Data Helpers
// ═══════════════════════════════════════════════════════════════════

private data class PortraitMetric(
    val label: String,
    val value: Float,
    val source: String
)

private fun buildProfileSummary(metrics: List<PortraitMetric>, nickname: String): String {
    val stability = metrics.find { it.label == "Mood Stability" }?.value ?: 0.5f
    val focus = metrics.find { it.label == "Execution Focus" }?.value ?: 0.5f
    val energy = metrics.find { it.label == "Energy Reserve" }?.value ?: 0.5f

    val stabilityDesc = when {
        stability > 0.7f -> "Mood is stable"
        stability > 0.4f -> "Mood is moderate"
        else -> "Mood is volatile"
    }
    val focusDesc = when {
        focus > 0.7f -> "Focus is strong"
        focus > 0.4f -> "Focus is moderate"
        else -> "Focus is scattered"
    }
    val energyDesc = when {
        energy > 0.7f -> "Energy is high"
        energy > 0.4f -> "Energy is moderate"
        else -> "Energy is low"
    }

    return "\"$nickname\" now: $stabilityDesc, $focusDesc, $energyDesc. Avatar evolves continuously across ${metrics.size} core dimensions."
}

private fun buildPortraitDimensions(
    stateVector: DynamicHumanStatePayload?,
    traits: List<TraitScore>
): List<PortraitMetric> {
    val inferredStress = (traitValue(traits, "emotion_stress", "stress") * 100.0).toInt().coerceIn(0, 100)
    val inferredFocus = (traitValue(traits, "focus_stability", "focus", "execution") * 100.0).toInt().coerceIn(0, 100)
    val inferredEnergy = (traitValue(traits, "execution", "deep_task", "adoption") * 100.0).toInt().coerceIn(0, 100)
    val inferredLoad = (traitValue(traits, "context_freshness", "iterative_reasoning") * 100.0).toInt().coerceIn(0, 100)

    val stress = stateVector?.l3?.stressScore?.coerceIn(0, 100) ?: inferredStress
    val focus = stateVector?.l3?.focusScore?.coerceIn(0, 100) ?: inferredFocus
    val energy = ((stateVector?.l2?.energyLevel ?: (inferredEnergy / 100.0)) * 100.0).toInt().coerceIn(0, 100)
    val load = ((stateVector?.l2?.contextLoad ?: (inferredLoad / 100.0)) * 100.0).toInt().coerceIn(0, 100)
    val risk = ((stateVector?.l1?.riskPreference ?: traitValue(traits, "risk", "strategy")) * 100.0).toInt().coerceIn(0, 100)
    val adaptive = ((traitValue(traits, "adaptive", "adapt", "trust", "locale")) * 100.0).toInt().coerceIn(0, 100)

    return listOf(
        PortraitMetric("Mood Stability", ((100 - stress) / 100f), "L3"),
        PortraitMetric("Execution Focus", (focus / 100f), "L3"),
        PortraitMetric("Energy Reserve", (energy / 100f), "L2"),
        PortraitMetric("Context Load", (load / 100f), "L2"),
        PortraitMetric("Risk Decisions", (risk / 100f), "L1"),
        PortraitMetric("Communication Adaptability", (adaptive / 100f), "Traits")
    )
}

private fun traitGroups(traits: List<TraitScore>): Map<String, List<TraitScore>> {
    val personality = traits.filter { matchTrait(it.key, "self_model", "risk", "trust", "memory") }
        .sortedByDescending { it.value }
        .take(4)
    val capability = traits.filter { matchTrait(it.key, "orchestration", "strategy", "reasoning", "negotiation", "insight") }
        .sortedByDescending { it.value }
        .take(4)
    val interaction = traits.filter { matchTrait(it.key, "adaptive", "adapt", "locale", "communication") }
        .sortedByDescending { it.value }
        .take(4)

    return linkedMapOf(
        "Personality & Values" to personality,
        "Capability & Execution" to capability,
        "Relationship & Communication" to interaction
    )
}

private fun buildCompletionTips(
    stateVector: DynamicHumanStatePayload?,
    cloudEnabled: Boolean,
    traits: List<TraitScore>
): List<String> {
    val tips = mutableListOf<String>()
    if (stateVector == null) {
        tips += "Complete 3-5 real interactions to establish L1/L2/L3 baseline states."
    } else {
        if (stateVector.l3.focusScore < 45) {
            tips += "Current focus is low. Use short-task mode to improve avatar precision."
        }
        if (stateVector.l2.contextLoad > 0.7) {
            tips += "Context load is high. Add task priority to avoid avatar drift."
        }
    }
    if (traits.size < 6) {
        tips += "Accept/edit drafts to refine communication style, risk preference, and other key dimensions."
    }
    tips += if (cloudEnabled) {
        "Redacted cloud sync is enabled for cross-device continuity."
    } else {
        "Enable redacted cloud sync in Settings for cross-device sync."
    }
    if (tips.size < 3) {
        tips += "Complete end-to-end tasks in LIX and Agent to improve avatar stability."
    }
    return tips.take(4)
}

private fun calculateCompletion(
    stateVector: DynamicHumanStatePayload?,
    traits: List<TraitScore>,
    cloudEnabled: Boolean
): Float {
    var score = 0f
    if (stateVector != null) score += 0.3f
    score += (traits.size.coerceAtMost(8) / 8f) * 0.4f
    if (cloudEnabled) score += 0.1f
    if (stateVector?.l3?.focusScore?.let { it > 45 } == true) score += 0.1f
    if (stateVector?.l2?.contextLoad?.let { it < 0.7 } == true) score += 0.1f
    return score.coerceIn(0f, 1f)
}

private fun matchTrait(key: String, vararg keywords: String): Boolean {
    val lower = key.lowercase(Locale.getDefault())
    return keywords.any { lower.contains(it) }
}

private fun traitValue(traits: List<TraitScore>, vararg keywords: String): Double {
    return traits
        .filter { trait -> keywords.any { keyword -> trait.key.lowercase(Locale.getDefault()).contains(keyword) } }
        .maxOfOrNull { it.value }
        ?: 0.5
}

private fun formatSyncTime(timestampMs: Long?): String {
    if (timestampMs == null || timestampMs <= 0L) return "Not synced yet"
    val formatter = SimpleDateFormat("MM-dd HH:mm", Locale.getDefault())
    return runCatching { formatter.format(Date(timestampMs)) }.getOrDefault("Unknown")
}

private fun readableTraitLabel(rawKey: String): String {
    val key = rawKey.lowercase(Locale.getDefault())
    return when {
        key.contains("self_modeling") || key.contains("self_model") -> "Self-modeling"
        key.contains("orchestration") -> "Orchestration"
        key.contains("negotiation") -> "Negotiation"
        key.contains("strategy") -> "Strategic Thinking"
        key.contains("locale") -> "Locale"
        key.contains("reasoning") -> "Reasoning depth"
        key.contains("adaptive") || key.contains("adapt") -> "Adaptive"
        key.contains("trust") -> "Trust Stability"
        key.contains("insight") -> "Insight"
        key.contains("memory") -> "Long-term memory"
        key.contains("risk") -> "Risk Preference"
        else -> rawKey
    }
}

private fun parseAuraColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: Exception) {
        Color(0xFF34D399)
    }
}

private fun dimensionColor(index: Int): Color = when (index) {
    0 -> Color(0xFF34D399)  // Emotional stability - green
    1 -> Color(0xFF41A6FF)  // Focus - blue
    2 -> Color(0xFFFBBF24)  // Energy - gold
    3 -> Color(0xFFE879F9)  // Context load - purple
    4 -> Color(0xFFF97316)  // Risk - orange
    5 -> Color(0xFF67D0FF)  // Adaptability - cyan
    else -> Color(0xFF94A3B8)
}

private fun traitColor(group: String, index: Int): Color = when {
    group.contains("Personality") -> when (index) {
        0 -> Color(0xFF34D399); 1 -> Color(0xFF41A6FF); 2 -> Color(0xFFFBBF24); else -> Color(0xFF94A3B8)
    }
    group.contains("Capability") -> when (index) {
        0 -> Color(0xFFE879F9); 1 -> Color(0xFFF97316); 2 -> Color(0xFF67D0FF); else -> Color(0xFF94A3B8)
    }
    else -> when (index) {
        0 -> Color(0xFF41A6FF); 1 -> Color(0xFF34D399); 2 -> Color(0xFFFBBF24); else -> Color(0xFF94A3B8)
    }
}

private fun energyColor(label: String): Color = when (label.lowercase()) {
    "high", "energized" -> Color(0xFF34D399)
    "low" -> Color(0xFFF87171)
    else -> Color(0xFFFBBF24)
}

private fun moodColor(label: String): Color = when (label.lowercase()) {
    "positive" -> Color(0xFF34D399)
    "negative" -> Color(0xFFF87171)
    else -> Color(0xFF41A6FF)
}

private fun focusColor(label: String): Color = when (label.lowercase()) {
    "focused" -> Color(0xFF34D399)
    "scattered" -> Color(0xFFF87171)
    else -> Color(0xFFFBBF24)
}
