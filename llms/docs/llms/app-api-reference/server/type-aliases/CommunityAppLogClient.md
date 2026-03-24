---
path: app-api-reference/server/type-aliases/CommunityAppLogClient.md
audience: app
category: reference
summary: Client for writing diagnostic logs visible to community members with the **Manage Apps** permission.
---

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

#### Example

```ts
import {
  CommunityAppLogType,
  CommunityAppLogCreateRequest,
  CommunityAppLogCreateResponse,
  UnknownGuid,
  rootServer,
} from "@rootsdk/server-app";

export async function createExample(
  communityAppLogType: CommunityAppLogType,
  message: string,
): Promise<CommunityAppLogCreateResponse> {
  try {
    // Set up the request
    const request: CommunityAppLogCreateRequest = {
      communityAppLogType: communityAppLogType,
      message: message,
    };

    // Call the API
    const result: CommunityAppLogCreateResponse =
      await rootServer.dataStore.logs.community.create(request);

    return result;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```