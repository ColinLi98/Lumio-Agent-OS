/**
 * Live Execute API Endpoint - Vercel Serverless
 * 
 * POST /api/live-execute
 * 
 * Stub for Playwright executor with sensitive action blocking.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// Types
// ============================================================================

interface LiveExecuteRequest {
    task_description: string;
    target_url: string;
    step_budget?: number;
    timeout_ms?: number;
    require_user_approval?: boolean;
}

interface ActionStep {
    step_id: number;
    action_type: 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'extract';
    selector?: string;
    value?: string;
    timestamp: number;
    success: boolean;
    error?: string;
}

interface LiveExecuteResponse {
    success: boolean;
    action_trace: ActionStep[];
    extracted: Record<string, any>;
    blocked_reason?: string;
    requires_approval?: boolean;
    pending_action?: ActionStep;
}

// ============================================================================
// Helpers
// ============================================================================

const SENSITIVE_ACTIONS = ['login', 'payment', 'submit', 'purchase', 'checkout', 'confirm', 'pay', 'order'];

function isSensitiveAction(action: string, value?: string): boolean {
    const actionLower = action.toLowerCase();
    const valueLower = (value || '').toLowerCase();
    return SENSITIVE_ACTIONS.some(s => actionLower.includes(s) || valueLower.includes(s));
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const body = req.body as LiveExecuteRequest;

        const {
            task_description,
            target_url,
            step_budget = 10,
            timeout_ms = 30000,
            require_user_approval = true
        } = body;

        if (!task_description || !target_url) {
            res.status(400).json({
                success: false,
                error: { code: "BAD_REQUEST", message: "task_description and target_url required" }
            });
            return;
        }

        console.log(`[live-execute] Task: "${task_description}", URL: ${target_url}, Budget: ${step_budget}`);

        const trace: ActionStep[] = [];

        // Step 1: Navigate
        trace.push({
            step_id: 1,
            action_type: 'navigate',
            value: target_url,
            timestamp: Date.now(),
            success: true
        });

        // Check for sensitive action
        if (isSensitiveAction(task_description)) {
            const pendingAction: ActionStep = {
                step_id: 2,
                action_type: 'click',
                selector: '[data-action="submit"]',
                timestamp: Date.now(),
                success: false,
                error: 'Requires user approval'
            };

            res.status(200).json({
                success: false,
                action_trace: trace,
                extracted: {},
                requires_approval: true,
                pending_action: pendingAction,
                blocked_reason: 'Sensitive action requires user approval'
            } as LiveExecuteResponse);
            return;
        }

        // Mock extraction (stub - in production would use Playwright)
        const extracted = {
            page_title: 'Example Page',
            timestamp: Date.now(),
            note: 'Playwright execution not available in serverless environment'
        };

        res.status(200).json({
            success: true,
            action_trace: trace,
            extracted
        } as LiveExecuteResponse);

    } catch (error) {
        console.error('[live-execute] Error:', error);
        res.status(500).json({
            success: false,
            action_trace: [],
            extracted: {},
            blocked_reason: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
