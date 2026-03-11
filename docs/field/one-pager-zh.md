# Lumio 一页纸（中文）

日期：2026-03-11
受众：buyer、业务负责人、企业管理员、内部 field 团队

## Lumio 是什么

Lumio 是一个 governed enterprise workspace preview。

它是企业工作台平台，不是消费者产品，也不是独立 IAM 产品。它把 governed work、角色协同、readiness 状态、成员与访问边界、policy context 和 audit traceability 放进同一个 enterprise workspace shell。

## 核心产品形态

- enterprise workspace platform
- governed flow：
  - Request
  - Approval
  - Operations
  - Review
  - Audit
- OA v1 nine-role model：
  - `REQUESTER`
  - `APPROVER`
  - `OPERATOR`
  - `REVIEWER`
  - `TENANT_ADMIN`
  - `WORKSPACE_ADMIN`
  - `POLICY_GOVERNANCE_ADMIN`
  - `INTEGRATION_ADMIN`
  - `AUDITOR`
- 当前企业登录目标只包含 Okta OIDC

## Buyer 现在能真实看到什么

- 一个统一的 enterprise workspace shell，而不是一组松散后台页
- 同一个任务在不同角色视角下共享同一条 governed flow
- `current workspace` 正在变成更可信的企业路径
- `local_lab` 作为 sandbox / preview workspace 用于引导演示
- Members & Access、Policy & Governance、Integration & Readiness、Audit & Reporting 已经在同一个 control plane 中
- 关键 mutation 边界清楚可解释：
  - allowed
  - blocked
  - denied
  - fail-closed
  - read-only

## 核心 section

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

## 它解决什么问题

Lumio 让企业团队可以在一个工作台内解释清楚：

- 当前为什么 blocked
- blocked 的依据是什么
- 谁拥有 next action
- 当前状态由哪些 evidence 支撑
- audit receipt 和 evidence bundle 到底代表什么

## 成熟度表述

建议统一使用以下口径：

- Lumio 是 governed enterprise workspace preview
- `current workspace` 是正在被做深、越来越可信的企业路径
- `local_lab` 是 sandbox / preview workspace
- 当前 package 不宣称 full production closure
- 当前 package 不宣称 full pilot closure
- 当前 package 不宣称 Okta OIDC 之外的 provider 覆盖

## 不应宣称的内容

- full production deployment complete
- full pilot complete
- 更广的 IdP / provider 覆盖
- 独立 IAM 套件
- 当前尚未支持的 live mutation 宽度

## 最佳演示路径

1. 先从 `current workspace` 进入，展示更真实的企业路径。
2. 围绕一个任务走完 governed flow。
3. 用 control plane 展示 policy basis、readiness、member/access 边界、audit receipt 和 evidence bundle continuity。
4. 只有在需要 sandbox 例子时才切到 `local_lab`，并明确说明它是 preview-only。

## 可安全使用的 proof points

- governed flow 已实现
- OA v1 九角色已作为产品骨架实现
- current-workspace reliability guardrails 和 smoke coverage 已存在
- mutation boundary 明确且诚实
- audit receipt 与 evidence bundle framing 已在产品中可见
- Okta OIDC-only readiness 已在产品中可解释
