---
path: app-api-reference/server/type-aliases/CommunityAppLogClient.md
audience: app
category: reference
summary: Client for writing diagnostic logs visible to community members with the **Manage Apps** permission.
---

> **Worked sample**: `api-samples/server-community-logs/` — Community Logs

> **CommunityAppLogClient** = `object`

Client for writing diagnostic logs visible to community members with the **Manage Apps** permission. Use this to record significant events, warnings, or errors from your app that those members may need to review.

This client is only available to apps. Bots cannot write community logs.

Access this client via `rootServer.dataStore.logs.community`.

## Methods

### create()

> **create**(`request`: [`CommunityAppLogCreateRequest`](CommunityAppLogCreateRequest.md)): `Promise`<[`CommunityAppLogCreateResponse`](CommunityAppLogCreateResponse.md)>

Writes a log entry to the community's app log.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityAppLogCreateRequest`](CommunityAppLogCreateRequest.md) | The log entry to create, including severity level and message. |

#### Returns

`Promise`<[`CommunityAppLogCreateResponse`](CommunityAppLogCreateResponse.md)>

A promise that resolves to a `CommunityAppLogCreateResponse` containing the log entry ID.

