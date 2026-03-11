# Lumi PRD v1（IME 外部前端 + App 内部主脑）

## 0. 文档信息
1. 版本：v1.3
2. 日期：2026-02-18
3. 状态：执行版（与本地部署代码快照对齐）
4. 对齐范围：`LumiKeyboard-Android`（`:app`, `:ime-frontend`, `:app-backend-host`, `:core-agent`, `:core-domain`, `:cloud-adapters`）
5. 产品定位：系统级 AI 输入与任务执行助手，目标是“先解决问题，再沉淀数字分身并用于决策优化”。

## 0.1 本次更新（2026-02-18）
1. 将 PRD 从“目标态”更新为“本地已部署版本事实基线 + 差距项”。
2. 补全 IME -> App 内部后端 -> Super Agent -> 回流候选区的端到端链路细节。
3. 补全 7 Tab 的当前已实现能力，不再使用抽象占位描述。
4. 补全数字分身优化（DTOE）现状：on-device 状态估计、状态共识、轨迹、风险提示、导航建议。
5. 明确当前限制：DTOE 深度优化与云端闭环能力存在工程侧待补齐项。

## 1. 最终产品定义（当前已部署）
1. Lumi 是双入口产品，不是单一聊天 App。
2. `Lumi IME`：系统输入法前端，负责输入、轻判定、Agent Mode、回流候选展示。
3. `Lumi App`：内部后端主脑与 7 Tab 业务承载，负责编排、执行、观测、分身状态展示。
4. 云端作为可选增强层：在 `NetworkPolicy` 允许时提供实时检索、Agent 市场、LIX、导航等能力。
5. 分身层默认本地优先：仅使用脱敏特征，不上传 rawText。

## 2. 本地部署架构基线
1. Android 构建：`compileSdk=34`，`minSdk=26`，JVM target 17。
2. App 主入口：`MainActivity`（LAUNCHER + `lumi://` deep link）。
3. 后端承载：`LumiAgentBackendService` 前台服务（`foregroundServiceType=dataSync`）。
4. 服务桥接：IME 通过 Binder 接口 `LumiBackendBridge` 调用 App 内部后端。
5. 核心编排：`SuperAgentKernel/AgentOrchestrator` 负责路由、任务图、技能轨、模块 payload 组装。
6. 云适配：`VercelCloudGateway` 统一 `/api/*` 协议，默认基地址 `https://lumi-agent-simulator.vercel.app`。

## 3. 功能开关与默认值（本地版本）
| 开关 | 默认值 | 代码来源 | 当前作用 |
|---|---|---|---|
| `IME_BACKEND_V2_ENABLED` | `true` | `app-backend-host/build.gradle.kts` | IME 走 App 内部后端 V2 |
| `APP_FULL_FEATURE_PARITY_ENABLED` | `true` | `app-backend-host/build.gradle.kts` | 7 Tab 全功能入口 |
| `DIGITAL_TWIN_CLOUD_SYNC_ENABLED` | `false` | `app-backend-host/build.gradle.kts` | 分身云同步默认关闭 |
| `CLOUD_ADAPTER_FALLBACK_ENABLED` | `true` | `app-backend-host/build.gradle.kts` | 云失败时启用回退策略 |

## 4. 端到端主链路（已实现）
1. 用户在任意 App 输入，IME 默认 Typing Mode。
2. 长按空格进入 Agent Mode，输入请求并提交。
3. IME 先执行本地 `OnDeviceTriageEngine`：输出 `requiresCloud/score/reasonCodes/stateVector`。
4. IME 根据意图与 triage 生成 handoff 计划：
   - 简单场景：本地优先返回草稿。
   - 复杂或高风险场景：自动拉起 App 对应模块深链处理。
5. `LumiAgentBackendService` 受理请求并进入状态机：`PLACEHOLDER -> RUNNING -> (SUCCESS/PARTIAL/ERROR/CANCELLED)`。
6. 后端调用 `AgentOrchestrator`：返回 `routingDecision/taskGraph/skillInvocations/skillGap` 与模块 payload。
7. 结果回流 IME 候选区，用户点击草稿才 commit（No Mis-send）。

## 5. 7 Tab 已实现能力（2026-02-18）
1. 首页（HOME）
- 展示 24h 指标：`task_confirm/task_cancel/task_confirm_rate`。
- 展示 API 健康汇总：`api_health/api_status`。
- 展示 top module、快捷路由、画像标签。

2. 对话（CHAT）
- 展示结果输出与可执行要点。
- 开发者模式可见：trace、routing、task graph、skills、evidence、reasoning protocol、步骤轨。
- 支持继续细化与草稿回填。

3. LIX（LIX）
- 支持模板发布与定制化发布（需求/目标/预算/时限/领域）。
- 支持“我的Agent”、报价接受、交付、审核、执行器链路。
- 展示阶段、intentId、offer 数、时间线。

4. Agent 市场（AGENT）
- 支持发现、执行、GitHub 连接、GitHub 导入。
- 展示 leaderboardTop、trendPoints、仓库数、执行时间线。

5. 画像（AVATAR）
- 三子页：画像概览 / 分身认知 / 完善信息。
- 展示状态共识（能量/情绪/专注/策略）、Aura、State Vector、J 曲线轨迹。
- 展示云同步状态（默认本地）。

6. 导航（DESTINY，UI 文案为“导航”）
- 展示 Bellman 路径建议、风险等级、推荐动作。
- 开发者模式展示证据引用。

7. 设置（SETTINGS）
- API 健康探测明细（模块/端点/状态/时延/错误）。
- 任务观测（confirm/cancel/confirm_rate/draft_accept/card_click）。
- 模块级确认率与功能开关状态。

## 6. IME 行为与边界（已实现）
1. Agent Mode：长按空格进入；提交后展示候选草稿与证据卡。
2. Backflow：App 完成后回流 IME；文案明确“点击草稿才会写入”。
3. 密码场景：强制 `LOCAL_ONLY`，不触发云端 handoff。
4. 中文输入：拼音候选 + 开源中文输入法切换入口。
5. On-device triage 默认阈值：`cloud_handoff_threshold=0.58`，`high_risk_handoff_threshold=0.72`。

## 7. 数字分身优化（DTOE）现状与能力
1. 输入信号（脱敏）
- 来自 IME/App 的 `TASK_CONFIRM/TASK_CANCEL/DRAFT_ACCEPT/CARD_CLICK/KEYSTROKE_WINDOW/STATE_ADJUST` 等事件。
- 来自 triage 的 `stateVector`（L1/L2/L3）。

2. 状态建模（已实现）
- `DynamicHumanStatePayload`：L1（偏好锚点）、L2（上下文负载）、L3（压力/情绪/专注）。
- `AgentOrchestrator` 维护动态状态、状态共识（consensus）、Aura、轨迹（trajectory）。
- 画像页展示可读化结果；导航页输出策略路径。

3. 优化输出（已实现）
- 当前版本以“策略建议 + 风险等级 + 下一步动作”为主（导航模块）。
- 路由和任务编排可读取分身上下文（`contextPacket/state_packet`）用于云端增强。

4. 隐私与同步策略（已实现）
- 默认本地优先，`digital_twin_cloud_sync_enabled=false`。
- rawText 不写入分身存储与遥测链路。

5. 当前差距（需纳入后续研发）
- Android 端尚未完整呈现 DTOE `next_best_action/alternatives/constraint_notes/audit_trail` 全契约。
- 分身动态状态当前以内存为主，重启后状态连续性需要增强。
- 云同步开关已存在，跨设备分身一致性链路需补完。

## 8. 路由、技能与风控基线
1. 路由评分阈值：`crossDomainMin=2`、`capabilitiesMin=3`、`dependencyMin=2`、`riskMin=0.75`。
2. 路由可解释：返回 `mode/reasonCodes/scores`。
3. 技能策略：`local -> github -> local_template`，并输出 `skillInvocations/skillGap`。
4. 敏感应用策略：`STRICT_BLOCK/MASK_ONLY/DISABLE_MEMORY`。
5. 高风险降级：云端高风险且证据不足时，降级为约束补全或本地草稿模式。

## 9. 数据、隐私与安全基线
1. 本地数据库：Room + SQLCipher（`lumi_internal_backend.db`）。
2. 密钥管理：Android Keystore AES-GCM 包装数据库口令。
3. 本地表：`chat_events/lix_intents/market_runs/avatar_traits/destiny_decisions/metric_events`。
4. 存储内容以摘要与指标为主，不持久化 rawText 原文。
5. 导出摘要前执行脱敏（链接/邮箱/长数字）。

## 10. 稳定性与回退机制
1. 并发限制：后端执行并发 `Semaphore(2)`。
2. 重试机制：`MAX_RETRY_ATTEMPTS=2`，云失败自动回退 `LOCAL_ONLY`。
3. 结果缓存：请求结果 TTL 5 分钟，20 秒清理循环。
4. 服务形态：前台服务保持可用，Binder 断连可重连。

## 11. 指标体系（当前在产品可观测）
1. 北极星：`Task Completion Rate`。
2. 领先指标：
- `First Useful Response Time`
- `Draft Adoption Rate`
- `Task Confirm Rate`
- `Manual Fallback Rate`
- `IME -> App Handoff Conversion`
- `API Health Up Ratio`
3. DTOE 指标（已接入基础，需继续增强）：
- 状态轨迹稳定性
- 策略采纳率
- 分身校准偏差（需补完整统计链路）

## 12. 发布与回滚
1. 发布策略：灰度放量（建议 10% -> 30% -> 100%）。
2. 紧急回退：切换到本地优先与单 Agent 保底链路，保证输入与草稿能力不受损。
3. 发布前必检：API 健康、深链拉起、回流候选、No Mis-send、敏感场景策略。

## 13. 2026-02-18 版本完成定义（DoD）
1. 7 Tab 均有真实输出，不是入口壳。
2. IME Agent Mode 可在外部 App 触发，且“点击才提交”。
3. App 内部后端服务可稳定处理请求并回流结果。
4. 路由/任务图/技能轨可解释并可在开发模式查看。
5. 分身模块可展示状态共识、轨迹、策略建议。
6. rawText 不进入本地持久化和遥测。
7. 云端不可用时可自动降级，不阻断核心输入体验。

## 14. 已知差距（下一阶段）
1. 将 DTOE 深度策略卡（Next-Best-Action + Alternatives + 审计链）完整映射到 Android 导航页。
2. 将分身动态状态从内存态扩展为可恢复持久态。
3. 完成 `digital_twin_cloud_sync_enabled` 的跨端同步闭环与冲突策略。
4. 统一设置页开关展示口径与 BuildConfig 实际值。

## 15. 版本基线声明
1. 本文档以 2026-02-18 本地部署代码快照为准。
2. 任何后续功能变更需同步更新本文件与研发任务版 PRD，保持“实现-文档”一致。
