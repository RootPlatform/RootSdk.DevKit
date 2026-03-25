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