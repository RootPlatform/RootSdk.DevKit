// ============================================================================
// How-To: Emojis
// SDK: communityEmojis.get, .list, .delete
// Permissions: community.manageEmojis (delete only; get/list require none)
// Events: CommunityEmojiEvent.CommunityEmojiCreated,
//         .CommunityEmojiDeleted
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================
//
// Get, list, and delete custom community emojis. Emojis have shortcodes used
// in messages as :shortcode: and in reactions. There is no create method in the
// SDK — emojis are created through the Root platform UI or test harness.
//
// ============================================================================

import {
  rootServer,
  CommunityEmoji,
  CommunityEmojiGetRequest,
  CommunityEmojiDeleteRequest,
  CommunityEmojiEvent,
  CommunityEmojiCreatedEvent,
  CommunityEmojiDeletedEvent,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootApiException,
  ErrorCodeType,
} from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------

export function initializeEmojis(): void {
  const emojis = rootServer.community.communityEmojis;
  const messages = rootServer.community.channelMessages;

  // Emoji events
  emojis.on(CommunityEmojiEvent.CommunityEmojiCreated, onEmojiCreated);
  emojis.on(CommunityEmojiEvent.CommunityEmojiDeleted, onEmojiDeleted);

  // Command trigger
  messages.on(ChannelMessageEvent.ChannelMessageCreated, onEmojisCommand);
}

// --- OPERATIONS --------------------------------------------------------------

// Retrieves a single emoji by ID. Returns the emoji's shortcode and assetUri.
// No special permissions required.
export async function getEmoji(id: CommunityEmoji["id"]): Promise<CommunityEmoji> {
  const request: CommunityEmojiGetRequest = { id };
  return rootServer.community.communityEmojis.get(request);
}

// Returns all custom emojis in the community. No pagination — returns the
// full list in one call. No special permissions required.
export async function listEmojis(): Promise<CommunityEmoji[]> {
  return rootServer.community.communityEmojis.list();
}

// Deletes an emoji by ID. Idempotent — deleting an already-deleted emoji
// succeeds without error.
// Requires community.manageEmojis permission.
export async function deleteEmoji(id: CommunityEmoji["id"]): Promise<void> {
  const request: CommunityEmojiDeleteRequest = { id };
  return rootServer.community.communityEmojis.delete(request);
}

// --- COMMAND HANDLER: /server-emojis ------------------------------------------------
// Lists all emojis and demonstrates get-by-id. Does not delete — the
// deleteEmoji operation is exported for external use.
// Emojis must exist before running this command — create them via the Root
// platform UI or test harness (community-builder).

async function onEmojisCommand(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith("/server-emojis")) return;

  const channelId = evt.channelId;
  const messages = rootServer.community.channelMessages;
  const lines: string[] = [];

  try {
    // 1. List all emojis
    const emojis: CommunityEmoji[] = await listEmojis();
    lines.push(`\u2713 listed ${emojis.length} custom emoji(s)`);

    for (const emoji of emojis) {
      lines.push(`  :${emoji.shortcode}: — id=${emoji.id} assetUri=${emoji.assetUri}`);
    }

    // 2. Demonstrate get-by-id
    const arg = content.replace("/server-emojis", "").trim();
    let target: CommunityEmoji | undefined;

    if (arg) {
      // Find by shortcode argument
      target = emojis.find((e) => e.shortcode === arg);
      if (!target) {
        lines.push(`\u2717 no emoji found with shortcode "${arg}"`);
      }
    } else if (emojis.length > 0) {
      target = emojis[0];
    }

    if (target) {
      const fetched: CommunityEmoji = await getEmoji(target.id);
      lines.push(
        `\u2713 get: id=${fetched.id} shortcode=${fetched.shortcode} ` +
        `assetUri=${fetched.assetUri}`,
      );
    }

    // 3. Show available operations
    lines.push("\u2713 operations: getEmoji(id), listEmojis(), deleteEmoji(id)");

    await messages.create({ channelId, content: lines.join("\n") });
  } catch (err: unknown) {
    if (err instanceof RootApiException) {
      switch (err.errorCode) {
        case ErrorCodeType.NotFound:
          console.error("Emoji not found — it may have been deleted");
          break;
        case ErrorCodeType.NoPermissionToDelete:
          console.error("Missing manageEmojis permission in root-manifest.json");
          break;
        case ErrorCodeType.TooManyRequests:
          console.error("Rate limited — queries max ~20 req/s, commands ~5 req/s");
          break;
        default:
          console.error("RootApiException:", err.errorCode);
      }
    } else if (err instanceof Error) {
      console.error("Unexpected error:", err.message);
    }
  }
}

// --- EVENT HANDLERS ----------------------------------------------------------
// These fire for ALL emoji changes from any source (UI, harness, other apps).
// To trigger CommunityEmojiCreated, create an emoji via the Root platform UI
// or test harness while your code is running.

function onEmojiCreated(evt: CommunityEmojiCreatedEvent): void {
  console.log(
    `Emoji created: id=${evt.id} shortcode=${evt.shortcode} assetUri=${evt.assetUri}`,
  );
}

function onEmojiDeleted(evt: CommunityEmojiDeletedEvent): void {
  console.log(`Emoji deleted: id=${evt.id}`);
}
