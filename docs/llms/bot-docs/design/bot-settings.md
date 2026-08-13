---
path: bot-docs/design/bot-settings.md
audience: bot
category: guide
summary: Decide what your bot lets a community configure and who can configure it.
---

# Choose your settings

Decide what your bot lets a community configure and who can configure it.

By the end of this article, you'll be able to:

* **Identify** which settings your bot needs
* **Recognize** when a configuration need is too granular for a bot to handle

## What are Global Settings?

Global Settings are options community members configure to control how your code runs. You declare them in your manifest. Root builds the UI, shows it during install and on the platform's app-settings page afterward, stores the values, and delivers them to your server. Only members with the `Manage Apps` permission can change them.

For declaration syntax, supported data types, and per-type client UI status, see [Manifest settings](../configure/manifest-global-settings.md).

## Bots have one settings surface

Bots configure exclusively through Global Settings: they have no UI of their own, so there's no second place for configuration to live. (Apps can add a custom in-app settings page.)

This has two consequences for how you design your bot:

- **Every configurable value belongs in your manifest.** If the community needs to change it, declare it as a Global Setting. There's no second surface to fall back on.
- **Every configurable value is `Manage Apps`-gated.** Only members with the `Manage Apps` permission can change Global Settings, and bots have no way to delegate that power to a wider group. Settings work well for choices made once or rarely, less well for values the broader community team will want to tune day-to-day.

If you find yourself wanting fine-grained, frequently-edited configuration (long lists, per-channel overrides, custom forms, or delegation to people without `Manage Apps`) that's a signal your idea fits an app better than a bot. Apps can build their own settings UI and delegate configuration to whichever members the community chooses.

## Example: role assignment

Suppose your bot monitors new members and gives them a role after they post a certain number of messages. You'd declare two Global Settings:

- **Message threshold**: how many messages a member must post before getting the role.
- **Assigned role**: the role your bot applies when the threshold is met.

Both are good fits: a one-time numeric choice, and a picker for a Root entity. Both are the kind of thing a `Manage Apps` holder sets at install and rarely revisits.

## Per-user settings

Bots can store per-user data (a member's reminder time, an opt-in flag, a personal goal). Storage is the same as any bot state: SQLite keyed by user ID, or KV with a per-user key. The thing a bot can't do is expose a form to edit that data. Global Settings configure the whole community, not one person at a time.

To capture per-user input, work with signals a bot can already observe: a slash command that records the member's choice, a reaction on a posted message, or behavior the bot can infer from what the member already does (active channels, posting times). The user ID arrives with each event from the platform; use that as your row key.

If your bot needs richer per-user input (a multi-field form, a list the member edits over time, conditional fields), that's another signal the idea fits an app better. Apps can render a per-user settings UI.