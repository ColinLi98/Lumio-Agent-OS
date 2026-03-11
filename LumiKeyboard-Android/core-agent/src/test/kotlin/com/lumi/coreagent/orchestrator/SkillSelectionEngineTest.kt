package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.SkillAcquisitionDecisionStatus
import com.lumi.coredomain.contract.SkillCandidate
import com.lumi.coredomain.contract.SkillRequirement
import com.lumi.coredomain.contract.SkillSandboxLevel
import com.lumi.coredomain.contract.SkillSource
import com.lumi.coredomain.contract.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SkillSelectionEngineTest {

    private val policyEngine = SkillPolicyEngine()
    private val selectionEngine = SkillSelectionEngine(policyEngine)

    @Test
    fun scoreDeterminism_returnsStableFinalScore() {
        val requirement = requirement(capability = "web_search")
        val candidates = listOf(
            candidate(
                id = "local:web_search",
                capabilities = listOf("web_search"),
                successRate = 0.93,
                latencyMs = 900,
                evidenceLevel = "strong",
                costTier = "low"
            )
        )

        val first = selectionEngine.select(listOf(requirement), null) { candidates }
        val second = selectionEngine.select(listOf(requirement), null) { candidates }

        val firstScore = first.selectionTrace.firstOrNull()?.scoreBreakdown?.finalScore
        val secondScore = second.selectionTrace.firstOrNull()?.scoreBreakdown?.finalScore
        assertNotNull(firstScore)
        assertNotNull(secondScore)
        assertEquals(firstScore, secondScore)
    }

    @Test
    fun hardFilter_capabilityBelowThresholdFallsBackToMarket() {
        val requirement = requirement(capability = "flight_search")
        val wrongCandidate = candidate(
            id = "local:rewrite",
            capabilities = listOf("rewrite_assist"),
            successRate = 0.97,
            latencyMs = 500,
            evidenceLevel = "strong",
            costTier = "low"
        )

        val bundle = selectionEngine.select(listOf(requirement), null) { listOf(wrongCandidate) }
        assertTrue(bundle.decisions.isNotEmpty())
        assertEquals(
            SkillAcquisitionDecisionStatus.FALLBACK_TO_MARKET,
            bundle.decisions.first().status
        )
        assertEquals("template:flight_search", bundle.skillInvocations.first().skillId)
    }

    @Test
    fun primaryFallbackSelection_selectsTopTwoCandidates() {
        val requirement = requirement(capability = "hotel_search")
        val primary = candidate(
            id = "local:hotel_primary",
            capabilities = listOf("hotel_search"),
            successRate = 0.95,
            latencyMs = 800,
            evidenceLevel = "strong",
            costTier = "mid"
        )
        val fallback = candidate(
            id = "local:hotel_fallback",
            capabilities = listOf("hotel_search"),
            successRate = 0.91,
            latencyMs = 1200,
            evidenceLevel = "mid",
            costTier = "mid"
        )

        val bundle = selectionEngine.select(listOf(requirement), null) { listOf(primary, fallback) }
        val trace = bundle.selectionTrace.firstOrNull()
        assertNotNull(trace)
        assertEquals("local:hotel_primary", trace.primarySkillId)
        assertEquals("local:hotel_fallback", trace.fallbackSkillId)
        assertTrue(trace.scoreBreakdown.finalScore >= 0.68)
    }

    @Test
    fun highRiskPolicy_requiresDecisionSupportOnlyTag() {
        val requirement = requirement(
            capability = "web_search",
            domain = "finance",
            riskClass = "high",
            minimumEvidenceLevel = "strong"
        )
        val nonCompliant = candidate(
            id = "local:finance_standard",
            capabilities = listOf("web_search"),
            successRate = 0.95,
            latencyMs = 700,
            evidenceLevel = "strong",
            costTier = "low",
            policyTags = emptyList(),
            safetyLevel = "standard"
        )

        val policy = policyEngine.evaluateCandidate(nonCompliant, requirement)
        assertFalse(policy.passed)
        assertFalse(policy.policyPassed)
        assertTrue(policy.reasons.contains("policy_requirement_not_met"))
    }

    @Test
    fun roleAwareScoring_boostsWorkRoleForAnalysisCapabilities() {
        val requirement = requirement(capability = "analysis")
        val candidates = listOf(
            candidate(
                id = "local:analysis_worker",
                capabilities = listOf("analysis"),
                successRate = 0.90,
                latencyMs = 1_100,
                evidenceLevel = "strong",
                costTier = "mid",
                policyTags = listOf("audit", "decision_support_only")
            )
        )

        val personalScore = selectionEngine.select(
            requirements = listOf(requirement),
            twinState = null,
            activeRole = UserRole.PERSONAL
        ) { candidates }.selectionTrace.first().scoreBreakdown.finalScore
        val workScore = selectionEngine.select(
            requirements = listOf(requirement),
            twinState = null,
            activeRole = UserRole.WORK
        ) { candidates }.selectionTrace.first().scoreBreakdown.finalScore

        assertTrue(workScore > personalScore)
    }

    @Test
    fun roleAwarePolicy_parentRoleBlocksWeakEvidenceCandidate() {
        val requirement = requirement(capability = "web_search", minimumEvidenceLevel = "weak")
        val weakCandidate = candidate(
            id = "local:weak",
            capabilities = listOf("web_search"),
            successRate = 0.95,
            latencyMs = 700,
            evidenceLevel = "weak",
            costTier = "low"
        )

        val policy = policyEngine.evaluateCandidate(
            candidate = weakCandidate,
            requirement = requirement,
            activeRole = UserRole.PARENT
        )
        assertFalse(policy.passed)
        assertTrue(policy.reasons.contains("role_policy_not_met"))
    }

    @Test
    fun roleDenialOverridesRanking_whenTopScoreViolatesRolePolicy() {
        val requirement = requirement(capability = "web_search", minimumEvidenceLevel = "weak")
        val blockedTopCandidate = candidate(
            id = "local:blocked_top",
            capabilities = listOf("web_search"),
            successRate = 0.99,
            latencyMs = 500,
            evidenceLevel = "weak",
            costTier = "low"
        )
        val allowedCandidate = candidate(
            id = "local:allowed_backup",
            capabilities = listOf("web_search"),
            successRate = 0.90,
            latencyMs = 800,
            evidenceLevel = "strong",
            costTier = "mid"
        )

        val bundle = selectionEngine.select(
            requirements = listOf(requirement),
            twinState = null,
            activeRole = UserRole.PARENT
        ) { listOf(blockedTopCandidate, allowedCandidate) }

        val trace = bundle.selectionTrace.firstOrNull()
        assertNotNull(trace)
        assertEquals("local:allowed_backup", trace.primarySkillId)
        assertTrue(trace.selectionReason.contains("best_available", ignoreCase = true) || trace.selectionReason.isNotBlank())
    }

    private fun requirement(
        capability: String,
        domain: String = "general",
        riskClass: String = "low",
        minimumEvidenceLevel: String = "mid"
    ) = SkillRequirement(
        taskId = "task_1",
        capability = capability,
        maxLatencyMs = 5_000,
        minimumEvidenceLevel = minimumEvidenceLevel,
        maxCostTier = "high",
        domain = domain,
        riskClass = riskClass,
        requiresLiveData = false
    )

    private fun candidate(
        id: String,
        capabilities: List<String>,
        successRate: Double,
        latencyMs: Long,
        evidenceLevel: String,
        costTier: String,
        policyTags: List<String> = listOf("decision_support_only"),
        safetyLevel: String = "decision_support_only"
    ) = SkillCandidate(
        id = id,
        source = SkillSource.LOCAL,
        capabilities = capabilities,
        successRate = successRate,
        latencyP95Ms = latencyMs,
        evidenceLevel = evidenceLevel,
        costTier = costTier,
        policyTags = policyTags,
        requiredPermissions = listOf("network"),
        safetyLevel = safetyLevel,
        lastVerifiedAt = 1_700_000_000_000,
        policyPassed = true,
        sandboxLevel = SkillSandboxLevel.APPROVED,
        admissionPassed = true
    )
}
