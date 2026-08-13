---
path: app-api-reference/client/enumerations/RootGuidType.md
audience: app
category: reference
summary: Enum identifying the entity type encoded in a Root GUID. Used to brand GUID types at compile time and to inspect GUIDs at runtime via...
---

Enum identifying the entity type encoded in a Root GUID. Used to brand GUID types at compile time and to inspect GUIDs at runtime via `RootGuidUtils.toRootGuidType()`.

## Enumeration Members

### App

> **App**: `9`

An app or bot. Both apps and bots share this type.

### AppOrganization

> **AppOrganization**: `28`

The organization that owns and publishes apps and bots.

### AppVersion

> **AppVersion**: `32`

A published version of an app or bot, including its manifest, permissions, and client assets.

### Asset

> **Asset**: `27`

An uploaded file (image, video, or document). Contains the actual file data and download URLs.

### Badge

> **Badge**: `34`

A profile badge displayed on a user's account (e.g., Beta Tester, Verified Developer).

### BillingCore

> **BillingCore**: `41`

### Channel

> **Channel**: `4`

A channel within a community.

### ChannelGroup

> **ChannelGroup**: `5`

A channel group within a community.

### CommandIdempotency

> **CommandIdempotency**: `30`

An internal deduplication key used to ensure commands are not executed more than once. Not exposed to developers.

### Community

> **Community**: `2`

A community.

### CommunityApp

> **CommunityApp**: `29`

An app or bot installed in a specific community.

### CommunityLog

> **CommunityLog**: `26`

An entry in a community's audit log.

### CommunityMember

> **CommunityMember**: `31`

A user's membership in a specific community. Distinct from `Person`, which identifies the user account itself. A single user has one `Person` GUID but a separate `CommunityMember` for each community they belong to.

### CommunityMemberBan

> **CommunityMemberBan**: `24`

A ban record preventing a user from accessing a community.

### CommunityMemberInvite

> **CommunityMemberInvite**: `10`

An invitation to join a community.

### CommunityMemberRole

> **CommunityMemberRole**: `21`

A role assignment linking a member to a role within a community.

### CommunityRole

> **CommunityRole**: `11`

A role defined within a community (e.g., Moderator, Admin).

### CommunityRoleMap

> **CommunityRoleMap**: `25`

A permission mapping between a channel or channel group and a role or member. Defines what permissions a role or member has in a specific channel.

### CustomMemberGroup

> **CustomMemberGroup**: `225`

A custom member group defined within a community.

### CustomResource

> **CustomResource**: `224`

Reserved for app developers to create custom entity types within their applications.

### Desktop

> **Desktop**: `18`

A desktop device connected to Root.

### DirectMessage

> **DirectMessage**: `15`

A direct message conversation between users.

### DirectMessageMember

> **DirectMessageMember**: `16`

A participant in a direct message conversation.

### Directory

> **Directory**: `13`

A directory within a channel's file storage.

### Emoji

> **Emoji**: `35`

A custom emoji uploaded to a community.

### Exception

> **Exception**: `20`

A server-side error record. Not exposed to developers.

### File

> **File**: `12`

A file stored in a channel directory.

### Message

> **Message**: `3`

A message in a channel.

### MessageAttachment

> **MessageAttachment**: `14`

A reference linking a message to an asset. Stores metadata like filename and MIME type. The actual file data is stored in the associated `Asset`.

### Mobile

> **Mobile**: `19`

A mobile device connected to Root.

### Person

> **Person**: `1`

A user account. Distinct from `CommunityMember`, which represents a user's membership in a specific community.

### Product

> **Product**: `37`

### ProductPrice

> **ProductPrice**: `38`

### Subscription

> **Subscription**: `39`

### Unknown

> **Unknown**: `0`

The entity type could not be determined.