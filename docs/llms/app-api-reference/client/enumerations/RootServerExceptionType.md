---
path: app-api-reference/client/enumerations/RootServerExceptionType.md
audience: app
category: reference
summary: Indicates the type of problem that occurred during a remote call from an App's client to its server.
---

Indicates the type of problem that occurred during a remote call from an App's client to its server. This type is used in cases where the Root server-side infrastructure detects the failure. The Root server-side infrastructure will load one of these values into a `RootServerException` and send the exception across to an App's client.

## Enumeration Members

### MessageTooLong

> **MessageTooLong**: `-7`

Indicates either the client's message to the server or the server's response exceeded the 512K limit.

### RateLimitExceeded

> **RateLimitExceeded**: `-8`

### RequestTimeout

> **RequestTimeout**: `-2`

Indicates the server took too long to service the client's request. The exception does not include any information about how much of the server-side work completed before the timeout occurred. The request may have completed before the timeout; if you choose to resend the same request from your client, be sure your server can tolerate receiving a duplicate request. Alternatively, you could notify the user of the issue and restart your client.

### RootInternalException

> **RootInternalException**: `-4`

Indicates an issue occurred inside the Root client or server infrastructure. The problem is not likely in your code. Consider restarting your client.

### UnhandledException

> **UnhandledException**: `-3`

Indicates an unhandled exception other than `RootApiException` occurred on the server. Typically, this means your server code generated an exception that you didn't catch. The Root infrastructure caught the exception, translated it into a `RootServerException` with the code set to `UnhandledException`, and sent that `RootServerException` across to your client. Your immediate response will likely be to restart your client. Longer term, you'll likely want to update your server code so it catches these exceptions.

### UnhandledRootApiException

> **UnhandledRootApiException**: `-1`

Indicates a `RootApiException` was unhandled on the server. The Root infrastructure on the server translated the unhandled `RootApiException` into a `RootServerException` and set the code inside the `RootServerException` to `UnhandledRootApiException`. Your immediate response will likely be to restart your client. You may want to update your server code so it catches these exceptions.

### Unspecified

> **Unspecified**: `0`

This is the default code used by `RootServerException`. If you see it in your client, it typically means the server-side code that threw the exception did not explicitly set a value for the code.