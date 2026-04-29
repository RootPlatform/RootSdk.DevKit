# github-release-watcher

Watches a curated list of GitHub repositories for new releases and surfaces them as an in-app feed. Admins manage the watched repos in an in-app Settings view: add by URL, set per-repo polling interval, toggle prerelease inclusion, preview the latest release before committing, and remove. The home feed shows the most recent ~50 releases across all watched repos with a live highlight pulse on each new card. App admins themselves are configured via Root's native Global Settings UI for this app. Full behavior contract and implementation patterns in [DESIGN.md](DESIGN.md).

## Coverage scope

**Demonstrates** — for the full cross-referenced patterns library (with file paths and adapt/copy/replace guidance), see [DESIGN.md → Adapting this sample](DESIGN.md#adapting-this-sample) and [DESIGN.md → Copy verbatim](DESIGN.md#copy-verbatim). At a glance:

*External-service integration*
- **Chained `OneTime` polling jobs** for sub-daily cadence (`rootServer.jobScheduler` only offers `Daily`+); each watched repo owns at most one pending job, the handler polls and schedules the next firing.
- **Four-layer reliability**, innermost first: `withRetry` on every `createPollJob` call → `JobScheduleEvent.JobMissed` replays → startup `reconcilePollJobs` → daily safety-net reconcile that bounds silent-stop failures to ≤24h regardless of restart cadence.
- **Outbound HTTP retry distinct from SDK retry** — different error vocabulary (status codes, `Retry-After` header vs `ErrorCodeType`); separate helpers, same bounded-jitter shape.
- **Per-source dedupe via service-provided `id`, not timestamp** — release notes can be edited (mutates `published_at`); `id` is immutable.

*Admin gating + broadcasts*
- **`isAdmin` resolved against `globalSettings.general.admins ∪ ownerUserId`** (owner is implicitly an admin — defence in depth).
- **Custom `MemberGroup` for the admin broadcast audience** mirroring `admins ∪ owner` — required so an owner driving Settings receives their own `RepoListChanged` updates even when not explicitly listed in the admins setting.
- **Public/admin broadcast split** — admin-only payloads (`RepoListChanged`) carry per-row state and target the custom audience; public companions (`RepoAdded`, `RepoRemoved`) carry minimal identifiers and target `"all"`.

*RPC contract patterns*
- **Validate-before-persist** — external-API check runs before any DB write; row exists ⟺ source has been validated.
- **Persist-then-best-effort-schedule** — when an RPC must persist + schedule, persist first; if schedule fails after `withRetry` exhausts, log loudly and return success (reconcile heals). Don't lie to the user about persistent state.
- **Server-side bounds on every value the server stores or schedules off** (floor + ceiling, not just floor) — client `NumberInput` caps aren't enforcement.
- **Centralized dispatch funnel** (`onNewRelease`) for all "new item arrives in the system" paths, decoupled from the service via a registration callback to avoid circular imports.
- **`RootServerException` with structured proto-defined error codes** mapped to user-facing strings on the client.

*Settings UX*
- **Admin-gated in-app Settings with per-field auto-save** (separate per-field RPCs so concurrent edits don't stomp unrelated fields; no Save buttons; debounced commit).
- **Inline two-step confirm** for low-stakes destructive actions (no modal).
- **Destructive icon-buttons red at rest** per Root convention — destructive intent visible *before* commit.

*Foundation (every Root app)*
- **Iframe-aware external links** — `<a target="_blank" rel="noopener noreferrer">` for the release URL; Root's iframe hands the click off to the system browser.
- **Root theme tokens** for all client styling; `--rootsdk-*` CSS custom properties. Bridge (`lib/rootColorScheme.ts`) keeps `color-scheme` in sync with `rootClient.theme` so native form chrome follows the theme.
- **Client-error telemetry funnel** — `ErrorBoundary` fires `ReportClientError`; server handler logs structured `error` lines with per-caller rate limit + per-field size caps to bound log impact under misbehaving boundaries.

**Out of scope (this product shape doesn't need them):**
- Channel posting / messaging — this app's product is the in-app feed; releases are surfaced as cards, not channel messages. See [`api-samples/server-messages`](../../api-samples/server-messages).
- File or asset handling — see [`api-samples/client-app-assets`](../../api-samples/client-app-assets) and [`api-samples/server-files`](../../api-samples/server-files).
- Multiple protobuf services in one app — see [`apps/suggestion-box`](../suggestion-box) for that shape.
- Channel/group enumeration UI — see [`apps/leveling-leaderboard`](../leveling-leaderboard) and [`api-samples/server-channels`](../../api-samples/server-channels).
- Moderation actions (kick, ban, delete) — see [`api-samples/server-kick-ban`](../../api-samples/server-kick-ban).

**Intentionally simplified for teaching (a fork may need them):**
- Authenticated GitHub access — runs against the 60 req/hr unauthenticated public-API tier so the sample stays runnable without a credential setup. Forks needing higher throughput or private repos should add a credential setting and pass an `Authorization: token <pat>` header from `githubClient`. The retry/backoff machinery already in place handles authenticated 429s identically.
- Cross-process cache coherence — the in-memory caches assume a single-process app server. See [Known limits](#known-limits) for the upgrade path.
- Reconnect-driven feed catch-up — depends on an SDK reconnect hook that doesn't exist yet. See [Known limits](#known-limits).

## Permissions

```json
{}
```

No permissions are declared. The app's outbound traffic is to `api.github.com` and its inbound surface is the in-app RPC; it neither enumerates community structure nor posts into channels.

App admins are managed via Root's native Global Settings UI (manifest setting `general.admins`, `roleMultiAndUserMulti` selector) — the app does not expose admin management in its own Settings.

## Storage

SQLite for everything app-managed (`watched_repos` + `releases`); no `keyValueStore` because every persistent value here is per-repo and relational. See [DESIGN.md → Storage shape is data-driven, not template-driven](DESIGN.md) for the architectural choice and [DESIGN.md → Owner / name canonicalization](DESIGN.md) for the lowercase-on-persist invariant.

## Known limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, on infrastructure choices that vary per deployment, or on product-level decisions a fork should revisit.

- **No reconnect-driven catch-up.** The client SDK does not currently surface a "reconnect" event. If a client briefly loses its WebSocket and reconnects, broadcasts that fired during the outage are lost. The home feed and Settings list stay stale until the next live broadcast or a manual navigation that triggers a refetch. When the SDK exposes a reconnect hook, both `FeedContext.reload()` and `RepoContext.reload()` should be wired to fire on it.
- **No timeout fallback after AddRepo.** AddRepo closes the input form on RPC success without awaiting `RepoListChanged`; if the broadcast is dropped (connection blip mid-RPC) and the admin doesn't navigate away, the new row's per-row state never appears in the open Settings view. The admin sees no error — the row IS there server-side, and another AddRepo attempt would get `REPO_ALREADY_WATCHED`. A reload-after-N-seconds fallback would close the gap without changing semantics; left out of the sample to keep the broadcast-driven reconciliation pattern straightforward to read. If you want the fallback, set a timer on AddRepo success, clear it when the broadcast lands, and call `reload()` if the timer fires.
- **Hard caps tuned for the unauthenticated GitHub tier.** `MAX_REPOS = 10` and `INTERVAL_FLOOR_MINUTES = 15` keep the worst-case poll rate at 40 req/hr — under GitHub's 60 req/hr unauthenticated ceiling with headroom for `validateRepo` and Test-preview clicks. Forks adding authentication should rebalance these per the formula in `server/src/limits.ts`.
- **No backfill on first add beyond the most recent few releases.** First poll fetches `per_page = 3`. A repo with a long backlog won't have its history reconstructed in the feed; only releases newer than the cursor will appear. Tunable in `pollJobs.POLL_PER_PAGE` if the trade-off (feed flooding on add vs deeper history) is worth revisiting for a fork.
- **Cross-process settings cache coherence.** The in-memory caches keyed by `_db` are correct for a single-process app server. If the app is ever scaled horizontally, an admin's settings change would not invalidate the other instances' caches until each is restarted. Replace with always-DB-read or a small pub/sub at that point.
- **Telemetry sink.** `ReportClientError` writes to the server's structured log. Forks that want stack-frame mapping, grouping, or alerting should replace the log line with a Sentry/Datadog client.
- **`TestRepo` is not rate-limited per caller.** Preview clicks share the 20 req/hr headroom GitHub gives between the worst-case poll rate (40/hr) and its unauthenticated ceiling (60/hr). Realistically the disclosure UI + admin-gating keeps this well under budget, but a fork that raises `MAX_REPOS` or lowers `INTERVAL_FLOOR_MINUTES` should add a per-caller guard mirroring `checkReportRate` in `releaseWatcherService.ts`.
- **Pre-existing mixed-case rows.** `parseGithubUrl` lowercases owner and name on parse so future adds are case-canonical, but rows persisted before this change retain their original casing. A one-time `UPDATE watched_repos SET owner = LOWER(owner), name = LOWER(name)` migration would canonicalize older installs; left out of the schema migrations because it's only relevant to deployments that pre-date the change.

Use this sample as a shape reference for external-service polling with chained `OneTime` jobs, multi-layer reliability (replays + reconciliation + safety-net), validate-before-persist patterns, public/admin broadcast splits backed by a custom `MemberGroup`, and admin-gated in-app Settings. Consult the listed api samples for concerns it doesn't cover.
