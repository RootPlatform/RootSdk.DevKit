---
path: bot-api-reference/type-aliases/AccessRuleClient.md
audience: bot
category: reference
summary: Service client for managing access rules that control permissions for specific roles or members on channels and channel groups.
---

> **Worked sample**: `api-samples/server-access-rules/` — Access Rules

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

