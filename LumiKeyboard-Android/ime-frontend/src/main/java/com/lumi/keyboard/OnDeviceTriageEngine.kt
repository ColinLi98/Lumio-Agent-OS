package com.lumi.keyboard

import android.content.Context
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.KeystrokeDynamicsPayload
import com.lumi.coredomain.contract.L1CoreStatePayload
import com.lumi.coredomain.contract.L2ContextStatePayload
import com.lumi.coredomain.contract.L3EmotionStatePayload
import org.json.JSONObject
import java.util.Locale

/**
 * Lightweight on-device model for IME triage + digital-twin signal extraction.
 *
 * This engine does not run heavy LLM reasoning. It only computes a compact score
 * and a state vector to drive cloud handoff and twin updates.
 */
class OnDeviceTriageEngine(
    private val context: Context? = null,
    private val configOverride: String? = null
) {

    data class Decision(
        val requiresCloud: Boolean,
        val score: Double,
        val reasonCodes: List<String>,
        val highRisk: Boolean,
        val modelName: String,
        val stateVector: DynamicHumanStatePayload
    )

    private val config: Config by lazy { loadConfig() }

    fun evaluate(
        rawText: String,
        sourceApp: String,
        passwordField: Boolean,
        keystroke: KeystrokeDynamicsPayload
    ): Decision {
        val text = rawText.lowercase(Locale.ROOT)
        val realtimeHit = config.keywordSets.realtime.any(text::contains)
        val complexHit = config.keywordSets.complex.any(text::contains)
        val highRiskHit = config.keywordSets.highRisk.any(text::contains)
        val negativeHit = config.keywordSets.emotionNegative.any(text::contains)
        val positiveHit = config.keywordSets.emotionPositive.any(text::contains)
        val longQuery = rawText.length >= 36

        val stress = keystroke.stressProxy.coerceIn(0.0, 1.0)
        val score = (
            config.weights.bias +
                boolWeight(realtimeHit, config.weights.realtimeKeyword) +
                boolWeight(complexHit, config.weights.complexKeyword) +
                boolWeight(highRiskHit, config.weights.highRiskKeyword) +
                boolWeight(longQuery, config.weights.longQuery) +
                boolWeight(text.contains("?") || text.contains("？"), config.weights.questionForm) +
                boolWeight(negativeHit, config.weights.emotionNegative) +
                boolWeight(positiveHit, config.weights.emotionPositive) +
                (stress * config.weights.stressProxy)
            ).coerceIn(0.0, 1.0)

        val pauseRate = if (keystroke.keyCount <= 1) 0.0
        else keystroke.pauseCount.toDouble() / keystroke.keyCount.toDouble()
        val backspaceRate = if (keystroke.keyCount <= 0) 0.0
        else keystroke.backspaceCount.toDouble() / keystroke.keyCount.toDouble()

        val polarity = (
            (if (positiveHit) 0.35 else 0.0) -
                (if (negativeHit) 0.35 else 0.0) -
                (stress * 0.45)
            ).coerceIn(-1.0, 1.0)

        val focus = (
            (1.0 - pauseRate).coerceIn(0.0, 1.0) * 0.55 +
                burstFocusScore(keystroke.burstKpm) * 0.35 -
                backspaceRate * 0.25
            ).coerceIn(0.0, 1.0)

        val appCategory = resolveAppCategory(sourceApp)
        val energyLevel = (1.0 - (stress * 0.65)).coerceIn(0.0, 1.0)
        val contextLoad = (
            score * 0.7 +
                boolWeight(complexHit, 0.2) +
                boolWeight(realtimeHit, 0.1)
            ).coerceIn(0.0, 1.0)

        val stateVector = DynamicHumanStatePayload(
            l1 = L1CoreStatePayload(
                profileId = "lite-default",
                valueAnchor = if (highRiskHit) "safety_first" else "balanced",
                riskPreference = if (highRiskHit) 0.28 else 0.52
            ),
            l2 = L2ContextStatePayload(
                sourceApp = sourceApp,
                appCategory = appCategory,
                energyLevel = energyLevel,
                contextLoad = contextLoad
            ),
            l3 = L3EmotionStatePayload(
                stressScore = (stress * 100).toInt().coerceIn(0, 100),
                polarity = polarity,
                focusScore = (focus * 100).toInt().coerceIn(0, 100)
            ),
            updatedAtMs = System.currentTimeMillis()
        )

        val requiresCloud = when {
            passwordField -> false
            highRiskHit -> true
            score >= config.highRiskHandoffThreshold -> true
            score >= config.cloudHandoffThreshold -> true
            else -> false
        }

        val reasons = buildList {
            if (passwordField) add("password_field_local_only")
            if (realtimeHit) add("realtime_intent")
            if (complexHit) add("complex_intent")
            if (highRiskHit) add("high_risk_intent")
            if (negativeHit) add("negative_emotion_signal")
            if (stress >= 0.72) add("high_stress_signal")
            if (isEmpty()) add("local_twin_only")
        }

        return Decision(
            requiresCloud = requiresCloud,
            score = score,
            reasonCodes = reasons,
            highRisk = highRiskHit,
            modelName = config.modelName,
            stateVector = stateVector
        )
    }

    private fun burstFocusScore(burstKpm: Double): Double {
        if (burstKpm <= 0) return 0.45
        val normalized = 1.0 - (kotlin.math.abs(burstKpm - 180.0) / 220.0)
        return normalized.coerceIn(0.0, 1.0)
    }

    private fun resolveAppCategory(sourceApp: String): String {
        val normalized = sourceApp.lowercase(Locale.ROOT)
        val mapped = config.appCategories.entries
            .firstOrNull { normalized.contains(it.key) }
            ?.value
        if (!mapped.isNullOrBlank()) return mapped

        return when {
            normalized.contains("wechat") || normalized.contains("weixin") || normalized.contains("qq") -> "social"
            normalized.contains("mail") || normalized.contains("gmail") -> "communication"
            normalized.contains("browser") || normalized.contains("chrome") -> "browser"
            normalized.contains("bank") || normalized.contains("wallet") || normalized.contains("pay") -> "finance"
            else -> "general"
        }
    }

    private fun boolWeight(hit: Boolean, weight: Double): Double {
        return if (hit) weight else 0.0
    }

    private fun loadConfig(): Config {
        val override = configOverride?.trim()
        if (!override.isNullOrEmpty()) {
            return runCatching { parseConfig(override) }.getOrDefault(DEFAULT_CONFIG)
        }
        val appContext = context
        if (appContext == null) {
            return DEFAULT_CONFIG
        }
        return runCatching {
            appContext.assets.open(CONFIG_FILE).bufferedReader().use { reader ->
                parseConfig(reader.readText())
            }
        }.getOrElse {
            DEFAULT_CONFIG
        }
    }

    private fun parseConfig(raw: String): Config {
        val root = JSONObject(raw)
        val weightsObj = root.optJSONObject("weights") ?: JSONObject()
        val setsObj = root.optJSONObject("keyword_sets") ?: JSONObject()
        val appCategoryObj = root.optJSONObject("app_categories") ?: JSONObject()

        val appCategories = mutableMapOf<String, String>()
        appCategoryObj.keys().forEach { key ->
            appCategories[key.lowercase(Locale.ROOT)] = appCategoryObj.optString(key, "general")
        }

        return Config(
            modelName = root.optString("model_name", DEFAULT_CONFIG.modelName),
            cloudHandoffThreshold = root.optDouble("cloud_handoff_threshold", DEFAULT_CONFIG.cloudHandoffThreshold),
            highRiskHandoffThreshold = root.optDouble("high_risk_handoff_threshold", DEFAULT_CONFIG.highRiskHandoffThreshold),
            weights = Weights(
                bias = weightsObj.optDouble("bias", DEFAULT_CONFIG.weights.bias),
                realtimeKeyword = weightsObj.optDouble("realtime_keyword", DEFAULT_CONFIG.weights.realtimeKeyword),
                complexKeyword = weightsObj.optDouble("complex_keyword", DEFAULT_CONFIG.weights.complexKeyword),
                highRiskKeyword = weightsObj.optDouble("high_risk_keyword", DEFAULT_CONFIG.weights.highRiskKeyword),
                longQuery = weightsObj.optDouble("long_query", DEFAULT_CONFIG.weights.longQuery),
                questionForm = weightsObj.optDouble("question_form", DEFAULT_CONFIG.weights.questionForm),
                emotionNegative = weightsObj.optDouble("emotion_negative", DEFAULT_CONFIG.weights.emotionNegative),
                emotionPositive = weightsObj.optDouble("emotion_positive", DEFAULT_CONFIG.weights.emotionPositive),
                stressProxy = weightsObj.optDouble("stress_proxy", DEFAULT_CONFIG.weights.stressProxy)
            ),
            keywordSets = KeywordSets(
                realtime = readStringArray(setsObj, "realtime", DEFAULT_CONFIG.keywordSets.realtime),
                complex = readStringArray(setsObj, "complex", DEFAULT_CONFIG.keywordSets.complex),
                highRisk = readStringArray(setsObj, "high_risk", DEFAULT_CONFIG.keywordSets.highRisk),
                emotionNegative = readStringArray(setsObj, "emotion_negative", DEFAULT_CONFIG.keywordSets.emotionNegative),
                emotionPositive = readStringArray(setsObj, "emotion_positive", DEFAULT_CONFIG.keywordSets.emotionPositive)
            ),
            appCategories = appCategories
        )
    }

    private fun readStringArray(obj: JSONObject, key: String, fallback: List<String>): List<String> {
        val arr = obj.optJSONArray(key) ?: return fallback
        val values = mutableListOf<String>()
        for (i in 0 until arr.length()) {
            val value = arr.optString(i).trim().lowercase(Locale.ROOT)
            if (value.isNotBlank()) values += value
        }
        return if (values.isEmpty()) fallback else values
    }

    private data class Config(
        val modelName: String,
        val cloudHandoffThreshold: Double,
        val highRiskHandoffThreshold: Double,
        val weights: Weights,
        val keywordSets: KeywordSets,
        val appCategories: Map<String, String>
    )

    private data class Weights(
        val bias: Double,
        val realtimeKeyword: Double,
        val complexKeyword: Double,
        val highRiskKeyword: Double,
        val longQuery: Double,
        val questionForm: Double,
        val emotionNegative: Double,
        val emotionPositive: Double,
        val stressProxy: Double
    )

    private data class KeywordSets(
        val realtime: List<String>,
        val complex: List<String>,
        val highRisk: List<String>,
        val emotionNegative: List<String>,
        val emotionPositive: List<String>
    )

    companion object {
        private const val CONFIG_FILE = "triage_weights.json"

        private val DEFAULT_CONFIG = Config(
            modelName = "lumi-lite-triage-v1",
            cloudHandoffThreshold = 0.58,
            highRiskHandoffThreshold = 0.72,
            weights = Weights(
                bias = 0.08,
                realtimeKeyword = 0.22,
                complexKeyword = 0.2,
                highRiskKeyword = 0.36,
                longQuery = 0.08,
                questionForm = 0.04,
                emotionNegative = 0.12,
                emotionPositive = -0.04,
                stressProxy = 0.24
            ),
            keywordSets = KeywordSets(
                realtime = listOf(
                    "realtime", "Newest", "today", "weather", "flight", "flight", "hotel", "price", "market",
                    "news", "latest", "today", "flight", "hotel", "price", "market"
                ),
                complex = listOf(
                    "parallel", "collaboration", "multi-agent", "multiple plans", "task breakdown", "workflow", "multi-agent", "agent marketplace"
                ),
                highRisk = listOf(
                    "payment", "transfer", "authorization", "legal", "contract", "medical", "investment", "stocks", "finance", "bank"
                ),
                emotionNegative = listOf("annoyed", "tired", "anxious", "angry", "overwhelmed", "stress", "angry", "tired"),
                emotionPositive = listOf("happy", "relaxed", "satisfied", "glad", "calm", "great")
            ),
            appCategories = mapOf(
                "com.tencent.mm" to "social",
                "com.android.mms" to "communication",
                "com.android.chrome" to "browser"
            )
        )
    }
}
