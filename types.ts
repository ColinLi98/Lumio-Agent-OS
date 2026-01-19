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
  displayType: 'weather' | 'calculator' | 'translation' | 'calendar' | 'reminder' | 'search' | 'text' | 'notes' | 'location' | 'write_assist' | 'memory' | 'quick_actions';
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
  | { type: 'ERROR'; message: string }
  | { type: 'NONE' };

export interface IntentResult {
  category: IntentCategory;
  confidence: number;
  query: string;
  entities: Record<string, string>;
  constraints: Record<string, string>;
  privacyFlags: PrivacyFlag[];
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