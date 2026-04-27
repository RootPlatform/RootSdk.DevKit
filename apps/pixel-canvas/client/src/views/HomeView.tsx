import React, { useCallback, useEffect, useState } from "react";
import styles from "./HomeView.module.css";
import { pixelKey, useCanvas } from "../contexts/CanvasContext";
import { useProfiles } from "../contexts/ProfilesContext";
import { pixelCanvasServiceClient } from "@pixelcanvas/gen-client";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { PixelGrid } from "../components/PixelGrid";
import { ColorPalette } from "../components/ColorPalette";
import { ActionPanel } from "../components/ActionPanel";
import { RootServerException } from "@rootsdk/client-app";

// ============================================================================
// HomeView — the canvas, palette, and action panel stacked vertically.
//
// Two-step placement model (see DESIGN.md "Placement flow"):
//   1. User taps a cell → selection state updates → action panel shows
//      the cell coords + provenance + Place button.
//   2. User taps Place → RPC fires → on success, server broadcasts to
//      all clients including us; the broadcast handler in CanvasContext
//      updates the local pixel map. Selection resets.
//
// Why two-step everywhere (not just mobile): the canvas is dense (small
// cells), and tap-to-place would mean any mis-tap is a wasted cooldown.
// The two-step lets the user adjust before committing. Same UX r/place
// shipped with — tap to choose, tap to confirm.
//
// Cell sizing: cells size to fit min(viewport, 600px). The PixelGrid
// component takes a `cellSize` in pixels which we recompute on resize
// + on canvas dimension change. We don't use ResizeObserver — a simple
// window resize listener + the dependency-driven recompute is enough.
//
// Cooldown clock: we tick a local 250ms timer to keep the countdown
// label accurate without re-rendering the whole tree on every frame.
// The timer just bumps a `tick` state; the cooldown calc reads
// `Date.now() - myLastPlacedAt` against `cooldownSeconds * 1000`. The
// clock stops (clears the interval) when remainingMs hits zero so we
// don't run a pointless 250ms timer indefinitely.
// ============================================================================

// Must equal the horizontal padding on `.home` in HomeView.module.css
// (16px × 2). Hardcoded here because the cell-size computation needs to
// know how much of `window.innerWidth` is reserved for padding before
// rounding cellSize to integer pixels — there's no clean CSS-only way
// to do that flooring step. If you change `.home`'s left/right padding,
// update this to match (or add a getComputedStyle read at compute time
// if a fork makes the padding dynamic).
const HORIZONTAL_PADDING = 32;
const MAX_CANVAS_PX = 600;
// Resize handler debounce. Mobile keyboard slide / orientation change
// can fire `resize` events in rapid bursts; debouncing prevents the
// cellSize compute from thrashing the layout dozens of times in a few
// hundred ms.
const RESIZE_DEBOUNCE_MS = 100;

export const HomeView: React.FC = () => {
  const {
    width,
    height,
    pixels,
    palette,
    myLastPlacedAt,
    cooldownSeconds,
    loading,
    error,
    reload,
    setMyLastPlacedAt,
  } = useCanvas();

  const { request: requestProfiles } = useProfiles();

  const [selected, setSelected] = useState<
    { x: number; y: number } | undefined
  >(undefined);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | undefined>(undefined);

  // Default the selected color to the first palette entry once it loads.
  // Also re-seeds if the current selection is no longer in the palette —
  // today the palette is server-static so this never trips, but a fork
  // adding an editable palette would otherwise inherit a stale-selection
  // bug where deleting the selected color leaves selectedColor pointing
  // at a value the server would reject as INVALID_COLOR on next place.
  useEffect(() => {
    if (palette.length === 0) return;
    if (!selectedColor || !palette.includes(selectedColor)) {
      setSelectedColor(palette[0]);
    }
  }, [palette, selectedColor]);

  // Cell size = available width / number of columns, capped to give a
  // sensible upper bound on huge displays. Recomputed on resize.
  // Square canvas, so width === height; we depend on `width` only and
  // `height` is included for symmetry / safety against a future fork
  // that allows non-square dimensions.
  const [cellSize, setCellSize] = useState(0);
  useEffect(() => {
    if (width === 0 || height === 0) return;
    const compute = () => {
      const available = Math.min(window.innerWidth - HORIZONTAL_PADDING, MAX_CANVAS_PX);
      // Round down to integer px so cells are pixel-aligned (avoids
      // sub-pixel grid gaps that look like seams). Use the larger of
      // width/height to keep both axes inside the available square.
      const cells = Math.max(width, height);
      setCellSize(Math.max(4, Math.floor(available / cells)));
    };
    compute();
    // Debounce the listener so a burst of resize events (mobile keyboard
    // slide, orientation change, devtools docking) doesn't recompute on
    // every frame. Trailing-edge: we only care about the final size.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        compute();
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", debounced);
    return () => {
      window.removeEventListener("resize", debounced);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [width, height]);

  // Cooldown clock — re-render every 250ms while there's remaining time
  // so the action panel countdown stays current. The interval clears
  // itself once the cooldown has elapsed so an idle user doesn't pay a
  // perpetual 4Hz re-render cost (the React effect's cleanup only fires
  // when myLastPlacedAt or cooldownSeconds changes, which would otherwise
  // mean "until the next placement" — minutes or hours).
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const cooldownMs = cooldownSeconds * 1000;
    if (cooldownMs - (Date.now() - myLastPlacedAt) <= 0) return;
    const id = window.setInterval(() => {
      // Clear the interval first when cooldown has elapsed; only bump
      // the tick if we're still ticking. Bumping after clear was a
      // wasted state set on the boundary tick.
      if (Date.now() - myLastPlacedAt >= cooldownMs) {
        window.clearInterval(id);
        return;
      }
      setClockTick((t) => t + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [myLastPlacedAt, cooldownSeconds]);

  const cooldownMs = cooldownSeconds * 1000;
  const cooldownRemainingMs = Math.max(0, cooldownMs - (Date.now() - myLastPlacedAt));

  const handleCellClick = useCallback((x: number, y: number) => {
    setSelected({ x, y });
    setPlaceError(undefined);
  }, []);

  const handlePlace = useCallback(async () => {
    if (!selected || !selectedColor) return;
    // Capture the cell we're placing so the success handler only clears
    // the selection if the user hasn't moved it. If the user taps a new
    // cell while the place RPC is in flight, their explicit re-tap wins
    // and we leave the new selection alone instead of silently wiping it.
    const placingAt = { x: selected.x, y: selected.y };
    setPlacing(true);
    setPlaceError(undefined);
    try {
      // PlacePixel is NOT idempotent — the server-side cooldown set is a
      // side effect that makes a retry-on-lost-response hit
      // COOLDOWN_NOT_ELAPSED (positive code, surfaced as an error to the
      // user) even though the original placement landed. Single attempt
      // here; on a real network blip the user retries manually. The
      // PixelPlaced broadcast handler in CanvasContext picks up the
      // placedAt for own placements regardless of whether the response
      // delivered, so the cooldown clock starts correctly even when this
      // call rejects with a transient error.
      const r = await pixelCanvasServiceClient.placePixel({
        x: placingAt.x,
        y: placingAt.y,
        color: selectedColor,
      });
      setMyLastPlacedAt(Number(r.placedAt));
      setSelected((curr) =>
        curr && curr.x === placingAt.x && curr.y === placingAt.y
          ? undefined
          : curr,
      );
    } catch (err: unknown) {
      // Surface RootServerException messages directly; they're already
      // user-friendly (set by the server). Other errors (network) get a
      // generic fallback.
      if (err instanceof RootServerException) {
        setPlaceError(err.message);
      } else {
        setPlaceError(
          err instanceof Error ? err.message : "Couldn't place pixel",
        );
      }
    } finally {
      setPlacing(false);
    }
  }, [selected, selectedColor, setMyLastPlacedAt]);

  // Request the placer's profile when a cell with an existing pixel is
  // selected, so ActionPanel can render "placed by @nickname". The
  // request is cheap if the userId is already cached and batches with
  // any other in-flight requests inside the same tick.
  //
  // The cell lookup uses the exported pixelKey helper (same format
  // CanvasContext writes with — drift between callers would surface as
  // silent miss-lookups). The effect dependency is the userId rather
  // than the existingPixel object: every PixelPlaced broadcast clones
  // the pixels Map, which gives `existingPixel` a new object reference
  // even when nothing about the current selection's pixel changed —
  // depending on the userId avoids re-firing requestProfiles on every
  // remote placement.
  const existingPixel = selected
    ? pixels.get(pixelKey(selected.x, selected.y))
    : undefined;
  const existingPixelUserId = existingPixel?.userId;
  useEffect(() => {
    if (existingPixelUserId) requestProfiles([existingPixelUserId]);
  }, [existingPixelUserId, requestProfiles]);

  if (loading || cellSize === 0) return <Loader />;
  if (error) return <QueryError message={error.message} onRetry={reload} />;

  // Canvas renders at exactly `cellSize × width` pixels (cellSize is
  // floored to keep cells pixel-aligned, so the actual canvas is usually
  // narrower than the 600px cap — e.g. 18 × 32 = 576px at max viewport).
  // Anchor the palette / ActionPanel / errorBanner to the SAME pixel width
  // via a CSS variable so they line up flush with the canvas's left and
  // right edges instead of bleeding 24px past either side.
  const canvasPixelWidth = cellSize * width;

  return (
    <div
      className={styles.home}
      style={{ "--canvas-width": `${canvasPixelWidth}px` } as React.CSSProperties}
    >
      <div className={styles.canvasWrap}>
        <PixelGrid
          width={width}
          height={height}
          pixels={pixels}
          selected={selected}
          selectedColor={selectedColor}
          cellSize={cellSize}
          onCellClick={handleCellClick}
        />
      </div>
      <ColorPalette
        palette={palette}
        selected={selectedColor}
        disabled={cooldownRemainingMs > 0}
        onSelect={(c) => {
          setSelectedColor(c);
          // Clear any prior place error so the user isn't staring at a
          // stale "Cooldown active" / "Invalid color" banner after they
          // pick a new color. Cell-click does the same — picking a new
          // color is also "moving on from whatever just failed".
          setPlaceError(undefined);
        }}
      />
      {placeError ? (
        <div className={styles.errorBanner} role="alert">
          {placeError}
        </div>
      ) : null}
      <ActionPanel
        selected={selected}
        selectedColor={selectedColor}
        cooldownRemainingMs={cooldownRemainingMs}
        existingPixel={existingPixel}
        onPlace={handlePlace}
        placing={placing}
      />
    </div>
  );
};
