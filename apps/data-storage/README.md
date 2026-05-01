---
kind: sample-app
description: Task list with persistence
complexity: moderate
key_patterns:
  - SQLite database
  - CRUD operations
---

# data-storage

Task list with persistence. Demonstrates three interchangeable storage backends (in-memory, Knex/SQLite, Prisma) behind a shared repository interface.

## Coverage scope

**Demonstrates:** SQLite persistence via Knex and via Prisma, the in-memory equivalent for testing, CRUD service pattern, client-server RPC.

**Does NOT demonstrate:**
- UI theming — see [`api-samples/client-app-theme`](../../api-samples/client-app-theme). The client UI uses hardcoded styling.
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users). Tasks here are not scoped to a user.
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules).
- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience).

Use this sample when choosing between Knex and Prisma, or for the repository pattern. Consult the listed api samples for concerns it doesn't cover.
