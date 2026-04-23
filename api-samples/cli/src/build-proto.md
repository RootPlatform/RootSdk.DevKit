# rootsdk build proto

Generate TypeScript networking code from protobuf definitions. Apps only — bots do not use this command.

## Syntax

```bash
rootsdk build proto
```

No command-line flags. All options are configured via `root-protoc.json`.

## Prerequisites

- `@rootsdk/dev-tools` in `devDependencies`
- A `root-protoc.json` file in the directory where the command is run (typically `networking/`)
- One or more `.proto` files defining your services and messages

## Configuration

Create a `root-protoc.json` file:

```json
{
  "source": ["./**/*.proto"],
  "scope": "@myapp"
}
```

### Options

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `source` | No | Root types only | Array of glob patterns pointing to `.proto` files to compile |
| `protoPaths` | No | `./src` | Directories to search for imported `.proto` files |
| `outDir` | No | `./gen` | Root folder where generated packages are written |
| `scope` | **Yes** | — | NPM package scope (e.g., `@myapp`). Used for naming generated packages |
| `clientPackageName` | No | `gen-client` | Package name (without scope) for generated client code |
| `serverPackageName` | No | `gen-server` | Package name (without scope) for generated server code |
| `sharedPackageName` | No | `gen-shared` | Package name (without scope) for shared definitions and types |

### Full example

```json
{
  "source": ["./**/*.proto"],
  "protoPaths": ["./src"],
  "outDir": "./gen",
  "scope": "@suggestionbox",
  "clientPackageName": "gen-client",
  "serverPackageName": "gen-server",
  "sharedPackageName": "gen-shared"
}
```

## Output

Generated packages are written under `outDir`:

```
networking/gen/
  client/    → @scope/gen-client  (ES modules, for browser)
  server/    → @scope/gen-server  (CommonJS modules, for Node.js)
  shared/    → @scope/gen-shared  (both formats, shared types)
```

The subfolder names (`client/`, `server/`, `shared/`) are fixed — only the package names and output root folder are configurable.

### Importing generated code

```typescript
import { ... } from "@suggestionbox/gen-client"   // client code
import { ... } from "@suggestionbox/gen-server"   // server code
import { ... } from "@suggestionbox/gen-shared"   // shared types
```

The import paths are formed from `scope` + package name in `root-protoc.json`.

## Typical script

In `networking/package.json`:

```json
{
  "scripts": {
    "build": "rootsdk build proto"
  }
}
```
