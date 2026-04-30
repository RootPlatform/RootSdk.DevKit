import React, { useEffect, useState } from "react";
import { useDebouncedMutation } from "../../lib/useDebouncedMutation";
import { AutoSaveStatus } from "../../components/AutoSaveStatus";

// Local-state mirror of a server-authoritative field, with debounced
// auto-save on every change. Each field on each Settings tab uses this
// hook so concurrent admin edits to different fields don't coalesce.
//
// `serverValue` is the value from the most recent GetSettings refetch;
// when it changes (e.g., a SettingsChanged broadcast triggered a refetch
// in the parent), the local state syncs to it — but only when the user
// isn't actively editing (no debounce in flight).

export interface UseFieldAutoSaveResult<T> {
  value: T;
  setValue: (next: T) => void;
  pending: boolean;
  error: Error | undefined;
  retry: () => void;
  clearError: () => void;
}

export function useFieldAutoSave<T>(
  serverValue: T,
  save: (value: T) => Promise<unknown>,
): UseFieldAutoSaveResult<T> {
  const [local, setLocal] = useState<T>(serverValue);
  const { mutate, retry, pending, error, clearError } = useDebouncedMutation<T>({
    mutationFn: save,
  });

  // Sync local to server when server changes — but only when no edit is
  // in flight, so a server broadcast arriving mid-edit doesn't yank the
  // user's value out from under their fingers. Once the local mutation
  // settles, the next render's `serverValue` will already reflect what
  // we just wrote, so the sync is a no-op anyway.
  useEffect(() => {
    if (!pending) setLocal(serverValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValue]);

  const setValue = (next: T) => {
    setLocal(next);
    mutate(next);
  };

  return { value: local, setValue, pending, error, retry, clearError };
}

// Convenience component for the per-field error pill, scoped to one field.
export const FieldAutoSaveStatus: React.FC<{
  state: { error: Error | undefined; retry: () => void; clearError: () => void };
}> = ({ state }) => (
  <AutoSaveStatus
    error={state.error}
    onRetry={state.retry}
    onDismissError={state.clearError}
  />
);
