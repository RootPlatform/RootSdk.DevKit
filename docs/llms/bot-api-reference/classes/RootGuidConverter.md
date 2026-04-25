---
path: bot-api-reference/classes/RootGuidConverter.md
audience: bot
category: reference
summary: Static utility class that provides a subset of `RootGuidUtils` methods. Delegates to `RootGuidUtils` internally.
---

Static utility class that provides a subset of `RootGuidUtils` methods. Delegates to `RootGuidUtils` internally.

## Constructors

### Constructor

> **new RootGuidConverter**(): `RootGuidConverter`

#### Returns

`RootGuidConverter`

## Methods

### parse()

> `static` **parse**<`T`>(`strData`: `string`): `T`

Parses a GUID string and returns its `RootGuidType`.

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` *extends* [`RootGuid`](../type-aliases/RootGuid.md) | [`RootGuid`](../type-aliases/RootGuid.md) |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | A GUID string. |

#### Returns

`T`

The `RootGuidType`.

### toMilliseconds()

> `static` **toMilliseconds**(`strData`: `string`): `number`

Extracts the creation timestamp from a GUID as a Unix millisecond timestamp. Delegates to RootGuidUtils.toMilliseconds().

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | A GUID string. |

#### Returns

`number`

Unix milliseconds (ms since 1970-01-01 UTC).

### toRootGuidType()

> `static` **toRootGuidType**(`strData`: `string`): [`RootGuidType`](../enumerations/RootGuidType.md)

Extracts the `RootGuidType` from a GUID string. Delegates to `RootGuidUtils.toRootGuidType()`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | A GUID string. |

#### Returns

[`RootGuidType`](../enumerations/RootGuidType.md)

The `RootGuidType` of the entity.