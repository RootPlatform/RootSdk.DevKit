---
path: app-api-reference/server/classes/RootGuidUtils.md
audience: app
category: reference
summary: Static utility class for converting and inspecting Root GUIDs. Cannot be instantiated.
---

> **Worked sample**: `api-samples/server-guid-utils/` — GUID Utilities

Static utility class for converting and inspecting Root GUIDs. Cannot be instantiated.

## Methods

### stringToUint8Array()

> `static` **stringToUint8Array**(`uuid`: `string`): `Uint8Array`

Parses a GUID string (base64 or standard UUID format) into a byte array.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `uuid` | `string` | A GUID string in either format. |

#### Returns

`Uint8Array`

A `Uint8Array` of 16 bytes.

### toGuid()

> `static` **toGuid**<`T`>(`data`: `RootUuid` | `undefined`): `T`

Converts internal UUID data to a typed GUID string.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `string` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `RootUuid` | `undefined` | Internal UUID data. |

#### Returns

`T`

A typed GUID string.

### toGuidNullable()

> `static` **toGuidNullable**<`T`>(`data`: `RootUuid` | `null` | `undefined`): `T` | `undefined`

Converts a nullable RootUuid to a generic type T, returning undefined if the input is null or undefined.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `RootUuid` | `null` | `undefined` | The nullable UUID data to convert. |

#### Returns

`T` | `undefined`

The converted GUID value or undefined.

### toMilliseconds()

> `static` **toMilliseconds**(`strData`: `string`): `number`

Extracts the creation timestamp from a GUID as a Unix millisecond timestamp. Pass the returned value to new Date() to get the creation time, or use it directly to compare the relative age of GUIDs or sort entities by creation time.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | A GUID string. |

#### Returns

`number`

Unix milliseconds (ms since 1970-01-01 UTC).

### toRootGuidType()

> `static` **toRootGuidType**(`strData`: `string`): [`RootGuidType`](../enumerations/RootGuidType.md)

Extracts the `RootGuidType` from a GUID string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | A GUID string. |

#### Returns

[`RootGuidType`](../enumerations/RootGuidType.md)

The `RootGuidType` of the entity.

### toString()

> `static` **toString**(`data`: `RootUuid` | `undefined`): `string`

Converts internal UUID data to a base64-encoded GUID string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `RootUuid` | `undefined` | Internal UUID data. |

#### Returns

`string`

A base64-encoded GUID string.

### toStringFromArray()

> `static` **toStringFromArray**(`data`: `Uint8Array`): `string`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `Uint8Array` |

#### Returns

`string`

### toStringNullable()

> `static` **toStringNullable**(`data`: `RootUuid` | `null` | `undefined`): `string` | `undefined`

Converts a nullable RootUuid to a string, returning undefined if the input is null or undefined.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `RootUuid` | `null` | `undefined` | The nullable UUID data to convert. |

#### Returns

`string` | `undefined`

The base64 string representation or undefined.

### toUuid()

> `static` **toUuid**(`strData`: [`RootGuid`](../type-aliases/RootGuid.md)): `RootUuid`

Converts a GUID string back to internal UUID data.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | [`RootGuid`](../type-aliases/RootGuid.md) | A `RootGuid` string. |

#### Returns

`RootUuid`

Internal UUID data.

### toUuidNullable()

> `static` **toUuidNullable**(`strData`: [`RootGuid`](../type-aliases/RootGuid.md) | `null` | `undefined`): `RootUuid` | `undefined`

Converts a nullable RootGuid string to a RootUuid object, returning undefined if the input is null or undefined.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | [`RootGuid`](../type-aliases/RootGuid.md) | `null` | `undefined` | The nullable GUID string to convert. |

#### Returns

`RootUuid` | `undefined`

The RootUuid object or undefined.

### toUuidString()

> `static` **toUuidString**<`T`>(`guid`: `T` | `null` | `undefined`): `string`

Converts a GUID to a standard UUID string format with hyphens (e.g., `"550e8400-e29b-41d4-a716-446655440000"`).

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `string` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `guid` | `T` | `null` | `undefined` | A typed GUID, or null/undefined. |

#### Returns

`string`

The UUID string, or an empty string if the input is null/undefined.