package com.lumi.cloudadapters

import com.lumi.coredomain.contract.AgentDiscoveryPayload
import com.lumi.coredomain.contract.AgentExecutionPayload
import com.lumi.coredomain.contract.AgentRole
import com.lumi.coredomain.contract.AgentTaskConstraints
import com.lumi.coredomain.contract.CloudGateway
import com.lumi.coredomain.contract.CloudResult
import com.lumi.coredomain.contract.EvidenceItemPayload
import com.lumi.coredomain.contract.GateDecision
import com.lumi.coredomain.contract.GateDecisionStatus
import com.lumi.coredomain.contract.GateType
import com.lumi.coredomain.contract.LiveSearchPayload
import com.lumi.coredomain.contract.ReasoningProtocolPayload
import com.lumi.coredomain.contract.RoutingDecisionPayload
import com.lumi.coredomain.contract.RoutingMode
import com.lumi.coredomain.contract.RoutingScoresPayload
import com.lumi.coredomain.contract.SelectedAgentPayload
import com.lumi.coredomain.contract.TaskGraphEdgePayload
import com.lumi.coredomain.contract.TaskGraphPayload
import com.lumi.coredomain.contract.TaskGraphTaskPayload
import com.lumi.coredomain.contract.TavilySearchPayload
import com.lumi.coredomain.contract.TwinContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.URI
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * CloudGateway implementation that routes agent queries through the
 * cloud OpenClaw relay (Vercel serverless function at /api/openclaw/chat),
 * which calls Gemini 3.1 Pro Preview with Digital Twin personalization
 * and Bellman Decision Optimization.
 *
 * Falls back to the existing VercelCloudGateway on failure.
 */
class OpenClawRelayGateway(
    private val relayBaseUrl: String,
    private val fallback: VercelCloudGateway,
    private val strictOpenClaw: Boolean = false
) : CloudGateway by fallback {

    private val json = Json { ignoreUnknownKeys = true }

    private val relayClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .callTimeout(0, TimeUnit.SECONDS)
        .build()

    /** Lightweight trajectory cache per user — last N wellbeing scores. */
    private data class TrajectoryPoint(val ts: Long, val value: Double)
    private val trajectoryCache = mutableListOf<TrajectoryPoint>()
    private val maxTrajectorySize = 50

    /**
     * Feed trajectory data from the orchestrator's wellbeing score.
     * Called externally when the digital twin state updates.
     */
    fun updateTrajectory(ts: Long, wellbeingScore: Double) {
        synchronized(trajectoryCache) {
            trajectoryCache.add(TrajectoryPoint(ts, wellbeingScore))
            while (trajectoryCache.size > maxTrajectorySize) {
                trajectoryCache.removeAt(0)
            }
        }
    }

    /**
     * Execute agent task via the cloud OpenClaw relay (Gemini 3.1 Pro Preview).
     * On failure, falls back to existing Vercel Super Agent pipeline.
     */
    override suspend fun executeAgent(
        task: String,
        constraints: AgentTaskConstraints
    ): CloudResult<AgentExecutionPayload> {
        val openClawResult = executeViaOpenClaw(task, constraints)
        if (openClawResult != null && openClawResult.success) {
            return annotateExecutionPath(openClawResult, "openclaw_relay")
        }
        val openClawFailureReason = openClawResult?.error?.takeIf { it.isNotBlank() }
        if (strictOpenClaw) {
            if (openClawResult != null) {
                return openClawResult
            }
            return CloudResult(
                success = false,
                error = "openclaw_unavailable_strict_mode",
                traceId = UUID.randomUUID().toString(),
                retryable = true,
                errorCode = "openclaw_unavailable"
            )
        }
        val fallbackResult = fallback.executeAgent(task, constraints)
        return annotateExecutionPath(
            result = fallbackResult,
            pathLabel = "fallback_super_agent",
            upstreamIssue = openClawFailureReason
        )
    }

    /**
     * Dispatch query to OpenClaw relay service.
     * Includes Digital Twin state (DynamicHumanStatePayload L1/L2/L3) for
     * personalized Gemini responses, plus trajectory data for Bellman optimization.
     * Returns null if relay is unavailable, allowing fallback to cloud.
     */
    private suspend fun executeViaOpenClaw(
        task: String,
        constraints: AgentTaskConstraints
    ): CloudResult<AgentExecutionPayload>? {
        return withContext(Dispatchers.IO) {
            runCatching {
                val englishTask = buildEnglishOnlyTask(task)
                val payload = buildJsonObject {
                    put("query", englishTask)
                    put("agent", "main")
                    put("response_language", "en-GB")
                    put("thinking", constraints.reasoningMode ?: "medium")
                    val relayTimeoutSec = if (constraints.timeoutMs > 0) {
                        (constraints.timeoutMs / 1_000L).coerceAtLeast(30L)
                    } else {
                        300L
                    }
                    put("timeout", relayTimeoutSec)

                    // ── Digital Twin: DynamicHumanState (L1/L2/L3) ──
                    constraints.contextPacket?.let { state ->
                        put("twin_state", buildJsonObject {
                            put("l1_risk_preference", state.l1.riskPreference)
                            put("l1_value_anchor", state.l1.valueAnchor)
                            put("l2_context_load", state.l2.contextLoad)
                            put("l2_app_category", state.l2.appCategory)
                            put("l2_energy_level", state.l2.energyLevel)
                            put("l3_stress_score", state.l3.stressScore)
                            put("l3_focus_score", state.l3.focusScore)
                            put("l3_polarity", state.l3.polarity)
                            put("updated_at_ms", state.updatedAtMs)
                        })

                        // ── Trajectory for Bellman optimization ──
                        // Also compute current wellbeing and add to cache
                        val wellbeing = computeWellbeingScore(state)
                        updateTrajectory(
                            state.updatedAtMs.takeIf { it > 0 } ?: System.currentTimeMillis(),
                            wellbeing
                        )
                    }

                    // Serialize trajectory cache
                    val points = synchronized(trajectoryCache) { trajectoryCache.toList() }
                    if (points.isNotEmpty()) {
                        put("trajectory", kotlinx.serialization.json.buildJsonArray {
                            for (p in points) {
                                add(buildJsonObject {
                                    put("ts", p.ts)
                                    put("value", p.value)
                                })
                            }
                        })
                    }

                    val taskParts = buildTaskPartsHints(task)
                    if (taskParts.isNotEmpty()) {
                        put("task_parts", buildJsonArray {
                            taskParts.forEach { part -> add(JsonPrimitive(part)) }
                        })
                    }
                }

                val request = Request.Builder()
                    .url("$relayBaseUrl/chat")
                    .addHeader("Content-Type", "application/json")
                    .post(payload.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                relayClient.newCall(request).execute().use { response ->
                    val bodyText = response.body?.string().orEmpty()
                    val parsedRoot = runCatching {
                        json.parseToJsonElement(bodyText) as? JsonObject
                    }.getOrNull()
                    if (!response.isSuccessful) {
                        val relayError = parsedRoot
                            ?.get("error")
                            ?.jsonPrimitive
                            ?.contentOrNull
                            ?.takeIf { it.isNotBlank() }
                            ?: bodyText.take(280).ifBlank { "openclaw_http_${response.code}" }
                        val traceId = parsedRoot
                            ?.get("trace_id")
                            ?.jsonPrimitive
                            ?.contentOrNull
                            ?: UUID.randomUUID().toString()
                        val errorCode = when (response.code) {
                            401 -> "openclaw_auth_invalid"
                            403 -> "openclaw_forbidden"
                            429 -> "openclaw_quota_exceeded"
                            else -> "openclaw_http_error"
                        }
                        return@use CloudResult(
                            success = false,
                            error = "openclaw_http_${response.code}: $relayError",
                            traceId = traceId,
                            retryable = response.code >= 500 || response.code == 429,
                            httpStatus = response.code,
                            errorCode = errorCode
                        )
                    }

                    val root = parsedRoot ?: return@use null

                    val relaySuccess = root["success"]?.jsonPrimitive?.contentOrNull?.toBooleanStrictOrNull()
                    val relayStatus = parseRelayStatus(
                        rawStatus = root["status"]?.jsonPrimitive?.contentOrNull,
                        success = relaySuccess
                    )
                    val reply = root["reply"]?.jsonPrimitive?.contentOrNull.orEmpty()
                    val serverSummary = root["summary"]?.jsonPrimitive?.contentOrNull.orEmpty()
                    val summary = when {
                        reply.isNotBlank() && hasExecutableStructure(reply) -> reply
                        reply.length >= 240 -> reply
                        serverSummary.isNotBlank() -> serverSummary
                        reply.isNotBlank() -> reply
                        else -> root["error"]?.jsonPrimitive?.contentOrNull.orEmpty()
                    }
                    if (summary.isBlank()) return@use null

                    val traceId = root["trace_id"]?.jsonPrimitive?.contentOrNull
                        ?: UUID.randomUUID().toString()
                    val model = root["model"]?.jsonPrimitive?.contentOrNull
                    val nextAction = parseRelayNextAction(root, summary, relayStatus)
                    val ownerAgent = root["owner_agent"]?.jsonPrimitive?.contentOrNull
                        ?.takeIf { it.isNotBlank() }
                        ?: defaultOwnerAgentForStatus(relayStatus)
                    val gateIssueNote = relayGateIssueSummary(root)
                    val relayError = root["error"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
                    val summaryNormalization = ensureExecutableRelaySummary(
                        task = task,
                        summary = summary,
                        status = relayStatus,
                        nextAction = nextAction,
                        gateIssueNote = gateIssueNote
                    )
                    val parsedOwnerAgent = parseOwnerAgent(ownerAgent)
                    val parsedGateDecisions = parseRelayGateDecisions(root, parsedOwnerAgent)
                    val resolvedStatus = normalizeRelayStatus(
                        status = relayStatus,
                        summary = summaryNormalization.summary,
                        gateDecisions = parsedGateDecisions
                    )
                    val resolvedSummary = buildString {
                        append(summaryNormalization.summary.trim())
                        if (nextAction.isNotBlank() && !contains("Next Action:", ignoreCase = true)) {
                            append("\n\nNext Action:\n- ")
                            append(nextAction)
                        }
                        if (gateIssueNote.isNotBlank() && !contains("Gate Status:", ignoreCase = true)) {
                            append("\n\nGate Status:\n- ")
                            append(gateIssueNote)
                        }
                        if (!ownerAgent.equals(defaultOwnerAgentForStatus(relayStatus), ignoreCase = true)) {
                            append("\n\nOwner Agent: ")
                            append(ownerAgent)
                        }
                    }.trim()

                    // Extract Bellman analysis summary if present
                    val bellmanInfo = (root["bellman_analysis"] as? JsonObject)?.let { ba ->
                        val optimal = ba["optimal_action"]?.jsonPrimitive?.contentOrNull ?: ""
                        val beta = ba["discount_beta"]?.jsonPrimitive?.contentOrNull ?: "?"
                        val gamma = ba["effective_gamma"]?.jsonPrimitive?.contentOrNull ?: "?"
                        "Bellman: optimal=$optimal β=$beta γ=$gamma"
                    }
                    val blueprint = buildDomainBlueprint(task)
                    val taskGraph = buildCloudTaskGraph(task)
                    val selectedAgents = buildSelectedAgents(taskGraph)
                    val routingDecision = RoutingDecisionPayload(
                        mode = if (taskGraph.tasks.size > 1) RoutingMode.MULTI_AGENT else RoutingMode.SINGLE_AGENT,
                        reasonCodes = listOf(
                            "openclaw_cloud_decomposition",
                            "domain:${blueprint.domain.name.lowercase()}"
                        ),
                        scores = RoutingScoresPayload(
                            complexity = (0.48 + taskGraph.tasks.size.coerceAtMost(8) * 0.05).coerceIn(0.45, 0.9),
                            risk = blueprint.riskScore,
                            dependency = blueprint.dependencyScore
                        )
                    )
                    val evidenceItems = extractOpenClawEvidenceItems(
                        reply = resolvedSummary,
                        model = model,
                        bellmanInfo = bellmanInfo
                    )
                    val reasoningProtocol = buildOpenClawReasoningProtocol(task, resolvedSummary)
                    val gateEvidenceRows = relayGateEvidenceRows(root)
                    val evidenceRows = buildList {
                        addAll(gateEvidenceRows)
                        addAll(
                            evidenceItems.mapNotNull { item ->
                                when {
                                    !item.url.isNullOrBlank() -> "${item.source}: ${item.url}"
                                    !item.snippet.isNullOrBlank() -> "${item.source}: ${item.snippet}"
                                    else -> null
                                }
                            }
                        )
                    }
                    val cloudSuccess = resolvedStatus != "error"

                    CloudResult(
                        success = cloudSuccess,
                        data = AgentExecutionPayload(
                            taskId = traceId,
                            status = resolvedStatus,
                            resultSummary = resolvedSummary,
                            nextAction = nextAction,
                            ownerAgent = parsedOwnerAgent,
                            gateDecisions = parsedGateDecisions,
                            evidence = evidenceRows.ifEmpty {
                                listOfNotNull(
                                    model?.let { "Model: $it" },
                                    "Source: OpenClaw Relay",
                                    bellmanInfo,
                                    relayError?.let { "Relay error: $it" }
                                )
                            },
                            routingDecision = routingDecision,
                            taskGraph = taskGraph,
                            evidenceItems = evidenceItems,
                            selectedAgents = selectedAgents,
                            reasoningProtocol = reasoningProtocol
                        ),
                        error = if (cloudSuccess) null else (
                            relayError ?: "openclaw_relay_response_error"
                            ),
                        traceId = traceId,
                        httpStatus = 200
                    )
                }
            }.getOrElse { throwable ->
                CloudResult(
                    success = false,
                    error = throwable.message ?: "openclaw_relay_exception",
                    traceId = UUID.randomUUID().toString(),
                    retryable = true,
                    errorCode = "openclaw_relay_exception"
                )
            }
        }
    }

    /**
     * Compute wellbeing score matching AgentOrchestrator.computeTrajectoryScore().
     */
    private fun computeWellbeingScore(state: com.lumi.coredomain.contract.DynamicHumanStatePayload): Double {
        val assetScore = (0.35 + state.l1.riskPreference * 0.3).coerceIn(0.0, 1.0)
        val capabilityScore = (0.4 + state.l2.contextLoad * 0.35 + state.l3.focusScore / 100.0 * 0.25).coerceIn(0.0, 1.0)
        val wellbeingScore = (0.5 + state.l3.polarity * 0.22 - (state.l3.stressScore / 100.0) * 0.28).coerceIn(0.0, 1.0)
        return (assetScore * 0.30 + capabilityScore * 0.35 + wellbeingScore * 0.35).coerceIn(0.0, 1.0)
    }

    private fun parseRelayStatus(rawStatus: String?, success: Boolean?): String {
        return when (rawStatus?.trim()?.lowercase()) {
            "processing", "running" -> "running"
            "waiting_user", "waiting", "needs_user" -> "waiting_user"
            "quoting", "quote", "collecting_quotes" -> "quoting"
            "auth_required", "authorization_required", "payment_required" -> "auth_required"
            "verifying", "verification", "proof_check" -> "verifying"
            "committed", "confirmed", "finalized" -> "committed"
            "success", "done", "completed" -> "success"
            "partial" -> "partial"
            "rolled_back", "rollback", "reverted" -> "rolled_back"
            "disputed", "conflict" -> "disputed"
            "cancelled", "canceled" -> "cancelled"
            "error", "failed", "failure" -> "error"
            else -> {
                when (success) {
                    true -> "success"
                    false -> "error"
                    null -> "partial"
                }
            }
        }
    }

    private fun hasExecutableStructure(text: String): Boolean {
        if (text.isBlank()) return false
        val hasSectionHeader = Regex(
            "(?i)(^|\\n)\\s*(final output|action steps|action links|evidence|risks|fallback|next action|最终输出|执行步骤|下一步)\\s*[:：]?",
            RegexOption.MULTILINE
        ).containsMatchIn(text)
        val stepCount = Regex("(?m)^\\s*(?:\\d+[\\.)]|[-*•])\\s+").findAll(text).count()
        return hasSectionHeader || stepCount >= 3
    }

    private data class SummaryNormalization(
        val summary: String,
        val synthesized: Boolean
    )

    private fun ensureExecutableRelaySummary(
        task: String,
        summary: String,
        status: String,
        nextAction: String,
        gateIssueNote: String
    ): SummaryNormalization {
        val trimmed = summary.trim()
        if (trimmed.isBlank()) return SummaryNormalization(summary = trimmed, synthesized = false)
        if (hasExecutableStructure(trimmed)) {
            return SummaryNormalization(summary = trimmed, synthesized = false)
        }
        if (status != "waiting_user") {
            return SummaryNormalization(summary = trimmed, synthesized = false)
        }

        val taskSnippet = task.trim().replace(Regex("\\s+"), " ").take(140).ifBlank { "the requested objective" }
        val clarificationQuestion = trimmed
            .lineSequence()
            .map { it.trim() }
            .firstOrNull { line ->
                line.endsWith("?") || line.startsWith("**Clarification Question", ignoreCase = true)
            }
            ?.replace("**", "")
            ?.removePrefix("Clarification Question:")
            ?.trim()
            ?.takeIf { it.isNotBlank() }
        val resolvedNextAction = nextAction.ifBlank {
            clarificationQuestion ?: "Confirm the missing constraints and continue with step 1."
        }
        val gateNote = gateIssueNote.takeIf { it.isNotBlank() } ?: "gate_r1_require_constraints: provisional_plan_with_assumptions"

        val synthesized = buildString {
            appendLine("Final Output:")
            appendLine("Provisional executable plan prepared from your request while one clarification remains.")
            appendLine()
            appendLine("Action Steps:")
            appendLine("1. Lock assumptions from scope: \"$taskSnippet\".")
            appendLine("2. Decompose into 3-5 workstreams with owner, deliverable, and acceptance criteria per stream.")
            appendLine("3. Attach evidence checks and quality gates before any irreversible action.")
            appendLine("4. Execute the first reversible step, then review outcomes and update the next checkpoint.")
            appendLine()
            appendLine("Action Links:")
            appendLine("- Workboard path: Work -> Plan Board (owners + milestones).")
            appendLine("- Evidence path: Work -> Evidence Panel (source + timestamp).")
            appendLine("- Risk path: Work -> Risk/Fallback Panel (trigger + rollback step).")
            appendLine()
            appendLine("Evidence:")
            appendLine("- User request captured in current session.")
            appendLine("- Relay gate signal: $gateNote.")
            appendLine()
            appendLine("Risks:")
            appendLine("- Missing constraints can reduce precision and increase rework.")
            appendLine("- External dependencies should be verified before commitment.")
            appendLine()
            appendLine("Fallback:")
            appendLine("- Continue with explicit assumptions and keep actions reversible.")
            appendLine("- Pause irreversible steps if new constraints conflict with current assumptions.")
            appendLine()
            appendLine("Next Action:")
            append("- $resolvedNextAction")
        }.trim()

        return SummaryNormalization(summary = synthesized, synthesized = true)
    }

    private fun normalizeRelayStatus(
        status: String,
        summary: String,
        gateDecisions: List<GateDecision>
    ): String {
        if (status != "waiting_user") return status
        if (!hasExecutableStructure(summary)) return status
        val hasHardGateBlock = gateDecisions.any { decision ->
            if (decision.decision != GateDecisionStatus.BLOCKED &&
                decision.decision != GateDecisionStatus.WAITING_USER
            ) {
                return@any false
            }
            when (decision.gate) {
                GateType.GATE_R2_REQUIRE_USER_CONFIRMATION_TOKEN,
                GateType.GATE_R3_BUDGET_SCOPE_GUARD,
                GateType.GATE_R5_SUPPLIER_VALIDATION_REQUIRED,
                GateType.GATE_R7_HIGH_RISK_EXECUTION_PROHIBITED,
                GateType.GATE_R8_DATA_AUTHENTICITY_REQUIRED -> true
                else -> false
            }
        }
        return if (hasHardGateBlock) status else "partial"
    }

    private fun defaultOwnerAgentForStatus(status: String): String {
        return when (status) {
            "waiting_user" -> "requirement_clarifier"
            "error" -> "solution_validation_agent"
            "partial" -> "openclaw_orchestrator"
            else -> "codex_team_leader"
        }
    }

    private fun parseRelayNextAction(root: JsonObject, summary: String, status: String): String {
        val explicit = root["next_action"]?.jsonPrimitive?.contentOrNull
            ?.trim()
            ?.takeIf { it.isNotBlank() }
        if (explicit != null) return explicit
        val gateDecisionArray = root["gate_decisions"] as? JsonArray
        val gateAction = gateDecisionArray
            ?.mapNotNull { element ->
                val row = element as? JsonObject ?: return@mapNotNull null
                val decision = row["decision"]?.jsonPrimitive?.contentOrNull?.lowercase()
                if (decision == "blocked" || decision == "waiting_user") {
                    row["next_action"]?.jsonPrimitive?.contentOrNull?.trim()?.takeIf { it.isNotBlank() }
                } else {
                    null
                }
            }
            ?.firstOrNull()
        if (gateAction != null) return gateAction

        val fromSummary = summary
            .lineSequence()
            .map { it.trim() }
            .firstOrNull { line ->
                line.startsWith("Next Action:", ignoreCase = true) ||
                    line.endsWith("?")
            }
            ?.removePrefix("Next Action:")
            ?.trim()
            ?.takeIf { it.isNotBlank() }
        if (fromSummary != null) return fromSummary

        return when (status) {
            "waiting_user" -> "Provide the missing constraints and continue execution."
            "error" -> "Retry execution or switch to validated fallback flow."
            else -> "Review the plan and execute the first reversible step."
        }
    }

    private fun relayGateIssueSummary(root: JsonObject): String {
        val gateDecisionArray = root["gate_decisions"] as? JsonArray ?: return ""
        val unresolved = gateDecisionArray.mapNotNull { element ->
            val row = element as? JsonObject ?: return@mapNotNull null
            val decision = row["decision"]?.jsonPrimitive?.contentOrNull?.lowercase() ?: return@mapNotNull null
            if (decision != "blocked" && decision != "waiting_user") return@mapNotNull null
            val gate = row["gate"]?.jsonPrimitive?.contentOrNull ?: "gate"
            val reason = row["reason"]?.jsonPrimitive?.contentOrNull ?: "pending"
            "$gate: $reason"
        }
        return unresolved.firstOrNull().orEmpty()
    }

    private fun relayGateEvidenceRows(root: JsonObject): List<String> {
        val gateDecisionArray = root["gate_decisions"] as? JsonArray ?: return emptyList()
        return gateDecisionArray.mapNotNull { element ->
            val row = element as? JsonObject ?: return@mapNotNull null
            val gate = row["gate"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            val decision = row["decision"]?.jsonPrimitive?.contentOrNull ?: "unknown"
            val reason = row["reason"]?.jsonPrimitive?.contentOrNull ?: "n/a"
            "Gate $gate: $decision ($reason)"
        }.take(4)
    }

    private fun parseOwnerAgent(raw: String): AgentRole {
        return when (raw.trim().lowercase()) {
            "edge_digital_twin_builder" -> AgentRole.EDGE_DIGITAL_TWIN_BUILDER
            "codex_team_leader" -> AgentRole.CODEX_TEAM_LEADER
            "requirement_clarifier" -> AgentRole.REQUIREMENT_CLARIFIER
            "task_planner" -> AgentRole.TASK_PLANNER
            "openclaw_orchestrator", "openclaw_orchestrator_agent" -> AgentRole.OPENCLAW_ORCHESTRATOR
            "sub_agent_router", "router" -> AgentRole.SUB_AGENT_ROUTER
            "skill_execution_agent", "skill_executor" -> AgentRole.SKILL_EXECUTION_AGENT
            "solution_validation_agent", "validator" -> AgentRole.SOLUTION_VALIDATION_AGENT
            "compliance_guard" -> AgentRole.COMPLIANCE_GUARD
            "budget_gatekeeper" -> AgentRole.BUDGET_GATEKEEPER
            "lix_demand_publisher" -> AgentRole.LIX_DEMAND_PUBLISHER
            "supplier_scout_lumio", "supplier_scout" -> AgentRole.SUPPLIER_SCOUT
            "supplier_negotiator_lumio", "supplier_negotiator" -> AgentRole.SUPPLIER_NEGOTIATOR
            "delivery_quality_guard" -> AgentRole.DELIVERY_QUALITY_GUARD
            else -> AgentRole.CODEX_TEAM_LEADER
        }
    }

    private fun parseRelayGateDecisions(
        root: JsonObject,
        ownerAgent: AgentRole
    ): List<GateDecision> {
        val gateDecisionArray = root["gate_decisions"] as? JsonArray ?: return emptyList()
        return gateDecisionArray.mapNotNull { element ->
            val row = element as? JsonObject ?: return@mapNotNull null
            val gate = parseGateType(row["gate"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null)
                ?: return@mapNotNull null
            val decision = parseGateDecisionStatus(
                row["decision"]?.jsonPrimitive?.contentOrNull ?: "passed"
            )
            val reason = row["reason"]?.jsonPrimitive?.contentOrNull ?: "n/a"
            val nextAction = row["next_action"]?.jsonPrimitive?.contentOrNull
            GateDecision(
                gate = gate,
                decision = decision,
                reason = reason,
                nextAction = nextAction,
                ownerAgent = ownerAgent
            )
        }
    }

    private fun parseGateType(raw: String): GateType? {
        return when (raw.trim().lowercase()) {
            "gate_r1_require_constraints" -> GateType.GATE_R1_REQUIRE_CONSTRAINTS
            "gate_r2_require_user_confirmation_token" -> GateType.GATE_R2_REQUIRE_USER_CONFIRMATION_TOKEN
            "gate_r3_budget_scope_guard" -> GateType.GATE_R3_BUDGET_SCOPE_GUARD
            "gate_r4_evidence_required_for_success" -> GateType.GATE_R4_EVIDENCE_REQUIRED_FOR_SUCCESS
            "gate_r5_supplier_validation_required" -> GateType.GATE_R5_SUPPLIER_VALIDATION_REQUIRED
            "gate_r6_no_empty_return" -> GateType.GATE_R6_NO_EMPTY_RETURN
            "gate_r7_high_risk_execution_prohibited" -> GateType.GATE_R7_HIGH_RISK_EXECUTION_PROHIBITED
            "gate_r8_data_authenticity_required" -> GateType.GATE_R8_DATA_AUTHENTICITY_REQUIRED
            else -> null
        }
    }

    private fun parseGateDecisionStatus(raw: String): GateDecisionStatus {
        return when (raw.trim().lowercase()) {
            "blocked" -> GateDecisionStatus.BLOCKED
            "waiting_user", "waiting" -> GateDecisionStatus.WAITING_USER
            else -> GateDecisionStatus.PASSED
        }
    }

    private fun buildTaskPartsHints(task: String): List<String> {
        val normalized = task
            .replace('\r', '\n')
            .replace("；", "\n")
            .replace(";", "\n")
            .replace("。", "\n")
            .replace("！", "\n")
            .replace("？", "\n")
            .replace(Regex("(?i)\\bthen\\b"), "\n")
            .replace(Regex("(?i)\\band\\b"), "\n")
            .replace("然后", "\n")
            .replace("并且", "\n")
            .replace("以及", "\n")
            .replace("接着", "\n")
        val parts = normalized
            .split('\n')
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .take(8)
        if (parts.isNotEmpty()) return parts
        return listOf(task.trim()).filter { it.isNotBlank() }.take(1)
    }

    private enum class GeneralDomain {
        TRAVEL,
        PRODUCTIVITY,
        COMMERCE,
        ENGINEERING,
        FINANCE,
        LEGAL,
        HEALTH,
        EDUCATION,
        GENERAL
    }

    private data class DomainBlueprint(
        val domain: GeneralDomain,
        val summary: String,
        val specializedTasks: List<Pair<String, List<String>>>,
        val riskScore: Double,
        val dependencyScore: Double,
    )

    private fun inferGeneralDomain(task: String): GeneralDomain {
        val lower = task.lowercase()
        return when {
            listOf("travel", "trip", "flight", "hotel", "itinerary", "restaurant", "vacation", "旅行", "机票", "酒店", "行程", "餐厅", "景点", "出行").any(lower::contains) ->
                GeneralDomain.TRAVEL
            listOf("calendar", "meeting", "todo", "schedule", "workflow", "email", "productivity", "任务", "日程", "会议", "邮件", "待办").any(lower::contains) ->
                GeneralDomain.PRODUCTIVITY
            listOf("buy", "price", "shopping", "order", "compare", "discount", "商品", "购买", "比价", "优惠", "电商").any(lower::contains) ->
                GeneralDomain.COMMERCE
            listOf("code", "debug", "deploy", "api", "backend", "frontend", "test", "bug", "编程", "调试", "部署", "接口", "测试").any(lower::contains) ->
                GeneralDomain.ENGINEERING
            listOf("invest", "stock", "portfolio", "bank", "loan", "budget", "finance", "投资", "股票", "组合", "贷款", "预算", "金融").any(lower::contains) ->
                GeneralDomain.FINANCE
            listOf("contract", "compliance", "law", "legal", "clause", "诉讼", "法律", "合同", "合规", "条款").any(lower::contains) ->
                GeneralDomain.LEGAL
            listOf("symptom", "clinic", "treatment", "medical", "health", "诊断", "症状", "治疗", "医疗", "健康").any(lower::contains) ->
                GeneralDomain.HEALTH
            listOf("course", "exam", "study", "learning", "education", "学习", "课程", "考试", "备考", "教育").any(lower::contains) ->
                GeneralDomain.EDUCATION
            else -> GeneralDomain.GENERAL
        }
    }

    private fun buildDomainBlueprint(task: String): DomainBlueprint {
        val domain = inferGeneralDomain(task)
        return when (domain) {
            GeneralDomain.TRAVEL -> DomainBlueprint(
                domain = domain,
                summary = "Travel planning with transport, stay, activities and local execution links.",
                specializedTasks = listOf(
                    "Transport options and schedule" to listOf("ticket_search", "schedule_lookup"),
                    "Accommodation options" to listOf("hotel_search", "budget_filter"),
                    "On-site activities and dining" to listOf("local_search", "preference_match")
                ),
                riskScore = 0.42,
                dependencyScore = 0.84
            )
            GeneralDomain.PRODUCTIVITY -> DomainBlueprint(
                domain = domain,
                summary = "Personal or team productivity optimization with executable workflow.",
                specializedTasks = listOf(
                    "Current workflow diagnosis" to listOf("workflow_analysis"),
                    "Automation opportunities" to listOf("automation_design", "tool_selection"),
                    "Execution calendar and checkpoints" to listOf("schedule_planning")
                ),
                riskScore = 0.28,
                dependencyScore = 0.62
            )
            GeneralDomain.COMMERCE -> DomainBlueprint(
                domain = domain,
                summary = "Purchase decision support with price, trust, and fulfillment checks.",
                specializedTasks = listOf(
                    "Offer and price comparison" to listOf("price_compare"),
                    "Seller and policy verification" to listOf("seller_validation", "policy_check"),
                    "Purchase path and fallback choice" to listOf("checkout_plan")
                ),
                riskScore = 0.35,
                dependencyScore = 0.58
            )
            GeneralDomain.ENGINEERING -> DomainBlueprint(
                domain = domain,
                summary = "Engineering delivery with implementation, test, and rollback guidance.",
                specializedTasks = listOf(
                    "Root-cause and design decision" to listOf("root_cause_analysis", "solution_design"),
                    "Implementation and validation" to listOf("code_change", "test_execution"),
                    "Release and rollback strategy" to listOf("release_plan", "rollback_plan")
                ),
                riskScore = 0.40,
                dependencyScore = 0.72
            )
            GeneralDomain.FINANCE -> DomainBlueprint(
                domain = domain,
                summary = "Finance decision support with bounded risk and non-execution policy.",
                specializedTasks = listOf(
                    "Risk and objective framing" to listOf("risk_modeling"),
                    "Option analysis and scenario comparison" to listOf("scenario_analysis"),
                    "Decision-support recommendation" to listOf("decision_support_only")
                ),
                riskScore = 0.74,
                dependencyScore = 0.66
            )
            GeneralDomain.LEGAL -> DomainBlueprint(
                domain = domain,
                summary = "Legal decision support with clause/risk interpretation and escalation hints.",
                specializedTasks = listOf(
                    "Issue spotting and context extraction" to listOf("legal_issue_spotting"),
                    "Clause/rule interpretation" to listOf("clause_analysis"),
                    "Decision-support recommendation" to listOf("decision_support_only")
                ),
                riskScore = 0.78,
                dependencyScore = 0.68
            )
            GeneralDomain.HEALTH -> DomainBlueprint(
                domain = domain,
                summary = "Health decision support with safety-first triage and escalation advice.",
                specializedTasks = listOf(
                    "Symptom/context intake" to listOf("health_intake"),
                    "Risk triage and urgency check" to listOf("triage_assessment"),
                    "Decision-support recommendation" to listOf("decision_support_only")
                ),
                riskScore = 0.82,
                dependencyScore = 0.70
            )
            GeneralDomain.EDUCATION -> DomainBlueprint(
                domain = domain,
                summary = "Learning planning with milestones, materials and measurable checkpoints.",
                specializedTasks = listOf(
                    "Goal and baseline assessment" to listOf("learning_assessment"),
                    "Curriculum and resource mapping" to listOf("curriculum_planning"),
                    "Progress checkpoints" to listOf("checkpoint_design")
                ),
                riskScore = 0.25,
                dependencyScore = 0.55
            )
            GeneralDomain.GENERAL -> DomainBlueprint(
                domain = domain,
                summary = "General-purpose problem solving with decomposition and validated delivery.",
                specializedTasks = listOf(
                    "Problem decomposition" to listOf("task_decomposition"),
                    "Evidence gathering" to listOf("live_search"),
                    "Solution synthesis" to listOf("executability_check")
                ),
                riskScore = 0.30,
                dependencyScore = 0.50
            )
        }
    }

    private fun isHighRiskDomain(domain: GeneralDomain): Boolean {
        return domain == GeneralDomain.HEALTH || domain == GeneralDomain.LEGAL || domain == GeneralDomain.FINANCE
    }

    private fun buildCloudTaskGraph(task: String): TaskGraphPayload {
        val blueprint = buildDomainBlueprint(task)
        val tasks = mutableListOf(
            TaskGraphTaskPayload(
                id = "task_1",
                title = "Frame goal, constraints, and success criteria",
                requiredCapabilities = listOf("constraint_extraction", "problem_framing")
            ),
            TaskGraphTaskPayload(
                id = "task_2",
                title = "Build executable DAG and route specialists",
                requiredCapabilities = listOf("dag_planning", "capability_matching")
            )
        )

        val specializedTaskIds = mutableListOf<String>()
        blueprint.specializedTasks.forEachIndexed { index, item ->
            val taskId = "task_${index + 3}"
            specializedTaskIds += taskId
            tasks += TaskGraphTaskPayload(
                id = taskId,
                title = item.first,
                requiredCapabilities = item.second
            )
        }

        val validationTaskId = "task_${tasks.size + 1}"
        tasks += TaskGraphTaskPayload(
            id = validationTaskId,
            title = "Validate evidence, risks, and feasibility",
            requiredCapabilities = listOf("evidence_validation", "compliance_check")
        )

        val deliveryTaskId = "task_${tasks.size + 1}"
        tasks += TaskGraphTaskPayload(
            id = deliveryTaskId,
            title = "Prepare final delivery and next action",
            requiredCapabilities = listOf("delivery_packaging")
        )

        val edges = mutableListOf(
            TaskGraphEdgePayload("task_1", "task_2")
        )
        specializedTaskIds.forEach { taskId ->
            edges += TaskGraphEdgePayload("task_2", taskId)
            edges += TaskGraphEdgePayload(taskId, validationTaskId)
        }
        if (specializedTaskIds.isEmpty()) {
            edges += TaskGraphEdgePayload("task_2", validationTaskId)
        }
        edges += TaskGraphEdgePayload(validationTaskId, deliveryTaskId)

        val criticalPath = buildList {
            add("task_1")
            add("task_2")
            specializedTaskIds.firstOrNull()?.let { add(it) }
            add(validationTaskId)
            add(deliveryTaskId)
        }
        val parallelGroups = specializedTaskIds.takeIf { it.size > 1 }?.let { listOf(it) } ?: emptyList()

        return TaskGraphPayload(
            tasks = tasks,
            edges = edges,
            criticalPath = criticalPath,
            parallelGroups = parallelGroups
        )
    }

    private fun buildSelectedAgents(taskGraph: TaskGraphPayload): List<SelectedAgentPayload> {
        return taskGraph.tasks.map { task ->
            val capability = task.requiredCapabilities.joinToString(" ").lowercase()
            SelectedAgentPayload(
                taskId = task.id,
                agentId = when {
                    capability.contains("constraint") || capability.contains("problem_framing") -> "requirement_clarifier_agent"
                    capability.contains("dag_planning") -> "task_planner_agent"
                    capability.contains("capability_matching") || capability.contains("route") -> "sub_agent_router"
                    capability.contains("validation") || capability.contains("evidence") -> "solution_validation_agent"
                    capability.contains("compliance") || capability.contains("policy") -> "compliance_guard"
                    capability.contains("budget") || capability.contains("cost") -> "budget_gatekeeper"
                    capability.contains("market") || capability.contains("publish") -> "lix_demand_publisher"
                    capability.contains("supplier") && capability.contains("negotiation") -> "supplier_negotiator"
                    capability.contains("supplier") || capability.contains("scout") -> "supplier_scout"
                    capability.contains("delivery_packaging") || capability.contains("delivery") -> "delivery_quality_guard"
                    else -> "skill_execution_agent"
                }
            )
        }
    }

    private fun buildOpenClawReasoningProtocol(task: String, reply: String): ReasoningProtocolPayload {
        val blueprint = buildDomainBlueprint(task)
        val root = "Transform the user goal into executable subtasks with verifiable evidence and clear next action."
        val strategy = buildString {
            append("Reason first, clarify missing constraints with one high-impact question, ")
            append("execute a domain-balanced DAG, validate evidence, then deliver actionable output.")
            if (isHighRiskDomain(blueprint.domain)) {
                append(" Apply decision-support-only policy for irreversible high-risk actions.")
            }
        }
        val topRisk = when {
            isHighRiskDomain(blueprint.domain) ->
                "High-risk domain requires decision-support-only boundaries and explicit escalation."
            reply.contains("budget", ignoreCase = true) -> "Budget mismatch risk across options."
            reply.contains("deadline", ignoreCase = true) -> "Schedule slippage risk due missing constraints."
            else -> "Insufficient evidence depth for one or more claims."
        }
        return ReasoningProtocolPayload(
            version = "v1.1",
            mode = "full",
            methodsApplied = listOf("react", "task_decomposition", "evidence_first"),
            rootProblem = root,
            recommendedStrategy = strategy,
            confidence = (0.86 - blueprint.riskScore * 0.18).coerceIn(0.55, 0.9),
            keyConstraints = listOf("budget", "deadline", "acceptance criteria"),
            topRisks = listOf(topRisk)
        )
    }

    private fun extractOpenClawEvidenceItems(
        reply: String,
        model: String?,
        bellmanInfo: String?
    ): List<EvidenceItemPayload> {
        val evidence = mutableListOf<EvidenceItemPayload>()
        model?.takeIf { it.isNotBlank() }?.let {
            evidence += EvidenceItemPayload(
                source = "openclaw_relay",
                title = "Model",
                snippet = it
            )
        }
        bellmanInfo?.takeIf { it.isNotBlank() }?.let {
            evidence += EvidenceItemPayload(
                source = "openclaw_relay",
                title = "Bellman analysis",
                snippet = it
            )
        }

        val urlRegex = Regex("""https?://[^\s)\]]+""")
        val seen = mutableSetOf<String>()
        reply.lines().forEach { line ->
            val urls = urlRegex.findAll(line).map { it.value.trim() }.toList()
            urls.forEach urlLoop@{ rawUrl ->
                val normalizedUrl = normalizeExtractedEvidenceUrl(rawUrl) ?: return@urlLoop
                if (!isLikelyExternalEvidenceUrl(normalizedUrl)) return@urlLoop
                if (seen.add(normalizedUrl)) {
                    val host = runCatching { URI(normalizedUrl).host ?: "source" }.getOrDefault("source")
                    evidence += EvidenceItemPayload(
                        source = host,
                        title = deriveEvidenceLinkTitle(line = line, url = normalizedUrl, host = host),
                        url = normalizedUrl,
                        snippet = line.trim().take(180)
                    )
                }
            }
        }
        return evidence.take(10)
    }

    private fun normalizeExtractedEvidenceUrl(raw: String): String? {
        val cleaned = raw
            .trim()
            .trimEnd('.', ',', ';', ':')
            .trim('(', ')', '[', ']', '"', '\'')
            .replace("&amp;", "&")
        return cleaned.takeIf {
            it.startsWith("http://", ignoreCase = true) || it.startsWith("https://", ignoreCase = true)
        }
    }

    private fun deriveEvidenceLinkTitle(
        line: String,
        url: String,
        host: String
    ): String {
        val markdownRegex = Regex("""\[(.{2,90})\]\((https?://[^\s)]+)\)""")
        val markdownLabel = markdownRegex.findAll(line).firstOrNull { match ->
            normalizeExtractedEvidenceUrl(match.groupValues[2]) == url
        }?.groupValues?.get(1)?.trim().orEmpty()

        val bulletLabel = Regex("""^\s*[-*•]\s*([^:\n]{2,90})\s*:\s*https?://\S+""")
            .find(line)
            ?.groupValues
            ?.getOrNull(1)
            ?.trim()
            .orEmpty()

        val prefixLabel = line.substringBefore(url)
            .trim()
            .trimStart('-', '*', '•')
            .trim()
            .removeSuffix(":")
            .trim()
            .takeIf { candidate ->
                candidate.isNotBlank() &&
                    !candidate.equals("Verified Links", ignoreCase = true) &&
                    !candidate.equals("Action Links", ignoreCase = true)
            }
            .orEmpty()

        return sequenceOf(markdownLabel, bulletLabel, prefixLabel, prettyEvidenceHost(host))
            .firstOrNull { it.isNotBlank() }
            ?.take(88)
            ?: "External source"
    }

    private fun prettyEvidenceHost(host: String): String {
        val clean = host.removePrefix("www.").lowercase().trim('.')
        if (clean.isBlank()) return "External source"
        return clean.substringBefore(".")
            .replace("-", " ")
            .replaceFirstChar { it.uppercase() }
    }

    private fun isLikelyExternalEvidenceUrl(url: String): Boolean {
        val lower = url.lowercase()
        if (DISALLOWED_EVIDENCE_URL_MARKERS.any { lower.contains(it) }) return false
        val uri = runCatching { URI(url) }.getOrNull() ?: return false
        val host = uri.host?.lowercase()?.trim('.') ?: return false
        if (host.isBlank() || !host.contains('.')) return false
        if (host == "localhost" || host.endsWith(".local")) return false
        if (isPrivateIpv4Host(host) || isPrivateIpv6Host(host)) return false
        return true
    }

    private fun isPrivateIpv4Host(host: String): Boolean {
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

    private fun isPrivateIpv6Host(host: String): Boolean {
        val normalized = host.lowercase()
        if (!normalized.contains(':')) return false
        if (normalized == "::1" || normalized == "0:0:0:0:0:0:0:1") return true
        return normalized.startsWith("fc") ||
            normalized.startsWith("fd") ||
            normalized.startsWith("fe80")
    }

    private val DISALLOWED_EVIDENCE_URL_MARKERS = listOf(
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

    private fun buildEnglishOnlyTask(task: String): String {
        val trimmedTask = task.trim()
        if (trimmedTask.isBlank()) return task
        val blueprint = buildDomainBlueprint(trimmedTask)
        val highRiskNote = if (isHighRiskDomain(blueprint.domain)) {
            "High-risk boundary: provide decision support only; do not recommend irreversible execution steps. "
        } else {
            ""
        }
        return buildString {
            append("Respond in English only. ")
            append("Keep headings, bullets, and links in English. ")
            append("Do not output Chinese. ")
            append("Cloud leader workflow: reason first, then decompose into explicit subtasks, assign each subtask to specialist roles and skills, then synthesize one final answer. ")
            append("Treat edge digital twin inputs as personalization signals only (preferences + current state), not as inferred user requirements. ")
            append("Use this section order: Final Output, Action Steps, Action Links, Evidence, Risks, Fallback, Next Action. ")
            append("If information is missing, ask exactly one concise clarification question and still provide a provisional plan. ")
            append("Never return an empty answer. ")
            append("Use absolute dates when user mentions relative time words. ")
            append(highRiskNote)
            append("Domain hint: ${blueprint.domain.name.lowercase()} (${blueprint.summary}). ")
            append("\n\nTask:\n")
            append(trimmedTask)
        }
    }

    /**
     * Check if OpenClaw relay is available.
     */
    suspend fun isRelayAvailable(): Boolean {
        return withContext(Dispatchers.IO) {
            runCatching {
                val request = Request.Builder()
                    .url("$relayBaseUrl/health")
                    .build()
                val localClient = relayClient.newBuilder()
                    .connectTimeout(2, TimeUnit.SECONDS)
                    .readTimeout(3, TimeUnit.SECONDS)
                    .callTimeout(4, TimeUnit.SECONDS)
                    .build()
                localClient.newCall(request).execute().use { it.isSuccessful }
            }.getOrDefault(false)
        }
    }

    private fun annotateExecutionPath(
        result: CloudResult<AgentExecutionPayload>,
        pathLabel: String,
        upstreamIssue: String? = null
    ): CloudResult<AgentExecutionPayload> {
        if (!result.success) return result
        val payload = result.data ?: return result
        val marker = "execution_path: $pathLabel"
        val issueMarker = upstreamIssue
            ?.takeIf { it.isNotBlank() }
            ?.let { "openclaw_issue: ${it.take(220)}" }
        val summarySuffix = "\n\nExecution path: $pathLabel"
        val issueSuffix = issueMarker?.let { "\nOpenClaw note: ${it.removePrefix("openclaw_issue: ")}" }.orEmpty()
        val mergedSummary = if (payload.resultSummary.contains("Execution path:", ignoreCase = true)) {
            payload.resultSummary
        } else {
            payload.resultSummary + summarySuffix + issueSuffix
        }
        val mergedEvidence = buildList<String> {
            addAll(payload.evidence)
            if (none { it.equals(marker, ignoreCase = true) }) {
                add(marker)
            }
            if (!issueMarker.isNullOrBlank() && none { it.equals(issueMarker, ignoreCase = true) }) {
                add(issueMarker)
            }
        }
        return result.copy(
            data = payload.copy(
                resultSummary = mergedSummary,
                evidence = mergedEvidence
            )
        )
    }
}
