---
path: app-api-reference/server/type-aliases/ChannelPermission.md
audience: app
category: reference
summary: Permissions that control actions on a specific channel or its contents.
---

> **ChannelPermission** = `object`

Permissions that control actions on a specific channel or its contents.

## Properties

### channelAppKick

> **channelAppKick**: `boolean`

Remove apps or members from an app channel.

### channelCreateFile

> **channelCreateFile**: `boolean`

Create new files in channels.

### channelCreateMessage

> **channelCreateMessage**: `boolean`

Create, read, edit, and delete your own messages, and read messages sent by other members.

### channelCreateMessageAttachment

> **channelCreateMessageAttachment**: `boolean`

Attach or include files in your messages.

### channelCreateMessageMention

> **channelCreateMessageMention**: `boolean`

Mention other members in your messages.

### channelCreateMessageReaction

> **channelCreateMessageReaction**: `boolean`

Add or remove your own reactions to messages.

### channelDeleteMessageOther

> **channelDeleteMessageOther**: `boolean`

Delete messages sent by other members.

### channelFullControl

> **channelFullControl**: `boolean`

Grants all channel permissions.

### channelMakeMessagePublic

> **channelMakeMessagePublic**: `boolean`

Convert private messages into public messages.

### channelManageFiles

> **channelManageFiles**: `boolean`

View, create, edit, rename, and delete files and folders in channels.

### channelManagePinnedMessages

> **channelManagePinnedMessages**: `boolean`

Pin or unpin messages in channels.

### channelMoveUserOther

> **channelMoveUserOther**: `boolean`

Move members between voice channels.

### channelUseExternalEmoji

> **channelUseExternalEmoji**: `boolean`

Use custom emojis from other communities.

### channelVideoStreamMedia

> **channelVideoStreamMedia**: `boolean`

Stream video, use video chat, and share your screen in channels.

### channelView

> **channelView**: `boolean`

View channels and their content within a community.

### channelViewFile

> **channelViewFile**: `boolean`

Read files and folders shared in channels.

### channelViewMessageHistory

> **channelViewMessageHistory**: `boolean`

Read all past messages in a channel, including those sent before you joined the community.

### channelVoiceDeafenOther

> **channelVoiceDeafenOther**: `boolean`

Deafen other users in voice channels, preventing them from hearing audio and unmuting their speakers.

### channelVoiceKick

> **channelVoiceKick**: `boolean`

Remove a member from a voice channel.

### channelVoiceMuteOther

> **channelVoiceMuteOther**: `boolean`

Mute other users in voice channels, preventing them from speaking or unmuting their microphone.

### channelVoiceTalk

> **channelVoiceTalk**: `boolean`

Speak in voice channels.