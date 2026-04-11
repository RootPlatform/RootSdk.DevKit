---
path: app-api-reference/server/type-aliases/AccessRuleClient.md
audience: app
category: reference
summary: Service client for managing access rules that control permissions for specific roles or members on channels and channel groups.
---

> **AccessRuleClient** = `object`

Service client for managing access rules that control permissions for specific roles or members on channels and channel groups.

Access rules allow fine-grained permission control by overriding the default permissions for specific roles or members on specific channels or channel groups.

Access this client via `rootServer.community.accessRules`.

## Methods

### bulkCreateEditDelete()

> **bulkCreateEditDelete**(`request`: [`AccessRuleBulkCreateEditDeleteRequest`](AccessRuleBulkCreateEditDeleteRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`AccessRuleBulkCreateEditDeleteRequest`](AccessRuleBulkCreateEditDeleteRequest.md) |
| `eventHandlers?` | \{ `channel.created`: [`ChannelCreatedHandler`](ChannelCreatedHandler.md); `channel.deleted`: [`ChannelDeletedHandler`](ChannelDeletedHandler.md); `channel.edited`: [`ChannelEditedHandler`](ChannelEditedHandler.md); `channelGroup.created`: [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); `channelGroup.edited`: [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md); `community.permission.edited`: [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md); \} |
| `eventHandlers.channel.created?` | [`ChannelCreatedHandler`](ChannelCreatedHandler.md) |
| `eventHandlers.channel.deleted?` | [`ChannelDeletedHandler`](ChannelDeletedHandler.md) |
| `eventHandlers.channel.edited?` | [`ChannelEditedHandler`](ChannelEditedHandler.md) |
| `eventHandlers.channelGroup.created?` | [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md) |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) |
| `eventHandlers.channelGroup.edited?` | [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md) |
| `eventHandlers.community.permission.edited?` | [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md) |

#### Returns

`Promise`<`void`>

#### Example

```ts
import {
  ChannelOrChannelGroupGuid,
  RoleOrMemberGuid,
  AccessRuleBulkCreateEditDeleteRequest,
  AccessRuleCreateRequest,
  AccessRuleEditRequest,
  AccessRuleDeleteRequest,
  ChannelOverlayPermission,
  rootServer,
} from "@rootsdk/server-app";

export async function bulkCreateEditDeleteExample(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<void> {
  try {
    // Set up the request
    // 'undefined' values will not modify existing permissions, you can omit them if desired, they're included here for clarity
    const request: AccessRuleBulkCreateEditDeleteRequest = {
      creates: [
        {
          channelOrChannelGroupId: channelOrChannelGroupId,
          roleOrMemberId: roleOrMemberId,
          overlay: {
            channelFullControl: undefined,
            channelView: true,
            channelUseExternalEmoji: undefined,
            channelCreateMessage: true,
            channelDeleteMessageOther: undefined,
            channelManagePinnedMessages: undefined,
            channelViewMessageHistory: undefined,
            channelCreateMessageAttachment: undefined,
            channelCreateMessageMention: undefined,
            channelCreateMessageReaction: undefined,
            channelMakeMessagePublic: undefined,
            channelMoveUserOther: undefined,
            channelVoiceTalk: undefined,
            channelVoiceMuteOther: undefined,
            channelVoiceDeafenOther: undefined,
            channelVoiceKick: undefined,
            channelVideoStreamMedia: undefined,
            channelCreateFile: undefined,
            channelManageFiles: undefined,
            channelViewFile: undefined,
            channelAppKick: undefined,
          },
        },
      ],
      edits: [],
      deletes: [],
    };

    // Call the API
    await rootServer.community.accessRules.bulkCreateEditDelete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### create()

> **create**(`request`: [`AccessRuleCreateRequest`](AccessRuleCreateRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Creates a new access rule for a role or member on a channel or channel group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AccessRuleCreateRequest`](AccessRuleCreateRequest.md) | The access rule configuration including target, subject, and permission overlay. |
| `eventHandlers?` | \{ `channel.created`: [`ChannelCreatedHandler`](ChannelCreatedHandler.md); `channel.deleted`: [`ChannelDeletedHandler`](ChannelDeletedHandler.md); `channel.edited`: [`ChannelEditedHandler`](ChannelEditedHandler.md); `channelGroup.created`: [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); `channelGroup.edited`: [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md); `community.permission.edited`: [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channel.created`, `channel.edited`, `channel.deleted`, `channelGroup.created`, `channelGroup.edited`, `channelGroup.deleted`, `community.permission.edited`. |
| `eventHandlers.channel.created?` | [`ChannelCreatedHandler`](ChannelCreatedHandler.md) | - |
| `eventHandlers.channel.deleted?` | [`ChannelDeletedHandler`](ChannelDeletedHandler.md) | - |
| `eventHandlers.channel.edited?` | [`ChannelEditedHandler`](ChannelEditedHandler.md) | - |
| `eventHandlers.channelGroup.created?` | [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |
| `eventHandlers.channelGroup.edited?` | [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md) | - |
| `eventHandlers.community.permission.edited?` | [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the access rule is created.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, `AlreadyExists` if the rule already exists, or `RequestValidationFailed` if the request is invalid.

#### Example

```ts
import {
  ChannelOrChannelGroupGuid,
  RoleOrMemberGuid,
  AccessRuleCreateRequest,
  ChannelOverlayPermission,
  rootServer,
} from "@rootsdk/server-app";

export async function createExample(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<void> {
  try {
    // Set up the request
    // 'undefined' values will not modify existing permissions, you can omit them if desired, they're included here for clarity
    const request: AccessRuleCreateRequest = {
      channelOrChannelGroupId: channelOrChannelGroupId,
      roleOrMemberId: roleOrMemberId,
      overlay: {
        channelFullControl: undefined,
        channelView: true,
        channelUseExternalEmoji: undefined,
        channelCreateMessage: true,
        channelDeleteMessageOther: undefined,
        channelManagePinnedMessages: undefined,
        channelViewMessageHistory: undefined,
        channelCreateMessageAttachment: undefined,
        channelCreateMessageMention: undefined,
        channelCreateMessageReaction: undefined,
        channelMakeMessagePublic: undefined,
        channelMoveUserOther: undefined,
        channelVoiceTalk: undefined,
        channelVoiceMuteOther: undefined,
        channelVoiceDeafenOther: undefined,
        channelVoiceKick: undefined,
        channelVideoStreamMedia: undefined,
        channelCreateFile: undefined,
        channelManageFiles: undefined,
        channelViewFile: undefined,
        channelAppKick: undefined,
      },
    };

    // Call the API
    await rootServer.community.accessRules.create(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "fullControl": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `fullControl` on the target channel or channel group

### delete()

> **delete**(`request`: [`AccessRuleDeleteRequest`](AccessRuleDeleteRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Deletes an access rule.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AccessRuleDeleteRequest`](AccessRuleDeleteRequest.md) | Identifies the access rule to delete. |
| `eventHandlers?` | \{ `channel.created`: [`ChannelCreatedHandler`](ChannelCreatedHandler.md); `channel.deleted`: [`ChannelDeletedHandler`](ChannelDeletedHandler.md); `channel.edited`: [`ChannelEditedHandler`](ChannelEditedHandler.md); `channelGroup.created`: [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); `channelGroup.edited`: [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md); `community.permission.edited`: [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channel.created`, `channel.edited`, `channel.deleted`, `channelGroup.created`, `channelGroup.edited`, `channelGroup.deleted`, `community.permission.edited`. |
| `eventHandlers.channel.created?` | [`ChannelCreatedHandler`](ChannelCreatedHandler.md) | - |
| `eventHandlers.channel.deleted?` | [`ChannelDeletedHandler`](ChannelDeletedHandler.md) | - |
| `eventHandlers.channel.edited?` | [`ChannelEditedHandler`](ChannelEditedHandler.md) | - |
| `eventHandlers.channelGroup.created?` | [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |
| `eventHandlers.channelGroup.edited?` | [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md) | - |
| `eventHandlers.community.permission.edited?` | [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the deletion completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the access rule does not exist, or `NoPermissionToDelete` if missing required permissions.

#### Example

```ts
import {
  ChannelOrChannelGroupGuid,
  RoleOrMemberGuid,
  AccessRuleDeleteRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function deleteExample(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: AccessRuleDeleteRequest = {
      channelOrChannelGroupId: channelOrChannelGroupId,
      roleOrMemberId: roleOrMemberId,
    };

    // Call the API
    await rootServer.community.accessRules.delete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "fullControl": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `fullControl` on the target channel or channel group

### edit()

> **edit**(`request`: [`AccessRuleEditRequest`](AccessRuleEditRequest.md), `eventHandlers?`: `object`): `Promise`<`void`>

Modifies an existing access rule's permission overlay.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AccessRuleEditRequest`](AccessRuleEditRequest.md) | Identifies the access rule and the new overlay. |
| `eventHandlers?` | \{ `channel.created`: [`ChannelCreatedHandler`](ChannelCreatedHandler.md); `channel.deleted`: [`ChannelDeletedHandler`](ChannelDeletedHandler.md); `channel.edited`: [`ChannelEditedHandler`](ChannelEditedHandler.md); `channelGroup.created`: [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md); `channelGroup.deleted`: [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md); `channelGroup.edited`: [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md); `community.permission.edited`: [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md); \} | Optional handlers for permission update events. Supported event keys: `channel.created`, `channel.edited`, `channel.deleted`, `channelGroup.created`, `channelGroup.edited`, `channelGroup.deleted`, `community.permission.edited`. |
| `eventHandlers.channel.created?` | [`ChannelCreatedHandler`](ChannelCreatedHandler.md) | - |
| `eventHandlers.channel.deleted?` | [`ChannelDeletedHandler`](ChannelDeletedHandler.md) | - |
| `eventHandlers.channel.edited?` | [`ChannelEditedHandler`](ChannelEditedHandler.md) | - |
| `eventHandlers.channelGroup.created?` | [`ChannelGroupCreatedHandler`](ChannelGroupCreatedHandler.md) | - |
| `eventHandlers.channelGroup.deleted?` | [`ChannelGroupDeletedHandler`](ChannelGroupDeletedHandler.md) | - |
| `eventHandlers.channelGroup.edited?` | [`ChannelGroupEditedHandler`](ChannelGroupEditedHandler.md) | - |
| `eventHandlers.community.permission.edited?` | [`CommunityPermissionEditedHandler`](CommunityPermissionEditedHandler.md) | - |

#### Returns

`Promise`<`void`>

A promise that resolves when the edit completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the access rule does not exist, or `NoPermissionToEdit` if missing required permissions.

#### Example

```ts
import {
  ChannelOrChannelGroupGuid,
  RoleOrMemberGuid,
  AccessRuleEditRequest,
  ChannelOverlayPermission,
  rootServer,
} from "@rootsdk/server-app";

export async function editExample(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<void> {
  try {
    // Set up the request
    // 'undefined' values will not modify existing permissions, you can omit them if desired, they're included here for clarity
    const request: AccessRuleEditRequest = {
      channelOrChannelGroupId: channelOrChannelGroupId,
      roleOrMemberId: roleOrMemberId,
      overlay: {
        channelFullControl: undefined,
        channelView: true,
        channelUseExternalEmoji: undefined,
        channelCreateMessage: true,
        channelDeleteMessageOther: undefined,
        channelManagePinnedMessages: undefined,
        channelViewMessageHistory: undefined,
        channelCreateMessageAttachment: undefined,
        channelCreateMessageMention: undefined,
        channelCreateMessageReaction: undefined,
        channelMakeMessagePublic: undefined,
        channelMoveUserOther: undefined,
        channelVoiceTalk: undefined,
        channelVoiceMuteOther: undefined,
        channelVoiceDeafenOther: undefined,
        channelVoiceKick: undefined,
        channelVideoStreamMedia: undefined,
        channelCreateFile: undefined,
        channelManageFiles: undefined,
        channelViewFile: undefined,
        channelAppKick: undefined,
      },
    };

    // Call the API
    await rootServer.community.accessRules.edit(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

#### Authorization

Declare the following permissions in your manifest:

```json
"permissions": {
  "channel": {
    "fullControl": true
  }
}
```

The community must also create channel access rules that give your code any needed visibility but don't deny these permissions via an overlay:

- `fullControl` on the target channel or channel group

### get()

> **get**(`request`: [`AccessRuleGetRequest`](AccessRuleGetRequest.md)): `Promise`<[`AccessRule`](AccessRule.md)>

Retrieves a single access rule.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AccessRuleGetRequest`](AccessRuleGetRequest.md) | Identifies the access rule to retrieve. |

#### Returns

`Promise`<[`AccessRule`](AccessRule.md)>

A promise that resolves to the `AccessRule` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the access rule does not exist, or `NoPermissionToRead` if missing required permissions.

#### Example

```ts
import {
  ChannelOrChannelGroupGuid,
  RoleOrMemberGuid,
  AccessRule,
  AccessRuleGetRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function getExample(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
  roleOrMemberId: RoleOrMemberGuid,
): Promise<AccessRule> {
  try {
    // Set up the request
    const request: AccessRuleGetRequest = {
      channelOrChannelGroupId: channelOrChannelGroupId,
      roleOrMemberId: roleOrMemberId,
    };

    // Call the API
    const accessRule: AccessRule =
      await rootServer.community.accessRules.get(request);

    return accessRule;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listByChannelOrChannelGroup()

> **listByChannelOrChannelGroup**(`request`: [`AccessRuleListByChannelOrChannelGroupRequest`](AccessRuleListByChannelOrChannelGroupRequest.md)): `Promise`<[`AccessRule`](AccessRule.md)[]>

Lists all access rules for a specific channel or channel group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AccessRuleListByChannelOrChannelGroupRequest`](AccessRuleListByChannelOrChannelGroupRequest.md) | Identifies the channel or channel group. |

#### Returns

`Promise`<[`AccessRule`](AccessRule.md)[]>

A promise that resolves to an array of `AccessRule` objects.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the target does not exist, or `NoPermissionToRead` if missing required permissions.

#### Example

```ts
import {
  ChannelOrChannelGroupGuid,
  AccessRule,
  AccessRuleListByChannelOrChannelGroupRequest,
  rootServer,
} from "@rootsdk/server-app";

export async function listByChannelOrChannelGroupExample(
  channelOrChannelGroupId: ChannelOrChannelGroupGuid,
): Promise<AccessRule[]> {
  try {
    // Set up the request
    const request: AccessRuleListByChannelOrChannelGroupRequest = {
      channelOrChannelGroupId: channelOrChannelGroupId,
    };

    // Call the API
    const accessRules: AccessRule[] =
      await rootServer.community.accessRules.listByChannelOrChannelGroup(
        request,
      );

    return accessRules;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### listByRoleOrMember()

> **listByRoleOrMember**(`request`: [`AccessRuleListByRoleOrMemberRequest`](AccessRuleListByRoleOrMemberRequest.md)): `Promise`<[`AccessRule`](AccessRule.md)[]>

Lists all access rules for a specific role or member.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`AccessRuleListByRoleOrMemberRequest`](AccessRuleListByRoleOrMemberRequest.md) | Identifies the role or member. |

#### Returns

`Promise`<[`AccessRule`](AccessRule.md)[]>

A promise that resolves to an array of `AccessRule` objects.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the target does not exist, or `NoPermissionToRead` if missing required permissions.

#### Example

```ts
import {
  RoleOrMemberGuid,
  AccessRuleListByRoleOrMemberRequest,
  AccessRule,
  rootServer,
} from "@rootsdk/server-app";

export async function listByRoleOrMemberExample(
  roleOrMemberId: RoleOrMemberGuid,
): Promise<AccessRule[]> {
  try {
    // Set up the request
    const request: AccessRuleListByRoleOrMemberRequest = {
      roleOrMemberId: roleOrMemberId,
    };

    // Call the API
    const accessRules: AccessRule[] =
      await rootServer.community.accessRules.listByRoleOrMember(request);

    return accessRules;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```