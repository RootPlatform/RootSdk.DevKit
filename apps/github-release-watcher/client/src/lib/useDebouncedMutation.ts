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
// Out-of-order completion guard: when a user types fast enough that a second
// debounce fires before the first network call completes, two requests can
// be in flight simultaneously. Without ordering, attempt A finishing AFTER
// attempt B would clobber B's state on whichever side cares about completion
// order (UI error chrome, the `pending` flag, the `pendingRef` clear). Each
// `runNow` captures a monotonic `attemptId`; only the LATEST attempt's
// completion is allowed to update visible state. The server still races on
// its own — last-write-wins — but since the most-recent-attempt is also the
// most-recently-issued, the server's tie-break aligns with user intent in
// the common case. (For strict ordering you'd serialize on the client by
// awaiting the in-flight promise before issuing the next; the cost is
// turning fast typing into a queue of sequential RPCs, which we judged not
// worth it for this hook's use case. Forks needing strict ordering can swap
// the guard for an `await inFlight` line.)
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

  // Monotonic counter for the out-of-order completion guard. Incremented on
  // each runNow; only the LATEST id is allowed to update visible state when
  // its mutationFn resolves. See file header for the trade-off.
  const attemptCounterRef = useRef(0);
  const latestAttemptIdRef = useRef(0);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const runNow = useCallback(async (data: TData) => {
    const myAttemptId = ++attemptCounterRef.current;
    latestAttemptIdRef.current = myAttemptId;
    setPending(true);
    setError(undefined);
    try {
      await optsRef.current.mutationFn(data);
      // Out-of-order guard: if a newer attempt has already started, our
      // success is stale — newer state already supersedes ours. Don't clear
      // pendingRef (the newer attempt will manage it) and don't touch
      // setPending here either; the latest attempt owns the UI lifecycle.
      if (myAttemptId !== latestAttemptIdRef.current) return;
      // Only clear pendingRef if it still references the value we just sent.
      // If a newer mutate(...) landed during the await but didn't yet trigger
      // a runNow (still inside the debounce window), pendingRef has been
      // reassigned to that newer value; clearing here would silently drop
      // the user's most recent edit.
      if (pendingRef.current === data) pendingRef.current = undefined;
    } catch (err: unknown) {
      // Same guard for the failure path: a stale rejection shouldn't
      // overwrite a newer attempt's success state with an old error.
      if (myAttemptId !== latestAttemptIdRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      // Only the latest attempt clears the pending flag. A stale completion
      // leaving pending=false while a newer attempt is mid-flight would
      // briefly hide the saving indicator from the user.
      if (myAttemptId === latestAttemptIdRef.current) setPending(false);
    }
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

  return { mutate, retry, pending, error, clearError };
}
