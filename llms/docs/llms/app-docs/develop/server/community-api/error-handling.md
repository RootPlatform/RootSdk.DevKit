---
path: app-docs/develop/server/community-api/error-handling.md
audience: app
category: guide
summary: This reference describes how to handle errors from the community access API.
---

# Error handling

This reference describes how to handle errors from the community access API.

## When errors occur

API calls can fail for several reasons: the resource doesn't exist, your code lacks the required permission, the request contains invalid data, or a server-side issue occurs. When a failure occurs, the Root API throws an exception that you catch and handle.

## RootApiException

All API methods throw `RootApiException` on failure. This exception extends the standard JavaScript `Error` class and includes an `errorCode` property that indicates what went wrong.

```ts
import {
  rootServer,
  RootApiException,
  ErrorCodeType,
  ChannelMessageCreateRequest,
} from "@rootsdk/server-app";

async function createMessage(request: ChannelMessageCreateRequest): Promise<void>
{
  try
  {
    await rootServer.community.channelMessages.create(request);
  }
  catch (xcpt: unknown)
  {
    if (xcpt instanceof RootApiException)
    {
      if (xcpt.errorCode === ErrorCodeType.NoPermissionToCreate)
      {
        // Handle permission error
      }
    }
    else if (xcpt instanceof Error)
    {
      // Handle other errors
    }
  }
}
```

## Common error codes

The `ErrorCodeType` enum includes values for common failure scenarios:

| Error code | Description |
|------------|-------------|
| `NotFound` | The requested resource does not exist |
| `NoPermissionToCreate` | Missing permission to create the resource |
| `NoPermissionToRead` | Missing permission to read the resource |
| `NoPermissionToEdit` | Missing permission to edit the resource |
| `NoPermissionToDelete` | Missing permission to delete the resource |
| `NoPermissionToMove` | Missing permission to move the resource |
| `NoPermissionToKick` | Missing permission to kick members |
| `NoPermissionToBan` | Missing permission to ban members |
| `RequestValidationFailed` | The request contains invalid data |
| `AlreadyExists` | The resource already exists |
| `TooManyRequests` | Rate limit exceeded |

## Best practices

### Check specific error codes first

Handle specific error codes before falling back to generic error handling:

```ts
if (xcpt instanceof RootApiException)
{
  switch (xcpt.errorCode)
  {
    case ErrorCodeType.NotFound:
      // Resource was deleted or never existed
      break;
    case ErrorCodeType.NoPermissionToCreate:
      // Missing required permission
      break;
    default:
      // Log unexpected errors for investigation
      console.error(`Unexpected error: ${xcpt.errorCode}`);
  }
}
```

### Log unexpected errors

Always log unexpected error codes so you can investigate failures:

```ts
if (xcpt instanceof RootApiException)
{
  console.error(`API error: ${xcpt.errorCode} - ${xcpt.message}`);
}
```

### Handle permission errors gracefully

Permission errors often indicate a configuration issue. Consider logging them prominently so community administrators can grant the required permissions:

```ts
if (xcpt.errorCode === ErrorCodeType.NoPermissionToCreate)
{
  console.warn('Missing the required permission. Check the configuration.');
}
```