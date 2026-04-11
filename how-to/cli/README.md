# How-To: CLI Commands

Command-line tools for creating, testing, building, and deploying Root Apps and Bots.

## Source Files

| File | What it covers |
|------|---------------|
| [create-root.md](src/create-root.md) | Scaffold a new bot or app project |
| [start-devhost.md](src/start-devhost.md) | Run a bot or app server locally for testing |
| [build-proto.md](src/build-proto.md) | Generate TypeScript networking code from protobuf definitions (apps only) |
| [build-package.md](src/build-package.md) | Package compiled code into a `.pkg` file for deployment |
| [upload-package.md](src/upload-package.md) | Deploy a `.pkg` file to the Root cloud |

## Commands

- `npx create-root --bot <Name>` / `npx create-root --app <Name>` — scaffold a new project
- `rootsdk start devhost` — run locally inside the Root DevHost
- `rootsdk build proto` — generate TypeScript from `.proto` files (apps only)
- `rootsdk build package` — create a `.pkg` deployment archive
- `rootsdk upload package` — deploy a `.pkg` to Root cloud

## Apps vs Bots

All commands work for both apps and bots except:

- **`rootsdk build proto`** — apps only. Bots have no client and no protobuf networking layer.
- **`rootsdk start devhost`** — works for both, but apps run it from the `server/` folder with `--project-folder=../` while bots run it from the project root with no flag.

## Key Behaviors

- **Node.js >= 22** is required for all Root SDK tooling.
- **`@rootsdk/dev-tools`** must be in your project's `devDependencies` to use `rootsdk` commands.
- **`DEV_TOKEN`** in a `.env` file is required for `rootsdk start devhost`. Get one from the [Root Developer Portal](https://dev.rootapp.com).
- **Build before run** — compile TypeScript (`npm run build`) before running `rootsdk start devhost`. The DevHost executes compiled JavaScript, not TypeScript source.
- **Build before package** — `rootsdk build package` bundles compiled output. Run your full build first.
- **Community mismatch** — if you see "Community in data is xxxxx but configured for yyyyy", delete the local `rootsdk.sqlite3` file. This happens when you switch `DEV_TOKEN` values.
