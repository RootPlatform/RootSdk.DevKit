---
path: app-docs/develop/networking/handle-exceptions.md
audience: app
category: guide
summary: `RootServerException` is a special exception type that's thrown on the server and caught on the client.
---

# Exception handling

`RootServerException` is a special exception type that's thrown on the server and caught on the client. It's the only exception type that can cross the server-client boundary. The Root infrastructure uses it for system errors and you use it for your own error notifications.

## How it works

When a `RootServerException` is thrown by you or by the Root infrastructure, Root serializes it and sends it across the network to your client. Your client can catch the exception, examine the contained error code and message, and decide how to handle the issue. Your server continues to run normally after throwing a `RootServerException`.

```ts
throw new RootServerException(code, message);
```

[Diagram: This diagram shows the flow of a request from client to server. On failure, the server throws a RootServerException that the client can catch.]
```
sequenceDiagram
    participant Server
    participant Client
    Client->>Server: Send request
    Server->>Server: Process request
    alt Failure
        Server-->>Client: throw RootServerException(code, message)
        Client->>Client: Handle exception
    else Success
        Server-->>Client: Return response
    end
```

## System errors

Root uses `RootServerException` to report system-level failures and unhandled server-side exceptions to your client. Your client can check the code to decide whether to retry the failed command or restart.

The system-error codes and when they occur are defined in the `RootServerExceptionType` enum. Root uses **negative numbers** for these error codes.

## Custom errors

Use `RootServerException` to report custom failure information from your server to your client. Use **positive numbers** for your own error codes. For example:

```ts
export enum SuggestionBoxError {
  NOT_FOUND = 1,
  DUPLICATE_VOTE = 2
}
```

## Example: Server throws an exception

```ts
export class SuggestionService extends SuggestionServiceBase {
  // ...
  async delete(request: SuggestionDeleteRequest, client: Client): Promise<SuggestionDeleteResponse> {
    const affectedRows: number = await suggestionRepository.delete(request.id);

    if (affectedRows === 0) {
      const message: string = "SuggestionService.delete: attempt to delete non-existent suggestion.";
      console.error(message);
      throw new RootServerException(SuggestionBoxError.NOT_FOUND, message);
    }

    const event: SuggestionDeletedEvent = { id: request.id };
    this.broadcastDeleted(event, "all", client);

    const response: SuggestionDeleteResponse = {}; // Intentionally empty
    return response;
  }
}
```

## Example: Client catches an exception

```ts
  const deleteSuggestion = useCallback(async (id: number): Promise<void> => {
    try {
      // delete the suggestion on the server
      const request: SuggestionDeleteRequest = { id: id };
      const response: SuggestionDeleteResponse = await suggestionServiceClient.delete(request); // response is intentionally empty

      // delete the suggestion from the client-side cache
      updateSuggestions((map) => { map.delete(id); });
    } catch (error) {
      if (error instanceof RootServerException) {
        if (error.code === SuggestionBoxError.NOT_FOUND) {
          // Optionally add user notification here (omitted for simplicity)
          rootClient.lifecycle.restart();
        }
      }
    }
  },[updateSuggestions]);
```

## When to use exceptions

You have two options for reporting problems from your server to your client:

* Include status field(s) inside your response object.
* Throw a `RootServerException`.

The decision is a judgment call. Generally, use **response codes** for soft failures that are part of expected behavior and **exceptions** for hard failures that interrupt normal flow. Here are a few situations with a recommendation and example for each:

| Use case                                             | Use response fields | Use `RootServerException` | Example from **SuggestionBox**                                        |
| -----------------------------------------------------| ------------------- | ------------------------- | --------------------------------------------------------------------- |
| Error is part of expected flow                       | ✅ Yes              | 🚫 No                     | User tries to create an empty suggestion or duplicate of an existing suggestion.          |
| You want to return structured data about the issue   | ✅ Yes              | 🚫 No                     | Suggestion includes unsupported formatting; response needs to include both a code and list of disallowed characters. |
| Operation fails and should be treated as an error    | 🚫 No               | ✅ Yes                    | Client allows the user to vote for the same suggestion more than once.                                                                     |
| The error is unexpected or unrecoverable             | 🚫 No               | ✅ Yes                    | Client lets the user attempt to delete a non-existent suggestion.             |

## Summary

* Throw `RootServerException` for unexpected or unrecoverable errors.
* Use positive codes for your app’s errors. Negative codes are for Root.
* Always catch exceptions on the client to show feedback or retry.