---
path: app-api-reference/client/classes/RootGuidUtils.md
audience: app
category: reference
summary: Utility class for working with Root GUIDs, providing methods to convert between
---

Utility class for working with Root GUIDs, providing methods to convert between
different formats (UUID, GUID, and string) and to extract metadata like timestamps.

## Methods

### stringToUint8Array()

> `static` **stringToUint8Array**(`uuid`: `string`): `Uint8Array`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `uuid` | `string` |

#### Returns

`Uint8Array`

### toGuid()

> `static` **toGuid**<`T`>(`data`: `RootUuid` | `undefined`): `T`

Converts a RootUuid to a generic type T, typically used for converting to RootGuid.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `string` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `RootUuid` | `undefined` | The UUID data to convert. |

#### Returns

`T`

The converted GUID value.

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

Extracts the RootGuidType from a string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | `string` | The GUID string to extract the type from. |

#### Returns

[`RootGuidType`](../enumerations/RootGuidType.md)

The extracted RootGuidType value.

### toString()

> `static` **toString**(`data`: `RootUuid` | `undefined`): `string`

Converts a RootUuid to a base64 encoded string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `RootUuid` | `undefined` | The UUID data to convert. |

#### Returns

`string`

The base64 string representation of the UUID.

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

Converts a RootGuid string to a RootUuid object.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `strData` | [`RootGuid`](../type-aliases/RootGuid.md) | The GUID string to convert. |

#### Returns

`RootUuid`

The RootUuid object.

#### Throws

Will throw an error if the input string is empty or invalid.

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

Converts a nullable RootGuid to standard UUID formatted string, returning blank if the input is null or undefined;

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `string` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `guid` | `T` | `null` | `undefined` | The nullable GUID string to convert. |

#### Returns

`string`

string