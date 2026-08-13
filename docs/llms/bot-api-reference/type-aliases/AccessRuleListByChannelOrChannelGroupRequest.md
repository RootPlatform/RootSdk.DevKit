---
path: bot-api-reference/type-aliases/AccessRuleListByChannelOrChannelGroupRequest.md
audience: bot
category: reference
summary: Request object for listing all access rules that apply to a specific channel or channel group.
---

> **AccessRuleListByChannelOrChannelGroupRequest** = `object`

Request object for listing all access rules that apply to a specific channel or channel group.

## Properties

### channelOrChannelGroupId?

> `optional` **channelOrChannelGroupId?**: [`ChannelOrChannelGroupGuid`](ChannelOrChannelGroupGuid.md)

Optional `ChannelOrChannelGroupUuid` identifying the channel or channel group to list access rules for. If not provided, returns all access rules in the community.