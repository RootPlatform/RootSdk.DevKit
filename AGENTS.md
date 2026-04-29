# RootSdk.DevKit — Agent Navigation Guide

Developer toolkit for building apps and bots on the Root Platform. This guide helps you find the right resources for any task.

## Quick Start

**Building a bot** (server-only automation):
1. Copy `templates/bot/` to your target location.
2. Load `docs/index.md` (the docs router, ~12K tokens). Use it to find specific per-page chunks under `docs/llms/bot-docs/` (concept guides) and `docs/llms/bot-api-reference/` (API reference). Fetch only the pages relevant to your task — each chunk is small and self-contained.
3. Reference `api-samples/` bots for working examples of each SDK domain.
4. For complete SDK usage per domain, always check the matching `api-samples/` module — each one demonstrates every method. Sample bots only show targeted use cases.

**Building an app** (client UI + server):

1. Load `docs/index.md` (the docs router, ~12K tokens). Use it to find per-page chunks under `docs/llms/app-docs/` (concept guides) and `docs/llms/app-api-reference/` (API reference). Don't pre-load all of the docs — fetch chunks as the task surfaces a need.
2. Walk the concern checklist below. For each concern that applies to your app, load the matching api sample **before writing code for that concern** — don't defer until you hit a wall.

   | Concern | API Sample | Triggers for |
   |---|---|---|
   | UI theming / dark mode | `api-samples/client-app-theme` | any client UI |
   | User profiles / identity | `api-samples/client-app-users` | any UI showing user-scoped data |
   | Client-server RPC | `api-samples/networking-app-services` | any call back to the server |
   | Persistence | `api-samples/server-database` or `api-samples/server-key-value-store` | any stored state |
   | Role/member permissions | `api-samples/server-global-settings`, `api-samples/server-access-rules` | any role-gated behavior |
   | Scheduling | `api-samples/server-jobs` | timers, retries, delayed work |
   | Retry / resilience | `api-samples/server-resilience` | any external call |

3. Copy `templates/app/` for scaffolding. Read the template files — `server/src/main.ts`, `server/src/exampleService.ts`, `client/src/Example.tsx`, `networking/src/example.proto` — to understand the build layout.
4. Consult `apps/*` for end-to-end shape. **Samples illustrate one possible shape — they do not cover every concern your app needs. Check each sample's `README.md` for its coverage scope before using it as a reference.**
5. `api-samples/` bots double as server-side references for apps (server code is identical between apps and bots). For complete SDK usage per domain, always check the matching api sample module — each demonstrates every method; samples only show targeted use cases.

**Not sure which to build?** Read `docs/llms/overview/choose-app-or-bot.md`.

## Key Conventions

- **Apps** import from `@rootsdk/server-app`. **Bots** import from `@rootsdk/server-bot`.
- All server-side SDK code is identical between apps and bots except the import path.
- The `rootServer` object is the SDK entry point. Everything hangs off `rootServer.community.*`, `rootServer.dataStore.*`, `rootServer.lifecycle.*`, etc.
- **Set permissions** in `root-manifest.json` — each api-sample README lists the permissions its APIs require. `schemas/permissions-map.json` maps every SDK method to its required permission.

## Common Needs

When your task requires one of these, go to the linked module — don't invent a solution from outside the DevKit.

| Need | Where to look | Notes |
|------|--------------|-------|
| Make something configurable by community admins | `api-samples/server-global-settings` + `docs/llms/bot-docs/configure/manifest-global-settings.md` | Settings are declared in `root-manifest.json` and edited by admins through the Root UI. Some setting types are not yet available — check the docs for platform status before using one. |
| Persist data between restarts | `api-samples/server-database` (SQLite) or `api-samples/server-key-value-store` | Don't use the filesystem or in-memory state for data that must survive restarts. |
| Run code on a schedule or delay | `api-samples/server-jobs` | Don't use `setTimeout`/`setInterval` — jobs survive restarts, timers don't. |
| Identify what type of entity a GUID represents | `api-samples/server-guid-utils` | Distinguishes users from bots/apps, extracts timestamps — no API call needed. |
| Retry after rate limits or transient errors | `api-samples/server-resilience` | Wrap any SDK call in `withRetry()`. Retries TooManyRequests, ServerError, Timeout with exponential backoff + jitter. |
| Set permissions for SDK calls | `schemas/permissions-map.json` | Maps every SDK method to its required `root-manifest.json` permission. |
| Style a client UI to match Root (light/dark) | `api-samples/client-app-theme` + `apps/themes` | Use `var(--rootsdk-*)` CSS tokens; don't hardcode colors. Tokens switch automatically with the user's theme. |
| Show a user's profile, nickname, or avatar | `api-samples/client-app-users` | Don't invent a user model — use `rootClient.users.*` and its profile-update events. |
| Call the server from the client | `api-samples/networking-app-services` | Define protobuf services and use the generated client/server bases; don't hand-roll JSON fetch. |

## Sample Apps

Complete, runnable app examples in `apps/`. Use these as end-to-end references for architecture and patterns.

| Folder | Description | Key Patterns | Complexity |
|--------|-------------|-------------|------------|
| `hello-world` | Minimal echo service | Client-server protobuf round-trip | Minimal |
| `data-storage` | Task list with persistence | SQLite database, CRUD operations | Moderate |
| `protobuf-service` | Voting between two options | Custom RPC services, broadcast updates | Moderate |
| `suggestion-box` | Community suggestion board | Multiple services, voting, error handling, client state management | Complex |
| `themes` | UI theming showcase | Root design tokens, CSS variables, icons — no networking | Minimal (UI) |
| `tic-tac-toe` | Real-time multiplayer game | Shared game state, turn logic, multiple services | Complex |
| `leveling-leaderboard` | XP from messages → live top-10 leaderboard with admin Settings | Admin gating via `globalSettings.general.admins`, message-driven aggregation, atomic SQL with cooldown, coalesced "all" broadcast, in-app debounced auto-save, ErrorBoundary telemetry funnel | Complex |
| `self-roles` | Member-driven self-assignable role picker (Discord "reaction-roles" equivalent) | Member-driven mutations, role enumeration + assignment, KV-backed config, `CommunityRoleDeleted/Edited` subscriptions, exclusive-group server-side enforcement, public broadcast (vs admin-only) | Complex |

## Sample Bots

Complete, runnable bot examples in `bots/`. Server-only — no client UI.

| Folder | Description | Key Patterns | Complexity |
|--------|-------------|-------------|------------|
| `hello-world` | Echo/ping responder | Message event handling, basic reply | Minimal |
| `all-channel-broadcast` | Broadcast to all channels | Channel listing, multi-channel messaging | Moderate |
| `new-member-welcome` | Welcome new members | Member join event subscription | Minimal |
| `reset-channel-description` | Channel property management | Channel updates | Minimal |
| `role-assignment` | Assign roles to members | Role and member-role APIs | Moderate |
| `role-list` | List community roles | Role querying | Minimal |

## Recipes

Composition tasks in `recipes/`. Each recipe synthesizes multiple api-samples into a working answer for a real developer goal. Recipes sit between api-samples (per-method primitives) and apps (full architectural exemplars). Use a recipe when the lesson is "how do I compose X and Y to accomplish Z?"

Folder names are category-prefixed: `ui-`, `data-`, `realtime-`, `auth-`, `assets-`, `external-`, `app-` (lifecycle, errors, observability).

### UI

| Folder | Question | Composes | Exemplified by |
|---|---|---|---|
| `ui-feature-by-role` | How do I gate UI features by role and enforce the same gate server-side on privileged actions? | `client-app-users`, `server-roles`, `server-member-roles`, `server-global-settings`, `networking-app-services`, `server-rpc-errors` | `apps/leveling-leaderboard` |
| `data-paginated-list` | How do I paginate a server-side list with cursor-based queries and accumulate pages on the client? | `server-app-data-store`, `networking-app-services`, `client-app-services` | `apps/leveling-leaderboard` |
| `app-settings-flat-values` | How do I let app admins tune flat config values at runtime via an in-app Settings page, persisted in KV with admin-gated writes? | `server-app-data-store`, `server-global-settings`, `server-member-roles`, `networking-app-services`, `client-app-services` | `apps/leveling-leaderboard` |
| `app-settings-list-values` | How do I persist a list-shaped setting (collection of items, add/remove individually) in SQLite with admin-gated mutations? | `server-app-data-store`, `server-global-settings`, `server-member-roles`, `networking-app-services`, `client-app-services` | `apps/leveling-leaderboard` (excluded_channels) |
| `app-settings-per-context` | How do I let admins configure my app's behavior per-context — per-channel, per-repo, per-thing — with multi-field rows keyed by the entity? | `server-app-data-store`, `server-global-settings`, `server-member-roles`, `networking-app-services`, `client-app-services` | future github-release-watcher per-repo config |
| `data-batch-prefetch` | How do I batch-prefetch related data (e.g. 50 user profiles for a list of activities) in one call instead of N+1 from the client? | `server-app-data-store`, `networking-app-services`, `client-app-services` | any list-with-references UX |
| `chat-trigger-respond` | How do I make my app respond to user chat messages? | `server-channel-messages` | `apps/leveling-leaderboard` (messageHandler) |
| `external-http-fetch` | How do I call an external HTTP API from my server with timeouts and typed error handling? | `networking-app-services`, `client-app-services` | `apps/github-release-watcher` (githubClient) |
| `per-user-cooldown` | How do I rate-limit a per-user action so it can only happen once per N seconds, atomically? | `server-app-data-store`, `networking-app-services` | `apps/leveling-leaderboard` (xp-per-message cooldown) |
| `audio-bundled-sfx` | How do I ship and play short sound effects from my client, dealing with the autoplay policy and Vite asset bundling? | (client-only — no Root SDK API surface) | any app with notification/feedback sounds |

## API Samples Index

Focused samples in `api-samples/`, one per SDK domain. Each is a standalone bot with working code covering every method. Files are self-contained: one file = one complete answer, with behavioral nuances inline as comments. Server-side code is identical between apps and bots except for the import path and lifecycle, so these api-sample bots double as server-side references for apps. Client code is app-only.

### Server — Community API

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `server-messages` | Channel messages | send, reply, edit, delete, list, reactions, pins, mentions, flag |
| `server-channels` | Channels | create, update, delete, list, reorder |
| `server-channel-groups` | Channel groups | create, update, delete, list, reorder |
| `server-members` | Members | get, list, search, update nickname |
| `server-roles` | Roles | create, update, delete, list, reorder |
| `server-member-roles` | Member roles | assign, remove, list roles for member |
| `server-member-groups` | Member groups | create, update, delete, list, add/remove members |
| `server-community` | Community info | get community details, update settings |
| `server-emojis` | Custom emojis | create, update, delete, list |
| `server-files` | Channel files | upload, get, list, delete |
| `server-directories` | File directories | create, update, delete, list |
| `server-invites` | Invites | create, list, delete |
| `server-kick-ban` | Moderation | kick, ban, unban, list bans |
| `server-voice` | Voice channels | list participants, mute, move, disconnect |
| `server-access-rules` | Permission overrides | set, remove, list access rules |
| `server-community-logs` | App logging | send diagnostic messages to community admins |

### Server — Persistence & Scheduling

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `server-database` | SQLite database | raw SQL, migrations, Knex, Prisma |
| `server-key-value-store` | Key-value store | get, set, delete, list |
| `server-jobs` | Job scheduler | schedule one-time and recurring jobs |

### Server — Lifecycle & Utilities

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `server-app-lifecycle` | App lifecycle | start, stop, addService, start state |
| `server-bot-lifecycle` | Bot lifecycle | start, stop, start state |
| `server-app-client-attachment` | Client attachment | list attached clients, send to specific clients |
| `server-app-assets` | Server assets | convert upload tokens to permanent file refs |
| `server-global-settings` | Global settings | read manifest-declared settings |
| `server-guid-utils` | GUID utilities | parse, create, validate Root GUIDs |
| `server-resilience` | Retry & backoff | withRetry() wrapper, retryable error classification, batch pacing |

### Developer Tools

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `cli` | CLI commands | create-root, start devhost, build proto, build package, upload package |

### Client (Apps only)

| Folder | Domain | Key Methods |
|--------|--------|-------------|
| `client-app-lifecycle` | Client lifecycle | ready, theme changes, resize |
| `client-app-assets` | Client assets | file picker, upload tokens |
| `client-app-theme` | Theming | CSS tokens, dark/light mode |
| `client-app-users` | User info | current user, community members |
| `networking-app-services` | RPC services | protobuf service calls from client |

## Documentation

Full developer docs in `docs/`. The DevKit ships them as a router (`docs/index.md`, ~12K tokens) plus per-topic markdown chunks under `docs/llms/`. Workflow:

1. Read `docs/index.md` to find the chunks relevant to your task — it lists every page with a description.
2. Fetch only the chunks you need. Each one is self-contained and small (usually 1–20 KB), so context stays free for actual work.

### Bot docs

- `docs/llms/bot-docs/` — concept guides (audience: bots).
- `docs/llms/bot-api-reference/` — TypeScript API reference (audience: bots).

### App docs

- `docs/llms/app-docs/` — concept guides (audience: apps).
- `docs/llms/app-api-reference/` — TypeScript API reference (audience: apps).

## Schemas

Machine-readable reference files in `schemas/`.

- **`permissions-map.json`** — maps every SDK method to its required manifest permission. Use this when setting up `root-manifest.json`.
- **`root-manifest.*.schema.json`** — JSON schemas for validating app and bot manifests.
