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
    expect(query).toContain('Business goal: 提升门店转化');
    expect(query).toContain('Budget: ¥2000/月');
    expect(query).toContain('Deadline: 72小时');
    expect(query).toContain('Industry: 本地生活');
  });
});
