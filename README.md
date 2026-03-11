<div align="center">

# Lumio Agent OS

### B-end governed workspace platform built on Lumi.AI Agent OS

[![Live Demo](https://img.shields.io/badge/Live%20Demo-lumi--agent--simulator.vercel.app-blue?style=for-the-badge)](https://lumi-agent-simulator.vercel.app)
[![Version](https://img.shields.io/badge/Version-v0.2.7%20Beta-green?style=for-the-badge)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)]()
[![React](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react)]()

</div>

---

## 🎯 产品愿景

**Lumio** 是面向企业场景的 **B-end governed workspace platform**，底层构建在 **Lumi.AI Agent OS** 之上。它把键盘、App、云端推理、LIX 市场和 Digital Twin 组合成一条可执行链路，把用户意图转成可验证的任务分解、执行动作与结果证据。

> *"让每个意图都能被拆解、执行、验证与交付"*

## 🧭 仓库定位

- `Lumio` 是当前对外发布的 B-end 产品名
- `Lumi.AI Agent OS` 是底层执行与编排内核
- 当前 GitHub 仓库承载前端工作台、执行链路、LIX 能力与配套文档

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Lumio on Lumi.AI Agent OS                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Input      │  │   Agent     │  │    LIX      │              │
│  │  Surfaces   │  │   Kernel    │  │   Market    │              │
│  │ (IME/App)   │──│ (Execution) │──│ (Execution) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Digital Soul Matrix                        ││
│  │  (用户偏好 · 决策风格 · 价值观 · 历史记忆)                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ 核心功能模块

### 1️⃣ Super Agent 智能代理

| 功能 | 描述 | 状态 |
|------|------|------|
| 🔍 多技能路由 | 自动识别意图并调用对应 Skill（比价/搜索/翻译/计算等） | ✅ |
| 💬 上下文对话 | 支持多轮对话，理解追问和澄清 | ✅ |
| 📊 结果可视化 | 结构化展示搜索结果、价格对比、报价卡片 | ✅ |
| 🎯 个性化推荐 | 基于 Digital Soul 的偏好权重调整 | ✅ |

### 2️⃣ L.I.X. 意图交易市场

> **Lumi Intent Exchange** - 用户发布购买意图，供应商主动报价

```
用户意图 ──▶ Provider Fanout ──▶ 报价收集 ──▶ 智能排序 ──▶ 接受成交
             (JD/PDD/Taobao)      (并发抓取)      (8阶段验证)
```

| 模块 | 实现详情 | 状态 |
|------|----------|------|
| 📢 意图广播 | POST /api/lix/broadcast → 多平台并发搜索 | ✅ |
| 🏪 Provider 适配器 | JD/PDD/Taobao 独立爬虫适配器 | ✅ |
| ✅ 8阶段验证管道 | 来源/库存/价格漂移/信任评分/超额预算检查 | ✅ |
| 🏆 拍卖引擎 | 多因素评分排序 + 透明解释 | ✅ |
| 💰 Accept Fee 结算 | 1% 交易费用，发票聚合 | ✅ |
| 🛡️ 反封禁系统 | 熔断器 + Ban 检测 + 代理池（预留） | ✅ |

### 3️⃣ Digital Soul 数字灵魂

用户画像系统，持久化存储偏好和决策风格：

```typescript
interface SoulMatrix {
  preferences: {
    risk_tolerance: number;      // 风险偏好 0-1
    price_sensitivity: number;   // 价格敏感度
    quality_preference: number;  // 质量偏好
    brand_loyalty: number;       // 品牌忠诚度
  };
  values: string[];              // 核心价值观
  communication_style: string;   // 沟通风格
  decision_patterns: DecisionPattern[];
}
```

### 4️⃣ 命运导航器 Destiny Navigator

AI 驱动的人生决策模拟器：

- 📍 多路径分析（保守/平衡/激进）
- 📊 概率预测 + 信心指数
- 🎯 最优推荐 + 理由解释
- 📈 5年/10年命运曲线预测

---

## 🚀 技术亮点

### Provider Adapter Layer

```
┌───────────────────────────────────────────────────────────┐
│  Intent Fanout (并发=3)                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                   │
│  │   JD    │  │   PDD   │  │ Taobao  │  ← Provider Pool  │
│  │ Adapter │  │ Adapter │  │ Adapter │                   │
│  └────┬────┘  └────┬────┘  └────┬────┘                   │
│       │            │            │                         │
│       ▼            ▼            ▼                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Headless Pool (Playwright)               │ │
│  │  - 全局并发上限: 3                                   │ │
│  │  - 超时: search 10s / detail 8s                     │ │
│  │  - 降级: Playwright → fetch fallback                 │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 反封禁架构

| 组件 | 功能 | 配置 |
|------|------|------|
| 🔌 熔断器 | ban_score ≥ 10 触发，10min 冷却 | CIRCUIT_THRESHOLD=10 |
| 🔍 Ban 检测 | HTTP 403/429, 验证码, 重定向检测 | 7种信号类型 |
| 🌐 代理池 | Round-robin / Random / Sticky 策略 | Beta 未启用 |
| 🎭 指纹生成 | User-Agent, Viewport, Timezone 轮换 | 按 provider 定制 |

### 验证管道 (8 Stages)

```
Stage 1: Source Allowlist     → 域名白名单
Stage 2: Inventory Check      → 库存状态验证
Stage 3: Expiry Validation    → 报价时效性
Stage 4: Trust Score          → 店铺信任评分
Stage 5: Price Drift          → 价格漂移 ≤30%
Stage 6: Budget Overrun       → 超额预算警告
Stage 7: Delivery Feasibility → 配送可行性
Stage 8: Fraud Detection      → 欺诈检测
```

---

## 📊 MVP 完成进度

### Epic 0: LIX MVP (15 Issues)

```
P0 阻塞项 ████████████████ 100% ✓ (3/3)
P1 用户体验 ████████████████ 100% ✓ (3/3)
P2 完善 ████████████████ 100% ✓ (1/1)
预置功能 ████████████████ 100% ✓ (8/8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 15/15 Issues Complete 🎉
```

| Priority | Issues | Status |
|----------|--------|--------|
| **P0** | #1 Market Navigation, #7 Read APIs, #4 Keyboard Integration | ✅ |
| **P1** | #2 MarketHome Enhancement, #3 IntentDetail Polish, #10 2s Polling | ✅ |
| **P2** | #14 Observability Dashboard | ✅ |
| **Pre-built** | #5 lixStore, #6 Broadcast API, #8 Validator, #9 Auction, #11 Adapters, #12 Fees, #13 Anti-Ban, #15 Deploy | ✅ |

---

## 🖥️ 界面预览

### 输入入口（IME + App）
- 键盘是高频意图入口之一，不是产品唯一入口
- App Work 面展示任务分解、执行状态、证据与下一步
- 复杂任务可在输入面与 App 工作面之间无缝切换

### L.I.X. 意图市场
- 发布商品需求意图
- 实时接收多平台报价（2秒轮询）
- 透明的评分解释 + 验证警告
- 一键接受成交

### 设置页 - 监控面板
- Provider 健康状态（熔断器状态）
- 费用统计（总交易/总费用/争议）
- 代理池健康度

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + 自定义 Design System |
| **AI Engine** | Gemini API / DeepSeek API |
| **Headless Scraping** | Playwright (Chromium) |
| **State Management** | Zustand + EventBus |
| **Deployment** | Vercel (Edge Functions) |
| **Metrics** | Custom Prometheus-style Collectors |

## 🦞 OpenClaw 并入方式（Embedded）

当前仓库采用“仓内固定版本 + 适配层”模式并入 OpenClaw：

- 上游代码：`third_party/openclaw`（git submodule，固定 commit）
- Lumi 运行入口：`openclaw-relay/main.py`
- Android 脚本：`LumiKeyboard-Android/build_and_test.sh` 启动仓内 relay

快速初始化：

```bash
scripts/openclaw/bootstrap-embedded.sh
scripts/openclaw/start-embedded-relay.sh
```

详细说明见：`docs/openclaw-embedded-integration.md`

---

## 📁 项目结构

```
Lumio-Agent-OS/
├── api/                          # Serverless API 端点
│   ├── lix-broadcast.ts          # POST 意图广播
│   ├── lix-intent.ts             # GET 意图详情
│   └── lix-offers.ts             # GET 报价列表
├── components/                   # React 组件
│   ├── PhoneSimulator.tsx        # 手机模拟器
│   ├── SmartKeyboard.tsx         # IME demo 输入面
│   ├── LumiAppView.tsx           # App 主视图
│   ├── MarketHome.tsx            # LIX 市场首页
│   ├── IntentDetail.tsx          # 意图详情页
│   ├── ObservabilityDashboard.tsx # 监控面板
│   └── ...
├── services/                     # 业务逻辑层
│   ├── providers/                # Provider 适配器层
│   │   ├── jdAdapter.ts
│   │   ├── pddAdapter.ts
│   │   ├── taobaoAdapter.ts
│   │   ├── headlessPool.ts       # Playwright 池
│   │   ├── banBudget.ts          # 熔断器
│   │   └── ...
│   ├── lixStore.ts               # 意图存储
│   ├── lixTypes.ts               # 类型定义
│   ├── auctionEngine.ts          # 拍卖排序
│   ├── offerValidationService.ts # 8阶段验证
│   ├── acceptFeeService.ts       # 费用结算
│   └── ...
├── docs/                         # 技术文档
│   ├── LIX_MVP_Implementation_Report.md
│   └── Provider_Adapter_Layer_Architecture.md
└── ...
```

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装运行

```bash
# 1. 克隆项目
git clone https://github.com/ColinLi98/Lumio-Agent-OS.git
cd Lumio-Agent-OS

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，设置 GEMINI_API_KEY 等本地变量

# 4. 启动开发服务器
npm run dev

# 5. 访问
open http://localhost:5173
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 部署到 Vercel
vercel --prod
```

---

## 🗺️ 产品路线图

### Phase 1: MVP ✅ (Current)
- [x] Super Agent 多技能路由
- [x] L.I.X. 意图交易基础流程
- [x] 3 平台 Provider 适配器
- [x] 8 阶段验证管道
- [x] Accept Fee 结算

### Phase 2: Growth (Q1 2026)
- [ ] 更多 Provider（小红书、抖音）
- [ ] 验证码自动识别
- [ ] IndexedDB 持久化
- [ ] 推送通知

### Phase 3: Scale (Q2 2026)
- [ ] 独立 Headless Worker 集群
- [ ] Redis 集群状态管理
- [ ] 商家入驻后台
- [ ] 支付结算集成

---

## 📈 核心指标

| 指标 | 目标 | 当前 |
|------|------|------|
| Intent → Offer 延迟 | ≤ 3s | ~2.5s |
| 验证通过率 | ≥ 80% | ~85% |
| Provider 可用率 | ≥ 95% | 100% (Beta) |
| Accept Fee 费率 | 1% | 1% |

---

## 📄 许可证

Proprietary - All Rights Reserved

---

<div align="center">

**Built for Lumio on top of Lumi.AI Agent OS**

[Live Demo](https://lumi-agent-simulator.vercel.app) · [Documentation](./docs/) · [Contact](mailto:team@lumi.ai)

</div>
