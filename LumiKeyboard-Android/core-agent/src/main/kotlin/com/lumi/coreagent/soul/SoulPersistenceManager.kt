package com.lumi.coreagent.soul

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Port interface for trait persistence — implemented by the app module
 * using Room + AvatarTraitDao. This allows core-agent to define the contract
 * without depending on app-backend-host.
 *
 * Dependency inversion: core-agent defines the port,
 * app-backend-host provides the adapter.
 */
interface TraitPersistencePort {
    /** Upsert a batch of traits keyed by (userId, traitKey). */
    suspend fun upsertTraits(userId: String, traits: List<Pair<String, Double>>)

    /** Load the most recent traits for a given user. */
    suspend fun loadTraits(userId: String, limit: Int = 50): List<Pair<String, Double>>
}

/**
 * Manages persistence of the Digital Soul (Avatar Traits) to the local encrypted Room database.
 * Bridges the in-memory [InMemoryDigitalSoulStore] with a [TraitPersistencePort] adapter.
 *
 * Architecture (per user's diagram):
 *   InMemoryDigitalSoulStore ↔ SoulPersistenceManager ↔ TraitPersistencePort ↔ Room ↔ SQLCipher
 *
 * Originally scaffolded by OpenClaw (Opus 4.6), reviewed and corrected by Team Leader.
 *
 * @property soulStore The in-memory store holding current traits.
 * @property persistencePort The port for database operations (injected by app module).
 * @property scope The CoroutineScope for auto-save operations.
 */
class SoulPersistenceManager(
    private val soulStore: InMemoryDigitalSoulStore,
    private val persistencePort: TraitPersistencePort,
    private val scope: CoroutineScope
) {
    private val isAutoSaving = AtomicBoolean(false)
    private var autoSaveJob: Job? = null

    companion object {
        private const val AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000L // 5 minutes
        private const val TAG = "SoulPersistenceManager"
    }

    /**
     * Persists the current in-memory soul state to the database for a specific user.
     * Exports traits from [InMemoryDigitalSoulStore.exportTraits] and writes them
     * via the [TraitPersistencePort].
     *
     * @param userId The ID of the user whose soul is being persisted.
     */
    suspend fun persistSoul(userId: String) = withContext(Dispatchers.IO) {
        val currentTraits = soulStore.exportTraits(userId)
        if (currentTraits.isEmpty()) return@withContext

        persistencePort.upsertTraits(userId, currentTraits)
    }

    /**
     * Restores the soul state from the database into memory.
     * Reads traits from [TraitPersistencePort] and imports them via
     * [InMemoryDigitalSoulStore.importTraits].
     *
     * @param userId The ID of the user to restore.
     * @return true if restoration found data, false if no persisted traits exist.
     */
    suspend fun restoreSoul(userId: String): Boolean = withContext(Dispatchers.IO) {
        val traits = persistencePort.loadTraits(userId)

        if (traits.isNotEmpty()) {
            val label = inferLabelFromTraits(traits)
            soulStore.importTraits(userId, traits, label)
            true
        } else {
            false
        }
    }

    /**
     * Starts a background job that persists the soul every 5 minutes.
     * Safe to call multiple times; subsequent calls are ignored if already running.
     *
     * @param userId The user ID to auto-save.
     */
    fun scheduleAutoSave(userId: String) {
        if (isAutoSaving.getAndSet(true)) return

        autoSaveJob = scope.launch(Dispatchers.IO) {
            while (isActive) {
                delay(AUTO_SAVE_INTERVAL_MS)
                try {
                    persistSoul(userId)
                } catch (e: Exception) {
                    // Log but don't crash — persistence is best-effort
                    e.printStackTrace()
                }
            }
        }
    }

    /**
     * Stops the auto-save job. Call this on app pause/destroy.
     */
    fun stopAutoSave() {
        autoSaveJob?.cancel()
        autoSaveJob = null
        isAutoSaving.set(false)
    }

    /**
     * Infer a profile label from the trait map (mirrors InMemoryDigitalSoulStore.updateLabel).
     */
    private fun inferLabelFromTraits(traits: List<Pair<String, Double>>): String {
        val top = traits.maxByOrNull { it.second }?.first.orEmpty()
        return when {
            top.startsWith("negotiation") -> "Strategic Negotiator"
            top.startsWith("orchestration") -> "Agent Orchestrator"
            top.startsWith("strategy") -> "Long-horizon Planner"
            top.startsWith("exploration") -> "Adaptive Explorer"
            top.startsWith("consumer_behavior") -> "Smart Consumer"
            top.startsWith("planning") -> "Organized Planner"
            top.startsWith("privacy_awareness") -> "Privacy Guardian"
            else -> "Balanced Operator"
        }
    }
}
