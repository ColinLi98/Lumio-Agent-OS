/**
 * Promotion Agent Types - 推广 Agent 类型定义
 *
 * Defines all types for the Lumi social media promotion system,
 * including Reddit integration, A2A protocol, and content generation.
 */

// ============================================================================
// Reddit Types
// ============================================================================

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

export interface RedditPost {
  id?: string;
  subreddit: string;
  title: string;
  body: string;
  flair?: string;
  url?: string;
  /** 'self' for text posts, 'link' for link posts */
  kind: 'self' | 'link';
}

export interface RedditComment {
  id?: string;
  parentId: string;
  body: string;
  subreddit: string;
}

export interface RedditSubmission {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url: string;
}

export interface RedditSearchResult {
  submissions: RedditSubmission[];
  total: number;
}

// ============================================================================
// Promotion Content Types
// ============================================================================

export type ContentType =
  | 'tech_review'        // 技术评测
  | 'tutorial'           // 使用教程
  | 'comparison'         // 对比分析
  | 'discussion'         // 讨论帖
  | 'comment_reply'      // 回复评论
  | 'ama'                // Ask Me Anything
  | 'case_study';        // 使用案例

export type ContentLanguage = 'en' | 'zh' | 'bilingual';

export type ContentTone =
  | 'technical'          // 技术性
  | 'casual'             // 轻松随意
  | 'professional'       // 专业正式
  | 'enthusiastic'       // 热情推荐
  | 'analytical';        // 分析评测

export interface PromotionContent {
  id: string;
  type: ContentType;
  language: ContentLanguage;
  tone: ContentTone;
  title: string;
  body: string;
  /** Structured metadata for AI parsability */
  a2aMetadata?: A2AContentMetadata;
  /** Target subreddits for this content */
  targetSubreddits: string[];
  /** Keywords for SEO / AI discoverability */
  keywords: string[];
  /** Generated timestamp */
  generatedAt: number;
  /** Whether this content has been reviewed by a human */
  humanReviewed: boolean;
}

export interface ContentGenerationRequest {
  type: ContentType;
  language: ContentLanguage;
  tone: ContentTone;
  targetSubreddit: string;
  /** Context: what topic or question to address */
  topic?: string;
  /** For comment replies: the parent post/comment text */
  parentContext?: string;
  /** Focus Lumi features to highlight */
  lumiFeatures?: LumiFeature[];
  /** Max length in characters */
  maxLength?: number;
}

export type LumiFeature =
  | 'smart_keyboard'
  | 'intent_commerce'
  | 'lix_marketplace'
  | 'digital_soul'
  | 'destiny_engine'
  | 'decision_support'
  | 'price_compare'
  | 'multi_agent'
  | 'privacy_first';

// ============================================================================
// Promotion Task & Scheduling
// ============================================================================

export type TaskStatus = 'pending' | 'generating' | 'ready' | 'publishing' | 'published' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PromotionTask {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Content generation request */
  request: ContentGenerationRequest;
  /** Generated content (filled after generation) */
  content?: PromotionContent;
  /** Reddit post/comment result (filled after publishing) */
  result?: PublishResult;
  /** Scheduled publish time (epoch ms) */
  scheduledAt?: number;
  /** Actual publish time (epoch ms) */
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
}

export interface PublishResult {
  platform: 'reddit';
  postId: string;
  permalink: string;
  subreddit: string;
  /** Metrics snapshot */
  metrics?: PostMetrics;
}

export interface PostMetrics {
  upvotes: number;
  downvotes: number;
  comments: number;
  views?: number;
  /** Engagement rate = (upvotes + comments) / views */
  engagementRate?: number;
  lastUpdated: number;
}

// ============================================================================
// Target Subreddit Configuration
// ============================================================================

export interface SubredditTarget {
  name: string;
  /** Why this subreddit is relevant */
  relevance: string;
  /** Preferred content types for this subreddit */
  preferredContentTypes: ContentType[];
  /** Posting frequency limit (posts per week) */
  maxPostsPerWeek: number;
  /** Self-promotion rules for this sub */
  selfPromoRules: string;
  /** Language preference */
  language: ContentLanguage;
  /** Minimum account age/karma required */
  requirements?: {
    minAccountAgeDays?: number;
    minKarma?: number;
  };
}

/** Default target subreddits for Lumi promotion */
export const DEFAULT_SUBREDDIT_TARGETS: SubredditTarget[] = [
  {
    name: 'artificial',
    relevance: 'AI technology discussion',
    preferredContentTypes: ['tech_review', 'discussion', 'comparison'],
    maxPostsPerWeek: 1,
    selfPromoRules: 'Limited self-promotion, must contribute to discussion',
    language: 'en',
  },
  {
    name: 'AI_Agents',
    relevance: 'AI Agent ecosystem - core target audience',
    preferredContentTypes: ['tech_review', 'case_study', 'discussion'],
    maxPostsPerWeek: 2,
    selfPromoRules: 'Agent showcases allowed with substance',
    language: 'en',
  },
  {
    name: 'productivity',
    relevance: 'Productivity tools and workflows',
    preferredContentTypes: ['tutorial', 'case_study', 'comparison'],
    maxPostsPerWeek: 1,
    selfPromoRules: 'Must provide genuine value',
    language: 'en',
  },
  {
    name: 'singularity',
    relevance: 'Future tech and AGI discussion',
    preferredContentTypes: ['discussion', 'tech_review'],
    maxPostsPerWeek: 1,
    selfPromoRules: 'Discussion-oriented, no direct ads',
    language: 'en',
  },
  {
    name: 'LocalLLaMA',
    relevance: 'LLM enthusiasts and developers',
    preferredContentTypes: ['tech_review', 'tutorial'],
    maxPostsPerWeek: 1,
    selfPromoRules: 'Technical content preferred',
    language: 'en',
  },
];

// ============================================================================
// A2A (Agent-to-Agent) Protocol Types
// ============================================================================

export interface A2AAgentCard {
  /** Agent name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Agent capabilities */
  capabilities: string[];
  /** API endpoint */
  endpoint: string;
  /** Protocol version */
  protocol: string;
  /** Supported interaction modes */
  interactionModes: ('request-response' | 'streaming' | 'webhook')[];
  /** Authentication methods */
  auth: ('api_key' | 'oauth2' | 'none')[];
  /** Contact / support */
  contact?: {
    email?: string;
    website?: string;
  };
  /** Pricing model */
  pricing?: {
    model: 'free' | 'freemium' | 'paid';
    details?: string;
  };
}

export interface A2AContentMetadata {
  /** Schema.org type annotation */
  schemaType: 'SoftwareApplication' | 'Article' | 'Review';
  /** Structured product info for AI parsing */
  product: {
    name: string;
    category: string;
    features: string[];
    platforms: string[];
    url: string;
  };
  /** Comparison targets (if comparison post) */
  comparedWith?: string[];
  /** Rating (if review post) */
  rating?: {
    overall: number;
    categories: Record<string, number>;
  };
}

// ============================================================================
// Promotion Log & Analytics
// ============================================================================

export interface PromotionLog {
  id: string;
  taskId: string;
  action: 'generate' | 'review' | 'publish' | 'monitor' | 'error';
  timestamp: number;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface PromotionAnalytics {
  totalPosts: number;
  totalComments: number;
  totalUpvotes: number;
  totalViews: number;
  averageEngagementRate: number;
  topPerformingSubreddits: Array<{
    subreddit: string;
    totalEngagement: number;
    postCount: number;
  }>;
  contentTypePerformance: Array<{
    type: ContentType;
    averageScore: number;
    postCount: number;
  }>;
  /** Daily activity for chart */
  dailyActivity: Array<{
    date: string;
    posts: number;
    engagement: number;
  }>;
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests per minute to Reddit API */
  maxRequestsPerMinute: number;
  /** Maximum posts per day */
  maxPostsPerDay: number;
  /** Minimum interval between posts to same subreddit (ms) */
  minIntervalPerSubreddit: number;
  /** Cooldown after rate limit hit (ms) */
  cooldownMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxPostsPerDay: 5,
  minIntervalPerSubreddit: 24 * 60 * 60 * 1000, // 24 hours
  cooldownMs: 60 * 1000, // 1 minute
};
