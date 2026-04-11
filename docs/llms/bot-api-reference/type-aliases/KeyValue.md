---
path: bot-api-reference/type-aliases/KeyValue.md
audience: bot
category: reference
summary: Represents a key-value pair returned by `KeyValueStore.select()`. Contains the key, value, and optional expiration date.
---

> **KeyValue**<`T`> = `object`

Represents a key-value pair returned by `KeyValueStore.select()`. Contains the key, value, and optional expiration date.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### expiresAt?

> `optional` **expiresAt**: `Date`

### key

> **key**: `string`

The string key that identifies this entry in the store.

### value

> **value**: `T`

The stored value, deserialized to type `T`.