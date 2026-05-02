---
kind: sample-app
description: Voting between two options
complexity: moderate
key_patterns:
  - custom RPC services
  - broadcast updates
---

# protobuf-service

Simple voting app — clients pick between two options, the server tallies and broadcasts updates to all connected clients.

## Coverage scope

**Demonstrates:** custom protobuf RPC service, broadcast events to all clients, minimal shared state on the server.

**Does NOT demonstrate:**
- UI theming — see [`api-samples/client-app-theme`](../../api-samples/client-app-theme).
- Persistence — see [`api-samples/server-database`](../../api-samples/server-database) or [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store). State here is kept in memory and does not survive restarts.
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users).
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules). Anyone connected can vote.
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience).

Use this sample as a shape reference for RPC + broadcast. For anything that needs to survive a restart, consult the persistence api samples.
