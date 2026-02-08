import { createHash } from 'node:crypto';
import { resetAgentMarketplace } from './agentMarketplaceService';
import type {
  AgentDescriptor,
  AgentDomain,
  CostTier,
  EvidenceLevel,
  MarketVisibility,
  PricingModel,
} from './agentMarketplaceTypes';
import { githubAppService } from './githubAppService';
import { lixAgentRegistryService } from './lixAgentRegistryService';
import type { DeliveredAgentManifest, ReviewDecision } from './lixTypes';

export interface GithubAgentManifestInput {
  name: string;
  description?: string;
  domains: string[];
  capabilities: string[];
  execute_ref: string;
  supports_realtime?: boolean;
  evidence_level?: EvidenceLevel;
  supports_parallel?: boolean;
  cost_tier?: CostTier;
  avg_latency_ms?: number;
  success_rate?: number;
  market_visibility?: MarketVisibility;
  pricing_model?: PricingModel;
  price_per_use_cny?: number;
}

export interface NormalizedGithubAgentManifest {
  name: string;
  description?: string;
  domains: AgentDomain[];
  capabilities: string[];
  execute_ref: string;
  supports_realtime: boolean;
  evidence_level: EvidenceLevel;
  supports_parallel: boolean;
  cost_tier: CostTier;
  avg_latency_ms?: number;
  success_rate?: number;
  market_visibility: MarketVisibility;
  pricing_model: PricingModel;
  price_per_use_cny: number;
}

export interface GithubManifestValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: NormalizedGithubAgentManifest;
}

export interface ImportFromGithubParams {
  user_id?: string;
  owner_id?: string;
  repo: string;
  manifest_path?: string;
  ref?: string;
  manifest_json?: unknown;
  delivery_mode_preference?: 'agent_collab' | 'human_expert' | 'hybrid';
}

export interface ImportFromGithubResult {
  descriptor: AgentDescriptor;
  manifest: DeliveredAgentManifest;
  review: ReviewDecision;
  repo: string;
  manifest_path: string;
  source: 'github_api' | 'inline';
}

const ALLOWED_DOMAINS = new Set<AgentDomain>([
  'recruitment',
  'travel',
  'finance',
  'health',
  'legal',
  'education',
  'shopping',
  'productivity',
  'local_service',
  'general',
]);

const ALLOWED_EVIDENCE_LEVELS = new Set<EvidenceLevel>(['none', 'weak', 'strong']);
const ALLOWED_COST_TIERS = new Set<CostTier>(['low', 'mid', 'high']);
const ALLOWED_MARKET_VISIBILITY = new Set<MarketVisibility>(['public', 'private']);
const ALLOWED_PRICING_MODELS = new Set<PricingModel>(['free', 'pay_per_use']);

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeDomain(value: string): AgentDomain | null {
  const normalized = String(value || '').trim().toLowerCase() as AgentDomain;
  if (!normalized) return null;
  return ALLOWED_DOMAINS.has(normalized) ? normalized : null;
}

function clampRate(value: unknown): number | undefined {
  if (!Number.isFinite(value as number)) return undefined;
  return Math.max(0, Math.min(1, Number(value)));
}

function clampLatency(value: unknown): number | undefined {
  if (!Number.isFinite(value as number)) return undefined;
  const ms = Math.floor(Number(value));
  return ms > 0 ? ms : undefined;
}

function isPrivateIpHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host) return true;
  if (host === 'localhost') return true;
  if (host === '0.0.0.0') return true;
  if (host === '127.0.0.1') return true;
  if (host === '::1') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host.endsWith('.local')) return true;
  return false;
}

export function validateGithubManifest(input: unknown): GithubManifestValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['manifest must be a JSON object'] };
  }
  const manifest = input as Partial<GithubAgentManifestInput>;
  const name = String(manifest.name || '').trim();
  if (!name) errors.push('name is required');

  const domains = toStringArray(manifest.domains)
    .map((value) => normalizeDomain(value))
    .filter((value): value is AgentDomain => Boolean(value));
  if (domains.length === 0) errors.push('domains must include at least one valid domain');

  const capabilities = toStringArray(manifest.capabilities);
  if (capabilities.length === 0) errors.push('capabilities must include at least one capability');

  const executeRef = String(manifest.execute_ref || '').trim();
  if (!executeRef) {
    errors.push('execute_ref is required');
  } else {
    try {
      const parsed = new URL(executeRef);
      if (parsed.protocol !== 'https:') {
        errors.push('execute_ref must be https');
      }
      if (isPrivateIpHost(parsed.hostname)) {
        errors.push('execute_ref host cannot be localhost or private network');
      }
    } catch {
      errors.push('execute_ref must be a valid https URL');
    }
  }

  const evidenceLevel = String(manifest.evidence_level || 'weak').trim() as EvidenceLevel;
  if (!ALLOWED_EVIDENCE_LEVELS.has(evidenceLevel)) {
    errors.push('evidence_level must be one of none|weak|strong');
  }
  const costTier = String(manifest.cost_tier || 'mid').trim() as CostTier;
  if (!ALLOWED_COST_TIERS.has(costTier)) {
    errors.push('cost_tier must be one of low|mid|high');
  }
  const marketVisibility = String(manifest.market_visibility || 'public').trim() as MarketVisibility;
  if (!ALLOWED_MARKET_VISIBILITY.has(marketVisibility)) {
    errors.push('market_visibility must be public|private');
  }
  const pricingModel = String(manifest.pricing_model || 'pay_per_use').trim() as PricingModel;
  if (!ALLOWED_PRICING_MODELS.has(pricingModel)) {
    errors.push('pricing_model must be free|pay_per_use');
  }

  const pricePerUse = Number.isFinite(manifest.price_per_use_cny as number)
    ? Math.max(0, Number(manifest.price_per_use_cny))
    : (pricingModel === 'free' ? 0 : 9);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      name,
      description: manifest.description ? String(manifest.description) : undefined,
      domains,
      capabilities,
      execute_ref: executeRef,
      supports_realtime: manifest.supports_realtime === true,
      evidence_level: evidenceLevel,
      supports_parallel: manifest.supports_parallel !== false,
      cost_tier: costTier,
      avg_latency_ms: clampLatency(manifest.avg_latency_ms),
      success_rate: clampRate(manifest.success_rate),
      market_visibility: marketVisibility,
      pricing_model: pricingModel,
      price_per_use_cny: pricePerUse,
    },
  };
}

function stableAgentId(repo: string, manifest: NormalizedGithubAgentManifest): string {
  const source = `${repo}|${manifest.name}|${manifest.execute_ref}`;
  const digest = createHash('sha1').update(source).digest('hex').slice(0, 18);
  return `ext:gh:${digest}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function importAgentFromGithub(params: ImportFromGithubParams): Promise<ImportFromGithubResult> {
  const userId = String(params.user_id || 'demo_user').trim() || 'demo_user';
  const ownerId = String(params.owner_id || userId).trim() || userId;
  const repo = String(params.repo || '').trim();
  if (!repo) {
    throw new Error('repo is required');
  }
  const manifestPath = String(params.manifest_path || '.lix/agent.manifest.json').trim() || '.lix/agent.manifest.json';

  let source: 'github_api' | 'inline' = 'inline';
  let manifestRaw: unknown = params.manifest_json;
  if (!manifestRaw) {
    const fetched = await githubAppService.readManifestFromRepo({
      user_id: userId,
      repo,
      manifest_path: manifestPath,
      ref: params.ref,
    });
    source = 'github_api';
    try {
      manifestRaw = JSON.parse(fetched.content);
    } catch (error) {
      throw new Error(`manifest_json_parse_failed:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const validation = validateGithubManifest(manifestRaw);
  if (!validation.valid || !validation.normalized) {
    throw new Error(`manifest_invalid:${validation.errors.join('; ')}`);
  }

  const normalized = validation.normalized;
  const submittedAt = nowIso();
  const agentId = stableAgentId(repo, normalized);
  const manifest: DeliveredAgentManifest = {
    intent_id: `github_import_${Date.now()}`,
    offer_id: `github_offer_${Date.now()}`,
    agent_id: agentId,
    name: normalized.name,
    description: normalized.description,
    execute_ref: normalized.execute_ref,
    domains: normalized.domains,
    capabilities: normalized.capabilities,
    supports_realtime: normalized.supports_realtime,
    evidence_level: normalized.evidence_level,
    supports_parallel: normalized.supports_parallel,
    cost_tier: normalized.cost_tier,
    avg_latency_ms: normalized.avg_latency_ms,
    success_rate: normalized.success_rate,
    owner_id: ownerId,
    submitted_by: 'github_import',
    submitted_at: submittedAt,
    market_visibility: normalized.market_visibility,
    pricing_model: normalized.pricing_model,
    price_per_use_cny: normalized.price_per_use_cny,
    github_repo: repo,
    manifest_path: manifestPath,
    delivery_mode_preference: params.delivery_mode_preference || 'hybrid',
  };

  const review: ReviewDecision = {
    intent_id: manifest.intent_id,
    offer_id: manifest.offer_id,
    agent_id: manifest.agent_id,
    reviewer_id: 'system_github',
    decision: 'approved',
    reason: `Imported from GitHub repo ${repo}`,
    reviewed_at: submittedAt,
  };

  const descriptor = lixAgentRegistryService.registerApprovedAgent(manifest, review);
  resetAgentMarketplace();

  return {
    descriptor,
    manifest,
    review,
    repo,
    manifest_path: manifestPath,
    source,
  };
}
