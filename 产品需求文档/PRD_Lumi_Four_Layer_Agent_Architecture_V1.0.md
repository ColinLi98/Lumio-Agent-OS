# PRD: Lumi 四层 Agent 架构

**Product**: Lumi  
**Module**: Multi-Layer Agent System  
**Version**: V1.0  
**Owner**: Lumi Team  
**Date**: 2026-01-25  
**Status**: ✅ 已实现

---

## 1. 概述 (Overview)

### 1.1 设计理念

Lumi 采用分层 Agent 架构，实现从实时输入感知到有温度的决策建议的完整链路。每一层有明确的职责边界，数据单向流动，确保隐私优先和低延迟响应。

### 1.2 架构图

```
用户输入: "我想辞职创业"
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Keyboard Sentinel               │
│                       (键盘哨兵)                             │
│  • 实时意图检测 (<150ms)                                     │
│  • 隐私风险识别与脱敏                                        │
│  • 本地处理，不联网                                          │
│  输出: IntentVector + PrivacyAlert                          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: Soul Architect                  │
│                       (灵魂建筑师)                           │
│  • 构建高保真数字孪生 (SoulMatrix)                           │
│  • 渐进式学习：意图 + 交互 + 游戏选择                        │
│  • 时间衰减：区分短期状态与长期特质                          │
│  输出: SoulMatrix (人格/价值观/当前状态)                     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: Destiny Engine                  │
│                       (命运推演师)                           │
│  • 基于贝尔曼方程的决策模拟                                  │
│  • 多路径期望价值计算                                        │
│  • J-Curve 分析（痛苦期预测）                                │
│  输出: DecisionImpactReport                                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Layer 4: Personal Navigator               │
│                       (个人导航员)                           │
│  • 高情商沟通，不是冷冰冰的机器人                            │
│  • 信号灯系统（🟢🟡🛑）                                      │
│  • 根据用户压力调整语气                                      │
│  输出: 有温度的、可操作的建议                                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
      用户看到的回复
```

### 1.3 设计原则

| 原则 | 描述 |
|-----|------|
| **隐私优先** | Layer 1/2 完全本地处理，敏感数据不出设备 |
| **低延迟** | Layer 1 < 150ms，整体链路 < 1s |
| **单向数据流** | 数据从 L1 → L2 → L3 → L4，无反向依赖 |
| **渐进增强** | 每层可独立运行，高层依赖低层但低层不依赖高层 |
| **有温度** | 最终输出必须像人，不是数据报表 |

---

## 2. Layer 1: Keyboard Sentinel (键盘哨兵)

### 2.1 职责

| 职责 | 描述 |
|-----|------|
| 意图检测 | 识别用户输入中的高价值意图（购买/旅行/职业/健康/财务） |
| 隐私保护 | 检测并脱敏 PII（身份证/手机号/银行卡/密码） |
| Agent 触发 | 识别 `/` 开头的命令或唤醒词 |
| 静默观察 | 普通输入不干扰，仅记录元数据 |

### 2.2 输入/输出

```typescript
// 输入
type SentinelInput = string; // 原始输入文本

// 输出
interface SentinelOutput {
  intent?: {
    type: IntentType;      // 'career' | 'finance' | 'travel' | ...
    confidence: number;    // 0-1
    urgency: 'low' | 'medium' | 'high';
    params: Record<string, any>;
  };
  privacy?: {
    risk: PrivacyRiskType; // 'ID_CARD' | 'PHONE' | 'BANK_CARD' | ...
    action: 'mask' | 'warn' | 'block';
    maskedPreview: string;
  };
  agentTrigger?: {
    type: 'command' | 'wake_word';
    command: string;
  };
  meta: {
    processingMs: number;
    shouldEscalate: boolean;
  };
}
```

### 2.3 意图类型定义

```typescript
enum IntentType {
  // 高价值意图（触发命运模拟）
  PURCHASE = 'purchase',   // 购买决策
  TRAVEL = 'travel',       // 旅行规划
  CAREER = 'career',       // 职业变动
  HEALTH = 'health',       // 健康相关
  FINANCE = 'finance',     // 财务决策
  
  // 信息意图
  SCHEDULE = 'schedule',   // 日程安排
  QUERY = 'query',         // 信息查询
  TRANSLATE = 'translate', // 翻译
  CALCULATE = 'calculate', // 计算
  
  NONE = 'none'
}
```

### 2.4 隐私风险类型

```typescript
enum PrivacyRiskType {
  ID_CARD = 'ID_CARD',       // 身份证号
  PHONE = 'PHONE',           // 手机号
  BANK_CARD = 'BANK_CARD',   // 银行卡号
  EMAIL = 'EMAIL',           // 邮箱
  PASSWORD = 'PASSWORD',     // 密码
  ADDRESS = 'ADDRESS',       // 地址
  NAME_CONTEXT = 'NAME_CONTEXT' // 姓名上下文
}
```

### 2.5 性能约束

| 指标 | 要求 |
|-----|------|
| 处理延迟 | < 150ms |
| 内存占用 | < 5MB |
| 无网络依赖 | ✅ 必须 |
| 不存储原文 | ✅ 必须 |

### 2.6 实现文件

| 文件 | 说明 |
|-----|------|
| `prompts/keyboardSentinel.ts` | Prompt 定义与类型 |
| `services/keyboardSentinelService.ts` | 核心检测逻辑 |
| `components/SentinelIndicator.tsx` | UI 显示组件 |

---

## 3. Layer 2: Soul Architect (灵魂建筑师)

### 3.1 职责

| 职责 | 描述 |
|-----|------|
| 画像构建 | 基于碎片化行为数据合成高保真数字孪生 |
| 渐进学习 | 从意图/交互/游戏选择中推断特质 |
| 时间感知 | 区分短期状态（压力）和长期特质（人格） |
| 一致性维护 | 确保画像演变平滑，避免剧烈跳变 |

### 3.2 数据来源

```typescript
// 1. 来自 Layer 1 的意图流
interface SentinelIntent {
  type: IntentType;
  timestamp: number;
  params: Record<string, any>;
}

// 2. 用户交互日志
interface InteractionLog {
  type: 'draft_accept' | 'draft_reject' | 'card_click' | 'query_refine';
  timestamp: number;
  metadata: Record<string, any>;
}

// 3. 游戏选择（来自 Project Origin 等）
interface GameChoice {
  scenario: string;
  choice: string;
  timestamp: number;
}

// 4. 显式偏好设置
interface ExplicitPreference {
  key: string;
  value: any;
  source: 'user_input' | 'onboarding';
}
```

### 3.3 SoulMatrix 输出

```typescript
interface SoulMatrix {
  userId: string;
  version: number;
  lastUpdated: number;
  confidenceScore: number;  // 画像可信度 0-1
  
  // 人格特质 (Big Five 改进版)
  personality: {
    openness: number;           // 开放性 0-1
    conscientiousness: number;  // 尽责性 0-1
    extraversion: number;       // 外向性 0-1
    agreeableness: number;      // 宜人性 0-1
    neuroticism: number;        // 神经质 0-1
    
    // Lumi 扩展特质
    riskTolerance: 'low' | 'medium' | 'high';
    decisionStyle: 'intuitive' | 'analytical' | 'hesitant' | 'impulsive';
    communicationStyle: 'direct' | 'diplomatic' | 'reserved' | 'expressive';
  };
  
  // 价值观排序
  values: Array<{
    type: ValueType;  // 'achievement' | 'security' | 'freedom' | ...
    weight: number;   // 0-1
    evidence: string[];
  }>;
  
  // 当前状态（短期，会衰减）
  currentState: {
    stressLevel: number;        // 0-100
    energyLevel: number;        // 0-100
    financialHealth: 'crisis' | 'stressed' | 'stable' | 'comfortable' | 'abundant';
    emotionalState: string;     // 'anxious' | 'excited' | 'calm' | ...
    focusArea: string;          // 当前关注领域
  };
  
  // 行为模式
  behaviorPatterns: {
    peakActivityHours: number[];  // 活跃时段
    averageResponseLatency: number;
    preferredContentLength: 'short' | 'medium' | 'detailed';
    decisionSpeed: number;        // 决策速度 0-100
  };
  
  // 兴趣图谱
  interests: Array<{
    topic: string;
    intensity: number;
    lastMentioned: number;
  }>;
  
  // 目标追踪
  goals: Array<{
    description: string;
    priority: number;
    progress: number;
    deadline?: number;
  }>;
}
```

### 3.4 推断规则

| 数据信号 | 推断结论 |
|---------|---------|
| 频繁深夜活跃 | `chronotype: 'night_owl'` |
| 每日查看航班但不购买 | `priceSensitivity: 'high'`, `decisionStyle: 'hesitant'` |
| 快速接受草稿建议 | `decisionStyle: 'intuitive'` |
| 游戏中选择"高风险投资" | `riskTolerance: 'high'` |
| 游戏中选择"复仇" | `conflictStyle: 'confrontational'` |
| 连续3天压力相关输入 | `stressLevel: +20` |

### 3.5 时间衰减

```typescript
// 状态类字段（快速变化）- 每24小时衰减向基准回归
currentState.stressLevel = baselineStress + (currentStress - baselineStress) * 0.9^days

// 特质类字段（稳定）- 仅在强信号下调整
personality.riskTolerance = 需要多次一致信号才会改变
```

### 3.6 实现文件

| 文件 | 说明 |
|-----|------|
| `prompts/soulArchitect.ts` | Prompt 定义与 SoulMatrix 类型 |
| `services/soulArchitectService.ts` | 核心推断逻辑 |

---

## 4. Layer 3: Destiny Engine (命运推演师)

### 4.1 职责

| 职责 | 描述 |
|-----|------|
| 决策模拟 | 基于贝尔曼方程模拟多条未来路径 |
| 概率估算 | 结合统计数据和用户画像估算成功率 |
| J-Curve 分析 | 预测"痛苦期"深度和持续时间 |
| 期望价值计算 | EV = Σ(P_i × V_i)，考虑时间折扣 |

### 4.2 贝尔曼最优性方程

```
V*(s) = max_a [ R(s,a) + γ Σ P(s'|s,a) V*(s') ]

其中：
- V*(s) = 状态 s 的最优价值
- R(s,a) = 在状态 s 采取行动 a 的即时奖励
- γ = 折扣因子 (用户对长期 vs 短期的偏好)
- P(s'|s,a) = 状态转移概率
- V*(s') = 后续状态的最优价值
```

### 4.3 输入

```typescript
interface DecisionNode {
  id: string;
  question: string;           // 用户决策问题
  options: DecisionOption[];  // 可选路径
  context: string;            // 背景信息
  timeHorizon: string;        // 如 "2 years"
  constraints: string[];      // 约束条件
}

interface DecisionOption {
  id: string;
  name: string;
  description: string;
  initialCost: number;        // 初始成本 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
}
```

### 4.4 奖励函数

```typescript
interface RewardFunction {
  // 正向维度
  wealth: number;       // 财务回报权重
  freedom: number;      // 自由度权重
  security: number;     // 安全感权重
  growth: number;       // 成长性权重
  relationship: number; // 关系质量权重
  
  // 惩罚维度
  stress: number;       // 压力惩罚权重
  regret: number;       // 后悔惩罚权重
}

// 根据用户价值观动态构建
// 追求自由的用户: freedom = 0.4, security = 0.1
// 追求安全的用户: security = 0.4, freedom = 0.1
```

### 4.5 折扣因子 (Gamma) 映射

| 用户特征 | Gamma | 含义 |
|---------|-------|------|
| 年轻 + 高风险容忍 | 0.95 | 极度看重长期 |
| 中年 + 中风险容忍 | 0.85 | 平衡型 |
| 有家庭责任 | 0.75 | 偏重近期 |
| 财务压力大 | 0.60 | 短期优先 |

### 4.6 输出

```typescript
interface DecisionImpactReport {
  title: string;
  executiveSummary: string;
  
  // 路径对比
  pathComparison: Array<{
    path: string;
    successRate: string;      // "23%"
    expectedOutcome: string;
    timeToBreakeven: string;
    regretScore: number;      // 0-10
    fitWithValues: number;    // 0-10
  }>;
  
  // J-Curve 分析
  jCurveAnalysis: Array<{
    path: string;
    dipDepth: number;         // 最低谷深度（负值）
    dipDuration: string;      // 低谷持续时间
    recoveryPoint: string;    // 恢复点
    peakHeight: number;       // 峰值高度
    visualDescription: string;
  }>;
  
  // 最终建议
  recommendation: {
    optimalPath: string;
    alternativePath: string;
    reasoning: string;
    caveats: string[];
    nextSteps: string[];
  };
  
  // 后悔最小化
  regretMinimization: {
    question: string;         // "80岁回望时，你更可能后悔什么？"
    regretIfChooseA: string;
    regretIfChooseB: string;
    insight: string;
  };
  
  // 决策触发条件
  decisionTriggers: {
    proceedWithA_if: string[];
    proceedWithB_if: string[];
    reconsider_if: string[];
  };
}
```

### 4.7 实现文件

| 文件 | 说明 |
|-----|------|
| `prompts/destinyEngine.ts` | Prompt 定义与类型 |
| `services/destinyEngineService.ts` | 模拟与计算逻辑 |

---

## 5. Layer 4: Personal Navigator (个人导航员)

### 5.1 职责

| 职责 | 描述 |
|-----|------|
| 语气适配 | 根据用户压力和决策风险调整沟通方式 |
| 信号灯系统 | 🟢绿灯/🟡黄灯/🛑红灯 直观传达建议 |
| 情感支持 | 高压力用户先安抚再建议 |
| 可操作建议 | 每条建议必须有"现在能做的一小步" |

### 5.2 核心身份

**你是谁**：
- 忠诚的私人幕僚（Chief of Staff）
- 高情商的沟通者
- 务实的行动派
- 用户的"第二大脑"

**你不是谁**：
- ❌ 说教的长辈
- ❌ 冰冷的数据机器
- ❌ 无原则的"好好先生"
- ❌ 推销员

### 5.3 语气矩阵

| 用户状态 | 决策风险 | 语气 | 开场示例 |
|---------|---------|-----|---------|
| 高压力 | 高风险 | 温柔但坚定 | "我知道你压力很大，但有件事必须说..." |
| 高压力 | 低风险 | 支持鼓励 | "这是个好方向！不会给你额外负担" |
| 低压力 | 高风险 | 直接坦诚 | "Boss，这步棋风险不小，咱们聊聊" |
| 低压力 | 低风险 | 轻松愉快 | "这个稳了！我帮你理理下一步" |

### 5.4 信号灯系统

```typescript
const SIGNALS = {
  green: {
    emoji: '🟢',
    meaning: '方向正确，执行！',
    actionRequired: false
  },
  yellow: {
    emoji: '🟡',
    meaning: '需要调整或准备',
    actionRequired: true
  },
  red: {
    emoji: '🛑',
    meaning: '高风险警告，建议暂停',
    actionRequired: true
  }
};
```

### 5.5 输出模板

**红灯警告（高风险）**：
```
🛑 Boss，有件事必须跟你说。

我跑了一遍数据，{决策} 现在的风险很高——{失败概率}% 的可能会在 {时间} 内陷入困境。

**我的建议**：
{主建议}

**现在能做的一小步**：
{立即行动}

你怎么看？
```

**黄灯提醒（需要调整）**：
```
🟡 方向是对的，但需要调整节奏。

{核心洞察}

**我的建议**：
{主建议}

**先迈出这一步**：
{立即行动}
```

**绿灯放行（Go Ahead）**：
```
🟢 这个方向稳了！

{核心洞察}

**下一步**：
{主建议}

需要我帮你 {立即行动} 吗？
```

### 5.6 反面教材

❌ **太机械**：
> "根据贝尔曼方程计算，选项A的期望价值为-15.3，建议选择B。"

❌ **太长篇大论**：
> "首先，我们需要考虑多个维度。第一，从财务角度来看...第二..."

❌ **太模糊**：
> "这个决定有利有弊，你要权衡一下。"

✅ **正确示范**：
> "Boss，我算过了。现在全职创业，4个月内弹尽粮绝的概率是70%。
> 
> 但我理解你的野心，这不是说要放弃——
> 
> **我的建议**：保持工作，每晚8-10点搞项目。等副业收入到工资的40%，咱们再聊全职的事。
> 
> 要不我帮你把每晚的时间先 block 下来？"

### 5.7 实现文件

| 文件 | 说明 |
|-----|------|
| `prompts/personalNavigator.ts` | Prompt 定义与类型 |
| `services/personalNavigatorService.ts` | 回复生成逻辑 |

---

## 6. 数据流完整示例

### 6.1 场景：用户输入 "我想辞职创业"

```
Step 1: Layer 1 (Sentinel)
─────────────────────────
输入: "我想辞职创业"
处理: 
  - 关键词匹配: "辞职" ✓, "创业" ✓
  - 正则匹配: /(想|要)(辞|创业)/ ✓
  - 置信度: 0.7
输出: {
  intent: { type: 'career', confidence: 0.7, urgency: 'high' },
  meta: { shouldEscalate: true, processingMs: 45 }
}

Step 2: Layer 2 (Soul Architect)
─────────────────────────
输入: SentinelOutput + 历史交互数据
处理:
  - 检测到职业变动意图 → 记录
  - 结合历史: 用户曾多次搜索"副业"
  - 推断: 职业满意度下降
输出更新: soulMatrix.currentState.focusArea = 'career_change'

Step 3: Layer 3 (Destiny Engine)
─────────────────────────
输入: 
  - decision: "辞职创业"
  - soulMatrix: { riskTolerance: 'medium', savings: '8个月', ... }
处理:
  - 路径A (全职创业): 成功率 22%, J-Curve 深度 -65
  - 路径B (保持稳定+副业): 成功率 85%, J-Curve 深度 -15
  - 计算期望价值: EV_A = 12, EV_B = 28
输出: DecisionImpactReport

Step 4: Layer 4 (Personal Navigator)
─────────────────────────
输入:
  - DecisionImpactReport
  - soulMatrix.stressLevel = 65 (中高压力)
处理:
  - 信号: 🛑 红灯
  - 语气: 温柔但坚定（高压力 + 高风险）
输出:
  "我知道你最近压力挺大的。
  
  🛑 Boss，有件事必须跟你说。
  
  我算过了，现在全职创业，4个月内弹尽粮绝的概率是78%。
  
  **我的建议**：
  暂时不要全力投入。先用10%的时间精力试水，验证可行性。
  
  **现在能做的一小步**：
  今晚花30分钟，列出创业想法的前3个待验证假设。
  
  不管怎样，我都在。有什么想法随时说。"
```

---

## 7. 技术规格汇总

### 7.1 性能指标

| Layer | 延迟目标 | 内存占用 | 网络依赖 |
|-------|---------|---------|---------|
| L1: Sentinel | < 150ms | < 5MB | ❌ 无 |
| L2: Soul Architect | 实时更新 | < 10MB | ❌ 无 |
| L3: Destiny Engine | < 500ms | < 20MB | ⚠️ 可选 |
| L4: Navigator | < 100ms | < 5MB | ❌ 无 |

### 7.2 文件清单

| 层级 | Prompt 文件 | Service 文件 | UI 组件 |
|-----|------------|-------------|---------|
| L1 | `prompts/keyboardSentinel.ts` | `services/keyboardSentinelService.ts` | `components/SentinelIndicator.tsx` |
| L2 | `prompts/soulArchitect.ts` | `services/soulArchitectService.ts` | - |
| L3 | `prompts/destinyEngine.ts` | `services/destinyEngineService.ts` | - |
| L4 | `prompts/personalNavigator.ts` | `services/personalNavigatorService.ts` | - |

### 7.3 集成点

```typescript
// PhoneSimulator.tsx 中的集成
import { keyboardSentinel } from '../services/keyboardSentinelService';
import { soulArchitect } from '../services/soulArchitectService';
import { destinyEngine } from '../services/destinyEngineService';
import { personalNavigator } from '../services/personalNavigatorService';

// 完整调用流程
async function processDecision(userInput: string) {
  // L1: 检测意图
  const sentinel = keyboardSentinel.analyze(userInput);
  
  // L2: 更新画像
  if (sentinel.intent) {
    soulArchitect.onSentinelIntent(sentinel);
  }
  
  // L3: 运行模拟（仅重大决策）
  if (isMajorDecision(sentinel.intent?.type)) {
    const simulation = destinyEngine.quickEvaluate(userInput, options);
    
    // L4: 生成有温度的回复
    const response = personalNavigator.quickCraft(simulation, userInput);
    return response.formattedResponse;
  }
}
```

---

## 8. 未来扩展

### 8.1 计划中的功能

| 功能 | 描述 | 优先级 |
|-----|------|-------|
| LLM 增强 | L3 可选调用 Gemini/GPT 进行深度模拟 | P1 |
| 多语言支持 | Navigator 输出支持英文/日文 | P2 |
| 情绪检测增强 | L1 增加情绪识别能力 | P2 |
| 可视化报告 | L3 输出可交互的 J-Curve 图表 | P3 |

### 8.2 已知限制

1. **L1 意图检测** 依赖关键词和正则，复杂语义可能漏检
2. **L2 画像准确度** 需要足够的交互数据才能稳定
3. **L3 概率估算** 基于通用统计，个体差异可能较大
4. **L4 语气** 目前仅支持中文

---

## 9. 变更记录

| 版本 | 日期 | 变更内容 |
|-----|------|---------|
| V1.0 | 2026-01-25 | 初始版本，完成四层架构设计与实现 |

---

**文档结束**
