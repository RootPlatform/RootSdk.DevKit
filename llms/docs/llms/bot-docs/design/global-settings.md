---
path: bot-docs/design/global-settings.md
audience: bot
category: guide
summary: _Global Settings_ let community members with the `Manage Apps` permission configure how your code behaves—either during installation or later.
---

# Choose your Global Settings

_Global Settings_ let community members with the `Manage Apps` permission configure how your code behaves—either during installation or later. The settings apply to everyone in the community.

> **Note:** This feature is a work in progress.
By the end of this article, you’ll be able to:

* **Identify** which settings your code needs.
* **Explain** how those settings reach your server.

## What are Global Settings?

Global Settings are options that community members with the `Manage Apps` permission use to control how your code runs. They're analogous to configuring cloud-hosted software in that they apply to the entire community and not an individual:

- ❌ **Local**: If you install software on your laptop or phone, you might pick a font size or theme. Those settings affect only you. This is not what we're talking about here.
- ✅ **Cloud**: If you're an admin setting up cloud software for a team, your choices affect everyone. Root’s Global Settings work the same way.

Global Settings can be basic types like numbers or strings, or Root-specific types like channels, roles, or members.

### Example: Channel announcements

Suppose your code supports sending announcements to a community channel. For example, maybe your app posts reminders about events, or it shares updates when it completes a task. You’d give admins control with two Global Settings:

- **Enable announcements** – a checkbox to turn announcements on or off.
- **Announcement channel** – a channel picker where admins choose where posts go.

### Example: Role assignment

Let’s say your code monitors new members and gives them a role after they post a certain number of messages. You could support that with two Global Settings:

- **Message threshold** – how many messages a member must post before getting the role.
- **Assigned role** – the role your code will apply when the threshold is met.

## How do Global Settings work?

You handle some parts. Root handles the rest.

**Your job:**

- List your settings in your manifest file  
- At runtime, load the values in your server code and listen for changes from the community

**Root’s job:**

- Build the UI for your settings  
- Show that UI during and after installation  
- Store the admin’s choices  
- Deliver the values to your server  
- Notify you when settings change

## What data types can I use?

You can use both standard and Root-specific types:

| Setting type            | What you get                                |
|-------------------------|----------------------------------------------|
| Text                    | A string                                     |
| Number                  | A number                                     |
| Checkbox                | A boolean                                    |
| Member Picker           | A list of member IDs                         |
| Role Picker             | A list of role IDs                           |
| Role and Member Picker  | A mix of member and role IDs                 |
| Channel Picker          | A channel ID                                 |
| Channel Group Picker    | A channel group ID                           |
| Select                  | One or more string values from your list     |
| Timestamp Picker        | A timestamp                                  |
| Time Picker             | A time value                                 |
| Date Picker             | A date value                                 |
| Color Picker            | A hex color code                             |
| Button                  | Raises an event on your server—no value sent |

## Who can change Global Setting values?

Community members need the `Manage Apps` permission to configure their community's settings.

## Conclusion

Global Settings give communities a way to customize how your code behaves without changing your code. You define what can be configured. Root takes care of the UI, stores the settings, and keeps your server up to date.