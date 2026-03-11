package com.lumi.keyboard.ui.screens

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GoalHubScreenPromptTest {

    @Test
    fun toGoalPrompt_doesNotInjectMarketPolicyByDefault() {
        val prompt = GoalBriefInput(
            goal = "Plan London to Jersey round trip with flights and hotel options",
            budget = "",
            deadline = "",
            acceptanceCriteria = "",
            confirmationToken = ""
        ).toGoalPrompt()

        assertTrue(prompt.contains("Plan London to Jersey round trip", ignoreCase = true))
        assertFalse(prompt.contains("publish to LIX", ignoreCase = true))
        assertFalse(prompt.contains("Market policy", ignoreCase = true))
    }

    @Test
    fun toGoalPrompt_keepsUserProvidedConstraintsOnly() {
        val prompt = GoalBriefInput(
            goal = "Buy an iPhone 16 within my budget",
            budget = "£800",
            deadline = "7 days",
            acceptanceCriteria = "verified offer links",
            confirmationToken = "CONFIRM-LIX-001"
        ).toGoalPrompt()

        assertTrue(prompt.contains("Budget: £800"))
        assertTrue(prompt.contains("Deadline: 7 days"))
        assertTrue(prompt.contains("Acceptance criteria: verified offer links"))
        assertTrue(prompt.contains("Confirmation token: CONFIRM-LIX-001"))
    }
}
