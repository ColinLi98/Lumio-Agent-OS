package com.lumi.keyboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.keyboard.ui.model.TwinDimensionPosterior
import com.lumi.keyboard.ui.model.TwinPracticalSnapshot
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun TwinBayesianPracticalCard(
    snapshot: TwinPracticalSnapshot,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    showRadar: Boolean = !compact,
    accent: Color = Color(0xFF6DE6B3),
    glow: Color = Color(0xFF43C8FF),
    surfaceColor: Color = Color(0xFF102742)
) {
    val ordered = if (compact) {
        snapshot.dimensions.sortedByDescending { it.mean }.take(8)
    } else {
        snapshot.dimensions
    }
    val confidenceText = "${(snapshot.confidence.coerceIn(0f, 1f) * 100).toInt()}%"
    val timestamp = rememberTimestamp(snapshot.updatedAtMs)

    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = surfaceColor)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                "500 Bayesian Practical · 13D Posterior",
                color = Color(0xFFEAF6FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PosteriorChip("Particles", "N=${snapshot.particleCount}", Color(0xFF55C8FF))
                PosteriorChip("Confidence", confidenceText, accent)
                PosteriorChip("Updated", timestamp, Color(0xFFA892FF))
            }
            MiniLineChart(
                points = snapshot.trendSeries,
                trendLabel = trendLabel(snapshot.trendSeries),
                currentValue = snapshot.trendSeries.lastOrNull() ?: 0.5f,
                lineColor = glow,
                fillStartColor = glow.copy(alpha = 0.22f),
                fillEndColor = Color.Transparent,
                chartHeight = if (compact) 84.dp else 96.dp
            )
            if (showRadar) {
                RadarChartView(
                    dimensions = ordered.map { it.label to it.mean },
                    chartHeight = if (compact) 200.dp else 230.dp,
                    accentColor = accent,
                    glowColor = glow
                )
            }
            val displayRows = if (compact) ordered.take(4) else ordered
            displayRows.forEach { item ->
                PosteriorRow(item = item, accent = accent)
            }
        }
    }
}

@Composable
private fun PosteriorChip(
    label: String,
    value: String,
    color: Color
) {
    Card(colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.14f))) {
        Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) {
            Text(label, color = Color(0xFF9EC3DC), fontSize = 9.sp)
            Text(
                value,
                color = Color(0xFFEAF6FF),
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun PosteriorRow(
    item: TwinDimensionPosterior,
    accent: Color
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            item.label,
            color = Color(0xFFC8E1F4),
            fontSize = 10.sp,
            modifier = Modifier.weight(0.85f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Box(
            modifier = Modifier
                .weight(1.25f)
                .height(8.dp)
                .background(Color(0xFF244B68), RoundedCornerShape(999.dp))
        ) {
            val mean = item.mean.coerceIn(0f, 1f)
            val low = item.p10.coerceIn(0f, 1f)
            val high = item.p90.coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxWidth(mean)
                    .height(8.dp)
                    .background(accent.copy(alpha = 0.88f), RoundedCornerShape(999.dp))
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth(high)
                    .height(8.dp)
                    .background(Color.Transparent)
            ) {
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .fillMaxWidth(if (high - low <= 0f) 0f else (high - low) / high)
                        .height(2.dp)
                        .background(Color(0xFFE9B96E), RoundedCornerShape(999.dp))
                )
            }
        }
        Text(
            "${(item.mean * 100).toInt()}%",
            color = accent,
            fontSize = 9.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

private fun trendLabel(points: List<Float>): String {
    if (points.size < 2) return "steady"
    val first = points.first()
    val last = points.last()
    return when {
        last > first + 0.03f -> "up"
        last < first - 0.03f -> "down"
        else -> "steady"
    }
}

private fun rememberTimestamp(ts: Long): String {
    if (ts <= 0L) return "--:--"
    return runCatching {
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))
    }.getOrDefault("--:--")
}
