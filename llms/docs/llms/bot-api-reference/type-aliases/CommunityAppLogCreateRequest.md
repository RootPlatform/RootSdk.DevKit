---
path: bot-api-reference/type-aliases/CommunityAppLogCreateRequest.md
audience: bot
category: reference
summary: Request object for writing a log entry to the community's app log.
---

> **CommunityAppLogCreateRequest** = `object`

Request object for writing a log entry to the community's app log.

## Properties

### communityAppLogType

> **communityAppLogType**: [`CommunityAppLogType`](../enumerations/CommunityAppLogType.md)

The severity level of the log entry. Required. Use values from `CommunityAppLogType`: `Info`, `Warn`, `Error`, or `Fatal`.

### message

> **message**: `string`

The log message text. Required.