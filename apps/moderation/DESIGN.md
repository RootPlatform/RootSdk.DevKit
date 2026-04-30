# Design

Implementation patterns for the moderation sample, plus an appendix at the end documenting this specific app's behavior. **If you're forking this sample, start with [Adapting this sample](#adapting-this-sample) to know what to copy verbatim, what to adapt, and what to replace.**

For Root-wide visual conventions (colors, spacing, radii, typography, shadows, transitions, base component patterns), follow [`apps/themes/client/src/generated/design-tokens.json`](../themes/client/src/generated/design-tokens.json) — this doc inherits all defaults from there and only calls out what's specific to this app. For shared infrastructure patterns (auto-save chrome, retry helpers, ErrorBoundary funnel), also read [`apps/leveling-leaderboard/DESIGN.md`](../leveling-leaderboard/DESIGN.md) and [`apps/github-release-watcher/DESIGN.md`](../github-release-watcher/DESIGN.md).

## Adapting this sample

This sample teaches three families of patterns: server-side moderation pipelines (rule order, audit dispatch funnel, retention), admin-gated app-managed config with per-field auto-save, and the canonical Root UI shell (Sidebar+drawer, Panel, StatCard, Badge variants, IconBox tints). Use this map before mining the rest:

### Copy verbatim

Infrastructure-level patterns that should work unchanged for any app of similar shape.

**Foundation (every Root app):**

| Pattern | Where it lives |
|---|---|
| Stack (React 19 + Vite + plain CSS modules + protobuf RPC) | `package.json`, `client/vite.config.ts`, `client/tsconfig.json` |
| `--rootsdk-*` token usage with `color-mix` tints — no hardcoded colors anywhere | All `*.module.css` |
| `color-scheme` bridge to Root theme | `client/src/lib/rootColorScheme.ts` |
| `withRetry` (server) / `withClientRetry` (client) with bounded jitter | `server/src/lib/retry.ts`, `client/src/lib/retry.ts` |
| `useDebouncedMutation` auto-save hook | `client/src/lib/useDebouncedMutation.ts` |
| `ErrorBoundary` + `ReportClientError` telemetry funnel (per-caller rate limit + per-field size caps server-side) | `client/src/components/ErrorBoundary.tsx`, server handler in `moderationService.ts` |
| `useFocusTrap` for any drawer/modal-like overlay | `client/src/lib/useFocusTrap.ts` |

**Visual primitives:**

| Pattern | Where it lives |
|---|---|
| Icons via `lucide-react` (one library, ~1500 glyphs, tree-shaken per-import). Components that take an icon accept `icon: ReactNode` and callers pass `<Shield size={20} />` directly. `apps/themes` remains the canonical "look like Root surfaces" reference for anyone who wants strict identity with native Root chrome — sample apps standardize on lucide for breadth and one consistent API | `lucide-react` dep + per-call-site imports |
| `Badge` variant API — five tones share one CSS rule via a `--tone` CSS custom property keyed off Root status tokens | `client/src/components/Badge.{tsx,module.css}` |
| `IconBox` — tinted square wrapping any icon, accent maps to a Root token | `client/src/components/IconBox.{tsx,module.css}` |
| `Panel` — header/body container matching the canonical `panel` componentPattern in `design-tokens.json` | `client/src/components/Panel.{tsx,module.css}` |
| `StatCard` — labelled metric tile with IconBox accent | `client/src/components/StatCard.{tsx,module.css}` |
| `Pill` — monospace `# channel-name` chip | `client/src/components/Pill.{tsx,module.css}` |
| `Sidebar` (≥960px) + `MobileHeader` with focus-trapped drawer (<960px), driven by a single `navItems` config so the two surfaces never drift | `client/src/components/{Sidebar,MobileHeader,navItems}.{tsx,ts,module.css}` |
| `SubTabs` — generic underline tab strip; works with both string and number enum keys | `client/src/components/SubTabs.{tsx,module.css}` |
| `Select` — native `<select>` styled per the `native-select` componentPattern | `client/src/components/Select.{tsx,module.css}` |
| `EmptyState` — shared empty placeholder with optional title, body, action | `client/src/components/EmptyState.{tsx,module.css}` |

**Admin gating + admin broadcasts:**

| Pattern | Where it lives |
|---|---|
| `isAdmin(userId)` resolved against `globalSettings.general.admins ∪ ownerUserId` (owner is implicitly an admin — defence in depth) | `server/src/adminCheck.ts` |
| Custom `MemberGroup` for the admin broadcast audience (`adminAudience` mirrors `admins ∪ owner`, re-synced on `globalSettings.update` and `CommunityEdited`). Required because the bare admins group excludes an owner who isn't explicitly listed — and the owner is the most likely person driving Settings | `server/src/adminAudience.ts` |
| Public/admin broadcast split: admin-only `SettingsChanged` targets the `adminAudience`; public companions (`AuditLogAppended`, `AdminsChanged`) target `"all"` with no payload | `server/src/moderationService.ts` (`notifySettingsChanged`, `notifyAuditLogAppended`, `notifyAdminsChanged`) |

**Settings UX:**

| Pattern | Where it lives |
|---|---|
| Per-field auto-save with separate per-field `SetX` RPCs so concurrent admin edits to different fields don't coalesce into payloads that re-stomp unrelated fields | `client/src/views/settings/*.tsx` (each `useFieldAutoSave` call is one RPC) |
| Atomic per-field writes via `dataStore.appData.update()` — read-modify-write race closed at the KV layer | `server/src/settingsStore.ts` |
| `MasterSubToggleGroup` — master toggle row + indented sub-toggles connected by a 2px left border | `client/src/components/MasterSubToggleGroup.{tsx,module.css}` |
| `ShowWordListGate` — Show/Hide gate around sensitive content (offensive word lists) so admin screens don't display the content by default | `client/src/components/ShowWordListGate.{tsx,module.css}` |
| Inline two-step confirm for low-stakes destructive actions; destructive icon-buttons are red at rest | `client/src/components/InlineConfirm.{tsx,module.css}` (used by `WordListPanel` for word delete, `MemberActions` for kick/ban) |
| Type-to-confirm pattern for irreversible bulk operations — disabled commit button until the user types the canonical phrase, server re-validates the phrase as defence in depth | `client/src/components/TypeToConfirm.{tsx,module.css}` (used by the General Settings → Danger zone "Clear audit log" action) |
| `MemberActions` — Kick/Ban affordances scoped to a target user; ban surfaces a duration picker (Permanent / 1d / 7d / 30d) that drives `BanMemberRequest.expiresAt`; gated through InlineConfirm | `client/src/components/MemberActions.{tsx,module.css}` |
| `AutoSaveStatus` — error-only inline pill (no "Saving…" indicator; transient pill flicker on every keystroke is worse than silence on success) | `client/src/components/AutoSaveStatus.{tsx,module.css}` |

**Server-side patterns:**

| Pattern | Where it lives |
|---|---|
| Central audit dispatch funnel (`onAuditEntry`) so every audit-writing call site (3 rule paths in messageHandler + 3 manual actions in the service) goes through one place — registration callback breaks the would-be circular import | `server/src/auditDispatch.ts` |
| Rule pipeline order with system-message + non-Person filter — first match wins; skips system messages, other apps' messages, and unmonitored channels | `server/src/messageHandler.ts` |
| Daily retention prune via `JobInterval.Daily`; idempotent reschedule on startup; handles `JobMissed` for downtime catch-up | `server/src/main.ts` (`initializeCleanupJob`) |
| `RootServerException` with structured proto-defined error codes mapped to user-facing strings on the client | `networking/src/moderation_service.proto` (`ModerationError`) + per-call sites |
| Sliding-window detectors with periodic prune (spam observations, rate observations) — not pruned on hot path | `server/src/spamDetector.ts`, `server/src/rateLimiter.ts` |

### Adapt

These structures translate but the names, payloads, and exact contents change with the domain.

| What to adapt | Notes |
|---|---|
| Component names + shapes | `RecentActivityRow`, `MonitoredChannelsPanel` etc. — keep the conventions (one `.tsx` + one `.module.css`, props typed, comments at top), swap the rendering. |
| Broadcast event names and payloads | The audience pattern (admin-only vs `"all"`) transfers; the events themselves don't. |
| RPC list | The admin-gating pattern (`requireAdmin`, throws `RootServerException`) and per-field auto-save shape transfer; specific RPCs are domain. |
| Settings sub-tab structure | The `SubTabs` + `Card`-wrapped tab body pattern transfers; specific sub-tabs are domain. |
| `navItems` array | The icon+label+adminOnly shape transfers; the items themselves are domain. |
| Layout dimensions | 240px sidebar, 720px Settings cap, 16/24px content padding, 12px panel radius. Use these defaults unless your content type forces a change. |

### Replace

These are pure domain content for *this* app. Don't read them as guidance for other apps.

| What to replace | Where it lives |
|---|---|
| Entire Behavior contract | [Appendix: Behavior of this sample](#appendix-behavior-of-this-sample) |
| Domain constants (limits for spam threshold, rate window, retention days) | `server/src/moderationService.ts` (`SPAM_THRESHOLD_MIN`, etc.) |
| Word lists | `server/src/builtinWordLists.ts` |
| Stores tied to moderation (`auditLogStore`, `wordListStore`, `monitoredChannelsStore`, `spamDetector`, `rateLimiter`) | `server/src/` — copy the *shape* (atomic SQL, in-memory cache, stable interfaces), replace the schema. |
| Copy strings (button labels, error messages, placeholder text) | Inline across components; consolidated reference in [Appendix → Copy](#copy-this-sample). |

### First steps after fork

Concrete sequence for an agent that's decided to fork this sample. Do these in order:

1. **`npm run clean`** at the workspace root — wipes generated dirs (`node_modules`, `dist`, `networking/gen`, lockfiles, `*.pkg`).
2. **Find-replace the package namespace.** `@moderation/` → `@yourapp/` across `package.json` (root + workspaces), all source `import` statements, and `networking/root-protoc.json`.
3. **Edit `root-manifest.json`** — new `id`, reset `version` to `1.0.0`, update the `settings` block if your admin-selection shape differs.
4. **Replace domain constants** in `server/src/moderationService.ts` (range floors/ceilings) and `server/src/builtinWordLists.ts` (replace placeholder lists with your domain's lists).
5. **Replace the proto** (`networking/src/moderation_service.proto`) with your service definition. Keep the proto enum-prefix convention (`YOUR_ERROR_*` on every enum value), the per-field setter shape, the public/admin broadcast split, and the `ReportClientError` RPC.
6. **Replace the stores** (`server/src/{auditLogStore,wordListStore,monitoredChannelsStore}.ts`, `spamDetector.ts`, `rateLimiter.ts`) with your domain schema. Keep the in-memory cache + invalidation shape and the central dispatch funnel pattern.
7. **Replace client view bodies** for your domain rendering. Keep the layout primitives (`Sidebar`, `MobileHeader`, `Panel`, `StatCard`, `Badge`, `IconBox`, `Pill`, `EmptyState`, `Loader`, `QueryError`, `MasterSubToggleGroup`, `ShowWordListGate`) verbatim — they're domain-neutral.
8. **Swap icon imports** for your domain. `import { YourIcon } from "lucide-react"` and pass the JSX element to consuming components — `<StatCard icon={<YourIcon size={20} />} />`. Components keep an icon-library-agnostic `icon: ReactNode` prop, so a fork that prefers a different library only changes the import sites.
9. **Update `DESIGN.md` and `README.md`.** Replace the appendix wholesale; align the Coverage scope bullets / Copy-verbatim table to match what your fork keeps and what it changes.
10. **Verify the audit invariant holds** in your domain: every state-modifying operation should write through the audit dispatch funnel. Run the server through one full cycle (rule fires → audit row + broadcast → cleanup job runs → row pruned past retention) before considering the fork complete.

### ⚠ Storage shape

> **Read this before mining the storage layout.**

This sample uses **KV for flat scalar settings** and **SQLite for relational/list data**. The split matches each value's natural shape:

- **KV (`dataStore.appData`)** — `settings/content-filter`, `settings/spam-control`, `settings/rate-limit`, `settings/general`. One key per settings group, `dataStore.appData.update()` for atomic per-field merges. See [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- **SQLite** — `words`, `audit_log`, `recent_messages`, `rate_messages`, `monitored_channels`. Anything multi-row or paginated. See [`api-samples/server-database`](../../api-samples/server-database).
- **`globalSettings`** — admin role/member picker. Manifest-declared, platform-rendered. See [`api-samples/server-global-settings`](../../api-samples/server-global-settings).

**Don't shoehorn flat scalars into SQLite.** A fork that adds a new "default cooldown" knob should add it to the appropriate KV settings group (and a new per-field `Set` RPC), not extend a SQLite table.

**Schema migrations.** [`server/src/db.ts → runSchemaMigrations`](server/src/db.ts) shows the idempotent pattern for adding or renaming columns after first ship. Every startup runs `PRAGMA table_info(<table>)` once, builds a `Set` of existing column names, and applies each migration only when its prerequisite is true:

```ts
if (colNames.has("legacy_name") && !colNames.has("new_name")) {
  await run(db, `ALTER TABLE t RENAME COLUMN legacy_name TO new_name`);
}
if (!colNames.has("added_column")) {
  await run(db, `ALTER TABLE t ADD COLUMN added_column TEXT NOT NULL DEFAULT ''`);
}
```

Why the `Set` + conditional shape: SQLite's `CREATE TABLE IF NOT EXISTS` is a no-op when the table exists, so changing the body of a `CREATE TABLE` statement doesn't migrate older databases — they stay on the original schema until an explicit `ALTER TABLE`. Forking agents who add columns post-ship should append migrations to this block, not edit the `CREATE TABLE`.

---

## Permissions scope

[`root-manifest.json`](root-manifest.json) declares `community.fullControl: true`. **A fork should consciously decide whether to inherit that or scope down.**

The app needs four distinct permissions:
- `community.kick` (manual kick action)
- `community.createBan` (manual ban + username-filter ban)
- `channel.deleteMessageOther` (rule-pipeline + manual delete)
- `channel.viewMessageHistory` (manual delete pre-fetches the message for the audit excerpt)

Plus `channel.createMessage` for warning posts (already covered for app contexts but listed for completeness).

**Why we ship `fullControl`** in the sample: a single declaration covers the surface and matches the typical bot/moderation app deployment pattern where one trusted app gets broad community access. It also keeps the sample's permission story compact — readers focus on the moderation pipeline, not on permission plumbing.

**When to scope down**: a fork running in a less-trusted context, or a community with stricter app-permission policies, should swap to:

```json
{
  "community": {
    "kick": true,
    "createBan": true
  },
  "channel": {
    "deleteMessageOther": true,
    "viewMessageHistory": true,
    "createMessage": true
  }
}
```

Same functional surface, narrower blast radius. Both are correct shapes; the `fullControl` form is just shorter for a teaching sample. Forking agents should explicitly pick — don't copy the manifest verbatim without considering this.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Bundler | Vite 5 |
| Language | TypeScript (strict) |
| Styling | Plain CSS with CSS Modules (`*.module.css`), one file per component |
| State | React state + Context for cross-component sharing |
| Networking | Generated protobuf client from `networking/` |
| Icons | `lucide-react` (~1500 glyphs; tree-shaken per-import). See [Visual tokens](#visual-tokens) for how this relates to `apps/themes` |
| Server-side persistence | SQLite via `dataStore.config.sqlite3.filename`; KV via `dataStore.appData` |
| Job scheduling | `rootServer.jobScheduler` — daily recurrence for retention cleanup |

**No third-party UI stack.** No Tailwind, Radix, framer-motion, or similar. First-party Root SDK packages (`@rootsdk/server-app`, `@rootsdk/client-app`) are in scope.

## Visual tokens

All colors, spacing, radii, typography, shadows, and transitions come from Root CSS custom properties. The canonical reference is [`apps/themes/client/src/generated/design-tokens.json`](../themes/client/src/generated/design-tokens.json) — every `var(--rootsdk-*)` reference in this sample maps to a description in that file. Tints use `color-mix(in srgb, var(--rootsdk-X) 12%, transparent)` for backgrounds and 20% for borders.

The `client/src/lib/rootColorScheme.ts` bridge keeps `color-scheme` in sync with `rootClient.theme` so native form chrome (number-input spinners, scrollbars, `<select>` dropdowns) follows Root's theme. Implementation is the same as `apps/leveling-leaderboard/client/src/lib/rootColorScheme.ts` — copy verbatim.

### App-specific token roles

These are the few token-to-domain mappings worth calling out for this sample:

| Concern | Token via accent |
|---|---|
| Total actions / brand identity | `brand` → `--rootsdk-brand-primary` |
| Content filter / warning state | `warning` → `--rootsdk-warning` |
| Manual actions / kick / ban | `error` → `--rootsdk-error` |
| Spam detection / success state | `success` → `--rootsdk-brand-secondary` |
| Manual source tag / info | `info` → `--rootsdk-info` |

## Layout

### App shell

Sidebar + content layout. The Sidebar collapses below 960px; a MobileHeader takes its place with a focus-trapped drawer. Both surfaces render the same identity card and the same nav items (driven by `client/src/components/navItems.ts`).

```
desktop (≥960px):                               mobile (<960px):
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│ ▣ Moderation │ Dashboard             │        │ ▣ Moderation                    [≡]  │
│   Root App   │ Overview…             │        ├──────────────────────────────────────┤
├──────────────┼───────────────────────┤        │ Dashboard                            │
│ ⊞ Dashboard  │  StatCard StatCard…   │        │ Overview…                            │
│ ☰ Audit log  │                       │        │                                      │
│ ▟ Analytics  │  Monitored channels   │        │  StatCard                            │
│ ⚙ Settings   │  ┌──────────────────┐ │        │  StatCard                            │
│              │  │ # general …      │ │        │  StatCard                            │
│              │  └──────────────────┘ │        │                                      │
│              │  Recent activity…     │        │  Monitored channels…                 │
│              │                       │        │  Recent activity…                    │
│ v1.0.0       │                       │        │                                      │
└──────────────┴───────────────────────┘        └──────────────────────────────────────┘
                                                  Drawer (when ≡ tapped):
                                                ┌──────────────┐
                                                │ ▣ Moderation │
                                                │              │
                                                │ ⊞ Dashboard  │
                                                │ ☰ Audit log  │
                                                │ ▟ Analytics  │
                                                │ ⚙ Settings   │
                                                └──────────────┘
```

- `Sidebar` is 240px wide, sticky to the viewport. Header has the identity card; nav items render the active tab with `--rootsdk-highlight-normal` background; footer is an optional version label.
- `MobileHeader` renders the same identity card on the left and a hamburger toggle on the right. Drawer is a fixed overlay; `useFocusTrap` manages focus + body scroll lock + Escape close.
- View state is a single `useState<"dashboard" | "audit" | "analytics" | "settings">` in `App.tsx`. No router library.
- Admin-only nav items (`audit`, `settings`) are filtered through `visibleNavItems(amIAdmin)`; the shell also snaps non-admins out of admin-only tabs as defence in depth.

### Content widths

| View | Max width | Why |
|---|---|---|
| Dashboard | viewport (no cap) | StatCards row + recent-activity rows benefit from breathing room |
| Audit log | viewport (no cap), table has `min-width: 720px` with horizontal scroll on narrow | 7 columns need legibility |
| Analytics | viewport (no cap) | Side-by-side chart panels benefit from horizontal space |
| Settings | 720px centered | Forms; eye doesn't want to track across full viewport for "Enable rate limiting → toggle" |

This per-view width policy is documented because it's an active choice, not a Root convention. Copying the moderation shell into a new app should re-evaluate the cap per the new app's content shape.

## Responsive

Mobile-first. Every interactive element meets the 44×44 px touch-target minimum (Toggle, Button, Filter button, drawer toggle, nav items). Layouts adapt down to 320px without horizontal scroll, except for the audit log table (acceptable since it's admin-only).

| Width | Tier | Behavior |
|---|---|---|
| `< 640px` | Mobile | MobileHeader + drawer; Dashboard StatCards stack 1-up; Settings full-width; audit log table = horizontal-scroll |
| `640–959px` | Tablet | MobileHeader + drawer; Dashboard StatCards 2-up; Analytics chart panels stack |
| `≥ 960px` | Desktop | Sidebar (240px) + content; full layout as designed |

## Components

Hand-rolled in `client/src/components/`. One `.tsx` + one `.module.css` per component.

| Component | Purpose |
|---|---|
| `IconBox` | Tinted square wrapping any icon node; accent maps to a Root status token |
| `Badge` | Five-variant status pill (default, info, warning, error, success) sharing one CSS rule via `--tone` |
| `Pill` | Monospace `# channel-name` content chip |
| `Panel` | Header+body container; matches the canonical `panel` componentPattern |
| `StatCard` | Labelled metric tile with IconBox accent |
| `Sidebar` | Desktop nav (≥960px) |
| `MobileHeader` | Top bar + focus-trapped drawer (<960px) |
| `SubTabs` | Underline-style tab strip; generic over string \| number key types |
| `Select` | Native `<select>` styled per the `native-select` componentPattern |
| `MasterSubToggleGroup` | Master toggle row + indented sub-rows with left-border connector |
| `ShowWordListGate` | Show/Hide gate for sensitive content, with an explicit reveal button |
| `MonitoredChannelsPanel` | Wrapper Panel showing the monitored set as a Pill grid |
| `AutoSaveStatus` | Error-only inline pill for auto-save failures |
| `InlineConfirm` | Two-step confirm for low-stakes destructive actions |
| `TypeToConfirm` | High-friction phrase-typing confirm for irreversible bulk operations |
| `MemberActions` | Kick/Ban affordances for a target user; ban includes a Permanent/1d/7d/30d duration picker driving `BanMemberRequest.expiresAt` |
| `Button` | Variants: default, primary, danger, iconDanger |
| `TextInput` / `NumberInput` | Labeled inputs (lifted from `apps/leveling-leaderboard`) |
| `Loader` / `EmptyState` / `QueryError` | View-state primitives |
| `ErrorBoundary` | Root + per-view boundary; fires `ReportClientError` on every catch |

## State

| Scope | Storage |
|---|---|
| Current top-level tab | `useState<ModerationTab>` in `App.tsx` |
| Caller's `amIAdmin` | `AdminContext` (refetches on `AdminsChanged` broadcast) |
| Dashboard view data | `Dashboard` local state + `AuditLogAppended` broadcast → refetch |
| Audit log entries + filters + cursor | `AuditLog` local state. `AuditLogAppended` surfaces a "new activity — refresh" affordance rather than auto-prepending (auto-prepend would shift offsets mid-read) |
| Analytics range + bucket data | `Analytics` local state; `AuditLogAppended` triggers refetch for the active range |
| Settings snapshot | `Settings` local state; `SettingsChanged` broadcast → refetch |
| Per-field edit buffers (Settings) | Each `useFieldAutoSave` owns its own local state + debounced mutation. The hook syncs from server-authoritative state when no edit is in flight |
| Word list pages + per-row pending-confirm state | `WordListPanel` local state, keyed by stringified bigint id |
| MobileHeader drawer open/closed | Local to `MobileHeader` |

No query-cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` cleanup.

## RPCs

Defined in [`networking/src/moderation_service.proto`](networking/src/moderation_service.proto) and consumed via the generated client. Admin-gated RPCs throw `RootServerException(NOT_ADMIN)` when called by a non-admin (defence in depth — the client also gates the Settings/Audit views).

| RPC | Purpose | Admin-gated? |
|---|---|---|
| `GetDashboard` | Returns `{ summary, recent[], amIAdmin, monitoredChannelNames[], monitoringAll }` | No |
| `GetAnalytics(range)` | Returns totals + per-rule + per-bucket + top-channels for the requested range | No |
| `GetAmIAdmin` | Lightweight per-caller admin-flag refresh | No |
| `ReportClientError` | ErrorBoundary telemetry funnel; truncated + rate-limited server-side | No |
| `GetSettings` | Returns the full settings snapshot for the Settings view | Yes |
| `SetContentFilterEnabled` / `SetFilterSlurs` / `SetFilterProfanity` / `SetFilterCustomWords` / `SetContentFilterWarnUsers` | Per-field setters for the Content Filter tab | Yes |
| `SetSpamEnabled` / `SetSpamThreshold` / `SetSpamWindow` / `SetSpamScope` / `SetSpamWarnUsers` | Per-field setters for the Spam Control tab | Yes |
| `SetRateLimitEnabled` / `SetRateLimitMax` / `SetRateLimitWindow` | Per-field setters for the Rate Limiting tab | Yes |
| `SetRetentionDays` | Per-field setter for the General tab | Yes |
| `UpdateMonitoredChannels` | Replaces the full monitored set (one logical field — the list itself) | Yes |
| `ListWords` / `AddWord` / `SetWordEnabled` / `RemoveWord` | Word list CRUD | Yes |
| `ListAuditLog` | Paginated query with optional filters | Yes |
| `DeleteMessageManual` / `KickMember` / `BanMember` | Manual moderation actions; all flow through the audit dispatch funnel | Yes |

### Why per-field RPCs

Concurrent admin edits to different fields of the same settings group don't stomp each other because each field has its own RPC + its own atomic `dataStore.appData.update()` per-field merge. A single "update settings" RPC accepting a partial document would race: admin A clicks "Enable spam detection" while admin B clicks "Warn users" — both fetch the same baseline, both write back overlapping state, last-writer wins. Per-field RPCs sidestep the read-modify-write entirely.

The cost is RPC method count (15 settings setters in this sample). Acceptable for the consistency win; mirrors the per-field pattern in `apps/github-release-watcher`'s `RepoRow`.

## Broadcasts

Three event types with distinct audiences:

| Event | Audience | Triggered by | Payload (approx) |
|---|---|---|---|
| `SettingsChanged` | `adminAudience` MemberGroup (owner ∪ admins) | Any settings/word-list/monitored-channels mutation | Empty (clients refetch `GetSettings`) |
| `AuditLogAppended` | `"all"` | Any audit row write — automated rule hit OR manual delete/kick/ban | Empty (clients refetch the slice they care about: dashboard, audit log, analytics) |
| `AdminsChanged` | `"all"` | `globalSettings.general.admins` selection changed; community ownership transferred | Empty (clients refetch `GetAmIAdmin` to update their flag) |

### `adminAudience` MemberGroup — owner ∪ admins

The `SettingsChanged` audience is **not** the bare `globalSettings.general.admins` `ReadOnlyMemberGroup`. It's a server-managed `MemberGroup` named `adminAudience` that mirrors `globalSettings.general.admins ∪ ownerUserId`.

**Why the union matters.** The community owner is *implicitly* an admin via `adminCheck.isAdmin` (defence in depth — they can't lock themselves out of their own community), but they may not be explicitly listed in the `admins` selection. If we used the raw `admins` group as the audience, an owner driving Settings would write the field, broadcast `SettingsChanged` to admins-the-group, and **not receive their own broadcast** — their own Settings list would go stale until they manually refreshed. Since the owner is the most likely person to be running Settings in the early life of a community, this was a load-bearing edge case, not a corner one.

**Lifecycle.** Created (or fetched, if already present from a prior run) at `lifecycle.start` via `rootServer.memberGroups.getByName("adminAudience")`, with the userIds set to the union. Re-synced on:

- `globalSettings.update` events (admins selection changed)
- `CommunityEdited` events (owner changed — rare but real)

The sync is idempotent: read both inputs, compute the union, write the resulting userIds. Cheap enough to do unconditionally on every event.

If `getAdminAudience()` returns `undefined` during a transient startup window (`initializeAdminAudience` hasn't completed), `SettingsChanged` broadcasts skip silently — the only admin in that window is the owner, who is the one who just saved, so no other session needs to be told.

### `onAuditEntry` — single funnel for audit dispatch

Every path that writes an audit entry flows through one function, defined in [`server/src/auditDispatch.ts`](server/src/auditDispatch.ts):

```ts
let broadcastFn: AuditBroadcastFn | undefined;

export function setAuditBroadcaster(fn: AuditBroadcastFn): void {
  broadcastFn = fn;
}

export async function onAuditEntry(
  db: Database,
  fields: AppendInput,
): Promise<number> {
  const id = await appendAudit(db, fields);
  const fn = broadcastFn;
  if (fn) {
    await safeBroadcast("AuditLogAppended", () => fn());
  }
  return id;
}
```

Two patterns worth noticing:

- **Registration callback (not direct import)** breaks the dispatch ↔ service cycle. The service calls `setAuditBroadcaster(() => moderationService.notifyAuditLogAppended())` at startup. The dispatch module never imports the service. Forking agents copying this should preserve this shape — direct service imports re-introduce the cycle.
- **Local-capture-before-await** (`const fn = broadcastFn`) avoids non-null-assertion smell across the async boundary.

Six call sites flow through `onAuditEntry`: three rule paths in `messageHandler` (content filter, spam detection, rate limit) + three manual actions on `moderationService` (delete-message, kick, ban).

## RPC contract patterns

These are shape decisions any RPC that writes to persistent state and triggers downstream side effects should follow. The moderation app applies them consistently across every audit-writing call site.

### Per-field auto-save

For settings groups with multiple fields edited on the same UI, expose one RPC per field. The client's `useFieldAutoSave` hook (built on `useDebouncedMutation`) fires the RPC after a debounce when the field value changes. Combined with server-side `dataStore.appData.update()` for atomic per-field merges in KV, this means concurrent admin edits to different fields can never race.

### Validate-before-persist

For RPCs that store user-supplied values, validate before writing. `AddWord` checks word length + non-empty + parses + lowercases through `normalize()` before insert. Per-field setters with numeric ranges call `rangeError(value, lo, hi, message)` before writing — failure throws `ModerationError.INVALID_SETTINGS` with a user-facing message; the client surfaces it via `AutoSaveStatus`.

### Server-side bounds on every value the server schedules off

Every numeric setting the server schedules off (spam window, rate window, retention days) has both a floor *and* a ceiling. Client `NumberInput` `min`/`max` are UX, not enforcement — a scripted client sending `Number.MAX_SAFE_INTEGER` would otherwise saturate scheduling math.

### Audit on every state-modifying action

Every operation that affects community state — automated rule hit *or* manual admin action — writes an audit entry through `onAuditEntry`. This keeps the audit log a single source of truth for moderation activity, and means a future "all moderation actions, by hour, by rule" query is one SQL pass.

---

# Appendix: Behavior of this sample

This appendix mixes pattern teaching with pure domain content. Read accordingly:

- **Pattern teaching with moderation as the worked example** — generalizes to other apps. Sections: [How rules fire](#how-rules-fire), [How retention works](#how-retention-works).
- **Pure domain content** — what THIS app does, replaced wholesale on fork. Sections: [Overview](#overview), [Limits](#limits), [Copy strings](#copy-this-sample).

## Overview

Moderation is a community app that automatically deletes harmful content, detects repeat-message spam, and rate-limits message bursts, with a full audit log and analytics view. Admins configure rules through an in-app Settings page; community members see the resulting dashboard.

The app exists to teach the patterns of admin-managed app config, message-pipeline rules with central audit dispatch, and the canonical Root UI shell.

## How rules fire

Per-message moderation subscribes to **two** events: `ChannelMessageEvent.ChannelMessageCreated` (full pipeline) and `ChannelMessageEvent.ChannelMessageEdited` (inline rules only — content filter, URL filter, mention spam — since spam-detection + rate-limit observations already counted on creation, so re-evaluating them would double-penalize). Without the edit listener a user can post a clean message and edit it to violating content as a bypass. Edit-time hits get a leading `[edited] ` marker on the audit excerpt so admins can distinguish post-time vs edit-time violations. On every event:

1. **Skip system messages and non-Person senders.** `evt.messageType === MessageType.System` or `RootGuidConverter.toRootGuidType(evt.userId) !== RootGuidType.Person` → return early. This is the very first thing the handler does — without it, the moderation app would try to act on join/leave system messages and on other apps' broadcasts.
2. **Skip unmonitored channels.** Empty monitored set means "monitor all"; otherwise `monitoredChannels.has(channelId)` gates the rest.
3. **Run rules in order: new member gate → inline rules (content filter, URL filter, mention spam) → spam detection → rate limit.** First rule that fires wins; the message is deleted and an audit entry is written via `onAuditEntry`. Running every rule on every message would double-count metrics and produce duplicate audit entries. The content filter uses a **compiled-alternation regex** per word category (built once on word-list change in `wordListStore.getCompiledPattern`, cached alongside the row cache, invalidated on every mutation). Per-message content-filter cost is one `regex.exec()` per category — not a per-term loop. User-supplied custom words are escaped before compilation, so flat alternation has no regex-DoS surface. Content normalization runs **NFKC** before lowercasing + leet folding so full-width ("ｓｌｕｒ") and ligature ("ﬁ") evasions fold into their canonical equivalents — same path word-list entries take on add, so stored terms and message text agree. Homoglyph attacks across scripts (Cyrillic vs Latin) need a separate confusables map and are out of scope for the sample. (Forks upgrading from a pre-NFKC version: rows added before the change weren't NFKC'd; if your custom list contains compatibility characters, re-add them. ASCII entries — the typical case — are unaffected since NFKC is a no-op on plain ASCII.)
4. **Optionally post a public warning** — content filter and spam detection support a `warnUsers` toggle that posts a generic "a message was removed" notice in the channel, addressed to the violating user via Root's user-mention markup (`[@nickname](root://user/<id>)`, per [api-samples/server-messages/src/mentions.ts](../../api-samples/server-messages/src/mentions.ts)) so the user gets a notification. Best-effort; failure to post the warning doesn't undo the deletion. Warning posts are debounced per `(userId, channelId)` pair via [`server/src/warningCooldown.ts`](server/src/warningCooldown.ts) (10-minute window) so one rapidly-violating user can't flood the channel with notices — the audit log still records every violation.

Hot-path discipline: cached settings reads, in-memory channel name + word lists, the only SDK calls are the actual delete and (optionally) the warning post — both gated behind a rule match.

### Audit log nicknames

Every audit row freezes a `targetNickname` at write time — what the user was called in the community when this row was written. Resolution goes through [`server/src/memberCache.ts`](server/src/memberCache.ts) which wraps `rootServer.community.communityMembers.get({ userId }).nickname` (the canonical pattern, mirrored from [api-samples/server-members](../../api-samples/server-members) and [apps/tic-tac-toe/server/src/utilities.ts](../tic-tac-toe/server/src/utilities.ts) → `getNickname`). A 60-second TTL cache + `UserSetProfile`-event eviction collapses spam-burst lookups.

**"Nickname is username."** In Root's product vocabulary, what users see in chat IS the username — even though the server SDK type calls it `CommunityMember.nickname` (the field is per-community customizable). The proto field, DB column, and resolver in code use `nickname` to teach the SDK API correctly; the user-facing UI copy says "Username" to match what admins recognize.

**Why not the global username?** The SDK exposes the global username only via `UserSetProfileEvent` broadcasts — there is no `users.get` / `getUserByUsername` lookup, so an index built from those events would be incomplete on bootstrap (any user who hasn't triggered a profile event since app install wouldn't be in the index). Nickname is the SDK-supported, in-chat-visible name — it's the right resolver target for an audit log.

**Frozen-at-write semantics.** A user later renaming themselves to "InnocentMember" still shows as "BadActor99" on historical rows, and a substring search for "BadActor99" finds those historical actions. This is the expected audit-log behavior: rows are evidence of what happened, including who-they-were-called at the time.

**Filter shape.** [`auditLogStore.list`](server/src/auditLogStore.ts) filters via `lower(target_nickname) LIKE ?` against persisted nicknames. Case-insensitive substring; the trim happens server-side so a whitespace-only filter doesn't produce a useless `LIKE '%   %'` pattern. There's no index on `target_nickname` — at sample scale (low thousands of rows) the scan is fine; a forking deployment with tens of thousands of rows + frequent filter use should consider a SQLite FTS5 virtual table next to `audit_log` and route the LIKE through it.

**Cold-start trade-off.** [`memberCache`](server/src/memberCache.ts) is lazy: the first audit write for each unique user pays an SDK round-trip after the message delete (the delete itself is unblocked). Priming via `communityMembers.listAll()` at startup would shift that cost to startup but make it potentially expensive for large communities. We pick lazy because moderation events are a minority of messages, the audit write isn't on the deletion critical path, and a lazy cache stays cheap to copy into a fork that doesn't need the priming step.

**Memory-bounding.** The cache has an LRU cap (5,000 entries) and a periodic sweeper (5-minute interval) that drops expired entries. Without these a long-running app moderating many distinct users would accumulate entries forever — small but unbounded growth is an antipattern for forks.

### Exempt members

Between step 2 (channel gate) and step 3 (rule pipeline), the handler short-circuits if `await isExempt(evt.userId)` returns `true`. The exempt set is the `globalSettings.general.exempt` `roleOrMember` picker — a `ReadOnlyMemberGroup` resolved by the platform from the admin's selection of users + roles.

Two design choices worth flagging for forks:

- **Why a manifest picker, not an in-app setting.** Exemption is fundamentally a permissioning decision, and Root's native role/member picker is purpose-built for it (search, role mention chips, multi-select). Reimplementing one in-app would teach the wrong pattern.
- **Why exemption sits before *every* rule, not per-rule.** A trusted moderator who happens to type a profanity-flagged word in a fast-moving discussion shouldn't have their message deleted *and* simultaneously be marked as the spam-detection trigger for a follow-up duplicate. Exemption is a single gate at the top of the pipeline; manual admin actions (kick/ban/delete-message) are unaffected since those run server-side from the audit log, not through the message handler.

`exemptMembers.ts` is intentionally simpler than `adminAudience.ts`: there's no parallel managed `MemberGroup` because the exempt selection has only one source (the picker). The platform's `ReadOnlyMemberGroup` is already the materialization — `.isMember(userId)` is sub-ms in practice (membership cached locally on the runtime).

The General Settings tab renders the current exempt selection as a read-only Pill list so admins don't have to context-switch to Root's native Settings to confirm what's configured. Editing still happens in the native picker.

## Per-user infraction history

Each audit-log row carrying a `targetUserId` has an expand chevron. Click → the row reveals a summary of *that user's* full audit history: total events, per-rule breakdown chips, first/last event dates. The pattern lets a mod triaging "is this a repeat offender?" pivot from any audit context without re-filtering.

**State shape**: `Set<string>` of expanded row IDs (multi-expand allowed — admins occasionally compare two users' histories side by side).

**Per-user cache**: `useRef<Map<userId, MemberSummary>>` so multiple rows for the same user share one fetch, and re-expanding the same user is instant. Cache is keyed on userId, not row ID — that's what makes the share-across-rows work. Cleared in the `AuditLogAppended` listener so a fresh moderation event invalidates any displayed counts.

**Rendering**: table mode renders the summary as a separate `<tr>` with `colSpan` covering all columns; card mode (mobile) renders it inside the card below the existing content with a top-border separator. Same `MemberSummaryView` component for both — the layout differs but the data + chip rendering is shared.

**Server query**: [`auditLogStore.memberSummary`](server/src/auditLogStore.ts) does one `GROUP BY rule` query plus one nickname lookup. Excludes `RuleType.UNSPECIFIED` rows so internal-failure noise doesn't inflate user infraction counts (same rule the dashboard `countSince` follows).

**Edge cases**:
- Rows without `targetUserId` (CLEAR_AUDIT_LOG, rule-pipeline-error rows where the user isn't the subject) get no chevron — nothing to drill into.
- A user with no audit history (just attached but never moderated) gets a "No prior moderation events" empty state.
- Admin-only — the AuditLog view is already gated on `amIAdmin`, so the per-user summary inherits that.

## Banned members

Bans are surfaced through two distinct surfaces — and the split is the lesson:

- **Audit log**: event history. "User X was banned at T1, unbanned at T2, banned again at T3" → three rows, in time order.
- **Banned members panel** ([`client/src/components/BannedMembersPanel.tsx`](client/src/components/BannedMembersPanel.tsx)): current state. "User X is banned right now, expires in 5 days."

Two views, two mental models. An admin asking "what happened?" reaches for the audit log; an admin asking "who's currently banned, and should I lift any?" reaches for the panel. Mixing these — putting an Unban button on every audit-log row that mentions a target — looks lightweight at sample scale but breaks at production scale: most rows' target users aren't *currently* banned, so 95% of clicks would be no-ops, and three destructive-looking buttons per row creates visual noise on busy logs. State views complement event views; they don't replace them.

The panel calls `rootServer.community.communityMemberBans.list()` per fetch (no caching) because ban state changes through both our mutations *and* the platform's auto-expiry of temp bans — a stale cache would routinely show lifted bans. Refresh fires on `AuditLogAppended` broadcasts (every kick/ban/unban writes an audit row, so that signal covers our mutations); SDK auto-expiry doesn't fire `AuditLogAppended`, so a temp ban that just expired might linger in the panel until the next manual refresh or unrelated audit event. Acceptable lag for a state-review surface.

`UnbanMember` mirrors `BanMember`'s shape: `requireAdmin` → `requireManualActionAllowance` → `communityMemberBans.delete()` wrapped in `moderationSdkQueue` → audit row with `ActionType.UNBAN_MEMBER`. NotFound from the SDK (race with auto-expiry, or admin clicking a stale row) surfaces as `INVALID_TARGET` with a "not currently banned" message; no audit row is written for the no-op.

## Reason field on manual actions

Every manual moderation RPC (`DeleteMessageManual`, `KickMember`, `BanMember`, `UnbanMember`) accepts an optional `reason` string. Surfaced in the UI via [`InlineConfirm`](client/src/components/InlineConfirm.tsx)'s `collectReason` prop — when set, the confirm prompt grows a textarea between the message and the action buttons. The typed text flows into `onCommit`'s argument, which the caller passes to the RPC.

**Optional, not required.** Most spam-troll bans are obvious from context; forcing text leads to "spam" / "x" / "no" placeholders that fill the field but add nothing. The textarea is prominent (it's the visual thing to do before clicking commit) but skippable. Admins who care about audit-log readability six months later will type; admins handling routine spam won't.

**Storage**: the reason flows into the audit row's `messageExcerpt` column — the same field that carries content-filter matched content and clear-audit-log row counts. No new schema.

**Validation**: server enforces a 500-char cap via `validateReason()` (helper in `moderationService.ts`). The client textarea has the same `maxLength`, but the server validates regardless — defence against malformed or out-of-band callers. Over-cap throws `INVALID_SETTINGS`.

**Audit row excerpt format** varies by action:
- `DeleteMessageManual`: `<message content>\n[reason: <text>]` when reason given; just message content otherwise.
- `KickMember` / `UnbanMember`: bare reason text (or empty).
- `BanMember`: reason + `[expires <iso>]` suffix when temp-ban; reason alone for permanent.

The `InlineConfirm.collectReason` prop is opt-in so existing call sites that don't need it (e.g., `WordListPanel`'s remove-word confirm) stay simple. The handler signature accepts a `reason: string` argument; existing callers with no-arg handlers work unchanged because functions with fewer parameters are assignable to functions with more.

## Confirmation tiers

Two destructive-action confirmation patterns live in this sample, picked by consequence class:

| Tier | Component | Use for | Examples in this app |
|---|---|---|---|
| Two-click inline | `InlineConfirm` | Well-bounded actions where the worst case is recoverable or scoped to a single item | Word delete, kick, single-message delete, ban (per-user, even with expiry) |
| Type-the-phrase | `TypeToConfirm` | Irreversible bulk operations affecting many rows or users at once | "Clear audit log" in the General Settings Danger zone |

The split matters because confirm fatigue is real: every action gated behind a heavy confirm trains users to dismiss confirms reflexively. Reserving `TypeToConfirm` for a small number of bulk-irreversible cases keeps the gate's weight meaningful. The server independently validates the typed phrase on the corresponding RPC (`ClearAuditLog` rejects non-matching `confirmation_phrase` with `INVALID_SETTINGS`), so a misbehaving client or a direct RPC caller can't bypass the gate.

## Temp-banning members

`BanMemberRequest.expires_at` (ms epoch) surfaces the SDK's `communityMemberBans.create({ expiresAt })` capability. The `MemberActions` ban flow exposes four canned durations — Permanent (default), 1 day, 7 days, 30 days — and computes the absolute timestamp client-side. Custom dates are deliberately deferred: a date picker would be a meaningful UI surface increase for a relatively rare admin choice.

The SDK lifts the ban automatically when the timestamp passes — no app-side scheduled job. The audit entry records the absolute expiry time in the excerpt so admins reading the log later see how long the ban was for, not just that one was issued.

Server-side validation rejects `expires_at` values in the past with `INVALID_SETTINGS` (almost certainly client-clock skew or a malformed request — would otherwise produce an instantly-lifted ban, worse UX than failing fast). The current four-option picker (1d / 7d / 30d) gives network latency multiple orders of magnitude of headroom, so the `expiresAtMs <= Date.now()` check is exact-now. A future custom-duration picker that allowed sub-minute bans should swap the check for a small grace window (e.g. `expiresAtMs <= Date.now() + 5_000`) to absorb round-trip latency.

## New member gate

The cheapest possible rule: integer compare against `CommunityMember.joinedAt` (community-join time, ms epoch). Off by default; when enabled, messages from members whose `joinedAt` is more recent than `minMinutes` ago are deleted before any content matching runs. Catches drive-by spam ("just joined and immediately spammed") without paying for content normalization or regex matching.

**Pipeline order**: first rule check after the exempt short-circuit. Cheapest = runs first; spammers get stopped before we touch the matchers.

**Edits don't re-check.** A member who posted within the gate window had their original message deleted; the edit event won't fire for a non-existent message. A member who posted *outside* the window and edits later is, by definition, older than the gate now — re-checking is busywork.

**`joinedAt` is community-age, not Root-account-age.** The DevKit SDK doesn't expose Root account-creation time; it does expose `CommunityMember.joinedAt` via `communityMembers.get`. That's the more useful signal anyway: a fresh Root account that's been a trusted member of *this* community for a year shouldn't be gated; an established Root user who just joined to spam should be.

**Cache strategy**: `joinedAt` joins `nickname` in the unified [`memberCache`](server/src/memberCache.ts). One SDK call per resolve populates both — a moderation-event burst that does both an age check and an audit-write nickname pulls one round-trip total. `joinedAt` is effectively immutable per-member-per-community, so the 60-second TTL doesn't matter for it (refetches return the same value); the TTL is sized for the nickname use case.

**Fail-open on missing data.** If `communityMembers.get` doesn't return a `joinedAt` (the SDK type marks it optional) or the call fails, the gate skips — treat as "old enough." The alternative gates legitimate users on platform metadata gaps and produces false positives that are hard to debug.

**Range**: 1–10080 minutes (1 minute to 7 days). Default 5 minutes — catches the most aggressive drive-by spam without a long-feeling delay for the legitimate just-joined case.

## Mention spam

Caps user + role mentions per message. Stateless — each message is judged on its own count, no per-user windowing. Catches `@everyone`-style pile-on spam without needing rate-limit state.

**Counts come from `ChannelMessage.referenceMaps`**, not a regex over `messageContent`. The platform already resolves mention markup to a `users[]` + `roles[]` array on the event; we sum the two lengths and compare against the threshold. Two consequences worth noting for forks:

- **Copy-paste of mention markup that doesn't resolve doesn't count.** A user pasting `[@someone](root://user/<id>)` text from another channel without a real underlying mention shows up in `messageContent` but not in `referenceMaps.users`. The rule matches what the chat client renders as a live mention, which is the right signal — unresolved markup doesn't notify anyone.
- **`@everyone` and `@here` register as roles.** They land in `referenceMaps.roles` like any other role mention, so a single `@everyone` counts as one mention. Mention spam is a *quantity* rule; for "this community doesn't allow `@everyone` at all" use Root's native role permissions to gate the role itself.

**Channel mentions are not counted.** They don't notify members and aren't a pile-on vector.

**Pipeline placement**: inline rule alongside content filter and URL filter. Re-runs on edits — a clean message edited to add 30 mentions is the same evasion shape as a clean message edited to a slur.

**Range**: 1–50 mentions. Default 10 — generous enough for legitimate "thanks @a @b @c..." rollups, tight enough that an `@everyone` + 10 specific users pile-on trips it.

## URL filter

Messages containing URLs get checked against an admin-managed domain list. Lives in [`server/src/urlFilter.ts`](server/src/urlFilter.ts) and slots into the rule pipeline between content filter and spam detection.

**Two extraction sources, one matcher**:
- `messageUris[]` — the platform's parsed URI list. Filtered to `http(s)` only so attachment URIs (asset:// etc.) don't get checked against domain rules they were never meant to cover.
- `messageContent` text regex — catches plain-text URLs ("check out evil.com") that the platform didn't auto-detect. A real evasion vector if we relied only on `messageUris`.

Both sources contribute candidates; we dedupe by URL string and run each through `new URL()` for canonical hostname extraction. Malformed candidates (the text regex sometimes pulls trailing punctuation) silently drop.

**Hostname suffix matching**: a domain entry "evil.com" matches both "evil.com" and "*.evil.com" — admins expect entering the parent domain to cover the subtree. Implementation: `hostname === entry || hostname.endsWith("." + entry)`. Compared to compiled-alternation regex (used by content filter), this is a per-URL × per-entry walk; the lists are bounded enough that it's not worth the regex compile.

**Two modes**:
- BLOCKLIST — messages with any listed domain → deleted. Permissive default.
- ALLOWLIST — messages with non-listed domains → deleted. The high-trust mode for serious deployments. An empty allowlist blocks every URL — that's the documented trade-off.

**Root invite links** — independent toggle that fires whenever the URL points at `rootapp.gg/<code>` (single-path-segment shape). The DevKit SDK doesn't expose the community invite namespace, so we can't distinguish "this community's invite" from "another community's invite" — the toggle is binary "block all Root invite links." Useful for communities that don't want members posting links to *other* communities (a real spam vector); the trade-off is they can't repost their own invite either.

**Storage shape**: domains live in the same `words` SQLite table as custom + allowed lists, distinguished by `WordCategory.URL_DOMAIN`. The admin-managed shape is identical (add / remove / toggle / search / paginate / bulk-import), so the existing `WordListPanel` component handles it directly. The matcher reads through `getEnabledWords(WordCategory.URL_DOMAIN)`. Per-category normalization differs: word categories use the content-filter `normalize()` (strips non-alphanum); URL_DOMAIN uses [`normalizeDomain()`](server/src/urlFilter.ts) (preserves dots + hyphens, strips protocol/path/leading-www, validates hostname shape).

**Edits re-scan**: same logic as content filter — the URL filter runs again on `ChannelMessageEdited` because "post clean message, edit to evil link" is the same evasion shape.

## Username filter

Members whose nicknames match the same content-filter compiled regex (slurs / profanity / custom + allowed-words cancellation) get banned automatically. Lives in [`server/src/usernameFilter.ts`](server/src/usernameFilter.ts) and runs off two `CommunityMemberEvent` subscriptions:

- **`UserSetProfile`** — fires when a global username changes; the per-community nickname often updates alongside, so we re-fetch + check.
- **`CommunityMemberAttach`** — fires when a member opens the community; catches a violating nickname picked up at first attach (e.g. a newly-joined member with a slur as their nickname).

The matcher reads `CommunityMember.nickname` via the same `memberCache.resolveNickname` the audit-write path uses — so the audit row's `targetNickname` matches what triggered the rule. The action is always BAN with an audit row `RuleType.USERNAME_FILTER`. Exempt members bypass via `isExempt(userId)` — exempt is a single trust boundary across all rules.

The first-party Moderation app shipped a "ban or flag" configurable, but flag wasn't UI-surfaced. We keep the action surface narrow (ban only). A forking agent who wants an audit-only tier can extend `UsernameFilterSettings` and the action branch in `evaluateUser`.

Off by default — banning members on a name match is high-impact and should be opted into deliberately. Especially relevant if the custom word list is broad: a curation pass before enabling is the canonical workflow.

## Bulk word import

Admins migrating a list from another moderation tool paste it into the textarea on each Word list panel; one RPC call inserts everything. [`server/src/wordListStore.ts → importWords`](server/src/wordListStore.ts) splits each input on commas + newlines (so pasting a CSV or a newline-list both work), normalizes, dedupes within the input, queries existing rows in one batched `IN (...)` SELECT, and INSERTs the new ones inside a single transaction so a partial failure rolls back. The compiled-regex pattern cache invalidates exactly once at the end — recompiling per-row would be wasteful for a 200-word import. Server-side bounds: max 1000 entries per call (rejected with `INVALID_WORD` if exceeded); per-entry max length comes from the same `WORD_MAX_LENGTH` constant the single-add path uses. Returns `{added, duplicates, invalid}` so the UI can surface "Added 47, 3 duplicates, 2 invalid".

## SDK call rate-limit queue

Every outbound SDK call that mutates platform state — `channelMessages.delete`, `channelMessages.create`, `communityMemberBans.{create,kick}` — routes through a shared token-bucket queue at [`server/src/lib/sdkQueue.ts`](server/src/lib/sdkQueue.ts). The Root SDK enforces a per-app command quota (~5/s for state-mutating calls); a spam burst from one user can drive 20+ deletions in seconds, which without backpressure would land faster than the SDK accepts and fail with throttling errors.

The queue smooths bursts: capacity 5, refill 5/s. A token-bucket fills lazily on each enqueue (no background timer), so a quiet stretch refills the full burst capacity. When tokens are exhausted, calls queue with a Promise resolver and a short timer drains them as tokens become available. Bounded queue size (default 100) drops the oldest waiting call if a runaway producer somehow exceeds the cap — a safety valve, not a normal-operation path.

**Why one shared queue, not per-call-type buckets**: a moderation event commonly fires delete + warning-post + (rarely) ban-create in rapid succession. Sharing the bucket means the burst throttles fairly across all three traffic types instead of each fighting for its own quota. The pattern is intentionally inline (~90 lines) rather than an opaque dependency — forks copy what they see, so the readable implementation is more transferable than the import.

## How retention works

`server/src/main.ts` schedules a `JobInterval.Daily` job tagged `daily-cleanup` at startup. The job is idempotent: `deleteByTag` then `create`, so frequent restarts don't push the firing forever. `JobScheduleEvent.Job` fires on schedule; `JobScheduleEvent.JobMissed` catches up after downtime.

`runCleanup`:
1. Reads current `retentionDays` from settings.
2. Prunes audit log rows older than `now - retentionDays * 24h`.
3. Prunes spam observations older than `2 × spam.windowMinutes`.
4. Prunes rate observations older than `2 × rate.windowSeconds`.

The 2× headroom on detector prunes ensures a row inside the active detection window is never dropped; the detectors themselves do an inline COUNT of recent rows on every message and rely on the periodic prune to bound table size.

## Limits

| Item | Limit |
|---|---|
| Spam threshold | 2–100 (server-enforced) |
| Spam window | 1–1440 minutes (server-enforced) |
| Rate-limit max messages | 3–50 (server-enforced) |
| Rate-limit window | 5–120 seconds (server-enforced) |
| Retention | 7–365 days (server-enforced) |
| Custom word length | 100 characters (server-enforced) |
| Audit log page size | 25 default, 100 max |
| Word list page size | 50 |
| Dashboard recent count | 20 |

## Copy (this sample)

**Sidebar/MobileHeader nav:** **Dashboard**, **Audit log**, **Analytics**, **Settings**.

**Dashboard StatCards:** **Total actions** / **Content filtered** / **Manual actions**, all subtle "Last 24 hours" or similar.

**Audit log filter button:** **Filters** (with a brand-primary dot indicator when filters are active).

**Analytics range tabs:** **Last 24 hours** / **Last 7 days** / **Last 30 days**.

**Settings sub-tabs:** **General** / **Content filter** / **Spam control** / **Rate limiting** / **Monitored channels**.

**ShowWordListGate hint:** *Word list is hidden because it may contain offensive content. Click "Show word list" to view and manage words.*

**InlineConfirm prompts:**
- Word delete: *Remove "{word}" from the word list?* — commit label: **Remove**
- Kick: *Kick {username} from the community? They can rejoin via invite.* — commit label: **Kick**
- Ban: *Ban {username} from the community? Past behavior is recorded; they cannot rejoin without an unban.* — commit label: **Ban**

**MemberActions buttons:** **Kick** / **Ban** at rest, both styled `--rootsdk-text-secondary` until hovered (then `--rootsdk-error`).

**Empty states:**
- Dashboard recent activity (no entries): **No moderation actions yet** — *When a rule fires or an admin takes a manual action, it'll show up here.*
- Audit log (no filter matches): **No matching entries** — *Try clearing or relaxing the filters above.* / *When the moderation pipeline acts on a message, an entry shows up here.*
- Analytics "Actions over time": **No trend data yet** — *Once moderation actions are recorded, the time series shows up here.*
- Analytics "Rule breakdown": **No rule data yet** — *A breakdown by rule will appear after the first action.*
- Analytics "Top channels": **No channel data yet** — *When messages are filtered or removed, the busiest channels list here.*
