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

  it('keeps Lumio branding bounded to B-end surfaces only', () => {
    expect(resolveSurfaceBrand('platform')).toEqual({
      alt: 'Lumio',
      name: 'Lumio',
      subtitle: 'B-End Platform',
    });
  });
});
