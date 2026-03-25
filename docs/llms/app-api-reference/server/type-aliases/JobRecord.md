---
path: app-api-reference/server/type-aliases/JobRecord.md
audience: app
category: reference
summary: Represents a scheduled job stored in the `JobScheduler`. This type is returned by `JobScheduler.create()`, `JobScheduler.get()`, and the various list...
---

> **JobRecord** = `object` & [`JobSchedule`](JobSchedule.md)

Represents a scheduled job stored in the `JobScheduler`. This type is returned by `JobScheduler.create()`, `JobScheduler.get()`, and the various list methods.

## Type Declaration

### jobScheduleId

> **jobScheduleId**: `string`

The unique identifier for this job, assigned by the `JobScheduler` when the job is created. Use this ID to edit, delete, or retrieve the job.

### resourceId

> **resourceId**: `string`

An identifier you provide to associate this job with a resource in your app. Multiple jobs can share the same `resourceId`, allowing you to group related jobs.

### tag

> **tag**: `string` | `null` | `undefined`

An optional label you provide to categorize jobs. Multiple jobs can share the same tag, allowing you to query or delete jobs by category.