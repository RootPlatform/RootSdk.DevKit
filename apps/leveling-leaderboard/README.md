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

Real-time XP and leaderboard app. Members earn XP for messages. The main view shows the Top 10 leaderboard, a personal "you" card with progress to next level and an "+N XP to join Top 10" motivator, and a list of the caller's recent awards. App admins open an in-app Settings view via a gear icon in the header to configure scoring, channel exclusions, and XP-eligible members. App admins themselves are configured via Root's native Global Settings UI for this app. Full behavior contract and implementation patterns in [DESIGN.md](DESIGN.md).

## Coverage scope

**Demonstrates:**
- **Admin gating via globalSettings**: the app's `admins` role/member list lives in the manifest's globalSettings (`general.admins`) and is managed by Root's native Settings UI. Server reads the admins `ReadOnlyMemberGroup` on each `isAdmin()` check; community owner is always an admin as defence in depth.
- **Platform-managed `MemberGroup` for app state**: XP-eligible members are stored in an app-owned `MemberGroup` (`rootServer.memberGroups.create/getByName`). The platform resolves role membership automatically, so the message-handler hot path does an O(1) `memberUserIdsAsSet.has(userId)` check with zero custom role-membership sync.
- **In-app Settings with auto-save**: three-tab Settings view (Scoring / Channels / Members) using a debounced-mutation hook. No Save buttons; changes commit on debounce. Destructive actions (reset) retain explicit confirmation.
- **Single-view app with push-view for admin settings**: no top-level tabs. Gear icon in `AppHeader` swaps the main viewport to Settings.
- **Message-driven XP aggregation with per-user cooldown**: atomic SQL with a `WHERE last_award_at + cooldownMs <= now` clause handles the race; in-memory cache is a pure optimisation.
- **Live leaderboard via protobuf RPC + coalesced `"all"` broadcast**: a 500ms dirty-flag tick keeps broadcast rate bounded regardless of chat volume. `MemberXpChanged` also uses the `"all"` audience with client-side userId filtering (see DESIGN.md "Why MemberXpChanged uses 'all'").
- **SQLite for indexed top-N and rank queries**: one composite index powers both the top-10 select and per-user rank.
- **Channel tree UI under `community.fullControl`**: groups + channels enumerated at startup; live updates via ChannelEvent subscriptions.
- **Batched profile fetch via `rootClient.users.getUserProfiles` + `UserProfileUpdate` subscription**: cached by userId; shared via a Context.
- **`RootServerException` for RPC-level authorization errors**: client maps error codes to user-facing strings.
- **Root theme tokens for client styling**: no hardcoded colors; all surfaces and text use `--rootsdk-*` CSS custom properties. A small bridge in `lib/rootColorScheme.ts` keeps the document `color-scheme` in sync with `rootClient.theme` so native form chrome (number-input spin buttons, scrollbars) follows Root's theme.
- **Client-error telemetry funnel**: `ErrorBoundary` fires a fire-and-forget `ReportClientError` RPC on every catch; the server handler logs it as a structured `error` line with caller userId, label, message, stack, and userAgent.

**Does NOT demonstrate:**
- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience). Production code should wrap SDK calls in `withRetry()`.
- Key-value store — this app uses SQLite because it needs indexed queries. For simple persistence, see [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- File or asset handling — see [`api-samples/client-app-assets`](../../api-samples/client-app-assets) and [`api-samples/server-files`](../../api-samples/server-files).
- Moderation actions (kick, ban, delete) — see [`api-samples/server-kick-ban`](../../api-samples/server-kick-ban) and [`api-samples/server-messages`](../../api-samples/server-messages).

## Permissions

```json
{
  "community": { "fullControl": true }
}
```

`community.fullControl` is required only because the Settings UI renders a tree of every channel in the community for per-channel XP exclusion. Apps that don't need to enumerate community structure should not request this permission — see [`api-samples/server-channels`](../../api-samples/server-channels) and [`api-samples/server-channel-groups`](../../api-samples/server-channel-groups) for scoped alternatives.

## Known limits

A few production concerns are intentionally not addressed here. They depend on capabilities the SDK doesn't currently expose to apps, or on infrastructure choices that vary per deployment. Forks should plan for them.

- **No reconnect-driven catch-up.** The client SDK does not currently surface a "reconnect" event. If a client briefly loses its WebSocket and reconnects, broadcasts that fired during the outage are lost. The leaderboard / you-card stay stale until the next live broadcast or a manual navigation that triggers a refetch. When the SDK exposes a reconnect hook, both `LeaderboardContext.reload()` and `HomeView.reloadMyStats()` should be wired to fire on it.
- **Cross-process settings cache coherence.** The in-memory caches in `appSettingsStore` and `excludedChannelsStore` are correct for a single-process app server. If the app is ever scaled horizontally, an admin's settings change will not invalidate the other instances' caches until each is restarted. Replace with a small pub/sub or always-DB-read pattern at that point.
- **Cooldown cache TTL eviction window.** Stale entries are dropped every 5 minutes if older than `2 × cooldownSeconds`. For deployments with millions of users in a single community this is enough; for orders of magnitude beyond that, an LRU bound on the map is the next step.
- **Telemetry sink.** `ReportClientError` writes to the server's structured log. Forks that want stack-frame mapping, grouping, or alerting should replace the log line with a Sentry/Datadog client.

Use this sample as a shape reference for admin-gated app settings, live leaderboards, message-driven aggregation, and platform-managed member groups for dynamic role + user selections. See the listed api samples for concerns it doesn't cover, and [`apps/README.md`](../README.md) for the full sample-app catalog.
