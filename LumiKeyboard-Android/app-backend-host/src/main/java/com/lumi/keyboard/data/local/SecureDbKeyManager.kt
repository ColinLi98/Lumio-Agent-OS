package com.lumi.keyboard.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object SecureDbKeyManager {

    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "lumi_db_passphrase_key"
    private const val PREF_NAME = "lumi_secure_db"
    private const val PREF_CIPHER = "cipher_b64"
    private const val PREF_IV = "iv_b64"
    private const val AES_MODE = "AES/GCM/NoPadding"

    fun getOrCreatePassphrase(context: Context): ByteArray {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val storedCipher = prefs.getString(PREF_CIPHER, null)
        val storedIv = prefs.getString(PREF_IV, null)

        val key = getOrCreateSecretKey()
        if (!storedCipher.isNullOrBlank() && !storedIv.isNullOrBlank()) {
            return runCatching {
                val cipherBytes = Base64.decode(storedCipher, Base64.NO_WRAP)
                val ivBytes = Base64.decode(storedIv, Base64.NO_WRAP)
                val cipher = Cipher.getInstance(AES_MODE)
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, ivBytes))
                cipher.doFinal(cipherBytes)
            }.getOrElse {
                createAndPersistPassphrase(prefs, key)
            }
        }

        return createAndPersistPassphrase(prefs, key)
    }

    fun resetPassphrase(context: Context) {
        runCatching {
            val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()

            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            if (keyStore.containsAlias(KEY_ALIAS)) {
                keyStore.deleteEntry(KEY_ALIAS)
            }
        }
    }

    private fun createAndPersistPassphrase(
        prefs: android.content.SharedPreferences,
        key: SecretKey
    ): ByteArray {
        val raw = ByteArray(32)
        SecureRandom().nextBytes(raw)

        val cipher = Cipher.getInstance(AES_MODE)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val encrypted = cipher.doFinal(raw)

        prefs.edit()
            .putString(PREF_CIPHER, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(PREF_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .apply()

        return raw
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val existing = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
        if (existing != null) return existing

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .setKeySize(256)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }
}
