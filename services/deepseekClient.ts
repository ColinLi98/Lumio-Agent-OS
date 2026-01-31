/**
 * DeepSeek API Client - OpenAI Compatible Interface
 * 
 * DeepSeek API uses OpenAI-compatible format.
 * Base URL: https://api.deepseek.com
 */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export interface DeepSeekMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: DeepSeekToolCall[];
    tool_call_id?: string;
}

export interface DeepSeekToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface DeepSeekTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    };
}

export interface DeepSeekChatRequest {
    model: string;
    messages: DeepSeekMessage[];
    tools?: DeepSeekTool[];
    tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

export interface DeepSeekChatResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: DeepSeekMessage;
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class DeepSeekClient {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chat(request: DeepSeekChatRequest): Promise<DeepSeekChatResponse> {
        console.log('[DeepSeek] Sending request:', {
            model: request.model,
            messagesCount: request.messages.length,
            toolsCount: request.tools?.length || 0
        });

        const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                ...request,
                stream: false // We don't support streaming yet
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[DeepSeek] API Error:', response.status, errorText);
            throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Log response for debugging
        console.log('[DeepSeek] Response:', {
            id: data.id,
            model: data.model,
            choicesCount: data.choices?.length || 0,
            hasContent: !!data.choices?.[0]?.message?.content,
            hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
            finishReason: data.choices?.[0]?.finish_reason
        });

        return data;
    }
}

// Singleton instance
let deepSeekClient: DeepSeekClient | null = null;
let currentApiKey: string = '';

export function getDeepSeekClient(apiKey?: string): DeepSeekClient {
    if (apiKey && apiKey !== currentApiKey) {
        currentApiKey = apiKey;
        deepSeekClient = new DeepSeekClient(apiKey);
    }
    if (!deepSeekClient) {
        throw new Error('DeepSeek client not initialized. Call with apiKey first.');
    }
    return deepSeekClient;
}

export function setDeepSeekApiKey(apiKey: string): void {
    currentApiKey = apiKey;
    deepSeekClient = new DeepSeekClient(apiKey);
    console.log('[DeepSeek] Client initialized');
}
