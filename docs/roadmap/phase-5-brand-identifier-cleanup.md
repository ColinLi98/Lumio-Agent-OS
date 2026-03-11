# Phase 5 — Brand / Identifier Cleanup

## 阶段定位
本阶段不是当前主线，而是一个需要后置执行的收口动作。

目标是把产品名 **Lumio** 与技术标识 / 部署标识 `lumi-agent-simulator` 做出更清晰的内外分层，但不把这项工作和前面的产品能力推进绑在一起。

## 为什么排在最后
当前更值钱的事情仍是：
- current workspace 更真
- control plane 更厚
- field package 更标准

品牌和技术标识的收口会影响感知，但不会直接提升产品的 current-workspace 深度、admin operational depth 或 buyer proof。  
因此这项工作应后置执行。

---

## 一、阶段目标
本阶段要做到三件事：

1. 对外统一使用 **Lumio**
2. 对内保留必要的技术标识过渡空间
3. 为未来的 URL / metadata / repo-facing cleanup 准备一套低风险迁移方案

---

## 二、范围

## 范围内
- buyer-facing surface 标识排查
- 对外名称策略
- 内外命名边界
- 技术标识暴露点梳理
- rename / alias / metadata cleanup 计划
- 低风险迁移步骤设计

## 不在范围内
- 不与当前产品能力迭代捆绑发布
- 不立即大规模重命名 repo / deployment / infra 资源
- 不影响当前 preview 的可用性
- 不把品牌迁移当当前里程碑 blocker

---

## 三、问题定义

### 问题 1：产品名已收口为 Lumio，但技术标识仍然外露
内部可以接受，但对外会显得不够干净，尤其在 buyer-facing surface 中会削弱产品完整度。

### 问题 2：如果重命名动作过早，会打断主线推进
当前产品能力、current workspace 深度与商业化包装仍在推进中。  
如果此时拉起大规模重命名，容易浪费工程资源并引入不必要风险。

### 问题 3：需要区分“现在要清理什么”与“以后再迁什么”
不是所有技术标识都必须立即消失。  
重点是先清理 buyer-facing 泄露点，再规划后续更深层的迁移。

---

## 四、目标状态设计

## 4.1 外部命名策略
对外统一使用：
- Lumio
- Lumio enterprise workspace platform
- Lumio governed workspace preview

避免在 buyer-facing 文案、演示、截图、导航显著位置暴露 `lumi-agent-simulator`。

---

## 4.2 内外命名边界
需要明确：
- 什么是内部技术标识
- 什么是外部产品标识
- 哪些 surface 必须使用 Lumio
- 哪些 surface 可以暂时保留技术名或 alias

---

## 4.3 暴露点盘点
需要系统盘点以下暴露点：
- URL
- 页面 title
- metadata
- favicons / app names
- 文档标题
- demo 截图
- error 文案
- 环境标识
- 浏览器标签
- telemetry / support 输出中可能被 buyer 看见的字符串

---

## 4.4 低风险迁移方案
重命名不应该以“全量替换”为前提。

### 应采用的策略
- external-facing first
- alias before hard cut
- docs / demo / metadata cleanup first
- infra / repo / deployment rename later
- 对可能影响现网 deep link 或内部流程的字符串做兼容期

---

## 五、交付物

## 5.1 Buyer-facing exposure inventory
一份面向对外 surface 的暴露点清单。

## 5.2 Naming policy
明确：
- 外部用什么
- 内部用什么
- 哪些地方强制外部命名
- 哪些地方允许内部技术名暂存

## 5.3 Cleanup plan
分阶段描述：
- 短期清理
- 中期 alias / metadata 统一
- 长期技术标识迁移

## 5.4 Risk / rollback notes
说明哪些改动可能影响：
- deep link
- preview 路径
- 文档引用
- 现有内部协作流程

---

## 六、验收标准

### 外部一致性验收
- buyer-facing 主要 surface 不再泄露 `lumi-agent-simulator`
- 产品名 Lumio 使用一致

### 风险控制验收
- 不影响当前 preview 的使用
- 不破坏现有深链路
- 不引入不必要的发布风险

### 规划验收
- 已形成明确的命名策略
- 已形成分阶段 cleanup 计划
- 已明确哪些内容先做、哪些后做

---

## 七、完成后的平台变化
本阶段完成后，Lumio 会从：
- “产品名已收口，但技术标识仍会外露”

升级为：
- “对外命名更干净”
- “内部与外部命名边界更清楚”
- “未来更深层迁移已有低风险计划”

---

## 八、退出条件
当以下条件全部满足时，可视为 Phase 5 完成：
- buyer-facing 暴露点已盘点
- 命名策略已定
- 主要对外 surface 已清理
- 后续迁移计划已明确

---

## 九、2026-03-11 实施更新

本次实现遵循低风险 staged cleanup 原则：

- 先清理 buyer-facing 命名
- 保留 preview URL / deep link / package id / env var / callback URL 不变
- 给内部技术命名保留过渡空间

### 新增文档

- [docs/branding/buyer-facing-exposure-inventory.md](/Users/lili/Desktop/Agent%20OS/docs/branding/buyer-facing-exposure-inventory.md)
- [docs/branding/naming-policy.md](/Users/lili/Desktop/Agent%20OS/docs/branding/naming-policy.md)
- [docs/branding/brand-identifier-cleanup.md](/Users/lili/Desktop/Agent%20OS/docs/branding/brand-identifier-cleanup.md)

### 本阶段已清理的 buyer-facing surfaces

- browser tab / app title 统一为 `Lumio Enterprise Workspace Platform`
- visible branding subtitle 不再使用 `B-End Platform`
- buyer-facing UI copy 中的 `B-end` 关键表述已收敛为：
  - `enterprise workspace platform`
  - `governed enterprise workspace preview`
- README 中的 preview 文案与 link label 更干净，但保留工作中的 preview URL
- externally shared docs 的 rendered headings 改为 Lumio-first naming，同时保留技术文件名不变

### 本阶段明确 defer 的 technical surfaces

- `package.json` package name
- preview hostname
- callback URLs
- env vars
- internal scripts
- `.codex` environment labels
- internal `lumi-agent-simulator` references

### 风险控制

本阶段明确避免了这些风险：

- 不做 repository-wide rename
- 不改 preview routes
- 不改 deep links
- 不改 package ids
- 不改 env vars
- 不改 callback URLs

### 下一阶段建议

- short-term:
  - keep buyer-facing naming stable on Lumio-first wording
- mid-term:
  - add alias guidance around older doc families and reduce raw hostname visibility in shareable collateral
- long-term:
  - only evaluate hostname/package/internal-id migration in a dedicated compatibility-aware slice
