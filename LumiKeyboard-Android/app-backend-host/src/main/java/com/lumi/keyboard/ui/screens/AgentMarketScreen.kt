package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.keyboard.ui.model.ModuleExecutionStatus
import com.lumi.keyboard.ui.model.ModuleExecutionStep
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AgentMarketScreenContent(
    response: AgentResponse?,
    payload: ModulePayload.MarketPayload?,
    loading: Boolean,
    timeline: List<ModuleExecutionStep>,
    developerMode: Boolean,
    onDiscover: () -> Unit,
    onExecute: () -> Unit,
    onGithubConnect: () -> Unit,
    onGithubImport: (String, String) -> Unit
) {
    var repoInput by rememberSaveable { mutableStateOf("") }
    var manifestInput by rememberSaveable { mutableStateOf(".lix/agent.manifest.json") }

    Column(
        modifier = Modifier.padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Agent · Market Execution Panel", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold)
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF163156))) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Candidates ${payload?.candidateCount ?: 0} · Selected ${payload?.selectedCount ?: 0} · Repositories ${payload?.githubRepoCount ?: 0}",
                    color = Color(0xFFAED0EE),
                    fontSize = 12.sp
                )
                if (developerMode) {
                    Text(
                        "Trace: ${payload?.traceId ?: response?.traceId ?: "-"}",
                        color = Color(0xFF8DB9DC),
                        fontSize = 10.sp
                    )
                    Text(
                        "Execution status ${response?.status?.name?.lowercase() ?: "idle"} · ${response?.latencyMs ?: 0}ms",
                        color = Color(0xFF89B6D8),
                        fontSize = 10.sp
                    )
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onDiscover, enabled = !loading) { Text("Discover") }
            TextButton(onClick = onExecute, enabled = !loading) { Text("Execute") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onGithubConnect, enabled = !loading) { Text("GitHub Connect") }
            TextButton(
                onClick = {
                    val repo = repoInput.trim()
                    if (repo.isNotEmpty()) {
                        onGithubImport(repo, manifestInput.trim().ifEmpty { ".lix/agent.manifest.json" })
                    }
                },
                enabled = !loading && repoInput.trim().isNotEmpty()
            ) { Text("GitHub Import") }
        }
        OutlinedTextField(
            value = repoInput,
            onValueChange = { repoInput = it },
            singleLine = true,
            label = { Text("Repositories owner/repo") },
            placeholder = { Text("e.g. openclaw/openclaw") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = manifestInput,
            onValueChange = { manifestInput = it },
            singleLine = true,
            label = { Text("Manifest path") },
            placeholder = { Text(".lix/agent.manifest.json") },
            modifier = Modifier.fillMaxWidth()
        )
        if (loading) {
            Text("Running agent orchestration, please wait...", color = Color(0xFF9FC4E2), fontSize = 11.sp)
        }

        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF112540))) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Hot Ranking", color = Color(0xFFE4F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                if (payload?.leaderboardTop.isNullOrEmpty()) {
                    Text("No leaderboard data yet. Run one market task first.", color = Color(0xFF8FB6D5), fontSize = 11.sp)
                } else {
                    payload?.leaderboardTop?.take(5)?.forEach { row ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("#${row.rank} ${row.agentName}", color = Color(0xFFBFDBF0), fontSize = 11.sp)
                            Text("${"%.1f".format(row.hotnessScore)}", color = Color(0xFF84C9FF), fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        if (!payload?.trendPoints.isNullOrEmpty()) {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10243A))) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Trend Trajectory", color = Color(0xFFDDF3FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    payload?.trendPoints?.takeLast(4)?.forEach { point ->
                        Text("${fmtTs(point.ts)} · ${"%.1f".format(point.value)}", color = Color(0xFF93BFDF), fontSize = 10.sp)
                    }
                }
            }
        }
        if (developerMode && timeline.isNotEmpty()) {
            AgentTimelineCard(timeline = timeline)
        }
    }
}

@Composable
private fun AgentTimelineCard(timeline: List<ModuleExecutionStep>) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102338))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Task timeline", color = Color(0xFFE5F3FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            timeline.take(5).forEach { step ->
                val statusColor = when (step.status) {
                    ModuleExecutionStatus.RUNNING -> Color(0xFF8FD6FF)
                    ModuleExecutionStatus.SUCCESS -> Color(0xFF9FE8B9)
                    ModuleExecutionStatus.ERROR -> Color(0xFFF7AFA6)
                    ModuleExecutionStatus.CANCELLED -> Color(0xFFF0C98F)
                }
                val duration = step.latencyMs ?: step.finishedAtMs?.let { end -> (end - step.startedAtMs).coerceAtLeast(0L) }
                Text(
                    "• ${step.label} · ${step.status.name.lowercase()}${duration?.let { " · ${it}ms" } ?: ""}",
                    color = statusColor,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

private fun fmtTs(ts: Long): String {
    val sdf = SimpleDateFormat("MM-dd", Locale.getDefault())
    return runCatching { sdf.format(Date(ts)) }.getOrDefault("-")
}
