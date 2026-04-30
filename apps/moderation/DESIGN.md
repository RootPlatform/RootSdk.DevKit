# Design

Implementation patterns for the moderation sample, plus an appendix at the end documenting this specific app's behavior. **If you're forking this sample, start with [Adopting this sample](#adopting-this-sample) to know what to copy verbatim, what to adapt, and what to replace.**

For Root-wide visual conventions (colors, spacing, radii, typography, shadows, transitions, base component patterns), follow [`apps/themes/client/src/generated/design-tokens.json`](../themes/client/src/generated/design-tokens.json) — this doc inherits all defaults from there and only calls out what's specific to this app. For shared infrastructure patterns (auto-save chrome, retry helpers, ErrorBoundary funnel), also read [`apps/leveling-leaderboard/DESIGN.md`](../leveling-leaderboard/DESIGN.md) and [`apps/github-release-watcher/DESIGN.md`](../github-release-watcher/DESIGN.md).

## Adopting this sample

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
| `MemberActions` — Kick/Ban affordances scoped to a target user; gated through InlineConfirm | `client/src/components/MemberActions.{tsx,module.css}` |
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
| `MemberActions` | Kick/Ban affordances for a target user; gated through InlineConfirm |
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

Per-message moderation uses `ChannelMessageEvent.ChannelMessageCreated`. On every event:

1. **Skip system messages and non-Person senders.** `evt.messageType === MessageType.System` or `RootGuidConverter.toRootGuidType(evt.userId) !== RootGuidType.Person` → return early. This is the very first thing the handler does — without it, the moderation app would try to act on join/leave system messages and on other apps' broadcasts.
2. **Skip unmonitored channels.** Empty monitored set means "monitor all"; otherwise `monitoredChannels.has(channelId)` gates the rest.
3. **Run rules in order: content filter → spam detection → rate limit.** First rule that fires wins; the message is deleted and an audit entry is written via `onAuditEntry`. Running every rule on every message would double-count metrics and produce duplicate audit entries.
4. **Optionally post a public warning** — content filter and spam detection support a `warnUsers` toggle that posts a generic "a message was removed" notice in the channel. Best-effort; failure to post the warning doesn't undo the deletion.

Hot-path discipline: cached settings reads, in-memory channel name + word lists, the only SDK calls are the actual delete and (optionally) the warning post — both gated behind a rule match.

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
