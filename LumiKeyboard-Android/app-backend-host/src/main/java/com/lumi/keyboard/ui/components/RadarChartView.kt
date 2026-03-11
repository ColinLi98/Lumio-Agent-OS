package com.lumi.keyboard.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * Radar/spider chart composable for multi-dimensional persona data.
 * Draws a 6-axis hexagonal chart with animated fill and glow effect.
 *
 * @param dimensions List of (label, value 0..1) pairs for up to 6 axes
 * @param accentColor Primary color for the data polygon
 * @param gridColor Color for the background grid lines
 */
@Composable
fun RadarChartView(
    dimensions: List<Pair<String, Float>>,
    modifier: Modifier = Modifier,
    chartHeight: Dp = 260.dp,
    accentColor: Color = Color(0xFF41A6FF),
    glowColor: Color = Color(0xFF67D0FF),
    gridColor: Color = Color(0xFF1E3A5F),
    labelColor: Color = Color(0xFFBCD2EA),
    valueColor: Color = Color(0xFF89BFE8)
) {
    // Animate entrance
    var targetProgress by remember { mutableFloatStateOf(0f) }
    val progress by animateFloatAsState(
        targetValue = targetProgress,
        animationSpec = tween(durationMillis = 900, easing = FastOutSlowInEasing),
        label = "radar_anim"
    )
    LaunchedEffect(dimensions) {
        targetProgress = 0f
        targetProgress = 1f
    }

    val count = dimensions.size.coerceIn(3, 8)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(chartHeight)
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxWidth().height(chartHeight)) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val maxRadius = min(size.width, size.height) / 2f - 44.dp.toPx()

            // Draw grid rings (3 concentric hexagons)
            for (ring in 1..3) {
                val ringRadius = maxRadius * ring / 3f
                drawPolygon(cx, cy, ringRadius, count, gridColor.copy(alpha = 0.35f), Stroke(1.dp.toPx()))
            }

            // Draw axis lines from center to each vertex
            for (i in 0 until count) {
                val angle = startAngle(i, count)
                val endX = cx + maxRadius * cos(angle).toFloat()
                val endY = cy + maxRadius * sin(angle).toFloat()
                drawLine(
                    color = gridColor.copy(alpha = 0.25f),
                    start = Offset(cx, cy),
                    end = Offset(endX, endY),
                    strokeWidth = 1.dp.toPx()
                )
            }

            // Draw data polygon (animated)
            val dataPath = Path()
            val values = dimensions.take(count)
            for (i in values.indices) {
                val (_, value) = values[i]
                val angle = startAngle(i, count)
                val r = maxRadius * value.coerceIn(0f, 1f) * progress
                val px = cx + r * cos(angle).toFloat()
                val py = cy + r * sin(angle).toFloat()
                if (i == 0) dataPath.moveTo(px, py) else dataPath.lineTo(px, py)
            }
            dataPath.close()

            // Glow fill
            drawPath(
                path = dataPath,
                color = glowColor.copy(alpha = 0.08f * progress),
                style = Fill
            )
            // Color fill
            drawPath(
                path = dataPath,
                color = accentColor.copy(alpha = 0.22f * progress),
                style = Fill
            )
            // Stroke
            drawPath(
                path = dataPath,
                color = accentColor.copy(alpha = 0.85f * progress),
                style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
            )

            // Draw vertex dots
            for (i in values.indices) {
                val (_, value) = values[i]
                val angle = startAngle(i, count)
                val r = maxRadius * value.coerceIn(0f, 1f) * progress
                val px = cx + r * cos(angle).toFloat()
                val py = cy + r * sin(angle).toFloat()
                drawCircle(
                    color = accentColor,
                    radius = 4.dp.toPx(),
                    center = Offset(px, py)
                )
                drawCircle(
                    color = glowColor.copy(alpha = 0.4f),
                    radius = 7.dp.toPx(),
                    center = Offset(px, py)
                )
            }

            // Draw labels + values using nativeCanvas
            val paint = android.graphics.Paint().apply {
                isAntiAlias = true
                textAlign = android.graphics.Paint.Align.CENTER
                textSize = 11.dp.toPx()
            }

            for (i in values.indices) {
                val (label, value) = values[i]
                val angle = startAngle(i, count)
                val labelR = maxRadius + 28.dp.toPx()
                val lx = cx + labelR * cos(angle).toFloat()
                val ly = cy + labelR * sin(angle).toFloat()

                // Label
                paint.color = labelColor.hashCode()
                paint.textSize = 11.dp.toPx()
                drawContext.canvas.nativeCanvas.drawText(label, lx, ly, paint)

                // Value percentage
                paint.color = valueColor.hashCode()
                paint.textSize = 10.dp.toPx()
                val pctText = "${(value.coerceIn(0f, 1f) * 100).toInt()}%"
                drawContext.canvas.nativeCanvas.drawText(pctText, lx, ly + 13.dp.toPx(), paint)
            }
        }
    }
}

private fun startAngle(index: Int, count: Int): Double {
    // Start from top (-PI/2) and go clockwise
    return -PI / 2 + 2 * PI * index / count
}

private fun DrawScope.drawPolygon(
    cx: Float,
    cy: Float,
    radius: Float,
    sides: Int,
    color: Color,
    style: Stroke
) {
    val path = Path()
    for (i in 0 until sides) {
        val angle = startAngle(i, sides)
        val px = cx + radius * cos(angle).toFloat()
        val py = cy + radius * sin(angle).toFloat()
        if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
    }
    path.close()
    drawPath(path, color, style = style)
}
