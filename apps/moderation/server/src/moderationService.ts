import {
  Client,
  UserGuid,
  ChannelGuid,
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
  SetSettingsFieldResponse,
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
  ListAuditLogRequest,
  ListAuditLogResponse,
  DeleteMessageManualRequest,
  DeleteMessageManualResponse,
  KickMemberRequest,
  KickMemberResponse,
  BanMemberRequest,
  BanMemberResponse,
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
  AuditEntryRow,
} from "./auditLogStore";
import { onAuditEntry } from "./auditDispatch";
import { isAdmin, requireAdmin } from "./adminCheck";
import { getAdminAudience } from "./adminAudience";
import { getChannelName, getChannelTree } from "./channelNameCache";
import { log } from "./lib/log";
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

const DASHBOARD_RECENT_LIMIT = 20;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const TOP_CHANNELS_LIMIT = 5;

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
      monitored,
      customCount,
      allowedCount,
    ] = await Promise.all([
      getContentFilter(),
      getSpamControl(),
      getRateLimit(),
      getGeneral(),
      listMonitored(db),
      totalCount(db, WordCategory.CUSTOM),
      totalCount(db, WordCategory.ALLOWED),
    ]);
    const tree = getChannelTree();
    const monitoredSet = new Set<string>(monitored);
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
      },
      channelTree,
      customWordCount: customCount,
      allowedWordCount: allowedCount,
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
      category !== WordCategory.ALLOWED
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
      category !== WordCategory.ALLOWED
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
      usernameFilter: request.usernameFilter ?? "",
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

  // --- Manual actions ------------------------------------------------------

  async deleteMessageManual(
    request: DeleteMessageManualRequest,
    client: Client,
  ): Promise<DeleteMessageManualResponse> {
    await requireAdmin(client);
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
      await rootServer.community.channelMessages.delete({
        channelId,
        id: messageId,
      });
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
    const note = (request.note ?? "").trim();
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.DELETE_MESSAGE,
      rule: RuleType.MANUAL,
      targetUserId,
      channelId,
      messageExcerpt: note ? `${messageContent}\n[note: ${note}]` : messageContent,
      manual: true,
      actorUserId: client.userId,
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
    const userId = request.userId as UserGuid;
    if (RootGuidConverter.toRootGuidType(userId) !== RootGuidType.Person) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Cannot kick this target",
      );
    }
    await rootServer.community.communityMemberBans.kick({ userId });
    const db = getDb();
    const note = (request.note ?? "").trim();
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.KICK,
      rule: RuleType.MANUAL,
      targetUserId: userId,
      messageExcerpt: note,
      manual: true,
      actorUserId: client.userId,
    });
    log("info", "manual kick", { by: client.userId, userId });
    return {};
  }

  async banMember(
    request: BanMemberRequest,
    client: Client,
  ): Promise<BanMemberResponse> {
    await requireAdmin(client);
    const userId = request.userId as UserGuid;
    if (RootGuidConverter.toRootGuidType(userId) !== RootGuidType.Person) {
      throw new RootServerException(
        ModerationError.INVALID_TARGET,
        "Cannot ban this target",
      );
    }
    const reason = (request.reason ?? "").trim() || undefined;
    await rootServer.community.communityMemberBans.create({ userId, reason });
    const db = getDb();
    await onAuditEntry(db, {
      timestamp: Date.now(),
      action: ActionType.BAN,
      rule: RuleType.MANUAL,
      targetUserId: userId,
      messageExcerpt: reason ?? "",
      manual: true,
      actorUserId: client.userId,
    });
    log("info", "manual ban", { by: client.userId, userId });
    return {};
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
    targetUsername: r.targetUsername,
    messageExcerpt: r.messageExcerpt,
    matchedTerm: r.matchedTerm,
    manual: r.manual,
    actorUserId: r.actorUserId,
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
