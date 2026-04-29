// ============================================================================
// Recipe: External HTTP Fetch — Client
// Composes: client-app-services + networking-app-services
// ============================================================================
//
// A button that calls FetchUuid, shows the result on success, shows a
// distinct message per typed error on failure.
//
// The reason the client side matters here even though the lesson is
// server-side: the typed errors only earn their keep when the UX branches
// on err.code. A retry button for TIMEOUT or NETWORK is appropriate —
// transient problems, retry might succeed. A retry button for
// BAD_RESPONSE is wrong — the upstream's contract is broken; retrying
// won't help. The client below shows that branch.
// ============================================================================

import React, { useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import { uuidFetchServiceClient } from "@externalhttpfetch/gen-client";
import {
  FetchUuidResponse,
  UuidFetchError,
} from "@externalhttpfetch/gen-shared";

interface ErrorState {
  code: number;
  message: string;
  retryable: boolean;
}

export const App: React.FC = () => {
  const [result, setResult] = useState<FetchUuidResponse | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | undefined>(undefined);

  const handleFetch = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const r = await uuidFetchServiceClient.fetchUuid({});
      setResult(r);
    } catch (err) {
      setError(toErrorState(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>External HTTP Fetch</h1>
      <p style={metaStyle}>
        Calls <code>https://httpbin.org/uuid</code> from the server, returns
        the result here.
      </p>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => void handleFetch()} disabled={loading} style={buttonStyle}>
          {loading ? "Fetching…" : result || error ? "Fetch again" : "Fetch UUID"}
        </button>
      </div>

      {error && (
        <div style={errorBoxStyle}>
          <p style={errorHeadingStyle}>{errorHeading(error.code)}</p>
          <p style={{ margin: 0, fontSize: 13 }}>{error.message}</p>
          {error.retryable && (
            <p style={errorRetryStyle}>This is usually transient — retry may succeed.</p>
          )}
        </div>
      )}

      {result && !error && (
        <div style={resultBoxStyle}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--rootsdk-text-secondary)" }}>UUID</p>
          <p style={uuidStyle}>{result.uuid}</p>
          <p style={fetchedAtStyle}>fetched {result.fetchedAt}</p>
        </div>
      )}
    </main>
  );
};

/**
 * Translate a thrown error into a UX-relevant shape:
 *  - typed RootServerException → known code + retry-or-not flag
 *  - anything else → unknown code, not retryable (default to safer side)
 *
 * The retry-or-not flag is the UX-shaped consequence of the proto enum.
 * TIMEOUT, NETWORK, and UPSTREAM_UNAVAILABLE are transient and worth a
 * retry button. BAD_RESPONSE means the upstream's contract is broken
 * and retry won't fix it.
 */
function toErrorState(err: unknown): ErrorState {
  if (err instanceof RootServerException) {
    switch (err.code) {
      case UuidFetchError.TIMEOUT:
        return { code: err.code, message: err.message, retryable: true };
      case UuidFetchError.NETWORK:
        return { code: err.code, message: err.message, retryable: true };
      case UuidFetchError.UPSTREAM_UNAVAILABLE:
        return { code: err.code, message: err.message, retryable: true };
      case UuidFetchError.BAD_RESPONSE:
        return { code: err.code, message: err.message, retryable: false };
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { code: -1, message: msg, retryable: false };
}

function errorHeading(code: number): string {
  switch (code) {
    case UuidFetchError.TIMEOUT: return "Request timed out";
    case UuidFetchError.NETWORK: return "Network error";
    case UuidFetchError.UPSTREAM_UNAVAILABLE: return "Upstream is unavailable";
    case UuidFetchError.BAD_RESPONSE: return "Upstream response was unusable";
    default: return "Unexpected error";
  }
}

// All colors come from Root's design tokens — `--rootsdk-*` CSS custom
// properties that the host injects on `document.documentElement` and
// updates automatically when the user toggles light/dark theme. Reference:
// docs/llms/app-docs/develop/client/design-system-reference.md

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: 24,
  maxWidth: 640,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 14,
};

const resultBoxStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  border: "1px solid var(--rootsdk-border)",
  borderRadius: 12,
  background: "var(--rootsdk-background-secondary)",
};

const uuidStyle: React.CSSProperties = {
  margin: "4px 0 12px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 14,
};

const fetchedAtStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--rootsdk-text-tertiary)",
  fontSize: 12,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  border: "1px solid var(--rootsdk-error)",
  borderRadius: 12,
  background: "var(--rootsdk-background-secondary)",
};

const errorHeadingStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontWeight: 600,
  fontSize: 14,
  color: "var(--rootsdk-error)",
};

const errorRetryStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "var(--rootsdk-text-secondary)",
  fontStyle: "italic",
};
