import {
  rootServer,
  ChannelEvent,
  ChannelCreatedEvent,
  ChannelEditedEvent,
  ChannelDeletedEvent,
  ChannelGuid,
} from "@rootsdk/server-app";
import { log, errFields } from "./lib/log";
import { withRetry } from "./lib/retry";
import { pMapSettled } from "./lib/pMap";

// ============================================================================
// channelNameCache — in-memory channelId → name map, populated at startup and
// kept fresh via ChannelEvent subscriptions. Replaces per-message/per-response
// `channels.get` calls that would otherwise burn the ~20/s query rate limit
// on data that changes rarely.
//
// Hot-path callers (messageHandler, leaderboardService.getMyStats) use
// `getChannelName(id)` — synchronous, O(1), zero SDK calls after startup.
//
// Load-race handling:
// Subscribing BEFORE the initial list isn't enough on its own. If a
// ChannelEdited fires AFTER list() resolved with the old name but BEFORE we
// iterate the result into the cache, the event's newer name is clobbered by
// the list's stale value. We fix this by buffering event mutations while
// `loading === true`, then applying them AFTER the list results. That makes
// the last-write order correct: list (oldest) → buffered events → live events.
// ============================================================================

const cache = new Map<string, string>();

// Returns the cached name, or "unknown" if the channel ID is not in cache.
// The latter occurs briefly for channels created between startup `list()` and
// their ChannelCreated event, or after ChannelDeleted.
export function getChannelName(id: ChannelGuid): string {
  return cache.get(id) ?? "unknown";
}

// --- Internal load state ---------------------------------------------------

let loading = true;
let buffered: Array<() => void> = [];

function applyOrBuffer(fn: () => void): void {
  if (loading) buffered.push(fn);
  else fn();
}

export async function initializeChannelNameCache(): Promise<void> {
  const channels = rootServer.community.channels;
  const channelGroups = rootServer.community.channelGroups;

  // Subscribe BEFORE the initial load so events during the load are captured.
  // Handlers route through applyOrBuffer so in-flight edits land AFTER the
  // list-result writes when the load finishes.
  channels.on(ChannelEvent.ChannelCreated, (evt: ChannelCreatedEvent) => {
    applyOrBuffer(() => cache.set(evt.id, evt.name));
  });
  channels.on(ChannelEvent.ChannelEdited, (evt: ChannelEditedEvent) => {
    applyOrBuffer(() => cache.set(evt.id, evt.name));
  });
  channels.on(ChannelEvent.ChannelDeleted, (evt: ChannelDeletedEvent) => {
    applyOrBuffer(() => cache.delete(evt.id));
  });
  // ChannelMoved does not change the channel's name, so no cache update needed.

  // Top-level channelGroups.list is soft-failed to match per-group degradation.
  // If it fails, we start with an empty cache and rely on live ChannelCreated/
  // ChannelEdited events to populate over time. Names for pre-existing channels
  // render as "unknown" until the user triggers an edit. Acceptable degradation;
  // crashing startup on a single SDK call would be much worse.
  let groups: Awaited<ReturnType<typeof channelGroups.list>>;
  try {
    groups = await withRetry("channelGroups.list", () => channelGroups.list());
  } catch (err) {
    log("error", "channelNameCache: channelGroups.list failed; empty cache", errFields(err));
    loading = false;
    // Drain any buffered events into the empty cache so future reads see them.
    for (const fn of buffered) fn();
    buffered = [];
    return;
  }

  // Per-group list uses pMapSettled so a single failing group doesn't
  // prevent the entire app from starting (affected channels render as
  // "unknown" until their next ChannelEdited event), AND concurrent
  // channels.list calls are capped under the ~20/s query rate limit so
  // a community with many groups doesn't burst into retry/backoff at
  // every startup.
  const results = await pMapSettled(groups, async (g) => {
    const list = await withRetry(`channels.list(${g.id})`, () =>
      channels.list({ channelGroupId: g.id }),
    );
    for (const c of list) cache.set(c.id, c.name);
    return g.id;
  });

  // Drain buffered events AFTER list-result writes. These are newer than the
  // list snapshot so their values win. No events fire between the last drain
  // call and `loading = false` — JS is single-threaded and the for-loop is
  // synchronous.
  for (const fn of buffered) fn();
  buffered = [];
  loading = false;

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    log("error", "channelNameCache: some groups failed to load", {
      failedCount: failed.length,
      totalGroups: groups.length,
    });
  }
  log("info", "channelNameCache populated", {
    channelCount: cache.size,
    loadedGroups: groups.length - failed.length,
    totalGroups: groups.length,
  });
}
