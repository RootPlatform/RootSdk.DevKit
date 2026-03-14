---
name: root-app-scaffold
description: Creates a new Root App project using create-root, then customizes based on requirements
---

# Root App Scaffolding

Use this skill when asked to create a new Root **App**. For Bots, use the `root-bot-scaffold` skill instead.

## When to Use

- User asks to "create a new Root app"
- User wants a full-stack app with React client and Node.js server
- User needs client-server communication via protobuf RPC

## Apps vs Bots

| Aspect | App | Bot |
|--------|-----|-----|
| Architecture | Client (React/Vite) + Server + Networking (protobuf) | Server only |
| UI | React components | None |
| Communication | Protobuf RPC + broadcast events | Direct SDK calls |
| Use case | Interactive features with UI | Background automation |

If the user wants a Bot, redirect to the `root-bot-scaffold` skill.

## Workflow

### Step 1: Gather Requirements

Ask the user:
1. **Project name?** (lowercase, no spaces — used as package scope)
2. **What will it do?** (helps determine SDK APIs needed)
3. **What data flows client ↔ server?** (defines protobuf services)

### Step 2: Scaffold with create-root

```bash
npx @rootsdk/create-root --app {project-name}
cd {project-name}
npm install
```

This creates a monorepo with workspaces:
```
{project-name}/
├── root-manifest.json      # App manifest (id, version, package config)
├── package.json            # Root package with workspaces
├── clean.js                # Build cleanup script
├── client/                 # React client (Vite)
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── Example.tsx     # Example using RPC + events
│   │   └── index.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Node.js server
│   ├── src/
│   │   ├── main.ts         # Entry point with lifecycle
│   │   └── exampleService.ts
│   └── package.json
└── networking/             # Protobuf definitions
    ├── src/
    │   └── example.proto   # Service definitions
    ├── root-protoc.json    # Protobuf compiler config
    └── package.json
```

### Step 3: Read the Generated Code

Read the generated files to understand the app's structure:
- `server/src/main.ts` — server lifecycle and service registration
- `server/src/exampleService.ts` — RPC handler pattern
- `client/src/Example.tsx` — client RPC calls and event subscriptions
- `networking/src/example.proto` — protobuf service definition

These are the authoritative starting point — build on them, don't replace them.

### Step 4: Define Protobuf Services

Edit `networking/src/*.proto` to define your RPC services. Follow the pattern in the generated `example.proto`:
- Define request/response messages
- Define broadcast event messages
- Define service with RPC methods and broadcast methods

After editing, rebuild networking:
```bash
npm run build -w @{project}/networking
```

This generates:
- `@{project}/gen-client` — Client stubs
- `@{project}/gen-server` — Server base classes
- `@{project}/gen-shared` — Shared types

### Step 5: Implement Server and Client

Based on what the user needs:

1. **Server services**: Extend the generated base classes in `server/src/`, following the pattern in `exampleService.ts`
2. **Client UI**: Use generated client stubs in React components, following the pattern in `Example.tsx`
3. **Manifest**: Use the `root-manifest-builder` skill to add permissions and settings to `root-manifest.json`
4. **API patterns**: Reference the how-to bots in `RootSdk.DevKit/how-to/` for working examples of each SDK domain (messages, channels, roles, files, etc.)

### Step 6: Build and Run

```bash
# Build all workspaces
npm run build

# Run development server
npm run server -w @{project}/server

# Run client (in another terminal)
npm run client -w @{project}/client
```

## Guidelines

- Start with create-root template, then customize — never write from scratch
- Read the generated code before modifying it
- Define data contracts in .proto files first
- Rebuild networking after proto changes
- Use the how-to bots for API usage patterns, not hardcoded examples
- Use `root-manifest-builder` skill for permissions and settings
