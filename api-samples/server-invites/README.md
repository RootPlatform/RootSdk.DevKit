# API Sample: Invites

Get, list, and delete (revoke) community member invites.

## Source Files

| File | What it covers |
|------|---------------|
| [invites.ts](src/invites.ts) | Get, list, delete invites |

## SDK Methods

- `communityMemberInvites.get(request)` — get an invite by composite key (invitedUserId + senderUserId)
- `communityMemberInvites.list()` — list all pending invites in the community
- `communityMemberInvites.delete(request)` — revoke an invite

## Permissions

```json
{
  "community": {
    "manageInvites": true
  },
  "channel": {
    "createMessage": true
  }
}
```

- `community.manageInvites` — required for get, list, and delete
- `channel.createMessage` — only for the `/server-invites` command trigger

## Events

None. The invite client has no events.

## Apps vs Bots

All code is identical between apps (`@rootsdk/server-app`) and bots (`@rootsdk/server-bot`). Only the import statement differs — see the comment at the top of each source file.

## Key Behaviors

- **No create method** — invites are created through the Root platform UI or other mechanisms. The SDK can only query and delete them.
- **Composite key** — an invite is identified by `(invitedUserId, senderUserId)`, not a single ID.
- **No events** — the invite client does not emit any events.
- **delete() is not idempotent** — deleting an already-deleted invite throws an error.
- **delete() does not create membership** — revoking an invite just removes it; it does not add the user to the community.
- **list() returns empty array** — not an error when no invites exist.
- **Invite fields** — id, senderUserId, invitedUserId, invitedUsername, communityRoleIds (roles to assign on accept).
