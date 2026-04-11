---
path: bot-docs/develop/guids.md
audience: bot
category: guide
summary: Identify entities in the Root SDK using typed, base64-encoded string identifiers.
---

# GUIDs

Identify entities in the Root SDK using typed, base64-encoded string identifiers.

## What are GUIDs?

Every entity in Root (users, channels, communities, messages, etc.) has a unique identifier called a GUID (globally unique identifier). At runtime, a GUID is a base64-encoded string. At compile time, each GUID type is branded with a `RootGuidType` so TypeScript can catch misuse. For example, `channels.delete()` requires a `ChannelGuid`; passing a `UserGuid` is a type error even though both are strings at runtime.

## GUID types

Each entity type has its own branded GUID type. All extend `RootGuid`, the base type.

| Type | Identifies | `RootGuidType` |
|------|-----------|----------------|
| `UserGuid` | A user, app, or bot account | `Person` or `App` |
| `CommunityGuid` | A community | `Community` |
| `ChannelGuid` | A channel | `Channel` |
| `ChannelGroupGuid` | A channel group | `ChannelGroup` |
| `CommunityRoleGuid` | A role within a community | `CommunityRole` |
| `CommunityAppGuid` | An app or bot installed in a community | `CommunityApp` |
| `AppGuid` | An app or bot | `App` |
| `MessageGuid` | A message | `Message` |
| `DirectoryGuid` | A file directory | `Directory` |
| `FileGuid` | A file | `File` |
| `AssetGuid` | An uploaded asset (image, video, file) | `Asset` |
| `EmojiGuid` | A custom emoji | `Emoji` |
| `DeviceGuid` | A user's device | `Desktop` or `Mobile` |
| `CommunityMemberBanGuid` | A member ban record | `CommunityMemberBan` |
| `CommunityMemberInviteGuid` | A community invite | `CommunityMemberInvite` |
| `CustomMemberGroupGuid` | A custom member group | `CustomMemberGroup` |

### Compound types

Some GUID types accept multiple entity kinds:

| Type | Accepts | Use case |
|------|---------|----------|
| `RoleOrMemberGuid` | Roles, users, apps, or bots | Access rules that target either a role or a specific member |
| `ChannelOrChannelGroupGuid` | Channels or channel groups | Operations that apply to either |
| `UserGuid` | Users, apps, or bots | Users, apps, and bots can all author messages and hold permissions |
| `DeviceGuid` | Desktop or mobile devices | WebRTC and presence events identify devices |

### Special values

- **`EmptyGuid`**: The zero-value GUID (`"AAAAAAAAAAAAAAAAAAAAAA"`). Use when a GUID field is required but no entity exists.
- **`UnknownGuid`**: A GUID whose type could not be determined.

## GUID formats

You may notice that GUIDs in the Root SDK look different from the UUIDs you see in other systems. Both formats represent the same identifier, just encoded differently.

The **long format** is the standard UUID that most developers are familiar with: 32 hexadecimal characters separated by hyphens.

```
550e8400-e29b-41d4-a716-446655440000
```

The **short format** is a base64 encoding of the same value, a standard technique for representing binary data in a compact, URL-safe string. The Root SDK uses the short format for all GUID properties, parameters, and events.

```
ACTAwpQAgAuAAAAAAAAAAQ
```

### Convert between formats

Use `RootGuidUtils` to convert between the two formats:

```ts
import { RootGuidUtils } from "@rootsdk/server-bot";

// Short to long
const uuid = RootGuidUtils.toUuidString(someGuid);

// Long to short
const bytes = RootGuidUtils.stringToUint8Array(uuid);
const guid = RootGuidUtils.toStringFromArray(bytes);
```

You typically need the long format when storing GUIDs in an external database, displaying them in logs, or passing them to third-party APIs that expect standard UUIDs.

## Inspect GUIDs

`RootGuidUtils` provides static methods to inspect GUIDs.

### Determine the entity type

```ts
import { RootGuidUtils, RootGuidType } from "@rootsdk/server-bot";

const guidType = RootGuidUtils.toRootGuidType(someGuid);
if (guidType === RootGuidType.Channel) {
  // It's a channel
}
```

### Extract a timestamp

Root GUIDs encode the time they were created:

```ts
import { RootGuidUtils } from "@rootsdk/server-bot";

const ms = RootGuidUtils.toMilliseconds(someGuid);
```

The returned value is milliseconds since an internal epoch. Use it to compare the relative age of two GUIDs or to sort entities by creation time.

## Well-known GUIDs

`WellKnownRootGuids` provides constants for system-defined entities:

```ts
import { WellKnownRootGuids } from "@rootsdk/server-bot";

// The @everyone role that all community members belong to
const everyoneRoleId = WellKnownRootGuids.CommunityRoles.EveryoneRole;
```