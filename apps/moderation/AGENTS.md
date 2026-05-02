---
kind: sample-app
description: Automatic content filter + spam detection + rate limiting with audit log, analytics, and admin Settings
complexity: complex
key_patterns:
  - message-pipeline rule order with central audit dispatch funnel
  - atomic per-field KV settings via `dataStore.appData.update()`
  - custom `adminAudience` MemberGroup (owner ∪ admins)
  - Sidebar + drawer responsive shell
  - "`MasterSubToggleGroup` and `ShowWordListGate` UX primitives"
  - "`lucide-react` icons"
permissions:
  - community.fullControl
---

# moderation

Automatic content filter, spam detection, and rate limiting for a Root community, with a full audit log, analytics view, and admin Settings. Triggers run server-side on every channel message; admins can also take manual kick/ban/delete actions from the dashboard or audit log.

This sample teaches three families of patterns: server-side moderation pipelines (rule order, audit dispatch funnel, retention), admin-gated app-managed config with per-field auto-save, and the canonical Root UI shell (Sidebar+drawer, Panel, StatCard, Badge variants, IconBox tints). It is the canonical reference for the responsive shell and for the design-system components (`Badge`, `IconBox`, `Panel`, `StatCard`, `Pill`) and UX primitives (`MasterSubToggleGroup`, `ShowWordListGate`, `InlineConfirm`, `TypeToConfirm`, `MemberActions`) that other Root apps may consume.

> **Standard Root app fork procedure and shared lib helpers** are in [../AGENTS.md](../AGENTS.md). What follows is specific to forking *this* sample.

## Demonstrates

*Server-side moderation*
- **Message-pipeline rule order** — `ChannelMessageCreated` AND `ChannelMessageEdited` events → system/non-Person filter → monitored-channel filter → exempt-members short-circuit → new-member gate → inline rules (content filter, URL filter, mention spam) → spam detection → rate limit. First match wins. Edits run only the inline rules (spam + rate-limit observations already counted on creation, so re-evaluating would double-penalize); edit-time hits get a leading `[edited] ` marker on the audit excerpt so admins can distinguish post-time vs edit-time violations.
- **Compiled-alternation regex matchers** — slur, profanity, custom, and allowed lists each compile to a single `RegExp` cached alongside the row cache; per-message work is one `regex.exec()` per category, not a per-term loop. User-supplied custom words are escaped → no regex-DoS surface.
- **Built-in slur/profanity lists + admin-managed custom list + allowed-words exception list** — NFKC normalization + leet-fold handles "l33t", full-width ("ｓｌｕｒ"), ligature ("ﬁ"), etc; allowed words cancel matches at the same span. Stored terms are normalized through the same path so they agree with normalized message text.
- **Username filter** — same matchers run against community nicknames on `UserSetProfile` + `CommunityMemberAttach` with per-user dedup; nickname match → ban.
- **URL filter** — admin-managed domain list with BLOCKLIST + ALLOWLIST modes plus an independent Root-invite toggle; canonical hostname extraction with suffix matching (`evil.com` covers `*.evil.com`).
- **Mention spam** — stateless per-message cap on user + role mentions counted from `ChannelMessage.referenceMaps` (so unresolved markup doesn't count, and `@everyone`/`@here` register as one role mention each).
- **New member gate** — cheapest rule, integer compare against `CommunityMember.joinedAt`; runs before any matchers so drive-by spam pays nothing for content normalization.
- **Frozen-at-write nicknames** — every audit row freezes `targetNickname` + `actorNickname` at the moment of action via a TTL-cached `communityMembers.get` resolver; the audit log's "Username" filter + display work without per-row SDK lookups at read time.
- **Per-message moderation actions audited through one funnel** — every audit entry (automated rule hit + manual delete/kick/ban + clear-audit-log trailer) flows through `auditDispatch.onAuditEntry`, which atomically inserts and broadcasts.
- **Outbound-SDK call rate-limit queue** — token-bucket throttler around `channelMessages.delete/create` and `communityMemberBans.create/kick` so bursts don't blow through the platform's command quota.
- **Rule-failure visibility** — exceptions thrown mid-pipeline get captured into a placeholder audit row (`RuleType.UNSPECIFIED`, action "rule error") so admins see the failure in the log instead of silent message-stays-up.
- **Daily retention prune via `JobInterval.Daily`** — cleans up audit log + sliding-window detector buffers; idempotent reschedule on startup; `JobMissed` catches up after downtime.

*Admin gating + broadcasts*
- **Custom `MemberGroup` for the admin broadcast audience** mirroring `admins ∪ owner` — required so an owner driving Settings receives their own `SettingsChanged` updates even when not in the picker. Re-synced on `globalSettings.update` and `CommunityEdited`.
- **Exempt members picker** — second `globalSettings` `roleOrMember` group; matched members bypass every automated rule (manual admin actions are unaffected). Watcher fires `SettingsChanged` when the picker moves so the in-app General tab refreshes without a manual reload.
- **Public/admin broadcast split** — `SettingsChanged` (admin-audience) vs `AuditLogAppended` and `AdminsChanged` (public, payload-free).

*RPC contract patterns*
- **Per-field auto-save with separate per-field RPCs** (~16 settings setters) so concurrent admin edits to different fields don't coalesce into payloads that re-stomp unrelated state.
- **Atomic per-field writes via `dataStore.appData.update()`** — read-modify-write race closed at the KV layer.
- **Bulk write with `INSERT OR IGNORE` + per-row `runWithChanges`** — `wordListStore.importWords`. Race-safe under concurrent overlapping imports; the unique-index conflict is silently absorbed and the duplicate count derives from the `changes` value rather than a pre-SELECT diff.
- **Server-side bounds on every value the server stores or schedules off** — client `NumberInput` `min`/`max` are UX, not enforcement. Bulk-import paths cap both array length AND post-split candidate count.
- **Centralized dispatch funnel** (`auditDispatch.onAuditEntry`) decoupled from the service via a registration callback to avoid circular imports.
- **`RootServerException` with structured proto-defined error codes** — `ModerationError.{NOT_ADMIN, INVALID_SETTINGS, INVALID_WORD, NOT_FOUND, INVALID_TARGET}`.

*Settings UX*
- **Master-toggle + indented sub-toggle pattern** — `MasterSubToggleGroup` connects dependent rows under a master via a 2px left border.
- **Show/Hide gate for sensitive content** — the custom-words list is hidden by default behind `ShowWordListGate` so an admin's screen doesn't display offensive content just because they opened Settings.
- **Two-tier destructive confirms** — `InlineConfirm` (two-click) for low-stakes recoverable actions (kick, ban, word delete) and `TypeToConfirm` (type-the-phrase) for irreversible bulk operations (Clear audit log). Destructive icon-buttons are red at rest.
- **Bulk word import** — paste a CSV or newline-list into a textarea; one RPC inserts everything with a result toast (`Added 47, 3 duplicates, 2 invalid`).
- **Temp ban with auto-expiry** — `MemberActions` ban surfaces a Permanent / 1d / 7d / 30d picker; the SDK lifts non-permanent bans automatically when the timestamp passes.
- **Reason field on manual actions** — `DeleteMessageManual`, `KickMember`, `BanMember`, `UnbanMember` accept an optional `reason` collected through `InlineConfirm`'s `collectReason` prop.
- **Warning post cooldown + @mention markup** — public warnings are debounced per `(userId, channelId)` for 10 minutes (one rapidly-violating user can't flood the channel) and use `[@nickname](root://user/<id>)` markup so the warned user gets a notification.

*UI shell + visual primitives*
- **Sidebar (≥960px) + MobileHeader/drawer (<960px)** with shared `navItems` config so the two surfaces can never drift. Drawer has a focus trap, body-scroll lock, and Escape close (`useFocusTrap`).
- **Audit log: responsive table + card variant** — `≥640px` renders a 7-column table; `<640px` renders a stacked-card list of the same data. CSS-gated; no horizontal scroll on mobile.
- **Per-user infraction history** — every audit row carrying a `targetUserId` has an expand chevron revealing that user's totals + per-rule breakdown chips + first/last event dates.
- **Banned members panel** — current-state view ("who's banned right now, expires in N days") complementing the audit log's event-history view.
- **Root design tokens only** — every color is a `var(--rootsdk-*)` reference; tints via `color-mix` at 12%/20% opacity.
- **Canonical Switch, Select, IconBox, Badge, Pill, Panel, StatCard** — all derived from `apps/themes/.../design-tokens.json` componentPatterns.

## Does NOT demonstrate

- Per-channel posting / messaging surfaces — see [`api-samples/server-messages`](../../api-samples/server-messages).
- File or asset handling — see [`api-samples/client-app-assets`](../../api-samples/client-app-assets) and [`api-samples/server-files`](../../api-samples/server-files).
- Strike escalation / warning ladder — out of scope for this sample.
- Custom ban duration picker — only the four canned durations (Permanent / 1d / 7d / 30d). Custom dates would be a meaningful UI surface increase for a relatively rare admin choice.
- Username history index — the SDK exposes the global username only via `UserSetProfileEvent` broadcasts, with no `users.get` lookup, so an event-built index would be incomplete on bootstrap. The audit log resolves community nicknames instead.
- Homoglyph normalization across scripts (Cyrillic vs Latin) — needs a separate confusables map and is out of scope.

**Intentionally simplified for teaching (a fork may need them):**
- Word lists ship as small placeholders. A production deployment seeds them from a curated source the platform owns; this sample uses two `exampleslur*` and two `exampleprofanity*` placeholders so the matcher can be exercised without shipping any actual hateful content in a public sample.

## Adapt — sample-specific shapes

These files are shaped for moderation's specific data, but the **shape** is the lesson. Each row teaches a generalized pattern that transfers to apps with similar shape:

| File | What to change |
|---|---|
| `server/src/messageHandler.ts` | Your rule pipeline. Keep the *system/non-Person filter → monitored-channel filter → exempt short-circuit → cheap-rule-first ordering → first-match-wins → audit on every action* shape. |
| `server/src/auditDispatch.ts` | Your dispatch funnel. Keep the registration-callback shape (`setAuditBroadcaster(fn)`) so the funnel stays decoupled from the service and there's no circular import. |
| `server/src/settingsStore.ts` | Your KV-backed settings groups. Keep the per-field setters using `dataStore.appData.update()` for atomic merges; one key per logical settings group. |
| `server/src/auditLogStore.ts` | Your event-stream store. Keep the in-memory cache + invalidation, the `lower(field) LIKE ?` filter shape, and the `GROUP BY` summary query for per-target drill-downs. |
| `server/src/wordListStore.ts` | Your list store with bulk import. Keep the `INSERT OR IGNORE` + `runWithChanges` race-safe pattern and the compiled-pattern cache invalidated on every mutation. |
| `server/src/spamDetector.ts`, `server/src/rateLimiter.ts` | Your sliding-window detectors. Keep the periodic-prune shape (don't prune on hot path) and the inline COUNT on each event. |
| `server/src/adminAudience.ts` | Your admin broadcast audience. Keep the managed `MemberGroup` mirroring `admins ∪ owner`, the re-sync on `globalSettings.update` + `CommunityEdited`, and the silent-skip during the startup window. |
| `server/src/memberCache.ts` | Your nickname/profile resolver. Keep the TTL + LRU + `UserSetProfile`-event eviction; one SDK call populates everything you cache per member (nickname + joinedAt). |
| `server/src/lib/sdkQueue.ts` | Your SDK call throttler. Keep the lazy-fill token bucket, the bounded queue, and the *one shared queue across mutating call types* choice. |
| `client/src/components/{Sidebar,MobileHeader,navItems}.{tsx,ts,module.css}` | Your nav surfaces. Keep the shared `navItems` config so desktop and mobile never drift, and the `useFocusTrap` + body-scroll lock + Escape close on the drawer. |
| `client/src/components/{Panel,StatCard,Badge,IconBox,Pill,SubTabs,Select,EmptyState}.{tsx,module.css}` | Your design-system primitives. Keep the `--tone` CSS-custom-property API for tone variants, the `icon: ReactNode` icon-library-agnostic prop shape, and the `var(--rootsdk-*)` token references (no hardcoded hex). |
| `client/src/components/{MasterSubToggleGroup,ShowWordListGate,InlineConfirm,TypeToConfirm,MemberActions}.{tsx,module.css}` | Your destructive-action primitives. Keep the two-tier confirm split (consequence class drives which to use), the `collectReason` opt-in textarea, and the destructive-icon-red-at-rest convention. |
| `client/src/views/{Dashboard,AuditLog,Analytics,Settings}.tsx` | Your views. Keep the auto-save wiring, the empty/loading/error states, and the *event view + state view as separate surfaces* split (audit log vs. banned members panel). |

## Replace — pure moderation concerns

These are domain-specific to moderation — your fork replaces them entirely:

- `networking/src/moderation_service.proto` (your proto)
- `server/src/builtinWordLists.ts` (replace placeholder lists with your domain's lists)
- `server/src/{urlFilter,usernameFilter,warningCooldown}.ts` (rule bodies — the matcher infrastructure transfers, the rules don't)
- `server/src/moderationService.ts` domain constants (`SPAM_THRESHOLD_MIN`, etc.)
- Pure-domain client components: `client/src/components/{BannedMembersPanel,WordListPanel,MonitoredChannelsPanel}.tsx`
- Inline copy strings (button labels, error messages, placeholder text) — see [Copy](#copy)

## Sample-specific fork notes

Beyond the [standard fork procedure](../AGENTS.md#standard-root-app-fork-procedure):

- **Step 3 (manifest):** the sample declares `community.fullControl` because moderation needs delete + kick + ban + viewMessageHistory + createMessage covered in one shot. A fork may prefer least-privilege (`community.{kick, createBan}` + `channel.{deleteMessageOther, viewMessageHistory, createMessage}`); both are valid. The manifest also declares two `roleOrMember` settings under `general` — `admins` (admin selection) and `exempt` (rules bypass). See [Permissions and roles](#permissions-and-roles).
- **Step 4 (proto):** keep the per-field setter shape (one RPC per editable field, atomic per-field merge server-side) and the public/admin broadcast split (`SettingsChanged` admin-only via `adminAudience`; `AuditLogAppended` and `AdminsChanged` public, payload-free).
- **Step 5 (server-side):** replace the rule bodies, but keep the pipeline order + first-match-wins + central-audit-dispatch shape. Keep the SDK throttler queue around any state-mutating SDK call your rules can fire in bursts. Keep the daily retention job's idempotent `deleteByTag` + `create` pattern with `JobMissed` handling.
- **Step 6 (client):** keep the layout primitives verbatim — `Sidebar`, `MobileHeader`, `Panel`, `StatCard`, `Badge`, `IconBox`, `Pill`, `EmptyState`, `Loader`, `QueryError`, `MasterSubToggleGroup`, `ShowWordListGate`, `InlineConfirm`, `TypeToConfirm`, `MemberActions`. They're domain-neutral. Swap `import { YourIcon } from "lucide-react"` and pass JSX through the `icon: ReactNode` props.
- **Step 7 (this AGENTS.md):** replace the implementation-patterns body wholesale; align the Demonstrates / Does NOT / Adapt / Replace tables to what your fork keeps and changes. Update this AGENTS.md — don't leave moderation copy behind.
- **Step 8 (verify invariants):** verify the audit invariant — every state-modifying operation should write through the audit dispatch funnel. Run the server through one full cycle (rule fires → audit row + broadcast → cleanup job runs → row pruned past retention) before considering the fork complete.

### Storage shape

This sample uses **KV for flat scalar settings** and **SQLite for relational/list data**. The split matches each value's natural shape:

- **KV (`dataStore.appData`)** — `settings/content-filter`, `settings/spam-control`, `settings/rate-limit`, `settings/general`, `settings/username-filter`. One key per settings group, `dataStore.appData.update()` for atomic per-field merges.
- **SQLite** — `words`, `audit_log`, `recent_messages`, `rate_messages`, `monitored_channels`. Anything multi-row or paginated.
- **`globalSettings`** — admin role/member picker, exempt picker. Manifest-declared, platform-rendered.

Don't shoehorn flat scalars into SQLite. A fork that adds a new "default cooldown" knob should add it to the appropriate KV settings group (and a new per-field `Set` RPC), not extend a SQLite table.

**Schema migrations.** `server/src/db.ts → runSchemaMigrations` shows the idempotent pattern for adding or renaming columns after first ship. Every startup runs `PRAGMA table_info(<table>)` once, builds a `Set` of existing column names, and applies each migration only when its prerequisite is true:

```ts
if (colNames.has("legacy_name") && !colNames.has("new_name")) {
  await run(db, `ALTER TABLE t RENAME COLUMN legacy_name TO new_name`);
}
if (!colNames.has("added_column")) {
  await run(db, `ALTER TABLE t ADD COLUMN added_column TEXT NOT NULL DEFAULT ''`);
}
```

SQLite's `CREATE TABLE IF NOT EXISTS` is a no-op when the table exists, so changing the body of a `CREATE TABLE` statement doesn't migrate older databases — they stay on the original schema until an explicit `ALTER TABLE`. Forking agents who add columns post-ship should append migrations to this block, not edit the `CREATE TABLE`.

## Implementation patterns

### Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Bundler | Vite 5 |
| Language | TypeScript (strict) |
| Styling | Plain CSS with CSS Modules (`*.module.css`), one file per component |
| State | React state + Context for cross-component sharing |
| Networking | Generated protobuf client from `networking/` |
| Icons | `lucide-react` (~1500 glyphs; tree-shaken per-import) |
| Server-side persistence | SQLite via `dataStore.config.sqlite3.filename`; KV via `dataStore.appData` |
| Job scheduling | `rootServer.jobScheduler` — daily recurrence for retention cleanup |

No third-party UI stack. No Tailwind, Radix, framer-motion, or similar. First-party Root SDK packages (`@rootsdk/server-app`, `@rootsdk/client-app`) are in scope.

`apps/themes` remains the canonical "look like Root surfaces" reference for anyone who wants strict identity with native Root chrome — sample apps standardize on lucide for breadth and one consistent API. Components that take an icon accept `icon: ReactNode` and callers pass `<Shield size={20} />` directly, so a fork that prefers a different library only changes the import sites.

### Visual tokens

All colors, spacing, radii, typography, shadows, and transitions come from Root CSS custom properties. The canonical reference is [`apps/themes/client/src/generated/design-tokens.json`](../themes/client/src/generated/design-tokens.json) — every `var(--rootsdk-*)` reference in this sample maps to a description in that file. Tints use `color-mix(in srgb, var(--rootsdk-X) 12%, transparent)` for backgrounds and 20% for borders.

App-specific token roles worth calling out:

| Concern | Token via accent |
|---|---|
| Total actions / brand identity | `brand` → `--rootsdk-brand-primary` |
| Content filter / warning state | `warning` → `--rootsdk-warning` |
| Manual actions / kick / ban | `error` → `--rootsdk-error` |
| Spam detection / success state | `success` → `--rootsdk-brand-secondary` |
| Manual source tag / info | `info` → `--rootsdk-info` |

### App shell — Sidebar + drawer

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

### Responsive

Mobile-first. Every interactive element meets the 44×44 px touch-target minimum (Toggle, Button, Filter button, drawer toggle, nav items). Layouts adapt down to 320px without horizontal scroll, except for the audit log table (acceptable since it's admin-only).

| Width | Tier | Behavior |
|---|---|---|
| `< 640px` | Mobile | MobileHeader + drawer; Dashboard StatCards stack 1-up; Settings full-width; audit log table = horizontal-scroll |
| `640–959px` | Tablet | MobileHeader + drawer; Dashboard StatCards 2-up; Analytics chart panels stack |
| `≥ 960px` | Desktop | Sidebar (240px) + content; full layout as designed |

### Components

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
| `BannedMembersPanel` | Current-state ban list (complementary to the audit log's event view) |
| `InlineConfirm` | Two-step confirm for low-stakes destructive actions; optional reason textarea via `collectReason` |
| `TypeToConfirm` | High-friction phrase-typing confirm for irreversible bulk operations |
| `MemberActions` | Kick/Ban affordances for a target user; ban includes a Permanent/1d/7d/30d duration picker driving `BanMemberRequest.expiresAt` |

### RPCs

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
| `DeleteMessageManual` / `KickMember` / `BanMember` / `UnbanMember` | Manual moderation actions; all flow through the audit dispatch funnel | Yes |
| `ClearAuditLog` | Bulk-delete via TypeToConfirm; server re-validates the typed phrase | Yes |

### Why per-field RPCs

Concurrent admin edits to different fields of the same settings group don't stomp each other because each field has its own RPC + its own atomic `dataStore.appData.update()` per-field merge. A single "update settings" RPC accepting a partial document would race: admin A clicks "Enable spam detection" while admin B clicks "Warn users" — both fetch the same baseline, both write back overlapping state, last-writer wins. Per-field RPCs sidestep the read-modify-write entirely.

The cost is RPC method count (~16 settings setters in this sample). Acceptable for the consistency win.

### Broadcasts — three event types with distinct audiences

| Event | Audience | Triggered by | Payload |
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

Every path that writes an audit entry flows through one function, defined in `server/src/auditDispatch.ts`:

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

Six call sites flow through `onAuditEntry`: three rule paths in `messageHandler` (content filter, spam detection, rate limit) + three manual actions on `moderationService` (delete-message, kick, ban). Plus unban and clear-audit-log trailer through the same funnel.

### How rules fire

Per-message moderation subscribes to **two** events: `ChannelMessageEvent.ChannelMessageCreated` (full pipeline) and `ChannelMessageEvent.ChannelMessageEdited` (inline rules only — content filter, URL filter, mention spam — since spam-detection + rate-limit observations already counted on creation, so re-evaluating them would double-penalize). Without the edit listener a user can post a clean message and edit it to violating content as a bypass. Edit-time hits get a leading `[edited] ` marker on the audit excerpt so admins can distinguish post-time vs edit-time violations. On every event:

1. **Skip system messages and non-Person senders.** `evt.messageType === MessageType.System` or `RootGuidConverter.toRootGuidType(evt.userId) !== RootGuidType.Person` → return early. This is the very first thing the handler does — without it, the moderation app would try to act on join/leave system messages and on other apps' broadcasts.
2. **Skip unmonitored channels.** Empty monitored set means "monitor all"; otherwise `monitoredChannels.has(channelId)` gates the rest.
3. **Skip exempt members.** `await isExempt(evt.userId)` short-circuits the rest of the pipeline. Manual admin actions are unaffected since those run server-side from the audit log, not through the message handler.
4. **Run rules in order: new member gate → inline rules (content filter, URL filter, mention spam) → spam detection → rate limit.** First rule that fires wins; the message is deleted and an audit entry is written via `onAuditEntry`. Running every rule on every message would double-count metrics and produce duplicate audit entries.
5. **Optionally post a public warning** — content filter and spam detection support a `warnUsers` toggle that posts a generic "a message was removed" notice in the channel, addressed to the violating user via Root's user-mention markup (`[@nickname](root://user/<id>)`) so the user gets a notification. Best-effort; failure to post the warning doesn't undo the deletion. Warning posts are debounced per `(userId, channelId)` pair via `server/src/warningCooldown.ts` (10-minute window) so one rapidly-violating user can't flood the channel with notices — the audit log still records every violation.

The content filter uses a **compiled-alternation regex** per word category (built once on word-list change in `wordListStore.getCompiledPattern`, cached alongside the row cache, invalidated on every mutation). Per-message content-filter cost is one `regex.exec()` per category — not a per-term loop. User-supplied custom words are escaped before compilation, so flat alternation has no regex-DoS surface. Content normalization runs **NFKC** before lowercasing + leet folding so full-width ("ｓｌｕｒ") and ligature ("ﬁ") evasions fold into their canonical equivalents — same path word-list entries take on add, so stored terms and message text agree. Homoglyph attacks across scripts (Cyrillic vs Latin) need a separate confusables map and are out of scope. (Forks upgrading from a pre-NFKC version: rows added before the change weren't NFKC'd; if your custom list contains compatibility characters, re-add them. ASCII entries — the typical case — are unaffected since NFKC is a no-op on plain ASCII.)

Hot-path discipline: cached settings reads, in-memory channel name + word lists, the only SDK calls are the actual delete and (optionally) the warning post — both gated behind a rule match.

### New member gate

The cheapest possible rule: integer compare against `CommunityMember.joinedAt` (community-join time, ms epoch). Off by default; when enabled, messages from members whose `joinedAt` is more recent than `minMinutes` ago are deleted before any content matching runs. Catches drive-by spam ("just joined and immediately spammed") without paying for content normalization or regex matching.

**Pipeline order**: first rule check after the exempt short-circuit. Cheapest = runs first; spammers get stopped before we touch the matchers.

**Edits don't re-check.** A member who posted within the gate window had their original message deleted; the edit event won't fire for a non-existent message. A member who posted *outside* the window and edits later is, by definition, older than the gate now — re-checking is busywork.

**`joinedAt` is community-age, not Root-account-age.** The DevKit SDK doesn't expose Root account-creation time; it does expose `CommunityMember.joinedAt` via `communityMembers.get`. That's the more useful signal anyway: a fresh Root account that's been a trusted member of *this* community for a year shouldn't be gated; an established Root user who just joined to spam should be.

**Cache strategy**: `joinedAt` joins `nickname` in the unified `memberCache`. One SDK call per resolve populates both — a moderation-event burst that does both an age check and an audit-write nickname pulls one round-trip total. `joinedAt` is effectively immutable per-member-per-community, so the 60-second TTL doesn't matter for it (refetches return the same value); the TTL is sized for the nickname use case.

**Fail-open on missing data.** If `communityMembers.get` doesn't return a `joinedAt` (the SDK type marks it optional) or the call fails, the gate skips — treat as "old enough." The alternative gates legitimate users on platform metadata gaps and produces false positives that are hard to debug.

**Range**: 1–10080 minutes (1 minute to 7 days). Default 5 minutes — catches the most aggressive drive-by spam without a long-feeling delay for the legitimate just-joined case.

### Mention spam

Caps user + role mentions per message. Stateless — each message is judged on its own count, no per-user windowing. Catches `@everyone`-style pile-on spam without needing rate-limit state.

**Counts come from `ChannelMessage.referenceMaps`**, not a regex over `messageContent`. The platform already resolves mention markup to a `users[]` + `roles[]` array on the event; we sum the two lengths and compare against the threshold. Two consequences worth noting for forks:

- **Copy-paste of mention markup that doesn't resolve doesn't count.** A user pasting `[@someone](root://user/<id>)` text from another channel without a real underlying mention shows up in `messageContent` but not in `referenceMaps.users`. The rule matches what the chat client renders as a live mention, which is the right signal — unresolved markup doesn't notify anyone.
- **`@everyone` and `@here` register as roles.** They land in `referenceMaps.roles` like any other role mention, so a single `@everyone` counts as one mention. Mention spam is a *quantity* rule; for "this community doesn't allow `@everyone` at all" use Root's native role permissions to gate the role itself.

**Channel mentions are not counted.** They don't notify members and aren't a pile-on vector.

**Pipeline placement**: inline rule alongside content filter and URL filter. Re-runs on edits — a clean message edited to add 30 mentions is the same evasion shape as a clean message edited to a slur.

**Range**: 1–50 mentions. Default 10 — generous enough for legitimate "thanks @a @b @c..." rollups, tight enough that an `@everyone` + 10 specific users pile-on trips it.

### URL filter

Messages containing URLs get checked against an admin-managed domain list. Lives in `server/src/urlFilter.ts` and slots into the rule pipeline between content filter and spam detection.

**Two extraction sources, one matcher**:
- `messageUris[]` — the platform's parsed URI list. Filtered to `http(s)` only so attachment URIs (asset:// etc.) don't get checked against domain rules they were never meant to cover.
- `messageContent` text regex — catches plain-text URLs ("check out evil.com") that the platform didn't auto-detect. A real evasion vector if we relied only on `messageUris`.

Both sources contribute candidates; we dedupe by URL string and run each through `new URL()` for canonical hostname extraction. Malformed candidates (the text regex sometimes pulls trailing punctuation) silently drop.

**Hostname suffix matching**: a domain entry "evil.com" matches both "evil.com" and "*.evil.com" — admins expect entering the parent domain to cover the subtree. Implementation: `hostname === entry || hostname.endsWith("." + entry)`. Compared to compiled-alternation regex (used by content filter), this is a per-URL × per-entry walk; the lists are bounded enough that it's not worth the regex compile.

**Two modes**:
- BLOCKLIST — messages with any listed domain → deleted. Permissive default.
- ALLOWLIST — messages with non-listed domains → deleted. The high-trust mode for serious deployments. An empty allowlist blocks every URL — that's the documented trade-off.

**Root invite links** — independent toggle that fires whenever the URL points at `rootapp.gg/<code>` (single-path-segment shape). The DevKit SDK doesn't expose the community invite namespace, so we can't distinguish "this community's invite" from "another community's invite" — the toggle is binary "block all Root invite links." Useful for communities that don't want members posting links to *other* communities (a real spam vector); the trade-off is they can't repost their own invite either.

**Storage shape**: domains live in the same `words` SQLite table as custom + allowed lists, distinguished by `WordCategory.URL_DOMAIN`. The admin-managed shape is identical (add / remove / toggle / search / paginate / bulk-import), so the existing `WordListPanel` component handles it directly. The matcher reads through `getEnabledWords(WordCategory.URL_DOMAIN)`. Per-category normalization differs: word categories use the content-filter `normalize()` (strips non-alphanum); URL_DOMAIN uses `normalizeDomain()` (preserves dots + hyphens, strips protocol/path/leading-www, validates hostname shape).

**Edits re-scan**: same logic as content filter — the URL filter runs again on `ChannelMessageEdited` because "post clean message, edit to evil link" is the same evasion shape.

### Username filter

Members whose nicknames match the same content-filter compiled regex (slurs / profanity / custom + allowed-words cancellation) get banned automatically. Lives in `server/src/usernameFilter.ts` and runs off two `CommunityMemberEvent` subscriptions:

- **`UserSetProfile`** — fires when a global username changes; the per-community nickname often updates alongside, so we re-fetch + check.
- **`CommunityMemberAttach`** — fires when a member opens the community; catches a violating nickname picked up at first attach (e.g. a newly-joined member with a slur as their nickname).

The matcher reads `CommunityMember.nickname` via the same `memberCache.resolveNickname` the audit-write path uses — so the audit row's `targetNickname` matches what triggered the rule. The action is always BAN with an audit row `RuleType.USERNAME_FILTER`. Exempt members bypass via `isExempt(userId)` — exempt is a single trust boundary across all rules.

The action surface stays narrow (ban only). A forking agent who wants an audit-only tier can extend `UsernameFilterSettings` and the action branch in `evaluateUser`.

Off by default — banning members on a name match is high-impact and should be opted into deliberately. Especially relevant if the custom word list is broad: a curation pass before enabling is the canonical workflow.

### Audit log nicknames

Every audit row freezes a `targetNickname` at write time — what the user was called in the community when this row was written. Resolution goes through `server/src/memberCache.ts` which wraps `rootServer.community.communityMembers.get({ userId }).nickname`. A 60-second TTL cache + `UserSetProfile`-event eviction collapses spam-burst lookups.

**"Nickname is username."** In Root's product vocabulary, what users see in chat IS the username — even though the server SDK type calls it `CommunityMember.nickname` (the field is per-community customizable). The proto field, DB column, and resolver in code use `nickname` to teach the SDK API correctly; the user-facing UI copy says "Username" to match what admins recognize.

**Why not the global username?** The SDK exposes the global username only via `UserSetProfileEvent` broadcasts — there is no `users.get` / `getUserByUsername` lookup, so an index built from those events would be incomplete on bootstrap (any user who hasn't triggered a profile event since app install wouldn't be in the index). Nickname is the SDK-supported, in-chat-visible name — it's the right resolver target for an audit log.

**Frozen-at-write semantics.** A user later renaming themselves to "InnocentMember" still shows as "BadActor99" on historical rows, and a substring search for "BadActor99" finds those historical actions. This is the expected audit-log behavior: rows are evidence of what happened, including who-they-were-called at the time.

**Filter shape.** `auditLogStore.list` filters via `lower(target_nickname) LIKE ?` against persisted nicknames. Case-insensitive substring; the trim happens server-side so a whitespace-only filter doesn't produce a useless `LIKE '%   %'` pattern. There's no index on `target_nickname` — at sample scale (low thousands of rows) the scan is fine; a forking deployment with tens of thousands of rows + frequent filter use should consider a SQLite FTS5 virtual table next to `audit_log` and route the LIKE through it.

**Cold-start trade-off.** `memberCache` is lazy: the first audit write for each unique user pays an SDK round-trip after the message delete (the delete itself is unblocked). Priming via `communityMembers.listAll()` at startup would shift that cost to startup but make it potentially expensive for large communities. We pick lazy because moderation events are a minority of messages, the audit write isn't on the deletion critical path, and a lazy cache stays cheap to copy into a fork that doesn't need the priming step.

**Memory-bounding.** The cache has an LRU cap (5,000 entries) and a periodic sweeper (5-minute interval) that drops expired entries. Without these a long-running app moderating many distinct users would accumulate entries forever — small but unbounded growth is an antipattern for forks.

### Per-user infraction history

Each audit-log row carrying a `targetUserId` has an expand chevron. Click → the row reveals a summary of *that user's* full audit history: total events, per-rule breakdown chips, first/last event dates. The pattern lets a mod triaging "is this a repeat offender?" pivot from any audit context without re-filtering.

**State shape**: `Set<string>` of expanded row IDs (multi-expand allowed — admins occasionally compare two users' histories side by side).

**Per-user cache**: `useRef<Map<userId, MemberSummary>>` so multiple rows for the same user share one fetch, and re-expanding the same user is instant. Cache is keyed on userId, not row ID — that's what makes the share-across-rows work. Cleared in the `AuditLogAppended` listener so a fresh moderation event invalidates any displayed counts.

**Rendering**: table mode renders the summary as a separate `<tr>` with `colSpan` covering all columns; card mode (mobile) renders it inside the card below the existing content with a top-border separator. Same `MemberSummaryView` component for both — the layout differs but the data + chip rendering is shared.

**Server query**: `auditLogStore.memberSummary` does one `GROUP BY rule` query plus one nickname lookup. Excludes `RuleType.UNSPECIFIED` rows so internal-failure noise doesn't inflate user infraction counts (same rule the dashboard `countSince` follows).

**Edge cases**:
- Rows without `targetUserId` (CLEAR_AUDIT_LOG, rule-pipeline-error rows where the user isn't the subject) get no chevron — nothing to drill into.
- A user with no audit history (just attached but never moderated) gets a "No prior moderation events" empty state.
- Admin-only — the AuditLog view is already gated on `amIAdmin`, so the per-user summary inherits that.

### Banned members

Bans are surfaced through two distinct surfaces — and the split is the lesson:

- **Audit log**: event history. "User X was banned at T1, unbanned at T2, banned again at T3" → three rows, in time order.
- **Banned members panel** (`client/src/components/BannedMembersPanel.tsx`): current state. "User X is banned right now, expires in 5 days."

Two views, two mental models. An admin asking "what happened?" reaches for the audit log; an admin asking "who's currently banned, and should I lift any?" reaches for the panel. Mixing these — putting an Unban button on every audit-log row that mentions a target — looks lightweight at sample scale but breaks at production scale: most rows' target users aren't *currently* banned, so 95% of clicks would be no-ops, and three destructive-looking buttons per row creates visual noise on busy logs. State views complement event views; they don't replace them.

The panel calls `rootServer.community.communityMemberBans.list()` per fetch (no caching) because ban state changes through both our mutations *and* the platform's auto-expiry of temp bans — a stale cache would routinely show lifted bans. Refresh fires on `AuditLogAppended` broadcasts (every kick/ban/unban writes an audit row, so that signal covers our mutations); SDK auto-expiry doesn't fire `AuditLogAppended`, so a temp ban that just expired might linger in the panel until the next manual refresh or unrelated audit event. Acceptable lag for a state-review surface.

`UnbanMember` mirrors `BanMember`'s shape: `requireAdmin` → `requireManualActionAllowance` → `communityMemberBans.delete()` wrapped in `moderationSdkQueue` → audit row with `ActionType.UNBAN_MEMBER`. NotFound from the SDK (race with auto-expiry, or admin clicking a stale row) surfaces as `INVALID_TARGET` with a "not currently banned" message; no audit row is written for the no-op.

### Reason field on manual actions

Every manual moderation RPC (`DeleteMessageManual`, `KickMember`, `BanMember`, `UnbanMember`) accepts an optional `reason` string. Surfaced in the UI via `InlineConfirm`'s `collectReason` prop — when set, the confirm prompt grows a textarea between the message and the action buttons. The typed text flows into `onCommit`'s argument, which the caller passes to the RPC.

**Optional, not required.** Most spam-troll bans are obvious from context; forcing text leads to "spam" / "x" / "no" placeholders that fill the field but add nothing. The textarea is prominent (it's the visual thing to do before clicking commit) but skippable. Admins who care about audit-log readability six months later will type; admins handling routine spam won't.

**Storage**: the reason flows into the audit row's `messageExcerpt` column — the same field that carries content-filter matched content and clear-audit-log row counts. No new schema.

**Validation**: server enforces a 500-char cap via `validateReason()` (helper in `moderationService.ts`). The client textarea has the same `maxLength`, but the server validates regardless — defence against malformed or out-of-band callers. Over-cap throws `INVALID_SETTINGS`.

**Audit row excerpt format** varies by action:
- `DeleteMessageManual`: `<message content>\n[reason: <text>]` when reason given; just message content otherwise.
- `KickMember` / `UnbanMember`: bare reason text (or empty).
- `BanMember`: reason + `[expires <iso>]` suffix when temp-ban; reason alone for permanent.

The `InlineConfirm.collectReason` prop is opt-in so existing call sites that don't need it (e.g., `WordListPanel`'s remove-word confirm) stay simple. The handler signature accepts a `reason: string` argument; existing callers with no-arg handlers work unchanged because functions with fewer parameters are assignable to functions with more.

### Confirmation tiers

Two destructive-action confirmation patterns live in this sample, picked by consequence class:

| Tier | Component | Use for | Examples in this app |
|---|---|---|---|
| Two-click inline | `InlineConfirm` | Well-bounded actions where the worst case is recoverable or scoped to a single item | Word delete, kick, single-message delete, ban (per-user, even with expiry) |
| Type-the-phrase | `TypeToConfirm` | Irreversible bulk operations affecting many rows or users at once | "Clear audit log" in the General Settings Danger zone |

The split matters because confirm fatigue is real: every action gated behind a heavy confirm trains users to dismiss confirms reflexively. Reserving `TypeToConfirm` for a small number of bulk-irreversible cases keeps the gate's weight meaningful. The server independently validates the typed phrase on the corresponding RPC (`ClearAuditLog` rejects non-matching `confirmation_phrase` with `INVALID_SETTINGS`), so a misbehaving client or a direct RPC caller can't bypass the gate.

### Temp-banning members

`BanMemberRequest.expires_at` (ms epoch) surfaces the SDK's `communityMemberBans.create({ expiresAt })` capability. The `MemberActions` ban flow exposes four canned durations — Permanent (default), 1 day, 7 days, 30 days — and computes the absolute timestamp client-side. Custom dates are deliberately deferred: a date picker would be a meaningful UI surface increase for a relatively rare admin choice.

The SDK lifts the ban automatically when the timestamp passes — no app-side scheduled job. The audit entry records the absolute expiry time in the excerpt so admins reading the log later see how long the ban was for, not just that one was issued.

Server-side validation rejects `expires_at` values in the past with `INVALID_SETTINGS` (almost certainly client-clock skew or a malformed request — would otherwise produce an instantly-lifted ban, worse UX than failing fast). The current four-option picker (1d / 7d / 30d) gives network latency multiple orders of magnitude of headroom, so the `expiresAtMs <= Date.now()` check is exact-now. A future custom-duration picker that allowed sub-minute bans should swap the check for a small grace window (e.g. `expiresAtMs <= Date.now() + 5_000`) to absorb round-trip latency.

### Exempt members

Between the channel gate and the rule pipeline, the handler short-circuits if `await isExempt(evt.userId)` returns `true`. The exempt set is the `globalSettings.general.exempt` `roleOrMember` picker — a `ReadOnlyMemberGroup` resolved by the platform from the admin's selection of users + roles.

Two design choices worth flagging for forks:

- **Why a manifest picker, not an in-app setting.** Exemption is fundamentally a permissioning decision, and Root's native role/member picker is purpose-built for it (search, role mention chips, multi-select). Reimplementing one in-app would teach the wrong pattern.
- **Why exemption sits before *every* rule, not per-rule.** A trusted moderator who happens to type a profanity-flagged word in a fast-moving discussion shouldn't have their message deleted *and* simultaneously be marked as the spam-detection trigger for a follow-up duplicate. Exemption is a single gate at the top of the pipeline; manual admin actions (kick/ban/delete-message) are unaffected since those run server-side from the audit log, not through the message handler.

`exemptMembers.ts` is intentionally simpler than `adminAudience.ts`: there's no parallel managed `MemberGroup` because the exempt selection has only one source (the picker). The platform's `ReadOnlyMemberGroup` is already the materialization — `.isMember(userId)` is sub-ms in practice (membership cached locally on the runtime).

The General Settings tab renders the current exempt selection as a read-only Pill list so admins don't have to context-switch to Root's native Settings to confirm what's configured. Editing still happens in the native picker.

### Bulk word import

Admins migrating a list from another moderation tool paste it into the textarea on each Word list panel; one RPC call inserts everything. `server/src/wordListStore.ts → importWords` splits each input on commas + newlines (so pasting a CSV or a newline-list both work), normalizes, dedupes within the input, queries existing rows in one batched `IN (...)` SELECT, and INSERTs the new ones inside a single transaction so a partial failure rolls back. The compiled-regex pattern cache invalidates exactly once at the end — recompiling per-row would be wasteful for a 200-word import. Server-side bounds: max 1000 entries per call (rejected with `INVALID_WORD` if exceeded); per-entry max length comes from the same `WORD_MAX_LENGTH` constant the single-add path uses. Returns `{added, duplicates, invalid}` so the UI can surface "Added 47, 3 duplicates, 2 invalid".

### SDK call rate-limit queue

Every outbound SDK call that mutates platform state — `channelMessages.delete`, `channelMessages.create`, `communityMemberBans.{create,kick}` — routes through a shared token-bucket queue at `server/src/lib/sdkQueue.ts`. The Root SDK enforces a per-app command quota (~5/s for state-mutating calls); a spam burst from one user can drive 20+ deletions in seconds, which without backpressure would land faster than the SDK accepts and fail with throttling errors.

The queue smooths bursts: capacity 5, refill 5/s. A token-bucket fills lazily on each enqueue (no background timer), so a quiet stretch refills the full burst capacity. When tokens are exhausted, calls queue with a Promise resolver and a short timer drains them as tokens become available. Bounded queue size (default 100) drops the oldest waiting call if a runaway producer somehow exceeds the cap — a safety valve, not a normal-operation path.

**Why one shared queue, not per-call-type buckets**: a moderation event commonly fires delete + warning-post + (rarely) ban-create in rapid succession. Sharing the bucket means the burst throttles fairly across all three traffic types instead of each fighting for its own quota. The pattern is intentionally inline (~90 lines) rather than an opaque dependency — forks copy what they see, so the readable implementation is more transferable than the import.

### How retention works

`server/src/main.ts` schedules a `JobInterval.Daily` job tagged `daily-cleanup` at startup. The job is idempotent: `deleteByTag` then `create`, so frequent restarts don't push the firing forever. `JobScheduleEvent.Job` fires on schedule; `JobScheduleEvent.JobMissed` catches up after downtime.

`runCleanup`:
1. Reads current `retentionDays` from settings.
2. Prunes audit log rows older than `now - retentionDays * 24h`.
3. Prunes spam observations older than `2 × spam.windowMinutes`.
4. Prunes rate observations older than `2 × rate.windowSeconds`.

The 2× headroom on detector prunes ensures a row inside the active detection window is never dropped; the detectors themselves do an inline COUNT of recent rows on every message and rely on the periodic prune to bound table size.

### Validate-before-persist

For RPCs that store user-supplied values, validate before writing. `AddWord` checks word length + non-empty + parses + lowercases through `normalize()` before insert. Per-field setters with numeric ranges call `rangeError(value, lo, hi, message)` before writing — failure throws `ModerationError.INVALID_SETTINGS` with a user-facing message; the client surfaces it via `AutoSaveStatus`.

### Server-side bounds on every value the server schedules off

Every numeric setting the server schedules off (spam window, rate window, retention days) has both a floor *and* a ceiling. Client `NumberInput` `min`/`max` are UX, not enforcement — a scripted client sending `Number.MAX_SAFE_INTEGER` would otherwise saturate scheduling math.

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
| Expanded audit rows (per-user history) | `Set<string>` of row IDs in `AuditLog` |
| MobileHeader drawer open/closed | Local to `MobileHeader` |

No query-cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` cleanup.

## Permissions and roles

```json
{
  "community": { "fullControl": true }
}
```

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

App admins are managed via Root's native Global Settings UI (manifest setting `general.admins`, `roleOrMember` selector with `roleMultiAndUserMulti`) — the app does not expose admin management in its own Settings. Exempt members are managed via a parallel `general.exempt` `roleOrMember` picker.

## Limits

Server is single source of truth.

| Item | Limit |
|---|---|
| Spam threshold | 2–100 (server-enforced) |
| Spam window | 1–1440 minutes (server-enforced) |
| Rate-limit max messages | 3–50 (server-enforced) |
| Rate-limit window | 5–120 seconds (server-enforced) |
| New-member gate | 1–10080 minutes (server-enforced) |
| Mention spam threshold | 1–50 (server-enforced) |
| Retention | 7–365 days (server-enforced) |
| Custom word length | 100 characters (server-enforced) |
| Bulk word import | 1000 entries per call (server-enforced) |
| Reason field | 500 characters (server-enforced) |
| Audit log page size | 25 default, 100 max |
| Word list page size | 50 |
| Dashboard recent count | 20 |

## Empty / error / loading states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Dashboard recent activity | `<Loader />` | **No moderation actions yet** — *When a rule fires or an admin takes a manual action, it'll show up here.* | `<QueryError onRetry />` |
| Audit log | `<Loader />` | **No matching entries** — *Try clearing or relaxing the filters above.* / *When the moderation pipeline acts on a message, an entry shows up here.* | `<QueryError onRetry />` |
| Analytics — Actions over time | `<Loader />` | **No trend data yet** — *Once moderation actions are recorded, the time series shows up here.* | `<QueryError onRetry />` |
| Analytics — Rule breakdown | `<Loader />` | **No rule data yet** — *A breakdown by rule will appear after the first action.* | `<QueryError onRetry />` |
| Analytics — Top channels | `<Loader />` | **No channel data yet** — *When messages are filtered or removed, the busiest channels list here.* | `<QueryError onRetry />` |
| Per-user infraction summary | inline spinner | "No prior moderation events" | inline error |
| Word list panel | `<Loader />` | "No words yet." in the empty section | `<QueryError onRetry />` |

Auto-save errors render through `AutoSaveStatus` as an error-only inline pill — successful saves are silent (transient pill flicker on every keystroke is worse than silence on success).

## Copy

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

## Known production limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, on infrastructure choices that vary per deployment, or on product-level decisions a fork should revisit.

- **Word lists ship as placeholders.** The built-in slur/profanity arrays in `server/src/builtinWordLists.ts` are intentionally non-offensive. A fork should replace them from a curated source the platform owns.
- **No reconnect-driven catch-up.** The client SDK doesn't currently surface a reconnect event; broadcasts that fire during a brief outage are lost. Wire the relevant context's `reload()` to a reconnect hook when one exists.
- **Cross-process settings cache coherence.** The in-memory settings cache is correct for a single-process app server. Replace with a per-call DB read or a small pub/sub if scaling horizontally.
- **No homoglyph normalization across scripts.** NFKC handles compatibility characters but Cyrillic vs Latin lookalikes need a separate confusables map. Forks targeting communities where script-mixing is a real evasion vector should add one.
- **Auto-expired temp-ban lag in the BannedMembersPanel.** SDK auto-expiry doesn't fire `AuditLogAppended`, so a temp ban that just expired might linger in the panel until the next manual refresh or unrelated audit event. Acceptable lag for a state-review surface; a fork that needs strict freshness can poll on a short interval.
- **`target_nickname` is unindexed.** At sample scale (low thousands of rows) the LIKE scan is fine; a deployment with tens of thousands of rows + frequent filter use should consider a SQLite FTS5 virtual table next to `audit_log` and route the LIKE through it.
