# Design

Implementation patterns for the leveling-leaderboard sample, plus an appendix at the end documenting this specific app's behavior. **If you're forking this sample, start with [Adapting this sample](#adapting-this-sample) to know what to copy verbatim, what to adapt, and what to replace.** For Root-wide design tokens and the icon library, see [`apps/themes`](../themes).

## Adapting this sample

Most of this doc describes patterns that transfer to any single-view, admin-gated, message-driven Root app. Some sections describe choices specific to a leveling/leaderboard domain. Use this map before mining the rest:

### Copy verbatim

These are infrastructure-level patterns that should work unchanged for any Root app of similar shape. Treat them as starter kit.

| Pattern | Where it lives |
|---|---|
| Stack (React 19 + Vite + plain CSS modules + protobuf RPC) | `package.json`, `vite.config.ts`, `tsconfig.json`, [Stack](#stack) |
| Visual token usage (`--rootsdk-*` CSS vars, no hardcoded colors/sizes) | All `*.module.css`, [Visual tokens](#visual-tokens) |
| `color-scheme` bridge to Root theme | `client/src/lib/rootColorScheme.ts` |
| `withRetry` / `withClientRetry` helpers | `server/src/lib/retry.ts`, `client/src/lib/retry.ts` |
| `pMap` / `pMapSettled` concurrency cap for SDK calls | `server/src/lib/pMap.ts` |
| `useDebouncedMutation` auto-save hook | `client/src/lib/useDebouncedMutation.ts` |
| `ErrorBoundary` + `ReportClientError` telemetry funnel | `client/src/components/ErrorBoundary.tsx` + the RPC handler |
| Broadcast coalesce pattern (chained `setTimeout`, dirty flag) | `server/src/leaderboardBroadcaster.ts` |
| `transaction` mutex + atomic UPSERT-with-WHERE pattern | `server/src/db.ts`, `server/src/xpStore.ts` |
| In-memory store cache + invalidation on update | `server/src/appSettingsStore.ts`, `server/src/excludedChannelsStore.ts` |
| `MemberGroup` for app-owned role/user selections | `server/src/xpEligibleGroup.ts` |
| `getByName` + `state.globalSettings.on("update")` admin pattern | `server/src/adminCheck.ts` |
| Type-to-confirm pattern for destructive actions | [Destructive confirmations](#destructive-confirmations) |
| Settings auto-save (debounced, error-only chrome) | All three tabs in `client/src/views/settings/` |

### Adapt

These structures translate but the names, payloads, and exact contents change with the domain.

| What to adapt | Notes |
|---|---|
| Component names + shapes | `LeaderboardRow`, `AppHeader`, etc. — keep the conventions (one `.tsx` + one `.module.css`, props typed, comments at top), swap the rendering. |
| Broadcast event names and payloads | The `"all"`-audience-with-client-filter, coalesce-on-the-server patterns transfer; the events themselves don't. |
| RPC list | The admin-gating pattern (`requireAdmin`, throws `RootServerException`) transfers; specific RPCs are domain. |
| Manifest `settings` group | Admin-list-via-`roleOrMember` pattern transfers; other settings are domain. |
| Settings tab structure | Three tabs is one shape; size as needed. The tab-bar component, auto-save pattern, and error-pill chrome are reusable. |
| Layout dimensions | 640px column, 64px row, 48px header — sensible defaults for a single-view admin app, but revisit per design. |
| `LeaderboardContext` / `ProfilesContext` | The "fetch + subscribe + update" Context pattern transfers; the data shape is domain. |

### Replace

These are pure domain content for *this* app. Don't read them as guidance for other apps.

| What to replace | Where it lives |
|---|---|
| Entire Behavior contract | [Appendix: Behavior of this sample](#appendix-behavior-of-this-sample) |
| Domain math (level curve, cooldown semantics, eligibility rules) | `server/src/level.ts`, `server/src/messageHandler.ts` |
| Stores tied to leveling (`xpStore`, `awardHistoryStore`, `xpEligibleGroup`, `appSettingsStore`, `excludedChannelsStore`) | `server/src/` — copy the *shape* (atomic SQL, in-memory cache, stable interfaces), replace the schema. |
| Copy strings (button labels, error messages, placeholder text) | Inline across components; consolidated reference in [Appendix → Copy](#copy-this-sample). |
| View-state specifics | [Appendix → View states](#view-states-this-sample). The components used (`Loader`, `QueryError`, `EmptyState`) transfer; the per-view conditions are domain. |
| `community.fullControl` permission | Required because Settings → Channels enumerates the community channel tree. Apps that don't need this should request a narrower permission. |

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
| User / role picker | `UserRoleSelector` from `@rootsdk/client-app-ui` (Lit web component), wrapped in a thin React component |

**No third-party UI stack.** No Tailwind, Radix, TanStack Query, framer-motion, or similar. First-party Root SDK packages (`@rootsdk/client-app`, `@rootsdk/client-app-ui`) are in scope — always prefer a platform-native primitive over reinventing one.

## Visual tokens

All colors, spacing, radii, typography, and shadows come from Root CSS custom properties. Never hardcode values. Full reference: [Design system reference](../../docs/llms/app-docs/develop/client/design-system-reference.md).

### Native form chrome (color-scheme)

Number-input spin buttons, scrollbars, `<select>` dropdowns, and other form chrome render with browser-default styling that follows the document's CSS `color-scheme` property. The sample bridges Root's theme to `color-scheme` in [`lib/rootColorScheme.ts`](client/src/lib/rootColorScheme.ts): `rootClient.theme.getTheme()` seeds the initial value (set before first paint in `index.tsx`), and `RootClientThemeEvent.ThemeUpdate` keeps it in sync when the user toggles Root's theme. No component-level `color-scheme` overrides — the bridge handles everything at the document root.

### Token usage in this app

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

### Spacing

Use only: `4, 8, 12, 16, 20, 24, 32, 48` px. No other values.

### Radius

- `12px` — panels, cards, inputs, content containers (default)
- `9999px` — pill buttons, progress-bar track
- `8px` — list items, dropdown options
- `6px` — icon buttons, avatars

Avatars use the 6px (square, slightly rounded) form to match Root's first-party chrome. Circular avatars read as consumer-social, which is not the voice of this app.

### Typography

System font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. No `@font-face`, no web fonts, no bundled font files. DevKit samples intentionally skip custom fonts to stay copy-ready without external assets.

| Purpose | Size | Line height | Weight |
|---|---|---|---|
| Page title | 24 | 32 | 600 |
| Section heading | 20 | 32 | 500 |
| Body / base | 14 | 20 | 400 |
| Button | 14 | 20 | 500 |
| Meta / caption | 12 | 16 | 400 |

### Shadows

- Panels: none
- Popovers and typeahead results: `0 4px 8px rgba(0, 0, 0, 0.15)`

## Layout

### App shell

Single-view UX with a push-view for admin settings. No tabs. `AppHeader` sits above a single content region that swaps between `HomeView` and `Settings`.

```
home view:                          settings view (admin):
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Leveling Leaderboard      ⚙  │    │ ← Settings                   │
├──────────────────────────────┤    ├──────────────────────────────┤
│  ┌──── Top 10 ─────────┐     │    │ [Scoring] Channels  Members  │
│  │ ranked rows         │     │    │ ─────────────────────────────│
│  │ ...                 │     │    │                              │
│  └─────────────────────┘     │    │   active tab content         │
│  ┌──── You card ───────┐     │    │   (auto-saves on change)     │
│  │ avatar, rank, bar   │     │    │                              │
│  │ "+N XP to join…"    │     │    │                              │
│  └─────────────────────┘     │    │                              │
│  ┌──── Recent awards ──┐     │    │                              │
│  │ ...                 │     │    │                              │
│  └─────────────────────┘     │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
```

- `AppHeader` is 48px, no bottom border (the content card surfaces below provide separation). Sits above the scroll container as a fixed flex row, so it stays visible without `position: sticky`.
- Home mode: app title on the left; gear icon on the right (only when `amIAdmin === true`).
- Settings mode: back chevron + view label on the left; nothing on the right.
- View state is a single `useState<"home" | "settings">` in `App.tsx`. No router library.
- Settings view is gated: if a non-admin ever reaches `view === "settings"`, the shell falls back to home. The `Settings` component still uses `<AdminOnly>` as defence in depth.

### Content

- Single centered column, `max-width: 640px`, margin `0 auto`. The column never widens beyond `640px` for this sample's content shape (a four-column-by-ten-row leaderboard); stretching it edge-to-edge on a widescreen monitor reads as sparse. Whitespace on either side is intentional. Apps with fundamentally different content shapes should revisit this width.
- Side padding `16px`; vertical padding `24px` top/bottom; `24px` gap between sections.
- Both `HomeView` and `Settings` share the same column constraint.

### Top 10 leaderboard

Renders the top 10 members ranked by total XP, live-updating from the `LeaderboardUpdated` broadcast.

- Row height: `64px` at every width.
- Row layout (`>= 640px`): rank (40px) → avatar (40px) → nickname (flex) → level (80px) → XP (96px, right-aligned).
- Row layout (`< 640px`): avatar (40px) → two-line stack `{ nickname (line 1) / "Level 5 · 420 XP" meta (line 2) }`. Rank is implied by list position; Level and XP columns collapse into the meta line.
- Top-3 ranks: at `>= 640px`, render the rank number in `--rootsdk-brand-secondary`. At `< 640px` (rank column hidden), render the nickname in `--rootsdk-brand-secondary` instead. No crowns, medals, or emoji.
- Caller's own row (when on the board): subtle `--rootsdk-highlight-light` background + a 3px inset left accent in `--rootsdk-brand-primary`, plus a small "You" tag next to the nickname.
- Tie-breaker: equal `total_xp` → earlier `last_award_at` ranks higher. Encoded in the SQL ordering.

### You-section

The layout under the leaderboard varies by whether the caller is on the board. Identity (avatar / rank / level / XP) is never shown twice in the same view. The `LeaderboardRow` component is shared between the Top 10 list and the off-board ghost row, so a caller's row keeps the same visual identity whether they're on the board or rendered as a ghost row outside it.

**On the board** (caller's `userId` appears in `entries`)
- Just a progress card: progress bar + the confirmation line `You're on the Top 10` + a small `NN% to Level L+1` aside.
- Identity and XP total live in the caller's highlighted row in the Top 10 above, so we don't repeat them.

**Off the board, with XP** (`entries` doesn't include the caller, `totalXp > 0`)
- **"Your position" ghost row** — a `LeaderboardRow` rendered in its own rounded container, just like a real board row, with the me-highlight treatment (highlight-light bg + 3px brand-primary left accent + "YOU" tag).
- Below the ghost row: progress card with progress bar + motivator `+N XP to join Top 10` (or `Keep earning XP to stay on the board` if the board isn't full) + `NN% to Level L+1` aside.

**Zero XP** — collapsed form showing `You haven't earned any XP yet.` plus a prompt to post in eligible channels. No row, no progress bar.

Progress bar: `8px` tall, `9999px` radius, `--rootsdk-brand-primary` fill, `--rootsdk-background-tertiary` track.

### Recent awards

- Rendered below the you-section only when `recentAwards.length > 0` (no heading rendered for zero-XP users).
- Uppercase meta-style heading `Recent awards` above a single rounded-12px panel containing the list.
- Row: `#channelName` (flex) · relative time · `+N XP` (right-aligned, `--rootsdk-brand-secondary`).
- Up to 20 rows. No pagination, no "show more".

### Settings

Three tabs inside the Settings view: **Scoring** / **Channels** / **Members**. The tab bar uses `SettingsTabs` — a 2px underline on the active tab, identical tab-bar styling at every width.

- **Scoring** — `NumberInput`s for XP per message, cooldown, level curve. Reset-member and reset-all actions (see Destructive confirmations below). Server is the single source of truth for input bounds; they ship to the client via `GetSettingsResponse.limits` and feed `NumberInput`'s `min`/`max` props.
- **Channels** — `ChannelTree` with per-channel toggles. Tree filters out non-text channels (Voice, App) and app-owned channels server-side; the client only ever sees channels XP could realistically accrue in.
- **Members** — `RootUserRoleSelector` (multi mode). Controls the XP-eligible MemberGroup. Apps and bots are filtered out of the user selection client-side via `isPersonId`; the server also rejects app GUIDs as defence in depth.

**No Save buttons.** Every non-destructive change auto-saves. Edits push through `useDebouncedMutation` (150ms): rapid input coalesces into one RPC, last value wins. Successful saves are invisible — a transient "Saving…" pill per keystroke is too brief to read and shifts layout. Only failures get chrome: `AutoSaveStatus` renders an error pill (with Retry + Dismiss) that stays until resolved.

Admins themselves are managed via Root's native Global Settings UI (manifest setting `general.admins`) — there is no in-app admin section.

### Destructive confirmations

No modal dialogs. One inline pattern — **type-to-confirm** — handles every destructive action. The admin types the exact name of what they're destroying; the danger button stays disabled until the text matches. Case-sensitive, matching Root's native "Delete community" pattern.

The implementation: a text input + danger button rendered after the picker (when applicable), wired by a single `value === expected` comparison. No new component is needed; the pattern is composed from `TextInput` + `Button`.

In this sample, the pattern is used for both reset actions (member-level and all-XP). The exact placeholders and matching strings for *this* app live in [Appendix → Copy](#copy-this-sample); for forks, the pattern is what transfers — pick your own confirmation strings.

Both are CSS + state. There is no `Dialog` component in this sample. Auto-save does NOT apply to destructive actions — they never fire without the typed match.

## Responsive

The app is mobile-first: every interactive element meets touch-target minimums, layouts adapt down to 320px, and nothing requires a pointer. Two width tiers:

| Width | Tier | Behavior |
|---|---|---|
| `< 640px` | **Mobile** | Single column, full-width of viewport minus `16px` side padding. Leaderboard: hide Rank column, stack Level + XP under nickname. You card: stacks vertically, progress bar full-width. Settings: inputs full width; tab bar horizontal. ChannelTree: groups collapsed by default. |
| `>= 640px` | **Desktop** | Same centered column, capped at `640px`. All leaderboard columns visible. ChannelTree: groups expanded by default. |

### Touch targets

All interactive elements meet the 44×44 px minimum at every width, not only mobile. Touch-sized on desktop is still good desktop UX.

| Element | Min height |
|---|---|
| Header buttons (gear, back) | 44×44 |
| Settings tab bar items | 44px |
| Buttons (all variants) | 44px |
| ChannelTree rows | 44px (entire row tappable for expand/collapse and toggle) |
| Icon-only buttons | 44×44 |
| Leaderboard rows | 44px |

### Collapsibles

- **ChannelTree:** chevron on left, group name, count badge on right. Whole row is the tap target for expand/collapse. At `< 640px` all groups start collapsed; user taps to drill in. At wider widths all groups start expanded.

### Minimums

- Supported panel width: `320px` (iPhone SE portrait). Below this, horizontal scroll; no further adaptation.

### Overflow

- Long lists (leaderboard, channel tree, recent awards) scroll within the content region; `AppHeader` sits above the scroll container as a fixed flex row, so it stays visible without needing `position: sticky`.

## Motion

Minimal and purposeful.

| Element | Transition |
|---|---|
| Button hover | `opacity 200ms` |
| Button press | `opacity 200ms`, `transform: scale(0.98)` |
| Row hover | `background-color 150ms` |
| Home ↔ Settings push-view | None — instant swap (same viewport, no slide animation) |
| Inline confirm reveal | `opacity 150ms` on the swapped controls; no layout animation (container width is preserved) |
| Leaderboard row reorder | Snap. On XP award, briefly pulse the affected row's background with `--rootsdk-highlight-light` for `400ms` as a visual cue. |
| Progress bar fill | `width 300ms ease-out` |

No animation library. No FLIP. No View Transitions API.

## Icons

Copy [`apps/themes/client/src/components/Icon.tsx`](../themes/client/src/components/Icon.tsx) into this sample's `client/src/components/`. Use icons from [`icons.json`](../themes/client/src/generated/icons.json) (144 icons, 12 categories).

```tsx
<Icon name="Trophy" size={16} />
<Icon name="Settings" size={20} />
```

If an icon is missing from the set, inline the SVG directly rather than adding a library.

## Components

Hand-rolled in `client/src/components/`. One `.tsx` + one `.module.css` per component.

| Component | Purpose |
|---|---|
| `AppHeader` | Top bar with two modes: home (title + gear) and settings (back chevron + label). Gear renders only when `amIAdmin`. Sits above the scroll container so it's always visible without `position: sticky` |
| `LeaderboardRow` | One row of rank / avatar / nickname / level / XP. Used in both the Top 10 list and the "Your position" ghost row so both placements are visually identical. Pulses on XP change; me-highlight when `isMe` |
| `SettingsTabs` | Sub-navigation tab bar used inside the Settings view. Three tabs: Scoring / Channels / Members |
| `AutoSaveStatus` | Inline error pill that appears only when an auto-save fails — Retry + Dismiss. Successful saves render nothing |
| `Button` | Variants: `primary`, `outline`, `danger`, `text` |
| `NumberInput` | Labeled integer input with min/max |
| `TextInput` | Labeled text input |
| `Avatar` | Renders the profile picture via `rootClient.assets.toImageUrl(profilePictureUri, "small")` as a 6px-rounded square. Falls back to a coloured initial (first character of nickname on a token-based background) when `profilePictureUri` is missing. |
| `ChannelTree` | Expandable group → channel toggle tree for Settings → Channels |
| `RootUserRoleSelector` | Thin React wrapper around `<rootsdk-user-role-selector>` from `@rootsdk/client-app-ui`. Used in the Members tab (multi-select) and for the Reset member XP picker (single-select). See the API reference at [docs/llms/app-api-reference/client/classes/UserRoleSelector.md](../../../docs/llms/app-api-reference/client/classes/UserRoleSelector.md). |
| `AdminOnly` | Conditional wrapper gated on server-provided `amIAdmin` |
| `QueryError` | Error state with retry button |
| `Loader` | Loading state |
| `EmptyState` | Consistent empty state (title + optional body + optional action) |
| `Icon` | From themes sample |

## State

| Scope | Storage |
|---|---|
| Current view (`home` / `settings`) | `useState<"home" \| "settings">` in `App.tsx` |
| Active settings tab (`scoring` / `channels` / `members`) | `useState` in `views/Settings.tsx` |
| Leaderboard top-10 | `LeaderboardContext` fed by `GetLeaderboard` RPC + `LeaderboardUpdated` broadcast. When `allReset: true` arrives, the context clears to an empty list. |
| Own stats (rank/level/XP/progress/awards) | Local to `HomeView.tsx`. Initial fetch via `GetMyStats` on mount. Live updates come from the `"all"`-audience `MemberXpChanged` broadcast (handler filters by userId) — the view applies the new totalXp/level/rank and prepends the `award` (if present) to its recent-awards list. On `LeaderboardUpdated` with `allReset: true` (surfaced via `resetToken` on the leaderboard context), `HomeView` refetches `GetMyStats`. Response shape: total XP, level, rank, progress-to-next-level (0–1), and the caller's 20 most recent awards (each carrying channel name, timestamp, and XP amount). Server resolves channel names at response time; no client-side channel cache needed. |
| Settings data | `views/Settings.tsx` holds the GetSettings response. Each tab takes a slice and owns its own auto-save via `useDebouncedMutation`. Separate RPCs — `UpdateScoringSettings`, `UpdateExcludedChannels`, `UpdateXpEligibleMembers` — so concurrent admin edits across tabs don't stomp each other. |
| User profiles | `ProfilesContext` with batched `getUserProfiles` fetch + `UserProfileUpdate` subscription; cached by userId. `HomeView` requests profiles for every top-10 user + the caller (so the you-card can show avatar + nickname). |
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

#### Why MemberXpChanged uses `"all"` (not targeted)

The obvious call for a per-user event is `Client[]` targeting: `broadcastMemberXpChanged(event, [getClient(userId)])`. But `getClient(userId)` returns `undefined` when the user isn't currently attached to our app's channel — e.g., they're typing in community chat while our channel is backgrounded, or Root unloaded our client while they were inactive. Message events fire server-side regardless of which channel the user is looking at, so targeted broadcasts from the messageHandler frequently drop for the earning user. That's exactly the scenario that leaves the caller's own you-card stale after they earn XP elsewhere and return to the app.

`"all"` sidesteps the gap: every connected client receives every MemberXpChanged, and each client's handler filters `event.userId === currentUserId` before applying. Trade-off is N× fan-out per earn, which is trivial at community scale (~100s of active users) and acceptable into the low thousands. For much larger deployments, revisit with a `Client[]` broadcast + `ClientEvent.UserAttached` resync path + leaderboard-driven reconciliation — the machinery needed to make targeted reliable is substantial and not what this sample sets out to teach.

**Privacy note.** Under `"all"`, every client sees every other user's per-award payload — `award.channelId`, `award.channelName`, `award.amount`, `award.timestamp`. For this sample it's fine: XP totals are already public via the leaderboard, and the per-award granularity is comparable to reading chat activity. Apps forking this pattern for a more private domain (private channels, sensitive scoring events) should either use `Client[]` targeting with the reliability machinery above, or strip sensitive fields from the `"all"` payload and deliver them only via a narrower channel (e.g., a targeted follow-up RPC or a `MemberGroup` of the specific user).

#### Coalescing

`LeaderboardUpdated` is coalesced because chat volume in a busy community can produce many top-10-affecting changes per second; without coalescing, the `"all"` audience would see a flood of identical-shape events. `MemberXpChanged` is NOT coalesced — even though it now also fires to `"all"`, per-user earns are naturally rate-limited by the `cooldown` setting (default 60s = at most one earn per user per minute). Coalescing would add complexity without measurable savings at typical chat cadences.

- Each XP change that affects the top 10 (moves a member within it, or into or out of it) marks the leaderboard dirty.
- A server-side timer ticks every `500ms` (chained `setTimeout` rather than `setInterval` so a slow broadcast can't overlap with the next tick); if dirty is set, the server sends one `LeaderboardUpdated` with the current top-10 snapshot and clears the flag.
- XP changes that do not affect the top 10 never mark the leaderboard dirty. The earning user still receives their own `MemberXpChanged` event (the `"all"` audience reaches them; their client's filter matches `event.userId`).

This caps the `"all"`-audience leaderboard rate at 2/s per community regardless of chat volume, while keeping perceived latency under 500ms.

#### Reset semantics

- **`ResetMemberXp`** — fires one `MemberXpChanged` to the `"all"` audience (zeroed values, no `award`). Each client filters by userId; the reset user's clients apply the zero update and clear their awards list. Marks the leaderboard dirty only if that user was in the top 10.
- **`ResetAllXp`** — fires one `LeaderboardUpdated` with `allReset: true`. On receipt, each client clears any local caches and `HomeView` refetches from `GetMyStats` (triggered by a `resetToken` bump on the leaderboard context). One broadcast replaces what would otherwise be N targeted events.

#### Eligibility changes

XP-eligible members are stored in a platform-managed `MemberGroup` owned by this app (`resourceType: "levelingLeaderboard"`, `name: "xpEligible"`). When admins edit the Members tab, the client fires `UpdateXpEligibleMembers` which calls `memberGroup.update({ userIds, communityRoleIds })`. The platform resolves role membership into the group's `memberUserIds` set automatically. The message handler checks `xpEligibleGroup.isEligible(userId)` synchronously on every incoming message — O(1) against `memberUserIdsAsSet`.

Past XP and leaderboard positions are preserved across eligibility changes (see Appendix → Eligible members). Only future awards are affected. The server broadcasts `SettingsUpdated` after an edit so other admin clients refresh their form state.

**Why a MemberGroup vs a custom table:** the platform auto-syncs resolved membership on community role changes (user joins/leaves role → group updates). We'd otherwise need to subscribe to role-membership events and maintain our own resolved set. Member groups are also a first-class broadcast target (unused here, but available for future features like "notify xp-eligible users" without fanning out to every client).

---

# Appendix: Behavior of this sample

Everything from here down is specific to leveling-leaderboard. If you're forking this for a different domain, replace this section wholesale and use the rest of the doc as your patterns library.

## Overview

Leveling Leaderboard is a community app that rewards members for participating in conversations. Every message a member posts in an eligible channel earns them *XP* (experience points). XP accumulates into *levels*, and the top-ranked members appear on a live leaderboard visible to everyone in the community. Community leaders control who earns XP, how much, and which channels count.

The app helps communities recognize their most active contributors and gives members a lightweight sense of progression as they engage.

## How XP is awarded

When a member sends a message, the app evaluates three conditions before awarding XP:

1. The member is in the eligible group.
1. The channel is not on the excluded list.
1. The *cooldown* since the member's last award has elapsed.

If all three pass, the member earns XP and their total updates in real time for every connected viewer.

### XP and levels

Every eligible message awards a fixed amount of XP (default 10). Total XP determines the member's *level* via `level = floor(sqrt(totalXp / curve))`, where `curve` is the **Level curve** setting (default 100). At the default curve, level 1 requires 100 XP, level 2 requires 400 XP, level 3 requires 900 XP — each successive level costs more than the last. Admins adjust the XP amount and curve from settings.

### Cooldown

To prevent farming, each member has a cooldown between XP awards. If a member posts ten messages in quick succession, only the first earns XP until the cooldown elapses. Default 60 seconds.

### Award history

Every XP award is recorded with recipient, channel, amount, and timestamp. Each member sees their own most recent awards on the home view. The history retains the 20 most recent awards per member; older awards are discarded to bound storage.

### Eligible members

*Eligible members* is a platform-managed member group owned by the app. Admins edit it from the in-app Settings → Members tab; selections may be roles, individual users, or both. If nothing is selected, every community member earns XP. If anything is selected, only matching users earn XP. The app reads the group's resolved membership on every incoming message; role-membership changes take effect immediately without restart.

Eligibility changes apply to future awards only. Members who earned XP while previously eligible keep that XP and their leaderboard position; they simply stop accruing until they're eligible again.

### Excluded channels

Messages in excluded channels never earn XP. Useful for announcement channels, bot-only channels, or anywhere activity should not count toward rank. Admins manage the excluded list from Settings → Channels. Default is empty — every channel earns XP until an admin excludes it.

**Fork note for privacy-sensitive deployments.** This sample's deny-list default means any channel earns XP, including admin-only or staff-only channels with restricted access rules. If that's wrong for your fork, derive the default from the EVERYONE role's visibility instead of relying on the admin to remember to exclude private channels: `await rootServer.community.accessRules.listByRoleOrMember({ roleOrMemberId: WellKnownRootGuids.CommunityRoles.EveryoneRole })` returns the channel set the EVERYONE role can view at startup. Combine that with an access-rule subscription (or a periodic refresh) to keep it live, and AND the result with the admin's existing deny-list in the message handler.

## Roles and permissions

One app-level role:

| Role | Description |
|------|-------------|
| **App admins** | Users who can view and change the app's in-app Settings. The community owner is always an admin. |

Admins are configured via the Root platform's native Global Settings UI for this app (manifest setting `general.admins`), **not** from inside the app. The community owner is implicitly an admin even if not explicitly selected — defence-in-depth so the owner can never lock themselves out.

**App admins can**: view leaderboard + own stats; configure XP / cooldown / level curve; exclude channels; choose XP-eligible members; reset a member's XP or every member's XP.

**Other members can**: view leaderboard, own rank/level/XP/progress.

## Limits

| Item | Limit |
|------|-------|
| Leaderboard size | Top 10 |
| Recent awards per member (history) | Latest 20 |
| XP per message | 1 to 1,000 |
| Cooldown | 0 to 3,600 seconds |
| Level curve coefficient | 10 to 10,000 |
| `UpdateExcludedChannels` payload | 1,000 channel IDs |
| `UpdateXpEligibleMembers` payload | 10,000 user IDs / 200 role IDs |

## View states (this sample)

| View | Loading | Empty | Error |
|---|---|---|---|
| HomeView | `<Loader />` (blocks until both leaderboard + own stats have responded once) | Fully empty community (no entries + caller has 0 XP): `<EmptyState title="No activity yet" body="Post in eligible channels to start earning XP." />`. Partial empty states (board has entries but caller has 0 XP; or vice versa) render a non-empty layout with a quieter in-place message. | `<QueryError onRetry />` that refetches both data sources. |
| Settings | `<Loader />` | n/a | `<QueryError />` |

Admin-denied settings (non-admin reaches `view === "settings"` somehow): the shell swaps back to home. The `Settings` component also uses `<AdminOnly>` as defence in depth. Server RPCs reject admin-only actions with `RootServerException(NotAdmin)` regardless.

## Copy (this sample)

Buttons: **Reset**, **Reset all XP**, **Refresh**, **Retry**.

**Auto-save status (AutoSaveStatus pill — error only):**
- Error: **Couldn't save — _{message}_.** + **Retry** action + dismiss (✕)
- Successful saves render nothing — the input itself reflects the new state.

**Typed confirmation — Reset member XP** (Settings → Scoring):
- Section heading: **Reset member XP**
- Help text: Reset one member's XP to zero. Cannot be undone.
- Pick a member from the picker, then:
- Input placeholder: **Type `{nickname}` to confirm** (nickname of the picked member)
- Danger button label: **Reset** — disabled until the typed value matches the nickname exactly (case-sensitive). On success, picker and input both clear.

**Typed confirmation — Reset all XP** (Settings → Scoring):
- Section heading: **Reset all XP**
- Help text: This resets every member's XP to zero. This action cannot be undone.
- Input placeholder: **Type `reset all XP` to confirm**
- Danger button label: **Reset all XP** — disabled until the input value is exactly `reset all XP` (case-sensitive). After a successful reset, the input clears and the button returns to disabled.

Empty leaderboard: **No activity yet** — Post in eligible channels to start earning XP.

Members tab, nothing selected: **Nothing selected — everyone in the community is earning XP.**

Stale-data banner in Settings (another admin just saved): **Settings were changed by another admin.** + **Refresh** action.

Admin-only action error (if server rejects): **You do not have permission to change settings.** — surfaced via the AutoSaveStatus error pill.
