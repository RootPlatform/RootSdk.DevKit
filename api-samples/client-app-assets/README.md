# API Sample: Client Assets

File uploads, the full client-to-server upload flow, asset persistence, and
image resolution handling. Use when your app needs to upload files from the
browser, convert upload tokens to permanent asset URIs on the server, persist
asset references, or display images at different resolutions.

## Source Files

| File | What it covers |
|------|---------------|
| [client/src/AssetDemo.tsx](client/src/AssetDemo.tsx) | Client: upload flow, URL conversion, image display at multiple resolutions |
| [server/src/upload-service.ts](server/src/upload-service.ts) | Server: convert upload token to asset URI, persist in key-value store |
| [server/src/main.ts](server/src/main.ts) | Server: service registration, self-test |
| [networking/src/upload_service.proto](networking/src/upload_service.proto) | Proto: UploadService RPC + error enum |

## Upload Flow

```
Client                          Server
  |                               |
  |  fileUpload() -> token        |
  |  toUploadImagePreview(token)  |
  |                               |
  |-- submitUpload({ token }) --> |  dataStore.assets.create({ tokens })
  |                               |  -> permanent asset URI
  |                               |  appData.set(key, assetUri)
  |<- { assetUri, assetType } ---|
  |                               |
  |  toImageUrl(assetUri, res)    |
  |  -> display at small/med/lg   |
```

## Client SDK Methods (`@rootsdk/client-app`)

- [x] `rootClient.assets.fileUpload(request)` — open file picker and upload
- [x] `rootClient.assets.toUrl(uri)` — convert asset URI to displayable URL
- [x] `rootClient.assets.toImageUrl(uri, resolution)` — get image URL at specific resolution
- [x] `rootClient.assets.toUploadImagePreview(token)` — preview a just-uploaded image

## Server SDK Methods (`@rootsdk/server-app`)

- [x] `dataStore.assets.create({ tokens })` — convert upload tokens to asset URIs
- [x] `dataStore.appData.set(key, value)` — persist asset URI
- [x] `dataStore.appData.get(key)` — retrieve persisted asset URI

## Types

- `FileUploadType` — `"all" | "text" | "imageAll" | "pdf"`
- `FileUploadRequest` — `{ fileType: FileUploadType, multiple?: boolean, windowTitle?: string }`
- `FileUploadResponse` — `{ tokens: string[] }`
- `ImageUriResolution` — `"original" | "large" | "medium" | "small"`

## Permissions

```json
{
  "channel": { "createMessage": true }
}
```

## Project Structure

```
client-assets/
├── root-manifest.json
├── package.json              # Workspace root
├── networking/               # Proto compilation layer
│   ├── root-protoc.json
│   └── src/
│       └── upload_service.proto
├── server/
│   └── src/
│       ├── main.ts           # Entry point + self-test
│       └── upload-service.ts # Token -> asset URI -> persist
└── client/
    └── src/
        ├── index.tsx
        ├── App.tsx
        └── AssetDemo.tsx     # Full upload flow + image display
```

## Self-Test Output

When triggered via `/client-assets`:

```
✓ UploadService registered
✓ appData persist/retrieve: match=true
```
