package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AgentDraft
import com.lumi.coredomain.contract.ModuleId

object DraftTemplateEngine {

    fun generateForModule(module: ModuleId, intent: IntentType, rawText: String): List<AgentDraft> {
        return when (module) {
            ModuleId.HOME -> listOf(
                AgentDraft("Home is ready. I can keep pulling the latest status across modules.", "casual", 0.8),
                AgentDraft("Home overview has been refreshed. Next, you can jump to Chat, LIX, Agent, Avatar, or Navigation.", "professional", 0.79),
                AgentDraft("Home updated.", "concise", 0.74)
            )

            ModuleId.SETTINGS -> listOf(
                AgentDraft("I can continue checking API, Serp configuration, and cloud adapter status.", "casual", 0.79),
                AgentDraft("Settings and observability are ready. You can continue connectivity or privacy-policy checks.", "professional", 0.78),
                AgentDraft("Settings updated.", "concise", 0.73)
            )

            else -> generate(intent, rawText)
        }
    }

    fun generate(intent: IntentType, rawText: String): List<AgentDraft> {
        val input = rawText.trim()
        if (input.isBlank()) {
            return listOf(
                AgentDraft("Hi, I'm here.", "casual", 0.7),
                AgentDraft("Got it. Tell me the scenario you want to handle.", "professional", 0.73),
                AgentDraft("I'm here. Continue.", "concise", 0.68)
            )
        }

        return when (intent) {
            IntentType.CHAT_REWRITE -> listOf(
                AgentDraft("I understand your intent. I'll rewrite it into more natural wording.", "casual", 0.86),
                AgentDraft("Received. I will produce a more formal version based on your preferred tone.", "professional", 0.83),
                AgentDraft("Received, rewritten.", "concise", 0.79)
            )

            IntentType.SHOPPING -> listOf(
                AgentDraft("I'll compare options and filter them to fit your budget best.", "casual", 0.84),
                AgentDraft("Purchase decision flow started. I will combine price, reviews, and your preferences for recommendations.", "professional", 0.82),
                AgentDraft("Price comparison started.", "concise", 0.76)
            )

            IntentType.TRAVEL -> listOf(
                AgentDraft("I'll shortlist flights and hotels first, then produce a share-ready itinerary suggestion.", "casual", 0.82),
                AgentDraft("Travel retrieval flow started. I will prioritize practical time-and-price options.", "professional", 0.81),
                AgentDraft("Travel search started.", "concise", 0.75)
            )

            IntentType.CALENDAR -> listOf(
                AgentDraft("I'll organize your schedule and find a time that works for everyone.", "casual", 0.83),
                AgentDraft("Schedule suggestions generated, considering your availability and existing plans.", "professional", 0.81),
                AgentDraft("Schedule organized.", "concise", 0.75)
            )

            IntentType.PRIVACY_MASK -> listOf(
                AgentDraft("I have masked sensitive information. Confirm before sending.", "casual", 0.85),
                AgentDraft("Sensitive data such as phone/address was detected and replaced with redacted format. Please confirm.", "professional", 0.84),
                AgentDraft("Redacted.", "concise", 0.78)
            )

            IntentType.LIX -> listOf(
                AgentDraft("I'll draft negotiation opening lines and bottom-line wording first; complete complex closing in the app.", "casual", 0.8),
                AgentDraft("LIX intent draft generated. Enter the app to review offer evidence and closing paths.", "professional", 0.79),
                AgentDraft("Negotiation draft generated.", "concise", 0.73)
            )

            IntentType.AGENT_MARKET -> listOf(
                AgentDraft("I'll match available agents first, then provide a minimal execution path.", "casual", 0.79),
                AgentDraft("Agent-market matching has been triggered. Complete orchestration execution in the app.", "professional", 0.78),
                AgentDraft("Agent matched.", "concise", 0.72)
            )

            IntentType.AVATAR -> listOf(
                AgentDraft("I'll update your digital twin from behavior signals with local-first policy.", "casual", 0.78),
                AgentDraft("Avatar update suggestions are ready. Local-only by default; cloud sync requires explicit authorization.", "professional", 0.77),
                AgentDraft("Avatar update suggestion generated.", "concise", 0.71)
            )

            IntentType.DESTINY -> listOf(
                AgentDraft("I'll provide a strategy summary first, then suggest next actions.", "casual", 0.77),
                AgentDraft("Destiny navigation strategy card generated. Review full explanation chain in the app.", "professional", 0.76),
                AgentDraft("Strategy summary generated.", "concise", 0.7)
            )

            IntentType.GENERAL -> listOf(
                AgentDraft("Got it. I understand your request.", "casual", 0.74),
                AgentDraft("Received. I will handle it shortly and share progress.", "professional", 0.72),
                AgentDraft("Understood. Processing now.", "concise", 0.69)
            )
            else -> emptyList() // Added to handle new IntentType.SETTINGS
        }
    }
}
