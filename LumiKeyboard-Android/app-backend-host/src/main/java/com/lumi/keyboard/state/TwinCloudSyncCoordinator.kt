package com.lumi.keyboard.state

import android.content.Context
import com.lumi.coreagent.orchestrator.TwinSyncStatusSnapshot
import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.TrajectoryPointPayload
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.max

class TwinCloudSyncCoordinator(
    context: Context,
    private val baseUrl: String,
    private val cloudSyncEnabled: Boolean
) {
    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    private val lock = Any()

    suspend fun syncNow(
        userId: String,
        dynamicState: DynamicHumanStatePayload?,
        trajectory: List<TrajectoryPointPayload>
    ) = withContext(Dispatchers.IO) {
        if (!cloudSyncEnabled || userId.isBlank() || dynamicState == null) {
            return@withContext
        }
        markSyncing()

        val localVersion = prefs.getLong(versionKey(userId), 0L)
        val payload = JSONObject().apply {
            put("user_id", userId)
            put("local_version", localVersion)
            put("updated_at_ms", dynamicState.updatedAtMs)
            put(
                "state_packet",
                JSONObject().apply {
                    put(
                        "l1",
                        JSONObject().apply {
                            put("profile_id", dynamicState.l1.profileId)
                            put("value_anchor", dynamicState.l1.valueAnchor)
                            put("risk_preference", dynamicState.l1.riskPreference)
                        }
                    )
                    put(
                        "l2",
                        JSONObject().apply {
                            put("source_app", dynamicState.l2.sourceApp)
                            put("app_category", dynamicState.l2.appCategory)
                            put("energy_level", dynamicState.l2.energyLevel)
                            put("context_load", dynamicState.l2.contextLoad)
                        }
                    )
                    put(
                        "l3",
                        JSONObject().apply {
                            put("stress_score", dynamicState.l3.stressScore)
                            put("polarity", dynamicState.l3.polarity)
                            put("focus_score", dynamicState.l3.focusScore)
                        }
                    )
                }
            )
            put(
                "trajectory",
                JSONArray().apply {
                    trajectory.takeLast(MAX_SYNC_TRAJECTORY_POINTS).forEach { point ->
                        put(
                            JSONObject().apply {
                                put("ts", point.ts)
                                put("value", point.value)
                                put("label", point.label)
                            }
                        )
                    }
                }
            )
        }

        val endpoint = "${baseUrl.trimEnd('/')}/api/digital-twin/sync"
        val now = System.currentTimeMillis()

        runCatching {
            val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 5000
                readTimeout = 7000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            connection.outputStream.use { out ->
                out.write(payload.toString().toByteArray(Charsets.UTF_8))
            }
            val code = connection.responseCode
            val body = runCatching {
                val source = if (code in 200..299) connection.inputStream else connection.errorStream
                source?.bufferedReader()?.use { it.readText() }.orEmpty()
            }.getOrDefault("")
            connection.disconnect()

            val parsed = runCatching { JSONObject(body) }.getOrNull()
            val remoteVersion = parsed?.optLong("version", localVersion + 1) ?: (localVersion + 1)
            val conflict = code == 409 || parsed?.optBoolean("conflict", false) == true
            val responseSummary = parsed?.optString("summary")
                ?.takeIf { !it.isNullOrBlank() }
                ?: parsed?.optString("message")?.takeIf { !it.isNullOrBlank() }

            if (code in 200..299 && !conflict) {
                markSynced(
                    timestampMs = now,
                    nextVersion = remoteVersion,
                    userId = userId,
                    summary = responseSummary
                        ?: "Remote twin snapshot acknowledged at version $remoteVersion.",
                    resolution = parsed?.optString("resolution")
                        ?.takeIf { it.isNotBlank() }
                        ?: "remote_acknowledged"
                )
            } else if (conflict) {
                markConflictFallback(
                    timestampMs = now,
                    mergedVersion = max(localVersion, remoteVersion),
                    userId = userId,
                    summary = responseSummary
                        ?: "Conflict detected between local version $localVersion and remote version $remoteVersion; local state remains authoritative while fallback reconciliation is applied.",
                    resolution = parsed?.optString("resolution")
                        ?.takeIf { it.isNotBlank() }
                        ?: "local_authoritative_fallback"
                )
            } else {
                markFailedFallback(
                    timestampMs = now,
                    summary = responseSummary
                        ?: "Cloud sync failed; local state remains authoritative in fallback mode.",
                    resolution = parsed?.optString("resolution")
                        ?.takeIf { it.isNotBlank() }
                        ?: "local_only_fallback"
                )
            }
        }.onFailure {
            markFailedFallback(
                timestampMs = now,
                summary = "Cloud sync failed; local state remains authoritative in fallback mode.",
                resolution = "local_only_fallback"
            )
        }
    }

    fun snapshot(): TwinSyncStatusSnapshot {
        synchronized(lock) {
            return TwinSyncStatusSnapshot(
                status = if (cloudSyncEnabled) {
                    prefs.getString(KEY_STATUS, "pending") ?: "pending"
                } else {
                    "disabled"
                },
                lastSyncAtMs = prefs.getLong(KEY_LAST_SYNC_MS, 0L).takeIf { it > 0L },
                successCount = prefs.getInt(KEY_SUCCESS_COUNT, 0),
                conflictCount = prefs.getInt(KEY_CONFLICT_COUNT, 0),
                fallbackCount = prefs.getInt(KEY_FALLBACK_COUNT, 0),
                lastSummary = prefs.getString(KEY_LAST_SUMMARY, null),
                lastResolution = prefs.getString(KEY_LAST_RESOLUTION, null),
                lastConflictAtMs = prefs.getLong(KEY_LAST_CONFLICT_MS, 0L).takeIf { it > 0L },
                lastConflictSummary = prefs.getString(KEY_LAST_CONFLICT_SUMMARY, null)
            )
        }
    }

    private fun markSynced(
        timestampMs: Long,
        nextVersion: Long,
        userId: String,
        summary: String,
        resolution: String
    ) {
        synchronized(lock) {
            prefs.edit()
                .putString(KEY_STATUS, "synced")
                .putLong(KEY_LAST_SYNC_MS, timestampMs)
                .putInt(KEY_SUCCESS_COUNT, prefs.getInt(KEY_SUCCESS_COUNT, 0) + 1)
                .putLong(versionKey(userId), nextVersion)
                .putString(KEY_LAST_SUMMARY, summary)
                .putString(KEY_LAST_RESOLUTION, resolution)
                .apply()
        }
    }

    private fun markConflictFallback(
        timestampMs: Long,
        mergedVersion: Long,
        userId: String,
        summary: String,
        resolution: String
    ) {
        synchronized(lock) {
            prefs.edit()
                .putString(KEY_STATUS, "conflict_fallback")
                .putLong(KEY_LAST_SYNC_MS, timestampMs)
                .putInt(KEY_CONFLICT_COUNT, prefs.getInt(KEY_CONFLICT_COUNT, 0) + 1)
                .putInt(KEY_FALLBACK_COUNT, prefs.getInt(KEY_FALLBACK_COUNT, 0) + 1)
                .putLong(versionKey(userId), mergedVersion)
                .putString(KEY_LAST_SUMMARY, summary)
                .putString(KEY_LAST_RESOLUTION, resolution)
                .putLong(KEY_LAST_CONFLICT_MS, timestampMs)
                .putString(KEY_LAST_CONFLICT_SUMMARY, summary)
                .apply()
        }
    }

    private fun markSyncing() {
        synchronized(lock) {
            prefs.edit()
                .putString(KEY_STATUS, "syncing")
                .apply()
        }
    }

    private fun markFailedFallback(
        timestampMs: Long,
        summary: String,
        resolution: String
    ) {
        synchronized(lock) {
            prefs.edit()
                .putString(KEY_STATUS, "failed_fallback")
                .putLong(KEY_LAST_SYNC_MS, timestampMs)
                .putInt(KEY_FALLBACK_COUNT, prefs.getInt(KEY_FALLBACK_COUNT, 0) + 1)
                .putString(KEY_LAST_SUMMARY, summary)
                .putString(KEY_LAST_RESOLUTION, resolution)
                .apply()
        }
    }

    private fun versionKey(userId: String): String = "twin_sync_version:$userId"

    companion object {
        private const val PREF_NAME = "lumi_twin_cloud_sync"
        private const val KEY_STATUS = "status"
        private const val KEY_LAST_SYNC_MS = "last_sync_ms"
        private const val KEY_SUCCESS_COUNT = "success_count"
        private const val KEY_CONFLICT_COUNT = "conflict_count"
        private const val KEY_FALLBACK_COUNT = "fallback_count"
        private const val KEY_LAST_SUMMARY = "last_summary"
        private const val KEY_LAST_RESOLUTION = "last_resolution"
        private const val KEY_LAST_CONFLICT_MS = "last_conflict_ms"
        private const val KEY_LAST_CONFLICT_SUMMARY = "last_conflict_summary"
        private const val MAX_SYNC_TRAJECTORY_POINTS = 64
    }
}
