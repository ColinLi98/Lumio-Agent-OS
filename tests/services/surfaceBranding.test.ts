import { describe, expect, it } from 'vitest';
import { resolveSurfaceBrand, resolveSurfaceTitle } from '../../services/surfaceBranding';

describe('surface branding', () => {
  it('uses Lumio branding for platform surfaces', () => {
    expect(resolveSurfaceTitle('platform')).toBe('Lumio B-End Platform');
    expect(resolveSurfaceBrand('platform')).toEqual({
      alt: 'Lumio',
      name: 'Lumio',
      subtitle: 'B-End Platform',
    });
  });

  it('uses Lumio branding for trial join', () => {
    expect(resolveSurfaceTitle('trial-join')).toBe('Lumio Trial Join');
    expect(resolveSurfaceBrand('trial-join')).toEqual({
      alt: 'Lumio',
      name: 'Lumio',
      subtitle: 'Trial Join',
    });
  });

  it('keeps compatibility branding for non-platform surfaces', () => {
    expect(resolveSurfaceTitle('app')).toBe('Lumi Compatibility Surface');
    expect(resolveSurfaceTitle('keyboard')).toBe('Lumi Keyboard Compatibility Surface');
    expect(resolveSurfaceBrand('app')).toEqual({
      alt: 'Lumi.AI',
      name: 'Lumi.AI',
      subtitle: 'Agent OS',
    });
  });
});
