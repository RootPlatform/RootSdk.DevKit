import React, { useCallback, useEffect, useState } from "react";
import styles from "./Settings.module.css";
import { useCanvas } from "../contexts/CanvasContext";
import { pixelCanvasServiceClient } from "@pixelcanvas/gen-client";
import type { CanvasLimits } from "@pixelcanvas/gen-shared";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { AdminOnly } from "../components/AdminOnly";
import { Button } from "../components/Button";
import { TextInput } from "../components/TextInput";
import { NumberInput } from "../components/NumberInput";
import { AutoSaveStatus } from "../components/AutoSaveStatus";
import { useDebouncedMutation } from "../lib/useDebouncedMutation";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// Settings — admin-only editor for cooldown + canvas reset (which doubles
// as resize because pixels can't survive a dimension change).
//
// Two sections:
//   - GENERAL: cooldown only. Auto-saves on change with a short debounce.
//     Cooldown isn't destructive — tweaking it can't lose any data — so
//     it doesn't need confirmation.
//   - RESET CANVAS: size selector + type-to-confirm + Reset button.
//     Combines what was previously two separate UI flows ("change size"
//     and "clear canvas") into a single destructive action because they
//     share the same underlying consequence: wipe all placed pixels,
//     optionally with new dimensions. The button label flips between
//     "Reset to NxN" (size changed) and "Clear canvas" (size unchanged)
//     to tell the admin exactly what the click will do.
//
// Why one section, not two:
//   The earlier two-section design had separate ceremonies for what was
//   essentially the same destructive op. A resize confirmation pattern
//   that didn't match the standalone-clear pattern made the page feel
//   like it was hiding consequences in one path and surfacing them in
//   the other. Collapsing into one section with one ceremony fixes that.
//
// Adaptive ceremony in the Reset section:
//   - Canvas empty: clicking a size commits immediately. Type-to-confirm
//     input is hidden — there's nothing to destroy, so the ceremony would
//     be theater. The button itself is also hidden in this mode; the
//     size click IS the action.
//   - Canvas populated: clicking a size only PRE-SELECTS it; the admin
//     types "reset canvas" and clicks the Reset button to commit. This
//     scales the friction to the actual destructive consequence.
//   The dividing line ("does anything actually get destroyed?") is a
//   clean axis. This isn't the same anti-pattern as before because the
//   outcomes genuinely differ — empty mode loses nothing; populated mode
//   loses M pixels.
// ============================================================================

export const Settings: React.FC = () => {
  const { amIAdmin } = useCanvas();
  return (
    <AdminOnly isAdmin={amIAdmin}>
      <SettingsInner />
    </AdminOnly>
  );
};

const RESET_CONFIRM_PHRASE = "reset canvas";

const SettingsInner: React.FC = () => {
  // Live pixel count drives the empty-vs-populated mode for the Reset
  // section. CanvasProvider sits at the App.tsx level so the broadcast-
  // driven pixel state is visible here. When CanvasCleared fires (admin
  // commits a reset right here, or someone else clears externally),
  // pixels resets to an empty Map and the section transitions back to
  // empty mode automatically.
  //
  // canvasSize and cooldownSeconds are BOTH sourced from CanvasContext
  // — the same broadcast-driven channel that updates `pixels`. Without
  // that wiring, a concurrent admin editing from another tab (or
  // device) would leave THIS admin's UI stuck on the old values, and
  // their next save would replay the stale state as if it were a
  // meaningful choice. NumberInput's focus-aware sync handles the
  // "don't clobber while typing" case so a broadcast arriving mid-
  // keystroke doesn't wipe the user's edit. Last-writer-wins between
  // concurrent admin edits remains — the UI just doesn't lie about
  // which value is currently authoritative.
  const {
    pixels: livePixels,
    width: canvasSize,
    cooldownSeconds,
  } = useCanvas();
  const livePixelCount = livePixels.size;
  const isEmpty = livePixelCount === 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  // The size the admin has clicked in the UI. Initially mirrors
  // canvasSize (server's actual size). In empty mode every click commits
  // and re-mirrors. In populated mode it can drift ahead of canvasSize
  // while the admin lines up a reset; the gap is what makes
  // `sizeChanged` true and flips the button label to "Reset to N×N".
  const [selectedSize, setSelectedSize] = useState(0);
  const [limits, setLimits] = useState<CanvasLimits | undefined>(undefined);

  // Reset-button state (populated mode only).
  const [confirmTyped, setConfirmTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | undefined>(undefined);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const r = await withClientRetry(() =>
        pixelCanvasServiceClient.getSettings({}),
      );
      // cooldownSeconds + canvasSize are sourced from CanvasContext
      // (broadcast-driven), so we don't store them locally. We DO seed
      // selectedSize from GetSettings's reply on first load —
      // CanvasContext's width may not have hydrated yet at the moment
      // Settings mounts (it's its own getCanvas roundtrip), and this
      // avoids a transient `0` value that would mark every size as
      // "changed" until the broadcast arrives.
      setSelectedSize(r.canvasSize);
      setLimits(r.limits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Auto-save mutation, used for cooldown changes (always) and for
  // empty-mode size changes (where commit-on-click is appropriate because
  // there's nothing to destroy). Errors surface in AutoSaveStatus.
  const save = useDebouncedMutation<{ cooldownSeconds: number; canvasSize: number }>({
    mutationFn: async (next) => {
      await withClientRetry(() =>
        pixelCanvasServiceClient.updateSettings(next),
      );
    },
  });

  const updateCooldown = useCallback(
    (next: number) => {
      // cooldownSeconds is now sourced from CanvasContext, so we don't
      // setLocal — the broadcast that fires after the auto-save lands
      // will update ctx and re-render this view with the new value.
      // NumberInput's display state holds the user's typed text in the
      // meantime so the input doesn't flicker between commit and
      // broadcast-arrival.
      save.mutate({ cooldownSeconds: next, canvasSize });
    },
    [save, canvasSize],
  );

  const handleSizeClick = useCallback(
    (next: number) => {
      if (next === selectedSize) return;
      setSelectedSize(next);
      if (isEmpty) {
        // Empty canvas: commit immediately. Server's updateSettings does a
        // server-side clear (a no-op on already-empty pixels) and broadcasts
        // CanvasCleared with the new dimensions. Local canvasSize updates
        // automatically via the broadcast → CanvasContext.width path.
        save.mutate({ cooldownSeconds, canvasSize: next });
      }
    },
    [selectedSize, isEmpty, cooldownSeconds, save],
  );

  // Drop a stale pending selection back to the actual canvasSize the
  // moment the canvas becomes empty. Without this, an admin could line up
  // a populated-mode reset to 48×48, then someone else clears the canvas
  // externally, and the section would transition to empty mode with a
  // stale `selectedSize=48` lingering — the size-button highlight would
  // imply 48 is current when the actual canvas is still the previous size.
  useEffect(() => {
    if (isEmpty && selectedSize !== canvasSize) {
      setSelectedSize(canvasSize);
    }
  }, [isEmpty, canvasSize, selectedSize]);

  const sizeChanged = selectedSize !== canvasSize;
  // Strict equality against the literal phrase — same shape leveling-
  // leaderboard's ResetAllXp ceremony uses (typed === RESET_ALL_PHRASE).
  // Forgiving casing/whitespace would erode the deliberate-typing
  // friction that makes type-name-to-confirm a meaningful gate.
  const canConfirm = !isEmpty && confirmTyped === RESET_CONFIRM_PHRASE;

  const handleReset = useCallback(async () => {
    if (!canConfirm) return;
    setResetting(true);
    setResetError(undefined);
    try {
      // Cancel BEFORE the await on the size-changed path. The queued
      // cooldown auto-save (if any) carries the canvasSize that was
      // current when updateCooldown ran — a stale closure value
      // relative to the size we're about to commit. Letting it fire
      // would re-send the OLD size, which the server reads as a
      // sizeChanged request and would re-clear/resize the canvas back
      // to its prior dimension, undoing this reset.
      //
      // The cancel must happen before `await updateSettings(...)` to
      // close the in-flight race too: if the debounce timer fires
      // during the await, the auto-save's mutation runs in parallel
      // with our reset and `cancel()` afterward only drops the queued
      // *timer*, not the in-flight RPC.
      //
      // In the !sizeChanged branch (same-size clear), the queued
      // payload's canvasSize already matches the server, so letting
      // the auto-save fire is harmless — and it's the only path that
      // actually commits the user's typed cooldown change. Cancelling
      // here would silently drop the cooldown edit they just made.
      if (sizeChanged) save.cancel();
      if (sizeChanged) {
        // Resize implicitly clears server-side. Single RPC.
        await withClientRetry(() =>
          pixelCanvasServiceClient.updateSettings({
            cooldownSeconds,
            canvasSize: selectedSize,
          }),
        );
        // Refresh the auto-save's retry target with current state so a
        // user clicking Retry on a still-visible AutoSaveStatus error
        // pill (from a prior failed cooldown auto-save) can't replay the
        // stale pre-resize canvasSize and undo this resize. Pair with
        // clearError() below to also dismiss the pill — pill-dismiss is
        // the primary defense (no Retry button = no replay), the
        // refreshed snapshot is belt-and-suspenders for any fork that
        // exposes retry through another path.
        save.cancel({ cooldownSeconds, canvasSize: selectedSize });
        save.clearError();
      } else {
        // Same size — clearCanvas is the dedicated RPC for "clear without
        // resize". updateSettings only clears as a side effect of size
        // change (see server's pixelCanvasService.updateSettings), so we
        // can't substitute it here.
        await withClientRetry(() =>
          pixelCanvasServiceClient.clearCanvas({}),
        );
      }
      setConfirmTyped("");
    } catch (err: unknown) {
      setResetError(
        err instanceof Error ? err.message : "Couldn't reset canvas",
      );
    } finally {
      setResetting(false);
    }
  }, [canConfirm, sizeChanged, cooldownSeconds, selectedSize, save]);

  if (loading) return <Loader />;
  if (error) return <QueryError message={error.message} onRetry={reload} />;
  // Wait for both GetSettings (limits) AND CanvasContext (canvasSize via
  // ctx.width) before rendering the form. Without the canvasSize > 0
  // gate, an unhydrated ctx would briefly render with `canvasSize=0`
  // which doesn't match any allowed size, and the snap-back useEffect
  // below would chase selectedSize back to 0 — flicker visible to the
  // admin during normal navigation into Settings.
  if (!limits || canvasSize === 0) return <Loader />;

  return (
    <div className={styles.settings}>
      {/* No in-view <h1> — AppHeader already shows "Pixel Canvas" above
          this view, so a duplicate page title here would just stack the
          same words on top of each other. AutoSaveStatus renders null
          when there's no error, so dropping the wrapper row leaves no
          empty slot in the layout. */}
      <p className={styles.subhead}>
        Cooldown auto-saves. Resetting the canvas (clearing pixels and
        optionally resizing) lives below.
      </p>
      <AutoSaveStatus
        error={save.error}
        onRetry={save.retry}
        onDismissError={save.clearError}
      />

      <section className={styles.section}>
        <div className={styles.sectionLabel}>GENERAL</div>

        <div className={styles.field}>
          <p className={styles.fieldHint}>
            Seconds each member must wait between placements.
          </p>
          {/* NumberInput holds raw input text internally so the field can
              go empty mid-edit without snapping to min and clobbering the
              user's typing. It only commits when the value parses to an
              in-range integer; an out-of-range or empty value during
              typing is preserved visually but not auto-saved. On blur it
              clamps + restores. */}
          <NumberInput
            label="Cooldown (seconds)"
            value={cooldownSeconds}
            min={limits.cooldownSecondsMin}
            max={limits.cooldownSecondsMax}
            onChange={updateCooldown}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>RESET CANVAS</div>
        <p className={styles.fieldHint}>
          Wipes all placed pixels. Optionally pick a new size — pixels
          can't be preserved through a dimension change.
        </p>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Size</span>
          <div
            className={styles.sizeSelector}
            role="radiogroup"
            aria-label="Canvas size"
          >
            {limits.allowedCanvasSizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={[
                    styles.sizeOption,
                    isSelected ? styles.sizeOptionActive : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSizeClick(size)}
                >
                  {size}×{size}
                </button>
              );
            })}
          </div>
        </div>

        {isEmpty ? (
          <p className={styles.fieldHint}>
            The canvas is empty — size changes apply immediately.
          </p>
        ) : (
          <>
            <p className={styles.fieldHint}>
              <strong>{livePixelCount}</strong> pixel
              {livePixelCount === 1 ? "" : "s"} currently placed. Type{" "}
              <code>{RESET_CONFIRM_PHRASE}</code> to enable the reset
              button.
            </p>
            <TextInput
              value={confirmTyped}
              onChange={setConfirmTyped}
              placeholder={`Type "${RESET_CONFIRM_PHRASE}" to confirm`}
              aria-label="Type to confirm canvas reset"
            />
            {resetError ? (
              <div className={styles.errorBanner} role="alert">
                {resetError}
              </div>
            ) : null}
            <div className={styles.resetActions}>
              <Button
                variant="danger"
                onClick={handleReset}
                disabled={!canConfirm || resetting}
              >
                {resetting
                  ? "Resetting…"
                  : sizeChanged
                    ? `Reset to ${selectedSize}×${selectedSize}`
                    : "Clear canvas"}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
