---
path: app-api-reference/server/type-aliases/NotificationSendRequest.md
audience: app
category: reference
summary: Request object for sending a notification to community members.
---

> **NotificationSendRequest** = `object`

Request object for sending a notification to community members.

At least one target field must resolve to a member. If `userIds`, `communityRoleIds`, and `memberGroupId` together resolve to nobody, the send returns without sending anything and raises no error.

## Properties

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The community to send in. Optional for single-tenant apps and bots, which default to the community the code is running for. Required for multi-tenant apps.

### communityRoleIds?

> `optional` **communityRoleIds?**: [`CommunityRoleGuid`](CommunityRoleGuid.md)[]

Optional array of role IDs. Every member holding any of these roles is notified. Resolved on your server, then merged with the other target fields.

### description?

> `optional` **description?**: `string`

The notification body. Optional, maximum 150 characters. Exceeding the limit rejects the entire request.

### memberGroupId?

> `optional` **memberGroupId?**: [`CustomMemberGroupGuid`](CustomMemberGroupGuid.md)

Optional member group ID. Every member of the group is notified. Resolved on your server, then merged with the other target fields.

### relativeUrl?

> `optional` **relativeUrl?**: `string`

Optional relative URL that opens a specific location in your app when the member taps the notification. Maximum 1000 characters, and must parse as a relative URL.

The path is resolved against your app's own router and must include every parent route segment, not just the leaf path. A task route nested under a project route is reachable at `/project/456/task/123`, not `/task/123`. Follow the `getParentRoute` chain in your router rather than reading the `path` string alone.

Requires your code to hold a channel in the community. Supplying this field without a channel fails the entire send, so retry without it rather than losing the notification. Does not apply to bots, which have no client interface to open.

### title

> **title**: `string`

The notification headline. Required, maximum 50 characters. Exceeding the limit rejects the entire request, so truncate user-supplied text before sending.

### userIds?

> `optional` **userIds?**: [`UserGuid`](UserGuid.md)[]

Optional array of member IDs to notify directly.