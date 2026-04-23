# RootSdk.DevKit

Developer toolkit for building apps and bots on the Root Platform. Read `AGENTS.md` for full navigation — samples, docs, api-samples, schemas, and decision guidance.

## Key Conventions

- **Apps** import from `@rootsdk/server-app`. **Bots** import from `@rootsdk/server-bot`.
- All server-side SDK code is identical between apps and bots except the import path.
- The `rootServer` object is the SDK entry point. Everything hangs off `rootServer.community.*`, `rootServer.dataStore.*`, `rootServer.lifecycle.*`, etc.
