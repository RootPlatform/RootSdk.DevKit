---
path: app-docs/develop/server/job-scheduler.md
audience: app
category: guide
summary: The Root `JobScheduler` is an API for scheduling tasks that need to execute at future date(s).
---

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