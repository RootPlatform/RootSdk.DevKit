---
path: app-api-reference/client/classes/RootServerException.md
audience: app
category: reference
summary: The only exception type that can cross the server-client boundary. You throw it on the server to report an error to your client.
---

The only exception type that can cross the server-client boundary. You throw it on the server to report an error to your client. Root serializes the exception and delivers it to the client, where it can be caught with a standard try/catch. Extends `Error`, so the inherited `message` property carries a human-readable description of the error.

## Extends

- `Error`

## Constructors

### Constructor

> **new RootServerException**(`code?`: `number`, `message?`: `string`, `callingFunction?`: `Function` | `undefined`): `RootServerException`

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

Numeric error code identifying the failure. Negative values are system errors from `RootServerExceptionType`. Positive values are application-defined error codes. Defaults to `RootServerExceptionType.Unspecified`.

## Methods

### toString()

> **toString**(): `string`

Returns a string representation of an object.

#### Returns

`string`