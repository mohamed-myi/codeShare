import { CLIENT_LOG_EVENTS } from "@codeshare/shared";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { getBrowserLogger } from "../lib/logger.ts";

const logger = getBrowserLogger();

interface RoomErrorBoundaryProps {
  children: ReactNode;
}

interface RoomErrorBoundaryState {
  hasError: boolean;
}

export class RoomErrorBoundary extends Component<RoomErrorBoundaryProps, RoomErrorBoundaryState> {
  state: RoomErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RoomErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void logger.error({
      event: CLIENT_LOG_EVENTS.CLIENT_RENDER_FAILED,
      error,
      context: {
        boundary: "room",
        component_stack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] p-6">
          <div className="max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-6 text-center shadow-sm">
            <h1 className="text-lg font-medium text-[var(--color-text-primary)]">
              Room failed to load
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
              Refresh the page to reconnect to the session.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
