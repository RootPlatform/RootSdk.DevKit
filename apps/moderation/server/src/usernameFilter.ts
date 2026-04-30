import {
  rootServer,
  CommunityMemberEvent,
  UserSetProfileEvent,
  CommunityMemberAttachEvent,
  RootApiException,
  UserGuid,
} from "@rootsdk/server-app";
import { ActionType, RuleType, WordCategory } from "@moderation/gen-shared";
import { getDb } from "./db";
import { getUsernameFilter } from "./settingsStore";
import { isExempt } from "./exemptMembers";
import { getCompiledPattern } from "./wordListStore";
import {
  BUILTIN_SLUR_PATTERN,
  BUILTIN_PROFANITY_PATTERN,
} from "./builtinWordLists";
import { matchCompiled, normalize } from "./contentFilter";
import { resolveNickname } from "./memberCache";
import { onAuditEntry } from "./auditDispatch";
import { moderationSdkQueue } from "./lib/sdkQueue";
import { log, errFields } from "./lib/log";

// usernameFilter — matches member nicknames against the same compiled-
// regex matchers the content filter uses (slurs / profanity / custom +
// allowed-words cancellation). On match the member is banned via
// communityMemberBans.create; an audit row is written with
// RuleType.USERNAME_FILTER so admins can see what triggered.
//
// Two events drive evaluation:
//   - UserSetProfile: the global username changed. The community
//     nickname often updates alongside; we re-fetch + check. This is a
//     GLOBAL event — fires for every Root user's profile update, not
//     just members of this community. communityMembers.get throws for
//     non-members (resolveNickname returns the short-id fallback which
//     never matches a real rule), so the work short-circuits cheaply.
//   - CommunityMemberAttach: a member opens the community on a device.
//     Catches a violating nickname picked up at first attach (e.g. a
//     newly-joined member with a slur as their nickname). Fires PER
//     DEVICE — see dedup note below.
//
// Multi-event dedup: the same user can drive both UserSetProfile +
// multiple CommunityMemberAttach (one per device) within seconds.
// Without dedup, each fire writes a duplicate audit row + attempts a
// (no-op) ban. A short-lived per-userId "recently evaluated" cache
// collapses the burst. The cache key is just the userId — a user's
// nickname can't change faster than this window in any realistic UX.
//
// Existing-member coverage: the filter only triggers on changes /
// attaches AFTER it's enabled. A member already in the community with
// a violating nickname won't be re-evaluated until they next attach.
// In practice attach fires whenever a session reconnects (network
// blips, app restarts, browser refreshes), so coverage is near-complete
// for active users; perma-online users with a stable connection are
// the edge case.
//
// The actual matching uses the SDK's communityMembers.get to read the
// current per-community nickname, NOT the event's `username` field
// (which is the global handle — different concept; see DESIGN.md →
// "Audit log nicknames"). We delegate to nicknameCache.resolveNickname
// so the read is cached and the resulting nickname is identical to
// what the audit row will record.
//
// Action: BAN. The first-party Moderation app shipped a "ban or flag"
// configurable, but flag wasn't UI-surfaced; we keep the action surface
// narrow (ban only) for clarity. A forking agent who wants an audit-
// only tier can extend `UsernameFilterSettings` and the action branch
// here.
//
// Exempt members bypass the same way the message pipeline bypasses —
// the exempt picker is a single trust boundary across all rules.

// Per-userId dedup: bursts of UserSetProfile + multi-device Attach for
// the same user collapse to a single evaluation.
//
// Window: 5 seconds. Sized to absorb a realistic event burst —
// UserSetProfile + multi-device CommunityMemberAttach for the same user
// can fire within hundreds of ms of each other when a profile changes
// or a session reconnects across phone + desktop simultaneously.
// Five seconds is comfortably above that and well below any plausible
// human-driven re-rename interval (a person editing their nickname
// twice within five seconds is implausible — they're likely the same
// edit, retried). A future malicious-actor scenario where someone
// scripts rapid renames would defeat this window, but at that point
// the right defense is rate-limiting at the platform level, not per-app.
const RECENT_WINDOW_MS = 5_000;
const RECENT_MAX_ENTRIES = 1_000;
const recentlyEvaluated = new Map<string, number>();

function shouldEvaluate(userId: string): boolean {
  const last = recentlyEvaluated.get(userId);
  if (last !== undefined && Date.now() - last < RECENT_WINDOW_MS) {
    return false;
  }
  recentlyEvaluated.delete(userId);
  recentlyEvaluated.set(userId, Date.now());
  if (recentlyEvaluated.size > RECENT_MAX_ENTRIES) {
    const oldest = recentlyEvaluated.keys().next().value;
    if (oldest !== undefined) recentlyEvaluated.delete(oldest);
  }
  return true;
}

export function initializeUsernameFilter(): void {
  rootServer.community.communityMembers.on(
    CommunityMemberEvent.UserSetProfile,
    (evt: UserSetProfileEvent) => {
      void evaluateUser(evt.userId, "user.set.profile").catch((err) =>
        log("error", "usernameFilter UserSetProfile failed", {
          userId: evt.userId,
          ...errFields(err),
        }),
      );
    },
  );
  rootServer.community.communityMembers.on(
    CommunityMemberEvent.CommunityMemberAttach,
    (evt: CommunityMemberAttachEvent) => {
      void evaluateUser(evt.userId, "communityMember.attach").catch((err) =>
        log("error", "usernameFilter CommunityMemberAttach failed", {
          userId: evt.userId,
          ...errFields(err),
        }),
      );
    },
  );
}

async function evaluateUser(userId: UserGuid, source: string): Promise<void> {
  const settings = await getUsernameFilter();
  if (!settings.enabled) return;
  // Dedup BEFORE the exempt + nickname-resolve calls so an event burst
  // for one user doesn't drag the SDK through redundant lookups.
  if (!shouldEvaluate(userId)) return;
  if (await isExempt(userId)) return;

  const nickname = await resolveNickname(userId);
  const normalized = normalize(nickname);
  if (!normalized) return;

  const db = getDb();
  const allowedPattern = await getCompiledPattern(db, WordCategory.ALLOWED);
  // Same matcher set the content filter uses. Custom words contribute
  // to nickname enforcement too — admins maintaining a "no calling
  // yourself X" community list get it for free.
  const patterns: (RegExp | undefined)[] = [
    BUILTIN_SLUR_PATTERN,
    BUILTIN_PROFANITY_PATTERN,
    await getCompiledPattern(db, WordCategory.CUSTOM),
  ];
  let matchedTerm: string | undefined;
  for (const pattern of patterns) {
    const result = matchCompiled(normalized, pattern, allowedPattern);
    if (result) {
      matchedTerm = result.matchedTerm;
      break;
    }
  }
  if (!matchedTerm) return;

  log("info", "usernameFilter triggered", {
    userId,
    matchedTerm,
    source,
  });

  try {
    await moderationSdkQueue.enqueue(() =>
      rootServer.community.communityMemberBans.create({
        userId,
        reason: `Nickname matched moderation filter (${matchedTerm})`,
      }),
    );
  } catch (err) {
    // If the ban call fails we still want the audit row so admins know
    // the filter triggered — same logic as messageHandler keeping the
    // audit even when delete fails. NotFound (already banned) is an
    // expected case during overlapping events; log it as info.
    if (err instanceof RootApiException) {
      log("warn", "usernameFilter ban failed", {
        userId,
        errorCode: err.errorCode,
      });
    } else {
      throw err;
    }
  }

  await onAuditEntry(db, {
    timestamp: Date.now(),
    action: ActionType.BAN,
    rule: RuleType.USERNAME_FILTER,
    targetUserId: userId,
    targetNickname: nickname,
    // Excerpt mirrors what the other automated rules write: a human-
    // readable one-liner so the audit table is legible without
    // cross-referencing the matched_term column.
    messageExcerpt: `Banned for nickname containing "${matchedTerm}"`,
    matchedTerm,
    manual: false,
    actorUserId: "",
  });
}
