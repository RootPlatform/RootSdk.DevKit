---
path: app-docs/tutorials/showdown-app/overview.md
audience: app
category: tutorial
summary: **Showdown** is a simple, real-time voting App where members choose between two competing options — like _Cats vs.
---

# Tutorial: Showdown App

**Showdown** is a simple, real-time voting App where members choose between two competing options — like _Cats vs. Dogs_ — and see live updates as others vote. It's a good project for learning the core networking code in a Root App. To keep things manageable, the choices will be hardcoded and there won't be any database/persistence.

## Root concepts covered

- **Protobuf**: Define messages and a service in protobuf.
- **Service implementation**: Handle incoming client messages and broadcast updates to all clients.
- **Client implementation**: Call server-side functions, subscribe to a broadcast event.

## Prerequisites

- High-beginner to low-intermediate level TypeScript knowledge including asynchronous coding.
- Beginner-level HTML knowledge including `div` and `button`.
- Beginner-level React knowledge including `useState`, `useEffect`, and `EventEmitter`.

## Solution code

A fully implemented version of this project is available in the Root [samples repository](https://github.com/RootPlatform/RootSdk.Samples/tree/main/Apps/ProtobufService).