# recipes/

Composition tasks. Each recipe answers a single "How do I X?" question by combining multiple `api-samples/` primitives into a working, runnable example. Recipes sit between `api-samples/` (per-method primitives) and `apps/` (full architectural exemplars).

For per-method SDK reference, see `api-samples/`. For end-to-end runnable apps, see `apps/`. For server-only automation, see `bots/`.

This file contains conventions shared across every recipe. Each per-recipe AGENTS.md adds only the content specific to *that* recipe.

## Naming convention

Recipe folders are category-prefixed so the catalog clusters by problem area:

| Prefix | Problem area |
|---|---|
| `app-settings-` | In-app Settings page, KV vs SQLite, per-context overrides |
| `audio-` | Sound effects, autoplay policy, asset bundling |
| `chat-` | Triggering on user messages, replying, mentions |
| `data-` | Database queries, batching, pagination |
| `external-` | Calling external HTTP APIs |
| `per-user-` | Per-user state, cooldowns, rate limits |
| `ui-` | Client-side gates, role-driven feature exposure |

A new recipe picks the prefix that best signals its problem area. If none fits, propose a new prefix in the recipe's frontmatter and update the root catalog.

## Recipe shape

Every recipe is a self-contained, runnable Root app — same workspace layout as `apps/` but typically smaller:

```
<recipe>/
├── client/        # React UI (omitted for bot-only recipes)
├── server/        # Node/TypeScript server
├── networking/    # Protobuf RPC service definitions
├── root-manifest.json
└── package.json
```

Recipes are app-shaped by default. A recipe that doesn't need a client UI can omit `client/` and `networking/`. App-only recipes (any UI surface) say so up front in their AGENTS.md — bots have no client UI and configure exclusively via `globalSettings`.

## Standard recipe fork procedure

Recipes are usually *studied* and pattern-copied into an existing app, not forked wholesale. When you do fork one to scaffold something new:

1. **`npm run clean`** at the recipe root.
2. **Find-replace the package namespace.** `@<recipe>/` → `@<yourapp>/` across `package.json` and source `import` statements. Recipe namespaces follow `@<lowercaseflattened>/` (e.g. `@appsettingsflatvalues/`).
3. **Edit `root-manifest.json`** — new `id`, reset `version` to `1.0.0`, narrow `permissions` to your needs.
4. **Replace the proto** with your service definition. Preserve the universal proto conventions (enum-prefix every value, `ReportClientError` if your fork has a UI, `AdminsChanged` if your fork uses admin gating). See [`apps/AGENTS.md`](../apps/AGENTS.md) for the full conventions list.
5. **Adapt the recipe's primary lesson** — the per-recipe AGENTS.md identifies which file embodies the recipe's pattern. Keep that file's shape; replace the domain-specific bits.
6. **Update this recipe's AGENTS.md.** Replace the implementation body wholesale; align Composes / Walkthrough / Does NOT cover to what your fork actually does.

Pattern-copy (the more common path): identify the recipe's primary lesson file (called out in each per-recipe AGENTS.md), copy it into your existing app, adapt the imports and types. No fork needed.

## Test-only files

Some recipes carry a `server/src/test-driver.ts` that exposes a slash command for the `Code/Ops.Testing/test-devkit/test-recipes/` harness. These files are **test infrastructure, not part of the recipe's lesson** — every per-recipe AGENTS.md that has one calls it out and tells you to delete it on fork. Production recipes never expose self-test commands.

## Picking a recipe

The full recipes catalog (question, composes, exemplified-by) is in the root [AGENTS.md](../AGENTS.md). Per-recipe folders contain the actual recipe content; their AGENTS.md focuses on what's unique to *that* recipe.
