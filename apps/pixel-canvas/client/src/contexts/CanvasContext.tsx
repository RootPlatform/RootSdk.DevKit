import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { rootClient } from "@rootsdk/client-app";
import {
  pixelCanvasServiceClient,
  PixelCanvasServiceClientEvent,
} from "@pixelcanvas/gen-client";
import type {
  PixelEntry,
  CanvasLimits,
  PixelPlacedEvent,
  CanvasClearedEvent,
  SettingsChangedEvent,
} from "@pixelcanvas/gen-shared";

// In-memory pixel shape. Mirrors the wire PixelData but uses `number` for
// `placedAt` because:
//   - JS Date math (`Date.now() - placedAt`) wants number, not bigint
//   - rendering code (formatRelativeTime, sort comparisons) is cleaner
//     without per-call BigInt conversion
//   - 64-bit ms timestamps are well below 2^53 for any realistic clock,
//     so the bigint→number narrowing is safe in practice
// Other client modules that need this shape (PixelGrid, ActionPanel) import
// it from this file rather than the wire type.
export interface PixelInfo {
  color: string;
  userId: string;
  placedAt: number;
}
import { withClientRetry } from "../lib/retry";

// ============================================================================
// CanvasContext — pixel grid state, my cooldown clock, palette, amIAdmin.
//
// Live data sources:
//   - GetCanvas RPC on mount (and on AdminsChanged / explicit reload).
//   - PixelPlaced broadcast: per-pixel updates.
//   - CanvasCleared broadcast: full reset (also fires on size change).
//   - SettingsChanged broadcast: cooldown change updates client clock.
//
// Pixels stored as a Map<"x,y", PixelData> for O(1) per-cell lookup during
// render. The bridge between wire shape (PixelEntry[]) and Map happens at
// the response handler. Updates from PixelPlaced events replace the Map
// with a fresh clone of the previous one plus the new entry — never an
// in-place mutation, so React's reference-equality re-render fires.
//
// Cooldown: we track `myLastPlacedAt` in state and `cooldownSeconds` from
// settings. The component layer (HomeView / ActionPanel) computes
// remaining seconds via `now - myLastPlacedAt < cooldownMs` and updates
// every 250ms via its own interval. We don't tick the clock here.
//
// `myLastPlacedAt` is updated from TWO sources:
//   1. The PlacePixel response handler in HomeView (setMyLastPlacedAt) —
//      starts the cooldown clock immediately on success without waiting
//      for the broadcast roundtrip.
//   2. The PixelPlaced broadcast handler below, when event.userId matches
//      the local user. This is the recovery path for the not-strictly-
//      idempotent retry case: PlacePixel can succeed server-side and
//      broadcast, but the response can be lost (transient network blip).
//      A withClientRetry retry then hits COOLDOWN_NOT_ELAPSED — but the
//      original placement DID land, the broadcast carries the placedAt,
//      and this handler picks it up so the cooldown clock starts
//      regardless of which path delivered. Without this, the user would
//      see their pixel land on the canvas but get a "cooldown active"
//      error pill AND a stuck zero countdown — confusing.
// ============================================================================

export interface CanvasState {
  width: number;
  height: number;
  pixels: Map<string, PixelInfo>;
  myLastPlacedAt: number;
  cooldownSeconds: number;
  palette: string[];
  amIAdmin: boolean;
  limits: CanvasLimits | undefined;
  loading: boolean;
  error: Error | undefined;
  // Replaces myLastPlacedAt locally after a successful PlacePixel response.
  // Lets the cooldown UI start counting down without waiting for the
  // broadcast to arrive (we'd ignore our own broadcast anyway).
  setMyLastPlacedAt: (placedAt: number) => void;
  // `silent` keeps the existing pixels/palette visible during the refetch
  // instead of flipping `loading` (which would unmount the canvas to a
  // <Loader />) or `error` (which would replace it with <QueryError />).
  // Used for background refreshes triggered by events like AdminsChanged
  // where the data is mostly unchanged for non-admin clients — no point
  // blanking everyone's screen for a flag that doesn't affect them. A
  // silent reload that errors logs a warning and leaves state intact;
  // the user keeps painting on possibly-slightly-stale data, which is
  // a better failure mode than a full QueryError view.
  reload: (opts?: { silent?: boolean }) => Promise<void>;
}

const CanvasCtx = createContext<CanvasState | undefined>(undefined);

// Exported so PixelGrid / HomeView don't duplicate the key format inline.
// A drift between callers and CanvasContext's read path here would surface
// as silent miss-lookups (cells that exist in the Map but aren't found by
// callers using a slightly different key).
export function pixelKey(x: number, y: number): string {
  return `${x},${y}`;
}

function entriesToMap(entries: PixelEntry[]): Map<string, PixelInfo> {
  const m = new Map<string, PixelInfo>();
  for (const e of entries) {
    if (!e.data) continue;
    m.set(pixelKey(e.x, e.y), {
      color: e.data.color,
      userId: e.data.userId,
      placedAt: Number(e.data.placedAt),
    });
  }
  return m;
}

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Captured once at mount via useMemo with empty deps so the value
  // matches the comment ("once at mount") instead of recomputing every
  // render. The SDK guarantees this stays valid for the session — the
  // user can't change their own ID — so we don't subscribe for updates.
  const currentUserId = useMemo(() => rootClient.users.getCurrentUserId(), []);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [pixels, setPixels] = useState<Map<string, PixelInfo>>(new Map());
  const [myLastPlacedAt, setMyLastPlacedAtState] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [palette, setPalette] = useState<string[]>([]);
  const [amIAdmin, setAmIAdmin] = useState(false);
  const [limits, setLimits] = useState<CanvasLimits | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Broadcast buffer for events that arrive WHILE a reload's GetCanvas
  // RPC is in flight. Without this, an event that fires between the
  // request being sent and the response arriving gets clobbered when we
  // apply the now-stale snapshot — the snapshot doesn't include it, and
  // the event handler already updated the local Map before the snapshot
  // overwrites it.
  //
  // Strategy: while inFlightReloadRef is true, handlers push the event
  // onto bufferedEventsRef instead of applying it. After reload's
  // setters apply the snapshot, we drain the buffer in arrival order so
  // those events take effect on top of the snapshot.
  type BufferedEvent =
    | { kind: "placed"; event: PixelPlacedEvent }
    | { kind: "cleared"; event: CanvasClearedEvent }
    | { kind: "settings"; event: SettingsChangedEvent };
  const inFlightReloadRef = useRef(false);
  const bufferedEventsRef = useRef<BufferedEvent[]>([]);
  // Read inside applySettingsChanged so the width-mismatch check always
  // sees the latest value rather than a closure snapshot from whenever
  // the handler was last memoized.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Apply a PixelPlaced event to local state. Pulled out of the
  // subscription handler so reload's drain path can call it directly.
  const applyPixelPlaced = useCallback(
    (event: PixelPlacedEvent) => {
      setPixels((prev) => {
        const next = new Map(prev);
        next.set(pixelKey(event.x, event.y), {
          color: event.color,
          userId: event.userId,
          placedAt: Number(event.placedAt),
        });
        return next;
      });
      if (event.userId === currentUserId) {
        const placedAt = Number(event.placedAt);
        setMyLastPlacedAtState((prev) => Math.max(prev, placedAt));
      }
    },
    [currentUserId],
  );

  const applyCanvasCleared = useCallback((event: CanvasClearedEvent) => {
    setWidth(event.width);
    setHeight(event.height);
    setPixels(new Map());
  }, []);

  const applySettingsChanged = useCallback(
    (event: SettingsChangedEvent) => {
      setCooldownSeconds(event.cooldownSeconds);
      // Defensive: if SettingsChanged carries a canvasSize that doesn't
      // match our local width, the paired CanvasCleared was likely
      // dropped (broadcast failures are silent via safeBroadcast). Fire
      // a silent reload to recover the canvas blob — better than
      // rendering at the old dimension with stale pixels until the
      // user manually refreshes.
      if (event.canvasSize !== widthRef.current) {
        void reloadRef.current({ silent: true });
      }
    },
    [],
  );

  // Forward-declared ref so applySettingsChanged can call reload without
  // a circular useCallback dep (reload itself depends on the apply* fns
  // via the drain step). We assign the live reload to this ref after it's
  // defined below.
  const reloadRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(
    async () => {},
  );

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) {
      setLoading(true);
      setError(undefined);
    }
    inFlightReloadRef.current = true;
    try {
      const r = await withClientRetry(() =>
        pixelCanvasServiceClient.getCanvas({}),
      );
      // Apply the snapshot first.
      setWidth(r.width);
      setHeight(r.height);
      setPixels(entriesToMap(r.pixels));
      setMyLastPlacedAtState(Number(r.myLastPlacedAt));
      setCooldownSeconds(r.cooldownSeconds);
      setPalette(r.palette);
      setAmIAdmin(r.amIAdmin);
      setLimits(r.limits);
      // Then drain any events that arrived during the await window so
      // they re-apply on top of the snapshot. Events are functional
      // updates (setPixels((prev) => ...)) so they compose correctly
      // with the snapshot's setPixels above in React's batched commit.
      const buffered = bufferedEventsRef.current;
      bufferedEventsRef.current = [];
      for (const item of buffered) {
        if (item.kind === "placed") applyPixelPlaced(item.event);
        else if (item.kind === "cleared") applyCanvasCleared(item.event);
        else applySettingsChanged(item.event);
      }
    } catch (err: unknown) {
      if (silent) {
        // Best-effort path: keep existing state, log so an operator
        // sees the gap. Don't trigger the QueryError view — the user
        // is likely actively painting and a sudden full-screen error
        // for a background refresh would be worse than slightly stale
        // data. console.warn matches the convention used in
        // ProfilesContext (and leveling-leaderboard); a tiny log
        // helper would be a separate cross-DevKit convergence.
        console.warn("[CanvasContext] silent reload failed:", err);
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      // Drop any buffered events on a failed reload — they'd be applied
      // on top of stale state with no snapshot, which is worse than
      // dropping them; the next successful reload will pick up current
      // state from getCanvas.
      bufferedEventsRef.current = [];
    } finally {
      inFlightReloadRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [applyPixelPlaced, applyCanvasCleared, applySettingsChanged]);

  // Wire reloadRef so applySettingsChanged's mismatch path can call
  // reload without forming a useCallback dependency cycle.
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // PixelPlaced — clone-and-update the local Map (so React's reference-
  // equality re-render fires). We process our OWN placements via the
  // broadcast too — no separate optimistic-update path — since the server
  // broadcasts to "all" including us. Idempotent: applying the same
  // broadcast twice yields the same final state.
  //
  // Own-placement bookkeeping: when event.userId matches the local user,
  // also forward the placedAt to myLastPlacedAt. This is the recovery
  // path for the not-strictly-idempotent retry case described in the
  // header — if the PlacePixel response was lost and the retry hit
  // COOLDOWN_NOT_ELAPSED, this handler still picks up the placedAt from
  // the broadcast (which always fires on the server-side success) and
  // starts the cooldown clock. Math.max guards against out-of-order
  // arrival between broadcast and direct response.
  useEffect(() => {
    const onPlaced = (event: PixelPlacedEvent) => {
      if (inFlightReloadRef.current) {
        bufferedEventsRef.current.push({ kind: "placed", event });
        return;
      }
      applyPixelPlaced(event);
    };
    pixelCanvasServiceClient.on(
      PixelCanvasServiceClientEvent.PixelPlaced,
      onPlaced,
    );
    return () => {
      pixelCanvasServiceClient.off(
        PixelCanvasServiceClientEvent.PixelPlaced,
        onPlaced,
      );
    };
  }, [applyPixelPlaced]);

  // CanvasCleared — reset to a fresh empty grid of the (possibly new) size.
  useEffect(() => {
    const onCleared = (event: CanvasClearedEvent) => {
      if (inFlightReloadRef.current) {
        bufferedEventsRef.current.push({ kind: "cleared", event });
        return;
      }
      applyCanvasCleared(event);
    };
    pixelCanvasServiceClient.on(
      PixelCanvasServiceClientEvent.CanvasCleared,
      onCleared,
    );
    return () => {
      pixelCanvasServiceClient.off(
        PixelCanvasServiceClientEvent.CanvasCleared,
        onCleared,
      );
    };
  }, [applyCanvasCleared]);

  // SettingsChanged — update cooldown clock. Size changes also fire this,
  // and the apply path defends against a dropped paired CanvasCleared
  // by triggering a silent reload when canvasSize doesn't match the
  // local width.
  useEffect(() => {
    const onSettings = (event: SettingsChangedEvent) => {
      if (inFlightReloadRef.current) {
        bufferedEventsRef.current.push({ kind: "settings", event });
        return;
      }
      applySettingsChanged(event);
    };
    pixelCanvasServiceClient.on(
      PixelCanvasServiceClientEvent.SettingsChanged,
      onSettings,
    );
    return () => {
      pixelCanvasServiceClient.off(
        PixelCanvasServiceClientEvent.SettingsChanged,
        onSettings,
      );
    };
  }, [applySettingsChanged]);

  // AdminsChanged — re-fetch GetCanvas to pick up the new amIAdmin.
  // Silent so the canvas doesn't blank to <Loader /> for every connected
  // client when admins shuffle (the data we get back is mostly the same
  // for non-admins; the only consequential change is amIAdmin). The
  // common case — admin role assignments shifting around in
  // globalSettings — fires AdminsChanged on every globalSettings update,
  // which means painting members would otherwise see a brief full-screen
  // Loader every time an unrelated admin tweaked a setting.
  useEffect(() => {
    const onAdmins = () => {
      void reload({ silent: true });
    };
    pixelCanvasServiceClient.on(
      PixelCanvasServiceClientEvent.AdminsChanged,
      onAdmins,
    );
    return () => {
      pixelCanvasServiceClient.off(
        PixelCanvasServiceClientEvent.AdminsChanged,
        onAdmins,
      );
    };
  }, [reload]);

  const setMyLastPlacedAt = useCallback((placedAt: number) => {
    // Math.max guards against out-of-order updates between the direct
    // RPC response (HomeView calls this after placePixel resolves) and
    // the PixelPlaced broadcast handler above — whichever lands first
    // wins, and the loser is a no-op.
    setMyLastPlacedAtState((prev) => Math.max(prev, placedAt));
  }, []);

  const value: CanvasState = {
    width,
    height,
    pixels,
    myLastPlacedAt,
    cooldownSeconds,
    palette,
    amIAdmin,
    limits,
    loading,
    error,
    setMyLastPlacedAt,
    reload,
  };
  return <CanvasCtx.Provider value={value}>{children}</CanvasCtx.Provider>;
};

export function useCanvas(): CanvasState {
  const v = useContext(CanvasCtx);
  if (!v) throw new Error("useCanvas must be used inside <CanvasProvider>");
  return v;
}
