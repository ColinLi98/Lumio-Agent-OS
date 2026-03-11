# Lumi PRD 当前实现快照（2026-03-03）

## 0. 文档目的
这份文档用于回答“我们当前 PRD 实现了什么”，基于：
1. `docs/lumi-prd-v1.md`（v1.3，2026-02-18）
2. `docs/lumi-prd-v1-engineering-plan.md`（v1.3，2026-02-18）
3. 当前仓库代码与本轮真机/自动化测试结果（截至 2026-03-03）

## 1. 当前已实现（PRD 主线）

### 1.1 双入口主链路（IME + App）
- 已实现：IME Agent Mode、复杂任务自动 handoff 到 App、结果回流 IME 候选区、点击草稿才 commit（No Mis-send）。
- 对应模块：
  - `LumiKeyboard-Android/ime-frontend`
  - `LumiKeyboard-Android/app-backend-host`

### 1.2 App 内部后端主脑
- 已实现：前台服务请求状态机、重试、并发控制、回调闭环。
- 状态路径：`PROCESSING/RUNNING/WAITING_USER/SUCCESS/PARTIAL/ERROR/CANCELLED`。
- 对应代码：
  - `app-backend-host/.../LumiAgentBackendService.kt`
  - `app-backend-host/.../BackendHostClient.kt`

### 1.3 Super Agent 编排与可解释输出
- 已实现：路由决策（single/multi）、任务图、技能调用轨、技能缺口输出。
- 支持 reason codes 与任务轨可视化。
- 对应代码：
  - `core-agent/.../orchestrator/AgentOrchestrator.kt`
  - `core-agent/.../orchestrator/RoutingScoreConfig.kt`
  - `core-domain/.../contract/AgentContracts.kt`

### 1.4 7 Tab 产品能力（非壳层）
- 已实现并可用：Home / Chat / LIX / Agent / Avatar / Destiny / Settings。
- 关键点：
  - LIX：发布、报价、接受、交付、审核链路。
  - Agent：发现、执行、GitHub connect/import。
  - Avatar + Destiny：状态共识、轨迹、策略建议。
  - Settings：API 健康与观测指标。

### 1.5 数字分身（DTOE）基础闭环
- 已实现：状态向量、状态共识、轨迹、基础策略输出与可视化。
- 已接入交互事件：`QUERY_REFINE/CLARIFICATION_ANSWERED/TASK_CONFIRM/TASK_CANCEL/...`。
- 对应代码：
  - `ime-frontend/.../OnDeviceTriageEngine.kt`
  - `core-agent/.../soul/*`
  - `core-agent/.../orchestrator/*`
  - `app-backend-host/ui/screens/AvatarScreen.kt`, `DestinyScreen.kt`

### 1.6 安全、隐私、回退
- 已实现：本地加密存储（SQLCipher + Keystore）、敏感场景策略、云失败回退。
- 默认策略：本地优先、rawText 不入分身持久层。

## 2. 本轮新增实现（2026-03-03）

### 2.1 用户交互层升级：统一 Interaction Hub
- 已实现：
  - Work 页顶部统一入口（回答追问 + 补充上下文）。
  - 自动识别“待追问”与“普通补充”两种提交语义。
  - 统一埋点来源：`interaction_hub_pending_question` / `interaction_hub_context_update`。
- 对应代码：
  - `app-backend-host/ui/components/UserInteractionHubCard.kt`
  - `app-backend-host/MainActivity.kt`（Work 页接入）

### 2.2 布局重构：从卡片堆叠改为分步骤工作流
- 已实现：
  - Goals / Work / Activity 加入分区引导横幅。
  - Work 顺序重排为：
    1) 选择能力面
    2) 用户-Agent 交互
    3) 执行工作区
    4) 结果复核
    5) 历史追踪
- 对应代码：
  - `app-backend-host/MainActivity.kt`（`SurfaceSectionBanner` + 渲染顺序）

## 3. 验证证据（当前可复现）

### 3.1 编译与单测
- `:app-backend-host:assembleDebug` 通过。
- `:app-backend-host:testDebugUnitTest --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest` 通过。

### 3.2 仪表测试（真机）
- `:app-backend-host:connectedDebugAndroidTest` 指定套件通过（8/8）：
  - `UserInteractionHubCardUiTest`
  - `ModuleFeaturePanelSupplementUiTest`
  - `GoalWorkFlowUiTest`

### 3.3 真机包安装
- `:app:installDebug` 与 `:app:installRelease` 均成功。
- `com.lumi.keyboard.engineering` 与 `com.lumi.keyboard` 均已验证新交互层可见。

## 4. 已知差距（仍需补齐）

以下差距与 `docs/lumi-prd-v1*.md` 一致，仍是当前主 backlog：
1. DTOE 深度策略卡 Android 端完整映射（`next_best_action/alternatives/audit_trail`）尚未完全闭环。
2. 分身动态状态持久化恢复（进程重启连续性）需增强。
3. `digital_twin_cloud_sync_enabled` 跨端同步与冲突策略未完整打通。
4. 设置页开关展示与 BuildConfig 实际值口径仍需统一收敛。

## 5. 结论（当前 PRD 实现率判断）
1. PRD 主体能力（双入口、后端主脑、7 Tab、路由与任务图、基础 DTOE、观测）已落地且可运行。
2. 产品已从“演示级入口”进入“可执行闭环”阶段。
3. 下一阶段重点不在“再加入口”，而在：
   - DTOE 深化闭环（解释 + 持久化 + 云同步）
   - 交互闭环质量（追问精度、可执行率、完成率）
   - 指标驱动优化（任务完成率、确认率、回退率、校准误差）
