// ============================================================================
// How-To: Files
// SDK: channelFiles.create, .get, .list, .edit, .move, .delete, .search,
//      .searchCommunity
// Permissions: channel.createFile, channel.viewFile, channel.manageFiles
// Events: ChannelFileEvent.ChannelFileCreated, .ChannelFileEdited,
//         .ChannelFileDeleted, .ChannelFileMoved
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Create, get, list, edit, move, delete, search, and search across community
// for files within channel directories. Files are always scoped to a channel
// and (for most operations) a directory within that channel.
//
// ============================================================================

import {
  rootServer,
  ChannelFileEvent,
  ChannelFileCreatedEvent,
  ChannelFileEditedEvent,
  ChannelFileDeletedEvent,
  ChannelFileMovedEvent,
  ChannelFile,
  ChannelFileCreateRequest,
  ChannelFileGetRequest,
  ChannelFileListRequest,
  ChannelFileEditRequest,
  ChannelFileEditResponse,
  ChannelFileMoveRequest,
  ChannelFileMoveResponse,
  ChannelFileDeleteRequest,
  ChannelFileSearchRequest,
  ChannelFileSearchCommunityRequest,
  ChannelFileSearchCommunityResponse,
  ChannelGuid,
  DirectoryGuid,
  FileGuid,
  ChannelDirectoryCreateRequest,
  ChannelDirectoryListRequest,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeFiles(): void {
  const files = rootServer.community.channelFiles;
  const messages = rootServer.community.channelMessages;

  // File events
  files.on(ChannelFileEvent.ChannelFileCreated, onFileCreated);
  files.on(ChannelFileEvent.ChannelFileEdited, onFileEdited);
  files.on(ChannelFileEvent.ChannelFileDeleted, onFileDeleted);
  files.on(ChannelFileEvent.ChannelFileMoved, onFileMoved);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onFilesCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// create() requires an uploadTokenUri — a raw upload token from the platform's
// asset upload endpoint. Upload tokens are temporary and should be used promptly,
// not stored. In production, the client initiates the upload; in tests, use
// community-builder's uploadFileContent() to generate tokens programmatically.
// Requires channel.createFile permission.
export async function createFile(
  channelId: ChannelGuid,
  directoryId: DirectoryGuid,
  uploadTokenUri: string,
): Promise<ChannelFile> {
  const request: ChannelFileCreateRequest = {
    channelId,
    directoryId,
    uploadTokenUri,
  };
  return rootServer.community.channelFiles.create(request);
}

// Every request requires channelId — files are always scoped to a channel.
// Most requests also require directoryId (get, list, edit, delete).
// Requires channel.viewFile permission.
export async function getFile(
  channelId: ChannelGuid,
  id: FileGuid,
  directoryId: DirectoryGuid,
): Promise<ChannelFile> {
  const request: ChannelFileGetRequest = { channelId, id, directoryId };
  return rootServer.community.channelFiles.get(request);
}

// Lists files in a single directory — not recursive.
// To list all files in a channel, list directories first, then list files in each.
// Requires channel.viewFile permission.
export async function listFiles(
  channelId: ChannelGuid,
  directoryId: DirectoryGuid,
): Promise<ChannelFile[]> {
  const request: ChannelFileListRequest = { channelId, directoryId };
  return rootServer.community.channelFiles.list(request);
}

// edit() is rename-only — the only mutable field is name.
// You cannot move or replace file content via edit. Use move() to change directory.
// Requires channel.manageFiles permission.
export async function editFile(
  channelId: ChannelGuid,
  id: FileGuid,
  directoryId: DirectoryGuid,
  name: string,
): Promise<ChannelFileEditResponse> {
  const request: ChannelFileEditRequest = { channelId, id, directoryId, name };
  return rootServer.community.channelFiles.edit(request);
}

// move() requires both oldDirectoryId and newDirectoryId — same pattern as
// channel move requiring old/new channelGroupId.
// Requires channel.manageFiles permission.
export async function moveFile(
  channelId: ChannelGuid,
  id: FileGuid,
  oldDirectoryId: DirectoryGuid,
  newDirectoryId: DirectoryGuid,
): Promise<ChannelFileMoveResponse> {
  const request: ChannelFileMoveRequest = { channelId, id, oldDirectoryId, newDirectoryId };
  return rootServer.community.channelFiles.move(request);
}

// Requires channel.manageFiles permission.
export async function deleteFile(
  channelId: ChannelGuid,
  id: FileGuid,
  directoryId: DirectoryGuid,
): Promise<void> {
  const request: ChannelFileDeleteRequest = { channelId, id, directoryId };
  return rootServer.community.channelFiles.delete(request);
}

// search() searches across all directories within a single channel.
// lastFileId enables cursor-based pagination — pass the last file's id to get
// the next page. Omit for the first page.
// Requires channel.viewFile permission.
export async function searchFiles(
  channelId: ChannelGuid,
  search: string,
  lastFileId?: FileGuid,
): Promise<ChannelFile[]> {
  const request: ChannelFileSearchRequest = { channelId, search, lastFileId };
  return rootServer.community.channelFiles.search(request);
}

// searchCommunity() searches across multiple channels at once.
// Results are grouped by channelId — each ChannelFileSearchResult contains
// channelId, files[], and totalCount for that channel.
// Requires channel.viewFile permission on each channel.
export async function searchCommunityFiles(
  channelIds: ChannelGuid[],
  search: string,
): Promise<ChannelFileSearchCommunityResponse> {
  const request: ChannelFileSearchCommunityRequest = { channelIds, search };
  return rootServer.community.channelFiles.searchCommunity(request);
}

// --- COMMAND HANDLER: /files -------------------------------------------------
// Exercises file operations: list, get, search, searchCommunity, edit, move, delete.
// Note: create() is not demoed because it requires an uploadTokenUri from the
// asset service (rootServer.dataStore.assets), which is only available in server-app.

async function onFilesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/files")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const directories = rootServer.community.channelDirectories;
  const lines: string[] = [];

  try {
    // 1. List directories in this channel to get a directoryId
    const dirListReq: ChannelDirectoryListRequest = { channelId };
    let dirList = await directories.list(dirListReq);

    let dirId: DirectoryGuid;
    if (dirList.length > 0) {
      dirId = dirList[0].id;
      lines.push(`✓ found ${dirList.length} directory(ies), using: ${dirList[0].name} (${dirId})`);
    } else {
      // Create a directory so we can demonstrate file operations
      const createDirReq: ChannelDirectoryCreateRequest = { channelId, name: "demo-files" };
      const newDir = await directories.create(createDirReq);
      dirId = newDir.id;
      lines.push(`✓ created directory: ${newDir.name} (${dirId})`);
    }

    // 2. List files in the directory
    const files = await listFiles(channelId, dirId);
    lines.push(`✓ listed ${files.length} file(s) in directory`);

    if (files.length > 0) {
      const file = files[0];

      // 3. Get a file by ID
      const fetched = await getFile(channelId, file.id, dirId);
      lines.push(`✓ fetched file: name=${fetched.name}, length=${fetched.length}`);

      // 4. Search for the file by name within this channel
      const searchResults = await searchFiles(channelId, file.name);
      lines.push(`✓ search for "${file.name}": found ${searchResults.length} result(s)`);

      // 5. Edit (rename) the file
      const editResult = await editFile(channelId, file.id, dirId, `renamed-${file.name}`);
      lines.push(`✓ renamed file to: ${editResult.name}`);

      // 6. Move the file to a new directory (create one first)
      const moveDirReq: ChannelDirectoryCreateRequest = { channelId, name: "moved-files" };
      const moveDir = await directories.create(moveDirReq);
      const moveResult = await moveFile(channelId, file.id, dirId, moveDir.id);
      lines.push(`✓ moved file to directory: ${moveDir.name} (old=${moveResult.oldDirectoryId})`);

      // 7. Delete the file (from its new directory)
      await deleteFile(channelId, file.id, moveDir.id);
      lines.push("✓ deleted file");
    } else {
      lines.push(
        "ℹ no files in directory — create() requires an uploadTokenUri from " +
        "rootServer.dataStore.assets.create() (server-app only)",
      );
    }

    // 8. Search across the community (this channel)
    const communitySearch = await searchCommunityFiles([channelId], "test");
    const resultCount = communitySearch.results?.length ?? 0;
    lines.push(`✓ searchCommunity for "test": ${resultCount} channel(s) with results`);

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err) {
    console.error("Files demo error:", err);
    await messages.create({ channelId, content: `Files demo error: ${err}` });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL file changes from any source.
// The channelFiles client has no eventHandlers parameter — use .on() only.

// Note: ChannelFileCreatedEvent includes mimeType, but the ChannelFile entity
// does NOT. mimeType is only available at creation time via this event.
// length is bigint, sha256 is Uint8Array (binary hash, not hex string).
function onFileCreated(evt: ChannelFileCreatedEvent): void {
  console.log(
    `File created: id=${evt.id} name=${evt.name} channelId=${evt.channelId} ` +
    `directoryId=${evt.directoryId} mimeType=${evt.mimeType} length=${evt.length}`,
  );
}

function onFileEdited(evt: ChannelFileEditedEvent): void {
  console.log(`File edited: id=${evt.id} name=${evt.name} directoryId=${evt.directoryId}`);
}

function onFileDeleted(evt: ChannelFileDeletedEvent): void {
  console.log(`File deleted: id=${evt.id} channelId=${evt.channelId} directoryId=${evt.directoryId}`);
}

function onFileMoved(evt: ChannelFileMovedEvent): void {
  console.log(
    `File moved: id=${evt.id} directoryId=${evt.directoryId} ` +
    `oldDirectoryId=${evt.oldDirectoryId}`,
  );
}
