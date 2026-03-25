---
path: app-docs/faq/index.md
audience: app
category: guide
---

# Root Apps FAQ

## Hosting

### Can I host my own external web service?
Yes, you can create and host your own external web service outside of Root. Your Root-hosted, server-side code can communicate with your external web service.

### Can I self-host?
You can't fully self-host. Your server-side code needs to be hosted by Root and run inside the Root cloud.

## Server-side development

### Which programming languages can I use for my server-side code?
TypeScript/JavaScript

## Client-side development

### Which programming languages can I use for my client-side code?
TypeScript/JavaScript

## Networking

### Can I use a third-party web service?
Yes, your Root-hosted, server-side code is running on Node and can use standard networking to communicate with third-party web services. Root is investigating how to support secret storage and webhooks to make this process easier; however, these are not currently implemented.

## Test

### How do I test my App locally?
The Root SDK includes the `devhost` command that will run the server side of your App locally on your development machine. The client side of your App will run in a web browser. It's not yet possible to test your App's GUI inside the Root desktop client.

## Troubleshooting

### What does the error message `Community in data is xxxxx but configured for yyyyy` mean?
This error occurs during testing with `devhost` when your `rootsdk.sqlite3` database file is configured for the wrong community. Root adds the community ID in your `DEV_TOKEN` to your `rootsdk.sqlite3` file. If you move to a different community (by replacing your `DEV_TOKEN`), you need a new database file. You can delete the old database file and Root will recreate it on the next run using the new community ID.