import { Client, RootServerException } from "@rootsdk/server-app";
import {
  GetFeedRequest,
  GetFeedResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  AddRepoRequest,
  AddRepoResponse,
  UpdateRepoIntervalRequest,
  UpdateRepoIntervalResponse,
  UpdateRepoPrereleaseRequest,
  UpdateRepoPrereleaseResponse,
  RemoveRepoRequest,
  RemoveRepoResponse,
  TestRepoRequest,
  TestRepoResponse,
  ReportClientErrorRequest,
  ReportClientErrorResponse,
  Repo as ProtoRepo,
  Release as ProtoRelease,
  ReleaseWatcherError,
  PollStatus,
} from "@githubreleasewatcher/gen-shared";
import { ReleaseWatcherServiceBase } from "@githubreleasewatcher/gen-server";
import { getDb } from "./db";
import {
  RepoRow,
  countRepos,
  deleteRepo,
  getMostRecentSuccessfulPoll,
  getRepo,
  insertRepo,
  listRepos,
  updateRepoInterval as updateRepoIntervalRow,
  updateRepoPrerelease as updateRepoPrereleaseRow,
} from "./repoStore";
import { listFeed } from "./archiveStore";
import { rowToProto as releaseRowToProto } from "./releaseBroadcaster";
import {
  cancelPolls,
  rescheduleAfterIntervalChange,
  scheduleFirstPoll,
} from "./pollJobs";
import {
  GitHubClientError,
  getLatestRelease,
  parseGithubUrl,
  validateRepo,
} from "./githubClient";
import { isAdmin } from "./adminCheck";
import { getAdminAudience } from "./adminAudience";
import { safeBroadcast } from "./lib/safeBroadcast";
import { log, errFields } from "./lib/log";
import {
  DEFAULT_INTERVAL_MINUTES,
  ERROR_LABEL_CHARS,
  ERROR_MESSAGE_CHARS,
  ERROR_STACK_CHARS,
  ERROR_USER_AGENT_CHARS,
  INTERVAL_CEILING_MINUTES,
  INTERVAL_FLOOR_MINUTES,
  MAX_REPOS,
} from "./limits";

// ============================================================================
// ReleaseWatcherService — the RPC surface from release_watcher.proto.
//
// Admin-only RPCs call `await this.requireAdmin(client)` which throws
// RootServerException(NOT_ADMIN) on non-admins. Admin status is resolved
// against (owner || globalSettings.general.admins MemberGroup); see
// adminCheck.ts.
//
// Broadcast fan-out rules (also in DESIGN.md → Broadcasts):
//   - ReleaseAdded:    "all"; fired from releaseBroadcaster.onNewRelease
//   - RepoAdded:       "all"; minimal {owner, name} payload — public
//                       companion to RepoListChanged for non-admin home
//                       view count-bump (so the empty state clears before
//                       the first ReleaseAdded arrives, which may be
//                       ~1 minute away or never if the first poll fails)
//   - RepoRemoved:     "all"; minimal {owner, name} payload — public
//                       companion to RepoListChanged for non-admin feed
//                       cleanup (drops orphan cards immediately)
//   - RepoListChanged: admin-only; carries last_poll_* and last_error_message
//                       which non-admins have no reason to see (and which
//                       could leak external-service detail). Audience is
//                       the adminAudience MemberGroup (admins ∪ owner)
//   - AdminsChanged:   "all"; empty payload. Fires when globalSettings
//                       admins change so every client can re-fetch GetFeed
//                       and refresh am_i_admin
// ============================================================================

export class ReleaseWatcherService extends ReleaseWatcherServiceBase {
  // --- Public RPCs ---------------------------------------------------------

  async getFeed(
    _request: GetFeedRequest,
    client: Client,
  ): Promise<GetFeedResponse> {
    const db = getDb();
    // Feed, admin check, and the home view header pieces (poll timestamp +
    // repo count) are independent — fetch in parallel.
    const [rows, amIAdmin, mostRecentPoll, watchedCount] = await Promise.all([
      listFeed(db),
      isAdmin(client.userId),
      getMostRecentSuccessfulPoll(db),
      countRepos(db),
    ]);
    const releases: ProtoRelease[] = rows.map(releaseRowToProto);
    return {
      releases,
      amIAdmin,
      mostRecentSuccessfulPollAt: BigInt(mostRecentPoll),
      watchedRepoCount: watchedCount,
    };
  }

  // --- Admin RPCs ----------------------------------------------------------

  async getSettings(
    _request: GetSettingsRequest,
    client: Client,
  ): Promise<GetSettingsResponse> {
    await this.requireAdmin(client);
    const db = getDb();
    const rows = await listRepos(db);
    return { repos: rows.map(repoRowToProto) };
  }

  async addRepo(
    request: AddRepoRequest,
    client: Client,
  ): Promise<AddRepoResponse> {
    await this.requireAdmin(client);
    const db = getDb();

    // Parse URL first — bad input doesn't get to spend GitHub budget.
    let owner: string;
    let name: string;
    try {
      ({ owner, name } = parseGithubUrl(request.url));
    } catch {
      throw new RootServerException(
        ReleaseWatcherError.INVALID_URL,
        "Not a github.com repository URL",
      );
    }

    // Cap and dedupe checks BEFORE the GitHub call. Skipping these in favor
    // of "validate first, then check" would burn rate-limit budget on adds
    // that can't succeed anyway (cap reached, repo already watched).
    const count = await countRepos(db);
    if (count >= MAX_REPOS) {
      throw new RootServerException(
        ReleaseWatcherError.MAX_REPOS_REACHED,
        `Maximum ${MAX_REPOS} repositories. Remove one to add another.`,
      );
    }
    const existing = await getRepo(db, owner, name);
    if (existing) {
      throw new RootServerException(
        ReleaseWatcherError.REPO_ALREADY_WATCHED,
        `Already watching ${owner}/${name}.`,
      );
    }

    // Validate against GitHub. Single GET; does not fetch releases or touch
    // the feed. Maps GitHubClientError kinds to wire-shape error codes.
    try {
      await validateRepo(owner, name);
    } catch (err) {
      throw mapGitHubErrorToRpc(err);
    }

    // Persist + schedule. Same order as DESIGN.md → Validate-before-persist.
    const row = await insertRepo(db, {
      owner,
      name,
      pollIntervalMinutes: DEFAULT_INTERVAL_MINUTES,
      includePrereleases: false,
    });

    // scheduleFirstPoll → createPollJob is wrapped in withRetry, so a
    // single transient SDK hiccup self-heals. If retries are exhausted
    // we DON'T re-throw: the persistent state (the new row) genuinely
    // succeeded, and surfacing an error here would mislead the admin
    // into thinking the add itself failed (it didn't — re-trying gets
    // REPO_ALREADY_WATCHED). The daily/startup reconcile picks up
    // the missing schedule within ≤24h.
    //
    // Same pattern as the poll-chain reschedule in pollJobs.onPollJob;
    // applying it consistently across every "after this RPC succeeds,
    // a poll job should exist" call site keeps the policy uniform.
    // Trade-off documented in DESIGN.md → Persist-then-best-effort-schedule.
    try {
      await scheduleFirstPoll(owner, name);
    } catch (err) {
      log("error", "addRepo: scheduleFirstPoll failed after retries; reconcile will heal", {
        by: client.userId,
        owner,
        name,
        ...errFields(err),
      });
    }

    log("info", "repo added", {
      by: client.userId,
      owner,
      name,
    });

    // Two broadcasts after a successful add:
    //   RepoListChanged: admin-only; refreshes the Settings list with the
    //                    new row's per-row state.
    //   RepoAdded:       public; tells every client (admin or not) to bump
    //                    its watched-repo count so the home view can move
    //                    past "No repositories yet" without waiting for
    //                    the first ReleaseAdded broadcast. Mirrors the
    //                    public RepoRemoved on the other side.
    await this.broadcastRepoListSnapshot();
    await safeBroadcast("RepoAdded", () =>
      this.broadcastRepoAdded({ owner, name }, "all"),
    );
    return { repo: repoRowToProto(row) };
  }

  async updateRepoInterval(
    request: UpdateRepoIntervalRequest,
    client: Client,
  ): Promise<UpdateRepoIntervalResponse> {
    await this.requireAdmin(client);
    assertReasonableOwnerName(request.owner, request.name);
    const db = getDb();

    // Bounds check both ends. Client UI already enforces these, but the
    // server is the only authoritative boundary — a scripted client could
    // send any int32. The ceiling check matters: without it, a value like
    // Number.MAX_SAFE_INTEGER would saturate the next-poll Date math.
    if (request.pollIntervalMinutes < INTERVAL_FLOOR_MINUTES) {
      throw new RootServerException(
        ReleaseWatcherError.INTERVAL_TOO_LOW,
        `Polling interval must be at least ${INTERVAL_FLOOR_MINUTES} minutes.`,
      );
    }
    if (request.pollIntervalMinutes > INTERVAL_CEILING_MINUTES) {
      throw new RootServerException(
        ReleaseWatcherError.INTERVAL_TOO_HIGH,
        `Polling interval must be at most ${INTERVAL_CEILING_MINUTES} minutes.`,
      );
    }

    const existing = await getRepo(db, request.owner, request.name);
    if (!existing) {
      throw new RootServerException(
        ReleaseWatcherError.REPO_NOT_TRACKED,
        `${request.owner}/${request.name} is not being watched.`,
      );
    }

    // Read-then-write race: another admin may have removed the repo between
    // the getRepo check above and this UPDATE. updateRepoIntervalRow returns
    // whether any row was actually updated; if zero, short-circuit the
    // reschedule and broadcast to avoid fanning out a phantom change. Same
    // shape as removeRepo's wasDeleted check.
    const wasUpdated = await updateRepoIntervalRow(
      db,
      request.owner,
      request.name,
      request.pollIntervalMinutes,
    );
    if (!wasUpdated) {
      log("warn", "updateRepoInterval: row was already gone", {
        by: client.userId,
        owner: request.owner,
        name: request.name,
      });
      return {};
    }

    // Reschedule with the same persist-then-best-effort-schedule pattern
    // as AddRepo: the row is already updated to the new interval, so the
    // RPC's persistent effect succeeded. If reschedule fails after
    // retries, log and let reconcile heal (≤24h). See DESIGN.md →
    // Persist-then-best-effort-schedule for the trade-off.
    try {
      await rescheduleAfterIntervalChange(
        request.owner,
        request.name,
        request.pollIntervalMinutes,
      );
    } catch (err) {
      log("error", "updateRepoInterval: reschedule failed after retries; reconcile will heal", {
        by: client.userId,
        owner: request.owner,
        name: request.name,
        ...errFields(err),
      });
    }

    log("info", "repo interval updated", {
      by: client.userId,
      owner: request.owner,
      name: request.name,
      pollIntervalMinutes: request.pollIntervalMinutes,
    });

    await this.broadcastRepoListSnapshot();
    return {};
  }

  async updateRepoPrerelease(
    request: UpdateRepoPrereleaseRequest,
    client: Client,
  ): Promise<UpdateRepoPrereleaseResponse> {
    await this.requireAdmin(client);
    assertReasonableOwnerName(request.owner, request.name);
    const db = getDb();

    const existing = await getRepo(db, request.owner, request.name);
    if (!existing) {
      throw new RootServerException(
        ReleaseWatcherError.REPO_NOT_TRACKED,
        `${request.owner}/${request.name} is not being watched.`,
      );
    }

    // Read-then-write race guard — same pattern as updateRepoInterval.
    const wasUpdated = await updateRepoPrereleaseRow(
      db,
      request.owner,
      request.name,
      request.includePrereleases,
    );
    if (!wasUpdated) {
      log("warn", "updateRepoPrerelease: row was already gone", {
        by: client.userId,
        owner: request.owner,
        name: request.name,
      });
      return {};
    }

    log("info", "repo prerelease toggle updated", {
      by: client.userId,
      owner: request.owner,
      name: request.name,
      includePrereleases: request.includePrereleases,
    });

    await this.broadcastRepoListSnapshot();
    return {};
  }

  async removeRepo(
    request: RemoveRepoRequest,
    client: Client,
  ): Promise<RemoveRepoResponse> {
    await this.requireAdmin(client);
    assertReasonableOwnerName(request.owner, request.name);
    const db = getDb();

    // FK ON DELETE CASCADE clears the archive in the same transaction. If
    // deleteRepo returns false the row was already gone (concurrent delete
    // from another admin); skip the broadcasts so we don't fan out a stale
    // "removed" signal twice.
    const wasDeleted = await deleteRepo(db, request.owner, request.name);
    if (!wasDeleted) {
      log("warn", "removeRepo: row was already gone", {
        by: client.userId,
        owner: request.owner,
        name: request.name,
      });
      return {};
    }

    // Cancel the pending poll. SDK call is idempotent — completes silently
    // if no jobs match.
    await cancelPolls(request.owner, request.name);

    log("info", "repo removed", {
      by: client.userId,
      owner: request.owner,
      name: request.name,
    });

    // Two broadcasts — see DESIGN.md → Repo removal:
    //   RepoListChanged: admin-only; refreshes the Settings list with the
    //                    updated row state.
    //   RepoRemoved:     public; tells every client (admin or not) to drop
    //                    cards for this repo from its local feed.
    await this.broadcastRepoListSnapshot();
    await safeBroadcast("RepoRemoved", () =>
      this.broadcastRepoRemoved(
        { owner: request.owner, name: request.name },
        "all",
      ),
    );

    return {};
  }

  async testRepo(
    request: TestRepoRequest,
    client: Client,
  ): Promise<TestRepoResponse> {
    await this.requireAdmin(client);
    assertReasonableOwnerName(request.owner, request.name);
    const db = getDb();

    const existing = await getRepo(db, request.owner, request.name);
    if (!existing) {
      throw new RootServerException(
        ReleaseWatcherError.REPO_NOT_TRACKED,
        `${request.owner}/${request.name} is not being watched.`,
      );
    }

    // Fetch latest. NO archive write, NO broadcast — purely a per-caller
    // preview. See DESIGN.md → Test preview.
    //
    // No per-caller rate limit on this RPC. The 20 req/hr GitHub headroom
    // (60/hr ceiling minus the 40/hr worst-case poll rate at MAX_REPOS ×
    // INTERVAL_FLOOR) is the only budget for ad-hoc preview clicks. A bored
    // admin click-spamming Preview could in theory burn through it; in
    // practice the disclosure UI plus admin-gating makes it unlikely. Forks
    // that lift the cap or change the cadence floor should reconsider
    // adding a checkReportRate-style guard here. See Known limits in
    // README.md.
    const includePrereleases = existing.include_prereleases === 1;
    let ghRelease;
    try {
      ghRelease = await getLatestRelease(
        request.owner,
        request.name,
        includePrereleases,
      );
    } catch (err) {
      throw mapGitHubErrorToRpc(err);
    }

    if (!ghRelease) {
      // Empty Release means "no preview available"; client checks
      // `release.id !== 0`. See proto comment on TestRepoResponse.release.
      return { release: emptyRelease() };
    }

    return {
      release: {
        id: BigInt(ghRelease.id),
        owner: request.owner,
        name: request.name,
        tagName: ghRelease.tag_name,
        releaseName: ghRelease.name ?? "",
        body: ghRelease.body ?? "",
        htmlUrl: ghRelease.html_url,
        publishedAt: BigInt(
          ghRelease.published_at ? Date.parse(ghRelease.published_at) : 0,
        ),
        prerelease: ghRelease.prerelease,
        // No archive write means no `added_at` — we surface 0. The Test
        // preview component reads `published_at` for its timestamp; this
        // matches the real feed-card render exactly.
        addedAt: BigInt(0),
      },
    };
  }

  // --- Client telemetry ----------------------------------------------------

  async reportClientError(
    request: ReportClientErrorRequest,
    client: Client,
  ): Promise<ReportClientErrorResponse> {
    // Per-caller rate limit BEFORE size caps. A misbehaving boundary —
    // e.g., an ErrorBoundary whose own render path throws and re-mounts
    // in a tight loop — could otherwise flood the server log; size caps
    // bound each line's footprint but not the line rate. Drop silently
    // past the per-window cap (we do log a single "rate limited" line
    // per offender so the throttling itself is observable in aggregate).
    const now = Date.now();
    if (!checkReportRate(client.userId, now)) {
      return {};
    }
    // Defensive size cap on each field BEFORE we touch it. truncate()
    // narrows the logged value but the proto-deserialized request strings
    // are already in memory at full wire size — a hostile or buggy client
    // could send multi-MB stacks. Reject anything 10× past the truncate
    // limit so the per-request memory footprint is bounded.
    if (
      request.label.length > ERROR_LABEL_CHARS * 10 ||
      request.message.length > ERROR_MESSAGE_CHARS * 10 ||
      request.stack.length > ERROR_STACK_CHARS * 10 ||
      request.userAgent.length > ERROR_USER_AGENT_CHARS * 10
    ) {
      log("warn", "client error report dropped: oversized field", {
        userId: client.userId,
        labelLen: request.label.length,
        messageLen: request.message.length,
        stackLen: request.stack.length,
        userAgentLen: request.userAgent.length,
      });
      return {};
    }
    log("error", "client error reported", {
      userId: client.userId,
      label: truncate(request.label, ERROR_LABEL_CHARS),
      clientMessage: truncate(request.message, ERROR_MESSAGE_CHARS),
      stack: truncate(request.stack, ERROR_STACK_CHARS),
      userAgent: truncate(request.userAgent, ERROR_USER_AGENT_CHARS),
    });
    return {};
  }

  // --- Internal broadcasts -------------------------------------------------

  // Called from the adminCheck onAdminsChanged hook when globalSettings
  // admins shift. Fires AdminsChanged (empty event) to "all" so every
  // client re-fetches GetFeed and picks up its new am_i_admin. No snapshot
  // payload is sent — the admin-only RepoListChanged would leak per-row
  // state to non-admins (see the split rationale in the class header).
  async notifyAdminsChanged(): Promise<void> {
    await safeBroadcast("AdminsChanged", () =>
      this.broadcastAdminsChanged({}, "all"),
    );
  }

  // --- Helpers -------------------------------------------------------------

  private async requireAdmin(client: Client): Promise<void> {
    const ok = await isAdmin(client.userId);
    if (!ok) {
      throw new RootServerException(
        ReleaseWatcherError.NOT_ADMIN,
        "Admin only",
      );
    }
  }

  // Broadcasts the latest repo-list snapshot to the admin audience ONLY.
  // The payload carries per-row state (last_poll_*, last_error_message)
  // that GetSettings refuses to serve to non-admins, so the corresponding
  // broadcast must be gated too.
  //
  // Audience: the server-managed `adminAudience` MemberGroup, which mirrors
  // `globalSettings.general.admins ∪ ownerUserId`. This includes the owner
  // even when they aren't explicitly listed in the admins setting — see
  // adminAudience.ts for why that matters.
  //
  // If the audience is undefined (transient startup state, before
  // initializeAdminAudience() resolves), skip the broadcast — the only
  // admin is the owner, who is the one who just saved; no other admin
  // session exists to notify.
  //
  // The whole body is wrapped in try/catch — not just the broadcast call.
  // The snapshot fetch (`listRepos`) is part of the broadcast pipeline, so
  // a transient SQLite read failure here would otherwise propagate back
  // through the calling RPC and surface as an error to the admin even
  // though their persistent change (the addRepo / updateRepoInterval /
  // removeRepo write before this call) succeeded. Same shape as
  // safeBroadcast itself but covering more than the wire call.
  private async broadcastRepoListSnapshot(): Promise<void> {
    try {
      const audience = getAdminAudience();
      if (!audience) return;
      const db = getDb();
      const rows = await listRepos(db);
      await safeBroadcast("RepoListChanged", () =>
        this.broadcastRepoListChanged(
          { repos: rows.map(repoRowToProto) },
          audience,
        ),
      );
    } catch (err) {
      log("error", "broadcastRepoListSnapshot failed; admins will see stale list until next refetch", errFields(err));
      // Swallow. Admin RPCs that triggered this expect "best-effort
      // broadcast"; the persistent change has already happened. Admin
      // clients reconcile on next GetSettings (navigation, reload,
      // subsequent edit).
    }
  }
}

// --- Module-scope helpers ---------------------------------------------------

// Sanity bound on caller-supplied owner/name strings on admin RPCs other
// than AddRepo. AddRepo itself runs through parseGithubUrl + validateRepo,
// which is its own validation; the other admin RPCs (updateRepoInterval,
// updateRepoPrerelease, removeRepo, testRepo) trust whatever pair the
// client sends and only check existence by getRepo.
//
// Without this guard, a hostile or buggy client could send a 100 KB owner
// string that:
//   (a) gets logged at full size by every log("info"/"warn", ...) line that
//       includes the identifier (we have several per RPC),
//   (b) becomes part of the resourceId we pass to scheduler RPCs,
//   (c) bloats per-request memory.
// GitHub itself caps owner at 39 chars and name at 100 chars, so 255 is
// generous — anything longer is by definition not a real GitHub
// owner/name and we can reject without false positives.
const MAX_OWNER_NAME_LENGTH = 255;

function assertReasonableOwnerName(owner: string, name: string): void {
  if (
    owner.length > MAX_OWNER_NAME_LENGTH ||
    name.length > MAX_OWNER_NAME_LENGTH
  ) {
    throw new RootServerException(
      ReleaseWatcherError.INVALID_URL,
      "Owner/name too long.",
    );
  }
}

// Per-caller fixed-window rate limit for ReportClientError. Each userId is
// allowed REPORT_RATE_MAX_PER_WINDOW reports per REPORT_RATE_WINDOW_MS;
// requests past the cap drop silently. Defends against the misbehaving-
// boundary failure mode where a client's ErrorBoundary re-mounts in a
// loop, flooding the server log.
//
// Implementation choices:
//   - Fixed window, not token bucket: simpler to read; the goal here is
//     "this user can't dominate the log", not metered fairness.
//   - In-memory Map: scoped to the app's process. If the app is ever
//     scaled horizontally, replace with Redis-backed counters.
//   - Lazy periodic sweep: a long-running process accumulates Map entries
//     for every distinct caller. Sweeping stale entries every
//     REPORT_RATE_SWEEP_INTERVAL_MS keeps the Map bounded without a
//     dedicated cron — amortized O(1) per call.
const REPORT_RATE_MAX_PER_WINDOW = 10;
const REPORT_RATE_WINDOW_MS = 60_000;
const REPORT_RATE_SWEEP_INTERVAL_MS = 5 * 60_000;

interface RateWindow {
  count: number;
  windowStartMs: number;
}
const reportRateLimit = new Map<string, RateWindow>();
let lastReportRateSweepMs = 0;

function checkReportRate(userId: string, now: number): boolean {
  // Periodic sweep — drop any window that's already expired. Only runs
  // every REPORT_RATE_SWEEP_INTERVAL_MS so most calls skip the iteration.
  if (now - lastReportRateSweepMs > REPORT_RATE_SWEEP_INTERVAL_MS) {
    for (const [uid, w] of reportRateLimit) {
      if (now - w.windowStartMs > REPORT_RATE_WINDOW_MS) {
        reportRateLimit.delete(uid);
      }
    }
    lastReportRateSweepMs = now;
  }
  const entry = reportRateLimit.get(userId);
  if (!entry || now - entry.windowStartMs > REPORT_RATE_WINDOW_MS) {
    reportRateLimit.set(userId, { count: 1, windowStartMs: now });
    return true;
  }
  if (entry.count >= REPORT_RATE_MAX_PER_WINDOW) {
    // Log exactly once per window-crossing so the throttling is observable
    // without spamming the log itself. The next firing in a fresh window
    // resets `count` to 1 and skips this branch.
    if (entry.count === REPORT_RATE_MAX_PER_WINDOW) {
      log("warn", "client error reports rate-limited for caller", {
        userId,
        windowMs: REPORT_RATE_WINDOW_MS,
        maxPerWindow: REPORT_RATE_MAX_PER_WINDOW,
      });
    }
    entry.count++;
    return false;
  }
  entry.count++;
  return true;
}


// Convert an internal RepoRow to the wire-shape proto Repo. The integer
// last_poll_status column already matches the PollStatus enum encoding,
// so it casts directly. Empty `last_error_message` round-trips as "".
function repoRowToProto(row: RepoRow): ProtoRepo {
  return {
    owner: row.owner,
    name: row.name,
    pollIntervalMinutes: row.poll_interval_minutes,
    includePrereleases: row.include_prereleases === 1,
    addedAt: BigInt(row.added_at),
    lastPollAt: BigInt(row.last_poll_at),
    lastPollStatus: row.last_poll_status as PollStatus,
    lastErrorMessage: row.last_error_message,
  };
}

// Default-constructed Release. Used as a sentinel from TestRepo when the
// repo has no eligible release (e.g., zero releases on GitHub, or
// /releases/latest 404 because all releases are prereleases and the toggle
// is off). Clients check `release.id !== 0` before rendering.
function emptyRelease(): ProtoRelease {
  return {
    id: BigInt(0),
    owner: "",
    name: "",
    tagName: "",
    releaseName: "",
    body: "",
    htmlUrl: "",
    publishedAt: BigInt(0),
    prerelease: false,
    addedAt: BigInt(0),
  };
}

// Map GitHubClientError kinds to wire-shape ReleaseWatcherError codes.
// Centralized so both AddRepo and TestRepo (the two RPCs that hit GitHub
// inline) surface consistent codes for the same conditions.
function mapGitHubErrorToRpc(err: unknown): RootServerException {
  if (err instanceof GitHubClientError) {
    switch (err.kind) {
      case "invalid-url":
        return new RootServerException(
          ReleaseWatcherError.INVALID_URL,
          err.message,
        );
      case "repo-not-found":
        return new RootServerException(
          ReleaseWatcherError.REPO_NOT_FOUND,
          "Repository not found.",
        );
      case "rate-limited":
        return new RootServerException(
          ReleaseWatcherError.GITHUB_RATE_LIMITED,
          "GitHub rate limit reached. Try again in a minute.",
        );
      case "unreachable":
        return new RootServerException(
          ReleaseWatcherError.GITHUB_UNREACHABLE,
          "Could not reach GitHub.",
        );
    }
  }
  return new RootServerException(
    ReleaseWatcherError.GITHUB_UNREACHABLE,
    "Could not reach GitHub.",
  );
}

// Cap a string to `max` code points (not UTF-16 code units), appending an
// ellipsis marker when truncated. The marker length is reserved INSIDE the
// cap so the returned string is always ≤ max code points — important
// because the per-field caps drive log-line bounds, not just intent. Used
// by the telemetry handler.
//
// Why code-point aware: `String.prototype.slice` cuts at UTF-16 code
// units, which can land halfway through a surrogate pair for astral
// characters (emoji, some CJK ideographs). The resulting lone surrogate is
// not valid UTF-8, and some log pipelines will either drop the whole line
// or replace the half-character with U+FFFD. `Array.from(s)` iterates by
// code point so a slice-then-join is always valid output.
const TRUNCATE_MARKER = "…[truncated]";
const TRUNCATE_MARKER_LEN = Array.from(TRUNCATE_MARKER).length;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const codePoints = Array.from(s);
  if (codePoints.length <= max) return s;
  // Reserve marker length within the cap. For pathological `max` values
  // smaller than the marker itself, fall back to just the marker so we
  // never produce garbled output (no negative slice index).
  const room = Math.max(0, max - TRUNCATE_MARKER_LEN);
  return codePoints.slice(0, room).join("") + TRUNCATE_MARKER;
}

export const releaseWatcherService = new ReleaseWatcherService();
