import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
// Own-placement local state is updated from ONE source:
//   - The PlacePixel response handler in HomeView calls applyOwnPlacement
//     with the placedAt the server returned. That synthesizes a local
//     PixelPlacedEvent and runs through applyPixelPlaced, starting the
//     cooldown clock AND writing the pixel locally without waiting for
//     a broadcast roundtrip. Critical when safeBroadcast on the server
//     quietly catches a PixelPlaced failure: the placer's RPC returned
//     success but no broadcast was emitted, and (per `except: client`
//     below) we wouldn't have received it anyway.
//
// The PixelPlaced broadcast EXCLUDES the placer (server uses
// `except: client` — see pixelCanvasService.placePixel). Trade-off: a
// direct-response loss (RPC succeeded server-side, response lost in
// transit) leaves the placer with no pixel and no cooldown locally;
// they'd manually retry, hit COOLDOWN_NOT_ELAPSED (the original
// placement DID commit and started the cooldown), and wait it out.
// Tail case for a real network blip; the wire savings on every
// placement (1/N of fanout) are worth it for a sample teaching
// efficient broadcast audiences.
//
// PlacePixel deliberately doesn't go through withClientRetry (see
// lib/retry.ts) precisely because a retry-on-lost-response would
// hit COOLDOWN_NOT_ELAPSED for the placement that already landed.
// A future fork that wraps PlacePixel in withClientRetry would
// re-introduce that hazard with no broadcast-driven recovery to
// soften it (the placer is now excluded from the broadcast).
//
// Color encoding on the wire is palette-INDEX (uint32), not hex
// strings. PixelData/PlacePixelRequest/PixelPlacedEvent all carry
// `paletteIndex`; this context decodes via the cached `palette` to
// produce hex strings that downstream render code consumes through
// PixelInfo.color. See proto comments + pixelCanvasService.ts for
// the wire-efficiency rationale.
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
  // Apply our own placement to local state after a successful PlacePixel
  // response — both the cooldown clock AND the pixels Map. The broadcast
  // handler would do the same, but if `safeBroadcast` quietly catches a
  // broadcast failure, the placer's own client would never see their
  // pixel land (cooldown ticks but the cell stays empty until a manual
  // refresh). Calling this on success closes that asymmetric tail —
  // when the broadcast does succeed, applyPixelPlaced runs again on
  // the same data and is a no-op (idempotent setPixels).
  applyOwnPlacement: (
    x: number,
    y: number,
    paletteIndex: number,
    placedAt: number,
  ) => void;
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

// Decode wire palette indexes into hex strings using the just-fetched
// palette. Called inside reload BEFORE palette state has been committed,
// so we take palette as a parameter rather than reading from state — the
// snapshot's pixels and palette arrive in the same response and must be
// decoded against THAT response's palette, not whatever palette state
// happens to hold from a prior fetch.
//
// Skip-on-undefined is symmetric with the server's encode-side policy
// in pixelCanvasService.getCanvas: a stored hex no longer in the
// palette is logged + dropped from the response. Both ends fail-loud
// by treating drifted entries as absent rather than rendering a
// misleading fake-white pixel with the original placer's name. A
// Map entry with color: undefined would also crash render code
// expecting a string, so the skip doubles as a render guard.
function entriesToMap(
  entries: PixelEntry[],
  palette: readonly string[],
): Map<string, PixelInfo> {
  const m = new Map<string, PixelInfo>();
  for (const e of entries) {
    if (!e.data) continue;
    const color = palette[e.data.paletteIndex];
    if (color === undefined) continue;
    m.set(pixelKey(e.x, e.y), {
      color,
      userId: e.data.userId,
      placedAt: Number(e.data.placedAt),
    });
  }
  return m;
}

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Captured once at mount via useState's lazy initializer. Compared to
  // useMemo, useState retains the value across re-renders unconditionally
  // — useMemo is technically allowed to re-compute under memory pressure
  // (per React's docs). The SDK guarantees this stays valid for the
  // session (the user can't change their own ID), so we don't subscribe
  // for updates.
  const [currentUserId] = useState(() => rootClient.users.getCurrentUserId());

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
    | { kind: "settings"; event: SettingsChangedEvent }
    // Signal-only buffer entry for AdminsChanged. The broadcast itself
    // carries no payload; we just need to remember "fire a getAmIAdmin
    // RPC after the in-flight reload completes" so the lightweight
    // refresh's setAmIAdmin lands AFTER the snapshot's setAmIAdmin and
    // isn't overwritten. Multiple admins entries collapse to a single
    // fire at drain time (push without dedup, drain consolidates).
    | { kind: "admins" };
  const inFlightReloadRef = useRef(false);
  const bufferedEventsRef = useRef<BufferedEvent[]>([]);
  // Read inside applySettingsChanged so the width-mismatch check always
  // sees the latest value rather than a closure snapshot from whenever
  // the handler was last memoized.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);
  // Live palette ref so applyPixelPlaced (a stable useCallback with
  // empty/minimal deps) can decode broadcast palette indexes against
  // the currently-cached palette without taking palette as a dep — a
  // dep would re-create applyPixelPlaced on every reload and cascade
  // through the subscription effects, tearing down and re-adding
  // listeners for nothing. Synced via useEffect on the post-commit
  // path, AND manually inside reload's drain path before draining
  // (same pattern as widthRef — the post-commit useEffect runs too
  // late for a same-tick drain). See reload below for the manual sync.
  const paletteRef = useRef<readonly string[]>(palette);
  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  // Apply a PixelPlaced event to local state. Pulled out of the
  // subscription handler so reload's drain path can call it directly.
  //
  // Allocation cost: every event clones the entire `pixels` Map (entry
  // refs are shared, only the Map shell is new). At max canvas (64×64
  // = 4,096 entries) and a flooded broadcast rate, this is meaningful
  // GC pressure. PixelGrid's per-Cell React.memo keeps render cost
  // down regardless — only the changed cell re-renders — but the Map
  // allocation itself is unavoidable with this data shape.
  // See README "Known limits → High-frequency broadcasts at scale" for
  // the operator-side mitigations (server-side coalescing, delta
  // compression). At community scale (<~1k active painters) this is
  // comfortable; very large communities should consider a persistent
  // data structure (e.g. immer's structural sharing) so the Map clone
  // is a tree mutation instead of a full re-allocation.
  const applyPixelPlaced = useCallback(
    (event: PixelPlacedEvent) => {
      // Decode the wire palette index against the cached palette. If the
      // index is out of range (shouldn't happen — server validates on
      // placement), drop the event silently rather than write undefined
      // into the Map. Same defense as entriesToMap.
      const color = paletteRef.current[event.paletteIndex];
      if (color === undefined) return;
      setPixels((prev) => {
        const next = new Map(prev);
        next.set(pixelKey(event.x, event.y), {
          color,
          userId: event.userId,
          placedAt: Number(event.placedAt),
        });
        return next;
      });
      // Own-placement bookkeeping. Reached only via applyOwnPlacement's
      // synthesized event — the server's PixelPlaced broadcast uses
      // `except: client`, so the placer never receives their own
      // placement over the network. The branch stays here because the
      // synthesized event has userId=currentUserId and still needs to
      // bump the cooldown clock.
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
      //
      // queueMicrotask so the reload runs AFTER the current synchronous
      // block. This is critical when applySettingsChanged is called
      // from the drain loop inside reload itself: at that moment
      // inFlightReloadRef.current is still true (cleared in finally
      // after the drain), and reload's double-fire guard would bail
      // out — silently losing the recovery for the exact scenario it
      // exists for. Deferring past the current tick lets the in-flight
      // reload's finally clear the flag first; the microtask then
      // sees no in-flight work and proceeds. Multiple buffered
      // SettingsChanged each schedule a microtask; the first wins,
      // subsequent calls hit the guard cleanly.
      if (event.canvasSize !== widthRef.current) {
        queueMicrotask(() => void reloadRef.current({ silent: true }));
      }
    },
    // Empty deps are LOAD-BEARING. reload's useCallback depends on the
    // three apply* functions; if any of them gained a non-stable dep,
    // reload would re-create on every render, which would re-run the
    // AdminsChanged subscription effect and tear-down/re-add the
    // listener for nothing. Read everything from refs (widthRef,
    // reloadRef) so the body stays referentially stable while still
    // seeing the latest values at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Forward-declared ref so applySettingsChanged can call reload without
  // a circular useCallback dep (reload itself depends on the apply* fns
  // via the drain step). We assign the live reload to this ref after it's
  // defined below.
  const reloadRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(
    async () => {},
  );

  // Lightweight per-caller admin refresh. Fired on every AdminsChanged
  // broadcast — the only thing that needs to change is the amIAdmin
  // boolean, so we send a 1-byte response over the wire instead of
  // refetching the entire ~200KB canvas snapshot. See proto
  // GetAmIAdminRequest comment for the wire-efficiency rationale.
  //
  // Defined BEFORE reload because reload's drain step calls it (when a
  // buffered AdminsChanged needs a post-snapshot refresh). const TDZ
  // means a forward reference would throw at reload's useCallback-
  // evaluation time — same constraint that motivates the reloadRef
  // pattern above for the reverse direction.
  //
  // Failure handling mirrors silent reload: log and keep current
  // amIAdmin. The next AdminsChanged (or a manual reload) will retry.
  // Worst case the user briefly sees stale admin chrome until either
  // event lands — a better UX than a full QueryError view for what's
  // structurally a background refresh.
  const refetchAmIAdmin = useCallback(async () => {
    try {
      const r = await withClientRetry(() =>
        pixelCanvasServiceClient.getAmIAdmin({}),
      );
      setAmIAdmin(r.amIAdmin);
    } catch (err) {
      console.warn("[CanvasContext] getAmIAdmin failed:", err);
    }
  }, []);

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    // Coalesce concurrent reload requests. The mount effect + an
    // AdminsChanged that arrives within the same render window would
    // otherwise fire two parallel getCanvas requests; the silent path is
    // particularly prone to bursts (a flapping admin config can fire
    // AdminsChanged repeatedly). Subsequent calls just return; whoever
    // is in flight will pick up the latest server state for them.
    if (inFlightReloadRef.current) return;
    if (!silent) {
      setLoading(true);
      setError(undefined);
    }
    inFlightReloadRef.current = true;
    try {
      const r = await withClientRetry(() =>
        pixelCanvasServiceClient.getCanvas({}),
      );
      // Apply the snapshot first. entriesToMap decodes pixel palette
      // indexes against THIS response's palette, not the (possibly
      // stale) palette currently in state — they arrive together and
      // must be decoded together.
      setWidth(r.width);
      setHeight(r.height);
      setPixels(entriesToMap(r.pixels, r.palette));
      setMyLastPlacedAtState(Number(r.myLastPlacedAt));
      setCooldownSeconds(r.cooldownSeconds);
      setPalette(r.palette);
      setAmIAdmin(r.amIAdmin);
      setLimits(r.limits);
      // Clear any stale error from a previous failed reload. The non-silent
      // path clears upfront before flipping `loading`; the silent path
      // can't (it'd flicker the QueryError view to empty mid-fetch if the
      // silent reload itself fails), so we do it on success here. Without
      // this, a failed initial load that surfaced a QueryError would
      // leave the pill up forever even after an AdminsChanged-driven
      // silent reload successfully repopulates state — a successful
      // silent reload is at least as authoritative as a manual retry.
      setError(undefined);
      // Sync widthRef + paletteRef synchronously before the drain. The
      // width-mismatch check inside applySettingsChanged and the palette
      // decode inside applyPixelPlaced both read .current at apply time;
      // the useEffects that normally sync them run AFTER React commits,
      // which is too late for any drain we run in this same tick.
      // Without this, a buffered PixelPlaced would decode against the
      // pre-snapshot palette (typically identical, but a fork that
      // mutates the palette would miscolor the cell) and a buffered
      // SettingsChanged whose canvasSize matches the just-applied
      // snapshot would trigger a redundant silent reload.
      widthRef.current = r.width;
      paletteRef.current = r.palette;
      // Then drain any events that arrived during the await window so
      // they re-apply on top of the snapshot. Events are functional
      // updates (setPixels((prev) => ...)) so they compose correctly
      // with the snapshot's setPixels above in React's batched commit.
      //
      // AdminsChanged markers are consolidated into a single
      // refetchAmIAdmin call after the loop — multiple flaps during
      // an in-flight reload don't need multiple RPCs, just one
      // post-snapshot refresh. The fire is intentionally outside the
      // loop so it lands AFTER all other event re-applications.
      const buffered = bufferedEventsRef.current;
      bufferedEventsRef.current = [];
      let needAdminsRefetch = false;
      for (const item of buffered) {
        if (item.kind === "placed") applyPixelPlaced(item.event);
        else if (item.kind === "cleared") applyCanvasCleared(item.event);
        else if (item.kind === "settings") applySettingsChanged(item.event);
        else if (item.kind === "admins") needAdminsRefetch = true;
      }
      if (needAdminsRefetch) void refetchAmIAdmin();
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
  }, [applyPixelPlaced, applyCanvasCleared, applySettingsChanged, refetchAmIAdmin]);

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

  // AdminsChanged — fire a lightweight GetAmIAdmin to refresh just the
  // admin flag. Buffered while a reload is in flight so the snapshot's
  // setAmIAdmin (from GetCanvas) doesn't clobber a more-recent refresh
  // result. The drain loop in reload() consolidates multiple buffered
  // admins markers into a single getAmIAdmin call.
  //
  // Race the buffering closes: reload starts at T=0 (admins=A in
  // snapshot). AdminsChanged fires at T=5 (admins=B). Without
  // buffering, getAmIAdmin would race the in-flight reload — its
  // response could land first (sets amIAdmin per B), then the reload's
  // snapshot lands (sets amIAdmin per A from the older snapshot),
  // leaving stale state until the NEXT AdminsChanged. Buffering
  // ensures the lightweight refresh fires only AFTER the snapshot has
  // applied, so its result is the final word.
  useEffect(() => {
    const onAdmins = () => {
      if (inFlightReloadRef.current) {
        bufferedEventsRef.current.push({ kind: "admins" });
        return;
      }
      void refetchAmIAdmin();
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
  }, [refetchAmIAdmin]);

  const applyOwnPlacement = useCallback(
    (x: number, y: number, paletteIndex: number, placedAt: number) => {
      // Apply BOTH the cooldown bump AND the pixel write locally. We
      // synthesize the same shape as a broadcast handler would receive
      // (palette_index on the wire) and call applyPixelPlaced —
      // Math.max-driven cooldown update + Map clone with the decoded
      // entry. This is now the SOLE source of own-placement state:
      // the server broadcast uses `except: client`, so we never see
      // our own placements over the network.
      //
      // Without applying locally on success: the placer's own client
      // would see cooldown ticking (from the placedAt the server
      // returned in the response) but the pixel cell visibly empty —
      // there's no broadcast echo to fill it in.
      const event: PixelPlacedEvent = {
        x,
        y,
        paletteIndex,
        userId: currentUserId,
        placedAt: BigInt(placedAt),
      };
      // If a reload is in flight, GetCanvas was sent BEFORE this
      // placement returned, so the snapshot may not include our pixel
      // (and even if it does, the apply order matters: snapshot first,
      // then events on top). Buffer the synthesized event so reload's
      // drain step re-applies it on top of the snapshot — without
      // this, the snapshot's setPixels would clobber the optimistic
      // write and the placer's pixel would appear to vanish (no
      // broadcast echo to recover from now).
      if (inFlightReloadRef.current) {
        bufferedEventsRef.current.push({ kind: "placed", event });
        return;
      }
      applyPixelPlaced(event);
    },
    [applyPixelPlaced, currentUserId],
  );

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
    applyOwnPlacement,
    reload,
  };
  return <CanvasCtx.Provider value={value}>{children}</CanvasCtx.Provider>;
};

export function useCanvas(): CanvasState {
  const v = useContext(CanvasCtx);
  if (!v) throw new Error("useCanvas must be used inside <CanvasProvider>");
  return v;
}
