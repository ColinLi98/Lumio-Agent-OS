# Phase 3 — Current-Workspace Reliability Guardrails

## 阶段定位
本阶段的目标是让 Lumio 的可靠性护栏从“覆盖 preview / local_lab 的基线”推进到“覆盖 current workspace 的真实路径”。

如果产品下一步要强调“更真”，那么稳定性、测试、诊断和回归门禁也必须跟着从 sandbox 中心转向 current-workspace 中心。

## 为什么现在做
如果 Phase 1 和 Phase 2 已开始让 current workspace 更深、control plane 更厚，那么新的风险就会来自：
- current workspace 路径比 local_lab 更复杂
- 写路径更多受到 access / policy / readiness 影响
- 角色、成员、任务、workspace 之间的状态组合更容易出现边缘问题

因此这阶段不是可选项，而是必须并行推进的护栏工程。

---

## 一、阶段目标
本阶段要完成四类护栏：

1. **current-workspace smoke / e2e 覆盖**
2. **member/access/policy/readiness/audit mutation 安全验证**
3. **CTA correctness 与 fail-closed 行为清理**
4. **diagnostics / observability / release gates 强化**

---

## 二、范围

## 范围内
- current workspace 路由与状态恢复
- 角色切换 / 成员切换 / task focus / section nav
- current-workspace 下的关键 mutation
- Members & Access / Policy & Governance / Integration & Readiness / Audit & Reporting 主 CTA
- fail-closed 行为
- browser smoke / e2e / regression checks
- 基础 diagnostics / telemetry / release gates

## 不在范围内
- 不切换测试框架
- 不做大规模性能重构
- 不做 bundle 优化专项
- 不新增业务模块
- 不以 local_lab-only 路径作为本阶段主要验收目标

---

## 三、问题定义

### 问题 1：现有基线已经足够证明 preview 能跑，但不足以证明 current workspace 更真时仍然稳
如果 current workspace 深度增强之后没有同步补护栏，很容易出现“看起来更真实，实际更脆”的反效果。

### 问题 2：写路径越真实，fail-closed 越需要被显式验证
fail-closed 不能只靠原则存在，必须有测试与可观察性支撑。

### 问题 3：关键主 CTA 一旦语义漂移，会直接破坏 buyer 信任
在 current workspace 中，按钮语义的要求更高：
- 要么真实可用
- 要么明确 blocked / denied / unavailable
- 不能出现空转、误导、隐性 no-op

---

## 四、目标状态设计

## 4.1 Current-workspace smoke matrix
建立以 current workspace 为中心的 smoke matrix。

### 至少覆盖
- 9 角色核心入口
- role switch
- member focus
- task focus
- section nav
- current-workspace 关键主 CTA
- invite / join / access change
- readiness / policy / audit 关键路径

### 目标
- merge / release 前能自动发现明显壳层或流程回归
- current workspace 成为稳定性验收的主对象之一

---

## 4.2 Mutation safety suite
围绕更真实的 current-workspace 写路径，建立 mutation safety 规则。

### 至少覆盖
- allowed mutation
- blocked mutation
- denied mutation
- fail-closed mutation
- no-access mutation
- stale-state mutation

### 目标
- 所有关键 mutation 都有明确预期结果
- 出错时能区分是策略阻塞、权限阻塞、readiness 阻塞还是系统保护

---

## 4.3 CTA correctness audit
对 current-workspace 下的关键主按钮进行系统性清理。

### 核心要求
- 按钮可见性正确
- 按钮可用性正确
- 按钮 disabled reason 正确
- 不存在误导性可点击按钮
- 不存在 silent no-op

### 重点区域
- Members & Access
- Policy & Governance
- Integration & Readiness
- Audit & Reporting
- Overview / task detail / current-workspace 交叉跳转点

---

## 4.4 Diagnostics / observability / release gates
需要让 current workspace 的关键失败可以被解释和追踪。

### 至少应具备
- current-workspace route / restore 失败诊断
- mutation deny / fail-closed / blocked 原因记录
- CTA 执行失败诊断
- 发布前固定验证门禁

### 最小发布门禁
- typecheck
- build
- vitest
- browser smoke
- current-workspace 关键路径回归

---

## 五、交付物

## 5.1 Current-workspace smoke matrix
一套明确的 current-workspace 测试矩阵，覆盖角色、路径、任务、成员与关键 CTA。

## 5.2 Mutation safety checklist
明确当前哪些 mutation 需要自动化覆盖、哪些需要手工验证、哪些必须 fail-closed。

## 5.3 CTA correctness pass
完成一轮系统性 CTA 语义核查与修正。

## 5.4 Diagnostics baseline
建立 current-workspace 关键失败场景的基础诊断能力。

## 5.5 Release gate update
把 current-workspace 纳入发布前固定门禁，而不是只依赖 local_lab smoke。

---

## 六、验收标准

### 稳定性验收
- current-workspace 关键路径进入发布门禁
- 角色切换、成员切换、任务切换、section 跳转不产生状态漂移
- stale / malformed / unsupported current-workspace state 能安全降级

### Mutation 验收
- 关键 mutation 均有明确 allowed / blocked / denied / fail-closed 结果
- 不存在未解释的 silent no-op
- fail-closed 行为可验证

### CTA 验收
- 所有关键主 CTA 要么真实可用，要么明确不可用并给出原因
- 不存在误导性按钮

### 质量验收
- typecheck / build / vitest / browser smoke 通过
- current-workspace 关键路径 smoke 覆盖存在
- 至少一组关键 deny / blocked / fail-closed 场景被自动化验证

---

## 七、完成后的平台变化
本阶段完成后，Lumio 会从：
- “preview 能跑、local_lab 更稳”

升级为：
- “current workspace 也具备 buyer-facing 稳定性”
- “写路径风险有明确护栏”
- “关键 CTA 语义可信”
- “发布前能更早发现 current-workspace 回归”

---

## 八、退出条件
当以下条件全部满足时，可视为 Phase 3 完成：
- current-workspace smoke matrix 已建立
- mutation safety suite 已建立
- CTA correctness 已完成清理
- diagnostics / release gates 已覆盖 current workspace

---

## 九、2026-03-11 实施更新

本次实现没有新增业务模块，没有切换测试框架，也没有做大规模性能重构。  
重点是把 current workspace 的可靠性护栏做成现有基线的一部分。

### 已落地内容

#### 1. Current-workspace smoke matrix
- 新增 current-workspace 定向单测矩阵：
  - role entry
  - member focus
  - task focus
  - section navigation continuity
  - key CTA capability categories
- 新增 browser smoke：
  - malformed route state
  - stale member / stale task
  - stored route restore failure
  - role switch
  - member focus continuity
  - task focus continuity
  - approval CTA execution
  - fail-closed CTA visibility

#### 2. Mutation path safety coverage
- current-workspace mutation 现在有 focused automated coverage for:
  - allowed
  - blocked
  - denied
  - fail-closed
  - no-access
  - stale-state
- 这些覆盖主要落在 shared contract tests，而不是散落在各 panel 里

#### 3. CTA correctness hardening
- current-workspace unsupported params 现在显式 warning：
  - `lab_actor_id` ignored outside `local_lab`
  - `invite_code` ignored outside `local_lab`
  - `enterprise_invite` ignored outside current workspace
- stored current-workspace route snapshot parse failure 现在会：
  - clear invalid snapshot
  - surface a visible restore-failure panel
  - emit diagnostics
- key CTA failure paths现在会记录 dedicated diagnostics，而不是只落在通用 error message：
  - sign-in execution failure
  - invite accept execution failure
  - center decision execution failure

#### 4. Diagnostics / telemetry additions
- `platformShellDiagnostics` 新增：
  - `route_restore_failure`
  - `cta_execution_failed`
- 已保留并继续使用：
  - `route_warning`
  - `stale_link`
  - `load_failure`
  - `cta_blocked`
- current-workspace 路由恢复失败现在有明确 telemetry hook，不再静默吞掉

#### 5. Release baseline update
- `scripts/check-release-baseline.sh` 现在把 current-workspace 纳入固定基线：
  - `tests/currentWorkspaceReliability.test.ts`
  - `playwright-tests/current-workspace-reliability.spec.ts`
  - `playwright-tests/enterprise-platform-hardening.spec.ts`

### 新增 / 更新测试
- 新增 [tests/currentWorkspaceReliability.test.ts](/Users/lili/Desktop/Agent%20OS/tests/currentWorkspaceReliability.test.ts)
- 新增 [playwright-tests/current-workspace-reliability.spec.ts](/Users/lili/Desktop/Agent%20OS/playwright-tests/current-workspace-reliability.spec.ts)
- 更新：
  - [tests/platformContract.test.ts](/Users/lili/Desktop/Agent%20OS/tests/platformContract.test.ts)
  - [tests/components/EnterprisePlatformView.test.ts](/Users/lili/Desktop/Agent%20OS/tests/components/EnterprisePlatformView.test.ts)

### 验证结果
- 通过：
  - targeted current-workspace Vitest coverage
  - targeted current-workspace Playwright smoke
  - enterprise-platform hardening Playwright smoke
  - build
- 仍未全绿：
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run test:e2e`
- 当前确认的 repo-baseline blocker 仍包括：
  - 缺失模块导入，如 `personalizationService`, `soulMatrixStore`, `flightConstraintParser`
  - `tests/localRoleLabTaskStore.test.ts` 既有 timeout
  - `playwright-tests/agent-market-external.spec.ts` 既有 timeout
