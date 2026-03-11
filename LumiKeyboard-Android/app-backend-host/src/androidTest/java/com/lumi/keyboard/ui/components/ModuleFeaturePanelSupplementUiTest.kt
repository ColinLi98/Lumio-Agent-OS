package com.lumi.keyboard.ui.components

import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.lumi.keyboard.ui.model.AppModule
import com.lumi.keyboard.testing.DeviceReadyRule
import com.lumi.keyboard.testing.bootstrapComposeHost
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.RuleChain
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ModuleFeaturePanelSupplementUiTest {

    private val deviceReadyRule = DeviceReadyRule()
    private val composeRule = createAndroidComposeRule<ComponentActivity>()

    @get:Rule
    val rules: RuleChain = RuleChain.outerRule(deviceReadyRule).around(composeRule)

    @Before
    fun bootstrapHost() {
        bootstrapComposeHost(composeRule)
    }

    @Test
    fun globalSupplementCard_submitSendsPromptToAgent() {
        val submittedPrompts = mutableListOf<String>()
        val originalRequest = "Need a reliable supplier for event logistics."

        composeRule.setContent {
            MaterialTheme {
                GlobalSupplementCard(
                    module = AppModule.LIX,
                    latestUserRequest = originalRequest,
                    onSubmit = { prompt -> submittedPrompts += prompt }
                )
            }
        }

        composeRule.onNodeWithContentDescription("Global Supplement Input")
            .performTextInput("Budget cap 3000, delivery before Friday.")
        composeRule.onNodeWithContentDescription("Global Submit Supplement").performClick()
        composeRule.onNodeWithContentDescription("Global Supplement Input")
            .performTextInput("Second round: add warranty requirement.")
        composeRule.onNodeWithContentDescription("Global Submit Supplement").performClick()

        composeRule.runOnIdle {
            val latest = submittedPrompts.lastOrNull()
            assertNotNull("Global supplement should trigger a continuation prompt", latest)
            assertEquals(2, submittedPrompts.size)
            assertTrue(submittedPrompts[0].contains("New details: Budget cap 3000, delivery before Friday."))
            assertTrue(latest!!.contains("Supplemental user update for module ${AppModule.LIX.label}."))
            assertTrue(latest.contains("Original request: $originalRequest"))
            assertTrue(latest.contains("New details: Second round: add warranty requirement."))
            assertTrue(latest.contains("Re-plan and continue execution with this new context, then return an executable solution."))
        }
    }
}
