# Phase 1 — Current Workspace Depth

## 阶段定位
本阶段的目标是把 current workspace 从“存在但仍偏保守的真实路径”，推进为一个对 buyer、内部评审和产品团队都更可信的主路径。

这不是新增页面，而是把已有 B 端 section 的 **current-workspace 深度** 向前推一层。

## 为什么现在做
当前 Lumio 的最强路径仍偏向 local_lab。  
这意味着：
- 系统最完整的叙事还依赖 sandbox
- current workspace 虽然已经存在，但还不够像真实可运营路径
- buyer 如果追问“真实 current workspace 下会怎样”，说服力还不够强

因此本阶段的优先事项不是再扩新页面，而是提高 current workspace 的可信度。

---

## 一、阶段目标
本阶段要同时完成五件事：

1. **enterprise session continuity**
2. **live member / access mutation depth**
3. **policy exception / waiver 的真实操作边界**
4. **audit receipt / export traceability 的更完整闭环**
5. **Okta OIDC-only readiness 在 current workspace 下做实**

---

## 二、范围

## 范围内
- current workspace 路由与上下文恢复
- role / member / task / section / workspace 连续性
- Members & Access 中的 live mutation 边界
- Policy & Governance 中的 exception / waiver 表达
- Audit & Reporting 中的 receipt / trace / export 连续性
- Integration & Readiness 中围绕 Okta OIDC 的 readiness 解释
- current workspace 下的 fail-closed write 保护

## 不在范围内
- 不扩新 section
- 不扩 provider matrix
- 不新增角色
- 不把 real pilot 当 blocker
- 不做全新 deployment / tenancy 架构
- 不把品牌标识迁移混进本阶段

---

## 三、问题定义

### 问题 1：current workspace 还不是最强主叙事路径
目前最完整的演示与叙事仍偏向 local_lab。  
如果不把 current workspace 做深，平台的“更真”这一步就始终会缺少锚点。

### 问题 2：当前 mutation 深度仍偏克制
现有写路径有 fail-closed 保护，这是正确的。  
但 buyer 和 admin 还需要更清楚地看到：
- 哪些 mutation 允许
- 哪些 mutation 禁止
- 哪些 mutation 受 policy / readiness / access 限制
- mutation 发生后如何被记录与解释

### 问题 3：current workspace 的 policy / audit / readiness 还需要更强的“真实边界”
目前这些能力已经可见，但还需要更强的 current-workspace operational framing，避免它们看起来仍像 preview-only surface。

---

## 四、目标状态设计

## 4.1 Enterprise session continuity
current workspace 下应保证以下连续性：
- role continuity
- member continuity
- task continuity
- section continuity
- workspace continuity

### 具体要求
- 刷新页面后状态不漂
- role switch 后上下文不丢
- member focus / task focus 后 URL 与页面状态一致
- section 跳转时不丢当前 workspace 语义
- stale / invalid current-workspace state 应安全降级，而不是静默漂移

---

## 4.2 Live member / access mutation depth
要让 current workspace 下的 Members & Access 更像真实 admin 工作流的一部分。

### 至少应明确
- invite / join 的 current-workspace 路径
- seat assignment / membership mutation 的允许边界
- 哪些操作只读
- 哪些操作 fail-closed
- 哪些操作需要满足 readiness / policy / access 前提

### 产品要求
- 所有 mutation 都要可解释
- 所有 mutation 结果都要有状态表达
- 禁止操作必须有明确原因
- 不允许“看起来可改，实际不敢改”的模糊状态

---

## 4.3 Policy exception / waiver 边界
Policy & Governance 需要进一步表达 current workspace 下的治理边界。

### 至少应明确
- 当前任务是否存在 policy basis
- 当前是否存在 exception / waiver
- exception / waiver 由谁处理
- 处理后会影响什么阶段或动作
- 哪些 policy 限制会阻塞 current workspace mutation

### 目标
让 policy/governance admin 能够用系统本身解释“为什么允许 / 为什么不允许 / 如果例外成立会发生什么”。

---

## 4.4 Audit receipt / export traceability
Audit & Reporting 需要更完整地支撑 current workspace 叙事。

### 至少应明确
- receipt 是否存在
- receipt 关联的 trace 是否完整
- evidence 如何构成 export bundle
- 导出动作的边界和状态
- 谁可以查看、谁可以导出、谁只能读

### 目标
让 buyer 能看见：
- trace 不是只在 local_lab 有意义
- current workspace 同样具备更真实的 receipt / export / trace continuity

---

## 4.5 Okta OIDC-only readiness 做实
Integration & Readiness 继续围绕唯一目标做深：**Okta OIDC**

### 至少应明确
- readiness checklist
- gate status
- why ready / why not ready
- 当前 not-ready 是配置、环境、绑定、访问边界还是策略问题
- tenant admin / integration admin 的 next action

### 原则
- 不扩 provider
- 不暗示多 provider
- 不把真实 IdP 联调是否 fully done 当本阶段 blocker
- 但 readiness 表达必须真实、可解释

---

## 五、交付物

## 5.1 Current-workspace continuity contract
形成一套明确规则，描述：
- current workspace 如何恢复上下文
- 哪些参数是必需的
- 如何应对刷新、切换、回退、深链进入

## 5.2 Live mutation boundary matrix
形成 current workspace 写路径矩阵，明确：
- allowed
- blocked
- fail-closed
- read-only
- gated by readiness / policy / access

## 5.3 Policy exception / waiver operational surface
在现有 Policy & Governance 基础上补齐对 exception / waiver 的状态、边界与影响表达。

## 5.4 Receipt / trace / export continuity package
在现有 Audit & Reporting 基础上补齐 current-workspace 下的审计连续性表达。

## 5.5 Okta readiness detail surface
把 current-workspace readiness 解释做得更具体、更可信。

---

## 六、验收标准

### 功能验收
- current workspace 可以跑完核心 buyer / admin 叙事，而不需要关键处退回 local_lab
- role / member / task / section / workspace 状态在 current workspace 下连续
- 所有写路径仍保持 fail-closed
- 关键 mutation 都有明确的 allowed / blocked / denied 理由
- policy / readiness / audit 的状态在 current workspace 下可解释、可追踪

### 产品验收
- current workspace 不再像“弱化版 preview”
- buyer 能理解 current workspace 的真实边界
- admin 能理解哪些操作可做、哪些不可做、为什么

### 质量验收
- current-workspace 关键路径具备基本 smoke coverage
- current-workspace 写路径无未解释的 no-op
- 刷新、跳转、角色切换不会让状态漂移

---

## 七、完成后的平台变化
本阶段完成后，Lumio 会从：
- “最强路径仍主要依赖 local_lab”
- “current workspace 虽然存在，但更像保守壳层”

升级为：
- “current workspace 已成为可信主路径之一”
- “live mutation 具备明确边界和解释”
- “policy / readiness / audit 在 current workspace 下更真”
- “buyer 对真实部署前态的理解更清楚”

---

## 八、退出条件
当以下条件全部满足时，可视为 Phase 1 完成：
- current workspace 已能支撑核心 buyer/admin 叙事
- session continuity 已建立
- mutation boundary 已清楚
- exception / waiver 边界已表达
- receipt / trace / export 已形成 current-workspace 连续性
- Okta OIDC-only readiness 表达已更具体、更可信

---

## 九、2026-03-11 实施更新

本次实现没有扩新 section，也没有改 OA v1 九角色、provider matrix 或 Okta OIDC-only 前提；重点是把 current workspace 的已有 section 做深。

### 已落地内容
- current-workspace 路由连续性加强：
  - 当前 workspace route 会把 page / section / oa_role / member / task 快照保存在 session 级快照里
  - 刷新或 partial deep link 进入 current workspace 时，会优先恢复最近的 current-workspace 上下文
  - role switch 会同步到与角色一致的 page / section，而不是只改 active role 造成静默漂移
  - stale member / task 仍然 fail-safe 回落，但 UI 会保留显式 route issue 说明
- current-workspace join / invite 变为显式 mutation：
  - 去掉了 enterprise invite 的静默自动 accept
  - current workspace 的 join surface 会明确显示 invite token、pending invites、join boundary、access change
  - invite accept 只有在 signed-in + role bound + write ready 时才会显式可点
- current-workspace mutation boundary matrix 已内嵌到现有 section：
  - join
  - organization
  - members
  - admin
  - approval
  - review
  - policy
  - audit
  - 每个 section 都会把相关 mutation 明确标成 `allowed` / `blocked` / `denied` / `fail_closed` / `read_only`
- live member / access mutation depth 加强：
  - membership admin 在 blocked / fail-closed 时不再只剩一句模糊提示，而是保留真实边界说明
  - focused member 会进入 membership mutation surface，显示当前 role / workspace scope / status
  - invite、seat assignment / role assignment、deactivate / reactivate 的边界都更明确
- policy / governance surface 加强：
  - 补充了谁能 act on exceptions
  - 补充了 waiver granted / unavailable 时 workflow 会如何变化
  - 保持 live waiver mutation fail-closed，不假装当前 phase 已支持真实写入
- audit / reporting continuity 加强：
  - 补充 receipt status
  - 补充 trace continuity
  - 补充 evidence-to-export continuity
  - 补充 export boundary，明确当前 shell 只提供 preview export，不宣称 system-of-record export job
- Okta readiness surface 加强：
  - checklist 现在包含 owner / next action
  - 增加 gate status 摘要
  - why ready / why not ready 继续保留，并更贴近 current-workspace 解释

### 验证结论
- 变更范围内的 contract / component helper tests 已补齐并通过
- enterprise-platform Playwright smoke 已通过：
  - role / section / member / task continuity
  - disabled CTA boundary behavior
  - deeper control-plane surfaces
- 全量 build 通过
- 全量 typecheck 与全量 unit / e2e 仍存在仓库既有失败：
  - 若干缺失模块导入
  - 既有 local role lab timeout
  - 与本次 current-workspace 变更无直接关联的 agent-market external Playwright timeout
