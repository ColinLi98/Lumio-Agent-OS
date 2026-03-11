package com.lumi.coreagent.orchestrator

enum class IntentType {
    CHAT_REWRITE,
    SHOPPING,
    TRAVEL,
    CALENDAR,
    PRIVACY_MASK,
    LIX,
    AGENT_MARKET,
    AVATAR,
    DESTINY,
    SETTINGS,
    GENERAL
}

object IntentClassifier {

    fun classify(rawText: String): IntentType {
        val text = rawText.lowercase()

        return when {
            containsAny(text, "rewrite", "rephrase", "reply", "polish", "tone", "decline politely", "改写", "润色", "回复") -> IntentType.CHAT_REWRITE
            containsAny(text, "buy", "purchase", "compare price", "budget", "shopping", "price", "购买", "比价", "预算", "购物") -> IntentType.SHOPPING
            containsAny(text, "flight", "hotel", "trip", "travel", "机票", "酒店", "行程", "旅行") -> IntentType.TRAVEL
            containsAny(text, "schedule", "calendar", "remind", "meeting", "timeline", "日程", "日历", "提醒", "会议") -> IntentType.CALENDAR
            containsAny(text, "privacy", "mask", "phone", "id_card", "bank", "address", "redact", "隐私", "脱敏", "身份证", "银行卡", "地址") -> IntentType.PRIVACY_MASK
            containsAny(text, "settings", "status", "api status", "serp", "api_health", "设置", "状态", "接口健康") -> IntentType.SETTINGS
            containsAny(text, "lix", "intent", "offer", "deal", "negotiation", "broadcast", "意图", "报价", "谈判", "广播") -> IntentType.LIX
            containsAny(text, "agent marketplace", "agent market", "github", "skill", "agent", "orchestration", "marketplace", "agent市场", "代理市场", "技能市场") -> IntentType.AGENT_MARKET
            containsAny(text, "avatar", "twin", "digital twin", "persona", "画像", "分身") -> IntentType.AVATAR
            containsAny(text, "destiny", "navigation", "bellman", "strategy", "导航", "策略", "贝尔曼") -> IntentType.DESTINY
            else -> IntentType.GENERAL
        }
    }

    /** Map IntentType to ModuleId for handoff routing. */
    fun toModuleId(intentType: IntentType): com.lumi.coredomain.contract.ModuleId {
        return when (intentType) {
            IntentType.LIX -> com.lumi.coredomain.contract.ModuleId.LIX
            IntentType.AGENT_MARKET -> com.lumi.coredomain.contract.ModuleId.AGENT_MARKET
            IntentType.AVATAR -> com.lumi.coredomain.contract.ModuleId.AVATAR
            IntentType.DESTINY -> com.lumi.coredomain.contract.ModuleId.DESTINY
            IntentType.SETTINGS -> com.lumi.coredomain.contract.ModuleId.SETTINGS
            else -> com.lumi.coredomain.contract.ModuleId.CHAT
        }
    }

    private fun containsAny(text: String, vararg tokens: String): Boolean {
        return tokens.any { token -> text.contains(token) }
    }
}
