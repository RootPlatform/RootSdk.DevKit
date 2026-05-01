---
kind: sample-app
description: Community suggestion board
complexity: complex
key_patterns:
  - multiple services
  - voting
  - error handling
  - client state management
---

# suggestion-box

Community suggestion board — members post suggestions, upvote, and delete their own. The most complex end-to-end app sample.

## Coverage scope

**Demonstrates:** multiple protobuf services (suggestions + votes), SQLite persistence via Knex with foreign-key cascades, React context for client-side caching, broadcast events for cross-client sync, domain error codes thrown as `RootServerException` and handled on the client, separate `shared/` workspace.

**Does NOT demonstrate:**
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users). Authors are rendered as raw user-ID strings.
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules). Anyone connected can create or vote.
- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).
- Retry / resilience — see [`api-samples/server-resilience`](../../api-samples/server-resilience). The client restarts on unexpected errors; production code should retry transient failures instead.

Use this sample as a shape reference for multi-service architecture, SQLite + repository, and client context caching. Consult the listed api samples for concerns it doesn't cover.
