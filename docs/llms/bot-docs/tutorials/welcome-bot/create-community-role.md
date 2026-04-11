---
path: bot-docs/tutorials/welcome-bot/create-community-role.md
audience: bot
category: tutorial
summary: Recall that this Bot is a simplified version of typical community management software.
---

# Create a new role in your community

Recall that this Bot is a simplified version of typical community management software. The key task we're automating here is the new-member transition from probationary to participant.

In this section, you'll create the _Participant_ role in your community.

## 1. Open the community

1. Open the Root native client.
1. Log in if needed.
1. Open the community associated with your `DEV_TOKEN`.

## 2. Create the role

1. Right-click on the overflow icon (three vertical dots) by the community image.
1. Navigate to the _Community settings_.
1. Select _Roles_.
1. Select _Create Role_.
1. Enter `Participant` as the role name.
1. Select _Save changes_.

## 3. Uplevel the EVERYONE role

Your Bot will automatically get the _EVERYONE_ role and run with only the permissions available to that role. Unfortunately, that role doesn't have sufficient permissions to assign powerful roles. Eventually, Root will support assigning permissions to Bots to avoid this issue. In the meantime, we'll simply give the needed permission to the role the Bot does have.

1. Right-click on the overflow icon (three vertical dots) by the community image.
1. Navigate to the _Community settings_.
1. Select _Roles_.
1. Select _EVERYONE_.
1. Select _Permissions_.
1. Enable the _Community Full Control_ permission.
1. Select _Save changes_.