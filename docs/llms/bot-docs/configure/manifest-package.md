---
path: bot-docs/configure/manifest-package.md
audience: bot
category: guide
summary: Deployment and startup configuration for your Bot.
---

# Manifest `package`

Deployment and startup configuration for your Bot.

## Details

|                |                |
| -------------- | -------------- |
| **Name**       | `package`     |
| **Type**       | `object`      |
| **Required**   | Yes           |

### `server`

Configuration for launching and packaging your server.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `launch` | `string` | Yes | Entry point (must be a .js file). |
| `deploy` | `array` | Yes | List of folders to include in deployment. |
| `node_modules` | `array` | Yes | List of node_modules folders that must be deployed. |

## Example

```json
{
    "package": {
        "server": {
            "launch": "dist/myBotMain.js",
            "deploy": [
                "dist"
            ],
            "node_modules": [
                "node_modules"
            ]
        }
    }
}
```