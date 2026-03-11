package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.ModuleId

enum class AppModule(
    val moduleId: ModuleId,
    val label: String,
    val bootstrapPrompt: String
) {
    HOME(ModuleId.HOME, "Home", "Open Home overview with my status, active task, and recent runs"),
    CHAT(ModuleId.CHAT, "Chat", "Open Chat and prepare rewrite/reply capabilities"),
    LIX(ModuleId.LIX, "External Fulfillment", "Open external fulfillment details with offers, proof, and rollback terms"),
    AGENT(ModuleId.AGENT_MARKET, "External Capabilities", "Open external capabilities and compare execution options"),
    AVATAR(ModuleId.AVATAR, "Preferences & Permissions", "Open stable preferences, approval rules, and data-sharing controls"),
    DESTINY(ModuleId.DESTINY, "Recommendations & Risk", "Open recommendation paths, risk levels, and next best actions"),
    SETTINGS(ModuleId.SETTINGS, "Settings", "Show system settings, observability, and cloud adapter status")
}
