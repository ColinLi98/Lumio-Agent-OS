# DTOE v0.3 Phase 3+ 升级文档

> **日期**: 2026-02-06  
> **版本**: v0.3 (Digital Twin 2.0)  
> **测试状态**: ✅ 167/167 通过

---

## 概述

本次升级将 DTOE（Digital Twin Optimization Engine）从 v0.2 升级到 v0.3，实现了 **可泛化、可学习、可校准、可解释、可对齐人生目标** 的决策引擎。

补充（2026-02-06）:
- 推荐主链路现在会将 `EvidencePack` 映射为 observation 并写入 belief store（state machine 闭环）。
- 当 `needs_live_data=true` 且证据缺失时，返回非空 fallback policy 卡片（`ask` 动作），不再返回空卡片。

---

## 新增模块

### 1. Objective Compiler (`objectiveCompiler.ts`)

**功能**: 将用户的 GoalStack 编译成可计算的效用函数

```typescript
interface CompiledObjective {
    evalUtility(state: TwinState, baseline: TwinState): number;
    hardConstraints(state: TwinState): ConstraintViolation[];
    extractedMetrics: string[];
    weights: Record<string, number>;
}
```

**核心函数**:
- `compileObjective(goals, opts)` - 编译目标
- `computeGoalUtility(state, goals)` - 计算效用值
- 支持时间折扣和 CVaR 风险调整

**测试**: 19/19 通过

---

### 2. Likelihood Library (`likelihoodModels.ts` + `observationMapper.ts`)

**功能**: 标准化贝叶斯信念更新的似然计算

**5种似然模型**:
| 模型 | 用途 |
|------|------|
| `normal` | 连续值（收入、资产） |
| `truncatedNormal` | 有界值（比例、评分） |
| `binary` | 二元事件 |
| `poisson` | 计数数据 |
| `exponential` | 持续时间 |

**信号提取**:
- `extractSignals(evidence)` - 从证据包提取标准信号
- 支持 `finance` / `health` / `career` 等领域映射

**测试**: 18/18 通过

---

### 3. Calibration Service (`calibrationService.ts`)

**功能**: 从历史结果学习和校准模型参数

**两种校准方法**:
| 方法 | 特点 |
|------|------|
| EMA | 快速、实时调整 |
| Bayes-lite | 共轭先验、不确定性量化 |

**核心函数**:
```typescript
calibrateFromOutcome(belief, action_id, outcome, opts)
applyCalibration(belief, calibration)
calibrateAndApply(belief, action_id, outcome, opts)
```

**测试**: 10/10 通过

---

### 4. Scenario Engine 增强 (`scenarioEngine.ts`)

**新增冲击库** (`SHOCK_LIBRARY`): 15个分类事件

**新增类**:
- `EnhancedScenarioGenerator` - 支持 regime switching (calm/volatile)
- `ImportanceSampling` - 重要性采样（下行/上行尾部）

**新增并行生成**:
```typescript
interface ParallelScenarioOptions {
    seed?: number;
    enable_parallel_scenarios?: boolean;
    batch_size?: number;         // 默认 500
    max_concurrency?: number;    // 默认 4
    on_progress?: ProgressCallback;
}

// 并行生成场景
await generateScenariosParallel(n, horizon, {
    enable_parallel_scenarios: true,
    batch_size: 500,
    max_concurrency: 4,
});
```

**确定性种子派生**: `deriveBatchSeed(baseSeed, batchIndex)` 保证并行结果可重现

---

### 5. Bellman Solver 增强 (`bellmanSolver.ts`)

**SolveOptions 扩展**:
```typescript
interface SolveOptions {
    time_budget_ms: number;
    max_actions?: number;
    coarse_scenarios?: number;
    fine_scenarios?: number;
    cache?: { enabled: boolean; ttl_ms: number };
    // 新增并行选项
    enable_parallel_scenarios?: boolean;
    parallel_batch_size?: number;
    parallel_max_concurrency?: number;
}
```

**Value Cache**:
- 5分钟 TTL
- 基于 belief + goals 的哈希键
**缓存统计增强**:
```typescript
getCacheStats(): {
    size: number;
    keys: string[];
    hits: number;
    misses: number;
    hit_rate: number;  // 命中率
}
```

**改进的 Belief Hash**: 现在包含 `adherence`, `shockSeverity`, `version`

**新增异步求解器**:
```typescript
// 支持并行场景生成的异步版本
const result = await solveBellmanWithOptionsAsync(belief, goals, {
    time_budget_ms: 1000,
    enable_parallel_scenarios: true,
    parallel_batch_size: 500,
    parallel_max_concurrency: 4,
    cache: { enabled: true, ttl_ms: 300000 },
});
```

---

### 6. Explainer 集成 (`decisionExplainer.ts`)

**Why-Not 解释**:
```typescript
interface WhyNotExplanation {
    alternative_action: string;
    key_differences: WhyNotDifference[];
    hypothetical_change: string;  // "如果X改善，则会选择此方案"
    score_comparison: { chosen_score, alternative_score, gap };
    deciding_factors: { factor, weight, chosen_value, alternative_value }[];
}
```

**敏感性分析**:
```typescript
interface SensitivityResult {
    parameter: string;
    current_value: number;
    threshold_to_switch: number;  // 切换阈值
    sensitivity: 'high' | 'medium' | 'low';
}
```

**审计追踪**:
```typescript
interface DecisionAuditTrail {
    trace_id: string;
    timestamp_ms: number;
    model_version: string;
    evidence_item_indices: number[];
    constraint_keys: string[];
    parameters_used: Record<string, number>;
}
```

**ExplanationCard 扩展**:
```typescript
interface ExplanationCard {
    // ... 原有字段
    why_not_explanations?: WhyNotExplanation[];
    sensitivity?: SensitivityResult[];
    audit_trail?: DecisionAuditTrail;
}
```

**ExplainerOutput 完整集成**:
```typescript
interface ExplainerOutput {
    strategy_card: StrategyCard;
    explanation_card: ExplanationCard;
    why_not_explanations: WhyNotExplanation[];
    sensitivity: SensitivityResult[];
    audit_trail: DecisionAuditTrail;
}
```

`generateExplanation` 现在自动调用:
- `generateWhyNotExplanations()` - 生成反事实解释
- `analyzeSensitivity()` - 敏感性分析
- `generateAuditTrail()` - 审计追踪

---

## 安全修复 (PR-08)

**已修复**: 移除硬编码 API Key，改用环境变量:
- `NEXT_PUBLIC_GEMINI_API_KEY` (Next.js)
- `VITE_GEMINI_API_KEY` (Vite)

---

## 测试结果

```
Test Files  13 passed (13)
     Tests  167 passed (167)
  Duration  587ms
```

**测试文件**:
- `objectiveCompiler.test.ts` - 19 tests
- `likelihoodLibrary.test.ts` - 18 tests
- `calibrationService.test.ts` - 10 tests
- `twinBeliefStore.test.ts`
- `scenarioEngine.test.ts`
- `bellmanSolver.test.ts`
- `decisionExplainer.test.ts`
- `destinyEngine.test.ts`
- `scenarioEngine.benchmark.test.ts`
- 其他...

**并行场景基准**:
- 基准规模: `5000 x horizon=4`
- 当前结果: 并行模式约 `+5.5%`（软目标 `>=25%`，尚未达标）
- 发布策略: 通过 `enable_parallel_scenarios` 特性开关逐步启用

---

## 使用示例

### 编译目标并计算效用
```typescript
import { compileObjective } from './services/dtoe/objectiveCompiler';

const compiled = compileObjective(goals);
const utility = compiled.evalUtility(currentState, baselineState);
const violations = compiled.hardConstraints(currentState);
```

### 并行场景生成 + 异步求解
```typescript
import { solveBellmanWithOptionsAsync } from './services/dtoe/bellmanSolver';

const result = await solveBellmanWithOptionsAsync(belief, goals, {
    time_budget_ms: 2000,
    enable_parallel_scenarios: true,
    parallel_batch_size: 500,
    parallel_max_concurrency: 4,
    cache: { enabled: true, ttl_ms: 300000 },
});

// 获取缓存统计
const stats = getCacheStats();
console.log(`Cache hit rate: ${(stats.hit_rate * 100).toFixed(1)}%`);
```

### 校准模型参数
```typescript
import { calibrateAndApply } from './services/dtoe/calibrationService';

const { belief: updated, calibration } = calibrateAndApply(
    belief,
    'action_123',
    { success: true, actual_utility: 0.8, timestamp_ms: Date.now() },
    { method: 'ema', lr: 0.1 }
);
```

### 获取完整解释输出
```typescript
import { generateExplanation } from './services/dtoe/decisionExplainer';

const output = generateExplanation({
    solve_result: result,
    evidence_pack: evidence,
    goals: userGoals,
    needs_live_data: true,
});

// 完整输出包含
console.log(output.why_not_explanations);  // 反事实解释
console.log(output.sensitivity);            // 敏感性分析
console.log(output.audit_trail);            // 审计追踪
```

---

## 文件变更汇总

### 新增文件
| 文件 | 描述 |
|------|------|
| `services/dtoe/objectiveCompiler.ts` | 目标编译器 |
| `services/dtoe/observationMapper.ts` | 观测信号提取 |
| `services/dtoe/likelihoodModels.ts` | 似然模型库 |
| `services/dtoe/calibrationService.ts` | 校准服务 |
| `tests/dtoe/objectiveCompiler.test.ts` | 测试 |
| `tests/dtoe/likelihoodLibrary.test.ts` | 测试 |
| `tests/dtoe/calibrationService.test.ts` | 测试 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `objectiveCompiler.ts` | 新增 |
| `observationMapper.ts` | 新增 |
| `likelihoodModels.ts` | 新增 |
| `calibrationService.ts` | 新增 |
| `scenarioEngine.ts` | 添加并行生成、冲击库 |
| `bellmanSolver.ts` | 添加异步求解、缓存统计 |
| `decisionExplainer.ts` | 集成反事实解释 |
| `apiKeyManager.ts` | 安全修复 |

---

## 下一步

1. 并行场景生成继续优化（目标性能增益 `>=25%`）
2. 压测通过后将 `enable_parallel_scenarios` 默认值从 `false` 切换为 `true`
3. 继续扩展更多领域观测映射器（education/family 之外）
4. 增补 Web Worker 版并行实现与端侧性能对比
