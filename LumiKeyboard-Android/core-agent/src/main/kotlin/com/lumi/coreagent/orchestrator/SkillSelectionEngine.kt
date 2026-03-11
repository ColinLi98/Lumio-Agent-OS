package com.lumi.coreagent.orchestrator

import com.lumi.coredomain.contract.DynamicHumanStatePayload
import com.lumi.coredomain.contract.ResponseStatus
import com.lumi.coredomain.contract.SkillAcquisitionDecision
import com.lumi.coredomain.contract.SkillAcquisitionDecisionStatus
import com.lumi.coredomain.contract.SkillCanaryReport
import com.lumi.coredomain.contract.SkillCandidate
import com.lumi.coredomain.contract.SkillGapPayload
import com.lumi.coredomain.contract.SkillGapRecommendation
import com.lumi.coredomain.contract.SkillInvocationPayload
import com.lumi.coredomain.contract.SkillPromotionRecord
import com.lumi.coredomain.contract.SkillRequirement
import com.lumi.coredomain.contract.SkillSandboxLevel
import com.lumi.coredomain.contract.SkillScoreBreakdown
import com.lumi.coredomain.contract.SkillSelectionDecision
import com.lumi.coredomain.contract.SkillSource
import com.lumi.coredomain.contract.UserRole

internal data class SkillSelectionBundle(
    val skillInvocations: List<SkillInvocationPayload>,
    val skillGap: SkillGapPayload?,
    val skillCandidates: List<SkillCandidate>,
    val decisions: List<SkillAcquisitionDecision>,
    val canaryReports: List<SkillCanaryReport>,
    val promotionRecords: List<SkillPromotionRecord>,
    val selectionTrace: List<SkillSelectionDecision>
)

internal class SkillSelectionEngine(
    private val policyEngine: SkillPolicyEngine
) {

    fun select(
        requirements: List<SkillRequirement>,
        twinState: DynamicHumanStatePayload?,
        activeRole: UserRole = UserRole.PERSONAL,
        discovery: (SkillRequirement) -> List<SkillCandidate>
    ): SkillSelectionBundle {
        val candidates = mutableListOf<SkillCandidate>()
        val decisions = mutableListOf<SkillAcquisitionDecision>()
        val canaryReports = mutableListOf<SkillCanaryReport>()
        val promotionRecords = mutableListOf<SkillPromotionRecord>()
        val invocations = mutableListOf<SkillInvocationPayload>()
        val selectionTrace = mutableListOf<SkillSelectionDecision>()
        val missingCapabilities = mutableListOf<String>()

        requirements.forEach { requirement ->
            val discovered = discovery(requirement)
            val rescored = discovered.map { candidate ->
                val policyDecision = policyEngine.evaluateCandidate(candidate, requirement, activeRole)
                val score = scoreCandidate(
                    candidate = candidate,
                    requirement = requirement,
                    twinState = twinState,
                    activeRole = activeRole,
                    policyDecision = policyDecision
                )
                candidate.copy(
                    policyPassed = policyDecision.policyPassed,
                    score = score
                )
            }.sortedByDescending { it.score.finalScore }

            candidates += rescored
            val eligible = rescored
                .map { candidate -> candidate to policyEngine.evaluateCandidate(candidate, requirement, activeRole) }
                .filter { (_, policy) -> policy.passed }
                .sortedByDescending { (candidate, _) -> candidate.score.finalScore }

            var selected = eligible.firstOrNull()?.first
            var selectedPolicy = eligible.firstOrNull()?.second
            val fallback = eligible.drop(1).firstOrNull()?.first
            val fallbackPolicy = eligible.drop(1).firstOrNull()?.second

            if (selected == null || selected.score.finalScore < PRIMARY_SELECTION_THRESHOLD) {
                missingCapabilities += requirement.capability
                decisions += SkillAcquisitionDecision(
                    taskId = requirement.taskId,
                    capability = requirement.capability,
                    selectedSkillId = null,
                    status = SkillAcquisitionDecisionStatus.FALLBACK_TO_MARKET,
                    reason = "primary_score_below_threshold_or_no_candidate"
                )
                invocations += SkillInvocationPayload(
                    skillId = "template:${requirement.capability}",
                    source = SkillSource.LOCAL_TEMPLATE,
                    status = ResponseStatus.PARTIAL,
                    latencyMs = 0,
                    evidenceCount = 0,
                    sandboxLevel = SkillSandboxLevel.NONE
                )
                selectionTrace += SkillSelectionDecision(
                    taskId = requirement.taskId,
                    requiredCapability = requirement.capability,
                    primarySkillId = null,
                    fallbackSkillId = fallback?.id,
                    scoreBreakdown = selected?.score ?: SkillScoreBreakdown(),
                    selectionReason = "fallback_to_market_due_to_low_score",
                    gateSnapshot = selectedPolicy?.gateSnapshot ?: fallbackPolicy?.gateSnapshot ?: "no_candidate"
                )
                return@forEach
            }

            if (selected.source == SkillSource.GITHUB) {
                val canary = runCanary(selected, requirement)
                canaryReports += canary
                if (!canary.passed) {
                    promotionRecords += SkillPromotionRecord(
                        skillId = selected.id,
                        fromLevel = SkillSandboxLevel.SANDBOX,
                        toLevel = SkillSandboxLevel.QUARANTINE,
                        promoted = false,
                        reason = "canary_failed_or_policy_violation"
                    )

                    if (fallback != null) {
                        selected = fallback
                        selectedPolicy = fallbackPolicy
                    } else {
                        missingCapabilities += requirement.capability
                        decisions += SkillAcquisitionDecision(
                            taskId = requirement.taskId,
                            capability = requirement.capability,
                            selectedSkillId = selected.id,
                            status = SkillAcquisitionDecisionStatus.QUARANTINED,
                            reason = "primary_canary_failed_no_fallback"
                        )
                        invocations += SkillInvocationPayload(
                            skillId = "template:${requirement.capability}",
                            source = SkillSource.LOCAL_TEMPLATE,
                            status = ResponseStatus.PARTIAL,
                            latencyMs = 0,
                            evidenceCount = 0,
                            sandboxLevel = SkillSandboxLevel.NONE
                        )
                        selectionTrace += SkillSelectionDecision(
                            taskId = requirement.taskId,
                            requiredCapability = requirement.capability,
                            primarySkillId = null,
                            fallbackSkillId = null,
                            scoreBreakdown = selected.score,
                            selectionReason = "fallback_to_market_primary_canary_failed",
                            gateSnapshot = selectedPolicy?.gateSnapshot ?: "canary_failed"
                        )
                        return@forEach
                    }
                } else {
                    promotionRecords += SkillPromotionRecord(
                        skillId = selected.id,
                        fromLevel = SkillSandboxLevel.SANDBOX,
                        toLevel = SkillSandboxLevel.APPROVED,
                        promoted = true,
                        reason = "canary_passed_with_traceable_evidence"
                    )
                }
            }

            decisions += SkillAcquisitionDecision(
                taskId = requirement.taskId,
                capability = requirement.capability,
                selectedSkillId = selected.id,
                status = SkillAcquisitionDecisionStatus.SELECTED,
                reason = if (fallback != null) "primary_with_fallback_ready" else "primary_only"
            )
            invocations += SkillInvocationPayload(
                skillId = selected.id,
                source = selected.source,
                status = ResponseStatus.SUCCESS,
                latencyMs = selected.latencyP95Ms,
                evidenceCount = evidenceLevelRank(selected.evidenceLevel),
                sandboxLevel = selected.sandboxLevel
            )
            selectionTrace += SkillSelectionDecision(
                taskId = requirement.taskId,
                requiredCapability = requirement.capability,
                primarySkillId = selected.id,
                fallbackSkillId = fallback?.id,
                scoreBreakdown = selected.score,
                selectionReason = if (fallback != null) {
                    "selected_primary_with_fallback"
                } else {
                    "selected_primary_no_fallback"
                },
                gateSnapshot = selectedPolicy?.gateSnapshot ?: "passed"
            )
        }

        return SkillSelectionBundle(
            skillInvocations = invocations.take(12),
            skillGap = buildSkillGap(missingCapabilities),
            skillCandidates = candidates.take(24),
            decisions = decisions.take(12),
            canaryReports = canaryReports.take(12),
            promotionRecords = promotionRecords.take(12),
            selectionTrace = selectionTrace.take(12)
        )
    }

    private fun scoreCandidate(
        candidate: SkillCandidate,
        requirement: SkillRequirement,
        twinState: DynamicHumanStatePayload?,
        activeRole: UserRole,
        policyDecision: SkillPolicyDecision
    ): SkillScoreBreakdown {
        val fit = policyDecision.capabilityFit.coerceIn(0.0, 1.0)
        val success = candidate.successRate.coerceIn(0.0, 1.0)
        val evidence = (evidenceLevelRank(candidate.evidenceLevel) / 3.0).coerceIn(0.0, 1.0)
        val latency = latencyScore(candidate.latencyP95Ms, requirement.maxLatencyMs)
        val cost = costTierScore(candidate.costTier)
        val policy = policyDecision.policyScore.coerceIn(0.0, 1.0)
        val twinBoost = twinFitBoost(candidate, twinState) + roleFitBoost(candidate, requirement, activeRole)
        val freshnessBoost = freshnessBoost(candidate, requirement)

        val final = (
            fit * 0.30 +
                success * 0.20 +
                evidence * 0.20 +
                latency * 0.10 +
                cost * 0.10 +
                policy * 0.10 +
                twinBoost +
                freshnessBoost
            ).coerceIn(0.0, 1.0)

        return SkillScoreBreakdown(
            capabilityFit = fit,
            successRateScore = success,
            latencyScore = latency,
            evidenceLevelScore = evidence,
            costScore = cost,
            policyScore = policy,
            twinFitBoost = twinBoost,
            freshnessBoost = freshnessBoost,
            finalScore = final,
            totalScore = final
        )
    }

    private fun runCanary(candidate: SkillCandidate, requirement: SkillRequirement): SkillCanaryReport {
        val highRisk = requirement.riskClass.equals("high", ignoreCase = true)
        val sampleSize = if (highRisk) 10 else 5
        val sla = (requirement.maxLatencyMs ?: 5_000).toDouble()
        val policyViolations = if (candidate.policyPassed) 0 else 1
        val evidenceComplete = evidenceLevelRank(candidate.evidenceLevel) >= evidenceLevelRank(requirement.minimumEvidenceLevel)
        val passed = candidate.successRate >= 0.90 &&
            policyViolations == 0 &&
            evidenceComplete &&
            candidate.latencyP95Ms <= (sla * 1.2).toLong()

        return SkillCanaryReport(
            taskId = requirement.taskId,
            skillId = candidate.id,
            passed = passed,
            sampleSize = sampleSize,
            evidenceCount = evidenceLevelRank(candidate.evidenceLevel).coerceAtLeast(1),
            acceptanceNote = if (passed) {
                "canary_passed_with_traceable_evidence"
            } else {
                "canary_failed(policy_violations=$policyViolations,evidence_complete=$evidenceComplete)"
            }
        )
    }

    private fun buildSkillGap(missingCapabilities: List<String>): SkillGapPayload? {
        if (missingCapabilities.isEmpty()) return null
        val frequency = if (missingCapabilities.size >= 2) 28 else 12
        return SkillGapPayload(
            missingCapability = missingCapabilities.first(),
            frequency7d = frequency,
            recommendedAction = if (frequency >= 20) {
                SkillGapRecommendation.ADD_SKILL
            } else {
                SkillGapRecommendation.REROUTE
            }
        )
    }

    private fun twinFitBoost(candidate: SkillCandidate, twinState: DynamicHumanStatePayload?): Double {
        if (twinState == null) return 0.0
        var boost = 0.0
        val risk = twinState.l1.riskPreference
        val lowEnergy = twinState.l2.energyLevel < 0.35
        if (risk <= 0.35 && candidate.costTier.equals("low", ignoreCase = true)) {
            boost += 0.05
        } else if (risk >= 0.65 && candidate.successRate >= 0.92) {
            boost += 0.03
        }
        if (lowEnergy && candidate.latencyP95Ms <= 1500) {
            boost += 0.02
        }
        return boost.coerceAtMost(MAX_TWIN_BOOST)
    }

    private fun freshnessBoost(candidate: SkillCandidate, requirement: SkillRequirement): Double {
        if (!requirement.requiresLiveData) return 0.0
        val hasLiveCapability = candidate.capabilities.any { cap ->
            cap.contains("live", ignoreCase = true) ||
                cap.contains("search", ignoreCase = true)
        }
        return if (hasLiveCapability) MAX_FRESHNESS_BOOST else 0.0
    }

    private fun roleFitBoost(
        candidate: SkillCandidate,
        requirement: SkillRequirement,
        activeRole: UserRole
    ): Double {
        val capabilities = candidate.capabilities.joinToString(" ").lowercase()
        val tags = candidate.policyTags.joinToString(" ").lowercase()
        return when (activeRole) {
            UserRole.WORK -> {
                var boost = 0.0
                if (capabilities.contains("analysis") || capabilities.contains("reasoning")) boost += 0.015
                if (tags.contains("audit") || tags.contains("decision_support")) boost += 0.01
                boost
            }

            UserRole.BUYER -> {
                var boost = 0.0
                if (candidate.costTier.equals("low", ignoreCase = true)) boost += 0.02
                if (tags.contains("rollback") || tags.contains("audit")) boost += 0.01
                boost
            }

            UserRole.TRAVELER -> {
                var boost = 0.0
                if (requirement.requiresLiveData && capabilities.contains("live")) boost += 0.02
                if (candidate.latencyP95Ms <= 1500) boost += 0.01
                boost
            }

            UserRole.PARENT -> {
                var boost = 0.0
                if (tags.contains("family_safe") || tags.contains("decision_support")) boost += 0.02
                if (candidate.evidenceLevel.equals("strong", ignoreCase = true)) boost += 0.015
                boost
            }

            UserRole.PERSONAL, UserRole.CUSTOM -> 0.0
        }.coerceAtMost(0.04)
    }

    private fun latencyScore(latencyMs: Long, maxLatencyMs: Long?): Double {
        val baseline = (maxLatencyMs ?: 8_000L).coerceAtLeast(1L)
        return (1.0 - (latencyMs.toDouble() / baseline.toDouble())).coerceIn(0.0, 1.0)
    }

    private fun costTierScore(tier: String): Double {
        return when (tier.trim().lowercase()) {
            "low" -> 1.0
            "mid", "medium" -> 0.7
            "high" -> 0.4
            else -> 0.5
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

    companion object {
        private const val MAX_TWIN_BOOST = 0.05
        private const val MAX_FRESHNESS_BOOST = 0.03
        private const val PRIMARY_SELECTION_THRESHOLD = 0.68
    }
}
