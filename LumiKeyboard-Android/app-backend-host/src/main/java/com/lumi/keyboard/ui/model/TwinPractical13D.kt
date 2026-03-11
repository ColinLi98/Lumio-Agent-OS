package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import com.lumi.coredomain.contract.TwinPosteriorPayload
import kotlin.math.pow
import kotlin.math.sqrt

private const val DEFAULT_PARTICLE_COUNT = 500

data class TwinDimensionPosterior(
    val key: String,
    val label: String,
    val mean: Float,
    val p10: Float,
    val p90: Float,
    val source: String
)

data class TwinPracticalSnapshot(
    val dimensions: List<TwinDimensionPosterior>,
    val particleCount: Int,
    val confidence: Float,
    val updatedAtMs: Long,
    val trendSeries: List<Float>
)

fun buildTwinPracticalSnapshot(
    summary: DigitalSoulSummary?,
    state: DynamicHumanStatePayload?,
    trajectory: List<TrajectoryPointPayload>,
    cloudPosterior: TwinPosteriorPayload? = null,
    particleCount: Int = DEFAULT_PARTICLE_COUNT
): TwinPracticalSnapshot {
    val cloudDimensions = cloudPosterior?.dimensions.orEmpty()
    if (cloudDimensions.isNotEmpty()) {
        val cloudTrend = cloudPosterior?.trendSeries
            ?.map { it.coerceIn(0.0, 1.0).toFloat() }
            .orEmpty()
            .ifEmpty {
                trajectory.takeLast(24).map { it.value.coerceIn(0.0, 1.0).toFloat() }
            }
            .ifEmpty { listOf(0.46f, 0.49f, 0.51f, 0.53f, 0.56f) }

        return TwinPracticalSnapshot(
            dimensions = cloudDimensions.map { dimension ->
                TwinDimensionPosterior(
                    key = dimension.key.ifBlank { "unknown" },
                    label = dimension.label.ifBlank { dimension.key.ifBlank { "Dimension" } },
                    mean = dimension.mean.toFloat().coerceIn(0f, 1f),
                    p10 = dimension.p10.toFloat().coerceIn(0f, 1f),
                    p90 = dimension.p90.toFloat().coerceIn(0f, 1f),
                    source = dimension.source.ifBlank { "cloud" }
                )
            },
            particleCount = (cloudPosterior?.particleCount ?: particleCount).coerceAtLeast(1),
            confidence = cloudPosterior?.confidence?.toFloat()?.coerceIn(0f, 1f) ?: 0.5f,
            updatedAtMs = cloudPosterior?.updatedAtMs?.takeIf { it > 0L }
                ?: state?.updatedAtMs
                ?: summary?.updatedAtMs
                ?: System.currentTimeMillis(),
            trendSeries = cloudTrend
        )
    }

    val traits = summary?.topTraits.orEmpty().associate { it.key.lowercase() to normalizeTraitScore(it.value) }

    val risk = (state?.l1?.riskPreference ?: traitSignal(traits, "risk", "strategy", "decision")).coerceIn(0.0, 1.0)
    val energy = (state?.l2?.energyLevel ?: traitSignal(traits, "energy", "stamina", "execution")).coerceIn(0.0, 1.0)
    val contextLoad = (state?.l2?.contextLoad ?: 0.5).coerceIn(0.0, 1.0)
    val stress = ((state?.l3?.stressScore ?: ((1.0 - energy) * 100.0).toInt()) / 100.0).coerceIn(0.0, 1.0)
    val focus = ((state?.l3?.focusScore ?: ((1.0 - contextLoad) * 100.0).toInt()) / 100.0).coerceIn(0.0, 1.0)
    val affect = (((state?.l3?.polarity ?: (traitSignal(traits, "emotion", "mood", "positive") * 2.0 - 1.0)) + 1.0) / 2.0)
        .coerceIn(0.0, 1.0)

    val traitFinance = traitSignal(traits, "wealth", "finance", "budget", "consumer")
    val traitHealth = traitSignal(traits, "health", "wellbeing", "recovery")
    val traitSkill = traitSignal(traits, "skill", "reasoning", "execution", "insight")
    val traitSocial = traitSignal(traits, "social", "communication", "relationship", "adaptive")
    val traitCareer = traitSignal(traits, "career", "strategy", "negotiation", "orchestration")
    val traitTrust = traitSignal(traits, "trust", "reputation", "reliability", "precision")
    val traitPlanning = traitSignal(traits, "planning", "time", "schedule")
    val traitExploration = traitSignal(traits, "exploration", "option", "adaptive")
    val traitMeaning = traitSignal(traits, "meaning", "value", "purpose")

    val wealth = weighted(
        0.35 to traitFinance,
        0.20 to (1.0 - stress),
        0.20 to risk,
        0.15 to focus,
        0.10 to (1.0 - contextLoad)
    )
    val health = weighted(
        0.40 to energy,
        0.30 to (1.0 - stress),
        0.20 to affect,
        0.10 to traitHealth
    )
    val skill = weighted(
        0.45 to traitSkill,
        0.35 to focus,
        0.20 to (1.0 - contextLoad)
    )
    val social = weighted(
        0.45 to traitSocial,
        0.25 to affect,
        0.15 to (1.0 - stress),
        0.15 to focus
    )
    val career = weighted(
        0.30 to skill,
        0.25 to wealth,
        0.20 to focus,
        0.15 to traitCareer,
        0.10 to (1.0 - stress)
    )
    val reputation = weighted(
        0.45 to traitTrust,
        0.25 to social,
        0.15 to skill,
        0.15 to (1.0 - stress)
    )
    val timeBuffer = weighted(
        0.55 to (1.0 - contextLoad),
        0.20 to focus,
        0.15 to energy,
        0.10 to traitPlanning
    )
    val optionality = weighted(
        0.35 to traitExploration,
        0.20 to (1.0 - stress),
        0.20 to timeBuffer,
        0.15 to wealth,
        0.10 to risk
    )
    val meaning = weighted(
        0.45 to traitMeaning,
        0.20 to focus,
        0.20 to social,
        0.15 to skill
    )
    val lifeSatisfaction = weighted(
        0.30 to health,
        0.20 to wealth,
        0.20 to social,
        0.15 to affect,
        0.15 to meaning
    )

    val trendSeries = trajectory
        .takeLast(24)
        .map { it.value.coerceIn(0.0, 1.0).toFloat() }
        .ifEmpty { listOf(0.46f, 0.49f, 0.51f, 0.53f, 0.56f) }

    val stateCoverage = if (state != null) 1.0 else 0.0
    val traitCoverage = (summary?.topTraits?.size ?: 0).coerceAtMost(8) / 8.0
    val trajectoryCoverage = (trajectory.size.coerceAtMost(14) / 14.0)
    val observedConfidence = weighted(
        0.45 to stateCoverage,
        0.35 to traitCoverage,
        0.20 to trajectoryCoverage
    )
    val confidence = (0.20 + observedConfidence * 0.80).coerceIn(0.0, 1.0).toFloat()

    val volatility = computeStdDev(trendSeries.map { it.toDouble() }).coerceIn(0.0, 0.35)
    val baseSpread = (0.22 - confidence * 0.12 + volatility * 0.18).coerceIn(0.06, 0.28)

    val dimensions = listOf(
        Triple("wealth", "Wealth", wealth),
        Triple("health", "Health", health),
        Triple("skill", "Skill", skill),
        Triple("energy", "Energy", energy),
        Triple("social", "Social", social),
        Triple("career", "Career", career),
        Triple("reputation", "Reputation", reputation),
        Triple("time_buffer", "Time Buffer", timeBuffer),
        Triple("stress", "Stress", stress),
        Triple("optionality", "Optionality", optionality),
        Triple("life_satisfaction", "Life Satisfaction", lifeSatisfaction),
        Triple("affect_balance", "Affect Balance", affect),
        Triple("meaning_score", "Meaning Score", meaning)
    ).map { (key, label, value) ->
        val spread = when (key) {
            "stress", "affect_balance" -> (baseSpread + 0.03).coerceAtMost(0.30)
            "wealth", "career", "reputation" -> (baseSpread + 0.02).coerceAtMost(0.30)
            else -> baseSpread
        }
        TwinDimensionPosterior(
            key = key,
            label = label,
            mean = value.toFloat(),
            p10 = (value - spread).coerceIn(0.0, 1.0).toFloat(),
            p90 = (value + spread).coerceIn(0.0, 1.0).toFloat(),
            source = sourceLabelFor(key, state != null, traits.isNotEmpty())
        )
    }

    val updatedAt = state?.updatedAtMs
        ?: summary?.updatedAtMs
        ?: System.currentTimeMillis()

    return TwinPracticalSnapshot(
        dimensions = dimensions,
        particleCount = particleCount,
        confidence = confidence,
        updatedAtMs = updatedAt,
        trendSeries = trendSeries
    )
}

private fun sourceLabelFor(key: String, hasState: Boolean, hasTraits: Boolean): String {
    return when {
        hasState && key in setOf("energy", "stress", "affect_balance", "time_buffer") -> "state"
        hasState && hasTraits -> "state+trait"
        hasTraits -> "trait"
        else -> "prior"
    }
}

private fun traitSignal(
    traits: Map<String, Double>,
    vararg keywords: String
): Double {
    return traits.entries
        .filter { entry -> keywords.any { keyword -> entry.key.contains(keyword) } }
        .maxOfOrNull { it.value }
        ?: 0.5
}

private fun normalizeTraitScore(raw: Double): Double {
    return when {
        raw.isNaN() || raw.isInfinite() -> 0.5
        raw <= 1.0 -> raw.coerceIn(0.0, 1.0)
        raw <= 10.0 -> (raw / 10.0).coerceIn(0.0, 1.0)
        else -> 1.0
    }
}

private fun weighted(vararg parts: Pair<Double, Double>): Double {
    val weightedSum = parts.sumOf { it.first * it.second }
    val weightTotal = parts.sumOf { it.first }.takeIf { it > 0 } ?: 1.0
    return (weightedSum / weightTotal).coerceIn(0.0, 1.0)
}

private fun computeStdDev(values: List<Double>): Double {
    if (values.isEmpty()) return 0.0
    val mean = values.average()
    val variance = values.sumOf { (it - mean).pow(2) } / values.size
    return sqrt(variance)
}
