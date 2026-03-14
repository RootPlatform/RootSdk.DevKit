# How-To Conventions

Guide for building how-to bots in `RootSdk.DevKit/how-to/`. Established during the `messages/` proof of concept.

## Philosophy

Each how-to directory is a standalone, deployable bot that teaches one API domain. Multiple source files inside, each covering a specific set of operations — individually retrievable by RAG agents.

**Cover every API method.** The cost of an uncovered method is that an agent hallucinates — worse than a few extra tokens. Per-file retrieval means niche files only load when relevant.

**Show the common usage, mention advanced parameters in comments.** Don't pad files with rarely-used options.

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

Derived from the `rootServer` type in `@rootsdk/server-bot`. 15 bots, ~28 source files.

| Bot | Clients | Source files |
|-----|---------|-------------|
| `messages/` | channelMessages | `send.ts`, `reactions.ts`, `pins.ts`, `mentions.ts`, `flag.ts` |
| `channels/` | channels, channelGroups | `crud.ts`, `groups.ts` |
| `access-rules/` | accessRules | `access-rules.ts` |
| `roles/` | communityRoles, communityMemberRoles | `roles.ts`, `member-roles.ts` |
| `members/` | communityMembers | `members.ts` |
| `kick-ban/` | communityMemberBans | `kick-ban.ts` |
| `invites/` | communityMemberInvites | `invites.ts` |
| `files/` | channelFiles, channelDirectories | `crud.ts`, `directories.ts` |
| `key-value-store/` | dataStore.appData | `kv-store.ts` |
| `jobs/` | jobScheduler | `scheduler.ts` |
| `emojis/` | communityEmojis | `emojis.ts` |
| `community/` | communities | `community.ts` |
| `global-settings/` | globalSettings | `settings.ts` |
| `voice/` | channelWebRtcs | `sessions.ts`, `tracks.ts` |
| `member-groups/` | memberGroups | `member-groups.ts` |
| `app-logs/` | dataStore.logs.community | `app-logs.ts` |

## Build Order

1. `messages/` — complete (proof of concept)
2. `channels/`, `access-rules/`, `roles/` — channel structure and permissions
3. `members/`, `kick-ban/`, `invites/` — member management
4. `files/`, `key-value-store/`, `jobs/` — content and automation
5. `emojis/`, `community/`, `global-settings/`, `voice/`, `member-groups/`, `app-logs/` — remaining domains

## Verification

1. Each how-to bot builds: `npm run build`
2. Permissions verified against `api-method-permissions.json`
3. File names match common developer search queries
4. Behavioral nuances discovered during implementation are captured inline
