import type { SoulMatrix, EnhancedDigitalAvatar } from '../types';
import { loadData, saveData, StorageKeys, getEnhancedDigitalAvatar, saveEnhancedDigitalAvatar } from './localStorageService';

export type DigitalSoulStats = {
    styleWeights: Record<SoulMatrix['communicationStyle'], number>;
    riskScore: number;
    draftsAccepted: number;
    draftsEdited: number;
    lastUpdatedAt: number;
};

export type PassiveLearningEvent =
    | { type: 'draft_accept'; tone?: string }
    | { type: 'draft_edit'; tone?: string; editRatio: number }
    | { type: 'card_click'; scoreHint?: number }
    | { type: 'card_dismiss' }
    | { type: 'query_refine' }
    | { type: 'confirm_send' };

export type DigitalSoulBootstrapSource = 'questionnaire' | 'import' | 'skip' | 'passive';

const DEFAULT_SOUL: SoulMatrix = {
    communicationStyle: 'Professional',
    riskTolerance: 'Low',
    privacyLevel: 'Balanced',
    spendingPreference: 'Balanced'
};

const DEFAULT_STATS: DigitalSoulStats = {
    styleWeights: {
        Professional: 0.25,
        Friendly: 0.25,
        Casual: 0.25,
        Concise: 0.25
    },
    riskScore: 0.5,
    draftsAccepted: 0,
    draftsEdited: 0,
    lastUpdatedAt: Date.now()
};

const EMA_ALPHA = 0.12;

const DIGITAL_SOUL_BOOTSTRAPPED_KEY = 'lumi_digital_soul_bootstrapped';

export function getDigitalSoul(): SoulMatrix {
    return loadData<SoulMatrix>(StorageKeys.DIGITAL_SOUL) || DEFAULT_SOUL;
}

export function saveDigitalSoul(soul: SoulMatrix): void {
    saveData(StorageKeys.DIGITAL_SOUL, soul);
}

export function isDigitalSoulBootstrapped(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DIGITAL_SOUL_BOOTSTRAPPED_KEY) === 'true';
}

export function markDigitalSoulBootstrapped(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DIGITAL_SOUL_BOOTSTRAPPED_KEY, 'true');
}

export function initializeDigitalSoul(options: {
    communicationStyle: SoulMatrix['communicationStyle'];
    riskTolerance: SoulMatrix['riskTolerance'];
    privacyLevel: SoulMatrix['privacyLevel'];
    spendingPreference?: SoulMatrix['spendingPreference'];
    bootstrapSource?: DigitalSoulBootstrapSource;
}): SoulMatrix {
    const soul: SoulMatrix = {
        communicationStyle: options.communicationStyle,
        riskTolerance: options.riskTolerance,
        privacyLevel: options.privacyLevel,
        spendingPreference: options.spendingPreference || 'Balanced'
    };
    saveDigitalSoul(soul);
    syncDigitalSoulToEnhancedAvatar(soul, options.bootstrapSource ?? 'questionnaire');
    return soul;
}

function mapRiskToleranceToScore(riskTolerance: SoulMatrix['riskTolerance']): number {
    if (riskTolerance === 'Low') return 30;
    if (riskTolerance === 'High') return 75;
    return 55;
}

function mapPrivacyLevelToConcern(privacyLevel: SoulMatrix['privacyLevel']): number {
    if (privacyLevel === 'Strict') return 85;
    if (privacyLevel === 'Open') return 40;
    return 65;
}

function mapCommunicationToFormality(style: SoulMatrix['communicationStyle']): EnhancedDigitalAvatar['communicationStyle']['formality'] {
    if (style === 'Professional') return 'formal';
    if (style === 'Casual') return 'casual';
    return 'adaptive';
}

function mapSourceToLifeDataSource(source: DigitalSoulBootstrapSource): EnhancedDigitalAvatar['lifeState']['dataSource'] {
    if (source === 'questionnaire') return 'questionnaire';
    if (source === 'import') return 'inferred';
    if (source === 'passive') return 'mixed';
    return 'manual';
}

function ensureBootstrapMilestone(avatar: EnhancedDigitalAvatar, source: DigitalSoulBootstrapSource): void {
    const milestoneId = 'digital_soul_bootstrap_v3';
    if (avatar.milestones.some((m) => m.id === milestoneId)) return;

    const sourceLabel = source === 'import'
        ? '文本导入'
        : source === 'questionnaire'
            ? '问卷场景'
            : source === 'passive'
                ? '被动学习'
                : '最小基线';

    avatar.milestones.push({
        id: milestoneId,
        type: 'achievement',
        title: '🧬 数字分身已初始化',
        description: `冷启动完成（来源：${sourceLabel}）`,
        timestamp: Date.now(),
    });
}

export function syncDigitalSoulToEnhancedAvatar(
    soul: SoulMatrix,
    source: DigitalSoulBootstrapSource = 'questionnaire'
): void {
    const avatar = getEnhancedDigitalAvatar();
    const riskScore = mapRiskToleranceToScore(soul.riskTolerance);
    const priceVsQuality = spendingPreferenceToPriceVsQuality(soul.spendingPreference);

    avatar.personality.riskTolerance = Math.round(avatar.personality.riskTolerance * 0.4 + riskScore * 0.6);
    avatar.communicationStyle.formality = mapCommunicationToFormality(soul.communicationStyle);
    avatar.communicationStyle.directness = soul.communicationStyle === 'Concise'
        ? 78
        : soul.communicationStyle === 'Professional'
            ? 68
            : soul.communicationStyle === 'Casual'
                ? 45
                : 58;
    avatar.communicationStyle.humorUsage = soul.communicationStyle === 'Friendly'
        ? clamp(avatar.communicationStyle.humorUsage + 12, 0, 100)
        : clamp(avatar.communicationStyle.humorUsage - 4, 0, 100);

    avatar.valuesProfile.priceVsQuality = priceVsQuality;
    avatar.valuesProfile.privacyConcern = mapPrivacyLevelToConcern(soul.privacyLevel);
    avatar.valuesProfile.stability = soul.riskTolerance === 'Low'
        ? clamp(avatar.valuesProfile.stability + 8, 0, 100)
        : soul.riskTolerance === 'High'
            ? clamp(avatar.valuesProfile.stability - 4, 0, 100)
            : avatar.valuesProfile.stability;
    avatar.valuesProfile.growth = soul.riskTolerance === 'High'
        ? clamp(avatar.valuesProfile.growth + 6, 0, 100)
        : avatar.valuesProfile.growth;

    avatar.destinyPreferences.riskAppetite = riskScore;
    avatar.destinyPreferences.gamma = soul.riskTolerance === 'Low'
        ? 0.95
        : soul.riskTolerance === 'High'
            ? 0.9
            : 0.92;

    const completenessFloor =
        source === 'import' ? 40 :
            source === 'questionnaire' ? 34 :
                source === 'passive' ? 22 : 15;

    avatar.lifeState.dataSource = mapSourceToLifeDataSource(source);
    avatar.lifeState.lastUpdated = Date.now();
    avatar.lifeState.completeness = Math.max(avatar.lifeState.completeness || 0, completenessFloor);
    avatar.profileCompleteness = Math.max(avatar.profileCompleteness || 0, completenessFloor);

    ensureBootstrapMilestone(avatar, source);
    saveEnhancedDigitalAvatar(avatar);
}

export function ensureDigitalSoulColdStartBaseline(
    source: DigitalSoulBootstrapSource = 'skip'
): SoulMatrix {
    const current = getDigitalSoul();
    return initializeDigitalSoul({
        communicationStyle: current.communicationStyle,
        riskTolerance: current.riskTolerance,
        privacyLevel: current.privacyLevel,
        spendingPreference: current.spendingPreference,
        bootstrapSource: source,
    });
}

/**
 * 从消费偏好值(-50 到 50)转换为 SoulMatrix 的 spendingPreference
 * PRD: 价格优先(-50) / 均衡(0) / 品质优先(+50)
 */
export function priceVsQualityToSpendingPreference(value: number): SoulMatrix['spendingPreference'] {
    if (value < -20) return 'PriceFirst';
    if (value > 20) return 'QualityFirst';
    return 'Balanced';
}

/**
 * 从 spendingPreference 转换为数值
 */
export function spendingPreferenceToPriceVsQuality(pref: SoulMatrix['spendingPreference']): number {
    switch (pref) {
        case 'PriceFirst': return -50;
        case 'QualityFirst': return 50;
        default: return 0;
    }
}

export function getDigitalSoulStats(): DigitalSoulStats {
    return loadData<DigitalSoulStats>(StorageKeys.DIGITAL_SOUL_STATS) || { ...DEFAULT_STATS };
}

function saveDigitalSoulStats(stats: DigitalSoulStats): void {
    saveData(StorageKeys.DIGITAL_SOUL_STATS, stats);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeWeights(weights: Record<SoulMatrix['communicationStyle'], number>): void {
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
    (Object.keys(weights) as Array<SoulMatrix['communicationStyle']>).forEach((key) => {
        weights[key] = clamp(weights[key] / total, 0.05, 0.85);
    });
    const normalizedTotal = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
    (Object.keys(weights) as Array<SoulMatrix['communicationStyle']>).forEach((key) => {
        weights[key] = weights[key] / normalizedTotal;
    });
}

function boostStyle(weights: Record<SoulMatrix['communicationStyle'], number>, style: SoulMatrix['communicationStyle'], strength = 1): void {
    (Object.keys(weights) as Array<SoulMatrix['communicationStyle']>).forEach((key) => {
        weights[key] = weights[key] * (1 - EMA_ALPHA * 0.6);
    });
    weights[style] = weights[style] + EMA_ALPHA * clamp(strength, 0.2, 1);
    normalizeWeights(weights);
}

function penalizeStyle(weights: Record<SoulMatrix['communicationStyle'], number>, style: SoulMatrix['communicationStyle'], severity: number): void {
    const penalty = EMA_ALPHA * clamp(severity, 0.2, 1);
    weights[style] = clamp(weights[style] - penalty, 0.05, 0.85);
    normalizeWeights(weights);
}

function normalizeTone(tone?: string): SoulMatrix['communicationStyle'] | null {
    if (!tone) return null;
    const value = tone.toLowerCase();
    if (/professional|formal|正式|商务|礼貌/.test(value)) return 'Professional';
    if (/casual|轻松|随意|口语/.test(value)) return 'Casual';
    if (/concise|简洁|简短|精炼/.test(value)) return 'Concise';
    if (/friendly|温暖|亲切|幽默|warm|humor/.test(value)) return 'Friendly';
    return null;
}

function styleFromWeights(weights: Record<SoulMatrix['communicationStyle'], number>): SoulMatrix['communicationStyle'] {
    return (Object.keys(weights) as Array<SoulMatrix['communicationStyle']>)
        .sort((a, b) => weights[b] - weights[a])[0];
}

function riskToleranceFromScore(score: number): SoulMatrix['riskTolerance'] {
    if (score < 0.4) return 'Low';
    if (score < 0.7) return 'Medium';
    return 'High';
}

function syncEnhancedAvatar(soul: SoulMatrix, stats: DigitalSoulStats): void {
    syncDigitalSoulToEnhancedAvatar(soul, 'passive');
    const avatar = getEnhancedDigitalAvatar();
    avatar.personality.riskTolerance = Math.round(stats.riskScore * 100);
    saveEnhancedDigitalAvatar(avatar);
}

export function applyPassiveLearningEvent(event: PassiveLearningEvent): SoulMatrix {
    const soul = getDigitalSoul();
    const stats = getDigitalSoulStats();

    switch (event.type) {
        case 'draft_accept': {
            const style = normalizeTone(event.tone) || soul.communicationStyle;
            boostStyle(stats.styleWeights, style, 1);
            stats.draftsAccepted += 1;
            stats.riskScore = clamp(stats.riskScore + 0.02, 0.1, 0.9);
            break;
        }
        case 'draft_edit': {
            const style = normalizeTone(event.tone) || soul.communicationStyle;
            penalizeStyle(stats.styleWeights, style, event.editRatio);
            stats.draftsEdited += 1;
            stats.riskScore = clamp(stats.riskScore - 0.03 * event.editRatio, 0.1, 0.9);
            break;
        }
        case 'card_click':
            stats.riskScore = clamp(stats.riskScore + 0.04, 0.1, 0.9);
            break;
        case 'card_dismiss':
            stats.riskScore = clamp(stats.riskScore - 0.04, 0.1, 0.9);
            break;
        case 'query_refine':
            stats.riskScore = clamp(stats.riskScore - 0.05, 0.1, 0.9);
            break;
        case 'confirm_send':
            stats.riskScore = clamp(stats.riskScore + 0.01, 0.1, 0.9);
            break;
    }

    stats.lastUpdatedAt = Date.now();
    const updatedSoul: SoulMatrix = {
        ...soul,
        communicationStyle: styleFromWeights(stats.styleWeights),
        riskTolerance: riskToleranceFromScore(stats.riskScore)
    };

    saveDigitalSoul(updatedSoul);
    saveDigitalSoulStats(stats);
    syncEnhancedAvatar(updatedSoul, stats);

    return updatedSoul;
}

export function calculateEditRatio(original: string, revised: string): number {
    const a = original.trim();
    const b = revised.trim();
    if (!a && !b) return 0;
    if (!a || !b) return 1;
    if (a === b) return 0;
    const distance = levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return clamp(distance / maxLen, 0, 1);
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
}
