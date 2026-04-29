// ============================================================================
// Recipe: Cursor-Based Pagination — Client
// Composes: client-app-services + networking-app-services
// ============================================================================
//
// State machine for accumulating pages:
//
//   - records[]    — every record fetched so far, in order
//   - cursor       — the cursor for the NEXT call (empty string on first load)
//   - loading      — request in flight; disable the button to prevent double-fire
//   - done         — server returned an empty next_cursor; no more pages
//   - error        — last error message, if any (display + recover by retrying)
//
// Initial load happens on mount via useEffect; subsequent loads are user-driven
// via the "Load more" button. Same fetchPage function for both — the only
// difference is whether the user clicked something.
//
// Why we don't auto-load all pages: the recipe's lesson is the explicit pull
// pattern (each page is a deliberate fetch). Real apps often replace the
// button with an IntersectionObserver-driven infinite scroll, but the
// underlying state machine is the same — replace the click handler with the
// observer callback. We use a button here because it's the simplest visible
// demonstration of "another page is available."
//
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { listServiceClient } from "@datapaginatedlist/gen-client";
import { Record as RecordMessage } from "@datapaginatedlist/gen-shared";

const PAGE_SIZE = 20;

export const App: React.FC = () => {
  const [records, setRecords] = useState<RecordMessage[]>([]);
  const [cursor, setCursor] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // Latch for the initial-load effect — see useEffect comment below.
  const initialFetchRef = useRef(false);

  const fetchPage = async (currentCursor: string): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const r = await listServiceClient.listRecords({
        pageSize: PAGE_SIZE,
        cursor: currentCursor,
      });
      // Append, don't replace. The previous-page records stay; the new page
      // gets concatenated. This is what makes the "load more" pattern feel
      // continuous to the user instead of paging in/out.
      setRecords((prev) => [...prev, ...r.records]);
      setCursor(r.nextCursor);
      // Empty next_cursor = end of list. Flip done=true so the button
      // disables itself and we render the end-of-list message.
      setDone(r.nextCursor === "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount, once. React.StrictMode in dev intentionally
  // double-invokes effects to surface impure side-effect bugs — without a
  // guard, fetchPage("") fires twice and the appending setRecords produces
  // visible duplicates of records 100…81. The useRef latch is the canonical
  // pattern: refs survive the StrictMode unmount/remount, so the second
  // invocation no-ops. (Production builds don't double-invoke effects, but
  // devhost is the canonical local-run path for this recipe, so the dev-mode
  // duplication would be the first thing a learner sees and questions.)
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    void fetchPage("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Cursor-Based Pagination</h1>
      <p style={metaStyle}>
        Loaded {records.length} record{records.length === 1 ? "" : "s"}
        {done ? " (end of list)" : ""}
      </p>

      {error && <p style={errorStyle}>Error: {error}</p>}

      <ul style={listStyle}>
        {records.map((r) => (
          <li key={String(r.id)} style={itemStyle}>
            <code>#{String(r.id)}</code> · {r.label}{" "}
            <span style={timestampStyle}>{r.createdAt}</span>
          </li>
        ))}
      </ul>

      {!done && (
        <button
          onClick={() => void fetchPage(cursor)}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
      {done && records.length > 0 && (
        <p style={endStyle}>You've reached the end.</p>
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
  maxWidth: 720,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0",
};

const itemStyle: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid var(--rootsdk-border)",
  fontSize: 14,
};

const timestampStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-tertiary)",
  fontSize: 12,
  marginLeft: 8,
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

const endStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-tertiary)",
  fontStyle: "italic",
  marginTop: 16,
};

const errorStyle: React.CSSProperties = {
  color: "var(--rootsdk-error)",
  fontSize: 14,
  marginTop: 16,
};
