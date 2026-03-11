import type { VercelRequest, VercelResponse } from '@vercel/node';

type TwinRecord = {
    version: number;
    updatedAtMs: number;
    statePacket: Record<string, unknown>;
    trajectory: Array<Record<string, unknown>>;
    syncedAtMs: number;
};

declare global {
    // eslint-disable-next-line no-var
    var __LUMI_TWIN_SYNC_STORE__: Map<string, TwinRecord> | undefined;
}

const twinStore: Map<string, TwinRecord> = globalThis.__LUMI_TWIN_SYNC_STORE__ || new Map<string, TwinRecord>();
globalThis.__LUMI_TWIN_SYNC_STORE__ = twinStore;

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value as Record<string, unknown>;
}

function asTrajectory(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => asObject(item))
        .slice(-64);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        const userId = String(req.query?.user_id || '').trim();
        if (!userId) {
            res.status(400).json({ success: false, error: 'missing_user_id' });
            return;
        }
        const record = twinStore.get(userId);
        if (!record) {
            res.status(404).json({ success: false, error: 'not_found' });
            return;
        }
        res.status(200).json({
            success: true,
            user_id: userId,
            version: record.version,
            updated_at_ms: record.updatedAtMs,
            state_packet: record.statePacket,
            trajectory: record.trajectory,
            synced_at_ms: record.syncedAtMs,
        });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'method_not_allowed' });
        return;
    }

    const body = asObject(req.body);
    const userId = String(body.user_id || '').trim();
    const localVersion = Number(body.local_version || 0);
    const updatedAtMs = Number(body.updated_at_ms || Date.now());
    const statePacket = asObject(body.state_packet);
    const trajectory = asTrajectory(body.trajectory);

    if (!userId) {
        res.status(400).json({ success: false, error: 'missing_user_id' });
        return;
    }
    if (!Number.isFinite(localVersion) || localVersion < 0) {
        res.status(400).json({ success: false, error: 'invalid_local_version' });
        return;
    }

    const existing = twinStore.get(userId);
    const existingVersion = existing?.version || 0;
    if (existing && localVersion < existingVersion) {
        res.status(409).json({
            success: false,
            conflict: true,
            status: 'conflict',
            version: existingVersion,
            updated_at_ms: existing.updatedAtMs,
        });
        return;
    }

    const nextVersion = Math.max(existingVersion, localVersion) + 1;
    const syncedAtMs = Date.now();
    twinStore.set(userId, {
        version: nextVersion,
        updatedAtMs,
        statePacket,
        trajectory,
        syncedAtMs,
    });

    res.status(200).json({
        success: true,
        status: 'synced',
        user_id: userId,
        version: nextVersion,
        synced_at_ms: syncedAtMs,
    });
}
