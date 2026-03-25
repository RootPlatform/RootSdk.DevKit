# RootSdk.DevKit — Agent Navigation Guide

Developer toolkit for building apps and bots on the Root Platform. This guide helps you find the right resources for any task.

## Quick Start

**Building a bot** (server-only automation):
1. Copy `templates/bot/` to your target location
2. Load `docs/llms-bot-guides.txt` (~61K tokens) and `docs/llms-bot-api.txt` (~141K tokens)
3. Reference `how-to/` bots for working examples of each SDK domain
4. For complete SDK usage per domain, always check the matching `how-to/` module — each one demonstrates every method. Sample bots only show targeted use cases.

**Building an app** (client UI + server):
1. Copy `templates/app/` to your target location
2. Load `docs/llms-app-guides.txt` (~106K tokens) and `docs/llms-app-api.txt` (~163K tokens)
3. Read the template files — `server/src/main.ts`, `server/src/exampleService.ts`, `client/src/Example.tsx`, `networking/src/example.proto`
4. Reference `how-to/` bots for server-side SDK patterns (server code is identical between apps and bots)
5. For complete SDK usage per domain, always check the matching `how-to/` module — each one demonstrates every method. Sample bots only show targeted use cases.

**Not sure which to build?** Read `docs/llms/overview/choose-app-or-bot.md`.

## Key Conventions

- **Apps** import from `@rootsdk/server-app`. **Bots** import from `@rootsdk/server-bot`.
- All server-side SDK code is identical between apps and bots except the import path.
- The `rootServer` object is the SDK entry point. Everything hangs off `rootServer.community.*`, `rootServer.dataStore.*`, `rootServer.lifecycle.*`, etc.
- **Set permissions** in `root-manifest.json` — each how-to README lists the permissions its APIs require. `schemas/permissions-map.json` maps every SDK method to its required permission.

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
