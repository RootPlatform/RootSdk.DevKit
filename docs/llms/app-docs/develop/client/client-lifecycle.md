---
path: app-docs/develop/client/client-lifecycle.md
audience: app
category: guide
summary: Root controls when your App's client starts, when it stops, and when it gets reloaded.
---

> **Worked sample**: `api-samples/client-app-lifecycle/` — Client Lifecycle

# Client lifecycle

Root controls when your App's client starts, when it stops, and when it gets reloaded. This article explains the different phases of the client lifecycle and how Root manages the client for you.

## Container model

The client side of your App runs inside a Chromium browser tab, which itself runs inside the Root native client.

[Diagram: Diagram of an App client running inside a chromium tab which is inside the Root native client]
```
flowchart LR
    subgraph Root Native Client
        subgraph Chromium tab
            you[Your App's client]
        end
    end
```

## Network connection

Your App’s client doesn't connect to the internet directly. All network traffic goes through the Root native client. Root watches the network connection. If it's lost, Root takes over and handles reconnection. Your client doesn't need to manage it.

[Diagram: This diagram shows the relationship between your app's client, the Root native client, and the Internet. The client is nested within a Chromium tab, which is controlled by the Root native client. An arrow shows the client sending a request to the Internet.]
```
flowchart LR
    Internet
    subgraph Root Native Client
        subgraph Chromium tab
            you[Your App's client]
        end
    end
    you -- All traffic goes</br>through Root --> Internet
```

## What is the client lifecycle?

The *client lifecycle* is the set of states your App's client moves through while running inside the Root native client. Root decides when to launch, suspend, or reload the client based on user actions and network conditions.

There are only two states: **NotRunning** and **Running**. The important concepts are what causes your client to transition between the two.

### Normal startup

The user selects the App’s channel. Root creates a new Chromium tab and runs your client code.

[Diagram: Diagram showing a transition from the NotRunning state to the Running state.]
```
flowchart LR
    NotRunning --> Running
```

### Inactivity

If the user stops interacting with the App for several minutes, Root will stop your client and unload the Chromium tab. This helps conserve system resources.

[Diagram: Diagram showing a transition from the Running state to the NotRunning state.]
```
flowchart LR
    Running --> NotRunning
```

### Connectivity loss

If the Root native client loses its network connection, it will unload your client and move it to the *NotRunning* state. Root will keep trying to reconnect. Once the connection is restored, it will automatically reload your client.

[Diagram: Diagram showing a transition from the Running state to the NotRunning state.]
```
flowchart LR
    Running --> NotRunning --> Running
```

## Summary

* Your client runs inside a Chromium tab managed by the Root native client.
* Root starts the client when the user selects your App's channel.
* The client is unloaded if the user is inactive or the network goes down.
* When the network comes back, Root reloads your client automatically.
* You don’t need to manage the browser tab, network status, or reconnect logic, Root handles it for you.