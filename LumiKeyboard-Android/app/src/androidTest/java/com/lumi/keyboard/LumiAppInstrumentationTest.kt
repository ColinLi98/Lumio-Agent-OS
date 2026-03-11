package com.lumi.keyboard

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LumiAppInstrumentationTest {

    private lateinit var device: UiDevice
    private lateinit var targetContext: Context

    @Before
    fun setup() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        targetContext = instrumentation.targetContext
        device = UiDevice.getInstance(instrumentation)
        UiModePreferences.setDeveloperModeEnabled(targetContext, true)
        ensureDeviceReady()
    }

    @Test
    fun launcherActivity_isResolvable() {
        val launchIntent = targetContext.packageManager.getLaunchIntentForPackage(targetContext.packageName)
        assertNotNull("Launcher intent must exist", launchIntent)
        val resolved = targetContext.packageManager.resolveActivity(
            launchIntent!!,
            PackageManager.MATCH_DEFAULT_ONLY
        )
        assertNotNull("Launcher activity must be resolvable", resolved)
        assertEquals(targetContext.packageName, resolved?.activityInfo?.packageName)
        assertTrue(
            "Launcher entry must resolve to MainActivity",
            resolved?.activityInfo?.name?.endsWith("MainActivity") == true
        )
    }

    @Test
    fun deepLinks_resolveToMainActivity() {
        val routes = listOf(
            "lumi://chat",
            "lumi://lix/intent/latest",
            "lumi://agent-market",
            "lumi://avatar",
            "lumi://destiny",
            "lumi://settings"
        )

        routes.forEach { route ->
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(route)).apply {
                addCategory(Intent.CATEGORY_DEFAULT)
                addCategory(Intent.CATEGORY_BROWSABLE)
                setPackage(targetContext.packageName)
            }
            val resolved = targetContext.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
            assertNotNull("Route must resolve: $route", resolved)
            assertEquals(targetContext.packageName, resolved?.activityInfo?.packageName)
            assertTrue(
                "Route must resolve to MainActivity: $route",
                resolved?.activityInfo?.name?.endsWith("MainActivity") == true
            )
        }
    }

    @Test
    fun imeService_isDeclaredForSystemInputMethod() {
        val inputMethodIntent = Intent("android.view.InputMethod").setPackage(targetContext.packageName)
        val services = targetContext.packageManager.queryIntentServices(inputMethodIntent, 0)
        assertTrue(
            "LumiIME service must be declared as input method",
            services.any { it.serviceInfo.name.endsWith("LumiIME") }
        )
    }

    @Test
    fun surfacesAndWorkModules_showMatchingPageContent() {
        launchMainActivity()
        clickSurfaceAndAssert("Goals", "Lumi Agent OS · Goal Hub")
        clickSurfaceAndAssert("Work", "OS Capability Surfaces")
        openWorkModuleAndAssert("Home", "Home Overview")
        openWorkModuleAndAssert("Chat", "Lumi OS · Execution Track")
        openWorkModuleAndAssert("LIX Market", "LIX · Intent Exchange OS")
        openWorkModuleAndAssert("Agent", "Agent · Market Execution Panel")
        openWorkModuleAndAssert("Avatar", "13D Bayesian Practical Twin")
        openWorkModuleAndAssert("Navigation", "Navigation · Bellman Path Suggestions")
        clickSurfaceAndAssert("Activity", "Agent OS Operations Board")
    }

    @Test
    fun chatQuickAction_triggersRequestFeedback() {
        launchMainActivity()
        openWorkModuleAndAssert("Chat", "Chat Orchestration")
        assertTrue(
            "Chat action button must be clickable",
            clickByTextContains("Refine")
        )

        val hasFeedback = waitAnyText(
            listOf(
                "Running",
                "Multi-Agent Collaboration Map",
                "Cloud Decomposition and Reasoning",
                "Strict gates",
                "Missing requirements",
                "Next action:"
            ),
            timeoutMs = CHAT_RESULT_TIMEOUT_MS
        )
        val placeholderGone = waitForTextGone(EMPTY_OUTPUT_PLACEHOLDER, CHAT_RESULT_TIMEOUT_MS)
        assertTrue(
            "Chat action must produce request feedback",
            hasFeedback || placeholderGone
        )
    }

    @Test
    fun lixQuickAction_triggersRequestFeedback() {
        launchMainActivity()
        val baselineRuns = snapshotActivityRunsCount()
        openWorkModuleAndAssert("LIX Market", "LIX Intent Exchange")
        assertTrue(
            "LIX quick action must be clickable",
            clickByTextContains("Publish Template")
        )

        val hasInlineFeedback = waitAnyText(
            listOf(
                "Running LIX workflow",
                "Execution status running",
                "Execution status success",
                "Execution status partial",
                "Execution status error"
            ),
            timeoutMs = 45_000L
        )
        val hasActivityEvidence = waitForActivityRunsToIncrease(
            baselineRuns = baselineRuns,
            timeoutMs = CHAT_RESULT_TIMEOUT_MS
        )
        assertTrue("LIX action must produce request feedback", hasInlineFeedback || hasActivityEvidence)
    }

    @Test
    fun agentQuickAction_triggersRequestFeedback() {
        launchMainActivity()
        val baselineRuns = snapshotActivityRunsCount()
        openWorkModuleAndAssert("Agent", "Agent Marketplace")
        assertTrue(
            "Agent quick action must be clickable",
            clickByTextContains("Discover")
        )

        val hasInlineFeedback = waitAnyText(
            listOf(
                "Running agent orchestration",
                "Execution status running",
                "Execution status success",
                "Execution status partial",
                "Execution status error"
            ),
            timeoutMs = 45_000L
        )
        val hasActivityEvidence = waitForActivityRunsToIncrease(
            baselineRuns = baselineRuns,
            timeoutMs = CHAT_RESULT_TIMEOUT_MS
        )
        assertTrue("Agent action must produce request feedback", hasInlineFeedback || hasActivityEvidence)
    }

    @Test
    fun openClawRelay_healthEndpoint_isReachableFromDeviceLoopback() {
        val body = waitForOpenClawHealth()
        val isOk = body.contains("\"status\":\"ok\"") || body.contains("\"status\": \"ok\"")
        val gatewayReachable = body.contains("\"gateway_reachable\":true") || body.contains("\"gateway_reachable\": true")
        assertTrue(
            "OpenClaw health endpoint is not reachable from device loopback. Ensure relay is running and run `adb reverse tcp:8902 tcp:8902`. body=$body",
            isOk && gatewayReachable
        )
    }

    @Test
    fun chatSubmit_fullConstraints_returnsNonEmptyFinalOutputWithoutConstraintLoop() {
        val healthBody = waitForOpenClawHealth()
        val healthOk = healthBody.contains("\"status\":\"ok\"") || healthBody.contains("\"status\": \"ok\"")
        assertTrue(
            "OpenClaw must be healthy before chat regression. body=$healthBody",
            healthOk
        )

        launchMainActivity()
        val baselineRuns = snapshotActivityRunsCount()
        submitGoalPlanQuery(FULL_CONSTRAINT_QUERY)
        openWorkModuleAndAssert("Chat", "Chat Orchestration")
        val hasStatusSignal = waitAnyText(
            candidates = listOf(
                "Execution status:",
                "Status: running",
                "Status: success",
                "Status: partial",
                "Status: waiting for user input"
            ),
            timeoutMs = CHAT_RESULT_TIMEOUT_MS
        )
        val hasActivityEvidence = waitForActivityRunsToIncrease(
            baselineRuns = baselineRuns,
            timeoutMs = CHAT_RESULT_TIMEOUT_MS
        )
        val placeholderGone = waitForTextGone(EMPTY_OUTPUT_PLACEHOLDER, CHAT_RESULT_TIMEOUT_MS)
        assertTrue(
            "Chat request did not produce visible result signals within timeout.",
            hasStatusSignal || hasActivityEvidence || placeholderGone
        )

        val openedRequirementsGate = device.hasObject(By.textContains("Complete requirements")) ||
            device.hasObject(By.textContains("Requirements needed before execution")) ||
            device.hasObject(By.textContains("Missing requirements"))
        assertTrue(
            "Chat flow should not return to requirements gate after full constraint submission.",
            !openedRequirementsGate
        )

        val hasPlaceholder = device.hasObject(By.textContains(EMPTY_OUTPUT_PLACEHOLDER))
        assertTrue(
            "Final output should not remain the empty placeholder state.",
            !hasPlaceholder
        )
        val hasMissingBudget = device.hasObject(By.textContains("Missing fields: budget, deadline, acceptance_criteria"))
        val hasMissingToken = device.hasObject(By.textContains("Missing fields: user_confirmation_token"))
        assertTrue(
            "Final output should not report missing constraints.",
            !hasMissingBudget && !hasMissingToken
        )
    }

    private fun launchMainActivity() {
        val launchIntent = targetContext.packageManager.getLaunchIntentForPackage(targetContext.packageName)
        assertNotNull("Launcher intent must exist", launchIntent)
        val activityClass = launchIntent?.component?.className ?: "com.lumi.keyboard.MainActivity"
        val preparedIntent = launchIntent!!.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        )

        var visible = false
        var shellOutput = ""
        repeat(3) {
            unlockIfNeeded()
            targetContext.startActivity(preparedIntent)
            dismissSystemDialogsIfNeeded()
            visible = waitForMainActivityUi()
            if (!visible) {
                shellOutput = device.executeShellCommand("am start -W -n ${targetContext.packageName}/$activityClass")
                dismissSystemDialogsIfNeeded()
                unlockIfNeeded()
                visible = waitForMainActivityUi()
            }
            if (visible) return@repeat
            device.pressHome()
            unlockIfNeeded()
            Thread.sleep(800)
        }

        assertTrue("Main activity must become visible. shellOutput=$shellOutput", visible)
    }

    private fun clickSurfaceAndAssert(surfaceText: String, expectedPageMarker: String) {
        val clicked = clickSurface(surfaceText)
        assertTrue("Surface not visible: $surfaceText", clicked)
        assertTrue(
            "Page marker not visible after clicking $surfaceText",
            device.wait(Until.hasObject(By.textContains(expectedPageMarker)), UI_TIMEOUT_MS)
        )
    }

    private fun openWorkModuleAndAssert(moduleChipText: String, expectedPageMarker: String) {
        clickSurfaceAndAssert("Work", "OS Capability Surfaces")
        assertTrue(
            "Work module not visible: $moduleChipText",
            clickByTextContains(moduleChipText, clickableOnly = true)
        )
        val moduleLabel = if (moduleChipText == "LIX Market") "LIX" else moduleChipText
        assertTrue(
            "Control center did not switch to module $moduleLabel",
            waitAnyText(
                listOf(
                    "Surface: Work · Module: $moduleLabel",
                    "Surface: Work · Module: ${moduleLabel.uppercase()}"
                ),
                timeoutMs = UI_TIMEOUT_MS
            )
        )
        assertTrue(
            "Page marker not visible after selecting module $moduleChipText",
            waitForTextWithScroll(expectedPageMarker, timeoutMs = UI_TIMEOUT_MS)
        )
    }

    private fun waitAnyText(candidates: List<String>, timeoutMs: Long = UI_TIMEOUT_MS): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            if (candidates.any { device.hasObject(By.textContains(it)) }) {
                return true
            }
            Thread.sleep(250)
        }
        return false
    }

    private fun waitForTextGone(text: String, timeoutMs: Long = UI_TIMEOUT_MS): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            if (!device.hasObject(By.textContains(text))) {
                return true
            }
            Thread.sleep(250)
        }
        return false
    }

    private fun waitForTextWithScroll(text: String, timeoutMs: Long = UI_TIMEOUT_MS): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        var scrollDown = true
        while (System.currentTimeMillis() < end) {
            if (device.hasObject(By.textContains(text))) {
                return true
            }
            val centerX = device.displayWidth / 2
            if (scrollDown) {
                device.swipe(
                    centerX,
                    (device.displayHeight * 0.78f).toInt(),
                    centerX,
                    (device.displayHeight * 0.35f).toInt(),
                    24
                )
            } else {
                device.swipe(
                    centerX,
                    (device.displayHeight * 0.35f).toInt(),
                    centerX,
                    (device.displayHeight * 0.82f).toInt(),
                    24
                )
            }
            scrollDown = !scrollDown
            Thread.sleep(220)
        }
        return false
    }

    private fun clickByTextContains(text: String, clickableOnly: Boolean = false): Boolean {
        repeat(6) {
            val node = device.wait(Until.findObject(By.clickable(true).textContains(text)), 1_200)
                ?: if (clickableOnly) {
                    null
                } else {
                    device.wait(Until.findObject(By.textContains(text)), 1_200)
                }
            if (node != null) {
                node.click()
                return true
            }
            val centerX = device.displayWidth / 2
            device.swipe(
                centerX,
                (device.displayHeight * 0.78f).toInt(),
                centerX,
                (device.displayHeight * 0.35f).toInt(),
                24
            )
        }
        return false
    }

    private fun clickByDescContains(desc: String, clickableOnly: Boolean = false): Boolean {
        repeat(6) {
            val node = device.wait(Until.findObject(By.clickable(true).descContains(desc)), 1_200)
                ?: if (clickableOnly) {
                    null
                } else {
                    device.wait(Until.findObject(By.descContains(desc)), 1_200)
                }
            if (node != null) {
                node.click()
                return true
            }
            val centerX = device.displayWidth / 2
            device.swipe(
                centerX,
                (device.displayHeight * 0.78f).toInt(),
                centerX,
                (device.displayHeight * 0.35f).toInt(),
                24
            )
        }
        return false
    }

    private fun waitForOpenClawHealth(): String {
        val end = System.currentTimeMillis() + OPENCLAW_HEALTH_TIMEOUT_MS
        var lastBody = ""
        while (System.currentTimeMillis() < end) {
            lastBody = runCatching {
                val curlBody = device.executeShellCommand("curl -sS -m 6 $OPENCLAW_HEALTH_URL").trim()
                if (curlBody.isNotBlank()) {
                    curlBody
                } else {
                    device.executeShellCommand("toybox wget -qO- $OPENCLAW_HEALTH_URL").trim()
                }
            }.getOrDefault("")
            val isHealthy =
                (lastBody.contains("\"status\":\"ok\"") || lastBody.contains("\"status\": \"ok\"")) &&
                    (lastBody.contains("\"gateway_reachable\":true") || lastBody.contains("\"gateway_reachable\": true"))
            if (isHealthy) return lastBody
            Thread.sleep(1_000)
        }
        return lastBody
    }

    private fun submitGoalPlanQuery(query: String) {
        clickSurfaceAndAssert("Goals", "Lumi Agent OS · Goal Hub")
        val goalInput = device.wait(Until.findObject(By.descContains("Goal Input")), UI_TIMEOUT_MS)
            ?: device.wait(Until.findObject(By.desc("Goal Input")), UI_TIMEOUT_MS)
        assertNotNull("Goal input must be visible", goalInput)
        goalInput!!.click()
        goalInput.setText(query)
        device.pressEnter()
        val submittedViaIme = waitAnyText(
            listOf(
                "Surface: Work · Module: Chat",
                "OS Capability Surfaces"
            ),
            timeoutMs = 6_000L
        )
        if (submittedViaIme) return
        device.pressBack()
        assertTrue(
            "Run Plan button must be clickable after entering goal",
            clickByDescContains("Run Plan", clickableOnly = true) ||
                clickByTextContains("Run Plan", clickableOnly = true) ||
                clickByTextContains("Run Plan")
        )
    }

    private fun snapshotActivityRunsCount(): Int {
        clickSurfaceAndAssert("Activity", "Agent OS Operations Board")
        return readActivityRunsCount() ?: 0
    }

    private fun waitForActivityRunsToIncrease(
        baselineRuns: Int,
        timeoutMs: Long = UI_TIMEOUT_MS
    ): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            runCatching { clickSurface("Activity") }
            val current = runCatching { readActivityRunsCount() }.getOrNull()
            if (current != null && current > baselineRuns) {
                return true
            }
            Thread.sleep(350)
        }
        return false
    }

    private fun readActivityRunsCount(): Int? {
        val runsNode = device.wait(Until.findObject(By.textStartsWith("Runs ")), 2_500)
            ?: device.wait(Until.findObject(By.textContains("Runs ")), 2_500)
            ?: return null
        val text = runCatching { runsNode.text }.getOrNull() ?: return null
        return Regex("""Runs\s+(\d+)""")
            .find(text)
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
    }

    private fun waitForMainActivityUi(): Boolean {
        val end = System.currentTimeMillis() + LAUNCH_TIMEOUT_MS
        while (System.currentTimeMillis() < end) {
            if (device.hasObject(By.pkg(targetContext.packageName))) return true
            if (device.hasObject(By.text("Goals"))) return true
            if (device.hasObject(By.text("Work"))) return true
            if (device.hasObject(By.desc("Goals"))) return true
            if (device.hasObject(By.desc("Work"))) return true
            if (device.hasObject(By.textContains("Lumi Agent OS · Goal Hub"))) return true
            if (isMainActivityResumedViaDumpsys()) return true
            Thread.sleep(250)
        }
        return false
    }

    private fun findSurface(surfaceText: String) =
        device.wait(Until.findObject(By.text(surfaceText)), 2_000)
            ?: device.wait(Until.findObject(By.desc(surfaceText)), 2_000)
            ?: device.wait(Until.findObject(By.descContains(surfaceText)), 2_000)

    private fun clickSurface(surfaceText: String): Boolean {
        val direct = findSurface(surfaceText)
        if (direct != null) {
            val clickedDirectly = runCatching {
                direct.click()
                true
            }.getOrElse { false }
            if (clickedDirectly) {
                return true
            }
        }

        val index = surfaceOrder.indexOf(surfaceText)
        if (index < 0) return false
        val x = (((index + 0.5f) / surfaceOrder.size.toFloat()) * device.displayWidth).toInt()
        val y = (device.displayHeight * 0.965f).toInt()
        val clicked = device.click(x, y)
        Thread.sleep(350)
        return clicked
    }

    private fun isMainActivityResumedViaDumpsys(): Boolean {
        val output = runCatching {
            device.executeShellCommand("dumpsys activity activities")
        }.getOrNull() ?: return false

        return output.contains("${targetContext.packageName}/com.lumi.keyboard.MainActivity") &&
            (
                output.contains("ResumedActivity", ignoreCase = true) ||
                    output.contains("mResumedActivity", ignoreCase = true)
                )
    }

    private fun dismissSystemDialogsIfNeeded() {
        val actionTexts = listOf(
            "Allow",
            "允许",
            "While using the app",
            "仅在使用应用时允许",
            "Only this time",
            "仅此一次",
            "Continue",
            "继续",
            "OK",
            "确定"
        )
        actionTexts.forEach { text ->
            device.wait(Until.findObject(By.textContains(text)), 600)?.click()
        }
    }

    private fun ensureDeviceReady() {
        if (!device.isScreenOn) {
            device.wakeUp()
        }
        device.pressHome()
        unlockIfNeeded()
        device.waitForIdle()
    }

    private fun unlockIfNeeded() {
        repeat(4) {
            if (!isKeyguardLikelyShowing()) return
            runCatching { device.executeShellCommand("wm dismiss-keyguard") }
            device.pressMenu()
            val centerX = device.displayWidth / 2
            device.swipe(
                centerX,
                (device.displayHeight * 0.85f).toInt(),
                centerX,
                (device.displayHeight * 0.25f).toInt(),
                24
            )
            Thread.sleep(500)
        }
    }

    private fun isKeyguardLikelyShowing(): Boolean {
        if (device.hasObject(By.pkg(targetContext.packageName))) return false
        if (device.hasObject(By.textContains("Home Overview"))) return false
        if (device.hasObject(By.text("Goals")) || device.hasObject(By.text("Work"))) return false
        if (device.hasObject(By.desc("Goals")) || device.hasObject(By.desc("Work"))) return false
        return device.hasObject(By.pkg("com.android.systemui"))
    }

    companion object {
        private const val UI_TIMEOUT_MS = 10_000L
        private const val LAUNCH_TIMEOUT_MS = 20_000L
        private const val CHAT_RESULT_TIMEOUT_MS = 120_000L
        private const val OPENCLAW_HEALTH_TIMEOUT_MS = 20_000L
        private const val OPENCLAW_HEALTH_URL = "http://127.0.0.1:8902/health"
        private const val EMPTY_OUTPUT_PLACEHOLDER = "No results yet. Submit a prompt to see output here."
        private const val FULL_CONSTRAINT_QUERY =
            "Build a reusable recruiting screening agent Budget:3000 GBP Deadline:this Friday Acceptance criteria:runnable demo and test report Confirmation token:CONFIRM-AGENT-003"
        private val surfaceOrder = listOf("Goals", "Work", "Activity")
    }
}
