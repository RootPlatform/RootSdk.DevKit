---
path: app-docs/configure/manifest-package.md
audience: app
category: guide
summary: Deployment and startup configuration for your app's client and server code. Required.
---

# Manifest `package`

Deployment and startup configuration for your app's client and server code. Required.

The `package` field tells Root which files to bundle and how to launch your server. When you push, the CLI reads these paths and creates a `.pkg` archive containing your manifest, server code, and client build output.

## Example

Apps have both a client (the browser-based UI) and a server. A typical manifest declares paths for both:

```json
{
  "id": "...",
  "version": "1.0.0",
  "package": {
    "client": {
      "deploy": "client/dist"
    },
    "server": {
      "launch": "server/dist/main.js",
      "deploy": [
        "server/dist"
      ],
      "nodeModules": [
        "server/node_modules"
      ]
    }
  }
}
```

## Client

The `client` section specifies where your built single-page application lives. Root serves these files to users who open your app in their browser.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `deploy` | `string` | Yes | Path to the client build output directory, relative to the project root (e.g., `client/dist`). |

## Server

The `server` section specifies your server entry point and which files to include in the deployment.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `launch` | `string` | Yes | Path to the JavaScript entry point that Root executes to start your server (e.g., `server/dist/main.js`). Must be a `.js` file. |
| `deploy` | `string[]` | Yes | Directories to include in the server package, relative to the project root. Typically your compiled output (e.g., `["server/dist"]`). |
| `nodeModules` | `string[]` | Yes | `node_modules` directories to bundle with your server. These are your production dependencies (e.g., `["server/node_modules"]`). |

## How packaging works

When you push, the CLI:

1. Reads the paths from your manifest.
2. Creates `server.tar.gz` from the `deploy` and `nodeModules` directories.
3. Creates `client.tar.gz` from the `client.deploy` directory.
4. Bundles everything into a `.pkg` file along with your `root-manifest.json`.

The `deploy` array can include multiple directories if your compiled output spans more than one folder (e.g., `["server/dist", "networking/gen/server"]`).

## Excluded modules

The CLI automatically excludes `sqlite3` and `@rootsdk/dev-tools` from the `node_modules` bundle. These are development-only dependencies that are not needed at runtime.