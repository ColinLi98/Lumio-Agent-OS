package com.lumi.keyboard

import com.lumi.coredomain.contract.KeystrokeDynamicsPayload
import kotlin.math.roundToInt

/**
 * Lightweight on-device keystroke feature collector.
 *
 * No raw text is persisted here. Only aggregate dynamics are exposed.
 */
class KeystrokeDynamicsCollector(
    private val windowMs: Long = 12_000L,
    private val maxEvents: Int = 96
) {

    private data class EventPoint(
        val ts: Long,
        val backspace: Boolean
    )

    private val events = ArrayDeque<EventPoint>()

    fun recordKey(key: String, timestampMs: Long = System.currentTimeMillis()) {
        val normalized = key.trim().uppercase()
        val backspace = normalized == "DELETE" || normalized == "⌫"
        events.addLast(EventPoint(ts = timestampMs, backspace = backspace))
        prune(timestampMs)
    }

    fun snapshot(nowMs: Long = System.currentTimeMillis()): KeystrokeDynamicsPayload {
        prune(nowMs)
        if (events.isEmpty()) {
            return KeystrokeDynamicsPayload(windowMs = windowMs)
        }

        val list = events.toList()
        val keyCount = list.size
        val backspaceCount = list.count { it.backspace }
        val intervals = list.zipWithNext { a, b -> (b.ts - a.ts).coerceAtLeast(0L) }
        val avgInterKey = if (intervals.isEmpty()) 0.0 else intervals.average()
        val pauseCount = intervals.count { it >= LONG_PAUSE_MS }

        val effectiveWindow = (list.last().ts - list.first().ts).coerceAtLeast(1L)
        val burstKpm = keyCount.toDouble() * 60_000.0 / effectiveWindow.toDouble()
        val backspaceRate = if (keyCount == 0) 0.0 else backspaceCount.toDouble() / keyCount.toDouble()
        val pauseRate = if (keyCount <= 1) 0.0 else pauseCount.toDouble() / keyCount.toDouble()

        val speedNorm = (burstKpm / STRESS_SPEED_REF_KPM).coerceIn(0.0, 1.0)
        val stressProxy = (
            (speedNorm * 0.55) +
                (backspaceRate * 0.35) +
                ((1.0 - pauseRate).coerceIn(0.0, 1.0) * 0.10)
            ).coerceIn(0.0, 1.0)

        return KeystrokeDynamicsPayload(
            windowMs = effectiveWindow,
            keyCount = keyCount,
            backspaceCount = backspaceCount,
            avgInterKeyDelayMs = avgInterKey.round(1),
            pauseCount = pauseCount,
            burstKpm = burstKpm.round(1),
            stressProxy = stressProxy.round(3)
        )
    }

    fun reset() {
        events.clear()
    }

    private fun prune(nowMs: Long) {
        val cutoff = nowMs - windowMs
        while (events.isNotEmpty() && events.first().ts < cutoff) {
            events.removeFirst()
        }
        while (events.size > maxEvents) {
            events.removeFirst()
        }
    }

    private fun Double.round(scale: Int): Double {
        val p = 10.0.pow(scale)
        return (this * p).roundToInt() / p
    }

    private fun Double.pow(scale: Int): Double {
        var result = 1.0
        repeat(scale) { result *= this }
        return result
    }

    companion object {
        private const val LONG_PAUSE_MS = 1_200L
        private const val STRESS_SPEED_REF_KPM = 260.0
    }
}
