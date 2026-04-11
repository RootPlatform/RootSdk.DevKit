---
path: bot-docs/get-started/bot-overview.md
audience: bot
category: guide
summary: A **Root Bot** is a software application that extends the functionality of Root communities.
---

# Root Bot overview

A **Root Bot** is a software application that extends the functionality of Root communities. Developers build Root Bots and publish them to the Root Store. Community administrators then install Bots from the Store into their communities. A Bot runs as server-only without any client-side graphical user interface (GUI) in the community.

## Analogy

Before we get into the details of Root, let's think about how you'd build a _welcome_ bot for a typical community platform. The bot will listen for new members that join the community and send them a greeting. This will give some intuition that'll help with Root Bots.

The welcome bot will be _headless_ meaning that it won't have a client-side graphical user interface. All the bot code will run in a server component, and it'll use the community API to take in commands and output results.

The core server operations would be:

- **Subscribe:** Use the platform API to register for an event like _new-member-joined_.
- **Process:** Record each new member in a database along with a timestamp for when they joined.
- **Respond:** Use the platform API to send a welcome message to the new member.

It's your job to write all this code. You're also responsible for setting up a computer somewhere to run your server; it's common to pay a cloud computing provider to host your server.

Root Bots work the same way with two nice simplifications: Root gives you the database and hosts your server for you.

## Bot architecture

A Root Bot has a server that processes business logic and persists data. The server is written in TypeScript and runs on Node inside the Root cloud. You'll have access to most core Node.js modules (with some security limitations). You can also pull in third-party packages from registries like [npm](https://www.npmjs.com/).

Root Bots use **SQLite** for persistent data storage. It's all set up for you; Root even tracks your Bot's data file and provides automatic backup/restore. You can pull in the standard SQLite API **sqlite3** to access your database, or you can add a third-party ORM like **sequelize**.

## Root SDK

Root provides the **Root SDK** to help you build Bots:

- **Root API**: A TypeScript library for persistence, community and member access, exception handling, and more.
- **Test support**: A host to run your Bot locally for testing.

## Community access

The only way for Bots to communicate with the community where they're installed is via the Root API. Your Bot can do (almost) everything in a community that human members can. For example, your code can:

* Create a message in a channel.
* Moderate channel messages.
* Upload a file to a channel.
* Invite users to join.
* Modify community settings like assign member roles.
* Receive an event when a new member joins the community.
* Receive an event when a message is posted to a channel.
* Etc.

## Bot installation

When an administrator installs a Bot into their community, Root creates a single instance of the Bot that serves all members of the community. The Bot instance gets its own SQLite data file that's used only for that community. If another community installs the same Bot, that new community gets their own instance of the Bot and their own SQLite data file.

## Bot execution

Root Bots run in a **containerized environment** hosted by Root. For testing, Root supplies a host you can run on your local machine. In production, your Bot will run inside the Root cloud. You never need to provision your own cloud server to run your Bot.