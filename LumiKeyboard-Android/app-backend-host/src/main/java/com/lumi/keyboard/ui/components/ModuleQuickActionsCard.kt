package com.lumi.keyboard.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.FlightTakeoff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.RocketLaunch
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.NetworkPolicy
import com.lumi.keyboard.FeatureFlags
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.ui.theme.LumiColors
import com.lumi.keyboard.ui.theme.LumiGradients
import com.lumi.keyboard.ui.theme.LumiShapes
import com.lumi.keyboard.ui.theme.LumiSpacing

private data class QuickAction(
    val label: String,
    val icon: ImageVector,
    val prompt: String,
    val policy: NetworkPolicy
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ModuleQuickActionsCard(
    module: AppModule,
    baseUrl: String,
    onRun: (String, NetworkPolicy) -> Unit,
    onOpenSettingsActivity: () -> Unit
) {
    val accent = LumiGradients.moduleAccentColor(module)

    val actions = remember(module) {
        when (module) {
            AppModule.HOME -> listOf(
                QuickAction("Refresh Overview", Icons.Filled.Refresh, "Refresh Home Overview", NetworkPolicy.LOCAL_FIRST),
                QuickAction("Task Status", Icons.Filled.Speed, "Summarize recent task status", NetworkPolicy.LOCAL_FIRST)
            )
            AppModule.CHAT -> listOf(
                QuickAction("Flights & Hotels", Icons.Filled.FlightTakeoff, "Help me find flights and hotels", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Professional Rewrite", Icons.Filled.AutoAwesome, "Rewrite this message in a more professional tone", NetworkPolicy.LOCAL_FIRST),
                QuickAction("Recommend Restaurant", Icons.Filled.Restaurant, "Recommend a restaurant with reasons", NetworkPolicy.CLOUD_PREFERRED)
            )
            AppModule.LIX -> listOf(
                QuickAction("Publish Request", Icons.Filled.RocketLaunch, "Publish a LIX request and return executable offers", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Quote Suggestion", Icons.AutoMirrored.Filled.TrendingUp, "Give quote suggestions and evidence for current demand", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Deal Path", Icons.Filled.Explore, "Generate deal path and risk hints", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("My Agents", Icons.Filled.Search, "Query my agents", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Execute Task", Icons.Filled.Code, "ExecuteTasks executor Mode", NetworkPolicy.CLOUD_PREFERRED)
            )
            AppModule.AGENT -> listOf(
                QuickAction("Discover Agents", Icons.Filled.Search, "Discover executable agents and rank them", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Execute Task", Icons.Filled.RocketLaunch, "Execute an agent task and return status", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Popularity Trend", Icons.AutoMirrored.Filled.TrendingUp, "View agent popularity trend", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("GitHub Connect", Icons.Filled.Cloud, "GitHub connect", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("GitHub Import", Icons.Filled.Code, "GitHub import lix-demo/agent-template", NetworkPolicy.CLOUD_PREFERRED)
            )
            AppModule.AVATAR -> listOf(
                QuickAction("Analyze Habits", Icons.Filled.AutoAwesome, "Analyze my habits and update avatar", NetworkPolicy.LOCAL_ONLY),
                QuickAction("Privacy Strategy", Icons.Filled.Shield, "Explain avatar sync strategy and privacy boundaries", NetworkPolicy.LOCAL_ONLY)
            )
            AppModule.DESTINY -> listOf(
                QuickAction("Action Strategy", Icons.Filled.Speed, "Generate today's action strategy summary", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Path Rationale", Icons.Filled.Explore, "Explain rationale and risk of the current path", NetworkPolicy.CLOUD_PREFERRED),
                QuickAction("Best Suggestion", Icons.AutoMirrored.Filled.TrendingUp, "Give me the best next action suggestion", NetworkPolicy.CLOUD_PREFERRED)
            )
            AppModule.SETTINGS -> emptyList()
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        shape = LumiShapes.cardMedium
    ) {
        Column(
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
                .padding(LumiSpacing.md)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .width(3.dp)
                        .height(16.dp)
                        .background(accent, LumiShapes.pill)
                )
                Spacer(modifier = Modifier.width(LumiSpacing.sm))
                Text(
                    "${module.label} Page Actions",
                    color = LumiColors.textPrimary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }
            Spacer(modifier = Modifier.height(LumiSpacing.md))

            if (module == AppModule.SETTINGS) {
                Button(
                    onClick = onOpenSettingsActivity,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LumiColors.accent.copy(alpha = 0.15f)
                    ),
                    shape = LumiShapes.button
                ) {
                    Icon(
                        Icons.Filled.Settings,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = LumiColors.accent
                    )
                    Spacer(modifier = Modifier.width(LumiSpacing.sm))
                    Text("Open native Settings page", color = LumiColors.accent)
                }
                Spacer(modifier = Modifier.height(LumiSpacing.sm))
                Text(
                    "Base URL: $baseUrl",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
                Text(
                    "ime_backend_v2_enabled: ${FeatureFlags.imeBackendV2Enabled}",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
                Text(
                    "app_full_feature_parity_enabled: ${FeatureFlags.appFullFeatureParityEnabled}",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
                Text(
                    "digital_twin_edge_model_mode: ${FeatureFlags.digitalTwinEdgeModelMode}",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
                Text(
                    "digital_twin_edge_model_version: ${FeatureFlags.digitalTwinEdgeModelVersion}",
                    color = LumiColors.textTertiary,
                    fontSize = 12.sp
                )
            } else {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(LumiSpacing.sm),
                    verticalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
                ) {
                    actions.forEach { action ->
                        ActionChip(
                            label = action.label,
                            icon = action.icon,
                            accentColor = accent,
                            onClick = { onRun(action.prompt, action.policy) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionChip(
    label: String,
    icon: ImageVector,
    accentColor: Color,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = tween(100),
        label = "chip_scale"
    )

    Card(
        modifier = Modifier
            .scale(scale)
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = accentColor.copy(alpha = 0.1f)
        ),
        shape = LumiShapes.cardSmall
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(LumiSpacing.sm)
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = accentColor
            )
            Text(
                label,
                color = accentColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
