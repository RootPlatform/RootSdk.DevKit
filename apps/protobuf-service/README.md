# protobuf-service

Simple voting app — clients pick between two options, the server tallies and broadcasts updates to all connected clients.

## Coverage scope

**Demonstrates:** custom protobuf RPC service, broadcast events to all clients, minimal shared state on the server.

**Does NOT demonstrate:**
- UI theming — see [`how-to/client-app-theme`](../../how-to/client-app-theme).
- Persistence — see [`how-to/server-database`](../../how-to/server-database) or [`how-to/server-key-value-store`](../../how-to/server-key-value-store). State here is kept in memory and does not survive restarts.
- User identity / profiles — see [`how-to/client-app-users`](../../how-to/client-app-users).
- Role/member permissions — see [`how-to/server-global-settings`](../../how-to/server-global-settings) and [`how-to/server-access-rules`](../../how-to/server-access-rules). Anyone connected can vote.
- Retry / resilience — see [`how-to/server-resilience`](../../how-to/server-resilience).

Use this sample as a shape reference for RPC + broadcast. For anything that needs to survive a restart, consult the persistence how-tos.
