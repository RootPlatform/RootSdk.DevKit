---
path: app-docs/tutorials/showdown-app/generate-build-test-app.md
audience: app
category: tutorial
summary: Root supplies a command-line utility named `create-root` that generates starter code.
---

# Generate and test App starter code

Root supplies a command-line utility named `create-root` that generates starter code. Here, you'll create your code, build it, and test that it works with your community.

## 1. Generate

1. Open a terminal in your preferred folder.

1. Run the following command:
	```bash
	npx create-root --app <your-project-name>
	```

1. Open the generated folder in an IDE.

1. (Optional) If you'd like to, take a few minutes to review the generated code. Here are a few things that might be of interest:

	**`package.json`** file
	- The necessary dependencies for the Root SDK are already included.
	- The necessary dependencies for the generated networking code are already included.
	- The `build` script will compile your code in all three folders: `client`, `networking`, and `server`.
	- The `clean` script is provided as a convenience. It deletes the compiled code, the `node_modules` folder, and a few generated config files. Feel free to edit the `clean.js` file to modify this script as needed.

	**`client`** folder
	- There's an `Echo` component in the `src/Example.tsx` file.
	- The client uses a React UI and Vite as a local development server.
	- The `client` script in `package.json` runs your App's client; to execute it, you'll say `npm run client`.

	**`server`** folder
	- There's the implementation of the `Echo` service in the `src/exampleService.ts` file.
	- The `server` script in `package.json` runs your App's server; when you execute it, you'll say `npm run server`.

	**`networking`** folder
	- There's the declaration of the `Echo` service in the `src/example.proto` file.
	- The configuration information for the Root SDK tooling is in the `src/root-protoc.json` file. You shouldn't need to change it unless you want to customize the scope or folder structure.

## 2. Add `DEV_TOKEN`

1. Open the `.env` file in the `server` folder.

1. Add your previously generated `DEV_TOKEN` to the file. The completed file should look something like this (but contain your `DEV_TOKEN` value rather than this sample):
	```ts
	DEV_TOKEN=ACROZj4Ilajlkgjoilkjdljfb5l2jln426k42548fdlj4359204undlajf_lkaejrln3904280294FLWalPd35aoier82m_lkad4lkjas0kj-aeheccewqioclbaljer34akjwqpz_-lk-kO52jQjlaljbjlk5299elk2aklbwpcast67lka0as2lgxlmqJSO98absLa34s90gask2ac
	```

## 3. Build

The `build` command in `package.json` will generate networking code from your `.proto` files, compile the generated networking code, compile your server, and compile your client.

1. Open a terminal in your App's project folder.

1. Install the necessary packages by running the following command:
	```bash
	npm i
	```

1. Build the App by running the following command:
	```bash
	npm run build
	```

## 4. Run server

Root supports testing your App locally. Both your App's client and server are hosted on your local machine. Your App's server still needs a valid `DEV_TOKEN` because execution isn't fully local; your client-server communication goes through Root's servers. Your App is always running in the context of a community, even for local testing. The community ID is encoded as part of the `DEV_TOKEN` so you'll need to generate a new `DEV_TOKEN` for each community you'd like to test against.

1. Open a terminal in your App's `server` folder.

1. Execute the server side of your App by running the following command:
	```bash
	npm run server
	```

## 4. Run client

Your App's client will run in a local web browser. The starter code created by Root's generator use Vite as the development server. Root automatically adds the `DevBar` to the top of your running App client. The `DevBar` is an HTML element that helps your testing. It lets you choose which member you want your client to run as. The selector is automatically populated with all the community members and one virtual user that's different every time you run your client.

1. Open a terminal in your App's `client` folder.

1. Run the following command:
	```bash
	npm run client
	```
1. If your browser doesn't launch automatically, you can open your browser manually and navigate to `http://localhost:5173/`. You can even open multiple browser windows at that same address to test multiple members connected to your App simultaneously.

## 5. Test

Use the client running in the browser to interact with your App.