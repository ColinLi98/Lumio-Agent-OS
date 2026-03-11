package com.lumi.keyboard

import android.content.Context

object ImePreferenceStore {
    private const val PREF_NAME = "lumi_ime_prefs"
    private const val KEY_PREFERRED_CHINESE_IME_PACKAGE = "preferred_chinese_ime_package"

    const val FCITX_PACKAGE = "org.fcitx.fcitx5.android"
    const val TRIME_PACKAGE = "com.osfans.trime"

    fun getPreferredChineseImePackage(context: Context): String {
        val value = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .getString(KEY_PREFERRED_CHINESE_IME_PACKAGE, FCITX_PACKAGE)
            ?.trim()
            .orEmpty()
        return if (value.isEmpty()) FCITX_PACKAGE else value
    }

    fun setPreferredChineseImePackage(context: Context, packageName: String) {
        val normalized = packageName.trim().ifEmpty { FCITX_PACKAGE }
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PREFERRED_CHINESE_IME_PACKAGE, normalized)
            .apply()
    }

    fun isKnownOpenSourceChineseIme(packageName: String?): Boolean {
        if (packageName.isNullOrBlank()) return false
        return packageName == FCITX_PACKAGE || packageName == TRIME_PACKAGE
    }
}
