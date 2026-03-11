package com.lumi.coreagent.orchestrator

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class RoutingThresholds(
    val crossDomainMin: Int = 2,
    val capabilitiesMin: Int = 3,
    val dependencyMin: Int = 2,
    val riskMin: Double = 0.75,
    val requireEvidenceOnRisk: Boolean = true
)

@Serializable
data class RoutingComplexityWeights(
    val crossDomainWeight: Double = 0.38,
    val capabilityWeight: Double = 0.22,
    val dependencyWeight: Double = 0.4
)

@Serializable
data class RoutingRiskProfile(
    val highRiskScore: Double = 0.9,
    val defaultRiskScore: Double = 0.34,
    val settingsRiskScore: Double = 0.28
)

@Serializable
data class RoutingScoreConfig(
    val thresholds: RoutingThresholds = RoutingThresholds(),
    val complexityWeights: RoutingComplexityWeights = RoutingComplexityWeights(),
    val riskProfile: RoutingRiskProfile = RoutingRiskProfile(),
    val explicitMultiAgentKeywords: List<String> = listOf(
        "multi-agent",
        "parallel collaboration",
        "multiple plans",
        "并行",
        "多智能体",
        "多方案"
    ),
    val dependencyKeywords: List<String> = listOf(
        "then",
        "first",
        "next",
        "and",
        "simultaneously",
        "and then",
        "然后",
        "先",
        "再",
        "同时",
        "并且"
    ),
    val highRiskKeywords: List<String> = listOf(
        "legal",
        "contract",
        "health",
        "medical",
        "investment",
        "stocks",
        "bitcoin",
        "transfer",
        "payment",
        "法律",
        "合同",
        "医疗",
        "转账",
        "支付"
    )
)

object RoutingScoreConfigProvider {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    @Volatile
    private var cached: RoutingScoreConfig? = null

    fun current(): RoutingScoreConfig {
        cached?.let { return it }
        val loaded = loadFromRuntime() ?: RoutingScoreConfig()
        cached = loaded
        return loaded
    }

    fun parse(raw: String?): RoutingScoreConfig? {
        val normalized = raw?.trim().orEmpty()
        if (normalized.isBlank()) return null
        return runCatching {
            json.decodeFromString<RoutingScoreConfig>(normalized)
        }.getOrNull()
    }

    private fun loadFromRuntime(): RoutingScoreConfig? {
        val raw = (
            System.getenv("LUMI_ROUTING_SCORE_CONFIG_JSON")
                ?: System.getProperty("lumi.routing.score.config")
            )
        return parse(raw)
    }

    internal fun resetForTest(config: RoutingScoreConfig? = null) {
        cached = config
    }
}
