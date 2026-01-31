package com.lumi.coredomain.export

import com.lumi.coredomain.model.DigitalSoul
import com.lumi.coredomain.model.Entity
import com.lumi.coredomain.model.UsageStats
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

object DataExporter {

    private val json = Json {
        prettyPrint = true
        encodeDefaults = true
        explicitNulls = false
    }

    fun exportToJson(soul: DigitalSoul, graph: List<Entity>, stats: UsageStats): String {
        val payload = ExportPayload(
            meta = ExportMeta(
                version = "1.0",
                exportedAt = System.currentTimeMillis(),
                deviceIdHash = stats.deviceIdHash ?: "unknown"
            ),
            digitalSoul = ExportDigitalSoul(
                communicationStyle = normalizeString(soul.communicationStyle),
                riskTolerance = normalizeString(soul.riskTolerance),
                preferences = sanitizePreferences(soul.preferences)
            ),
            knowledgeGraph = graph.map { entity ->
                ExportEntity(
                    id = entity.id ?: "",
                    type = normalizeString(entity.type),
                    value = entity.value ?: "",
                    weight = entity.weight ?: 0.0,
                    source = normalizeString(entity.source),
                    timestamp = entity.timestamp ?: 0L
                )
            },
            usageStats = ExportUsageStats(
                timeSavedMinutes = stats.timeSavedMinutes ?: 0
            )
        )

        return json.encodeToString(payload)
    }

    fun exportToMarkdown(soul: DigitalSoul, graph: List<Entity>, stats: UsageStats): String {
        val sorted = graph.sortedByDescending { it.weight ?: 0.0 }
        val topItems = sorted.take(5)

        val builder = StringBuilder()
        builder.appendLine("# My Lumi Digital Profile")
        builder.appendLine("## 🧠 Digital Soul")
        builder.appendLine("- Style: ${normalizeString(soul.communicationStyle)}")
        builder.appendLine("- Risk Tolerance: ${normalizeString(soul.riskTolerance)}")
        builder.appendLine("## 📚 Top Interests")
        if (topItems.isEmpty()) {
            builder.appendLine("1. (No data)")
        } else {
            topItems.forEachIndexed { index, entity ->
                val weight = entity.weight ?: 0.0
                val value = entity.value ?: "Unknown"
                builder.appendLine("${index + 1}. $value (Weight: $weight)")
            }
        }
        builder.appendLine("## ⚡ Impact")
        builder.appendLine("Saved ${stats.timeSavedMinutes ?: 0} minutes.")

        return builder.toString().trim()
    }

    private fun normalizeString(value: String?): String {
        return value?.takeIf { it.isNotBlank() } ?: "unknown"
    }

    private fun sanitizePreferences(preferences: Map<String, String?>?): Map<String, String> {
        if (preferences.isNullOrEmpty()) return emptyMap()
        return preferences.mapNotNull { (key, value) ->
            val normalizedKey = key.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val normalizedValue = value?.takeIf { it.isNotBlank() }
            normalizedKey to (normalizedValue ?: "unknown")
        }.toMap()
    }
}

@Serializable
private data class ExportPayload(
    @SerialName("meta")
    val meta: ExportMeta,
    @SerialName("digital_soul")
    val digitalSoul: ExportDigitalSoul,
    @SerialName("knowledge_graph")
    val knowledgeGraph: List<ExportEntity>,
    @SerialName("usage_stats")
    val usageStats: ExportUsageStats
)

@Serializable
private data class ExportMeta(
    @SerialName("version")
    val version: String,
    @SerialName("exported_at")
    val exportedAt: Long,
    @SerialName("device_id_hash")
    val deviceIdHash: String
)

@Serializable
private data class ExportDigitalSoul(
    @SerialName("communication_style")
    val communicationStyle: String,
    @SerialName("risk_tolerance")
    val riskTolerance: String,
    @SerialName("preferences")
    val preferences: Map<String, String>
)

@Serializable
private data class ExportEntity(
    @SerialName("id")
    val id: String,
    @SerialName("type")
    val type: String,
    @SerialName("value")
    val value: String,
    @SerialName("weight")
    val weight: Double,
    @SerialName("source")
    val source: String,
    @SerialName("timestamp")
    val timestamp: Long
)

@Serializable
private data class ExportUsageStats(
    @SerialName("time_saved_minutes")
    val timeSavedMinutes: Int
)
