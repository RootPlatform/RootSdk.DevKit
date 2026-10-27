---
path: app-docs/develop/client/app-links.md
audience: app
category: guide
summary: Create a shareable link to a specific place inside your App, so a member can post it in a channel and send other members straight there.
---

# App links

Create a shareable link to a specific place inside your App, so a member can post it in a channel and send other members straight there.

## What are App links?

An *App link* is a URL that opens your App at a particular screen. You create one by passing a relative URL to `rootClient.links.createAppLink`, which returns the shareable link.

```ts
import { rootClient } from '@rootsdk/client-app';

const link = await rootClient.links.createAppLink(`/project/${projectId}/task/${taskId}`);
```

The relative URL is a route in your own App. Everything else that identifies the destination (the community, the App, and the App's installation in that community) is supplied by the Root client, because your App runs sandboxed and does not know those values.

The returned string is a complete URL. Treat it as opaque: the format is owned by Root and may change, so always obtain a link from `createAppLink` rather than building one by hand.

An App link points inside your own App. There is no API for creating a link to another website, or to a different App.

> **Note:** App links are a client-side capability, available on `rootClient.links`. Bots have no client interface, so they cannot create App links.
## How App links work

Members share App links by pasting them into a channel, so what your link does depends on where it lands and who reads it.

### The relative URL must be a full route path

The URL is resolved against your App's own router, and it must include every parent route segment. A route defined with `path: '/task/$taskId'` that is a child of a project route is not reachable at `/task/123`. The working link is `/project/456/task/123`.

Follow the `getParentRoute` chain in your router when you build the link. Reading the `path` string alone produces a link that is created successfully, copies cleanly, and then lands the member on your App's not-found screen.

This is the same rule that applies to the `relativeUrl` of a notification. See [Notifications](../server/community-api/notifications.md).

### What a member sees when a link is pasted

When an App link is pasted into a message, the Root client recognizes it and displays it as a chip naming the target channel, rather than as a raw URL. Selecting it opens the community, selects the channel your App occupies, and takes your App to the relative URL. If your App is not already running, the relative URL becomes its start URL.

The chip is only shown to a member who can see the channel your App occupies. A member without access to that channel sees the plain URL text instead, and the link does nothing for them. Keep this in mind when your App's channel is more restricted than the channel members are likely to paste into.

### Your App must be reachable at the destination

Opening a link drives your App to the relative URL, but it does not grant the member anything. Your App still applies its own permission checks at that screen. Write the destination route so it handles a member who arrives without access to the record, rather than assuming every arrival is legitimate.

## When to use App links

- **Add a share action**: Give a record in your App (a task, a document, a post) a control that copies a link to it, so members can discuss it in a channel.
- **Point at a screen from a notification**: Use the `relativeUrl` of a notification instead. It takes the same relative URL and needs no separate link.
- **Return a member to their previous place**: Use `rootClient.lifecycle.restart` with a relative URL. That navigates the running client and does not produce a shareable link.

## Copy a link to the clipboard

`createAppLink` returns the URL, it does not copy it. Your client copies it with the browser clipboard API:

```ts
async function copyTaskLink(projectId: string, taskId: string) {
  const link = await rootClient.links.createAppLink(`/project/${projectId}/task/${taskId}`);
  await navigator.clipboard.writeText(link);
}
```

Handle failure on both calls. `createAppLink` is answered by the Root client, so treat a call that does not return as a failure your UI recovers from, rather than leaving a control disabled while it waits. `navigator.clipboard` is unavailable outside a secure context and its write can be rejected, so report the problem to the member rather than failing silently.

## Troubleshooting

1. **The member lands on a not-found screen**: The relative URL is missing a parent route segment. Build it from the `getParentRoute` chain, not from a single route's `path`.
2. **The link shows as plain text instead of a chip**: The reader cannot see the channel your App occupies, or the link was pasted into a different community.
3. **The link opens the community but not your App**: The Root client could not resolve your App's channel in that community, and fell back to opening the community alone.