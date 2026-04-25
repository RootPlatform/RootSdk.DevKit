import {
  rootServer,
  RootAppStartState,
  ReadOnlyMemberGroup,
  UserGuid,
} from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";
import { log } from "./lib/log";

// ============================================================================
// adminCheck — resolves whether a userId is an app admin.
//
//   isAdmin(userId) = (userId === community.ownerUserId)
//                  || admins.isMember({ userId })
//
// Where admins is the ReadOnlyMemberGroup bound to the manifest's
// globalSettings.general.admins (a roleOrMember setting managed by Root's
// native Settings UI). The owner is kept as an implicit admin as defence in
// depth — if the owner ever clears themselves out of the admins selection,
// they can still access the app and recover.
//
// Owner is cached ONCE at startup (Root Platform does not currently support
// runtime ownership transfer). The admins reference is re-captured whenever
// globalSettings fires an "update" event.
//
// An onAdminsChanged callback is invoked whenever admins shift so the service
// can broadcast the public AdminsChanged event — clients then re-fetch
// GetLeaderboard to refresh their amIAdmin flag. (The admin-only
// SettingsUpdated event carries a settings snapshot and has a different
// audience — see leaderboardService.ts for the split rationale.)
// ============================================================================

let ownerUserId: UserGuid | undefined;
let adminsGroup: ReadOnlyMemberGroup | undefined;
const onChangeCallbacks: Array<() => void> = [];

export function getOwnerUserId(): UserGuid {
  if (!ownerUserId) {
    throw new Error(
      "adminCheck not initialized — call initializeAdminCheck() in onStarting",
    );
  }
  return ownerUserId;
}

function readAdminsGroup(
  settings: Record<string, Record<string, unknown>> | undefined,
): ReadOnlyMemberGroup | undefined {
  if (!settings) return undefined;
  const raw = settings["general"]?.["admins"];
  if (raw && typeof raw === "object" && "memberUserIds" in raw) {
    return raw as ReadOnlyMemberGroup;
  }
  return undefined;
}

export async function initializeAdminCheck(
  state: RootAppStartState,
): Promise<void> {
  const community = await withRetry("communities.get", () =>
    rootServer.community.communities.get(),
  );
  ownerUserId = community.ownerUserId;

  adminsGroup = readAdminsGroup(state.globalSettings);
  if (!adminsGroup) {
    log("warn", "admins globalSetting not available at startup; only the community owner will pass isAdmin until admins are configured");
  }

  // We broadcast on every globalSettings update rather than diffing. Today
  // `admins` is the only key in globalSettings, so every update is an admins
  // change. If more keys are added later, a diff on `current.general.admins`
  // would avoid spurious broadcasts — keeping correctness the simple way
  // until that's actually relevant.
  state.globalSettings?.on("update", (evt) => {
    adminsGroup = readAdminsGroup(evt.current);
    for (const cb of onChangeCallbacks) {
      try {
        cb();
      } catch (err) {
        // One subscriber's failure must not block the others. Each callback
        // is small (typically one broadcast call) but a future fork could
        // wire something heavier here.
        log("error", "onAdminsChanged subscriber threw", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });
}

// Register a listener that fires whenever globalSettings updates (which
// admins are part of). Multiple subscribers are allowed; they're invoked in
// registration order. The service uses this to broadcast SettingsUpdated
// so clients refresh their amIAdmin flag — future modules can hook here
// for related concerns (e.g., audit logging).
export function onAdminsChanged(cb: () => void): void {
  onChangeCallbacks.push(cb);
}

export async function isAdmin(userId: UserGuid): Promise<boolean> {
  if (userId === getOwnerUserId()) return true;
  if (!adminsGroup) return false;
  return adminsGroup.isMember({ userId });
}

// Returns the current admins ReadOnlyMemberGroup, or undefined if globalSettings
// hasn't surfaced one yet (transient startup state, or admins not configured).
// Used as a broadcast audience for admin-only events — NOT for authorization
// checks (use isAdmin for that; it includes the owner fallback).
export function getAdminsGroup(): ReadOnlyMemberGroup | undefined {
  return adminsGroup;
}
