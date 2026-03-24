---
path: bot-api-reference/type-aliases/CommunityMemberListRequest.md
audience: bot
category: reference
summary: Request object for retrieving multiple community members by their user IDs.
---

> **CommunityMemberListRequest** = `object`

Request object for retrieving multiple community members by their user IDs.

## Properties

### userIds

> **userIds**: [`UserGuid`](UserGuid.md)[]

Array of user IDs to retrieve. Required. Users who are not members of the community will be omitted from the response.