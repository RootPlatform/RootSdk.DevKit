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

| Option                      | Required | Default | Description |
| --------------------------- | -------- | ------- | ----------- |
| `-f, --file <file>`         | **Yes**  | —       | Path to the package file to upload. |
| `-a, --authToken <token>`   | **Yes**  | —       | Authentication token passed inline. |

## Examples

```bash
npx rootsdk upload package \
  --file ./dist/rootapp-1-2-3.pkg \
  --authToken $TOKEN
```