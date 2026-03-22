# How-To: Roles

Create, get, list, edit, move, and delete community roles that define permission sets.

## Source Files

| File | What it covers |
|------|---------------|
| [roles.ts](src/roles.ts) | Create, get, list, edit, move, delete roles; handle role events |

## SDK Methods

- `communityRoles.create(request)` — create a community role
- `communityRoles.get(request)` — get a role by ID
- `communityRoles.list()` — list all roles in the community
- `communityRoles.edit(request)` — update a role's name, color, permissions, or mentionability
- `communityRoles.move(request)` — reorder a role
- `communityRoles.delete(request)` — delete a role

## Permissions

```json
{
  "community": {
    "manageRoles": true
  },
  "channel": {
    "createMessage": true
  }
}
```

- `community.manageRoles` — required for create, edit, move, and delete
- `channel.createMessage` — only for the `/roles` command trigger, not for role operations

## Events

| Event | Fires when |
|-------|-----------
| `CommunityRoleEvent.CommunityRoleCreated` | A role is created |
| `CommunityRoleEvent.CommunityRoleEdited` | A role's properties or permissions change |
| `CommunityRoleEvent.CommunityRoleDeleted` | A role is deleted |
| `CommunityRoleEvent.CommunityRoleMoved` | A role is reordered |

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Role names** — letters, digits, hyphens only. No spaces, no leading/trailing/consecutive hyphens. 1-100 characters. Same rules as channel names.
- **colorHex** — exactly 7 characters, format `#RRGGBB` (e.g., `"#AABB01"`).
- **isMentionable** — controls whether the role can be @mentioned in channels.
- **edit() requires all fields** — it replaces the entire role definition, not a partial update. Fetch via get() first, then change only what you need.
- **list() is global** — returns all roles in the community with no parameters.
- **beforeCommunityRoleId controls ordering** — on move, places the role before the specified role. Omit to move to the end.
- **Roles define permissions; member-roles assign them** — see the `member-roles/` how-to for assigning roles to members.
- **@everyone role** — `WellKnownRootGuids.CommunityRoles.EveryoneRole` is the GUID of the default role that every member has. Use it to identify or skip the @everyone role when iterating (see `onRolesCommand` in source).
