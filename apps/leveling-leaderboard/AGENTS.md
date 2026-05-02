---
kind: sample-app
description: XP from messages → live top-10 leaderboard with admin Settings
complexity: complex
key_patterns:
  - admin gating via `globalSettings.general.admins`
  - message-driven aggregation
  - atomic SQL with cooldown
  - coalesced "all" broadcast
  - in-app debounced auto-save
  - ErrorBoundary telemetry funnel
permissions:
  - community.fullControl
---

# leveling-leaderboard

Real-time XP and leaderboard app. Members earn XP for messages. The main view shows the Top 10 leaderboard, a personal "you" card with progress to next level and an "+N XP to join Top 10" motivator, and a list of the caller's recent awards. App admins open an in-app Settings view via a gear icon in the header to configure scoring, channel exclusions, and XP-eligible members. App admins themselves are configured via Root's native Global Settings UI for this app.

This is the *canonical* sample that other samples copy lib helpers FROM. Most of the shared infrastructure (retry, safeBroadcast, useDebouncedMutation, ErrorBoundary, AutoSaveStatus, the broadcast-coalesce pattern, the atomic-UPSERT-with-WHERE pattern) is authored here and reused across the family. If you're forking a different sample, you're already reading code that originated here.

> **Standard Root app fork procedure and shared lib helpers** are in [../AGENTS.md](../AGENTS.md). What follows is specific to forking *this* sample.

## Demonstrates

- **Admin gating via globalSettings.** The app's `admins` role/member list lives in the manifest's globalSettings (`general.admins`) and is managed by Root's native Settings UI. Server reads the admins `ReadOnlyMemberGroup` on each `isAdmin()` check; community owner is always an admin as defence in depth.
- **Platform-managed `MemberGroup` for app state.** XP-eligible members are stored in an app-owned `MemberGroup` (`rootServer.memberGroups.create/getByName`). The platform resolves role membership automatically, so the message-handler hot path does an O(1) `memberUserIdsAsSet.has(userId)` check with zero custom role-membership sync.
- **In-app Settings with auto-save.** Three-tab Settings view (Scoring / Channels / Members) using a debounced-mutation hook. No Save buttons; changes commit on debounce. Destructive actions (reset) retain explicit confirmation via type-to-confirm.
- **Single-view app with push-view for admin settings.** No top-level tabs. Gear icon in `AppHeader` swaps the main viewport to Settings.
- **Message-driven XP aggregation with per-user cooldown.** Atomic SQL with a `WHERE last_award_at + cooldownMs <= now` clause handles the race; in-memory cache is a pure optimisation.
- **Live leaderboard via protobuf RPC + coalesced `"all"` broadcast.** A 500ms dirty-flag tick keeps broadcast rate bounded regardless of chat volume. `MemberXpChanged` also uses the `"all"` audience with client-side userId filtering (see [Why MemberXpChanged uses "all"](#why-memberxpchanged-uses-all)).
- **SQLite for indexed top-N and rank queries.** One composite index powers both the top-10 select and per-user rank.
- **Channel tree UI under `community.fullControl`.** Groups + channels enumerated at startup; live updates via ChannelEvent subscriptions.
- **Batched profile fetch via `rootClient.users.getUserProfiles` + `UserProfileUpdate` subscription.** Cached by userId; shared via a Context.
- **`RootServerException` for RPC-level authorization errors.** Client maps error codes to user-facing strings.
- **Root theme tokens for client styling.** No hardcoded colors; all surfaces and text use `--rootsdk-*` CSS custom properties. A small bridge in `lib/rootColorScheme.ts` keeps the document `color-scheme` in sync with `rootClient.theme` so native form chrome (number-input spin buttons, scrollbars) follows Root's theme.
- **Client-error telemetry funnel.** `ErrorBoundary` fires a fire-and-forget `ReportClientError` RPC on every catch; the server handler logs it as a structured `error` line with caller userId, label, message, stack, and userAgent.

## Does NOT demonstrate

- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience). Production code should wrap SDK calls in `withRetry()`.
- Key-value store — this app uses SQLite because it needs indexed queries. For simple persistence, see [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store) and the `self-roles` sample, which uses `dataStore.appData` for its picker config.
- File or asset handling — see [`api-samples/client-app-assets`](../../api-samples/client-app-assets) and [`api-samples/server-files`](../../api-samples/server-files).
- Moderation actions (kick, ban, delete) — see [`api-samples/server-kick-ban`](../../api-samples/server-kick-ban) and [`api-samples/server-messages`](../../api-samples/server-messages).
- Member-driven mutations — every mutation in this sample is admin-only. For the inverse shape (members modifying their own state), see [`self-roles`](../self-roles/).

## Adapt — sample-specific shapes

These files are shaped for leveling-leaderboard's specific data, but the **shape** is the lesson. Each row teaches a generalized pattern that transfers to apps with similar shape:

| File | What to change |
|---|---|
| `server/src/xpStore.ts` | Replace the schema; keep the atomic UPSERT-with-`WHERE`-cooldown pattern, the `transaction` mutex, and the composite index that powers both top-N and per-user rank queries. |
| `server/src/awardHistoryStore.ts` | Replace with your domain history table; keep the bounded-history pattern (latest N per member, older rows discarded on insert). |
| `server/src/xpEligibleGroup.ts` | Replace `resourceType` and `name` for your app; keep the `MemberGroup`-as-O(1)-eligibility-check shape. |
| `server/src/appSettingsStore.ts` | Replace settings shape; keep the in-memory cache + invalidation-on-write pattern. (Pending TODO: this store will move to `dataStore.appData` per the new DevKit storage convention — see comment at the top of the file.) |
| `server/src/excludedChannelsStore.ts` | Replace with your relational/list state; keep SQLite-because-it's-relational reasoning. |
| `server/src/leaderboardBroadcaster.ts` | Replace the snapshot shape; keep the chained-`setTimeout` + dirty-flag coalesce pattern. |
| `server/src/leaderboardService.ts` | Your RPCs. Keep `requireAdmin`, the broadcast helpers, the validation pass on writes. |
| `client/src/contexts/{LeaderboardContext,ProfilesContext}.tsx` | Your client-side state containers. Keep the load-on-mount + broadcast-subscription shape and the batched-profile-fetch + `UserProfileUpdate` resync. |
| `client/src/views/{HomeView,Settings}.tsx` | Your views. Keep the auto-save wiring, the AdminOnly defence, the empty/loading/error states. |

## Replace — pure leveling-leaderboard concerns

These are domain-specific to leveling-leaderboard — your fork replaces them entirely:

- `server/src/level.ts` (level curve, XP-per-level formula)
- `server/src/messageHandler.ts` (cooldown semantics, eligibility rules, per-event award amount)
- `networking/src/leaderboard_service.proto` (your service definition)
- `client/src/components/{LeaderboardRow,SettingsTabs,ChannelTree,RootUserRoleSelector,Avatar,NumberInput}.tsx` (domain-shaped components)
- `client/src/views/settings/{Scoring,Channels,Members}.tsx` (domain-specific tab bodies)

## Sample-specific fork notes

Beyond the [standard fork procedure](../AGENTS.md#standard-root-app-fork-procedure):

- **Step 3 (manifest):** the sample declares `community.fullControl` because Settings → Channels enumerates the community channel tree (see [Why `fullControl`](#why-fullcontrol)). A fork that doesn't enumerate community structure should request a narrower permission — see [`api-samples/server-channels`](../../api-samples/server-channels) and [`api-samples/server-channel-groups`](../../api-samples/server-channel-groups). Update the manifest `settings` block if your admin-selection or member-eligibility shape differs.
- **Step 4 (proto):** keep the public-vs-admin broadcast split conditional on payload sensitivity. Admin-only `SettingsUpdated` carries user/role IDs that non-admins can't read via the RPC; `"all"`-with-client-filter for `MemberXpChanged` and `LeaderboardUpdated` is fine because their payloads are public-leaderboard-equivalent. Keep the broadcast coalescer payload shape for the leaderboard event.
- **Step 5 (server-side):** replace the domain math in `level.ts` and `messageHandler.ts`. Replace the stores listed in [Adapt](#adapt--sample-specific-shapes) with your schema, preserving the atomic-SQL race protection, the in-memory cache + invalidation shape, and the `MemberGroup` eligibility pattern if your app has a similar dynamic-role-or-user selection.
- **Step 6 (client):** replace the domain components and view bodies. Keep `useDebouncedMutation` (150ms debounce — rapid input coalesces into one RPC, last value wins) and `AutoSaveStatus` (error-only chrome) verbatim. Keep the type-to-confirm pattern for any destructive admin actions.
- **Step 8 (verify invariants):** verify the message-driven aggregation invariant holds in your domain. Every eligible event should flow through the atomic SQL path with cooldown enforced server-side, and the broadcast coalescer should keep update rate bounded under load. Run the server through one full cycle (event fires → store write → coalesced broadcast → client re-renders) before considering the fork complete.

## Implementation patterns

### Storage: SQLite for indexed top-N and rank

This sample uses SQLite because the access pattern demands it: many rows (one per user, one per award), reads on every eligible message, writes constantly, and indexed queries for top-10 and per-user rank. One composite index `(total_xp DESC, last_award_at ASC)` powers both the top-10 select and the per-user rank query (`SELECT COUNT(*) FROM xp WHERE total_xp > ? OR (total_xp = ? AND last_award_at < ?)`).

The trade-off is migrations, schema definitions, and atomic upserts under contention. For settings that are flat primitives written rarely, the leaner tool is `dataStore.appData` — see [`self-roles`](../self-roles/), which stores its picker config as a single KV blob. Picking the right tool per access pattern is itself a teaching point — agents copying samples sometimes default to SQLite because that's what the most-detailed sample uses.

### Atomic UPSERT-with-WHERE for cooldown

Cooldown enforcement lives in the SQL itself, not in application code:

```sql
INSERT INTO xp (user_id, total_xp, last_award_at) VALUES (?, ?, ?)
ON CONFLICT(user_id) DO UPDATE SET
  total_xp = total_xp + excluded.total_xp,
  last_award_at = excluded.last_award_at
WHERE last_award_at + ? <= excluded.last_award_at;
```

The `WHERE last_award_at + cooldownMs <= now` clause means a concurrent message racing the cooldown either succeeds (the cooldown had elapsed) or no-ops (it hadn't). The in-memory cache is a pure read-side optimisation; correctness comes from the SQL. The `transaction` mutex in `db.ts` serializes writes within a process, so the atomicity guarantee is the SQL clause + the mutex together.

### Broadcast coalescing pattern

`server/src/leaderboardBroadcaster.ts` keeps the leaderboard broadcast rate bounded regardless of chat volume:

- Each XP change that affects the top 10 (moves a member within it, or into or out of it) marks the leaderboard dirty.
- A server-side timer ticks every `500ms` (chained `setTimeout` rather than `setInterval` so a slow broadcast can't overlap with the next tick); if dirty is set, the server sends one `LeaderboardUpdated` with the current top-10 snapshot and clears the flag.
- XP changes that don't affect the top 10 never mark the leaderboard dirty. The earning user still receives their own `MemberXpChanged` event (the `"all"` audience reaches them; their client's filter matches `event.userId`).

This caps the `"all"`-audience leaderboard rate at 2/s per community regardless of chat volume, while keeping perceived latency under 500ms.

`MemberXpChanged` is **not** coalesced — per-user earns are naturally rate-limited by the `cooldown` setting (default 60s = at most one earn per user per minute). Coalescing would add complexity without measurable savings at typical chat cadences.

### Channel-tree enumeration

Settings → Channels renders a tree of every channel in the community for per-channel XP exclusion. Groups + channels are enumerated at startup; live updates come via `ChannelEvent` subscriptions. The tree filters out non-text channels (Voice, App) and app-owned channels server-side; the client only ever sees channels XP could realistically accrue in.

This is what forces `community.fullControl` in the manifest — see [Why `fullControl`](#why-fullcontrol).

### Message-driven aggregation with cooldown

When a member sends a message, `messageHandler.ts` evaluates three conditions before awarding XP:

1. The member is in the eligible group (`xpEligibleGroup.isEligible(userId)` — O(1)).
2. The channel is not on the excluded list (in-memory cache backed by `excludedChannelsStore`).
3. The cooldown since the member's last award has elapsed (enforced atomically in SQL — see above).

If all three pass, the member earns XP, their total updates, the award is recorded in `awardHistoryStore` (bounded to 20 rows per member; older rows discarded on insert), and a `MemberXpChanged` broadcast fires. The leaderboard is marked dirty if the change affects the top 10.

### Three-tab settings UX

Settings has three tabs — **Scoring** / **Channels** / **Members** — using `SettingsTabs` (a 2px underline on the active tab, identical at every width). Each tab takes a slice of `GetSettings` state and owns its own auto-save via `useDebouncedMutation`. Separate RPCs — `UpdateScoringSettings`, `UpdateExcludedChannels`, `UpdateXpEligibleMembers` — so concurrent admin edits across tabs don't stomp each other.

- **Scoring** — `NumberInput`s for XP per message, cooldown, level curve. Reset-member and reset-all actions (see [Type-to-confirm](#type-to-confirm-destructive-actions) below). Server is the single source of truth for input bounds; they ship to the client via `GetSettingsResponse.limits` and feed `NumberInput`'s `min`/`max` props.
- **Channels** — `ChannelTree` with per-channel toggles. Tree filters out non-text channels and app-owned channels server-side.
- **Members** — `RootUserRoleSelector` (multi mode). Controls the XP-eligible MemberGroup. Apps and bots are filtered out of the user selection client-side via `isPersonId`; the server also rejects app GUIDs as defence in depth.

**No Save buttons.** Every non-destructive change auto-saves through `useDebouncedMutation` (150ms): rapid input coalesces into one RPC, last value wins. Successful saves are invisible — a transient "Saving…" pill per keystroke is too brief to read and shifts layout. Only failures get chrome: `AutoSaveStatus` renders an error pill (with Retry + Dismiss) that stays until resolved.

### Type-to-confirm destructive actions

No modal dialogs. One inline pattern — **type-to-confirm** — handles every destructive action. The admin types the exact name of what they're destroying; the danger button stays disabled until the text matches. Case-sensitive, matching Root's native "Delete community" pattern.

The implementation: a text input + danger button rendered after the picker (when applicable), wired by a single `value === expected` comparison. No new component is needed; the pattern is composed from `TextInput` + `Button`. Auto-save does NOT apply to destructive actions — they never fire without the typed match.

In this sample the pattern is used for **Reset member XP** (type the picked member's nickname) and **Reset all XP** (type `reset all XP`).

### Eligibility via MemberGroup

XP-eligible members are stored in a platform-managed `MemberGroup` owned by this app (`resourceType: "levelingLeaderboard"`, `name: "xpEligible"`). When admins edit the Members tab, the client fires `UpdateXpEligibleMembers` which calls `memberGroup.update({ userIds, communityRoleIds })`. The platform resolves role membership into the group's `memberUserIds` set automatically. The message handler checks `xpEligibleGroup.isEligible(userId)` synchronously on every incoming message — O(1) against `memberUserIdsAsSet`.

Past XP and leaderboard positions are preserved across eligibility changes — only future awards are affected. The server broadcasts `SettingsUpdated` after an edit so other admin clients refresh their form state.

**Why a MemberGroup vs a custom table:** the platform auto-syncs resolved membership on community role changes (user joins/leaves role → group updates). We'd otherwise need to subscribe to role-membership events and maintain our own resolved set. Member groups are also a first-class broadcast target (unused here, but available for future features).

### Layout primitives (reference)

- **App shell:** single-view UX with a push-view for admin settings. No tabs. `AppHeader` (48px) sits above a single content region that swaps between `HomeView` and `Settings`. View state is a single `useState<"home" | "settings">` in `App.tsx` — no router library.
- **Content column:** centered, `max-width: 640px`, side padding `16px`, vertical padding `24px`, `24px` gap between sections. Both `HomeView` and `Settings` share the same constraint.
- **Top 10 leaderboard:** rows are 64px. At `>= 640px`: rank (40px) → avatar (40px) → nickname (flex) → level (80px) → XP (96px). At `< 640px`: avatar → two-line stack (nickname / "Level 5 · 420 XP" meta), rank implied by list position. Caller's own row gets a `--rootsdk-highlight-light` background, a 3px inset left accent in `--rootsdk-brand-primary`, and a small "You" tag. Top-3 ranks render the rank number (or nickname at `< 640px`) in `--rootsdk-brand-secondary`. Tie-breaker: equal `total_xp` → earlier `last_award_at` ranks higher.
- **You-section:** identity (avatar / rank / level / XP) is never shown twice in the same view. On the board: just a progress card. Off the board with XP: a `LeaderboardRow` ghost row in its own container (same me-highlight treatment) above a progress card with `+N XP to join Top 10`. Zero XP: collapsed `You haven't earned any XP yet.`. The `LeaderboardRow` component is shared so a caller's row keeps the same visual identity in both placements.
- **Recent awards:** rendered below the you-section only when `recentAwards.length > 0`. Up to 20 rows. Row: `#channelName` · relative time · `+N XP`.
- **Responsive:** mobile-first. Two width tiers — `< 640px` (mobile, single column, leaderboard rank column hidden, channel tree groups collapsed by default) and `>= 640px` (desktop, all columns, channel tree expanded by default). Touch targets meet 44×44px at every width. Minimum supported width: 320px.
- **Motion:** minimal and purposeful. Button hover `opacity 200ms`; button press `opacity 200ms` + `transform: scale(0.98)`; row hover `background-color 150ms`; home ↔ settings push-view instant swap (no slide animation); inline confirm reveal `opacity 150ms` on the swapped controls (no layout animation, container width preserved); leaderboard row reorder snaps, with a 400ms `--rootsdk-highlight-light` pulse on the affected row as a visual cue; progress bar fill `width 300ms ease-out`. No animation library, no FLIP, no View Transitions API.

### Sample-specific components

Hand-rolled in `client/src/components/`. One `.tsx` + one `.module.css` per component. The universal primitives (`Loader`, `EmptyState`, `QueryError`, `Button`, `TextInput`, `Icon`, `AutoSaveStatus`, `ErrorBoundary`, `AdminOnly`, `AppHeader`) are listed at [../AGENTS.md](../AGENTS.md). Sample-specific components:

| Component | Purpose |
|---|---|
| `LeaderboardRow` | One row of rank / avatar / nickname / level / XP. Shared between the Top 10 list and the off-board "Your position" ghost row so both placements are visually identical. Pulses on XP change; me-highlight when `isMe`. |
| `SettingsTabs` | Sub-navigation tab bar used inside the Settings view. Three tabs: Scoring / Channels / Members. |
| `NumberInput` | Labeled integer input with min/max. |
| `Avatar` | Renders the profile picture via `rootClient.assets.toImageUrl(profilePictureUri, "small")` as a 6px-rounded square. Falls back to a coloured initial (first character of nickname on a token-based background) when `profilePictureUri` is missing. |
| `ChannelTree` | Expandable group → channel toggle tree for Settings → Channels. |
| `RootUserRoleSelector` | Thin React wrapper around `<rootsdk-user-role-selector>` from `@rootsdk/client-app-ui`. Used in the Members tab (multi-select) and for the Reset member XP picker (single-select). See the API reference at [docs/llms/app-api-reference/client/classes/UserRoleSelector.md](../../docs/llms/app-api-reference/client/classes/UserRoleSelector.md). |

### Stack and visual tokens

React 19 + Vite + plain CSS modules + protobuf RPC. No third-party UI stack (no Tailwind, Radix, TanStack Query, framer-motion). First-party Root SDK packages (`@rootsdk/client-app`, `@rootsdk/client-app-ui`) are in scope — always prefer a platform-native primitive over reinventing one. The `UserRoleSelector` web component from `@rootsdk/client-app-ui` is wrapped in a thin React component (`RootUserRoleSelector`).

All colors, spacing, radii, typography, and shadows come from Root CSS custom properties (`--rootsdk-*`). Never hardcode values. Full reference: [Design system reference](../../docs/llms/app-docs/develop/client/design-system-reference.md). Spacing values: `4, 8, 12, 16, 20, 24, 32, 48` px only. Radii: `12px` panels/cards/inputs, `9999px` pills, `8px` list items, `6px` icon buttons/avatars (avatars use the square-rounded form to match Root's first-party chrome — circular avatars read as consumer-social, which is not the voice of this app).

Tokens used in this app:

| Concern | Token |
|---|---|
| Page / app background | `--rootsdk-background-primary` |
| Panels, cards, rows | `--rootsdk-background-secondary` |
| Nested elevated (popovers, typeahead results) | `--rootsdk-surface-primary` |
| Primary text | `--rootsdk-text-primary` |
| Secondary text (labels, meta) | `--rootsdk-text-secondary` |
| Muted text (placeholders, disabled) | `--rootsdk-text-tertiary` |
| Dividers, input borders | `--rootsdk-border` |
| Primary action (Confirm, selected tab) | `--rootsdk-brand-primary` |
| Destructive action (Reset) | `--rootsdk-error` |
| Row hover | `--rootsdk-highlight-light` |
| Pressed / active | `--rootsdk-highlight-strong` |
| Success (level-up, badges) | `--rootsdk-brand-secondary` |
| Links | `--rootsdk-link` |

Typography uses the system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`). No `@font-face`, no web fonts, no bundled font files — DevKit samples intentionally skip custom fonts to stay copy-ready without external assets. Sizes: page title 24/32/600, section heading 20/32/500, body 14/20/400, button 14/20/500, meta 12/16/400. Shadows: panels none; popovers and typeahead results `0 4px 8px rgba(0, 0, 0, 0.15)`.

Icons come from `lucide-react` — one library, ~1500 glyphs, tree-shaken per-import. Components render lucide icons directly: `import { Trophy } from "lucide-react"; <Trophy size={16} />`. No central `Icon` wrapper, no `icons.json` snapshot. When forking, swap the lucide imports per call site and pass the JSX element to any consuming component (`EmptyState` accepts `icon: ReactNode`). [`apps/themes`](../themes) remains the canonical "look like native Root chrome" reference for anyone who wants strict identity with Root's own UI surfaces — sample apps standardize on `lucide-react` for breadth (it covers app-shell vocabulary like `Shield`, `BarChart3`, `LayoutDashboard` that the curated DevKit set was never designed for) and a single icon API across the family.

The `color-scheme` bridge in `client/src/lib/rootColorScheme.ts` keeps native form chrome (number-input spin buttons, scrollbars, `<select>` dropdowns) following Root's theme: `rootClient.theme.getTheme()` seeds the initial value (set before first paint in `index.tsx`), and `RootClientThemeEvent.ThemeUpdate` keeps it in sync. No component-level `color-scheme` overrides — the bridge handles everything at the document root.

## State

| Scope | Storage |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Active settings tab (`scoring` / `channels` / `members`) | `useState` in `views/Settings.tsx` |
| Leaderboard top-10 | `LeaderboardContext` fed by `GetLeaderboard` RPC + `LeaderboardUpdated` broadcast. When `allReset: true` arrives, the context clears to an empty list. |
| Own stats (rank/level/XP/progress/awards) | Local to `HomeView.tsx`. Initial fetch via `GetMyStats` on mount. Live updates come from the `"all"`-audience `MemberXpChanged` broadcast (handler filters by userId) — the view applies the new totalXp/level/rank and prepends the `award` (if present) to its recent-awards list. On `LeaderboardUpdated` with `allReset: true` (surfaced via `resetToken` on the leaderboard context), `HomeView` refetches `GetMyStats`. Server resolves channel names at response time; no client-side channel cache needed. |
| Settings data | `views/Settings.tsx` holds the GetSettings response. Each tab takes a slice and owns its own auto-save via `useDebouncedMutation`. Separate RPCs so concurrent admin edits across tabs don't stomp each other. |
| User profiles | `ProfilesContext` with batched `getUserProfiles` fetch + `UserProfileUpdate` subscription; cached by userId. `HomeView` requests profiles for every top-10 user + the caller. |
| `amIAdmin` | Returned on `GetLeaderboard`; stored in `LeaderboardContext`. Refreshed via a `reload()` call on every `AdminsChanged` broadcast (public, empty payload). Controls gear visibility in `AppHeader` and guards the settings view in the shell. |

No query cache library. Subscriptions are plain `useEffect` + SDK `.on(...)` / `.off(...)` in cleanup.

### Broadcasts

Four event types with distinct audiences:

| Event | Audience | Triggered by | Payload (approx) |
|---|---|---|---|
| `MemberXpChanged` | `"all"` — clients filter by `event.userId === myUserId` | Every XP earn; `ResetMemberXp` for the affected user | `{ userId, totalXp, level, rank, award? }` — 60–80 B |
| `LeaderboardUpdated` | `"all"` | Top-10 composition or order changes (coalesced 500ms); `ResetAllXp` (with `allReset: true`) | Top-10 snapshot — 320 B |
| `SettingsUpdated` | Admin-only (the admins `ReadOnlyMemberGroup` from `globalSettings.general.admins`) | UpdateScoringSettings, UpdateExcludedChannels, UpdateXpEligibleMembers | `{ settings, excludedChannelIds, xpEligibleMembers }`. Audience must match the admin gate on `GetSettings` — the payload carries user/role IDs that non-admins can't read via the RPC |
| `AdminsChanged` | `"all"` | globalSettings `general.admins` selection changed | Empty. Signals every client to re-fetch `GetLeaderboard` so promoted/demoted users pick up their new `amIAdmin` |

#### Why SettingsUpdated is admin-only

`SettingsUpdated` carries the XP-eligible user/role IDs and excluded channel IDs — data `GetSettings` refuses to serve to non-admins. If the broadcast went to `"all"`, a non-admin's client would receive via push what the RPC would deny it, a privacy leak. Gating the broadcast to the admins `ReadOnlyMemberGroup` matches the gate on the RPC. Known edge case: the community owner is an implicit admin (defence in depth in `adminCheck`), but if they're not also selected in the admins group they won't receive this broadcast; a Settings view they have open from another device just stays stale until the next fetch. In normal operation the owner IS in the group.

Because non-admins never receive `SettingsUpdated`, a separate public `AdminsChanged` event exists to tell every client "your amIAdmin may have changed — re-fetch `GetLeaderboard`." Empty payload on purpose; `amIAdmin` is computed from `globalSettings` which the client doesn't read directly, so the only way to pick up the new value is a server RPC round-trip.

#### Why MemberXpChanged uses `"all"`

The obvious call for a per-user event is `Client[]` targeting: `broadcastMemberXpChanged(event, [getClient(userId)])`. But `getClient(userId)` returns `undefined` when the user isn't currently attached to our app's channel — e.g., they're typing in community chat while our channel is backgrounded, or Root unloaded our client while they were inactive. Message events fire server-side regardless of which channel the user is looking at, so targeted broadcasts from the messageHandler frequently drop for the earning user. That's exactly the scenario that leaves the caller's own you-card stale after they earn XP elsewhere and return to the app.

`"all"` sidesteps the gap: every connected client receives every MemberXpChanged, and each client's handler filters `event.userId === currentUserId` before applying. Trade-off is N× fan-out per earn, which is trivial at community scale (~100s of active users) and acceptable into the low thousands. For much larger deployments, revisit with a `Client[]` broadcast + `ClientEvent.UserAttached` resync path + leaderboard-driven reconciliation — the machinery needed to make targeted reliable is substantial and not what this sample sets out to teach.

**Privacy note.** Under `"all"`, every client sees every other user's per-award payload — `award.channelId`, `award.channelName`, `award.amount`, `award.timestamp`. For this sample it's fine: XP totals are already public via the leaderboard, and the per-award granularity is comparable to reading chat activity. Apps forking this pattern for a more private domain (private channels, sensitive scoring events) should either use `Client[]` targeting with the reliability machinery above, or strip sensitive fields from the `"all"` payload and deliver them only via a narrower channel.

#### Reset semantics

- **`ResetMemberXp`** — fires one `MemberXpChanged` to the `"all"` audience (zeroed values, no `award`). Each client filters by userId; the reset user's clients apply the zero update and clear their awards list. Marks the leaderboard dirty only if that user was in the top 10.
- **`ResetAllXp`** — fires one `LeaderboardUpdated` with `allReset: true`. On receipt, each client clears any local caches and `HomeView` refetches from `GetMyStats` (triggered by a `resetToken` bump on the leaderboard context). One broadcast replaces what would otherwise be N targeted events.

## Permissions and roles

```json
{ "community": { "fullControl": true } }
```

### Why `fullControl`

`community.fullControl` is required because the Settings UI renders a tree of every channel in the community for per-channel XP exclusion. Enumerating the full channel tree (groups + channels, including private and admin-only ones the admin needs to be able to deny-list) requires the broad community read.

Apps that don't need to enumerate community structure should not request this permission — see [`api-samples/server-channels`](../../api-samples/server-channels) and [`api-samples/server-channel-groups`](../../api-samples/server-channel-groups) for scoped alternatives. A fork that, for example, stores a simple denylist of channel IDs the admin pastes in by hand can drop `fullControl` entirely.

### Roles

One app-level role:

| Role | Description |
|------|-------------|
| **App admins** | Users who can view and change the app's in-app Settings. Configured via Root's native Global Settings UI for this app (`general.admins`), **not** from inside the app. The community owner is implicitly an admin even if not explicitly selected — defence-in-depth so the owner can never lock themselves out. |

**App admins can**: view leaderboard + own stats; configure XP / cooldown / level curve; exclude channels; choose XP-eligible members; reset a member's XP or every member's XP.

**Other members can**: view leaderboard, own rank/level/XP/progress.

## Limits

Server is single source of truth. Shipped to the client via `GetSettingsResponse.limits` so input fields use the same `min`/`max` as server validation.

| Item | Limit |
|------|-------|
| Leaderboard size | Top 10 |
| Recent awards per member (history) | Latest 20 |
| XP per message | 1 to 1,000 |
| Cooldown | 0 to 3,600 seconds |
| Level curve coefficient | 10 to 10,000 |
| `UpdateExcludedChannels` payload | 1,000 channel IDs |
| `UpdateXpEligibleMembers` payload | 10,000 user IDs / 200 role IDs |

### Domain math

Every eligible message awards a fixed amount of XP (default 10). Total XP determines the member's *level* via `level = floor(sqrt(totalXp / curve))`, where `curve` is the **Level curve** setting (default 100). At the default curve, level 1 requires 100 XP, level 2 requires 400 XP, level 3 requires 900 XP — each successive level costs more than the last. Default cooldown 60 seconds.

### Excluded channels — fork note for privacy-sensitive deployments

This sample's deny-list default means any channel earns XP, including admin-only or staff-only channels with restricted access rules. If that's wrong for your fork, derive the default from the EVERYONE role's visibility instead of relying on the admin to remember to exclude private channels: `await rootServer.community.accessRules.listByRoleOrMember({ roleOrMemberId: WellKnownRootGuids.CommunityRoles.EveryoneRole })` returns the channel set the EVERYONE role can view at startup. Combine that with an access-rule subscription (or a periodic refresh) to keep it live, and AND the result with the admin's existing deny-list in the message handler.

## Empty / error / loading states

| View | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` (blocks until both leaderboard + own stats have responded once) | Fully empty community (no entries + caller has 0 XP): `<EmptyState title="No activity yet" body="Post in eligible channels to start earning XP." />`. Partial empty states (board has entries but caller has 0 XP; or vice versa) render a non-empty layout with a quieter in-place message. | `<QueryError onRetry />` that refetches both data sources. |
| Settings | `<Loader />` | n/a | `<QueryError />` |

Admin-denied settings (non-admin reaches `view === "settings"` somehow): the shell swaps back to home. The `Settings` component also uses `<AdminOnly>` as defence in depth. Server RPCs reject admin-only actions with `RootServerException(NotAdmin)` regardless.

### Copy strings (this sample)

Buttons: **Reset**, **Reset all XP**, **Refresh**, **Retry**.

**Auto-save status (AutoSaveStatus pill — error only):**
- Error: **Couldn't save — _{message}_.** + **Retry** action + dismiss (✕)
- Successful saves render nothing — the input itself reflects the new state.

**Typed confirmation — Reset member XP** (Settings → Scoring): section heading **Reset member XP**; help text *Reset one member's XP to zero. Cannot be undone.*; pick a member, then input placeholder **Type `{nickname}` to confirm**; danger button **Reset** disabled until the typed value matches the nickname exactly (case-sensitive). On success, picker and input both clear.

**Typed confirmation — Reset all XP** (Settings → Scoring): section heading **Reset all XP**; help text *This resets every member's XP to zero. This action cannot be undone.*; input placeholder **Type `reset all XP` to confirm**; danger button **Reset all XP** disabled until the input value is exactly `reset all XP` (case-sensitive). After a successful reset, the input clears and the button returns to disabled.

Empty leaderboard: **No activity yet** — Post in eligible channels to start earning XP.

Members tab, nothing selected: **Nothing selected — everyone in the community is earning XP.**

Stale-data banner in Settings (another admin just saved): **Settings were changed by another admin.** + **Refresh** action.

Admin-only action error (if server rejects): **You do not have permission to change settings.** — surfaced via the AutoSaveStatus error pill.

## Known production limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, or on infrastructure choices that vary per deployment. Forks should plan for them.

- **No reconnect-driven catch-up.** The client SDK does not currently surface a "reconnect" event. If a client briefly loses its WebSocket and reconnects, broadcasts that fired during the outage are lost. The leaderboard / you-card stay stale until the next live broadcast or a manual navigation that triggers a refetch. When the SDK exposes a reconnect hook, both `LeaderboardContext.reload()` and `HomeView.reloadMyStats()` should be wired to fire on it.
- **Cross-process settings cache coherence.** The in-memory caches in `appSettingsStore` and `excludedChannelsStore` are correct for a single-process app server. If the app is ever scaled horizontally, an admin's settings change will not invalidate the other instances' caches until each is restarted. Replace with a small pub/sub or always-DB-read pattern at that point.
- **Cooldown cache TTL eviction window.** Stale entries are dropped every 5 minutes if older than `2 × cooldownSeconds`. For deployments with millions of users in a single community this is enough; for orders of magnitude beyond that, an LRU bound on the map is the next step.
- **Telemetry sink.** `ReportClientError` writes to the server's structured log. Forks that want stack-frame mapping, grouping, or alerting should replace the log line with a Sentry/Datadog client.
