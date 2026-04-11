---
path: bot-docs/get-started/test-your-bot.md
audience: bot
category: guide
summary: Root supports testing your Bot locally. Your Bot still needs a valid `DEV_TOKEN` because execution isn't fully local.
---

# Test your Root Bot

Root supports testing your Bot locally. Your Bot still needs a valid `DEV_TOKEN` because execution isn't fully local. Calls to the Community API (e.g., programmatically creating a new message in a community channel) will go through Root's servers and then to the Root native client.

## Bot execution

Your Bot will run inside the Root `DevHost`. The `DevHost` is a Node execution environment that's part of the Root SDK.

### Usage

To launch your Bot inside `DevHost`, do the following:

1. Open a terminal in your Bot's project folder.

1. Run the following command:
	```bash
	npm run bot
	```

	The `bot` script is defined in the `package.json` file; it's shorthand for this:
	```bash
	rootsdk start devhost
	```

	The **devhost** reads your launch entry-point from the `root-manifest.json` file in your project folder. Your entry-point file is the file containing the call to `start`:
	```ts
	await rootServer.lifecycle.start();
	```

## Root native client

To see your Bot interacting with the community, you can launch the Root native client and navigate to the community represented in your `DEV_TOKEN`. The starter-code Bot responds to the `/echo` command and replies with the text you include after the command.