---
path: app-api-reference/server/classes/RootGuidConverter.md
audience: app
category: reference
summary: Object type with methods: parse, toMilliseconds, toRootGuidType (Root Core).
---

## Constructors

### Constructor

> **new RootGuidConverter**(): `RootGuidConverter`

#### Returns

`RootGuidConverter`

## Methods

### parse()

> `static` **parse**<`T`>(`strData`: `string`): `T`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`RootGuidType`](../enumerations/RootGuidType.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `strData` | `string` |

#### Returns

`T`

### toMilliseconds()

> `static` **toMilliseconds**(`strData`: `string`): `number`

Converts a GUID string to a timestamp in milliseconds since the ROOT_EPOCH.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | The GUID string to extract the timestamp from. |

#### Returns

`number`

The timestamp in milliseconds.

#### Throws

Will throw an error if the input string is null or invalid.

### toRootGuidType()

> `static` **toRootGuidType**(`strData`: `string`): [`RootGuidType`](../enumerations/RootGuidType.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `strData` | `string` |

#### Returns

[`RootGuidType`](../enumerations/RootGuidType.md)