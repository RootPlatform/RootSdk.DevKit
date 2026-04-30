---
path: bot-docs/configure/manifest-package.md
audience: bot
category: guide
summary: Deployment and startup configuration for your bot. Required.
---

# Manifest `package`

Deployment and startup configuration for your bot. Required.

The `package` field tells Root which files to bundle and how to launch your server. When you push, the CLI reads these paths and creates a `.pkg` archive containing your manifest and server code.

## Example

Bots are server-only, so the manifest declares a single `server` section:

```json
{
  "id": "...",
  "version": "1.0.0",
  "package": {
    "server": {
      "launch": "dist/main.js",
      "deploy": [
        "dist"
      ],
      "nodeModules": [
        "node_modules"
      ]
    }
  }
}
```

## Server

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `launch` | `string` | Yes | Path to the JavaScript entry point that Root executes to start your server (e.g., `dist/main.js`). Must be a `.js` file. |
| `deploy` | `string[]` | Yes | Directories to include in the server package, relative to the project root. Typically your compiled output (e.g., `["dist"]`). |
| `nodeModules` | `string[]` | Yes | `node_modules` directories to bundle with your server. These are your production dependencies (e.g., `["node_modules"]`). |

## How packaging works

When you push, the CLI:

1. Reads the paths from your manifest.
2. Creates `server.tar.gz` from the `deploy` and `nodeModules` directories.
3. Bundles it into a `.pkg` file along with your `root-manifest.json`.

The `deploy` array can include multiple directories if your compiled output spans more than one folder.

## Excluded modules

The CLI automatically excludes `sqlite3` and `@rootsdk/dev-tools` from the `node_modules` bundle. These are development-only dependencies that are not needed at runtime.