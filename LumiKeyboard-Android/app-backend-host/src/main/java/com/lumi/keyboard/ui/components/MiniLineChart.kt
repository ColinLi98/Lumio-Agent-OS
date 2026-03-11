package com.lumi.keyboard.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Mini line chart for J-curve trajectory visualization.
 * Draws an animated line path with gradient fill below.
 *
 * @param points List of y values (0..1)
 * @param trendLabel Text like "up", "down", "stable"
 * @param currentValue Current composite value (0..1)
 */
@Composable
fun MiniLineChart(
    points: List<Float>,
    trendLabel: String,
    currentValue: Float,
    modifier: Modifier = Modifier,
    lineColor: Color = Color(0xFF41A6FF),
    fillStartColor: Color = Color(0x4041A6FF),
    fillEndColor: Color = Color(0x0041A6FF),
    gridColor: Color = Color(0xFF1E3A5F),
    chartHeight: Dp = 120.dp
) {
    if (points.isEmpty()) return

    var targetProgress by remember { mutableFloatStateOf(0f) }
    val progress by animateFloatAsState(
        targetValue = targetProgress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "line_anim"
    )
    LaunchedEffect(points) {
        targetProgress = 0f
        targetProgress = 1f
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Header row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "J-Curve · Trajectory Trend",
                color = Color(0xFFE1F4FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            val trendIcon = when (trendLabel) {
                "up" -> "📈"
                "down" -> "📉"
                else -> "➡️"
            }
            Text(
                text = "$trendIcon $trendLabel · ${(currentValue * 100).toInt()}%",
                color = when (trendLabel) {
                    "up" -> Color(0xFF34D399)
                    "down" -> Color(0xFFF87171)
                    else -> Color(0xFFBCD2EA)
                },
                fontSize = 11.sp
            )
        }

        // Chart canvas
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(chartHeight)
                .padding(vertical = 4.dp)
        ) {
            val w = size.width
            val h = size.height
            val padTop = 8.dp.toPx()
            val padBottom = 8.dp.toPx()
            val drawH = h - padTop - padBottom
            val n = points.size

            // Grid lines (3 horizontal)
            for (i in 0..2) {
                val gy = padTop + drawH * i / 2f
                drawLine(
                    color = gridColor.copy(alpha = 0.3f),
                    start = Offset(0f, gy),
                    end = Offset(w, gy),
                    strokeWidth = 0.5.dp.toPx()
                )
            }

            if (n < 2) return@Canvas

            // Calculate visible points based on animation progress
            val visibleCount = (n * progress).toInt().coerceAtLeast(2)

            // Build line path
            val linePath = Path()
            val fillPath = Path()

            val stepX = w / (n - 1).toFloat()

            for (i in 0 until visibleCount) {
                val x = stepX * i
                val y = padTop + drawH * (1f - points[i].coerceIn(0f, 1f))
                if (i == 0) {
                    linePath.moveTo(x, y)
                    fillPath.moveTo(x, h)
                    fillPath.lineTo(x, y)
                } else {
                    linePath.lineTo(x, y)
                    fillPath.lineTo(x, y)
                }
            }

            // Close fill path
            val lastX = stepX * (visibleCount - 1)
            fillPath.lineTo(lastX, h)
            fillPath.close()

            // Draw gradient fill
            drawPath(
                path = fillPath,
                brush = Brush.verticalGradient(
                    colors = listOf(fillStartColor, fillEndColor),
                    startY = padTop,
                    endY = h
                ),
                style = Fill
            )

            // Draw line
            drawPath(
                path = linePath,
                color = lineColor.copy(alpha = 0.9f),
                style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
            )

            // Draw current point dot (last visible point)
            if (visibleCount > 0) {
                val lastIdx = visibleCount - 1
                val cx = stepX * lastIdx
                val cy = padTop + drawH * (1f - points[lastIdx].coerceIn(0f, 1f))
                drawCircle(
                    color = lineColor,
                    radius = 4.dp.toPx(),
                    center = Offset(cx, cy)
                )
                drawCircle(
                    color = lineColor.copy(alpha = 0.3f),
                    radius = 8.dp.toPx(),
                    center = Offset(cx, cy)
                )
            }
        }

        // Point count label
        Text(
            text = "Last ${points.size} data points",
            color = Color(0xFF7EA4CC),
            fontSize = 10.sp,
            modifier = Modifier.padding(start = 4.dp)
        )
    }
}
