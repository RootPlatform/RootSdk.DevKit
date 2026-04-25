---
path: bot-api-reference/type-aliases/CommunityMemberInviteClient.md
audience: bot
category: reference
summary: Service client for managing member invitations within a community.
---

> **Worked sample**: `api-samples/server-invites/` — Member Invites

> **CommunityMemberInviteClient** = `object`

Service client for managing member invitations within a community. Member invitations allow existing community members to invite users to join the community with optional role assignments.

Access this client via `rootServer.community.communityMemberInvites`.

## Methods

### delete()

> **delete**(`request`: [`CommunityMemberInviteDeleteRequest`](CommunityMemberInviteDeleteRequest.md)): `Promise`<`void`>

Revokes a pending member invitation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberInviteDeleteRequest`](CommunityMemberInviteDeleteRequest.md) | Identifies the invitation to delete by sender and invited user IDs. |

#### Returns

`Promise`<`void`>

A promise that resolves when the invitation has been deleted.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the invitation does not exist, or `NoPermissionToDelete` if missing required permissions.

### get()

> **get**(`request`: [`CommunityMemberInviteGetRequest`](CommunityMemberInviteGetRequest.md)): `Promise`<[`CommunityMemberInvite`](CommunityMemberInvite.md)>

Retrieves a specific member invitation by the sender and invited user combination.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberInviteGetRequest`](CommunityMemberInviteGetRequest.md) | Identifies the invitation by sender and invited user IDs. |

#### Returns

`Promise`<[`CommunityMemberInvite`](CommunityMemberInvite.md)>

A promise that resolves to the `CommunityMemberInvite` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the invitation does not exist, or `NoPermissionToRead` if missing required permissions.

### list()

> **list**(): `Promise`<[`CommunityMemberInvite`](CommunityMemberInvite.md)[]>

Lists all pending member invitations for the community.

#### Returns

`Promise`<[`CommunityMemberInvite`](CommunityMemberInvite.md)[]>

A promise that resolves to an array of `CommunityMemberInvite` objects representing all pending invitations.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if missing required permissions.

