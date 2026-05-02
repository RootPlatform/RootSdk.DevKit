---
kind: recipe
category: error
question: How do I propagate domain-specific error codes from server to client and let the client branch on them?
composes:
  - networking-app-services
  - server-key-value-store
exemplified_by: suggestion-box
---

# Recipe: RPC Exceptions

> *"How do I send specific error codes from my server to my client and have the client respond differently to each one — instead of stringly-matching error messages?"*

> ⚠️ **App-only recipe.** This recipe is about the *cross-tier* contract — server throws, client catches and branches. Apps have both tiers; bots don't (no client). Bots use `RootServerException` and typed enum codes plenty (see `recipes/per-user-cooldown` throwing `CooldownError.NOT_ELAPSED` and branching on it inside its own server-side code), but that's intra-tier. The shapes in this recipe — and especially shape 3's `rootClient.lifecycle.restart()` — only make sense with a client to host them.

A first-to-claim-a-name app whose `Claim` RPC throws one of three typed errors. The same RPC's failures are caught on the client three different ways — three labelled buttons, three labelled handlers — so an agent reading the recipe sees every shape side-by-side instead of having to reconstruct them from a sample's CRUD code.

## TL;DR

```
                                client
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Claim button   │
                          │  3 shapes       │
                          └────────┬────────┘
                                   │ Claim(name)
                                   ▼
                       ┌────────────────────────┐
                       │     ClaimService       │
                       │  validate (name empty/ │
                       │  too long), then       │
                       │  atomic claimIfEmpty   │
                       └───┬────────────┬───────┘
                  success  │            │  failure
                           ▼            ▼
                  broadcast        throw RootServerException(
                  NameClaimed         ClaimError.X, "msg")
                                        │
                                        ▼
                       client catch → switch on err.code
                                        │
                                        ├── shape 1: if (handles 1 code)
                                        ├── shape 2: switch (handles all)
                                        └── shape 3: if + restart (side-effect)
```

The server validates the request, throws on each failure path with a typed code, and atomically writes on success. The client catches `RootServerException` and matches on `err.code` against the proto-defined `ClaimError` enum.

## Why typed errors?

The default failure mode for an RPC is a thrown `Error` whose only structured information is `.message` — a string. Clients can branch on the message, but:

- **Strings drift.** Tomorrow's translation, a typo fix, an admin tweak — any of these breaks any client that pattern-matches the message.
- **Strings aren't enumerable.** A client looking at a service contract can't see what errors might come back.
- **Strings can leak.** Server-side message text is meant for logs and admin surfaces; surfacing it raw in user UI exposes implementation detail.

Typed errors fix all three. The proto `enum` is the contract: every error code is a named, versioned, discoverable, stable identifier. Server throws `RootServerException(MyError.X, msg)`; client matches `err.code === MyError.X`. Message text becomes secondary — useful for logs and debug surfaces, but shouldn't be used as the branching key.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/networking-app-services`](../../api-samples/networking-app-services) | Custom RPC services, broadcasts, typed errors | The proto error enum + `RootServerException` throw + client catch |
| [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store) | KV reads/writes via `rootServer.dataStore.appData` | The single-slot atomic claim via `update()` (incidental — KV is the storage, not the lesson) |

## Walkthrough

### 1. Proto: declare the error enum

[`networking/src/claim_service.proto`](networking/src/claim_service.proto) declares `ClaimError`:

```proto
enum ClaimError {
  CLAIM_ERROR_UNSPECIFIED = 0;
  CLAIM_ERROR_NAME_EMPTY = 1;
  CLAIM_ERROR_NAME_TOO_LONG = 2;
  CLAIM_ERROR_NAME_ALREADY_CLAIMED = 3;
}
```

Two conventions to preserve in any fork:

- **Every value gets the full enum-name prefix in the proto.** `CLAIM_ERROR_NAME_EMPTY`, not just `NAME_EMPTY`. The protobuf-ts generator strips the prefix on the TS side for both server and client, so both ends read `ClaimError.NAME_EMPTY` (same enum, same name on both ends). Mixing prefixed and unprefixed values in the same proto enum produces inconsistent TS names.
- **`UNSPECIFIED = 0` is the proto3 default.** Proto3 zero-initialises scalar fields, so any unset enum slot reads as 0. Reserving 0 for `UNSPECIFIED` makes "I never set this" distinguishable from a real value — without it, the first real error code would silently appear on every uninitialised default. Domain enums start at 1; the SDK uses negative values for built-in errors.

### 2. Server: throw the typed error

[`server/src/claim-service.ts`](server/src/claim-service.ts) throws three different codes from one RPC:

```ts
const name = request.name.trim();
if (name.length === 0) {
  throw new RootServerException(
    ClaimError.NAME_EMPTY,
    "Name cannot be empty.",
  );
}
if (name.length > NAME_MAX_LENGTH) {
  throw new RootServerException(
    ClaimError.NAME_TOO_LONG,
    `Names are limited to ${NAME_MAX_LENGTH} characters.`,
  );
}
const claimedBy = client.userId;
const stored = await claimIfEmpty({ name, claimedBy });
if (!stored) {
  throw new RootServerException(
    ClaimError.NAME_ALREADY_CLAIMED,
    "Name slot is already claimed.",
  );
}
```

The `trim()` is load-bearing: it makes whitespace-only input fire `NAME_EMPTY` instead of slipping through as a "valid" non-empty string.

Two patterns worth copying:

- **Validate before consulting state.** `NAME_EMPTY` and `NAME_TOO_LONG` are determined from the request alone; they're cheap to check. `NAME_ALREADY_CLAIMED` requires a storage read. Validating first means malformed requests don't touch storage.
- **Message text is for operators, not end users.** The client renders its own user-facing copy keyed off the error code (see step 3). The user-facing copy lives on the client, where the server has no visibility into it — the message text is only for logs and debug surfaces.

### 3. Client: match on the typed code

[`client/src/App.tsx`](client/src/App.tsx) catches `RootServerException` from the same `Claim` RPC three different ways. Each shape deliberately catches a *different subset* of the error codes so the strengths of each style stand out — shape 1 handles one code, shape 2 handles all three, shape 3 handles a different one with a side effect.

#### Shape 1: single-code `if`

```ts
} catch (err) {
  if (err instanceof RootServerException && err.code === ClaimError.NAME_TOO_LONG) {
    setBanner("Names are limited to 32 characters.");
  }
}
```

Use when only one error matters at this call site. Other errors fall through unhandled — picking this shape says "I only care about one code in this code path." Real apps using shape 1 typically add a fallback `else` for generic failure surface; this recipe omits it to keep the shape pure.

#### Shape 2: multi-code `switch`

```ts
} catch (err) {
  if (err instanceof RootServerException) {
    switch (err.code) {
      case ClaimError.NAME_EMPTY:           setBanner("Please type a name."); break;
      case ClaimError.NAME_TOO_LONG:        setBanner("Names are limited to 32 characters."); break;
      case ClaimError.NAME_ALREADY_CLAIMED: setBanner("That name is already claimed."); break;
    }
  }
}
```

Use when several errors each map to distinct UI affordances. Covers every code in the enum — provided the enum is closed. The recipe omits a `default:` case to keep the shape clean, but a forking app expecting the server to add new codes over time should add one (`default: setBanner(err.message); break;`) so unknown codes surface generically instead of silently disappearing. This is what `apps/suggestion-box`'s `addVote` uses.

#### Shape 3: single-code `if` + side-effect

```ts
} catch (err) {
  if (err instanceof RootServerException && err.code === ClaimError.NAME_ALREADY_CLAIMED) {
    rootClient.lifecycle.restart();
  }
}
```

Use when an error implies the client's cached state is stale and the cheapest fix is to refresh. The semantics: if the UI showed "Available" and the server says "claimed," a broadcast was missed in flight; restart resyncs everything via the initial `getClaim()` after reload. This is what `apps/suggestion-box`'s `deleteSuggestion` does for its `NOT_FOUND` case. Production usage typically pairs this with a fallback `else` for unexpected errors; this recipe omits it to keep the shape pure.

### 4. Picking a shape per call site

Real apps mix all three. Same app, different call sites:

| Call site | Likely shape | Why |
|---|---|---|
| Form submit with one realistic error | Shape 1 | Other errors prevented by upstream UI validation |
| Bulk action with several distinct failures | Shape 2 | Each error needs its own message / focus / recovery |
| Action that can fail because cache is stale | Shape 3 | Refreshing is the right fix; messages add no value |
| Generic action with mixed failures | Shape 2 + a `default:` case (variant not shown in this recipe) | Switch handles the known codes; the default catches anything new the server may add later |

### 5. Storage (incidental)

[`server/src/name-store.ts`](server/src/name-store.ts) keeps one record in KV via the atomic `update()` API. Storage is incidental to this recipe's lesson — see [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store) for the full KV surface, including the read-modify-write atomicity guarantee that makes `claimIfEmpty` race-safe.

## Test-only files in this recipe

> ⚠️ **`server/src/test-driver.ts`** is test infrastructure, **not part of the recipe's lesson.** It exposes a `/test-error-rpc-exceptions` slash command that lets the harness in `Code/Ops.Testing/test-devkit/test-recipes/` exercise the recipe's RPC service.
>
> **If you fork this recipe:**
> - Delete `server/src/test-driver.ts`
> - Remove the `import` and `initializeTestDriver(state.communityId)` line from `server/src/main.ts`
> - Drop `permissions.channel.createMessage` from `root-manifest.json` if your recipe doesn't otherwise need to post messages
>
> Production recipes should never expose a self-test command.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Network or transport errors | These don't reach `RootServerException` — they're SDK-level failures (connection drop, decode error). Catch with a generic `else` branch. |
| Generic JavaScript errors thrown from server code paths that aren't a typed `RootServerException` | Surface via `err instanceof Error ? err.message : String(err)` as the fallback after the typed-error branches. |
| Retry/backoff classification (which errors are retryable?) | [`api-samples/server-resilience`](../../api-samples/server-resilience) — `withRetry()` and the retryable-error classification are orthogonal to the typed-code contract. |
| Logging or telemetry of caught errors | Independent concern. Apps that need it can layer a `console.error` plus a `ReportClientError` RPC alongside the matched branches; see `apps/leveling-leaderboard`'s `ErrorBoundary` funnel for one pattern. |
| Error surfacing in toast / modal / inline / focus-target UI | UX concern — this recipe uses a single inline banner for clarity; production apps will pick the affordance per error. |
