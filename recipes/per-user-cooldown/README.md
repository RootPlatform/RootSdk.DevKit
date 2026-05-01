---
kind: recipe
category: per-user
question: How do I rate-limit a per-user action so it can only happen once per N seconds, atomically?
composes:
  - server-database
  - networking-app-services
exemplified_by: leveling-leaderboard
---

# Recipe: Per-User Cooldown

> *"How do I rate-limit an action so each user can only do it once per N seconds?"*

A single SQL statement does the whole job: atomically check whether the caller's last claim was longer ago than the cooldown, and either record a new claim or reject the call. No locks, no in-memory state, no race conditions.

Server-only — no UI, no client. The lesson is the **atomicity primitive**: one statement that returns 1 (claim recorded) or 0 (cooldown active), driven by `INSERT … ON CONFLICT DO UPDATE WHERE`.

## TL;DR

```
        client calls Claim()                        SQLite
              │                                        │
              ▼                                        │
   ┌────────────────────┐    INSERT … ON CONFLICT      │
   │ cooldown-service   │ ─── DO UPDATE WHERE      ───►│
   │   (RPC handler)    │     last + cooldown ≤ now    │
   └────────────────────┘                              │
              ▲                                        │
              │   changes = 1 → claim ok               │
              │   changes = 0 → cooldown active        │
              │                                        │
              ◄────────────────────────────────────────┘
```

## What this recipe is

The minimum viable per-user rate limiter. Three things matter:

1. **Atomicity.** A naive `SELECT last_claimed_at` followed by `UPDATE` loses to concurrent callers — both reads can pass before either write lands, and both claims succeed. SQLite serializes statements, so a single `INSERT … ON CONFLICT DO UPDATE` is the simplest atomic primitive available.

2. **One row per user.** `user_id` is the primary key. There's no claim history — only "when did this user last claim". The table grows with active users, not with claims, which keeps it small.

3. **`changes` carries the answer.** SQLite's `db.run` exposes the row count via `this.changes`. INSERT-success → 1. UPDATE-success → 1. UPDATE blocked by the WHERE → 0. Caller branches on that one number — no follow-up SELECT on the hot path, no exception types.

## The SQL

```sql
INSERT INTO user_cooldowns (user_id, last_claimed_at)
VALUES (?, ?)
ON CONFLICT(user_id) DO UPDATE
  SET last_claimed_at = excluded.last_claimed_at
  WHERE user_cooldowns.last_claimed_at + ? <= excluded.last_claimed_at
```

Reading it line by line:

- **`INSERT … VALUES (?, ?)`** — the row we'd write if no row existed. First parameter is `user_id`, second is `now` (Unix ms).
- **`ON CONFLICT(user_id)`** — when the PK already has a row, run the `DO UPDATE` clause instead of failing.
- **`SET last_claimed_at = excluded.last_claimed_at`** — `excluded` refers to the would-be-inserted row. The update writes the new timestamp.
- **`WHERE user_cooldowns.last_claimed_at + ? <= excluded.last_claimed_at`** — the gate. Only run the UPDATE if the existing row's timestamp plus the cooldown is at or before the new timestamp. Third parameter is `cooldownMs`.

The four cases collapse to two outcomes:

| Existing row? | Cooldown elapsed? | What runs | `changes` |
|---|---|---|---|
| No | n/a | INSERT | 1 |
| Yes | Yes | UPDATE | 1 |
| Yes | No | nothing (WHERE blocks UPDATE) | 0 |
| (impossible — user_id is PK) | — | — | — |

`changes === 1` means the claim was recorded. `changes === 0` means the user is still inside their cooldown window.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-database`](../../api-samples/server-database) | Opening SQLite via `rootServer.dataStore` + running migrations | The `user_cooldowns` table + the atomic UPSERT |
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services + typed errors | One callable RPC (`Claim`) + one typed rejection (`NOT_ELAPSED`) |

The cooldown mechanic is server-side only — no ergonomics-grade UI for "you must wait N seconds" lives in this recipe. Forks that want a button-with-countdown UI are welcome to add a client; the server contract is already shaped to support it (the `cooldown_ends_at` field on the response gives the client an exact deadline).

> **A note on `@rootsdk/client-app` in `devDependencies`.** This is a server-only recipe — no `client/` workspace, no client runtime dep — but `@rootsdk/client-app` shows up as a *build-time* devDep. The reason: `rootsdk-protoc` always emits server + shared + **client** trees and typechecks all three, even when the calling project never imports the client. The `clientPackageName` field in `root-protoc.json` names that output but doesn't disable it. So the typecheck step transitively needs `@rootsdk/client-app` available. Forks that add a real `client/` workspace should promote this to a regular `dependencies` entry.

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) declares a server but no client — this is a Bot-shaped recipe (no UI to render). Permissions: `channel.createMessage` for the test driver only. Forks should drop that permission unless they're posting messages.

### 2. Schema

[`server/src/db.ts`](server/src/db.ts) creates one table:

```sql
CREATE TABLE IF NOT EXISTS user_cooldowns (
  user_id TEXT PRIMARY KEY,
  last_claimed_at INTEGER NOT NULL  -- Unix ms
)
```

`user_id` is the natural key — at most one row per user, and the PK drives the `ON CONFLICT(user_id)` clause. `last_claimed_at` is stored as `INTEGER` (Unix ms) so the WHERE arithmetic stays in pure integer math without timezone or string parsing.

The schema also exposes a `runWithChanges` helper that resolves with `this.changes` — sqlite3's row-count callback. The `function()` form (not arrow) is required so sqlite3 can bind `this` to the statement context.

### 3. The store helper

[`server/src/cooldown-store.ts`](server/src/cooldown-store.ts) is the recipe's central artifact. The `tryClaim` function is the only public surface:

```typescript
const result = await tryClaim(getDb(), userId, now, cooldownMs);
if (result.kind === "ok") {
  // claim recorded; result.claimedAt and result.cooldownEndsAt are set
} else {
  // result.kind === "cooldown"; result.cooldownEndsAt tells you when retry is allowed
}
```

The function runs the atomic UPSERT, branches on `changes`, and on rejection issues one extra SELECT to read the existing timestamp so the caller can tell the user when their cooldown ends. The hot path (claim succeeds) is one statement; the cold path (rejected) is two.

`now` is **passed in by the caller**, not read inside the function. That's deliberate — the same `now` flows into both the SQL parameter and the returned `claimedAt` field, so the value the database stored and the value the client receives are exactly the same.

### 4. The service

[`server/src/cooldown-service.ts`](server/src/cooldown-service.ts) is a thin RPC handler. Reads `client.userId`, calls `tryClaim`, maps the rejection branch to `RootServerException(CooldownError.NOT_ELAPSED, …)`. The success branch returns ISO 8601 timestamps.

The `COOLDOWN_MS` constant (30 seconds) lives at the top of the file. Forks that want admin-tunable cooldowns should compose with [`app-settings-flat-values`](../app-settings-flat-values) — load the value once at startup, refresh on the settings update event. That's a separate lesson.

### 5. Wiring

[`server/src/main.ts`](server/src/main.ts):

```typescript
async function onStarting(state: RootAppStartState): Promise<void> {
  const db = await openDatabase();
  await runSchemaMigrations(db);

  rootServer.lifecycle.addService(cooldownService);

  initializeTestDriver(state.communityId);
}
```

Standard recipe shape: open DB, migrate, register service. The test-driver line is removed in production forks.

## Why not a different mechanism?

A few alternatives, and why this recipe doesn't use them:

- **In-memory `Map<userId, lastClaimedAt>`.** Loses state on every restart and across instances. Wrong choice for anything the user actually relies on (e.g., daily reward redemption).
- **Read-then-write in two statements.** Loses the race. Two concurrent claims from the same user can both pass the read before either write lands. The recipe's whole point is to avoid this.
- **`SELECT … FOR UPDATE` style row locking.** SQLite doesn't have it; you'd be modeling locks at the application level. The UPSERT-with-WHERE shape is simpler and works in plain SQLite.
- **Token bucket.** Right shape if you want N actions per window with bursts. Wrong shape for "one action per N seconds, full stop" — overkill, and harder to communicate to the user ("your bucket has 0.7 tokens" is not a useful error message).

## Does NOT cover

| Concern | Lives in |
|---|---|
| Per-action cooldown (different cooldowns for different commands) | Independent extension; add an `action` column to the PK and parametrize `cooldownMs` per call |
| Cooldown expiry / GC of stale rows | Independent concern; rows are small and cheap to leave indefinitely. Schedule a periodic cleanup if you have privacy-driven retention requirements |
| Admin-tunable cooldown duration | Compose with [`app-settings-flat-values`](../app-settings-flat-values) |
| Per-channel or per-community scoping | Independent extension; add a column to the PK |
| Bursts / token-bucket semantics | Wrong primitive — use a token-bucket library if you need burst tolerance |
| Client UX for "wait N seconds" | Out of scope; the server returns `cooldown_ends_at` so a client can render a countdown |

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-per-user-cooldown` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
>
> 1. Delete `server/src/test-driver.ts`.
> 2. Remove the `import { initializeTestDriver } from "./test-driver"` line at the top of `server/src/main.ts` AND the `initializeTestDriver(state.communityId)` call inside `onStarting`.
> 3. Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages.
>
> Production recipes should never expose a self-test command.

## Build and run

```bash
# From this directory
npm install
npm run build       # builds networking → server (no client)

# Then in one terminal (set DEV_TOKEN in server/.env first):
cd server && npm run server      # devhost
```

This recipe has no client. To exercise the cooldown manually, call the `Claim` RPC twice in quick succession from any client that can hit the service — the second call rejects with `NOT_ELAPSED` until 30 seconds have passed.
