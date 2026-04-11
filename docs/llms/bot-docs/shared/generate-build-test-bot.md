---
path: bot-docs/shared/generate-build-test-bot.md
audience: bot
category: guide
summary: Root supplies a command-line utility named `create-root` that generates starter code.
---

# Generate and test Bot starter code

Root supplies a command-line utility named `create-root` that generates starter code. Here, you'll create your project, build it, and test that it works with your community.

## 1. Generate

1. Open a terminal in your preferred base folder.

1. Run the following command:
	```bash
	npx create-root@latest --bot <your-project-name>
	```

1. Open the generated folder in an IDE.

1. (Optional) If you'd like to, take a few minutes to review the generated project. Here are a few files that might be of interest:

	**`package.json`**
	- The necessary dependencies for the Root SDK are already included.
	- The `build` script will compile your code.
	- The `clean` script is provided as a convenience. It deletes the compiled code, the `node_modules` folder, and a few generated config files. Feel free to edit the `clean.js` file to modify this script as needed.
	- The `bot` script runs your Bot; when you execute it, you'll say `npm run bot` so it should be easy to remember.

	**`src/example.ts`**
	- You import all Root Bot SDK types from `@rootsdk/server-bot`.
	- The file exports an `initialize` method that's called at Bot startup from `src/main.ts`.
	- There's starter code that implements an `echo` Bot:
		- Subscribes to the `ChannelMessageEvent.ChannelMessageCreated` event.
		- Retrieves the incoming message.
		- Sends it back to the same channel.

## 2. Add `DEV_TOKEN`

1. Open the `.env` file in the Bot's project folder.

1. Add your previously generated `DEV_TOKEN` to the file. The completed file should look something like this (but contain your `DEV_TOKEN` value rather than this sample):
	```ts
	DEV_TOKEN=ACROZj4Ilajlkgjoilkjdljfb5l2jln426k42548fdlj4359204undlajf_lkaejrln3904280294FLWalPd35aoier82m_lkad4lkjas0kj-aeheccewqioclbaljer34akjwqpz_-lk-kO52jQjlaljbjlk5299elk2aklbwpcast67lka0as2lgxlmqJSO98absLa34s90gask2ac
	```

## 3. Build

1. Open a terminal in your Bot's project folder.

1. Install the necessary packages by running the following command:
	```bash
	npm i
	```

1. Build the Bot by running the following command:
	```bash
	npm run build
	```

## 4. Run

1. Execute your Bot by running the following command:
	```bash
	npm run bot
	```

## 5. Test

Use the Root native client to interact with your Bot.

1. Open the Root native client
1. Log in if needed.
1. Open the community associated with your `DEV_TOKEN`.
1. Enter your Bot's commands to interact with your Bot. The starter-code Bot responds to the `/echo` command and replies with the text you include after the command.