package com.lumi.keyboard.ui.screens

import org.junit.Assert.assertEquals
import org.junit.Test

class GoalHubPromptBuilderTest {

    @Test
    fun toGoalPrompt_includesAllOptionalConstraintsWhenPresent() {
        val input = GoalBriefInput(
            goal = "Plan my London to Beijing week",
            budget = "5000 CNY",
            deadline = "10 days",
            acceptanceCriteria = "Bookable itinerary",
            confirmationToken = "CONFIRM-LIX-003"
        )

        val prompt = input.toGoalPrompt()

        assertEquals(
            """
            Plan my London to Beijing week
            Budget: 5000 CNY
            Deadline: 10 days
            Acceptance criteria: Bookable itinerary
            Confirmation token: CONFIRM-LIX-003
            """.trimIndent(),
            prompt
        )
    }

    @Test
    fun toGoalPrompt_omitsBlankConstraintLines() {
        val input = GoalBriefInput(
            goal = "Find the best Android tablet",
            budget = " ",
            deadline = "",
            acceptanceCriteria = "Top 3 options with evidence",
            confirmationToken = ""
        )

        val prompt = input.toGoalPrompt()

        assertEquals(
            """
            Find the best Android tablet
            Acceptance criteria: Top 3 options with evidence
            """.trimIndent(),
            prompt
        )
    }

    @Test
    fun toGoalPrompt_extractsInlineConstraintsFromGoalWhenAdvancedFieldsAreBlank() {
        val input = GoalBriefInput(
            goal = "London to Jersey round trip Monday to Wednesday Budget: 1200 GBP Deadline: 2026-03-01 Acceptance criteria: flight hotel restaurant options with links Confirmation token: CONFIRM-JERSEY-001",
            budget = "",
            deadline = "",
            acceptanceCriteria = "",
            confirmationToken = ""
        )

        val prompt = input.toGoalPrompt()

        assertEquals(
            """
            London to Jersey round trip Monday to Wednesday Budget: 1200 GBP Deadline: 2026-03-01 Acceptance criteria: flight hotel restaurant options with links Confirmation token: CONFIRM-JERSEY-001
            Budget: 1200 GBP
            Deadline: 2026-03-01
            Acceptance criteria: flight hotel restaurant options with links
            Confirmation token: CONFIRM-JERSEY-001
            """.trimIndent(),
            prompt
        )
    }
}
