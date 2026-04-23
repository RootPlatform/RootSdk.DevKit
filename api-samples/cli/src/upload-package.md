# rootsdk upload package

Deploy a `.pkg` file to the Root cloud.

## Syntax

```bash
rootsdk upload package [options]
```

## Options

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--file` | `-f` | **Yes** | Path to the `.pkg` file to upload (created by `rootsdk build package`) |
| `--authToken` | `-a` | **Yes** | Authentication token from the [Root Developer Portal](https://dev.rootapp.com) |

## Prerequisites

- `@rootsdk/dev-tools` in `devDependencies`
- A `.pkg` file produced by `rootsdk build package`
- A valid authentication token from the [Root Developer Portal](https://dev.rootapp.com)
- The project must be registered in the Developer Portal, and the project ID must be in `root-manifest.json`

## Example

```bash
rootsdk upload package \
  --file ./dist/rootapp-1-2-3.pkg \
  --authToken $TOKEN
```
