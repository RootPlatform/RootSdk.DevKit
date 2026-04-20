# data-storage

Task list with persistence. Demonstrates three interchangeable storage backends (in-memory, Knex/SQLite, Prisma) behind a shared repository interface.

## Coverage scope

**Demonstrates:** SQLite persistence via Knex and via Prisma, the in-memory equivalent for testing, CRUD service pattern, client-server RPC.

**Does NOT demonstrate:**
- UI theming — see [`how-to/client-app-theme`](../../how-to/client-app-theme). The client UI uses hardcoded styling.
- User identity / profiles — see [`how-to/client-app-users`](../../how-to/client-app-users). Tasks here are not scoped to a user.
- Role/member permissions — see [`how-to/server-global-settings`](../../how-to/server-global-settings) and [`how-to/server-access-rules`](../../how-to/server-access-rules).
- Scheduling — see [`how-to/server-jobs`](../../how-to/server-jobs).
- Retry / resilience — see [`how-to/server-resilience`](../../how-to/server-resilience).

Use this sample when choosing between Knex and Prisma, or for the repository pattern. Consult the listed how-tos for concerns it doesn't cover.
