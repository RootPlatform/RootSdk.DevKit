---
path: app-api-reference/server/type-aliases/NotificationSetActivityRequest.md
audience: app
category: reference
summary: Request object for marking your code's channel as recently active.
---

> **NotificationSetActivityRequest** = `object`

Request object for marking your code's channel as recently active.

## Properties

### communityId?

> `optional` **communityId?**: [`CommunityGuid`](CommunityGuid.md)

The community whose channel activity is being set. Optional. Defaults to the community your code is running for.