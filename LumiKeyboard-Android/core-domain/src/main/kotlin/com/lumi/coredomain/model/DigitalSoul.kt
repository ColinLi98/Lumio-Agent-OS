package com.lumi.coredomain.model

/**
 * DigitalSoul - core digital twin model
 *
 * PRD-aligned fields:
 * - communicationStyle: Professional / Friendly / Concise / Humorous
 * - riskTolerance: 0-100, default 50
 * - privacyLevel: Strict / Balanced / Open
 * - priceVsQuality: -50 (price-first) ~ +50 (quality-first)
 * - uarStats: draft acceptance metrics
 *
 * Passive learning (EMA): new = old * (1 - alpha) + signal * alpha
 */
data class DigitalSoul(
    val communicationStyle: String? = null,
    val riskTolerance: Int = 50,
    val privacyLevel: String = "Balanced",
    val priceVsQuality: Int = 0,
    val uarStats: UarStats = UarStats(),
    val preferences: Map<String, String?> = emptyMap()
)

/**
 * Draft acceptance metrics (local only), used to tune twin parameters.
 */
data class UarStats(
    val draftsAccepted: Int = 0,
    val draftsEdited: Int = 0,
    val draftsRejected: Int = 0
) {
    val acceptanceRate: Double
        get() {
            val total = draftsAccepted + draftsEdited + draftsRejected
            return if (total > 0) draftsAccepted.toDouble() / total else 0.0
        }
}
