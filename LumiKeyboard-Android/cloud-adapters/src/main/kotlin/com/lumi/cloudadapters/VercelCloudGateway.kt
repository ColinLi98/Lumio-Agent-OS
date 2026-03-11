package com.lumi.cloudadapters

import com.lumi.coredomain.contract.AgentDiscoveryItem
import com.lumi.coredomain.contract.AgentDiscoveryPayload
import com.lumi.coredomain.contract.AgentExecutionPayload
import com.lumi.coredomain.contract.AgentTaskConstraints
import com.lumi.coredomain.contract.CloudGateway
import com.lumi.coredomain.contract.CloudResult
import com.lumi.coredomain.contract.EvidenceItemPayload
import com.lumi.coredomain.contract.GithubConnectPayload
import com.lumi.coredomain.contract.GithubImportPayload
import com.lumi.coredomain.contract.GithubRepoItem
import com.lumi.coredomain.contract.GithubRepoPayload
import com.lumi.coredomain.contract.LeaderboardEntry
import com.lumi.coredomain.contract.LeaderboardPayload
import com.lumi.coredomain.contract.LiveSearchItem
import com.lumi.coredomain.contract.LiveSearchPayload
import com.lumi.coredomain.contract.LixBondStatusPayload
import com.lumi.coredomain.contract.LixDispatchDecisionPayload
import com.lumi.coredomain.contract.LixMyAgentItem
import com.lumi.coredomain.contract.LixMyAgentsPayload
import com.lumi.coredomain.contract.LixOfferAcceptPayload
import com.lumi.coredomain.contract.LixDeliveryPayload
import com.lumi.coredomain.contract.LixExecutorPayload
import com.lumi.coredomain.contract.LixOverflowContextPayload
import com.lumi.coredomain.contract.LixReviewPayload
import com.lumi.coredomain.contract.LixSolutionPayload
import com.lumi.coredomain.contract.LixUserViewPayload
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.ReasoningProtocolPayload
import com.lumi.coredomain.contract.RoutingDecisionPayload
import com.lumi.coredomain.contract.RoutingMode
import com.lumi.coredomain.contract.RoutingScoresPayload
import com.lumi.coredomain.contract.SelectedAgentPayload
import com.lumi.coredomain.contract.SerpStatusPayload
import com.lumi.coredomain.contract.SkillInvocationPayload
import com.lumi.coredomain.contract.SkillSandboxLevel
import com.lumi.coredomain.contract.SkillSource
import com.lumi.coredomain.contract.TavilySearchPayload
import com.lumi.coredomain.contract.TaskGraphEdgePayload
import com.lumi.coredomain.contract.TaskGraphPayload
import com.lumi.coredomain.contract.TaskGraphTaskPayload
import com.lumi.coredomain.contract.TrendPoint
import com.lumi.coredomain.contract.TrendsPayload
import com.lumi.coredomain.contract.TwinPosteriorDimensionPayload
import com.lumi.coredomain.contract.TwinPosteriorPayload
import com.lumi.coredomain.contract.TwinContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.time.LocalDate
import java.time.ZoneOffset
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.TimeUnit

class VercelCloudGateway(
    private val config: CloudAdapterConfig
) : CloudGateway {
    private val client: OkHttpClient = defaultClient(config)
    private val json: Json = Json { ignoreUnknownKeys = true }

    override suspend fun discoverAgents(
        query: String,
        twinContext: TwinContext
    ): CloudResult<AgentDiscoveryPayload> {
        val payload = buildJsonObject {
            put("query", query)
            put("require_realtime", true)
            putJsonObject("digital_twin_context") {
                put("user_id", twinContext.userId)
                put("locale", twinContext.locale)
                if (twinContext.topTraits.isNotEmpty()) {
                    putJsonArray("traits") {
                        twinContext.topTraits.forEach { trait ->
                            add(
                                buildJsonObject {
                                    put("key", trait.key)
                                    put("score", trait.value)
                                }
                            )
                        }
                    }
                }
            }
        }

        val result = postJson("/api/agent-market/discover", payload)
        if (!result.success) {
            return propagateError(result)
        }

        val items = parseDiscoveryItems(result.data)
        return CloudResult(
            success = true,
            data = AgentDiscoveryPayload(items),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun executeAgent(
        task: String,
        constraints: AgentTaskConstraints
    ): CloudResult<AgentExecutionPayload> {
        if (constraints.preferRealtime) {
            val superAgent = executeViaSuperAgent(task, constraints)
            if (superAgent != null) {
                return superAgent
            }
        }

        val manual = executeViaManualAgent(task, constraints)
        if (manual != null) {
            return manual
        }

        val liveFallback = liveSearch(query = task, constraints = constraints)
        if (liveFallback.success) {
            val items = liveFallback.data?.items.orEmpty()
            val summary = items.firstOrNull()?.snippet
                ?.takeIf { it.isNotBlank() }
                ?: "Task completed via live retrieval"
            val evidence = items.take(3).mapNotNull { item ->
                when {
                    item.title.isNotBlank() && item.snippet.isNotBlank() -> "${item.title}: ${item.snippet}"
                    item.title.isNotBlank() -> item.title
                    else -> null
                }
            }
            return CloudResult(
                success = true,
                data = AgentExecutionPayload(
                    taskId = liveFallback.traceId,
                    status = "success",
                    resultSummary = summary,
                    evidence = evidence
                ),
                traceId = liveFallback.traceId,
                errorCode = liveFallback.errorCode,
                httpStatus = liveFallback.httpStatus
            )
        }

        return CloudResult(
            success = false,
            error = liveFallback.error ?: "execution_unavailable",
            traceId = liveFallback.traceId,
            retryable = liveFallback.retryable,
            errorCode = liveFallback.errorCode ?: "execution_unavailable",
            httpStatus = liveFallback.httpStatus
        )
    }

    private suspend fun executeViaSuperAgent(
        task: String,
        constraints: AgentTaskConstraints
    ): CloudResult<AgentExecutionPayload>? {
        val payload = buildJsonObject {
            put("query", task)
            put("current_app", "android_app")
            put("model_provider", constraints.cloudModelProvider.ifBlank { "gemini" })
            put("locale", "en-GB")
            putJsonArray("recent_queries") {
                add(JsonPrimitive(task))
            }
            putJsonObject("preferences") {
                put("prefer_realtime", constraints.preferRealtime)
                put("response_language", "en-GB")
            }
            constraints.reasoningMode
                ?.takeIf { it.isNotBlank() }
                ?.let { put("reasoning_mode", it) }
            constraints.contextPacket?.let { packet ->
                putJsonObject("state_packet") {
                    putJsonObject("l1") {
                        put("profile_id", packet.l1.profileId)
                        put("value_anchor", packet.l1.valueAnchor)
                        put("risk_preference", packet.l1.riskPreference)
                    }
                    putJsonObject("l2") {
                        put("source_app", packet.l2.sourceApp)
                        put("app_category", packet.l2.appCategory)
                        put("energy_level", packet.l2.energyLevel)
                        put("context_load", packet.l2.contextLoad)
                    }
                    putJsonObject("l3") {
                        put("stress_score", packet.l3.stressScore)
                        put("polarity", packet.l3.polarity)
                        put("focus_score", packet.l3.focusScore)
                    }
                    put("updated_at_ms", packet.updatedAtMs)
                }
            }
            config.geminiApiKey
                ?.takeIf { it.isNotBlank() }
                ?.let { put("api_key", it) }
        }
        val result = postJson("/api/super-agent/execute", payload)
        if (!result.success) {
            return null
        }
        val root = result.data ?: JsonObject(emptyMap())
        if (boolFrom(root, "success") == false) {
            return null
        }

        val summary = extractExecutionSummary(root).orEmpty()
        if (summary.isBlank()) {
            return null
        }

        val parsedEvidenceItems = parseEvidenceItems(root)
        val evidenceRows = buildList {
            parsedEvidenceItems.forEach { item ->
                when {
                    !item.url.isNullOrBlank() -> add("${item.source}: ${item.url}")
                    !item.snippet.isNullOrBlank() -> add("${item.source}: ${item.snippet}")
                    else -> add(item.source)
                }
            }
            if (isEmpty()) {
                firstArray(root, listOf("evidence"), nestedData = false).orEmpty()
                    .mapNotNull { element ->
                        val obj = element as? JsonObject ?: return@mapNotNull null
                        val source = stringFrom(obj, "source")
                            ?: stringFrom(obj, "source_name")
                            ?: "source"
                        val url = stringFrom(obj, "url")
                        if (!url.isNullOrBlank()) "$source: $url" else null
                    }
                    .forEach(::add)
            }
        }.take(6)

        val traceId = stringFrom(root, "trace_id")
            ?: result.traceId

        val routingDecision = parseRoutingDecision(root)
        val taskGraph = parseTaskGraph(root)
        val skillInvocations = parseSkillInvocations(root)
        val selectedAgents = parseSelectedAgents(root)
        val reasoningProtocol = parseReasoningProtocol(root)

        return CloudResult(
            success = true,
            data = AgentExecutionPayload(
                taskId = traceId,
                status = "success",
                resultSummary = summary,
                evidence = evidenceRows,
                routingDecision = routingDecision,
                taskGraph = taskGraph,
                skillInvocations = skillInvocations,
                evidenceItems = parsedEvidenceItems,
                selectedAgents = selectedAgents,
                reasoningProtocol = reasoningProtocol
            ),
            traceId = traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun liveSearch(
        query: String,
        constraints: AgentTaskConstraints
    ): CloudResult<LiveSearchPayload> {
        val payload = buildJsonObject {
            put("query", query)
            put("max_items", constraints.maxResults)
            if (constraints.timeoutMs > 0) {
                put("timeout_ms", constraints.timeoutMs)
            }
        }

        val result = postJson("/api/live-search", payload)
        if (!result.success) {
            return propagateError(result)
        }

        val items = parseSearchItems(result.data)
        return CloudResult(
            success = true,
            data = LiveSearchPayload(items),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun tavilySearch(query: String): CloudResult<TavilySearchPayload> {
        val payload = buildJsonObject {
            put("query", query)
        }
        val result = postJson("/api/tavily-search", payload)
        if (!result.success) {
            return propagateError(result)
        }

        val items = parseSearchItems(result.data)
        return CloudResult(
            success = true,
            data = TavilySearchPayload(items),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun leaderboard(window: String, sort: String): CloudResult<LeaderboardPayload> {
        val query = buildQuery(
            "window" to window,
            "sort" to sort
        )
        val result = getJson("/api/agent-market/leaderboard$query")
        if (!result.success) {
            return propagateError(result)
        }

        val rows = firstArray(
            result.data ?: JsonObject(emptyMap()),
            listOf("leaderboard", "rankings", "items", "data"),
            nestedData = true
        )
            .orEmpty()
            .mapIndexedNotNull { index, element ->
                val obj = element as? JsonObject ?: return@mapIndexedNotNull null
                LeaderboardEntry(
                    rank = (numberFrom(obj, "rank")?.toInt() ?: (index + 1)),
                    agentId = stringFrom(obj, "agent_id")
                        ?: stringFrom(obj, "id")
                        ?: "agent_$index",
                    agentName = stringFrom(obj, "agent_name")
                        ?: stringFrom(obj, "name")
                        ?: "Agent ${index + 1}",
                    hotnessScore = numberFrom(obj, "hotness_score") ?: numberFrom(obj, "score") ?: 0.0
                )
            }

        return CloudResult(
            success = true,
            data = LeaderboardPayload(rows, traceId = result.traceId),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun trends(window: String, agentId: String?): CloudResult<TrendsPayload> {
        val resolvedAgentId = agentId?.takeIf { it.isNotBlank() } ?: "tool:web_search"
        val query = buildQuery(
            "window" to window,
            "agent_id" to resolvedAgentId
        )
        val result = getJson("/api/agent-market/trends$query")
        if (!result.success) {
            return propagateError(result)
        }

        val points = firstArray(
            result.data ?: JsonObject(emptyMap()),
            listOf("points", "trends", "daily_points", "data"),
            nestedData = true
        )
            .orEmpty()
            .mapNotNull { element ->
                val obj = element as? JsonObject ?: return@mapNotNull null
                val parsedDateTs = stringFrom(obj, "date")
                    ?.let { runCatching { LocalDate.parse(it).atStartOfDay().toEpochSecond(ZoneOffset.UTC) * 1_000 }.getOrNull() }
                TrendPoint(
                    ts = numberFrom(obj, "ts")?.toLong()
                        ?: numberFrom(obj, "timestamp")?.toLong()
                        ?: parsedDateTs
                        ?: System.currentTimeMillis(),
                    value = numberFrom(obj, "value")
                        ?: numberFrom(obj, "score")
                        ?: numberFrom(obj, "hotness")
                        ?: 0.0
                )
            }

        return CloudResult(
            success = true,
            data = TrendsPayload(points, traceId = result.traceId),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun twinPosterior(userId: String): CloudResult<TwinPosteriorPayload> {
        val resolvedUserId = userId.trim()
        if (resolvedUserId.isBlank()) {
            return CloudResult(
                success = false,
                error = "missing_user_id",
                traceId = "local",
                retryable = false,
                errorCode = "missing_user_id"
            )
        }

        val query = buildQuery("user_id" to resolvedUserId)
        val result = getJson("/api/digital-twin/posterior$query")
        if (!result.success) {
            return propagateError(result)
        }

        val root = result.data ?: JsonObject(emptyMap())
        val parsed = parseTwinPosterior(root)
        return CloudResult(
            success = true,
            data = parsed,
            traceId = parsed.traceId ?: result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    // ---------- Local LIX Dispatch Agent Integration ----------
    private val localDispatchBaseUrl: String = "http://localhost:8901"

    /**
     * Attempts to dispatch intent via the local LIX Dispatch Agent (FastAPI at port 8901).
     * Returns null if the local agent is unavailable, allowing fallback to cloud.
     */
    override suspend fun lixLocalDispatch(
        query: String,
        domain: String
    ): CloudResult<LixSolutionPayload>? {
        return withContext(Dispatchers.IO) {
            runCatching {
                val payload = buildJsonObject {
                    put("need", query)
                    put("domain", domain)
                }
                val url = "$localDispatchBaseUrl/dispatch"
                val request = Request.Builder()
                    .url(url)
                    .addHeader("content-type", "application/json")
                    .post(payload.toString().toRequestBody(JSON_MEDIA_TYPE))
                    .build()

                // Short timeout to avoid blocking if local agent is down
                val localClient = client.newBuilder()
                    .connectTimeout(2, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.SECONDS)
                    .build()

                localClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use null
                    val bodyText = response.body?.string().orEmpty()
                    val root = runCatching {
                        json.parseToJsonElement(bodyText) as? JsonObject
                    }.getOrNull() ?: return@use null

                    val intentId = stringFrom(root, "intentId") ?: return@use null
                    val stage = stringFrom(root, "stage") ?: "discovery"
                    val offerCount = numberFrom(root, "offerCount")?.toInt() ?: 0
                    val dispatchDecision = parseLixDispatchDecision(root)
                    val userViewObj = (root["userView"] as? JsonObject)
                    val userView = if (userViewObj != null) LixUserViewPayload(
                        executablePlanSummary = stringFrom(userViewObj, "executablePlanSummary") ?: "",
                        expectedCompletionEta = stringFrom(userViewObj, "expectedCompletionEta") ?: "",
                        guaranteeSummary = stringFrom(userViewObj, "guaranteeSummary") ?: "",
                        paymentAndCompensationRule = stringFrom(userViewObj, "paymentAndCompensationRule") ?: ""
                    ) else null
                    val etaMinutes = numberFrom(root, "etaMinutes")?.toInt()
                    val takeRateTier = stringFrom(root, "takeRateTier")

                    CloudResult(
                        success = true,
                        data = LixSolutionPayload(
                            intentId = intentId,
                            status = stage,
                            offersCount = offerCount,
                            dispatchDecision = dispatchDecision,
                            takeRateTier = takeRateTier,
                            etaMinutes = etaMinutes,
                            userGuaranteeSummary = userView?.guaranteeSummary,
                            userView = userView
                        ),
                        traceId = "local_dispatch_${intentId}",
                        httpStatus = 200
                    )
                }
            }.getOrNull()
        }
    }

    override suspend fun lixBroadcast(
        query: String,
        domain: String,
        requiredCapabilities: List<String>,
        reasoningTraceId: String?,
        overflowContext: LixOverflowContextPayload?,
        dispatchPolicyVersion: String,
        preferPaidExpert: Boolean
    ): CloudResult<LixSolutionPayload> {
        // Try local LIX Dispatch Agent first (faster, no cloud dependency)
        val localResult = lixLocalDispatch(query, domain)
        if (localResult != null && localResult.success) {
            return localResult
        }
        // Fallback to cloud broadcast
        val payload = buildJsonObject {
            put("requester_id", "demo_user")
            put("requester_type", "user")
            put("query", query)
            put("domain", domain)
            putJsonArray("required_capabilities") {
                requiredCapabilities.forEach { add(JsonPrimitive(it)) }
            }
            put("delivery_mode_preference", "hybrid")
            put("dispatch_policy_version", dispatchPolicyVersion)
            put("prefer_paid_expert", preferPaidExpert)
            reasoningTraceId?.takeIf { it.isNotBlank() }?.let { put("reasoning_trace_id", it) }
            overflowContext?.let { context ->
                putJsonObject("overflow_context") {
                    put("mode", context.mode)
                    context.overflowReason?.let { put("overflow_reason", it) }
                    put("complexity", context.complexity)
                    put("risk", context.risk)
                    put("required_capabilities", context.requiredCapabilities)
                    put("super_agent_queue_depth", context.superAgentQueueDepth)
                }
            }
        }
        val result = postJson("/api/lix/solution/broadcast", payload)
        if (result.success) {
            val root = result.data ?: JsonObject(emptyMap())
            val intentId = stringFrom(root, "intent_id")
                ?: ((root["intent"] as? JsonObject)?.let { stringFrom(it, "intent_id") })
                ?: ""
            val status = stringFrom(root, "status")
                ?: ((root["intent"] as? JsonObject)?.let { stringFrom(it, "status") })
                ?: "created"
            val offersCount = numberFrom(root, "offers_count")?.toInt()
                ?: ((root["intent"] as? JsonObject)?.let { numberFrom(it, "offers_count")?.toInt() })
                ?: 0
            val dispatchDecision = parseLixDispatchDecision(root)
            val bondStatus = parseLixBondStatus(root)
            val takeRateTier = stringFrom(root, "take_rate_preview.tier")
                ?: stringFrom(findObjectByPath(root, "take_rate_preview") ?: JsonObject(emptyMap()), "tier")
                ?: stringFrom(findObjectByPath(root, "intent") ?: JsonObject(emptyMap()), "take_rate_tier")
            val etaMinutes = numberFrom(findObjectByPath(root, "intent") ?: JsonObject(emptyMap()), "eta_minutes")?.toInt()
            val retryTrace = stringFrom(root, "retry_trace")
            val userGuaranteeSummary = when {
                bondStatus?.required == true && !bondStatus.bondLockId.isNullOrBlank() ->
                    "Bond has been locked; compensation can be triggered on failure"
                bondStatus?.required == true ->
                    "This task requires bond guarantee"
                else -> "Executed under standard platform guarantee"
            }
            val userView = LixUserViewPayload(
                executablePlanSummary = if (offersCount > 0) "Received $offersCount executable offers" else "Intent broadcasted, waiting for live supply",
                expectedCompletionEta = etaMinutes?.let { "$it min" } ?: "Updated after offers arrive",
                guaranteeSummary = userGuaranteeSummary,
                paymentAndCompensationRule = "First order 30% / repeat order 10%; failed tasks compensated by guarantee policy"
            )
            return CloudResult(
                success = intentId.isNotBlank(),
                data = LixSolutionPayload(
                    intentId = intentId,
                    status = status,
                    offersCount = offersCount,
                    dispatchDecision = dispatchDecision,
                    bondStatus = bondStatus,
                    takeRateTier = takeRateTier,
                    etaMinutes = etaMinutes,
                    userGuaranteeSummary = userGuaranteeSummary,
                    retryTrace = retryTrace,
                    userView = userView
                ),
                traceId = result.traceId,
                errorCode = result.errorCode,
                httpStatus = result.httpStatus,
                error = if (intentId.isBlank()) "missing_intent_id" else null
            )
        }

        return propagateError(result)
    }

    override suspend fun lixOffers(intentId: String): CloudResult<AgentDiscoveryPayload> {
        val query = buildQuery("intent_id" to intentId)
        val result = getJson("/api/lix/solution/offers$query")
        if (result.success) {
            val root = result.data ?: JsonObject(emptyMap())
            val offers = firstArray(root, listOf("offers"), nestedData = true).orEmpty()
            val items = offers.mapIndexedNotNull { index, element ->
                val obj = element as? JsonObject ?: return@mapIndexedNotNull null
                val offerObject = findObjectByPath(obj, "offer") ?: obj
                val provider = findObjectByPath(offerObject, "provider") ?: JsonObject(emptyMap())
                val providerName = stringFrom(provider, "name")
                    ?: stringFrom(offerObject, "provider_name")
                    ?: "Provider ${index + 1}"
                val price = numberFrom(findObjectByPath(offerObject, "price") ?: JsonObject(emptyMap()), "amount")
                    ?: numberFrom(offerObject, "price")
                val actionUrl = stringFrom(offerObject, "url")
                    ?: stringFrom(offerObject, "booking_url")
                    ?: stringFrom(offerObject, "deep_link")
                    ?: stringFrom(offerObject, "execute_ref")
                    ?: stringFrom(obj, "url")
                    ?: stringFrom(obj, "booking_url")
                    ?: stringFrom(obj, "execute_ref")
                AgentDiscoveryItem(
                    id = stringFrom(offerObject, "offer_id")
                        ?: stringFrom(obj, "offer_id")
                        ?: "offer_$index",
                    name = providerName,
                    summary = if (price == null) "Offer available" else "Quote ¥${price.toInt()}",
                    score = numberFrom(obj, "total_score")
                        ?: numberFrom(offerObject, "total_score")
                        ?: numberFrom(obj, "score")
                        ?: 0.0,
                    actionUrl = actionUrl,
                    actionDeeplink = "lumi://lix/intent/$intentId",
                    actionLabel = if (actionUrl.isNullOrBlank()) null else "Open provider link"
                )
            }

            if (items.isNotEmpty()) {
                return CloudResult(
                    success = true,
                    data = AgentDiscoveryPayload(items = items),
                    traceId = result.traceId,
                    errorCode = result.errorCode,
                    httpStatus = result.httpStatus
                )
            }
        }

        return if (result.success) {
            CloudResult(
                success = true,
                data = AgentDiscoveryPayload(items = emptyList()),
                traceId = result.traceId,
                errorCode = result.errorCode,
                httpStatus = result.httpStatus
            )
        } else {
            propagateError(result)
        }
    }

    override suspend fun lixAcceptOffer(intentId: String, offerId: String): CloudResult<LixOfferAcceptPayload> {
        val payload = buildJsonObject {
            put("intent_id", intentId)
            put("offer_id", offerId)
        }
        val result = postJson("/api/lix/solution/offer/accept", payload)
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        return CloudResult(
            success = boolFrom(root, "success") != false,
            data = LixOfferAcceptPayload(
                intentId = stringFrom(root, "intent_id") ?: intentId,
                offerId = stringFrom(root, "accepted_offer_id") ?: offerId,
                status = stringFrom(root, "status") ?: "accepted"
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun lixDelivery(
        intentId: String,
        offerId: String,
        name: String,
        executeRef: String
    ): CloudResult<LixDeliveryPayload> {
        val payload = buildJsonObject {
            put("intent_id", intentId)
            put("offer_id", offerId)
            put("name", name)
            put("execute_ref", executeRef)
        }
        val result = postJson("/api/lix/solution/delivery", payload)
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        val intentObj = findObjectByPath(root, "intent") ?: JsonObject(emptyMap())
        val manifestObj = findObjectByPath(root, "delivery_manifest")
            ?: findObjectByPath(intentObj, "delivery_manifest")
            ?: JsonObject(emptyMap())
        return CloudResult(
            success = boolFrom(root, "success") != false,
            data = LixDeliveryPayload(
                intentId = stringFrom(root, "intent_id")
                    ?: stringFrom(intentObj, "intent_id")
                    ?: intentId,
                status = stringFrom(root, "status")
                    ?: stringFrom(intentObj, "status")
                    ?: "delivery_submitted",
                manifestName = stringFrom(manifestObj, "name")
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun lixReview(intentId: String, decision: String): CloudResult<LixReviewPayload> {
        val payload = buildJsonObject {
            put("intent_id", intentId)
            put("decision", decision)
        }
        val result = postJson("/api/lix/solution/review", payload)
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        val intentObj = findObjectByPath(root, "intent") ?: JsonObject(emptyMap())
        return CloudResult(
            success = boolFrom(root, "success") != false,
            data = LixReviewPayload(
                intentId = stringFrom(root, "intent_id")
                    ?: stringFrom(intentObj, "intent_id")
                    ?: intentId,
                status = stringFrom(root, "status")
                    ?: stringFrom(intentObj, "status")
                    ?: if (decision.lowercase() == "approved") "approved" else "rejected",
                decision = decision
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun lixExecutor(query: String, domain: String): CloudResult<LixExecutorPayload> {
        val payload = buildJsonObject {
                putJsonObject("input") {
                    put("query", query)
                    put("domain", domain)
                    put("locale", "en-GB")
                }
        }
        val result = postJson("/api/lix/solution/executor", payload)
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        val errorObj = findObjectByPath(root, "error") ?: JsonObject(emptyMap())
        val summary = stringFrom(root, "summary")
            ?: stringFrom(errorObj, "message")
            ?: stringFrom(root, "message")
            ?: "Task execution completed"
        val success = boolFrom(root, "success") == true
        if (!success) {
            val httpStatus = result.httpStatus
            return CloudResult(
                success = false,
                error = summary,
                traceId = result.traceId,
                retryable = httpStatus == null || httpStatus >= 500,
                errorCode = stringFrom(errorObj, "code")
                    ?: stringFrom(root, "code")
                    ?: "lix_executor_failed",
                httpStatus = httpStatus
            )
        }
        return CloudResult(
            success = true,
            data = LixExecutorPayload(
                success = true,
                summary = summary,
                traceId = stringFrom(root, "trace_id") ?: result.traceId
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun lixMyAgents(ownerId: String): CloudResult<LixMyAgentsPayload> {
        val query = buildQuery("owner_id" to ownerId)
        val result = getJson("/api/lix/solution/my-agents$query")
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        val rows = firstArray(root, listOf("agents", "items", "data"), nestedData = true).orEmpty()
            .mapIndexedNotNull { index, element ->
                val obj = element as? JsonObject ?: return@mapIndexedNotNull null
                LixMyAgentItem(
                    agentId = stringFrom(obj, "agent_id")
                        ?: stringFrom(obj, "id")
                        ?: "agent_$index",
                    name = stringFrom(obj, "name") ?: "Agent ${index + 1}",
                    status = stringFrom(obj, "status") ?: "approved"
                )
            }
        return CloudResult(
            success = true,
            data = LixMyAgentsPayload(
                ownerId = stringFrom(root, "owner_id") ?: ownerId,
                agents = rows
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun githubRepos(): CloudResult<GithubRepoPayload> {
        val result = getJson("/api/agent-market/github/repos")
        if (!result.success) {
            return propagateError(result)
        }

        val root = result.data ?: JsonObject(emptyMap())
        val rows = firstArray(root, listOf("repos", "items", "data"), nestedData = true).orEmpty()
            .mapIndexedNotNull { index, element ->
                val obj = element as? JsonObject ?: return@mapIndexedNotNull null
                GithubRepoItem(
                    id = stringFrom(obj, "id") ?: stringFrom(obj, "node_id") ?: "repo_$index",
                    name = stringFrom(obj, "name") ?: "repo_$index",
                    fullName = stringFrom(obj, "full_name") ?: stringFrom(obj, "name") ?: "repo_$index",
                    privateRepo = boolFrom(obj, "private") == true
                )
            }

        return CloudResult(
            success = true,
            data = GithubRepoPayload(rows),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun githubConnect(): CloudResult<GithubConnectPayload> {
        val result = getJson("/api/agent-market/github/connect")
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        return CloudResult(
            success = boolFrom(root, "success") != false,
            data = GithubConnectPayload(
                connected = boolFrom(root, "connected") ?: true,
                account = stringFrom(root, "account")
                    ?: stringFrom(findObjectByPath(root, "connection") ?: JsonObject(emptyMap()), "account")
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun githubImport(
        repoFullName: String,
        manifestPath: String
    ): CloudResult<GithubImportPayload> {
        val payload = buildJsonObject {
            put("repo", repoFullName)
            put("manifest_path", manifestPath)
        }
        val result = postJson("/api/agent-market/github/import", payload)
        if (!result.success) {
            return propagateError(result)
        }
        val root = result.data ?: JsonObject(emptyMap())
        return CloudResult(
            success = boolFrom(root, "success") != false,
            data = GithubImportPayload(
                imported = boolFrom(root, "success") == true,
                agentId = stringFrom(root, "agent_id")
                    ?: stringFrom(findObjectByPath(root, "descriptor") ?: JsonObject(emptyMap()), "id")
                    ?: stringFrom(findObjectByPath(root, "approved_agent") ?: JsonObject(emptyMap()), "agent_id"),
                status = stringFrom(root, "status")
                    ?: if (boolFrom(root, "success") == true) "imported" else "pending_review"
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override suspend fun serpStatus(): CloudResult<SerpStatusPayload> {
        val result = getJson("/api/serpapi/status")
        if (!result.success) {
            return propagateError(result)
        }

        val root = result.data ?: JsonObject(emptyMap())
        return CloudResult(
            success = true,
            data = SerpStatusPayload(
                configured = boolFrom(root, "configured") == true,
                source = stringFrom(root, "source") ?: "unknown"
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    override fun cloudBaseUrl(): String {
        return config.baseUrl
    }

    private suspend fun getJson(path: String): CloudResult<JsonObject> {
        return requestJson(path = path, method = "GET", body = null)
    }

    private suspend fun postJson(path: String, body: JsonObject): CloudResult<JsonObject> {
        return requestJson(path = path, method = "POST", body = body)
    }

    private suspend fun requestJson(
        path: String,
        method: String,
        body: JsonObject?
    ): CloudResult<JsonObject> {
        return withContext(Dispatchers.IO) {
            runCatching {
                val url = "${config.baseUrl}$path"
                val builder = Request.Builder()
                    .url(url)
                    .addHeader("content-type", "application/json")

                when (method.uppercase()) {
                    "POST" -> builder.post((body ?: JsonObject(emptyMap())).toString().toRequestBody(JSON_MEDIA_TYPE))
                    else -> builder.get()
                }

                client.newCall(builder.build()).execute().use { response ->
                    val bodyText = response.body?.string().orEmpty()
                    val parsed = runCatching {
                        json.parseToJsonElement(bodyText)
                    }.getOrNull()
                    val obj = parsed as? JsonObject ?: JsonObject(emptyMap())
                    val trace = stringFrom(obj, "traceId")
                        ?: stringFrom(obj, "trace_id")
                        ?: UUID.randomUUID().toString()
                    if (!response.isSuccessful) {
                        CloudResult(
                            success = false,
                            error = stringFrom(obj, "error") ?: "http_${response.code}",
                            traceId = trace,
                            retryable = response.code >= 500,
                            errorCode = stringFrom(obj, "code") ?: "http_${response.code}",
                            httpStatus = response.code
                        )
                    } else {
                        CloudResult(
                            success = true,
                            data = obj,
                            traceId = trace,
                            retryable = false,
                            httpStatus = response.code
                        )
                    }
                }
            }.getOrElse { error ->
                CloudResult(
                    success = false,
                    error = error.message ?: "network_error",
                    traceId = UUID.randomUUID().toString(),
                    retryable = true,
                    errorCode = "network_error"
                )
            }
        }
    }

    private fun parseDiscoveryItems(root: JsonObject?): List<AgentDiscoveryItem> {
        if (root == null) return emptyList()
        val source = firstArray(
            root,
            listOf("candidates", "items", "agents", "results"),
            nestedData = true
        ) ?: return emptyList()

        return source.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val agent = obj["agent"] as? JsonObject
            val id = stringFrom(obj, "agent_id")
                ?: stringFrom(obj, "id")
                ?: agent?.let { stringFrom(it, "id") }
                ?: return@mapNotNull null
            AgentDiscoveryItem(
                id = id,
                name = stringFrom(obj, "agent_name")
                    ?: stringFrom(obj, "name")
                    ?: stringFrom(obj, "title")
                    ?: agent?.let { stringFrom(it, "name") }
                    ?: id,
                summary = stringFrom(obj, "summary")
                    ?: stringFrom(obj, "description")
                    ?: agent?.let { stringFrom(it, "description") }
                    ?: agent?.let { stringFrom(it, "execute_ref") }
                    ?: "Executable Agent",
                score = numberFrom(obj, "total_score")
                    ?: numberFrom(obj, "score")
                    ?: numberFrom(obj, "fit_score")
                    ?: 0.0,
                actionUrl = stringFrom(obj, "url")
                    ?: stringFrom(obj, "execute_ref")
                    ?: agent?.let { stringFrom(it, "execute_ref") },
                actionLabel = "Open execution endpoint"
            )
        }
    }

    private fun parseSearchItems(root: JsonObject?): List<LiveSearchItem> {
        if (root == null) return emptyList()
        val source = firstArray(
            root,
            listOf(
                "items",
                "results",
                "organic_results",
                "links",
                "evidence.items",
                "normalized.items"
            ),
            nestedData = true
        ) ?: return emptyList()

        return source.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val url = stringFrom(obj, "url")
                ?: stringFrom(obj, "link")
                ?: stringFrom(obj, "source_url")
                ?: stringFrom(obj, "href")
                ?: return@mapNotNull null
            LiveSearchItem(
                title = stringFrom(obj, "title")
                    ?: stringFrom(obj, "name")
                    ?: stringFrom(obj, "source_name")
                    ?: "Result",
                snippet = clipText(
                    stringFrom(obj, "snippet")
                        ?: stringFrom(obj, "summary")
                        ?: stringFrom(obj, "content")
                        ?: stringFrom(obj, "body")
                        ?: stringFrom(obj, "text")
                        ?: "",
                    maxLength = 140
                ),
                url = url
            )
        }
    }

    private fun parseTwinPosterior(root: JsonObject): TwinPosteriorPayload {
        val container = findObjectByPath(root, "data") ?: root
        val rows = firstArray(
            container,
            listOf("dimensions"),
            nestedData = false
        ).orEmpty()

        val dimensions = rows.mapNotNull { row ->
            val obj = row as? JsonObject ?: return@mapNotNull null
            val key = stringFrom(obj, "key")?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            TwinPosteriorDimensionPayload(
                key = key,
                label = stringFrom(obj, "label") ?: key,
                mean = numberFrom(obj, "mean") ?: 0.0,
                p10 = numberFrom(obj, "p10") ?: 0.0,
                p90 = numberFrom(obj, "p90") ?: 0.0,
                source = stringFrom(obj, "source") ?: "cloud_particle_filter"
            )
        }

        val trendSeriesRaw = firstArray(
            container,
            listOf("trend_series", "trendSeries"),
            nestedData = false
        ).orEmpty()
        val trendSeries = trendSeriesRaw.mapNotNull { entry ->
            (entry as? JsonPrimitive)?.doubleOrNull
        }

        return TwinPosteriorPayload(
            particleCount = numberFrom(container, "particle_count")?.toInt()
                ?: numberFrom(container, "particleCount")?.toInt()
                ?: 500,
            confidence = numberFrom(container, "confidence") ?: 0.0,
            updatedAtMs = numberFrom(container, "updated_at_ms")?.toLong()
                ?: numberFrom(container, "updatedAtMs")?.toLong()
                ?: System.currentTimeMillis(),
            dimensions = dimensions,
            trendSeries = trendSeries,
            syncVersion = numberFrom(container, "sync_version")?.toInt()
                ?: numberFrom(container, "syncVersion")?.toInt(),
            posteriorVersion = numberFrom(container, "posterior_version")?.toInt()
                ?: numberFrom(container, "posteriorVersion")?.toInt(),
            traceId = stringFrom(container, "trace_id")
                ?: stringFrom(container, "traceId")
                ?: stringFrom(root, "trace_id")
        )
    }

    private fun parseLixDispatchDecision(root: JsonObject): LixDispatchDecisionPayload? {
        val obj = findObjectByPath(root, "dispatch_decision")
            ?: findObjectByPath(root, "data.dispatch_decision")
            ?: return null
        val reasonCodes = ((obj["reason_codes"] as? JsonArray)
            ?: (obj["reasonCodes"] as? JsonArray))
            .orEmpty()
            .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
        return LixDispatchDecisionPayload(
            mode = stringFrom(obj, "mode") ?: "lumi_primary",
            reasonCodes = reasonCodes,
            overflowReason = stringFrom(obj, "overflow_reason")
                ?: stringFrom(obj, "overflowReason"),
            policyVersion = stringFrom(obj, "policy_version")
                ?: stringFrom(obj, "policyVersion")
                ?: "lix_1_5",
            retryTrace = stringFrom(obj, "retry_trace")
                ?: stringFrom(obj, "retryTrace")
        )
    }

    private fun parseLixBondStatus(root: JsonObject): LixBondStatusPayload? {
        val obj = findObjectByPath(root, "bond_gate_result")
            ?: findObjectByPath(root, "data.bond_gate_result")
            ?: return null
        return LixBondStatusPayload(
            required = boolFrom(obj, "required") == true,
            minBondCny = numberFrom(obj, "min_bond_cny")?.toInt()
                ?: numberFrom(obj, "minBondCny")?.toInt()
                ?: 0,
            status = stringFrom(obj, "status") ?: "not_required",
            bondLockId = stringFrom(obj, "bond_lock_id") ?: stringFrom(obj, "bondLockId")
        )
    }

    private fun parseRoutingDecision(root: JsonObject): RoutingDecisionPayload? {
        val decision = findObjectByPath(root, "routing_decision")
            ?: findObjectByPath(root, "data.routing_decision")
            ?: return null

        val mode = when (stringFrom(decision, "mode")?.lowercase()) {
            "multi_agent" -> RoutingMode.MULTI_AGENT
            else -> RoutingMode.SINGLE_AGENT
        }
        val reasonRaw = (decision["reason_codes"] as? JsonArray)
            ?: (decision["reasonCodes"] as? JsonArray)
        val reasonCodes = reasonRaw
            .orEmpty()
            .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
            .distinct()
        val scoreObject = findObjectByPath(decision, "scores") ?: JsonObject(emptyMap())

        return RoutingDecisionPayload(
            mode = mode,
            reasonCodes = reasonCodes,
            scores = RoutingScoresPayload(
                complexity = numberFrom(scoreObject, "complexity") ?: 0.0,
                risk = numberFrom(scoreObject, "risk") ?: 0.0,
                dependency = numberFrom(scoreObject, "dependency") ?: 0.0
            )
        )
    }

    private fun parseTaskGraph(root: JsonObject): TaskGraphPayload? {
        val graph = findObjectByPath(root, "task_graph")
            ?: findObjectByPath(root, "data.task_graph")
            ?: return null
        val tasks = (graph["tasks"] as? JsonArray).orEmpty().mapNotNull { element ->
            val obj = element as? JsonObject ?: return@mapNotNull null
            val id = stringFrom(obj, "id") ?: return@mapNotNull null
            val capsRaw = (obj["required_capabilities"] as? JsonArray)
                ?: (obj["requiredCapabilities"] as? JsonArray)
            val requiredCaps = capsRaw
                .orEmpty()
                .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
            TaskGraphTaskPayload(
                id = id,
                title = stringFrom(obj, "title") ?: id,
                requiredCapabilities = requiredCaps
            )
        }
        val edges = (graph["edges"] as? JsonArray).orEmpty().mapNotNull { element ->
            val obj = element as? JsonObject ?: return@mapNotNull null
            val from = stringFrom(obj, "from")
                ?: stringFrom(obj, "from_task_id")
                ?: stringFrom(obj, "fromTaskId")
                ?: return@mapNotNull null
            val to = stringFrom(obj, "to")
                ?: stringFrom(obj, "to_task_id")
                ?: stringFrom(obj, "toTaskId")
                ?: return@mapNotNull null
            TaskGraphEdgePayload(fromTaskId = from, toTaskId = to)
        }
        val criticalPathRaw = (graph["critical_path"] as? JsonArray)
            ?: (graph["criticalPath"] as? JsonArray)
        val criticalPath = criticalPathRaw
            .orEmpty()
            .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
        val parallelRaw = (graph["parallel_groups"] as? JsonArray)
            ?: (graph["parallelGroups"] as? JsonArray)
        val parallelGroups = parallelRaw.orEmpty().mapNotNull { entry ->
            val row = entry as? JsonArray ?: return@mapNotNull null
            row.mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
                .takeIf { it.isNotEmpty() }
        }
        return TaskGraphPayload(
            tasks = tasks,
            edges = edges,
            criticalPath = criticalPath,
            parallelGroups = parallelGroups
        )
    }

    private fun parseSkillInvocations(root: JsonObject): List<SkillInvocationPayload> {
        val rows = firstArray(
            root,
            listOf("skill_invocations"),
            nestedData = true
        ).orEmpty()
        return rows.mapNotNull { entry ->
            val obj = entry as? JsonObject ?: return@mapNotNull null
            val skillId = stringFrom(obj, "skill_id")
                ?: stringFrom(obj, "skillId")
                ?: return@mapNotNull null
            val sourceRaw = stringFrom(obj, "source")?.lowercase()
            SkillInvocationPayload(
                skillId = skillId,
                source = when (sourceRaw) {
                    "github" -> SkillSource.GITHUB
                    "trusted_catalog", "anthropic_trusted_skill", "anthropic_skills" -> SkillSource.TRUSTED_CATALOG
                    "local_template" -> SkillSource.LOCAL_TEMPLATE
                    else -> SkillSource.LOCAL
                },
                status = parseResponseStatus(
                    raw = stringFrom(obj, "status")
                        ?: stringFrom(obj, "state")
                ),
                latencyMs = numberFrom(obj, "latency_ms")?.toLong()
                    ?: numberFrom(obj, "latencyMs")?.toLong()
                    ?: 0L,
                evidenceCount = numberFrom(obj, "evidence_count")?.toInt()
                    ?: numberFrom(obj, "evidenceCount")?.toInt()
                    ?: 0,
                sandboxLevel = when (stringFrom(obj, "sandbox_level")?.lowercase()) {
                    "sandbox" -> SkillSandboxLevel.SANDBOX
                    "approved" -> SkillSandboxLevel.APPROVED
                    "quarantine" -> SkillSandboxLevel.QUARANTINE
                    else -> SkillSandboxLevel.NONE
                }
            )
        }.take(12)
    }

    private fun parseReasoningProtocol(root: JsonObject): ReasoningProtocolPayload? {
        val protocol = findObjectByPath(root, "reasoning_protocol")
            ?: findObjectByPath(root, "data.reasoning_protocol")
            ?: return null
        val artifacts = findObjectByPath(protocol, "artifacts") ?: JsonObject(emptyMap())
        val firstPrinciples = findObjectByPath(artifacts, "first_principles") ?: JsonObject(emptyMap())
        val premortem = findArrayByPath(artifacts, "premortem").orEmpty()
        val keyConstraints = buildList {
            val assumptions = findArrayByPath(firstPrinciples, "assumptions").orEmpty()
            assumptions
                .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
                .take(3)
                .forEach(::add)
            val baseFacts = findArrayByPath(firstPrinciples, "base_facts").orEmpty()
            baseFacts
                .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
                .take(2)
                .forEach(::add)
        }.distinct()
        val topRisks = premortem
            .mapNotNull { entry ->
                val obj = entry as? JsonObject ?: return@mapNotNull null
                stringFrom(obj, "reason")
                    ?: stringFrom(obj, "mitigation")
            }
            .filter { it.isNotBlank() }
            .take(3)

        val methodsRaw = (protocol["methods_applied"] as? JsonArray)
            ?: (protocol["methodsApplied"] as? JsonArray)
        val methods = methodsRaw
            .orEmpty()
            .mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }

        return ReasoningProtocolPayload(
            version = stringFrom(protocol, "version") ?: "v1.1",
            mode = stringFrom(protocol, "mode") ?: "lite",
            methodsApplied = methods,
            rootProblem = stringFrom(protocol, "root_problem")
                ?: stringFrom(protocol, "rootProblem")
                ?: "",
            recommendedStrategy = stringFrom(protocol, "recommended_strategy")
                ?: stringFrom(protocol, "recommendedStrategy")
                ?: "",
            confidence = numberFrom(protocol, "confidence") ?: 0.0,
            keyConstraints = keyConstraints,
            topRisks = topRisks
        )
    }

    private fun parseSelectedAgents(root: JsonObject): List<SelectedAgentPayload> {
        val rows = firstArray(
            root,
            listOf("marketplace_selected_agents", "selected_agents"),
            nestedData = true
        ).orEmpty()

        return rows.mapNotNull { entry ->
            val obj = entry as? JsonObject ?: return@mapNotNull null
            val taskId = stringFrom(obj, "task_id")
                ?: stringFrom(obj, "taskId")
                ?: ""
            val agentId = stringFrom(obj, "agent_id")
                ?: stringFrom(obj, "agentId")
                ?: return@mapNotNull null
            SelectedAgentPayload(
                taskId = taskId,
                agentId = agentId
            )
        }.take(12)
    }

    private fun parseEvidenceItems(root: JsonObject): List<EvidenceItemPayload> {
        val rows = firstArray(
            root,
            listOf("evidence", "evidence.items", "items"),
            nestedData = true
        ).orEmpty()
        return rows.mapNotNull { entry ->
            val obj = entry as? JsonObject ?: return@mapNotNull null
            val source = stringFrom(obj, "source")
                ?: stringFrom(obj, "source_name")
                ?: "external"
            val title = stringFrom(obj, "title")
                ?: stringFrom(obj, "name")
                ?: source
            EvidenceItemPayload(
                source = source,
                title = title,
                url = stringFrom(obj, "url"),
                snippet = stringFrom(obj, "snippet"),
                fetchedAtMs = numberFrom(obj, "fetched_at_ms")?.toLong()
            )
        }.take(8)
    }

    private fun parseResponseStatus(raw: String?): ResponseStatus {
        return when (raw?.lowercase()) {
            "processing" -> ResponseStatus.PROCESSING
            "running" -> ResponseStatus.RUNNING
            "waiting_user", "waiting", "needs_user" -> ResponseStatus.WAITING_USER
            "quoting", "quote", "collecting_quotes" -> ResponseStatus.QUOTING
            "auth_required", "authorization_required", "payment_required" -> ResponseStatus.AUTH_REQUIRED
            "verifying", "verification", "proof_check" -> ResponseStatus.VERIFYING
            "committed", "confirmed", "finalized" -> ResponseStatus.COMMITTED
            "success", "completed", "done" -> ResponseStatus.SUCCESS
            "partial" -> ResponseStatus.PARTIAL
            "rolled_back", "rollback", "reverted" -> ResponseStatus.ROLLED_BACK
            "disputed", "conflict" -> ResponseStatus.DISPUTED
            "cancelled", "canceled" -> ResponseStatus.CANCELLED
            "error", "failed", "failure" -> ResponseStatus.ERROR
            else -> ResponseStatus.SUCCESS
        }
    }

    private fun extractExecutionSummary(root: JsonObject): String? {
        val summaryPaths = listOf(
            "answer",
            "summary",
            "text",
            "content",
            "message",
            "data.answer",
            "data.summary",
            "data.text",
            "data.content",
            "data.message",
            "result.answer",
            "result.summary",
            "result.text",
            "result.content",
            "output.answer",
            "output.summary",
            "output.text",
            "output.content",
            "output.message",
            "data.output.answer",
            "data.output.summary",
            "data.output.text",
            "data.result.answer",
            "data.result.summary",
            "data.result.text",
            "response.answer",
            "response.summary",
            "response.text",
            "response.content"
        )
        summaryPaths.forEach { path ->
            val value = stringFromPath(root, path)
            if (!value.isNullOrBlank()) {
                return value
            }
        }

        val resultRows = firstArray(
            root,
            listOf("toolResults", "tool_results", "results"),
            nestedData = true
        ).orEmpty()
        resultRows.forEach { row ->
            val obj = row as? JsonObject ?: return@forEach
            val rowSummary = stringFromPath(obj, "summary")
                ?: stringFromPath(obj, "answer")
                ?: stringFromPath(obj, "text")
                ?: stringFromPath(obj, "content")
                ?: stringFromPath(obj, "data.answer")
                ?: stringFromPath(obj, "data.summary")
                ?: stringFromPath(obj, "output.answer")
                ?: stringFromPath(obj, "output.summary")
                ?: stringFromPath(obj, "output.text")
            if (!rowSummary.isNullOrBlank()) {
                return rowSummary
            }
        }

        return null
    }

    private fun clipText(text: String, maxLength: Int): String {
        val cleaned = text.replace(Regex("\\s+"), " ").trim()
        if (cleaned.length <= maxLength) return cleaned
        return cleaned.take(maxLength - 1) + "…"
    }

    private fun firstArray(
        root: JsonObject,
        keys: List<String>,
        nestedData: Boolean
    ): JsonArray? {
        keys.forEach { key ->
            val direct = findArrayByPath(root, key)
            if (direct != null) return direct
        }

        if (!nestedData) return null
        val data = root["data"] as? JsonObject ?: return null
        keys.forEach { key ->
            val nested = findArrayByPath(data, key)
            if (nested != null) return nested
        }

        return null
    }

    private fun findElementByPath(root: JsonObject, path: String): JsonElement? {
        var current: JsonElement = root
        path.split('.').forEach { key ->
            val obj = current as? JsonObject ?: return null
            current = obj[key] ?: return null
        }
        return current
    }

    private fun findObjectByPath(root: JsonObject, path: String): JsonObject? {
        return findElementByPath(root, path) as? JsonObject
    }

    private fun findArrayByPath(root: JsonObject, path: String): JsonArray? {
        return findElementByPath(root, path) as? JsonArray
    }

    private fun stringFromPath(root: JsonObject, path: String): String? {
        val element = findElementByPath(root, path) ?: return null
        return when (element) {
            is JsonPrimitive -> element.contentOrNull?.trim()?.takeIf { it.isNotBlank() }
            is JsonObject -> listOf("answer", "summary", "text", "content", "message")
                .asSequence()
                .mapNotNull { key -> stringFrom(element, key) }
                .firstOrNull()
            else -> null
        }
    }

    private fun stringFrom(root: JsonObject, key: String): String? {
        return root[key]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() }
    }

    private fun boolFrom(root: JsonObject, key: String): Boolean? {
        return root[key]?.jsonPrimitive?.booleanOrNull
    }

    private fun numberFrom(root: JsonObject, key: String): Double? {
        return root[key]?.jsonPrimitive?.doubleOrNull
            ?: root[key]?.jsonPrimitive?.intOrNull?.toDouble()
    }

    private suspend fun executeViaManualAgent(
        task: String,
        constraints: AgentTaskConstraints
    ): CloudResult<AgentExecutionPayload>? {
        val discovery = discoverAgents(
            query = task,
            twinContext = TwinContext(userId = "local-user", locale = "zh-CN")
        )
        val selectedIds = if (discovery.success) {
            discovery.data?.items
                .orEmpty()
                .map { it.id }
                .filter { it.isNotBlank() }
                .distinct()
                .take(constraints.maxResults.coerceIn(1, 3))
        } else {
            emptyList()
        }
        val fallbackAgentIds = listOf("tool:web_search", "tool:live_search", "tool:web_exec")
            .take(constraints.maxResults.coerceIn(1, 3))
        val finalAgentIds = (selectedIds + fallbackAgentIds).distinct()
        if (finalAgentIds.isEmpty()) return null

        val payload = buildJsonObject {
            put("query", task)
            put("locale", "zh-CN")
            put("max_parallel", 1)
            put("domain_hint", inferDomainHint(task))
            putJsonArray("selected_agent_ids") {
                finalAgentIds.forEach { id ->
                    add(JsonPrimitive(id))
                }
            }
        }

        val result = postJson("/api/agent-market/manual-execute", payload)
        if (!result.success) return null

        val root = result.data ?: JsonObject(emptyMap())
        val results = firstArray(root, listOf("results"), nestedData = true).orEmpty()
        val firstResult = results.firstOrNull() as? JsonObject
        val successCount = numberFrom(root, "success_count")?.toInt() ?: 0
        val status = if (successCount > 0) "success" else "failed"
        val summary = firstResult?.let { stringFrom(it, "summary") }
            ?: firstResult?.let { findObjectByPath(it, "data")?.let { data -> stringFrom(data, "answer") } }
            ?: stringFrom(root, "message")
            ?: "Task executed"
        val evidence = results.mapNotNull { row ->
            val obj = row as? JsonObject ?: return@mapNotNull null
            val agentName = stringFrom(obj, "agent_name")
            val rowSummary = stringFrom(obj, "summary")
            when {
                !agentName.isNullOrBlank() && !rowSummary.isNullOrBlank() -> "$agentName: $rowSummary"
                !rowSummary.isNullOrBlank() -> rowSummary
                else -> null
            }
        }.take(3)

        return CloudResult(
            success = true,
            data = AgentExecutionPayload(
                taskId = stringFrom(root, "trace_id") ?: result.traceId,
                status = status,
                resultSummary = summary,
                evidence = evidence
            ),
            traceId = result.traceId,
            errorCode = result.errorCode,
            httpStatus = result.httpStatus
        )
    }

    private fun inferDomainHint(query: String): String {
        val text = query.lowercase()
        return when {
            listOf("flight", "hotel", "trip", "travel").any { text.contains(it) } -> "travel"
            listOf("recruit", "resume", "offer", "job").any { text.contains(it) } -> "recruitment"
            listOf("restaurant", "local", "nearby", "delivery").any { text.contains(it) } -> "local_service"
            listOf("price", "purchase", "order", "shopping", "deal").any { text.contains(it) } -> "shopping"
            else -> "general"
        }
    }

    private fun buildQuery(vararg params: Pair<String, String?>): String {
        val filtered = params
            .filter { it.second?.isNotBlank() == true }
            .joinToString("&") { (k, v) ->
                val encoded = URLEncoder.encode(v, StandardCharsets.UTF_8.toString())
                "$k=$encoded"
            }
        return if (filtered.isBlank()) "" else "?$filtered"
    }

    private fun <T> propagateError(source: CloudResult<*>): CloudResult<T> {
        return CloudResult(
            success = false,
            error = source.error,
            traceId = source.traceId,
            retryable = source.retryable,
            errorCode = source.errorCode,
            httpStatus = source.httpStatus
        )
    }

    private fun JsonArray?.orEmpty(): List<JsonElement> {
        return this?.toList() ?: emptyList()
    }

    companion object {
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

        private fun defaultClient(config: CloudAdapterConfig): OkHttpClient {
            return OkHttpClient.Builder()
                .connectTimeout(config.connectTimeoutMs, TimeUnit.MILLISECONDS)
                .readTimeout(config.readTimeoutMs, TimeUnit.MILLISECONDS)
                .writeTimeout(config.writeTimeoutMs, TimeUnit.MILLISECONDS)
                .callTimeout(config.callTimeoutMs, TimeUnit.MILLISECONDS)
                .build()
        }
    }
}
