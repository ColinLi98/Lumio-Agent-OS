package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.AgentRequestConstraints
import com.lumi.coredomain.contract.SkillCandidate
import com.lumi.coredomain.contract.SkillRequirement
import com.lumi.coredomain.contract.SkillSandboxLevel
import com.lumi.coredomain.contract.TaskGraphTaskPayload
import com.lumi.coredomain.contract.UserRole

internal data class SkillPolicyDecision(
    val passed: Boolean,
    val policyPassed: Boolean,
    val capabilityFit: Double,
    val policyScore: Double,
    val reasons: List<String>,
    val gateSnapshot: String
)

internal class SkillPolicyEngine {

    fun buildRequirements(
        tasks: List<TaskGraphTaskPayload>,
        constraints: AgentRequestConstraints,
        activeRole: UserRole = UserRole.PERSONAL,
        primaryDomain: String,
        riskClass: String,
        requiresLiveData: Boolean
    ): List<SkillRequirement> {
        val maxCostTier = normalizeCostTier(constraints.maxCostPerStep) ?: roleDefaultCostTier(activeRole)
        val baseMinimumEvidence = when (normalizeRiskTolerance(constraints.riskTolerance)) {
            "low" -> "strong"
            "medium" -> "mid"
            else -> "weak"
        }
        val roleMinimumEvidence = roleDefaultMinimumEvidence(activeRole)
        val preferredEvidence = strongerEvidence(baseMinimumEvidence, roleMinimumEvidence)
        val forcedEvidence = if (isHighRiskDecisionSupportDomain(primaryDomain, riskClass)) {
            "strong"
        } else {
            preferredEvidence
        }
        return tasks.map { task ->
            val capability = task.requiredCapabilities.firstOrNull() ?: "general_reasoning"
            SkillRequirement(
                taskId = task.id,
                capability = capability,
                maxLatencyMs = when {
                    capability.contains("live", ignoreCase = true) ||
                        capability.contains("flight", ignoreCase = true) ||
                        capability.contains("hotel", ignoreCase = true) -> 4_500
                    else -> 7_500
                },
                minimumEvidenceLevel = forcedEvidence,
                maxCostTier = maxCostTier,
                domain = primaryDomain,
                riskClass = riskClass,
                requiresLiveData = requiresLiveData
            )
        }
    }

    fun evaluateCandidate(
        candidate: SkillCandidate,
        requirement: SkillRequirement,
        activeRole: UserRole = UserRole.PERSONAL
    ): SkillPolicyDecision {
        val reasons = mutableListOf<String>()
        val capabilityFit = capabilityFit(candidate = candidate, requirement = requirement)

        val fitPassed = capabilityFit >= 0.60
        if (!fitPassed) reasons += "capability_fit_below_threshold"

        val sandboxPassed = candidate.sandboxLevel != SkillSandboxLevel.QUARANTINE
        if (!sandboxPassed) reasons += "candidate_in_quarantine"

        val latencyPassed = requirement.maxLatencyMs?.let { maxLatency ->
            candidate.latencyP95Ms <= maxLatency
        } ?: true
        if (!latencyPassed) reasons += "latency_above_requirement"

        val evidencePassed = evidenceLevelRank(candidate.evidenceLevel) >= evidenceLevelRank(requirement.minimumEvidenceLevel)
        if (!evidencePassed) reasons += "evidence_level_below_requirement"

        val costPassed = requirement.maxCostTier.isNullOrBlank() ||
            costTierRank(candidate.costTier) <= costTierRank(requirement.maxCostTier)
        if (!costPassed) reasons += "cost_tier_above_requirement"

        val policyPassed = policyPassed(candidate = candidate, requirement = requirement)
        if (!policyPassed) reasons += "policy_requirement_not_met"

        val rolePolicyPassed = rolePolicyPassed(candidate = candidate, requirement = requirement, activeRole = activeRole)
        if (!rolePolicyPassed) reasons += "role_policy_not_met"

        val passed = fitPassed && sandboxPassed && latencyPassed && evidencePassed && costPassed && policyPassed && rolePolicyPassed
        val snapshot = listOf(
            "fit=${if (fitPassed) "passed" else "blocked"}",
            "sandbox=${if (sandboxPassed) "passed" else "blocked"}",
            "latency=${if (latencyPassed) "passed" else "blocked"}",
            "evidence=${if (evidencePassed) "passed" else "blocked"}",
            "cost=${if (costPassed) "passed" else "blocked"}",
            "policy=${if (policyPassed) "passed" else "blocked"}",
            "role_policy=${if (rolePolicyPassed) "passed" else "blocked"}",
        ).joinToString("|")

        return SkillPolicyDecision(
            passed = passed,
            policyPassed = policyPassed,
            capabilityFit = capabilityFit,
            policyScore = when {
                policyPassed && rolePolicyPassed -> 1.0
                policyPassed -> 0.6
                else -> 0.0
            },
            reasons = reasons,
            gateSnapshot = snapshot
        )
    }

    private fun capabilityFit(candidate: SkillCandidate, requirement: SkillRequirement): Double {
        val required = requirement.capability.lowercase().trim()
        if (required.isBlank()) return 1.0
        val caps = candidate.capabilities.map { it.lowercase().trim() }
        if (caps.any { it == required }) return 1.0
        if (caps.any { it.contains(required) || required.contains(it) }) return 0.75
        return 0.0
    }

    private fun policyPassed(candidate: SkillCandidate, requirement: SkillRequirement): Boolean {
        if (!candidate.policyPassed) return false
        val requiredPolicy = isHighRiskDecisionSupportDomain(requirement.domain, requirement.riskClass)
        if (!requiredPolicy) return true
        val tags = candidate.policyTags.map { it.lowercase() }
        val hasDecisionSupportTag = tags.contains("decision_support_only") ||
            candidate.safetyLevel.equals("decision_support_only", ignoreCase = true)
        return hasDecisionSupportTag
    }

    private fun rolePolicyPassed(
        candidate: SkillCandidate,
        requirement: SkillRequirement,
        activeRole: UserRole
    ): Boolean {
        return when (activeRole) {
            UserRole.PARENT -> {
                evidenceLevelRank(candidate.evidenceLevel) >= 2 &&
                    !candidate.safetyLevel.equals("aggressive", ignoreCase = true)
            }

            UserRole.WORK -> {
                candidate.requiredPermissions.none { permission ->
                    permission.equals("contacts", ignoreCase = true) ||
                        permission.equals("sms", ignoreCase = true)
                }
            }

            UserRole.BUYER -> {
                val tags = candidate.policyTags.map { it.lowercase() }
                val hasTransactionalAudit = tags.any { it.contains("bounded") || it.contains("audit") || it.contains("decision_support") }
                hasTransactionalAudit || !requirement.domain.equals("finance", ignoreCase = true)
            }

            UserRole.TRAVELER, UserRole.PERSONAL, UserRole.CUSTOM -> true
        }
    }

    private fun isHighRiskDecisionSupportDomain(domain: String, riskClass: String): Boolean {
        val d = domain.lowercase()
        val highRiskDomain = d == "health" || d == "legal" || d == "finance"
        return highRiskDomain || riskClass.equals("high", ignoreCase = true)
    }

    private fun normalizeRiskTolerance(raw: String?): String {
        val text = raw?.trim()?.lowercase().orEmpty()
        return when {
            text.contains("low") || text.contains("strict") || text.contains("保守") -> "low"
            text.contains("medium") || text.contains("mid") || text.contains("中") -> "medium"
            text.contains("high") || text.contains("aggressive") || text.contains("高") -> "high"
            else -> "medium"
        }
    }

    private fun roleDefaultCostTier(activeRole: UserRole): String? {
        return when (activeRole) {
            UserRole.PERSONAL, UserRole.PARENT -> "low"
            UserRole.WORK, UserRole.BUYER, UserRole.TRAVELER -> "mid"
            UserRole.CUSTOM -> null
        }
    }

    private fun roleDefaultMinimumEvidence(activeRole: UserRole): String {
        return when (activeRole) {
            UserRole.PARENT -> "strong"
            UserRole.WORK, UserRole.BUYER, UserRole.TRAVELER -> "mid"
            UserRole.PERSONAL, UserRole.CUSTOM -> "weak"
        }
    }

    private fun strongerEvidence(first: String, second: String): String {
        return if (evidenceLevelRank(first) >= evidenceLevelRank(second)) first else second
    }

    private fun normalizeCostTier(raw: String?): String? {
        val text = raw?.trim()?.lowercase().orEmpty()
        if (text.isBlank()) return null
        return when {
            text.contains("low") || text.contains("低") -> "low"
            text.contains("mid") || text.contains("medium") || text.contains("中") -> "mid"
            text.contains("high") || text.contains("高") -> "high"
            else -> null
        }
    }

    private fun costTierRank(raw: String?): Int {
        val text = raw?.trim()?.lowercase().orEmpty()
        return when (text) {
            "low" -> 1
            "mid", "medium" -> 2
            "high" -> 3
            else -> 2
        }
    }

    private fun evidenceLevelRank(raw: String): Int {
        return when (raw.trim().lowercase()) {
            "weak" -> 1
            "mid", "medium" -> 2
            "strong" -> 3
            else -> 1
        }
    }
}
