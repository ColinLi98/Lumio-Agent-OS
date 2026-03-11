package com.lumi.keyboard.ui.theme

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.keyboard.ui.model.AppModule

// ============================================================================
// Color Tokens
// ============================================================================

object LumiColors {
    // Base surfaces
    val bg1 = Color(0xFF071326)
    val bg2 = Color(0xFF0C1B35)
    val bg3 = Color(0xFF122340)

    // Card surfaces (semi-transparent for glassmorphism)
    val cardSurface = Color(0xE60B1A34)
    val cardSurfaceElevated = Color(0xE6122441)
    val cardSurfaceHighlight = Color(0xE6193159)

    // Text hierarchy
    val textPrimary = Color(0xFFF0F6FF)
    val textSecondary = Color(0xFFBCD2EA)
    val textTertiary = Color(0xFF7EA4CC)
    val textMuted = Color(0xFF5A7FA3)

    // Accent colors
    val accent = Color(0xFF41A6FF)
    val accentGlow = Color(0xFF67D0FF)
    val positive = Color(0xFF34D399)
    val positiveMuted = Color(0x3334D399)
    val warning = Color(0xFFFBBF24)
    val warningMuted = Color(0x33FBBF24)
    val error = Color(0xFFF87171)
    val errorMuted = Color(0x33F87171)

    // Module accent colors
    val homeAccent = Color(0xFF41A6FF)
    val chatAccent = Color(0xFF67D0FF)
    val lixAccent = Color(0xFF3FB8A0)
    val agentAccent = Color(0xFFFBBF24)
    val avatarAccent = Color(0xFF34D399)
    val destinyAccent = Color(0xFFF97316)
    val settingsAccent = Color(0xFF94A3B8)

    // Borders
    val border = Color(0xFF1E3A5F)
    val borderGlow = Color(0x4041A6FF)

    // Navigation bar
    val navBarBg = Color(0xF0091833)
    val navBarBorder = Color(0xFF1A3050)
}

// ============================================================================
// Gradients
// ============================================================================

object LumiGradients {
    val backgroundFull = Brush.verticalGradient(
        colors = listOf(Color(0xFF071326), Color(0xFF0A1E3B), Color(0xFF091833))
    )

    val headerCard = Brush.horizontalGradient(
        colors = listOf(Color(0xFF0D2240), Color(0xFF132D55), Color(0xFF0D2240))
    )

    val submitButton = Brush.horizontalGradient(
        colors = listOf(Color(0xFF0D79B2), Color(0xFF41A6FF))
    )

    val navBar = Brush.verticalGradient(
        colors = listOf(Color(0x00091833), Color(0xF0091833))
    )

    fun moduleGradient(module: AppModule): Brush {
        return when (module) {
            AppModule.HOME -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF0D2961), Color(0xFF1A3D7A))
            )
            AppModule.CHAT -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF0C2A5C), Color(0xFF163E78))
            )
            AppModule.LIX -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF103B40), Color(0xFF1A4E56))
            )
            AppModule.AGENT -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF3D2A0A), Color(0xFF4D3614))
            )
            AppModule.AVATAR -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF0A3D2A), Color(0xFF124D36))
            )
            AppModule.DESTINY -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF3D1F0A), Color(0xFF4D2A14))
            )
            AppModule.SETTINGS -> Brush.horizontalGradient(
                colors = listOf(Color(0xFF1A2238), Color(0xFF242E45))
            )
        }
    }

    fun moduleAccentColor(module: AppModule): Color {
        return when (module) {
            AppModule.HOME -> LumiColors.homeAccent
            AppModule.CHAT -> LumiColors.chatAccent
            AppModule.LIX -> LumiColors.lixAccent
            AppModule.AGENT -> LumiColors.agentAccent
            AppModule.AVATAR -> LumiColors.avatarAccent
            AppModule.DESTINY -> LumiColors.destinyAccent
            AppModule.SETTINGS -> LumiColors.settingsAccent
        }
    }

    fun moduleAccentGradient(module: AppModule): Brush {
        val accent = moduleAccentColor(module)
        val darker = accent.copy(alpha = 0.6f)
        return Brush.horizontalGradient(colors = listOf(darker, accent))
    }
}

// ============================================================================
// Shapes
// ============================================================================

object LumiShapes {
    val cardSmall = RoundedCornerShape(12.dp)
    val cardMedium = RoundedCornerShape(16.dp)
    val cardLarge = RoundedCornerShape(20.dp)
    val pill = RoundedCornerShape(50)
    val button = RoundedCornerShape(12.dp)
}

// ============================================================================
// Spacing
// ============================================================================

object LumiSpacing {
    val xs: Dp = 4.dp
    val sm: Dp = 8.dp
    val md: Dp = 12.dp
    val lg: Dp = 16.dp
    val xl: Dp = 20.dp
    val xxl: Dp = 24.dp
}

// ============================================================================
// Animation Helpers
// ============================================================================

@Composable
fun pulseAlpha(durationMs: Int = 1500): Float {
    val transition = rememberInfiniteTransition(label = "pulse")
    val alpha by transition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )
    return alpha
}

@Composable
fun glowScale(durationMs: Int = 2000): Float {
    val transition = rememberInfiniteTransition(label = "glow")
    val scale by transition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow_scale"
    )
    return scale
}

fun Modifier.glassSurface(
    color: Color = LumiColors.cardSurface,
    borderColor: Color = LumiColors.border,
    cornerRadius: Dp = 16.dp
): Modifier = this
    .background(color, RoundedCornerShape(cornerRadius))
    .drawBehind {
        drawRoundRect(
            color = borderColor,
            cornerRadius = CornerRadius(cornerRadius.toPx()),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx())
        )
    }

fun Modifier.glowBorder(
    glowColor: Color = LumiColors.accent,
    cornerRadius: Dp = 16.dp,
    alpha: Float = 0.35f
): Modifier = this
    .drawBehind {
        drawRoundRect(
            color = glowColor.copy(alpha = alpha),
            cornerRadius = CornerRadius(cornerRadius.toPx()),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.5.dp.toPx())
        )
    }

fun Modifier.gradientSurface(
    colors: List<Color> = listOf(Color(0xFF0D2240), Color(0xFF132D55), Color(0xFF0A1E3B)),
    cornerRadius: Dp = 16.dp,
    borderColor: Color = LumiColors.border
): Modifier = this
    .background(
        Brush.linearGradient(colors),
        RoundedCornerShape(cornerRadius)
    )
    .drawBehind {
        drawRoundRect(
            color = borderColor,
            cornerRadius = CornerRadius(cornerRadius.toPx()),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx())
        )
    }

// ============================================================================
// Typography
// ============================================================================

object LumiTypography {
    val heading = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        color = LumiColors.textPrimary,
        letterSpacing = (-0.3).sp
    )
    val subheading = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        color = LumiColors.textPrimary,
        letterSpacing = (-0.1).sp
    )
    val body = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        color = LumiColors.textSecondary
    )
    val caption = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 11.sp,
        color = LumiColors.textTertiary
    )
    val label = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        color = LumiColors.textMuted,
        letterSpacing = 0.3.sp
    )
    val metric = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        color = LumiColors.textPrimary,
        letterSpacing = (-0.5).sp
    )
}

// ============================================================================
// Animated Value Helpers
// ============================================================================

@Composable
fun smoothProgress(target: Float, durationMs: Int = 800): Float {
    val animated by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(durationMs, easing = FastOutSlowInEasing),
        label = "smooth_progress"
    )
    return animated
}
