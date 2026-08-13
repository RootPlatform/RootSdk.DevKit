---
path: app-api-reference/server/type-aliases/JobScheduleEvents.md
audience: app
category: reference
summary: Event map type for `JobScheduler`. This type defines the event signatures for job notification events.
---

> **JobScheduleEvents** = `object`

Event map type for `JobScheduler`. This type defines the event signatures for job notification events.

For event name constants, see `JobScheduleEvent`.

## Properties

### job

> **job**: (`event`: [`JobData`](JobData.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`JobData`](JobData.md) |

#### Returns

`void`

### job.missed

> **job.missed**: (`event`: [`JobData`](JobData.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`JobData`](JobData.md) |

#### Returns

`void`