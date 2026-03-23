import { Component, type ErrorInfo, type ReactNode } from "react";

interface PanelErrorBoundaryProps {
  name: string;
  children: ReactNode;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
}

export class PanelErrorBoundary extends Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`Panel "${this.props.name}" failed to render`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full flex-col items-center justify-center gap-3 p-6"
          data-testid={`panel-error-${this.props.name.toLowerCase()}`}
        >
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {this.props.name} failed to render.
          </p>
          <button
            type="button"
            className="ui-ghost-button px-3 py-1.5 text-xs"
            data-testid={`panel-retry-${this.props.name.toLowerCase()}`}
            onClick={this.handleRetry}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
