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