package com.lumi.keyboard.state

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EdgeTwinModelFactoryTest {

    @Test
    fun create_invalidMode_defaultsToHeuristic() {
        val descriptor = EdgeTwinModelFactory.create(modeRaw = "unknown", versionRaw = "")

        assertEquals(EdgeTwinModelMode.HEURISTIC, descriptor.config.mode)
        assertEquals("twin-lite-heuristic-v1", descriptor.config.modelVersion)
        assertTrue(descriptor.config.ruleFallbackEnabled)
    }

    @Test
    fun create_disabledMode_turnsOffRuleFallback() {
        val descriptor = EdgeTwinModelFactory.create(modeRaw = "disabled", versionRaw = "any")

        assertEquals(EdgeTwinModelMode.DISABLED, descriptor.config.mode)
        assertEquals("disabled", descriptor.config.modelVersion)
        assertFalse(descriptor.config.ruleFallbackEnabled)
    }

    @Test
    fun create_heuristicMode_usesConfiguredVersion() {
        val descriptor = EdgeTwinModelFactory.create(
            modeRaw = "heuristic",
            versionRaw = "twin-lite-int8-v2"
        )

        assertEquals(EdgeTwinModelMode.HEURISTIC, descriptor.config.mode)
        assertEquals("twin-lite-int8-v2", descriptor.config.modelVersion)
        assertTrue(descriptor.config.ruleFallbackEnabled)
    }
}
