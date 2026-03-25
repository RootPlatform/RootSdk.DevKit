---
path: app-docs/debug/logging-developer.md
audience: app
category: guide
summary: Debug your deployed server code by viewing console output in the Developer Portal.
---

# Developer log

Debug your deployed server code by viewing console output in the Developer Portal.

## What is the developer log?

The *developer log* is a persistent, developer-visible log that captures everything your server writes to `stdout` or `stderr`. It appears in the Root Developer Portal and helps you understand what your code is doing once it's running in the Root cloud.

Each instance of your server has its own log. If your server is installed in five communities, you'll have five separate logs.

Key characteristics:

- Messages are visible to you, the developer. Community members cannot see them.
- Older messages may be automatically removed as new ones arrive.

## How the developer log works

When your server writes to `stdout` or `stderr`, Root captures the output and makes it visible in the Developer Portal. This includes `console.log()`, `console.error()`, `console.warn()`, and any logging library that writes to standard output.

Open the **Logs** tab in the Developer Portal to view messages from your deployed server.

## When to use the developer log

- **Track execution flow.** Log entry and exit points, key decisions, and state changes to understand how your code behaves in production.
- **Debug deployment issues.** When your server works locally but fails in the cloud, logs help you identify what's different.
- **Monitor health.** Log warnings or errors when your server encounters unexpected conditions.
- **Diagnose user reports.** When users report problems, check logs from their community's instance.

Avoid writing large or frequent logs in production since you'll only see the most recent lines. Don't log sensitive data like passwords or secrets; logs are visible in the Developer Portal and aren't encrypted.

## Writing to the developer log

No special API is needed. Use standard console methods:

```ts
console.log("Starting vote tally...");
console.warn("No votes found for this round");
console.error("Poll not found in database:", err);
```

These messages appear in the Developer Portal when your server runs, assuming the community has enabled developer logging.