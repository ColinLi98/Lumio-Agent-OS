/**
 * Risk Models
 * Phase 3 DTOE: Digital Twin Optimization Engine
 * 
 * Risk metrics for evaluating action outcomes.
 * Includes CVaR (Conditional Value at Risk), VaR, and sensitivity analysis.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Distribution statistics for an outcome
 */
export interface DistributionStats {
    mean: number;
    std: number;
    min: number;
    max: number;
    p5: number;   // 5th percentile
    p25: number;  // 25th percentile
    p50: number;  // median
    p75: number;  // 75th percentile
    p95: number;  // 95th percentile
}

/**
 * Risk metrics for an action
 */
export interface RiskMetrics {
    /** Expected value */
    mean: number;
    /** Standard deviation */
    std: number;
    /** Value at Risk (5th percentile of losses) */
    var_5: number;
    /** Conditional Value at Risk (expected loss given loss exceeds VaR) */
    cvar_5: number;
    /** Probability of violating constraints */
    p_violate: number;
    /** Downside deviation (std of negative returns only) */
    downside_deviation: number;
    /** Sharpe-like ratio: mean / std */
    risk_adjusted_score: number;
}

/**
 * Sensitivity analysis result
 */
export interface SensitivityResult {
    param_key: string;
    direction: 'increase' | 'decrease';
    delta_percent: number;
    impact_on_mean: number;
    impact_on_cvar: number;
}

// ============================================================================
// Core Risk Calculations
// ============================================================================

/**
 * Compute distribution statistics from samples
 */
export function computeStats(samples: number[]): DistributionStats {
    if (samples.length === 0) {
        return {
            mean: 0, std: 0, min: 0, max: 0,
            p5: 0, p25: 0, p50: 0, p75: 0, p95: 0,
        };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = samples.reduce((a, b) => a + b, 0) / n;
    const variance = samples.reduce((acc, x) => acc + (x - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);

    return {
        mean,
        std,
        min: sorted[0],
        max: sorted[n - 1],
        p5: percentile(sorted, 0.05),
        p25: percentile(sorted, 0.25),
        p50: percentile(sorted, 0.50),
        p75: percentile(sorted, 0.75),
        p95: percentile(sorted, 0.95),
    };
}

/**
 * Compute risk metrics from outcome samples
 * @param samples - Array of utility/value outcomes
 * @param baseline - Baseline value (e.g., current state utility)
 * @param constraints - Optional constraint thresholds
 */
export function computeRiskMetrics(
    samples: number[],
    baseline: number = 0,
    constraints?: { min_wealth?: number; min_health?: number }
): RiskMetrics {
    if (samples.length === 0) {
        return {
            mean: 0, std: 0, var_5: 0, cvar_5: 0,
            p_violate: 0, downside_deviation: 0, risk_adjusted_score: 0,
        };
    }

    const stats = computeStats(samples);

    // Compute returns relative to baseline
    const returns = samples.map(s => s - baseline);
    const negativeReturns = returns.filter(r => r < 0);

    // VaR at 5%
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var5 = percentile(sortedReturns, 0.05);

    // CVaR at 5% (expected value of worst 5% outcomes)
    const cutoffIdx = Math.ceil(sortedReturns.length * 0.05);
    const worst5Pct = sortedReturns.slice(0, cutoffIdx);
    const cvar5 = worst5Pct.length > 0
        ? worst5Pct.reduce((a, b) => a + b, 0) / worst5Pct.length
        : var5;

    // Downside deviation
    const downsideDeviation = negativeReturns.length > 0
        ? Math.sqrt(negativeReturns.reduce((acc, r) => acc + r ** 2, 0) / negativeReturns.length)
        : 0;

    // Constraint violation probability (simplified)
    const pViolate = negativeReturns.length / samples.length;

    // Risk-adjusted score (Sharpe-like)
    const riskAdjusted = stats.std > 0.001 ? stats.mean / stats.std : stats.mean * 100;

    return {
        mean: stats.mean,
        std: stats.std,
        var_5: var5,
        cvar_5: cvar5,
        p_violate: pViolate,
        downside_deviation: downsideDeviation,
        risk_adjusted_score: riskAdjusted,
    };
}

/**
 * Compute CVaR directly from sorted samples
 */
export function computeCVaR(samples: number[], alpha: number = 0.05): number {
    const sorted = [...samples].sort((a, b) => a - b);
    const cutoffIdx = Math.max(1, Math.ceil(sorted.length * alpha));
    const tail = sorted.slice(0, cutoffIdx);
    return tail.reduce((a, b) => a + b, 0) / tail.length;
}

/**
 * Compute VaR at given confidence level
 */
export function computeVaR(samples: number[], alpha: number = 0.05): number {
    const sorted = [...samples].sort((a, b) => a - b);
    return percentile(sorted, alpha);
}

// ============================================================================
// Weighted Risk Calculations (P0-4: Belief-Aware)
// ============================================================================

/**
 * Weighted distribution statistics
 */
export interface WeightedStats {
    mean: number;
    std: number;
    var_5: number;
    cvar_5: number;
}

/**
 * Compute weighted mean
 */
export function computeWeightedMean(values: number[], weights: number[]): number {
    if (values.length === 0) return 0;
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    if (sumWeights === 0) return 0;
    let weightedSum = 0;
    for (let i = 0; i < values.length; i++) {
        weightedSum += values[i] * weights[i];
    }
    return weightedSum / sumWeights;
}

/**
 * Compute weighted standard deviation
 */
export function computeWeightedStd(values: number[], weights: number[]): number {
    if (values.length === 0) return 0;
    const mean = computeWeightedMean(values, weights);
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    if (sumWeights === 0) return 0;

    let weightedVariance = 0;
    for (let i = 0; i < values.length; i++) {
        weightedVariance += weights[i] * (values[i] - mean) ** 2;
    }
    return Math.sqrt(weightedVariance / sumWeights);
}

/**
 * Compute weighted quantile (VaR)
 */
export function computeWeightedQuantile(
    values: number[],
    weights: number[],
    q: number
): number {
    if (values.length === 0) return 0;

    // Create sorted pairs
    const pairs = values.map((v, i) => ({ value: v, weight: weights[i] }));
    pairs.sort((a, b) => a.value - b.value);

    // Normalize weights
    const totalWeight = pairs.reduce((acc, p) => acc + p.weight, 0);
    if (totalWeight === 0) return pairs[0]?.value ?? 0;

    // Find quantile
    let cumWeight = 0;
    for (const pair of pairs) {
        cumWeight += pair.weight / totalWeight;
        if (cumWeight >= q) {
            return pair.value;
        }
    }
    return pairs[pairs.length - 1]?.value ?? 0;
}

/**
 * Compute weighted CVaR (expected value of worst q% outcomes)
 */
export function computeWeightedCVaR(
    values: number[],
    weights: number[],
    alpha: number = 0.05
): number {
    if (values.length === 0) return 0;

    // Create sorted pairs
    const pairs = values.map((v, i) => ({ value: v, weight: weights[i] }));
    pairs.sort((a, b) => a.value - b.value);

    // Normalize weights
    const totalWeight = pairs.reduce((acc, p) => acc + p.weight, 0);
    if (totalWeight === 0) return pairs[0]?.value ?? 0;

    // Compute weighted average of worst alpha% outcomes
    let cumWeight = 0;
    let tailSum = 0;
    let tailWeight = 0;
    const targetWeight = alpha * totalWeight;

    for (const pair of pairs) {
        const normalizedWeight = pair.weight;
        const contribute = Math.min(normalizedWeight, targetWeight - cumWeight);
        if (contribute > 0) {
            tailSum += pair.value * contribute;
            tailWeight += contribute;
        }
        cumWeight += normalizedWeight;
        if (cumWeight >= targetWeight) break;
    }

    return tailWeight > 0 ? tailSum / tailWeight : pairs[0]?.value ?? 0;
}

/**
 * Compute weighted risk metrics (P0-4: Belief-Aware Optimization)
 * @param values - Array of outcome values
 * @param weights - Array of particle weights
 * @param baseline - Baseline value for computing returns
 */
export function computeRiskMetricsWeighted(
    values: number[],
    weights: number[],
    baseline: number = 0
): RiskMetrics {
    if (values.length === 0 || weights.length === 0) {
        return {
            mean: 0, std: 0, var_5: 0, cvar_5: 0,
            p_violate: 0, downside_deviation: 0, risk_adjusted_score: 0,
        };
    }

    // Normalize weights
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normWeights = weights.map(w => w / totalWeight);

    // Compute returns
    const returns = values.map(v => v - baseline);

    // Weighted statistics
    const mean = computeWeightedMean(values, normWeights);
    const std = computeWeightedStd(values, normWeights);
    const var5 = computeWeightedQuantile(returns, normWeights, 0.05);
    const cvar5 = computeWeightedCVaR(returns, normWeights, 0.05);

    // Weighted downside deviation
    let downsideSum = 0;
    let downsideWeight = 0;
    for (let i = 0; i < returns.length; i++) {
        if (returns[i] < 0) {
            downsideSum += normWeights[i] * returns[i] ** 2;
            downsideWeight += normWeights[i];
        }
    }
    const downsideDeviation = downsideWeight > 0
        ? Math.sqrt(downsideSum / downsideWeight)
        : 0;

    // Weighted violation probability
    let pViolate = 0;
    for (let i = 0; i < returns.length; i++) {
        if (returns[i] < 0) {
            pViolate += normWeights[i];
        }
    }

    // Risk-adjusted score
    const riskAdjusted = std > 0.001 ? mean / std : mean * 100;

    return {
        mean,
        std,
        var_5: var5,
        cvar_5: cvar5,
        p_violate: pViolate,
        downside_deviation: downsideDeviation,
        risk_adjusted_score: riskAdjusted,
    };
}

// ============================================================================
// Sensitivity Analysis
// ============================================================================

/**
 * Compute sensitivity of metrics to parameter changes
 */
export function computeSensitivity(
    baseMetrics: RiskMetrics,
    perturbedMetrics: RiskMetrics,
    paramKey: string,
    deltaPercent: number
): SensitivityResult {
    const direction = deltaPercent > 0 ? 'increase' : 'decrease';

    return {
        param_key: paramKey,
        direction,
        delta_percent: Math.abs(deltaPercent),
        impact_on_mean: perturbedMetrics.mean - baseMetrics.mean,
        impact_on_cvar: perturbedMetrics.cvar_5 - baseMetrics.cvar_5,
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compute percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = p * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) {
        return sorted[lower];
    }
    const frac = idx - lower;
    return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

/**
 * Format risk metrics for display
 */
export function formatRiskMetrics(metrics: RiskMetrics): string[] {
    return [
        `期望值: ${(metrics.mean * 100).toFixed(1)}%`,
        `波动率: ${(metrics.std * 100).toFixed(1)}%`,
        `风险价值(5%): ${(metrics.var_5 * 100).toFixed(1)}%`,
        `条件风险(CVaR): ${(metrics.cvar_5 * 100).toFixed(1)}%`,
        `下行偏离: ${(metrics.downside_deviation * 100).toFixed(1)}%`,
        `约束违反概率: ${(metrics.p_violate * 100).toFixed(1)}%`,
    ];
}

/**
 * Interpret risk level from CVaR
 */
export function interpretRiskLevel(cvar: number): {
    level: 'low' | 'medium' | 'high' | 'extreme';
    label: string;
    color: string;
} {
    if (cvar > -0.05) {
        return { level: 'low', label: '低风险', color: '#22c55e' };
    } else if (cvar > -0.15) {
        return { level: 'medium', label: '中等风险', color: '#f59e0b' };
    } else if (cvar > -0.30) {
        return { level: 'high', label: '高风险', color: '#ef4444' };
    } else {
        return { level: 'extreme', label: '极高风险', color: '#dc2626' };
    }
}

/**
 * Compute combined score with risk aversion
 */
export function computeRiskAdjustedScore(
    metrics: RiskMetrics,
    rho: number = 0.5  // Risk aversion coefficient
): number {
    // Mean - rho * CVaR penalty
    // Higher rho = more risk averse
    return metrics.mean - rho * Math.abs(metrics.cvar_5);
}
