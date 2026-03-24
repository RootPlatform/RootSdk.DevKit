---
path: app-docs/configure/manifest-package.md
audience: app
category: guide
summary: Deployment and startup configuration for your App's client and server code.
---

# Manifest `package`

Deployment and startup configuration for your App's client and server code.

## Details

|                |                |
| -------------- | -------------- |
| **Name**       | `package`     |
| **Type**       | `object`      |
| **Required**   | Yes           |

### `client`

Client-side build output for deployment.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `deploy` | `string` | Yes | Path to the client deployment directory containing the entire single-page application (relative to project root). |

### `server`

Configuration for launching and packaging your server.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `launch` | `string` | Yes | Entry point to launch the server process (must be a .js file). |
| `deploy` | `array` | Yes | List of server folders to include in deployment. |
| `node_modules` | `array` | Yes | List of server-side node_modules folders that must be deployed. |

## Example

```json
{
    "package": {
        "client": {
            "deploy": "client/dist"
        },
        "server": {
            "launch": "server/dist/myAppMain.js",
            "deploy": [
                "server/dist",
                "networking/gen/server"
            ],
            "node_modules": [
                "server/node_modules"
            ]
        }
    }
}
```