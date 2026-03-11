import React from 'react';
import PlatformStatePanel from './PlatformStatePanel';
import { trackPlatformShellDiagnostic } from '../services/platformShellDiagnostics';

interface PlatformErrorBoundaryProps {
  children: React.ReactNode;
  scope: string;
  resetKey?: string;
}

interface PlatformErrorBoundaryState {
  error: Error | null;
}

export class PlatformErrorBoundary extends React.Component<PlatformErrorBoundaryProps, PlatformErrorBoundaryState> {
  state: PlatformErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): PlatformErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    trackPlatformShellDiagnostic('runtime_boundary', {
      scope: this.props.scope,
      message: error.message,
    });
  }

  componentDidUpdate(prevProps: PlatformErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <PlatformStatePanel
          kind="runtime_failure"
          title={`${this.props.scope} failure`}
          detail={this.state.error.message || 'A runtime failure occurred in this workspace surface.'}
          primaryActionLabel="Retry"
          onPrimaryAction={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export default PlatformErrorBoundary;
