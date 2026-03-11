package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.ModulePayload

@Composable
fun DestinyScreenContent(
    response: AgentResponse?,
    payload: ModulePayload.DestinyPayload?,
    developerMode: Boolean
) {
    val riskLevel = payload?.riskLevel ?: "medium"
    val riskColor = when (riskLevel.lowercase()) {
        "low", "safe" -> Color(0xFF83E0B6)
        "high" -> Color(0xFFF9B2A8)
        else -> Color(0xFFF6D08F)
    }

    Column(
        modifier = Modifier.padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Header
        Text("Navigation · Bellman Path Suggestions", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold)

        // Strategy + Risk Card
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1A3155))) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "Strategy ${payload?.strategyLabel ?: "-"}",
                    color = Color(0xFFD8ECFF),
                    fontSize = 12.sp
                )
                Text("Risk ${riskLevel.uppercase()}", color = riskColor, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        // J-Curve Visualization
        JCurveChart(
            nextSteps = payload?.nextSteps.orEmpty(),
            riskLevel = riskLevel
        )

        // Recommended Actions
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF122740))) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("Recommended Actions", color = Color(0xFFE1F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                payload?.nextSteps?.take(4)?.forEach { step ->
                    Text("• $step", color = Color(0xFF9FC3DF), fontSize = 11.sp)
                }
                if (payload?.nextSteps.isNullOrEmpty()) {
                    Text("No next-step suggestions yet. Start strategy evaluation in Chat.", color = Color(0xFF9FC3DF), fontSize = 11.sp)
                }
            }
        }

        // DTOE deep strategy contract
        DeepStrategyCard(payload = payload)

        // Route Steps Timeline
        if (!payload?.routeSteps.isNullOrEmpty()) {
            RouteStepsTimeline(steps = payload!!.routeSteps)
        }

        // Audit trail
        if (!payload?.auditTrail.isNullOrEmpty()) {
            DestinyAuditTrailCard(events = payload!!.auditTrail)
        }

        // Evidence (developer mode)
        if (developerMode && !payload?.evidenceItems.isNullOrEmpty()) {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102136))) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Evidence References", color = Color(0xFFDCF1FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    payload?.evidenceItems?.take(3)?.forEach { item ->
                        Text("• ${item.source}: ${item.title}", color = Color(0xFF95BBD8), fontSize = 10.sp)
                        item.snippet?.let { snippet ->
                            Text("  $snippet", color = Color(0xFF7AA3C2), fontSize = 9.sp)
                        }
                    }
                }
            }
        }

        response?.summary?.takeIf { it.isNotBlank() }?.let { summary ->
            Text(summary, color = Color(0xFF88B0D0), fontSize = 10.sp)
        }
    }
}

@Composable
private fun DeepStrategyCard(payload: ModulePayload.DestinyPayload?) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF102640))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("DTOE Deep Strategy Contract", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Next Best Action: ${payload?.nextBestAction?.ifBlank { "N/A" } ?: "N/A"}",
                color = Color(0xFFB6D8F2),
                fontSize = 11.sp
            )
            val alternatives = payload?.alternatives.orEmpty()
            if (alternatives.isNotEmpty()) {
                alternatives.take(3).forEach { alt ->
                    val scoreText = if (alt.score != 0.0) " · score ${"%.2f".format(alt.score)}" else ""
                    Text(
                        "• ${alt.summary} (${alt.riskLevel})$scoreText",
                        color = Color(0xFF9FC3DF),
                        fontSize = 10.sp
                    )
                    if (alt.rationale.isNotBlank()) {
                        Text(
                            "  ${alt.rationale}",
                            color = Color(0xFF7FA8C8),
                            fontSize = 9.sp
                        )
                    }
                }
            } else {
                Text("No alternative branches yet.", color = Color(0xFF8FB4D1), fontSize = 10.sp)
            }
            val constraints = payload?.constraintNotes.orEmpty()
            if (constraints.isNotEmpty()) {
                Text("Constraint Notes", color = Color(0xFFDCEEFF), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                constraints.take(3).forEach { note ->
                    Text("• $note", color = Color(0xFF8FB4D1), fontSize = 10.sp)
                }
            }
        }
    }
}

@Composable
private fun DestinyAuditTrailCard(events: List<com.lumi.coredomain.contract.DestinyAuditEventPayload>) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0E1F34))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Audit Trail", color = Color(0xFFE2F3FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            events.take(4).forEach { event ->
                Text(
                    "• ${event.stage}: ${event.detail}",
                    color = Color(0xFF8DB2D0),
                    fontSize = 10.sp
                )
            }
        }
    }
}

/**
 * J-Curve chart: A sparkline showing the typical Bellman value trajectory
 * where scores dip initially (action cost) then recover and surpass baseline.
 */
@Composable
private fun JCurveChart(
    nextSteps: List<String>,
    riskLevel: String
) {
    val accentColor = when (riskLevel.lowercase()) {
        "low", "safe" -> Color(0xFF2AC7FF)
        "high" -> Color(0xFFF97066)
        else -> Color(0xFFF6D08F)
    }

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1E32))) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Expected Value Trajectory (J-Curve)", color = Color(0xFFD8ECFF), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Text("4-week forecast", color = Color(0xFF6B9CC4), fontSize = 10.sp)
            }

            Spacer(modifier = Modifier.height(6.dp))

            // J-Curve Canvas
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
            ) {
                val w = size.width
                val h = size.height
                val padding = 8f

                // Generate J-curve data points (normalized 0..1)
                // Pattern: slight dip from action cost, then recovery and growth
                val nSteps = maxOf(nextSteps.size, 4)
                val points = (0..nSteps).map { i ->
                    val t = i.toFloat() / nSteps
                    // J-curve formula: dip at t=0.2, recover at t=0.5, grow after
                    val y = when {
                        t < 0.25f -> 0.5f - 0.15f * (t / 0.25f)  // Initial dip
                        t < 0.5f -> 0.35f + 0.25f * ((t - 0.25f) / 0.25f) // Recovery
                        else -> 0.6f + 0.3f * ((t - 0.5f) / 0.5f) // Growth
                    }
                    Offset(
                        x = padding + (w - 2 * padding) * t,
                        y = h - padding - (h - 2 * padding) * y
                    )
                }

                // Draw gradient fill under curve
                val fillPath = Path().apply {
                    moveTo(points.first().x, h - padding)
                    points.forEach { lineTo(it.x, it.y) }
                    lineTo(points.last().x, h - padding)
                    close()
                }
                drawPath(
                    path = fillPath,
                    brush = Brush.verticalGradient(
                        colors = listOf(accentColor.copy(alpha = 0.3f), Color.Transparent),
                        startY = 0f,
                        endY = h
                    )
                )

                // Draw curve line
                val linePath = Path().apply {
                    moveTo(points.first().x, points.first().y)
                    for (i in 1 until points.size) {
                        val prev = points[i - 1]
                        val curr = points[i]
                        val midX = (prev.x + curr.x) / 2
                        cubicTo(midX, prev.y, midX, curr.y, curr.x, curr.y)
                    }
                }
                drawPath(
                    path = linePath,
                    color = accentColor,
                    style = Stroke(width = 2.5f, cap = StrokeCap.Round)
                )

                // Draw baseline
                val baselineY = h - padding - (h - 2 * padding) * 0.5f
                drawLine(
                    color = Color(0xFF3B5B7A),
                    start = Offset(padding, baselineY),
                    end = Offset(w - padding, baselineY),
                    strokeWidth = 1f
                )

                // Draw endpoint dot
                val last = points.last()
                drawCircle(color = accentColor, radius = 4f, center = last)
                drawCircle(color = Color(0xFF0F1E32), radius = 2f, center = last)
            }

            // Labels
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Now", color = Color(0xFF5A8BB0), fontSize = 9.sp)
                Text("Cost Phase", color = Color(0xFF5A8BB0), fontSize = 9.sp)
                Text("Recovery Phase", color = Color(0xFF5A8BB0), fontSize = 9.sp)
                Text("Return Phase", color = Color(0xFF5A8BB0), fontSize = 9.sp)
            }
        }
    }
}

/**
 * Route steps timeline — shows the Bellman evaluation pipeline steps.
 */
@Composable
private fun RouteStepsTimeline(steps: List<String>) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF122740))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Evaluation Chain", color = Color(0xFFE1F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            steps.forEachIndexed { index, step ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Step indicator
                    Surface(
                        modifier = Modifier.size(16.dp),
                        shape = CircleShape,
                        color = if (index == steps.lastIndex) Color(0xFF2AC7FF) else Color(0xFF1C4068)
                    ) {
                        Text(
                            "${index + 1}",
                            modifier = Modifier.padding(2.dp),
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(step, color = Color(0xFF9FC3DF), fontSize = 11.sp)
                }
            }
        }
    }
}
