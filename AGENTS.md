# RootSdk.DevKit — Agent Navigation Guide

Developer toolkit for building apps and bots on the Root Platform. This guide helps you find the right resources for any task.

## Quick Start

**Building a bot** (server-only automation):
1. Copy `templates/bot/` to your target location
2. Load `docs/llms-bot-guides.txt` (~61K tokens) and `docs/llms-bot-api.txt` (~141K tokens)
3. Reference `how-to/` bots for working examples of each SDK domain
4. For complete SDK usage per domain, always check the matching `how-to/` module — each one demonstrates every method. Sample bots only show targeted use cases.

**Building an app** (client UI + server):

1. Load `docs/llms-app-guides.txt` (~106K tokens) and `docs/llms-app-api.txt` (~163K tokens).
2. Walk the concern checklist below. For each concern that applies to your app, load the matching how-to **before writing code for that concern** — don't defer until you hit a wall.

   | Concern | How-to | Triggers for |
   |---|---|---|
   | UI theming / dark mode | `how-to/client-app-theme` | any client UI |
   | User profiles / identity | `how-to/client-app-users` | any UI showing user-scoped data |
   | Client-server RPC | `how-to/networking-app-services` | any call back to the server |
   | Persistence | `how-to/server-database` or `how-to/server-key-value-store` | any stored state |
   | Role/member permissions | `how-to/server-global-settings`, `how-to/server-access-rules` | any role-gated behavior |
   | Scheduling | `how-to/server-jobs` | timers, retries, delayed work |
   | Retry / resilience | `how-to/server-resilience` | any external call |

3. Copy `templates/app/` for scaffolding. Read the template files — `server/src/main.ts`, `server/src/exampleService.ts`, `client/src/Example.tsx`, `networking/src/example.proto` — to understand the build layout.
4. Consult `apps/*` for end-to-end shape. **Samples illustrate one possible shape — they do not cover every concern your app needs. Check each sample's `README.md` for its coverage scope before using it as a reference.**
5. `how-to/` bots double as server-side references for apps (server code is identical between apps and bots). For complete SDK usage per domain, always check the matching how-to module — each demonstrates every method; samples only show targeted use cases.

**Not sure which to build?** Read `docs/llms/overview/choose-app-or-bot.md`.

## Key Conventions

- **Apps** import from `@rootsdk/server-app`. **Bots** import from `@rootsdk/server-bot`.
- All server-side SDK code is identical between apps and bots except the import path.
- The `rootServer` object is the SDK entry point. Everything hangs off `rootServer.community.*`, `rootServer.dataStore.*`, `rootServer.lifecycle.*`, etc.
- **Set permissions** in `root-manifest.json` — each how-to README lists the permissions its APIs require. `schemas/permissions-map.json` maps every SDK method to its required permission.

## Common Needs

When your task requires one of these, go to the linked module — don't invent a solution from outside the DevKit.

| Need | Where to look | Notes |
|------|--------------|-------|
| Make something configurable by community admins | `how-to/server-global-settings` + `docs/llms/bot-docs/configure/manifest-global-settings.md` | Settings are declared in `root-manifest.json` and edited by admins through the Root UI. Some setting types are not yet available — check the docs for platform status before using one. |
| Persist data between restarts | `how-to/server-database` (SQLite) or `how-to/server-key-value-store` | Don't use the filesystem or in-memory state for data that must survive restarts. |
| Run code on a schedule or delay | `how-to/server-jobs` | Don't use `setTimeout`/`setInterval` — jobs survive restarts, timers don't. |
| Identify what type of entity a GUID represents | `how-to/server-guid-utils` | Distinguishes users from bots/apps, extracts timestamps — no API call needed. |
| Retry after rate limits or transient errors | `how-to/server-resilience` | Wrap any SDK call in `withRetry()`. Retries TooManyRequests, ServerError, Timeout with exponential backoff + jitter. |
| Set permissions for SDK calls | `schemas/permissions-map.json` | Maps every SDK method to its required `root-manifest.json` permission. |
| Style a client UI to match Root (light/dark) | `how-to/client-app-theme` + `apps/themes` | Use `var(--rootsdk-*)` CSS tokens; don't hardcode colors. Tokens switch automatically with the user's theme. |
| Show a user's profile, nickname, or avatar | `how-to/client-app-users` | Don't invent a user model — use `rootClient.users.*` and its profile-update events. |
| Call the server from the client | `how-to/networking-app-services` | Define protobuf services and use the generated client/server bases; don't hand-roll JSON fetch. |

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

## How-To Index

Focused samples in `how-to/`, one per SDK domain. Each is a standalone bot with working code covering every method. Files are self-contained: one file = one complete answer, with behavioral nuances inline as comments. Server-side code is identical between apps and bots except for the import path and lifecycle, so these how-to bots double as server-side references for apps. Client code is app-only.

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
| `server-app-connected-clients` | Connected clients | list attached clients, send to specific clients |
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

Full developer docs in `docs/`. The index is `docs/llms.txt`.

### For bots

| File | Contents | Tokens |
|------|----------|--------|
| `docs/llms-bot-guides.txt` | Concepts, tutorials, how-tos | ~61K |
| `docs/llms-bot-api.txt` | All endpoints, parameters, types, errors | ~141K |
| `docs/llms-bot.txt` | Combined (guides + API) | ~202K |

### For apps

| File | Contents | Tokens |
|------|----------|--------|
| `docs/llms-app-guides.txt` | Concepts, tutorials, how-tos | ~106K |
| `docs/llms-app-api.txt` | All endpoints, parameters, types, errors | ~163K |
| `docs/llms-app.txt` | Combined (guides + API) | ~270K |

### Everything

| File | Contents | Tokens |
|------|----------|--------|
| `docs/llms-full.txt` | All documentation | ~470K |

### Individual articles

`docs/llms/` contains individual markdown files organized by topic. See `docs/llms.txt` for the full index with descriptions.

## Schemas

Machine-readable reference files in `schemas/`.

- **`permissions-map.json`** — maps every SDK method to its required manifest permission. Use this when setting up `root-manifest.json`.
- **`root-manifest.*.schema.json`** — JSON schemas for validating app and bot manifests.
