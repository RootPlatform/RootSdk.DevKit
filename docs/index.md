# Root Developer Documentation

> Root is a platform for building real-time, multi-user community applications. Developers build Apps (with a React/TypeScript client UI hosted in a Chromium container, plus a server) or Bots (server-only automation). Server code runs in the Root cloud with built-in SQLite persistence and a community API for messaging, moderation, and events. Apps define custom client-server networking using Protobuf. SDKs: `@rootsdk/server-app`, `@rootsdk/server-bot`, `@rootsdk/client`.

## Instructions

- Apps use `@rootsdk/server-app` (server) and `@rootsdk/client` (client). Bots use `@rootsdk/server-bot`.
- TypeScript-first. All examples use TypeScript.
- Server code runs in the Root cloud. Client code runs in a Chromium container.
- For real-time data, use event subscriptions, not polling.
- All async methods return Promises. Use async/await.
- Bots are server-only — same community API as apps, but no client UI.

## How to read these docs

This file is the index. Use it to find the per-page chunk you need under `llms/`, then fetch only that file. Each chunk is small (usually 1–20 KB) and self-contained — fetching one rather than loading a giant bundle keeps your context budget free for actual work.

## Quick Links

- [Choose App or Bot](llms/overview/choose-app-or-bot.md): Not sure which to build? Start here.
- [App Quickstart](llms/app-docs/get-started/index.md): Get your first app running.
- [Bot Quickstart](llms/bot-docs/get-started/index.md): Get your first bot running.

## Concepts

Cross-cutting behaviours, resolution rules, and lifecycle semantics. Load the linked guide when a question is about *how something works* rather than *what types exist*.

- **How packaging works**: When you push, the CLI: → [Manifest `package`](llms/app-docs/configure/manifest-package.md)
- **How the developer log works**: When your server writes to stdout or stderr, Root captures the output and makes it visible in the Developer Portal. → [Developer log](llms/app-docs/debug/logging-developer.md)
- **How Root’s client-server model works**: Root Apps have three main parts that you'll code: → [Plan your App's client-server networking API](llms/app-docs/design/client-server-networking.md)
- **How do permissions work?**: As a developer, you declare the permissions you need, and Root grants them to your code at runtime. → [Choose your permissions](llms/app-docs/design/permissions.md)
- **What is the client lifecycle?**: The *client lifecycle* is the set of states your App's client moves through while running inside the Root native client. → [Client lifecycle](llms/app-docs/develop/client/client-lifecycle.md)
- **How it works**: When a RootServerException is thrown by you or by the Root infrastructure, Root serializes it and sends it across the network to your client. → [Exception handling](llms/app-docs/develop/networking/handle-exceptions.md)
- **How assets work**: The asset lifecycle involves coordination between your client code and server code: → [Assets](llms/app-docs/develop/server/assets.md)
- **How client attachment works**: Understanding the event model helps you choose the right events to subscribe to and predict what your code will receive. → [Client attachment](llms/app-docs/develop/server/client-attachment.md)
- **How access rules work**: When your code creates or modifies access rules, you need to understand how Root combines them with base permissions. → [Access rules](llms/app-docs/develop/server/community-api/access-rules.md)
- **How channels and channel groups work**: Understanding the relationship between channels and groups helps you design permission structures and organize content effectively. → [Channels and channel groups](llms/app-docs/develop/server/community-api/channels.md)
- **How community emojis work**: Understanding the emoji lifecycle helps your code react to changes and keep any local emoji state in sync. → [Community emojis](llms/app-docs/develop/server/community-api/community-emojis.md)
- **How channel files work**: Understanding the file creation process and directory structure helps you build file management features. → [Channel files](llms/app-docs/develop/server/community-api/files.md)
- **How mentions work**: Mentions use a URI-based system that separates *what* is referenced from *how* it's displayed. → [Mentions overview](llms/app-docs/develop/server/community-api/mentions/overview.md)
- **How channel messages work**: Understanding message flow helps you design responsive integrations that react naturally to user activity. → [Channel messages](llms/app-docs/develop/server/community-api/messaging/overview.md)
- **How community access works**: Your server accesses community resources through rootServer.community, which provides specialized clients for each resource type: → [Community access overview](llms/app-docs/develop/server/community-api/overview.md)
- **How voice channel events work**: Apps and bots receive real-time events when voice channel activity occurs. → [Voice channels](llms/app-docs/develop/server/community-api/voice-channels.md)
- **How the community log works**: When your app writes to the community log, Root stores the entry and makes it visible to community members who have the Manage Apps permission. → [Community log](llms/app-docs/develop/server/community-log.md)
- **How member groups work**: Understanding how membership resolves helps you design groups that stay accurate as your community changes. → [Member groups](llms/app-docs/develop/server/member-groups.md)
- **Lifecycle callbacks**: The Root API lets you register two lifecycle callbacks that Root invokes when your server enters the corresponding state. → [Server lifecycle](llms/app-docs/develop/server/server-lifecycle.md)
- **What is the server lifecycle?**: The *lifecycle* is the set of states your server moves through: *NotRunning*, *Starting*, *Started*, and *Stopping*. → [Server lifecycle](llms/app-docs/develop/server/server-lifecycle.md)
- **How Root Apps work**: Root Apps follow a client-server model, which means they have three main parts: → [Root App overview](llms/app-docs/get-started/app-overview.md)
- **How channel files work**: Understanding the directory structure helps you build file management features. → [Channel files](llms/bot-docs/develop/community-api/files.md)

## Worked samples

Hand-curated runnable code in the DevKit. Each sample is a complete project with manifest, README, and source covering one SDK domain.

### Server SDK

- `api-samples/networking-app-services/` — RPC Services
- `api-samples/server-access-rules/` — Access Rules
- `api-samples/server-app-assets/` — Server Assets
- `api-samples/server-app-client-attachment/` — Client Attachment
- `api-samples/server-app-lifecycle/` — App Lifecycle
- `api-samples/server-bot-lifecycle/` — Bot Lifecycle
- `api-samples/server-channel-groups/` — Channel Groups
- `api-samples/server-channels/` — Channels
- `api-samples/server-community/` — Community
- `api-samples/server-community-logs/` — Community Logs
- `api-samples/server-database/` — SQLite Database
- `api-samples/server-directories/` — Channel Directories
- `api-samples/server-emojis/` — Community Emojis
- `api-samples/server-files/` — Channel Files
- `api-samples/server-global-settings/` — Global Settings
- `api-samples/server-invites/` — Member Invites
- `api-samples/server-jobs/` — Job Scheduler
- `api-samples/server-key-value-store/` — Key-Value Store
- `api-samples/server-kick-ban/` — Kick & Ban
- `api-samples/server-member-groups/` — Member Groups
- `api-samples/server-member-roles/` — Member Roles
- `api-samples/server-members/` — Members
- `api-samples/server-messages/` — Channel Messages
- `api-samples/server-roles/` — Community Roles
- `api-samples/server-voice/` — Voice (WebRTC)

### Browser SDK (Apps only)

- `api-samples/client-app-assets/` — Client Assets
- `api-samples/client-app-lifecycle/` — Client Lifecycle
- `api-samples/client-app-theme/` — Client Theme
- `api-samples/client-app-users/` — Client Users

### Patterns

- `api-samples/server-guid-utils/` — GUID Utilities
- `api-samples/server-resilience/` — Resilience

## Overview

Platform overview and getting started.

- [Choose between a Root App and a Root Bot](llms/overview/choose-app-or-bot.md) **[guide]**: There are two ways to add custom functionality to Root communities: Root Apps and Root Bots.

## App Development

Guides for building Root Apps with client UI and server logic.

- [Root App developer home](llms/app-docs/app-home.md) **[guide]**: Welcome to the Root App developer guide. This guide shows you how to build full-featured Apps that run in communities, complete with a user...
- [Configure](llms/app-docs/configure/index.md) **[guide]**: Configure your code to run on the Root platform.
- [Debug](llms/app-docs/debug/index.md) **[guide]**: Tools and features for diagnosing issues in your app or bot.
- [Design](llms/app-docs/design/index.md) **[guide]**: The Root platform enables developers to create powerful automation and integration tools that enhance community collaboration.
- [Root App client development](llms/app-docs/develop/client/index.md) **[guide]**: This section shows you how to build the client. You'll create the UI, connect to your server, and respond to user actions like clicks and file...
- [Develop](llms/app-docs/develop/index.md) **[guide]**: This guide shows you how to build a Root App. You'll write code for the server, build a client UI, and connect them using custom networking.
- [Root App networking development](llms/app-docs/develop/networking/index.md) **[guide]**: This section covers how to create your App's custom client-server networking using the Root SDK tooling and Protobuf.
- [Community access](llms/app-docs/develop/server/community-api/index.md) **[guide]**: This section explains how to interact with the community using the Root API.
- [Mentions](llms/app-docs/develop/server/community-api/mentions/index.md) **[guide]**: Reference users, roles, and channels in messages.
- [Mentions overview](llms/app-docs/develop/server/community-api/mentions/overview.md) **[guide]**: Notify users, reference roles, and link to channels directly within message content.
- [Messaging](llms/app-docs/develop/server/community-api/messaging/index.md) **[guide]**: This section explains how to work with messages in channels using the Root API.
- [Channel messages](llms/app-docs/develop/server/community-api/messaging/overview.md) **[guide]**: Send messages to channels, respond to user activity, and manage message features like reactions and pins.
- [Community access overview](llms/app-docs/develop/server/community-api/overview.md) **[guide]**: The community access API lets your server code read and modify the community where it's installed.
- [Root App server development](llms/app-docs/develop/server/index.md) **[guide]**: This section shows you how to build your App's server. You'll write code to handle client requests, store data, and manage users.
- [Persistence](llms/app-docs/develop/server/persistence/index.md) **[guide]**: This section lists the persistence options and shows how to use each.
- [Root Apps FAQ](llms/app-docs/faq/index.md) **[guide]**
- [Get started](llms/app-docs/get-started/index.md) **[guide]**: These pages will help you get started building a Root App. By the end of this section, you'll be able to:
- [Publish](llms/app-docs/publish/index.md) **[guide]**: This section guides you through how to package and publish your App.
- [App tutorials](llms/app-docs/tutorials/index.md) **[tutorial]**
- [Showdown App tutorial steps](llms/app-docs/tutorials/showdown-app/index.md) **[tutorial]**: Step-by-step guide for the Showdown App tutorial.
- [Tutorial: Showdown App](llms/app-docs/tutorials/showdown-app/overview.md) **[tutorial]**: **Showdown** is a simple, real-time voting App where members choose between two competing options — like _Cats vs.
- [Tasks App tutorial steps](llms/app-docs/tutorials/tasks-app/index.md) **[tutorial]**: Step-by-step guide for the Tasks App tutorial.
- [Tutorial: Tasks App](llms/app-docs/tutorials/tasks-app/overview.md) **[tutorial]**: **Tasks** is a simple Root App with a React UI and backend service for managing a list of shared tasks.

## App API Reference

API reference for Root App development (server and client).

- [Client API Reference](llms/app-api-reference/client/Index.md) **[reference]**
- [Server API Reference](llms/app-api-reference/server/Index.md) **[reference]**

## Bot Development

Guides for building Root Bots (server-side automation).

- [Root Bot developer home](llms/bot-docs/bot-home.md) **[guide]**: Welcome to the Root Bot developer guide. This guide shows you how to build Bots that run server-side in a community, without a user interface.
- [Configure](llms/bot-docs/configure/index.md) **[guide]**: Configure your code to run on the Root platform.
- [Debug](llms/bot-docs/debug/index.md) **[guide]**: Tools and features for diagnosing issues in your app or bot.
- [Design](llms/bot-docs/design/index.md) **[guide]**: The Root platform enables developers to create powerful automation and integration tools that automate community workflows.
- [Community access](llms/bot-docs/develop/community-api/index.md) **[guide]**: This section explains how to interact with the community using the Root API.
- [Mentions](llms/bot-docs/develop/community-api/mentions/index.md) **[guide]**: Reference users, roles, and channels in messages.
- [Mentions overview](llms/bot-docs/develop/community-api/mentions/overview.md) **[guide]**: Notify users, reference roles, and link to channels directly within message content.
- [Messaging](llms/bot-docs/develop/community-api/messaging/index.md) **[guide]**: This section explains how to work with messages in channels using the Root API.
- [Channel messages](llms/bot-docs/develop/community-api/messaging/overview.md) **[guide]**: Send messages to channels, respond to user activity, and manage message features like reactions and pins.
- [Community access overview](llms/bot-docs/develop/community-api/overview.md) **[guide]**: The community access API lets your server code read and modify the community where it's installed.
- [Develop](llms/bot-docs/develop/index.md) **[guide]**: This section guides you through the core parts of the code you'll need for your Bot.
- [Persistence](llms/bot-docs/develop/persistence/index.md) **[guide]**: This section lists the persistence options and shows how to use each.
- [Root Bots FAQ](llms/bot-docs/faq/index.md) **[guide]**
- [Get started](llms/bot-docs/get-started/index.md) **[guide]**: These pages will help you get started building a Root Bot. By the end of this section, you'll be able to:
- [Publish](llms/bot-docs/publish/index.md) **[guide]**: This section guides you through how to package and publish your Bot.
- [Announce Bot tutorial steps](llms/bot-docs/tutorials/announce-bot/index.md) **[tutorial]**: Step-by-step guide for the Announce Bot tutorial.
- [Tutorial: Announce Bot](llms/bot-docs/tutorials/announce-bot/overview.md) **[tutorial]**: In this tutorial, you'll build a Bot that listens for a specific command in a Root community and responds by broadcasting the message to all text...
- [Bot tutorials](llms/bot-docs/tutorials/index.md) **[tutorial]**
- [Welcome Bot tutorial steps](llms/bot-docs/tutorials/welcome-bot/index.md) **[tutorial]**: Step-by-step guide for the Welcome Bot tutorial.
- [Tutorial: Welcome Bot](llms/bot-docs/tutorials/welcome-bot/overview.md) **[tutorial]**: In this tutorial, you'll build a Bot that counts the number of messages each user posts and assigns a special role after they post their 5th message.

## Bot API Reference

API reference for Root Bot development.

- [Bot API Reference](llms/bot-api-reference/Index.md) **[reference]**

## Support

Troubleshooting and support resources.

- [Root developer support](llms/support/support-home.md) **[guide]**: Join the [Root Developers](https://rootapp.gg/developer) community to ask questions and interact with other developers.

## Optional

Individual articles covering configuration, design, development, and tutorials. Can be skipped for shorter context.

- [Manifest `settings`](llms/app-docs/configure/manifest-global-settings.md) **[guide]**: Configurable global settings. They're declared in your manifest and set by community members with the `Manage Apps` permission during and after...
- [Manifest `id`](llms/app-docs/configure/manifest-id.md) **[guide]**: Unique identifier for your project, assigned by the [Root Developer Portal](https://dev.rootapp.com). Required.
- [Manifest overview](llms/app-docs/configure/manifest-overview.md) **[guide]**: Your **manifest file** defines how your code integrates with the Root platform.
- [Manifest `package`](llms/app-docs/configure/manifest-package.md) **[guide]**: Deployment and startup configuration for your app's client and server code. Required.
- [Manifest `permissions`](llms/app-docs/configure/manifest-permissions.md) **[guide]**: Permissions control which parts of the Root Community API your code can use.
- [Manifest `version`](llms/app-docs/configure/manifest-version.md) **[guide]**: Semantic version string for your release. Required.
- [Developer mode](llms/app-docs/debug/developer-mode.md) **[guide]**: Copy entity IDs from the Root client for use in API calls and debugging.
- [Developer log](llms/app-docs/debug/logging-developer.md) **[guide]**: Debug your deployed server code by viewing console output in the Developer Portal.
- [Choose your settings](llms/app-docs/design/app-settings.md) **[guide]**: Decide what your app lets people configure, who can change each thing, and where each value lives.
- [Choose your UI framework](llms/app-docs/design/choose-ui-framework.md) **[guide]**: The client side of a Root App is a regular web app. It runs inside a Chromium-based container and starts by loading your `index.html` file.
- [Plan your App's client-server networking API](llms/app-docs/design/client-server-networking.md) **[guide]**: Root Apps follow a **client-server model** with a **thin client**. Your server does most of the work and is the source of truth for all data.
- [Define your App's features](llms/app-docs/design/define-your-features.md) **[guide]**: Before you write code, take some time to plan. This article walks through standard planning steps, tailored for Root.
- [Handle failures in a real-time environment](llms/app-docs/design/handle-real-time-failures.md) **[guide]**: Real-time software, by its nature, involves rapid data changes and constant synchronization. Networking failures and disconnects will happen.
- [Integrate with the Root platform](llms/app-docs/design/integrate-with-platform.md) **[guide]**: Your App runs inside Root—it should feel like part of Root. That means using the same tools and patterns the platform uses to interact with community...
- [Is your App right for Root?](llms/app-docs/design/is-your-app-right-for-root.md) **[guide]**: **Root Apps** are multi-user applications with real-time updates that are installed into a community.
- [Make your App feel collaborative](llms/app-docs/design/make-collaborative.md) **[guide]**: Collaborative Apps share updates in real time. When one member does something, everyone else sees it right away.
- [Choose your permissions](llms/app-docs/design/permissions.md) **[guide]**: Permissions control which parts of the Root Community API your code can use.
- [Save data early and often](llms/app-docs/design/save-data-early-and-often.md) **[guide]**: All persistent data in your App should be stored on your server.
- [Should your App look like Root?](llms/app-docs/design/should-it-look-like-root.md) **[guide]**: Does your App have its own brand colors? Or do you want to match Root’s colors? Either way works. It's your choice.
- [Client lifecycle](llms/app-docs/develop/client/client-lifecycle.md) **[guide]**: Root controls when your App's client starts, when it stops, and when it gets reloaded.
- [Client project overview](llms/app-docs/develop/client/client-project-overview.md) **[guide]**: This section shows how the client side of a Root App is set up.
- [Design system reference](llms/app-docs/develop/client/design-system-reference.md) **[guide]**: Style your apps to match the Root visual style using CSS color variables, spacing, typography, and component patterns provided by the Root SDK.
- [Root responsive design](llms/app-docs/develop/client/responsive-ui.md) **[guide]**: Root apps are built using modern web technologies like React and TypeScript.
- [Theme mode](llms/app-docs/develop/client/theme-mode.md) **[guide]**: Detect and respond to the user's theme preference in your App client.
- [UI component library](llms/app-docs/develop/client/ui-components.md) **[guide]**: Root provides a library of pre-built UI components designed to integrate seamlessly with the Root platform.
- [Define a service](llms/app-docs/develop/networking/define-service.md) **[guide]**: This article covers how to define your App's networking services.
- [Generate a service](llms/app-docs/develop/networking/generate-service.md) **[guide]**: This article covers how to use the Root tooling to generate your App's networking code from your protobuf definition.
- [Exception handling](llms/app-docs/develop/networking/handle-exceptions.md) **[guide]**: `RootServerException` is a special exception type that's thrown on the server and caught on the client.
- [Implement the server side of a service](llms/app-docs/develop/networking/implement-service.md) **[guide]**: This article covers how to implement the server side of your App's networking services.
- [Plan your services](llms/app-docs/develop/networking/plan-services.md) **[guide]**: This article covers the concepts you'll use when planning your App's networking services.
- [Use a service from the client side](llms/app-docs/develop/networking/use-service.md) **[guide]**: This article covers how to use a service in the client side of your App.
- [Assets](llms/app-docs/develop/server/assets.md) **[guide]**: Convert temporary upload tokens into permanent file references that your app can store and use later.
- [Client attachment](llms/app-docs/develop/server/client-attachment.md) **[guide]**: Track when community members are actively viewing your app.
- [Access rules](llms/app-docs/develop/server/community-api/access-rules.md) **[guide]**: Override channel and channel group permissions for specific roles or members.
- [API structure](llms/app-docs/develop/server/community-api/api-structure.md) **[guide]**: This reference describes how the community access API is organized.
- [Channels and channel groups](llms/app-docs/develop/server/community-api/channels.md) **[guide]**: Organize community content into channels and group related channels together.
- [Community emojis](llms/app-docs/develop/server/community-api/community-emojis.md) **[guide]**: Manage custom emojis that members use in community messages.
- [Error handling](llms/app-docs/develop/server/community-api/error-handling.md) **[guide]**: This reference describes how to handle errors from the community access API.
- [Channel files](llms/app-docs/develop/server/community-api/files.md) **[guide]**: Organize and manage files within channels using directories and file metadata.
- [Get started with community access](llms/app-docs/develop/server/community-api/get-started.md) **[guide]**: This guide walks you through the core patterns for using the community access API: subscribing to events and calling methods.
- [Create mentions](llms/app-docs/develop/server/community-api/mentions/create-mentions.md) **[guide]**: Include mentions in your messages so they appear as highlighted, clickable text in Root clients.
- [Read mentions](llms/app-docs/develop/server/community-api/mentions/read-mentions.md) **[guide]**: Extract mention data from messages your code receives to identify referenced users, roles, and channels.
- [Message attachments](llms/app-docs/develop/server/community-api/messaging/attachments.md) **[guide]**: Send and receive messages with file attachments.
- [Message replies](llms/app-docs/develop/server/community-api/messaging/replies.md) **[guide]**: Send messages that reference other messages, creating conversational context for your responses.
- [Moderation](llms/app-docs/develop/server/community-api/moderation.md) **[guide]**: Build automated moderation tools that manage members, moderate content, and control voice channels.
- [Permission update events](llms/app-docs/develop/server/community-api/permission-update-events.md) **[guide]**: Some API operations trigger side effects that modify other resources. This article explains why this happens and how to handle it.
- [Rate limits](llms/app-docs/develop/server/community-api/rate-limits.md) **[guide]**: Stay under the community API's rate limits with pacing and retry-with-backoff.
- [Voice channels](llms/app-docs/develop/server/community-api/voice-channels.md) **[guide]**: Monitor and moderate voice channel participants.
- [Community log](llms/app-docs/develop/server/community-log.md) **[guide]**: Send diagnostic messages from your app server to the administrators of a Root community.
- [GUIDs](llms/app-docs/develop/server/guids.md) **[guide]**: Identify entities in the Root SDK using typed, base64-encoded string identifiers.
- [Root Job scheduler](llms/app-docs/develop/server/job-scheduler.md) **[guide]**: The Root `JobScheduler` is an API for scheduling tasks that need to execute at future date(s).
- [Member groups](llms/app-docs/develop/server/member-groups.md) **[guide]**: A member group combines users and community roles into a named audience you can use for targeting broadcasts and organizing custom access control.
- [Choose your approach: persistence](llms/app-docs/develop/server/persistence/persistence-choose-approach.md) **[guide]**: Root supports two ways to store persistent data in your server: a **key-value store** and a **SQLite database**.
- [Key-value store persistence](llms/app-docs/develop/server/persistence/persistence-key-value-store.md) **[guide]**: The [KeyValueStore](llms/app-api-reference/server/type-aliases/KeyValueStore.md) type stores your data as key-value pairs.
- [SQLite persistence](llms/app-docs/develop/server/persistence/persistence-sqlite.md) **[guide]**: Use a **SQLite** database to store your structured data persistently.
- [Server lifecycle](llms/app-docs/develop/server/server-lifecycle.md) **[guide]**: Your server runs in the Root cloud, and Root manages when it starts, stops, and restarts.
- [Server project overview](llms/app-docs/develop/server/server-project-overview.md) **[guide]**: This section covers how to set up and work with the server side of a Root App.
- [Root App overview](llms/app-docs/get-started/app-overview.md) **[guide]**: A **Root App** (App) is a full-featured software application that brings new functionality to a Root community.
- [Build your Root App](llms/app-docs/get-started/build-your-app.md) **[guide]**: Building an App with Root requires a few key steps to set up your App's test environment and compile your project.
- [Generate App starter code](llms/app-docs/get-started/generate-app-starter-code.md) **[guide]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Set up Root and your dev machine](llms/app-docs/get-started/setup-root-and-dev-machine.md) **[guide]**: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
- [Test your Root App](llms/app-docs/get-started/test-your-app.md) **[guide]**: Root supports testing your App locally. Both your App's client and server are hosted on your local machine.
- [What's next?](llms/app-docs/get-started/whats-next.md) **[guide]**: You're ready to start building. Your dev setup is done, your Root account is active, and you've seen how Root code is organized.
- [Package your code](llms/app-docs/publish/package.md) **[guide]**: The `rootsdk build package` command packages your compiled code for distribution. It creates a `.pkg` file based on your `root-manifest.json`.
- [Register your App](llms/app-docs/publish/register.md) **[guide]**: To register your App with Root, create a project for it in the Root Developer Portal.
- [Upload your code](llms/app-docs/publish/upload.md) **[guide]**: The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and a valid authentication token.
- [Generate and test App starter code](llms/app-docs/shared/generate-build-test-app.md) **[guide]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Add voting support](llms/app-docs/tutorials/showdown-app/add-vote.md) **[tutorial]**: In this section, you'll add voting support. The UI will have two buttons.
- [Broadcast new votes](llms/app-docs/tutorials/showdown-app/broadcast-votes.md) **[tutorial]**: In this section, you'll notify all other clients whenever one client adds a vote.
- [Generate and test App starter code](llms/app-docs/tutorials/showdown-app/generate-build-test-app.md) **[tutorial]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Initial state](llms/app-docs/tutorials/showdown-app/initial-state.md) **[tutorial]**: You'll store the number of votes for each option on your server. The number of votes for each will start at zero and go up as clients vote.
- [Set up Root and your dev machine](llms/app-docs/tutorials/showdown-app/setup-root-and-dev-machine.md) **[tutorial]**: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
- [Generate and test App starter code](llms/app-docs/tutorials/tasks-app/generate-build-test-app.md) **[tutorial]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [In-memory storage](llms/app-docs/tutorials/tasks-app/in-memory.md) **[tutorial]**: In this section, you'll build the _Tasks_ App with in-memory storage in your server.
- [SQLite storage with Knex](llms/app-docs/tutorials/tasks-app/knex.md) **[tutorial]**: In this section, you'll store the tasks in SQLite. Recall that SQLite is built-in to Root and is always available on your server side.
- [SQLite storage with Prisma](llms/app-docs/tutorials/tasks-app/prisma.md) **[tutorial]**: In this section, you'll use Prisma to store tasks in SQLite. **Prisma** is a TypeScript ORM for Node.js that simplifies database access by providing...
- [Set up Root and your dev machine](llms/app-docs/tutorials/tasks-app/setup-root-and-dev-machine.md) **[tutorial]**: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
- [Manifest `settings`](llms/bot-docs/configure/manifest-global-settings.md) **[guide]**: Configurable global settings. They're declared in your manifest and set by community members with the `Manage Apps` permission during and after...
- [Manifest `id`](llms/bot-docs/configure/manifest-id.md) **[guide]**: Unique identifier for your project, assigned by the [Root Developer Portal](https://dev.rootapp.com). Required.
- [Manifest overview](llms/bot-docs/configure/manifest-overview.md) **[guide]**: Your **manifest file** defines how your code integrates with the Root platform.
- [Manifest `package`](llms/bot-docs/configure/manifest-package.md) **[guide]**: Deployment and startup configuration for your bot. Required.
- [Manifest `permissions`](llms/bot-docs/configure/manifest-permissions.md) **[guide]**: Permissions control which parts of the Root Community API your code can use.
- [Manifest `version`](llms/bot-docs/configure/manifest-version.md) **[guide]**: Semantic version string for your release. Required.
- [Developer mode](llms/bot-docs/debug/developer-mode.md) **[guide]**: Copy entity IDs from the Root client for use in API calls and debugging.
- [Developer log](llms/bot-docs/debug/logging-developer.md) **[guide]**: Debug your deployed server code by viewing console output in the Developer Portal.
- [Choose your settings](llms/bot-docs/design/bot-settings.md) **[guide]**: Decide what your bot lets a community configure and who can configure it.
- [Define your Bot's features](llms/bot-docs/design/define-your-features.md) **[guide]**: Before you write code, take time to plan. This article covers key planning steps tailored for Root Bots.
- [Is Your Bot Right for Root?](llms/bot-docs/design/is-your-bot-right-for-root.md) **[guide]**: Root Bots let you add community features without building a GUI. Bots rely entirely on Root's built-in UI and API for user interaction.
- [Choose your permissions](llms/bot-docs/design/permissions.md) **[guide]**: Permissions control which parts of the Root Community API your code can use.
- [Plan your Bot’s communication with the community](llms/bot-docs/design/plan-community-communication.md) **[guide]**: Even without a user interface, your Bot needs a clear communication plan. That includes deciding what to say, who to say it to, and how to send it.
- [Save data early and often](llms/bot-docs/design/save-data-early-and-often.md) **[guide]**: Your Bot automatically gets a SQLite database. Use it to store anything important.
- [Bot project overview](llms/bot-docs/develop/bot-project-overview.md) **[guide]**: This section covers how to set up and work with a Root Bot. You'll see how the project is structured, what tools it uses, and how to run it locally...
- [Access rules](llms/bot-docs/develop/community-api/access-rules.md) **[guide]**: Override channel and channel group permissions for specific roles or members.
- [API structure](llms/bot-docs/develop/community-api/api-structure.md) **[guide]**: This reference describes how the community access API is organized.
- [Channels and channel groups](llms/bot-docs/develop/community-api/channels.md) **[guide]**: Organize community content into channels and group related channels together.
- [Community emojis](llms/bot-docs/develop/community-api/community-emojis.md) **[guide]**: Manage custom emojis that members use in community messages.
- [Error handling](llms/bot-docs/develop/community-api/error-handling.md) **[guide]**: This reference describes how to handle errors from the community access API.
- [Channel files](llms/bot-docs/develop/community-api/files.md) **[guide]**: Read and manage files within channels using directories and file metadata.
- [Get started with community access](llms/bot-docs/develop/community-api/get-started.md) **[guide]**: This guide walks you through the core patterns for using the community access API: subscribing to events and calling methods.
- [Create mentions](llms/bot-docs/develop/community-api/mentions/create-mentions.md) **[guide]**: Include mentions in your messages so they appear as highlighted, clickable text in Root clients.
- [Read mentions](llms/bot-docs/develop/community-api/mentions/read-mentions.md) **[guide]**: Extract mention data from messages your code receives to identify referenced users, roles, and channels.
- [Message attachments](llms/bot-docs/develop/community-api/messaging/attachments.md) **[guide]**: Send and receive messages with file attachments.
- [Message replies](llms/bot-docs/develop/community-api/messaging/replies.md) **[guide]**: Send messages that reference other messages, creating conversational context for your responses.
- [Moderation](llms/bot-docs/develop/community-api/moderation.md) **[guide]**: Build automated moderation tools that manage members, moderate content, and control voice channels.
- [Permission update events](llms/bot-docs/develop/community-api/permission-update-events.md) **[guide]**: Some API operations trigger side effects that modify other resources. This article explains why this happens and how to handle it.
- [Rate limits](llms/bot-docs/develop/community-api/rate-limits.md) **[guide]**: Stay under the community API's rate limits with pacing and retry-with-backoff.
- [Voice channels](llms/bot-docs/develop/community-api/voice-channels.md) **[guide]**: Monitor and moderate voice channel participants.
- [GUIDs](llms/bot-docs/develop/guids.md) **[guide]**: Identify entities in the Root SDK using typed, base64-encoded string identifiers.
- [Root Job scheduler](llms/bot-docs/develop/job-scheduler.md) **[guide]**: The Root `JobScheduler` is an API for scheduling tasks that need to execute at future date(s).
- [Member groups](llms/bot-docs/develop/member-groups.md) **[guide]**: A member group combines users and community roles into a named audience you can use for targeting broadcasts and organizing custom access control.
- [Choose your approach: persistence](llms/bot-docs/develop/persistence/persistence-choose-approach.md) **[guide]**: Root supports two ways to store persistent data in your server: a **key-value store** and a **SQLite database**.
- [Key-value store persistence](llms/bot-docs/develop/persistence/persistence-key-value-store.md) **[guide]**: The [KeyValueStore](llms/bot-api-reference/type-aliases/KeyValueStore.md) type stores your data as key-value pairs.
- [SQLite persistence](llms/bot-docs/develop/persistence/persistence-sqlite.md) **[guide]**: Use a **SQLite** database to store your structured data persistently.
- [Server lifecycle](llms/bot-docs/develop/server-lifecycle.md) **[guide]**: Your server runs in the Root cloud, and Root manages when it starts, stops, and restarts.
- [Root Bot overview](llms/bot-docs/get-started/bot-overview.md) **[guide]**: A **Root Bot** is a software application that extends the functionality of Root communities.
- [Build your Root Bot](llms/bot-docs/get-started/build-your-bot.md) **[guide]**: Building a Bot with Root requires a few key steps to set up your Bot's test environment and compile your project.
- [Generate Bot starter code](llms/bot-docs/get-started/generate-bot-starter-code.md) **[guide]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Set up Root and your dev machine](llms/bot-docs/get-started/setup-root-and-dev-machine.md) **[guide]**: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
- [Test your Root Bot](llms/bot-docs/get-started/test-your-bot.md) **[guide]**: Root supports testing your Bot locally. Your Bot still needs a valid `DEV_TOKEN` because execution isn't fully local.
- [What's next?](llms/bot-docs/get-started/whats-next.md) **[guide]**: You're ready to start building. Your dev setup is done, your Root account is active, and you've seen how Root code is organized.
- [Package your code](llms/bot-docs/publish/package.md) **[guide]**: The `rootsdk build package` command packages your compiled code for distribution. It creates a `.pkg` file based on your `root-manifest.json`.
- [Register your Bot](llms/bot-docs/publish/register.md) **[guide]**: To register your Bot with Root, create a project for it in the Root Developer Portal.
- [Upload your code](llms/bot-docs/publish/upload.md) **[guide]**: The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and a valid authentication token.
- [Generate and test Bot starter code](llms/bot-docs/shared/generate-build-test-bot.md) **[guide]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Add member nickname](llms/bot-docs/tutorials/announce-bot/add-member-nickname.md) **[tutorial]**: In this section, the main goal is to include the member's nickname in your Bot's response. But first, you'll change the command your Bot looks for.
- [Generate and test Bot starter code](llms/bot-docs/tutorials/announce-bot/generate-build-test-bot.md) **[tutorial]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Send to all text channels](llms/bot-docs/tutorials/announce-bot/send-to-all-channels.md) **[tutorial]**: Currently, your Bot sends its response only to the same channel as the incoming message.
- [Set up Root and your dev machine](llms/bot-docs/tutorials/announce-bot/setup-root-and-dev-machine.md) **[tutorial]**: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
- [Programmatically assign the role](llms/bot-docs/tutorials/welcome-bot/assign-role.md) **[tutorial]**: The _Participant_ role appears inside the community as a text string.
- [Create a new role in your community](llms/bot-docs/tutorials/welcome-bot/create-community-role.md) **[tutorial]**: Recall that this Bot is a simplified version of typical community management software.
- [Generate and test Bot starter code](llms/bot-docs/tutorials/welcome-bot/generate-build-test-bot.md) **[tutorial]**: Root supplies a command-line utility named `create-root` that generates starter code.
- [Set up Root and your dev machine](llms/bot-docs/tutorials/welcome-bot/setup-root-and-dev-machine.md) **[tutorial]**: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
- [Store the message count for each member](llms/bot-docs/tutorials/welcome-bot/store-message-count.md) **[tutorial]**: You need to store the number of messages each member posts. To make sure your code works even if your Bot restarts, you should use the Root API's...
