---
path: bot-api-reference/type-aliases/AccessRuleGetRequest.md
audience: bot
category: reference
summary: Request object for retrieving a single access rule.
---

> **AccessRuleGetRequest** = `object`

Request object for retrieving a single access rule.

## Properties

### channelOrChannelGroupId

> **channelOrChannelGroupId**: [`ChannelOrChannelGroupGuid`](ChannelOrChannelGroupGuid.md)

The `ChannelOrChannelGroupUuid` identifying the channel or channel group the access rule applies to. Required.

### roleOrMemberId

> **roleOrMemberId**: [`RoleOrMemberGuid`](RoleOrMemberGuid.md)

The `RoleOrMemberUuid` identifying the role or member the access rule applies to. Required.