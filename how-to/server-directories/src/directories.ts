// ============================================================================
// How-To: Directories
// SDK: channelDirectories.create, .get, .list, .edit, .move, .delete
// Permissions: channel.createFile, channel.viewFile, channel.manageFiles
// Events: ChannelDirectoryEvent.ChannelDirectoryCreated, .ChannelDirectoryEdited,
//         .ChannelDirectoryDeleted, .ChannelDirectoryMoved
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Create, get, list, edit (rename), move, and delete directories within channels.
// Directories organize files in a hierarchical tree via parentDirectoryId.
//
// ============================================================================

import {
  rootServer,
  ChannelDirectoryEvent,
  ChannelDirectoryCreatedEvent,
  ChannelDirectoryEditedEvent,
  ChannelDirectoryDeletedEvent,
  ChannelDirectoryMovedEvent,
  ChannelDirectory,
  ChannelDirectoryCreateRequest,
  ChannelDirectoryGetRequest,
  ChannelDirectoryListRequest,
  ChannelDirectoryEditRequest,
  ChannelDirectoryEditResponse,
  ChannelDirectoryMoveRequest,
  ChannelDirectoryMoveResponse,
  ChannelDirectoryDeleteRequest,
  ChannelGuid,
  DirectoryGuid,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootApiException,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeDirectories(): void {
  const directories = rootServer.community.channelDirectories;
  const messages = rootServer.community.channelMessages;

  // Directory events
  directories.on(ChannelDirectoryEvent.ChannelDirectoryCreated, onDirectoryCreated);
  directories.on(ChannelDirectoryEvent.ChannelDirectoryEdited, onDirectoryEdited);
  directories.on(ChannelDirectoryEvent.ChannelDirectoryDeleted, onDirectoryDeleted);
  directories.on(ChannelDirectoryEvent.ChannelDirectoryMoved, onDirectoryMoved);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onDirectoriesCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Directories form a tree via parentDirectoryId. Omit parentDirectoryId (or pass
// undefined) to create a root-level directory. Pass a DirectoryGuid to nest it.
// Requires channel.createFile permission.
export async function createDirectory(
  channelId: ChannelGuid,
  name: string,
  parentDirectoryId?: DirectoryGuid,
): Promise<ChannelDirectory> {
  const request: ChannelDirectoryCreateRequest = { channelId, name, parentDirectoryId };
  return rootServer.community.channelDirectories.create(request);
}

// get/delete only need channelId + id — simpler than file requests which also
// need directoryId.
// Requires channel.viewFile permission.
export async function getDirectory(
  channelId: ChannelGuid,
  id: DirectoryGuid,
): Promise<ChannelDirectory> {
  const request: ChannelDirectoryGetRequest = { channelId, id };
  return rootServer.community.channelDirectories.get(request);
}

// list() returns ALL directories in the channel as a flat array — not a tree.
// Only takes channelId. To reconstruct the tree, group by parentDirectoryId.
// Requires channel.viewFile permission.
export async function listDirectories(
  channelId: ChannelGuid,
): Promise<ChannelDirectory[]> {
  const request: ChannelDirectoryListRequest = { channelId };
  return rootServer.community.channelDirectories.list(request);
}

// edit() is rename-only — the only mutable field is name.
// Use move() to change the parent directory.
// Requires channel.manageFiles permission.
export async function editDirectory(
  id: DirectoryGuid,
  channelId: ChannelGuid,
  name: string,
): Promise<ChannelDirectoryEditResponse> {
  const request: ChannelDirectoryEditRequest = { id, channelId, name };
  return rootServer.community.channelDirectories.edit(request);
}

// move() uses oldParentDirectoryId + newParentDirectoryId — same pattern as
// file move (oldDirectoryId/newDirectoryId) and channel move (old/new channelGroupId).
// Requires channel.manageFiles permission.
export async function moveDirectory(
  id: DirectoryGuid,
  channelId: ChannelGuid,
  oldParentDirectoryId: DirectoryGuid,
  newParentDirectoryId: DirectoryGuid,
): Promise<ChannelDirectoryMoveResponse> {
  const request: ChannelDirectoryMoveRequest = {
    id, channelId, oldParentDirectoryId, newParentDirectoryId,
  };
  return rootServer.community.channelDirectories.move(request);
}

// Requires channel.manageFiles permission.
export async function deleteDirectory(
  channelId: ChannelGuid,
  id: DirectoryGuid,
): Promise<void> {
  const request: ChannelDirectoryDeleteRequest = { channelId, id };
  return rootServer.community.channelDirectories.delete(request);
}

// --- COMMAND HANDLER: /server-directories -------------------------------------------
// Exercises the full directory lifecycle: create (root + nested), list, get,
// edit, move, delete.

async function onDirectoriesCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-directories")) return;

  const channelId: ChannelGuid = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List existing directories
    const existing: ChannelDirectory[] = await listDirectories(channelId);
    lines.push(`✓ listed ${existing.length} existing directory(ies)`);

    // 2. Create a root-level directory (no parentDirectoryId)
    const rootDir: ChannelDirectory = await createDirectory(channelId, "demo-root");
    lines.push(`✓ created root directory: ${rootDir.name} (${rootDir.id})`);

    // 3. Create a subdirectory inside it (showing parentDirectoryId nesting)
    const subDir: ChannelDirectory = await createDirectory(channelId, "demo-child", rootDir.id);
    lines.push(
      `✓ created subdirectory: ${subDir.name} (${subDir.id}) ` +
      `parent=${subDir.parentDirectoryId}`,
    );

    // 4. Get the subdirectory by ID
    const fetched: ChannelDirectory = await getDirectory(channelId, subDir.id);
    lines.push(`✓ fetched directory: name=${fetched.name}, parent=${fetched.parentDirectoryId}`);

    // 5. Edit (rename) the subdirectory
    const editResult: ChannelDirectoryEditResponse = await editDirectory(subDir.id, channelId, "renamed-child");
    lines.push(`✓ renamed directory to: ${editResult.name}`);

    // 6. Create a second root directory and move the subdirectory into it
    const rootDir2: ChannelDirectory = await createDirectory(channelId, "demo-root-2");
    lines.push(`✓ created second root directory: ${rootDir2.name} (${rootDir2.id})`);

    const moveResult: ChannelDirectoryMoveResponse = await moveDirectory(subDir.id, channelId, rootDir.id, rootDir2.id);
    lines.push(
      `✓ moved subdirectory: new parent=${moveResult.parentDirectoryId} ` +
      `old parent=${moveResult.oldParentDirectoryId}`,
    );

    // 7. Delete all created directories (child first, then parents)
    await deleteDirectory(channelId, subDir.id);
    lines.push("✓ deleted subdirectory");

    await deleteDirectory(channelId, rootDir.id);
    lines.push("✓ deleted first root directory");

    await deleteDirectory(channelId, rootDir2.id);
    lines.push("✓ deleted second root directory");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    const parts: string[] = [];
    if (err instanceof RootApiException) {
      parts.push(`Directories demo error: ${err.errorCode}`);
      if (err.payload) parts.push(`payload: ${JSON.stringify(err.payload)}`);
    } else if (err instanceof Error) {
      parts.push(`Directories demo error: ${err.message}`);
    }
    await messages.create({ channelId, content: parts.join("\n") });
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire asynchronously for ALL directory changes from any source.
// The channelDirectories client has no eventHandlers parameter — use .on() only.

function onDirectoryCreated(evt: ChannelDirectoryCreatedEvent): void {
  console.log(
    `Directory created: id=${evt.id} name=${evt.name} channelId=${evt.channelId} ` +
    `parentDirectoryId=${evt.parentDirectoryId}`,
  );
}

function onDirectoryEdited(evt: ChannelDirectoryEditedEvent): void {
  console.log(`Directory edited: id=${evt.id} name=${evt.name}`);
}

function onDirectoryDeleted(evt: ChannelDirectoryDeletedEvent): void {
  console.log(`Directory deleted: id=${evt.id} channelId=${evt.channelId}`);
}

function onDirectoryMoved(evt: ChannelDirectoryMovedEvent): void {
  console.log(
    `Directory moved: id=${evt.id} parentDirectoryId=${evt.parentDirectoryId} ` +
    `oldParentDirectoryId=${evt.oldParentDirectoryId}`,
  );
}
