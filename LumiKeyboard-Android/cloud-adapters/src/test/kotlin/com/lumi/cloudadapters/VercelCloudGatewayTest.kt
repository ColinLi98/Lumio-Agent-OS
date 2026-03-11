package com.lumi.cloudadapters

import com.lumi.coredomain.contract.AgentTaskConstraints
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.L1CoreStatePayload
import com.lumi.coredomain.contract.L2ContextStatePayload
import com.lumi.coredomain.contract.L3EmotionStatePayload
import com.lumi.coredomain.contract.SkillSource
import com.lumi.coredomain.contract.TwinContext
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class VercelCloudGatewayTest {

    private lateinit var server: MockWebServer
    private lateinit var gateway: VercelCloudGateway

    @Before
    fun setup() {
        server = MockWebServer()
        server.start()
        gateway = VercelCloudGateway(
            CloudAdapterConfig(baseUrl = server.url("/").toString().trimEnd('/'))
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun discoverAgents_parsesCandidateContractsFromApi() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_discover",
                      "candidates": [
                        {
                          "agent": {
                            "id": "agent_alpha",
                            "name": "Alpha Agent",
                            "description": "实时搜索与任务编排"
                          },
                          "total_score": 0.92
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.discoverAgents(
            query = "帮我找机票和酒店",
            twinContext = TwinContext(userId = "u1", locale = "zh-CN")
        )

        assertTrue(result.success)
        val item = result.data?.items?.firstOrNull()
        assertNotNull(item)
        assertEquals("agent_alpha", item?.id)
        assertEquals("Alpha Agent", item?.name)
        assertEquals("实时搜索与任务编排", item?.summary)

        val request = server.takeRequest()
        assertEquals("/api/agent-market/discover", request.path)
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"digital_twin_context\""))
        assertTrue(!body.contains("\"agent_discovery\""))
    }

    @Test
    fun liveSearch_parsesEvidenceItemsAndUsesMaxItems() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_live",
                      "success": true,
                      "evidence": {
                        "items": [
                          {
                            "title": "航班报价",
                            "snippet": "上海-北京 最低 ¥980",
                            "url": "https://example.com/flight"
                          }
                        ]
                      }
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.liveSearch(
            query = "上海到北京机票",
            constraints = AgentTaskConstraints(maxResults = 3)
        )

        assertTrue(result.success)
        assertEquals(1, result.data?.items?.size)
        assertEquals("航班报价", result.data?.items?.first()?.title)
        assertEquals("https://example.com/flight", result.data?.items?.first()?.url)

        val request = server.takeRequest()
        assertEquals("/api/live-search", request.path)
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"max_items\":3"))
    }

    @Test
    fun executeAgent_prefersManualExecuteWhenCandidatesAvailable() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("""{"success":false,"error":"not_found"}""")
        )
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_discover_exec",
                      "candidates": [
                        {
                          "agent_id": "agent_lix",
                          "agent_name": "LIX Negotiator",
                          "total_score": 0.9
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_manual_exec",
                      "success_count": 1,
                      "results": [
                        {
                          "agent_id": "agent_lix",
                          "agent_name": "LIX Negotiator",
                          "summary": "已生成报价与证据建议"
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.executeAgent(
            task = "给我 LIX 报价与证据建议",
            constraints = AgentTaskConstraints(maxResults = 2, preferRealtime = true)
        )

        assertTrue(result.success)
        assertEquals("success", result.data?.status)
        assertEquals("已生成报价与证据建议", result.data?.resultSummary)

        val superReq = server.takeRequest()
        assertEquals("/api/super-agent/execute", superReq.path)
        val discoverReq = server.takeRequest()
        assertEquals("/api/agent-market/discover", discoverReq.path)
        val manualReq = server.takeRequest()
        assertEquals("/api/agent-market/manual-execute", manualReq.path)
        val body = manualReq.body.readUtf8()
        assertTrue(body.contains("\"selected_agent_ids\""))
        assertTrue(body.contains("agent_lix"))
    }

    @Test
    fun executeAgent_fallsBackToManualDefaultsWithoutCandidates() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("""{"success":false,"error":"not_found"}""")
        )
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"trace_id":"trace_discover_empty","candidates":[]}""")
        )
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_manual_exec_fallback",
                      "success_count": 1,
                      "results": [
                        {
                          "agent_id": "tool:web_search",
                          "agent_name": "web_search",
                          "summary": "已使用默认 Agent 执行"
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.executeAgent(
            task = "执行复杂任务",
            constraints = AgentTaskConstraints(maxResults = 2, preferRealtime = true)
        )

        assertTrue(result.success)
        assertEquals("success", result.data?.status)
        assertEquals("已使用默认 Agent 执行", result.data?.resultSummary)
        assertEquals(listOf("web_search: 已使用默认 Agent 执行"), result.data?.evidence)

        val superReq = server.takeRequest()
        assertEquals("/api/super-agent/execute", superReq.path)
        val discoverReq = server.takeRequest()
        assertEquals("/api/agent-market/discover", discoverReq.path)
        val manualReq = server.takeRequest()
        assertEquals("/api/agent-market/manual-execute", manualReq.path)
        val body = manualReq.body.readUtf8()
        assertTrue(body.contains("tool:web_search"))
    }

    @Test
    fun executeAgent_prefersSuperAgentWhenRealtimePreferred() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "trace_id": "trace_super_exec",
                      "answer": "已拆解任务并执行 2 个子 Agent，给出可执行方案。",
                      "routing_decision": {
                        "mode": "multi_agent",
                        "reason_codes": ["required_capabilities>=3"],
                        "scores": { "complexity": 0.84, "risk": 0.36, "dependency": 0.72 }
                      },
                      "task_graph": {
                        "tasks": [
                          { "id": "t1", "title": "检索", "required_capabilities": ["live_search"] },
                          { "id": "t2", "title": "整合", "required_capabilities": ["reasoning"] }
                        ],
                        "edges": [{ "from": "t1", "to": "t2" }]
                      },
                      "skill_invocations": [
                        {
                          "skill_id": "github:find-skills/search",
                          "source": "github",
                          "status": "success",
                          "latency_ms": 183,
                          "evidence_count": 1,
                          "sandbox_level": "approved"
                        }
                      ],
                      "evidence": [
                        {
                          "source": "github",
                          "title": "openclaw repo",
                          "url": "https://github.com/openclaw/openclaw",
                          "snippet": "task agent runtime"
                        }
                      ],
                      "reasoning_protocol": {
                        "version": "v1.1",
                        "mode": "full",
                        "methods_applied": ["first_principles", "five_whys", "second_order"],
                        "root_problem": "用户需求缺少关键约束",
                        "recommended_strategy": "先澄清约束后并行执行",
                        "confidence": 0.78,
                        "artifacts": {
                          "first_principles": {
                            "assumptions": ["必须日更"],
                            "base_facts": ["核心是内容密度"]
                          },
                          "premortem": [
                            { "reason": "执行偏离目标", "likelihood": 0.7, "impact": 0.8 }
                          ]
                        }
                      }
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.executeAgent(
            task = "并行拆解任务并调用 agent 与 skills",
            constraints = AgentTaskConstraints(maxResults = 3, preferRealtime = true)
        )

        assertTrue(result.success)
        assertEquals("success", result.data?.status)
        assertEquals("trace_super_exec", result.data?.taskId)
        assertTrue(result.data?.resultSummary?.contains("拆解任务") == true)
        assertTrue(result.data?.evidence?.firstOrNull()?.contains("github") == true)
        assertEquals(2, result.data?.taskGraph?.tasks?.size)
        assertEquals("t1", result.data?.taskGraph?.tasks?.firstOrNull()?.id)
        assertTrue(result.data?.routingDecision?.reasonCodes?.contains("required_capabilities>=3") == true)
        assertEquals("github:find-skills/search", result.data?.skillInvocations?.firstOrNull()?.skillId)
        assertEquals("github", result.data?.evidenceItems?.firstOrNull()?.source)
        assertEquals("v1.1", result.data?.reasoningProtocol?.version)
        assertEquals("full", result.data?.reasoningProtocol?.mode)
        assertTrue(result.data?.reasoningProtocol?.keyConstraints?.isNotEmpty() == true)
        assertTrue(result.data?.reasoningProtocol?.topRisks?.isNotEmpty() == true)

        val superReq = server.takeRequest()
        assertEquals("/api/super-agent/execute", superReq.path)
        val body = superReq.body.readUtf8()
        assertTrue(body.contains("\"query\""))
        assertTrue(body.contains("\"prefer_realtime\":true"))
    }

    @Test
    fun executeAgent_parsesTrustedCatalogSkillSource() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "trace_id": "trace_trusted_source",
                      "answer": "已使用可信技能目录。",
                      "skill_invocations": [
                        {
                          "skill_id": "trusted:anthropics/anthropic-cookbook:skills/structured_outputs",
                          "source": "trusted_catalog",
                          "status": "success",
                          "latency_ms": 162,
                          "evidence_count": 2,
                          "sandbox_level": "approved"
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.executeAgent(
            task = "给我可信来源的技能执行结果",
            constraints = AgentTaskConstraints(preferRealtime = true)
        )

        assertTrue(result.success)
        assertEquals(
            SkillSource.TRUSTED_CATALOG,
            result.data?.skillInvocations?.firstOrNull()?.source
        )
        assertEquals(
            "trusted:anthropics/anthropic-cookbook:skills/structured_outputs",
            result.data?.skillInvocations?.firstOrNull()?.skillId
        )
    }

    @Test
    fun executeAgent_includesGeminiApiKeyWhenConfigured() = runTest {
        val keyedGateway = VercelCloudGateway(
            CloudAdapterConfig(
                baseUrl = server.url("/").toString().trimEnd('/'),
                geminiApiKey = "demo_gemini_key"
            )
        )
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "trace_id": "trace_keyed",
                      "answer": "ok"
                    }
                    """.trimIndent()
                )
        )

        val result = keyedGateway.executeAgent(
            task = "测试 key 透传",
            constraints = AgentTaskConstraints(maxResults = 1, preferRealtime = true)
        )

        assertTrue(result.success)
        val req = server.takeRequest()
        assertEquals("/api/super-agent/execute", req.path)
        val body = req.body.readUtf8()
        assertTrue(body.contains("\"api_key\":\"demo_gemini_key\""))
    }

    @Test
    fun executeAgent_includesStatePacketAndGeminiProvider() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "trace_id": "trace_state_packet",
                      "answer": "ok"
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.executeAgent(
            task = "测试 state packet",
            constraints = AgentTaskConstraints(
                maxResults = 2,
                preferRealtime = true,
                reasoningMode = "full",
                contextPacket = DynamicHumanStatePayload(
                    l1 = L1CoreStatePayload(profileId = "lite-default", valueAnchor = "balanced", riskPreference = 0.5),
                    l2 = L2ContextStatePayload(
                        sourceApp = "com.tencent.mm",
                        appCategory = "social",
                        energyLevel = 0.62,
                        contextLoad = 0.58
                    ),
                    l3 = L3EmotionStatePayload(
                        stressScore = 63,
                        polarity = -0.2,
                        focusScore = 54
                    ),
                    updatedAtMs = 1_732_000_000_000
                ),
                cloudModelProvider = "gemini"
            )
        )

        assertTrue(result.success)
        val req = server.takeRequest()
        val body = req.body.readUtf8()
        assertTrue(body.contains("\"model_provider\":\"gemini\""))
        assertTrue(body.contains("\"reasoning_mode\":\"full\""))
        assertTrue(body.contains("\"state_packet\""))
        assertTrue(body.contains("\"stress_score\":63"))
    }

    @Test
    fun executeAgent_parsesSummaryFromOutputTextWhenAnswerMissing() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "trace_id": "trace_super_output_text",
                      "output": {
                        "text": "这是来自 output.text 的最终结果。"
                      }
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.executeAgent(
            task = "测试 output text 解析",
            constraints = AgentTaskConstraints(maxResults = 3, preferRealtime = true)
        )

        assertTrue(result.success)
        assertEquals("这是来自 output.text 的最终结果。", result.data?.resultSummary)

        val superReq = server.takeRequest()
        assertEquals("/api/super-agent/execute", superReq.path)
    }

    @Test
    fun leaderboard_parsesRankedRows() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_leaderboard",
                      "leaderboard": [
                        {
                          "rank": 1,
                          "agent_id": "agent_hot",
                          "agent_name": "Hot Agent",
                          "hotness_score": 92.5
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.leaderboard(window = "7d", sort = "commercial")

        assertTrue(result.success)
        assertEquals(1, result.data?.entries?.size)
        assertEquals("agent_hot", result.data?.entries?.first()?.agentId)
        assertEquals("Hot Agent", result.data?.entries?.first()?.agentName)

        val req = server.takeRequest()
        assertTrue(req.path?.startsWith("/api/agent-market/leaderboard") == true)
    }

    @Test
    fun leaderboard_supportsRankingsShapeFromProd() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "rankings": [
                        {
                          "rank": 1,
                          "agent_id": "tool:web_search",
                          "agent_name": "web_search",
                          "hotness_score": 0.25
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.leaderboard(window = "7d", sort = "commercial")

        assertTrue(result.success)
        assertEquals(1, result.data?.entries?.size)
        assertEquals("tool:web_search", result.data?.entries?.first()?.agentId)
    }

    @Test
    fun trends_parsesDailyPointsShapeFromProd() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "daily_points": [
                        {
                          "date": "2026-02-14",
                          "hotness": 0.25
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.trends(window = "7d", agentId = "tool:web_search")

        assertTrue(result.success)
        assertEquals(1, result.data?.points?.size)
        assertEquals(0.25, result.data?.points?.first()?.value ?: 0.0, 0.0001)
    }

    @Test
    fun lixBroadcast_parsesIntentIdAndStatus() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "trace_id": "trace_lix",
                      "intent_id": "intent_abc",
                      "status": "broadcasting",
                      "offers_count": 2
                    }
                    """.trimIndent()
                )
        )

        val result = gateway.lixBroadcast(
            query = "帮我找北京到上海的机票",
            domain = "travel",
            requiredCapabilities = listOf("flight_search")
        )

        assertTrue(result.success)
        assertEquals("intent_abc", result.data?.intentId)
        assertEquals("broadcasting", result.data?.status)
        assertEquals(2, result.data?.offersCount)

        val req = server.takeRequest()
        assertEquals("/api/lix/solution/broadcast", req.path)
    }

    @Test
    fun lixBroadcast_returnsErrorWhenBroadcastEndpointFails() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(500).setBody("""{"error":"FUNCTION_INVOCATION_FAILED"}""")
        )

        val result = gateway.lixBroadcast(
            query = "帮我找北京到上海的机票",
            domain = "travel",
            requiredCapabilities = listOf("flight_search")
        )

        assertFalse(result.success)
        assertTrue(result.errorCode == "http_500" || result.errorCode == "network_error")

        assertEquals("/api/lix/solution/broadcast", server.takeRequest().path)
    }

    @Test
    fun lixDelivery_parsesDeliveryManifestStatus() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "status": "delivery_submitted",
                  "intent": { "intent_id": "intent_x1" },
                  "delivery_manifest": { "name": "Lumi Mobile Agent" }
                }
                """.trimIndent()
            )
        )

        val result = gateway.lixDelivery(
            intentId = "intent_x1",
            offerId = "offer_x1",
            name = "Lumi Mobile Agent",
            executeRef = "tool:web_search"
        )

        assertTrue(result.success)
        assertEquals("intent_x1", result.data?.intentId)
        assertEquals("delivery_submitted", result.data?.status)
        assertEquals("Lumi Mobile Agent", result.data?.manifestName)
        assertEquals("/api/lix/solution/delivery", server.takeRequest().path)
    }

    @Test
    fun lixReview_parsesDecisionAndStatus() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "status": "approved",
                  "intent": { "intent_id": "intent_r1" }
                }
                """.trimIndent()
            )
        )

        val result = gateway.lixReview(intentId = "intent_r1", decision = "approved")

        assertTrue(result.success)
        assertEquals("intent_r1", result.data?.intentId)
        assertEquals("approved", result.data?.status)
        assertEquals("approved", result.data?.decision)
        assertEquals("/api/lix/solution/review", server.takeRequest().path)
    }

    @Test
    fun lixExecutor_parsesSummary() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "summary": "任务执行完成",
                  "trace_id": "trace_exec_lix"
                }
                """.trimIndent()
            )
        )

        val result = gateway.lixExecutor(query = "查找机票", domain = "travel")

        assertTrue(result.success)
        assertTrue(result.data?.success == true)
        assertEquals("任务执行完成", result.data?.summary)
        assertEquals("/api/lix/solution/executor", server.takeRequest().path)
    }

    @Test
    fun lixExecutor_returnsErrorOnServerFailure() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(500).setBody(
                """
                {"success":false,"error":{"message":"upstream_error"}}
                """.trimIndent()
            )
        )

        val result = gateway.lixExecutor(query = "查找机票", domain = "travel")

        assertFalse(result.success)
        assertTrue(result.errorCode == "http_500" || result.errorCode == "network_error")
        assertEquals("/api/lix/solution/executor", server.takeRequest().path)
    }

    @Test
    fun githubConnect_parsesConnectedAccount() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "connected": true,
                  "account": "lumi-demo"
                }
                """.trimIndent()
            )
        )

        val result = gateway.githubConnect()

        assertTrue(result.success)
        assertEquals(true, result.data?.connected)
        assertEquals("lumi-demo", result.data?.account)
        val recorded = server.takeRequest()
        assertEquals("/api/agent-market/github/connect", recorded.path)
        assertEquals("GET", recorded.method)
    }

    @Test
    fun githubImport_parsesStatusAndAgentId() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "status": "pending_review",
                  "descriptor": { "id": "agent_demo_1" }
                }
                """.trimIndent()
            )
        )

        val result = gateway.githubImport(
            repoFullName = "lix-demo/agent-template",
            manifestPath = ".lix/agent.manifest.json"
        )

        assertTrue(result.success)
        assertEquals("pending_review", result.data?.status)
        assertEquals("agent_demo_1", result.data?.agentId)
        val recorded = server.takeRequest()
        assertEquals("/api/agent-market/github/import", recorded.path)
        assertEquals("POST", recorded.method)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"repo\":\"lix-demo/agent-template\""))
        assertTrue(body.contains("\"manifest_path\":\".lix/agent.manifest.json\""))
    }

    @Test
    fun twinPosterior_parsesCloudPosteriorPayload() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "user_id": "u42",
                  "sync_version": 7,
                  "posterior_version": 3,
                  "particle_count": 500,
                  "updated_at_ms": 1730493000000,
                  "confidence": 0.81,
                  "trend_series": [0.42, 0.47, 0.51],
                  "dimensions": [
                    {
                      "key": "wealth",
                      "label": "Wealth",
                      "mean": 0.62,
                      "p10": 0.48,
                      "p90": 0.74,
                      "source": "cloud_particle_filter"
                    }
                  ],
                  "trace_id": "trace_posterior_u42"
                }
                """.trimIndent()
            )
        )

        val result = gateway.twinPosterior(userId = "u42")

        assertTrue(result.success)
        assertEquals(500, result.data?.particleCount)
        assertEquals(0.81, result.data?.confidence)
        assertEquals(1, result.data?.dimensions?.size)
        assertEquals("wealth", result.data?.dimensions?.firstOrNull()?.key)
        assertEquals("trace_posterior_u42", result.data?.traceId)
        val recorded = server.takeRequest()
        assertEquals("/api/digital-twin/posterior?user_id=u42", recorded.path)
        assertEquals("GET", recorded.method)
    }
}
