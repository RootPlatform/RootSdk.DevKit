import React from "react";
import { releaseWatcherServiceClient } from "@githubreleasewatcher/gen-client";
import { QueryError } from "./QueryError";

// ============================================================================
// ErrorBoundary — catches render-time errors in any descendant and shows the
// QueryError fallback with a Retry button. Without this, a render throw
// unmounts the whole app tree — the user sees a blank screen.
//
// Wrap each view separately so a crash in one view doesn't nuke the others.
// Reset on retry by bumping a key that forces the subtree to remount.
//
// Telemetry: every catch fires a fire-and-forget ReportClientError RPC so
// production crashes show up in the server log aggregator. Failure of the
// report itself is swallowed — there's no useful UI for "couldn't tell the
// server we had an error" and we mustn't crash the boundary itself.
// ============================================================================

interface Props {
  children: React.ReactNode;
  // Optional extra context passed to the logger. Helpful when the same
  // boundary wraps multiple views to disambiguate which one threw.
  label?: string;
}

interface State {
  error: Error | undefined;
  resetKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: undefined, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const label = this.props.label ?? "";
    console.error(`[ErrorBoundary${label ? `: ${label}` : ""}]`, error, info.componentStack);
    void releaseWatcherServiceClient
      .reportClientError({
        label,
        message: error.message ?? String(error),
        stack: error.stack ?? "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      })
      .catch(() => {
        // Intentionally swallowed.
      });
  }

  handleRetry = (): void => {
    this.setState((prev) => ({
      error: undefined,
      resetKey: prev.resetKey + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <QueryError
          message={this.state.error.message || "Something went wrong."}
          onRetry={this.handleRetry}
        />
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
