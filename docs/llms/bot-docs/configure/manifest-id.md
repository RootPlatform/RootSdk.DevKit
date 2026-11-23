---
path: bot-docs/configure/manifest-id.md
audience: bot
category: guide
summary: Unique identifier for your project, assigned by the Root Developer Portal. Required.
---

# Manifest `id`

Unique identifier for your project, assigned by the [Root Developer Portal](https://dev.rootapp.com). Required.

## Where to get it

When you create a project in the Developer Portal, Root generates a unique ID for it. Copy this ID into your manifest. If you used the `create-root` CLI to scaffold your project, the manifest contains a placeholder (`your-app-id` or `your-bot-id`) that you must replace with your real ID.

The ID is checked when you run `npx rootsdk build package` and again when you upload. If the build stops with `The id '...' in root-manifest.json is not an App ID`, the manifest still has the placeholder or an ID that isn't your App ID.

## Example

```json
{
  "id": "ACj4U-eThgmjXUOBAjk_jw",
  "version": "1.0.0",
  "package": { ... }
}
```