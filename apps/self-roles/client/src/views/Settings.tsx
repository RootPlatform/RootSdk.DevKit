import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Settings.module.css";
import { usePicker } from "../contexts/PickerContext";
import { rolePickerServiceClient } from "@selfroles/gen-client";
import type {
  PickerGroup,
  PickerRole,
} from "@selfroles/gen-shared";
import { Loader } from "../components/Loader";
import { QueryError } from "../components/QueryError";
import { AdminOnly } from "../components/AdminOnly";
import { Button } from "../components/Button";
import { TextInput } from "../components/TextInput";
import { Icon } from "../components/Icon";
import { AutoSaveStatus } from "../components/AutoSaveStatus";
import { useDebouncedMutation } from "../lib/useDebouncedMutation";
import { withClientRetry } from "../lib/retry";

// ============================================================================
// Settings — admin-only editor for the picker config.
//
// Layout: a vertical list of groups; each group is a card that exposes title,
// optional description, exclusive flag, and a list of roles. Roles can be
// added (modal picker over the assignable-roles endpoint) and removed
// (per-row × button). Groups can be added (button at bottom) and removed
// (per-group × button); reordered via up/down arrows.
//
// Auto-save: every change to local config calls `mutate(localConfig)` via the
// debounced-mutation hook, which fires UpdateGroups after ~500ms of inactivity.
// Status pill in the header shows saved/saving/error state. No Save button
// — the design from leveling-leaderboard's Settings, kept consistent here so
// agents see the same auto-save shape twice.
//
// Server is single source of truth for validation. The client enforces only
// maxLength on inputs (using the limits from GetPicker); structural rules
// (duplicate role across groups, max counts) are caught server-side and
// surfaced via the AutoSaveStatus error slot.
// ============================================================================

export const Settings: React.FC = () => {
  return (
    <AdminOnly>
      <SettingsInner />
    </AdminOnly>
  );
};

const SettingsInner: React.FC = () => {
  const { groups: serverGroups, limits, loading, error, reload } = usePicker();
  // Local working copy. Initialised from the server snapshot; subsequent
  // server broadcasts (PickerConfigChanged from another admin's save, or
  // from a role-deleted cull) only update local state when there are no
  // pending edits — see the syncFromServer effect below.
  const [local, setLocal] = useState<PickerGroup[]>([]);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);

  // Hydrate local from server on first load and when the user has no edits
  // in flight.
  useEffect(() => {
    if (!hasPendingEdits) {
      setLocal(serverGroups);
    }
  }, [serverGroups, hasPendingEdits]);

  // Auto-save mutation. The hook coalesces rapid edits into a single RPC
  // ~150ms after the last change. AutoSaveStatus (rendered in the header
  // row) only chrome-shows on error — successful saves are invisible.
  const save = useDebouncedMutation<PickerGroup[]>({
    mutationFn: async (next) => {
      await withClientRetry(() =>
        rolePickerServiceClient.updateGroups({ groups: next }),
      );
      setHasPendingEdits(false);
    },
  });
  const mutate = save.mutate;

  const updateLocal = useCallback(
    (mutator: (g: PickerGroup[]) => PickerGroup[]) => {
      setLocal((prev) => {
        const next = mutator(prev);
        setHasPendingEdits(true);
        mutate(next);
        return next;
      });
    },
    [mutate],
  );

  const addGroup = useCallback(() => {
    updateLocal((prev) => [
      ...prev,
      {
        groupId: "",
        title: "New group",
        description: "",
        exclusive: false,
        roles: [],
      },
    ]);
  }, [updateLocal]);

  const removeGroup = useCallback(
    (groupId: string) => {
      updateLocal((prev) => prev.filter((g) => g.groupId !== groupId));
    },
    [updateLocal],
  );

  const updateGroup = useCallback(
    (groupId: string, patch: Partial<PickerGroup>) => {
      updateLocal((prev) =>
        prev.map((g) => (g.groupId === groupId ? { ...g, ...patch } : g)),
      );
    },
    [updateLocal],
  );

  const moveGroup = useCallback(
    (groupId: string, delta: -1 | 1) => {
      updateLocal((prev) => {
        const idx = prev.findIndex((g) => g.groupId === groupId);
        if (idx < 0) return prev;
        const target = idx + delta;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      });
    },
    [updateLocal],
  );

  const addRole = useCallback(
    (groupId: string, role: PickerRole) => {
      updateLocal((prev) =>
        prev.map((g) =>
          g.groupId === groupId ? { ...g, roles: [...g.roles, role] } : g,
        ),
      );
    },
    [updateLocal],
  );

  const removeRole = useCallback(
    (groupId: string, roleId: string) => {
      updateLocal((prev) =>
        prev.map((g) =>
          g.groupId === groupId
            ? { ...g, roles: g.roles.filter((r) => r.roleId !== roleId) }
            : g,
        ),
      );
    },
    [updateLocal],
  );

  // Compute the set of role IDs already in the picker (across all groups).
  // Passed to the role-add picker so it can filter them out client-side
  // before calling GetAssignableRoles (server filters too as defence).
  const usedRoleIds = useMemo(() => {
    const s = new Set<string>();
    for (const g of local) for (const r of g.roles) s.add(r.roleId);
    return s;
  }, [local]);

  const atGroupLimit = limits ? local.length >= limits.maxGroups : false;

  if (loading) return <Loader />;
  if (error) return <QueryError message={error.message} onRetry={reload} />;

  return (
    <div className={styles.settings}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Self-Roles</h1>
        <AutoSaveStatus
          error={save.error}
          onRetry={save.retry}
          onDismissError={save.clearError}
        />
      </div>
      <p className={styles.subhead}>
        Curate groups of community roles members can assign to themselves. An
        exclusive group lets members pick at most one of its roles at a time.
      </p>

      {local.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No groups yet.</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {local.map((group, idx) => (
            <GroupCard
              key={group.groupId || `new-${idx}`}
              group={group}
              isFirst={idx === 0}
              isLast={idx === local.length - 1}
              limits={limits}
              usedRoleIds={usedRoleIds}
              onChange={(patch) => updateGroup(group.groupId, patch)}
              onRemove={() => removeGroup(group.groupId)}
              onMoveUp={() => moveGroup(group.groupId, -1)}
              onMoveDown={() => moveGroup(group.groupId, 1)}
              onAddRole={(role) => addRole(group.groupId, role)}
              onRemoveRole={(roleId) => removeRole(group.groupId, roleId)}
            />
          ))}
        </div>
      )}

      <Button onClick={addGroup} disabled={atGroupLimit}>
        + Add group
      </Button>
      {atGroupLimit && limits ? (
        <p className={styles.limitHint}>
          Group limit reached ({limits.maxGroups}).
        </p>
      ) : null}
    </div>
  );
};

// ----------------------------------------------------------------------------
// GroupCard — one group's editor. Self-contained: title/description inputs,
// exclusive checkbox, role list with add/remove, and group-level controls
// (move up/down, delete).
// ----------------------------------------------------------------------------

interface GroupCardProps {
  group: PickerGroup;
  isFirst: boolean;
  isLast: boolean;
  limits: ReturnType<typeof usePicker>["limits"];
  usedRoleIds: Set<string>;
  onChange: (patch: Partial<PickerGroup>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddRole: (role: PickerRole) => void;
  onRemoveRole: (roleId: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isFirst,
  isLast,
  limits,
  usedRoleIds,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddRole,
  onRemoveRole,
}) => {
  const [showRolePicker, setShowRolePicker] = useState(false);
  const atRoleLimit = limits ? group.roles.length >= limits.maxRolesPerGroup : false;

  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHeader}>
        <TextInput
          value={group.title}
          onChange={(v) => onChange({ title: v })}
          placeholder="Group title"
          maxLength={limits?.groupTitleMaxChars}
          className={styles.groupTitleInput}
          aria-label="Group title"
        />
        <div className={styles.groupActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move group up"
            title="Move up"
          >
            <Icon name="ChevronUp" size={16} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move group down"
            title="Move down"
          >
            <Icon name="ChevronDown" size={16} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onRemove}
            aria-label="Delete group"
            title="Delete group"
          >
            <Icon name="Close" size={16} />
          </button>
        </div>
      </div>

      <TextInput
        value={group.description}
        onChange={(v) => onChange({ description: v })}
        placeholder="Optional description"
        maxLength={limits?.groupDescriptionMaxChars}
        aria-label="Group description"
      />

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={group.exclusive}
          onChange={(e) => onChange({ exclusive: e.target.checked })}
        />
        <span>Exclusive — members can pick at most one of these</span>
      </label>

      <div className={styles.rolesSection}>
        <div className={styles.rolesHeader}>Roles ({group.roles.length})</div>
        {group.roles.length === 0 ? (
          <p className={styles.emptyHint}>No roles in this group yet.</p>
        ) : (
          <ul className={styles.rolesList}>
            {group.roles.map((role) => (
              <li key={role.roleId} className={styles.roleRow}>
                <span
                  className={styles.swatch}
                  style={role.color ? { backgroundColor: role.color } : undefined}
                  aria-hidden="true"
                />
                <span className={styles.roleName}>{role.name}</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => onRemoveRole(role.roleId)}
                  aria-label={`Remove ${role.name}`}
                  title="Remove from group"
                >
                  <Icon name="Close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button
          onClick={() => setShowRolePicker(true)}
          disabled={atRoleLimit}
        >
          + Add role
        </Button>
        {atRoleLimit && limits ? (
          <p className={styles.limitHint}>
            Role limit reached for this group ({limits.maxRolesPerGroup}).
          </p>
        ) : null}
      </div>

      {showRolePicker ? (
        <RolePickerModal
          excludeRoleIds={usedRoleIds}
          onPick={(role) => {
            onAddRole(role);
            setShowRolePicker(false);
          }}
          onClose={() => setShowRolePicker(false)}
        />
      ) : null}
    </div>
  );
};

// ----------------------------------------------------------------------------
// RolePickerModal — fetches the assignable-roles list and lets the admin pick
// one to add to the group. Lazy-fetches on mount so the open animation is
// instant and the network call doesn't block typing in the parent form.
// ----------------------------------------------------------------------------

interface ModalProps {
  excludeRoleIds: Set<string>;
  onPick: (role: PickerRole) => void;
  onClose: () => void;
}

const RolePickerModal: React.FC<ModalProps> = ({
  excludeRoleIds,
  onPick,
  onClose,
}) => {
  const [roles, setRoles] = useState<PickerRole[] | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await withClientRetry(() =>
          rolePickerServiceClient.getAssignableRoles({
            excludeRoleIds: Array.from(excludeRoleIds),
          }),
        );
        if (!cancelled) setRoles(response.roles);
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeRoleIds]);

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add a role</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="Close" size={16} />
          </button>
        </div>
        {!roles && !fetchError ? (
          <Loader />
        ) : fetchError ? (
          <QueryError message={fetchError} onRetry={() => setRoles(undefined)} />
        ) : roles && roles.length === 0 ? (
          <p className={styles.emptyHint}>
            No more roles available — every assignable role is already in
            the picker.
          </p>
        ) : (
          <ul className={styles.modalRoles}>
            {(roles ?? []).map((role) => (
              <li key={role.roleId}>
                <button
                  type="button"
                  className={styles.modalRoleRow}
                  onClick={() => onPick(role)}
                >
                  <span
                    className={styles.swatch}
                    style={
                      role.color ? { backgroundColor: role.color } : undefined
                    }
                    aria-hidden="true"
                  />
                  <span className={styles.roleName}>{role.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
