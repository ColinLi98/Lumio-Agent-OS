# PRD_AI_Readable_Lumi_Android_V0.1

**Product**: Lumi  
**Platform**: Android (Primary)  
**Form Factor**: IME Keyboard + Command Center App  
**Version**: V0.1 (Agent-Core First)  
**Owner**: Lumi Team  
**Audience**: Engineering Agent(s), Android engineers, backend engineer (optional)  
**Language**: Chinese / AI-readable with strict specs

---

## 1. 目标与范围 (Goal & Scope)

### 1.1 产品目标
在 Android 上构建一个“超级 Agent”，并将其**集成在键盘（IME）中**。用户在任意 App 的输入框里通过 Lumi 键盘进入 **Agent Mode**，输入命令，得到：
- **Drafts（嘴替草稿）**
- **Cards（服务卡片：跳转/内嵌 WebView）**
- **PrivacyAction（隐私掩码/填充建议）**
- **Error（安全错误提示）**

补充目标：
- 构建用户本地“数字分身（DigitalSoul）”，作为长期偏好与风险参数的载体
- 基于 **马尔可夫决策过程（MDP）/Bellman 方程** 输出最优行动路径
- 选择 IME 作为载体，确保数据留在本地、降低 GDPR/合规风险

### 1.2 开发顺序（强制）
1) **先构建 Agent Core**：可独立运行、可单测、与键盘无关  
2) **再集成到键盘（IME）**：IME 只负责 UI/状态机/输入路由/提交  
3) **最后完善 Command Center**：设置、宪法、授权、Debug Console

---

## 2. 硬性约束 (Non-negotiable)

### R1. 绝对禁止误发 (No Mis-send)
- 在 **Agent Mode** 下，用户输入的命令**不得自动提交**到宿主 App 输入框
- 只有用户明确动作才允许提交：
  - 点击某条 Draft
  - 点击“确认发送”按钮（如实现）

### R2. 本地优先与隐私 (Local-first Privacy)
- 默认不上传原始聊天内容/输入内容
- 仅在以下条件同时满足时允许联网：
  - 处于 Agent Mode
  - 意图需要在线服务
  - policy 允许
- 联网仅发送：**意图 + 约束**，不发送聊天历史/明文上下文

### R3. Agent Core 必须独立
- Agent Core 必须是独立 Kotlin 模块，可在不依赖 IME 的情况下运行与测试
- IME 与 Agent Core 的唯一耦合点为稳定接口：
  - `LumiAgent.handle(input) -> output`

### R4. 性能
- 普通打字路径不得调用网络/大模型/重计算
- Agent 处理必须异步，不阻塞 IME UI 线程

### R5. V0.1 禁止 Accessibility/RPA
- 第一版不实现 AccessibilityService 自动点击/自动填表（默认 OFF、后续版本再评估）

### R6. Sensitive App Blacklist（Shield）
- Agent Policy Engine 必须检测前台 App 的 packageName
- 若命中黑名单（银行、密码管理器、企业安全类 App），Agent **必须严格禁用**
- UI 必须明确提示 **“Shield Up”**

### R7. Data Expiration（TTL）
- OCR 缓存与聊天上下文缓存必须设置 TTL
- 默认 TTL = 24 小时，到期后自动清理

### R8. Bellman 优化决策（MDP）
- core-agent 内必须实现 Bellman/MDP 决策引擎
- 输入：DigitalSoul + Intent + 可选项集合
- 输出：最优行动路径（策略）+ 推荐理由（仅本地）

---

## 3. 用户体验定义 (UX Spec)

### 3.1 两种模式
**Typing Mode（默认）**
- 正常输入法表现，不触发 Agent 流程

**Agent Mode（命令行）**
- 触发：长按空格 >= 0.5s（可调）
- UI：键盘背景变色 + 显示提示 `Lumi > _`
- 输入在 Agent Mode 下被 Lumi 捕获，不直接进入宿主 App

### 3.2 输出呈现
Agent 输出必须被渲染在键盘候选区/扩展区：
- Drafts：3 个可点选草稿（点击后才 commitText）
- Cards：2–5 个服务卡片（点击打开 WebView/DeepLink）
- PrivacyAction：弹出确认（确认后填入 mask）
- Error：显示安全错误提示，不崩溃

---

## 4. 功能范围 (Functional Specs V0.1)

### 4.1 意图类别 (Intent Categories)
必须实现以下类别（含 confidence）：
- `REWRITE`（润色/改写/语气）
- `SHOPPING`（购买/比价/预算）
- `TRAVEL`（机票/酒店/出行）
- `CALENDAR`（约人/排期/提醒）
- `PRIVACY_MASK`（手机号/地址/证件）
- `UNKNOWN`

### 4.2 REWRITE（Drafts）
输入：`不想加班` 或 `帮我委婉拒绝加班`  
输出：3 条草稿，按 DigitalSoul 的沟通风格生成（MVP 可用模板）

### 4.3 Cards（服务卡片）
输入：`买降噪耳机 预算2000`  
输出：2–5 张卡片（MVP 可先 mock URL；后续接 cloud dispatcher）

### 4.4 Privacy Mask（隐私动作）
触发条件：
- 输入框 hints / inputType 指示 phone/address/id
- 或用户命令包含 “填隐私号/模糊地址/身份证”
输出：PrivacyAction，必须二次确认后才能填入

### 4.5 Command Center（最小版）
必须包含：
- Debug Console：输入命令 -> 调 agent.handle -> 展示结果
- Constitution & Policy：简易设置（privacy level、tone、allowedServices）

### 4.6 DigitalSoul 快速建模（30 秒冷启动 + 被动学习）
**冷启动问卷（最多 3 题）**
- 表达风格：Professional / Friendly / Concise / Humorous
- 消费倾向：Price-first / Balanced / Quality-first
- 隐私偏好：Strict / Balanced / Open

**初始化映射**
- communicationStyle = 选择的表达风格
- valuesProfile.priceVsQuality = -50 / 0 / +50
- privacyLevel = Strict / Balanced / Open
- riskTolerance 初始 50

**被动学习事件（仅本地，不含明文）**
- draft_accept, draft_edit, card_click, card_dismiss, query_refine, confirm_send

**更新规则（EMA）**
- 对目标字段进行 EMA 更新：new = old * 0.9 + signal * 0.1
- draft_accept => communicationStyle 权重提升
- draft_edit => communicationStyle 权重下降 + 语气偏移
- card_click => 兴趣标签/预算偏好权重提升
- query_refine => 不确定性上升（促使后续追问）

**周期合并**
- 每日/每周批处理合并信号，避免实时开销

### 4.7 通用发散思维（Domain-Agnostic）
- 不局限于餐饮/购物/旅行等固定场景
- 统一扩展维度：目标、时间、预算、地点、参与人、风险、备选方案、执行步骤
- 缺失关键维度时优先追问或补齐再给最优解

---

## 5. 不在范围内 (Out of Scope V0.1)
- 端侧大模型推理（可后续接入）
- 云端向量数据库（V0.1 使用本地轻量向量检索）
- Accessibility 自动化
- iOS 版本

---

## 6. 技术架构要求 (Engineering Architecture)

### 6.1 模块划分（必须）
- `core-domain`（Kotlin）：数据模型 & 接口
- `core-agent`（Kotlin）：Agent 实现（规则/模板/策略 + Bellman 决策引擎 + 轻量本地向量检索）
- `app-command-center`（Android）：设置 + Debug Console
- `ime-keyboard`（Android）：InputMethodService + 状态机 + 渲染

### 6.2 稳定接口（必须保持不变）
`interface LumiAgent { suspend fun handle(input: AgentInput): AgentOutput }`

### 6.3 数据契约（Required Data Contracts）
**AgentInput**
- rawText: String
- mode: InputMode { TYPE, AGENT }
- appContext: AppContext? (packageName, fieldHints, isPasswordField)
- selectionText: String?
- timestampMs: Long

**AgentOutput（sealed）**
- Drafts(drafts: List<TextDraft>)
- Cards(cards: List<ServiceCard>)
- Privacy(action: PrivacyAction)
- Error(message: String)

**IntentResult**
- category: IntentCategory { REWRITE, SHOPPING, TRAVEL, DINING, CALENDAR, PRIVACY_MASK, UNKNOWN }
- confidence: Double
- query: String
- entities: Map<String,String>
- constraints: Map<String,String>
- privacyFlags: Set<PrivacyFlag { PHONE, ID_CARD, ADDRESS, BANK, PASSWORD }>

**DigitalSoul / PolicyConfig**
- DigitalSoul(communicationStyle, riskTolerance, spendingLogic, privacyLevel, uarStats?)
- DigitalSoul 必须支持动态更新：记录草稿 UAR（接受率）与用户编辑 diff，作为负反馈调整参数（仅本地）
- PolicyConfig(allowNetworkInAgentMode, requireConfirmBeforeSend, allowedServices:Set<String>, budgetCapCny:Int?)

**ServiceCard**
- id, title, subtitle, actionType(WEBVIEW/DEEPLINK/SHARE), actionUri, payload(Map)

### 6.4 Storage & Data Lifecycle
- 本地加密存储必须使用 SQLCipher（或同等级加密库）
- 加密 key 优先派生自系统锁屏凭证；若不可用则使用用户 PIN
- OCR 缓存与聊天上下文缓存默认 TTL = 24 小时
- Personal Knowledge Graph 必须支持标准化导出：JSON + Markdown

### 6.5 Bellman 决策引擎（MDP）
- 状态：是否具备偏好、是否有候选、候选匹配度
- 行动：补充偏好 / 拓展搜索 / 推荐最优 / 给出备选
- 输出：策略路径 + 价值评分
- 与 DigitalSoul 绑定（风险偏好、隐私偏好）

---

## 7. Telemetry（隐私安全）
仅允许记录不含明文的事件：
- agent_mode_enter
- intent_category_detected
- agent_latency_ms
- cards_shown / card_clicked
- drafts_shown / draft_committed
- privacy_prompt_shown / privacy_mask_filled
- error_code

禁止：记录 rawText / selectionText 明文。

---

## 8. 验收标准 (Acceptance Criteria)

### AC1. No Mis-send
在任意 App 输入框（微信/浏览器/备忘录）：
- 进入 Agent Mode
- 输入命令
- 按回车
- 宿主输入框不得出现该命令
- 仅点击 Draft 或确认发送后才会提交

### AC2. 核心意图可用
- “帮我委婉拒绝加班” => Drafts(3)
- “买降噪耳机 2000” => Cards(>=2)
- “下周五去北京机票 1500” => Cards(>=2)
- phone field => PrivacyAction

### AC3. 离线可用
开启飞行模式：
- REWRITE 仍可输出 Drafts（本地）
- Cards 返回离线提示（Error），不崩溃

### AC4. 单元测试
- core-agent 至少 30 个单测，覆盖意图识别/实体抽取/策略/输出类型

---

## 9. 交付物 (Deliverables)
- 可编译的多模块 Android 工程（项目名 Lumi）
- Agent Core（规则/模板版）+ 单测
- Command Center Debug Console
- IME：Agent Mode + 输出渲染 + No Mis-send
- 文档：architecture/security/privacy rules

---

## 10. 里程碑建议 (Milestones)
M1：Agent Core + tests  
M2：Command Center Debug Console  
M3：IME 集成 + No Mis-send 真机验收
