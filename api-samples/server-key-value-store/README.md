# API Sample: Key-Value Store

Persist JSON data scoped to your app's community — get, set, update, delete, pattern queries, and expiration.

## Source Files

| File | What it covers |
|------|---------------|
| [kv-store.ts](src/kv-store.ts) | Get, set, batch set, atomic update, delete, deleteLike, select, selectValue, expiration |

## SDK Methods

- `dataStore.appData.get` — retrieve a value by exact key
- `dataStore.appData.set` — upsert one or more key-value pairs
- `dataStore.appData.update` — atomic read-modify-write with default fallback
- `dataStore.appData.delete` — delete a single key
- `dataStore.appData.deleteLike` — delete all keys matching a LIKE pattern
- `dataStore.appData.select` — query key-value pairs by pattern (returns key, value, expiresAt)
- `dataStore.appData.selectValue` — query just values by pattern

## Permissions

```json
{}
```

No special permissions required. The key-value store is always available to your code.

The `channel.createMessage` permission in `root-manifest.json` is only for the `/server-key-value-store` command trigger, not for the KV store itself.

## Events

None. The key-value store does not emit real-time events when data changes.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **No permissions required** — the KV store is always available.
- **No events** — changes are not broadcast. Poll or track state yourself.
- **JSON serialization** — values are stored as JSON strings. Objects, arrays, numbers, booleans, and null all round-trip correctly.
- **Upsert on set** — if the key exists it is overwritten; if not, it is created.
- **get returns undefined** for missing or expired keys (does not throw).
- **delete succeeds silently** if the key does not exist.
- **update is atomic** — uses a database transaction for safe read-modify-write (counters, accumulators).
- **update uses defaultValue** when the key is missing or expired — the update function receives defaultValue as its input.
- **update returns the new value** — not the original.
- **Expiration** — set `expiresAt` on `set` or `update`. Expired keys are automatically filtered from reads and cleaned up every 60 seconds.
- **Pattern queries use SQL LIKE** — `%` matches any characters, `_` matches exactly one character.
- **Keys support special characters** — dots, slashes, colons, spaces are all valid. Use hierarchical patterns like `user:42:prefs`.
- **Batch set** — pass an array to `set` to upsert multiple keys in one call.
