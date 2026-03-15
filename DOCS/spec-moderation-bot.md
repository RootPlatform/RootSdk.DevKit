# Moderation Bot

## Prompt

Build a Root bot that automatically moderates messages containing banned words, tracks violations per user, and escalates punishment after repeated offenses. The bot monitors all messages in the community. When a message contains a banned word, the bot deletes the message, posts a warning that mentions the offending user, and records the violation. After three violations, the bot assigns a "muted" role to the user.

1. The bot listens for new messages in all channels it can see.
2. When a message contains any word from a configurable banned-word list (case-insensitive match), the bot:
   a. Deletes the offending message.
   b. Posts a warning message in the same channel, mentioning the user by their current display name (e.g., "@Alice, that word is not allowed. Strike 2 of 3.").
   c. Increments the user's strike count in a persistent key-value store.
3. When a user's strike count reaches 3, the bot assigns a "muted" role to that user and posts a notification (e.g., "@Alice has been muted after 3 violations.").
4. The bot ignores system messages and its own messages.
5. The banned-word list is `red`, `blue`, `green` (hardcoded in the bot's source code).
6. The bot handles errors gracefully — missing permissions, KV store failures, rate limits.
7. Put the generated code in C:\Root\Code\Test\moderation-bot.

CRITICAL: only use C:\Root\Code\RootSdk.DevKit for context.

---

## Evaluation

### Acceptance Criteria

- A user posts a message containing a banned word.
- The message is deleted within 5 seconds.
- A warning message appears in the same channel, mentioning the user with correct display name and current strike count.
- The strike count persists across bot restarts (stored in KV store, not in-memory).
- After the third violation, the user is assigned the "muted" role.
- A mute notification is posted mentioning the user.
- Messages without banned words are not affected.
- If the bot lacks delete or role-assignment permissions, errors are logged (not thrown).

### Test Environment

- One channel group with one text channel ("general").
- One community role ("Muted") that the bot can assign.
- One test user who posts messages.
- The bot has permission to read/delete messages, mention users, assign roles, and use the key-value store.
