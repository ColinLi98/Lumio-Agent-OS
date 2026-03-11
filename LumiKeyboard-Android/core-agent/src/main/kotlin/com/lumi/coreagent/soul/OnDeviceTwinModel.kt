package com.lumi.coreagent.soul

import com.lumi.coreagent.orchestrator.IntentType
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.InteractionEventType

/**
 * Structured inference output for on-device digital-twin models.
 * `traitSignals` are consumed by the EMA updater in [InMemoryDigitalSoulStore].
 */
data class TwinModelInference(
    val traitSignals: Map<String, Double>,
    val confidence: Double,
    val reasonCodes: List<String> = emptyList(),
    val modelName: String
)

/**
 * Port for plugging a lightweight on-device model into the soul update pipeline.
 * Implementations should be fast and deterministic (mobile constraints).
 */
interface OnDeviceTwinModel {
    fun inferOnRequest(
        userId: String,
        intent: IntentType,
        locale: String,
        currentTraits: Map<String, Double>
    ): TwinModelInference?

    fun inferOnEvent(
        event: InteractionEvent,
        currentTraits: Map<String, Double>
    ): TwinModelInference?
}

/**
 * Baseline model implementation using deterministic rules.
 * This keeps current behavior stable while exposing the model interface.
 */
class HeuristicOnDeviceTwinModel(
    private val modelName: String = "twin-lite-heuristic-v1"
) : OnDeviceTwinModel {
    override fun inferOnRequest(
        userId: String,
        intent: IntentType,
        locale: String,
        currentTraits: Map<String, Double>
    ): TwinModelInference {
        val signals = SoulSignalRules.requestSignals(intent = intent, locale = locale)
        return TwinModelInference(
            traitSignals = signals,
            confidence = 0.62,
            reasonCodes = listOf("heuristic_request", intent.name.lowercase()),
            modelName = modelName
        )
    }

    override fun inferOnEvent(
        event: InteractionEvent,
        currentTraits: Map<String, Double>
    ): TwinModelInference {
        val signals = SoulSignalRules.eventSignals(event)
        return TwinModelInference(
            traitSignals = signals,
            confidence = if (event.eventType == InteractionEventType.KEYSTROKE_WINDOW) 0.56 else 0.6,
            reasonCodes = listOf("heuristic_event", event.eventType.name.lowercase()),
            modelName = modelName
        )
    }
}

/**
 * Shared deterministic signal rules used by both model and fallback path.
 */
internal object SoulSignalRules {
    fun requestSignals(intent: IntentType, locale: String): Map<String, Double> {
        val signals = mutableMapOf<String, Double>()
        when (intent) {
            IntentType.CHAT_REWRITE, IntentType.GENERAL -> signals["communication"] = 0.45
            IntentType.SHOPPING -> signals["consumer_behavior"] = 0.55
            IntentType.TRAVEL -> signals["exploration"] = 0.55
            IntentType.CALENDAR -> signals["planning"] = 0.50
            IntentType.PRIVACY_MASK -> signals["privacy_awareness"] = 0.60
            IntentType.LIX -> signals["negotiation"] = 0.65
            IntentType.AGENT_MARKET -> signals["orchestration"] = 0.62
            IntentType.AVATAR -> signals["self_modeling"] = 0.58
            IntentType.DESTINY -> signals["strategy"] = 0.60
            IntentType.SETTINGS -> signals["system_management"] = 0.50
        }
        signals["locale:$locale"] = 0.2
        return signals
    }

    fun eventSignals(event: InteractionEvent): Map<String, Double> {
        return when (event.eventType) {
            InteractionEventType.DRAFT_ACCEPT -> mapOf("adoption" to 0.5)
            InteractionEventType.DRAFT_EDIT -> mapOf("precision" to 0.45)
            InteractionEventType.CARD_CLICK -> mapOf("deep_task" to 0.55)
            InteractionEventType.QUERY_REFINE -> mapOf("iterative_reasoning" to 0.5)
            InteractionEventType.GOAL_SUBMITTED -> mapOf("planning" to 0.48, "execution" to 0.36)
            InteractionEventType.CLARIFICATION_ANSWERED -> mapOf("iterative_reasoning" to 0.46, "task_commitment" to 0.32)
            InteractionEventType.GATE_BLOCK_VIEWED -> mapOf("risk_avoidance" to 0.28, "planning" to 0.22)
            InteractionEventType.NEXT_ACTION_CLICKED -> mapOf("task_commitment" to 0.52, "execution" to 0.38)
            InteractionEventType.FALLBACK_PLAN_ACCEPTED -> mapOf("execution" to 0.5, "risk_avoidance" to 0.25)
            InteractionEventType.CONFIRM_SEND -> mapOf("execution" to 0.4)
            InteractionEventType.AGENT_MODE_ENTER -> mapOf("agent_mode_usage" to 0.35)
            InteractionEventType.AGENT_MODE_EXIT -> mapOf("agent_mode_usage" to 0.1)
            InteractionEventType.PRIVACY_ACTION_CONFIRM -> mapOf("privacy_awareness" to 0.5)
            InteractionEventType.TASK_CONFIRM -> mapOf("task_commitment" to 0.55)
            InteractionEventType.TASK_CANCEL -> mapOf("risk_avoidance" to 0.35)
            InteractionEventType.KEYSTROKE_WINDOW -> {
                val stress = event.payload["stress"]?.toDoubleOrNull() ?: 0.0
                val focus = event.payload["focus"]?.toDoubleOrNull() ?: 50.0
                mapOf(
                    "emotion_stress" to (stress / 100.0).coerceIn(0.0, 1.0) * 0.4,
                    "focus_stability" to (focus / 100.0).coerceIn(0.0, 1.0) * 0.4
                )
            }
            InteractionEventType.STATE_ADJUST -> mapOf("state_self_correction" to 0.45)
            InteractionEventType.EXTERNAL_SIGNAL_INGEST -> mapOf("context_freshness" to 0.35)
        }
    }
}
