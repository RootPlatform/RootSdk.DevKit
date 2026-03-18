# Recap Bot

## Prompt

Build a Root bot that posts a daily summary of community activity to a designated channel. On a recurring schedule, the bot reviews recent message activity across monitored channels, compiles a digest of activity stats, and posts the summary. The digest includes message counts per channel and top contributors by display name.

1. The bot runs a scheduled job at a configured interval (e.g., daily). It also responds to `/recap` to trigger the digest immediately.
2. When the job fires (or `/recap` is received), the bot:
   a. Queries recent messages (since the last digest) from monitored channels.
   b. Counts total messages per channel.
   c. Identifies the top 3 contributors by message count.
   d. Resolves each contributor's current display name (not user ID).
   e. Posts a formatted digest to a designated digest channel.
3. The digest message includes:
   - The time period covered.
   - Per-channel message counts.
   - Top contributors with display names and message counts.
4. If there is no activity since the last digest, the bot either posts "No activity" or skips posting (either is acceptable).
5. The bot ignores its own messages when counting activity.
6. The bot handles errors gracefully — empty channels, deleted channels, rate limits.
7. Put the generated code in C:\Root\Code\Test\recap-bot.

Use ONLY C:\Root\Code\RootSdk.DevKit for context. Do NOT read files outside that directory. If the DevKit does not contain enough information to implement a requirement, do NOT guess or look elsewhere — instead, report it as a gap.

After generating the code, write a **DevKit Gap Report** listing every point where the DevKit content was insufficient. For each gap, include:
- What you needed to know.
- What you looked for in the DevKit and where.
- How you worked around it (assumption, omission, or placeholder).

If there are no gaps, say so explicitly.

---

## Evaluation

### Acceptance Criteria

- A user sends `/recap` and the digest is posted immediately.
- The bot's scheduled job is registered (verified via code inspection).
- A digest message appears in the digest channel.
- The digest accurately reports message counts for each monitored channel.
- Contributors are listed by their current display name, not user ID.
- The time period in the digest matches the actual window queried.
- If no messages were posted since the last digest, the bot handles it gracefully.
- If the bot lacks permission to read a monitored channel, it skips that channel and logs the error (does not crash).

### Test Environment

- Two channel groups: one for monitored channels ("general", "random") and one for the digest channel ("digest").
- Two test users who post messages in the monitored channels before the digest fires.
- The bot has permission to read messages in all monitored channels, send messages to the digest channel, list members, and use the job scheduler.
