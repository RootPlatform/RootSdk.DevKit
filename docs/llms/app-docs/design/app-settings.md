---
path: app-docs/design/app-settings.md
audience: app
category: guide
summary: Decide what your app lets people configure, who can change each thing, and where each value lives.
---

# Choose your settings

Decide what your app lets people configure, who can change each thing, and where each value lives. Most non-trivial apps spread settings across three surfaces: the platform's Global Settings, an App settings page you build inside your app, and per-user settings each member configures for themselves.

By the end of this article, you'll be able to:

* **Identify** which settings your app needs
* **Decide** who can edit each one
* **Choose** where each setting is stored

## Three surfaces for settings

Apps configure themselves through three surfaces:

- **Global Settings**: options you declare in your [manifest file](../configure/manifest-global-settings.md). Root builds the UI, shows it during install and again on the platform's app-settings page, stores the values, and delivers them to your server. Only community members with the `Manage Apps` permission can change Global Settings.
- **An App settings page**: a screen inside your app, built with your own UI. You design the form, you write the validation, you decide who can use it (typically the delegated app-admins described below), and you choose how the values are stored.
- **Per-user settings**: values each member sets for themselves: notification opt-ins, display modes, reminder times. The UI lives near the feature it controls, not on the App settings page. Every authenticated member reads and writes their own row, keyed by the their user ID. When a member leaves the community, their settings should go too. Subscribe to the community-leave event and prune the row.

The three surfaces are complementary, not competing. Global Settings handle install-time and platform-native choices. The App settings page handles ongoing community-wide configuration. Per-user settings handle anything that affects only one member.

### Example: a community leveling system

Suppose your app gives members a role after they've posted a certain number of messages, a simple leveling system. A community installing it will need to configure several things, split across the three surfaces:

#### Global Settings (set once at install)

- **The role to assign**: picked from the community's existing roles.
- **The app-admins who run leveling day-to-day**: a `role or member` picker, used for the delegation pattern described below.

#### App settings page (tuned over time by the delegated admins)

- **The message threshold**: how many messages before the role is granted. The team will want to tune this as the community grows.
- **Excluded channels**: channels whose messages shouldn't count toward the threshold. The list grows and shrinks.

#### Per-user settings (each member, for themselves)

- **Announce when I level up**: a per-member opt-in for an in-app or channel message on level change.
- **Show me on the leaderboard**: a per-member opt-out for members who want to participate without being publicly ranked.

That's the canonical split: install-time picker-driven choices on the platform's surface, ongoing custom-UI configuration on yours, and per-member toggles surfaced where the member uses the app.

## Delegate configuration to people without `Manage Apps`

Installing an app and editing its Global Settings both require the `Manage Apps` community permission. In most communities only a small circle holds it, often just the owner and a couple of trusted members. If your app is configurable only through Global Settings, those few people are the only ones who can ever tune it.

That's fine for one-time install choices. It's painful for anything edited day-to-day, the team running a community is usually larger than the team holding `Manage Apps`.

The standard pattern is to **delegate**:

1. Declare a Global Setting that is a `role or member` picker: name it something like "admins" or "managers".
2. At install, the community owner fills it with the roles or members who should run your settings page.
3. Your settings page reads the picker on every privileged action and only allows edits from members it names.

The result is a clean split of authority:

- **`Manage Apps` holders** decide *who* gets the power. They make that decision once, at install, by filling the picker.
- **Delegated members** exercise the power. They edit your app's settings via your settings page. They do **not** need `Manage Apps` themselves.

The community owner is always implicitly elevated, regardless of what the picker says: that's a defense-in-depth guarantee, so a misconfigured picker can't lock the owner out of their own community.

## Choose what each setting is for

Use **Global Settings** when:

- The choice is made once, at install, and rarely changes after.
- The value is a Root entity (a channel, a role, a member) that benefits from the platform's native picker UI.
- The setting names *who* can manage your app (the delegation pattern above).
- A community admin would expect to find it on the platform's app-settings page.

Use an **App settings page** when:

- The configuration is part of the day-to-day operation of your app, edited often by people who aren't `Manage Apps` holders.
- The form needs custom layout, validation, conditional fields, or a multi-step flow that the platform's settings UI isn't designed for.
- The data is a collection (many rows, per-row add and remove) rather than a fixed handful of fields.
- The data is keyed by another entity, like per-channel rules or per-thread overrides.

Use **per-user settings** when:

- The value affects only one member's experience, not the community.
- Each member should be able to set it for themselves, without needing to be an admin.
- The UI belongs near the feature, not buried in an admin form.

## Choose where each setting is stored

Global Settings have one storage path: Root stores them, and you read them through the SDK.

For data your app manages itself, four shapes cover almost everything, and each maps cleanly onto one of the SDK's data stores:

| Shape | Example | Storage |
|---|---|---|
| Flat primitives: a small fixed record edited as one unit | welcome message, max items, "show timestamps" toggle | Key-value store |
| List of items: a collection with per-row add and remove | blocked terms, allowed domains | SQLite, one row per item |
| Per-context overrides: multi-field config keyed by another entity | per-channel rules, per-thread mode | SQLite, the entity id as the primary key |
| Per-user settings: values each user sets for themselves | notification opt-ins, display mode, reminder time | SQLite, user ID as the primary key (or KV with a per-user key) |

Match the storage to the shape:

- **Flat record → KV.** Small, bounded, edited as one unit. KV's atomic update handles partial-merge naturally.
- **List → SQLite.** Per-row identity, idempotent inserts, indexed sort. Each row is its own record.
- **Per-context → SQLite, keyed by the entity.** The platform's channel id (or thread id, or whatever the override scopes to) is the natural primary key. Adding or replacing a row's config is a single upsert.
- **Per-user → SQLite, keyed by the user.** Same shape as per-context, with the caller's user ID as the primary key. KV with a per-user key works for tiny records (one boolean, one timestamp).

## Who can edit what, at a glance

| Setting type | Required to edit |
|---|---|
| Global Settings | The `Manage Apps` community permission |
| App settings page | Whoever your code says, typically the roles or members named by a `role or member` Global Setting |
| Per-user settings | Authenticated members, each writing only their own row |

Always enforce the in-app gate **on the server**, on every privileged call. The UI can hide buttons from non-admins for clarity, but the server-side check is the actual security boundary: a member's role can change between two clicks, and a stale UI flag must never be the only thing protecting a write.