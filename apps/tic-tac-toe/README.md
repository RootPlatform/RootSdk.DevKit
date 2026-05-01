---
kind: sample-app
description: Real-time multiplayer game
complexity: complex
key_patterns:
  - shared game state
  - turn logic
  - multiple services
---

# tic-tac-toe

Real-time multiplayer game — two clients share a turn-based game state via broadcast events. The most architecturally complex sample.

## Coverage scope

**Demonstrates:** multiple protobuf services, shared turn-based game state, broadcast events across clients, layered architecture (controllers / repositories / features / lib), `var(--rootsdk-*)` theme tokens used throughout client CSS (correct styling pattern).

**Does NOT demonstrate:**
- Persistence — see [`api-samples/server-database`](../../api-samples/server-database) or [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store). Game state is in memory and resets on server restart.
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users). Players are rendered as raw user-ID strings.
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules).
- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience).

Use this sample as a shape reference for multi-service real-time architecture and as a second reference (after `apps/themes`) for client CSS that uses design tokens correctly.
