package com.lumi.coreagent.metrics

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedDeque
import kotlin.math.ceil

/**
 * Tracks performance metrics for various components (e.g., Bellman Solver, Cloud APIs).
 * Uses a sliding window approach for recent latency statistics.
 */
object PerformanceTracker {

    private const val WINDOW_SIZE = 100
    private val solverMetrics = ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>>()
    private val cloudMetrics = ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>>()

    data class LatencyStats(
        val count: Int,
        val avgMs: Double,
        val p50Ms: Long,
        val p95Ms: Long,
        val maxMs: Long
    )

    /**
     * Records the latency of a solver execution.
     */
    fun recordSolveLatency(solverName: String, durationMs: Long) {
        record(solverMetrics, solverName, durationMs)
    }

    /**
     * Records the latency of a cloud API call.
     * Only successful calls are typically recorded for performance stats, 
     * but you can modify to include failures if desired.
     */
    fun recordCloudLatency(endpoint: String, durationMs: Long, success: Boolean) {
        if (success) {
            record(cloudMetrics, endpoint, durationMs)
        }
    }

    private fun record(
        map: ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>>,
        key: String,
        value: Long
    ) {
        val deque = map.computeIfAbsent(key) { ConcurrentLinkedDeque() }
        deque.add(value)
        while (deque.size > WINDOW_SIZE) {
            deque.pollFirst()
        }
    }

    /**
     * Calculates statistics for all recorded metrics.
     * This operation can be slightly expensive due to sorting, so call sparingly (e.g., debug UI or periodic log).
     */
    suspend fun getLatencyStats(): Map<String, LatencyStats> = withContext(Dispatchers.Default) {
        val allStats = mutableMapOf<String, LatencyStats>()

        // Process Solver Metrics
        solverMetrics.forEach { (name, values) ->
            allStats["solver:$name"] = calculateStats(values)
        }

        // Process Cloud Metrics
        cloudMetrics.forEach { (endpoint, values) ->
            allStats["cloud:$endpoint"] = calculateStats(values)
        }

        allStats
    }

    private fun calculateStats(values: Collection<Long>): LatencyStats {
        if (values.isEmpty()) {
            return LatencyStats(0, 0.0, 0, 0, 0)
        }

        val sorted = values.sorted()
        val count = sorted.size
        val avg = values.average()
        val max = sorted.last()

        val p50Index = ceil(count * 0.50).toInt().coerceAtMost(count - 1)
        val p95Index = ceil(count * 0.95).toInt().coerceAtMost(count - 1)

        return LatencyStats(
            count = count,
            avgMs = avg,
            p50Ms = sorted[p50Index],
            p95Ms = sorted[p95Index],
            maxMs = max
        )
    }

    /**
     * Clears all metrics. useful for testing or resetting state.
     */
    fun clear() {
        solverMetrics.clear()
        cloudMetrics.clear()
    }
}
