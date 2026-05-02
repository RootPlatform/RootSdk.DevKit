---
kind: sample-app
description: Watches a curated list of GitHub repositories for new releases and surfaces them as an in-app feed
complexity: complex
key_patterns:
  - external-service polling via chained `OneTime` jobs
  - four-layer reliability (`withRetry` + `JobMissed` + startup reconcile + daily safety-net)
  - validate-before-persist
  - persist-then-best-effort-schedule
  - custom `MemberGroup` for admin broadcast audience
  - per-field auto-save with separate per-field RPCs
---

# github-release-watcher

Watches a curated list of GitHub repositories for new releases and surfaces them as an in-app feed. Admins manage the watched repos in an in-app Settings view: add by URL, set per-repo polling interval, toggle prerelease inclusion, preview the latest release before committing, and remove. The home feed shows the most recent ~50 releases across all watched repos with a live highlight pulse on each new card. App admins themselves are configured via Root's native Global Settings UI for this app.

This sample is the canonical reference for **external-service integration**: outbound HTTP, scheduled polling with rate-limit awareness, dedupe state, in-app archive, and multi-row admin configuration with cross-row constraints. It teaches the patterns of "validate against an external API → persist → schedule polling → broadcast results" that any app integrating with a third-party service will repeat in some form.

> **Standard Root app fork procedure and shared lib helpers** are in [../AGENTS.md](../AGENTS.md). What follows is specific to forking *this* sample.

## Demonstrates

*External-service integration*
- **Chained `OneTime` polling jobs** for sub-daily cadence. `rootServer.jobScheduler` only offers `OneTime`/`Daily`/`Weekly`/`Monthly`/`Yearly` — no `Minutely` or `Hourly` — so each watched repo owns at most one pending job; the handler polls and schedules the next firing.
- **Four-layer reliability**, innermost first: `withRetry` on every `createPollJob` call → `JobScheduleEvent.JobMissed` replays → startup `reconcilePollJobs` → daily safety-net reconcile that bounds silent-stop failures to ≤24h regardless of restart cadence.
- **Outbound HTTP retry distinct from SDK retry.** Different error vocabulary (HTTP status codes + `Retry-After` header vs SDK `ErrorCodeType`); separate helpers (`fetchWithRetry` in `githubClient.ts` vs `withRetry` in `lib/retry.ts`); same bounded-jitter shape.
- **Per-source dedupe via service-provided `id`, not timestamp.** Release notes can be edited (mutates `published_at`); `id` is immutable and monotonic. The release archive *is* the cursor — no separate cursor key.

*Admin gating + broadcasts*
- **Custom `MemberGroup` for the admin broadcast audience** (`adminAudience` mirrors `globalSettings.general.admins ∪ ownerUserId`). Required so an owner driving Settings receives their own `RepoListChanged` updates even when not explicitly listed in the admins setting — the owner is the most likely person running Settings in the early life of a community, so this is a load-bearing edge case, not a corner one.
- **Public/admin broadcast split.** Admin-only payloads (`RepoListChanged`) carry per-row state (last-poll timestamps, error messages) and target the custom audience; public companions (`RepoAdded`, `RepoRemoved`) carry minimal `{owner, name}` identifiers and target `"all"`.

*RPC contract patterns*
- **Validate-before-persist.** External-API check runs before any DB write; row exists ⟺ source has been validated.
- **Persist-then-best-effort-schedule.** When an RPC must persist + schedule, persist first; if schedule fails after `withRetry` exhausts, log loudly and return success (reconcile heals). Don't lie to the user about persistent state.
- **Server-side bounds on every value the server stores or schedules off** (floor + ceiling, not just floor) — client `NumberInput` caps aren't enforcement.
- **Centralized dispatch funnel** (`onNewRelease`) for all "new item arrives in the system" paths, decoupled from the service via a registration callback to avoid circular imports.
- **`RootServerException` with structured proto-defined error codes** mapped to user-facing strings on the client.

*Settings UX*
- **Admin-gated in-app Settings with per-field auto-save** — separate per-field RPCs (`UpdateRepoInterval`, `UpdateRepoPrerelease`) so concurrent admin edits across rows don't coalesce into a single payload that re-stomps unrelated fields. No Save buttons; debounced commit.
- **Inline two-step confirm** for low-stakes destructive actions (no modal). Click Remove → row swaps to `Cancel | Remove` pair with a one-line prompt. Second Remove click commits; Cancel/click-outside reverts.
- **Destructive icon-buttons red at rest** per Root convention — destructive intent visible *before* commit, not grey-then-red on hover.

*Foundation*
- **URL display with click-to-copy.** Root's client iframe blocks external navigation, so the release URL is rendered as a click-to-copy button (Clipboard API + transient "Copied!" feedback + `user-select: all` fallback for right-click → Copy) rather than as an anchor.
- **Backfill on first add.** First poll uses the same `per_page=3` page size as steady-state polling; the dedupe cursor is `0` for a fresh repo, so all three flow through the funnel and seed the feed within seconds of save.

## Does NOT demonstrate

*Out of scope for this product shape:*
- Channel posting / messaging — this app's product is the in-app feed; releases are surfaced as cards, not channel messages. See [`api-samples/server-messages`](../../api-samples/server-messages).
- File or asset handling — see [`api-samples/client-app-assets`](../../api-samples/client-app-assets) and [`api-samples/server-files`](../../api-samples/server-files).
- Channel/group enumeration UI — see [`api-samples/server-channels`](../../api-samples/server-channels).
- Moderation actions (kick, ban, delete) — see [`api-samples/server-kick-ban`](../../api-samples/server-kick-ban).

*Intentionally simplified for teaching (a fork may need them):*
- Authenticated GitHub access — runs against the 60 req/hr unauthenticated public-API tier so the sample stays runnable without a credential setup. Forks needing higher throughput or private repos should add a credential setting and pass an `Authorization: token <pat>` header from `githubClient`. The retry/backoff machinery already in place handles authenticated 429s identically.
- Cross-process cache coherence — the in-memory caches assume a single-process app server. See [Known production limits](#known-production-limits) for the upgrade path.
- Reconnect-driven feed catch-up — depends on an SDK reconnect hook that doesn't exist yet. See [Known production limits](#known-production-limits).
- Backfill beyond the most recent 3 releases on first add — no historical reconstruction; only releases newer than the cursor appear after the first poll.
- Type-to-confirm pattern for high-stakes destructive actions. Removing a watched repo is low-stakes (archive entries are reconstructable by re-adding) so inline two-step is sufficient. For higher-stakes actions, reach for the type-to-confirm pattern from `apps/leveling-leaderboard`.
- Budget-meter UI for rate-limit headroom. The 10-repo cap and 15-minute floor keep the math comfortably under the unauthenticated ceiling; a meter would teach generic React rather than Root patterns.

## Adapt — sample-specific shapes

These files are shaped for github-release-watcher's specific data, but the **shape** is the lesson. Each row teaches a generalized pattern that transfers to apps with similar shape:

| File | What to change |
|---|---|
| `server/src/pollJobs.ts` | Replace `resourceId = "{owner}/{name}"` with your domain identifier. Keep `withRetry`-wrapped `createPollJob`, `reconcilePollJobs`, `scheduleReconcileJob` (Daily safety-net). Keep the chained-`OneTime` poll handler shape and the rule "use platform native recurrence when one matches; chain `OneTime` only for sub-daily." |
| `server/src/githubClient.ts` | Replace endpoints, payload types, and URL parser with your service's. Keep `fetchWithRetry` (status-code + `Retry-After` aware), URL canonicalization at parse time, and the structured `*ClientError` with discriminated `kind`s. |
| `server/src/repoStore.ts` | Replace schema with your domain rows. Keep `PRAGMA foreign_keys = ON`, `ON DELETE CASCADE` between parent and archive, the in-memory cache + invalidation pattern, and atomic SQL for the mutations the service depends on. |
| `server/src/archiveStore.ts` | Replace columns with your archive shape. Keep the `MAX(id)` dedupe cursor (use whatever monotonic id your service provides — not timestamps), and the cap-on-insert prune. |
| `server/src/releaseBroadcaster.ts` | Replace `onNewRelease` with your domain dispatch funnel. Keep the registration-callback shape (`setReleaseBroadcaster(...)`) — direct service imports re-introduce a circular import that works only by lazy reference. Keep the local-capture-before-await idiom. |
| `server/src/releaseWatcherService.ts` | Replace RPCs with your domain. Keep `requireAdmin` defence-in-depth on every admin RPC, the proto-defined error code mapping, the validate-before-persist order, and the persist-then-best-effort-schedule shape. |
| `server/src/adminAudience.ts` | Keep verbatim. Custom `MemberGroup` named `adminAudience` mirroring `admins ∪ owner`, re-synced on `globalSettings.update` and `CommunityEdited`. |
| `server/src/limits.ts` | Re-derive caps from your external service's published quota. The math `MAX_REPOS × (60 / INTERVAL_FLOOR_MINUTES) ≤ ceiling - headroom` is what's transferable. |
| `client/src/contexts/{FeedContext,RepoContext}.tsx` | Replace `Release`/`Repo` types with your domain. Keep the load-on-mount + broadcast-subscription shape and the `softReload()` for non-user-initiated refreshes. |
| `client/src/components/RepoRow.tsx` | Replace fields and field RPCs. Keep one `useDebouncedMutation` per editable field, the inline two-step Remove confirm, the destructive-red-at-rest trash icon, and the Preview disclosure shape. |
| `client/src/components/ReleaseCard.tsx` | Replace card content with your domain. Keep the click-to-copy URL shape (Clipboard API + `user-select: all` fallback), the mask-fade body excerpt, the prepend highlight pulse on broadcast. |
| `client/src/views/{HomeView,Settings}.tsx` | Replace the rendered domain. Keep the auto-save wiring, AdminOnly defence, the empty/loading/error states, and the count-header pattern. |

## Replace — pure github-release-watcher concerns

These are domain-specific to release-watching — your fork replaces them entirely:

- `networking/src/release_watcher.proto` (your proto)
- The release-card body excerpt + markdown-strip in `ReleaseCard.tsx` (your domain rendering)
- The repo-URL parser and GitHub-specific endpoints in `githubClient.ts`
- The release-feed copy strings (button labels, error messages, placeholders) inline across components
- Constants in `server/src/limits.ts` (`MAX_REPOS`, `INTERVAL_FLOOR_MINUTES`, `INTERVAL_CEILING_MINUTES`, `DEFAULT_INTERVAL_MINUTES`, `POLL_PER_PAGE`, `ARCHIVE_CAP`)

## Sample-specific fork notes

Beyond the [standard fork procedure](../AGENTS.md#standard-root-app-fork-procedure):

- **Step 3 (manifest):** the sample declares `"permissions": {}` — see [Permissions and roles](#permissions-and-roles) for why. The only manifest entry that matters is `general.admins`. If your fork posts to channels or enumerates community structure, that's a different shape and you'll need narrower permissions declared.
- **Step 4 (proto):** keep the public/admin broadcast split. The admin-only event (`RepoListChanged` analog) carries per-row state and targets the custom `adminAudience` group; the public companions carry minimal identifiers. Without the public companions, non-admin clients can't drop orphaned cards on remove or leave the empty state on add until the next manual refetch.
- **Step 4 (proto):** enum-prefix every value (`MY_ERROR_NOT_ADMIN`, `MY_ERROR_INVALID_INPUT`, etc.) — partial prefixing produces inconsistent TS names. The proto generator strips the prefix in TS.
- **Step 4 (proto):** keep a `ReportClientError` RPC for the telemetry funnel.
- **Step 5 (server-side):** rebuild `pollJobs.ts` for your cadence. Use the platform's native `JobInterval` if one matches; chain `OneTime` only when you need sub-daily. Keep the four-layer reliability stack — every layer covers a failure mode the others don't, and removing one creates a silent-stop blind spot.
- **Step 5 (server-side):** rebuild `githubClient.ts` with `fetchWithRetry` for your service. Don't reuse the SDK `withRetry` — outbound HTTP has different error vocabulary (status codes, `Retry-After` header) than SDK calls (`ErrorCodeType`).
- **Step 5 (server-side):** keep `adminAudience.ts` verbatim if your fork has an admin-gated broadcast. Replacing it with the bare `globalSettings.general.admins` group reintroduces the owner-misses-own-broadcast bug.
- **Step 6 (client):** keep separate per-field RPCs for auto-save in row editors. A single `UpdateRepo` payload-stomps concurrent edits across rows on coalesce.
- **Step 8 (verify invariants):** the reconcile invariant — *every persisted row has a corresponding scheduled job (or arrives at one within reconcile latency)* — is the load-bearing one. Run the server through one full cycle (add → poll → restart → verify schedule recreated) before considering the fork complete.

## Implementation patterns

### How polling works

Per-repo polling uses `rootServer.jobScheduler`. The scheduler offers `OneTime`, `Daily`, `Weekly`, `Monthly`, and `Yearly` recurrence — there is no `Minutely` or `Hourly` interval — so sub-daily cadence is expressed as **chained `OneTime` jobs**. Each watched repo owns at most one pending poll job at a time, identified by `resourceId = "{owner}/{name}"` and `tag = "poll"`.

**Lifecycle:**

1. **`AddRepo`** — server inserts the row into `watched_repos`, then creates a `OneTime` job with `start = now`. The first poll runs immediately and seeds the feed (see [Backfill on add](#backfill-on-add)).
2. **`JobScheduleEvent.Job` (and `JobScheduleEvent.JobMissed`, same handler)** — parse `resourceId` to recover `owner/name`; fetch the row from `watched_repos` (return early if it was removed); poll GitHub via `GET /repos/{owner}/{name}/releases?per_page=3` wrapped in `withRetry`; filter to `id > COALESCE((SELECT MAX(id) FROM releases WHERE owner=? AND name=?), 0)` (the `COALESCE` matters: a fresh repo has no archive rows, so `MAX(id)` returns `NULL`, and `id > NULL` is `NULL`/false — this would drop every release on first poll); drop prereleases when `include_prereleases` is false; sort ascending by `id`; run `onNewRelease(release)` for each; update `last_poll_at`, `last_poll_status`, `last_error_message`; create the next `OneTime` job at `start = now + poll_interval_minutes * 60_000`.
3. **`UpdateRepoInterval`** — update the row, then `deleteByResourceId(resourceId)` cancels the pending poll and a fresh `OneTime` is created at the new interval offset from now.
4. **`RemoveRepo`** — delete the row in a transaction (FK cascade clears archive entries), then `deleteByResourceId(resourceId)` cancels any pending poll for it.

Every poll fetches `per_page=3` — the same page size for first-poll backfill and steady-state polling. There is no first-poll-vs-regular-poll branch.

### Four-layer reliability (innermost first)

In firing order — each layer fires only when the prior one has failed or doesn't apply:

1. **`withRetry` on `createPollJob`** (innermost — directly wraps the SDK call). Absorbs transient SDK hiccups inline; 4 attempts with exponential backoff and bounded jitter (`base + Math.random() * (capped - base)` so first-retry delays have a real minimum). Most flake stops here.
2. **`JobScheduleEvent.JobMissed`** (medium-latency — fires on next server start after downtime). Replays poll jobs whose start times passed while the server was down.
3. **Startup `reconcilePollJobs`** (run-once-at-start). Heals two failure modes `JobMissed` doesn't cover: **mid-state crashes** (handler crashed between writing SQLite and scheduling the next job) and **long outages** where very old missed jobs may not replay. Walks `watched_repos` vs `jobScheduler.listByTag("poll")`; drops orphan jobs whose `resourceId` no longer corresponds to a watched repo; schedules missing jobs with `start: new Date()`. Newly-scheduled missing jobs use "now" rather than reconstructing what their next-poll time *should have been* — after an outage the right behavior is "fetch fresh data now," not continuity with a stale schedule. Dedupe via `MAX(id)` ensures already-archived releases aren't re-broadcast even if the catch-up poll returns them.
4. **Daily reconcile job** (outermost — bounded ≤24h independent of restart cadence). A `JobInterval.Daily` job that re-runs `reconcilePollJobs()` once per day. Belt-and-suspenders for the silent-stop case where `withRetry` exhausted attempts and still failed during a long-running deployment that never restarts.

The asymmetry — chained `OneTime` for polling, native `JobInterval.Daily` for the reconcile — is deliberate. The platform handles `Daily` recurrence natively (auto-reschedules each firing), so there's no "fail to schedule the next one" silent-stop failure mode for it. The chained-`OneTime` pattern is required only because the cadence we want is **sub-daily** and the platform's smallest native recurrence is `Daily`. **General rule:** use the platform's native recurrence when one matches your cadence; chain `OneTime` jobs only when you need sub-daily cadence.

The daily scheduling is itself **idempotent at startup** — if the job already exists from a prior startup, leave it alone rather than recreating with a fresh `now + 24h` start. Otherwise frequent restarts (cron deploys, autoscaler churn) would push the first firing forever and starve the safety net of its purpose.

When multiple repos are due in the same minute, the platform fires their jobs in parallel. With the 10-repo cap and 15-minute floor, the worst-case burst is 10 simultaneous GitHub fetches — well within both GitHub's tolerance and the SDK's HTTP capacity. No app-level concurrency cap is needed.

### Outbound HTTP retry distinct from SDK retry

`fetchWithRetry` in `githubClient.ts` is **not** the same helper as `withRetry` in `lib/retry.ts`. Outbound HTTP has different error vocabulary:

- HTTP status codes (429 = rate limited; 5xx = retry; 4xx other = give up)
- `Retry-After` header (when present, honour it as the backoff floor for that attempt)

The SDK `withRetry` helper speaks `ErrorCodeType` and doesn't know about HTTP. They share the same bounded-jitter shape and attempt budget, but the predicate for "is this retryable?" and the per-attempt backoff calculation are different enough that mashing them together would be a worse abstraction than two helpers with parallel structure.

### Per-source dedupe via service-provided `id`

Per `(owner, name)`, the dedupe cursor is implicit: `MAX(id) FROM releases WHERE owner=? AND name=?`. The release archive *is* the cursor. There is no separate cursor key.

Why `id` and not `published_at`:

- `id` is monotonically increasing and immutable across release-note edits — surviving the case where a maintainer fixes a typo in a release body without re-firing the broadcast.
- `published_at` can be backdated; relying on it can miss releases dated earlier than recent ones.
- A single integer comparison; no timestamp parsing or timezone handling.

### Validate-before-persist

For RPCs that ingest user-supplied references to external entities (URLs, IDs, paths in another system), validate the reference *before* writing anything persistent.

`AddRepo(url)` runs through this order:

1. **Local checks** (URL parse, cap, dedupe) — no DB write, no external call.
2. **External validation** — single `GET /repos/{owner}/{name}` against GitHub, just enough to confirm the entity exists.
3. **Persist only on success.** Any failure at steps 1–2 returns a structured error code (`INVALID_URL`, `MAX_REPOS_REACHED`, `REPO_ALREADY_WATCHED`, `REPO_NOT_FOUND`, `GITHUB_RATE_LIMITED`, `GITHUB_UNREACHABLE`); nothing is persisted.

The DB invariant is then *"every row represents a real, currently-valid external entity at the time it was added."* No `validation_status` column is needed because nothing else is allowed in. Once persisted, ongoing health is tracked per-row by status fields (`last_poll_status`, `last_error_message`); a row whose external entity disappears or moves starts producing poll errors and surfaces them in the UI — admin can remove and re-add to recover.

**Why local-checks-first.** Local checks come before external validation so bad input doesn't burn external rate-limit budget on adds that can't succeed anyway. For a public-API service like GitHub with a 60-req/hour ceiling, this matters — a refresh-spamming admin shouldn't be able to drain the budget by re-adding a repo that's already watched.

### Owner / name canonicalization

For external references whose source treats them case-insensitively (GitHub repo paths, file paths on case-insensitive filesystems, email addresses, etc.) but where you store them as a byte-exact PRIMARY KEY: canonicalize at parse time so every downstream consumer sees the same form.

`parseGithubUrl` lowercases owner and name before returning them. Without it, an admin who pastes the same repo twice in different cases gets two rows, two pollers, double broadcasts. The canonical form propagates to the DB key, the GitHub API path, the dedupe cursor, and the `resourceId` for the scheduled job — every place that matters.

(Caveat for installs that pre-date this canonicalization: a one-time `UPDATE watched_repos SET owner = LOWER(owner), name = LOWER(name)` migration is needed for legacy rows. Left out of the schema migrations here because it's only relevant to those installs.)

### Persist-then-best-effort-schedule

For RPCs that need to *both* persist state *and* schedule downstream work (poll job, periodic broadcast, etc.): persist first, then make the schedule call inside a `try/catch` that logs but doesn't re-throw. The reconcile pass picks up any missed schedule.

```ts
const row = await persistStore.insert({ ... });
try {
  await scheduleSomething(row);            // withRetry-wrapped SDK call
} catch (err) {
  log("error", "RPC: schedule failed after retries; reconcile will heal", {
    by: client.userId, ...identifiers, ...errFields(err),
  });
}
// Fall through — return success.
```

`scheduleSomething` is the `withRetry`-wrapped SDK call (the inner reliability layer). If retries exhaust, the row is still persisted; the only thing missing is the downstream schedule. The daily/startup reconcile pass creates the missing schedule within ≤24h.

**Why not throw on schedule failure?** The persistent state already reflects what the user asked for. Surfacing an error makes them think the RPC failed, but they can't recover by retrying — they get an "already exists" error on retry. The honest message is "succeeded; downstream scheduling will be reconciled" — the binary "throw on schedule failure" shape claimed a stricter synchronous promise than the system actually delivered.

**Contract trade-off.** The synchronous guarantee is *"persistent state correct + downstream scheduling correct within reconcile latency (≤24h)"*, not *"... correct now"*. Forks needing stricter SLOs should consider:

- Two-phase commit between the DB and the job scheduler — not currently supported by the platform; would require app-level work.
- A rollback `delete` on schedule failure — but the same SDK that just failed `withRetry` is being asked to perform a clean delete, which is fragile under sustained outage. Not recommended.
- A separate "schedule degraded" signal alongside RPC success, leaving the user informed without misleading them about persistent state. Reasonable for SLO-critical apps; out of scope for this sample.

**Apply uniformly.** The chained reschedule in `onPollJob` ("schedule next poll" after a poll completes), `AddRepo`'s `scheduleFirstPoll`, and `UpdateRepoInterval`'s `rescheduleAfterIntervalChange` all use the same shape. Consistent policy across every "row exists ⟹ schedule exists" call site is what makes the reconcile invariant tractable to reason about.

### Custom `MemberGroup` for admin broadcast audience

The `RepoListChanged` audience is **not** the bare `globalSettings.general.admins` `ReadOnlyMemberGroup`. It's a server-managed `MemberGroup` named `adminAudience` that mirrors `globalSettings.general.admins ∪ ownerUserId`.

**Why the union matters.** The community owner is *implicitly* an admin (defence in depth — they can never lock themselves out of their own community), but they may not be explicitly listed in the `admins` selection. If we used the raw `admins` group as the audience, an owner driving Settings would write the row, broadcast `RepoListChanged` to admins-the-group, and **not receive their own broadcast** — their Settings list would go stale until they manually refreshed. Since the owner is the most likely person to be running Settings in the early life of a community, this is a load-bearing edge case, not a corner one.

**Lifecycle.** Created (or fetched, if already present from a prior run) at `lifecycle.start` via `rootServer.memberGroups.getByName("adminAudience")`, with the userIds set to the union. Re-synced on:

- `globalSettings.update` events (admins selection changed)
- `CommunityEdited` events (owner changed — rare but real)

The sync is idempotent: read both inputs, compute the union, write the resulting userIds. Cheap enough to do unconditionally on every event.

If `getAdminAudience()` returns `undefined` during a transient startup window (`initializeAdminAudience` hasn't completed), `RepoListChanged` broadcasts skip silently — the only admin in that window is the owner, who is the one who just saved, so no other session needs to be told.

### Public/admin broadcast split

Five event types with distinct audiences:

| Event | Audience | Triggered by | Payload (approx) |
|---|---|---|---|
| `ReleaseAdded` | `"all"` | A poll cycle discovers a new release; `onNewRelease(release)` archives + broadcasts | `{ release: Release }` — full message, ~400–800 B depending on body excerpt |
| `RepoAdded` | `"all"` | `AddRepo` — public companion to `RepoListChanged`. Lets every client bump its `watchedRepoCount` so the home view leaves the "No repositories yet" empty state without waiting for the first `ReleaseAdded` (which may be ~1 minute away, or never if the first poll fails) | `{ owner, name }` — minimal identifiers only |
| `RepoRemoved` | `"all"` | `RemoveRepo` — fired after the row is deleted and its archive entries are FK-cascaded out | `{ owner, name }` — minimal identifiers only |
| `RepoListChanged` | Admin-only (`adminAudience`) | `AddRepo`, `RemoveRepo`, `UpdateRepoInterval`, `UpdateRepoPrerelease`, or per-row state changes (`last_poll_*`) | `{ repos: Repo[] }` — full list snapshot, ~100 B per row |
| `AdminsChanged` | `"all"` | globalSettings `general.admins` selection changed | Empty. Signals every client to re-fetch `GetFeed` so promoted/demoted users pick up their new `amIAdmin` |

`RepoListChanged` is admin-only because it carries per-row state (last poll timestamps, error messages) that's only useful inside the admin-gated Settings view, and `last_error_message` could leak details about external services that non-admin members have no reason to see. The public companions (`RepoAdded`, `RepoRemoved`) carry only `{owner, name}` — no admin-sensitive data — and let every client adjust local state without waiting for a refetch. Without them: `RepoAdded`'s job is bumping the home view past "No repositories yet" before the first poll completes; `RepoRemoved`'s job is dropping orphaned cards from non-admin feeds at remove time rather than at the next manual `GetFeed`.

### `onNewRelease`: single dispatch funnel

Every path that introduces a release into the system flows through one function in `releaseBroadcaster.ts`:

```ts
// Module-scope: registered by the service at startup via setReleaseBroadcaster.
// The registration callback shape is what breaks the broadcaster ↔ service
// circular import — broadcaster owns the dispatch funnel without importing
// the service.
let broadcastFn: ((release: ProtoRelease) => Promise<void>) | undefined;

export async function onNewRelease(
  db: Database,
  fields: NewReleaseFields,
): Promise<ReleaseRow> {
  const inserted = await insertRelease(db, fields);   // SQLite insert + cap-prune
  // Capture into a local before crossing the async boundary — TypeScript's
  // narrowing of the module-scope `broadcastFn` doesn't survive into the
  // safeBroadcast lambda; without the local, we'd need a non-null assertion
  // (`broadcastFn!(...)`) which is the kind of smell agents copy.
  const fn = broadcastFn;
  if (fn) {
    const release = rowToProto(inserted);
    await safeBroadcast("ReleaseAdded", () => fn(release));
  }
  return inserted;
}
```

Two patterns worth noticing:

- **Registration callback (not direct import)** breaks the broadcaster ↔ service cycle. The service calls `setReleaseBroadcaster((release) => releaseWatcherService.broadcastReleaseAdded({ release }, "all"))` at startup. The broadcaster itself never imports the service. Forking agents copying this should preserve this shape — direct service imports here re-introduce the cycle, which works only because the reference is lazy and is a footgun for anyone reading it later.
- **Local-capture-before-await** (`const fn = broadcastFn`) avoids non-null-assertion smell across the async boundary. Same correctness; cleaner read.

The poll cycle, the backfill that runs on first add, and any future code that needs to surface a release all go through this funnel. Tests can stub it (just call `setReleaseBroadcaster(myStub)`); instrumentation can be added in one place; archive and broadcast stay in lockstep without ad-hoc duplication.

The Preview disclosure (via the `TestRepo` RPC) does **not** call `onNewRelease` — it only fetches and returns the release for the calling client to render inline, never archives or broadcasts. That separation is what keeps preview-fetches from polluting the shared feed.

### Per-field auto-save with separate per-field RPCs

`RepoRow` runs one `useDebouncedMutation` per editable field, calling `UpdateRepoInterval` or `UpdateRepoPrerelease` independently. A single `UpdateRepo` RPC carrying the full row would coalesce concurrent edits (admin tweaks interval on one row while another admin toggles prerelease on the same row): the second commit overwrites the first's untouched fields with the stale snapshot the second client started typing against. Per-field RPCs send only the field that changed, so concurrent edits across fields don't stomp each other.

### Inline two-step confirm for low-stakes destructive

The only destructive action here is removing a watched repo — low-stakes (no customer data is lost; the archive entries are reconstructable by re-adding), so the friction should be light. **No modal dialogs.** Click `Remove` (the X icon) → the row's controls swap to a `Cancel | Remove` pair with a prompt above (`Remove this repository? Past releases will clear from the feed.`). Second `Remove` click commits; `Cancel`, clicking outside the row, or interacting with another row reverts. Auto-save does NOT apply.

For higher-stakes destructive actions (resetting accumulated user data, deleting community-generated content), reach for the type-to-confirm pattern from `apps/leveling-leaderboard`. This sample doesn't demonstrate it because nothing in this domain warrants that friction.

### Click-to-copy URL pattern

Root's client iframe blocks external navigation, so anchors with `target="_blank"` appear functional but click into nothing. The release card footer renders the full URL as a click-to-copy button instead:

- Clicking the URL copies it via the Clipboard API and shows a transient "Copied!" confirmation for ~1.5s.
- `user-select: all` keeps right-click → Copy working as a fallback when the Clipboard API is unavailable (older browsers, restricted contexts).
- No "View on GitHub" label — the URL itself is the affordance.

**Apply this everywhere a Root client app would otherwise render an outbound link.** Ship clicks-to-copy or displayed-text-only — never anchors that look interactive but don't navigate.

### Backfill on add

After a repo is added (validation succeeded, row persisted, first-poll job scheduled), the first poll seeds the feed. Because the dedupe cursor is `0` for a fresh repo, all three releases returned by the standard `per_page=3` fetch are new and flow through `onNewRelease` (archive + broadcast).

The three releases share an `added_at` to the second (they're inserted within milliseconds of each other), so the feed's `ORDER BY added_at DESC, id DESC` puts the newest GitHub release at the top of the three.

**3 is the deliberate balance:** enough to give the community visible activity within seconds of the admin saving, few enough that one repo doesn't dominate the shared feed with its history. The same `per_page=3` is used for every poll — there is no first-poll-vs-regular-poll branch. In the rare case where more than 3 new releases land between polls (typically only possible during a long server outage that exceeded `JobMissed`'s replay window), older releases past the third are not archived; the cursor advances to the third-newest and subsequent polls only see what comes after. High-volume forks should consider bumping the page size.

### Repo removal

The Remove button on a `RepoRow` swaps the row's controls to an inline two-step confirm. On confirmation, the server:

1. Runs an atomic transaction: `DELETE FROM watched_repos WHERE owner=? AND name=?` — the FK `ON DELETE CASCADE` on `releases` removes the archive entries in the same transaction.
2. Calls `jobScheduler.deleteByResourceId("{owner}/{name}")` to cancel the pending poll job for that repo.
3. Broadcasts `RepoListChanged` (admin-only) so admin clients refresh their Settings list.
4. Broadcasts `RepoRemoved { owner, name }` (`"all"` audience) so every client (admin or not) drops the orphaned cards from its local feed immediately.

The two broadcasts are deliberate: `RepoListChanged` carries admin-only per-row state and stays gated to the `adminAudience` MemberGroup, while `RepoRemoved` carries only the public identifiers needed for feed cleanup. Together they make removal clean for everyone — no orphaned cards lingering on non-admin clients, no admin-sensitive data leaking to public clients. Add follows the same pattern in mirror.

### Storage shape is data-driven, not template-driven

> **Read this before mining the rest.** Forking this sample's storage layout assumes you understand *why* it's all SQLite — you might need a different shape.

This sample uses **SQLite for everything app-managed** (`watched_repos`, `releases`) and **no `keyValueStore` at all**, because per-repo overrides made every persistent setting relational (a list of repos, with structured per-row state). Don't read this as "samples should avoid KV." The DevKit convention is *match storage to shape*:

- **Flat primitives** (URLs, intervals, toggles, scalars, single-value config) → `keyValueStore` (`dataStore.appData`). See [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- **Relational/list config** (anything multi-row or referenced by other tables) → SQLite. See [`api-samples/server-database`](../../api-samples/server-database).
- **Admin role/member pickers, simple manifest-declared flags** → `globalSettings` (manifest, platform-rendered UI).

Adopters with flat-primitive settings should reach for `keyValueStore`. The reason this sample doesn't include KV-backed settings is that its config genuinely doesn't have flat-primitive settings — every persistent value is per-repo, which means relational, which means SQLite. **If your fork has a global "minimum priority" or "default cooldown" setting, that's a flat primitive and belongs in KV — don't shoehorn it into the SQLite schema just because this sample's schema is the convenient template.**

## State

| Scope | Storage |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Release feed | `FeedContext` fed by `GetFeed` RPC plus four broadcasts: `ReleaseAdded` (prepend with highlight pulse), `RepoAdded` (bump `watchedRepoCount` so the home view leaves the empty state without waiting for the first release), `RepoRemoved` (filter cards for that repo from local state, decrement count), `AdminsChanged` (soft-reload to refresh `am_i_admin`). The list is capped at `archive_cap` client-side as well. |
| Repo list (Settings) | `RepoContext` fed by `GetSettings` RPC + `RepoListChanged` broadcast (admin-only). Each row owns its own auto-save via `useDebouncedMutation`. Separate per-field RPCs (`UpdateRepoInterval`, `UpdateRepoPrerelease`) so concurrent admin edits across rows don't stomp each other. |
| Test preview state | Local to the `RepoRow`. `useState<Release \| null>` holds the most recent `TestRepo` response and renders inline as a `ReleaseCard` under the Preview disclosure. Cleared on row collapse. Not persisted server-side. |
| `amIAdmin` | Returned on `GetFeed`; stored in `FeedContext`. Refreshed via a soft-reload on every `AdminsChanged` broadcast (public, empty payload — soft because we don't want the home view to flicker through a loader for a non-user-initiated event). Controls gear visibility in `AppHeader` and guards the settings view in the shell. |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` cleanup.

### RPCs

Defined in `networking/src/release_watcher.proto` and consumed via the generated client. Admin-gated RPCs throw `RootServerException(NotAdmin)` when called by a non-admin (defence in depth — the client also gates the Settings view).

| RPC | Purpose | Admin-gated? |
|---|---|---|
| `GetFeed` | Returns `{ releases: Release[], amIAdmin: bool }` for `HomeView` | No |
| `GetSettings` | Returns `{ repos: Repo[] }` (each `Repo` carries `last_poll_*` state) for the Settings view | Yes |
| `AddRepo` | Validates URL via GitHub, persists on success, schedules first poll. Returns the new `Repo` or a structured error code | Yes |
| `UpdateRepoInterval` | Updates `poll_interval_minutes`, reschedules the pending poll | Yes |
| `UpdateRepoPrerelease` | Updates `include_prereleases` flag; affects future polls only | Yes |
| `RemoveRepo` | Atomic delete (FK cascade clears archive); cancels pending job; fires `RepoRemoved` + `RepoListChanged` | Yes |
| `TestRepo` | Fetches latest release for the calling client only (preview); no archive write, no broadcast | Yes |

## Permissions and roles

```json
{}
```

No permissions are declared. The app's outbound traffic is to `api.github.com` and its inbound surface is the in-app RPC; it neither enumerates community structure nor posts into channels. The persistence APIs require no permission. Outbound HTTP to GitHub is unrestricted from server code.

This `{}` declaration is itself a teaching point: **only declare permissions you actually use.** Many sample apps reach for `community.fullControl` reflexively; this one demonstrates that an app whose product is purely "in-app feed + admin Settings + outbound HTTP to a third party" needs nothing.

App admins are managed via Root's native Global Settings UI (manifest setting `general.admins`, `roleOrMember` selector, `multi: true`) — the app does not expose admin management in its own Settings.

```json
{
  "permissions": {},
  "settings": {
    "general": {
      "admins": { "type": "roleOrMember", "multi": true }
    }
  }
}
```

### Roles

One app-level role:

| Role | Description |
|------|-------------|
| **App admins** | Users who can view and change the app's in-app Settings. The community owner is always an admin (defence in depth — the owner can never lock themselves out even if they aren't explicitly selected). |

**App admins can**: view the release feed; add, remove, configure (interval, prerelease) watched repos; click Test on any row.

**Other members can**: view the release feed only.

## Limits

Server is single source of truth. Every value below is enforced server-side regardless of client bounds.

| Knob | Value |
|---|---|
| Maximum watched repos | **10** (server-enforced) |
| Per-repo poll interval (floor) | **15 minutes** (4 polls/hr per repo, server-enforced) |
| Per-repo poll interval (ceiling) | **24 hours** / 1440 minutes (server-enforced) |
| Per-repo poll interval (default for new repos) | **30 minutes** |
| Archive size | 50 most-recent releases (across all repos, ordered by `added_at DESC, id DESC`); older rows pruned on insert |
| Release body excerpt in card | ~6 lines visible (mask-fade overflow); full body available by clicking the URL anchor in the card footer |
| GitHub list-page size | 3 (every poll) |

**Worst-case rate:** 10 repos × 4 req/hr = **40 req/hr** — 33% headroom under GitHub's 60/hr unauthenticated ceiling. Ad-hoc operations (validate-on-save, Preview-disclosure clicks, occasional retries) borrow from that 20 req/hr headroom and don't affect the steady-state math.

**Server enforcement.** On `AddRepo`: reject if the community already has 10 repos. On `UpdateRepoInterval`: reject if the proposed interval is outside [15 min, 24h]. All errors surface via the `AutoSaveStatus` chrome.

The ceiling matters for *defense in depth*, not UX — the client's `NumberInput` already caps at this value, so legitimate users never hit it. Without server-side enforcement, a scripted client sending `Number.MAX_SAFE_INTEGER` would saturate the next-poll Date math (`now + N * 60_000 ms` past 8.6e15 ms saturates `Date`). The lesson generalizes: **client bounds aren't enforcement.** Every value the server stores or schedules off of needs server-side bounds.

This app deliberately uses hard caps with simple per-row enforcement instead of a budget-meter UI; a meter would teach generic React rather than Root patterns.

## Empty / error / loading states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` (blocks until `GetFeed` returns) | No repos configured: `<EmptyState title="No repositories yet" body={amIAdmin ? "Add a repository in Settings to start tracking releases." : "An admin hasn't added any repositories yet."} />`. Repos configured but feed empty: `<EmptyState title="No releases yet" body="Releases from your watched repositories will appear here." />`. | `<QueryError onRetry />` that refetches `GetFeed`. |
| Settings | `<Loader />` (blocks until `GetSettings` returns) | No repos: the bare `+ Add repository` button (no `EmptyState` chrome — the button itself is the affordance). | `<QueryError onRetry />` that refetches `GetSettings`. |

Admin-denied settings (non-admin reaches `view === "settings"` somehow): the shell swaps back to home. The `Settings` component also uses `<AdminOnly>` as defence in depth. Server RPCs reject admin-only actions with `RootServerException(NotAdmin)` regardless.

## Known production limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, on infrastructure choices that vary per deployment, or on product-level decisions a fork should revisit.

- **No reconnect-driven catch-up.** The client SDK does not currently surface a "reconnect" event. If a client briefly loses its WebSocket and reconnects, broadcasts that fired during the outage are lost. The home feed and Settings list stay stale until the next live broadcast or a manual navigation that triggers a refetch. When the SDK exposes a reconnect hook, both `FeedContext.reload()` and `RepoContext.reload()` should be wired to fire on it.
- **No timeout fallback after AddRepo.** AddRepo closes the input form on RPC success without awaiting `RepoListChanged`; if the broadcast is dropped (connection blip mid-RPC) and the admin doesn't navigate away, the new row's per-row state never appears in the open Settings view. The admin sees no error — the row IS there server-side, and another AddRepo attempt would get `REPO_ALREADY_WATCHED`. A reload-after-N-seconds fallback would close the gap without changing semantics; left out of the sample to keep the broadcast-driven reconciliation pattern straightforward to read. If you want the fallback, set a timer on AddRepo success, clear it when the broadcast lands, and call `reload()` if the timer fires.
- **Hard caps tuned for the unauthenticated GitHub tier.** `MAX_REPOS = 10` and `INTERVAL_FLOOR_MINUTES = 15` keep the worst-case poll rate at 40 req/hr — under GitHub's 60 req/hr unauthenticated ceiling with headroom for `validateRepo` and Test-preview clicks. Forks adding authentication should rebalance these per the formula in `server/src/limits.ts`.
- **No backfill on first add beyond the most recent few releases.** First poll fetches `per_page = 3`. A repo with a long backlog won't have its history reconstructed in the feed; only releases newer than the cursor will appear. Tunable in `pollJobs.POLL_PER_PAGE` if the trade-off (feed flooding on add vs deeper history) is worth revisiting for a fork.
- **Cross-process settings cache coherence.** The in-memory caches keyed by `_db` are correct for a single-process app server. If the app is ever scaled horizontally, an admin's settings change would not invalidate the other instances' caches until each is restarted. Replace with always-DB-read or a small pub/sub at that point.
- **Telemetry sink.** `ReportClientError` writes to the server's structured log. Forks that want stack-frame mapping, grouping, or alerting should replace the log line with a Sentry/Datadog client.
- **`TestRepo` is not rate-limited per caller.** Preview clicks share the 20 req/hr headroom GitHub gives between the worst-case poll rate (40/hr) and its unauthenticated ceiling (60/hr). Realistically the disclosure UI + admin-gating keeps this well under budget, but a fork that raises `MAX_REPOS` or lowers `INTERVAL_FLOOR_MINUTES` should add a per-caller guard mirroring `checkReportRate` in `releaseWatcherService.ts`.
- **Pre-existing mixed-case rows.** `parseGithubUrl` lowercases owner and name on parse so future adds are case-canonical, but rows persisted before this change retain their original casing. A one-time `UPDATE watched_repos SET owner = LOWER(owner), name = LOWER(name)` migration would canonicalize older installs; left out of the schema migrations because it's only relevant to deployments that pre-date the change.

## Appendix: Behavior of this sample

Pure domain content for *this* app — what the app does, not patterns to generalize. Replaced wholesale on fork.

### Overview

GitHub Release Watcher is a community app that tracks new releases across a configurable set of public GitHub repositories and surfaces them as an in-app chronological feed. Admins choose which repos to watch and at what cadence; every member of the community sees the resulting feed.

### Test preview

Each `RepoRow` carries a **Preview disclosure** beneath the subtitle: a chevron + "Preview" label as its own row. Click triggers a `TestRepo` RPC that fetches the latest release for that repo:

- `include_prereleases = false`: `GET /repos/{owner}/{name}/releases/latest` — GitHub's "latest stable" endpoint, which excludes prereleases by design.
- `include_prereleases = true`: `GET /repos/{owner}/{name}/releases?per_page=1` — the most recently published release of any kind, including prereleases.

The result returns to the calling client only — the disclosure expands and renders the result as a `ReleaseCard`, identical to how it would appear in the home feed.

Important properties:

- **No archive write.** Test does NOT go through `onNewRelease`.
- **No broadcast.** Other clients never see the test result.
- **No effect on poll cadence.** Test is a one-off ad-hoc request; it doesn't reset `last_poll_at` or shift the row's next-due time.
- **Same component used for the preview as for the real feed card.** What you see in Preview is exactly what would render in the feed.

A second click on the disclosure (now `▼ Preview`) collapses the preview — there is no separate "Close" button. The single toggle is deliberate: two close affordances on the same content was confusing in earlier drafts. Switching views or closing the row also clears the preview state — it's local to the `RepoRow`.

### Layout

Single-view UX with a push-view for admin settings. No tabs. `AppHeader` (48px, no bottom border) sits above a single content region that swaps between `HomeView` and `Settings`. Home mode: app title on the left; gear icon on the right (only when `amIAdmin`). Settings mode: back chevron + view label on the left; nothing on the right. View state is a single `useState<"home" | "settings">` in `App.tsx`. No router library.

Single centered column, `max-width: 640px`, side padding `16px`, vertical padding `24px` top/bottom, `12px` gap between feed cards.

The home feed renders the most recent `archive_cap` releases across all watched repos, ordered `added_at DESC, id DESC`. The home view header reads `Watching {N} repos · {relative}` where `{relative}` is the most recent successful poll across any repo (`MAX(last_poll_at) WHERE last_poll_status = 'ok'`) — a liveness indicator that the watcher is alive and reaching GitHub. If no repo has ever polled successfully, the header drops the timestamp and reads just `Watching {N} repos`.

The feed is a snapshot view — it does not paginate and does not support filtering. Capped at `archive_cap` cards (default 50); older cards are pruned server-side on archive insert.

### Copy strings

**Buttons:** Add repository, Cancel, Add, Remove, Retry. The Preview disclosure uses a chevron + label ("Preview") rather than a button.

**Auto-save status (`AutoSaveStatus` pill — error only):**
- Generic error: **Couldn't save — _{message}_.** + **Retry** action + dismiss (✕)
- Repo cap reached: **Maximum 10 repositories. Remove one to add another.** + dismiss
- Interval too low: **Polling interval must be at least 15 minutes.** + dismiss
- Interval too high: **Polling interval must be at most 1440 minutes.** + dismiss
- Permission denied: **You do not have permission to change settings.** + dismiss

**Repo row subtitles** (rendered as `<Icon>` + text — the Icon is a 16×16 SVG, not a unicode glyph, so its left edge mechanically aligns with the chevron in the Preview disclosure beneath):
- Just-persisted (first poll pending): *no subtitle*
- Successful poll: **`Checkmark` icon + "Last polled _{relative}_"** in `--rootsdk-brand-secondary` (e.g., "Last polled 2m ago")
- Failed poll — repo gone or went private: **`Error` icon + "Repository not found."** in `--rootsdk-error`
- Failed poll — rate limited: **`Error` icon + "Rate limited — try again later."**
- Failed poll — network/server: **`Error` icon + "Could not reach GitHub."**

**Add-repository input:**
- Placeholder: `https://github.com/owner/repo`
- Transient state during validation: **Validating…**
- Inline error (404): **Repository not found.** Double-check the URL.
- Inline error (rate limited): **GitHub rate limit reached. Try again in a minute.**
- Inline error (network/server): **Couldn't reach GitHub. Check connection and retry.**

**Home view header:** **Watching _{N}_ repos · _{relative}_** (or just **Watching _{N}_ repos** when no successful poll has happened yet)

**Inline confirm — Remove repository:**
- Prompt (one line above the button pair): **Remove this repository? Past releases will clear from the feed.**
- Cancel button label: **Cancel** (text variant)
- Danger button label: **Remove** (danger variant). Click commits; the row disappears.

**Settings count header:** **Watching _{N}_ of 10 repos** (or **Watching 10 of 10 repos · remove one to add another** when at the cap)

**Card prerelease pill:** **pre-release**

**Card URL row:** the full release URL rendered as a click-to-copy text element (monospace, tertiary text color). No "View on GitHub" label — the URL itself is the affordance.

### Visual tokens (app-specific roles)

All colors, spacing, radii, typography, shadows, and transitions come from Root CSS custom properties. The `client/src/lib/rootColorScheme.ts` bridge keeps the document `color-scheme` in sync with `rootClient.theme` so native form chrome (number-input spinners, scrollbars, `<select>` dropdowns) follows Root's theme.

These are the few token-to-domain mappings worth calling out for this sample. Everything else uses the design system reference's defaults.

| Concern | Token |
|---|---|
| Successful-poll row subtitle (Checkmark icon + "Last polled 2m ago") | `--rootsdk-brand-secondary` |
| Error row subtitle (Error icon + message) | `--rootsdk-error` |
| Trash icon at rest (destructive intent visible from rest, not grey-then-red on hover) | `--rootsdk-error` |
| Release tag (uppercase category label, top-left of card) | `--rootsdk-brand-primary` |
| Prerelease pill (tinted-background recipe: 16% bg, 40% border, brand-secondary text) | `--rootsdk-brand-secondary` |
| New-release card highlight pulse on prepend | `--rootsdk-highlight-light` |

### RepoRow shape

```
┌──────────────────────────────────────────────────────┐
│ vercel/next.js     [15 minutes] [☐ pre-release] [🗑]  │
│ ✓ Last polled 2m ago                                  │
│ ▶ Preview                                             │
│ [optional inline preview, expandable below]           │
└──────────────────────────────────────────────────────┘
```

- 8px-rounded row in `--rootsdk-background-secondary`, `12px` vertical padding, `16px` horizontal.
- Top line: repo path (read-only after add — to change, remove and re-add), `NumberInput` for poll interval in minutes (right-aligned digits, suffix label "minutes"), `Switch` for prerelease inclusion, trash icon-button (error-red at rest).
- Subtitle line (only on persistent rows; every row in `watched_repos` is post-validation by definition):
  - Just-persisted, first poll pending: *no subtitle*. The row's presence communicates "watching this"; first poll fires within ~1 minute.
  - After a successful poll: Checkmark icon + relative timestamp.
  - After a failed poll: Error icon + last error message.
  - Icons (not unicode glyphs) so the leading icon's left edge mechanically aligns with the chevron in the Preview disclosure below.
- All edits auto-save through `useDebouncedMutation` (150ms). Interval edits outside [15 min, 24h] are rejected server-side; the `AutoSaveStatus` chrome surfaces an error pill.
- Preview disclosure: a chevron + "Preview" label as its own row beneath the subtitle. Click expands — server fetches the latest release for that repo and the row renders it inline as a `ReleaseCard`. Click again to collapse.

### Add repository flow

`+ Add repository` button at the bottom of the list. Click → an empty input row appears at the bottom of the list with the URL field in focus and placeholder `https://github.com/owner/repo`. The row is **client-side only** at this point — nothing is persisted server-side until validation succeeds. (Default interval `30 min` and prerelease-off are applied on the server when the row is persisted; they aren't editable on the empty input row.)

On URL save (blur or Enter), the client calls `AddRepo(url)`. The input briefly shows `Validating…` while the server runs `GET https://api.github.com/repos/{owner}/{name}` (validate only — does not fetch releases or touch the feed):

- **200**: server inserts the row into `watched_repos`, schedules the first poll at `start: now`, returns the persistent `RepoRow` to the client. The empty input row is replaced by the persistent row in the list (no subtitle initially; within ~1 minute the first poll fires, archives `per_page=3` releases via backfill, and the subtitle becomes `✓ Last polled Xs ago`).
- **404 / 403 / 429 / 5xx / network**: server returns a structured error; nothing is persisted. The input row becomes editable again with an inline error message below the field (e.g., `Repository not found.` for 404). Admin can correct and retry, or click the **Cancel** text button to dismiss the input row entirely.

If the community is already watching the maximum 10 repos, the `+ Add repository` button is hidden and the count header reads `Watching 10 of 10 repos · remove one to add another`. Server enforces the cap independently — even if a stale client tries `AddRepo`, the server rejects with a structured error.

### Responsive

The app is mobile-first: every interactive element meets the 44×44 px touch-target minimum, layouts adapt down to 320px, and nothing requires a pointer.

| Width | Tier | Behavior |
|---|---|---|
| `< 640px` | **Mobile** | Single column, full-width of viewport minus `16px` side padding. Release cards: same shape, body excerpt may collapse from 6 to 4 lines. RepoRow: top line wraps; interval input + prerelease toggle drop to a second line beneath the repo path. Inline test preview: full-width below the row. |
| `>= 640px` | **Desktop** | Same centered column, capped at `640px`. RepoRow stays single-line for top controls. |

Supported panel width: `320px` (iPhone SE portrait). Below this, horizontal scroll. The release feed scrolls within the content region; `AppHeader` sits above the scroll container as a fixed flex row. Settings page: vertical scroll for long repo lists.

### Motion

Generic transitions follow the design system reference's `fast`/`normal`/`slow` durations. App-specific motion:

| Element | Transition |
|---|---|
| Home ↔ Settings push-view | None — instant swap |
| New release card prepend | `300ms` highlight pulse on the new card's background (`--rootsdk-highlight-light` fading to transparent) |
| Preview disclosure expand/collapse | None — the chevron flips (`ChevronRight` → `ChevronDown`) and the preview content mounts/unmounts directly |
| Inline confirm reveal (remove) | `opacity 150ms` on the swapped controls; no layout animation (container width preserved) |

No animation library. No FLIP. No View Transitions API.

### Icons

Icons come from `lucide-react` — one library, ~1500 glyphs, tree-shaken per-import. Components render lucide icons directly: `import { Trash2, Check } from "lucide-react"; <Trash2 size={24} />`. No central `Icon` wrapper, no `icons.json` snapshot. `apps/themes` remains the canonical "look like native Root chrome" reference for anyone who wants strict identity with Root's own UI surfaces. Sample apps standardize on `lucide-react` for breadth and a single icon API across the family. When forking, swap `import { X } from "lucide-react"` per call site and pass the JSX element to any consuming component — `EmptyState` accepts `icon: ReactNode` so a fork that prefers a different library only changes the imports.

### Components

Hand-rolled in `client/src/components/`. One `.tsx` + one `.module.css` per component.

| Component | Purpose |
|---|---|
| `AppHeader` | Top bar with two modes: home (title + gear) and settings (back chevron + label). Gear renders only when `amIAdmin`. |
| `ReleaseCard` | One card in the feed: tag (uppercase brand-primary, top-left), optional prerelease pill (top-right), optional bold heading, body excerpt with mask-fade overflow, hairline-bordered footer with `owner/repo · relative` and a click-to-copy URL |
| `RepoRow` | One row in Settings → Repos: repo path + interval + prerelease toggle + Remove + validation subtitle + Preview disclosure that fetches and renders a `ReleaseCard` for the latest release without writing to the archive or broadcasting |
| `AutoSaveStatus` | Inline error pill that appears only when an auto-save fails — Retry + Dismiss. Successful saves render nothing |
| `Button` | Variants: `primary`, `outline`, `danger`, `text` |
| `NumberInput` | Labeled integer input with min/max (used for interval) |
| `TextInput` | Labeled text input (used for repo URL on add) |
| `Switch` | Boolean toggle (used for `include_prereleases`) |
| `AdminOnly` | Conditional wrapper gated on server-provided `amIAdmin` |
| `QueryError` | Error state with retry button |
| `Loader` | Loading state |
| `EmptyState` | Consistent empty state (title + optional body + optional action) |
