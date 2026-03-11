package com.lumi.keyboard.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentDiscoveryItem
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.keyboard.ui.components.MiniLineChart
import com.lumi.keyboard.ui.components.TwinBayesianPracticalCard
import com.lumi.keyboard.ui.model.ModuleExecutionStatus
import com.lumi.keyboard.ui.model.ModuleExecutionStep
import com.lumi.keyboard.ui.model.buildTwinPracticalSnapshot

@Composable
fun LixMarketScreenContent(
    response: AgentResponse?,
    payload: ModulePayload.LixPayload?,
    summary: DigitalSoulSummary?,
    dynamicState: DynamicHumanStatePayload?,
    trajectory: List<TrajectoryPointPayload>,
    loading: Boolean,
    timeline: List<ModuleExecutionStep>,
    developerMode: Boolean,
    onPublishIntent: (String) -> Unit,
    onShowMyAgents: () -> Unit,
    onAcceptOffer: (intentId: String, offerId: String) -> Unit,
    onOpenOfferLink: (String) -> Unit
) {
    val stage = payload?.stage ?: "discovery"
    val quotes = payload?.quotes.orEmpty()
    val marketSummary = payload?.summary?.ifBlank { response?.summary } ?: response?.summary.orEmpty()
    val userView = payload?.userView
    val offerCount = payload?.offerCount ?: 0
    val executionSummary = userView?.executablePlanSummary
        ?: if (offerCount > 0) "Received $offerCount executable offers" else "Request published; matching executable supply"
    val etaSummary = userView?.expectedCompletionEta
        ?: payload?.etaMinutes?.let { "$it min" }
        ?: "Updated after offers arrive"
    val guaranteeSummary = userView?.guaranteeSummary
        ?: payload?.userGuaranteeSummary
        ?: "Platform guarantee available; compensation can be triggered on failure"
    val paymentRule = userView?.paymentAndCompensationRule
        ?: "First order 30% / repeat 10%; failed tasks are compensated by policy"
    val dispatchMode = payload?.dispatchDecision?.mode?.ifBlank { null } ?: "capability_auction"
    val dispatchReason = payload?.dispatchDecision?.reasonCodes?.joinToString(" / ").orEmpty()
    var customNeed by rememberSaveable { mutableStateOf("") }
    var businessGoal by rememberSaveable { mutableStateOf("") }
    var budget by rememberSaveable { mutableStateOf("") }
    var deadline by rememberSaveable { mutableStateOf("") }
    var domain by rememberSaveable { mutableStateOf("general") }
    Column(
        modifier = Modifier.padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("External Fulfillment · Intent Exchange", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold)
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1B355E))) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(
                    "Stage ${stage.uppercase()} · Intent ${payload?.intentId ?: "-"} · Offers $offerCount · Quotes ${quotes.size}",
                    color = Color(0xFFAED0EE),
                    fontSize = 12.sp
                )
                Text(
                    "External Fulfillment is activated when internal execution is insufficient or clearly worse.",
                    color = Color(0xFF9CC5E2),
                    fontSize = 10.sp
                )
                if (developerMode) {
                    Text(
                        "Execution status ${response?.status?.name?.lowercase() ?: "idle"} · ${response?.latencyMs ?: 0}ms",
                        color = Color(0xFF8CB8DA),
                        fontSize = 10.sp
                    )
                }
                if (marketSummary.isNotBlank()) {
                    Text(
                        marketSummary,
                        color = Color(0xFFCAE2F6),
                        fontSize = 11.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
        LixTwinFusionVisualCard(
            payload = payload,
            stage = stage,
            summary = summary,
            dynamicState = dynamicState,
            trajectory = trajectory,
            etaSummary = etaSummary
        )
        LixUserResultCard(
            executionSummary = executionSummary,
            etaSummary = etaSummary,
            guaranteeSummary = guaranteeSummary,
            paymentRule = paymentRule,
            dispatchMode = dispatchMode,
            dispatchReason = dispatchReason,
            developerMode = developerMode
        )
        LixQuoteComparisonCard(payload = payload)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(
                onClick = {
                    onPublishIntent("Publish an external fulfillment request and return executable offers")
                },
                enabled = true
            ) { Text("Publish Template") }
            TextButton(onClick = onShowMyAgents, enabled = true) { Text("My Agents") }
        }
        LixCustomPublishCard(
            need = customNeed,
            onNeedChange = { customNeed = it },
            goal = businessGoal,
            onGoalChange = { businessGoal = it },
            budget = budget,
            onBudgetChange = { budget = it },
            deadline = deadline,
            onDeadlineChange = { deadline = it },
            domain = domain,
            onDomainChange = { domain = it },
            onPublish = {
                val prompt = buildCustomLixPrompt(
                    need = customNeed,
                    goal = businessGoal,
                    budget = budget,
                    deadline = deadline,
                    domain = domain
                )
                onPublishIntent(prompt)
            }
        )
        if (loading) {
            Text("Running external fulfillment workflow, please wait...", color = Color(0xFF9EC9E8), fontSize = 11.sp)
        }
        if (developerMode) {
            LixPipelineCard(stage = stage)
        }
        LixIntentDetailScreen(
            intentId = payload?.intentId,
            offers = payload?.offers.orEmpty(),
            loading = loading,
            onAcceptOffer = onAcceptOffer,
            onOpenOfferLink = onOpenOfferLink
        )
        if (developerMode && timeline.isNotEmpty()) {
            LixTimelineCard(timeline = timeline)
        }
    }
}

@Composable
private fun LixQuoteComparisonCard(payload: ModulePayload.LixPayload?) {
    val quotes = payload?.quotes.orEmpty()
    val selection = payload?.providerSelectionSummary
    val approval = payload?.externalApprovalSummary
    val dataScope = payload?.externalDataScopeSummary
    val verification = payload?.externalVerificationSummary
    val proof = payload?.externalProofSummary
    val rollback = payload?.externalRollbackSummary
    val dispute = payload?.externalDisputeSummary
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10253F))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Quote comparison",
                color = Color(0xFFEAF4FF),
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp
            )
            selection?.let {
                val selected = it.selectedProviderName ?: "pending selection"
                Text(
                    "Selection: $selected · approval ${it.approvalStatus.replace('_', ' ')}",
                    color = Color(0xFFD3E9FB),
                    fontSize = 10.sp
                )
                if (it.selectionRationale.isNotBlank()) {
                    Text(
                        it.selectionRationale,
                        color = Color(0xFF9CC5E2),
                        fontSize = 9.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            approval?.summary?.takeIf { it.isNotBlank() }?.let {
                Text("Approval: $it", color = Color(0xFF9CC5E2), fontSize = 9.sp)
            }
            dataScope?.summary?.takeIf { it.isNotBlank() }?.let {
                Text("Data scope: $it", color = Color(0xFF9CC5E2), fontSize = 9.sp)
            }
            proof?.summary?.takeIf { it.isNotBlank() }?.let {
                Text("Proof: $it", color = Color(0xFF9CC5E2), fontSize = 9.sp)
            }
            verification?.summary?.takeIf { it.isNotBlank() }?.let {
                Text("Verification: $it", color = Color(0xFF9CC5E2), fontSize = 9.sp)
            }
            rollback?.summary?.takeIf { it.isNotBlank() }?.let {
                Text("Rollback: $it", color = Color(0xFF9CC5E2), fontSize = 9.sp)
            }
            dispute?.summary?.takeIf { it.isNotBlank() && !it.equals("No active dispute.", ignoreCase = true) }?.let {
                Text("Dispute: $it", color = Color(0xFF9CC5E2), fontSize = 9.sp)
            }
            if (quotes.isEmpty()) {
                Text(
                    "No quotes yet. When available, options are compared by price, ETA, risk, proof method, and rollback/dispute terms.",
                    color = Color(0xFF9CC5E2),
                    fontSize = 10.sp
                )
            } else {
                quotes.take(5).forEachIndexed { index, quote ->
                    Text(
                        "${index + 1}. ${quote.supplier} · ${quote.price} · ETA ${quote.eta} · risk ${quote.riskLevel}",
                        color = Color(0xFFD4E9FA),
                        fontSize = 10.sp
                    )
                    Text(
                        "Policy fit: ${quote.rolePolicyFit} · Trust fit: ${quote.providerTrustFit} · Decision: ${quote.providerDecision.name.lowercase()}",
                        color = Color(0xFF9CC5E2),
                        fontSize = 9.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "Proof: ${quote.proofMethod} · Rollback: ${quote.rollbackTerms} · Dispute: ${quote.disputeTerms} · Approval: ${if (quote.approvalRequired) "required" else "not required"}",
                        color = Color(0xFF9CC5E2),
                        fontSize = 9.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    quote.rolePolicyNotes.takeIf { it.isNotBlank() }?.let { note ->
                        Text(
                            note,
                            color = Color(0xFF88B7D9),
                            fontSize = 9.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LixUserResultCard(
    executionSummary: String,
    etaSummary: String,
    guaranteeSummary: String,
    paymentRule: String,
    dispatchMode: String,
    dispatchReason: String,
    developerMode: Boolean
) {
    val routingHint = when (dispatchMode.lowercase()) {
        "capability_auction" -> "Routing is optimized for capability fit and delivery confidence."
        "lumi_primary" -> "Routing is handled by Lumi primary path for reliability."
        else -> "Routing strategy is active for this intent."
    }
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0F223C))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Executable Results", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            Text(executionSummary, color = Color(0xFFD5EAFE), fontSize = 11.sp)
            Text("ETA: $etaSummary", color = Color(0xFF9FCCEB), fontSize = 10.sp)
            Text("Guarantee: $guaranteeSummary", color = Color(0xFF9FCCEB), fontSize = 10.sp)
            Text("Payment & Compensation: $paymentRule", color = Color(0xFF9FCCEB), fontSize = 10.sp)
            Text(routingHint, color = Color(0xFF7FB9E4), fontSize = 9.sp)
            if (developerMode && dispatchReason.isNotBlank()) {
                Text("Dispatch trace: $dispatchMode · $dispatchReason", color = Color(0xFF6FAAD6), fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun LixTwinFusionVisualCard(
    payload: ModulePayload.LixPayload?,
    stage: String,
    summary: DigitalSoulSummary?,
    dynamicState: DynamicHumanStatePayload?,
    trajectory: List<TrajectoryPointPayload>,
    etaSummary: String
) {
    val marketPoints = buildMarketCurve(payload, stage)
    val practicalSnapshot = buildTwinPracticalSnapshot(
        summary = summary,
        state = dynamicState,
        trajectory = trajectory,
        cloudPosterior = payload?.posterior
    )
    val twinPoints = practicalSnapshot.trendSeries
    val marketTrend = toTrendLabel(marketPoints)
    val twinTrend = toTrendLabel(twinPoints)
    val keyDimensions = practicalSnapshot.dimensions.sortedByDescending { it.mean }.take(6)
    val twinFitScore = twinPoints.lastOrNull()?.coerceIn(0f, 1f) ?: 0.45f
    val offerCount = payload?.offerCount ?: 0

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF112843))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "External Fulfillment × Twin Controls",
                color = Color(0xFFE9F7FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                LixFusionMetricChip(
                    label = "Offers",
                    value = "$offerCount",
                    tint = Color(0xFF4CCBFF),
                    modifier = Modifier.weight(1f)
                )
                LixFusionMetricChip(
                    label = "ETA",
                    value = etaSummary,
                    tint = Color(0xFF6DE6B3),
                    modifier = Modifier.weight(1f)
                )
                LixFusionMetricChip(
                    label = "Twin fit",
                    value = "${(twinFitScore * 100).toInt()}%",
                    tint = Color(0xFFB895FF),
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Market pulse", color = Color(0xFF9FD0EE), fontSize = 10.sp)
                    MiniLineChart(
                        points = marketPoints,
                        trendLabel = marketTrend,
                        currentValue = marketPoints.lastOrNull() ?: 0.5f,
                        lineColor = Color(0xFF43C8FF),
                        fillStartColor = Color(0x3343C8FF),
                        fillEndColor = Color(0x0043C8FF),
                        chartHeight = 92.dp
                    )
                }
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        summary?.profileLabel?.ifBlank { "Twin profile loading" } ?: "Twin profile loading",
                        color = Color(0xFFCFE7FF),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    MiniLineChart(
                        points = twinPoints,
                        trendLabel = twinTrend,
                        currentValue = twinFitScore,
                        lineColor = Color(0xFFB391FF),
                        fillStartColor = Color(0x33B391FF),
                        fillEndColor = Color(0x00B391FF),
                        chartHeight = 92.dp
                    )
                }
            }
            if (keyDimensions.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("Twin 13D features used in matching", color = Color(0xFFA4D2EF), fontSize = 10.sp)
                    keyDimensions.forEach { dim ->
                        TwinDimensionImpactBar(
                            label = dim.label,
                            value = dim.mean.toDouble(),
                            maxValue = 1.0
                        )
                    }
                }
            }
            TwinBayesianPracticalCard(
                snapshot = practicalSnapshot,
                compact = true,
                accent = Color(0xFF6DE6B3),
                glow = Color(0xFF43C8FF),
                surfaceColor = Color(0xFF0D2139)
            )
        }
    }
}

@Composable
private fun LixFusionMetricChip(
    label: String,
    value: String,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = tint.copy(alpha = 0.12f))
    ) {
        Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)) {
            Text(label, color = Color(0xFF9CBFD9), fontSize = 9.sp)
            Text(
                value,
                color = Color(0xFFE7F7FF),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun TwinDimensionImpactBar(
    label: String,
    value: Double,
    maxValue: Double
) {
    val ratio = if (maxValue <= 0.0) 0.0 else (value / maxValue).coerceIn(0.0, 1.0)
    val widthWeight = ratio.toFloat().coerceIn(0.08f, 1f)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = Color(0xFFBDD8EF),
            fontSize = 9.sp,
            modifier = Modifier.weight(0.9f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Box(
            modifier = Modifier
                .weight(1.1f)
                .height(6.dp)
                .background(Color(0xFF224564), RoundedCornerShape(999.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(widthWeight)
                    .height(6.dp)
                    .background(Color(0xFF5FD1FF), RoundedCornerShape(999.dp))
            )
        }
        Text(
            text = "${(ratio * 100).toInt()}",
            color = Color(0xFF8FBCDC),
            fontSize = 9.sp
        )
    }
}

private fun buildMarketCurve(payload: ModulePayload.LixPayload?, stage: String): List<Float> {
    val offerScores = payload?.offers.orEmpty()
        .map { it.score.toFloat().coerceIn(0f, 1f) }
        .take(8)
    if (offerScores.size >= 2) return offerScores
    if (offerScores.size == 1) {
        val score = offerScores.first()
        return listOf((score * 0.65f).coerceAtLeast(0.18f), score)
    }
    val stagePoint = when (stage.lowercase()) {
        "offers" -> 0.56f
        "accepted" -> 0.72f
        "delivery" -> 0.82f
        "review" -> 0.9f
        else -> 0.38f
    }
    val offerPoint = ((payload?.offerCount ?: 0).toFloat() / 6f).coerceIn(0.14f, 0.88f)
    return listOf(0.22f, 0.34f, stagePoint, offerPoint, (stagePoint + offerPoint) / 2f)
}

private fun toTrendLabel(points: List<Float>): String {
    if (points.size < 2) return "stable"
    val delta = (points.last() - points.first())
    return when {
        delta > 0.04f -> "up"
        delta < -0.04f -> "down"
        else -> "stable"
    }
}

@Composable
private fun LixCustomPublishCard(
    need: String,
    onNeedChange: (String) -> Unit,
    goal: String,
    onGoalChange: (String) -> Unit,
    budget: String,
    onBudgetChange: (String) -> Unit,
    deadline: String,
    onDeadlineChange: (String) -> Unit,
    domain: String,
    onDomainChange: (String) -> Unit,
    onPublish: () -> Unit
) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF132947))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Publish Intent to External Fulfillment", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            OutlinedTextField(
                value = need,
                onValueChange = onNeedChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Intent request (required)", fontSize = 11.sp) },
                singleLine = false,
                minLines = 2
            )
            OutlinedTextField(
                value = goal,
                onValueChange = onGoalChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Desired outcome (optional)", fontSize = 11.sp) },
                singleLine = true
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = budget,
                    onValueChange = onBudgetChange,
                    modifier = Modifier.weight(1f),
                    label = { Text("Budget (optional)", fontSize = 11.sp) },
                    singleLine = true
                )
                OutlinedTextField(
                    value = deadline,
                    onValueChange = onDeadlineChange,
                    modifier = Modifier.weight(1f),
                    label = { Text("Deadline (optional)", fontSize = 11.sp) },
                    singleLine = true
                )
            }
            Text("Intent class (optional)", color = Color(0xFFAED0EE), fontSize = 11.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                LixDomainButton(
                    label = "General",
                    selected = domain == "general",
                    onClick = { onDomainChange("general") }
                )
                LixDomainButton(
                    label = "Consumer goods",
                    selected = domain == "consumer_goods",
                    onClick = { onDomainChange("consumer_goods") }
                )
                LixDomainButton(
                    label = "Travel",
                    selected = domain == "travel",
                    onClick = { onDomainChange("travel") }
                )
                LixDomainButton(
                    label = "Hiring",
                    selected = domain == "recruitment",
                    onClick = { onDomainChange("recruitment") }
                )
                LixDomainButton(
                    label = "Local services",
                    selected = domain == "local_service",
                    onClick = { onDomainChange("local_service") }
                )
            }
            Text(
                "Example: Budget £800, buy an iPhone. Lumi should scout supplier platforms/agents, compare legal offers, and return executable transaction actions.",
                color = Color(0xFF8FBBDD),
                fontSize = 10.sp
            )
            Button(
                onClick = onPublish,
                enabled = need.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Publish Intent")
            }
        }
    }
}

@Composable
private fun LixDomainButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    TextButton(onClick = onClick) {
        Text(
            text = label,
            color = if (selected) Color(0xFF38D6FF) else Color(0xFF8FB6D6),
            fontSize = 11.sp
        )
    }
}

private fun buildCustomLixPrompt(
    need: String,
    goal: String,
    budget: String,
    deadline: String,
    domain: String
): String {
    return buildString {
        appendLine("External Fulfillment Intent Publication")
        appendLine("Need: ${need.trim()}")
        if (goal.isNotBlank()) appendLine("Goal: ${goal.trim()}")
        if (budget.isNotBlank()) appendLine("Budget: ${budget.trim()}")
        if (deadline.isNotBlank()) appendLine("Deadline: ${deadline.trim()}")
        appendLine("Domain: ${domain.trim()}")
        appendLine("Market scope: trade any legal capability needed to satisfy this intent (agent, skill, human service, or physical good).")
        appendLine("Execution requirement: return concrete executable actions and platform links.")
        append("Constraint requirement: if key fields are missing, ask user directly instead of making assumptions.")
    }
}

@Composable
fun LixIntentDetailScreen(
    intentId: String?,
    offers: List<AgentDiscoveryItem>,
    loading: Boolean,
    onAcceptOffer: (intentId: String, offerId: String) -> Unit,
    onOpenOfferLink: (String) -> Unit
) {
    if (offers.isEmpty()) {
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF162B4C))) {
            Text(
                text = "No offers yet. Publish a request to receive candidate plans.",
                color = Color(0xFFAED0EE),
                fontSize = 11.sp,
                modifier = Modifier.padding(10.dp)
            )
        }
        return
    }

    offers.take(3).forEach { offer ->
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1C2F57))) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(offer.name, color = Color(0xFFE6F3FF), fontSize = 12.sp)
                    Text(
                        offer.summary,
                        color = Color(0xFFAFCCE8),
                        fontSize = 11.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text("Score ${(offer.score * 100).toInt()}%", color = Color(0xFF82BDE2), fontSize = 10.sp)
                }
                val link = offer.actionDeeplink?.takeIf { it.isNotBlank() }
                    ?: offer.actionUrl?.takeIf { it.isNotBlank() }
                val canAccept = !intentId.isNullOrBlank() && offer.id.isNotBlank()
                if (!link.isNullOrBlank() || canAccept) {
                    Column(horizontalAlignment = Alignment.End) {
                        if (!link.isNullOrBlank()) {
                            TextButton(onClick = { onOpenOfferLink(link) }) {
                                Text(offer.actionLabel ?: "Open")
                            }
                        }
                        if (canAccept) {
                            TextButton(onClick = { onAcceptOffer(intentId!!, offer.id) }) {
                                Text("Accept")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LixTimelineCard(timeline: List<ModuleExecutionStep>) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF122540))) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Task timeline", color = Color(0xFFE5F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            timeline.take(5).forEach { step ->
                val statusColor = when (step.status) {
                    ModuleExecutionStatus.RUNNING -> Color(0xFF8DD2FF)
                    ModuleExecutionStatus.SUCCESS -> Color(0xFF9FE6B7)
                    ModuleExecutionStatus.ERROR -> Color(0xFFF7AEA7)
                    ModuleExecutionStatus.CANCELLED -> Color(0xFFF0C88D)
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

@Composable
private fun LixPipelineCard(stage: String) {
    val stages = listOf("discovery", "offers", "accepted", "delivery", "review")
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF142A46))) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            stages.forEach { step ->
                val active = step == stage
                val color = if (active) Color(0xFF36C9FF) else Color(0xFF6D8EAF)
                Text(
                    text = step,
                    color = color,
                    fontSize = 10.sp,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal
                )
            }
        }
    }
}
