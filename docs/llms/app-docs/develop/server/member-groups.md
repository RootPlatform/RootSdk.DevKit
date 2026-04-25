---
path: app-docs/develop/server/member-groups.md
audience: app
category: guide
summary: A member group combines users and community roles into a named audience you can use for targeting broadcasts and organizing custom access control.
---

> **Worked sample**: `api-samples/server-member-groups/` — Member Groups

# Member groups

A member group combines users and community roles into a named audience you can use for targeting broadcasts and organizing custom access control.

## What are member groups?

A member group is a named collection of users and community roles scoped to a resource you define. You create groups through `rootServer.memberGroups` and each group has:

- **Direct users** (`userIds`): Individual users added explicitly.
- **Community roles** (`communityRoleIds`): Roles whose members are included automatically.
- **Resolved membership** (`memberUserIds`): The combined set of all users who belong to the group, whether added directly or through a community role.

### Resource scoping and naming

Every member group is identified by three developer-defined strings that form a hierarchy:

1. **`resourceType`**: The category of thing you're attaching groups to. This is a label you choose based on your domain.
2. **`resourceId`**: The specific instance within that category.
3. **`name`**: The group's purpose within that instance. A single resource can have multiple groups with different names.

The combination of all three uniquely identifies a group, and you can look up a group by these three values using `MemberGroupService.getByName()`. Creating a group with a `resourceType`, `resourceId`, and `name` combination that already exists in the community throws an error.

**Example: Project collaboration app**

A project management app needs to control who can edit vs. view each project:

| `resourceType` | `resourceId` | `name` | Members |
|---|---|---|---|
| `"project"` | `"proj-abc"` | `"editors"` | Users who can edit Project ABC |
| `"project"` | `"proj-abc"` | `"viewers"` | Users who can view Project ABC |
| `"project"` | `"proj-xyz"` | `"editors"` | Users who can edit Project XYZ |
| `"project"` | `"proj-xyz"` | `"viewers"` | Users who can view Project XYZ |

When a user opens a project, the app calls `getByName({ resourceType: "project", resourceId: "proj-abc", name: "editors" })` to check access. To find all projects a user can edit, the app calls `listResourceIdsForUserId({ resourceType: "project", name: "editors" }, { userId })`, which returns the `resourceId` values (e.g., `["proj-abc", "proj-xyz"]`).

**Example: Game lobby**

A game app organizes players into teams per match:

| `resourceType` | `resourceId` | `name` | Members |
|---|---|---|---|
| `"match"` | `"match-42"` | `"team-red"` | Red team players |
| `"match"` | `"match-42"` | `"team-blue"` | Blue team players |
| `"match"` | `"match-42"` | `"spectators"` | Spectating users |

The app can target a broadcast to just one team by passing the `MemberGroup` as the broadcast target.

## How member groups work

Understanding how membership resolves helps you design groups that stay accurate as your community changes.

When you create a member group, you provide a list of user IDs and community role IDs. The system resolves the full membership by combining the direct users with all users who hold any of the specified community roles. This resolved list is available as `memberUserIds` on the `MemberGroup` object.

Membership updates automatically in response to community changes:

- When a user gains a community role that's in a group, they're added to the resolved membership and a `MemberGroupServiceEvent.MembersAdded` event fires.
- When a user loses a role (or leaves the community), they're removed from any groups that included them through that role, firing `MemberGroupServiceEvent.MembersRemoved`.
- When a community role is deleted, it's removed from all groups that reference it, updating resolved membership accordingly.
- If these changes cause a group's resolved membership to become empty, a `MemberGroupServiceEvent.UserGroupEmptied` event fires.

You can also modify groups directly using the `MemberGroup` object's methods (`addUser`, `removeUser`, `addCommunityRole`, `removeCommunityRole`, etc.). These changes persist immediately.

## When to use member groups

- **Target broadcasts**: Pass a `MemberGroup` or `ReadOnlyMemberGroup` as the broadcast target to send messages to a specific audience instead of all connected clients.
- **Build custom permission groups**: Create groups scoped to a resource (like a feature or game room) and check `isMember` to control access.
- **Track participation**: Use `rootServer.memberGroups.listResourceIdsForUserId` to find which resources a user belongs to through member group membership.