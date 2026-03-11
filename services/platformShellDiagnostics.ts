import { trackFunnelEvent } from './telemetryService';

export type PlatformShellDiagnosticType =
  | 'route_warning'
  | 'route_restore_failure'
  | 'stale_link'
  | 'load_failure'
  | 'cta_blocked'
  | 'cta_execution_failed'
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
