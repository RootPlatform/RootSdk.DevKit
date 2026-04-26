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

// Mint a client-side temporary group ID. The `t.` prefix is the contract
// between client and server: validateAndNormalize on the server replaces
// `t.*` IDs with real, server-minted `g.*` IDs on save. Crypto-strong
// randomness is overkill for an admin's edit session — Date.now + a short
// random suffix is collision-free across one user's interactions.
function mintTempGroupId(): string {
  return `t.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

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
// debounced-mutation hook, which fires UpdateGroups after ~150ms of inactivity.
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
  const { amIAdmin } = usePicker();
  return (
    <AdminOnly isAdmin={amIAdmin}>
      <SettingsInner />
    </AdminOnly>
  );
};

const SettingsInner: React.FC = () => {
  const { groups: serverGroups, limits, loading, error, reload } = usePicker();
  // Local working copy. Initialised from the server snapshot; subsequent
  // server broadcasts (PickerConfigChanged from another admin's save, or
  // from a role-deleted cull) only update local state when there are no
  // pending edits.
  const [local, setLocal] = useState<PickerGroup[]>([]);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  // Read inside the reconciliation effect — keeping `hasPendingEdits` out
  // of the effect's deps is critical. If we listed it as a dep, the effect
  // would re-run when it flipped to false on save success, snapping local
  // back to whatever serverGroups held at that moment — which is still the
  // PRE-save snapshot until the broadcast arrives. That window is visible
  // as a flicker (the user's freshly-saved edits briefly disappear). The
  // ref breaks the cycle: serverGroups changes (from a broadcast) trigger
  // the effect; pending-edits flips don't.
  const hasPendingEditsRef = useRef(false);
  hasPendingEditsRef.current = hasPendingEdits;

  // Mirror of `local` that's safe to read synchronously from event
  // handlers (updateLocal needs the latest array to compute `next` outside
  // the setLocal updater — see the StrictMode-safety note below).
  const localRef = useRef<PickerGroup[]>(local);
  localRef.current = local;

  useEffect(() => {
    if (hasPendingEditsRef.current) return;
    setLocal(serverGroups);
  }, [serverGroups]);

  // Edit-sequence counters used to close the broadcast-vs-save race.
  // Without them, this sequence stomps in-progress typing:
  //   1. user types state₁ → mutate(state₁), hasPendingEdits=true
  //   2. mutate fires the RPC; while it's in flight, user types state₂
  //   3. RPC for state₁ returns; mutationFn naively flips
  //      hasPendingEdits=false; broadcast arrives carrying state₁
  //   4. reconciliation sees hasPendingEdits=false and stomps local with
  //      state₁, briefly erasing the user's state₂ keystrokes from the
  //      view (state₂ is still queued in the debounce timer and saves
  //      shortly, but the flicker is real)
  // Fix: increment `editSeqRef` on every updateLocal; capture the value
  // at the start of mutationFn; only flip hasPendingEdits=false when the
  // captured value still matches at the end (i.e., no newer edits queued
  // during the round-trip).
  const editSeqRef = useRef(0);

  // Auto-save mutation. The hook coalesces rapid edits into a single RPC
  // ~150ms after the last change. AutoSaveStatus (rendered in the header
  // row) only chrome-shows on error — successful saves are invisible.
  const save = useDebouncedMutation<PickerGroup[]>({
    mutationFn: async (next) => {
      const seqAtStart = editSeqRef.current;
      const response = await withClientRetry(() =>
        rolePickerServiceClient.updateGroups({ groups: next }),
      );
      // Only declare "no pending edits" if the user hasn't queued more
      // since this save started. If they have, hasPendingEdits stays
      // true so the reconciliation effect skips the stomp.
      if (editSeqRef.current === seqAtStart) {
        setHasPendingEdits(false);
      }
      // Apply the server's id-remapping back into local so subsequent
      // saves don't keep churning new server-side IDs for the same
      // logical group. We only rewrite IDs — titles/descriptions and any
      // edits the user made during the save round-trip stay intact.
      const remappings = response.idRemappings;
      if (Object.keys(remappings).length > 0) {
        setLocal((prev) =>
          prev.map((g) =>
            remappings[g.groupId]
              ? { ...g, groupId: remappings[g.groupId] }
              : g,
          ),
        );
      }
    },
  });
  const mutate = save.mutate;

  // Side effects (mutate, setHasPendingEdits) live OUTSIDE the setLocal
  // updater. React StrictMode runs reducers/updaters twice in dev, and
  // any side effect inside one would fire twice — the debounce timer
  // would reset twice and `mutate` would be called twice per click.
  // Reading from `localRef` lets us compute `next` synchronously without
  // depending on the updater shape.
  //
  // Client-side validity gate: skip auto-save when any group has an
  // empty title. The server validates the same condition and returns
  // INVALID_CONFIG, which would surface in the AutoSaveStatus pill at the
  // page top — but the empty field itself has no inline indication, and
  // the server bounce is a wasted round trip on every keystroke during a
  // title-clear. Local state still updates so the user keeps editing;
  // mutate just doesn't fire until everything's valid again. Note: the
  // hook's unmount-flush ALSO honors this implicitly — it flushes
  // pendingRef, which only ever holds values we passed to mutate(), all
  // of which were valid by definition. In-flight invalid edits are
  // dropped on unmount; that's intentional (they wouldn't have saved
  // anyway, since the server would have rejected them).
  const updateLocal = useCallback(
    (mutator: (g: PickerGroup[]) => PickerGroup[]) => {
      const next = mutator(localRef.current);
      localRef.current = next;
      setLocal(next);
      setHasPendingEdits(true);
      editSeqRef.current += 1;
      const allTitlesValid = next.every((g) => g.title.trim().length > 0);
      if (allTitlesValid) mutate(next);
    },
    [mutate],
  );

  const addGroup = useCallback(() => {
    updateLocal((prev) => [
      ...prev,
      {
        // Client-side temp ID. The `t.` prefix is the contract: server's
        // validateAndNormalize replaces any `t.*` with a real `g.*` ID on
        // save. Without a unique temp ID, two rapid Add-group clicks within
        // the auto-save debounce window would put two `groupId === ""`
        // entries in local state, and updateGroup/removeGroup/moveGroup
        // would then misfire across them (filter/findIndex matching on
        // both copies).
        groupId: mintTempGroupId(),
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

  // Per-role description override. Members see this string under the role
  // name in the picker; admins set it here. Empty string is the no-override
  // case. The proto field is `description` on PickerRole and persists as
  // `descriptionOverride` server-side — see pickerStore.PickerRoleConfig.
  const updateRoleDescription = useCallback(
    (groupId: string, roleId: string, description: string) => {
      updateLocal((prev) =>
        prev.map((g) =>
          g.groupId === groupId
            ? {
                ...g,
                roles: g.roles.map((r) =>
                  r.roleId === roleId ? { ...r, description } : r,
                ),
              }
            : g,
        ),
      );
    },
    [updateLocal],
  );

  // Compute the set of role IDs already in the picker (across all groups).
  // Passed through to the role-add modal, which sends them to the server
  // as `excludeRoleIds` on GetAssignableRoles so already-in-picker roles
  // never come back in the response. The filtering is server-side; the
  // Set is just a stable shape for the prop.
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
              // groupId is always populated — `t.*` for client-temp,
              // `g.*` for server-minted. The temp-ID scheme means we
              // never need an idx-based React key fallback.
              key={group.groupId}
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
              onUpdateRoleDescription={(roleId, description) =>
                updateRoleDescription(group.groupId, roleId, description)
              }
            />
          ))}
        </div>
      )}

      <Button
        onClick={addGroup}
        disabled={atGroupLimit}
        className={styles.addAction}
      >
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
  onUpdateRoleDescription: (roleId: string, description: string) => void;
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
  onUpdateRoleDescription,
}) => {
  const [showRolePicker, setShowRolePicker] = useState(false);
  const atRoleLimit = limits ? group.roles.length >= limits.maxRolesPerGroup : false;
  const titleInvalid = group.title.trim().length === 0;

  return (
    <div className={styles.groupCard}>
      <div className={styles.groupHeader}>
        <TextInput
          value={group.title}
          onChange={(v) => onChange({ title: v })}
          placeholder="Group title"
          maxLength={limits?.groupTitleMaxChars}
          className={[
            styles.groupTitleInput,
            titleInvalid ? styles.fieldInvalid : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Group title"
          aria-invalid={titleInvalid || undefined}
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
                <div className={styles.roleRowHeader}>
                  <span
                    className={styles.swatch}
                    style={
                      role.color ? { backgroundColor: role.color } : undefined
                    }
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
                </div>
                <TextInput
                  value={role.description}
                  onChange={(v) => onUpdateRoleDescription(role.roleId, v)}
                  placeholder="Optional description shown to members"
                  maxLength={limits?.roleDescriptionMaxChars}
                  aria-label={`${role.name} description`}
                />
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="outline"
          onClick={() => setShowRolePicker(true)}
          disabled={atRoleLimit}
          className={styles.addAction}
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
  // Token bumped by the Retry handler to force the fetch effect to re-run
  // when its other deps haven't changed. Without this, retry was a no-op:
  // setting roles=undefined didn't change the effect deps.
  const [refetchToken, setRefetchToken] = useState(0);

  // Stable sorted array derived from the parent's Set. Two memos:
  //   - excludeArray: the actual data sent to the server
  //   - excludeKey:   a primitive joined string used as the effect dep
  //                   so unrelated re-renders (e.g., a broadcast-driven
  //                   reconciliation that mints a new Set with the same
  //                   contents) don't refire the fetch.
  // Splitting array-vs-key (vs joining and split-on-comma at call time)
  // sidesteps the brittle round-trip — role IDs happen to be URL-safe
  // base64 today, but encoding assumptions like "no commas in IDs"
  // shouldn't be load-bearing.
  const excludeArray = useMemo(
    () => Array.from(excludeRoleIds).sort(),
    [excludeRoleIds],
  );
  const excludeKey = useMemo(() => excludeArray.join(","), [excludeArray]);

  useEffect(() => {
    let cancelled = false;
    setFetchError(undefined);
    setRoles(undefined);
    void (async () => {
      try {
        const response = await withClientRetry(() =>
          rolePickerServiceClient.getAssignableRoles({
            excludeRoleIds: excludeArray,
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
    // excludeArray is the data; excludeKey is the identity-stable dep so
    // we don't refetch on every parent re-render. eslint-disable for the
    // intentional missing-dep — array changes are tracked via key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeKey, refetchToken]);

  // Escape key closes the modal. Without this, members on keyboard-only
  // navigation would be trapped (backdrop-click works for mouse only).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap: keep keyboard focus inside the modal so Tab can't escape
  // to the form behind it. On mount, focus the first interactive element
  // in the modal; on Tab/Shift-Tab from the boundary, loop back to the
  // other end. A library (e.g. focus-trap-react) handles edge cases
  // beyond this — nested portals, contenteditable, iframes — but the
  // ~30-line manual version covers the cases this modal will actually
  // see (close button + role list + retry).
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = modalRef.current;
    if (!root) return;
    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    // Initial focus on the first focusable element (the close button in
    // our layout) so keyboard users land somewhere sane.
    const initial = focusables()[0];
    initial?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, []);

  const handleRetry = () => setRefetchToken((n) => n + 1);

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
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
          <QueryError message={fetchError} onRetry={handleRetry} />
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
