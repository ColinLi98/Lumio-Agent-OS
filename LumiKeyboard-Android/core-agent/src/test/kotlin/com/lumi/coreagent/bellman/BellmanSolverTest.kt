package com.lumi.coreagent.bellman

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Tests for the Bellman Solver Monte Carlo MPC engine.
 *
 * Key invariants tested:
 * 1. bestAction is non-null when actions are affordable
 * 2. rankedActions sorted by eligibility then score
 * 3. quickSolve uses fewer scenarios (100)
 * 4. Seeded RNG produces deterministic results
 * 5. CVaR and failureProb values are bounded
 *
 * Scaffolded by OpenClaw (Opus 4.6), reviewed & corrected by Team Leader.
 */
class BellmanSolverTest {

    private val defaultState = TwinState(resources = TwinResources())
    private val defaultGoals = GoalStack(
        objectives = listOf(
            Objective("financial_stability", 0.4),
            Objective("time_freedom", 0.3),
            Objective("health", 0.3)
        )
    )

    @Test
    fun `solveBellman returns non-null bestAction with default state`() {
        val result = solveBellman(defaultState, defaultGoals)

        assertNotNull(result.bestAction, "Best action should not be null for default state")
        assertTrue(result.rankedActions.isNotEmpty(), "Should have ranked actions")
        assertTrue(result.confidence in 0.0..1.0, "Confidence should be in [0, 1]")
    }

    @Test
    fun `rankedActions are sorted eligible-first then by score descending`() {
        val result = solveBellman(defaultState, defaultGoals)

        val ranked = result.rankedActions
        // All eligible actions should come before ineligible
        val eligibleIdx = ranked.indexOfLast { it.eligible }
        val ineligibleIdx = ranked.indexOfFirst { !it.eligible }
        if (eligibleIdx >= 0 && ineligibleIdx >= 0) {
            assertTrue(eligibleIdx < ineligibleIdx, "All eligible should precede ineligible")
        }

        // Eligible actions should be sorted by score descending
        val eligibleScores = ranked.filter { it.eligible }.map { it.score }
        assertEquals(eligibleScores.sortedDescending(), eligibleScores, "Eligible actions should be sorted descending by score")
    }

    @Test
    fun `quickSolve uses 100 scenarios by default`() {
        val result = quickSolve(defaultState, defaultGoals)

        assertEquals(100, result.nScenarios, "quickSolve should use 100 scenarios")
        assertEquals(2, result.horizon, "quickSolve should use horizon=2")
    }

    @Test
    fun `seeded RNG produces identical results`() {
        val config = SolverConfig(nScenarios = 50, seed = 42L)

        val result1 = solveBellman(defaultState, defaultGoals, config)
        val result2 = solveBellman(defaultState, defaultGoals, config)

        assertEquals(
            result1.bestAction?.actionId,
            result2.bestAction?.actionId,
            "Same seed should produce same best action"
        )

        // Compare ranked scores
        val scores1 = result1.rankedActions.map { "%.6f".format(it.score) }
        val scores2 = result2.rankedActions.map { "%.6f".format(it.score) }
        assertEquals(scores1, scores2, "Same seed should produce identical scores")
    }

    @Test
    fun `failureProb is within 0 to 1 for all actions`() {
        val result = solveBellman(defaultState, defaultGoals)

        result.rankedActions.filter { it.eligible }.forEach { actionScore ->
            assertTrue(
                actionScore.failureProb in 0.0..1.0,
                "failureProb for ${actionScore.action.actionId} should be in [0, 1], got ${actionScore.failureProb}"
            )
        }
    }

    @Test
    fun `CVaR90 is finite for eligible actions`() {
        val result = solveBellman(defaultState, defaultGoals)

        result.rankedActions.filter { it.eligible }.forEach { actionScore ->
            assertTrue(
                actionScore.cvar90.isFinite(),
                "CVaR90 for ${actionScore.action.actionId} should be finite, got ${actionScore.cvar90}"
            )
        }
    }

    @Test
    fun `solveBellman completes within reasonable time`() {
        val result = solveBellman(defaultState, defaultGoals, SolverConfig(nScenarios = 200))

        assertTrue(result.solveTimeMs < 5000, "Solver should complete in <5s, took ${result.solveTimeMs}ms")
    }
}
