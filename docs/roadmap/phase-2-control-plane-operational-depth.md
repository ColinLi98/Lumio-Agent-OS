# Phase 2 — Control Plane Operational Depth

## 阶段定位
本阶段的目标是把 Lumio 的 enterprise control plane 从“可见”推进到“能日常用”。

这不是新增控制面，而是把现有控制面做厚、做真、做成可运营工作台。

## 为什么现在做
当前 Lumio 已经具备：
- Organization & Workspace
- Members & Access
- Trial Join
- Policy & Governance Center
- Integration & Readiness Center
- Audit & Reporting Center

问题不在于“有没有页面”，而在于这些页面是否已经具备足够的企业可信度。  
下一步最关键的是让 admin 角色能在系统里完成真实可讲的工作，而不是只在系统里浏览状态。

---

## 一、阶段目标
本阶段要完成的核心任务是：

1. 把 Members & Access 做成 workspace admin 的真实工作台
2. 把 Policy & Governance 做成治理可运营面
3. 把 Integration & Readiness 做成真实的 Okta OIDC-only readiness 面
4. 把 Audit & Reporting 做成有实际 traceability 的审计面
5. 把 Organization & Workspace 做成 ownership / escalation / health 的控制面

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
- 不新增 provider
- 不做独立 IAM 产品
- 不新增角色
- 不扩 C 端
- 不把 Marketplace / Navigator / Observability 变成当前主战场
- 不把 real pilot 当本阶段 blocker

---

## 三、问题定义

### 问题 1：控制面已有骨架，但还不是 daily-use admin workspace
当前控制面更像“可信 preview”，还不像“每天打开来处理工作”的企业工作台。

### 问题 2：五类 admin 角色需要各自真实工作流
至少以下角色需要拥有可信、可讲、可操作的工作流：
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

### 问题 3：控制面必须与 governed flow 主链路打通
控制面不是附加后台。  
它需要解释：
- 为什么任务 blocked
- 为什么 workspace not ready
- 为什么某些 action 不允许
- 为什么某份 receipt 可导出或不可导出

---

## 四、目标状态设计

## 4.1 Members & Access
Members & Access 要从“不是 roster 了”继续推进为真实管理面。

### 至少应具备
- boundary history
- change history
- seat / member / access 变化记录
- invite lifecycle
- join trace
- workspace admin 的边界表达

### 需要回答的问题
- 当前谁在 workspace 内
- 谁在等待 join
- 谁的 access 发生了变化
- 哪次变更影响了治理链路推进
- workspace admin 能做什么、不能做什么

---

## 4.2 Policy & Governance
Policy & Governance 要从“治理可见”推进为“治理可运营”。

### 至少应具备
- policy basis
- decision trace
- decision rationale
- exception / waiver 状态
- blocked reason 与 policy basis 的映射

### 需要回答的问题
- 当前任务为什么被限制
- 当前允许或不允许的依据是什么
- 当前是否存在例外
- 例外由谁处理，处理后会影响什么

---

## 4.3 Integration & Readiness
Integration & Readiness 必须继续只围绕 **Okta OIDC-only** 做深。

### 至少应具备
- readiness checklist
- gate owner
- gate status
- why ready / why not ready
- tenant admin / integration admin 的 next action
- environment / binding / configuration 状态解释

### 需要回答的问题
- 当前 workspace ready 到什么程度
- 不 ready 是因为什么
- 由谁处理
- 处理后会解除哪些阻塞

---

## 4.4 Audit & Reporting
Audit & Reporting 要从“有 export framing”推进到“有 enterprise 审计工作流”。

### 至少应具备
- filter clarity
- export clarity
- receipt completeness
- traceability view
- evidence bundle continuity
- use-case clarity

### 需要回答的问题
- receipt 是否完整
- 某个 task 的 trace 是否可追
- auditor 可以导出什么，不能导出什么
- 哪类证据支撑哪类审计结论

---

## 4.5 Organization & Workspace
Organization & Workspace 要成为 workspace ownership 与治理责任的表达面。

### 至少应具备
- workspace ownership
- admin boundary
- escalation 路径
- workspace state / health
- workspace-level governance summary

### 需要回答的问题
- 谁负责这个 workspace
- 当前问题该升级给谁
- 当前是健康、受限、待配置还是需关注
- 哪类问题属于 workspace admin、tenant admin、integration admin 或 governance admin

---

## 五、交付物

## 5.1 五类 admin 工作流定义
为以下角色各形成至少 2–3 条可信工作流：
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

## 5.2 Members & Access 历史与边界层
把 boundary history / change history / lifecycle trace 补齐。

## 5.3 Policy decision trace
把 policy basis、blocked reason、exception / waiver、decision rationale 串成可解释链路。

## 5.4 Readiness gate operating view
让 readiness 具备 owner、next action、gate explanation，而不是只显示状态。

## 5.5 Audit operating view
让审计视图具备明确的 filter / export / receipt / trace 表达。

---

## 六、验收标准

### 角色验收
以下角色均具备至少 2–3 条可讲清楚、可操作的工作流：
- TENANT_ADMIN
- WORKSPACE_ADMIN
- POLICY_GOVERNANCE_ADMIN
- INTEGRATION_ADMIN
- AUDITOR

### 控制面验收
系统本身应能清楚回答：
- 当前卡点是什么
- 为什么卡
- 谁来处理
- 处理后流向哪里

### Members & Access 验收
- 有边界历史
- 有变化历史
- invite / join / access / seat 生命周期清楚
- workspace admin 的权限边界清楚

### Policy & Governance 验收
- blocked reason 能追溯到 policy basis

---

## 七、2026-03-11 实施更新

本次实现没有新增 major section，也没有改变 OA v1 九角色、Okta OIDC-only 边界或 provider coverage。  
重点是把已有 control plane 变成更像 daily-use admin workspace 的系统表达。

### 已落地内容

#### Organization & Workspace
- 补齐了 workspace state / health 表达：
  - activation package state
  - environment binding state
  - workspace state owner
- 补齐了 governed-flow linkage：
  - 当前 blocker 如何影响 governed progression
  - 当前 next action 如何映射回主链路
- 增加了 cross-role admin operating lanes，覆盖：
  - TENANT_ADMIN
  - WORKSPACE_ADMIN
  - POLICY_GOVERNANCE_ADMIN
  - INTEGRATION_ADMIN
  - AUDITOR

#### Members & Access
- 补齐了 daily-use admin 需要的 history / lifecycle 视图：
  - boundary history
  - change history
  - invite lifecycle
  - join trace
  - seat / member / access state transitions
  - workspace admin boundary visibility
- 这些视图仍然绑定 governed flow，而不是漂移成独立 IAM 界面：
  - 明确成员/seat/access 变化会影响 request -> approval -> operations -> review -> audit 的角色承接

#### Trial Join
- current-workspace join surface 继续保持显式 mutation 边界，不做静默 side effect
- join surface 现在更清楚表达：
  - invite token
  - pending invites
  - invite lifecycle
  - join boundary
  - access change
  - join trace
- 增加了 Workspace Admin join workflows，保证 Trial Join 不是孤立入口，而是 workspace participation 流程的一部分

#### Policy & Governance Center
- 补齐了 policy decision trace：
  - current stage
  - blocked by
  - decision trace
  - evidence set
- 保持并加强：
  - policy basis
  - decision rationale
  - exception / waiver state
  - blocked reason linkage back to policy basis
  - who can act
  - what changes when exception exists or is unavailable
- 增加了 POLICY_GOVERNANCE_ADMIN workflows，使治理角色有真实可讲的工作流

#### Integration & Readiness Center
- Okta OIDC-only readiness surface 继续做深，不扩 provider：
  - readiness checklist
  - gate owner
  - gate state
  - why ready / why not ready
  - next action
  - gate transitions
- 增加 TENANT_ADMIN / INTEGRATION_ADMIN workflows，让 readiness 更像 operating view，而不是 summary-only panel

#### Audit & Reporting Center
- 审计面补齐：
  - receipt status
  - receipt completeness
  - trace continuity
  - traceability view
  - evidence bundle continuity
  - evidence-to-export continuity
  - filter clarity
  - export boundary clarity
- export 仍明确为 preview-only read boundary，不宣称 system-of-record export workflow
- 增加 AUDITOR workflows，确保 auditor 至少有 2–3 条可信系统工作流

### Admin workflows
系统当前已明确表达至少 2–3 条可信工作流给以下角色：
- `TENANT_ADMIN`
  - clear activation blocker ownership
  - review activation package posture
  - coordinate evidence category gaps
- `WORKSPACE_ADMIN`
  - review workspace seat and access boundaries
  - trace invite and join lifecycle
  - escalate workspace-local blocker
- `POLICY_GOVERNANCE_ADMIN`
  - link blocker back to policy basis
  - assess exception / waiver posture
  - review rollout and decision rationale
- `INTEGRATION_ADMIN`
  - clear identity gate ownership
  - clear connector and credential gates
  - publish readiness next action
- `AUDITOR`
  - confirm receipt completeness
  - trace evidence bundle continuity
  - prepare export preview boundary

### 验证结果
- 通过：
  - focused contract / helper tests
  - build
  - enterprise-platform Playwright smoke
- 全量命令仍受既有 repo baseline 影响：
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run test:e2e`
- 当前已确认的非本次变更 blocker 包括：
  - 缺失模块导入（如 `personalizationService`, `soulMatrixStore`, `flightConstraintParser`）
  - `tests/localRoleLabTaskStore.test.ts` 的既有 timeout
  - `playwright-tests/agent-market-external.spec.ts` 的既有 timeout
- decision trace 与 rationale 可见
- exception / waiver 状态与边界清楚

### Integration & Readiness 验收
- readiness checklist 清楚
- gate owner 清楚
- why ready / why not ready 清楚
- 不产生 provider 扩张暗示

### Audit & Reporting 验收
- filter / export / receipt / trace 表达清楚
- auditor 拥有真实工作流，不只是 summary reader

---

## 七、完成后的平台变化
本阶段完成后，Lumio 会从：
- “有一个初步可信的 enterprise control plane”

升级为：
- “有可运营、可日常使用的 enterprise control plane”
- “五类 admin 角色拥有真实工作面”
- “控制面与 governed flow 主链路形成互证”

---

## 八、退出条件
当以下条件全部满足时，可视为 Phase 2 完成：
- 五类 admin 工作流已成形
- Members & Access 已具备历史与边界表达
- Policy & Governance 已具备 decision trace
- Integration & Readiness 已形成 owner-aware readiness gate 视图
- Audit & Reporting 已具备更清晰的工作流与导出边界
