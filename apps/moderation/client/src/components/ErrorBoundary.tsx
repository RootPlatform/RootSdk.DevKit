import React from "react";
import { moderationServiceClient } from "@moderation/gen-client";
import { QueryError } from "./QueryError";

// ErrorBoundary — catches render-time errors in any descendant and shows the
// QueryError fallback. Without this, a render throw unmounts the whole app
// tree — the user sees a blank screen.
//
// Wrap each view separately so a crash in one view doesn't nuke the others.
// Reset on retry by bumping a key that forces the subtree to remount.
//
// Telemetry: every catch fires a fire-and-forget ReportClientError RPC so
// production crashes show up in the server log aggregator. The RPC handler
// truncates and rate-limits server-side so a render-loop boundary can't
// flood the log pipeline.

interface Props {
  children: React.ReactNode;
  // Optional context passed to the report. Helpful when the same boundary
  // wraps multiple views to disambiguate which one threw.
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
    // Crash telemetry funnels through ReportClientError → server-side
    // structured log. We deliberately don't `console.error` here — the
    // server log is the source of truth for production crashes and a
    // double-write only adds noise. A fork that wants devtools-visible
    // output during development can re-add a guarded line.
    const label = this.props.label ?? "";
    void moderationServiceClient
      .reportClientError({
        label,
        message: error.message ?? String(error),
        stack: error.stack ?? "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      })
      .catch(() => {
        // Intentionally swallowed — no useful UI for "couldn't tell the
        // server we had an error" and we mustn't crash the boundary.
      });
    // Silence "info is unused" — we deliberately don't relay
    // componentStack to the server (might leak prop values via display
    // names; not worth the surface for a sample).
    void info;
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

