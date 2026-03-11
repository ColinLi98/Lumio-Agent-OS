package com.lumi.coreagent.resilience

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.pow

/**
 * A resilient wrapper for cloud calls, providing timeout, exponential backoff retries,
 * and a basic circuit breaker pattern.
 *
 * Usage:
 * ```
 * val result = resilientWrapper.callWithResilience(
 *     fallback = { "Fallback Result" }
 * ) {
 *     api.fetchData()
 * }
 * ```
 */
class ResilientCloudWrapper {

    private enum class CircuitState {
        CLOSED, OPEN, HALF_OPEN
    }

    // Configuration
    private var defaultTimeoutMs: Long = 10_000L
    private var maxRetries: Int = 2
    private var backoffBaseMs: Long = 500L
    private var failureThreshold: Int = 3
    private var resetTimeoutMs: Long = 30_000L

    // Circuit Breaker State
    private val state = AtomicReference(CircuitState.CLOSED)
    private val failureCount = AtomicInteger(0)
    private val lastFailureTime = AtomicLong(0)

    /**
     * Configures the timeout duration.
     * @param timeoutMs The timeout in milliseconds.
     */
    fun withTimeout(timeoutMs: Long) = apply {
        this.defaultTimeoutMs = timeoutMs
    }

    /**
     * Configures the retry mechanism.
     * @param maxRetries Maximum number of retries (excluding the initial attempt).
     * @param backoffMs Base duration for exponential backoff in milliseconds.
     */
    fun withRetry(maxRetries: Int, backoffMs: Long) = apply {
        this.maxRetries = maxRetries
        this.backoffBaseMs = backoffMs
    }

    /**
     * Configures the circuit breaker.
     * @param failureThreshold Number of failures before opening the circuit.
     * @param resetTimeMs Time in milliseconds to wait before attempting to close the circuit (Half-Open).
     */
    fun withCircuitBreaker(failureThreshold: Int, resetTimeMs: Long) = apply {
        this.failureThreshold = failureThreshold
        this.resetTimeoutMs = resetTimeMs
    }

    /**
     * Executes a suspend block with resilience patterns: Circuit Breaker -> Retry -> Timeout.
     *
     * @param onFallback Optional block to execute if the call fails after all retries or if the circuit is open.
     * @param block The suspend function to execute.
     * @return The result of [block] or [onFallback].
     * @throws Exception if the call fails and no fallback is provided.
     */
    suspend fun <T> callWithResilience(
        onFallback: (suspend (Throwable) -> T)? = null,
        block: suspend () -> T
    ): T {
        // 1. Check Circuit Breaker
        if (!allowRequest()) {
            val exception = RuntimeException("Circuit Breaker is OPEN")
            println("[Resilience] Circuit Breaker OPEN. Skipping call.")
            return onFallback?.invoke(exception) ?: throw exception
        }

        var currentRetry = 0
        var lastException: Throwable? = null

        while (currentRetry <= maxRetries) {
            try {
                return withContext(Dispatchers.IO) {
                    withTimeout(defaultTimeoutMs) {
                        val result = block()
                        onSuccess()
                        result
                    }
                }
            } catch (e: Throwable) {
                lastException = e
                // Don't retry on CancellationException if it was cancelled by parent, 
                // but do retry on TimeoutCancellationException (which is a subclass, handled by withTimeout logic)
                
                println("[Resilience] Attempt ${currentRetry + 1} failed: ${e.message}")

                if (currentRetry < maxRetries) {
                    val delayMs = (backoffBaseMs * 2.0.pow(currentRetry)).toLong()
                    println("[Resilience] Retrying in ${delayMs}ms...")
                    delay(delayMs)
                    currentRetry++
                } else {
                    break
                }
            }
        }

        // 2. Handle Failure (Record & Fallback)
        onFailure()
        val error = lastException ?: RuntimeException("Unknown error in resilience wrapper")
        
        return if (onFallback != null) {
            println("[Resilience] All retries exhausted. Executing fallback.")
            onFallback(error)
        } else {
            throw error
        }
    }

    private fun allowRequest(): Boolean {
        val currentState = state.get()
        return when (currentState) {
            CircuitState.CLOSED -> true
            CircuitState.OPEN -> {
                val now = System.currentTimeMillis()
                if (now - lastFailureTime.get() > resetTimeoutMs) {
                    // Transition to Half-Open to test the connection
                    if (state.compareAndSet(CircuitState.OPEN, CircuitState.HALF_OPEN)) {
                        println("[Resilience] Circuit Breaker HALF-OPEN: Testing connection...")
                        return true
                    }
                    // Another thread beat us to it, check again
                    state.get() == CircuitState.HALF_OPEN
                } else {
                    false
                }
            }
            CircuitState.HALF_OPEN -> {
                // Allow only one request at a time in Half-Open state (simplified)
                // In a real implementation, we might allow a few probe requests.
                // For now, we assume the caller holding the HALF-OPEN state proceeds.
                true
            }
        }
    }

    private fun onSuccess() {
        // If we succeeded, reset failure count and close the circuit
        failureCount.set(0)
        if (state.get() != CircuitState.CLOSED) {
            state.set(CircuitState.CLOSED)
            println("[Resilience] Circuit Breaker CLOSED: Service recovered.")
        }
    }

    private fun onFailure() {
        failureCount.incrementAndGet()
        lastFailureTime.set(System.currentTimeMillis())

        if (state.get() == CircuitState.HALF_OPEN) {
            // If we failed in Half-Open, go back to Open immediately
            state.set(CircuitState.OPEN)
            println("[Resilience] Circuit Breaker OPEN: Half-open probe failed.")
        } else if (failureCount.get() >= failureThreshold) {
            if (state.compareAndSet(CircuitState.CLOSED, CircuitState.OPEN)) {
                println("[Resilience] Circuit Breaker OPEN: Failure threshold reached (${failureCount.get()}).")
            }
        }
    }
}
