# moderation

Automatic content filter, spam detection, and rate limiting for a Root community, with a full audit log, analytics view, and admin Settings. Triggers run server-side on every channel message; admins can also take manual kick/ban/delete actions from the dashboard or audit log. Full behavior contract and implementation patterns in [DESIGN.md](DESIGN.md).

## Coverage scope

**Demonstrates** — for the full cross-referenced patterns library, see [DESIGN.md → Adopting this sample](DESIGN.md#adopting-this-sample). At a glance:

*Server-side moderation*
- **Message-pipeline rule order** — `ChannelMessageCreated` event → system/non-Person filter → monitored-channel filter → content filter → spam detection → rate limit. First match wins; system messages and other apps' messages are skipped.
- **Built-in slur/profanity lists + admin-managed custom list + allowed-words exception list** — leet-fold normalization handles "l33t" and similar substitutions; allowed words cancel matches at the same span.
- **Per-message moderation actions audited through one funnel** — every audit entry (automated rule hit + manual delete/kick/ban) flows through `auditDispatch.onAuditEntry`, which atomically inserts and broadcasts.
- **Daily retention prune via `JobInterval.Daily`** — cleans up audit log + sliding-window detector buffers; idempotent reschedule on startup.

*Admin gating + broadcasts*
- **`isAdmin` resolved against `globalSettings.general.admins ∪ ownerUserId`** (owner is implicitly an admin — defence in depth).
- **Custom `MemberGroup` for the admin broadcast audience** mirroring `admins ∪ owner` — required so an owner driving Settings receives their own `SettingsChanged` updates even when not in the picker.
- **Public/admin broadcast split** — `SettingsChanged` (admin-only) vs `AuditLogAppended` and `AdminsChanged` (public, payload-free).

*RPC contract patterns*
- **Per-field auto-save with separate per-field RPCs** (15 settings RPCs) so concurrent admin edits to different fields don't coalesce into payloads that re-stomp unrelated state.
- **Atomic per-field writes via `dataStore.appData.update()`** — read-modify-write race closed at the KV layer.
- **Server-side bounds on every value the server stores or schedules off** — client `NumberInput` `min`/`max` are UX, not enforcement.
- **Centralized dispatch funnel** (`auditDispatch.onAuditEntry`) decoupled from the service via a registration callback to avoid circular imports.
- **`RootServerException` with structured proto-defined error codes** — `ModerationError.{NOT_ADMIN, INVALID_SETTINGS, INVALID_WORD, NOT_FOUND, INVALID_TARGET}`.
- **`ReportClientError` telemetry funnel** — server-side per-caller rate limit (5/min) + per-field size caps + 10× hard reject.

*Settings UX*
- **Admin-gated in-app Settings with per-field auto-save** — no Save buttons; debounced commit per field; `AutoSaveStatus` pill surfaces errors only.
- **Master-toggle + indented sub-toggle pattern** — `MasterSubToggleGroup` connects dependent rows under a master via a 2px left border.
- **Show/Hide gate for sensitive content** — the custom-words list is hidden by default behind `ShowWordListGate` so an admin's screen doesn't display offensive content just because they opened Settings.
- **Inline two-step confirm for low-stakes destructive actions** — `InlineConfirm` for kick/ban (via `MemberActions`) and word deletion. Destructive icon-buttons are red at rest.

*UI shell + visual primitives*
- **Sidebar (≥960px) + MobileHeader/drawer (<960px)** with shared `navItems` config so the two surfaces can never drift. Drawer has a focus trap, body-scroll lock, and Escape close (`useFocusTrap`).
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
- External-service polling with chained `OneTime` jobs — see [`apps/github-release-watcher`](../github-release-watcher).
- Real-time member leaderboards / XP — see [`apps/leveling-leaderboard`](../leveling-leaderboard).

**Intentionally simplified for teaching (a fork may need them):**
- Word lists ship as small placeholders. A production deployment seeds them from a curated source the platform owns; this sample uses two `exampleslur*` and two `exampleprofanity*` placeholders so the matcher can be exercised without shipping any actual hateful content in a public sample.
- The Audit Log uses an overflow-scrolling table at narrow widths instead of a stacked-card variant. Acceptable for an admin-only screen; a fork that wants the card variant can lift the pattern from this sample's existing `RecentActivityRow`.
- Real chart rendering (stacked bars, horizontal bars) deferred to a later polish pass. Sprint 3 ships the panels with frame, header, EmptyState, and a CSS-bar list when data exists.
- Cross-process settings cache coherence — single-process app server only.

## Permissions

```json
{
  "community": { "fullControl": true }
}
```

The app needs to delete messages, kick/ban members, and read every channel's metadata — `community.fullControl` covers this surface in one declaration. A fork may prefer least-privilege (specifically `community.{kick, createBan}` + `channel.{createMessage, deleteMessageOther, viewMessageHistory}`) — both are valid; the fullControl declaration is shorter for a sample.

App admins are managed via Root's native Global Settings UI (manifest setting `general.admins`, `roleOrMember` selector with `roleMultiAndUserMulti`) — the app does not expose admin management in its own Settings.

## Storage

- **KV (`rootServer.dataStore.appData`)** — all flat scalar settings, one key per group: `settings/content-filter`, `settings/spam-control`, `settings/rate-limit`, `settings/general`. Per-field setters use `dataStore.appData.update()` for atomic merges.
- **SQLite** — relational data: `words` (custom + allowed lists, split on `category`), `audit_log` (paginated query target), `recent_messages` (spam detector sliding buffer), `rate_messages` (rate limiter sliding buffer), `monitored_channels` (admin-selected channel set; empty list = monitor all).

See [DESIGN.md → Storage shape](DESIGN.md#storage-shape) for why each value lives where it does.

## Known limits

- **No reconnect-driven catch-up.** The client SDK does not currently surface a "reconnect" event. If a client briefly loses its WebSocket, broadcasts that fired during the outage are lost. Relevant views stay stale until the next live broadcast or manual navigation triggers a refetch.
- **Single-process app server.** The in-memory caches in `settingsStore`, `wordListStore`, `monitoredChannelsStore`, and `channelNameCache` are correct for one app-server instance. A horizontal-scale deployment would need cache-invalidation pub/sub or always-DB reads.
- **Audit log mobile = horizontal scroll.** Acceptable for an admin-only screen; a stacked-card variant is a future polish pass.
- **Charts are CSS-bar lists, not real plots.** Frame, header, and EmptyState are polished; the data renderings are functional placeholders. Replace with `<svg>` chart primitives for a richer Analytics view.
- **Word lists ship as placeholders.** The built-in slur/profanity arrays in `server/src/builtinWordLists.ts` are intentionally non-offensive. A fork should replace them from a curated source.
- **Telemetry sink.** `ReportClientError` writes to the server's structured log. Forks that want stack-frame mapping, grouping, or alerting should replace the log line with a Sentry/Datadog client.
- **No reset-all-audit-log affordance.** Retention prune handles age-based cleanup; an explicit "purge everything" action isn't surfaced. Add one if your community shape needs it.

Use this sample as a shape reference for app-managed scalar config (per-field auto-save), admin-gated mutations + admin-audience broadcasts, message-pipeline rules with audit dispatch funnel, and the Sidebar+drawer responsive shell with `var(--rootsdk-*)` tokens throughout. Consult the listed api samples for concerns it doesn't cover.
