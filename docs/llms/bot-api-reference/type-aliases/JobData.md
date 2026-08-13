---
path: bot-api-reference/type-aliases/JobData.md
audience: bot
category: reference
summary: Event payload emitted when a scheduled job fires. Received by handlers subscribed to `JobScheduleEvent.Job` or `JobScheduleEvent.JobMissed` events.
---

> **JobData** = `object`

Event payload emitted when a scheduled job fires. Received by handlers subscribed to `JobScheduleEvent.Job` or `JobScheduleEvent.JobMissed` events.

## Properties

### id

> **id**: `BigInt`

A unique identifier for this specific job execution instance.

### jobScheduleId

> **jobScheduleId**: `string`

The unique identifier of the scheduled job that triggered this event. Use this to look up the full job details via `JobScheduler.get()`.

### jobTime

> **jobTime**: `Date`

The scheduled time for this job execution. For missed jobs, this is the time the job was supposed to run.

### resourceId

> **resourceId**: `string`

The resource identifier associated with this job, as specified when the job was created.

### tag?

> `optional` **tag?**: `string`

The optional tag associated with this job, as specified when the job was created.