import { describe, expect, it } from 'vitest';
import { toSparklineTrendData } from '../../components/MarketHome';

describe('MarketHome leaderboard helpers', () => {
  it('builds sparkline trend data with date and value fields', () => {
    const rows = toSparklineTrendData([0.2, 0.4, 0.35, 0.6]);
    expect(rows.length).toBe(4);
    expect(rows[0]).toHaveProperty('date');
    expect(rows[0]).toHaveProperty('value');
    expect(typeof rows[0].value).toBe('number');
  });

  it('returns one fallback point when sparkline is empty', () => {
    const rows = toSparklineTrendData([]);
    expect(rows.length).toBe(1);
    expect(rows[0].value).toBe(0);
  });
});
