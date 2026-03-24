---
path: app-docs/develop/networking/implement-service.md
audience: app
category: guide
summary: This article covers how to implement the server side of your App's networking services.
---

# Implement the server side of a service

This article covers how to implement the server side of your App's networking services.

[Diagram: Diagram of the five steps to create a service: plan, define, generate, implement, use. The implement step is highlighted.]
```
graph LR
    A[Plan] --> B[Define]
    B --> C[Generate]
    C --> D[Implement]
    D --> E[Use]
    classDef highlight stroke-width:5px;
    class D highlight;
```

## Overview

Root processes each of your protobuf services to generate server-side code and puts it in your `networking/gen/server/src` folder. The Root-generated code is incomplete; you'll need to finish it.

What Root generates:

1. A class for your service.
1. Abstract method for each request-response method.
1. Fully implemented broadcast methods.

What you code:

1. Class that extends the generated class.
1. Implementation of each abstract method.
1. Registration of an instance of your class.

## Root-generated server-side code

Let's look at the code Root generates. We'll use the create operation from the `SuggestionService` as our example.

```protobuf
service SuggestionService {
  rpc Create(SuggestionCreateRequest) returns (SuggestionCreateResponse);

  rpc BroadcastCreated(SuggestionCreatedEvent) returns (rootsdk.Void);

  // ...
}
```

Here's the complete code that Root generates for the class and create methods. We'll go through this step-by-step below.

```ts
export abstract class SuggestionServiceBase implements RootServerService {
  abstract create(request: SuggestionCreateRequest, client: Client): Promise<SuggestionCreateResponse>;

  public broadcastCreated(message: SuggestionCreatedEvent, clients: BroadcastClientMerged, except?: DeviceContext) {
    // Method is fully implemented (not shown) ...
  }

  // ...
}
```

### Class generation

First, Root processes the service itself.

```protobuf
service SuggestionService {
  // ...
}
```

Root generates an abstract class for your service. The name of the class is your service name with `Base` added.

```ts
export abstract class SuggestionServiceBase implements RootServerService {
  // ...
}
```

### Request-response method generation

Next, Root processes your request-response methods.

```protobuf
service SuggestionService {
  rpc Create(SuggestionCreateRequest) returns (SuggestionCreateResponse);
  // ...
```

For request-response methods, Root generates an abstract method (`create` in this case). You extend the class and implement the method; this gives you a place to put your server-side business logic. For example, in your implementation of the `create` method you'd likely generate a unique ID for the new suggestion and add it to your database.

```ts
export abstract class SuggestionServiceBase implements RootServerService {
  abstract create(request: SuggestionCreateRequest, client: Client): Promise<SuggestionCreateResponse>;
  // ...
}
```

Request-response methods have two parameters:

#### `request` parameter

The request object sent from the client as defined in your protobuf.

#### `client` parameter

The client that made the incoming call. Inside is the client's `userID` and information about the device(s) they're currently using. It's common to pull out the `userId` and store it in your database to document who made the call. For example, when **SuggestionBox** creates a new suggestion, it records the `userId` of the member that created that suggestion.

### Broadcast method generation

Finally, Root processes your broadcast methods.

```protobuf
service SuggestionService {
  rpc BroadcastCreated(SuggestionCreatedEvent) returns (rootsdk.Void);
  // ...
}
```

The tooling fully implements your server-side broadcast methods. The methods are placed in the generated base class so they'll be available when you extend the base. Typically, you'd call the `broadcastCreated` method from inside your implementation of `create`.

```ts
export abstract class SuggestionServiceBase implements RootServerService {
  public broadcastCreated(message: SuggestionCreatedEvent, clients: BroadcastClientMerged, except?: DeviceContext) {
    // Method is fully implemented (not shown) ...
  }
```

Broadcast methods have three parameters:

#### `message` parameter

The data payload you send to your clients as defined in your protobuf.

#### `clients` parameter

This determines the set of clients that will receive your broadcast. You have a few options on what to pass here:

- The string `"all"` to send to all connected users on all their devices.
- An array of `Client` objects to send to specific clients. If a single user is connected on multiple devices, they'll receive the broadcast on all their devices.
- An array of `ClientContext` objects to send to specific devices.

#### `except` parameter

The `except` parameter is a single `DeviceGuid` to be exempted from the broadcast. It's useful because users can connect simultaneously on multiple devices. Each connection will have the same `userId` but a different `DeviceGuid`.

A common strategy is to exempt the user/device that made the incoming call. That user/device doesn't need the broadcast since they'll receive the return value from the request-response method. As a convenience, you can pass the entire `client` object as this parameter here to exclude the user/device that made the incoming call.

## Your implementation server-side code

Now we'll walk through the code you write to complete the implementation of your service. There are three steps:

1. Write a class that extends the generated class.
1. Implement each of the abstract methods.
1. Create and register an instance of your class.

We'll continue using the create operation from the `SuggestionService` as our example. Here's what Root generated for the base class and create methods.

```ts
export abstract class SuggestionServiceBase implements RootServerService {
  abstract create(request: SuggestionCreateRequest, client: Client): Promise<SuggestionCreateResponse>;

  public broadcastCreated(message: SuggestionCreatedEvent, clients: BroadcastClientMerged, except?: DeviceContext) {
    // Method is fully implemented (not shown) ...
  }

  // ...
}
```

Here's the code you'll need to write. We'll go through this step-by-step below.

```ts
import {
  Client
} from "@rootsdk/server-app";

import {
  SuggestionServiceBase
} from "@suggestionbox/gen-server";

import {
  SuggestionCreateRequest,
  SuggestionCreateResponse,
  SuggestionCreatedEvent,
} from "@suggestionbox/gen-shared";

export interface SuggestionModel {
  id: number;
  author_id: string;
  text: string;
  voter_ids: string[];
  created_at: string;
}

export class SuggestionService extends SuggestionServiceBase {
  async create(request: SuggestionCreateRequest, client: Client): Promise<SuggestionCreateResponse> {
    const model: SuggestionModel = ...; // Save the new suggestion in your database (details not shown)

    // Convert the database model of a suggestion into a Suggestion DTO from protobuf
    const suggestion: Suggestion = {
      id: model.id,
      authorId: model.author_id,
      text: model.text,
      voterIds: model.voter_ids,
      createdAt: Timestamp.fromDate(new Date(model.created_at)),
    };

    // Broadcast to all clients except the caller
    const event: SuggestionCreatedEvent = { suggestion: suggestion };
    this.broadcastCreated(event, "all", client);

    // Return the response to the caller
    const response: SuggestionCreateResponse = { suggestion: suggestion };
    return response;
  }
}

// Create and export an instance of your service class
export const suggestionService = new SuggestionService();
```

```ts
import { rootServer, RootStartState } from "@rootsdk/server-app";
import { suggestionService } from "./suggestionService";

async function initialize(state: RootStartState) {
  rootServer.lifecycle.addService(suggestionService); // Register your instance with Root
}

(async () => {
  await rootServer.lifecycle.start(initialize);
})();
```

### Extend the generated class

Create your class that extends the Root-generated base class. You'll need to import the base class from the module you specified in your `root-protoc.json` file. Typically, this would be something like `@suggestionbox/gen-server`. It's common to name the class the same name as your protobuf service, but this isn't required.

```ts
import {
  SuggestionServiceBase
} from "@suggestionbox/gen-server";

export class SuggestionService extends SuggestionServiceBase {
}
```

### Implement each request-response method

The implementation of a request-response method has a common pattern:

1. Import needed types:
	- Root types from `@rootsdk/server-app`. You'll need the `Client` type at a minimum since it's one of the arguments to each request-response method.
	- Your data-transfer objects from the module you specified in your `root-protoc.json` file. Typically, this would be something like `@suggestionbox/gen-shared`.

1. Process the request. In our case, we'll be creating a new suggestion object and adding it to our SQL Server database. We'll omit the database code since it's not relevant, and it's personal preference which access library you use.

1. Convert your server-side representation into protobuf object(s) so you can send it across the network.

1. Broadcast the changes to your clients. It's common to omit the caller since they'll get the data they need as the return value of their method call.

1. Return the result.

```ts
import {
  Client
} from "@rootsdk/server-app";

import {
  SuggestionServiceBase
} from "@suggestionbox/gen-server";

import {
  SuggestionCreateRequest,
  SuggestionCreateResponse,
  SuggestionCreatedEvent,
} from "@suggestionbox/gen-shared";

export interface SuggestionModel {
  id: number;
  author_id: string;
  text: string;
  voter_ids: string[];
  created_at: string;
}

export class SuggestionService extends SuggestionServiceBase {
  async create(request: SuggestionCreateRequest, client: Client): Promise<SuggestionCreateResponse> {
    const model: SuggestionModel = ...; // Save the new suggestion in your database (details not shown)

    // Convert the database model of a suggestion into a Suggestion DTO from protobuf
    const suggestion: Suggestion = {
      id: model.id,
      authorId: model.author_id,
      text: model.text,
      voterIds: model.voter_ids,
      createdAt: Timestamp.fromDate(new Date(model.created_at)),
    };

    // Broadcast to all clients except the caller
    const event: SuggestionCreatedEvent = { suggestion: suggestion };
    this.broadcastCreated(event, "all", client);

    // Return the response to the caller
    const response: SuggestionCreateResponse = { suggestion: suggestion };
    return response;
  }
}
```

### Register an instance of your class

The last step is to create an instance of your service implementation and register it with the Root infrastructure. You have to register your service so Root knows where to route incoming messages from your client.

Create an instance in your service-implementation file and export it.

```ts
// Create and export an instance of your service class
export const suggestionService = new SuggestionService();
```

Import and register the instance in your server's startup code.

```ts
import { rootServer, RootStartState } from "@rootsdk/server-app";
import { suggestionService } from "./suggestionService";

async function initialize(state: RootStartState) {
  rootServer.lifecycle.addService(suggestionService); // Register your instance with Root
}

(async () => {
  await rootServer.lifecycle.start(initialize);
})();
```

You perform your initialization inside the callback you pass to the `start` method. This may seem unnecessarily complex, but there's a good reason for it.

When you call `start`, Root first needs to do its own internal setup. During this time, Root holds any incoming client calls in a queue until after your `start` method completes. Once Root's internal setup is done, it invokes your callback so you can register your services. When you're done registering your service(s) and `start` completes, client events start to flow to your App.

## Conclusion

To implement the server side of your service, you extend the class Root generates, implement the request-response methods with your business logic, and register your instance. Root takes care of the boilerplate and infrastructure, so you can focus on the logic specific to your App. Once registered, your service is ready to handle client calls and broadcast updates.