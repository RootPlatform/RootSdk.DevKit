import {
  rootServer,
  ChannelEvent,
  ChannelCreatedEvent,
  ChannelEditedEvent,
  ChannelDeletedEvent,
  ChannelGuid,
  ChannelGroupGuid,
} from "@rootsdk/server-app";
import { log, errFields } from "./lib/log";
import { withRetry } from "./lib/retry";

// channelNameCache — in-memory channelId → name map populated at startup
// and kept fresh via ChannelEvent subscriptions. Avoids per-message
// channels.get calls that would otherwise burn the ~20/s query rate limit
// on data that changes rarely.
//
// Also captures channelGroupId per channel so the Settings tree view can be
// built without a second SDK call.

interface CachedChannel {
  name: string;
  channelGroupId: ChannelGroupGuid;
}

interface CachedGroup {
  name: string;
}

const channels = new Map<string, CachedChannel>();
const groups = new Map<string, CachedGroup>();

let loading = true;
let buffered: Array<() => void> = [];

function applyOrBuffer(fn: () => void): void {
  if (loading) buffered.push(fn);
  else fn();
}

export function getChannelName(id: ChannelGuid): string {
  return channels.get(id)?.name ?? "unknown";
}

export interface ChannelTreeGroup {
  channelGroupId: ChannelGroupGuid;
  name: string;
  channels: { channelId: ChannelGuid; name: string }[];
}

export function getChannelTree(): ChannelTreeGroup[] {
  const byGroup = new Map<string, ChannelTreeGroup>();
  for (const [groupId, group] of groups) {
    byGroup.set(groupId, {
      channelGroupId: groupId as ChannelGroupGuid,
      name: group.name,
      channels: [],
    });
  }
  for (const [channelId, channel] of channels) {
    const group = byGroup.get(channel.channelGroupId);
    if (group) {
      group.channels.push({
        channelId: channelId as ChannelGuid,
        name: channel.name,
      });
    }
  }
  for (const group of byGroup.values()) {
    group.channels.sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(byGroup.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function initializeChannelNameCache(): Promise<void> {
  const channelsApi = rootServer.community.channels;
  const channelGroupsApi = rootServer.community.channelGroups;

  channelsApi.on(ChannelEvent.ChannelCreated, (evt: ChannelCreatedEvent) => {
    applyOrBuffer(() =>
      channels.set(evt.id, {
        name: evt.name,
        channelGroupId: evt.channelGroupId,
      }),
    );
  });
  channelsApi.on(ChannelEvent.ChannelEdited, (evt: ChannelEditedEvent) => {
    applyOrBuffer(() => {
      const existing = channels.get(evt.id);
      channels.set(evt.id, {
        name: evt.name,
        channelGroupId: existing?.channelGroupId ?? evt.channelGroupId,
      });
    });
  });
  channelsApi.on(ChannelEvent.ChannelDeleted, (evt: ChannelDeletedEvent) => {
    applyOrBuffer(() => channels.delete(evt.id));
  });

  let groupList: Awaited<ReturnType<typeof channelGroupsApi.list>>;
  try {
    groupList = await withRetry("channelGroups.list", () =>
      channelGroupsApi.list(),
    );
  } catch (err) {
    log(
      "error",
      "channelNameCache: channelGroups.list failed; empty cache",
      errFields(err),
    );
    loading = false;
    for (const fn of buffered) fn();
    buffered = [];
    return;
  }

  for (const g of groupList) {
    groups.set(g.id, { name: g.name });
    try {
      const list = await withRetry(`channels.list(${g.id})`, () =>
        channelsApi.list({ channelGroupId: g.id }),
      );
      for (const c of list) {
        channels.set(c.id, { name: c.name, channelGroupId: g.id });
      }
    } catch (err) {
      log(
        "error",
        "channelNameCache: channels.list failed for group",
        { groupId: g.id, ...errFields(err) },
      );
      // Continue — affected channels will render as "unknown" until their
      // next ChannelEdited event.
    }
  }

  for (const fn of buffered) fn();
  buffered = [];
  loading = false;

  log("info", "channelNameCache populated", {
    channelCount: channels.size,
    groupCount: groups.size,
  });
}
