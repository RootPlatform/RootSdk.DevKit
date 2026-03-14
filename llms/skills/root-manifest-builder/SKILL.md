---
name: root-manifest-builder
description: Builds and validates root-manifest.json files with correct package config, settings, and permissions
---

# Root Manifest Builder

Use this skill when creating or modifying a `root-manifest.json` file.

## When to Use

- User asks to "create a manifest"
- User asks to "add a permission" to manifest
- User asks to "add settings" to manifest
- User has manifest validation errors

## Manifest Structure

The manifest file is named `root-manifest.json` (not `manifest.json`).

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier from the Root Developer Portal |
| `version` | string | Semantic version (MAJOR.MINOR.PATCH) |
| `package` | object | Deployment configuration |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `settings` | object | Configurable settings for community admins |
| `permissions` | object | API permissions your code requires |

## App Manifest

Apps require both `client` and `server` in the package config:

```json
{
  "id": "your-app-id-from-portal",
  "version": "1.0.0",
  "package": {
    "client": {
      "deploy": "client/dist"
    },
    "server": {
      "launch": "server/dist/main.js",
      "deploy": [
        "server/dist",
        "networking/gen/server"
      ],
      "nodeModules": [
        "node_modules",
        "server/node_modules"
      ]
    }
  }
}
```

## Bot Manifest

Bots only have `server` configuration (no client):

```json
{
  "id": "your-bot-id-from-portal",
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

## Package Configuration

### Client (Apps only)

| Property | Type | Description |
|----------|------|-------------|
| `deploy` | string | Path to client build output |

### Server

| Property | Type | Description |
|----------|------|-------------|
| `launch` | string | Entry point JS file |
| `deploy` | string[] | Folders to deploy |
| `nodeModules` | string[] | Node modules folders to include |

## Permissions

Permissions control which Root Community APIs your code can use. All default to `false`.

### Structure

```json
{
  "permissions": {
    "community": {
      "kick": true,
      "createBan": true
    },
    "channel": {
      "createMessage": true,
      "viewMessageHistory": true
    }
  }
}
```

### Community Permissions

| Permission | Description |
|------------|-------------|
| `manageCommunity` | Manage overall community settings |
| `manageRoles` | Create or update community roles |
| `manageEmojis` | Upload or remove custom emojis |
| `createInvite` | Generate new community invites |
| `manageInvites` | Revoke or list existing invites |
| `createBan` | Ban members from the community |
| `manageBans` | Unban or list banned members |
| `kick` | Remove members from the community |
| `changeOtherNickname` | Change nicknames of other members |
| `createChannelGroup` | Create new channel groups |

### Channel Permissions

| Permission | Description |
|------------|-------------|
| `fullControl` | All channel permissions |
| `createMessage` | Send new messages |
| `deleteMessageOther` | Delete messages sent by others |
| `managePinnedMessages` | Pin or unpin messages |
| `viewMessageHistory` | Read past messages |
| `createMessageAttachment` | Attach files to messages |
| `createMessageMention` | Mention users in messages |
| `createMessageReaction` | React to messages |
| `useExternalEmoji` | Use emojis from other servers |
| `manageFiles` | Upload or download files |
| `createFile` | Create new files |
| `viewFile` | View files shared in channels |
| `moveUserOther` | Move other users between voice channels |
| `voiceMuteOther` | Mute other users in voice |
| `voiceDeafenOther` | Deafen other users in voice |
| `voiceKick` | Kick users from voice channels |

## Settings

Settings are configurable by community admins during and after installation.

### Structure

```json
{
  "settings": {
    "groups": [
      {
        "key": "general",
        "title": "General Settings",
        "items": [
          {
            "key": "welcomeMessage",
            "title": "Welcome Message",
            "description": "Message sent to new members",
            "required": false,
            "confirmation": "Save",
            "text": {
              "defaultValue": "Welcome to the community!"
            }
          }
        ]
      }
    ]
  }
}
```

### Setting Types

| Type | Description |
|------|-------------|
| `text` | Free-form text input |
| `number` | Numeric input with min/max/step |
| `checkbox` | Boolean toggle |
| `member` | Select community member(s) |
| `role` | Select community role(s) |
| `roleAndMember` | Combined member and role selector |
| `channel` | Select channel(s) |
| `channelGroup` | Select channel group(s) |

## Validation Checklist

1. **File named correctly?** Must be `root-manifest.json`
2. **Has `id`?** Get from Root Developer Portal
3. **Has `version`?** Use semver: `1.0.0`
4. **Package paths correct?**
   - `launch` points to actual entry JS file
   - `deploy` folders exist after build
   - `nodeModules` includes all required folders
5. **Permissions minimal?** Only request what's needed

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Wrong filename | Use `root-manifest.json` not `manifest.json` |
| Missing `id` | Get from Root Developer Portal |
| Wrong deploy paths | Verify paths match your build output |
| Over-requesting permissions | Only enable permissions your code uses |

## Workflow

1. Ask: App or Bot?
2. Get app/bot ID from user (from Developer Portal)
3. Determine package structure based on project layout
4. Ask what SDK APIs they'll use
5. Map APIs to required permissions
6. Ask if they need configurable settings
7. Generate manifest
8. Validate paths match actual project structure
