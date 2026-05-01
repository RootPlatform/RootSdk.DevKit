// ============================================================================
// Recipe: Batch-Prefetch Related Data — Client
// Composes: networking-app-services
// ============================================================================
//
// Two-stage render. The lesson is in handleFetch:
//
//   1. Fetch the activities list (one RPC).
//   2. Collect the DISTINCT actor_ids from the list. Deduplication is the
//      step most agents miss — a naive client sends every activity's
//      actor_id, even when many activities share an actor.
//   3. Skip ids we've already resolved (the `ownersCache` Map). This
//      avoids redundant work across re-fetches; without it, a refresh
//      would re-fetch every owner the page already had.
//   4. If there's anything left to fetch, ONE batchGetOwners RPC.
//   5. Merge the result into the cache; render.
//
// Naive vs batched cost on the seeded data:
//   - Naive: 1 RPC for activities + 10 RPCs for owners = 11 round trips
//   - Batched (this recipe): 1 + 1 = 2 round trips
//
// At scale (50 activities, 10 distinct actors), the batched version is
// 2 round trips regardless. The naive version is 51.
//
// Cache eviction: none. The Map grows for the lifetime of the component.
// Real apps cap with LRU or use a fetching library (TanStack Query, SWR)
// that handles this. The cache is incidental to the lesson — the dedup
// + single-batch-RPC pattern is what matters.
//
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { activityServiceClient } from "@databatchprefetch/gen-client";
import {
  Activity,
  OwnerInfo,
} from "@databatchprefetch/gen-shared";

export const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ownersCache, setOwnersCache] = useState<Record<string, OwnerInfo>>({});
  const [loading, setLoading] = useState(false);
  const [resolvingOwners, setResolvingOwners] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // StrictMode latch — gate the initial fetch only. (See the prior recipes
  // for the full writeup of why this is needed in dev mode.)
  const initialFetchRef = useRef(false);
  // In-flight request counter — drops stale activity-list responses if a
  // newer fetch started.
  const fetchSeqRef = useRef(0);

  /**
   * The two-stage flow. Pulls activities, then resolves any unknown actors
   * with one batched call. Re-runnable (Refresh button hits this same
   * function); cache short-circuits owners we've already seen.
   */
  const handleFetch = async (): Promise<void> => {
    const mySeq = ++fetchSeqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      // Stage 1: list activities.
      const listResponse = await activityServiceClient.listActivities({});
      if (mySeq !== fetchSeqRef.current) return;
      const fresh = listResponse.activities ?? [];
      setActivities(fresh);

      // Stage 2: resolve any actors we don't already have. The Set
      // dedups across activities; the filter strips ids the cache
      // already covers. Both steps matter — the dedup keeps the request
      // small for a single batch; the cache filter keeps subsequent
      // refreshes from re-fetching what we already know.
      const distinctActorIds = Array.from(
        new Set(fresh.map((a) => a.actorId)),
      );
      const unresolvedIds = distinctActorIds.filter((id) => !(id in ownersCache));

      if (unresolvedIds.length === 0) {
        return;
      }

      setResolvingOwners(true);
      const ownersResponse = await activityServiceClient.batchGetOwners({
        ownerIds: unresolvedIds,
      });
      if (mySeq !== fetchSeqRef.current) return;

      // Merge into the cache. proto3 map<> lands as an index-signature
      // object on the wire; spread it into the existing cache. Missing
      // ids simply don't appear in `ownersResponse.owners` — they stay
      // absent from the cache and render as "(unknown)" below.
      setOwnersCache((prev) => ({
        ...prev,
        ...(ownersResponse.owners ?? {}),
      }));
    } catch (err) {
      if (mySeq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mySeq === fetchSeqRef.current) {
        setLoading(false);
        setResolvingOwners(false);
      }
    }
  };

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      void handleFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Activity feed</h1>
      <p style={metaStyle}>
        {activities.length} {activities.length === 1 ? "activity" : "activities"}
        {" · "}
        {Object.keys(ownersCache).length} owner{Object.keys(ownersCache).length === 1 ? "" : "s"} cached
      </p>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => void handleFetch()}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? (resolvingOwners ? "Resolving owners…" : "Loading…") : "Refresh"}
        </button>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {activities.length === 0 && !loading && (
        <p style={metaStyle}>No activities to display.</p>
      )}

      <ul style={listStyle}>
        {activities.map((a) => {
          const owner = ownersCache[a.actorId];
          return (
            <li key={String(a.id)} style={itemStyle}>
              {/* Colored dot keyed off the owner's color. Placeholder gray
                  while the owner's still being resolved or if the id has
                  no record (recipe contract: missing owners just render
                  as "unknown" — no error). */}
              <span
                style={{
                  ...dotStyle,
                  background: owner?.color ?? "var(--rootsdk-text-tertiary)",
                }}
              />
              <span style={nameStyle}>
                {owner ? owner.displayName : "(unknown)"}
              </span>
              <span style={actionStyle}>{a.action}</span>
              <span style={timestampStyle}>{a.occurredAt}</span>
            </li>
          );
        })}
      </ul>
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

const dotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  fontWeight: 500,
  minWidth: 100,
};

const actionStyle: React.CSSProperties = {
  flex: 1,
  color: "var(--rootsdk-text-primary)",
};

const timestampStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-tertiary)",
  fontSize: 12,
};

const errorStyle: React.CSSProperties = {
  color: "var(--rootsdk-error)",
  fontSize: 14,
  marginTop: 16,
};
