# bots/

Server-only Root automation samples. A bot is a Root app without a client UI: it runs in the Root cloud, subscribes to platform events (messages, member joins, role changes), and calls the SDK to react. Equivalent in shape to a Discord bot, but hosted by Root and using the `@rootsdk/server-bot` SDK.

For full apps with client UI, see `apps/`. For per-method SDK reference, see `api-samples/`. For composition patterns, see `recipes/`.

This file contains conventions shared across every sample bot. Each per-sample AGENTS.md adds only the content specific to *that* sample.

## Bot vs app: structural differences

| Aspect | Bot | App |
|---|---|---|
| Folder layout | Flat `src/` at the bot root | Nested workspaces: `client/`, `server/`, `networking/` |
| Client UI | None | React/TypeScript |
| Networking | Direct SDK calls only | Custom Protobuf RPC |
| SDK package | `@rootsdk/server-bot` | `@rootsdk/server-app`, `@rootsdk/client-app` |
| Event source | Platform events (messages, member changes) | Platform events + client RPC calls |

Server-side patterns (admin gating, structured logging, retry/backoff, broadcast semantics) are conceptually identical across bots and apps — the SDK shape is the same. Sample bots intentionally stay minimal and inline whatever they need; if a bot grows complex enough to benefit from shared lib helpers, see [`apps/AGENTS.md`](../apps/AGENTS.md) for the canonical helper set.

## Standard Root bot fork procedure

1. **`npm run clean`** at the bot root — wipes generated dirs (`node_modules`, `dist`, lockfiles, `*.pkg`).
2. **Find-replace the package namespace.** `@<sample>/` → `@<yourbot>/` across `package.json` and all source `import` statements.
3. **Edit `root-manifest.json`** — new `id` (use `rootsdk new id` or generate fresh), reset `version` to `1.0.0`, update the manifest `permissions` block to declare exactly the SDK methods your bot uses (see [`schemas/permissions-map.json`](../schemas/permissions-map.json) for the SDK-method-to-permission mapping). Update the `settings` block if your bot has admin-configurable settings.
4. **Replace event handlers in `src/`.** Each per-sample AGENTS.md notes which handlers are sample-specific replacements vs which patterns transfer.
5. **Update this sample's AGENTS.md.** Replace the implementation body wholesale; align Demonstrates / Does NOT demonstrate to what your fork actually does.

## How to run a bot locally

Every sample bot in this folder runs the same way: three commands, plus a one-time `DEV_TOKEN` step that requires a human.

### One-time setup (human-required)

Agents can't reach the [Root Developer Portal](https://dev.rootapp.com) — this step needs a person:

1. **Generate a `DEV_TOKEN`** in the portal. The portal also creates a `<bot-name>-TEST` community if one doesn't already exist from a prior token.
2. **Paste the token into `.env`** at the bot root. The portal copy already includes the `DEV_TOKEN=` prefix:
   ```
   DEV_TOKEN=<paste from portal>
   ```

If you're an agent and `.env` doesn't exist, stop and ask the human owner for a `DEV_TOKEN` rather than guessing.

### Run

```sh
npm install
npm run build
npm run bot
```

`npm run bot` shells out to `rootsdk start devhost`, which boots the bot in Root's local DevHost. Community API calls flow through Root's servers and appear in the `<bot-name>-TEST` community.

For the full devhost reference (options, behavior, common errors), see [`api-samples/cli/src/start-devhost.md`](../api-samples/cli/src/start-devhost.md).

## Picking a sample

The full bots catalog (description, complexity, key patterns) is in the root [AGENTS.md](../AGENTS.md). Per-sample folders contain the actual sample content; their AGENTS.md focuses on what's unique to *that* sample.
