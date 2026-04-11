---
path: app-api-reference/client/type-aliases/RootClientService.md
audience: app
category: reference
summary: Base type that generated client-side service classes implement.
---

> **RootClientService** = `object`

Base type that generated client-side service classes implement. When you define a networking service for your app, Root generates a client class that implements this type. You do not implement this type directly.

## Properties

### ClientServiceName

> **ClientServiceName**: `string`

The name of the service, used internally to route messages between client and server.