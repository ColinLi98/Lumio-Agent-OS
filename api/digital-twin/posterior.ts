import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

type TwinRecord = {
    version: number;
    updatedAtMs: number;
    statePacket: Record<string, unknown>;
    trajectory: Array<Record<string, unknown>>;
    syncedAtMs: number;
};

type PosteriorDimension = {
    key: string;
    label: string;
    mean: number;
    p10: number;
    p90: number;
    source: string;
};

type PosteriorRecord = {
    syncVersion: number;
    syncUpdatedAtMs: number;
    posteriorVersion: number;
    particleCount: number;
    updatedAtMs: number;
    confidence: number;
    trendSeries: number[];
    dimensions: PosteriorDimension[];
    traceId: string;
};

declare global {
    // eslint-disable-next-line no-var
    var __LUMI_TWIN_SYNC_STORE__: Map<string, TwinRecord> | undefined;
    // eslint-disable-next-line no-var
    var __LUMI_TWIN_POSTERIOR_STORE__: Map<string, PosteriorRecord> | undefined;
}

const DEFAULT_PARTICLE_COUNT = 500;
const DEFAULT_TREND = [0.46, 0.49, 0.51, 0.53, 0.56];
const DIMENSION_SPECS: Array<{ key: string; label: string }> = [
    { key: 'wealth', label: 'Wealth' },
    { key: 'health', label: 'Health' },
    { key: 'skill', label: 'Skill' },
    { key: 'energy', label: 'Energy' },
    { key: 'social', label: 'Social' },
    { key: 'career', label: 'Career' },
    { key: 'reputation', label: 'Reputation' },
    { key: 'time_buffer', label: 'Time Buffer' },
    { key: 'stress', label: 'Stress' },
    { key: 'optionality', label: 'Optionality' },
    { key: 'life_satisfaction', label: 'Life Satisfaction' },
    { key: 'affect_balance', label: 'Affect Balance' },
    { key: 'meaning_score', label: 'Meaning Score' },
];

const twinStore: Map<string, TwinRecord> = globalThis.__LUMI_TWIN_SYNC_STORE__ || new Map<string, TwinRecord>();
const posteriorStore: Map<string, PosteriorRecord> = globalThis.__LUMI_TWIN_POSTERIOR_STORE__ || new Map<string, PosteriorRecord>();
globalThis.__LUMI_TWIN_SYNC_STORE__ = twinStore;
globalThis.__LUMI_TWIN_POSTERIOR_STORE__ = posteriorStore;

function withCors(res: VercelResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num;
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function weighted(...parts: Array<[number, number]>): number {
    const totalWeight = parts.reduce((acc, [w]) => acc + w, 0);
    if (totalWeight <= 0) return 0.5;
    const weightedSum = parts.reduce((acc, [w, value]) => acc + w * value, 0);
    return clamp01(weightedSum / totalWeight);
}

function stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    const variance = values.reduce((acc, value) => acc + (value - mean) * (value - mean), 0) / values.length;
    return Math.sqrt(Math.max(0, variance));
}

function quantile(sortedValues: number[], q: number): number {
    if (sortedValues.length === 0) return 0.5;
    const idx = Math.max(0, Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * q)));
    return sortedValues[idx];
}

class SeededRng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    random(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    normal(mean = 0, std = 1): number {
        const u1 = Math.max(this.random(), 1e-12);
        const u2 = this.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z0 * std;
    }
}

function stableSeed(userId: string, syncVersion: number, updatedAtMs: number): number {
    const digest = crypto.createHash('sha256')
        .update(`${userId}|${syncVersion}|${updatedAtMs}`)
        .digest('hex')
        .slice(0, 8);
    const parsed = Number.parseInt(digest, 16);
    return Number.isFinite(parsed) ? parsed : 1_337;
}

function parseTrendSeries(trajectory: Array<Record<string, unknown>>): number[] {
    const points = trajectory
        .slice(-24)
        .map((item) => clamp01(asNumber(item.value, 0.5)));
    return points.length > 0 ? points : DEFAULT_TREND.slice();
}

function stateSignals(statePacketRaw: Record<string, unknown>): {
    risk: number;
    energy: number;
    contextLoad: number;
    stress: number;
    focus: number;
    affect: number;
    stateCoverage: number;
} {
    const l1 = asObject(statePacketRaw.l1);
    const l2 = asObject(statePacketRaw.l2);
    const l3 = asObject(statePacketRaw.l3);

    const risk = clamp01(asNumber(l1.risk_preference, 0.5));
    const energy = clamp01(asNumber(l2.energy_level, 0.5));
    const contextLoad = clamp01(asNumber(l2.context_load, 0.5));
    const stress = clamp01(asNumber(l3.stress_score, (1 - energy) * 100) / 100);
    const focus = clamp01(asNumber(l3.focus_score, (1 - contextLoad) * 100) / 100);
    const affect = clamp01((asNumber(l3.polarity, 0) + 1) / 2);

    const sourceValues = [l1.risk_preference, l2.energy_level, l2.context_load, l3.stress_score, l3.focus_score, l3.polarity];
    const observed = sourceValues.filter((value) => Number.isFinite(Number(value))).length;
    const stateCoverage = observed / sourceValues.length;

    return { risk, energy, contextLoad, stress, focus, affect, stateCoverage };
}

function baseDimensionMeans(statePacketRaw: Record<string, unknown>): Record<string, number> {
    const signals = stateSignals(statePacketRaw);
    const traitFinance = 0.5;
    const traitHealth = 0.5;
    const traitSkill = 0.5;
    const traitSocial = 0.5;
    const traitCareer = 0.5;
    const traitTrust = 0.5;
    const traitPlanning = 0.5;
    const traitExploration = 0.5;
    const traitMeaning = 0.5;

    const wealth = weighted(
        [0.35, traitFinance],
        [0.20, 1 - signals.stress],
        [0.20, signals.risk],
        [0.15, signals.focus],
        [0.10, 1 - signals.contextLoad]
    );
    const health = weighted(
        [0.40, signals.energy],
        [0.30, 1 - signals.stress],
        [0.20, signals.affect],
        [0.10, traitHealth]
    );
    const skill = weighted(
        [0.45, traitSkill],
        [0.35, signals.focus],
        [0.20, 1 - signals.contextLoad]
    );
    const social = weighted(
        [0.45, traitSocial],
        [0.25, signals.affect],
        [0.15, 1 - signals.stress],
        [0.15, signals.focus]
    );
    const career = weighted(
        [0.30, skill],
        [0.25, wealth],
        [0.20, signals.focus],
        [0.15, traitCareer],
        [0.10, 1 - signals.stress]
    );
    const reputation = weighted(
        [0.45, traitTrust],
        [0.25, social],
        [0.15, skill],
        [0.15, 1 - signals.stress]
    );
    const timeBuffer = weighted(
        [0.55, 1 - signals.contextLoad],
        [0.20, signals.focus],
        [0.15, signals.energy],
        [0.10, traitPlanning]
    );
    const optionality = weighted(
        [0.35, traitExploration],
        [0.20, 1 - signals.stress],
        [0.20, timeBuffer],
        [0.15, wealth],
        [0.10, signals.risk]
    );
    const meaning = weighted(
        [0.45, traitMeaning],
        [0.20, signals.focus],
        [0.20, social],
        [0.15, skill]
    );
    const lifeSatisfaction = weighted(
        [0.30, health],
        [0.20, wealth],
        [0.20, social],
        [0.15, signals.affect],
        [0.15, meaning]
    );

    return {
        wealth,
        health,
        skill,
        energy: signals.energy,
        social,
        career,
        reputation,
        time_buffer: timeBuffer,
        stress: signals.stress,
        optionality,
        life_satisfaction: lifeSatisfaction,
        affect_balance: signals.affect,
        meaning_score: meaning,
    };
}

function spreadForDimension(key: string, baseSpread: number): number {
    switch (key) {
        case 'stress':
        case 'affect_balance':
            return Math.min(0.30, baseSpread + 0.03);
        case 'wealth':
        case 'career':
        case 'reputation':
            return Math.min(0.30, baseSpread + 0.02);
        default:
            return baseSpread;
    }
}

function buildParticles(
    means: Record<string, number>,
    particleCount: number,
    seed: number,
    baseSpread: number
): Array<Record<string, number>> {
    const rng = new SeededRng(seed);
    const particles: Array<Record<string, number>> = [];

    for (let i = 0; i < particleCount; i++) {
        const latent = rng.normal(0, baseSpread * 0.18);
        const particle: Record<string, number> = {};
        for (const spec of DIMENSION_SPECS) {
            const spread = spreadForDimension(spec.key, baseSpread);
            const sigma = spread / 1.2815515655446004;
            const jitter = rng.normal(0, sigma) + latent;
            particle[spec.key] = clamp01((means[spec.key] ?? 0.5) + jitter);
        }
        particles.push(particle);
    }
    return particles;
}

function summarizeDimensions(particles: Array<Record<string, number>>): PosteriorDimension[] {
    return DIMENSION_SPECS.map((spec) => {
        const values = particles
            .map((particle) => clamp01(asNumber(particle[spec.key], 0.5)))
            .sort((a, b) => a - b);
        const mean = values.reduce((acc, value) => acc + value, 0) / Math.max(1, values.length);
        return {
            key: spec.key,
            label: spec.label,
            mean: clamp01(mean),
            p10: clamp01(quantile(values, 0.1)),
            p90: clamp01(quantile(values, 0.9)),
            source: 'cloud_particle_filter',
        };
    });
}

function computePosterior(userId: string, record: TwinRecord, previous?: PosteriorRecord): PosteriorRecord {
    const trendSeries = parseTrendSeries(record.trajectory);
    const trendVolatility = stdDev(trendSeries);
    const signals = stateSignals(record.statePacket);
    const trajectoryCoverage = Math.min(1, trendSeries.length / 14);
    const confidence = clamp01(
        0.20 + weighted(
            [0.45, signals.stateCoverage],
            [0.35, trajectoryCoverage],
            [0.20, 1 - Math.min(1, trendVolatility / 0.35)]
        ) * 0.80
    );
    const baseSpread = Math.max(0.06, Math.min(0.28, 0.22 - confidence * 0.12 + trendVolatility * 0.18));
    const means = baseDimensionMeans(record.statePacket);
    const seed = stableSeed(userId, record.version, record.updatedAtMs);
    const particles = buildParticles(means, DEFAULT_PARTICLE_COUNT, seed, baseSpread);
    const dimensions = summarizeDimensions(particles);
    const posteriorVersion = previous?.posteriorVersion ? previous.posteriorVersion + 1 : 1;
    const traceId = `twin_posterior_${crypto.createHash('sha1').update(`${userId}:${record.version}:${posteriorVersion}`).digest('hex').slice(0, 12)}`;

    return {
        syncVersion: record.version,
        syncUpdatedAtMs: record.updatedAtMs,
        posteriorVersion,
        particleCount: DEFAULT_PARTICLE_COUNT,
        updatedAtMs: Date.now(),
        confidence,
        trendSeries,
        dimensions,
        traceId,
    };
}

function resolveUserId(req: VercelRequest): string {
    if (req.method === 'GET') {
        return String(req.query?.user_id || '').trim();
    }
    const body = asObject(req.body);
    return String(body.user_id || '').trim();
}

function sendPosterior(
    res: VercelResponse,
    userId: string,
    record: TwinRecord,
    posterior: PosteriorRecord
): void {
    res.status(200).json({
        success: true,
        user_id: userId,
        sync_version: record.version,
        posterior_version: posterior.posteriorVersion,
        particle_count: posterior.particleCount,
        updated_at_ms: posterior.updatedAtMs,
        confidence: posterior.confidence,
        trend_series: posterior.trendSeries,
        dimensions: posterior.dimensions,
        trace_id: posterior.traceId,
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    withCors(res);
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'method_not_allowed' });
        return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
        res.status(400).json({ success: false, error: 'missing_user_id' });
        return;
    }

    const syncRecord = twinStore.get(userId);
    if (!syncRecord) {
        res.status(404).json({ success: false, error: 'not_found' });
        return;
    }

    const cached = posteriorStore.get(userId);
    if (cached &&
        cached.syncVersion === syncRecord.version &&
        cached.syncUpdatedAtMs === syncRecord.updatedAtMs
    ) {
        sendPosterior(res, userId, syncRecord, cached);
        return;
    }

    const next = computePosterior(userId, syncRecord, cached);
    posteriorStore.set(userId, next);
    sendPosterior(res, userId, syncRecord, next);
}
