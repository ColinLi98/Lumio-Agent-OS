package com.lumi.keyboard.ui.model

enum class ModuleExecutionStatus {
    RUNNING,
    SUCCESS,
    ERROR,
    CANCELLED
}

data class ModuleExecutionStep(
    val id: String,
    val label: String,
    val status: ModuleExecutionStatus,
    val startedAtMs: Long,
    val finishedAtMs: Long? = null,
    val latencyMs: Long? = null,
    val traceId: String? = null
)
