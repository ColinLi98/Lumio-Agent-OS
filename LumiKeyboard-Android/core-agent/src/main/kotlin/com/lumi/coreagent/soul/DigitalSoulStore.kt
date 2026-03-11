package com.lumi.coreagent.soul

import com.lumi.coreagent.orchestrator.IntentType
import com.lumi.coredomain.contract.DigitalSoulSummary
import com.lumi.coredomain.contract.InteractionEvent
import com.lumi.coredomain.contract.TraitScore
import com.lumi.coredomain.contract.TwinContext

/**
 * Cold-start questionnaire answer (max 3 questions, 30 seconds total per PRD).
 */
data class ColdStartAnswer(
    val communicationStyle: String = "Balanced",   // Professional / Friendly / Concise / Humorous
    val riskTolerance: String = "Balanced",         // Conservative / Balanced / Aggressive
    val privacyLevel: String = "Balanced"           // Strict / Balanced / Open
)

interface DigitalSoulStore {
    fun onRequest(userId: String, intent: IntentType, locale: String)

    fun onEvent(event: InteractionEvent)

    fun summary(userId: String): DigitalSoulSummary

    fun toTwinContext(userId: String, locale: String): TwinContext

    /**
     * Whether this user needs a cold-start questionnaire (no prior data).
     */
    fun needsColdStart(userId: String): Boolean = true

    /**
     * Bootstrap soul from cold-start questionnaire answers.
     * PRD: max 3 questions, complete in 30 seconds.
     */
    fun bootstrap(userId: String, answers: ColdStartAnswer) {}

    /**
     * Persist current soul state (called periodically or on app pause).
     */
    fun persist(userId: String) {}

    /**
     * Restore soul state from persistent storage (called on app start).
     */
    fun restore(userId: String) {}
}
