import {
  Client,
  UserGuid,
  ChannelGuid,
  CommunityRole,
  RootGuidConverter,
  RootGuidType,
  RootServerException,
  RootApiException,
  MessageGuid,
  rootServer,
} from "@rootsdk/server-app";
import {
  GetDashboardRequest,
  GetDashboardResponse,
  GetAnalyticsRequest,
  GetAnalyticsResponse,
  AnalyticsRange,
  GetSettingsRequest,
  GetSettingsResponse,
  GetAmIAdminRequest,
  GetAmIAdminResponse,
  SetContentFilterEnabledRequest,
  SetFilterSlursRequest,
  SetFilterProfanityRequest,
  SetFilterCustomWordsRequest,
  SetContentFilterWarnUsersRequest,
  SetSpamEnabledRequest,
  SetSpamThresholdRequest,
  SetSpamWindowRequest,
  SetSpamScopeRequest,
  SetSpamWarnUsersRequest,
  SetRateLimitEnabledRequest,
  SetRateLimitMaxRequest,
  SetRateLimitWindowRequest,
  SetRetentionDaysRequest,
  SetUsernameFilterEnabledRequest,
  SetUrlFilterEnabledRequest,
  SetUrlFilterModeRequest,
  SetUrlFilterBlockRootInvitesRequest,
  SetUrlFilterWarnUsersRequest,
  SetNewMemberGateEnabledRequest,
  SetNewMemberGateMinMinutesRequest,
  SetNewMemberGateWarnUsersRequest,
  SetMentionSpamEnabledRequest,
  SetMentionSpamMaxMentionsRequest,
  SetMentionSpamWarnUsersRequest,
  SetSettingsFieldResponse,
  UrlFilterMode,
  UpdateMonitoredChannelsRequest,
  UpdateMonitoredChannelsResponse,
  ReportClientErrorRequest,
  ReportClientErrorResponse,
  ListWordsRequest,
  ListWordsResponse,
  AddWordRequest,
  AddWordResponse,
  SetWordEnabledRequest,
  SetWordEnabledResponse,
  RemoveWordRequest,
  RemoveWordResponse,
  ImportWordsRequest,
  ImportWordsResponse,
  ListAuditLogRequest,
  ListAuditLogResponse,
  GetMemberSummaryRequest,
  GetMemberSummaryResponse,
  DeleteMessageManualRequest,
  DeleteMessageManualResponse,
  KickMemberRequest,
  KickMemberResponse,
  BanMemberRequest,
  BanMemberResponse,
  UnbanMemberRequest,
  UnbanMemberResponse,
  ListBannedMembersRequest,
  ListBannedMembersResponse,
  ClearAuditLogRequest,
  ClearAuditLogResponse,
  ModerationError,
  ActionType,
  RuleType,
  WordCategory,
  AuditEntry,
  Channel,
  ChannelGroup,
  Word,
  SpamScope,
} from "@moderation/gen-shared";
import { ModerationServiceBase } from "@moderation/gen-server";
import { getDb } from "./db";
import {
  getContentFilter,
  setContentFilterEnabled,
  setFilterSlurs,
  setFilterProfanity,
  setFilterCustomWords,
  setContentFilterWarnUsers,
  getSpamControl,
  setSpamEnabled,
  setSpamThreshold,
  setSpamWindow,
  setSpamScope,
  setSpamWarnUsers,
  getRateLimit,
  setRateLimitEnabled,
  setRateLimitMax,
  setRateLimitWindow,
  getGeneral,
  setRetentionDays,
  getUsernameFilter,
  setUsernameFilterEnabled,
  getUrlFilter,
  setUrlFilterEnabled,
  setUrlFilterMode,
  setUrlFilterBlockRootInvites,
  setUrlFilterWarnUsers,
  getNewMemberGate,
  setNewMemberGateEnabled,
  setNewMemberGateMinMinutes,
  setNewMemberGateWarnUsers,
  getMentionSpam,
  setMentionSpamEnabled,
  setMentionSpamMaxMentions,
  setMentionSpamWarnUsers,
} from "./settingsStore";
import {
  listMonitored,
  replaceMonitored,
} from "./monitoredChannelsStore";
import {
  addWord as storeAddWord,
  setWordEnabled as storeSetWordEnabled,
  removeWord as storeRemoveWord,
  listWords as storeListWords,
  importWords as storeImportWords,
  ImportTooLargeError,
  countWords,
  totalCount,
} from "./wordListStore";
import {
  list as listAudit,
  count as countAudit,
  countSince,
  recent as recentAudit,
  bucketize,
  topChannels as auditTopChannels,
  encodeCursor as encodeAuditCursor,
  decodeCursor as decodeAuditCursor,
  deleteAll as deleteAllAudit,
  memberSummary as auditMemberSummary,
  AuditEntryRow,
} from "./auditLogStore";
import { onAuditEntry } from "./auditDispatch";
import { isAdmin, requireAdmin } from "./adminCheck";
import { getAdminAudience } from "./adminAudience";
import { readExemptSelection } from "./exemptMembers";
import { resolveNickname } from "./memberCache";
import { moderationSdkQueue } from "./lib/sdkQueue";
import { getChannelName, getChannelTree } from "./channelNameCache";
import { log, errFields } from "./lib/log";
import { safeBroadcast } from "./lib/safeBroadcast";

// ModerationService — RPC surface for the moderation app.

// Server-side validation bounds (per design.md "Limits").
const SPAM_THRESHOLD_MIN = 2;
const SPAM_THRESHOLD_MAX = 100;
const SPAM_WINDOW_MIN_MIN = 1;
const SPAM_WINDOW_MIN_MAX = 1440;
const RATE_MAX_MESSAGES_MIN = 3;
const RATE_MAX_MESSAGES_MAX = 50;
const RATE_WINDOW_SECONDS_MIN = 5;
const RATE_WINDOW_SECONDS_MAX = 120;
const RETENTION_DAYS_MIN = 7;
const RETENTION_DAYS_MAX = 365;
const WORD_MAX_LENGTH = 100;
const NEW_MEMBER_GATE_MIN_MINUTES_MIN = 1;
const NEW_MEMBER_GATE_MIN_MINUTES_MAX = 10080; // 7 days
const MENTION_SPAM_MAX_MENTIONS_MIN = 1;
const MENTION_SPAM_MAX_MENTIONS_MAX = 50;

// Cap on admin-supplied reason text on manual actions (delete, kick,
// ban, unban). 500 chars is generous for a moderation note while
// keeping the audit excerpt column from accepting unbounded input.
// Client UIs render a textarea with the same maxLength, but the server
// validates regardless — defence against malformed or out-of-band
// callers.
const REASON_MAX_LENGTH = 500;
// Per-import entry cap. Tested admins importing realistic moderation
// lists (a few hundred words) fit well under this; pathological payloads
// trying to overload the server with millions of entries get rejected.
const IMPORT_MAX_ENTRIES = 1000;

// Canonical phrase the user must type to confirm an audit-log clear. Match
// is case-insensitive + trim — the UI lowercases its input pre-compare so
// the server check is exact, but server-side normalization here defends
// against a malformed or out-of-band caller.
const CLEAR_AUDIT_LOG_PHRASE = "clear audit log";

const DASHBOARD_RECENT_LIMIT = 20;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const TOP_CHANNELS_LIMIT = 5;

// Per-admin rate limit on manual moderation actions (delete-message,
// kick, ban). The platform enforces a per-app command quota (~5/s)
// already; this layer mirrors that PER ADMIN so a single admin session
// can't rapid-fire actions and starve other admins of their share. Same
// rolling-window shape as the client-error report rate limiter below;
// see checkManualActionRate.
const LIMIT_MANUAL_ACTIONS_PER_MIN = 30;
const MANUAL_ACTION_WINDOW_MS = 60_000;

// Caps on client error report payloads. ErrorBoundary fires once per crash
// so flooding is unlikely, but a render-loop boundary could otherwise log
// unbounded stack strings.
const LIMIT_ERROR_LABEL_CHARS = 100;
const LIMIT_ERROR_MESSAGE_CHARS = 2000;
const LIMIT_ERROR_STACK_CHARS = 8000;
const LIMIT_ERROR_USER_AGENT_CHARS = 500;
const LIMIT_REPORTS_PER_MIN = 5;
const REPORT_WINDOW_MS = 60_000;

export class ModerationService extends ModerationServiceBase {
  // --- Public RPCs ---------------------------------------------------------

  async getDashboard(
    _request: GetDashboardRequest,
    client: Client,
  ): Promise<GetDashboardResponse> {
    const db = getDb();
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const [total, contentCount, manualCount, recent, amIAdmin, monitoredIds] =
      await Promise.all([
        countSince(db, since),
        countSince(db, since, RuleType.CONTENT_FILTER),
        countSince(db, since, undefined, true),
        recentAudit(db, DASHBOARD_RECENT_LIMIT),
        isAdmin(client.userId),
        listMonitored(db),
      ]);
    // Empty monitored set = "monitor all channels" per design.md. Resolve
    // names through the in-memory cache; callers render the result via
    // <MonitoredChannelsPanel>.
    const monitoringAll = monitoredIds.length === 0;
    const monitoredChannelNames = monitoredIds.map((id) =>
      getChannelName(id as ChannelGuid),
    );
    return {
      summary: {
        totalActions24H: total,
        contentFiltered24H: contentCount,
        manualActions24H: manualCount,
      },
      recent: recent.map(toAuditProto),
      amIAdmin,
      monitoredChannelNames,
      monitoringAll,
    };
  }

  async getAnalytics(
    request: GetAnalyticsRequest,
    _client: Client,
  ): Promise<GetAnalyticsResponse> {
    const db = getDb();
    const range = request.range || AnalyticsRange.LAST_24H;
    const { sinceMs, bucketMs } = analyticsWindow(range);
    const [buckets, top] = await Promise.all([
      bucketize(db, sinceMs, bucketMs),
      auditTopChannels(db, sinceMs, TOP_CHANNELS_LIMIT),
    ]);

    const bucketMap = new Map<
      number,
      {
        contentFilter: number;
        spam: number;
        rateLimit: number;
        manual: number;
      }
    >();
    let total = 0;
    let contentTotal = 0;
    let spamTotal = 0;
    let rateTotal = 0;
    let manualTotal = 0;
    for (const row of buckets) {
      const existing = bucketMap.get(row.bucket) ?? {
        contentFilter: 0,
        spam: 0,
        rateLimit: 0,
        manual: 0,
      };
      total += row.n;
      if (row.manual) {
        existing.manual += row.n;
        manualTotal += row.n;
      } else if (row.rule === RuleType.CONTENT_FILTER) {
        existing.contentFilter += row.n;
        contentTotal += row.n;
      } else if (row.rule === RuleType.SPAM_DETECTION) {
        existing.spam += row.n;
        spamTotal += row.n;
      } else if (row.rule === RuleType.RATE_LIMIT) {
        existing.rateLimit += row.n;
        rateTotal += row.n;
      } else {
        existing.manual += row.n;
        manualTotal += row.n;
      }
      bucketMap.set(row.bucket, existing);
    }

    // Fill empty buckets so the chart x-axis is contiguous.
    const filled: { bucket: number; data: typeof bucketMap extends Map<number, infer V> ? V : never }[] = [];
    for (let t = sinceMs; t < Date.now(); t += bucketMs) {
      const aligned = Math.floor(t / bucketMs) * bucketMs;
      const data = bucketMap.get(aligned) ?? {
        contentFilter: 0,
        spam: 0,
        rateLimit: 0,
        manual: 0,
      };
      filled.push({ bucket: aligned, data });
    }

    return {
      total,
      contentFilterTotal: contentTotal,
      spamTotal,
      rateLimitTotal: rateTotal,
      manualTotal,
      buckets: filled.map((b) => ({
        timestamp: BigInt(b.bucket),
        contentFilter: b.data.contentFilter,
        spam: b.data.spam,
        rateLimit: b.data.rateLimit,
        manual: b.data.manual,
      })),
      topChannels: top.map((c) => ({
        channelId: c.channelId,
        channelName: getChannelName(c.channelId),
        count: c.count,
      })),
    };
  }

  async getAmIAdmin(
    _request: GetAmIAdminRequest,
    client: Client,
  ): Promise<GetAmIAdminResponse> {
    return { amIAdmin: await isAdmin(client.userId) };
  }

  // Funnels client-side render errors caught by ErrorBoundary into the
  // server's structured log. Truncates each field defensively so a runaway
  // boundary can't spam unbounded stack strings; rejects oversized requests
  // (10× truncate cap) outright so per-request memory stays bounded.
  // Per-caller rate limit drops calls above LIMIT_REPORTS_PER_MIN.
  async reportClientError(
    request: ReportClientErrorRequest,
    client: Client,
  ): Promise<ReportClientErrorResponse> {
    if (
      request.label.length > LIMIT_ERROR_LABEL_CHARS * 10 ||
      request.message.length > LIMIT_ERROR_MESSAGE_CHARS * 10 ||
      request.stack.length > LIMIT_ERROR_STACK_CHARS * 10 ||
      request.userAgent.length > LIMIT_ERROR_USER_AGENT_CHARS * 10
    ) {
      log("warn", "client error report dropped: oversized field", {
        userId: client.userId,
        labelLen: request.label.length,
        messageLen: request.message.length,
        stackLen: request.stack.length,
        userAgentLen: request.userAgent.length,
      });
      return {};
    }
    if (!checkReportRate(client.userId)) {
      // Silently drop — no point telling a render-loop boundary that it's
      // spamming us; doing so would be one more thing for it to throw on.
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

  // --- Admin RPCs ----------------------------------------------------------

  async getSettings(
    _request: GetSettingsRequest,
    client: Client,
  ): Promise<GetSettingsResponse> {
    await requireAdmin(client);
    const db = getDb();
    const [
      content,
      spam,
      rate,
      general,
      usernameFilter,
      urlFilter,
      newMemberGate,
      mentionSpam,
      monitored,
      customCount,
      allowedCount,
      urlDomainCount,
    ] = await Promise.all([
      getContentFilter(),
      getSpamControl(),
      getRateLimit(),
      getGeneral(),
      getUsernameFilter(),
      getUrlFilter(),
      getNewMemberGate(),
      getMentionSpam(),
      listMonitored(db),
      totalCount(db, WordCategory.CUSTOM),
      totalCount(db, WordCategory.ALLOWED),
      totalCount(db, WordCategory.URL_DOMAIN),
    ]);
    const tree = getChannelTree();
    const monitoredSet = new Set<string>(monitored);
    const exemptSelection = readExemptSelection();
    // Resolve role IDs → {id, name, colorHex} for the General tab Pills.
    // Done inside GetSettings (an admin-only, low-frequency RPC) so the
    // client doesn't need a separate roles lookup. .list() is one round
    // trip and roles are bounded; cheaper than a parallel client RPC.
    const exemptRoles = exemptSelection.communityRoleIds.length
      ? await resolveRoleSummaries(exemptSelection.communityRoleIds)
      : [];
    const channelTree: ChannelGroup[] = tree.map((g) => ({
      channelGroupId: g.channelGroupId,
      name: g.name,
      channels: g.channels.map<Channel>((c) => ({
        channelId: c.channelId,
        name: c.name,
        // monitored=true when the set is empty (all monitored) OR the
        // channel is explicitly in the set.
        monitored: monitoredSet.size === 0 || monitoredSet.has(c.channelId),
      })),
    }));
    return {
      contentFilter: content,
      spamControl: spam,
      rateLimit: rate,
      general,
      monitored: { channelIds: monitored },
      limits: {
        spamThresholdMin: SPAM_THRESHOLD_MIN,
        spamThresholdMax: SPAM_THRESHOLD_MAX,
        spamWindowMinutesMin: SPAM_WINDOW_MIN_MIN,
        spamWindowMinutesMax: SPAM_WINDOW_MIN_MAX,
        rateLimitMaxMessagesMin: RATE_MAX_MESSAGES_MIN,
        rateLimitMaxMessagesMax: RATE_MAX_MESSAGES_MAX,
        rateLimitWindowSecondsMin: RATE_WINDOW_SECONDS_MIN,
        rateLimitWindowSecondsMax: RATE_WINDOW_SECONDS_MAX,
        retentionDaysMin: RETENTION_DAYS_MIN,
        retentionDaysMax: RETENTION_DAYS_MAX,
        wordMaxLength: WORD_MAX_LENGTH,
        newMemberGateMinMinutesMin: NEW_MEMBER_GATE_MIN_MINUTES_MIN,
        newMemberGateMinMinutesMax: NEW_MEMBER_GATE_MIN_MINUTES_MAX,
        mentionSpamMaxMentionsMin: MENTION_SPAM_MAX_MENTIONS_MIN,
        mentionSpamMaxMentionsMax: MENTION_SPAM_MAX_MENTIONS_MAX,
      },
      channelTree,
      customWordCount: customCount,
      allowedWordCount: allowedCount,
      exempt: {
        userIds: [...exemptSelection.userIds],
        roles: exemptRoles,
      },
      usernameFilter,
      urlFilter,
      urlDomainCount,
      newMemberGate,
      mentionSpam,
    };
  }

  // --- Per-field setters --------------------------------------------------
  //
  // Concurrent admin edits to different fields of the same settings group
  // don't stomp each other because each setter writes through
  // dataStore.appData.update() (atomic merge). Range-checked fields throw
  // ModerationError.INVALID_SETTINGS on out-of-range values; the client's
  // NumberInput min/max are UX, not enforcement (see rangeError below).

  async setContentFilterEnabled(
    request: SetContentFilterEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setContentFilterEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setFilterSlurs(
    request: SetFilterSlursRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setFilterSlurs(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setFilterProfanity(
    request: SetFilterProfanityRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setFilterProfanity(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setFilterCustomWords(
    request: SetFilterCustomWordsRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setFilterCustomWords(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setContentFilterWarnUsers(
    request: SetContentFilterWarnUsersRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setContentFilterWarnUsers(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setSpamEnabled(
    request: SetSpamEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setSpamEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setSpamThreshold(
    request: SetSpamThresholdRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.threshold,
      SPAM_THRESHOLD_MIN,
      SPAM_THRESHOLD_MAX,
      `Threshold must be ${SPAM_THRESHOLD_MIN}-${SPAM_THRESHOLD_MAX}`,
    );
    await setSpamThreshold(request.threshold);
    await this.notifySettingsChanged();
    return {};
  }

  async setSpamWindow(
    request: SetSpamWindowRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.windowMinutes,
      SPAM_WINDOW_MIN_MIN,
      SPAM_WINDOW_MIN_MAX,
      `Window must be ${SPAM_WINDOW_MIN_MIN}-${SPAM_WINDOW_MIN_MAX} minutes`,
    );
    await setSpamWindow(request.windowMinutes);
    await this.notifySettingsChanged();
    return {};
  }

  async setSpamScope(
    request: SetSpamScopeRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    if (
      request.scope !== SpamScope.PER_CHANNEL &&
      request.scope !== SpamScope.SERVER_WIDE
    ) {
      throw new RootServerException(
        ModerationError.INVALID_SETTINGS,
        "Invalid spam scope",
      );
    }
    await setSpamScope(request.scope);
    await this.notifySettingsChanged();
    return {};
  }

  async setSpamWarnUsers(
    request: SetSpamWarnUsersRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setSpamWarnUsers(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setRateLimitEnabled(
    request: SetRateLimitEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setRateLimitEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setRateLimitMax(
    request: SetRateLimitMaxRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.maxMessages,
      RATE_MAX_MESSAGES_MIN,
      RATE_MAX_MESSAGES_MAX,
      `Max messages must be ${RATE_MAX_MESSAGES_MIN}-${RATE_MAX_MESSAGES_MAX}`,
    );
    await setRateLimitMax(request.maxMessages);
    await this.notifySettingsChanged();
    return {};
  }

  async setRateLimitWindow(
    request: SetRateLimitWindowRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.windowSeconds,
      RATE_WINDOW_SECONDS_MIN,
      RATE_WINDOW_SECONDS_MAX,
      `Window must be ${RATE_WINDOW_SECONDS_MIN}-${RATE_WINDOW_SECONDS_MAX} seconds`,
    );
    await setRateLimitWindow(request.windowSeconds);
    await this.notifySettingsChanged();
    return {};
  }

  async setRetentionDays(
    request: SetRetentionDaysRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.days,
      RETENTION_DAYS_MIN,
      RETENTION_DAYS_MAX,
      `Retention must be ${RETENTION_DAYS_MIN}-${RETENTION_DAYS_MAX} days`,
    );
    await setRetentionDays(request.days);
    await this.notifySettingsChanged();
    return {};
  }

  async setUsernameFilterEnabled(
    request: SetUsernameFilterEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setUsernameFilterEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setUrlFilterEnabled(
    request: SetUrlFilterEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setUrlFilterEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setUrlFilterMode(
    request: SetUrlFilterModeRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    if (
      request.mode !== UrlFilterMode.BLOCKLIST &&
      request.mode !== UrlFilterMode.ALLOWLIST
    ) {
      throw new RootServerException(
        ModerationError.INVALID_SETTINGS,
        "Invalid URL filter mode",
      );
    }
    await setUrlFilterMode(request.mode);
    await this.notifySettingsChanged();
    return {};
  }

  async setUrlFilterBlockRootInvites(
    request: SetUrlFilterBlockRootInvitesRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setUrlFilterBlockRootInvites(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setUrlFilterWarnUsers(
    request: SetUrlFilterWarnUsersRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setUrlFilterWarnUsers(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setNewMemberGateEnabled(
    request: SetNewMemberGateEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setNewMemberGateEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setNewMemberGateMinMinutes(
    request: SetNewMemberGateMinMinutesRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.minMinutes,
      NEW_MEMBER_GATE_MIN_MINUTES_MIN,
      NEW_MEMBER_GATE_MIN_MINUTES_MAX,
      `Min minutes must be ${NEW_MEMBER_GATE_MIN_MINUTES_MIN}-${NEW_MEMBER_GATE_MIN_MINUTES_MAX}`,
    );
    await setNewMemberGateMinMinutes(request.minMinutes);
    await this.notifySettingsChanged();
    return {};
  }

  async setNewMemberGateWarnUsers(
    request: SetNewMemberGateWarnUsersRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setNewMemberGateWarnUsers(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setMentionSpamEnabled(
    request: SetMentionSpamEnabledRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setMentionSpamEnabled(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async setMentionSpamMaxMentions(
    request: SetMentionSpamMaxMentionsRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    rangeError(
      request.maxMentions,
      MENTION_SPAM_MAX_MENTIONS_MIN,
      MENTION_SPAM_MAX_MENTIONS_MAX,
      `Max mentions must be ${MENTION_SPAM_MAX_MENTIONS_MIN}-${MENTION_SPAM_MAX_MENTIONS_MAX}`,
    );
    await setMentionSpamMaxMentions(request.maxMentions);
    await this.notifySettingsChanged();
    return {};
  }

  async setMentionSpamWarnUsers(
    request: SetMentionSpamWarnUsersRequest,
    client: Client,
  ): Promise<SetSettingsFieldResponse> {
    await requireAdmin(client);
    await setMentionSpamWarnUsers(!!request.enabled);
    await this.notifySettingsChanged();
    return {};
  }

  async updateMonitoredChannels(
    request: UpdateMonitoredChannelsRequest,
    client: Client,
  ): Promise<UpdateMonitoredChannelsResponse> {
    await requireAdmin(client);
    const db = getDb();
    const ids = request.channelIds as ChannelGuid[];
    await replaceMonitored(db, ids);
    log("info", "monitored channels updated", {
      by: client.userId,
      count: ids.length,
    });
    await this.notifySettingsChanged();
    return {};
  }

  // --- Word lists ----------------------------------------------------------

  async listWords(
    request: ListWordsRequest,
    client: Client,
  ): Promise<ListWordsResponse> {
    await requireAdmin(client);
    const db = getDb();
    const category = request.category;
    if (
      category !== WordCategory.CUSTOM &&
      category !== WordCategory.ALLOWED &&
      category !== WordCategory.URL_DOMAIN
    ) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        "Invalid category",
      );
    }
    const cursorId = decodeAuditCursor(request.cursor); // same opaque encoding
    const pageSize = clampPageSize(request.pageSize);
    const { rows, hasMore } = await storeListWords(
      db,
      category,
      request.search ?? "",
      cursorId,
      pageSize,
    );
    const totalMatches = await countWords(db, category, request.search ?? "");
    const nextCursor =
      hasMore && rows.length > 0
        ? encodeAuditCursor(rows[rows.length - 1].id)
        : "";
    const protoRows: Word[] = rows.map((r) => ({
      id: BigInt(r.id),
      text: r.text,
      category: r.category,
      enabled: r.enabled,
    }));
    return {
      words: protoRows,
      nextCursor,
      totalMatches,
    };
  }

  async addWord(
    request: AddWordRequest,
    client: Client,
  ): Promise<AddWordResponse> {
    await requireAdmin(client);
    const db = getDb();
    const category = request.category;
    if (
      category !== WordCategory.CUSTOM &&
      category !== WordCategory.ALLOWED &&
      category !== WordCategory.URL_DOMAIN
    ) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        "Invalid category",
      );
    }
    const text = (request.text ?? "").trim();
    if (!text) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        "Word required",
      );
    }
    if (text.length > WORD_MAX_LENGTH) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        `Word too long (max ${WORD_MAX_LENGTH})`,
      );
    }
    const row = await storeAddWord(db, category, text);
    if (!row) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        "Could not add word",
      );
    }
    await this.notifySettingsChanged();
    return {
      word: {
        id: BigInt(row.id),
        text: row.text,
        category: row.category,
        enabled: row.enabled,
      },
    };
  }

  async setWordEnabled(
    request: SetWordEnabledRequest,
    client: Client,
  ): Promise<SetWordEnabledResponse> {
    await requireAdmin(client);
    const db = getDb();
    const id = Number(request.id);
    const row = await storeSetWordEnabled(db, id, !!request.enabled);
    if (!row) {
      throw new RootServerException(ModerationError.NOT_FOUND, "Word not found");
    }
    await this.notifySettingsChanged();
    return {};
  }

  async removeWord(
    request: RemoveWordRequest,
    client: Client,
  ): Promise<RemoveWordResponse> {
    await requireAdmin(client);
    const db = getDb();
    const category = await storeRemoveWord(db, Number(request.id));
    if (category === undefined) {
      throw new RootServerException(ModerationError.NOT_FOUND, "Word not found");
    }
    await this.notifySettingsChanged();
    return {};
  }

  async importWords(
    request: ImportWordsRequest,
    client: Client,
  ): Promise<ImportWordsResponse> {
    await requireAdmin(client);
    const category = request.category;
    if (
      category !== WordCategory.CUSTOM &&
      category !== WordCategory.ALLOWED &&
      category !== WordCategory.URL_DOMAIN
    ) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        "Invalid category",
      );
    }
    // Cap the input array so a single RPC can't drag the server through
    // an unbounded import. The cap is generous enough for any realistic
    // hand-managed list — admins importing tens of thousands of words
    // need a different ingestion path anyway.
    if (request.texts.length > IMPORT_MAX_ENTRIES) {
      throw new RootServerException(
        ModerationError.INVALID_WORD,
        `Too many entries (max ${IMPORT_MAX_ENTRIES} per import)`,
      );
    }
    const db = getDb();
    let result;
    try {
      result = await storeImportWords(
        db,
        category,
        request.texts,
        WORD_MAX_LENGTH,
      );
    } catch (err) {
      // Post-split candidate count exceeded the store-side cap. Surfaces
      // to the admin as a structured error rather than a generic 500.
      if (err instanceof ImportTooLargeError) {
        throw new RootServerException(
          ModerationError.INVALID_WORD,
          err.message,
        );
      }
      throw err;
    }
    if (result.added > 0) {
      await this.notifySettingsChanged();
    }
    return {
      addedCount: result.added,
      duplicateCount: result.duplicates,
      invalidCount: result.invalid,
    };
  }

  // --- Audit log -----------------------------------------------------------

  async listAuditLog(
    request: ListAuditLogRequest,
    client: Client,
  ): Promise<ListAuditLogResponse> {
    await requireAdmin(client);
    const db = getDb();
    const cursorId = decodeAuditCursor(request.cursor);
    const pageSize = clampPageSize(request.pageSize);
    const filters = {
      nicknameFilter: request.nicknameFilter ?? "",
      actionFilter: request.actionFilter,
      ruleFilter: request.ruleFilter,
      fromTimestamp: Number(request.fromTimestamp),
      toTimestamp: Number(request.toTimestamp),
    };
    const { entries, hasMore } = await listAudit(
      db,
      filters,
      cursorId,
      pageSize,
    );
    const totalMatches = await countAudit(db, filters);
    const nextCursor =
      hasMore && entries.length > 0
        ? encodeAuditCursor(entries[entries.length - 1].id)
        : "";
    return {
      entries: entries.map(toAuditProto),
      nextCursor,
      totalMatches,
    };
  }

  async getMemberSummary(
    request: GetMemberSummaryRequest,
    client: Client,
  ): Promise<GetMemberSummaryResponse> {
    await requireAdmin(client);
    if (!request.userId) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Missing userId",
      );
    }
    const db = getDb();
    const summary = await auditMemberSummary(db, request.userId as UserGuid);
    return {
      nickname: summary.nickname,
      totalEvents: summary.totalEvents,
      byRule: summary.byRule.map((r) => ({ rule: r.rule, count: r.count })),
      firstEventAt: BigInt(summary.firstEventAt),
      lastEventAt: BigInt(summary.lastEventAt),
    };
  }

  // --- Manual actions ------------------------------------------------------

  async deleteMessageManual(
    request: DeleteMessageManualRequest,
    client: Client,
  ): Promise<DeleteMessageManualResponse> {
    await requireAdmin(client);
    requireManualActionAllowance(client.userId);
    // Empty-ID guard: without it, an empty channelId / messageId reaches
    // the SDK as a NotFound (which we treat as "already gone" downstream)
    // and we end up writing an audit row with empty channelId — the row
    // pollutes the log without describing any real action.
    if (!request.channelId || !request.messageId) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Missing channelId or messageId",
      );
    }
    const channelId = request.channelId as ChannelGuid;
    const messageId = request.messageId as unknown as MessageGuid;
    let messageContent = "";
    let targetUserId: UserGuid = "" as UserGuid;
    try {
      const msg = await rootServer.community.channelMessages.get({
        channelId,
        id: messageId,
      });
      messageContent = msg.messageContent ?? "";
      targetUserId = msg.userId;
    } catch (err) {
      // We can audit a deletion of a message we couldn't fetch — just record
      // less context. NotFound is the common case (already gone).
      if (err instanceof RootApiException) {
        log("warn", "manual delete: get failed", {
          channelId,
          messageId,
          errorCode: err.errorCode,
        });
      } else {
        throw err;
      }
    }
    try {
      await moderationSdkQueue.enqueue(() =>
        rootServer.community.channelMessages.delete({
          channelId,
          id: messageId,
        }),
      );
    } catch (err) {
      if (
        err instanceof RootApiException &&
        ["NotFound"].includes(String(err.errorCode))
      ) {
        // Already gone — proceed to audit.
      } else if (err instanceof RootApiException) {
        throw err;
      } else {
        throw err;
      }
    }

    const db = getDb();
    const reason = validateReason(request.reason);
    // Resolve target + actor in parallel — both go through the same
    // cache. For a self-moderation action (admin deleting their own
    // message) the two userIds collide and the second resolve is a
    // cache hit.
    const [targetNickname, actorNickname] = await Promise.all([
      targetUserId ? resolveNickname(targetUserId) : Promise.resolve(""),
      resolveNickname(client.userId),
    ]);
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.DELETE_MESSAGE,
      rule: RuleType.MANUAL,
      targetUserId,
      channelId,
      targetNickname,
      messageExcerpt: reason
        ? `${messageContent}\n[reason: ${reason}]`
        : messageContent,
      manual: true,
      actorUserId: client.userId,
      actorNickname,
    });
    log("info", "manual delete", {
      by: client.userId,
      targetUserId,
      channelId,
    });
    return {};
  }

  async kickMember(
    request: KickMemberRequest,
    client: Client,
  ): Promise<KickMemberResponse> {
    await requireAdmin(client);
    requireManualActionAllowance(client.userId);
    const userId = request.userId as UserGuid;
    if (RootGuidConverter.toRootGuidType(userId) !== RootGuidType.Person) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Cannot kick this target",
      );
    }
    // Resolve nicknames BEFORE the kick — once kicked, the target user
    // is no longer a community member and communityMembers.get throws.
    // Actor stays a member, but resolving in parallel keeps the audit
    // path one round-trip wide instead of two sequential.
    const [targetNickname, actorNickname] = await Promise.all([
      resolveNickname(userId),
      resolveNickname(client.userId),
    ]);
    await moderationSdkQueue.enqueue(() =>
      rootServer.community.communityMemberBans.kick({ userId }),
    );
    const db = getDb();
    const reason = validateReason(request.reason);
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.KICK,
      rule: RuleType.MANUAL,
      targetUserId: userId,
      targetNickname,
      messageExcerpt: reason,
      manual: true,
      actorUserId: client.userId,
      actorNickname,
    });
    log("info", "manual kick", { by: client.userId, userId });
    return {};
  }

  async banMember(
    request: BanMemberRequest,
    client: Client,
  ): Promise<BanMemberResponse> {
    await requireAdmin(client);
    requireManualActionAllowance(client.userId);
    const userId = request.userId as UserGuid;
    if (RootGuidConverter.toRootGuidType(userId) !== RootGuidType.Person) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Cannot ban this target",
      );
    }
    const reason = validateReason(request.reason) || undefined;
    // expiresAt: 0 (or unset) = permanent. Anything non-zero must be in the
    // future — a past timestamp is almost certainly client-clock skew or a
    // mis-built request and would result in an instantly-lifted ban, which
    // is a worse UX than failing fast with INVALID_SETTINGS.
    const expiresAtMs = Number(request.expiresAt);
    let expiresAtDate: Date | undefined;
    if (expiresAtMs > 0) {
      if (expiresAtMs <= Date.now()) {
        throw new RootServerException(
          ModerationError.INVALID_SETTINGS,
          "Ban expiry must be in the future",
        );
      }
      expiresAtDate = new Date(expiresAtMs);
    }
    // Resolve BEFORE the ban for the same reason as kick — banning
    // detaches the member. Parallel with actor for one round-trip.
    const [targetNickname, actorNickname] = await Promise.all([
      resolveNickname(userId),
      resolveNickname(client.userId),
    ]);
    await moderationSdkQueue.enqueue(() =>
      rootServer.community.communityMemberBans.create({
        userId,
        reason,
        ...(expiresAtDate ? { expiresAt: expiresAtDate } : {}),
      }),
    );
    // Audit excerpt records the duration so it shows up in the log without
    // a parallel column. Permanent bans omit the suffix to stay terse;
    // reason and duration are joined with a single space when both present.
    const excerptParts: string[] = [];
    if (reason) excerptParts.push(reason);
    if (expiresAtDate) {
      excerptParts.push(`[expires ${expiresAtDate.toISOString()}]`);
    }
    const db = getDb();
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.BAN,
      rule: RuleType.MANUAL,
      targetUserId: userId,
      targetNickname,
      messageExcerpt: excerptParts.join(" "),
      manual: true,
      actorUserId: client.userId,
      actorNickname,
    });
    log("info", "manual ban", {
      by: client.userId,
      userId,
      expiresAt: expiresAtDate?.toISOString(),
    });
    return {};
  }

  async unbanMember(
    request: UnbanMemberRequest,
    client: Client,
  ): Promise<UnbanMemberResponse> {
    await requireAdmin(client);
    requireManualActionAllowance(client.userId);
    const userId = request.userId as UserGuid;
    if (RootGuidConverter.toRootGuidType(userId) !== RootGuidType.Person) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Cannot unban this target",
      );
    }
    // Resolve actor nickname before the SDK call (target nickname comes
    // from the existing ban record's frozen-at-time-of-ban value, which
    // we look up through the cache for consistency with how BAN rows
    // were written).
    const [targetNickname, actorNickname] = await Promise.all([
      resolveNickname(userId),
      resolveNickname(client.userId),
    ]);
    try {
      await moderationSdkQueue.enqueue(() =>
        rootServer.community.communityMemberBans.delete({ userId }),
      );
    } catch (err) {
      // NotFound = the user wasn't banned. Could happen via:
      //   1. Race with an SDK-driven temp-ban auto-expiry
      //   2. Another admin unbanning concurrently
      //   3. Stale UI from before a refresh
      // Surface as INVALID_TARGET so the client can render a friendly
      // "not currently banned" notice; don't write an audit row.
      if (err instanceof RootApiException) {
        throw new RootServerException(
          ModerationError.INVALID_TARGET,
          "User is not currently banned",
        );
      }
      throw err;
    }
    const db = getDb();
    const reason = validateReason(request.reason);
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.UNBAN_MEMBER,
      rule: RuleType.MANUAL,
      targetUserId: userId,
      targetNickname,
      messageExcerpt: reason,
      manual: true,
      actorUserId: client.userId,
      actorNickname,
    });
    log("info", "manual unban", { by: client.userId, userId });
    return {};
  }

  async listBannedMembers(
    _request: ListBannedMembersRequest,
    client: Client,
  ): Promise<ListBannedMembersResponse> {
    await requireAdmin(client);
    // The SDK list returns ALL bans the app has visibility into. For a
    // moderately-sized community the list is small; for larger ones it
    // can grow. We pay the round-trip per call (no caching) because
    // ban state changes through OUR mutations and through the platform
    // (auto-expiry) — a stale cache would routinely show lifted bans.
    let bans;
    try {
      bans = await rootServer.community.communityMemberBans.list();
    } catch (err) {
      log("warn", "communityMemberBans.list failed", {
        ...errFields(err),
      });
      return { members: [] };
    }
    // Resolve nicknames in parallel — same cache the audit-write path
    // uses, so repeats from the audit log share cache hits.
    const members = await Promise.all(
      bans.map(async (ban) => {
        const nickname = await resolveNickname(ban.userId);
        return {
          userId: ban.userId,
          nickname,
          reason: ban.reason ?? "",
          expiresAt: ban.expiresAt
            ? BigInt(ban.expiresAt.getTime())
            : BigInt(0),
        };
      }),
    );
    return { members };
  }

  // --- Destructive bulk actions ------------------------------------------

  // Type-to-confirm gated audit-log purge. The client renders a TypeToConfirm
  // modal that disables its commit button until the user types the canonical
  // phrase; the server *also* validates the phrase as defence in depth (a
  // misbehaving client or a direct RPC call shouldn't be able to drop the
  // table without the explicit confirmation).
  //
  // Why a separate RPC (vs. extending pruneOlderThan with cutoff=now): clear
  // is a different intent — admins are explicitly purging history, not
  // rolling retention forward. Distinct RPC = distinct audit/log line, no
  // accidental "clear via aggressive retention" misuse.
  async clearAuditLog(
    request: ClearAuditLogRequest,
    client: Client,
  ): Promise<ClearAuditLogResponse> {
    await requireAdmin(client);
    const typed = (request.confirmationPhrase ?? "").trim().toLowerCase();
    if (typed !== CLEAR_AUDIT_LOG_PHRASE) {
      throw new RootServerException(
        ModerationError.INVALID_SETTINGS,
        `Type "${CLEAR_AUDIT_LOG_PHRASE}" exactly to confirm.`,
      );
    }
    const db = getDb();
    const rowsDeleted = await deleteAllAudit(db);
    log("warn", "audit log cleared", {
      by: client.userId,
      rowsDeleted,
    });
    // Self-documenting trailer row: write the clear event into the now-
    // empty log so admins reading the log later see WHO cleared it and
    // WHEN, not just an unexplained zero-state. Preserves the "every
    // state-modifying action goes through onAuditEntry" invariant for
    // the one action that would otherwise erase its own evidence.
    const actorNickname = await resolveNickname(client.userId);
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.CLEAR_AUDIT_LOG,
      rule: RuleType.MANUAL,
      targetUserId: "" as UserGuid,
      messageExcerpt: `Cleared ${rowsDeleted} ${
        rowsDeleted === 1 ? "entry" : "entries"
      }`,
      manual: true,
      actorUserId: client.userId,
      actorNickname,
    });
    // Audit-log changes broadcast to "all": dashboard counters, analytics,
    // and the audit log view itself all need to refetch + render the empty
    // state. The trailer entry above already calls notifyAuditLogAppended
    // via onAuditEntry, so no second broadcast is needed here.
    return { rowsDeleted };
  }

  // --- Internal broadcasts -------------------------------------------------

  // Notify admin-only listeners that something behind GetSettings changed.
  // Audience is the adminAudience MemberGroup (owner ∪ admins-selection),
  // not the bare globalSettings.general.admins ReadOnlyMemberGroup. Owner
  // is implicitly admin via adminCheck and would otherwise miss broadcasts
  // for their own mutations if they weren't explicitly in the picker.
  async notifySettingsChanged(): Promise<void> {
    const audience = getAdminAudience();
    if (!audience) {
      // Brief startup window before initializeAdminAudience resolves. Skip
      // safely — the only admin during this window is the owner, and they
      // don't need a broadcast for their own write because the RPC response
      // already carries the new state.
      return;
    }
    await safeBroadcast("SettingsChanged", () =>
      this.broadcastSettingsChanged({}, audience),
    );
  }

  // Audit-log changes affect the public dashboard, so broadcast to "all".
  // Receivers refetch the slice they care about (dashboard counters,
  // analytics view, audit log page).
  async notifyAuditLogAppended(): Promise<void> {
    await safeBroadcast("AuditLogAppended", () =>
      this.broadcastAuditLogAppended({}, "all"),
    );
  }

  async notifyAdminsChanged(): Promise<void> {
    await safeBroadcast("AdminsChanged", () =>
      this.broadcastAdminsChanged({}, "all"),
    );
  }
}

// --- Helpers ---------------------------------------------------------------

function toAuditProto(r: AuditEntryRow): AuditEntry {
  return {
    id: BigInt(r.id),
    timestamp: BigInt(r.timestamp),
    action: r.action,
    rule: r.rule,
    targetUserId: r.targetUserId,
    channelId: r.channelId,
    channelName: r.channelId ? getChannelName(r.channelId as ChannelGuid) : "",
    targetNickname: r.targetNickname,
    messageExcerpt: r.messageExcerpt,
    matchedTerm: r.matchedTerm,
    manual: r.manual,
    actorUserId: r.actorUserId,
    actorNickname: r.actorNickname,
  };
}

function analyticsWindow(range: AnalyticsRange): {
  sinceMs: number;
  bucketMs: number;
} {
  const now = Date.now();
  if (range === AnalyticsRange.LAST_24H) {
    return { sinceMs: now - 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 };
  }
  if (range === AnalyticsRange.LAST_7D) {
    return {
      sinceMs: now - 7 * 24 * 60 * 60 * 1000,
      bucketMs: 24 * 60 * 60 * 1000,
    };
  }
  return {
    sinceMs: now - 30 * 24 * 60 * 60 * 1000,
    bucketMs: 24 * 60 * 60 * 1000,
  };
}

function clampPageSize(requested: number): number {
  const n = requested || DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, n), MAX_PAGE_SIZE);
}

// Throws INVALID_SETTINGS if value is outside [lo, hi]. Inclusive bounds.
function rangeError(value: number, lo: number, hi: number, message: string): void {
  if (!Number.isFinite(value) || value < lo || value > hi) {
    throw new RootServerException(ModerationError.INVALID_SETTINGS, message);
  }
}

// Trim + length-cap an admin-supplied reason. Returns the trimmed
// string. Throws INVALID_SETTINGS if over REASON_MAX_LENGTH so a
// malformed or out-of-band caller can't shove unbounded text into the
// audit log's messageExcerpt column.
function validateReason(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length > REASON_MAX_LENGTH) {
    throw new RootServerException(
      ModerationError.INVALID_SETTINGS,
      `Reason too long (max ${REASON_MAX_LENGTH} chars)`,
    );
  }
  return trimmed;
}

// Per-caller rate limiter for reportClientError. Keeps a rolling timestamp
// list per userId; admits a call only if fewer than LIMIT_REPORTS_PER_MIN
// landed in the last REPORT_WINDOW_MS. The map grows with concurrent users
// but each entry's timestamp list is capped — old entries are pruned on
// every check, so a single user's stack stays bounded.
const reportTimestamps = new Map<string, number[]>();

function checkReportRate(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - REPORT_WINDOW_MS;
  const list = (reportTimestamps.get(userId) ?? []).filter((t) => t >= cutoff);
  if (list.length >= LIMIT_REPORTS_PER_MIN) {
    reportTimestamps.set(userId, list);
    return false;
  }
  list.push(now);
  reportTimestamps.set(userId, list);
  return true;
}

// Per-admin rate limit on manual moderation actions. Same shape as
// checkReportRate — rolling window of timestamps per admin userId; throws
// MODERATION_ERROR_RATE_LIMITED when the admin exceeds
// LIMIT_MANUAL_ACTIONS_PER_MIN within MANUAL_ACTION_WINDOW_MS. Mirrors the
// platform's command quota at the app level so a single admin session
// can't rapid-fire kicks/bans/deletes and starve other admins of their
// share. Stored per-admin so a community with many admins each gets the
// full quota independently.
const manualActionTimestamps = new Map<string, number[]>();

function requireManualActionAllowance(userId: string): void {
  const now = Date.now();
  const cutoff = now - MANUAL_ACTION_WINDOW_MS;
  const list = (manualActionTimestamps.get(userId) ?? []).filter(
    (t) => t >= cutoff,
  );
  if (list.length >= LIMIT_MANUAL_ACTIONS_PER_MIN) {
    manualActionTimestamps.set(userId, list);
    throw new RootServerException(
      ModerationError.RATE_LIMITED,
      `Too many manual actions — limit is ${LIMIT_MANUAL_ACTIONS_PER_MIN}/min per admin. Wait a moment and try again.`,
    );
  }
  list.push(now);
  manualActionTimestamps.set(userId, list);
}

// Resolve a set of role IDs to their {id, name, colorHex} summaries via
// communityRoles.list(). Filters the full role list against the requested
// IDs and preserves the picker's order. Missing roles (deleted between
// picker save and now) get a placeholder so the UI can render a clear
// "(deleted role)" pill instead of silently dropping the entry.
async function resolveRoleSummaries(
  ids: readonly string[],
): Promise<{ id: string; name: string; colorHex: string }[]> {
  try {
    const all = await getCachedRoleList();
    // Index by id-as-string so the picker's plain-string IDs can look up
    // CommunityRole records (whose id is the branded `CommunityRoleGuid`)
    // without a cross-type cast.
    const byId = new Map<string, CommunityRole>(all.map((r) => [r.id, r]));
    return ids.map((id) => {
      const role = byId.get(id);
      return {
        id,
        name: role?.name ?? "(deleted role)",
        colorHex: role?.colorHex ?? "",
      };
    });
  } catch (err) {
    log("warn", "communityRoles.list failed; rendering exempt roles as raw IDs", {
      error: err instanceof Error ? err.message : String(err),
    });
    return ids.map((id) => ({ id, name: "", colorHex: "" }));
  }
}

// 5-minute TTL cache for the community role list. getSettings is admin-only
// + low-frequency, so without this each Settings open is one extra SDK
// round-trip; with it, a Settings session that opens the page repeatedly
// is free after the first call. Roles are bounded (typically <50 per
// community), so the cache is tiny.
let cachedRoleList: { roles: CommunityRole[]; expiresAt: number } | undefined;
const ROLE_LIST_TTL_MS = 5 * 60_000;

async function getCachedRoleList(): Promise<CommunityRole[]> {
  const now = Date.now();
  if (cachedRoleList && cachedRoleList.expiresAt > now) {
    return cachedRoleList.roles;
  }
  const roles = await rootServer.community.communityRoles.list();
  cachedRoleList = { roles, expiresAt: now + ROLE_LIST_TTL_MS };
  return roles;
}

// Cap a string to `max` code points, appending an ellipsis marker when
// truncated. Code-point aware so a slice never lands halfway through a
// surrogate pair (broken UTF-8 in some log pipelines). Used by
// reportClientError to bound logged field sizes.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const codePoints = Array.from(s);
  if (codePoints.length <= max) return s;
  return codePoints.slice(0, max).join("") + "…[truncated]";
}

export const moderationService = new ModerationService();
