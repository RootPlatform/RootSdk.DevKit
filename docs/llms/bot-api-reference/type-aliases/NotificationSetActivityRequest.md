---
path: bot-api-reference/type-aliases/NotificationSetActivityRequest.md
audience: bot
category: reference
summary: Request object for marking your code's channel as recently active.
---

> **NotificationSetActivityRequest** = `object`

Request object for marking your code's channel as recently active.

## Properties

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The community whose channel activity is being set. Optional. Defaults to the community your code is running for.