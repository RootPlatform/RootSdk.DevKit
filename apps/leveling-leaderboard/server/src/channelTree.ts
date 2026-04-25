import {
  rootServer,
  ChannelGuid,
  ChannelGroupGuid,
  ChannelType,
} from "@rootsdk/server-app";
import { Database } from "./db";
import { listExcludedChannels } from "./excludedChannelsStore";
import { withRetry } from "./lib/retry";
import { pMap } from "./lib/pMap";

// ============================================================================
// channelTree — channel groups + channels with an "excluded" flag for the
// Settings → Channels UI. Requires `community.fullControl` per README.md.
//
// Filters:
//   - Only Text / ThreadedText channels are XP-eligible; Voice and App
//     channels can't carry member chat and shouldn't be exclude-able.
//   - App-owned channels (including this app's own) are hidden — they're
//     part of app UX, not community conversation.
//
// Always fetches fresh from the SDK (not the channelNameCache) because the
// tree needs authoritative current state for admin configuration — a stale
// cached view could hide a newly-created channel from exclusion.
//
// Failure mode is intentionally fail-fast (Promise.all, not allSettled): an
// admin viewing Settings → Channels with one missing group is a confusing
// half-broken UI, so we surface the error to the QueryError boundary in the
// tab and let them retry. Compare channelNameCache, which uses
// Promise.allSettled because partial-degrade-at-startup is preferable to a
// crashed service (channel names render as "unknown" until an event arrives).
// ============================================================================

export interface ChannelNode {
  channelId: ChannelGuid;
  name: string;
  excluded: boolean;
}

export interface ChannelGroupNode {
  channelGroupId: ChannelGroupGuid;
  name: string;
  channels: ChannelNode[];
}

function isXpEligibleChannel(
  channelType: number,
  communityAppId: string | undefined,
): boolean {
  if (communityAppId) return false; // app-owned (including this app itself)
  return (
    channelType === ChannelType.Text || channelType === ChannelType.ThreadedText
  );
}

export async function buildChannelTree(db: Database): Promise<ChannelGroupNode[]> {
  const excluded = new Set<string>(await listExcludedChannels(db));
  const groups = await withRetry("channelGroups.list", () =>
    rootServer.community.channelGroups.list(),
  );

  // Cap concurrent channels.list calls so a community with many groups
  // doesn't burst past the ~20/s query rate limit.
  return pMap(groups, async (group) => {
    const channels = await withRetry(`channels.list(${group.id})`, () =>
      rootServer.community.channels.list({ channelGroupId: group.id }),
    );
    return {
      channelGroupId: group.id,
      name: group.name,
      channels: channels
        .filter((c) => isXpEligibleChannel(c.channelType, c.communityAppId))
        .map((c) => ({
          channelId: c.id,
          name: c.name,
          excluded: excluded.has(c.id),
        })),
    };
  });
}
