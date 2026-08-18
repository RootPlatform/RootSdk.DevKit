// ============================================================================
// Recipe: Cursor-Based Pagination — Client
// Composes: networking-app-services
// ============================================================================
//
// State machine for accumulating pages:
//
//   - records[]     — every record fetched so far, in order
//   - cursor        — the cursor for the NEXT call (empty string on first load)
//   - loading       — request in flight; disable the button to prevent double-fire
//   - done          — server returned an empty next_cursor; no more pages
//   - error         — last error message, if any (display + recover by retrying)
//   - search        — what the user has typed, updated on every keystroke
//   - appliedSearch — the debounced term actually sent to the server
//
// The client does NOT filter `records`. The server does the filtering, because
// `records` only holds the pages fetched so far — filtering it locally would
// search the window instead of the list, and would never find a match beyond
// the pages already pulled. That bug is invisible while the seed data fits in
// one page, which is exactly why it survives review.
//
// A term change resets pagination: records cleared, cursor cleared, first page
// re-fetched. Keeping the old cursor would seek into a result set that no
// longer exists.
//
// Why the first page REPLACES and later pages APPEND: it makes the first fetch
// idempotent, so React.StrictMode's deliberate double-invocation of effects in
// dev is harmless. An earlier version of this recipe appended on every page and
// needed a useRef latch to stop the mount effect duplicating records 100…81.
// Designing the operation to be repeatable beats latching around a repeat.
//
// Why we don't auto-load all pages: the recipe's lesson is the explicit pull
// pattern (each page is a deliberate fetch). Real apps often replace the
// button with an IntersectionObserver-driven infinite scroll, but the
// underlying state machine is the same — replace the click handler with the
// observer callback.
//
// If you take the infinite-scroll route, note that it interacts badly with a
// client-side filter, which is a second reason not to write one: filtering the
// accumulated pages shrinks the rendered list, which can lift the sentinel out
// of the viewport, so the observer never fires and the list never grows to
// contain what the user is looking for. Searching then prevents its own results
// from loading. With the filter on the server this cannot happen — each term is
// its own query, starting from its own first page.
//
// ============================================================================

import React, { useEffect, useState } from "react";
import { listServiceClient } from "@datapaginatedlist/gen-client";
import { Record as RecordMessage } from "@datapaginatedlist/gen-shared";

const PAGE_SIZE = 20;

export const App: React.FC = () => {
  const [records, setRecords] = useState<RecordMessage[]>([]);
  const [cursor, setCursor] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");

  const fetchPage = async (
    currentCursor: string,
    term: string,
    mode: "replace" | "append",
  ): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const r = await listServiceClient.listRecords({
        pageSize: PAGE_SIZE,
        cursor: currentCursor,
        search: term,
      });
      // Later pages append so "load more" feels continuous; the first page of
      // any query replaces, which both clears the previous term's results and
      // makes the call safe to repeat.
      setRecords((prev) =>
        mode === "replace" ? r.records : [...prev, ...r.records],
      );
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

  // Debounce the input so a search costs one request per pause rather than one
  // per keystroke. Clients are rate-limited to 10 app RPCs per second, and a
  // fast typist exceeds that on a single word without this.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // One effect covers both the initial load and every term change: appliedSearch
  // starts as "" so the mount case is simply the first query. Clearing the
  // cursor here is what stops a stale cursor being paired with a new term.
  useEffect(() => {
    setCursor("");
    setDone(false);
    void fetchPage("", appliedSearch, "replace");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch]);

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Cursor-Based Pagination</h1>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search labels"
        aria-label="Search labels"
        style={inputStyle}
      />

      <p style={metaStyle}>
        Loaded {records.length} record{records.length === 1 ? "" : "s"}
        {appliedSearch ? ` matching ${JSON.stringify(appliedSearch)}` : ""}
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
          onClick={() => void fetchPage(cursor, appliedSearch, "append")}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
      {done && records.length > 0 && (
        <p style={endStyle}>You've reached the end.</p>
      )}
      {done && records.length === 0 && appliedSearch !== "" && (
        <p style={endStyle}>Nothing matches {JSON.stringify(appliedSearch)}.</p>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 16,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-background-secondary)",
  color: "var(--rootsdk-text-primary)",
  fontSize: 14,
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
