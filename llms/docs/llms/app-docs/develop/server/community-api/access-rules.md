---
path: app-docs/develop/server/community-api/access-rules.md
audience: app
category: guide
summary: Override channel and channel group permissions for specific roles or members.
---

# Access rules

Override channel and channel group permissions for specific roles or members.

## What are access rules?

An access rule is a permission override that applies to a specific combination of:

- A **subject**: a role or community member
- A **target**: a channel or channel group
- An **overlay**: a set of permission overrides

When you create an access rule, you specify which permissions to allow, deny, or leave unchanged. Root applies this overlay whenever the subject accesses the target.

[Diagram: Diagram showing how an access rule connects a subject, target, and overlay.]
```
flowchart TD
  AR((Access Rule))
  AR --- Subject
  AR --- Target
  AR --- Overlay
  subgraph Subject
    R[Role]
    M[Member]
    R -. or .- M
  end
  subgraph Target
    C[Channel]
    CG[Channel Group]
    C -. or .- CG
  end
  subgraph Overlay
    P[Permission overrides]
  end
```

One access rule connects exactly one subject to one target. To affect multiple subjects or targets, create multiple access rules.

### The overlay tri-state

Each permission in an overlay has three possible states:

| Value | Effect |
|-------|--------|
| `true` | Explicitly allow this permission |
| `false` | Explicitly deny this permission |
| `undefined` | No change; keep the current value |

This tri-state model lets you grant specific permissions, restrict others, and leave the rest unchanged:

```ts
const overlay: ChannelOverlayPermission = {
  channelView: true,           // Explicitly allow
  channelCreateMessage: true,  // Explicitly allow
  channelCreateFile: false,    // Explicitly deny
  // All other permissions: undefined (no change)
};
```

The `channelView` permission controls visibility as well as access. Setting `channelView: true` makes a hidden channel visible to the subject; setting `channelView: false` hides a channel the subject would otherwise see.

## How access rules work

When your code creates or modifies access rules, you need to understand how Root combines them with base permissions. This helps you:

- Design overlays that achieve the behavior you want
- Predict how multiple access rules will interact
- Debug permission errors by tracing where a permission was granted or denied

Root calculates effective permissions through four stages.

### Step 1: Initialize from base permissions

Root creates the starting permission set by merging your manifest permissions with permissions from your assigned roles using OR logic: if **any** source grants a permission, it's allowed. A role cannot remove a permission your manifest declares, and your manifest cannot remove a permission a role grants.

For example, if your manifest declares `createMessage` and `createFile`, and the @EVERYONE role grants `viewFile`:

| Permission | Manifest | @EVERYONE role | Result |
|------------|----------|----------------|--------|
| `createMessage` | `true` | `false` | `true` |
| `createFile` | `true` | `false` | `true` |
| `viewFile` | `false` | `true` | `true` |
| All others | `false` | `false` | `false` |

Any `true` in a row means the result is `true`. The role's lack of `createFile` doesn't matter because the manifest grants it.

This is how your code differs from human members: humans get base permissions from roles only, while your code gets permissions from both its manifest and its roles.

### Step 2: Find applicable access rules

Root looks up access rules for the target channel or channel group. For channels, which rules apply depends on the channel's inheritance setting:

- **Inherits from group**: The channel uses access rules defined on its parent channel group. Any access rules on the channel itself are ignored.
- **Independent permissions**: The channel uses only access rules defined directly on it. The parent group's access rules don't apply.

This is either/or—there's no cascading where both group and channel rules combine.

### Step 3: Apply role-based overlays

Root collects every access rule that targets a role your code has, then merges their overlays per permission:

- **Any role allows it** (`true`): the permission is allowed, even if other roles deny it.
- **No role allows it, but at least one denies it** (`false`): the permission is denied.
- **All roles leave it undefined**: the current value from Step 1 stays unchanged.

### Step 4: Apply member-specific overlay

If an access rule targets your code directly (by member ID rather than role), Root applies its overlay last. For each permission in the overlay:

- **`true`**: the permission is allowed, regardless of what Steps 1–3 produced.
- **`false`**: the permission is denied, regardless of what Steps 1–3 produced.
- **`undefined`**: no change; the value from Step 3 stays.

The final permission set determines what your code can do on that channel.

### Examples

#### Inheritance controls which rules apply

This example demonstrates Step 2: how a channel's inheritance setting determines which access rules Root applies.

Suppose your manifest requests `createFile` for your code. The community's "Media" channel group contains two channels with different inheritance settings:

[Diagram: Diagram showing a channel group with two channels: one inherits, one uses independent permissions.]
```
flowchart TD
  AR["Access rule: EVERYONE role
  channelCreateFile: false"] --> MG
  MG["Media (channel group)"]
  MG -- "inherits" --> Chat["#chat"]
  MG -- "independent" --> Uploads["#uploads"]
```

- The access rule on "Media" targets the @EVERYONE role: `{ channelCreateFile: false }`.
- #chat inherits from the group, so the group's access rules apply.
- #uploads uses independent permissions, so the group's access rules don't apply.

**#chat (inherits from group):**

| Step | CreateFile |
|------|------------|
| Base permission | `true` |
| @EVERYONE role overlay (from "Media") | `false` |
| **Result** | **denied** |

Only one role overlay applies here. If multiple roles had overlays, Root would merge them with OR logic (see Step 3).

**#uploads (independent permissions):**

| Step | CreateFile |
|------|------------|
| Base permission | `true` |
| No overlay applies | — |
| **Result** | **allowed** |

The group's overlay only reaches #chat because it inherits from the group. #uploads uses independent permissions, so the group overlay doesn't apply.

#### Member overlays override role overlays

This example demonstrates Steps 3 and 4: when a role overlay and a member overlay conflict on the same channel, the member overlay wins.

Suppose your manifest requests `createMessage` for your code. The community's #announcements channel has two access rules that conflict:

[Diagram: Diagram showing a channel with two access rules: one role-based deny and one member-specific allow.]
```
flowchart TD
  RoleAR["Access rule: EVERYONE role
  channelCreateMessage: false"] --> Ch
  MemberAR["Access rule: your code
  channelCreateMessage: true"] --> Ch
  Ch["#announcements"]
```

- The role-based rule denies `createMessage` for @EVERYONE (Step 3).
- The member-specific rule allows `createMessage` for your code (Step 4).

| Step | CreateMessage |
|------|---------------|
| Base permission | `true` |
| @EVERYONE role overlay | `false` |
| Member overlay (your code) | `true` |
| **Result** | **allowed** |

The role overlay denies `createMessage`, but the member overlay runs last and overrides it.

## When to use access rules

Use access rules when your code needs different permissions in different places:

- **Create private spaces**: Grant `channelView` and `channelCreateMessage` to specific members on a channel, giving them access to a space that's hidden from others.
- **Lock a channel during incidents**: Deny `channelCreateMessage` to the @EVERYONE role when your code detects spam or abuse, then remove the access rule when it's safe.

If your code needs the same permissions everywhere, configure roles instead. Access rules are for targeted overrides on specific channels or channel groups.

## Troubleshooting

When your code gets an unexpected permission error:

1. **Check base permissions**: Does your manifest declare the required permission? Does any assigned role grant it?
2. **Check visibility**: Can your code see the channel? Call `ChannelClient.list()` and verify the channel appears in the response.
3. **Check access rules**: Call `AccessRuleClient.listByChannelOrChannelGroup()` to see what overlays apply to the target.
4. **Check inheritance**: Is the channel inheriting from its group or using independent permissions? The wrong access rules might be applying.
5. **Check for member overrides**: A member-specific access rule always wins over role-based rules.