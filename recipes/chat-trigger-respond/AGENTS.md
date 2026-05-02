---
kind: recipe
category: chat
question: How do I make my app respond to user chat messages?
composes:
  - server-messages
exemplified_by: leveling-leaderboard
---

# Recipe: Chat Trigger + Respond

> *"How do I make my app respond to user chat messages?"*

The smallest recipe shape we ship. Subscribes to `ChannelMessageCreated`, filters for a slash-command prefix, posts a reply in the same channel. Server-only — no UI, no proto, no SQLite, no settings, no admin gate. Foundational pattern for any "do X when user says Y" feature.

## TL;DR

```
user types  /ping hello   ───►  ChannelMessageCreated event
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  ping-handler.ts │
                              │   filter prefix  │
                              │   parse arg      │
                              │   build response │
                              │   post reply     │
                              └────────┬─────────┘
                                       ▼
recipe posts  pong: hello   ───►  visible in channel
```

## What this recipe is

The minimum viable Root server-side feature. Three things matter:

1. **Subscribe**: `rootServer.community.channelMessages.on(ChannelMessageEvent.ChannelMessageCreated, …)` runs your handler for every chat message in every channel.
2. **Filter**: skip system messages, your app's own posts (loop prevention), and messages that don't match your trigger.
3. **Respond**: `channelMessages.create({ channelId, content })` posts in the same channel.

## Composes

| api-sample | What it teaches | What this recipe uses it for |
|---|---|---|
| [`api-samples/server-messages`](../../api-samples/server-messages) | Subscribing to message events + posting messages | The whole recipe is this one mechanic in isolation |

That's it. This recipe is intentionally minimal — it composes nothing else, demonstrates the chat-event subscription pipeline by itself, and gives later recipes (rate limits, channel filters, role-gated triggers) something to build on.

## Walkthrough

### 1. Manifest

[`root-manifest.json`](root-manifest.json) is the smallest manifest in DevKit:

- No `package.client` block — this recipe ships no client.
- No `settings` block — nothing for an admin to configure.
- One permission: `channel.createMessage` — required to post the response.

### 2. The handler

[`server/src/ping-handler.ts`](server/src/ping-handler.ts) is the recipe. The filter chain is the part to read carefully:

```typescript
async function onChannelMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;          // filter system msgs
  const content = evt.messageContent?.trim() ?? "";
  if (!content.startsWith(COMMAND_PREFIX)) return;             // filter non-triggers

  const arg = content.slice(COMMAND_PREFIX.length).replace(/^\s+/, "");
  const responseText = buildResponse(arg);

  await rootServer.community.channelMessages.create({
    channelId: evt.channelId,
    content: responseText,
  });
}
```

Two filters, in order from cheapest to most specific:

- **System messages** are platform-generated (joins, role changes, etc.); they have no user content to react to.
- **Trigger prefix** is the cheapest content check; runs for every message in every channel, so it has to be fast.

`buildResponse` is a pure function — no I/O, no SDK calls — easy to unit-test in isolation if you want.

### Loop prevention

This recipe's loop prevention is **incidental**: the bot's `pong: …` posts don't start with `/ping`, so Filter 2 drops them. That's enough as long as the response prefix differs from the trigger prefix.

A recipe whose response shares its trigger prefix (e.g., a `/echo` command that posts `/echo: …`) would loop forever with this filter chain. The production pattern is an **author-id check** — compare `evt.authorMemberId` against the bot's own member id and bail when they match. That's the durable solution; the prefix-mismatch shortcut here is a happy accident of how the response is shaped.

A future recipe will demonstrate the author-id pattern explicitly. For now, when forking this one, audit your response shape: if your reply could trigger your own filter, add an author-id check before relying on prefix differences.

### 3. Wiring

[`server/src/main.ts`](server/src/main.ts) is two lines of substance: call `initializePingHandler()` from inside `lifecycle.start()`. The recipe ships **no test driver** — see "How this recipe is tested" below.

## Does NOT cover

| Concern | Lives in |
|---|---|
| Per-channel filtering (which channels can use the trigger?) | Future `excluded-channels-filter` recipe |
| Per-user rate limiting (only every N seconds per user) | Future `per-user-cooldown` recipe |
| Auth gating (only admins can use the trigger) | Compose with [`ui-feature-by-role`](../ui-feature-by-role)'s server-side role check |
| Multi-word command parsing (subcommands, flags) | Independent concern; replace `buildResponse(arg)` with a richer parser |
| State (counters, history of prior triggers) | Compose with [`app-settings-flat-values`](../app-settings-flat-values) (KV) or [`data-paginated-list`](../data-paginated-list) (SQLite) |
| Mentions / replies (responding inside a thread) | Independent concern; pass `parentMessageIds` to `channelMessages.create` |
| Cross-channel responses | Independent concern; the recipe responds in the originating channel |

## How this recipe is tested

Unlike the prior recipes, this one ships **no test driver**. The harness exercises the full subscribe → filter → post pipeline directly:

1. The harness posts `/ping hello world` to the test channel using its **platform connection** — the message's author is the community owner, not the bot.
2. The bot's `ping-handler` subscribes to `ChannelMessageCreated` and sees the harness's post as a regular user message (no loop-prevention concerns — the bot is not the author).
3. The handler runs its filters, builds the response, and posts `pong: hello world` to the same channel.
4. The harness reads the channel after baseline and asserts a reply matching `pong: hello world` appears.

The harness's `ChatStep` (in `Code/Ops.Testing/test-devkit/test-recipes/src/types.ts`) drives this: `postMessage: "/ping hello world"`, `expectedReply: { contains: "pong: hello world" }`. No service, no method, no test driver — the recipe is fully production-shaped.

A bot can't easily test its own chat trigger by posting from inside its own server, because depending on platform behavior the bot may not see its own messages echoed back. Routing the test post through the harness owner sidesteps that question entirely.

