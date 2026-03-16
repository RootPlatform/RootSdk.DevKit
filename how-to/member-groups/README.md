# How-To: Member Groups

Create and manage app-level user groups. Member groups combine direct users and role-based users into a single effective membership list. Unlike roles (which are platform-level), member groups are created and managed by your app/bot for its own purposes.

Each group is scoped to a `(resourceType, resourceId, name)` triple — your app defines the taxonomy (e.g., `"project"/"proj-123"/"reviewers"`).

## Source Files

| File | What it covers |
|------|---------------|
| [member-groups.ts](src/member-groups.ts) | 8 service methods + 11 instance methods + 4 events |

## SDK Methods

### Service Methods (`rootServer.memberGroups`)

- `memberGroups.create(data)` — create a group with initial users and/or roles
- `memberGroups.get(id)` — get by ID (throws if not found)
- `memberGroups.getByName(data)` — get by resourceType + resourceId + name (returns undefined if not found)
- `memberGroups.delete(id)` — delete a group
- `memberGroups.list()` — list all groups (returns `MemberGroupShort` with snake_case fields)
- `memberGroups.listByIds(ids)` — batch get by IDs
- `memberGroups.listByResourceId(query)` — all groups for a resource
- `memberGroups.listResourceIdsForUserId(query, user)` — which resources contain a user

### Instance Methods (on `MemberGroup` objects)

- `group.addUser(userId)` / `group.addUsers(userIds)` — add direct user(s)
- `group.removeUser(userId)` / `group.removeUsers(userIds)` — remove direct user(s)
- `group.addCommunityRole(id)` / `group.addCommunityRoles(ids)` — add role(s)
- `group.removeCommunityRole(id)` / `group.removeCommunityRoles(ids)` — remove role(s)
- `group.update(data)` — atomic replacement of all users and roles
- `group.isMember({ userId })` — check effective membership

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- No permissions needed for member group operations (local SQLite service)
- `channel.createMessage` — only for the `/member-groups` command trigger

## Events

- `MemberGroupServiceEvent.MembersAdded` — users added to effective membership
- `MemberGroupServiceEvent.MembersRemoved` — users removed from effective membership
- `MemberGroupServiceEvent.StateChanged` — group configuration changed (users/roles modified)
- `MemberGroupServiceEvent.UserGroupEmptied` — effective membership became empty

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **Access path** — `rootServer.memberGroups`, NOT `rootServer.community.memberGroups`.
- **Local SQLite, not gRPC** — runs in-process. No network round-trips, no rate limits, no manifest permissions.
- **Instance methods** — unique among all SDK services. You get a `MemberGroup` object and call `.addUser()`, `.removeUser()`, etc. directly on it.
- **WeakRef caching** — the service caches instances via WeakRef. Subsequent `get()` calls return the SAME in-memory object (not a fresh DB read). Mutations on one reference are visible on all references.
- **`memberUserIds` is computed** — union of direct `userIds` + all users holding any of the `communityRoleIds`. Updated automatically.
- **`list()` returns `MemberGroupShort`** — snake_case fields (`resource_type`, `resource_id`, `community_id`). All other methods return full `MemberGroup` instances.
- **`getByName()` returns undefined** if not found. `get()` throws.
- **`update()` is atomic replacement** — replaces ALL userIds and communityRoleIds at once, not additive.
- **Events fire on the service** — subscribe via `rootServer.memberGroups.on()`. Event payload types are not exported from the SDK (use TypeScript inference).
