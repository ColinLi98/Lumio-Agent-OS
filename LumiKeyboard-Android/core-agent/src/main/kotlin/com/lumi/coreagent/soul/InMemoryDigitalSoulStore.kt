package com.lumi.coreagent.soul

import com.lumi.coreagent.orchestrator.IntentType
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.TraitScore
import com.lumi.coredomain.contract.TwinContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class InMemoryDigitalSoulStore(
    private val nowMs: () -> Long = { System.currentTimeMillis() },
    private val onDeviceTwinModel: OnDeviceTwinModel = HeuristicOnDeviceTwinModel(),
    private val ruleFallbackEnabled: Boolean = true
) : DigitalSoulStore {

    private data class SoulState(
        val traits: MutableMap<String, Double> = mutableMapOf(),
        var updatedAt: Long = 0L,
        var profileLabel: String = "Balanced Operator",
        var lastDecayAt: Long = 0L
    )

    private val states: ConcurrentHashMap<String, SoulState> = ConcurrentHashMap()

    /**
     * EMA alpha for passive learning (PRD: new = old * (1-α) + signal * α).
     */
    private val emaAlpha = 0.1

    /**
     * Time decay factor per day (PRD: short-term states decay toward baseline).
     * Trait decays by this factor each 24-hour period.
     */
    private val decayFactorPerDay = 0.9

    /**
     * Maximum trait value ceiling.
     */
    private val traitCeiling = 10.0

    override fun onRequest(userId: String, intent: IntentType, locale: String) {
        val state = states.getOrPut(userId) { SoulState() }
        applyTimeDecay(state)
        val modelSignals = runCatching {
            onDeviceTwinModel.inferOnRequest(
                userId = userId,
                intent = intent,
                locale = locale,
                currentTraits = state.traits.toMap()
            )?.traitSignals.orEmpty()
        }.getOrDefault(emptyMap())
        val signals = when {
            modelSignals.isNotEmpty() -> modelSignals
            ruleFallbackEnabled -> SoulSignalRules.requestSignals(intent, locale)
            else -> emptyMap()
        }
        applySignals(state, signals)
        updateLabel(state)
    }

    override fun onEvent(event: InteractionEvent) {
        val state = states.getOrPut(event.userId) { SoulState() }
        applyTimeDecay(state)
        val modelSignals = runCatching {
            onDeviceTwinModel.inferOnEvent(
                event = event,
                currentTraits = state.traits.toMap()
            )?.traitSignals.orEmpty()
        }.getOrDefault(emptyMap())
        val signals = when {
            modelSignals.isNotEmpty() -> modelSignals
            ruleFallbackEnabled -> SoulSignalRules.eventSignals(event)
            else -> emptyMap()
        }
        applySignals(state, signals)
        updateLabel(state)
    }

    override fun summary(userId: String): DigitalSoulSummary {
        val state = states[userId] ?: SoulState(updatedAt = nowMs())
        applyTimeDecay(state)
        val traits = state.traits.entries
            .sortedByDescending { it.value }
            .take(6)
            .map { TraitScore(key = it.key, value = it.value) }

        return DigitalSoulSummary(
            userId = userId,
            profileLabel = state.profileLabel,
            topTraits = traits,
            updatedAtMs = state.updatedAt,
            localOnly = true,
            cloudSyncEnabled = false
        )
    }

    override fun toTwinContext(userId: String, locale: String): TwinContext {
        val summary = summary(userId)
        return TwinContext(
            userId = userId,
            locale = locale,
            topTraits = summary.topTraits
        )
    }

    /**
     * EMA update: new = old * (1 - α) + signal * α
     * This creates a smoothed, recency-weighted trait value that
     * doesn't grow unboundedly.
     */
    private fun emaUpdate(state: SoulState, key: String, signal: Double) {
        val current = state.traits[key] ?: 0.0
        state.traits[key] = (current * (1 - emaAlpha) + signal * emaAlpha)
            .coerceAtMost(traitCeiling)
        state.updatedAt = nowMs()
    }

    private fun applySignals(state: SoulState, signals: Map<String, Double>) {
        signals.forEach { (key, signal) ->
            emaUpdate(state, key, signal)
        }
    }

    /**
     * Time-based decay: traits decay toward 0 exponentially over time.
     * PRD: short-term states should decay toward baseline.
     * Applied at most once per hour to avoid excessive computation.
     */
    private fun applyTimeDecay(state: SoulState) {
        val now = nowMs()
        val elapsed = now - state.lastDecayAt
        val minDecayInterval = TimeUnit.HOURS.toMillis(1)

        if (elapsed < minDecayInterval || state.lastDecayAt == 0L) {
            if (state.lastDecayAt == 0L) state.lastDecayAt = now
            return
        }

        val daysFraction = elapsed.toDouble() / TimeUnit.DAYS.toMillis(1)
        val decayFactor = Math.pow(decayFactorPerDay, daysFraction)

        for ((key, value) in state.traits) {
            state.traits[key] = value * decayFactor
        }
        state.lastDecayAt = now
    }

    private fun updateLabel(state: SoulState) {
        val top = state.traits.maxByOrNull { it.value }?.key.orEmpty()
        state.profileLabel = when {
            top.startsWith("negotiation") -> "Strategic Negotiator"
            top.startsWith("orchestration") -> "Agent Orchestrator"
            top.startsWith("strategy") -> "Long-horizon Planner"
            top.startsWith("exploration") -> "Adaptive Explorer"
            top.startsWith("consumer_behavior") -> "Smart Consumer"
            top.startsWith("planning") -> "Organized Planner"
            top.startsWith("privacy_awareness") -> "Privacy Guardian"
            else -> "Balanced Operator"
        }
    }

    // ========================================================================
    // Cold-Start Questionnaire (PRD: max 3 questions, 30 seconds)
    // ========================================================================

    override fun needsColdStart(userId: String): Boolean {
        return !states.containsKey(userId) || states[userId]?.traits.isNullOrEmpty()
    }

    override fun bootstrap(userId: String, answers: ColdStartAnswer) {
        val state = states.getOrPut(userId) { SoulState() }

        // Map communication style → trait seeds
        when (answers.communicationStyle.lowercase()) {
            "professional" -> {
                emaUpdate(state, "communication", 0.7)
                emaUpdate(state, "precision", 0.6)
            }
            "friendly" -> {
                emaUpdate(state, "communication", 0.8)
                emaUpdate(state, "exploration", 0.5)
            }
            "concise" -> {
                emaUpdate(state, "communication", 0.5)
                emaUpdate(state, "execution", 0.7)
            }
            "humorous" -> {
                emaUpdate(state, "communication", 0.9)
                emaUpdate(state, "exploration", 0.6)
            }
            else -> emaUpdate(state, "communication", 0.5)
        }

        // Map risk tolerance → trait seeds
        when (answers.riskTolerance.lowercase()) {
            "conservative" -> {
                emaUpdate(state, "risk_avoidance", 0.7)
                emaUpdate(state, "strategy", 0.5)
            }
            "aggressive" -> {
                emaUpdate(state, "negotiation", 0.6)
                emaUpdate(state, "deep_task", 0.5)
            }
            else -> {
                emaUpdate(state, "strategy", 0.4)
                emaUpdate(state, "negotiation", 0.3)
            }
        }

        // Map privacy level → trait seeds
        when (answers.privacyLevel.lowercase()) {
            "strict" -> emaUpdate(state, "privacy_awareness", 0.8)
            "open" -> emaUpdate(state, "context_freshness", 0.6)
            else -> emaUpdate(state, "privacy_awareness", 0.4)
        }

        state.lastDecayAt = nowMs()
        updateLabel(state)
    }

    // ========================================================================
    // Persistence (serialize/deserialize for Room AvatarTraitDao)
    // ========================================================================

    /**
     * Export traits as a list of key-value pairs for Room persistence.
     */
    fun exportTraits(userId: String): List<Pair<String, Double>> {
        val state = states[userId] ?: return emptyList()
        return state.traits.entries.map { it.key to it.value }
    }

    /**
     * Import traits from Room persistence (called on app start).
     */
    fun importTraits(userId: String, traits: List<Pair<String, Double>>, label: String) {
        val state = states.getOrPut(userId) { SoulState() }
        traits.forEach { (key, value) ->
            state.traits[key] = value
        }
        state.profileLabel = label
        state.updatedAt = nowMs()
        state.lastDecayAt = nowMs()
    }
}
