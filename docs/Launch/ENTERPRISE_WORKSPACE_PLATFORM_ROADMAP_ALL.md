<!-- docs/roadmap/README.md -->

# Enterprise Workspace Platform Roadmap

## 文档目的
本路线图用于指导当前 B 端 enterprise workspace platform 的下一阶段推进。
规划基于现有实现继续收敛和增强，不推翻现有产品定义，不引入大规模重写。

## 当前产品定位
这是一个 **B 端 enterprise workspace platform**，不是 C 端 app。
它不是单页 demo，而是一个以 workspace 为中心、以角色治理为骨架的企业操作台。

平台统一承载以下能力域：
- request
- approval
- review
- operations
- members/access
- policy/governance
- audit/reporting
- integration/readiness

## 当前主入口
当前最新 B 端 preview 为 9 角色 OA governed execution example，对应一个 server-backed trial workspace，可通过 deep link 直接进入 workspace / section / role / member / task 组合状态。

## 范围约束
本路线图必须遵守以下原则：
- 只围绕 B 端平台
- 不扩 C 端
- 不把 real pilot 当当前主 blocker
- 不扩 provider matrix
- 企业登录仍锁定 Okta OIDC
- 保持 OA v1 九角色模型，不新增第十个角色
- 不建议大规模重写
- 基于当前已有实现继续推进，而不是重新设计一个全新产品

## 当前平台已具备的 section
- Workspace Overview
- Organization & Workspace
- Members & Access
- Trial Join
- Request Center
- Approval Center
- Review Center
- Operations Console
- Integration & Readiness Center
- Policy & Governance Center
- Audit & Reporting Center
- Marketplace
- Navigator
- Observability

## 当前角色模型
平台支持 OA v1 九角色：
- REQUESTER
- APPROVER
- OPERATOR
- REVIEWER
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

## 当前已完成能力
以下内容已处于 done 状态：
- B 端主平台壳已成型
- OA v1 九角色模型已接入平台
- local_lab sandbox 可运行
- request / approval / review / audit / operations / policy / readiness 都有页面
- member / seat / invite / join 已接上
- OA role switch 已接上
- deep link URL 状态已接上
- trial task detail 已接上
- production enterprise write fail-closed 已有门禁
- preview 有 server-backed trial workspace
- 关键导航与关键按钮已修复并回归
- typecheck 通过
- build 通过
- 相关 vitest 通过
- 新 preview 已部署
- 浏览器自动化已验证一批核心交互

## 最近已解决的关键问题
此前 preview 曾存在以下严重问题：
- 页面 runtime crash
- 部分按钮看起来可点但实际无法使用
- 9 角色数据和旧 UI 字段不兼容

问题根因：
- trial workspace 新 9 角色数据主要使用 `oa_role`
- 旧 UI 某些地方仍直接读取 `actor_role.toLowerCase()`
- 导致首屏崩溃，后续导航与按钮语义失真

当前已修复：
- 首屏 runtime crash 已消除
- Approval / Review / Organization 导航可跳转
- OA role switch 可切换并写回 URL
- Requester / Operator / Tenant Admin 的 Open here 可跳转
- Seat detail 成员切换可写回 member
- Create approver invite 和 Join 可用
- 9 角色实例可以在新 preview 中跑起来

## 当前仍是 partial 的部分
以下能力已存在，但仍非 fully done：
- local_lab 仍只是 sandbox，不是 real pilot
- current 模式的真实 enterprise tenant / IdP 联调不是当前 blocker，但也还未 fully done
- 三中心与各 admin 面可用，但 enterprise-grade depth 还不够厚
- Overview 仍更像 section landing，而不是成熟的 role-aware cockpit
- 各 section 间虽然能跳转，但统一对象语义和统一治理主链路仍可继续收敛
- buyer narrative / onboarding / support 包仍未完成产品化
- build 仍存在大 bundle 与 browser-external warnings，但不是当前功能 blocker

## 当前产品更像什么
当前产品更像：
- enterprise workspace cockpit
- role-aware workflow governance console
- B 端平台壳

当前产品还不像：
- 完整商业化成交包
- 完整真实部署闭环产品
- 已完成 real pilot 证据闭环的系统

## 总体推进原则
接下来不追求“再扩更多页面”，而是优先完成以下收敛：
1. 统一平台契约
2. 把 9 角色示例产品化成统一治理主链路
3. 平台壳硬化与质量护栏
4. 把 enterprise control plane 做厚
5. 商业化包装与对外呈现收敛

## 五阶段顺序
### Phase 1
统一平台契约  
目标：统一对象模型、角色能力、路由语义、legacy adapter 边界

### Phase 2
9 角色治理主链路产品化  
目标：把 Request → Approval → Operations → Review → Audit 串成一条可演示、可追踪、可解释的主链路

### Phase 3
平台壳硬化与质量护栏  
目标：提升 preview 的可靠性、可测试性、异常状态产品化程度

### Phase 4
Enterprise Control Plane 做厚  
目标：增强 Members / Policy / Readiness / Audit / Org 管理面的企业可信度

### Phase 5
商业化包装与对外呈现收敛  
目标：让当前产品具备 buyer-facing preview package 的完整表达能力

## 优先级说明
### 现在最该先做
- Phase 1
- Phase 2

### 应并行推进
- Phase 3

### 在主链路和稳定性成形后推进
- Phase 4
- Phase 5

## 里程碑定义
### Milestone A
完成 Phase 1 + Phase 2  
平台从“可运行 section 集合”升级为“有统一治理主链路的 enterprise workspace platform”

### Milestone B
完成 Phase 3 + Phase 4  
平台从“可演示 preview”升级为“有明显控制面厚度和稳定性的 buyer-facing preview”

### Milestone C
完成 Phase 5  
平台从“内部预览系统”升级为“可稳定对外叙述和演示的商业化 preview package”


---

<!-- docs/roadmap/phase-1-platform-contract.md -->

# Phase 1 — 统一平台契约

## 阶段定位
本阶段是整个下一轮推进的基础工程。
目标不是增加新页面，而是统一平台内部的对象语义、角色语义、路由语义与 capability 判定方式。

如果这一层不收敛，后续的治理主链路、控制面深化、商业化包装都会建立在不稳定语义之上。

## 为什么现在做
当前平台已经解决了最明显的 crash 与关键 CTA 不可用问题，也已经证明：
- 9 角色模型可以接进平台
- preview 能跑
- deep link 能工作
- request / approval / review / operations / audit / policy / readiness / member / join 等页面都已存在

但当前仍存在两个结构性风险：
1. 同一角色和同一 task 在不同 section 中的语义仍可能不完全一致
2. 部分页面虽已修复，但平台级 contract 仍未成为单一真相源

因此本阶段的重点是“平台级收口”，不是“继续扩面”。

## 本阶段目标
建立以下四类统一契约：
1. Canonical object model
2. OA v1 九角色 capability matrix
3. Route / deep-link contract
4. Legacy field / role adapter 边界

## 本阶段完成后，平台应达到的状态
- 同一个 trial task 在不同中心中有一致的 owner / stage / blocker / next action
- 同一个角色在不同 section 中的权限与 CTA 语义一致
- 所有关键 URL 参数有稳定 schema、解析方式和 fail-closed 降级逻辑
- UI 不再直接消费 legacy role 字段
- 后续产品化工作可以围绕同一平台 contract 推进，而不是继续打补丁

---

## 一、当前已知输入条件

### 已 done
- B 端主平台壳已成型
- OA v1 九角色接入已完成
- OA role switch 已接上
- deep link URL 状态已接上
- trial task detail 已接上
- member / seat / invite / join 已接上
- server-backed trial workspace 已存在
- 关键导航与关键按钮问题已修复并验证
- typecheck / build / vitest / browser automation 基线已通过

### 仍 partial
- 某些 section 间仍可能存在对象字段映射不统一
- 某些 UI 可能仍残留旧 role / actor 字段读取习惯
- 某些 CTA 是否可执行可能还未完全收敛为统一 capability 判定
- 路由参数异常、无效、缺失时的降级逻辑可能仍不一致

---

## 二、范围

## 范围内
- Workspace Overview
- Organization & Workspace
- Members & Access
- Trial Join
- Request Center
- Approval Center
- Review Center
- Operations Console
- Integration & Readiness Center
- Policy & Governance Center
- Audit & Reporting Center
- OA role switch
- member focus
- task focus
- seat focus
- section 跳转
- page / section / role / member / task / workspace_mode URL 状态

## 不在范围内
- 不新增角色
- 不扩 provider matrix
- 不推进 C 端
- 不把 real pilot 当 blocker
- 不做视觉系统重设计
- 不做大规模架构推翻式重写

---

## 三、核心问题定义

### 问题 1：对象语义分散
当前平台中至少存在以下核心对象，但它们未必已经在所有 section 中以一致方式被表达：
- Request
- Approval package / decision
- Operation package / run
- Review case / evidence
- Policy basis / exception
- Readiness gate
- Audit receipt / export bundle
- Member / seat / invite

如果这些对象在不同中心各自定义自己的状态字段、owner 语义或 blocker 语义，平台就会继续表现为“页面集合”而不是“治理系统”。

### 问题 2：角色语义分散
当前角色切换已经可用，但平台仍需要把以下内容统一：
- 角色可见范围
- 角色主 CTA
- 角色被阻塞原因
- 角色之间的 handoff 关系
- 无权限时的 fail-closed 行为

### 问题 3：路由语义分散
当前 deep link 已接上，但平台需要进一步保证：
- page / section / role / member / trial_task / workspace_mode 的解析方式一致
- 非法或缺失参数有明确降级方式
- 任何 section 都不会因不完整 URL 状态进入歧义态

### 问题 4：legacy 字段仍可能污染 UI 逻辑
之前的 crash 已明确说明：旧字段如果绕过 adapter 直接进入 UI，会引发全局语义错误。
本阶段必须明确：
- UI 不直接读取 legacy role
- legacy 字段只允许存在于 adapter / migration / fixture 层
- ambiguous state 一律 fail-closed

---

## 四、目标状态设计

## 4.1 Canonical object model
本阶段要统一以下对象的最小公共语义。

### Request
至少具备：
- id
- requester
- current_stage
- status
- submitted_at
- linked_approval
- linked_operation
- linked_review
- linked_audit
- blocker
- next_action

### Approval package / decision
至少具备：
- approval_id
- target_request_id
- approver_scope
- decision
- decision_basis
- decision_at
- status
- blocker
- next_action

### Operation package / run
至少具备：
- operation_id
- source_request_id
- execution_status
- operator_owner
- artifact_summary
- blocker
- next_action

### Review case / evidence
至少具备：
- review_id
- target_operation_id
- evidence_set
- reviewer_status
- verification_result
- blocker
- next_action

### Policy basis / exception
至少具备：
- policy_record_id
- policy_basis
- policy_scope
- applicable_to
- exception_state
- rationale
- related_blocker

### Readiness gate
至少具备：
- gate_id
- gate_type
- gate_status
- gate_owner
- why_ready
- why_not_ready
- unblock_action

### Audit receipt / export bundle
至少具备：
- receipt_id
- target_task_id
- trace_summary
- export_status
- evidence_links
- generated_at

### Member / seat / invite
至少具备：
- member_id
- oa_role
- workspace_membership_status
- seat_scope
- invite_status
- join_status
- access_boundary

---

## 4.2 OA v1 九角色 capability matrix
本阶段必须以 `oa_role` 为唯一角色真相源，形成统一的 capability matrix。

### 必须统一的维度
对每个角色，在每个核心 section 中明确：
- can_view
- can_act
- primary_actions
- blocked_actions
- blocked_reason
- escalation_target
- fallback_behavior

### 覆盖角色
- REQUESTER
- APPROVER
- OPERATOR
- REVIEWER
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

### 统一要求
- 同一 primary CTA 不允许各页面各自写权限逻辑
- 角色 ambiguity 时默认 fail-closed
- 无权限状态必须可解释，不允许“看起来可点但没有行为”

---

## 4.3 Route / deep-link contract
本阶段要明确 URL 状态 schema。

### 必须统一的参数
- page
- section
- oa_role
- member
- trial_task
- workspace_mode

### 每个参数都需要明确
- 是否必需
- 合法值范围
- 缺失时如何回退
- 非法时如何 fail-closed
- 与其他参数冲突时如何取舍

### 路由目标
- role switch 后 URL 与页面状态一致
- member focus 后 URL 与 seat detail / member detail 一致
- trial task deep link 在 section 之间切换时保持 task continuity
- 无效 deep link 不导致 crash、不进入歧义态、不出现错误 CTA

---

## 4.4 Legacy adapter 边界
本阶段必须明确 legacy 字段隔离策略。

### 要求
- legacy role / actor 字段仅允许存在于 normalization / fixture / migration adapter
- page / component / action guard 不得直接读取 legacy role
- 对 legacy field 缺失、格式不符、与 `oa_role` 冲突的情况，统一进入 fail-closed 分支

### 目标
防止旧字段再次穿透到 UI 层，导致首屏 crash、CTA 语义失真或角色错配

---

## 五、交付物

## 5.1 Contract 文档
产出一份明确的平台 contract 文档，至少涵盖：
- canonical object definitions
- role capability matrix
- route schema
- legacy adapter rules
- fail-closed rules

## 5.2 代码层统一 contract
平台中应存在可复用的统一 contract 层，供各 section 消费，而不是各 section 自己拼装角色与对象语义。

## 5.3 统一 capability guard
所有 primary CTA 和关键 view gate 应通过统一 guard 判定：
- 是否显示
- 是否可点击
- 不可点击时的 reason
- fallback 去向

## 5.4 统一 route parser / normalizer
所有 deep link 与 URL 状态应通过统一解析与校验入口进入页面状态。

## 5.5 回归测试补齐
至少补齐以下类别：
- role normalization
- capability decision
- route parsing
- deep link state restoration
- invalid / malformed URL fail-closed behavior

---

## 六、验收标准

### 功能验收
- UI 层不再直接读取 legacy role 字段
- 同一个 trial task 在不同中心拥有一致的 stage / owner / blocker / next action
- 所有主 CTA 都由统一 capability guard 驱动
- role / member / task / section deep link 状态能稳定读写
- 非法 URL 不导致 crash，也不会出现误导性可点击按钮

### 回归验收
- 现有 preview 核心路径不回归
- 角色切换、导航跳转、Open here、invite / join 等核心动作继续可用

### 质量验收
- typecheck 通过
- build 通过
- vitest 通过
- 关键 browser automation smoke 通过

---

## 七、阶段产出后的平台变化

本阶段完成后，平台会从：
- “关键页面都在”
- “部分 9 角色例子可以跑”
- “主要靠修补让 UI 不 crash”

升级为：
- “有统一对象语义的平台”
- “有统一角色能力边界的平台”
- “有统一路由契约的平台”
- “能够承接下一阶段治理主链路产品化的平台”

---

## 八、风险与注意事项

### 风险 1
如果 contract 层过度抽象，可能导致改动过大、节奏变慢。

### 应对
坚持最小可用 contract，不追求一次性抽象到终态。

### 风险 2
如果 capability guard 未充分覆盖现有 CTA，可能出现局部回归。

### 应对
优先覆盖核心 section 与 primary CTA，再补次级 CTA。

### 风险 3
如果 route schema 修改过猛，可能影响现有 deep link。

### 应对
尽量保留现有 URL 兼容性，对旧链路做 adapter，而不是硬切断。

---

## 九、本阶段退出条件
当以下条件全部满足时，可视为 Phase 1 完成：
- `oa_role` 成为平台唯一角色真相源
- 关键对象已有统一 canonical 定义
- 关键路由参数已有统一 schema 和降级逻辑
- legacy role 已被收口到 adapter 层
- 关键 CTA 已改为统一 capability guard 驱动
- 现有 preview 核心能力无回归


---

<!-- docs/roadmap/phase-2-governed-flow.md -->

# Phase 2 — 9 角色治理主链路产品化

## 阶段定位
本阶段的任务不是再新增更多页面，而是把现有的 section 和 9 角色能力，收敛成一条统一、清楚、可演示、可追踪的 governed execution flow。

当前平台已经证明“9 角色可以接进平台”，下一步要证明的是：
**9 个角色确实共同处在同一条治理链路里，而不是各自拥有一个页面。**

## 为什么现在做
在 Phase 1 完成统一平台契约后，平台已经具备：
- 统一的对象模型基础
- 统一的角色能力边界基础
- 统一的路由和 deep-link 解析基础

因此现在最值得做的，不是扩功能宽度，而是增强产品表达的连续性：
让 buyer、内部团队、非工程同学都能自然理解：
- 请求是如何发起的
- 审批边界如何形成
- 操作如何推进
- 证据如何被复核
- 审计如何拿到可导出 trace

## 本阶段目标
把以下主链路做实：
**Request → Approval → Operations → Review → Audit**

同时让以下三类人能够从系统本身直接看懂这条链路：
1. 具体执行角色
2. 管理 / 治理角色
3. 演示 / 售前 / 产品叙述角色

---

## 一、当前已知输入条件

### 已 done
- Request / Approval / Review / Operations / Audit 相关页面已存在
- OA role switch 已可用
- trial task detail 已接上
- 部分 role page 的 Open here 已可跳转
- deep link 已接上
- 9 角色实例能在 preview 中跑起来

### 仍 partial
- 当前更像多个中心共存，而不是一条统一主链路
- Overview 还未完全成为 role-aware cockpit
- 不同中心对同一 task 的阶段表达未必完全一致
- blocker、evidence、receipt 的表达仍可能分散
- handoff 和谁等谁的关系，仍需被产品化表达出来

---

## 二、范围

## 范围内
- Workspace Overview
- Request Center
- Approval Center
- Operations Console
- Review Center
- Audit & Reporting Center
- 与该链路直接相关的 Policy / Readiness surface
- role-aware task summary
- unified timeline
- blocked reason / handoff panel
- evidence / receipt continuity

## 不在范围内
- 不新增第十个角色
- 不新造第二套 workflow engine
- 不推进 C 端
- 不把 real pilot 闭环当本阶段 blocker
- 不做大规模 IA 重构
- 不把 Marketplace / Navigator / Observability 作为主线

---

## 三、问题定义

### 问题 1：平台有“中心”，但主链路还不够显性
当前平台已经有：
- Request Center
- Approval Center
- Operations Console
- Review Center
- Audit & Reporting Center

但用户当前更可能感受到的是“有多个中心”，而不是“一条完整治理链路”。

### 问题 2：Overview 还不是成熟的 role-aware cockpit
Overview 目前更像入口页 / summary 页，而不是某个角色进入 workspace 后的工作面。
它需要回答：
- 我现在要做什么
- 我卡在哪里
- 我在等谁
- 谁在等我
- 下一步该去哪里

### 问题 3：blocker / evidence / receipt 仍可能分散
当前审查、治理、审计已经有页面，但证据与阻塞原因如果分散在多个中心、多个局部文案里，就很难形成统一产品叙事。

### 问题 4：9 个角色虽然都在，但“共同参与一条链路”的产品信号还可以更强
本阶段要强化的不是“角色数量”，而是“角色协作的治理闭环感”。

---

## 四、目标状态设计

## 4.1 统一主链路阶段模型
围绕同一个 trial task，平台应能明确表达其所处阶段。

### 建议的最小阶段集
- request_submitted
- approval_pending
- approval_decided
- operation_in_progress
- operation_completed
- review_pending
- review_verified
- audit_receipt_ready

### 每个阶段至少应明确
- stage label
- current owner
- upstream dependency
- blocker
- evidence status
- next action
- next destination section

### 统一要求
同一个 task 无论从哪个中心进入，都能看到同一阶段语义，而不是各中心各自命名。

---

## 4.2 Overview 升级为 role-aware cockpit
Overview 是本阶段的最重要产品化对象。

### 每个角色进入 Overview 时至少要看到
- 当前工作项摘要
- 当前阶段
- 当前是否 blocked
- blocked by 谁
- blocked because 什么
- 下一步去哪一个中心
- 当前角色的 primary action
- 当前角色正在等待谁
- 谁正在等待当前角色

### 对不同角色应有明显差异化
#### REQUESTER
- 我提交了什么
- 当前在谁手里
- 是否需要补充信息
- 什么时候进入下一阶段

#### APPROVER
- 哪些 task 在等我做边界决策
- 决策后会影响哪些后续动作
- 决策依据是什么

#### OPERATOR
- 哪些 task 已获准可执行
- 当前操作包状态
- 执行完成后需要交给谁

#### REVIEWER
- 哪些 task 需要我复核
- 当前证据是否完整
- 缺失什么 evidence

#### TENANT_ADMIN
- 当前 workspace / task readiness 状态
- 当前 gate 是否阻塞
- why ready / why not ready

#### WORKSPACE_ADMIN
- 当前 seat / member / access 是否形成阻塞
- 谁有权限、谁缺权限

#### POLICY_GOVERNANCE_ADMIN
- 当前 policy basis 是什么
- 当前 blocked reason 是否有 policy basis
- 是否存在 exception / waiver 需求

#### INTEGRATION_ADMIN
- readiness / connector / environment 状态
- 哪个 gate 导致任务未 ready

#### AUDITOR
- 当前 trace 是否完整
- receipt 是否可导出
- evidence 是否足以支撑审计视图

---

## 4.3 统一 timeline
平台需要为同一个 trial task 提供跨中心的统一 timeline。

### timeline 至少覆盖
- request submitted
- approval waiting / approved / rejected / bounded
- operation started / completed
- review requested / verified / returned
- audit receipt generated / exportable

### timeline 的作用
- 帮助不同角色共享同一上下文
- 帮助 demo 不依赖大量口头补充
- 帮助 buyer 理解“这是治理主链路，而不是孤立页面集合”

---

## 4.4 统一 blocked reason / handoff panel
任何无法推进的状态，都必须用统一方式表达。

### blocked panel 至少包含
- blocked status
- blocked by role / gate / missing artifact / policy / access / readiness
- why blocked
- what is needed to unblock
- who should act next
- which section to visit next

### handoff panel 至少包含
- previous owner
- current owner
- next owner
- handoff reason
- handoff completion criteria

### 产品要求
- 不允许“用户不知道为什么不能继续”
- 不允许“只能靠 demo 讲解来解释当前卡点”
- 不允许“页面写着可继续，但实际什么都做不了”

---

## 4.5 统一 evidence / receipt surface
不同角色看到的应该是同一套 evidence / receipt，只是视角不同。

### reviewer 关注
- evidence 是否充分
- verification status
- missing evidence

### auditor 关注
- traceability
- receipt completeness
- export readiness

### tenant admin 关注
- 对 workspace readiness / governance 状态有什么影响

### 统一要求
- 不应各自维护一套脱节信息
- 同一份 evidence / receipt 应从相同底层对象派生
- 同一个 task 的审计表达和复核表达应能互相对上

---

## 五、交付物

## 5.1 Role-aware Overview
Overview 应从“section landing”升级为“当前角色的 cockpit”。

## 5.2 Shared stage model
产出统一的 governed flow stage model，供各中心共同使用。

## 5.3 Unified timeline
在 task 视角下展示贯穿 Request → Approval → Operations → Review → Audit 的时间线或阶段链。

## 5.4 Blocked reason / handoff panel
用统一组件或统一表现层解释：
- 为什么卡住
- 谁来处理
- 去哪里处理
- 处理完后会进入哪一阶段

## 5.5 Evidence / receipt continuity
不同中心、不同角色对同一 task 的 evidence / receipt 表达保持一致。

---

## 六、验收标准

### 主链路验收
- 同一个 trial task 可从 requester 视角一路追到 auditor 视角
- Request → Approval → Operations → Review → Audit 链路表达连续
- 每个阶段都可解释当前 owner、blocker、next action

### 角色验收
- 每个角色至少有一个明确 primary action
- 每个角色都能在 Overview 中看到与自身相关的 next step
- 谁等谁、谁接谁能够被系统直接表达

### 产品化验收
- 演示时不需要依靠大量额外口头解释来串页面
- buyer 可以从 UI 本身理解这是 governed execution flow
- 平台从“多中心集合”升级为“统一治理主链路”

### 回归验收
- 不破坏现有 role switch
- 不破坏 deep link
- 不破坏 core nav
- 不破坏已验证通过的 Open here / invite / join 等核心交互

---

## 七、完成后的平台变化
本阶段完成后，平台会从：
- 有 9 角色页面
- 有 request / approval / review / operations / audit 等中心
- 能勉强讲出治理故事

升级为：
- 9 角色真实参与同一条治理主链路
- Overview 成为 role-aware cockpit
- task 具备统一 timeline、blocker、evidence、receipt 表达
- buyer / demo /产品都能围绕同一条链路叙述系统

---

## 八、风险与注意事项

### 风险 1
如果直接大改信息架构，可能影响现有 preview 稳定性。

### 应对
优先在现有 section 与现有 task detail 基础上做共享阶段模型和共享摘要，而不是大改 IA。

### 风险 2
如果角色差异过弱，Overview 可能仍然像通用 landing 页。

### 应对
优先突出每个角色的 next action、waiting relationship 与 blocker。

### 风险 3
如果 evidence / receipt 只在视觉上统一、底层对象没统一，后续会再次漂移。

### 应对
严格依赖 Phase 1 统一 contract，不做视觉层假统一。

---

## 九、本阶段退出条件
当以下条件全部满足时，可视为 Phase 2 完成：
- 同一个 task 拥有统一阶段表达
- Overview 已成为 role-aware cockpit
- Request → Approval → Operations → Review → Audit 已形成统一主链路表达
- blocked reason / handoff / evidence / receipt 已具有统一产品化表达
- 现有 preview 核心交互无回归


---

<!-- docs/roadmap/phase-3-platform-hardening.md -->

# Phase 3 — 平台壳硬化与质量护栏

## 阶段定位
本阶段的重点不是扩功能，而是提升平台作为企业 preview 的可靠性和工程硬度。

当前平台已经从“会 crash”走到了“核心路径能跑通”，接下来需要进一步提升为：
**像企业平台，而不是脆弱 demo。**

## 为什么现在做
在 Phase 1 与 Phase 2 推进后，平台会拥有更清晰的统一契约与治理主链路。
这时如果平台壳的异常处理、路由保护、CTA 语义、测试护栏不足，演示和继续开发都会越来越脆弱。

因此本阶段的目标是建立一套对 preview 友好的工程护栏，保证：
- 不因脏 URL / 缺失参数 / stale state 把页面带进坏状态
- 不再出现“看起来可点但实际上空转”的主按钮
- 不再依赖人工试点去发现显而易见的壳层问题

---

## 一、当前已知输入条件

### 已 done
- 首屏 runtime crash 已消除
- 部分关键导航已恢复可用
- OA role switch 已可用
- 部分 Open here 能正常跳转
- invite / join 可用
- 基础 typecheck / build / vitest / browser automation 已建立

### 仍 partial
- route schema 容错与降级逻辑仍可继续规范
- 某些异常状态可能仍未产品化表达
- CTA 可用性与 disabled reason 还需统一
- 浏览器自动化对 9 角色 × 核心 section × CTA 的覆盖仍可能不够系统
- bundle warnings 与 browser-external warnings 虽不是 blocker，但需持续 triage

---

## 二、范围

## 范围内
- workspace shell
- section-level route handling
- role switch / member switch / task deep link
- primary CTA 行为正确性
- malformed / stale / unsupported URL state
- error boundary
- loading / empty / no access / stale link 等状态
- browser automation smoke matrix
- release verification baseline
- 基础 diagnostics / telemetry

## 不在范围内
- 不新增业务模块
- 不把 bundle 优化作为当前主 blocker
- 不做大规模性能重构
- 不切换测试框架
- 不做大规模 UI redesign

---

## 三、问题定义

### 问题 1：preview 已可运行，但壳层抗异常能力仍需增强
B 端平台对错误状态的容忍度不能像 demo 一样依赖“正常路径才成立”。

### 问题 2：主按钮语义必须严肃
企业平台中，主 CTA 要么可执行，要么明确 disabled 且可解释。
不允许继续存在：
- 看起来能点，实际上无 handler
- 点了没有结果
- 可点与不可点没有一致逻辑

### 问题 3：URL 深链是平台能力，不是附属功能
当前平台已经使用 deep link 驱动 workspace / section / role / member / task 状态。
既然它是能力，就必须为它提供稳定 schema 和异常处理。

### 问题 4：测试不能只覆盖少量 happy path
9 角色平台的真实风险不在单一路径，而在：
- 角色切换
- section 跳转
- URL 恢复
- stale / malformed link
- CTA 可用性漂移

---

## 四、目标状态设计

## 4.1 Route schema guard
为 URL 参数建立明确的 schema 校验与降级逻辑。

### 需要统一处理的参数
- page
- section
- oa_role
- member
- trial_task
- workspace_mode

### 每类异常都应有策略
- 缺失参数
- 非法值
- 组合冲突
- stale deep link
- 指向已不存在对象
- role 与 member 不匹配

### 目标
- 不 crash
- 不进入歧义态
- 不展示错误的主 CTA
- 尽量降级到安全、可解释的 fallback 视图

---

## 4.2 UI resilience
平台壳必须具备清晰、产品化的异常状态表达。

### 至少要统一的状态
- loading
- empty
- no access
- stale link
- malformed URL
- runtime failure fallback

### 目标
- 用户知道现在发生了什么
- 用户知道自己是否有权限
- 用户知道该去哪里恢复
- 平台不会因为异常状态失去导航能力

---

## 4.3 Primary CTA correctness
所有主按钮都需要满足严格条件。

### 每个 primary CTA 必须满足
- 行为明确
- 状态一致
- 有统一 capability / availability 判断
- disabled 时有明确 reason
- 不可出现空转按钮

### 需要重点覆盖的 CTA 类型
- Open here
- role-aware primary action
- approve / review / proceed / export / invite / join 等核心按钮
- 关键 admin 动作入口

---

## 4.4 Browser automation smoke matrix
测试要从“验证几个点能用”提升为“关键角色与关键路径稳定”。

### 最小 smoke matrix 应覆盖
- 9 roles × core sections
- role switch
- section nav
- member focus
- task focus
- primary CTA correctness
- invite / join
- stale / malformed link fallback

### 目标
让明显壳层错误在 merge / release 前被自动捕获，而不是在 preview 中再被人工发现。

---

## 4.5 Release gates
发布前验证应固定化，不再依赖临场判断。

### 最小发布门禁
- typecheck
- build
- vitest
- browser smoke

### 加分项
- route schema regression tests
- CTA presence / disabled-reason checks
- shell-level runtime error monitoring hooks

---

## 五、交付物

## 5.1 Shell-level guardrail
产出统一的 workspace shell 守卫逻辑，覆盖 route state、access state、runtime fallback。

## 5.2 状态页 / 状态块规范
平台需具备一组统一的：
- loading state
- empty state
- no-access state
- stale-link state
- malformed-link state
- runtime-error fallback

## 5.3 CTA 语义清理
全平台 primary CTA 应进行一轮系统性核查与收敛。

## 5.4 自动化覆盖增强
在现有 browser automation 基础上扩展成最小 smoke matrix。

## 5.5 发布门禁文档化
明确 preview 发布前必须经过的验证步骤。

---

## 六、验收标准

### 稳定性验收
- 核心路径无未捕获 runtime error
- malformed / stale / unsupported deep link 不导致页面进入坏状态
- workspace shell 对异常状态有明确 fallback

### CTA 验收
- 所有 primary CTA 要么可执行，要么有 disabled reason
- 不存在“看起来可点但实际空转”的关键按钮

### 测试验收
- 9 角色核心导航与 role switch 被自动化覆盖
- member focus / task focus / invite / join 等核心能力被自动化覆盖
- 至少一组异常 deep link 行为被自动化覆盖

### 发布验收
- typecheck 通过
- build 通过
- vitest 通过
- browser smoke 通过

---

## 七、完成后的平台变化
本阶段完成后，平台会从：
- “关键 happy path 能跑”
- “修过几轮明显 bug”
- “依赖人工回归发现壳层问题”

升级为：
- “具备企业 preview 所需壳层稳定性”
- “异常状态可解释、可恢复”
- “主按钮语义可信”
- “关键路径有自动化护栏”

---

## 八、风险与注意事项

### 风险 1
若把本阶段做成大规模测试重构，会拖慢主线。

### 应对
优先补最能防回归的 smoke matrix，不追求一次性全覆盖。

### 风险 2
若过度追求 UI 状态完美，可能引入不必要视觉 churn。

### 应对
优先解决语义清楚、行为可靠，再考虑细节一致性。

### 风险 3
若把性能优化混入本阶段主线，容易分散焦点。

### 应对
性能与 bundle 问题只做低风险 triage，不拉起大规模重构。

---

## 九、本阶段退出条件
当以下条件全部满足时，可视为 Phase 3 完成：
- 核心壳层异常已具备 guardrail
- 核心 CTA 已完成语义清理
- 9 角色关键路径已有 smoke coverage
- malformed / stale / no-access / runtime-fallback 等状态已产品化
- 发布门禁已固定化


---

<!-- docs/roadmap/phase-4-control-plane.md -->

# Phase 4 — Enterprise Control Plane 做厚

## 阶段定位
本阶段的任务是把现有 admin / governance / readiness / audit / org 面从“有页面”推进到“有企业可信度的控制面”。

这不是新增新主线，而是在不改变当前产品方向的前提下，把控制面的厚度做出来。

## 为什么现在做
在 Phase 1 至 Phase 3 完成后，平台应已经具备：
- 统一平台契约
- 统一治理主链路
- 更稳定的平台壳与质量护栏

这时继续扩页面的收益会下降，而 buyer / admin / governance 视角对“控制面深度”的敏感度会明显提升。
因此本阶段应重点回答：
- 企业管理员为什么会信任这个平台
- 治理角色为什么觉得这不是空壳
- 审计和 readiness 为什么不是只停留在标签层

---

## 一、当前已知输入条件

### 已 done
- Organization & Workspace 页面已存在
- Members & Access 页面已存在
- Trial Join 已接上
- Policy & Governance 页面已存在
- Integration & Readiness 页面已存在
- Audit & Reporting 页面已存在
- seat / member / invite / join 已接上
- tenant admin / workspace admin / policy admin / integration admin / auditor 已有角色入口

### 仍 partial
- 这些页面仍可进一步增强 enterprise-grade depth
- 部分 admin 面可能仍偏 summary，而非真正的工作台
- policy basis、readiness gate、receipt/export、membership 边界等能力还需要更清晰的产品化表达
- buyer-facing admin narrative 仍不够厚

---

## 二、范围

## 范围内
- Organization & Workspace
- Members & Access
- Trial Join
- Policy & Governance Center
- Integration & Readiness Center
- Audit & Reporting Center

## 不在范围内
- 不扩 provider matrix
- 企业登录仍锁定 Okta OIDC
- 不做 real pilot 闭环
- 不新增角色
- 不做全新 IAM 产品
- 不把 Marketplace / Navigator / Observability 变成当前主线

---

## 三、问题定义

### 问题 1：当前控制面已经存在，但还需要更强的“企业工作台”质感
buyer 不会因为有一个“Policy 页面”就自动认可平台具备治理能力。
关键在于：
- 能不能解释 policy basis
- 能不能解释 gate 为什么阻塞
- 能不能解释 access 边界
- 能不能导出 receipt / evidence
- 能不能让 admin 真正看懂“当前状态是否可运营”

### 问题 2：不同 admin 角色需要各自可信的日常工作流
至少以下角色需要拥有真实可讲的工作路径：
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

### 问题 3：控制面不应与治理主链路脱节
本阶段不是单独造后台，而是要让控制面和主链路形成互证关系：
- governance 解释为什么 blocked
- readiness 解释为什么 not ready
- audit 解释 evidence 与 trace 是否完整
- members/access 解释谁能推进哪一段

---

## 四、目标状态设计

## 4.1 Members & Access 深化
Members & Access 不应只是列表页或 seat 切换页，而应成为 workspace admin 的管理面。

### 至少应表达
- seat scope
- member status
- invite lifecycle
- join trace
- role / seat / access boundary
- workspace admin 的可控边界

### 需要回答的问题
- 当前谁在 workspace 内
- 谁通过 invite 进入
- 谁还未完成 join
- 当前 seat / access 是否构成治理流阻塞
- workspace admin 能改什么，不能改什么

### 产品目标
让 Members & Access 成为真实的日常运营入口之一，而不是只为 demo 凑页面。

---

## 4.2 Policy & Governance 深化
Policy 面必须从“有 policy 字样”升级为“有治理依据”。

### 至少应表达
- policy basis
- policy scope
- decision rationale
- exception / waiver 记录
- blocked reason 与 policy basis 的映射

### 需要回答的问题
- 当前任务为什么被 policy 限制
- 当前决策依据是什么
- 有没有 exception / waiver
- 某个 blocked state 是否有明确 policy basis

### 产品目标
让 policy/governance admin 可以基于系统本身解释治理逻辑，而不是口头补充。

---

## 4.3 Integration & Readiness 深化
Readiness 面必须围绕当前唯一支持方向做深：**Okta OIDC**。

### 至少应表达
- readiness checklist
- gate status
- connector / environment status
- why ready / why not ready
- tenant admin / integration admin 的后续动作

### 需要回答的问题
- 当前 workspace readiness 处于什么状态
- 卡在哪个 gate
- 是环境问题、配置问题，还是接入前提未满足
- 谁应该处理当前 not-ready 状态

### 明确原则
- 不扩 provider matrix
- 不假装现在已经是多 provider product
- 不把 real tenant / IdP 联调当当前 blocker，但 readiness 解释必须真实

---

## 4.4 Audit & Reporting 深化
Audit 面必须有导出与 trace 的可信感。

### 至少应表达
- receipt timeline
- evidence bundle
- export bundle
- traceability view
- role / task / time 维度过滤能力

### 需要回答的问题
- 当前任务是否可追溯
- receipt 是否完整
- 证据是否形成 bundle
- auditor 是否能导出一组清晰的审计材料

### 产品目标
让 AUDITOR 角色拥有真实工作流，而不是仅仅切个角色看 summary。

---

## 4.5 Organization & Workspace 深化
Organization & Workspace 要成为 workspace ownership 和 admin boundary 的表达面。

### 至少应表达
- workspace ownership
- admin boundary
- escalation route
- workspace state / health
- workspace level governance summary

### 需要回答的问题
- 这个 workspace 由谁管理
- 哪类 admin 负责哪类问题
- 遇到阻塞该升级给谁
- 当前 workspace 处于健康、受限、未 ready 还是需要关注状态

---

## 五、交付物

## 5.1 五类 admin workflow 收敛
为以下角色各形成 2–3 条可讲清楚的工作流：
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

## 5.2 Members & Access 深化
补齐 access lifecycle、invite / join trace、seat boundary 相关表达。

## 5.3 Policy basis 与 blocked reason 打通
在治理链路中，blocked reason 应能追到 policy basis。

## 5.4 Readiness gate 产品化
tenant admin 与 integration admin 应能看到明确的 readiness checklist 与 why-ready / why-not-ready 解释。

## 5.5 Audit receipt / export 强化
auditor 应能围绕 receipt、evidence、export、traceability 进行完整查看与导出。

---

## 六、验收标准

### 角色验收
以下角色均具备至少 2–3 条可信工作流：
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

### Members & Access 验收
- seat / member / invite / join 生命周期表达完整
- workspace admin 能清楚看到自己可控范围与边界

### Policy & Governance 验收
- blocked reason 可以追溯到 policy basis
- decision rationale 可见
- exception / waiver 状态可解释

### Integration & Readiness 验收
- readiness checklist 可见
- why ready / why not ready 可见
- 所有 readiness 表达均围绕 Okta OIDC，不产生 provider 扩张暗示

### Audit & Reporting 验收
- auditor 能查看可追溯 receipt
- auditor 能获得 evidence / export bundle
- 审计视图不再只是 summary，而具有真实 traceability 结构

---

## 七、完成后的平台变化
本阶段完成后，平台会从：
- “有几个 admin 页面”
- “有 policy / readiness / audit 这些 section”
- “管理面仍偏轻”

升级为：
- “有明显企业控制面厚度”
- “admin 角色拥有可信工作台”
- “governance / readiness / audit 与主链路真正打通”
- “buyer 更容易相信这不是单纯 workflow demo”

---

## 八、风险与注意事项

### 风险 1
若在本阶段试图扩 provider，会偏离当前战略边界。

### 应对
所有 readiness / integration 叙事都严格锁定 Okta OIDC。

### 风险 2
若把 Members & Access 做成全新 IAM，会失控。

### 应对
只围绕当前 workspace platform 需要的 membership / seat / invite / join / boundary 表达深化，不做独立 IAM 产品。

### 风险 3
若 audit 只做视觉增强、不做 trace continuity，会显得空洞。

### 应对
严格依赖统一 task / evidence / receipt 对象，不做假 bundle。

---

## 九、本阶段退出条件
当以下条件全部满足时，可视为 Phase 4 完成：
- 五类 admin 角色各自具备可信工作流
- Members & Access 生命周期表达完整
- Policy basis 与 blocked reason 已打通
- Readiness gate 已形成明确、真实、单 provider 的解释面
- Audit / Reporting 已具备 receipt / evidence / export / traceability 的基本闭环


---

<!-- docs/roadmap/phase-5-packaging.md -->

# Phase 5 — 商业化包装与对外呈现收敛

## 阶段定位
本阶段不是重做产品，而是把当前已经成立的 B 端 governed platform，收敛为一个 buyer-facing preview package。

这一步的目标不是夸大成熟度，而是让产品表达与当前实现对齐，让非工程团队也能稳定讲、稳定演示、稳定回答问题。

## 为什么现在做
在 Phase 1 至 Phase 4 完成后，平台应已经具备：
- 统一平台契约
- 明确治理主链路
- 更稳定的平台壳
- 更厚的 enterprise control plane

这时产品已经足以形成对外表达基础。
如果不做商业化包装，系统就会继续停留在“内部知道怎么讲、外部很难看懂”的状态。

---

## 一、当前已知输入条件

### 当前产品更像
- enterprise workspace cockpit
- role-aware workflow governance console
- B 端平台壳

### 当前产品还不像
- 完整商业化成交包
- fully done real deployment product
- 已完成 real pilot 证据闭环的系统

### 已知约束
- 只围绕 B 端平台
- 不扩 C 端
- 不把 real pilot 当当前主 blocker
- 不扩 provider matrix
- 企业登录锁定 Okta OIDC
- 保持 OA v1 九角色模型
- 不做大规模产品重写

---

## 二、范围

## 范围内
- buyer narrative
- field narrative
- demo script
- one-pager
- architecture / governance explanation
- onboarding guide
- support / escalation guide
- FAQ
- preview framing
- 必要的低风险产品文案收敛

## 不在范围内
- 不做虚假 production readiness 声明
- 不声称 real pilot fully closed
- 不扩 provider matrix
- 不新增角色
- 不切换产品定位
- 不从 B 端切向 C 端

---

## 三、问题定义

### 问题 1：产品已经成形，但买方叙事还不够收敛
当前系统已经能展示很多能力，但 buyer 很可能还需要外部解释才能理解：
- 这到底是什么产品
- 它解决的是什么 enterprise workflow problem
- 为什么是 workspace 平台而不是点工具
- 为什么 9 角色不是随便贴的标签

### 问题 2：演示叙事还容易依赖产品本人
如果没有稳定的 demo 脚本和 framing，系统的表达会高度依赖熟悉细节的人。

### 问题 3：产品边界如果不说清楚，容易被误解
当前最容易被误解的点包括：
- local_lab 会不会被误认成 production tenant
- preview 会不会被误认成已 fully done deployment system
- current readiness 会不会被误认为 multi-provider product
- 当前阶段不做 real pilot blocker，会不会被理解为系统不成熟

本阶段要解决的是：**边界清楚，但价值不缩水。**

---

## 四、目标状态设计

## 4.1 Buyer narrative
必须形成一句稳定、可复用的产品定位表达。

### 建议核心表述
这是一个以 workspace 为中心、以角色治理为骨架的 enterprise workspace platform。

### 必须讲清楚的能力域
平台统一承载：
- request
- approval
- review
- operations
- members/access
- policy/governance
- audit/reporting
- integration/readiness

### 必须讲清楚的差异点
- 不是单页 demo
- 不是 C 端 app
- 不是单一审批工具
- 不是只展示 9 个角色标签
- 而是把 9 角色放进同一个 governed execution flow 与 enterprise control plane 中

---

## 4.2 Demo package
需要形成标准化 demo 资产。

### 至少应有两套时长版本
- 15 分钟版本
- 30 分钟版本

### 至少应有两种叙述路径
#### 治理主链路讲法
从 requester 发起到 auditor 收尾，突出统一治理 flow

#### 管理控制面讲法
从 tenant admin / workspace admin / policy / integration / audit 切入，突出 control plane

### Demo 应回答的关键问题
- 平台的主入口是什么
- 为什么 9 角色都在同一平台内
- 当前一个 task 如何在链路中流转
- 当前平台为什么是 governed，而不是普通 workflow
- readiness、policy、audit、members/access 如何共同构成控制面

---

## 4.3 Collateral
需要形成一套基础对外材料。

### 最小材料集合
- 产品一页纸
- 架构 / 治理说明页
- FAQ
- onboarding guide
- support / escalation guide

### 这些材料必须达到的标准
- 说法一致
- 不夸大
- 能对应当前实现
- 对 buyer 与内部团队都可复用

---

## 4.4 Preview framing
必须明确当前 preview 的定位。

### 要清楚表达
- 当前是 governed enterprise workspace preview
- local_lab 是 sandbox
- 它不是伪装成生产环境的 demo
- 当前重点是 9 角色治理流与平台控制面的成立
- real pilot 不是当前 blocker，但也不应被伪装成 fully done

### framing 原则
- 诚实
- 清楚
- 不削弱价值
- 不制造不必要误解

---

## 4.5 术语与文案收敛
所有对外表达要统一术语。

### 需要统一的关键术语
- enterprise workspace platform
- governed execution flow
- role-aware workflow governance console
- workspace
- role
- request
- approval
- review
- operations
- policy basis
- readiness gate
- audit receipt
- evidence bundle
- sandbox / preview

### 目标
无论是在 UI、文档、demo 讲稿还是 FAQ 中，同一概念都不应该被反复换叫法。

---

## 五、交付物

## 5.1 Buyer-facing one-pager
一页内清楚表达：
- 产品定位
- 主要能力域
- 核心差异点
- 当前阶段的成熟度边界

## 5.2 Architecture / governance explainer
说明平台如何把：
- request
- approval
- review
- operations
- members/access
- policy/governance
- audit/reporting
- integration/readiness

统一到一个 workspace 平台中。

## 5.3 FAQ
至少覆盖：
- 为什么是 B 端，不是 C 端
- 为什么先锁定 Okta OIDC
- 为什么保持 OA v1 九角色
- 为什么不把 real pilot 当当前 blocker
- local_lab 与 preview 的边界是什么
- 当前系统已 done 到什么程度
- 当前系统还未 fully done 的是什么

## 5.4 Demo scripts
至少形成：
- 15 分钟 demo script
- 30 分钟 demo script
- 按治理主链路讲的版本
- 按 admin / buyer 关注点讲的版本

## 5.5 Onboarding / support package
至少形成：
- onboarding guide
- support / escalation guide
- preview 使用说明
- 常见操作入口索引

---

## 六、验收标准

### 叙事验收
- 一句话定位稳定
- buyer 能迅速理解产品不是 C 端 app，也不是单页 demo
- 9 角色治理主链路能清楚被讲出来

### 演示验收
- 非工程同学可稳定讲完一遍 15 分钟版本
- 关键页面切换与叙述顺序固定
- demo 不需要依赖过量临场解释

### 文档验收
- one-pager、FAQ、onboarding、support 文档可直接复用
- 文档表述不夸大、不失真、不漂移
- 文档与当前产品能力保持一致

### framing 验收
- local_lab 的 sandbox 属性表达清楚
- preview 与 production / real pilot 的边界表达清楚
- current maturity 的表述既真实又不削弱平台价值

---

## 七、完成后的平台变化
本阶段完成后，平台会从：
- “内部知道怎么讲”
- “需要熟悉上下文的人才能讲清楚”
- “buyer 看到后可能不知道边界和成熟度”

升级为：
- “有统一 buyer narrative”
- “有稳定 demo package”
- “有 onboarding / support / FAQ”
- “有 honest but strong 的 preview framing”
- “可作为 buyer-facing preview package 稳定使用”

---

## 八、风险与注意事项

### 风险 1
如果包装文案跑得比产品更快，容易过度承诺。

### 应对
所有表述都以当前实现为上限，不做未来态伪装。

### 风险 2
如果过于强调“还没 fully done”，可能削弱买方信心。

### 应对
强调当前已成立的是：
- 9 角色治理主链路
- enterprise workspace platform 壳
- control plane 骨架
- preview 可运行、可演示、可继续深化

### 风险 3
如果 FAQ 和 demo 脚本不统一，会造成对外口径漂移。

### 应对
统一术语表，并让所有资料复用同一定位语句和关键边界。

---

## 九、本阶段退出条件
当以下条件全部满足时，可视为 Phase 5 完成：
- buyer narrative 已固定
- demo package 已成形
- one-pager / FAQ / onboarding / support 材料已成形
- preview framing 已清楚表达 sandbox 与当前阶段边界
- 产品对外表述与当前实现保持一致


---
