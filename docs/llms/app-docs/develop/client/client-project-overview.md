---
path: app-docs/develop/client/client-project-overview.md
audience: app
category: guide
summary: This section shows how the client side of a Root App is set up.
---

# Client project overview

This section shows how the client side of a Root App is set up. You'll see how the project is structured, what tools it uses, and how to run it locally for testing.

## User-interface coding options

The client is a full GUI application written in TypeScript using web tech. You can choose your preferred UI framework like React, Angular, Vue, etc. You can also pull in third-party packages from registries like [npm](https://www.npmjs.com/).

## Source-code folders and files

This diagram shows the typical structure of the client-side project. The `src/` folder contains the main entry points, while the `client/` folder includes configuration and build files.

[Diagram: This diagram shows a project with client folder. The client folder contains the files global.d.ts, index.html, package.json, tsconfig.json, and vite.config.ts. There is a src folder below the server folder that contains the client-side Typescript and React source code for the App.]
```
graph LR
    HOME[📁 project-folder/]
    HOME --> CLIENT[📁 client/]
    CLIENT --> SRC[📁 src/]
    CLIENT --> F1["global.d.ts</br>index.html</br>package.json</br>tsconfig.json</br>vite.config.ts"]
    SRC --> F2["App.tsx<br/>index.tsx"]
```

## Root API

The Root SDK includes an API of common services to help you build your Root App. There are APIs for both server-side and client-side features. The diagram below outlines the major categories available to each environment, as well as the shared types used across both. Notice that there are relatively few types available to your client; this is by design since Root Apps do most of their work on the server.

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

Root App clients run in a browser-like environment. They use **ES modules** because they're the standard for writing modular, browser-friendly JavaScript.

The client has access to most browser functionality except for native resources and networking (e.g., you won't be able to access the file system, webcam, audio hardware, or make network calls).

## Local testing

Root App clients can be tested locally by running in-browser. The default configuration uses Vite for this testing. There are scripts in the client's `package.json` file to build the client and run Vite.

```json
"scripts": {
  "build": "tsc && vite build",
  "client": "vite"
}
```

To test your client, open a terminal window in the `client` folder and run the following command:

```bash
npm run client
```

Vite will look for a file named `index.html` in the current folder. If you'd like to use a different file, you can override the entry point in `vite.config.ts`.