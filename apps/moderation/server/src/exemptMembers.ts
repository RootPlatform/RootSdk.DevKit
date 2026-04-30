import {
  rootServer,
  RootAppStartState,
  ReadOnlyMemberGroup,
  GlobalSettingsEvent,
  UserGuid,
} from "@rootsdk/server-app";
import { log } from "./lib/log";

// exemptMembers — message-pipeline check against the
// `globalSettings.general.exempt` ReadOnlyMemberGroup. The platform
// resolves role memberships into the group automatically; we just read
// the live SDK object on every check and call .isMember(userId).
//
// Why no parallel managed MemberGroup (unlike adminAudience):
//   adminAudience is a UNION of two sources (admins + ownerUserId), so it
//   has to be materialized as a server-managed group. Exempt has only one
//   source — the globalSettings picker — and the platform's
//   ReadOnlyMemberGroup is already the materialization. A parallel group
//   would just mirror it, with extra sync paths that could drift.
//
// Hot-path discipline: isExempt is awaited per message in the rule
// pipeline. The platform caches resolved membership locally so .isMember
// is sub-ms in practice. Same cost shape as adminCheck.isAdmin, which is
// already proven at our message volume.
//
// Fail-closed semantics: a transient platform error (or globalSettings
// not yet hydrated) returns false (not exempt), so the pipeline applies
// the rule as if no exemption were configured. This is the conservative
// direction — better to occasionally apply a rule to a trusted member
// than to silently let a rule-breaker through under a degraded lookup.

function readExempt(): ReadOnlyMemberGroup | undefined {
  return rootServer.globalSettings?.general?.exempt as
    | ReadOnlyMemberGroup
    | undefined;
}

export async function isExempt(userId: UserGuid): Promise<boolean> {
  const group = readExempt();
  if (!group) return false;
  try {
    return await group.isMember({ userId });
  } catch (err) {
    log("warn", "exempt.isMember failed; treating as not exempt", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// Snapshot of the current exempt selection for read-only display in the
// app's General Settings tab. Returns the DIRECT selection (what the
// admin picked), not the resolved-by-role member list.
export function readExemptSelection(): {
  userIds: readonly string[];
  communityRoleIds: readonly string[];
} {
  const group = readExempt();
  if (!group) return { userIds: [], communityRoleIds: [] };
  return {
    userIds: [...(group.userIds ?? [])],
    communityRoleIds: [...(group.communityRoleIds ?? [])],
  };
}

// --- Change watcher --------------------------------------------------------
//
// The exempt selection is a globalSettings value, not an in-app setting, so
// app-internal mutations don't naturally fire SettingsChanged. Without a
// watcher, the in-app General tab would keep rendering a stale Pill list
// until the user navigated away and back. Mirrors the pattern in
// adminCheck.ts, which watches the admins selection.

function exemptSelectionKey(g: ReadOnlyMemberGroup | undefined): string {
  if (!g) return "";
  const userIds = [...(g.userIds ?? [])].sort();
  const roleIds = [...(g.communityRoleIds ?? [])].sort();
  return JSON.stringify({ u: userIds, r: roleIds });
}

const onChangeCallbacks: Array<() => void> = [];

export function onExemptChanged(cb: () => void): void {
  onChangeCallbacks.push(cb);
}

export function initializeExemptWatcher(state: RootAppStartState): void {
  state.globalSettings?.on(GlobalSettingsEvent.Update, (evt) => {
    const prev = evt.previous?.general?.exempt as
      | ReadOnlyMemberGroup
      | undefined;
    const curr = evt.current?.general?.exempt as
      | ReadOnlyMemberGroup
      | undefined;
    if (exemptSelectionKey(prev) === exemptSelectionKey(curr)) return;
    for (const cb of onChangeCallbacks) {
      try {
        cb();
      } catch (err) {
        log("error", "onExemptChanged subscriber threw", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });
}
