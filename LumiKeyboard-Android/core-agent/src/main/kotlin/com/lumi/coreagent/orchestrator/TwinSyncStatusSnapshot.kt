package com.lumi.coreagent.orchestrator

data class TwinSyncStatusSnapshot(
    val status: String = "disabled",
    val lastSyncAtMs: Long? = null,
    val successCount: Int = 0,
    val conflictCount: Int = 0,
    val fallbackCount: Int = 0,
    val lastSummary: String? = null,
    val lastResolution: String? = null,
    val lastConflictAtMs: Long? = null,
    val lastConflictSummary: String? = null
)
