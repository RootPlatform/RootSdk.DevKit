---
path: app-docs/develop/server/community-api/mentions/create-mentions.md
audience: app
category: guide
summary: Include mentions in your messages so they appear as highlighted, clickable text in Root clients.
---

# Create mentions

Include mentions in your messages so they appear as highlighted, clickable text in Root clients.

## Mention syntax

Mentions use standard Markdown link syntax with `root://` URIs:

```
[display text](root://user/{userId})
```

The display text is what Root clients show for the mention. The URI identifies what's being mentioned and enables actions like profile navigation.

By convention, user and role mentions include an `@` prefix in the display text, like `[@Alice]` or `[@Moderators]`. Channel mentions use a `#` prefix, like `[#General]`. These symbols are just text, not special syntax.

| Mention type | Example |
|--------------|---------|
| User | `[@Alice](root://user/{userId})` |
| Role | `[@Moderators](root://role/{roleId})` |
| Channel | `[#General](root://channel/{channelId})` |
| @All | `[@All](root://role/All)` |
| @Here | `[@Here](root://role/Here)` |
| Community emoji | `[:team-logo:](root://emoji/:team-logo:)` |

`@All` and `@Here` require the `createMessageMention` permission.

## Examples

### Mention a user

```ts
import {
  rootServer,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-app";

async function notifyUser(
  channelId: ChannelGuid,
  userId: UserGuid,
  userName: string
): Promise<void> {
  const mention = `[@${userName}](root://user/${userId})`;

  const request: ChannelMessageCreateRequest = {
    channelId: channelId,
    content: `${mention} Your request has been processed.`,
  };

  await rootServer.community.channelMessages.create(request);
}
```

### Mention a role

```ts
async function mentionRole(
  channelId: ChannelGuid,
  roleId: CommunityRoleGuid,
  roleName: string
): Promise<void> {
  const mention = `[@${roleName}](root://role/${roleId})`;

  const request: ChannelMessageCreateRequest = {
    channelId: channelId,
    content: `${mention} Please review this request.`,
  };

  await rootServer.community.channelMessages.create(request);
}
```

### Link to a channel

```ts
async function linkToChannel(
  channelId: ChannelGuid,
  targetChannelId: ChannelGuid,
  targetChannelName: string
): Promise<void> {
  const mention = `[#${targetChannelName}](root://channel/${targetChannelId})`;

  const request: ChannelMessageCreateRequest = {
    channelId: channelId,
    content: `For more help, visit ${mention}.`,
  };

  await rootServer.community.channelMessages.create(request);
}
```

### Use @All and @Here

The `@All` mention notifies all members of the channel. The `@Here` mention notifies only members who are currently online.

```ts
async function announceToAll(channelId: ChannelGuid): Promise<void> {
  const request: ChannelMessageCreateRequest = {
    channelId: channelId,
    content: "[@All](root://role/All) The server will restart in 5 minutes.",
  };

  await rootServer.community.channelMessages.create(request);
}

async function alertOnlineMembers(channelId: ChannelGuid): Promise<void> {
  const request: ChannelMessageCreateRequest = {
    channelId: channelId,
    content: "[@Here](root://role/Here) The event is starting now!",
  };

  await rootServer.community.channelMessages.create(request);
}
```

### Combine multiple mentions

```ts
async function sendUpdate(
  channelId: ChannelGuid,
  userId: UserGuid,
  userName: string,
  helpChannelId: ChannelGuid
): Promise<void> {
  const userMention = `[@${userName}](root://user/${userId})`;
  const channelMention = `[#Help](root://channel/${helpChannelId})`;

  const request: ChannelMessageCreateRequest = {
    channelId: channelId,
    content: `${userMention} Your issue has been resolved. If you have more questions, visit ${channelMention}.`,
  };

  await rootServer.community.channelMessages.create(request);
}
```