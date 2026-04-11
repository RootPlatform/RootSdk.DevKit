---
path: bot-api-reference/type-aliases/TypedEventEmitter.md
audience: bot
category: reference
summary: A type-safe wrapper around the standard Node.js `EventEmitter` interface.
---

> **TypedEventEmitter**<`Events`> = `object`

A type-safe wrapper around the standard Node.js `EventEmitter` interface. Root SDK types that emit events include `TypedEventEmitter` in their type signature, which constrains event names and listener parameters to the associated `*Events` map at compile time.

## Type Parameters

| Type Parameter |
| ------ |
| `Events` *extends* `EventMap` |

## Methods

### addListener()

> **addListener**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

`TypedEventEmitter`<`Events`>

### emit()

> **emit**<`E`>(`event`: `E`, ...`args`: `Parameters`<`Events`[`E`]>): `boolean`

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |
| ...`args` | `Parameters`<`Events`[`E`]> |

#### Returns

`boolean`

### eventNames()

> **eventNames**(): (`string` | `symbol` | keyof `Events`)[]

#### Returns

(`string` | `symbol` | keyof `Events`)[]

### getMaxListeners()

> **getMaxListeners**(): `number`

#### Returns

`number`

### listenerCount()

> **listenerCount**<`E`>(`event`: `E`): `number`

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |

#### Returns

`number`

### listeners()

> **listeners**<`E`>(`event`: `E`): `Events`[`E`][]

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |

#### Returns

`Events`[`E`][]

### off()

> **off**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

Remove a previously registered listener.

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `E` | Event name. |
| `listener` | `Events`[`E`] | The same callback reference passed to `on` or `once`. |

#### Returns

`TypedEventEmitter`<`Events`>

### on()

> **on**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

Subscribe to an event. The callback signature is enforced by the `Events` type parameter.

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `E` | Event name. Must be a key of the associated `Events` map. |
| `listener` | `Events`[`E`] | Callback invoked when the event fires. |

#### Returns

`TypedEventEmitter`<`Events`>

### once()

> **once**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

Subscribe to an event for a single firing, then automatically unsubscribe.

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `E` | Event name. |
| `listener` | `Events`[`E`] | Callback invoked once. |

#### Returns

`TypedEventEmitter`<`Events`>

### prependListener()

> **prependListener**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

`TypedEventEmitter`<`Events`>

### prependOnceListener()

> **prependOnceListener**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

`TypedEventEmitter`<`Events`>

### removeAllListeners()

> **removeAllListeners**<`E`>(`event?`: `E`): `TypedEventEmitter`<`Events`>

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event?` | `E` |

#### Returns

`TypedEventEmitter`<`Events`>

### removeListener()

> **removeListener**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

#### Type Parameters

| Type Parameter |
| ------ |
| `E` *extends* `string` | `number` | `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

`TypedEventEmitter`<`Events`>