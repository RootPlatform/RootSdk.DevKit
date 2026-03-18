# Ticket Bot

## Prompt

Build a Root bot that manages a support ticket system using private channels. When a member sends a `/ticket` command, the bot creates a new private channel for that ticket and restricts access to the requesting member. When a member sends `/close` in a ticket channel, the bot posts a summary of the conversation and deletes the channel.

1. The bot listens for messages in all channels it can see.
2. When a user sends `/ticket` (with an optional description), the bot:
   a. Creates a new text channel named with a ticket number or slug (e.g., "ticket-0001" or "ticket-alice").
   b. Sets access rules so that only the requesting user (and the bot) can see the channel.
   c. Posts an opening message in the new channel confirming the ticket is open, mentioning the requesting user.
3. When a user sends `/close` in a ticket channel, the bot:
   a. Posts a closing summary to a channel named "summary" (e.g., number of messages exchanged, who participated).
   b. Deletes the ticket channel.
4. The bot ignores `/close` in non-ticket channels.
5. The bot ignores system messages and its own messages.
6. The bot handles errors gracefully — channel creation failures, missing permissions, rate limits.
7. Put the generated code in C:\Root\Code\Test\ticket-bot.

Use ONLY C:\Root\Code\RootSdk.DevKit for context. Do NOT read files outside that directory. If the DevKit does not contain enough information to implement a requirement, do NOT guess or look elsewhere — instead, report it as a gap.

After generating the code, write a **DevKit Gap Report** listing every point where the DevKit content was insufficient. For each gap, include:
- What you needed to know.
- What you looked for in the DevKit and where.
- How you worked around it (assumption, omission, or placeholder).

If there are no gaps, say so explicitly.

---

## Evaluation

### Acceptance Criteria

- A user sends `/ticket Need help with billing` in a general channel.
- Within 5 seconds, a new channel is created with a ticket-style name.
- The new channel is only visible to the requesting user and the bot.
- An opening message appears in the ticket channel mentioning the user.
- The user sends a few messages in the ticket channel.
- The user sends `/close` in the ticket channel.
- A closing summary is posted in the "summary" channel showing the conversation stats.
- The ticket channel is deleted.
- Sending `/close` in a non-ticket channel does nothing.
- If the bot lacks channel-management permissions, errors are logged (not thrown).

### Test Environment

- One channel group for general chat with two text channels ("support", "summary").
- One channel group for tickets (or the bot creates channels in the existing group).
- One test user who opens and closes a ticket.
- The bot has permission to create/delete channels, manage access rules, read/send messages, and mention users.
