---
path: app-docs/get-started/test-your-app.md
audience: app
category: guide
summary: Root supports testing your App locally. Both your App's client and server are hosted on your local machine.
---

# Test your Root App

Root supports testing your App locally. Both your App's client and server are hosted on your local machine.

Your App's server still needs a valid `DEV_TOKEN` because execution isn't fully local. Your client-server communication goes through Root's servers. Also, many of the Root APIs run on Root's servers; for example, if you programmatically create a new message in a community channel, the request will go through Root's servers and then to the Root native client.

## App server

Your App's server will run inside the Root **DevHost**. The **DevHost** is a Node execution environment that's part of the Root SDK.

To launch your App's server inside `DevHost`, do the following:

1. Open a terminal in your App's `server` folder.

1. Run the following command:
	```bash
	npm run server
	```

	The `server` script is defined in the server's `package.json` file; it's shorthand for this:
	```bash
	rootsdk start devhost --project-folder=../
	```

	The **devhost** reads your launch entry-point from the `root-manifest.json` file in your project folder. Your entry-point file is the file containing the call to `start`:
	```ts
	await rootServer.lifecycle.start();
	```

##  App client

Your App's client will run in a local web browser. The starter code created by Root's generator use Vite as the development server.

Root automatically adds the `DevBar` to the top of your running App client. The `DevBar` is an HTML element that helps your testing. It lets you choose which member you want your client to run as. The selector is automatically populated with all the community members and one virtual user that's different every time you run your client.

To launch your App's client, do the following:

1. Open a terminal in your App's `client` folder.

1. Run the following command:
	```bash
	npm run client
	```

	The `client` script is defined in the client's `package.json` file; it runs the development server `vite`. You can launch the client more than once to test multiple members connected to your App simultaneously.

## Root native client (optional)

If your App uses the Root Community API (e.g., programmatically create messages in community channels), then you can also launch the Root native client and navigate to the community represented in your `DEV_TOKEN`.

## Test from another device or a container

The DevHost only accepts connections from your own machine.

To open your App from a phone or a second computer, or to run the DevHost inside a Docker container, set `ROOT_DEV_BIND_IP` in your server's `.env` file:

```text
DEV_TOKEN=...
ROOT_DEV_BIND_IP=0.0.0.0
```

The DevHost then listens on every network interface, on ports 8080, 8081, 8082 and 8090. For a phone or second computer, also start Vite with `npm run client -- --host` and open the address it prints. Anyone on your network can then reach the DevHost, which makes API calls with your `DEV_TOKEN`.