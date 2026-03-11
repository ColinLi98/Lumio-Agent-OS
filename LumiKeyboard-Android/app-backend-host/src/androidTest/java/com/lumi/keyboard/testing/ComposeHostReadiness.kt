package com.lumi.keyboard.testing

import android.app.Activity
import android.os.Build
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.rules.ExternalResource

class DeviceReadyRule : ExternalResource() {
    override fun before() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        runCatching { device.wakeUp() }
        runCatching { device.executeShellCommand("wm dismiss-keyguard") }
        runCatching { device.pressMenu() }
        runCatching { device.pressHome() }
        device.waitForIdle()
    }
}

fun bootstrapComposeHost(activity: Activity) {
    activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(true)
            activity.setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            activity.window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
    InstrumentationRegistry.getInstrumentation().waitForIdleSync()
}

fun bootstrapComposeHost(
    rule: AndroidComposeTestRule<*, ComponentActivity>,
) {
    bootstrapComposeHost(rule.activity)
}
