import { trackFunnelEvent } from './telemetryService';

export type PlatformShellDiagnosticType =
  | 'route_warning'
  | 'stale_link'
  | 'load_failure'
  | 'cta_blocked'
  | 'runtime_boundary';

export function trackPlatformShellDiagnostic(
  type: PlatformShellDiagnosticType,
  metadata: Record<string, unknown>,
): void {
  console.warn(`[PlatformShell] ${type}`, metadata);
  try {
    trackFunnelEvent('action_completed', {
      platform_shell_event: type,
      ...metadata,
    });
  } catch {
    // Telemetry must stay non-fatal in local/browser-safe paths.
  }
}

export default trackPlatformShellDiagnostic;
