package com.lumi.coreagent.policy

enum class PolicyLevel {
    STRICT_BLOCK,
    MASK_ONLY,
    DISABLE_MEMORY
}

data class PolicyDecision(
    val isAgentAllowed: Boolean,
    val shieldIconVisible: Boolean,
    val reason: String
)

class SensitiveAppDetector(
    private val policyMap: Map<String, PolicyLevel> = DEFAULT_POLICY_MAP
) {

    fun detect(packageName: String, imeOptions: Int): PolicyDecision {
        val normalized = packageName.trim()
        val policy = policyMap[normalized]

        if (policy != null) {
            return decisionForPolicy(policy, normalized)
        }

        if (imeOptions and IME_FLAG_NO_PERSONALIZED_LEARNING != 0) {
            return PolicyDecision(
                isAgentAllowed = true,
                shieldIconVisible = true,
                reason = "Incognito input: DISABLE_MEMORY"
            )
        }

        return PolicyDecision(
            isAgentAllowed = true,
            shieldIconVisible = false,
            reason = "Allowed"
        )
    }

    private fun decisionForPolicy(policy: PolicyLevel, packageName: String): PolicyDecision {
        return when (policy) {
            PolicyLevel.STRICT_BLOCK -> PolicyDecision(
                isAgentAllowed = false,
                shieldIconVisible = true,
                reason = "Sensitive app blocked: $packageName (STRICT_BLOCK)"
            )
            PolicyLevel.MASK_ONLY -> PolicyDecision(
                isAgentAllowed = true,
                shieldIconVisible = true,
                reason = "Sensitive app restrictions: $packageName (MASK_ONLY)"
            )
            PolicyLevel.DISABLE_MEMORY -> PolicyDecision(
                isAgentAllowed = true,
                shieldIconVisible = true,
                reason = "Sensitive app restrictions: $packageName (DISABLE_MEMORY)"
            )
        }
    }

    companion object {
        // Matches EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING without Android dependency.
        const val IME_FLAG_NO_PERSONALIZED_LEARNING = 0x1000000

        val DEFAULT_POLICY_MAP: Map<String, PolicyLevel> = mapOf(
            // Banking
            "com.icbc" to PolicyLevel.STRICT_BLOCK,
            "com.cmbchina.ccd.pluto.cmbActivity" to PolicyLevel.STRICT_BLOCK,
            "com.paypal.android.p2pmobile" to PolicyLevel.STRICT_BLOCK,
            // Password managers
            "com.agilebits.onepassword" to PolicyLevel.STRICT_BLOCK,
            "com.lastpass.lpandroid" to PolicyLevel.STRICT_BLOCK,
            // Enterprise
            "com.tencent.wework" to PolicyLevel.MASK_ONLY,
            "com.microsoft.teams" to PolicyLevel.MASK_ONLY
        )
    }
}
