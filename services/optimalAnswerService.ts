import type { DecisionMeta } from '../types.js';

interface DecisionInput {
    query: string;
    toolName: string;
    displayType: string;
    data: any;
}

function extractCandidates(data: any): any[] {
    if (Array.isArray(data?.places)) return data.places;
    if (Array.isArray(data?.restaurants)) return data.restaurants;
    if (Array.isArray(data?.hotels)) return data.hotels;
    if (Array.isArray(data?.attractions)) return data.attractions;
    if (Array.isArray(data?.flights)) return data.flights;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.offers)) return data.offers;
    return [];
}

function candidateScore(candidate: any): number {
    if (Number.isFinite(candidate?.matchScore)) return Number(candidate.matchScore);
    if (Number.isFinite(candidate?.rating)) return Number(candidate.rating) * 20;
    if (Number.isFinite(candidate?.score)) return Number(candidate.score);
    return 60;
}

export function buildOptimalDecision(input: DecisionInput): DecisionMeta {
    const candidates = extractCandidates(input.data).slice();
    candidates.sort((a, b) => candidateScore(b) - candidateScore(a));
    const bestOption = candidates[0];
    const confidence = bestOption ? Math.max(60, Math.min(95, Math.round(candidateScore(bestOption)))) : 55;

    return {
        title: `${input.toolName} decision`,
        summary: bestOption
            ? `Selected the strongest current option for "${input.query}" based on available structured results.`
            : `No strong structured option is available yet for "${input.query}".`,
        bestOption,
        reasons: bestOption
            ? [
                'Structured results were ranked before answering.',
                'Higher-scoring or higher-rated candidates were preferred.',
                'Fallback guidance is preserved when no strong candidate exists.',
            ]
            : ['Need more structured results or user constraints before recommending a best option.'],
        assumptions: [
            `display_type=${input.displayType}`,
            'Ranking uses available scores/ratings only.',
        ],
        followUpQuestions: bestOption ? [] : ['Do you want to add budget, timing, or location constraints?'],
        quickReplies: [
            {
                label: 'Next',
                options: bestOption ? ['Compare alternatives', 'Refine filters'] : ['Add constraints', 'Try another provider'],
            },
        ],
        confidence,
    };
}
