---
path: bot-docs/configure/manifest-global-settings.md
audience: bot
category: guide
summary: Configurable global settings. They're declared in your manifest and set by community members with the `Manage Apps` permission during and after...
---

# Manifest `settings`

Configurable global settings. They're declared in your manifest and set by community members with the `Manage Apps` permission during and after installation.

> **Note:** This feature is a work in progress.
## Details

|                |                |
| -------------- | -------------- |
| **Name**       | `settings`    |
| **Type**       | `object`      |
| **Required**   | No            |

## Structure

Settings are organized into groups, each containing multiple setting items.

### Groups

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `key` | `string` | Yes | Machine-friendly identifier for this group. |
| `title` | `string` | Yes | Human-readable title shown above this group. |
| `items` | `array` | Yes | List of individual setting definitions in this group. |

### Setting items

Each item in a group can have the following properties:

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `key` | `string` | Yes | Machine-friendly setting identifier. |
| `title` | `string` | Yes | Label shown to the user for this setting. |
| `description` | `string` | No | Optional explanatory text for this setting. |
| `required` | `boolean` | Yes | Whether the user must provide a value. |
| `confirmation` | `string` | Yes | Text for the button users click to save this setting. |

### Input types

Each setting item must include exactly one of these input type configurations:

| Type | Description |
| ---- | ----------- |
| `text` | Free-form text input with optional regex validation. |
| `number` | Numeric input with optional min/max/step. |
| `checkbox` | Boolean toggle. |
| `member` | Select one or more community members. |
| `role` | Select one or more community roles. |
| `roleAndMember` | Combined selector for users and roles. |
| `channel` | Select one or more channels. |
| `channelGroup` | Select one or more channel groups. |
| `select` | Dropdown with custom label/value options. |
| `timestamp` | ISO 8601 timestamp picker. |
| `time` | Time-of-day picker (HH:MM:SS). |
| `date` | Date picker (YYYY-MM-DD). |
| `color` | Color picker (hex code). |
| `button` | Action button displayed in settings. |

## Example

```json
{
    "groups": [
        {
            "key": "general",
            "title": "General",
            "items": [
                {
                    "key": "notifyOnJoin",
                    "title": "Notify on new join",
                    "description": "Send a message when someone joins the raid.",
                    "required": false,
                    "confirmation": "Update",
                    "checkbox": {
                        "defaultValue": true
                    }
                }
            ]
        }
    ]
}
```