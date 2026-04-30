import {
  rootServer,
  UserGuid,
  CommunityMember,
  CommunityMemberEvent,
  UserSetProfileEvent,
} from "@rootsdk/server-app";
import { log } from "./lib/log";

// memberCache — userId → CommunityMember slice (nickname + joinedAt) for
// the audit-write path AND new-member-gate rule.
//
// Why we cache: every audit row gets a frozen-at-time-of-action nickname,
// and the new-member-gate rule needs joinedAt on every message that
// reaches the rule pipeline. Both come from a single SDK call —
// `rootServer.community.communityMembers.get({ userId })` returns the
// CommunityMember whose `nickname` and `joinedAt` we need (the canonical
// resolver, per api-samples/server-members and apps/tic-tac-toe →
// getNickname). Without a cache, a spam burst from one user drives many
// audit-writes + age checks; one SDK call per resolve, both pieces of
// data populated together.
//
// "Nickname is username." In Root's product vocabulary, what users see
// in chat IS the username, even though the server SDK type calls it
// `nickname` (the field is per-community). We use the SDK term in code
// to teach the underlying API; the user-facing UI copy says "Username"
// to match what admins recognize.
//
// "joinedAt is community-join time." NOT global Root account creation —
// the SDK doesn't expose that. Community-join age is the right signal
// for moderation anyway: drive-by spam comes from "just joined and
// immediately spammed," not "old account first joined this community."
//
// Invalidation strategy:
//   - UserSetProfile event evicts the cache entry. The event carries
//     the new global username + profile picture; nicknames are often
//     refreshed alongside, so the safest move is to evict and re-fetch.
//   - There is no CommunityMemberEdited event in the current SDK
//     (CommunityMemberEvent only exposes UserSetProfile + Attach +
//     Detach). A pure-nickname change without a profile event would
//     leave a stale entry; the TTL below caps that staleness.
//   - TTL_MS bounds worst-case staleness regardless of event coverage.
//     Set to 60s — long enough to absorb any plausible burst, short
//     enough that a missed nickname-only change is corrected within a
//     minute. Audit log entries already written are intentionally
//     frozen with their at-the-time nickname; this only affects
//     entries written *after* a nickname change. joinedAt is
//     effectively immutable once a user is in the community, so the
//     TTL doesn't matter for that field — every refetch returns the
//     same value.
//
// Memory-bounding: periodic sweep + LRU cap (see storeEntry). Without
// these, a long-running app moderating many distinct users would
// accumulate entries indefinitely.
//
// Cold-start trade-off: lazy. First moderation event for each unique
// user pays one SDK round-trip on the audit-write path (after deletion,
// so it doesn't delay the deletion). Priming via communityMembers.list
// at startup would shift cost to startup, potentially expensive for
// large communities. We pick lazy.

const TTL_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_ENTRIES = 5_000;

interface CacheEntry {
  nickname: string;
  // ms epoch. undefined when the SDK didn't return a joinedAt (the type
  // is optional). Callers needing age gating treat undefined as
  // fail-open (don't gate; missing data shouldn't lock out a member).
  joinedAt: number | undefined;
  expiresAt: number;
}

// Map iteration order is insertion order, which we exploit for the LRU
// cap below — `cache.set` after `cache.delete` re-inserts at the end,
// making the first key the oldest-touched.
const cache = new Map<string, CacheEntry>();
let sweepTimer: ReturnType<typeof setInterval> | undefined;

export function initializeMemberCache(): void {
  rootServer.community.communityMembers.on(
    CommunityMemberEvent.UserSetProfile,
    (evt: UserSetProfileEvent) => {
      // The event doesn't carry the new community nickname, so we
      // can't update in place — evict and let the next caller re-fetch.
      cache.delete(evt.userId);
    },
  );
  sweepTimer = setInterval(sweepExpired, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

function sweepExpired(): void {
  const now = Date.now();
  for (const [userId, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(userId);
  }
}

// Internal: get-or-fetch a single CommunityMember slice, populating both
// nickname and joinedAt. `resolveNickname` and `resolveJoinedAt` both
// route through this so a burst of message events for one user pays one
// SDK call total, not one per field accessed.
async function getOrFetch(
  userId: UserGuid,
): Promise<{ nickname: string; joinedAt: number | undefined }> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) {
    return { nickname: cached.nickname, joinedAt: cached.joinedAt };
  }
  let member: CommunityMember | undefined;
  try {
    member = await rootServer.community.communityMembers.get({ userId });
  } catch (err) {
    // Member not found, network error, etc. We still cache a fallback
    // nickname so subsequent reads don't re-attempt — but we don't
    // store joinedAt (undefined), so the age gate fails open.
    log("warn", "communityMembers.get failed; using fallback", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    const fallback = fallbackName(userId);
    storeEntry(userId, fallback, undefined, now);
    return { nickname: fallback, joinedAt: undefined };
  }
  const nickname = member.nickname || fallbackName(userId);
  const joinedAt = member.joinedAt ? member.joinedAt.getTime() : undefined;
  storeEntry(userId, nickname, joinedAt, now);
  return { nickname, joinedAt };
}

// Resolve a userId to its current community nickname. Returns a short
// fallback ("user 8c4a…") when the lookup fails or returns an empty
// nickname. Never throws — callers want a usable string for the audit
// row's persisted name field, not exception handling.
export async function resolveNickname(userId: UserGuid): Promise<string> {
  return (await getOrFetch(userId)).nickname;
}

// Resolve a userId to its community-join time (ms epoch). Returns
// undefined when the SDK doesn't expose joinedAt for this member or
// the lookup failed. Callers gating on age should treat undefined as
// fail-open (don't gate) — missing data shouldn't lock out legitimate
// members; the alternative produces false positives that are hard to
// debug.
export async function resolveJoinedAt(
  userId: UserGuid,
): Promise<number | undefined> {
  return (await getOrFetch(userId)).joinedAt;
}

// LRU-bounded set: re-insert moves the entry to the end of the Map's
// iteration order, so the first key is the least-recently-touched and
// is dropped when we exceed MAX_ENTRIES. Bounded by SDK-call rate
// rather than time, so a steady stream of unique users still fits.
function storeEntry(
  userId: string,
  nickname: string,
  joinedAt: number | undefined,
  now: number,
): void {
  cache.delete(userId);
  cache.set(userId, { nickname, joinedAt, expiresAt: now + TTL_MS });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

function fallbackName(userId: string): string {
  // Truncated short-ID with a "user " prefix so an admin reading the log
  // can see this row's user wasn't resolvable, distinct from a real
  // nickname like "user_42" that a person might have set.
  return `user ${userId.slice(0, 8)}…`;
}
