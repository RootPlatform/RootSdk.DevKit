---
path: app-api-reference/server/enumerations/MessageDirectionTake.md
audience: app
category: reference
summary: Enum indicating the direction to fetch messages relative to a timestamp when listing messages.
---

Enum indicating the direction to fetch messages relative to a timestamp when listing messages.

## Enumeration Members

### Both

> **Both**: `3`

Fetch messages in both directions from the specified timestamp.

### Newer

> **Newer**: `1`

Fetch messages created after the specified timestamp.

### Older

> **Older**: `2`

Fetch messages created before the specified timestamp.

### Unspecified

> **Unspecified**: `0`

Reserved default value. Do not use in application code.