package com.lumi.keyboard.ui.components

import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.lumi.coredomain.contract.AgentResponse
import com.lumi.coredomain.contract.AgentResponseType
import com.lumi.coredomain.contract.ClarificationQuestionPayload
import com.lumi.coredomain.contract.ResponseStatus
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
class UserInteractionHubCardUiTest {

    private val deviceReadyRule = DeviceReadyRule()
    private val composeRule = createAndroidComposeRule<ComponentActivity>()

    @get:Rule
    val rules: RuleChain = RuleChain.outerRule(deviceReadyRule).around(composeRule)

    @Before
    fun bootstrapHost() {
        bootstrapComposeHost(composeRule)
    }

    @Test
    fun submitReply_whenPendingQuestion_presentBuildsClarificationPrompt() {
        var submittedPrompt: String? = null
        var submittedSource: String? = null
        val response = AgentResponse(
            type = AgentResponseType.CARDS,
            traceId = "trace-interaction-hub-1",
            latencyMs = 120,
            confidence = 0.83,
            status = ResponseStatus.WAITING_USER,
            clarificationQuestions = listOf(
                ClarificationQuestionPayload(
                    id = "q_budget",
                    prompt = "What is your budget and deadline?",
                    reason = "Missing execution constraints."
                )
            )
        )

        composeRule.setContent {
            MaterialTheme {
                UserInteractionHubCard(
                    module = AppModule.LIX,
                    response = response,
                    latestUserRequest = "Publish intent and execute with supplier.",
                    loading = false,
                    onSubmitReply = { prompt, source ->
                        submittedPrompt = prompt
                        submittedSource = source
                    }
                )
            }
        }

        composeRule.onNodeWithContentDescription("Interaction Hub Input")
            .performTextInput("Budget 5000, deadline 7 days.")
        composeRule.onNodeWithContentDescription("Interaction Hub Submit").performClick()

        composeRule.runOnIdle {
            assertNotNull(submittedPrompt)
            assertEquals("interaction_hub_pending_question", submittedSource)
            assertTrue(submittedPrompt!!.contains("Pending question: What is your budget and deadline?"))
            assertTrue(submittedPrompt!!.contains("User response: Budget 5000, deadline 7 days."))
            assertTrue(submittedPrompt!!.contains("Continue execution with this response and return an executable next step."))
        }
    }
}
