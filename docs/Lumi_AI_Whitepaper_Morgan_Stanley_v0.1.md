# Lumi AI 白皮书（Morgan Stanley 定向版）v0.1

更新时间：2026-02-18  
作者：Lumi Team（草案）

## 1. 执行摘要

Morgan Stanley 已从“AI 试点期”进入“规模化生产期”。从 2024 到 2026 年的公开信息显示，其重点是：  
1. 在全公司范围内用 AI 提升效率和规模。  
2. 将 AI 深度嵌入财富管理、投研投行、CRM 与风险流程。  
3. 在扩大技术投入的同时，保持严格的风控、供应商治理和合规约束。  

Lumi AI 的机会不应定位为“替换 Morgan Stanley 的基础模型能力”，而应定位为：
1. 银行级 AI 工作流与多 Agent 编排层。  
2. 以本地优先与可解释审计为核心的控制层。  
3. 面向高价值业务流程（财富顾问、机构业务、运营与合规）的增量效率平台。  

## 2. Morgan Stanley 的战略信号（事实）

## 2.1 已明确持续投入 AI 与基础设施
1. 2025 股东信（发布于 2025 年）明确提出将“审慎投资人工智能”，并强调在全公司获得“效率和规模”。  
2. 2025 年四季度/全年财报（2026-01-15）披露非薪酬费用增加的重要原因之一是更高的技术投入。  

## 2.2 已有成熟 AI 应用，且采用率高
1. Wealth Management 在 2024-06-26 发布 AI Debrief，支持会议记录、摘要、后续邮件草拟并写入 CRM（Salesforce）；同文披露 Assistant 已被 98% 顾问团队采用。  
2. Institutional Securities 在 2024-10-23 发布 AskResearchGPT，覆盖投行、销售交易、研究条线，并基于每年 70,000+ 份内部研究报告语料。  
3. OpenAI 官方案例页（2026 年可访问版本）披露：Morgan Stanley 通过评测体系驱动 AI 迭代，并持续强调质量、可靠性与控制。  

## 2.3 业务增长方向与场景边界更清晰
1. 4Q25 Strategic Update（2026-01-15 文件）在财富管理部分强调未来机会：另类/私募市场、税务效率、加密与代币化、家族办公室与 OCIO、Workplace 漏斗转化。  
2. 同一材料在机构业务部分强调“Technology Initiatives for Scale”，并将研究、融资、分销、风险管理等链路放在同一集成投行语境下。  
3. Morgan Stanley at Work（2025-01-28）显示其平台服务约 40% 的标普 500 企业，说明 Workplace 场景具有大规模、标准化、可复制的自动化机会。  

## 2.4 供应商与风控要求明确
1. 2024 年 10-K 披露了第三方风险治理与网络安全最小标准：第三方需通过基于风险的持续监督，必要时需增加安全措施或终止合作。  
2. 同文披露网络安全计划与 NIST 框架对齐，并包含第三方安全审计与持续测试机制。  

## 3. 对 Morgan Stanley 需求的推断（基于上述事实）

以下为推断，不是 Morgan Stanley 公开承诺：

1. 他们短期更需要“可控扩展层”而非“新模型供应商”。  
2. 采购决策会偏向能快速对接现有 CRM、研究、执行与风控系统的方案。  
3. 最容易通过预算审批的项目是：可量化降本增效、可审计、可灰度、可快速回滚。  
4. 在已有 OpenAI 深度合作的背景下，Lumi 更适合切入“编排、评测、治理、流程自动化”而不是“替代其现有 Assistant/Debrief”。  

## 4. Lumi AI 可提供的差异化能力（结合现有产品定义）

结合你们现有 PRD（2026-01-25、2026-02-15 版本）可对外提炼为：

1. 本地优先与隐私优先：默认不上传原始文本，强调最小化数据暴露。  
2. No Mis-send 与强制确认：高风险动作需要人工确认，降低误触发与误执行风险。  
3. Super Agent + Skills 编排：支持单 Agent 到多 Agent 升级路由、失败回退、任务轨迹可解释。  
4. 证据与审计导向：保留执行链路、证据链、结果可追踪，利于合规与内审。  
5. 分层治理能力：支持从输入到决策的多层策略控制，适合银行“分业务线、分风险级别”部署。  

## 5. Morgan Stanley 机会地图（优先级）

| 优先级 | 业务领域 | 可切入场景 | Lumi 可交付能力 | 业务价值/KPI |
|---|---|---|---|---|
| P1 | Wealth Management | 顾问会前准备 + 会后纪要 + CRM 回填 + 合规检查 | 多 Agent 流程编排、模板化输出、人工确认闸门、审计日志 | 每次会后处理时长下降；CRM 完整度提升；合规返工率下降 |
| P1 | Institutional Securities（IBD/S&T/Research） | 研究检索后的“客户化产出链路”自动化 | Research 摘要-引用-草稿-审批流水线；证据可回溯 | 客户响应时间缩短；分析师/销售覆盖效率提升 |
| P1 | 风控/合规/供应商管理 | 第三方 AI 工具准入评测与持续监控 | 评测框架、回归测试、风险分级、审计导出 | 模型与供应商审查周期缩短；审计通过率提升 |
| P2 | Morgan Stanley at Work | 大规模参与者服务与运营自动化（工单、政策问答、流程分流） | 高并发任务路由、可控知识检索、低风险自动处置 | 单工单成本下降；首响与结案时长优化 |
| P2 | 财富管理新增长方向 | 另类资产/税务效率/私募产品的顾问辅助工作台 | 结构化问答 + 场景策略卡 + 人工复核链路 | 产品渗透率与顾问转化效率提升 |
| P3 | 跨部门平台化 | “统一 Agent 治理层”覆盖不同条线 | 权限域隔离、策略引擎、统一观测指标 | 统一治理，减少重复建设 |

## 6. 建议的 90 天 PoC 路线

## 6.1 第 0-2 周：范围与控制面定义
1. 选 1 条高价值流程（建议从 WM 或 Institutional Research 二选一）。  
2. 定义不可妥协红线：数据边界、人工确认点、审计字段、回滚策略。  
3. 建立评测集：准确率、引用完整性、合规错误率、人工修改率。  

## 6.2 第 3-6 周：灰度上线（Shadow Mode）
1. 在不影响生产系统的前提下并行运行。  
2. 输出仅供内部对比，不直接触发外发动作。  
3. 每周复盘：命中率、误报率、失败模式、流程瓶颈。  

## 6.3 第 7-10 周：有限生产（Human-in-the-loop）
1. 开放给小范围团队使用，强制人工审批。  
2. 接入 CRM/研究/工单等核心系统的最小闭环。  
3. 记录完整审计轨迹与版本变更。  

## 6.4 第 11-12 周：业务评估与扩面决策
1. 是否达到预设 KPI 门槛。  
2. 是否满足安全、合规、供应商治理要求。  
3. 决定进入下一业务线，或迭代当前流程。  

## 7. 商务切入建议（对外话术）

1. 定位语：Lumi 不是替代现有 AI，而是让现有 AI 在银行级流程中“可控、可审计、可规模化”。  
2. 价值语：在不改动核心系统的情况下，把顾问、研究、运营流程的 AI 产出从“可用”提升到“可生产”。  
3. 风险语：所有高风险动作保留人工确认，所有输出保留证据链与回滚路径。  
4. 交付语：先做 90 天单流程 PoC，用硬指标证明价值，再扩展到第二条线。  

## 8. 下一版可补充内容

1. 针对 Morgan Stanley 单一条线（例如 WM）输出英文版 one-pager。  
2. 增加 ROI 计算器（按 FTE 时长节约、返工率、合规缺陷成本测算）。  
3. 增加“与现有 OpenAI 能力协同，而非冲突”的技术架构图。  

## 9. 参考资料（外部）

1. Morgan Stanley 4Q25 Earnings Release (2026-01-15): https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/4q2025.pdf  
2. Morgan Stanley 4Q25 Strategic Update (2026-01-15): https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/4q2025-strategic-update.pdf  
3. 2025 Shareholder Letter（2025 年年会材料）: https://www.morganstanley.com/content/dam/msdotcom/en/about-us-2025ams/2025_Shareholder_Letter.pdf  
4. 2024 Form 10-K: https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/10k2024/10k1224.pdf  
5. AI @ Morgan Stanley Debrief 发布（2024-06-26）: https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch  
6. AskResearchGPT 发布（2024-10-23）: https://www.morganstanley.com/press-releases/morgan-stanley-research-announces-askresearchgpt  
7. Morgan Stanley at Work 2025 技术升级（2025-01-28）: https://www.morganstanley.com/press-releases/morgan-stanley-at-work-tech-enhancements-for-2025  
8. OpenAI 客户案例（Morgan Stanley）: https://openai.com/index/morgan-stanley/  
9. Morgan Stanley Reports Fourth Quarter and Full Year 2025（公告页）: https://www.morganstanley.com/press-releases/morgan-stanley-reports-fourth-quarter-and-full-year-2025  

## 10. 参考资料（内部）

1. /Users/apple/Lumi Agent Simulator/docs/lumi-prd-v1.md  
2. /Users/apple/Lumi Agent Simulator/产品需求文档/PRD_Lumi_Four_Layer_Agent_Architecture_V1.0.md  
3. /Users/apple/Lumi Agent Simulator/产品需求文档/PRD_Lumi_智能输入面板_V1.0.md  
