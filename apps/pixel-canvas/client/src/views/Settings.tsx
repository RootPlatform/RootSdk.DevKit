import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Settings.module.css";
import { useCanvas } from "../contexts/CanvasContext";
import { pixelCanvasServiceClient } from "@pixelcanvas/gen-client";
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
  // Settings reads everything from CanvasContext — there's no separate
  // GetSettings RPC. The data CanvasContext loads via GetCanvas
  // (cooldownSeconds, width-as-canvasSize, limits) is exactly what
  // Settings needs, and going through ctx means we share the
  // broadcast-driven invalidation path: a peer admin's resize in
  // another tab is reflected here automatically without a per-view
  // refetch. The earlier dedicated GetSettings RPC was redundant — it
  // duplicated state, added a second loading/error path, and stayed
  // stale to broadcasts unless we manually re-invoked it.
  const {
    pixels: livePixels,
    width: canvasSize,
    cooldownSeconds,
    limits,
    loading,
    error,
    reload,
  } = useCanvas();
  const livePixelCount = livePixels.size;
  const isEmpty = livePixelCount === 0;

  // The size the admin has clicked in the UI. Initially mirrors
  // canvasSize (server's actual size) via the seed effect below. In
  // empty mode every click commits and re-mirrors. In populated mode it
  // can drift ahead of canvasSize while the admin lines up a reset; the
  // gap is what makes `sizeChanged` true and flips the button label to
  // "Reset to N×N".
  const [selectedSize, setSelectedSize] = useState(0);

  // Reset-button state (populated mode only).
  const [confirmTyped, setConfirmTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | undefined>(undefined);

  // Pending-edit refs. The auto-save's mutationFn and handleReset both
  // need to know "the user's latest typed cooldown" — reading from
  // ctx.cooldownSeconds gives the broadcast-confirmed (stale) value when
  // the user has typed but the auto-save hasn't fired yet. Refs let the
  // mutationFn read at FIRE time (not closure-capture time), so a
  // concurrent admin's resize that updates ctx.canvasSize between
  // typing and debounce-fire doesn't get clobbered by a stale closure
  // payload.
  //
  // - cooldownIntentRef: undefined when no edit pending; set on user
  //   typing; auto-clears when ctx catches up to it (auto-save landed
  //   successfully). After clear, handleReset / size auto-save fall
  //   back to the live ctx cooldown.
  // - ctxCooldownRef + canvasSizeRef: live ctx values, updated via
  //   useEffect so the mutationFn can read them at fire time.
  const cooldownIntentRef = useRef<number | undefined>(undefined);
  const ctxCooldownRef = useRef(cooldownSeconds);
  const canvasSizeRef = useRef(canvasSize);
  useEffect(() => {
    ctxCooldownRef.current = cooldownSeconds;
    // Clear the local intent when ctx matches it. Two paths land here:
    //   (a) the user's auto-save committed and the broadcast came back
    //       — the typical case; ctx is now genuinely current.
    //   (b) a peer admin happened to set the same value the local user
    //       typed. The intent clears as if our save landed; harmless
    //       because the final state is identical.
    // "ctx caught up" is the loose semantic — we don't try to
    // distinguish these because the outcomes are observably the same
    // (the user's value is now authoritative). A tighter "track this
    // specific edit by token" scheme would close the (b) ambiguity but
    // adds bookkeeping for no behavior change.
    //
    // KNOWN LIMITATION — peer edit during local typing: if a peer admin
    // commits a DIFFERENT cooldown value before our local user's auto-
    // save fires, ctx jumps to the peer's value. Our intent (the user's
    // typed value) doesn't equal ctx, so we don't clear it. NumberInput
    // resyncs display to ctx (the peer's value) once focus leaves —
    // the user now SEES the peer's value but our intent ref still
    // holds their original typed value. A subsequent Reset
    // (sizeChanged=true) reads `cooldownIntentRef.current ?? ctx` and
    // commits the user's stale typed value alongside the resize,
    // silently overwriting the peer's edit. The user's perception was
    // "I'm resetting at the cooldown I see" but Reset commits a
    // different value.
    //
    // Closing this perfectly would need either (a) clearing intent on
    // every ctx change (which loses the user's typing if they typed
    // and immediately clicked Reset before any save fired), or (b)
    // explicit conflict-resolution UX ("Settings changed elsewhere —
    // refresh?"). Both are bigger changes than this sample warrants.
    // Last-writer-wins is the documented semantic; this case sits at
    // the seam.
    if (cooldownIntentRef.current === cooldownSeconds) {
      cooldownIntentRef.current = undefined;
    }
  }, [cooldownSeconds]);
  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);

  // Auto-save mutation. The payload is a discriminated union — each
  // mutation only carries the field the user intended to change. The
  // OTHER field is read from a live ref at fire time, not closure-
  // captured at type/click time. Without that, a cooldown auto-save
  // queued before a peer admin's resize would replay the user's stale
  // canvasSize as a destructive resize when the debounce eventually
  // fires (server sees sizeChanged from NEW→OLD and resizes-and-clears
  // the canvas back to the prior dimension).
  type Mutation =
    | { kind: "cooldown"; cooldownSeconds: number }
    | { kind: "size"; canvasSize: number };
  const save = useDebouncedMutation<Mutation>({
    mutationFn: async (m) => {
      // For the field the user changed, use the payload (their intent).
      // For the other, use the live ref (latest authoritative state).
      // cooldown defaults to live ctx when no user-edit is pending;
      // canvas size always tracks ctx (we don't auto-save populated-mode
      // size changes — those go through the explicit Reset flow).
      if (m.kind === "cooldown") {
        await withClientRetry(() =>
          pixelCanvasServiceClient.updateSettings({
            cooldownSeconds: m.cooldownSeconds,
            canvasSize: canvasSizeRef.current,
          }),
        );
      } else {
        await withClientRetry(() =>
          pixelCanvasServiceClient.updateSettings({
            cooldownSeconds: cooldownIntentRef.current ?? ctxCooldownRef.current,
            canvasSize: m.canvasSize,
          }),
        );
      }
    },
  });

  const updateCooldown = useCallback(
    (next: number) => {
      // Short-circuit no-ops. NumberInput fires onChange on every
      // in-range keystroke; if the user types a value back to what's
      // currently authoritative AND there's no pending divergent intent,
      // the resulting RPC is a guaranteed no-op (server is idempotent
      // and the SettingsChanged broadcast is already gated on a real
      // change — see pixelCanvasService.updateSettings). Skipping it
      // saves a roundtrip without changing observable state.
      //
      // Also clear any stale save.error pill: if a prior save failed and
      // the user has now reverted their typing back to the authoritative
      // value, the failed-save state is no longer meaningful — they're
      // not trying to commit anything different from what the server
      // already has. Without this, the AutoSaveStatus error pill stays
      // up with a Retry button that would just no-op against current
      // server state.
      if (next === cooldownSeconds && cooldownIntentRef.current === undefined) {
        save.clearError();
        return;
      }
      // Capture user intent in the ref so handleReset and any subsequent
      // size auto-save read the just-typed value rather than ctx (which
      // is the broadcast-confirmed value, not yet aware of this edit).
      cooldownIntentRef.current = next;
      save.mutate({ kind: "cooldown", cooldownSeconds: next });
    },
    [save, cooldownSeconds],
  );

  const handleSizeClick = useCallback(
    (next: number) => {
      if (next === selectedSize) return;
      setSelectedSize(next);
      if (isEmpty) {
        // Empty canvas: commit immediately. Server's updateSettings does
        // a server-side clear (a no-op on already-empty pixels) and
        // broadcasts CanvasCleared with the new dimensions. Local
        // canvasSize updates automatically via the broadcast →
        // CanvasContext.width path.
        save.mutate({ kind: "size", canvasSize: next });
      }
    },
    [selectedSize, isEmpty, save],
  );

  // Mirror canvasSize into selectedSize in two cases:
  //   - Initial seed: selectedSize === 0 means we haven't initialized
  //     yet (useState(0) placeholder; CanvasContext's getCanvas
  //     roundtrip may not have hydrated by mount, so we can't
  //     initialize directly).
  //   - Snap-back on empty: when the canvas transitions populated →
  //     empty (someone else clears externally, or our own Reset
  //     committed), drop any stale pending selection so the size-button
  //     highlight reflects the actual canvas dimension and not whatever
  //     the admin had clicked moments before.
  // In populated mode with selectedSize already set, we leave selectedSize
  // alone — the gap between selectedSize and canvasSize IS the user's
  // pending Reset choice, and we don't want to clobber it.
  //
  // Functional setter + deps that DON'T include selectedSize: in empty
  // mode a size click runs handleSizeClick → setSelectedSize(N) +
  // save.mutate, and the broadcast that catches canvasSize up to N
  // arrives 250-400ms later. If selectedSize were a dep, this effect
  // would fire IMMEDIATELY after the click (selectedSize=N, canvasSize=
  // old), see `isEmpty && N !== oldCanvasSize`, and snap selectedSize
  // back to oldCanvasSize — bouncing the highlight off the user's
  // click for the duration of the broadcast roundtrip. Reading
  // selectedSize through the functional setter (via curr) lets us see
  // its latest value at update time without taking the dep.
  useEffect(() => {
    if (canvasSize === 0) return;
    setSelectedSize((curr) => {
      if (curr === 0 || (isEmpty && curr !== canvasSize)) {
        return canvasSize;
      }
      return curr;
    });
  }, [isEmpty, canvasSize]);

  const sizeChanged = selectedSize !== canvasSize;
  // Strict equality against the literal phrase — same shape leveling-
  // leaderboard's ResetAllXp ceremony uses (typed === RESET_ALL_PHRASE).
  // Forgiving casing/whitespace would erode the deliberate-typing
  // friction that makes type-name-to-confirm a meaningful gate.
  const canConfirm = !isEmpty && confirmTyped === RESET_CONFIRM_PHRASE;

  const handleReset = useCallback(async () => {
    if (!canConfirm) return;
    // Force-blur the active element so any in-progress NumberInput edit
    // commits via its onBlur handler before we read cooldownIntentRef.
    // On desktop the standard mousedown→focus-shift→blur→click order
    // already triggers NumberInput's blur handler (which clamps + calls
    // onChange → updateCooldown → cooldownIntentRef.current = clamped)
    // before this handler runs. On iOS Safari the touch→click sequence
    // can fire WITHOUT a focus shift, so the previously-focused
    // NumberInput never blurs and a typed-but-out-of-range value (or a
    // value mid-debounce) doesn't make it into the ref. Result: Reset
    // would commit a stale cooldown alongside the resize. Calling
    // blur() here synchronously fires the input's blur event in time
    // for the read below. Guarded by HTMLElement check because
    // document.activeElement can be the document body or null in some
    // states.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setResetting(true);
    setResetError(undefined);
    try {
      // Read the user's latest cooldown intent. If they've typed a new
      // value that hasn't auto-saved yet, that's what we want to commit
      // — NOT ctx.cooldownSeconds (which is the stale broadcast-confirmed
      // value). Falls back to live ctx when no user-edit is pending.
      const cooldownToCommit =
        cooldownIntentRef.current ?? ctxCooldownRef.current;
      if (sizeChanged) {
        // Resize is destructive. Three scenarios for a queued/in-flight
        // cooldown auto-save:
        //   1. Queued (timer set, RPC not yet fired): cancel() drops it.
        //   2. Already in flight when handleReset starts: the cooldown
        //      RPC carries a closure-captured canvasSize from before
        //      our resize. If the server processes it AFTER our reset
        //      (HTTP/2 stream interleaving makes ordering non-
        //      deterministic across concurrent requests), the server
        //      sees previous=NEW, request=OLD → sizeChanged=true →
        //      resizes back, undoing our reset. flush() awaits the
        //      in-flight RPC so the cooldown lands FIRST, then we send
        //      the reset on top of a known server state.
        //   3. Fires AFTER we cancel + flush + reset: mutationFn reads
        //      canvasSizeRef.current at fire time, which by then
        //      reflects our new size. Server-side no-op for
        //      sizeChanged.
        // cancel() before flush() so we don't accidentally fire the
        // queued debounce as part of the flush — we don't want it sent
        // at all in the size-changed path.
        save.cancel();
        await save.flush();
        // Resize implicitly clears server-side. Single RPC.
        await withClientRetry(() =>
          pixelCanvasServiceClient.updateSettings({
            cooldownSeconds: cooldownToCommit,
            canvasSize: selectedSize,
          }),
        );
        // Clear any pending intent — our explicit write committed the
        // user's typed value alongside the resize, so the auto-save
        // queue has nothing left to do for it.
        cooldownIntentRef.current = undefined;
        // Refresh the auto-save's retry target with current state so a
        // user clicking Retry on a still-visible AutoSaveStatus error
        // pill (from a prior failed cooldown auto-save) can't replay
        // the stale pre-resize canvasSize and undo this resize. Pair
        // with clearError() to also dismiss the pill.
        save.cancel({ kind: "cooldown", cooldownSeconds: cooldownToCommit });
        save.clearError();
      } else {
        // Same size — clearCanvas is the dedicated RPC for "clear
        // without resize". updateSettings only clears as a side effect
        // of size change (see server's pixelCanvasService.updateSettings),
        // so we can't substitute it here.
        //
        // Don't cancel the queued cooldown auto-save in this branch:
        // its payload carries the user's typed cooldown (the same value
        // we'd want to commit) and the size mutation reads canvasSize
        // live, so letting it fire is harmless — and it's the only
        // path that actually persists the user's typing if they clicked
        // Clear before the debounce fired.
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
  }, [canConfirm, sizeChanged, selectedSize, save]);

  if (loading) return <Loader />;
  if (error) return <QueryError message={error.message} onRetry={() => void reload()} />;
  // Defensive: in practice CanvasContext's reload sets `limits`,
  // `width`/`canvasSize`, and `loading=false` in the same React commit,
  // so reaching here with `!limits || canvasSize === 0` shouldn't be
  // possible. The guard exists for the would-be-startling case where
  // a future refactor splits those setters — without it, the form
  // would briefly render with `canvasSize=0` matching no allowed size
  // and the snap-back useEffect would chase selectedSize to 0,
  // flickering the active highlight. Keeping the guard is cheap;
  // delete only if you're certain the setter ordering invariant
  // can't drift.
  if (!limits || canvasSize === 0) return <Loader />;

  return (
    <div className={styles.settings}>
      {/* No in-view <h1> — AppHeader already shows "Pixel Canvas" above
          this view, so a duplicate page title here would just stack the
          same words on top of each other. AutoSaveStatus renders null
          when there's no error, so dropping the wrapper row leaves no
          empty slot in the layout.

          Subhead notes "Cooldown auto-saves" but the size-changed Reset
          path also rides along the user's latest typed cooldown via
          handleReset's flush-then-commit. That's by design — if the
          user types a new cooldown and clicks Reset before the 150ms
          debounce fires, dropping the cooldown along with the queued
          save would silently lose their typing. Don't "fix" this by
          stripping cooldownSeconds from the resize payload. */}
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
