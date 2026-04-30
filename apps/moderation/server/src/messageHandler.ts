import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageDeleteRequest,
  ChannelMessageCreateRequest,
  MessageType,
  RootGuidConverter,
  RootGuidType,
  RootApiException,
  ChannelGuid,
  MessageGuid,
} from "@rootsdk/server-app";
import { getDb } from "./db";
import {
  ActionType,
  RuleType,
  WordCategory,
} from "@moderation/gen-shared";
import {
  getContentFilter,
  getSpamControl,
  getRateLimit,
} from "./settingsStore";
import { isMonitored } from "./monitoredChannelsStore";
import {
  getEnabledWords,
} from "./wordListStore";
import {
  BUILTIN_SLURS,
  BUILTIN_PROFANITY,
} from "./builtinWordLists";
import { match, normalize } from "./contentFilter";
import {
  hashContent,
  recordAndCheck as spamRecordAndCheck,
} from "./spamDetector";
import { recordAndCheck as rateRecordAndCheck } from "./rateLimiter";
import { onAuditEntry } from "./auditDispatch";
import { getChannelName } from "./channelNameCache";
import { log, errFields } from "./lib/log";

// messageHandler — the rule pipeline. On every ChannelMessageCreated:
//
//   1. Skip system messages and non-user senders (bots/apps don't get
//      moderated by other apps; bots can spam each other through their own
//      channels).
//   2. Skip channels that aren't monitored.
//   3. Run the rules in design.md's documented order: content filter →
//      spam → rate limit. The first rule to match deletes the message and
//      stops the pipeline. (Running every rule even after a match would
//      double-count metrics and produce duplicate audit entries.)
//   4. Audit log + post a public warning if configured.
//
// Hot-path discipline: cached settings read; in-memory channel name + word
// lists; the only SDK calls are the actual delete and (optionally) the
// warning post — both gated behind a rule match.

export function initializeMessageHandler(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    (evt) => {
      void onMessage(evt).catch((err) => {
        log("error", "messageHandler.onMessage failed", {
          userId: evt.userId,
          channelId: evt.channelId,
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

async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  // Filter out system messages and non-user senders.
  if (evt.messageType === MessageType.System) return;
  if (RootGuidConverter.toRootGuidType(evt.userId) !== RootGuidType.Person) return;
  if (!isMonitored(evt.channelId)) return;

  const text = evt.messageContent ?? "";
  const normalized = normalize(text);

  const hit = await evaluateRules(evt, normalized);
  if (!hit) return;

  await actOnHit(evt, text, hit);
}

async function evaluateRules(
  evt: ChannelMessageCreatedEvent,
  normalized: string,
): Promise<RuleHit | undefined> {
  const db = getDb();

  // 1. Content filter -------------------------------------------------------
  const contentSettings = await getContentFilter();
  if (contentSettings.enabled && normalized) {
    const allowedTerms = await getEnabledWords(db, WordCategory.ALLOWED);
    const ruleLists: string[][] = [];
    if (contentSettings.filterSlurs) ruleLists.push([...BUILTIN_SLURS]);
    if (contentSettings.filterProfanity) ruleLists.push([...BUILTIN_PROFANITY]);
    if (contentSettings.filterCustomWords) {
      ruleLists.push(await getEnabledWords(db, WordCategory.CUSTOM));
    }
    for (const list of ruleLists) {
      const result = match(normalized, list, allowedTerms);
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
  }

  // 2. Spam detection -------------------------------------------------------
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

  // 3. Rate limiting --------------------------------------------------------
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
  evt: ChannelMessageCreatedEvent,
  originalText: string,
  hit: RuleHit,
): Promise<void> {
  const db = getDb();
  const channelName = getChannelName(evt.channelId);

  const deleted = await tryDeleteMessage(evt.channelId, evt.id);
  if (!deleted) return;

  await onAuditEntry(db, {
    timestamp: Date.now(),
    action: ActionType.DELETE_MESSAGE,
    rule: hit.rule,
    targetUserId: evt.userId,
    channelId: evt.channelId,
    targetUsername: "", // resolved client-side via profiles context
    messageExcerpt: originalText,
    matchedTerm: hit.matchedTerm,
    manual: false,
    actorUserId: "",
  });

  if (hit.warnUsers && hit.warnText) {
    await postWarning(evt.channelId, hit.warnText);
  }

  log("info", "auto-moderation action", {
    rule: RuleType[hit.rule],
    userId: evt.userId,
    channelId: evt.channelId,
    matchedTerm: hit.matchedTerm || undefined,
    channelName,
  });
}

async function tryDeleteMessage(
  channelId: ChannelGuid,
  messageId: MessageGuid,
): Promise<boolean> {
  const request: ChannelMessageDeleteRequest = { channelId, id: messageId };
  try {
    await rootServer.community.channelMessages.delete(request);
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

async function postWarning(
  channelId: ChannelGuid,
  text: string,
): Promise<void> {
  const request: ChannelMessageCreateRequest = { channelId, content: text };
  try {
    await rootServer.community.channelMessages.create(request);
  } catch (err) {
    // Warning posts are best-effort. The deletion already happened; failing
    // to post the warning shouldn't surface as an error.
    log("warn", "warning post failed", {
      channelId,
      ...errFields(err),
    });
  }
}

