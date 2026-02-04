# Phase 2: Destiny Engine - 实现文档

> **版本**: v1.0  
> **日期**: 2026-02-03  
> **状态**: Weeks 1-3 完成 (75%)

---

## 概述

Phase 2 "Destiny Engine" 实现了从被动问答到主动生活规划的转型。核心目标是建立闭环的 **Plan → Execute → Review** 工作流。

### 北极星指标
- **WAU-CP**: Weekly Active Users with Completed Plans (每周有完成计划的活跃用户)

---

## Week 1: Controllable Persona ✅

### 目标
让用户能够查看和编辑 AI 对自己的理解。

### 实现的功能

#### 1. Soul Matrix v1 (可编辑用户画像)
**文件**: `services/soulMatrixStore.ts`

```typescript
interface SoulTrait {
    id: string;
    key: string;           // e.g., "preferred_brands"
    value: string | number | boolean;
    confidence: number;    // 0-1
    source: TraitSource;
    evidence_ids: string[];
    created_at: number;
    updated_at: number;
    is_confirmed: boolean;
}
```

**核心方法**:
- `addTrait()` - 添加新特征
- `updateTrait()` - 更新现有特征
- `confirmTrait()` / `rejectTrait()` - 用户确认/拒绝
- `getConfirmedTraits()` - 获取已确认特征

#### 2. Memory Provenance (记忆溯源)
**文件**: `services/soulTraitTypes.ts`

```typescript
type TraitSource = 
    | 'agent_inference'    // AI 推断
    | 'user_stated'        // 用户明确说明
    | 'action_history'     // 行为历史
    | 'external_import';   // 外部导入
```

#### 3. Unified Task Schema (统一任务模式)
**文件**: `services/taskTypes.ts`

```typescript
interface Task {
    task_id: string;
    goal: string;
    constraints: TaskConstraints;
    deadline?: number;
    budget?: number;
    risk_level: 'low' | 'medium' | 'high';
    status: TaskStatus;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category?: TaskCategory;
}
```

---

## Week 2: Actionable Workflows ✅

### 目标
将 Super Agent 输出从简单答案转化为结构化的三段式计划。

### 实现的功能

#### 1. Three-Stage Plan Generator
**文件**: `services/planGenerator.ts`, `services/planTypes.ts`

```typescript
interface ThreeStagePlan {
    plan: PlanStage;       // 3-7 个模块化步骤
    execute: ExecuteStage; // 主要高优先级行动
    followup: FollowupStage; // 监控条件
}
```

**输出格式**:
```json
{
  "plan": {
    "steps": [
      { "step_number": 1, "title": "...", "action_type": "open_market" }
    ]
  },
  "execute": {
    "action_type": "open_market",
    "cta_label": "立即执行"
  },
  "followup": {
    "conditions": ["价格下降 10%"],
    "suggestions": ["设置提醒"]
  }
}
```

#### 2. Execution Hooks
**文件**: `services/actionService.ts`

支持的 Action Types:
| Action | 描述 |
|--------|------|
| `save_task` | 保存任务 |
| `set_reminder` | 设置提醒 |
| `open_market` | 打开 LIX 市场 |
| `external_link` | 打开外部链接 |

#### 3. Explanation Engine
**文件**: `services/explainerService.ts`

```typescript
interface PlanExplanation {
    trait_references: TraitReference[];
    dimension_scores: DimensionScores;
    alternatives?: Alternative[];
}

interface DimensionScores {
    time_efficiency: number;    // 0-1
    financial_impact: number;
    risk_level: number;
    personal_growth: number;
    relationship_impact: number;
}
```

#### 4. ThreeStagePlanCard UI
**文件**: `components/SuperAgentResultPanel.tsx`

- 可折叠的计划步骤
- 完成状态切换
- Execute CTA 按钮
- Follow-up 条件显示

---

## Week 3: Reflective Optimization ✅

### 目标
建立反馈闭环，让用户评价任务结果以优化未来建议。

### 实现的功能

#### 1. Outcome Logging Service
**文件**: `services/outcomeService.ts`

```typescript
interface TaskOutcome {
    id: string;
    task_id: string;
    status: 'success' | 'partial' | 'failed' | 'cancelled';
    satisfaction: 1 | 2 | 3 | 4 | 5;
    notes?: string;
    logged_at: number;
    metrics?: {
        time_spent_minutes?: number;
        actual_cost?: number;
    };
}
```

**核心方法**:
- `logOutcome()` - 记录任务结果
- `getOutcomesForPeriod()` - 按时间段查询
- `summarize()` - 生成统计摘要
- `getCompletionRate()` - 计算完成率

#### 2. Weekly Review Service
**文件**: `services/weeklyReviewService.ts`

```typescript
interface WeeklyReview {
    id: string;
    week_start: number;
    week_end: number;
    summary: {
        tasks_created: number;
        tasks_completed: number;
        completion_rate: number;
        avg_satisfaction: number;
    };
    insights: string[];
    soul_updates: SoulTraitChange[];
    category_breakdown: CategoryBreakdown[];
    comparison?: WeekComparison;
}
```

#### 3. Objective Weights (生活目标权重)
**文件**: `services/soulMatrixStore.ts` (扩展)

```typescript
interface ObjectiveWeights {
    time: number;      // 0-100: 时间效率优先级
    money: number;     // 0-100: 成本节约优先级
    risk: number;      // 0-100: 风险承受能力
    energy: number;    // 0-100: 精力消耗偏好
    growth: number;    // 0-100: 学习成长优先级
}
```

**与 Plan Generator 集成**:
权重会被转化为自然语言提示，影响 LLM 生成的计划。

#### 4. UI 组件

**ObjectiveWeightsPanel.tsx**:
- 5 个优先级滑块
- 实时预览生成的提示词
- 重置按钮

**WeeklyReviewPanel.tsx**:
- 完成率圆环图
- 统计网格 (完成/失败/满意度)
- 类别分布条形图
- 洞察列表
- Soul Matrix 更新展示

**TaskDetail.tsx** (扩展):
- OutcomeLoggingForm 组件
- ⭐ 5 星满意度评分
- 状态选择 (完成/部分/失败/取消)
- 时间追踪
- 备注输入

---

## 文件清单

### 新建文件

| 路径 | 描述 |
|------|------|
| `services/taskTypes.ts` | 任务类型定义 |
| `services/taskService.ts` | 任务 CRUD 服务 |
| `services/soulMatrixStore.ts` | Soul Matrix 存储 |
| `services/soulTraitTypes.ts` | 特征类型定义 |
| `services/planTypes.ts` | 计划类型定义 |
| `services/planGenerator.ts` | 计划生成器 |
| `services/explainerService.ts` | 解释引擎 |
| `services/outcomeService.ts` | 结果记录服务 |
| `services/weeklyReviewService.ts` | 周报服务 |
| `components/ObjectiveWeightsPanel.tsx` | 权重滑块 UI |
| `components/WeeklyReviewPanel.tsx` | 周报仪表盘 |
| `components/TaskDetail.tsx` | 任务详情页 |
| `components/PlanExplanation.tsx` | 计划解释面板 |

### 修改文件

| 路径 | 修改内容 |
|------|----------|
| `components/SuperAgentResultPanel.tsx` | 添加 ThreeStagePlanCard |
| `services/superAgentService.ts` | 集成 Plan Generator |

---

## 数据持久化

所有数据使用 `localStorage` 存储:

| Key | 描述 |
|-----|------|
| `lumi_soul_matrix` | Soul Matrix 特征 |
| `lumi_objective_weights` | 目标权重 |
| `lumi_tasks` | 任务列表 |
| `lumi_plans` | 计划列表 |
| `lumi_outcomes` | 任务结果 |
| `lumi_weekly_reviews` | 周报历史 |

---

## 下一步: Week 4 - Governance & Scale

| 组件 | 描述 | 状态 |
|------|------|------|
| Privacy Dashboard | 删除/导出/停止学习 | ⏳ |
| Telemetry v2 | WAU-CP 事件链追踪 | ⏳ |
| LIX as Executor (P2) | LIX 市场深度集成 | ⏳ |

---

## 验证状态

```bash
# Build 验证
$ npm run build
✓ built in 5.50s

# 无 TypeScript 错误
# 所有组件正确导入导出
```
