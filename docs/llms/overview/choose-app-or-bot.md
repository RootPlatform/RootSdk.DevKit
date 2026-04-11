---
path: overview/choose-app-or-bot.md
audience: both
category: guide
summary: There are two ways to add custom functionality to Root communities: Root Apps and Root Bots.
---

# Choose between a Root App and a Root Bot

There are two ways to add custom functionality to Root communities: Root Apps and Root Bots. A Root App has a full graphical user interface (GUI) while a Root Bot is a classic chatbot that interacts with users only through channel messages.

## How are they similar?

Both Apps and Bots have a server-side component that contains business logic and a database. Each community that installs an App or a Bot gets their own instance of the server and database. The server is hosted inside the Root cloud and the database is automatically backed up by Root.

Apps and Bots can interact with the community that installed them. There's a full API that lets the server monitor activity in the community. For example, the server can register to be notified when members join/leave or when a new message is posted in a channel. It can also use the APIs to ban members, rename the community, or post messages into community channels (assuming it has the necessary permissions). This style of interactivity is the only option available to Bots.

## How are they different?

In addition to a server-side component, Apps also have a client-side GUI. When a community installs an App, a new channel is automatically created. Most of the screen area inside that channel is dedicated for use by the App to render their GUI. Community members enter the channel whenever they want to use the App. The GUI is a full React/TypeScript application so it can handle games, display graphs, show videos, etc.

By contrast, Bots don't have a GUI and don't get their own channel; they don't have any presence on the client side at all. They only way for them to interact with users is for their server to register for community events and use the Root APIs to post messages into community channels.

## Decision criteria

There are two main decision criteria:

1. **User experience**: Apps are more powerful since they have a full GUI.
1. **Coding complexity**: Bots are easier to code because there's no client-side code and no custom client-server networking.

## Example: _Poll_ should be an App

Consider how to add polling functionality to Root. Polling should be an App since it would greatly benefit from GUI.

There could be a _poll-builder_ page to define a new poll. The poll builder could have question templates, drag-drop reordering, and options for displaying the results. Members taking a poll would be able to click to select their answers.

By contrast, it would be painful for a member to create or consume polls by sending text messages to a Bot. Imagine how awkward a text interface for reordering questions and answers would be.

## Example: _Welcome_ should be a Bot

Consider adding an automated welcome message to new community members. Welcome-message should be a bot since it doesn't need a GUI. It simply operates quietly in the background until needed.

To implement the welcome Bot, you would do the following:

1. Register for the `CommunityJoinedEvent` event.
1. Retrieve the new user's ID from the event data.
1. Look up the new user's name based on their user ID.
1. Format a message string containing a _@mention_ to the new user and some welcome text.
1. Post the message into a community channel.