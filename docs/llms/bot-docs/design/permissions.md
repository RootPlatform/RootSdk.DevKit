---
path: bot-docs/design/permissions.md
audience: bot
category: guide
summary: Permissions control which parts of the Root Community API your code can use.
---

# Choose your permissions

Permissions control which parts of the Root Community API your code can use.

By the end of this article, you’ll be able to:

* Determine whether your code needs to declare permissions.
* Identify the appropriate set of permissions to include in your manifest.

## What is the Community API?

The Root _Community API_ is a subset of the Root APIs that lets your server-side code manipulate the community it's attached to. For example, you can read/write channel messages, assign member roles, and update community branding.

[Diagram: This diagram shows the major categories of the Root server-side APIs with the Community APIs highlighted.]
```
flowchart LR
  API((Root API))
  API --> S1[Community APIs]
  API --> S2[Job scheduler]
  API --> S3[Member group</br>management]
  API --> S4[Server-side</br>logging]
  API --> S5[Persistent</br>data storage]
  API --> S6[Server lifecycle]
  API --> S7[...]
  style S1 stroke:#0284c7,stroke-width:3px
```

## What are permissions?

A _permission_ is approval for your code to call one or more methods in the Root Community API. For example, if you write messages into community channels, you'll need the `createMessage` permission. If your code is performing automated moderation, it'll need the `kick` and `createBan` permissions.

## Where are permissions needed?

Permissions are required to call *methods* in the Community API portion of the Root APIs. The *events* in the Community API are not gated by permissions; you can subscribe to any of them without additional permissions.

The table below lists the types where permissions are needed. Note that methods within the same type may require different permissions; for example, `CommunityMemberBanClient.create` requires `createBan` while `CommunityMemberBanClient.delete` requires `manageBans`.

| Types that require permissions for use |
| ----------------------------- |
| `AccessRuleClient`            |
| `CommunityClient`             |
| `CommunityMemberBanClient`    |
| `CommunityMemberInviteClient` |
| `CommunityRoleClient`         |
| `CommunityMemberClient`       |
| `CommunityMemberRoleClient`   |
| `CommunityEmojiClient`        |
| `ChannelClient`               |
| `ChannelGroupClient`          |
| `ChannelMessageClient`        |
| `ChannelDirectoryClient`      |
| `ChannelFileClient`           |
| `ChannelWebRtcClient`         |

## How do permissions work?

As a developer, you declare the permissions you need, and Root grants them to your code at runtime.

[Diagram: A left-to-right flow showing how permissions move from manifest declaration through store listing, admin review at install, and runtime grant.]
```
flowchart LR
  A["Declared<br/>in your manifest"] --> B["Displayed<br/>in your store listing"]
  B --> C["Shown<br/>at install time"]
  C --> D["Granted<br/>to your code at runtime<br/>(subject to community restrictions)"]
```

The Community APIs contain permission checks. When your code calls a method, Root will test whether your code has the needed permission. If not, Root will throw `RootApiException` with the `errorCode` property set to a specific code for the type of permission failure. Your code can test the `errorCode` value to determine whether there was a permission failure.

```ts
try {
  const request: ChannelMessageCreateRequest = { channelId: myChannelId, content: "hello" };
  await rootServer.community.channelMessages.create(request);
} 
catch (xcpt: unknown) {
  if (xcpt instanceof RootApiException) {
    if (xcpt.errorCode === ErrorCodeType.NoPermissionToCreate)
      // ...
  }
  // ...
}
```

## Which permissions are available?

The following tables list all the permissions that you can include in your manifest. They're divided into two categories based on where they apply: community and channel.

| **Community permissions** | **Description**                                                              |
| --------------------- | -------------------------------------------------------------------------------- |
| `manageCommunity`     | Edit community level settings like name and branding.                            |
| `manageRoles`         | Create, edit, delete, and assign community roles and their permissions.          |
| `manageEmojis`        | Add, remove, or update custom emojis available across the community.             |
| `createInvite`        | Create a new invite link for the community.                                      |
| `manageInvites`       | View, disable, expire, or edit community invite links (includes `createInvite`). |
| `createBan`           | Ban a member from the community.                                                 |
| `manageBans`          | Review bans and unban or change ban settings (includes `createBan`).             |
| `kick`                | Remove a member from the community without banning.                              |
| `changeOtherNickname` | Change another member’s display name in the community.                           |
| `createChannelGroup`  | Create a channel group or category at the community level.                       |

| **Channel permissions** | **Description**                                                               |
| ------------------------- | ----------------------------------------------------------------------------- |
| `fullControl`             | Admin level control for the channel (includes all channel permissions).       |
| `useExternalEmoji`        | Use emojis not native to this community in the channel.                       |
| `createMessage`           | Post messages in the channel.                                                 |
| `deleteMessageOther`      | Delete messages posted by other members.                                      |
| `managePinnedMessages`    | Pin and unpin messages in the channel.                                        |
| `viewMessageHistory`      | Read messages posted prior to joining the channel.                            |
| `createMessageAttachment` | Attach files or media to a message.                                           |
| `createMessageMention`    | Mention users or roles in a message.                                          |
| `createMessageReaction`   | React to messages with emoji.                                                 |
| `moveUserOther`           | Move another user between voice rooms or channel instances.                   |
| `voiceMuteOther`          | Mute another user in voice.                                                   |
| `voiceDeafenOther`        | Deafen another user in voice.                                                 |
| `voiceKick`               | Remove another user from an active voice session.                             |
| `manageFiles`             | Create, view, and delete channel files (includes `createFile` and `viewFile`) |
| `createFile`              | Upload a new file into the channel.                                           |
| `viewFile`                | View or download files in the channel.                                        |

## How to choose permissions

Follow the principle of *least privilege* and include only what you need. Prefer granular keys over `manage*` unless you truly need everything in that scope.

1. **List your features:** write down what your code needs to do, in plain English. Example: “Post updates in #announcements,” “Pin a weekly summary,” “Kick trolls from voice.”

1. **Map features to methods:** Translate each feature into concrete actions. Example: “Post updates” → call the `ChannelMessageClient.create` method. “Ban unruly members” → call the `CommunityMemberBanClient.create` method.

1. **Map actions to permissions:** Look up each method in the API reference to find the exact permission you need.

1. **Declare:** Use your [Root Manifest](../configure/manifest-overview.md) to declare your permissions.

## Community permissions can't be modified by the community

When a community member with the `Manage Apps` permission approves an installation into their community, they are implicitly granting your code all the *community* permissions in your manifest. The community cannot modify or revoke these permissions after installation.

## Channel permissions can be modified against specific channels and channel groups

Channel permissions are affected by the access rules and overlays that the community has in place. The community can modify your code's abilities after installation in two ways:

- They can limit what you can see.
- They can change your permissions against specific channels or channel groups.

### Your results are always limited to what you can see

When you call a Community API method, your results are filtered by the channels and channel groups that the community has allowed you to see. You can *see* a channel or channel group under two conditions:

- You've been directly added to a channel or channel group.
- You've been given a role that has been added to the channel or channel group.

For example, suppose the community has two channel groups and two roles:

-  The **General** channel group with the **Everyone** role added.
-  The **Admin** channel group with the **Admins** role added.

When your code gets installed, it's granted the **Everyone** role automatically. At this point, if you call the `ChannelGroupClient.list` method, you'll only get back the **General** channel group. If the community adds you to **Admin** channel group directly or gives you the **Admins** role, then you'll suddenly start seeing both channel groups returned from the `list` call.

### The community can modify permissions by using access rule overlays

When the community adds your code to a channel or channel group, they can use an *overlay* to modify the permissions that you get when you operate inside that channel or channel group. This means they can override what's in your manifest.

Suppose your manifest includes the `manageFiles` channel permission. This permission is powerful; it lets you create, view, move, and even delete files. Since you put this in your manifest, it means that your code is likely performing multiple file operations like creating temporary files and then deleting them when they're no longer needed.

The community can add you to a channel or channel group and configure an overlay that removes the `manageFiles` permission and adds the `createFile` permission. Now, your code will be fine when it creates new files, but the `delete` method will now throw an exception with the `errorCode` set to `NoPermissionToDelete`.

In general, your code should always be ready to handle the failure of a Community API call due to lack of the needed channel permission.