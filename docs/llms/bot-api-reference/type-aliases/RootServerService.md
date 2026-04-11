---
path: bot-api-reference/type-aliases/RootServerService.md
audience: bot
category: reference
summary: A service definition object that you register with `RootAppLifecycle.addService()` to enable custom client-to-server communication.
---

> **RootServerService** = `object`

A service definition object that you register with `RootAppLifecycle.addService()` to enable custom client-to-server communication. Each service defines methods that your app's client code can call. This is the base type Root uses when it generates your custom networking services.

## Properties

### ServerServiceName

> **ServerServiceName**: `string`

A string identifier for this service. Must be unique across all services registered in your app.