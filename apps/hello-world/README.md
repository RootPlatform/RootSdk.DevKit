# hello-world

Minimal echo service. A client sends a string, the server echoes it back and broadcasts the result to all connected clients.

## Coverage scope

**Demonstrates:** client-server RPC via protobuf, service broadcast to all clients, minimal app layout (client + server + networking workspaces).

**Does NOT demonstrate:**
- UI theming — see [`api-samples/client-app-theme`](../../api-samples/client-app-theme). The client UI here is unstyled; don't copy its raw HTML as a styling template.
- Persistence — see [`api-samples/server-database`](../../api-samples/server-database) or [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store). This sample keeps no state.
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users).
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules).
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience).

Use this sample as a shape reference for the workspace layout and protobuf service round-trip. Consult the listed api samples for concerns it doesn't cover.
