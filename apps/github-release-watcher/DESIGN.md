# Design

Implementation patterns for the github-release-watcher sample, plus an appendix at the end documenting this specific app's behavior. **If you're forking this sample, start with [Adapting this sample](#adapting-this-sample) to know what to copy verbatim, what to adapt, and what to replace.** For Root-wide design tokens and the icon library, see [`apps/themes`](../themes). For the patterns this sample shares with single-view admin-gated apps, also read [`apps/leveling-leaderboard/DESIGN.md`](../leveling-leaderboard/DESIGN.md) — many infrastructure pieces (auto-save chrome, retry helpers, ErrorBoundary funnel, type-to-confirm) come from there.

## Adapting this sample

Most of this doc describes patterns that transfer to any external-integration app — outbound HTTP, scheduled polling, dedupe state, multi-row list editor with cross-row validation, and an in-app archive feed. Some sections describe choices specific to a "watch GitHub releases" domain. Use this map before mining the rest:

### Copy verbatim

These are infrastructure-level patterns that should work unchanged for any app of similar shape.

| Pattern | Where it lives |
|---|---|
| Stack (React 19 + Vite + plain CSS modules + protobuf RPC) | `package.json`, `vite.config.ts`, `tsconfig.json`, [Stack](#stack) |
| Visual token usage (`--rootsdk-*` CSS vars, no hardcoded colors/sizes) | All `*.module.css`, [Visual tokens](#visual-tokens) |
| `color-scheme` bridge to Root theme | `client/src/lib/rootColorScheme.ts` |
| `withRetry` / `withClientRetry` helpers | `server/src/lib/retry.ts`, `client/src/lib/retry.ts` |
| `pMap` concurrency cap for batched outbound calls | `server/src/lib/pMap.ts` |
| `useDebouncedMutation` auto-save hook | `client/src/lib/useDebouncedMutation.ts` |
| `ErrorBoundary` + `ReportClientError` telemetry funnel | `client/src/components/ErrorBoundary.tsx` + the RPC handler |
| Single-tick scheduler over per-row deadlines | `server/src/pollScheduler.ts` |
| `getByName` + `state.globalSettings.on("update")` admin pattern | `server/src/adminCheck.ts` |
| Type-to-confirm pattern for destructive actions | [Destructive confirmations](#destructive-confirmations) |
| Settings auto-save (debounced, error-only chrome) | `client/src/views/Settings.tsx` and per-row inputs |
| Centralized dispatch funnel (`onNewRelease`) | `server/src/releaseBroadcaster.ts` |

### Adapt

These structures translate but the names, payloads, and exact contents change with the domain.

| What to adapt | Notes |
|---|---|
| Component names + shapes | `RepoRow`, `ReleaseCard`, etc. — keep the conventions (one `.tsx` + one `.module.css`, props typed, comments at top), swap the rendering. |
| Broadcast event names and payloads | The `"all"`-audience-with-server-coalesce patterns transfer; the events themselves don't. |
| RPC list | The admin-gating pattern (`requireAdmin`, throws `RootServerException`) transfers; specific RPCs are domain. |
| Settings structure | Single-page settings with a list editor is one shape; size as needed. The list-editor pattern, auto-save per row, and per-row error display are reusable. |
| Server-side list validation | The "server validates the proposed state of the list before accepting a mutation" idiom (count caps, per-row floors) transfers to any app with admin-managed lists. |
| Layout dimensions | 640px column, 16px card padding, 48px header — sensible defaults for a single-view app, but revisit per design. |
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

### Storage shape is data-driven, not template-driven

This sample uses **SQLite for everything app-managed** (`watched_repos`, `releases`) and **no `keyValueStore` at all**, because per-repo overrides made every persistent setting relational (a list of repos, with structured per-row state). Don't read this as "samples should avoid KV." The DevKit convention is *match storage to shape*:

- **Flat primitives** (URLs, intervals, toggles, scalars, single-value config) → `keyValueStore` (`dataStore.appData`). See [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- **Relational/list config** (anything multi-row or referenced by other tables) → SQLite. See [`api-samples/server-database`](../../api-samples/server-database).
- **Admin role/member pickers, simple manifest-declared flags** → `globalSettings` (manifest, platform-rendered UI).

Adopters with flat-primitive settings should reach for `keyValueStore`. The reason this sample shows neither approach is that its config genuinely doesn't have flat-primitive settings — every persistent value is per-repo, which means relational, which means SQLite.

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
| Icons | [`apps/themes/client/src/generated/icons.json`](../themes/client/src/generated/icons.json) + copied `Icon.tsx` helper |
| Server-side persistence | SQLite via `dataStore.config.sqlite3.filename` |
| Outbound HTTP | Native `fetch` wrapped in `withRetry` |

**No third-party UI stack.** No Tailwind, Radix, TanStack Query, framer-motion, or similar. First-party Root SDK packages (`@rootsdk/server-app`, `@rootsdk/client-app`, `@rootsdk/client-app-ui`) are in scope — always prefer a platform-native primitive over reinventing one.

## Visual tokens

All colors, spacing, radii, typography, and shadows come from Root CSS custom properties. Never hardcode values. Full reference: [Design system reference](../../docs/llms/app-docs/develop/client/design-system-reference.md).

### Native form chrome (color-scheme)

Number-input spin buttons, scrollbars, `<select>` dropdowns, and other form chrome render with browser-default styling that follows the document's CSS `color-scheme` property. The sample bridges Root's theme to `color-scheme` in [`lib/rootColorScheme.ts`](client/src/lib/rootColorScheme.ts): `rootClient.theme.getTheme()` seeds the initial value (set before first paint in `index.tsx`), and `RootClientThemeEvent.ThemeUpdate` keeps it in sync when the user toggles Root's theme. No component-level `color-scheme` overrides — the bridge handles everything at the document root.

### Token usage in this app

| Concern | Token |
|---|---|
| Page / app background | `--rootsdk-background-primary` |
| Panels, cards, rows | `--rootsdk-background-secondary` |
| Nested elevated (test preview, popovers) | `--rootsdk-surface-primary` |
| Primary text | `--rootsdk-text-primary` |
| Secondary text (labels, meta, timestamps) | `--rootsdk-text-secondary` |
| Muted text (placeholders, disabled) | `--rootsdk-text-tertiary` |
| Dividers, input borders, card borders | `--rootsdk-border` |
| Primary action (Add repo, Confirm) | `--rootsdk-brand-primary` |
| Destructive action (Remove) | `--rootsdk-error` |
| Row hover | `--rootsdk-highlight-light` |
| Pressed / active | `--rootsdk-highlight-strong` |
| Validated row subtitle (✓ N releases) | `--rootsdk-brand-secondary` |
| Error row subtitle | `--rootsdk-error` |
| Prerelease pill | `--rootsdk-brand-secondary` |
| Links (View on GitHub, repo names in card headers) | `--rootsdk-link` |

### Spacing

Use only: `4, 8, 12, 16, 20, 24, 32, 48` px. No other values.

### Radius

- `12px` — cards, panels, inputs, content containers (default)
- `9999px` — pill buttons, prerelease tag
- `8px` — list rows, repo rows, dropdown options
- `6px` — icon buttons

### Typography

System font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. No `@font-face`, no web fonts, no bundled font files.

| Purpose | Size | Line height | Weight |
|---|---|---|---|
| Page title | 24 | 32 | 600 |
| Section heading | 20 | 32 | 500 |
| Card heading (release tag + name) | 16 | 24 | 500 |
| Body / base | 14 | 20 | 400 |
| Button | 14 | 20 | 500 |
| Meta / caption (timestamps, validation subtitles, watching-N-of-M header) | 12 | 16 | 400 |

### Shadows

- Panels and cards: none
- Test preview (elevated): `0 4px 8px rgba(0, 0, 0, 0.15)`

## Layout

### App shell

Single-view UX with a push-view for admin settings. No tabs. `AppHeader` sits above a single content region that swaps between `HomeView` and `Settings`.

```
home view (everyone):                settings view (admin):
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Release Watcher           ⚙  │    │ ← Settings                   │
├──────────────────────────────┤    ├──────────────────────────────┤
│ Watching 5 repos · 2m ago    │    │ Watching 5 of 10 repos       │
│                              │    │                              │
│ ┌─ vercel/next.js v15.0.1 ─┐ │    │ ┌─ vercel/next.js ────────┐ │
│ │ Improvements to Turbopack │ │    │ │ [15 min][☐pre][Test][X] │ │
│ │ ...                       │ │    │ │ ✓ 47 releases · 3d ago  │ │
│ │              View on GH → │ │    │ └─────────────────────────┘ │
│ └───────────────────────────┘ │    │ ┌─ nodejs/node ───────────┐ │
│ ┌─ nodejs/node v22.5.0 ────┐ │    │ │ [30 min][☐pre][Test][X] │ │
│ │ ...                       │ │    │ │ ✓ 312 releases · 1d ago │ │
│ └───────────────────────────┘ │    │ └─────────────────────────┘ │
│ ...                           │    │ + Add repository             │
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

Renders the most recent `archive_cap` releases across all watched repos, ordered by `added_at DESC` (i.e., when the watcher first saw them — which approximates release publish order well enough at typical cadences).

- Card: `12px` rounded panel, `16px` padding, `--rootsdk-background-secondary`.
- Card header (one line): `{owner}/{repo}` link in `--rootsdk-link`, dot separator, release tag in primary text, optional prerelease pill, right-aligned relative timestamp in `--rootsdk-text-secondary`.
- Card body: release name (16/24/500) on its own line, then up to ~6 lines of body excerpt in 14/20/400 (overflowing text fades out at ~6 lines with `mask-image` rather than truncating mid-character).
- Card footer: right-aligned `View on GitHub →` link.
- Live updates: a `ReleaseAdded` broadcast prepends the new card with a `300ms` highlight pulse (`--rootsdk-highlight-light` background fading out).
- Empty state (no repos configured): `<EmptyState title="No repositories yet" body={amIAdmin ? "Add a repository in Settings to start tracking releases." : "An admin hasn't added any repositories yet."} />`.
- Empty state (repos configured but feed empty): `<EmptyState title="No releases yet" body="Releases from your watched repositories will appear here." />`.

The feed is a snapshot view — it does not paginate and does not support filtering. Capped at `archive_cap` cards (default 50); older cards are pruned server-side on archive insert.

### Settings — Repos

Single-page settings, no tab bar. A one-line header (`Watching N of 10 repos`) sits at the top; below it, the list of repos as `RepoRow`s; below that, an `+ Add repository` button (hidden when the cap is reached).

The header is plain text (12/16/400, `--rootsdk-text-secondary`) — not a meter, not a bar. The 10-repo cap is a product decision worth surfacing once at the top, but it's not a real-time aggregate visualization. See [Rate-limit constraints](#rate-limit-constraints) in the appendix for why this app deliberately avoids a budget-meter UI.

#### RepoRow

```
┌─────────────────────────────────────────────────┐
│ vercel/next.js          [10 min] [☐pre] [Test][X]│
│ ✓ 47 releases · last published 3d ago             │
│ [optional inline test preview, expandable below]  │
└─────────────────────────────────────────────────┘
```

- 8px-rounded row in `--rootsdk-background-secondary`, `12px` vertical padding, `16px` horizontal.
- Top line: repo path (read-only after add — to change, remove and re-add), `NumberInput` for poll interval in minutes, `Toggle` for prerelease inclusion, `Test` button, `Remove` icon button.
- Subtitle line:
  - On successful validation: `✓ {N} releases · last published {relative}` in `--rootsdk-brand-secondary` (12/16/400).
  - On error: `! {error message}` in `--rootsdk-error`. Error text comes from `last_error_message` on the row.
  - Pending validation (just added, never polled): `Validating…` in `--rootsdk-text-secondary`.
- All edits auto-save through `useDebouncedMutation` (150ms). Interval edits below the floor (15 min) are rejected server-side; the `AutoSaveStatus` chrome surfaces the error pill ("Polling interval must be at least 15 minutes").
- Test button: see [Test preview](#test-preview-this-sample) in the appendix. Click expands the row to show the preview card; click again or the close button collapses it.
- Remove button: opens an inline type-to-confirm input below the row (see [Destructive confirmations](#destructive-confirmations)).

#### Add repository flow

`+ Add repository` button at the bottom of the list. Click → an empty `RepoRow` appears at the bottom of the list with the URL input in focus; default interval `30 min`, prerelease off. On URL save (debounced or blur), server validates by `GET https://api.github.com/repos/{owner}/{name}` and:

- 200: row promotes from "pending" to validated; subtitle becomes `✓ {N} releases · last published {relative}`; first poll runs immediately (also doubles as backfill — the latest release is archived and broadcast).
- 404: subtitle becomes `! Repository not found`. Row stays in pending state until URL changes or row is removed.
- Other errors: subtitle becomes `! Could not reach GitHub` (or similar); transient errors retry on next poll cycle.

If the community is already watching the maximum 10 repos, the `+ Add repository` button is hidden and the count header reads `Watching 10 of 10 repos · remove one to add another`. Server enforces the cap independently — even if a stale client tries `AddRepo`, the server rejects with a structured error.

### Destructive confirmations

No modal dialogs. One inline pattern — **type-to-confirm** — handles every destructive action. The admin types the exact name of what they're destroying; the danger button stays disabled until the text matches. Case-sensitive, matching Root's native "Delete community" pattern.

The implementation: a text input + danger button rendered inline below the affected row, wired by a single `value === expected` comparison. No new component is needed; the pattern is composed from `TextInput` + `Button`.

In this sample, the pattern is used for repo removal. Type `{owner}/{name}` to confirm; the danger button enables when the typed string matches exactly. On confirmation, the server deletes the row from `watched_repos` (cascading the archive entries via FK), broadcasts `RepoListChanged`, and the row disappears from the list. The exact placeholders and matching strings live in [Appendix → Copy](#copy-this-sample).

Auto-save does NOT apply to destructive actions — they never fire without the typed match.

## Responsive

The app is mobile-first: every interactive element meets touch-target minimums, layouts adapt down to 320px, and nothing requires a pointer. Two width tiers:

| Width | Tier | Behavior |
|---|---|---|
| `< 640px` | **Mobile** | Single column, full-width of viewport minus `16px` side padding. Release cards: same shape, body excerpt may collapse from 6 to 4 lines. RepoRow: top line wraps; interval input + prerelease toggle drop to a second line beneath the repo path. Inline test preview: full-width below the row. |
| `>= 640px` | **Desktop** | Same centered column, capped at `640px`. RepoRow stays single-line for top controls. |

### Touch targets

All interactive elements meet the 44×44 px minimum at every width.

| Element | Min height |
|---|---|
| Header buttons (gear, back) | 44×44 |
| Buttons (all variants) | 44px |
| RepoRow controls (interval input, toggle, Test, Remove) | 44px each |
| Add repository button | 44px |
| Release card "View on GitHub" link tap target | 44px (extends into the card footer area) |

### Minimums

- Supported panel width: `320px` (iPhone SE portrait). Below this, horizontal scroll.

### Overflow

- The release feed scrolls within the content region; `AppHeader` sits above the scroll container as a fixed flex row.
- Settings page: vertical scroll for long repo lists. The count header at the top scrolls with content (no `position: sticky`).

## Motion

Minimal and purposeful.

| Element | Transition |
|---|---|
| Button hover | `opacity 200ms` |
| Button press | `opacity 200ms`, `transform: scale(0.98)` |
| Row hover | `background-color 150ms` |
| Home ↔ Settings push-view | None — instant swap |
| New release card prepend | `300ms` highlight pulse on the new card's background (`--rootsdk-highlight-light` fading to transparent) |
| Test preview expand/collapse | `height 200ms ease-out` on the row's expandable region; `opacity 200ms` on the preview content |
| Inline confirm reveal (remove) | `opacity 150ms` on the swapped controls; no layout animation (container width preserved) |

No animation library. No FLIP. No View Transitions API.

## Icons

Copy [`apps/themes/client/src/components/Icon.tsx`](../themes/client/src/components/Icon.tsx) into this sample's `client/src/components/`. Use icons from [`icons.json`](../themes/client/src/generated/icons.json).

```tsx
<Icon name="Settings" size={20} />
<Icon name="ExternalLink" size={14} />
<Icon name="Trash" size={16} />
<Icon name="Plus" size={16} />
```

If an icon is missing, inline the SVG directly rather than adding a library.

## Components

Hand-rolled in `client/src/components/`. One `.tsx` + one `.module.css` per component.

| Component | Purpose |
|---|---|
| `AppHeader` | Top bar with two modes: home (title + gear) and settings (back chevron + label). Gear renders only when `amIAdmin`. |
| `ReleaseCard` | One card in the feed: repo header line, release tag + name, body excerpt, View-on-GitHub link, optional prerelease pill |
| `RepoRow` | One row in Settings → Repos: repo path + interval + prerelease toggle + Test + Remove + validation subtitle + expandable Test preview slot |
| `TestPreview` | Inline preview card shown under a `RepoRow` when Test is clicked. Renders the would-be feed card for the latest release of that repo without writing to the archive or broadcasting |
| `AutoSaveStatus` | Inline error pill that appears only when an auto-save fails — Retry + Dismiss. Successful saves render nothing |
| `Button` | Variants: `primary`, `outline`, `danger`, `text` |
| `NumberInput` | Labeled integer input with min/max (used for interval) |
| `TextInput` | Labeled text input (used for repo URL on add, and for the type-to-confirm input on remove) |
| `Toggle` | Boolean toggle (used for `include_prereleases`) |
| `AdminOnly` | Conditional wrapper gated on server-provided `amIAdmin` |
| `QueryError` | Error state with retry button |
| `Loader` | Loading state |
| `EmptyState` | Consistent empty state (title + optional body + optional action) |
| `Icon` | From themes sample |

## State

| Scope | Storage |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Release feed | `FeedContext` fed by `GetFeed` RPC + `ReleaseAdded` and `RepoRemoved` broadcasts. New releases are prepended to the list with a transient highlight; the list is capped at `archive_cap` client-side as well. On `RepoRemoved`, entries for that repo are filtered out of local state immediately — no `GetFeed` round-trip needed. |
| Repo list (Settings) | `RepoContext` fed by `GetSettings` RPC + `RepoListChanged` broadcast (admin-only). Each row owns its own auto-save via `useDebouncedMutation`. Separate per-field RPCs (`UpdateRepoInterval`, `UpdateRepoPrerelease`) so concurrent admin edits across rows don't stomp each other. |
| Test preview state | Local to the `RepoRow`. `useState<TestPreview | null>` holds the most recent `TestRepo` response; cleared on row collapse. Not persisted server-side. |
| `amIAdmin` | Returned on `GetFeed`; stored in `FeedContext`. Refreshed via a `reload()` call on every `AdminsChanged` broadcast (public, empty payload). Controls gear visibility in `AppHeader` and guards the settings view in the shell. |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` in cleanup.

### Broadcasts

Four event types with distinct audiences:

| Event | Audience | Triggered by | Payload (approx) |
|---|---|---|---|
| `ReleaseAdded` | `"all"` | A poll cycle discovers a new release; `onNewRelease(release)` archives + broadcasts | `{ release: ReleaseRow }` — full row, ~400–800 B depending on body excerpt |
| `RepoRemoved` | `"all"` | `RemoveRepo` — fired after the row is deleted and its archive entries are FK-cascaded out | `{ owner, name }` — minimal identifiers only |
| `RepoListChanged` | Admin-only (the admins `ReadOnlyMemberGroup` from `globalSettings.general.admins`) | `AddRepo`, `RemoveRepo`, `UpdateRepoInterval`, `UpdateRepoPrerelease`, or per-row state changes (last_poll_*) | `{ repos: RepoRow[] }` — full list snapshot, ~100 B per row |
| `AdminsChanged` | `"all"` | globalSettings `general.admins` selection changed | Empty. Signals every client to re-fetch `GetFeed` so promoted/demoted users pick up their new `amIAdmin` |

#### Why removal needs a public companion event

`RepoListChanged` is admin-only because it carries per-row state (last poll timestamps, error messages) that's only useful inside the admin-gated Settings view, and `last_error_message` could leak details about external services that non-admin members have no reason to see. Gating the broadcast to the admins `ReadOnlyMemberGroup` matches the gate on `GetSettings`.

But repo removal needs to clean up the *public* feed too — the orphaned cards for the removed repo would otherwise stay rendered on non-admin clients until their next `GetFeed` refresh. So `RepoRemoved` exists as a minimal public companion: just `{owner, name}`, no admin-sensitive data, fired after the cascade delete completes. Every client subscribes to it and filters its local feed state.

The same split pattern handles admin-set changes: `AdminsChanged` is a public, empty-payload companion that tells every client "your `amIAdmin` may have changed — re-fetch `GetFeed`." `amIAdmin` is computed from `globalSettings` which the client doesn't read directly, so the only way to pick up the new value is a server RPC round-trip.

#### Why ReleaseAdded uses `"all"` (not targeted)

The release feed is visible to every member, so the broadcast audience naturally is everyone. There is no per-user filtering to do. Trade-off is N× fan-out per release, which is trivial: `ReleaseAdded` fires on the order of a few times per hour even across many watched repos (release cadence is naturally low — on the order of releases/day per repo at most).

Coalescing is unnecessary: per-release fan-out is already low-frequency, and unlike a leaderboard, releases don't cluster in time the way XP earns do.

#### onNewRelease: single funnel for new-release dispatch

Every path that introduces a release into the system flows through one function:

```ts
async function onNewRelease(release: Release) {
  await archiveStore.insert(release);          // SQLite insert + cap-prune
  await rootServer.broadcast("ReleaseAdded", { release });
}
```

The poll cycle, the backfill that runs on first add, and any future code that needs to surface a release all go through this funnel. Tests can stub it; instrumentation can be added in one place; archive and broadcast stay in lockstep without ad-hoc duplication.

The Test button does **not** call `onNewRelease` — it only fetches and returns the release for local preview, never archives or broadcasts. That separation is what keeps Test from polluting the shared feed.

---

# Appendix: Behavior of this sample

Everything from here down is specific to github-release-watcher. If you're forking this for a different domain, replace this section wholesale and use the rest of the doc as your patterns library.

## Overview

GitHub Release Watcher is a community app that tracks new releases across a configurable set of public GitHub repositories and surfaces them as an in-app chronological feed. Admins choose which repos to watch and at what cadence; every member of the community sees the resulting feed.

The app exists to teach the patterns of external-service integration: outbound HTTP, scheduled polling with rate-limit awareness, dedupe state, in-app archive, and multi-row admin configuration with cross-row constraints.

## How polling works

A single scheduled job ticks **every minute**. On each tick, the scheduler:

1. Reads all rows from `watched_repos`.
2. Filters to rows where `last_poll_at + (poll_interval_minutes × 60_000) ≤ now` (i.e., due).
3. Polls those rows in parallel with a `pMap` concurrency cap of `5` (so one slow repo doesn't block others, but we don't fan out unbounded).
4. For each polled repo: `GET https://api.github.com/repos/{owner}/{name}/releases?per_page=10` via `withRetry`; filter response to releases with `id > MAX(id) FROM releases WHERE owner=? AND name=?`; further filter out prereleases if `include_prereleases` is false; sort ascending by `id`; for each: `onNewRelease(release)`.
5. Update the row's `last_poll_at`, `last_poll_status`, and `last_error_message` regardless of outcome.

`per_page=10` covers backlog if a poll cycle was missed (server restart, network outage); on the first poll for a fresh repo it also serves as the [backfill](#backfill-on-add).

The single-tick design is preferred over N per-row jobs because: (a) it scales cleanly across the [10-repo cap](#rate-limit-constraints) without fragmenting the schedule, (b) it survives restart cleanly (deadlines are derived from `last_poll_at`, which is durable), and (c) it concentrates all the polling logic in one place.

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
| Per-repo poll interval (default for new repos) | **30 minutes** |

**Worst-case rate:** 10 repos × 4 req/hr = **40 req/hr** — 33% headroom under GitHub's 60/hr ceiling. Ad-hoc operations (validate-on-save, Test button, occasional retries) borrow from that 20 req/hr headroom and don't affect the steady-state math.

**Server enforcement.** On `AddRepo`: reject if the community already has 10 repos. On `UpdateRepoInterval`: reject if the proposed interval is below 15 minutes. Both errors surface via the `AutoSaveStatus` chrome:

> *"Maximum 10 repositories. Remove one to add another."*
> *"Polling interval must be at least 15 minutes."*

**Why no aggregate-budget meter.** A real-time meter showing `Σ 60 / interval_minutes` against a soft cap is a defensible UX, but it's UI flourish rather than a Root-pattern carrier — visualizing aggregate state from a list is generic React, not a platform lesson. Hard caps with simple per-row enforcement teach the same server-side validation lesson without the meter machinery.

## Validation flow

Every newly added repo URL is validated by a single `GET /repos/{owner}/{name}` against GitHub. Outcomes:

- **200**: row promotes to validated; first poll runs immediately and also serves as backfill.
- **404**: row stays in pending state with the subtitle `! Repository not found`. The row is kept in `watched_repos` so the admin can correct the URL by removing and re-adding (URLs are not editable in place — a typo is an admin error to fix by re-creating the row).
- **403 / rate-limited**: subtitle `! Rate limited — try again later`. Row stays pending; the next poll cycle picks it up.
- **5xx / network**: subtitle `! Could not reach GitHub`. Same retry behavior.

Validation feedback is durable, not transient — the subtitle reflects the row's current health rather than fading after a few seconds. With multiple repos in the list, durable per-row state is the only way for an admin to see at a glance which rows are working.

## Test preview (this sample)

Each `RepoRow` carries a Test button. Click → server fetches the latest release for that repo (`GET /repos/{owner}/{name}/releases/latest`, or `?per_page=1` if `include_prereleases` is true) → returns the release to the calling client only → row expands to show an inline `TestPreview` rendered as the would-be feed card.

Important properties:

- **No archive write.** Test does NOT go through `onNewRelease`.
- **No broadcast.** Other clients never see the test result.
- **No effect on poll cadence.** Test is a one-off ad-hoc request; it doesn't reset `last_poll_at` or shift the row's next-due time.
- **Same component used for the preview as for the real feed card.** What you see in Test is exactly what would render in the feed.

A second click on Test (or a Close action inside the preview) collapses the preview. Switching tabs / closing the row also clears the preview state — it's local to the `RepoRow`.

## Backfill on add

The first poll for a newly-added repo doubles as a one-time backfill. Because the dedupe cursor is `MAX(id) FROM releases WHERE owner=? AND name=?` and the table starts empty for the new repo, every release returned by `?per_page=10` is "new" and gets archived + broadcast.

This means a freshly-added repo immediately populates ~10 cards in the feed (or fewer if the repo has fewer than 10 releases total), giving the community visible activity within seconds of the admin saving. The behavior is not configurable — it's a consequence of the dedupe model, and that consequence is intended.

(If 10 cards is too many for an active repo, the archive cap of 50 keeps the global feed bounded.)

## Repo removal

The Remove button on a `RepoRow` reveals an inline type-to-confirm input. Admin types the exact repo path (e.g., `vercel/next.js`) — the danger button enables when the input matches. On confirmation, the server runs an atomic transaction and fires two broadcasts:

1. `DELETE FROM watched_repos WHERE owner=? AND name=?` — the FK `ON DELETE CASCADE` on `releases` removes the archive entries in the same transaction.
2. Broadcast `RepoListChanged` (admin-only) so admin clients refresh their Settings list.
3. Broadcast `RepoRemoved { owner, name }` (`"all"` audience) so every client (admin or not) drops the orphaned cards from its local feed immediately.

The two broadcasts are deliberate: `RepoListChanged` carries admin-only per-row state and stays admin-gated, while `RepoRemoved` carries only the public identifiers needed for feed cleanup. Together they make removal clean for everyone — no orphaned cards lingering on non-admin clients, no admin-sensitive data leaking to public clients.

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
| Per-repo poll interval (default for new repos) | 30 minutes |
| Archive size | 50 most-recent releases (across all repos, ordered by `added_at DESC`); older rows pruned on insert |
| Release body excerpt in card | ~6 lines visible (mask-fade overflow); full body still available via `View on GitHub` |
| `pMap` concurrency cap (poll cycle) | 5 |
| GitHub list-page size (per request) | 10 |

## View states (this sample)

| View | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` (blocks until both `GetFeed` returns) | No repos configured: `<EmptyState title="No repositories yet" body={amIAdmin ? "Add a repository in Settings to start tracking releases." : "An admin hasn't added any repositories yet."} />`. Repos configured but feed empty: `<EmptyState title="No releases yet" body="Releases from your watched repositories will appear here." />`. | `<QueryError onRetry />` that refetches `GetFeed`. |
| Settings | `<Loader />` (blocks until `GetSettings` returns) | No repos: the bare `+ Add repository` button (no `EmptyState` chrome — the button itself is the affordance). | `<QueryError onRetry />` that refetches `GetSettings`. |

Admin-denied settings (non-admin reaches `view === "settings"` somehow): the shell swaps back to home. The `Settings` component also uses `<AdminOnly>` as defence in depth. Server RPCs reject admin-only actions with `RootServerException(NotAdmin)` regardless.

## Copy (this sample)

Buttons: **Add repository**, **Test**, **Remove**, **Close preview**, **Retry**.

**Auto-save status (`AutoSaveStatus` pill — error only):**
- Generic error: **Couldn't save — _{message}_.** + **Retry** action + dismiss (✕)
- Repo cap reached: **Maximum 10 repositories. Remove one to add another.** + dismiss
- Interval too low: **Polling interval must be at least 15 minutes.** + dismiss
- Permission denied: **You do not have permission to change settings.** + dismiss

**Repo row subtitles:**
- Validating (just added): **Validating…**
- Validated: **✓ _{N}_ releases · last published _{relative}_** (e.g., "✓ 47 releases · last published 3 days ago")
- Repo not found: **! Repository not found.** Double-check the URL.
- Rate limited: **! Rate limited — try again later.**
- Network/server error: **! Could not reach GitHub.**

**Add-repository placeholder:** `https://github.com/owner/repo`

**Type-to-confirm — Remove repository:**
- Help text: **Remove this repository and all its archived releases. Cannot be undone.**
- Input placeholder: **Type `_{owner}/{name}_` to confirm**
- Danger button label: **Remove** — disabled until the typed value matches the repo path exactly (case-sensitive). On success, the row disappears.

**Empty states:**
- HomeView, no repos (admin): **No repositories yet** — Add a repository in Settings to start tracking releases.
- HomeView, no repos (member): **No repositories yet** — An admin hasn't added any repositories yet.
- HomeView, repos but no releases: **No releases yet** — Releases from your watched repositories will appear here.

**Settings count header:** **Watching _{N}_ of 10 repos** (or **Watching 10 of 10 repos · remove one to add another** when at the cap)

**Card prerelease pill:** **pre-release**

**Card link:** **View on GitHub →**
