---
path: bot-docs/develop/community-api/files.md
audience: bot
category: guide
summary: Read and manage files within channels using directories and file metadata.
---

# Channel files

Read and manage files within channels using directories and file metadata.

## What are channel files?

Each text channel has a built-in file system where members can upload and organize files. The file system consists of two entities:

- **Directories**: Folders that organize files hierarchically within a channel
- **Files**: Uploaded content with metadata like name, size, and MIME type

[Diagram: Diagram showing directories and files within a channel.]
```
flowchart TD
  CH["#resources (Channel)"]
  CH --> D1[Documents]
  CH --> D2[Images]
  CH --> F1[readme.txt]
  D1 --> F2[guide.pdf]
  D1 --> F3[spec.docx]
  D2 --> F4[logo.png]
  D2 --> D3[Screenshots]
  D3 --> F5[app-v1.png]
```

### Directories

A directory is a named folder within a channel. Directories can be nested inside other directories to create a hierarchical structure.

```ts
// ChannelDirectory structure
{
  id: DirectoryGuid,
  parentDirectoryId?: DirectoryGuid,  // undefined = root level
  name: string
}
```

When `parentDirectoryId` is undefined, the directory sits at the channel's root level. Otherwise, it's nested inside the specified parent directory.

### Files

A file represents uploaded content stored in a directory.

```ts
// ChannelFile structure
{
  id: FileGuid,
  directoryId: DirectoryGuid,
  channelId: ChannelGuid,
  name: string,
  length: bigint,
  mimeType: string,
  assetId: AssetGuid,
  sha256: Uint8Array,
  modifiedAt?: Date
}
```

The `assetId` links to the actual content in the asset system. Use the asset URI to download or display the file content.

## How channel files work

Understanding the directory structure helps you build file management features.

> **Note:** Bots can read, search, move, rename, and delete files, but cannot upload new files. File uploads require the app SDK's asset system.
### Directory hierarchy

Directories form a tree structure within each channel. To build a complete view of the file system:

1. Call `list()` to get all directories in the channel
2. Use `parentDirectoryId` to reconstruct the hierarchy
3. Call `ChannelFileClient.list()` for each directory to get its files

```ts
// Get all directories in a channel
const directories = await rootServer.community.channelDirectories.list({
  channelId: channelId
});

// Get files in a specific directory
const files = await rootServer.community.channelFiles.list({
  channelId: channelId,
  directoryId: directoryId
});
```

### Moving files and directories

Both files and directories can be moved between directories. When moving a directory, all its contents (files and subdirectories) move with it.

Moving requires specifying both the old and new parent:

```ts
// Move a directory
await rootServer.community.channelDirectories.move({
  channelId: channelId,
  id: directoryId,
  oldParentDirectoryId: currentParent,
  newParentDirectoryId: targetParent
});

// Move a file
await rootServer.community.channelFiles.move({
  channelId: channelId,
  id: fileId,
  oldDirectoryId: currentDirectory,
  newDirectoryId: targetDirectory
});
```

### Searching files

Two search methods help users find files:

| Method | Scope | Use case |
|--------|-------|----------|
| `search` | Single channel | Find files within the current channel |
| `searchCommunity` | Multiple channels | Find files across the community |

Both methods perform a case-insensitive substring match on file names. Wildcards and regular expressions are not supported.

```ts
// Search within a channel
const results = await rootServer.community.channelFiles.search({
  channelId: channelId,
  search: 'report'
});

// Search across multiple channels
const communityResults = await rootServer.community.channelFiles.searchCommunity({
  channelIds: [channel1, channel2, channel3],
  search: 'report'
});
```

#### Search pagination

Single-channel search uses cursor-based pagination. Each request returns up to 10 matching files. To retrieve additional results, pass the `id` of the last file as `lastFileId`:

```ts
// First page
const page1 = await rootServer.community.channelFiles.search({
  channelId: channelId,
  search: 'report'
});

// Get next page using last file's ID
if (page1.length === 10) {
  const lastFile = page1[page1.length - 1];
  const page2 = await rootServer.community.channelFiles.search({
    channelId: channelId,
    search: 'report',
    lastFileId: lastFile.id
  });
}
```

Community-wide search does not support pagination. It returns up to 10 matching files per channel, along with a `totalCount` indicating the total matches in each channel.

### Deleting directories

When you delete a directory, all files and subdirectories within it are also deleted. This is a cascading delete with no recovery. To preserve files, move them to another directory before deleting.

## When to use channel files

- **File search**: Help users find content across channels using the search APIs
- **Automated file management**: Move files to archive directories based on age or clean up unused directories
- **Content indexing**: Monitor file events to build search indexes or trigger processing workflows
- **File organization**: Rename files or reorganize directory structures based on rules