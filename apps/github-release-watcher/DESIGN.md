# Design

Implementation patterns for the github-release-watcher sample, plus an appendix at the end documenting this specific app's behavior. **If you're forking this sample, start with [Adapting this sample](#adapting-this-sample) to know what to copy verbatim, what to adapt, and what to replace.**

For Root-wide visual conventions (colors, spacing, radii, typography, shadows, transitions, base component patterns), follow the [design system reference](../../docs/llms/app-docs/develop/client/design-system-reference.md) — this doc inherits all defaults from there and only calls out what's specific to this app. For icons, copy from [`apps/themes`](../themes). For shared infrastructure patterns (auto-save chrome, retry helpers, ErrorBoundary funnel), also read [`apps/leveling-leaderboard/DESIGN.md`](../leveling-leaderboard/DESIGN.md).

## Adapting this sample

Most of this doc describes patterns that transfer to any external-integration app — outbound HTTP, scheduled polling, dedupe state, multi-row list editor with cross-row validation, and an in-app archive feed. Some sections describe choices specific to a "watch GitHub releases" domain. Use this map before mining the rest:

### Copy verbatim

These are infrastructure-level patterns that should work unchanged for any app of similar shape. The "Where it lives" column gives concrete file paths so a fork can pull them directly.

**Foundation (every Root app of any shape):**

| Pattern | Where it lives |
|---|---|
| Stack (React 19 + Vite + plain CSS modules + protobuf RPC) | `package.json`, `vite.config.ts`, `tsconfig.json`, [Stack](#stack) |
| Visual token usage (`--rootsdk-*` CSS vars, no hardcoded colors/sizes) | All `*.module.css` + [design system reference](../../docs/llms/app-docs/develop/client/design-system-reference.md) |
| `color-scheme` bridge to Root theme | `client/src/lib/rootColorScheme.ts` |
| `withRetry` (server, SDK calls) / `withClientRetry` (client, RPC calls) helpers — both use bounded jitter (`base + Math.random() * (capped - base)`) so first-retry delays have a real minimum | `server/src/lib/retry.ts`, `client/src/lib/retry.ts` |
| `useDebouncedMutation` auto-save hook | `client/src/lib/useDebouncedMutation.ts` |
| `ErrorBoundary` + `ReportClientError` telemetry funnel (with per-caller rate limit + per-field size caps server-side) | `client/src/components/ErrorBoundary.tsx`, server handler in `releaseWatcherService.ts` |
| URL display with click-to-copy. Root's client iframe blocks external navigation, so anchors with `target="_blank"` appear functional but click into nothing. Render URLs as text + Clipboard API + `user-select: all` fallback for right-click → Copy. | `client/src/components/ReleaseCard.tsx` (the URL button) |

**Admin gating + admin broadcasts:**

| Pattern | Where it lives |
|---|---|
| `isAdmin(userId)` resolved against `globalSettings.general.admins ∪ ownerUserId` (owner is always implicitly an admin — defence in depth) | `server/src/adminCheck.ts` |
| `getByName` + `state.globalSettings.on("update")` re-binding pattern | `server/src/adminCheck.ts` |
| Custom `MemberGroup` for the admin broadcast audience (`adminAudience` mirrors `admins ∪ owner`, re-synced on `globalSettings.update` and `CommunityEdited`). Required because the bare admins group excludes an owner who isn't explicitly listed — and the owner is the most likely person driving Settings | `server/src/adminAudience.ts` |
| Public/admin broadcast split: admin-only payloads carry per-row state and target the `adminAudience`; public companions carry minimal identifiers and target `"all"` | `server/src/releaseWatcherService.ts` (the `RepoListChanged` vs `RepoAdded`/`RepoRemoved` pair) |

**External-service polling:**

| Pattern | Where it lives |
|---|---|
| Chained `OneTime` jobs with `resourceId`-based cancellation — sub-daily cadence on top of the platform's `Daily`/`Weekly`/etc. recurrence | `server/src/pollJobs.ts` |
| `withRetry`-wrapped `createPollJob` — innermost reliability layer; absorbs transient SDK hiccups before they reach reconcile | `server/src/pollJobs.ts` (`createPollJob`) |
| Startup `reconcilePollJobs` — walks persisted state vs scheduled jobs; creates missing pollers, drops orphans. Covers mid-state crashes and long-outage GC where `JobMissed` doesn't replay | `server/src/pollJobs.ts` (`reconcilePollJobs`) |
| Daily reconcile safety-net job (`JobInterval.Daily`) — bounds the silent-stop failure mode to ≤24h regardless of restart cadence. Idempotent at startup so frequent restarts don't push the firing forever | `server/src/pollJobs.ts` (`scheduleReconcileJob`) |
| `JobInterval.Daily` for the reconcile vs chained-`OneTime` for polling — use the platform's native recurrence when one matches your cadence; chain `OneTime` only when you need sub-daily | [Daily safety-net reconcile](#daily-safety-net-reconcile) |
| Outbound HTTP retry distinct from SDK retry — different error vocabulary (status codes + `Retry-After` header) needs its own helper, not `withRetry` | `server/src/githubClient.ts` (`fetchWithRetry`) |
| Per-source dedupe via service-provided `id`, not timestamp (timestamps mutate on edit; ids don't) | `server/src/archiveStore.ts` (`getCursorForRepo` returning `MAX(id)`) |

**RPC contract patterns:**

| Pattern | Where it lives |
|---|---|
| Validate-before-persist: external-API check runs before any DB write; row exists ⟺ source has been validated | [Validate-before-persist](#validate-before-persist) |
| Persist-then-best-effort-schedule: when an RPC must persist + schedule, persist first; if schedule fails after `withRetry` exhausts, log loudly and return success — reconcile heals. Don't lie to the user about persistent state | [Persist-then-best-effort-schedule](#persist-then-best-effort-schedule) |
| Server-side bounds on every value the server stores or schedules off (floor + ceiling, not just floor) — client `NumberInput` caps aren't enforcement | `server/src/releaseWatcherService.ts` (`updateRepoInterval`) |
| Centralized dispatch funnel (`onNewRelease`) — every "introduce a new item" path goes through one function, decoupled from the service via a registration callback to avoid circular imports | `server/src/releaseBroadcaster.ts` |
| `RootServerException` with structured proto-defined error codes mapped to user-facing strings on the client | proto enum in `networking/src/release_watcher.proto` + client mapper in `client/src/views/Settings.tsx` (`messageForAddError`) |

**Settings UX:**

| Pattern | Where it lives |
|---|---|
| Per-field auto-save with separate per-field RPCs (so concurrent edits across fields don't coalesce into a single payload that re-stomps unrelated fields) | `client/src/components/RepoRow.tsx` (one `useDebouncedMutation` per editable field) |
| Inline two-step confirm for low-stakes destructive actions (no modal) | [Destructive confirmations](#destructive-confirmations) |
| Destructive icon-button color: `--rootsdk-error` red at rest, not grey-then-red on hover (destructive intent visible *before* commit) | `client/src/components/RepoRow.module.css` (`.removeButton`) |

### Adapt

These structures translate but the names, payloads, and exact contents change with the domain.

| What to adapt | Notes |
|---|---|
| Component names + shapes | `RepoRow`, `ReleaseCard`, etc. — keep the conventions (one `.tsx` + one `.module.css`, props typed, comments at top), swap the rendering. |
| Broadcast event names and payloads | The `"all"`-audience pattern transfers; the events themselves don't. |
| RPC list | The admin-gating pattern (`requireAdmin`, throws `RootServerException`) transfers; specific RPCs are domain. |
| Settings structure | Single-page settings with a list editor is one shape; size as needed. The list-editor pattern, auto-save per row, and per-row error display are reusable. |
| Server-side list validation | The "server validates the proposed state of the list before accepting a mutation" idiom (count caps, per-row floors) transfers to any app with admin-managed lists. |
| Layout dimensions | 640px column, 16px card padding, 48px header. Use these defaults unless your content type forces a change: tabular/multi-column views need wider columns (≥800px); chat-style streams want full-width. Header height stays 48px regardless — the design system's standard. |
| `RepoContext` / `FeedContext` | The "fetch + subscribe + update" Context pattern transfers; the data shapes are domain. |

### Replace

These are pure domain content for *this* app. Don't read them as guidance for other apps.

| What to replace | Where it lives |
|---|---|
| Entire Behavior contract | [Appendix: Behavior of this sample](#appendix-behavior-of-this-sample) |
| Domain constants (max repos, cadence floor, default cadence) | `server/src/limits.ts` |
| Stores tied to release-watching (`repoStore`, `archiveStore`) | `server/src/` — copy the *shape* (atomic SQL, in-memory cache, stable interfaces, FK cascade), replace the schema. |
| GitHub-specific HTTP client | `server/src/githubClient.ts` — the `withRetry`-wrapped fetch + URL parsing + types pattern transfers; the endpoints and payload types are GitHub. |
| Copy strings (button labels, error messages, placeholder text) | Inline across components; consolidated reference in [Appendix → Copy](#copy-this-sample). |
| View-state specifics | [Appendix → View states](#view-states-this-sample). The components used (`Loader`, `QueryError`, `EmptyState`) transfer; the per-view conditions are domain. |

### First steps after fork

Concrete sequence for an agent that's decided to fork this sample. Do these in order:

1. **`npm run clean`** at the workspace root — wipes generated dirs (`node_modules`, `dist`, `networking/gen`, lockfiles, `rootapp-*.pkg`). Starts you from a clean slate.
2. **Find-replace the package namespace.** `@githubreleasewatcher/` → `@yourapp/` across `package.json` (root + workspaces), all source `import` statements, and `networking/root-protoc.json`. The packages are linked via `file:./networking/gen/{client,server,shared}` so the namespace must match.
3. **Edit `root-manifest.json`** — new `id` (use `rootsdk new id` or generate fresh), reset `version` to `1.0.0`, update the manifest `settings` block if your admin-selection shape differs.
4. **Replace domain constants in `server/src/limits.ts`.** This is where the cap, floor, ceiling, and default cadence values live. Re-derive them per the rate-limit math against your external service's published quota.
5. **Replace `server/src/githubClient.ts`** with your service's HTTP client. The shape transfers (URL parser, `fetchWithRetry` with status-code-aware retry, structured `*ClientError` with discriminated `kind`s); only the endpoints, request shapes, and parser change.
6. **Replace `networking/src/release_watcher.proto`** with your service definition. Keep the proto enum-prefix convention (`YOUR_ERROR_*` on every enum value), the public/admin broadcast split (admin-only events carry per-row state; public companions carry minimal identifiers), and a `ReportClientError` RPC for the telemetry funnel.
7. **Replace the stores** (`server/src/repoStore.ts`, `server/src/archiveStore.ts`) with your domain schema. Keep the FK cascade pattern (`PRAGMA foreign_keys = ON`, `ON DELETE CASCADE` between parent and archive), the `MAX(id)` dedupe cursor pattern (use whatever monotonic id your service provides — not timestamps, see [How dedupe works](#how-dedupe-works)), and the cap-on-insert prune for archives.
8. **Replace client components** (`RepoRow`, `ReleaseCard`) for your domain rendering. Keep the layout primitives (`AppHeader`, `Button`, `Switch`, `NumberInput`, `TextInput`, `Loader`, `EmptyState`, `QueryError`, `Icon`) verbatim — they're domain-neutral.
9. **Update DESIGN.md and README.md.** Replace the appendix wholesale; align the Coverage scope bullets / Copy-verbatim table / [Adapting this sample](#adapting-this-sample) tables to match what your fork keeps and what it changes.
10. **Verify the reconcile invariant holds** in your domain: every persisted row should have a corresponding scheduled job (or arrive at one within reconcile latency). Run the server through one full cycle (add → poll → restart → verify schedule recreated) before considering the fork complete.

### ⚠ Storage shape is data-driven, not template-driven

> **Read this before mining the rest.** Forking this sample's storage layout assumes you understand *why* it's all SQLite — you might need a different shape.

This sample uses **SQLite for everything app-managed** (`watched_repos`, `releases`) and **no `keyValueStore` at all**, because per-repo overrides made every persistent setting relational (a list of repos, with structured per-row state). Don't read this as "samples should avoid KV." The DevKit convention is *match storage to shape*:

- **Flat primitives** (URLs, intervals, toggles, scalars, single-value config) → `keyValueStore` (`dataStore.appData`). See [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- **Relational/list config** (anything multi-row or referenced by other tables) → SQLite. See [`api-samples/server-database`](../../api-samples/server-database).
- **Admin role/member pickers, simple manifest-declared flags** → `globalSettings` (manifest, platform-rendered UI).

Adopters with flat-primitive settings should reach for `keyValueStore`. The reason this sample doesn't include KV-backed settings is that its config genuinely doesn't have flat-primitive settings — every persistent value is per-repo, which means relational, which means SQLite. **If your fork has a global "minimum priority" or "default cooldown" setting, that's a flat primitive and belongs in KV — don't shoehorn it into the SQLite schema just because this sample's schema is the convenient template.**

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Bundler | Vite |
| Language | TypeScript (strict) |
| Styling | Plain CSS with CSS Modules (`*.module.css`), one file per component |
| State | React state + Context for cross-component sharing |
| Networking | Generated protobuf client from `networking/` |
| Icons | [`lucide-react`](https://lucide.dev) per-import (~1500 glyphs, tree-shaken). [`apps/themes`](../themes) keeps the canonical Root-aesthetic catalog for anyone wanting strict identity with native Root surfaces |
| Server-side persistence | SQLite via `dataStore.config.sqlite3.filename` |
| Outbound HTTP | Native `fetch` wrapped in `withRetry` |

**No third-party UI stack.** No Tailwind, Radix, TanStack Query, framer-motion, or similar. First-party Root SDK packages (`@rootsdk/server-app`, `@rootsdk/client-app`, `@rootsdk/client-app-ui`) are in scope — always prefer a platform-native primitive over reinventing one.

## Visual tokens

All colors, spacing, radii, typography, shadows, and transitions come from Root CSS custom properties — see the [design system reference](../../docs/llms/app-docs/develop/client/design-system-reference.md) for the full token set and base component patterns. Everything below is what's specific to this app.

### Native form chrome (color-scheme)

The `client/src/lib/rootColorScheme.ts` bridge keeps the document `color-scheme` in sync with `rootClient.theme` so native form chrome (number-input spinners, scrollbars, `<select>` dropdowns) follows Root's theme. Implementation is the same as `apps/leveling-leaderboard/client/src/lib/rootColorScheme.ts` — copy verbatim, no per-app variation. See [`apps/leveling-leaderboard/DESIGN.md`](../leveling-leaderboard/DESIGN.md) → Native form chrome for the longer rationale.

### App-specific token roles

These are the few token-to-domain mappings worth calling out for this sample. Everything else (backgrounds, primary/secondary text, borders, primary actions, hover states) uses the reference's defaults.

| Concern | Token |
|---|---|
| Successful-poll row subtitle (Checkmark icon + "Last polled 2m ago") | `--rootsdk-brand-secondary` |
| Error row subtitle (Error icon + message) | `--rootsdk-error` |
| Trash icon at rest (destructive intent visible from rest, not grey-then-red on hover) | `--rootsdk-error` |
| Release tag (uppercase category label, top-left of card) | `--rootsdk-brand-primary` |
| Prerelease pill (tinted-background recipe: 16% bg, 40% border, brand-secondary text) | `--rootsdk-brand-secondary` |
| New-release card highlight pulse on prepend | `--rootsdk-highlight-light` |

## Layout

### App shell

Single-view UX with a push-view for admin settings. No tabs. `AppHeader` sits above a single content region that swaps between `HomeView` and `Settings`.

```
home view (everyone):                settings view (admin):
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ GitHub Release Watcher    ⚙  │    │ ← Settings                   │
├──────────────────────────────┤    ├──────────────────────────────┤
│ Watching 5 repos · 2m ago    │    │ Watching 5 of 10 repos       │
│                              │    │                              │
│ ┌─ V15.0.1     [pre-release]┐│    │ ┌─ vercel/next.js ─────────┐│
│ │ next.js 15.0.1            ││    │ │ [15 minutes][☐pre-rel][🗑]││
│ │ Improvements to Turbopack ││    │ │ ✓ Last polled 2m ago     ││
│ │ ...                       ││    │ │ ▶ Preview                ││
│ │ vercel/next.js · 5m ago   ││    │ └──────────────────────────┘│
│ │ https://github.com/...    ││    │ ┌─ nodejs/node ────────────┐│
│ └───────────────────────────┘│    │ │ [30 minutes][☐pre-rel][🗑]││
│ ┌─ V22.5.0                 ┐ │    │ │ ✓ Last polled 5m ago     ││
│ │ ...                       ││    │ └──────────────────────────┘│
│ └───────────────────────────┘│    │ + Add repository             │
│ ...                          │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
```

- `AppHeader` is 48px, no bottom border. Sits above the scroll container as a fixed flex row, so it stays visible without `position: sticky`.
- Home mode: app title on the left; gear icon on the right (only when `amIAdmin === true`).
- Settings mode: back chevron + view label on the left; nothing on the right.
- View state is a single `useState<"home" | "settings">` in `App.tsx`. No router library.
- Settings view is gated: if a non-admin ever reaches `view === "settings"`, the shell falls back to home. The `Settings` component still uses `<AdminOnly>` as defence in depth.

### Content

- Single centered column, `max-width: 640px`, margin `0 auto`.
- Side padding `16px`; vertical padding `24px` top/bottom; `12px` gap between feed cards (denser stacking than leveling's `24px` because cards already carry their own header weight).
- Both `HomeView` and `Settings` share the same column constraint.

### Release feed (HomeView)

Renders the most recent `archive_cap` releases across all watched repos, ordered `added_at DESC, id DESC` (i.e., when the watcher first saw the release, with `id` as the tiebreaker — backfill on add produces three releases that share `added_at` to the second, so `id DESC` ensures the newest GitHub release lands at the top of the feed).

The home view header reads `Watching {N} repos · {relative}`. The timestamp is the most recent successful poll across any repo (`MAX(last_poll_at) WHERE last_poll_status = 'ok'`) — a liveness indicator that the watcher is alive and reaching GitHub. If no repo has ever polled successfully, the header drops the timestamp and reads just `Watching {N} repos`.

- Card: `12px` rounded panel, `16px` padding, `--rootsdk-background-secondary`.
- Card header (one line): release tag in uppercase brand-primary as the card's category label on the left; optional `pre-release` pill (tinted-background, brand-secondary) on the right.
- Optional heading: bold release name (16/24/600) below the header, rendered only when the release `name` is distinct from `tag_name`. Many repos use the tag as the name, so often this line is omitted.
- Card body: up to ~6 lines of body excerpt in 14/20/400, mask-image fade overflow rather than truncating mid-character. Markdown-lite stripped server-side (bold markers, code fences) for readability without a parser dep.
- Card footer (hairline-bordered, muted): `{owner}/{repo} · {relative}` metadata on top, full release URL on bottom as click-to-copy text (Root's client iframe blocks external navigation, so anchors with `target="_blank"` don't work). Clicking the URL copies it via the Clipboard API and shows a transient "Copied!" confirmation for ~1.5s. `user-select: all` keeps right-click → Copy working as a fallback when the Clipboard API is unavailable.
- Live updates: a `ReleaseAdded` broadcast prepends the new card with a `300ms` highlight pulse (`--rootsdk-highlight-light` background fading out).
- Empty state (no repos configured): `<EmptyState title="No repositories yet" body={amIAdmin ? "Add a repository in Settings to start tracking releases." : "An admin hasn't added any repositories yet."} />`.
- Empty state (repos configured but feed empty): `<EmptyState title="No releases yet" body="Releases from your watched repositories will appear here." />`.

The feed is a snapshot view — it does not paginate and does not support filtering. Capped at `archive_cap` cards (default 50); older cards are pruned server-side on archive insert.

### Settings — Repos

Single-page settings, no tab bar. A one-line header (`Watching N of 10 repos`) sits at the top; below it, the list of repos as `RepoRow`s; below that, an `+ Add repository` button (hidden when the cap is reached).

The header is plain text (12/16/400, `--rootsdk-text-secondary`) — not a meter, not a bar. The 10-repo cap is a product decision worth surfacing once at the top, but it's not a real-time aggregate visualization. See [Rate-limit constraints](#rate-limit-constraints) in the appendix for why this app deliberately avoids a budget-meter UI.

#### RepoRow

```
┌──────────────────────────────────────────────────────┐
│ vercel/next.js     [15 minutes] [☐ pre-release] [🗑]  │
│ ✓ Last polled 2m ago                                  │
│ ▶ Preview                                             │
│ [optional inline preview, expandable below]           │
└──────────────────────────────────────────────────────┘
```

- 8px-rounded row in `--rootsdk-background-secondary`, `12px` vertical padding, `16px` horizontal.
- Top line: repo path (read-only after add — to change, remove and re-add), `NumberInput` for poll interval in minutes (right-aligned digits, suffix label "minutes"), `Switch` for prerelease inclusion, trash icon-button (error-red at rest — destructive intent visible before the user commits).
- Subtitle line (only on persistent rows; every row in `watched_repos` is post-validation by definition — see [Add repository flow](#add-repository-flow)):
  - Just-persisted, first poll pending: *no subtitle*. The row's presence communicates "watching this"; first poll fires within ~1 minute.
  - After a successful poll: `<Icon name="Checkmark" size={16} /> Last polled {relative}` in `--rootsdk-brand-secondary` (e.g., "✓ Last polled 2m ago").
  - After a failed poll: `<Icon name="Error" size={16} /> {last_error_message}` in `--rootsdk-error` (e.g., "! Could not reach GitHub").
  - Icons (not unicode glyphs) so the leading icon's left edge mechanically aligns with the chevron in the Preview disclosure below — all three rows have the same Icon-then-text container shape.
- All edits auto-save through `useDebouncedMutation` (150ms). Interval edits outside [15 min, 24h] are rejected server-side (`INTERVAL_TOO_LOW` / `INTERVAL_TOO_HIGH`); the `AutoSaveStatus` chrome surfaces an error pill.
- Preview disclosure: a chevron + "Preview" label as its own row beneath the subtitle (see [Test preview](#test-preview-this-sample)). Click expands — server fetches the latest release for that repo and the row renders it inline as a `ReleaseCard`. Click again to collapse. The disclosure is its own row (separate from the configuration controls and trash) so the toggle and the preview content sit together visually.
- Remove button (trash icon): swaps the row's controls to an inline `Cancel | Remove` pair (see [Destructive confirmations](#destructive-confirmations)).

#### Add repository flow

`+ Add repository` button at the bottom of the list. Click → an empty input row appears at the bottom of the list with the URL field in focus and placeholder `https://github.com/owner/repo`. The row is **client-side only** at this point — nothing is persisted server-side until validation succeeds. (Default interval `30 min` and prerelease-off are applied on the server when the row is persisted; they aren't editable on the empty input row.)

On URL save (blur or Enter), the client calls `AddRepo(url)`. The input briefly shows `Validating…` while the server runs `GET https://api.github.com/repos/{owner}/{name}` (validate only — does not fetch releases or touch the feed):

- **200**: server inserts the row into `watched_repos`, schedules the first poll at `start: now`, returns the persistent `RepoRow` to the client. The empty input row is replaced by the persistent row in the list (no subtitle initially; within ~1 minute the first poll fires, archives `per_page=3` releases via [Backfill on add](#backfill-on-add), and the subtitle becomes `✓ Last polled Xs ago`).
- **404 / 403 / 429 / 5xx / network**: server returns a structured error; nothing is persisted. The input row becomes editable again with an inline error message below the field (e.g., `Repository not found.` for 404). Admin can correct and retry, or click the **Cancel** text button to dismiss the input row entirely.

The "row only persists after validation" invariant means every row in `watched_repos` is a real, currently-valid public GitHub repository. No 404'd rows take a slot toward the 10-repo cap, no reconcile pass tries to poll URLs that don't exist, and no separate `validation_status` column is needed because nothing else is allowed in.

If the community is already watching the maximum 10 repos, the `+ Add repository` button is hidden and the count header reads `Watching 10 of 10 repos · remove one to add another`. Server enforces the cap independently — even if a stale client tries `AddRepo`, the server rejects with a structured error.

### Destructive confirmations

No modal dialogs. The only destructive action here is removing a watched repo — low-stakes (no customer data is lost, the archive entries are reconstructable by re-adding), so the friction should be light.

**Inline two-step confirm.** Click `Remove` (the X icon) → the row's controls swap to a `Cancel | Remove` pair with a prompt above (`Remove this repository? Past releases will clear from the feed.`). Second `Remove` click commits; `Cancel`, clicking outside the row, or interacting with another row reverts. Auto-save does NOT apply.

For higher-stakes destructive actions (resetting accumulated user data, deleting community-generated content), reach for the type-to-confirm pattern from [`apps/leveling-leaderboard/DESIGN.md`](../leveling-leaderboard/DESIGN.md). This sample doesn't demonstrate it because nothing in this domain warrants that friction.

## Responsive

The app is mobile-first: every interactive element meets the 44×44 px touch-target minimum (per the reference), layouts adapt down to 320px, and nothing requires a pointer.

| Width | Tier | Behavior |
|---|---|---|
| `< 640px` | **Mobile** | Single column, full-width of viewport minus `16px` side padding. Release cards: same shape, body excerpt may collapse from 6 to 4 lines. RepoRow: top line wraps; interval input + prerelease toggle drop to a second line beneath the repo path. Inline test preview: full-width below the row. |
| `>= 640px` | **Desktop** | Same centered column, capped at `640px`. RepoRow stays single-line for top controls. |

### Minimums and overflow

- Supported panel width: `320px` (iPhone SE portrait). Below this, horizontal scroll.
- The release feed scrolls within the content region; `AppHeader` sits above the scroll container as a fixed flex row.
- Settings page: vertical scroll for long repo lists. The count header scrolls with content (no `position: sticky`).

## Motion

Generic transitions (button hover/press, row hover) follow the reference's `fast`/`normal`/`slow` durations. App-specific motion:

| Element | Transition |
|---|---|
| Home ↔ Settings push-view | None — instant swap |
| New release card prepend | `300ms` highlight pulse on the new card's background (`--rootsdk-highlight-light` fading to transparent) |
| Preview disclosure expand/collapse | None — the chevron flips (`ChevronRight` → `ChevronDown`) and the preview content mounts/unmounts directly. No height-animation library; the visible-by-default disclosure shape doesn't need one |
| Inline confirm reveal (remove) | `opacity 150ms` on the swapped controls; no layout animation (container width preserved) |

No animation library. No FLIP. No View Transitions API.

## Icons

Icons come from `lucide-react` — one library, ~1500 glyphs, tree-shaken per-import. Components render lucide icons directly: `import { Trash2, Check } from "lucide-react"; <Trash2 size={24} />`. No central `Icon` wrapper, no `icons.json` snapshot.

```tsx
import { Plus, Trash2, AlertCircle } from "lucide-react";

<Plus size={16} />
<Trash2 size={24} />
<AlertCircle size={16} />
```

[`apps/themes`](../themes) remains the canonical "look like native Root chrome" reference for anyone who wants strict identity with Root's own UI surfaces. Sample apps standardize on `lucide-react` for breadth (lucide covers app-shell vocabulary the curated DevKit set was never designed for) and a single icon API across the family.

When forking, swap `import { X } from "lucide-react"` per call site and pass the JSX element to any consuming component — `EmptyState` accepts `icon: ReactNode` so a fork that prefers a different library only changes the imports.

## Components

Hand-rolled in `client/src/components/`. One `.tsx` + one `.module.css` per component.

| Component | Purpose |
|---|---|
| `AppHeader` | Top bar with two modes: home (title + gear) and settings (back chevron + label). Gear renders only when `amIAdmin`. |
| `ReleaseCard` | One card in the feed: tag (uppercase brand-primary, top-left), optional prerelease pill (top-right), optional bold heading, body excerpt with mask-fade overflow, hairline-bordered footer with `owner/repo · relative` and a real-anchor URL |
| `RepoRow` | One row in Settings → Repos: repo path + interval + prerelease toggle + Remove + validation subtitle + Preview disclosure that fetches and renders a `ReleaseCard` for the latest release without writing to the archive or broadcasting |
| `AutoSaveStatus` | Inline error pill that appears only when an auto-save fails — Retry + Dismiss. Successful saves render nothing |
| `Button` | Variants: `primary`, `outline`, `danger`, `text` |
| `NumberInput` | Labeled integer input with min/max (used for interval) |
| `TextInput` | Labeled text input (used for repo URL on add) |
| `Switch` | Boolean toggle (used for `include_prereleases`); follows the design system's `switch` pattern |
| `AdminOnly` | Conditional wrapper gated on server-provided `amIAdmin` |
| `QueryError` | Error state with retry button |
| `Loader` | Loading state |
| `EmptyState` | Consistent empty state (title + optional body + optional action) |
| `Icon` | From themes sample |

## State

| Scope | Storage |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Release feed | `FeedContext` fed by `GetFeed` RPC plus four broadcasts: `ReleaseAdded` (prepend with highlight pulse), `RepoAdded` (bump `watchedRepoCount` so the home view leaves the empty state without waiting for the first release), `RepoRemoved` (filter cards for that repo from local state, decrement count), `AdminsChanged` (soft-reload to refresh `am_i_admin`). The list is capped at `archive_cap` client-side as well. |
| Repo list (Settings) | `RepoContext` fed by `GetSettings` RPC + `RepoListChanged` broadcast (admin-only). Each row owns its own auto-save via `useDebouncedMutation`. Separate per-field RPCs (`UpdateRepoInterval`, `UpdateRepoPrerelease`) so concurrent admin edits across rows don't stomp each other. |
| Test preview state | Local to the `RepoRow`. `useState<Release | null>` holds the most recent `TestRepo` response and renders inline as a `ReleaseCard` under the Preview disclosure. Cleared on row collapse. Not persisted server-side. |
| `amIAdmin` | Returned on `GetFeed`; stored in `FeedContext`. Refreshed via a soft-reload on every `AdminsChanged` broadcast (public, empty payload — soft because we don't want the home view to flicker through a loader for a non-user-initiated event). Controls gear visibility in `AppHeader` and guards the settings view in the shell. |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` in cleanup.

### RPCs

Defined in [`networking/src/release_watcher.proto`](networking/src/release_watcher.proto) and consumed via the generated client. Admin-gated RPCs throw `RootServerException(NotAdmin)` when called by a non-admin (defence in depth — the client also gates the Settings view).

| RPC | Purpose | Admin-gated? |
|---|---|---|
| `GetFeed` | Returns `{ releases: Release[], amIAdmin: bool }` for `HomeView` | No |
| `GetSettings` | Returns `{ repos: Repo[] }` (each `Repo` carries `last_poll_*` state) for the Settings view | Yes |
| `AddRepo` | Validates URL via GitHub, persists on success, schedules first poll. Returns the new `Repo` or a structured error code | Yes |
| `UpdateRepoInterval` | Updates `poll_interval_minutes`, reschedules the pending poll | Yes |
| `UpdateRepoPrerelease` | Updates `include_prereleases` flag; affects future polls only | Yes |
| `RemoveRepo` | Atomic delete (FK cascade clears archive); cancels pending job; fires `RepoRemoved` + `RepoListChanged` | Yes |
| `TestRepo` | Fetches latest release for the calling client only (preview); no archive write, no broadcast | Yes |

### Broadcasts

Five event types with distinct audiences:

| Event | Audience | Triggered by | Payload (approx) |
|---|---|---|---|
| `ReleaseAdded` | `"all"` | A poll cycle discovers a new release; `onNewRelease(release)` archives + broadcasts | `{ release: Release }` — full message, ~400–800 B depending on body excerpt |
| `RepoAdded` | `"all"` | `AddRepo` — public companion to `RepoListChanged`. Lets every client bump its `watchedRepoCount` so the home view leaves the "No repositories yet" empty state without waiting for the first `ReleaseAdded` (which may be ~1 minute away, or never if the first poll fails) | `{ owner, name }` — minimal identifiers only |
| `RepoRemoved` | `"all"` | `RemoveRepo` — fired after the row is deleted and its archive entries are FK-cascaded out | `{ owner, name }` — minimal identifiers only |
| `RepoListChanged` | Admin-only (the server-managed `adminAudience` MemberGroup — see below) | `AddRepo`, `RemoveRepo`, `UpdateRepoInterval`, `UpdateRepoPrerelease`, or per-row state changes (last_poll_*) | `{ repos: Repo[] }` — full list snapshot, ~100 B per row |
| `AdminsChanged` | `"all"` | globalSettings `general.admins` selection changed | Empty. Signals every client to re-fetch `GetFeed` so promoted/demoted users pick up their new `amIAdmin` |

#### Why add and remove each need a public companion event

`RepoListChanged` is admin-only because it carries per-row state (last poll timestamps, error messages) that's only useful inside the admin-gated Settings view, and `last_error_message` could leak details about external services that non-admin members have no reason to see. Gating the broadcast to the `adminAudience` MemberGroup matches the gate on `GetSettings`.

But the *public* surface (the home view's count header, and any cards on the feed) needs to update too. The two public companions, `RepoAdded` and `RepoRemoved`, carry only `{owner, name}` — no admin-sensitive data — and let every client adjust local state without waiting for a refetch. Without them: `RepoAdded`'s job is bumping the home view past "No repositories yet" before the first poll completes; `RepoRemoved`'s job is dropping orphaned cards from non-admin feeds at remove time rather than at the next manual `GetFeed`.

The same split pattern handles admin-set changes: `AdminsChanged` is a public, empty-payload companion that tells every client "your `amIAdmin` may have changed — re-fetch `GetFeed`." `amIAdmin` is computed from `globalSettings` which the client doesn't read directly, so the only way to pick up the new value is a server RPC round-trip.

#### `adminAudience` MemberGroup — owner ∪ admins

The `RepoListChanged` audience is **not** the bare `globalSettings.general.admins` `ReadOnlyMemberGroup`. It's a server-managed `MemberGroup` named `adminAudience` that mirrors `globalSettings.general.admins ∪ ownerUserId`.

**Why the union matters.** The community owner is *implicitly* an admin (defence in depth — they can never lock themselves out of their own community), but they may not be explicitly listed in the `admins` selection. If we used the raw `admins` group as the audience, an owner driving Settings would write the row, broadcast `RepoListChanged` to admins-the-group, and **not receive their own broadcast** — their Settings list would go stale until they manually refreshed. Since the owner is the most likely person to be running Settings in the early life of a community, this was a load-bearing edge case, not a corner one.

**Lifecycle.** Created (or fetched, if already present from a prior run) at `lifecycle.start` via `rootServer.memberGroups.getByName("adminAudience")`, with the userIds set to the union. Re-synced on:

- `globalSettings.update` events (admins selection changed)
- `CommunityEdited` events (owner changed — rare but real)

The sync is idempotent: read both inputs, compute the union, write the resulting userIds. Cheap enough to do unconditionally on every event.

If `getAdminAudience()` returns `undefined` during a transient startup window (`initializeAdminAudience` hasn't completed), `RepoListChanged` broadcasts skip silently — the only admin in that window is the owner, who is the one who just saved, so no other session needs to be told.

#### onNewRelease: single funnel for new-release dispatch

Every path that introduces a release into the system flows through one function. Real shape (from `server/src/releaseBroadcaster.ts`):

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

Two patterns worth noticing in the real version:

- **Registration callback (not direct import)** breaks the broadcaster ↔ service cycle. The service calls `setReleaseBroadcaster((release) => releaseWatcherService.broadcastReleaseAdded({ release }, "all"))` at startup. The broadcaster itself never imports the service. Forking agents copying this should preserve this shape — direct service imports here re-introduce the cycle, which works only because the reference is lazy and is a footgun for anyone reading it later.
- **Local-capture-before-await** (`const fn = broadcastFn`) avoids non-null-assertion smell across the async boundary. Same correctness; cleaner read.

The poll cycle, the backfill that runs on first add, and any future code that needs to surface a release all go through this funnel. Tests can stub it (just call `setReleaseBroadcaster(myStub)`); instrumentation can be added in one place; archive and broadcast stay in lockstep without ad-hoc duplication.

The Preview disclosure (via the `TestRepo` RPC) does **not** call `onNewRelease` — it only fetches and returns the release for the calling client to render inline, never archives or broadcasts. That separation is what keeps preview-fetches from polluting the shared feed.

## RPC contract patterns

These are shape decisions any RPC that writes to persistent state and triggers downstream side effects (jobs, broadcasts, external calls) should follow. The github-release-watcher applies them in `AddRepo`, `UpdateRepoInterval`, and `RemoveRepo`; the patterns generalize to any "validate + persist + schedule" RPC.

### Validate-before-persist

For RPCs that ingest user-supplied references to external entities (URLs, IDs, paths in another system), validate the reference *before* writing anything persistent.

`AddRepo(url)` runs through this order:

1. **Local checks** (URL parse, cap, dedupe) — no DB write, no external call.
2. **External validation** — single `GET /repos/{owner}/{name}` against GitHub, just enough to confirm the entity exists.
3. **Persist only on success.** Any failure at steps 1–2 returns a structured error code (`INVALID_URL`, `MAX_REPOS_REACHED`, `REPO_ALREADY_WATCHED`, `REPO_NOT_FOUND`, `GITHUB_RATE_LIMITED`, `GITHUB_UNREACHABLE`); nothing is persisted.

The DB invariant is then *"every row represents a real, currently-valid external entity at the time it was added."* No `validation_status` column is needed because nothing else is allowed in. Once persisted, ongoing health is tracked per-row by status fields (`last_poll_status`, `last_error_message`); a row whose external entity disappears or moves starts producing poll errors and surfaces them in the UI — admin can remove and re-add to recover.

**Why local-checks-first.** Local checks (step 1) come before external validation (step 2) so bad input doesn't burn external rate-limit budget on adds that can't succeed anyway. For a public-API service like GitHub with a 60-req/hour ceiling, this matters — a refresh-spamming admin shouldn't be able to drain the budget by re-adding a repo that's already watched.

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

`scheduleSomething` is the `withRetry`-wrapped SDK call (the inner reliability layer from [How polling works](#how-polling-works)). If retries exhaust, the row is still persisted; the only thing missing is the downstream schedule. The daily/startup reconcile pass creates the missing schedule within ≤24h.

**Why not throw on schedule failure?** The persistent state already reflects what the user asked for. Surfacing an error makes them think the RPC failed, but they can't recover by retrying — they get an "already exists" error on retry. The honest message is "succeeded; downstream scheduling will be reconciled" — the binary "throw on schedule failure" shape claimed a stricter synchronous promise than the system actually delivered.

**Contract trade-off.** The synchronous guarantee is *"persistent state correct + downstream scheduling correct within reconcile latency (≤24h)"*, not *"... correct now"*. Forks needing stricter SLOs should consider:

- Two-phase commit between the DB and the job scheduler — not currently supported by the platform; would require app-level work.
- A rollback `delete` on schedule failure — but the same SDK that just failed `withRetry` is being asked to perform a clean delete, which is fragile under sustained outage. Not recommended.
- A separate "schedule degraded" signal alongside RPC success, leaving the user informed without misleading them about persistent state. Reasonable for SLO-critical apps; out of scope for this sample.

**Apply uniformly.** The chained reschedule in `onPollJob` ("schedule next poll" after a poll completes), `AddRepo`'s `scheduleFirstPoll`, and `UpdateRepoInterval`'s `rescheduleAfterIntervalChange` all use the same shape. Consistent policy across every "row exists ⟹ schedule exists" call site is what makes the reconcile invariant tractable to reason about.

---

# Appendix: Behavior of this sample

This appendix mixes two kinds of content. **Read accordingly:**

- **Pattern teaching with GitHub as the worked example** — generalizes to other apps. Sections: [How polling works](#how-polling-works), [How dedupe works](#how-dedupe-works), [Backfill on add](#backfill-on-add), [Repo removal](#repo-removal). Treat these as part of the main patterns library.
- **Pure domain content** — what THIS app does, replaced wholesale on fork. Sections: [Overview](#overview), [Rate-limit constraints](#rate-limit-constraints), [Test preview](#test-preview-this-sample), [Roles and permissions](#roles-and-permissions), [Limits](#limits), [View states](#view-states-this-sample), [Copy](#copy-this-sample).

This split is the inevitable cost of teaching a pattern through a concrete domain. The pattern sections describe a generalizable shape using GitHub-specific examples; if you're adapting, mentally substitute "GitHub" with your service.

## Overview

GitHub Release Watcher is a community app that tracks new releases across a configurable set of public GitHub repositories and surfaces them as an in-app chronological feed. Admins choose which repos to watch and at what cadence; every member of the community sees the resulting feed.

The app exists to teach the patterns of external-service integration: outbound HTTP, scheduled polling with rate-limit awareness, dedupe state, in-app archive, and multi-row admin configuration with cross-row constraints.

## How polling works

Per-repo polling uses the platform's `rootServer.jobScheduler`. The scheduler offers `OneTime`, `Daily`, `Weekly`, `Monthly`, and `Yearly` recurrence — there is no `Minutely` or `Hourly` interval — so sub-daily cadence is expressed as **chained `OneTime` jobs**. Each watched repo owns at most one pending poll job at a time, identified by `resourceId = "{owner}/{name}"` and `tag = "poll"`.

### Lifecycle

1. **`AddRepo`** — server inserts the row into `watched_repos`, then creates a `OneTime` job with `start = now`. The first poll runs immediately and seeds the feed (see [Backfill on add](#backfill-on-add)).
2. **`JobScheduleEvent.Job` (and `JobScheduleEvent.JobMissed`, same handler)** — parse `resourceId` to recover `owner/name`; fetch the row from `watched_repos` (return early if it was removed); poll GitHub via `GET /repos/{owner}/{name}/releases?per_page=3` wrapped in `withRetry`; filter to `id > COALESCE((SELECT MAX(id) FROM releases WHERE owner=? AND name=?), 0)` (the `COALESCE` matters: a fresh repo has no archive rows, so `MAX(id)` returns `NULL`, and `id > NULL` is `NULL`/false — this would drop every release on first poll); drop prereleases when `include_prereleases` is false; sort ascending by `id`; run `onNewRelease(release)` for each; update `last_poll_at`, `last_poll_status`, `last_error_message`; create the next `OneTime` job at `start = now + poll_interval_minutes * 60_000`.
3. **`UpdateRepoInterval`** — update the row, then `deleteByResourceId(resourceId)` cancels the pending poll and a fresh `OneTime` is created at the new interval offset from now.
4. **`RemoveRepo`** — delete the row in a transaction (FK cascade clears archive entries), then `deleteByResourceId(resourceId)` cancels any pending poll for it.

Every poll fetches `per_page=3` — the same page size for first-poll backfill and steady-state polling. See [Backfill on add](#backfill-on-add) for the trade-off and the high-volume-fork escape hatch.

### Startup reconciliation

`JobScheduleEvent.JobMissed` covers most outages — when the server comes back, the platform replays poll jobs whose start times passed during downtime. But two failure modes can still leave a repo without a pending job:

- **Mid-state crash.** A handler crashes between updating SQLite and scheduling the next job. For example, `AddRepo` writes the row but crashes before `jobScheduler.create`; `UpdateRepoInterval` runs `deleteByResourceId` but crashes before recreating; the `Job` handler completes the poll but crashes before scheduling the next one.
- **Long outage.** `JobMissed` is not a guaranteed safety net for arbitrarily long downtime — very old missed jobs may not replay.

To self-heal both cases, `lifecycle.start` runs a reconciliation pass between `watched_repos` and the scheduled poll jobs:

```ts
async function reconcilePollJobs() {
  const repos = await repoStore.list();
  const expected = new Set(repos.map(r => `${r.owner}/${r.name}`));
  const existing = await rootServer.jobScheduler.listByTag("poll");

  // Drop orphan jobs (resourceId no longer corresponds to a watched repo).
  for (const job of existing) {
    if (!expected.has(job.resourceId)) {
      await rootServer.jobScheduler.delete(job.jobScheduleId);
    }
  }

  // Schedule missing jobs (watched repo with no pending poll).
  const have = new Set(existing.map(j => j.resourceId));
  for (const repo of repos) {
    const id = `${repo.owner}/${repo.name}`;
    if (!have.has(id)) {
      await rootServer.jobScheduler.create({
        resourceId: id,
        tag: "poll",
        start: new Date(),                  // poll immediately to catch up
        jobInterval: JobInterval.OneTime,
      });
    }
  }
}
```

Newly-scheduled missing jobs use `start: new Date()` rather than reconstructing what their next-poll time *should have been* — after an outage the right behavior is "fetch fresh data now," not continuity with a stale schedule. Dedupe via `MAX(id)` ensures already-archived releases aren't re-broadcast even if the catch-up poll returns them.

### Daily safety-net reconcile

Startup reconciliation only runs when the server actually starts. A long-running deployment that hits a sustained SDK outage during a `createPollJob` reschedule would silently drop the affected repo from the polling rotation until the next deploy. To bound that gap, the app schedules a `JobInterval.Daily` reconcile job at startup that re-runs `reconcilePollJobs()` once per day.

Implementation note: the daily scheduling is itself idempotent — if the job already exists from a prior startup, we leave it alone rather than recreating with a fresh `now + 24h` start. Otherwise frequent restarts (cron deploys, autoscaler churn) would push the first firing forever and starve the safety net of its purpose.

The asymmetry — chained `OneTime` for polling, native `JobInterval.Daily` for the reconcile — is deliberate. The platform handles `Daily` recurrence natively (auto-reschedules each firing), so there's no "fail to schedule the next one" silent-stop failure mode for it. The chained-`OneTime` pattern in the poll path is required only because the cadence we want is **sub-daily** and the platform's smallest native recurrence is `Daily`. **General rule:** use the platform's native recurrence when one matches your cadence; chain `OneTime` jobs only when you need sub-daily cadence.

### Inner retry layer (`withRetry`)

Every `createPollJob` call (the chained reschedule in the poll handler, the first-poll schedule in `AddRepo`, the reschedule-after-interval-change call) is wrapped in `withRetry` (4 attempts, exponential backoff with bounded jitter). This is the **first** line of defense against transient SDK failures — most flake gets absorbed here without ever reaching the outer reliability layers.

### Why this design

- **`resourceId` + `deleteByResourceId` is the right cleanup primitive.** Cancelling a repo's polling on remove or interval change is one SDK call.
- **Schedule lives in the platform, not in app code.** No `last_poll_at + interval` arithmetic to evaluate every minute; the platform tracks "when is this due" for us and survives restart.
- **Layered reliability**, in firing order (innermost first — each layer fires only when the prior one has failed or doesn't apply):
  1. **`withRetry` on `createPollJob`** (innermost — directly wraps the SDK call). Absorbs transient SDK hiccups inline; 4 attempts with exponential backoff and bounded jitter. Most flake stops here.
  2. **`JobScheduleEvent.JobMissed`** (medium-latency — fires on next server start after downtime). Replays jobs whose start times passed while the server was down.
  3. **Startup `reconcilePollJobs`** (run-once-at-start). Heals mid-state crashes (handler crashed between writing state and scheduling the next job) and long outages where `JobMissed` doesn't replay.
  4. **Daily reconcile job** (outermost — bounded ≤24h independent of restart cadence). Belt-and-suspenders for the silent-stop case where `withRetry` exhausted attempts and still failed during a long-running deployment that never restarts.

### Concurrency

When multiple repos are due in the same minute, the platform fires their jobs in parallel. With the [10-repo cap and 15-minute floor](#rate-limit-constraints), the worst-case burst is 10 simultaneous GitHub fetches — well within both GitHub's tolerance and the SDK's HTTP capacity. No app-level concurrency cap is needed.

## How dedupe works

Per `(owner, name)`, the dedupe cursor is implicit: `MAX(id) FROM releases WHERE owner=? AND name=?`. The release archive *is* the cursor. There is no separate cursor key.

Why `id` and not `published_at`:

- `id` is monotonically increasing and immutable across release-note edits — surviving the case where a maintainer fixes a typo in a release body without re-firing the broadcast.
- `published_at` can be backdated; relying on it can miss releases dated earlier than recent ones.
- A single integer comparison; no timestamp parsing or timezone handling.

## Rate-limit constraints

GitHub's unauthenticated API allows 60 requests per hour per IP. The app stays comfortably under that ceiling via two simple hard caps, validated server-side on every repo-list mutation:

| Knob | Value |
|---|---|
| Maximum watched repos | **10** |
| Per-repo poll interval (floor) | **15 minutes** (4 polls/hr per repo) |
| Per-repo poll interval (ceiling) | **24 hours** / 1440 minutes |
| Per-repo poll interval (default for new repos) | **30 minutes** |

**Worst-case rate:** 10 repos × 4 req/hr = **40 req/hr** — 33% headroom under GitHub's 60/hr ceiling. Ad-hoc operations (validate-on-save, Preview-disclosure clicks, occasional retries) borrow from that 20 req/hr headroom and don't affect the steady-state math.

**Server enforcement.** On `AddRepo`: reject if the community already has 10 repos. On `UpdateRepoInterval`: reject if the proposed interval is outside [15 min, 24h]. All errors surface via the `AutoSaveStatus` chrome:

> *"Maximum 10 repositories. Remove one to add another."*
> *"Polling interval must be at least 15 minutes."*
> *"Polling interval must be at most 1440 minutes."*

The ceiling matters for *defense in depth*, not UX — the client's `NumberInput` already caps at this value, so legitimate users never hit it. Without server-side enforcement, a scripted client sending `Number.MAX_SAFE_INTEGER` would saturate the next-poll Date math (`now + N * 60_000 ms` past 8.6e15 ms saturates `Date`). The lesson generalizes: **client bounds aren't enforcement.** Every value the server stores or schedules off of needs server-side bounds.

This app deliberately uses hard caps with simple per-row enforcement instead of a budget-meter UI; a meter would teach generic React rather than Root patterns.

## Test preview (this sample)

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

## Backfill on add

After a repo is added (validation succeeded, row persisted, first-poll job scheduled), the first poll seeds the feed. Because the dedupe cursor (`COALESCE((SELECT MAX(id) FROM releases WHERE owner=? AND name=?), 0)`) is `0` for a fresh repo, all three releases returned by the standard `per_page=3` fetch are new and flow through `onNewRelease` (archive + broadcast).

The three releases share an `added_at` to the second (they're inserted within milliseconds of each other), so the feed's `ORDER BY added_at DESC, id DESC` puts the newest GitHub release at the top of the three.

3 is the deliberate balance: enough to give the community visible activity within seconds of the admin saving, few enough that one repo doesn't dominate the shared feed with its history. The same `per_page=3` is used for every poll — there is no first-poll-vs-regular-poll branch. In the rare case where more than 3 new releases land between polls (typically only possible during a long server outage that exceeded `JobMissed`'s replay window), older releases past the third are not archived; the cursor advances to the third-newest and subsequent polls only see what comes after. High-volume forks should consider bumping the page size.

## Repo removal

The Remove button on a `RepoRow` swaps the row's controls to an inline two-step confirm: a one-line prompt (`Remove this repository? Past releases will clear from the feed.`) plus a `Cancel | Remove` button pair. The second click on `Remove` commits; `Cancel`, clicking outside the row, or interacting with another row reverts. On confirmation, the server:

1. Runs an atomic transaction: `DELETE FROM watched_repos WHERE owner=? AND name=?` — the FK `ON DELETE CASCADE` on `releases` removes the archive entries in the same transaction.
2. Calls `jobScheduler.deleteByResourceId("{owner}/{name}")` to cancel the pending poll job for that repo (one outstanding `OneTime` job per repo, per [How polling works](#how-polling-works)).
3. Broadcasts `RepoListChanged` (admin-only) so admin clients refresh their Settings list.
4. Broadcasts `RepoRemoved { owner, name }` (`"all"` audience) so every client (admin or not) drops the orphaned cards from its local feed immediately.

The two broadcasts are deliberate: `RepoListChanged` carries admin-only per-row state and stays gated to the `adminAudience` MemberGroup, while `RepoRemoved` carries only the public identifiers needed for feed cleanup. Together they make removal clean for everyone — no orphaned cards lingering on non-admin clients, no admin-sensitive data leaking to public clients. (Add follows the same pattern in mirror — `RepoListChanged` to admins for the new row's per-row state, `RepoAdded` to all for the count bump.)

## Roles and permissions

One app-level role:

| Role | Description |
|------|-------------|
| **App admins** | Users who can view and change the app's in-app Settings. The community owner is always an admin. |

Admins are configured via the Root platform's native Global Settings UI for this app (manifest setting `general.admins`), **not** from inside the app. The community owner is implicitly an admin even if not explicitly selected — defence-in-depth so the owner can never lock themselves out.

**App admins can**: view the release feed; add, remove, configure (interval, prerelease) watched repos; click Test on any row.

**Other members can**: view the release feed only.

### Manifest permissions

This app needs minimal permissions because it neither posts to channels nor enumerates community state. The persistence APIs require no permission. Outbound HTTP to GitHub is unrestricted from server code. The only manifest entry that matters is `general.admins`.

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

(Full manifest in `root-manifest.json`.)

## Limits

| Item | Limit |
|------|-------|
| Maximum watched repos | 10 (server-enforced) |
| Per-repo poll interval (floor) | 15 minutes (server-enforced) |
| Per-repo poll interval (ceiling) | 24 hours / 1440 minutes (server-enforced) |
| Per-repo poll interval (default for new repos) | 30 minutes |
| Archive size | 50 most-recent releases (across all repos, ordered by `added_at DESC, id DESC`); older rows pruned on insert |
| Release body excerpt in card | ~6 lines visible (mask-fade overflow); full body available by clicking the URL anchor in the card footer |
| GitHub list-page size | 3 (every poll) |

## View states (this sample)

| View | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` (blocks until `GetFeed` returns) | No repos configured: `<EmptyState title="No repositories yet" body={amIAdmin ? "Add a repository in Settings to start tracking releases." : "An admin hasn't added any repositories yet."} />`. Repos configured but feed empty: `<EmptyState title="No releases yet" body="Releases from your watched repositories will appear here." />`. | `<QueryError onRetry />` that refetches `GetFeed`. |
| Settings | `<Loader />` (blocks until `GetSettings` returns) | No repos: the bare `+ Add repository` button (no `EmptyState` chrome — the button itself is the affordance). | `<QueryError onRetry />` that refetches `GetSettings`. |

Admin-denied settings (non-admin reaches `view === "settings"` somehow): the shell swaps back to home. The `Settings` component also uses `<AdminOnly>` as defence in depth. Server RPCs reject admin-only actions with `RootServerException(NotAdmin)` regardless.

## Copy (this sample)

Buttons: **Add repository**, **Cancel**, **Add**, **Remove**, **Retry**. The Preview disclosure uses a chevron + label ("Preview") rather than a button.

**Auto-save status (`AutoSaveStatus` pill — error only):**
- Generic error: **Couldn't save — _{message}_.** + **Retry** action + dismiss (✕)
- Repo cap reached: **Maximum 10 repositories. Remove one to add another.** + dismiss
- Interval too low: **Polling interval must be at least 15 minutes.** + dismiss
- Interval too high: **Polling interval must be at most 1440 minutes.** + dismiss
- Permission denied: **You do not have permission to change settings.** + dismiss

**Repo row subtitles** (rendered as `<Icon>` + text — the Icon is a 16×16 SVG, not a unicode glyph, so its left edge mechanically aligns with the chevron in the Preview disclosure beneath):
- Just-persisted (first poll pending): *no subtitle*
- Successful poll: **`Checkmark` icon + "Last polled _{relative}_"** (e.g., "Last polled 2m ago")
- Failed poll — repo gone or went private: **`Error` icon + "Repository not found."**
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

**Empty states:**
- HomeView, no repos (admin): **No repositories yet** — Add a repository in Settings to start tracking releases.
- HomeView, no repos (member): **No repositories yet** — An admin hasn't added any repositories yet.
- HomeView, repos but no releases: **No releases yet** — Releases from your watched repositories will appear here.

**Settings count header:** **Watching _{N}_ of 10 repos** (or **Watching 10 of 10 repos · remove one to add another** when at the cap)

**Card prerelease pill:** **pre-release**

**Card URL row:** the full release URL rendered as a real anchor (monospace, tertiary text color, hover underline). No "View on GitHub" label — the URL itself is the affordance.
