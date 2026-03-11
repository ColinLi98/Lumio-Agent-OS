package com.lumi.keyboard.ui.components

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.verticalScroll
import com.lumi.appbackend.BuildConfig
import com.lumi.coredomain.contract.AgentAction
import com.lumi.coredomain.contract.AgentCard
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.TaskTrackPayload
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.ui.model.ExecutionReceiptFormatter
import com.lumi.keyboard.ui.model.ExternalVisibilityTone
import com.lumi.keyboard.ui.model.RoleTraceFormatter
import com.lumi.keyboard.ui.model.buildResultHighlights
import com.lumi.keyboard.ui.model.resolvePrimaryResultText
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiGradients
import com.lumi.keyboard.ui.theme.LumiShapes
import com.lumi.keyboard.ui.theme.LumiSpacing
import kotlinx.coroutines.delay
import java.util.Locale

// ============================================================================
// Home Overview
// ============================================================================

@Composable
fun HomeOverviewCard(
    summary: DigitalSoulSummary?,
    payload: ModulePayload.HomePayload?
) {
    GlassCard {
        Column(
            modifier = Modifier.padding(LumiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
        ) {
            SectionHeader("Home Overview (App Internal Core)", LumiColors.homeAccent)
            Text(
                "Avatar label: ${payload?.profileLabel ?: summary?.profileLabel ?: "Not set"}",
                color = LumiColors.textSecondary,
                fontSize = 13.sp
            )
            Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.md)) {
                StatChip(
                    label = "Completion",
                    value = "${((payload?.completionRate ?: 0.0) * 100).toInt()}%",
                    color = LumiColors.positive
                )
                StatChip(
                    label = "Pending",
                    value = "${payload?.pendingTasks ?: 0}",
                    color = LumiColors.warning
                )
            }
            val snapshot = payload?.snapshot
            if (snapshot != null) {
                Row(
                    modifier = Modifier
                        .background(LumiColors.accent.copy(alpha = 0.08f), LumiShapes.pill)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(statusColor(snapshot.status.name), CircleShape)
                    )
                    Text(
                        "${snapshot.status.name.lowercase()} · ${snapshot.headline}",
                        color = LumiColors.textTertiary,
                        fontSize = 12.sp
                    )
                }
                snapshot.keyMetrics.entries.take(4).forEach { (key, value) ->
                    Text(
                        "• ${readableHomeMetricKey(key)}: $value",
                        color = LumiColors.textMuted,
                        fontSize = 11.sp
                    )
                }
            }
            if (!payload?.quickRoutes.isNullOrEmpty()) {
                Text(
                    "Quick Routes：${payload?.quickRoutes?.joinToString(" / ")}",
                    color = LumiColors.textMuted,
                    fontSize = 11.sp
                )
            }
        }
    }
}

// ============================================================================
// Avatar Readable Card
// ============================================================================

@Composable
fun AvatarReadableCard(
    summary: DigitalSoulSummary?,
    payload: ModulePayload.AvatarPayload?
) {
    val traits = payload?.topTraits
        ?.take(8)
        ?.ifEmpty { summary?.topTraits.orEmpty().take(8) }
        ?: summary?.topTraits.orEmpty().take(8)
    val profileLabel = payload?.profileLabel
        ?.takeIf { it.isNotBlank() }
        ?: summary?.profileLabel
        ?: "Not set"
    val cloudSync = payload?.cloudSyncEnabled ?: summary?.cloudSyncEnabled ?: false

    GlassCard {
        Column(
            modifier = Modifier.padding(LumiSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
        ) {
            SectionHeader("Preferences & Permissions (Readable Mode)", LumiColors.avatarAccent)

            // Profile label with improved styling
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Profile label: $profileLabel", color = LumiColors.textSecondary, fontSize = 13.sp)
            }

            // Persona summary paragraph
            if (traits.isNotEmpty()) {
                val topTraitNames = traits.take(3).joinToString("、") { readableTraitLabel(it.key) }
                Text(
                    "\"$profileLabel\" preferences are inferred across ${traits.size} dimensions. Top preference signals: $topTraitNames.",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
            }

            Row(
                modifier = Modifier
                    .background(
                        (if (cloudSync) LumiColors.positiveMuted else LumiColors.accent.copy(alpha = 0.08f)),
                        LumiShapes.pill
                    )
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(
                            if (cloudSync) LumiColors.positive else LumiColors.accent,
                            CircleShape
                        )
                )
                Text(
                    if (cloudSync) "Cloud sync authorized (scoped + redacted)" else "Local-only storage (default)",
                    color = if (cloudSync) LumiColors.positive else LumiColors.textTertiary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            if (traits.isEmpty()) {
                Text(
                    "No stable preference traits yet. Continue interacting in WORK/IME to build continuity.",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
            } else {
                traits.forEach { trait ->
                    val progress = trait.value.coerceIn(0.0, 1.0).toFloat()
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                readableTraitLabel(trait.key),
                                color = LumiColors.textSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                "${(progress * 100).toInt()}% · ${traitLevel(progress)}",
                                color = LumiColors.avatarAccent,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth(),
                            color = LumiColors.avatarAccent,
                            trackColor = LumiColors.border,
                            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                        )
                    }
                }
            }
        }
    }
}

// ============================================================================
// Snapshot Card
// ============================================================================

@Composable
fun SnapshotCard(snapshot: AgentResponse) {
    GlassCard {
        Column(modifier = Modifier.padding(LumiSpacing.lg)) {
            SectionHeader("Module Snapshot", LumiColors.accent)
            Text(
                snapshot.summary ?: "Snapshot ready",
                color = LumiColors.textSecondary,
                fontSize = 13.sp
            )
            val lines = payloadLines(snapshot.payload)
            if (lines.isNotEmpty()) {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                lines.forEach { line ->
                    Text(line, color = LumiColors.textTertiary, fontSize = 12.sp)
                }
            }
        }
    }
}

// ============================================================================
// Response History
// ============================================================================

@Composable
fun ResponseHistoryCard(
    module: AppModule,
    history: List<AgentResponse>,
    selectedIndex: Int,
    developerMode: Boolean,
    onSelect: (Int) -> Unit,
    onClearHistory: () -> Unit,
    onExportSummary: () -> Unit
) {
    val accent = LumiGradients.moduleAccentColor(module)
    var filter by remember(module) { mutableStateOf(HistoryFilter.ALL) }
    var sortMode by remember(module) { mutableStateOf(HistorySort.NEWEST) }
    var query by remember(module) { mutableStateOf("") }
    val normalizedQuery = query.trim().lowercase(Locale.getDefault())
    val baseEntries = history.take(20).mapIndexed { index, response -> index to response }
    val entries = if (developerMode) {
        baseEntries
            .filter { (_, response) -> filter.matches(response) }
            .filter { (_, response) ->
                if (normalizedQuery.isBlank()) return@filter true
                val trace = response.traceId.lowercase(Locale.getDefault())
                val summary = (resolvePrimaryResultText(response) ?: "").lowercase(Locale.getDefault())
                val status = response.status.name.lowercase(Locale.getDefault())
                trace.contains(normalizedQuery) || summary.contains(normalizedQuery) || status.contains(normalizedQuery)
            }
            .let { list ->
                when (sortMode) {
                    HistorySort.NEWEST -> list
                    HistorySort.LATENCY_DESC -> list.sortedByDescending { (_, response) -> response.latencyMs }
                    HistorySort.CONFIDENCE_DESC -> list.sortedByDescending { (_, response) -> response.confidence }
                }
            }
    } else {
        baseEntries
    }

    GlassCard {
        Column(modifier = Modifier.padding(LumiSpacing.md)) {
            SectionHeader("${module.label} Reply Manager", accent)

            if (developerMode) {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("Search trace / summary / status", color = LumiColors.textMuted) },
                    shape = LumiShapes.cardSmall,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = accent,
                        unfocusedBorderColor = LumiColors.border,
                        cursorColor = accent,
                        focusedTextColor = LumiColors.textPrimary,
                        unfocusedTextColor = LumiColors.textSecondary
                    )
                )

                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                    HistoryFilter.entries.forEach { item ->
                        FilterChip(
                            label = item.label,
                            selected = filter == item,
                            accentColor = accent,
                            onClick = { filter = item }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                    HistorySort.entries.forEach { item ->
                        FilterChip(
                            label = item.label,
                            selected = sortMode == item,
                            accentColor = accent,
                            onClick = { sortMode = item }
                        )
                    }
                }
            }

            if (developerMode && history.isNotEmpty()) {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                DeveloperHistorySummary(history = history)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Results ${entries.size}/${history.size}",
                    color = LumiColors.textMuted,
                    fontSize = 10.sp
                )
                Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                    if (developerMode) {
                        IconButton(onClick = onExportSummary, enabled = history.isNotEmpty()) {
                            Icon(
                                Icons.Filled.Download,
                                contentDescription = "Export",
                                modifier = Modifier.size(18.dp),
                                tint = if (history.isNotEmpty()) accent else LumiColors.textMuted
                            )
                        }
                    }
                    IconButton(onClick = onClearHistory, enabled = history.isNotEmpty()) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Clear",
                            modifier = Modifier.size(18.dp),
                            tint = if (history.isNotEmpty()) LumiColors.error else LumiColors.textMuted
                        )
                    }
                }
            }

            if (history.isEmpty()) {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                Text(
                    "No results on this page yet.",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
            } else {
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                if (entries.isEmpty()) {
                    Text(
                        "No results under current filters.",
                        color = LumiColors.textTertiary,
                        fontSize = 11.sp
                    )
                }

                var lastTrace: String? = null
                entries.forEach { (index, response) ->
                    val selected = index == selectedIndex
                    val trace = response.traceId.take(8)
                    val fallbackTitle = resolvePrimaryResultText(response) ?: "Results ${index + 1}"
                    val receiptTitle = ExecutionReceiptFormatter.activityTitle(response, fallbackTitle)
                    if (developerMode && trace != lastTrace) {
                        lastTrace = trace
                        Text(
                            text = "Trace $trace",
                            color = LumiColors.textMuted,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(bottom = 4.dp, top = 4.dp)
                        )
                    }
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = LumiSpacing.sm)
                            .then(
                                if (selected) {
                                    Modifier.drawBehind {
                                        drawRoundRect(
                                            color = accent.copy(alpha = 0.4f),
                                            cornerRadius = CornerRadius(12.dp.toPx()),
                                            style = Stroke(width = 1.5.dp.toPx())
                                        )
                                    }
                                } else Modifier
                            )
                            .clickable { onSelect(index) },
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected) accent.copy(alpha = 0.12f) else LumiColors.cardSurfaceElevated
                        ),
                        shape = LumiShapes.cardSmall
                    ) {
                        Column(modifier = Modifier.padding(LumiSpacing.md)) {
                            Text(
                                text = receiptTitle,
                                color = LumiColors.textPrimary,
                                fontSize = 12.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(
                                            statusColor(response.status.name),
                                            CircleShape
                                        )
                                )
                                Text(
                                    text = if (developerMode) {
                                        "${readableResponseStatus(response.status.name)} · ${response.module.name.lowercase()} · ${response.latencyMs}ms · conf ${(response.confidence.coerceIn(0.0, 1.0) * 100).toInt()}%"
                                    } else {
                                        readableResponseStatus(response.status.name)
                                    },
                                    color = LumiColors.textMuted,
                                    fontSize = 10.sp
                                )
                            }
                            RoleTraceFormatter.headline(response)?.let { headline ->
                                Text(
                                    text = headline,
                                    color = LumiColors.textTertiary,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            ExecutionReceiptFormatter.externalSummaryHeadline(response)?.let { externalHeadline ->
                                Text(
                                    text = "External Fulfillment: $externalHeadline",
                                    color = LumiColors.warning,
                                    fontSize = 10.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            RoleTraceFormatter.impactLines(response, maxItems = 1).firstOrNull()?.let { impact ->
                                Text(
                                    text = impact,
                                    color = LumiColors.textMuted,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            ExecutionReceiptFormatter.summaryLines(response, maxItems = 1).firstOrNull()?.let { line ->
                                Text(
                                    text = line,
                                    color = LumiColors.textMuted,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            if (developerMode) {
                                Text(
                                    text = "trace ${response.traceId.take(12)}",
                                    color = LumiColors.textMuted,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ============================================================================
// Response Detail
// ============================================================================

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ResponseDetailCard(
    module: AppModule,
    response: AgentResponse,
    developerMode: Boolean,
    onUseDraft: (String) -> Unit,
    onOpenCard: (AgentCard) -> Unit,
    onOpenAction: (AgentAction) -> Unit,
    onOpenDeepLink: (String) -> Unit
) {
    val accent = LumiGradients.moduleAccentColor(module)
    val chatPayload = response.payload as? ModulePayload.ChatPayload
    val resolvedSummary = resolvePrimaryResultText(response = response, payloadOverride = chatPayload) ?: "Completed"
    val summaryHighlights = buildResultHighlights(resolvedSummary, maxItems = 4)
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    val keyPoints = if (summaryHighlights.isNotEmpty()) summaryHighlights else listOf(resolvedSummary)
    var detailsExpanded by remember(response.traceId) { mutableStateOf(false) }
    var keyPointsCopied by remember(response.traceId) { mutableStateOf(false) }
    var pendingDangerActionId by remember(response.traceId) { mutableStateOf<String?>(null) }
    var draftPreview by remember(response.traceId) { mutableStateOf<String?>(null) }
    var evidencePreview by remember(response.traceId) { mutableStateOf<AgentCard?>(null) }
    var summarySectionExpanded by remember(module) {
        mutableStateOf(ResponseDetailSectionStateStore.summaryExpanded(context, module))
    }
    var actionsSectionExpanded by remember(module) {
        mutableStateOf(ResponseDetailSectionStateStore.actionsExpanded(context, module))
    }
    var evidenceSectionExpanded by remember(module) {
        mutableStateOf(ResponseDetailSectionStateStore.evidenceExpanded(context, module))
    }
    val allSectionsExpanded = summarySectionExpanded && actionsSectionExpanded && evidenceSectionExpanded

    fun setAllSections(expanded: Boolean) {
        summarySectionExpanded = expanded
        actionsSectionExpanded = expanded
        evidenceSectionExpanded = expanded
        ResponseDetailSectionStateStore.setAllExpanded(context, module, expanded)
    }

    LaunchedEffect(keyPointsCopied) {
        if (keyPointsCopied) {
            delay(1200)
            keyPointsCopied = false
        }
    }

    GlassCard {
        Column(
            modifier = Modifier
                .padding(LumiSpacing.lg)
                .animateContentSize(),
            verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
        ) {
            Box(
                modifier = Modifier.combinedClickable(
                    onClick = {},
                    onLongClick = { setAllSections(!allSectionsExpanded) }
                )
            ) {
                SectionHeader("${module.label} Current Result", accent)
            }
            Text(
                text = if (allSectionsExpanded) {
                    "Long press title to collapse all sections"
                } else {
                    "Long press title to expand all sections"
                },
                color = LumiColors.textMuted,
                fontSize = 10.sp
            )
            Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                FilterChip(
                    label = "Summary",
                    selected = summarySectionExpanded,
                    accentColor = accent,
                    onClick = {
                        summarySectionExpanded = !summarySectionExpanded
                        ResponseDetailSectionStateStore.setSummaryExpanded(context, module, summarySectionExpanded)
                    }
                )
                FilterChip(
                    label = "Actions",
                    selected = actionsSectionExpanded,
                    accentColor = accent,
                    onClick = {
                        actionsSectionExpanded = !actionsSectionExpanded
                        ResponseDetailSectionStateStore.setActionsExpanded(context, module, actionsSectionExpanded)
                    }
                )
                FilterChip(
                    label = "Evidence",
                    selected = evidenceSectionExpanded,
                    accentColor = accent,
                    onClick = {
                        evidenceSectionExpanded = !evidenceSectionExpanded
                        ResponseDetailSectionStateStore.setEvidenceExpanded(context, module, evidenceSectionExpanded)
                    }
                )
            }

            // Summary
            AnimatedVisibility(visible = summarySectionExpanded, enter = fadeIn(), exit = fadeOut()) {
                Column(verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)) {
                    Text(
                        resolvedSummary,
                        color = LumiColors.textSecondary,
                        fontSize = 13.sp
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        FilterChip(
                            label = if (detailsExpanded) "Hide details" else "Show details",
                            selected = detailsExpanded,
                            accentColor = accent,
                            onClick = { detailsExpanded = !detailsExpanded }
                        )
                        Card(
                            modifier = Modifier
                                .heightIn(min = 36.dp)
                                .clickable {
                                    clipboardManager.setText(
                                        AnnotatedString(
                                            keyPoints.joinToString(separator = "\n") { "• $it" }
                                        )
                                    )
                                    keyPointsCopied = true
                                },
                            colors = CardDefaults.cardColors(
                                containerColor = if (keyPointsCopied) {
                                    LumiColors.positive.copy(alpha = 0.2f)
                                } else {
                                    LumiColors.cardSurfaceElevated
                                }
                            ),
                            shape = LumiShapes.pill
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.ContentCopy,
                                    contentDescription = null,
                                    tint = if (keyPointsCopied) LumiColors.positive else LumiColors.textTertiary,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = if (keyPointsCopied) "Copied" else "Copy points",
                                    color = if (keyPointsCopied) LumiColors.positive else LumiColors.textTertiary,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = LumiColors.cardSurfaceElevated),
                        shape = LumiShapes.cardSmall
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = LumiSpacing.sm, vertical = LumiSpacing.xs),
                            verticalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                        ) {
                            StatChip(
                                label = "Status",
                                value = readableResponseStatus(response.status.name),
                                color = statusColor(response.status.name)
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                                StatChip(
                                    label = "Confidence",
                                    value = "${(response.confidence.coerceIn(0.0, 1.0) * 100).toInt()}%",
                                    color = accent
                                )
                                StatChip(
                                    label = "Latency",
                                    value = "${response.latencyMs}ms",
                                    color = LumiColors.textMuted
                                )
                            }
                        }
                    }
                    if (summaryHighlights.isNotEmpty()) {
                        val highlightLines = if (detailsExpanded) summaryHighlights else summaryHighlights.take(1)
                        highlightLines.forEach { line ->
                            Text(
                                text = "• $line",
                                color = LumiColors.textTertiary,
                                fontSize = 11.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (!detailsExpanded && summaryHighlights.size > highlightLines.size) {
                            Text(
                                text = "+${summaryHighlights.size - highlightLines.size} more details",
                                color = LumiColors.textMuted,
                                fontSize = 10.sp
                            )
                        }
                    }
                    if (!response.errorCode.isNullOrBlank()) {
                        ErrorBadge(response.errorCode!!)
                    }
                    ExecutionReceiptSummaryBlock(response = response)
                    AnimatedVisibility(
                        visible = detailsExpanded && developerMode,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)) {
                            DeveloperExecutionOverviewCard(
                                response = response,
                                selectedAgentCount = chatPayload?.selectedAgents?.size ?: 0
                            )

                            // Payload details
                            val pLines = payloadLines(response.payload)
                            pLines.forEach { line ->
                                Text(line, color = LumiColors.textTertiary, fontSize = 12.sp)
                            }
                            RoleTraceFormatter.headline(response)?.let { headline ->
                                Text(headline, color = LumiColors.textTertiary, fontSize = 12.sp)
                            }
                            RoleTraceFormatter.impactLines(response, maxItems = 3).forEach { impact ->
                                Text("• $impact", color = LumiColors.textMuted, fontSize = 11.sp)
                            }

                            // Routing decision
                            response.routingDecision?.let { decision ->
                                SectionDivider()
                                IconLabel(
                                    icon = Icons.Filled.Route,
                                    label = "1) Routing Decision · ${readableRoutingMode(decision.mode.name)}",
                                    color = LumiColors.accentGlow
                                )
                                decision.reasonCodes.take(4).forEach { reason ->
                                    Text("• ${readableRoutingReason(reason)}", color = LumiColors.textTertiary, fontSize = 11.sp)
                                }
                            }

                            // Task graph
                            response.taskGraph?.let { graph ->
                                if (graph.tasks.isNotEmpty()) {
                                    SectionDivider()
                                    IconLabel(
                                        icon = Icons.Filled.Layers,
                                        label = "2) Task Graph (${graph.tasks.size})",
                                        color = LumiColors.accentGlow
                                    )
                                    graph.tasks.take(5).forEachIndexed { index, task ->
                                        Text(
                                            "${index + 1}. ${task.title} · ${task.requiredCapabilities.joinToString("+").ifBlank { "general" }}",
                                            color = LumiColors.textTertiary,
                                            fontSize = 11.sp
                                        )
                                    }
                                    if (graph.criticalPath.isNotEmpty()) {
                                        Text(
                                            "Critical Path: ${graph.criticalPath.joinToString(" → ")}",
                                            color = LumiColors.textMuted,
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }

                            // Selected agents
                            if (!chatPayload?.selectedAgents.isNullOrEmpty()) {
                                SectionDivider()
                                IconLabel(
                                    icon = Icons.AutoMirrored.Filled.OpenInNew,
                                    label = "3) Agent Allocation (${chatPayload?.selectedAgents?.size ?: 0})",
                                    color = LumiColors.accent
                                )
                                chatPayload?.selectedAgents?.take(6)?.forEach { selected ->
                                    Text(
                                        "• ${selected.taskId.ifBlank { "task" }} → ${readableAgentId(selected.agentId)}",
                                        color = LumiColors.textTertiary,
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            // Skill invocations
                            if (response.skillInvocations.isNotEmpty()) {
                                SectionDivider()
                                IconLabel(
                                    icon = Icons.Filled.Extension,
                                    label = "4) Skills Invocation Track (${response.skillInvocations.size})",
                                    color = LumiColors.positive
                                )
                                response.skillInvocations.take(6).forEach { skill ->
                                    Text(
                                        "• ${skill.skillId} · ${readableSkillSource(skill.source.name)}${trustedSkillBadgeSuffix(skill.source.name, skill.skillId)} · ${readableResponseStatus(skill.status.name)} · ${skill.latencyMs}ms · ev:${skill.evidenceCount}",
                                        color = LumiColors.textTertiary,
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            // Skill gap
                            response.skillGapReport?.let { gap ->
                                SectionDivider()
                                IconLabel(
                                    icon = Icons.Filled.Warning,
                                    label = "5) Skill Gap: ${gap.missingCapability}",
                                    color = LumiColors.warning
                                )
                                Text(
                                    "${gap.frequency7d}/7d · ${gap.recommendedAction.name.lowercase()}",
                                    color = LumiColors.textTertiary,
                                    fontSize = 11.sp
                                )
                            }

                            // Skill acquisition loop details
                            if (response.skillRequirements.isNotEmpty() || response.skillAcquisitionDecisions.isNotEmpty()) {
                                SectionDivider()
                                IconLabel(
                                    icon = Icons.Filled.Hub,
                                    label = "6) Skill Acquisition (${response.skillAcquisitionDecisions.size})",
                                    color = LumiColors.accentGlow
                                )

                                val decisionMap = response.skillAcquisitionDecisions.associateBy { it.taskId }
                                response.skillRequirements.take(6).forEach { requirement ->
                                    val decision = decisionMap[requirement.taskId]
                                    val selected = decision?.selectedSkillId ?: "market_fallback"
                                    Text(
                                        "• ${requirement.capability} -> $selected (${decision?.status?.name?.lowercase() ?: "pending"})",
                                        color = LumiColors.textTertiary,
                                        fontSize = 11.sp
                                    )
                                }

                                if (response.skillCanaryReports.isNotEmpty()) {
                                    val passed = response.skillCanaryReports.count { it.passed }
                                    Text(
                                        "Canary: $passed/${response.skillCanaryReports.size} passed",
                                        color = LumiColors.textMuted,
                                        fontSize = 10.sp
                                    )
                                }
                                if (response.skillPromotionRecords.isNotEmpty()) {
                                    val promoted = response.skillPromotionRecords.count { it.promoted }
                                    Text(
                                        "Promotion: $promoted/${response.skillPromotionRecords.size} approved",
                                        color = LumiColors.textMuted,
                                        fontSize = 10.sp
                                    )
                                }
                            }

                            // Task track
                            chatPayload?.taskTrack?.let { track ->
                                SectionDivider()
                                Text("7) Execution steps", color = LumiColors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                TaskTrackCard(track)
                            }
                        }
                    }
                }
            }

            // Drafts
            if (evidenceSectionExpanded) {
                if (response.drafts.isNotEmpty()) {
                    SectionDivider()
                    IconLabel(
                        icon = Icons.Filled.ContentCopy,
                        label = "Available Drafts",
                        color = LumiColors.accent
                    )
                    response.drafts.take(3).forEach { draft ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .combinedClickable(
                                    onClick = { onUseDraft(draft.text) },
                                    onLongClick = { draftPreview = draft.text }
                                ),
                            colors = CardDefaults.cardColors(
                                containerColor = LumiColors.accent.copy(alpha = 0.08f)
                            ),
                            shape = LumiShapes.cardSmall
                        ) {
                            Column(
                                modifier = Modifier.padding(LumiSpacing.md),
                                verticalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                            ) {
                                Text(
                                    text = draft.text,
                                    color = LumiColors.textPrimary,
                                    fontSize = 12.sp,
                                    maxLines = 3,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                                    TextButton(onClick = { onUseDraft(draft.text) }) {
                                        Text("Insert", fontSize = 10.sp, color = accent)
                                    }
                                    TextButton(
                                        onClick = {
                                            clipboardManager.setText(AnnotatedString(draft.text))
                                        }
                                    ) {
                                        Text("Copy", fontSize = 10.sp, color = accent)
                                    }
                                    TextButton(
                                        onClick = {
                                            sharePlainText(
                                                context = context,
                                                subject = "Lumi Draft",
                                                content = draft.text
                                            )
                                        }
                                    ) {
                                        Text("Share", fontSize = 10.sp, color = accent)
                                    }
                                    TextButton(onClick = { draftPreview = draft.text }) {
                                        Text("Preview", fontSize = 10.sp, color = accent)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Evidence cards
            if (evidenceSectionExpanded && detailsExpanded && developerMode && response.cards.isNotEmpty()) {
                SectionDivider()
                IconLabel(
                    icon = Icons.AutoMirrored.Filled.Article,
                    label = "7) Evidence / Cards",
                    color = LumiColors.accent
                )
                response.cards.take(6).forEach { card ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .combinedClickable(
                                onClick = { onOpenCard(card) },
                                onLongClick = { evidencePreview = card }
                            ),
                        colors = CardDefaults.cardColors(
                            containerColor = LumiColors.cardSurfaceElevated
                        ),
                        shape = LumiShapes.cardSmall
                    ) {
                        Column(
                            modifier = Modifier.padding(LumiSpacing.md),
                            verticalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                        ) {
                            Text(
                                card.title,
                                color = LumiColors.textPrimary,
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.sp
                            )
                            Text(
                                card.summary,
                                color = LumiColors.textTertiary,
                                fontSize = 11.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                                TextButton(onClick = { onOpenCard(card) }) {
                                    Text("Open", fontSize = 10.sp, color = accent)
                                }
                                TextButton(
                                    onClick = {
                                        clipboardManager.setText(AnnotatedString("${card.title}\n${card.summary}"))
                                    }
                                ) {
                                    Text("Copy", fontSize = 10.sp, color = accent)
                                }
                                TextButton(
                                    onClick = {
                                        sharePlainText(
                                            context = context,
                                            subject = "Lumi Evidence",
                                            content = "${card.title}\n${card.summary}"
                                        )
                                    }
                                ) {
                                    Text("Share", fontSize = 10.sp, color = accent)
                                }
                                TextButton(onClick = { evidencePreview = card }) {
                                    Text("Preview", fontSize = 10.sp, color = accent)
                                }
                            }
                        }
                    }
                }
            }

            // Actions
            if (actionsSectionExpanded && response.actions.isNotEmpty()) {
                SectionDivider()
                IconLabel(
                    icon = Icons.Filled.Layers,
                    label = "Actions",
                    color = LumiColors.accent
                )
                response.actions.take(6).forEachIndexed { index, action ->
                    val actionKey = action.id.takeIf { it.isNotBlank() } ?: "${action.type.name}:${index}:${action.label}"
                    val pendingDangerConfirm = pendingDangerActionId == actionKey
                    Button(
                        onClick = {
                            if (action.danger) {
                                if (pendingDangerConfirm) {
                                    pendingDangerActionId = null
                                    onOpenAction(action)
                                } else {
                                    pendingDangerActionId = actionKey
                                }
                            } else {
                                pendingDangerActionId = null
                                onOpenAction(action)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (action.danger)
                                LumiColors.error.copy(alpha = 0.2f)
                            else
                                accent.copy(alpha = 0.15f)
                        ),
                        shape = LumiShapes.button
                    ) {
                        Text(
                            when {
                                action.danger && pendingDangerConfirm -> "${action.label} · tap again to confirm"
                                action.danger -> "${action.label} · high risk"
                                else -> action.label
                            },
                            color = if (action.danger) LumiColors.error else accent
                        )
                    }
                }
                if (pendingDangerActionId != null) {
                    Text(
                        text = "High-risk action is armed. Tap the same action again to execute.",
                        color = LumiColors.warning,
                        fontSize = 10.sp
                    )
                }
            }

            // Deep link
            val deepLink = response.appDeeplink
            if (actionsSectionExpanded && !deepLink.isNullOrBlank()) {
                SectionDivider()
                Button(
                    onClick = { onOpenDeepLink(deepLink) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LumiColors.positive.copy(alpha = 0.15f)
                    ),
                    shape = LumiShapes.button
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.OpenInNew,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = LumiColors.positive
                    )
                    Spacer(modifier = Modifier.width(LumiSpacing.sm))
                    Text("Open Lumi App for Deep Processing", color = LumiColors.positive)
                }
            }
        }
    }

    draftPreview?.let { previewText ->
        AlertDialog(
            onDismissRequest = { draftPreview = null },
            title = { Text("Draft Preview") },
            text = {
                Column(
                    modifier = Modifier
                        .heightIn(max = 260.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(previewText, color = LumiColors.textPrimary, fontSize = 12.sp)
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                    TextButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(previewText))
                            draftPreview = null
                        }
                    ) {
                        Text("Copy", color = accent)
                    }
                    TextButton(
                        onClick = {
                            sharePlainText(
                                context = context,
                                subject = "Lumi Draft",
                                content = previewText
                            )
                            draftPreview = null
                        }
                    ) {
                        Text("Share", color = accent)
                    }
                    TextButton(
                        onClick = {
                            onUseDraft(previewText)
                            draftPreview = null
                        }
                    ) {
                        Text("Insert", color = accent)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { draftPreview = null }) {
                    Text("Close", color = LumiColors.textTertiary)
                }
            }
        )
    }

    evidencePreview?.let { card ->
        AlertDialog(
            onDismissRequest = { evidencePreview = null },
            title = { Text(card.title) },
            text = {
                Column(
                    modifier = Modifier
                        .heightIn(max = 260.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        card.summary,
                        color = LumiColors.textSecondary,
                        fontSize = 12.sp
                    )
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
                    TextButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString("${card.title}\n${card.summary}"))
                            evidencePreview = null
                        }
                    ) {
                        Text("Copy", color = accent)
                    }
                    TextButton(
                        onClick = {
                            sharePlainText(
                                context = context,
                                subject = "Lumi Evidence",
                                content = "${card.title}\n${card.summary}"
                            )
                            evidencePreview = null
                        }
                    ) {
                        Text("Share", color = accent)
                    }
                    TextButton(
                        onClick = {
                            onOpenCard(card)
                            evidencePreview = null
                        }
                    ) {
                        Text("Open", color = accent)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { evidencePreview = null }) {
                    Text("Close", color = LumiColors.textTertiary)
                }
            }
        )
    }
}

// ============================================================================
// Task Track Card
// ============================================================================

@Composable
fun TaskTrackCard(track: TaskTrackPayload) {
    Card(
        colors = CardDefaults.cardColors(containerColor = LumiColors.accent.copy(alpha = 0.06f)),
        shape = LumiShapes.cardSmall
    ) {
        Column(
            modifier = Modifier.padding(LumiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .height(14.dp)
                        .background(LumiColors.accent, LumiShapes.pill)
                )
                Spacer(modifier = Modifier.width(LumiSpacing.sm))
                Text(
                    "Task Track · ${track.phase}",
                    color = LumiColors.textPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                )
            }
            LinearProgressIndicator(
                progress = { track.progress.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth(),
                color = LumiColors.accent,
                trackColor = LumiColors.border
            )
            track.steps.take(3).forEach { step ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(
                                statusColor(step.status.name),
                                CircleShape
                            )
                    )
                    Text(
                        "${step.title} · ${readableResponseStatus(step.status.name)}",
                        color = LumiColors.textTertiary,
                        fontSize = 11.sp
                    )
                }
            }
            if (track.evidenceItems.isNotEmpty()) {
                Text(
                    "Evidence ${track.evidenceItems.size} items",
                    color = LumiColors.accentGlow,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun DeveloperExecutionOverviewCard(
    response: AgentResponse,
    selectedAgentCount: Int
) {
    val routingMode = response.routingDecision?.mode?.name?.let(::readableRoutingMode) ?: "-"
    val taskCount = response.taskGraph?.tasks?.size ?: 0
    val skillCount = response.skillInvocations.size
    val evidenceCount = response.cards.size

    Card(
        colors = CardDefaults.cardColors(containerColor = LumiColors.accent.copy(alpha = 0.08f)),
        shape = LumiShapes.cardSmall
    ) {
        Column(
            modifier = Modifier.padding(LumiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
        ) {
            Text(
                "Engineering Execution Overview",
                color = LumiColors.textPrimary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "trace ${response.traceId.take(20)} · module ${response.module.name.lowercase()}",
                color = LumiColors.textMuted,
                fontSize = 10.sp
            )
            Text(
                "Routing $routingMode · Tasks $taskCount · Agent $selectedAgentCount · Skills $skillCount · Evidence $evidenceCount",
                color = LumiColors.textSecondary,
                fontSize = 11.sp
            )
            val gap = response.skillGapReport
            if (gap != null) {
                Text(
                    "Gap: ${gap.missingCapability} · ${gap.frequency7d}/7d",
                    color = LumiColors.warning,
                    fontSize = 10.sp
                )
            }
        }
    }
}

@Composable
private fun DeveloperHistorySummary(history: List<AgentResponse>) {
    val runningCount = history.count {
        it.status.name.equals("processing", ignoreCase = true) ||
            it.status.name.equals("running", ignoreCase = true) ||
            it.status.name.equals("waiting_user", ignoreCase = true) ||
            it.status.name.equals("quoting", ignoreCase = true) ||
            it.status.name.equals("auth_required", ignoreCase = true) ||
            it.status.name.equals("verifying", ignoreCase = true)
    }
    val successCount = history.count {
        it.status.name.equals("success", ignoreCase = true) ||
            it.status.name.equals("partial", ignoreCase = true) ||
            it.status.name.equals("committed", ignoreCase = true)
    }
    val errorCount = history.count {
        it.status.name.equals("error", ignoreCase = true) ||
            it.status.name.equals("cancelled", ignoreCase = true) ||
            it.status.name.equals("rolled_back", ignoreCase = true) ||
            it.status.name.equals("disputed", ignoreCase = true)
    }
    val avgLatency = if (history.isNotEmpty()) {
        history.sumOf { it.latencyMs }.toDouble() / history.size
    } else {
        0.0
    }

    Column(verticalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
        Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
            StatChip(label = "Running", value = runningCount.toString(), color = LumiColors.warning)
            StatChip(label = "Success", value = successCount.toString(), color = LumiColors.positive)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)) {
            StatChip(label = "Failed", value = errorCount.toString(), color = LumiColors.error)
            StatChip(label = "Avg Latency", value = "${avgLatency.toInt()}ms", color = LumiColors.accent)
        }
    }
}

// ============================================================================
// Shared UI Primitives
// ============================================================================

@Composable
private fun GlassCard(content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardMedium
    ) {
        Box(
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
        ) {
            content()
        }
    }
}

@Composable
private fun SectionHeader(title: String, accentColor: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(18.dp)
                .background(accentColor, LumiShapes.pill)
        )
        Spacer(modifier = Modifier.width(LumiSpacing.sm))
        Text(
            title,
            color = LumiColors.textPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp
        )
    }
}

@Composable
private fun SectionDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(LumiColors.border.copy(alpha = 0.5f))
    )
}

@Composable
private fun IconLabel(icon: ImageVector, label: String, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
    ) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = color
        )
        Text(
            label,
            color = color,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun StatChip(label: String, value: String, color: Color) {
    Row(
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), LumiShapes.pill)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
    ) {
        Text(label, color = color.copy(alpha = 0.7f), fontSize = 11.sp)
        Text(value, color = color, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ErrorBadge(errorCode: String) {
    Row(
        modifier = Modifier
            .background(LumiColors.errorMuted, LumiShapes.pill)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
    ) {
        Icon(
            Icons.Filled.ErrorOutline,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = LumiColors.error
        )
        Text("Error Code: $errorCode", color = LumiColors.error, fontSize = 12.sp)
    }
}

@Composable
private fun ExecutionReceiptSummaryBlock(response: AgentResponse) {
    val receipt = response.executionReceipt ?: return
    val headline = ExecutionReceiptFormatter.headline(response)
    val externalHeadline = ExecutionReceiptFormatter.externalSummaryHeadline(response, maxItems = 5)
    val externalPills = ExecutionReceiptFormatter.externalStatusPills(response, maxItems = 5)
    val summaryLines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 4)
        .filterNot { line ->
            externalHeadline != null && line.equals(externalHeadline, ignoreCase = true)
        }
    val recentEvents = receipt.events
        .takeLast(2)
        .joinToString(" · ") { event ->
            if (event.detail.isBlank()) event.title else "${event.title}: ${event.detail}"
        }
        .takeIf { it.isNotBlank() }
    val delegationLabel = receipt.delegationMode
        ?.name
        ?.lowercase(Locale.getDefault())
        ?.replace('_', ' ')
        ?.replaceFirstChar { it.uppercase() }

    Card(
        colors = CardDefaults.cardColors(containerColor = LumiColors.accent.copy(alpha = 0.07f)),
        shape = LumiShapes.cardSmall
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = LumiSpacing.sm, vertical = LumiSpacing.xs),
            verticalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
        ) {
            Text(
                text = "Execution receipt",
                color = LumiColors.textPrimary,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            headline?.let {
                Text(
                    text = it,
                    color = LumiColors.textTertiary,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            externalHeadline?.let { external ->
                Text(
                    text = "External Fulfillment: $external",
                    color = LumiColors.warning,
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (externalPills.isNotEmpty()) {
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(LumiSpacing.xs)
                ) {
                    externalPills.forEach { pill ->
                        ExternalStatusPill(
                            label = pill.label,
                            tone = pill.tone
                        )
                    }
                }
            }
            delegationLabel?.let {
                Text(
                    text = "Delegation mode: $it",
                    color = LumiColors.textMuted,
                    fontSize = 10.sp
                )
            }
            if (summaryLines.isEmpty()) {
                Text(
                    text = receipt.roleImpactSummary,
                    color = LumiColors.textMuted,
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                summaryLines.forEach { line ->
                    Text(
                        text = "• $line",
                        color = LumiColors.textMuted,
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            recentEvents?.let { eventLine ->
                Text(
                    text = eventLine,
                    color = LumiColors.textMuted,
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun ExternalStatusPill(
    label: String,
    tone: ExternalVisibilityTone
) {
    val color = when (tone) {
        ExternalVisibilityTone.POSITIVE -> LumiColors.positive
        ExternalVisibilityTone.WARNING -> LumiColors.warning
        ExternalVisibilityTone.NEGATIVE -> LumiColors.error
        ExternalVisibilityTone.INFO -> LumiColors.accent
    }
    Text(
        text = label,
        color = color,
        fontSize = 9.sp,
        modifier = Modifier
            .background(color.copy(alpha = 0.15f), LumiShapes.pill)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

@Composable
private fun FilterChip(
    label: String,
    selected: Boolean,
    accentColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .heightIn(min = 36.dp)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (selected) accentColor.copy(alpha = 0.2f) else LumiColors.cardSurfaceElevated
        ),
        shape = LumiShapes.pill
    ) {
        Text(
            text = label,
            color = if (selected) accentColor else LumiColors.textTertiary,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

// ============================================================================
// Helpers
// ============================================================================

private object ResponseDetailSectionStateStore {
    private const val PREFS_NAME = "response_detail_section_state"

    fun summaryExpanded(context: Context, module: AppModule): Boolean =
        prefs(context).getBoolean(key("summary", module), true)

    fun actionsExpanded(context: Context, module: AppModule): Boolean =
        prefs(context).getBoolean(key("actions", module), true)

    fun evidenceExpanded(context: Context, module: AppModule): Boolean =
        prefs(context).getBoolean(key("evidence", module), true)

    fun setSummaryExpanded(context: Context, module: AppModule, expanded: Boolean) {
        prefs(context).edit().putBoolean(key("summary", module), expanded).apply()
    }

    fun setActionsExpanded(context: Context, module: AppModule, expanded: Boolean) {
        prefs(context).edit().putBoolean(key("actions", module), expanded).apply()
    }

    fun setEvidenceExpanded(context: Context, module: AppModule, expanded: Boolean) {
        prefs(context).edit().putBoolean(key("evidence", module), expanded).apply()
    }

    fun setAllExpanded(context: Context, module: AppModule, expanded: Boolean) {
        prefs(context)
            .edit()
            .putBoolean(key("summary", module), expanded)
            .putBoolean(key("actions", module), expanded)
            .putBoolean(key("evidence", module), expanded)
            .apply()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun key(section: String, module: AppModule): String =
        "$section.${module.name.lowercase(Locale.ROOT)}"
}

private fun sharePlainText(context: Context, subject: String, content: String) {
    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, subject)
        putExtra(Intent.EXTRA_TEXT, content)
    }
    val chooserIntent = Intent.createChooser(sendIntent, "Share via").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    runCatching {
        context.startActivity(chooserIntent)
    }.onFailure {
        Toast.makeText(context, "Unable to open share sheet", Toast.LENGTH_SHORT).show()
    }
}

private fun statusColor(statusName: String): Color {
    val s = statusName.lowercase(Locale.getDefault())
    return when {
        s == "success" || s == "partial" || s == "committed" -> LumiColors.positive
        s == "error" || s == "cancelled" || s == "rolled_back" || s == "disputed" -> LumiColors.error
        s == "processing" || s == "running" || s == "waiting_user" || s == "quoting" || s == "auth_required" || s == "verifying" -> LumiColors.warning
        else -> LumiColors.textMuted
    }
}

private fun payloadLines(payload: ModulePayload): List<String> {
    return when (payload) {
        ModulePayload.NonePayload -> emptyList()
        is ModulePayload.HomePayload -> listOf(
            "Avatar: ${payload.profileLabel}",
            "Pending tasks: ${payload.pendingTasks}",
            "Completion: ${((payload.completionRate.coerceIn(0.0, 1.0)) * 100).toInt()}%"
        )
        is ModulePayload.ChatPayload -> listOf(
            "Mode: Chat Orchestration",
            "Suggestion: ${payload.suggestionTitle}",
            "Hints: ${payload.hints.joinToString(" / ")}",
            "Evidence: ${payload.evidenceItems.size}",
            "Routing: ${payload.routingDecision?.mode?.name?.lowercase() ?: "unknown"}",
            "Task nodes: ${payload.taskGraph?.tasks?.size ?: 0}",
            "Skill invocations: ${payload.skillInvocations.size}",
            "Selected agents: ${payload.selectedAgents.size}",
            "Gap: ${payload.skillGap?.missingCapability ?: "-"}"
        )
        is ModulePayload.LixPayload -> listOf(
            "Stage: ${payload.stage}",
            "Intent ID: ${payload.intentId ?: "-"}",
            "Offer count: ${payload.offerCount}",
            "Summary: ${payload.summary.ifBlank { "-" }}",
            "Candidate plans: ${payload.offers.size}",
            "Intent contract: ${payload.intentContract?.goal?.take(48) ?: "-"}",
            "Capabilities: ${payload.capabilityCards.size}",
            "Quotes: ${payload.quotes.size}",
            "Quote selection: ${payload.providerSelectionSummary?.selectedProviderName ?: "pending"}",
            "Provider denials: ${payload.providerPolicyDecisions.count { it.decision.name.equals("DENIED", ignoreCase = true) }}",
            "Approval: ${payload.externalApprovalSummary?.status ?: "-"}",
            "Data scope: ${payload.externalDataScopeSummary?.summary ?: "-"}",
            "Proof: ${payload.externalProofSummary?.summary ?: "-"}",
            "Verification: ${payload.externalVerificationSummary?.summary ?: "-"}",
            "Verification proof: ${payload.verificationProof?.method ?: "-"}",
            "Rollback: ${payload.externalRollbackSummary?.summary ?: payload.rollbackPolicy?.policyId ?: "-"}",
            "Dispute: ${payload.externalDisputeSummary?.summary ?: "-"}"
        )
        is ModulePayload.MarketPayload -> listOf(
            "Candidate count: ${payload.candidateCount}",
            "Selected: ${payload.selectedCount}",
            "trace: ${payload.traceId ?: "-"}",
            "Leaderboard: ${payload.leaderboardTop.size}",
            "Trend points: ${payload.trendPoints.size}",
            "Repositories: ${payload.githubRepoCount}"
        )
        is ModulePayload.AvatarPayload -> buildList {
            add("Preferences profile: ${payload.profileLabel}")
            add("Active role: ${payload.activeRole.name.lowercase()}")
            payload.rolePolicyProfile?.approvalPolicy?.delegationMode?.name?.lowercase()?.let {
                add("Delegation mode: $it")
            }
            add("Cloud Sync: ${if (payload.cloudSyncEnabled) "Enabled" else "Disabled"}")
            add("Sync status: ${payload.syncStatus}")
            add("Constraint precedence: ${payload.constraintPriorityNote}")
            payload.topTraits.take(4).forEach { add("${readableTraitLabel(it.key)}: ${(it.value * 100).toInt()}%") }
        }
        is ModulePayload.DestinyPayload -> listOf(
            "Strategy: ${payload.strategyLabel}",
            "Risk: ${payload.riskLevel}",
            "Next steps: ${payload.nextSteps.joinToString(" / ")}",
            "Route steps: ${payload.routeSteps.joinToString(" / ")}",
            "Next best action: ${payload.nextBestAction.ifBlank { "-" }}",
            "Alternatives: ${payload.alternatives.size}",
            "Constraint notes: ${payload.constraintNotes.size}",
            "Audit trail: ${payload.auditTrail.size}",
            "Evidence: ${payload.evidenceItems.size}"
        )
        is ModulePayload.SettingsPayload -> listOf(
            "Backend status: ${payload.backendStatus}",
            "Serp: ${payload.serpConfigured?.let { if (it) "configured" else "not configured" } ?: "unknown"}",
            "Cloud: ${payload.cloudBaseUrl ?: BuildConfig.LUMI_BASE_URL}",
            "ime_backend_v2_enabled: ${payload.imeBackendV2Enabled}",
            "app_full_feature_parity_enabled: ${payload.appFullFeatureParityEnabled}",
            "digital_twin_cloud_sync_enabled: ${payload.digitalTwinCloudSyncEnabled}",
            "digital_twin_edge_model_mode: ${payload.digitalTwinEdgeModelMode}",
            "digital_twin_edge_model_version: ${payload.digitalTwinEdgeModelVersion}",
            "digital_twin_edge_fallback_enabled: ${payload.digitalTwinEdgeFallbackEnabled}",
            "cloud_adapter_fallback_enabled: ${payload.cloudAdapterFallbackEnabled}",
            "task_confirm/task_cancel: ${payload.taskConfirmCount}/${payload.taskCancelCount}",
            "task_confirm_rate: ${(payload.taskConfirmRate.coerceIn(0.0, 1.0) * 100).toInt()}%",
            "draft_accept/card_click: ${payload.draftAcceptCount}/${payload.cardClickCount}",
            "event_window_hours: ${payload.eventWindowHours}",
            "module_metrics: ${payload.moduleTaskMetrics.take(3).joinToString(" / ") { "${it.moduleLabel}:${(it.taskConfirmRate * 100).toInt()}%" }}",
            "dtoe_adoption_rate: ${(payload.dtoeAdoptionRate.coerceIn(0.0, 1.0) * 100).toInt()}% (${payload.dtoeDecisionCount})",
            "baseline_adoption_rate: ${(payload.baselineAdoptionRate.coerceIn(0.0, 1.0) * 100).toInt()}% (${payload.baselineDecisionCount})",
            "dtoe_uplift: ${(payload.dtoeAdoptionUplift * 100).toInt()}pp",
            "dtoe_calibration_error: ${(payload.dtoeCalibrationError.coerceIn(0.0, 1.0) * 100).toInt()}% (${payload.dtoeCalibrationSampleCount})",
            "dtoe_confidence_coverage: ${(payload.dtoeConfidenceCoverage.coerceIn(0.0, 1.0) * 100).toInt()}%",
            "api_health: ${payload.apiHealthyCount}/${payload.apiTotalCount}",
            "api_status: ${payload.apiOverallStatus}",
            "api_checks: ${payload.apiHealthChecks.take(3).joinToString(" / ") { "${it.moduleLabel}:${it.status}" }}",
            "twin_sync_status: ${payload.twinSyncStatus}",
            "twin_sync_success/conflict/fallback: ${payload.twinSyncSuccessCount}/${payload.twinSyncConflictCount}/${payload.twinSyncFallbackCount}",
            "twin_sync_resolution: ${payload.twinSyncLastResolution ?: "-"}",
            "twin_sync_summary: ${payload.twinSyncLastSummary ?: "-"}",
            "portfolio_objective_profile: ${
                listOfNotNull(
                    payload.activeObjectiveProfileScope?.name?.lowercase(),
                    payload.activeObjectiveProfileProvenance?.name?.lowercase(),
                    payload.activeObjectiveProfileSnapshotId?.takeLast(10)
                ).joinToString(" / ").ifBlank { "-" }
            }",
            "portfolio_propagation_pending/review: ${payload.pendingPropagationCount}/${payload.reviewRequiredPropagationCount}",
            "portfolio_propagation_summary: ${payload.latestPropagationSummary.ifBlank { "-" }}",
            "external_telemetry_metrics: ${payload.externalFulfillmentTelemetry.size}"
        )
    }
}

private fun readableTraitLabel(rawKey: String): String {
    val key = rawKey.lowercase(Locale.getDefault())
    return when {
        key.contains("iterative_reasoning") || key.contains("reasoning") -> "Reasoning depth"
        key.contains("self_modeling") || key.contains("self_model") -> "Self-modeling"
        key.contains("orchestration") -> "Orchestration"
        key.contains("negotiation") -> "Negotiation"
        key.contains("strategy") -> "Strategic Thinking"
        key.contains("locale") -> "Locale alignment"
        key.contains("adaptive") || key.contains("adapt") -> "Adaptive communication"
        key.contains("trust") -> "Trust stability"
        key.contains("insight") -> "Insight"
        key.contains("memory") -> "Long-term memory"
        key.contains("action") || key.contains("execution") -> "Execution tendency"
        key.contains("risk") -> "Risk Preference"
        key.contains("social") -> "Social activity"
        key.contains("focus") -> "Focus"
        else -> rawKey
    }
}

private fun traitLevel(value: Float): String {
    return when {
        value >= 0.75f -> "High"
        value >= 0.45f -> "Medium"
        else -> "Low"
    }
}

private fun readableHomeMetricKey(raw: String): String {
    return when (raw) {
        "leaderboard_rows" -> "Leaderboard count"
        "task_confirm_24h" -> "24h confirmed"
        "task_cancel_24h" -> "24h canceled"
        "task_confirm_rate_24h" -> "24h confirmation rate"
        "dtoe_uplift_24h" -> "DTOE uplift (24h)"
        "dtoe_calibration_error_24h" -> "Calibration error (24h)"
        "dtoe_confidence_coverage_24h" -> "Confidence coverage (24h)"
        "dtoe_calibration_samples_24h" -> "Calibration samples (24h)"
        "top_module_24h" -> "Top module (24h)"
        "api_health" -> "API health"
        "api_status" -> "API status"
        "profile_label" -> "Avatar label"
        "top_traits" -> "Top trait count"
        "locale" -> "Locale"
        else -> raw
    }
}

private fun readableRoutingReason(raw: String): String {
    return when {
        raw.startsWith("cross_domain_count>=") -> "Cross-domain task; multi-agent collaboration required"
        raw.startsWith("required_capabilities>=") -> "Many capabilities required; parallel orchestration recommended"
        raw.startsWith("dependency_depth>=") -> "Deep dependency chain; staged execution required"
        raw.startsWith("risk_score>=") -> "High risk; prioritize evidence and review"
        raw == "explicit_multi_agent_request" -> "User explicitly requested multiple agents"
        raw == "default_single_agent" -> "Default single-agent + skills"
        else -> raw
    }
}

private fun readableRoutingMode(raw: String): String {
    return when (raw.lowercase(Locale.getDefault())) {
        "multi_agent" -> "Multi-agent collaboration"
        "single_agent" -> "Single-agent + skills"
        else -> raw.lowercase(Locale.getDefault())
    }
}

private fun readableResponseStatus(raw: String): String {
    return when (raw.lowercase(Locale.getDefault())) {
        "processing" -> "Queued"
        "running" -> "Running"
        "waiting_user" -> "Awaiting Confirmation"
        "quoting" -> "Quoting"
        "auth_required" -> "Authorization Required"
        "verifying" -> "Verifying"
        "committed" -> "Committed"
        "success" -> "Success"
        "partial" -> "Partially Completed"
        "rolled_back" -> "Rolled Back"
        "disputed" -> "Disputed"
        "cancelled", "canceled" -> "Canceled"
        "error", "failed" -> "Failed"
        else -> raw.lowercase(Locale.getDefault())
    }
}

private fun readableSkillSource(raw: String): String {
    return when (raw.lowercase(Locale.getDefault())) {
        "local" -> "local"
        "github" -> "github"
        "trusted_catalog" -> "trusted_catalog"
        "local_template" -> "template"
        else -> raw.lowercase(Locale.getDefault())
    }
}

private fun trustedSkillBadgeSuffix(sourceRaw: String, skillId: String): String {
    val normalizedSource = sourceRaw.lowercase(Locale.getDefault())
    return if (normalizedSource == "trusted_catalog" || skillId.startsWith("trusted:", ignoreCase = true)) {
        " · Anthropic Trusted Skill"
    } else {
        ""
    }
}

private fun readableAgentId(raw: String): String {
    if (raw.isBlank()) return "unknown_agent"
    return when {
        raw.startsWith("ext:gh:") -> "github:${raw.removePrefix("ext:gh:")}"
        raw.startsWith("tool:") -> raw.removePrefix("tool:")
        raw.startsWith("specialized:") -> raw.removePrefix("specialized:")
        else -> raw
    }
}

private enum class HistoryFilter(val label: String) {
    ALL("All"),
    RUNNING("Running"),
    SUCCESS("Success"),
    ERROR("Failed");

    fun matches(response: AgentResponse): Boolean {
        val status = response.status.name.lowercase(Locale.getDefault())
        return when (this) {
            ALL -> true
            RUNNING -> status == "processing" ||
                status == "running" ||
                status == "waiting_user" ||
                status == "quoting" ||
                status == "auth_required" ||
                status == "verifying"
            SUCCESS -> status == "success" || status == "partial" || status == "committed"
            ERROR -> status == "error" || status == "cancelled" || status == "rolled_back" || status == "disputed"
        }
    }
}

private enum class HistorySort(val label: String) {
    NEWEST("Newest"),
    LATENCY_DESC("Latency"),
    CONFIDENCE_DESC("Confidence")
}
