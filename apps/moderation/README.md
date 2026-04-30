# moderation

Automatic content filter, spam detection, and rate limiting for a Root community, with a full audit log, analytics view, and admin Settings. Triggers run server-side on every channel message; admins can also take manual kick/ban/delete actions from the dashboard or audit log. Full behavior contract and implementation patterns in [DESIGN.md](DESIGN.md).

## Coverage scope

**Demonstrates** — for the full cross-referenced patterns library, see [DESIGN.md](DESIGN.md). At a glance:

*Server-side moderation*
- **Message-pipeline rule order** — `ChannelMessageCreated` AND `ChannelMessageEdited` events → system/non-Person filter → monitored-channel filter → exempt-members short-circuit → content filter → spam detection → rate limit. First match wins. Edits run only the content filter (spam + rate-limit observations already counted on creation).
- **Compiled-alternation regex matchers** — slur, profanity, custom, and allowed lists each compile to a single `RegExp` cached alongside the row cache; per-message work is one `regex.exec()` per category, not a per-term loop. User-supplied custom words are escaped → no regex-DoS surface.
- **Built-in slur/profanity lists + admin-managed custom list + allowed-words exception list** — leet-fold normalization handles "l33t" and similar substitutions; allowed words cancel matches at the same span.
- **Username filter** — same matchers run against community nicknames on `UserSetProfile` + `CommunityMemberAttach` with per-user dedup; nickname match → ban.
- **Frozen-at-write nicknames** — every audit row freezes `targetNickname` + `actorNickname` at the moment of action via a TTL-cached `communityMembers.get` resolver; the audit log's "Username" filter + display work without per-row SDK lookups at read time.
- **Per-message moderation actions audited through one funnel** — every audit entry (automated rule hit + manual delete/kick/ban + clear-audit-log trailer) flows through `auditDispatch.onAuditEntry`, which atomically inserts and broadcasts.
- **Outbound-SDK call rate-limit queue** — token-bucket throttler around `channelMessages.delete/create` and `communityMemberBans.create/kick` so bursts don't blow through the platform's command quota.
- **Rule-failure visibility** — exceptions thrown mid-pipeline get captured into a placeholder audit row (`RuleType.UNSPECIFIED`, action "rule error") so admins see the failure in the log instead of silent message-stays-up.
- **Daily retention prune via `JobInterval.Daily`** — cleans up audit log + sliding-window detector buffers; idempotent reschedule on startup.

*Admin gating + broadcasts*
- **`isAdmin` resolved against `globalSettings.general.admins ∪ ownerUserId`** (owner is implicitly an admin — defence in depth).
- **Custom `MemberGroup` for the admin broadcast audience** mirroring `admins ∪ owner` — required so an owner driving Settings receives their own `SettingsChanged` updates even when not in the picker.
- **Exempt members picker** — second `globalSettings` `roleOrMember` group; matched members bypass every automated rule (manual admin actions are unaffected). Watcher fires `SettingsChanged` when the picker moves so the in-app General tab refreshes without a manual reload.
- **Public/admin broadcast split** — `SettingsChanged` (admin-only) vs `AuditLogAppended` and `AdminsChanged` (public, payload-free).

*RPC contract patterns*
- **Per-field auto-save with separate per-field RPCs** (16 settings setters) so concurrent admin edits to different fields don't coalesce into payloads that re-stomp unrelated state.
- **Atomic per-field writes via `dataStore.appData.update()`** — read-modify-write race closed at the KV layer.
- **Bulk write with `INSERT OR IGNORE` + per-row `runWithChanges`** — see `wordListStore.importWords`. Race-safe under concurrent overlapping imports; the unique-index conflict is silently absorbed and the duplicate count derives from the `changes` value rather than a pre-SELECT diff.
- **Server-side bounds on every value the server stores or schedules off** — client `NumberInput` `min`/`max` are UX, not enforcement. Bulk-import paths cap both array length AND post-split candidate count.
- **Centralized dispatch funnel** (`auditDispatch.onAuditEntry`) decoupled from the service via a registration callback to avoid circular imports.
- **`RootServerException` with structured proto-defined error codes** — `ModerationError.{NOT_ADMIN, INVALID_SETTINGS, INVALID_WORD, NOT_FOUND, INVALID_TARGET}`.
- **`ReportClientError` telemetry funnel** — server-side per-caller rate limit (5/min) + per-field size caps + 10× hard reject.

*Settings UX*
- **Admin-gated in-app Settings with per-field auto-save** — no Save buttons; debounced commit per field; `AutoSaveStatus` pill surfaces errors only.
- **Master-toggle + indented sub-toggle pattern** — `MasterSubToggleGroup` connects dependent rows under a master via a 2px left border.
- **Show/Hide gate for sensitive content** — the custom-words list is hidden by default behind `ShowWordListGate` so an admin's screen doesn't display offensive content just because they opened Settings.
- **Two-tier destructive confirms** — `InlineConfirm` (two-click) for low-stakes recoverable actions (kick, ban, word delete) and `TypeToConfirm` (type-the-phrase) for irreversible bulk operations (Clear audit log). Destructive icon-buttons are red at rest.
- **Bulk word import** — paste a CSV or newline-list into a textarea; one RPC inserts everything with a result toast (`Added 47, 3 duplicates, 2 invalid`).
- **Temp ban with auto-expiry** — `MemberActions` ban surfaces a Permanent / 1d / 7d / 30d picker; the SDK lifts non-permanent bans automatically when the timestamp passes.
- **Warning post cooldown + @mention markup** — public warnings are debounced per `(userId, channelId)` for 10 minutes (one rapidly-violating user can't flood the channel) and use `[@nickname](root://user/<id>)` markup so the warned user gets a notification.

*UI shell + visual primitives*
- **Sidebar (≥960px) + MobileHeader/drawer (<960px)** with shared `navItems` config so the two surfaces can never drift. Drawer has a focus trap, body-scroll lock, and Escape close (`useFocusTrap`).
- **Audit log: responsive table + card variant** — `≥640px` renders a 7-column table; `<640px` renders a stacked-card list of the same data. CSS-gated; no horizontal scroll on mobile.
- **Root design tokens only** — every color is a `var(--rootsdk-*)` reference; tints via `color-mix` at 12%/20% opacity. See [DESIGN.md → Visual tokens](DESIGN.md#visual-tokens).
- **Canonical Switch, Select, IconBox, Badge, Pill, Panel, StatCard** — all derived from `apps/themes/.../design-tokens.json` componentPatterns.

*Foundation (every Root app)*
- **`color-scheme` bridge** to Root theme via `lib/rootColorScheme.ts`.
- **`withRetry`/`withClientRetry`** with bounded jitter on every SDK/RPC call.
- **`ErrorBoundary` + `ReportClientError` telemetry funnel** — root + per-view boundaries; render crashes surface in the server log.
- **`useDebouncedMutation` auto-save hook** — copied verbatim from `apps/leveling-leaderboard`.

**Out of scope (this product shape doesn't need them):**
- Per-channel posting / messaging surfaces — see [`api-samples/server-messages`](../../api-samples/server-messages).
- File or asset handling — see [`api-samples/client-app-assets`](../../api-samples/client-app-assets) and [`api-samples/server-files`](../../api-samples/server-files).

**Intentionally simplified for teaching (a fork may need them):**
- Word lists ship as small placeholders. A production deployment seeds them from a curated source the platform owns; this sample uses two `exampleslur*` and two `exampleprofanity*` placeholders so the matcher can be exercised without shipping any actual hateful content in a public sample.

## Permissions

```json
{
  "community": { "fullControl": true }
}
```

The app needs to delete messages, kick/ban members, and read every channel's metadata — `community.fullControl` covers this surface in one declaration. A fork may prefer least-privilege (specifically `community.{kick, createBan}` + `channel.{createMessage, deleteMessageOther, viewMessageHistory}`) — both are valid; the fullControl declaration is shorter for a sample.

App admins are managed via Root's native Global Settings UI (manifest setting `general.admins`, `roleOrMember` selector with `roleMultiAndUserMulti`) — the app does not expose admin management in its own Settings.

## Storage

- **KV (`rootServer.dataStore.appData`)** — all flat scalar settings, one key per group: `settings/content-filter`, `settings/spam-control`, `settings/rate-limit`, `settings/general`, `settings/username-filter`. Per-field setters use `dataStore.appData.update()` for atomic merges.
- **SQLite** — relational data: `words` (custom + allowed lists, split on `category`), `audit_log` (paginated query target), `recent_messages` (spam detector sliding buffer), `rate_messages` (rate limiter sliding buffer), `monitored_channels` (admin-selected channel set; empty list = monitor all).

See [DESIGN.md → Storage shape](DESIGN.md#storage-shape) for why each value lives where it does.

## Known limits

- **Word lists ship as placeholders.** The built-in slur/profanity arrays in `server/src/builtinWordLists.ts` are intentionally non-offensive. A fork should replace them from a curated source.

Use this sample as a shape reference for app-managed scalar config (per-field auto-save), admin-gated mutations + admin-audience broadcasts, message-pipeline rules with audit dispatch funnel, and the Sidebar+drawer responsive shell with `var(--rootsdk-*)` tokens throughout. See the listed api samples for concerns it doesn't cover, and [`apps/README.md`](../README.md) for the full sample-app catalog.
