---
path: app-api-reference/client/type-aliases/RootClientUser.md
audience: app
category: reference
summary: Provides access to community member profiles. Available via `rootClient.users`.
---

> **RootClientUser** = `object` & [`TypedEventEmitter`](TypedEventEmitter.md)<`RootClientUserEvents`>

Provides access to community member profiles. Available via `rootClient.users`.

## Type Declaration

### getCurrentUserId()

> **getCurrentUserId**(): [`UserGuid`](UserGuid.md)

Returns the current user's ID.

#### Returns

[`UserGuid`](UserGuid.md)

The current user's `UserGuid`.

### getUserProfile()

> **getUserProfile**(`userId`: `string`): `Promise`<[`UserProfile`](UserProfile.md)>

Retrieves a single member's profile.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userId` | `string` | The user ID to look up. |

#### Returns

`Promise`<[`UserProfile`](UserProfile.md)>

A promise that resolves to a `UserProfile`, or `null` if the user is not a member of this community.

#### Throws

`Error` with message `"Invalid format: {userId}"` if the user ID is not a valid GUID.

### getUserProfiles()

> **getUserProfiles**(`userIds`: `string`[]): `Promise`<[`UserProfile`](UserProfile.md)[]>

Retrieves profiles for multiple members in a single call. Users that are not members of this community are omitted from the result.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userIds` | `string`[] | The user IDs to look up. |

#### Returns

`Promise`<[`UserProfile`](UserProfile.md)[]>

A promise that resolves to an array of `UserProfile` containing only the members that were found.

#### Throws

`Error` with message `"Invalid format: {userId}"` if any user ID in the array is not a valid GUID. The entire call fails.

### showUserProfile()

> **showUserProfile**(`userId`: `string`): `void`

Opens the host Root client's built-in profile popup for the specified user.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `userId` | `string` | The user ID to display. |

#### Returns

`void`