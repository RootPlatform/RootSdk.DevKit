---
path: bot-docs/configure/manifest-overview.md
audience: bot
category: guide
summary: Your **manifest file** defines how your code integrates with the Root platform.
---

# Manifest overview

Your **manifest file** defines how your code integrates with the Root platform. Your manifest includes your metadata, deployment instructions, community-configurable settings, and permissions. Root reads the manifest, validates it, and uses it to determine how to package and run your code.

## Example

```json
{
  "id": "xxxxxxxxxxxxxxxxxxxxxx",
  "version": "1.0.0",
  "package": {
    "server": {
      "launch": "dist/main.js",
      "deploy": [
          "dist"
      ],
      "node_modules": [
          "node_modules"
      ]
    }
  },
  "settings": {
    "groups": [
      {
        "key": "messaging",
        "title": "Participation",
        "items": [
          {
            "key": "numberOfMessages",
            "title": "Number of messages",
            "description": "Number of messages new members must post to earn a role.",
            "required": true,
            "confirmation": "Save",
            "number": {
              "minValue": 1,
              "maxValue": 100,
              "step": 1,
              "defaultValue": 10
            }
          }
        ]
      },
      {
        "key": "roles",
        "title": "Role",
        "items": [
          {
            "key": "assignedRole",
            "title": "Role",
            "description": "Select the role that will be assigned to members.",
            "required": true,
            "confirmation": "Save",
            "role": {
              "multiSelect": false
            }
          }
        ]
      }
    ]
  },
  "permissions": {
    "community": {
      "manageRoles": true
    },
    "channel": {
      "createMessage": true
    }
  }
}
```

## Name and location

Your manifest must be **named** `root-manifest.json`. The file must be located directly in your **project folder** so the Root SDK tooling can find it.

[Diagram: Diagram showing a project folder containing the root-manifest.json file.]
```
graph LR
    A[📁 project-folder/]
    A --> B["root-manifest.json"]
```

## What it captures

* **Identity and version**
  A unique ID and a semantic version so Root can track, publish, and update your code safely.

* **How to run your code**
  Where the compiled code lives and how to launch the server. Root uses this to package, deploy, and start your code.

* **Community settings surface**
  Settings that community members with the `Manage Apps` permission can see and change. This lets Root generate a settings UI without you writing forms.

* **Required permissions**
  The access your code needs in order to run correctly. Root uses this to ask admins for consent during installation and to enforce access at runtime.

## File format

Your manifest is a JSON file. At the top level, the manifest includes:

| Field         | Status    |
| ------------- | --------- |
| `id`          | Required  |
| `version`     | Required  |
| `package`     | Required  |
| `settings`    | Optional  |
| `permissions` | Optional  |

## How Root uses it

* **During publishing**
  Validates structure, checks versioning, and prepares the bundle based on the paths you declare.

* **During installation**
  Shows permissions and settings derived from the manifest so admins know what they are allowing.

* **At runtime**
  Determines how to launch your code and gates Root API calls based on the permissions you requested.

[Diagram: Interactions among developer SDK Root platform admin and runtime from authoring to startup]
```
sequenceDiagram
  actor Dev as Developer
  participant SDK as Root SDK CLI
  participant Root as Root platform
  actor Admin as Community admin
  participant Run as App runtime
  Dev->>Dev: Create root-manifest.json
  Dev->>SDK: Run publish
  SDK->>SDK: Read and validate manifest
  SDK->>SDK: Gather server files per manifest
  SDK->>Root: Upload bundle and manifest
  Root->>Root: Validate and store package
  Admin->>Root: Install and review permissions and settings
  Root-->>Admin: Consent screen derived from manifest
  Admin-->>Root: Approve install
  Root->>Run: Start server using package.server.launch
  Run-->>Root: Requests gated by manifest permissions
```