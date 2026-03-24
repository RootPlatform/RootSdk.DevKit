---
path: bot-docs/tutorials/welcome-bot/assign-role.md
audience: bot
category: tutorial
summary: The _Participant_ role appears inside the community as a text string.
---

# Programmatically assign the role

The _Participant_ role appears inside the community as a text string. Behind the scenes, Root assigns each role a unique ID number of type `CommunityRoleGuid`. You'll need the role ID to assign the role to a member.

## 1. Add imports

Update your import statement to the following:

```ts
import {
  rootServer,
  RootApiException,
  MessageType,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  CommunityMemberRoleAddRequest,
  CommunityRole,
  CommunityRoleGuid,
  UserGuid,
} from "@rootsdk/server-bot";
```

## 2. Retrieve the role ID

First, you'll write code to use the role name to retrieve the role ID. Technically, the role name isn't guaranteed to be unique (i.e., the community could have more than one role named _Participant_); here, simply select the first occurrence of _Participant_ in the list.

Complete the implementation of the following function using the comments as a guide:
```ts
async function getRoleId() : Promise<CommunityRoleGuid> {
  const name: string = "Participant";

  const roles : CommunityRole[] = // use rootServer.community.communityRoles.list to get all roles

  const targetRole = // search the roles for the one named "Participant", select the first match

  if (!targetRole) {
    throw new Error(`Role "${name}" not found`);
  }

  return targetRole.id;
}
```

**Show code**

```ts
async function getRoleId() : Promise<CommunityRoleGuid> {
  const name: string = "Participant";

  const roles : CommunityRole[] = await rootServer.community.communityRoles.list();

  const targetRole = roles.find(role => role.name === name);

  if (!targetRole) {
    throw new Error(`Role "${name}" not found`);
  }

  return targetRole.id;
}
```

## 3. Code an assign-role method

Next, use the role ID and the member ID to assign the role. 

Add the following method to your code:

```ts
async function assignRole(userId: UserGuid, roleId: CommunityRoleGuid) : Promise<void> {
  const request: CommunityMemberRoleAddRequest = { communityRoleId: roleId, userIds: [userId] };

  await rootServer.community.communityMemberRoles.add(request);
}
```

## 3. Assign

Finally, in the `onMessage` function, assign the role when the `count` reaches 5.

**Show code**

```ts
if (count == 5) {
  const roleId: CommunityRoleGuid = await getRoleId();

  await assignRole(evt.userId, roleId);
}
```

## 4. Test

1. Build and run your Bot.

1. Use the Root native client to post messages to community channels.

1. After your 5th message, use the Root native client to verify that you now have the _Participant_ role.
	1. Right-click on the overflow icon (three vertical dots) by the community image.
	1. Navigate to the _Community settings_.
	1. Select _Roles_.
	1. Select the _Participant_ role.
	1. Select _Members_.
	1. Verify you are listed as having the role (the checkbox by your name should be checked).

1. If you'd like to do further testing, you can get a clean start by removing the role from your user ID in the Root native client and deleting the database file.