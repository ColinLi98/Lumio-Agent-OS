export interface EngagementOpportunity {
    shouldEngage: boolean;
    relevanceScore: number;
    reason: string;
}

export interface GeneratedPromotionReply {
    body: string;
}

export class PromotionContentGenerator {
    async analyzeEngagementOpportunity(
        _postTitle: string,
        commentBody: string,
        _subreddit: string,
        _apiKey: string,
    ): Promise<EngagementOpportunity> {
        return {
            shouldEngage: commentBody.trim().length > 12,
            relevanceScore: Math.min(100, Math.max(40, commentBody.trim().length)),
            reason: 'Fallback engagement heuristic applied.',
        };
    }

    async generateReply(context: string, subreddit: string, _apiKey: string): Promise<GeneratedPromotionReply> {
        return {
            body: `Thanks for the comment in r/${subreddit}. ${context.slice(0, 80)}`.trim(),
        };
    }
}

export const contentGenerator = new PromotionContentGenerator();
