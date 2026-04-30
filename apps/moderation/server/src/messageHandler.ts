import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageEditedEvent,
  ChannelMessageDeleteRequest,
  ChannelMessageCreateRequest,
  MessageType,
  RootGuidConverter,
  RootGuidType,
  RootApiException,
  ChannelGuid,
  MessageGuid,
  UserGuid,
  MessageUri,
} from "@rootsdk/server-app";
import { getDb } from "./db";
import {
  ActionType,
  RuleType,
  WordCategory,
  UrlFilterMode,
} from "@moderation/gen-shared";
import {
  getContentFilter,
  getSpamControl,
  getRateLimit,
  getUrlFilter,
  getNewMemberGate,
  getMentionSpam,
} from "./settingsStore";
import { isMonitored } from "./monitoredChannelsStore";
import { isExempt } from "./exemptMembers";
import { getCompiledPattern, getEnabledWords } from "./wordListStore";
import {
  BUILTIN_SLUR_PATTERN,
  BUILTIN_PROFANITY_PATTERN,
} from "./builtinWordLists";
import { matchCompiled, normalize } from "./contentFilter";
import { extractUrls, evaluateUrls } from "./urlFilter";
import {
  hashContent,
  recordAndCheck as spamRecordAndCheck,
} from "./spamDetector";
import { recordAndCheck as rateRecordAndCheck } from "./rateLimiter";
import { onAuditEntry } from "./auditDispatch";
import { getChannelName } from "./channelNameCache";
import { resolveNickname, resolveJoinedAt } from "./memberCache";
import { shouldPostWarning, markPosted } from "./warningCooldown";
import { moderationSdkQueue } from "./lib/sdkQueue";
import { log, errFields } from "./lib/log";

// messageHandler — the rule pipeline.
//
// Subscribes to two events:
//
//   - ChannelMessageCreated → full pipeline (content filter → spam →
//     rate limit). First rule to match deletes the message and stops
//     the pipeline. Running every rule on every message would double-
//     count metrics and produce duplicate audit entries.
//   - ChannelMessageEdited → content filter ONLY. Spam + rate-limit
//     observations already counted on creation, so re-evaluating them
//     would double-penalize. Without the edit listener, a user could
//     post a clean message and edit it to violating content as a
//     bypass.
//
// Both flows share the same skip checks: system messages, non-Person
// senders (bots/apps don't get moderated by other apps), unmonitored
// channels, and exempt members (globalSettings.general.exempt). After a
// match: delete the message + write an audit row + (optionally) post a
// public warning. Edit-time hits get an `[edited] ` prefix on the
// audit excerpt so admins can distinguish.
//
// Hot-path discipline: cached settings read; in-memory channel name +
// word lists; the only SDK calls are the actual delete and (optionally)
// the warning post — both gated behind a rule match.

// Both events carry the same shape (channelId, userId, id, messageContent,
// messageType, ...) so the handler is parameterized only by `isEdit`.
type MessageEvent = ChannelMessageCreatedEvent | ChannelMessageEditedEvent;

export function initializeMessageHandler(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    (evt) => {
      void onMessage(evt, false).catch((err) => {
        log("error", "messageHandler.onMessage failed", {
          userId: evt.userId,
          channelId: evt.channelId,
          isEdit: false,
          ...errFields(err),
        });
      });
    },
  );
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageEdited,
    (evt) => {
      void onMessage(evt, true).catch((err) => {
        log("error", "messageHandler.onMessage failed", {
          userId: evt.userId,
          channelId: evt.channelId,
          isEdit: true,
          ...errFields(err),
        });
      });
    },
  );
}

interface RuleHit {
  rule: RuleType;
  matchedTerm: string;
  warnUsers: boolean;
  warnText: string;
}

async function onMessage(evt: MessageEvent, isEdit: boolean): Promise<void> {
  // Filter out system messages and non-user senders.
  if (evt.messageType === MessageType.System) return;
  if (RootGuidConverter.toRootGuidType(evt.userId) !== RootGuidType.Person) return;
  if (!isMonitored(evt.channelId)) return;
  // Skip already-deleted messages — relevant for the edit path where a
  // race between edit + external delete could land an event for a
  // tombstoned message. Cheap defensive guard; no SDK round-trip cost.
  if (evt.deletedAt) return;

  // Exempt members (per globalSettings.general.exempt) bypass every
  // automated rule. Manual admin actions (kick/ban/delete) are
  // unaffected — those run server-side regardless of exemption. Checking
  // here, before any rule work, also avoids burning the per-message
  // matcher pass on members the pipeline shouldn't touch.
  if (await isExempt(evt.userId)) return;

  const text = evt.messageContent ?? "";
  const normalized = normalize(text);

  // Edits run only the inline rules (content + URL filter + mention
  // spam); spam-detection + rate-limit already counted on creation, so
  // re-evaluating them would double-penalize the same event timeline.
  // The inline rules DO re-run on edits — a "post clean message, edit
  // to evil link" or "edit to add 30 mentions" bypass is the same
  // shape as the content-filter edit-bypass.
  let hit: RuleHit | undefined;
  try {
    hit = isEdit
      ? await evaluateInlineRules(
          normalized,
          text,
          evt.messageUris,
          evt.referenceMaps,
        )
      : await evaluateRules(evt, normalized, text);
  } catch (err) {
    // A rule throwing mid-pipeline is a defect — without surfacing it
    // the message stays up and admins have no signal that the pipeline
    // failed. Write a placeholder audit row so the failure is visible
    // in the log + dashboard. Don't try to delete; we don't know if the
    // failed rule would have hit. Use RuleType.UNSPECIFIED to mark the
    // row as an internal-failure event distinct from any real rule.
    await logRuleFailure(evt, isEdit, err);
    return;
  }
  if (!hit) return;

  await actOnHit(evt, text, hit, isEdit);
}

// Best-effort write of an audit row for a rule-pipeline exception.
// Wrapped in try/catch so a failure here never escalates back into the
// outer handler — the log entry is the safety net of last resort.
async function logRuleFailure(
  evt: MessageEvent,
  isEdit: boolean,
  err: unknown,
): Promise<void> {
  log("error", "rule pipeline threw", {
    userId: evt.userId,
    channelId: evt.channelId,
    isEdit,
    ...errFields(err),
  });
  try {
    const db = getDb();
    const targetNickname = await resolveNickname(evt.userId);
    const message = err instanceof Error ? err.message : String(err);
    await onAuditEntry(db, {
      timestamp: Date.now(),
      // RuleType.UNSPECIFIED + an explicit excerpt prefix make these
      // rows distinct from any real rule hit. Action is unspecified
      // since we didn't actually delete or take any moderation action.
      action: ActionType.UNSPECIFIED,
      rule: RuleType.UNSPECIFIED,
      targetUserId: evt.userId,
      channelId: evt.channelId,
      targetNickname,
      messageExcerpt: `[rule pipeline error${isEdit ? " on edit" : ""}] ${message}`,
      manual: false,
      actorUserId: "",
    });
  } catch (auditErr) {
    log("error", "rule pipeline error audit write failed", {
      ...errFields(auditErr),
    });
  }
}

// Inline rules — those that look at "what's in this message" only.
// Extracted from evaluateRules so the edit-event flow can call them
// directly without paying for spam-detection + rate-limit evaluation
// that already happened on creation.
//
// Order: content filter → URL filter → mention spam. Content matching
// is the most likely violation in practice and runs against text the
// caller already normalized, so we check it first; URL filter pays for
// extraction + parse; mention spam is O(1) over pre-resolved arrays
// but is the rarest hit, so it goes last.
async function evaluateInlineRules(
  normalized: string,
  rawText: string,
  messageUris: readonly MessageUri[] | undefined,
  referenceMaps: MessageEvent["referenceMaps"],
): Promise<RuleHit | undefined> {
  const contentHit = await evaluateContentFilter(normalized);
  if (contentHit) return contentHit;
  const urlHit = await evaluateUrlFilter(rawText, messageUris);
  if (urlHit) return urlHit;
  const mentionHit = await evaluateMentionSpam(referenceMaps);
  if (mentionHit) return mentionHit;
  return undefined;
}

async function evaluateContentFilter(
  normalized: string,
): Promise<RuleHit | undefined> {
  const db = getDb();
  const contentSettings = await getContentFilter();
  if (!contentSettings.enabled || !normalized) return undefined;
  const allowedPattern = await getCompiledPattern(db, WordCategory.ALLOWED);
  const patterns: (RegExp | undefined)[] = [];
  if (contentSettings.filterSlurs) patterns.push(BUILTIN_SLUR_PATTERN);
  if (contentSettings.filterProfanity) patterns.push(BUILTIN_PROFANITY_PATTERN);
  if (contentSettings.filterCustomWords) {
    patterns.push(await getCompiledPattern(db, WordCategory.CUSTOM));
  }
  for (const pattern of patterns) {
    const result = matchCompiled(normalized, pattern, allowedPattern);
    if (result) {
      return {
        rule: RuleType.CONTENT_FILTER,
        matchedTerm: result.matchedTerm,
        warnUsers: contentSettings.warnUsers,
        warnText:
          "A message in this channel was removed for violating the community's content rules.",
      };
    }
  }
  return undefined;
}

async function evaluateUrlFilter(
  rawText: string,
  messageUris: readonly MessageUri[] | undefined,
): Promise<RuleHit | undefined> {
  const settings = await getUrlFilter();
  if (!settings.enabled) return undefined;
  const urls = extractUrls(rawText, messageUris);
  if (urls.length === 0) return undefined;
  const db = getDb();
  // Domain list source: same `words` table, category URL_DOMAIN. Only
  // the enabled rows count — admins can disable a domain to test
  // without removing it.
  const domainList = await getEnabledWords(db, WordCategory.URL_DOMAIN);
  const mode =
    settings.mode === UrlFilterMode.ALLOWLIST ? "allowlist" : "blocklist";
  const match = evaluateUrls(
    urls,
    mode,
    domainList,
    settings.blockRootInvites,
  );
  if (!match) return undefined;
  return {
    rule: RuleType.URL_FILTER,
    matchedTerm: match.matchedTerm,
    warnUsers: settings.warnUsers,
    warnText:
      "A message in this channel was removed for posting a disallowed link.",
  };
}

// Mention spam — caps user+role mentions per message. Stateless: each
// message is judged on its own count, no per-user windowing.
//
// We pull mentions from referenceMaps rather than re-parsing the raw
// content because referenceMaps reflects what the chat client actually
// rendered as a mention — copy-pasted markup that doesn't resolve to a
// real user/role doesn't count, and `@everyone`/`@here` show up as
// resolved roles in the same array. Less work, better signal.
//
// Roles + users are both counted; channels are not (channel mentions
// don't notify members and aren't a pile-on vector).
async function evaluateMentionSpam(
  referenceMaps: MessageEvent["referenceMaps"],
): Promise<RuleHit | undefined> {
  const settings = await getMentionSpam();
  if (!settings.enabled) return undefined;
  const userCount = referenceMaps?.users?.length ?? 0;
  const roleCount = referenceMaps?.roles?.length ?? 0;
  const total = userCount + roleCount;
  if (total <= settings.maxMentionsPerMessage) return undefined;
  return {
    rule: RuleType.MENTION_SPAM,
    // Stored as the audit row's matchedTerm so the audit-log Pill reads
    // "23 mentions" — interpretable on its own without the rule label
    // for context. Mirrors the content-filter convention where the
    // matched evidence (the word) goes here.
    matchedTerm: `${total} mentions`,
    warnUsers: settings.warnUsers,
    warnText:
      "A message in this channel was removed for tagging too many people at once.",
  };
}

// New member gate — short-circuits messages from members who joined
// less than `minMinutes` ago. Fail-open on missing joinedAt: the SDK
// type marks it optional, and treating "no data" as "old enough" is
// the conservative choice (the alternative gates legitimate users on
// platform metadata gaps).
async function evaluateNewMemberGate(
  userId: UserGuid,
): Promise<RuleHit | undefined> {
  const settings = await getNewMemberGate();
  if (!settings.enabled) return undefined;
  const joinedAt = await resolveJoinedAt(userId);
  if (joinedAt === undefined) return undefined;
  const ageMs = Date.now() - joinedAt;
  const thresholdMs = settings.minMinutes * 60_000;
  if (ageMs >= thresholdMs) return undefined;
  return {
    rule: RuleType.NEW_MEMBER_GATE,
    matchedTerm: "",
    warnUsers: settings.warnUsers,
    warnText:
      "Your account is too new to post in this channel. Try again later.",
  };
}

async function evaluateRules(
  evt: MessageEvent,
  normalized: string,
  rawText: string,
): Promise<RuleHit | undefined> {
  const db = getDb();

  // 1. New member gate -----------------------------------------------------
  // Cheapest possible rule (integer compare against joinedAt). Runs first
  // so drive-by spam from just-joined members short-circuits before we
  // pay for content normalization, regex matching, or URL extraction.
  // Creation-only — edits don't re-check (see comment in onMessage).
  const ageHit = await evaluateNewMemberGate(evt.userId);
  if (ageHit) return ageHit;

  // 2. Inline rules (content + URL filter + mention spam) -----------------
  // Each looks at "what's IN this message" — text content for the content
  // filter (slur / profanity / custom), URLs for the URL filter, mention
  // count for mention spam. They also run on edits (see onMessage);
  // spam-detection + rate-limit are creation-only because their
  // observations were already counted then.
  const inlineHit = await evaluateInlineRules(
    normalized,
    rawText,
    evt.messageUris,
    evt.referenceMaps,
  );
  if (inlineHit) return inlineHit;

  // 3. Spam detection -------------------------------------------------------
  const spamSettings = await getSpamControl();
  if (spamSettings.enabled && normalized) {
    const windowMs = spamSettings.windowMinutes * 60_000;
    const contentHash = hashContent(normalized);
    const result = await spamRecordAndCheck(
      db,
      evt.userId,
      evt.channelId,
      contentHash,
      Date.now(),
      windowMs,
      spamSettings.threshold,
      spamSettings.scope,
    );
    if (result.isSpam) {
      return {
        rule: RuleType.SPAM_DETECTION,
        matchedTerm: "",
        warnUsers: spamSettings.warnUsers,
        warnText:
          "Repeat-message spam detected; the duplicated message was removed.",
      };
    }
  }

  // 4. Rate limiting --------------------------------------------------------
  const rateSettings = await getRateLimit();
  if (rateSettings.enabled) {
    const windowMs = rateSettings.windowSeconds * 1000;
    const result = await rateRecordAndCheck(
      db,
      evt.userId,
      Date.now(),
      windowMs,
      rateSettings.maxMessages,
    );
    if (result.isOver) {
      return {
        rule: RuleType.RATE_LIMIT,
        matchedTerm: "",
        warnUsers: false, // rate limit warns are not configurable per design
        warnText: "",
      };
    }
  }

  return undefined;
}

async function actOnHit(
  evt: MessageEvent,
  originalText: string,
  hit: RuleHit,
  isEdit: boolean,
): Promise<void> {
  const db = getDb();
  const channelName = getChannelName(evt.channelId);

  const deleted = await tryDeleteMessage(evt.channelId, evt.id);
  if (!deleted) return;

  // Resolve nickname before writing so the audit row freezes the user's
  // community name at the moment of action. Cached lookup; fallback to a
  // short-id placeholder if resolution fails — see nicknameCache.ts.
  // Reused below in postWarning to compose the @mention markup, so we
  // pay the (cached) lookup once.
  const targetNickname = await resolveNickname(evt.userId);
  // Edit-time hits get a leading "[edited] " marker so admins reading the
  // log can distinguish "they posted bad content" from "they edited
  // something clean into bad content" — different signals about intent.
  const messageExcerpt = isEdit ? `[edited] ${originalText}` : originalText;
  await onAuditEntry(db, {
    timestamp: Date.now(),
    action: ActionType.DELETE_MESSAGE,
    rule: hit.rule,
    targetUserId: evt.userId,
    channelId: evt.channelId,
    targetNickname,
    messageExcerpt,
    matchedTerm: hit.matchedTerm,
    manual: false,
    actorUserId: "",
  });

  if (hit.warnUsers && hit.warnText) {
    await postWarning(evt.userId, evt.channelId, targetNickname, hit.warnText);
  }

  log("info", "auto-moderation action", {
    rule: RuleType[hit.rule],
    userId: evt.userId,
    channelId: evt.channelId,
    matchedTerm: hit.matchedTerm || undefined,
    channelName,
    isEdit,
  });
}

async function tryDeleteMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<boolean> {
  const request: ChannelMessageDeleteRequest = { channelId, id: messageId };
  try {
    // Routed through the shared sdkQueue so a spam burst can't blow
    // through the platform's command quota — see lib/sdkQueue.ts.
    await moderationSdkQueue.enqueue(() =>
      rootServer.community.channelMessages.delete(request),
    );
    return true;
  } catch (err) {
    // NotFound: message already deleted (a moderator beat us to it, or the
    // user deleted their own). Treat as success-equivalent — no audit entry.
    if (err instanceof RootApiException) {
      log("warn", "delete failed", {
        channelId,
        messageId,
        errorCode: err.errorCode,
      });
      return false;
    }
    throw err;
  }
}

// Backslash-escape the four CommonMark link delimiters so a nickname
// can't escape its own bracket pair into the link target. Cheap; only
// runs on the warning-post path.
function escapeMarkdownLinkText(s: string): string {
  return s.replace(/[\\\[\]()]/g, (ch) => `\\${ch}`);
}

// Posts a public warning notice gated by a per-user-per-channel cooldown.
// The audit row was already written by the caller; this function deals
// only with the visible channel post.
//
// Composition:
//   "[@<nickname>](root://user/<userId>), <reasonText>"
//
// Mention markup follows the canonical format from
// `api-samples/server-messages/src/mentions.ts` — the platform parses
// `root://user/<id>` URIs as live mentions, so the warned user gets a
// notification + a click-through to their own profile. Without the
// mention markup the warning post is plain text, lacking notification.
async function postWarning(
  userId: UserGuid,
  channelId: ChannelGuid,
  nickname: string,
  reasonText: string,
): Promise<void> {
  if (!shouldPostWarning(userId, channelId)) {
    log("info", "warning post suppressed by cooldown", { userId, channelId });
    return;
  }
  // Defensively escape markdown link delimiters in the nickname text.
  // A nickname like `Foo](root://user/<admin>)` would otherwise split
  // the link and could redirect the mention to a different user. The
  // platform may also sanitize on render, but escaping at the source
  // is cheap insurance.
  const safeNickname = escapeMarkdownLinkText(nickname);
  const content = `[@${safeNickname}](root://user/${userId}), ${reasonText}`;
  const request: ChannelMessageCreateRequest = { channelId, content };
  try {
    await moderationSdkQueue.enqueue(() =>
      rootServer.community.channelMessages.create(request),
    );
    markPosted(userId, channelId);
  } catch (err) {
    // Warning posts are best-effort. The deletion already happened; failing
    // to post the warning shouldn't surface as an error. Don't markPosted
    // on failure — a future violator should still get a fresh chance to
    // see a warning when the SDK recovers.
    log("warn", "warning post failed", {
      channelId,
      ...errFields(err),
    });
  }
}

