# hello-world

Minimal echo service. A client sends a string, the server echoes it back and broadcasts the result to all connected clients.

## Coverage scope

**Demonstrates:** client-server RPC via protobuf, service broadcast to all clients, minimal app layout (client + server + networking workspaces).

**Does NOT demonstrate:**
- UI theming — see [`how-to/client-app-theme`](../../how-to/client-app-theme). The client UI here is unstyled; don't copy its raw HTML as a styling template.
- Persistence — see [`how-to/server-database`](../../how-to/server-database) or [`how-to/server-key-value-store`](../../how-to/server-key-value-store). This sample keeps no state.
- User identity / profiles — see [`how-to/client-app-users`](../../how-to/client-app-users).
- Role/member permissions — see [`how-to/server-global-settings`](../../how-to/server-global-settings) and [`how-to/server-access-rules`](../../how-to/server-access-rules).
- Retry / resilience — see [`how-to/server-resilience`](../../how-to/server-resilience).

Use this sample as a shape reference for the workspace layout and protobuf service round-trip. Consult the listed how-tos for concerns it doesn't cover.
