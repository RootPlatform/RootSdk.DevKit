---
path: app-docs/design/global-settings.md
audience: app
category: guide
summary: _Global Settings_ let community members with the `Manage Apps` permission configure how your code behaves, either during installation or later.
---

# Choose your Global Settings

_Global Settings_ let community members with the `Manage Apps` permission configure how your code behaves, either during installation or later. The settings apply to everyone in the community.

> **Note:** This feature is a work in progress.
By the end of this article, you'll be able to:

* **Identify** which settings your code needs.
* **Explain** how those settings reach your server.

## What are Global Settings?

Global Settings are options that community members with the `Manage Apps` permission use to control how your code runs. They're analogous to configuring cloud-hosted software in that they apply to the entire community and not an individual:

- ❌ **Local**: If you install software on your laptop or phone, you might pick a font size or theme. Those settings affect only you. This is not what we're talking about here.
- ✅ **Cloud**: If you're an admin setting up cloud software for a team, your choices affect everyone. Root's Global Settings work the same way.

### Example: Channel announcements

Suppose your code supports sending announcements to a community channel. For example, maybe your code posts reminders about events, or it shares updates when it completes a task. You'd give admins control with two Global Settings:

- **Enable announcements** -- a checkbox to turn announcements on or off.
- **Announcement channel** -- a channel picker where admins choose where posts go.

### Example: Role assignment

Let's say your code monitors new members and gives them a role after they post a certain number of messages. You could support that with two Global Settings:

- **Message threshold** -- how many messages a member must post before getting the role.
- **Assigned role** -- the role your code will apply when the threshold is met.

## How do Global Settings work?

You handle some parts. Root handles the rest.

**Your job:**

- List your settings in your [manifest file](../configure/manifest-global-settings.md)
- At runtime, load the values in your server code and listen for changes from the community

**Root's job:**

- Build the UI for your settings
- Show that UI during and after installation
- Store the admin's choices
- Deliver the values to your server
- Notify you when settings change

## What data types can I use?

Global Settings support both standard types (text, number, checkbox) and Root-specific types (channels, roles, members). Each type determines what UI the admin sees and what value your server receives.

For the full list of types and how to declare them, see [Manifest settings](../configure/manifest-global-settings.md).

## Who can change Global Setting values?

Community members need the `Manage Apps` permission to configure their community's settings.