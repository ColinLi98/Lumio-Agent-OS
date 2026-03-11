package com.lumi.keyboard

import com.lumi.coredomain.contract.AgentRequest
import java.util.concurrent.ConcurrentHashMap

class SessionContextCache(
    private val ttlMs: Long = 15 * 60 * 1_000L,
    private val nowMs: () -> Long = { System.currentTimeMillis() }
) {

    private data class SessionState(
        val locale: String,
        val sourceApp: String,
        val updatedAtMs: Long
    )

    private val sessions: ConcurrentHashMap<String, SessionState> = ConcurrentHashMap()

    fun merge(request: AgentRequest): AgentRequest {
        val cached = sessions[request.sessionId]
        return if (cached == null) {
            request
        } else {
            request.copy(
                locale = request.locale.ifBlank { cached.locale },
                sourceApp = request.sourceApp.ifBlank { cached.sourceApp }
            )
        }
    }

    fun touch(request: AgentRequest) {
        sessions[request.sessionId] = SessionState(
            locale = request.locale,
            sourceApp = request.sourceApp,
            updatedAtMs = nowMs()
        )
    }

    fun cleanup() {
        val cutoff = nowMs() - ttlMs
        sessions.entries.removeIf { (_, value) ->
            value.updatedAtMs < cutoff
        }
    }
}
