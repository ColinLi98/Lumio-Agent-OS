export enum InputMode {
  TYPE = 'TYPE',
  AGENT = 'AGENT'
}

export enum IntentCategory {
  // 三大核心功能
  WRITE_ASSIST = 'WRITE_ASSIST',     // 帮我写 - 解决表达焦虑
  SEARCH_ASSIST = 'SEARCH_ASSIST',   // 帮我找 - 解决信息割裂
  MEMORY_ASSIST = 'MEMORY_ASSIST',   // 帮我记 - 解决信息过载
  // 原有意图类别
  REWRITE = 'REWRITE',
  SHOPPING = 'SHOPPING',
  TRAVEL = 'TRAVEL',
  DINING = 'DINING',
  CALENDAR = 'CALENDAR',
  PRIVACY_MASK = 'PRIVACY_MASK',
  TOOL_USE = 'TOOL_USE',
  COMPLEX_TASK = 'COMPLEX_TASK',
  UNKNOWN = 'UNKNOWN'
}

export enum PrivacyFlag {
  PHONE = 'PHONE',
  ID_CARD = 'ID_CARD',
  ADDRESS = 'ADDRESS',
  BANK = 'BANK',
  PASSWORD = 'PASSWORD'
}

export interface AppContext {
  packageName: string;
  fieldHints: string[];
  isPasswordField: boolean;
}

export interface AgentInput {
  rawText: string;
  mode: InputMode;
  appContext?: AppContext;
  selectionText?: string;
  timestampMs: number;
}

export interface TextDraft {
  id: string;
  text: string;
  tone: string;
}

export interface ServiceCard {
  id: string;
  title: string;
  subtitle: string;
  actionType: 'WEBVIEW' | 'DEEPLINK' | 'SHARE';
  actionUri: string;
  payload?: Record<string, any>;
  imageUrl?: string;
}

export interface PrivacyAction {
  type: 'MASK' | 'FILL';
  maskedValue: string;
  originalValue: string;
  flag: PrivacyFlag;
}

// Tool Result from agentTools
export interface ToolResultData {
  success: boolean;
  toolName: string;
  data?: any;
  error?: string;
  displayType: 'weather' | 'calculator' | 'translation' | 'calendar' | 'reminder' | 'search' | 'text' | 'notes' | 'location' | 'write_assist' | 'memory' | 'quick_actions' | 'ocr_result';
}

// Task step for multi-step execution
export interface TaskStep {
  id: string;
  description: string;
  tool?: string;
  toolParams?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_confirmation' | 'retrying';
  result?: ToolResultData;
  requiresConfirmation?: boolean;
  // Step dependencies - IDs of steps that must complete first
  dependsOn?: string[];
  // Output key for storing results that other steps can reference
  outputKey?: string;
  // Whether this step can run in parallel with others
  canRunParallel?: boolean;
  // Retry configuration
  retryCount?: number;
  maxRetries?: number;
}

// Task plan for complex multi-step tasks
export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  currentStepIndex: number;
  status: 'planning' | 'executing' | 'waiting_confirmation' | 'completed' | 'failed';
  summary?: string;
  completedSummary?: string;
  startedAt?: number;
  completedAt?: number;
  // Store step outputs for dependency references: { outputKey: result }
  stepResults?: Record<string, any>;
  // Groups of step IDs that can run in parallel
  parallelGroups?: string[][];
}

export type AgentOutput =
  | { type: 'DRAFTS'; drafts: TextDraft[] }
  | { type: 'CARDS'; cards: ServiceCard[] }
  | { type: 'PRIVACY'; action: PrivacyAction }
  | { type: 'TOOL_RESULT'; result: ToolResultData; summary?: string }
  | { type: 'TASK_PROGRESS'; task: TaskPlan }
  | { type: 'QUICK_ACTIONS'; actions: QuickAction[]; context?: string }
  | { type: 'MEMORY_SAVED'; item: MemoryItem; message: string }
  | { type: 'ORCHESTRATION_RESULT'; plan: OrchestrationPlan }
  | { type: 'SUPER_AGENT_RESULT'; globalSolution: SuperAgentSolution; summary: string; recommendation: string; results: any[] }
  | { type: 'ERROR'; message: string }
  | { type: 'NONE' };

// Super Agent global solution type
export interface SuperAgentSolution {
  success: boolean;
  summary: string;
  results: Array<{
    taskId: string;
    agentType: string;
    result: any;
  }>;
  recommendation: string;
  optimizationScore: number;
  reasoning: string;
  executionTime: number;
}


export interface IntentResult {
  category: IntentCategory;
  confidence: number;
  query: string;
  entities: Record<string, string>;
  constraints: Record<string, string>;
  privacyFlags: PrivacyFlag[];
}

// ====================================
// Multi-Agent Orchestration Types
// ====================================

/**
 * 时间范围信息
 * 从用户输入中提取的时间相关信息
 */
export interface TimeFrame {
  start: string;              // "下周", "明天", "2026-02-01"
  end?: string;               // 结束时间
  duration?: string;          // "一周", "3天"
  flexibility: 'fixed' | 'flexible' | 'unknown';
}

/**
 * 预算信息
 */
export interface Budget {
  amount: number;             // 金额
  currency: string;           // "CNY", "USD", "JPY"
  type: 'total' | 'per_day' | 'per_person';
  flexibility: 'strict' | 'flexible' | 'unknown';
}

/**
 * 复杂意图分析结果
 * 从自然对话中提取的结构化意图信息
 */
export interface IntentContext {
  primaryIntent: string;              // 主要意图: "日本旅行规划"
  category: 'travel' | 'shopping' | 'event' | 'research' | 'task' | 'other';
  destinations?: string[];            // 目的地: ["日本", "东京"]
  timeframe?: TimeFrame;              // 时间范围
  budget?: Budget;                    // 预算
  impliedNeeds: string[];             // 隐含需求: ["机票", "酒店", "餐厅", "景点"]
  userMentionedPrefs: string[];       // 用户明确提到的偏好
  participants?: number;              // 参与人数
  confidence: number;                 // 分析置信度 0-100
}

/**
 * 专业Agent类型
 */
export type SpecializedAgentType =
  | 'flight_booking'    // 机票预订
  | 'hotel_booking'     // 酒店预订
  | 'restaurant'        // 餐厅推荐
  | 'attraction'        // 景点搜索
  | 'social_search'     // 社交媒体搜索
  | 'itinerary'         // 行程规划
  | 'shopping'          // 购物推荐
  | 'weather'           // 天气查询
  | 'translation'       // 翻译服务
  | 'transportation';   // 交通出行

/**
 * Agent任务定义
 */
export interface AgentTask {
  id: string;
  agentType: SpecializedAgentType;
  description: string;
  params: Record<string, any>;          // 传给Agent的参数
  appliedPreferences: string[];         // 应用的用户偏好
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: AgentTaskResult;
  priority: number;                     // 优先级 1-10
  canRunParallel: boolean;              // 是否可并行执行
}

/**
 * Agent任务执行结果
 */
export interface AgentTaskResult {
  success: boolean;
  data: any;
  suggestions: any[];                   // 推荐选项列表
  personalizedNote?: string;            // 个性化说明
  appliedFilters: string[];             // 已应用的筛选条件
  source?: string;                      // 数据来源
}

/**
 * 应用的用户偏好
 */
export interface AppliedPreferences {
  travel?: {
    flightClass: string;
    seatPreference: string;
    wakeUpTime: string;
    preferredAirlines: string[];
  };
  accommodation?: {
    starLevel: number[];
    amenities: string[];
    location: string;
  };
  dining?: {
    cuisines: string[];
    priceLevel: string;
    atmosphere: string[];
  };
  tourism?: {
    style: string;
    pace: string;
    interests: string[];
  };
}

/**
 * 协调计划
 * 多Agent任务执行的完整计划
 */
export interface OrchestrationPlan {
  id: string;
  userQuery: string;                    // 原始用户输入
  intentContext: IntentContext;         // 分析后的意图
  appliedPreferences: AppliedPreferences; // 应用的偏好
  agentTasks: AgentTask[];              // Agent任务列表
  status: 'planning' | 'executing' | 'consolidating' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  consolidatedResult?: ConsolidatedResult;
}

/**
 * 整合后的结果
 * 所有Agent结果的汇总
 */
export interface ConsolidatedResult {
  summary: string;                      // 汇总说明
  sections: OrchestrationSection[];     // 各部分结果
  totalEstimatedCost?: number;          // 预估总费用
  recommendations: string[];            // 综合推荐
}

/**
 * 协调结果的一个部分
 */
export interface OrchestrationSection {
  agentType: SpecializedAgentType;
  title: string;                        // 显示标题
  icon: string;                         // 图标
  options: any[];                       // 选项列表
  personalizedNote: string;             // 个性化说明
  selected?: any;                       // 用户选择的选项
}

export interface SoulMatrix {
  communicationStyle: 'Professional' | 'Casual' | 'Friendly' | 'Concise';
  riskTolerance: 'Low' | 'Medium' | 'High';
  privacyLevel: 'Strict' | 'Balanced' | 'Open';
}

export interface PolicyConfig {
  allowNetworkInAgentMode: boolean;
  requireConfirmBeforeSend: boolean;
  allowedServices: string[];
}

// ====================================
// 三大核心功能相关类型
// ====================================

/**
 * 记忆项 - 用于本地知识图谱
 * 帮我记功能的核心数据结构
 */
export interface MemoryItem {
  id: string;
  type: 'event' | 'task' | 'note' | 'link' | 'contact' | 'interest';
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt?: number;
  source: string;  // 来源App或场景
  tags?: string[];
}

/**
 * 快捷操作 - 用于帮我找功能
 * 提供一键操作：比价、收藏、搜索、导航等
 */
export interface QuickAction {
  id: string;
  type: 'compare_price' | 'save' | 'search' | 'navigate' | 'copy' | 'share' | 'open_app';
  label: string;
  icon?: string;
  data: Record<string, any>;
  actionUri?: string;
}

/**
 * 写作风格配置 - 用于帮我写功能
 */
export interface WriteStyle {
  id: string;
  name: string;
  description: string;
  tone: 'professional' | 'casual' | 'humorous' | 'formal' | 'concise' | 'warm';
  samples?: string[];
}

// ====================================
// 数字分身 (Digital Avatar) 相关类型
// ====================================

/**
 * 用户交互记录
 * 用于追踪用户行为，构建数字分身
 */
export interface UserInteraction {
  id: string;
  type: 'message_sent' | 'draft_selected' | 'tool_used' | 'card_clicked' | 'emoji_reaction' | 'session_start' | 'session_end';
  data: Record<string, any>;
  timestamp: number;
  appContext?: string;
  sentiment?: number;  // -100 到 100 情感值
}

/**
 * 写作风格偏好
 * 从用户历史消息中提取
 */
export interface WritingPreference {
  preferredTones: string[];       // 常用语气风格
  avgMessageLength: number;       // 平均消息长度
  emojiUsage: 'high' | 'medium' | 'low';  // Emoji 使用频率
  formality: 'formal' | 'casual' | 'mixed';  // 正式程度
}

/**
 * 兴趣标签
 * 从用户行为中提取的兴趣
 */
export interface InterestTag {
  name: string;
  weight: number;        // 0-1 权重值
  lastSeen: number;      // 最后出现时间戳
  occurrences: number;   // 出现次数
}

/**
 * 数字分身画像 (基础版)
 * 用户的综合画像，完全本地存储
 */
export interface DigitalAvatar {
  id: string;
  createdAt: number;
  updatedAt: number;

  // 基础信息
  nickname?: string;

  // 行为统计
  totalInteractions: number;
  totalMessages: number;
  totalToolUses: number;

  // 偏好分析
  writingPreference: WritingPreference;
  interestTags: InterestTag[];

  // 活跃时间分析
  activeHours: number[];  // 0-23 小时活跃度数组
  activeDays: number[];   // 0-6 星期活跃度数组 (0=周日)
}

// ====================================
// 增强型数字分身 - 人性化特征
// ====================================

/**
 * 性格特征维度 (Big Five 五大人格 + 扩展)
 * 通过用户行为自动推断
 */
export interface PersonalityTraits {
  // Big Five 五大人格 (0-100)
  openness: number;           // 开放性: 好奇心、创造力、接受新事物
  conscientiousness: number;  // 尽责性: 自律、条理性、目标导向
  extraversion: number;       // 外向性: 社交能力、活力、健谈
  agreeableness: number;      // 宜人性: 合作、信任、同理心
  neuroticism: number;        // 神经质: 情绪波动 (反向：越低越稳定)

  // 扩展维度
  rationalVsEmotional: number;  // 理性 vs 感性 (-100 到 100, 负数=感性, 正数=理性)
  riskTolerance: number;        // 风险承受度 (0-100)
  decisionSpeed: number;        // 决策速度 (0-100)
  creativityIndex: number;      // 创造力指数 (0-100)

  // 置信度
  confidence: number;           // 分析置信度 (0-100)
  sampleSize: number;           // 样本数量
}

/**
 * 沟通风格偏好
 * 从消息文本中分析
 */
export interface CommunicationStyle {
  // 表达风格
  formality: 'formal' | 'casual' | 'adaptive';  // 正式程度
  expressiveness: number;       // 表达丰富度 (0-100)
  directness: number;           // 直接程度 (0-100)
  humorUsage: number;           // 幽默使用频率 (0-100)

  // 文字习惯
  vocabularyRichness: number;   // 词汇丰富度 (0-100)
  avgSentenceLength: number;    // 平均句子长度
  avgMessageLength: number;     // 平均消息长度
  punctuationStyle: 'minimal' | 'normal' | 'expressive';  // 标点风格

  // 互动特征
  questionFrequency: number;    // 提问频率 (0-100)
  responseSpeed: 'quick' | 'moderate' | 'thoughtful';  // 响应速度类型

  // Emoji 分析
  emojiFrequency: number;       // Emoji 使用频率
  topEmojis: string[];          // 最常用 emoji (前5个)
  emojiSentiment: 'positive' | 'neutral' | 'mixed';  // Emoji 情感倾向
}

/**
 * 行为习惯模式
 * 从操作时间和序列中分析
 */
export interface BehaviorPatterns {
  // 时间维度
  chronotype: 'morning_person' | 'night_owl' | 'flexible';  // 作息类型
  peakProductivityHours: number[];   // 高效时段 (1-3个小时)
  weekendVsWeekday: number;          // 周末vs工作日活跃比 (0-200, 100=相等)

  // 会话模式
  avgSessionDuration: number;        // 平均会话时长(分钟)
  sessionsPerDay: number;            // 日均会话数
  longestSession: number;            // 最长会话时长

  // 决策模式
  decisionStyle: 'quick' | 'deliberate' | 'mixed';  // 决策风格
  confirmationRate: number;          // 需要确认的比例 (0-100)
  undoFrequency: number;             // 撤销操作频率 (0-100)

  // 任务偏好
  multitaskingTendency: number;      // 多任务倾向 (0-100)
  taskCompletionRate: number;        // 任务完成率 (0-100)
  focusScore: number;                // 专注度评分 (0-100)

  // 工具使用偏好
  preferredTools: string[];          // 最常用的工具
  toolExplorationRate: number;       // 新工具探索率 (0-100)
}

/**
 * 情绪状态追踪
 * 从消息情感和使用模式分析
 */
export interface EmotionalProfile {
  // 当前状态
  currentMood: 'positive' | 'neutral' | 'negative';
  currentMoodScore: number;          // -100 到 100

  // 历史趋势
  moodHistory: Array<{
    date: string;            // YYYY-MM-DD
    avgMood: number;         // 当日平均情绪
    volatility: number;      // 波动程度
  }>;

  // 情绪特征
  baselinePositivity: number;        // 基准积极度 (0-100)
  emotionalStability: number;        // 情绪稳定性 (0-100)
  stressIndicators: number;          // 压力指标 (0-100)
  resilienceScore: number;           // 心理韧性 (0-100)

  // 情绪触发
  positiveTriggeredBy: string[];     // 积极情绪触发因素
  negativeTriggeredBy: string[];     // 消极情绪触发因素
}

/**
 * 社交关系图谱
 * 从消息中提取的社交信息
 */
export interface SocialGraph {
  // 联系人关系
  contacts: Array<{
    id: string;                      // 匿名化 ID
    label?: string;                  // "家人" / "朋友" / "同事"
    mentionCount: number;            // 提及次数
    lastMentioned: number;           // 最后提及时间
    sentiment: number;               // 情感倾向 (-100 到 100)
  }>;

  // 社交特征
  socialCircleSize: number;          // 社交圈大小
  socialActivityLevel: number;       // 社交活跃度 (0-100)
  relationshipDepth: 'surface' | 'moderate' | 'deep';  // 关系深度倾向

  // 沟通对象类型
  workRelatedRatio: number;          // 工作相关沟通比例 (0-100)
  personalRelatedRatio: number;      // 个人相关沟通比例 (0-100)
}

/**
 * 价值观与偏好
 * 从行为和内容中推断
 */
export interface ValuesProfile {
  // 核心价值观 (0-100 重视程度)
  efficiency: number;                // 效率至上
  quality: number;                   // 质量优先
  creativity: number;                // 创意创新
  stability: number;                 // 稳定安全
  growth: number;                    // 成长学习
  connection: number;                // 人际联结

  // 生活偏好
  workLifeBalance: number;           // 工作生活平衡 (0-100)
  privacyConcern: number;            // 隐私关注度 (0-100)

  // 消费特征
  priceVsQuality: number;            // 价格vs质量 (-100到100, 负=价格敏感, 正=质量优先)
  impulsiveness: number;             // 冲动程度 (0-100)

  // 内容偏好
  preferredTopics: string[];         // 偏好话题
  contentDepthPreference: 'quick' | 'detailed' | 'mixed';  // 内容深度偏好
  learningStyle: 'visual' | 'textual' | 'interactive';     // 学习风格
}

/**
 * 成长里程碑
 */
export interface Milestone {
  id: string;
  type: 'first_use' | 'streak' | 'achievement' | 'level_up';
  title: string;
  description: string;
  timestamp: number;
  icon?: string;
}

/**
 * 增强型数字分身 (完整版)
 * 用户的全方位人性化画像
 */
export interface EnhancedDigitalAvatar extends DigitalAvatar {
  version: '2.0';

  // 人格画像
  personality: PersonalityTraits;
  communicationStyle: CommunicationStyle;
  behaviorPatterns: BehaviorPatterns;
  emotionalProfile: EmotionalProfile;
  socialGraph: SocialGraph;
  valuesProfile: ValuesProfile;

  // 成长记录
  milestones: Milestone[];
  currentStreak: number;             // 连续使用天数
  longestStreak: number;             // 最长连续天数

  // 画像元数据
  profileCompleteness: number;       // 画像完整度 (0-100)
  lastAnalyzedAt: number;            // 最后分析时间
  analysisVersion: string;           // 分析算法版本

  // 隐私设置
  privacyMode: boolean;              // 隐私模式 (暂停收集)
  dataRetentionDays: number;         // 数据保留天数
}

// ====================================
// 数字分身 V2 - 新增类型
// ====================================

/**
 * 头像等级系统
 * 基于使用量的成长等级
 */
export interface AvatarLevel {
  level: number;                     // 1-100
  title: string;                     // 等级称号
  xp: number;                        // 当前经验值
  nextLevelXp: number;               // 下一级所需经验
  badge: string;                     // 徽章 emoji
  color: string;                     // 等级颜色
}

/**
 * 趋势数据点
 * 用于可视化历史趋势
 */
export interface TrendData {
  date: string;                      // YYYY-MM-DD
  value: number;                     // 数值
  type: 'mood' | 'activity' | 'messages' | 'tools' | 'personality';
  label?: string;                    // 可选标签
}

/**
 * AI 洞察报告
 * Gemini 生成的个性化分析报告
 */
export interface InsightReport {
  id: string;
  generatedAt: number;               // 生成时间戳
  periodStart: number;               // 报告周期开始
  periodEnd: number;                 // 报告周期结束
  periodType: 'daily' | 'weekly' | 'monthly';

  // AI 生成内容
  summary: string;                   // 总结摘要
  highlights: string[];              // 亮点 (3-5条)
  suggestions: string[];             // 智能建议 (2-4条)

  // 数据快照
  personalitySnapshot: Partial<PersonalityTraits>;
  activitySummary: {
    totalInteractions: number;
    totalMessages: number;
    totalToolUses: number;
    avgMoodScore: number;
  };

  // 对比分析
  comparedToPrevious?: {
    interactionChange: number;       // 百分比变化
    moodChange: number;              // 情绪变化
    productivityChange: number;      // 效率变化
  };
}

/**
 * 动态头像状态
 * 驱动头像动画和外观
 */
export interface DynamicAvatarState {
  mood: 'happy' | 'neutral' | 'thinking' | 'tired' | 'excited';
  energy: number;                    // 0-100 能量值
  isActive: boolean;                 // 是否活跃中
  lastActiveTime: number;            // 最后活跃时间
  animation?: 'idle' | 'wave' | 'nod' | 'celebrate';
}