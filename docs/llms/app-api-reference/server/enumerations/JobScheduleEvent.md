---
path: app-api-reference/server/enumerations/JobScheduleEvent.md
audience: app
category: reference
summary: Enum providing string constants for job notification event names. Use these values when subscribing to events on `JobScheduler`.
---

Enum providing string constants for job notification event names. Use these values when subscribing to events on `JobScheduler`.

## Enumeration Members

### Job

> **Job**: `"job"`

Raised at a job's regularly-scheduled time.

#### Example

```ts
import
{
  jobScheduler,
  JobData,
  JobScheduleEvent,
}
from '@rootsdk/server-app'

function subscribe()
{
  jobScheduler.addListener(JobScheduleEvent.Job, handleJobEvent);
}

const handleJobEvent = (event: JobData) =>
{
  const jobScheduleId: string = event.jobScheduleId;
  const resourceId:    string = event.resourceId;
  const tag:           string = event.tag || 'No tag';
  const jobTime:       Date   = event.jobTime;

  //...
};
```

### JobMissed

> **JobMissed**: `"job.missed"`

Raised if your server wasn't available at the regularly-scheduled event time.

#### Example

```ts
import
{
  jobScheduler,
  JobData,
  JobScheduleEvent,
}
from '@rootsdk/server-app'

function subscribe()
{
  jobScheduler.addListener(JobScheduleEvent.JobMissed, handleJobMissedEvent);
}

const handleJobMissedEvent = (event: JobData) =>
{
  const jobScheduleId: string = event.jobScheduleId;
  const resourceId:    string = event.resourceId;
  const tag:           string = event.tag || 'No tag';
  const jobTime:       Date   = event.jobTime;

  // ...
};
```