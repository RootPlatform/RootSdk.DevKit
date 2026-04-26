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
// An onAdminsChanged callback is invoked whenever admins shift so the
// service can broadcast a public AdminsChanged event — clients then
// re-fetch their amIAdmin flag. Apps that ALSO broadcast an admin-only
// settings snapshot (different audience, separate event) split admins
// signaling from the snapshot so non-admins don't receive privileged
// payloads. This sample's picker config is public, so a single broadcast
// suffices; see DESIGN.md "Broadcasts" for the conditional split rationale.
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
  //
  // Optional chain on `state.globalSettings` is defensive: the SDK should
  // always provide it for an app whose manifest declares `settings`, so
  // this branch should be unreachable in practice. If the SDK ever omits
  // globalSettings (manifest mistake, SDK regression), AdminsChanged
  // broadcasts simply never fire — `isAdmin` still works against the
  // owner ID cache, the app keeps running, and the missing wire-up
  // surfaces during admin-config testing rather than as a startup crash.
  // Logged below so the gap is visible if it happens.
  if (!state.globalSettings) {
    log("warn", "globalSettings missing from RootAppStartState; AdminsChanged broadcasts will not fire");
    return;
  }
  state.globalSettings.on("update", (evt) => {
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
// admins are part of). Multiple subscribers are allowed; they're invoked
// in registration order. The service uses this to fire its public
// admins-changed broadcast so clients refresh their amIAdmin flag — future
// modules can hook here for related concerns (e.g., audit logging).
export function onAdminsChanged(cb: () => void): void {
  onChangeCallbacks.push(cb);
}

export async function isAdmin(userId: UserGuid): Promise<boolean> {
  if (userId === getOwnerUserId()) return true;
  if (!adminsGroup) return false;
  // Fail-closed on transient errors. A platform hiccup mid-isMember would
  // otherwise propagate up through getPicker/requireAdmin and surface as
  // a full QueryError view. Returning false instead degrades gracefully:
  // non-admins are unaffected; an actual admin briefly loses admin chrome
  // until the SDK recovers and the next isAdmin call succeeds. Logged so
  // a real failure is visible to operators.
  try {
    return await adminsGroup.isMember({ userId });
  } catch (err) {
    log("warn", "adminsGroup.isMember failed; returning false (fail-closed)", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// Returns the current admins ReadOnlyMemberGroup, or undefined if
// globalSettings hasn't surfaced one yet (transient startup state, or
// admins not configured). Used as a broadcast audience for admin-only
// events — NOT for authorization checks (use isAdmin for that; it
// includes the owner fallback).
//
// Not called by this sample (all broadcasts are public). Kept for parity
// with apps whose payloads include admin-only data and need to gate the
// broadcast audience on the admins MemberGroup.
export function getAdminsGroup(): ReadOnlyMemberGroup | undefined {
  return adminsGroup;
}
