# rootsdk start devhost

Run a bot or app server locally inside the Root DevHost. The DevHost is a Node.js execution environment that routes Community API calls through Root's servers.

## Syntax

```bash
rootsdk start devhost [options]
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--project-folder` | `./` (current directory) | Path to the directory containing `root-manifest.json` |

## Prerequisites

- `@rootsdk/dev-tools` in `devDependencies`
- `.env` file with a valid `DEV_TOKEN` (from [Root Developer Portal](https://dev.rootapp.com))
- Compiled TypeScript — run `npm run build` first

## Bot usage

Run from the project root:

```bash
rootsdk start devhost
```

Typical `package.json` script:

```json
{
  "scripts": {
    "bot": "rootsdk start devhost"
  }
}
```

Run with: `npm run bot`

## App usage

Run from the `server/` folder, pointing `--project-folder` up to the project root where `root-manifest.json` lives:

```bash
rootsdk start devhost --project-folder=../
```

Typical `package.json` script (in `server/package.json`):

```json
{
  "scripts": {
    "server": "rootsdk start devhost --project-folder=../"
  }
}
```

Run with: `npm run server`

The app client runs separately — see the app guide for `npm run client` (Vite dev server).

## Behavior

- Reads the launch entry-point from `root-manifest.json`. The entry-point file contains `await rootServer.lifecycle.start()`.
- Creates a local `rootsdk.sqlite3` database file scoped to the community in your `DEV_TOKEN`.
- Community API calls (e.g., sending messages) go through Root's servers and appear in the Root native client.

## Common errors

- **"Community in data is xxxxx but configured for yyyyy"** — delete `rootsdk.sqlite3`. This happens when you change your `DEV_TOKEN` to a different community.
