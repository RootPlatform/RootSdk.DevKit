---
path: app-docs/design/handle-real-time-failures.md
audience: app
category: guide
summary: Real-time software, by its nature, involves rapid data changes and constant synchronization. Networking failures and disconnects will happen.
---

# Handle failures in a real-time environment

Real-time software, by its nature, involves rapid data changes and constant synchronization. Networking failures and disconnects will happen. Your job is to make sure your App handles these problems without losing data or confusing users. This guide shows how to make your Root App resilient when things go wrong.

By the end of this article, you’ll be able to:

- **Explain** why saving state early and often matters
- **Save state** safely and reliably on the server
- **Reload client state** after a restart
- **Design your UI** to guide users through sync and reconnects
- **Test** your App’s failure recovery

## What Root handles for you

Root takes care of network reliability. It:

- Detects disconnects
- Restarts clients automatically after a networking failure
- Restarts servers when needed

You don’t need to write retry code or worry about message delivery. Root handles the connection layer.

Your focus should be on:

- Saving App state to the server
- Making server operations idempotent
- Designing a UI that recovers gracefully

## Save state aggressively

Failures can happen anytime. Save data as soon as possible.

- **Save immediately** – When users take action, write the result to the server-side SQLite database right away. Don’t wait.  
- **Make operations idempotent** – Your server logic should allow the same request to run more than once without causing problems. This keeps your data consistent if a request is retried.

## Recover state on the client

Assume the client can lose its state at any time. When it restarts or reconnects:

- **Always pull full state** – Re-fetch everything from the server. Don’t rely on local storage or cached data.  
- **Treat local state as disposable** – Assume anything on the client is temporary and might be wiped.

## Help users during sync and failure

Even during errors, the user should never feel lost.

- **Show clear messages** – Use text like “Loading...” or “Reconnecting...” so users know what’s happening.  
- **Avoid blank screens** – Show placeholders or loading indicators instead of missing or outdated content. Keep the UI usable.

## Test your failure handling

Don’t wait for real users to discover bugs. Actively test failure scenarios:

- **Restart clients and servers** – Make sure your App can recover its full state with no user action.  
- **Measure performance** – Track how fast state is saved and recovered. Aim for low latency and smooth transitions.

## Conclusion

You can’t prevent every failure—but you can prepare for them. Save critical data right away. Pull all state from the server after reconnect. Keep users informed with a clear UI.