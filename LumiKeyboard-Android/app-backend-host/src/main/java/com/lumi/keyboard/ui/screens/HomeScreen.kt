package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.keyboard.ui.components.CircularProgressRing
import com.lumi.keyboard.ui.components.RadarChartView
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiTypography
import com.lumi.keyboard.ui.theme.glassSurface
import com.lumi.keyboard.ui.theme.glowBorder
import com.lumi.keyboard.ui.theme.smoothProgress
import java.util.Calendar

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HomeScreenContent(
    payload: ModulePayload.HomePayload?,
    summary: DigitalSoulSummary?
) {
    Column(
        modifier = Modifier.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // ── Greeting Section ──
        val greeting = timeBasedGreeting()
        val profileLabel = payload?.profileLabel
            ?.ifBlank { summary?.profileLabel }
            .orEmpty()
            .ifBlank { "User" }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    "$greeting 👋",
                    style = LumiTypography.heading.copy(fontSize = 16.sp)
                )
                Text(
                    "Avatar label: $profileLabel",
                    style = LumiTypography.caption
                )
            }
            // Online status indicator
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(LumiColors.positive)
                )
                Text(
                    "System online",
                    style = LumiTypography.label.copy(color = LumiColors.positive)
                )
            }
        }

        // ── Section: System Overview ──
        SectionHeaderRow("📊 System Overview")

        // ── Radar Chart ──
        val stress = payload?.snapshot?.keyMetrics?.get("stress")?.toFloatOrNull()
        val focus = payload?.snapshot?.keyMetrics?.get("focus")?.toFloatOrNull()
        val energy = payload?.snapshot?.keyMetrics?.get("energy")?.toFloatOrNull()

        val radarDimensions = listOf(
            "Mood Stability" to (1f - (stress ?: 0.5f)).coerceIn(0f, 1f),
            "Execution Focus" to (focus ?: 0.5f).coerceIn(0f, 1f),
            "Energy Reserve" to (energy ?: 0.5f).coerceIn(0f, 1f),
            "Context Load" to 0.45f,
            "Risk Decisions" to 0.55f,
            "Communication Adaptability" to 0.6f
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .glassSurface(color = Color(0xCC0A1630), cornerRadius = 16.dp)
                .glowBorder(glowColor = LumiColors.accent, cornerRadius = 16.dp, alpha = 0.12f)
        ) {
            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    "Multi-dimensional Avatar Radar",
                    style = LumiTypography.subheading.copy(fontSize = 12.sp),
                    modifier = Modifier.padding(start = 8.dp, top = 4.dp)
                )
                RadarChartView(
                    dimensions = radarDimensions,
                    accentColor = LumiColors.accent,
                    glowColor = LumiColors.accentGlow
                )
            }
        }

        // ── Section: Key Metrics ──
        SectionHeaderRow("📈 Key Metrics")

        // ── Quick Stats Row ──
        val metrics = payload?.snapshot?.keyMetrics.orEmpty()
        val confirm24h = metrics["task_confirm_24h"] ?: "0"
        val cancel24h = metrics["task_cancel_24h"] ?: "0"
        val rate24h = metrics["task_confirm_rate_24h"] ?: "0%"
        val dtoeUplift = metrics["dtoe_uplift_24h"] ?: "+0pp"
        val dtoeCalibration = metrics["dtoe_calibration_error_24h"] ?: "0%"
        val dtoeCoverage = metrics["dtoe_confidence_coverage_24h"] ?: "0%"
        val apiStatus = metrics["api_status"] ?: "healthy"

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatPill(
                label = "24h Confirmed",
                value = confirm24h,
                dotColor = LumiColors.positive
            )
            StatPill(
                label = "24h Canceled",
                value = cancel24h,
                dotColor = LumiColors.warning
            )
            StatPill(
                label = "Confirmation Rate",
                value = rate24h,
                dotColor = LumiColors.accent
            )
            StatPill(
                label = "DTOE Uplift",
                value = dtoeUplift,
                dotColor = LumiColors.avatarAccent
            )
            StatPill(
                label = "Calibration Err",
                value = dtoeCalibration,
                dotColor = LumiColors.warning
            )
            StatPill(
                label = "Confidence Coverage",
                value = dtoeCoverage,
                dotColor = LumiColors.homeAccent
            )
            StatPill(
                label = "API",
                value = if (apiStatus == "healthy") "Healthy" else apiStatus,
                dotColor = if (apiStatus == "healthy") LumiColors.positive else LumiColors.error
            )
        }

        // ── Circular Progress: Key Dimensions ──
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            radarDimensions.take(3).forEachIndexed { i, (label, value) ->
                val animatedValue = smoothProgress(value)
                val color = when (i) {
                    0 -> LumiColors.positive
                    1 -> LumiColors.accent
                    else -> Color(0xFFFBBF24)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressRing(
                        value = animatedValue,
                        label = label,
                        accentColor = color,
                        ringSize = 64.dp,
                        strokeWidth = 5.dp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "${(animatedValue * 100).toInt()}%",
                        style = LumiTypography.label.copy(
                            color = color,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }
        }

        // ── Quick Routes ──
        if (!payload?.quickRoutes.isNullOrEmpty()) {
            SectionHeaderRow("🚀 Quick Actions")
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                payload?.quickRoutes?.forEach { route ->
                    Box(
                        modifier = Modifier
                            .glassSurface(
                                color = Color(0xCC162A52),
                                cornerRadius = 10.dp
                            )
                            .padding(horizontal = 12.dp, vertical = 7.dp)
                    ) {
                        Text(
                            route,
                            style = LumiTypography.label.copy(
                                color = LumiColors.accent,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
    }
}

@Composable
private fun SectionHeaderRow(title: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            title,
            style = LumiTypography.subheading.copy(fontSize = 13.sp)
        )
        Spacer(modifier = Modifier.weight(1f))
        Box(
            modifier = Modifier
                .height(1.dp)
                .weight(1f)
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(LumiColors.border, Color.Transparent)
                    )
                )
        )
    }
}

@Composable
private fun StatPill(
    label: String,
    value: String,
    dotColor: Color
) {
    Row(
        modifier = Modifier
            .background(
                Brush.horizontalGradient(
                    colors = listOf(Color(0xFF122340), Color(0xFF0D1D38))
                ),
                RoundedCornerShape(20.dp)
            )
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Text(
            "$label: $value",
            style = LumiTypography.label.copy(color = LumiColors.textSecondary)
        )
    }
}

private fun timeBasedGreeting(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
        hour < 6 -> "Late night"
        hour < 12 -> "Good morning"
        hour < 14 -> "Good noon"
        hour < 18 -> "Good afternoon"
        else -> "Good evening"
    }
}
