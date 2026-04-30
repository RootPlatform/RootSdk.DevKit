---
path: bot-docs/configure/manifest-global-settings.md
audience: bot
category: guide
summary: Configurable global settings. They're declared in your manifest and set by community members with the `Manage Apps` permission during and after...
---

> **Worked sample**: `api-samples/server-global-settings/` — Global Settings

# Manifest `settings`

Configurable global settings. They're declared in your manifest and set by community members with the `Manage Apps` permission during and after installation. The `settings` field is optional -- not every project needs it.

## Example

Suppose your code needed to know which community members and roles should have moderation privileges. You'd declare a `roleOrMember` setting that gives the admin a picker to select them.

Settings are organized into groups, and each group contains items. Each item has a `key` for runtime access, a `title` for the admin UI, and exactly one type key (like `roleOrMember`) that determines the input control and the value your server receives.

```json
{
  "id": "...",
  "version": "1.0.0",
  "package": { ... },
  "settings": {
    "groups": [
      {
        "key": "general",
        "title": "General",
        "items": [
          {
            "key": "moderators",
            "title": "Moderators",
            "description": "Select the roles and members who can moderate.",
            "required": true,
            "confirmation": "Save",
            "roleOrMember": {
              "selectBehavior": "roleMultiAndUserMulti",
              "userIds": [],
              "communityRoleIds": []
            }
          }
        ]
      }
    ]
  }
}
```

At runtime, you access this value with `rootServer.globalSettings.general.moderators`, where `general` is the group key and `moderators` is the item key.

## Structure

Settings are organized into groups, and each group contains one or more items. Each item has a type key that determines the UI control the admin sees and the value your server receives.

```
settings
  └─ groups[]
       ├─ key
       ├─ title
       └─ items[]
            ├─ key
            ├─ title
            ├─ description
            ├─ required
            ├─ confirmation
            └─ <type key>     ← exactly one of the types below
```

### Groups

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `key` | `string` | Yes | Machine-friendly identifier for this group. Used to access the group at runtime: `rootServer.globalSettings[groupKey]`. |
| `title` | `string` | Yes | Human-readable title shown above this group. |
| `items` | `array` | Yes | List of individual setting definitions in this group. |

### Setting items

Each item in a group has common properties plus exactly one type key.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `key` | `string` | Yes | Machine-friendly setting identifier. Used to access the value at runtime: `rootServer.globalSettings[groupKey][itemKey]`. |
| `title` | `string` | Yes | Label shown to the user for this setting. |
| `description` | `string` | No | Optional explanatory text for this setting. |
| `required` | `boolean` | Yes | Whether the user must provide a value. |
| `confirmation` | `string` | Yes | Text for the button users click to save this setting. |

## Setting types

Each item must include exactly one of the type keys below. The type key determines what UI the admin sees and what value your server receives.

### `roleOrMember`

Picker for community roles and members. The `selectBehavior` value shapes what the admin sees — a single user, multiple users, a single role, multiple roles, or both roles and users. Regardless of which behavior you choose, your server receives a `ReadOnlyMemberGroup` that you can query for membership.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `selectBehavior` | `string` | **Required.** Shapes the picker. One of `userSingle`, `userMulti`, `roleSingle`, `roleMulti`, `roleMultiAndUserMulti`. |
| `userIds` | `string[]` | Default user IDs shown in the picker during installation. The admin can change them before saving. Typically left as an empty array. |
| `communityRoleIds` | `string[]` | Default role IDs shown in the picker during installation. The admin can change them before saving. Typically left as an empty array. |

**Manifest example:**

```json
{
  "id": "...",
  "version": "1.0.0",
  "package": { ... },
  "settings": {
    "groups": [
      {
        "key": "general",
        "title": "General",
        "items": [
          {
            "key": "moderators",
            "title": "Moderators",
            "description": "Select the roles and members who can moderate.",
            "required": true,
            "confirmation": "Save",
            "roleOrMember": {
              "selectBehavior": "roleMultiAndUserMulti",
              "userIds": [],
              "communityRoleIds": []
            }
          }
        ]
      }
    ]
  }
}
```

**Server-side retrieval:**

The value is a `ReadOnlyMemberGroup`, which preserves the admin's selections and resolves role membership.

```ts
const moderators: ReadOnlyMemberGroup = rootServer.globalSettings.general.moderators;

// The admin's selections are preserved separately
const users: UserGuid[] = moderators.userIds;                    // directly selected users
const roles: CommunityRoleGuid[] = moderators.communityRoleIds;  // directly selected roles

// Flattened list of all users (direct + resolved from roles)
const allUsers: UserGuid[] = moderators.memberUserIds;

// Check if a user is in the group (direct or via role)
const isModerator: boolean = await moderators.isMember({ userId });
```

**Automatic membership updates:**

Root keeps the member group in sync with the community. Your code does not need to handle these cases:

- If the community **deletes a role** that was selected, the role is removed from `communityRoleIds` and `memberUserIds` is recalculated.
- If a **user leaves the community** who was directly selected, they are removed from `userIds` and `memberUserIds`.
- If a **user is added to or removed from** a selected role, `memberUserIds` is recalculated to reflect the change.

**Listen for changes:**

```ts
rootServer.globalSettings.on("update", (event: GlobalSettingsUpdateEvent) => {
  const previous: ReadOnlyMemberGroup = event.previous.general.moderators;
  const current: ReadOnlyMemberGroup = event.current.general.moderators;
  // React to the change
});
```

### `text`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Free-form text input. Your server receives `string | undefined`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `defaultValue` | `string` | Default text pre-filled in the input. |
| `regex` | `string` | Regular expression the input must match. |

### `number`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Numeric input. Your server receives `number | undefined`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `minValue` | `number` | Minimum allowed value. |
| `maxValue` | `number` | Maximum allowed value. |
| `step` | `number` | Increment step. |
| `defaultValue` | `number` | Default numeric value. |

### `checkbox`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Boolean toggle. Your server receives `boolean`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `defaultValue` | `boolean` | Initial state of the checkbox. |

### `channel`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Select one or more channels. Your server receives `ChannelGuid[]`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `multiSelect` | `boolean` | Allow multiple channels. |
| `channelIds` | `string[]` | Default channel IDs shown in the picker during installation. Typically left as an empty array. |

### `channelGroup`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Select one or more channel groups. Your server receives `ChannelGroupGuid[]`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `multiSelect` | `boolean` | Allow multiple groups. |
| `channelGroupIds` | `string[]` | Default channel group IDs shown in the picker during installation. Typically left as an empty array. |

### `select`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Dropdown with custom options. Your server receives `string[]`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `multiSelect` | `boolean` | Allow multiple options. |
| `options` | `array` | List of `{ label, value }` pairs. |

### `timestamp`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
ISO 8601 timestamp picker. Your server receives `Date | undefined`.

### `time`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Time-of-day picker. Your server receives `{ hours: number, minutes: number, seconds: number }`.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `defaultValue` | `string` | Default time value (HH:MM:SS). |

### `date`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Date picker. Your server receives `{ year: number, month: number, day: number }`.

### `color`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Color picker. Your server receives `string | undefined` (hex code).

| Property | Type | Description |
| -------- | ---- | ----------- |
| `defaultValue` | `string` | Default color value (e.g., `#ff0000`). |

### `button`

> **Note:** The Root clients don't yet show a UI for this type. Admins can't configure it until client support ships.
Action button displayed in settings. No value is sent to your server. Instead, a `button` event fires.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `title` | `string` | Text shown on the button. |

**Listen for button presses:**

```ts
rootServer.globalSettings.on("button", (event: GlobalSettingButtonEvent) => {
  console.log(`Button pressed: ${event.key}`);
});
```

## Events

`GlobalSettings` emits two events:

| Event | Payload | Fires when |
| ----- | ------- | ---------- |
| `update` | `GlobalSettingsUpdateEvent` | A community member changes any setting value. |
| `button` | `GlobalSettingButtonEvent` | A community member presses a `button` setting. |