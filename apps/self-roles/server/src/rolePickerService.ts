import {
  Client,
  CommunityRole,
  CommunityRoleGuid,
  RootServerException,
  UserGuid,
  WellKnownRootGuids,
  rootServer,
} from "@rootsdk/server-app";
import {
  GetPickerRequest,
  GetPickerResponse,
  ToggleRoleRequest,
  ToggleRoleResponse,
  UpdateGroupsRequest,
  UpdateGroupsResponse,
  GetAssignableRolesRequest,
  GetAssignableRolesResponse,
  ReportClientErrorRequest,
  ReportClientErrorResponse,
  PickerGroup as WirePickerGroup,
  PickerRole as WirePickerRole,
  RolePickerError,
} from "@selfroles/gen-shared";
import { RolePickerServiceBase } from "@selfroles/gen-server";
import { isAdmin } from "./adminCheck";
import {
  PickerConfig,
  PickerGroupConfig,
  PickerRoleConfig,
  readConfig,
  writeConfig,
  mintGroupId,
} from "./pickerStore";
import { safeBroadcast } from "./lib/safeBroadcast";
import { log } from "./lib/log";
import { withRetry } from "./lib/retry";

// ============================================================================
// RolePickerService — RPC surface for the self-roles app.
//
// Auth gates:
//   - GetPicker, ToggleRole, ReportClientError: any authenticated client.
//   - UpdateGroups, GetAssignableRoles: admin-only via requireAdmin.
//
// Broadcasts:
//   - PickerConfigChanged → "all" (picker config is the public view; every
//     member needs the same payload to render their toggles).
//   - AdminsChanged → "all" (empty signal; clients re-fetch GetPicker for
//     fresh amIAdmin). Mirrors leveling-leaderboard's split rationale.
// ============================================================================

// --- Limits (server is the source of truth; shipped to client via GetPicker)
const LIMIT_GROUP_TITLE_CHARS = 60;
const LIMIT_GROUP_DESCRIPTION_CHARS = 200;
const LIMIT_ROLE_DESCRIPTION_CHARS = 200;
const LIMIT_MAX_GROUPS = 20;
const LIMIT_MAX_ROLES_PER_GROUP = 50;

// Caps on client error report payloads. See leveling-leaderboard for the
// rationale (ErrorBoundary funnel + truncate to bound log line size).
const LIMIT_ERROR_LABEL_CHARS = 100;
const LIMIT_ERROR_MESSAGE_CHARS = 2000;
const LIMIT_ERROR_STACK_CHARS = 8000;
const LIMIT_ERROR_USER_AGENT_CHARS = 500;

export class RolePickerService extends RolePickerServiceBase {
  // --- Public RPCs ---------------------------------------------------------

  async getPicker(
    _request: GetPickerRequest,
    client: Client,
  ): Promise<GetPickerResponse> {
    // amIAdmin and the role list are independent — fetch in parallel.
    const [amIAdmin, roleList, myRoles] = await Promise.all([
      isAdmin(client.userId),
      withRetry("communityRoles.list", () =>
        rootServer.community.communityRoles.list(),
      ),
      withRetry("communityMemberRoles.list(self)", () =>
        rootServer.community.communityMemberRoles.list({ userId: client.userId }),
      ),
    ]);

    const config = readConfig();
    const groups = resolveGroups(config, roleList);
    const myRoleIds = filterToPicker(myRoles.communityRoleIds ?? [], config);

    return {
      groups,
      myRoleIds,
      amIAdmin,
      limits: {
        groupTitleMaxChars: LIMIT_GROUP_TITLE_CHARS,
        groupDescriptionMaxChars: LIMIT_GROUP_DESCRIPTION_CHARS,
        roleDescriptionMaxChars: LIMIT_ROLE_DESCRIPTION_CHARS,
        maxGroups: LIMIT_MAX_GROUPS,
        maxRolesPerGroup: LIMIT_MAX_ROLES_PER_GROUP,
      },
    };
  }

  async toggleRole(
    request: ToggleRoleRequest,
    client: Client,
  ): Promise<ToggleRoleResponse> {
    const config = readConfig();

    // The role MUST be in the current picker config. Reject otherwise —
    // either the caller's view is stale (admin removed it) or the request
    // was hand-crafted. Safer to reject than to silently succeed and
    // mutate role state for a role this app doesn't claim ownership of.
    const inPicker = isRoleInPicker(request.roleId as CommunityRoleGuid, config);
    if (!inPicker) {
      throw new RootServerException(
        RolePickerError.ROLE_NOT_IN_PICKER,
        "Role is not in the current picker config",
      );
    }

    // Find the role's group (for exclusive-group handling). Picker config
    // guarantees a role appears in at most one group (validated on write).
    const group = config.groups.find((g) =>
      g.roles.some((r) => r.roleId === request.roleId),
    );
    if (!group) {
      // Defensive: should be unreachable given inPicker passed above.
      throw new RootServerException(
        RolePickerError.ROLE_NOT_IN_PICKER,
        "Role not in any group",
      );
    }

    if (request.desired) {
      // Add path. For exclusive groups, remove any siblings the caller
      // already has BEFORE adding the new role — ordering matters because
      // a future SDK change to "list current roles atomically" could let
      // us collapse this, but right now removes-then-add is the safest
      // observable order for clients fetching mid-flight.
      if (group.exclusive) {
        const currentlyHeld = await withRetry(
          "communityMemberRoles.list(self)",
          () =>
            rootServer.community.communityMemberRoles.list({
              userId: client.userId,
            }),
        );
        const siblingsToRemove = group.roles
          .map((r) => r.roleId)
          .filter(
            (rid) =>
              rid !== request.roleId &&
              (currentlyHeld.communityRoleIds ?? []).includes(rid),
          );
        for (const rid of siblingsToRemove) {
          await safeRemoveRole(rid as CommunityRoleGuid, client.userId);
        }
      }

      try {
        await withRetry("communityMemberRoles.add", () =>
          rootServer.community.communityMemberRoles.add({
            communityRoleId: request.roleId as CommunityRoleGuid,
            userIds: [client.userId],
          }),
        );
      } catch (err) {
        // Hierarchy or permission-revoked failure. Surface to client so
        // it can show "this role can't be assigned right now" rather than
        // a generic broken state.
        throw new RootServerException(
          RolePickerError.ROLE_NOT_ASSIGNABLE,
          err instanceof Error ? err.message : "Role assignment failed",
        );
      }
    } else {
      // Remove path. Idempotent — SDK silently no-ops when the user
      // doesn't have the role.
      try {
        await withRetry("communityMemberRoles.remove", () =>
          rootServer.community.communityMemberRoles.remove({
            communityRoleId: request.roleId as CommunityRoleGuid,
            userIds: [client.userId],
          }),
        );
      } catch (err) {
        throw new RootServerException(
          RolePickerError.ROLE_NOT_ASSIGNABLE,
          err instanceof Error ? err.message : "Role removal failed",
        );
      }
    }

    // Re-fetch the caller's roles for the response. Cheap (single API call)
    // and authoritative — avoids the client having to track local state
    // after exclusive-group sibling removals.
    const updated = await withRetry("communityMemberRoles.list(self)", () =>
      rootServer.community.communityMemberRoles.list({ userId: client.userId }),
    );
    const myRoleIds = filterToPicker(updated.communityRoleIds ?? [], config);
    return { myRoleIds };
  }

  // --- Admin RPCs ----------------------------------------------------------

  async updateGroups(
    request: UpdateGroupsRequest,
    client: Client,
  ): Promise<UpdateGroupsResponse> {
    await this.requireAdmin(client);

    const validated = validateAndNormalize(request.groups);

    await writeConfig(validated);

    log("info", "picker config updated", {
      by: client.userId,
      groupCount: validated.groups.length,
      roleCount: validated.groups.reduce((n, g) => n + g.roles.length, 0),
    });

    await this.broadcastConfig();
    return {};
  }

  async getAssignableRoles(
    request: GetAssignableRolesRequest,
    client: Client,
  ): Promise<GetAssignableRolesResponse> {
    await this.requireAdmin(client);

    const all = await withRetry("communityRoles.list", () =>
      rootServer.community.communityRoles.list(),
    );
    const exclude = new Set(request.excludeRoleIds);
    const everyone = WellKnownRootGuids.CommunityRoles.EveryoneRole;

    const roles: WirePickerRole[] = all
      .filter((r) => r.id !== everyone && !exclude.has(r.id))
      .map((r) => ({
        roleId: r.id,
        name: r.name,
        color: r.colorHex ?? "",
        // No admin-supplied description yet — this RPC returns the universe
        // of pickable roles, not configured ones.
        description: "",
      }));

    return { roles };
  }

  // --- Client telemetry ----------------------------------------------------

  async reportClientError(
    request: ReportClientErrorRequest,
    client: Client,
  ): Promise<ReportClientErrorResponse> {
    log("error", "client error reported", {
      userId: client.userId,
      label: truncate(request.label, LIMIT_ERROR_LABEL_CHARS),
      clientMessage: truncate(request.message, LIMIT_ERROR_MESSAGE_CHARS),
      stack: truncate(request.stack, LIMIT_ERROR_STACK_CHARS),
      userAgent: truncate(request.userAgent, LIMIT_ERROR_USER_AGENT_CHARS),
    });
    return {};
  }

  // --- Internal broadcasts -------------------------------------------------

  // Called from the communityRoleSync onPickerConfigChanged hook after a
  // role-deleted cull or a role-edited rename, AND from updateGroups after
  // an admin save. Single fan-out path keeps the broadcast logic in one place.
  async broadcastConfig(): Promise<void> {
    const config = readConfig();
    const roleList = await withRetry("communityRoles.list", () =>
      rootServer.community.communityRoles.list(),
    );
    const groups = resolveGroups(config, roleList);
    await safeBroadcast("PickerConfigChanged", () =>
      this.broadcastPickerConfigChanged({ groups }, "all"),
    );
  }

  // Called from the adminCheck onAdminsChanged hook. Fires the public empty
  // AdminsChanged event so every client re-fetches GetPicker.
  async notifyAdminsChanged(): Promise<void> {
    await safeBroadcast("AdminsChanged", () =>
      this.broadcastAdminsChanged({}, "all"),
    );
  }

  // --- Helpers -------------------------------------------------------------

  private async requireAdmin(client: Client): Promise<void> {
    const ok = await isAdmin(client.userId);
    if (!ok) {
      throw new RootServerException(RolePickerError.NOT_ADMIN, "Admin only");
    }
  }
}

// --- Module-scope helpers ---------------------------------------------------

// Stitch stored config + live community-role data into the wire shape.
// Storage carries identity + admin overrides; CommunityRole carries name +
// color. Roles missing from the live list (e.g., recently deleted but the
// communityRoleSync subscription hasn't fired yet) are dropped — better to
// hide a momentarily-orphaned toggle than to render a broken row.
function resolveGroups(
  config: PickerConfig,
  roleList: CommunityRole[],
): WirePickerGroup[] {
  const byId = new Map(roleList.map((r) => [r.id, r]));
  return config.groups
    .map((g) => ({
      groupId: g.groupId,
      title: g.title,
      description: g.description,
      exclusive: g.exclusive,
      roles: g.roles
        .map((r): WirePickerRole | undefined => {
          const role = byId.get(r.roleId);
          if (!role) return undefined;
          return {
            roleId: r.roleId,
            name: role.name,
            color: role.colorHex ?? "",
            description: r.descriptionOverride,
          };
        })
        .filter((r): r is WirePickerRole => r !== undefined),
    }))
    .filter((g) => g.roles.length > 0);
}

function isRoleInPicker(
  roleId: CommunityRoleGuid,
  config: PickerConfig,
): boolean {
  return config.groups.some((g) => g.roles.some((r) => r.roleId === roleId));
}

// Reduce the caller's full role list to just the ones in our picker. Roles
// the user has from outside this app's curation are out of scope and never
// surface to the client.
function filterToPicker(
  allRoleIds: CommunityRoleGuid[],
  config: PickerConfig,
): string[] {
  const picker = new Set<string>();
  for (const g of config.groups) {
    for (const r of g.roles) picker.add(r.roleId);
  }
  return allRoleIds.filter((id) => picker.has(id));
}

// Validate the wire payload and normalize into stored shape. Mints group IDs
// for any group that came in without one (admin just created it client-side).
// Throws RootServerException(INVALID_CONFIG) on any structural problem so the
// admin sees a clear error instead of a silent partial save.
function validateAndNormalize(groups: WirePickerGroup[]): PickerConfig {
  if (groups.length > LIMIT_MAX_GROUPS) {
    throw new RootServerException(
      RolePickerError.INVALID_CONFIG,
      `Too many groups (max ${LIMIT_MAX_GROUPS})`,
    );
  }

  const seenGroupIds = new Set<string>();
  const seenRoleIds = new Set<string>();
  const out: PickerGroupConfig[] = [];

  for (const g of groups) {
    if (!g.title.trim()) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        "Group title is required",
      );
    }
    if (g.title.length > LIMIT_GROUP_TITLE_CHARS) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Group title too long (max ${LIMIT_GROUP_TITLE_CHARS})`,
      );
    }
    if (g.description.length > LIMIT_GROUP_DESCRIPTION_CHARS) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Group description too long (max ${LIMIT_GROUP_DESCRIPTION_CHARS})`,
      );
    }
    if (g.roles.length > LIMIT_MAX_ROLES_PER_GROUP) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Too many roles in group "${g.title}" (max ${LIMIT_MAX_ROLES_PER_GROUP})`,
      );
    }

    const groupId = g.groupId || mintGroupId();
    if (seenGroupIds.has(groupId)) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Duplicate group id ${groupId}`,
      );
    }
    seenGroupIds.add(groupId);

    const roles: PickerRoleConfig[] = [];
    for (const r of g.roles) {
      if (!r.roleId) {
        throw new RootServerException(
          RolePickerError.INVALID_CONFIG,
          "Role id required",
        );
      }
      if (seenRoleIds.has(r.roleId)) {
        throw new RootServerException(
          RolePickerError.INVALID_CONFIG,
          `Role ${r.roleId} appears in more than one group`,
        );
      }
      seenRoleIds.add(r.roleId);

      if (r.description.length > LIMIT_ROLE_DESCRIPTION_CHARS) {
        throw new RootServerException(
          RolePickerError.INVALID_CONFIG,
          `Role description too long (max ${LIMIT_ROLE_DESCRIPTION_CHARS})`,
        );
      }
      roles.push({
        roleId: r.roleId as CommunityRoleGuid,
        descriptionOverride: r.description,
      });
    }

    out.push({
      groupId,
      title: g.title,
      description: g.description,
      exclusive: g.exclusive,
      roles,
    });
  }

  return { groups: out };
}

// Same surrogate-pair-safe truncate as leveling-leaderboard. See that sample
// for the long-form rationale (briefly: String.slice cuts at UTF-16 code
// units which can split astral characters; Array.from iterates code points).
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const codePoints = Array.from(s);
  if (codePoints.length <= max) return s;
  return codePoints.slice(0, max).join("") + "…[truncated]";
}

// Best-effort role removal used during exclusive-group sibling clearing.
// Logged-and-swallow rather than throw — the user's *requested* add still
// needs to proceed; if a sibling remove failed (transient, role just
// deleted between list and remove), the toggle endpoint's eventual
// list-of-current-roles-in-response gives the client an authoritative
// picture and the next render reconciles.
async function safeRemoveRole(
  roleId: CommunityRoleGuid,
  userId: UserGuid,
): Promise<void> {
  try {
    await withRetry("communityMemberRoles.remove(sibling)", () =>
      rootServer.community.communityMemberRoles.remove({
        communityRoleId: roleId,
        userIds: [userId],
      }),
    );
  } catch (err) {
    log("warn", "exclusive-group sibling remove failed", {
      roleId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const rolePickerService = new RolePickerService();
