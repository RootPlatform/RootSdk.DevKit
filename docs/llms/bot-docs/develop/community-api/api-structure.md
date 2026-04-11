---
path: bot-docs/develop/community-api/api-structure.md
audience: bot
category: guide
summary: This reference describes how the community access API is organized.
---

# API structure

This reference describes how the community access API is organized.

## Access point

The community access API is available through `rootServer.community`:

```ts
import { rootServer } from "@rootsdk/server-bot";
```

## Available clients

The `community` property provides specialized clients for each resource type:

```ts
export type RootServer =
{
  community:
  {
    accessRules           : AccessRuleClient,
    channels              : ChannelClient,
    channelGroups         : ChannelGroupClient,
    channelMessages       : ChannelMessageClient,
    communities           : CommunityClient,
    communityMemberBans   : CommunityMemberBanClient,
    communityMemberInvites: CommunityMemberInviteClient,
    communityRoles        : CommunityRoleClient,
    communityMembers      : CommunityMemberClient,
    communityMemberRoles  : CommunityMemberRoleClient,
    channelDirectories    : ChannelDirectoryClient,
    channelFiles          : ChannelFileClient,
    channelWebRtcs        : ChannelWebRtcClient,
  };
  // ...
}
```

## Client methods

Each client provides methods that follow the CRUD pattern (create, read, update, delete), with some resource-specific variations. Here's an example showing `ChannelMessageClient`:

```ts
export type ChannelMessageClient = TypedEventEmitter<ChannelMessageEvents> &
{
  create(request: ChannelMessageCreateRequest): Promise<ChannelMessage>;
  delete(request: ChannelMessageDeleteRequest): Promise<void>;
  edit  (request: ChannelMessageEditRequest  ): Promise<ChannelMessage>;
  get   (request: ChannelMessageGetRequest   ): Promise<ChannelMessage>;
  list  (request: ChannelMessageListRequest  ): Promise<ChannelMessageListResponse>;

  pinCreate(request: ChannelMessagePinCreateRequest): Promise<void>;
  pinDelete(request: ChannelMessagePinDeleteRequest): Promise<void>;
  pinList  (request: ChannelMessagePinListRequest  ): Promise<ChannelMessagePinListResponse>;

  reactionCreate(request: ChannelMessageReactionCreateRequest): Promise<ChannelMessageReaction>;
  reactionDelete(request: ChannelMessageReactionDeleteRequest): Promise<void>;

  setTypingIndicator(request: ChannelMessageSetTypingIndicatorRequest): Promise<void>;

  setViewTime(request: ChannelMessageSetViewTimeRequest): Promise<void>;
};
```

## Client events

Each client extends `TypedEventEmitter` and emits events when resources change. Events fire regardless of what caused the change: your code, another server, or a human user.

```ts
export type ChannelMessageClient = TypedEventEmitter<ChannelMessageEvents> & {
  // ...methods
}
```

### Event types

Each client has an associated events type that defines all available events:

```ts
export type ChannelMessageEvents =
{
  'channelMessageReaction.created'    : (evt: ChannelMessageReactionCreatedEvent   ) => void,
  'channelMessageReaction.deleted'    : (evt: ChannelMessageReactionDeletedEvent   ) => void,
  'channelMessagePin.created'         : (evt: ChannelMessagePinCreatedEvent        ) => void,
  'channelMessagePin.deleted'         : (evt: ChannelMessagePinDeletedEvent        ) => void,
  'channelMessage.created'            : (evt: ChannelMessageCreatedEvent           ) => void,
  'channelMessage.edited'             : (evt: ChannelMessageEditedEvent            ) => void,
  'channelMessage.deleted'            : (evt: ChannelMessageDeletedEvent           ) => void,
  'channelMessage.set.typingIndicator': (evt: ChannelMessageSetTypingIndicatorEvent) => void
}
```

### Event enums

For convenience, each events type has a corresponding enum that provides symbolic constants:

```ts
export enum ChannelMessageEvent
{
  ChannelMessageReactionCreated    = 'channelMessageReaction.created',
  ChannelMessageReactionDeleted    = 'channelMessageReaction.deleted',
  ChannelMessagePinCreated         = 'channelMessagePin.created',
  ChannelMessagePinDeleted         = 'channelMessagePin.deleted',
  ChannelMessageCreated            = 'channelMessage.created',
  ChannelMessageEdited             = 'channelMessage.edited',
  ChannelMessageDeleted            = 'channelMessage.deleted',
  ChannelMessageSetTypingIndicator = 'channelMessage.set.typingIndicator'
}
```

Always use the enum when subscribing to events:

```ts
//
// Yes: use the enum
//
rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, onCreated);

//
// No: don't use the raw string, it's error prone
//
rootServer.community.channelMessages.on('channelMessage.created', onCreated);
```