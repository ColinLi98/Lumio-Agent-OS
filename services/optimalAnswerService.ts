import { DecisionMeta, SoulMatrix, ServiceCard, TextDraft, OrchestrationPlan, SuperAgentSolution } from '../types.js';
import { getUserPreferences } from './personalizationService.js';
import { extractRoute } from './superAgentBrain.js';
import { getEnhancedDigitalAvatar } from './localStorageService.js';
import { BellmanContext, runBellmanPolicy } from './bellmanPolicyService.js';
import { soulArchitect } from './soulArchitectService.js';
import { createBeliefState } from './dtoe/twinBeliefStore.js';
import { createDefaultGoalStack } from './dtoe/coreSchemas.js';
import { solveBellmanWithOptions } from './dtoe/bellmanSolver.js';

// 职业决策关键词
const CAREER_KEYWORDS = ['辞职', '跳槽', '离职', '创业', '换工作', '找工作', '转行', '裸辞', '面试', '简历', 'offer', '加薪', '升职'];
const FINANCE_KEYWORDS = ['投资', '理财', '买房', '买车', '贷款', '股票', '基金', '保险'];

function isCareerDecision(query: string): boolean {
  return CAREER_KEYWORDS.some(kw => query.includes(kw));
}

function isFinanceDecision(query: string): boolean {
  return FINANCE_KEYWORDS.some(kw => query.includes(kw));
}

function isMajorDecision(query: string): boolean {
  return isCareerDecision(query) || isFinanceDecision(query);
}

type DtoeMajorEvaluation = {
  scores: Record<string, number>;
  recommendation: string;
  reasoning: string;
  failureProb: number;
  policyActionType: 'do' | 'ask' | 'wait' | 'commit';
  policyActionSummary: string;
};

function hashToSeed(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Ensure non-zero positive seed.
  return (hash >>> 0) || 42;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function inferPreferredOptionIndex(
  optionCount: number,
  actionType: 'do' | 'ask' | 'wait' | 'commit'
): number {
  if (optionCount <= 1) return 0;
  if (actionType === 'wait') return optionCount - 1;
  if (actionType === 'ask') return Math.min(1, optionCount - 1);
  return 0;
}

function evaluateMajorDecisionWithDtoe(
  query: string,
  options: string[],
  riskTolerance: 'low' | 'medium' | 'high'
): DtoeMajorEvaluation {
  const seed = hashToSeed(query);
  const belief = createBeliefState(`major_choice_${seed}`, seed, 500);
  const goals = createDefaultGoalStack(`major_choice_${seed}`);

  const solveResult = solveBellmanWithOptions(
    belief,
    goals,
    {
      time_budget_ms: 1200,
      coarse_scenarios: 120,
      fine_scenarios: 1200,
      cache: { enabled: false, ttl_ms: 300000 },
    },
    { seed }
  );

  const ranked = solveResult.ranked_actions.filter((s) => s.eligible);
  const top = ranked[0] ?? solveResult.ranked_actions[0];
  const failureProb = top ? Math.max(0, Math.min(1, top.failure_prob)) : 0.35;
  const actionType = top?.action.action_type ?? 'ask';
  const actionSummary = top?.action.summary ?? '建议先补充约束并谨慎推进';

  const preferredIdx = inferPreferredOptionIndex(options.length, actionType);
  const conservativeIdx = options.length - 1;
  const balancedIdx = Math.min(1, conservativeIdx);

  const scores: Record<string, number> = {};
  for (let i = 0; i < options.length; i++) {
    // Base distribution: preferred option gets strongest support.
    let score = i === preferredIdx ? 76 : (i === balancedIdx ? 66 : 58);

    // User risk preference adjustment.
    if (riskTolerance === 'high') {
      if (i === 0) score += 8;
      if (i === conservativeIdx) score -= 6;
    } else if (riskTolerance === 'low') {
      if (i === conservativeIdx) score += 9;
      if (i === 0) score -= 7;
    } else {
      if (i === balancedIdx) score += 6;
    }

    // Tail-risk aware adjustment from DTOE policy estimate.
    if (failureProb >= 0.35) {
      if (i === conservativeIdx) score += 12;
      if (i === 0) score -= 10;
    } else if (failureProb >= 0.2) {
      if (i === balancedIdx) score += 7;
    } else {
      if (i === 0) score += 6;
    }

    scores[options[i]] = clampScore(score);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const recommendation = sorted[0]?.[0] ?? options[0];

  return {
    scores,
    recommendation,
    reasoning:
      `DTOE policy action: ${actionSummary}；` +
      `失败概率估计 ${(failureProb * 100).toFixed(0)}%，已做风险偏好校准 (${riskTolerance})`,
    failureProb,
    policyActionType: actionType,
    policyActionSummary: actionSummary,
  };
}

type DecisionInput = {
  query: string;
  toolName: string;
  displayType: string;
  data: any;
};

type AgentDecisionInput = {
  query: string;
  outputType: 'DRAFTS' | 'CARDS' | 'SUPER_AGENT_RESULT' | 'ORCHESTRATION_RESULT';
  drafts?: TextDraft[];
  cards?: ServiceCard[];
  soul?: SoulMatrix;
  solution?: SuperAgentSolution;
  plan?: OrchestrationPlan;
  summary?: string;
  recommendation?: string;
};

type CandidateList = {
  items: any[];
  label: string;
};

const CUISINE_KEYWORDS = [
  '海鲜', '烧烤', '火锅', '日料', '寿司', '拉面', '粤菜', '川菜', '湘菜',
  '东北菜', '西餐', '法餐', '意大利', '韩餐', '烤肉', '小吃', '甜品'
];

const CITY_SPECIALTIES: Record<string, string[]> = {
  '大连': ['海鲜', '烧烤', '东北菜'],
  '北京': ['烤鸭', '京菜', '涮羊肉'],
  '上海': ['本帮菜', '生煎', '小吃'],
  '广州': ['粤菜', '早茶', '烧腊'],
  '成都': ['川菜', '火锅', '串串'],
  '西安': ['面食', '小吃', '肉夹馍'],
  '重庆': ['火锅', '江湖菜', '小面']
};

const DEFAULT_CUISINE_OPTIONS = ['海鲜', '烧烤', '东北菜', '火锅', '日料', '小吃'];
const BUDGET_OPTIONS = ['人均50-80', '人均80-150', '人均150-300', '人均300+'];
const OCCASION_OPTIONS = ['朋友聚会', '情侣约会', '家庭聚餐', '商务接待'];
const AREA_OPTIONS_BY_CITY: Record<string, string[]> = {
  '大连': ['星海广场附近', '中山广场附近', '东港附近', '高新区附近'],
  '北京': ['三里屯附近', '国贸附近', '后海附近', '五道口附近'],
  '上海': ['外滩附近', '静安寺附近', '陆家嘴附近', '徐家汇附近']
};

function normalizeCityKey(city?: string | null): string | null {
  if (!city) return null;
  const match = Object.keys(CITY_SPECIALTIES).find((key) => city.includes(key));
  return match || null;
}

function detectCity(query: string): string | null {
  const route = extractRoute(query);
  const candidate = route.destination || route.origin;
  if (candidate) return candidate;

  const match = query.match(/在([^\s]+?)(?:吃|美食|餐厅|饭店|小吃)/);
  if (match?.[1]) return match[1];

  const suffixMatch = query.match(/([^\s]+?)(?:美食|餐厅|饭店|小吃)/);
  if (suffixMatch?.[1]) return suffixMatch[1];

  return null;
}

function detectCuisine(query: string): string | null {
  return CUISINE_KEYWORDS.find((c) => query.includes(c)) || null;
}

function detectBudget(query: string): string | null {
  const match = query.match(/(人均|预算)?\s*(\d+)(元|¥|rmb|cny)?/i);
  if (match?.[2]) {
    return `人均${match[2]}元左右`;
  }
  return null;
}

function detectOccasion(query: string): string | null {
  if (/约会|情侣|浪漫|求婚/i.test(query)) return '约会';
  if (/商务|接待|客户/i.test(query)) return '商务';
  if (/家庭|亲子|带娃|长辈/i.test(query)) return '家庭';
  if (/朋友|聚会|团建/i.test(query)) return '朋友聚会';
  return null;
}

function detectAreaHint(query: string): boolean {
  return /附近|周边|市中心|市区|\S+区|\S+路|\S+街/.test(query);
}

function extractCandidates(data: any): CandidateList | null {
  if (Array.isArray(data?.places)) return { items: data.places, label: 'places' };
  if (Array.isArray(data?.restaurants)) return { items: data.restaurants, label: 'restaurants' };
  if (Array.isArray(data?.hotels)) return { items: data.hotels, label: 'hotels' };
  if (Array.isArray(data?.attractions)) return { items: data.attractions, label: 'attractions' };
  if (Array.isArray(data?.flights)) return { items: data.flights, label: 'flights' };
  if (Array.isArray(data?.results)) return { items: data.results, label: 'results' };
  if (Array.isArray(data?.options)) return { items: data.options, label: 'options' };
  return null;
}

function getCandidateName(candidate: any): string {
  return candidate?.name || candidate?.title || candidate?.airline || candidate?.hotel || candidate?.id || '推荐项';
}

function getCandidateScore(candidate: any): number {
  if (Number.isFinite(candidate?.matchScore)) return candidate.matchScore;
  if (Number.isFinite(candidate?.rating)) return Math.round(candidate.rating * 20);
  return 60;
}

function buildBasicReasons(candidate: any): string[] {
  const reasons: string[] = [];
  if (candidate?.matchReasons?.length) {
    return candidate.matchReasons.slice(0, 4);
  }
  if (Number.isFinite(candidate?.rating)) {
    reasons.push(`评分 ${candidate.rating} 分`);
  }
  if (candidate?.priceRange || candidate?.price) {
    reasons.push(`价格 ${candidate.priceRange || candidate.price}`);
  }
  if (candidate?.type) {
    reasons.push(candidate.type);
  }
  return reasons;
}

function mapRiskTolerance(value?: number): SoulMatrix['riskTolerance'] | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (value < 40) return 'Low';
  if (value < 70) return 'Medium';
  return 'High';
}

function mapPrivacyLevel(privacyConcern?: number, privacyMode?: boolean): SoulMatrix['privacyLevel'] | undefined {
  if (privacyMode) return 'Strict';
  if (!Number.isFinite(privacyConcern)) return undefined;
  if (privacyConcern > 70) return 'Strict';
  if (privacyConcern > 40) return 'Balanced';
  return 'Open';
}

function inferMissingFields(decision?: DecisionMeta | null): string[] {
  if (!decision?.followUpQuestions?.length) return [];
  return decision.followUpQuestions.slice(0, 4);
}

function detectGoalType(query: string): BellmanContext['goalType'] {
  if (/餐厅|美食|吃|饭|dining|restaurant/i.test(query)) return 'dining';
  if (/机票|航班|酒店|行程|旅行|travel|flight|hotel/i.test(query)) return 'travel';
  if (/购物|买|比价|shopping|purchase/i.test(query)) return 'shopping';
  return 'generic';
}

function buildBellmanContext(query: string, data: any, decision?: DecisionMeta | null): BellmanContext {
  const candidates = extractCandidates(data);
  const items = candidates?.items || [];
  let candidateCount = items.length;
  let averageScore = candidateCount > 0
    ? items.reduce((sum, item) => sum + getCandidateScore(item), 0) / candidateCount
    : 0;

  if (!candidateCount && Number.isFinite(data?.optimizationScore)) {
    candidateCount = Array.isArray(data?.results) ? data.results.length : 1;
    averageScore = data.optimizationScore;
  }

  const avatar = getEnhancedDigitalAvatar();
  const riskTolerance = mapRiskTolerance(avatar.personality?.riskTolerance);
  const privacyLevel = mapPrivacyLevel(avatar.valuesProfile?.privacyConcern, avatar.privacyMode);

  return {
    hasCandidates: candidateCount > 0,
    candidateCount,
    averageScore,
    missingFields: inferMissingFields(decision),
    riskTolerance,
    privacyLevel,
    goalType: detectGoalType(query)
  };
}

function attachBellmanPolicy(decision: DecisionMeta | null, context?: BellmanContext): DecisionMeta | null {
  if (!decision || !context) return decision;
  const bellman = runBellmanPolicy(context);
  return {
    ...decision,
    bellman
  };
}

function buildDecisionForDining(query: string, data: any): DecisionMeta | null {
  const candidates = extractCandidates(data);
  if (!candidates || candidates.items.length === 0) return null;

  const prefs = getUserPreferences();
  const rawCity = detectCity(query) || data?.query || '';
  const cityKey = normalizeCityKey(rawCity);
  const city = rawCity || '';
  const cuisine = detectCuisine(query);
  const budget = detectBudget(query);
  const occasion = detectOccasion(query);
  const areaHint = detectAreaHint(query);

  const sorted = [...candidates.items].sort((a, b) => getCandidateScore(b) - getCandidateScore(a));
  const best = sorted[0];
  const reasons = buildBasicReasons(best);

  const assumptions: string[] = [];
  if (!cuisine) {
    const citySpecial = cityKey ? CITY_SPECIALTIES[cityKey] : [];
    if (citySpecial.length > 0) {
      assumptions.push(`默认偏好当地特色：${citySpecial.join(' / ')}`);
    } else if (prefs.dining.cuisinePreferences.length > 0) {
      assumptions.push(`默认偏好菜系：${prefs.dining.cuisinePreferences.slice(0, 2).join(' / ')}`);
    }
  }
  if (!budget) {
    assumptions.push(`预算参考：${prefs.dining.priceRange === 'budget' ? '平价' : prefs.dining.priceRange === 'mid' ? '中等' : prefs.dining.priceRange === 'high' ? '偏高' : '高端'}`);
  }
  if (!occasion) {
    assumptions.push(`场景参考：${prefs.social.groupSize === 'couple' ? '情侣/两人' : '朋友小聚'}`);
  }
  if (!areaHint) {
    assumptions.push('默认优先交通方便的区域');
  }

  const followUps: string[] = [];
  if (!cuisine) followUps.push('偏好什么口味/菜系？');
  if (!budget) followUps.push('人均预算区间大概多少？');
  if (!occasion) followUps.push('是约会、家庭还是朋友聚会？');
  if (!areaHint) followUps.push(`希望在${city || '当地'}哪个区域或附近？`);

  const quickReplies: DecisionMeta['quickReplies'] = [];
  if (!cuisine) {
    const citySpecial = cityKey ? CITY_SPECIALTIES[cityKey] : [];
    const cuisineOptions = (citySpecial.length > 0 ? citySpecial : DEFAULT_CUISINE_OPTIONS).slice(0, 4);
    quickReplies.push({
      label: '口味/菜系',
      options: cuisineOptions.map((item) => `想吃${item}`)
    });
  }
  if (!budget) {
    quickReplies.push({ label: '预算', options: BUDGET_OPTIONS });
  }
  if (!occasion) {
    quickReplies.push({ label: '场景', options: OCCASION_OPTIONS });
  }
  if (!areaHint) {
    const areaOptions = (cityKey && AREA_OPTIONS_BY_CITY[cityKey])
      ? AREA_OPTIONS_BY_CITY[cityKey]
      : ['市中心附近', '地铁站附近', '景区附近', '酒店附近'];
    quickReplies.push({ label: '区域', options: areaOptions.slice(0, 4) });
  }

  const summary = `基于你的偏好，优先推荐「${getCandidateName(best)}」${city ? `（${city}）` : ''}。`;

  return {
    title: '最优解',
    summary,
    bestOption: best,
    reasons,
    criteria: ['口味匹配', '评分口碑', '价格合适', '场景氛围'],
    assumptions: assumptions.length ? assumptions : undefined,
    followUpQuestions: followUps.length ? followUps : undefined,
    quickReplies: quickReplies.length ? quickReplies : undefined,
    confidence: Math.min(95, Math.max(60, getCandidateScore(best)))
  };
}

function buildDecisionForGeneric(query: string, data: any): DecisionMeta | null {
  const candidates = extractCandidates(data);
  if (!candidates || candidates.items.length === 0) return null;

  const sorted = [...candidates.items].sort((a, b) => getCandidateScore(b) - getCandidateScore(a));
  const best = sorted[0];
  const reasons = buildBasicReasons(best);
  const summary = `优先推荐「${getCandidateName(best)}」作为当前最合适的选择。`;

  return {
    title: '最优解',
    summary,
    bestOption: best,
    reasons,
    confidence: Math.min(90, Math.max(55, getCandidateScore(best)))
  };
}

export function buildOptimalDecision(input: DecisionInput): DecisionMeta | null {
  const query = input.query || '';
  if (!input.data) return null;

  if (input.displayType === 'restaurant' || /餐厅|美食|吃|饭/.test(query)) {
    const decision = buildDecisionForDining(query, input.data);
    return attachBellmanPolicy(decision, buildBellmanContext(query, input.data, decision));
  }

  const decision = buildDecisionForGeneric(query, input.data);
  return attachBellmanPolicy(decision, buildBellmanContext(query, input.data, decision));
}

function scoreDraft(draft: TextDraft, query: string, soul?: SoulMatrix): { score: number; reasons: string[] } {
  let score = 50;
  const reasons: string[] = [];
  const tone = draft.tone?.toLowerCase() || '';
  const text = draft.text || '';

  const style = soul?.communicationStyle || 'Friendly';
  const styleMap: Record<string, string[]> = {
    Professional: ['professional', '正式', '商务', '礼貌', '客气'],
    Casual: ['casual', '轻松', '随意', '口语'],
    Friendly: ['friendly', '温暖', '亲切', '幽默', '贴心'],
    Concise: ['concise', '简洁', '简短', '直截了当']
  };
  const targetTone = styleMap[style] || [];
  if (targetTone.some((t) => tone.includes(t))) {
    score += 20;
    reasons.push('语气符合偏好');
  }

  if (/简短|简洁|短一点|少一点/.test(query)) {
    if (text.length <= 20) {
      score += 12;
      reasons.push('长度更简洁');
    }
  }
  if (/详细|多写|展开|丰富/.test(query)) {
    if (text.length >= 30) {
      score += 10;
      reasons.push('信息更充分');
    }
  }

  if (text.length >= 15 && text.length <= 60) {
    score += 6;
    reasons.push('长度适中');
  }

  return { score: Math.min(95, score), reasons };
}

function buildDecisionForDrafts(query: string, drafts: TextDraft[], soul?: SoulMatrix): DecisionMeta | null {
  if (!drafts || drafts.length === 0) return null;
  const scored = drafts.map((draft) => ({ draft, ...scoreDraft(draft, query, soul) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    title: '最优解',
    summary: `优先推荐这条草稿，更符合你的表达偏好。`,
    bestOption: { name: `草稿 ${drafts.indexOf(best.draft) + 1}`, text: best.draft.text },
    reasons: best.reasons,
    confidence: best.score
  };
}

function keywordOverlap(query: string, text: string): number {
  if (!query || !text) return 0;
  const tokens = query.split(/\s+/).filter(Boolean);
  let score = 0;
  tokens.forEach((token) => {
    if (text.includes(token)) score += 8;
  });
  return score;
}

function buildDecisionForCards(query: string, cards: ServiceCard[]): DecisionMeta | null {
  if (!cards || cards.length === 0) return null;
  const scored = cards.map((card) => {
    const text = `${card.title} ${card.subtitle || ''}`;
    const match = keywordOverlap(query, text);
    const score = Math.min(90, 60 + match);
    const reasons = [
      match > 0 ? '标题与需求匹配' : '入口直达',
      card.actionType === 'DEEPLINK' ? '操作更直达' : '信息更完整'
    ];
    return { card, score, reasons };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  return {
    title: '最优解',
    summary: `优先推荐「${best.card.title}」作为当前最合适的入口。`,
    bestOption: best.card,
    reasons: best.reasons,
    confidence: best.score
  };
}

function buildDecisionForSuperAgent(query: string, solution?: SuperAgentSolution, summary?: string, recommendation?: string): DecisionMeta | null {
  if (!solution) return null;
  const results = solution.results || [];
  const normalizedQuery = query || '';
  const flight = results.find(r => r.agentType === 'flight_booking')?.result;
  const hotel = results.find(r => r.agentType === 'hotel_booking')?.result;
  const restaurant = results.find(r => r.agentType === 'restaurant')?.result;
  const diningQuery = /餐厅|美食|吃|饭|dining|restaurant|food/i.test(normalizedQuery);

  if (restaurant && (diningQuery || (!flight && !hotel))) {
    const diningDecision = buildDecisionForDining(normalizedQuery || `${restaurant.destination || ''}美食`, restaurant);
    if (diningDecision) return diningDecision;
  }

  const bestOption = flight?.bestOption || flight?.flights?.[0] || hotel?.hotels?.[0] || results[0]?.result;
  const reasons: string[] = [];

  if (solution.optimizationScore) {
    reasons.push(`全局优化评分 ${solution.optimizationScore}%`);
  }
  if (flight?.bestOption?.matchScore) {
    reasons.push(`航班匹配度 ${flight.bestOption.matchScore}%`);
  }
  if (hotel?.hotels?.[0]?.matchScore) {
    reasons.push(`酒店匹配度 ${hotel.hotels[0].matchScore}%`);
  }

  const trimmedRecommendation = recommendation?.trim();
  const isGenericRecommendation = trimmedRecommendation
    ? /request completed|已完成请求|based on/i.test(trimmedRecommendation.toLowerCase())
    : false;
  const summaryText = !isGenericRecommendation && trimmedRecommendation
    ? trimmedRecommendation
    : summary || trimmedRecommendation || '综合你的偏好与全局优化结果，已给出最优方案。';

  return {
    title: '最优解',
    summary: summaryText,
    bestOption,
    reasons,
    confidence: Math.min(95, Math.max(60, solution.optimizationScore || 70))
  };
}

function buildDecisionForOrchestration(plan?: OrchestrationPlan): DecisionMeta | null {
  if (!plan?.consolidatedResult) return null;
  const recommendations = plan.consolidatedResult.recommendations || [];
  const summary = plan.consolidatedResult.summary || recommendations[0] || '已完成综合建议。';
  const bestOption = plan.consolidatedResult.sections?.[0]?.options?.[0];

  return {
    title: '最优解',
    summary,
    bestOption,
    reasons: recommendations.slice(0, 3),
    confidence: 75
  };
}

/**
 * 为职业/财务等重大决策构建决策元数据
 * 使用 Destiny Engine (Layer 3) 的输出
 */
function buildDecisionForMajorLifeChoice(query: string): DecisionMeta | null {
  // 确定决策类型和选项
  const isCareer = isCareerDecision(query);
  const isFinance = isFinanceDecision(query);
  
  let options: string[];
  let decisionType: string;
  
  if (isCareer) {
    decisionType = '职业规划';
    if (query.includes('创业')) {
      options = ['全职创业', '保持稳定工作', '边工作边准备'];
    } else if (query.includes('辞职') || query.includes('离职')) {
      options = ['立即辞职', '先找好下家再辞', '继续观望'];
    } else if (query.includes('跳槽') || query.includes('换工作')) {
      options = ['接受新机会', '留在现公司', '继续面试其他'];
    } else {
      options = ['积极行动', '稳步准备', '继续观望'];
    }
  } else if (isFinance) {
    decisionType = '财务决策';
    if (query.includes('投资') || query.includes('理财')) {
      options = ['激进投资', '稳健投资', '保守存款'];
    } else if (query.includes('买房') || query.includes('买车')) {
      options = ['现在购买', '继续攒钱', '先租后买'];
    } else {
      options = ['积极配置', '稳健配置', '观望等待'];
    }
  } else {
    return null;
  }
  
  // 获取用户画像
  const soulSummary = soulArchitect.getSoulSummary();
  const riskTolerance = soulSummary.keyTraits.riskTolerance;
  const evaluation = evaluateMajorDecisionWithDtoe(query, options, riskTolerance);
  
  // 构建推荐理由
  const reasons: string[] = [];
  
  // 根据评分差异给出理由
  const sortedScores = Object.entries(evaluation.scores).sort((a, b) => b[1] - a[1]);
  const bestScore = sortedScores[0][1];
  const secondScore = sortedScores[1]?.[1] || 0;
  
  if (bestScore - secondScore > 15) {
    reasons.push('明显优于其他选项');
  } else if (bestScore - secondScore > 5) {
    reasons.push('略优于其他选项');
  } else {
    reasons.push('各选项差距不大');
  }
  reasons.push(`DTOE 推荐动作: ${evaluation.policyActionSummary}`);
  reasons.push(`模型估计失败概率: ${(evaluation.failureProb * 100).toFixed(0)}%`);
  
  // 根据用户特征添加理由
  if (soulSummary.keyTraits.riskTolerance === 'high') {
    reasons.push('符合您的高风险偏好');
  } else if (soulSummary.keyTraits.riskTolerance === 'low') {
    reasons.push('考虑了您的风险规避');
  }
  
  if (soulSummary.topValues.length > 0) {
    reasons.push(`匹配核心价值观: ${soulSummary.topValues[0]}`);
  }
  
  // 构建后续问题
  const followUpQuestions: string[] = [];
  if (isCareer) {
    followUpQuestions.push('我的财务储备够吗？');
    followUpQuestions.push('有没有备选方案？');
    followUpQuestions.push('最坏情况是什么？');
  } else {
    followUpQuestions.push('我的风险承受能力如何？');
    followUpQuestions.push('这笔钱多久不会用？');
    followUpQuestions.push('有没有更稳妥的选择？');
  }
  
  // 构建快速回复选项
  const quickReplies = [
    {
      label: '选择路径',
      options: options
    },
    {
      label: '深入分析',
      options: ['分析风险', '计算成本', '查看时间线', '对比方案']
    }
  ];
  
  return {
    title: '最优解',
    summary: `${evaluation.recommendation}（${decisionType}）`,
    bestOption: {
      name: evaluation.recommendation,
      score: bestScore,
      reasoning: evaluation.reasoning
    },
    reasons,
    assumptions: [
      `基于您的风险偏好: ${riskTolerance}`,
      `当前压力水平: ${soulSummary.stressLevel}/100`
    ],
    followUpQuestions,
    quickReplies,
    confidence: Math.min(85, Math.max(55, bestScore)),
    bellman: {
      path: ['EXPAND_SEARCH', 'PROVIDE_ALTERNATIVES', 'RECOMMEND_BEST'],
      expectedValue: bestScore - 50
    }
  };
}

export function buildDecisionForAgentOutput(input: AgentDecisionInput): DecisionMeta | null {
  // 优先检测是否为重大人生决策（职业/财务）
  if (isMajorDecision(input.query)) {
    const majorDecision = buildDecisionForMajorLifeChoice(input.query);
    if (majorDecision) {
      return majorDecision;
    }
  }

  let decision: DecisionMeta | null = null;
  switch (input.outputType) {
    case 'DRAFTS':
      decision = buildDecisionForDrafts(input.query, input.drafts || [], input.soul);
      break;
    case 'CARDS':
      decision = buildDecisionForCards(input.query, input.cards || []);
      break;
    case 'SUPER_AGENT_RESULT':
      decision = buildDecisionForSuperAgent(input.query, input.solution, input.summary, input.recommendation);
      break;
    case 'ORCHESTRATION_RESULT':
      decision = buildDecisionForOrchestration(input.plan);
      break;
    default:
      return null;
  }

  if (!decision) return null;

  if (input.outputType === 'DRAFTS' || input.outputType === 'CARDS') {
    return decision;
  }

  const data = input.solution || input.plan || { results: input.cards || [] };
  return attachBellmanPolicy(decision, buildBellmanContext(input.query, data, decision));
}
