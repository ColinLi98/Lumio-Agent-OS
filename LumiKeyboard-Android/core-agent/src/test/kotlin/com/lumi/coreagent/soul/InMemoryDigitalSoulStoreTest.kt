package com.lumi.coreagent.soul

import com.lumi.coreagent.orchestrator.IntentType
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.InteractionEventType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class InMemoryDigitalSoulStoreTest {

    private val store = InMemoryDigitalSoulStore(nowMs = { 100L })

    @Test
    fun summary_reflectsRequestAndEvent() {
        store.onRequest("u1", IntentType.LIX, "zh-CN")
        store.onEvent(
            InteractionEvent(
                sessionId = "s1",
                userId = "u1",
                eventType = InteractionEventType.DRAFT_ACCEPT,
                timestampMs = 101L
            )
        )

        val summary = store.summary("u1")
        assertEquals("u1", summary.userId)
        assertTrue(summary.topTraits.isNotEmpty())
        assertTrue(summary.updatedAtMs >= 100L)
    }

    @Test
    fun toTwinContext_usesTopTraits() {
        store.onRequest("u2", IntentType.TRAVEL, "en-US")
        val ctx = store.toTwinContext("u2", "en-US")

        assertEquals("u2", ctx.userId)
        assertEquals("en-US", ctx.locale)
        assertTrue(ctx.topTraits.isNotEmpty())
    }

    @Test
    fun customOnDeviceModel_signalsAreApplied() {
        val customModel = object : OnDeviceTwinModel {
            override fun inferOnRequest(
                userId: String,
                intent: IntentType,
                locale: String,
                currentTraits: Map<String, Double>
            ): TwinModelInference {
                return TwinModelInference(
                    traitSignals = mapOf("model_only_trait" to 0.9),
                    confidence = 0.9,
                    modelName = "test-model"
                )
            }

            override fun inferOnEvent(
                event: InteractionEvent,
                currentTraits: Map<String, Double>
            ): TwinModelInference? = null
        }
        val modelStore = InMemoryDigitalSoulStore(
            nowMs = { 100L },
            onDeviceTwinModel = customModel
        )

        modelStore.onRequest("u3", IntentType.GENERAL, "en-US")
        val traits = modelStore.exportTraits("u3").toMap()
        assertTrue(traits.containsKey("model_only_trait"))
        assertTrue(traits["model_only_trait"] ?: 0.0 > 0.0)
    }

    @Test
    fun fallbackDisabled_andModelReturnsNull_noSignalsApplied() {
        val noOpModel = object : OnDeviceTwinModel {
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
        val modelStore = InMemoryDigitalSoulStore(
            nowMs = { 100L },
            onDeviceTwinModel = noOpModel,
            ruleFallbackEnabled = false
        )

        modelStore.onRequest("u4", IntentType.TRAVEL, "en-US")
        modelStore.onEvent(
            InteractionEvent(
                sessionId = "s4",
                userId = "u4",
                eventType = InteractionEventType.DRAFT_ACCEPT,
                timestampMs = 101L
            )
        )

        val traits = modelStore.exportTraits("u4")
        assertTrue(traits.isEmpty())
    }
}
