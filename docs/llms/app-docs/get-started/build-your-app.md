---
path: app-docs/get-started/build-your-app.md
audience: app
category: guide
summary: Building an App with Root requires a few key steps to set up your App's test environment and compile your project.
---

# Build your Root App

Building an App with Root requires a few key steps to set up your App's test environment and compile your project. In this guide, we'll walk you through adding your `DEV_TOKEN` to your server project and compiling your App's source code. After going through these steps, your App will be ready to run locally.

## Add your `DEV_TOKEN` to the server project

1. Open the `.env` file in the App's `server` folder.

1. Add your previously generated `DEV_TOKEN` to the file. The completed file should look something like this (but contain your `DEV_TOKEN` rather than this sample):
	```ts
	DEV_TOKEN=ACROZj4Ilajlkgjoilkjdljfb5l2jln426k42548fdlj4359204undlajf_lkaejrln3904280294FLWalPd35aoier82m_lkad4lkjas0kj-aeheccewqioclbaljer34akjwqpz_-lk-kO52jQjlaljbjlk5299elk2aklbwpcast67lka0as2lgxlmqJSO98absLa34s90gask2ac
	```

## Build your App

Root Apps generally have three top-level source folders: `client`, `networking`, and `server`. These are the folder names Root recommends, and they'll be the names used by Root's starter-code generator. 

An App's source code is a mix of protobuf and TypeScript. The `networking` source code is protbuf, so the Root tooling will first compile the protobuf into TypeScript and then run the TypeScript compiler. The `server` and `client` source is TypeScript, so the tooling will only run a TypeScript compile.

1. Open a terminal in your App's project folder.

1. Install the packages by running the following command:
	```bash
	npm i
	```

1. Build the App by running the following command:
	```bash
	npm run build
	```

The `build` command will compile all three source folders and produce two things for you:

* Your App's client in the `client/dist` folder.
* Your App's server in the `server/dist` folder.