# API Sample: RPC Services

Custom RPC services with protobuf definitions, broadcasts, and error handling. Full round-trip: server implementation + client usage.

## Source Files

| File | What it covers |
|------|---------------|
| [item_service.proto](networking/src/item_service.proto) | ItemService proto: messages, error enum, RPC + broadcast definitions |
| [room_service.proto](networking/src/room_service.proto) | RoomService proto: messages, error enum, RPC + broadcast definitions |
| [item-service.ts](server/src/item-service.ts) | Server: CRUD with broadcast to "all" audience, RootServerException |
| [room-service.ts](server/src/room-service.ts) | Server: rooms with broadcast to Client[] audience |
| [room-tracker.ts](server/src/room-tracker.ts) | Server: in-memory room membership tracker (roomId to Client[]) |
| [main.ts](server/src/main.ts) | Server: addService() registration, self-test command |
| [ItemPanel.tsx](client/src/ItemPanel.tsx) | Client: ItemService RPC calls, broadcast subscriptions, error handling |
| [RoomPanel.tsx](client/src/RoomPanel.tsx) | Client: RoomService RPC calls, targeted broadcast subscriptions |
| [App.tsx](client/src/App.tsx) | Client: composition, rootClient identity, shared log |

## SDK Methods (Server)

- `rootServer.lifecycle.addService(service)` — register an RPC service (must be called in onStarting)
- `extends XxxServiceBase` — generated base class from proto; override RPC methods
- `this.broadcastXxx(event, audience, except?)` — send event to clients
- `throw new RootServerException(code, message)` — propagate error to calling client

## SDK Methods (Client)

- `serviceClient.method(request)` — call an RPC method (async, returns typed response)
- `serviceClient.on(event, listener)` / `.off(event, listener)` — subscribe to broadcast events
- `RootServerException` — catch server errors with typed error codes
- `rootClient.users.getCurrentUserId()` — get authenticated user's ID

## Broadcast Audience Types

| Audience | Type | Demonstrated by | Description |
|----------|------|-----------------|-------------|
| All clients | `"all"` | ItemService | Every client connected to this app |
| Specific clients | `Client[]` | RoomService | Only the listed clients (room members) |
| Community | `CommunityGuid` | (comment only) | All clients in a specific community |
| Client contexts | `ClientContext[]` | (comment only) | Lightweight client references |
| Member group GUID | `CustomMemberGroupGuid` | (comment only) | Persistent group by ID |
| Member group object | `ReadOnlyMemberGroup` | (comment only) | Persistent group by reference |

## Error Handling

Two patterns for server-to-client errors:

1. **RootServerException** (demonstrated) — throw on the server, catch on the client with `error instanceof RootServerException`. The `code` property matches the proto enum value, and `message` contains the human-readable string.

2. **Response field** (not demonstrated) — include a success/error field in the response proto message. The caller checks the field. See SuggestionBox sample for this pattern.

Each service defines its own error enum in its proto file (`ItemError`, `RoomError`). Codegen exports them in gen-shared for both server and client use.

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- No permissions required for RPC service operations — they use the app's connection
- `channel.createMessage` — only for the `/rpc-services` self-test command

## Project Structure

This is a workspace-based api sample (`networking/` + `server/` + `client/`) because proto compilation requires the `rootsdk build proto` toolchain. Other api samples are flat packages.

Build order: `networking` (proto compilation) → `server` (TypeScript) → `client` (TypeScript + Vite)

## Key Behaviors

- **Services must be registered** via `addService()` in the onStarting callback, before `start()` resolves. Multiple services can be registered independently.
- **The `except` parameter** in `broadcastXxx` excludes a client from receiving the broadcast. Typically the RPC caller — they already know the result from the return value.
- **Generated service clients** (gen-client) are pre-initialized singletons — no `connect()` or `start()` call needed. Import and use directly.
- **Broadcast events fire for OTHER clients** — the RPC caller gets the result via the return value, not the broadcast.
- **Each service defines its own error enum** in its own proto file. Error codes must be positive (negative codes are reserved for built-in `RootServerExceptionType`).
- **Proto `rpc BroadcastXxx(EventType) returns (rootsdk.Void)`** generates both a server-side `this.broadcastXxx()` method and a client-side event on the service client's TypedEventEmitter.
