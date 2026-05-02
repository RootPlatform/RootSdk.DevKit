---
kind: sample-bot
description: Assign roles to members
complexity: moderate
key_patterns:
  - role and member-role APIs
  - global settings (role picker)
  - per-user counter via key-value store
permissions:
  - community.manageRoles
---

# role-assignment

An auto-role bot. It counts each member's messages and, on their fifth post, grants them the role chosen by the community admin in Settings. Reach for this sample as a small example of "earned" role assignment driven by activity.

## What it demonstrates

- Reading a manifest-declared `roleOrMember` setting (`rootServer.globalSettings.general.assignedRole`) configured with `selectBehavior: "roleSingle"` to pick the target role at runtime.
- Maintaining a per-user message counter atomically with `rootServer.dataStore.appData.update`, keyed by `userId` — the updater function reads, increments, and writes in a single call without a race.
- Triggering exactly once at the threshold (`count === MESSAGE_THRESHOLD`) and short-circuiting after, so the bot doesn't spam role-add calls on every subsequent message.
- Granting the role with `rootServer.community.communityMemberRoles.add`, which requires `community.manageRoles`.

## Permissions

```json
{
  "community": {
    "manageRoles": true
  }
}
```

