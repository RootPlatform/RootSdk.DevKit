---
path: bot-docs/develop/bot-project-overview.md
audience: bot
category: guide
summary: This section covers how to set up and work with a Root Bot. You'll see how the project is structured, what tools it uses, and how to run it locally...
---

# Bot project overview

This section covers how to set up and work with a Root Bot. You'll see how the project is structured, what tools it uses, and how to run it locally for testing.

## Bot coding options

Root Bots are written in TypeScript. You can pull in third-party packages from registries like [npm](https://www.npmjs.com/).

## Source-code folders and files

This diagram shows the typical structure of a Root Bot. The `src/` folder contains your Bot code. By convention, your entry point is in a file named `main.ts`.

[Diagram: This diagram shows a Root Bot project. The project folder contains package.json, tsconfig.json, and .env. There is a src folder below the project folder that contains the server-side Typescript source code for the Bot.]
```
graph LR
    HOME[📁 project-folder/]
    HOME --> SRC[📁 src/]
    HOME --> F1["package.json</br>tsconfig.json</br>.env"]
    SRC --> F2["main.ts<br/>myBot.ts"]
```

## Root API

The Root SDK includes an API of common services to help you build your Bot. The diagram below outlines the major categories. Notice that all types are exclusively for use on the server since Bots do not have any client-side code.

[Diagram: This diagram shows the major categories of the Root APIs for Bots.]
```
flowchart LR
  BotAPI((Bot API))
  BotAPI --> S1[Community access]
  BotAPI --> S2[Job scheduler]
  BotAPI --> S3[Member group</br>management]
  BotAPI --> S4[Server-side</br>logging]
  BotAPI --> S5[Persistent</br>data storage]
  BotAPI --> S6[Server lifecycle]
```

## Runtime environment

Root Bots run in a Node.js environment. They use **CommonJS modules** because they're widely supported and compatible with many existing libraries. You'll have access to most core Node.js modules (with some security limitations).

Your Bot runs on **Node 24 on Alpine Linux**, on x64, with no GPU. Alpine uses **musl** rather than glibc, which matters as soon as one of your dependencies ships a compiled binary.

### How native dependencies work

Packaging does not rebuild native modules. `rootsdk build package` archives your `node_modules` exactly as it exists on your development machine, and the Root cloud extracts that archive as it is. Nothing runs `npm rebuild` or `node-gyp` on the host.

So a compiled `.node` binary built on Windows, on macOS, or on a glibc Linux will not load on the Alpine host, and your Bot fails at startup rather than at packaging time. Two ways to avoid this:

- **Prefer dependencies written in JavaScript or TypeScript.** Most packages that offer a native build also work without one.
- **If you need a compiled dependency, install it against a matching target**: Node 24, Linux, x64, musl. A WebAssembly build avoids the problem completely, because there is no native binary to load.

### How the package size limit works

Your uploaded package cannot exceed **100 MiB**. This is a limit on the package you upload, not on the data your Bot stores later, and an upload above it is rejected.

Two things commonly push a package over the limit: bundling large binary assets that belong in the asset pipeline, and shipping the whole of a large dependency when you use one part of it. If you are close to the limit, check what is in `node_modules` before anything else.

## Local testing

Root Bots can be tested locally by running the `rootsdk devhost` tool that's part of the Root SDK. There are scripts in the Bot's `package.json` file to build and run your Bot.

```json
"scripts": {
  "build": "tsc",
  "bot": "rootsdk start devhost"
}
```

While `devhost` will run on your local machine, API calls are routed through the Root servers. This means your Bot will need to provide a token to enable the communication. You get a `DEV_TOKEN` from the [Root Developer Portal](https://dev.rootapp.com) and put it an `.env` file in your project folder:

```typescript
DEV_TOKEN=ACZHpzeKhQK2YaUZD1qJMgACxHpeOOjQGGOWF2E5TSRQAn_C5pqoESub_HceHsmfcxb8ds9Xk6SaW7JNwbF8TD2WncIosg7bHtopAo2S4JElpZbafZszz7P75HpId0njYx062cKRaktKONhNpc57smWYan-6BpN32AkB6iKwA6xpgJjBIJ8dKeO0Srl52O3eB
```

To test your Bot, open a terminal window in your project folder and run the following command:

```bash
npm run bot
```

If your Bot uses the Root Community API (e.g., programmatically create messages in community channels), then you can also launch the Root native client and navigate to the community represented in your `DEV_TOKEN`.