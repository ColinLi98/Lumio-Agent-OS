# Phase 4 — Field Package Standardization

## 阶段定位
本阶段的目标不是再生成更多零散文档，而是把 Lumio 当前已有的 one-pager、demo、FAQ、onboarding / support docs 收敛成一套标准 field package。

这一步的核心不是“写更多”，而是“讲得更稳、交付得更统一、边界更诚实”。

## 为什么现在做
当前 Lumio 已经具备：
- buyer 可理解的 governed workspace preview
- 清晰的主链路
- 初步可信的 control plane
- 基础的 one-pager、demo、FAQ、onboarding / support docs

但距离“强商业成交能力”还缺：
- 更稳定的一致口径
- 更标准的 field package
- 更完整的 objection handling
- 更清楚的 maturity / deployment / support framing

---

## 一、阶段目标
本阶段要把当前商业化材料从“文档集合”推进到“标准 field package”。

重点完成：
1. 中文与英文 one-pager
2. 15 分钟 demo talk track
3. 30 分钟 buyer deep dive talk track
4. admin onboarding pack
5. support / escalation pack
6. objection handling
7. proof pack
8. commercial package skeleton

---

## 二、范围

## 范围内
- 中文 one-pager
- 英文 one-pager
- demo talk tracks
- FAQ
- onboarding guide
- support / escalation guide
- objection handling
- proof pack
- package model skeleton
- deployment / maturity boundary framing

## 不在范围内
- 不提前锁死 pricing 数字
- 不伪造 customer proof
- 不声称 full pilot closed
- 不声称 full production deployment complete
- 不扩大产品边界
- 不把品牌重命名作为本阶段核心

---

## 三、问题定义

### 问题 1：现有材料已有雏形，但还不够像“标准 field package”
当前材料能支持内部叙述，但未必能支持稳定的 buyer-facing、partner-facing、field-facing 复用。

### 问题 2：对外表述仍需要更一致的成熟度 framing
Lumio 当前最需要的是“诚实但有力”的表述：
- 它已经不是 demo 壳
- 但也不是 full production closure
- 它的价值在于 governed flow、role model、control plane 与 preview 可运行性

### 问题 3：缺少 proof pack 与 objection handling
没有 reference customer proof 时，必须用更强的 proof pack 和 objection handling 替代，而不是用夸大的话术填补。

---

## 四、目标状态设计

## 4.1 One-pager
形成中英文两版 one-pager。

### 必须讲清楚
- 产品定位：enterprise workspace platform
- 核心主链路：Request -> Approval -> Operations -> Review -> Audit
- 9 角色模型不是标签，而是 governed flow 的参与者
- control plane 的作用
- 当前阶段：buyer-ready preview，而非 full production closure

---

## 4.2 Demo talk tracks
形成两套标准 demo 话术。

### 15 分钟版本
适合快速 buyer intro、内部 review、短时演示。

### 30 分钟版本
适合 buyer deep dive、admin / governance 视角、较完整的 control plane 讲解。

### 两套 talk track 都必须回答
- 为什么是 B 端，而不是 C 端
- 为什么 current workspace 和 local_lab 的边界要讲清楚
- 为什么只有 Okta OIDC
- 为什么 9 角色是治理骨架而不是简单标签
- 当前产品已经 done 到哪里
- 当前产品还没 fully done 的边界是什么

---

## 4.3 Admin onboarding pack
让非构建者也能更稳定地带 buyer 进入产品。

### 至少应包含
- 角色与 section 快速索引
- 常见入口路径
- role-aware 导览
- current workspace / local_lab 边界说明
- 常见 buyer 问题速答

---

## 4.4 Support / escalation pack
Support / escalation 也需要标准化。

### 至少应包含
- 环境分类
- 当前支持边界
- 发生 blocked / not-ready / fail-closed 时如何解释
- 哪类问题归属产品、工程、集成、治理、审计视角
- escalation 路径

---

## 4.5 Objection handling
针对 buyer 常见 objection 形成标准回应。

### 至少覆盖
- “这是不是只是个 demo？”
- “为什么现在不支持更多登录 provider？”
- “为什么 current workspace 还不是 full production closure？”
- “你们是不是只差接客户？”
- “为什么没有更多真实部署证明？”
- “你们的治理能力是否只是 UI 包装？”

### 原则
- 回答必须诚实
- 不能硬夸
- 但也不能把已经成立的价值讲弱

---

## 4.6 Proof pack
在没有 reference customer proof 的前提下，形成一套内部可复用 proof pack。

### 至少应包括
- governed flow 证据包
- audit export 示例
- readiness 示例
- current-workspace mutation 示例
- fail-closed / guardrail 示例
- role-aware control plane 示例

### 目标
用“系统已经成立的事实”而不是“未来承诺”来支撑 buyer 认知。

---

## 4.7 Commercial package skeleton
此阶段建议先形成 package model 骨架，而不是过早锁定价格。

### 至少应明确
- 当前卖的是什么
- 哪些能力属于当前 package
- 哪些能力属于后续深化方向
- support posture
- deployment / maturity boundary

---

## 五、交付物

## 5.1 中文 one-pager
## 5.2 英文 one-pager
## 5.3 15 分钟 demo talk track
## 5.4 30 分钟 buyer deep dive talk track
## 5.5 Admin onboarding pack
## 5.6 Support / escalation pack
## 5.7 Objection handling
## 5.8 Proof pack
## 5.9 Commercial package skeleton

---

## 六、验收标准

### 文档验收
- 中英文 one-pager 均可直接使用
- demo 话术稳定、顺序清楚
- onboarding / support / FAQ / objection handling 口径一致

### 叙事验收
- 非构建者可以稳定讲完 demo
- current workspace / local_lab / preview / production 边界表达清楚
- buyer 不会轻易把系统误判为“只是 demo”或“已 fully production ready”

### 商业化验收
- proof pack 足以支撑没有 reference customer 时的 buyer 讨论
- commercial package skeleton 成形
- 对外表述与当前实现保持一致，不夸大、不失真

---

## 七、完成后的平台变化
本阶段完成后，Lumio 会从：
- “有一组不错的材料”

升级为：
- “有可复用、可复制、可销售支持的标准 field package”
- “有诚实但有力的 buyer-facing 叙事”
- “有更强的 objection handling 与 proof pack”

---

## 八、退出条件
当以下条件全部满足时，可视为 Phase 4 完成：
- field package 已成形
- demo 话术已标准化
- proof pack 已成形
- package model skeleton 已成形
- 对外口径已统一且与当前产品状态一致

---

## 九、2026-03-11 实施更新

本次实现把已有 packaging / demo / onboarding / support 基线收敛成一套标准 field package，并保持所有表述与当前已实现产品一致。

### 新增 field artifacts

- [docs/field/one-pager-zh.md](/Users/lili/Desktop/Agent%20OS/docs/field/one-pager-zh.md)
- [docs/field/one-pager-en.md](/Users/lili/Desktop/Agent%20OS/docs/field/one-pager-en.md)
- [docs/field/demo-15min.md](/Users/lili/Desktop/Agent%20OS/docs/field/demo-15min.md)
- [docs/field/demo-30min.md](/Users/lili/Desktop/Agent%20OS/docs/field/demo-30min.md)
- [docs/field/admin-onboarding-pack.md](/Users/lili/Desktop/Agent%20OS/docs/field/admin-onboarding-pack.md)
- [docs/field/support-escalation-pack.md](/Users/lili/Desktop/Agent%20OS/docs/field/support-escalation-pack.md)
- [docs/field/objection-handling.md](/Users/lili/Desktop/Agent%20OS/docs/field/objection-handling.md)
- [docs/field/proof-pack.md](/Users/lili/Desktop/Agent%20OS/docs/field/proof-pack.md)
- [docs/field/commercial-package-skeleton.md](/Users/lili/Desktop/Agent%20OS/docs/field/commercial-package-skeleton.md)

### Terminology decisions

Field package now standardizes these terms:

- enterprise workspace platform
- governed flow
- OA v1 nine-role model
- `current workspace`
- `local_lab`
- readiness
- audit receipt
- evidence bundle

Preferred product framing:

- Lumio is a governed enterprise workspace preview
- Lumio is an enterprise workspace platform
- Lumio is not a consumer app
- Lumio is not a standalone IAM product

### Maturity framing decisions

All artifacts now use the same honest boundary:

- buyer-facing preview, not full production closure
- current-workspace depth is growing and becoming more credible
- `local_lab` remains sandbox / preview
- no full pilot closure claim
- no provider coverage beyond Okta OIDC
- OA v1 nine roles remain the backbone

### Low-risk alignment updates

- README key-document framing now has a clearer field-package path
- existing docs were treated as source material, while the new `docs/field` set becomes the more coherent field package layer
- no broad in-product rewrite was introduced in this phase

### Validation

- No dedicated markdown lint or doc-build command is currently wired in the repository.
- Validation for this phase was a consistency pass against:
  - README
  - packaging docs
  - demo docs
  - onboarding docs
  - support docs
  - existing buyer-facing shell copy

### Intentionally deferred commercial gaps

- pricing and commercial terms
- reference-customer proof
- full pilot closure claim
- full production deployment closure claim
- broader provider positioning beyond Okta OIDC
- support/process claims beyond the current preview package
