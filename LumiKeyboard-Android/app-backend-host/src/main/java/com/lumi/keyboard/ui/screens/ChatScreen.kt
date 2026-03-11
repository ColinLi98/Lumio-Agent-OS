package com.lumi.keyboard.ui.screens

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentAction
import com.lumi.coredomain.contract.GateDecision
import com.lumi.coredomain.contract.ClarificationQuestionPayload
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.EvidenceItemPayload
import com.lumi.coredomain.contract.InteractionEventType
import com.lumi.coredomain.contract.ModulePayload
import com.lumi.coredomain.contract.ReasoningProtocolPayload
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.RoutingMode
import com.lumi.coredomain.contract.AgentActionType
import com.lumi.coredomain.contract.AgentRole
import com.lumi.coredomain.contract.SkillSource
import com.lumi.coredomain.contract.SelectedAgentPayload
import com.lumi.coredomain.contract.SkillInvocationPayload
import com.lumi.coredomain.contract.SkillSelectionDecision
import com.lumi.coredomain.contract.TaskGraphPayload
import com.lumi.coredomain.contract.TaskGraphTaskPayload
import com.lumi.coredomain.contract.TaskTrackPayload
import com.lumi.coredomain.contract.GateDecisionStatus
import com.lumi.coredomain.contract.GateType
import com.lumi.coredomain.contract.HandoffPacket
import com.lumi.coredomain.contract.ValidationReport
import com.lumi.keyboard.ui.model.buildResultHighlights
import com.lumi.keyboard.ui.model.ExecutionReceiptFormatter
import com.lumi.keyboard.ui.model.ExternalVisibilityTone
import com.lumi.keyboard.ui.model.extractStructuredPlanSections
import com.lumi.keyboard.ui.model.formatUserFacingResult
import com.lumi.keyboard.ui.model.RoleTraceFormatter
import com.lumi.keyboard.ui.model.resolvePrimaryResultText
import com.lumi.keyboard.ui.model.StructuredPlanSection
import java.text.SimpleDateFormat
import java.net.URI
import java.util.Date
import java.util.Locale

@Composable
fun ChatScreenContent(
    response: AgentResponse?,
    payload: ModulePayload.ChatPayload?,
    summary: DigitalSoulSummary?,
    latestUserRequest: String? = null,
    loading: Boolean,
    developerMode: Boolean,
    onRefine: () -> Unit,
    onSubmitRequirements: (String) -> Unit,
    onSubmitOutcomeFeedback: (String) -> Unit = {},
    onRunNextAction: (String) -> Unit = {},
    onOpenAction: (AgentAction) -> Unit = {},
    onTrackInteraction: (InteractionEventType, Map<String, String>) -> Unit = { _, _ -> }
) {
    val routing = response?.routingDecision ?: payload?.routingDecision
    val taskGraph = response?.taskGraph ?: payload?.taskGraph
    val responseStatus = response?.status
    val taskTrack = payload?.taskTrack
    val reasoning = payload?.reasoningProtocol
    val traceId = response?.traceId ?: taskTrack?.traceId
    val skills = if (response?.skillInvocations?.isNotEmpty() == true) {
        response.skillInvocations
    } else {
        payload?.skillInvocations.orEmpty()
    }
    val skillSelections = if (response?.skillSelectionTrace?.isNotEmpty() == true) {
        response.skillSelectionTrace
    } else {
        payload?.skillSelectionTrace.orEmpty()
    }
    val trustedSkillAttributions = skills
        .mapNotNull(::buildTrustedSkillAttribution)
        .distinctBy { it.skillId }
        .take(3)
    val evidence = payload?.evidenceItems.orEmpty()
    val customerRequest = latestUserRequest?.trim().orEmpty()
    val rawAnswerText = resolvePrimaryResultText(response = response, payloadOverride = payload)
    val synthesizedWaitingOutput = if (rawAnswerText == null && responseStatus == ResponseStatus.WAITING_USER) {
        buildString {
            val latestStep = payload?.taskTrack?.steps?.lastOrNull()?.detail?.trim().orEmpty()
            if (latestStep.isNotBlank()) {
                append(latestStep)
            } else {
                append("Execution is in progress and waiting for your confirmation to continue.")
            }
            val next = response?.nextAction?.trim().orEmpty()
            if (next.isNotBlank()) {
                append("\n\nNext action: ").append(next)
            }
        }.takeIf { it.isNotBlank() }
    } else {
        null
    }
    val answerText = formatUserFacingResult(rawAnswerText ?: synthesizedWaitingOutput) ?: rawAnswerText ?: synthesizedWaitingOutput
    val structuredSections = extractStructuredPlanSections(rawAnswerText)
    val highlights = buildResultHighlights(answerText, maxItems = 3)
    val requirementAction = response?.actions
        ?.firstOrNull { action ->
            action.type == AgentActionType.RUN_QUERY &&
                action.id.equals("provide_constraints", ignoreCase = true)
        }
    val hasConstraintAction = requirementAction != null
    val stepActions = response?.actions.orEmpty().filter { action ->
        action.label.isNotBlank() &&
            (action.type == AgentActionType.OPEN_DEEPLINK || action.type == AgentActionType.RUN_QUERY)
    }
    val quickLinks = collectOutputLinks(
        answerText = answerText,
        evidence = evidence,
        actions = response?.actions.orEmpty(),
        appDeeplink = response?.appDeeplink
    )
    val clarificationQuestion = response?.clarificationQuestions?.firstOrNull()
    val unresolvedGate = response?.gateDecisions?.firstOrNull { it.decision != GateDecisionStatus.PASSED }
    val followUpPrompt = clarificationQuestion?.prompt
        ?: unresolvedGate?.nextAction
        ?: response?.nextAction
        ?: response?.summary
        ?: "Tell me the missing details so I can continue this task."
    val followUpReason = clarificationQuestion?.reason
        ?: unresolvedGate?.reason
        ?: "Additional user input is required before the next execution step."
    val hasConstraintGateR1 = response?.gateDecisions?.any { gate ->
        gate.gate == GateType.GATE_R1_REQUIRE_CONSTRAINTS &&
            gate.decision != GateDecisionStatus.PASSED
    } == true
    val hasConfirmationTokenGateR2 = response?.gateDecisions?.any { gate ->
        gate.gate == GateType.GATE_R2_REQUIRE_USER_CONFIRMATION_TOKEN &&
            gate.decision != GateDecisionStatus.PASSED
    } == true
    val hasConstraintSummarySignal =
        response?.summary.containsInputGapSignal() == true ||
            response?.nextAction.containsInputGapSignal() == true
    val summaryHasOpenClawSignal = response?.summary.orEmpty().contains("openclaw", ignoreCase = true)
    val summaryHasOpenClawMarketSignal =
        response?.summary.orEmpty().contains("no supplier passed digital-twin validation yet", ignoreCase = true) ||
            response?.summary.orEmpty().contains("lumio agent continues supplier-agent negotiation", ignoreCase = true) ||
            response?.summary.orEmpty().contains("supplier validation", ignoreCase = true)
    val ownerIsOpenClaw = response?.ownerAgent in setOf(
        AgentRole.OPENCLAW_ORCHESTRATOR,
        AgentRole.SUB_AGENT_ROUTER,
        AgentRole.SKILL_EXECUTION_AGENT
    )
    val openClawActive = summaryHasOpenClawSignal ||
        summaryHasOpenClawMarketSignal ||
        ownerIsOpenClaw ||
        (routing?.mode == RoutingMode.MULTI_AGENT && skills.isNotEmpty())
    val hasUnresolvedInputGate = unresolvedGate?.let { gate ->
        gate.gate == GateType.GATE_R1_REQUIRE_CONSTRAINTS ||
            gate.gate == GateType.GATE_R2_REQUIRE_USER_CONFIRMATION_TOKEN ||
            gate.reason.containsInputGapSignal() ||
            gate.nextAction.containsInputGapSignal()
    } == true
    val requiresSupplementalInput =
        response?.errorCode?.equals("verification_required", ignoreCase = true) == true ||
            hasConstraintGateR1 ||
            hasConfirmationTokenGateR2 ||
            hasConstraintAction ||
            hasConstraintSummarySignal ||
            hasUnresolvedInputGate ||
            clarificationQuestion != null
    val showConstraintGate = requiresSupplementalInput && !loading
    LaunchedEffect(showConstraintGate, response?.traceId) {
        if (showConstraintGate) {
            onTrackInteraction(
                InteractionEventType.GATE_BLOCK_VIEWED,
                mapOf(
                    "trace_id" to (response?.traceId ?: "unknown"),
                    "gate" to "GATE_R1_REQUIRE_CONSTRAINTS"
                )
            )
        }
    }

    Column(
        modifier = Modifier.padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Lumi OS · Execution Track", color = Color(0xFFEAF4FF), fontWeight = FontWeight.SemiBold)
        if (developerMode) {
            TraceHeaderCard(
                traceId = traceId,
                responseStatus = responseStatus,
                latencyMs = response?.latencyMs,
                taskTrack = taskTrack
            )
            Text(
                "Recommended review order: Final output -> Reasoning summary -> Routing Decision -> Task Graph -> Skills -> Evidence",
                color = Color(0xFF8DB8DA),
                fontSize = 10.sp
            )
        }
        AnswerOutputCard(
            answerText = answerText,
            responseStatus = responseStatus,
            isLoading = loading,
            actionLinks = quickLinks,
            onOpenLink = { link ->
                onOpenAction(
                    AgentAction(
                        id = "open_output_link_${link.url.hashCode()}",
                        label = link.label,
                        type = AgentActionType.OPEN_DEEPLINK,
                        deeplink = link.url
                    )
                )
            }
        )
        if (summary != null) {
            TwinPersonalizationCard(summary = summary)
        }
        NextActionCard(
            nextAction = response?.nextAction,
            responseStatus = responseStatus,
            onRunNextAction = { action ->
                onTrackInteraction(
                    InteractionEventType.NEXT_ACTION_CLICKED,
                    mapOf(
                        "trace_id" to (response?.traceId ?: "unknown"),
                        "next_action" to action
                    )
                )
                onRunNextAction(action)
            }
        )
        if (stepActions.isNotEmpty()) {
            StepActionCard(
                actions = stepActions,
                responseStatus = responseStatus,
                onOpenAction = { action ->
                    onTrackInteraction(
                        InteractionEventType.NEXT_ACTION_CLICKED,
                        mapOf(
                            "trace_id" to (response?.traceId ?: "unknown"),
                            "action_id" to action.id,
                            "action_type" to action.type.name.lowercase()
                        )
                    )
                    onOpenAction(action)
                }
            )
        }
        GateStatusCard(gateDecisions = response?.gateDecisions.orEmpty())
        OsRoutingExplanationCard(
            routingMode = routing?.mode,
            reasonCodes = routing?.reasonCodes.orEmpty(),
            responseStatus = responseStatus,
            taskGraph = taskGraph,
            gateDecisions = response?.gateDecisions.orEmpty(),
            skillSelections = skillSelections,
            traceId = traceId,
            nextAction = response?.nextAction
        )
        OsHealthMatrixCard(
            responseStatus = responseStatus,
            routingMode = routing?.mode,
            taskGraph = taskGraph,
            gateDecisions = response?.gateDecisions.orEmpty(),
            skillSelections = skillSelections,
            skills = skills,
            evidence = evidence,
            validationReport = response?.validationReport,
            nextAction = response?.nextAction,
            openClawActive = openClawActive
        )
        CrossAppActionBrokerCard(
            responseStatus = responseStatus,
            gateDecisions = response?.gateDecisions.orEmpty(),
            actions = response?.actions.orEmpty(),
            quickLinks = quickLinks,
            onOpenAction = { action ->
                onTrackInteraction(
                    InteractionEventType.NEXT_ACTION_CLICKED,
                    mapOf(
                        "trace_id" to (response?.traceId ?: "unknown"),
                        "action_id" to action.id,
                        "action_type" to action.type.name.lowercase()
                    )
                )
                onOpenAction(action)
            }
        )
        if (showConstraintGate) {
            RequirementAlertCard(
                detail = followUpPrompt
            )
            if (customerRequest.isNotBlank()) {
                CustomerRequestCard(request = customerRequest)
            }
            ClarificationQuestionCard(
                question = clarificationQuestion,
                fallbackPrompt = followUpPrompt,
                fallbackReason = followUpReason,
                customerRequest = customerRequest,
                onAnswer = { answer ->
                    onTrackInteraction(
                        InteractionEventType.CLARIFICATION_ANSWERED,
                        mapOf(
                            "trace_id" to (response?.traceId ?: "unknown"),
                            "question_id" to (clarificationQuestion?.id ?: "dynamic_follow_up")
                        )
                    )
                    onSubmitRequirements(answer.trim())
                }
            )
        }
        if (!loading && response != null) {
            OutcomeFeedbackCard(
                responseStatus = responseStatus,
                onFeedback = { feedback ->
                    val eventType = when (feedback) {
                        "solved" -> InteractionEventType.TASK_CONFIRM
                        "not_useful" -> InteractionEventType.TASK_CANCEL
                        else -> InteractionEventType.QUERY_REFINE
                    }
                    onTrackInteraction(
                        eventType,
                        mapOf(
                            "trace_id" to (response?.traceId ?: "unknown"),
                            "feedback" to feedback,
                            "feedback_source" to "explicit_feedback_panel"
                        )
                    )
                    onSubmitOutcomeFeedback(feedback)
                }
            )
        }
        if (response != null) {
            InProcessSupplementCard(
                responseStatus = responseStatus,
                latestUserRequest = customerRequest,
                onSubmit = { supplement ->
                    onTrackInteraction(
                        InteractionEventType.QUERY_REFINE,
                        mapOf(
                            "trace_id" to (response.traceId.ifBlank { "unknown" }),
                            "feedback_source" to "supplement_panel"
                        )
                    )
                    onSubmitRequirements(supplement)
                }
            )
        }
        OpenClawCollaborationCard(
            active = openClawActive,
            ownerAgent = response?.ownerAgent,
            traceId = traceId,
            nextAction = response?.nextAction,
            status = responseStatus
        )
        CloudDecompositionReasoningCard(
            active = openClawActive,
            status = responseStatus,
            phaseLabel = response?.phase?.name ?: taskTrack?.phase,
            reasoning = reasoning,
            taskGraph = taskGraph,
            taskTrack = taskTrack,
            skills = skills,
            evidence = evidence,
            nextAction = response?.nextAction,
            gateDecisions = response?.gateDecisions.orEmpty()
        )
        SkillSelectionTraceCard(
            decisions = skillSelections,
            evidence = evidence
        )
        if (trustedSkillAttributions.isNotEmpty()) {
            TrustedCatalogSourceCard(
                attributions = trustedSkillAttributions,
                onOpenVerification = { attribution ->
                    onOpenAction(
                        AgentAction(
                            id = "open_trusted_verification_${attribution.verificationUrl.hashCode()}",
                            label = "Verify ${attribution.displayName}",
                            type = AgentActionType.OPEN_DEEPLINK,
                            deeplink = attribution.verificationUrl
                        )
                    )
                }
            )
        }
        CollaborationFlowCard(
            traceId = traceId,
            routingMode = routing?.mode,
            taskGraph = taskGraph,
            selectedAgents = payload?.selectedAgents.orEmpty(),
            skills = skills,
            evidence = evidence,
            responseStatus = responseStatus,
            phaseLabel = response?.phase?.name,
            ownerAgentLabel = response?.ownerAgent?.name,
            gateDecisions = response?.gateDecisions.orEmpty(),
            handoffPackets = response?.handoffPackets.orEmpty(),
            validationReport = response?.validationReport,
            nextAction = response?.nextAction,
            developerMode = developerMode
        )
        if (!developerMode && evidence.isNotEmpty()) {
            EvidenceSummaryCard(evidence = evidence)
        }
        if (!developerMode && structuredSections.isNotEmpty()) {
            StructuredPlanCard(
                sections = structuredSections,
                onUsePlan = {
                    onTrackInteraction(
                        InteractionEventType.FALLBACK_PLAN_ACCEPTED,
                        mapOf("trace_id" to (response?.traceId ?: "unknown"))
                    )
                    onRunNextAction("Use the current executable plan and continue with evidence validation.")
                }
            )
        }
        if (highlights.isNotEmpty() && (developerMode || structuredSections.isEmpty())) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF142C4A)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("Actionable points", color = Color(0xFFDDF1FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    highlights.forEach { line ->
                        Text(
                            text = "• $line",
                            color = Color(0xFFB9D9F2),
                            fontSize = 11.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
        if (developerMode && reasoning != null) {
            ReasoningSummaryCard(reasoning = reasoning)
        }
        if (developerMode) {
            Text(
                "Hints: ${payload?.hints?.joinToString(" / ").orEmpty().ifBlank { "Task breakdown / evidence backflow" }}",
                color = Color(0xFFAED0EE),
                fontSize = 12.sp
            )
        }
        responseStatus?.let {
            Text(
                text = "Execution status: ${readableStatus(it)}",
                color = if (it == ResponseStatus.SUCCESS || it == ResponseStatus.PARTIAL) Color(0xFF9CE2B0) else Color(0xFFE7D48B),
                fontSize = 11.sp
            )
        }
        response?.let { traceable ->
            ExecutionReceiptExplainabilityCard(response = traceable)
            RoleTraceFormatter.headline(traceable)?.let { headline ->
                Text(
                    text = headline,
                    color = Color(0xFFC6E4FF),
                    fontSize = 11.sp
                )
            }
            RoleTraceFormatter.impactLines(traceable, maxItems = 2).forEach { impact ->
                Text(
                    text = "• $impact",
                    color = Color(0xFFAAD2F0),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        if (developerMode && routing != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF19365F)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    val modeText = if (routing.mode == RoutingMode.MULTI_AGENT) "Multi-agent collaboration" else "Single-agent + skills"
                    Text("RoutingMode: $modeText", color = Color(0xFFCCEAFF), fontSize = 12.sp)
                    Text(
                        "Complexity ${fmtScore(routing.scores.complexity)} · Risk ${fmtScore(routing.scores.risk)} · Dependency ${fmtScore(routing.scores.dependency)}",
                        color = Color(0xFF9CC3E6),
                        fontSize = 11.sp
                    )
                    if (routing.reasonCodes.isNotEmpty()) {
                        routing.reasonCodes.take(4).forEach { reason ->
                            Text(
                                text = "• ${readableReasonCode(reason)}",
                                color = Color(0xFFD3EBFF),
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            }
        }

        if (developerMode && taskTrack != null && taskTrack.steps.isNotEmpty()) {
            TaskStepTrackCard(taskTrack = taskTrack)
        }

        if (developerMode && taskGraph != null && taskGraph.tasks.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF14294A)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("Task Graph", color = Color(0xFFDCF0FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    taskGraph.tasks.take(4).forEachIndexed { index, task ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                "${index + 1}. ${task.title}",
                                color = Color(0xFFB9D8F2),
                                fontSize = 11.sp,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            val capCount = task.requiredCapabilities.size
                            Text("cap:$capCount", color = Color(0xFF83B0D7), fontSize = 10.sp)
                        }
                    }
                }
            }
        }

        if (developerMode && skills.isNotEmpty()) {
            SkillTrackCard(skills = skills)
        }
        if (developerMode && evidence.isNotEmpty()) {
            EvidenceTrackCard(evidence = evidence)
        }
        if (developerMode && summary != null) {
            TwinUpdateCard(summary = summary)
        }

        TextButton(onClick = onRefine) {
            Text("Refine")
        }
    }
}

@Composable
private fun ExecutionReceiptExplainabilityCard(response: AgentResponse) {
    val receipt = response.executionReceipt ?: return
    val headline = ExecutionReceiptFormatter.headline(response)
    val externalHeadline = ExecutionReceiptFormatter.externalSummaryHeadline(response, maxItems = 5)
    val externalPills = ExecutionReceiptFormatter.externalStatusPills(response, maxItems = 5)
    val summaryLines = ExecutionReceiptFormatter.summaryLines(response, maxItems = 4)
        .filterNot { line ->
            externalHeadline != null && line.equals(externalHeadline, ignoreCase = true)
        }
    val delegationLabel = receipt.delegationMode
        ?.name
        ?.lowercase(Locale.getDefault())
        ?.replace('_', ' ')
        ?.replaceFirstChar { it.uppercase() }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF173452)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(
                text = "Execution receipt",
                color = Color(0xFFE6F5FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            headline?.let { readableHeadline ->
                Text(
                    text = readableHeadline,
                    color = Color(0xFFC8E4FA),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            externalHeadline?.let { summary ->
                Text(
                    text = "External Fulfillment: $summary",
                    color = Color(0xFFE7D48B),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (externalPills.isNotEmpty()) {
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    externalPills.forEach { pill ->
                        ExternalVisibilityChip(
                            label = pill.label,
                            tone = pill.tone
                        )
                    }
                }
            }
            delegationLabel?.let { readableDelegation ->
                Text(
                    text = "Delegation mode: $readableDelegation",
                    color = Color(0xFFA9C9E1),
                    fontSize = 10.sp
                )
            }
            if (summaryLines.isEmpty()) {
                Text(
                    text = receipt.roleImpactSummary,
                    color = Color(0xFFA9C9E1),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                summaryLines.forEach { line ->
                    Text(
                        text = "• $line",
                        color = Color(0xFFA9C9E1),
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun ExternalVisibilityChip(
    label: String,
    tone: ExternalVisibilityTone
) {
    val color = when (tone) {
        ExternalVisibilityTone.POSITIVE -> Color(0xFF9CE2B0)
        ExternalVisibilityTone.WARNING -> Color(0xFFE7D48B)
        ExternalVisibilityTone.NEGATIVE -> Color(0xFFF2A5A5)
        ExternalVisibilityTone.INFO -> Color(0xFFB6DBFF)
    }
    Text(
        text = label,
        color = color,
        fontSize = 9.sp,
        modifier = Modifier
            .background(color.copy(alpha = 0.18f), RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

@Composable
private fun SkillSelectionTraceCard(
    decisions: List<SkillSelectionDecision>,
    evidence: List<EvidenceItemPayload>
) {
    if (decisions.isEmpty()) return

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF17324F)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(
                text = "Skill Selection",
                color = Color(0xFFE6F5FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "required capability -> selected skill -> fallback -> gate -> evidence",
                color = Color(0xFF9CC3E2),
                fontSize = 10.sp
            )
            decisions.take(6).forEach { decision ->
                val primary = decision.primarySkillId?.substringAfter(':') ?: "not_selected"
                val fallback = decision.fallbackSkillId?.substringAfter(':') ?: "none"
                val finalScore = decision.scoreBreakdown.finalScore
                    .takeIf { it > 0.0 }
                    ?: decision.scoreBreakdown.totalScore
                val scoreLabel = String.format(Locale.US, "%.2f", finalScore.coerceIn(0.0, 1.0))
                val gateLabel = decision.gateSnapshot.ifBlank { "pending_gate_snapshot" }
                val evidenceLabel = if (evidence.isEmpty()) "no evidence yet" else "${evidence.size} evidence item(s)"

                Text(
                    text = "• ${decision.requiredCapability} -> $primary (score $scoreLabel)",
                    color = Color(0xFFD8EEFF),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "fallback: $fallback · gate: $gateLabel",
                    color = Color(0xFFAED0EA),
                    fontSize = 9.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "reason: ${decision.selectionReason.ifBlank { "best_available_candidate" }} · $evidenceLabel",
                    color = Color(0xFF95BDD9),
                    fontSize = 9.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun WorkScreenContent(
    response: AgentResponse?,
    payload: ModulePayload.ChatPayload?,
    summary: DigitalSoulSummary?,
    latestUserRequest: String? = null,
    loading: Boolean,
    developerMode: Boolean,
    onRefine: () -> Unit,
    onSubmitRequirements: (String) -> Unit,
    onSubmitOutcomeFeedback: (String) -> Unit = {},
    onRunNextAction: (String) -> Unit = {},
    onOpenAction: (AgentAction) -> Unit = {},
    onTrackInteraction: (InteractionEventType, Map<String, String>) -> Unit = { _, _ -> }
) {
    ChatScreenContent(
        response = response,
        payload = payload,
        summary = summary,
        latestUserRequest = latestUserRequest,
        loading = loading,
        developerMode = developerMode,
        onRefine = onRefine,
        onSubmitRequirements = onSubmitRequirements,
        onSubmitOutcomeFeedback = onSubmitOutcomeFeedback,
        onRunNextAction = onRunNextAction,
        onOpenAction = onOpenAction,
        onTrackInteraction = onTrackInteraction
    )
}

@Composable
private fun StepActionCard(
    actions: List<AgentAction>,
    responseStatus: ResponseStatus?,
    onOpenAction: (AgentAction) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF17304B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Step Actions", color = Color(0xFFE6F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            if (responseStatus == ResponseStatus.RUNNING || responseStatus == ResponseStatus.PROCESSING) {
                Text(
                    "Task is running. You can still open links or queue next steps.",
                    color = Color(0xFFA6CBE7),
                    fontSize = 10.sp
                )
            }
            actions.take(4).forEach { action ->
                Button(
                    onClick = { onOpenAction(action) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val mode = if (action.type == AgentActionType.OPEN_DEEPLINK) "Open" else "Run"
                    Text("$mode · ${action.label}", fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun OpenClawCollaborationCard(
    active: Boolean,
    ownerAgent: AgentRole?,
    traceId: String?,
    nextAction: String?,
    status: ResponseStatus?
) {
    val clipboardManager = LocalClipboardManager.current
    val statusText = status?.let(::readableStatus) ?: "Running"
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF193A52)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "OpenClaw Collaboration",
                color = Color(0xFFE6F5FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                if (active) "Active in this run." else "Not selected in this run.",
                color = if (active) Color(0xFFAEE1C3) else Color(0xFFE7D48B),
                fontSize = 10.sp
            )
            Text(
                "Owner: ${ownerAgent?.toReadableLabel().orEmpty().ifBlank { "CodeX Team Leader" }} · Status: $statusText",
                color = Color(0xFFB9D8F2),
                fontSize = 10.sp
            )
            traceId?.takeIf { it.isNotBlank() }?.let { id ->
                Text(
                    "Trace ID: $id",
                    color = Color(0xFFBFE4FF),
                    fontSize = 10.sp,
                    modifier = Modifier.clickable {
                        clipboardManager.setText(AnnotatedString(id))
                    }
                )
            }
            nextAction?.takeIf { it.isNotBlank() }?.let { action ->
                Text(
                    "Next action: $action",
                    color = Color(0xFFCBE6FF),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun CloudDecompositionReasoningCard(
    active: Boolean,
    status: ResponseStatus?,
    phaseLabel: String?,
    reasoning: ReasoningProtocolPayload?,
    taskGraph: TaskGraphPayload?,
    taskTrack: TaskTrackPayload?,
    skills: List<SkillInvocationPayload>,
    evidence: List<EvidenceItemPayload>,
    nextAction: String?,
    gateDecisions: List<GateDecision>
) {
    if (!active) return
    val taskCount = taskGraph?.tasks?.size ?: 0
    val parallelGroups = taskGraph?.parallelGroups?.size ?: 0
    val hasGraph = taskCount > 0
    val hasReasoning = reasoning != null &&
        (reasoning.rootProblem.isNotBlank() || reasoning.recommendedStrategy.isNotBlank())
    val hasTrack = taskTrack != null && taskTrack.steps.isNotEmpty()
    val stageText = phaseLabel
        ?.replace('_', ' ')
        ?.lowercase()
        ?.replaceFirstChar { it.uppercase() }
        ?: status?.let(::readableStatus)
        ?: "Running"
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF15344E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(
                "Cloud Decomposition and Reasoning",
                color = Color(0xFFE6F5FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Engine: OpenClaw cloud relay · Stage: $stageText",
                color = Color(0xFFBFDDF3),
                fontSize = 10.sp
            )
            StageTimelineChart(stageText = stageText)
            if (hasGraph) {
                Text(
                    "Task DAG: $taskCount subtask(s) · $parallelGroups parallel group(s)",
                    color = Color(0xFFAED4EE),
                    fontSize = 10.sp
                )
                TaskDagMiniChart(taskGraph = taskGraph)
            } else {
                Text(
                    "Task DAG is being prepared.",
                    color = Color(0xFFA7C8DF),
                    fontSize = 10.sp
                )
            }
            if (hasReasoning) {
                Text(
                    "Root issue: ${reasoning?.rootProblem?.ifBlank { "not provided" }}",
                    color = Color(0xFFCCE7FF),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    "Strategy: ${reasoning?.recommendedStrategy?.ifBlank { "not provided" }}",
                    color = Color(0xFFBCD9F0),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                val waitingConstraints = gateDecisions.any { gate ->
                    gate.gate == GateType.GATE_R1_REQUIRE_CONSTRAINTS &&
                        gate.decision != GateDecisionStatus.PASSED
                }
                Text(
                    if (waitingConstraints) {
                        "Reasoning paused: missing user input required by the current gate."
                    } else if (status == ResponseStatus.WAITING_USER) {
                        "Reasoning paused: waiting for cloud execution updates."
                    } else {
                        "Reasoning summary is being generated."
                    },
                    color = Color(0xFFE4D29A),
                    fontSize = 10.sp
                )
            }
            if (hasTrack) {
                val latestStep = taskTrack?.steps?.lastOrNull()
                Text(
                    "Latest cloud step: ${latestStep?.title.orEmpty().ifBlank { "pending" }} · ${latestStep?.status?.let(::readableStatus) ?: "Running"}",
                    color = Color(0xFF9FCAE6),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                "Verification signals: ${skills.size} skill call(s) · ${evidence.size} evidence item(s)",
                color = Color(0xFF9EC1DD),
                fontSize = 10.sp
            )
            VerificationSignalsChart(
                skills = skills,
                evidence = evidence,
                status = status
            )
            nextAction?.takeIf { it.isNotBlank() }?.let { action ->
                Text(
                    "Next action: $action",
                    color = Color(0xFFCBE6FF),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun StageTimelineChart(stageText: String) {
    val stages = listOf("Intake", "Clarify", "Plan", "Execute", "Verify", "Deliver")
    val normalized = stageText.lowercase()
    val current = when {
        normalized.contains("clarify") -> 1
        normalized.contains("plan") -> 2
        normalized.contains("execute") -> 3
        normalized.contains("verify") -> 4
        normalized.contains("deliver") || normalized.contains("success") -> 5
        else -> 0
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        stages.forEachIndexed { index, label ->
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .background(
                            if (index <= current) Color(0xFF66C6FF) else Color(0x334E6B83),
                            RoundedCornerShape(999.dp)
                        )
                )
                Text(
                    text = label.take(4),
                    color = if (index <= current) Color(0xFFCFEAFF) else Color(0xFF7FA1BB),
                    fontSize = 8.sp
                )
            }
        }
    }
}

@Composable
private fun TaskDagMiniChart(taskGraph: TaskGraphPayload?) {
    val tasks = taskGraph?.tasks.orEmpty().take(6)
    if (tasks.isEmpty()) return
    val maxCaps = tasks.maxOf { it.requiredCapabilities.size }.coerceAtLeast(1)
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        tasks.forEachIndexed { index, task ->
            val ratio = (task.requiredCapabilities.size.toFloat() / maxCaps.toFloat()).coerceIn(0.1f, 1f)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .width(16.dp)
                        .height(16.dp)
                        .background(Color(0xFF2E5D86), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${index + 1}", color = Color(0xFFD7ECFF), fontSize = 8.sp)
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        task.title,
                        color = Color(0xFFB9D8F2),
                        fontSize = 9.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .background(Color(0x22476B88), RoundedCornerShape(999.dp))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(ratio)
                                .height(6.dp)
                                .background(Color(0xFF64B8F0), RoundedCornerShape(999.dp))
                        )
                    }
                }
                Text(
                    "${task.requiredCapabilities.size}",
                    color = Color(0xFF96C0DE),
                    fontSize = 9.sp
                )
            }
        }
    }
}

@Composable
private fun VerificationSignalsChart(
    skills: List<SkillInvocationPayload>,
    evidence: List<EvidenceItemPayload>,
    status: ResponseStatus?
) {
    val successfulSkills = skills.count {
        it.status == ResponseStatus.SUCCESS ||
            it.status == ResponseStatus.PARTIAL ||
            it.status == ResponseStatus.COMMITTED
    }
    val skillRatio = if (skills.isEmpty()) 0f else (successfulSkills.toFloat() / skills.size.toFloat()).coerceIn(0f, 1f)
    val evidenceRatio = (evidence.size.coerceAtMost(6).toFloat() / 6f).coerceIn(0f, 1f)
    val completionRatio = when (status) {
        ResponseStatus.SUCCESS -> 1f
        ResponseStatus.COMMITTED -> 1f
        ResponseStatus.PARTIAL -> 0.8f
        ResponseStatus.QUOTING -> 0.62f
        ResponseStatus.AUTH_REQUIRED -> 0.7f
        ResponseStatus.VERIFYING -> 0.86f
        ResponseStatus.WAITING_USER -> 0.55f
        ResponseStatus.RUNNING, ResponseStatus.PROCESSING -> 0.35f
        ResponseStatus.ROLLED_BACK, ResponseStatus.DISPUTED -> 0.2f
        ResponseStatus.ERROR, ResponseStatus.CANCELLED -> 0.15f
        null -> 0.25f
    }

    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        VerificationMetricBar(label = "Skill success", ratio = skillRatio)
        VerificationMetricBar(label = "Evidence depth", ratio = evidenceRatio)
        VerificationMetricBar(label = "Flow completion", ratio = completionRatio)
    }
}

@Composable
private fun VerificationMetricBar(label: String, ratio: Float) {
    val safeRatio = ratio.coerceIn(0f, 1f)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            color = Color(0xFF9EC1DD),
            fontSize = 9.sp,
            modifier = Modifier.width(84.dp)
        )
        Box(
            modifier = Modifier
                .weight(1f)
                .height(6.dp)
                .background(Color(0x223F5D78), RoundedCornerShape(999.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(safeRatio)
                    .height(6.dp)
                    .background(Color(0xFF75C4FF), RoundedCornerShape(999.dp))
            )
        }
        Text(
            "${(safeRatio * 100).toInt()}%",
            color = Color(0xFFB7D8F0),
            fontSize = 9.sp
        )
    }
}

private fun AgentRole.toReadableLabel(): String {
    return name
        .lowercase()
        .split('_')
        .joinToString(" ") { part -> part.replaceFirstChar { c -> c.uppercase() } }
}

@Composable
private fun NextActionCard(
    nextAction: String?,
    responseStatus: ResponseStatus?,
    onRunNextAction: (String) -> Unit
) {
    val action = nextAction?.trim().orEmpty().takeIf { it.isNotBlank() } ?: return
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF153555)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Next Action", color = Color(0xFFE3F2FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                text = action,
                color = Color(0xFFC3DFF5),
                fontSize = 11.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            if (responseStatus != ResponseStatus.RUNNING && responseStatus != ResponseStatus.PROCESSING) {
                TextButton(onClick = { onRunNextAction(action) }) {
                    Text("Do this now", fontSize = 10.sp, color = Color(0xFFBFE4FF))
                }
            }
        }
    }
}

@Composable
internal fun OutcomeFeedbackCard(
    responseStatus: ResponseStatus?,
    onFeedback: (String) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A3550)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Outcome feedback", color = Color(0xFFE3F2FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                text = "Update your Digital Twin from this run, even without keyboard input.",
                color = Color(0xFFBFDDF3),
                fontSize = 10.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TextButton(
                    onClick = { onFeedback("solved") },
                    modifier = Modifier
                        .weight(1f)
                        .semantics { contentDescription = "Outcome Feedback Solved" }
                ) {
                    Text("Solved", fontSize = 10.sp)
                }
                TextButton(
                    onClick = { onFeedback("needs_improvement") },
                    modifier = Modifier
                        .weight(1f)
                        .semantics { contentDescription = "Outcome Feedback Improve" }
                ) {
                    Text("Improve", fontSize = 10.sp)
                }
                TextButton(
                    onClick = { onFeedback("not_useful") },
                    modifier = Modifier
                        .weight(1f)
                        .semantics { contentDescription = "Outcome Feedback Not Useful" }
                ) {
                    Text("Not useful", fontSize = 10.sp)
                }
            }
            responseStatus?.let {
                Text(
                    text = "Current status: ${readableStatus(it)}",
                    color = Color(0xFF9CC3E6),
                    fontSize = 9.sp
                )
            }
        }
    }
}

@Composable
internal fun InProcessSupplementCard(
    responseStatus: ResponseStatus?,
    latestUserRequest: String,
    onSubmit: (String) -> Unit
) {
    var supplementalInput by rememberSaveable { mutableStateOf("") }
    val canSubmit = supplementalInput.trim().isNotBlank()
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A3347)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Need to add details?",
                color = Color(0xFFE3F2FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "You can send extra requirements at any time. Agent will continue with your latest update.",
                color = Color(0xFFBFDDF3),
                fontSize = 10.sp
            )
            OutlinedTextField(
                value = supplementalInput,
                onValueChange = { supplementalInput = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Supplement Input" },
                label = { Text("Additional details", fontSize = 11.sp) },
                placeholder = { Text("Add constraints, corrections, or preferences...", fontSize = 10.sp) },
                minLines = 2
            )
            Button(
                onClick = {
                    val trimmed = supplementalInput.trim()
                    val prompt = buildString {
                        append("Supplemental update from user during execution.")
                        append('\n')
                        if (latestUserRequest.isNotBlank()) {
                            append("Original request: ").append(latestUserRequest.trim()).append('\n')
                        }
                        append("New details: ").append(trimmed).append('\n')
                        append("Re-plan and continue execution with this updated context.")
                    }
                    onSubmit(prompt)
                    supplementalInput = ""
                },
                enabled = canSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Submit Supplement" }
            ) {
                Text("Send supplement", fontSize = 11.sp)
            }
            responseStatus?.let {
                Text(
                    text = "Current status: ${readableStatus(it)}",
                    color = Color(0xFF9CC3E6),
                    fontSize = 9.sp
                )
            }
        }
    }
}

@Composable
private fun GateStatusCard(gateDecisions: List<GateDecision>) {
    if (gateDecisions.isEmpty()) return
    val unresolved = gateDecisions.firstOrNull { it.decision != GateDecisionStatus.PASSED }
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF243246)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Gate Status", color = Color(0xFFE9F3FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            if (unresolved == null) {
                Text("All strict gates passed.", color = Color(0xFFACDFB7), fontSize = 11.sp)
            } else {
                Text(
                    "Blocked at ${readableGateName(unresolved.gate)}",
                    color = Color(0xFFFFDF9A),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    "What is missing: ${unresolved.reason}",
                    color = Color(0xFFF3D39A),
                    fontSize = 10.sp
                )
                Text(
                    "Do this now: ${unresolved.nextAction}",
                    color = Color(0xFFFFE6B8),
                    fontSize = 10.sp
                )
            }
        }
    }
}

@Composable
private fun OsRoutingExplanationCard(
    routingMode: RoutingMode?,
    reasonCodes: List<String>,
    responseStatus: ResponseStatus?,
    taskGraph: TaskGraphPayload?,
    gateDecisions: List<GateDecision>,
    skillSelections: List<SkillSelectionDecision>,
    traceId: String?,
    nextAction: String?
) {
    val unresolvedGate = gateDecisions.firstOrNull { it.decision != GateDecisionStatus.PASSED }
    val taskCount = taskGraph?.tasks?.size ?: 0
    val modeLabel = if (routingMode == RoutingMode.MULTI_AGENT) {
        "Cloud multi-agent route"
    } else {
        "Cloud single-agent + skills route"
    }
    val stageStates = listOf(
        Triple(
            "Reasoning",
            responseStatus != null || reasonCodes.isNotEmpty(),
            false
        ),
        Triple(
            "Decompose",
            taskCount > 0,
            false
        ),
        Triple(
            "Select Skill",
            skillSelections.isNotEmpty(),
            false
        ),
        Triple(
            "Gate Check",
            unresolvedGate == null && gateDecisions.isNotEmpty(),
            unresolvedGate != null
        )
    )
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF173852)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("OS Routing Explanation", color = Color(0xFFE6F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(modeLabel, color = Color(0xFFBFDDF3), fontSize = 11.sp)
            Text(
                "Tasks $taskCount · Skill decisions ${skillSelections.size}",
                color = Color(0xFFA8CDE6),
                fontSize = 10.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                stageStates.forEach { (label, done, blocked) ->
                    val color = when {
                        blocked -> Color(0xFFECA35A)
                        done -> Color(0xFF6ED8A6)
                        else -> Color(0xFF4F7CA0)
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(26.dp)
                            .background(color.copy(alpha = 0.28f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            color = Color(0xFFE4F3FF),
                            fontSize = 9.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
            if (reasonCodes.isNotEmpty()) {
                reasonCodes.take(2).forEach { reason ->
                    Text(
                        text = "• ${readableReasonCode(reason)}",
                        color = Color(0xFFD2EAFF),
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (unresolvedGate != null) {
                Text(
                    "Blocked at ${readableGateName(unresolvedGate.gate)}",
                    color = Color(0xFFFFE0A8),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    "Do this now: ${unresolvedGate.nextAction}",
                    color = Color(0xFFFFEAC5),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                nextAction?.takeIf { it.isNotBlank() }?.let { action ->
                    Text(
                        "Pipeline ready: $action",
                        color = Color(0xFFBEE7C9),
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            traceId?.takeIf { it.isNotBlank() }?.let { id ->
                Text(
                    "Trace: $id",
                    color = Color(0xFF92BEDD),
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

private enum class OsHealthState {
    GOOD,
    WARNING,
    BLOCKED,
    PENDING
}

private data class OsHealthCell(
    val label: String,
    val value: String,
    val detail: String,
    val state: OsHealthState
)

@Composable
private fun OsHealthMatrixCard(
    responseStatus: ResponseStatus?,
    routingMode: RoutingMode?,
    taskGraph: TaskGraphPayload?,
    gateDecisions: List<GateDecision>,
    skillSelections: List<SkillSelectionDecision>,
    skills: List<SkillInvocationPayload>,
    evidence: List<EvidenceItemPayload>,
    validationReport: ValidationReport?,
    nextAction: String?,
    openClawActive: Boolean
) {
    val unresolvedGate = gateDecisions.firstOrNull { it.decision != GateDecisionStatus.PASSED }
    val tasks = taskGraph?.tasks.orEmpty()
    val skillSuccess = skills.count {
        it.status == ResponseStatus.SUCCESS ||
            it.status == ResponseStatus.PARTIAL ||
            it.status == ResponseStatus.COMMITTED
    }
    val skillFailed = skills.count {
        it.status == ResponseStatus.ERROR ||
            it.status == ResponseStatus.CANCELLED ||
            it.status == ResponseStatus.ROLLED_BACK ||
            it.status == ResponseStatus.DISPUTED
    }
    val expectedSelections = tasks.size.coerceAtLeast(1)
    val selectionCoverage = (skillSelections.size.toFloat() / expectedSelections.toFloat()).coerceIn(0f, 1f)
    val deliveryState = when (responseStatus) {
        ResponseStatus.SUCCESS, ResponseStatus.PARTIAL, ResponseStatus.COMMITTED -> OsHealthState.GOOD
        ResponseStatus.WAITING_USER, ResponseStatus.AUTH_REQUIRED -> OsHealthState.WARNING
        ResponseStatus.ERROR, ResponseStatus.CANCELLED, ResponseStatus.ROLLED_BACK, ResponseStatus.DISPUTED -> OsHealthState.BLOCKED
        ResponseStatus.QUOTING, ResponseStatus.VERIFYING, ResponseStatus.RUNNING, ResponseStatus.PROCESSING, null -> OsHealthState.PENDING
    }
    val deliveryValue = when (responseStatus) {
        null -> "Idle"
        else -> readableStatus(responseStatus)
    }
    val selectionState = when {
        skillSelections.isNotEmpty() -> OsHealthState.GOOD
        tasks.isNotEmpty() -> OsHealthState.WARNING
        else -> OsHealthState.PENDING
    }
    val gateState = when {
        unresolvedGate != null -> OsHealthState.BLOCKED
        gateDecisions.isNotEmpty() -> OsHealthState.GOOD
        else -> OsHealthState.PENDING
    }
    val validationState = when {
        validationReport?.passed == true -> OsHealthState.GOOD
        validationReport != null && !validationReport.passed -> OsHealthState.BLOCKED
        evidence.isNotEmpty() -> OsHealthState.WARNING
        else -> OsHealthState.PENDING
    }
    val evidenceState = when {
        evidence.isNotEmpty() -> OsHealthState.GOOD
        responseStatus == ResponseStatus.SUCCESS ||
            responseStatus == ResponseStatus.PARTIAL ||
            responseStatus == ResponseStatus.COMMITTED -> OsHealthState.BLOCKED
        else -> OsHealthState.PENDING
    }
    val executionState = when {
        skillFailed > 0 -> OsHealthState.BLOCKED
        skillSuccess > 0 -> OsHealthState.GOOD
        skills.isNotEmpty() -> OsHealthState.WARNING
        else -> OsHealthState.PENDING
    }

    val cells = listOf(
        OsHealthCell(
            label = "Cloud Reasoner",
            value = if (openClawActive) "Active" else "Standby",
            detail = if (routingMode == RoutingMode.MULTI_AGENT) "multi-agent route" else "single-agent route",
            state = if (openClawActive) OsHealthState.GOOD else OsHealthState.PENDING
        ),
        OsHealthCell(
            label = "Task Decompose",
            value = "${tasks.size} task(s)",
            detail = if (tasks.isNotEmpty()) "dag ready" else "waiting decomposition",
            state = if (tasks.isNotEmpty()) OsHealthState.GOOD else OsHealthState.PENDING
        ),
        OsHealthCell(
            label = "Skill Select",
            value = "${(selectionCoverage * 100).toInt()}%",
            detail = "${skillSelections.size} decisions / ${tasks.size.coerceAtLeast(1)} expected",
            state = selectionState
        ),
        OsHealthCell(
            label = "Policy & Gates",
            value = if (unresolvedGate == null && gateDecisions.isNotEmpty()) "Passed" else "Review",
            detail = unresolvedGate?.let { "blocked at ${readableGateName(it.gate)}" } ?: "strict gates aligned",
            state = gateState
        ),
        OsHealthCell(
            label = "Execution",
            value = "$skillSuccess ok / ${skills.size} run",
            detail = if (skillFailed > 0) "$skillFailed failed invocation(s)" else "skill fallback available",
            state = executionState
        ),
        OsHealthCell(
            label = "Evidence",
            value = "${evidence.size} item(s)",
            detail = if (evidence.isNotEmpty()) "verification inputs present" else "no claim evidence yet",
            state = evidenceState
        ),
        OsHealthCell(
            label = "Validation",
            value = when {
                validationReport?.passed == true -> "Passed"
                validationReport != null -> "Rework"
                else -> "Pending"
            },
            detail = validationReport?.validatorAgent?.toReadableLabel() ?: "waiting validator packet",
            state = validationState
        ),
        OsHealthCell(
            label = "Delivery",
            value = deliveryValue,
            detail = nextAction?.ifBlank { "next action pending" } ?: "next action pending",
            state = deliveryState
        )
    )

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF13314A)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                "OS Health Matrix",
                color = Color(0xFFE6F5FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Cloud reasoning -> skills -> gates -> evidence -> delivery",
                color = Color(0xFFA8CDE6),
                fontSize = 10.sp
            )
            cells.chunked(2).forEach { rowCells ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    rowCells.forEach { cell ->
                        OsHealthCellView(cell = cell, modifier = Modifier.weight(1f))
                    }
                    if (rowCells.size == 1) {
                        Box(modifier = Modifier.weight(1f))
                    }
                }
            }
            Text(
                text = "Legend: Green=ready · Amber=needs input · Orange=blocked · Blue=pending",
                color = Color(0xFF8FB6D6),
                fontSize = 9.sp
            )
        }
    }
}

@Composable
private fun OsHealthCellView(
    cell: OsHealthCell,
    modifier: Modifier = Modifier
) {
    val baseColor = when (cell.state) {
        OsHealthState.GOOD -> Color(0xFF6ED8A6)
        OsHealthState.WARNING -> Color(0xFFE7D48B)
        OsHealthState.BLOCKED -> Color(0xFFECA35A)
        OsHealthState.PENDING -> Color(0xFF71BFFF)
    }
    Box(
        modifier = modifier
            .height(68.dp)
            .background(baseColor.copy(alpha = 0.25f), RoundedCornerShape(10.dp))
            .padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = cell.label,
                color = Color(0xFFDCF0FF),
                fontSize = 9.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = cell.value,
                color = Color(0xFFEAF6FF),
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = cell.detail,
                color = Color(0xFFB5D3E8),
                fontSize = 8.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun CrossAppActionBrokerCard(
    responseStatus: ResponseStatus?,
    gateDecisions: List<GateDecision>,
    actions: List<AgentAction>,
    quickLinks: List<OutputLink>,
    onOpenAction: (AgentAction) -> Unit
) {
    val unresolvedGate = gateDecisions.firstOrNull { it.decision != GateDecisionStatus.PASSED }
    val normalizedActions = actions
        .filter { it.type == AgentActionType.OPEN_DEEPLINK && !it.deeplink.isNullOrBlank() }
    val quickLinkActions = quickLinks.mapIndexed { index, link ->
        AgentAction(
            id = "quick_link_$index",
            label = if (link.label.isBlank()) deriveLinkLabel(link.url, "External target") else link.label,
            type = AgentActionType.OPEN_DEEPLINK,
            deeplink = link.url
        )
    }
    val launchActions = (normalizedActions + quickLinkActions)
        .distinctBy { it.deeplink.orEmpty() + "|" + it.label.trim() }
        .take(8)
    val waitingUser = responseStatus == ResponseStatus.WAITING_USER || responseStatus == ResponseStatus.AUTH_REQUIRED
    val executionDone = responseStatus == ResponseStatus.SUCCESS ||
        responseStatus == ResponseStatus.PARTIAL ||
        responseStatus == ResponseStatus.COMMITTED ||
        responseStatus == ResponseStatus.ROLLED_BACK ||
        responseStatus == ResponseStatus.DISPUTED
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF143248)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Cross-App Action Broker", color = Color(0xFFE6F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Cloud plan -> target launch -> user confirmation -> evidence return",
                color = Color(0xFFA8CDE6),
                fontSize = 10.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                BrokerStagePill(
                    label = "Plan",
                    state = if (responseStatus != null) BrokerStageState.DONE else BrokerStageState.ACTIVE
                )
                BrokerStagePill(
                    label = "Launch",
                    state = if (launchActions.isNotEmpty()) BrokerStageState.DONE else BrokerStageState.PENDING
                )
                BrokerStagePill(
                    label = "Confirm",
                    state = when {
                        unresolvedGate != null -> BrokerStageState.BLOCKED
                        waitingUser -> BrokerStageState.ACTIVE
                        else -> BrokerStageState.PENDING
                    }
                )
                BrokerStagePill(
                    label = "Verify",
                    state = when {
                        unresolvedGate != null -> BrokerStageState.BLOCKED
                        executionDone -> BrokerStageState.DONE
                        else -> BrokerStageState.PENDING
                    }
                )
            }
            if (launchActions.isEmpty()) {
                Text(
                    "No launchable targets yet. Continue execution to generate verified links.",
                    color = Color(0xFF9BC1DA),
                    fontSize = 10.sp
                )
            } else {
                launchActions.forEachIndexed { index, action ->
                    val target = action.deeplink.orEmpty()
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                "${index + 1}. ${action.label.ifBlank { deriveLinkLabel(target, "Target ${index + 1}") }}",
                                color = Color(0xFFD4EBFF),
                                fontSize = 10.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                actionTargetSummary(target),
                                color = Color(0xFF97BDD8),
                                fontSize = 9.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        TextButton(onClick = { onOpenAction(action) }) {
                            Text("Open", fontSize = 10.sp, color = Color(0xFFAFDAFF))
                        }
                    }
                }
            }
            if (unresolvedGate != null) {
                Text(
                    "Blocked at ${readableGateName(unresolvedGate.gate)} · ${unresolvedGate.nextAction}",
                    color = Color(0xFFFFDF9A),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

private enum class BrokerStageState {
    DONE,
    ACTIVE,
    BLOCKED,
    PENDING
}

@Composable
private fun RowScope.BrokerStagePill(
    label: String,
    state: BrokerStageState
) {
    val color = when (state) {
        BrokerStageState.DONE -> Color(0xFF6ED8A6)
        BrokerStageState.ACTIVE -> Color(0xFF71BFFF)
        BrokerStageState.BLOCKED -> Color(0xFFECA35A)
        BrokerStageState.PENDING -> Color(0xFF4F7CA0)
    }
    Box(
        modifier = Modifier
            .weight(1f)
            .height(24.dp)
            .background(color.copy(alpha = 0.28f), RoundedCornerShape(8.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = Color(0xFFE6F4FF),
            fontSize = 9.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun actionTargetSummary(raw: String): String {
    if (raw.isBlank()) return "unknown target"
    val normalized = normalizeOutputUrl(raw)
    val parsed = runCatching { URI(normalized) }.getOrNull() ?: return normalized
    val scheme = parsed.scheme.orEmpty().ifBlank { "link" }
    val host = parsed.host?.removePrefix("www.")?.ifBlank { null }
    val path = parsed.path?.takeIf { it.isNotBlank() }?.take(42).orEmpty()
    return if (host != null) "$scheme://$host$path" else normalized
}

@Composable
internal fun ClarificationQuestionCard(
    question: ClarificationQuestionPayload?,
    fallbackPrompt: String,
    fallbackReason: String,
    customerRequest: String,
    onAnswer: (String) -> Unit
) {
    var budget by rememberSaveable(question?.id, "budget") { mutableStateOf("") }
    var deadline by rememberSaveable(question?.id, "deadline") { mutableStateOf("") }
    var acceptance by rememberSaveable(question?.id, "acceptance") { mutableStateOf("") }
    var confirmationToken by rememberSaveable(question?.id, "token") { mutableStateOf("") }
    var freeText by rememberSaveable(question?.id, fallbackPrompt, "notes") { mutableStateOf("") }
    val prompt = question?.prompt?.ifBlank { fallbackPrompt } ?: fallbackPrompt
    val reason = question?.reason?.ifBlank { fallbackReason } ?: fallbackReason
    val questionId = question?.id ?: "dynamic_follow_up"
    val canSubmit =
        budget.trim().isNotBlank() ||
            deadline.trim().isNotBlank() ||
            acceptance.trim().isNotBlank() ||
            confirmationToken.trim().isNotBlank() ||
            freeText.trim().isNotBlank()
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF203650)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Complete requirements", color = Color(0xFFEAF4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(prompt, color = Color(0xFFBFD9F0), fontSize = 11.sp)
            Text("Reason: $reason", color = Color(0xFF9EC1DD), fontSize = 10.sp)
            if (customerRequest.isNotBlank()) {
                Text(
                    text = "Customer request: $customerRequest",
                    color = Color(0xFFAED2EA),
                    fontSize = 10.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                text = "Fill any known fields now. You can submit multiple rounds to keep execution moving.",
                color = Color(0xFF9EC1DD),
                fontSize = 10.sp
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                question?.options.orEmpty().take(3).forEach { option ->
                    TextButton(
                        onClick = {
                            freeText = option.value
                            onAnswer(
                                buildConstraintSubmissionPrompt(
                                    questionId = questionId,
                                    prompt = prompt,
                                    reason = reason,
                                    customerRequest = customerRequest,
                                    quickAnswer = option.value,
                                    budget = budget,
                                    deadline = deadline,
                                    acceptanceCriteria = acceptance,
                                    confirmationToken = confirmationToken,
                                    additionalNotes = option.value
                                )
                            )
                        }
                    ) {
                        Text(
                            text = option.label,
                            color = Color(0xFFBEE4FF),
                            fontSize = 10.sp
                        )
                    }
                }
            }
            OutlinedTextField(
                value = budget,
                onValueChange = { budget = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Requirements Budget Input" },
                label = { Text("Budget", fontSize = 11.sp) },
                placeholder = { Text("e.g. £800 / <= 5000 CNY", fontSize = 10.sp) },
                singleLine = true
            )
            OutlinedTextField(
                value = deadline,
                onValueChange = { deadline = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Requirements Deadline Input" },
                label = { Text("Deadline", fontSize = 11.sp) },
                placeholder = { Text("e.g. by 2026-03-10 or within 48h", fontSize = 10.sp) },
                singleLine = true
            )
            OutlinedTextField(
                value = acceptance,
                onValueChange = { acceptance = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Requirements Acceptance Input" },
                label = { Text("Acceptance criteria", fontSize = 11.sp) },
                placeholder = { Text("What counts as done?", fontSize = 10.sp) },
                minLines = 2
            )
            OutlinedTextField(
                value = confirmationToken,
                onValueChange = { confirmationToken = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Requirements Token Input" },
                label = { Text("Confirmation token (if required)", fontSize = 11.sp) },
                placeholder = { Text("Optional unless gate asks for token", fontSize = 10.sp) },
                singleLine = true
            )
            OutlinedTextField(
                value = freeText,
                onValueChange = { freeText = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Requirements Notes Input" },
                label = { Text("Additional details", fontSize = 11.sp) },
                placeholder = { Text("Anything else the agents should know…", fontSize = 10.sp) },
                minLines = 2
            )
            Button(
                onClick = {
                    val submission = buildConstraintSubmissionPrompt(
                        questionId = questionId,
                        prompt = prompt,
                        reason = reason,
                        customerRequest = customerRequest,
                        quickAnswer = null,
                        budget = budget,
                        deadline = deadline,
                        acceptanceCriteria = acceptance,
                        confirmationToken = confirmationToken,
                        additionalNotes = freeText
                    )
                    onAnswer(submission)
                    freeText = ""
                },
                enabled = canSubmit,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Submit requirements", fontSize = 11.sp)
            }
        }
    }
}

private fun buildConstraintSubmissionPrompt(
    questionId: String,
    prompt: String,
    reason: String,
    customerRequest: String,
    quickAnswer: String?,
    budget: String,
    deadline: String,
    acceptanceCriteria: String,
    confirmationToken: String,
    additionalNotes: String
): String {
    val lines = mutableListOf<String>()
    val normalizedRequest = customerRequest.trim()
    if (normalizedRequest.isNotBlank()) {
        lines += "Customer request: $normalizedRequest"
    }
    lines += "Clarification id: $questionId"
    lines += "Question id: $questionId"
    lines += "Clarification prompt: ${prompt.trim()}"
    lines += "Reason: ${reason.trim()}"
    quickAnswer?.trim()?.takeIf { it.isNotBlank() }?.let { answer ->
        lines += "Answer: $answer"
    }
    budget.trim().takeIf { it.isNotBlank() }?.let { value ->
        lines += "Budget: $value"
    }
    deadline.trim().takeIf { it.isNotBlank() }?.let { value ->
        lines += "Deadline: $value"
    }
    acceptanceCriteria.trim().takeIf { it.isNotBlank() }?.let { value ->
        lines += "Acceptance criteria: $value"
    }
    confirmationToken.trim().takeIf { it.isNotBlank() }?.let { value ->
        lines += "Confirmation token: $value"
    }
    additionalNotes.trim().takeIf { it.isNotBlank() }?.let { note ->
        lines += "User input: $note"
    }
    lines += "Continue execution and return a complete executable solution with verifiable evidence."
    return lines.joinToString(separator = "\n")
}

@Composable
private fun EvidenceSummaryCard(evidence: List<EvidenceItemPayload>) {
    val clipboardManager = LocalClipboardManager.current
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF133352)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Evidence", color = Color(0xFFE6F5FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            evidence.take(4).forEach { item ->
                val title = item.title.ifBlank { item.source }
                val detail = item.snippet?.takeIf { it.isNotBlank() } ?: item.source
                Text(
                    text = "• $title · ${detail.take(96)}",
                    color = Color(0xFFB8D7ED),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                item.url?.takeIf { it.isNotBlank() }?.let { link ->
                    Text(
                        text = link,
                        color = Color(0xFF8CCBFF),
                        fontSize = 9.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.clickable {
                            clipboardManager.setText(AnnotatedString(link))
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun TrustedCatalogSourceCard(
    attributions: List<TrustedSkillAttribution>,
    onOpenVerification: (TrustedSkillAttribution) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF123C34)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Trusted source attribution",
                color = Color(0xFFE6FFF7),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            attributions.take(3).forEach { attribution ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = attribution.displayName,
                        color = Color(0xFFC7F1E5),
                        fontSize = 10.sp,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF2A6D5C), RoundedCornerShape(999.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = attribution.badgeLabel,
                            color = Color(0xFFEFFCF8),
                            fontSize = 8.sp
                        )
                    }
                }
                Text(
                    text = "Verification: ${attribution.verificationUrl}",
                    color = Color(0xFF93E5D0),
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.clickable { onOpenVerification(attribution) }
                )
            }
        }
    }
}

private fun readableGateName(gate: GateType): String {
    return when (gate) {
        GateType.GATE_R1_REQUIRE_CONSTRAINTS -> "Gate R1 (Constraints Required)"
        GateType.GATE_R2_REQUIRE_USER_CONFIRMATION_TOKEN -> "Gate R2 (Confirmation Token Required)"
        GateType.GATE_R3_BUDGET_SCOPE_GUARD -> "Gate R3 (Budget Scope Guard)"
        GateType.GATE_R4_EVIDENCE_REQUIRED_FOR_SUCCESS -> "Gate R4 (Evidence Required)"
        GateType.GATE_R5_SUPPLIER_VALIDATION_REQUIRED -> "Gate R5 (Supplier Validation Required)"
        GateType.GATE_R6_NO_EMPTY_RETURN -> "Gate R6 (No Empty Return)"
        GateType.GATE_R7_HIGH_RISK_EXECUTION_PROHIBITED -> "Gate R7 (High-Risk Execution Prohibited)"
        GateType.GATE_R8_DATA_AUTHENTICITY_REQUIRED -> "Gate R8 (Data Authenticity Required)"
    }
}

private fun String?.containsInputGapSignal(): Boolean {
    val normalized = this?.trim()?.lowercase().orEmpty()
    if (normalized.isBlank()) return false
    val intentMarkers = listOf(
        "missing",
        "need more",
        "required",
        "require",
        "provide",
        "incomplete",
        "lack",
        "缺失",
        "缺少",
        "补充",
        "请提供",
        "需要"
    )
    val fieldMarkers = listOf(
        "constraint",
        "budget",
        "deadline",
        "timeline",
        "acceptance",
        "criteria",
        "token",
        "confirmation",
        "预算",
        "时限",
        "期限",
        "验收",
        "确认"
    )
    val hasIntent = intentMarkers.any { marker -> normalized.contains(marker) }
    val hasField = fieldMarkers.any { marker -> normalized.contains(marker) }
    return hasIntent && hasField
}

@Composable
private fun RequirementAlertCard(
    detail: String
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF4B2E14)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    "Missing requirements",
                    color = Color(0xFFFFE7B3),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    detail,
                    color = Color(0xFFF2D39A),
                    fontSize = 10.sp
                )
            }
        }
    }
}

@Composable
private fun CustomerRequestCard(request: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF213043)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                "Customer request",
                color = Color(0xFFE2F2FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                request,
                color = Color(0xFFB9D6EC),
                fontSize = 10.sp,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

private data class CollaborationStage(
    val title: String,
    val detail: String,
    val completed: Boolean
)

private enum class AgentGraphState {
    DONE,
    ACTIVE,
    BLOCKED,
    PENDING
}

private data class AgentGraphNode(
    val label: String,
    val state: AgentGraphState
)

private data class TrustedSkillAttribution(
    val skillId: String,
    val displayName: String,
    val badgeLabel: String,
    val verificationUrl: String
)

@Composable
private fun CollaborationFlowCard(
    traceId: String?,
    routingMode: RoutingMode?,
    taskGraph: TaskGraphPayload?,
    selectedAgents: List<SelectedAgentPayload>,
    skills: List<SkillInvocationPayload>,
    evidence: List<EvidenceItemPayload>,
    responseStatus: ResponseStatus?,
    phaseLabel: String?,
    ownerAgentLabel: String?,
    gateDecisions: List<GateDecision>,
    handoffPackets: List<HandoffPacket>,
    validationReport: ValidationReport?,
    nextAction: String?,
    developerMode: Boolean
) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    val activeSkills = skills.filter { it.status != ResponseStatus.CANCELLED }
    val hasExecutionSignal =
        traceId?.isNotBlank() == true ||
            responseStatus != null ||
            nextAction?.isNotBlank() == true ||
            gateDecisions.isNotEmpty() ||
            handoffPackets.isNotEmpty() ||
            selectedAgents.isNotEmpty() ||
            activeSkills.isNotEmpty() ||
            (taskGraph?.tasks?.isNotEmpty() == true)
    var expandedStageIndex by remember { mutableStateOf<Int?>(null) }
    val plannedTasks = taskGraph?.tasks.orEmpty()
    val workerAgents = resolveWorkerAgents(selectedAgents, plannedTasks)
    val runningLabel = responseStatus?.let(::readableStatus) ?: "Idle"
    val evidenceLabel = "${evidence.size} evidence item${if (evidence.size == 1) "" else "s"} · $runningLabel"
    val stages = listOf(
        CollaborationStage(
            title = "CodeX Team Leader",
            detail = if (!hasExecutionSignal) {
                "Waiting for a goal submission."
            } else if (routingMode == RoutingMode.MULTI_AGENT) {
                "Goal decomposed and parallel strategy activated."
            } else {
                "Primary plan prepared with agent fallback."
            },
            completed = hasExecutionSignal
        ),
        CollaborationStage(
            title = "OpenClaw Router",
            detail = if (routingMode == RoutingMode.MULTI_AGENT) {
                "Subtasks distributed to specialist agents."
            } else {
                "Single route selected with skill extensions."
            },
            completed = plannedTasks.isNotEmpty() || activeSkills.isNotEmpty()
        ),
        CollaborationStage(
            title = "Worker Agents",
            detail = workerAgents.take(3).joinToString(" / ").ifBlank { "Assignment pending..." },
            completed = workerAgents.isNotEmpty()
        ),
        CollaborationStage(
            title = "Skill Execution",
            detail = activeSkills.take(3).joinToString(" / ") { skill ->
                "${readableSkillSource(skill)}:${skill.skillId.substringAfter(':')}${trustedSkillInlineSuffix(skill)}"
            }.ifBlank { "Waiting for skill execution..." },
            completed = activeSkills.any { it.status == ResponseStatus.SUCCESS || it.status == ResponseStatus.PARTIAL }
        ),
        CollaborationStage(
            title = "Evidence & Validation",
            detail = evidenceLabel,
            completed = responseStatus == ResponseStatus.SUCCESS || responseStatus == ResponseStatus.PARTIAL
        ),
        CollaborationStage(
            title = "Independent Audit",
            detail = validationReport?.let {
                val state = if (it.passed) "passed" else "rework required"
                "Validator: ${it.validatorAgent.toReadableLabel()} · $state"
            } ?: "Audit pending...",
            completed = validationReport?.passed == true
        )
    )

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF173B5E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Multi-Agent Collaboration Map",
                color = Color(0xFFE6F5FF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            val phaseText = phaseLabel?.replace('_', ' ')?.lowercase()?.replaceFirstChar { it.uppercase() }
                ?: "Unknown"
            val ownerText = ownerAgentLabel?.replace('_', ' ')?.lowercase()?.replaceFirstChar { it.uppercase() }
                ?: "Unknown"
            Text(
                text = "Phase: $phaseText · Owner: $ownerText",
                color = Color(0xFFB9D8F2),
                fontSize = 10.sp
            )
            AgentCollaborationGraph(
                phaseLabel = phaseLabel,
                responseStatus = responseStatus,
                gateDecisions = gateDecisions,
                hasHandoffTimeline = handoffPackets.isNotEmpty(),
                hasAuditSignal = validationReport != null
            )
            if (gateDecisions.isNotEmpty()) {
                val unresolved = gateDecisions.filter { !it.decision.name.equals("PASSED", ignoreCase = true) }
                val gateSummary = if (unresolved.isEmpty()) {
                    "Strict gates: all passed"
                } else {
                    "Strict gates pending: ${unresolved.take(2).joinToString(" / ") { it.gate.name }}"
                }
                Text(
                    text = gateSummary,
                    color = if (unresolved.isEmpty()) Color(0xFFAEDFB8) else Color(0xFFE7D48B),
                    fontSize = 10.sp
                )
            }
            nextAction?.takeIf { it.isNotBlank() }?.let { action ->
                Text(
                    text = "Next action: $action",
                    color = Color(0xFFCBE6FF),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            stages.forEachIndexed { index, stage ->
                val isExpanded = expandedStageIndex == index
                val stageExpandedDetail = collaborationStageExpandedDetail(
                    stageIndex = index,
                    tasks = plannedTasks,
                    selectedAgents = selectedAgents,
                    activeSkills = activeSkills,
                    evidence = evidence,
                    routingMode = routingMode,
                    responseStatus = responseStatus,
                    handoffPackets = handoffPackets,
                    validationReport = validationReport
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = if (stage.completed) "●" else "○",
                        color = if (stage.completed) Color(0xFF9FDBFF) else Color(0xFF6F8FAB),
                        fontSize = 11.sp
                    )
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = stage.title,
                            color = Color(0xFFD8EEFF),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = stage.detail,
                            color = Color(0xFFAFD0E9),
                            fontSize = 10.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(
                            text = if (isExpanded) "Hide" else "Details",
                            color = if (isExpanded) Color(0xFFBDE3FF) else Color(0xFF88ABCA),
                            fontSize = 9.sp,
                            modifier = Modifier.clickable {
                                expandedStageIndex = if (isExpanded) null else index
                            }
                        )
                        Text(
                            text = "Export log",
                            color = Color(0xFF88ABCA),
                            fontSize = 9.sp,
                            modifier = Modifier.clickable {
                                val exportText = buildCollaborationStageExportPayload(
                                    stage = stage,
                                    stageExpandedDetail = stageExpandedDetail,
                                    traceId = traceId,
                                    routingMode = routingMode,
                                    responseStatus = responseStatus
                                )
                                clipboardManager.setText(AnnotatedString(exportText))
                                Toast.makeText(context, "Stage log exported to clipboard", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
                if (isExpanded) {
                    Text(
                        text = stageExpandedDetail,
                        color = Color(0xFF95BDD9),
                        fontSize = 9.sp,
                        maxLines = 8,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(start = 18.dp)
                    )
                }
                if (index < stages.lastIndex) {
                    Text("│", color = Color(0xFF4D7093), fontSize = 10.sp)
                }
            }
            if (handoffPackets.isNotEmpty()) {
                Text(
                    "Agent handoff timeline",
                    color = Color(0xFFCBE6FF),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
                handoffPackets.take(10).forEachIndexed { index, packet ->
                    val phase = packet.phase.name.lowercase().replace('_', ' ')
                    Text(
                        text = "${index + 1}. ${packet.fromAgent.toReadableLabel()} -> ${packet.toAgent.toReadableLabel()} [$phase]",
                        color = Color(0xFFB9D9F2),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = packet.summary,
                        color = Color(0xFF92B7D4),
                        fontSize = 9.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }
            validationReport?.let { report ->
                val auditStatus = if (report.passed) "Audit: Passed" else "Audit: Rework required"
                Text(
                    text = "$auditStatus · Validator: ${report.validatorAgent.toReadableLabel()}",
                    color = if (report.passed) Color(0xFFAEDFB8) else Color(0xFFE7D48B),
                    fontSize = 10.sp
                )
                if (report.issues.isNotEmpty()) {
                    Text(
                        text = "Audit issues: ${report.issues.take(2).joinToString(" / ")}",
                        color = Color(0xFFE4C98A),
                        fontSize = 9.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (plannedTasks.isNotEmpty()) {
                Text(
                    "Task-to-agent mapping",
                    color = Color(0xFFCBE6FF),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
                plannedTasks.take(6).forEach { task ->
                    val assigned = selectedAgents.firstOrNull { it.taskId == task.id }?.agentId
                        ?: inferAgentLabelForTask(task)
                    Text(
                        text = "• ${task.title} -> ${humanizeAgentLabel(assigned)}",
                        color = Color(0xFFAED0EA),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (developerMode && selectedAgents.isNotEmpty()) {
                Text(
                    text = "Raw links: ${
                        selectedAgents.take(3).joinToString(" | ") { "${it.taskId}->${it.agentId}" }
                    }",
                    color = Color(0xFF8FB6D6),
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun AgentCollaborationGraph(
    phaseLabel: String?,
    responseStatus: ResponseStatus?,
    gateDecisions: List<GateDecision>,
    hasHandoffTimeline: Boolean,
    hasAuditSignal: Boolean
) {
    val hasBlockingGate = gateDecisions.any { it.decision != GateDecisionStatus.PASSED }
    val progress = phaseProgressIndex(phaseLabel = phaseLabel, status = responseStatus)
    val activeNodeIndex = when {
        responseStatus == ResponseStatus.WAITING_USER -> 1
        progress <= 0 -> 0
        progress == 1 -> 1
        progress == 2 -> 2
        progress == 3 -> 4
        progress == 4 -> 6
        progress >= 5 && hasAuditSignal -> 8
        else -> 9
    }

    fun nodeState(index: Int): AgentGraphState {
        return when {
            index < activeNodeIndex -> AgentGraphState.DONE
            index == activeNodeIndex -> AgentGraphState.ACTIVE
            responseStatus == ResponseStatus.WAITING_USER || hasBlockingGate -> AgentGraphState.BLOCKED
            else -> AgentGraphState.PENDING
        }
    }

    val controlLane = listOf(
        AgentGraphNode("Leader", nodeState(0)),
        AgentGraphNode("Clarify", nodeState(1)),
        AgentGraphNode("Plan", nodeState(2))
    )
    val executionLane = listOf(
        AgentGraphNode("OpenClaw", nodeState(3)),
        AgentGraphNode("Router", nodeState(4)),
        AgentGraphNode("Skills", nodeState(5)),
        AgentGraphNode("Verify", nodeState(6)),
        AgentGraphNode("Quality", nodeState(7)),
        AgentGraphNode("Audit", nodeState(8)),
        AgentGraphNode("Deliver", nodeState(9))
    )

    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            text = "Agent collaboration graph",
            color = Color(0xFFCBE6FF),
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium
        )
        AgentGraphLane(title = "Control lane", nodes = controlLane)
        AgentGraphLane(title = "Execution lane", nodes = executionLane)
        if (hasHandoffTimeline) {
            Text(
                text = "Real handoff packets are available for this run.",
                color = Color(0xFF89B3D2),
                fontSize = 9.sp
            )
        }
    }
}

@Composable
private fun AgentGraphLane(
    title: String,
    nodes: List<AgentGraphNode>
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, color = Color(0xFF8FB6D6), fontSize = 9.sp)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            nodes.forEachIndexed { index, node ->
                AgentGraphNodeChip(
                    node = node,
                    modifier = Modifier.weight(1f)
                )
                if (index < nodes.lastIndex) {
                    val next = nodes[index + 1]
                    Box(
                        modifier = Modifier
                            .width(12.dp)
                            .height(2.dp)
                            .background(
                                color = when {
                                    node.state == AgentGraphState.BLOCKED || next.state == AgentGraphState.BLOCKED -> Color(0xFFCE8B57)
                                    node.state == AgentGraphState.DONE && next.state == AgentGraphState.DONE -> Color(0xFF67C5FF)
                                    node.state == AgentGraphState.ACTIVE || next.state == AgentGraphState.ACTIVE -> Color(0xFF8FDBFF)
                                    else -> Color(0x334A6480)
                                },
                                shape = RoundedCornerShape(999.dp)
                            )
                    )
                }
            }
        }
    }
}

@Composable
private fun AgentGraphNodeChip(
    node: AgentGraphNode,
    modifier: Modifier = Modifier
) {
    val nodeColor = when (node.state) {
        AgentGraphState.DONE -> Color(0xFF67C5FF)
        AgentGraphState.ACTIVE -> Color(0xFF9FDE7C)
        AgentGraphState.BLOCKED -> Color(0xFFCE8B57)
        AgentGraphState.PENDING -> Color(0x335E7A95)
    }
    val textColor = when (node.state) {
        AgentGraphState.PENDING -> Color(0xFF7FA1BB)
        else -> Color(0xFFD7ECFF)
    }
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .background(nodeColor, RoundedCornerShape(999.dp))
        )
        Text(
            text = node.label,
            color = textColor,
            fontSize = 8.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun phaseProgressIndex(
    phaseLabel: String?,
    status: ResponseStatus?
): Int {
    val normalized = phaseLabel?.replace('_', ' ')?.lowercase().orEmpty()
    if (normalized.contains("clarify")) return 1
    if (normalized.contains("plan")) return 2
    if (normalized.contains("execute")) return 3
    if (normalized.contains("verify")) return 4
    if (normalized.contains("deliver")) return 5
    return when (status) {
        ResponseStatus.SUCCESS -> 5
        ResponseStatus.COMMITTED -> 5
        ResponseStatus.PARTIAL -> 4
        ResponseStatus.QUOTING -> 3
        ResponseStatus.AUTH_REQUIRED -> 2
        ResponseStatus.VERIFYING -> 4
        ResponseStatus.WAITING_USER -> 1
        ResponseStatus.RUNNING, ResponseStatus.PROCESSING -> 3
        ResponseStatus.ROLLED_BACK -> 3
        ResponseStatus.DISPUTED -> 2
        ResponseStatus.ERROR, ResponseStatus.CANCELLED -> 2
        null -> 0
    }
}

private fun buildCollaborationStageExportPayload(
    stage: CollaborationStage,
    stageExpandedDetail: String,
    traceId: String?,
    routingMode: RoutingMode?,
    responseStatus: ResponseStatus?
): String {
    val statusLabel = responseStatus?.let(::readableStatus) ?: "Running"
    val routingLabel = if (routingMode == RoutingMode.MULTI_AGENT) "Multi-agent" else "Single-agent + skills"
    val shortTrace = traceId?.take(24).orEmpty().ifBlank { "pending" }
    val timestamp = formatTimestamp(System.currentTimeMillis())
    return """
[Lumi Collaboration Stage Log]
timestamp: $timestamp
trace: $shortTrace
routing: $routingLabel
status: $statusLabel
stage: ${stage.title}
summary: ${stage.detail}
details:
$stageExpandedDetail
    """.trim()
}

private fun collaborationStageExpandedDetail(
    stageIndex: Int,
    tasks: List<TaskGraphTaskPayload>,
    selectedAgents: List<SelectedAgentPayload>,
    activeSkills: List<SkillInvocationPayload>,
    evidence: List<EvidenceItemPayload>,
    routingMode: RoutingMode?,
    responseStatus: ResponseStatus?,
    handoffPackets: List<HandoffPacket>,
    validationReport: ValidationReport?
): String {
    return when (stageIndex) {
        0 -> {
            val mode = if (routingMode == RoutingMode.MULTI_AGENT) "Multi-agent" else "Single-agent + skills"
            val status = responseStatus?.let(::readableStatus) ?: "Running"
            "Mode: $mode\nCurrent status: $status\nPlanned tasks: ${tasks.size}"
        }

        1 -> {
            if (tasks.isEmpty()) {
                "Task graph not generated yet."
            } else {
                tasks.take(5).joinToString("\n") { task ->
                    val cap = task.requiredCapabilities.firstOrNull() ?: "general"
                    "${task.id}: ${task.title} ($cap)"
                }
            }
        }

        2 -> {
            if (selectedAgents.isNotEmpty()) {
                selectedAgents.take(5).joinToString("\n") { mapping ->
                    "${mapping.taskId} -> ${humanizeAgentLabel(mapping.agentId)}"
                }
            } else if (tasks.isNotEmpty()) {
                tasks.take(5).joinToString("\n") { task ->
                    "${task.id} -> ${humanizeAgentLabel(inferAgentLabelForTask(task))}"
                }
            } else {
                "Worker assignment pending."
            }
        }

        3 -> {
            if (activeSkills.isEmpty()) {
                "No active skills yet."
            } else {
                activeSkills.take(6).joinToString("\n") { skill ->
                    "${readableSkillSource(skill)}:${skill.skillId.substringAfter(':')}${trustedSkillInlineSuffix(skill)} · ${readableStatus(skill.status)} · ${skill.latencyMs}ms · evidence:${skill.evidenceCount}"
                }
            }
        }

        4 -> {
            if (evidence.isEmpty()) {
                "No evidence has been returned yet."
            } else {
                evidence.take(5).joinToString("\n") { item ->
                    val title = item.title.ifBlank { item.source }
                    val source = item.url ?: item.source
                    "$title · $source"
                }
            }
        }

        5 -> {
            val auditLines = mutableListOf<String>()
            val report = validationReport
            if (report != null) {
                auditLines += "Validator: ${report.validatorAgent.toReadableLabel()}"
                auditLines += "Passed: ${if (report.passed) "yes" else "no"}"
                if (report.issues.isNotEmpty()) {
                    auditLines += "Issues: ${report.issues.take(3).joinToString(" / ")}"
                }
            }
            val auditHandoffs = handoffPackets
                .filter { packet ->
                    packet.toAgent == AgentRole.OUTCOME_AUDITOR ||
                        packet.fromAgent == AgentRole.OUTCOME_AUDITOR
                }
                .take(4)
            if (auditHandoffs.isNotEmpty()) {
                auditLines += "Handoffs:"
                auditLines += auditHandoffs.joinToString("\n") { packet ->
                    "${packet.fromAgent.toReadableLabel()} -> ${packet.toAgent.toReadableLabel()} :: ${packet.summary}"
                }
            }
            if (auditLines.isEmpty()) {
                "Independent audit has not started yet."
            } else {
                auditLines.joinToString("\n")
            }
        }

        else -> ""
    }
}

@Composable
private fun StructuredPlanCard(
    sections: List<StructuredPlanSection>,
    onUsePlan: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF14335A)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Executable plan", color = Color(0xFFDDF2FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            sections.take(5).forEach { section ->
                Text(
                    text = section.title,
                    color = Color(0xFFBEE3FF),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                section.items.take(4).forEach { item ->
                    Text(
                        text = "• $item",
                        color = Color(0xFFB3D6EE),
                        fontSize = 11.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            TextButton(onClick = onUsePlan) {
                Text("Use this plan", fontSize = 10.sp, color = Color(0xFFCBE8FF))
            }
        }
    }
}

@Composable
private fun ReasoningSummaryCard(reasoning: ReasoningProtocolPayload) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF173557)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Reasoning summary",
                color = Color(0xFFD8EEFF),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Root issue: ${reasoning.rootProblem.ifBlank { "not provided" }}",
                color = Color(0xFFCCE7FF),
                fontSize = 11.sp
            )
            Text(
                "Recommended strategy: ${reasoning.recommendedStrategy.ifBlank { "not provided" }}",
                color = Color(0xFFB6D5F0),
                fontSize = 11.sp
            )
            val modeLabel = if (reasoning.mode.equals("full", ignoreCase = true)) "full" else "lite"
            Text(
                "Protocol: $modeLabel · Confidence ${(reasoning.confidence.coerceIn(0.0, 1.0) * 100).toInt()}%",
                color = Color(0xFF9CC3E6),
                fontSize = 10.sp
            )
            if (reasoning.methodsApplied.isNotEmpty()) {
                Text(
                    "Methods: ${reasoning.methodsApplied.take(6).joinToString(" / ")}",
                    color = Color(0xFF9CC3E6),
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (reasoning.topRisks.isNotEmpty()) {
                Text(
                    "Top Risk:",
                    color = Color(0xFFD9C88C),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
                reasoning.topRisks.take(3).forEach { risk ->
                    Text(
                        "• $risk",
                        color = Color(0xFFE6D7A5),
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun TraceHeaderCard(
    traceId: String?,
    responseStatus: ResponseStatus?,
    latencyMs: Long?,
    taskTrack: TaskTrackPayload?
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF122E4E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("Cloud Execution Trace", color = Color(0xFFE5F6FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "trace: ${traceId?.take(22) ?: "pending"}",
                color = Color(0xFF9CC3E6),
                fontSize = 11.sp
            )
            val statusLabel = responseStatus?.let(::readableStatus) ?: "processing"
            val phaseLabel = taskTrack?.phase?.ifBlank { "planning" } ?: "planning"
            val progress = (((taskTrack?.progress ?: 0f).coerceIn(0f, 1f)) * 100).toInt()
            val latency = latencyMs?.let { "${it}ms" } ?: "--"
            Text(
                "Status: $statusLabel · Stage: $phaseLabel · Progress: ${progress}% · Latency: $latency",
                color = Color(0xFFB8D7ED),
                fontSize = 10.sp
            )
        }
    }
}

@Composable
private fun AnswerOutputCard(
    answerText: String?,
    responseStatus: ResponseStatus?,
    isLoading: Boolean,
    actionLinks: List<OutputLink>,
    onOpenLink: (OutputLink) -> Unit
) {
    val isReady = !answerText.isNullOrBlank()
    val quickActions = actionLinks.prioritizedQuickLinks(maxItems = 4)
    var showAllLinks by remember(actionLinks) { mutableStateOf(false) }
    var expandOutput by remember(answerText) { mutableStateOf(false) }
    val placeholder = when {
        isLoading -> "Task is running, results will appear here."
        else -> when (responseStatus) {
        ResponseStatus.PROCESSING,
        ResponseStatus.RUNNING -> "Task is running, results will appear here."
        ResponseStatus.QUOTING -> "Collecting external quotes and comparing outcomes."
        ResponseStatus.AUTH_REQUIRED -> "Authorization is required before continuing."
        ResponseStatus.VERIFYING -> "Verifying proof and consistency checks."
        ResponseStatus.ERROR -> "Adjusting execution path; executable plan is coming."
        ResponseStatus.CANCELLED -> "This task was canceled."
        ResponseStatus.ROLLED_BACK -> "Execution was rolled back according to policy."
        ResponseStatus.DISPUTED -> "Execution moved to dispute resolution."
        else -> "No results yet. Submit a prompt to see output here."
        }
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isReady) Color(0xFF1B355A) else Color(0xFF132843)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                "Final output",
                color = if (isReady) Color(0xFFD8EEFF) else Color(0xFFA5C2DD),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            if (isReady && actionLinks.isNotEmpty()) {
                if (quickActions.isNotEmpty()) {
                    Text("Quick actions", color = Color(0xFFAED9FF), fontSize = 10.sp, fontWeight = FontWeight.Medium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        quickActions.forEach { link ->
                            Button(
                                onClick = { onOpenLink(link) },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = link.label.take(24),
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
                Text("Open links", color = Color(0xFFAED9FF), fontSize = 10.sp, fontWeight = FontWeight.Medium)
                Text(
                    "Tap a button to open the external page or app.",
                    color = Color(0xFF8EB7D6),
                    fontSize = 9.sp
                )
                val visibleLinks = if (showAllLinks) actionLinks.take(12) else actionLinks.take(6)
                visibleLinks.forEach { link ->
                    Button(
                        onClick = { onOpenLink(link) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "Open ${link.label}",
                            fontSize = 10.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                if (actionLinks.size > 6) {
                    TextButton(onClick = { showAllLinks = !showAllLinks }) {
                        Text(
                            text = if (showAllLinks) "Show fewer links" else "Show more links (${actionLinks.size})",
                            color = Color(0xFF8FC6EA),
                            fontSize = 10.sp
                        )
                    }
                }
            }
            Text(
                text = if (isReady) answerText.orEmpty() else placeholder,
                color = if (isReady) Color(0xFFEAF4FF) else Color(0xFF8FB0CD),
                fontSize = 12.sp,
                maxLines = if (expandOutput || !isReady) Int.MAX_VALUE else 14,
                overflow = TextOverflow.Ellipsis
            )
            if (isReady && answerText.orEmpty().length > 700) {
                TextButton(onClick = { expandOutput = !expandOutput }) {
                    Text(
                        text = if (expandOutput) "Collapse plan details" else "Show full plan details",
                        color = Color(0xFF95CBEA),
                        fontSize = 10.sp
                    )
                }
            }
        }
    }
}

private data class OutputLink(
    val label: String,
    val url: String
)

private fun collectOutputLinks(
    answerText: String?,
    evidence: List<EvidenceItemPayload>,
    actions: List<AgentAction>,
    appDeeplink: String?
): List<OutputLink> {
    val urlRegex = Regex("""https?://[^\s)\]]+""")
    val bulletRegex = Regex("""(?m)^\s*-\s*([^:\n]{2,90})\s*:\s*(https?://\S+)\s*$""")
    val verifiedFromSummary = extractVerifiedOutputLinks(answerText)
    val verifiedUrlSet = verifiedFromSummary.map { it.url }.toSet()

    val fromBullets = bulletRegex.findAll(answerText.orEmpty()).map { match ->
        val label = match.groupValues[1].trim()
        val url = normalizeOutputUrl(match.groupValues[2])
        OutputLink(label = label, url = url)
    }.toList()

    val fromAnswer = urlRegex.findAll(answerText.orEmpty()).mapIndexed { index, found ->
        val url = normalizeOutputUrl(found.value)
        val label = deriveLinkLabel(url, "Link ${index + 1}")
        OutputLink(label = label, url = url)
    }.toList()

    val fromEvidence = evidence.mapNotNull { item ->
        val url = item.url?.let(::normalizeOutputUrl)?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
        val label = item.title
            .takeIf { it.isNotBlank() && !it.equals("Reference link", ignoreCase = true) }
            ?: deriveLinkLabel(url, "Evidence")
        OutputLink(label = label, url = url)
    }

    val fromActions = actions
        .filter { it.type == AgentActionType.OPEN_DEEPLINK }
        .mapNotNull { action ->
            val url = action.deeplink?.let(::normalizeOutputUrl)?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val label = action.label.takeIf { it.isNotBlank() } ?: deriveLinkLabel(url, "Action")
            OutputLink(label = label, url = url)
        }

    val fromApp = listOfNotNull(
        appDeeplink?.let(::normalizeOutputUrl)?.takeIf { it.isNotBlank() }?.let {
            OutputLink("Open external flow", it)
        }
    )

    val merged = if (verifiedFromSummary.isNotEmpty()) {
        // Prefer links from the verified section to avoid exposing unvalidated URLs.
        val evidenceMatched = fromEvidence.filter { verifiedUrlSet.contains(it.url) }
        val actionsMatched = fromActions.filter { verifiedUrlSet.contains(it.url) }
        val answerMatched = fromAnswer.filter { verifiedUrlSet.contains(it.url) }
        verifiedFromSummary + evidenceMatched + actionsMatched + answerMatched + fromApp
    } else {
        fromBullets + fromEvidence + fromActions + fromAnswer + fromApp
    }

    return merged
        .filter { isDisplayableOutputUrl(it.url) }
        .distinctBy { it.url }
        .take(16)
}

private fun extractVerifiedOutputLinks(answerText: String?): List<OutputLink> {
    if (answerText.isNullOrBlank()) return emptyList()
    val lines = answerText.lines()
    val sectionHeaderRegex = Regex("""^\s{0,3}(#{1,3}\s*)?[A-Za-z][A-Za-z /\-]{2,60}:?\s*$""")
    val urlRegex = Regex("""https?://[^\s)\]]+""")
    var inVerifiedSection = false
    val links = mutableListOf<OutputLink>()

    for (rawLine in lines) {
        val line = rawLine.trim()
        if (!inVerifiedSection) {
            if (line.startsWith("Verified Links", ignoreCase = true)) {
                inVerifiedSection = true
            }
            continue
        }
        if (line.isBlank()) {
            if (links.isNotEmpty()) break
            continue
        }
        if (!line.startsWith("-") && sectionHeaderRegex.matches(line)) {
            break
        }
        val firstUrl = urlRegex.find(line) ?: continue
        val url = normalizeOutputUrl(firstUrl.value)
        val labelFromLine = line.substringBefore(firstUrl.value)
            .trim()
            .trimStart('-', '*', '•')
            .trim()
            .removeSuffix(":")
            .trim()
        val label = if (labelFromLine.isNotBlank()) labelFromLine else deriveLinkLabel(url, "Verified link")
        links += OutputLink(label = label, url = url)
    }

    return links
}

private fun List<OutputLink>.prioritizedQuickLinks(maxItems: Int): List<OutputLink> {
    return take(maxItems)
}

private fun normalizeOutputUrl(raw: String): String {
    return raw
        .trim()
        .trimEnd('.', ',', ';', ':')
        .trim('(', ')', '[', ']', '"', '\'')
        .replace("&amp;", "&")
}

private fun deriveLinkLabel(url: String, fallback: String): String {
    val host = runCatching { URI(url).host.orEmpty() }.getOrDefault("")
    if (host.isBlank()) return fallback
    val cleanHost = host.removePrefix("www.").substringBefore(":")
    return cleanHost.substringBefore(".")
        .replace("-", " ")
        .replaceFirstChar { it.uppercase() }
        .takeIf { it.isNotBlank() }
        ?: fallback
}

private fun isDisplayableOutputUrl(url: String): Boolean {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false
    val lower = url.lowercase(Locale.ROOT)
    if (DISALLOWED_OUTPUT_LINK_MARKERS.any { lower.contains(it) }) return false
    val parsed = runCatching { URI(url) }.getOrNull() ?: return false
    val host = parsed.host?.lowercase(Locale.ROOT)?.trim('.') ?: return false
    if (host.isBlank() || !host.contains('.')) return false
    if (host == "localhost" || host.endsWith(".local")) return false
    if (isReservedOutputIpv4Host(host) || isReservedOutputIpv6Host(host)) return false
    return true
}

private fun isReservedOutputIpv4Host(host: String): Boolean {
    val chunks = host.split('.')
    if (chunks.size != 4) return false
    val octets = chunks.map { it.toIntOrNull() ?: return false }
    if (octets.any { it !in 0..255 }) return false
    val first = octets[0]
    val second = octets[1]
    return first == 0 ||
        first == 10 ||
        first == 127 ||
        (first == 169 && second == 254) ||
        (first == 172 && second in 16..31) ||
        (first == 192 && second == 168)
}

private fun isReservedOutputIpv6Host(host: String): Boolean {
    val normalized = host.lowercase(Locale.ROOT)
    if (!normalized.contains(':')) return false
    if (normalized == "::1" || normalized == "0:0:0:0:0:0:0:1") return true
    return normalized.startsWith("fc") ||
        normalized.startsWith("fd") ||
        normalized.startsWith("fe80")
}

private val DISALLOWED_OUTPUT_LINK_MARKERS = listOf(
    "example.com",
    "placeholder",
    "dummy",
    "mock",
    "fake",
    "lorem",
    "unverified-link-removed",
    "127.0.0.1",
    "0.0.0.0"
)

@Composable
private fun TaskStepTrackCard(taskTrack: TaskTrackPayload) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF12273D)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Execution steps", color = Color(0xFFE5F6FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            taskTrack.steps.take(6).forEachIndexed { index, step ->
                val detail = step.detail?.takeIf { it.isNotBlank() }?.take(50)
                val line = buildString {
                    append("${index + 1}. ${step.title} · ${readableStatus(step.status)}")
                    if (!detail.isNullOrBlank()) {
                        append(" · $detail")
                    }
                }
                Text(
                    text = line,
                    color = Color(0xFFB8D7ED),
                    fontSize = 11.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun SkillTrackCard(skills: List<SkillInvocationPayload>) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF132D47)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Skills track", color = Color(0xFFE5F6FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            skills.take(6).forEach { skill ->
                Text(
                    "• ${skill.skillId} · ${readableSkillSource(skill)}${trustedSkillInlineSuffix(skill)} · ${readableStatus(skill.status)} · ${skill.latencyMs}ms",
                    color = Color(0xFFB8D7ED),
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun EvidenceTrackCard(evidence: List<EvidenceItemPayload>) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF102943)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Evidence track", color = Color(0xFFE5F6FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            evidence.take(4).forEachIndexed { index, item ->
                val line = item.title.takeIf { it.isNotBlank() } ?: item.source
                val detail = item.url ?: item.snippet ?: item.source
                Text(
                    "${index + 1}. $line · ${detail.take(52)}",
                    color = Color(0xFFB8D7ED),
                    fontSize = 11.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun TwinUpdateCard(summary: DigitalSoulSummary) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A2748)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Digital twin update", color = Color(0xFFE7E7FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Avatar label: ${summary.profileLabel}",
                color = Color(0xFFC8CEFF),
                fontSize = 11.sp
            )
            val traits = summary.topTraits.take(3)
            if (traits.isEmpty()) {
                Text("No traits to display yet.", color = Color(0xFF9EA9D9), fontSize = 11.sp)
            } else {
                traits.forEach { trait ->
                    val percentage = (normalizeTraitScoreForUi(trait.value) * 100).toInt()
                    Text(
                        "• ${trait.key}: ${percentage}%",
                        color = Color(0xFFBFC9FF),
                        fontSize = 11.sp
                    )
                }
            }
            Text(
                "Last updated: ${formatTimestamp(summary.updatedAtMs)}",
                color = Color(0xFF8E9ACB),
                fontSize = 10.sp
            )
        }
    }
}

@Composable
private fun TwinPersonalizationCard(summary: DigitalSoulSummary) {
    val topTraits = summary.topTraits.take(3)
    val guidance = buildTwinGuidance(topTraits)
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF122A41)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Personalized by your Digital Twin", color = Color(0xFFE7F4FF), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text("Profile: ${summary.profileLabel}", color = Color(0xFFC0DBF3), fontSize = 11.sp)
            if (topTraits.isNotEmpty()) {
                topTraits.forEach { trait ->
                    val score = (normalizeTraitScoreForUi(trait.value) * 100).toInt()
                    Text(
                        "• ${trait.key.replace('_', ' ')}: $score%",
                        color = Color(0xFFAECFE8),
                        fontSize = 11.sp
                    )
                }
            }
            guidance.forEach { line ->
                Text("• $line", color = Color(0xFF8CB8D9), fontSize = 10.sp)
            }
        }
    }
}

private fun buildTwinGuidance(traits: List<com.lumi.coredomain.contract.TraitScore>): List<String> {
    if (traits.isEmpty()) return listOf("Add more interactions to improve personalization quality.")
    val normalized = traits.associate { trait ->
        trait.key.lowercase() to normalizeTraitScoreForUi(trait.value)
    }
    val tips = mutableListOf<String>()
    if ((normalized["risk_avoidance"] ?: 0.0) >= 0.35) {
        tips += "The plan prioritizes refundable options and fallback paths."
    }
    if ((normalized["planning"] ?: 0.0) >= 0.35) {
        tips += "The output uses step-by-step scheduling with clear sequence."
    }
    if (maxOf(normalized["execution"] ?: 0.0, normalized["task_commitment"] ?: 0.0) >= 0.35) {
        tips += "The next actions are optimized for direct execution."
    }
    if ((normalized["privacy_awareness"] ?: 0.0) >= 0.35) {
        tips += "Sensitive data exposure is minimized during recommendations."
    }
    return if (tips.isEmpty()) {
        listOf("The plan is ranked by your current behavior signals and constraints.")
    } else {
        tips.take(2)
    }
}

private fun normalizeTraitScoreForUi(raw: Double): Double {
    return if (raw > 1.0) {
        (raw / 10.0).coerceIn(0.0, 1.0)
    } else {
        raw.coerceIn(0.0, 1.0)
    }
}

private fun readableReasonCode(raw: String): String {
    return when {
        raw.startsWith("cross_domain_count>=") -> "Task spans multiple domains and needs multi-agent collaboration"
        raw.startsWith("required_capabilities>=") -> "Many capabilities required; parallel orchestration recommended"
        raw.startsWith("dependency_depth>=") -> "Task dependency chain is deep; execute in stages"
        raw.startsWith("risk_score>=") -> "Higher risk; prioritize evidence and collaborative review"
        raw == "explicit_multi_agent_request" -> "You explicitly requested parallel collaboration/multiple plans"
        raw == "default_single_agent" -> "Default single-agent + skills routing"
        else -> raw
    }
}

private fun readableStatus(status: ResponseStatus): String {
    return when (status) {
        ResponseStatus.PROCESSING -> "Queued"
        ResponseStatus.RUNNING -> "Running"
        ResponseStatus.WAITING_USER -> "Awaiting Confirmation"
        ResponseStatus.QUOTING -> "Quoting"
        ResponseStatus.AUTH_REQUIRED -> "Authorization Required"
        ResponseStatus.VERIFYING -> "Verifying"
        ResponseStatus.COMMITTED -> "Committed"
        ResponseStatus.SUCCESS -> "Success"
        ResponseStatus.PARTIAL -> "Partially Completed"
        ResponseStatus.ROLLED_BACK -> "Rolled Back"
        ResponseStatus.DISPUTED -> "Disputed"
        ResponseStatus.CANCELLED -> "Canceled"
        ResponseStatus.ERROR -> "Failed"
    }
}

private fun readableSkillSource(skill: SkillInvocationPayload): String {
    return when (skill.source.name) {
        "LOCAL" -> "local"
        "GITHUB" -> "github"
        "TRUSTED_CATALOG" -> "trusted_catalog"
        "LOCAL_TEMPLATE" -> "template"
        else -> skill.source.name.lowercase()
    }
}

private fun trustedSkillInlineSuffix(skill: SkillInvocationPayload): String {
    return if (isTrustedCatalogSkill(skill)) " · $TRUSTED_SKILL_BADGE_LABEL" else ""
}

private fun buildTrustedSkillAttribution(skill: SkillInvocationPayload): TrustedSkillAttribution? {
    if (!isTrustedCatalogSkill(skill)) return null
    return TrustedSkillAttribution(
        skillId = skill.skillId,
        displayName = trustedSkillDisplayName(skill.skillId),
        badgeLabel = TRUSTED_SKILL_BADGE_LABEL,
        verificationUrl = trustedSkillVerificationUrl(skill.skillId)
    )
}

private fun isTrustedCatalogSkill(skill: SkillInvocationPayload): Boolean {
    return skill.source == SkillSource.TRUSTED_CATALOG ||
        skill.skillId.startsWith("trusted:", ignoreCase = true)
}

private fun trustedSkillDisplayName(skillId: String): String {
    val normalized = skillId.removePrefix("trusted:")
    val parts = normalized.split(':', limit = 2)
    val raw = if (parts.size == 2) parts[1] else normalized
    val compact = raw.trim('/').ifBlank { skillId }
    return compact.substringAfterLast('/').ifBlank { compact }
}

private fun trustedSkillVerificationUrl(skillId: String): String {
    val normalized = skillId.removePrefix("trusted:")
    val parts = normalized.split(':', limit = 2)
    if (parts.size == 2) {
        val repo = parts[0].trim('/')
        val path = parts[1].trim('/')
        if (repo.contains('/') && path.isNotBlank()) {
            val normalizedPath = if (path.endsWith("SKILL.md")) path else "$path/SKILL.md"
            return "https://github.com/$repo/tree/main/$normalizedPath"
        }
    }
    return TRUSTED_SKILL_FALLBACK_VERIFY_URL
}

private const val TRUSTED_SKILL_BADGE_LABEL = "Anthropic Trusted Skill"
private const val TRUSTED_SKILL_FALLBACK_VERIFY_URL =
    "https://github.com/anthropics/anthropic-cookbook/tree/main/skills"

private fun resolveWorkerAgents(
    selectedAgents: List<SelectedAgentPayload>,
    tasks: List<TaskGraphTaskPayload>
): List<String> {
    if (selectedAgents.isNotEmpty()) {
        return selectedAgents.mapNotNull { entry ->
            entry.agentId.takeIf { it.isNotBlank() } ?: entry.taskId.takeIf { it.isNotBlank() }
        }.map(::humanizeAgentLabel).distinct()
    }
    return tasks.map(::inferAgentLabelForTask).map(::humanizeAgentLabel).distinct()
}

private fun inferAgentLabelForTask(task: TaskGraphTaskPayload): String {
    val capability = task.requiredCapabilities.firstOrNull().orEmpty().lowercase()
    if (capability.isBlank()) return "general_executor_agent"
    val normalizedCapability = capability
        .replace(Regex("[^a-z0-9]+"), "_")
        .trim('_')
        .take(32)
    return "${normalizedCapability}_specialist_agent".ifBlank { "general_executor_agent" }
}

private fun humanizeAgentLabel(raw: String): String {
    val cleaned = raw.trim().ifBlank { "agent_worker" }
    return cleaned
        .replace(Regex("[:_\\-]+"), " ")
        .replace(Regex("\\s+"), " ")
        .trim()
        .split(' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { token ->
            token.lowercase().replaceFirstChar { char ->
                if (char.isLowerCase()) {
                    char.titlecase(Locale.getDefault())
                } else {
                    char.toString()
                }
            }
        }
}

private fun fmtScore(value: Double): String = String.format("%.2f", value.coerceIn(0.0, 1.0))

private fun formatTimestamp(ms: Long): String {
    return runCatching {
        SimpleDateFormat("MM-dd HH:mm:ss", Locale.getDefault()).format(Date(ms))
    }.getOrDefault("--")
}
