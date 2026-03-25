---
path: app-docs/design/client-server-networking.md
audience: app
category: guide
summary: Root Apps follow a **client-server model** with a **thin client**. Your server does most of the work and is the source of truth for all data.
---

# Plan your App's client-server networking API

Root Apps follow a **client-server model** with a **thin client**. Your server does most of the work and is the source of truth for all data. You define a networking API, so clients can send actions to the server and receive updates in return.

By the end of this article, you’ll be able to:

- **Identify** your request-response methods
- **Identify** your broadcast methods
- **Group** methods into services

## How Root’s client-server model works

Root Apps have three main parts that you'll code:

- **Client** – Runs inside Root on the member’s device and handles the UI and user input. It sends requests to the server and listens for broadcasts.
- **Networking** – Your client-server API. Root handles the transport, so you don’t worry about connections, routing, or serialization.
- **Server** – Runs in the Root cloud and handles all logic and data storage. It serves a single community; every client in that community talks to the same server.

In this article, we'll discuss the networking portion of your App.

[Image: Diagram of the three components of a Root App: client, networking, and server with the networking portion highlighted.]

## Plan your networking API

Root supports two communication patterns: **request-response** and **broadcast**, and you'll need both in your App. We'll use two example Root Apps throughout this article to illustrate the patterns:

- **SuggestionBox:** lets members post and vote on ideas.
- **Poker:** models a turn-based card game with complex state and real-time events.

### Request-response methods

In this pattern, the client starts the conversation:

1. The client sends a request.  
2. The server handles the request, often by updating or reading data.  
3. The server sends back a result or an error.

To design your methods, start with the data the client needs when it starts. For example, it's common to have a `list()` or `getAll()` method that the client calls when it launches. Next, map each user action to a request-response method.

In **SuggestionBox**, the users can add new suggestions, edit/delete their own suggestions, and vote on their favorites. You'd create a request-response method for each of these actions. In addition, you'd want to provide a `list()` method the clients use to fetch all current suggestions at startup.

The **Poker** App is similar: every game action—join a table, place a bet, draw a card—triggers a request to the server, and you'd want a method to support each.

### Broadcast methods

In this pattern, the server pushes updates to clients:

1. You decide when to broadcast—typically after a client action or when a timer expires.  
2. You pick the audience: everyone, a filtered group, or everyone except a few.  
3. Root sends the message to those clients; you don't need to write the broadcast logic or code.

In **SuggestionBox**, the server uses broadcast methods to keep all clients in sync with new suggestions and new votes. For example, when someone adds a new suggestion, the server broadcasts it to all other clients, so the new suggestion appears on everyone's screen. Voting uses the same pattern: when someone votes on their favorite suggestion, that update is broadcast to all other clients.

The **Poker** App is similar in that the server uses broadcast to ensure all players see the up-to-date state of the game. For example, after a player draws a card or places a bet, the server broadcasts the update so all players can see the correct game state.

## Organize your methods into services

Keep things clean by grouping related methods into logical services. It's typical for a single Root App to have multiple services, each tightly focused on one area. In the **SuggestionBox** example, you'd likely have two services: one for suggestions and one for voting.

[Image: Diagram showing the Suggestion Service and Vote Service running in the cloud with their broadcast methods available.]

## Conclusion

Whether you're building a collaborative tool like **SuggestionBox** or a real-time experience like **Poker**, a well-structured networking API will make your App easier to evolve as it grows. Identify your requests and broadcasts, group your methods into focused services, and let Root handle the rest.