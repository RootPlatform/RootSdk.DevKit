---
path: app-api-reference/client/type-aliases/RootClient.md
audience: app
category: reference
summary: This type is your entry point to the Root client-side APIs. Root automatically creates an instance of this type and provides it for your use.
---

> **RootClient** = `object`

This type is your entry point to the Root client-side APIs. Root automatically creates an instance of this type and provides it for your use. You import the instance and access its properties.

## Properties

### assets

> **assets**: [`RootClientAsset`](RootClientAsset.md)

Provides methods to download assets and images from the Root client.

### device

> **device**: [`RootClientDevice`](RootClientDevice.md)

### lifecycle

> **lifecycle**: [`RootClientLifecycle`](RootClientLifecycle.md)

Lifecycle events for your client-side component.

### links

> **links**: `RootClientLink`

### theme

> **theme**: [`RootClientTheme`](RootClientTheme.md)

Provides the current theme mode (light or dark) and an event to notify you when the user changes their theme.

### users

> **users**: [`RootClientUser`](RootClientUser.md)

Provides methods to retrieve user profiles and display the built-in profile popup.