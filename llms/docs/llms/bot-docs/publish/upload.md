---
path: bot-docs/publish/upload.md
audience: bot
category: guide
summary: The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and a valid authentication token.
---

# Upload your code

The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and a valid authentication token. You get your authentication token from [Root Developer Portal](https://dev.rootapp.com).

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
rootsdk upload package [options]
```

## Options

| Flag                          | Description                          | Required | Default |
| ----------------------------- | -------------------------------------| -------- | ------- |
| `-f, --file <file>`           | Path to the package file to upload.  | **Yes**  | —       |
| `-a, --authToken <token>`     | Authentication token for the upload. | **Yes**  | —       |

## Example

Upload a package file to the Root cloud:

```bash
rootsdk upload package \
  --file ./dist/rootapp-1-2-3.pkg \
  --authToken $TOKEN
```