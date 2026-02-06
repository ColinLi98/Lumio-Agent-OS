# Phase 3 v0.1 DTOE Implementation Documentation

## Digital Twin Optimization Engine - Core Specification Implementation

**实施日期**: 2026-02-06  
**状态**: ✅ 已完成

---

## 概述

Phase 3 v0.1 实现了 Lumi 的数字孪生优化引擎 (DTOE) 核心规范，包括：

- **统一 Schema**: TwinState, Observation, Action, GoalStack, EvidencePack, StrategyCard
- **Monte Carlo 策略评估器**: 基于 CVaR 的风险感知决策
- **证据集成**: Vertex Grounding 解析 + P0 证据门控
- **StrategyCard 输出**: "策略 > 答案" 格式的决策输出

---

## 新增文件

### `services/dtoe/` 模块

| 文件 | 描述 |
|------|------|
| `coreSchemas.ts` | v0.1 类型定义 (TwinState, Action, GoalStack, EvidencePack, StrategyCard) |
| `schemaValidators.ts` | 运行时验证器 + P0 证据门控 |
| `transitionModel.ts` | 状态转移模型 + 不确定性采样 |
| `monteCarloEvaluator.ts` | Monte Carlo 策略评估 (N=5000, CVaR) |
| `strategyCard.ts` | StrategyCard 构建 + Fallback 处理 |
| `vertexGroundingParser.ts` | Vertex AI 引文解析 + 电商域过滤 |
| `index.ts` | 模块导出 |

### `tests/dtoe/` 测试

| 文件 | 测试数 |
|------|--------|
| `coreSchemas.test.ts` | 21 |
| `monteCarloEvaluator.test.ts` | 10 |
| `strategyCard.test.ts` | 12 |
| `evidenceGate.test.ts` | 15 |
| **总计** | **58** |

---

## 核心类型定义

### TwinState

```typescript
interface TwinState {
    entity: Entity;                    // person/company/org/nation/project
    timestamp_ms: number;
    resources: {
        time_hours_per_week?: number;
        cash_liquid?: number;
        social_capital_score?: number;  // 0-1
        attention_budget_score?: number;
    };
    capabilities?: {
        skills?: string[];
        execution_reliability?: number;
    };
    constraints: {
        hard: HardConstraints;
        soft?: Record<string, unknown>;
    };
    preferences: {
        risk_aversion?: number;         // 0-5
        time_discount?: number;         // 0-1
        values_weights?: ValuesWeights;
    };
    uncertainty: {
        variables: UncertaintyVariable[];
    };
    trust: TrustMetadata;
}
```

### Action (wait/ask 作为一等公民)

```typescript
type ActionType = 'do' | 'ask' | 'wait' | 'commit';

interface Action {
    action_id: string;
    action_type: ActionType;
    summary: string;
    cost: ActionCost;
    reversibility: 'reversible' | 'partially_reversible' | 'irreversible';
    risk_tags?: string[];
}
```

### GoalStack

```typescript
interface GoalStack {
    entity_id: string;
    horizon_days: number;           // 7-3650
    objectives: Objective[];        // minItems: 1
    hard_constraints: GoalStackConstraints;
    risk_model?: {
        tail_metric: 'cvar_90' | 'cvar_95' | 'var_95';
        tail_weight: number;
    };
}
```

### EvidencePack

```typescript
interface EvidencePack {
    items: EvidenceItem[];
    fetched_at_ms: number;
    ttl_seconds: number;
    provider: 'vertex_grounding' | 'openai_web_search' | 'playwright_exec' | 'manual_upload';
    confidence: number;             // 0-1
}
```

### StrategyCard

```typescript
interface StrategyCard {
    card_type: 'StrategyCard';
    entity_id: string;
    decision_time_ms: number;
    next_best_action: {
        action_type: ActionType;
        summary: string;
        requires_confirmation: boolean;
    };
    outcomes_distribution: {
        metrics: MetricDistribution[];  // p50, p90, cvar_90
        failure_prob: number;
    };
    why: {
        top_reasons: string[];
        evidence_refs: number[];        // indices into evidence_pack.items
    };
    evidence_pack: EvidencePack | null;
    fallback: StrategyFallback | null;
}
```

---

## Monte Carlo 策略评估

### 算法

```
Score = E[Utility] - ρ × CVaR_90
```

- **场景数**: N = 5000 (默认)
- **展望期**: 4 周
- **风险度量**: CVaR_90 (最差 10% 的条件期望)
- **约束过滤**: 满足 `max_failure_prob` 的行动

### 候选行动模板

| 类型 | 描述 | 可逆性 |
|------|------|--------|
| `wait` | 等待更多信息 | reversible |
| `ask` | 询问约束/偏好 | reversible |
| `do` | 执行行动 | partially_reversible |
| `commit` | 确认决策 | irreversible |

---

## P0 规则：证据门控

### 规则定义

```
IF needs_live_data = true
THEN evidence_pack.items.length >= 1
ELSE fallback
```

### 域过滤

票务/旅行查询自动过滤电商域:
- jd.com, taobao.com, tmall.com, pinduoduo.com, amazon.com

---

## Schema 迁移

### twinTypes.ts 更新

- `SubjectType` 添加 `'project'`
- `StateKey` 添加 wellbeing 指标:
  - `life_satisfaction` - 生活满意度
  - `affect_balance` - 积极/消极情感平衡
  - `meaning_score` - 生活意义感

### liveSearchService.ts 对齐

- `EvidenceProvider` 联合类型
- `fetched_at_ms` 毫秒时间戳
- `confidence` 提升到顶层

---

## 验证结果

```
 Test Files  4 passed (4)
      Tests  58 passed (58)
   Duration  293ms
```

### 测试覆盖

- ✅ Schema 验证 (TwinState, Observation, Action, GoalStack, EvidencePack)
- ✅ P0 证据门控 (null/empty/valid 场景)
- ✅ 电商域过滤 (JD, Taobao, Pinduoduo)
- ✅ Monte Carlo 评估 (CVaR ≤ mean, 排序, 约束过滤)
- ✅ StrategyCard 构建 (fallback, UI 格式化, 风险等级)

---

## 使用示例

```typescript
import {
    createDefaultTwinState,
    createDefaultGoalStack,
    evaluateActions,
    buildStrategyCard,
    validateEvidenceGate,
} from './services/dtoe';

// 1. 创建 TwinState
const state = createDefaultTwinState({
    entity_id: 'user_001',
    entity_type: 'person',
    display_name: '用户',
});

// 2. 定义目标
const goals = createDefaultGoalStack('user_001');

// 3. 评估行动
const result = evaluateActions(state, goals, {
    n_scenarios: 5000,
    horizon: 4,
});

// 4. 构建 StrategyCard
const card = buildStrategyCard({
    entity_id: 'user_001',
    best_action: result.best_action,
    ranked_scores: result.ranked,
    evidence_pack: evidencePack,
    needs_live_data: true,
});

// 5. P0 验证
const validation = validateEvidenceGate(true, evidencePack);
if (!validation.valid) {
    // 触发 fallback
}
```

---

## 文件结构

```
services/
├── dtoe/
│   ├── index.ts
│   ├── coreSchemas.ts
│   ├── schemaValidators.ts
│   ├── transitionModel.ts
│   ├── monteCarloEvaluator.ts
│   ├── strategyCard.ts
│   └── vertexGroundingParser.ts
├── twinTypes.ts          # 已更新: 添加 wellbeing 指标
└── liveSearchService.ts  # 已更新: EvidencePack v0.1 对齐

tests/dtoe/
├── coreSchemas.test.ts
├── monteCarloEvaluator.test.ts
├── strategyCard.test.ts
└── evidenceGate.test.ts
```
