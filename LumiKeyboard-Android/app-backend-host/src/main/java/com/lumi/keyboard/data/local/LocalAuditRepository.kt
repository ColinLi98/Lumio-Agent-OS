package com.lumi.keyboard.data.local

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class LocalAuditRepository(context: Context) {

    private val db = LumiLocalDatabase.get(context)
    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun recordMetric(name: String, value: Double, dimension: String, traceId: String) {
        ioScope.launch {
            db.metricEventDao().upsert(
                MetricEventEntity(
                    id = UUID.randomUUID().toString(),
                    name = name,
                    value = value,
                    dimension = dimension,
                    traceId = traceId,
                    timestampMs = System.currentTimeMillis()
                )
            )
        }
    }

    fun recordChatSummary(sessionId: String, role: String, summary: String, traceId: String) {
        ioScope.launch {
            db.chatEventDao().upsert(
                ChatEventEntity(
                    id = UUID.randomUUID().toString(),
                    sessionId = sessionId,
                    role = role,
                    contentSummary = summary,
                    traceId = traceId,
                    timestampMs = System.currentTimeMillis()
                )
            )
        }
    }
}
