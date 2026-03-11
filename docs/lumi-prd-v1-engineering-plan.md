# Lumi PRD v1 研发任务版（本地部署对齐执行清单）

## 0. 文档信息
1. 版本：v1.3
2. 日期：2026-02-18
3. 状态：执行版（与 `docs/lumi-prd-v1.md` v1.3 同步）
4. 范围：Android 本地部署主干 + 云端 `/api/*` 契约适配层

## 0.1 本次更新（2026-02-18）
1. 将任务版从“纯规划”改为“已实现基线 + 差距 backlog + 验收口径”。
2. 对齐本地部署实际模块：IME、App 后端服务、核心编排、契约层、云适配。
3. 补齐数字分身优化（DTOE）工程化任务：状态持久化、策略卡映射、云同步闭环。

## 1. 本地版本基线（已实现）
| 交付物 | 状态 | 代码位置 | 验证口径 |
|---|---|---|---|
| 双入口主链路（IME + App） | 已实现 | `LumiKeyboard-Android/ime-frontend`, `LumiKeyboard-Android/app-backend-host` | 外部输入可触发 Agent Mode，复杂任务可拉起 App，结果回流 IME |
| App 内部后端主脑（前台服务） | 已实现 | `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/LumiAgentBackendService.kt` | 请求状态机、重试、并发控制、结果回调稳定 |
| Super Agent 路由与任务图 | 已实现 | `LumiKeyboard-Android/core-agent/src/main/kotlin/com/lumi/coreagent/orchestrator/AgentOrchestrator.kt` | 返回 routing/taskGraph/skillInvocations/skillGap |
| 7 Tab 模块能力 | 已实现 | `LumiKeyboard-Android/app-backend-host/src/main/java/com/lumi/keyboard/ui/screens` | 每个 Tab 均有真实业务输出 |
| 本地加密存储 | 已实现 | `.../data/local/LumiLocalDatabase.kt`, `.../SecureDbKeyManager.kt` | SQLCipher + Keystore 生效 |
| 观测看板（设置页） | 已实现 | `.../ui/screens/SettingsScreen.kt` | API 健康与 24h 指标可见 |
| DTOE 基础闭环（状态向量/共识/轨迹） | 已实现 | `OnDeviceTriageEngine.kt`, `AgentOrchestrator.kt`, `AvatarScreen.kt` | 能展示状态共识、Aura、轨迹、策略建议 |

## 2. 当前差距与优先级（必须收敛）
| 优先级 | 任务ID | 差距描述 | 目标代码位置 | 验收标准 |
|---|---|---|---|---|
| P0 | G-01 | DTOE 深度策略卡未完整映射到 Android（缺 `next_best_action/alternatives/audit`） | `core-domain/AgentContracts.kt`, `core-agent/AgentOrchestrator.kt`, `app-backend-host/ui/screens/DestinyScreen.kt` | 导航页可展示推荐动作、备选、约束说明、证据引用 |
| P0 | G-02 | 分身状态以内存为主，进程重启后连续性不足 | `core-agent/AgentOrchestrator.kt`, `app-backend-host/data/local/*` | 动态状态与轨迹支持持久化恢复 |
| P1 | G-03 | `digital_twin_cloud_sync_enabled` 开关存在但跨端同步链路未闭环 | `app-backend-host`, `cloud-adapters`, `services/dtoe/*` | 开关可控、同步可观测、失败可回退 |
| P1 | O-01 | 设置页开关展示与 BuildConfig 实值需统一口径 | `AgentOrchestrator.kt`, `SettingsPayload`, `SettingsScreen.kt` | 设置页显示值与构建配置一致 |
| P1 | O-02 | 模块事件埋点口径仍有统一空间 | `MainActivity.kt`, `LumiIME.kt`, `core-agent` | `module` 维度统计一致，无未归类噪音 |

## 3. 研发轨道与状态

### A. IME 轨道
| 任务ID | 任务 | 状态 | 代码位置 | 说明 |
|---|---|---|---|---|
| A-01 | Agent Mode 进入/退出与 No Mis-send | 已完成 | `ime-frontend/.../LumiIME.kt`, `LumiKeyboardView.kt` | 点击草稿才 commit |
| A-02 | On-device triage + 状态向量上报 | 已完成 | `ime-frontend/.../OnDeviceTriageEngine.kt` | 含风险阈值与 reasonCodes |
| A-03 | 外部 App 自动 handoff + backflow | 已完成 | `LumiIME.kt` | 深链拉起 + 回流候选 |

### B. App 后端服务轨道
| 任务ID | 任务 | 状态 | 代码位置 | 说明 |
|---|---|---|---|---|
| B-01 | Binder V2 请求生命周期 | 已完成 | `LumiAgentBackendService.kt` | PLACEHOLDER/RUNNING/TERMINAL |
| B-02 | 重试/并发/回退 | 已完成 | `LumiAgentBackendService.kt` | `MAX_RETRY_ATTEMPTS=2`, `Semaphore(2)` |
| B-03 | 结果清理与会话缓存 | 已完成 | `LumiAgentBackendService.kt`, `SessionContextCache.kt` | TTL 清理与 session merge |

### C. 编排与技能轨道
| 任务ID | 任务 | 状态 | 代码位置 | 说明 |
|---|---|---|---|---|
| C-01 | 路由评分与可解释 reasonCodes | 已完成 | `core-agent/.../AgentOrchestrator.kt`, `RoutingScoreConfig.kt` | 单/多 Agent 判定可追溯 |
| C-02 | 任务图与技能轨输出 | 已完成 | `core-domain/.../AgentContracts.kt` | Chat payload 与响应均可挂载 |
| C-03 | 技能缺口推断 | 已完成 | `AgentOrchestrator.kt` | 输出 `skillGap` |

### D. 7 Tab 产品轨道
| 任务ID | 任务 | 状态 | 代码位置 | 说明 |
|---|---|---|---|---|
| D-01 | 首页观测卡 | 已完成 | `HomeScreen.kt` | 24h 决策 + API 健康 |
| D-02 | 对话任务轨与开发态面板 | 已完成 | `ChatScreen.kt` | Trace/路由/证据/技能可视 |
| D-03 | LIX 交易闭环 | 已完成 | `LixMarketScreen.kt` + orchestrator LIX 分支 | 发布/接受/交付/审核 |
| D-04 | Agent 市场闭环 | 已完成 | `AgentMarketScreen.kt` + orchestrator AGENT 分支 | 发现/执行/GitHub |
| D-05 | 画像分层可读 | 已完成 | `AvatarScreen.kt` | 画像概览/认知/完善信息 |
| D-06 | 导航策略输出 | 已完成 | `DestinyScreen.kt` | Bellman 路径建议与风险 |
| D-07 | 设置观测与健康探测 | 已完成 | `SettingsScreen.kt` | endpoint 级健康状态 |

### E. DTOE 深化轨道
| 任务ID | 任务 | 状态 | 目标代码位置 | DoD |
|---|---|---|---|---|
| E-01 | DTOE 策略卡全契约接入 Android | 待开始 | `core-domain`, `core-agent`, `DestinyScreen.kt` | 支持 `next_best_action/alternatives/evidence_refs/audit_trail` |
| E-02 | 动态状态持久化 | 待开始 | `app-backend-host/data/local`, `core-agent` | 重启后轨迹连续可恢复 |
| E-03 | 云同步闭环 | 待开始 | `app-backend-host`, `cloud-adapters`, `services/dtoe/*` | 同步成功率/冲突处理可观测 |
| E-04 | DTOE 增益评估仪表 | 已完成 | `SettingsPayload`, `HomePayload`, `services/dtoe/*` | 采纳率提升、校准误差、置信度覆盖率可视 |

## 4. 契约对齐清单
| 类别 | 当前状态 | 文件 |
|---|---|---|
| `ModulePayload`（7 模块） | 已对齐 | `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/AgentContracts.kt` |
| Binder 接口（动态状态/轨迹/共识） | 已对齐 | `LumiKeyboard-Android/core-domain/src/main/kotlin/com/lumi/coredomain/contract/LumiBackendBridge.kt` |
| DeepLink 契约 | 已对齐 | `AgentContracts.kt` 中 `LumiRoutes` |
| DTOE 深度策略卡契约 | 待补齐到 Android 侧 | `services/dtoe/*` 与 Android 契约映射 |

## 5. 测试与发布门槛（当前执行口径）
| 类别 | 门槛 | 命令/位置 |
|---|---|---|
| Android 编译 | 必须通过 | `./gradlew --no-daemon :app-backend-host:compileDebugKotlin :app:compileDebugKotlin` |
| Core 单测 | 必须通过 | `./gradlew --no-daemon :core-agent:test :core-domain:test` |
| 真机链路 | 必须通过 | 外部输入 -> Agent Mode -> App 拉起 -> 回流候选 -> 手动提交 |
| API 健康 | 必须通过 | Settings 页探测 `live-search/lix executor/agent discover/serp status` |
| 敏感场景策略 | 必须通过 | 命中敏感应用时 `Shield Up/MASK_ONLY/DISABLE_MEMORY` |
| DTOE 回归 | 必须通过（阶段性） | 画像状态、轨迹、导航策略输出正确 |

## 6. 发布开关与回滚
| 开关 | 默认 | 说明 |
|---|---|---|
| `ime_backend_v2_enabled` | true | 主链路开关 |
| `app_full_feature_parity_enabled` | true | 7 Tab 功能开关 |
| `digital_twin_cloud_sync_enabled` | false | 分身云同步开关 |
| `cloud_adapter_fallback_enabled` | true | 云失败回退开关 |

1. 发布策略：灰度放量，优先观察任务确认率、错误率、回退率。
2. 回滚策略：异常时切回本地优先链路，保留输入与草稿能力。

## 7. 两周执行建议（从当前基线出发）
1. 第 1 周：完成 E-01（DTOE 策略卡 Android 映射）+ O-01（开关口径统一）。
2. 第 2 周：完成 E-02（状态持久化）并开始 E-03（云同步闭环最小可用）。
3. 并行任务：持续验证 E-04 指标口径，确保 DTOE 增益评估可稳定复现。

## 8. 完成定义（本任务版）
1. PRD 与本地部署能力一致，无“规划冒充已实现”。
2. 7 Tab、IME、后端服务、路由与观测均可通过真机验证。
3. DTOE 形成“状态更新 -> 策略输出 -> 结果回写 -> 指标评估”的可执行闭环。
4. 关键风险可回退、可观测、可审计。
