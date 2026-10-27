---
path: app-docs/develop/server/server-project-overview.md
audience: app
category: guide
summary: This section covers how to set up and work with the server side of a Root App.
---

# Server project overview

This section covers how to set up and work with the server side of a Root App. You'll see how the project is structured, what tools it uses, and how to run it locally for testing.

## Server coding options

The server of a Root App is written in TypeScript. You can pull in third-party packages from registries like [npm](https://www.npmjs.com/).

## Source-code folders and files

This diagram shows the typical structure of the server-side project for a Root App. The `src/` folder contains your main service code, including the entry point and any custom services. The root of the `server/` folder includes configuration files for building and testing your server.

[Diagram: This diagram shows a project with a server folder. The server folder contains package.json and tsconfig.json. There is a src folder below the server folder that contains the server-side Typescript source code for the App.]
```
graph LR
    HOME[📁 project-folder/]
    HOME --> SERVER[📁 server/]
    SERVER --> SRC[📁 src/]
    SERVER --> F1["package.json</br>tsconfig.json</br>.env"]
    SRC --> F2["main.ts<br/>myService.ts"]
```

## Root API

The Root SDK includes an API of common services to help you build your Root App. There are APIs for both server-side and client-side features. The diagram below outlines the major categories available to each environment, as well as the shared types used across both. Notice that the majority of the types are exclusively for use on the server side; this is by design since Root Apps do most of their work on the server.

[Diagram: This diagram shows the available Root APIs for App servers and clients.]
```
flowchart LR
  ServerAPI((Server API))
  ClientAPI((Client API))  
  ServerAPI --> S1[Community access]
  ServerAPI --> S2[Job scheduler]
  ServerAPI --> S3[Member group</br>management]
  ServerAPI --> S4[Track attached</br>users and devices]
  ServerAPI --> S5[Assets: files,</br>images, more]
  ServerAPI --> S6[Community</br>log]
  ServerAPI --> S7[Persistent</br>data storage]
  ServerAPI --> S8[Server lifecycle]
  ClientAPI --> C1[User ID and profile]
  ClientAPI --> C2[File upload</br>and display]
  ClientAPI --> C3[Theme methods</br>and events]
  ServerAPI --> Shared1[Exceptions from</br>server to client]
  ClientAPI --> Shared1
  ServerAPI --> Shared2[Guid types]
  ClientAPI --> Shared2
  classDef clientColor fill:#e8f5e9,stroke:#2e7d32,color:#000000,stroke-width:1px;
  class ClientAPI,C1,C2,C3 clientColor;
  classDef sharedColor fill:#e3f2fd,stroke:#1565c0,color:#000000,stroke-width:1px;
  class Shared1,Shared2 sharedColor;
```

## Runtime environment

Root App servers run in a Node.js environment. They use **CommonJS modules** because they're widely supported and compatible with many existing libraries. It's the traditional module system for server-side code. You'll have access to most core Node.js modules (with some security limitations).

Your server runs on **Node 24 on Alpine Linux**, on x64, with no GPU. Alpine uses **musl** rather than glibc, which matters as soon as one of your dependencies ships a compiled binary.

### How native dependencies work

Packaging does not rebuild native modules. `rootsdk build package` archives your `node_modules` exactly as it exists on your development machine, and the Root cloud extracts that archive as it is. Nothing runs `npm rebuild` or `node-gyp` on the host.

So a compiled `.node` binary built on Windows, on macOS, or on a glibc Linux will not load on the Alpine host, and your server fails at startup rather than at packaging time. Two ways to avoid this:

- **Prefer dependencies written in JavaScript or TypeScript.** Most packages that offer a native build also work without one.
- **If you need a compiled dependency, install it against a matching target**: Node 24, Linux, x64, musl. A WebAssembly build avoids the problem completely, because there is no native binary to load.

### How the package size limit works

Your uploaded package cannot exceed **100 MiB**. This is a limit on the package you upload, not on the data your App stores later, and an upload above it is rejected.

Two things commonly push a package over the limit: bundling large binary assets that belong in the asset pipeline, and shipping the whole of a large dependency when you use one part of it. If you are close to the limit, check what is in `node_modules` before anything else.

## Local testing

Root App clients can be testing locally by running the `rootsdk-devhost` tool that's part of the Root SDK. There are scripts in the server's `package.json` file to build the server and run the `rootsdk-devhost` tool.

```json
"scripts": {
  "build": "tsc",
  "server": "rootsdk start devhost --project-folder=../"
}
```

While `devhost` will run on your local machine, API calls are routed through the Root servers. This means your App will need to provide a token to enable the communication. You get a `DEV_TOKEN` from the [Root Developer Portal](https://dev.rootapp.com) and put it an `.env` file in your server folder:

```typescript
DEV_TOKEN=ACZHpzeKhQK2YaUZD1qJMgACxHpeOOjQGGOWF2E5TSRQAn_C5pqoESub_HceHsmfcxb8ds9Xk6SaW7JNwbF8TD2WncIosg7bHtopAo2S4JElpZbafZszz7P75HpId0njYx062cKRaktKONhNpc57smWYan-6BpN32AkB6iKwA6xpgJjBIJ8dKeO0Srl52O3eB
```

To test your server, open a terminal window in the `server` folder and run the following command:

```bash
npm run server
```