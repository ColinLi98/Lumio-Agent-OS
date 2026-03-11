package com.lumi.coreagent.bellman

import java.util.UUID
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Bellman Solver — Kotlin port of the TypeScript DTOE BellmanSolver.
 *
 * Uses Monte Carlo MPC to approximate:
 *   V(s) = max_a E[r(s,a,ξ) + γV(s')]
 *
 * Score = E[Utility] - ρ · CVaR(α)
 *
 * This is a compact, self-contained Kotlin implementation suitable for
 * on-device execution on Android to support the Destiny/Navigator module.
 */

// ============================================================================
// Core Types
// ============================================================================

data class TwinResources(
    val cashLiquid: Double = 10000.0,
    val timeHoursPerWeek: Double = 40.0,
    val attentionBudgetScore: Double = 0.5,
    val socialCapitalScore: Double = 0.5,
    val monthlyCashflow: Double = 5000.0
)

data class TwinState(
    val resources: TwinResources,
    val riskAversion: Double = 0.5,
    val timestampMs: Long = System.currentTimeMillis()
)

enum class ActionType { DO, ASK, WAIT, COMMIT }
enum class Reversibility { REVERSIBLE, PARTIALLY_REVERSIBLE, IRREVERSIBLE }

data class ActionCost(
    val timeHours: Double = 0.0,
    val money: Double = 0.0,
    val attentionCost: Double = 0.0
)

data class BellmanAction(
    val actionId: String,
    val actionType: ActionType,
    val summary: String,
    val cost: ActionCost,
    val reversibility: Reversibility,
    val riskTags: List<String> = emptyList()
)

data class Objective(
    val metric: String,
    val weight: Double,
    val target: Double? = null
)

data class HardConstraints(
    val maxMoneyOutflow: Double? = null,
    val maxRiskProbability: Double? = null
)

data class GoalStack(
    val objectives: List<Objective>,
    val horizonDays: Int = 28,
    val hardConstraints: HardConstraints = HardConstraints()
)

data class ExogenousShock(
    val marketReturn: Double,
    val expenseShock: Double,
    val healthShock: Double,
    val executionNoise: Double
)

data class ActionScore(
    val action: BellmanAction,
    val meanUtility: Double,
    val stdUtility: Double,
    val cvar90: Double,
    val failureProb: Double,
    val score: Double,
    val eligible: Boolean,
    val ineligibleReason: String? = null
)

data class SolveResult(
    val traceId: String,
    val rankedActions: List<ActionScore>,
    val bestAction: BellmanAction?,
    val confidence: Double,
    val solveTimeMs: Long,
    val nScenarios: Int,
    val horizon: Int
)

data class SolverConfig(
    val nScenarios: Int = 500,
    val horizon: Int = 4,
    val discount: Double = 0.98,
    val riskAversion: Double = 0.5,
    val cvarAlpha: Double = 0.9,
    val maxFailureProb: Double = 0.3,
    val seed: Long? = null
)

// ============================================================================
// Seeded RNG (matching TypeScript xoshiro-like PRNG)
// ============================================================================

class SeededRNG(seed: Long) {
    private var state: Long = seed xor 0x6D2B79F5L

    fun random(): Double {
        var t = state + 0x6D2B79F5L
        state = t
        t = (t xor (t ushr 15)) * (t or 1L)
        t = t xor (t + (t xor (t ushr 7)) * (t or 61L))
        return ((t xor (t ushr 14)) and 0xFFFFFFFFL).toDouble() / 4294967296.0
    }

    fun randomNormal(mean: Double = 0.0, std: Double = 1.0): Double {
        val u = random() * 2.0 - 1.0
        return mean + u * std * 1.7320508075688772 // sqrt(3) approximation
    }
}

// ============================================================================
// Default Action Templates
// ============================================================================

val DEFAULT_ACTION_TEMPLATES: List<BellmanAction> = listOf(
    BellmanAction("wait_1w", ActionType.WAIT, "Wait one week and observe changes", ActionCost(), Reversibility.REVERSIBLE),
    BellmanAction("ask_constraints", ActionType.ASK, "Ask user time/budget constraints", ActionCost(0.1), Reversibility.REVERSIBLE),
    BellmanAction("do_research", ActionType.DO, "Perform lightweight research", ActionCost(2.0), Reversibility.REVERSIBLE),
    BellmanAction("do_plan", ActionType.DO, "Create a simple action plan", ActionCost(1.0), Reversibility.REVERSIBLE),
    BellmanAction("do_optimize", ActionType.DO, "Optimize schedule arrangement", ActionCost(3.0), Reversibility.PARTIALLY_REVERSIBLE, listOf("time_commitment")),
    BellmanAction("do_skill_invest", ActionType.DO, "Invest in skill learning", ActionCost(10.0, 100.0), Reversibility.PARTIALLY_REVERSIBLE, listOf("time_commitment", "money_outflow")),
    BellmanAction("do_career_move", ActionType.DO, "Take career-growth action", ActionCost(15.0), Reversibility.PARTIALLY_REVERSIBLE, listOf("career_risk")),
    BellmanAction("do_major_invest", ActionType.DO, "Make a major financial decision", ActionCost(5.0, 5000.0), Reversibility.IRREVERSIBLE, listOf("financial_risk")),
    BellmanAction("commit_goal", ActionType.COMMIT, "Confirm and lock the goal", ActionCost(0.5), Reversibility.IRREVERSIBLE, listOf("commitment"))
)

// ============================================================================
// Transition Model
// ============================================================================

private fun transition(
    state: TwinState,
    action: BellmanAction,
    shock: ExogenousShock
): TwinState {
    val r = state.resources

    // Action effects
    val timeDelta = -action.cost.timeHours
    val moneyDelta = -action.cost.money
    val attentionDelta = when (action.actionType) {
        ActionType.WAIT -> 0.05
        ActionType.ASK -> -0.01
        ActionType.DO -> -action.cost.attentionCost * 0.1
        ActionType.COMMIT -> -action.cost.attentionCost * 0.05
    }

    // Apply action + shock
    val newCash = max(0.0, (r.cashLiquid + moneyDelta) * (1.0 + shock.marketReturn) - shock.expenseShock * r.cashLiquid)
    val newTime = max(0.0, r.timeHoursPerWeek + timeDelta)
    val newAttention = (r.attentionBudgetScore + attentionDelta + shock.healthShock * 0.1).coerceIn(0.0, 1.0)
    val newSocial = (r.socialCapitalScore + if (action.actionType == ActionType.ASK) -0.01 else 0.0).coerceIn(0.0, 1.0)

    return state.copy(
        resources = TwinResources(
            cashLiquid = newCash,
            timeHoursPerWeek = newTime,
            attentionBudgetScore = newAttention,
            socialCapitalScore = newSocial,
            monthlyCashflow = r.monthlyCashflow
        ),
        timestampMs = state.timestampMs + 7 * 24 * 60 * 60 * 1000 // +1 week
    )
}

// ============================================================================
// Solver Core
// ============================================================================

private fun computeUtility(state: TwinState, goals: GoalStack): Double {
    var utility = 0.0
    for (obj in goals.objectives) {
        val value = when (obj.metric) {
            "financial_stability" -> state.resources.cashLiquid / 10000.0
            "time_freedom" -> state.resources.timeHoursPerWeek / 40.0
            "health", "attention" -> state.resources.attentionBudgetScore
            "social_capital" -> state.resources.socialCapitalScore
            "career_growth" -> state.resources.monthlyCashflow / 10000.0
            else -> 0.0
        }
        utility += obj.weight * value
    }
    return utility
}

private fun checkConstraints(
    action: BellmanAction,
    state: TwinState,
    goals: GoalStack
): Pair<Boolean, String?> {
    if (action.cost.money > state.resources.cashLiquid) {
        return false to "Insufficient funds"
    }
    if (action.cost.timeHours > state.resources.timeHoursPerWeek) {
        return false to "Insufficient time"
    }
    goals.hardConstraints.maxMoneyOutflow?.let { maxOutflow ->
        if (action.cost.money > maxOutflow) {
            return false to "Exceeds single-spend limit"
        }
    }
    return true to null
}

private fun computeCVaR(samples: List<Double>, alpha: Double): Double {
    if (samples.isEmpty()) return 0.0
    val sorted = samples.sorted()
    val cutoff = max(1, ((1 - alpha) * sorted.size).toInt())
    val tail = sorted.take(cutoff)
    return tail.average()
}

private fun rolloutAction(
    initialState: TwinState,
    action: BellmanAction,
    shocks: List<ExogenousShock>,
    goals: GoalStack,
    discount: Double
): Double {
    var state = initialState
    var totalUtility = 0.0
    var discountFactor = 1.0

    val idleAction = BellmanAction("idle", ActionType.WAIT, "Wait", ActionCost(), Reversibility.REVERSIBLE)

    for ((t, shock) in shocks.withIndex()) {
        val currentAction = if (t == 0) action else idleAction
        state = transition(state, currentAction, shock)
        val stepUtility = computeUtility(state, goals)
        totalUtility += discountFactor * stepUtility
        discountFactor *= discount
    }

    return totalUtility
}

/**
 * Main Bellman solver entry point.
 *
 * Takes the current twin state, goal stack, and optional configuration.
 * Returns ranked actions with scores, CVaR risk measures, and the recommended best action.
 */
fun solveBellman(
    state: TwinState,
    goals: GoalStack,
    config: SolverConfig = SolverConfig(),
    candidateActions: List<BellmanAction> = DEFAULT_ACTION_TEMPLATES
): SolveResult {
    val startTime = System.currentTimeMillis()
    val traceId = "solve_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}"

    val rng = SeededRNG(config.seed ?: System.currentTimeMillis())

    // Generate scenarios
    val scenarios = (0 until config.nScenarios).map {
        (0 until config.horizon).map {
            ExogenousShock(
                marketReturn = rng.randomNormal(0.07 / 52, 0.15 / sqrt(52.0)),
                expenseShock = if (rng.random() < 0.05) max(0.0, rng.randomNormal(0.1, 0.05)) else 0.0,
                healthShock = if (rng.random() < 0.03) rng.randomNormal(-0.1, 0.05) else 0.0,
                executionNoise = rng.randomNormal(0.0, 0.1)
            )
        }
    }

    // Score all actions
    val scores = candidateActions.map { action ->
        val (eligible, reason) = checkConstraints(action, state, goals)
        if (!eligible) {
            return@map ActionScore(
                action = action,
                meanUtility = Double.NEGATIVE_INFINITY,
                stdUtility = 0.0,
                cvar90 = Double.NEGATIVE_INFINITY,
                failureProb = 1.0,
                score = Double.NEGATIVE_INFINITY,
                eligible = false,
                ineligibleReason = reason
            )
        }

        val samples = scenarios.map { shocks ->
            rolloutAction(state, action, shocks, goals, config.discount)
        }

        val mean = samples.average()
        val variance = samples.map { (it - mean).pow(2) }.average()
        val std = sqrt(variance)
        val cvar90 = computeCVaR(samples, 0.9)

        val failureThreshold = mean - std
        val failureProb = samples.count { it < failureThreshold }.toDouble() / samples.size
        val score = mean - config.riskAversion * abs(cvar90)
        val isEligible = failureProb <= config.maxFailureProb

        ActionScore(
            action = action,
            meanUtility = mean,
            stdUtility = std,
            cvar90 = cvar90,
                failureProb = failureProb,
                score = score,
                eligible = isEligible,
                ineligibleReason = if (isEligible) null else "Failure probability exceeds limit"
        )
    }

    val ranked = scores.sortedWith(
        compareByDescending<ActionScore> { it.eligible }
            .thenByDescending { it.score }
    )

    // Compute confidence from score gap
    var confidence = 0.5
    if (ranked.size >= 2 && ranked[0].eligible && ranked[1].eligible) {
        val gap = ranked[0].score - ranked[1].score
        val avgScore = (ranked[0].score + ranked[1].score) / 2.0
        confidence = min(0.95, 0.5 + (gap / (abs(avgScore) + 1.0)) * 0.3)
    }

    val bestAction = ranked.firstOrNull { it.eligible }?.action

    return SolveResult(
        traceId = traceId,
        rankedActions = ranked,
        bestAction = bestAction,
        confidence = confidence,
        solveTimeMs = System.currentTimeMillis() - startTime,
        nScenarios = config.nScenarios,
        horizon = config.horizon
    )
}

/**
 * Quick solve variant for real-time UI (fewer scenarios, shorter horizon).
 */
fun quickSolve(
    state: TwinState,
    goals: GoalStack,
    config: SolverConfig = SolverConfig(nScenarios = 100, horizon = 2)
): SolveResult = solveBellman(state, goals, config)
