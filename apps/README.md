# Sample Apps

Complete, runnable Root app examples. Each app has a client (React/TypeScript), server (Node.js/TypeScript), and networking layer (Protobuf RPC services).

This table is the canonical pattern-discovery surface across apps — when an agent needs to find which sample teaches a given pattern, scan the **Key Patterns** column. Individual app READMEs cross-link to `api-samples/*` (small primitive-focused samples) and to each other for *contrastive* lessons (e.g., `leveling-leaderboard` SQLite vs `self-roles` KV), but they don't duplicate the catalog routing — pure "for that shape, see [other app]" pointers live here, not inline in sample docs.

| Folder | Description | Key Patterns | Complexity |
|--------|-------------|-------------|------------|
| `hello-world` | Minimal echo service | Client-server protobuf round-trip | Minimal |
| `themes` | UI theming showcase + canonical Root-aesthetic icon catalog | Root design tokens, CSS variables, icon reference — no networking | Minimal (UI) |
| `data-storage` | Task list with persistence | SQLite database, CRUD operations | Moderate |
| `protobuf-service` | Voting between two options | Custom RPC services, broadcast updates | Moderate |
| `suggestion-box` | Community suggestion board | Multiple services, voting, error handling, client state management | Complex |
| `tic-tac-toe` | Real-time multiplayer game | Shared game state, turn logic, multiple services | Complex |
| `leveling-leaderboard` | XP from messages → live top-10 leaderboard with admin Settings | Admin gating via `globalSettings.general.admins`, message-driven aggregation, atomic SQL with cooldown, coalesced "all" broadcast, in-app debounced auto-save, ErrorBoundary telemetry funnel, channel-tree enumeration UI under `community.fullControl` | Complex |
| `self-roles` | Member-driven self-assignable role picker (Discord "reaction-roles" equivalent) | Member-driven mutations, role enumeration + assignment, KV-backed config, `CommunityRoleDeleted/Edited` subscriptions, exclusive-group server-side enforcement, public broadcast (vs admin-only) | Complex |
| `github-release-watcher` | Watches a curated list of GitHub repositories for new releases and surfaces them as an in-app feed | External-service polling via chained `OneTime` jobs, four-layer reliability (`withRetry` + `JobMissed` + startup reconcile + daily safety-net), validate-before-persist, persist-then-best-effort-schedule, custom `MemberGroup` for admin broadcast audience, per-field auto-save with separate per-field RPCs | Complex |
| `pixel-canvas` | r/place-style shared pixel grid every member paints on, one cell at a time | Real-time per-action broadcasts (no coalescing), shared mutable KV blob, atomic check-then-place per-user cooldown, mobile-first canvas with two-step tap flow, adaptive-ceremony destructive action (type-to-confirm only when populated) | Complex |
| `moderation` | Automatic content filter + spam detection + rate limiting with audit log, analytics, and admin Settings | Message-pipeline rule order with central audit dispatch funnel, atomic per-field KV settings via `dataStore.appData.update()`, custom `adminAudience` MemberGroup (owner ∪ admins), Sidebar + drawer responsive shell, `MasterSubToggleGroup` and `ShowWordListGate` UX primitives, `lucide-react` icons | Complex |
