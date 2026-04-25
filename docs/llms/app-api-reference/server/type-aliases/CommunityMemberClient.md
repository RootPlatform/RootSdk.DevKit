---
path: app-api-reference/server/type-aliases/CommunityMemberClient.md
audience: app
category: reference
summary: Service client for retrieving information about members within a community.
---

> **Worked sample**: `api-samples/server-members/` — Members

> **CommunityMemberClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityMemberEvents`](CommunityMemberEvents.md)> & `object`

Service client for retrieving information about members within a community. Members are users who have joined the community and can access its channels and content.

This client provides read-only access to member data. To manage role assignments, use `CommunityMemberRoleClient`. To ban or kick members, use `CommunityMemberBanClient`.

Access this client via `rootServer.community.communityMembers`.

## Type Declaration

### get()

> **get**(`request`: [`CommunityMemberGetRequest`](CommunityMemberGetRequest.md)): `Promise`<[`CommunityMember`](CommunityMember.md)>

Retrieves detailed information about a specific community member.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberGetRequest`](CommunityMemberGetRequest.md) | Identifies the member by user ID. |

#### Returns

`Promise`<[`CommunityMember`](CommunityMember.md)>

A promise that resolves to a `CommunityMember` object containing the member's profile, roles, and join information.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

### list()

> **list**(`request`: [`CommunityMemberListRequest`](CommunityMemberListRequest.md)): `Promise`<[`CommunityMember`](CommunityMember.md)[]>

Retrieves information about multiple community members by their user IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityMemberListRequest`](CommunityMemberListRequest.md) | Contains an array of user IDs to look up. |

#### Returns

`Promise`<[`CommunityMember`](CommunityMember.md)[]>

A promise that resolves to an array of `CommunityMember` objects for the requested users. Users who are not members of the community are omitted from the results.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

### listAll()

> **listAll**(): `Promise`<[`CommunityMember`](CommunityMember.md)[]>

Retrieves all members of the community. This method has no pagination and returns all members in a single response. For communities with many members, consider using `list` with specific user IDs instead.

#### Returns

`Promise`<[`CommunityMember`](CommunityMember.md)[]>

A promise that resolves to an array of `CommunityMember` objects for every member in the community.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

