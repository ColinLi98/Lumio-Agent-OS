package com.lumi.keyboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.EnvironmentActivationPayload
import com.lumi.coredomain.contract.LocalRoleLabSummaryPayload
import com.lumi.coredomain.contract.PolicyStudioSummaryPayload
import com.lumi.coredomain.contract.ProductShellSummaryPayload
import com.lumi.coredomain.contract.RequesterInboxItemPayload
import com.lumi.coredomain.contract.TenantAdminActivationSummaryPayload
import com.lumi.coredomain.contract.WorkspaceModeOptionPayload
import com.lumi.keyboard.ui.model.EnterpriseShellFormatter

@Composable
fun EnvironmentTruthBannerCard(
    activation: EnvironmentActivationPayload?,
    workspaceOptions: List<WorkspaceModeOptionPayload>,
    selectedWorkspaceMode: String,
    onSelectWorkspaceMode: (String) -> Unit,
    localRoleLab: LocalRoleLabSummaryPayload? = null,
    selectedLocalLabActorId: String = "local_tenant_admin_01",
    onSelectLocalLabActor: (String) -> Unit = {},
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF143058)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = EnterpriseShellFormatter.environmentHeadline(activation),
                        color = Color(0xFFE6F5FF),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Environment badge: ${EnterpriseShellFormatter.environmentBadge(activation)}",
                        color = Color(0xFFB8D6EE),
                        fontSize = 11.sp
                    )
                }
                val badgeColor = when (EnterpriseShellFormatter.environmentBadge(activation)) {
                    "SIMULATOR" -> Color(0xFFF5B54A)
                    "DEMO" -> Color(0xFF8CD2FF)
                    "PILOT" -> Color(0xFFA78BFA)
                    "PRODUCTION" -> Color(0xFF5ED6A4)
                    else -> Color(0xFF9ABEDF)
                }
                Text(
                    text = EnterpriseShellFormatter.environmentBadge(activation),
                    color = badgeColor,
                    fontSize = 10.sp,
                    modifier = Modifier
                        .background(badgeColor.copy(alpha = 0.16f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            if (workspaceOptions.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    workspaceOptions.forEach { option ->
                        val selected = option.mode.equals(selectedWorkspaceMode, ignoreCase = true)
                        Text(
                            text = option.label,
                            color = if (selected) Color(0xFF0F172A) else Color(0xFFB8D6EE),
                            fontSize = 11.sp,
                            modifier = Modifier
                                .background(
                                    if (selected) Color(0xFF8CD2FF) else Color(0x223FA9FF),
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable { onSelectWorkspaceMode(option.mode) }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            if (selectedWorkspaceMode.equals("local_lab", ignoreCase = true) && localRoleLab?.enabled == true) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    localRoleLab.actors.forEach { actor ->
                        val selected = actor.actorId == selectedLocalLabActorId
                        Text(
                            text = actor.actorLabel,
                            color = if (selected) Color(0xFF0F172A) else Color(0xFFB8D6EE),
                            fontSize = 11.sp,
                            modifier = Modifier
                                .background(
                                    if (selected) Color(0xFF8CF4FF) else Color(0x223FA9FF),
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable { onSelectLocalLabActor(actor.actorId) }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            EnterpriseShellFormatter.activationLines(activation)
                .take(4)
                .forEach { line ->
                    Text(
                        text = line,
                        color = Color(0xFF9BC8E8),
                        fontSize = 10.sp
                    )
                }
        }
    }
}

@Composable
fun RequesterInboxCard(
    productShell: ProductShellSummaryPayload?,
    selectedWorkspaceMode: String,
    onSubmitNewTask: () -> Unit,
    onOpenItem: (RequesterInboxItemPayload) -> Unit = {},
) {
    val sections = EnterpriseShellFormatter.requesterInboxSections(productShell, selectedWorkspaceMode)
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF132947)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Requester Inbox / Execution Inbox",
                        color = Color(0xFFEAF4FF),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = if (selectedWorkspaceMode.equals("demo", ignoreCase = true))
                            "Demo tasks are simulated and never counted as pilot evidence."
                        else if (selectedWorkspaceMode.equals("local_lab", ignoreCase = true))
                            "Local role lab tasks rehearse multi-role handoffs and never count as pilot evidence."
                        else
                            "Track in-progress, blocked, waiting, and completed runs.",
                        color = Color(0xFF9BC8E8),
                        fontSize = 10.sp
                    )
                }
                Text(
                    text = "Submit new task",
                    color = Color(0xFF8CD2FF),
                    fontSize = 11.sp,
                    modifier = Modifier
                        .background(Color(0x223FA9FF), RoundedCornerShape(20.dp))
                        .clickable { onSubmitNewTask() }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }

            if (sections.isEmpty()) {
                Text(
                    text = if (selectedWorkspaceMode.equals("demo", ignoreCase = true))
                        "No demo inbox items are available."
                    else if (selectedWorkspaceMode.equals("local_lab", ignoreCase = true))
                        "No local role lab items are available."
                    else
                        "No requester inbox items yet.",
                    color = Color(0xFF9ABEDF),
                    fontSize = 11.sp
                )
            } else {
                sections.forEach { section ->
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = section.title,
                            color = Color(0xFFBFE4FF),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                        section.items.take(3).forEach { item ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF0F2039), RoundedCornerShape(10.dp))
                                    .clickable { onOpenItem(item) }
                                    .padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = item.title.ifBlank { item.taskId },
                                    color = Color(0xFFEAF4FF),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = EnterpriseShellFormatter.inboxItemLine(item),
                                    color = Color(0xFF9BC8E8),
                                    fontSize = 10.sp
                                )
                                item.receiptSummary?.takeIf { it.isNotBlank() }?.let {
                                    Text(
                                        text = it,
                                        color = Color(0xFF88B3D5),
                                        fontSize = 9.sp
                                    )
                                }
                                item.actorLabel?.takeIf { it.isNotBlank() }?.let {
                                    Text(
                                        text = "View: $it",
                                        color = Color(0xFFBFE4FF),
                                        fontSize = 9.sp
                                    )
                                }
                            }
                            val badgeText = when {
                                selectedWorkspaceMode.equals("local_lab", ignoreCase = true) -> "LAB"
                                item.isDemoData -> "DEMO"
                                else -> "LIVE"
                            }
                            val badgeColor = when (badgeText) {
                                "LAB" -> Color(0xFF8CF4FF)
                                "DEMO" -> Color(0xFFF5B54A)
                                else -> Color(0xFFB8D6EE)
                            }
                            Text(
                                text = badgeText,
                                color = if (badgeText == "LIVE") Color(0xFFEAF4FF) else Color(0xFF0F172A),
                                fontSize = 10.sp,
                                modifier = Modifier
                                    .background(
                                        if (badgeText == "LIVE") Color(0x223FA9FF) else badgeColor,
                                        RoundedCornerShape(20.dp)
                                    )
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TenantAdminActivationCard(summary: TenantAdminActivationSummaryPayload?, productShell: ProductShellSummaryPayload?) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF10223F)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = summary?.title ?: "Tenant Admin Setup / Activation",
                color = Color(0xFFEAF4FF),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            EnterpriseShellFormatter.tenantAdminLines(summary)
                .take(6)
                .forEach { line ->
                    Text(
                        text = line,
                        color = Color(0xFF9BC8E8),
                        fontSize = 10.sp
                    )
                }
            EnterpriseShellFormatter.activationPackageLines(productShell)
                .take(4)
                .forEach { line ->
                    Text(
                        text = line,
                        color = Color(0xFF88B3D5),
                        fontSize = 9.sp
                    )
                }
        }
    }
}

@Composable
fun LocalRoleLabOverviewCard(summary: LocalRoleLabSummaryPayload?) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F243D)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Local Role Lab",
                color = Color(0xFFEAF4FF),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            EnterpriseShellFormatter.localRoleLabLines(summary)
                .take(7)
                .forEach { line ->
                    Text(
                        text = line,
                        color = Color(0xFF9BC8E8),
                        fontSize = 10.sp
                    )
                }
        }
    }
}

@Composable
fun PolicyStudioSummaryCard(summary: PolicyStudioSummaryPayload?) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF102643)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Policy Studio v1",
                color = Color(0xFFEAF4FF),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            if (summary == null) {
                Text(
                    text = "Policy Studio summary unavailable.",
                    color = Color(0xFF9ABEDF),
                    fontSize = 10.sp
                )
            } else {
                Text(
                    text = summary.summary,
                    color = Color(0xFF9BC8E8),
                    fontSize = 10.sp
                )
                summary.detailLines.take(5).forEach { line ->
                    Text(
                        text = line,
                        color = Color(0xFF88B3D5),
                        fontSize = 9.sp
                    )
                }
            }
        }
    }
}
