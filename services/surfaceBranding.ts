export type SurfaceMode = 'keyboard' | 'app' | 'platform' | 'trial-join';

export function resolveSurfaceTitle(mode: SurfaceMode): string {
  switch (mode) {
    case 'platform':
      return 'Lumio B-End Platform';
    case 'trial-join':
      return 'Lumio Trial Join';
    case 'app':
      return 'Lumi Compatibility Surface';
    case 'keyboard':
      return 'Lumi Keyboard Compatibility Surface';
    default:
      return 'Lumio B-End Platform';
  }
}

export function resolveSurfaceBrand(mode: SurfaceMode): {
  alt: string;
  name: string;
  subtitle: string;
} {
  if (mode === 'platform') {
    return {
      alt: 'Lumio',
      name: 'Lumio',
      subtitle: 'B-End Platform',
    };
  }

  if (mode === 'trial-join') {
    return {
      alt: 'Lumio',
      name: 'Lumio',
      subtitle: 'Trial Join',
    };
  }

  return {
    alt: 'Lumi.AI',
    name: 'Lumi.AI',
    subtitle: 'Agent OS',
  };
}
