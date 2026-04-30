import {
  rootServer,
  MemberGroup,
  UserGuid,
} from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";
import { log, errFields } from "./lib/log";
import { getAdminsGroup, getOwnerUserId } from "./adminCheck";

// adminAudience — server-managed MemberGroup defining who receives
// admin-only broadcasts.
//
// Why we don't broadcast directly to globalSettings.general.admins:
// adminCheck treats the community owner as an implicit admin (defence in
// depth so the owner can never lock themselves out of their own app). If
// we broadcasted to the bare admins setting, an owner who isn't explicitly
// listed there would pass isAdmin but be invisible to admin broadcasts —
// their own Settings view would stay stale on their own mutations until
// they navigated away and back. For a moderation tool where the owner is
// often the operator, that's the core case, not an edge case.
//
// The materialized audience:
//   userIds          = globalSettings.general.admins.userIds ∪ ownerUserId
//   communityRoleIds = globalSettings.general.admins.communityRoleIds
//
// Re-sync triggers (all routed through adminCheck.onAdminsChanged):
//   - startup (after adminCheck initialization)
//   - globalSettings.update — admins selection changed
//   - CommunityEdited — ownership transferred
//
// MemberGroup.update is idempotent, so concurrent triggers are safe.

const RESOURCE_TYPE = "moderation";
const RESOURCE_ID = "app";
const GROUP_NAME = "adminAudience";

let group: MemberGroup | undefined;

export async function initializeAdminAudience(): Promise<void> {
  // getByName is idempotent across restarts. First start returns undefined
  // and we create.
  group = await withRetry("memberGroups.getByName(adminAudience)", () =>
    rootServer.memberGroups.getByName({
      resourceType: RESOURCE_TYPE,
      resourceId: RESOURCE_ID,
      name: GROUP_NAME,
    }),
  );

  if (!group) {
    group = await withRetry("memberGroups.create(adminAudience)", () =>
      rootServer.memberGroups.create({
        resourceType: RESOURCE_TYPE,
        resourceId: RESOURCE_ID,
        name: GROUP_NAME,
        userIds: [],
        communityRoleIds: [],
      }),
    );
    log("info", "adminAudience MemberGroup created");
  } else {
    log("info", "adminAudience MemberGroup loaded", {
      userCount: group.userIds.length,
      roleCount: group.communityRoleIds.length,
    });
  }

  await syncAdminAudience();
}

// Compose owner + admins-selection into the group. Idempotent. Safe to call
// from multiple subscriptions; MemberGroup.update is last-writer-wins.
// Errors are logged but not thrown — a transient SDK failure shouldn't
// poison the onAdminsChanged callback chain. The next change retries.
export async function syncAdminAudience(): Promise<void> {
  if (!group) {
    log("warn", "syncAdminAudience called before initialize; skipping");
    return;
  }

  const ownerUserId = getOwnerUserId();
  const adminsSelection = getAdminsGroup();

  // Set dedups when the owner is also explicitly in the admins selection.
  const userIdSet = new Set<UserGuid>();
  for (const u of adminsSelection?.userIds ?? []) userIdSet.add(u);
  if (ownerUserId) userIdSet.add(ownerUserId);
  const userIds = [...userIdSet];

  // Roles pass through unchanged — the platform resolves role membership.
  const communityRoleIds = [...(adminsSelection?.communityRoleIds ?? [])];

  try {
    await withRetry("adminAudience.update", () =>
      group!.update({ userIds, communityRoleIds }),
    );
    log("info", "adminAudience synced", {
      userCount: userIds.length,
      roleCount: communityRoleIds.length,
    });
  } catch (err) {
    log("error", "adminAudience sync failed", errFields(err));
  }
}

// Returns the audience MemberGroup for admin-only broadcasts. Undefined
// during the brief window before initializeAdminAudience() resolves;
// callers should treat undefined as "skip the broadcast."
export function getAdminAudience(): MemberGroup | undefined {
  return group;
}
