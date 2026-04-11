# create-root

Scaffold a new Root Bot or App project with starter code, build configuration, and a `.env` placeholder.

## Syntax

```bash
npx create-root --bot <ProjectName>
npx create-root --app <ProjectName>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--bot` | One of `--bot` or `--app` | Generate a bot project (server-only automation) |
| `--app` | One of `--bot` or `--app` | Generate an app project (client UI + server + networking) |
| `<ProjectName>` | **Yes** | Name of the project. Used as the folder name. Do not include the angle brackets. |

## Prerequisites

- `npx` (included with Node.js)

## Examples

```bash
npx create-root --bot MyBot
npx create-root --app MyApp
```

## Output

The generated project includes:

- **Bot:** `src/`, `root-manifest.json`, `package.json`, `tsconfig.json`, `.env`
- **App:** `server/`, `client/`, `networking/`, `root-manifest.json`, `package.json`, `tsconfig.json`, `.env`

The generated code will build immediately, but you must add a `DEV_TOKEN` to the `.env` file before testing locally. Get a `DEV_TOKEN` from the [Root Developer Portal](https://dev.rootapp.com).
