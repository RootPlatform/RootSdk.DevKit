---
path: app-docs/develop/server/job-scheduler.md
audience: app
category: guide
summary: The Root `JobScheduler` is an API for scheduling tasks that need to execute at future date(s).
---

> **Worked sample**: `api-samples/server-jobs/` — Job Scheduler

# Root Job scheduler

The Root `JobScheduler` is an API for scheduling tasks that need to execute at future date(s). The API supports operations such as create, retrieve, edit, delete, and list. Behind the scenes, your jobs are stored in a database that's automatically backed up by Root.

The job scheduler notifies you via an event when it's time for your job to run; it doesn't actually execute your task. Typical usage is:

1. **Subscribe**: You subscribe to the `JobScheduleEvent.Job` event on the job scheduler.

1. **Create**: You schedule a job to run at some time in the future (either one time or on an interval). You must provide a string called `resourceId` and optionally a string named `tag`.

1. **Execute**: When the job scheduler raises the `JobScheduleEvent.Job` event, it passes you the `resourceId` and `tag` that you set when you created the job. Your code then uses the `resourceId` and `tag` to decide what to do.

1. **Delete**: When you no longer need the job, you can delete it. There are several versions of the `delete` method that give you the flexibility to delete by `resourceId`, `tag`, or the id used internally by the job scheduler. Jobs are automatically deleted a few days after their end date.

## How to identify a job

There are three strings that identify a job:

* `resourceid`
* `tag`
* `jobScheduleId`

You have complete control over `resourceId` and `tag`; they have no intrinsic meaning to the job scheduler. You provide the values when you create jobs and the scheduler hands them back to you in the job-event data.

Neither `resourceId` nor `tag` need to be unique. For example, suppose you were writing code to help an MMORPG gaming community plan their raids. You might schedule jobs for 30 minutes before each raid begins so you could notify the community. You could set the tag to `raid-start` for all of these events and then use a unique raid id for the `resourceId`.

`JobScheduler` offers methods to list and delete by either `resourceId` or `tag`. In these methods, they'll match all jobs that have the `resourceId` or `tag` that you passed in.

Internally, the job scheduler creates a unique id for each job. This id is given to you in the `jobScheduleId` returned from the `create` method. You'll need this `jobResourceId` for the `edit` and `delete` operations that requires a unique identifier.

## Event precision

Events occur within a window of about one minute from the exact time you asked for in your create request.

The job scheduler is appropriate for tasks that you need to run periodically. It's not intended or optimized for real-time needs.

## Error notification

The job scheduler API won't throw exceptions.

## Missed jobs

It could happen that your server code isn't running at the scheduled time for a job. For example, if your server code crashed, the hosting container crashed, or if the Root infrastructure recycled your code to relocate it or do a backup.

The job scheduler handles this case by checking for missed events immediately when your server code starts. If it finds missed jobs, it raises the `JobScheduleEvent.JobMissed` event once for each missed job.

The missed job feature is intended for short pauses in your server's availability. In the unlikely case that your server isn't available for an extended period, the missed jobs are likely to be auto-deleted from the database and the job scheduler won't raise `JobScheduleEvent.JobMissed` events for those jobs.

## Reconcile on startup for long-running schedules

`JobMissed` covers most outages but not all. Two failure modes get past it:

- **Crashes during scheduling**, where your code writes its own state but the host process dies before calling `JobScheduler.create` for the corresponding job. The persisted state references a job the scheduler does not know about, so there is nothing for `JobMissed` to replay.
- **Long outages**, where your code is offline for longer than the missed-job retention window. The scheduler garbage-collects expired jobs and stops raising `JobMissed` for them.

For schedules that must remain consistent across these modes, reconcile on startup. Walk your persisted state, compare it to what the scheduler currently has, and create or remove jobs to bring them back into agreement. Run this pass inside your `lifecycle.start` handler, before the rest of the app begins serving requests.

The reconciliation pass is idempotent. On a clean restart with no drift, it finds nothing to fix and exits quickly. On a recovery, it brings the scheduler back to the state your persisted records say it should be in.

This pattern applies whenever the schedule has its own persisted truth that lives outside the scheduler. A canonical example is a chained `OneTime` polling pattern, where each job creates the next when it fires and a row in your database lists which sources need to be polled. If the chain breaks, the database has the answer for what should be running, and the reconciliation pass uses that answer to repair the chain.

A daily safety-net job using `JobInterval.Daily` running alongside the reconciliation pass bounds the silent-stop failure mode to twenty-four hours regardless of restart cadence. The reconciliation pass and the safety-net job do the same work; they differ only in trigger.