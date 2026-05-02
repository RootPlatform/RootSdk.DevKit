# api-samples/

Per-domain SDK reference. One folder per SDK domain (`server-messages`, `server-database`, `client-app-theme`, …). Each is a standalone bot whose source files exhaustively demonstrate every method on that domain — types, parameters, error shapes, edge cases, behavioral nuance.

For composition patterns answering "how do I combine X with Y?", see `recipes/`. For end-to-end runnable apps, see `apps/`. For the SDK-method-to-permission map, see [`schemas/permissions-map.json`](../schemas/permissions-map.json).

This file contains conventions shared across every api-sample. Each per-sample AGENTS.md adds only the content specific to *that* domain.

## Why these are bots

Server-side SDK code is identical between apps and bots except the import path: `@rootsdk/server-bot` vs `@rootsdk/server-app`. Hosting api-samples as bots removes the client/networking workspaces from each sample, keeping the focus on the server-side SDK surface. Every snippet here transfers verbatim into an app's `server/src/` — the only edit is the import line.

Client-side domains (`client-app-*`, `networking-app-services`) are app-only by nature and ship as apps. Their AGENTS.md says so up front.

## Standard adaptation procedure

api-samples are designed to be **read and pattern-copied**, not forked. The typical flow:

1. Find the domain you need in the root [AGENTS.md](../AGENTS.md) catalog.
2. Open the per-sample AGENTS.md to see which source files cover what.
3. Copy the relevant snippet into your project's `server/src/` (apps) or alongside your bot's source.
4. Swap the import from `@rootsdk/server-bot` → `@rootsdk/server-app` if you're in an app.
5. Declare the matching permission in your `root-manifest.json` (the per-sample AGENTS.md and [`schemas/permissions-map.json`](../schemas/permissions-map.json) both spell out which permission each method needs).

If you do want to run an api-sample standalone (to poke the SDK surface in isolation), follow the [`bots/AGENTS.md`](../bots/AGENTS.md) fork procedure — same shape.

## What every api-sample covers

Each folder's AGENTS.md follows a fixed shape so cross-domain navigation is predictable:

- **Source Files** — table mapping each `src/*.ts` to the methods it covers.
- **SDK Methods** — flat list of every method demonstrated, with one-line behavior notes.
- **Permissions** — the manifest block required, with a one-line gloss per permission.
- **Events** — every event the domain emits and what triggers it.
- **Apps vs Bots** — explicit note on whether the code transfers (almost always yes for server, no for client).
- **Key Behaviors** — gotchas, rate limits, edge cases, payload shape quirks. This is where the per-method behavioral nuance lives that's hard to derive from the type signatures alone.

When you fork an api-sample for any reason, preserve this section structure — it's the contract agents rely on for navigation.

## Picking an api-sample

The full api-samples index (categorized by Server-Community / Server-Persistence / Server-Lifecycle / Developer Tools / Client) is in the root [AGENTS.md](../AGENTS.md). Per-sample folders contain the actual code and behavioral reference; their AGENTS.md focuses on what's unique to *that* domain.
