---
path: bot-docs/publish/upload.md
audience: bot
category: guide
summary: The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and a valid authentication token.
---

# Upload your code

The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and a valid authentication token. You get your authentication token from the [Root Developer Portal](https://dev.rootapp.com).

## Installation

Include the tool in your project by adding the following to your `package.json`:

```json
{
  "devDependencies": {
    "@rootsdk/dev-tools": "*"
  }
}
```

## Usage

```bash
npx rootsdk upload package [options]
```

## Options

You must supply the authentication token through exactly one of the three auth options below (`--auth-token-file`, `ROOT_AUTH_TOKEN`, or `--authToken`). The file form is preferred in CI and shared environments because the token never appears on a command line or in shell history.

| Option                      | Required | Default | Description |
| --------------------------- | -------- | ------- | ----------- |
| `-f, --file <file>`         | **Yes**  | —       | Path to the package file to upload. |
| `--auth-token-file <path>`  | One of * | —       | Read the authentication token from a file. Preferred for CI and shared environments. |
| `ROOT_AUTH_TOKEN` env var   | One of * | —       | Authentication token read from the environment. Not visible to other processes via `ps`. |
| `-a, --auth-token <token>`  | One of * | —       | Authentication token passed inline. Visible in the process list and shell history, so it is not recommended for production use. |
| `--verbose`                 | **No**   | (off)   | Print step-by-step progress during upload (manifest extraction, per-chunk streaming, server response). |

&ast; Exactly one of the three auth options is required. The older camelCase form `--authToken` is still accepted but deprecated, and will be removed in a future release.

## Examples

Upload using a token file (recommended for CI):

```bash
npx rootsdk upload package \
  --file ./dist/rootapp-1-2-3.pkg \
  --auth-token-file ./secrets/root-token
```

Upload using the environment variable:

```bash
ROOT_AUTH_TOKEN=$TOKEN npx rootsdk upload package --file ./dist/rootapp-1-2-3.pkg
```

Upload using an explicit command-line flag (fine for a quick local upload, not recommended in CI):

```bash
npx rootsdk upload package \
  --file ./dist/rootapp-1-2-3.pkg \
  --auth-token $TOKEN
```