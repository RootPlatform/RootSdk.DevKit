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

### Which programming languages can I use for my server-side code?
TypeScript/JavaScript

## Networking

### Can I use a third-party web service?
Yes, your Root-hosted, server-side code is running on Node and can use standard networking to communicate with third-party web services. Root is investigating how to support secret storage and webhooks to make this process easier; however, these are not currently implemented.

## Test

### How do I test my Bot locally?
The Root SDK includes the `devhost` command that will run your Bot locally on your development machine. You can interact with your Bot using the Root desktop client - the Bot will connect to the community represented by the `DEV_TOKEN` in your `.env` file.

## Troubleshooting

### What does the error message `Community in data is xxxxx but configured for yyyyy` mean?
This error occurs during testing with `devhost` when your `rootsdk.sqlite3` database file is configured for the wrong community. Root adds the community ID in your `DEV_TOKEN` to your `rootsdk.sqlite3` file. If you move to a different community (by replacing your `DEV_TOKEN`), you need a new database file. You can delete the old database file and Root will recreate it on the next run using the new community ID.