package com.lumi.keyboard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class KeystrokeDynamicsCollectorTest {

    @Test
    fun snapshot_reportsCountsAndStressProxy() {
        val collector = KeystrokeDynamicsCollector(windowMs = 10_000)
        val base = 1_000_000L
        collector.recordKey("a", base)
        collector.recordKey("b", base + 90)
        collector.recordKey("DELETE", base + 170)
        collector.recordKey("c", base + 260)

        val snapshot = collector.snapshot(base + 260)

        assertEquals(4, snapshot.keyCount)
        assertEquals(1, snapshot.backspaceCount)
        assertTrue(snapshot.avgInterKeyDelayMs > 0)
        assertTrue(snapshot.stressProxy in 0.0..1.0)
    }

    @Test
    fun reset_clearsWindow() {
        val collector = KeystrokeDynamicsCollector(windowMs = 5_000)
        collector.recordKey("a", 1000)
        collector.reset()

        val snapshot = collector.snapshot(1200)
        assertEquals(0, snapshot.keyCount)
        assertEquals(0, snapshot.backspaceCount)
        assertEquals(0.0, snapshot.stressProxy, 0.0001)
    }
}
