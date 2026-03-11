package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.ModulePayload
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun SettingsScreenContent(
    payload: ModulePayload.SettingsPayload?,
    defaultBaseUrl: String
) {
    Column(
        modifier = Modifier.padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text("Preferences & Permissions · Diagnostics", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold)
        Text(
            "Backend ${payload?.backendStatus ?: "unknown"} · API ${payload?.apiOverallStatus ?: "unknown"} · Search ${
                payload?.serpConfigured?.let { if (it) "configured" else "not configured" } ?: "unknown"
            }",
            color = Color(0xFFAED0EE),
            fontSize = 12.sp
        )
        Text(
            "Cloud endpoint: ${payload?.cloudBaseUrl ?: defaultBaseUrl}",
            color = Color(0xFF8FBCE0),
            fontSize = 11.sp
        )
        Text(
            "Constraint precedence: current task constraints always override long-term preferences.",
            color = Color(0xFFC8E3FA),
            fontSize = 11.sp
        )
        SettingsApiHealthCard(payload)
        SettingsObservabilityCard(payload)
        SettingsDtoeEvaluationCard(payload)
        SettingsModuleBreakdownCard(payload)
        SettingsTwinContinuityCard(payload)
        SettingsPortfolioLearningCard(payload)
        SettingsFlagsCard(payload)
    }
}

@Composable
private fun SettingsApiHealthCard(payload: ModulePayload.SettingsPayload?) {
    val checks = payload?.apiHealthChecks.orEmpty()
    val overall = payload?.apiOverallStatus ?: "unknown"
    val healthyCount = payload?.apiHealthyCount ?: 0
    val totalCount = payload?.apiTotalCount ?: checks.size
    val checkedAt = payload?.apiLastCheckedAtMs?.let(::formatTs) ?: "-"
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10223F))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "API Health Checks ($healthyCount/$totalCount)",
                color = Color(0xFFEAF4FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Overall status: ${overall.uppercase(Locale.getDefault())} · Last check: $checkedAt",
                color = Color(0xFF9BC8E8),
                fontSize = 10.sp
            )
            if (checks.isEmpty()) {
                Text("No checks available yet", color = Color(0xFF9ABEDF), fontSize = 11.sp)
            } else {
                checks.take(6).forEach { check ->
                    val latency = check.latencyMs?.let { "${it}ms" } ?: "-"
                    val statusColor = when (check.status) {
                        "up" -> Color(0xFF8EE0A4)
                        "degraded" -> Color(0xFFF4CD7F)
                        "down" -> Color(0xFFF2A0A0)
                        else -> Color(0xFF9ABEDF)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            "${check.moduleLabel} · ${check.endpoint}",
                            color = Color(0xFFB8D9F2),
                            fontSize = 10.sp
                        )
                        Text(
                            "${check.status} · $latency",
                            color = statusColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    check.errorCode?.let { errorCode ->
                        Text(
                            "error: $errorCode",
                            color = Color(0xFFCE9D9D),
                            fontSize = 9.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsObservabilityCard(payload: ModulePayload.SettingsPayload?) {
    val confirm = payload?.taskConfirmCount ?: 0
    val cancel = payload?.taskCancelCount ?: 0
    val confirmRate = ((payload?.taskConfirmRate ?: 0.0).coerceIn(0.0, 1.0) * 100).toInt()
    val windowHours = payload?.eventWindowHours ?: 24
    val lastEventText = payload?.lastEventAtMs?.let(::formatTs) ?: "-"

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF132947))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Task Decision Observability (last ${windowHours}h)", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("task_confirm", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text(confirm.toString(), color = Color(0xFF9FE6B7), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("task_cancel", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text(cancel.toString(), color = Color(0xFFF5B3AE), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Confirmation Rate", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text("$confirmRate%", color = Color(0xFF8CD2FF), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Draft adoption / card taps", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text("${payload?.draftAcceptCount ?: 0} / ${payload?.cardClickCount ?: 0}", color = Color(0xFF9BC8E8), fontSize = 11.sp)
            }
            Text("Last event: $lastEventText", color = Color(0xFF88B3D5), fontSize = 10.sp)
        }
    }
}

@Composable
private fun SettingsModuleBreakdownCard(payload: ModulePayload.SettingsPayload?) {
    val modules = payload?.moduleTaskMetrics.orEmpty()
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10233D))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("Module-level Task Confirmation Rate", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            if (modules.isEmpty()) {
                Text("No module-level data yet", color = Color(0xFF9ABEDF), fontSize = 11.sp)
            } else {
                modules.take(5).forEach { item ->
                    val rate = (item.taskConfirmRate.coerceIn(0.0, 1.0) * 100).toInt()
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(item.moduleLabel, color = Color(0xFFB8D9F2), fontSize = 11.sp)
                        Text(
                            "${item.taskConfirmCount}/${item.taskConfirmCount + item.taskCancelCount} · $rate%",
                            color = Color(0xFF8FD2FF),
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsDtoeEvaluationCard(payload: ModulePayload.SettingsPayload?) {
    val dtoeRate = ((payload?.dtoeAdoptionRate ?: 0.0).coerceIn(0.0, 1.0) * 100).toInt()
    val baselineRate = ((payload?.baselineAdoptionRate ?: 0.0).coerceIn(0.0, 1.0) * 100).toInt()
    val uplift = payload?.dtoeAdoptionUplift ?: 0.0
    val upliftPp = (uplift * 100).toInt()
    val calibrationError = ((payload?.dtoeCalibrationError ?: 0.0).coerceIn(0.0, 1.0) * 100).toInt()
    val coverage = ((payload?.dtoeConfidenceCoverage ?: 0.0).coerceIn(0.0, 1.0) * 100).toInt()
    val sampleCount = payload?.dtoeCalibrationSampleCount ?: 0
    val dtoeCount = payload?.dtoeDecisionCount ?: 0
    val baselineCount = payload?.baselineDecisionCount ?: 0
    val upliftText = if (upliftPp >= 0) "+${upliftPp}pp" else "${upliftPp}pp"
    val upliftColor = if (upliftPp >= 0) Color(0xFF9FE6B7) else Color(0xFFF5B3AE)
    val calibrationColor = when {
        calibrationError <= 15 -> Color(0xFF9FE6B7)
        calibrationError <= 25 -> Color(0xFFF4CD7F)
        else -> Color(0xFFF5B3AE)
    }
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102643))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "DTOE Uplift & Calibration (last ${payload?.eventWindowHours ?: 24}h)",
                color = Color(0xFFEAF4FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("DTOE adoption", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text("$dtoeRate% ($dtoeCount)", color = Color(0xFF9FE6B7), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Baseline adoption", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text("$baselineRate% ($baselineCount)", color = Color(0xFF9BC8E8), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Adoption uplift", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text(upliftText, color = upliftColor, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Calibration error", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text("${calibrationError}%", color = calibrationColor, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Confidence coverage", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text("$coverage% ($sampleCount)", color = Color(0xFF8CD2FF), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun SettingsFlagsCard(payload: ModulePayload.SettingsPayload?) {
    val syncStatusLabel = when (payload?.twinSyncStatus?.lowercase(Locale.getDefault())) {
        "synced" -> "Synced"
        "pending" -> "Pending first sync"
        "conflict_fallback" -> "Conflict fallback"
        "failed_fallback" -> "Failed fallback"
        "disabled" -> "Disabled"
        else -> payload?.twinSyncStatus ?: "Unknown"
    }
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF11223E))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Twin control flags", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text("IME backend v2: ${payload?.imeBackendV2Enabled ?: true}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("App parity mode: ${payload?.appFullFeatureParityEnabled ?: true}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("Cloud sync enabled: ${payload?.digitalTwinCloudSyncEnabled ?: false}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("Edge model mode: ${payload?.digitalTwinEdgeModelMode ?: "heuristic"}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("Edge model version: ${payload?.digitalTwinEdgeModelVersion ?: "-"}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("Edge fallback enabled: ${payload?.digitalTwinEdgeFallbackEnabled ?: true}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("Cloud adapter fallback: ${payload?.cloudAdapterFallbackEnabled ?: true}", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text("Twin sync status: $syncStatusLabel", color = Color(0xFFA9CAE4), fontSize = 10.sp)
            Text(
                "Twin sync success/conflict/fallback: ${payload?.twinSyncSuccessCount ?: 0}/${payload?.twinSyncConflictCount ?: 0}/${payload?.twinSyncFallbackCount ?: 0}",
                color = Color(0xFFA9CAE4),
                fontSize = 10.sp
            )
        }
    }
}

@Composable
private fun SettingsTwinContinuityCard(payload: ModulePayload.SettingsPayload?) {
    val lastSyncText = payload?.twinSyncLastSyncAtMs?.let(::formatTs) ?: "-"
    val lastConflictText = payload?.twinSyncLastConflictAtMs?.let(::formatTs) ?: "-"
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF112845))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Twin Sync Continuity", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Last sync", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                Text(lastSyncText, color = Color(0xFF9BC8E8), fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
            payload?.twinSyncLastResolution?.takeIf { it.isNotBlank() }?.let { resolution ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Resolution", color = Color(0xFFB8D9F2), fontSize = 11.sp)
                    Text(resolution.replace('_', ' '), color = Color(0xFF8CD2FF), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
            }
            payload?.twinSyncLastSummary?.takeIf { it.isNotBlank() }?.let { summary ->
                Text(summary, color = Color(0xFF9ABEDF), fontSize = 10.sp)
            } ?: Text(
                "No sync summary available yet.",
                color = Color(0xFF9ABEDF),
                fontSize = 10.sp
            )
            payload?.twinSyncLastConflictSummary?.takeIf { it.isNotBlank() }?.let { summary ->
                Text("Latest conflict ($lastConflictText): $summary", color = Color(0xFFF4CD7F), fontSize = 10.sp)
            }
        }
    }
}

@Composable
private fun SettingsPortfolioLearningCard(payload: ModulePayload.SettingsPayload?) {
    val objectiveProfileState = buildList {
        payload?.activeObjectiveProfileScope?.let { add(it.name.lowercase(Locale.getDefault())) }
        payload?.activeObjectiveProfileProvenance?.let { add(it.name.lowercase(Locale.getDefault())) }
        payload?.activeObjectiveProfileSnapshotId?.let { add("snapshot ${it.takeLast(10)}") }
    }.joinToString(" · ")
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF12253F))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Portfolio Learning Profile", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Objective profile: ${if (objectiveProfileState.isBlank()) "n/a" else objectiveProfileState}",
                color = Color(0xFFB8D9F2),
                fontSize = 11.sp
            )
            payload?.activeObjectiveProfileSummary?.takeIf { it.isNotBlank() }?.let { summary ->
                Text(summary, color = Color(0xFF9ABEDF), fontSize = 10.sp)
            } ?: Text(
                "No objective profile summary available yet.",
                color = Color(0xFF9ABEDF),
                fontSize = 10.sp
            )
            Text(
                "Propagation pending/review: ${payload?.pendingPropagationCount ?: 0}/${payload?.reviewRequiredPropagationCount ?: 0}",
                color = Color(0xFF8CD2FF),
                fontSize = 10.sp
            )
            payload?.latestPropagationSummary?.takeIf { it.isNotBlank() }?.let { summary ->
                Text(summary, color = Color(0xFFF4CD7F), fontSize = 10.sp)
            }
        }
    }
}

private fun formatTs(timestampMs: Long): String {
    val formatter = SimpleDateFormat("MM-dd HH:mm", Locale.getDefault())
    return runCatching { formatter.format(Date(timestampMs)) }.getOrDefault("-")
}
