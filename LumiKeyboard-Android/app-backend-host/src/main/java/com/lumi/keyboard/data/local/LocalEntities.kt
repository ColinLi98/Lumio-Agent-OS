package com.lumi.keyboard.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "chat_events",
    indices = [Index("sessionId"), Index("timestampMs")]
)
data class ChatEventEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val role: String,
    val contentSummary: String,
    val traceId: String,
    val timestampMs: Long
)

@Entity(
    tableName = "lix_intents",
    indices = [Index("intentId"), Index("updatedAtMs")]
)
data class LixIntentEntity(
    @PrimaryKey val intentId: String,
    val title: String,
    val status: String,
    val offersCount: Int,
    val traceId: String,
    val updatedAtMs: Long
)

@Entity(
    tableName = "market_runs",
    indices = [Index("traceId"), Index("timestampMs")]
)
data class MarketRunEntity(
    @PrimaryKey val id: String,
    val querySummary: String,
    val selectedAgents: Int,
    val successCount: Int,
    val traceId: String,
    val timestampMs: Long
)

@Entity(
    tableName = "avatar_traits",
    indices = [Index("keyName"), Index("updatedAtMs")]
)
data class AvatarTraitEntity(
    @PrimaryKey val id: String,
    val keyName: String,
    val score: Double,
    val source: String,
    val updatedAtMs: Long
)

@Entity(
    tableName = "destiny_decisions",
    indices = [Index("timestampMs")]
)
data class DestinyDecisionEntity(
    @PrimaryKey val id: String,
    val strategyLabel: String,
    val riskLevel: String,
    val nextStepSummary: String,
    val traceId: String,
    val timestampMs: Long
)

@Entity(
    tableName = "metric_events",
    indices = [Index("name"), Index("timestampMs")]
)
data class MetricEventEntity(
    @PrimaryKey val id: String,
    val name: String,
    val value: Double,
    val dimension: String,
    val traceId: String,
    val timestampMs: Long
)
