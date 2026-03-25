---
path: bot-docs/configure/manifest-permissions.md
audience: bot
category: guide
summary: Permissions control which parts of the Root Community API your code is able to use.
---

# Manifest `permissions`

Permissions control which parts of the Root Community API your code is able to use.

Declare your permissions in the `permissions` section of your manifest. All permissions default to `false`; set the ones you need to `true`.

## Details

|                |                |
| -------------- | -------------- |
| **Name**       | `permissions` |
| **Type**       | `object`      |
| **Required**   | No            |

## Available permissions

The following table lists all the permissions that you can include in your manifest. They're divided into two categories based on where they apply: community and channel.

### Community permissions

| Permission | Description | Default |
| ---------- | ----------- | ------- |
| `manageCommunity` | Manage overall community settings. | `false` |
| `manageRoles` | Create or update community roles. | `false` |
| `manageEmojis` | Upload or remove custom emojis. | `false` |
| `createInvite` | Generate new community invites. | `false` |
| `manageInvites` | Revoke or list existing invites. | `false` |
| `createBan` | Ban members from the community. | `false` |
| `manageBans` | Unban or list banned members. | `false` |
| `kick` | Remove members from the community. | `false` |
| `changeOtherNickname` | Change nicknames of other members. | `false` |
| `createChannelGroup` | Create new channel groups. | `false` |

### Channel permissions

| Permission | Description | Default |
| ---------- | ----------- | ------- |
| `fullControl` | All channel permissions. | `false` |
| `useExternalEmoji` | Use emojis from other servers. | `false` |
| `createMessage` | Send new messages. | `false` |
| `deleteMessageOther` | Delete messages sent by others. | `false` |
| `managePinnedMessages` | Pin or unpin messages. | `false` |
| `viewMessageHistory` | Read past messages. | `false` |
| `createMessageAttachment` | Attach files to messages. | `false` |
| `createMessageMention` | Mention users in messages. | `false` |
| `createMessageReaction` | React to messages. | `false` |
| `moveUserOther` | Move other users between voice channels. | `false` |
| `voiceMuteOther` | Mute other users in voice channels. | `false` |
| `voiceDeafenOther` | Deafen other users in voice channels. | `false` |
| `voiceKick` | Kick users from voice channels. | `false` |
| `manageFiles` | Upload or download files in channels. | `false` |
| `createFile` | Create new files in channels. | `false` |
| `viewFile` | View files shared in channels. | `false` |

## Example

```json
{
  "permissions": {
    "community": {
      "kick": true
    },
    "channel": {
      "createMessage": true,
      "deleteMessageOther": true
    }
  }
}
```