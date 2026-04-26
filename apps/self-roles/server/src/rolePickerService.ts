import {
  Client,
  CommunityRole,
  CommunityRoleGuid,
  ErrorCodeType,
  RootApiException,
  RootServerException,
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

// Tighter retry budget for the user-facing RPCs (ToggleRole, GetPicker,
// GetAssignableRoles). The default in lib/retry.ts is sized for
// background workers — 3 retries with up to 15s backoff, ~16s total
// worst case. That stacks on top of the client's own retry budget; an
// interactive click can hang for 60+ seconds before failure surfaces.
// One quick retry is plenty for interactive paths: we want to recover
// from a single transient blip without making the user wait through
// exponential backoff for an actually-broken endpoint.
const INTERACTIVE_RETRY = { maxRetries: 1, baseDelayMs: 200, maxDelayMs: 1000 };

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
      withRetry(
        "communityRoles.list",
        () => rootServer.community.communityRoles.list(),
        INTERACTIVE_RETRY,
      ),
      withRetry(
        "communityMemberRoles.list(self)",
        () =>
          rootServer.community.communityMemberRoles.list({
            userId: client.userId,
          }),
        INTERACTIVE_RETRY,
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
    // Per-user serialization. Two concurrent ToggleRole calls from the
    // same user (two browser tabs, mid-air retry, etc.) racing through
    // the exclusive-group path can both observe zero siblings, both
    // remove nothing, and each add a different role — leaving the user
    // holding two roles in a "pick one" group. Serializing per-user
    // turns the check-then-act sequence into atomic-from-the-user's-
    // perspective. The lock is per-user, not global, so concurrent
    // mutations across users still parallelize.
    return withUserLock(client.userId, () => this.toggleRoleLocked(request, client));
  }

  private async toggleRoleLocked(
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
          INTERACTIVE_RETRY,
        );
        const siblingsToRemove = group.roles
          .map((r) => r.roleId)
          .filter(
            (rid) =>
              rid !== request.roleId &&
              (currentlyHeld.communityRoleIds ?? []).includes(rid),
          );
        for (const rid of siblingsToRemove) {
          // Propagate sibling-remove failures rather than swallowing
          // them. A swallowed failure here would let the subsequent add
          // run anyway, leaving the user holding multiple roles in an
          // "exclusive" group — the client would render two radios as ON
          // until something else triggered a refresh, with no driver for
          // that refresh until the user clicked again. Better to surface
          // the failure now and leave the user's state unchanged.
          try {
            await withRetry(
              "communityMemberRoles.remove(sibling)",
              () =>
                rootServer.community.communityMemberRoles.remove({
                  communityRoleId: rid as CommunityRoleGuid,
                  userIds: [client.userId],
                }),
              INTERACTIVE_RETRY,
            );
          } catch (err) {
            throw assignabilityException(err, "remove");
          }
        }
      }

      try {
        await withRetry(
          "communityMemberRoles.add",
          () =>
            rootServer.community.communityMemberRoles.add({
              communityRoleId: request.roleId as CommunityRoleGuid,
              userIds: [client.userId],
            }),
          INTERACTIVE_RETRY,
        );
      } catch (err) {
        throw assignabilityException(err, "add");
      }
    } else {
      // Remove path. Idempotent — SDK silently no-ops when the user
      // doesn't have the role.
      try {
        await withRetry(
          "communityMemberRoles.remove",
          () =>
            rootServer.community.communityMemberRoles.remove({
              communityRoleId: request.roleId as CommunityRoleGuid,
              userIds: [client.userId],
            }),
          INTERACTIVE_RETRY,
        );
      } catch (err) {
        throw assignabilityException(err, "remove");
      }
    }

    // Re-fetch the caller's roles for the response. Cheap (single API call)
    // and authoritative — avoids the client having to track local state
    // after exclusive-group sibling removals.
    const updated = await withRetry(
      "communityMemberRoles.list(self)",
      () =>
        rootServer.community.communityMemberRoles.list({
          userId: client.userId,
        }),
      INTERACTIVE_RETRY,
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

    const { config: validated, idRemappings } = validateAndNormalize(
      request.groups,
    );

    await writeConfig(validated);

    log("info", "picker config updated", {
      by: client.userId,
      groupCount: validated.groups.length,
      roleCount: validated.groups.reduce((n, g) => n + g.roles.length, 0),
    });

    await this.broadcastConfig();
    return { idRemappings };
  }

  async getAssignableRoles(
    request: GetAssignableRolesRequest,
    client: Client,
  ): Promise<GetAssignableRolesResponse> {
    await this.requireAdmin(client);

    const all = await withRetry(
      "communityRoles.list",
      () => rootServer.community.communityRoles.list(),
      INTERACTIVE_RETRY,
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
    // Per-caller rate limit — drop reports beyond N per minute. A render-
    // loop ErrorBoundary could otherwise spam our log at the SDK's RPC
    // ceiling (per-call truncate bounds line size but not call count).
    // We log the FIRST drop in a window so the existence of a flood is
    // still visible without flooding the log itself.
    if (!checkErrorReportRate(client.userId)) {
      return {};
    }
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
    // INTERACTIVE_RETRY here too, not the wider default. broadcastConfig
    // is awaited from updateGroups (the admin save RPC) — using the
    // wider default would let a transient SDK hiccup hang the admin's
    // UI for ~50s of backoff. The background callers (communityRoleSync)
    // are also fine with a tight retry: a transient failure is fine to
    // give up on quickly because we'll fire another broadcast on the
    // next change anyway.
    const roleList = await withRetry(
      "communityRoles.list",
      () => rootServer.community.communityRoles.list(),
      INTERACTIVE_RETRY,
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
//
// Empty groups (zero roles) are PRESERVED in the wire response. The admin
// editor needs them so an admin can title a group before adding roles to
// it. HomeView filters them out for members at render time — see
// HomeView.tsx.
function resolveGroups(
  config: PickerConfig,
  roleList: CommunityRole[],
): WirePickerGroup[] {
  const byId = new Map(roleList.map((r) => [r.id, r]));
  return config.groups.map((g) => ({
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
  }));
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
// for any group that came in without one or with a `t.*` client temp ID.
// Throws RootServerException(INVALID_CONFIG) on any structural problem so the
// admin sees a clear error instead of a silent partial save.
//
// Returns the canonical config AND a map from each `t.*` temp ID supplied by
// the client to the freshly minted `g.*` ID we replaced it with — the client
// applies this map on save success to upgrade its local working copy in
// place, so subsequent saves don't keep churning new server-side IDs.
function validateAndNormalize(
  groups: WirePickerGroup[],
): { config: PickerConfig; idRemappings: Record<string, string> } {
  if (groups.length > LIMIT_MAX_GROUPS) {
    throw new RootServerException(
      RolePickerError.INVALID_CONFIG,
      `Too many groups (max ${LIMIT_MAX_GROUPS})`,
    );
  }

  const seenGroupIds = new Set<string>();
  const seenRoleIds = new Set<string>();
  const out: PickerGroupConfig[] = [];
  const idRemappings: Record<string, string> = {};

  for (const g of groups) {
    // Sanitize + trim user-entered text fields before validating and
    // storing. sanitize() strips ASCII control codes (NUL, BEL, etc.)
    // that could corrupt log lines, break terminal renders, or — more
    // importantly — let a hostile-or-careless paste smuggle in zero-
    // width or RTL-override characters. Trim removes leading/trailing
    // whitespace so " abc " doesn't persist verbatim. Combined: the
    // empty-title check below is meaningful for "   " inputs too.
    const title = sanitize(g.title).trim();
    const description = sanitize(g.description).trim();

    if (!title) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        "Group title is required",
      );
    }
    if (title.length > LIMIT_GROUP_TITLE_CHARS) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Group title too long (max ${LIMIT_GROUP_TITLE_CHARS})`,
      );
    }
    if (description.length > LIMIT_GROUP_DESCRIPTION_CHARS) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Group description too long (max ${LIMIT_GROUP_DESCRIPTION_CHARS})`,
      );
    }
    if (g.roles.length > LIMIT_MAX_ROLES_PER_GROUP) {
      throw new RootServerException(
        RolePickerError.INVALID_CONFIG,
        `Too many roles in group "${title}" (max ${LIMIT_MAX_ROLES_PER_GROUP})`,
      );
    }

    // Empty IDs and `t.*` client temp IDs both get a fresh server-minted
    // `g.*` ID on save. The temp-ID prefix is the client's way of
    // disambiguating multiple newly-added groups before save — see
    // Settings.tsx mintTempGroupId for the rationale.
    //
    // Asymmetry: `t.*` temp IDs get an entry in idRemappings (so the
    // client can rewrite local state to the canonical g.*); empty IDs
    // do NOT (no key to map from). In practice this sample's client
    // always uses mintTempGroupId so empty IDs never reach the server.
    // A fork that sends empty IDs from a different client surface would
    // need to refetch GetPicker after save to pick up the canonical IDs;
    // it can't reconcile from idRemappings alone.
    const isClientTemp = g.groupId.startsWith("t.");
    let groupId: string;
    if (!g.groupId) {
      groupId = mintGroupId();
    } else if (isClientTemp) {
      groupId = mintGroupId();
      idRemappings[g.groupId] = groupId;
    } else {
      groupId = g.groupId;
    }
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
      // Reject the EVERYONE role server-side. The admin Settings UI
      // already filters it out via GetAssignableRoles, but a hand-crafted
      // UpdateGroups request could otherwise persist it — the SDK would
      // reject the eventual ToggleRole anyway, but we'd render a useless
      // toggle that always fails. Belt-and-braces.
      if (r.roleId === WellKnownRootGuids.CommunityRoles.EveryoneRole) {
        throw new RootServerException(
          RolePickerError.INVALID_CONFIG,
          "@everyone role cannot be in the picker",
        );
      }
      if (seenRoleIds.has(r.roleId)) {
        throw new RootServerException(
          RolePickerError.INVALID_CONFIG,
          `Role ${r.roleId} appears in more than one group`,
        );
      }
      seenRoleIds.add(r.roleId);

      const roleDescription = sanitize(r.description).trim();
      if (roleDescription.length > LIMIT_ROLE_DESCRIPTION_CHARS) {
        throw new RootServerException(
          RolePickerError.INVALID_CONFIG,
          `Role description too long (max ${LIMIT_ROLE_DESCRIPTION_CHARS})`,
        );
      }
      roles.push({
        roleId: r.roleId as CommunityRoleGuid,
        descriptionOverride: roleDescription,
      });
    }

    out.push({
      groupId,
      title,
      description,
      exclusive: g.exclusive,
      roles,
    });
  }

  return { config: { groups: out }, idRemappings };
}

// Translate the SDK's permission-denied codes for role mutation into a
// RolePickerError(ROLE_NOT_ASSIGNABLE) with a member-actionable message.
//
// Why this matters: when the SDK rejects an assign with NoPermissionToAdd,
// the bare err.message is just "root-error" — useless to the member who
// clicked the toggle.
//
// Member message vs admin diagnostic — the message that flows back to the
// client lands in HomeView's error banner where members read it. Members
// can't edit the manifest or remove roles from the picker, so the message
// they see should be member-actionable. The technical diagnosis (Root's
// permission-subset rule, fullControl manifest declaration) belongs in
// the server log only — it's already there via withRetry's error log
// when the underlying SDK call fails. Admins reading server logs see the
// full story; members see "ask an admin."
//
// Other SDK errors (network, server, unexpected) fall through to a generic
// "couldn't be applied" message.
function assignabilityException(
  err: unknown,
  direction: "add" | "remove",
): RootServerException {
  if (err instanceof RootApiException) {
    // The subset-of-permissions hint is only correct for the ADD path
    // (Root's documented rule: "your code can only assign roles whose
    // permissions are a subset of its own"). Remove-side permission
    // failures may have other causes; we log them as plain permission
    // denials without the manifest hint to avoid misleading admins
    // chasing a fix that won't apply.
    if (
      direction === "add" &&
      err.errorCode === ErrorCodeType.NoPermissionToAdd
    ) {
      log(
        "warn",
        "role assignment rejected by SDK permission subset check",
        {
          errorCode: err.errorCode,
          hint:
            "manifest must declare a superset of the role's permissions; " +
            "for generic pickers declare community.fullControl",
        },
      );
      return new RootServerException(
        RolePickerError.ROLE_NOT_ASSIGNABLE,
        "This role can't be assigned right now. Ask an admin to remove " +
          "it from the picker if it keeps failing.",
      );
    }
    if (
      direction === "remove" &&
      (err.errorCode === ErrorCodeType.NoPermissionToDelete ||
        err.errorCode === ErrorCodeType.NoPermissionToEdit)
    ) {
      log("warn", "role removal rejected by SDK permission check", {
        errorCode: err.errorCode,
      });
      return new RootServerException(
        RolePickerError.ROLE_NOT_ASSIGNABLE,
        "Couldn't remove this role right now. Ask an admin to investigate " +
          "if it keeps failing.",
      );
    }
  }
  return new RootServerException(
    RolePickerError.ROLE_NOT_ASSIGNABLE,
    direction === "add"
      ? "Couldn't add the role. Try again in a moment."
      : "Couldn't remove the role. Try again in a moment.",
  );
}

// Per-user serialization for ToggleRole. Map<userId, Promise<unknown>>;
// each call's promise chains onto the previous one for the same user, so
// an exclusive-group check-then-act sequence can't be interleaved with
// another tab's. The map entry is cleaned up when our chain link
// resolves and is still the latest — long-running users keep one entry
// while they have requests in flight; idle users have none.
const userToggleLocks = new Map<string, Promise<unknown>>();

async function withUserLock<T>(
  userId: string,
  op: () => Promise<T>,
): Promise<T> {
  const prev = userToggleLocks.get(userId);
  // .catch swallows so a previous failure doesn't poison the chain — the
  // caller's own error handling already saw it.
  const next = (prev ? prev.catch(() => undefined) : Promise.resolve()).then(
    op,
  );
  userToggleLocks.set(userId, next);
  try {
    return await next;
  } finally {
    if (userToggleLocks.get(userId) === next) {
      userToggleLocks.delete(userId);
    }
  }
}

// Per-caller rate limit for ReportClientError. Map<userId, bucket>.
// Bucket holds {count, windowStart}; on each call, if the window has
// elapsed we reset, otherwise we increment until we hit the cap.
//
// Sized for "an ErrorBoundary fires on every render of a broken view" —
// 30/minute is enough for a real burst (a user hitting refresh after a
// crash) but cuts off a render loop within a second or two. The map
// grows with the active-user count; sweep periodically (mirrors
// leveling-leaderboard's cooldown cache eviction pattern) to bound
// memory in long-running deployments.
const ERROR_REPORT_LIMIT_PER_WINDOW = 30;
const ERROR_REPORT_WINDOW_MS = 60_000;
const ERROR_REPORT_SWEEP_INTERVAL_MS = 5 * 60_000;
interface ErrorReportBucket {
  count: number;
  windowStart: number;
  loggedDrop: boolean;
}
const errorReportBuckets = new Map<string, ErrorReportBucket>();

function checkErrorReportRate(userId: string): boolean {
  const now = Date.now();
  const bucket = errorReportBuckets.get(userId);
  if (!bucket || now - bucket.windowStart >= ERROR_REPORT_WINDOW_MS) {
    errorReportBuckets.set(userId, {
      count: 1,
      windowStart: now,
      loggedDrop: false,
    });
    return true;
  }
  if (bucket.count >= ERROR_REPORT_LIMIT_PER_WINDOW) {
    if (!bucket.loggedDrop) {
      // Single line per window — enough to know a flood happened
      // without flooding the log ourselves.
      log("warn", "client error report rate limit hit; dropping further reports this window", {
        userId,
        limit: ERROR_REPORT_LIMIT_PER_WINDOW,
        windowMs: ERROR_REPORT_WINDOW_MS,
      });
      bucket.loggedDrop = true;
    }
    return false;
  }
  bucket.count++;
  return true;
}

// Periodic sweep so the bucket map doesn't grow unboundedly with every
// user who's ever crashed. Drops buckets whose window has fully elapsed
// — those users start fresh on next report.
setInterval(() => {
  const now = Date.now();
  for (const [userId, bucket] of errorReportBuckets) {
    if (now - bucket.windowStart >= ERROR_REPORT_WINDOW_MS) {
      errorReportBuckets.delete(userId);
    }
  }
}, ERROR_REPORT_SWEEP_INTERVAL_MS).unref?.();

// Strip ASCII control characters from admin-supplied strings before they
// hit the KV store. The trimmed-and-validated path catches whitespace and
// length, but a paste that includes NUL, vertical tab, or DEL would still
// persist and re-render with weird breakage. Defence in depth — admin
// input is implicitly trusted (they passed requireAdmin), but a careless
// paste shouldn't leave trace artefacts in the picker UI for everyone
// else. Doesn't strip zero-width / RTL-override characters; if those
// matter for a deployment, extend the regex.
function sanitize(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F]/g, "");
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

export const rolePickerService = new RolePickerService();
