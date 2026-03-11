# Lumi AI 白皮书（Morgan Stanley 定向）v0.2

日期：2026-02-18  
适用对象：Morgan Stanley 业务负责人、技术负责人、风险与合规团队

## 1. 执行摘要

Lumi AI 的定位不是替代 Morgan Stanley 现有基础模型能力，而是作为“银行级 AI 执行与治理层”：
1. 把 AI 从“可演示”推进到“可生产”：可解释、可审计、可灰度、可回滚。
2. 在高价值流程里做端到端自动化：顾问工作流、投研输出流、运营流程流。
3. 在既有工具栈上增量落地：保留人审与合规控制，避免大规模系统替换。

## 2. 市场与客户信号（截至 2026-02-18）

## 2.1 Morgan Stanley 已进入 AI 规模化阶段（事实）
1. 2026-01-15 公布 4Q25 / FY2025：全年净收入 706 亿美元；并继续投入技术能力。  
2. 2024-06-26 发布 AI Debrief：会议记录、摘要、邮件草稿、CRM 回填（Salesforce）。  
3. 2024-10-23 发布 AskResearchGPT：服务投行、销售交易、研究，连接每年 70,000+ 内部研究报告。  
4. 2025 股东信（2025-04）：明确提出将“审慎投资 AI”，追求全公司效率与规模。

## 2.2 Morgan Stanley 的增长焦点（事实）
1. 4Q25 Strategic Update（2026-01-15）明确财富管理方向：另类/私募、税务效率、加密与代币化、家办与 OCIO、Workplace 漏斗增长。  
2. 同一材料强调 Institutional Securities 的 “Technology Initiatives for Scale”。  
3. Morgan Stanley at Work（2025-01-28）强调自动化与规模化，并披露其平台覆盖约 40% 标普 500（美国）。

## 2.3 供应商准入约束（事实）
1. 2024 10-K 披露其网络安全计划对齐 NIST 框架。  
2. 10-K 披露第三方供应商采用风险分级尽调与持续监督；不达标可要求加固或终止合作。  

## 3. Lumi AI 产品定义（对外版）

## 3.1 产品使命
在不牺牲合规与风控的前提下，把复杂业务任务转化为“可执行、可验证、可复盘”的 AI 工作流。

## 3.2 核心能力
1. `Super Agent Orchestration`：单 Agent / 多 Agent 动态路由、任务图编排、失败回退。  
2. `Evidence & Audit`：证据链、执行轨迹、结果出处，支持内审与复核。  
3. `Human-in-the-loop`：高风险动作强制人工确认，不自动误执行。  
4. `Privacy-by-default`：最小化数据暴露，支持本地优先策略。  
5. `Policy Control Plane`：按业务线/风险级别配置不同执行策略与权限边界。  

## 3.3 数字分身优化能力（Digital Twin Optimization / DTOE）
1. `Belief State Twin`：数字分身不是静态画像，而是随证据与结果持续更新的概率状态。  
2. `Bellman + MPC`：在不确定约束下计算下一步最优动作（Next Best Action），并给出风险权衡。  
3. `Outcome Learnback`：通过 `task_confirm/task_cancel/draft_accept/card_click` 回写，持续校准偏好与策略。  
4. `Twin-aware Routing`：在多 Agent 候选中引入 `digital_twin_context/twin_boost`，提升任务匹配度。  
5. `Explainable Tradeoff`：明确“为什么推荐该动作，而不是备选动作”，并显示风险与证据来源。  

## 3.4 银行级落地原则
1. 先做流程增量，不推翻核心系统。  
2. 先做 Shadow / Assist 模式，再扩至半自动/自动。  
3. 先做高价值、可量化场景，再扩跨部门平台化。

## 4. 与 Morgan Stanley 的可行应用案例

## 案例 A（P1）：Wealth Management 顾问效率闭环
场景：
1. 会前准备（客户摘要、持仓与关注点）。  
2. 会中/会后纪要与任务抽取。  
3. 邮件草稿与 CRM 回填前合规检查。  

Lumi 价值：
1. 统一编排“检索-总结-草拟-核对-入库”链路。  
2. 输出保留证据与审计字段。  
3. 高风险内容进入人审闸门。  

KPI（90 天）：
1. 顾问会后处理时长下降 30%+。  
2. CRM 记录完整率提升 20%+。  
3. 合规返工率下降 25%+。  

## 案例 B（P1）：Institutional Securities 研究到客户产出流水线
场景：
1. 研究检索与多文档综合。  
2. 客户定制摘要、引文与邮件草稿。  
3. 输出前事实一致性与引用完整性检查。  

Lumi 价值：
1. 把 AskResearchGPT 的“查与总结”扩展到“可交付流水线”。  
2. 自动生成可追溯引文，减少“黑盒摘要”风险。  
3. 在不改主系统的情况下接入审批流。  

KPI（90 天）：
1. 首次客户响应时间下降 30%+。  
2. 研究到对客产出的端到端周期下降 25%+。  
3. 缺失引用/低质量草稿占比下降 40%+。  

## 案例 C（P1）：AI 供应商准入与持续评测平台（Risk/Compliance）
场景：
1. 新 AI 用例准入前评估。  
2. 上线后回归测试与漂移监控。  
3. 审计报告自动生成。  

Lumi 价值：
1. 将“评测-风险分级-审批-上线-复评”流程标准化。  
2. 对齐 Morgan Stanley 已公开强调的质量与控制思路。  
3. 为模型/供应商变更提供可比较基线。  

KPI（90 天）：
1. 用例准入周期缩短 30%+。  
2. 回归评测覆盖率提升到 90%+。  
3. 审计准备时间下降 40%+。  

## 案例 D（P2）：Morgan Stanley at Work 运营自动化
场景：
1. 工作场景中的政策问答、工单分流、跨系统状态同步。  
2. 高峰时段标准问题自动处置。  

Lumi 价值：
1. 任务路由与自动化规则编排。  
2. 合规窗口（交易限制/黑窗期）强约束。  
3. 审计友好的流程日志。  

KPI（90 天）：
1. 首响时间下降 35%+。  
2. 单工单人工耗时下降 20%+。  
3. 低风险工单自动化解决率提升到 30%+。  

## 案例 E（P2）：财富管理新增长方向辅助（私募/税务效率/代币化）
场景：
1. 顾问在复杂产品沟通中的“结构化提纲 + 风险提示 + 后续动作”。  
2. 面向家办/OCIO 的可解释建议卡。  

Lumi 价值：
1. 场景模板化，减少高复杂沟通成本。  
2. 强制“免责声明/适当性提示/风险标注”生成。  
3. 输出可追踪、可复核。  

KPI（90 天）：
1. 顾问准备时间下降 20%+。  
2. 复杂产品沟通的一次通过率提升 15%+。  
3. 客户跟进转化率提升 10%+。  

## 案例 F（P1）：数字分身驱动的顾问 Next-Best-Action 优化
场景：
1. 顾问面对不同客户类型（风险偏好、沟通风格、资产阶段）时，需要动态调整“下一步建议与表达方式”。  
2. 同一客户在不同市场环境下，策略建议需随最新行为反馈更新，而不是固定模板。  

Lumi 价值：
1. 用 DTOE 将客户交互、执行结果、偏好变化更新为数字分身 Belief State。  
2. 基于 Bellman/MPC 输出“下一步最优动作 + 备选动作 + 风险代价”。  
3. 将推荐结果回写流程，形成“建议 -> 执行 -> 结果 -> 再优化”的闭环。  

KPI（90 天）：
1. Next-Best-Action 采纳率提升 20%+。  
2. 建议后客户有效跟进率提升 15%+。  
3. 相比非分身基线策略，人工改写率下降 25%+。  

## 5. 90 天落地路线（建议）

1. 第 1-2 周：选 1 条 P1 流程，定义数据边界、审批闸门、审计字段与数字分身初始状态字段。  
2. 第 3-6 周：Shadow Mode 并行运行，不触发外发动作。  
3. 第 7-10 周：小范围 Human-in-the-loop 上线，并开启 DTOE 学习闭环。  
4. 第 11-12 周：按 KPI、风险评审和“分身优化增益”决定扩面或迭代。  

## 6. 商务切入策略

1. 先卖“流程结果”而不是“模型能力”：效率、准确性、合规可审计。  
2. 先做“低改造对接”：CRM、研究系统、工单系统与审批流。  
3. 先签“单流程 PoC + 可量化里程碑”，再扩业务线。

## 7. 关键假设与边界

以下为推断，不是 Morgan Stanley 公开承诺：
1. 新项目优先级将偏向可量化降本增效与低集成风险方案。  
2. 采购与风险团队会要求明确的人审点、日志留痕和回滚机制。  
3. 与既有 OpenAI 能力协同（而非替代）更容易进入真实预算流程。  

## 8. 参考资料（官方/一手）

1. Morgan Stanley 4Q25/FY2025（2026-01-15）  
https://www.morganstanley.com/press-releases/morgan-stanley-reports-fourth-quarter-and-full-year-2025  
2. 4Q25 Earnings Release PDF  
https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/4q2025.pdf  
3. 4Q25 Strategic Update PDF  
https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/4q2025-strategic-update.pdf  
4. AI @ Morgan Stanley Debrief（2024-06-26）  
https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch  
5. AskResearchGPT（2024-10-23）  
https://www.morganstanley.com/press-releases/morgan-stanley-research-announces-askresearchgpt  
6. Morgan Stanley at Work 2025 Tech Enhancements（2025-01-28）  
https://www.morganstanley.com/press-releases/morgan-stanley-at-work-tech-enhancements-for-2025  
7. 2025 Shareholder Letter（2025-04）  
https://www.morganstanley.com/content/dam/msdotcom/en/about-us-2025ams/2025_Shareholder_Letter.pdf  
8. 2024 Form 10-K（截至 2026-02-18 官方可得最新年报）  
https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/10k2024/10k1224.pdf  
9. OpenAI × Morgan Stanley 案例  
https://openai.com/index/morgan-stanley/
