import {
  rootServer,
  RootAppStartState,
  ReadOnlyMemberGroup,
  UserGuid,
  CommunityEvent,
  GlobalSettingsEvent,
} from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";
import { log } from "./lib/log";

// ============================================================================
// adminCheck — resolves whether a userId is an app admin.
//
//   isAdmin(userId) = (userId === community.ownerUserId)
//                  || admins.isMember({ userId })
//
// `admins` is the ReadOnlyMemberGroup bound to the manifest's
// globalSettings.general.admins (a roleOrMember setting managed by Root's
// native Settings UI). The owner is kept as an implicit admin as defence in
// depth — if the owner ever clears themselves out of the admins selection,
// they can still access the app and recover.
//
// State held in this module:
//   - ownerUserId:        cached at startup via community.get(); refreshed
//                         on CommunityEdited events. Cache is justified —
//                         community.get() is a real network round-trip and
//                         ownership rarely changes.
//   - onChangeCallbacks:  subscriber list for AdminsChanged broadcasts.
//
// State NOT held (read fresh each time):
//   - admins ReadOnlyMemberGroup: rootServer.globalSettings is a live SDK
//     object. Re-reading is free, and a held reference would expose stale
//     userIds / communityRoleIds arrays after a globalSettings update.
//
// onAdminsChanged fires whenever EITHER:
//   - the admins selection in globalSettings changes, OR
//   - the community owner changes (ownership transfer).
// Both shift who passes isAdmin, so clients refetch the same way for either.
// (The admin-only SettingsUpdated event carries a settings snapshot and has
// a different audience — see leaderboardService.ts for the split rationale.)
// ============================================================================

let ownerUserId: UserGuid | undefined;
const onChangeCallbacks: Array<() => void> = [];
// Re-entry guard. The CommunityEdited and globalSettings.update listeners
// registered in initializeAdminCheck have no .off() teardown — they live
// for the process lifetime. A second call would double-subscribe (each
// event handler runs twice, fireOnAdminsChanged fires twice in
// succession). Practically benign because both handlers are idempotent
// (the ownerUserId === guard short-circuits the second CommunityEdited
// fire; the adminsSelectionKey diff short-circuits the second
// globalSettings.update fire), but extra calls and listener-list growth
// are cheap to prevent. Set AFTER subscriptions are wired so a thrown
// error mid-init leaves the guard open for a retry.
let initialized = false;

// Stable string key of an admins selection (sorted user + role IDs
// serialized). Used inside the globalSettings update handler to skip
// onAdminsChanged callbacks when the event didn't actually change the
// admins selection — a fork that adds a second globalSetting key would
// otherwise spam AdminsChanged on every unrelated tweak.
//
// Uses the SELECTION fields (userIds + communityRoleIds) — what the admin
// picks in the Root UI. memberUserIds is the DERIVED set including users
// resolved through selected roles, which can shift independently (e.g. a
// user joining a selected role); diffing on it would muddle "admin
// selection changed" with "role membership shifted elsewhere." Role-
// membership shifts don't fire globalSettings.update anyway, so we never
// reach this code for them.
function adminsSelectionKey(g: ReadOnlyMemberGroup | undefined): string {
  if (!g) return "";
  const userIds = [...(g.userIds ?? [])].sort();
  const roleIds = [...(g.communityRoleIds ?? [])].sort();
  return JSON.stringify({ u: userIds, r: roleIds });
}

function readAdmins(): ReadOnlyMemberGroup | undefined {
  return rootServer.globalSettings?.general?.admins as
    | ReadOnlyMemberGroup
    | undefined;
}

export async function initializeAdminCheck(
  state: RootAppStartState,
): Promise<void> {
  if (initialized) {
    log(
      "warn",
      "initializeAdminCheck called more than once; ignoring duplicate (would double-subscribe listeners)",
    );
    return;
  }

  const community = await withRetry("communities.get", () =>
    rootServer.community.communities.get(),
  );
  ownerUserId = community.ownerUserId;

  if (!readAdmins()) {
    log(
      "warn",
      "admins globalSetting empty at startup; only the community owner will pass isAdmin until an admin is selected in app settings",
    );
  }

  // CommunityEdited fires for any community-record change (name, icon,
  // owner, etc.). We only care about ownership transfer here — diff against
  // the cached ownerUserId to skip the no-op cases.
  rootServer.community.communities.on(CommunityEvent.CommunityEdited, (evt) => {
    if (evt.ownerUserId === ownerUserId) return;
    ownerUserId = evt.ownerUserId;
    fireOnAdminsChanged("ownership transferred");
  });

  // Admins-selection changes. The event payload provides previous + current
  // snapshots, so we diff inside the handler — no held selection-key state.
  state.globalSettings?.on(GlobalSettingsEvent.Update, (evt) => {
    const prev = evt.previous?.general?.admins as
      | ReadOnlyMemberGroup
      | undefined;
    const curr = evt.current?.general?.admins as
      | ReadOnlyMemberGroup
      | undefined;
    if (adminsSelectionKey(prev) === adminsSelectionKey(curr)) return;
    fireOnAdminsChanged("admins selection changed");
  });

  // Trip the re-entry guard last. If anything above threw, init can be
  // retried — `initialized` stays false and the next call re-runs from
  // the top. Subscriptions registered before a thrown error would
  // double up on retry, but the only `await` above is community.get();
  // a failure there means we never reached the .on() calls.
  initialized = true;
}

function fireOnAdminsChanged(reason: string): void {
  for (const cb of onChangeCallbacks) {
    try {
      cb();
    } catch (err) {
      // One subscriber's failure must not block the others. Each callback
      // is small (typically one broadcast call), but a future fork could
      // wire something heavier here.
      log("error", `onAdminsChanged subscriber threw (${reason})`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// Register a listener that fires whenever the admin set effectively
// changes — either the globalSettings admins selection shifts, or
// community ownership transfers. Multiple subscribers are allowed; they're
// invoked in registration order. The service uses this to broadcast
// AdminsChanged so clients refresh their amIAdmin flag.
export function onAdminsChanged(cb: () => void): void {
  onChangeCallbacks.push(cb);
}

export async function isAdmin(userId: UserGuid): Promise<boolean> {
  // Fail-closed on uninitialized state. The current control flow can't
  // reach here without initializeAdminCheck() having run (it's awaited in
  // onStarting before addService), but a future refactor that changed init
  // ordering would otherwise surface a confusing crash on the first RPC.
  if (!ownerUserId) {
    log("error", "isAdmin called before adminCheck initialized; returning false", {
      userId,
    });
    return false;
  }
  if (userId === ownerUserId) return true;
  const admins = readAdmins();
  if (!admins) return false;
  // Fail-closed on transient errors. A platform hiccup mid-isMember would
  // otherwise propagate up through GetLeaderboard / GetSettings and
  // surface as a full QueryError view. Returning false instead degrades
  // gracefully: non-admins are unaffected; an actual admin briefly loses
  // admin chrome until the SDK recovers and the next isAdmin call
  // succeeds. Logged so a real failure is visible to operators.
  try {
    return await admins.isMember({ userId });
  } catch (err) {
    log("warn", "admins.isMember failed; returning false (fail-closed)", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// Returns the current admins ReadOnlyMemberGroup, or undefined if
// globalSettings hasn't surfaced one yet (no admins picked, or transient
// startup state). Used as a broadcast audience for admin-only events —
// NOT for authorization checks (use isAdmin for that; it includes the
// owner fallback).
export function getAdminsGroup(): ReadOnlyMemberGroup | undefined {
  return readAdmins();
}
