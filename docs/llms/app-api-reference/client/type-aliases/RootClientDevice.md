---
path: app-api-reference/client/type-aliases/RootClientDevice.md
audience: app
category: reference
summary: Information about the host environment your app's client is running in. Available via `rootClient.device`.
---

> **RootClientDevice** = `object`

Information about the host environment your app's client is running in. Available via `rootClient.device`.

## Properties

### os?

> `readonly` `optional` **os?**: [`RootClientOS`](RootClientOS.md)

The operating system the client is running on. One of `"ios"`, `"android"`, `"windows"`, `"macos"`, or `"linux"`. Optional: may be `undefined` if the OS cannot be reliably detected from the environment.

### platform

> `readonly` **platform**: [`RootClientPlatform`](RootClientPlatform.md)

The kind of Root client hosting your app. One of `"mobile"` (iOS or Android), `"desktop"` (the Avalonia/DotNetBrowser desktop client), or `"devhost"` (a developer-mode browser, e.g., when running outside the Root client during development).