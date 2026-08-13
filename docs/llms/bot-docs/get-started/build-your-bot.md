---
path: bot-docs/get-started/build-your-bot.md
audience: bot
category: guide
summary: Building a Bot with Root requires a few key steps to set up your Bot's test environment and compile your project.
---

# Build your Root Bot

Building a Bot with Root requires a few key steps to set up your Bot's test environment and compile your project. In this guide, we'll walk you through adding your `DEV_TOKEN` to your project and compiling your code. After going through these steps, your Bot will be ready to run locally.

## Add your `DEV_TOKEN` to the project

1. Open the `.env` file in the Bot's project folder.

1. Add your previously generated `DEV_TOKEN` to the file. The completed file should look something like this (but contain your `DEV_TOKEN` value rather than this sample):
	```ts
	DEV_TOKEN=ACROZj4Ilajlkgjoilkjdljfb5l2jln426k42548fdlj4359204undlajf_lkaejrln3904280294FLWalPd35aoier82m_lkad4lkjas0kj-aeheccewqioclbaljer34akjwqpz_-lk-kO52jQjlaljbjlk5299elk2aklbwpcast67lka0as2lgxlmqJSO98absLa34s90gask2ac
	```

## Build your Bot

All your Bot's config files will be in your project folder. Your source code will be in the `src` folder.

1. Open a terminal in your Bot's project folder.

1. Install the packages by running the following command:
	```bash
	npm i
	```

1. Build the Bot by running the following command:
	```bash
	npm run build
	```

The `build` command will compile your `src` folder and produce a `dist` folder.