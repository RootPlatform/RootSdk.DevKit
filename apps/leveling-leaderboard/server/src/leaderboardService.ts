import {
  Client,
  ChannelGuid,
  CommunityRoleGuid,
  UserGuid,
  RootGuidUtils,
  RootGuidType,
  RootServerException,
} from "@rootsdk/server-app";
import {
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  GetMyStatsRequest,
  GetMyStatsResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  UpdateScoringSettingsRequest,
  UpdateScoringSettingsResponse,
  UpdateExcludedChannelsRequest,
  UpdateExcludedChannelsResponse,
  UpdateXpEligibleMembersRequest,
  UpdateXpEligibleMembersResponse,
  GetChannelTreeRequest,
  GetChannelTreeResponse,
  ResetMemberXpRequest,
  ResetMemberXpResponse,
  ResetAllXpRequest,
  ResetAllXpResponse,
  ReportClientErrorRequest,
  ReportClientErrorResponse,
  LeaderboardError,
} from "@levelingleaderboard/gen-shared";
import { LeaderboardServiceBase } from "@levelingleaderboard/gen-server";
import { Database, getDb, transaction } from "./db";
import {
  getTop,
  getRank,
  resetMember,
  resetAll,
} from "./xpStore";
import {
  listRecentAwards,
  deleteForUser,
  deleteAll as deleteAllAwards,
} from "./awardHistoryStore";
import {
  getSettings as getAppSettings,
  updateSettings as updateAppSettings,
  AppSettings,
} from "./appSettingsStore";
import {
  listExcludedChannels,
  replaceExcludedChannels,
} from "./excludedChannelsStore";
import { isAdmin, getAdminsGroup } from "./adminCheck";
import {
  readSelection as readXpEligibleSelection,
  replaceMembership as replaceXpEligibleMembership,
} from "./xpEligibleGroup";
import { buildChannelTree } from "./channelTree";
import { markDirty, broadcastAllReset } from "./leaderboardBroadcaster";
import { clearCooldownFor, clearAllCooldowns } from "./messageHandler";
import { computeLevel, progressToNextLevel } from "./level";
import { getChannelName } from "./channelNameCache";
import { log } from "./lib/log";
import { safeBroadcast } from "./lib/safeBroadcast";

// ============================================================================
// LeaderboardService — the RPC surface from leaderboard_service.proto.
//
// Admin-only RPCs call `await this.requireAdmin(client)` which throws
// RootServerException(NOT_ADMIN) on non-admins. Admin status is resolved
// against (owner || globalSettings.general.admins MemberGroup); see
// adminCheck.ts.
//
// Scoring settings, excluded channels, and XP-eligible members are SEPARATE
// RPCs so concurrent admin edits to different Settings tabs don't stomp each
// other.
//
// Broadcast fan-out rules:
//   - MemberXpChanged:    "all"; clients filter by userId (see DESIGN.md)
//   - LeaderboardUpdated: "all", coalesced via leaderboardBroadcaster
//   - SettingsUpdated:    admin-only (the admins ReadOnlyMemberGroup); payload
//                         carries settings / excluded channels / xp-eligible
//                         members selection, all of which are gated behind
//                         GetSettings at the RPC layer.
//   - AdminsChanged:      "all"; empty payload. Fires when globalSettings
//                         admins change so every client can re-fetch
//                         GetLeaderboard and refresh amIAdmin.
// ============================================================================

// Limits per DESIGN.md Appendix → Limits. Server is the single source of
// truth — these values are shipped to the client via GetSettingsResponse.limits
// (see getSettings()), so the client's NumberInput bounds stay locked to
// whatever we decide here.
const LIMIT_XP_MIN = 1;
const LIMIT_XP_MAX = 1000;
const LIMIT_COOLDOWN_MIN = 0;
const LIMIT_COOLDOWN_MAX = 3600;
const LIMIT_CURVE_MIN = 10;
const LIMIT_CURVE_MAX = 10000;
const LIMIT_RECENT_AWARDS = 20;
const LIMIT_LEADERBOARD_TOP = 10;
// Caps on admin-supplied payload sizes. Even though admins are trusted, an
// unbounded loop on a buggy or malicious caller's input could pin the request
// handler for seconds. Picked generously above any realistic community shape.
const LIMIT_EXCLUDED_CHANNELS = 1000;
const LIMIT_XP_ELIGIBLE_USERS = 10000;
const LIMIT_XP_ELIGIBLE_ROLES = 200;
// Caps on client error report payloads. An ErrorBoundary fires once per crash
// so flooding is unlikely, but client-side bugs that loop calling report would
// otherwise log unbounded stack strings. Truncate at the handler.
const LIMIT_ERROR_LABEL_CHARS = 100;
const LIMIT_ERROR_MESSAGE_CHARS = 2000;
const LIMIT_ERROR_STACK_CHARS = 8000;
const LIMIT_ERROR_USER_AGENT_CHARS = 500;

export class LeaderboardService extends LeaderboardServiceBase {
  // --- Public RPCs ---------------------------------------------------------

  async getLeaderboard(
    _request: GetLeaderboardRequest,
    client: Client,
  ): Promise<GetLeaderboardResponse> {
    const db = getDb();
    // settings, top, and amIAdmin are independent — fetch in parallel rather
    // than serial. Three round trips one-after-the-other adds latency for
    // every leaderboard load (initial mount + every refetch).
    const [settings, top, amIAdmin] = await Promise.all([
      getAppSettings(db),
      getTop(db, LIMIT_LEADERBOARD_TOP),
      isAdmin(client.userId),
    ]);
    const entries = top.map((row, i) => ({
      userId: row.userId,
      rank: i + 1,
      level: computeLevel(row.totalXp, settings.levelCurveCoefficient),
      totalXp: row.totalXp,
    }));
    return { entries, amIAdmin };
  }

  async getMyStats(
    _request: GetMyStatsRequest,
    client: Client,
  ): Promise<GetMyStatsResponse> {
    const db = getDb();
    const settings = await getAppSettings(db);
    const rankInfo = await getRank(db, client.userId);

    const totalXp = rankInfo?.totalXp ?? 0;
    const level = computeLevel(totalXp, settings.levelCurveCoefficient);
    const progress = progressToNextLevel(totalXp, settings.levelCurveCoefficient);

    const awards = await listRecentAwards(db, client.userId, LIMIT_RECENT_AWARDS);
    // Channel names come from the in-memory cache — no SDK calls here.
    const recentAwards = awards.map((a) => ({
      // Proto int64 fields → bigint in TS. Our DB columns are INTEGER which
      // sqlite3 returns as JS number; widen here.
      id: BigInt(a.id),
      channelId: a.channelId,
      channelName: getChannelName(a.channelId),
      timestamp: BigInt(a.timestamp),
      amount: a.amount,
    }));

    return {
      totalXp,
      level,
      rank: rankInfo?.rank ?? 0,
      progressToNextLevel: progress,
      recentAwards,
    };
  }

  // --- Admin RPCs ----------------------------------------------------------

  async getSettings(
    _request: GetSettingsRequest,
    client: Client,
  ): Promise<GetSettingsResponse> {
    await this.requireAdmin(client);
    const db = getDb();
    const settings = await getAppSettings(db);
    const excluded = await listExcludedChannels(db);
    const xpEligibleMembers = readXpEligibleSelection();
    // Server is single source of truth for validation bounds. Client reads
    // these directly into its NumberInput min/max props.
    const limits = {
      xpPerMessageMin: LIMIT_XP_MIN,
      xpPerMessageMax: LIMIT_XP_MAX,
      cooldownSecondsMin: LIMIT_COOLDOWN_MIN,
      cooldownSecondsMax: LIMIT_COOLDOWN_MAX,
      levelCurveCoefficientMin: LIMIT_CURVE_MIN,
      levelCurveCoefficientMax: LIMIT_CURVE_MAX,
    };
    return {
      settings,
      excludedChannelIds: excluded,
      limits,
      xpEligibleMembers,
    };
  }

  async updateScoringSettings(
    request: UpdateScoringSettingsRequest,
    client: Client,
  ): Promise<UpdateScoringSettingsResponse> {
    await this.requireAdmin(client);
    const db = getDb();

    if (!request.settings) {
      throw new RootServerException(
        LeaderboardError.INVALID_SETTINGS,
        "Settings required",
      );
    }
    validateSettings(request.settings);

    await updateAppSettings(db, {
      xpPerMessage: request.settings.xpPerMessage,
      cooldownSeconds: request.settings.cooldownSeconds,
      levelCurveCoefficient: request.settings.levelCurveCoefficient,
    });

    log("info", "scoring settings updated", {
      by: client.userId,
      xpPerMessage: request.settings.xpPerMessage,
      cooldownSeconds: request.settings.cooldownSeconds,
      levelCurveCoefficient: request.settings.levelCurveCoefficient,
    });

    await this.broadcastSettingsSnapshot(client);
    return {};
  }

  async updateExcludedChannels(
    request: UpdateExcludedChannelsRequest,
    client: Client,
  ): Promise<UpdateExcludedChannelsResponse> {
    await this.requireAdmin(client);
    const db = getDb();

    if (request.excludedChannelIds.length > LIMIT_EXCLUDED_CHANNELS) {
      throw new RootServerException(
        LeaderboardError.INVALID_SETTINGS,
        `Too many channels (max ${LIMIT_EXCLUDED_CHANNELS})`,
      );
    }

    await replaceExcludedChannels(db, request.excludedChannelIds as ChannelGuid[]);

    log("info", "excluded channels updated", {
      by: client.userId,
      count: request.excludedChannelIds.length,
    });

    await this.broadcastSettingsSnapshot(client);
    return {};
  }

  async updateXpEligibleMembers(
    request: UpdateXpEligibleMembersRequest,
    client: Client,
  ): Promise<UpdateXpEligibleMembersResponse> {
    await this.requireAdmin(client);

    const members = request.members;
    if (!members) {
      throw new RootServerException(
        LeaderboardError.INVALID_SETTINGS,
        "Members required",
      );
    }

    if (members.userIds.length > LIMIT_XP_ELIGIBLE_USERS) {
      throw new RootServerException(
        LeaderboardError.INVALID_SETTINGS,
        `Too many user IDs (max ${LIMIT_XP_ELIGIBLE_USERS})`,
      );
    }
    if (members.communityRoleIds.length > LIMIT_XP_ELIGIBLE_ROLES) {
      throw new RootServerException(
        LeaderboardError.INVALID_SETTINGS,
        `Too many role IDs (max ${LIMIT_XP_ELIGIBLE_ROLES})`,
      );
    }

    // Defence in depth: the client filters apps from the picker, but if a
    // hostile caller passes an app GUID, reject before writing. MemberGroup
    // itself doesn't enforce Person-only — that's our XP-specific rule.
    for (const id of members.userIds) {
      if (RootGuidUtils.toRootGuidType(id) !== RootGuidType.Person) {
        throw new RootServerException(
          LeaderboardError.MEMBER_NOT_FOUND,
          "Apps are not eligible for XP",
        );
      }
    }

    await replaceXpEligibleMembership({
      userIds: members.userIds as UserGuid[],
      communityRoleIds: members.communityRoleIds as CommunityRoleGuid[],
    });

    log("info", "xp-eligible members updated", {
      by: client.userId,
      userCount: members.userIds.length,
      roleCount: members.communityRoleIds.length,
    });

    await this.broadcastSettingsSnapshot(client);
    return {};
  }

  async getChannelTree(
    _request: GetChannelTreeRequest,
    client: Client,
  ): Promise<GetChannelTreeResponse> {
    await this.requireAdmin(client);
    const db = getDb();
    const groups = await buildChannelTree(db);
    return {
      groups: groups.map((g) => ({
        channelGroupId: g.channelGroupId,
        name: g.name,
        channels: g.channels.map((c) => ({
          channelId: c.channelId,
          name: c.name,
          excluded: c.excluded,
        })),
      })),
    };
  }

  async resetMemberXp(
    request: ResetMemberXpRequest,
    client: Client,
  ): Promise<ResetMemberXpResponse> {
    await this.requireAdmin(client);
    validateUserId(request.userId);
    const db = getDb();

    const wasInTop = await memberIsInTop10(db, request.userId as UserGuid);

    // Atomic reset — if we crashed between the two deletes, orphan award rows
    // would remain. Low-impact (they'd prune naturally) but inconsistent with
    // the rest of the admin mutations that ARE transactional.
    await transaction(db, async () => {
      await resetMember(db, request.userId as UserGuid);
      await deleteForUser(db, request.userId as UserGuid);
    });
    // Drop the in-memory cooldown entry for this user — otherwise a stale
    // timestamp from before the reset would block them from earning XP for
    // up to `cooldownSeconds`. See messageHandler.
    clearCooldownFor(request.userId as UserGuid);

    log("info", "member XP reset", { by: client.userId, userId: request.userId });

    // MemberXpChanged to "all"; clients filter by userId. See messageHandler
    // for the audience rationale. `award` is omitted — proto3 message fields
    // are optional and default to unset, which the client reads as "reset,
    // clear awards".
    await safeBroadcast("MemberXpChanged(reset)", () =>
      this.broadcastMemberXpChanged(
        {
          userId: request.userId,
          totalXp: 0,
          level: 0,
          rank: 0,
          progressToNextLevel: 0,
        },
        "all",
      ),
    );

    if (wasInTop) markDirty();
    return {};
  }

  async resetAllXp(
    _request: ResetAllXpRequest,
    client: Client,
  ): Promise<ResetAllXpResponse> {
    await this.requireAdmin(client);
    const db = getDb();
    // Atomic wipe — same consistency rationale as resetMemberXp.
    await transaction(db, async () => {
      await resetAll(db);
      await deleteAllAwards(db);
    });
    // Drop every in-memory cooldown entry — otherwise any user with a stale
    // timestamp would be blocked from earning XP after their row was wiped.
    clearAllCooldowns();
    log("warn", "ALL member XP reset", { by: client.userId });
    await safeBroadcast("LeaderboardUpdated(allReset)", () =>
      broadcastAllReset(),
    );
    return {};
  }

  // --- Client telemetry ----------------------------------------------------

  // Funnel client-side render errors caught by ErrorBoundary into the server
  // log. Truncates each field defensively so a runaway client loop can't
  // spam unbounded stack strings into our log aggregator.
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

  // --- Internal broadcasts --------------------------------------------------

  // Called from the adminCheck onAdminsChanged hook when globalSettings
  // admins shift. Fires AdminsChanged (empty event) to "all" so every client
  // re-fetches GetLeaderboard and picks up its new amIAdmin. No snapshot
  // payload is sent — the admin-only settings snapshot would leak user/role
  // IDs to non-admins (see the SettingsUpdated split rationale in the class
  // header). The bare event is the entire signal; each client decides what
  // to do with it.
  async notifyAdminsChanged(): Promise<void> {
    await safeBroadcast("AdminsChanged", () =>
      this.broadcastAdminsChanged({}, "all"),
    );
  }

  // --- Helpers -------------------------------------------------------------

  private async requireAdmin(client: Client): Promise<void> {
    const ok = await isAdmin(client.userId);
    if (!ok) {
      throw new RootServerException(LeaderboardError.NOT_ADMIN, "Admin only");
    }
  }

  // Broadcasts the latest settings snapshot to the admin audience ONLY. The
  // payload carries data (xpEligibleMembers user/role IDs, excluded channels,
  // scoring settings) that GetSettings refuses to serve to non-admins, so
  // the corresponding broadcast must be gated too — otherwise every connected
  // client would receive what GetSettings would deny them.
  //
  // Audience: the admins ReadOnlyMemberGroup from globalSettings.general.admins.
  // Known edge case: the community owner is an implicit admin (per adminCheck),
  // but if they're not in the admins group they won't receive this broadcast.
  // In normal operation the owner IS in the group; when they aren't, a
  // Settings view they have open on another device will just miss the live
  // update and refresh on next fetch. Acceptable trade-off for the privacy
  // guarantee.
  //
  // If adminsGroup is undefined (transient startup state, or admins not yet
  // configured in globalSettings), we skip entirely — the only admin is the
  // owner, they're the one who just saved, and no other admin session exists
  // to notify.
  //
  // `except` is the admin who caused the change — their client already has
  // the new values from the RPC response; re-delivering would trip their
  // Settings view's stale-data banner for their own save.
  private async broadcastSettingsSnapshot(except: Client): Promise<void> {
    const admins = getAdminsGroup();
    if (!admins) return;
    const db = getDb();
    const settings = await getAppSettings(db);
    const excluded = await listExcludedChannels(db);
    const xpEligibleMembers = readXpEligibleSelection();
    await safeBroadcast("SettingsUpdated", () =>
      this.broadcastSettingsUpdated(
        {
          settings,
          excludedChannelIds: excluded,
          xpEligibleMembers,
        },
        admins,
        except,
      ),
    );
  }

}

// --- Helpers (module-scope) -----------------------------------------------

function validateSettings(s: AppSettings): void {
  if (s.xpPerMessage < LIMIT_XP_MIN || s.xpPerMessage > LIMIT_XP_MAX) {
    throw new RootServerException(
      LeaderboardError.INVALID_SETTINGS,
      `XP per message must be ${LIMIT_XP_MIN}–${LIMIT_XP_MAX}`,
    );
  }
  if (s.cooldownSeconds < LIMIT_COOLDOWN_MIN || s.cooldownSeconds > LIMIT_COOLDOWN_MAX) {
    throw new RootServerException(
      LeaderboardError.INVALID_SETTINGS,
      `Cooldown must be ${LIMIT_COOLDOWN_MIN}–${LIMIT_COOLDOWN_MAX} seconds`,
    );
  }
  if (s.levelCurveCoefficient < LIMIT_CURVE_MIN || s.levelCurveCoefficient > LIMIT_CURVE_MAX) {
    throw new RootServerException(
      LeaderboardError.INVALID_SETTINGS,
      `Level curve must be ${LIMIT_CURVE_MIN}–${LIMIT_CURVE_MAX}`,
    );
  }
}

async function memberIsInTop10(db: Database, userId: UserGuid): Promise<boolean> {
  const top = await getTop(db, LIMIT_LEADERBOARD_TOP);
  return top.some((r) => r.userId === userId);
}

// Cap a string to `max` code points (not UTF-16 code units), appending an
// ellipsis marker when truncated. Used by the telemetry handler to bound log
// line size.
//
// Why code-point aware: `String.prototype.slice` cuts at UTF-16 code units,
// which can land halfway through a surrogate pair for astral characters
// (emoji, some CJK ideographs, mathematical symbols). The resulting lone
// surrogate is not valid UTF-8, and some log pipelines will either drop the
// whole line or replace the half-character with U+FFFD. `Array.from(s)`
// iterates by code point so a slice-then-join is always valid output.
//
// Cost: O(n) allocation of the intermediate array. The inputs we truncate
// are capped at ~8KB (error stacks), so this is negligible and runs at most
// once per client error report — not on the hot path.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const codePoints = Array.from(s);
  if (codePoints.length <= max) return s;
  return codePoints.slice(0, max).join("") + "…[truncated]";
}

// Rejects garbage input (channel IDs, random strings) that a buggy or hostile
// client might pass where a user ID is expected. Cheap insurance against
// trying to reset a non-user entity.
function validateUserId(userId: string): void {
  // RootGuidType.Person = humans. RootGuidType.App = bots/apps. We want humans.
  if (RootGuidUtils.toRootGuidType(userId) !== RootGuidType.Person) {
    throw new RootServerException(
      LeaderboardError.MEMBER_NOT_FOUND,
      "Invalid user ID",
    );
  }
}

export const leaderboardService = new LeaderboardService();
