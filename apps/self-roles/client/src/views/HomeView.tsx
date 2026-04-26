import React, { useCallback, useEffect, useState } from "react";
import styles from "./HomeView.module.css";
import { usePicker } from "../contexts/PickerContext";
import { rolePickerServiceClient } from "@selfroles/gen-client";
import { RolePickerError } from "@selfroles/gen-shared";
import { RootServerException } from "@rootsdk/client-app";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { EmptyState } from "../components/EmptyState";
import { RoleToggle } from "../components/RoleToggle";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// HomeView — the member-facing toggles. One section per group, one row per
// role.
//
// Toggle flow:
//   1. User clicks a toggle → handleToggle(roleId, desired).
//   2. We mark that roleId as pending (disables the row).
//   3. RPC fires; on success, the response carries the caller's full updated
//      role list (after exclusive-group sibling clearing). We replace
//      myRoleIds wholesale from that.
//   4. On error, surface inline near the row that failed; revert pending.
//
// Why optimistic-update is NOT used: the server may flip multiple roles in a
// single RPC (exclusive groups remove siblings on add). Predicting that
// client-side would duplicate server logic. The pending state (row dimmed
// + cursor: progress, no inline spinner element) is honest about the
// round-trip and avoids the server flip-flop UX an optimistic update
// would produce on exclusive groups.
//
// Sticky-disable on ROLE_NOT_ASSIGNABLE:
// When the server reports a permanent assignability failure — Root rejects
// the mutation because the target role's permissions aren't a subset of
// the app's manifest (see DESIGN.md "Permissions" for the model) — the
// toggle stays disabled for the rest of the session. Without this, a
// frustrated user just clicks again and again — each click hitting the
// same permanent failure, each one logged on the server. Keeping the
// failed role disabled is honest UX: there's nothing the member can do;
// only an admin can fix it (by removing the role from the picker or by
// broadening the app's manifest permissions). Cleared on next reload
// (broadcast or refetch) — if the admin fixed it, the next picker payload
// comes through fresh.
// ============================================================================

export const HomeView: React.FC = () => {
  const { groups, myRoleIds, loading, error, reload, setMyRoleIds } =
    usePicker();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [unassignable, setUnassignable] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | undefined>(undefined);

  // Clear sticky unassignable state when the picker config changes — admin
  // either fixed the manifest or removed the offending role, and the user
  // deserves a fresh attempt without us silently keeping the row locked.
  // If the role IS still broken, the next click re-adds it to the Set
  // (with the same single-attempt trade-off as before).
  useEffect(() => {
    setUnassignable(new Set());
  }, [groups]);

  const handleToggle = useCallback(
    async (roleId: string, desired: boolean) => {
      // Defence in depth — the toggle's `disabled` prop already blocks this,
      // but a stale pointer-events ignore or programmatic call shouldn't
      // generate spurious requests for a permanent failure.
      if (unassignable.has(roleId)) return;

      setPending((prev) => {
        const next = new Set(prev);
        next.add(roleId);
        return next;
      });
      setToggleError(undefined);
      try {
        const response = await withClientRetry(() =>
          rolePickerServiceClient.toggleRole({ roleId, desired }),
        );
        setMyRoleIds(response.myRoleIds);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setToggleError(message);
        // Sticky-disable on ROLE_NOT_ASSIGNABLE so retries don't spam the
        // server. Other errors (transient network, etc.) leave the row
        // enabled so the user can try again.
        if (
          err instanceof RootServerException &&
          err.code === RolePickerError.ROLE_NOT_ASSIGNABLE
        ) {
          setUnassignable((prev) => {
            const next = new Set(prev);
            next.add(roleId);
            return next;
          });
        }
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(roleId);
          return next;
        });
      }
    },
    [setMyRoleIds, unassignable],
  );

  if (loading) return <Loader />;
  if (error) return <QueryError message={error.message} onRetry={reload} />;

  // Drop empty groups before render. The server preserves them for the
  // admin editor (so admins can title a group before populating it), but
  // a member sees nothing useful in an empty group — just an unclickable
  // section header. Filtering here keeps the member view focused while
  // the admin's editor stays consistent with what they authored.
  const visibleGroups = groups.filter((g) => g.roles.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <EmptyState
        title="No roles available"
        body="Your community admin hasn't published any self-assignable roles yet."
      />
    );
  }

  return (
    <div className={styles.home}>
      {toggleError ? (
        <div className={styles.errorBanner} role="alert">
          {toggleError}
        </div>
      ) : null}
      {visibleGroups.map((group) => {
        // Selection count comes from the caller's myRoleIds intersected with
        // this group's roles. For exclusive groups it's 0 or 1 (server enforces).
        // For non-exclusive it's 0..N. Suppress the count when nothing's
        // selected — "0 selected" reads as nagging; just the mode hint
        // ("Pick one" / "Pick any") is enough on an empty group.
        const selectedCount = group.roles.filter((r) =>
          myRoleIds.has(r.roleId),
        ).length;
        const modeHint = group.exclusive ? "Pick one" : "Pick any";
        const helperText =
          selectedCount > 0
            ? `${modeHint} · ${selectedCount} selected`
            : modeHint;
        return (
          <section key={group.groupId} className={styles.group}>
            <header className={styles.groupHeader}>
              <h2 className={styles.groupTitle}>{group.title}</h2>
              <p className={styles.groupHelper}>{helperText}</p>
              {group.description ? (
                <p className={styles.groupDescription}>{group.description}</p>
              ) : null}
            </header>
            <div className={styles.roles}>
              {group.roles.map((role) => (
                <RoleToggle
                  key={role.roleId}
                  role={role}
                  on={myRoleIds.has(role.roleId)}
                  exclusive={group.exclusive}
                  pending={pending.has(role.roleId)}
                  disabled={unassignable.has(role.roleId)}
                  onToggle={(desired) =>
                    void handleToggle(role.roleId, desired)
                  }
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
