---
path: app-api-reference/client/type-aliases/TypedEventEmitter.md
audience: app
category: reference
summary: Object type with methods: addListener, emit, eventNames, getMaxListeners, ....
---

> **TypedEventEmitter**<`Events`> = `object`

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

### on()

> **on**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

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

### once()

> **once**<`E`>(`event`: `E`, `listener`: `Events`[`E`]): `TypedEventEmitter`<`Events`>

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