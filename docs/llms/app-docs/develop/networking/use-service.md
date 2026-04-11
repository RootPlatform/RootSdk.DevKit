---
path: app-docs/develop/networking/use-service.md
audience: app
category: guide
summary: This article covers how to use a service in the client side of your App.
---

# Use a service from the client side

This article covers how to use a service in the client side of your App.

[Diagram: Diagram of the five steps to create a service: plan, define, generate, implement, use. The use step is highlighted.]
```
graph LR
    A[Plan] --> B[Define]
    B --> C[Generate]
    C --> D[Implement]
    D --> E[Use]
    classDef highlight stroke-width:5px;
    class E highlight;
```

## Overview

Root processes each of your protobuf services to generate client-side code and puts it in your `networking/gen/client/src` folder. The Root-generated code is fully implemented and ready to use.

What Root generates:

1. A class clients use to access service.
1. Fully implemented request-response methods.
1. An event for each broadcast method.
1. Types that describe the available events.
1. Registered instance of the generated class.

How you use it:

1. Import the instance.
1. Call request response methods.
1. Subscribe to events of interest.

## Root-generated client-side code

Let's look at the client-side code Root generates. We'll again use the create operation from the `SuggestionService` as our example:

```protobuf
service SuggestionService {
  rpc Create(SuggestionCreateRequest) returns (SuggestionCreateResponse);

  rpc BroadcastCreated(SuggestionCreatedEvent) returns (rootsdk.Void);

  // ...
}
```

Here's the complete client-side code generated from the two create methods. The generated code is . We'll go through this step-by-step below.

```ts
// Defines the available events
export type SuggestionServiceClientEvents = {
  'broadcastCreated': (event: SuggestionCreatedEvent) => void
}

// Convenience enum to avoid using hardcoded strings to subscribe to events
export enum SuggestionServiceClientEvent {
  Created = 'broadcastCreated'
}

// Class is an event emitter and contains the request-response methods
export class SuggestionServiceClient extends (EventEmitter as new() => TypedEventEmitter<SuggestionServiceClientEvents>) implements RootClientService {
  create(request: SuggestionCreateRequest):Promise<SuggestionCreateResponse> {
    // Method is fully implemented (not shown) ...
  }
}

// Root creates and registers an instance
export const suggestionServiceClient = new SuggestionServiceClient();
(<IRootClient><unknown>rootClient).addClient(suggestionServiceClient);
```

### Class generation

First, Root processes the service itself.

```protobuf
service SuggestionService {
  // ...
}
```

Root generates a class for your service. The name of the class is your service name with `Client` added.

```ts
export class SuggestionServiceClient extends (EventEmitter as new() => TypedEventEmitter<SuggestionServiceClientEvents>) implements RootClientService
{
}
```

### Request-response method generation

Next, Root processes your request-response methods.

```protobuf
service SuggestionService {
  rpc Create(SuggestionCreateRequest) returns (SuggestionCreateResponse);
  // ...
```

For request-response methods, Root generates an implemented method (`create` in this case) that's ready for the client to call.

```ts
export class SuggestionServiceClient extends (EventEmitter as new() => TypedEventEmitter<SuggestionServiceClientEvents>) implements RootClientService {
  create(request: SuggestionCreateRequest):Promise<SuggestionCreateResponse> {
    // Method is fully implemented (not shown) ...
  }
}
```

### Broadcast method generation

Root processes your broadcast methods into client-side events.

```protobuf
service SuggestionService {
  rpc BroadcastCreated(SuggestionCreatedEvent) returns (rootsdk.Void);
  // ...
}
```

There's one event generated for each broadcast method. The `SuggestionServiceClient` class is an `EventEmitter` that lets clients register for any of the events they're interested in.

```ts
export class SuggestionServiceClient extends (EventEmitter as new() => TypedEventEmitter<SuggestionServiceClientEvents>) implements RootClientService
{
  // ...
}
```

In addition, there are two types that help clients subscribe to the events. First, there the actual type used with the `EventEmitter` (note the 's' on the end of the type name `SuggestionServiceClientEvents`).

```ts
export type SuggestionServiceClientEvents = {
  'broadcastCreated': (event: SuggestionCreatedEvent) => void
}
```

Then there's a convenience `enum` that has a value for each event (note that there's **not*** an 's' on the end of the type name `SuggestionServiceClientEvent`). You'll use the enum values to register for events instead of hardcoding the associated string.

```ts
export enum SuggestionServiceClientEvent {
  Created = 'broadcastCreated'
}
```

### Instance registration

The generated code also creates an instance of the client type and registers the instance with Root. These steps make the client object fully ready for use in your client code.

```ts
export const suggestionServiceClient = new SuggestionServiceClient();

(<IRootClient><unknown>rootClient).addClient(suggestionServiceClient);
```

## Use the generated client-side code in your App

Now we'll walk through the code you write on the client to use your service. We'll continue using the create operation from the `SuggestionService` as our example.

### Imports

You'll need to import several types. The import locations are determined by the options you specified in your `root-protoc.json` file. Typically, this would be something like `@suggestionbox/gen-client` for client-specific types and `@suggestionbox/gen-shared` for data-transfer objects (DTOs).

```ts
import {
  // DTOs
  Suggestion,
  SuggestionCreateRequest,
  SuggestionCreateResponse,
  SuggestionCreatedEvent
} from "@suggestionbox/gen-shared";

import {
  // Service client instance
  suggestionServiceClient,

  // Convenience enum to simplify event subscription
  SuggestionServiceClientEvent,
} from "@suggestionbox/gen-client";
```

### Call request-response methods

You call request-response method on the client instance you imported. All request-response methods are `async` on the client.

Here's how you might call the `create` method.

```ts
const text: string = // retrieve text from the UI

const request: SuggestionCreateRequest = { text };
const response: SuggestionCreateResponse = await suggestionServiceClient.create(request);

// The suggestion field is nullable since it was generated from a protobuf message type
const createdSuggestion: Suggestion = response.suggestion!;

// Update your UI with the new suggestion this client created ...
```

### Handle exceptions

When a server method throws a `RootServerException`, the client receives it as a catchable exception. Import `RootServerException` from `@rootsdk/client-app` and your error enum from `gen-shared`.

```ts
import { RootServerException } from "@rootsdk/client-app";
import { SuggestionError } from "@suggestionbox/gen-shared";

try {
  await suggestionServiceClient.delete({ id: 42 });
} catch (error) {
  if (error instanceof RootServerException) {
    switch (error.code) {
      case SuggestionError.NOT_FOUND:
        // Handle not found (e.g., refresh the list)
        break;
      default:
        console.error(`Server error: code=${error.code} ${error.message}`);
    }
  }
}
```

See [Exception handling](handle-exceptions.md) for detailed patterns including when to use exceptions versus response fields.

### Subscribe to events

The `suggestionServiceClient` instance is an event emitter. It has the standard event methods like `on` and `off` to let you subscribe and unsubscribe to events.

Here's how you might use the `Created` event in your client to be notified when other clients create new suggestions. Notice the use of the enum value `SuggestionServiceClientEvent.Created` to specify they event you're interested in.

```ts
suggestionServiceClient.on(SuggestionServiceClientEvent.Created, onCreated);
```

```ts
suggestionServiceClient.off(SuggestionServiceClientEvent.Created, onCreated);
```

```ts
// Handle incoming event (when another client creates a new suggestion)
const onCreated = (event: SuggestionCreatedEvent) => {

  // The suggestion field is nullable since it was generated from a protobuf message type
  const createdSuggestion: Suggestion = event.suggestion!;

  // Update your UI with the new suggestion
};
```

## Conclusion

Once Root generates your client-side service code, using it is straightforward. You import the instance, call methods like `create`, and subscribe to events using standard patterns. The generated code takes care of the network addressing, data transfer, and authentication so you can focus on building your App’s features.