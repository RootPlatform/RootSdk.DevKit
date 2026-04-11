---
path: bot-docs/design/permissions.md
audience: bot
category: guide
summary: Permissions control which parts of the Root Community API your code can use.
---

# Choose your permissions

Permissions control which parts of the Root Community API your code can use.

By the end of this article, you'll be able to:

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

The Community APIs contain permission checks. When your code calls a method, Root tests whether your code has the needed permission. If not, Root throws `RootApiException` with an error code indicating the type of permission failure.

For the full list of available permissions, how to declare them, and how the community can modify channel permissions after installation, see [Manifest permissions](../configure/manifest-permissions.md).

## Permissions require visibility

Channel permissions only apply to channels your code can see. Before any channel permission takes effect, the community must grant your code visibility to the channel or channel group through an access rule. Without visibility, your code won't even know the channel exists. For details on how visibility and overlays work, see [Manifest permissions](../configure/manifest-permissions.md).

## How to choose permissions

Follow the principle of *least privilege* and include only what you need. Prefer granular keys over `manage*` unless you truly need everything in that scope.

> **Note:** If your code needs unrestricted access to every community and channel operation, you can declare `community.fullControl` instead of listing individual permissions. This grants every community permission and bypasses all channel-specific permissions. Most code should still use the procedure below to request only what it needs.
1. **List your features:** write down what your code needs to do, in plain English. Example: "Post updates in #announcements," "Pin a weekly summary," "Kick trolls from voice."

1. **Map features to methods:** Translate each feature into concrete actions. Example: "Post updates" → call the `ChannelMessageClient.create` method. "Ban unruly members" → call the `CommunityMemberBanClient.create` method.

1. **Map actions to permissions:** Look up each method in the API reference to find the exact permission you need.

1. **Declare:** Use your [manifest](../configure/manifest-permissions.md) to declare your permissions.