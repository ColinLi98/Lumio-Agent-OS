import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { getSuperAgent, type ReasoningModeInput } from '../../services/superAgentService.js';
import { adaptSuperAgentTaskGraphToKernel } from '../../services/agent-kernel/adapters.js';
import { getTaskGraphRuntime } from '../../services/agent-kernel/runtime.js';
import { getPolicyEngine } from '../../services/policy-engine/evaluator.js';
import { getCapsuleApprovalStore } from '../../services/policy-engine/capsuleApprovalStore.js';
import { incCounter } from '../../services/metricsCollector.js';
import {
    applyDecisionToCapsule,
    buildCapsule,
    type Capsule,
    type CapsuleRawContext,
} from '../../services/policy-engine/redaction.js';

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function resolveGeminiApiKey(body: any): string {
    const bodyKey = String(body?.api_key || '').trim();
    if (bodyKey) return bodyKey;
    const candidates = [
        process.env.GEMINI_API_KEY,
        process.env.LUMI_GEMINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        process.env.VITE_GEMINI_API_KEY,
        process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    ];
    for (const candidate of candidates) {
        const key = String(candidate || '').trim();
        if (key) return key;
    }
    return '';
}

function resolveReasoningMode(body: any): ReasoningModeInput {
    const raw = String(body?.reasoning_mode || body?.reasoningMode || '').trim().toLowerCase();
    if (raw === 'lite' || raw === 'full') return raw;
    return 'auto';
}

type AgentKernelRolloutReason =
    | 'forced_on'
    | 'forced_off'
    | 'full_enabled'
    | 'percentage_rollout'
    | 'disabled';

interface AgentKernelRolloutDecision {
    enabled: boolean;
    reason: AgentKernelRolloutReason;
    rollout_percent: number;
    bucket: number;
}

function parseRolloutPercent(value: unknown): number {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
}

function computeStableBucket(seed: string): number {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    const slice = hash.slice(0, 8);
    const number = Number.parseInt(slice, 16);
    if (!Number.isFinite(number)) return 0;
    return number % 100;
}

function resolveAgentKernelRollout(body: any, userId: string): AgentKernelRolloutDecision {
    const normalizedUserId = String(userId || '').trim() || 'demo_user';
    const bucket = computeStableBucket(normalizedUserId);

    if (body?.use_agent_kernel === false || body?.agent_kernel === false) {
        return {
            enabled: false,
            reason: 'forced_off',
            rollout_percent: 0,
            bucket,
        };
    }

    if (body?.use_agent_kernel === true || body?.agent_kernel === true) {
        return {
            enabled: true,
            reason: 'forced_on',
            rollout_percent: 100,
            bucket,
        };
    }

    const fullOn = String(process.env.SUPERAGENT_AGENT_KERNEL_ENABLED || '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(fullOn)) {
        return {
            enabled: true,
            reason: 'full_enabled',
            rollout_percent: 100,
            bucket,
        };
    }

    const rolloutPercent = parseRolloutPercent(
        process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT
            ?? process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT
            ?? 0
    );
    if (rolloutPercent <= 0) {
        return {
            enabled: false,
            reason: 'disabled',
            rollout_percent: 0,
            bucket,
        };
    }

    return {
        enabled: bucket < rolloutPercent,
        reason: 'percentage_rollout',
        rollout_percent: rolloutPercent,
        bucket,
    };
}

function normalizePrivacyLevel(value: unknown): 'low' | 'medium' | 'high' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'low' || normalized === 'high') return normalized;
    return 'medium';
}

function resolveCapsuleRawContext(body: any): CapsuleRawContext | undefined {
    const explicit = body?.capsule_raw_context && typeof body.capsule_raw_context === 'object'
        ? body.capsule_raw_context
        : body?.capsuleRawContext && typeof body.capsuleRawContext === 'object'
            ? body.capsuleRawContext
            : undefined;

    if (explicit) {
        return {
            app: String(explicit.app || body?.current_app || body?.currentApp || '').trim() || undefined,
            selectedText: typeof explicit.selectedText === 'string'
                ? explicit.selectedText
                : typeof explicit.selected_text === 'string'
                    ? explicit.selected_text
                    : undefined,
            entities: Array.isArray(explicit.entities) ? explicit.entities : undefined,
            attachments: Array.isArray(explicit.attachments) ? explicit.attachments : undefined,
            constraints: explicit.constraints && typeof explicit.constraints === 'object'
                ? explicit.constraints
                : undefined,
        };
    }

    const selectedText = String(
        body?.selected_text || body?.selectedText || body?.input_text || body?.inputText || ''
    );
    const entities = Array.isArray(body?.entities) ? body.entities : undefined;
    const attachments = Array.isArray(body?.attachments) ? body.attachments : undefined;
    if (!selectedText && !entities?.length && !attachments?.length) return undefined;

    return {
        app: String(body?.current_app || body?.currentApp || '').trim() || undefined,
        selectedText: selectedText || undefined,
        entities,
        attachments,
        constraints: body?.constraints && typeof body.constraints === 'object'
            ? body.constraints
            : undefined,
    };
}

function mergeDecisionIds(...sources: Array<unknown>): string[] {
    const merged: string[] = [];
    for (const source of sources) {
        if (!Array.isArray(source)) continue;
        for (const value of source) {
            const id = String(value || '').trim();
            if (!id || merged.includes(id)) continue;
            merged.push(id);
        }
    }
    return merged;
}

type PolicySyncStatus =
    | 'matched'
    | 'missing_client'
    | 'version_mismatch'
    | 'fingerprint_mismatch';

interface PolicySyncPayload {
    status: PolicySyncStatus;
    strict_enforced: boolean;
    server_policy_version: string;
    server_policy_fingerprint: string;
    client_policy_version?: string;
    client_policy_fingerprint?: string;
}

interface AgentKernelRolloutPayload {
    enabled: boolean;
    reason: AgentKernelRolloutReason;
    rollout_percent: number;
    bucket: number;
}

function resolvePolicySyncStrict(body: any): boolean {
    if (body?.require_policy_sync === true || body?.strict_policy_sync === true) return true;
    const envValue = String(process.env.POLICY_VERSION_STRICT || '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(envValue);
}

function buildPolicySyncPayload(
    policyEngine: ReturnType<typeof getPolicyEngine>,
    body: any
): PolicySyncPayload {
    const serverVersion = policyEngine.version();
    const serverFingerprint = policyEngine.fingerprint();
    const clientVersion = String(
        body?.client_policy_version || body?.policy_version || ''
    ).trim();
    const clientFingerprint = String(
        body?.client_policy_fingerprint || body?.policy_fingerprint || ''
    ).trim();
    const strictEnforced = resolvePolicySyncStrict(body);

    let status: PolicySyncStatus = 'matched';
    if (!clientVersion && !clientFingerprint) {
        status = 'missing_client';
    } else if (clientVersion && clientVersion !== serverVersion) {
        status = 'version_mismatch';
    } else if (clientFingerprint && clientFingerprint !== serverFingerprint) {
        status = 'fingerprint_mismatch';
    }

    return {
        status,
        strict_enforced: strictEnforced,
        server_policy_version: serverVersion,
        server_policy_fingerprint: serverFingerprint,
        client_policy_version: clientVersion || undefined,
        client_policy_fingerprint: clientFingerprint || undefined,
    };
}

function computeCapsuleRequestFingerprint(
    query: string,
    capsuleRawContext: CapsuleRawContext,
    dataContext: Record<string, unknown>
): string {
    const normalized = {
        query: String(query || '').trim(),
        app: String(capsuleRawContext.app || '').trim(),
        selected_text: String(capsuleRawContext.selectedText || '').slice(0, 2048),
        entities: Array.isArray(capsuleRawContext.entities)
            ? capsuleRawContext.entities.slice(0, 50)
            : [],
        egress_target: String(dataContext.egress_target || 'cloud'),
        contains_pii: Boolean(dataContext.contains_pii),
    };
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(normalized))
        .digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const body = req.body || {};
        const query = String(body?.query || body?.prompt || '').trim();
        if (!query) {
            res.status(400).json({ success: false, error: 'Missing required field: query' });
            return;
        }

        const superAgent = getSuperAgent();
        const key = resolveGeminiApiKey(body);
        const reasoningMode = resolveReasoningMode(body);
        if (!key) {
            res.status(503).json({
                success: false,
                error: 'gemini_api_key_missing',
            });
            return;
        }
        superAgent.setApiKey(key);

        const incomingPreferences = body?.preferences && typeof body.preferences === 'object'
            ? body.preferences as Record<string, any>
            : {};
        const locale = String(
            body?.locale ||
            body?.language ||
            body?.response_language ||
            body?.responseLanguage ||
            incomingPreferences.locale ||
            incomingPreferences.response_language ||
            'en-GB'
        ).trim() || 'en-GB';
        const statePacket = body?.state_packet && typeof body.state_packet === 'object'
            ? body.state_packet as Record<string, any>
            : body?.statePacket && typeof body.statePacket === 'object'
                ? body.statePacket as Record<string, any>
                : undefined;
        const preferences: Record<string, any> = {
            ...incomingPreferences,
            model_provider: 'gemini',
            locale,
            response_language: locale,
        };
        if (statePacket) {
            preferences.state_packet = statePacket;
        }
        const userId = String(body?.user_id || body?.userId || 'demo_user').trim() || 'demo_user';
        const kernelRolloutDecision = resolveAgentKernelRollout(body, userId);
        const kernelRolloutPayload: AgentKernelRolloutPayload = {
            enabled: kernelRolloutDecision.enabled,
            reason: kernelRolloutDecision.reason,
            rollout_percent: kernelRolloutDecision.rollout_percent,
            bucket: kernelRolloutDecision.bucket,
        };
        incCounter(
            'super_agent_agent_kernel_routing_total',
            {
                enabled: kernelRolloutPayload.enabled ? 'true' : 'false',
                reason: kernelRolloutPayload.reason,
                rollout_percent: String(kernelRolloutPayload.rollout_percent),
            },
            1,
            'Super-agent agent-kernel routing decisions'
        );

        const policyEngine = getPolicyEngine();
        const policySync = buildPolicySyncPayload(policyEngine, body);
        incCounter(
            'super_agent_policy_sync_total',
            { status: policySync.status },
            1,
            'Super-agent policy sync statuses'
        );
        if (policySync.strict_enforced && policySync.status !== 'matched') {
            incCounter(
                'super_agent_policy_sync_block_total',
                { status: policySync.status },
                1,
                'Super-agent requests blocked by strict policy sync'
            );
            res.status(409).json({
                success: false,
                error: 'policy_version_mismatch',
                policy_sync: policySync,
                agent_kernel_rollout: kernelRolloutPayload,
            });
            return;
        }

        const policyDecisionIds: string[] = [];
        let capsule: Capsule | undefined;
        let capsuleApprovalStatus: 'APPROVED' | undefined;
        let capsuleApprovalToken: string | undefined;
        const capsuleRawContext = resolveCapsuleRawContext(body);
        if (capsuleRawContext) {
            const capsuleApprovalStore = getCapsuleApprovalStore();
            const privacyLevel = normalizePrivacyLevel(
                body?.privacy_level || incomingPreferences.privacy_level || 'medium'
            );
            const permissions = body?.permissions && typeof body.permissions === 'object'
                ? body.permissions as Record<string, boolean>
                : incomingPreferences.permissions && typeof incomingPreferences.permissions === 'object'
                    ? incomingPreferences.permissions as Record<string, boolean>
                    : {};
            const dataContext = body?.data && typeof body.data === 'object'
                ? body.data as Record<string, unknown>
                : {};

            const rawCapsule = buildCapsule(capsuleRawContext, { privacy_level: privacyLevel }, query);
            const capsuleDecision = policyEngine.evaluate({
                phase: 'CAPSULE',
                intent: {
                    type: 'multi_step_task',
                    goal: query,
                    risk_level: 'medium',
                },
                user: {
                    privacy_level: privacyLevel,
                    confirm_threshold: normalizePrivacyLevel(
                        body?.confirm_threshold || incomingPreferences.confirm_threshold || 'medium'
                    ),
                    risk_tolerance: normalizePrivacyLevel(
                        body?.risk_tolerance || incomingPreferences.risk_tolerance || 'low'
                    ),
                },
                permissions,
                data: {
                    sensitivity: String(dataContext.sensitivity || 'medium') as 'low' | 'medium' | 'high',
                    contains_pii: Boolean(dataContext.contains_pii),
                    egress_target: String(dataContext.egress_target || 'cloud'),
                    fields: Array.isArray(dataContext.fields)
                        ? dataContext.fields.map((field) => String(field || '').trim()).filter(Boolean)
                        : [],
                },
                input: rawCapsule,
            });
            policyDecisionIds.push(capsuleDecision.id);
            const capsuleRequestFingerprint = computeCapsuleRequestFingerprint(
                query,
                capsuleRawContext,
                dataContext
            );

            if (capsuleDecision.action === 'DENY') {
                res.status(403).json({
                    success: false,
                    error: 'policy_denied',
                    reason: capsuleDecision.reason,
                    policy_decision_ids: policyDecisionIds,
                    policy_sync: policySync,
                    agent_kernel_rollout: kernelRolloutPayload,
                });
                return;
            }

            capsule = applyDecisionToCapsule(rawCapsule, capsuleDecision);
            preferences.policy_capsule = capsule;

            if (capsuleDecision.action === 'REQUIRE_APPROVAL') {
                const approvalToken = String(
                    body?.capsule_approval_token || body?.capsuleApprovalToken || ''
                ).trim();

                if (!approvalToken) {
                    const pending = capsuleApprovalStore.createPending({
                        policy_decision_id: capsuleDecision.id,
                        reason: capsuleDecision.reason,
                        request_fingerprint: capsuleRequestFingerprint,
                    });
                    res.status(200).json({
                        success: true,
                        runtime_status: 'WAITING_USER',
                        current_wait: {
                            node_id: 'capsule_approval',
                            type: 'approval',
                            expires_at: pending.expires_at,
                        },
                        capsule_approval_token: pending.token,
                        policy_decision_ids: policyDecisionIds,
                        approval_reason: capsuleDecision.reason,
                        capsule,
                        policy_sync: policySync,
                        agent_kernel_rollout: kernelRolloutPayload,
                    });
                    return;
                }

                const approvalRecord = capsuleApprovalStore.get(approvalToken);
                if (!approvalRecord) {
                    res.status(400).json({
                        success: false,
                        error: 'capsule_approval_token_not_found',
                        policy_decision_ids: policyDecisionIds,
                        policy_sync: policySync,
                        agent_kernel_rollout: kernelRolloutPayload,
                    });
                    return;
                }

                if (approvalRecord.status === 'WAITING') {
                    res.status(200).json({
                        success: true,
                        runtime_status: 'WAITING_USER',
                        current_wait: {
                            node_id: 'capsule_approval',
                            type: 'approval',
                            expires_at: approvalRecord.expires_at,
                        },
                        capsule_approval_token: approvalRecord.token,
                        policy_decision_ids: policyDecisionIds,
                        approval_reason: capsuleDecision.reason,
                        capsule,
                        policy_sync: policySync,
                        agent_kernel_rollout: kernelRolloutPayload,
                    });
                    return;
                }

                if (approvalRecord.status === 'REJECTED') {
                    res.status(403).json({
                        success: false,
                        error: 'capsule_approval_rejected',
                        policy_decision_ids: policyDecisionIds,
                        policy_sync: policySync,
                        agent_kernel_rollout: kernelRolloutPayload,
                    });
                    return;
                }

                if (approvalRecord.status === 'EXPIRED') {
                    res.status(400).json({
                        success: false,
                        error: 'capsule_approval_token_expired',
                        policy_decision_ids: policyDecisionIds,
                        policy_sync: policySync,
                        agent_kernel_rollout: kernelRolloutPayload,
                    });
                    return;
                }

                try {
                    capsuleApprovalStore.ensureApproved(approvalToken, capsuleRequestFingerprint);
                } catch (approvalError) {
                    res.status(400).json({
                        success: false,
                        error: approvalError instanceof Error
                            ? approvalError.message
                            : 'capsule_approval_validation_failed',
                        policy_decision_ids: policyDecisionIds,
                        policy_sync: policySync,
                        agent_kernel_rollout: kernelRolloutPayload,
                    });
                    return;
                }
                capsuleApprovalStatus = 'APPROVED';
                capsuleApprovalToken = approvalToken;
            }
        }

        const result = await superAgent.processWithReAct(query, {
            userId,
            currentApp: String(body?.current_app || body?.currentApp || 'android_app').trim() || 'android_app',
            recentQueries: toStringArray(body?.recent_queries || body?.recentQueries).slice(0, 12),
            preferences,
            locale,
        }, reasoningMode);

        let runtimeEnvelope: {
            runtime_task_id?: string;
            runtime_status?: 'RUNNING' | 'WAITING_USER' | 'DONE' | 'FAILED' | 'CANCELLED';
            current_wait?: {
                node_id: string;
                type: 'approval' | 'ask_user';
                expires_at?: number;
            };
            policy_decision_ids?: string[];
        } = {};

        const kernelEnabled = kernelRolloutPayload.enabled;
        if (kernelEnabled && result?.task_graph?.tasks?.length) {
            try {
                const runtime = getTaskGraphRuntime();
                const runtimeGraph = adaptSuperAgentTaskGraphToKernel(
                    result.task_graph,
                    query,
                    String(body?.runtime_task_id || '').trim() || undefined
                );
                const created = await runtime.createTask(runtimeGraph);
                await runtime.runTask(created.task_state.task_id);
                const snapshot = await runtime.getTaskSnapshot(created.task_state.task_id);
                if (snapshot) {
                    const runtimeStatus = String(snapshot.task_state.status || '').toLowerCase() || 'unknown';
                    incCounter(
                        'super_agent_agent_kernel_runtime_total',
                        { status: runtimeStatus },
                        1,
                        'Super-agent agent-kernel runtime outcomes'
                    );
                    runtimeEnvelope = {
                        runtime_task_id: snapshot.task_state.task_id,
                        runtime_status: snapshot.task_state.status,
                        current_wait: snapshot.task_state.current_wait
                            ? {
                                node_id: snapshot.task_state.current_wait.node_id,
                                type: snapshot.task_state.current_wait.type,
                                expires_at: snapshot.task_state.current_wait.expires_at,
                            }
                            : undefined,
                        policy_decision_ids: snapshot.policy_decision_ids,
                    };
                } else {
                    incCounter(
                        'super_agent_agent_kernel_runtime_total',
                        { status: 'snapshot_missing' },
                        1,
                        'Super-agent agent-kernel runtime outcomes'
                    );
                }
            } catch (kernelError) {
                incCounter(
                    'super_agent_agent_kernel_runtime_total',
                    { status: 'execution_error' },
                    1,
                    'Super-agent agent-kernel runtime outcomes'
                );
                console.error('[super-agent/execute] agent-kernel execution failed:', kernelError);
            }
        } else if (kernelEnabled) {
            incCounter(
                'super_agent_agent_kernel_runtime_total',
                { status: 'no_graph' },
                1,
                'Super-agent agent-kernel runtime outcomes'
            );
        }

        const mergedPolicyDecisionIds = mergeDecisionIds(
            policyDecisionIds,
            runtimeEnvelope.policy_decision_ids,
            (result as unknown as Record<string, unknown>)?.policy_decision_ids
        );

        res.status(200).json({
            success: true,
            ...result,
            ...runtimeEnvelope,
            policy_decision_ids: mergedPolicyDecisionIds,
            capsule,
            capsule_approval_token: capsuleApprovalToken,
            capsule_approval_status: capsuleApprovalStatus,
            policy_sync: policySync,
            agent_kernel_rollout: kernelRolloutPayload,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'internal_error',
        });
    }
}
