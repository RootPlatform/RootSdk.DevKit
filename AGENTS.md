# RootSdk.DevKit — Agent Navigation Guide

Reference repository for AI agents (and humans) building apps and bots on the Root Platform. Apps have a React/TypeScript client UI plus a server. Bots are server-only automation. Server-side SDK code is identical between apps and bots except the import path.

## How this DevKit is organized

Content is structured along [Diátaxis](https://diataxis.fr/) lines. Walk to the category that matches your current question; don't pre-load everything.

| Question | Category | Where |
|---|---|---|
| Concepts: how something works, why a feature exists, when to use it | Explanation | `docs/llms/{app,bot}-docs/` |
| API reference: exact types, methods, parameters | Reference | `docs/llms/{app,bot}-api-reference/` |
| API syntax: working code per SDK domain, every method demonstrated | Reference | `api-samples/` (one folder per SDK domain) |
| How do I X? composing multiple SDK domains for a single goal | How-to | `recipes/` (folder names category-prefixed) |
| Architecture: full working app or bot you can study end-to-end | Tutorial / worked example | `apps/` and `bots/` |

The catalogs further down list every concrete item in `apps/`, `bots/`, `recipes/`, and `api-samples/`. The `Documentation` and `Schemas` sections at the end point at the rest.

## Quick Start

**Building a bot** (server-only):
1. Copy `templates/bot/` to your target location.
2. Load `docs/index.md` (the docs router) and fetch the per-page chunks you need.
3. Reference `api-samples/` for SDK domain coverage; reference `bots/` for runnable end-to-end examples.

**Building an app** (client + server + networking):
1. Copy `templates/app/`.
2. Load `docs/index.md` and fetch chunks as needed.
3. Reference `api-samples/` (every SDK domain, every method) and `apps/` (end-to-end architecture). Each sample's `AGENTS.md` states what it demonstrates and does not demonstrate.

**Not sure which to build?** Read `docs/llms/overview/choose-app-or-bot.md`.

## Commands

| Command | What it does |
|---|---|
| `npx create-root --app <Name>` or `--bot <Name>` | Scaffold a new project |
| `npm run build` | Compile TypeScript |
| `rootsdk build proto` | Generate TypeScript from `.proto` files (apps only) |
| `rootsdk start devhost` | Run locally inside the Root DevHost |
| `rootsdk build package` | Create a `.pkg` deployment archive |
| `rootsdk upload package` | Deploy to Root cloud |

Requires Node.js ≥ 22 and `@rootsdk/dev-tools` in `devDependencies`. A `DEV_TOKEN` from the [Root Developer Portal](https://dev.rootapp.com) goes in `.env` for `rootsdk start devhost`. Full details and edge cases in `api-samples/cli/`.

## Key Conventions

- **Apps** import from `@rootsdk/server-app`. **Bots** import from `@rootsdk/server-bot`. Server-side code is otherwise identical between the two.
- The `rootServer` object is the SDK entry point. Everything hangs off `rootServer.community.*`, `rootServer.dataStore.*`, `rootServer.lifecycle.*`, etc.
- Root-specific rules, gotchas, and decision frameworks live in the upstream docs surfaced via the Diátaxis routing above. This file does not preempt them — load the relevant concept doc when the question arises.

## Sample Apps

Complete, runnable app examples in `apps/`. Use these as end-to-end references for architecture and patterns.

<!-- BEGIN: catalog/sample-apps -->
| Folder | Description | Key Patterns | Complexity |
|--------|-------------|-------------|------------|
| `hello-world` | Minimal echo service | Client-server protobuf round-trip | Minimal |
| `themes` | UI theming showcase + canonical Root-aesthetic icon catalog | Root design tokens, CSS variables, icon reference — no networking | Minimal |
| `data-storage` | Task list with persistence | SQLite database, CRUD operations | Moderate |
| `protobuf-service` | Voting between two options | Custom RPC services, broadcast updates | Moderate |
| `github-release-watcher` | Watches a curated list of GitHub repositories for new releases and surfaces them as an in-app feed | External-service polling via chained `OneTime` jobs, four-layer reliability (`withRetry` + `JobMissed` + startup reconcile + daily safety-net), validate-before-persist, persist-then-best-effort-schedule, custom `MemberGroup` for admin broadcast audience, per-field auto-save with separate per-field RPCs | Complex |
| `leveling-leaderboard` | XP from messages → live top-10 leaderboard with admin Settings | Admin gating via `globalSettings.general.admins`, message-driven aggregation, atomic SQL with cooldown, coalesced "all" broadcast, in-app debounced auto-save, ErrorBoundary telemetry funnel | Complex |
| `moderation` | Automatic content filter + spam detection + rate limiting with audit log, analytics, and admin Settings | Message-pipeline rule order with central audit dispatch funnel, atomic per-field KV settings via `dataStore.appData.update()`, custom `adminAudience` MemberGroup (owner ∪ admins), Sidebar + drawer responsive shell, `MasterSubToggleGroup` and `ShowWordListGate` UX primitives, `lucide-react` icons | Complex |
| `pixel-canvas` | r/place-style shared pixel grid every member paints on, one cell at a time | Real-time per-action broadcasts (no coalescing), shared mutable KV blob, atomic check-then-place per-user cooldown, mobile-first canvas with two-step tap flow, adaptive-ceremony destructive action (type-to-confirm only when populated) | Complex |
| `self-roles` | Member-driven self-assignable role picker (Discord "reaction-roles" equivalent) | Member-driven mutations, role enumeration + assignment, KV-backed config, `CommunityRoleDeleted/Edited` subscriptions, exclusive-group server-side enforcement, public broadcast (vs admin-only) | Complex |
| `suggestion-box` | Community suggestion board | Multiple services, voting, error handling, client state management | Complex |
| `tic-tac-toe` | Real-time multiplayer game | Shared game state, turn logic, multiple services | Complex |
<!-- END: catalog/sample-apps -->

## Sample Bots

Complete, runnable bot examples in `bots/`. Server-only — no client UI.

<!-- BEGIN: catalog/sample-bots -->
| Folder | Description | Key Patterns | Complexity |
|--------|-------------|-------------|------------|
| `hello-world` | Echo/ping responder | Message event handling, basic reply | Minimal |
| `new-member-welcome` | Welcome new members | Member join event subscription | Minimal |
| `reset-channel-description` | Channel property management | Channel updates, voice channel events | Minimal |
| `role-list` | List community roles | Role querying | Minimal |
| `all-channel-broadcast` | Broadcast to all channels | Channel listing, multi-channel messaging, global settings (member group), per-call error isolation | Moderate |
| `role-assignment` | Assign roles to members | Role and member-role APIs, global settings (role picker), per-user counter via key-value store | Moderate |
<!-- END: catalog/sample-bots -->

## Recipes

Composition tasks in `recipes/`. Each recipe synthesizes multiple api-samples into a working answer for a real developer goal. Recipes sit between api-samples (per-method primitives) and apps (full architectural exemplars).

Folder names are category-prefixed (e.g. `ui-`, `data-`, `app-settings-`, `chat-`, `external-`, `per-user-`).

<!-- BEGIN: catalog/recipes -->
| Folder | Question | Composes | Exemplified by |
|--------|----------|----------|----------------|
| `app-settings-flat-values` | How do I let app admins tune flat config values at runtime via an in-app Settings page, persisted in KV with admin-gated writes? | `server-key-value-store`, `server-global-settings`, `server-member-roles`, `networking-app-services` | `apps/leveling-leaderboard` |
| `app-settings-list-values` | How do I persist a list-shaped setting (collection of items, add/remove individually) in SQLite with admin-gated mutations? | `server-database`, `server-global-settings`, `server-member-roles`, `networking-app-services` | `apps/leveling-leaderboard` |
| `app-settings-per-context` | How do I let admins configure my app's behavior per-context — per-channel, per-repo, per-thing — with multi-field rows keyed by the entity? | `server-database`, `server-global-settings`, `server-member-roles`, `networking-app-services` | — |
| `audio-bundled-sfx` | How do I ship and play short sound effects from my client, dealing with the autoplay policy and Vite asset bundling? | — | — |
| `chat-trigger-respond` | How do I make my app respond to user chat messages? | `server-messages` | `apps/leveling-leaderboard` |
| `data-batch-prefetch` | How do I batch-prefetch related data (e.g. 50 user profiles for a list of activities) in one call instead of N+1 from the client? | `server-database`, `networking-app-services` | — |
| `data-paginated-list` | How do I paginate a server-side list with cursor-based queries and accumulate pages on the client? | `server-database`, `networking-app-services` | `apps/leveling-leaderboard` |
| `external-http-fetch` | How do I call an external HTTP API from my server with timeouts and typed error handling? | `networking-app-services` | `apps/github-release-watcher` |
| `per-user-cooldown` | How do I rate-limit a per-user action so it can only happen once per N seconds, atomically? | `server-database`, `networking-app-services` | `apps/leveling-leaderboard` |
| `ui-feature-by-role` | How do I gate UI features by role and enforce the same gate server-side on privileged actions? | `client-app-users`, `server-roles`, `server-member-roles`, `server-global-settings`, `networking-app-services` | `apps/leveling-leaderboard` |
<!-- END: catalog/recipes -->

## API Samples Index

Focused samples in `api-samples/`, one per SDK domain. Each is a standalone bot with working code covering every method. Files are self-contained: one file = one complete answer, with behavioral nuances inline as comments. Server-side code is identical between apps and bots except for the import path and lifecycle, so these api-sample bots double as server-side references for apps. Client code is app-only.

<!-- BEGIN: catalog/api-samples -->
### Server — Community API

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `server-access-rules` | Permission overrides | set, remove, list access rules |
| `server-channel-groups` | Channel groups | create, update, delete, list, reorder |
| `server-channels` | Channels | create, update, delete, list, reorder |
| `server-community` | Community info | get community details, update settings |
| `server-community-logs` | App logging | send diagnostic messages to community admins |
| `server-directories` | File directories | create, update, delete, list |
| `server-emojis` | Custom emojis | get, list, delete |
| `server-files` | Channel files | upload, get, list, delete |
| `server-invites` | Invites | get, list, delete |
| `server-kick-ban` | Moderation | kick, ban, unban, list bans |
| `server-member-groups` | Member groups | create, update, delete, list, add/remove members |
| `server-member-roles` | Member roles | assign, remove, list roles for member |
| `server-members` | Members | get, list, listAll |
| `server-messages` | Channel messages | send, reply, edit, delete, list, reactions, pins, mentions, flag |
| `server-roles` | Roles | create, update, delete, list, reorder |
| `server-voice` | Voice channels | list participants, mute, move, disconnect |

### Server — Persistence & Scheduling

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `server-database` | SQLite database | raw SQL, migrations, Knex, Prisma |
| `server-jobs` | Job scheduler | schedule one-time and recurring jobs |
| `server-key-value-store` | Key-value store | get, set, update, delete, deleteLike, select, selectValue |

### Server — Lifecycle & Utilities

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `server-app-assets` | Server assets | convert upload tokens to permanent file refs |
| `server-app-client-attachment` | Client attachment | list attached clients, send to specific clients |
| `server-app-lifecycle` | App lifecycle | start, stop, addService, start state |
| `server-bot-lifecycle` | Bot lifecycle | start, stop, start state |
| `server-global-settings` | Global settings | globalSettings, state.globalSettings, GlobalSettingsEvent.Update, ReadOnlyMemberGroup.isMember |
| `server-guid-utils` | GUID utilities | parse, create, validate Root GUIDs |
| `server-resilience` | Retry & backoff | withRetry() wrapper, retryable error classification, batch pacing |

### Developer Tools

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `cli` | CLI commands | create-root, start devhost, build proto, build package, upload package |

### Client (Apps only)

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `client-app-assets` | Client assets | file picker, upload tokens |
| `client-app-lifecycle` | Client lifecycle | restart |
| `client-app-theme` | Theming | getTheme, on, off, ThemeUpdate |
| `client-app-users` | User info | current user, community members |
| `networking-app-services` | RPC services | protobuf service calls from client |
<!-- END: catalog/api-samples -->

## Documentation

Developer docs ship as a router (`docs/index.md`, ~12K tokens) plus per-topic markdown chunks under `docs/llms/`. Read `docs/index.md` to find the chunks relevant to your task; each chunk is small and self-contained. The Diátaxis mapping near the top of this file shows which subdirectory contains which kind of content.

## Schemas

Machine-readable reference files in `schemas/`.

- **`permissions-map.json`** — maps every SDK method to its required manifest permission. Use when setting up `root-manifest.json`.
- **`root-manifest.{app,bot}.schema.json`** — JSON schemas for validating manifests.
