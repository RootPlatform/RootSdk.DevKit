---
path: app-api-reference/server/classes/RootServerException.md
audience: app
category: reference
summary: Object type with methods: toString (Root Core).
---

## Extends

- `Error`

## Constructors

### Constructor

> **new RootServerException**(`code`: `number`, `message`: `string`, `callingFunction`: `Function` | `undefined`): `RootServerException`

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `code` | `number` | `RootServerExceptionType.Unspecified` |
| `message` | `string` | `""` |
| `callingFunction` | `Function` | `undefined` | `undefined` |

#### Returns

`RootServerException`

#### Overrides

`Error.constructor`

## Properties

### code

> **code**: `number`

## Methods

### toString()

> **toString**(): `string`

Returns a string representation of an object.

#### Returns

`string`