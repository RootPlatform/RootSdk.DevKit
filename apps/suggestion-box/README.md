# suggestion-box

Community suggestion board — members post suggestions, upvote, and delete their own. The most complex end-to-end app sample.

## Coverage scope

**Demonstrates:** multiple protobuf services (suggestions + votes), SQLite persistence via Knex with foreign-key cascades, React context for client-side caching, broadcast events for cross-client sync, domain error codes thrown as `RootServerException` and handled on the client, separate `shared/` workspace.

**Does NOT demonstrate:**
- UI theming — see [`how-to/client-app-theme`](../../how-to/client-app-theme). The client CSS here hardcodes colors (`#007BFF`, `#ccc`, `#B0BEC5`); **do not copy this CSS pattern**. Real apps should use `var(--rootsdk-*)` tokens so light/dark mode works.
- User identity / profiles — see [`how-to/client-app-users`](../../how-to/client-app-users). Authors are rendered as raw user-ID strings.
- Role/member permissions — see [`how-to/server-global-settings`](../../how-to/server-global-settings) and [`how-to/server-access-rules`](../../how-to/server-access-rules). Anyone connected can create or vote.
- Scheduling — see [`how-to/server-jobs`](../../how-to/server-jobs).
- Retry / resilience — see [`how-to/server-resilience`](../../how-to/server-resilience). The client restarts on unexpected errors; production code should retry transient failures instead.

Use this sample as a shape reference for multi-service architecture, SQLite + repository, and client context caching. Consult the listed how-tos for concerns it doesn't cover — especially theming, since this sample actively demonstrates the wrong styling pattern.
