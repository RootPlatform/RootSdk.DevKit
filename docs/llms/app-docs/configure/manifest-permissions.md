---
path: app-docs/configure/manifest-permissions.md
audience: app
category: guide
summary: Permissions control which parts of the Root Community API your code can use.
---

# Manifest `permissions`

Permissions control which parts of the Root Community API your code can use. The `permissions` field is optional -- if your code doesn't call any Community API methods, you don't need it.

## Example

Suppose your code posts messages in channels and can ban members who break the rules. You'd declare the `createMessage` channel permission and the `createBan` community permission.

```json
{
  "id": "...",
  "version": "1.0.0",
  "package": { ... },
  "permissions": {
    "community": {
      "createBan": true
    },
    "channel": {
      "createMessage": true
    }
  }
}
```

All permissions default to `false`. Set the ones you need to `true`.

## Community permissions

Community permissions apply to community-wide operations. They are granted to your code when the community approves your installation and **cannot be modified or revoked** by the community after installation.

| Permission | Description |
| ---------- | ----------- |
| `fullControl` | Grants every community permission and bypasses all channel-specific permissions. |
| `manageCommunity` | Edit community level settings like name and branding. |
| `manageRoles` | Create, edit, delete, and assign community roles and their permissions. |
| `manageEmojis` | Add, remove, or update custom emojis available across the community. |
| `createInvite` | Create a new invite link for the community. |
| `manageInvites` | View, disable, expire, or edit community invite links (includes `createInvite`). |
| `createBan` | Ban a member from the community. |
| `manageBans` | Review bans and unban or change ban settings (includes `createBan`). |
| `kick` | Remove a member from the community without banning. |
| `changeOtherNickname` | Change another member's display name in the community. |
| `createChannelGroup` | Create a channel group or category at the community level. |

## Channel permissions

Channel permissions apply to operations within specific channels and channel groups. Unlike community permissions, the community **can modify** your channel permissions after installation using access rule overlays.

| Permission | Description |
| ---------- | ----------- |
| `fullControl` | Admin level control for the channel (includes all channel permissions). |
| `useExternalEmoji` | Use emojis not native to this community in the channel. |
| `createMessage` | Post messages in the channel. |
| `deleteMessageOther` | Delete messages posted by other members. |
| `managePinnedMessages` | Pin and unpin messages in the channel. |
| `viewMessageHistory` | Read messages posted prior to joining the channel. |
| `createMessageAttachment` | Attach files or media to a message. |
| `createMessageMention` | Mention users or roles in a message. |
| `createMessageReaction` | React to messages with emoji. |
| `moveUserOther` | Move another user between voice rooms or channel instances. |
| `voiceMuteOther` | Mute another user in voice. |
| `voiceDeafenOther` | Deafen another user in voice. |
| `voiceKick` | Remove another user from an active voice session. |
| `manageFiles` | Create, view, and delete channel files (includes `createFile` and `viewFile`). |
| `createFile` | Upload a new file into the channel. |
| `viewFile` | View or download files in the channel. |

## Error handling

When your code calls a Community API method without the required permission, Root throws `RootApiException` with an `errorCode` indicating the type of failure.

```ts
try {
  const request: ChannelMessageCreateRequest = { channelId: myChannelId, content: "hello" };
  await rootServer.community.channelMessages.create(request);
}
catch (xcpt: unknown) {
  if (xcpt instanceof RootApiException) {
    if (xcpt.errorCode === ErrorCodeType.NoPermissionToCreate)
      // handle permission failure
  }
}
```

Your code should always be ready to handle permission failures for channel operations, since the community can modify your channel permissions after installation.

## Channel visibility

Your API results are filtered by what the community allows you to see. You can see a channel or channel group under two conditions:

- You've been directly added to a channel or channel group.
- You've been given a role that has been added to the channel or channel group.

When your code is installed, it's granted the **Everyone** role automatically. If the community has channels restricted to other roles, you won't see them until the community grants you access.

The Everyone role's permissions are community-configurable — the community can add or remove permissions on it at any time. Always declare what your code needs in the manifest; never depend on Everyone's current permissions to grant you a capability.

## Channel permission overlays

The community can use access rule overlays to modify your channel permissions after installation. An overlay can remove permissions from your manifest or add new ones for specific channels or channel groups.

For example, suppose your manifest declares `manageFiles` (which includes create, view, and delete). The community can configure an overlay that removes `manageFiles` and adds only `createFile`. Your code will succeed when creating files but the `delete` method will throw `RootApiException` with `errorCode` set to `NoPermissionToDelete`.

For guidance on choosing the right permissions, see [Choose your permissions](../design/permissions.md).