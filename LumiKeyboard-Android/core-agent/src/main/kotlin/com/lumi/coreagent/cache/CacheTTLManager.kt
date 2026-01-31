package com.lumi.coreagent.cache

import java.util.concurrent.TimeUnit

enum class DataType {
    OCR_SNAPSHOT,
    RAW_INPUT,
    CHAT_CONTEXT,
    VECTOR_EMBEDDING
}

interface CacheDao {
    /**
     * Delete data older than ttlThreshold for the given type.
     * currentTime is provided for auditing or query optimization.
     */
    fun deleteExpiredData(currentTime: Long, ttlThreshold: Long, type: DataType)

    /**
     * Runs the given block in a single transaction to keep cleanup consistent.
     */
    fun runInTransaction(block: () -> Unit)
}

class CacheTTLManager(
    private val cacheDao: CacheDao,
    private val clock: () -> Long = { System.currentTimeMillis() }
) {

    fun performCleanup() {
        val now = clock()
        val cutoffL1 = now - TTL_LEVEL_1_MS
        val cutoffL2 = now - TTL_LEVEL_2_MS
        val cutoffL3 = now - TTL_LEVEL_3_MS

        cacheDao.runInTransaction {
            // Level 1: OCR snapshots, raw input buffer
            cacheDao.deleteExpiredData(now, cutoffL1, DataType.OCR_SNAPSHOT)
            cacheDao.deleteExpiredData(now, cutoffL1, DataType.RAW_INPUT)

            // Level 2: chat context history
            cacheDao.deleteExpiredData(now, cutoffL2, DataType.CHAT_CONTEXT)

            // Level 3: vector index embeddings (rolling/LRU managed by timestamp)
            cacheDao.deleteExpiredData(now, cutoffL3, DataType.VECTOR_EMBEDDING)

            // Knowledge graph entities are permanent until user deletion.
        }
    }

    companion object {
        val TTL_LEVEL_1_MS = TimeUnit.HOURS.toMillis(1)
        val TTL_LEVEL_2_MS = TimeUnit.HOURS.toMillis(24)
        val TTL_LEVEL_3_MS = TimeUnit.DAYS.toMillis(30)
    }
}

/**
 * WorkManager scheduling snippet (run once every 4 hours):
 *
 * val workRequest = PeriodicWorkRequestBuilder<CacheCleanupWorker>(
 *     4, TimeUnit.HOURS
 * ).build()
 *
 * WorkManager.getInstance(context).enqueueUniquePeriodicWork(
 *     "cache_ttl_cleanup",
 *     ExistingPeriodicWorkPolicy.KEEP,
 *     workRequest
 * )
 */
