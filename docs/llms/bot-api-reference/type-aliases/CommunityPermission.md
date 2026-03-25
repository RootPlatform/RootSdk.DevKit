---
path: bot-api-reference/type-aliases/CommunityPermission.md
audience: bot
category: reference
summary: Permissions that control access to community-level entities and settings.
---

> **CommunityPermission** = `object`

Permissions that control access to community-level entities and settings.

## Properties

### communityChangeMyNickname

> **communityChangeMyNickname**: `boolean`

Change your own nickname for the community.

### communityChangeOtherNickname

> **communityChangeOtherNickname**: `boolean`

Change other members’ nicknames.

### communityCreateBan

> **communityCreateBan**: `boolean`

Ban a member from the community. Banning immediately removes the member and sets a configurable timeout period during which they cannot rejoin, even with an invitation. The timeout can be infinite.

### communityCreateChannelGroup

> **communityCreateChannelGroup**: `boolean`

Create new channel groups.

### communityCreateInvite

> **communityCreateInvite**: `boolean`

Invite new members to join the community.

### communityFullControl

> **communityFullControl**: `boolean`

Grants every community-level permission and overrules channel and channel-group permission overlays.

### communityKick

> **communityKick**: `boolean`

Remove members from the community.

### communityManageApps

> **communityManageApps**: `boolean`

Install, update, or remove apps in the community. Includes permissions to create, update, and delete app channels, and automatically grants the *Create app channel* permission.

### communityManageAuditLog

> **communityManageAuditLog**: `boolean`

View or clear the community audit log, which records logged member actions.

### communityManageBans

> **communityManageBans**: `boolean`

Create, read, update, and delete community member bans.

### communityManageCommunity

> **communityManageCommunity**: `boolean`

Manage overall community settings, including the community’s name, description, color, image, and system-messages channel.

### communityManageEmojis

> **communityManageEmojis**: `boolean`

Add or remove custom emojis from the community.

### communityManageInvites

> **communityManageInvites**: `boolean`

Create, list, update, and revoke community invitations.

### communityManageRoles

> **communityManageRoles**: `boolean`

Create, list, update, delete, and assign roles.