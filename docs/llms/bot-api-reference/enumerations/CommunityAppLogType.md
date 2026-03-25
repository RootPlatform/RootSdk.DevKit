---
path: bot-api-reference/enumerations/CommunityAppLogType.md
audience: bot
category: reference
summary: Enum defining severity levels for community app log entries.
---

Enum defining severity levels for community app log entries.

## Enumeration Members

### Error

> **Error**: `3`

Error messages for failures that affect specific operations but allow the app to continue.

### Fatal

> **Fatal**: `4`

Fatal messages for critical failures that may prevent the app from functioning correctly.

### Info

> **Info**: `1`

Informational messages for routine events and status updates.

### Unspecified

> **Unspecified**: `0`

Reserved default value. Do not use in application code.

### Warn

> **Warn**: `2`

Warning messages for potentially problematic situations that do not prevent operation.