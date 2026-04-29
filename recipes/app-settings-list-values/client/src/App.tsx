// ============================================================================
// Recipe: App Settings (List Values) — Client
// Composes: client-app-services + networking-app-services
// ============================================================================
//
// A list display with admin-only edit affordances:
//
//   - List of blocked terms, newest first
//   - Per-row "Remove" button (admins only)
//   - Add-new input + button (admins only)
//
// Initial state on mount: fetch the list + caller's is_admin flag.
// Subscribe to BlockedTermsChanged so the list re-fetches whenever the
// server says it changed (another tab added/removed a term, the admins
// picker moved and someone's is_admin flipped, etc.).
//
// Editability gated by is_admin. Non-admins see the list read-only — no
// remove buttons, no add input. That's the visible UX gate. The security
// gate is server-side: AddBlockedTerm and RemoveBlockedTerm both call
// requireAdmin and throw RootServerException(NOT_ADMIN) for unauthorized
// callers. UI gating is for visibility, not access control. See
// ui-feature-by-role for the canonical lesson on why both layers are
// required.
//
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { RootServerException } from "@rootsdk/client-app";
import {
  blockedTermsServiceClient,
  BlockedTermsServiceClientEvent,
} from "@appsettingslistvalues/gen-client";
import {
  BlockedTerm,
  BlockedTermsError,
} from "@appsettingslistvalues/gen-shared";

export const App: React.FC = () => {
  const [terms, setTerms] = useState<BlockedTerm[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newTerm, setNewTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  // Track which row id is being removed so we can disable just that
  // row's button rather than the whole list during the round trip.
  const [removingId, setRemovingId] = useState<bigint | undefined>(undefined);

  const [error, setError] = useState<string | undefined>(undefined);
  // StrictMode latch — see useEffect below. Same pattern as the prior
  // recipe (with the fix from review: gate the fetch only, not the
  // subscription).
  const initialFetchRef = useRef(false);
  // Monotonically increasing request id. Each fetchList() captures the
  // current value; if a newer fetch has started by the time the response
  // returns, the older response is dropped. Without this, mount-fetch and
  // a near-simultaneous BlockedTermsChanged refetch can race and let a
  // stale response overwrite fresh state if the network reorders them.
  const fetchSeqRef = useRef(0);

  const fetchList = async (): Promise<void> => {
    const mySeq = ++fetchSeqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const r = await blockedTermsServiceClient.listBlockedTerms({});
      // A newer fetch already started — drop this response.
      if (mySeq !== fetchSeqRef.current) return;
      setTerms(r.terms ?? []);
      setIsAdmin(r.isAdmin);
    } catch (err) {
      if (mySeq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      // Always clear loading on the LATEST fetch's lifecycle. Older fetches
      // that already lost the race no-op above; we only want loading=false
      // when nothing's still in flight.
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  };

  // Initial load + subscribe. Latch only the fetch — the subscribe/cleanup
  // pair runs every mount/cleanup cycle and is self-balancing (see
  // app-settings-flat-values for the writeup of why guarding the
  // subscription too is wrong in StrictMode dev).
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      void fetchList();
    }
    blockedTermsServiceClient.on(
      BlockedTermsServiceClientEvent.BlockedTermsChanged,
      fetchList,
    );
    return () => {
      blockedTermsServiceClient.off(
        BlockedTermsServiceClientEvent.BlockedTermsChanged,
        fetchList,
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (): Promise<void> => {
    const term = newTerm.trim();
    if (!term) return;
    setAdding(true);
    setError(undefined);
    try {
      const r = await blockedTermsServiceClient.addBlockedTerm({ term });
      setTerms(r.terms ?? []);
      setNewTerm("");
    } catch (err) {
      // Match on err.code for stable behavior across server-message
      // changes — the proto-enum value is the contract, not the message.
      if (err instanceof RootServerException) {
        if (err.code === BlockedTermsError.NOT_ADMIN) {
          setError("You're no longer authorized to manage this list. Refresh to see the current state.");
        } else if (err.code === BlockedTermsError.INVALID_TERM) {
          setError(err.message || "That term isn't valid.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: bigint): Promise<void> => {
    setRemovingId(id);
    setError(undefined);
    try {
      const r = await blockedTermsServiceClient.removeBlockedTerm({ id });
      setTerms(r.terms ?? []);
    } catch (err) {
      if (err instanceof RootServerException && err.code === BlockedTermsError.NOT_ADMIN) {
        setError("You're no longer authorized to manage this list. Refresh to see the current state.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRemovingId(undefined);
    }
  };

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Blocked terms</h1>
      <p style={metaStyle}>
        {isAdmin
          ? "You're an admin — you can add and remove terms."
          : "Read-only. Ask an admin to make changes."}
      </p>

      {error && <p style={errorStyle}>{error}</p>}

      {isAdmin && (
        <div style={addRowStyle}>
          <input
            type="text"
            placeholder="New term"
            value={newTerm}
            disabled={adding}
            onChange={(e) => setNewTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
            }}
            style={inputStyle}
            maxLength={100}
          />
          <button
            onClick={() => void handleAdd()}
            disabled={adding || newTerm.trim().length === 0}
            style={buttonStyle}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      )}

      {loading && terms.length === 0 ? (
        <p style={metaStyle}>Loading…</p>
      ) : terms.length === 0 ? (
        <p style={metaStyle}>No blocked terms yet.</p>
      ) : (
        <ul style={listStyle}>
          {terms.map((t) => (
            <li key={String(t.id)} style={itemStyle}>
              <span style={{ flex: 1 }}>{t.term}</span>
              <span style={timestampStyle}>{t.addedAt}</span>
              {isAdmin && (
                <button
                  onClick={() => void handleRemove(t.id)}
                  disabled={removingId === t.id}
                  style={removeButtonStyle}
                >
                  {removingId === t.id ? "Removing…" : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};

// Inline styles so this recipe doesn't bring a CSS toolchain into scope.
// A real app would lift these into CSS modules. All colors come from Root
// design tokens (`--rootsdk-*` CSS custom properties); the host injects
// them on document.documentElement and updates them automatically when
// the user toggles light/dark theme. Reference:
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

const addRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 16,
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-input)",
  color: "var(--rootsdk-text-primary)",
  borderRadius: 6,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 14,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 0",
};

const itemStyle: React.CSSProperties = {
  padding: "10px 0",
  borderBottom: "1px solid var(--rootsdk-border)",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const timestampStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-tertiary)",
  fontSize: 12,
};

// Destructive button — red at rest (per Root convention; see
// feedback_root_destructive_icons_red). Border + text in error red,
// transparent background, signals "removes data" before hover.
const removeButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--rootsdk-error)",
  background: "transparent",
  color: "var(--rootsdk-error)",
  cursor: "pointer",
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  color: "var(--rootsdk-error)",
  fontSize: 14,
  marginTop: 16,
};
