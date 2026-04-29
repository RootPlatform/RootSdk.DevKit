import {
  rootServer,
  JobInterval,
  JobScheduleEvent,
  JobData,
} from "@rootsdk/server-app";
import { Database, getDb } from "./db";
import {
  RepoRow,
  getRepo,
  listRepos,
  updateRepoPollState,
} from "./repoStore";
import { getCursorForRepo } from "./archiveStore";
import { onNewRelease } from "./releaseBroadcaster";
import {
  GitHubClientError,
  GitHubRelease,
  listReleases,
} from "./githubClient";
import { withRetry } from "./lib/retry";
import { log, errFields } from "./lib/log";

// ============================================================================
// pollJobs — per-repo polling via chained `OneTime` jobs in the platform's
// rootServer.jobScheduler.
//
// The platform offers OneTime, Daily, Weekly, Monthly, Yearly recurrence —
// no Minutely or Hourly. Sub-daily cadence is expressed as chained OneTime
// jobs: each repo owns at most one pending poll job, identified by
// `resourceId = "{owner}/{name}"` and `tag = "poll"`. The job handler polls,
// updates state, then creates the next OneTime job at `start = now + interval`.
//
// Reliability is layered. Each layer fires only when the prior layer
// failed or doesn't apply, so they don't double-act:
//   1. withRetry on createPollJob (innermost — directly wraps the SDK
//                                   call). Exponential-backoff retries
//                                   for transient SDK errors. Most flake
//                                   stops here.
//   - JobScheduleEvent.Job:        normal firing.
//   2. JobScheduleEvent.JobMissed (medium-latency — fires next startup
//                                   after downtime). Same handler — replays
//                                   jobs whose start times passed while
//                                   the server was down.
//   3. reconcilePollJobs (run-once-at-start). Heals mid-state crashes
//                                   (handler crashed between writing state
//                                   and scheduling the next job) and long
//                                   outages where JobMissed wouldn't
//                                   replay.
//   4. Daily reconcile job (outermost — bounded ≤24h independent of
//                                   restart cadence). Belt-and-suspenders
//                                   for the silent-stop case where
//                                   withRetry exhausted attempts and still
//                                   failed during a long-running deploy.
//                                   Re-runs reconcilePollJobs.
//
// Daily-job-loss is silent: scheduleReconcileJob is intentionally a no-op
// at startup if a reconcile job already exists (so frequent restarts don't
// reset the timer). If something else deletes the daily job — manual ops,
// a sweep that misclassifies it, an SDK bug — there's no in-process
// detection of its absence; the per-startup synchronous reconcilePollJobs
// is the second-line defense, but loss of the daily itself is not. In a
// long-running deployment that doesn't restart, this could go unnoticed
// indefinitely. Operations should verify periodically that a job tagged
// "reconcile" exists. A future tightening would have onPollJob check for
// the daily job's presence on every firing and rescue if missing.
//
// See DESIGN.md → How polling works.
// ============================================================================

// PollStatus enum values mirror the proto. Kept as numeric literals here so
// this file doesn't need to import generated proto types — pollJobs runs
// before the service is registered.
const POLL_STATUS_OK = 1;
const POLL_STATUS_ERROR = 2;

const POLL_TAG = "poll";
const POLL_PER_PAGE = 3;

// Reconcile safety-net job. Distinct tag so onJob can dispatch by tag without
// confusing a daily reconcile firing with a per-repo poll firing. The
// resourceId is a fixed sentinel — there's only ever one daily reconcile.
const RECONCILE_TAG = "reconcile";
const RECONCILE_RESOURCE_ID = "__reconcile__";

// --- Init -------------------------------------------------------------------

let initialized = false;

export function initializePollJobs(): void {
  if (initialized) return;
  // Both event types route to the same dispatcher. JobMissed replays missed
  // firings on startup; from the handler's perspective there is no
  // distinction between "the platform fired this on schedule" and "the
  // platform replayed it after downtime."
  rootServer.jobScheduler.on(JobScheduleEvent.Job, onJob);
  rootServer.jobScheduler.on(JobScheduleEvent.JobMissed, onJob);
  initialized = true;
}

// Walk persistent state and scheduled jobs; create any missing jobs and
// drop any orphans. Run at lifecycle.start AND once per day from the
// reconcile safety-net job. See DESIGN.md → Startup reconciliation for the
// failure modes this covers.
export async function reconcilePollJobs(): Promise<void> {
  const db = getDb();
  const repos = await listRepos(db);
  const expected = new Set(repos.map((r) => `${r.owner}/${r.name}`));
  const existing = await rootServer.jobScheduler.listByTag(POLL_TAG);

  // Drop orphan jobs (resourceId no longer corresponds to a watched repo).
  let droppedOrphans = 0;
  for (const job of existing) {
    if (!expected.has(job.resourceId)) {
      await rootServer.jobScheduler.delete(job.jobScheduleId);
      droppedOrphans++;
    }
  }

  // Schedule missing jobs (watched repo with no pending poll). New jobs
  // start at `now` rather than `now + interval` — after a crash or outage
  // the right behavior is "fetch fresh data immediately," not "wait an
  // interval." Dedupe via MAX(id) prevents re-broadcasting any release
  // that already made it into the archive.
  const have = new Set(existing.map((j) => j.resourceId));
  let scheduledMissing = 0;
  for (const repo of repos) {
    const id = makeResourceId(repo.owner, repo.name);
    if (!have.has(id)) {
      await createPollJob(id, new Date());
      scheduledMissing++;
    }
  }

  log("info", "pollJobs reconciled", {
    repoCount: repos.length,
    droppedOrphans,
    scheduledMissing,
  });
}

// Schedule the daily safety-net reconcile job, IF one isn't already
// scheduled. Called once at lifecycle.start.
//
// Why "if not already scheduled" and not "always recreate": every server
// restart would otherwise re-anchor the first firing to `now + 24h`. A
// deployment with daily restarts (cron deploy, autoscaler churn,
// transient crashes) would starve the safety net — it would never fire.
// The whole point of this job is to catch cases where everything else
// failed; making it itself depend on long uptime defeats the purpose.
// Idempotent at startup: if the prior run scheduled one, it survives.
//
// Why daily and not, say, hourly: reconciliation is for the silent-stop
// failure mode (transient SDK error during reschedule); it's not on the
// critical path for normal operation. Once a day matches "noticed by an
// admin within a day" — fast enough that nobody waits long, slow enough
// that the reconcile work doesn't compete with normal polling.
//
// Why JobInterval.Daily here and chained-OneTime for polling: the platform
// handles `Daily` recurrence natively — it auto-reschedules each firing,
// so there's no "fail to schedule the next one" silent-stop failure mode
// to worry about. The chained-OneTime pattern in the poll path is needed
// only because the cadence we want (every 15 minutes – 24 hours) is
// SUB-daily, and the platform's smallest native recurrence is Daily. The
// general rule: use the platform's native recurrence when one matches
// your cadence; chain OneTime jobs only when you need sub-daily cadence.
export async function scheduleReconcileJob(): Promise<void> {
  const existing = await rootServer.jobScheduler.listByTag(RECONCILE_TAG);
  if (existing.length > 0) return;
  // Fire the first reconcile 24h from now — startup already ran one
  // synchronously via reconcilePollJobs(). Daily recurrence after that.
  await rootServer.jobScheduler.create({
    resourceId: RECONCILE_RESOURCE_ID,
    tag: RECONCILE_TAG,
    start: new Date(Date.now() + 24 * 60 * 60 * 1000),
    jobInterval: JobInterval.Daily,
  });
}

// --- Lifecycle helpers (called from service handlers) ----------------------

// Schedule the very first poll for a newly-added repo. The first poll fires
// immediately and seeds the feed via the regular `onNewRelease` funnel —
// see DESIGN.md → Backfill on add.
export async function scheduleFirstPoll(owner: string, name: string): Promise<void> {
  await createPollJob(makeResourceId(owner, name), new Date());
}

// Reschedule after an interval change. Cancels the pending poll and creates
// a fresh one at `now + interval`. Two SDK calls; createPollJob has its own
// withRetry pass and the daily reconcile is the second-line defense, so a
// transient SDK failure during the create rarely surfaces. If a sustained
// failure does drop the schedule, the daily/startup reconcile heals it.
export async function rescheduleAfterIntervalChange(
  owner: string,
  name: string,
  intervalMinutes: number,
): Promise<void> {
  const id = makeResourceId(owner, name);
  await rootServer.jobScheduler.deleteByResourceId(id);
  await createPollJob(id, new Date(Date.now() + intervalMinutes * 60_000));
}

// Cancel any pending poll for a repo. Called from RemoveRepo after the row
// is deleted. `deleteByResourceId` completes silently when there are no
// matches — RemoveRepo doesn't need to know whether a job actually existed.
export async function cancelPolls(owner: string, name: string): Promise<void> {
  await rootServer.jobScheduler.deleteByResourceId(makeResourceId(owner, name));
}

// --- Job creation -----------------------------------------------------------

// Single helper for every "create a poll OneTime job" call site. Centralizing
// the JobInterval + tag avoids three subtly different inline `create` calls
// (an earlier shape this file had); a future change to job shape lands here
// once. Wrapped in withRetry because a transient SDK failure on this call is
// the failure mode that silently breaks the polling chain — a single retry
// pass turns the silent stop into a logged-then-recovered hiccup. The daily
// reconcile is the second-line defense for the still-failed case.
async function createPollJob(resourceId: string, start: Date): Promise<void> {
  await withRetry(`pollJobs.createPollJob(${resourceId})`, () =>
    rootServer.jobScheduler.create({
      resourceId,
      tag: POLL_TAG,
      start,
      jobInterval: JobInterval.OneTime,
    }),
  );
}

// --- Job handler ------------------------------------------------------------

async function onJob(event: JobData): Promise<void> {
  // Other apps share the same scheduler. Filter on our tags — sibling jobs
  // from a future feature in this app or another wouldn't accidentally
  // route through these handlers.
  if (event.tag === POLL_TAG) {
    await onPollJob(event);
    return;
  }
  if (event.tag === RECONCILE_TAG) {
    await onReconcileJob();
    return;
  }
  // Unknown tag — not ours. Ignore silently.
}

async function onReconcileJob(): Promise<void> {
  log("info", "pollJobs daily reconcile firing");
  try {
    await reconcilePollJobs();
  } catch (err) {
    // Reconcile is the safety net itself; if it fails, log loudly. The
    // next firing tomorrow is the next chance to recover.
    log("error", "pollJobs daily reconcile failed", errFields(err));
  }
}

async function onPollJob(event: JobData): Promise<void> {
  const parsed = parseResourceId(event.resourceId);
  if (!parsed) {
    log("error", "pollJobs onJob: malformed resourceId, dropping", {
      resourceId: event.resourceId,
    });
    return;
  }
  const { owner, name } = parsed;
  const db = getDb();
  const repo = await getRepo(db, owner, name);
  if (!repo) {
    // Repo was removed since this job was scheduled. Drop the firing —
    // FK cascade already cleaned up the archive entries; nothing to do.
    log("debug", "pollJobs onJob: repo no longer tracked, skipping", {
      owner,
      name,
    });
    return;
  }

  let pollStatus: number = POLL_STATUS_OK;
  let pollErrorMessage = "";

  try {
    await pollRepo(db, repo);
  } catch (err) {
    pollStatus = POLL_STATUS_ERROR;
    pollErrorMessage = pollErrorMessageFor(err);
    log("warn", "pollJobs poll failed", {
      owner,
      name,
      ...errFields(err),
    });
  }

  // Update last_poll_* unconditionally — successful or failed. A forever-
  // failing repo's `last_poll_at` still ticks forward, indicating "the
  // watcher IS reaching it (it just keeps getting errors)" and giving
  // operators a useful "when did this last run" timestamp.
  await updateRepoPollState(
    db,
    owner,
    name,
    Date.now(),
    pollStatus,
    pollErrorMessage,
  );

  // Schedule the next poll. We do this even on poll failure — the repo
  // might be transiently unreachable; the next attempt should still fire
  // on schedule rather than blocking the chain forever. createPollJob is
  // wrapped in withRetry, so a single transient SDK hiccup self-heals.
  // For a sustained failure that exhausts retries, the daily reconcile
  // job catches the silent-stop and re-creates the missing pending poll.
  try {
    await createPollJob(
      event.resourceId,
      new Date(Date.now() + repo.poll_interval_minutes * 60_000),
    );
  } catch (err) {
    log("error", "pollJobs failed to schedule next poll (after retries)", {
      owner,
      name,
      ...errFields(err),
    });
    // Don't throw — letting this propagate would surface in the SDK's job
    // event handler, which is not a useful place for it. The daily
    // reconcile or next startup reconcile heals.
  }
}

// Fetch from GitHub, filter against the cursor + prerelease toggle, and
// route each new release through onNewRelease. Throws on transport errors
// — the caller (onPollJob) catches and records the error in last_poll_*.
async function pollRepo(db: Database, repo: RepoRow): Promise<void> {
  const ghReleases: GitHubRelease[] = await listReleases(
    repo.owner,
    repo.name,
    POLL_PER_PAGE,
  );

  const cursor = await getCursorForRepo(db, repo.owner, repo.name);

  // Filter to truly new releases (id strictly greater than the cursor) and
  // honor the per-repo prerelease toggle. Sort ascending by id so the
  // oldest-of-the-new lands first — consistent with chronological feed
  // order. (The feed itself orders DESC; ascending insert means the newest
  // release ends up at `added_at` slightly later than the older ones,
  // which is the natural reading of "we saw the older one first, then the
  // newer one.")
  const includePrereleases = repo.include_prereleases === 1;
  const newReleases = ghReleases
    .filter((r) => r.id > cursor)
    .filter((r) => includePrereleases || !r.prerelease)
    .sort((a, b) => a.id - b.id);

  for (const r of newReleases) {
    await onNewRelease(db, {
      id: r.id,
      owner: repo.owner,
      name: repo.name,
      tagName: r.tag_name,
      releaseName: r.name ?? "",
      body: r.body ?? "",
      htmlUrl: r.html_url,
      publishedAt: r.published_at ? Date.parse(r.published_at) : Date.now(),
      prerelease: r.prerelease,
    });
  }
}

// --- ResourceId helpers -----------------------------------------------------

function makeResourceId(owner: string, name: string): string {
  return `${owner}/${name}`;
}

// Splits "owner/name" back into its parts. Returns undefined for malformed
// input so the caller can log and skip rather than throw — a malformed
// resourceId in a job firing means our own code stored it badly, which is
// a bug, not a runtime condition.
function parseResourceId(s: string): { owner: string; name: string } | undefined {
  const ix = s.indexOf("/");
  if (ix <= 0 || ix === s.length - 1) return undefined;
  return { owner: s.slice(0, ix), name: s.slice(ix + 1) };
}

// Map a thrown error to a short, human-readable message for the row's
// `last_error_message` (rendered as the RepoRow subtitle). We surface only
// the kind, not the underlying detail, because admin UIs don't want
// stack traces and the kind is enough to act on (network problem? rate
// limit? repo gone?).
function pollErrorMessageFor(err: unknown): string {
  if (err instanceof GitHubClientError) {
    switch (err.kind) {
      case "repo-not-found":
        return "Repository not found.";
      case "rate-limited":
        return "Rate limited — try again later.";
      case "unreachable":
        return "Could not reach GitHub.";
      case "invalid-url":
        // Shouldn't reach the poll path — URL parsing happens at AddRepo.
        // Defensive fall-through to generic message.
        return "Could not reach GitHub.";
    }
  }
  return "Could not reach GitHub.";
}
