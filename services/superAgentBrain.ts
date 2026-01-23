/**
 * Super Agent Brain - Global Optimizer & Meta-Orchestrator
 * 
 * This is the "Super Brain" that:
 * 1. Deeply analyzes user intent
 * 2. Decomposes complex problems into optimal sub-tasks
 * 3. Routes tasks to the best specialized agents
 * 4. Synthesizes results into global optimal solutions
 */

import { SpecializedAgentType } from '../types';
import { SPECIALIZED_AGENTS, executeSpecializedAgent } from './specializedAgents';

// ============================================================================
// Types
// ============================================================================

export interface SubTask {
    id: string;
    description: string;
    agentType: SpecializedAgentType;
    priority: number;  // 1 = highest
    dependsOn: string[];  // IDs of tasks this depends on
    params: Record<string, any>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
}

export interface TaskDecomposition {
    originalRequest: string;
    userIntent: string;
    implicitNeeds: string[];
    constraints: string[];
    subTasks: SubTask[];
    optimizationGoal: string;
    reasoning: string;
}

export interface GlobalSolution {
    success: boolean;
    summary: string;
    results: Array<{
        taskId: string;
        agentType: string;
        result: any;
    }>;
    recommendation: string;
    optimizationScore: number;  // 0-100
    reasoning: string;
    executionTime: number;
}

// ============================================================================
// Agent Registry with Capabilities
// ============================================================================

interface AgentCapability {
    type: SpecializedAgentType;
    domains: string[];
    capabilities: string[];
    costWeight: number;  // Lower = cheaper to use
    qualityWeight: number;  // Higher = better quality
}

const AGENT_CAPABILITIES: AgentCapability[] = [
    {
        type: 'flight_booking',
        domains: ['travel', 'transportation', 'flights', 'airlines'],
        capabilities: ['search flights', 'compare prices', 'book tickets'],
        costWeight: 0.8,
        qualityWeight: 0.9
    },
    {
        type: 'hotel_booking',
        domains: ['travel', 'accommodation', 'hotels', 'lodging'],
        capabilities: ['search hotels', 'compare prices', 'check availability'],
        costWeight: 0.7,
        qualityWeight: 0.9
    },
    {
        type: 'restaurant',
        domains: ['food', 'dining', 'restaurants', 'cuisine'],
        capabilities: ['find restaurants', 'check reviews', 'make reservations'],
        costWeight: 0.5,
        qualityWeight: 0.8
    },
    {
        type: 'attraction',
        domains: ['tourism', 'sightseeing', 'activities', 'entertainment'],
        capabilities: ['find attractions', 'get reviews', 'plan activities'],
        costWeight: 0.4,
        qualityWeight: 0.8
    },
    {
        type: 'weather',
        domains: ['weather', 'climate', 'forecast'],
        capabilities: ['get forecast', 'weather alerts', 'travel advice'],
        costWeight: 0.2,
        qualityWeight: 0.95
    },
    {
        type: 'itinerary',
        domains: ['planning', 'schedule', 'trip planning'],
        capabilities: ['create itinerary', 'optimize schedule', 'time management'],
        costWeight: 0.6,
        qualityWeight: 0.85
    },
    {
        type: 'translation',
        domains: ['language', 'translation', 'communication'],
        capabilities: ['translate text', 'language help'],
        costWeight: 0.3,
        qualityWeight: 0.9
    }
];

// ============================================================================
// Problem Analysis (using Gemini or pattern matching)
// ============================================================================

/**
 * Analyze user request and decompose into sub-tasks
 * Uses LLM when available, falls back to pattern matching
 */
export async function analyzeAndDecompose(
    userRequest: string,
    apiKey?: string
): Promise<TaskDecomposition> {
    // Try LLM-based analysis if API key available
    if (apiKey) {
        try {
            return await llmBasedDecomposition(userRequest, apiKey);
        } catch (e) {
            console.warn('LLM decomposition failed, using pattern matching:', e);
        }
    }

    // Fallback to pattern-based decomposition
    return patternBasedDecomposition(userRequest);
}

/**
 * LLM-based problem decomposition using Gemini
 */
async function llmBasedDecomposition(
    userRequest: string,
    apiKey: string
): Promise<TaskDecomposition> {
    const prompt = `You are a Super Agent Brain that decomposes complex user requests into optimal sub-tasks.

User Request: "${userRequest}"

Analyze this request and provide a JSON response with:
{
  "userIntent": "The true underlying need",
  "implicitNeeds": ["List of needs user didn't explicitly state but would want"],
  "constraints": ["Budget limits", "Time constraints", "Preferences"],
  "subTasks": [
    {
      "id": "t1",
      "description": "Task description",
      "agentType": "One of: flight_booking, hotel_booking, restaurant, attraction, weather, itinerary, translation",
      "priority": 1,
      "dependsOn": [],
      "params": {}
    }
  ],
  "optimizationGoal": "What 'optimal' means for this request",
  "reasoning": "Explanation of the decomposition strategy"
}

Think step by step about dependencies between tasks. For travel requests, weather should inform activity planning, flight costs should inform hotel budget, etc.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    maxOutputTokens: 2000
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
        originalRequest: userRequest,
        userIntent: parsed.userIntent,
        implicitNeeds: parsed.implicitNeeds || [],
        constraints: parsed.constraints || [],
        subTasks: parsed.subTasks.map((t: any) => ({
            ...t,
            status: 'pending' as const
        })),
        optimizationGoal: parsed.optimizationGoal,
        reasoning: parsed.reasoning
    };
}

/**
 * Pattern-based decomposition (fallback)
 */
function patternBasedDecomposition(userRequest: string): TaskDecomposition {
    const request = userRequest.toLowerCase();
    const subTasks: SubTask[] = [];
    let taskId = 0;

    // Detect travel/trip planning
    const isTravelRequest = /旅行|旅游|出行|行程|trip|travel|去.*(玩|旅)|planning/i.test(request);

    // Detect destination
    const destinations = ['东京', 'tokyo', '大阪', 'osaka', '北京', 'beijing', '上海', 'shanghai',
        '伦敦', 'london', '巴黎', 'paris', '纽约', 'new york'];
    const destination = destinations.find(d => request.includes(d.toLowerCase())) || 'destination';

    // Detect budget constraint
    const budgetMatch = request.match(/(\d+)\s*(?:万|k|元|¥|\$|日元|美元)/i);
    const budget = budgetMatch ? parseInt(budgetMatch[1]) : null;

    if (isTravelRequest) {
        // Weather first (no dependencies)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Check weather forecast for ${destination}`,
            agentType: 'weather',
            priority: 1,
            dependsOn: [],
            params: { destination },
            status: 'pending'
        });

        // Flights (no dependencies, can run parallel with weather)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Search flights to ${destination}`,
            agentType: 'flight_booking',
            priority: 1,
            dependsOn: [],
            params: { destination, budget },
            status: 'pending'
        });

        // Hotels (depends on flight cost for budget allocation)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Find hotels in ${destination}`,
            agentType: 'hotel_booking',
            priority: 2,
            dependsOn: ['t2'],  // Depends on flight result
            params: { destination },
            status: 'pending'
        });

        // Attractions (depends on weather)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Discover attractions in ${destination}`,
            agentType: 'attraction',
            priority: 2,
            dependsOn: ['t1'],  // Weather affects activity planning
            params: { destination },
            status: 'pending'
        });

        // Restaurants
        subTasks.push({
            id: `t${++taskId}`,
            description: `Find restaurants in ${destination}`,
            agentType: 'restaurant',
            priority: 3,
            dependsOn: [],
            params: { destination },
            status: 'pending'
        });

        // Final itinerary (depends on all)
        subTasks.push({
            id: `t${++taskId}`,
            description: `Create optimized itinerary for ${destination}`,
            agentType: 'itinerary',
            priority: 4,
            dependsOn: ['t1', 't2', 't3', 't4', 't5'],
            params: { destination },
            status: 'pending'
        });
    } else {
        // Single-domain request - detect best agent
        const agent = detectBestAgent(request);
        subTasks.push({
            id: 't1',
            description: userRequest,
            agentType: agent,
            priority: 1,
            dependsOn: [],
            params: extractParams(request),
            status: 'pending'
        });
    }

    return {
        originalRequest: userRequest,
        userIntent: isTravelRequest ? `Plan a trip to ${destination}` : 'Execute user request',
        implicitNeeds: isTravelRequest
            ? ['transportation', 'accommodation', 'activities', 'dining']
            : [],
        constraints: budget ? [`Budget: ${budget}`] : [],
        subTasks,
        optimizationGoal: isTravelRequest
            ? 'Minimize cost while maximizing experience quality'
            : 'Complete request efficiently',
        reasoning: isTravelRequest
            ? 'Decomposed into weather → flights/hotels → attractions → itinerary pipeline'
            : 'Single-task routing to best agent'
    };
}

/**
 * Detect the best agent for a request
 */
function detectBestAgent(request: string): SpecializedAgentType {
    const keywords: Record<SpecializedAgentType, string[]> = {
        'flight_booking': ['机票', 'flight', '航班', '飞机', 'airplane'],
        'hotel_booking': ['酒店', 'hotel', '住宿', 'accommodation'],
        'restaurant': ['餐厅', 'restaurant', '吃饭', '美食', 'food', 'dining'],
        'attraction': ['景点', 'attraction', '玩', '旅游', 'sightseeing'],
        'weather': ['天气', 'weather', '气温', 'temperature'],
        'itinerary': ['行程', 'itinerary', '规划', 'schedule', 'plan'],
        'translation': ['翻译', 'translate', '语言', 'language'],
        'transportation': ['交通', 'transport', '地铁', 'subway'],
        'shopping': ['购物', 'shopping', '买'],
        'social_search': ['找人', 'search', '搜索']
    };

    for (const [agent, words] of Object.entries(keywords)) {
        if (words.some(w => request.includes(w))) {
            return agent as SpecializedAgentType;
        }
    }

    return 'itinerary';  // Default
}

/**
 * Extract parameters from request
 */
function extractParams(request: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract destination
    const destMatch = request.match(/去|到|from|to\s+(\S+)/);
    if (destMatch) params.destination = destMatch[1];

    // Extract date
    const dateMatch = request.match(/(\d{1,2})[\/\-](\d{1,2})|下周|明天|next week|tomorrow/);
    if (dateMatch) params.date = dateMatch[0];

    return params;
}

// ============================================================================
// Task Execution Engine
// ============================================================================

/**
 * Execute all sub-tasks with dependency resolution
 */
export async function executeTaskPipeline(
    decomposition: TaskDecomposition,
    apiKey: string,
    onProgress?: (task: SubTask, status: string) => void
): Promise<GlobalSolution> {
    const startTime = Date.now();
    const results: GlobalSolution['results'] = [];
    const tasks = [...decomposition.subTasks];

    // Resolve dependencies and execute
    while (tasks.some(t => t.status === 'pending')) {
        // Find tasks that are ready (dependencies completed)
        const readyTasks = tasks.filter(t =>
            t.status === 'pending' &&
            t.dependsOn.every(depId => {
                const dep = tasks.find(dt => dt.id === depId);
                return dep?.status === 'completed';
            })
        );

        if (readyTasks.length === 0) {
            // No tasks ready - check for circular dependencies or all done
            if (tasks.every(t => t.status !== 'pending')) break;
            throw new Error('Circular dependency detected');
        }

        // Execute ready tasks in parallel
        await Promise.all(readyTasks.map(async (task) => {
            task.status = 'running';
            onProgress?.(task, 'running');

            try {
                // Prepare task with results from dependencies
                const depResults: Record<string, any> = {};
                for (const depId of task.dependsOn) {
                    const dep = tasks.find(t => t.id === depId);
                    if (dep?.result) {
                        depResults[dep.agentType] = dep.result;
                    }
                }

                // Execute agent
                const agentTask = {
                    agentType: task.agentType,
                    params: { ...task.params, previousResults: depResults },
                    appliedPreferences: []
                };

                const result = await executeSpecializedAgent(agentTask, apiKey);

                task.result = result;
                task.status = 'completed';
                results.push({
                    taskId: task.id,
                    agentType: task.agentType,
                    result: result.data
                });

                onProgress?.(task, 'completed');
            } catch (error) {
                task.status = 'failed';
                task.result = { error: String(error) };
                onProgress?.(task, 'failed');
            }
        }));
    }

    // Synthesize global solution
    const solution = synthesizeGlobalSolution(decomposition, results);
    solution.executionTime = Date.now() - startTime;

    return solution;
}

/**
 * Synthesize results into a global optimal solution
 */
function synthesizeGlobalSolution(
    decomposition: TaskDecomposition,
    results: GlobalSolution['results']
): GlobalSolution {
    const successfulResults = results.filter(r => r.result && !r.result.error);
    const totalTasks = decomposition.subTasks.length;
    const completedTasks = successfulResults.length;

    // Calculate optimization score
    let score = (completedTasks / totalTasks) * 100;

    // Generate summary
    const summaryParts: string[] = [];

    for (const result of successfulResults) {
        switch (result.agentType) {
            case 'flight_booking':
                const lowestFlight = result.result?.lowestPrice;
                if (lowestFlight) {
                    summaryParts.push(`✈️ Best flight: $${lowestFlight.price} via ${lowestFlight.source}`);
                }
                break;
            case 'hotel_booking':
                const hotels = result.result?.hotels;
                if (hotels?.[0]) {
                    summaryParts.push(`🏨 Top hotel: ${hotels[0].name} (${hotels[0].priceRange})`);
                }
                break;
            case 'weather':
                const weather = result.result?.forecast;
                if (weather?.[0]) {
                    summaryParts.push(`🌤️ Weather: ${weather[0].condition} ${weather[0].temp}`);
                }
                break;
            case 'attraction':
                const attractions = result.result?.attractions;
                if (attractions?.[0]) {
                    summaryParts.push(`🎯 Top attraction: ${attractions[0].name}`);
                }
                break;
        }
    }

    return {
        success: completedTasks === totalTasks,
        summary: summaryParts.join('\n'),
        results,
        recommendation: generateRecommendation(decomposition, results),
        optimizationScore: Math.round(score),
        reasoning: `Executed ${completedTasks}/${totalTasks} sub-tasks. ${decomposition.reasoning}`,
        executionTime: 0
    };
}

/**
 * Generate final recommendation
 */
function generateRecommendation(
    decomposition: TaskDecomposition,
    results: GlobalSolution['results']
): string {
    const destination = decomposition.subTasks[0]?.params?.destination || 'your destination';

    // Check if it's a travel request
    if (decomposition.userIntent.includes('trip') || decomposition.userIntent.includes('旅')) {
        const flightResult = results.find(r => r.agentType === 'flight_booking');
        const hotelResult = results.find(r => r.agentType === 'hotel_booking');

        let rec = `🎯 **Recommended Plan for ${destination}**\n\n`;

        if (flightResult?.result?.lowestPrice) {
            rec += `1. Book flight via ${flightResult.result.lowestPrice.source} at $${flightResult.result.lowestPrice.price}\n`;
        }

        if (hotelResult?.result?.hotels?.[0]) {
            rec += `2. Stay at ${hotelResult.result.hotels[0].name}\n`;
        }

        rec += `\n💡 This combination optimizes for ${decomposition.optimizationGoal}`;

        return rec;
    }

    return `✅ Request completed based on ${decomposition.optimizationGoal}`;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Super Agent Brain - Main orchestration function
 */
export async function superAgentOrchestrate(
    userRequest: string,
    apiKey: string,
    onProgress?: (task: SubTask, status: string) => void
): Promise<GlobalSolution> {
    console.log('🧠 Super Agent Brain: Analyzing request...');

    // Step 1: Analyze and decompose
    const decomposition = await analyzeAndDecompose(userRequest, apiKey);
    console.log('📝 Task Decomposition:', decomposition);

    // Step 2: Execute pipeline
    const solution = await executeTaskPipeline(decomposition, apiKey, onProgress);
    console.log('✅ Global Solution:', solution);

    return solution;
}

export default superAgentOrchestrate;
