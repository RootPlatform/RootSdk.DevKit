---
path: bot-api-reference/type-aliases/CommunityRoleClient.md
audience: bot
category: reference
summary: Service client for managing roles within a community. Roles define sets of permissions that can be assigned to community members, controlling what...
---

> **CommunityRoleClient** = [`TypedEventEmitter`](TypedEventEmitter.md)<[`CommunityRoleEvents`](CommunityRoleEvents.md)> & `object`

Service client for managing roles within a community. Roles define sets of permissions that can be assigned to community members, controlling what actions they can perform within the community and its channels.

Every community has a default `@everyone` role that cannot be deleted or renamed. Custom roles can be created with specific permission configurations and assigned to members to grant additional capabilities.

Access this client via `rootServer.community.communityRoles`.

## Type Declaration

### create()

> **create**(`request`: [`CommunityRoleCreateRequest`](CommunityRoleCreateRequest.md)): `Promise`<[`CommunityRole`](CommunityRole.md)>

Creates a new role in the community with the specified permissions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleCreateRequest`](CommunityRoleCreateRequest.md) | The role configuration including name, color, and permissions. |

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)>

A promise that resolves to the created `CommunityRole` object.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToCreate` if missing required permissions, or `NoPermissionToAdd` if attempting to grant permissions that your code does not have.

#### Example

```ts
import {
  CommunityRole,
  CommunityRoleCreateRequest,
  CommunityRoleGuid,
  CommunityPermission,
  ChannelPermission,
  rootServer,
} from "@rootsdk/server-bot";

export async function createExample(): Promise<CommunityRole> {
  try {
    // Set up the request
    const request: CommunityRoleCreateRequest = {
      name: "MyCommunityRole",
      colorHex: "#00FF00",
      isMentionable: false,
      communityPermission: {
        communityManageCommunity: false,
        communityManageRoles: false,
        communityManageEmojis: false,
        communityManageAuditLog: false,
        communityCreateInvite: false,
        communityManageInvites: false,
        communityCreateBan: false,
        communityManageBans: false,
        communityFullControl: false,
        communityKick: false,
        communityChangeMyNickname: false,
        communityChangeOtherNickname: false,
        communityCreateChannelGroup: false,
        communityManageApps: false,
      },
      channelPermission: {
        channelFullControl: false,
        channelView: true,
        channelUseExternalEmoji: false,
        channelCreateMessage: true,
        channelDeleteMessageOther: false,
        channelManagePinnedMessages: false,
        channelViewMessageHistory: false,
        channelCreateMessageAttachment: false,
        channelCreateMessageMention: false,
        channelCreateMessageReaction: false,
        channelMakeMessagePublic: false,
        channelMoveUserOther: false,
        channelVoiceTalk: false,
        channelVoiceMuteOther: false,
        channelVoiceDeafenOther: false,
        channelVoiceKick: false,
        channelVideoStreamMedia: false,
        channelCreateFile: false,
        channelManageFiles: false,
        channelViewFile: false,
        channelAppKick: false,
      },
    };

    // Call the API
    const communityRole: CommunityRole =
      await rootServer.community.communityRoles.create(request);

    return communityRole;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### delete()

> **delete**(`request`: [`CommunityRoleDeleteRequest`](CommunityRoleDeleteRequest.md)): `Promise`<`void`>

Removes a role from the community. Members who had this role assigned will lose its permissions. The default `@everyone` role cannot be deleted.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleDeleteRequest`](CommunityRoleDeleteRequest.md) | Identifies the role to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the delete operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, or `NoPermissionToDelete` if missing required permissions or attempting to delete the `@everyone` role.

#### Example

```ts
import {
  CommunityRole,
  CommunityRoleDeleteRequest,
  CommunityRoleGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function deleteExample(
  communityRoleId: CommunityRoleGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: CommunityRoleDeleteRequest = {
      id: communityRoleId,
    };

    // Call the API
    await rootServer.community.communityRoles.delete(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### edit()

> **edit**(`request`: [`CommunityRoleEditRequest`](CommunityRoleEditRequest.md)): `Promise`<[`CommunityRole`](CommunityRole.md)>

Modifies an existing role's properties, including name, color, and permissions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleEditRequest`](CommunityRoleEditRequest.md) | The role ID and updated properties. |

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)>

A promise that resolves to the updated `CommunityRole` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, `NoPermissionToEdit` if missing required permissions, or `NoPermissionToAdd` if attempting to grant permissions that your code does not have.

#### Example

```ts
import {
  CommunityRole,
  CommunityRoleEditRequest,
  CommunityRoleGuid,
  CommunityPermission,
  ChannelPermission,
  rootServer,
} from "@rootsdk/server-bot";

export async function editExample(
  communityRoleId: CommunityRoleGuid,
): Promise<CommunityRole> {
  try {
    // Set up the request
    const request: CommunityRoleEditRequest = {
      id: communityRoleId,
      name: "MyCommunityRole",
      colorHex: "#00FF00",
      isMentionable: false,
      communityPermission: {
        communityManageCommunity: false,
        communityManageRoles: false,
        communityManageEmojis: false,
        communityManageAuditLog: false,
        communityCreateInvite: false,
        communityManageInvites: false,
        communityCreateBan: false,
        communityManageBans: false,
        communityFullControl: false,
        communityKick: false,
        communityChangeMyNickname: false,
        communityChangeOtherNickname: false,
        communityCreateChannelGroup: false,
        communityManageApps: false,
      },
      channelPermission: {
        channelFullControl: false,
        channelView: true,
        channelUseExternalEmoji: false,
        channelCreateMessage: true,
        channelDeleteMessageOther: false,
        channelManagePinnedMessages: false,
        channelViewMessageHistory: true,
        channelCreateMessageAttachment: false,
        channelCreateMessageMention: false,
        channelCreateMessageReaction: false,
        channelMakeMessagePublic: false,
        channelMoveUserOther: false,
        channelVoiceTalk: false,
        channelVoiceMuteOther: false,
        channelVoiceDeafenOther: false,
        channelVoiceKick: false,
        channelVideoStreamMedia: false,
        channelCreateFile: false,
        channelManageFiles: false,
        channelViewFile: false,
        channelAppKick: false,
      },
    };

    // Call the API
    const communityRole: CommunityRole =
      await rootServer.community.communityRoles.edit(request);

    return communityRole;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### get()

> **get**(`request`: [`CommunityRoleGetRequest`](CommunityRoleGetRequest.md)): `Promise`<[`CommunityRole`](CommunityRole.md)>

Retrieves a single role by its ID.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleGetRequest`](CommunityRoleGetRequest.md) | Identifies the role to retrieve. |

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)>

A promise that resolves to the `CommunityRole` object.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role does not exist, or `NoPermissionToRead` if the caller is not a member of the community.

#### Example

```ts
import {
  CommunityRole,
  CommunityRoleGetRequest,
  CommunityRoleGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function getExample(
  communityRoleId: CommunityRoleGuid,
): Promise<CommunityRole> {
  try {
    // Set up the request
    const request: CommunityRoleGetRequest = {
      id: communityRoleId,
    };

    // Call the API
    const communityRole: CommunityRole =
      await rootServer.community.communityRoles.get(request);

    return communityRole;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### list()

> **list**(): `Promise`<[`CommunityRole`](CommunityRole.md)[]>

Lists all roles in the community, including the default `@everyone` role. Roles are returned sorted by display position.

#### Returns

`Promise`<[`CommunityRole`](CommunityRole.md)[]>

A promise that resolves to an array of `CommunityRole` objects.

#### Throws

`RootApiException` with `errorCode` set to `NoPermissionToRead` if the caller is not a member of the community.

To identify the `@everyone` role, compare against `WellKnownRootGuids.CommunityRoles.EveryoneRole`.

#### Example

```ts
import {
  CommunityRole,
  CommunityRoleGuid,
  rootServer,
} from "@rootsdk/server-bot";

export async function listExample(): Promise<CommunityRole[]> {
  try {
    // Call the API
    const communityRoles: CommunityRole[] =
      await rootServer.community.communityRoles.list();

    return communityRoles;
  } catch (error) {
    // Detect error
    throw error;
  }
}
```

### move()

> **move**(`request`: [`CommunityRoleMoveRequest`](CommunityRoleMoveRequest.md)): `Promise`<`void`>

Changes a role's display position in the role list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `request` | [`CommunityRoleMoveRequest`](CommunityRoleMoveRequest.md) | The role ID and target position. |

#### Returns

`Promise`<`void`>

A promise that resolves when the move operation completes.

#### Throws

`RootApiException` with `errorCode` set to `NotFound` if the role or target position role does not exist, or `NoPermissionToEdit` if missing required permissions.

#### Example

```ts
import {
  CommunityRoleGuid,
  CommunityRoleMoveRequest,
  rootServer,
} from "@rootsdk/server-bot";

export async function moveExample(
  communityRoleId: CommunityRoleGuid,
  beforeCommunityRoleId?: CommunityRoleGuid,
): Promise<void> {
  try {
    // Set up the request
    const request: CommunityRoleMoveRequest = {
      id: communityRoleId,
      beforeCommunityRoleId: beforeCommunityRoleId,
    };

    // Call the API
    await rootServer.community.communityRoles.move(request);
  } catch (error) {
    // Detect error
    throw error;
  }
}
```