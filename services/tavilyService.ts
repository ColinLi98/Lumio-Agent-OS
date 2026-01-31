/**
 * Tavily Search Service
 * 实时搜索服务，为 Agent 提供最新的网络信息
 */

const TAVILY_MCP_URL = 'https://tavily.api.tadata.com/mcp/tavily/beret-fusarium-divert-wuafgy';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
  responseTime: number;
  error?: string;
}

export interface TavilySearchOptions {
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

/**
 * Tavily 搜索服务类
 */
class TavilyService {
  private isEnabled: boolean = true;
  private cache: Map<string, { data: TavilySearchResponse; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 执行搜索
   */
  async search(query: string, options: TavilySearchOptions = {}): Promise<TavilySearchResponse> {
    const startTime = Date.now();

    // 检查缓存
    const cacheKey = this.getCacheKey(query, options);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('[Tavily] 返回缓存结果:', query);
      return cached.data;
    }

    try {
      // 构建 MCP 请求
      const response = await fetch(TAVILY_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'tavily_search',
            arguments: {
              query,
              search_depth: options.searchDepth || 'basic',
              max_results: options.maxResults || 5,
              include_answer: options.includeAnswer ?? true,
              include_raw_content: options.includeRawContent ?? false,
              include_domains: options.includeDomains || [],
              exclude_domains: options.excludeDomains || []
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      // 解析 MCP 响应
      const result = this.parseMCPResponse(data, query, startTime);
      
      // 缓存结果
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log('[Tavily] 搜索完成:', query, `(${result.responseTime}ms)`);
      return result;

    } catch (error) {
      console.error('[Tavily] 搜索失败:', error);
      return {
        query,
        results: [],
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '搜索失败'
      };
    }
  }

  /**
   * 智能搜索 - 根据意图优化搜索词
   */
  async smartSearch(intent: string, context?: string): Promise<TavilySearchResponse> {
    // 获取当前年份和日期
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toISOString().split('T')[0];
    
    // 根据意图类型优化搜索
    let searchQuery = intent;
    let options: TavilySearchOptions = { maxResults: 5 };

    // 职业相关
    if (/创业|辞职|跳槽|工作/.test(intent)) {
      searchQuery = `${intent} 成功率 风险 建议 ${currentYear}`;
      options.searchDepth = 'advanced';
      options.excludeDomains = ['zhihu.com']; // 排除问答网站，优先权威来源
    }
    
    // 财务相关
    if (/投资|理财|股票|基金|房价/.test(intent)) {
      searchQuery = `${intent} 最新行情 分析 趋势 ${currentYear}`;
      options.searchDepth = 'advanced';
      options.includeDomains = ['finance.sina.com.cn', 'eastmoney.com', 'cls.cn'];
    }

    // 旅行相关
    if (/旅游|机票|酒店|攻略/.test(intent)) {
      searchQuery = `${intent} 最新 推荐 ${currentYear}`;
      options.includeAnswer = true;
    }

    // 健康相关
    if (/健康|医疗|症状|治疗/.test(intent)) {
      searchQuery = `${intent} 专业建议 医学 ${currentYear}`;
      options.includeDomains = ['dxy.cn', 'haodf.com'];
    }
    
    // 新闻/时事相关 - 添加日期约束
    if (/新闻|最新|热点|热搜|趋势/.test(intent)) {
      searchQuery = `${intent} ${currentDate}`;
      options.searchDepth = 'basic';
    }

    // 默认添加年份确保时效性
    if (!searchQuery.includes(String(currentYear)) && !searchQuery.includes(currentDate)) {
      searchQuery = `${searchQuery} ${currentYear}`;
    }

    return this.search(searchQuery, options);
  }

  /**
   * 获取实时新闻
   */
  async getNews(topic: string, maxResults: number = 3): Promise<TavilySearchResponse> {
    return this.search(`${topic} 最新新闻 ${new Date().toISOString().split('T')[0]}`, {
      searchDepth: 'basic',
      maxResults,
      includeAnswer: false
    });
  }

  /**
   * 事实核查
   */
  async factCheck(claim: string): Promise<{ isVerified: boolean; sources: TavilySearchResult[]; summary: string }> {
    const result = await this.search(`${claim} 真假 核实 事实`, {
      searchDepth: 'advanced',
      maxResults: 5,
      includeAnswer: true
    });

    return {
      isVerified: !result.error && result.results.length > 0,
      sources: result.results,
      summary: result.answer || '无法验证此信息'
    };
  }

  /**
   * 解析 MCP 响应
   */
  private parseMCPResponse(data: any, query: string, startTime: number): TavilySearchResponse {
    try {
      // MCP 响应格式
      if (data.result?.content) {
        const content = data.result.content;
        
        // 尝试解析内容
        if (Array.isArray(content)) {
          const textContent = content.find((c: any) => c.type === 'text');
          if (textContent?.text) {
            const parsed = JSON.parse(textContent.text);
            return {
              query,
              results: (parsed.results || []).map((r: any) => ({
                title: r.title || '',
                url: r.url || '',
                content: r.content || r.snippet || '',
                score: r.score || r.relevance_score || 0,
                publishedDate: r.published_date
              })),
              answer: parsed.answer,
              responseTime: Date.now() - startTime
            };
          }
        }
      }

      // 直接返回格式
      if (data.results) {
        return {
          query,
          results: data.results,
          answer: data.answer,
          responseTime: Date.now() - startTime
        };
      }

      // 无法解析
      return {
        query,
        results: [],
        responseTime: Date.now() - startTime,
        error: '无法解析响应'
      };
    } catch (error) {
      return {
        query,
        results: [],
        responseTime: Date.now() - startTime,
        error: '解析响应失败'
      };
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(query: string, options: TavilySearchOptions): string {
    return `${query}_${JSON.stringify(options)}`;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 启用/禁用服务
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }
}

// 导出单例
export const tavilyService = new TavilyService();

/**
 * 便捷函数：搜索
 */
export async function searchWeb(query: string): Promise<TavilySearchResponse> {
  return tavilyService.search(query);
}

/**
 * 便捷函数：智能搜索
 */
export async function smartSearchWeb(intent: string): Promise<TavilySearchResponse> {
  return tavilyService.smartSearch(intent);
}
