package com.lumi.coreagent.task

import com.lumi.coredomain.contract.ModuleId

/**
 * OpenClaw capability mapping for mobile: map user request to task-rail hints
 * without importing desktop automation behavior.
 *
 * Architecture role: Skill Registry + Skill Matching
 * (see PRD architecture diagram — Agent Collaboration Layer)
 */
object OpenClawCapabilityMapper {

    /**
     * Known local OpenClaw specialist agents.
     * Each entry maps to an agent running on a local port.
     */
    data class SpecialistAgent(
        val name: String,
        val port: Int,
        val dispatchPath: String,
        val healthPath: String,
        val triggerKeywords: List<String>,
        val domains: List<String>
    )

    private val knownAgents = listOf(
        SpecialistAgent(
            name = "lix-dispatch",
            port = 8901,
            dispatchPath = "/dispatch",
            healthPath = "/health",
            triggerKeywords = listOf("lix", "intent", "matching", "dispatch", "demand", "supply", "offer", "quote"),
            domains = listOf("travel", "recruitment", "local_service", "general")
        )
    )

    /**
     * Match the best specialist agent for a given user query.
     * Returns null if no local agent can handle this request.
     */
    fun matchSpecialistAgent(rawText: String, module: ModuleId): SpecialistAgent? {
        val lower = rawText.lowercase()

        // LIX module always routes to lix-dispatch if available
        if (module == ModuleId.LIX) {
            return knownAgents.find { it.name == "lix-dispatch" }
        }

        // For other modules, check keyword matches
        return knownAgents.maxByOrNull { agent ->
            agent.triggerKeywords.count { lower.contains(it) } +
                agent.domains.count { lower.contains(it) }
        }?.takeIf { agent ->
            agent.triggerKeywords.any { lower.contains(it) } ||
                agent.domains.any { lower.contains(it) }
        }
    }

    /**
     * Check if there is any specialist agent that could handle this query.
     */
    fun hasSpecialistMatch(rawText: String, module: ModuleId): Boolean {
        return matchSpecialistAgent(rawText, module) != null
    }

    /**
     * Infer the domain hint from user query text for specialist agent dispatch.
     */
    fun inferDomain(rawText: String): String {
        val lower = rawText.lowercase()
        return when {
            listOf("flight", "hotel", "trip", "travel").any { lower.contains(it) } -> "travel"
            listOf("hire", "recruit", "job", "resume", "interview").any { lower.contains(it) } -> "recruitment"
            listOf("local", "repair", "service", "moving", "maintenance").any { lower.contains(it) } -> "local_service"
            else -> "general"
        }
    }

    fun mapHints(rawText: String, module: ModuleId): List<String> {
        val lower = rawText.lowercase()
        val base = when (module) {
            ModuleId.CHAT -> mutableListOf("Task breakdown", "Execution replay", "Evidence backflow")
            ModuleId.LIX -> mutableListOf("Intent broadcast", "Offer comparison", "Deal closure")
            ModuleId.AGENT_MARKET -> mutableListOf("Agent discovery", "Execution control", "Trend monitoring")
            ModuleId.AVATAR -> mutableListOf("Avatar update", "Privacy boundary", "Readable explanation")
            ModuleId.DESTINY -> mutableListOf("Strategy evaluation", "Path comparison", "Risk hints")
            ModuleId.HOME -> mutableListOf("Global overview", "Module snapshot", "Quick actions")
            ModuleId.SETTINGS -> mutableListOf("Service diagnostics", "Toggle audit", "Privacy policy")
        }

        // Add specialist agent hint if available
        val agent = matchSpecialistAgent(rawText, module)
        if (agent != null) {
            base.add(0, "Local Agent: ${agent.name}")
        }

        if (lower.contains("flight") || lower.contains("hotel")) {
            base.add(0, "Travel retrieval")
        }
        if (lower.contains("github") || lower.contains("repository")) {
            base.add(0, "GitHub import")
        }
        if (lower.contains("avatar") || lower.contains("twin")) {
            base.add(0, "Digital twin")
        }
        return base.distinct().take(4)
    }

    /**
     * Quick-action hints for Keyboard UI toolbar.
     * Returns label→prefix pairs for the quick-action bar.
     */
    fun getQuickActionHints(): List<Pair<String, String>> {
        val actions = mutableListOf<Pair<String, String>>()

        // Add actions from known specialist agents
        knownAgents.forEach { agent ->
            when (agent.name) {
                "lix-dispatch" -> {
                    actions.add("🔮 LIX Dispatch" to "Find the best plan for me:")
                    agent.domains.forEach { domain ->
                        val (emoji, label) = when (domain) {
                            "travel" -> "✈️" to "Travel"
                            "recruitment" -> "💼" to "Hiring"
                            "local_service" -> "🏠" to "Local Services"
                            "general" -> "🤖" to "General"
                            else -> "📦" to domain
                        }
                        actions.add("$emoji $label" to "Find a $label plan for me:")
                    }
                }
            }
        }

        // Built-in actions
        actions.addAll(listOf(
            "✏️ Rewrite" to "Rewrite this for me:",
            "🔒 Privacy" to "Please anonymize this:",
            "🧠 Reasoning" to "Help me analyze this decision:",
        ))

        return actions
    }
}
