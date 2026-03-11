package com.lumi.keyboard.ui.components

import org.junit.Assert.assertTrue
import org.junit.Test

class UserInteractionHubPromptBuilderTest {

    @Test
    fun buildPrompt_forPendingQuestion_usesQuestionAndReply() {
        val prompt = buildInteractionHubPrompt(
            moduleLabel = "LIX",
            latestUserRequest = "Publish my intent and find executable offers.",
            pendingQuestion = "What is your budget and deadline?",
            userReply = "Budget 5000, deadline 7 days.",
            awaitingReply = true
        )

        assertTrue(prompt.contains("User response for pending question in module LIX."))
        assertTrue(prompt.contains("Pending question: What is your budget and deadline?"))
        assertTrue(prompt.contains("Original request: Publish my intent and find executable offers."))
        assertTrue(prompt.contains("User response: Budget 5000, deadline 7 days."))
        assertTrue(prompt.contains("Continue execution with this response and return an executable next step."))
    }

    @Test
    fun buildPrompt_forContextUpdate_usesUpdateTemplate() {
        val prompt = buildInteractionHubPrompt(
            moduleLabel = "Agent",
            latestUserRequest = "Build a general research agent.",
            pendingQuestion = null,
            userReply = "Need low latency and explainable evidence links.",
            awaitingReply = false
        )

        assertTrue(prompt.contains("User context update for module Agent."))
        assertTrue(prompt.contains("Original request: Build a general research agent."))
        assertTrue(prompt.contains("Update: Need low latency and explainable evidence links."))
        assertTrue(prompt.contains("Re-plan with this update and continue execution with evidence-backed actions."))
    }
}
