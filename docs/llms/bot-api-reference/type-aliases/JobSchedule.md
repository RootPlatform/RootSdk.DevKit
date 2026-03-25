---
path: bot-api-reference/type-aliases/JobSchedule.md
audience: bot
category: reference
summary: Encapsulates the timing of a job to be scheduled with the job scheduler.
---

> **JobSchedule** = `object`

Encapsulates the timing of a job to be scheduled with the job scheduler.

## Properties

### end?

> `optional` **end**: `Date`

Defines when the job should stop running. If omitted, recurring jobs run indefinitely.

### jobInterval

> **jobInterval**: [`JobInterval`](../enumerations/JobInterval.md)

Determines how often the job runs.

### start

> **start**: `Date`

Specifies when the job should start running.