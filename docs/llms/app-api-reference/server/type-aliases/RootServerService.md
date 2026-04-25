---
path: app-api-reference/server/type-aliases/RootServerService.md
audience: app
category: reference
summary: A service definition object that you register with `RootAppLifecycle.addService()` to enable custom client-to-server communication.
---

> **Worked sample**: `api-samples/networking-app-services/` — RPC Services

> **RootServerService** = `object`

A service definition object that you register with `RootAppLifecycle.addService()` to enable custom client-to-server communication. Each service defines methods that your app's client code can call. This is the base type Root uses when it generates your custom networking services.

## Properties

### ServerServiceName

> **ServerServiceName**: `string`

A string identifier for this service. Must be unique across all services registered in your app.