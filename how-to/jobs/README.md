# How-To: Job Scheduler

Schedule recurring or one-time jobs using the platform's built-in job scheduler.

## Source Files

| File | What it covers |
|------|---------------|
| [scheduler.ts](src/scheduler.ts) | Create, get, edit, delete, list jobs; handle job and missed-job events |

## SDK Methods

- `jobScheduler.create(data)` — create a scheduled job (one-time or recurring)
- `jobScheduler.get(jobScheduleId)` — get a job by its schedule ID
- `jobScheduler.edit(record)` — update an existing job
- `jobScheduler.delete(jobScheduleId)` — delete a job by its schedule ID
- `jobScheduler.deleteByResourceId(resourceId)` — delete all jobs for a resource
- `jobScheduler.deleteByTag(tag)` — delete all jobs with a given tag
- `jobScheduler.list()` — list all jobs
- `jobScheduler.listByResourceId(resourceId)` — list jobs for a resource
- `jobScheduler.listByTag(tag)` — list jobs with a given tag

## Permissions

```json
{}
```

No special permissions required. The job scheduler is always available to your code.

The `channel.createMessage` permission in `root-manifest.json` is only for the `/jobs` command trigger, not for job scheduler access itself.

## Events

| Event | Fires when |
|-------|-----------|
| `JobScheduleEvent.Job` | A scheduled job reaches its execution time |
| `JobScheduleEvent.JobMissed` | A job was missed while offline (fired at startup) |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **No permissions required** — the job scheduler is always available.
- **Dates are rounded to the nearest minute** — the scheduler operates on 1-minute time slices.
- **One-time jobs auto-clean** — jobs with `JobInterval.OneTime` are automatically deleted after they fire.
- **Expired jobs auto-clean** — jobs with an `end` date older than 7 days are automatically deleted.
- **Missed jobs fire on startup** — if the system was offline when a job was due, `JobMissed` fires when it comes back.
- **Silent failures** — `edit()`, `delete()`, `deleteByResourceId()`, and `deleteByTag()` complete silently if no matching records exist. `get()` returns `undefined` for missing IDs.
- **Null/undefined tags are equivalent** — both `null` and `undefined` are stored the same way. `listByTag(null)` and `listByTag(undefined)` match the same records.
