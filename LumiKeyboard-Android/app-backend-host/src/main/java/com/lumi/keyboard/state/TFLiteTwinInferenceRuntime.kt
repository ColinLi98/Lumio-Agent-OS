package com.lumi.keyboard.state

import android.content.Context
import android.util.Log
import com.lumi.coreagent.orchestrator.IntentType
import com.lumi.coreagent.soul.TwinModelInference
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.InteractionEventType
import org.tensorflow.lite.Interpreter
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

internal class TFLiteTwinInferenceRuntime(
    private val context: Context,
    private val modelVersion: String
) : EdgeTwinInferenceRuntime {

    private val interpreter: Interpreter? by lazy {
        loadInterpreter(resolveAssetPath(modelVersion))
    }

    override fun inferOnRequest(
        userId: String,
        intent: IntentType,
        locale: String,
        currentTraits: Map<String, Double>
    ): TwinModelInference? {
        val activeInterpreter = interpreter ?: return null
        return runCatching {
            val inputSize = inputSizeOf(activeInterpreter)
            val outputSize = outputSizeOf(activeInterpreter)
            if (inputSize <= 0 || outputSize <= 0) return null

            val input = Array(1) { encodeRequestFeatures(inputSize, intent, locale, currentTraits) }
            val output = Array(1) { FloatArray(outputSize) }
            activeInterpreter.run(input, output)

            val signals = mapOutputs(output[0], currentTraits)
            if (signals.isEmpty()) return null

            TwinModelInference(
                traitSignals = signals,
                confidence = confidenceOf(signals),
                reasonCodes = listOf("edge_tflite_request", intent.name.lowercase()),
                modelName = modelVersion
            )
        }.getOrElse {
            Log.w(TAG, "request inference failed: ${it.message}")
            null
        }
    }

    override fun inferOnEvent(
        event: InteractionEvent,
        currentTraits: Map<String, Double>
    ): TwinModelInference? {
        val activeInterpreter = interpreter ?: return null
        return runCatching {
            val inputSize = inputSizeOf(activeInterpreter)
            val outputSize = outputSizeOf(activeInterpreter)
            if (inputSize <= 0 || outputSize <= 0) return null

            val input = Array(1) { encodeEventFeatures(inputSize, event, currentTraits) }
            val output = Array(1) { FloatArray(outputSize) }
            activeInterpreter.run(input, output)

            val signals = mapOutputs(output[0], currentTraits)
            if (signals.isEmpty()) return null

            TwinModelInference(
                traitSignals = signals,
                confidence = confidenceOf(signals),
                reasonCodes = listOf("edge_tflite_event", event.eventType.name.lowercase()),
                modelName = modelVersion
            )
        }.getOrElse {
            Log.w(TAG, "event inference failed: ${it.message}")
            null
        }
    }

    private fun loadInterpreter(assetPath: String): Interpreter? {
        return runCatching {
            val raw = context.assets.open(assetPath).use { it.readBytes() }
            val modelBuffer = ByteBuffer.allocateDirect(raw.size).order(ByteOrder.nativeOrder())
            modelBuffer.put(raw)
            modelBuffer.rewind()
            Interpreter(
                modelBuffer,
                Interpreter.Options().apply {
                    setNumThreads(2)
                    setUseNNAPI(false)
                }
            )
        }.onFailure {
            Log.w(TAG, "tflite model unavailable: asset=$assetPath version=$modelVersion msg=${it.message}")
        }.getOrNull()
    }

    private fun resolveAssetPath(version: String): String {
        val normalized = version.trim().ifBlank { DEFAULT_VERSION }
        return if (normalized.contains("/")) {
            if (normalized.endsWith(".tflite")) normalized else "$normalized.tflite"
        } else {
            val file = if (normalized.endsWith(".tflite")) normalized else "$normalized.tflite"
            "models/$file"
        }
    }

    private fun inputSizeOf(interpreter: Interpreter): Int {
        val shape = interpreter.getInputTensor(0).shape()
        return shape.lastOrNull()?.coerceAtLeast(0) ?: 0
    }

    private fun outputSizeOf(interpreter: Interpreter): Int {
        val shape = interpreter.getOutputTensor(0).shape()
        return shape.lastOrNull()?.coerceAtLeast(0) ?: 0
    }

    private fun encodeRequestFeatures(
        inputSize: Int,
        intent: IntentType,
        locale: String,
        currentTraits: Map<String, Double>
    ): FloatArray {
        val values = FloatArray(inputSize)
        var idx = 0
        fun push(v: Float) {
            if (idx < values.size) {
                values[idx] = v
                idx += 1
            }
        }

        INTENT_ORDER.forEach { push(if (it == intent) 1f else 0f) }
        push(localeHash01(locale))
        push(locale.length.coerceAtMost(32) / 32f)
        push(normalize01(currentTraits.size.toDouble(), 0.0, 40.0))
        push(normalize01(currentTraits.values.maxOrNull() ?: 0.0, 0.0, 1.0))
        push(normalize01(currentTraits.values.average().takeIf { !it.isNaN() } ?: 0.0, 0.0, 1.0))

        TRAIT_ORDER.forEach { key ->
            push((currentTraits[key] ?: 0.0).coerceIn(0.0, 1.0).toFloat())
        }

        while (idx < values.size) {
            push(0f)
        }
        return values
    }

    private fun encodeEventFeatures(
        inputSize: Int,
        event: InteractionEvent,
        currentTraits: Map<String, Double>
    ): FloatArray {
        val values = FloatArray(inputSize)
        var idx = 0
        fun push(v: Float) {
            if (idx < values.size) {
                values[idx] = v
                idx += 1
            }
        }

        EVENT_ORDER.forEach { push(if (it == event.eventType) 1f else 0f) }
        push(normalize01(currentTraits.size.toDouble(), 0.0, 40.0))
        push(normalize01(currentTraits.values.maxOrNull() ?: 0.0, 0.0, 1.0))
        push(normalize01(currentTraits.values.average().takeIf { !it.isNaN() } ?: 0.0, 0.0, 1.0))

        val stress = event.payload["stress"]?.toFloatOrNull() ?: 0f
        val focus = event.payload["focus"]?.toFloatOrNull() ?: 50f
        push((stress / 100f).coerceIn(0f, 1f))
        push((focus / 100f).coerceIn(0f, 1f))
        push(normalize01(event.payload.size.toDouble(), 0.0, 20.0))
        push(normalize01(abs(event.timestampMs % 100000).toDouble(), 0.0, 100000.0))

        TRAIT_ORDER.forEach { key ->
            push((currentTraits[key] ?: 0.0).coerceIn(0.0, 1.0).toFloat())
        }

        while (idx < values.size) {
            push(0f)
        }
        return values
    }

    private fun mapOutputs(
        logits: FloatArray,
        currentTraits: Map<String, Double>
    ): Map<String, Double> {
        if (logits.isEmpty()) return emptyMap()
        val size = min(logits.size, TRAIT_ORDER.size)
        val result = linkedMapOf<String, Double>()
        for (i in 0 until size) {
            val key = TRAIT_ORDER[i]
            val baseline = (currentTraits[key] ?: 0.0).coerceIn(0.0, 1.0)
            val score = sigmoid(logits[i].toDouble())
            // Blend with current baseline to avoid abrupt jumps from noisy logits.
            val signal = (score * 0.7 + baseline * 0.3).coerceIn(0.0, 1.0)
            if (signal >= OUTPUT_THRESHOLD) {
                result[key] = signal
            }
        }
        return result
    }

    private fun confidenceOf(signals: Map<String, Double>): Double {
        if (signals.isEmpty()) return 0.0
        val mean = signals.values.average()
        val peak = signals.values.maxOrNull() ?: 0.0
        return ((mean * 0.7) + (peak * 0.3)).coerceIn(0.0, 1.0)
    }

    private fun localeHash01(locale: String): Float {
        val raw = locale.lowercase().hashCode()
        val folded = (raw and 0x7fffffff) % 1000
        return folded / 1000f
    }

    private fun normalize01(value: Double, minValue: Double, maxValue: Double): Float {
        val denominator = max(1e-6, maxValue - minValue)
        return ((value - minValue) / denominator).coerceIn(0.0, 1.0).toFloat()
    }

    private fun sigmoid(value: Double): Double = 1.0 / (1.0 + exp(-value))

    companion object {
        private const val TAG = "TFLiteTwinRuntime"
        private const val OUTPUT_THRESHOLD = 0.15
        private const val DEFAULT_VERSION = "twin-lite-heuristic-v1"

        private val INTENT_ORDER = listOf(
            IntentType.CHAT_REWRITE,
            IntentType.SHOPPING,
            IntentType.TRAVEL,
            IntentType.CALENDAR,
            IntentType.PRIVACY_MASK,
            IntentType.LIX,
            IntentType.AGENT_MARKET,
            IntentType.AVATAR,
            IntentType.DESTINY,
            IntentType.SETTINGS,
            IntentType.GENERAL
        )

        private val EVENT_ORDER = listOf(
            InteractionEventType.DRAFT_ACCEPT,
            InteractionEventType.DRAFT_EDIT,
            InteractionEventType.CARD_CLICK,
            InteractionEventType.QUERY_REFINE,
            InteractionEventType.GOAL_SUBMITTED,
            InteractionEventType.CLARIFICATION_ANSWERED,
            InteractionEventType.GATE_BLOCK_VIEWED,
            InteractionEventType.NEXT_ACTION_CLICKED,
            InteractionEventType.FALLBACK_PLAN_ACCEPTED,
            InteractionEventType.CONFIRM_SEND,
            InteractionEventType.AGENT_MODE_ENTER,
            InteractionEventType.AGENT_MODE_EXIT,
            InteractionEventType.PRIVACY_ACTION_CONFIRM,
            InteractionEventType.TASK_CONFIRM,
            InteractionEventType.TASK_CANCEL,
            InteractionEventType.KEYSTROKE_WINDOW,
            InteractionEventType.STATE_ADJUST,
            InteractionEventType.EXTERNAL_SIGNAL_INGEST
        )

        private val TRAIT_ORDER = listOf(
            "communication",
            "consumer_behavior",
            "exploration",
            "planning",
            "privacy_awareness",
            "negotiation",
            "orchestration",
            "self_modeling",
            "strategy",
            "system_management",
            "adoption",
            "precision",
            "deep_task",
            "iterative_reasoning",
            "execution",
            "agent_mode_usage",
            "task_commitment",
            "risk_avoidance",
            "emotion_stress",
            "focus_stability",
            "state_self_correction",
            "context_freshness"
        )
    }
}
