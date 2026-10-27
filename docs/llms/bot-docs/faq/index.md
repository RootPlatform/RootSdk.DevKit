---
path: bot-docs/faq/index.md
audience: bot
category: guide
---

# Root Bots FAQ

## Hosting

### Can I host my own external web service?
Yes, you can create and host your own external web service outside of Root. Your Root-hosted, server-side code can communicate with your external web service.

### Can I self-host?
You can't fully self-host. Your server-side code needs to be hosted by Root and run inside the Root cloud.

## Server-side development

### Can my Bot post a message under a different name and avatar?
No. Creating a channel message takes the channel, the content and any attachments. There is no field for an author name or a picture, so the message always shows your Bot or App as the author. A Bot also cannot set its own nickname inside a community.

This rules out proxy and relay patterns where one Bot speaks on behalf of several different people. The closest you can do today is put the original author's name in the message content. See [Messaging](../develop/community-api/messaging/overview.md) for what a message can carry.

### Which programming languages can I use for my server-side code?
TypeScript/JavaScript

## Networking

### Can I use a third-party web service?
Yes, your Root-hosted, server-side code is running on Node and can use standard networking to communicate with third-party web services. Root is investigating how to support secret storage and webhooks to make this process easier; however, these are not currently implemented.

### Can I use webhooks?
Outbound only, and only as ordinary HTTP that you write yourself. Your Root-hosted server code runs on Node, so it can POST to any address you choose when something happens in the community. There is no platform webhook feature behind that and nothing to configure. You write the request.

Inbound webhooks do not exist. There is no address an outside service can POST to in order to reach your App, your Bot or a channel. When you need data to come in, your Root-hosted code has to fetch it, either on a schedule with the [job scheduler](../develop/job-scheduler.md) or at the moment your code needs it.

## Test

### How do I test my Bot locally?
The Root SDK includes the `devhost` command that will run your Bot locally on your development machine. You can interact with your Bot using the Root desktop client - the Bot will connect to the community represented by the `DEV_TOKEN` in your `.env` file.

## Troubleshooting

### Can I use my DEV_TOKEN to publish?
No. These are two different credentials and they are not interchangeable.

Your `DEV_TOKEN` runs `devhost` against your test community while you develop. Publishing uses a separate authentication token, which you also get from the [Root Developer Portal](https://dev.rootapp.com) and pass to `rootsdk upload` with `--authToken`. See [Upload](../publish/upload.md) for the command.

### I uploaded a new build but the Developer Portal still shows the old one. Why?
Every upload needs a new version. Increment `version` in `root-manifest.json`, rebuild the package, then upload again.

Root identifies a version by its major, minor and patch numbers, so an upload that reuses the version of an existing one is rejected with `App version already exists` rather than replacing it. Rebuilding without changing the version leaves the portal showing what is already there.

### What does the error message `Community in data is xxxxx but configured for yyyyy` mean?
This error occurs during testing with `devhost` when your `rootsdk.sqlite3` database file is configured for the wrong community. Root adds the community ID in your `DEV_TOKEN` to your `rootsdk.sqlite3` file. If you move to a different community (by replacing your `DEV_TOKEN`), you need a new database file. You can delete the old database file and Root will recreate it on the next run using the new community ID.

## General

### I built a Bot. Can I turn it into an App?
Not in place. The type is chosen when you register in the [Root Developer Portal](https://dev.rootapp.com) and cannot be changed afterwards, so you register a new App and retire the Bot once the App is ready.

Your server code is a good starting point: move it from `@rootsdk/server-bot` to `@rootsdk/server-app`, then add the client your Bot never had. The App is a separate registration with its own ID and its own storage, so anything your Bot saved stays with the Bot, and communities install the App separately.