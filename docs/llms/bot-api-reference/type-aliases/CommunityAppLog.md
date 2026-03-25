---
path: bot-api-reference/type-aliases/CommunityAppLog.md
audience: bot
category: reference
summary: A log entry written by an app to a community's diagnostic log.
---

> **CommunityAppLog** = `object`

A log entry written by an app to a community's diagnostic log.

## Properties

### communityAppLogType

> **communityAppLogType**: [`CommunityAppLogType`](../enumerations/CommunityAppLogType.md)

The severity level of the log entry. See `CommunityAppLogType` for possible values.

### message

> **message**: `string`

The log message text.