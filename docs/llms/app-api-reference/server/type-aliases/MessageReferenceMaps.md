---
path: app-api-reference/server/type-aliases/MessageReferenceMaps.md
audience: app
category: reference
summary: Contains resolved display names for all references in a message, including user mentions, channel mentions, role mentions, and file attachments.
---

> **MessageReferenceMaps** = `object`

Contains resolved display names for all references in a message, including user mentions, channel mentions, role mentions, and file attachments.

## Properties

### assets?

> `optional` **assets?**: `object`

Map of general asset URIs to their metadata. Keys are `root://asset/{id}` URIs. Use this to display file attachment information.

#### Index Signature

[`key`: `string`]: [`AssetInformation`](AssetInformation.md)

### channels

> **channels**: [`MessageReferenceMapChannel`](MessageReferenceMapChannel.md)[]

Array of channels mentioned in the message. Each entry maps a channel ID to its current name.

### imageAssets?

> `optional` **imageAssets?**: `object`

Map of image asset URIs to their metadata. Keys are `root://asset/{id}` URIs. Use this to display image previews or thumbnails.

#### Index Signature

[`key`: `string`]: [`AssetImage`](AssetImage.md)

### roles

> **roles**: [`MessageReferenceMapCommunityRole`](MessageReferenceMapCommunityRole.md)[]

Array of roles mentioned in the message. Each entry maps a role ID to its current name. Includes `@All` and `@Here` mentions.

### users

> **users**: [`MessageReferenceMapUser`](MessageReferenceMapUser.md)[]

Array of users mentioned in the message. Each entry maps a user ID to their current display name.