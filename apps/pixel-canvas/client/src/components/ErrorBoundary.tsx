import React from "react";
import { QueryError } from "./QueryError";

// ============================================================================
// ErrorBoundary — catches render-time errors in any descendant and shows the
// QueryError fallback with a Retry button. Without this, a render throw
// unmounts the whole app tree — the user sees a blank screen.
//
// Wrap each view separately so a crash in one view doesn't nuke the others.
// Reset on retry by bumping a key that forces the subtree to remount.
//
// Telemetry is INJECTED via the optional `reportError` prop. The boundary
// itself has no SDK dependencies — it's truly app-agnostic and can be copied
// verbatim into any Root sample. Apps wire the prop to their own service
// client at the top of the tree (see App.tsx for the wiring pattern).
// Without `reportError`, errors are still logged to the console but no
// telemetry round-trip fires.
// ============================================================================

export interface ErrorReport {
  label: string;
  message: string;
  stack: string;
  userAgent: string;
}

interface Props {
  children: React.ReactNode;
  // Optional extra context passed to the logger. Helpful when the same
  // boundary wraps multiple tabs to disambiguate which one threw.
  label?: string;
  // Fire-and-forget telemetry sink. Apps connect this to their service's
  // reportClientError RPC. Failures inside the function should be swallowed
  // by the caller — the boundary already wraps the call in `void ... catch`.
  reportError?: (report: ErrorReport) => Promise<unknown>;
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
    console.error(
      `[ErrorBoundary${label ? `: ${label}` : ""}]`,
      error,
      info.componentStack,
    );
    // Fire-and-forget telemetry. Errors from the report itself are
    // swallowed — there's no useful UI for "couldn't tell the server".
    if (this.props.reportError) {
      void this.props
        .reportError({
          label,
          message: error.message ?? String(error),
          stack: error.stack ?? "",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "",
        })
        .catch(() => {
          // Intentionally swallowed.
        });
    }
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
    // Keying the subtree on resetKey forces a fresh mount on retry — clears
    // any stuck state that caused the original crash.
    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
