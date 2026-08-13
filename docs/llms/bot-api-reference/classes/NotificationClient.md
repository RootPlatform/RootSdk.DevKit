---
path: bot-api-reference/classes/NotificationClient.md
audience: bot
category: reference
summary: Client for alerting community members about events in your code.
---

Client for alerting community members about events in your code. Use this to notify specific members that something is waiting on them, or to mark your channel as active for the whole community.

Access this client via `rootServer.community.notifications`.

Sending requires no manifest permission. The platform authorizes on the caller being an app or bot that is installed in the target community.

## Constructors

### Constructor

> **new NotificationClient**(): `NotificationClient`

#### Returns

`NotificationClient`

## Methods

### send()

> **send**(`request`: [`NotificationSendRequest`](../type-aliases/NotificationSendRequest.md)): `Promise`<`void`>

Creates an in-app notification for the targeted members and sends a device push to those who are offline. Members currently connected to Root receive the in-app notification only. Members who have blocked your code are filtered out.

Targets from `userIds`, `communityRoleIds`, and `memberGroupId` are resolved on your server and merged into a single deduplicated set, so a member matched by more than one target receives one notification. Roles and member groups are re-resolved on every call, so attach them to exactly one call when splitting a large audience across several sends.

Resolving to zero members is not an error: the call returns without sending anything. Log your own recipient count so this case stays visible.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`NotificationSendRequest`](../type-aliases/NotificationSendRequest.md) | The notification content and its targets. |

#### Returns

`Promise`<`void`>

A promise that resolves once the notification has been created.

#### Throws

`Error` if the resolved target set exceeds 1000 users. The SDK checks this before contacting the platform.

#### Throws

`RootApiException` with `errorCode` set to `ErrorCodeType.NoPermissionToCreate` if `relativeUrl` is supplied while your code holds no channel in the community.

#### Throws

`RootApiException` with `errorCode` set to `ErrorCodeType.NotMemberOf` if your code is not installed in the target community.

### setActivity()

> **setActivity**(`request`: [`NotificationSetActivityRequest`](../type-aliases/NotificationSetActivityRequest.md)): `Promise`<`void`>

Marks your code's channel as recently active, which shows an activity indicator to the community. Targets nobody and sends no push, making it the low-cost alternative to `send` for events that are not worth interrupting a specific member about.

The platform debounces this to one call per second. Calls arriving within a second of the last recorded activity are dropped and return successfully, so you do not need to throttle it yourself.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`NotificationSetActivityRequest`](../type-aliases/NotificationSetActivityRequest.md) | The community to mark active. Omit `communityId` in single-tenant code. |

#### Returns

`Promise`<`void`>

A promise that resolves once the activity has been recorded, or immediately if the call was debounced.

#### Throws

`RootApiException` with `errorCode` set to `ErrorCodeType.NotFound` if your code holds no channel in the community.

#### Throws

`RootApiException` with `errorCode` set to `ErrorCodeType.NotMemberOf` if your code is not installed in the target community.