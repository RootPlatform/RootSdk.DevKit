---
name: root-bot-scaffold
description: Creates a new Root Bot project using create-root, then customizes based on requirements
---

# Root Bot Scaffolding

Use this skill when asked to create a new Root **Bot**. For Apps with UI, use the `root-app-scaffold` skill instead.

## When to Use

- User asks to "create a new Root bot"
- User wants server-only automation (no UI)
- User needs to respond to messages or events
- User wants background processing

## Apps vs Bots

| Aspect | App | Bot |
|--------|-----|-----|
| Architecture | Client (React/Vite) + Server + Networking (protobuf) | Server only |
| UI | React components | None |
| Communication | Protobuf RPC + broadcast events | Direct SDK calls |
| Use case | Interactive features with UI | Background automation |

If the user wants an App with UI, redirect to the `root-app-scaffold` skill.

## Workflow

### Step 1: Gather Requirements

Ask the user:
1. **Project name?** (lowercase, no spaces)
2. **What will it do?** (helps determine SDK APIs and permissions)
3. **What triggers actions?** Messages, events, or scheduled tasks?

### Step 2: Scaffold with create-root

```bash
npx @rootsdk/create-root --bot {project-name}
cd {project-name}
npm install
```

This creates:
```
{project-name}/
├── root-manifest.json    # Bot manifest (id, version, package config)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── clean.js              # Build cleanup script
└── src/
    ├── main.ts           # Entry point with lifecycle
    └── example.ts        # Example message handler
```

### Step 3: Read the Generated Code

Read the generated `src/main.ts` and `src/example.ts` to understand the bot's structure. These are the authoritative starting point — build on them, don't replace them.

### Step 4: Customize Based on Requirements

Based on what the user needs, modify the generated code:

1. **Manifest**: Use the `root-manifest-builder` skill to add permissions and settings to `root-manifest.json`
2. **Server logic**: Add event handlers and SDK calls in new source files under `src/`, following the pattern in the generated `example.ts`
3. **API patterns**: Reference the how-to bots in `RootSdk.DevKit/how-to/` for working examples of each SDK domain (messages, channels, roles, files, etc.)

### Step 5: Build and Run

```bash
# Build
npm run build

# Run development server
npm run bot
```

## Guidelines

- Start with create-root template, then customize — never write from scratch
- Read the generated code before modifying it
- Subscribe to events in the `onStarting` callback
- Use the how-to bots for API usage patterns, not hardcoded examples
- Use `root-manifest-builder` skill for permissions and settings
