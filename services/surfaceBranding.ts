export type SurfaceMode = 'platform' | 'trial-join';

export function resolveSurfaceTitle(mode: SurfaceMode): string {
  switch (mode) {
    case 'platform':
      return 'Lumio Enterprise Workspace Platform';
    case 'trial-join':
      return 'Lumio Trial Join';
    default:
      return 'Lumio Enterprise Workspace Platform';
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
      subtitle: 'Enterprise Workspace Platform',
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
    alt: 'Lumio',
    name: 'Lumio',
    subtitle: 'Enterprise Workspace Platform',
  };
}
