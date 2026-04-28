import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// useDebouncedMutation — auto-save hook for Settings.
//
// Callers push the current FULL target state via `mutate(data)`; rapid calls
// coalesce into a single network call after `debounceMs` of quiet. Last call
// wins. A mutation in flight doesn't block new `mutate` calls — they simply
// restart the debounce timer, so the most recent state always gets sent once
// the user settles.
//
// On unmount, the latest pending data is flushed synchronously so a user's
// last edit lands even if they navigate away immediately.
//
// The hook is intentionally independent of React Query or similar libraries.
// If your app already uses one of those, its mutation API wrapped in a
// debounce does the same job in ~10 lines.
// ============================================================================

export interface UseDebouncedMutationOptions<TData> {
  mutationFn: (data: TData) => Promise<unknown>;
  debounceMs?: number;
}

export interface UseDebouncedMutationResult<TData> {
  mutate: (data: TData) => void;
  // Rerun the most-recent data. The call is a no-op if the user hasn't
  // pushed anything yet, or if a previous retry already succeeded.
  retry: () => void;
  // Drop any pending (queued-but-not-yet-fired) mutation without sending
  // it. Used by callers that just performed a destructive action via a
  // separate RPC and don't want the auto-save debounce to replay a stale
  // closure-captured payload after their write has already landed. Does
  // not affect a mutation that is already in flight (no AbortController);
  // those resolve normally and surface their own outcome to the caller.
  //
  // Optional `newLastAttempt` rewrites the retry-target snapshot so that
  // any subsequent retry() call (typically from an AutoSaveStatus pill
  // that's still up from an earlier failed save) replays current state
  // instead of stale data. Without this, a sequence of {failed save}
  // → {explicit destructive write} → {user clicks Retry on the still-
  // showing error pill} would re-send the pre-write payload and could
  // undo the destructive write. Pass undefined (or omit) to drop the
  // queue without touching the retry snapshot.
  cancel: (newLastAttempt?: TData) => void;
  // Drain the auto-save before proceeding. If a debounce timer is queued,
  // fire it immediately (bypassing the debounce). Then await whichever
  // mutation is in flight (if any). Returns when no auto-save is pending
  // or running.
  //
  // Used by callers that are about to send an explicit (non-debounced)
  // RPC that touches the same server-side state. Without flushing first,
  // an in-flight auto-save can land AFTER the explicit RPC due to
  // server-side ordering being non-deterministic across concurrent
  // requests, replaying its closure-captured payload on top of the
  // explicit write.
  flush: () => Promise<void>;
  pending: boolean;
  error: Error | undefined;
  clearError: () => void;
}

const DEFAULT_DEBOUNCE_MS = 150;

export function useDebouncedMutation<TData>(
  opts: UseDebouncedMutationOptions<TData>,
): UseDebouncedMutationResult<TData> {
  // Hold the latest opts in a ref so the fire-and-forget callbacks below
  // always read the freshest mutationFn without re-creating on every render.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Tracks the latest data pushed by the caller. `undefined` means "nothing
  // pending" (after a successful flush). Retains the last value after flush
  // so `retry()` has something to re-send.
  const pendingRef = useRef<TData | undefined>(undefined);
  const lastAttemptRef = useRef<TData | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Tracks the in-flight mutationFn promise (if any) so flush() can
  // await an already-fired RPC. Cleared in finally when that RPC
  // resolves, so subsequent flush()es see no in-flight work.
  const inFlightRef = useRef<Promise<void> | undefined>(undefined);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const runNow = useCallback((data: TData): Promise<void> => {
    setPending(true);
    setError(undefined);
    // The IIFE's finally compares `inFlightRef.current` against this
    // run's promise to decide whether to clear it (a concurrent runNow
    // — from retry/flush — could have overwritten the ref). The
    // self-reference forces this holder pattern: TS can't track that
    // the IIFE's finally only runs AFTER the surrounding sync code
    // assigns `holder.promise`, so we read it through the holder
    // (typed as Promise<void> | undefined) where TS accepts it.
    const holder: { promise?: Promise<void> } = {};
    holder.promise = (async () => {
      try {
        await optsRef.current.mutationFn(data);
        // Only clear pendingRef if it still references the value we just sent.
        // If a newer mutate(...) landed during the await, pendingRef has been
        // reassigned to that newer value and clearing here would silently drop
        // the user's most recent edit — the timer that was scheduled for the
        // newer call would fire, see undefined, and no-op.
        if (pendingRef.current === data) pendingRef.current = undefined;
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setPending(false);
        if (inFlightRef.current === holder.promise) {
          inFlightRef.current = undefined;
        }
      }
    })();
    inFlightRef.current = holder.promise;
    return holder.promise;
  }, []);

  const mutate = useCallback(
    (data: TData) => {
      pendingRef.current = data;
      lastAttemptRef.current = data;
      if (timerRef.current) clearTimeout(timerRef.current);
      const debounceMs = optsRef.current.debounceMs ?? DEFAULT_DEBOUNCE_MS;
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        const toSend = pendingRef.current;
        if (toSend !== undefined) void runNow(toSend);
      }, debounceMs);
    },
    [runNow],
  );

  const retry = useCallback(() => {
    const data = lastAttemptRef.current;
    if (data === undefined) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    void runNow(data);
  }, [runNow]);

  const cancel = useCallback((newLastAttempt?: TData) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    pendingRef.current = undefined;
    // lastAttemptRef is intentionally left intact by default so retry()
    // still has something to re-send — cancel drops the QUEUED write,
    // not the history of what was last attempted. Callers that just
    // committed an explicit write through a different code path can
    // overwrite the retry target so a later Retry click replays current
    // state, not the stale pre-write payload.
    if (newLastAttempt !== undefined) {
      lastAttemptRef.current = newLastAttempt;
    }
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    // If a debounce timer is queued, fire it now bypassing the wait.
    // The timer was set by mutate() with pendingRef populated; we can
    // skip the timer fire and call runNow directly with the same data.
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      const toSend = pendingRef.current;
      if (toSend !== undefined) {
        // runNow sets inFlightRef internally. We don't await here; the
        // await below covers the in-flight case uniformly.
        void runNow(toSend);
      }
    }
    // Await whatever's in flight (could be the one we just scheduled,
    // or one that was already running before flush was called).
    if (inFlightRef.current) {
      await inFlightRef.current;
    }
  }, [runNow]);

  const clearError = useCallback(() => setError(undefined), []);

  // Flush on unmount so a user's last edit lands if they navigate away
  // mid-debounce. We don't await — unmount handlers can't; the RPC fires
  // and resolves in the background.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
        const toSend = pendingRef.current;
        if (toSend !== undefined) {
          // Fire-and-forget. No setState calls — the component is unmounting.
          void optsRef.current.mutationFn(toSend).catch(() => {
            // Swallow: no UI exists to show the error. The server-side write
            // either succeeded or the next mount's data fetch will surface
            // that the change didn't land.
          });
        }
      }
    };
  }, []);

  return { mutate, retry, cancel, flush, pending, error, clearError };
}
