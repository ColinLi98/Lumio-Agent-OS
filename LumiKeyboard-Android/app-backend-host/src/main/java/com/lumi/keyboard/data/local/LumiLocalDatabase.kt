package com.lumi.keyboard.data.local

import android.content.Context
import android.util.Log
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import net.sqlcipher.database.SupportFactory

@Database(
    entities = [
        ChatEventEntity::class,
        LixIntentEntity::class,
        MarketRunEntity::class,
        AvatarTraitEntity::class,
        DestinyDecisionEntity::class,
        MetricEventEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class LumiLocalDatabase : RoomDatabase() {
    abstract fun chatEventDao(): ChatEventDao
    abstract fun lixIntentDao(): LixIntentDao
    abstract fun marketRunDao(): MarketRunDao
    abstract fun avatarTraitDao(): AvatarTraitDao
    abstract fun destinyDecisionDao(): DestinyDecisionDao
    abstract fun metricEventDao(): MetricEventDao

    companion object {
        private const val DB_NAME = "lumi_internal_backend.db"
        private const val TAG = "LumiLocalDatabase"

        @Volatile
        private var instance: LumiLocalDatabase? = null

        fun get(context: Context): LumiLocalDatabase {
            val existing = instance
            if (existing != null) return existing

            synchronized(this) {
                val recheck = instance
                if (recheck != null) return recheck

                val appContext = context.applicationContext
                var created = buildDatabase(appContext, SecureDbKeyManager.getOrCreatePassphrase(appContext))
                val opened = runCatching {
                    // Force opening here so we can recover from key/db corruption before first DAO call.
                    created.openHelper.writableDatabase
                }.isSuccess

                if (!opened) {
                    Log.w(TAG, "Database open failed, resetting encrypted store and recreating.")
                    runCatching { created.close() }
                    SecureDbKeyManager.resetPassphrase(appContext)
                    deleteDatabaseFiles(appContext, DB_NAME)
                    created = buildDatabase(appContext, SecureDbKeyManager.getOrCreatePassphrase(appContext))
                    runCatching { created.openHelper.writableDatabase }.getOrElse { error ->
                        throw IllegalStateException("Failed to recover local database", error)
                    }
                }

                instance = created
                return created
            }
        }

        private fun buildDatabase(context: Context, passphrase: ByteArray): LumiLocalDatabase {
            val factory = SupportFactory(passphrase)
            return Room.databaseBuilder(
                context,
                LumiLocalDatabase::class.java,
                DB_NAME
            )
                .openHelperFactory(factory)
                .fallbackToDestructiveMigration()
                .build()
        }

        private fun deleteDatabaseFiles(context: Context, name: String) {
            runCatching { context.deleteDatabase(name) }
            runCatching { context.getDatabasePath("$name-wal").delete() }
            runCatching { context.getDatabasePath("$name-shm").delete() }
            runCatching { context.getDatabasePath("$name-journal").delete() }
        }
    }
}
