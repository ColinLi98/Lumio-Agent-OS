import {
  AgentInput,
  AgentOutput,
  InputMode,
  PolicyConfig,
  SoulMatrix,
  SuperAgentSolution,
  TaskPlan,
} from "../types.js";
import { ConversationMessage } from "./geminiService.js";
import { getSuperAgent } from "./superAgentService.js";

type RealtimeSnapshot = {
  query: string;
  results: Array<{ title?: string; url?: string; snippet?: string }>;
  timestamp: number;
};

/**
 * Compatibility shell:
 * - Keeps existing LumiAgent API used by PhoneSimulator
 * - Internally forwards execution to SuperAgentService single entry
 */
export class LumiAgent {
  private soul: SoulMatrix;
  private policy: PolicyConfig;
  private apiKey: string;
  private lastRealtimeData: RealtimeSnapshot | null = null;

  constructor(soul: SoulMatrix, policy: PolicyConfig, apiKey: string = "") {
    this.soul = soul;
    this.policy = policy;
    this.apiKey = apiKey;
  }

  public updateConfig(soul: SoulMatrix, policy: PolicyConfig, apiKey?: string) {
    this.soul = soul;
    this.policy = policy;
    if (apiKey !== undefined) {
      this.apiKey = apiKey;
    }
  }

  public getLastRealtimeData(): RealtimeSnapshot | null {
    return this.lastRealtimeData;
  }

  public async handle(
    input: AgentInput,
    conversationHistory: ConversationMessage[] = [],
    appScenarioHint: string = ""
  ): Promise<AgentOutput> {
    if (input.mode !== InputMode.AGENT) {
      return { type: "NONE" };
    }

    const rawText = input.rawText.trim();
    if (!rawText) {
      return { type: "NONE" };
    }

    try {
      const superAgent = getSuperAgent();
      if (this.apiKey) {
        superAgent.setApiKey(this.apiKey);
      }

      const response = await superAgent.processWithReAct(rawText, {
        userId: "compat-user",
        preferences: this.soul as Record<string, unknown>,
        recentQueries: conversationHistory.slice(-5).map(m => m.content),
        currentApp: input.appContext?.packageName || appScenarioHint,
        locale: "en-GB",
        conversationHistory,
      });

      const evidence = Array.isArray(response.evidence) ? response.evidence : [];
      if (evidence.length > 0) {
        this.lastRealtimeData = {
          query: rawText,
          results: evidence.map(item => ({
            title: item.source,
            url: item.url,
            snippet: item.fetched_at,
          })),
          timestamp: Date.now(),
        };
      }

      const solution: SuperAgentSolution = {
        success: response.confidence >= 0.4,
        summary: response.answer.slice(0, 120),
        recommendation: response.answer,
        optimizationScore: response.confidence,
        reasoning: buildReasoningLine(response.toolsUsed, response.skill_invocations),
        executionTime: response.executionTimeMs,
        reasoningProtocol: response.reasoning_protocol
          ? {
              version: response.reasoning_protocol.version,
              mode: response.reasoning_protocol.mode,
              methods_applied: response.reasoning_protocol.methods_applied,
              root_problem: response.reasoning_protocol.root_problem,
              recommended_strategy: response.reasoning_protocol.recommended_strategy,
              confidence: response.reasoning_protocol.confidence,
              artifacts: response.reasoning_protocol.artifacts as Record<string, unknown>,
            }
          : undefined,
        results: response.toolResults.map((row, index) => ({
          taskId: `task_${index + 1}`,
          agentType: row.toolName,
          result: row.output,
        })),
      };

      return {
        type: "SUPER_AGENT_RESULT",
        globalSolution: solution,
        summary: solution.summary,
        recommendation: solution.recommendation,
        results: response.toolResults,
        reasoningProtocol: response.reasoning_protocol,
      };
    } catch (error) {
      return {
        type: "ERROR",
        message: error instanceof Error ? error.message : "Super Agent unavailable",
      };
    }
  }

  public async handleTaskAction(action: "confirm" | "cancel"): Promise<AgentOutput> {
    const placeholder: TaskPlan = {
      id: `compat_${Date.now()}`,
      goal: action === "confirm" ? "继续执行任务" : "取消任务",
      steps: [],
      currentStepIndex: 0,
      status: action === "confirm" ? "executing" : "failed",
      summary: action === "confirm"
        ? "任务已交由 Super Agent 继续执行"
        : "任务已取消",
      startedAt: Date.now(),
    };

    return {
      type: "TASK_PROGRESS",
      task: placeholder,
    };
  }
}

function buildReasoningLine(
  toolsUsed: string[],
  skillInvocations?: Array<{ skill_id: string }>
): string {
  const tools = toolsUsed.slice(0, 4);
  const skills = (skillInvocations || []).map(row => row.skill_id).slice(0, 3);
  const parts: string[] = [];
  if (tools.length > 0) parts.push(`tools=${tools.join(",")}`);
  if (skills.length > 0) parts.push(`skills=${skills.join(",")}`);
  return parts.length > 0 ? parts.join(" | ") : "single_entry_super_agent";
}
