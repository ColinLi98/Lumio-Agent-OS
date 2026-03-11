package com.lumi.keyboard.ui.screens

import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.lumi.coredomain.contract.ClarificationOptionPayload
import com.lumi.coredomain.contract.ClarificationQuestionPayload
import com.lumi.coredomain.contract.GateType
import com.lumi.coredomain.contract.InteractionEventType
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.keyboard.ui.components.SmartBriefComposer
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
class GoalWorkFlowUiTest {

    private val deviceReadyRule = DeviceReadyRule()
    private val composeRule = createAndroidComposeRule<ComponentActivity>()

    @get:Rule
    val rules: RuleChain = RuleChain.outerRule(deviceReadyRule).around(composeRule)

    @Before
    fun bootstrapHost() {
        bootstrapComposeHost(composeRule)
    }

    @Test
    fun smartBriefComposer_imeSendSubmitsWhenGoalPresent() {
        val goalState = mutableStateOf("")
        var runCount = 0

        composeRule.setContent {
            MaterialTheme {
                SmartBriefComposer(
                    goal = goalState.value,
                    budget = "",
                    deadline = "",
                    acceptanceCriteria = "",
                    confirmationToken = "",
                    loading = false,
                    showAdvanced = false,
                    onGoalChange = { goalState.value = it },
                    onBudgetChange = {},
                    onDeadlineChange = {},
                    onAcceptanceChange = {},
                    onTokenChange = {},
                    onToggleAdvanced = {},
                    onApplyTemplate = {},
                    onRunPlan = { runCount += 1 }
                )
            }
        }

        composeRule.onNodeWithContentDescription("Run Plan").assertIsNotEnabled()
        composeRule.onNodeWithContentDescription("Goal Input").performTextInput("Plan one week London to Beijing")
        composeRule.onNodeWithContentDescription("Goal Input").performImeAction()

        composeRule.runOnIdle {
            assertTrue("IME send should trigger onRunPlan exactly once", runCount == 1)
        }
    }

    @Test
    fun chatScreen_incompleteInput_allowsStructuredRequirementSubmit() {
        var submittedPrompt: String? = null
        val customerRequest = "请帮我下周去北京，预算控制在五千内"
        val question = ClarificationQuestionPayload(
            id = "clarify_budget",
            prompt = "Which budget range should we use?",
            reason = "Budget is required by Gate R1.",
            impactsGate = GateType.GATE_R1_REQUIRE_CONSTRAINTS,
            options = listOf(
                ClarificationOptionPayload("b1", "Budget under 5000 CNY", "Under 5000 CNY"),
                ClarificationOptionPayload("b2", "Budget 5000-10000 CNY", "5000-10000 CNY")
            )
        )

        composeRule.setContent {
            MaterialTheme {
                ClarificationQuestionCard(
                    question = question,
                    fallbackPrompt = question.prompt,
                    fallbackReason = question.reason,
                    customerRequest = customerRequest,
                    onAnswer = { prompt -> submittedPrompt = prompt }
                )
            }
        }

        composeRule.onNodeWithText("Complete requirements")
        composeRule.onNodeWithText("Customer request: $customerRequest")
        composeRule.onNodeWithContentDescription("Requirements Budget Input").performTextInput("<= 5000 CNY")
        composeRule.onNodeWithContentDescription("Requirements Deadline Input").performTextInput("2026-03-10")
        composeRule.onNodeWithText("Submit requirements").performClick()

        composeRule.runOnIdle {
            val prompt = submittedPrompt
            assertNotNull("Submitting requirement form should send follow-up prompt", prompt)
            assertTrue(prompt!!.contains("Customer request: $customerRequest"))
            assertTrue(prompt.contains("Clarification id: clarify_budget"))
            assertTrue(prompt.contains("Budget: <= 5000 CNY"))
            assertTrue(prompt.contains("Deadline: 2026-03-10"))
            assertTrue(prompt.contains("Continue execution and return a complete executable solution with verifiable evidence."))
        }
    }

    @Test
    fun clarificationQuestionCard_supportsSecondRoundFollowUpReplies() {
        val submittedPrompts = mutableListOf<String>()
        val question = ClarificationQuestionPayload(
            id = "clarify_scope",
            prompt = "What constraints should we apply next?",
            reason = "Cloud execution requested more detail.",
            impactsGate = GateType.GATE_R1_REQUIRE_CONSTRAINTS,
            options = listOf(
                ClarificationOptionPayload("o1", "Prioritize low cost", "Low cost first"),
                ClarificationOptionPayload("o2", "Prioritize speed", "Fastest execution")
            )
        )

        composeRule.setContent {
            MaterialTheme {
                ClarificationQuestionCard(
                    question = question,
                    fallbackPrompt = question.prompt,
                    fallbackReason = question.reason,
                    customerRequest = "Find a complete executable plan",
                    onAnswer = { prompt -> submittedPrompts += prompt }
                )
            }
        }

        composeRule.onAllNodesWithText("What constraints should we apply next?").assertCountEquals(1)
        composeRule.onNodeWithContentDescription("Requirements Budget Input").performTextInput("<= 5000 CNY")
        composeRule.onNodeWithText("Submit requirements").performClick()

        composeRule.onNodeWithContentDescription("Requirements Notes Input").performTextInput("第二轮补充：优先地铁附近")
        composeRule.onNodeWithText("Submit requirements").performClick()

        composeRule.runOnIdle {
            assertEquals(2, submittedPrompts.size)
            assertTrue(submittedPrompts[0].contains("Clarification id: clarify_scope"))
            assertTrue(submittedPrompts[0].contains("Budget: <= 5000 CNY"))
            assertTrue(submittedPrompts[1].contains("Clarification id: clarify_scope"))
            assertTrue(submittedPrompts[1].contains("User input: 第二轮补充：优先地铁附近"))
        }
    }

    @Test
    fun chatScreen_outcomeFeedbackImprove_triggersTwinUpdateCallbackAndEvent() {
        var submittedFeedback: String? = null
        val trackedEvents = mutableListOf<Pair<InteractionEventType, Map<String, String>>>()

        composeRule.setContent {
            MaterialTheme {
                OutcomeFeedbackCard(
                    responseStatus = ResponseStatus.SUCCESS,
                    onFeedback = { feedback ->
                        val eventType = when (feedback) {
                            "solved" -> InteractionEventType.TASK_CONFIRM
                            "not_useful" -> InteractionEventType.TASK_CANCEL
                            else -> InteractionEventType.QUERY_REFINE
                        }
                        trackedEvents += eventType to mapOf(
                            "trace_id" to "trace-ui-test-002",
                            "feedback" to feedback,
                            "feedback_source" to "explicit_feedback_panel"
                        )
                        submittedFeedback = feedback
                    }
                )
            }
        }

        composeRule.onAllNodesWithText("Outcome feedback").assertCountEquals(1)
        composeRule.onAllNodesWithContentDescription("Outcome Feedback Improve").assertCountEquals(1)
        composeRule.onNodeWithContentDescription("Outcome Feedback Improve").performClick()

        composeRule.runOnIdle {
            assertEquals("needs_improvement", submittedFeedback)
            val feedbackEvent = trackedEvents.lastOrNull()
            assertNotNull(feedbackEvent)
            assertEquals(InteractionEventType.QUERY_REFINE, feedbackEvent!!.first)
            assertEquals("needs_improvement", feedbackEvent.second["feedback"])
            assertEquals("explicit_feedback_panel", feedbackEvent.second["feedback_source"])
            assertEquals("trace-ui-test-002", feedbackEvent.second["trace_id"])
        }
    }

    @Test
    fun inProcessSupplementCard_submitSendsFollowUpPrompt() {
        var submittedPrompt: String? = null
        val originalRequest = "帮我规划本周需要完成的任务"

        composeRule.setContent {
            MaterialTheme {
                InProcessSupplementCard(
                    responseStatus = ResponseStatus.RUNNING,
                    latestUserRequest = originalRequest,
                    onSubmit = { prompt -> submittedPrompt = prompt }
                )
            }
        }

        composeRule.onNodeWithContentDescription("Supplement Input")
            .performTextInput("加上预算上限 3000，并优先远程完成")
        composeRule.onNodeWithContentDescription("Submit Supplement").performClick()

        composeRule.runOnIdle {
            val prompt = submittedPrompt
            assertNotNull("Submitting supplement should produce a follow-up prompt", prompt)
            assertTrue(prompt!!.contains("Supplemental update from user during execution."))
            assertTrue(prompt.contains("Original request: $originalRequest"))
            assertTrue(prompt.contains("New details: 加上预算上限 3000，并优先远程完成"))
            assertTrue(prompt.contains("Re-plan and continue execution with this updated context."))
        }
    }

    @Test
    fun inProcessSupplementCard_supportsMultipleSupplementRounds() {
        val submittedPrompts = mutableListOf<String>()

        composeRule.setContent {
            MaterialTheme {
                InProcessSupplementCard(
                    responseStatus = ResponseStatus.RUNNING,
                    latestUserRequest = "Need an executable launch plan",
                    onSubmit = { prompt -> submittedPrompts += prompt }
                )
            }
        }

        composeRule.onNodeWithContentDescription("Supplement Input")
            .performTextInput("First round: budget <= 5000")
        composeRule.onNodeWithContentDescription("Submit Supplement").performClick()

        composeRule.onNodeWithContentDescription("Supplement Input")
            .performTextInput("Second round: delivery before Friday")
        composeRule.onNodeWithContentDescription("Submit Supplement").performClick()

        composeRule.runOnIdle {
            assertEquals(2, submittedPrompts.size)
            assertTrue(submittedPrompts[0].contains("First round: budget <= 5000"))
            assertTrue(submittedPrompts[1].contains("Second round: delivery before Friday"))
        }
    }
}
