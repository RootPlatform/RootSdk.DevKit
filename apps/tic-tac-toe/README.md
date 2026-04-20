# tic-tac-toe

Real-time multiplayer game — two clients share a turn-based game state via broadcast events. The most architecturally complex sample.

## Coverage scope

**Demonstrates:** multiple protobuf services, shared turn-based game state, broadcast events across clients, layered architecture (controllers / repositories / features / lib), `var(--rootsdk-*)` theme tokens used throughout client CSS (correct styling pattern).

**Does NOT demonstrate:**
- Persistence — see [`how-to/server-database`](../../how-to/server-database) or [`how-to/server-key-value-store`](../../how-to/server-key-value-store). Game state is in memory and resets on server restart.
- User identity / profiles — see [`how-to/client-app-users`](../../how-to/client-app-users). Players are rendered as raw user-ID strings.
- Role/member permissions — see [`how-to/server-global-settings`](../../how-to/server-global-settings) and [`how-to/server-access-rules`](../../how-to/server-access-rules).
- Scheduling — see [`how-to/server-jobs`](../../how-to/server-jobs).
- Retry / resilience — see [`how-to/server-resilience`](../../how-to/server-resilience).

Use this sample as a shape reference for multi-service real-time architecture and as a second reference (after `apps/themes`) for client CSS that uses design tokens correctly.
