import {
  rootServer,
  MemberGroup,
  UserGuid,
} from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";
import { log, errFields } from "./lib/log";
import { getAdminsGroup, getOwnerUserId } from "./adminCheck";

// ============================================================================
// adminAudience — a server-managed MemberGroup that defines who receives
// admin-only broadcasts for this app.
//
// Why we don't broadcast to globalSettings.general.admins directly:
//   The platform's admins setting defines who the admin SETTING covers.
//   The community owner is ALSO treated as admin via adminCheck.isAdmin's
//   implicit-owner check (defence in depth so the owner can never lock
//   themselves out). If we used globalSettings.general.admins as the
//   broadcast audience, an owner who hasn't added themselves to that
//   setting would pass isAdmin but be invisible to admin broadcasts —
//   their own Settings view would stay stale on their own mutations
//   until they navigated away and back.
//
//   For a watcher/admin tool where the owner is the most likely operator,
//   that's the core case, not an edge case. So we materialize the real
//   audience as a server-managed MemberGroup:
//
//     userIds          = globalSettings.general.admins.userIds ∪ owner
//     communityRoleIds = globalSettings.general.admins.communityRoleIds
//
//   The platform resolves role memberships into the group's resolved set
//   automatically (cf. leveling-leaderboard's xpEligibleGroup, same shape).
//
// Re-sync triggers (all wired through adminCheck.onAdminsChanged):
//   - startup (after adminCheck initialization)
//   - globalSettings.update — admins selection changed
//   - CommunityEdited — ownership transferred
//
// MemberGroup.update is idempotent, so concurrent triggers are safe.
// ============================================================================

const RESOURCE_TYPE = "releaseWatcher";
const RESOURCE_ID = "app";
const GROUP_NAME = "adminAudience";

let group: MemberGroup | undefined;

export async function initializeAdminAudience(): Promise<void> {
  // getByName is the idempotent path — safe across restarts. On first
  // startup it returns undefined and we create the group.
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

  // Initial sync against current owner + admins selection.
  await syncAdminAudience();
}

// Compose owner + admins-selection into the group's membership. Idempotent.
// Safe to call from multiple subscriptions (admins-changed AND
// owner-changed both route here without coordination); MemberGroup.update
// is last-writer-wins.
//
// Errors are logged but not thrown — a transient SDK failure shouldn't
// crash the broader onAdminsChanged callback chain. The next change will
// retry naturally.
export async function syncAdminAudience(): Promise<void> {
  if (!group) {
    log("warn", "syncAdminAudience called before initialize; skipping");
    return;
  }

  const ownerUserId = getOwnerUserId();
  const adminsSelection = getAdminsGroup();

  // Compose user IDs: admins-selection + owner. Set dedups in case the
  // owner is also explicitly listed in the admins selection.
  const userIdSet = new Set<UserGuid>();
  for (const u of adminsSelection?.userIds ?? []) userIdSet.add(u);
  if (ownerUserId) userIdSet.add(ownerUserId);
  const userIds = [...userIdSet];

  // Roles pass through unchanged. Anyone in an admin-role member is
  // already admin-by-isMember; we just want them to also receive
  // broadcasts. The platform resolves role membership for us.
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
// callers should treat undefined as "skip the broadcast" — same shape as
// the leveling-leaderboard xpEligibleGroup pattern.
export function getAdminAudience(): MemberGroup | undefined {
  return group;
}
