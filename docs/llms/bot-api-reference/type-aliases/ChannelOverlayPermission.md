---
path: bot-api-reference/type-aliases/ChannelOverlayPermission.md
audience: bot
category: reference
summary: Defines permission overrides for channel-level operations. Used in access rules to grant or deny specific permissions to roles or members on...
---

> **ChannelOverlayPermission** = `object`

Defines permission overrides for channel-level operations. Used in access rules to grant or deny specific permissions to roles or members on individual channels or channel groups.

Unlike `ChannelPermission` where all properties are boolean, `ChannelOverlayPermission` uses nullable booleans (via `BoolValue`). This allows three states for each permission: `true` (explicitly allowed), `false` (explicitly denied), or `undefined` (inherit from role).

## Properties

### channelAppKick?

> `optional` **channelAppKick**: `boolean`

Permission to remove apps from app channels.

### channelCreateFile?

> `optional` **channelCreateFile**: `boolean`

Permission to upload files to file channels.

### channelCreateMessage?

> `optional` **channelCreateMessage**: `boolean`

Permission to send messages in the channel.

### channelCreateMessageAttachment?

> `optional` **channelCreateMessageAttachment**: `boolean`

Permission to attach files to messages.

### channelCreateMessageMention?

> `optional` **channelCreateMessageMention**: `boolean`

Permission to mention users, roles, or

#### Everyone

in messages.

### channelCreateMessageReaction?

> `optional` **channelCreateMessageReaction**: `boolean`

Permission to add reactions to messages.

### channelDeleteMessageOther?

> `optional` **channelDeleteMessageOther**: `boolean`

Permission to delete messages sent by other users.

### channelFullControl?

> `optional` **channelFullControl**: `boolean`

Grants all channel permissions. Overrides all other channel permissions when set to `true`.

### channelMakeMessagePublic?

> `optional` **channelMakeMessagePublic**: `boolean`

Permission to make messages publicly visible outside the community.

### channelManageFiles?

> `optional` **channelManageFiles**: `boolean`

Permission to manage (edit, delete) files uploaded by other users.

### channelManagePinnedMessages?

> `optional` **channelManagePinnedMessages**: `boolean`

Permission to pin and unpin messages in the channel.

### channelMoveUserOther?

> `optional` **channelMoveUserOther**: `boolean`

Permission to move other users between voice channels.

### channelUseExternalEmoji?

> `optional` **channelUseExternalEmoji**: `boolean`

Permission to use emoji from other communities in messages.

### channelVideoStreamMedia?

> `optional` **channelVideoStreamMedia**: `boolean`

Permission to stream video or share screen in voice channels.

### channelView?

> `optional` **channelView**: `boolean`

Permission to view the channel in the channel list and see its basic information.

### channelViewFile?

> `optional` **channelViewFile**: `boolean`

Permission to view and download files in file channels.

### channelViewMessageHistory?

> `optional` **channelViewMessageHistory**: `boolean`

Permission to view message history in the channel.

### channelVoiceDeafenOther?

> `optional` **channelVoiceDeafenOther**: `boolean`

Permission to deafen other users in voice channels.

### channelVoiceKick?

> `optional` **channelVoiceKick**: `boolean`

Permission to disconnect other users from voice channels.

### channelVoiceMuteOther?

> `optional` **channelVoiceMuteOther**: `boolean`

Permission to mute other users in voice channels.

### channelVoiceTalk?

> `optional` **channelVoiceTalk**: `boolean`

Permission to speak in voice channels.