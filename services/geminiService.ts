import { GoogleGenAI, Type } from "@google/genai";
import { IntentCategory, IntentResult, ServiceCard, SoulMatrix, TextDraft, ToolResultData, TaskPlan, TaskStep, IntentContext } from "../types";
import { AGENT_TOOLS, getToolByName, getGeminiFunctionDeclarations } from "./agentTools";
import { selectModel, MODELS, analyzeTaskComplexity, logModelUsage, ModelSelectionConfig } from "./modelSelector";

// Create AI instance dynamically with provided API key
const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `You are the Core Agent for Lumi, an Android AI keyboard. 
Your goal is to assist the user based on their input text.
You must classify intent, extract entities, and generate appropriate responses (Drafts or Cards).
You have access to tools for weather, calculations, translations, calendar, and reminders.
Strictly follow the JSON schemas provided.`;

export const classifyIntent = async (text: string, apiKey: string): Promise<IntentResult> => {
  try {
    const ai = getAI(apiKey);
    // 意图分类使用 Flash（快速响应）
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `Analyze this input: "${text}"`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: Object.values(IntentCategory) },
            confidence: { type: Type.NUMBER },
            query: { type: Type.STRING },
            // Entities and Constraints changed to Array of Key-Value pairs 
            // because Type.OBJECT properties cannot be empty.
            entities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["key", "value"]
              }
            },
            constraints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["key", "value"]
              }
            },
            privacyFlags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["category", "confidence", "query"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) throw new Error("No response from Gemini");

    const rawResult = JSON.parse(textResult);

    // Convert Array of KV pairs back to Record<string, string>
    const arrayToRecord = (arr: any[]) => {
      if (!Array.isArray(arr)) return {};
      return arr.reduce((acc, curr) => {
        if (curr.key && curr.value) {
          acc[curr.key] = curr.value;
        }
        return acc;
      }, {} as Record<string, string>);
    };

    return {
      category: rawResult.category,
      confidence: rawResult.confidence,
      query: rawResult.query,
      entities: arrayToRecord(rawResult.entities),
      constraints: arrayToRecord(rawResult.constraints),
      privacyFlags: rawResult.privacyFlags || []
    };
  } catch (error) {
    console.error("Gemini Intent Error", error);
    return {
      category: IntentCategory.UNKNOWN,
      confidence: 0,
      query: text,
      entities: {},
      constraints: {},
      privacyFlags: []
    };
  }
};

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const generateDrafts = async (
  text: string,
  soul: SoulMatrix,
  apiKey: string,
  conversationHistory: ConversationMessage[] = [],
  appScenarioHint: string = ''
): Promise<TextDraft[]> => {
  try {
    const ai = getAI(apiKey);

    // 🆕 MemR³ 记忆上下文注入
    let memoryContext = '';
    try {
      const { queryMemory } = await import('./memr3Service');
      const memoryResult = await queryMemory(text);
      if (memoryResult && !memoryResult.includes('没有找到') && !memoryResult.includes('没有存储')) {
        memoryContext = `\n\n[用户记忆上下文]: ${memoryResult}`;
        console.log('[generateDrafts] MemR³ 注入记忆上下文');
      }
    } catch (memError) {
      console.log('[generateDrafts] MemR³ 未启用或无相关记忆');
    }

    // Build context from conversation history
    let contextPrompt = '';
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-6); // Last 6 messages for context
      contextPrompt = `\n\nConversation History (for context):\n${recentMessages.map(msg =>
        `${msg.role === 'user' ? '对方' : '我'}: ${msg.content}`
      ).join('\n')}\n\nBased on this conversation context, `;
    }

    // Build app scenario style hint
    const styleHint = appScenarioHint
      ? `\n\nIMPORTANT - Response Style: ${appScenarioHint}`
      : '';

    // 智能选择模型：根据请求复杂度自动切换
    const { model, complexity, reason } = selectModel(text, {}, {
      hasHistory: conversationHistory.length > 0,
      historyLength: conversationHistory.length
    });
    console.log(`[generateDrafts] ${reason}`);

    // 消费偏好提示
    const spendingHint = soul.spendingPreference
      ? `\nSpending Preference: ${soul.spendingPreference === 'PriceFirst' ? 'Price-sensitive, prefer budget-friendly options' : soul.spendingPreference === 'QualityFirst' ? 'Quality-focused, prefer premium options' : 'Balanced between price and quality'}.`
      : '';

    const response = await ai.models.generateContent({
      model,
      contents: `${contextPrompt}Generate 3 distinct text drafts for this request: "${text}".${memoryContext}
      Style: ${soul.communicationStyle}. 
      Risk Tolerance: ${soul.riskTolerance}.${spendingHint}${styleHint}
      ${conversationHistory.length > 0 ? 'Make sure the drafts are contextually appropriate based on the conversation history.' : ''}
      ${memoryContext ? 'Use the user memory context to personalize the drafts.' : ''}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              tone: { type: Type.STRING }
            },
            required: ["id", "text", "tone"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Drafts Error", error);
    return [];
  }
};

export const generateCards = async (intent: IntentResult, apiKey: string): Promise<ServiceCard[]> => {
  try {
    const ai = getAI(apiKey);

    // 智能模型选择：根据意图类别和查询复杂度
    const { model, complexity, reason } = selectModel(intent.query, {
      // 旅行和购物类使用更高质量的模型
      preferQuality: intent.category === IntentCategory.TRAVEL || intent.category === IntentCategory.SHOPPING
    }, {
      taskType: intent.category
    });
    console.log(`[generateCards] ${reason}`);

    // We utilize Google Search Grounding to get real data for cards
    const response = await ai.models.generateContent({
      model,
      contents: `Find real options for: ${intent.query}. 
      Context: ${JSON.stringify(intent.entities)}. 
      Return structured data suitable for UI cards.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              actionType: { type: Type.STRING, enum: ['WEBVIEW', 'DEEPLINK', 'SHARE'] },
              actionUri: { type: Type.STRING },
              imageUrl: { type: Type.STRING }
            },
            required: ["id", "title", "subtitle", "actionType", "actionUri"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Cards Error", error);
    return [];
  }
};

/**
 * Execute a user request with tool calling capability
 * Uses Gemini function calling to determine if tools are needed
 */
export const executeWithTools = async (
  text: string,
  apiKey: string
): Promise<{ toolCalls: Array<{ name: string; args: Record<string, any> }> | null; textResponse: string | null }> => {
  try {
    const ai = getAI(apiKey);

    // Define function declarations for Gemini
    const functionDeclarations = getGeminiFunctionDeclarations();

    // 工具调用使用 Flash（快速响应）
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: text,
      config: {
        systemInstruction: `You are Lumi, a helpful AI assistant integrated into a keyboard.
When the user asks for something that requires a tool (weather, calculations, translations, calendar, reminders), 
you MUST call the appropriate function. Do not just describe what you would do - actually call the function.
Available tools: get_weather, calculator, translate, calendar, reminder.`,
        tools: [{
          functionDeclarations: functionDeclarations as any
        }]
      }
    });

    // Check if there are function calls in the response
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const functionCalls = parts
      .filter((part: any) => part.functionCall)
      .map((part: any) => ({
        name: part.functionCall.name,
        args: part.functionCall.args || {}
      }));

    if (functionCalls.length > 0) {
      return { toolCalls: functionCalls, textResponse: null };
    }

    // No function calls, return text response
    return { toolCalls: null, textResponse: response.text || null };
  } catch (error) {
    console.error("Gemini Tool Execution Error", error);
    return { toolCalls: null, textResponse: null };
  }
};

/**
 * Plan a multi-step task
 * Uses Gemini to break down a complex goal into executable steps
 * Now supports step dependencies, output keys, and parallel execution hints
 */
export const planMultiStepTask = async (
  goal: string,
  apiKey: string
): Promise<TaskPlan | null> => {
  try {
    const ai = getAI(apiKey);

    const toolNames = AGENT_TOOLS.map(t => `${t.name}: ${t.description}`).join('\n');

    // 多步骤任务规划使用 Pro 模型（需要更强推理能力）
    const { model, reason } = selectModel(goal, { preferQuality: true });
    console.log(`[planMultiStepTask] ${reason}`);

    const response = await ai.models.generateContent({
      model,
      contents: `Break down this goal into executable steps: "${goal}"
      
Available tools:
${toolNames}

For each step:
- Assign a unique id (e.g., step_1, step_2)
- If a step depends on another step's output, set dependsOn to that step's id
- If a step produces output that other steps need, set outputKey to a descriptive name
- If steps can run simultaneously (no dependencies), set canRunParallel to true
- Use {{outputKey.field}} in toolParams to reference previous step results

Return a structured plan with clear steps and dependencies.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goal: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tool: { type: Type.STRING },
                  toolParams: {
                    type: Type.OBJECT,
                    properties: {}
                  },
                  requiresConfirmation: { type: Type.BOOLEAN },
                  dependsOn: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  outputKey: { type: Type.STRING },
                  canRunParallel: { type: Type.BOOLEAN }
                },
                required: ["id", "description"]
              }
            },
            summary: { type: Type.STRING }
          },
          required: ["goal", "steps"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    return {
      id: Date.now().toString(),
      goal: result.goal || goal,
      steps: (result.steps || []).map((step: any, index: number) => ({
        id: step.id || `step_${index + 1}`,
        description: step.description,
        tool: step.tool,
        toolParams: step.toolParams,
        status: 'pending' as const,
        requiresConfirmation: step.requiresConfirmation || false,
        dependsOn: step.dependsOn || [],
        outputKey: step.outputKey,
        canRunParallel: step.canRunParallel ?? true,
        maxRetries: 2
      })),
      currentStepIndex: 0,
      status: 'planning' as const,
      summary: result.summary,
      stepResults: {}
    };
  } catch (error) {
    console.error("Gemini Task Planning Error", error);
    return null;
  }
};

/**
 * Translate text using Gemini
 * Called when the translate tool needs API support
 */
export const translateText = async (
  text: string,
  fromLang: string,
  toLang: string,
  apiKey: string
): Promise<string> => {
  try {
    const ai = getAI(apiKey);

    const langNames: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'auto': 'auto-detected language'
    };

    // 翻译使用 Flash（简单任务）
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `Translate the following text from ${langNames[fromLang] || fromLang} to ${langNames[toLang] || toLang}. 
Only return the translated text, nothing else.

Text: ${text}`,
      config: {
        systemInstruction: "You are a professional translator. Provide accurate, natural translations."
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Translation Error", error);
    return text;
  }
};

/**
 * Detect if a user request is a complex multi-step task
 */
export const detectComplexTask = async (
  text: string,
  apiKey: string
): Promise<{ isComplex: boolean; reason?: string }> => {
  try {
    const ai = getAI(apiKey);

    // 复杂度检测使用 Flash（快速判断）
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `Analyze if this request requires multiple steps to complete: "${text}"

A complex task typically involves:
- Planning or scheduling (e.g., "plan a trip", "organize my day")
- Multiple sequential actions (e.g., "book flight and hotel")
- Gathering information from multiple sources

A simple task is:
- Single action (e.g., "what's the weather", "translate this")
- Direct query (e.g., "calculate 15% tip")`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isComplex: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isComplex"]
        }
      }
    });

    return JSON.parse(response.text || '{"isComplex": false}');
  } catch (error) {
    console.error("Complex Task Detection Error", error);
    return { isComplex: false };
  }
};

/**
 * Analyze a user message for complex intents requiring multi-agent orchestration
 * Extracts structured context from natural language for travel, shopping, event planning, etc.
 */
export const analyzeComplexIntent = async (
  text: string,
  apiKey: string,
  conversationHistory: ConversationMessage[] = []
): Promise<IntentContext | null> => {
  try {
    const ai = getAI(apiKey);

    // Build context from history
    let historyContext = '';
    if (conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-4);
      historyContext = `\n\nRecent conversation:\n${recent.map(m =>
        `${m.role}: ${m.content}`
      ).join('\n')}`;
    }

    // Use Pro model for complex intent analysis
    const response = await ai.models.generateContent({
      model: MODELS.PRO,
      contents: `Analyze this user message for complex intent requiring multi-agent coordination:

"${text}"${historyContext}

Extract:
1. Primary intent (e.g., "日本旅行规划", "购买礼物", "周末聚会安排")
2. Category: travel, shopping, event, research, task, or other
3. Destinations (if any)
4. Time frame (start date/time, duration)
5. Budget (amount, currency, type: total/per_day/per_person)
6. Implied needs the user may not have explicitly stated (e.g., travel → flights, hotels, restaurants, attractions)
7. Any preferences the user explicitly mentioned

If the message is a simple query (weather, calculation, single search), return null for impliedNeeds.
Only return substantive multi-part intents that would benefit from coordinating multiple agents.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryIntent: { type: Type.STRING },
            category: {
              type: Type.STRING,
              enum: ['travel', 'shopping', 'event', 'research', 'task', 'other']
            },
            destinations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            timeframe: {
              type: Type.OBJECT,
              properties: {
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                duration: { type: Type.STRING },
                flexibility: { type: Type.STRING, enum: ['fixed', 'flexible', 'unknown'] }
              }
            },
            budget: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['total', 'per_day', 'per_person'] },
                flexibility: { type: Type.STRING, enum: ['strict', 'flexible', 'unknown'] }
              }
            },
            impliedNeeds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            userMentionedPrefs: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            participants: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER }
          },
          required: ['primaryIntent', 'category', 'impliedNeeds', 'confidence']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    // Only return if it's genuinely a complex intent (multiple implied needs)
    if (!result.impliedNeeds || result.impliedNeeds.length < 2) {
      return null;
    }

    return {
      primaryIntent: result.primaryIntent || text,
      category: result.category || 'other',
      destinations: result.destinations || [],
      timeframe: result.timeframe,
      budget: result.budget,
      impliedNeeds: result.impliedNeeds || [],
      userMentionedPrefs: result.userMentionedPrefs || [],
      participants: result.participants,
      confidence: result.confidence || 50
    };
  } catch (error) {
    console.error("Complex Intent Analysis Error", error);
    return null;
  }
};
