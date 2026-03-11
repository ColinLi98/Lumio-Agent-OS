package com.lumi.keyboard

/**
 * Backward-compatible facade for status display.
 */
object LumiAgent {

    fun describeBackend(): String {
        return "Run mode: App internal backend core (Foreground Service + Binder)"
    }
}
