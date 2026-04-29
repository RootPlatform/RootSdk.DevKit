// ============================================================================
// Recipe: Chat Trigger + Respond — the ping handler
// SDK: rootServer.community.channelMessages (subscribe + post)
// ============================================================================
//
// Subscribes to ChannelMessageCreated, filters for the recipe's slash-command
// prefix, and posts a response in the same channel.
//
// Lessons in shape order:
//
//   1. SUBSCRIBE — `channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, …)`
//      fires for every chat message in every channel of the community. The
//      handler runs server-side; there's no per-channel scoping at the
//      subscription level.
//
//   2. FILTER — incoming events include system messages (joins, role
//      changes, etc.), the app's OWN posts (which would otherwise create
//      a feedback loop when the response triggers another event), and
//      messages from any channel. Always filter before reacting.
//
//   3. PARSE — the trigger contract is `/ping <text>`. Slice the prefix,
//      treat the rest as the argument. A real app might use a small
//      parser for multi-word commands; here we keep it simple.
//
//   4. RESPOND — `channelMessages.create({ channelId, content })` posts in
//      the same channel. The post is asynchronous; awaiting matters for
//      ordering relative to subsequent logic, not for correctness of the
//      message itself.
//
// What this recipe deliberately leaves out:
//   - Per-channel filtering (which channels can use /ping?) — see
//     excluded-channels-filter recipe (planned).
//   - Per-user rate limiting — see per-user-cooldown recipe (planned).
//   - Auth gating (only admins can /ping?) — see ui-feature-by-role
//     for the role-check pattern; bolt onto buildResponse if needed.
// ============================================================================

import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
} from "@rootsdk/server-app";

const COMMAND_PREFIX = "/ping";

// Prefix every response shares so a reader can recognize what the recipe
// posted at a glance. The harness's ChatStep asserts on this in the
// expected reply.
const RESPONSE_PREFIX = "pong:";

export function initializePingHandler(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onChannelMessage,
  );
}

async function onChannelMessage(
  evt: ChannelMessageCreatedEvent,
): Promise<void> {
  // Filter 1: skip system messages (joins, role changes, etc.) — they
  // don't carry user-typed content the recipe should react to.
  if (evt.messageType === MessageType.System) return;

  // Filter 2: skip messages whose content doesn't match the trigger
  // prefix. Cheap string check; runs for every message in every channel
  // so it has to be fast.
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith(COMMAND_PREFIX)) return;

  // Loop prevention is incidental here — the bot's own `pong: …` posts
  // don't start with `/ping`, so Filter 2 already drops them. A recipe
  // whose response shares its trigger prefix needs an explicit
  // author-id check (compare evt.authorMemberId against the bot's own
  // member id). See README → "Loop prevention" for the production pattern.

  // Parse: take everything after the command prefix as the argument.
  // Trim the leading space `/ping ` leaves behind, but preserve any
  // internal spacing so "/ping foo  bar" echoes "foo  bar" verbatim.
  const arg = content.slice(COMMAND_PREFIX.length).replace(/^\s+/, "");
  const responseText = buildResponse(arg);

  await rootServer.community.channelMessages.create({
    channelId: evt.channelId,
    content: responseText,
  });
}

/**
 * Build the response text for a given input. Pure function — no I/O, no
 * SDK calls — so the test driver and unit tests can exercise it without
 * spinning up the chat-event pipeline. The lesson is the subscribe +
 * filter + post wiring above; this is just the response shape.
 */
export function buildResponse(input: string): string {
  return `${RESPONSE_PREFIX} ${input}`;
}
