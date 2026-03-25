---
path: bot-api-reference/type-aliases/CommunityMemberClient.md
audience: bot
category: reference
summary: Service client for retrieving information about members within a community.
---

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

#### Example

```ts
import {
  CommunityMember,
  CommunityMemberGetRequest,
  UserGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function getExample(userId: UserGuid): Promise<CommunityMember> {
  try {
    // Set up the request
    const request: CommunityMemberGetRequest = {
      userId: userId,
    };

    // Call the API
    const communityMember: CommunityMember =
      await rootServer.community.communityMembers.get(request);

    return communityMember;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

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

#### Example

```ts
import {
  CommunityMember,
  CommunityMemberListRequest,
  UserGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function listExample(
  userIds: UserGuid[],
): Promise<CommunityMember[]> {
  try {
    // Set up the request
    const request: CommunityMemberListRequest = {
      userIds: userIds,
    };
    // Call the API
    const CommunityMembers: CommunityMember[] =
      await rootServer.community.communityMembers.list(request);

    return CommunityMembers;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listAll()

> **listAll**(): `Promise`<[`CommunityMember`](CommunityMember.md)[]>

Retrieves all members of the community. This method has no pagination and returns all members in a single response. For communities with many members, consider using `list` with specific user IDs instead.

#### Returns

`Promise`<[`CommunityMember`](CommunityMember.md)[]>

A promise that resolves to an array of `CommunityMember` objects for every member in the community.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

#### Example

```ts
import { CommunityMember, rootServer } from "@rootsdk/server-bot";

export async function listAllExample(): Promise<CommunityMember[]> {
  try {
    // Call the API
    const CommunityMembers: CommunityMember[] =
      await rootServer.community.communityMembers.listAll();

    return CommunityMembers;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```