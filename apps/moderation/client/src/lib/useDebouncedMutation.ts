import { useCallback, useEffect, useRef, useState } from "react";

// useDebouncedMutation — auto-save hook for Settings.
//
// Callers push the current target state via `mutate(data)`; rapid calls
// coalesce into a single network call after `debounceMs` of quiet. Last call
// wins. A mutation in flight doesn't block new `mutate` calls — they simply
// restart the debounce timer, so the most recent state always gets sent once
// the user settles. On unmount, the latest pending data is flushed
// synchronously so a user's last edit lands even if they navigate away.
//
// Copied verbatim from apps/leveling-leaderboard/client/src/lib/useDebouncedMutation.ts.

export interface UseDebouncedMutationOptions<TData> {
  mutationFn: (data: TData) => Promise<unknown>;
  debounceMs?: number;
}

export interface UseDebouncedMutationResult<TData> {
  mutate: (data: TData) => void;
  retry: () => void;
  pending: boolean;
  error: Error | undefined;
  clearError: () => void;
}

const DEFAULT_DEBOUNCE_MS = 150;

export function useDebouncedMutation<TData>(
  opts: UseDebouncedMutationOptions<TData>,
): UseDebouncedMutationResult<TData> {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const pendingRef = useRef<TData | undefined>(undefined);
  const lastAttemptRef = useRef<TData | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const runNow = useCallback(async (data: TData) => {
    setPending(true);
    setError(undefined);
    try {
      await optsRef.current.mutationFn(data);
      // Only clear pendingRef if it still references the value we just sent.
      // If a newer mutate(...) landed during the await, pendingRef has been
      // reassigned to the newer value; clearing here would drop the user's
      // most recent edit.
      if (pendingRef.current === data) pendingRef.current = undefined;
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setPending(false);
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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
        const toSend = pendingRef.current;
        if (toSend !== undefined) {
          void optsRef.current.mutationFn(toSend).catch(() => {
            // Swallow: no UI exists to show the error post-unmount.
          });
        }
      }
    };
  }, []);

  return { mutate, retry, pending, error, clearError };
}
