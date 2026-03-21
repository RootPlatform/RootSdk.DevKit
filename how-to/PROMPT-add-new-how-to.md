# How-To Conventions

Guide for building how-to bots in `RootSdk.DevKit/how-to/`. Established during the `messages/` proof of concept.

## Principles

1. **Cover every SDK method.** The cost of a missing method is that an agent hallucinates a signature. A few extra lines of code is always cheaper than a wrong answer.

2. **One file, complete answer.** A developer or RAG agent gets everything they need from a single file — event subscription, API calls, behavioral nuances, error handling. No cross-referencing.

3. **Show the SDK, not the ecosystem.** We demonstrate Root's API surface. We don't teach SQLite, Knex, cron syntax, or markdown. If a concept is well-known outside Root, a one-line comment is enough.

4. **Behavioral nuances live inline.** The gotchas that method signatures don't reveal ("bots can only remove their own reactions", "expired keys are cleaned up every 60s") go as comments directly on the relevant operation — where a developer would look.

5. **Dual audience: humans scan, agents retrieve.** Structured metadata headers make files machine-discoverable. Clean exported functions make them copy-pasteable. Both get served by the same artifact.

## Audiences

- **Human developers** scanning for copy-paste patterns
- **AI agents** retrieving examples via RAG to generate code for developers

Both audiences benefit from self-contained files where one file = one complete answer.

## Directory Structure

```
how-to/<domain>/
  root-manifest.json             # only permissions block varies per bot
  package.json                   # only name varies
  tsconfig.json                  # identical across all
  clean.js                       # identical across all
  README.md                      # domain overview, SDK methods, permissions, events, key behaviors
  src/
    main.ts                      # lifecycle boilerplate — imports initializers
    <operation>.ts               # self-contained unit per topic
```

## Source File Structure

Every source file follows: **SUBSCRIBE > OPERATIONS > COMMAND HANDLER > EVENT HANDLERS**

Simpler APIs may skip sections that don't apply (e.g., no events, no command handler).

```
// ============================================================================
// How-To: <Title>
// SDK: <method names>
// Permissions: <channel.permissionName>
// Events: <EventName, EventName>
// Works in: Apps (@rootsdk/server-app) and Bots (@rootsdk/server-bot)
//           All code except the import below is identical for both.
// ============================================================================

import { ... } from "@rootsdk/server-bot"; // For apps: import from "@rootsdk/server-app"

// --- SUBSCRIBE ---------------------------------------------------------------
export function initialize<Topic>(): void { ... }

// --- OPERATIONS --------------------------------------------------------------
// Clean functions showing the SDK calls with behavioral nuances as comments.

// --- COMMAND HANDLER: /<command> ---------------------------------------------
// Thin handler that calls operations. Minimize routing/parsing cruft.
// Error handling with specific ErrorCodeType cases and correct permission names.

// --- EVENT HANDLERS ----------------------------------------------------------
// Log event payload fields to show what's available.
```

## Writing Rules

### Language
- **Neutral voice.** No "bot" or "the bot" — use "your code", "your app", "you", or passive voice. These how-tos serve both apps and bots.
- The header metadata ("Works in: Apps and Bots") and import comments are the exception — they explicitly name both.
- No "Demonstrate" or self-referential language. Everything is a demonstration; don't say so.

### Comments
- Behavioral nuances go directly on the relevant operation as comments (e.g., "Can only edit messages created by your code").
- Don't document things an agent can figure out on its own (e.g., regex parsing). Focus on SDK-specific knowledge.

### Command Handlers
- Keep them thin. The operations are the star; the handler just calls them.
- Avoid if/else routing that buries the key patterns. Show all variations in one flow when possible.
- Don't add confirmation messages, validation logic, or user-facing error replies — that's app logic, not SDK teaching.

### Error Handling
- Reference the **correct permission name** from `api-method-permissions.json` (e.g., `createMessageReaction`, not `manageMessages`).
- Only include error cases that are specific and instructive (NoPermissionToCreate, NotFound, TooManyRequests).

## Permissions

**Always verify against `Docs.Developer/content/api-supplements/api-method-permissions.json`** before writing permission comments or `root-manifest.json`.

Each source file's header lists only the permissions relevant to its operations. The `root-manifest.json` includes all permissions for the entire bot.

The README lists all permissions with one-line descriptions.

## README Structure

```markdown
# How-To: <Domain>
<One sentence: what this how-to covers.>

## Source Files
| File | What it covers |

## SDK Methods
- `client.method` — one-line description

## Permissions
<JSON block matching root-manifest.json>
<Bulleted list with descriptions>

## Events
| Event | Fires when |

## Apps vs Bots
<Standard paragraph about import difference>

## Key Behaviors
<Bulleted list of behavioral nuances, gotchas, and constraints>
```

No "Related" section — adds maintenance burden, links break.

## Boilerplate Files

Copy from `messages/` and change only:
- `package.json`: name field
- `root-manifest.json`: permissions block
- `main.ts`: imports and initializer calls

`tsconfig.json` and `clean.js` are identical across all bots.

## Bot Inventory

Derived from the `rootServer` type in `@rootsdk/server-bot` (20 bots) plus app-only properties from `@rootsdk/server-app` (2 app how-tos).

| Bot | Client | Source files | Status |
|-----|--------|-------------|--------|
| `messages/` | channelMessages | `send.ts`, `reactions.ts`, `pins.ts`, `mentions.ts`, `flag.ts` | Done |
| `app-logs/` | dataStore.logs.community | `app-logs.ts` | Done |
| `key-value-store/` | dataStore.appData | `kv-store.ts` | Done |
| `database/` | dataStore.config (SQLite) | `database.ts` | Done |
| `jobs/` | jobScheduler | `scheduler.ts` | Done |
| `channels/` | channels | `channels.ts` | Done |
| `channel-groups/` | channelGroups | `channel-groups.ts` | Done |
| `access-rules/` | accessRules | `access-rules.ts` | Done |
| `roles/` | communityRoles | `roles.ts` | Done |
| `member-roles/` | communityMemberRoles | `member-roles.ts` | Done |
| `members/` | communityMembers | `members.ts` | Done |
| `kick-ban/` | communityMemberBans | `kick-ban.ts` | Done |
| `invites/` | communityMemberInvites | `invites.ts` | Done |
| `files/` | channelFiles | `files.ts` | Done |
| `directories/` | channelDirectories | `directories.ts` | Done |
| `community/` | communities | `community.ts` | Done |
| `member-groups/` | memberGroups | `member-groups.ts` | Done |
| `voice/` | channelWebRtcs | `voice.ts` | Done |
| `assets/` | assetClient | `assets.ts` | Done (get() pending SDK export) |
| `emojis/` | communityEmojis | `emojis.ts` | Done |
| `lifecycle-bot/` | lifecycle (bot) | `lifecycle-bot.ts` | Done |
| `lifecycle-app/` | lifecycle (app) | `lifecycle-app.ts` | Done |
| `clients-app/` | clients (app) | `clients-app.ts` | Done |
| `global-settings/` | globalSettings | `global-settings.ts` | Deferred - only user-role picker implemented |

## Research

Before writing a how-to bot, research the API surface using these locations:

| Purpose | Path |
|---------|------|
| SDK client types, request/response types, enums, events | `RootApp.AppSdk/sdk/server-bot/` or `sdk/server-app/` |
| Permissions per SDK method | `Docs.Developer/content/api-supplements/api-method-permissions.json` |
| Developer-facing documentation | `Docs.Developer/dist/` |
| Integration tests (real usage patterns) | `Ops.Testing/test-server-multi/tests/test-cases/src/` |

**Note:** `server-multi` is the multi-tenant SDK where all methods take a `communityId` parameter. The integration tests also use `server-multi`. In `server-app` and `server-bot`, the community ID is handled automatically. Use `server-bot` or `server-app` types as the reference for how-to code — `server-multi` types will have extra parameters that don't apply.

## Verification

1. Each how-to bot builds: `npm run build`
2. Permissions verified against `api-method-permissions.json`
3. File names match common developer search queries
4. Behavioral nuances discovered during implementation are captured inline

## Comment Accuracy

Every comment that describes SDK behavior must be verified before writing. Do not infer semantics from field names, implementation details (e.g., "WebSocket"), or related concepts. Follow this procedure:

1. **Read the type definition** — the fields on an event or request type tell you what data is available and constrain what the event can mean.
2. **Read the published docs** — `Docs.Developer/dist/` contains canonical descriptions for types, events, and methods. This is the primary source of truth for developer-facing semantics.
3. **Check integration tests** — `Ops.Testing/test-server-multi/tests/test-cases/src/` shows real usage. What values are passed? What assertions are made?
4. **Trace to the emitter** (if docs are unclear) — find the server-side code that fires the event or processes the request. The infrastructure code in `RootApp.Infrastructure/` is the ultimate source of truth.

### Common pitfalls

- **Upload tokens vs asset URIs** — Fields named `*TokenUri` (e.g., `uploadTokenUri`, `pictureTokenUri`, `iconTokenUri`) take raw upload tokens from `POST /asset/upload`, NOT asset URIs from `assets.create()`. The platform converts tokens to asset URIs internally.
- **Attach/detach** — In the community member context, "attach" means a member opens the community on a device, "detach" means they close it. In the voice (WebRTC) context, "attach" means a user joins a voice call, "detach" means they leave. These are different concepts despite the shared terminology.
- **Enum values** — Always verify the full set of values from the source enum definition. Do not assume gaps or omit values.
- **Specific numbers** (timeouts, limits, sizes) — Verify against source code. If a number could change, use "approximately" and note where the value comes from.
