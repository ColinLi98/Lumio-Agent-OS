package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AgentCard
import com.lumi.coredomain.contract.LumiRoutes

object DefaultCardFactory {

    fun cards(intent: IntentType): List<AgentCard> {
        return when (intent) {
            IntentType.TRAVEL -> listOf(
                AgentCard(
                    id = "travel-open-app",
                    title = "Open Lumi App to complete travel tasks",
                    summary = "Review flight, hotel, and price evidence in the app.",
                    deeplink = LumiRoutes.CHAT
                )
            )

            IntentType.LIX -> listOf(
                AgentCard(
                    id = "lix-open-app",
                    title = "Open External Fulfillment",
                    summary = "Review quotes, proof methods, and rollback/dispute terms.",
                    deeplink = LumiRoutes.lixIntent("latest")
                )
            )

            IntentType.AGENT_MARKET -> listOf(
                AgentCard(
                    id = "agent-market-open",
                    title = "Open External Capabilities",
                    summary = "Review external capability options and execution fit.",
                    deeplink = LumiRoutes.AGENT_MARKET
                )
            )

            IntentType.AVATAR -> listOf(
                AgentCard(
                    id = "avatar-open",
                    title = "Open Preferences & Permissions",
                    summary = "Review stable preferences, approval rules, and data scope.",
                    deeplink = LumiRoutes.AVATAR
                )
            )

            IntentType.DESTINY -> listOf(
                AgentCard(
                    id = "destiny-open",
                    title = "Open Recommendations & Risk",
                    summary = "Review Bellman recommendations, alternatives, and risk notes.",
                    deeplink = LumiRoutes.DESTINY
                )
            )

            else -> emptyList()
        }
    }
}
