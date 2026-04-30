import {
  rootServer,
  RootAppStartState,
  ReadOnlyMemberGroup,
  UserGuid,
  Client,
  CommunityEvent,
  GlobalSettingsEvent,
  RootServerException,
} from "@rootsdk/server-app";
import { ModerationError } from "@moderation/gen-shared";
import { withRetry } from "./lib/retry";
import { log } from "./lib/log";

// adminCheck — resolves whether a userId is a moderation admin.
//
//   isAdmin(userId) = (userId === community.ownerUserId)
//                  || admins.isMember({ userId })
//
// `admins` is the ReadOnlyMemberGroup bound to globalSettings.general.admins.
// The owner is kept as an implicit admin as defence in depth — if the owner
// clears themselves out of the picker, they can still recover.

let ownerUserId: UserGuid | undefined;
const onChangeCallbacks: Array<() => void> = [];
let initialized = false;

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
    log("warn", "initializeAdminCheck called more than once; ignoring");
    return;
  }

  const community = await withRetry("communities.get", () =>
    rootServer.community.communities.get(),
  );
  ownerUserId = community.ownerUserId;

  if (!readAdmins()) {
    log(
      "warn",
      "admins globalSetting empty at startup; only the community owner will pass isAdmin until configured",
    );
  }

  rootServer.community.communities.on(CommunityEvent.CommunityEdited, (evt) => {
    if (evt.ownerUserId === ownerUserId) return;
    ownerUserId = evt.ownerUserId;
    fireOnAdminsChanged("ownership transferred");
  });

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

  initialized = true;
}

function fireOnAdminsChanged(reason: string): void {
  for (const cb of onChangeCallbacks) {
    try {
      cb();
    } catch (err) {
      log("error", `onAdminsChanged subscriber threw (${reason})`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export function onAdminsChanged(cb: () => void): void {
  onChangeCallbacks.push(cb);
}

export async function isAdmin(userId: UserGuid): Promise<boolean> {
  if (!ownerUserId) {
    log("error", "isAdmin called before adminCheck initialized; returning false", {
      userId,
    });
    return false;
  }
  if (userId === ownerUserId) return true;
  const admins = readAdmins();
  if (!admins) return false;
  // Fail-closed on transient errors. A platform hiccup mid-isMember
  // returning false degrades gracefully — actual admins briefly lose admin
  // chrome until the next call succeeds.
  try {
    return await admins.isMember({ userId });
  } catch (err) {
    log("warn", "admins.isMember failed; returning false", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function requireAdmin(client: Client): Promise<void> {
  const ok = await isAdmin(client.userId);
  if (!ok) {
    throw new RootServerException(ModerationError.NOT_ADMIN, "Admin only");
  }
}

export function getAdminsGroup(): ReadOnlyMemberGroup | undefined {
  return readAdmins();
}

// Returns the cached community owner. Undefined before initializeAdminCheck()
// resolves. Used by adminAudience to compose the owner ∪ admins union.
export function getOwnerUserId(): UserGuid | undefined {
  return ownerUserId;
}
