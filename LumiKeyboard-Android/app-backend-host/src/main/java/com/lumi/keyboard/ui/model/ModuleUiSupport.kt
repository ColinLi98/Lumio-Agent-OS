package com.lumi.keyboard.ui.model

import com.lumi.coredomain.contract.NetworkPolicy

fun subtitleForModule(module: AppModule): String {
    return when (module) {
        AppModule.HOME -> "Home summarizes active execution context, health, and quick routes."
        AppModule.CHAT -> "Chat handles structured execution output, evidence, and follow-up steps."
        AppModule.LIX -> "External Fulfillment compares external execution options when internal paths are insufficient."
        AppModule.AGENT -> "External Capabilities surfaces third-party capability options and execution readiness."
        AppModule.AVATAR -> "Preferences & Permissions controls stable preferences, approvals, and data-sharing scope."
        AppModule.DESTINY -> "Recommendations & Risk presents next-best actions, alternatives, and risk notes."
        AppModule.SETTINGS -> "Settings shows environment, toggles, and API status."
    }
}

fun fallbackDeeplinkFor(module: AppModule): String {
    return when (module) {
        AppModule.HOME,
        AppModule.CHAT -> "lumi://chat"
        AppModule.LIX -> "lumi://lix/intent/latest"
        AppModule.AGENT -> "lumi://agent-market"
        AppModule.AVATAR -> "lumi://avatar"
        AppModule.DESTINY -> "lumi://destiny"
        AppModule.SETTINGS -> "lumi://settings"
    }
}

fun networkPolicyFor(module: AppModule): NetworkPolicy {
    return when (module) {
        AppModule.AVATAR -> NetworkPolicy.LOCAL_ONLY
        AppModule.SETTINGS,
        AppModule.HOME -> NetworkPolicy.LOCAL_FIRST
        else -> NetworkPolicy.CLOUD_PREFERRED
    }
}

fun shortNavLabel(module: AppModule): String {
    return when (module) {
        AppModule.HOME -> "⌂"
        AppModule.CHAT -> "Ch"
        AppModule.LIX -> "EF"
        AppModule.AGENT -> "EC"
        AppModule.AVATAR -> "PP"
        AppModule.DESTINY -> "RR"
        AppModule.SETTINGS -> "⚙"
    }
}
