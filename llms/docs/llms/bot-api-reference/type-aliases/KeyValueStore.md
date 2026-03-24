---
path: bot-api-reference/type-aliases/KeyValueStore.md
audience: bot
category: reference
summary: `KeyValueStore` is a key-value storage mechanism. It provides an asynchronous API for storing, retrieving, updating,
---

> **KeyValueStore** = `object`

`KeyValueStore` is a key-value storage mechanism. It provides an asynchronous API for storing, retrieving, updating,
and deleting key-value pairs. The store is persistent; the data is stored in a SQLite database that's
automatically backed up and restored by Root.

The key is a string and the value is generic type parameter. When loading data into the key-value store,
Root uses `JSON.stringify` to convert the value into a string for storage. On the way out, Root uses `JSON.parse`
to convert back to the type-parameter type.

Root automatically creates an instance of `KeyValueStore` and exposes it via the `rootServer.dataStore.appData` property.

## Methods

### delete()

> **delete**(`key`: `string`): `Promise`<`void`>

Deletes a key-value pair from the store by key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key to delete. |

#### Returns

`Promise`<`void`>

A promise that resolves when the key is deleted.

#### Example

```ts
import { rootServer } from "@rootsdk/server-bot";

await rootServer.dataStore.appData.delete("myKey");
```

### deleteLike()

> **deleteLike**(`keyPattern`: `string`): `Promise`<`void`>

Deletes key-value pairs from the store that match a pattern.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keyPattern` | `string` | The pattern to match keys against ('_' matches a single character, '%' matches any sequence of zero or more characters, use '\\' to escape the special characters '_' and '%'). |

#### Returns

`Promise`<`void`>

A promise that resolves when the matching keys are deleted.

#### Example

```ts
import { rootServer } from "@rootsdk/server-bot";

await rootServer.dataStore.appData.deleteLike("user%");
```

### get()

> **get**<`T`>(`key`: `string`): `Promise`<`T` | `undefined`>

Retrieves a stored value associated with the given key.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The expected type of the stored value. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key associated with the stored value. |

#### Returns

`Promise`<`T` | `undefined`>

A promise that resolves to the stored value or `undefined` if not found.

#### Example

```ts
import { rootServer } from "@rootsdk/server-bot";

const value = await rootServer.dataStore.appData.get<string>("myKey");
```

### select()

> **select**<`T`>(`keyPattern`: `string`): `Promise`<[`KeyValue`](KeyValue.md)<`T`>[]>

Selects key-value pairs from the store that match a key pattern.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the values to retrieve. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keyPattern` | `string` | The pattern to match keys against ('_' matches a single character, '%' matches any sequence of zero or more characters, use '\\' to escape the special characters '_' and '%'). |

#### Returns

`Promise`<[`KeyValue`](KeyValue.md)<`T`>[]>

A promise that resolves with an array of matching key-value pairs.

#### Example

```ts
import { rootServer, KeyValue } from "@rootsdk/server-bot";

const pairs: KeyValue<string>[] =
  await rootServer.dataStore.appData.select("myKey%");
```

### selectValue()

> **selectValue**<`T`>(`keyPattern`: `string`): `Promise`<`T`[]>

Selects values from the store that match a key pattern.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the values to retrieve. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keyPattern` | `string` | The pattern to match keys against ('_' matches a single character, '%' matches any sequence of zero or more characters, use '\\' to escape the special characters '_' and '%'). |

#### Returns

`Promise`<`T`[]>

A promise that resolves with an array of matching values.

#### Example

```ts
import { rootServer } from "@rootsdk/server-bot";

const values: string[] =
  await rootServer.dataStore.appData.selectValue("myKey%");
```

### set()

> **set**<`T`>(`values`: [`KeyValue`](KeyValue.md)<`T`> | [`KeyValue`](KeyValue.md)<`T`>[]): `Promise`<`void`>

Sets a key-value pair in the store. If the key already exists, it updates the value.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the value to store. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `values` | [`KeyValue`](KeyValue.md)<`T`> | [`KeyValue`](KeyValue.md)<`T`>[] | The key-value pair or an array of key-value pairs to store. Each key-value pair can optionally contain an expiration Date. If you provide an expiration date, that entry will stop being visible in the store when the expiration date passes. Eventually, it will be automatically deleted. |

#### Returns

`Promise`<`void`>

A promise that resolves when the operation is complete.

#### Example

```ts
import { rootServer, KeyValue } from "@rootsdk/server-bot";

// set a single key-value pair
await rootServer.dataStore.appData.set({ key: "myKey", value: "myValue" });

// set an array of key-value pairs.
await rootServer.dataStore.appData.set([
  { key: "key1", value: "value1" },
  { key: "key2", value: "value2" },
]);

// include an expiration date
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

const keyValue: KeyValue<string> = {
  key: "myKey",
  value: "myValue",
  expires_at: expiresAt,
};

await rootServer.dataStore.appData.set(keyValue);
```

### update()

> **update**<`T`>(`key`: `string`, `updateFunc`: (`data`: `T`) => `T`, `defaultValue`: `T`, `expires_at?`: `Date`): `Promise`<`T`>

Updates a value associated with a key. You must include a transformation function to perform the update:
the old value is retrieved, the function is called with the old value, the function's return value is
used as the new value in the key-value store. If the key does not exist, this conceptually becomes a `set`
operation. The transformation function is applied to the default and the result becomes the value in the set operation.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the value to update. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The key of the value to update. |
| `updateFunc` | (`data`: `T`) => `T` | A function to apply to the current value. |
| `defaultValue` | `T` | The default value to use if the key does not exist. |
| `expires_at?` | `Date` | Optional expiration date for the updated value. |

#### Returns

`Promise`<`T`>

A promise that resolves with the updated value.

#### Example

```ts
import { rootServer } from "@rootsdk/server-bot";

// update the value for the key "counter" by applying the passed function
// the last argument in the call is the default value
await rootServer.dataStore.appData.update("counter", (val) => val + 1, 0);
```