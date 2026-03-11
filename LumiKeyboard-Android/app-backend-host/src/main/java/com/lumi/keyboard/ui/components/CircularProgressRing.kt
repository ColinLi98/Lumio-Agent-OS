package com.lumi.keyboard.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Animated circular progress ring with centered percentage and bottom label.
 *
 * @param value Progress value 0..1
 * @param label Text displayed below the ring (e.g., trait name)
 * @param accentColor Color of the filled arc
 * @param ringSize Diameter of the ring
 */
@Composable
fun CircularProgressRing(
    value: Float,
    label: String,
    modifier: Modifier = Modifier,
    accentColor: Color = Color(0xFF41A6FF),
    trackColor: Color = Color(0xFF1E3A5F),
    textColor: Color = Color(0xFFF0F6FF),
    labelColor: Color = Color(0xFFBCD2EA),
    ringSize: Dp = 72.dp,
    strokeWidth: Dp = 6.dp
) {
    var targetProgress by remember { mutableFloatStateOf(0f) }
    val progress by animateFloatAsState(
        targetValue = targetProgress,
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "ring_anim"
    )
    LaunchedEffect(value) {
        targetProgress = 0f
        targetProgress = value.coerceIn(0f, 1f)
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier.size(ringSize),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.size(ringSize)) {
                val sw = strokeWidth.toPx()
                val arcSize = size.width - sw

                // Background track
                drawArc(
                    color = trackColor,
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = androidx.compose.ui.geometry.Offset(sw / 2f, sw / 2f),
                    size = androidx.compose.ui.geometry.Size(arcSize, arcSize),
                    style = Stroke(width = sw, cap = StrokeCap.Round)
                )

                // Glow layer (wider, transparent)
                if (progress > 0.01f) {
                    drawArc(
                        color = accentColor.copy(alpha = 0.2f),
                        startAngle = -90f,
                        sweepAngle = 360f * progress,
                        useCenter = false,
                        topLeft = androidx.compose.ui.geometry.Offset(sw / 2f, sw / 2f),
                        size = androidx.compose.ui.geometry.Size(arcSize, arcSize),
                        style = Stroke(width = sw + 4.dp.toPx(), cap = StrokeCap.Round)
                    )
                }

                // Progress arc
                drawArc(
                    color = accentColor,
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    topLeft = androidx.compose.ui.geometry.Offset(sw / 2f, sw / 2f),
                    size = androidx.compose.ui.geometry.Size(arcSize, arcSize),
                    style = Stroke(width = sw, cap = StrokeCap.Round)
                )
            }

            // Center percentage text
            Text(
                text = "${(progress * 100).toInt()}%",
                color = textColor,
                fontSize = if (ringSize >= 72.dp) 16.sp else 12.sp,
                fontWeight = FontWeight.Bold
            )
        }

        // Bottom label
        Text(
            text = label,
            color = labelColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
