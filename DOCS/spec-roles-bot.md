# Roles Bot

## Prompt

Build a Root bot that lets community members self-assign roles by reacting to a role-picker message. On startup, the bot posts a message listing available roles and their corresponding emoji. When a member reacts with one of those emoji, the bot assigns the associated role. When a member removes their reaction, the bot removes the role.

1. The bot posts a role-picker message to a designated channel on startup (or when commanded). The message lists each role and its emoji.
2. When a member adds a reaction matching a configured emoji, the bot assigns the corresponding role to that member.
3. When a member removes a reaction matching a configured emoji, the bot removes the corresponding role from that member.
4. The bot does not respond to reactions on other messages — it only responds on its own role-picker message.
5. The bot does not respond to its own reactions.
6. The role-to-emoji mapping is: 📢 → "Announcements", 📅 → "Events" (hardcoded in the bot's source code).
7. The bot handles errors gracefully — unknown roles, missing permissions, rate limits.
8. Put the generated code in C:\Root\Code\Test\roles-bot.

CRITICAL: only use C:\Root\Code\RootSdk.DevKit for context.

---

## Evaluation

### Acceptance Criteria

- The bot posts a role-picker message listing at least two roles with distinct emoji.
- A user reacts with one of the listed emoji.
- Within 5 seconds, the user has the corresponding role assigned.
- The user removes the reaction.
- Within 5 seconds, the role is removed from the user.
- Reacting with an emoji not in the mapping does nothing.
- Reacting on a different message does nothing.
- If the bot lacks role-assignment permissions, the error is logged (not thrown).

### Test Environment

- One channel group with one text channel ("role-picker").
- Two community roles ("Announcements", "Events") that the bot can assign.
- One test user who reacts to the role-picker message.
- The bot has permission to read messages, manage reactions, and assign roles.
