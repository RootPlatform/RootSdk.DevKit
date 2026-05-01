---
kind: sample-bot
description: List community roles
complexity: minimal
key_patterns:
  - role querying
permissions:
  - channel.createMessage
---

# role-list

A role-introspection bot. It responds to two slash-style commands: `/role me` lists the roles assigned to the caller, and `/role community` lists every role defined in the community. Reach for this sample as the smallest example of querying the role and member-role surfaces and replying with a formatted result.

## What it demonstrates

- Listening for `ChannelMessageEvent.ChannelMessageCreated` and parsing a two-token command (`/role <target>`) out of the message content.
- Fetching the caller's profile via `rootServer.community.communityMembers.get` and reading `communityRoleIds` to determine which roles they hold.
- Listing every role in the community with `rootServer.community.communityRoles.list`, then resolving role IDs to names locally instead of issuing one `get` per ID.
- Replying through `rootServer.community.channelMessages.create` with a comma-joined role-name list.

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

## Run

```sh
npm install
npm run build
npm run bot
```
