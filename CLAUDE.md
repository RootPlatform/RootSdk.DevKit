# RootSdk.DevKit

Developer toolkit for building apps and bots on the Root Platform. This repo is designed for AI agents — clone it, read it, build with it.

## What's Here

| Directory | Purpose |
|-----------|---------|
| `how-to/` | Standalone bots, one per API domain. Every SDK method covered with working code. |
| `llms/templates/bot/` | Bot project template — the starting point for new bots. |
| `llms/templates/app/` | App project template — client + server + networking starting point. |

## Building a New Root Bot

1. **Copy `llms/templates/bot/`** into a new project subfolder at your target location (e.g., `target/my-bot/`, not directly into `target/`).
2. **Read the relevant `how-to/` bot** for working examples of each SDK domain (messages, channels, roles, files, etc.).
3. **Set permissions** in `root-manifest.json` — each how-to bot's README lists the permissions its APIs require.

## Building a New Root App

1. **Copy `llms/templates/app/`** into a new project subfolder at your target location.
2. **Read the template files** — `server/src/main.ts`, `server/src/exampleService.ts`, `client/src/Example.tsx`, `networking/src/example.proto` show the full client-server-protobuf pattern.
3. **Reference `how-to/` bots** for server-side SDK API patterns.

## Key Conventions

- **Apps** import from `@rootsdk/server-app`. **Bots** import from `@rootsdk/server-bot`.
- All server-side SDK code is identical between apps and bots except the import path.
- The `rootServer` object is the SDK entry point. Everything hangs off `rootServer.community.*`, `rootServer.dataStore.*`, `rootServer.lifecycle.*`, etc.

## SDK Research Locations

When you need to look up types, methods, or behaviors:

| What | Where |
|------|-------|
| SDK client types, request/response types, enums, events | `RootApp.AppSdk/sdk/server-bot/` or `sdk/server-app/` |
| Permissions per SDK method | `Docs.Developer/content/api-supplements/api-method-permissions.json` |
| Developer-facing docs | `Docs.Developer/dist/` |
| Integration tests (real usage) | `Ops.Testing/test-server-multi/tests/test-cases/src/` |

**Note:** `server-multi` tests take a `communityId` on every call. In `server-app` and `server-bot`, the community ID is handled automatically. Use `server-bot`/`server-app` types as the reference — `server-multi` will have extra parameters.
