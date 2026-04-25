---
path: app-docs/develop/server/assets.md
audience: app
category: guide
summary: Convert temporary upload tokens into permanent file references that your app can store and use later.
---

> **Worked sample**: `api-samples/server-app-assets/` — Server Assets

# Assets

Convert temporary upload tokens into permanent file references that your app can store and use later.

## What are assets?

An *asset* is a permanent reference to a file stored in Root's infrastructure. When users select files through your app's client interface, the upload produces temporary *upload tokens*. These tokens expire after a period of time. To keep a reference to the file, convert the token to a permanent *asset URI* using the `AssetClient`.

Asset URIs are strings that identify stored files. Once created, an asset URI remains valid indefinitely and can be used to display images, reference attachments, or store file metadata in your app's data.

## How assets work

The asset lifecycle involves coordination between your client code and server code:

1. **Client uploads**: Your app's client code calls `rootClient.asset.fileUpload()` to show a file picker. When the user selects a file, the client uploads it and receives an upload token.

2. **Token transfer**: Your client sends the upload token to your server code, typically through your custom networking methods.

3. **Token conversion**: Your server code calls `rootServer.dataStore.assets.create()` with the tokens. This converts each temporary token into a permanent asset URI.

4. **Storage**: Store the asset URIs in your app's data. They remain valid indefinitely.

[Diagram: Sequence diagram showing the asset lifecycle: user selects a file, client uploads it via fileUpload() and receives a temporary token, client sends the token to the server, server converts it to a permanent asset URI via assets.create(), and server stores the URI.]
```
sequenceDiagram
    participant User
    participant Client as App Client
    participant Server as App Server
    participant Root as Root Platform
    User->>Client: Selects file
    Client->>Root: fileUpload()
    Root-->>Client: Upload token
    Client->>Server: Send token
    Server->>Root: assets.create({ tokens })
    Root-->>Server: Asset URIs
    Server->>Server: Store URIs
```

## When to use assets

- **Store user-uploaded images**: When users upload profile pictures, custom icons, or other images that your app displays, convert the tokens to asset URIs so you can reference them later.
- **Persist file references**: When your app needs to remember which files a user selected across sessions, store the asset URIs in your key-value store.
- **Embed images in rich content**: When users create content that includes uploaded images (posts, descriptions, etc.), convert the tokens before storing. Otherwise, the images become inaccessible when the tokens expire.

## Converting tokens to assets

Access the asset client through `rootServer.dataStore.assets`:

```ts
import { rootServer } from "@rootsdk/server-app";

// Receive tokens from client code
const uploadTokens: string[] = getTokensFromClient();

// Convert to permanent asset URIs
const response = await rootServer.dataStore.assets.create({
  tokens: uploadTokens,
});

// response.assets is a map: { [token]: assetUri }
for (const [token, assetUri] of Object.entries(response.assets)) {
  console.log(`Token ${token} -> ${assetUri}`);
}
```

The `assets` map in the response uses the original tokens as keys and the permanent asset URIs as values. This lets you correlate which URI belongs to which uploaded file.