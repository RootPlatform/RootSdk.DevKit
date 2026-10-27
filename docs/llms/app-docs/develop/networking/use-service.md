---
path: app-docs/develop/networking/use-service.md
audience: app
category: guide
summary: This article covers how to use a service in the client side of your App.
---

> **Worked sample**: `api-samples/networking-app-services/` — RPC Services

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

### How the client rate limit works

Root limits how often your client can call your own service methods: **10 requests per second** and **512 KiB per second**. Exceeding either limit causes the next call to fail.

The call throws an error instead of waiting. Root checks the limit in your client before the request is sent, so the request never reaches the server, it is not queued, and it is not retried for you.

```ts
import { RootServerException, RootServerExceptionType } from "@rootsdk/client-app";

try {
  await suggestionServiceClient.list({});
} catch (error) {
  if (error instanceof RootServerException && error.code === RootServerExceptionType.RateLimitExceeded) {
    // Wait briefly and retry, or combine this call with others
  }
}
```

These limits apply only to your App's own service methods. Calls to the Root platform APIs, such as `rootClient.user` and `rootClient.asset`, are not counted, and the community API has its own separate limits. See [Rate limits](../server/community-api/rate-limits.md) for those.

The one-second period is fixed rather than rolling. Both counters reset on the first call made after one second has passed, so a group of calls that spans a reset is counted as two separate seconds.

**This limit is most often reached while your App is starting.** A client that sends a request for every panel as it loads can use all ten requests before the member has done anything, so the member's first action is the call that fails. To avoid this:

- Request what the first screen needs, and load the rest when the member navigates to it.
- Combine related requests into a single method rather than calling several in a loop.
- Debounce calls driven by typing or dragging, such as a search field or a reorder.
- Never call a service once per row in a list. Add a method that takes the whole set instead.

The counters are held in the client process, so reloading your App resets them. This makes the problem easy to miss while you are developing, because reloading between attempts clears the counters, while a member who keeps using your App without reloading does not get that reset.

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

### How events from your own actions work

A broadcast reaches every subscribed client in the group the server sent it to. Your server can leave out the device that made the request, by passing the calling client as the third argument to the broadcast method, but that excludes **one device** and not one member. A member signed in on two devices still receives their own event on the other one. See [Make your App feel collaborative](../../design/make-collaborative.md#how-broadcast-delivery-works) for the delivery rules.

For handlers that only update cached data, this needs no attention. The end state is the same whoever made the change.

For handlers that show something to the member, it does. Your mutation already told the member what happened, so the event handler tells them a second time. To avoid that, record the change while your own request is in flight and let the handler skip the part the member can see.

```ts
const pendingDeletes = new Set<number>();

export function isPendingDelete(id: number): boolean {
  return pendingDeletes.has(id);
}

export async function deleteSuggestion(id: number): Promise<void> {
  pendingDeletes.add(id);
  try {
    await suggestionServiceClient.delete({ id });
    // Show your own confirmation here, where you know the member is looking
  } finally {
    pendingDeletes.delete(id);
  }
}
```

```ts
const onDeleted = (event: SuggestionDeletedEvent) => {
  // Always update cached data. It is the same result whoever deleted the suggestion.
  removeFromCache(event.id);

  // Only the member who did not delete it needs to be told.
  if (isPendingDelete(event.id)) return;

  showMessage("This suggestion was deleted");
  navigateToBoard();
};
```

Keep the two halves separate as shown. If the handler returns early before updating the cache, the acting member's own view stops being corrected by the server, and the bug that appears later is hard to connect to this code.

This problem stays hidden while a handler is the only place that shows something. It appears the first time someone adds a message or a redirect to the mutation as well, and at that point the cause looks unrelated to the handler that was written months earlier. When you add a visible action to a mutation, check whether the matching event handler already has one.

## Conclusion

Once Root generates your client-side service code, using it is straightforward. You import the instance, call methods like `create`, and subscribe to events using standard patterns. The generated code takes care of the network addressing, data transfer, and authentication so you can focus on building your App's features.