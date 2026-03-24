---
path: app-docs/design/save-data-early-and-often.md
audience: app
category: guide
summary: All persistent data in your App should be stored on your server.
---

# Save data early and often

All persistent data in your App should be stored on your server. Don’t rely on the client to keep anything important—send it to the server right away. This prevents data loss if the client or server restarts.

By the end of this article, you’ll be able to:

- **Plan** how your client loads data at startup  
- **Decide** what data to save on the server  
- **Identify** when to send data from the client to the server  

## Why you need to save data to the server

Your App has no built-in client-side storage. That’s intentional. Root gives your server a SQLite database and a key-value store for persistent data, and Root automatically handles backup and restore.

Root Apps are designed around a single server and many clients. Storing all data on the server keeps things simple and consistent. The server holds your data and runs your business logic. The client is mostly just UI—it sends data to the server to be saved.

## Step 1: Load all data when the client starts

Your client always starts empty. It needs to pull data from the server as soon as it launches.

You’ll write code to make this happen. Most Apps have networking methods like `getAll` or `list`. A typical startup flow looks like this:

1. A member opens your App.  
2. The client calls a `list` method.  
3. The server queries its SQLite database.  
4. The server returns the data as an array.  
5. The client updates its UI.

Root’s tooling handles networking, including serialization and deserialization, so you only write the logic.

## Step 2: Decide what to store

Store any data the client creates that you don’t want to lose.

That includes obvious cases like member actions—creating, editing, or joining something. For example, in a Raid Planner App, you'd save a new raid or a member’s participation right away.

There’s also a gray area: partially completed actions. Suppose a member starts creating a raid but doesn’t finish. Should you save it? Storing partial data adds complexity, but it may improve the user experience by avoiding data loss.

## Step 3: Decide when to save

You don’t control when the client or server starts or stops. The Root platform handles that.

Clients may shut down if a member exits Root or reboots their device. Servers may restart if Root moves your App to a new cloud cluster or if the server crashes. You'll get a few seconds warning if Root shuts down your server, however, if you'll get none if your server crashes.

Because of this, save important data as soon as possible. This ensures the data will be available later, even if the user opens the App from a different device or after a long break.

## Example: SuggestionBox

- **Launch:** The client requests all suggestions from the server and displays them.
- **Completed tasks:** The client sends new suggestions and votes to the server right away. The server stores them in SQLite and broadcasts updates to other clients.
- **In-progress tasks:** The App doesn't store in-progress tasks. A suggestion is usually just one line of text. It’s reasonable to skip saving partial suggestions—losing that small amount of data isn’t a big deal if the client shuts down before submission.

## Conclusion

Save data early. Save data often. In a Root App, the server is the source of truth. By pushing data to the server immediately and pulling all state on startup, your App stays reliable—even when clients or servers restart without warning.