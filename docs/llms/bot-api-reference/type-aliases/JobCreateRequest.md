---
path: bot-api-reference/type-aliases/JobCreateRequest.md
audience: bot
category: reference
summary: Encapsulates the specification of a job to be scheduled with the job scheduler.
---

> **JobCreateRequest** = `object` & [`JobSchedule`](JobSchedule.md)

Encapsulates the specification of a job to be scheduled with the job scheduler.

## Type Declaration

### resourceId

> **resourceId**: `string`

Your choice of value to let you identify the job. The job scheduler doesn't use this value. The scheduler simply stores it and returns it to you when you query for jobs.

### tag

> **tag**: `string` | `null` | `undefined`

Your choice of value to help you categorize or filter jobs. The job scheduler doesn't use this value. The scheduler simply stores it and returns it to you when you query for jobs.