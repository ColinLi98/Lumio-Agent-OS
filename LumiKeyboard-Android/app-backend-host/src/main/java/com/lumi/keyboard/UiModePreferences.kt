package com.lumi.keyboard

import android.content.Context

object UiModePreferences {
    private const val PREF_NAME = "lumi_ui_mode_prefs"
    private const val KEY_DEVELOPER_MODE = "developer_mode_enabled"
    private const val KEY_DEVELOPER_MODE_USER_SET = "developer_mode_user_set"
    private const val ENGINEERING_SUFFIX = ".engineering"

    fun isDeveloperModeEnabled(context: Context): Boolean {
        if (!isEngineeringBuild(context)) {
            return false
        }
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val explicitlySet = prefs.getBoolean(KEY_DEVELOPER_MODE_USER_SET, false)
        return if (explicitlySet && prefs.contains(KEY_DEVELOPER_MODE)) {
            prefs.getBoolean(KEY_DEVELOPER_MODE, false)
        } else {
            prefs.edit()
                .putBoolean(KEY_DEVELOPER_MODE, false)
                .putBoolean(KEY_DEVELOPER_MODE_USER_SET, false)
                .apply()
            false
        }
    }

    fun setDeveloperModeEnabled(context: Context, enabled: Boolean) {
        if (!isEngineeringBuild(context)) {
            return
        }
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_DEVELOPER_MODE, enabled)
            .putBoolean(KEY_DEVELOPER_MODE_USER_SET, true)
            .apply()
    }

    fun isEngineeringBuild(context: Context): Boolean {
        return context.packageName.endsWith(ENGINEERING_SUFFIX)
    }
}
