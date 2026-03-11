package com.lumi.keyboard.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ChatEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(event: ChatEventEntity)

    @Query("DELETE FROM chat_events WHERE timestampMs < :cutoffMs")
    suspend fun purgeBefore(cutoffMs: Long)
}

@Dao
interface LixIntentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(intent: LixIntentEntity)

    @Query("SELECT * FROM lix_intents ORDER BY updatedAtMs DESC LIMIT :limit")
    suspend fun latest(limit: Int): List<LixIntentEntity>
}

@Dao
interface MarketRunDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(run: MarketRunEntity)
}

@Dao
interface AvatarTraitDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(trait: AvatarTraitEntity)

    @Query("SELECT * FROM avatar_traits ORDER BY updatedAtMs DESC LIMIT :limit")
    suspend fun latest(limit: Int): List<AvatarTraitEntity>
}

@Dao
interface DestinyDecisionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(decision: DestinyDecisionEntity)
}

@Dao
interface MetricEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(event: MetricEventEntity)

    @Query("DELETE FROM metric_events WHERE timestampMs < :cutoffMs")
    suspend fun purgeBefore(cutoffMs: Long)
}
