import {
  rootServer,
  CommunityRoleGuid,
  MemberGroup,
  UserGuid,
} from "@rootsdk/server-app";
import { withRetry } from "./lib/retry";
import { log } from "./lib/log";

// ============================================================================
// xpEligibleGroup — a platform-managed MemberGroup that holds the roles and
// users allowed to earn XP.
//
// Why a MemberGroup (vs. our own table):
//   * Platform auto-resolves role membership into `memberUserIds`. When a user
//     joins/leaves a role that's in the group, their eligibility flips for
//     free. No role-membership subscription to maintain.
//   * O(1) lookup via `memberUserIdsAsSet` for the message-handler hot path.
//
// Singleton identity: resourceType="levelingLeaderboard", resourceId="app",
// name="xpEligible". One group per install — XP-eligibility is global to the
// app, not per-resource.
//
// Empty semantics: if both user_ids and community_role_ids are empty, the
// message handler treats "empty = everyone eligible" (see DESIGN.md
// Appendix → Eligible members). Keeping this as a handler-side check rather
// than a server-side bypass preserves the invariant that xpEligibleGroup is
// always the source of truth for who is in the selected set.
// ============================================================================

const RESOURCE_TYPE = "levelingLeaderboard";
const RESOURCE_ID = "app";
const GROUP_NAME = "xpEligible";

let group: MemberGroup | undefined;

export async function initializeXpEligibleGroup(): Promise<void> {
  // getByName is the idempotent path — safe across restarts. On first startup
  // it returns undefined; we create the group then.
  group = await withRetry("memberGroups.getByName(xpEligible)", () =>
    rootServer.memberGroups.getByName({
      resourceType: RESOURCE_TYPE,
      resourceId: RESOURCE_ID,
      name: GROUP_NAME,
    }),
  );

  if (!group) {
    group = await withRetry("memberGroups.create(xpEligible)", () =>
      rootServer.memberGroups.create({
        resourceType: RESOURCE_TYPE,
        resourceId: RESOURCE_ID,
        name: GROUP_NAME,
        userIds: [],
        communityRoleIds: [],
      }),
    );
    log("info", "xpEligible MemberGroup created");
  } else {
    log("info", "xpEligible MemberGroup loaded", {
      userCount: group.userIds.length,
      roleCount: group.communityRoleIds.length,
      resolvedCount: group.memberUserIds.length,
    });
  }
}

export function getGroup(): MemberGroup {
  if (!group) {
    throw new Error(
      "xpEligibleGroup not initialized — call initializeXpEligibleGroup() in onStarting",
    );
  }
  return group;
}

// Message-handler hot path. Returns true when userId can earn XP.
//
// Empty group (no direct users AND no roles) means "everyone" per DESIGN.md.
// When the group has any selections, membership is the resolved set that
// the platform keeps fresh as role memberships change.
export function isEligible(userId: UserGuid): boolean {
  const g = getGroup();
  if (g.userIds.length === 0 && g.communityRoleIds.length === 0) return true;
  return g.memberUserIdsAsSet.has(userId);
}

// Replace the group's direct users and roles wholesale. Called from the
// UpdateXpEligibleMembers RPC. The platform handles the resolved-membership
// diff and fires MembersAdded/MembersRemoved events (unused here — our
// read path just calls isEligible at message time).
//
// Cache refresh: `MemberGroup.update()` mutates the captured group reference
// in place today, so our cached `group` would reflect the new selections
// without further action. We still re-fetch via getByName() after the update
// as belt-and-braces — if a future SDK release ever swaps to a
// return-a-new-instance shape, the cached reference would silently go stale
// and callers of isEligible() would still see the old membership set. The
// extra round trip costs nothing on an admin-driven mutation path (which
// fires at most a few times per Settings save) and keeps correctness
// independent of the in-place-mutation contract.
export async function replaceMembership(data: {
  userIds: UserGuid[];
  communityRoleIds: CommunityRoleGuid[];
}): Promise<void> {
  const g = getGroup();
  await withRetry("xpEligibleGroup.update", () => g.update(data));
  const refreshed = await withRetry("memberGroups.getByName(xpEligible)", () =>
    rootServer.memberGroups.getByName({
      resourceType: RESOURCE_TYPE,
      resourceId: RESOURCE_ID,
      name: GROUP_NAME,
    }),
  );
  // Defensive: the group must exist — we just updated it. If getByName
  // returned undefined we leave the existing `group` reference in place
  // rather than clearing it to undefined, which would brick isEligible()
  // until the next app restart.
  if (refreshed) group = refreshed;
}

// Read the current selections for GetSettings / SettingsUpdated snapshots.
// Returns the DIRECT selection (what the admin picked), not the resolved
// membership — the client picker needs to show the admin what they selected.
export function readSelection(): {
  userIds: UserGuid[];
  communityRoleIds: CommunityRoleGuid[];
} {
  const g = getGroup();
  return {
    userIds: [...g.userIds],
    communityRoleIds: [...g.communityRoleIds],
  };
}

