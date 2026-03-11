package com.lumi.keyboard.state

import android.content.Context
import com.lumi.coreagent.orchestrator.IntentType
import com.lumi.coreagent.soul.HeuristicOnDeviceTwinModel
import com.lumi.coreagent.soul.OnDeviceTwinModel
import com.lumi.coreagent.soul.TwinModelInference
import com.lumi.coredomain.contract.InteractionEvent

internal enum class EdgeTwinModelMode(val wireValue: String) {
    HEURISTIC("heuristic"),
    HYBRID("hybrid"),
    MODEL("model"),
    DISABLED("disabled");

    companion object {
        fun fromRaw(raw: String?): EdgeTwinModelMode {
            return when (raw?.trim()?.lowercase()) {
                "heuristic" -> HEURISTIC
                "hybrid" -> HYBRID
                "model" -> MODEL
                "disabled", "off" -> DISABLED
                else -> HEURISTIC
            }
        }
    }
}

internal data class EdgeTwinModelConfig(
    val mode: EdgeTwinModelMode,
    val modelVersion: String,
    val ruleFallbackEnabled: Boolean
)

internal data class EdgeTwinModelDescriptor(
    val model: OnDeviceTwinModel,
    val config: EdgeTwinModelConfig
)

internal interface EdgeTwinInferenceRuntime {
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

private class NoOpEdgeTwinInferenceRuntime : EdgeTwinInferenceRuntime {
    override fun inferOnRequest(
        userId: String,
        intent: IntentType,
        locale: String,
        currentTraits: Map<String, Double>
    ): TwinModelInference? = null

    override fun inferOnEvent(
        event: InteractionEvent,
        currentTraits: Map<String, Double>
    ): TwinModelInference? = null
}

private class RuntimeBackedOnDeviceTwinModel(
    private val runtime: EdgeTwinInferenceRuntime
) : OnDeviceTwinModel {
    override fun inferOnRequest(
        userId: String,
        intent: IntentType,
        locale: String,
        currentTraits: Map<String, Double>
    ): TwinModelInference? {
        return runtime.inferOnRequest(userId, intent, locale, currentTraits)
    }

    override fun inferOnEvent(
        event: InteractionEvent,
        currentTraits: Map<String, Double>
    ): TwinModelInference? {
        return runtime.inferOnEvent(event, currentTraits)
    }
}

internal object EdgeTwinModelFactory {
    private const val DEFAULT_MODEL_VERSION = "twin-lite-heuristic-v1"

    fun create(modeRaw: String, versionRaw: String): EdgeTwinModelDescriptor {
        return createInternal(
            modeRaw = modeRaw,
            versionRaw = versionRaw,
            runtimeBuilder = { _, _ -> NoOpEdgeTwinInferenceRuntime() }
        )
    }

    fun create(context: Context, modeRaw: String, versionRaw: String): EdgeTwinModelDescriptor {
        return createInternal(
            modeRaw = modeRaw,
            versionRaw = versionRaw,
            runtimeBuilder = { _, modelVersion ->
                TFLiteTwinInferenceRuntime(
                    context = context,
                    modelVersion = modelVersion
                )
            }
        )
    }

    private fun createInternal(
        modeRaw: String,
        versionRaw: String,
        runtimeBuilder: (EdgeTwinModelMode, String) -> EdgeTwinInferenceRuntime
    ): EdgeTwinModelDescriptor {
        val mode = EdgeTwinModelMode.fromRaw(modeRaw)
        val modelVersion = versionRaw.takeIf { it.isNotBlank() } ?: DEFAULT_MODEL_VERSION

        return when (mode) {
            EdgeTwinModelMode.HEURISTIC -> EdgeTwinModelDescriptor(
                model = HeuristicOnDeviceTwinModel(modelName = modelVersion),
                config = EdgeTwinModelConfig(
                    mode = mode,
                    modelVersion = modelVersion,
                    ruleFallbackEnabled = true
                )
            )
            EdgeTwinModelMode.HYBRID,
            EdgeTwinModelMode.MODEL -> EdgeTwinModelDescriptor(
                model = RuntimeBackedOnDeviceTwinModel(runtime = runtimeBuilder(mode, modelVersion)),
                config = EdgeTwinModelConfig(
                    mode = mode,
                    modelVersion = modelVersion,
                    ruleFallbackEnabled = true
                )
            )
            EdgeTwinModelMode.DISABLED -> EdgeTwinModelDescriptor(
                model = RuntimeBackedOnDeviceTwinModel(runtime = NoOpEdgeTwinInferenceRuntime()),
                config = EdgeTwinModelConfig(
                    mode = mode,
                    modelVersion = "disabled",
                    ruleFallbackEnabled = false
                )
            )
        }
    }
}
