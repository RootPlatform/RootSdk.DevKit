# apps/

End-to-end runnable Root app samples. Each has a React/TypeScript client UI, a Node/TypeScript server, and a Protobuf RPC layer wiring them together. Each sample is a complete fork-and-adapt starting point for a real Root app.

For per-method SDK reference (one folder per method surface), see `api-samples/`. For composition patterns answering "how do I combine X with Y?", see `recipes/`.

This file contains the conventions shared across every sample app: the standard fork procedure and the lib helpers and primitives meant to be copied verbatim into any sample. Each per-sample AGENTS.md adds only the content specific to *that* sample.

## Standard Root app fork procedure

This is the canonical sequence for adapting any sample app into a new app. Each per-sample AGENTS.md adds notes to specific steps (e.g. which stores to replace, which manifest settings to retain) but doesn't repeat the procedure itself.

1. **`npm run clean`** at the workspace root — wipes generated dirs (`node_modules`, `dist`, `networking/gen`, lockfiles, `*.pkg`).
2. **Find-replace the package namespace.** `@<sample>/` → `@<yourapp>/` across `package.json` (root + workspaces), all source `import` statements, and `networking/root-protoc.json`. The packages are linked via `file:./networking/gen/{client,server,shared}` so the namespace must match.
3. **Edit `root-manifest.json`** — new `id` (use `rootsdk new id` or generate fresh), reset `version` to `1.0.0`, update the manifest `settings` block if your admin-selection shape differs from the sample's. Narrow `community.fullControl` to a tighter superset if your fork's permission needs are predictable up front.
4. **Replace the proto** (`networking/src/<service>.proto`) with your service definition. Preserve these conventions across any Root app:
   - Proto enum-prefix on every value (`YOUR_ERROR_NOT_ADMIN`, `YOUR_ERROR_INVALID_INPUT`, etc. — every value in every enum).
   - Public-vs-admin broadcast split conditional on payload sensitivity (admin-only payloads carry per-row state and target admin audiences; public companions carry minimal identifiers and target `"all"`).
   - `AdminsChanged` empty-signal broadcast for `globalSettings.admins` changes — clients re-fetch their `amIAdmin` flag.
   - `ReportClientError` RPC for the telemetry funnel.
5. **Replace sample-specific server-side files** (stores, services, event handlers). Each per-sample AGENTS.md lists what to replace and what shape to preserve.
6. **Replace sample-specific client components.** Keep the layout primitives verbatim — they're domain-neutral. Each per-sample AGENTS.md lists which components are sample-specific replacements.
7. **Update this sample's AGENTS.md.** Replace the implementation-patterns body wholesale; align Demonstrates / Does NOT demonstrate / Adapt / Replace tables to what your fork keeps and changes.
8. **Verify your domain invariants.** Each sample notes the invariants that should hold after a successful fork (e.g. platform-state consistency, reconcile correctness, atomic-mutation guarantees). Run the server through one full cycle before considering the fork complete.

## Shared lib helpers (copy verbatim into any forked sample)

These files are domain-agnostic — drop them straight into a new app without changes. They're authored in `leveling-leaderboard` and copied verbatim across most other samples.

### Server

| File | Purpose |
|---|---|
| `server/src/lib/log.ts` | Structured log helper |
| `server/src/lib/retry.ts` | `withRetry()` wrapper for SDK calls with bounded jitter |
| `server/src/lib/safeBroadcast.ts` | Logs-and-swallows broadcast failures so they don't propagate to the caller |
| `server/src/adminCheck.ts` | Admin gating against `globalSettings.general.admins` ∪ community owner. Includes the `onAdminsChanged` callback hook for emitting the public refresh signal. |

### Client primitives

| File | Purpose |
|---|---|
| `client/src/lib/retry.ts` | `withClientRetry()` for client-side RPC retry with bounded jitter |
| `client/src/lib/rootColorScheme.ts` | Bridge keeping document `color-scheme` in sync with `rootClient.theme` so native form chrome follows the theme |
| `client/src/lib/useDebouncedMutation.ts` | Debounced auto-save hook — coalesces rapid edits into one RPC after typing settles |
| `client/src/components/{Loader,EmptyState,QueryError,Button,TextInput,Icon,AutoSaveStatus}.tsx` | Generic UI primitives. No SDK or app-specific imports. |
| `client/src/components/{ErrorBoundary,AdminOnly,AppHeader}.tsx` | App-agnostic by design — they take SDK-bound values (telemetry hook, `isAdmin`, app title) as props rather than reading them from app-specific contexts. Verbatim-copyable; only the wiring in `App.tsx` needs to be redone. |
| `client/src/styles/globals.css` | Root theme tokens + reset |
| `client/src/index.tsx` | React entrypoint (verbatim — only mounts `<App/>`) |

## Universal patterns

These patterns are shared across every Root app and don't need to be re-explained in each per-sample AGENTS.md.

- **Admin gating.** `globalSettings.general.admins` is a `roleOrMember` setting in `root-manifest.json` configured by the community owner via Root's native Global Settings UI. Server reads the resolved `ReadOnlyMemberGroup` on each `isAdmin()` check; community owner is always implicitly an admin (defence in depth — if the owner ever clears themselves out of the admins selection, they can still recover).
- **Telemetry funnel.** `ErrorBoundary` fires `ReportClientError` on client-side render failures. Server handler logs structured `error` lines with per-caller rate limit + per-field size caps to bound log impact under misbehaving boundaries.
- **`AdminsChanged` empty-signal broadcast.** Public `"all"` audience. Fires when `globalSettings.general.admins` changes. Clients re-fetch their `amIAdmin` flag from the server (computed against `globalSettings`, which the client doesn't see directly).
- **Auto-save.** `useDebouncedMutation` coalesces rapid Settings edits into one RPC after typing settles (~150ms). `AutoSaveStatus` only shows chrome on error; successful saves are invisible.

## How to run an app locally

Every sample app in this folder runs the same way: build at the root, then two terminals — devhost for the server, Vite for the client. Plus a one-time `DEV_TOKEN` step that requires a human.

### One-time setup (human-required)

Agents can't reach the [Root Developer Portal](https://dev.rootapp.com) — this step needs a person:

1. **Generate a `DEV_TOKEN`** in the portal. The portal also creates a `<app-name>-TEST` community if one doesn't already exist from a prior token.
2. **Paste the token into `server/.env`** (note: `server/`, not the app root). The portal copy already includes the `DEV_TOKEN=` prefix:
   ```
   DEV_TOKEN=<paste from portal>
   ```

If you're an agent and `server/.env` doesn't exist, stop and ask the human owner for a `DEV_TOKEN` rather than guessing.

### Run

From the app root:

```sh
npm install
npm run build   # builds networking → server → client
```

Then in two terminals, each starting from the app root:

```sh
# Terminal 1 — server (devhost)
cd server && npm run server

# Terminal 2 — client (Vite dev server)
cd client && npm run client
```

The server runs `rootsdk start devhost --project-folder=../` so devhost finds `root-manifest.json` at the app root. Vite prints a localhost URL — open it to load the client UI inside Root's iframe via the `<app-name>-TEST` community.

For the full devhost reference (options, behavior, common errors), see [`api-samples/cli/src/start-devhost.md`](../api-samples/cli/src/start-devhost.md).

## Picking a sample

The full apps catalog (description, complexity, key patterns) is in the root [AGENTS.md](../AGENTS.md). Per-sample folders contain the actual sample content; their AGENTS.md focuses on what's unique to *that* sample.
