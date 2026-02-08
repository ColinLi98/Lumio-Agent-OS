import { describe, expect, it } from 'vitest';
import { buildConciergeQuery } from '../../components/AgentMarketplacePanel';

describe('AgentMarketplacePanel concierge mode', () => {
  it('keeps original query when concierge fields are empty', () => {
    const query = buildConciergeQuery('帮我找上海咖啡店', {
      goal: '',
      budget: '',
      deadline: '',
      industry: '通用商业',
    });
    expect(query).toBe('帮我找上海咖啡店');
  });

  it('appends concierge context to query for execution', () => {
    const query = buildConciergeQuery('帮我找上海咖啡店', {
      goal: '提升门店转化',
      budget: '¥2000/月',
      deadline: '72小时',
      industry: '本地生活',
    });
    expect(query).toContain('业务目标：提升门店转化');
    expect(query).toContain('预算：¥2000/月');
    expect(query).toContain('时限：72小时');
    expect(query).toContain('行业：本地生活');
  });
});
