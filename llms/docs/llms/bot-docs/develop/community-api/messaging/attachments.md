---
path: bot-docs/develop/community-api/messaging/attachments.md
audience: bot
category: guide
summary: Send and receive messages with file attachments.
---

# Message attachments

Send and receive messages with file attachments.

## What are attachments?

*Attachments* are files included with messages. When a user sends a message with images, documents, or other files, those files appear as attachments. Your server code can read attachment metadata from incoming messages and include attachments when sending messages.

## Receive messages with attachments

When your code receives a message event, attachments appear in the `messageUris` array:

```ts
import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
} from "@rootsdk/server-bot";

rootServer.community.channelMessages.on(
  ChannelMessageEvent.ChannelMessageCreated,
  (evt: ChannelMessageCreatedEvent) => {
    if (evt.messageUris && evt.messageUris.length > 0) {
      for (const uri of evt.messageUris) {
        console.log(`Attachment URI: ${uri.uri}`);

        if (uri.attachment) {
          console.log(`  File name: ${uri.attachment.fileName}`);
          console.log(`  MIME type: ${uri.attachment.mimeType}`);
          console.log(`  Size: ${uri.attachment.length} bytes`);
        }
      }
    }
  }
);
```

### MessageUri structure

Each attachment in `messageUris` contains:

| Field | Type | Description |
|-------|------|-------------|
| `uri` | `string` | The URI to access the file |
| `attachment` | `MessageUriAttachment` | Optional metadata about the file |

### MessageUriAttachment structure

When available, `attachment` provides:

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | `string` | Original file name |
| `mimeType` | `string` | MIME type (e.g., `image/png`, `application/pdf`) |
| `length` | `bigint` | File size in bytes |
| `modified` | `Date` | Optional last modified timestamp |

## Send messages with attachments

Sending a message with attachments is a multi-step process:

1. Upload files from the client to get temporary upload tokens
2. Send the upload tokens to your server code
3. Convert upload tokens to permanent asset tokens on the server
4. Use the asset tokens when creating the message

### Step 1: Upload files from the client

If your app has a client component, use the client SDK to prompt the user to select files:

```ts
// In client code
import { rootClient, FileUploadRequest } from "@rootsdk/client-app";

const request: FileUploadRequest = {
  fileType: "imageAll",
  multiple: false,
};

const response = await rootClient.assets.fileUpload(request);
// response.tokens contains temporary upload tokens
```

### Step 2: Send upload tokens to your server

The upload tokens returned from `fileUpload` are temporary. Send them from your client code to your server code so they can be converted to permanent asset tokens. How you do this depends on your app's architecture (e.g., via a custom API call or a command message).

### Step 3: Convert upload tokens to asset tokens

On the server, use `rootServer.dataStore.assets.create` to convert the temporary upload tokens into permanent asset URIs:

```ts
import {
  rootServer,
  AssetAppCreateRequest,
  AssetAppCreateResponse,
} from "@rootsdk/server-bot";

const assetRequest: AssetAppCreateRequest = {
  tokens: uploadTokens, // the upload tokens from the client
};

const assetResponse: AssetAppCreateResponse =
  await rootServer.dataStore.assets.create(assetRequest);

// assetResponse.assets is a map of upload token -> permanent asset URI
const assetUris = Object.values(assetResponse.assets);
```

The response `assets` field is an object that maps each original upload token to its corresponding permanent asset URI.

### Step 4: Send the message with asset tokens

Use the permanent asset URIs in `attachmentTokenUris` when creating the message:

```ts
import {
  rootServer,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-bot";

const request: ChannelMessageCreateRequest = {
  channelId: channelId,
  content: "Here's the image you requested:",
  attachmentTokenUris: assetUris,
};

await rootServer.community.channelMessages.create(request);
```

### Supported file types

The `FileUploadType` determines which files users can select:

| Type | Allowed files |
|------|---------------|
| `all` | Any file type |
| `text` | Text files |
| `imageAll` | Image files (PNG, JPEG, GIF, etc.) |
| `pdf` | PDF documents |

## Reference maps

Messages include a `referenceMaps` object that can contain resolved asset information:

```ts
rootServer.community.channelMessages.on(
  ChannelMessageEvent.ChannelMessageCreated,
  (evt: ChannelMessageCreatedEvent) => {
    if (evt.referenceMaps?.assets) {
      for (const [key, asset] of Object.entries(evt.referenceMaps.assets)) {
        console.log(`Asset ${key}: ${asset.fileName}`);
      }
    }

    if (evt.referenceMaps?.imageAssets) {
      for (const [key, image] of Object.entries(evt.referenceMaps.imageAssets)) {
        console.log(`Image ${key}: ${image.width}x${image.height}`);
      }
    }
  }
);
```

## Editing messages with attachments

When editing a message, you can update the attachments by providing new URIs:

```ts
import {
  rootServer,
  ChannelMessageEditRequest,
} from "@rootsdk/server-bot";

const request: ChannelMessageEditRequest = {
  channelId: channelId,
  id: messageId,
  content: "Updated content with new attachment",
  uris: newAttachmentUris,
};

await rootServer.community.channelMessages.edit(request);
```

The `uris` field replaces all existing attachments on the message. To keep existing attachments, include their URIs along with any new ones.

## Limitations

- Maximum file size depends on community settings
- Some file types may be restricted by community moderation settings
- Upload tokens expire after a period of time
- Server code cannot directly upload files; uploads must originate from client code or use pre-existing tokens