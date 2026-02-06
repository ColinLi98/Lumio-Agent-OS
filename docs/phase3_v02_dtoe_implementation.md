# Phase 3 v0.2 DTOE Implementation

> **Digital Twin Optimization Engine** - 数字分身驱动的人生最优决策引擎  
> 实现日期: 2026-02-06

---

## 概述

Phase 3 v0.2 将 Lumi 从"给答案/给链接"升级为基于粒子滤波和贝尔曼方程的决策优化引擎。

### 核心能力

| 能力 | 实现 |
|------|------|
| 信念状态管理 | 粒子滤波 (N=1000, ESS 自动重采样) |
| 外生冲击建模 | 5类冲击 (市场/支出/健康/政策/执行噪声) |
| 决策优化 | MPC rollout + CVaR 风险调整 |
| 可解释性 | 理由可追溯至 evidence/constraint/risk/goal |
| 闭环学习 | recordOutcome → Bayesian 更新 |

---

## 模块架构

```
services/dtoe/
├── index.ts                 # 统一导出
├── coreSchemas.ts           # 核心类型定义
├── schemaValidators.ts      # 验证 + TTL 检测
├── twinBeliefStore.ts       # 粒子滤波 BeliefState
├── scenarioEngine.ts        # 外生冲击生成器
├── bellmanSolver.ts         # MPC Bellman 近似
├── decisionExplainer.ts     # 可解释卡片生成
├── destinyEngine.ts         # 顶层编排器
├── dtoeEvents.ts            # 可观测性事件
├── transitionModel.ts       # 状态转移函数
├── monteCarloEvaluator.ts   # MC 评估器 (v0.1)
├── strategyCard.ts          # StrategyCard 构建
└── vertexGroundingParser.ts # 证据解析
```

---

## 核心模块详解

### 1. Twin Belief Store

**文件**: `twinBeliefStore.ts`

粒子滤波维护隐状态的后验分布:

```typescript
// 创建信念状态
const belief = createBeliefState(baseTwin, { seed: 42, n_particles: 1000 });

// 观测更新 (似然重权重)
updateBeliefWithEvidence(belief, observation);

// ESS 过低时自动重采样
if (computeESS(belief) < threshold) {
    resampleParticles(belief);
}

// 获取后验统计
const meanState = getPosteriorMeanState(belief);
const std = getPosteriorStd(belief, 'cash_liquid');
```

**关键特性**:
- Mulberry32 seeded PRNG (可复现)
- Systematic resampling (O(N))
- Box-Muller 正态分布生成

### 2. Scenario Engine

**文件**: `scenarioEngine.ts`

生成可复现的外生冲击序列:

| 冲击类型 | 分布 | 范围 |
|---------|------|------|
| market_return | 对数正态 | [-0.3, 0.3] |
| expense_shock | 指数 | [0, ∞) |
| health_shock | 稀疏伯努利 | 0 或 -0.1 |
| policy_shock | 稀疏伯努利 | 0, ±0.05 |
| execution_noise | 高斯 | μ=1, σ=0.1 |

**性能**: 5000 条 scenarios × 4 horizon < 10ms

### 3. Bellman Solver

**文件**: `bellmanSolver.ts`

MPC 形式的贝尔曼方程近似:

```
V(s) ≈ max_a E_ξ[r(s,a,ξ) + γV(s')]
```

**评分公式**:
```
score = E[U] - ρ × CVaR(α)
```

- `E[U]`: Monte Carlo 平均效用
- `ρ`: 风险厌恶系数 (默认 0.5)
- `CVaR(α)`: 条件风险价值 (默认 α=0.9)

**动作模板** (12种):
- wait: 观望等待
- ask: 询问约束/偏好
- do: 执行 (低/中/高强度)
- commit: 确认锁定

### 4. Decision Explainer

**文件**: `decisionExplainer.ts`

生成可追溯的解释卡片:

```typescript
interface ExplanationCard {
    headline: string;
    top_reasons: Array<{
        text: string;
        source: 'metric' | 'evidence' | 'constraint' | 'risk' | 'goal';
        ref_ids: string[];
    }>;
    tradeoffs: Array<{
        dimension: string;
        gain_text: string;
        loss_text: string;
    }>;
    risk_notes: string[];
    alternatives: AlternativeSummary[];
}
```

### 5. Destiny Engine

**文件**: `destinyEngine.ts`

顶层编排器 (Singleton):

```typescript
const engine = getDestinyEngine();

// 获取推荐
const result = await engine.getRecommendation({
    entity_id: 'user_123',
    evidence_pack: evidencePack,
    needs_live_data: true,
    time_budget_ms: 2000,
});

// 闭环学习
engine.recordOutcome('user_123', 'action_001', {
    success: true,
    actual_utility: 0.85,
    observed_values: { cash_liquid: 15000 },
});

// 状态摘要
const summary = engine.getStateSummary('user_123');
```

---

## UI 组件

### DestinyPanel

**文件**: `components/DestinyPanel.tsx`

可折叠的命运引擎面板:

- **Live Status Badge**: emerald (实时) / amber (数据过期)
- **ESS 显示**: 信念状态质量指标
- **Stale Evidence Warning**: 警告用户刷新数据
- **快速统计**: 置信度、风险、证据数量

### DestinyRecommendationCard

**文件**: `components/DestinyRecommendationCard.tsx`

完整推荐卡片:

- **Metrics Row**: p50 / p90 / CVaR_90
- **Risk Indicator**: 基于 failure_prob 的颜色编码
- **Top Reasons**: 带来源标记 (📄/⚙️/⚠️/✓)
- **Evidence References**: 带新鲜度状态的链接
- **Alternatives**: 可点击的备选方案

---

## 测试覆盖

**61 tests passing**

| 测试文件 | 测试数 | 覆盖内容 |
|---------|--------|---------|
| twinBeliefStore.test.ts | 18 | PRNG确定性、权重归一、ESS、重采样 |
| scenarioEngine.test.ts | 10 | 确定性、值域、统计量、性能 |
| bellmanSolver.test.ts | 6 | 排序、CVaR≤mean、约束过滤 |
| decisionExplainer.test.ts | 7 | 理由生成、验证、结构 |
| destinyEngine.test.ts | 8 | 推荐生成、闭环学习、单例 |
| strategyCard.test.ts | 10 | 卡片构建、fallback |
| monteCarloEvaluator.test.ts | 12 | 动作生成、评分、等待动作 |

**关键断言**:
- 固定 seed → Top1 稳定
- CVaR ≤ mean (所有动作)
- recordOutcome 后推荐变化

---

## 可观测性

**文件**: `dtoeEvents.ts`

事件类型:
- `dtoe.engine_init`: 引擎初始化
- `dtoe.recommendation_start`: 推荐请求开始
- `dtoe.belief_created`: 信念状态创建
- `dtoe.solve_complete`: 求解完成
- `dtoe.explain_complete`: 解释生成完成
- `dtoe.evidence_gate_fail`: 证据门禁失败

**Dev-only**: 内存事件存储 + 性能指标

---

## 使用示例

```typescript
import {
    getDestinyEngine,
    createBeliefState,
    solveBellman,
    generateExplanation,
} from '@/services/dtoe';

// 1. 获取引擎实例
const engine = getDestinyEngine();

// 2. 调用推荐 API
const result = await engine.getRecommendation({
    entity_id: 'user_001',
    evidence_pack: {
        query: '如何优化时间管理',
        fetched_at_ms: Date.now(),
        ttl_seconds: 300,
        items: [/* ... */],
    },
    needs_live_data: true,
});

// 3. 渲染 UI
if (result.success) {
    return <DestinyRecommendationCard
        entityId="user_001"
        evidencePack={evidencePack}
    />;
}
```

---

## 性能指标

| 操作 | 耗时 | 备注 |
|------|------|------|
| createBeliefState (1000 particles) | ~5ms | 初始化 |
| generateScenarios (5000 × 4) | ~9ms | MC 场景 |
| solveBellman (full) | ~100ms | 完整求解 |
| quickSolve (500 × 2) | ~15ms | 实时 UI |
| 完整 e2e 推荐 | ~150ms | 含解释生成 |

---

## 相关文档

- [Phase 3 v0.1 实现](./phase3_v01_dtoe_implementation.md)
- [Phase 3 DTOE 规格](./Phase_3_DTOE_Spec.md)
- [Phase 2 总结](./Phase_2_Summary.md)
