// ============================================================================
// How-To: Job Scheduler
// SDK: jobScheduler.create, .get, .edit, .delete, .deleteByResourceId,
//      .deleteByTag, .list, .listByResourceId, .listByTag
// Permissions: none (the job scheduler is always available to your code)
// Events: JobScheduleEvent.Job, JobScheduleEvent.JobMissed
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Schedule recurring or one-time jobs. The platform fires events when a job
// is due. No permissions are required.
//
// ============================================================================

import {
  rootServer,
  JobInterval,
  JobScheduleEvent,
  JobData,
  JobRecord,
  JobCreateRequest,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelGuid,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeScheduler(): void {
  const scheduler = rootServer.jobScheduler;
  const messages = rootServer.community.channelMessages;

  // Job events
  scheduler.on(JobScheduleEvent.Job, onJob);
  scheduler.on(JobScheduleEvent.JobMissed, onJobMissed);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onJobsCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Dates are rounded to the nearest minute (1-minute time slices).
// One-time jobs (JobInterval.OneTime) are auto-cleaned after they fire.
// One-time jobs with a start time in the past will throw — the start must be
// in the future (a 1-second grace period is allowed for clock drift).
// Recurring jobs allow a past start time since start is the recurrence anchor.
// Jobs with an end date older than 7 days are auto-deleted.
export async function createJob(
  resourceId: string,
  tag: string | null | undefined,
  start: Date,
  jobInterval: JobInterval,
  end?: Date,
): Promise<JobRecord> {
  const request: JobCreateRequest = { resourceId, tag, start, jobInterval, end };
  return rootServer.jobScheduler.create(request);
}

// Returns undefined for missing IDs — no error thrown.
export async function getJob(jobScheduleId: string): Promise<JobRecord | undefined> {
  return rootServer.jobScheduler.get(jobScheduleId);
}

// Completes silently if the job doesn't exist.
export async function editJob(record: JobRecord): Promise<void> {
  return rootServer.jobScheduler.edit(record);
}

// Completes silently if the job doesn't exist.
export async function deleteJob(jobScheduleId: string): Promise<void> {
  return rootServer.jobScheduler.delete(jobScheduleId);
}

// Completes silently if no matches found.
export async function deleteJobsByResourceId(resourceId: string): Promise<void> {
  return rootServer.jobScheduler.deleteByResourceId(resourceId);
}

// Completes silently if no matches found.
// Both null and undefined match the same nullish records — they are
// indistinguishable in storage.
export async function deleteJobsByTag(tag: string | null | undefined): Promise<void> {
  return rootServer.jobScheduler.deleteByTag(tag);
}

export async function listAllJobs(): Promise<JobRecord[]> {
  return rootServer.jobScheduler.list();
}

export async function listJobsByResourceId(resourceId: string): Promise<JobRecord[]> {
  return rootServer.jobScheduler.listByResourceId(resourceId);
}

// Both null and undefined match the same nullish records — they are
// indistinguishable in storage.
export async function listJobsByTag(tag: string | null | undefined): Promise<JobRecord[]> {
  return rootServer.jobScheduler.listByTag(tag);
}

// --- COMMAND HANDLER: /server-jobs --------------------------------------------------
// Exercises the full job lifecycle: create, list, get, edit, delete, list.

async function onJobsCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-jobs")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. Create a one-time job (1 minute from now)
    const oneMinute = new Date(Date.now() + 60_000);
    const oneTime: JobRecord = await createJob("demo-resource", "one-time-demo", oneMinute, JobInterval.OneTime);
    lines.push(`✓ created one-time job: ${oneTime.jobScheduleId}`);

    // 2. Create a daily recurring job
    const daily: JobRecord = await createJob("demo-resource", "daily-demo", new Date(), JobInterval.Daily);
    lines.push(`✓ created daily job: ${daily.jobScheduleId}`);

    // 3. List all jobs
    const allJobs: JobRecord[] = await listAllJobs();
    lines.push(`✓ listed ${allJobs.length} job(s)`);

    // 4. Get one by ID
    const fetched: JobRecord | undefined = await getJob(daily.jobScheduleId);
    lines.push(`✓ fetched job: interval=${fetched?.jobInterval}, tag=${fetched?.tag}`);

    // 5. List by resource ID
    const byResource: JobRecord[] = await listJobsByResourceId("demo-resource");
    lines.push(`✓ listed ${byResource.length} job(s) by resourceId`);

    // 6. Edit the daily job's tag
    await editJob({ ...daily, tag: "updated-tag" });
    lines.push("✓ edited daily job tag");

    // 7. List by tag
    const byTag: JobRecord[] = await listJobsByTag("updated-tag");
    lines.push(`✓ listed ${byTag.length} job(s) by tag "updated-tag"`);

    // 8. Delete by tag
    await deleteJobsByTag("updated-tag");
    lines.push("✓ deleted jobs by tag");

    // 9. Delete remaining by resource ID
    await deleteJobsByResourceId("demo-resource");
    lines.push("✓ deleted jobs by resourceId");

    // 10. Confirm empty
    const remaining: JobRecord[] = await listAllJobs();
    lines.push(`✓ ${remaining.length} job(s) remaining`);

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    console.error("Jobs demo error:", err);
    await messages.create({ channelId, content: `Jobs demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------

function onJob(event: JobData): void {
  console.log(
    `Job fired: scheduleId=${event.jobScheduleId} resourceId=${event.resourceId} ` +
    `tag=${event.tag} jobTime=${event.jobTime}`,
  );
}

// Fires at startup for jobs that should have run while the system was offline.
function onJobMissed(event: JobData): void {
  console.log(
    `Job missed: scheduleId=${event.jobScheduleId} resourceId=${event.resourceId} ` +
    `tag=${event.tag} jobTime=${event.jobTime}`,
  );
}
