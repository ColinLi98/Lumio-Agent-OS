package com.lumi.coreagent.bellman

import com.lumi.coreagent.soul.InMemoryDigitalSoulStore
import com.lumi.coredomain.contract.DestinyAlternativePayload
import com.lumi.coredomain.contract.DestinyAuditEventPayload
import com.lumi.coredomain.contract.EvidenceItemPayload
import com.lumi.coredomain.contract.ModulePayload

/**
 * BellmanBridge connects the on-device Bellman solver to the Destiny module UI.
 *
 * Architecture flow (per user's diagram):
 *   Digital Twin Builder → BellmanSolver → BellmanBridge → DestinyPayload → DestinyScreen
 *
 * This bridge:
 * 1. Extracts current soul traits from DigitalSoulStore
 * 2. Converts them to a TwinState for the solver
 * 3. Runs solveBellman() or quickSolve()
 * 4. Maps SolveResult → DestinyPayload for the Compose UI
 */
class BellmanBridge(
    private val soulStore: InMemoryDigitalSoulStore
) {

    /**
     * Produce a DestinyPayload for the given user by running the Bellman solver.
     *
     * @param userId   current user
     * @param quick    true = quickSolve (100 scenarios), false = full solve (500)
     * @param goals    optional GoalStack override
     */
    fun evaluate(
        userId: String,
        quick: Boolean = true,
        goals: GoalStack = defaultGoals()
    ): ModulePayload.DestinyPayload {
        val traits = soulStore.exportTraits(userId)
        val twinState = buildTwinState(traits)

        val result = if (quick) quickSolve(twinState, goals) else solveBellman(twinState, goals)

        return mapToPayload(result, goals)
    }

    /**
     * Build TwinState from the soul trait map.
     */
    private fun buildTwinState(traits: List<Pair<String, Double>>): TwinState {
        val traitMap = traits.toMap()

        return TwinState(
            resources = TwinResources(
                cashLiquid = 10000.0, // Default; in production read from user profile
                timeHoursPerWeek = 35.0,
                attentionBudgetScore = traitMap["attention_budget"] ?: 0.5,
                socialCapitalScore = traitMap["social_capital"] ?: 0.5,
                monthlyCashflow = 5000.0
            ),
            riskAversion = 1.0 - (traitMap["negotiation"] ?: 0.3).coerceIn(0.0, 1.0)
        )
    }

    /**
     * Map solver result → DestinyPayload for UI rendering.
     */
    private fun mapToPayload(
        result: SolveResult,
        goals: GoalStack
    ): ModulePayload.DestinyPayload {
        val best = result.bestAction
        val rankedEligible = result.rankedActions.filter { it.eligible }.take(4)
        val topScore = rankedEligible.firstOrNull()
        val now = System.currentTimeMillis()

        val riskLevel = when {
            best == null -> "high"
            result.confidence >= 0.7 -> "low"
            result.confidence >= 0.5 -> "medium"
            else -> "high"
        }

        val strategyLabel = best?.summary ?: "More information is needed to define a strategy"
        val nextBestAction = topScore?.let { score ->
            val probability = (score.failureProb * 100).toInt().coerceIn(0, 100)
            val scoreValue = "%.2f".format(score.score)
            "${score.action.summary} (score $scoreValue, failure ${probability}%)"
        } ?: "Collect constraints first, then re-run Bellman evaluation"

        val nextSteps = rankedEligible.map { score ->
            val riskTag = if (score.failureProb > 0.15) " ⚠️" else ""
            "${score.action.summary} (score: ${"%.2f".format(score.score)})$riskTag"
        }

        val routeSteps = listOf(
            "Analyze current state",
            "Evaluate ${result.nScenarios} scenarios",
            "Compute rolling returns over ${result.horizon} horizons",
            "Recommend: ${best?.summary ?: "N/A"}"
        )

        val alternatives = rankedEligible.drop(1).take(3).map { score ->
            DestinyAlternativePayload(
                actionId = score.action.actionId,
                summary = score.action.summary,
                score = score.score,
                riskLevel = riskLevelForFailure(score.failureProb),
                rationale = buildAlternativeRationale(score)
            )
        }

        val constraintNotes = buildConstraintNotes(result, goals)

        val auditTrail = listOf(
            DestinyAuditEventPayload(
                stage = "state_snapshot",
                detail = "State and goal stack snapshot captured",
                source = "bellman_solver",
                timestampMs = now
            ),
            DestinyAuditEventPayload(
                stage = "scenario_evaluation",
                detail = "Simulated ${result.nScenarios} scenarios with horizon ${result.horizon}",
                source = "bellman_solver",
                timestampMs = now
            ),
            DestinyAuditEventPayload(
                stage = "risk_screening",
                detail = "${result.rankedActions.count { it.eligible }} eligible / ${result.rankedActions.size} candidates after risk checks",
                source = "bellman_solver",
                timestampMs = now
            ),
            DestinyAuditEventPayload(
                stage = "action_selection",
                detail = "Selected: ${best?.summary ?: "none"} (confidence ${"%.0f".format(result.confidence * 100)}%)",
                source = "bellman_solver",
                timestampMs = now
            )
        )

        val evidenceItems = listOf(
            EvidenceItemPayload(
                source = "Bellman Solver",
                title = "Monte Carlo MPC (${result.nScenarios} scenarios, ${result.horizon}w horizon)",
                snippet = "Confidence: ${"%.1f".format(result.confidence * 100)}% | Solve: ${result.solveTimeMs}ms"
            )
        )

        return ModulePayload.DestinyPayload(
            strategyLabel = strategyLabel,
            riskLevel = riskLevel,
            nextSteps = nextSteps,
            routeSteps = routeSteps,
            evidenceItems = evidenceItems,
            nextBestAction = nextBestAction,
            alternatives = alternatives,
            constraintNotes = constraintNotes,
            auditTrail = auditTrail
        )
    }

    private fun riskLevelForFailure(failureProb: Double): String {
        return when {
            failureProb <= 0.12 -> "low"
            failureProb <= 0.25 -> "medium"
            else -> "high"
        }
    }

    private fun buildAlternativeRationale(score: ActionScore): String {
        val failurePct = (score.failureProb * 100).toInt().coerceIn(0, 100)
        val cvar = "%.2f".format(score.cvar90)
        val riskTags = score.action.riskTags
            .takeIf { it.isNotEmpty() }
            ?.joinToString(", ")
            ?: "none"
        return "failure ${failurePct}% · cvar90 $cvar · risk tags: $riskTags"
    }

    private fun buildConstraintNotes(
        result: SolveResult,
        goals: GoalStack
    ): List<String> {
        val hardConstraints = buildList {
            goals.hardConstraints.maxMoneyOutflow?.let { max ->
                add("Hard constraint: single spend must be <= ${"%.0f".format(max)}")
            }
            goals.hardConstraints.maxRiskProbability?.let { max ->
                add("Hard constraint: risk probability must be <= ${"%.0f".format(max * 100)}%")
            }
        }
        val ineligible = result.rankedActions
            .filterNot { it.eligible }
            .take(3)
            .map { score ->
                "${score.action.summary}: ${score.ineligibleReason ?: "failed eligibility checks"}"
            }
        val notes = hardConstraints + ineligible
        return if (notes.isEmpty()) {
            listOf("No hard constraint violations detected in the current simulation.")
        } else {
            notes
        }
    }

    private fun defaultGoals(): GoalStack {
        return GoalStack(
            objectives = listOf(
                Objective("financial_stability", 0.30),
                Objective("time_freedom", 0.25),
                Objective("health", 0.25),
                Objective("career_growth", 0.20)
            ),
            horizonDays = 28
        )
    }
}
