---
path: bot-api-reference/type-aliases/CommunityJoinThrottle.md
audience: bot
category: reference
summary: Configuration for rate-limiting new member joins to a community. Used to prevent rapid influxes of new members that could overwhelm moderation.
---

> **CommunityJoinThrottle** = `object`

Configuration for rate-limiting new member joins to a community. Used to prevent rapid influxes of new members that could overwhelm moderation.

## Properties

### refillCount

> **refillCount**: `number`

The maximum number of new members allowed to join within the time window.

### windowInMinutes

> **windowInMinutes**: `number`

The time window in minutes over which the join limit applies.