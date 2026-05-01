---
kind: api-sample
category: server-lifecycle-utilities
description: Convert upload tokens into permanent asset URIs and resolve asset metadata
domain: Server assets
key_methods: [convert upload tokens to permanent file refs]
---

# API Sample: Assets

Convert upload tokens into permanent asset URIs and resolve asset metadata.

## Source Files

| File | What it covers |
|------|---------------|
| [assets.ts](src/assets.ts) | Create asset URIs from upload tokens; resolve metadata with get |

## SDK Methods

- `dataStore.assets.create(request)` — convert upload tokens to permanent asset URIs
- `dataStore.assets.get(request)` — resolve asset URIs to metadata (type, dimensions, expiry, etc.)

## Permissions

```json
{
  "channel": {
    "createMessage": true
  }
}
```

- No special permissions required for asset operations — they are app-scoped
- `channel.createMessage` — only for the `/server-app-assets` command trigger

## Events

No SDK events for assets.

## Apps vs Bots

**`AssetClient` is only available in `@rootsdk/server-app`** — it is not part of `@rootsdk/server-bot`. This is the key difference that makes assets an app-only api sample.

## Key Behaviors

- **Upload tokens are temporary** — convert them to asset URIs promptly using `assets.create()`. Do not store or cache upload tokens.
- **Asset URIs are permanent** — once created, they can be stored and used indefinitely.
- **Batch operations** — both `create()` and `get()` accept arrays, allowing multiple conversions or lookups per call.
- **`AssetInformation.link` is a discriminated union** — check `link.oneofKind` for the asset type: `"image"`, `"video"`, `"file"`, `"url"`, or `"invalid"`.
- **Link URLs may expire** — `linkExpiresAt` indicates when download/preview URLs become invalid. Asset URIs themselves do not expire.
- **Asset URIs are read-only references** — they appear on entities like `CommunityEmoji.assetUri`, `ChannelFile.assetUri`, and `CommunityMember.profilePictureAssetUri`. Use `get()` to resolve any asset URI to its metadata. Note: SDK methods that accept uploads (e.g., `channelFiles.create()`, `community.edit()`) take raw upload tokens, not asset URIs.
