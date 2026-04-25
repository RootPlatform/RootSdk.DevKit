import React, { useCallback, useState } from "react";
import styles from "./HomeView.module.css";
import { usePicker } from "../contexts/PickerContext";
import { rolePickerServiceClient } from "@selfroles/gen-client";
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
// client-side would duplicate server logic. Pending+spinner is honest about
// the round-trip and avoids the server flip-flop UX an optimistic update
// would produce on exclusive groups.
// ============================================================================

export const HomeView: React.FC = () => {
  const { groups, myRoleIds, loading, error, reload, setMyRoleIds } =
    usePicker();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | undefined>(undefined);

  const handleToggle = useCallback(
    async (roleId: string, desired: boolean) => {
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
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(roleId);
          return next;
        });
      }
    },
    [setMyRoleIds],
  );

  if (loading) return <Loader />;
  if (error) return <QueryError message={error.message} onRetry={reload} />;

  if (groups.length === 0) {
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
      {groups.map((group) => (
        <section key={group.groupId} className={styles.group}>
          <header className={styles.groupHeader}>
            <h2 className={styles.groupTitle}>{group.title}</h2>
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
                onToggle={(desired) => void handleToggle(role.roleId, desired)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
